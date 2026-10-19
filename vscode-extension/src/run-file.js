const fs = require('node:fs/promises');
const path = require('node:path');

let taskNumber = 0;

function createTask(vscode, workspaceFolder, pythonPath, args, label) {
  const task = new vscode.Task(
    { type: 'codeinenglish' },
    workspaceFolder,
    `Code in English: ${label} (${++taskNumber})`,
    'Code in English',
    new vscode.ProcessExecution(pythonPath, args, { cwd: workspaceFolder.uri.fsPath }),
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

async function runFile({ vscode, documentUri, pythonPath }) {
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

  let source;
  try {
    source = await fs.readFile(sourcePath, 'utf8');
  } catch (error) {
    vscode.window.showErrorMessage(`Could not read the .en file: ${error.message}`);
    return false;
  }
  const hasExamples = /^\s*#\s*Example input\s*:/im.test(source);
  const generatedPath = path.join(
    path.dirname(sourcePath),
    `${path.basename(sourcePath, path.extname(sourcePath))}.py`,
  );

  try {
    const generateTask = createTask(
      vscode,
      workspaceFolder,
      pythonPath,
      ['-m', 'codeinenglish', 'solve', sourcePath],
      `generate ${path.basename(sourcePath)}`,
    );
    const generationExit = await executeAndWait(vscode, generateTask);
    if (generationExit !== 0) {
      vscode.window.showErrorMessage(`Could not generate Python (exit code ${generationExit ?? 'unknown'}). See the Code in English terminal.`);
      return false;
    }

    const runArgs = hasExamples
      ? [generatedPath, '--check-examples']
      : [generatedPath];
    const runTask = createTask(
      vscode,
      workspaceFolder,
      pythonPath,
      runArgs,
      hasExamples ? `check ${path.basename(sourcePath)}` : `run ${path.basename(sourcePath)}`,
    );

    if (!hasExamples) {
      await vscode.tasks.executeTask(runTask);
      return true;
    }

    const checkExit = await executeAndWait(vscode, runTask);
    if (checkExit !== 0) {
      vscode.window.showErrorMessage(`Example check failed (exit code ${checkExit ?? 'unknown'}). See the Code in English terminal.`);
      return false;
    }
    vscode.window.showInformationMessage('Embedded examples passed.');
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') {
      vscode.window.showErrorMessage(`Python executable '${pythonPath}' was not found. Update codeinenglish.pythonPath in settings.`);
      return false;
    }
    vscode.window.showErrorMessage(`Could not start Python: ${error.message}`);
    return false;
  }
}

module.exports = { runFile };
