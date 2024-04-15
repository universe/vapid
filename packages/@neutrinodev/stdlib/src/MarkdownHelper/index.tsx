import "./index.css";

import { DirectiveProps, SafeString,ValueHelper } from '@neutrinodev/core';
import markdown from 'markdown-it';
// import MDEditor from '@uiw/react-md-editor';
import sanitizeHtml from 'sanitize-html';

const markdownRenderer = markdown({
  html: true,
  breaks: true,
});

interface MarkdownHelperAttrs {
  placeholder: string;
}

export default class MarkdownHelper extends ValueHelper<string, MarkdownHelperAttrs> {
  default = '';

  /**
   * Returns a Trix or ACE editor, depending on the options
   *
   * @param {string} name
   * @param {string} [value='']
   * @return rendered input
   */
  input({ name, value = this.default }: DirectiveProps<string>) {
    return <>
      {name} { value }
      {/* <MDEditor
        id={`markdown-editor--${name}`}
        value={value}
        onChange={val => this.update(val || '')}
        preview="edit"
      /> */}
    </>;
  }

  /**
   * Renders HTML
   * Allows Markdown if given the option
   *
   * @param {string} value
   * @return {string} rendered HTML
   */
  async data(value = this.default) {
    return new SafeString(markdownRenderer.render(value || ''));
  }

  /**
   * Strips HTML out for simple preview
   *
   * @param {string} value
   * @return {string} plain text
   */
  preview(value = '') {
    const dirty: string = markdownRenderer.render(value);
    return sanitizeHtml(dirty, { allowedTags: [] });
  }
}
