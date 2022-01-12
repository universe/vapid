import "./markdown.css";

import { Fragment } from 'preact';
import markdown from 'markdown-it';
import MDEditor from '@uiw/react-md-editor';
import sanitizeHtml from 'sanitize-html';
import { SafeString } from '../../types';

import { BaseDirective, DirectiveProps } from '../base';

const markdownRenderer = markdown({
  html: true,
  breaks: true,
});

interface MarkdownDirectiveAttrs {
  placeholder: string;
}

export default class MarkdownDirective extends BaseDirective<string, MarkdownDirectiveAttrs> {

  default = '';
  /**
   * Returns a Trix or ACE editor, depending on the options
   *
   * @param {string} name
   * @param {string} [value='']
   * @return rendered input
   */
  input({ name, value = this.default }: DirectiveProps<string>) {
    return <Fragment>
      <MDEditor
        id={`markdown-editor--${name}`}
        value={value}
        onChange={val => this.update(val || '')}
        preview="edit"
      />
    </Fragment>;
  }

  /**
   * Renders HTML
   * Allows Markdown if given the option
   *
   * @param {string} value
   * @return {string} rendered HTML
   */
  async render(value = this.default) {
    return new SafeString(markdownRenderer.render(value || ''));
  }

  /**
   * Strips HTML out for simple preview
   *
   * @param {string} value
   * @return {string} plain text
   */
  preview(value: string = '') {
    let dirty: string = markdownRenderer.render(value);
    return sanitizeHtml(dirty, { allowedTags: [] });
  }
}
