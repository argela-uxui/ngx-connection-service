import {ComponentFixture, TestBed} from '@angular/core/testing';
import {provideZonelessChangeDetection, signal} from '@angular/core';
import {ConnectionService, ConnectionState} from 'ngx-connection-service';
import {Subject} from 'rxjs';

import {StatusCheckComponent} from './status-check.component';

/** Waits a macrotask so pending signal/effect updates from the mocked Observable have flushed. */
const flushMicrotasks = () => new Promise<void>(resolve => setTimeout(resolve, 0));

describe('StatusCheckComponent', () => {
  let component: StatusCheckComponent;
  let fixture: ComponentFixture<StatusCheckComponent>;
  let monitorSubject: Subject<ConnectionState>;
  let mockStateSignal: ReturnType<typeof signal<ConnectionState>>;
  let connectionServiceSpy: jasmine.SpyObj<ConnectionService>;

  const initialState: ConnectionState = {hasNetworkConnection: false, hasInternetAccess: false};

  /** Emits a new state on both the mocked Observable (`monitor()`) and Signal (`state`) APIs, mirroring how the
   * real `ConnectionService` keeps both in sync internally. */
  const emit = (state: ConnectionState) => {
    monitorSubject.next(state);
    mockStateSignal.set(state);
  };

  beforeEach(async () => {
    monitorSubject = new Subject<ConnectionState>();
    mockStateSignal = signal<ConnectionState>(initialState);

    connectionServiceSpy = jasmine.createSpyObj<ConnectionService>(
      'ConnectionService',
      ['monitor'],
      {state: mockStateSignal.asReadonly()}
    );
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
    emit({hasNetworkConnection: false, hasInternetAccess: false});
    await flushMicrotasks();
    fixture.detectChanges();

    expect(component.currentState()).toEqual({hasNetworkConnection: false, hasInternetAccess: false});
  });

  it('should render offline then online labels based on current state', async () => {
    emit({hasNetworkConnection: false, hasInternetAccess: false});
    await flushMicrotasks();
    fixture.detectChanges();

    let html = ((fixture.nativeElement as HTMLElement).textContent || '').replace(/\s+/g, ' ').trim();
    expect(html).toContain('Network Status: OFFLINE!');
    expect(html).toContain('Internet Status(Observable): OFFLINE!');
    expect(html).toContain('Internet Status(Signal): OFFLINE!');

    emit({hasNetworkConnection: true, hasInternetAccess: true});
    await flushMicrotasks();
    fixture.detectChanges();

    html = ((fixture.nativeElement as HTMLElement).textContent || '').replace(/\s+/g, ' ').trim();
    expect(html).toContain('Network Status: ONLINE!');
    expect(html).toContain('Internet Status(Observable): ONLINE!');
    expect(html).toContain('Internet Status(Signal): ONLINE!');
  });
});
