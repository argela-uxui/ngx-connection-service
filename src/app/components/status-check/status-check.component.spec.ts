import {ComponentFixture, TestBed, waitForAsync} from '@angular/core/testing';
import {provideHttpClient} from '@angular/common/http';
import {provideHttpClientTesting} from '@angular/common/http/testing';

import {StatusCheckComponent} from './status-check.component';

describe('StatusCheckComponent', () => {
  let component: StatusCheckComponent;
  let fixture: ComponentFixture<StatusCheckComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [StatusCheckComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
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
  });
});
