const fs = require('fs');
const {
  join,
  parse,
  relative,
  resolve,
} = require('path');

const glob = require('glob');
const Boom = require('@hapi/boom');

const services = require('../services');
const TemplateCompiler = require('../TemplateCompiler');
const { Logger, Paths } = require('../utils');

const { helper } = require('../directives');

const { views: viewsPath } = Paths.getDashboardPaths();

const DEFAULT_ORDER = [
  ['position', 'ASC'],
  ['created_at', 'DESC'],
];

function makeHelpers(fields, obj) {
  const out = {};
  for (const key of Object.keys(obj)) {
    const field = fields[key];
    out[key] = helper(obj[key], field);
  }
  return out;
}

/**
 *
 * Renders content into site template
 *
 * @param {string} uriPath
 * @return {string} rendered HTML
 *
 * @todo Use Promise.all when fetching content
 */
exports.renderContent = async function renderContent(uriPath) {
  // const content = {};
  const { Template } = this.db.models;
  const pathAnalyzer = new services.UriPathAnalyzer(uriPath, this.paths.www);
  const [pagePath, pathSection, pathRecordId] = pathAnalyzer.perform();

  if (!pagePath) {
    throw Boom.notFound('Template not found');
  }

  const partials = {};
  for (const partial of glob.sync(resolve(this.paths.www, '**/_*.html'))) {
    const desc = parse(partial);
    const name = join(relative(this.paths.www, desc.dir), desc.name.slice(1));
    partials[name] = fs.readFileSync(partial, 'utf8');
  }

  const compiler = new TemplateCompiler(partials);
  const { name, type, data, ast } = compiler.parseFile(pagePath);

  const context = {};
  for (const model of Object.values(data)) {
    const values = await Template.findAll({
      where: { type: model.type, name: model.name },
      include: 'records',
    });

    const records = (values || []).map(t => t.records.map(r => makeHelpers(t.fields, r.dataValues.content))).flat();
    const firstRecord = records[0] || {};

    if (model.type === 'page') {
      for (const key of Object.keys(firstRecord)) {
        context[key] = firstRecord[key];
      }
    } else {
      context[model.name] = (model.type === 'collection') ? records : firstRecord;
    }
  }

  console.log("CONTEXT", context);
  return compiler.render(name, type, ast, context, { permalink: uriPath });
};

/**
 *
 * Renders error, first by looking in the site directory,
 * then falling back to Vapid own error template.
 *
 * @param {Error} err
 * @param {Object} request
 * @return {[status, rendered]} HTTP status code, and rendered HTML
 */
exports.renderError = function renderError(err, request) {
  const error = Boom.boomify(err);
  let status = error.output.statusCode;
  let rendered;
  let errorFile;
  if (this.isDev && status !== 404) {
    errorFile = resolve(viewsPath, 'errors', 'trace.html');
    rendered = new TemplateCompiler().renderFile(errorFile, {
      error: {
        status,
        title: error.output.payload.error,
        message: error.message,
        stack: error.stack,
      },
      request,
    });
  } else {
    const siteFile = resolve(this.paths.www, '_error.html');
    status = status === 404 ? 404 : 500;
    errorFile = status === 404 && fs.existsSync(siteFile) ? siteFile : resolve(viewsPath, 'errors', `${status}.html`);
    rendered = fs.readFileSync(errorFile, 'utf-8');
  }

  if (status !== 404) {
    Logger.extra(error.stack);
  }

  return [status, rendered];
};
