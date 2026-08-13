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

## Usage

- Import `ConnectionServiceModule` in your `app.module.ts`.

```ts
import {BrowserModule} from '@angular/platform-browser';
import {NgModule} from '@angular/core';

import {AppComponent} from './app.component';
import {ConnectionServiceModule} from 'ngx-connection-service';

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,
    ConnectionServiceModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule {
}
```

- Inject `ConnectionService` in your component's constructor.
- Subscribe to `monitor()` method to get push notification whenever internet connection status is changed.

```ts
import { Component } from '@angular/core';
import { ConnectionService } from 'ngx-connection-service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  hasNetworkConnection: boolean;
  hasInternetAccess: boolean;
  status: string;

  constructor(private connectionService: ConnectionService) {
    this.connectionService.monitor().subscribe(currentState => {
      this.hasNetworkConnection = currentState.hasNetworkConnection;
      this.hasInternetAccess = currentState.hasInternetAccess;
      if (this.hasNetworkConnection && this.hasInternetAccess) {
        this.status = 'ONLINE';
      } else {
        this.status = 'OFFLINE';
      }
    });
  }
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

You should define a provider for `ConnectionServiceOptionsToken` in your module as follows;

```ts
import {BrowserModule} from '@angular/platform-browser';
import {NgModule} from '@angular/core';

import {AppComponent} from './app.component';
import {ConnectionServiceModule, ConnectionServiceOptions, ConnectionServiceOptionsToken} from 'ngx-connection-service';

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,
    ConnectionServiceModule
  ],
  providers: [
    {
      provide: ConnectionServiceOptionsToken,
      useValue: <ConnectionServiceOptions>{
        enableHeartbeat: false,
        heartbeatUrl: '/assets/ping.json',
        requestMethod: 'get',
        heartbeatInterval: 3000
      }
    }
  ],
  bootstrap: [AppComponent]
})
export class AppModule {
}

```

### Custom HeartBeat handling function

You could use a callback function for handling heartBeat requests by defining `heartbeatExecutor` property in `ConnectionServiceOptions`;

```ts
import { Component } from '@angular/core';
import { ConnectionService } from 'ngx-connection-service';
import {Observable} from 'rxjs';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  hasNetworkConnection: boolean;
  hasInternetAccess: boolean;
  status: string;

  constructor(private connectionService: ConnectionService) {

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

    this.connectionService.monitor().subscribe(currentState => {
      this.hasNetworkConnection = currentState.hasNetworkConnection;
      this.hasInternetAccess = currentState.hasInternetAccess;
      if (this.hasNetworkConnection && this.hasInternetAccess) {
        this.status = 'ONLINE';
      } else {
        this.status = 'OFFLINE';
      }
    });
  }
}

```

## Changes

- This version use https://api.ipify.org/ to determine Internet connection status
- Removed dependency to "ssr-window" package

## Security / Dependency Blockers

### Upgrade Matrix (current tree)

| Package group | Previous range | Current range | Decision |
|---------------|----------------|---------------|----------|
| Angular runtime (`@angular/*`) | `^18.2.14` | `^19.2.25` | Upgraded to latest `19.x` runtime patches. |
| Angular build chain (`@angular-devkit/build-angular`, `@angular/cli`, `@angular/compiler-cli`, `@angular/language-service`, `ng-packagr`) | `18.x` | `19.x` | Upgraded to latest Angular 19 tooling patches. |
| Lint stack (`angular-eslint`, `eslint`, `@eslint/js`, `@typescript-eslint/*`, `typescript-eslint`) | Angular-eslint `18.x` | Angular-eslint `19.8.1` + latest ESLint 9-compatible companions | Upgraded to latest Angular 19-compatible lint toolchain. |
| Type defs (`@types/node`, `@types/jasmine`) | Node 18 / older Jasmine types | Latest Node/Jasmine types compatible with current toolchain | Upgraded within Angular 19 constraints. |
| Test UI reporter (`karma-jasmine-html-reporter`, `jasmine-core`) | `2.1.0` / `5.1.x` | `2.2.0` / `6.3.x` | Upgraded to latest compatible versions. |
| E2E stack (`protractor`, `jasmine-spec-reporter`, `ts-node`) | present | removed | Fully removed from current tree. |

### Blockers (pinned to latest Angular 19-compatible set)

- Angular advisories for `@angular/core`, `@angular/common`, and `@angular/compiler` may still require upgrading beyond Angular 19 according to `npm audit` output.
- Build-chain advisories rooted in Angular 19 toolchain transitive deps (`@angular-devkit/build-angular`, `@angular/build`, `@angular/cli`) may require major Angular tooling upgrades.
- Decision: keep runtime and build tooling pinned to latest available `19.x` and accept residual advisories until an Angular major upgrade is allowed.

## License

[MIT License](https://github.com/argela-uxui/ngx-connection-service/blob/master/LICENSE) © Argela Inc. & Balram Chavan (orginal work)
