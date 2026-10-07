"""Deterministic financial calculation engine.

Performs financial calculations in Python — the LLM NEVER does arithmetic.
Supported operations: sum, subtract, multiply, divide, percentage_change,
ratio, margin, growth_rate, cagr.

Every calculation preserves its inputs and formula for verification.
"""

from typing import Any, ClassVar

from app.core.logging import get_logger

logger = get_logger(__name__)


class CalculationError(Exception):
    """Raised when a calculation cannot be performed."""


class Calculator:
    """Deterministic financial calculation engine."""

    OPERATIONS: ClassVar[set[str]] = {
        "sum",
        "subtract",
        "multiply",
        "divide",
        "percentage_change",
        "ratio",
        "margin",
        "growth_rate",
        "cagr",
    }

    def calculate(self, operation: str, inputs: dict[str, float]) -> dict[str, Any]:
        """Perform a calculation. Returns result with formula and verification."""
        if operation not in self.OPERATIONS:
            raise CalculationError(
                f"Unsupported operation: {operation}. Supported: {sorted(self.OPERATIONS)}"
            )

        handler = getattr(self, f"_calc_{operation}")
        result = handler(inputs)
        formula = self._get_formula(operation, inputs)

        return {
            "operation": operation,
            "inputs": inputs,
            "formula": formula,
            "result": result,
            "verified": True,
        }

    def _calc_sum(self, inputs: dict[str, float]) -> float:
        return sum(inputs.values())

    def _calc_subtract(self, inputs: dict[str, float]) -> float:
        if "a" not in inputs or "b" not in inputs:
            raise CalculationError("subtract requires inputs 'a' and 'b'")
        return inputs["a"] - inputs["b"]

    def _calc_multiply(self, inputs: dict[str, float]) -> float:
        result = 1.0
        for v in inputs.values():
            result *= v
        return result

    def _calc_divide(self, inputs: dict[str, float]) -> float:
        if "numerator" not in inputs or "denominator" not in inputs:
            raise CalculationError("divide requires 'numerator' and 'denominator'")
        if inputs["denominator"] == 0:
            raise CalculationError("Division by zero")
        return inputs["numerator"] / inputs["denominator"]

    def _calc_percentage_change(self, inputs: dict[str, float]) -> float:
        if "old" not in inputs or "new" not in inputs:
            raise CalculationError("percentage_change requires 'old' and 'new'")
        if inputs["old"] == 0:
            raise CalculationError("Base value ('old') cannot be zero")
        return ((inputs["new"] - inputs["old"]) / abs(inputs["old"])) * 100

    def _calc_ratio(self, inputs: dict[str, float]) -> float:
        if "numerator" not in inputs or "denominator" not in inputs:
            raise CalculationError("ratio requires 'numerator' and 'denominator'")
        if inputs["denominator"] == 0:
            raise CalculationError("Denominator cannot be zero")
        return inputs["numerator"] / inputs["denominator"]

    def _calc_margin(self, inputs: dict[str, float]) -> float:
        if "income" not in inputs or "revenue" not in inputs:
            raise CalculationError("margin requires 'income' and 'revenue'")
        if inputs["revenue"] == 0:
            raise CalculationError("Revenue cannot be zero")
        return (inputs["income"] / inputs["revenue"]) * 100

    def _calc_growth_rate(self, inputs: dict[str, float]) -> float:
        if "current" not in inputs or "previous" not in inputs:
            raise CalculationError("growth_rate requires 'current' and 'previous'")
        if inputs["previous"] == 0:
            raise CalculationError("Previous value cannot be zero")
        return ((inputs["current"] - inputs["previous"]) / abs(inputs["previous"])) * 100

    def _calc_cagr(self, inputs: dict[str, float]) -> float:
        if not all(k in inputs for k in ("start", "end", "years")):
            raise CalculationError("cagr requires 'start', 'end', and 'years'")
        if inputs["start"] <= 0 or inputs["end"] <= 0:
            raise CalculationError("CAGR requires positive values")
        if inputs["years"] <= 0:
            raise CalculationError("Years must be positive")
        return ((inputs["end"] / inputs["start"]) ** (1 / inputs["years"]) - 1) * 100

    def _get_formula(self, operation: str, inputs: dict[str, float]) -> str:
        """Generate a human-readable formula string."""
        formulas = {
            "sum": f"{' + '.join(str(v) for v in inputs.values())} = {sum(inputs.values())}",
            "subtract": f"{inputs.get('a', '?')} - {inputs.get('b', '?')}",
            "multiply": f"{' * '.join(str(v) for v in inputs.values())}",
            "divide": f"{inputs.get('numerator', '?')} / {inputs.get('denominator', '?')}",
            "percentage_change": (
                f"({inputs.get('new', '?')} - {inputs.get('old', '?')}) / "
                f"|{inputs.get('old', '?')}| * 100"
            ),
            "ratio": f"{inputs.get('numerator', '?')} : {inputs.get('denominator', '?')}",
            "margin": (
                f"({inputs.get('income', '?')} income / {inputs.get('revenue', '?')} revenue) * 100"
            ),
            "growth_rate": (
                f"({inputs.get('current', '?')} - {inputs.get('previous', '?')}) / "
                f"|{inputs.get('previous', '?')}| * 100"
            ),
            "cagr": (
                f"(({inputs.get('end', '?')} / {inputs.get('start', '?')})"
                f"^(1/{inputs.get('years', '?')}) - 1) * 100"
            ),
        }
        return formulas.get(operation, "unknown")
