import Vapid from '../Vapid';
/**
 * This is the Vapid static site builder.
 * The `VapidBuilder` class extends the base `Vapid` project class
 * to enable static site builds. Its single method, `build(dest)`
 * will output compiled static HTML files and static assets
 * for every page and record.
 */
export default class VapidBuilder extends Vapid {
    /**
     * Runs a static build of the Vapid site and builds to the `dest` directory.
     * and registers callbacks
     * TODO: Handle favicons.
     *
     * @param {string}  dest – the build destination directory.
     */
    build(dest: string): Promise<unknown>;
    renderUrl(out: string, url: string): Promise<void>;
}
