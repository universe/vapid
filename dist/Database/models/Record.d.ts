import { Json } from "@universe/util";
import { Template } from './Template';
import { IProvider } from "../providers";
export interface IRecord {
    id: number;
    templateId: number;
    content: Json;
    metadata: Json;
    position: number;
    slug: string;
    createdAt: number;
    updatedAt: number;
}
export interface SerializedRecord {
    id: number;
    name: string;
    url: string | null;
    slug: string | null;
    isNavigation: boolean;
    isActive: boolean;
    title: string | null;
    description: string | null;
    redirectUrl: string | null;
    hasSubNav: boolean;
    subNav: SerializedRecord[];
    createdAt: number;
    updatedAt: number;
    hasCollection: boolean;
    template: string;
}
export declare class Record implements IRecord {
    constructor(data: IRecord, template: Template);
    template: Template;
    id: number;
    templateId: number;
    createdAt: number;
    updatedAt: number;
    content: Json;
    metadata: Json;
    position: number;
    slug: string;
    isFirst(): boolean;
    defaultName(): string;
    name(): string;
    defaultSlug(): string;
    safeSlug(): string;
    /**
     * URI path to the individual record
     *
     * @return {string}
     */
    permalink(): string;
    /**
     * Singularized name
     *
     * @return {string}
     */
    nameSingular(): string;
    getMetadata(currentUrl: string, provider?: IProvider): Promise<SerializedRecord>;
    toJSON(): {
        id: number;
        template: {
            id: number;
            name: string;
            sortable: boolean;
            options: Json;
            fields: globalThis.Record<string, import("./Template").IField>;
            type: import("./Template").PageType;
            label: string;
            labelSingular: string;
            typeSingular: string;
            typePlural: string;
            tableColumns: string[];
            tableColumnsHeaders: string[];
            hasFields: boolean;
            sortedFields: import("./Template").IField[];
            isCollection: boolean;
            isPage: boolean;
            hasRecordPage: boolean;
            hasBasePage: boolean;
            hasView: boolean;
        };
        templateId: number;
        content: Json;
        metadata: Json;
        position: number;
        slug: string;
        isFirst: boolean;
        defaultName: string;
        name: string;
        defaultSlug: string;
        safeSlug: string;
        permalink: string;
        nameSingular: string;
    };
}
