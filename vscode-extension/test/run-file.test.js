const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { runFile } = require('../src/run-file');

async function fixture({
  source = 'en 0.2\ntarget python\n#? generated intent\n',
  payload,
  generationError,
  dirty = false,
  saveResult = true,
  workspace = true,
  pythonPath = 'python3',
  nodePath = 'node',
  exitCodes = [0],
  executeError,
} = {}) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'codeinenglish run '));
  const sourcePath = path.join(directory, 'my problem.en');
  await fs.writeFile(sourcePath, source, 'utf8');
  const outputPath = path.join(directory, 'generated.py');
  const response = payload ?? {
    schema_version: 1,
    file: sourcePath,
    version: '0.2',
    supported_versions: ['0.1', '0.2'],
    target: 'python',
    form: 'problem',
    examples: { present: false, count: 0 },
    plan: { output_path: outputPath, runtime: 'python', run_examples: false, run_args: [outputPath] },
    written: true,
    diagnostics: [],
  };
  const folder = { uri: { fsPath: directory }, name: 'workspace' };
  const events = [];
  const tasks = [];
  const errors = [];
  const information = [];
  const calls = [];
  let subscription;
  const document = {
    isDirty: dirty,
    async save() { events.push('save'); return saveResult; },
  };
  class ProcessExecution {
    constructor(process, args, options) { Object.assign(this, { process, args, options }); }
  }
  class Task {
    constructor(definition, scope, name, taskSource, execution, problemMatchers) {
      Object.assign(this, { definition, scope, name, taskSource, execution, problemMatchers });
    }
  }
  const vscode = {
    ProcessExecution,
    Task,
    TaskRevealKind: { Always: 'always' },
    TaskPanelKind: { Shared: 'shared' },
    workspace: { getWorkspaceFolder: () => workspace ? folder : undefined },
    tasks: {
      onDidEndTaskProcess(callback) { subscription = callback; return { dispose() {} }; },
      async executeTask(task) {
        if (executeError) throw executeError;
        tasks.push(task);
        queueMicrotask(() => subscription?.({ execution: { task }, exitCode: exitCodes.shift() }));
        return { task };
      },
    },
    window: {
      showErrorMessage(message) { errors.push(message); },
      showInformationMessage(message) { information.push(message); },
    },
  };
  const execFile = (executable, args, options, callback) => {
    events.push('generate');
    calls.push({ executable, args, options });
    if (generationError) return callback(generationError, JSON.stringify(payload ?? {}), 'generation failed');
    callback(null, JSON.stringify(response), '');
  };
  return {
    vscode, directory, sourcePath, outputPath, folder, tasks, errors, information,
    events, calls, document,
    dispose: () => fs.rm(directory, { recursive: true, force: true }),
    args: { vscode, documentUri: { fsPath: sourcePath, scheme: 'file' }, document, pythonPath, nodePath, execFile },
  };
}

test('asks the CLI for JSON, then executes only its returned plan', async (t) => {
  const env = await fixture({ payload: {
    schema_version: 1, file: 'misleading.en', version: '0.2', supported_versions: ['0.1', '0.2'],
    target: 'python', form: 'instructions', examples: { present: false, count: 0 },
    plan: { output_path: '/tmp/generated file.py', runtime: 'python', run_examples: false,
      run_args: ['/tmp/generated file.py', '--custom-flag'] }, written: true, diagnostics: [],
  }, source: 'target javascript\n# Example input: misleading\n' });
  t.after(env.dispose);

  const result = await runFile(env.args);

  assert.equal(result, true);
  assert.deepEqual(env.calls[0].args, ['-m', 'codeinenglish', 'generate', env.sourcePath, '--json']);
  assert.equal(env.calls[0].executable, 'python3');
  assert.deepEqual(env.tasks[0].execution.args, ['/tmp/generated file.py', '--custom-flag']);
  assert.equal(env.tasks[0].execution.process, 'python3');
  assert.deepEqual(env.events, ['generate']);
});

test('uses the exact example-checker arguments supplied by the run plan', async (t) => {
  const env = await fixture({ payload: {
    schema_version: 1, file: 'x.en', version: '0.2', supported_versions: ['0.1', '0.2'],
    target: 'javascript', form: 'problem', examples: { present: true, count: 2 },
    plan: { output_path: '/tmp/out.js', runtime: 'node', run_examples: true,
      run_args: ['/tmp/out.js', '--check-examples', '--format=json'] }, written: true, diagnostics: [],
  }, nodePath: '/custom node' });
  t.after(env.dispose);
  await runFile(env.args);
  assert.equal(env.tasks[0].execution.process, '/custom node');
  assert.deepEqual(env.tasks[0].execution.args, ['/tmp/out.js', '--check-examples', '--format=json']);
  assert.equal(env.information.length, 1);
});

test('saves a dirty editor document before invoking the CLI', async (t) => {
  const env = await fixture({ dirty: true });
  t.after(env.dispose);
  await runFile(env.args);
  assert.deepEqual(env.events, ['save', 'generate']);
});

test('does not generate when saving the dirty document fails', async (t) => {
  const env = await fixture({ dirty: true, saveResult: false });
  t.after(env.dispose);
  await runFile(env.args);
  assert.equal(env.calls.length, 0);
  assert.equal(env.tasks.length, 0);
  assert.match(env.errors[0], /save/i);
});

test('reports CLI diagnostics at their returned source positions and never runs stale output', async (t) => {
  const diagnostic = { code: 'EN-E302', severity: 'error', file: '/tmp/bad.en', line: 8, column: 4,
    end_line: 8, end_column: 5, message: 'A file cannot mix requests and instructions.', hint: null, related: [] };
  const env = await fixture({ payload: {
    schema_version: 1, file: 'bad.en', version: '0.2', supported_versions: ['0.1', '0.2'],
    target: 'python', form: null, examples: { present: false, count: 0 }, plan: null,
    written: false, diagnostics: [diagnostic],
  } });
  t.after(env.dispose);
  const result = await runFile(env.args);
  assert.equal(result, false);
  assert.equal(env.tasks.length, 0);
  assert.match(env.errors[0], /bad\.en:8:4/);
});

test('refuses unknown JSON schema versions', async (t) => {
  const env = await fixture({ payload: { schema_version: 99, written: true, plan: {} } });
  t.after(env.dispose);
  await runFile(env.args);
  assert.equal(env.tasks.length, 0);
  assert.match(env.errors[0], /update/i);
});

test('refuses to run unless generation reports written true', async (t) => {
  const env = await fixture();
  t.after(env.dispose);
  env.args.execFile = (executable, args, options, callback) => callback(null, JSON.stringify({
    schema_version: 1, file: env.sourcePath, version: '0.2', supported_versions: ['0.1', '0.2'],
    target: 'python', form: 'instructions', examples: { present: false, count: 0 },
    plan: { output_path: env.outputPath, runtime: 'python', run_examples: false, run_args: [env.outputPath] },
    written: false, diagnostics: [],
  }), '');
  await runFile(env.args);
  assert.equal(env.tasks.length, 0);
  assert.match(env.errors[0], /did not write/i);
});

test('reports generation diagnostics from the CLI response', async (t) => {
  const env = await fixture({ generationError: Object.assign(new Error('exit 1'), { code: 1 }) });
  t.after(env.dispose);
  await runFile(env.args);
  assert.equal(env.tasks.length, 0);
  assert.match(env.errors[0], /could not generate/i);
});

test('keeps executable and paths with spaces as separate arguments', async (t) => {
  const env = await fixture({ pythonPath: '/custom Python/python' });
  t.after(env.dispose);
  await runFile(env.args);
  assert.equal(env.calls[0].executable, '/custom Python/python');
  assert.equal(env.calls[0].options.cwd, env.directory);
  assert.deepEqual(env.tasks[0].execution.args, [env.outputPath]);
});

test('requires Node when the CLI plan chooses JavaScript', async (t) => {
  const env = await fixture({ nodePath: ' ', payload: {
    schema_version: 1, file: 'x.en', version: '0.2', supported_versions: ['0.1', '0.2'],
    target: 'javascript', form: 'instructions', examples: { present: false, count: 0 },
    plan: { output_path: '/tmp/a.js', runtime: 'node', run_examples: false, run_args: ['/tmp/a.js'] },
    written: true, diagnostics: [],
  } });
  t.after(env.dispose);
  await runFile(env.args);
  assert.equal(env.tasks.length, 0);
  assert.match(env.errors[0], /Node\.js executable/i);
});

test('reports missing workspace without invoking the CLI', async (t) => {
  const env = await fixture({ workspace: false });
  t.after(env.dispose);
  await runFile(env.args);
  assert.equal(env.calls.length, 0);
  assert.match(env.errors[0], /workspace/i);
});
