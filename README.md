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

## Generate Python from a problem description

For supported DSA problem types, put the request in comments in a `.en` file. The optional library directive is accepted as shown:

```text
import codeinpython library

# Given a list of numbers and a target,
# return the positions of two numbers that add up to the target.
# Exactly one solution exists and the same position cannot be used twice.
```

Generate the editable Python file with:

```sh
python3 -m codeinenglish solve examples/two_sum_problem.en
```

This creates examples/two_sum_problem.py, containing a two_sum(nums, target) function and a runnable JSON command-line wrapper. Run the generated program with one JSON object on standard input:

```sh
echo '{"nums":[2,7,11,15],"target":9}' | python3 examples/two_sum_problem.py
# prints [0, 1]
```

If examples are included in the .en comments, check them by explicitly running:

```sh
python3 examples/two_sum_problem.py --check-examples
```

solve/solve_file are also available from the Python package. The generator itself never runs its output. Generated comments show the interpreted function contract and mark assumptions as stated or defaulted. Review them before running the file.

The offline recognizer currently covers two-sum indices, duplicate checks, frequency counts, palindrome and anagram checks, binary search, minimum/maximum/sum, first unique character, reverse text, moving zeros to the end, merging sorted lists, maximum contiguous subarray sum, and balanced delimiters. It uses explicit deterministic wording rules and curated strategies, not a model. It cannot understand every free-form English request. If the request is unclear or unsupported, it reports a diagnostic and leaves any prior output intact. See the *_problem.en examples for supported styles.

### Problem examples

Write examples as JSON comment pairs; input keys must match the function arguments and the expected output must be a JSON value:

```text
# Find two numbers that add up to target and return their indices.
# Example input: {"nums":[2,7],"target":9}
# Example output: [0,1]
```

Use --check-examples on the generated file to compare its function result with every embedded example. This check only covers the supplied examples; strategy edge cases are covered by the library's tests, and no finite test set can prove an unseen English sentence was interpreted correctly.

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

Each instruction is on its own line. Blank lines and lines beginning with `#` are ignored. `if` blocks use `otherwise` and `end if`; `for each` loops end with `end for`; class and method blocks use `end class` and `end method`. Indentation is not used. Variable names use Python identifier spelling. `input`, `print`, and `str` are reserved names.

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
- Define classes and methods with `define a class called Greeter`, `define a method called greet with parameter name`, and matching end markers
- Create an instance with `make a Greeter called greeter`; read or set its fields with `greeter.name`
- Return a value from a method with `return name`; call it with `call greeter.greet with "Ada"`

Example:

```text
ask for your name and call it name
if name is "Ada" then
show "Hello Ada"
otherwise
show "Hello there"
end if
```

Nested `if` and `for each` blocks use matching end markers. Class methods receive an implicit `self`; define parameters as English words separated by `and`, without commas. Inheritance, custom constructors, standalone functions, and arbitrary free-form English are not supported yet. Use the documented forms; unsupported or ambiguous instructions return a diagnostic with the filename and line instead of guessing.

## Classes and objects

Classes generate ordinary Python classes. Methods use `self` automatically, and objects can hold fields:

```text
define a class called Greeter
define a method called greet with parameter prefix
return prefix plus self.name
end method
end class
make a Greeter called greeter
set greeter.name to "Ada"
set greeting to call greeter.greet with "Hello "
show greeting
```

This displays `Hello Ada`. An empty class or method is allowed. Methods may return values or be called as standalone instructions.

## Collections and loops

Lists and dictionaries can be created and filled without comma-separated literals. A `for each` loop and nested decisions let you express small algorithms with the same general-purpose features. For example, this Two Sum program is ordinary `.en` source, not a built-in Two Sum shortcut:

```sh
python3 -m codeinenglish translate examples/two_sum.en
```

The example writes Python that displays `[0, 1]`. The grammar currently supports empty list/dictionary creation, list append, item reads and updates, dictionary membership, and list iteration. Functions, return values, and arbitrary free-form English are not supported yet. Unsupported wording produces a diagnostic instead of guessed code.

## Safety and output behavior

Generated Python is a draft for you to inspect and run. The translator validates its syntax before returning or writing it. If translation fails, the input stays unchanged and an existing output file is preserved.
