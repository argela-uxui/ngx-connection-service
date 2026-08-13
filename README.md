# Internet Connection Monitoring Service

> Detects whether browser has an active internet connection or not in Angular application.

This library is a fork of https://github.com/ultrasonicsoft/ng-connection-service by Balram Chavan.

## Install

```ts
npm i ngx-connection-service --save
```

## Server-Side Rendering (SSR)

No extra dependencies are required for Angular Universal / SSR. On the server, the service uses a Window stub with `navigator.onLine = true` and logs a console warning. Online/offline DOM events are only active in the browser after hydration.

## Angular Version Compatibility

Please use following table to determine suitable library version for your Angular project.

| *ngx-connection-service version* | *Angular version* |
|----------------------------------|-------------------|
| 7.0.x                            | 7.2.16            |
| 8.0.x                            | 8.2.14            |
| 9.0.x                            | 9.1.13            |
| 10.0.x                           | 10.2.5            |
| 11.0.x                           | 11.2.14           |
| 12.0.x                           | 12.2.17           |
| 13.0.x                           | 13.4.0            |
| 14.0.x                           | 14.3.0            |
| 15.0.x                           | 15.2.9            |
| 16.0.x                           | 16.1.8            |
| 17.0.x                           | 17.1.0            |
| 18.0.x                           | 18.2.14           |
| 19.0.x                           | 19.2.25           |
| 20.0.x                           | 20.3.27           |
| 21.0.x                           | 21.2.20           |
| 22.0.x                           | 22.1.2            |

## Usage

- Register `provideConnectionService()` in your application's providers (standalone / `ApplicationConfig`).

```ts
import {ApplicationConfig} from '@angular/core';
import {provideConnectionService} from 'ngx-connection-service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideConnectionService(),
  ],
};
```

```ts
import {bootstrapApplication} from '@angular/platform-browser';
import {AppComponent} from './app/app.component';
import {appConfig} from './app/app.config';

bootstrapApplication(AppComponent, appConfig)
  .catch(err => console.error(err));
```

> **Legacy `NgModule` setup:** `ConnectionServiceModule` is still available and works, but is **deprecated**.
> Prefer `provideConnectionService()` above.
>
> ```ts
> import {NgModule} from '@angular/core';
> import {ConnectionServiceModule} from 'ngx-connection-service';
>
> @NgModule({
>   imports: [ConnectionServiceModule],
> })
> export class AppModule {
> }
> ```

- Inject `ConnectionService` using `inject()` (or the constructor) in your component.
- Read the reactive `state` Signal, or subscribe to `monitor()` for push notifications whenever the connection status changes. Both APIs are kept in sync (dual API).

```ts
import { Component, inject } from '@angular/core';
import { ConnectionService } from 'ngx-connection-service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  private readonly connectionService = inject(ConnectionService);

  // Signal API (recommended for modern, signal-based Angular apps)
  readonly currentState = this.connectionService.state;

  constructor() {
    // Observable API (still fully supported)
    this.connectionService.monitor().subscribe(currentState => {
      console.log(currentState);
    });
  }
}

```

In the template you can then read the Signal directly:

```html
@if (currentState().hasNetworkConnection && currentState().hasInternetAccess) {
  <span>ONLINE</span>
} @else {
  <span>OFFLINE</span>
}
```

## Configuration

You can configure the service using `ConnectionServiceOptions` configuration variable.
Following options are available;

```ts
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
   * connection status. Default value is "'https://corsproxy.io?' + encodeURIComponent('https://internethealthtest.org')". (CORS restrictions are bypassed with this URL)
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
   * HTTP method used for requesting heartbeat Url. Default is 'get'.
   */
  requestMethod?: 'get' | 'post' | 'head' | 'options';

}
```

You should provide `ConnectionServiceOptions` via `provideConnectionService(options)` as follows;

```ts
import {ApplicationConfig} from '@angular/core';
import {ConnectionServiceOptions, provideConnectionService} from 'ngx-connection-service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideConnectionService({
      enableHeartbeat: false,
      heartbeatUrl: '/assets/ping.json',
      requestMethod: 'get',
      heartbeatInterval: 3000
    } satisfies ConnectionServiceOptions),
  ],
};
```

### Custom HeartBeat handling function

You could use a callback function for handling heartBeat requests by defining `heartbeatExecutor` property in `ConnectionServiceOptions`;

```ts
import { Component, inject } from '@angular/core';
import { ConnectionService } from 'ngx-connection-service';
import {Observable} from 'rxjs';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  private readonly connectionService = inject(ConnectionService);

  readonly currentState = this.connectionService.state;

  constructor() {
    this.connectionService.updateOptions({
      heartbeatExecutor: options => new Observable<any>(subscriber => {
        if (Math.random() > .5) {
          subscriber.next(true);
          subscriber.complete();
        } else {
          throw new Error('Connection error');
        }
      })
    });
  }
}

```

## Testing your own code that uses `ConnectionService`

`ConnectionService` uses RxJS `timer()`/`debounceTime()` internally (heartbeat polling, retry delay, and state
debouncing). If you write unit tests that need to wait for these internal delays, you don't need `zone.js`'s
`fakeAsync`/`tick`. Instead, provide `ConnectionServiceSchedulerToken` with an RxJS `TestScheduler`
(from `rxjs/testing`) and advance its virtual clock synchronously:

```ts
import {TestBed} from '@angular/core/testing';
import {TestScheduler} from 'rxjs/testing';
import {ConnectionService, ConnectionServiceSchedulerToken} from 'ngx-connection-service';

const scheduler = new TestScheduler(() => {});

TestBed.configureTestingModule({
  providers: [
    ConnectionService,
    {provide: ConnectionServiceSchedulerToken, useValue: scheduler},
    // ...your other providers (e.g. provideHttpClient, provideHttpClientTesting)
  ],
});

const service = TestBed.inject(ConnectionService);

// Advance virtual time by 300ms synchronously instead of really waiting:
scheduler.maxFrames = scheduler.frame + 300;
scheduler.flush();
```

This keeps tests instantaneous and fully zoneless. `ConnectionServiceSchedulerToken` is optional — when not
provided, the service defaults to RxJS's regular `asyncScheduler` (real timers), which is what you want in production.

## Changes

- Zoneless: the demo application and library tests no longer depend on `zone.js`. The app uses `provideZonelessChangeDetection()`; tests use RxJS `TestScheduler` virtual time instead of `fakeAsync`/`tick`.
- Standalone-first API: `provideConnectionService()` replaces `ConnectionServiceModule` for `ApplicationConfig` / `bootstrapApplication` setups. `ConnectionServiceModule` is kept for backward compatibility but is deprecated.
- `ConnectionService` now exposes a reactive `state` Signal in addition to the existing `monitor()` Observable API (dual API, non-breaking).
- Demo application converted to standalone components using the new `@if` control-flow syntax and `inject()`.
- This version use https://api.ipify.org/ to determine Internet connection status
- Removed dependency to "ssr-window" package

## Security / Dependency Status

### Upgrade Matrix (current tree)

| Package group | Previous range | Current range | Decision |
|---------------|----------------|---------------|----------|
| Angular runtime (`@angular/*`) | `^21.2.20` | `^22.1.2` | Upgraded to latest `22.x` runtime patches. |
| Angular build chain (`@angular-devkit/build-angular`, `@angular/cli`, `@angular/compiler-cli`, `@angular/language-service`, `ng-packagr`) | `21.x` | `22.x` | Upgraded to latest Angular 22 tooling patches. |
| Lint stack (`angular-eslint`, `eslint`, `@eslint/js`, `@typescript-eslint/*`, `typescript-eslint`) | Angular-eslint `21.4.0` | Angular-eslint `22.1.0` + ESLint `10.x` companions | Upgraded to latest Angular 22-compatible lint toolchain. |
| Type defs (`@types/node`, `@types/jasmine`) | previous majors | Latest Node/Jasmine types compatible with current toolchain | Retained at latest compatible versions. |
| Test UI reporter (`karma-jasmine-html-reporter`, `jasmine-core`) | `2.1.0` / `5.1.x` | `2.2.0` / `6.3.x` | Upgraded to latest compatible versions. |
| TypeScript toolchain (`typescript`) | `~5.9.3` | `~6.0.3` | Upgraded to satisfy Angular 22 peer requirements. |
| Overrides (`less`, `uuid`, `webpack-dev-server`) | Fixed versions in `overrides` | removed | Removed; now resolved by upstream transitive graph. |
| E2E stack (`protractor`, `jasmine-spec-reporter`, `ts-node`) | present | removed | Fully removed from current tree. |

### Exceptions (latest-version policy with Angular 22 compatibility)

- `zone.js` has been **removed entirely**. The application and library now run zoneless via `provideZonelessChangeDetection()`; `zone.js` is only an optional peer of `@angular/core` and is not installed.
- Angular runtime/build packages are intentionally pinned to latest `22.x` (not `23+`) to maintain declared Angular 22 compatibility for this release line.
- `@angular/cli` 22 requires Node.js `^22.22.3 || ^24.15.0 || >=26.0.0`; run with a matching Node patch version before executing Angular CLI commands.
- If a dependency cannot move to its global latest version without breaking Angular 22 peer constraints, it is pinned to the highest Angular 22-compatible release.

## License

[MIT License](https://github.com/argela-uxui/ngx-connection-service/blob/master/LICENSE) © Argela Inc. & Balram Chavan (orginal work)
