import { ASTv1 } from '@glimmer/syntax';
import { ITemplate, PageType } from '../Database/models/Template';

import { NeutrinoHelper } from './helpers/types';

export { NeutrinoHelper };
export type HelperMap = Record<string, NeutrinoHelper>;

export const DATA_SYMBOL = Symbol('HELPER_DATA');

export type ComponentResolver = (name: string) => string;

export type GlimmerTemplate = ASTv1.Template;

export interface IParsedTemplate {
  name: string;
  type: PageType;
  data: Record<string, ITemplate>
  ast: GlimmerTemplate,
}
