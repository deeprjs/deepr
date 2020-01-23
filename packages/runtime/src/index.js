import {possiblyAsync} from 'possibly-async';

import {parseQuery} from './parser';
import {invokeExpression} from './runtime';

export function invokeQuery(
  root,
  query,
  {context, ignoreKeys, acceptKeys, ignoreBuiltInKeys, authorizer} = {}
) {
  if (root === undefined) {
    throw new Error(`'root' parameter is missing`);
  }

  if (query === undefined) {
    throw new Error(`'query' parameter is missing`);
  }

  if (Array.isArray(query)) {
    const queries = query;
    return possiblyAsync.map(queries, function(query) {
      return invokeQuery(root, query, {
        context,
        ignoreKeys,
        acceptKeys,
        ignoreBuiltInKeys,
        authorizer
      });
    });
  }

  return invokeExpression(root, parseQuery(query, {ignoreKeys, acceptKeys, ignoreBuiltInKeys}), {
    context,
    authorizer
  });
}
