/*
parseQuery(query) => expression

Transform a query:
{
  "movies=>actionMovies": {
    "()": {"genre": "action"},
    "reverse=>": [
      {
        "title": true,
        "year": true
      }
    ]
  }
}

Into an expression that is easier to execute by the runtime:
{
  "sourceKey": "",
  "children": {
    "actionMovies": {
      "sourceKey": "movies",
      "params": {"genre": "action"},
      "child": {
        "sourceKey": "reverse",
        "childContext": "elements",
        "children": {
          "title": {
            "sourceKey": "title"
          },
          "year": {
            "sourceKey": "year"
          }
        }
      }
    }
  }
}
*/

export function parseQuery(query, {sourceKey = '', isOptional} = {}) {
  const expression = {sourceKey, isOptional};

  if (Array.isArray(query)) {
    if (query.length !== 1) {
      throw new Error('An array should contain exactly one item');
    }
    expression.childContext = 'elements';
    query = query[0];
  }

  if (query === true) {
    return expression;
  }

  if (typeof query !== 'object' || query === null) {
    throw new Error(`Invalid query found: ${JSON.stringify(query)}`);
  }

  const children = {};
  let child;

  for (const [key, value] of Object.entries(query)) {
    if (key === '()') {
      expression.params = value;
      continue;
    }

    const {sourceKey, targetKey, isOptional} = parseKey(key);
    const subexpression = parseQuery(value, {sourceKey, isOptional});

    if (targetKey) {
      children[targetKey] = subexpression;
    } else {
      if (child) {
        throw new Error('Multiple empty targets found at the same level');
      }
      child = subexpression;
    }
  }

  if (Object.keys(children).length && child) {
    throw new Error('Empty and non-empty targets found at the same level');
  }

  expression.children = children;
  expression.child = child;

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
