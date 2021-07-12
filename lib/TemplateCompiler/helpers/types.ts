import { PageType } from '../../Database/models/Template';
import { ASTv1 } from '@glimmer/syntax';
import { SimpleDocumentFragment } from '@simple-dom/interface';

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

export interface NeutrinoHelper {
  isField: boolean;
  isBranch: false | PageType;
  run(params: any[], hash: Record<string, any>, options: NeutrinoHelperOptions): string | SimpleDocumentFragment | void;
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

export class SafeString {
  private str: string;
  constructor(str: string) {
    this.str = str;
  }
  toString(): string {
    return '' + this.str;
  }
}