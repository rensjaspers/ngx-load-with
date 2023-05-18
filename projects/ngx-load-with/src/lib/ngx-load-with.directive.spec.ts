import { Component, DebugElement } from '@angular/core';
import { interval, of, switchMap, throwError } from 'rxjs';
import { NgxLoadWithModule } from './ngx-load-with.module';

import {
  ComponentFixture,
  TestBed,
  fakeAsync,
  tick,
} from '@angular/core/testing';
import { By } from '@angular/platform-browser';

@Component({
  selector: 'ngx-test-component',
  template: `
    <div
      id="data"
      *ngxLoadWith="
        getData as data;
        loadingTemplate: loading;
        errorTemplate: error
      "
    >
      {{ data }}
    </div>
    <ng-template #loading>
      <div id="loading">Loading</div>
    </ng-template>
    <ng-template #error let-error>
      <div id="error">{{ error.message }}</div>
    </ng-template>
  `,
})
class TestComponent {
  getData = () => interval(1000);
}

describe('ngxLoadWithDirective', () => {
  let fixture: ComponentFixture<TestComponent>;
  let component: TestComponent;
  let el: DebugElement;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [NgxLoadWithModule],
      declarations: [TestComponent],
    }).compileComponents();
  });

  const createComponent = (template?: string) => {
    if (template) {
      TestBed.overrideComponent(TestComponent, { set: { template } });
    }
    fixture = TestBed.createComponent(TestComponent);
    component = fixture.componentInstance;
    el = fixture.debugElement;
  };

  it('should create host', () => {
    createComponent();
    expect(component).toBeDefined();
  });

  it('should render the templates', fakeAsync(() => {
    createComponent();
    /**
     * An observable that emits once and then errors after a delay of 1 second.
     */
    const emitOnceAndThrow = interval(1000).pipe(
      switchMap((i) => (i > 0 ? throwError(() => new Error('error')) : of(i)))
    );
    component.getData = () => emitOnceAndThrow;
    fixture.detectChanges();

    expect(
      el.query(By.css('#loading')).nativeElement.textContent.trim()
    ).toEqual('Loading');
    expect(el.query(By.css('#data'))).toBeNull();
    expect(el.query(By.css('#error'))).toBeNull();

    // Wait for the observable to emit
    tick(1000);
    fixture.detectChanges(); // Wait for the async operation to complete

    expect(el.query(By.css('#loading'))).toBeNull();
    expect(el.query(By.css('#data')).nativeElement.textContent.trim()).toEqual(
      '0'
    );
    expect(el.query(By.css('#error'))).toBeNull();

    // Wait for the error to be thrown
    tick(1000);
    fixture.detectChanges();
    expect(el.query(By.css('#loading'))).toBeNull();
    expect(el.query(By.css('#data'))).toBeNull();
    expect(el.query(By.css('#error')).nativeElement.textContent.trim()).toEqual(
      'error'
    );
  }));
});
