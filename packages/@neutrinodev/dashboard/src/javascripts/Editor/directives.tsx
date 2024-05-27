import { BaseHelper, DirectiveField, DirectiveMeta, IField, IRecord } from '@neutrinodev/core';
import { IPageContext, resolveHelper, UnknownHelper } from '@neutrinodev/runtime';
import { toTitleCase } from '@universe/util';
import { ComponentChildren, createElement } from 'preact';

const DIRECTIVE_CACHE: Record<string, InstanceType<UnknownHelper> | null> = {};
export function findDirective(type: 'page' | 'metadata' | 'content', domain: string, key: string, field: DirectiveField, meta: DirectiveMeta): InstanceType<UnknownHelper> | null {
  let helper = resolveHelper(field.type);
  if (!helper) {
    console.warn(`Directive type '${field.type}' does not exist. Falling back to 'text'`);
    helper = resolveHelper('text');
  }
  const cacheKey = `${meta.templateId}_${type}_${domain}_${field.templateId}_${field.key}`;
  return DIRECTIVE_CACHE[cacheKey] || (DIRECTIVE_CACHE[cacheKey] = (helper ? new helper(key, field, meta) : null));
}

export type DirectiveChangeCallback = Parameters<BaseHelper<unknown, NonNullable<unknown>>['onChange']>[0]

export function renderFields(
  domain: string,
  type: 'page' | 'metadata' | 'content',
  fields: IField[],
  record: IRecord,
  context: IPageContext,
  onChange: DirectiveChangeCallback,
): ComponentChildren {
  const out: ComponentChildren[] = [];
  for (const field of fields.sort((f1, f2) => ((f1.priority ?? Infinity) > (f2.priority ?? Infinity) ? 1 : -1))) {
    if (!field) { continue; }
    if (type === 'page' && (field.key === 'name' || field.key === 'slug')) { continue; }
    const directive = findDirective(type, domain, field.key, field, {
      templateId: record.templateId,
      record: context.page,
      records: context.pages,
      media: context.site.media,
      website: context.site,
    });
    directive?.onChange(onChange);
    let value = null;
    switch (type) {
      case 'page': value = record[field.key as keyof typeof record]; break;
      case 'metadata': value = record.metadata?.[field.key]; break;
      case 'content': value = record.content?.[field.key]; break;
    }
    const inputFunc = directive?.input;
    if (!inputFunc) { continue; }
    const inputComponent = createElement(inputFunc as () => JSX.Element, {
      id: `${record.id}-${type}-${field.key}-input`,
      key: `${record.id}-${type}-${field.key}-input`,
      name: field.key,
      value: value ?? directive?.default,
      directive,
    });
    out.push(
      <div
        id={`${record.id}-${type}-${field.key}-container`}
        key={`${record.id}-${type}-${field.key}-container`}
        data-priority={field.priority}
        data-field={`this-${field.key}`}
        class={`${(field.options.required && !field.options.default) ? 'required' : ''} field field__${field.type || 'text'}`}
      >
        <label for={`content[${field.key}]`}>
          {field.options.label || toTitleCase(field.key)}
          {field.options.help && <small id={`help-content[${field.key}]`} class="help">{field.options.help}</small>}
        </label>
        {inputComponent}
      </div>,
    );
  }
  return out;
}