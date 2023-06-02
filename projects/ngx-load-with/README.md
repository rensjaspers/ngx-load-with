# NgxLoadWithDirective

NgxLoadWithDirective is a powerful and versatile Angular directive that handles data loading from a function returning an Observable. It provides a consistent way to manage loading states and display relevant UIs for different loading stages.

[![Build status](https://img.shields.io/github/actions/workflow/status/rensjaspers/ngx-load-with/test.yml?branch=main)](https://github.com/rensjaspers/ngx-load-with/actions/workflows/test.yml)
[![NPM version](https://img.shields.io/npm/v/ngx-load-with.svg)](https://www.npmjs.com/package/ngx-load-with)
[![NPM downloads](https://img.shields.io/npm/dm/ngx-load-with.svg)](https://www.npmjs.com/package/ngx-load-with)
[![MIT license](https://img.shields.io/github/license/rensjaspers/ngx-load-with)](https://github.com/rensjaspers/ngx-load-with/blob/main/LICENSE)
[![Minzipped size](https://img.shields.io/bundlephobia/minzip/ngx-load-with)](https://bundlephobia.com/result?p=ngx-load-with)
[![CodeFactor](https://img.shields.io/codefactor/grade/github/rensjaspers/ngx-load-with)](https://www.codefactor.io/repository/github/rensjaspers/ngx-load-with)
[![Codecov](https://img.shields.io/codecov/c/github/rensjaspers/ngx-load-with)](https://app.codecov.io/gh/rensjaspers/ngx-load-with)

## Demo

Check out these live examples of `ngx-load-with` in action:

- [Basic Usage Example](https://stackblitz.com/edit/stackblitz-starters-ygxc6t?file=src%2Fmain.ts): Demonstrates the fundamental features of `ngx-load-with`, including loading and error templates.
- [Advanced Usage Example](https://stackblitz.com/edit/angular-kkldgb-kldaa7?file=src%2Fapp%2Fapp.component.html): Showcases an e-commerce search operation using `ngx-load-with`, featuring debounce time and a persistent display of previous search results for enhanced user experience.

## Installation

To install `ngx-load-with`, run the following command:

```bash
npm install ngx-load-with
```

To use `ngx-load-with`, import the `NgxLoadWithModule` module in your Angular module:

```typescript
import { NgxLoadWithModule } from "ngx-load-with";

@NgModule({
  imports: [NgxLoadWithModule],
  declarations: [MyComponent],
})
export class MyModule {}
```

## Usage

### Basic usage

Load data from an Observable and display it in your template:

```html
<ul *ngxLoadWith="getTodos as todos">
  <li *ngFor="let todo of todos">{{todo.title}}</li>
</ul>
```

```typescript
@Component({...})
export class MyComponent {
  getTodos = () => this.http.get<Todo[]>('api/todos');

  private http = inject(HttpClient);
}
```

### Loading and error templates

Display a loading message while data is being loaded, and an error message if an error occurs:

```html
<ul *ngxLoadWith="getTodos as todos; loadingTemplate: loading; errorTemplate: error">
  <li *ngFor="let todo of todos">{{todo.title}}</li>
</ul>
<ng-template #loading>Loading...</ng-template>
<ng-template #error let-error>{{error.message}}</ng-template>
```

### Fetching data using route parameters

Load data based on a parameter from the route:

```html
<div *ngxLoadWith="getTodo as todo; args: routeParams$ | async">{{todo.title}}</div>
```

```typescript
@Component({...})
export class MyComponent {
  routeParams$ = inject(ActivatedRoute).params;

  getTodo = ({id}) => this.http.get<Todo>('api/todos/' + id);

  private http = inject(HttpClient);
}
```

[Live Example](https://stackblitz.com/edit/stackblitz-starters-srzpra?file=src%2Fdata%2Fdata.component.ts)

### Searching data

Fetch data based on user input:

```html
<input ngModel #searchbox />
<ul *ngxLoadWith="findTodos as todos; args: searchbox.value; debounceTime: 300">
  <li *ngFor="let todo of todos">{{todo.title}}</li>
</ul>
```

```typescript
@Component({...})
export class MyComponent {
  findTodos = (keywords: string) => this.http.get<Todo[]>('api/todos', { params: { q: keywords} });

  private http = inject(HttpClient);
}
```

[Live Example](https://stackblitz.com/edit/angular-kkldgb-kldaa7?file=src%2Fapp%2Fapp.component.html)

### Reloading data

Reload data when a button is clicked:

```html
<button (click)="todosLoader.load()">Reload</button>

<ng-template #todosLoader="ngxLoadWith" [ngxLoadWith]="getTodos" let-todos>
  <ul>
    <li *ngFor="let todo of todos">{{todo.title}}</li>
  </ul>
</ng-template>
```

> Note: if you want to use the `NgxLoadWithDirective.load` method in your template, you cannot use the `*ngxLoadWith` microsyntax.

### Reloading while continuing to show stale data

Reload data when a button is clicked, but display stale data while the new data is being loaded:

```html
<button (click)="todosLoader.load()">Reload</button>

<ng-template #todosLoader="ngxLoadWith" [ngxLoadWith]="getTodos" [ngxLoadWithStaleData]="true" let-todos let-loading="loading">
  <div *ngIf="loading">Reloading...</div>
  <ul>
    <li *ngFor="let todo of todos">{{todo.title}}</li>
  </ul>
</ng-template>
```

> Note: if you want to use the `NgxLoadWithDirective.load` method in your template, you cannot use the `*ngxLoadWith` microsyntax.

## API

### Inputs

| Name                         | Type                                | Description                                                                                                  |
| ---------------------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `ngxLoadWith`                | `(args?: any) => Observable<T>`     | A function that returns an `Observable` of the data to be loaded. Changes to this function trigger a reload. |
| `ngxLoadWithArgs`            | `unknown`                           | An argument to be passed to the `loadFn` function. Changes to this argument will trigger a reload.           |
| `ngxLoadWithLoadingTemplate` | `TemplateRef<unknown>`              | An optional template to be displayed while the data is being loaded.                                         |
| `ngxLoadWithErrorTemplate`   | `TemplateRef<ErrorTemplateContext>` | An optional template to be displayed when an error occurs while loading the data.                            |
| `ngxLoadWithDebounceTime`    | `number`                            | The amount of time in milliseconds to debounce the load trigger.                                             |
| `ngxLoadWithStaleData`       | `boolean`                           | A boolean indicating whether to show stale data when reloading.                                              |

### Outputs

| Name                 | Type                            | Description                                                                     |
| -------------------- | ------------------------------- | ------------------------------------------------------------------------------- |
| `loadStart`          | `EventEmitter<void>`            | Emits when the data loading process starts.                                     |
| `loadSuccess`        | `EventEmitter<T>`               | Emits when the data loading process is successful.                              |
| `loadError`          | `EventEmitter<Error>`           | Emits when an error occurs while loading the data.                              |
| `loadFinish`         | `EventEmitter<void>`            | Emits when the data loading process finishes, regardless of success or failure. |
| `loadingStateChange` | `EventEmitter<LoadingState<T>>` | Emits when the loading state changes.                                           |

### Methods

| Name                     | Description                                                                                |
| ------------------------ | ------------------------------------------------------------------------------------------ |
| `load()`                 | Triggers a reload of the data. Previous load requests are cancelled.                       |
| `cancel()`               | Cancels any pending load requests.                                                         |
| `setData(data: T)`       | Updates the loading state as if the passed data were loaded through the `loadFn` function. |
| `setError(error: Error)` | Updates the loading state as if the passed error were thrown by the `loadFn` function.     |

### Interfaces

```typescript
interface LoadingState<T = unknown> {
  loading: boolean;
  loaded: boolean;
  error?: Error | null;
  data?: T;
}

interface LoadedTemplateContext<T = unknown> {
  $implicit: T;
  ngxLoadWith: T;
  loading: boolean;
}

interface ErrorTemplateContext {
  $implicit: Error;
  retry: () => void;
}
```

## License

`ngx-load-with` is licensed under the MIT License. See the [LICENSE](https://github.com/rensjaspers/ngx-load-with/blob/main/LICENSE) file for details.

## Contributing

Contributions are welcome! See the [CONTRIBUTING](https://github.com/rensjaspers/ngx-load-with/blob/main/CONTRIBUTING.md) file for details.

## Credits

This project is developed and managed by [Rens Jaspers](https://github.com/rensjaspers). It draws significant inspiration from [ngx-observe](https://github.com/nilsmehlhorn/ngx-observe).
