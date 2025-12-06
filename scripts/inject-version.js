import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const ROOT = path.dirname(url.fileURLToPath(import.meta.url));
const pkgPath = path.join(ROOT, '..', 'package.json');
const outPath = path.join(ROOT, '..', 'src', 'env-version.js');

const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
const version = pkg.version || 'dev';

writeFileSync(outPath, `export const APP_VERSION = '${version}';\n`);
console.log(`Injected APP_VERSION=${version}`);
