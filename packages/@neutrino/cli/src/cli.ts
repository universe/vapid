#!/usr/bin/env node

import program from 'commander';
import * as path from 'path';
import pino from 'pino';
import { default as updateNotifier } from 'update-notifier';

import pkg from '../package.json' assert { type: 'json' };
import VapidServer from './runners/VapidServer/index.js';

declare global {
  /* eslint-disable-next-line @typescript-eslint/no-namespace */
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: 'development' | 'production' | 'test';
      TEMPLATES_PATH: string;
      FIRESTORE_EMULATOR_HOST: string;
      FIREBASE_AUTH_EMULATOR_HOST: string;
      FIREBASE_HOSTING_EMULATOR: string;
    }
  }
}

const logger = pino({ transport: { target: 'pino-pretty', options: { colorize: true } } });
// const Generator = require('../dist/generator');
// const VapidDeployer = require('../dist/runners/VapidDeployer');

function withVapid(command: (vapid: VapidServer) => void) {
  return async(target: string | program.Command) => {
    try {
      const cwd = target instanceof program.Command ? process.cwd() : target;
      process.env.TEMPLATES_PATH = path.join(cwd, 'www');
      const vapid = new VapidServer(cwd);
      updateNotifier({ pkg }).notify({ isGlobal: true });
      await command(vapid);
    }
 catch (err) {
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
  .action(withVapid(async(vapid: VapidServer) => {
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
  .action(withVapid(async(_target: VapidServer) => {
    // const cwd = typeof target !== 'string' ? process.cwd() : target;
    // const vapid = new VapidDeployer(cwd);
    // await vapid.deploy();
    process.exit(0);
  }));

/**
 * version - prints the current Vapid version number
 */
program.version(`Vapid ${pkg.version}`, '-v, --version');

/**
 * version - prints the current Vapid version number
 */
// program
//   .command('build')
//   .description('generate a static build of the site')
//   .action(withVapid(async (target: VapidBuilder, dest: string) => {
//     const cwd = typeof target !== 'string' ? process.cwd() : target;
//     const destDir = typeof dist !== 'string' ? path.join(process.cwd(), 'dist') : dest;
//     const vapid = new VapidBuilder(cwd, {});
//     await vapid.build(destDir);
//     process.exit(0);
//   }));

/**
 * catch all command - shows the help text
 */
program
  .command('*', undefined, { noHelp: true })
  .action(() => {
    logger.error(new Error(`Command "${process.argv[2]}" not found.`));
    program.help();
  });

if (process.argv.slice(2).length) {
  program.parse(process.argv);
}
 else {
  program.help();
}
