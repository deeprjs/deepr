# @deepr/runtime

Simple [Deepr](https://github.com/medmain/deepr) runtime.

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
    movie({id}) {
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
    movie: {
      '()': {id: 'abc123'},
      '=>': {
        title: true,
        actors: [{fullName: true}]
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

### `invokeQuery(root, query, [options])`

Invoke the specified `query` on `root` and return a promise that resolves with the result.

Example:

```js
const result = await invokeQuery(root, {
  movies: [
    {
      title: true,
      year: true
    }
  ]
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
  "movies": [
    {
      "title": true,
      "year": true
    }
  ]
}
```

Learn more about Deepr queries here: [https://github.com/medmain/deepr](https://github.com/medmain/deepr).

#### `options`

An optional object of options.

##### `context`

A context that will be passed as a second parameter to all invoked methods.

##### `ignoreKeys`

A key or an array of keys to be ignored when executing the query. A key can be specified as a string or a [RegExp](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions).

Examples:

- Using the string `'password'` will ignore every key named `'password'`.
- Using the RegExp `/^_/` will ignore every key starting with an underscore.

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
