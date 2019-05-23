import {invokeQuery} from '../../..';

describe('@deepr/runtime', () => {
  describe('Simple queries', () => {
    describe('Synchronous', () => {
      test('Get attributes of an object', () => {
        expect(
          invokeQuery(
            {movie: {title: 'Inception', year: 2010, country: 'USA'}},
            {movie: {title: true, year: true}}
          )
        ).toEqual({
          movie: {title: 'Inception', year: 2010}
        });
      });

      test('Call a method on a collection', () => {
        expect(
          invokeQuery(
            {
              movies: {
                find() {
                  return [{title: 'Inception'}, {title: 'The Matrix'}];
                },
                count() {
                  return 2;
                }
              }
            },
            {movies: {count: true}}
          )
        ).toEqual({
          movies: {count: 2}
        });
      });

      test('Get attributes of collection elements', () => {
        expect(
          invokeQuery(
            {movies: [{title: 'Inception', year: 2010}, {title: 'The Matrix', year: 1999}]},
            {movies: [{title: true, year: true}]}
          )
        ).toEqual({movies: [{title: 'Inception', year: 2010}, {title: 'The Matrix', year: 1999}]});
      });

      test('Call a method on a collection and get attributes of collection elements', () => {
        expect(
          invokeQuery(
            {
              movies: {
                * [Symbol.iterator]() {
                  yield {title: 'Inception', year: 2010};
                  yield {title: 'The Matrix', year: 1999};
                },
                count() {
                  return 2;
                }
              }
            },
            {movies: {count: true, '=>items': [{title: true, year: true}]}}
          )
        ).toEqual({
          movies: {
            count: 2,
            items: [{title: 'Inception', year: 2010}, {title: 'The Matrix', year: 1999}]
          }
        });
      });
    });

    describe('Asynchronous', () => {
      test('Get attributes of an object', async () => {
        expect(
          await invokeQuery(
            {movie: makePromise({title: 'Inception', year: 2010, country: 'USA'})},
            {movie: {title: true, year: true}}
          )
        ).toEqual({
          movie: {title: 'Inception', year: 2010}
        });
      });

      test('Call a method on a collection', async () => {
        expect(
          await invokeQuery(
            {
              movies: {
                find() {
                  return [{title: 'Inception'}, {title: 'The Matrix'}];
                },
                async count() {
                  return 2;
                }
              }
            },
            {movies: {count: true}}
          )
        ).toEqual({
          movies: {count: 2}
        });
      });

      test('Get attributes of collection elements', async () => {
        expect(
          await invokeQuery(
            {
              movies: makePromise([
                {title: 'Inception', year: 2010},
                {title: 'The Matrix', year: 1999}
              ])
            },
            {movies: [{title: true, year: true}]}
          )
        ).toEqual({movies: [{title: 'Inception', year: 2010}, {title: 'The Matrix', year: 1999}]});
      });

      test('Call a method on a collection and get attributes of collection elements', async () => {
        expect(
          await invokeQuery(
            {
              movies: {
                * [Symbol.iterator]() {
                  yield makePromise({title: 'Inception', year: 2010});
                  yield makePromise({title: 'The Matrix', year: 1999});
                },
                async count() {
                  return 2;
                }
              }
            },
            {movies: {count: true, '=>items': [{title: true, year: true}]}}
          )
        ).toEqual({
          movies: {
            count: 2,
            items: [{title: 'Inception', year: 2010}, {title: 'The Matrix', year: 1999}]
          }
        });
      });
    });
  });

  describe('Parameters', () => {
    test('Call a function with one parameter', async () => {
      expect(
        await invokeQuery(
          {
            movies({filter: {year}, limit}) {
              if (year === 2010 && limit === 1) {
                return [{title: 'Inception'}];
              }
              return [{title: 'Inception'}, {title: 'The Matrix'}];
            }
          },
          {movies: {'()': {filter: {year: 2010}, limit: 1}, '=>': [{title: true}]}}
        )
      ).toEqual({movies: [{title: 'Inception'}]});
    });

    test('Call a function with multiple parameters', async () => {
      expect(
        await invokeQuery(
          {
            sum(a, b) {
              return a + b;
            }
          },
          {sum: {'([])': [1, 2]}}
        )
      ).toEqual({sum: 3});
    });

    test('Call a function without specifying parameters', async () => {
      expect(
        await invokeQuery(
          {
            movies() {
              return [{title: 'Inception'}];
            }
          },
          {movies: [{title: true}]}
        )
      ).toEqual({movies: [{title: 'Inception'}]});
    });

    test('Specify a class without specifying parameters', async () => {
      class Movies {
        static count() {
          return 2;
        }
      }
      expect(await invokeQuery({Movies}, {Movies: {count: true}})).toEqual({
        Movies: {count: 2}
      });
    });
  });

  describe('Keys', () => {
    test('"key" variant', async () => {
      expect(
        await invokeQuery({movie: {title: 'Inception', year: 2010}}, {movie: {title: true}})
      ).toEqual({movie: {title: 'Inception'}});
    });

    test('"sourceKey=>targetKey" variant', async () => {
      expect(
        await invokeQuery(
          {
            movies({filter: {genre}}) {
              if (genre === 'action') {
                return [{title: 'Inception'}, {title: 'The Matrix'}];
              }
              if (genre === 'drama') {
                return [{title: 'Forrest Gump'}];
              }
            }
          },
          {
            'movies=>actionMovies': {'()': {filter: {genre: 'action'}}, '=>': [{title: true}]},
            'movies=>dramaMovies': {'()': {filter: {genre: 'drama'}}, '=>': [{title: true}]}
          }
        )
      ).toEqual({
        actionMovies: [{title: 'Inception'}, {title: 'The Matrix'}],
        dramaMovies: [{title: 'Forrest Gump'}]
      });
    });

    test('"=>targetKey" variant', async () => {
      expect(
        await invokeQuery(
          {
            movies: {
              * [Symbol.iterator]() {
                yield {title: 'Inception', year: 2010};
                yield {title: 'The Matrix', year: 1999};
              },
              count() {
                return 2;
              }
            }
          },
          {movies: {count: true, '=>items': [{title: true}]}}
        )
      ).toEqual({
        movies: {
          count: 2,
          items: [{title: 'Inception'}, {title: 'The Matrix'}]
        }
      });
    });

    test('"sourceKey=>" variant', async () => {
      expect(
        await invokeQuery({movie: {title: 'Inception', year: 2010}}, {movie: {'title=>': true}})
      ).toEqual({movie: 'Inception'});
    });

    test('"=>" variant', async () => {
      const object = {
        movie({id}) {
          if (id === 'cjrts72gy00ik01rv6eins4se') {
            return {title: 'Inception', year: 2010, country: 'USA'};
          }
        }
      };

      expect(
        await invokeQuery(object, {
          movie: {'()': {id: 'cjrts72gy00ik01rv6eins4se'}, '=>': {title: true, year: true}}
        })
      ).toEqual({movie: {title: 'Inception', year: 2010}});

      expect(
        await invokeQuery(object, {
          movie: {'()': {id: 'cjrts72gy00ik01rv6eins4se'}, title: true, year: true}
        })
      ).toEqual({movie: {title: 'Inception', year: 2010}});
    });
  });

  describe('Values', () => {
    test('Boolean `true`', async () => {
      expect(
        await invokeQuery(
          {movie: {title: 'Inception', year: 2010, country: 'USA'}},
          {movie: {title: true, year: true}}
        )
      ).toEqual({movie: {title: 'Inception', year: 2010}});
    });

    test('Object', async () => {
      expect(
        await invokeQuery(
          {movie: {title: 'Star Wars', director: {name: 'Georges Lucas', popularity: 70}}},
          {movie: {director: {name: true}}}
        )
      ).toEqual({movie: {director: {name: 'Georges Lucas'}}});
    });

    test('Array', async () => {
      expect(
        await invokeQuery(
          {movies: [{title: 'Inception'}, {title: 'The Matrix'}, {title: 'Forest Gump'}]},
          {movies: [{title: true}]}
        )
      ).toEqual({movies: [{title: 'Inception'}, {title: 'The Matrix'}, {title: 'Forest Gump'}]});
    });
  });

  describe('Fault-tolerant queries', () => {
    describe('Synchronous', () => {
      test('Get attributes of an object', () => {
        expect(() =>
          invokeQuery(
            {movie: {title: 'Inception'}},
            {movie: {title: true, director: {fullName: true}}}
          )
        ).toThrow(/Cannot execute a query on `undefined`/);

        expect(
          invokeQuery(
            {movie: {title: 'Inception'}},
            {movie: {title: true, 'director?': {fullName: true}}}
          )
        ).toEqual({movie: {title: 'Inception'}});

        expect(
          invokeQuery({movie: {title: 'Inception'}}, {movie: {title: true, director: true}})
        ).toEqual({movie: {title: 'Inception'}});
      });

      test('Call a method on an object', () => {
        expect(() =>
          invokeQuery(
            {movie: {title: 'Inception'}},
            {movie: {title: true, actors: {'()': {sort: {by: 'popularity'}}}}}
          )
        ).toThrow(/Couldn't found a method matching the key/);

        expect(
          invokeQuery(
            {movie: {title: 'Inception'}},
            {movie: {title: true, 'actors?': {'()': {sort: {by: 'popularity'}}}}}
          )
        ).toEqual({movie: {title: 'Inception'}});
      });
    });

    describe('Asynchronous', () => {
      test('Get attributes of an object', async () => {
        await expect(
          invokeQuery(
            {movie: makePromise({title: 'Inception'})},
            {movie: {title: true, director: {fullName: true}}}
          )
        ).rejects.toThrow();

        await expect(
          invokeQuery(
            {movie: makePromise({title: 'Inception'})},
            {movie: {title: true, 'director?': {fullName: true}}}
          )
        ).resolves.toEqual({movie: {title: 'Inception'}});

        await expect(
          invokeQuery(
            {movie: makePromise({title: 'Inception'})},
            {movie: {title: true, director: true}}
          )
        ).resolves.toEqual({movie: {title: 'Inception'}});
      });

      test('Call a method on an object', async () => {
        await expect(
          invokeQuery(
            {movie: makePromise({title: 'Inception'})},
            {movie: {title: true, actors: {'()': {sort: {by: 'popularity'}}}}}
          )
        ).rejects.toThrow();

        await expect(
          invokeQuery(
            {movie: makePromise({title: 'Inception'})},
            {movie: {title: true, 'actors?': {'()': {sort: {by: 'popularity'}}}}}
          )
        ).resolves.toEqual({movie: {title: 'Inception'}});
      });
    });
  });

  describe('Source values', () => {
    test('Call a method on an object', async () => {
      expect(
        await invokeQuery(
          {},
          {
            '<=': {
              _type: 'Movie',
              title: 'Avatar',
              country: 'USA',
              save() {
                const {_type, title, country} = this;
                return {_type, id: 'cjrts72gy00ik01rv6eins4se', title, country};
              }
            },
            'save=>movie': {
              id: true
            }
          }
        )
      ).toEqual({
        movie: {
          id: 'cjrts72gy00ik01rv6eins4se'
        }
      });
    });
  });

  describe('Options', () => {
    test('context', async () => {
      expect(
        await invokeQuery(
          {
            movie({id}, {accessToken}) {
              if (accessToken !== 'super-secret-token') {
                throw new Error('Access denied');
              }
              if (id === 'cjrts72gy00ik01rv6eins4se') {
                return {title: 'Inception', year: 2010, country: 'USA'};
              }
              throw new Error('Movie not found');
            }
          },
          {
            movie: {'()': {id: 'cjrts72gy00ik01rv6eins4se'}, '=>': {title: true}}
          },
          {context: {accessToken: 'super-secret-token'}}
        )
      ).toEqual({movie: {title: 'Inception'}});
    });

    test('ignoreKeys', async () => {
      expect(
        await invokeQuery(
          {
            user: {
              username: 'steve',
              password: 'secret',
              _privateMethod() {
                return 'private information';
              }
            }
          },
          {
            user: {username: true, password: true, _privateMethod: true}
          },
          {ignoreKeys: ['password', /^_/]}
        )
      ).toEqual({user: {username: 'steve'}});
    });

    test('acceptKeys', async () => {
      expect(
        await invokeQuery(
          {
            user: {
              _id: 'abc123',
              username: 'steve',
              _password: 'secret'
            }
          },
          {
            user: {_id: true, username: true, _password: true}
          },
          {ignoreKeys: /^_/, acceptKeys: '_id'}
        )
      ).toEqual({user: {_id: 'abc123', username: 'steve'}});
    });

    test('ignoreBuiltInKeys', async () => {
      const root = {
        user: {
          username: 'steve'
        }
      };

      const query = {
        user: {username: true, hasOwnProperty: {'()': 'username'}}
      };

      expect(await invokeQuery(root, query)).toEqual({
        user: {username: 'steve'}
      });

      expect(await invokeQuery(root, query, {ignoreBuiltInKeys: false})).toEqual({
        user: {username: 'steve', hasOwnProperty: true}
      });
    });
  });
});

function makePromise(value) {
  return new Promise(resolve => {
    setTimeout(() => {
      while (typeof value === 'function') {
        value = value();
      }
      resolve(value);
    }, 5);
  });
}
