import { NeutrinoHelper } from './types';

const eq = {
  div: (a: number, b: number) => a / b,
  mult: (a: number, b: number) => a * b,
  mod: (a: number, b: number) => a % b,
  sum: (a: number, b: number) => a + b,
  minus: (a: number, b: number) => a - b,
  min: (a: number, b: number) => Math.min(a, b),
  max: (a: number, b: number) => Math.max(a, b),
  ceil: (a: number) => Math.ceil(a),
  floor: (a: number) => Math.floor(a),
};

type MathParams = [method: keyof typeof eq , a: number, b: number];

const MathHelper: NeutrinoHelper = {
  isField: false,
  isBranch: false,
  getType() { return 'math'; },
  run([method, a, b]: MathParams) {
    return `${eq[method](a, b)}`;
  },
}

export default MathHelper;