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


@dataclass(frozen=True)
class Index:
    collection: "Expr"
    index: "Expr"


@dataclass(frozen=True)
class Contains:
    item: "Expr"
    collection: "Expr"


Expr: TypeAlias = Literal | Name | Binary | Compare | Index | Contains


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


@dataclass(frozen=True)
class CreateList:
    name: str


@dataclass(frozen=True)
class CreateDictionary:
    name: str


@dataclass(frozen=True)
class Append:
    collection: str
    value: Expr


@dataclass(frozen=True)
class SetItem:
    collection: str
    index: Expr
    value: Expr


@dataclass(frozen=True)
class ForEach:
    name: str
    collection: Expr
    body: list["Statement"]


Statement: TypeAlias = Assign | ReadInput | Display | If | CreateList | CreateDictionary | Append | SetItem | ForEach


@dataclass(frozen=True)
class Program:
    statements: list[Statement]
