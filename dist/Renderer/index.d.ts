import Koa from 'koa';
import Vapid from '../runners/Vapid';
/**
 *
 * Renders content into site template
 *
 * @param {string} uriPath
 * @return {string} rendered HTML
 *
 * @todo Use Promise.all when fetching content
 */
export declare function renderContent(this: Vapid, uriPath: string): Promise<string>;
/**
 *
 * Renders error, first by looking in the site directory,
 * then falling back to Vapid own error template.
 *
 * @param {Error} err
 * @param {Object} request
 * @return {[status, rendered]} HTTP status code, and rendered HTML
 */
export declare function renderError(this: any, err: Error, request: Koa.Request): any[];
