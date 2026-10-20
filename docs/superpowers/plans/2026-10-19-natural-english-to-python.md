# Offline English-to-Python Translator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn documented English program instructions in `.en` files into editable, syntax-checked Python without a model, network access, or runtime dependencies.

**Architecture:** Parse English expressions and statements into a small typed IR, then construct Python AST nodes and unparse them. Expose source and file translation APIs; the CLI writes generated source atomically and never executes it.

**Tech Stack:** Python 3.10+ standard library (`ast`, `dataclasses`, `pathlib`, `tempfile`, `os`, `argparse`, `unittest`). No runtime dependencies.

**Spec:** `SPEC.md`

## Global Constraints

- The translator is a pure-Python library and command-line tool that works offline without an AI model, network connection, or runtime dependencies.
- Translation never executes generated Python.
- The source `.en` file is not modified. Failed or invalid translation must not replace an existing `.py` output.
- Use a small, typed intermediate representation (IR); do not generate Python by substituting words directly into strings.
- Validate Python with the built-in `ast` module.
- Do not implement loops, collections, functions, or general algorithm recognition in this milestone.

## Review Focus

- An `and` inside quoted text must not split or alter that string; pin in Task 2's quoted-string and output parser tests.
- Unknown names and malformed English must report the correct filename and line; pin in Task 2's error tests.
- Unclosed, duplicate, or empty conditional branches must produce structurally valid Python or a clear source error; pin in Task 2's block parser tests.
- Ambiguous/unsupported statements must not be guessed into code; pin in Task 2's diagnostics tests.
- A failed translation or identical input/output path must preserve existing files; pin in Task 4's file API tests.

## File Structure

- `codeinenglish/ir.py`: typed nodes for supported values, expressions, and statements.
- `codeinenglish/expressions.py`: English expression tokenizer/parser and documented operator vocabulary.
- `codeinenglish/parser.py`: English statement parsing, name resolution, and conditional block structure.
- `codeinenglish/python_generator.py`: convert IR nodes into Python AST and return validated source.
- `codeinenglish/translator.py`: public translation API and safe file writing.
- `codeinenglish/errors.py`: categorized, source-located diagnostics.
- `codeinenglish/__init__.py`: public exports.
- `codeinenglish/__main__.py`: `argparse` CLI for translation.
- `README.md`, `examples/greeting.en`: usage and supported grammar.
- `tests/`: standard-library unit tests for expressions, statements, API/file behavior, and CLI.
- Remove `codeinenglish/runner.py`: generated code is no longer executed by the package.

---

### Task 1: Define the IR and parse supported expressions

**Files:**
- Create: `codeinenglish/ir.py`
- Create: `codeinenglish/expressions.py`
- Test: `tests/test_expressions.py`

**Interfaces:**
- Produces `parse_expression(text: str, *, filename: str, line: int) -> Expr` in `codeinenglish.expressions`.
- `Expr` variants: `Literal(value: str | int | float | bool | None)`, `Name(identifier: str)`, `Binary(left: Expr, operator: str, right: Expr)`, and `Compare(left: Expr, operator: str, right: Expr)`. `Program(statements: list[Statement])` is the module root.
- `CodeInEnglishError` remains the source diagnostic type and will gain an error `kind` in Task 2.

- [ ] **Step 1: Write expression tests** for quoted strings containing words such as `and`, integers/decimals, booleans, `None`, identifier names preserved as `Name` nodes, parentheses, arithmetic words (`plus`, `minus`, `times`, `divided by`), and comparisons (`is`, `is not`, `greater than`, `less than`). Assert exact IR nodes and operator precedence.
- [ ] **Step 2: Run the tests to confirm they fail** because the IR and expression parser do not exist.

Run: `python3 -m unittest discover -s tests -p 'test_expressions.py' -v`
Expected: import failures for `codeinenglish.ir` or `codeinenglish.expressions`.

- [ ] **Step 3: Implement the IR and a small precedence parser** using only the standard library. Preserve quoted strings as a single token; reject leftover tokens and unsupported operators with `CodeInEnglishError` carrying the supplied location.
- [ ] **Step 4: Run the expression tests** and confirm all value, operator, precedence, quote, and malformed-expression cases pass.

Run: `python3 -m unittest discover -s tests -p 'test_expressions.py' -v`
Expected: PASS.

### Task 2: Parse English statements and conditional blocks

**Files:**
- Modify: `codeinenglish/ir.py`
- Modify: `codeinenglish/parser.py`
- Modify: `codeinenglish/errors.py`
- Test: `tests/test_parser.py`

**Interfaces:**
- Consumes `parse_expression(text, *, filename, line) -> Expr` from Task 1.
- Produces `parse_program(source: str, filename: str = "<string>") -> Program` in `codeinenglish.parser`.
- Statement variants: `Assign(name: str, value: Expr)`, `ReadInput(name: str, prompt: str)`, `Display(values: list[Expr])`, and `If(condition: Expr, body: list[Statement], otherwise: list[Statement] | None)`. `None` means there is no `otherwise` marker; an empty list means an explicitly empty `otherwise` branch. Multiple display values are rendered as adjacent text with no inserted separator, preserving the current `show "Hello " and name` example.
- Accepted forms: `set NAME to EXPR` / `let NAME be EXPR`; `ask for your PROMPT and call it NAME`; `show EXPR`; `show EXPR and EXPR` for text/value concatenation; `if EXPR then`, `otherwise`, and `end if`. Names follow Python identifier spelling. `and` in an output statement joins displayed pieces; in quoted text it is literal.
- `CodeInEnglishError(filename, line, message, kind="syntax")` exposes `.filename`, `.line`, `.message`, and `.kind`. Use kinds `syntax`, `unsupported`, `unknown_name`, and `ambiguous`.

- [ ] **Step 1: Write parser tests** for each accepted statement form and its IR, phrase aliases, name tracking, output joining, conditionals with and without an `otherwise` marker, nested-if rejection, unclosed and unmatched markers, duplicate otherwise, unknown names, unsupported wording, and source line/kind diagnostics. Treat an unknown bare word on the right side of a comparison (for example, `if status is ready then`) as ambiguous between a missing variable and unquoted text; suggest quoting the text or defining the variable.
- [ ] **Step 2: Run the parser tests to confirm they fail** because `parse_program` and the statement IR are not implemented.

Run: `python3 -m unittest discover -s tests -p 'test_parser.py' -v`
Expected: import failures or missing `parse_program`.

- [ ] **Step 3: Implement `parse_program`** as a line-aware parser that builds IR rather than Python strings. Preserve current unambiguous `.en` example behavior. Reject nested conditionals in this milestone with a clear `unsupported` diagnostic; accept an empty branch by representing it as empty IR for the generator to handle.
- [ ] **Step 4: Run the parser tests** and confirm supported statements produce the expected IR and unsupported/invalid input reports the expected source location and category.

Run: `python3 -m unittest discover -s tests -p 'test_parser.py' -v`
Expected: PASS.

### Task 3: Generate and validate Python from IR

**Files:**
- Create: `codeinenglish/python_generator.py`
- Test: `tests/test_python_generator.py`

**Interfaces:**
- Consumes `Program` and node types from `codeinenglish.ir`.
- Produces `generate_python(program: Program) -> str` in `codeinenglish.python_generator`.
- Build Python AST nodes, call `ast.fix_missing_locations`, render with `ast.unparse`, and validate the rendered source with `ast.parse` before returning it. Empty if/else bodies emit `pass`.

- [ ] **Step 1: Write generator tests** for assignments, input prompts, display expressions, arithmetic/comparison precedence, if/else indentation, empty branches, and `ast.parse` acceptance. Compare phrase variants by parsed Python AST structure rather than formatting.
- [ ] **Step 2: Run the tests to confirm they fail** because `generate_python` does not exist.

Run: `python3 -m unittest discover -s tests -p 'test_python_generator.py' -v`
Expected: import failure for `codeinenglish.python_generator`.

- [ ] **Step 3: Implement `generate_python(program: Program) -> str`** by translating each IR variant into Python AST nodes; do not execute or compile the generated module.
- [ ] **Step 4: Run generator tests** and confirm every generated source parses and has the expected Python AST shape.

Run: `python3 -m unittest discover -s tests -p 'test_python_generator.py' -v`
Expected: PASS.

### Task 4: Add translation APIs and atomic file output

**Files:**
- Create: `codeinenglish/translator.py`
- Modify: `codeinenglish/__init__.py`
- Test: `tests/test_translator.py`

**Interfaces:**
- Consumes `parse_program` and `generate_python` from Tasks 2 and 3.
- Produces `translate(source: str, filename: str = "<string>") -> str` and `translate_file(source_path: str | Path, output_path: str | Path | None = None) -> Path`.
- Default output is `source_path.with_suffix(".py")`. Reject a resolved output path equal to the source path. Write via a temporary file in the destination directory and `os.replace` only after translation succeeds.

- [ ] **Step 1: Write API tests** for source translation, filename propagation, default and explicit output paths, valid UTF-8 input, source-file preservation, same-input/output rejection, and preservation of an existing output when reading or translation fails.
- [ ] **Step 2: Run the tests to confirm they fail** because `translate_file` and the new public API are missing.

Run: `python3 -m unittest discover -s tests -p 'test_translator.py' -v`
Expected: import failure for `translate_file`.

- [ ] **Step 3: Implement the public APIs** and atomic output behavior; clean up a temporary file if replacement fails. Re-export only `CodeInEnglishError`, `translate`, and `translate_file`; remove `run_file` from the API.
- [ ] **Step 4: Run API tests** and confirm failures do not damage the input or existing output.

Run: `python3 -m unittest discover -s tests -p 'test_translator.py' -v`
Expected: PASS.

### Task 5: Replace execution CLI and document the initial grammar

**Files:**
- Modify: `codeinenglish/__main__.py`
- Modify: `bin/codeinenglish`
- Remove: `codeinenglish/runner.py`
- Modify: `README.md`
- Modify: `examples/greeting.en`
- Test: `tests/test_cli.py`

**Interfaces:**
- Consumes `translate_file(source_path, output_path=None) -> Path` from Task 4.
- CLI: `codeinenglish translate SOURCE [--output PATH]`; return 0 on success, 2 for usage errors, and 1 for translation or file errors. Print the generated path on success. Never execute output.

- [ ] **Step 1: Write CLI tests** for default output naming, explicit output, success path reporting, missing/invalid source errors, unsupported instructions, and invalid command usage. Patch the API in-process so the tests do not execute the generated file.
- [ ] **Step 2: Run CLI tests to confirm they fail** because the current CLI accepts a source and executes it instead of translating it.

Run: `python3 -m unittest discover -s tests -p 'test_cli.py' -v`
Expected: failures for the `translate` subcommand and non-executing output flow.

- [ ] **Step 3: Implement the CLI and remove execution flow**; update README and the greeting example to list only the accepted grammar, document installation and offline use, and show users inspecting/running generated Python themselves.
- [ ] **Step 4: Run the complete test suite and CLI check** with `python3 -m unittest discover -s tests -v`, then invoke `python3 -m codeinenglish translate examples/greeting.en --output /tmp/codeinenglish-greeting.py`. Confirm the `.py` is written, parses with `ast.parse`, and is not executed; CLI unit tests stub the translation API for failure cases.

Expected: all tests pass, generated source is parseable, and CLI only writes and reports the output path.

---

## Scope Check

This plan implements only the first independently usable milestone in `SPEC.md`. Loops, nested control flow, collections, functions, and common algorithm recognition remain separate future specs and plans.
