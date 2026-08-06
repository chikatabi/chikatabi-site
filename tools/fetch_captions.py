#!/usr/bin/env python3
"""YouTube動画の字幕本文を取得する。記事化の素材集め用。

    python3 tools/fetch_captions.py VIDEO_ID [VIDEO_ID ...]
    python3 tools/fetch_captions.py --tsv 動画一覧.tsv --out captions/

YouTubeの動画IDは `-CnPDH4WreI` のようにハイフンで始まることがある。
その場合はオプションと誤認されるので `--` で区切る：

    python3 tools/fetch_captions.py --out caps/ -- -CnPDH4WreI knZ6tLT37Vs

注意：CHIKATABIの動画に付いているのは**自動生成字幕(ASR)**のみ。
手動字幕は存在しない。ASRは固有名詞と専門用語を高い確率で誤認識する
（実測例：CHIKA→地下 / 旅行→横 / 国内線→国内戦）。
そのまま記事にすると誤情報を撒くので、必ず人または校正工程を挟むこと。

クライアントは IOS を使う。WEB は UNPLAYABLE で弾かれ、ANDROID は
字幕URLの取得まではできるが本文の取得に失敗する（2026-08-06 実測）。
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import time
import urllib.request
from pathlib import Path

UA_WEB = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
          "(KHTML, like Gecko) Chrome/126.0 Safari/537.36")
UA_IOS = "com.google.ios.youtube/20.10.4 (iPhone16,2; U; CPU iOS 18_3_2 like Mac OS X)"
IOS_CTX = {"clientName": "IOS", "clientVersion": "20.10.4",
           "deviceModel": "iPhone16,2", "hl": "ja", "gl": "JP"}


def _get(url: str, data: bytes | None = None, ua: str = UA_WEB) -> str:
    headers = {"User-Agent": ua, "Accept-Language": "ja,en;q=0.8"}
    if data:
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=data, headers=headers)
    return urllib.request.urlopen(req, timeout=45).read().decode("utf-8", "replace")


def innertube_key(video_id: str) -> str:
    html = _get(f"https://www.youtube.com/watch?v={video_id}")
    m = re.search(r'"INNERTUBE_API_KEY":"([^"]+)"', html)
    if not m:
        raise RuntimeError("innertubeのAPIキーが取れませんでした（YouTube側の変更の可能性）")
    return m.group(1)


def fetch_caption(video_id: str, key: str) -> tuple[str, str]:
    """(タイトル, 字幕本文) を返す。字幕が無ければ本文は空文字"""
    body = json.dumps({"videoId": video_id, "context": {"client": IOS_CTX}}).encode()
    pr = json.loads(_get(f"https://www.youtube.com/youtubei/v1/player?key={key}", body, UA_IOS))

    status = (pr.get("playabilityStatus") or {}).get("status")
    title = (pr.get("videoDetails") or {}).get("title") or ""
    if status != "OK":
        raise RuntimeError(f"再生不可（status={status}）")

    tracks = (((pr.get("captions") or {})
               .get("playerCaptionsTracklistRenderer")) or {}).get("captionTracks") or []
    if not tracks:
        return title, ""

    # 日本語を優先。無ければ先頭
    track = next((t for t in tracks if t.get("languageCode") == "ja"), tracks[0])
    data = json.loads(_get(track["baseUrl"] + "&fmt=json3", ua=UA_IOS))

    parts = []
    for ev in data.get("events", []):
        s = "".join(seg.get("utf8", "") for seg in (ev.get("segs") or [])).strip()
        if s:
            parts.append(s)
    return title, " ".join(" ".join(parts).split())


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("video_ids", nargs="*")
    ap.add_argument("--tsv", help="id列を持つTSVから読む")
    ap.add_argument("--out", help="1本ずつ .txt で保存するディレクトリ")
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--sleep", type=float, default=1.0, help="1本ごとの待ち時間（秒）")
    args = ap.parse_args()

    ids = list(args.video_ids)
    if args.tsv:
        import csv
        csv.field_size_limit(10 ** 7)
        with open(args.tsv, encoding="utf-8") as f:
            for row in csv.DictReader(f, delimiter="\t"):
                if row.get("tag") in (None, "video"):
                    ids.append(row["id"])
    if args.limit:
        ids = ids[:args.limit]
    if not ids:
        ap.error("動画IDを指定してください")

    key = innertube_key(ids[0])
    outdir = Path(args.out) if args.out else None
    if outdir:
        outdir.mkdir(parents=True, exist_ok=True)

    ok = miss = err = 0
    for i, vid in enumerate(ids, 1):
        try:
            title, text = fetch_caption(vid, key)
            if not text:
                miss += 1
                print(f"[{i}/{len(ids)}] {vid} 字幕なし  {title[:40]}", file=sys.stderr)
            else:
                ok += 1
                if outdir:
                    (outdir / f"{vid}.txt").write_text(
                        f"{title}\n{'=' * 40}\n{text}\n", encoding="utf-8")
                else:
                    print(f"### {vid} {title}\n{text}\n")
                print(f"[{i}/{len(ids)}] {vid} {len(text):>6}字  {title[:40]}", file=sys.stderr)
        except Exception as e:
            err += 1
            print(f"[{i}/{len(ids)}] {vid} 失敗: {e}", file=sys.stderr)
        time.sleep(args.sleep)

    print(f"\n取得 {ok} / 字幕なし {miss} / 失敗 {err}", file=sys.stderr)
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
