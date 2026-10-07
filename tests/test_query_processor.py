"""Unit tests for query preprocessing (pure logic, no dependencies)."""

from app.services.query_processor import (
    clean_query,
    extract_company,
    extract_metric,
    extract_period,
    extract_question_type,
    process_query,
)


def test_clean_query_normalizes_whitespace() -> None:
    assert clean_query("  what   was    revenue  ") == "what was revenue"


def test_clean_query_removes_special_chars() -> None:
    assert "what was revenue" in clean_query("what was revenue?!@#")


def test_extract_company_google() -> None:
    assert extract_company("What was Google revenue in 2025?") == "Google"


def test_extract_company_alphabet() -> None:
    assert extract_company("How did Alphabet perform?") == "Alphabet"


def test_extract_company_none() -> None:
    assert extract_company("What is the interest rate?") is None


def test_extract_metric_revenue() -> None:
    assert extract_metric("What was total revenue?") == "revenue"
    assert extract_metric("What were net sales?") == "revenue"


def test_extract_metric_operating_income() -> None:
    assert extract_metric("What was operating profit?") == "operating_income"


def test_extract_metric_eps() -> None:
    assert extract_metric("What was diluted EPS?") == "eps"


def test_extract_period_fy2025() -> None:
    _, year = extract_period("What happened in FY2025?")
    assert year == 2025


def test_extract_period_quarter() -> None:
    _, year = extract_period("Q3 2025 results")
    assert year == 2025


def test_question_type_comparison() -> None:
    assert extract_question_type("How did revenue change?") == "comparison"


def test_question_type_calculation() -> None:
    assert extract_question_type("What was the percentage growth?") == "calculation"


def test_full_process_query() -> None:
    result = process_query("How did Google revenue change from 2024 to 2025?")
    assert result.company == "Google"
    assert result.metric == "revenue"
    assert result.question_type == "comparison"
    assert result.keywords is not None
    assert len(result.keywords) > 0
