import type { ASTv1 } from '@glimmer/syntax';
import type { Json } from '@universe/util';
import type { SerializedRecord } from '../Database/types';
import type { ITemplate, PageType } from '../Database/models';

import { NeutrinoHelper } from './helpers/types';

export { NeutrinoHelper };

export const RECORD_META = '@record';
export type IRecordData = { [RECORD_META]: SerializedRecord } & Json;

export type RendererComponentResolver = (name: string) => GlimmerTemplate;
export type GlimmerTemplate = ASTv1.Template;
export type RuntimeHelper = () => any;

export class SafeString {
  private str: string;
  constructor(str: string) {
    this.str = str;
  }
  toString(): string {
    return '' + this.str;
  }
}

export interface ITemplateAst {
  name: string;
  type: PageType;
  ast: GlimmerTemplate;
}

export interface IParsedTemplate {
  name: string;
  type: PageType;
  ast: GlimmerTemplate;
  templates: Record<string, ITemplate>;
  components: Record<string, ITemplateAst>;
}

export function parsedTemplateToAst(template: IParsedTemplate): ITemplateAst {
  return {
    name: template.name,
    type: template.type,
    ast: template.ast,
  };
}

export interface IParsedTemplates {
  pages: Record<string, ITemplateAst>;
  templates: Record<string, ITemplate>;
  components: Record<string, ITemplateAst>;
}

export interface IMedia {
  host: string;
}

export interface ISite {
  name: string;
  domain: string;
}

export interface IPageContext {
  site: ISite;
  media: IMedia;
  content: { ['this']: IRecordData } & Record<string, IRecordData | IRecordData[]>,
  meta: IRecordData;
  page: SerializedRecord | null;
  pages: SerializedRecord[];
  navigation: SerializedRecord[];
}
