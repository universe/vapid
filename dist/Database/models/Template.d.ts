import { Json } from "@universe/util";
export declare const enum PageType {
    SETTINGS = "settings",
    COLLECTION = "collection",
    PAGE = "page",
    COMPONENT = "component"
}
export interface IField {
    type: string;
    priority: number;
    label: string;
    key: string;
    options: Record<string, string | number | boolean | null>;
}
export interface ITemplate {
    id?: number;
    name: string;
    sortable: boolean;
    options: Json;
    fields: Record<string, IField>;
    type: PageType;
}
export declare class Template implements ITemplate {
    id: number;
    name: string;
    sortable: boolean;
    options: Json;
    fields: Record<string, IField>;
    type: PageType;
    constructor(data: ITemplate);
    static identifier(template: ITemplate): string;
    /**
     * Generates a user-friendly label
     * Allows template to override default behavior
     *
     * @return {string}
     */
    label(): string;
    /**
     * Singularized label
     *
     * @return {string}
     */
    labelSingular(): string;
    /**
     * Singularized type
     *
     * @return {string}
     */
    typeSingular(): string;
    /**
     * Pluralized type
     *
     * @return {string}
     */
    typePlural(): string;
    /**
     * Table column
     * Primarily used by dashboard index page
     *
     * @return {array} first three fields
     */
    tableColumns(): string[];
    /**
     * User-friendly headers for table columns
     *
     * @return {array}
     */
    tableColumnsHeaders(): string[];
    /**
     * Quick way to check if Template has any fields
     *
     * @return {boolean}
     */
    hasFields(): boolean;
    /**
     * Sort fields by priority
     *
     * @return {array}
     */
    sortedFields(): IField[];
    isCollection(): boolean;
    isPage(): boolean;
    hasRecordPage(): boolean;
    hasBasePage(): boolean;
    /**
     * If this template has a backing view to render a dedicated page.
     *
     * @return {boolean}
     */
    hasView(): boolean;
    toJSON(): {
        id: number;
        name: string;
        sortable: boolean;
        options: Json;
        fields: Record<string, IField>;
        type: PageType;
        label: string;
        labelSingular: string;
        typeSingular: string;
        typePlural: string;
        tableColumns: string[];
        tableColumnsHeaders: string[];
        hasFields: boolean;
        sortedFields: IField[];
        isCollection: boolean;
        isPage: boolean;
        hasRecordPage: boolean;
        hasBasePage: boolean;
        hasView: boolean;
    };
}
