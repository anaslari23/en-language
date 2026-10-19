const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const extensionRoot = path.resolve(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(extensionRoot, 'package.json'), 'utf8'));

test('extension defines local test and VSIX packaging scripts', () => {
  assert.equal(manifest.scripts.test, 'node --test');
  assert.equal(manifest.scripts.package, 'vsce package --skip-license');
  assert.ok(manifest.devDependencies['@vscode/vsce']);
  assert.equal(manifest.dependencies, undefined);
  assert.equal(manifest.repository.url, 'https://github.com/anaslari23/en-language.git');
});

test('extension contributes the task type used by its Run command', () => {
  assert.ok(manifest.contributes.taskDefinitions.some((definition) => definition.type === 'codeinenglish'));
});

test('extension docs explain local installation and Python configuration', () => {
  const readme = fs.readFileSync(path.join(extensionRoot, 'README.md'), 'utf8');
  assert.match(readme, /Install from VSIX/i);
  assert.match(readme, /codeinenglish\.pythonPath/);
  assert.match(readme, /workspace/i);
});

test('package excludes development files but includes runtime code', () => {
  const ignore = fs.readFileSync(path.join(extensionRoot, '.vscodeignore'), 'utf8');
  assert.match(ignore, /test\//);
  assert.match(ignore, /node_modules\//);
  assert.ok(fs.existsSync(path.join(extensionRoot, 'src', 'extension.js')));
});

test('root README explains the VS Code Run button', () => {
  const readme = fs.readFileSync(path.resolve(extensionRoot, '..', 'README.md'), 'utf8');
  assert.match(readme, /▶ Run/);
  assert.match(readme, /VSIX/i);
});
