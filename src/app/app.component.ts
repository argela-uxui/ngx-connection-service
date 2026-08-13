import {ChangeDetectionStrategy, Component, inject, signal} from '@angular/core';
import {ConnectionService} from 'ngx-connection-service';
import {Observable} from 'rxjs';
import {StatusCheckComponent} from './components/status-check/status-check.component';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [StatusCheckComponent],
})
export class AppComponent {
  private readonly connectionService = inject(ConnectionService);

  readonly heartBeatState = signal(this.connectionService.options.enableHeartbeat);
  readonly internetChance = signal<number | undefined>(undefined);

  setHeartBeatState(state: boolean) {
    this.heartBeatState.set(state);
    this.connectionService.updateOptions({enableHeartbeat: state});
  }

  useExecutor() {
    this.connectionService.updateOptions({
      heartbeatExecutor: () => new Observable<any>(subscriber => {
        this.internetChance.set(Math.round(Math.random() * 100));
        if (this.internetChance()! > 50) {
          subscriber.next(true);
          subscriber.complete();
        } else {
          throw new Error('Connection error');
        }
      })
    });
  }
}
