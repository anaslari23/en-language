# VS Code Run Button Design

## Goal

Make the existing Code in English `.en` → Python workflow easy to start from VS Code. A beginner should be able to open an `.en` problem file and click **▶ Run** without manually entering the translation command.

## User workflow

1. The user opens a `.en` file in VS Code.
2. A **▶ Run** CodeLens appears above the file.
3. Clicking it invokes the existing `codeinenglish solve` CLI for the active file and writes the generated `.py` file beside it.
4. If the `.en` file includes one or more `Example input` / `Example output` pairs, the extension runs the generated program's `--check-examples` mode in the integrated terminal and shows the pass/fail result.
5. If no example pair is present, the extension runs the generated Python program in the integrated terminal and leaves it ready for the user to enter JSON input.
6. The user can open and inspect the generated `.py` file from the editor or Explorer.

## Design

Implement a small, local VS Code extension in the existing repository. It contributes a CodeLens provider for `.en` documents and a command that orchestrates the existing CLI and generated Python program. The extension does not implement English recognition or Python generation; those stay in `codeinenglish`.

Package the extension as a local VSIX and document how to install and update it in VS Code. Marketplace publishing is not part of this change.

The extension runs commands using the active workspace folder as the working directory and a configurable Python executable (`codeinenglish.pythonPath`, default `python3`). It reports missing workspace, missing Python executable, CLI diagnostics, and generation failures in the integrated terminal or VS Code notification. It must quote paths safely, support spaces in folder and file names, and avoid shell interpolation of prompt text.

For files with examples, `--check-examples` is the verification action. The first version reports whether the examples passed; it does not promise the examples prove correctness for all inputs. For files without examples, the generated program's existing JSON stdin interface remains available in the terminal. A custom form for entering values is deferred.

## Constraints

- Keep the Python package offline and dependency-free; the extension adds no runtime model or network requirement.
- Never execute the generated `.py` during the `solve` generation step. The extension explicitly launches it only after successful generation.
- Do not overwrite the `.en` source. Keep generated Python beside the source file.
- Preserve the current CLI behavior and the generated program's JSON interface.
- The Run CodeLens is available only for `.en` files and should not appear on ordinary Python or Markdown documents.

## Acceptance criteria

- Opening an `.en` file shows a **▶ Run** CodeLens.
- Clicking it runs `python3 -m codeinenglish solve <active-file>` from the workspace and creates the sibling `.py` file.
- With embedded examples, the integrated terminal shows the result of `--check-examples` and returns a failure status for a wrong expected result.
- Without embedded examples, the generated program starts in the integrated terminal and accepts a JSON input line.
- Filenames and workspace paths containing spaces work.
- Unsupported prompts, missing Python, and missing workspace produce actionable messages and do not run stale generated output.
- Existing Python package tests continue to pass; extension behavior has automated tests for CodeLens visibility, command invocation, example/no-example handling, and error paths.
- A locally installable VSIX is produced, with short install/update instructions for the user.

## Out of scope

- A custom GUI form for algorithm inputs.
- An editor for generated Python or automatic edits to the `.en` file.
- Support for arbitrary English beyond the deterministic recognizer's current problem families.
- Packaging or publishing the extension to the VS Code Marketplace in this iteration.
