import { Fragment } from 'preact';
import { BaseDirective, DirectiveProps } from './base';

interface NumberDirectiveOptions {
  range: boolean;
  required: boolean
  min: number;
  max: number;
  step: number;
}

export default class NumberDirective extends BaseDirective<number, NumberDirectiveOptions> {
  default = 0;

  serialize(value: number) {
    return Number(value);
  }

  /**
   * Renders either a number
   */
  input({ name, value = this.default }: DirectiveProps<number>) {
    return <Fragment>
      <input
        {...this.options}
        type={this.options.range ? 'range' : 'number'}
        name={name}
        aria-describedby={`help-${name}`}
        value={value}
      />
      {this.options.range ? <div class="ui left pointing basic label">{value || '—'}</div> : null}
    </Fragment>
  }
}
