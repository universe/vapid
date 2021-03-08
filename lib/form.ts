import * as directives from './directives';
import { toTitleCase, Json } from '@universe/util';

/**
 * Renders forms for the dashboard.
 */
export default class Form {
  static field(name: string, label: string, params: Record<string, string>, value: string, error: string, meta: Json) {
    const directive = directives.find(params, meta);
    const requiredClass = (directive.attrs.required && !params.default) ? 'required ' : '';
    const errorClass = error ? 'error ' : '';
    const errorMessage = error ? `<small class="error-message" aria-role="alert">${error}</small>` : '';
    const help = params.help ? `<small id="help-${name}" class="help">${params.help}</small>` : '';
    if (params.help) {
      directive.attrs['aria-describedby'] = `help-${name}`;
    }

    // @ts-ignore
    const input = directive.input(name, value);

    return `
      <div class="${requiredClass}${errorClass}field field__${params.type || 'text'}">
        <label for="${name}">
          ${params.label || toTitleCase(label)}
          ${help}
        </label>
        ${input}
        ${errorMessage}
      </div>`;
  }
}
