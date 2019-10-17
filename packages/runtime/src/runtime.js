import {possiblyAsync} from 'possibly-async';

/* eslint-disable prefer-arrow-callback */

export function invokeExpression(object, expression, options = {}) {
  if (object === undefined) {
    throw new Error(`'object' parameter is missing`);
  }
  if (expression === undefined) {
    throw new Error(`'expression' parameter is missing`);
  }
  return _invokeExpression(object, expression, options);
}

function _invokeExpression(
  object,
  {
    sourceKey,
    isOptional,
    params,
    sourceValue,
    useCollectionElements,
    nestedExpressions,
    nextExpression
  },
  options
) {
  object = sourceKey ? evaluateKey(object, {key: sourceKey, params, isOptional}, options) : object;

  return possiblyAsync(object, function (object) {
    if (sourceValue !== undefined) {
      object = sourceValue;
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
      const results = possiblyAsync.map(collection, function (object) {
        return _invokeExpression(object, {nestedExpressions, nextExpression}, options);
      });
      return results;
    }

    if (nextExpression) {
      return _invokeExpression(object, nextExpression, options);
    }

    const results = possiblyAsync.mapObject(nestedExpressions, function (nestedExpression) {
      return _invokeExpression(object, nestedExpression, options);
    });
    return results;
  });
}

function evaluateKey(object, {key, params, isOptional}, options) {
  const value = object[key];

  if (params !== undefined) {
    const method = value;

    if (method === undefined) {
      if (isOptional) {
        return undefined;
      }
      throw new Error(`Couldn't found a method matching the key '${key}'`);
    }

    return method.call(object, ...(params || []), options.context);
  }

  return value;
}
