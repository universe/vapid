import { BaseDirective, DirectiveProps } from './base';

interface CollectionDirectiveValue {
  collectionId: string | null;
  limit: number | null;
  sort: string | null;
  order: 'asc' | 'desc';
}

interface CollectionDirectiveOptions {
  limit: number | undefined;
  min: number | undefined;
  max: number | undefined;
  sort: string | undefined;
  order: 'asc' | 'desc';
}

export default class CollectionDirective extends BaseDirective<CollectionDirectiveValue, CollectionDirectiveOptions> {

  default: CollectionDirectiveValue = {
    collectionId: null,
    limit: null,
    sort: null,
    order: 'desc',
  };

  /**
   * Renders either a text or textarea input
   */
  input({ name, value = this.default }: DirectiveProps<CollectionDirectiveValue>) {
    return <input
      {...this.options}
      type={name?.toLowerCase() === 'content[email]' ? 'email' : 'text'}
      name={name}
      aria-describedby={`help-${name}`}
      value={value.collectionId || ''}
    />;
  }
}
