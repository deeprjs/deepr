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
  object = sourceKey ? evaluateKey(object, sourceKey, {params, isOptional}, options) : object;

  return possiblyAsync(object, {
    then(object) {
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
    }
  });
}

function evaluateKey(object, key, {params, isOptional}, options) {
  const value = object[key];

  if (params === undefined) {
    return evaluateAttribute(object, key, value, options);
  }

  return evaluateMethod(object, key, value, {params, isOptional}, options);
}

function evaluateAttribute(object, key, value, {authorizer}) {
  return possiblyAsync(evaluateAuthorizer(object, authorizer, key, 'get'), {
    then(isAllowed) {
      if (!isAllowed) {
        throw new Error(
          `Cannot get the value of an attribute that is not allowed (name: '${key}')`
        );
      }
      return value;
    }
  });
}

// eslint-disable-next-line max-params
function evaluateMethod(object, key, method, {params, isOptional}, {context, authorizer}) {
  if (method === undefined) {
    if (isOptional) {
      return undefined;
    }
    throw new Error(`Couldn't found a method matching the key '${key}'`);
  }

  return possiblyAsync(evaluateAuthorizer(object, authorizer, key, 'call'), {
    then(isAllowed) {
      if (!isAllowed) {
        throw new Error(`Cannot execute a method that is not allowed (name: '${key}')`);
      }
      return method.call(object, ...(params || []), context);
    }
  });
}

function evaluateAuthorizer(object, authorizer, key, operation) {
  if (authorizer === undefined) {
    return true;
  }

  return authorizer.call(object, key, operation);
}
