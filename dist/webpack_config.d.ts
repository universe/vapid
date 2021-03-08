import sass from 'sass';
/**
 * Dynamic config for Webpack
 *
 * @param {string} options
 * @return {Object} Webpack configuration
 */
export default function config(mode?: string, assets?: string[], modules?: string[], outputDir?: boolean): {
    mode: string;
    context: string;
    entry: Record<string, any>;
    output: {
        filename: string;
        path: string;
    } | {
        filename?: undefined;
        path?: undefined;
    };
    devtool: string | boolean;
    target: string;
    module: {
        rules: {
            test: RegExp;
            use: ({
                loader: any;
                options?: undefined;
            } | {
                loader: string;
                options: {
                    url: boolean;
                    sourceMap: boolean;
                    implementation?: undefined;
                };
            } | {
                loader: string;
                options: {
                    implementation: typeof sass;
                    sourceMap: boolean;
                    url?: undefined;
                };
            })[];
        }[];
    };
    plugins: any[];
    resolve: {
        modules: string[];
    };
};
