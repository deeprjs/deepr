import {possiblyAsync} from 'possibly-async';

export function invokeExpression(object, expression, options = {}) {
  if (object === undefined) {
    throw new Error(`'object' parameter is missing`);
  }
  if (expression === undefined) {
    throw new Error(`'expression' parameter is missing`);
  }
  return _invokeExpression(object, expression, options);
}

function _invokeExpression(object, expression, options, _isMapping = false) {
  const {errorHandler} = options;

  return possiblyAsync.call(
    [
      function() {
        return __invokeExpression(object, expression, options);
      }
    ],
    {
      catch(error) {
        if (errorHandler === undefined) {
          throw error;
        }

        const result = errorHandler.call(object, error);

        return _isMapping ? {[possiblyAsync.break]: result} : result;
      }
    }
  );
}

function __invokeExpression(
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
        const results = possiblyAsync.map(collection, function(object) {
          return _invokeExpression(object, {nestedExpressions, nextExpression}, options, true);
        });
        return results;
      }

      if (nextExpression) {
        return _invokeExpression(object, nextExpression, options);
      }

      const results = possiblyAsync.mapValues(nestedExpressions, function(nestedExpression) {
        return _invokeExpression(object, nestedExpression, options, true);
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

  return possiblyAsync(evaluateAuthorizer(object, authorizer, key, 'call', params), {
    then(isAllowed) {
      if (!isAllowed) {
        throw new Error(`Cannot execute a method that is not allowed (name: '${key}')`);
      }
      return method.call(object, ...params, context);
    }
  });
}

// eslint-disable-next-line max-params
function evaluateAuthorizer(object, authorizer, key, operation, params) {
  if (authorizer === undefined) {
    return true;
  }

  return authorizer.call(object, key, operation, params);
}
