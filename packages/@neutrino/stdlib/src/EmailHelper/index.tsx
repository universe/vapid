import './index.css';

import { DirectiveField, DirectiveMeta, DirectiveProps, ValueHelper } from '@neutrino/core';

import ConstantContactButton from './constantcontact.js';
import MailchimpButton from './mailchimp.js';
import NgpvanButton from './ngpvan.js';
import UniverseButton from './universe.js';

interface EmailOptions {
  default: string;
  options: string;
  placeholder: string;
  multiple: boolean;
  custom: boolean;
}

interface EmailValue {
  provider: 'universe' | 'mailchimp' | 'ngpvan' | 'constant-contact' | null;
}

export default class EmailHelper extends ValueHelper<EmailValue, EmailOptions> {

  default: EmailValue = {
    provider: null,
  }

  /**
   * @param {Object} params
   */
  constructor(key: string, params: DirectiveField, meta: DirectiveMeta) {
    super(key, params, meta);
    return this;
  }

  preview(_value: EmailValue) {
    return '';
  }

  async data(_value: EmailValue) {
    return 'FORM HERE';
  }

  /**
   * Renders the appropriate input, given the possible choices,
   * and what options have been passed in.
   */
   input({ name, value, directive }: DirectiveProps<EmailValue, this>) {
    return <section name={name} class={`email-form email-form--${value?.provider || 'none'}`}>
      <button class="email-form__status" onClick={() => {
        if (!window.confirm('Are you sure you want to remove your email integration?')) { return; }
        directive.update({ provider: null });
      }}>Disconnect</button>
      <UniverseButton onClick={() => directive.update({ provider: 'universe' })} />
      <MailchimpButton onClick={() => directive.update({ provider: 'mailchimp' })} />
      <NgpvanButton onClick={() => directive.update({ provider: 'ngpvan' })} />
      <ConstantContactButton onClick={() => directive.update({ provider: 'constant-contact' })} />
    </section>;
  }
}
