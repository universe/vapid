import { ITemplate, PageType } from '../Database/models/Template';
import { IAlias, ParsedExpr, NeutrinoHelper } from './helpers';
declare type ASTNode = hbs.AST.BlockStatement | hbs.AST.PartialStatement | hbs.AST.PartialBlockStatement | hbs.AST.DecoratorBlock | hbs.AST.Decorator | hbs.AST.MustacheStatement | hbs.AST.ContentStatement | hbs.AST.CommentStatement | hbs.AST.SubExpression | hbs.AST.PathExpression | hbs.AST.StringLiteral | hbs.AST.NumberLiteral | hbs.AST.BooleanLiteral | hbs.AST.Hash | hbs.AST.Program | hbs.AST.Expression | hbs.AST.Statement;
interface IParsedTemplate {
    name: string;
    type: PageType;
    data: Record<string, ITemplate>;
    ast: hbs.AST.Program;
}
/**
 * TemplateCompiler class
 * Used in conjunction with a modified version of Mustache.js (Goatee)
 */
export declare class TemplateCompiler {
    private Handlebars;
    private partials;
    private rawPartials;
    private helpers;
    /**
     * @param {object} partials – The partials to make available in this project.
     * @param {array} helpers - Additional helpers to make available in this project.
     */
    constructor(partials?: Record<string, hbs.AST.Program>, helpers?: Record<string, NeutrinoHelper>);
    static get DATA_SYMBOL(): symbol;
    registerHelper(name: string, helper: NeutrinoHelper): void;
    isHelper(name: string): boolean;
    /**
     * Parses the HTML, and creates a template tree
     *
     * @return {Object} - a representation of the content
     */
    parse(name: string, type: PageType, html: string, data?: Record<string, ITemplate>, _aliases?: Record<string, IAlias>): IParsedTemplate;
    /**
     * Applies content to the template
     *
     * @param {Object} content
     * @return {string} - HTML that has tags replaced with content
     */
    parseFile(filePath: string): IParsedTemplate;
    /**
     * Applies content to the template
     *
     * @param {Object} content
     * @return {string} - HTML that has tags replaced with content
     */
    render(name: string, type: PageType, html: hbs.AST.Program, context?: {}, data?: {}): string;
    /**
     * Applies content to the template
     *
     * @param {Object} content
     * @return {string} - HTML that has tags replaced with content
     */
    renderFile(filePath: string, content?: {}, data?: {}): string;
    /**
     * @private
     *
     * Recursively walks Mustache tokens, and creates a tree that Vapid understands.
     *
     * @param {Object} tree - a memo that holds the total tree value
     * @param {array} branch - Mustache tokens
     * @return {Object} tree of sections, fields, params, etc.
     */
    walk(data: Record<string, ITemplate>, node: ASTNode, aliases?: Record<string, IAlias>): Record<string, ITemplate>;
    parseExpression(node: hbs.AST.MustacheStatement | hbs.AST.PathExpression | hbs.AST.BlockStatement | hbs.AST.MustacheStatement | hbs.AST.SubExpression | hbs.AST.Expression): [ParsedExpr | null, hbs.AST.PathExpression | hbs.AST.Literal | null];
    ensureBranch(data: Record<string, ITemplate>, node: hbs.AST.BlockStatement | hbs.AST.DecoratorBlock, helper: NeutrinoHelper): void;
}
export {};
