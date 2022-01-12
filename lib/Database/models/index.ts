import { Template } from './Template';
import { Record } from './Record';
import { ITemplate, PageType, IField, isPageType, stampField, stampTemplate, SerializedRecord, IRecord, stampRecord, mergeField, sortRecords, sortTemplates } from '../types';

export {
  Template,
  ITemplate,
  PageType,
  IField,
  Record,
  IRecord,
  SerializedRecord,
  isPageType,
  stampRecord,
  stampField,
  stampTemplate,
  mergeField,
  sortRecords,
  sortTemplates,
}

export const NAVIGATION_GROUP_ID = 'navigation';
export const GENERAL_SETTINGS_ID = 'general';
export const INDEX_PAGE_ID = 'index';