'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');
const lib = require('..');

test('browser build gives the same grids as the Node library', () => {
  const root = path.join(__dirname, '..');
  execFileSync(process.execPath, [path.join(root, 'scripts', 'build-web.js')]);
  const context = { window: {}, TextEncoder };
  vm.runInNewContext(fs.readFileSync(path.join(root, 'site', 'classic-wordsearch.js'), 'utf8'), context);
  const web = context.window.ClassicWordsearch;
  const specs = [
    JSON.parse(fs.readFileSync(path.join(root, 'examples', 'synthetic.json'), 'utf8')),
    { rows: 10, columns: 14, words: ['Éléphant', 'girafe', 'ZÈBRE', 'lion', 'tigre'], seed: 'é-ü-日本' },
  ];
  for (const spec of specs) {
    const fromWeb = web.generate(spec);
    assert.deepStrictEqual(JSON.parse(JSON.stringify(fromWeb)), lib.generate(spec));
    assert.strictEqual(lib.verifyArtifact(fromWeb, spec).status, 'VERIFIED');
  }
});
