import keyword
import re

from .errors import CodeInEnglishError
from .expressions import parse_expression
from .ir import Assign, Compare, Display, Expr, If, Name, Program, ReadInput, Statement


_IDENTIFIER = re.compile(r"[A-Za-z_][A-Za-z0-9_]*\Z")
_RESERVED_NAMES = {"input", "print", "str"}


def _split_display(text: str) -> list[str]:
    parts: list[str] = []
    start = 0
    quoted: str | None = None
    escaped = False
    depth = 0
    index = 0
    while index < len(text):
        char = text[index]
        if escaped:
            escaped = False
        elif quoted and char == "\\":
            escaped = True
        elif quoted and char == quoted:
            quoted = None
        elif not quoted and char in ("\"", "'"):
            quoted = char
        elif not quoted and char == "(":
            depth += 1
        elif not quoted and char == ")":
            depth -= 1
        elif not quoted and depth == 0 and text.startswith(" and ", index):
            parts.append(text[start:index].strip())
            index += 4
            start = index
            continue
        index += 1
    parts.append(text[start:].strip())
    return parts


def _validate_expression(expression: Expr, names: set[str], filename: str, line: int) -> None:
    if isinstance(expression, Name):
        if expression.identifier not in names:
            raise CodeInEnglishError(
                filename, line, f"unknown name {expression.identifier!r}", kind="unknown_name"
            )
        return
    if isinstance(expression, Compare):
        _validate_expression(expression.left, names, filename, line)
        if isinstance(expression.right, Name) and expression.right.identifier not in names:
            raise CodeInEnglishError(
                filename,
                line,
                f"{expression.right.identifier!r} could be a missing variable or text; quote the text or define the variable",
                kind="ambiguous",
            )
        _validate_expression(expression.right, names, filename, line)
        return
    if hasattr(expression, "left"):
        _validate_expression(expression.left, names, filename, line)
        _validate_expression(expression.right, names, filename, line)


def _check_name(name: str, filename: str, line: int) -> None:
    if not _IDENTIFIER.fullmatch(name) or keyword.iskeyword(name):
        raise CodeInEnglishError(filename, line, f"{name!r} is not a valid Python variable name")
    if name in _RESERVED_NAMES:
        raise CodeInEnglishError(filename, line, f"{name!r} is reserved by the translator")


def parse_program(source: str, filename: str = "<string>") -> Program:
    """Parse supported English statements into a source-located program IR."""
    statements: list[Statement] = []
    names: set[str] = set()
    block: dict | None = None

    def append(statement: Statement) -> None:
        if block is None:
            statements.append(statement)
        else:
            branch = "otherwise" if block["in_otherwise"] else "body"
            block[branch].append(statement)

    for line_number, original in enumerate(source.splitlines(), start=1):
        line = original.strip()
        if not line or line.startswith("#"):
            continue
        if original != original.lstrip():
            raise CodeInEnglishError(filename, line_number, "unexpected indentation; use 'end if' to close a decision")

        if line.startswith("if "):
            if block is not None:
                raise CodeInEnglishError(filename, line_number, "nested if blocks are not supported", kind="unsupported")
            match = re.fullmatch(r"if\s+(.+)\s+then", line)
            if not match:
                raise CodeInEnglishError(filename, line_number, "use: if condition then")
            condition = parse_expression(match.group(1), filename=filename, line=line_number)
            if not isinstance(condition, Compare):
                raise CodeInEnglishError(filename, line_number, "an if condition must compare two values")
            _validate_expression(condition, names, filename, line_number)
            block = {"condition": condition, "line": line_number, "body": [], "otherwise": None, "in_otherwise": False}
            continue

        if line == "otherwise":
            if block is None:
                raise CodeInEnglishError(filename, line_number, "otherwise without a matching if")
            if block["in_otherwise"]:
                raise CodeInEnglishError(filename, line_number, "only one otherwise is allowed")
            block["in_otherwise"] = True
            block["otherwise"] = []
            continue

        if line == "end if":
            if block is None:
                raise CodeInEnglishError(filename, line_number, "end if without a matching if")
            statements.append(If(block["condition"], block["body"], block["otherwise"]))
            block = None
            continue

        assignment = re.fullmatch(r"(?:set\s+([A-Za-z_][A-Za-z0-9_]*)\s+to|let\s+([A-Za-z_][A-Za-z0-9_]*)\s+be)\s+(.+)", line)
        if assignment:
            name = assignment.group(1) or assignment.group(2)
            expression = parse_expression(assignment.group(3), filename=filename, line=line_number)
            _validate_expression(expression, names, filename, line_number)
            _check_name(name, filename, line_number)
            names.add(name)
            append(Assign(name, expression))
            continue

        read = re.fullmatch(r"ask for your (.+) and call it ([A-Za-z_][A-Za-z0-9_]*)", line)
        if read:
            prompt, name = read.groups()
            if not re.fullmatch(r"[A-Za-z][A-Za-z ]*", prompt):
                raise CodeInEnglishError(filename, line_number, "use words after 'ask for your'")
            _check_name(name, filename, line_number)
            names.add(name)
            append(ReadInput(name, prompt.strip()))
            continue

        if line.startswith("show "):
            raw_values = _split_display(line[5:])
            if not raw_values or any(not value for value in raw_values):
                raise CodeInEnglishError(filename, line_number, "show needs one or more values")
            values = [parse_expression(value, filename=filename, line=line_number) for value in raw_values]
            for value in values:
                _validate_expression(value, names, filename, line_number)
            append(Display(values))
            continue

        if line.startswith(("set ", "let ", "ask ", "if ")):
            raise CodeInEnglishError(filename, line_number, f"malformed instruction {line!r}")
        raise CodeInEnglishError(filename, line_number, f"unrecognized instruction {line!r}", kind="unsupported")

    if block is not None:
        raise CodeInEnglishError(filename, block["line"], "if block needs 'end if'")
    return Program(statements)
