export type Expression = {
  sourceKey: string;
  sourceValue?: any;
  isOptional?: boolean;
  params?: any[];
  useCollectionElements?: boolean;
  nextExpression?: Expression;
  nestedExpressions?: {[key: string]: Expression};
};
