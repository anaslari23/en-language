# Distribution readiness plan

**Goal:** Make the offline interpreter usable from an editor or clean Python environment, while keeping public release as a separate step.

- [x] Keep `python -m codeinenglish generate FILE.en` as the editor-independent entry point and document it for terminal/external-tool use.
- [x] Package the existing VS Code extension as a VSIX, install it locally, configure the project interpreter, and click **▶ Run** on a JavaScript-target example. The live terminal reported `All 1 examples passed.`
- [x] Build and inspect the wheel. It contains runtime modules, metadata, entry point, and RECORD without test or Node files. Install that exact wheel outside the checkout and run Greeter, Two Sum, and JavaScript sorting examples.
- [x] Run 123 Python tests under 3.10, 3.11, 3.12, 3.13, and 3.14. Run 23 extension tests and generate/check all 21 `.en` examples.
- [x] Prepare separate package and extension release checklists. PyPI and Marketplace publication have not occurred.

**Release boundary:** GitHub branch installation and local VSIX installation work now. Public `pip install codeinenglish` and Marketplace installation need a release of reviewed artifacts.
