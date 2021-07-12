import { describe, it } from '@jest/globals';
import { PageType, stampRecord } from '../models';
import { stampTemplate, stampField } from '../models/Template';
import { IProvider } from './types';

export default function test(name: string, provider: IProvider, purge: () => Promise<void>) {
  beforeEach(async () => {
    await purge();
    await provider.start();
  });

  afterEach(async () => {
    await provider.stop();
  });

  describe(`${name} Database Provider`, () => {

    it('Starts and Stops', async () => {
      await provider.start();
      await provider.stop();
      expect(1);
    });

    it('Purge Function Works', async () => {
      expect((await provider.getAllTemplates()).length).toEqual(0);
      expect((await provider.getAllRecords()).length).toEqual(0);
      await provider.updateTemplate(stampTemplate({ id : 0 }));
      await provider.updateRecord(stampRecord({ id : 0, templateId: 0 }));
      expect((await provider.getAllRecords()).length).toEqual(1);
      expect((await provider.getAllTemplates()).length).toEqual(1);
      await purge();
      expect((await provider.getAllRecords()).length).toEqual(0);
      expect((await provider.getAllTemplates()).length).toEqual(0);
    });
  });

  describe(`${name} Database Provider | Templates`, () => {
    it('Get Template By ID Returns Null For Missing Template', async () => {
      await provider.start();
      const tmpl = await provider.getTemplateById(0);
      expect(tmpl).toBe(null);
      await provider.stop();
    });

    it('Get Template By ID Retrieves a Single Template', async () => {
      const tmpl = stampTemplate({ id: 0 });
      expect(await provider.getTemplateById(0)).toBe(null);
      await provider.updateTemplate(tmpl);
      expect(await provider.getTemplateById(0)).toBe(tmpl);
    });

    it('Get Template By Name Returns Null For Missing Template', async () => {
      const tmpl = await provider.getTemplateByName('test', PageType.PAGE);
      expect(tmpl).toBe(null);
    });

    it('Get Template By Name Retrieves a Single Template', async () => {
      const tmpl = stampTemplate({ id: 0, name: 'test', type: PageType.COLLECTION });
      expect(await provider.getTemplateByName('test', PageType.COLLECTION)).toBe(null);
      await provider.updateTemplate(tmpl);
      expect(await provider.getTemplateByName('test', PageType.COLLECTION)).toBe(tmpl);
      expect(await provider.getTemplateByName('other-test', PageType.COLLECTION)).toBe(null);
      expect(await provider.getTemplateByName('test', PageType.PAGE)).toBe(null);
    });

    it('Get Templates By Type Returns Empty Array When No Templates Match', async () => {
      const templates = await provider.getTemplatesByType(PageType.PAGE);
      expect(templates).toStrictEqual([]);
    });

    it('Get Template By Type Retrieves Matching Templates', async () => {
      const tmpl1 = stampTemplate({ id: 0, name: 'test', type: PageType.COLLECTION });
      const tmpl2 = stampTemplate({ id: 1, name: 'test', type: PageType.PAGE });
      const tmpl3 = stampTemplate({ id: 2, name: 'test-2', type: PageType.PAGE });
      const tmpl4 = stampTemplate({ id: 3, name: 'test-2', type: PageType.SETTINGS });
      await provider.updateTemplate(tmpl1);
      await provider.updateTemplate(tmpl2);
      await provider.updateTemplate(tmpl3);
      await provider.updateTemplate(tmpl4);
      expect(await provider.getTemplatesByType(PageType.COLLECTION)).toStrictEqual([tmpl1]);
      expect(await provider.getTemplatesByType(PageType.PAGE)).toStrictEqual([tmpl2, tmpl3]);
      expect(await provider.getTemplatesByType(PageType.SETTINGS)).toStrictEqual([tmpl4]);
    });

    it('Get All Template Retrieves All Templates', async () => {
      const tmpl1 = stampTemplate({ id: 0, name: 'test', type: PageType.COLLECTION });
      const tmpl2 = stampTemplate({ id: 1, name: 'test', type: PageType.PAGE });
      const tmpl3 = stampTemplate({ id: 2, name: 'test-2', type: PageType.PAGE });
      const tmpl4 = stampTemplate({ id: 3, name: 'test-2', type: PageType.SETTINGS });
      await provider.updateTemplate(tmpl1);
      await provider.updateTemplate(tmpl2);
      await provider.updateTemplate(tmpl3);
      await provider.updateTemplate(tmpl4);
      expect(await provider.getAllTemplates()).toStrictEqual([tmpl1, tmpl2, tmpl3, tmpl4]);
    });

    it('Update Template Creates New Template', async () => {
      const tmpl1 = stampTemplate({ id: 0 });
      const tmpl2 = stampTemplate({ id: 1, type: PageType.SETTINGS });

      await provider.updateTemplate(tmpl1);
      await provider.updateTemplate(tmpl2);
      const templates = await provider.getAllTemplates();
      expect(templates).toStrictEqual([ tmpl1, tmpl2 ]);
    });

    it('Update Template Enforces Unique Template Name and Type', async () => {
      const tmpl1 = stampTemplate({ id: 0, name: 'duplicate', type: PageType.SETTINGS });
      const tmpl2 = stampTemplate({ id: 1, name: 'duplicate', type: PageType.SETTINGS });

      await provider.updateTemplate(tmpl1);
      expect(provider.updateTemplate(tmpl2)).rejects;
    });

    it('Update Template Updates an Existing Template', async () => {
      const tmpl1 = stampTemplate({ id: 0, name: 'name', type: PageType.SETTINGS });
      const tmpl2 = stampTemplate({
        id: 0,
        name: 'new-name',
        type: PageType.SETTINGS,
        fields: { field: stampField({ key: 'field' }) },
        options: { foo: 'bar' },
        sortable: true,
      });

      await provider.updateTemplate(tmpl1);
      await provider.updateTemplate(tmpl2);
      const updated = await provider.getTemplateById(0);
      expect(updated?.name).toStrictEqual('new-name');
      expect(tmpl2).toStrictEqual(updated);
    });

    it('Update Template Updates an Existing Template When No ID Passed But Name and Type Match', async () => {
      const tmpl1 = stampTemplate({ id: 0, name: 'name', type: PageType.SETTINGS });
      const tmpl2 = stampTemplate({
        id: NaN,
        name: 'name',
        type: PageType.SETTINGS,
        fields: { field: stampField({ key: 'field' }) },
        options: { foo: 'bar' },
        sortable: true,
      });
  
      await provider.updateTemplate(tmpl1);
      await provider.updateTemplate(tmpl2);
      const updated = await provider.getTemplateById(0);
      expect(updated?.name).toStrictEqual('name');
      expect(updated?.sortable).toStrictEqual(true);
      expect(tmpl2).toStrictEqual(updated);
    });

    it('Delete Template Deletes a Template', async () => {
      const tmpl = stampTemplate({ id: 0, name: 'duplicate', type: PageType.SETTINGS });
      expect(await provider.getTemplateById(0)).toEqual(null);
      await provider.updateTemplate(tmpl);
      expect(await provider.getTemplateById(0)).toEqual(tmpl);
      await provider.deleteTemplate(0);
      expect(await provider.getTemplateById(0)).toEqual(null);
    });

  });


  describe(`${name} Database Provider | Records`, () => {
    it('Get Record By ID Returns Null For Missing Record', async () => {
      await provider.start();
      const tmpl = await provider.getRecordById(0);
      expect(tmpl).toBe(null);
      await provider.stop();
    });

    it('Get Record By ID Retrieves a Single Record', async () => {
      const tmpl = stampTemplate({ id: 0 });
      const rec = stampRecord({ id: 0, templateId: 0 });
      expect(await provider.getRecordById(0)).toBe(null);
      await provider.updateTemplate(tmpl);
      await provider.updateRecord(rec);
      expect(await provider.getRecordById(0)).toBe(rec);
    });

    it('Get Record By Slug Returns Null For Missing Record', async () => {
      expect(await provider.getRecordBySlug('/missing')).toBe(null);
    });

    it.skip('Get Record By Slug Retrieves Matching Record', async () => {
      const tmpl = stampTemplate({ id: 0, name: 'test', type: PageType.COLLECTION });
      expect(await provider.getTemplateByName('test', PageType.COLLECTION)).toBe(null);
      await provider.updateTemplate(tmpl);
      expect(await provider.getTemplateByName('test', PageType.COLLECTION)).toBe(tmpl);
      expect(await provider.getTemplateByName('other-test', PageType.COLLECTION)).toBe(null);
      expect(await provider.getTemplateByName('test', PageType.PAGE)).toBe(null);
    });

    it('Get Record By Template ID Returns Empty Array When No Records Match', async () => {
      expect(await provider.getRecordsByTemplateId(0)).toStrictEqual([]);
    });

    it('Get Record By Template ID Retrieves Matching Records', async () => {
      const tmpl1 = stampTemplate({ id: 0, name: 'test', type: PageType.PAGE });
      const tmpl2 = stampTemplate({ id: 1, name: 'test', type: PageType.COLLECTION });
      await provider.updateTemplate(tmpl1);
      await provider.updateTemplate(tmpl2);
      const rec1 = stampRecord({ id: 0, templateId: 0 });
      const rec2 = stampRecord({ id: 1, templateId: 1 });
      const rec3 = stampRecord({ id: 2, templateId: 1 });
      const rec4 = stampRecord({ id: 3, templateId: 1 });
      await provider.updateRecord(rec1);
      await provider.updateRecord(rec2);
      await provider.updateRecord(rec3);
      await provider.updateRecord(rec4);
      expect(await provider.getRecordsByTemplateId(0)).toStrictEqual([rec1]);
      expect(await provider.getRecordsByTemplateId(1)).toStrictEqual([rec2, rec3, rec4]);
    });

    it('Get Records By Type Returns Empty Array When No Records Match', async () => {
      expect(await provider.getRecordsByType(PageType.PAGE)).toStrictEqual([]);
    });

    it('Get Record By Template ID Retrieves Matching Records', async () => {
      const tmpl1 = stampTemplate({ id: 0, name: 'test', type: PageType.PAGE });
      const tmpl2 = stampTemplate({ id: 1, name: 'test', type: PageType.COLLECTION });
      await provider.updateTemplate(tmpl1);
      await provider.updateTemplate(tmpl2);
      const rec1 = stampRecord({ id: 0, templateId: 0 });
      const rec2 = stampRecord({ id: 1, templateId: 1 });
      const rec3 = stampRecord({ id: 2, templateId: 1 });
      const rec4 = stampRecord({ id: 3, templateId: 1 });
      await provider.updateRecord(rec1);
      await provider.updateRecord(rec2);
      await provider.updateRecord(rec3);
      await provider.updateRecord(rec4);
      expect(await provider.getRecordsByType(PageType.PAGE)).toStrictEqual([rec1]);
      expect(await provider.getRecordsByType(PageType.COLLECTION)).toStrictEqual([rec2, rec3, rec4]);
      expect(await provider.getRecordsByType(PageType.SETTINGS)).toStrictEqual([]);
    });

    it('Update Record Creates New Record', async () => {
      const tmpl1 = stampTemplate({ id: 0 });
      const rec1 = stampRecord({ id: 1, templateId: 0 });

      await provider.updateTemplate(tmpl1);
      await provider.updateRecord(rec1);
      expect(await provider.getAllRecords()).toStrictEqual([ rec1 ]);
    });

    it.skip('Get Children Retrieves Children Records', async () => {
      expect(1).toEqual(1);
    });

    it('Get All Records Retrieves All Records', async () => {
      const tmpl1 = stampTemplate({ id: 0, name: 'test', type: PageType.PAGE });
      const tmpl2 = stampTemplate({ id: 1, name: 'test', type: PageType.COLLECTION });
      await provider.updateTemplate(tmpl1);
      await provider.updateTemplate(tmpl2);
      const rec1 = stampRecord({ id: 0, templateId: 0 });
      const rec2 = stampRecord({ id: 1, templateId: 1 });
      const rec3 = stampRecord({ id: 2, templateId: 1 });
      const rec4 = stampRecord({ id: 3, templateId: 1 });
      await provider.updateRecord(rec1);
      await provider.updateRecord(rec2);
      await provider.updateRecord(rec3);
      await provider.updateRecord(rec4);
      expect(await provider.getAllRecords()).toStrictEqual([rec1, rec2, rec3, rec4]);
    });

    it.skip('Update Record Enforces Unique Slug and Template', async () => {
      const tmpl1 = stampTemplate({ id: 0, name: 'duplicate', type: PageType.SETTINGS });
      const tmpl2 = stampTemplate({ id: 1, name: 'duplicate', type: PageType.SETTINGS });

      await provider.updateTemplate(tmpl1);
      expect(provider.updateTemplate(tmpl2)).rejects;
    });

    it.skip('Update Record Updates an Existing Record', async () => {
      const tmpl1 = stampTemplate({ id: 0, name: 'name', type: PageType.SETTINGS });
      const tmpl2 = stampTemplate({
        id: 0,
        name: 'new-name',
        type: PageType.SETTINGS,
        fields: { field: stampField({ key: 'field' }) },
        options: { foo: 'bar' },
        sortable: true,
      });

      await provider.updateTemplate(tmpl1);
      await provider.updateTemplate(tmpl2);
      const updated = await provider.getTemplateById(0);
      expect(updated?.name).toStrictEqual('new-name');
      expect(tmpl2).toStrictEqual(updated);
    });

    it.skip('Update Record Matches by Slug and Template if no ID provided', async () => {
      const tmpl1 = stampTemplate({ id: 0, name: 'name', type: PageType.SETTINGS });
      const tmpl2 = stampTemplate({
        id: NaN,
        name: 'name',
        type: PageType.SETTINGS,
        fields: { field: stampField({ key: 'field' }) },
        options: { foo: 'bar' },
        sortable: true,
      });
  
      await provider.updateTemplate(tmpl1);
      await provider.updateTemplate(tmpl2);
      const updated = await provider.getTemplateById(0);
      expect(updated?.name).toStrictEqual('name');
      expect(updated?.sortable).toStrictEqual(true);
      expect(tmpl2).toStrictEqual(updated);
    });

    it('Delete Record Deletes a Record', async () => {
      const tmpl = stampTemplate({ id: 0, type: PageType.SETTINGS });
      const rec = stampRecord({ id: 0, templateId: 0 });
      await provider.updateTemplate(tmpl);
      expect(await provider.getRecordById(0)).toEqual(null);
      await provider.updateRecord(rec);
      expect(await provider.getRecordById(0)).toEqual(rec);
      await provider.deleteRecord(0);
      expect(await provider.getRecordById(0)).toEqual(null);
    });
  });

  // abstract getAllTemplates(): Promise<Template[]>;
  // abstract getAllRecords(): Promise<Record[]>;

  // abstract getTemplateById(id: number): Promise<Template | null>;
  // abstract getTemplateByName(name: string, type: PageType): Promise<Template | null>;
  // abstract getTemplatesByType(type: PageType): Promise<Template[]>;

  // abstract getRecordById(id: number): Promise<Record | null>;
  // abstract getRecordBySlug(slug: string): Promise<Record | null>;
  // abstract getRecordsByTemplateId(id: number): Promise<Record[]>;
  // abstract getRecordsByType(type: PageType): Promise<Record[]>;
  // abstract getChildren(id: number): Promise<Record[]>;

  // abstract updateTemplate(template: ITemplate): Promise<Template>;
  // abstract updateRecord(record: IRecord): Promise<Record>;

  // abstract deleteTemplate(templateId: number): Promise<void>;
  // abstract deleteRecord(recordId: number): Promise<void>;
}