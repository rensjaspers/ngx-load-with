/* eslint-disable @typescript-eslint/no-explicit-any */

import { Component, ViewChild } from '@angular/core';
import {
  ComponentFixture,
  TestBed,
  discardPeriodicTasks,
  fakeAsync,
  tick,
} from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import {
  Observable,
  Subscription,
  delay,
  interval,
  map,
  of,
  throwError,
  timer,
} from 'rxjs';
import { NgxLoadWithDirective } from './ngx-load-with.directive';

@Component({
  template: `
    <button id="load" (click)="loader.load()"></button>
    <ng-template
      #loader="ngxLoadWith"
      [ngxLoadWith]="loadFn"
      [ngxLoadWithArgs]="args"
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
  args?: unknown;

  // eslint-disable-next-line  @typescript-eslint/no-explicit-any,@typescript-eslint/no-unused-vars
  loadFn = (_args: any) => of('test' as any);
}

describe('NgxLoadWithDirective', () => {
  let component: TestComponent;
  let fixture: ComponentFixture<TestComponent>;
  const getTextContent = () => fixture.nativeElement.textContent.trim();

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
    expect(getTextContent()).toEqual('test');
  }));

  it('should display the loading template while data is being loaded', fakeAsync(() => {
    component.loadFn = () => of('test').pipe(delay(1000));

    fixture.detectChanges();
    expect(getTextContent()).toEqual('loading');

    tick(1000);
    fixture.detectChanges();

    expect(getTextContent()).toEqual('test');
  }));

  it('should render the loading template only once during multiple consecutive loading states', fakeAsync(() => {
    component.loadFn = () => of('test').pipe(delay(1000));
    fixture.detectChanges();

    const renderSpy = spyOn(
      component.loader['viewContainer'],
      'createEmbeddedView'
    ).and.callThrough();

    // Trigger multiple consecutive loading states

    tick(10);
    component.loader.load();
    tick(10);
    component.loader.load();
    tick(10);
    component.loader.load();

    tick(1000);
    fixture.detectChanges();

    expect(renderSpy).toHaveBeenCalledTimes(1);
  }));

  it('should display the error template when an error occurs', fakeAsync(() => {
    component.loadFn = () => throwError(() => new Error('An error occurred'));

    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    expect(getTextContent()).toEqual('An error occurred');
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

    expect(getTextContent()).toEqual('An error occurred');

    // Simulate a click on the retry button
    const button = fixture.debugElement.query(
      By.css('button#retry')
    ).nativeElement;
    button.click();

    tick();
    fixture.detectChanges();

    expect(getTextContent()).toEqual('test');
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

    expect(getTextContent()).toEqual('test1');
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

    expect(getTextContent()).toEqual('test1');

    loadButton.click();
    tick(500); // only partial wait to simulate reloading
    fixture.detectChanges();

    expect(getTextContent()).toEqual('test1(reloading)');

    tick(1000); // allow time for the second load to complete
    fixture.detectChanges();

    expect(getTextContent()).toEqual('test2');
  }));

  it('should trigger a reload when args change', fakeAsync(() => {
    component.loadFn = (args: any) => of(args);
    component.args = 'test1';
    fixture.detectChanges();
    tick();
    fixture.detectChanges();
    expect(getTextContent()).toEqual('test1');

    component.args = 'test2';
    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    expect(getTextContent()).toEqual('test2');
  }));

  it('should handle multiple emissions', fakeAsync(() => {
    component.loadFn = () =>
      interval(1000).pipe(map((count) => 'test' + count));

    fixture.detectChanges();
    expect(getTextContent()).toEqual('loading');

    tick(1000);
    fixture.detectChanges();
    expect(getTextContent()).toEqual('test0');

    tick(1000);
    fixture.detectChanges();
    expect(getTextContent()).toEqual('test1');

    tick(1000);
    fixture.detectChanges();
    expect(getTextContent()).toEqual('test2');

    // remember to discard any remaining timers
    discardPeriodicTasks();
  }));

  it('should set data when setData is called', fakeAsync(() => {
    fixture.detectChanges();
    tick();
    fixture.detectChanges();
    component.loader.setData('foo');
    fixture.detectChanges();

    expect(getTextContent()).toEqual('foo');
  }));

  it('should display error when setError is called', fakeAsync(() => {
    fixture.detectChanges();
    tick();
    fixture.detectChanges();
    component.loader.setError(new Error('test error'));
    fixture.detectChanges();

    expect(getTextContent()).toEqual('test error');
  }));

  it('it should stop loadFn emissions when setData or setError is called', fakeAsync(() => {
    let counter = 0;
    component.loadFn = () => {
      counter++;
      return timer(1000).pipe(map(() => 'test' + counter));
    };

    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    expect(getTextContent()).toEqual('loading');

    tick(1000);
    fixture.detectChanges();
    expect(getTextContent()).toEqual('test1');

    component.loader.setData('foo');
    fixture.detectChanges();

    tick(1000);
    fixture.detectChanges();
    expect(getTextContent()).toEqual('foo');

    tick(1000);
    fixture.detectChanges();
    expect(getTextContent()).toEqual('foo');

    component.loader.setError(new Error('test error'));
    fixture.detectChanges();

    tick(1000);
    fixture.detectChanges();
    expect(getTextContent()).toEqual('test error');

    tick(1000);
    fixture.detectChanges();
    expect(getTextContent()).toEqual('test error');

    // remember to discard any remaining timers
    discardPeriodicTasks();
  }));

  it('should clean up when the directive is destroyed', fakeAsync(() => {
    let cleanedUp = false;

    component.loadFn = () =>
      new Observable((observer) => {
        // Start emitting values
        const intervalId = setInterval(() => observer.next('test'), 1000);

        // Mark cleanedUp as true when the Observable is unsubscribed
        return new Subscription(() => {
          clearInterval(intervalId);
          cleanedUp = true;
        });
      });

    fixture.detectChanges();
    tick(1000); // allow time for the first load to complete

    expect(cleanedUp).toBe(false);

    fixture.destroy(); // this should trigger ngOnDestroy in the directive

    tick(1000); // allow time for the second load to attempt start

    expect(cleanedUp).toBe(true);

    discardPeriodicTasks();
  }));

  it('should have ngTemplateContextGuard method that always returns true', () => {
    expect(NgxLoadWithDirective.ngTemplateContextGuard).toBeDefined();
    expect(
      NgxLoadWithDirective.ngTemplateContextGuard(null as any, null)
    ).toEqual(true);
  });

  it('should call loadStart and loadFinish event emitters', fakeAsync(() => {
    fixture.detectChanges();
    spyOn(component.loader.loadStart, 'emit');
    spyOn(component.loader.loadFinish, 'emit');
    fixture.detectChanges();
    tick();
    fixture.detectChanges();
    expect(component.loader.loadStart.emit).toHaveBeenCalled();
    expect(component.loader.loadFinish.emit).toHaveBeenCalled();
  }));

  it('should call loadError when an error occurs', fakeAsync(() => {
    component.loadFn = () => throwError(() => new Error('An error occurred'));
    fixture.detectChanges();
    spyOn(component.loader.loadError, 'emit');
    fixture.detectChanges();
    tick();
    fixture.detectChanges();
    expect(component.loader.loadError.emit).toHaveBeenCalled();
  }));

  it('should call loadingStateChange when loading state changes', fakeAsync(() => {
    fixture.detectChanges();
    const spy = spyOn(component.loader.loadingStateChange, 'emit');
    component.loader.load();
    fixture.detectChanges();
    tick();
    fixture.detectChanges();
    expect(spy).toHaveBeenCalled();
  }));
});
