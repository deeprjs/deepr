export async function invokeExpression(
  object,
  {sourceKey, isOptional, params, useCollectionElements, nestedExpressions, nextExpression},
  context
) {
  // TODO: Improve error handling

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
        await _invokeSubexpressions(object, {nestedExpressions, nextExpression}, context)
      );
    }
    return results;
  }

  return await _invokeSubexpressions(object, {nestedExpressions, nextExpression}, context);
}

async function _invokeSubexpressions(object, {nestedExpressions, nextExpression}, context) {
  if (nextExpression) {
    return await invokeExpression(object, nextExpression, context);
  }

  const results = {};
  for (const [targetKey, nestedExpression] of Object.entries(nestedExpressions)) {
    results[targetKey] = await invokeExpression(object, nestedExpression, context);
  }
  return results;
}
