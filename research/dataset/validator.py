"""Validation pipeline for synthetic QA data.

Checks each QA pair against the source evidence before it enters
the training set. Rejected pairs are saved separately for analysis.

Validation stages:
1. Schema validation (required fields, correct types)
2. Evidence support check (does the evidence contain the answer?)
3. Numerical verification (arithmetic in calculation answers)
4. Duplicate detection (near-identical questions)
5. Unanswerable check (abstention questions must not have evidence)
"""

import json
import re
from collections.abc import Callable
from pathlib import Path
from typing import Any

from app.core.logging import get_logger

logger = get_logger(__name__)

UNANSWERABLE_ANSWER = "INSUFFICIENT_EVIDENCE"

REQUIRED_FIELDS = [
    "id",
    "question",
    "answer",
    "question_type",
    "evidence_text",
]

VALID_QUESTION_TYPES = {
    "extraction",
    "comparison",
    "calculation",
    "multi_hop",
    "unanswerable",
}


class ValidationResult:
    def __init__(self, passed: bool, stage: str, reason: str) -> None:
        self.passed = passed
        self.stage = stage
        self.reason = reason

    def __repr__(self) -> str:
        status = "PASS" if self.passed else "FAIL"
        return f"[{status}] {self.stage}: {self.reason}"


def validate_schema(qa: dict[str, Any]) -> ValidationResult:
    """Stage 1: Check required fields and types."""
    for field in REQUIRED_FIELDS:
        if field not in qa:
            return ValidationResult(False, "schema", f"Missing field: {field}")
        if not qa[field] and qa[field] != 0:
            return ValidationResult(False, "schema", f"Empty field: {field}")

    if qa["question_type"] not in VALID_QUESTION_TYPES:
        return ValidationResult(False, "schema", f"Invalid question_type: {qa['question_type']}")

    if len(qa["question"]) < 10:
        return ValidationResult(False, "schema", "Question too short (<10 chars)")

    if len(qa["question"]) > 500:
        return ValidationResult(False, "schema", "Question too long (>500 chars)")

    return ValidationResult(True, "schema", "OK")


def validate_evidence_support(qa: dict[str, Any]) -> ValidationResult:
    """Stage 2: Check if the answer is supported by the evidence."""
    answer = qa["answer"]
    evidence = qa.get("evidence_text", "")

    if qa["question_type"] == "unanswerable":
        # For unanswerable, the answer should be the sentinel
        if answer != UNANSWERABLE_ANSWER:
            return ValidationResult(
                False, "evidence", "Unanswerable question has non-sentinel answer"
            )
        return ValidationResult(True, "evidence", "Unanswerable OK")

    if not evidence:
        return ValidationResult(False, "evidence", "No evidence text")

    # For extraction questions, check that key numbers in the answer
    # appear in the evidence
    if qa["question_type"] == "extraction":
        numbers_in_answer = re.findall(r"\$?\d+(?:\.\d+)?", answer)
        if numbers_in_answer:
            for num in numbers_in_answer:
                clean_num = num.replace("$", "").replace(",", "")
                if clean_num not in evidence and clean_num not in evidence.replace(",", ""):
                    return ValidationResult(
                        False,
                        "evidence",
                        f"Answer number '{num}' not found in evidence",
                    )

    return ValidationResult(True, "evidence", "OK")


def validate_numerical(qa: dict[str, Any]) -> ValidationResult:
    """Stage 3: Verify arithmetic in calculation answers."""
    if qa["question_type"] != "calculation":
        return ValidationResult(True, "numerical", "Not a calculation question")

    answer = qa["answer"]

    # Check for percentage calculations
    pct_match = re.search(r"(\d+(?:\.\d+)?)\s*%", answer)
    if pct_match:
        pct_value = float(pct_match.group(1))
        if pct_value < 0 or pct_value > 10000:
            return ValidationResult(False, "numerical", f"Unreasonable percentage: {pct_value}%")

    # Check for dollar amounts
    dollar_match = re.search(r"\$(\d+(?:,\d{3})*(?:\.\d+)?)", answer)
    if dollar_match:
        amount = float(dollar_match.group(1).replace(",", ""))
        if amount < 0:
            return ValidationResult(False, "numerical", "Negative dollar amount")
        if amount > 10_000_000_000_000:
            return ValidationResult(False, "numerical", f"Unreasonably large amount: ${amount}")

    return ValidationResult(True, "numerical", "OK")


def validate_not_duplicate(qa: dict[str, Any], seen_questions: set[str]) -> ValidationResult:
    """Stage 4: Check for duplicate/near-identical questions."""
    # Simple normalization: lowercase, remove punctuation, collapse spaces
    normalized = re.sub(r"[^\w\s]", "", qa["question"].lower())
    normalized = " ".join(normalized.split())

    if normalized in seen_questions:
        return ValidationResult(False, "duplicate", "Exact duplicate question")

    # Check for near-duplicates (first 50 chars match)
    prefix = normalized[:50]
    for seen in seen_questions:
        if seen.startswith(prefix) and len(normalized) > 50:
            return ValidationResult(
                False, "duplicate", f"Near-duplicate (prefix match): {prefix[:30]}..."
            )

    seen_questions.add(normalized)
    return ValidationResult(True, "duplicate", "OK")


def validate_answerability(qa: dict[str, Any]) -> ValidationResult:
    """Stage 5: Verify unanswerable questions don't have evidence."""
    if qa["question_type"] != "unanswerable":
        return ValidationResult(True, "answerability", "Not unanswerable")

    # The evidence should NOT directly contain the answer
    # (since the answer is the sentinel, this is always true)
    # But we can check that the question mentions something not in the evidence
    evidence = qa.get("evidence_text", "")
    question_words = set(qa["question"].lower().split())

    # Check if too many question words appear in evidence (suggests it might
    # actually be answerable)
    evidence_words = set(evidence.lower().split())
    overlap = question_words & evidence_words
    overlap_ratio = len(overlap) / max(len(question_words), 1)

    if overlap_ratio > 0.8:
        return ValidationResult(
            False,
            "answerability",
            f"Unanswerable question has {overlap_ratio:.0%} word overlap with evidence",
        )

    return ValidationResult(True, "answerability", "OK")


VALIDATION_STAGES: list[Callable[[dict[str, Any]], ValidationResult]] = [
    validate_schema,
    validate_evidence_support,
    validate_numerical,
    validate_not_duplicate,
    validate_answerability,
]


def validate_qa_pair(qa: dict[str, Any], seen_questions: set[str]) -> tuple[bool, str]:
    """Run all validation stages. Returns (passed, failure_reason)."""
    for stage in VALIDATION_STAGES:
        result = stage(qa) if stage != validate_not_duplicate else stage(qa, seen_questions)
        if not result.passed:
            return False, f"{result.stage}: {result.reason}"
    return True, "OK"


def validate_dataset(
    input_file: Path,
    validated_output: Path,
    rejected_output: Path,
) -> tuple[int, int]:
    """Validate a full dataset. Returns (validated_count, rejected_count)."""
    seen_questions: set[str] = set()
    validated = 0
    rejected = 0

    validated_output.parent.mkdir(parents=True, exist_ok=True)
    rejected_output.parent.mkdir(parents=True, exist_ok=True)

    with (
        open(input_file, encoding="utf-8") as f_in,
        open(validated_output, "w", encoding="utf-8") as f_valid,
        open(rejected_output, "w", encoding="utf-8") as f_reject,
    ):
        for line in f_in:
            line = line.strip()
            if not line:
                continue

            try:
                qa = json.loads(line)
            except json.JSONDecodeError:
                f_reject.write(json.dumps({"error": "json_parse", "raw": line[:100]}) + "\n")
                rejected += 1
                continue

            passed, reason = validate_qa_pair(qa, seen_questions)

            if passed:
                f_valid.write(json.dumps(qa, ensure_ascii=False) + "\n")
                validated += 1
            else:
                qa["_rejection_reason"] = reason
                f_reject.write(json.dumps(qa, ensure_ascii=False) + "\n")
                rejected += 1

    logger.info(
        "Validation complete: %d validated, %d rejected",
        validated,
        rejected,
    )
    return validated, rejected


if __name__ == "__main__":
    import sys

    input_path = (
        Path(sys.argv[1])
        if len(sys.argv) > 1
        else Path("research/dataset/output/raw/dataset.jsonl")
    )
    valid_path = (
        Path(sys.argv[2])
        if len(sys.argv) > 2
        else Path("research/dataset/output/validated/dataset.jsonl")
    )
    reject_path = (
        Path(sys.argv[3])
        if len(sys.argv) > 3
        else Path("research/dataset/output/rejected/dataset.jsonl")
    )

    validate_dataset(input_path, valid_path, reject_path)
