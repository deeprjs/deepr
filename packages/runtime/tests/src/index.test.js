import {invokeQuery} from '../../..';

describe('@deepr/runtime', () => {
  describe('simple queries', () => {
    test('get attributes of an object', async () => {
      expect(
        await invokeQuery(
          {movie: {title: 'Inception', year: 2010, country: 'USA'}},
          {movie: {title: true, year: true}}
        )
      ).toEqual({
        movie: {title: 'Inception', year: 2010}
      });
    });

    test('call a method on a collection', async () => {
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

    test('get attributes of collection elements', async () => {
      expect(
        await invokeQuery(
          {movies: [{title: 'Inception', year: 2010}, {title: 'The Matrix', year: 1999}]},
          {movies: [{title: true, year: true}]}
        )
      ).toEqual({movies: [{title: 'Inception', year: 2010}, {title: 'The Matrix', year: 1999}]});
    });

    test('call a method on a collection and get attributes of collection elements', async () => {
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

  describe('parameters', () => {
    test('call a function with some parameters', async () => {
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

  describe('fault-tolerant queries', () => {
    test('get attributes of an object', async () => {
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

    test('call a method on an object', async () => {
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
});
