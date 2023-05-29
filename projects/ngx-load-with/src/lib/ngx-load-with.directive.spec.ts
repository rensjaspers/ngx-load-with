import { Component, ViewChild } from '@angular/core';
import {
  ComponentFixture,
  TestBed,
  discardPeriodicTasks,
  fakeAsync,
  tick,
} from '@angular/core/testing';
import { delay, map, of, throwError, timer } from 'rxjs';
import {
  ErrorTemplateContext,
  NgxLoadWithDirective,
} from './ngx-load-with.directive';
import { By } from '@angular/platform-browser';

@Component({
  template: `
    <button id="load" (click)="loader.load()"></button>
    <ng-template
      #loader="ngxLoadWith"
      [ngxLoadWith]="loadFn"
      [ngxLoadWithLoadingTemplate]="loading"
      [ngxLoadWithErrorTemplate]="error"
      [ngxLoadWithDebounceTime]="debounceTime"
      [ngxLoadWithStaleData]="staleData"
      let-data
      let-loading="loading"
    >
      {{ data }}{{ loading ? '(reloading)' : '' }}
    </ng-template>
    <ng-template #loading>loading</ng-template>
    <ng-template #error let-error let-retry="retry">
      {{ error.message }} <button id="retry" (click)="retry()"></button>
    </ng-template>
  `,
})
class TestComponent {
  @ViewChild('loader') loader!: NgxLoadWithDirective;
  debounceTime?: number;
  staleData?: boolean;

  loadFn = () => of('test');
}

describe('NgxLoadWithDirective', () => {
  let component: TestComponent;
  let fixture: ComponentFixture<TestComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TestComponent, NgxLoadWithDirective],
    }).compileComponents();

    fixture = TestBed.createComponent(TestComponent);
    component = fixture.componentInstance;
  });

  it('should create the directive', fakeAsync(() => {
    fixture.detectChanges();
    tick();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent.trim()).toEqual('test');
  }));

  it('should display the loading template while data is being loaded', fakeAsync(() => {
    component.loadFn = () => of('test').pipe(delay(1000));

    fixture.detectChanges();
    expect(fixture.nativeElement.textContent.trim()).toEqual('loading');

    tick(1000);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent.trim()).toEqual('test');
  }));

  it('should display the error template when an error occurs', fakeAsync(() => {
    component.loadFn = () => throwError(() => new Error('An error occurred'));

    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent.trim()).toEqual(
      'An error occurred'
    );
  }));

  it('should retry loading when retry is called', fakeAsync(() => {
    let counter = 0;
    component.loadFn = () => {
      counter++;
      if (counter === 1) {
        return throwError(() => new Error('An error occurred'));
      } else {
        return of('test');
      }
    };

    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent.trim()).toEqual(
      'An error occurred'
    );

    // Simulate a click on the retry button
    const button = fixture.debugElement.query(
      By.css('button#retry')
    ).nativeElement;
    button.click();

    tick();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent.trim()).toEqual('test');
  }));

  it('should debounce the loading function', fakeAsync(() => {
    let counter = 0;
    component.loadFn = () => {
      counter++;
      return timer(1000).pipe(map(() => 'test' + counter));
    };
    component.debounceTime = 2000;

    fixture.detectChanges();

    const loadButton = fixture.nativeElement.querySelector('#load');
    loadButton.click();
    tick(1500);
    loadButton.click();
    tick(3000); // allow time for the debounceTime and the timer in loadFn
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent.trim()).toEqual('test1');
    discardPeriodicTasks(); // discard any remaining timers
  }));

  it('should display the stale data while reloading', fakeAsync(() => {
    let counter = 0;
    component.loadFn = () => {
      counter++;
      return timer(1000).pipe(map(() => 'test' + counter));
    };
    component.staleData = true;

    fixture.detectChanges();

    const loadButton = fixture.nativeElement.querySelector('#load');
    loadButton.click();
    tick(1500); // allow time for the first load to complete
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent.trim()).toEqual('test1');

    loadButton.click();
    tick(500); // only partial wait to simulate reloading
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent.trim()).toEqual(
      'test1(reloading)'
    );

    tick(1000); // allow time for the second load to complete
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent.trim()).toEqual('test2');
  }));
});
