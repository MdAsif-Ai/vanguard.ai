"""Build the complete synthetic QA dataset.

Orchestrates: generate → validate → split into train/val/test.

Usage (from project root):
    python -m research.dataset.build_dataset --org-id <uuid> --num 200
"""

import argparse
import asyncio
import json
import random
import uuid
from pathlib import Path

from app.core.config import get_settings
from app.core.logging import get_logger, setup_logging
from research.dataset.generator import generate_dataset
from research.dataset.validator import validate_dataset

logger = get_logger(__name__)

OUTPUT_ROOT = Path("research/dataset/output")


async def main() -> None:
    parser = argparse.ArgumentParser(description="Build synthetic QA dataset")
    parser.add_argument(
        "--org-id",
        type=str,
        required=True,
        help="Organization UUID (from your deployment)",
    )
    parser.add_argument(
        "--num",
        type=int,
        default=200,
        help="Number of QA pairs to generate (default: 200)",
    )
    parser.add_argument(
        "--seed",
        type=int,
        default=42,
        help="Random seed for reproducibility",
    )
    args = parser.parse_args()

    random.seed(args.seed)
    settings = get_settings()
    setup_logging(settings)

    org_id = uuid.UUID(args.org_id)
    logger.info("Building dataset for org %s (%d questions)", org_id, args.num)

    # === Stage 1: Generate ===
    raw_path = OUTPUT_ROOT / "raw" / "dataset.jsonl"
    logger.info("Stage 1: Generating %d QA pairs...", args.num)
    await generate_dataset(org_id, num_questions=args.num, output_file=str(raw_path))
    logger.info("  Generated: %s", raw_path)

    # === Stage 2: Validate ===
    validated_path = OUTPUT_ROOT / "validated" / "dataset.jsonl"
    rejected_path = OUTPUT_ROOT / "rejected" / "dataset.jsonl"
    logger.info("Stage 2: Validating...")
    validated_count, rejected_count = validate_dataset(raw_path, validated_path, rejected_path)
    logger.info("  Validated: %d, Rejected: %d", validated_count, rejected_count)

    # === Stage 3: Split ===
    logger.info("Stage 3: Splitting into train/val/test...")
    split_dataset(validated_path)
    logger.info("  Done.")

    # === Summary ===
    print_summary(raw_path, validated_path, rejected_path)


def split_dataset(
    validated_path: Path,
    train_ratio: float = 0.8,
    val_ratio: float = 0.1,
) -> None:
    """Split validated dataset into train/val/test sets."""
    with open(validated_path, encoding="utf-8") as f:
        pairs = [json.loads(line) for line in f if line.strip()]

    random.shuffle(pairs)

    n = len(pairs)
    train_end = int(n * train_ratio)
    val_end = int(n * (train_ratio + val_ratio))

    splits = {
        "train": pairs[:train_end],
        "validation": pairs[train_end:val_end],
        "test": pairs[val_end:],
    }

    for split_name, split_pairs in splits.items():
        split_path = OUTPUT_ROOT / "validated" / f"{split_name}.jsonl"
        with open(split_path, "w", encoding="utf-8") as f:
            for pair in split_pairs:
                f.write(json.dumps(pair, ensure_ascii=False) + "\n")
        logger.info("  %s: %d pairs", split_name, len(split_pairs))


def print_summary(raw_path: Path, validated_path: Path, rejected_path: Path) -> None:
    """Print dataset statistics."""

    def count_lines(path: Path) -> int:
        with open(path, encoding="utf-8") as f:
            return sum(1 for line in f if line.strip())

    def count_by_type(path: Path) -> dict[str, int]:
        types: dict[str, int] = {}
        with open(path, encoding="utf-8") as f:
            for line in f:
                if not line.strip():
                    continue
                qa = json.loads(line)
                qt = qa.get("question_type", "unknown")
                types[qt] = types.get(qt, 0) + 1
        return types

    raw_count = count_lines(raw_path)
    valid_count = count_lines(validated_path)
    reject_count = count_lines(rejected_path)

    print("\n" + "=" * 60)
    print("DATASET SUMMARY")
    print("=" * 60)
    print(f"  Raw generated:       {raw_count}")
    print(f"  Validated:           {valid_count}")
    print(f"  Rejected:            {reject_count}")
    print(f"  Pass rate:           {valid_count / max(raw_count, 1):.1%}")
    print("\n  Question types (validated):")
    for qt, count in sorted(count_by_type(validated_path).items()):
        print(f"    {qt:20s} {count:4d}")
    print("=" * 60 + "\n")


if __name__ == "__main__":
    asyncio.run(main())
