#!/usr/bin/env node
const path = require('path');
const logger = require('pino')();

const program = require('commander');
const updateNotifier = require('update-notifier');

require('module')._extensions['.css'] = (_module, _filename) => '';
require('module-alias').addAlias('react', 'preact/compat');
require('module-alias').addAlias('react-dom', 'preact/compat');
require('module-alias').addAlias('react-dom/test-utils', 'preact/test-utils');
require('module-alias').addAlias('react-dom/jsx-runtime', 'preact/jsx-runtime');
require('module-alias').addAlias('@uiw/react-md-editor', 'preact/compat');

const pkg = require('../package.json');
// const Generator = require('../dist/generator');
const { VapidServer, VapidBuilder } = require('../dist/index');
// const VapidDeployer = require('../dist/runners/VapidDeployer');

function withVapid(command) {
  return async (target) => {
    try {
      const cwd = target instanceof program.Command ? process.cwd() : target;
      process.env.TEMPLATES_PATH = path.join(cwd, 'www');
      const vapid = new VapidServer(cwd);
      updateNotifier({ pkg }).notify({ isGlobal: true });
      await command(vapid);
    } catch (err) {
      // TODO: Deployer throws err.message, handle better
      const message = err.response && err.response.body ? err.response.body.message : err.message;
      logger.error(message);
      process.exit(1);
    }
  };
}

/**
 * new - copies the generator files to target directory
 *
 * @param {string} target
 */
program
  .command('new <target>')
  .description('create a new website')
  .action((target) => {
    // Generator.copyTo(target);

    logger.info('Site created.');
    logger.extra([
      'To start the server now, run:',
      `  vapid start ${target}`,
    ]);
  });

/**
 * start - runs the web server
 *
 * @param {string} [target='.']
 */
program
  .command('start')
  .description('start the server')
  .action(withVapid(async (vapid) => {
    logger.info(`Starting the ${vapid.env} server...`);
    await vapid.start();
    logger.info(`View your website at localhost:${vapid.config.port}`);
    logger.info('Ctrl + C to quit');
  }));

/**
 * deploy - publishes the website to the hosting platform
 *
 * @param {string} [target='.']
 */
program
  .command('deploy')
  .description('deploy to Vapid\'s hosting service')
  .action(withVapid(async (_target) => {
    // const cwd = typeof target !== 'string' ? process.cwd() : target;
    // const vapid = new VapidDeployer(cwd);
    // await vapid.deploy();
    process.exit(0);
  }));

/**
 * version - prints the current Vapid version number
 */
program
  .version(`Vapid ${pkg.version}`, '-v, --version');

/**
 * version - prints the current Vapid version number
 */
program
  .command('build')
  .description('generate a static build of the site')
  .action(withVapid(async (target, dest) => {
    const cwd = typeof target !== 'string' ? process.cwd() : target;
    const destDir = typeof dist !== 'string' ? path.join(process.cwd(), 'dist') : dest;
    const vapid = new VapidBuilder(cwd);
    await vapid.build(destDir);
    process.exit(0);
  }));

/**
 * catch all command - shows the help text
 */
program
  .command('*', { noHelp: true })
  .action(() => {
    logger.error(new Error(`Command "${process.argv[2]}" not found.`));
    program.help();
  });

/**
 * Read args, or show help
 */
if (process.argv.slice(2).length) {
  program.parse(process.argv);
} else {
  program.help();
}
