import {possiblyAsync} from 'possibly-async';

import {expression} from './expression';

export type invokeExpressionOptions = {
  context?: any;
  authorizer?: Function;
  errorHandler?: Function;
};

export function invokeExpression(
  target: any,
  expression: expression,
  options: invokeExpressionOptions = {}
) {
  if (target === undefined) {
    throw new Error(`'target' parameter is missing`);
  }

  if (expression === undefined) {
    throw new Error(`'expression' parameter is missing`);
  }

  return _invokeExpression(target, expression, options);
}

function _invokeExpression(
  target: any,
  expression: expression,
  options: invokeExpressionOptions,
  _isMapping = false
): any {
  const {errorHandler} = options;

  return possiblyAsync.call(
    [
      function () {
        return __invokeExpression(target, expression, options);
      }
    ],
    {
      catch(error: Error) {
        if (errorHandler === undefined) {
          throw error;
        }

        const result = errorHandler.call(target, error);

        return _isMapping ? {[possiblyAsync.breakSymbol]: result} : result;
      }
    }
  );
}

function __invokeExpression(
  target: any,
  {
    sourceKey,
    isOptional,
    params,
    sourceValue,
    useCollectionElements,
    nestedExpressions,
    nextExpression
  }: expression,
  options: invokeExpressionOptions
): any {
  target = sourceKey ? evaluateKey(target, sourceKey, {params, isOptional}, options) : target;

  return possiblyAsync(target, {
    then(target: any) {
      if (sourceValue !== undefined) {
        target = sourceValue;
      }

      if (!(nestedExpressions || nextExpression)) {
        return target;
      }

      if (target === undefined) {
        if (isOptional) {
          return undefined;
        }

        throw new Error(`Cannot execute a query on \`undefined\` (key: '${sourceKey}')`);
      }

      if (useCollectionElements) {
        const collection = target;

        const results = possiblyAsync.map(collection, function (item: any) {
          return _invokeExpression(
            item,
            {sourceKey: '', nestedExpressions, nextExpression},
            options,
            true
          );
        });

        return results;
      }

      if (nextExpression) {
        return _invokeExpression(target, nextExpression, options);
      }

      const results = possiblyAsync.mapValues(nestedExpressions!, function (
        nestedExpression: expression
      ) {
        return _invokeExpression(target, nestedExpression, options, true);
      });

      return results;
    }
  });
}

function evaluateKey(
  target: any,
  key: string,
  {params, isOptional}: {params?: any[]; isOptional?: boolean},
  options: invokeExpressionOptions
) {
  const value = target[key];

  if (params === undefined) {
    return evaluateAttribute(target, key, value, options);
  }

  return evaluateMethod(target, key, value, {params, isOptional}, options);
}

function evaluateAttribute(
  target: any,
  key: string,
  value: any,
  {authorizer}: invokeExpressionOptions
) {
  return possiblyAsync(evaluateAuthorizer(target, authorizer, key, 'get'), {
    then(isAllowed: boolean) {
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
function evaluateMethod(
  target: any,
  key: string,
  method: Function,
  {params, isOptional}: {params: any[]; isOptional?: boolean},
  {context, authorizer}: invokeExpressionOptions
) {
  if (method === undefined) {
    if (isOptional) {
      return undefined;
    }

    throw new Error(`Couldn't found a method matching the key '${key}'`);
  }

  return possiblyAsync(evaluateAuthorizer(target, authorizer, key, 'call', params), {
    then(isAllowed: boolean) {
      if (!isAllowed) {
        throw new Error(`Cannot execute a method that is not allowed (name: '${key}')`);
      }

      return method.call(target, ...params, context);
    }
  });
}

// eslint-disable-next-line max-params
function evaluateAuthorizer(
  target: any,
  authorizer: Function | undefined,
  key: string,
  operation: string,
  params?: any[]
) {
  if (authorizer === undefined) {
    return true;
  }

  return authorizer.call(target, key, operation, params);
}
