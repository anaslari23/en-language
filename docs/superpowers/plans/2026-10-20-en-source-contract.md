# EN Source Contract Implementation Plan

> **For agentic workers:** Use `superpowers:executing-plans` to implement this approved roadmap milestone task by task. Steps use checkbox (`- [x]`) syntax.

**Goal:** Give `.en` files one explicit Python target directive while keeping existing files working and making comment requests distinct from English instructions.

**Architecture:** `generate_file` scans only standalone source directives, replaces the directive line with a blank line to preserve source line numbers, and routes the remaining source to the existing instruction translator or problem solver. The legacy `import codeinpython library` directive remains valid. No new parser or backend is introduced.

**Tech Stack:** Python 3.10+ standard library and `unittest`; existing `codeinenglish` package.

**Spec:** [EN Language architecture roadmap](2026-10-20-en-architecture-roadmap.md), especially Milestone 2.

## Contract

- `target python` is the canonical standalone directive. Exactly one target directive may appear; `import codeinpython library` is a legacy alias.
- With `target python`, comment-only content is a problem request; any ordinary English statement makes comments documentation and selects the instruction translator.
- Without a directive, `generate` keeps its existing instruction behavior. The explicit `solve` command continues to accept comment-only problem files.
- Unsupported targets, malformed target directives, duplicate directives, and unsupported import aliases fail with file and line information before output is written.
- Directive-like text inside a `#` comment or quoted instruction is ordinary text, not a directive.

## Task 1: Pin routing and error behavior

**Files:** `EN-Library/tests/test_translator.py`, `EN-Library/tests/test_cli.py`.

- [x] Add `generate_file` examples for `target python` plus English instructions, `target python` plus a comment request, and mixed documentation comments plus English instructions.
- [x] Add rejection cases for an unknown target and conflicting or duplicated directives; assert the source location and that existing output survives.
- [x] Add a CLI case proving `generate` uses the same target selection as the API.
- [x] Run the focused tests and observe failure before implementation.

## Task 2: Implement the source selector

**Files:** `EN-Library/codeinenglish/interpreter.py`, `EN-Library/codeinenglish/problem_prompt.py` only if shared directive handling requires it.

- [x] Scan standalone lines conservatively, retaining line numbers. Replace a canonical directive with a blank line; retain the legacy directive for the existing problem extractor.
- [x] Route canonical comment-only files to `solve` and files with English statements to `translate`; keep legacy behavior and the atomic writer.
- [x] Run focused and complete EN-Library tests; syntax-check generated output and confirm failures preserve old files.

## Task 3: Document and verify the beginner workflow

**Files:** `en-language/SPEC.md`, `en-language/README.md`, `en-language/examples/`, `EN-Library/README.md`, `en-language/scripts/verify_library.py`.

- [x] Add short canonical examples for instruction and comment requests, showing the generated `.py` path and explicit run step.
- [x] State that comments are documentation when the file has ordinary instructions, and that Python `import codeinenglish` exposes the API rather than executing comments.
- [x] Run the package and extension suites plus the end-to-end example sweep from the recovered checkouts.
- [x] Commit and push the feature branches separately; do not merge or publish packages in this milestone.

## Review focus

1. `# target python` must not select a target.
2. A second target directive must fail at its own line.
3. An unsupported target must leave an existing `.py` untouched.
4. A comment before an English instruction must remain documentation.
5. The old `import codeinpython library` examples must produce the same Python as before.
