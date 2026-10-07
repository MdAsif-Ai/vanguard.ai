"""Unit tests for the deterministic calculation engine (pure logic)."""

import pytest

from app.services.calculator import CalculationError, Calculator


@pytest.fixture
def calc() -> Calculator:
    return Calculator()


def test_sum(calc: Calculator) -> None:
    result = calc.calculate("sum", {"a": 10, "b": 20, "c": 30})
    assert result["result"] == 60


def test_subtract(calc: Calculator) -> None:
    result = calc.calculate("subtract", {"a": 100, "b": 30})
    assert result["result"] == 70


def test_divide(calc: Calculator) -> None:
    result = calc.calculate("divide", {"numerator": 100, "denominator": 4})
    assert result["result"] == 25


def test_divide_by_zero(calc: Calculator) -> None:
    with pytest.raises(CalculationError):
        calc.calculate("divide", {"numerator": 100, "denominator": 0})


def test_percentage_change(calc: Calculator) -> None:
    result = calc.calculate("percentage_change", {"old": 100, "new": 120})
    assert result["result"] == 20.0


def test_percentage_change_negative(calc: Calculator) -> None:
    result = calc.calculate("percentage_change", {"old": 100, "new": 80})
    assert result["result"] == -20.0


def test_percentage_change_zero_base(calc: Calculator) -> None:
    with pytest.raises(CalculationError):
        calc.calculate("percentage_change", {"old": 0, "new": 100})


def test_margin(calc: Calculator) -> None:
    result = calc.calculate("margin", {"income": 30, "revenue": 400})
    assert result["result"] == 7.5


def test_growth_rate(calc: Calculator) -> None:
    result = calc.calculate("growth_rate", {"current": 402.8, "previous": 350.0})
    assert abs(result["result"] - 15.0857) < 0.01


def test_cagr(calc: Calculator) -> None:
    result = calc.calculate("cagr", {"start": 100, "end": 200, "years": 2})
    assert abs(result["result"] - 41.42) < 0.01


def test_formula_is_populated(calc: Calculator) -> None:
    result = calc.calculate("margin", {"income": 30, "revenue": 400})
    assert "30" in result["formula"]
    assert "400" in result["formula"]


def test_result_is_verified(calc: Calculator) -> None:
    result = calc.calculate("sum", {"a": 1, "b": 2})
    assert result["verified"] is True


def test_unsupported_operation(calc: Calculator) -> None:
    with pytest.raises(CalculationError):
        calc.calculate("square_root", {"x": 16})


def test_result_preserves_inputs(calc: Calculator) -> None:
    inputs = {"old": 100, "new": 150}
    result = calc.calculate("percentage_change", inputs)
    assert result["inputs"] == inputs
