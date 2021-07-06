"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, privateMap) {
    if (!privateMap.has(receiver)) {
        throw new TypeError("attempted to get private field on non-instance");
    }
    return privateMap.get(receiver);
};
var _records, _templates;
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("fs"));
const models_1 = require("../models");
const types_1 = require("./types");
let AUTO_INCREMENT = 2;
const getNextId = () => AUTO_INCREMENT++;
class MemoryProvider extends types_1.IProvider {
    constructor() {
        super(...arguments);
        _records.set(this, new Map());
        _templates.set(this, new Map());
    }
    start() {
        return __awaiter(this, void 0, void 0, function* () {
            console.info('Starting Memory Provider');
            if (this.config.path) {
                try {
                    const data = JSON.parse(fs.readFileSync(this.config.path, 'utf8'));
                    for (const template of data.templates) {
                        __classPrivateFieldGet(this, _templates).set(template.id || getNextId(), new models_1.Template(template));
                    }
                    for (const record of data.records) {
                        const template = yield this.getTemplateById(record.templateId);
                        template && __classPrivateFieldGet(this, _records).set(record.id, new models_1.Record(record, template));
                    }
                }
                catch (_a) { }
            }
        });
    }
    stop() {
        return __awaiter(this, void 0, void 0, function* () {
            console.info('Stopping Memory Provider');
            if (this.config.path) {
                const data = {
                    templates: [...__classPrivateFieldGet(this, _templates).values()],
                    records: [...__classPrivateFieldGet(this, _records).values()],
                };
                fs.writeFileSync(this.config.path, JSON.stringify(data, null, 2));
            }
        });
    }
    log() {
        console.log({
            templates: [...__classPrivateFieldGet(this, _templates).values()],
            records: [...__classPrivateFieldGet(this, _records).values()],
        });
    }
    getAllTemplates() {
        return __awaiter(this, void 0, void 0, function* () {
            return [...__classPrivateFieldGet(this, _templates).values()];
        });
    }
    getAllRecords() {
        return __awaiter(this, void 0, void 0, function* () {
            return [...__classPrivateFieldGet(this, _records).values()];
        });
    }
    getTemplateById(id) {
        return __awaiter(this, void 0, void 0, function* () {
            return __classPrivateFieldGet(this, _templates).get(id) || null;
        });
    }
    getTemplateByName(name, type) {
        return __awaiter(this, void 0, void 0, function* () {
            for (const [_, template] of __classPrivateFieldGet(this, _templates)) {
                if (template.name === name && template.type === type) {
                    return template;
                }
            }
            return null;
        });
    }
    getTemplatesByType(type) {
        return __awaiter(this, void 0, void 0, function* () {
            const res = [];
            for (const [_, template] of __classPrivateFieldGet(this, _templates)) {
                if (template && template.type === type) {
                    res.push(template);
                }
            }
            return res;
        });
    }
    getRecordById(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const record = __classPrivateFieldGet(this, _records).get(id) || null;
            return record;
        });
    }
    getRecordBySlug(slug) {
        return __awaiter(this, void 0, void 0, function* () {
            for (const [_, record] of __classPrivateFieldGet(this, _records)) {
                if (record.slug === slug || (slug === '' && record.slug === 'index')) {
                    return record;
                }
            }
            return null;
        });
    }
    getRecordsByTemplateId(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const res = [];
            for (const [_, record] of __classPrivateFieldGet(this, _records)) {
                if (record.templateId === id) {
                    res.push(record);
                }
            }
            return res;
        });
    }
    getRecordsByType(type) {
        return __awaiter(this, void 0, void 0, function* () {
            const res = [];
            for (const [_, record] of __classPrivateFieldGet(this, _records)) {
                const template = __classPrivateFieldGet(this, _templates).get(record.templateId);
                if (template && template.type === type) {
                    res.push(record);
                }
            }
            return res;
        });
    }
    getChildren(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const res = [];
            for (const [_, record] of __classPrivateFieldGet(this, _records)) {
                if (record && record.parentId === id) {
                    res.push(record);
                }
            }
            return res;
        });
    }
    /**
     * Update a section's attributes
     * Primarily used by the Vapid module when rebuilding the site
     */
    updateTemplate(update) {
        return __awaiter(this, void 0, void 0, function* () {
            const old = (yield this.getTemplateByName(update.name, update.type)) || null;
            const template = new models_1.Template(update);
            template.id = (old === null || old === void 0 ? void 0 : old.id) || update.id || getNextId();
            __classPrivateFieldGet(this, _templates).set(template.id, template);
            return template;
        });
    }
    /**
     * Update a section's attributes
     * Primarily used by the Vapid module when rebuilding the site
     */
    updateRecord(update) {
        return __awaiter(this, void 0, void 0, function* () {
            const old = (yield this.getRecordById(update.id)) || null;
            const template = yield this.getTemplateById(update.templateId);
            if (!template) {
                throw new Error(`Error creating record. Unknown template id ${update.templateId}`);
            }
            const record = new models_1.Record(update, template);
            record.id = (old === null || old === void 0 ? void 0 : old.id) || update.id || getNextId();
            console.log(old, update, record);
            record.updatedAt = Date.now();
            record.createdAt = record.createdAt || Date.now();
            __classPrivateFieldGet(this, _records).set(record.id, record);
            return record;
        });
    }
    deleteTemplate(templateId) {
        return __awaiter(this, void 0, void 0, function* () {
            __classPrivateFieldGet(this, _templates).delete(templateId);
        });
    }
    deleteRecord(recordId) {
        return __awaiter(this, void 0, void 0, function* () {
            __classPrivateFieldGet(this, _records).delete(recordId);
        });
    }
}
exports.default = MemoryProvider;
_records = new WeakMap(), _templates = new WeakMap();
//# sourceMappingURL=MemoryProvider.js.map