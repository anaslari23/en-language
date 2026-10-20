# Code in English Design

## Product goal

Code in English is an offline, English-first way for people without programming experience to get editable Python code. The project already contains a pure-Python translator and `.en` source format; extend that repository rather than creating a separate DSA product.

The long-term language goal is to express general programming logic in English with capabilities comparable to Python. The initial user workflow is narrower: a person places a DSA problem statement in an `.en` file as comments and Code in English generates a Python solution that they can inspect, copy into a `.py` file, and run.

The tool uses no AI model, network service, downloaded data, or runtime dependency. It never executes generated Python.

## User workflow

An `.en` file may contain a library declaration and a problem statement in comments:

```text
import codeinpython library

# Given a list of numbers and a target,
# return the positions of two numbers that add up to the target.
```

The user asks Code in English to translate/solve that file. The library extracts the comment text, recognizes a supported problem request, writes ordinary Python source, and reports the output path. The user reviews and copies the generated source into their Python file to run it. Generated Python is not inserted into or executed from the `.en` file automatically.

The `import codeinpython library` line is a Code in English source directive; it is not Python syntax and is not copied into the generated solution. It identifies the Python-generation library for the `.en` file. The actual installed package/API can retain the repository's current `codeinenglish` name. Existing instruction-style `.en` programs and the current `translate` API remain supported.

## Two related capabilities

The product has two code-generation paths that share the existing IR/Python generation foundation:

1. **English programming language:** translate supported explicit English instructions (assignment, decisions, loops, collections, classes, and further constructs over time) into Python. The user describes the steps their program should perform.
2. **Problem-to-solution generation:** interpret a DSA question statement and select/build a solution without requiring the user to know the algorithm. This path needs a catalog of problem recognizers and verified solution strategies; it is not just translating the sentence into syntax.

The `.en` comment-question workflow is the first milestone for the second path. It does not replace the general-purpose language goal.

## Offline understanding contract

Without an AI model, the tool cannot reliably understand every possible English request or solve every novel algorithm problem. It uses deterministic text normalization, a growing vocabulary of synonyms, explicit grammar/rules, typed intermediate representations, and human-authored solution strategies. It must never imply that it understands unrestricted English.

Users should not need to know terms like “hash map,” “loop,” or “two pointers.” If a prompt is missing a detail that changes the result, the tool should ask for that detail in plain English or provide a clear diagnostic. If a request is not supported, it should say so instead of guessing.

## DSA problem-solving architecture

1. Extract prompt comments while preserving file and line information.
2. Normalize whitespace and harmless wording variations while retaining negation and constraints.
3. Recognize the input, requested outcome, relationships, and relevant constraints into a typed `ProblemSpec`.
4. Validate completeness and conflicts. Ask for missing details in plain English.
5. Match the spec to a reusable strategy. Require sufficient evidence; ambiguous prompts fail clearly.
6. Generate and syntax-check ordinary Python from structured code nodes.
7. Write atomically to a `.py` output file. Never execute it or overwrite an existing file after an error.

Start with common array and string problem families: pair sum and returned indices; duplicate/frequency tasks; palindrome; anagram; binary search on sorted input; minimum/maximum/sum. Each family must support multiple independently worded prompts and specify its edge cases. These are initial families, not the full product boundary.

Do not copy or scrape LeetCode questions. Use independently authored prompts and paraphrases as examples and tests.

## General language architecture

Keep the existing `.en` statement parser as a separate front end. Extend its English grammar and typed IR as Python-like constructs are implemented. Both front ends may reuse Python AST generation, Python syntax validation, and safe atomic output handling. Do not merge DSA intent recognition into the statement parser or create a second Python generator.

Long-term capability means that the English language can express the same kinds of computations as Python through documented, structured English forms. It does not mean every Python feature or every arbitrary English phrasing is supported at once.

## Scope and milestones

1. Preserve existing `translate` behavior and add comment-based prompt extraction plus the `solve` API/CLI path.
2. Add the `ProblemSpec`, recognition, clarification, and Python generation pipeline.
3. Implement a first useful set of array/string strategies with original examples, paraphrase tests, and edge cases.
4. Grow DSA coverage based on documented capability families and user feedback.
5. Continue expanding the general `.en` programming grammar toward Python-level expressive power.

Each milestone documents accepted forms, generated behavior, limitations, and verification. Do not call the product unrestricted English code generation.

## Acceptance criteria for the first DSA milestone

- The existing repository and package remain the foundation; no new model or external runtime dependency is added.
- The user can put a supported problem statement in `.en` comments and generate editable `.py` source without writing Python algorithm code.
- The tool recognizes several common array/string problem families, not only one memorized prompt, and accepts multiple human-authored phrasings per family.
- Unsupported or ambiguous prompts produce plain-English diagnostics and do not write partial code or replace existing output.
- Generated Python passes syntax validation and is never executed by the generator.
- Existing instruction-language APIs, CLI behavior, and examples remain working.

## Non-goals

- Guaranteed understanding of arbitrary English without a model.
- Replacing or modifying CPython.
- Automatically running generated code.
- Scraping or copying copyrighted problem collections.
- Implementing the entire Python language in one milestone.
