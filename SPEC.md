# Code in English: offline English-to-Python translator

## Goal

Let a user describe a program in supported, ordinary English in a `.en` file and generate editable Python source. The translator is a pure-Python library and command-line tool that works offline without an AI model, network connection, or runtime dependencies.

## Product contract

- Input is a `.en` file containing a program request expressed in documented English patterns.
- Output is Python source in a `.py` file, next to the input by default; users can choose another output path.
- The Python API exposes `translate(source: str) -> str`, `translate_file(source_path, output_path=None) -> Path`, and the unified `generate_file(source_path, output_path=None) -> Path`.
- The CLI exposes `codeinenglish generate SOURCE [--output PATH]` as the normal entry point, plus explicit `translate` and `solve` commands.
- Translation never executes generated Python.
- The source `.en` file is not modified. Failed or invalid translation must not replace an existing `.py` output.
- No model, network access, package dependency, or model download is required. Use the Python standard library at runtime.

## Comment-based problem generation

The package also accepts a `.en` problem file containing blank lines, the exact directive `import codeinpython library`, and `#` comments describing the task. `solve(source)` returns Python source and `solve_file(path, output_path=None)` writes a sibling `.py` by default. `generate_file` and `python3 -m codeinenglish generate SOURCE [--output PATH]` select this path when that exact directive appears; otherwise they use the instruction translator. The directive is not included in generated Python. This path is a curated deterministic recognizer and strategy library, not an unrestricted English translator.

Generated solutions include the callable algorithm function and a main() wrapper. The wrapper reads one JSON object from standard input whose keys are the canonical function argument names, validates key/type requirements, and writes one JSON result to standard output. The generated file may be run separately by the user; translation never executes it. If comment pairs Example input: <JSON object> and Example output: <JSON value> are included, they are embedded in the generated source and can be checked by running that source with --check-examples.

Every generated file includes an interpreted function signature and lists material assumptions as stated or defaulted. The solution contract documents edge behavior, including first-pair selection and null when no pair exists, first matching search index and -1 when absent, case-sensitive text comparison by default, and empty-input behavior. Conflicting or unsupported behavior requests fail with a source-located diagnostic.

Supported problem families now include pair-sum indices; duplicate detection; per-value frequencies; palindrome; anagram; sorted binary search; minimum, maximum, and sum; first unique character; reverse text; move zeros to the end; merge sorted lists; maximum contiguous subarray sum; and balanced delimiters. This growing fixed catalog does not guarantee understanding of arbitrary English. Prompt examples, strategy reference tests, and syntax validation provide evidence but cannot prove that every novel wording was understood as intended.

## What “understand English” means here

The translator uses deterministic parsing rules, vocabulary, and grammar. It should accept multiple documented English phrasings for the same programming intent, including common synonyms and harmless variations in word order. It will translate only requests it can map to a supported program structure. It must explain unsupported or ambiguous requests rather than silently inventing behavior.

This is not a claim that fixed offline rules can understand every possible English sentence. Supported grammar and examples are part of the product interface and should grow over time.

## Current capability inventory

The instruction translator currently accepts documented forms for variables and values, arithmetic/comparison expressions, input and output, `if`/`otherwise`, `for each` loops over lists, list/dictionary creation and updates, indexing, and classes with methods, instance fields, calls, and returns. It does not claim arbitrary Python syntax or unrestricted English.

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

Each listed family has tested examples and accepted wording in EN-Library. New phrasing and problem families need explicit rules and tests; unsupported or ambiguous wording produces a diagnostic.

## Translation architecture

1. Normalize input conservatively while retaining source locations for diagnostics.
2. Parse English statements and expressions into a small, typed intermediate representation (IR); do not generate Python by substituting words directly into strings.
3. Resolve names and report unknown or ambiguous references with the `.en` line number.
4. Generate Python from the IR and validate it with Python's built-in `ast` module before returning or writing it.
5. Write output atomically so parsing, generation, or validation errors preserve existing files.

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
