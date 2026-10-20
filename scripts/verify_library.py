"""Smoke-test an installed Code in English package against canonical examples."""

import json
import subprocess
import sys
import tempfile
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
EXAMPLES = ROOT / "examples"


def run(arguments, *, cwd, input_text=None):
    return subprocess.run(
        [sys.executable, *map(str, arguments)],
        cwd=cwd,
        text=True,
        capture_output=True,
        input=input_text,
    )


def main():
    with tempfile.TemporaryDirectory(prefix="codeinenglish-check-") as temporary:
        outside = Path(temporary)
        greeting = outside / "greeter.py"
        generated_greeter = run(
            ["-m", "codeinenglish", "generate", EXAMPLES / "greeter.en", "--output", greeting],
            cwd=outside,
        )
        if generated_greeter.returncode:
            raise SystemExit(f"greeter generation failed:\n{generated_greeter.stderr}")
        greeting_run = run([greeting], cwd=outside)
        if greeting_run.returncode or greeting_run.stdout.strip() != "Hello Ada":
            raise SystemExit(f"greeter output mismatch: {greeting_run.stdout!r}\n{greeting_run.stderr}")

        solution = outside / "two_sum.py"
        generated_problem = run(
            ["-m", "codeinenglish", "generate", EXAMPLES / "two_sum_problem.en", "--output", solution],
            cwd=outside,
        )
        if generated_problem.returncode:
            raise SystemExit(f"Two Sum generation failed:\n{generated_problem.stderr}")
        checked = run([solution, "--check-examples"], cwd=outside)
        if checked.returncode or "All 1 examples passed." not in checked.stdout:
            raise SystemExit(f"Two Sum example check failed:\n{checked.stdout}\n{checked.stderr}")
        sample = run([solution], cwd=outside, input_text='{"nums":[2,7,11,15],"target":9}')
        if sample.returncode or json.loads(sample.stdout) != [0, 1]:
            raise SystemExit(f"Two Sum JSON run failed:\n{sample.stdout}\n{sample.stderr}")

    print("Installed Code in English package passed greeter and Two Sum integration checks.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
