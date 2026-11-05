"""用编译产物直接启动 Spring Boot 应用(Maven 损坏时的替代方案)。

classpath 优先取 surefire 报告里记录的 `java.class.path` —— 那是 Maven 真实解析出的
依赖集合。直接扫描 m2 仓库会把无关 jar 一并带入,触发多余的自动配置(例如 JPA),
导致应用起不来。

前置: 先执行 python tools/compile_check.py
用法:  python tools/run_backend.py
"""

import os
import re
import subprocess
import sys
from pathlib import Path

from _classpath import ROOT

MAIN_CLASS = "com.zhang.enterprisepilotjava.EnterprisePilotJavaApplication"
ENV_FILE = ROOT / ".env"
REQUIRED = ("DB_URL", "DB_USERNAME", "DB_PASSWORD", "JWT_SECRET")
SUREFIRE_DIR = ROOT / "target" / "surefire-reports"


def load_env() -> dict:
    values = {}
    for line in ENV_FILE.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key.strip()] = value.strip()
    missing = [key for key in REQUIRED if not values.get(key)]
    if missing:
        raise SystemExit(f".env 缺少必需变量: {', '.join(missing)}")
    return values


def classpath_from_surefire() -> list[str] | None:
    """从 surefire XML 的 java.class.path 属性还原依赖列表。"""
    if not SUREFIRE_DIR.is_dir():
        return None
    for report in SUREFIRE_DIR.glob("TEST-*.xml"):
        match = re.search(r'name="java\.class\.path" value="([^"]+)"', report.read_text(encoding="utf-8", errors="replace"))
        if not match:
            continue
        entries = []
        for entry in match.group(1).split(";"):
            path = Path(entry)
            # target/classes 是旧编译产物,换成当前源码的编译结果;test-classes 运行时不需要
            if path.name == "test-classes":
                continue
            if path.name == "classes" and path.parent.name == "target":
                continue
            entries.append(path.as_posix())
        return entries
    return None


def main() -> int:
    classes = ROOT / "target" / "javac-check"
    if not (classes / "com" / "zhang" / "enterprisepilotjava" / "EnterprisePilotJavaApplication.class").exists():
        raise SystemExit("未找到编译产物,请先执行 python tools/compile_check.py")

    dependencies = classpath_from_surefire()
    if not dependencies:
        raise SystemExit(
            "未找到 target/surefire-reports 里的 classpath。\n"
            "直接扫描 m2 仓库会引入无关依赖导致启动失败,请先修复 Maven 并执行一次 mvn test。"
        )

    # 新编译的类在前,其后是原 target/classes(提供 application.yml 等资源),最后是依赖
    entries = [classes.as_posix(), (ROOT / "target" / "classes").as_posix()] + dependencies

    env = os.environ.copy()
    env.update(load_env())

    # classpath 有几百个 jar,直接拼命令行会超过 Windows 的 32K 限制,改用参数文件
    args_file = ROOT / "target" / "java-args.txt"
    with open(args_file, "w", encoding="utf-8") as f:
        f.write('-cp "%s"\n' % ";".join(entries))
        f.write(MAIN_CLASS + "\n")

    print(f"依赖 {len(dependencies)} 项,启动 {MAIN_CLASS}")
    return subprocess.call(["java", "@" + str(args_file)], env=env)


if __name__ == "__main__":
    sys.exit(main())
