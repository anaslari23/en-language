# VS Code Run Button Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a local VS Code extension that shows a **▶ Run** CodeLens on `.en` files, generates sibling Python, and runs embedded examples or starts the generated program for JSON input.

**Architecture:** Keep English interpretation and Python generation in the existing Python CLI. Add a small JavaScript VS Code extension under `vscode-extension/`: a CodeLens provider delegates to a command, and the command runs the Python CLI and generated program as VS Code process tasks with argument arrays (no shell interpolation). Package the extension as a local VSIX and document installation.

**Tech Stack:** VS Code Extension API, JavaScript, Node.js built-in `node:test`, existing Python 3.10+ package and CLI, `@vscode/vsce` as a packaging-only development dependency.

**Spec:** `docs/superpowers/specs/2026-10-19-vscode-run-button-design.md`

## Global Constraints

- Keep the Python package offline and dependency-free; the extension adds no runtime model or network requirement.
- Never execute the generated `.py` during the `solve` generation step. The extension explicitly launches it only after successful generation.
- Do not overwrite the `.en` source. Keep generated Python beside the source file.
- Preserve the current CLI behavior and the generated program's JSON interface.
- The Run CodeLens is available only for `.en` files and should not appear on ordinary Python or Markdown documents.
- Use VS Code `ProcessExecution` argument arrays and never interpolate prompt contents into shell commands.
- Marketplace publishing is out of scope; provide a locally installable VSIX and install/update instructions.

## Review Focus

- An unsupported prompt must not cause a stale sibling `.py` to run (test that the second process is never launched after a nonzero solve exit).
- Paths with spaces must remain a single argument for both generation and execution (assert the exact `ProcessExecution` args).
- A source with `Example input:` runs `--check-examples`; a source without it starts the generated program without flags.
- CodeLens must not appear for non-file URIs, `.py`, or Markdown documents, even if activated through the extension.
- Missing workspace and a missing Python executable must produce actionable messages without starting a process.

---

### Task 1: Scaffold the extension and add the `.en` Run CodeLens

**Files:**
- Create: `vscode-extension/package.json`
- Create: `vscode-extension/src/extension.js`
- Create: `vscode-extension/test/extension.test.js`
- Create: `vscode-extension/.vscodeignore`

**Interfaces:**
- Contributes language id `codeinenglish` for `.en` files, command id `codeinenglish.runFile`, and setting `codeinenglish.pythonPath` (default `python3`).
- Registers a `CodeLensProvider` that returns one **▶ Run** CodeLens for a `codeinenglish` document with a local `file` URI, bound to the active document URI.

- [x] **Step 1: Add failing Node tests** for `.en` CodeLens presence and `.py`, Markdown, and non-file URI absence; assert activation registers the command and provider.
- [x] **Step 2: Run** `cd vscode-extension && node --test`; confirm the CodeLens/activation tests fail before implementation.
- [x] **Step 3: Implement** the extension manifest and minimal activation/provider in `src/extension.js`. Use the VS Code API; keep extension activation limited to the contributed language.
- [x] **Step 4: Run** `cd vscode-extension && node --test`; confirm the new tests pass.

### Task 2: Generate and run Python from the CodeLens

**Files:**
- Create: `vscode-extension/src/run-file.js`
- Modify: `vscode-extension/src/extension.js`
- Modify: `vscode-extension/test/extension.test.js`

**Interfaces:**
- `runFile({ vscode, documentUri, pythonPath })` resolves the active workspace and sibling `.py` path, then invokes the existing CLI as `pythonPath -m codeinenglish solve <source>` with workspace `cwd`.
- A successful solve exit launches either `pythonPath <sibling.py> --check-examples` if the comment source contains an `Example input:` marker, or `pythonPath <sibling.py>` otherwise.
- Process launches use `vscode.ProcessExecution` task args, not shell strings. The task terminal is revealed and focused so the user sees output and can enter JSON when the no-example runner starts.
- A failed solve, missing workspace, or missing Python executable never launches a generated file and reports a clear message.

- [x] **Step 1: Add failing tests** for process arguments and cwd, example/no-example branching, paths containing spaces, solve/check failure status, solve failure suppressing execution, and missing workspace/Python errors.
- [x] **Step 2: Run** `cd vscode-extension && node --test`; confirm these run-flow tests fail.
- [x] **Step 3: Implement** `run-file.js` with injectable VS Code task/process dependencies so the orchestration can be tested with Node's built-in test runner. Wait for the solve task's exit event before deciding whether to start the generated program.
- [x] **Step 4: Wire** the registered command to the active document and configured `codeinenglish.pythonPath`.
- [x] **Step 5: Run** `cd vscode-extension && node --test` and the existing Python suite `python3 -m unittest discover -s tests -v`; confirm both pass.
- [ ] **Step 6: Launch** the extension in VS Code's Extension Development Host. Open `examples/two_sum_problem.en`, click **▶ Run**, and confirm the terminal reports its embedded example check. Open `examples/two_sum_short.en`, click **▶ Run**, enter `{"nums":[2,7,11,15],"target":9}` in the terminal, and confirm `[0, 1]`.

### Task 3: Package and document local installation

**Files:**
- Create: `vscode-extension/README.md`
- Modify: `vscode-extension/package.json`
- Modify: root `README.md`
- Create: `vscode-extension/package-lock.json` via npm install

**Interfaces:**
- `npm test` runs the Node tests.
- `npm run package` creates a versioned `.vsix` with `@vscode/vsce` as a development-only dependency.
- Documentation explains how to install/update the local VSIX through VS Code's **Install from VSIX** action and how to set `codeinenglish.pythonPath` if `python3` is not the desired interpreter.

- [x] **Step 1: Add** extension usage and local install/update instructions, including that opening the repository folder or having `codeinenglish` installed is required for the Python CLI to import successfully.
- [x] **Step 2: Add** package scripts and `.vscodeignore` entries so tests, development files, and `node_modules` are excluded from the VSIX while extension sources and manifest are included.
- [x] **Step 3: Run** `cd vscode-extension && npm install && npm test && npm run package`; verify the versioned VSIX is produced.
- [ ] **Step 4: Inspect** the VSIX file list with `npx vsce ls`; verify extension sources and manifest are included while tests and `node_modules` are excluded. Use the Extension Development Host verification from Task 2 for runtime behavior.
- [x] **Step 5: Review** root README and extension README for the exact command, input behavior, troubleshooting, and non-goals; rerun the Python suite and extension tests.

## Execution Notes

- The extension is local-only for this iteration; do not publish it to the VS Code Marketplace.
- The no-example path deliberately keeps the existing JSON stdin interface. A custom form is a later improvement.
- Do not install the generated VSIX into the user's normal VS Code profile during implementation; provide the artifact and installation instructions for the user to apply.
