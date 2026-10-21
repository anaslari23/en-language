# EN Capability Growth Implementation Plan

> **For agentic workers:** Use `superpowers:executing-plans` for this approved roadmap milestone. Steps use checkbox syntax.

**Goal:** Demonstrate measured, honest expansion of offline English understanding with one reusable array operation.

**Architecture:** Add ascending list sorting as a `ProblemFamily` with explicit inputs, output, defaults, and one Python strategy. Keep the current recognizer and generic JSON runner. Add an independently written corpus with accepted and rejected phrasings to track what the rules actually recognize.

**Tech Stack:** Python 3.10+ standard library and `unittest`.

**Spec:** [EN architecture roadmap](2026-10-20-en-architecture-roadmap.md), Milestone 4.

## Task 1: Define and check the sort contract

**Files:** `EN-Library/tests/test_problem_recognizer.py`, `EN-Library/tests/test_problem_strategies.py`.

- [x] Add several natural phrasings for ascending integer-list sorting; assert the result is a new sorted list and duplicates remain.
- [x] Reject descending, missing order, and mixed sort/reverse requests with source-located diagnostics.
- [x] Run focused tests and observe the missing family/strategy failure.

## Task 2: Implement and document the capability

**Files:** `EN-Library/codeinenglish/problem_recognizer.py`, `EN-Library/codeinenglish/problem_strategies.py`, `en-language/examples/sort_numbers_problem.en`, `en-language/SPEC.md`, `EN-Library/README.md`.

- [x] Add `SORT_ASCENDING`, `sort_ascending(nums)`, its assumptions and recognizer rules.
- [x] Render `sorted(nums)` through the existing Python AST strategy path and generic JSON runner.
- [x] Add a real `.en` example with duplicate values and expected JSON output; document the new family.

## Task 3: Measure coverage honestly

**Files:** `EN-Library/tests/fixtures/prompt_corpus.json`, `EN-Library/tests/test_prompt_corpus.py`, `en-language/SPEC.md`.

- [x] Store independent accepted and rejected prompts across existing families and the new sort family.
- [x] Run the corpus through recognition; count accepted matches and expected rejections without treating unsupported prompts as successes.
- [x] Run the full package suite, extension suite, and all language examples; report the measured counts.
- [x] Commit and push the feature branches separately.

## Review focus

1. Sorting must preserve duplicate values and not mutate input.
2. Descending wording must fail rather than silently produce ascending output.
3. A sort request must not steal a merge-sorted-lists or binary-search request.
