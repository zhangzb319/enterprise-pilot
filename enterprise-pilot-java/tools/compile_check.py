"""编译校验:javac 全量编译 src/main/java，失败即非零退出。

用法:  python tools/compile_check.py
"""

import subprocess
import sys
from pathlib import Path

from _classpath import ROOT, build_classpath, source_files

OUT = ROOT / "target" / "javac-check"


def main() -> int:
    OUT.mkdir(parents=True, exist_ok=True)
    args_file = ROOT / "target" / "javac-args.txt"
    sources = source_files()
    classpath = build_classpath([ROOT / "target" / "classes"])

    with open(args_file, "w", encoding="utf-8") as f:
        f.write('-cp "%s"\n' % classpath)
        f.write('-d "%s"\n' % OUT.as_posix())
        f.write("-nowarn\n-proc:full\n-encoding UTF-8\n")
        for source in sources:
            f.write('"%s"\n' % source.as_posix())

    print(f"源文件 {len(sources)} 个")
    result = subprocess.run(["javac", "@" + str(args_file)], capture_output=True)
    if result.returncode == 0:
        print("编译通过")
        return 0
    print("编译失败：")
    print(result.stdout.decode("utf-8", "replace")[-4000:])
    print((result.stderr or b"").decode("gbk", "replace")[-4000:])
    return result.returncode


if __name__ == "__main__":
    sys.exit(main())
