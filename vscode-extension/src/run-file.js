const { execFile: nodeExecFile } = require('node:child_process');
const path = require('node:path');

let taskNumber = 0;

function createTask(vscode, workspaceFolder, executable, args, label) {
  const task = new vscode.Task(
    { type: 'codeinenglish' },
    workspaceFolder,
    `Code in English: ${label} (${++taskNumber})`,
    'Code in English',
    new vscode.ProcessExecution(executable, args, { cwd: workspaceFolder.uri.fsPath }),
    [],
  );
  task.presentationOptions = {
    reveal: vscode.TaskRevealKind.Always,
    focus: true,
    panel: vscode.TaskPanelKind.Shared,
  };
  return task;
}

function executeAndWait(vscode, task) {
  let subscription;
  const finished = new Promise((resolve) => {
    subscription = vscode.tasks.onDidEndTaskProcess((event) => {
      if (event.execution.task.name !== task.name) return;
      subscription.dispose();
      resolve(event.exitCode);
    });
  });
  return vscode.tasks.executeTask(task).then(() => finished, (error) => {
    subscription.dispose();
    throw error;
  });
}

function callCli(execFile, executable, args, options) {
  return new Promise((resolve, reject) => {
    execFile(executable, args, options, (error, stdout = '', stderr = '') => {
      if (error) {
        error.stdout = stdout;
        error.stderr = stderr;
        reject(error);
      } else {
        resolve({ stdout, stderr });
      }
    });
  });
}

function parseResponse(stdout) {
  let response;
  try {
    response = JSON.parse(stdout);
  } catch {
    throw new Error('The Code in English CLI did not return valid JSON. Update codeinenglish and the VS Code extension.');
  }
  if (!response || response.schema_version !== 1) {
    throw new Error('This Code in English CLI uses an unknown response format. Update codeinenglish and the VS Code extension.');
  }
  const validDiagnostic = (item) => item && typeof item.code === 'string'
    && ['error', 'warning'].includes(item.severity) && typeof item.message === 'string'
    && typeof item.file === 'string' && Number.isInteger(item.line) && Number.isInteger(item.column)
    && Number.isInteger(item.end_line) && Number.isInteger(item.end_column)
    && (item.hint === null || typeof item.hint === 'string') && Array.isArray(item.related);
  if (typeof response.file !== 'string'
      || !(response.version === null || typeof response.version === 'string')
      || !Array.isArray(response.supported_versions) || !response.supported_versions.every((item) => typeof item === 'string')
      || !['python', 'javascript'].includes(response.target)
      || !(response.form === null || ['instructions', 'problem'].includes(response.form))
      || !response.examples || typeof response.examples.present !== 'boolean'
      || !Number.isInteger(response.examples.count)
      || !Array.isArray(response.diagnostics) || !response.diagnostics.every(validDiagnostic)
      || typeof response.written !== 'boolean') {
    throw new Error('The Code in English CLI returned an incomplete run plan. Update codeinenglish and the VS Code extension.');
  }
  return response;
}

function showDiagnostics(vscode, diagnostics) {
  const errors = diagnostics.filter((item) => item.severity === 'error');
  if (!errors.length) return false;
  const message = errors.map((item) => `${item.file}:${item.line}:${item.column}: ${item.message}`).join('\n');
  vscode.window.showErrorMessage(message);
  return true;
}

function validatePlan(response) {
  const plan = response.plan;
  if (!plan || typeof plan.output_path !== 'string' || !['python', 'node'].includes(plan.runtime)
      || typeof plan.run_examples !== 'boolean' || !Array.isArray(plan.run_args)
      || !plan.run_args.every((argument) => typeof argument === 'string')) {
    throw new Error('The Code in English CLI returned an invalid run plan. Update codeinenglish and the VS Code extension.');
  }
}

async function runFile({ vscode, documentUri, document, pythonPath, nodePath = 'node', execFile = nodeExecFile }) {
  if (!documentUri || documentUri.scheme && documentUri.scheme !== 'file') {
    vscode.window.showErrorMessage('Open a saved .en file in a workspace before running it.');
    return false;
  }
  const sourcePath = documentUri.fsPath;
  if (path.extname(sourcePath).toLowerCase() !== '.en') {
    vscode.window.showErrorMessage('Run Code in English is available only for .en files.');
    return false;
  }
  const workspaceFolder = vscode.workspace.getWorkspaceFolder(documentUri);
  if (!workspaceFolder) {
    vscode.window.showErrorMessage('Open a workspace folder in VS Code before running this file.');
    return false;
  }
  if (typeof pythonPath !== 'string' || !pythonPath.trim()) {
    vscode.window.showErrorMessage('Set a Python executable in the Code in English settings first.');
    return false;
  }

  try {
    if (document?.isDirty) {
      const saved = await document.save();
      if (!saved) {
        vscode.window.showErrorMessage('Save the .en file before running it.');
        return false;
      }
    }

    let response;
    try {
      const result = await callCli(execFile, pythonPath,
        ['-m', 'codeinenglish', 'generate', sourcePath, '--json'],
        { cwd: workspaceFolder.uri.fsPath, encoding: 'utf8', maxBuffer: 1024 * 1024 });
      response = parseResponse(result.stdout);
    } catch (error) {
      if (typeof error.stdout === 'string' && error.stdout.trim()) {
        try {
          response = parseResponse(error.stdout);
        } catch {
          // Fall through to the CLI error below.
        }
      }
      if (!response) {
        vscode.window.showErrorMessage(`Could not generate code: ${error.stderr || error.message || 'CLI failed.'}`.trim());
        return false;
      }
    }

    if (showDiagnostics(vscode, response.diagnostics)) return false;
    if (!response.written) {
      vscode.window.showErrorMessage('The CLI did not write generated code, so nothing was run.');
      return false;
    }
    validatePlan(response);

    const executable = response.plan.runtime === 'node' ? nodePath : pythonPath;
    if (typeof executable !== 'string' || !executable.trim()) {
      const runtimeName = response.plan.runtime === 'node' ? 'Node.js' : 'Python';
      vscode.window.showErrorMessage(`Set a ${runtimeName} executable in the Code in English settings first.`);
      return false;
    }
    const task = createTask(vscode, workspaceFolder, executable, response.plan.run_args,
      response.plan.run_examples ? `check ${path.basename(sourcePath)}` : `run ${path.basename(sourcePath)}`);

    if (!response.plan.run_examples) {
      await vscode.tasks.executeTask(task);
      return true;
    }
    const checkExit = await executeAndWait(vscode, task);
    if (checkExit !== 0) {
      vscode.window.showErrorMessage(`Example check failed (exit code ${checkExit ?? 'unknown'}). See the Code in English terminal.`);
      return false;
    }
    vscode.window.showInformationMessage('Embedded examples passed.');
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') {
      const executable = error.spawnargs?.[0] || pythonPath;
      vscode.window.showErrorMessage(`Executable '${executable}' was not found. Check the Code in English runtime settings.`);
      return false;
    }
    vscode.window.showErrorMessage(`Could not start Code in English: ${error.message}`);
    return false;
  }
}

module.exports = { runFile, parseResponse, validatePlan };
