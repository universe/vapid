import type { ASTv1 } from '@glimmer/syntax';
import type { IRecordData, ITemplate, IWebsiteMeta, PageType, RuntimeHelper,SerializedRecord } from '@neutrinodev/core';

export type RendererComponentResolver = (name: string) => GlimmerTemplate;
export type GlimmerTemplate = ASTv1.Template;

export { IWebsiteMeta, RuntimeHelper };

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
  templates: Record<string, ITemplate>;
  pages: Record<string, ITemplateAst>;
  components: Record<string, ITemplateAst>;
  stylesheets: Record<string, IStylesheet>;
}

export interface IWebsite {
  meta: IWebsiteMeta;
  hbs: IParsedTemplates;
}

export interface IRenderEnv {
  isDev: boolean;
  isProd: boolean;
}

export type IPageContent = { ['this']: IRecordData } & Record<string, IRecordData | IRecordData[]>;

export interface IPageContext {
  env: IRenderEnv;
  site: IWebsiteMeta;
  content: IPageContent,
  meta: IRecordData;
  page: SerializedRecord | null;
  pages: SerializedRecord[];
  navigation: SerializedRecord[];
  collection: Record<string, IRecordData[]>;
}
