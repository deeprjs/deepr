// TODO: Make a proper implementation

export function invokeQuery(root, query, context) {
  return invokeExpression(root, parseQuery(query), context);
}

export async function invokeExpression(
  object,
  {sourceKey, isOptional, params, childrenContext, children},
  context
) {
  if (sourceKey) {
    const property = object[sourceKey];
    if (typeof property === 'function' || params) {
      if (property === undefined && isOptional) {
        object = undefined;
      } else {
        object = await property.call(object, params, context);
      }
    } else {
      object = property;
    }
  }

  if (!children) {
    return object;
  }

  if (object === undefined && isOptional) {
    return undefined;
  }

  if (childrenContext === 'elements') {
    const results = [];
    for (const element of object) {
      results.push(await invokeExpressions(element, children, context));
    }
    return results;
  }

  return await invokeExpressions(object, children, context);
}

async function invokeExpressions(object, expressions, context) {
  let results;

  for (const {targetKey, ...expression} of expressions) {
    const result = await invokeExpression(object, expression, context);

    if (!targetKey) {
      // There can only be one empty target
      return result;
    }

    if (!results) {
      results = {};
    }

    results[targetKey] = result;
  }

  return results;
}

// parseQuery(query) => expressions
//
// Transform a query:
//
// const query = {
//   'movies=>actionMovies': {
//     '()': {genre: 'action'},
//     'reverse=>': [
//       {
//         title: true,
//         year: true
//       }
//     ]
//   }
// };
//
// Into an array of expressions:
//
// const expressions = [
//   {
//     sourceKey: 'movies',
//     targetKey: 'actionMovies',
//     params: {genre: 'action'},
//     children: [
//       {
//         sourceKey: 'reverse',
//         targetKey: '',
//         childrenContext: 'elements',
//         children: [
//           {
//             sourceKey: 'title'
//           },
//           {
//             sourceKey: 'year'
//           }
//         ]
//       }
//     ]
//   }
// ];

export function parseQuery(query, {sourceKey = '', targetKey = '', isOptional} = {}) {
  const expression = {sourceKey, targetKey, isOptional};

  if (Array.isArray(query)) {
    if (query.length !== 1) {
      throw new Error('An array should contain exactly one item');
    }
    expression.childrenContext = 'elements';
    query = query[0];
  }

  if (query === true) {
    return expression;
  }

  if (typeof query !== 'object' || query === null) {
    throw new Error(`Invalid query found: ${JSON.stringify(query)}`);
  }

  const children = [];
  let numEmptyTargets = 0;

  for (const [key, value] of Object.entries(query)) {
    if (key === '()') {
      expression.params = value;
      continue;
    }

    const {sourceKey, targetKey, isOptional} = parseKey(key);

    if (!targetKey) {
      numEmptyTargets++;
    }

    children.push(parseQuery(value, {sourceKey, targetKey, isOptional}));
  }

  if (numEmptyTargets === 1 && children.length > 1) {
    throw new Error('Empty and non-empty targets found at the same level');
  }

  if (numEmptyTargets > 1) {
    throw new Error('Multiple empty targets found at the same level');
  }

  expression.children = children;

  return expression;
}

function parseKey(key) {
  let sourceKey;
  let targetKey;
  let isOptional;

  const parts = key.split('=>');

  if (parts.length === 1) {
    sourceKey = parts[0];
    ({sourceKey, isOptional} = parseSourceKey(sourceKey));
    targetKey = sourceKey;
  } else if (parts.length === 2) {
    sourceKey = parts[0];
    ({sourceKey, isOptional} = parseSourceKey(sourceKey));
    targetKey = parts[1];
  } else {
    throw new Error(`Invalid key found: '${key}'`);
  }

  return {sourceKey, targetKey, isOptional};
}

function parseSourceKey(sourceKey) {
  let isOptional;
  if (sourceKey.endsWith('?')) {
    isOptional = true;
    sourceKey = sourceKey.slice(0, -1);
  }
  return {sourceKey, isOptional};
}
