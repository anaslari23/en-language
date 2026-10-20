# Collections and Loops Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend Code in English with reusable lists, dictionaries, indexing, membership checks, and nested `for each`/`if` blocks so users can express common iterative algorithms such as Two Sum.

**Architecture:** Keep the current deterministic pipeline: English parser → typed IR → Python AST generator → validated Python text. Add only explicit phrase forms for these constructs, preserve source locations in errors, and never evaluate or execute input while translating.

**Tech Stack:** Python 3.10+ standard library; `ast`, `dataclasses`, `unittest`; no runtime dependencies or model.

**Spec:** `SPEC.md` (language coverage roadmap, error behavior, and offline contract)

## Global Constraints

- Work offline with the Python standard library and no AI model, network access, or runtime dependency.
- Translate supported forms deterministically; reject ambiguous or unsupported wording with a source-located diagnostic.
- Generate Python from typed IR nodes and validate it with `ast.parse`; never execute generated code.
- Keep source files unchanged and preserve existing output files on translation errors.
- Avoid one-off translations for named algorithm exercises; Two Sum must use general collection and control-flow features.
- Functions and `return` are outside this milestone; the Two Sum example is a complete `.en` script that displays the pair of indices.

## Review Focus

- `and` inside strings must stay literal while collection instructions split values; test quoted strings containing `and` and list additions.
- Unclosed, unmatched, or wrongly nested `end if`/`end for` markers must report the correct line and never emit partial Python.
- An unknown collection or index variable must be diagnosed before code generation; pin line and error kind in parser tests.
- Membership and indexing must preserve Python's normal semantics for empty collections, absent keys, and valid index zero; cover with translated-program behavior checks.
- Collection instructions must not be executable Python escape hatches; test that arbitrary calls, attribute access, and imports remain rejected.

## File Structure

- `codeinenglish/ir.py`: add list/dictionary construction, item access/update, membership expressions, and `ForEach` statement nodes.
- `codeinenglish/expressions.py`: parse indexed values and membership conditions using the existing expression tokenizer.
- `codeinenglish/parser.py`: parse append/update instructions and explicit nested `for each` and `if` blocks; maintain scope/name checks.
- `codeinenglish/python_generator.py`: convert new IR nodes to Python AST and retain syntax validation.
- `tests/test_expressions.py`: expression and precedence coverage for collection operations.
- `tests/test_parser.py`: accepted phrases, nested block structure, name resolution, and diagnostics.
- `tests/test_python_generator.py`: expected AST structure for lists, dictionaries, indexing, updates, membership, and loops.
- `tests/test_translator.py`: end-to-end translation and file safety coverage.
- `examples/two_sum.en`: show a generic Two Sum implementation using the language's general-purpose features.
- `README.md`: document the new supported phrases and limits.

## Accepted Forms for This Milestone

- Create an empty collection: `make an empty list called nums`; `make an empty dictionary called seen`.
- Add to a list: `add number to nums` (maps to `nums.append(number)`).
- Update a dictionary: `set seen at number to index` (maps to `seen[number] = index`).
- Read an item: `seen at complement` or `nums at index` (maps to subscription).
- Check a dictionary key: `if complement is in seen then`.
- Iterate a list: `for each number in nums`, closed by `end for`.
- Nest supported `if` and `for each` blocks using their matching end markers.
- Retain existing assignment, input, display, arithmetic, comparisons, `otherwise`, and `end if` forms.

Collection values are created and populated with instructions, so learners do not need list punctuation or comma-separated literal syntax in this milestone. Variable names follow current Python-identifier rules. The translator supports lists and dictionaries as collections; other iterable types remain unsupported.

---

### Task 1: Add collection and membership expression IR

**Files:**
- Modify: `codeinenglish/ir.py`
- Modify: `codeinenglish/expressions.py`
- Test: `tests/test_expressions.py`

**Interfaces:**
- Add `Index(collection: Expr, index: Expr)` for `collection at index`.
- Add `Contains(item: Expr, collection: Expr)` for the condition phrase `item is in collection`.
- Empty list/dictionary creation is represented by `CreateList`/`CreateDictionary` statements in Task 2; it does not add empty-collection expression values in this milestone.
- Keep expression parsing as `parse_expression(text: str, *, filename: str, line: int) -> Expr`.

- [x] **Step 1: Add failing expression tests** for `nums at index`, `seen at complement`, and membership parsing, including nested arithmetic such as `target minus number` and quoted text containing `and`.
- [x] **Step 2: Run the focused expression tests** with `python3 -m unittest discover -s tests -p 'test_expressions.py' -v` and confirm new cases fail first.
- [x] **Step 3: Implement the expression tokens and IR nodes** without accepting Python brackets, attribute access, calls, or imports as source expressions.
- [x] **Step 4: Run focused expression tests** and confirm existing arithmetic/comparison behavior is unchanged and the new nodes are parsed exactly.

### Task 2: Parse collection statements and nested blocks

**Files:**
- Modify: `codeinenglish/ir.py`
- Modify: `codeinenglish/parser.py`
- Test: `tests/test_parser.py`

**Interfaces:**
- Add `CreateList(name: str)`, `CreateDictionary(name: str)`, `Append(collection: str, value: Expr)`, `SetItem(collection: str, index: Expr, value: Expr)`, and `ForEach(name: str, collection: Expr, body: list[Statement])` (names may be adjusted consistently if the existing IR design suggests a better fit).
- Keep `parse_program(source: str, filename: str = "<string>") -> Program` and `CodeInEnglishError` unchanged at the public boundary.
- Nested blocks use a stack of block frames; `end if` and `end for` must close the matching top frame. `otherwise` applies only to the current `if` frame and appears at most once.
- Names introduced by assignments and collection creation are available after the statement; a `for each` loop variable is available only in that loop body.

- [x] **Step 1: Add failing parser tests** for every accepted phrase, empty list/dictionary creation, append, dictionary update, nested `for each` + `if`, local loop-variable use, undefined collection/index names, duplicate `otherwise`, and mismatched/unclosed end markers.
- [x] **Step 2: Run parser tests** with `python3 -m unittest discover -s tests -p 'test_parser.py' -v` and confirm the new collection/block cases fail.
- [x] **Step 3: Replace the single-block parser state with a source-located block stack** and add the exact statements above. Reject a mismatched `end if`/`end for` on its source line.
- [x] **Step 4: Run parser tests** and confirm old one-level syntax still parses while nested control flow produces the expected IR.

### Task 3: Generate Python AST for collection features

**Files:**
- Modify: `codeinenglish/python_generator.py`
- Test: `tests/test_python_generator.py`

**Interfaces:**
- Extend `generate_python(program: Program) -> str` to generate `[]`, `{}`, `.append(value)`, subscript reads/writes, `item in collection`, and Python `for` statements from the new IR.
- Construct nodes with `ast` types and validate the final result with `ast.parse` as the current generator does.

- [x] **Step 1: Add failing generator tests** for empty collections, append, dictionary subscript assignment/read, membership inside `if`, nested loop/if indentation, and empty nested branches.
- [x] **Step 2: Run generator tests** with `python3 -m unittest discover -s tests -p 'test_python_generator.py' -v` and confirm the added IR nodes are unsupported.
- [x] **Step 3: Implement AST generation** for each new IR type; use AST `Call` only for the fixed `append` method emitted from `Append`, never for source-provided function names.
- [x] **Step 4: Run generator tests** and compare parsed Python ASTs to expected constructs; assert generated sources pass `ast.parse`.

### Task 4: Translate and verify the Two Sum example

**Files:**
- Create: `examples/two_sum.en`
- Modify: `tests/test_translator.py`
- Modify: `README.md`

**Interfaces:**
- The example uses only documented general statements and produces a displayed list of two indices when a pair exists; otherwise it displays a clear no-pair result.
- It maintains a running index, checks whether `target minus number` is already a key in `seen`, retrieves the earlier index with `seen at complement`, and stores the current index under the current value.
- It must not add an algorithm-specific rule, special API, or Python escape hatch.

- [x] **Step 1: Write the `.en` example and end-to-end assertions** for a successful pair, no pair, duplicate values such as `[3, 3]`, and a pair involving index zero. Populate the input list using repeated `add` instructions.
- [x] **Step 2: Run the translator tests** with `python3 -m unittest discover -s tests -p 'test_translator.py' -v` and confirm the example cannot yet translate or the cases fail.
- [x] **Step 3: Translate the example and execute only the generated Python inside the test harness** with controlled inputs/outputs; keep the public translator API itself translation-only.
- [x] **Step 4: Update README examples and supported-grammar documentation** to list the exact new phrases and explicitly retain the limitation that arbitrary English is not inferred.
- [x] **Step 5: Run the full unittest suite** with `python3 -m unittest discover -s tests -v` and the documented CLI translation command; verify the CLI writes Python but does not execute it.

## Later Milestones (Separate Plans)

1. **Functions and return values:** function definitions, parameters, calls, and returning the pair from a reusable `two_sum` function.
2. **Broader English phrasing:** expand deterministic grammar aliases, synonyms, and error hints while testing that each phrase maps to the same IR. Do not claim arbitrary free-form understanding without a model.
3. **Additional common constructs:** list length, while loops, list indexing/mutation beyond append, dictionary operations, and more comparisons as real user examples require them.

## Scope Check

This plan is a single independently testable collections-and-loops milestone. It deliberately postpones functions and `return`, so Two Sum is an executable `.en` program that displays its result; adding a callable function is a separate plan.
