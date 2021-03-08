import { Template, ITemplate, PageType, IField } from './Template';
import { Record, IRecord} from './Record';

export interface Collection {
  template: Template,
  records: Record[],
}

export {
  Template,
  ITemplate,
  PageType,
  IField,
  Record,
  IRecord,
}
