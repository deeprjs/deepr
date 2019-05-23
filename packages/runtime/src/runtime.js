import {syncOrAsync, mapSyncOrAsync, mapObjectSyncOrAsync} from '@deepr/util';

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

  return syncOrAsync(object, function (object) {
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
      const results = mapSyncOrAsync(collection, function (object) {
        return _invokeExpression(object, {nestedExpressions, nextExpression}, options);
      });
      return results;
    }

    if (nextExpression) {
      return _invokeExpression(object, nextExpression, options);
    }

    const results = mapObjectSyncOrAsync(nestedExpressions, function (nestedExpression) {
      return _invokeExpression(object, nestedExpression, options);
    });
    return results;
  });
}

function evaluateKey(object, {key, params, isOptional}, options) {
  const value = object[key];

  const isFunction = typeof value === 'function';
  const isClass = startsWithUpperCase(key);
  if ((isFunction && !isClass) || params) {
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

    return func.call(object, ...(params || []), options.context);
  }

  return value;
}

function startsWithUpperCase(string) {
  const firstCharacter = string.substr(0, 1);
  return firstCharacter.toUpperCase() === firstCharacter;
}
