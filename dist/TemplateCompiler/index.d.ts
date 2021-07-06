import { PageType } from '../Database/models/Template';
import { NeutrinoHelper } from './helpers';
import { ComponentResolver, IParsedTemplate, GlimmerTemplate } from './types';
/**
 * TemplateCompiler class
 * Used in conjunction with a modified version of Mustache.js (Goatee)
 */
export declare class TemplateCompiler {
    private helpers;
    private resolveComponent;
    static get DATA_SYMBOL(): symbol;
    /**
     * @param {object} partials – The partials to make available in this project.
     * @param {array} helpers - Additional helpers to make available in this project.
     */
    constructor(resolveComponent?: ComponentResolver, helpers?: Record<string, NeutrinoHelper>);
    registerHelper(name: string, helper: NeutrinoHelper): void;
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
    renderFile(filePath: string, content?: {}, data?: {}): string;
    render(name: string, type: PageType, ast: GlimmerTemplate | string, content?: {}, data?: {}): string;
}
