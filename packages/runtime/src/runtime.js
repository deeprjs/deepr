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
  // TODO: Improve error handling

  if (sourceKey) {
    const property = object[sourceKey];
    if (typeof property === 'function' || params) {
      if (property === undefined && isOptional) {
        object = undefined;
      } else {
        object = await property.call(object, params, options.context);
      }
    } else {
      object = property;
    }
  }

  if (!(nestedExpressions || nextExpression)) {
    return object;
  }

  if (object === undefined && isOptional) {
    return undefined;
  }

  if (useCollectionElements) {
    const collection = object;
    const results = [];
    for (const object of collection) {
      results.push(
        await _invokeSubexpressions(object, {nestedExpressions, nextExpression}, options)
      );
    }
    return results;
  }

  return await _invokeSubexpressions(object, {nestedExpressions, nextExpression}, options);
}

async function _invokeSubexpressions(object, {nestedExpressions, nextExpression}, options) {
  if (nextExpression) {
    return await invokeExpression(object, nextExpression, options);
  }

  const results = {};
  for (const [targetKey, nestedExpression] of Object.entries(nestedExpressions)) {
    results[targetKey] = await invokeExpression(object, nestedExpression, options);
  }
  return results;
}
