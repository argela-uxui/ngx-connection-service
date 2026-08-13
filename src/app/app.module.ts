import {BrowserModule} from '@angular/platform-browser';
import {NgModule} from '@angular/core';

import {AppComponent} from './app.component';
import {ConnectionServiceModule, ConnectionServiceOptions, ConnectionServiceOptionsToken} from 'ngx-connection-service';
import {StatusCheckComponent} from './components/status-check/status-check.component';

@NgModule({
  declarations: [
    AppComponent,
    StatusCheckComponent
  ],
  imports: [
    BrowserModule,
    ConnectionServiceModule
  ],
  providers: [
    {
      provide: ConnectionServiceOptionsToken,
      useValue: {
        enableHeartbeat: true,
        // heartbeatUrl: '/assets/ping.json',
        // requestMethod: 'get',
        // heartbeatInterval: 3000
      } as ConnectionServiceOptions
    }
  ],
  bootstrap: [AppComponent]
})
export class AppModule {
}
