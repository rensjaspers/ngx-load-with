# ngx-load-with

The `ngx-load-with` directive is an Angular directive that simplifies the process of displaying loading and error states for asynchronous operations in your Angular application.

## Installation

To install `ngx-load-with`, run the following command:

```bash
npm install ngx-load-with
```

## Usage

To use `ngx-load-with`, import the `NgxLoadWithModule` module in your Angular module:

```typescript
import { NgxLoadWithModule } from "ngx-load-with";

@NgModule({
  imports: [NgxLoadWithModule],
  declarations: [MyComponent],
})
export class MyModule {}
```

Then, use the `ngxLoadWith` directive in your component's template:

```html
<div *ngxLoadWith="myLoadFn as data; loadingTemplate: loading; errorTemplate: error">{{ data }}</div>

<ng-template #loading>Loading...</ng-template>
<ng-template #error let-error>{{ error.message }}</ng-template>
```

In the example above, `myLoadFn` is a function that returns an observable that emits the data you want to display. The `loadingTemplate` and `errorTemplate` are optional templates that will be displayed while the observable is loading or if an error occurs.

## API

### ngxLoadWith directive

The `ngxLoadWith` directive has the following inputs:

- `ngxLoadWith`: The function that returns the observable that emits the data you want to display.
- `args`: The arguments to pass to the `ngxLoadWith` function.
- `loadingTemplate`: The template to display while the observable is loading.
- `errorTemplate`: The template to display if an error occurs.
- `debounceTime`: The number of milliseconds to debounce the reload trigger. Defaults to `0`.
- `staleData`: A boolean indicating whether to display stale data while the observable is loading. Defaults to `false`.
- `reloadOnChanges`: A boolean indicating whether to reload the observable when the inputs change. Defaults to `true`.

### LoadedTemplateContext interface

The `LoadedTemplateContext` interface has the following properties:

- `$implicit`: The data emitted by the observable.
- `reloading`: A boolean indicating whether the observable is currently loading.
- `debouncing`: A boolean indicating whether the reload trigger is currently debouncing.

### LoadingTemplateContext interface

The `LoadingTemplateContext` interface has the following properties:

- `debouncing`: A boolean indicating whether the reload trigger is currently debouncing.

### ErrorTemplateContext interface

The `ErrorTemplateContext` interface has the following properties:

- `$implicit`: The error emitted by the observable.
- `retry`: A function that can be called to retry the observable.

## License

`ngx-load-with` is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Contributing

Contributions are welcome! See the [CONTRIBUTING](CONTRIBUTING.md) file for details.

## Credits

This project is developed and managed by [Rens Jaspers](https://github.com/rensjaspers). It draws significant inspiration from [ngx-observe](https://github.com/nilsmehlhorn/ngx-observe). The directive forms the foundation of the [ngx-data-loader](https://github.com/rensjaspers/ngx-data-loader) component, offering essential functionality.
