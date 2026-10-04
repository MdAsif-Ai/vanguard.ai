"""Unit tests for the page-aware chunker (pure logic, no dependencies)."""

from app.services.ingestion import build_chunks


def test_short_segments_same_page_merge() -> None:
    segments = [(3, "Revenue was "), (3, "$416B in FY2025.")]
    chunks = build_chunks(segments)
    assert len(chunks) == 1
    assert chunks[0].page == 3
    assert "Revenue" in chunks[0].text
    assert "$416B" in chunks[0].text


def test_pages_stay_separate() -> None:
    chunks = build_chunks([(1, "page one text"), (2, "page two text")])
    assert len(chunks) == 2
    assert [chunk.page for chunk in chunks] == [1, 2]
    assert [chunk.index for chunk in chunks] == [0, 1]


def test_long_page_splits_within_limit() -> None:
    text = ("word " * 600).strip()  # 3000 chars
    chunks = build_chunks([(7, text)], max_chars=1000, overlap=200)
    assert len(chunks) >= 3
    assert all(chunk.page == 7 for chunk in chunks)
    assert all(len(chunk.text) <= 1000 for chunk in chunks)
    assert [chunk.index for chunk in chunks] == list(range(len(chunks)))
    assert all(chunk.text in text for chunk in chunks)


def test_empty_and_blank_segments() -> None:
    assert build_chunks([]) == []
    assert build_chunks([(1, "   "), (1, "")]) == []


def test_plain_text_has_no_page() -> None:
    chunks = build_chunks([(None, "some plain text")])
    assert len(chunks) == 1
    assert chunks[0].page is None
