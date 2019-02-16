# Deepr

A specification for invoking remote methods, deeply!

## Examples

```js
({
  person: {
    name: true,
    age: true
  }
});
```

```js
({
  persons: {
    count: true
  }
});
```

```js
({
  persons: [
    {
      name: true,
      age: true
    }
  ]
});
```

```js
({
  persons: {
    count: true,
    '$this:items': [
      {
        name: true,
        age: true
      }
    ]
  }
});
```

```js
({
  persons: {
    $params: {filter: {age: 40}},
    $return: [
      {
        firstName: true,
        lastName: true
      }
    ]
  }
});
```

```js
({
  'persons:virtualPeople': {
    $params: {filter: {isVirtual: true}}
    $return: [
      {
        name: true,
        age: true
      }
    ]
  },
  'persons:realPeople': {
    $params: {filter: {isVirtual: false}}
    $return: [
      {
        name: true,
        age: true
      }
    ]
  }
});
```

```js
// Request:
({
  persons: {
    filter: {
      $params: {country: 'USA'},
      $return: {
        sort: {
          $params: {age: 1},
          $return: {
            skip: {
              $params: 5,
              limit: {
                $params: 10,
                $return: [
                  {
                    firstName: true,
                    lastName: true
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
  persons: {
    filter: {
      sort: {
        skip: {
          limit: [
            {
              firstNane: 'Emma',
              lastName: 'Stone'
            },
            {
              firstNane: 'Johnny',
              lastName: 'Depp'
            }
          ]
        }
      }
    }
  }
});
```

```js
// Request:
({
  persons: {
    $invoke: [{filter: {country: 'USA'}}, {sort: {age: 1}}, {skip: 5}, {limit: 10}],
    $return: [
      {
        firstName: true,
        lastName: true
      }
    ]
  }
});

// Response:
({
  persons: [{firstNane: 'Emma', lastName: 'Stone'}, {firstNane: 'Johnny', lastName: 'Depp'}]
});
```

```js
({
  movies: {
    create: {
      $params: {title: 'Avatar', country: 'USA'},
      $return: {id: true}
    }
  }
});
```

```js
({
  movie: {
    $params: {id: 'cu2989g98kjsg'},
    $return: {id: true, title: true, country: true}
  }
});
```

```js
({
  movie: {
    $params: {id: 'cu2989g98kjsg'},
    $return: {
      update: {
        $params: {rating: 8.1}
      }
    }
  }
});
```

```js
({
  movie: {
    $params: {id: 'cu2989g98kjsg'},
    $return: {
      delete: true
    }
  }
});
```

```js
({
  movies: {
    $params: {filter: {country: 'USA'}},
    $return: {
      title: true,
      country: true,
      actors: {
        $params: {sort: {lastName: 1, firstName: 1}},
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
```
