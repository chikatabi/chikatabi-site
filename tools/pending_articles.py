#!/usr/bin/env python3
"""記事化がまだ済んでいない台本を一覧する。

3つの台本ボットの produced.tsv を読み、
「公開予定日をすでに過ぎている」かつ「まだ記事になっていない」ものを出す。

    python3 tools/pending_articles.py            # 対象を一覧
    python3 tools/pending_articles.py --json     # 機械可読

記事化済みかどうかは articles/*.md の front matter の `source:` で判定する。
別途の状態ファイルは持たない（二重管理になり、片方だけ更新される事故が起きるため）。

**公開予定日を過ぎたものだけを対象にするのは意図的。**
台本は「CHIKAの最終確認待ち」として出力される決まりで、確認時に内容が変わる。
記事はGoogleドキュメント（確認済みの最終版）から作るので、動画公開後に回す。
"""

from __future__ import annotations

import argparse
import csv
import json
import re
import sys
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ARTICLES = ROOT / "articles"

# (ラベル, ボットの作業ディレクトリ)
SOURCES = [
    ("メイン", Path.home() / "chikatabi-script-bot"),
    ("JGC", Path.home() / "chikatabi-jgc-script-bot"),
    ("タビノオト", Path.home() / "chikatabi-tabinooto-bot"),
]


def find_drafts(bot_dir: Path, publish: str) -> list[str]:
    """公開予定日で始まるローカル下書きを新しい順に返す。

    最終版のGoogleドキュメントからは「■ データ出典」が削除されているため、
    出典はここから取る（本文は使わない）。詳細は ARTICLE_RULES.md の 0 と 2。
    """
    hits = sorted(bot_dir.glob(f"drafts/{publish}*"), key=lambda p: p.stat().st_mtime, reverse=True)
    return [str(p) for p in hits]


def done_sources() -> set[str]:
    """すでに記事になっている台本のGoogleドキュメントURL"""
    out = set()
    for md in ARTICLES.glob("*.md"):
        m = re.match(r"^---\s*\n(.*?)\n---", md.read_text(encoding="utf-8"), re.S)
        if not m:
            continue
        for line in m.group(1).splitlines():
            if line.strip().startswith("source:"):
                out.add(line.split(":", 1)[1].strip().strip('"'))
    return out


def doc_id(url: str) -> str:
    m = re.search(r"/document/d/([A-Za-z0-9_-]+)", url or "")
    return m.group(1) if m else ""


def collect(today: str) -> list[dict]:
    done = done_sources()
    done_ids = {doc_id(u) for u in done if doc_id(u)}
    items: list[dict] = []

    for label, bot_dir in SOURCES:
        path = bot_dir / "produced.tsv"
        if not path.exists():
            print(f"  ⚠️ {label}: {path} がありません", file=sys.stderr)
            continue
        with open(path, encoding="utf-8") as f:
            for row in csv.reader(f, delimiter="\t"):
                # 列は3ボット共通の並び：作成日時 / 公開予定日 / 枠 / 分類 / タイトル / DocURL
                if len(row) < 6 or row[0].startswith("作成日時"):
                    continue
                created, publish, slot, kind, title, url = row[:6]
                if publish > today:
                    continue  # まだ公開前。確認前の内容なので触らない
                if url in done or (doc_id(url) and doc_id(url) in done_ids):
                    continue
                items.append({
                    "channel": label, "created": created, "publish": publish,
                    "slot": slot, "kind": kind, "title": title, "doc": url,
                    # 出典を取るためのローカル下書き。本文には使わない
                    "drafts": find_drafts(bot_dir, publish),
                })

    items.sort(key=lambda x: x["publish"])
    return items


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--json", action="store_true")
    ap.add_argument("--today", default=date.today().isoformat(),
                    help="判定基準日（既定は今日）")
    args = ap.parse_args()

    items = collect(args.today)

    if args.json:
        print(json.dumps(items, ensure_ascii=False, indent=1))
        return 0

    if not items:
        print(f"記事化の対象はありません（基準日 {args.today}）")
        return 0

    print(f"記事化がまだのもの: {len(items)}件（基準日 {args.today}）\n")
    for it in items:
        print(f"  [{it['channel']}] {it['publish']} 枠{it['slot']}／{it['kind']}")
        print(f"    {it['title']}")
        print(f"    本文（最終版）: {it['doc']}")
        if it["drafts"]:
            print(f"    出典（下書き）: {it['drafts'][0]}")
        else:
            print("    出典（下書き）: ⚠️ 見つかりません。数字を含む記事にはしないこと")
        print()

    print("※ 本文はGoogleドキュメント、出典はローカル下書きから取る。")
    print("※ ドキュメントが開けない場合はDriveを公開日の月日（例『8-7』）で検索する。")
    print("   詳細は ARTICLE_RULES.md の 0 と 2。")
    return 0


if __name__ == "__main__":
    sys.exit(main())
