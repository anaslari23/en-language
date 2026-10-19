const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { runFile } = require('../src/run-file');

async function fixture({ source, exitCodes = [0, 0], workspace = true, pythonPath = 'python3', executeError } = {}) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'codeinenglish run '));
  const sourcePath = path.join(directory, 'my problem.en');
  await fs.writeFile(sourcePath, source ?? '# Find two numbers that add up to target and return indices.\n', 'utf8');
  const folder = { uri: { fsPath: directory }, name: 'workspace' };
  const tasks = [];
  const errors = [];
  const information = [];
  const listeners = [];
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
    TaskScope: { Workspace: 1 },
    TaskRevealKind: { Always: 'always' },
    TaskPanelKind: { Shared: 'shared' },
    workspace: {
      getWorkspaceFolder: () => workspace ? folder : undefined,
    },
    tasks: {
      onDidEndTaskProcess(callback) {
        listeners.push(callback);
        return { dispose() {} };
      },
      async executeTask(task) {
        if (executeError) throw executeError;
        if (task.definition.type !== 'codeinenglish' || task.scope !== folder) {
          throw new Error('Task is not valid');
        }
        tasks.push(task);
        const exitCode = exitCodes.shift();
        if (exitCode !== undefined) {
          queueMicrotask(() => {
            for (const listener of listeners) listener({ execution: { task }, exitCode });
          });
        }
        return { task };
      },
    },
    window: {
      showErrorMessage(message) { errors.push(message); },
      showInformationMessage(message) { information.push(message); },
    },
  };
  return {
    vscode, directory, sourcePath, folder, tasks, errors, information,
    dispose: () => fs.rm(directory, { recursive: true, force: true }),
    args: { vscode, documentUri: { fsPath: sourcePath }, pythonPath },
  };
}

test('runs solve then embedded example check with workspace cwd', async (t) => {
  const env = await fixture({ source: '# Example input: {"nums":[2,7],"target":9}\n# Example output: [0,1]\n' });
  t.after(env.dispose);

  await runFile(env.args);

  assert.equal(env.tasks.length, 2);
  assert.deepEqual(env.tasks[0].execution.args, ['-m', 'codeinenglish', 'solve', env.sourcePath]);
  assert.deepEqual(env.tasks[1].execution.args, [env.sourcePath.replace(/\.en$/, '.py'), '--check-examples']);
  assert.equal(env.tasks[0].execution.options.cwd, env.directory);
  assert.equal(env.tasks[0].presentationOptions.focus, true);
  assert.equal(env.tasks[0].presentationOptions.reveal, 'always');
  assert.equal(env.information.length, 1);
});

test('starts the generated program without flags when no examples are present', async (t) => {
  const env = await fixture();
  t.after(env.dispose);

  await runFile(env.args);

  assert.deepEqual(env.tasks.map((task) => task.execution.args), [
    ['-m', 'codeinenglish', 'solve', env.sourcePath],
    [env.sourcePath.replace(/\.en$/, '.py')],
  ]);
});

test('keeps paths with spaces as individual process arguments', async (t) => {
  const env = await fixture({ source: '# Example input: {}\n# Example output: null\n', pythonPath: '/custom python/python' });
  t.after(env.dispose);

  await runFile(env.args);

  assert.equal(env.tasks[0].execution.process, '/custom python/python');
  assert.equal(env.tasks[0].execution.args[3], env.sourcePath);
  assert.equal(env.tasks[1].execution.args[0], env.sourcePath.replace(/\.en$/, '.py'));
});

test('does not execute stale output when generation fails', async (t) => {
  const env = await fixture({ exitCodes: [1] });
  t.after(env.dispose);

  await runFile(env.args);

  assert.equal(env.tasks.length, 1);
  assert.match(env.errors[0], /could not generate/i);
});

test('reports a failing embedded example check', async (t) => {
  const env = await fixture({ source: '# Example input: {}\n# Example output: null\n', exitCodes: [0, 1] });
  t.after(env.dispose);

  await runFile(env.args);

  assert.equal(env.tasks.length, 2);
  assert.match(env.errors[0], /example check failed/i);
  assert.equal(env.information.length, 0);
});

test('reports missing workspace without starting a task', async (t) => {
  const env = await fixture({ workspace: false });
  t.after(env.dispose);

  await runFile(env.args);

  assert.equal(env.tasks.length, 0);
  assert.match(env.errors[0], /open a workspace/i);
});

test('reports an empty Python executable without starting a task', async (t) => {
  const env = await fixture({ pythonPath: '  ' });
  t.after(env.dispose);

  await runFile({ ...env.args, pythonPath: '  ' });

  assert.equal(env.tasks.length, 0);
  assert.match(env.errors[0], /python executable/i);
});

test('reports a missing configured Python executable clearly', async (t) => {
  const missingPython = Object.assign(new Error('spawn python3 ENOENT'), { code: 'ENOENT' });
  const env = await fixture({ executeError: missingPython });
  t.after(env.dispose);

  await runFile(env.args);

  assert.equal(env.tasks.length, 0);
  assert.match(env.errors[0], /python executable .*not found/i);
});
