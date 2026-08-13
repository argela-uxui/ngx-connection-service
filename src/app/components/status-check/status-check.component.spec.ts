import {ComponentFixture, TestBed} from '@angular/core/testing';
import {provideZonelessChangeDetection} from '@angular/core';
import {ConnectionService, ConnectionState} from 'ngx-connection-service';
import {Subject} from 'rxjs';

import {StatusCheckComponent} from './status-check.component';

/** Waits a macrotask so pending signal/effect updates from the mocked Observable have flushed. */
const flushMicrotasks = () => new Promise<void>(resolve => setTimeout(resolve, 0));

describe('StatusCheckComponent', () => {
  let component: StatusCheckComponent;
  let fixture: ComponentFixture<StatusCheckComponent>;
  let monitorSubject: Subject<ConnectionState>;
  let connectionServiceSpy: jasmine.SpyObj<ConnectionService>;

  beforeEach(async () => {
    monitorSubject = new Subject<ConnectionState>();
    connectionServiceSpy = jasmine.createSpyObj<ConnectionService>('ConnectionService', ['monitor']);
    connectionServiceSpy.monitor.and.returnValue(monitorSubject.asObservable());

    await TestBed.configureTestingModule({
      imports: [StatusCheckComponent],
      providers: [
        provideZonelessChangeDetection(),
        {provide: ConnectionService, useValue: connectionServiceSpy},
      ],
    })
      .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(StatusCheckComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
    expect(connectionServiceSpy.monitor).toHaveBeenCalled();
  });

  it('should update currentState from monitor stream', async () => {
    monitorSubject.next({hasNetworkConnection: false, hasInternetAccess: false});
    await flushMicrotasks();
    fixture.detectChanges();

    expect(component.currentState()).toEqual({hasNetworkConnection: false, hasInternetAccess: false});
  });

  it('should render offline then online labels based on current state', async () => {
    monitorSubject.next({hasNetworkConnection: false, hasInternetAccess: false});
    await flushMicrotasks();
    fixture.detectChanges();

    let html = ((fixture.nativeElement as HTMLElement).textContent || '').replace(/\s+/g, ' ').trim();
    expect(html).toContain('Network Status: OFFLINE!');
    expect(html).toContain('Internet Status: OFFLINE!');

    monitorSubject.next({hasNetworkConnection: true, hasInternetAccess: true});
    await flushMicrotasks();
    fixture.detectChanges();

    html = ((fixture.nativeElement as HTMLElement).textContent || '').replace(/\s+/g, ' ').trim();
    expect(html).toContain('Network Status: ONLINE!');
    expect(html).toContain('Internet Status: ONLINE!');
  });
});
