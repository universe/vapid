import './index.css';

import { DirectiveField, DirectiveMeta, DirectiveProps,ValueHelper } from '@neutrinodev/core';
import { JSX } from 'preact';
import { useState } from 'preact/hooks';
import ReactTags, { ClassNames, Tag } from 'react-tag-autocomplete';

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
  return str?.split ? str.split(',').map(p => p.trim()).filter(Boolean) : [];
}

interface ChoiceOptions {
  default: string;
  options: string;
  placeholder: string;
  multiple: boolean;
  custom: boolean;
}

export default class ChoiceHelper extends ValueHelper<string[], ChoiceOptions> {

  default: string[] = [];
  possibilities: string[] = [];

  /**
   * @param {Object} params
   */
  constructor(key: string, params: DirectiveField, meta: DirectiveMeta) {
    super(key, params, meta);
    this.possibilities = possibilities(this.options.options || '');
    if (!this.possibilities.length && !this.options.custom) { this.possibilities.push(this.key); }
    this.possibilities = this.possibilities.filter(val => Boolean(val.trim()));
    // If the default value is simply "true" we use the first value in possibilities.
    if ((typeof this.options.default === 'boolean' && this.options.default) || this.options.default === 'true') { 
      this.default = [this.possibilities[0]];
    }

    // Otherwise, we treat it as a possibilities string.
    else {
      this.default = possibilities(this.options.default || '').filter(val => Boolean(val.trim()));
    }
    return this;
  }

  preview(value: string[] = []) {
    return Array.from(value).filter(value => Boolean(value?.trim())).join(', ');
  }

  async data(value: string[] = []) {
    // For single checkbox choice types, we only want to use the default if no other value is set.
    if (this.possibilities.length <= 1 && !this.options.custom) {
      if (value === undefined) { value = this.default; }
    }
    // For all other choice input types, if no value is provided, use the default.
    else if (value === undefined || value?.length === 0) { value = this.default; }
    const out = Array.from(value).filter(Boolean);
    out.toString = () => Array.isArray(value) ? value.filter(Boolean).join(',') : '';
    return out;
  }

  /**
   * Renders the appropriate input, given the possible choices,
   * and what options have been passed in.
   */
   input({ name, value, directive }: DirectiveProps<string[], this>) {
    if (directive.options.custom) { return directive.tags(name, value); }
    if (directive.options.multiple) { return directive.possibilities.length < 6 ? directive.checkbox(name, value) : directive.tags(name, value); }
    if (directive.possibilities.length === 1) { return directive.checkbox(name, value); }
    value = Array.isArray(value) ? value : [];
    return directive.possibilities.length < 6 ? directive.radio(name, value) : directive.dropdown(name, value);
  }

  private checkbox(name: string, value = this.default) {
    let values: string[];
    
    if (value === undefined) {
      values = this.default;
    }
    else {
      values = Array.isArray(value) ? value : [value];
      values = values.filter(value => Boolean(value?.trim()));
    }

    const lowerValues = values.map(v => v.toLowerCase());
    const inputs: JSX.Element[] = [];
    for (const val of this.possibilities) {
      const checked = !!lowerValues.includes(val?.toLowerCase());
      const id = this.possibilities.length === 1 ? `content[${name}]` : `${name}[${val}]`;
      inputs.push(<fieldset className="checkbox__fieldset">
        <input
          type="checkbox"
          id={id}
          name={id}
          aria-describedby={`help-${name}`}
          checked={checked}
          required={!!this.options.required}
          onChange={evt => {
            const set = new Set(values);
            (evt.target as HTMLInputElement).checked ? set.add(val) : set.delete(val);
            this.update([...set]);
          }}
        />
        <label htmlFor={id}>{val}</label>
      </fieldset>);
    }
    return <div
      ref={ref => ref?.parentElement?.classList.add(`checkbox--${this.possibilities.length}`)}
      className={`ui checkbox ${this.possibilities.length > 1 ? 'checkbox--multiple' : 'checkbox--single'}`}
    >
      {inputs}
    </div>;
  }

  private radio(name: string, value = this.default) {
    let values: string[] = Array.isArray(value) ? value : [value];
    values = values.filter(value => Boolean(value?.trim()));
    const lowerValues = values.map(v => v.toLowerCase());

    const inputs: JSX.Element[] = [];
    for (const val of this.possibilities) {
      const checked = !!lowerValues.includes(val?.toLowerCase());
      const id = `${name}[${val}]`;
      inputs.push(<fieldset className="checkbox__fieldset">
        <input
          type="radio"
          id={id}
          name={name}
          value={val}
          aria-describedby={`help-${name}`}
          checked={checked}
          required={!!this.options.required}
          onChange={_ => { this.update([val]); }}
        />
        <label htmlFor={id}>{val}</label>
      </fieldset>);
    }
    return <div className={`ui checkbox radio ${this.possibilities.length > 1 ? 'checkbox--multiple' : 'checkbox--single'}`}>
      {inputs}
    </div>;
  }

  private dropdown(name: string, value = this.default) {
    const { placeholder, required } = this.options;
    let values = Array.isArray(value) ? value : String(value || '').split(',');
    values = values.filter(value => Boolean(value?.trim()));
    const lowerValues = values.map(v => v.toLowerCase());
    return <select
      placeholder={this.options.placeholder}
      name={name}
      aria-describedby={`help-${name}`}
      className="vapid__select"
      multiple={!!this.options.multiple}
      onChange={(evt: Event) => {
        const value = (evt.target as HTMLInputElement).value;
        this.update(value ? [value] : []);
      }}
    >
      {(!required || (required && this.default)) ? <option value={`${this.default || ''}`}>{placeholder || '---'}</option> : null}
      {this.possibilities.map((p) => {
        const selected = lowerValues.includes(p?.toLowerCase()) ? 'selected' : '';
        return <option key={p} value={p} selected={!!selected}>{p}</option>;
      })}
    </select>;
  }

  private tags(_name: string, values = this.default) {
    const s = useState<string>('');
    const [ localCustom, setCustom ] = s;

    // Normalize for potential string or number inputs.
    this.options.custom = String(this.options.custom) === 'true' || String(this.options.custom) === '1';

    values = Array.isArray(values) ? values : (typeof values === 'string' ? [values] : []);
    values = values.filter(value => Boolean(value?.trim()));

    const existing = new Set(values);
    const tags = values.map((id) => ({ id, name: id }));
    const suggestions = this.possibilities.map((id) => ( values.includes(id) ? null : { id, name: id })).filter(Boolean) as Tag[];

    for (const record of this.meta.records) {
      if (record.templateId !== this.meta.record?.templateId) { continue; }
      const otherVal = record.content[this.key];
      if (Array.isArray(otherVal)) {
        for (const other of otherVal) {
          if (typeof other !== 'string' || existing.has(other)) { continue; }
          suggestions.unshift({ id: other, name: other });
        }
      }
    }

    if (typeof localCustom === 'string' && this.options.custom) {
      suggestions.unshift({ id: localCustom, name: localCustom });
    }

    // eslint-disable-next-line
    /* @ts-ignore-next-line */
    return <ReactTags
      classNames={{ root: `react-tags ${!this.options.multiple && tags.length >= 1 ? 'react-tags--done' : ''}` } as ClassNames}
      minQueryLength={0}
      autoresize={false}
      tags={tags}
      allowNew={!!this.options.custom} /* Note: ReactTags will throw if it isn't passed a boolean here */
      suggestions={suggestions}
      placeholderText={this.options.custom ? (this.possibilities.length ? 'Select or create a value' : 'Add a value') : 'Select a value'}
      onInput={setCustom}
      onAddition={tag => { this.update([ ...values, `${tag.name}` ]); setCustom(''); /* Must be name for custom tag additions */ }}
      onDelete={idx => {
        const update = values.slice();
        update.splice(idx, 1);
        this.update(update);
      }}
    />;
  }
}
