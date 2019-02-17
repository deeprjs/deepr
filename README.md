# Deepr

A specification for invoking remote methods, deeply!

## Why

[GraphQL](https://graphql.org/) brought a powerful idea — the ability to invoke multiple methods in a single call, and more importantly, the ability to invoke methods based on the result of other methods. However, we feel that the design of GraphQL is not quite right. Some crucial features should are missing and some features should be moved to another layer of the stack.

With GraphQL, it is not possible to invoke methods on collections. When we specify a query for a collection, it is executed on the elements of the collection, and not on the collection itself. It would be nice if we could differentiate the two contexts. For example, depending on the schema, this query might not return the expected result:

```graphql
{
  movies(genre: "comedy") {
    count
  }
}
```

To make it works, it is necessary to introduce some additional models, as Relay does with the [Connections](https://facebook.github.io/relay/graphql/connections.htm). We think that such a solution brings complexity and confusion.

Another issue is the GraphQL execution model. Having queries executed in parallel seems like a good idea at first, but it has unfortunate consequences on the developer experience. Since the execution order of nested mutations is unpredictable, it is [not recommended](https://github.com/graphql/graphql-js/issues/221#issuecomment-157481861) to do something like this:

```graphql
{
  movie(id: 123) {
    update(changes: {rating: 8.3})
  }
  allMovies {
    averageRate
  }
}
```

Parallelizing the execution of the requests is an optimization matter, and we believe it should better be addressed at another layer of the backend stack.

Another point is the type system. Providing schemas and types is certainly an important feature, but we believe it should not be included in the core of the language. A fine type system (such as those provided by TypeScript or Flow) should be optional and implemented orthogonally as an extension. Or even better, if types are specified deeper in the backend stack (i.e., in the business layer), an additional type system may not be necessary.

Finally, let's question the very nature of GraphQL: the language. Indeed, do we need another language? The GraphQL language makes queries prettier, but is it worth it? Adding a new language to the stack is no small matter, it brings a whole new world that must be connected — both on the client and server sides — to an actual programming language. As a result, everything gets more complicated.

All this leads us to think that GraphQL is not a valid solution. We love the main idea though. The ability to compose method calls is fantastic. So we wrote the minimum viable specifications to do precisely that.

## Guide

Deepr does not specify the use of a particular language. So, although the following examples are written in JavaScript, keep in mind that they could be written in any language.

> Note: To fully appreciate this guide, it is recommended to have a minimum knowledge of [GraphQL](https://graphql.org/).

### Simple queries

Let's start with a simple query:

```js
// Request:
({
  movie: {
    title: true,
    year: true
  }
});

// Response:
({
  movie: {
    title: 'Inception',
    year: 2010
  }
});
```

So far, it looks like GraphQL. The only significant difference is, since we use JavaScript objects, we must specify values for the keys `title` and `year`. Specifying `true` as value means that we want to return or invoke the corresponding field or method.

Here is another simple query:

```js
// Request:
({
  movies: {
    count: true
  }
});

// Response:
({
  movies: {
    count: 2
  }
});
```

Nothing surprising here, we're just executing the `count` method on the `movies` collection.

Now, you might ask yourself, how to reach the elements of the `movies` collection? That's easy:

```js
// Request:
({
  movies: [
    {
      title: true,
      year: true
    }
  ]
});

// Response:
({
  movies: [
    {
      title: 'Inception',
      year: 2010
    },
    {
      title: 'The Matrix',
      year: 1999
    }
  ]
});
```

By embedding a query in an array, we specify that the context of the query is the elements of the collection rather than the collection itself.

Now, let's see how to query both a collection and its elements:

```js
// Request:
({
  movies: {
    count: true,
    '$this:items': [
      {
        title: true,
        year: true
      }
    ]
  }
});

// Response:
({
  movies: {
    count: 2,
    items: [
      {
        title: 'Inception',
        year: 2010
      },
      {
        title: 'The Matrix',
        year: 1999
      }
    ]
  }
});
```

Here the trick was to use `$this` which is a built-in method that returns the current context, and `:` which allows you to define an _alias_ named `items`.

### Parameters

When executing a method, it is often useful to pass some parameters. Here's how it works:

```js
// Request:
({
  movies: {
    $params: {filter: {year: 2010}},
    $return: [
      {
        title: true
      }
    ]
  }
});

// Response:
({
  movies: [
    {
      title: 'Inception'
    }
  ]
});
```

The reserved key `$params` allows to pass parameters to a method and `$return` provides a way to specify what to do with the result.

By using _aliases_, it is possible to execute a method several times with different parameters:

```js
// Request:
({
  'movies:actionMovies': {
    $params: {filter: {genre: 'action'}},
    $return: [
      {
        title: true
      }
    ]
  },
  'movies:dramaMovies': {
    $params: {filter: {genre: 'drama'}},
    $return: [
      {
        title: true
      }
    ]
  }
});

// Response:
({
  actionMovies: [
    {
      title: 'Inception'
    },
    {
      title: 'The Matrix'
    }
  ],
  dramaMovies: [
    {
      title: 'Forrest Gump'
    }
  ]
});
```

### Chained queries

Now, let's compose a more complicated query involving several chained methods:

```js
// Request:
({
  movies: {
    filter: {
      $params: {country: 'USA'},
      $return: {
        sort: {
          $params: {by: 'year'},
          $return: {
            skip: {
              $params: 5,
              limit: {
                $params: 10,
                $return: [
                  {
                    title: true,
                    year: true
                  }
                ]
              }
            }
          }
        }
      }
    }
  }
});

// Response:
({
  movies: {
    filter: {
      sort: {
        skip: {
          limit: [
            {
              title: 'The Matrix',
              year: 1999
            },
            {
              title: 'Inception',
              year: 2010
            }
          ]
        }
      }
    }
  }
});
```

It works. Doing so allows to chain several methods, but it is not very pretty. Fortunately, there is the reserved key `$invoke` which simplifies this type of query:

```js
// Request:
({
  movies: {
    $invoke: [{filter: {country: 'USA'}}, {sort: {by: 'year'}}, {skip: 5}, {limit: 10}],
    $return: [
      {
        title: true,
        year: true
      }
    ]
  }
});

// Response:
({
  movies: [{title: 'The Matrix', year: 1999}, {title: 'Inception', year: 2010}]
});
```

`$invoke` provides a simple way to chain the execution of several methods while improving the readability of the results. Note that in this case `$params` is not used to pass parameters. Parameters can simply be specified as values of the method keys.

`$invoke` can also be used to invoke a single method. This is handy for performing an operation without altering the shape of the response:

```js
// Request:
({
  movies: {
    $invoke: 'reverse',
    $return: [
      {
        title: true,
        year: true
      }
    ]
  }
});

// Response:
({
  movies: [{title: 'Inception', year: 2010}, {title: 'The Matrix', year: 1999}]
});
```

### Mutations

So far, we have invoked methods that only read data and don't produce any side effects on the server. Let's see now how to execute some simple CRUD operations.

#### Create

Here is how we could create a record:

```js
// Request:
({
  movies: {
    create: {
      $params: {title: 'Avatar', country: 'USA'},
      $return: {id: true}
    }
  }
});

// Response:
({
  movies: {
    create: {
      id: 'cjrts72gy00ik01rv6eins4se'
    }
  }
});
```

Unlike GraphQL, Deepr does not differentiate queries and mutations. So, performing a mutation is just a matter of calling the right method.

#### Read

Now that we have added a record, let's fetch it:

```js
// Request:
({
  movie: {
    $params: {id: 'cjrts72gy00ik01rv6eins4se'},
    $return: {id: true, title: true, country: true}
  }
});

// Response:
({
  movie: {
    id: 'cjrts72gy00ik01rv6eins4se',
    title: 'Avatar',
    country: 'USA'
  }
});
```

#### Update

To modify a record, we could do so:

```js
// Request:
({
  movie: {
    $params: {id: 'cjrts72gy00ik01rv6eins4se'},
    $return: {
      update: {
        $params: {rating: 8.1},
        $return: {id: true}
      }
    }
  }
});

// Response:
({
  movie: {
    update: {
      id: 'cjrts72gy00ik01rv6eins4se'
    }
  }
});
```

#### Delete

Finally, here is how we could delete a record:

```js
// Request:
({
  movie: {
    $params: {id: 'cjrts72gy00ik01rv6eins4se'},
    $return: {
      delete: {
        id: true,
        hasBeenDeleted: true
      }
    }
  }
});

// Response:
({
  movie: {
    delete: {
      id: 'cjrts72gy00ik01rv6eins4se',
      hasBeenDeleted: true
    }
  }
});
```

### Relations

This guide would not be complete without mentioning another important feature supported by Deepr: the ability to query relationships between collections.

It's actually pretty straightforward. Here's how we could fetch some movies with their related actors:

```js
// Request:
({
  movies: {
    $params: {filter: {country: 'USA'}},
    $return: {
      title: true,
      year: true,
      actors: {
        $params: {sort: {by: 'popularity'}, limit: 2},
        $return: [
          {
            fullName: true,
            photoURL: true
          }
        ]
      }
    }
  }
});

// Response:
({
  movies: [
    {
      title: 'Inception',
      year: 2010,
      actors: [
        {
          fullName: 'Leonardo DiCaprio',
          photoURL: 'https://www.imdb.com/name/nm0000138/mediaviewer/rm487490304'
        },
        {
          fullName: 'Joseph Gordon-Levitt',
          photoURL: 'https://www.imdb.com/name/nm0330687/mediaviewer/rm1175888384'
        }
      ]
    },
    {
      title: 'The Matrix',
      year: 1999,
      actors: [
        {
          fullName: 'Keanu Reeves',
          photoURL: 'https://www.imdb.com/name/nm0000206/mediaviewer/rm3751520256'
        },
        {
          fullName: 'Laurence Fishburne',
          photoURL: 'https://www.imdb.com/name/nm0000401/mediaviewer/rm1925683200'
        }
      ]
    }
  ]
});
```

### Subscriptions

We don't beleive that subscriptions should be included in the core specifications of Deepr. We acknowledge it is an important feature though, and it might come later as an extension.

## Implementation

TODO

## Specifications

Deepr is still a work in progress and proper specifications will come later.

## License

MIT
