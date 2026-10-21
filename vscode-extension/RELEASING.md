# VS Code extension release checklist

The locally installable VSIX is built from this directory with `npm ci && npm test && npm run package`. It is not yet a Marketplace release.

Before publishing:

1. Confirm `package.json` and `package-lock.json` agree on version. Check the publisher identifier and Marketplace listing details.
2. Inspect the VSIX contents. It should contain the manifest, README, and `src/` runtime only; `node_modules/`, tests, and private files stay out.
3. Install the VSIX into a clean VS Code profile. Configure `codeinenglish.pythonPath` to a Python interpreter with EN-Library installed. Click **▶ Run** on a Python-target and a JavaScript-target example; verify terminal output and that generation failure does not execute stale output.
4. Publish the exact verified VSIX only after the package release is ready. Record the VSIX hash, extension version, compatible EN-Library version, and release date.
