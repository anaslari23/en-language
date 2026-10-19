# Code in English

Code in English lets you write supported instructions or DSA problem statements in `.en` files and generate ordinary Python for review. The language project and Python translator are separate repositories:

- [en-language](https://github.com/anaslari23/en-language) contains the language spec, examples, and VS Code extension.
- [EN-Library](https://github.com/anaslari23/EN-Library) contains the `codeinenglish` Python package and its tests.

The translator is deterministic and offline at runtime. It uses no AI model or runtime dependencies, does not contact a network service, and never executes generated code. Its English recognition is rule-based and limited to documented forms and problem families; unsupported or ambiguous requests produce a diagnostic.

## Set up the Python library

Install the package into the Python interpreter you plan to use. This GitHub installation needs network access once:

```sh
python3 -m pip install git+https://github.com/anaslari23/EN-Library.git
```

To install from a local EN-Library checkout instead, run `python3 -m pip install .` from that checkout. Once installed, translation and generation work offline.

## Generate Python from a problem statement

Create a `.en` file with the library directive and a problem statement in comments:

```text
import codeinpython library
# Find two numbers that add up to the target.
# Return their indices. Exactly one solution exists.
# Example input: {"nums":[2,7,11,15],"target":9}
# Example output: [0,1]
```

Generate an editable sibling `.py` file:

```sh
python3 -m codeinenglish solve examples/two_sum_problem.en
```

Check its embedded examples and run it with JSON input:

```sh
python3 examples/two_sum_problem.py --check-examples
echo '{"nums":[2,7,11,15],"target":9}' | python3 examples/two_sum_problem.py
```

The generator writes Python but does not execute it. Review the generated file before running it. For supported programming instructions rather than a DSA problem, use `python3 -m codeinenglish translate program.en`.

See [SPEC.md](SPEC.md) for the language contract, supported forms, problem families, and limitations.

## VS Code Run button

Install the separate extension from the VSIX built in `vscode-extension/`, then install `codeinenglish` into the Python selected by the extension setting `codeinenglish.pythonPath`. The extension and package are separate: the extension provides the `.en` editor action, while the Python library performs translation and generation.

```sh
cd vscode-extension
npm install
npm test
npm run package
```

In VS Code, choose **Install from VSIX...** from the Extensions view and select the generated `.vsix`. Set `codeinenglish.pythonPath` to the exact interpreter where you installed EN-Library. The extension then adds **▶ Run** to `.en` files. See the [extension guide](vscode-extension/README.md).

## Verify the integration

With the package installed into the active interpreter, run:

```sh
python3 scripts/verify_library.py
```

This checks the canonical Greeter and Two Sum examples using temporary output files.
