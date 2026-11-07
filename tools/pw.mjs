// Playwright from the Rdw project, so this folder needs no own node_modules.
// Set PLAYWRIGHT_DIR to use another installation.
import path from 'node:path';
import os from 'node:os';
import { createRequire } from 'node:module';

const dir = process.env.PLAYWRIGHT_DIR || path.join(os.homedir(), 'Rdw_Datenbasis', 'client', 'node_modules', 'playwright');
const require = createRequire(import.meta.url);
const pw = require(dir);
export const { chromium, webkit, devices } = pw;
