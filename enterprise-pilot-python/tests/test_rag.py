from app.services.rag_service import split_text


def test_split_text_keeps_all_content() -> None:
    content = "a" * 1800
    chunks = split_text(content, size=800, overlap=120)
    assert len(chunks) == 3
    assert chunks[0] == "a" * 800
    assert chunks[-1]
