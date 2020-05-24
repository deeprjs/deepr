import {possiblyAsync} from 'possibly-async';

import {Query} from './query';
import {parseQuery, ParseQueryOptions} from './parser';
import {invokeExpression, InvokeExpressionOptions} from './runtime';

export function invokeQuery(
  root: any,
  query: Query | Query[],
  {
    context,
    ignoreKeys,
    acceptKeys,
    ignoreBuiltInKeys,
    authorizer,
    errorHandler
  }: ParseQueryOptions & InvokeExpressionOptions = {}
): any {
  if (root === undefined) {
    throw new Error(`The 'root' parameter is missing`);
  }

  if (query === undefined) {
    throw new Error(`The 'query' parameter is missing`);
  }

  if (Array.isArray(query)) {
    const queries = query;
    return possiblyAsync.map(queries, function (query: Query) {
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
