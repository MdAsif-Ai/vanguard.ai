"""Financial analysis API: calculations and structured facts."""

from fastapi import APIRouter, HTTPException, status

from app.api.dependencies import CurrentUser
from app.core.logging import get_logger
from app.schemas.common import MessageResponse
from app.schemas.financial import (
    CalculationRequest,
    CalculationResult,
)
from app.services.calculator import CalculationError, Calculator

router = APIRouter()
logger = get_logger(__name__)


@router.post("/financial/calculate", response_model=CalculationResult)
async def calculate(body: CalculationRequest, current_user: CurrentUser) -> CalculationResult:
    """Perform a deterministic financial calculation.

    The calculation is done in Python, NOT by the LLM.
    The result includes the formula and inputs for verification.
    """
    calculator = Calculator()
    try:
        result = calculator.calculate(body.operation, body.inputs)
    except CalculationError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)
        ) from exc

    logger.info(
        "Calculation: %s(%s) = %s",
        body.operation,
        body.inputs,
        result["result"],
    )
    return CalculationResult(**result)


@router.post("/financial", response_model=MessageResponse)
async def financial_analysis(current_user: CurrentUser) -> MessageResponse:
    """Run a structured financial analysis (planned for Phase 7)."""
    return MessageResponse(
        message="Not implemented yet",
        detail=(
            "Structured financial analysis (revenue, profitability, margins, "
            "growth, debt, cash flow) is planned for a later phase. "
            "Use POST /api/research/ask for evidence-grounded answers."
        ),
    )


@router.post("/compare", response_model=MessageResponse)
async def compare_analysis(current_user: CurrentUser) -> MessageResponse:
    """Compare metrics across periods or companies (planned for Phase 7)."""
    return MessageResponse(
        message="Not implemented yet",
        detail=("Cross-document comparison is planned for a later phase."),
    )
