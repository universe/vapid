import type { PageType } from '../../Database/types';
import type { ASTv1 } from '@glimmer/syntax';
import type { SimpleDocumentFragment } from '@simple-dom/interface';
import { SafeString } from '../types';

export type HelperResolver = (name: string) => NeutrinoHelper | null;

export type BlockNodes =
    ASTv1.MustacheStatement
  | ASTv1.BlockStatement
  | ASTv1.PartialStatement
  | ASTv1.SubExpression;

export interface NeutrinoHelperOptions {
  fragment?: SimpleDocumentFragment;
  block?: (blockParams?: any[], data?: Record<string, any>) => SimpleDocumentFragment;
  inverse?: (blockParams?: any[], data?: Record<string, any>) => SimpleDocumentFragment;
}

export function appendFragment(root: SimpleDocumentFragment, fragment: SimpleDocumentFragment | undefined) {
  if (!fragment) { return; }
  let head = fragment.firstChild;
  while (head) {
    let el = head;
    head = head.nextSibling;
    root.appendChild(el);
  }
}

export type NeutrinoValue = string | boolean | number | SafeString | SimpleDocumentFragment | null;

export interface NeutrinoHelper {
  isField: boolean;
  isBranch: false | PageType;
  run(params: any[], hash: Record<string, any>, options: NeutrinoHelperOptions): NeutrinoValue;
  getType(expr: ParsedExpr): string | null;
}

export interface ParsedExpr {
  original: string;
  key: string;
  context: string;
  path: string;
  parts: string[];
  hash: Record<string, any>;
  isPrivate: boolean;
  type: string;
}
