import { BaseDirective } from './base';
interface ILinkValue {
    id: string;
    url: string;
    name: string;
    page: number;
}
export default class LinkDirective extends BaseDirective<ILinkValue | null> {
    options: {
        default: null;
        label: string;
        help: string;
        priority: number;
        unfurl: boolean;
        format: string;
    };
    attrs: {
        placeholder: string;
        required: boolean;
    };
    /**
     * Renders an HTML url input
     *
     * @param {string} name
     * @param {string} [value=this.options.default]
     * @return rendered input
     */
    input(name: string, value?: ILinkValue | null): string;
    /**
     * The raw value.
     * Typically, directives escape the value.
     *
     * @param {string} [value=this.options.default]
     * @return {string}
     */
    preview(value?: ILinkValue | null): string;
    /**
     * Renders the link, or optionally an oEmbed
     */
    render(value?: ILinkValue | null): Promise<{
        id: string | undefined;
        url: string | undefined;
        name: string | undefined;
        page: number | undefined;
        description: string | undefined;
        title: string | undefined;
        favicon: string | undefined;
        keywords: string[] | undefined;
        oEmbed: {
            type: "link" | "photo" | "video" | "rich";
            version?: string | undefined;
            title?: string | undefined;
            author_name?: string | undefined;
            author_url?: string | undefined;
            provider_name?: string | undefined;
            provider_url?: string | undefined;
            cache_age?: number | undefined;
            thumbnails?: [{
                url?: string | undefined;
                width?: number | undefined;
                height?: number | undefined;
            }] | undefined;
        } | undefined;
        twitter_card: {
            card: string;
            site?: string | undefined;
            creator?: string | undefined;
            creator_id?: string | undefined;
            title?: string | undefined;
            description?: string | undefined;
            players?: {
                url: string;
                stream?: string | undefined;
                height?: number | undefined;
                width?: number | undefined;
            }[] | undefined;
            apps: {
                iphone: {
                    id: string;
                    name: string;
                    url: string;
                };
                ipad: {
                    id: string;
                    name: string;
                    url: string;
                };
                googleplay: {
                    id: string;
                    name: string;
                    url: string;
                };
            };
            images: {
                url: string;
                alt: string;
            }[];
        } | undefined;
        open_graph: {
            title: string;
            type: string;
            images?: {
                url: string;
                secure_url?: string | undefined;
                type: string;
                width: number;
                height: number;
            }[] | undefined;
            url?: string | undefined;
            audio?: {
                url: string;
                secure_url?: string | undefined;
                type: string;
            }[] | undefined;
            description?: string | undefined;
            determiner?: string | undefined;
            locale: string;
            locale_alt: string;
            videos: {
                url: string;
                stream?: string | undefined;
                height?: number | undefined;
                width?: number | undefined;
                tags?: string[] | undefined;
            }[];
        } | undefined;
        toString(): string;
    }>;
}
export {};
