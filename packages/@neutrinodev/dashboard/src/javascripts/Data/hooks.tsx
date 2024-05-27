import { BaseHelper, IRecord, ITemplate, NAVIGATION_GROUP_ID, PageType, Template } from '@neutrinodev/core';
import { IWebsite } from '@neutrinodev/runtime';
import { ComponentChildren, createContext } from 'preact';
import { useEffect, useState } from 'preact/hooks';

import { DataAdapter } from './adapter.js';

export const DataContext = createContext<{
  adapter: DataAdapter | null;
  theme: IWebsite | null;
  domain: string;
  isLocal: boolean;

  loading: boolean | string;
  records: Record<string, IRecord>;
  templates: Record<string, ITemplate>;

  // Convenience Template Getters
  getTemplateById:(templateId?: string | null) => ITemplate | null;
  findTemplate: (type?: PageType | null, name?: string | null) => ITemplate | null;
  templateFor: (record?: IRecord | null) => ITemplate | null;
  collectionFor: (template?: ITemplate | null) => ITemplate | null;

  // Convenience Record Getters
  settingFor: (template?: ITemplate | null) => IRecord | null;
  getRecordById: (id?: string | null) => IRecord | null;
  getRecord: (slug?: string | null, parentSlug?: string | null, templateId?: string | null) => IRecord | null;
}>({
  adapter: null,
  theme: null,
  domain: '',
  isLocal: false,

  loading: true,
  records: {},
  templates: {},

  getTemplateById: () => null,
  findTemplate: () => null,
  templateFor: () => null,
  collectionFor: () => null,
  settingFor: () => null,
  getRecordById: () => null,
  getRecord: () => null,
});

function getTemplateById(templates: Record<string, ITemplate> = {}, templateId: string | null = ''): ITemplate | null {
  if (!templateId) { return null; }
  return templates[templateId] || null;
}

function findTemplate(templates: Record<string, ITemplate> = {}, type: PageType | null = null, name: string | null = '') {
  if (!name || !type) { return null; }
  for (const template of Object.values(templates)) {
    if (template.type === type && template.name === name) { return template; }
  }
  return null;
}

function templateFor(templates: Record<string, ITemplate> = {}, record?: IRecord | null): ITemplate | null {
  if (!record) { return null; }
  for (const template of Object.values(templates)) {
    if (record.templateId === Template.id(template)) { return template; }
  }
  return null;
}

function collectionFor(templates: Record<string, ITemplate> = {}, template: ITemplate | null): ITemplate | null {
  if (!template) { return null; }
  for (const other of Object.values(templates)) {
    if (template.name === other.name && other.type === PageType.COLLECTION) { return template; }
  }
  return null;
}

function settingFor(records: Record<string, IRecord> = {}, template: ITemplate | null = null) {
  if (!template) { return; }
  const id = Template.id(template);
  if (!id) { return null; }
  for (const record of Object.values(records)) {
    if (record.templateId === id) { return record; }
  }
  return null;
}

function getRecordById(records: Record<string, IRecord> = {}, id: string | null = null) {
  if (!id) { return null; }
  for (const record of Object.values(records)) {
    if (record.id === id) { return record; }
  }
  return null;
}

function getRecord(records: Record<string, IRecord> = {}, slug: string | null = null, parentSlug: string | null = null, templateId: string) {
  if (!slug) { return null; }
  for (const record of Object.values(records)) {
    if (
      record.slug === slug &&
      record.templateId === templateId &&
      !record.deletedAt &&
      ((!parentSlug && (!record.parentId || record.parentId === NAVIGATION_GROUP_ID)) || getRecordById(records, record.parentId)?.slug === parentSlug)
    ) { return record; }
  }
  return null;
}

export function DataContextProvider({ adapter, children }: { adapter: DataAdapter, children: ComponentChildren }) {
  const [ theme, setTheme ] = useState<IWebsite | null>(null);
  const [ records, setRecords ] = useState<Record<string, IRecord>>({});
  const [ loading, setLoading ] = useState<boolean | string>(true);
  const [ isLocal, setIsLocal ] = useState<boolean>(false);

  useEffect(() => {
    const cb = () => adapter.getAllRecords().then(setRecords);
    adapter.on('change', cb);
    return () => adapter.off('change', cb);
  }, [adapter]);

  // Once we have an adapter initialized, fetch our site data.
  useEffect(() => {
    (async () => {
      setLoading(true);
      if (!adapter) { return; }
      try {
        await adapter?.init();
        BaseHelper.registerFileHandler(adapter.saveFile.bind(adapter));
      }
      catch (err) {
        console.error(err);
        setLoading("Error Connecting to Database");
        return;
      }

      // Attempt to bind to a livereload port to get site template updates in dev mode.
      try {
        await new Promise<void>((resolve, reject) => {
          const ws = new WebSocket(`ws://localhost:1777/livereload`);
          ws.onopen = () => { setIsLocal(true); resolve(); };
          ws.onclose = () => { reject(); };
          ws.onmessage = (evt) => {
            const { command, data } = JSON.parse(evt.data) as { command: string; data: IWebsite; };
            console.log(`[WebSocket ${command}]`, data);
            switch (command) {
              case 'update': setTheme({ ...data });
            }
          };
        });
      }

      // If a local theme server connection can't be made, fetch from prod.
      catch {
        try {
          setTheme(await adapter.getTheme());
        }
        catch (err) {
          console.error(err);
          setLoading("Error Loading Site Theme");
          return;
        }
      }

      try {
        setRecords(await adapter.getAllRecords());
      }
      catch (err) {
        console.error(err);
        setLoading("Error Loading Site Content");
        return;
      }

      setLoading(false);
    })();
  }, [adapter]);

  const templates = theme?.hbs?.templates || {};
  const domain = adapter.getDomain();

  return <DataContext.Provider
    value={{
      adapter,
      theme,
      loading,
      isLocal,

      domain,
      records,
      templates,

      // Site theme query helpers.
      getTemplateById: getTemplateById.bind(null, templates),
      findTemplate: findTemplate.bind(null, templates),
      templateFor: templateFor.bind(null, templates),
      collectionFor: collectionFor.bind(null, templates),
      settingFor: settingFor.bind(null, records),
      getRecordById: getRecordById.bind(null, records),
      getRecord: getRecord.bind(null, records),
    }}
  >
    {children}
  </DataContext.Provider>;
}
