import {
  ChangeDetectorRef,
  Directive,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  TemplateRef,
  ViewContainerRef,
} from '@angular/core';
import {
  Observable,
  Subject,
  catchError,
  debounce,
  finalize,
  map,
  merge,
  of,
  scan,
  switchMap,
  takeUntil,
  tap,
  timer,
} from 'rxjs';

export interface LoadingState<T = unknown> {
  loading: boolean;
  loaded: boolean;
  debouncing?: boolean;
  error?: Error | null;
  data?: T;
}

export interface LoadedTemplateContext<T = unknown> {
  $implicit: T;
  ngxLoadWith: T;
  reloading: boolean;
  debouncing: boolean;
}

export interface LoadingTemplateContext {
  debouncing: boolean;
}

export interface ErrorTemplateContext {
  $implicit: Error;
  retry: () => void;
}

type LoadingPhase = 'loading' | 'reloading' | 'loaded' | 'error';

type loadingPhaseHandlers<T> = {
  [K in LoadingPhase]: (state: LoadingState<T>) => void;
};

@Directive({
  selector: '[ngxLoadWith]',
  exportAs: 'ngxLoadWith',
})
export class NgxLoadWithDirective<T = unknown>
  implements OnInit, OnChanges, OnDestroy
{
  /**
   * A function that returns an Observable of the data to be loaded. The function can optionally take an argument of any type.
   * The Observable should emit the data to be loaded, and complete when the data has been fully loaded.
   * If an error occurs while loading the data, the Observable should emit an error.
   */
  // eslint-disable-next-line  @typescript-eslint/no-explicit-any
  @Input('ngxLoadWith') loadFn!: (args?: any) => Observable<T>;

  /**
   * An optional argument to be passed to the `loadFn` function. Changes to this argument will trigger a reload.
   */
  @Input('ngxLoadWithArgs') args: unknown;

  /**
   * An optional template to be displayed while the data is being loaded.
   * The template can access the `debouncing` property of the `LoadingTemplateContext` interface.
   */
  @Input('ngxLoadWithLoadingTemplate')
  loadingTemplate?: TemplateRef<LoadingTemplateContext>;

  /**
   * An optional template to be displayed when an error occurs while loading the data.
   * The template can access the `$implicit` property of the `ErrorTemplateContext` interface, which contains the error object.
   * The template can also access the `retry` function, which can be called to retry loading the data.
   */
  @Input('ngxLoadWithErrorTemplate')
  errorTemplate?: TemplateRef<ErrorTemplateContext>;

  /**
   * The amount of time in milliseconds to wait before triggering a reload when the `ngxLoadWithArgs` input changes.
   * If set to 0, the reload will be triggered immediately.
   */
  @Input('ngxLoadWithDebounceTime') debounceTime = 0;

  /**
   * A boolean indicating whether to use stale data when reloading.
   * If set to true, the directive will use the previously loaded data while reloading.
   * If set to false (default), the directive will clear the previously loaded data before reloading.
   */
  @Input('ngxLoadWithStaleData') staleData = false;

  /**
   * An event emitted when the debounce timer starts.
   */
  @Output() debounceStart = new EventEmitter<void>();

  /**
   * An event emitted when the data loading process starts.
   */
  @Output() loadStart = new EventEmitter<void>();

  /**
   * An event emitted when the data loading process is successful.
   * The event payload is the loaded data of type `T`.
   */
  @Output() loadSuccess = new EventEmitter<T>();

  /**
   * An event emitted when an error occurs while loading the data.
   * The event payload is the error object of type `Error`.
   */
  @Output() loadError = new EventEmitter<Error>();

  /**
   * An event emitted when the data loading process finishes, regardless of whether it was successful or not.
   */
  @Output() loadFinish = new EventEmitter<void>();

  /**
   * An event emitted when the loading state changes.
   * The event payload is the current loading state of type `LoadingState<T>`.
   */
  @Output() loadingStateChange = new EventEmitter<LoadingState<T>>();

  private readonly reloadTrigger = new Subject<void>();
  private readonly cancelTrigger = new Subject<void>();
  private readonly destroyed = new Subject<void>();
  private readonly stateOverride = new Subject<Partial<LoadingState<T>>>();

  private readonly loadingPhaseHandlers: loadingPhaseHandlers<T> = {
    loading: (state) => this.showLoading(state),
    reloading: (state) => this.showReloading(state),
    loaded: (state) => this.showLoaded(state),
    error: (state) => this.showError(state),
  };

  private readonly stateUpdateCommands = {
    initial: { loading: false, loaded: false },
    debouncing: { loading: true, error: null, debouncing: true },
    loading: { loading: true, error: null, debouncing: false },
    loaded: { loaded: true, loading: false, debouncing: false },
    error: { loaded: false, loading: false, debouncing: false },
  };

  constructor(
    private templateRef: TemplateRef<LoadedTemplateContext<T>>,
    private viewContainer: ViewContainerRef,
    private changeDetectorRef: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.getLoadingState()
      .pipe(
        tap((state) => {
          this.handleLoadingState(state);
          this.loadingStateChange.emit(state);
        }),
        takeUntil(this.destroyed)
      )
      .subscribe();
    this.reload();
  }

  ngOnChanges(): void {
    this.cancel();
    this.reload();
  }

  ngOnDestroy(): void {
    this.destroyed.next();
  }

  /**
   * Triggers a reload of the data. Previous load requests are cancelled.
   */
  reload(): void {
    this.reloadTrigger.next();
  }

  /**
   * Cancels any pending load requests.
   */
  cancel(): void {
    this.cancelTrigger.next();
  }

  /**
   * Updates the loading state as if the passed data were loaded through the `loadWith` function.
   */
  setData(data: T): void {
    this.stateOverride.next(this.getLoadedState(data));
  }

  /**
   * Updates the loading state as if the passed error were thrown by `loadWith` function.
   */
  setError(error: Error): void {
    this.stateOverride.next(this.getErrorState(error));
  }

  private getLoadingState(): Observable<LoadingState<T>> {
    const debouncedReload$ = this.reloadTrigger.pipe(
      debounce(() => timer(this.debounceTime))
    );
    return merge(
      this.getDebouncingUpdates(),
      this.getLoadingUpdates(debouncedReload$),
      this.getLoadResultUpdates(debouncedReload$),
      this.stateOverride
    ).pipe(
      scan(
        (state, update) => ({ ...state, ...update }),
        this.stateUpdateCommands.initial
      )
    );
  }

  private getLoadResultUpdates(debouncedReload$: Observable<void>) {
    const stop$ = merge(this.cancelTrigger, this.destroyed, this.stateOverride);
    return debouncedReload$.pipe(
      switchMap(() =>
        this.loadFn(this.args).pipe(
          tap((data) => this.loadSuccess.emit(data)),
          map((data) => this.getLoadedState(data)),
          catchError((error) =>
            of(this.getErrorState(error)).pipe(
              tap(() => this.loadError.emit(error))
            )
          ),
          takeUntil(stop$),
          finalize(() => {
            this.loadFinish.emit();
          })
        )
      )
    );
  }

  private getErrorState(error: Error) {
    return { ...this.stateUpdateCommands.error, error };
  }

  private getLoadedState(data: T) {
    return { ...this.stateUpdateCommands.loaded, data };
  }

  private getLoadingUpdates(debouncedReload$: Observable<void>) {
    return debouncedReload$.pipe(
      tap(() => this.loadStart.emit()),
      map(() => this.stateUpdateCommands.loading)
    );
  }

  private getDebouncingUpdates() {
    return this.reloadTrigger.pipe(
      tap(() => this.debounceStart.emit()),
      map(() => this.stateUpdateCommands.debouncing)
    );
  }

  private getLoadingPhase(state: LoadingState<T>) {
    if (state.error) {
      return 'error';
    } else if (state.loading) {
      if (state.loaded) {
        return 'reloading';
      }
      return 'loading';
    }
    return 'loaded';
  }

  private showError({ error }: LoadingState): void {
    if (this.errorTemplate) {
      this.viewContainer.createEmbeddedView(this.errorTemplate, {
        $implicit: error,
        retry: () => this.reload(),
      });
    }
  }

  private showLoading({ debouncing }: LoadingState<T>): void {
    if (this.loadingTemplate) {
      this.viewContainer.createEmbeddedView(this.loadingTemplate, {
        debouncing,
      });
    }
  }

  private showLoaded({ data }: LoadingState<T>): void {
    this.viewContainer.createEmbeddedView(this.templateRef, {
      $implicit: data,
      ngxLoadWith: data,
      reloading: false,
      debouncing: false,
    });
  }

  private showReloading(state: LoadingState<T>): void {
    if (!this.staleData) {
      this.showLoading(state);
      return;
    }
    this.viewContainer.createEmbeddedView(this.templateRef, {
      $implicit: state.data,
      ngxLoadWith: state.data,
      reloading: true,
      debouncing: state.debouncing,
    });
  }

  private handleLoadingState(state: LoadingState<T>) {
    const phase = this.getLoadingPhase(state);
    this.viewContainer.clear();
    const handler = this.loadingPhaseHandlers[phase];
    handler(state);
    this.changeDetectorRef.markForCheck();
  }

  static ngTemplateContextGuard<T>(
    _dir: NgxLoadWithDirective<T>,
    _ctx: unknown
  ): _ctx is LoadedTemplateContext<T> {
    return true;
  }
}
