export async function invokeExpression(
  object,
  {sourceKey, isOptional, params, childContext, children, child},
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

  if (!(children || child)) {
    return object;
  }

  if (object === undefined && isOptional) {
    return undefined;
  }

  if (childContext === 'elements') {
    const collection = object;
    const results = [];
    for (const object of collection) {
      results.push(await _invokeSubexpressions(object, {children, child}, context));
    }
    return results;
  }

  return await _invokeSubexpressions(object, {children, child}, context);
}

async function _invokeSubexpressions(object, {children, child}, context) {
  if (child) {
    return await invokeExpression(object, child, context);
  }

  const results = {};
  for (const [targetKey, child] of Object.entries(children)) {
    results[targetKey] = await invokeExpression(object, child, context);
  }
  return results;
}
