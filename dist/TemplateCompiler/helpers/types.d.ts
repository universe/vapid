import { SafeString } from 'handlebars';
import { PageType } from '../../Database/models/Template';
export interface IAlias {
    name: string;
    type: PageType;
    isPrivate: boolean;
}
export declare type BlockNodes = hbs.AST.MustacheStatement | hbs.AST.BlockStatement | hbs.AST.PartialStatement | hbs.AST.PartialBlockStatement | hbs.AST.SubExpression;
export interface NeutrinoHelper {
    isField: boolean;
    isBranch: false | PageType;
    run(...args: any[]): string | SafeString;
    blockParam(idx: number, node: BlockNodes): IAlias | undefined;
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
