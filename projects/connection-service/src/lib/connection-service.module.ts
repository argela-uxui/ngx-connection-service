import {EnvironmentProviders, makeEnvironmentProviders, NgModule} from '@angular/core';
import {ConnectionService, ConnectionServiceOptions, ConnectionServiceOptionsToken} from './connection-service.service';
import {provideHttpClient, withInterceptorsFromDi, withXhr} from '@angular/common/http';

/**
 * Registers `ConnectionService` and its dependencies (HttpClient) with the application's environment injector.
 * This is the recommended, standalone-friendly way to set up the library, replacing `ConnectionServiceModule`.
 *
 * @example
 * ```ts
 * export const appConfig: ApplicationConfig = {
 *   providers: [
 *     provideConnectionService({ heartbeatUrl: '/assets/ping.json' }),
 *   ],
 * };
 * ```
 * @param options Optional partial configuration for `ConnectionService`.
 */
export function provideConnectionService(options?: ConnectionServiceOptions): EnvironmentProviders {
  return makeEnvironmentProviders([
    ConnectionService,
    provideHttpClient(withXhr(), withInterceptorsFromDi()),
    ...(options ? [{provide: ConnectionServiceOptionsToken, useValue: options}] : []),
  ]);
}

/**
 * @deprecated Use `provideConnectionService()` instead.
 */
@NgModule({
  providers: [ConnectionService, provideHttpClient(withXhr(), withInterceptorsFromDi())]
})
export class ConnectionServiceModule {
}
