import {parseQuery} from './parser';
import {invokeExpression} from './runtime';

export function invokeQuery(
  root,
  query,
  {context, ignoreKeys, acceptKeys, ignoreBuiltInKeys} = {}
) {
  if (root === undefined) {
    throw new Error(`'root' parameter is missing`);
  }

  if (query === undefined) {
    throw new Error(`'query' parameter is missing`);
  }

  return invokeExpression(root, parseQuery(query, {ignoreKeys, acceptKeys, ignoreBuiltInKeys}), {
    context
  });
}
