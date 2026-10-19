import unittest

from codeinenglish.errors import CodeInEnglishError
from codeinenglish.ir import Assign, Binary, Compare, Display, If, Literal, Name, Program, ReadInput
from codeinenglish.parser import parse_program


class ParseProgramTests(unittest.TestCase):
    def parse(self, source):
        return parse_program(source, "sample.en")

    def test_parses_assign_aliases_and_reads(self):
        program = self.parse('set age to 18\nlet total be age plus 2\nask for your name and call it name')
        self.assertEqual(
            program,
            Program([
                Assign("age", Literal(18)),
                Assign("total", Binary(Name("age"), "+", Literal(2))),
                ReadInput("name", "name"),
            ]),
        )

    def test_splits_display_and_outside_quoted_text(self):
        program = self.parse('set name to "Ada"\nshow "Hello and " and name')
        self.assertEqual(program.statements[-1], Display([Literal("Hello and "), Name("name")]))

    def test_parses_if_and_otherwise(self):
        program = self.parse('set age to 18\nif age is 18 then\nshow "yes"\notherwise\nshow "no"\nend if')
        self.assertEqual(
            program.statements[-1],
            If(Compare(Name("age"), "==", Literal(18)), [Display([Literal("yes")])], [Display([Literal("no")])]),
        )

    def test_allows_empty_if_branch(self):
        program = self.parse("set age to 1\nif age is 1 then\nend if")
        self.assertEqual(program.statements[-1], If(Compare(Name("age"), "==", Literal(1)), [], None))

    def test_preserves_an_explicit_empty_otherwise_branch(self):
        program = self.parse("set age to 1\nif age is 1 then\notherwise\nend if")
        self.assertEqual(program.statements[-1], If(Compare(Name("age"), "==", Literal(1)), [], []))

    def test_rejects_nested_conditionals(self):
        with self.assertRaises(CodeInEnglishError) as caught:
            self.parse("set age to 1\nif age is 1 then\nif age is 1 then")
        self.assertEqual(caught.exception.kind, "unsupported")
        self.assertEqual(caught.exception.line, 3)

    def test_reports_unknown_name(self):
        with self.assertRaises(CodeInEnglishError) as caught:
            self.parse("show missing")
        self.assertEqual(caught.exception.kind, "unknown_name")
        self.assertEqual((caught.exception.filename, caught.exception.line), ("sample.en", 1))

    def test_reports_ambiguous_unquoted_comparison_word(self):
        with self.assertRaises(CodeInEnglishError) as caught:
            self.parse("set status to 1\nif status is ready then\nend if")
        self.assertEqual(caught.exception.kind, "ambiguous")
        self.assertIn("quote", caught.exception.message)

    def test_rejects_unclosed_and_unmatched_blocks(self):
        for source, line in (("set age to 1\nif age is 1 then", 2), ("end if", 1), ("otherwise", 1)):
            with self.subTest(source=source), self.assertRaises(CodeInEnglishError) as caught:
                self.parse(source)
            self.assertEqual(caught.exception.line, line)

    def test_rejects_duplicate_otherwise(self):
        with self.assertRaises(CodeInEnglishError):
            self.parse("set age to 1\nif age is 1 then\notherwise\notherwise\nend if")

    def test_unknown_instruction_has_category_and_line(self):
        with self.assertRaises(CodeInEnglishError) as caught:
            self.parse("make a website")
        self.assertEqual(caught.exception.kind, "unsupported")
        self.assertEqual(caught.exception.line, 1)


if __name__ == "__main__":
    unittest.main()
