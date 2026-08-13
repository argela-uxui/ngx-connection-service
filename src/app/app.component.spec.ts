import {ComponentFixture, TestBed} from '@angular/core/testing';
import {provideZonelessChangeDetection} from '@angular/core';
import {ConnectionService, ConnectionState} from 'ngx-connection-service';
import {of} from 'rxjs';
import {AppComponent} from './app.component';

describe('AppComponent', () => {
  let component: AppComponent;
  let fixture: ComponentFixture<AppComponent>;
  let connectionServiceSpy: jasmine.SpyObj<ConnectionService>;

  const initialState: ConnectionState = {
    hasInternetAccess: true,
    hasNetworkConnection: true,
  };

  beforeEach(async () => {
    connectionServiceSpy = jasmine.createSpyObj<ConnectionService>(
      'ConnectionService',
      ['monitor', 'updateOptions'],
      {options: {enableHeartbeat: true}}
    );
    connectionServiceSpy.monitor.and.returnValue(of(initialState));

    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        provideZonelessChangeDetection(),
        {provide: ConnectionService, useValue: connectionServiceSpy},
      ],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AppComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the app', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize heartBeatState from connection service options', () => {
    expect(component.heartBeatState()).toBeTrue();
  });

  it('setHeartBeatState should update local state and service options', () => {
    component.setHeartBeatState(false);

    expect(component.heartBeatState()).toBeFalse();
    expect(connectionServiceSpy.updateOptions).toHaveBeenCalledWith({enableHeartbeat: false});
  });

  it('useExecutor should register a heartbeat executor that can succeed', () => {
    component.useExecutor();

    const optionsArg = connectionServiceSpy.updateOptions.calls.mostRecent().args[0];
    expect(optionsArg.heartbeatExecutor).toEqual(jasmine.any(Function));

    spyOn(Math, 'random').and.returnValue(0.9);
    let receivedValue: boolean | undefined;
    optionsArg.heartbeatExecutor?.().subscribe(value => {
      receivedValue = value;
    });

    expect(component.internetChance()).toBe(90);
    expect(receivedValue).toBeTrue();
  });

  it('useExecutor should surface error path when random chance is low', () => {
    component.useExecutor();

    const optionsArg = connectionServiceSpy.updateOptions.calls.mostRecent().args[0];
    spyOn(Math, 'random').and.returnValue(0.1);

    let receivedError: Error | null = null;
    optionsArg.heartbeatExecutor?.().subscribe({
      error: error => {
        receivedError = error;
      }
    });

    expect(component.internetChance()).toBe(10);
    expect(receivedError).not.toBeNull();
    expect(receivedError?.message).toContain('Connection error');
  });

  it('should render title in a h1 tag', () => {
    const compiled = fixture.debugElement.nativeElement;
    expect(compiled.querySelector('h1').textContent).toContain('Internet connection status');
  });

  it('should show the proper heartbeat toggle button based on current state', () => {
    component.setHeartBeatState(true);
    fixture.detectChanges();

    let html = (fixture.nativeElement as HTMLElement).textContent || '';
    expect(html).toContain('Disable HeartBeat Check');

    component.setHeartBeatState(false);
    fixture.detectChanges();

    html = (fixture.nativeElement as HTMLElement).textContent || '';
    expect(html).toContain('Enable HeartBeat Check');
  });
});
