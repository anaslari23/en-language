# Code in English Problem Generation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Add offline generation of editable Python solutions from DSA problem statements written as comments in `.en` files, while preserving the existing English-instruction translator.

**Architecture:** Add a prompt extractor and typed problem recognizer as a second front end. Recognized problem specs select deterministic solution strategies that build Python AST, then use the shared Python renderer, validator, and atomic file-output path. Keep all synonym rules and strategies in source code; do not fetch problem content or depend on models.

**Tech Stack:** Python 3.10+, Python standard library, `unittest`, existing typed IR and AST-based Python generator.

**Spec:** `docs/superpowers/specs/2026-10-19-code-in-english-design.md`

## Global Constraints

- Use Python's standard library only at runtime; no AI model, network service, downloaded data, or external dependency.
- Preserve the existing `translate` API/CLI behavior and instruction-style `.en` programs.
- The `.en` problem workflow accepts the `import codeinpython library` directive and comment text; generated `.py` must omit the directive.
- Generated Python remains editable, is syntax-checked, and is never executed by the generator.
- Failed, ambiguous, unsupported, or invalid translation must not replace an existing output.
- Keep problem recognition deterministic and reject ambiguity rather than guessing.

## Review Focus

- A quoted phrase containing words like “and” must stay intact during comment/prompt extraction; test it in Task 1.
- Negated requirements must not match a positive problem family; test it in Task 2.
- Similar wording that asks for a different return value must not select the wrong family; test it in Task 2.
- Boundary inputs (empty lists, duplicates, absent search values, and equal-character strings) must follow the recognized problem contract; test them in Tasks 3 and 4.
- Unknown non-comment source lines or conflicting constraints must fail without touching output; test in Tasks 1 and 2.

---

### Task 1: Extract `.en` problem prompts

**Files:**
- Create: `codeinenglish/problem_prompt.py`
- Modify: `codeinenglish/errors.py` only if a prompt-specific diagnostic kind is needed
- Test: `tests/test_problem_prompt.py`

**Interfaces:**
- Produces: `ProblemPrompt(text: str, source_lines: tuple[int, ...])` and `extract_problem_prompt(source: str, filename: str = "<string>") -> ProblemPrompt`.
- Accept only blank lines, the optional exact directive `import codeinpython library`, and `#` comment lines. Strip one comment marker and surrounding whitespace while retaining original source line numbers. Reject other source lines with a source-located diagnostic.

- [x] **Step 1: Write failing tests** for directive acceptance/omission, multiline comment joining, blank/comment-only files, quote-preserving text such as `"bread and butter"`, source line mapping, and rejection of non-comment code.
- [x] **Step 2: Run** `python3 -m unittest tests.test_problem_prompt -v`; confirm failures are because the extractor is missing.
- [x] **Step 3: Implement** `ProblemPrompt` and `extract_problem_prompt` in `codeinenglish/problem_prompt.py` using standard-library string handling only.
- [x] **Step 4: Run** `python3 -m unittest tests.test_problem_prompt -v`; confirm all prompt-extraction cases pass.

### Task 2: Parse prompts into a typed problem specification

**Files:**
- Create: `codeinenglish/problem_recognizer.py`
- Test: `tests/test_problem_recognizer.py`
- Reuse: `codeinenglish/problem_prompt.py`, `codeinenglish/errors.py`

**Interfaces:**
- Produces: `ProblemFamily`, `ProblemInput`, `ProblemSpec`, and `recognize_problem(prompt: ProblemPrompt, filename: str = "<string>") -> ProblemSpec`.
- `ProblemSpec` records family, canonical input names and kinds, requested result, relevant constraints, and source evidence. Use enums/immutable dataclasses; do not store generated Python in the spec.
- Recognizers support pair-sum indices, duplicate/frequency, palindrome, anagram, sorted binary search, and min/max/sum aggregate requests. Each family has a canonical generated function name and argument list.

- [x] **Step 1: Write failing tests** for at least two independently authored phrasings per supported family, the Two Sum prompt in the spec, recognized input/result/constraint fields, unsupported prompts, negation, missing required facts, and contradictory constraints.
- [x] **Step 2: Run** `python3 -m unittest tests.test_problem_recognizer -v`; confirm the expected missing-recognizer failures.
- [x] **Step 3: Implement** deterministic normalization and phrase rules in `codeinenglish/problem_recognizer.py`. Match reusable concepts and relationships, not full saved question strings; preserve and inspect negation and constraints before selecting one family.
- [x] **Step 4: Run** `python3 -m unittest tests.test_problem_recognizer -v`; confirm all recognition, ambiguity, and unsupported-prompt tests pass.

### Task 3: Generate Python for pair sum, duplicates/frequency, and aggregates

**Files:**
- Create: `codeinenglish/problem_strategies.py`
- Modify: `codeinenglish/ir.py` and `codeinenglish/python_generator.py` only for shared AST rendering support or missing typed nodes
- Test: `tests/test_problem_strategies.py`

**Interfaces:**
- Produces: `generate_problem_ast(spec: ProblemSpec) -> ast.Module` (or an equivalent typed statement list accepted by the shared renderer).
- Consumes: canonical names and result/constraint fields from Task 2.
- Covers two-sum returned indices, duplicate detection/frequency output, and requested min/max/sum aggregates.

- [x] **Step 1: Write failing behavior tests** that recognize each family, generate Python, parse it with `ast.parse`, execute the generated function in tests, and check ordinary, duplicate, empty, and no-result cases defined by the prompt contract.
- [x] **Step 2: Run** `python3 -m unittest tests.test_problem_strategies -v`; confirm failures are due to absent strategy generation.
- [x] **Step 3: Implement** the three strategy groups as Python AST nodes and factor a shared AST-to-source/syntax-validation function in `codeinenglish/python_generator.py`; do not add string-template code generation.
- [x] **Step 4: Run** `python3 -m unittest tests.test_problem_strategies -v`; confirm generated functions behave as specified and pass Python syntax validation.

### Task 4: Generate Python for palindrome, anagram, and binary search

**Files:**
- Modify: `codeinenglish/problem_strategies.py`
- Test: `tests/test_problem_strategies.py`

**Interfaces:**
- Consumes: `ProblemSpec` and shared AST renderer from Task 3.
- Extends: `generate_problem_ast(spec: ProblemSpec) -> ast.Module` with palindrome, anagram, and sorted binary search strategies.

- [x] **Step 1: Write failing behavior tests** for each new family, including empty/equal strings, case/character assumptions explicitly stated by the prompt, search hit, absent target, and boundary positions.
- [x] **Step 2: Run** `python3 -m unittest tests.test_problem_strategies -v`; confirm only the new strategy cases fail.
- [x] **Step 3: Implement** the additional strategy ASTs using standard Python operations, adding only shared IR/AST support needed by these strategies.
- [x] **Step 4: Run** `python3 -m unittest tests.test_problem_strategies -v`; confirm all six families work across their defined edge cases.

### Task 5: Add `solve` API and safe CLI output

**Files:**
- Create: `codeinenglish/problem_solver.py`
- Modify: `codeinenglish/__init__.py`, `codeinenglish/__main__.py`, and shared output handling in `codeinenglish/translator.py` if reusable
- Test: `tests/test_problem_solver.py`, `tests/test_cli.py`

**Interfaces:**
- Produces: `solve(source: str, filename: str = "<string>") -> str` and `solve_file(source_path, output_path=None) -> Path`.
- CLI: `python3 -m codeinenglish solve SOURCE [--output PATH]`; default output is a sibling `.py` file.
- `solve` composes prompt extraction, recognition, strategy selection, shared Python rendering, and syntax validation. It never executes output.

- [x] **Step 1: Write failing integration tests** for API source generation, CLI default/explicit output, omitted directive in generated Python, unsupported/ambiguous diagnostics, and preservation of an existing output on failure.
- [x] **Step 2: Run** targeted API and CLI tests; confirm failures occur because the `solve` entry point is absent.
- [x] **Step 3: Implement** the API/CLI composition and atomic output using the existing safe file-write behavior where available.
- [x] **Step 4: Run** `python3 -m unittest tests.test_problem_solver tests.test_cli -v`; confirm integration tests pass and existing `translate` CLI tests remain unchanged.

### Task 6: Add original examples and update product documentation

**Files:**
- Create: `examples/two_sum_problem.en` and one example per other supported family
- Modify: `README.md`, `SPEC.md`
- Test: `tests/test_problem_solver.py`

- [x] **Step 1: Add an end-to-end test** that reads `examples/two_sum_problem.en`, invokes `solve`, validates the generated Python, and verifies the documented function behavior.
- [x] **Step 2: Run** that test and confirm the example currently fails before being wired to the solver.
- [x] **Step 3: Add** independently authored examples, usage instructions, the `import codeinpython library` directive, generated-output workflow, supported families, and limitations to README/SPEC.
- [x] **Step 4: Run** `python3 -m unittest discover -s tests -v` and translate both an existing instruction-style example and the new problem example end to end. Confirm all tests pass, the existing `translate` flow still works, and the generated problem solution is valid Python that the user can copy and run.

## Execution Notes

- This workspace currently has no `.git` metadata, so do not include local commit steps or claim changes are committed. Preserve the implementation for publication through the repository workflow when requested.
- Do not add tests that use LeetCode problem text. Write original prompts and paraphrases that exercise the same general algorithmic intent.
