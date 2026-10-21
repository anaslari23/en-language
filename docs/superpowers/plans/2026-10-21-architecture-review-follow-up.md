# Architecture review follow-up plan

## Decisions

1. **One backend IR.** Keep `ProblemSpec` as the intent/requirements result of English recognition, then lower each supported strategy into a target-neutral `Program`. Backends and the reference evaluator consume `Program`, never `ProblemSpec`. Do not force algorithms into the current IR unchanged: first extend it with explicit control flow, collection and string operations, function calls, and problem input/output semantics. Remove Python AST construction from problem strategies. This avoids a renderer per family and provides an interpreter-based conformance oracle.
2. **Explicit problem marker.** New source versions use `#?` to begin a problem request. A plain `#` comment is documentation. Legacy directive files retain their old request semantics under the compatibility version; no heuristic should silently reinterpret ordinary comments.
3. **Source language version.** Add `en 0.1` as a first-line header. A missing header means legacy 0.1 during migration. Define 0.2 for the explicit-marker contract. Unknown versions fail with a source-located diagnostic. Document deprecation: announce a removal at least one language-version step ahead; retain a compatibility parser for the announced transition period.
4. **Package naming.** Keep the Python import module `codeinenglish` and distribution candidate `codeinenglish` distinct in docs and metadata. Direct PyPI JSON lookups on 2026-10-21 returned 404 for both `en` and `codeinenglish`; this confirms no published project records at lookup time, not a guarantee that either name can be registered. Recheck during release creation. Do not choose the generic `en` name.
5. **Generated source mapping.** Generated code carries a header naming the source file and EN language version. Emit a sidecar source map from generated ranges to source line/block locations and make runtime diagnostics translate traceback locations through that map. Define atomic behavior for code plus map before implementation.
6. **Reproducibility.** Generate the same source twice and compare output bytes. This is now covered for instruction and problem files.
7. **Terminology.** Call the user-facing tool a translator/compiler because its normal action emits source. Reserve “reference interpreter” for executing the target-neutral IR in tests or an explicitly requested run mode.
8. **Corpus independence.** Label the current repository tests a maintainer-authored regression corpus. Do not call it independent or publish its pass rate as user coverage. Before making an external-understanding claim, collect a separate held-out prompt set from at least three people who did not write the recognizer; record their prompts before implementation sees expected labels.

## Execution order

### A. Lock the source contract

- [x] Specify `en 0.1`, legacy headerless behavior, `en 0.2`, target selection, and the `#?` problem marker in `SPEC.md`.
- [x] Add compatibility and deprecation policy and examples for plain documentation comments versus problem requests in `SPEC.md`.
- [ ] Reject unknown language versions and malformed request markers with filename and line.
- [ ] Keep existing headerless and legacy directive examples passing during migration.

### B. Replace dual backend semantics with one IR

- [x] Inventory all existing instruction IR nodes and all 16 problem strategies; implementation still needs to extend the IR and lower every strategy.
- [ ] Design the minimum typed IR needed to represent each strategy without Python AST nodes or Python-only builtins.
- [ ] Add a reference evaluator for the IR, including the problem JSON input/output harness.
- [ ] Lower each `ProblemSpec` plus its selected strategy to `Program`; preserve stated constraints, defaults, and examples as metadata.
- [ ] Refactor Python generation and JavaScript generation to accept `Program` only. Remove `ProblemSpec`-specific branches from renderers.
- [ ] For every supported problem, compare reference-evaluator results with Python and JavaScript generated program results over examples and boundary cases.
- [ ] Add a new backend only after all current problem families lower to the shared IR.

### C. Improve generated-code diagnostics

- [ ] Add deterministic generated-file headers containing the source path and EN source version.
- [ ] Define and emit a line map for generated blocks and problem strategies.
- [ ] Report runtime locations in terms of the `.en` source and original problem block; show generated location only as secondary detail.
- [ ] Write code and its map atomically, and preserve prior outputs if either write fails.

### D. Separate self-tests from user evidence

- [x] Add byte-for-byte repeat-generation checks for both instruction and problem sources.
- [x] Document the current prompt corpus as a maintainer regression corpus, not an independent benchmark, in `SPEC.md` and the roadmap.
- [ ] Prepare a simple contribution template and have at least three external testers supply prompts for a held-out evaluation before publishing understanding/coverage claims.

### E. Distribution name and terminology

- [x] Check PyPI JSON records for `en` and `codeinenglish` before the next release cycle.
- [x] Document the import module and distribution candidate separately in `SPEC.md`.
- [x] Update `SPEC.md` and roadmap terminology to call source generation compilation and reserve “reference evaluator” for IR execution.
- [ ] Recheck PyPI name registration at release creation; JSON 404 is not a reservation.

## Acceptance criteria

- Plain comments cannot trigger problem solving in the new source version.
- Each strategy lowers to the same `Program` consumed by every backend and the reference evaluator.
- No backend imports or consumes `ProblemSpec` or Python AST from a problem strategy.
- For every documented problem family, reference, Python, and JavaScript results agree on accepted examples and boundary cases.
- Generated output is byte-for-byte reproducible and diagnostics map to the `.en` source.
- Documentation distinguishes self-authored regression tests from held-out prompts written by independent testers.
