# Interpreted request: two_sum(nums, target) -> indices_or_none.
# Defaulted assumption: There may be no matching pair.
# Defaulted assumption: Use two distinct indices.
# Defaulted assumption: Return the first matching pair in left-to-right order.
# Defaulted assumption: Return null when no pair exists.

import argparse, json, sys, unicodedata

def two_sum(nums, target):
    seen = {}
    for index, number in enumerate(nums):
        if target - number in seen:
            return (seen[target - number], index)
        if number not in seen:
            seen[number] = index
    return None
EXAMPLES = []

def _check_examples():
    if not EXAMPLES:
        print('No examples were included; nothing was checked.', file=sys.stderr)
        return 2
    for number, example in enumerate(EXAMPLES, start=1):
        actual = two_sum(**example['input'])
        actual_json = json.loads(json.dumps(actual))
        if actual_json != example['expected']:
            print('Example failed:', number, 'expected', example['expected'], 'got', actual, file=sys.stderr)
            return 1
    print('All 0 examples passed.')
    return 0

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--check-examples', action='store_true')
    arguments = parser.parse_args()
    if arguments.check_examples:
        return _check_examples()
    try:
        payload = json.load(sys.stdin)
    except json.JSONDecodeError:
        print('Input must be one valid JSON value.', file=sys.stderr)
        return 2
    if not isinstance(payload, dict):
        print('Input must be a JSON object.', file=sys.stderr)
        return 2
    if set(payload) != set(['nums', 'target']):
        print('JSON input must contain exactly these keys: nums, target', file=sys.stderr)
        return 2
    if not (type(payload['nums']) is list and all((type(item) is int for item in payload['nums']))):
        print("JSON field 'nums' has the wrong type; expected integer_list.", file=sys.stderr)
        return 2
    if not type(payload['target']) is int:
        print("JSON field 'target' has the wrong type; expected integer.", file=sys.stderr)
        return 2
    result = two_sum(**payload)
    print(json.dumps(result, ensure_ascii=False))
    return 0
if __name__ == '__main__':
    raise SystemExit(main())
