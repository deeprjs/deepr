const util = require('util');

const {invokeQuery} = require('..');

(async () => {
  const root = {
    async getMovie({id}) {
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

  const result = await invokeQuery(root, {
    'getMovie=>movie': {
      '()': [{id: 'abc123'}],
      '=>': {
        title: true,
        actors: {'[]': [], 'fullName': true}
      }
    }
  });

  console.log(util.inspect(result, {depth: null}));
})();

/*
Should output:

{
  movie: {
    title: 'Inception',
    actors: [
      { fullName: 'Leonardo DiCaprio' },
      { fullName: 'Joseph Gordon-Levitt' }
    ]
  }
}
*/
