# Python Library and EN Language Repository Split Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the tested `codeinenglish` Python distribution into EN-Library and leave en-language as the `.en` language project with examples and editor integration.

**Architecture:** EN-Library owns one installable, standard-library-only Python package, its CLI, and self-contained tests. en-language owns the language specification, canonical `.en` examples, and VS Code extension, and installs/uses the library instead of vendoring its source.

**Tech Stack:** Python 3.10+, existing custom pure-Python build backend, Python `unittest`, VS Code extension (JavaScript), GitHub repository contents and Git data APIs for publishing the two repository states.

**Spec:** `docs/superpowers/specs/2026-10-19-library-language-repository-split-design.md`

## Global Constraints

- Keep one maintained copy of translator source code, in EN-Library.
- Preserve package/import name `codeinenglish`, CLI name `codeinenglish`, Python 3.10 minimum, and current public API: `CodeInEnglishError`, `translate`, `translate_file`, `solve`, and `solve_file`.
- The translator must remain offline, deterministic, and free of runtime dependencies and AI models.
- Keep `.en` syntax and generated Python behavior stable during the repository move.
- Do not publish to PyPI or the VS Code Marketplace.
- Do not remove the old implementation from en-language until EN-Library is populated and verified.

## Review Focus

- Package tests currently read `examples/` from the en-language repository; make the package test suite self-contained with `tests/fixtures/` before separating it.
- An installed package must work from a directory outside its source checkout, both through `import codeinenglish` and `python -m codeinenglish`.
- The VS Code extension uses the selected Python interpreter; documentation must require the library to be installed into that same interpreter.
- Existing en-language remote content is older than the current workspace; preserve current local documentation, examples, and extension instead of resetting from GitHub.
- Do not leave a second copy of `codeinenglish/`, Python package tests, or build backend in en-language after migration.

---

### Task 1: Prepare a self-contained Python distribution for EN-Library

**Files in the EN-Library repository:**
- Create: `README.md`
- Test: `tests/test_package_install.py`
- Copy: `codeinenglish/`, `pyproject.toml`, `build_backend.py`, `bin/codeinenglish`
- Copy and adjust: `tests/`
- Create: `tests/fixtures/` with the minimal original `.en` samples required by existing tests

**Interfaces:**
- Keep `import codeinenglish` and the five current public exports unchanged.
- Keep the `translate` and `solve` CLI subcommands and sibling `.py` output behavior.
- EN-Library's unit tests must run without cloning en-language.

- [x] **Step 1: Add tests proving the public API and CLI work from an installed package outside the source directory.** Cover the imports, a representative `.en` translation, and `python -m codeinenglish solve` output.
- [x] **Step 2: Run** `python3 -m unittest discover -s tests -v` from a clean staging directory before adding the package; confirm the install smoke tests fail because `codeinenglish` is unavailable.
- [x] **Step 3: Copy the existing package and metadata into an isolated EN-Library staging directory.** Keep package/module/command name `codeinenglish` and Python floor `>=3.10`.
- [x] **Step 4: Move test-only `.en` inputs into `tests/fixtures/` and update path-dependent tests.** Retain the canonical example collection in en-language; do not make the package suite depend on it.
- [x] **Step 5: Write the EN-Library README.** Explain offline guarantees, `pip install` from a checkout/GitHub source, `import codeinenglish`, exported API, CLI, supported input families, and current limitations.
- [x] **Step 6: Run** `python3 -m unittest discover -s tests -v`; expect all package tests to pass without an `examples/` directory at repository root. Create a fresh venv, install the staged distribution, then from a directory outside the checkout verify `import codeinenglish`, `python -m codeinenglish translate ...`, and `python -m codeinenglish solve ...`.
### Task 2: Publish the verified package to the empty EN-Library repository

**Files:** All Task 1 package files and metadata.

**Interfaces:**
- Repository: `anaslari23/EN-Library`, default branch `main`.
- Keep package distribution and import name `codeinenglish`.

- [x] **Step 1: Recheck the EN-Library default branch and confirm it is still empty.**
- [x] **Step 2: Create a short README seed commit to initialize the empty default branch.**
- [x] **Step 3: Add the verified package files as one follow-up tree commit** using the seed commit as parent; exclude local virtual environments, caches, build output, and generated VSIX files. Update `main` only if its head still matches the reviewed seed SHA.
- [x] **Step 4: Read back the committed tree, verify package files and README, and record the commit SHA.**
- [~] **Step 5: Install from the published GitHub repository state in a fresh environment and repeat the import and CLI smoke checks.**
  - Staging install and API tree checks passed; installation directly from GitHub remains unverified because shell DNS cannot resolve `github.com`.
### Task 3: Prepare en-language to depend on EN-Library

**Files in the en-language repository:**
- Create: `scripts/verify_library.py`
- Modify: `README.md`
- Modify: `vscode-extension/README.md`
- Modify if needed: `vscode-extension/src/run-file.js` and its tests
- Keep: `SPEC.md`, `examples/`, `docs/`, and `vscode-extension/`

**Interfaces:**
- Install the package from `https://github.com/anaslari23/EN-Library.git` into the Python interpreter selected by `codeinenglish.pythonPath`.
- The extension continues to invoke `python -m codeinenglish`; it contains no translator source.

- [x] **Step 1: Add `scripts/verify_library.py`** to call the selected interpreter on `examples/greeter.en` (translate, run, expect `Hello Ada`) and `examples/two_sum_problem.en` (solve, check examples, expect the example checker success message); write generated `.py` files only to a temporary directory.
- [x] **Step 2: Run the script with the staged library venv interpreter; expect both smoke cases to pass before deleting any implementation files.**
- [x] **Step 3: Update the root README and extension guide to explain that EN-Library provides the Python package and that the extension is separate.** Include the GitHub installation command and same-interpreter requirement.
- [x] **Step 4: Verify the VS Code task launch still calls the external package after installation, including embedded-example and JSON-input paths.** Keep the 0.1.1 task-constructor/task-definition fix.
### Task 4: Remove package ownership from en-language and publish the split

**Files removed from en-language after Task 2 and Task 3 pass:**
- Remove: `codeinenglish/`
- Remove: Python package tests in `tests/`
- Remove: `pyproject.toml`, `build_backend.py`, and `bin/codeinenglish`

**Files retained in en-language:**
- `SPEC.md`, language documentation, `.en` canonical examples, useful generated Python examples, VS Code extension source/tests and local package instructions, and integration smoke check.

- [x] **Step 1: Review the exact en-language removal list against the verified EN-Library tree.** Do not delete `examples/`, language specs, editor integration, or generated example outputs.
- [x] **Step 2: Remove only package-owned implementation/build/test files from en-language and retain integration checks.**
- [x] **Step 3: Run** `python3 scripts/verify_library.py` with the package venv selected and `npm test` under `vscode-extension/`; expect both smoke cases and all extension tests to pass.
- [x] **Step 4: Publish the en-language refactor as a new commit on its current default branch, preserving current workspace content and without force-pushing.**
- [x] **Step 5: Read back both GitHub repository trees and confirm package source exists only in EN-Library and canonical language files remain in en-language.**

## Execution Notes

- The current local en-language workspace has no `.git` directory; the public GitHub repository contains an older state than the workspace. Use an isolated staging copy for package preparation and refresh the remote branch state immediately before each GitHub write. Never reset the working folder from the remote repository.
- EN-Library currently has no files. Create its initial repository content only after local package and install tests pass.
- Publish EN-Library first. Only after it can be installed from GitHub should en-language remove its package copy.
- The current VS Code extension VSIX is local-only and remains a build artifact; do not publish it as a Marketplace extension or commit it as package source.
- No PyPI release is part of this migration.