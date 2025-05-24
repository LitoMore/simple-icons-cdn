# Contributing to Simple Icons CDN

## Ways you can help

### Financial contributions

- [GitHub Sponsor](https://github.com/sponsors/LitoMore)
- [PayPal](https://paypal.me/LitoMore)

## Coding guidelines

### Deno

This project written in Deno. You can get Deno from [deno.com](https://deno.com).
We usually use the latest version of Deno for development, so please feel free to install the latest version.

### Tests

When adding or changing features please write tests. We're using Deno's built-in [`Deno.test()`](https://docs.deno.com/runtime/fundamentals/testing/) utilities for testing.

You can use `deno test` to run unit tests. And use `deno task test` to test all code formats, linting, types, and unit tests.

### Coverage

We require code coverage to be 100% all the time. You can use `deno task test` to generate a coverage report in HTML.

### Development

Use `deno task dev` to start a development server, watching for changes and running on a specific port.
