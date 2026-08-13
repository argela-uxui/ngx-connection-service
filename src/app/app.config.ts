import {ApplicationConfig} from '@angular/core';
import {ConnectionServiceOptions, provideConnectionService} from 'ngx-connection-service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideConnectionService({
      enableHeartbeat: true,
      // heartbeatUrl: '/assets/ping.json',
      // requestMethod: 'get',
      // heartbeatInterval: 3000
    } satisfies ConnectionServiceOptions),
  ],
};

