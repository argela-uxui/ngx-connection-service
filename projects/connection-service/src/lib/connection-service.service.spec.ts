import {DOCUMENT} from '@angular/common';
import {Provider, PLATFORM_ID, provideZonelessChangeDetection} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {provideHttpClient, withInterceptorsFromDi} from '@angular/common/http';
import {provideHttpClientTesting} from '@angular/common/http/testing';
import {Observable, of, throwError} from 'rxjs';
import {TestScheduler} from 'rxjs/testing';

import {
  ConnectionService,
  ConnectionServiceOptions,
  ConnectionServiceOptionsToken,
  ConnectionServiceSchedulerToken,
  ConnectionState
} from './connection-service.service';

/**
 * Advances the virtual clock of a RxJS `TestScheduler` by `ms`, synchronously executing any `timer()`/
 * `debounceTime()` actions scheduled up to that point. This replaces Angular's `fakeAsync`/`tick`, which require
 * `zone.js` (not used by this zoneless library), while keeping tests instantaneous instead of using real delays.
 */
export function advanceBy(scheduler: TestScheduler, ms: number): void {
  scheduler.maxFrames = scheduler.frame + ms;
  scheduler.flush();
}

describe('ConnectionService', () => {
  let service: ConnectionService | null;
  let scheduler: TestScheduler;

  const configureService = (options?: ConnectionServiceOptions, extraProviders: Provider[] = []): ConnectionService => {
    TestBed.configureTestingModule({
      providers: [
        ConnectionService,
        provideZonelessChangeDetection(),
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        {provide: ConnectionServiceSchedulerToken, useValue: scheduler},
        ...(options ? [{provide: ConnectionServiceOptionsToken, useValue: options}] : []),
        ...extraProviders,
      ],
    });

    service = TestBed.inject(ConnectionService);
    return service;
  };

  beforeEach(() => {
    service = null;
    scheduler = new TestScheduler(() => {
      // Not used for marble assertions here, only for virtual-time scheduling.
    });
  });

  afterEach(() => {
    if (service) {
      service.ngOnDestroy();
      service = null;
    }
  });

  it('should create with custom options and keep options immutable via getter', () => {
    const instance = configureService({
      enableHeartbeat: false,
      heartbeatInterval: 1234,
      heartbeatRetryInterval: 456,
      heartbeatUrl: '/ping',
      requestMethod: 'post',
    });

    expect(instance).toBeTruthy();
    expect(instance.options.enableHeartbeat).toBeFalse();
    expect(instance.options.heartbeatInterval).toBe(1234);
    expect(instance.options.heartbeatRetryInterval).toBe(456);
    expect(instance.options.heartbeatUrl).toBe('/ping');
    expect(instance.options.requestMethod).toBe('post');

    const snapshot = instance.options;
    snapshot.enableHeartbeat = true;
    expect(instance.options.enableHeartbeat).toBeFalse();
  });

  it('monitor(true) should emit current state immediately', () => {
    const instance = configureService({enableHeartbeat: false});
    const states: ConnectionState[] = [];

    instance.monitor(true).subscribe(state => states.push({...state}));

    expect(states.length).toBe(1);
    expect(states[0].hasNetworkConnection).toBeTrue();
    expect(states[0].hasInternetAccess).toBeFalse();
  });

  it('state signal should reflect the current connection state (dual API with monitor())', () => {
    const instance = configureService({enableHeartbeat: false});

    expect(instance.state().hasNetworkConnection).toBeTrue();
    expect(instance.state().hasInternetAccess).toBeFalse();

    window.dispatchEvent(new Event('offline'));
    advanceBy(scheduler, 300);

    expect(instance.state()).toEqual({hasNetworkConnection: false, hasInternetAccess: false});
  });

  it('monitor(false) should not emit current state until a state change occurs', () => {
    const instance = configureService({enableHeartbeat: false});
    const states: ConnectionState[] = [];

    instance.monitor(false).subscribe(state => states.push({...state}));
    advanceBy(scheduler, 300);
    expect(states.length).toBe(0);

    window.dispatchEvent(new Event('offline'));
    advanceBy(scheduler, 300);

    expect(states.length).toBe(1);
    expect(states[0].hasNetworkConnection).toBeFalse();
    expect(states[0].hasInternetAccess).toBeFalse();
  });

  it('should emit network transitions for offline and online events', () => {
    const instance = configureService({enableHeartbeat: false});
    const states: ConnectionState[] = [];

    instance.monitor(false).subscribe(state => states.push({...state}));

    window.dispatchEvent(new Event('offline'));
    advanceBy(scheduler, 300);

    window.dispatchEvent(new Event('online'));
    advanceBy(scheduler, 300);

    expect(states.length).toBe(2);
    expect(states[0]).toEqual({hasNetworkConnection: false, hasInternetAccess: false});
    expect(states[1]).toEqual({hasNetworkConnection: true, hasInternetAccess: false});
  });

  it('should use heartbeat executor and report internet access as true on success', () => {
    const heartbeatExecutor = jasmine
      .createSpy('heartbeatExecutor')
      .and.callFake((): Observable<boolean> => of(true));

    const instance = configureService({
      enableHeartbeat: true,
      heartbeatInterval: 700,
      heartbeatRetryInterval: 50,
      heartbeatExecutor,
    });
    const states: ConnectionState[] = [];

    instance.monitor(false).subscribe(state => states.push({...state}));

    advanceBy(scheduler, 0);
    advanceBy(scheduler, 300);

    expect(heartbeatExecutor).toHaveBeenCalled();
    expect(states[0]).toEqual({hasNetworkConnection: true, hasInternetAccess: true});

    advanceBy(scheduler, 400); // advances virtual time to the next heartbeat tick at t=700
    expect(heartbeatExecutor.calls.count()).toBeGreaterThanOrEqual(2);

    instance.ngOnDestroy();
    service = null;
  });

  it('should retry heartbeat and keep internet access false when heartbeat fails', () => {
    const heartbeatExecutor = jasmine
      .createSpy('heartbeatExecutor')
      .and.callFake(() => throwError(() => new Error('heartbeat-failed')));

    const instance = configureService({
      enableHeartbeat: true,
      heartbeatInterval: 1000,
      heartbeatRetryInterval: 700,
      heartbeatExecutor,
    });
    const states: ConnectionState[] = [];

    instance.monitor(false).subscribe(state => states.push({...state}));

    advanceBy(scheduler, 0);
    expect(heartbeatExecutor.calls.count()).toBe(1);

    advanceBy(scheduler, 700);
    expect(heartbeatExecutor.calls.count()).toBe(2);

    advanceBy(scheduler, 300);
    expect(states.length).toBeGreaterThan(0);
    expect(states[states.length - 1]).toEqual({hasNetworkConnection: true, hasInternetAccess: false});

    instance.ngOnDestroy();
    service = null;
  });

  it('updateOptions should disable heartbeat and stop subsequent executor calls', () => {
    const heartbeatExecutor = jasmine
      .createSpy('heartbeatExecutor')
      .and.callFake((): Observable<boolean> => of(true));

    const instance = configureService({
      enableHeartbeat: true,
      heartbeatInterval: 50,
      heartbeatRetryInterval: 20,
      heartbeatExecutor,
    });

    advanceBy(scheduler, 0);
    expect(heartbeatExecutor.calls.count()).toBe(1);

    instance.updateOptions({enableHeartbeat: false});
    advanceBy(scheduler, 300);
    const callCountAfterDisable = heartbeatExecutor.calls.count();

    advanceBy(scheduler, 500);
    expect(heartbeatExecutor.calls.count()).toBe(callCountAfterDisable);
  });

  it('ngOnDestroy should be safe when called multiple times', () => {
    const instance = configureService({enableHeartbeat: false});

    expect(() => instance.ngOnDestroy()).not.toThrow();
    expect(() => instance.ngOnDestroy()).not.toThrow();
    service = null;
  });

  it('should use SSR window stub and warn when running on non-browser platform', () => {
    const warnSpy = spyOn(console, 'warn');

    const instance = configureService(
      {enableHeartbeat: false},
      [
        {provide: PLATFORM_ID, useValue: 'server'},
        {provide: DOCUMENT, useValue: {defaultView: null} as Document},
      ]
    );

    const states: ConnectionState[] = [];
    instance.monitor(true).subscribe(state => states.push({...state}));

    expect(warnSpy).toHaveBeenCalled();
    expect(states[0]).toEqual({hasNetworkConnection: true, hasInternetAccess: false});
  });
});
