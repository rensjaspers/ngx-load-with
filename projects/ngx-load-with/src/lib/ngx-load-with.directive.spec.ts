import { Component, DebugElement, ViewChild } from '@angular/core';
import { interval, of, switchMap, throwError } from 'rxjs';
import { NgxLoadWithModule } from './ngx-load-with.module';

import {
  ComponentFixture,
  TestBed,
  discardPeriodicTasks,
  fakeAsync,
  tick,
} from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { NgxLoadWithDirective } from 'ngx-load-with';

@Component({
  selector: 'ngx-micro-syntax-test',
  template: `
    <div
      *ngxLoadWith="
        getData as data;
        args: args;
        loadingTemplate: loading;
        errorTemplate: error;
        staleData: showStaleData;
        debounceTime: debounceTime;
        let debouncing = debouncing;
        let reloading = reloading
      "
    >
      <div id="data">{{ data }}</div>
      <div id="debouncing-after-initial-load">
        {{ debouncing ? 'Debouncing' : 'Not debouncing' }}
      </div>
    </div>
    <ng-template #loading let-debouncing="debouncing">
      <div id="loading">Loading</div>
      <div id="debouncing-before-initial-load">
        {{ debouncing ? 'Debouncing' : 'Not debouncing' }}
      </div>
    </ng-template>
    <ng-template #error let-error>
      <div id="error">{{ error.message }}</div>
    </ng-template>
  `,
})
class MicroSyntaxTestComponent {
  showStaleData = false;
  debounceTime = 0;
  args = 'foo';
  getData = () => interval(1000);
}

@Component({
  selector: 'ngx-normal-syntax-test',
  template: `
    <ng-template
      #loader="ngxLoadWith"
      let-data
      [ngxLoadWith]="getData"
      [ngxLoadWithLoadingTemplate]="loading"
      [ngxLoadWithErrorTemplate]="error"
    >
      <div id="data">{{ data }}</div>
    </ng-template>
    <ng-template #loading let-debouncing="debouncing">
      <div id="loading">Loading</div>
    </ng-template>
    <ng-template #error let-error>
      <div id="error">{{ error.message }}</div>
    </ng-template>
  `,
})
class NormalSyntaxTestComponent {
  @ViewChild('loader') loader?: NgxLoadWithDirective;
  getData = () => of('foo');
}

describe('ngxLoadWithDirective', () => {
  let fixture: ComponentFixture<MicroSyntaxTestComponent>;
  let component: MicroSyntaxTestComponent;
  let el: DebugElement;
  let normalSyntaxFixture: ComponentFixture<NormalSyntaxTestComponent>;
  let normalSyntaxComponent: NormalSyntaxTestComponent;
  let normalSyntaxEl: DebugElement;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [NgxLoadWithModule],
      declarations: [MicroSyntaxTestComponent, NormalSyntaxTestComponent],
    }).compileComponents();
  });

  const createMicroSyntaxComponent = (template?: string) => {
    if (template) {
      TestBed.overrideComponent(MicroSyntaxTestComponent, {
        set: { template },
      });
    }
    fixture = TestBed.createComponent(MicroSyntaxTestComponent);
    component = fixture.componentInstance;
    el = fixture.debugElement;
  };

  const createNormalSyntaxComponent = (template?: string) => {
    if (template) {
      TestBed.overrideComponent(NormalSyntaxTestComponent, {
        set: { template },
      });
    }
    normalSyntaxFixture = TestBed.createComponent(NormalSyntaxTestComponent);
    normalSyntaxComponent = normalSyntaxFixture.componentInstance;
    normalSyntaxEl = normalSyntaxFixture.debugElement;
  };

  it('should create host', () => {
    createMicroSyntaxComponent();
    expect(component).toBeDefined();
  });

  it('should render the templates', fakeAsync(() => {
    createMicroSyntaxComponent();
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

  it('should reload on args change', fakeAsync(() => {
    createMicroSyntaxComponent();
    component.showStaleData = false;
    fixture.detectChanges();
    tick(1000);
    component.args = 'bar';
    fixture.detectChanges();
    tick();
    fixture.detectChanges();
    expect(el.query(By.css('#loading'))).not.toBeNull();
    expect(el.query(By.css('#data'))).toBeNull();
    discardPeriodicTasks();
  }));

  it('should show stale data when configured so', fakeAsync(() => {
    createMicroSyntaxComponent();
    component.showStaleData = true;
    fixture.detectChanges();
    tick(1000);
    component.args = 'bar';
    fixture.detectChanges();
    tick();
    fixture.detectChanges();
    expect(el.query(By.css('#loading'))).toBeNull();
    expect(el.query(By.css('#data'))).not.toBeNull();
    discardPeriodicTasks();
  }));

  it('should debounce', fakeAsync(() => {
    createMicroSyntaxComponent();
    component.debounceTime = 1000;
    fixture.detectChanges();
    tick(500);
    fixture.detectChanges();
    expect(el.query(By.css('#loading'))).not.toBeNull();
    expect(el.query(By.css('#data'))).toBeNull();
    const getDebounceText = () =>
      el
        .query(By.css('#debouncing-before-initial-load'))
        .nativeElement.textContent.trim();
    expect(getDebounceText()).toEqual('Debouncing');
    tick(501);
    fixture.detectChanges();
    expect(getDebounceText()).toEqual('Not debouncing');
    discardPeriodicTasks();
  }));

  it('should update the loading state with the provided data using setData()', fakeAsync(() => {
    createNormalSyntaxComponent();
    normalSyntaxFixture.detectChanges();
    tick();
    const testData = 'Test Data';
    normalSyntaxComponent.loader!.setData(testData);
    tick();
    normalSyntaxFixture.detectChanges();

    // Verify that the loaded data is rendered correctly
    expect(
      normalSyntaxEl.query(By.css('#data')).nativeElement.textContent.trim()
    ).toEqual(testData);

    // Verify that the loading template and error template are not rendered
    expect(normalSyntaxEl.query(By.css('#loading'))).toBeNull();
    expect(normalSyntaxEl.query(By.css('#error'))).toBeNull();
  }));

  it('should update the loading state with the provided error using setError()', fakeAsync(() => {
    createNormalSyntaxComponent();
    normalSyntaxFixture.detectChanges();
    tick();
    const testError = new Error('Test Error');
    normalSyntaxComponent.loader!.setError(testError);
    tick();
    normalSyntaxFixture.detectChanges();

    // Verify that the loaded error is rendered correctly
    expect(
      normalSyntaxEl.query(By.css('#error')).nativeElement.textContent.trim()
    ).toEqual(testError.message);

    // Verify that the loading template and error template are not rendered
    expect(normalSyntaxEl.query(By.css('#loading'))).toBeNull();
    expect(normalSyntaxEl.query(By.css('#data'))).toBeNull();
  }));
});
