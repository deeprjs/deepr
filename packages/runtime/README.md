# @deepr/runtime

Simple [Deepr](https://deepr.io) runtime.

## Installation

```
npm install @deepr/runtime
```

## Example

```js
import {invokeQuery} from '@deepr/runtime';

(async () => {
  // Given the following "root" object:
  const root = {
    async getMovie(id) {
      // Let's pretend we are reading a record from a database
      if (id === 'abc123') {
        return {
          title: 'Inception',
          year: 2010,
          actors: [
            {fullName: 'Leonardo DiCaprio', popularity: 90},
            {fullName: 'Joseph Gordon-Levitt', popularity: 70}
          ]
        };
      }
      throw new Error('Movie not found');
    }
  };

  // Invoking the following query:
  await invokeQuery(root, {
    'getMovie=>movie': {
      '()': ['abc123'],
      '=>': {
        title: true,
        actors: {'[]': [], 'fullName': true}
      }
    }
  });

  // Will return:
  // {
  //   movie: {
  //     title: 'Inception',
  //     actors: [{fullName: 'Leonardo DiCaprio'}, {fullName: 'Joseph Gordon-Levitt'}]
  //   }
  // }
})();
```

## API

### `invokeQuery(root, query, [options]) => result`

Invoke the specified `query` on `root`, and return the result of the invocation. If a promise is encountered during the execution, then a promise that resolves with the result is returned.

Example:

```js
const result = await invokeQuery(root, {
  movies: {
    '[]': [],
    'title': true,
    'year': true
  }
});
```

#### `root`

An object from which the `query` will be evaluated.

Example:

```json
{
  "movies": [
    {
      "title": "Inception",
      "year": 2010
    },
    {
      "title": "The Matrix",
      "year": 1999
    }
  ]
}
```

#### `query`

A Deepr query.

Example:

```json
{
  "movies": {
    "[]": [],
    "title": true,
    "year": true
  }
}
```

Learn more about Deepr queries here: [https://github.com/deeprjs/deepr](https://github.com/deeprjs/deepr).

#### `options`

An optional object of options.

##### `context`

A context that will be passed as the last parameter to all invoked methods.

##### `ignoreKeys`

A key or an array of keys to be ignored when executing the query. A key can be specified as a string or a [RegExp](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions).

Examples:

- Using the string `'password'` will ignore every key named `'password'`.
- Using the RegExp `/^_/` will ignore every key starting with an underscore.

##### `acceptKeys`

A key or an array of keys to be accepted regardless if they are ignored using the `ignoreKeys` option. A key can be specified as a string or a [RegExp](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions).

Example:

- Specifying the string `'_id'` will accept this key even if the `ignoreKeys` option includes the RegExp `/^_/`.

##### `ignoreBuiltInKeys` _(default: `true`)_

If `true` (the default), all JavaScript built-in keys will be ignored. This includes object and function built-in keys such as `constructor`, `prototype`, `apply`, `caller`, `__proto__`, `hasOwnProperty`, etc. Even if they are built-in, the keys `name` and `length` are considered safe, and therefore accepted.

For obvious security reasons, it is strongly discouraged to disable this option.

##### `authorizer(key, operation) => boolean`

A function that is called for each key to authorize any operation.

The function receives a `key` and an `operation` which can be either `'get'` for reading an attribute or `'call'` for invoking a method.

The function must return `true` to authorize an operation. If `false` is returned, the evaluation of the query stops immediately, and an error is thrown.

The function can be either synchronous or asynchronous (using `async` or returning a promise).

Finally, the value of `this` in the function is the current node of the query being evaluated.

Example:

```js
function authorizer(key, operation) {
  if (key === 'title' && operation === 'get') {
    return true; // Authorize getting the 'title' attribute
  }
  if (key === 'get' && operation === 'call') {
    return true; // Authorize invoking the get() method
  }
  return false; // Decline everything else
}
```

##### `errorHandler(error) => value`

A function that is called when an error is encountered while invoking the query.

If the function throws an error (the received `error` or any other error), the invocation of the query is stopped and the responsibility for catching the thrown error is transferred to the caller of `invokeQuery()`.

If the function returns a `value`, the invocation of the query is stopped and the `value` is injected into the result of the query without failing the execution of `invokeQuery()`.

The value of `this` in the function is the current node of the query being evaluated.

Example:

```js
function errorHandler(error) {
  return error; // Inject the error into the result of the query
}
```

## Contribute

This project uses [Run](https://run.tools) to manage the development environment.

Build the transpiled files:

```
run . @build
```

Run the test suite:

```
run . @test
```

Run the example:

```
node ./packages/runtime/example
```

## License

MIT
