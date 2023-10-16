import { compileExpression as compileExpressionOrig, useDotAccessOperatorAndOptionalChaining } from 'filtrex';

export function compileExpression(expr: string) {
  return compileExpressionOrig(expr, {
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    customProp(name: string, get: (name: string) => any, object: any, type: 'unescaped' | 'single-quoted') {
      const value = useDotAccessOperatorAndOptionalChaining(name, get, object, type);
      return value?.src?.startsWith('data:') ? undefined : value;
    },
  });
}
