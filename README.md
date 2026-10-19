# Code in English

Write supported programming instructions in ordinary English in a `.en` file and translate them into editable Python. The translator uses deterministic rules and Python's standard library. It works offline, requires no AI model, and never executes generated code.

## Translate a file

From this folder, run:

```sh
python3 -m codeinenglish translate examples/greeting.en
```

This writes `examples/greeting.py`. Choose another output path with `--output`:

```sh
python3 -m codeinenglish translate examples/greeting.en --output greeting.py
```

Inspect the generated Python before running it:

```sh
cat examples/greeting.py
python3 examples/greeting.py
```

The CLI only translates and writes the `.py` file. It does not run it.

## Use the Python API

```python
from codeinenglish import translate, translate_file

python_source = translate('set answer to 40 plus 2')
output_path = translate_file("examples/greeting.en")
```

`translate` returns Python source as a string. `translate_file` writes a sibling `.py` file by default and returns its path. Both APIs only translate; they do not execute the result.

To install this package without contacting a package index, run:

```sh
python3 -m pip install --no-index --no-build-isolation --no-deps .
```

Running `python3 -m codeinenglish` or `./bin/codeinenglish` from this folder needs no installation.

## Supported English forms

Each instruction is on its own line. Blank lines and lines beginning with `#` are ignored. `if` blocks use `otherwise` and `end if`; `for each` loops end with `end for`. Indentation is not used. Variable names use Python identifier spelling. `input`, `print`, and `str` are reserved names.

- Assign a value: `set age to 20` or `let age be 20`
- Ask for input: `ask for your name and call it name`
- Display a value: `show name` or `show "Hello"`
- Join displayed values without adding a separator: `show "Hello " and name`
- Values: quoted strings, whole or decimal numbers, `true`, `false`, `none`, or a previously defined variable
- Arithmetic: `plus`, `minus`, `times`, and `divided by`; parentheses may group expressions
- Comparisons: `is`, `is not`, `greater than`, and `less than`
- Conditional: `if age is 20 then`, followed by instructions, optional `otherwise` instructions, and `end if`
- Create collections: `make an empty list called nums` or `make an empty dictionary called seen`
- Add to a list: `add number to nums`
- Read or update an item: `seen at key`; `set seen at key to value`
- Check membership: `if key is in seen then`
- Loop over a list: `for each number in nums`, followed by instructions and `end for`
- Nest `if` and `for each` blocks using matching `end if` and `end for` markers

Example:

```text
ask for your name and call it name
if name is "Ada" then
show "Hello Ada"
otherwise
show "Hello there"
end if
```

Nested `if` and `for each` blocks use matching end markers. Functions, return values, and arbitrary free-form English are not supported yet. Use the documented forms; unsupported or ambiguous instructions return a diagnostic with the filename and line instead of guessing.

## Collections and loops

Lists and dictionaries can be created and filled without comma-separated literals. A `for each` loop and nested decisions let you express small algorithms with the same general-purpose features. For example, this Two Sum program is ordinary `.en` source, not a built-in Two Sum shortcut:

```sh
python3 -m codeinenglish translate examples/two_sum.en
```

The example writes Python that displays `[0, 1]`. The grammar currently supports empty list/dictionary creation, list append, item reads and updates, dictionary membership, and list iteration. Functions, return values, and arbitrary free-form English are not supported yet. Unsupported wording produces a diagnostic instead of guessed code.

## Safety and output behavior

Generated Python is a draft for you to inspect and run. The translator validates its syntax before returning or writing it. If translation fails, the input stays unchanged and an existing output file is preserved.
