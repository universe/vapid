const BaseHelper = require('../../lib/directives/base');
const ImageDirective = require('../../lib/directives/image')(BaseHelper);

const vanilla = new ImageDirective();

describe('#input', () => {
  test('renders a file/hidden input combo by default', () => {
    const input = vanilla.input('test');
    expect(input).toMatch(/input type="file"/);
    expect(input).toMatch(/input type="hidden"/);
  });

  test('renders a preview if a value is present', () => {
    expect(vanilla.input('test', 'test.jpg')).toMatch(/class="preview"/);
    expect(vanilla.input('test')).not.toMatch(/class="preview"/);
  });

  test('renders a delete checkbox if the image can be destroyed', () => {
    // Non-required images can be deleted
    const directive = new ImageDirective({ required: false });

    expect(directive.input('test', 'test.jpg')).toMatch(/input type="checkbox"/);
    expect(directive.input('test')).not.toMatch(/input type="checkbox"/);

    expect(vanilla.input('test', 'test.jpg')).not.toMatch(/input type="checkbox"/);
    expect(vanilla.input('test')).not.toMatch(/input type="checkbox"/);
  });
});

describe('#data', () => {
  test('returns null if no fileName is present', () => {
    expect(vanilla.data()).toBeNull();
  });

  test('renders an <img> tag by default', () => {
    expect(vanilla.data('test.jpg')).toMatch(/<img src=/);
  });

  test('returns the image src if tag=false', () => {
    const directive = new ImageDirective({ tag: false });
    expect(directive.data('test.jpg')).toEqual('/uploads/test.jpg');
  });

  test('accepts a width option', () => {
    const directive = new ImageDirective({ width: 100 });
    expect(directive.data('test.jpg')).toMatch(/width="100"/);
    expect(directive.data('test.jpg')).toMatch(/test\.jpg\?w=100/);
  });

  test('accepts a height option', () => {
    const directive = new ImageDirective({ height: 100 });
    expect(directive.data('test.jpg')).toMatch(/height="100"/);
    expect(directive.data('test.jpg')).toMatch(/test\.jpg\?h=100/);
  });

  test('accepts a class option', () => {
    const directive = new ImageDirective({ class: 'test' });
    expect(directive.data('test.jpg')).toMatch(/class="test"/);
  });

  test('accepts an alt option', () => {
    const directive = new ImageDirective({ alt: 'Testing' });
    expect(directive.data('test.jpg')).toMatch(/alt="Testing"/);
  });
});
