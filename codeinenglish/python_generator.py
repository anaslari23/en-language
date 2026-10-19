import ast

from .errors import CodeInEnglishError
from .ir import Assign, Binary, Compare, Display, Expr, If, Literal, Name, Program, ReadInput, Statement


_BINARY_OPERATORS = {
    "+": ast.Add,
    "-": ast.Sub,
    "*": ast.Mult,
    "/": ast.Div,
}
_COMPARISON_OPERATORS = {
    "==": ast.Eq,
    "!=": ast.NotEq,
    ">": ast.Gt,
    "<": ast.Lt,
}


def _expression(node: Expr) -> ast.expr:
    if isinstance(node, Literal):
        return ast.Constant(value=node.value)
    if isinstance(node, Name):
        return ast.Name(id=node.identifier, ctx=ast.Load())
    if isinstance(node, Binary):
        return ast.BinOp(
            left=_expression(node.left),
            op=_BINARY_OPERATORS[node.operator](),
            right=_expression(node.right),
        )
    if isinstance(node, Compare):
        return ast.Compare(
            left=_expression(node.left),
            ops=[_COMPARISON_OPERATORS[node.operator]()],
            comparators=[_expression(node.right)],
        )
    raise TypeError(f"unsupported expression IR node: {type(node).__name__}")


def _call(name: str, arguments: list[ast.expr]) -> ast.Call:
    return ast.Call(func=ast.Name(id=name, ctx=ast.Load()), args=arguments, keywords=[])


def _statements(nodes: list[Statement]) -> list[ast.stmt]:
    result: list[ast.stmt] = []
    for node in nodes:
        if isinstance(node, Assign):
            result.append(
                ast.Assign(
                    targets=[ast.Name(id=node.name, ctx=ast.Store())],
                    value=_expression(node.value),
                )
            )
        elif isinstance(node, ReadInput):
            prompt = ast.Constant(value=f"Your {node.prompt}: ")
            result.append(
                ast.Assign(
                    targets=[ast.Name(id=node.name, ctx=ast.Store())],
                    value=_call("input", [prompt]),
                )
            )
        elif isinstance(node, Display):
            if len(node.values) == 1:
                value = _expression(node.values[0])
            else:
                value = ast.BinOp(
                    left=_call("str", [_expression(node.values[0])]),
                    op=ast.Add(),
                    right=_call("str", [_expression(node.values[1])]),
                )
                for part in node.values[2:]:
                    value = ast.BinOp(left=value, op=ast.Add(), right=_call("str", [_expression(part)]))
            result.append(ast.Expr(value=_call("print", [value])))
        elif isinstance(node, If):
            otherwise = _statements(node.otherwise) if node.otherwise is not None else []
            result.append(
                ast.If(
                    test=_expression(node.condition),
                    body=_statements(node.body) or [ast.Pass()],
                    orelse=otherwise or ([ast.Pass()] if node.otherwise is not None else []),
                )
            )
        else:
            raise TypeError(f"unsupported statement IR node: {type(node).__name__}")
    return result


def generate_python(program: Program) -> str:
    """Generate and syntax-check Python source from a program IR."""
    module = ast.fix_missing_locations(ast.Module(body=_statements(program.statements), type_ignores=[]))
    source = ast.unparse(module)
    try:
        ast.parse(source)
    except SyntaxError as error:
        raise CodeInEnglishError("<generated>", error.lineno or 1, "generated Python is invalid") from error
    return source
