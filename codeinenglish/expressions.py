import ast
import re

from .errors import CodeInEnglishError
from .ir import Binary, Compare, Contains, Expr, Index, Literal, Name


_TOKEN = re.compile(
    r'\s*(?:'
    r'(?P<string>"(?:\\.|[^"\\])*"|\'(?:\\.|[^\'\\])*\')'
    r'|(?P<number>-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?)'
    r'|(?P<word>[A-Za-z_][A-Za-z0-9_]*)'
    r'|(?P<paren>[()])'
    r')'
)


def _tokens(text: str, filename: str, line: int) -> list[str]:
    text = text.strip()
    result: list[str] = []
    position = 0
    while position < len(text):
        match = _TOKEN.match(text, position)
        if match is None:
            raise CodeInEnglishError(filename, line, f"unsupported expression near {text[position:]!r}")
        result.append(match.group("string") or match.group("number") or match.group("word") or match.group("paren"))
        position = match.end()
    return result


class _ExpressionParser:
    _operators = (
        (("is", "in"), "in", 1),
        (("is", "not"), "!=", 1),
        (("greater", "than"), ">", 1),
        (("less", "than"), "<", 1),
        (("is",), "==", 1),
        (("plus",), "+", 10),
        (("minus",), "-", 10),
        (("times",), "*", 20),
        (("divided", "by"), "/", 20),
    )

    def __init__(self, tokens: list[str], filename: str, line: int):
        self.tokens = tokens
        self.position = 0
        self.filename = filename
        self.line = line

    def parse(self) -> Expr:
        if not self.tokens:
            self._error("expected an expression")
        expression = self._parse_precedence(0)
        if self.position != len(self.tokens):
            self._error(f"unexpected word {self.tokens[self.position]!r}")
        return expression

    def _parse_precedence(self, minimum: int) -> Expr:
        left = self._atom()
        while self.position < len(self.tokens):
            operator = self._operator()
            if operator is None:
                break
            symbol, precedence, width = operator
            if precedence < minimum:
                break
            self.position += width
            right = self._parse_precedence(precedence + 1)
            if symbol == "at":
                left = Index(left, right)
            elif symbol == "in":
                left = Contains(left, right)
            elif precedence == 1:
                left = Compare(left, symbol, right)
            else:
                left = Binary(left, symbol, right)
        return left

    def _operator(self):
        remaining = tuple(token.lower() for token in self.tokens[self.position :])
        if remaining[:1] == ("at",):
            return "at", 30, 1
        for words, symbol, precedence in self._operators:
            if remaining[: len(words)] == words:
                return symbol, precedence, len(words)
        return None

    def _atom(self) -> Expr:
        if self.position >= len(self.tokens):
            self._error("expected a value")
        token = self.tokens[self.position]
        self.position += 1
        if token == "(":
            nested = self._parse_precedence(0)
            if self.position >= len(self.tokens) or self.tokens[self.position] != ")":
                self._error("missing closing parenthesis")
            self.position += 1
            return nested
        if token == ")":
            self._error("unexpected closing parenthesis")
        if token.startswith(("\"", "'")):
            try:
                return Literal(ast.literal_eval(token))
            except (SyntaxError, ValueError) as error:
                raise CodeInEnglishError(self.filename, self.line, "invalid quoted string") from error
        if re.fullmatch(r"-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?", token):
            return Literal(float(token) if "." in token else int(token))
        lowered = token.lower()
        if lowered == "true":
            return Literal(True)
        if lowered == "false":
            return Literal(False)
        if lowered == "none":
            return Literal(None)
        if re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*", token):
            return Name(token)
        self._error(f"unsupported value {token!r}")

    def _error(self, message: str):
        raise CodeInEnglishError(self.filename, self.line, message)


def parse_expression(text: str, *, filename: str, line: int) -> Expr:
    """Parse a documented English value or expression into the translator IR."""
    tokens = _tokens(text, filename, line)
    return _ExpressionParser(tokens, filename, line).parse()
