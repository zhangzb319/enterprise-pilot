from app.services.rag_service import split_text


def _covered_positions(length: int, chunks: list[str], size: int, overlap: int) -> set[int]:
    """按第 i 块起点 i*(size-overlap) 的规则,收集所有被切块覆盖的字符下标。"""
    positions: set[int] = set()
    for i, chunk in enumerate(chunks):
        start = i * (size - overlap)
        positions.update(range(start, start + len(chunk)))
    return positions


def test_split_text_keeps_all_content() -> None:
    content = "a" * 1800
    chunks = split_text(content, size=800, overlap=120)
    assert len(chunks) == 3
    assert chunks[0] == "a" * 800
    assert chunks[-1]


def test_split_text_drops_degenerate_tail() -> None:
    # 长度恰好对齐步长时,旧实现会多出一块长度 <= overlap 的尾块(纯重复上文)
    assert split_text("a" * 800, size=800, overlap=120) == ["a" * 800]

    chunks = split_text("a" * 1361, size=800, overlap=120)
    assert [len(chunk) for chunk in chunks] == [800, 681]


def test_split_text_never_drops_only_chunk() -> None:
    # 整块文本 <= overlap 时也必须保留——否则短文档会被切到什么都不剩
    assert split_text("a" * 120, size=800, overlap=120) == ["a" * 120]
    assert split_text("a", size=800, overlap=120) == ["a"]


def test_split_text_covers_full_text() -> None:
    # 丢尾块不能丢内容:任意长度下,每个字符位置都至少属于一个块
    for length in (1, 119, 120, 800, 801, 920, 1360, 1361, 1800, 2480):
        content = "b" * length
        chunks = split_text(content, size=800, overlap=120)
        assert chunks
        assert _covered_positions(length, chunks, 800, 120) == set(range(length))
