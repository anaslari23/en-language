import unittest

from codeinenglish.errors import CodeInEnglishError
from codeinenglish.expressions import parse_expression
from codeinenglish.ir import Binary, Compare, Literal, Name


class ParseExpressionTests(unittest.TestCase):
    def parse(self, text):
        return parse_expression(text, filename="sample.en", line=7)

    def test_parses_literals_and_names(self):
        self.assertEqual(self.parse('"salt and pepper"'), Literal("salt and pepper"))
        self.assertEqual(self.parse("42"), Literal(42))
        self.assertEqual(self.parse("2.5"), Literal(2.5))
        self.assertEqual(self.parse("true"), Literal(True))
        self.assertEqual(self.parse("false"), Literal(False))
        self.assertEqual(self.parse("none"), Literal(None))
        self.assertEqual(self.parse("total"), Name("total"))

    def test_parses_arithmetic_precedence(self):
        self.assertEqual(
            self.parse("2 plus 3 times 4"),
            Binary(Literal(2), "+", Binary(Literal(3), "*", Literal(4))),
        )

    def test_parses_parentheses(self):
        self.assertEqual(
            self.parse("(2 plus 3) times 4"),
            Binary(Binary(Literal(2), "+", Literal(3)), "*", Literal(4)),
        )

    def test_ignores_surrounding_expression_whitespace(self):
        self.assertEqual(self.parse("  2 plus 3  "), Binary(Literal(2), "+", Literal(3)))

    def test_parses_comparison_words(self):
        self.assertEqual(self.parse("age is 18"), Compare(Name("age"), "==", Literal(18)))
        self.assertEqual(self.parse("age is not 18"), Compare(Name("age"), "!=", Literal(18)))
        self.assertEqual(self.parse("age greater than 18"), Compare(Name("age"), ">", Literal(18)))
        self.assertEqual(self.parse("age less than 18"), Compare(Name("age"), "<", Literal(18)))

    def test_malformed_expression_has_source_location(self):
        with self.assertRaises(CodeInEnglishError) as caught:
            self.parse("2 plus")
        self.assertEqual(caught.exception.filename, "sample.en")
        self.assertEqual(caught.exception.line, 7)


if __name__ == "__main__":
    unittest.main()
