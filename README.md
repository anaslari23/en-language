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

Create a `.en` file with the target directive and a problem statement in comments:

```text
target python
# Find two numbers that add up to the target.
# Return their indices. Exactly one solution exists.
# Example input: {"nums":[2,7,11,15],"target":9}
# Example output: [0,1]
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

`target python` selects Python output. When the remaining file contains only `#` comments, those comments form the problem request. When it contains English instructions, comments are documentation. Existing `import codeinpython library` problem files still work. Files without a directive still translate English instructions. The lower-level `translate` and `solve` commands remain available. Generation writes Python but does not execute it; the VS Code **Run** button separately starts generated Python after successful generation.

Inside Python, `import codeinenglish` exposes the package API. To generate from a file, call `codeinenglish.generate_file("program.en")`; importing alone does not act on Python comments.

See [SPEC.md](SPEC.md) for the language contract, supported forms, problem families, and limitations.

## Generate JavaScript for the shared subset

JavaScript output currently supports simple assignments and `show` instructions, plus ascending numeric sort problem requests. For example, `examples/sort_numbers_javascript.en` uses `target javascript` and includes a checked example:

```sh
python3 -m codeinenglish generate examples/sort_numbers_javascript.en
node examples/sort_numbers_javascript.js --check-examples
echo '{"nums":[3,1,3,-2]}' | node examples/sort_numbers_javascript.js
```

The same `.en` comment request with `target python` generates the corresponding Python behavior. Unsupported JavaScript constructs fail clearly before overwriting output. Node.js is needed to run generated JavaScript, but not to generate it.

## VS Code Run button

Install the separate extension from the VSIX built in `vscode-extension/`, then install `codeinenglish` into the Python selected by the extension setting `codeinenglish.pythonPath`. The extension and package are separate: the extension provides the `.en` editor action, while the Python library performs translation and generation.

```sh
cd vscode-extension
npm install
npm test
npm run package
```

In VS Code, choose **Install from VSIX...** from the Extensions view and select the generated `.vsix`. Set `codeinenglish.pythonPath` to the exact interpreter where you installed EN-Library. The extension adds **▶ Run** to `.en` files and calls the unified `generate` command; the directive selects problem solving, and other supported `.en` programs use the instruction translator. See the [extension guide](vscode-extension/README.md).

## Verify the integration

With the package installed into the active interpreter, run:

```sh
python3 scripts/verify_library.py
```

This checks the canonical Greeter and Two Sum examples using temporary output files.
