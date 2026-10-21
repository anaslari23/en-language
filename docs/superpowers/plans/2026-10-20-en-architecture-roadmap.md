# EN Language Architecture Roadmap

> **For agentic workers:** Implement one milestone at a time. Use `superpowers:executing-plans` for an approved milestone, and keep its checklist and evidence in a separate execution record.

**Goal:** Let a beginner write supported English instructions or a supported problem request in a `.en` file and obtain editable code entirely offline, starting with Python.

**Architecture:** EN-Library owns the deterministic compiler and target-neutral `Program` IR. Instruction parsing and problem-intent recognition both lower to `Program`; one Python or JavaScript backend renders it, and a reference evaluator executes it for conformance checks. `ProblemSpec` remains intent metadata and is not a backend input. The `en-language` repository owns the source contract, examples, and editor integrations.

**Tech stack:** Python 3.10+ standard library for the compiler and CLI; existing Node.js VS Code extension; `unittest` and maintainer regression programs for verification.

**Existing design:** [language specification](../../SPEC.md), [offline compiler plan](2026-10-20-offline-interpreter.md), and [repository split design](../specs/2026-10-19-library-language-repository-split-design.md).

## What the diagram means in the product

```mermaid
flowchart LR
    A[.en file] --> B[Source reader and target selector]
    B --> C{Request form}
    C -->|English steps| D[Instruction parser]
    C -->|Marked comment request| E[Problem recognizer]
    D --> F[Target-neutral Program IR]
    E --> G[ProblemSpec]
    G --> F
    F --> H{Backend or reference evaluator}
    H --> I[Python source]
    H --> J[JavaScript source]
    K[CLI] --> B
    L[IDE adapter] --> K
    M[Host-language adapter] --> K
```

- `.en` is the source language. It can express program steps, including existing class and method forms, or a high-level request marked with `#?` in the new language version.
- A directive in the `.en` file selects the output language. Keep the existing `import codeinpython library` spelling as a Python alias. Define one canonical target syntax before adding another backend.
- `import codeinenglish` in a Python program loads the package API; Python does not execute comments on import. A Python integration must explicitly call an API such as `codeinenglish.generate_file(...)` or invoke the CLI.
- `pip install` installs the compiler and CLI for any user with Python. Producing JavaScript or another target does not require importing a Python module from that target language. Later adapters can call the CLI.
- Offline operation means no model, hosted API, network access, downloaded weights, or third-party runtime dependency during translation.
- Deterministic recognition can cover a growing set of English requests, but cannot promise correct code for every possible request. Unsupported or ambiguous requests must fail with a useful explanation.

**Review status:** Milestones 2 and 3 are reopened for the source marker/version contract and the shared IR lowering described in [the review follow-up plan](2026-10-21-architecture-review-follow-up.md). The existing implementation remains a verified baseline, not the final architecture.

## Current starting point

- At planning time, EN-Library had an instruction parser, object-oriented constructs, 15 documented problem families, Python generation, and `generate_file` only in a local staging copy. The language workspace had examples and a VS Code Run extension.
- At planning time, 110 Python tests, 19 extension tests, and all 19 `.en` examples passed locally.
- Both repositories have since been recovered and the verified baseline has been pushed to `feat/en-architecture` branches. The default branches have not been changed.

## Global constraints

- Keep one maintained compiler implementation in `EN-Library`; do not copy it into editor extensions or `en-language`.
- Preserve existing `.en` examples, `translate`, `translate_file`, `solve`, `solve_file`, `generate_file`, and the corresponding CLI commands unless a separately reviewed migration is required.
- Preserve source locations and meaningful qualifiers such as negation, output type, case sensitivity, ordering, and missing-result behavior.
- Generate source without running it. An explicit Run action in an IDE may execute generated code only after successful generation.
- Syntax-check output and write it atomically. A failed translation must leave any existing output file unchanged.
- Treat Python as the first backend. Add another backend only after it can pass shared behavior examples.

## Milestone 1: Put the current interpreter in durable source control

**Purpose:** Make the verified local implementation reviewable and reproducible before changing its architecture.

**Files:** `EN-Library/codeinenglish/`, `EN-Library/tests/`, `EN-Library/pyproject.toml`, `en-language/SPEC.md`, `en-language/README.md`, and `en-language/vscode-extension/`.

- [x] Obtain or restore real checkouts for both repositories; record their branch, commit, remotes, and working-tree status. Do not overwrite existing user files.
- [x] Compare the EN-Library checkout with `/private/tmp/EN-Library-staging` and the language checkout with the current workspace; apply only missing changes and inspect the diffs.
- [x] Build and install EN-Library in a fresh virtual environment; confirm that `import codeinenglish` and `python -m codeinenglish generate` work outside the checkout.
- [x] Run the Python suite, extension suite, and all `.en` examples against the checked-out sources. The accepted baseline is 110 Python tests, 19 extension tests, and 19 generating examples unless the recovered branches have moved forward.
- [x] Commit the two repositories separately once their contents and test evidence are reviewed. Publishing packages and merging remote branches are separate release decisions.

**Done when:** Neither repository depends on a temporary staging directory, and a clean installation reproduces the documented Greeter and Two Sum workflows offline.

## Milestone 2: Define one `.en` source contract (reopened)

**Purpose:** Make a beginner's file format predictable before expanding English coverage or output languages.

**Files:** `en-language/SPEC.md`, `en-language/examples/`, `EN-Library/codeinenglish/problem_prompt.py`, `EN-Library/codeinenglish/interpreter.py`, `EN-Library/codeinenglish/__main__.py`, and corresponding tests.

- [x] Specify a canonical target directive such as `target python`; continue accepting `import codeinpython library` as a compatibility alias. Reject conflicting or unknown targets with file and line information.
- [x] Specify the two request forms: English instructions on ordinary lines, and a high-level problem request on `#` comment lines. Define which comments are documentation versus a request.
- [x] Keep one command: `python -m codeinenglish generate FILE.en [--output PATH]`. Document the equivalent `codeinenglish.generate_file(...)` Python API.
- [x] Add meaningful file-level cases for omitted target, conflicting directives, malformed comments, paths with spaces, and failed generation preserving an existing output.
- [x] Rewrite the first-run guide around two complete examples: a class-based Greeter and a short comment request for Two Sum. Show generated output and how to run it.
- [ ] Add a source version header (`en 0.1`), define headerless files as legacy 0.1 during migration, and specify a deprecation policy.
- [ ] In the next language version, require `#?` to start a problem request; plain `#` comments are documentation.

**Done when:** A new user can identify the file extension, write either accepted form, generate Python, and understand a refusal without learning Python syntax.

## Milestone 3: Make the shared program representation truly target-neutral (reopened)

**Purpose:** Let every source form and problem strategy lower to one typed `Program` IR consumed by every renderer and the reference evaluator. `ProblemSpec` records intent and constraints before strategy lowering, but is never rendered directly.

**Files:** `EN-Library/codeinenglish/ir.py`, `parser.py`, `problem_recognizer.py`, `problem_strategies.py`, `python_generator.py`, and focused tests.

- [x] Inventory current instruction IR nodes and Python-AST problem strategies.
- [ ] Extend the IR with the smallest explicit, target-neutral operations needed by all documented problem strategies.
- [ ] Lower each recognized `ProblemSpec` plus its strategy to `Program`; retain source constraints and examples as metadata.
- [ ] Add a reference evaluator and make both Python and JavaScript backends consume only `Program`.
- [ ] Compare reference, Python, and JavaScript behavior across every supported problem family and boundary cases.
- [x] Preserve the existing public `translate`, `solve`, and `generate` APIs while the IR migration proceeds.

**Done when:** Both source paths lower to `Program`; no backend consumes `ProblemSpec` or Python AST from problem strategies; reference and generated behavior agree.

## Milestone 4: Grow English understanding by capability, not by memorized question

**Purpose:** Improve usefulness without promising unrestricted English.

**Files:** `EN-Library/codeinenglish/parser.py`, `expressions.py`, `problem_recognizer.py`, `problem_strategies.py`, `tests/`, plus `en-language/SPEC.md` and `examples/`.

- [x] Maintain a capability registry listing accepted intent, inputs, output, constraints, defaults, and representative phrasings for each family or language construct.
- [x] Choose one missing capability at a time from real user requests. Add independent paraphrases, boundary cases, contradictory requests, and generated-behavior checks before marking it supported.
- [x] Add plain-English diagnostics that state which detail is missing or unsupported; never replace a successful old `.py` with partial new code.
- [x] Keep a maintainer-authored regression corpus, including cases that must be rejected. Its scores are self-checks, not independent user coverage.
- [ ] Collect a separate held-out prompt set from at least three independent testers before making user-understanding or broad coverage claims.

**Done when:** Coverage claims name specific supported capabilities and their measured examples; unfamiliar requests fail honestly.

## Milestone 5: Add a second output language

**Purpose:** Prove that the language selector and shared representation work beyond Python.

**First target:** JavaScript, after Milestone 3. Give it a separate implementation plan and release gate.

- [x] Define JavaScript output filenames, runtime input/output behavior, and mapping for the documented shared subset of IR nodes.
- [x] Add a JavaScript backend in EN-Library and a `target javascript` directive in `.en`; avoid a second English parser.
- [x] Run shared examples against both backends and compare observable results. Reject constructs that have no defined JavaScript meaning.
- [x] Document how a JavaScript project invokes the CLI; consider an npm wrapper only if users need a native JavaScript integration.

**Done when:** The same supported `.en` request produces equivalent Python and JavaScript behavior for the documented shared subset.

## Milestone 6: Make editor and package access broadly usable

**Purpose:** Let people use the compiler from their preferred development environment and install a stable release.

- [x] Keep the CLI as the editor-independent interface. VS Code uses it through the existing extension; other IDEs can use an external-tool or task configuration first.
- [x] Add an editor protocol or dedicated extension only when a specific editor needs features that a CLI task cannot provide, such as inline diagnostics.
- [x] Verify metadata, wheel contents, supported Python versions, and installation instructions in clean environments. Public PyPI names were not reserved or release-verified.
- [x] Prepare separate PyPI and extension Marketplace release checklists. The release artifacts and checklist are prepared; public publication remains a separate action.

**Done when:** A clean install can translate without network access, and each advertised IDE has a demonstrated launch path.

## Review focus for the next implementation plan

1. A directive appearing in ordinary comment text must not accidentally switch targets or request forms.
2. A conflict between target aliases must fail before touching output.
3. A qualifier such as “do not reuse a position” must survive recognition and reach generated behavior.
4. A generation error must not let the VS Code Run action execute an old sibling `.py`.
5. The Python API, CLI, and extension must select the same interpretation for the same `.en` file.

## Execution order

Complete Milestone 1, then finish the reopened source contract in Milestone 2 before expanding recognition. Milestone 3 now precedes additional problem strategies or backend expansion; both the second backend and problem strategies depend on the shared IR. Milestone 4 uses a maintainer regression corpus until independent held-out prompts are collected. Milestone 6 can improve installation and editor access as each backend becomes stable. Each milestone receives its own focused implementation plan before code changes.
