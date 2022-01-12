import { BaseDirective, DirectiveProps } from './base';

interface DateDirectiveOptions {
  time: boolean;
  date: boolean;

  localeMatcher?: "best fit" | "lookup" | undefined;
  weekday?: "long" | "short" | "narrow" | undefined;
  era?: "long" | "short" | "narrow" | undefined;
  year?: "numeric" | "2-digit" | undefined;
  month?: "numeric" | "2-digit" | "long" | "short" | "narrow" | undefined;
  day?: "numeric" | "2-digit" | undefined;
  hour?: "numeric" | "2-digit" | undefined;
  minute?: "numeric" | "2-digit" | undefined;
  second?: "numeric" | "2-digit" | undefined;
  hour12?: boolean | undefined;
  timeZoneName?: "long" | "short" | undefined;
  timeZone?: string | undefined;
  formatMatcher?: "best fit" | "basic" | undefined;
}

export default class DateDirective extends BaseDirective<number, DateDirectiveOptions> {

  default = Date.now();

  /**
   * Parses into a Date object, and formats
   * Formatting options provided via strftime.
   *
   * @param {string} value - a string representation of a date
   * @return {string} formatted date
   */
  input({ name, value = Date.now(), directive }: DirectiveProps<number, this>) {
    const type = (directive.options.type === 'datetime' ? 'datetime-local' : directive.options.type) || 'date';
    const date = new Date(value);
    date.setMinutes(date.getMinutes() - date.getTimezoneOffset()); // Shift to local time for display
    let val = isNaN(+date) ? '' : date.toISOString().split(':').slice(0, -1).join(':');
    if (type === 'time') { val = val.split('T')[1]; }
    if (type === 'date') { val = val.split('T')[0]; }

    return <input
      {...directive.options}
      type={type}
      name={name}
      aria-describedby={`help-${name}`}
      value={val}
      onChange={(evt) => {
        const el = evt.target as HTMLInputElement;
        const date = new Date(el.valueAsNumber);
        date.setMinutes(date.getMinutes() + date.getTimezoneOffset()); // Shift to UTC for save
        directive.update(+date);
      }}
    />;
  }

  /**
   * Parses into a Date object, and formats
   * Formatting options provided via strftime.
   *
   * @param {string} value - a string representation of a date
   * @return {string} formatted date
   */
  async render(value: number) {
    const date = new Date(value);
    const commonOptions = {
      localeMatcher: this.options.localeMatcher || undefined,
      timeZoneName: this.options.timeZoneName || undefined,
      timeZone: this.options.timeZone || undefined,
      formatMatcher: this.options.formatMatcher || undefined,
    };

    const dateOptions: Intl.DateTimeFormatOptions = {
      weekday: this.options.weekday || 'long',
      era: this.options.era || undefined,
      year: this.options.year || 'numeric',
      month: this.options.month || 'long',
      day: this.options.day || 'numeric',
    };

    const timeOptions = {
      hour: this.options.hour || '2-digit',
      minute: this.options.minute || '2-digit',
      second: this.options.second || undefined,
      hour12: this.options.hour12 || undefined,
    };

    switch (this.options.type) {
      case 'datetime': return date.toLocaleString('en-US', { ...commonOptions, ...dateOptions, ...timeOptions });
      case 'time': return date.toLocaleTimeString('en-US', { ...commonOptions, ...timeOptions });
      default: return date.toLocaleDateString('en-US', { ...commonOptions, ...dateOptions });
    }
  }
}
