# Code in English

Code in English lets you write supported instructions or DSA problem statements in `.en` files and generate ordinary Python or JavaScript for review. The language project and interpreter are separate repositories:

- [en-language](https://github.com/anaslari23/en-language) contains the language spec, examples, and VS Code extension.
- [EN-Library](https://github.com/anaslari23/EN-Library) contains the `codeinenglish` Python package and its tests.

The translator is deterministic and offline at runtime. It uses no AI model or runtime dependencies and does not contact a network service. Its English recognition is rule-based and limited to documented forms and problem families; unsupported or ambiguous requests produce a diagnostic.

## Set up the Python library

Install the package into the Python interpreter you plan to use. This GitHub installation needs network access once:

```sh
python3 -m pip install git+https://github.com/anaslari23/EN-Library.git@feat/en-architecture
```

To install from a local EN-Library checkout instead, run `python3 -m pip install .` from that checkout. Once installed, translation and generation work offline.

## Generate Python from a problem statement

Create a versioned `.en` file. In `en 0.2`, a problem request is a contiguous block of `#?` lines; ordinary `#` lines remain documentation:

```text
en 0.2
target python
#? Find two numbers that add up to the target.
#? Return their indices. Exactly one solution exists.
#? Example input: {"nums":[2,7,11,15],"target":9}
#? Example output: [0,1]
```

Generate an editable sibling `.py` file:

```sh
python3 -m codeinenglish generate examples/two_sum_problem.en
```

This writes `examples/two_sum_problem.py`. For the JSON input below, it prints `[0, 1]`.

Check its embedded examples and run it with JSON input:

```sh
python3 examples/two_sum_problem.py --check-examples
echo '{"nums":[2,7,11,15],"target":9}' | python3 examples/two_sum_problem.py
```

Use the same command for an instruction-style program such as `examples/greeter.en`:

```sh
python3 -m codeinenglish generate examples/greeter.en
```

`target python` selects Python output; omitting the target defaults to Python. In `en 0.2`, only `#?` lines form a problem request and ordinary comments are ignored. Headerless and `en 0.1` files keep legacy behavior and receive a deprecation warning. The legacy `import codeinpython library` alias is accepted only in those legacy forms. Use `python3 -m codeinenglish check FILE.en --json` to inspect the contract without writing, or `python3 -m codeinenglish migrate FILE.en` to preview a safe migration (`--write` applies it after checking generated-code equivalence). The lower-level `translate` and `solve` commands remain available. Generation writes code but does not execute it; the VS Code **Run** button runs generated code only after successful generation.

Inside Python, `import codeinenglish` exposes the package API. To generate from a file, call `codeinenglish.generate_file("program.en")`; importing alone does not act on Python comments.

See [SPEC.md](SPEC.md) for the language contract, supported forms, problem families, and limitations.

## Generate JavaScript for the shared subset

JavaScript output currently supports simple assignments and `show` instructions, plus ascending numeric sort problem requests. For example, `examples/sort_numbers_javascript.en` uses `target javascript` and includes a checked example:

```sh
python3 -m codeinenglish generate examples/sort_numbers_javascript.en
node examples/sort_numbers_javascript.js --check-examples
echo '{"nums":[3,1,3,-2]}' | node examples/sort_numbers_javascript.js
```

The same `en 0.2` `#?` request with `target python` generates the corresponding Python behavior. Unsupported JavaScript constructs fail clearly before overwriting output. Node.js is needed to run generated JavaScript, but not to generate it.

## VS Code Run button

Install the separate extension from the VSIX built in `vscode-extension/`, then install `codeinenglish` into the Python selected by the extension setting `codeinenglish.pythonPath`. The extension and package are separate: the extension provides the `.en` editor action, while the Python library performs translation and generation.

```sh
cd vscode-extension
npm install
npm test
npm run package
```

In VS Code, choose **Install from VSIX...** from the Extensions view and select the generated `.vsix`. Set `codeinenglish.pythonPath` to the exact interpreter where you installed EN-Library. The extension adds **▶ Run** to `.en` files, saves the current document, calls `generate --json`, and runs only the exact plan returned by the CLI. The extension does not parse source directives itself. See the [extension guide](vscode-extension/README.md).

## Other editors

The CLI works from any editor with a terminal or external-tool command. Open the folder containing your `.en` file, then run `python3 -m codeinenglish generate PATH/TO/FILE.en`. Run the generated `.py` with Python or `.js` with Node.js. The interpreter runs locally after installation; an editor plugin is only a shortcut for these commands.

## Verify the integration

With the package installed into the active interpreter, run:

```sh
python3 scripts/verify_library.py
```

This checks the canonical Greeter and Two Sum examples using temporary output files.
