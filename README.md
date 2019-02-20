# Deepr

A specification for invoking remote methods, deeply!

## Why?

[GraphQL](https://graphql.org/) brought a powerful idea — the ability to invoke multiple methods in a single call, and more importantly, the ability to invoke methods based on the result of other methods. However, we feel that the design of GraphQL is not quite right. Some crucial features are missing and some features should be removed or implemented at another layer of the stack.

First of all, with GraphQL, it is not possible to invoke methods on collections. When we specify a query for a collection, it is executed on the elements of the collection, and not on the collection itself. It would be nice if we could access the two contexts separately. For example, depending on the schema, this query might not return the expected result:

```graphql
{
  movies(genre: "comedy") {
    count
  }
}
```

To make it work, it is necessary to introduce some additional models, as Relay does with the [Connections](https://facebook.github.io/relay/graphql/connections.htm). We think that such a solution brings complexity and confusion.

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

Parallelizing the execution of the requests is an optimization matter, and we believe it should better be addressed at another layer of the stack.

Then, there is the way the execution is handled. With GraphQL, it is required to implement resolvers for each operation. This resolver layer seems a little cumbersome to us. When the business layer is implemented in an object-oriented way, why not just directly invoke the methods of the objects? Some would say it is good practice to add an API layer on top of the business layer. Well, it's debatable, but in any case, we believe that the query execution should not require an additional layer. If the developers want to add an API layer, it's up to them to do so.

Another point is the type system. Providing schemas and types is certainly an important feature, but we believe it should not be included in the core of the language. A fine type system (such as those provided by TypeScript or Flow) should be optional and implemented orthogonally as an extension. Or even better, if types are specified deeper in the backend stack (i.e., in the business layer), an additional type system may not be necessary.

Finally, let's question the very nature of GraphQL: the language. Indeed, do we need another language? The GraphQL language makes queries prettier, but is it worth it? Adding a new language to the stack is no small matter, it brings a whole new world that must be connected — both on the client and server sides — to an actual programming language. As a result, everything gets more complicated.

All this leads us to think that GraphQL is not a valid solution. We love the main idea though. The ability to compose method calls is fantastic. So we wrote the minimum viable specifications to do precisely that.

## Guide

Deepr does not specify the use of a particular language. So, although the following examples are written in JSON, keep in mind that they could be written in any language.

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

So far, it looks like GraphQL. The only significant difference is, since we use JSON objects, we must specify a value for the keys `title` and `year`. Specifying `true` means that we want to return or invoke the corresponding field or method.

Instead of querying a single movie, let's query a collection of movies:

```json
{
  "movies": {
    "count": true
  }
}
```

Nothing surprising here, we're just executing the `count` method on the `movies` collection. It will return:

```json
{
  "movies": {
    "count": 2
  }
}
```

Now, you might ask yourself, how to reach the elements of the `movies` collection? That's easy:

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

By embedding the query object in an array, we specify that the context of the query is the **elements** of the collection rather than the collection itself and we get the following response:

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

Using the key `"=>items"` means that we take the current context (the collection of movies) and we put it under a new key called `items`, in the response. As a result, we get the following response:

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

When executing a method, it is often useful to pass some parameters. Here's how it works:

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

Say the `movies` method takes a single argument: an object that includes a key called `filter` used to specify the query search criteria and a key called `limit`.

The `()` key allows us to pass all parameters, while `=>` is used to define what to do with the result of the function call.

As in a previous example, we are using the array bracket `[]` to process the collection elements, in order to produce the following response:

```json
{
  "movies": [
    {
      "title": "Inception"
    }
  ]
}
```

### Key-value nodes

We have seen previously some examples involving the arrow symbol `=>`, let's enter into the details to understand how to write the keys and the values of the nested nodes.

Object **keys** are made of 2 parts, a "source" and a "target", separated by the arrow symbol (`=>`).

- The "source" is the method or the field name, evaluated in the current context.
- The "target" is the place where to put the result of the evaluation in the response.

Source, target, or both can be omitted, producing slightly different results. Let's check the 4 available variants.

#### 1. `"key"` variant

If there is no arrow symbol it means that source and target are the same.

It's the most frequent use-case, when the response structure mirrors exactly the query structure.

```json
{
  "movie": {
    "title": true
  }
}
```

Note: the key `title` could be expressed by `title=>title`, it would work too.

#### 2. `"sourceKey=>targetKey"` variant

If we specify 2 different source and target, the result of the evaluation of `sourceKey` will appear below a key called `targetKey` in the response.

For example `createdAt=>date` key means the `createdAt` field (or method) result will appear under a key called `date` in the response.

In this case, you can think about the `target` as a way to create aliases, a way to rename things in the query response (similar to [GraphQL aliases](https://graphql.org/learn/queries/#aliases)).

By using aliases, it is possible to execute a method several times with different parameters, avoiding conflict names inside the current context.

For example, in the following request, we first call `movies` method and assign the result to `actionMovies`. Then, we call the same `movies` method, with different parameters, and assign the result to `dramaMovies`.

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

Doing this we can access both method results `actionMovies` and `dramaMovies` in the query response, like this:

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

#### 3. `"=>targetKey"` variant

If the source is omitted, it means the current context will be re-used in the response as it is, without any processing.

For example, `=>items` means we take the current context and put it inside an object whose key is `items`. Basically we are nesting the current context one level deeper, under a new key.

We did that in the previous example because we wanted to access our array of movies under a new key called `items`, while adding a `count` property to the `movies` object.

#### 4. `"sourceKey=>"` variant

If the target is omitted, it means that the evaluation of the method or the field does not generate a new object.

For example, if we are only interested in the title of the movie we found, we could do that:

```json
{
  "movie": {
    "title=>": true
  }
}
```

Note how the key `title` is absent from the response, because we use the key `"title=>"` instead of `"title"`:

```json
{
  "movie": "Inception"
}
```

#### `"=>"` variant

Lastly, we can remove both the source and the target from the key expression, leaving alone the arrow symbol `=>`.

In this case, we don't process the current context (no source) and we are not creating new keys in the response (no target).

The `=>` can be interpreted as a way to introduce the result of a function call.

In the following query, we retrieve a movie by its `id` and we return `title` and `year` attributes in the response.

```json
{
  "movie": {
    "()": {"id": "cjrts72gy00ik01rv6eins4se"},
    "=>": {"title": true, "year": true}
  }
}
```

Note: the following query is exactly the same.

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

### Query execution process

Query objects are evaluated in a recursive way, for every key the related node can be either:

- The boolean `true`
- An object
- An array

Let's see how Deepr handles these 3 types of node.

#### Boolean `true`

The boolean `true` means the result of the method or the field will be included in the response, following the format defined in the key (see above).

If we query a single movie this way:

```json
{
  "movie": {
    "title": true,
    "year": true
  }
}
```

We get a response whose shape mirrors the query's one:

```json
{
  "movie": {
    "title": "Inception",
    "year": 2010
  }
}
```

#### Object

When an object is found, the execution will continue recursively, applying every key to the parent context.

```json
{
  "movie": {
    "director": {
      "name": true
    }
  }
}
```

Once again, the response shape mirrors the query's one:

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

When the parent context is a collection of elements, if an array with a single object is found, every element will be processed by the single object, in a way that is similar to a `map()` applied to an array.

```json
{
  "movies": [{"title": true}]
}
```

We can see the response as the result of a `map` function:

```json
{
  "movies": [{"title": "Inception"}, {"title": "The Matrix"}]
}
```

### Chained queries

Now, let's compose a more complex query involving several chained methods:

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

It will return:

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

So far, we have invoked methods that only read data and don't produce any side effects on the server. Let's see now how to execute some simple CRUD operations.

#### Create

Here is how we could create a record:

```json
{
  "movies.create=>movie": {
    "()": {"title": "Avatar", "country": "USA"},
    "=>": {"id": true}
  }
}
```

Unlike GraphQL, Deepr does not differentiate queries and mutations. So, performing a mutation is just a matter of calling the right method.

It will simply return:

```json
{
  "movie": {
    "id": "cjrts72gy00ik01rv6eins4se"
  }
}
```

#### Read

Now that we have added a record, let's fetch it:

```json
{
  "movie": {
    "()": {"id": "cjrts72gy00ik01rv6eins4se"},
    "=>": {"id": true, "title": true, "country": true}
  }
}
```

It will return:

```json
{
  "movie": {"id": "cjrts72gy00ik01rv6eins4se", "title": "Avatar", "country": "USA"}
}
```

#### Update

To modify a record, we could do so:

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

Note how we use the key `"update=>"` instead of `"update"`, as explained the `"sourceKey=>"` section, to avoid creating an un-necessary "update" key in the response:

```json
{
  "movie": {
    "id": "cjrts72gy00ik01rv6eins4se"
  }
}
```

#### Delete

Finally, here is how we could delete a record:

```json
{
  "movie": {
    "()": {"id": "cjrts72gy00ik01rv6eins4se"},
    "delete=>": {"id": true}
  }
}
```

Again, using the `"sourceKey=>"` form will produce the following result:

```json
{
  "movie": {
    "id": "cjrts72gy00ik01rv6eins4se"
  }
}
```

### Relations

This guide would not be complete without mentioning another important feature supported by Deepr: the ability to query relationships between collections.

It's actually pretty straightforward. Here's how we could fetch some movies with their related actors:

```json
{
  "movies": {
    "()": {"filter": {"country": "USA"}},
    "=>": {
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
  }
}
```

It will return:

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

We don't believe that subscriptions should be included in the core specifications of Deepr. We acknowledge it is an important feature though, and it might come later as an extension.

## Implementation

TODO

## Specifications

Deepr is still a work in progress and proper specifications will come later.

## License

MIT
