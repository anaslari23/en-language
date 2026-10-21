const { runFile } = require('./run-file');

function createCodeLensProvider(vscode) {
  return {
    provideCodeLenses(document) {
      if (document.languageId !== 'codeinenglish' || document.uri.scheme !== 'file') {
        return [];
      }
      const range = new vscode.Range(0, 0, 0, 0);
      const command = {
        command: 'codeinenglish.runFile',
        title: '▶ Run',
        arguments: [document.uri],
      };
      return [new vscode.CodeLens(range, command)];
    },
  };
}

function createRunCommand(vscode, run = runFile) {
  return (documentUri) => {
    const pythonPath = vscode.workspace
      .getConfiguration('codeinenglish')
      .get('pythonPath', 'python3');
    const nodePath = vscode.workspace
      .getConfiguration('codeinenglish')
      .get('nodePath', 'node');
    const activeDocument = vscode.window?.activeTextEditor?.document;
    const sameDocument = (left, right) => Boolean(left && right &&
      (left.toString?.() !== '[object Object]' && left.toString?.() === right.toString?.()
        || left.fsPath && left.fsPath === right.fsPath));
    const openDocument = vscode.workspace.textDocuments?.find((document) =>
      sameDocument(document.uri, documentUri));
    const document = sameDocument(activeDocument?.uri, documentUri)
      ? activeDocument
      : openDocument;
    return run({ vscode, documentUri, document, pythonPath, nodePath });
  };
}

function activate(context, vscodeApi) {
  const vscode = vscodeApi || require('vscode');
  const provider = createCodeLensProvider(vscode);
  context.subscriptions.push(
    vscode.languages.registerCodeLensProvider(
      { language: 'codeinenglish', scheme: 'file' },
      provider,
    ),
    vscode.commands.registerCommand(
      'codeinenglish.runFile',
      createRunCommand(vscode),
    ),
  );
}

function deactivate() {}

module.exports = { activate, createCodeLensProvider, createRunCommand, deactivate };
