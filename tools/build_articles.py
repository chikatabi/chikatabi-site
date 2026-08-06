#!/usr/bin/env python3
"""articles/*.md を HTML に変換して記事ページと一覧を作る。

    python3 -m pip install --user markdown   # 初回のみ
    python3 tools/build_articles.py

生成物（どちらもコミットする。GitHub Pagesはビルドを走らせないため）:
    articles/<slug>/index.html   記事ページ
    articles/index.html          記事一覧

**生成されたHTMLを直接編集しないこと。** 次回のビルドで上書きされる。
直すのは articles/<slug>.md のほう。

台本ボットから記事を出す場合も、.md を1本置いてこれを実行するだけでよい。
"""

from __future__ import annotations

import html
import re
import sys
from datetime import date
from pathlib import Path

try:
    import markdown
except ImportError:
    sys.exit("markdown が入っていません: python3 -m pip install --user markdown")

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "articles"
SITE = "https://lovely-chikatabi.com"

HEAD = """<title>{title}</title>
<meta name="description" content="{desc}">
<link rel="canonical" href="{url}">
<meta property="og:type" content="{og_type}">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{desc}">
<meta property="og:url" content="{url}">
<link rel="stylesheet" href="/assets/site.css">
<div class="wrap">
  <header class="site-head">
    <a class="site-name" href="/">CHIKATABI</a>
    <nav class="site-nav">
      <a href="/articles/">記事</a>
      <a href="/sfc/">SFC判定ツール</a>
    </nav>
  </header>
"""

FOOT = """
  <footer class="site-foot">
    <p>CHIKATABI ／ 大人のための旅の教科書</p>
    <p><a href="https://www.youtube.com/@CHIKATABI-LOVELY">YouTube</a> ・
       <a href="https://lin.ee/S8sN3LM">公式LINE</a> ・
       <a href="/sfc/">SFC PLUS/LITE 判定ツール</a></p>
  </footer>
</div>
"""


def parse(path: Path) -> dict:
    """先頭の `---` で囲まれた `key: value` をメタ情報として読む"""
    raw = path.read_text(encoding="utf-8")
    m = re.match(r"^---\s*\n(.*?)\n---\s*\n(.*)$", raw, re.S)
    if not m:
        raise SystemExit(f"{path.name}: 先頭のメタ情報（--- で囲む）がありません")

    meta = {}
    for line in m.group(1).splitlines():
        if ":" in line and not line.lstrip().startswith("#"):
            k, v = line.split(":", 1)
            meta[k.strip()] = v.strip().strip('"')

    for required in ("title", "description", "date"):
        if not meta.get(required):
            raise SystemExit(f"{path.name}: メタ情報に {required} がありません")

    meta["slug"] = meta.get("slug") or path.stem
    meta["body"] = m.group(2)
    return meta


def render(meta: dict) -> str:
    md = markdown.Markdown(extensions=["tables", "fenced_code", "sane_lists", "attr_list"])
    body = md.convert(meta["body"])
    # 横に長い表はページ全体を横スクロールさせず、表の中だけで収める
    body = re.sub(r"<table>", '<div class="table-wrap"><table>', body)
    body = re.sub(r"</table>", "</table></div>", body)

    url = f"{SITE}/articles/{meta['slug']}/"
    updated = meta.get("updated")
    stamp = f"公開 {meta['date']}" + (f" ／ 更新 {updated}" if updated else "")

    return (
        HEAD.format(title=html.escape(meta["title"]), desc=html.escape(meta["description"]),
                    url=url, og_type="article")
        + '  <article class="article">\n'
        + f'    <p class="meta">{html.escape(stamp)}</p>\n'
        + f'    <h1>{html.escape(meta["title"])}</h1>\n'
        + body
        + "\n  </article>\n"
        + FOOT
    )


def render_index(items: list[dict]) -> str:
    rows = "\n".join(
        f'    <div class="list-item">\n'
        f'      <p class="meta">{html.escape(m["date"])}</p>\n'
        f'      <a href="/articles/{m["slug"]}/">{html.escape(m["title"])}</a>\n'
        f'      <p>{html.escape(m["description"])}</p>\n'
        f'    </div>'
        for m in items
    )
    return (
        HEAD.format(title="記事一覧｜CHIKATABI",
                    desc="ANA SFC・JAL JGCの上級会員修行と、旅の実務についての記事一覧。",
                    url=f"{SITE}/articles/", og_type="website")
        + '  <article class="article">\n    <h1>記事</h1>\n  </article>\n'
        + f'  <div class="list">\n{rows}\n  </div>\n'
        + FOOT
    )


def main() -> int:
    if not SRC.exists():
        sys.exit("articles/ がありません")

    metas = [parse(p) for p in sorted(SRC.glob("*.md"))]
    if not metas:
        sys.exit("articles/ に .md がありません")

    slugs = [m["slug"] for m in metas]
    if len(slugs) != len(set(slugs)):
        dup = sorted({s for s in slugs if slugs.count(s) > 1})
        sys.exit(f"slugが重複しています: {dup}")

    for m in metas:
        out = SRC / m["slug"] / "index.html"
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(render(m), encoding="utf-8")
        print(f"  {out.relative_to(ROOT)}")

    metas.sort(key=lambda m: m["date"], reverse=True)
    (SRC / "index.html").write_text(render_index(metas), encoding="utf-8")
    print(f"  articles/index.html （{len(metas)}件）")

    # 検索エンジン向けのsitemap
    urls = [f"{SITE}/", f"{SITE}/sfc/", f"{SITE}/articles/"] + [
        f"{SITE}/articles/{m['slug']}/" for m in metas
    ]
    (ROOT / "sitemap.xml").write_text(
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        + "".join(f"  <url><loc>{u}</loc></url>\n" for u in urls)
        + "</urlset>\n",
        encoding="utf-8",
    )
    print(f"  sitemap.xml （{len(urls)}件）")
    return 0


if __name__ == "__main__":
    sys.exit(main())
