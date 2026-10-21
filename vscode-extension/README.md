# Code in English Runner for VS Code

This extension adds a **▶ Run** CodeLens to `.en` files. It calls the separately installed `codeinenglish` Python package to generate a sibling `.py` or `.js` file, then checks embedded examples or starts the generated program in the integrated terminal.

The extension calls one `codeinenglish generate` command. A standalone `target python` directive selects Python output: comment-only files request a problem solution, while files with English instructions run as programs. The older `import codeinpython library` problem directive also works.

## Requirements

- VS Code 1.80 or newer.
- Python 3.10 or newer.
- The `codeinenglish` package installed in the same Python interpreter configured by `codeinenglish.pythonPath`.
- Node.js for files declaring `target javascript`.

## Install the Python package

Install EN-Library into your chosen interpreter. The GitHub command needs network access for installation; the package itself works offline after installation:

```sh
python3 -m pip install git+https://github.com/anaslari23/EN-Library.git@feat/en-architecture
```

If you installed the package into a virtual environment, configure the extension to use that environment's Python executable. For example:

```json
{
  "codeinenglish.pythonPath": "/path/to/venv/bin/python"
}
```

The setting must point to the interpreter where `codeinenglish` is installed. Installing this VS Code extension alone does not install the Python package.

## Build and install the extension

From the repository root:

```sh
cd vscode-extension
npm install
npm test
npm run package
```

This creates a versioned VSIX. In VS Code, open the Extensions view, select the `...` menu, choose **Install from VSIX...**, and select the generated file. To update the extension, build and install the new VSIX the same way.

## Use

Open a saved `.en` file in a workspace and click **▶ Run** above the prompt.

- With `target python` and a comment-only problem request, the extension generates a solution. If there are `Example input:` / `Example output:` comments, it runs `--check-examples`.
- With a problem request and no examples, it starts the generated solution in the integrated terminal. Enter one JSON object matching the generated function's arguments, then press Return.
- With English instruction lines, it translates and starts the resulting Python. Comments in such a file are documentation.
- With `target javascript`, it generates a `.js` file and uses the configured `codeinenglish.nodePath` (default `node`) to run it. JavaScript currently supports literal/name assignments, `show`, and ascending numeric sort problems.

The generated `.py` or `.js` file is saved beside the `.en` source. The extension does not edit the source. It does not start generated code unless generation succeeds.

## Troubleshooting

- **No module named `codeinenglish`:** install EN-Library into the configured interpreter.
- **Wrong Python is being used:** set `codeinenglish.pythonPath` to the exact executable used for `python -m pip install`.
- **Python executable not found:** use an absolute path to the interpreter or a command available to VS Code.
