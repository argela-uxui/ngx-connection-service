import {ApplicationConfig, provideZonelessChangeDetection} from '@angular/core';
import {ConnectionServiceOptions, provideConnectionService} from 'ngx-connection-service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideConnectionService({
      enableHeartbeat: true,
      // heartbeatUrl: '/assets/ping.json',
      // requestMethod: 'get',
      // heartbeatInterval: 3000
    } satisfies ConnectionServiceOptions),
  ],
};

