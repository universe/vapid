import type { ASTv1 } from '@glimmer/syntax';
import type { IRecord,IRecordData, ITemplate, PageType, SerializedRecord } from '@neutrino/core';

export type RendererComponentResolver = (name: string) => GlimmerTemplate;
export type GlimmerTemplate = ASTv1.Template;
export type RuntimeHelper = () => any;

export interface ITemplateAst {
  name: string;
  type: PageType;
  ast: GlimmerTemplate;
}

export interface IStylesheet {
  id: string;
  path: string;
  content: string;
}

export interface IParsedTemplate {
  name: string;
  type: PageType;
  ast: GlimmerTemplate;
  templates: Record<string, ITemplate>;
  components: Record<string, ITemplateAst>;
  stylesheets: Record<string, IStylesheet>
}

export interface IParsedTemplates {
  pages: Record<string, ITemplateAst>;
  templates: Record<string, ITemplate>;
  components: Record<string, ITemplateAst>;
  stylesheets: Record<string, IStylesheet>;
}

export interface IWebsiteMeta {
  name: string;
  domain: string;
  media: string;
}

export interface IWebsite {
  meta: IWebsiteMeta;
  hbs: IParsedTemplates;
  records: { [recordId: string]: IRecord };
}

export interface IPageContext {
  site: IWebsiteMeta;
  content: { ['this']: IRecordData } & Record<string, IRecordData | IRecordData[]>,
  meta: IRecordData;
  page: SerializedRecord | null;
  pages: SerializedRecord[];
  navigation: SerializedRecord[];
}
