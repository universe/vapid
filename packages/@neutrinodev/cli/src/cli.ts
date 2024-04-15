#!/usr/bin/env node

import program from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import pino from 'pino';
import { default as updateNotifier } from 'update-notifier';

import VapidServer from './runners/VapidServer/index.js';

const pkg = JSON.parse(fs.readFileSync('../package.json', 'utf8'));

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
 * version - prints the current Vapid version number
 */
program.version(`Vapid ${pkg.version}`, '-v, --version');

/**
 * new - copies the generator files to target directory
 *
 * @param {string} target
 */
program
  .command('new <target>')
  .description('create a new website')
  .action((_target) => {
    // Generator.copyTo(target);

    logger.info('Site created.');
    logger.info([
      'To start the server now, run:',
      `  vapid start`,
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
