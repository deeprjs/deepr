const util = require('util');

const {invokeQuery} = require('..');

(async () => {
  const root = {
    async movie({id}) {
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
    movie: {
      '()': {id: 'abc123'},
      '=>': {
        title: true,
        actors: [{fullName: true}]
      }
    }
  });

  console.log(util.inspect(result, {depth: null}));
})();
