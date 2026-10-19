# Runnable, Reviewable Code in English Solutions

## Goal

Make generated DSA solutions easier to run and safer to trust: produce a complete JSON-in/JSON-out Python program, make the recognized contract and assumptions visible, and test solutions against prompt examples and algorithm-specific edge cases. Expand the curated offline catalog beyond its initial nine families without claiming to understand arbitrary English.

## User and constraints

The user may not know programming and may not have access to AI. They describe a problem in comments in an `.en` file and want editable Python that they can run. The package remains offline, deterministic, standard-library-only, and must never run the generated program itself. Keep the existing `.en` instruction translator intact. Do not scrape or copy LeetCode prompts; author independent examples.

## Generated program contract

Every supported problem produces:

1. A short generated comment headed `Interpreted request`, listing the canonical inputs, result, and each material assumption. Label assumptions as `stated` or `defaulted` so users can see which behavior came from their wording.
2. A named, directly callable solution function with typed-by-name arguments (for example, `two_sum(nums, target)`).
3. A `main()` entry point reading one JSON object from standard input, mapping object keys to function arguments, and writing one JSON result to standard output. This avoids guessing interactive input formats. Output must be valid JSON; errors go to standard error with a nonzero exit code.
4. If the `.en` prompt provides supported `Example input: {...}` and `Example output: ...` comment pairs, embed these examples and expose `--check-examples` to run them against the generated function when the user runs the generated `.py` file. The translator itself never executes generated Python.

The input JSON schema is the canonical function argument names and types in `ProblemSpec`. The default runner accepts exactly one JSON object. Multi-line JSON and alternate judge-specific signatures are outside this milestone.

## Contract and assumption handling

Extend `ProblemSpec` to record the requested result, canonical input schema, constraints, evidence, and assumptions. Every result-affecting default must be explicit in the generated comments and documented. Examples include:

- Pair sum: return the first matching pair in left-to-right scan order; return `null` if none exists unless the prompt states another supported behavior.
- Search: sorted ascending input is required; return the first matching index or `-1` when absent.
- Text comparison: case-sensitive and punctuation/whitespace significant unless a supported phrase explicitly changes those rules.
- Empty collections: each strategy documents its return behavior.

If wording states conflicting requirements, or asks for a result/constraint outside the recognized contract, reject it with a source-located diagnostic and preserve any existing output. Do not silently discard a recognized qualifier.

## Verification design

Each strategy has independently authored paraphrase cases and behavior tests covering normal inputs, boundaries, duplicates, empty inputs where valid, and absent results. Use small, simple reference implementations in tests to compare optimized strategies over exhaustive small domains or deterministic generated cases where practical. Prompt-provided input/output examples are additional direct checks and are available in generated Python through `--check-examples`. Syntax validation is necessary but not sufficient; the documentation must distinguish syntax checks, strategy tests, prompt-example checks, and the remaining risk that fixed rules misread an unseen sentence.

No automatic execution occurs during translation. The user explicitly runs the generated `.py` file (or its `--check-examples` mode) after review.

## Coverage expansion

Keep the recognizer deterministic and strategy-driven. The next useful catalog increment adds:

- First non-repeating character
- Reverse text
- Move zero values to the end while preserving other order
- Merge two sorted integer lists
- Maximum contiguous subarray sum
- Balanced parentheses/brackets

For each family, define canonical inputs, return type, material constraints, edge behavior, multiple independently authored English phrasings, and an original `.en` example. Later catalog batches should target stacks/queues, linked lists, trees, graphs, and dynamic programming in separate reviewed increments. Each family must have sufficient evidence before recognition; unknown or ambiguous requests fail clearly.

## Architecture

Keep comment extraction, deterministic recognition, strategy selection, AST generation, rendering, and safe file writing as distinct steps. Extend the shared AST generator for the callable solution, JSON runner, contract comments, and optional example checker. Reuse one typed schema for recognition, strategy generation, JSON argument validation, and documentation. Keep general English statement translation separate.

## Safety and failure behavior

- No models, network, downloads, runtime dependencies, or prompt scraping.
- The generator validates input/output path separation, syntax-checks generated source, and atomically writes it.
- Unsupported prompts, contradictory constraints, malformed example JSON, invalid input JSON, or invalid argument shapes produce clear diagnostics.
- Translation failures never replace existing generated files.
- The generated program contains only the chosen strategy and runner; it does not evaluate English or load external code.

## Acceptance criteria

- Running `python3 -m codeinenglish solve problem.en` produces a complete editable Python program that accepts documented JSON input and prints JSON output.
- Generated comments accurately expose stated requirements and defaulted assumptions.
- Prompt examples can be checked by running the generated program with `--check-examples`; translation itself does not execute code.
- The six new DSA families accept multiple original phrasings and have behavior tests plus documented edge cases.
- Reference comparisons catch strategy errors for finite small domains where practical.
- Unsupported, ambiguous, conflicting, and malformed requests do not write partial output or replace a prior file.
- Existing `translate`, `solve`, and current examples remain working; no external dependencies are added.
