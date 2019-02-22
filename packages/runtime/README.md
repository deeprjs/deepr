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

### `invokeQuery(root, query, [context])`

Invoke the specified `query` on `root` and return a promise that resolves with the result.

#### Example

```js
const result = await invokeQuery(root, {
  movie: {
    title: true,
    year: true
  }
});
```

#### Parameters

##### `root`

An object from which the `query` will be evaluated.

##### `query`

A Deepr query.

Learn more about Deepr queries here: [https://github.com/medmain/deepr](https://github.com/medmain/deepr).

##### `context`

An optional context that will be passed as a second parameter to all invoked methods.

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

## License

MIT
