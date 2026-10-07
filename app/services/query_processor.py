"""Query preprocessing: cleaning, entity extraction, query expansion.

Improves retrieval quality by normalizing queries and extracting
financial entities (companies, metrics, periods, fiscal years).
"""

import re
from dataclasses import dataclass, field

from app.core.logging import get_logger

logger = get_logger(__name__)


@dataclass
class ProcessedQuery:
    """A preprocessed query with extracted entities."""

    original: str
    cleaned: str
    company: str | None = None
    metric: str | None = None
    period: str | None = None
    fiscal_year: int | None = None
    question_type: str = "general"
    keywords: list[str] = field(default_factory=list)
    expanded_queries: list[str] = field(default_factory=list)


# Common financial metrics and their synonyms
METRIC_SYNONYMS: dict[str, list[str]] = {
    "revenue": ["revenue", "sales", "top line", "net sales", "total revenue", "income"],
    "operating_income": [
        "operating income",
        "operating profit",
        "operating earnings",
        "ebit",
    ],
    "net_income": [
        "net income",
        "net profit",
        "earnings",
        "net earnings",
        "bottom line",
        "profit",
    ],
    "gross_margin": ["gross margin", "gross profit margin", "gross profit"],
    "operating_margin": [
        "operating margin",
        "operating profit margin",
    ],
    "eps": ["eps", "earnings per share", "diluted eps", "per share"],
    "cash_flow": [
        "cash flow",
        "operating cash flow",
        "free cash flow",
        "ocf",
        "fcf",
    ],
    "debt": ["debt", "long-term debt", "short-term debt", "borrowings"],
    "assets": ["assets", "total assets", "total assets"],
    "liabilities": ["liabilities", "total liabilities"],
    "r_d": ["r&d", "research and development", "research"],
    "capex": ["capex", "capital expenditure", "capital expenditures"],
    "dividend": ["dividend", "dividends", "payout"],
}

PERIOD_PATTERNS = [
    (r"fy\s*(\d{4})", "fiscal year"),
    (r"fiscal\s*(?:year\s*)?(\d{4})", "fiscal year"),
    (r"(\d{4})\s*(?:annual|year)", "annual"),
    (r"q([1-4])\s*(\d{4})", "quarter"),
    (r"quarter\s*([1-4])", "quarter"),
    (r"(?:in|during|for)\s*(\d{4})", "year"),
]

QUESTION_TYPE_PATTERNS = [
    (r"how\s+(?:did|has|much|many|what)", "comparison", 0),
    (r"(?:percentage|percent|%|change|growth|increase|decrease)", "calculation", 1),
    (r"(?:why|because|reason|cause|driver)", "causal", 2),
    (r"(?:compare|comparison|versus|vs\.?|between)", "comparison", 3),
    (r"(?:risk|risk factor|concern|threat)", "risk", 4),
    (r"(?:trend|over time|historical|past)", "temporal", 5),
    (r"(?:summarize|summary|overview|key points)", "summarization", 6),
]


def clean_query(query: str) -> str:
    """Normalize the query text."""
    cleaned = query.strip()
    cleaned = re.sub(r"\s+", " ", cleaned)
    cleaned = re.sub(r"[^\w\s\$\%\.\,\-\&\(\)]", "", cleaned)
    return cleaned


def extract_company(query: str) -> str | None:
    """Extract company name from the query."""
    companies = [
        "Google",
        "Alphabet",
        "Apple",
        "Microsoft",
        "Amazon",
        "Meta",
        "Tesla",
        "Nvidia",
        "Netflix",
        "Oracle",
        "Salesforce",
        "IBM",
        "Intel",
    ]
    for company in companies:
        if company.lower() in query.lower():
            return company
    return None


def extract_metric(query: str) -> str | None:
    """Extract the financial metric being asked about."""
    query_lower = query.lower()
    for metric, synonyms in METRIC_SYNONYMS.items():
        for synonym in synonyms:
            if synonym.lower() in query_lower:
                return metric
    return None


def extract_period(query: str) -> tuple[str | None, int | None]:
    """Extract time period and fiscal year from the query."""
    for pattern, label in PERIOD_PATTERNS:
        match = re.search(pattern, query, re.IGNORECASE)
        if match:
            year = None
            for group in match.groups():
                if group and group.isdigit() and len(group) == 4:
                    year = int(group)
                    break
            if year is None and match.group(1) and match.group(1).isdigit():
                year = int(match.group(1))
            return label, year

    year_match = re.search(r"\b(19|20)\d{2}\b", query)
    if year_match:
        return "year", int(year_match.group())

    return None, None


def extract_question_type(query: str) -> str:
    """Classify the type of financial question."""
    best_type = "general"
    best_priority = 100
    for pattern, q_type, priority in QUESTION_TYPE_PATTERNS:
        if re.search(pattern, query, re.IGNORECASE) and priority < best_priority:
            best_type = q_type
            best_priority = priority
    return best_type


def extract_keywords(query: str) -> list[str]:
    """Extract significant keywords (removing stopwords)."""
    stopwords = {
        "the",
        "a",
        "an",
        "in",
        "on",
        "at",
        "to",
        "for",
        "of",
        "and",
        "or",
        "is",
        "are",
        "was",
        "were",
        "be",
        "been",
        "how",
        "what",
        "which",
        "who",
        "when",
        "where",
        "why",
        "does",
        "did",
        "do",
        "can",
        "could",
        "will",
        "would",
        "should",
        "has",
        "have",
        "had",
        "with",
        "from",
        "by",
        "as",
        "this",
        "that",
        "these",
        "those",
        "it",
        "its",
    }
    words = re.findall(r"\b[a-z&]{3,}\b", query.lower())
    return [w for w in words if w not in stopwords]


def expand_query(query: str, company: str | None, metric: str | None) -> list[str]:
    """Generate expanded queries for better retrieval coverage."""
    expansions = [query]

    if metric and metric in METRIC_SYNONYMS:
        for synonym in METRIC_SYNONYMS[metric][:3]:
            if synonym.lower() not in query.lower():
                expanded = query
                if metric.lower() in query.lower():
                    expanded = re.sub(re.escape(metric), synonym, query, flags=re.IGNORECASE)
                    if expanded != query:
                        expansions.append(expanded)

    if company:
        aliases = {
            "Google": ["Alphabet", "Google"],
            "Alphabet": ["Google", "Alphabet"],
            "Apple": ["Apple"],
        }
        for alias in aliases.get(company, [company]):
            if alias.lower() not in query.lower():
                expansions.append(f"{query} {alias}")

    return expansions[:5]


def process_query(query: str) -> ProcessedQuery:
    """Full query preprocessing pipeline."""
    cleaned = clean_query(query)
    company = extract_company(cleaned)
    metric = extract_metric(cleaned)
    period, fiscal_year = extract_period(cleaned)
    question_type = extract_question_type(cleaned)
    keywords = extract_keywords(cleaned)
    expanded = expand_query(cleaned, company, metric)

    return ProcessedQuery(
        original=query,
        cleaned=cleaned,
        company=company,
        metric=metric,
        period=period,
        fiscal_year=fiscal_year,
        question_type=question_type,
        keywords=keywords,
        expanded_queries=expanded,
    )
