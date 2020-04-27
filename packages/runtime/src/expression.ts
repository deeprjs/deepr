export type expression = {
  sourceKey: string;
  sourceValue?: any;
  isOptional?: boolean;
  params?: any[];
  useCollectionElements?: boolean;
  nextExpression?: expression;
  nestedExpressions?: {[key: string]: expression};
};
