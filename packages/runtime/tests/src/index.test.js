import {invokeQuery} from '../../..';

describe('@deepr/runtime', () => {
  describe('Simple queries', () => {
    test('Get attributes of an object', async () => {
      expect(
        await invokeQuery(
          {movie: {title: 'Inception', year: 2010, country: 'USA'}},
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

    test('Get attributes of collection elements', async () => {
      expect(
        await invokeQuery(
          {movies: [{title: 'Inception', year: 2010}, {title: 'The Matrix', year: 1999}]},
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

  describe('Parameters', () => {
    test('Call a function with some parameters', async () => {
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
    test('Get attributes of an object', async () => {
      await expect(
        invokeQuery(
          {movie: {title: 'Inception'}},
          {movie: {title: true, director: {fullName: true}}}
        )
      ).rejects.toThrow();

      await expect(
        invokeQuery(
          {movie: {title: 'Inception'}},
          {movie: {title: true, 'director?': {fullName: true}}}
        )
      ).resolves.toEqual({movie: {title: 'Inception'}});

      await expect(
        invokeQuery({movie: {title: 'Inception'}}, {movie: {title: true, director: true}})
      ).resolves.toEqual({movie: {title: 'Inception'}});
    });

    test('Call a method on an object', async () => {
      await expect(
        invokeQuery(
          {movie: {title: 'Inception'}},
          {movie: {title: true, actors: {'()': {sort: {by: 'popularity'}}}}}
        )
      ).rejects.toThrow();

      await expect(
        invokeQuery(
          {movie: {title: 'Inception'}},
          {movie: {title: true, 'actors?': {'()': {sort: {by: 'popularity'}}}}}
        )
      ).resolves.toEqual({movie: {title: 'Inception'}});
    });
  });

  describe('Fault-tolerant queries', () => {
    test('Get attributes of an object', async () => {
      await expect(
        invokeQuery(
          {movie: {title: 'Inception'}},
          {movie: {title: true, director: {fullName: true}}}
        )
      ).rejects.toThrow();

      await expect(
        invokeQuery(
          {movie: {title: 'Inception'}},
          {movie: {title: true, 'director?': {fullName: true}}}
        )
      ).resolves.toEqual({movie: {title: 'Inception'}});

      await expect(
        invokeQuery({movie: {title: 'Inception'}}, {movie: {title: true, director: true}})
      ).resolves.toEqual({movie: {title: 'Inception'}});
    });
  });

  describe('Async execution', () => {
    test('Async fetch', async () => {
      expect(
        await invokeQuery(
          {
            async movie({id}) {
              await sleep(50);
              if (id === 'cjrts72gy00ik01rv6eins4se') {
                return {title: 'Inception', year: 2010, country: 'USA'};
              }
            }
          },
          {
            movie: {'()': {id: 'cjrts72gy00ik01rv6eins4se'}, '=>': {title: true, year: true}}
          }
        )
      ).toEqual({movie: {title: 'Inception', year: 2010}});

      function sleep(duration) {
        return new Promise(resolve => {
          setTimeout(resolve, duration);
        });
      }
    });
  });
});
