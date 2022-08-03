import { DirectiveProps, ValueHelper } from '@neutrino/core';

interface NumberHelperOptions {
  range: boolean;
  required: boolean
  min: number;
  max: number;
  step: number;
}

export default class NumberHelper extends ValueHelper<number, NumberHelperOptions> {
  default = 0;

  /**
   * Renders either a number
   */
  input({ name, value = this.default }: DirectiveProps<number>) {
    return <>
      <input
        {...this.options}
        type={this.options.range ? 'range' : 'number'}
        name={name}
        aria-describedby={`help-${name}`}
        value={value}
      />
      {this.options.range ? <div className="ui left pointing basic label">{value || '—'}</div> : null}
    </>;
  }
}
