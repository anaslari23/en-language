# Offline Code in English Interpreter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give users one dependable, model-free workflow for translating supported `.en` instructions and problem descriptions into reviewable Python, from the command line or VS Code.

**Architecture:** Keep `EN-Library` as the sole interpreter implementation. Its deterministic front ends parse instruction-style English and comment-based problem requests into structured representations, then a shared Python generator emits validated source. Keep the VS Code extension in `en-language` as a thin client of the installed package; keep other output-language backends as a later, separately planned milestone.

**Tech Stack:** Python 3.10+ standard library; `argparse`, Python `ast`, `unittest`; VS Code Extension API and Node.js built-in test runner; `pip` packaging.

**Spec:** [SPEC.md](../../SPEC.md), [Code in English design](../specs/2026-10-19-code-in-english-design.md), and [repository split design](../specs/2026-10-19-library-language-repository-split-design.md).

## Global Constraints

- Do not use or require an AI model, hosted service, network connection at runtime, downloaded model data, or third-party runtime dependency.
- State supported wording and constructs honestly; deterministic rules do not promise to translate arbitrary English.
- Preserve the public `codeinenglish` import name and existing `translate`, `translate_file`, `solve`, and `solve_file` behavior.
- Generate ordinary Python, validate it with `ast.parse`, and never execute it during translation.
- Keep the single maintained interpreter implementation in `EN-Library`; do not vendor it into `en-language` or the VS Code extension.
- Reject unsupported, ambiguous, conflicting, and malformed requests with source-located diagnostics; failed generation must preserve existing output files.
- Use independently authored English examples; do not scrape or copy problem statements.
- The first release target is Python. A second language backend requires its own design and conformance plan after the shared representation is stable.

## Review Focus

- A comment containing negation or a result-changing qualifier must not lose it during normalization; add `test_negation_and_result_qualifiers_are_preserved` in parser and recognizer test modules.
- A prompt with two conflicting requirements must fail with a source-located ambiguity diagnostic and leave an existing `.py` unchanged; add `test_conflicting_constraints_preserve_existing_output` in `EN-Library/tests/test_problem_solver.py`.
- A supported paraphrase must map to the same canonical program or problem specification as its equivalent wording; add `test_paraphrases_produce_same_problem_spec` in `EN-Library/tests/test_problem_recognizer.py` and equivalent IR assertions in `test_parser.py`.
- An unsupported `.en` program must not cause VS Code to run an old sibling `.py`; add `test_generation_failure_does_not_run_stale_output` in `vscode-extension/test/run-file.test.js`.
- A project path containing spaces and a configured Python executable path must reach the CLI as separate process arguments; add `test_process_arguments_preserve_paths_with_spaces_and_python_path` in `vscode-extension/test/run-file.test.js`.

---

## File Structure

### EN-Library repository (`https://github.com/anaslari23/EN-Library`)

- `codeinenglish/`: sole maintained deterministic parser, recognizers, structured representation, Python code generation, public API, and CLI.
- `tests/`: unit and CLI tests; self-contained `.en` fixtures and original paraphrases.
- `pyproject.toml`, `README.md`: install metadata and package usage contract.

### en-language repository (`https://github.com/anaslari23/en-language`, current workspace)

- `vscode-extension/src/extension.js`: `.en` CodeLens registration and command wiring.
- `vscode-extension/src/run-file.js`: process orchestration only; call the configured package CLI, then run generated Python after successful generation.
- `vscode-extension/test/`: Node tests for dispatch and process safety.
- `SPEC.md`, `README.md`, `examples/`, `scripts/`: user-facing syntax, workflow, and end-to-end examples; no interpreter source copy.

---

### Task 1: Define the interpreter contract and capability inventory

**Files:**
- Modify in EN-Library: `README.md`
- Modify in EN-Library: `tests/fixtures/` (add original representative requests)
- Modify in en-language: `SPEC.md`
- Modify in en-language: `README.md`

**Interfaces:**
- Preserve the current Python API and `translate`/`solve` CLI commands.
- Document the `.en` directive `import codeinpython library` as the selector for comment-based problem solving; ordinary instruction `.en` files use the instruction translator.
- Define one reviewed capability table listing each accepted instruction construct and DSA family, its input/result contract, and unsupported variations.

- [ ] **Step 1: Add contract tests** in `EN-Library/tests/test_cli.py` and `EN-Library/tests/test_translator.py` that assert the existing API exports and CLI subcommands remain available; create one instruction fixture and one comment problem fixture with the exact directive.
- [ ] **Step 2: Run `python3 -m unittest discover -s tests -p 'test_cli.py' -v` and `python3 -m unittest discover -s tests -p 'test_translator.py' -v`** from the EN-Library repository and record any existing behavior mismatch before changing implementation.
- [ ] **Step 3: Record the accepted capability inventory** in the package and language documentation. For each DSA family, include canonical inputs, output, material defaults, and at least three independently authored phrasings.
- [ ] **Step 4: Run the focused tests** and documentation examples; confirm both front ends remain explicit and do not claim unrestricted English understanding.

### Task 2: Unify generation behind a stable Python target pipeline

**Files:**
- Modify: `EN-Library/codeinenglish/__init__.py`
- Modify: `EN-Library/codeinenglish/translator.py`
- Modify: `EN-Library/codeinenglish/problem_solver.py`
- Modify: `EN-Library/codeinenglish/problem_prompt.py`
- Modify: `EN-Library/codeinenglish/__main__.py`
- Test: `EN-Library/tests/test_translator.py`
- Test: `EN-Library/tests/test_problem_solver.py`
- Test: `EN-Library/tests/test_cli.py`

**Interfaces:**
- Add `generate_file(source_path: str | Path, output_path: str | Path | None = None) -> Path` as a convenience entry point that dispatches from the `.en` directive and writes the generated `.py` atomically.
- Add CLI form `python -m codeinenglish generate SOURCE [--output PATH]`; retain `translate` and `solve` as explicit lower-level commands.
- Keep generated-source execution out of the package generation path.

- [ ] **Step 1: Write failing API tests** for instruction dispatch, directive-based problem dispatch, explicit output paths, same-source/output rejection, and preservation of existing output after an error.
- [ ] **Step 2: Run the new API tests** and confirm they fail because `generate_file` and the `generate` command do not exist.
- [ ] **Step 3: Implement `generate_file`** by detecting the exact directive using shared comment extraction from `problem_prompt.py`, then routing to `translate_file` or `solve_file`; reuse `_write_python` or the existing atomic writer rather than introducing a second parser or generator.
- [ ] **Step 4: Write failing CLI tests** for default sibling output, `--output`, path reporting, unsupported prompts, and exit codes.
- [ ] **Step 5: Implement the `generate` CLI command** while preserving the existing commands and their behavior.
- [ ] **Step 6: Run the EN-Library unit and CLI suites**; confirm both old and new entry points pass and the package never executes output during generation.

### Task 3: Grow compositional instruction understanding

**Files:**
- Modify: `EN-Library/codeinenglish/parser.py`
- Modify: `EN-Library/codeinenglish/expressions.py`
- Modify: `EN-Library/codeinenglish/ir.py`
- Modify: `EN-Library/codeinenglish/python_generator.py`
- Test: `EN-Library/tests/test_parser.py`
- Test: `EN-Library/tests/test_expressions.py`
- Test: `EN-Library/tests/test_python_generator.py`

**Interfaces:**
- Input: instruction-style English statements.
- Output: existing typed IR followed by validated Python source.
- Add only compositional constructs supported by the capability table; preserve existing spellings and aliases.

- [ ] **Step 1: Add failing tests** for combinations of assignment, output, conditions, loops, collections, and class/method forms already present in `parser.py`; assert IR structure, not generated formatting. Add a separate failing test before expanding any unsupported construct.
- [ ] **Step 2: Run the focused `unittest` modules** and identify unsupported combinations without changing current behavior.
- [ ] **Step 3: Implement one grammar increment at a time** in `parser.py`, `expressions.py`, and `ir.py`; keep quote-aware tokenization, source locations, and explicit grammar rules, and do not add catch-all English guessing.
- [ ] **Step 4: Add equivalence tests** showing synonyms and harmless word-order variants produce equal IR, while unknown names, negation, and ambiguous phrases produce diagnostics.
- [ ] **Step 5: Run parser, expression, generator, and API suites**; syntax-parse every generated sample with Python's `ast` module.
- [ ] **Step 6: Update the capability table and `.en` examples** to match only behavior verified by tests.

### Task 4: Make problem interpretation evidence-based and extensible

**Files:**
- Modify: `EN-Library/codeinenglish/problem_recognizer.py` (`ProblemSpec` and deterministic recognition)
- Modify: `EN-Library/codeinenglish/problem_strategies.py`
- Modify: `EN-Library/codeinenglish/problem_solver.py`
- Test: `EN-Library/tests/test_problem_recognizer.py`
- Test: `EN-Library/tests/test_problem_strategies.py`
- Modify: `en-language/examples/` (original examples only)

**Interfaces:**
- Each recognized request produces a typed `ProblemSpec` with canonical inputs, requested result, constraints, evidence, and explicit defaults.
- Each strategy declares the `ProblemSpec` shape it accepts and returns existing Python IR/code-generation structures; recognizers must not generate source strings directly.

- [ ] **Step 1: Add failing paraphrase tests** to `test_problem_recognizer.py` for each supported family, including materially different wordings and negation/qualifier cases.
- [ ] **Step 2: Add failing strategy tests** for normal, empty, duplicate, absent-result, and boundary inputs appropriate to each family.
- [ ] **Step 3: Update `problem_recognizer.py`** so synonyms map to canonical concepts and every result-changing assumption is either stated in the prompt or emitted as a documented default.
- [ ] **Step 4: Reject ambiguity and unsupported constraints** through `CodeInEnglishError` with file and line information; verify failed recognition does not write or replace generated output.
- [ ] **Step 5: Run recognition and strategy suites**, plus finite-domain/reference checks where practical; update examples and capability documentation from the verified results.

### Task 5: Route VS Code through the unified interpreter command

**Files:**
- Modify: `en-language/vscode-extension/src/run-file.js`
- Modify: `en-language/vscode-extension/src/extension.js`
- Modify: `en-language/vscode-extension/test/run-file.test.js`
- Modify: `en-language/vscode-extension/README.md`
- Modify: `en-language/examples/.vscode/settings.json`

**Interfaces:**
- Generation process: configured Python executable plus `-m codeinenglish generate SOURCE [--output PATH]`, using argument arrays and workspace `cwd`.
- On successful generation only, the extension may launch the generated `.py` as an explicit user-requested Run action. On generation failure it must not run a stale sibling file.
- Preserve interactive terminal input and embedded-example behavior documented for the generated Python program.

- [ ] **Step 1: Add failing extension tests** asserting the unified CLI arguments for both source types, paths with spaces, configured Python path, correct working directory, and suppression of execution after generation failure.
- [ ] **Step 2: Run `npm test`** in `en-language/vscode-extension` and confirm the new cases fail against the old `solve`/`translate` branching.
- [ ] **Step 3: Route the extension through `generate`** and preserve its existing user-visible output/run behavior.
- [ ] **Step 4: Run the extension suite** and assert no process is launched for unsupported or ambiguous input.
- [ ] **Step 5: Update installation and troubleshooting docs** to state that users install EN-Library into the exact Python interpreter selected by `codeinenglish.pythonPath`.

### Task 6: Verify installation and publishable package readiness

**Files:**
- Modify: `EN-Library/pyproject.toml`
- Modify: `EN-Library/README.md`
- Modify: `en-language/README.md`
- Modify: `en-language/scripts/verify_library.py`
- Test: `EN-Library/tests/test_package_install.py` and `en-language/scripts/verify_library.py`

**Interfaces:**
- Installation remains `pip install`-based for Python users; VS Code continues to call the interpreter configured by its setting.
- This task verifies build/install readiness and documents installation from the chosen repository source. Publishing to PyPI or the VS Code Marketplace is a separate explicit release action.

- [ ] **Step 1: Extend `test_package_install.py`** to build and install EN-Library into a fresh virtual environment, import `codeinenglish`, and run `generate_file` against one instruction fixture and one problem fixture.
- [ ] **Step 2: Run the smoke check** and confirm it detects packaging omissions, missing package files, or entry-point errors.
- [ ] **Step 3: Fix packaging metadata and install instructions** without adding runtime dependencies or downloading data at runtime.
- [ ] **Step 4: Run the complete EN-Library suite, integration script, and VS Code extension tests** from clean environments.
- [ ] **Step 5: Package the local VSIX** and inspect its contents to confirm it contains only extension runtime files and its manifest.

## Later, Separate Milestones

- **Additional output languages:** design a target-neutral IR contract and one backend at a time (for example JavaScript); add cross-backend behavior fixtures before claiming equivalence. Do not add a second-language backend to the first Python interpreter milestone.
- **Public release:** verify package-name availability and release metadata, then prepare PyPI and Marketplace publishing as a separate reviewed release plan.
- **Broader English coverage:** add a documented construct or problem family only with original paraphrases, ambiguity cases, strategy tests, and generated-output review.

## Self-Review

- Spec coverage: Tasks 1–6 cover the offline/no-model contract, instruction translation, problem recognition, shared generation, CLI/editor entry points, diagnostics, packaging, and end-to-end verification. Other language backends and public publishing are explicitly separate milestones.
- Interface consistency: `generate_file(source_path, output_path=None)` is the API used by the CLI; VS Code invokes the `generate` CLI and runs output only after generation succeeds.
- Review focus: all five high-risk input/process conditions have a named test in the owning package or extension task.
- Scope: Python is the initial target; no model, network runtime, arbitrary-English guarantee, new runtime dependency, or duplicated interpreter is introduced.
