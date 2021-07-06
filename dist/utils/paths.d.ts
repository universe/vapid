import { IProvider } from '../Database/providers';
import { Record } from '../Database/models/Record';
/**
 * Resolves commonly-used dashboard paths.
 * @return {Object} absolute paths
 */
export declare function getDashboardPaths(): {
    assets: string;
    views: string;
};
/**
 * Validates that a given path is a valid asset path. HTML and s[c|a]ss files are excluded.
 * TODO: Its weird that this will return a string for the human readable error. Fix it.
 *
 * @param {string} path
 * @returns {boolean | string} Will return a string if there is a human readable error.
 */
export declare function isAssetPath(filePath: string): string | boolean;
export declare function getRecordFromPath(permalink: string, db: IProvider): Promise<Record | null>;
