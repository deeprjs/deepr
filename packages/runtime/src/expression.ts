export type Expression = SingleExpression | SingleExpression[];

export type SingleExpression = {
  sourceKey: string;
  sourceValue?: any;
  isOptional?: boolean;
  params?: any[];
  useCollectionElements?: number | [number?, number?];
  nextExpression?: Expression;
  nestedExpressions?: {[key: string]: Expression};
};
