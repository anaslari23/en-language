# JavaScript backend proof plan

Goal: make `target javascript` generate executable `.js` from the same interpreted EN source as `target python`, entirely offline.

1. Extend target parsing and output naming. Keep legacy Python directive. Unknown, duplicate, and conflicting targets fail before output changes.
2. Render a documented shared instruction subset (literal values, assignment, display) and one problem family (ascending numeric sort) from `Program` and `ProblemSpec`. Explicitly reject other constructs/families, preserving existing output.
3. Emit a Node.js stdin/stdout JSON runner for the problem form. Compare Python and JavaScript outputs for identical examples, including duplicates and negative values.
4. Document scope and CLI use in both repositories. Verify all existing Python and VS Code tests plus JS syntax and behavior. Keep no runtime downloads or dependencies.

The first JavaScript backend is deliberately a shared subset. Later work may add constructs and families individually with paired behavior checks.
