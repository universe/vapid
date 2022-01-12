
import './choice.css';

import { toSnakeCase, toTitleCase } from '@universe/util';
import { JSX } from 'preact';
import { useState } from 'preact/hooks';
import ReactTags, { Tag, ClassNames } from 'react-tag-autocomplete'

import { BaseDirective, DirectiveField, DirectiveMeta, DirectiveProps } from '../base';


/**
 * @private
 *
 * Turns a comma-separated list of choices into an array
 *
 * @param {string} str
 * @return {array}
 *
 * @todo Needs a better parser that takes into account quotes, escaped chars etc
 */
 function possibilities(str = '') {
  return str?.split ? str.split(',').map(p => p.trim()).map(p => toSnakeCase(p)).filter(Boolean) : [];
}

interface ChoiceOptions {
  options: string;
  placeholder: string;
  multiple: boolean;
  custom: boolean;
}

export default class ChoiceDirective extends BaseDirective<string[], ChoiceOptions> {

  default: string[] = [];
  possibilities: string[] = [];

  /**
   * @param {Object} params
   */
  constructor(key: string, params: DirectiveField, meta: DirectiveMeta) {
    super(key, params, meta);
    this.possibilities = possibilities(this.options.options || '');
    if (!this.possibilities.length && !this.options.custom) { this.possibilities.push(this.key); }
    return this;
  }

  preview(value: string[] = []) {
    return Array.from(value).map(toTitleCase).join(', ');
  }

  async render(value: string[]) {
    const out = Array.from(value);
    out.toString = () => Array.isArray(value) ? value.join(',') : '';
    return out;
  }

  /**
   * Renders the appropriate input, given the possible choices,
   * and what options have been passed in.
   */
   input({ name, value, directive}: DirectiveProps<string[], this>) {
    if (directive.options.custom) { return directive.tags(name, value); }
    if (directive.options.multiple) { return directive.possibilities.length < 6 ? directive.checkbox(name, value) : directive.tags(name, value); }
    if (directive.possibilities.length === 1) { return directive.checkbox(name, value); }
    value = Array.isArray(value) ? value : [];
    return directive.possibilities.length < 6 ? directive.radio(name, value) : directive.dropdown(name, value);
  }

  private checkbox(name: string, value = this.default) {
    const values: string[] = Array.isArray(value) ? value : [value];
    const inputs: JSX.Element[] = [];
    for (const val of this.possibilities) {
      const checked = !!values.includes(val);
      const id = `${name}[${toSnakeCase(val)}]`;
      inputs.push(<fieldset class="checkbox__fieldset">
        <input type="hidden" name={!checked ? id : ''} value="false" />
        <input
          type="checkbox"
          id={id}
          name={id}
          aria-describedby={`help-${name}`}
          checked={checked}
          required={!!this.options.required}
          onChange={evt => {
            const set = new Set(values);
            (evt.target as HTMLInputElement).checked ? set.add(toSnakeCase(val)) : set.delete(toSnakeCase(val));
            this.update([...set]);
          }}
        />
        <label for={id}>{toTitleCase(val)}</label>
      </fieldset>)
    }
    return <div
      ref={ref => ref?.parentElement?.classList.add(`checkbox--${this.possibilities.length}`)}
      class={`ui checkbox ${this.possibilities.length > 1 ? 'checkbox--multiple' : 'checkbox--single'}`}
    >
      {inputs}
    </div>;
  }

  private radio(name: string, value = this.default) {
    const values: string[] = Array.isArray(value) ? value : [value];
    const inputs: JSX.Element[] = [];
    for (const val of this.possibilities) {
      const checked = !!values.includes(val);
      const id = `${name}[${toSnakeCase(val)}]`;
      inputs.push(<fieldset class="checkbox__fieldset">
        <input type="hidden" name={!checked ? id : ''} value="false" />
        <input
          type="radio"
          id={id}
          name={name}
          value={toSnakeCase(val)}
          aria-describedby={`help-${name}`}
          checked={checked}
          required={!!this.options.required}
          onChange={_ => { this.update([toSnakeCase(val)]); }}
        />
        <label for={id}>{toTitleCase(val)}</label>
      </fieldset>)
    }
    return <div class={`ui checkbox radio ${this.possibilities.length > 1 ? 'checkbox--multiple' : 'checkbox--single'}`}>
      {inputs}
    </div>;
  }

  private dropdown(name: string, value = this.default) {
    const { placeholder, required } = this.options;
    const values = Array.isArray(value) ? value : String(value || '').split(',');

    return <select
      name={name}
      aria-describedby={`help-${name}`}
      class="vapid__select"
      multiple={!!this.options.multiple}
      onChange={(evt: Event) => {
        const value = (evt.target as HTMLInputElement).value;
        this.update(value ? [value] : []);
      }}
      {...this.options}
    >
      {(!required || (required && this.default)) ? <option value={`${this.default || ''}`}>{placeholder || '---'}</option> : null}
      {this.possibilities.map((p) => {
        const selected = values.includes(p) ? 'selected' : '';
        return <option value={p} selected={!!selected}>{toTitleCase(p)}</option>
      })}
    </select>;
  }

  private tags(_name: string, values = this.default) {
    const [ localCustom, setCustom ] = useState<string>('');
    values = Array.isArray(values) ? values : (typeof values === 'string' ? [values] : []);

    const existing = new Set(values);
    const tags = values.map((id) => ({ id, name: toTitleCase(id) }));
    const suggestions = this.possibilities.map((id) => ( values.includes(id) ? null : { id, name: toTitleCase(id) })).filter(Boolean) as Tag[];

    for (const record of this.meta.records) {
      if (record.templateId !== this.meta.record?.templateId) { continue; }
      const otherVal = record.content[this.key];
      if (Array.isArray(otherVal)) {
        for (const other of otherVal) {
          if (typeof other !== 'string' || existing.has(toSnakeCase(other))) { continue; }
          suggestions.unshift({ id: toSnakeCase(other), name: toTitleCase(other) });
        }
      }
    }

    if (localCustom && this.options.custom) {
      suggestions.unshift({ id: toSnakeCase(localCustom), name: toTitleCase(localCustom) });
    }

    return <ReactTags
      classNames={{ root: `react-tags ${!this.options.multiple && tags.length >= 1 ? 'react-tags--done' : ''}` } as ClassNames}
      minQueryLength={0}
      autoresize={false}
      tags={tags}
      allowNew={this.options.custom}
      suggestions={suggestions}
      placeholderText={this.options.custom ? (this.possibilities.length ? 'Select or create a value' : 'Add a value') : 'Select a value'}
      onInput={setCustom}
      onAddition={tag => { this.update([...values, toSnakeCase(`${tag.name}`)]); setCustom(''); /* Must be name for custom tag additions */ }}
      onDelete={idx => {
        const update = values.slice()
        update.splice(idx, 1);
        this.update(update);
      }}
    />
  }
}
