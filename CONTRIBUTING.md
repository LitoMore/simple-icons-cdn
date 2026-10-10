# Contributing to Simple Icons CDN

## Ways you can help

### Financial contributions

- [GitHub Sponsor](https://github.com/sponsors/LitoMore)
- [PayPal](https://paypal.me/LitoMore)

## Coding guidelines

### Node.js

This project requires Node.js 24.11.0 or later. Install dependencies with `npm ci`.
Node.js runs the TypeScript source files directly; `npm run check` checks types without generating JavaScript files.

### Tests

When adding or changing features please write tests. We use Node.js's built-in [`node:test`](https://nodejs.org/api/test.html) runner and `node:assert/strict` assertions.

Run `npm test` to run all unit and HTTP integration tests. Use `npm run check` to check types and `npm run lint` to check code style with XO.

### Coverage

Line and function coverage must remain at 100%. Use `npm run test:coverage` to generate a coverage report and enforce these thresholds with Node.js's built-in test runner.

### Development

Use `npm run dev` to start a development server with file watching, or `npm run serve` to start it normally. The server listens on `0.0.0.0:8000` by default; set `PORT` to use another port.
