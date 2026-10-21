# EN Source Contract: Version Header and `#?` Problem Marker

**Status:** Draft 4 implementation contract (decisions below are frozen for package 0.2.0)
**Applies to:** `en-language/SPEC.md` (language contract) and `EN-Library` (`codeinenglish`)
**Goal:** Make the meaning of a `.en` file explicit, so that no comment, directive or alias is ever interpreted by accident, and so the grammar can change later without breaking existing files.

---

## 1. Problems this solves

| Today (legacy, unversioned) | Consequence |
|---|---|
| A comment-only file is silently treated as a problem request | An ordinary documentation comment can trigger code generation |
| In a file with instruction lines, comments are documentation | The same `#` line means different things depending on the rest of the file |
| Directives are recognized by text pattern | A directive-looking phrase in a comment or request could switch the target |
| No version marker | Any grammar change risks breaking old files with no way to detect it |
| Two spellings for the Python target | Alias conflicts must be special-cased |

## 2. Terms

- **Directive line**: a non-comment line that configures the file (`en 0.2`, `target python`). It stands alone on its line.
- **Instruction line**: an ordinary English instruction (for example `set total to 5.`).
- **Request block**: one or more contiguous `#?` lines that state a problem in English.
- **Ordinary comment**: a line whose first non-space characters are `#` but not `#?`. It is always documentation in `en 0.2`.
- **Contract**: the result of reading a file's directives and structure: version, target, form (instruction or problem), body, and diagnostics. It is computed once, in one place, and shared by the Python API, the CLI and the VS Code extension.

## 3. Versions

| Version | Meaning | Behavior change vs legacy |
|---|---|---|
| (none) | Legacy mode | None. Accepted with a deprecation warning (section 9) |
| `en 0.1` | Legacy rules, now explicit | None. Adding the header leaves the generated **code body** unchanged. The full generated file differs only in the version field of its provenance block (section 10) |
| `en 0.2` | Explicit problem marker | Request text must use `#?`. Ordinary `#` comments are always documentation. `import codeinpython library` is rejected |

Splitting 0.1 and 0.2 gives a two-step migration: the first step is purely mechanical and provably safe, and the second step is the one that needs review.

Versions are `en MAJOR.MINOR`. While MAJOR is 0, a MINOR bump may change meaning. Each release of the package states exactly which versions it supports as an **explicit set** (`SUPPORTED_VERSIONS` in `contract.py`). The set need not be contiguous: a version can be removed while a later one stays.

## 4. Version header

### Syntax

```
en 0.2
```

- Lowercase `en`, one space, `MAJOR.MINOR` with digits only.
- The line stands alone and has no terminator.

### Position

The header is the **first non-blank, non-comment line** of the file. Blank lines and ordinary comments (for example a license notice) may appear before it.

For this purpose a `#?` line is **not** a comment: it counts as content. A `#?` line before the header therefore makes the header misplaced (EN-E101); it is never skipped as an ordinary comment. Header detection, and duplicate-header detection, look only at standalone non-comment lines. A mention of `en 0.2` inside an ordinary comment, inside `#?` request text, or inside a string literal on an instruction line is never a version line.

### Resolution algorithm

1. Read the file as UTF-8, strip a BOM, normalize newlines to `\n`.
2. Find the first non-blank line that is not an ordinary comment. `#?` lines count as content here.
3. If it matches `^en (\d+)\.(\d+)$`, the file is versioned. Look up the version in the supported set.
4. If it matches `^en\b` but not that pattern, report EN-E102.
5. If a later **standalone, non-comment line** matches `^en (\d+)\.(\d+)$`, report EN-E101 when step 3 found no header (misplaced: it comes after other content, including a `#?` line) or EN-E104 when a header was already found (duplicate, even when the two lines are identical). Text inside ordinary comments, `#?` request lines or string literals is never a version line.
6. Otherwise the file is **legacy** and follows the legacy rules exactly, plus warning EN-W401. If a headerless file contains a line starting with `#?`, the marker has no special meaning and warning EN-W403 is added. Legacy rules alone decide what the line is: documentation in a file with instruction lines, or part of the problem text in a comment-only file, where the text handed to the recognizer still begins with the `?`. Nothing about legacy behavior or output changes.

A comment-only legacy problem file has no content lines, so it is correctly treated as headerless.

## 5. Source forms

A file is exactly one of two forms.

| Form | How it is recognized (`en 0.2`) |
|---|---|
| **Instruction file** | Has instruction lines and no request block |
| **Problem file** | Has exactly one request block and no instruction lines |

A file with neither is EN-E305 (nothing to generate). A file with both is EN-E302.

## 6. The `#?` problem marker (`en 0.2`)

### Syntax

```
en 0.2
target python

#? Given a list of numbers and a target, return the indices
#? of the two numbers that add up to the target.
```

### Rules

1. A request line starts with `#?` after optional leading whitespace. The marker is recognized **only at the start of a line**. A `#?` inside a string literal or later in a line is not a marker.
2. One optional space after `#?` is removed. `#?text` and `#? text` are equivalent.
3. Contiguous request lines form one request block. A blank line or any other line ends the block.
4. **Line boundaries are preserved.** The block is an ordered list of request lines. Each carries its original file line number and its column offset: the number of characters before the text in the original line, counting leading whitespace, the `#?` marker and the optional space (see `SourceLine` in section 11). The lines are handed to the problem recognizer as separate lines, exactly as the legacy comment-only path hands it its lines. Embedded `Example input:` and `Example output:` lines therefore still parse as separate lines, and every recognizer error points at the real file line. Nothing is joined or re-wrapped. The marker only decides where the request starts and ends.
5. **Equivalence requirement.** For a migrated file, the sequence of request lines given to the recognizer (text and original line numbers) must be identical to what the legacy path gave it for the same comments. A test enforces this (case 33).
6. A file may contain **one** request block. A second block is EN-E301.
7. An empty block (`#?` with no text) is EN-E303.
8. Everything after the marker, including text that looks like a directive (`target javascript`), is request text and never a directive.
9. Ordinary `#` comments are documentation. If a comment starts with a request-like phrase (for example "write a program to") in a file that has no request block and no instruction lines, emit warning EN-W402 suggesting `#?`. The comment is still ignored.

### Columns in request lines

Columns are 1-based and counted in Unicode code points. A tab counts as one column and is never expanded.

| Source line | `col_offset` | Text begins at file column |
|---|---|---|
| `#?text` | 2 | 3 |
| `#? text` | 3 | 4 |
| `   #? text` (3 leading spaces) | 6 | 7 |
| `<tab>#? text` (1 tab) | 4 | 5 |

A recognizer error at column `c` within `text` is reported at file column `col_offset + c`. Only one space after the marker is removed. Any further spaces stay in `text` and are counted in `c`.

## 7. Target directive

```
target python
target javascript
```

- Placement: after the version line and before any instruction line or request block. Otherwise EN-E204.
- At most **one** target directive line in total, counting the `import codeinpython library` alias as a target directive. A second one is always an error, even when it repeats the first exactly, which matches the current parser. Omitting the directive means `python`.
- Recognized **only on non-comment lines**. Text inside `#` comments or a `#?` block never counts.
- `import codeinpython library` is a legacy alias for `target python`. It is accepted in legacy and `en 0.1` files and rejected in `en 0.2` (EN-E203, with the fix-it `target python`).
- A second directive naming a **different** target (including the alias together with `target javascript`) is EN-E201, "conflicting". A second directive naming the **same** target (including the alias twice, or the alias plus `target python`) is EN-E205, "repeated". Both stop generation. They are separate codes because the fix differs: choose one, versus delete one. The report points at the second directive and names the line of the first.
- Unknown targets are EN-E202 and list the supported ones.

## 8. Diagnostics

All diagnostics are plain English, begin with `file.en:LINE:`, and say how to fix the problem. **Every error leaves any existing output file untouched**, and generation never starts. Diagnostics are structured data with exact positions (section 11), so the API, CLI and VS Code report the same location. Warnings never change generated output.

| Code | Severity | Message (template) |
|---|---|---|
| EN-E101 | error | `The version line must come before everything except comments. Move "en 0.2" above line 3.` |
| EN-E102 | error | `"en abc" is not a valid version. Write it like "en 0.2".` |
| EN-E103 | error | `This file says en 0.3, but this install supports only en 0.1, en 0.2. Upgrade codeinenglish.` |
| EN-E104 | error | `There is more than one version line. Keep only the first.` |
| EN-E201 | error | `Line 5 asks for target javascript, but line 3 already chose python. Keep only one target line.` |
| EN-E202 | error | `Unknown target "rust". Supported targets: python, javascript.` |
| EN-E203 | error | `"import codeinpython library" is not allowed in en 0.2. Write "target python".` |
| EN-E204 | error | `"target" must come before the instructions or the request.` |
| EN-E205 | error | `Line 5 repeats the target already set on line 3. Remove the repeated line.` |
| EN-E301 | error | `Only one #? request is allowed per file. Move the second one to its own file.` |
| EN-E302 | error | `A file cannot mix #? requests with instruction lines.` |
| EN-E303 | error | `This #? request is empty.` |
| EN-E305 | error | `Nothing to generate: no instructions and no #? request.` |
| EN-W401 | warning | `No version line: treating this file as legacy. Run "python -m codeinenglish migrate".` |
| EN-W402 | warning | `This comment looks like a request but is ignored in en 0.2. Use "#?" to make it a request.` |
| EN-W403 | warning | `Line 4 starts with "#?", which is only a request marker in en 0.2. Without a version line, legacy rules decide what it is: documentation in a file with instructions, request text in a comment-only file. Add "en 0.2" above it to use the marker.` |

**EN-E103 is generated from the supported set and the migration table.** The message lists the members of `SUPPORTED_VERSIONS` one by one ("en 0.1, en 0.3") and never renders them as a range. The hint follows an explicit rule, not a numeric comparison alone:

1. If the file's version is a key in `MIGRATION_PATHS` (section 11), the hint is "Run python -m codeinenglish migrate." The table is the only thing that says a migration path exists, so a removed version has a path and a never-supported version does not.
2. Otherwise, if the version is higher than every member of `SUPPORTED_VERSIONS`, the hint is "Upgrade codeinenglish."
3. Otherwise there is no hint. The version is neither migratable nor newer than the set (for example `en 0.2` when the set is {0.1, 0.3} and 0.2 never existed).

`check --json` also reports the set as `supported_versions`.

## 9. Legacy compatibility and deprecation

- Headerless files keep working exactly as today, with EN-W401 on every run.
- **Window, counted in package releases.** The window counts minor releases of the `codeinenglish` package (the Y in X.Y.Z), not language versions, because that is the clock users experience. Proposed: legacy mode is accepted, with EN-W401, for two package minor releases after the release that first emits EN-W401, then becomes an error with the migrate hint. Example: if EN-W401 first ships in 0.5.0, legacy mode is removed in 0.7.0. Announce the removal release in the changelog when the first warning ships.
- **Warnings never touch output.** EN-W401 and every other warning go to stderr in the CLI and to `diagnostics` in the API and `check --json`. They are never written into generated files, and a warning never changes the exit code (0) or the generated bytes.
- The legacy parser is kept as one isolated module so it can be deleted cleanly.

## 10. Migration tool

```
python -m codeinenglish migrate FILE.en [--to 0.1|0.2] [--write]
```

- Default is a dry run that prints a diff and changes nothing. `--write` writes atomically.
- `--to` defaults to the highest supported version. The tool follows `MIGRATION_PATHS` one step at a time and reads every version that table lists, even one no longer in `SUPPORTED_VERSIONS`, so a removed version still has a path.
- **Legacy to 0.1**: inserts `en 0.1` before the first content line (a non-blank line that is not an ordinary comment, with `#?` lines counting as content), or at the top of a comment-only file. Nothing else changes.
- **0.1 to 0.2**: replaces `import codeinpython library` with `target python`, then rewrites comments by file form:
  - **Problem file (comment-only).** Each request comment line is rebuilt as its indentation + `#? ` + T, where T is exactly the text the legacy path hands the recognizer for that line. The migrator never just prefixes the original line. A legacy line `#? foo` has T = `? foo`, because the question mark is part of the legacy text. It therefore becomes `#? ? foo`, which reproduces the legacy text exactly (rule 5, case 33). A line whose T is empty becomes a bare `#?`.
  - **Instruction file.** Comments are documentation and stay comments. A comment line that begins with `#?` would become a request line in 0.2 (EN-E302), so one space is inserted after the `#` (`#? note` becomes `# ? note`). All other comments are untouched.
  - Every rewritten `#?` line is listed in the dry-run output with the reason.
- **Safety check (required)**: before writing, the tool generates output from the old file and from the migrated file and compares the **code bodies** (the generated output without its provenance block, defined below). If the bodies differ, it aborts and leaves the file untouched. This uses your determinism guarantee as the proof of a safe migration. The full files are expected to differ in exactly one place: the version field in the provenance block.
- Migration is idempotent: running it on an already migrated file changes nothing.
- Known limitation: in a legacy comment-only file the tool treats every comment line as part of the request, because that is how legacy parsing behaves. A license or documentation comment will be swept in, so the diff must be reviewed. Existing lines that start with `#?` are handled as described above. If request comments in a legacy file are separated by blank lines and the legacy path accepts that, the 0.2 result would hold more than one request block (EN-E301). The migrator reports this and aborts rather than guess. In every case the body comparison is the final check: if the rebuilt request text does not reproduce the legacy text, or the generated bodies differ, the migrator aborts and leaves the file untouched.

### Generated-file provenance block

Generated files start with a delimited block written in the target's comment syntax (`#` for Python, `//` for JavaScript):

```
# --- generated by codeinenglish 0.5.0 from hello.en (en 0.2) ---
# Regenerating from hello.en overwrites this file.
# --- end generated header ---
```

- The block holds the tool version, the source file name and the EN version label (`legacy` for headerless files). No timestamps, no absolute paths and no source hash, so output stays deterministic.
- Each backend provides `split_provenance(text) -> (block, body)`, using the begin and end sentinel lines. The **body** is everything after the end sentinel.
- The migration safety check compares bodies. The reproducibility test (case 32) still compares whole files, because the same source must produce identical full bytes.
- Source-map line numbers are computed against the full file, since the block adds lines at the top.
- Why not a sidecar file: a self-describing generated file stays useful when copied away from its source, while a sidecar can be lost. See open decision 7.

## 11. Shared implementation

Add one module, `codeinenglish/contract.py`:

```python
@dataclass(frozen=True)
class SourceLine:
    line: int          # 1-based line in the original file
    col_offset: int    # characters before `text` in the original line: indentation, marker, optional space
    text: str          # the line as given to the parser or recognizer, never joined

@dataclass(frozen=True)
class Diagnostic:
    code: str                    # "EN-E205"
    severity: str                # "error" | "warning"
    message: str
    file: str
    line: int                    # 1-based
    column: int                  # 1-based, counted in Unicode code points
    end_line: int
    end_column: int
    hint: str | None = None      # suggested fix, e.g. "target python"
    related: tuple[tuple[int, int], ...] = ()   # e.g. (line, column) of the first target directive

@dataclass(frozen=True)
class SourceContract:
    version: tuple[int, int] | None   # None = legacy
    target: str                       # "python" | "javascript"
    form: str | None                  # "instructions" | "problem"; None if undeterminable
    lines: tuple[SourceLine, ...]     # instruction lines or request lines, boundaries kept
    diagnostics: tuple[Diagnostic, ...]

    @property
    def ok(self) -> bool: ...         # True when no diagnostic has severity "error"

class ENSourceError(Exception):
    diagnostics: tuple[Diagnostic, ...]

def read_contract(source: str, filename: str) -> SourceContract: ...

SUPPORTED_VERSIONS: frozenset[tuple[int, int]] = frozenset({(0, 1), (0, 2)})

# Source version -> next version on its migration path. None = headerless legacy.
# Entries stay after a version leaves SUPPORTED_VERSIONS, so old files keep a path.
MIGRATION_PATHS: dict[tuple[int, int] | None, tuple[int, int]] = {None: (0, 1), (0, 1): (0, 2)}
```

- `interpret_source` consumes a `SourceContract` instead of re-deriving the form and target.
- The CLI, `generate_file` and the VS Code extension all go through it, so they cannot disagree.
- Add `python -m codeinenglish check FILE.en --json` to print the contract, the run plan (below) and diagnostics as JSON. `check` runs the whole front end (contract, then parser or recognizer) but writes nothing. The extension and, later, an LSP server use it for inline diagnostics without re-implementing any rule.

### Diagnostics are data, not control flow

1. `read_contract` never raises because of a problem in the source. It returns diagnostics. It raises only for programming errors. An unreadable file is an ordinary I/O error raised by the caller that opened it.
2. `contract.ok` is false when any diagnostic has severity `error`. In that case `form` and `lines` may be incomplete and must not be used for generation.
3. Every public entry point (`translate`, `solve`, `generate_file`, and the CLI `generate`) checks `ok` first. On failure the API raises `ENSourceError` carrying the diagnostics, and the CLI prints them and exits with code 1. Both happen **before any output file is opened or replaced**.
4. Later stages (parser, recognizer, strategies) report their problems as the same `Diagnostic` type. The mapping is `file line = SourceLine.line` and `file column = SourceLine.col_offset + column within text`. Existing exceptions are wrapped at the boundary, not rewritten.
5. `check --json` and `generate --json` print the one response schema defined in the next section. Exit code 0 means no errors (warnings allowed), 1 means errors, 2 means a usage or I/O problem.
6. Warnings go to stderr in the CLI and are returned in `contract.diagnostics` in the API. They are never written to generated files.
7. Positions are counted in Unicode code points. Conversion to the UTF-16 offsets used by LSP happens at the LSP boundary only.

### Data for editors: the run plan

The VS Code extension must not read `.en` text to decide anything. It asks the CLI, and the CLI answers from the same `SourceContract` the Python API uses. `check --json` and `generate --json` return **one schema**. The only differences are the `written` field and the side effect: `check` never writes and always reports `written: false`, while `generate` writes the output and reports `written: true` only after the atomic write succeeded. A JSON Schema file (`codeinenglish/schema/run_plan.schema.json`) documents the response contract. Python CLI tests assert the contract fields and diagnostics; the VS Code response parser checks required fields and types, and refuses unknown `schema_version` values.

```json
{
  "schema_version": 1,
  "file": "two_sum.en",
  "version": "0.2",
  "supported_versions": ["0.1", "0.2"],
  "target": "python",
  "form": "problem",
  "examples": {"present": true, "count": 2},
  "plan": {
    "output_path": "/abs/path/two_sum.py",
    "runtime": "python",
    "run_examples": true,
    "run_args": ["/abs/path/two_sum.py", "--check-examples"]
  },
  "written": false,
  "diagnostics": []
}
```

| Field | Type | Meaning |
|---|---|---|
| `schema_version` | integer | Version of this response format, starting at 1 |
| `file` | string | The path as given on the command line |
| `version` | string or null | The version header, for example "0.2"; null for legacy files |
| `supported_versions` | array of strings | Members of `SUPPORTED_VERSIONS`, sorted |
| `target` | string | "python" or "javascript" |
| `form` | string or null | "instructions", "problem", or null if it could not be determined |
| `examples` | object | `present` (boolean) and `count` (integer), from the recognizer |
| `plan` | object or null | `output_path`, `runtime`, `run_examples`, and exact `run_args`; null when there are errors |
| `written` | boolean | Whether this command wrote the output file |
| `diagnostics` | array | One object per diagnostic: `code`, `severity`, `message`, `file`, `line`, `column`, `end_line`, `end_column`, `hint` (string or null), `related` (array of `[line, column]` pairs) |

- `version` is `null` for legacy files.
- `examples.present` and `examples.count` come from the recognizer, never from scanning text.
- `plan` is `null` when there are errors. Otherwise it says which file to run, which runtime kind (`python` or `node`), and whether to run the example checker. The extension maps `runtime` to its configured executable.
- `check` reports `output_path` as the file `generate` would write. `generate` reports the file it actually wrote. On any error, `plan` is `null`, `written` is `false` and the exit code is 1, for both commands.
- **Extension flow.** (1) If the document has unsaved edits, save it first. The CLI reads the file on disk, so without this VS Code could generate from different text than the user sees. If saving fails or is cancelled, run nothing and tell the user why. (2) Call `generate --json`. (3) If `written` is false, show the diagnostics at their positions and run nothing. (4) Otherwise execute what `plan` says. Steps 3 and 4 also enforce the stale sibling rule (case 31). Diagnostics for unsaved text while typing would need a `check --stdin` mode, which is out of scope for the first version, so `check --json` runs on save.
- The extension executes `plan.run_args` exactly as returned. It never reads `.en` text to infer an output path, runtime, example presence, or flags.

## 12. Test plan

Fixtures live in `tests/contract/`, each as `name.en` plus `name.expect` (expected diagnostics and, where relevant, expected generated output).

### Header

| # | Input | Expected |
|---|---|---|
| 1 | `en 0.2` then instructions | Parsed as versioned |
| 2 | Comments, then `en 0.2` | Accepted |
| 3 | Instruction line, then `en 0.2` | EN-E101 |
| 4 | `en 0.2` twice | EN-E104 |
| 5 | `en 9.9` | EN-E103 |
| 6 | `en abc` | EN-E102 |
| 7 | Headerless instruction file | Legacy, EN-W401, code body byte-identical to current |
| 8 | Headerless comment-only problem file | Legacy request, EN-W401, code body byte-identical |

### Request marker

| # | Input | Expected |
|---|---|---|
| 9 | One `#?` line | Request recognized |
| 10 | Several contiguous `#?` lines | One request block; lines stay separate, each with its original line number |
| 11 | `#?` blocks separated by a blank line | EN-E301 |
| 12 | Only `# write a program to...` in `en 0.2` | EN-W402 and EN-E305 |
| 13 | `#?` block plus instruction lines | EN-E302 |
| 14 | `#?` with no text | EN-E303 |
| 15 | `#?` inside a string literal | Not a marker |
| 16 | `#?text` versus `#? text` | Identical requests |

### Target

| # | Input | Expected |
|---|---|---|
| 17 | `target javascript` | Accepted |
| 18 | `target python` and `target javascript` | EN-E201, existing output untouched |
| 19 | `target rust` | EN-E202 |
| 20 | `import codeinpython library` in `en 0.2` | EN-E203 |
| 21 | Alias plus `target javascript` in legacy | EN-E201 |
| 22 | `target javascript` inside a `#` comment | Ignored |
| 23 | `target javascript` inside a `#?` block | Request text, not a directive |
| 24 | `target` after an instruction line | EN-E204 |

### Migration

| # | Input | Expected |
|---|---|---|
| 25 | Legacy instruction file to 0.1 | Header added, code body byte-identical |
| 26 | 0.1 problem file to 0.2 | `#?` added, code body byte-identical |
| 27 | Migration whose outputs would differ | Aborts, file untouched |
| 28 | Migrate twice | Second run changes nothing |

### Cross-surface and safety

| # | Check |
|---|---|
| 29 | **Contract parity run.** Every fixture in the corpus, including all edge cases below, goes through the Python API, the CLI (`check --json` and `generate --json`) and the VS Code extension's planning code. The results are compared as normalized JSON: `version`, `supported_versions`, `target`, `form`, `examples`, `plan`, and each diagnostic's code, severity, message, line, column and end position. Any difference fails the build |
| 30 | For every error code, an existing output file is byte-identical before and after |
| 31 | The VS Code Run action never executes a stale sibling `.py` or `.js` after any error |
| 32 | Generating each fixture twice produces byte-identical output (whole file) |

### Added in revision 2

| # | Input | Expected |
|---|---|---|
| 33 | Legacy comment-only problem file with `Example input:` and `Example output:` lines, migrated to 0.2 | The recognizer receives an identical line sequence (text and original line numbers) from both paths |
| 34 | Recognizer error on the third `#?` line | Reported at that file line, identical in API, CLI and `check --json` |
| 35 | `#?text`, `#? text`, an indented line `   #? text` (3 spaces) and a tab-indented line `<tab>#? text`, each with a recognizer error inside the text | Offsets 2, 3, 6 and 4; file columns 3, 4, 7 and 5, as in the section 6 table. A tab counts as one column |
| 36 | `target python` twice | EN-E205, points at the second line and names the first |
| 37 | `import codeinpython library` twice; alias plus `target python` | EN-E205 |
| 38 | `target python` then `target javascript` | EN-E201, not EN-E205 |
| 39 | A legacy file (warning) versus its migrated file | Warnings appear on stderr and in diagnostics only; generated bytes and exit code are unaffected |
| 40 | Migrate 0.1 to 0.2 | Full outputs differ only in the version field of the provenance block; bodies identical |
| 41 | A source with an error, through `generate_file` | Raises `ENSourceError` with the same diagnostics as `check --json`; existing output untouched |
| 42 | `read_contract` on every error fixture | Returns diagnostics and never raises |

### Added in revision 3

| # | Input | Expected |
|---|---|---|
| 43 | `en 0.2` mentioned inside `#?` request text | Request text only; no EN-E101 or EN-E104 |
| 44 | `# en 0.2` as an ordinary comment, both before and after the real header | Ignored |
| 45 | A `#?` block, then `en 0.2` on a later line | EN-E101 at the later line, related to the `#?` line |
| 46 | Headerless file containing `#?` lines | Legacy rules exactly as today (code body byte-identical to current), EN-W401 and EN-W403 |
| 47 | `en 0.2` inside a string literal on an instruction line | Not a version line |
| 48 | Supported set patched to {0.1, 0.3}, file says `en 0.2` | EN-E103 listing "en 0.1, en 0.3", never a range. No hint: 0.2 is not in `MIGRATION_PATHS` and is not newer than the set |
| 49 | File says `en 0.9` with the real supported set | EN-E103 with the upgrade hint; the message lists exactly the generated set |
| 50 | A comment containing `target javascript` in a Python-target file, run through the extension | The extension picks the Python runtime, because it follows `plan`, not the text |
| 51 | Problem file with embedded examples | `examples.present` is true and `count` is correct; the extension runs the example checker only because `plan.run_examples` says so |
| 52 | Supported set patched to {0.2}, file says `en 0.1` (a removed version still in `MIGRATION_PATHS`) | EN-E103 with the migrate hint; `migrate` still reads the file and produces 0.2 |

### Added in revision 4

| # | Input | Expected |
|---|---|---|
| 53 | Headerless comment-only problem file with `target python` and a `#?` line | Legacy rules exactly as today: the recognizer receives the same text as before, including the `?`; code body byte-identical to current; EN-W401 and EN-W403 |
| 54 | Headerless instruction file with `target python` and a `#?` line among the instructions | The line is documentation and is ignored, as today; output byte-identical; EN-W401 and EN-W403 |
| 55 | 0.1 problem file with `# first line` and `#? second line`, migrated to 0.2 | `#? first line` and `#? ? second line`; recognizer input identical to the legacy path, so `? second line` keeps its `?`; code body byte-identical; the dry-run diff lists the rewritten `#?` line |
| 56 | 0.1 instruction file with a `#? note` comment, migrated to 0.2 | `# ? note`; still an instruction file (no EN-E302); code body byte-identical |
| 57 | Fault injection: a migrator variant that drops the `?` or otherwise changes request text | The body comparison aborts and the file is untouched |
| 58 | Legacy comment-only file whose request comments are separated by a blank line, when the legacy path accepts it | The migrator reports that the result would have two request blocks (EN-E301) and aborts; file untouched |
| 59 | `en 0.0` with the real tables | EN-E103 with no hint: not migratable, not newer |
| 60 | `check --json` and `generate --json` on the same fixture | Identical objects except `written` (false versus true); both validate against `run_plan.schema.json` |
| 61 | Extension with a document that has unsaved edits | `save()` is called before `generate --json` is spawned; if saving fails, nothing is spawned and the user is told why |
| 62 | An edit that introduces an error, then Run without a manual save | The error is reported from the saved text; no stale output runs |
| 63 | Extension receives a response with an unknown `schema_version` | It refuses to run and tells the user to update the extension or the package |

## 13. Rollout order

0. **Thin end-to-end slice (acceptance experiment).** Before the full rollout, implement a first cut of `contract.py` that covers (a) the legacy fixtures from `examples/`, unchanged, and (b) one `en 0.2` problem file with embedded examples (the Two Sum example) using `#?` lines, `target python` and the version header. Add `generate --json` and `check --json` with the run plan and the JSON Schema, and switch the VS Code Run action to consume the plan. The slice passes when all of these hold:
   - The legacy fixtures produce byte-identical output.
   - The `en 0.2` fixture reports correct line numbers, columns, `examples.present` and `examples.count`.
   - The extension runs the right file with the right runtime from the plan alone. A test document with misleading text (a comment containing `target javascript`) must not change the result (case 50).
   - A dirty document is saved before generation (case 61).
   - The parity run (case 29) agrees across the API, CLI and extension for these fixtures.
   The slice leaves out the provenance block, the migration tool and deprecation warnings. It is kept as real code, narrow but not throwaway, and steps 1 to 7 widen it.
1. Add `contract.py` and `read_contract` with the legacy rules only; route `interpret_source` through it. All existing tests must still pass with no output changes.
2. Add version parsing and EN-E101 to EN-E104, EN-W401.
3. Add the provenance block (its own commit: it changes every golden file once, deliberately, before any migration compares bodies), `en 0.1` support, the `check --json` and `generate --json` commands with the run plan, and a first contract parity run (case 29) over the legacy fixtures.
4. Add the migrate tool with the byte-comparison safety check; migrate every file in `examples/` to 0.1.
5. Add `en 0.2`: the `#?` marker, EN-E3xx, EN-W402, EN-E203, and target position checks.
6. Migrate the examples to 0.2, update `SPEC.md` and the first-run guide, and switch the VS Code extension to `generate --json` and the run plan so it no longer reads `.en` text. Add the full contract parity run to CI.
7. Ship, start the legacy deprecation clock.

Each step is a separate commit with its tests passing.

## 14. Decisions and deferred work

1. Keep the two-step `en 0.1` then `en 0.2` migration. `en 0.1` is the mechanical compatibility step; `en 0.2` makes problem markers explicit.
2. One request block per file; multiple blocks and mixed instruction/problem files are rejected in `en 0.2`.
3. Directive keywords are case-sensitive lowercase in `en 0.2`; no trailing period is accepted. `en 0.1` keeps the legacy case-folded target behavior.
4. Legacy mode warns for two package minor releases, starting with 0.2.0, and is scheduled for removal in 0.4.0. The removal must be announced in release notes.
5. Versions use MAJOR.MINOR; patch-level language versions are not supported.
6. Use an inline provenance block in generated files. Runtime traceback source maps remain future work.
7. Live diagnostics for unsaved text (`check --stdin` or an LSP server) are deferred; the VS Code run command saves before generation.

---

## Revision log

**Draft 2** (after code review)

1. Request lines are no longer joined. Line boundaries, original line numbers and column offsets are preserved so `Example input:` and `Example output:` parsing keeps working (sections 6 and 11, cases 10 and 33 to 35).
2. Any repeated target directive is an error, even an identical one or a repeated alias, matching the current parser. New code EN-E205; EN-E201 now means a different target (section 7, cases 36 to 38).
3. Generated files carry a delimited provenance block. Migration compares code bodies, not whole files, so adding the version to the metadata does not break the safety check (sections 10 and 13, cases 25, 26, 40).
4. The deprecation window is counted in package minor releases, and warnings never alter generated bytes (section 9, case 39).
5. Diagnostics are structured data with exact positions. `read_contract` returns them, and public entry points raise `ENSourceError` before touching any output (section 11, cases 41 and 42).

**Draft 3** (after second code review)

1. Request-line columns count indentation: `col_offset` includes leading whitespace, the marker and the optional space. Case 35 now covers an indented line and tab indentation (section 6, section 11).
2. Version headers are detected only on standalone non-comment lines, so mentions inside comments, `#?` text or string literals are never version lines. A `#?` line before the header is a misplaced header (EN-E101). A headerless file with `#?` lines keeps exact legacy behavior plus the new warning EN-W403 (sections 4 and 8, cases 43 to 47).
3. The 0.1 row now says the generated code body is unchanged, and that the full file differs only in the provenance version field (section 3).
4. `check --json` and `generate --json` expose version, target, form, examples and a run plan, so VS Code no longer parses `.en` text. Case 29 is now a full contract parity run over the corpus, and cases 50 and 51 test the extension directly (section 11).
5. EN-E103 is generated from an explicit `SUPPORTED_VERSIONS` set, never assumed to be a range (sections 3 and 8, cases 48, 49 and 52).

**Draft 4** (after third code review)

1. One JSON schema for `check --json` and `generate --json`, with a field table, a `schema_version` and a JSON Schema file. `check` always reports `written: false` (section 11, cases 60 and 63).
2. `#?` in legacy files: the marker has no special meaning, and legacy rules alone decide whether the line is documentation or problem text (including the leading `?`). EN-W403 says so, and cases 53 and 54 cover a `target python` file with a `#?` line (sections 4 and 8).
3. EN-E103 hints come from an explicit `MIGRATION_PATHS` table, then a "newer than the set" check, and otherwise give no hint. Non-contiguous sets no longer produce wrong hints (sections 8 and 11, cases 48, 52 and 59).
4. Migration of `#?` lines is specified exactly: request lines are rebuilt from the legacy recognizer text (`#? foo` becomes `#? ? foo`), documentation comments beginning `#?` get a space inserted (`# ? note`), and the body comparison aborts on any difference. Fault injection tests the safety net (section 10, cases 55 to 58).
5. The extension saves a dirty document before generating, and refuses to run if saving fails. Live diagnostics for unsaved text are deferred (section 11, cases 61 and 62).
6. Case 35 now lists the tab-indented expectation (offset 4, file column 5), and the section 6 table has a tab row.
7. Rollout gains step 0, the thin end-to-end slice, with explicit pass criteria (section 13).
