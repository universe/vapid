/**
 * Helper functions, mostly an extension of Lodash
 */
declare const Utils: {
    /**
     * Copy a single file
     * and render variables via EJS
     *
     * @param {string} from - the originating path, where to copy from
     * @param {string} to - the destination path, where to copy to
     * @param {Object} data - replacement data for EJS render
     */
    copyFile(from: string, to: string, data?: {}): void;
    /**
     * Recursively copy files from one directory to another,
     * and render variables via EJS
     *
     * @param {string} from - the originating path, where to copy from
     * @param {string} to - the destination path, where to copy to
     * @param {Object} data - replacement data for EJS render
     */
    copyFiles(from: string, to: string, data?: {}): void;
    /**
     * Recursively remove a path
     *
     * @param {string} path
     */
    removeFiles(path: string): void;
};
export default Utils;
