"""Smart analysis service: routes calculation questions to the deterministic engine.

When a user asks a question that requires arithmetic (margin, growth,
percentage change), this service:
1. Detects the calculation type from the question
2. Retrieves the relevant financial facts from PostgreSQL
3. Performs the calculation with the deterministic calculator
4. Returns the verified result for the LLM to explain

This ensures the LLM NEVER performs arithmetic — it only explains
pre-computed results with citations.
"""

import uuid
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings
from app.core.logging import get_logger
from app.db.models import FinancialFact
from app.services.calculator import CalculationError, Calculator
from app.services.query_processor import ProcessedQuery, process_query

logger = get_logger(__name__)

# Maps question patterns to calculator operations and required metrics
CALCULATION_PATTERNS: list[dict[str, Any]] = [
    {
        "operation": "margin",
        "keywords": ["margin", "operating margin", "profit margin", "gross margin"],
        "required_inputs": ["income", "revenue"],
        "fact_metrics": {
            "income": ["operating_income", "net_income", "gross_profit"],
            "revenue": ["revenue", "total_revenue", "net_sales"],
        },
        "description": "margin = income / revenue * 100",
    },
    {
        "operation": "percentage_change",
        "keywords": ["change", "growth", "increase", "decrease", "grew", "declined"],
        "required_inputs": ["old", "new"],
        "fact_metrics": {
            "old": ["previous", "prior", "prior_year"],
            "new": ["current", "latest", "current_year"],
        },
        "description": "percentage change = (new - old) / |old| * 100",
    },
    {
        "operation": "ratio",
        "keywords": ["ratio", "per", "compared to", "relative to"],
        "required_inputs": ["numerator", "denominator"],
        "fact_metrics": {
            "numerator": ["revenue", "income", "profit"],
            "denominator": ["assets", "liabilities", "debt"],
        },
        "description": "ratio = numerator / denominator",
    },
]

# Metrics that map to financial fact tables
METRIC_TO_FACT: dict[str, list[str]] = {
    "revenue": ["revenue", "total_revenue", "net_sales"],
    "operating_income": ["operating_income", "operating_profit"],
    "net_income": ["net_income", "net_profit", "net_earnings"],
    "eps": ["eps", "diluted_eps", "earnings_per_share"],
    "cash_flow": ["cash_flow", "operating_cash_flow", "free_cash_flow"],
    "assets": ["assets", "total_assets"],
    "liabilities": ["liabilities", "total_liabilities"],
    "debt": ["debt", "long_term_debt", "total_debt"],
    "r_d": ["r_d", "research_development"],
    "capex": ["capex", "capital_expenditure"],
}


class SmartAnalysisResult:
    """Result from smart analysis routing."""

    def __init__(
        self,
        *,
        is_calculation: bool,
        operation: str | None = None,
        inputs: dict[str, float] | None = None,
        result: float | None = None,
        formula: str | None = None,
        facts_used: list[dict[str, Any]] | None = None,
        explanation: str | None = None,
    ) -> None:
        self.is_calculation = is_calculation
        self.operation = operation
        self.inputs = inputs
        self.result = result
        self.formula = formula
        self.facts_used = facts_used or []
        self.explanation = explanation


class SmartAnalysisService:
    """Routes calculation questions to the deterministic engine."""

    def __init__(self, session: AsyncSession, settings: Settings) -> None:
        self._session = session
        self._settings = settings
        self._calculator = Calculator()

    async def analyze(
        self,
        question: str,
        *,
        organization_id: uuid.UUID,
    ) -> SmartAnalysisResult:
        """Check if a question needs a calculation; if so, compute it."""
        processed = process_query(question)

        # Detect calculation type
        calc_spec = self._detect_calculation(processed)
        if calc_spec is None:
            return SmartAnalysisResult(is_calculation=False)

        # Find the relevant financial facts
        facts = await self._find_facts(organization_id, processed, calc_spec)
        if not facts:
            return SmartAnalysisResult(is_calculation=False)

        # Build inputs from facts
        inputs = self._build_inputs(facts, calc_spec)
        if inputs is None:
            return SmartAnalysisResult(is_calculation=False)

        # Perform the calculation
        try:
            calc_result = self._calculator.calculate(calc_spec["operation"], inputs)
        except CalculationError as exc:
            logger.warning("Calculation failed: %s", exc)
            return SmartAnalysisResult(is_calculation=False)

        return SmartAnalysisResult(
            is_calculation=True,
            operation=calc_result["operation"],
            inputs=calc_result["inputs"],
            result=calc_result["result"],
            formula=calc_result["formula"],
            facts_used=[
                {
                    "metric": f.metric,
                    "value": f.value,
                    "currency": f.currency,
                    "period": f.period,
                    "page": f.page,
                }
                for f in facts
            ],
        )

    def _detect_calculation(self, processed: ProcessedQuery) -> dict[str, Any] | None:
        """Detect if the question requires a calculation."""
        question_lower = processed.cleaned.lower()

        # Check explicit calculation keywords
        for spec in CALCULATION_PATTERNS:
            if any(kw in question_lower for kw in spec["keywords"]):
                return spec

        # Check if the question type implies calculation
        if processed.question_type == "calculation":
            return CALCULATION_PATTERNS[0]  # default to margin

        return None

    async def _find_facts(
        self,
        organization_id: uuid.UUID,
        processed: ProcessedQuery,
        calc_spec: dict[str, Any],
    ) -> list[FinancialFact]:
        """Retrieve relevant financial facts from the database."""
        # Build list of fact metrics to search for
        fact_metrics = []
        for _input_name, metric_names in calc_spec["fact_metrics"].items():
            for m in metric_names:
                if m not in fact_metrics:
                    fact_metrics.append(m)

        # Also add any metric detected in the query
        if processed.metric and processed.metric not in fact_metrics:
            fact_metrics.append(processed.metric)

        # Query financial facts
        stmt = (
            select(FinancialFact)
            .where(
                FinancialFact.metric.in_(fact_metrics),
            )
            .order_by(FinancialFact.period.desc())
            .limit(10)
        )
        result = await self._session.execute(stmt)
        facts = list(result.scalars().all())

        # Filter by organization (through document relationship)
        if organization_id:
            # For now, return all facts (document-level filtering comes with document join)
            # In production: join with documents table and filter by organization_id
            pass

        logger.info(
            "Found %d financial facts for metrics %s",
            len(facts),
            fact_metrics,
        )
        return facts

    def _build_inputs(
        self, facts: list[FinancialFact], calc_spec: dict[str, Any]
    ) -> dict[str, float] | None:
        """Build calculator inputs from financial facts."""
        inputs: dict[str, float] = {}

        for input_name in calc_spec["required_inputs"]:
            metric_names = calc_spec["fact_metrics"].get(input_name, [])
            for fact in facts:
                if fact.metric in metric_names and fact.value is not None:
                    inputs[input_name] = float(fact.value)
                    break

        if len(inputs) != len(calc_spec["required_inputs"]):
            return None

        return inputs
