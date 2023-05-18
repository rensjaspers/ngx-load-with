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
  debounceTime,
  finalize,
  map,
  merge,
  of,
  scan,
  switchMap,
  takeUntil,
  tap,
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
  @Input('ngxLoadWith') loadFn!: (args: any) => Observable<T>;
  @Input('ngxLoadWithArgs') args: unknown;
  @Input('ngxLoadWithLoadingTemplate') loadingTemplate?: TemplateRef<unknown>;
  @Input('ngxLoadWithErrorTemplate') errorTemplate?: TemplateRef<unknown>;
  @Input('ngxLoadWithDebounceTime') debounceTime = 0;
  @Input('ngxLoadWithStaleData') staleData = false;
  @Input('ngxLoadWithReloadOnChanges') reloadOnChanges = true;

  @Output() debounceStart = new EventEmitter<void>();
  @Output() loadStart = new EventEmitter<T>();
  @Output() loadSuccess = new EventEmitter<T>();
  @Output() loadError = new EventEmitter<Error>();
  @Output() loadFinish = new EventEmitter<Error>();
  @Output() loadingStateChange = new EventEmitter<LoadingState<T>>();

  private readonly reloadTrigger = new Subject<void>();
  private readonly cancelTrigger = new Subject<void>();
  private readonly destroyed = new Subject<void>();

  private readonly loadingPhaseHandlers: loadingPhaseHandlers<T> = {
    loading: (state) => this.showLoading(state),
    reloading: (state) => this.showReloading(state),
    loaded: (state) => this.showLoaded(state),
    error: (state) => this.showError(state),
  };

  private readonly stateUpdateCommands = {
    initialState: { loading: false, loaded: false },
    debouncingState: { loading: true, error: null, debouncing: true },
    loadingState: { loading: true, error: null, debouncing: false },
    loadedState: { loaded: true, loading: false },
    errorState: { loaded: false, loading: false },
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

  private handleLoadingState(state: LoadingState<T>) {
    const phase = this.getLoadingPhase(state);
    this.viewContainer.clear();
    const handler = this.loadingPhaseHandlers[phase];
    handler(state);
    this.changeDetectorRef.markForCheck();
  }

  ngOnChanges(): void {
    if (this.reloadOnChanges) {
      this.cancel();
      this.reload();
    }
  }

  ngOnDestroy(): void {
    this.destroyed.next();
  }

  reload() {
    this.reloadTrigger.next();
  }

  cancel() {
    this.cancelTrigger.next();
  }

  private getLoadingState(): Observable<LoadingState<T>> {
    const debouncedReload$ = this.reloadTrigger.pipe(
      debounceTime(this.debounceTime)
    );
    return merge(
      this.getDebouncingUpdates(),
      this.getLoadingUpdates(debouncedReload$),
      this.getLoadResultUpdates(debouncedReload$)
    ).pipe(
      scan(
        (state, update) => ({ ...state, ...update }),
        this.stateUpdateCommands.initialState
      )
    );
  }

  private getLoadResultUpdates(debouncedReload$: Observable<void>) {
    return debouncedReload$.pipe(
      switchMap(() =>
        this.loadFn(this.args).pipe(
          tap((data) => this.loadSuccess.emit(data)),
          map((data) => this.getLoadedState(data)),
          catchError((error) =>
            this.getErrorState(error).pipe(
              tap(() => this.loadError.emit(error))
            )
          ),
          takeUntil(this.cancelTrigger),
          finalize(() => {
            this.loadFinish.emit();
          })
        )
      )
    );
  }

  private getErrorState(
    error: any
  ): Observable<{ error: any; loaded: boolean; loading: boolean }> {
    return of({ ...this.stateUpdateCommands.errorState, error });
  }

  private getLoadedState(data: T): {
    data: T;
    loaded: boolean;
    loading: boolean;
  } {
    return { ...this.stateUpdateCommands.loadedState, data };
  }

  private getLoadingUpdates(debouncedReload$: Observable<void>) {
    return debouncedReload$.pipe(
      tap(() => this.loadStart.emit()),
      map(() => this.stateUpdateCommands.loadingState)
    );
  }

  private getDebouncingUpdates() {
    return this.reloadTrigger.pipe(
      tap(() => this.debounceStart.emit()),
      map(() => this.stateUpdateCommands.debouncingState)
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

  static ngTemplateContextGuard<T>(
    _dir: NgxLoadWithDirective<T>,
    _ctx: any
  ): _ctx is LoadedTemplateContext<T> {
    return true;
  }
}
