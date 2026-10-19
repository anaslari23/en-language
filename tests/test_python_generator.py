import ast
import unittest

from codeinenglish.ir import Assign, Binary, Compare, Display, If, Literal, Name, Program, ReadInput
from codeinenglish.python_generator import generate_python


class GeneratePythonTests(unittest.TestCase):
    def assert_python_equal(self, actual, expected):
        self.assertEqual(ast.dump(ast.parse(actual)), ast.dump(ast.parse(expected)))

    def test_generates_assignments_and_input(self):
        program = Program([Assign("age", Literal(18)), ReadInput("name", "name")])
        self.assert_python_equal(generate_python(program), "age = 18\nname = input('Your name: ')")

    def test_generates_display_and_arithmetic(self):
        program = Program([
            Assign("total", Binary(Literal(2), "+", Binary(Literal(3), "*", Literal(4)))),
            Display([Literal("total: "), Name("total")]),
        ])
        self.assert_python_equal(
            generate_python(program),
            "total = 2 + 3 * 4\nprint(str('total: ') + str(total))",
        )

    def test_generates_comparison_and_conditional(self):
        program = Program([
            If(Compare(Name("age"), ">", Literal(18)), [Display([Literal("adult")])], [Display([Literal("child")])])
        ])
        self.assert_python_equal(
            generate_python(program),
            "if age > 18:\n    print('adult')\nelse:\n    print('child')",
        )

    def test_empty_conditional_branches_emit_pass(self):
        program = Program([If(Compare(Name("age"), "==", Literal(18)), [], [])])
        self.assert_python_equal(generate_python(program), "if age == 18:\n    pass\nelse:\n    pass")

    def test_omits_else_when_there_is_no_otherwise_marker(self):
        program = Program([If(Compare(Name("age"), ">", Literal(18)), [Display([Literal("adult")])], None)])
        self.assert_python_equal(generate_python(program), "if age > 18:\n    print('adult')")

    def test_generated_source_is_valid_python(self):
        source = generate_python(Program([Assign("answer", Literal(42))]))
        ast.parse(source)


if __name__ == "__main__":
    unittest.main()
