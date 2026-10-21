# Code in English Runner for VS Code

This extension adds a **▶ Run** CodeLens to `.en` files. It calls the separately installed `codeinenglish` Python package to generate a sibling `.py` or `.js` file, then checks embedded examples or starts the generated program in the integrated terminal.

The extension calls `python -m codeinenglish generate FILE.en --json` and follows the returned run plan. It does not parse the `.en` file itself. In `en 0.2`, a problem request is a contiguous block of `#?` lines; ordinary `#` comments are documentation. `target python` or `target javascript` selects the output, with Python as the default. Headerless and `en 0.1` files keep legacy interpretation and show a deprecation warning. The old `import codeinpython library` alias is rejected in `en 0.2`.

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

Open an `.en` file in a workspace and click **▶ Run** above the prompt. If it has unsaved changes, the extension saves it first; cancelling or failing to save stops the run.

- With an `en 0.2` `#?` request block, the extension generates a solution. If it has `Example input:` / `Example output:` lines, the CLI includes `--check-examples` in the run plan.
- With a problem request and no examples, it starts the generated solution in the integrated terminal. Enter one JSON object matching the generated function's arguments, then press Return.
- With English instruction lines, it translates and starts the resulting Python. In `en 0.2`, ordinary comments are documentation.
- With `target javascript`, it generates a `.js` file and uses the configured `codeinenglish.nodePath` (default `node`) to run it. JavaScript currently supports literal/name assignments, `show`, and ascending numeric sort problems.

The generated `.py` or `.js` file is saved beside the `.en` source. The extension does not edit the source. It runs only the exact runtime arguments returned by the CLI after successful generation; it never falls back to a stale sibling file when generation fails.

## Troubleshooting

- **No module named `codeinenglish`:** install EN-Library into the configured interpreter.
- **Wrong Python is being used:** set `codeinenglish.pythonPath` to the exact executable used for `python -m pip install`.
- **Python executable not found:** use an absolute path to the interpreter or a command available to VS Code.
- **Legacy source warning:** add `en 0.2`, then convert a problem prompt to `#?` lines. Preview the conversion with `python -m codeinenglish migrate FILE.en` before applying it with `--write`.
