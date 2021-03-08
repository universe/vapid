import { Json } from '@universe/util';
import Router from 'koa-router';
import { Record } from '../../../Database/models/Record';
import Database from '../../../Database';
import { IProvider } from '../../../Database/providers';
interface IKoaContext {
    csrf: string | undefined;
    flash: (type: 'success' | 'error' | 'warning', message: string) => void;
    render: (relPath: string, title: string, locals?: Json) => Promise<void>;
    pages: Record[];
}
interface DashboardOptions {
    local: boolean;
    uploadsDir: string;
    siteName: string;
    sitePaths: {
        root: string;
    };
    liveReload: boolean;
    provider: IProvider;
    db: Database;
}
/**
 * Dashboard
 * Server routes for authenticating, installing, and managing content
 */
export default class Dashboard {
    private db;
    private provider;
    private router;
    private options;
    paths: {
        assets: string;
        views: string;
    };
    /**
     * @param {Object} sharedVars - variables shared by Vapid class
     *
     * @todo Maybe there's a more standard way of sharing with koa-router classes?
     */
    constructor(opts: DashboardOptions);
    /**
     * Returns routes
     */
    get routes(): Router.IMiddleware<any, IKoaContext>;
}
export {};
