# Code in English Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a small offline Python package and CLI that translates documented English instructions in `.en` files and executes them locally.

**Architecture:** `codeinenglish.parser` translates supported source lines into Python, while `codeinenglish` exposes translation and execution helpers and `python -m codeinenglish` provides the CLI. A setuptools `pyproject.toml` installs the package and console command; an example and README document the supported language.

**Tech Stack:** Python 3 standard library; setuptools build backend; no runtime dependencies.

**Spec:** `SPEC.md`

## Global Constraints

- Offline operation is mandatory; installation and execution must not fetch a model or contact a network service.
- This is a small rule-based translator, not arbitrary natural-language understanding. Unsupported phrasing should produce a helpful error rather than guessed code.
- No imports, loops, functions, file access, or general Python escape hatch in the first version.
- No compiler or native runtime; Python is the local runtime.

## Review Focus

- Unknown or malformed instruction: show source filename and one-based line number in a concise error.
- Quoted strings containing spaces or `and`: preserve the full string while parsing `show` expressions.
- Empty files, comment-only files, and blank lines: safely produce and run an empty program.
- Indentation and unmatched decision markers: reject malformed blocks with a line-numbered error.
- Source values are data, not arbitrary Python: parse only the documented literal/name forms and never `eval` source text.

---

### Task 1: Translator and source errors

**Files:**
- Create: `codeinenglish/parser.py`
- Create: `codeinenglish/errors.py`
- Create: `codeinenglish/__init__.py`

**Interfaces:**
- Produces: `translate(source: str, filename: str = "<string>") -> str` in `codeinenglish.parser`; `CodeInEnglishError` in `codeinenglish.errors`; top-level re-export of `translate` and `CodeInEnglishError` from `codeinenglish`.
- Translates `show <value>`, `ask for your <name> and call it <name>`, `set <name> to <literal>`, and decisions written as `if <name> is <literal> then` / `otherwise` / `end if` into Python.
- A value is a quoted string, integer, decimal, or previously assigned identifier. `show` supports joining values with the word `and` outside quoted strings.
- Ignore blank lines and lines whose first non-space character is `#`.

- [ ] **Step 1: Add minimal executable examples for translation and errors** in a temporary `python -c` check or inline smoke script: assert translation includes safe Python constructs for each supported instruction and malformed input raises `CodeInEnglishError` with filename and line 1.
- [ ] **Step 2: Run the check and confirm it fails** because the package and translator do not exist yet.
- [ ] **Step 3: Implement `CodeInEnglishError` and `translate`** using anchored regular expressions and literal parsing; do not evaluate `.en` text as Python. Track block state for `if`, optional `otherwise`, and `end if`; reject nesting and unmatched markers with source locations.
- [ ] **Step 4: Rerun the check** and confirm all supported forms translate, comments are skipped, quoted `and` remains intact, and malformed syntax reports the proper line.

### Task 2: Local execution and command-line entry points

**Files:**
- Create: `codeinenglish/runner.py`
- Create: `codeinenglish/__main__.py`
- Create: `pyproject.toml`
- Modify: `codeinenglish/__init__.py`

**Interfaces:**
- Consumes: `translate(source, filename)` and `CodeInEnglishError` from Task 1.
- Produces: `run_file(path: str) -> None` in `codeinenglish.runner`; `main(argv: list[str] | None = None) -> int` in `codeinenglish.__main__`; console script `codeinenglish` mapped to `codeinenglish.__main__:main`.
- `main` accepts one `.en` path, prints diagnostics to stderr and returns nonzero on read/translation errors, and returns zero after execution.

- [ ] **Step 1: Run a CLI smoke command** against a temporary `.en` file and confirm the command is not installed yet.
- [ ] **Step 2: Implement file reading, translation, and execution** with `run_file`; execute translated Python in a fresh namespace with standard builtins only. Do not expose file contents or arbitrary Python imports through the source grammar.
- [ ] **Step 3: Implement the CLI and package metadata** with no runtime dependencies and Python 3.10+; map file-not-found and `CodeInEnglishError` to readable stderr messages and exit code 1.
- [ ] **Step 4: Install the local project without dependencies and run the CLI smoke command**; verify an input prompt and greeting work, an unsupported line shows filename and line number, and no network access is required.

### Task 3: Example and user guide

**Files:**
- Create: `examples/greeting.en`
- Create: `README.md`

**Interfaces:**
- Consumes: installed `codeinenglish` command from Task 2.
- Produces: a runnable greeting example and usage guide with the exact accepted forms, decision-block structure, local installation command, offline guarantees, and unsupported-language limitations.

- [ ] **Step 1: Add `examples/greeting.en`** with input, name binding, and personalized output in the documented syntax.
- [ ] **Step 2: Write `README.md`** showing local installation (`python -m pip install .`), invocation (`codeinenglish examples/greeting.en`), all supported instructions, and an explicit example of an unsupported phrase error.
- [ ] **Step 3: Run the documented install and example commands**; confirm the README example completes and the decision example exercises both branches using two supplied inputs.
