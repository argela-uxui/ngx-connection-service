import {Component, inject} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {ConnectionService, ConnectionState} from 'ngx-connection-service';

@Component({
  selector: 'app-status-check',
  templateUrl: './status-check.component.html',
  styleUrls: ['./status-check.component.css'],
  imports: []
})
export class StatusCheckComponent {

  protected readonly connectionService = inject(ConnectionService);

  /**
   * Reactive current connection state. Bridged from `monitor()` Observable via `toSignal` to demonstrate the
   * dual Observable/Signal API surface of the service (the service also exposes `state` Signal directly).
   */
  readonly currentState = toSignal<ConnectionState | undefined>(this.connectionService.monitor());

}
