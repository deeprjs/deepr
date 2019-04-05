export function invokeExpression(object, expression, options = {}) {
  if (object === undefined) {
    throw new Error(`'object' parameter is missing`);
  }
  if (expression === undefined) {
    throw new Error(`'expression' parameter is missing`);
  }
  return _invokeExpression(object, expression, options);
}

async function _invokeExpression(
  object,
  {sourceKey, isOptional, params, useCollectionElements, nestedExpressions, nextExpression},
  options
) {
  if (sourceKey) {
    object = await evaluateKey(object, {key: sourceKey, params, isOptional}, options);
  }

  if (!(nestedExpressions || nextExpression)) {
    return object;
  }

  if (object === undefined) {
    if (isOptional) {
      return undefined;
    }
    throw new Error(`Cannot execute a query on \`undefined\` (key: '${sourceKey}')`);
  }

  if (useCollectionElements) {
    const collection = object;
    const results = [];
    for (const object of collection) {
      results.push(await _invokeExpression(object, {nestedExpressions, nextExpression}, options));
    }
    return results;
  }

  if (nextExpression) {
    return await _invokeExpression(object, nextExpression, options);
  }

  const results = {};
  for (const [targetKey, nestedExpression] of Object.entries(nestedExpressions)) {
    results[targetKey] = await _invokeExpression(object, nestedExpression, options);
  }
  return results;
}

async function evaluateKey(object, {key, params, isOptional}, options) {
  const value = object[key];

  const isFunction = typeof value === 'function';
  if (isFunction || params) {
    const func = value;

    if (func === undefined) {
      if (isOptional) {
        return undefined;
      }
      throw new Error(`Couldn't found a method matching the key '${key}'`);
    }

    if (!isFunction) {
      throw new Error(
        `A function was expected but found a value of type '${typeof func}' (key: '${key}')`
      );
    }

    return await func.call(object, ...(params || []), options.context);
  }

  return value;
}
