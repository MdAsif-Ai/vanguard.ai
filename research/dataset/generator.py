"""Synthetic QA generation from financial documents.

Uses the FinanceRAG retrieval + Qwen3 pipeline to generate
question-answer pairs grounded in the uploaded documents.

Question types generated:
- extraction: "What was X?"
- comparison: "How did X change from Y to Z?"
- calculation: "What was the percentage change in X?"
- multi_hop: "Which segment drove the most growth and why?"
- unanswerable: "What is the company's 2030 revenue projection?"
  (evidence doesn't exist — system should abstain)

Output format (one JSON per line):
{
    "id": "qa_00001",
    "question": "...",
    "answer": "...",
    "question_type": "extraction",
    "company": "google",
    "document_name": "google.pdf",
    "page": 38,
    "evidence_text": "...",
    "source_chunk_index": 163,
    "difficulty": "easy|medium|hard",
    "expected_answer_type": "numeric|text|abstain"
}
"""

import asyncio
import json
import uuid
from pathlib import Path
from typing import Any

import httpx

from app.core.config import get_settings
from app.core.logging import get_logger
from app.integrations.qdrant import QdrantIntegration

logger = get_logger(__name__)

OUTPUT_DIR = Path("research/dataset/output")
RAW_DIR = OUTPUT_DIR / "raw"
VALIDATED_DIR = OUTPUT_DIR / "validated"
REJECTED_DIR = OUTPUT_DIR / "rejected"

QUESTION_TYPE_PROMPTS = {
    "extraction": (
        "Generate a question that requires extracting a specific financial "
        "fact from the evidence. The answer must be a specific number, "
        "percentage, or fact directly stated in the text. "
        "Format: one question and one short factual answer."
    ),
    "comparison": (
        "Generate a question that requires comparing two financial values "
        "or periods mentioned in the evidence. The answer should reference "
        "both values and describe the change. "
        "Format: one question and one concise answer."
    ),
    "calculation": (
        "Generate a question that requires a simple arithmetic calculation "
        "(percentage change, difference, ratio, growth rate) using values "
        "from the evidence. Include the calculation in the answer. "
        "Format: one question and one answer with the formula and result."
    ),
    "multi_hop": (
        "Generate a question that requires reasoning across multiple pieces "
        "of information in the evidence. The answer should synthesize "
        "information from different parts of the text. "
        "Format: one question and one analytical answer."
    ),
    "unanswerable": (
        "Generate a plausible-sounding financial question that CANNOT be "
        "answered from the provided evidence. The correct behavior is to "
        "state that the information is not available. "
        "The question should sound realistic but reference information "
        "not present in the text. "
        "Format: one question, answer should be 'INSUFFICIENT_EVIDENCE'."
    ),
}

UNANSWERABLE_ANSWER = "INSUFFICIENT_EVIDENCE"


class QAGenerator:
    """Generates synthetic QA pairs from indexed document chunks."""

    def __init__(self, settings: Any) -> None:
        self._settings = settings
        self._llm_base_url = settings.llm_base_url or "http://localhost:8001/v1"
        self._llm_model = settings.llm_model or "Qwen/Qwen3-4B-Instruct-2507"
        self._collection = settings.qdrant_collection

    async def generate_from_chunks(
        self,
        organization_id: uuid.UUID,
        num_questions: int = 50,
        question_types: list[str] | None = None,
    ) -> list[dict[str, Any]]:
        """Generate QA pairs from random document chunks."""
        if question_types is None:
            question_types = list(QUESTION_TYPE_PROMPTS.keys())

        # Get chunks from Qdrant
        chunks = await self._get_chunks(organization_id, limit=num_questions * 3)
        if not chunks:
            logger.warning("No chunks found for organization %s", organization_id)
            return []

        logger.info("Retrieved %d chunks for QA generation", len(chunks))

        qa_pairs = []
        for i in range(num_questions):
            chunk = chunks[i % len(chunks)]
            q_type = question_types[i % len(question_types)]

            prompt = self._build_prompt(chunk, q_type)
            response = await self._call_llm(prompt)

            if response is None:
                continue

            parsed = self._parse_llm_response(response, q_type)
            if parsed is None:
                continue

            qa_pair = {
                "id": f"qa_{i:05d}",
                "question": parsed["question"],
                "answer": parsed["answer"],
                "question_type": q_type,
                "company": chunk.get("document_name", "unknown").split(".")[0],
                "document_name": chunk.get("document_name", "unknown"),
                "page": chunk.get("page"),
                "evidence_text": chunk.get("text", "")[:800],
                "source_chunk_index": chunk.get("chunk_index"),
                "difficulty": self._estimate_difficulty(q_type, parsed),
                "expected_answer_type": "abstain"
                if q_type == "unanswerable"
                else "numeric"
                if any(c.isdigit() for c in parsed["answer"])
                else "text",
            }
            qa_pairs.append(qa_pair)

        logger.info("Generated %d QA pairs", len(qa_pairs))
        return qa_pairs

    async def _get_chunks(
        self, organization_id: uuid.UUID, limit: int = 150
    ) -> list[dict[str, Any]]:
        """Retrieve chunks from Qdrant (org-scoped)."""
        api_key = (
            self._settings.qdrant_api_key.get_secret_value()
            if self._settings.qdrant_api_key
            else None
        )
        qdrant = QdrantIntegration(url=self._settings.qdrant_url, api_key=api_key)
        try:
            # Use scroll to get all chunks (not search — we want random chunks)
            points, _ = await qdrant._client.scroll(
                collection_name=self._collection,
                scroll_filter=None,
                limit=limit,
                with_payload=True,
            )
            chunks = []
            for point in points:
                payload = point.payload or {}
                if payload.get("organization_id") != str(organization_id):
                    continue
                chunks.append(
                    {
                        "text": payload.get("text", ""),
                        "page": payload.get("page"),
                        "chunk_index": payload.get("chunk_index"),
                        "document_name": payload.get("document_name", "unknown"),
                    }
                )
            return chunks
        finally:
            await qdrant.close()

    def _build_prompt(self, chunk: dict[str, Any], question_type: str) -> str:
        """Build the LLM prompt for QA generation."""
        text = chunk.get("text", "")[:600]
        instruction = QUESTION_TYPE_PROMPTS[question_type]

        return (
            f"{instruction}\n\n"
            f"EVIDENCE (from {chunk.get('document_name', 'unknown')}, "
            f"page {chunk.get('page', '?')}):\n"
            f"{text}\n\n"
            "Respond in this exact format:\n"
            "QUESTION: <your question>\n"
            "ANSWER: <the answer>"
        )

    async def _call_llm(self, prompt: str) -> str | None:
        """Call the LLM to generate a QA pair."""
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{self._llm_base_url}/chat/completions",
                    json={
                        "model": self._llm_model,
                        "messages": [
                            {
                                "role": "user",
                                "content": prompt,
                            }
                        ],
                        "temperature": 0.7,
                        "max_tokens": 300,
                    },
                )
                response.raise_for_status()
                data = response.json()
                return data["choices"][0]["message"]["content"]
        except Exception as exc:
            logger.warning("LLM call failed: %s", type(exc).__name__)
            return None

    def _parse_llm_response(self, response: str, question_type: str) -> dict[str, str] | None:
        """Parse the LLM response into question/answer."""
        lines = response.strip().split("\n")
        question = ""
        answer = ""

        for line in lines:
            if line.startswith("QUESTION:"):
                question = line[len("QUESTION:") :].strip()
            elif line.startswith("ANSWER:"):
                answer = line[len("ANSWER:") :].strip()

        if not question or not answer:
            return None

        if question_type == "unanswerable":
            answer = UNANSWERABLE_ANSWER

        return {"question": question, "answer": answer}

    def _estimate_difficulty(self, question_type: str, parsed: dict[str, str]) -> str:
        """Estimate question difficulty based on type and length."""
        if question_type == "extraction":
            return "easy" if len(parsed["answer"]) < 50 else "medium"
        if question_type == "comparison":
            return "medium"
        if question_type == "calculation":
            return "medium" if len(parsed["answer"]) < 100 else "hard"
        if question_type == "multi_hop":
            return "hard"
        if question_type == "unanswerable":
            return "medium"
        return "medium"


async def generate_dataset(
    organization_id: uuid.UUID,
    num_questions: int = 200,
    output_file: str = "research/dataset/output/raw/dataset.jsonl",
) -> Path:
    """Main entry point: generate a synthetic QA dataset."""
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    VALIDATED_DIR.mkdir(parents=True, exist_ok=True)
    REJECTED_DIR.mkdir(parents=True, exist_ok=True)

    settings = get_settings()
    generator = QAGenerator(settings)
    qa_pairs = await generator.generate_from_chunks(organization_id, num_questions=num_questions)

    output_path = Path(output_file)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    with open(output_path, "w", encoding="utf-8") as f:
        for qa in qa_pairs:
            f.write(json.dumps(qa, ensure_ascii=False) + "\n")

    logger.info("Saved %d QA pairs to %s", len(qa_pairs), output_path)
    return output_path


if __name__ == "__main__":
    import sys

    org_id = uuid.UUID(sys.argv[1]) if len(sys.argv) > 1 else uuid.uuid4()
    count = int(sys.argv[2]) if len(sys.argv) > 2 else 200
    asyncio.run(generate_dataset(org_id, count))
