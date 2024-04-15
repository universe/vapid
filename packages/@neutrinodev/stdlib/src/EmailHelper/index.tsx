import './index.css';

import { DirectiveField, DirectiveMeta, DirectiveProps, ValueHelper } from '@neutrinodev/core';

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
  listId: string | null;
}

export default class EmailHelper extends ValueHelper<EmailValue, EmailOptions> {

  default: EmailValue = {
    provider: null,
    listId: null,
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

  async data(value: EmailValue) {
    return {
      provider: value?.provider || '',
      listId: value?.listId || '',
    };
  }

  /**
   * Renders the appropriate input, given the possible choices,
   * and what options have been passed in.
   */
   input({ name, value, directive }: DirectiveProps<EmailValue, this>) {
    return <section name={name} class={`email-form email-form--${value?.provider || 'none'}`}>
      <button class="email-form__status" onClick={() => {
        if (!window.confirm('Are you sure you want to remove your email integration?')) { return; }
        directive.update({ provider: null, listId: null });
      }}>Disconnect</button>
      <UniverseButton realm={directive.meta.website.env.realm as string} onClick={() => directive.update({ provider: 'universe', listId: null })} />
      <MailchimpButton realm={directive.meta.website.env.realm as string} onClick={() => directive.update({ provider: 'mailchimp', listId: null })} />
      <NgpvanButton onClick={() => directive.update({ provider: 'ngpvan', listId: null })} />
      <ConstantContactButton onClick={() => directive.update({ provider: 'constant-contact', listId: null })} />
    </section>;
  }
}
