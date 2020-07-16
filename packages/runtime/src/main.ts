import {Query} from './query';
import {parseQuery, ParseQueryOptions} from './parser';
import {invokeExpression, InvokeExpressionOptions} from './runtime';

export function invokeQuery(
  root: any,
  query: Query,
  {
    context,
    ignoreKeys,
    acceptKeys,
    ignoreBuiltInKeys,
    authorizer,
    errorHandler
  }: ParseQueryOptions & InvokeExpressionOptions = {}
): unknown {
  if (root === undefined) {
    throw new Error(`The 'root' parameter is missing`);
  }

  if (query === undefined) {
    throw new Error(`The 'query' parameter is missing`);
  }

  const expression = parseQuery(query, {ignoreKeys, acceptKeys, ignoreBuiltInKeys});

  const result = invokeExpression(root, expression, {context, authorizer, errorHandler});

  return result;
}
