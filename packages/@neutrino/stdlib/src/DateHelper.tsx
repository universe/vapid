import { DirectiveOptions, DirectiveProps,ValueHelper } from '@neutrino/core';

const LOCALE = 'en-us';

function formatDate(type: 'datetime' | 'time' | string, value: number, options: DateHelperOptions): string {
  const date = new Date(value);
  const commonOptions = {
    localeMatcher: options.localeMatcher || undefined,
    timeZoneName: options.timeZoneName || undefined,
    timeZone: options.timeZone || undefined,
    formatMatcher: options.formatMatcher || undefined,
  };

  const dateOptions: Intl.DateTimeFormatOptions = {
    weekday: options.weekday || 'long',
    era: options.era || undefined,
    year: options.year || 'numeric',
    month: options.month || 'long',
    day: options.day || 'numeric',
  };

  const timeOptions = {
    hour: options.hour || '2-digit',
    minute: options.minute || '2-digit',
    second: options.second || undefined,
    hour12: options.hour12 || undefined,
  };

  // toLocale*String can error if the options are invalid. Catch this so things still render even if something goes wrong.
  try {
    switch (type) {
      case 'datetime': return date.toLocaleString(LOCALE, { ...commonOptions, ...dateOptions, ...timeOptions });
      case 'time': return date.toLocaleTimeString(LOCALE, { ...commonOptions, ...timeOptions });
      default: return date.toLocaleDateString(LOCALE, { ...commonOptions, ...dateOptions });
    }
  }
  catch {
    return 'Invalid Date';
  }
}

interface DateHelperOptions extends Intl.DateTimeFormatOptions {
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

  hourCycle?: "h11" | "h12" | "h23" | "h24" | undefined;
  dayPeriod?: "long" | "short" | "narrow" | undefined;
  dateStyle?: "long" | "short" | "full" | "medium" | undefined;
  timeStyle?: "long" | "short" | "full" | "medium" | undefined;

  numberingSystem?: string | undefined;
  calendar?: string | undefined;
}

export default class DateHelper extends ValueHelper<number, DateHelperOptions> {
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
  async data(value: number) {
    return formatDate(this.options?.type || 'date', value, this.options);
  }

  render([value]: [number], options: DirectiveOptions & DateHelperOptions) {
    return formatDate(options?.type || 'date', value, options);
  }
}
