import { IRecord, ITemplate, NAVIGATION_GROUP_ID,PageType, Template } from "@neutrinodev/core";

export function getTemplate(type: PageType | null = null, name: string | null = '', templates: ITemplate[] = []) {
  if (!name || !type) { return null; }
  for (const template of templates) {
    if (template.type === type && template.name === name) { return template; }
  }
  return null;
}

export function settingFor(template: ITemplate, records: IRecord[] = []) {
  const id = Template.id(template);
  if (!id) { return null; }
  for (const record of records) {
    if (record.templateId === id) { return record; }
  }
  return null;
}

export function getRecordById(records: IRecord[] = [], id: string | null = null) {
  if (!id) { return null; }
  for (const record of records) {
    if (record.id === id) { return record; }
  }
  return null;
}

export function getRecord(records: IRecord[] = [], templateId: string, slug: string | null = null, parentSlug: string | null = null) {
  if (!slug) { return null; }
  for (const record of records) {
    if (
      record.slug === slug &&
      record.templateId === templateId &&
      !record.deletedAt &&
      ((!parentSlug && (!record.parentId || record.parentId === NAVIGATION_GROUP_ID)) || getRecordById(records, record.parentId)?.slug === parentSlug)
    ) { return record; }
  }
  return null;
}

export function templateFor(record: IRecord | null, templates: ITemplate[]): ITemplate | null {
  if (!record) { return null; }
  for (const template of templates) {
    if (record.templateId === Template.id(template)) { return template; }
  }
  return null;
}

export function collectionFor(template: ITemplate | null, templates: ITemplate[]): ITemplate | null {
  if (!template) { return null; }
  for (const other of templates) {
    if (template.name === other.name && other.type === PageType.COLLECTION) { return template; }
  }
  return null;
}

export function scrollToEdit() {
  const el = document.getElementById('vapid-menu') as HTMLElement;
  el.scrollTo({ left: el.scrollWidth, behavior: 'smooth' });
}

export function scrollToNav() {
  document.getElementById('vapid-menu')?.scrollTo({ left: 0, behavior: 'smooth' });
}