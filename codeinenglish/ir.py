from dataclasses import dataclass
from typing import TypeAlias


@dataclass(frozen=True)
class Literal:
    value: str | int | float | bool | None


@dataclass(frozen=True)
class Name:
    identifier: str


@dataclass(frozen=True)
class Binary:
    left: "Expr"
    operator: str
    right: "Expr"


@dataclass(frozen=True)
class Compare:
    left: "Expr"
    operator: str
    right: "Expr"


Expr: TypeAlias = Literal | Name | Binary | Compare


@dataclass(frozen=True)
class Assign:
    name: str
    value: Expr


@dataclass(frozen=True)
class ReadInput:
    name: str
    prompt: str


@dataclass(frozen=True)
class Display:
    values: list[Expr]


@dataclass(frozen=True)
class If:
    condition: Expr
    body: list["Statement"]
    otherwise: list["Statement"] | None


Statement: TypeAlias = Assign | ReadInput | Display | If


@dataclass(frozen=True)
class Program:
    statements: list[Statement]
