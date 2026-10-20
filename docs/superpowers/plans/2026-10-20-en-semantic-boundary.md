# EN Semantic Boundary Implementation Plan

> **For agentic workers:** Use `superpowers:executing-plans` for this approved roadmap milestone. Steps use checkbox syntax.

**Goal:** Make English recognition return a typed `Program` or `ProblemSpec` before Python rendering, preserving current behavior.

**Architecture:** Keep `parse_program` and `recognize_problem` as the two front ends. Add one `interpret_source(source, filename)` function that applies the existing directive contract and returns either semantic type. Let `generate_file` render the returned type through the existing Python generators. Keep public `translate` and `solve` APIs.

**Tech Stack:** Python 3.10+ standard library and existing unit tests.

**Spec:** [EN architecture roadmap](2026-10-20-en-architecture-roadmap.md), Milestone 3.

## Task 1: Pin typed interpretation

**Files:** `EN-Library/tests/test_translator.py`, `EN-Library/tests/test_problem_solver.py`.

- [x] Add a focused check that English instructions yield `Program` and a canonical comment request yields `ProblemSpec`.
- [x] Check that a source-located unsupported request fails before rendering and preserves an existing output file.
- [x] Run the focused tests and observe the missing interface failure.

## Task 2: Separate recognition from Python rendering

**Files:** `EN-Library/codeinenglish/interpreter.py`, `EN-Library/codeinenglish/problem_solver.py`.

- [x] Extract a problem recognition function that performs prompt extraction, intent recognition, and example validation and returns `ProblemSpec`.
- [x] Add `interpret_source(source: str, filename: str = "<string>") -> Program | ProblemSpec` using the existing directive contract and parser.
- [x] Route `generate_file` through that semantic result and existing Python renderers; preserve atomic writes.
- [x] Run focused and complete Python suites, then all 19 language examples.

## Task 3: Record the boundary

**Files:** `EN-Library/README.md`, `en-language/SPEC.md`, and the architecture roadmap.

- [x] Explain that `Program` and `ProblemSpec` are the two semantic variants and Python AST belongs to the Python renderer.
- [x] Commit and push both feature branches after clean verification.

## Review focus

1. Legacy and canonical directives must yield equivalent `ProblemSpec`.
2. Python output for all current examples must retain behavior.
3. Invalid examples must fail before any output replacement.
