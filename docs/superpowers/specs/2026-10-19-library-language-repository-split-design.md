# Python Library and EN Language Repository Split

## Goal

Separate the importable Python implementation from the `.en` language project while keeping one translator implementation. `anaslari23/EN-Library` becomes the source repository for the `codeinenglish` Python package. `anaslari23/en-language` remains the home for the language definition and user-facing `.en` experience.

The library remains pure Python, offline, and free of runtime dependencies or AI models. Its package and import name is `codeinenglish`.

## Repository ownership

### EN-Library

Owns the Python distribution and its implementation:

- `codeinenglish/` package, including the parser, recognizers, Python generator, file APIs, and CLI.
- `pyproject.toml`, build backend, package README, and release/version metadata.
- Unit tests for the Python package and its command-line behavior, using self-contained `.en` fixtures under `tests/fixtures/` so the package suite does not require the language repository.
- Public import interface: `import codeinenglish`; exported functions remain `translate`, `translate_file`, `solve`, and `solve_file`, plus `CodeInEnglishError`.

### en-language

Owns the language product and its user-facing materials:

- `SPEC.md` and language design/usage documentation.
- `.en` examples and sample `.py` output where useful.
- The VS Code extension, its tests, and local VSIX build/install instructions.
- Integration smoke checks showing that the installed `codeinenglish` package processes representative `.en` examples.

The translator package and Python package unit tests move out of `en-language`; the repository must not keep a second implementation copy. The language repository may document or run the external package, but must not vendor its runtime source. Its canonical `.en` examples remain here; a small independent set of test fixtures may live under the library tests.

## Interface and usage

The package import remains `codeinenglish`. Existing Python APIs are preserved:

```python
import codeinenglish

python_source = codeinenglish.translate('show "Hello"')
output_path = codeinenglish.solve_file("examples/two_sum_problem.en")
```

The command-line interface remains:

```sh
python -m codeinenglish translate program.en
python -m codeinenglish solve problem.en
```

The VS Code extension remains in `en-language`. It invokes the installed package using the configured Python executable. It does not contain or duplicate the translator implementation. Its setup documentation must tell users to install EN-Library into the same interpreter configured by `codeinenglish.pythonPath` before running `.en` files. Installing the extension alone is not sufficient.

No PyPI publication is included in this split. Until a separate publication is requested and prepared, installation guidance may use a local checkout or the Git repository after its packaging is verified.

## Migration approach

1. Populate the currently empty EN-Library repository from the tested package implementation, preserving its module and import names, CLI, Python-version floor, and offline guarantees.
2. Verify the package builds, installs into an isolated environment, can be imported as `codeinenglish`, and passes its complete Python suite.
3. Update en-language docs and the VS Code extension guide to install/use EN-Library; add integration smoke checks against the canonical `.en` examples.
4. Remove the package implementation, package build files, and package-specific unit tests from en-language only after EN-Library is verified. Retain language specs, examples, extension, and integration checks there.
5. Verify the two repositories independently and verify the documented end-to-end workflow across them.

Because the existing en-language workspace has local changes newer than the GitHub default branch, migration must preserve the current workspace state rather than replace it with the remote snapshot. EN-Library is currently an empty public repository on `main`.

## Constraints

- Keep one maintained copy of the translator implementation.
- Preserve `import codeinenglish`, the `codeinenglish` command, current Python APIs, `.en` syntax, and generated Python behavior.
- Keep the translator offline and standard-library-only at runtime.
- The VS Code extension may call the installed package but may not embed its source.
- Do not claim support for unrestricted English; report unsupported or ambiguous prompts clearly.
- Do not publish to PyPI or the VS Code Marketplace as part of repository separation.

## Acceptance criteria

- EN-Library can be installed in an isolated Python environment and `import codeinenglish` works.
- `translate`, `translate_file`, `solve`, and `solve_file` remain available with their current behavior.
- The package CLI works outside the repository after installation.
- EN-Library's package and tests pass without requiring en-language to be cloned.
- en-language contains the `.en` language specification, examples, VS Code integration, and integration checks, but no duplicate translator package or package build backend.
- The VS Code guide clearly explains that the package and extension are separate installations and must use the same Python interpreter.
- Example `.en` files from en-language translate/solve successfully when the EN-Library package is installed.
