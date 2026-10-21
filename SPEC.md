# Code in English: offline English-to-Python compiler

## Goal

Let a user describe a program in supported, ordinary English in a `.en` file and generate editable Python source. The compiler is a pure-Python library and command-line tool that works offline without an AI model, network connection, or runtime dependencies.

## Product contract

- Input is a `.en` file containing a program request expressed in documented English patterns.
- Output is Python source in a `.py` file, next to the input by default; users can choose another output path.
- The Python API exposes `translate(source: str) -> str`, `translate_file(source_path, output_path=None) -> Path`, and the unified `generate_file(source_path, output_path=None) -> Path`.
- The CLI exposes `codeinenglish generate SOURCE [--output PATH]` as the normal entry point, `check SOURCE --json`, `generate SOURCE --json`, and `migrate SOURCE [--to VERSION] [--write]`, plus explicit `translate` and `solve` commands.
- Translation never executes generated Python.
- The source `.en` file is not modified. Failed or invalid translation must not replace an existing `.py` output.
- No model, network access, package dependency, or model download is required. Use the Python standard library at runtime.

## Comment-based problem generation

The source contract is implemented in EN-Library 0.2.0. Headerless files and `en 0.1` use the legacy interpretation; `en 0.2` requires an explicit `#?` request block and treats ordinary `#` comments as documentation. `target python` or `target javascript` is a standalone directive. The old `import codeinpython library` alias remains available in legacy and `en 0.1`, and is an error in `en 0.2`. Supported versions are an explicit set, so unsupported versions are diagnosed instead of guessed.

`solve(source)` returns Python source and `solve_file(path, output_path=None)` writes a sibling `.py` by default. `generate_file` and `python3 -m codeinenglish generate SOURCE [--output PATH]` select the appropriate path from the source contract. Directives are not included in generated Python. A Python `import codeinenglish` exposes the package API; it does not execute Python comments. This problem path is a curated deterministic recognizer and strategy library, not an unrestricted English translator.

Generated solutions include the callable algorithm function and a main() wrapper. The wrapper reads one JSON object from standard input whose keys are the canonical function argument names, validates key/type requirements, and writes one JSON result to standard output. The generated file may be run separately by the user; translation never executes it. If comment pairs Example input: <JSON object> and Example output: <JSON value> are included, they are embedded in the generated source and can be checked by running that source with --check-examples.

Every generated file includes an interpreted function signature and lists material assumptions as stated or defaulted. The solution contract documents edge behavior, including first-pair selection and null when no pair exists, first matching search index and -1 when absent, case-sensitive text comparison by default, and empty-input behavior. Conflicting or unsupported behavior requests fail with a source-located diagnostic.

Supported problem families now include pair-sum indices; duplicate detection; per-value frequencies; palindrome; anagram; sorted binary search; minimum, maximum, and sum; first unique character; reverse text; move zeros to the end; merge sorted lists; maximum contiguous subarray sum; balanced delimiters; and ascending numeric sort. This growing fixed catalog does not guarantee understanding of arbitrary English. Prompt examples, strategy reference tests, and syntax validation provide evidence but cannot prove that every novel wording was understood as intended.

## What “understand English” means here

The compiler uses deterministic parsing rules, vocabulary, and grammar. It should accept multiple documented English phrasings for the same programming intent, including common synonyms and harmless variations in word order. It will translate only requests it can map to a supported program structure. It must explain unsupported or ambiguous requests rather than silently inventing behavior.

This is not a claim that fixed offline rules can understand every possible English sentence. Supported grammar and examples are part of the product interface and should grow over time.

## Source version migration

The current explicit language versions are `en 0.1` and `en 0.2`; headerless sources remain supported in legacy mode and receive EN-W401. Version headers may follow blank lines and ordinary comments, but must precede requests and instructions. `en 0.1` preserves the old comment and target behavior. In `en 0.2`, a problem must use one contiguous `#?` block, ordinary comments are documentation, and lowercase target directives are accepted. A second request block, mixed problem/instruction source, duplicate target, malformed header, or unknown version stops generation before an output file is changed. Legacy mode is scheduled for removal in package version 0.4.0, after warnings in 0.2.x and 0.3.x.

Use `python -m codeinenglish check FILE.en --json` to inspect the parsed contract and run plan without writing output. The VS Code extension saves the open document, calls `generate --json`, and executes the exact run plan returned by the CLI. Use `python -m codeinenglish generate FILE.en --json` to generate and return the same JSON response with `written: true` only after a successful atomic write. `python -m codeinenglish migrate FILE.en` prints a dry-run diff; add `--write` to apply it. Migration compares generated code bodies and leaves the source untouched when they differ. Headerless sources warn for two package minor releases after the first warning release; with EN-Library 0.2.0 as the first warning release, the planned removal point is 0.4.0. Warnings go to stderr or the structured diagnostics and do not change generated code bytes.

The PyPI distribution name and Python import name are separate: the intended distribution candidate is `codeinenglish`, and the module remains `codeinenglish`. A read-only PyPI lookup on 2026-10-21 found no published project records for either `en` or `codeinenglish`; this does not reserve either name or guarantee PyPI will accept it at release time. Recheck availability and policy before publishing. Avoid the generic `en` distribution name.

## Current capability inventory

`target javascript` selects the first JavaScript backend. It currently accepts instruction programs composed of text, boolean, null, and exact integer literal/name assignments plus `show`; floating-point literals are not yet supported. The problem path supports ascending numeric sort with integers in JavaScript's exact Number range. It writes a sibling `.js` file. The problem runner reads one JSON object from standard input and prints JSON, or checks embedded examples with `--check-examples`. Other instruction nodes and problem families produce an unsupported diagnostic before an output file is changed. The legacy `import codeinpython library` directive remains Python-only.

The instruction front end currently accepts documented forms for variables and values, arithmetic/comparison expressions, input and output, `if`/`otherwise`, `for each` loops over lists, list/dictionary creation and updates, indexing, and classes with methods, instance fields, calls, and returns. It does not claim arbitrary Python syntax or unrestricted English.

The comment-based problem path currently recognizes these deterministic problem families:

| Request family | Inputs | Result |
| --- | --- | --- |
| Pair sum | integer list, target | first matching pair of indices; `null` when absent unless one solution is guaranteed |
| Duplicate check | integer list | whether a value repeats |
| Frequencies | integer list | count for each value |
| Palindrome | text | whether text reads the same forward and backward under stated/default text rules |
| Anagram | two strings | whether they contain the same letters under stated/default text rules |
| Binary search | ascending sorted integer list, target | matching index or `-1` |
| Minimum / maximum / sum | integer list | requested aggregate; empty-list behavior is documented |
| First unique character | text | first non-repeating character or `null` |
| Reverse text | text | reversed text |
| Move zeros | integer list | list with zeros at the end, preserving other values' order |
| Merge sorted lists | two ascending integer lists | one ascending merged list |
| Maximum subarray sum | integer list | largest sum of a contiguous segment |
| Balanced delimiters | text | whether brackets and parentheses are balanced |
| Ascending sort | integer list | a new list ordered from smallest to largest, preserving duplicates |

Each listed family has maintainer-authored regression examples and accepted wording in EN-Library. The capability registry is `ProblemFamily` with its input and assumption mappings in `problem_recognizer.py`; `tests/fixtures/prompt_corpus.json` records representative accepted and rejected phrasings. In the EN-Library 0.2.0 regression corpus, all 24 accepted prompts map to their intended family and all 8 ambiguous or unsupported prompts are rejected. These are internal regression results, not independent evidence of user coverage. Before making broad understanding claims, collect a separate held-out prompt set from at least three independent testers and report its results separately. New phrasing and problem families need explicit rules and tests; unsupported or ambiguous wording produces a diagnostic.

## Compiler architecture

1. Normalize input conservatively while retaining source locations for diagnostics.
2. Parse English statements into a typed `Program`; recognize a marked request into `ProblemSpec`, then lower its selected strategy into the same `Program` IR. `ProblemSpec` preserves intent and constraints before lowering and is never consumed directly by a backend.
3. Resolve names and report unknown or ambiguous references with the `.en` line number.
4. Render Python from `Program` and validate it with Python's built-in `ast` module before returning or writing it. Future backends and the reference evaluator will also consume `Program` only.
5. Write output atomically and include deterministic compiler/source-version metadata. Source-line maps and a shared problem IR remain planned architecture work; the current implementation reports source positions for translation diagnostics but does not yet map runtime Python tracebacks back to `.en` lines.

Keep the grammar, IR, and Python generation small and explicit. Add phrase variations as aliases for existing meanings instead of duplicating translation logic.

## Language coverage roadmap

Build coverage in independently usable stages:

1. **Core statements:** assignment; string, number, Boolean, and `None` values; arithmetic and comparisons; output; input; comments; clear errors.
2. **Control flow:** `if`/`else`, `while`, and `for each` over a collection, including nested blocks.
3. **Collections:** list and dictionary creation, indexing, append/update, membership, length, and iteration.
4. **Object-oriented programming:** classes, instances, fields, methods, parameters, calls, and return values. Inheritance and custom constructors remain future work.
5. **Common algorithms:** recognize general task descriptions and map their stated steps to the core constructs above; add named task patterns only when they represent reusable intent rather than one hard-coded exercise.

Each stage must document accepted phrasing, generated Python behavior, and unsupported cases. Do not claim a later stage is supported until it has examples and verification.

## Initial delivery milestone

Replace the current execution-oriented CLI flow with safe Python generation and establish the extensible translator foundation. Deliver:

- `translate` and `translate_file` APIs, with diagnostics carrying filename and line information.
- A `generate_file` API and `generate` CLI command that dispatch by the exact problem directive while preserving `translate` and `solve`.
- CLI translation to a sibling `.py` file or an explicit output path.
- A small IR-backed grammar covering the core constructs already present (assignment, input, output, simple values, and an `if`/`otherwise` block), while preserving their existing examples where behavior is unambiguous.
- Correct, composable parsing for quoted text, names, and basic arithmetic/comparison expressions needed by those constructs.
- Python syntax validation and atomic output handling.
- Documentation that clearly lists supported English forms, explains the no-model/offline design, and says that generated Python is a draft for the user to inspect and run.

Do not expand this initial delivery into the full roadmap. Subsequent stages should each have their own focused specification and implementation plan.

## Error behavior

- Include the input filename and source line when an error can be tied to a line.
- Identify whether an error is an unknown phrase, malformed statement, unknown name, or ambiguous request, and give a useful supported-form hint where practical.
- Do not return partial Python as though translation succeeded.
- Do not overwrite an existing output if source reading, translation, or Python validation fails.

## Non-goals

- Replacing the Python interpreter or implementing a new general-purpose runtime.
- Modifying or reverse-engineering CPython as part of the translator.
- Understanding arbitrary English with guaranteed correctness.
- Executing generated Python automatically.
- Supporting all programming constructs in the initial delivery.
- Depending on Ollama, a hosted API, a local model, downloaded weights, or third-party packages.

## Acceptance criteria for the initial delivery

1. The library translates documented core statements to Python using only the standard library and no network access.
2. Equivalent documented phrase variations produce equivalent Python behavior.
3. Nested control-flow blocks translate with correct Python structure, or fail clearly if nesting is outside the implemented grammar.
4. `translate_file`, `solve_file`, `generate_file`, and their CLI commands write a `.py` file to the documented destination and never execute it.
5. Python syntax is validated before output is returned or written.
6. A malformed, unsupported, ambiguous, or invalid translation produces a useful diagnostic and preserves any existing output file.
7. README examples match actual accepted syntax and do not imply support for features that are not implemented.
