# NgxLoadWith

Welcome to `NgxLoadWith`, a powerful tool for Observable-based data loading in Angular.

[![Build status](https://img.shields.io/github/actions/workflow/status/rensjaspers/ngx-load-with/ci.yml?branch=main)](https://github.com/rensjaspers/ngx-load-with/actions/workflows/ci.yml)
[![NPM version](https://img.shields.io/npm/v/ngx-load-with.svg)](https://www.npmjs.com/package/ngx-load-with)
[![NPM downloads](https://img.shields.io/npm/dt/ngx-load-with.svg)](https://www.npmjs.com/package/ngx-load-with)
[![MIT license](https://img.shields.io/github/license/rensjaspers/ngx-load-with)](https://github.com/rensjaspers/ngx-load-with/blob/main/LICENSE)
[![Minzipped size](https://img.shields.io/bundlephobia/minzip/ngx-load-with)](https://bundlephobia.com/result?p=ngx-load-with)
[![CodeFactor](https://img.shields.io/codefactor/grade/github/rensjaspers/ngx-load-with)](https://www.codefactor.io/repository/github/rensjaspers/ngx-load-with)
[![Codecov](https://img.shields.io/codecov/c/github/rensjaspers/ngx-load-with)](https://app.codecov.io/gh/rensjaspers/ngx-load-with)

```angular
<div *ngxLoadWith="unreadCount$ as count">
  You have {{ count }} unread messages
</div>
<!-- Output: You have 0 unread messages -->
```

With `NgxLoadWithDirective`, you can easily display data from an Observable in your template. You won’t have to worry about performance, errors, or managing the loading state. Plus, it lets you handle reloading and more advanced tasks, all with minimal RxJS knowledge.

**Key Features:**

- 💡 **Declarative UI State Management:** Automates transitions between loading, success, and error states, eliminating the need for if-statements.
- 🚀 **Performance:** Optimized for efficiency, aligns with Angular's OnPush change detection.
- 🛡️ **Memory Safety:** Automatically unsubscribes from Observables to prevent memory leaks.
- ⚖️ **Lightweight and Independent:** Zero dependencies, easily integrates into any project.
- ⚡️ **Dynamic Data Loading:** Supports loading data based on dynamic parameters.
- 🎮 **Control Over Data Loading:** Offers methods for reloading and canceling requests.

## Table of Contents

- [Demo](#demo)
- [Installation](#installation)
- [Usage](#usage)
  - [Basic usage](#basic-usage)
  - [Showing loading and error templates](#showing-loading-and-error-templates)
  - [Loading based on changes to other data](#loading-based-on-changes-to-other-data)
  - [Reloading](#reloading)
  - [Showing previously loaded data while reloading](#showing-previously-loaded-data-while-reloading)
- [Note on Microsyntax](#note-on-microsyntax)
- [API](#api)
  - [Inputs](#inputs)
  - [Outputs](#outputs)
  - [Methods](#methods)
- [License](#license)
- [Contributing](#contributing)
- [Credits](#credits)

## Demo

Check out these live examples of `NgxLoadWith` in action:

- ⚡️ [Basic Usage Example](https://stackblitz.com/edit/stackblitz-starters-ygxc6t?file=src%2Fmain.ts): Easily load data and show loading and error templates.
- ⚡️ [Advanced Usage Example](https://stackblitz.com/edit/angular-kkldgb-kldaa7?file=src%2Fapp%2Fapp.component.html): Load data based to changes in a searchbar.

## Installation

To install `NgxLoadWith`, run the following command:

```bash
npm install ngx-load-with
```

> Note: you need Angular version 16 or higher. For Angular 15, use `ngx-load-with@1`.

To use `NgxLoadWith`, import `NgxLoadWithDirective` in your Angular component:

```typescript
import { NgxLoadWithDirective } from "ngx-load-with";

@Component({
  selector: "app-my-component",
  templateUrl: "./my-component.component.html",
  standalone: true,
  imports: [NgxLoadWithDirective],
})
export class MyComponent {}
```

> Note: in projects using `NgModules`, `NgxLoadWithModule` can be imported in your Angular module.

## Usage

### Basic usage

Load data from an Observable and display it in your template:

⚡️ **[Live Example](https://stackblitz.com/edit/stackblitz-starters-hygzxn?file=src%2Fmain.ts)**

```angular
<ul *ngxLoadWith="todos$ as todos">
  @for (todo of todos; track todo.id) {
    <li>{{ todo.title }}</li>
  }
</ul>
```

```typescript
@Component({...})
export class MyComponent {
  todos$ = inject(HttpClient).get<Todo[]>('api/todos');
}
```

### Showing loading and error templates

Display a loading message while data is being loaded, and an error message if an error occurs:

⚡️ **[Live Example](https://stackblitz.com/edit/stackblitz-starters-ygxc6t?file=src%2Fmain.ts)**

```angular
<ul
  *ngxLoadWith="todos$ as todos; loadingTemplate: loading; errorTemplate: error"
>
  @for (todo of todos; track todo.id) {
    <li>{{ todo.title }}</li>
  }
</ul>
<ng-template #loading>Loading...</ng-template>
<ng-template #error let-error>{{ error.message }}</ng-template>
```

### Loading based on changes to other data

`NgxLoadWith` can respond to dynamic data changes if you pass it a function instead of a plain Observable. This function is invoked when the input arguments change.

**Example 1: Fetching data using route parameters:**

```angular
<div *ngxLoadWith="getTodo as todo; args: routeParams$ | async">
  {{ todo.title }}
</div>
```

```typescript
@Component({...})
export class MyComponent {
  routeParams$ = inject(ActivatedRoute).params;

  getTodo = ({id}) => this.http.get<Todo>('api/todos/' + id);

  private http = inject(HttpClient);
}
```

**Example 2: Searching data based on user input:**

```angular
<input ngModel #searchbox />
<ul *ngxLoadWith="findTodos as todos; args: searchbox.value; debounceTime: 300">
  @for (todo of todos; track todo.id) {
    <li>{{ todo.title }}</li>
  }
</ul>
```

```typescript
@Component({...})
export class MyComponent {
  findTodos = (keywords: string) => this.http.get<Todo[]>('api/todos', { params: { q: keywords} });

  private http = inject(HttpClient);
}
```

In these examples, `getTodo` and `findTodos` are functions that return Observables based on dynamic parameters. When these parameters change, `NgxLoadWith` automatically invokes the respective function with the updated parameters, effectively reloading the data.

### Reloading

Reload data when a button is clicked:

⚡️ **[Live Example](https://stackblitz.com/edit/stackblitz-starters-eknilk?file=src%2Fmain.ts)**

```angular
<button (click)="todosLoader.load()">Reload</button>

<ng-template #todosLoader="ngxLoadWith" [ngxLoadWith]="todos$" let-todos>
  <ul>
    @for (todo of todos; track todo.id) {
      <li>{{ todo.title }}</li>
    }
  </ul>
</ng-template>
```

> **Important:** If you plan to use the `NgxLoadWithDirective.load` method in your template, please note that you cannot use the `*ngxLoadWith` microsyntax. See [note on microsyntax](#note-on-microsyntax) for more details.

### Showing previously loaded data while reloading

Reload data when a button is clicked, but display stale data while the new data is being loaded:

⚡️ **[Live Example](https://stackblitz.com/edit/stackblitz-starters-vy9naj?file=src%2Fmain.ts)**

```angular
<button (click)="todosLoader.load()">Reload</button>

<ng-template
  #todosLoader="ngxLoadWith"
  [ngxLoadWith]="todos$"
  [ngxLoadWithStaleData]="true"
  let-todos
  let-loading="loading"
>
  @if (loading) {
    Reloading...
  }
  <ul>
    @for (todo of todos; track todo.id) {
      <li>{{ todo.title }}</li>
    }
  </ul>
</ng-template>
```

> **Important:** If you plan to use the `NgxLoadWithDirective.load` method in your template, please note that you cannot use the `*ngxLoadWith` microsyntax. See [note on microsyntax](#note-on-microsyntax) for more details.

## Note on Microsyntax

When using the `NgxLoadWithDirective`, you have two options for syntax:

1. **Microsyntax:** This shorter, more compact syntax is easy to read and sufficient for many common use cases. For example:

   ```angular
   <div *ngxLoadWith="getTodo as todo; args: id">...</div>
   ```

2. **Normal syntax:** The longer form syntax is necessary when you need to create a directive reference in your template or listen to output events emitted by the directive. For example:

   ```angular
   <ng-template
     #loader="ngxLoadWith"
     [ngxLoadWith]="getTodo"
     [ngxLoadWithArgs]="id"
     let-todo
   >
     <div>...</div>
   </ng-template>
   ```

   In this example, `#loader="ngxLoadWith"` creates a reference to the `NgxLoadWithDirective` instance, allowing you to call the `load()` method in your template:

   ```angular
   <button (click)="loader.load()">Reload</button>
   ```

   Additionally, using the normal syntax allows you to listen to output events:

   ```angular
   <ng-template
     #loader="ngxLoadWith"
     [ngxLoadWith]="getTodos"
     (loadSuccess)="onSuccess($event)"
     (loadError)="onError($event)"
     let-todos
   >
     <div>...</div>
   </ng-template>
   ```

## API

### Inputs

- `ngxLoadWith: (args?: any) => Observable<T> | Observable<T>`: A function returning an Observable of the data to be loaded, or a plain Observable.
- `args: unknown`: An argument to be passed to the `ngxLoadWith` function (if it's a function). Changes to this argument will trigger a reload.
- `loadingTemplate: TemplateRef<unknown>`: An optional template to be displayed while the data is being loaded.
- `errorTemplate: TemplateRef<ErrorTemplateContext>`: An optional template to be displayed when an error occurs while loading the data.
- `debounceTime: number`: The amount of time in milliseconds to debounce the load trigger.
- `staleData: boolean`: A boolean indicating whether to show previously loaded data while reloading.

### Outputs

- `loadStart: EventEmitter<void>`: Emits when the data loading process starts.
- `loadSuccess: EventEmitter<T>`: Emits when the data loading process is successful.
- `loadError: EventEmitter<Error>`: Emits when an error occurs while loading the data.
- `loadFinish: EventEmitter<void>`: Emits when the data loading process finishes, regardless of success or failure.
- `loadingStateChange: EventEmitter<LoadingState<T>>`: Emits when the loading state changes.

> **Important:** If you plan to listen to the above output events, please note that you cannot use the `*ngxLoadWith` microsyntax. See [note on microsyntax](#note-on-microsyntax) for more details on using the normal syntax.

### Methods

- `load()`: Triggers a reload of the data. Previous load requests are cancelled.
- `cancel()`: Cancels any pending load requests.
- `setData(data: T)`: Updates the loading state as if the passed data were loaded through the `ngxLoadWith` function.
- `setError(error: Error)`: Updates the loading state as if the passed error were thrown by the `ngxLoadWith` function.

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

## License

`NgxLoadWith` is licensed under the MIT License. See the [LICENSE](https://github.com/rensjaspers/ngx-load-with/blob/main/LICENSE) file for details.

## Contributing

Contributions are welcome! See the [CONTRIBUTING](https://github.com/rensjaspers/ngx-load-with/blob/main/CONTRIBUTING.md) file for details.

## Credits

This project is developed and managed by [Rens Jaspers](https://github.com/rensjaspers). It draws significant inspiration from [ngx-observe](https://github.com/nilsmehlhorn/ngx-observe) and [react-async](https://www.npmjs.com/package/react-async).
