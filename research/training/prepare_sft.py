"""Prepare validated QA data for supervised fine-tuning (QLoRA).

Converts the validated JSONL into a format suitable for TRL/SFTTrainer.

Input format (JSONL):
{
    "question": "...",
    "answer": "...",
    "evidence_text": "...",
    "question_type": "..."
}

Output format (JSONL, one per line):
{
    "messages": [
        {"role": "system", "content": "Answer based only on the evidence..."},
        {"role": "user", "content": "Evidence: ...\n\nQuestion: ..."},
        {"role": "assistant", "content": "..."}
    ]
}
"""

import argparse
import json
from pathlib import Path

SYSTEM_PROMPT = (
    "You are a financial analyst assistant. Answer the user's question "
    "using ONLY the evidence provided. If the evidence doesn't contain "
    "enough information, state that clearly. Cite specific numbers "
    "exactly as they appear in the evidence."
)

INSUFFICIENT_ANSWER = (
    "The provided evidence does not contain sufficient information to answer this question."
)


def convert_to_sft(input_path: Path, output_path: Path) -> int:
    """Convert validated QA pairs to SFT training format."""
    count = 0
    output_path.parent.mkdir(parents=True, exist_ok=True)

    with (
        open(input_path, encoding="utf-8") as f_in,
        open(output_path, "w", encoding="utf-8") as f_out,
    ):
        for line in f_in:
            if not line.strip():
                continue

            qa = json.loads(line)

            evidence = qa.get("evidence_text", "")
            question = qa.get("question", "")
            answer = qa.get("answer", "")

            # Handle unanswerable questions
            if answer == "INSUFFICIENT_EVIDENCE":
                answer = INSUFFICIENT_ANSWER

            user_content = f"Evidence:\n{evidence[:600]}\n\nQuestion: {question}"

            sft_example = {
                "messages": [
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": user_content},
                    {"role": "assistant", "content": answer},
                ]
            }

            f_out.write(json.dumps(sft_example, ensure_ascii=False) + "\n")
            count += 1

    print(f"Converted {count} examples to {output_path}")
    return count


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Prepare SFT training data")
    parser.add_argument(
        "--input",
        type=str,
        default="research/dataset/output/validated/train.jsonl",
    )
    parser.add_argument(
        "--output",
        type=str,
        default="research/training/data/sft_train.jsonl",
    )
    args = parser.parse_args()

    convert_to_sft(Path(args.input), Path(args.output))
