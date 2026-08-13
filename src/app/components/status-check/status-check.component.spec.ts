import {ComponentFixture, fakeAsync, TestBed, tick, waitForAsync} from '@angular/core/testing';
import {ConnectionService, ConnectionState} from 'ngx-connection-service';
import {Subject} from 'rxjs';

import {StatusCheckComponent} from './status-check.component';

describe('StatusCheckComponent', () => {
  let component: StatusCheckComponent;
  let fixture: ComponentFixture<StatusCheckComponent>;
  let monitorSubject: Subject<ConnectionState>;
  let connectionServiceSpy: jasmine.SpyObj<ConnectionService>;

  beforeEach(waitForAsync(() => {
    monitorSubject = new Subject<ConnectionState>();
    connectionServiceSpy = jasmine.createSpyObj<ConnectionService>('ConnectionService', ['monitor']);
    connectionServiceSpy.monitor.and.returnValue(monitorSubject.asObservable());

    TestBed.configureTestingModule({
      declarations: [StatusCheckComponent],
      providers: [
        {provide: ConnectionService, useValue: connectionServiceSpy},
      ],
    })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(StatusCheckComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
    expect(connectionServiceSpy.monitor).toHaveBeenCalled();
  });

  it('should update currentState from monitor stream', fakeAsync(() => {
    monitorSubject.next({hasNetworkConnection: false, hasInternetAccess: false});
    tick(301);
    fixture.detectChanges();

    expect(component.currentState).toEqual({hasNetworkConnection: false, hasInternetAccess: false});
  }));

  it('should render offline then online labels based on current state', fakeAsync(() => {
    monitorSubject.next({hasNetworkConnection: false, hasInternetAccess: false});
    tick(301);
    fixture.detectChanges();

    let html = ((fixture.nativeElement as HTMLElement).textContent || '').replace(/\s+/g, ' ').trim();
    expect(html).toContain('Network Status: OFFLINE!');
    expect(html).toContain('Internet Status: OFFLINE!');

    monitorSubject.next({hasNetworkConnection: true, hasInternetAccess: true});
    tick(301);
    fixture.detectChanges();

    html = ((fixture.nativeElement as HTMLElement).textContent || '').replace(/\s+/g, ' ').trim();
    expect(html).toContain('Network Status: ONLINE!');
    expect(html).toContain('Internet Status: ONLINE!');
  }));
});
