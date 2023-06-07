# NgxLoadWith

`NgxLoadWithDirective` is a powerful and versatile [Angular structural directive](https://angular.io/guide/structural-directives) designed to simplify the process of dynamically loading Observable-based data. It provides a unified approach to managing loading states and elegantly displaying corresponding UIs at different stages of the loading process.

[![Build status](https://img.shields.io/github/actions/workflow/status/rensjaspers/ngx-load-with/test.yml?branch=main)](https://github.com/rensjaspers/ngx-load-with/actions/workflows/test.yml)
[![NPM version](https://img.shields.io/npm/v/ngx-load-with.svg)](https://www.npmjs.com/package/ngx-load-with)
[![NPM downloads](https://img.shields.io/npm/dm/ngx-load-with.svg)](https://www.npmjs.com/package/ngx-load-with)
[![MIT license](https://img.shields.io/github/license/rensjaspers/ngx-load-with)](https://github.com/rensjaspers/ngx-load-with/blob/main/LICENSE)
[![Minzipped size](https://img.shields.io/bundlephobia/minzip/ngx-load-with)](https://bundlephobia.com/result?p=ngx-load-with)
[![CodeFactor](https://img.shields.io/codefactor/grade/github/rensjaspers/ngx-load-with)](https://www.codefactor.io/repository/github/rensjaspers/ngx-load-with)
[![Codecov](https://img.shields.io/codecov/c/github/rensjaspers/ngx-load-with)](https://app.codecov.io/gh/rensjaspers/ngx-load-with)

## Table of Contents

- [Demo](#demo)
- [Installation](#installation)
- [Usage](#usage)
  - [Basic usage](#basic-usage)
  - [Loading and error templates](#loading-and-error-templates)
  - [Loading based on dynamic arguments](#loading-based-on-dynamic-arguments)
  - [Reloading data](#reloading-data)
  - [Reloading while continuing to show stale data](#reloading-while-continuing-to-show-stale-data)
- [Note on Microsyntax](#note-on-microsyntax)
- [API](#api)
- [FAQ](#faq)
- [License](#license)
- [Contributing](#contributing)
- [Credits](#credits)

## Demo

Check out these live examples of `ngx-load-with` in action:

- ⚡️ [Basic Usage Example](https://stackblitz.com/edit/stackblitz-starters-ygxc6t?file=src%2Fmain.ts): Demonstrates the fundamental features of `ngx-load-with`, including loading and error templates.
- ⚡️ [Advanced Usage Example](https://stackblitz.com/edit/angular-kkldgb-kldaa7?file=src%2Fapp%2Fapp.component.html): Showcases an e-commerce search operation using `ngx-load-with`, featuring debounce time and a persistent display of previous search results for enhanced user experience.

## Installation

To install `ngx-load-with`, run the following command:

```bash
npm install ngx-load-with
```

> Note: you need Angular version 15 or higher.

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

⚡️ **[Live Example](https://stackblitz.com/edit/stackblitz-starters-rrd4du?file=src%2Fmain.ts)**

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

You can also pass a plain Observable ([live example](https://stackblitz.com/edit/stackblitz-starters-hygzxn?file=src%2Fmain.ts)):

```html
<div *ngxLoadWith="todos$ as todo">{{todo.title}}</div>
```

```typescript
@Component({...})
export class MyComponent {
  todos$ = inject(HttpClient).get<Todo[]>('api/todos');
}
```

> **Warning:** if you provide a plain Observable instead of a function,
> you will not be able to use dynamic arguments from the `args` input. See [this section](#why-use-a-function-returning-an-observable-instead-of-a-direct-observable) for more information.

### Loading and error templates

Display a loading message while data is being loaded, and an error message if an error occurs:

⚡️ **[Live Example](https://stackblitz.com/edit/stackblitz-starters-ygxc6t?file=src%2Fmain.ts)**

```html
<ul *ngxLoadWith="getTodos as todos; loadingTemplate: loading; errorTemplate: error">
  <li *ngFor="let todo of todos">{{todo.title}}</li>
</ul>
<ng-template #loading>Loading...</ng-template>
<ng-template #error let-error>{{error.message}}</ng-template>
```

### Loading based on dynamic arguments

By leveraging the `args` input in `ngx-load-with`, data can be dynamically loaded in response to changes in these arguments. This automatic reloading saves manual tracking and loading efforts, making your code cleaner and more efficient. Detailed explanation can be found [here](#why-use-a-function-returning-an-observable-instead-of-a-direct-observable).

**Fetching data using route parameters:**

⚡️ **[Live Example](https://stackblitz.com/edit/stackblitz-starters-srzpra?file=src%2Fdata%2Fdata.component.ts)**

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

**Searching data: fetch data based on user input:**

⚡️ **[Live Example](https://stackblitz.com/edit/angular-kkldgb-kldaa7?file=src%2Fapp%2Fapp.component.html)**

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

### Reloading data

Reload data when a button is clicked:

⚡️ **[Live Example](https://stackblitz.com/edit/stackblitz-starters-eknilk?file=src%2Fmain.ts)**

```html
<button (click)="todosLoader.load()">Reload</button>

<ng-template #todosLoader="ngxLoadWith" [ngxLoadWith]="getTodos" let-todos>
  <ul>
    <li *ngFor="let todo of todos">{{todo.title}}</li>
  </ul>
</ng-template>
```

> **Important:** If you plan to use the `NgxLoadWithDirective.load` method in your template, please note that you cannot use the `*ngxLoadWith` microsyntax. See [note on microsyntax](#note-on-microsyntax) for more details.

### Reloading while continuing to show stale data

Reload data when a button is clicked, but display stale data while the new data is being loaded:

⚡️ **[Live Example](https://stackblitz.com/edit/stackblitz-starters-vy9naj?file=src%2Fmain.ts)**

```html
<button (click)="todosLoader.load()">Reload</button>

<ng-template #todosLoader="ngxLoadWith" [ngxLoadWith]="getTodos" [ngxLoadWithStaleData]="true" let-todos let-loading="loading">
  <div *ngIf="loading">Reloading...</div>
  <ul>
    <li *ngFor="let todo of todos">{{todo.title}}</li>
  </ul>
</ng-template>
```

> **Important:** If you plan to use the `NgxLoadWithDirective.load` method in your template, please note that you cannot use the `*ngxLoadWith` microsyntax. See [note on microsyntax](#note-on-microsyntax) for more details.

## Note on Microsyntax

When using the `NgxLoadWithDirective`, you have two options for syntax:

1. **Microsyntax:** This shorter, more compact syntax is easy to read and sufficient for many common use cases. For example:

   ```html
   <div *ngxLoadWith="getTodo as todo; args: id">...</div>
   ```

2. **Normal syntax:** The longer form syntax is necessary when you need to create a directive reference in your template or listen to output events emitted by the directive. For example:

   ```html
   <ng-template #loader="ngxLoadWith" [ngxLoadWith]="getTodo" [ngxLoadWithArgs]="id" let-todo>
     <div>...</div>
   </ng-template>
   ```

   In this example, `#loader="ngxLoadWith"` creates a reference to the `NgxLoadWithDirective` instance, allowing you to call the `load()` method in your template:

   ```html
   <button (click)="loader.load()">Reload</button>
   ```

   Additionally, using the normal syntax allows you to listen to output events:

   ```html
   <ng-template #loader="ngxLoadWith" [ngxLoadWith]="getTodos" (loadSuccess)="onSuccess($event)" (loadError)="onError($event)" let-todos>
     <div>...</div>
   </ng-template>
   ```

## API

### Inputs

| Name                                                                                   | Description                                                                                                                  |
| -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `@Input('ngxLoadWith') ngxLoadWith: () => Observable<T> \| Observable<T>`              | A function returning an `Observable` of the data to be loaded, or a plain Observable.                                        |
| `@Input('ngxLoadWithArgs') args: unknown`                                              | An argument to be passed to the `ngxLoadWith` function (if it's a function). Changes to this argument will trigger a reload. |
| `@Input('ngxLoadWithLoadingTemplate') loadingTemplate: TemplateRef<unknown>`           | An optional template to be displayed while the data is being loaded.                                                         |
| `@Input('ngxLoadWithErrorTemplate') errorTemplate: TemplateRef< ErrorTemplateContext>` | An optional template to be displayed when an error occurs while loading the data.                                            |
| `@Input('ngxLoadWithDebounceTime') debounceTime: number`                               | The amount of time in milliseconds to debounce the load trigger.                                                             |
| `@Input('ngxLoadWithStaleData') staleData: boolean`                                    | A boolean indicating whether to show previously loaded data while reloading.                                                 |

### Outputs

| Name                                                          | Description                                                                     |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `@Output() loadStart: EventEmitter<void>`                     | Emits when the data loading process starts.                                     |
| `@Output() loadSuccess: EventEmitter<T>`                      | Emits when the data loading process is successful.                              |
| `@Output() loadError: EventEmitter<Error>`                    | Emits when an error occurs while loading the data.                              |
| `@Output() loadFinish: EventEmitter<void>`                    | Emits when the data loading process finishes, regardless of success or failure. |
| `@Output() loadingStateChange: EventEmitter<LoadingState<T>>` | Emits when the loading state changes.                                           |

> **Important:** If you plan to listen to the above output events, please note that you cannot use the `*ngxLoadWith` microsyntax. See [note on microsyntax](#note-on-microsyntax) for more details on using the normal syntax.

### Methods

| Name                     | Description                                                                                     |
| ------------------------ | ----------------------------------------------------------------------------------------------- |
| `load()`                 | Triggers a reload of the data. Previous load requests are cancelled.                            |
| `cancel()`               | Cancels any pending load requests.                                                              |
| `setData(data: T)`       | Updates the loading state as if the passed data were loaded through the `ngxLoadWith` function. |
| `setError(error: Error)` | Updates the loading state as if the passed error were thrown by the `ngxLoadWith` function.     |

> **Important:** If you plan to use the above methods in your template, please note that you cannot use the `*ngxLoadWith` microsyntax. See [note on microsyntax](#note-on-microsyntax) for more details on using the normal syntax.

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

## FAQ

### Why use a function returning an Observable instead of a direct Observable?

The choice of accepting a function returning an Observable, instead of just an Observable, stems from the ability to pass dynamic arguments using the `[ngxLoadWithArgs]` input.

This design simplifies scenarios where the data fetching depends on changing parameters. For example, when the data load is tied to route parameters, any change in these parameters necessitates data reloading. `ngx-load-with` automatically manages this process by reacting to the changes in these arguments.

A relevant example is found in the ["Loading based on dynamic arguments"](#loading-based-on-dynamic-arguments) section. Here, route parameters are passed as arguments to the `getTodo` function, and any alteration in these parameters triggers a data reload.

Without `ngx-load-with`, you would manually pipe your route parameters through a `switchMap` operator to trigger the data fetching function:

```typescript
this.route.params.pipe(
  switchMap((params) =>
    concat(
      of({ loading: true }),
      this.getData(params).pipe(
        map((data) => ({ data, loading: false }))
        // etc.
```

`ngx-load-with` automates this logic, leading to cleaner and more intuitive code that's easier to understand and maintain.

## License

`ngx-load-with` is licensed under the MIT License. See the [LICENSE](https://github.com/rensjaspers/ngx-load-with/blob/main/LICENSE) file for details.

## Contributing

Contributions are welcome! See the [CONTRIBUTING](https://github.com/rensjaspers/ngx-load-with/blob/main/CONTRIBUTING.md) file for details.

## Credits

This project is developed and managed by [Rens Jaspers](https://github.com/rensjaspers). It draws significant inspiration from [ngx-observe](https://github.com/nilsmehlhorn/ngx-observe) and [react-async](https://www.npmjs.com/package/react-async).
