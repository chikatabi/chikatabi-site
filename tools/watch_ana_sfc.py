#!/usr/bin/env python3
"""
ANA公式のSFC制度改定ページを監視し、内容が変わったら知らせる。

2026-08-05時点でANAは「改定内容の見直しを検討」中で、詳細は2026年9月末までに
再発表される。300万円という基準そのものが変わりうるため、古い基準のまま
シミュレーターを公開し続けるのが最大の事故パターン。それを防ぐための監視。

ページ全体のハッシュは見ない。ANA公式ページには <main> が無く、
グローバルメニューが本文と同じ階層に入っているため、メニューが変わるだけで
誤検知するから。代わりに「制度に関わる語を含む文」だけを抜き出して比較する。

    python3 tools/watch_ana_sfc.py            # 差分があれば終了コード1
    python3 tools/watch_ana_sfc.py --update   # 現在の内容を基準として保存

差分検知後にやること → RULES_SOURCE.md の「更新手順」
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import urllib.request
from pathlib import Path

URL = "https://www.ana.co.jp/ja/jp/amc/premium/sfc/update2026/"
BASELINE = Path(__file__).with_name("ana_sfc_baseline.json")

# この語を含む文だけを監視対象にする。ナビゲーションのメニュー項目は
# 短いラベルでこれらの語を含まないため、自然に除外される。
KEYWORDS = [
    "決済額", "SFC PLUS", "SFC LITE", "判定期間", "区分",
    "見直し", "あらためてご案内", "ライフタイムマイル", "LTマイル",
    "ラウンジ", "スター アライアンス", "マイルを進呈", "5,000マイル",
]

# 特に重要な数値。ここが変わったら本文の差分より先に目立たせる
def key_facts(text: str) -> dict:
    def first(pattern: str) -> str | None:
        m = re.search(pattern, text)
        return m.group(1) if m else None

    return {
        "見直し検討中である": "見直しを検討" in text,
        "再案内の予定時期": first(r"詳細につきましては、([^。]+?)までにあらためてご案内"),
        "決済額の基準": sorted(set(re.findall(r"(\d[\d,]*万円)", text))),
        "判定期間の開始": first(r"(20\d\d年\d{1,2}月\d{1,2}日)から20\d\d年\d{1,2}月\d{1,2}日までの判定期間"),
        "判定期間の終了": first(r"20\d\d年\d{1,2}月\d{1,2}日から(20\d\d年\d{1,2}月\d{1,2}日)までの判定期間"),
        "サービス開始": first(r"(20\d\d年\d{1,2}月)より新しい区分"),
        "LTマイルの例外": first(r"(\d+万ANAライフタイムマイル)"),
        "進呈マイル": sorted(set(re.findall(r"([\d,]+)マイル(?:を|は|進呈)", text))),
        "区分名が両方ある": ("SFC PLUS" in text) and ("SFC LITE" in text),
    }


def fetch(url: str = URL) -> str:
    req = urllib.request.Request(
        url,
        headers={
            # 素のurllibだと弾かれることがあるのでブラウザ相当のUAを送る
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                          "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0 Safari/537.36",
            "Accept-Language": "ja,en;q=0.8",
        },
    )
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read().decode("utf-8", errors="replace")


def to_text(html: str) -> str:
    html = re.sub(r"<(script|style|noscript)[^>]*>.*?</\1>", " ", html, flags=re.S | re.I)
    html = re.sub(r"<br\s*/?>", "\n", html, flags=re.I)
    html = re.sub(r"</(p|div|li|h[1-6]|tr|dd|dt)>", "\n", html, flags=re.I)
    html = re.sub(r"<[^>]+>", " ", html)
    html = (html.replace("&nbsp;", " ").replace("&amp;", "&")
                .replace("&lt;", "<").replace("&gt;", ">").replace("&quot;", '"'))
    return html


def relevant_sentences(text: str) -> list[str]:
    """制度に関わる語を含む文だけを、重複を除いて返す"""
    chunks: list[str] = []
    for line in text.split("\n"):
        for s in re.split(r"(?<=。)", line):
            s = re.sub(r"\s+", " ", s).strip()
            if 6 <= len(s) <= 400 and any(k in s for k in KEYWORDS):
                chunks.append(s)
    return sorted(set(chunks))


def snapshot() -> dict:
    text = to_text(fetch())
    return {"facts": key_facts(text), "sentences": relevant_sentences(text)}


def render_diff(old: dict, new: dict) -> str:
    out: list[str] = []

    changed_facts = [
        (k, old["facts"].get(k), new["facts"].get(k))
        for k in new["facts"]
        if old["facts"].get(k) != new["facts"].get(k)
    ]
    if changed_facts:
        out.append("## 重要な数値・条件の変化\n")
        for k, o, n in changed_facts:
            out.append(f"- **{k}**\n  - 前: `{o}`\n  - 後: `{n}`")
        out.append("")

    o_s, n_s = set(old["sentences"]), set(new["sentences"])
    removed, added = sorted(o_s - n_s), sorted(n_s - o_s)
    if removed:
        out.append("## 消えた記述\n")
        out += [f"- {s}" for s in removed]
        out.append("")
    if added:
        out.append("## 増えた記述\n")
        out += [f"- {s}" for s in added]
        out.append("")

    if not changed_facts and not removed and not added:
        out.append("（差分なし）")
    return "\n".join(out)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--update", action="store_true", help="現在の内容を基準として保存する")
    args = ap.parse_args()

    try:
        new = snapshot()
    except Exception as e:
        print(f"::error::ANA公式ページを取得できませんでした: {e}")
        return 2

    if args.update or not BASELINE.exists():
        BASELINE.write_text(
            json.dumps(new, ensure_ascii=False, indent=1) + "\n", encoding="utf-8"
        )
        print(f"基準を保存しました（監視対象の文 {len(new['sentences'])} 件）")
        return 0

    old = json.loads(BASELINE.read_text(encoding="utf-8"))
    if old == new:
        print(f"変化なし（監視対象の文 {len(new['sentences'])} 件）")
        return 0

    print(render_diff(old, new))
    BASELINE.write_text(
        json.dumps(new, ensure_ascii=False, indent=1) + "\n", encoding="utf-8"
    )
    return 1


if __name__ == "__main__":
    sys.exit(main())
