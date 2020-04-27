import {possiblyAsync} from 'possibly-async';

import {query} from './query';
import {parseQuery, parseQueryOptions} from './parser';
import {invokeExpression, invokeExpressionOptions} from './runtime';

export function invokeQuery(
  root: any,
  query: query | query[],
  {
    context,
    ignoreKeys,
    acceptKeys,
    ignoreBuiltInKeys,
    authorizer,
    errorHandler
  }: parseQueryOptions & invokeExpressionOptions = {}
): any {
  if (root === undefined) {
    throw new Error(`The 'root' parameter is missing`);
  }

  if (query === undefined) {
    throw new Error(`The 'query' parameter is missing`);
  }

  if (Array.isArray(query)) {
    const queries = query;
    return possiblyAsync.map(queries, function (query: query) {
      return invokeQuery(root, query, {
        context,
        ignoreKeys,
        acceptKeys,
        ignoreBuiltInKeys,
        authorizer,
        errorHandler
      });
    });
  }

  return invokeExpression(root, parseQuery(query, {ignoreKeys, acceptKeys, ignoreBuiltInKeys}), {
    context,
    authorizer,
    errorHandler
  });
}
