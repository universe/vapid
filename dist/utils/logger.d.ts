/**
 * Decorates console.log statements with colors and symbols
 */
export default class Logger {
    /**
     * @static
     *
     * General information messages in bold blue, with ==> arrow
     *
     * @param {string} str
     */
    static info(str: string): void;
    /**
     * @static
     *
     * Warnings in bold yellow
     *
     * @param {string} str
     */
    static warn(str: string): void;
    /** @static
     *
     * Tagged information
     *
     * @param {string} tag
     * @param {string} str
     */
    static tagged(tag: string, str: string, color?: string): void;
    /**
     * @static
     *
     * Errors in bold red
     *
     * @param {string} err
     */
    static error(err: Error): void;
    /**
     * @static
     *
     * Additional information with generic formatting, line returns
     *
     * @param {string|array} lines
     */
    static extra(lines: string[] | string): void;
}
