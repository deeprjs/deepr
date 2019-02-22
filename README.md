# Deepr

A specification for invoking remote methods, deeply!

## Why?

[GraphQL](https://graphql.org/) introduced a powerful idea — the ability to invoke multiple methods in a single call, and more importantly, the ability to invoke methods based on the results of other methods. However, we feel that the design of GraphQL is not quite right. Some crucial points are missing and some features should be removed or implemented at different layers of the stack.

First of all, with GraphQL it is not possible to invoke methods on collections. When we specify a query for a collection, it is executed on the elements of the collection, but not on the collection itself. It would be nice if we could access the collection and its elements separately. For example, depending on the schema, this query might not return the expected result:

```graphql
{
  movies(genre: "comedy") {
    count
  }
}
```

To make it work, it is necessary to introduce some additional models, as Relay does with the [Connections](https://facebook.github.io/relay/graphql/connections.htm). We think that such a solution adds complexity and confusion.

Another issue is the GraphQL execution model. Having queries executed in parallel seems like a good idea at first, but it has unfortunate consequences for the developer experience. Since the execution order of nested mutations is unpredictable, it is [not recommended](https://github.com/graphql/graphql-js/issues/221#issuecomment-157481861) to do something like this:

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

Parallelizing the execution of the requests is an optimization matter, and we believe it would be better if it is addressed at another layer of the stack.

Then, there is the way the execution is handled. With GraphQL, it is required to implement resolvers for each operation. This resolver layer seems a little cumbersome to us. When the business layer is implemented in an object-oriented way, why not just directly invoke the methods of the objects? Some would say it is good practice to add an API layer on top of the business layer. Well, we can agree with that. But in any case, we believe that the query execution should not require an additional layer. If some developers want to add an API layer, it is up to them to do so.

Another point is the type system. Providing schemas and types is certainly an important feature, but we believe it should not be included in the core specifications. A fine type system (such as those provided by TypeScript or Flow) should be optional and implemented orthogonally as an extension. Or even better, if types are specified deeper in the backend stack (i.e., in the business layer), an additional type system may not be necessary.

Finally, let's question the very nature of GraphQL: the fact that it is a language. Do we really need another language, though? The GraphQL language makes queries prettier, but is it worth it? Adding a new language to the stack is no small matter, as it merely adds complexity when connecting it to an actual programming language — both on the frontend and backend sides.

We love the main idea behind GraphQL, especially the ability to compose method calls, but we think there may be a better way to achieve this goal. That is why we wrote Deepr.

## Guide

Deepr does not specify the use of a particular language. So, although the following examples are written in JSON, keep in mind that any language could be used.

> Note: To fully appreciate this guide, it is recommended to have a minimum knowledge of [GraphQL](https://graphql.org/).

### Simple queries

Let's start with a simple query:

```json
{
  "movie": {
    "title": true,
    "year": true
  }
}
```

Here we are invoking a method called `movie` in the top-level context (the "root").

Then, inside the context of `movie`, we are calling `title` and `year` attributes.

The response will be:

```json
{
  "movie": {
    "title": "Inception",
    "year": 2010
  }
}
```

So far, it looks like GraphQL. Since we are using JSON objects, the only significant difference is that we must specify a value for the keys `title` and `year`. Specifying `true` means that we want to return or invoke the corresponding field or method.

Instead of querying a single movie, let's query a collection of movies:

```json
{
  "movies": {
    "count": true
  }
}
```

Nothing surprising here, we are just executing the `count` method on the `movies` collection. The query will return:

```json
{
  "movies": {
    "count": 2
  }
}
```

Now, you might ask yourself, how can I reach the elements of the `movies` collection? That is easy:

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

By embedding the query object in an array, we specify that the context of the query is the **elements** of the collection rather than the collection itself. As expected, we get the following response:

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

Now, let's see how to query both a collection and its elements:

```json
{
  "movies": {
    "count": true,
    "=>items": [
      {
        "title": true,
        "year": true
      }
    ]
  }
}
```

Using the key `"=>items"` means that we take the current context (the collection of movies) and we put it under a new key called `items`. As a result, we get the following:

```json
{
  "movies": {
    "count": 2,
    "items": [
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
}
```

### Parameters

When executing a method, it is often useful to pass some parameters. Here is how you can do that:

```json
{
  "movies": {
    "()": {"filter": {"year": 2010}, "limit": 1},
    "=>": [
      {
        "title": true
      }
    ]
  }
}
```

The `()` key allows passing parameters to the `movies` method, and the arrow symbol `=>` is used to specify what to do with the result of the execution.

As before, we are using the array bracket `[]` to process the collection's elements.

We get the following result:

```json
{
  "movies": [
    {
      "title": "Inception"
    }
  ]
}
```

### Keys

We have seen previously some examples involving the arrow symbol `=>`; let's now go into the details of this powerful feature.

Object keys are made of two parts, a "source" and a "target", separated by the arrow symbol `=>`.

- The "source" is the method or the field name, evaluated in the current context.
- The "target" is the place where to put the result of the evaluation in the response.

Source, target, or both can be omitted, producing slightly different results. Let's check the five possible variants.

#### `"key"` variant

If there is no arrow symbol it means that source and target are the same.
This is the most frequent use-case, when the response structure mirrors exactly the query structure.

```json
{
  "movie": {
    "title": true
  }
}
```

> Note: The key `title` could be expressed by `title=>title`; it would work too.

Not surprisingly, this will return something like this:

```json
{
  "movie": {
    "title": "Inception"
  }
}
```

#### `"sourceKey=>targetKey"` variant

If source and target are different, the result of the evaluation of `sourceKey` will appear under a key called `targetKey` in the response.

For example `createdAt=>date` key means the `createdAt` field (or method) result will appear under a key called `date` in the response.

You can think about it as a way to create aliases, similarly to the GraphQL's [aliasing feature](https://graphql.org/learn/queries/#aliases).

By using aliases, it is possible to execute a method more than once with different parameters, avoiding name collisions inside the result.

For example, in the following query, we first call the `movies` method and assign the result to `actionMovies`, then we call the same `movies` method, with different parameters, and assign the result to `dramaMovies`.

```json
{
  "movies=>actionMovies": {
    "()": {"filter": {"genre": "action"}},
    "=>": [
      {
        "title": true
      }
    ]
  },
  "movies=>dramaMovies": {
    "()": {"filter": {"genre": "drama"}},
    "=>": [
      {
        "title": true
      }
    ]
  }
}
```

Doing this we get both `actionMovies` and `dramaMovies` results in the response, like this:

```json
{
  "actionMovies": [
    {
      "title": "Inception"
    },
    {
      "title": "The Matrix"
    }
  ],
  "dramaMovies": [
    {
      "title": "Forrest Gump"
    }
  ]
}
```

#### `"=>targetKey"` variant

If the source is omitted, it means the current context will be re-used in the response as it is, without any processing.

For example, in the following query, `=>items` means we take the current context and put it inside an object whose key is `items`. Basically, we are nesting the current context one level deeper, under a new key.

```json
{
  "movies": {
    "count": true,
    "=>items": [
      {
        "title": true
      }
    ]
  }
}
```

Doing this, we can query both a collection and its elements to produce results such as:

```json
{
  "movies": {
    "count": 2,
    "items": [
      {
        "title": "Inception"
      },
      {
        "title": "The Matrix"
      }
    ]
  }
}
```

#### `"sourceKey=>"` variant

If the target is omitted, it means that the evaluation of a method (or field) does not generate a new object.

For example, if we are only interested in the title of the movie we found, we can do this:

```json
{
  "movie": {
    "title=>": true
  }
}
```

Because we use the key `"title=>"` instead of `"title"`, the key `title` is absent from the response:

```json
{
  "movie": "Inception"
}
```

#### `"=>"` variant

Lastly, we can remove both the source and the target from the key expression, leaving alone the arrow symbol `=>`.

In this case, we do not process the current context (no source) and we are not creating new keys in the response (no target).

The `=>` can be interpreted as a way to introduce the result of a function call.

In the following query, we retrieve a movie by its `id`, and we return `title` and `year` attributes in the response.

```json
{
  "movie": {
    "()": {"id": "cjrts72gy00ik01rv6eins4se"},
    "=>": {"title": true, "year": true}
  }
}
```

Note that the following query is exactly the same:

```json
{
  "movie": {
    "()": {"id": "cjrts72gy00ik01rv6eins4se"},
    "title": true,
    "year": true
  }
}
```

Both queries will produce the following response:

```json
{
  "movie": {
    "title": "Inception",
    "year": 2010
  }
}
```

This feature is particularly useful to access the elements of a collection. For example:

```json
{
  "movies": {
    "()": {"filter": {"country": "USA"}},
    "=>": [
      {
        "title": true
      }
    ]
  }
}
```

will output:

```json
{
  "movies": [{"title": "Inception"}, {"title": "The Matrix"}, {"title": "Forest Gump"}]
}
```

### Values

Query objects are evaluated in a recursive way, and for every key the related value can be either:

- the boolean `true`
- an object
- an array

Let's see how Deepr handles these three types of values.

#### Boolean `true`

The boolean `true` means the result of the method or the field will be included as is in the response.

If we query a single movie this way:

```json
{
  "movie": {
    "title": true,
    "year": true
  }
}
```

We get the following result:

```json
{
  "movie": {
    "title": "Inception",
    "year": 2010
  }
}
```

#### Object

When the value is an object, the execution continues recursively:

```json
{
  "movie": {
    "director": {
      "name": true
    }
  }
}
```

As expected, this will produce:

```json
{
  "movie": {
    "director": {
      "name": "Georges Lucas"
    }
  }
}
```

#### Array

Finally, by embedding an object into an array, we can access the elements of a collection. For example:

```json
{
  "movies": [{"title": true}]
}
```

will return:

```json
{
  "movies": [{"title": "Inception"}, {"title": "The Matrix"}, {"title": "Forest Gump"}]
}
```

### Fault-tolerant queries

If you add an exclamation mark (`?`) after the name of a key, then no error will be thrown in case a field or a method is missing during the execution of a query.

For example, the following query will succeed even if the movie has no director:

```json
{
  "movie": {
    "title": true,
    "director?": {
      "fullName": true
    }
  }
}
```

Rather than throwing an error, this will just return:

```json
{
  "movie": {
    "title": "Inception"
  }
}
```

### Chained queries

Now, let's put into practice what we have just seen to compose a more complex query:

```json
{
  "movies": {
    "filter=>": {
      "()": {"country": "USA"},
      "sort=>": {
        "()": {"by": "year"},
        "skip=>": {
          "()": 5,
          "limit=>": {
            "()": 10,
            "=>": [
              {
                "title": true,
                "year": true
              }
            ]
          }
        }
      }
    }
  }
}
```

Despite the fact that we have nested several method calls, this will just return:

```json
{
  "movies": [
    {
      "title": "The Matrix",
      "year": 1999
    },
    {
      "title": "Inception",
      "year": 2010
    }
  ]
}
```

### Mutations

So far we have invoked methods that read data without producing any side effects on the server. Let's fix that by executing some simple CRUD operations.

#### Create

Here is how we could create a record:

```json
{
  "movies=>": {
    "create=>movie": {
      "()": {"title": "Avatar", "country": "USA"},
      "=>": {"id": true}
    }
  }
}
```

Unlike GraphQL, Deepr does not differentiate queries and mutations. So, performing a mutation is just a matter of calling a method.

The query above will return:

```json
{
  "movie": {
    "id": "cjrts72gy00ik01rv6eins4se"
  }
}
```

#### Read

Now that we have added a movie, let's retrieve it:

```json
{
  "movie": {
    "()": {"id": "cjrts72gy00ik01rv6eins4se"},
    "=>": {"id": true, "title": true, "country": true}
  }
}
```

This will return:

```json
{
  "movie": {"id": "cjrts72gy00ik01rv6eins4se", "title": "Avatar", "country": "USA"}
}
```

#### Update

To modify a record, we can do this with:

```json
{
  "movie": {
    "()": {"id": "cjrts72gy00ik01rv6eins4se"},
    "update=>": {
      "()": {"rating": 8.1},
      "=>": {"id": true}
    }
  }
}
```

Note how we use the key `"update=>"` instead of `"update"` to avoid creating an unnecessary `"update"` key in the response:

```json
{
  "movie": {
    "id": "cjrts72gy00ik01rv6eins4se"
  }
}
```

#### Delete

Finally, here is how we can delete a record:

```json
{
  "movie": {
    "()": {"id": "cjrts72gy00ik01rv6eins4se"},
    "delete=>": {"id": true}
  }
}
```

This will produce the following result:

```json
{
  "movie": {
    "id": "cjrts72gy00ik01rv6eins4se"
  }
}
```

### Relations

This guide would not be complete without mentioning another important feature: the ability to query relationships between collections.
It is actually pretty straightforward. Here is how we can fetch some movies with their related actors:

```json
{
  "movies": {
    "()": {"filter": {"country": "USA"}},
    "=>": [
      {
        "title": true,
        "year": true,
        "actors": {
          "()": {"sort": {"by": "popularity"}, "limit": 2},
          "=>": [
            {
              "fullName": true,
              "photoURL": true
            }
          ]
        }
      }
    ]
  }
}
```

This will return:

```json
{
  "movies": [
    {
      "title": "Inception",
      "year": 2010,
      "actors": [
        {
          "fullName": "Leonardo DiCaprio",
          "photoURL": "https://www.imdb.com/name/nm0000138/mediaviewer/rm487490304"
        },
        {
          "fullName": "Joseph Gordon-Levitt",
          "photoURL": "https://www.imdb.com/name/nm0330687/mediaviewer/rm1175888384"
        }
      ]
    },
    {
      "title": "The Matrix",
      "year": 1999,
      "actors": [
        {
          "fullName": "Keanu Reeves",
          "photoURL": "https://www.imdb.com/name/nm0000206/mediaviewer/rm3751520256"
        },
        {
          "fullName": "Laurence Fishburne",
          "photoURL": "https://www.imdb.com/name/nm0000401/mediaviewer/rm1925683200"
        }
      ]
    }
  ]
}
```

### Subscriptions

We do not believe that subscriptions should be included in the core specifications of Deepr. We acknowledge it is an important feature, though, and it might be added later in the form of an extension.

## Implementation

TODO

## Specifications

Although pretty stable, Deepr is a work in progress, and formal specifications still have to written.

## License

MIT
