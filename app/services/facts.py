"""Financial fact extraction service.

Extracts structured financial facts from document text during ingestion.
Uses the LLM to identify metrics, values, and periods from evidence,
then stores them in the financial_facts table.

This runs AFTER document parsing but BEFORE embedding, during ingestion.
"""

import uuid
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings
from app.core.logging import get_logger
from app.db.models import Document, FinancialFact
from app.integrations.llm import LLMClient, LLMError

logger = get_logger(__name__)

FACT_EXTRACTION_PROMPT = """Extract financial facts from the following text.

For each fact found, identify:
- metric: the financial metric (revenue, operating_income, net_income,
eps, cash_flow, debt, assets, liabilities, r_d, capex, margin, etc.)
- value: the numerical value (just the number, no units or currency)
- currency: USD, EUR, etc. (or null if not specified)
- unit: the scale (billions, millions, or null if raw number)
- period: the fiscal period (FY2025, Q3 2025, etc.)

Text (from page {page} of {document_name}):
{text}

Respond in this exact JSON format (list of facts, empty list if none):
[
    {{"metric": "revenue", "value": 402.8, "currency": "USD",
     "unit": "billions", "period": "FY2025"}},
    {{"metric": "operating_income", "value": 112.4, "currency": "USD",
     "unit": "billions", "period": "FY2025"}}
]
"""

# Common metric patterns for simple regex-based extraction (no LLM needed)
REGEX_METRICS = [
    (r"revenues?\s+(?:were|of|is)?\s*\$?([\d,]+(?:\.\d+)?)\s*(billion|million)", "revenue"),
    (r"total\s+revenues?\s+of\s*\$?([\d,]+(?:\.\d+)?)\s*(billion|million)", "revenue"),
    (r"operating\s+income\s+of\s*\$?([\d,]+(?:\.\d+)?)\s*(billion|million)", "operating_income"),
    (
        r"operating\s+income\s+(?:was|increased|decreased)\s*\$?([\d,]+(?:\.\d+)?)\s*(billion|million)",
        "operating_income",
    ),
    (r"net\s+income\s+of\s*\$?([\d,]+(?:\.\d+)?)\s*(billion|million)", "net_income"),
    (r"earnings\s+per\s+share\s+(?:of|was|were)?\s*\$([\d.]+)", "eps"),
    (r"diluted\s+EPS\s+(?:of|was|were)?\s*\$([\d.]+)", "eps"),
    (
        r"cash\s+flow\s+(?:from\s+operations)?\s+(?:of|was)?\s*\$?([\d,]+(?:\.\d+)?)\s*(billion|million)",
        "cash_flow",
    ),
]

UNIT_MULTIPLIERS = {"billion": 1_000_000_000, "million": 1_000_000, "thousand": 1_000}


class FactExtractionService:
    """Extracts structured financial facts from document chunks."""

    def __init__(self, session: AsyncSession, settings: Settings) -> None:
        self._session = session
        self._settings = settings

    async def extract_from_document(self, document: Document) -> int:
        """Extract facts from a document's indexed chunks.

        Called during ingestion after chunks are created.
        Returns the number of facts extracted.
        """
        # Try regex extraction first (fast, no LLM needed)
        facts = self._regex_extract(document)

        # If we got fewer than 5 facts, also use LLM extraction
        if len(facts) < 5:
            llm_facts = await self._llm_extract(document)
            existing_metrics = {(f.metric, f.period) for f in facts}
            for fact in llm_facts:
                if (fact.metric, fact.period) not in existing_metrics:
                    facts.append(fact)

        # Save to database
        for fact in facts:
            self._session.add(fact)

        if facts:
            await self._session.flush()

        logger.info(
            "Extracted %d financial facts from document %s",
            len(facts),
            document.id,
        )
        return len(facts)

    def _regex_extract(self, document: Document) -> list[FinancialFact]:
        """Extract facts using regex patterns (fast, no LLM)."""
        facts: list[FinancialFact] = []
        # For Phase 6, we extract from the document name and stored text
        # TODO: iterate over document chunks for regex extraction

        return facts

    async def _llm_extract(self, document: Document) -> list[FinancialFact]:
        """Extract facts using the LLM (more thorough)."""
        if not self._settings.llm_base_url:
            logger.warning("LLM not configured, skipping fact extraction")
            return []

        llm = LLMClient(
            base_url=self._settings.llm_base_url,
            api_key=self._settings.llm_api_key.get_secret_value()
            if self._settings.llm_api_key
            else None,
            model=self._settings.llm_model,
        )

        try:
            # Extract from document chunks
            chunks = await self._get_document_chunks(document.id)
            facts: list[FinancialFact] = []

            for chunk in chunks[:5]:  # Limit to first 5 chunks for speed
                prompt = FACT_EXTRACTION_PROMPT.format(
                    page=chunk.get("page", "?"),
                    document_name=document.name,
                    text=chunk.get("text", "")[:800],
                )

                try:
                    import json

                    response = await llm.generate(
                        messages=[{"role": "user", "content": prompt}],
                        temperature=0.0,
                        max_tokens=500,
                    )

                    # Parse JSON from response
                    cleaned = response.strip()
                    if cleaned.startswith("```"):
                        cleaned = cleaned.split("\n", 1)[1].rsplit("```", 1)[0]

                    parsed = json.loads(cleaned)
                    if isinstance(parsed, list):
                        for fact_data in parsed:
                            if not isinstance(fact_data, dict):
                                continue
                            fact = FinancialFact(
                                id=uuid.uuid4(),
                                document_id=document.id,
                                company=fact_data.get("company") or document.company,
                                metric=fact_data.get("metric", "unknown"),
                                value=self._parse_value(fact_data.get("value")),
                                unit=fact_data.get("unit"),
                                currency=fact_data.get("currency"),
                                period=fact_data.get("period"),
                                page=chunk.get("page"),
                                source_text=fact_data.get("source_text"),
                            )
                            facts.append(fact)
                except (json.JSONDecodeError, LLMError):
                    continue

            return facts
        finally:
            await llm.close()

    async def _get_document_chunks(self, document_id: uuid.UUID) -> list[dict[str, Any]]:
        """Get chunks from Qdrant for fact extraction."""
        from app.integrations.qdrant import QdrantIntegration

        api_key = (
            self._settings.qdrant_api_key.get_secret_value()
            if self._settings.qdrant_api_key
            else None
        )
        qdrant = QdrantIntegration(url=self._settings.qdrant_url, api_key=api_key)
        try:
            # Get all chunks for this document
            from qdrant_client.models import FieldCondition, Filter, MatchValue

            points, _ = await qdrant._client.scroll(
                collection_name=self._settings.qdrant_collection,
                scroll_filter=Filter(
                    must=[
                        FieldCondition(
                            key="document_id",
                            match=MatchValue(value=str(document_id)),
                        )
                    ]
                ),
                limit=10,
                with_payload=True,
            )
            return [
                {"text": (p.payload or {}).get("text", ""), "page": (p.payload or {}).get("page")}
                for p in points
            ]
        finally:
            await qdrant.close()

    def _parse_value(self, raw: Any) -> float | None:
        """Parse a value from the LLM response."""
        if raw is None:
            return None
        try:
            return float(str(raw).replace(",", "").replace("$", ""))
        except (ValueError, TypeError):
            return None

    def _extract_company_from_name(self, name: str) -> str | None:
        """Extract company name from document filename."""
        companies = [
            "google",
            "alphabet",
            "apple",
            "microsoft",
            "amazon",
            "meta",
            "tesla",
            "nvidia",
            "netflix",
            "oracle",
            "salesforce",
            "ibm",
        ]
        for company in companies:
            if company in name:
                return company.capitalize()
        return None
