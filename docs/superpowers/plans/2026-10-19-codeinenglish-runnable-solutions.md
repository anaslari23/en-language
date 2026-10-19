# Runnable, Reviewable Solutions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Generate reviewable, runnable JSON-in/JSON-out Python solutions, report behavior assumptions, verify prompt examples, and expand the deterministic DSA catalog by six families.

**Architecture:** Extend the problem prompt/spec interfaces to preserve examples and explicit/default assumptions. Generate callable algorithm functions plus a standard-library JSON command-line wrapper from AST, and implement each new problem family as a deterministic recognizer and AST strategy. Verify with prompt paraphrases, reference comparisons, integration tests, and generated-program example checks.

**Tech Stack:** Python 3.10+, standard library (`ast`, `json`, `argparse`, `unittest`, `subprocess`), existing Code in English AST renderer.

**Spec:** `docs/superpowers/specs/2026-10-19-codeinenglish-runnable-solutions-design.md`

## Global Constraints

- Use Python's standard library only at runtime; no model, network, downloaded data, or external dependency.
- Preserve the `translate`, `solve`, and `solve_file` APIs and existing translator behavior.
- The generator must never execute generated Python.
- Generated programs accept one JSON object keyed by canonical function arguments and emit one JSON value.
- Report each material assumption and whether it was stated or defaulted; reject conflicts and unsupported result contracts.
- Keep recognition deterministic; do not scrape or copy LeetCode prompts.
- Failed translation must not replace existing output.

## Review Focus

- Example input/output text must be removed from recognition text without losing its expected values or source lines (Task 2).
- JSON lists/dicts/null values must serialize correctly for every result type, including tuple-returning strategies (Task 3).
- Pair-sum and search defaults must be explicit and contradictory qualifiers rejected (Task 1).
- The six new recognizers must not confuse similar operations or ignore negation (Tasks 5–7).
- Generated example checking must return failure for wrong expected output and must run only when the user explicitly runs the generated script (Task 3).

---

### Task 1: Record problem contracts and assumptions

**Files:**
- Modify: `codeinenglish/problem_recognizer.py`
- Test: `tests/test_problem_recognizer.py`

**Interfaces:**
- Produces: immutable `ProblemAssumption(text: str, status: Literal["stated", "defaulted"])` and `ProblemSpec.assumptions: tuple[ProblemAssumption, ...]`.
- Preserves `ProblemSpec.inputs`, `result`, `constraints`, and `evidence`; each family must identify its material result defaults.

- [x] **Step 1: Add failing tests** for explicit and defaulted pair-sum no-result behavior, pair selection order, search absent behavior, case policy, empty-input behavior, and conflicting qualifiers.
- [x] **Step 2: Run** `python3 -m unittest tests.test_problem_recognizer -v`; confirm the new assumption fields/tests fail before implementation.
- [x] **Step 3: Implement** assumption records and family contract validation. Never silently discard a recognized qualifier; emit a source-located ambiguity diagnostic for conflicting or unsupported result behavior.
- [x] **Step 4: Run** the recognizer tests and confirm stated/defaulted assumptions and conflicts are represented correctly.

### Task 2: Extract and validate prompt examples

**Files:**
- Modify: `codeinenglish/problem_prompt.py`
- Test: `tests/test_problem_prompt.py`

**Interfaces:**
- Produces: `ProblemExample(input: dict[str, object], expected: object, source_line: int)` and `ProblemPrompt.examples: tuple[ProblemExample, ...]`.
- Accepts comment pairs formatted as `Example input: <JSON object>` and `Example output: <JSON value>`; removes those lines from the natural-language recognition text.

- [x] **Step 1: Add failing tests** for multiple examples, valid JSON arrays/scalars/null, missing input/output partner, malformed JSON, and source-line preservation.
- [x] **Step 2: Run** `python3 -m unittest tests.test_problem_prompt -v`; confirm example parsing is not implemented.
- [x] **Step 3: Implement** strict standard-library JSON parsing and pair validation; reject malformed examples with filename and line.
- [x] **Step 4: Run** prompt tests and confirm normal prompts still extract exactly as before.

### Task 3: Generate the JSON runner and example checker

**Files:**
- Modify: `codeinenglish/problem_strategies.py`, `codeinenglish/python_generator.py`, `codeinenglish/problem_solver.py`, `codeinenglish/__main__.py`
- Test: `tests/test_problem_solver.py`, `tests/test_cli.py`

**Interfaces:**
- Produces: generated AST containing a contract comment, solution function, `main()`, and `if __name__ == "__main__"` entry point.
- JSON input keys are `ProblemSpec.inputs`; JSON output is the function result. Generated program supports `--check-examples` when examples are embedded.

- [x] **Step 1: Add failing integration tests** for JSON stdin/stdout for every existing result shape, missing/extra argument diagnostics, example checker pass/fail behavior, and proof that `solve_file` does not execute generated code.
- [x] **Step 2: Run** targeted solver and CLI tests; confirm they fail because generated programs have no runner.
- [x] **Step 3: Implement** AST nodes for contract comments, JSON parsing/validation, function dispatch, JSON serialization, and explicit example-check mode; reuse atomic file writing.
- [x] **Step 4: Run** solver/CLI tests, including subprocess execution of generated programs and preservation of prior output on translation failure.

### Task 4: Verify existing strategies against reference behavior

**Files:**
- Modify: `tests/test_problem_strategies.py`
- Modify: `examples/*_problem.en`

**Interfaces:**
- Consumes: assumption fields and example pairs from Tasks 1–2.
- Produces: reference comparisons for every current strategy on deterministic small input domains, and original prompt examples using the documented example format.

- [x] **Step 1: Add failing behavior checks** comparing optimized implementations with simple reference implementations for pairs, duplicate/frequency, palindrome/anagram, binary search, and aggregates.
- [x] **Step 2: Run** `python3 -m unittest tests.test_problem_strategies -v`; identify any contract or boundary mismatches.
- [x] **Step 3: Fix** only strategies or contracts shown inconsistent by these comparisons; add original examples to current `.en` fixtures.
- [x] **Step 4: Run** strategy tests and execute generated example checks as subprocess tests.

### Task 5: Add first-unique-character, reverse-text, and move-zero strategies

**Files:**
- Modify: `codeinenglish/problem_recognizer.py`, `codeinenglish/problem_strategies.py`
- Create: `examples/first_unique_character_problem.en`, `examples/reverse_text_problem.en`, `examples/move_zeros_problem.en`
- Test: `tests/test_problem_recognizer.py`, `tests/test_problem_strategies.py`

**Interfaces:**
- Produces: canonical specs/functions `first_unique_character(text)`, `reverse_text(text)`, and `move_zeros(nums)`.
- Each family has two or more original phrasings, explicit empty/no-result behavior, constraints, and reference tests.

- [x] **Step 1: Add failing recognition and behavior tests** for multiple phrasings, negation, duplicate characters, empty text, repeated zeros, all-zero and no-zero lists, and order preservation.
- [x] **Step 2: Run** the targeted recognizer/strategy tests; confirm new-family tests fail.
- [x] **Step 3: Implement** typed specs and AST strategies using only the canonical contract.
- [x] **Step 4: Run** targeted tests plus exhaustive short-string/list comparisons with simple reference functions.

### Task 6: Add merge-sorted-lists and maximum-subarray strategies

**Files:**
- Modify: `codeinenglish/problem_recognizer.py`, `codeinenglish/problem_strategies.py`
- Create: `examples/merge_sorted_lists_problem.en`, `examples/maximum_subarray_problem.en`
- Test: `tests/test_problem_recognizer.py`, `tests/test_problem_strategies.py`

**Interfaces:**
- Produces: `merge_sorted_lists(first, second)` and `maximum_subarray_sum(nums)` with explicit sorted-input, tie, and empty-input contracts.

- [x] **Step 1: Add failing tests** for paraphrases, missing sorted constraints, contradictory empty-input requirements, ties, negatives, empty lists, and duplicate values.
- [x] **Step 2: Run** targeted tests and confirm the new cases fail.
- [x] **Step 3: Implement** recognizers and AST strategies; reject prompts that do not establish required ordering or empty-input behavior.
- [x] **Step 4: Run** exhaustive small-array comparisons against simple reference implementations.

### Task 7: Add balanced-delimiter strategy

**Files:**
- Modify: `codeinenglish/problem_recognizer.py`, `codeinenglish/problem_strategies.py`
- Create: `examples/balanced_delimiters_problem.en`
- Test: `tests/test_problem_recognizer.py`, `tests/test_problem_strategies.py`

**Interfaces:**
- Produces: `has_balanced_delimiters(text)`; supported delimiter set and treatment of other characters are explicit in the spec and generated assumptions.

- [x] **Step 1: Add failing tests** for nested/mismatched/unclosed delimiters, empty input, ignored ordinary text, and requests that use unsupported delimiter sets.
- [x] **Step 2: Run** targeted tests and confirm the new cases fail.
- [x] **Step 3: Implement** the recognizer and stack strategy with an explicit default delimiter set.
- [x] **Step 4: Run** exhaustive short-string comparisons against a simple reference checker.

### Task 8: Document the runnable contract and expanded catalog

**Files:**
- Modify: `README.md`, `SPEC.md`
- Test: `tests/test_problem_solver.py`, `tests/test_cli.py`

**Interfaces:**
- Documents: stdin JSON schema, stdout result format, generated assumptions, `--check-examples`, current support, current limitations, and future family roadmap.

- [x] **Step 1: Add integration tests** for every new example generating parseable Python and each example checker reporting success.
- [x] **Step 2: Run** full `python3 -m unittest discover -s tests -v` and confirm the new docs/examples match actual command behavior.
- [x] **Step 3: Update** README and SPEC with runnable examples, JSON contract, supported family table, assumption reporting, verification limits, and next coverage families.
- [x] **Step 4: Run** full tests, `python3 -m py_compile codeinenglish/*.py`, generate every `*_problem.en` file, syntax-parse all output, and separately verify legacy `translate` behavior.

## Execution Notes

- The workspace has no `.git` metadata; do not claim commits or push changes.
- Keep clarification prompting out of scope for this iteration; ambiguity continues to produce a diagnostic.
- Implement natively in this session, the previously selected execution approach, after the user approves this plan.
