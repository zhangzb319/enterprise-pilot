"""本机 Maven 损坏时的 Java 构建辅助。

Maven 的 launcher 主类在本机缺失（MAVEN_HOME 与 chocolatey 两套都坏），
所以直接用 javac + 本地 m2 仓库完成编译与运行，保证改动仍可验证。

仓库里同一 artifact 往往存在多个版本，全塞进 classpath 会让 javac 取到旧版本
（例如 spring-security 6.x 的 requestMatchers(String...) 与 Boot 4 的 7.x 不兼容）。
这里按 artifactId 归并，优先取 pom 显式锁定的版本、其次是 parent 声明的 Boot 版本，
最后才取最高版本；并让锁定版本排在 classpath 前面。
"""

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
M2 = Path.home() / ".m2" / "repository"

# 仓库里混着多个版本、且新版本删掉了旧 API 的构件。
# 这不是项目配置,只是本地直接跑 jar 时用来逼近 Maven 的实际解析结果:
# pagehelper 5.3.3 依赖 jsqlparser 的 SelectBody,而该类型在 4.9 已被移除。
EXTRA_PINS = {"jsqlparser": "4.6"}


def _version_key(version: str) -> tuple:
    return tuple(int(part) if part.isdigit() else 0 for part in re.split(r"[.\-]", version))


def _pom_info() -> tuple[dict, str | None]:
    text = (ROOT / "pom.xml").read_text(encoding="utf-8")
    parent = re.search(r"<parent>(.*?)</parent>", text, re.S)
    parent_version = None
    if parent:
        match = re.search(r"<version>(.*?)</version>", parent.group(1))
        parent_version = match.group(1).strip() if match else None

    pinned = {}
    for block in re.findall(r"<dependency>(.*?)</dependency>", text, re.S):
        artifact = re.search(r"<artifactId>(.*?)</artifactId>", block)
        version = re.search(r"<version>(.*?)</version>", block)
        if artifact and version:
            pinned[artifact.group(1).strip()] = version.group(1).strip()
    return pinned, parent_version


def _choose(candidates: list[Path], artifact: str, pinned: dict, parent_version: str | None) -> Path:
    by_version = {jar.parent.name: jar for jar in candidates}
    if artifact in pinned and pinned[artifact] in by_version:
        return by_version[pinned[artifact]]
    if artifact in EXTRA_PINS and EXTRA_PINS[artifact] in by_version:
        return by_version[EXTRA_PINS[artifact]]
    # Spring Boot 自家的构件由 parent 统一管理版本，仓库里常有更新的快照，需按 parent 对齐
    if "/org/springframework/boot/" in candidates[0].as_posix() and parent_version in by_version:
        return by_version[parent_version]
    return max(candidates, key=lambda jar: _version_key(jar.parent.name))


def build_classpath(extra_dirs: list[Path] | None = None) -> str:
    pinned, parent_version = _pom_info()

    grouped: dict[Path, list[Path]] = {}
    for jar in M2.rglob("*.jar"):
        grouped.setdefault(jar.parent.parent, []).append(jar)

    chosen = [_choose(jars, key.name, pinned, parent_version) for key, jars in grouped.items()]
    # 锁定版本优先：仓库里还躺着 jjwt 0.9.1 这类旧 artifact，
    # 它与 jjwt-api 提供同名类 io.jsonwebtoken.JwtBuilder，靠前的会被优先解析。
    chosen.sort(key=lambda jar: (jar.parent.parent.name not in pinned, jar.as_posix()))

    entries = [p.as_posix() for p in (extra_dirs or [])] + [jar.as_posix() for jar in chosen]
    return ";".join(entries)


def source_files() -> list[Path]:
    return sorted((ROOT / "src" / "main" / "java").rglob("*.java"))
