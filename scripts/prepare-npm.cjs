const fs = require('node:fs');
const path = require('node:path');
const dir = path.resolve(__dirname, '../.tooling/bin');
fs.mkdirSync(dir, { recursive: true });
for (const name of ['npm', 'npx']) fs.writeFileSync(path.join(dir, `${name}.cmd`), `@echo off\r\nnode "%~dp0..\\npm\\package\\bin\\${name}-cli.js" %*\r\n`);
