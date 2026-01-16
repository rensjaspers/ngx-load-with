import {
  ChangeDetectorRef,
  Directive,
  EmbeddedViewRef,
  OnDestroy,
  TemplateRef,
  ViewContainerRef,
  computed,
  effect,
  input,
  output,
  signal,
  untracked,
} from "@angular/core";
import {
  Observable,
  Subject,
  catchError,
  finalize,
  merge,
  of,
  switchMap,
  takeUntil,
  tap,
  timer,
} from "rxjs";

export interface LoadingState<T = unknown> {
  loading: boolean;
  loaded: boolean;
  error?: Error | null;
  data?: T;
}

export interface LoadedTemplateContext<T = unknown> {
  $implicit: T;
  ngxLoadWith: T;
  loading: boolean;
}

export interface ErrorTemplateContext {
  $implicit: Error;
  retry: () => void;
}

// eslint-disable-next-line  @typescript-eslint/no-explicit-any
type LoadFn<T> = (args?: any) => Observable<T>;

/**
 * The NgxLoadWithDirective is an Angular directive for managing asynchronous data loading in components.
 * It provides interfaces for specifying templates corresponding to various loading states - 'loading',
 * 'loaded', and 'error'.
 *
 * The directive can accept either a load function returning an Observable, or a plain Observable directly.
 * If a function is provided, it may optionally accept arguments, triggering a data reload on any changes to these arguments.
 *
 * The directive allows for injecting custom templates for each loading state, enhancing the flexibility of UI design.
 *
 * Key features of the directive:
 *
 * - Handling UI state transitions: 'loading', 'loaded', and 'error'.
 * - Acceptance of either a custom function returning an Observable or a plain Observable for data loading.
 * - Injection of custom templates for 'loading', 'loaded', and 'error' states.
 * - Emission of events corresponding to the loading state: 'loadStart', 'loadSuccess', 'loadError', and 'loadFinish'.
 * - User-defined debounce time for the loading function.
 * - Ability to display previously loaded data while reloading.
 */
@Directive({
  standalone: true,
  selector: "[ngxLoadWith]",
  exportAs: "ngxLoadWith",
})
export class NgxLoadWithDirective<T = unknown> implements OnDestroy {
  ngxLoadWith = input.required<LoadFn<T> | Observable<T>>({
    alias: "ngxLoadWith",
  });

  args = input<unknown>(undefined, { alias: "ngxLoadWithArgs" });

  loadingTemplate = input<TemplateRef<unknown> | undefined>(undefined, {
    alias: "ngxLoadWithLoadingTemplate",
  });

  errorTemplate = input<TemplateRef<ErrorTemplateContext> | undefined>(
    undefined,
    { alias: "ngxLoadWithErrorTemplate" },
  );

  debounceTime = input(0, { alias: "ngxLoadWithDebounceTime" });

  staleData = input(false, { alias: "ngxLoadWithStaleData" });

  loadStart = output<void>();
  loadSuccess = output<T>();
  loadError = output<Error>();
  loadFinish = output<void>();
  loadingStateChange = output<LoadingState<T>>();

  private loadedViewRef?: EmbeddedViewRef<LoadedTemplateContext<T>>;
  private loadingViewRef?: EmbeddedViewRef<unknown>;
  private readonly destroyed$ = new Subject<void>();
  private readonly loadTrigger$ = new Subject<void>();
  private readonly cancelTrigger$ = new Subject<void>();

  private loadingState = signal<LoadingState<T>>({
    loading: false,
    loaded: false,
    error: null,
    data: undefined,
  });

  private loadFn = computed(() => {
    const value = this.ngxLoadWith();
    return value instanceof Observable ? () => value : value;
  });

  constructor(
    private templateRef: TemplateRef<LoadedTemplateContext<T>>,
    private viewContainer: ViewContainerRef,
    private changeDetectorRef: ChangeDetectorRef,
  ) {
    // Effect to handle state changes and rendering
    effect(() => {
      const state = this.loadingState();
      untracked(() => {
        this.handleLoadingPhase(state);
        this.loadingStateChange.emit(state);
        this.changeDetectorRef.markForCheck();
      });
    });

    // Effect to trigger loads when inputs change
    effect(() => {
      this.ngxLoadWith();
      this.args();
      untracked(() => this.load());
    });

    // Effect to re-render templates when they change
    effect(() => {
      const loadingTpl = this.loadingTemplate();
      const errorTpl = this.errorTemplate();
      const state = untracked(() => this.loadingState());
      const phase = untracked(() => this.getLoadingPhase(state));
      
      untracked(() => {
        if (phase === "loading" && loadingTpl !== undefined) {
          this.renderLoadingTemplate();
        } else if (phase === "error" && errorTpl !== undefined) {
          this.handleErrorState(state);
        }
      });
    });

    // Set up the loading pipeline
    this.setupLoadPipeline();
  }

  ngOnDestroy(): void {
    this.destroyed$.next();
    this.destroyed$.complete();
  }

  load(): void {
    this.loadTrigger$.next();
  }

  cancel(): void {
    this.cancelTrigger$.next();
    this.loadingState.set({
      ...this.loadingState(),
      loading: false,
    });
  }

  setData(data: T): void {
    this.loadingState.set({
      loading: false,
      loaded: true,
      error: null,
      data,
    });
  }

  setError(error: Error): void {
    this.loadingState.set({
      ...this.loadingState(),
      error,
      loading: false,
    });
  }

  private setupLoadPipeline(): void {
    this.loadTrigger$
      .pipe(
        switchMap(() => {
          const deb = this.debounceTime();
          if (deb > 0) {
            return timer(deb).pipe(
              tap(() => {
                this.loadingState.update((state) => ({
                  ...state,
                  loading: true,
                  error: null,
                }));
                this.loadStart.emit();
              }),
            );
          }
          this.loadingState.update((state) => ({
            ...state,
            loading: true,
            error: null,
          }));
          this.loadStart.emit();
          return of(null);
        }),
        switchMap(() => {
          const fn = this.loadFn();
          const args = this.args();
          return fn(args).pipe(
            tap((data) => {
              this.loadSuccess.emit(data);
              this.loadingState.set({
                loading: false,
                loaded: true,
                error: null,
                data,
              });
            }),
            catchError((error) => {
              this.loadError.emit(error);
              this.loadingState.set({
                ...this.loadingState(),
                loading: false,
                error,
              });
              return of(null);
            }),
            finalize(() => this.loadFinish.emit()),
            takeUntil(merge(this.cancelTrigger$, this.loadTrigger$)),
          );
        }),
        takeUntil(this.destroyed$),
      )
      .subscribe();
  }

  private handleLoadingPhase(state: LoadingState<T>): void {
    const phase = this.getLoadingPhase(state);

    if (phase === "error") {
      this.handleErrorState(state);
    } else if (phase === "loading") {
      this.handleLoadingState();
    } else {
      this.handleLoadedState(state);
    }
  }

  private getLoadingPhase(
    state: LoadingState<T>,
  ): "loading" | "loaded" | "error" {
    if (state.error) {
      return "error";
    }
    if (state.loaded && (!state.loading || this.staleData())) {
      return "loaded";
    }
    return "loading";
  }

  private handleErrorState(state: LoadingState<T>): void {
    this.clearViewContainer();
    const template = this.errorTemplate();
    if (template) {
      this.viewContainer.createEmbeddedView(template, {
        $implicit: state.error as Error,
        retry: () => this.load(),
      });
    }
  }

  private handleLoadingState(): void {
    if (this.loadingViewRef) {
      return;
    }
    this.renderLoadingTemplate();
  }

  private renderLoadingTemplate(): void {
    this.clearViewContainer();
    const template = this.loadingTemplate();
    if (template) {
      this.loadingViewRef = this.viewContainer.createEmbeddedView(template);
    }
  }

  private handleLoadedState(state: LoadingState<T>): void {
    const data = state.data as T;
    const loading = state.loading;

    if (this.loadedViewRef) {
      this.loadedViewRef.context.$implicit = data;
      this.loadedViewRef.context.ngxLoadWith = data;
      this.loadedViewRef.context.loading = loading;
    } else {
      this.clearViewContainer();
      this.loadedViewRef = this.viewContainer.createEmbeddedView(
        this.templateRef,
        { $implicit: data, ngxLoadWith: data, loading },
      );
    }
  }

  private clearViewContainer(): void {
    this.viewContainer.clear();
    this.loadedViewRef = undefined;
    this.loadingViewRef = undefined;
  }

  static ngTemplateContextGuard<T>(
    _dir: NgxLoadWithDirective<T>,
    _ctx: unknown,
  ): _ctx is LoadedTemplateContext<T> {
    return true;
  }
}
