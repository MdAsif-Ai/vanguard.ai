"""Run a single experiment configuration.

Experiment matrix:
    E0: Base Qwen3, no RAG
    E1: Base Qwen3 + RAG (current system)
    E2: QLoRA naive, no RAG
    E3: QLoRA validated, no RAG
    E4: QLoRA naive + RAG
    E5: QLoRA validated + RAG

Usage:
    python -m research.evaluation.run_experiment \
        --config E1 \
        --test-data research/dataset/output/validated/test.jsonl \
        --output research/experiments/results/E1_results.jsonl
"""

import argparse
import asyncio
import json
import time
import uuid
from pathlib import Path
from typing import Any

import httpx

from app.core.config import get_settings
from app.core.logging import get_logger

logger = get_logger(__name__)

EXPERIMENT_CONFIGS = {
    "E0": {"rag": False, "fine_tuned": False, "description": "Base LLM, no RAG"},
    "E1": {"rag": True, "fine_tuned": False, "description": "Base LLM + RAG"},
    "E2": {"rag": False, "fine_tuned": "naive", "description": "QLoRA naive, no RAG"},
    "E3": {"rag": False, "fine_tuned": "validated", "description": "QLoRA validated, no RAG"},
    "E4": {"rag": True, "fine_tuned": "naive", "description": "QLoRA naive + RAG"},
    "E5": {"rag": True, "fine_tuned": "validated", "description": "QLoRA validated + RAG"},
}


async def run_single_qa(
    question: str,
    evidence: str | None,
    config: dict[str, Any],
    settings: Any,
) -> dict[str, Any]:
    """Run a single QA through the experiment pipeline."""
    start_time = time.time()

    llm_base = settings.llm_base_url or "http://localhost:8001/v1"
    llm_model = settings.llm_model or "Qwen/Qwen3-4B-Instruct-2507"

    if config["rag"] and evidence:
        system_prompt = (
            "You are a financial analyst. Answer using ONLY the evidence "
            "provided. Cite specific numbers exactly. If insufficient "
            "information, state that clearly.\n\n"
            f"EVIDENCE:\n{evidence[:600]}"
        )
    else:
        system_prompt = (
            "You are a financial analyst. Answer the question to the best "
            "of your knowledge. If you're not certain, state that clearly."
        )

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{llm_base}/chat/completions",
                json={
                    "model": llm_model,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": question},
                    ],
                    "temperature": 0.1,
                    "max_tokens": 500,
                },
            )
            response.raise_for_status()
            data = response.json()
            answer = data["choices"][0]["message"]["content"]
            tokens_used = data.get("usage", {}).get("total_tokens", 0)
    except Exception as exc:
        answer = f"ERROR: {exc}"
        tokens_used = 0

    elapsed = time.time() - start_time

    return {
        "question": question,
        "generated_answer": answer,
        "latency_seconds": round(elapsed, 2),
        "tokens_used": tokens_used,
    }


async def run_experiment(
    config_name: str,
    test_data_path: Path,
    output_path: Path,
    organization_id: uuid.UUID,
) -> None:
    """Run a full experiment on the test set."""
    config = EXPERIMENT_CONFIGS[config_name]
    settings = get_settings()

    logger.info("Running experiment %s: %s", config_name, config["description"])

    # Load test data
    test_pairs = []
    with open(test_data_path, encoding="utf-8") as f:
        for line in f:
            if line.strip():
                test_pairs.append(json.loads(line))

    logger.info("Loaded %d test questions", len(test_pairs))

    # Run each question
    results = []
    output_path.parent.mkdir(parents=True, exist_ok=True)

    with open(output_path, "w", encoding="utf-8") as f_out:
        for i, pair in enumerate(test_pairs):
            evidence = pair.get("evidence_text") if config["rag"] else None
            result = await run_single_qa(pair["question"], evidence, config, settings)
            result["expected_answer"] = pair.get("answer", "")
            result["question_type"] = pair.get("question_type", "")
            result["experiment"] = config_name

            f_out.write(json.dumps(result, ensure_ascii=False) + "\n")
            results.append(result)

            if (i + 1) % 10 == 0:
                logger.info("  Progress: %d/%d", i + 1, len(test_pairs))

    # Summary
    avg_latency = sum(r["latency_seconds"] for r in results) / max(len(results), 1)
    logger.info(
        "Experiment %s complete: %d questions, avg latency %.2fs",
        config_name,
        len(results),
        avg_latency,
    )


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run experiment")
    parser.add_argument(
        "--config", type=str, required=True, choices=list(EXPERIMENT_CONFIGS.keys())
    )
    parser.add_argument("--test-data", type=str, required=True)
    parser.add_argument("--output", type=str, required=True)
    parser.add_argument("--org-id", type=str, default="")
    args = parser.parse_args()

    asyncio.run(
        run_experiment(
            args.config,
            Path(args.test_data),
            Path(args.output),
            uuid.UUID(args.org_id) if args.org_id else uuid.uuid4(),
        )
    )
