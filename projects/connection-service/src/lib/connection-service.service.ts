import {DOCUMENT, isPlatformBrowser} from '@angular/common';
import {EventEmitter, inject, Injectable, InjectionToken, OnDestroy, PLATFORM_ID, signal} from '@angular/core';
import {fromEvent, Observable, SchedulerLike, Subscription, timer} from 'rxjs';
import {debounceTime, retry, startWith, switchMap, tap} from 'rxjs/operators';
import {HttpClient} from '@angular/common/http';

/**
 * Instance of this interface is used to report current connection status.
 */
export interface ConnectionState {
  /**
   * "True" if browser has network connection. Determined by Window objects "online" / "offline" events.
   */
  hasNetworkConnection: boolean;
  /**
   * "True" if browser has Internet access. Determined by heartbeat system which periodically makes request to heartbeat Url.
   */
  hasInternetAccess: boolean;
}

/**
 * Instance of this interface could be used to configure "ConnectionService".
 */
export interface ConnectionServiceOptions {
  /**
   * Controls the Internet connectivity heartbeat system. Default value is 'true'.
   */
  enableHeartbeat?: boolean;
  /**
   * Url used for checking Internet connectivity, heartbeat system periodically makes "HEAD" requests to this URL to determine Internet
   * connection status. Default value is "//api.ipify.org/".
   */
  heartbeatUrl?: string;
  /**
   * Callback function to used for executing heartbeat requests. Defaults to HttpClient.request(...) function.
   */
  heartbeatExecutor?: (options?: ConnectionServiceOptions) => Observable<any>;
  /**
   * Interval used to check Internet connectivity specified in milliseconds. Default value is "30000".
   */
  heartbeatInterval?: number;
  /**
   * Interval used to retry Internet connectivity checks when an error is detected (when no Internet connection). Default value is "1000".
   */
  heartbeatRetryInterval?: number;
  /**
   * HTTP method used for requesting heartbeat Url. Default is 'head'.
   */
  requestMethod?: 'get' | 'post' | 'head' | 'options';

}

/**
 * InjectionToken for specifing ConnectionService options.
 */
export const ConnectionServiceOptionsToken = new InjectionToken<ConnectionServiceOptions>('ConnectionServiceOptionsToken');

/**
 * InjectionToken to override the RxJS `SchedulerLike` used internally for `timer()`/`debounceTime()` operations
 * (heartbeat polling, retry delay, and state-change debouncing). Not needed for normal application use — defaults
 * to RxJS's `asyncScheduler` when not provided. Primarily useful in unit tests, where providing a `TestScheduler`
 * (from `rxjs/testing`) allows advancing virtual time synchronously instead of waiting on real timers, without
 * requiring `zone.js`'s `fakeAsync`/`tick`.
 */
export const ConnectionServiceSchedulerToken = new InjectionToken<SchedulerLike>('ConnectionServiceSchedulerToken');

/**
 * Minimal Window-like object used when running outside the browser (e.g. Angular Universal SSR).
 */
function createWindowStub(): Window {
  return {
    navigator: {onLine: true},
    addEventListener() {
      // no-op: online/offline events are unavailable outside the browser
    },
    removeEventListener() {
      // no-op: online/offline events are unavailable outside the browser
    },
  } as unknown as Window;
}

/**
 * Resolves the Window object for browser use, or a stub when Window is not available (SSR).
 */
function resolveWindow(documentRef: Document, platformId: object): Window {
  if (isPlatformBrowser(platformId)) {
    const win = documentRef.defaultView || (typeof window !== 'undefined' ? window : null);
    if (win) {
      return win;
    }
  }

  console.warn(
    'ngx-connection-service: Window is not available (SSR or non-browser environment). ' +
    'Using a stub with navigator.onLine=true. Online/offline events will not fire until running in the browser.'
  );
  return createWindowStub();
}

@Injectable({
  providedIn: 'root'
})
export class ConnectionService implements OnDestroy {
  private static DEFAULT_OPTIONS: ConnectionServiceOptions = {
    enableHeartbeat: true,
    heartbeatUrl: '//api.ipify.org/',
    heartbeatInterval: 30000,
    heartbeatRetryInterval: 1000,
    requestMethod: 'get',
  };

  private stateChangeEventEmitter = new EventEmitter<ConnectionState>();
  private stateChangeEventSubscription: Subscription;

  private currentState: ConnectionState = {
    hasInternetAccess: false,
    hasNetworkConnection: true
  };

  /**
   * Reactive (Signal) representation of the current connection state. Prefer this over `monitor()` in modern
   * Angular applications that use signals for change detection. Updates whenever the network / internet status changes.
   */
  private readonly stateSignal = signal<ConnectionState>({...this.currentState});

  /**
   * Read-only Signal exposing the current connection state. Equivalent (dual API) to subscribing to `monitor()`.
   */
  readonly state = this.stateSignal.asReadonly();

  private offlineSubscription: Subscription;
  private onlineSubscription: Subscription;
  private httpSubscription: Subscription;
  private serviceOptions: ConnectionServiceOptions;
  private readonly windowRef: Window;
  private readonly http = inject(HttpClient);
  private readonly scheduler = inject(ConnectionServiceSchedulerToken, {optional: true}) ?? undefined;

  /**
   * Current ConnectionService options. Notice that changing values of the returned object has not effect on service execution.
   * You should use "updateOptions" function.
   */
  get options(): ConnectionServiceOptions {
    return {...this.serviceOptions};
  }

  constructor() {
    const documentRef = inject(DOCUMENT);
    const platformId = inject(PLATFORM_ID);
    const options = inject(ConnectionServiceOptionsToken, {optional: true});

    this.windowRef = resolveWindow(documentRef, platformId);
    this.currentState.hasNetworkConnection = this.windowRef.navigator.onLine;

    this.serviceOptions = {
      ...ConnectionService.DEFAULT_OPTIONS,
      heartbeatExecutor: () => this.http.request(
        this.serviceOptions.requestMethod,
        this.serviceOptions.heartbeatUrl,
        {responseType: 'text', withCredentials: false}
      ),
      ...options
    };

    // We subscribe to our own eventEmitter so that state signal will be updated with debounce settings of the emitter
    this.stateChangeEventSubscription = this.monitor().subscribe(state => {
      this.stateSignal.set(state);
    });

    this.checkNetworkState();
    this.checkInternetState();
  }

  private checkInternetState() {

    if (this.httpSubscription) {
      this.httpSubscription.unsubscribe();
      this.httpSubscription = null;
    }

    if (this.serviceOptions.enableHeartbeat) {
      this.httpSubscription = timer(0, this.serviceOptions.heartbeatInterval, this.scheduler)
        .pipe(
          switchMap(() => this.serviceOptions.heartbeatExecutor(this.serviceOptions)),
          retry({
            delay: () =>
              timer(this.serviceOptions.heartbeatRetryInterval, this.scheduler).pipe(
                tap(() => {
                  this.currentState.hasInternetAccess = false;
                  this.emitEvent();
                })
              )
          })
        )
        .subscribe(() => {
          this.currentState.hasInternetAccess = true;
          this.emitEvent();
        });
    } else {
      this.currentState.hasInternetAccess = false;
      this.emitEvent();
    }
  }

  private checkNetworkState() {
    this.onlineSubscription = fromEvent(this.windowRef, 'online').subscribe(() => {
      this.currentState.hasNetworkConnection = true;
      this.checkInternetState();
      this.emitEvent();
    });

    this.offlineSubscription = fromEvent(this.windowRef, 'offline').subscribe(() => {
      this.currentState.hasNetworkConnection = false;
      this.currentState.hasInternetAccess = false;
      this.checkInternetState();
      this.emitEvent();
    });
  }

  private emitEvent() {
    this.stateChangeEventEmitter.emit({...this.currentState});
  }

  ngOnDestroy(): void {
    try {
      this.stateChangeEventSubscription.unsubscribe();
      this.offlineSubscription.unsubscribe();
      this.onlineSubscription.unsubscribe();
      this.httpSubscription.unsubscribe();
    } catch {
      // subscriptions may already be cleared
    }
  }

  /**
   * Monitor Network & Internet connection status by subscribing to this observer. If you set "reportCurrentState" to "false" then
   * function will not report current status of the connections when initially subscribed.
   * @param reportCurrentState Report current state when initial subscription. Default is "true"
   */
  monitor(reportCurrentState = true): Observable<ConnectionState> {
    return reportCurrentState ?
      this.stateChangeEventEmitter.pipe(
        debounceTime(300, this.scheduler),
        startWith({...this.currentState})
      )
      :
      this.stateChangeEventEmitter.pipe(
        debounceTime(300, this.scheduler)
      );
  }

  /**
   * Update options of the service. You could specify partial options object. Values that are not specified will use default / previous
   * option values.
   * @param options Partial option values.
   */
  updateOptions(options: Partial<ConnectionServiceOptions>) {
    this.serviceOptions = {...this.serviceOptions, ...options};
    this.checkInternetState();
  }

}
