/* eslint-disable no-console */
import colors from 'colors';

const ARROW = '==>';

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
  static info(str: string) {
    console.log(`${colors.blue(ARROW)} ${str}`.bold);
  }
  /**
   * @static
   *
   * Warnings in bold yellow
   *
   * @param {string} str
   */
  static warn(str: string) {
    console.log(colors.bold.yellow(`WARNING: ${str}`));
  }

  /** @static
   *
   * Tagged information
   *
   * @param {string} tag
   * @param {string} str
   */
  static tagged(tag: string, str: string, color = 'yellow') {
    const formattedTag = colors[color](`[${tag}]`);
    console.log(`  ${formattedTag} ${str}`);
  }

  /**
   * @static
   *
   * Errors in bold red
   *
   * @param {string} err
   */
  static error(err: Error) {
    console.log(colors.bold.red(`ERROR: ${err}`));
  }

  /**
   * @static
   *
   * Additional information with generic formatting, line returns
   *
   * @param {string|array} lines
   */
  static extra(lines: string[] | string) {
    const combined = (Array.isArray(lines) ? lines : [lines]).join('\n');
    console.log(combined);
  }
}
