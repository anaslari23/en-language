import ast
import tempfile
import unittest
from pathlib import Path

from codeinenglish import CodeInEnglishError, translate, translate_file


class TranslateTests(unittest.TestCase):
    def test_translates_source_to_python(self):
        self.assertEqual(translate("set answer to 42"), "answer = 42")

    def test_source_filename_is_used_in_diagnostics(self):
        with self.assertRaises(CodeInEnglishError) as caught:
            translate("show missing", filename="problem.en")
        self.assertEqual(caught.exception.filename, "problem.en")
        self.assertEqual(caught.exception.line, 1)

    def test_assignment_phrase_aliases_generate_equivalent_python(self):
        set_form = ast.dump(ast.parse(translate("set answer to 40 plus 2")))
        let_form = ast.dump(ast.parse(translate("let answer be 40 plus 2")))
        self.assertEqual(set_form, let_form)


class TranslateFileTests(unittest.TestCase):
    def test_default_and_explicit_output_paths(self):
        with tempfile.TemporaryDirectory() as directory:
            source = Path(directory) / "program.en"
            source.write_text("set answer to 42", encoding="utf-8")
            self.assertEqual(translate_file(source), source.with_suffix(".py"))
            self.assertEqual(source.with_suffix(".py").read_text(encoding="utf-8"), "answer = 42\n")
            explicit = Path(directory) / "other.py"
            self.assertEqual(translate_file(source, explicit), explicit)
            self.assertEqual(explicit.read_text(encoding="utf-8"), "answer = 42\n")

    def test_preserves_source_and_existing_output_on_translation_failure(self):
        with tempfile.TemporaryDirectory() as directory:
            source = Path(directory) / "program.en"
            output = Path(directory) / "program.py"
            source.write_text("show missing", encoding="utf-8")
            output.write_text("old code", encoding="utf-8")
            with self.assertRaises(CodeInEnglishError):
                translate_file(source)
            self.assertEqual(source.read_text(encoding="utf-8"), "show missing")
            self.assertEqual(output.read_text(encoding="utf-8"), "old code")

    def test_rejects_same_input_and_output_path(self):
        with tempfile.TemporaryDirectory() as directory:
            source = Path(directory) / "program.en"
            source.write_text("set answer to 42", encoding="utf-8")
            with self.assertRaises(CodeInEnglishError):
                translate_file(source, source)
            self.assertEqual(source.read_text(encoding="utf-8"), "set answer to 42")

    def test_missing_source_does_not_replace_existing_output(self):
        with tempfile.TemporaryDirectory() as directory:
            source = Path(directory) / "missing.en"
            output = Path(directory) / "program.py"
            output.write_text("old code", encoding="utf-8")
            with self.assertRaises(FileNotFoundError):
                translate_file(source, output)
            self.assertEqual(output.read_text(encoding="utf-8"), "old code")

    def test_generated_source_parses(self):
        source = translate('set value to 1 plus 2\nshow value')
        ast.parse(source)


if __name__ == "__main__":
    unittest.main()
