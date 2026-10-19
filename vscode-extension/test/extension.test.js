const test = require('node:test');
const assert = require('node:assert/strict');
const { activate, createCodeLensProvider } = require('../src/extension');

function fakeVscode() {
  class Range {
    constructor(startLine, startCharacter, endLine, endCharacter) {
      Object.assign(this, { startLine, startCharacter, endLine, endCharacter });
    }
  }
  class CodeLens {
    constructor(range, command) {
      Object.assign(this, { range, command });
    }
  }
  const registrations = {};
  const vscode = {
    Range,
    CodeLens,
    languages: {
      registerCodeLensProvider(selector, provider) {
        registrations.provider = { selector, provider };
        return { dispose() {} };
      },
    },
    commands: {
      registerCommand(id, callback) {
        registrations.command = { id, callback };
        return { dispose() {} };
      },
    },
  };
  return { vscode, registrations };
}

function document(languageId, scheme = 'file') {
  return { languageId, uri: { scheme, fsPath: '/workspace/example.en' } };
}

test('offers Run for Code in English files only', () => {
  const { vscode } = fakeVscode();
  const provider = createCodeLensProvider(vscode);
  const lenses = provider.provideCodeLenses(document('codeinenglish'));

  assert.equal(lenses.length, 1);
  assert.equal(lenses[0].command.title, '▶ Run');
  assert.equal(lenses[0].command.command, 'codeinenglish.runFile');
  assert.equal(lenses[0].command.arguments[0].fsPath, '/workspace/example.en');
});

test('does not offer Run for Python or Markdown', () => {
  const { vscode } = fakeVscode();
  const provider = createCodeLensProvider(vscode);

  assert.deepEqual(provider.provideCodeLenses(document('python')), []);
  assert.deepEqual(provider.provideCodeLenses(document('markdown')), []);
});

test('does not offer Run for untitled documents', () => {
  const { vscode } = fakeVscode();
  const provider = createCodeLensProvider(vscode);

  assert.deepEqual(provider.provideCodeLenses(document('codeinenglish', 'untitled')), []);
});

test('activation registers the CodeLens provider and run command', () => {
  const { vscode, registrations } = fakeVscode();
  const context = { subscriptions: [] };
  activate(context, vscode);

  assert.equal(registrations.provider.selector.language, 'codeinenglish');
  assert.equal(registrations.provider.selector.scheme, 'file');
  assert.equal(registrations.command.id, 'codeinenglish.runFile');
  assert.equal(context.subscriptions.length, 2);
});

test('run command passes the active document and configured Python path', async () => {
  const { createRunCommand } = require('../src/extension');
  const documentUri = { fsPath: '/workspace/prompt.en' };
  const calls = [];
  const vscode = {
    workspace: {
      getConfiguration(section) {
        assert.equal(section, 'codeinenglish');
        return { get(key, fallback) { return key === 'pythonPath' ? '/custom/python' : fallback; } };
      },
    },
  };
  const callback = createRunCommand(vscode, (options) => calls.push(options));

  await callback(documentUri);

  assert.equal(calls.length, 1);
  assert.equal(calls[0].documentUri, documentUri);
  assert.equal(calls[0].pythonPath, '/custom/python');
});
