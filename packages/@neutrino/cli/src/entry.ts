#!/usr/bin/env node
import { spawn } from 'child_process';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLI_FILE = path.join(__dirname, 'cli.js');
console.log(process.execPath, [ CLI_FILE, ...Array.from(process.argv).slice(2) ], process.env.NODE_OPTIONS);

// Execute the command with the our experimental load environment variable set to handle css files.
spawn(process.execPath, [ CLI_FILE, ...Array.from(process.argv).slice(2) ], {
  stdio: 'inherit',
  env: { 
    ...process.env, 
    NODE_OPTIONS: [ process.env.NODE_OPTIONS, '--experimental-loader=@neutrino/cli/loader' ].filter(Boolean).join(' '),
  },
});
