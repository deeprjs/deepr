import {parseQuery} from './parser';
import {invokeExpression} from './runtime';

export function invokeQuery(root, query, context) {
  return invokeExpression(root, parseQuery(query), context);
}
