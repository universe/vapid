import Koa from 'koa';
/**
 * Resize and crop images
 *
 * @params {Object} paths
 * @return {function}
 */
export default function imageProcessing(paths: {
    data: string;
    www: string;
    cache: string;
}): (ctx: Koa.Context, next: () => void) => Promise<true | void>;
