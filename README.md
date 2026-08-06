# CHIKATABI サイト

https://lovely-chikatabi.com

```
index.html            トップページ
sfc/index.html        SFC PLUS/LITE 判定シミュレーター（1ファイル完結・外部依存なし）
articles/*.md         記事の原稿 ← 直すのはここ
articles/<slug>/       ビルド生成物。直接編集しない
assets/site.css       トップと記事の共通スタイル（/sfc/ は読まない）
RULES_SOURCE.md       ANA公式の一次情報の控え ← 数値の根拠はすべてここ
ARTICLE_RULES.md      台本を記事にするときの規則
test_logic.py         判定ロジックのテスト（29件）
tools/                ビルドと自動化のスクリプト
CNAME                 GitHub Pages の独自ドメイン設定
```

## 記事を書く・直す

```bash
python3 -m pip install --user markdown   # 初回のみ
python3 tools/build_articles.py          # articles/*.md → HTML + 一覧 + sitemap.xml
git add -A && git commit -m "..." && git push
```

push すると GitHub Pages が自動で更新する（1〜2分）。

**`articles/<slug>/index.html` を直接編集しないこと。** 次のビルドで上書きされる。
直すのは `articles/<slug>.md` のほう。

## 記事の自動生成

スケジュールタスク `chikatabi-article-writer`（毎週木曜 09:13）が、
公開済み動画の台本をもとに記事を書いて push する。規則は `ARTICLE_RULES.md`。

```bash
python3 tools/pending_articles.py        # 記事化がまだの台本を一覧
```

- 素材は**Googleドキュメント（CHIKAが確認した最終版）のみ**。
  `drafts/` の下書きも、動画の自動生成字幕も使わない
- 記事化済みかどうかは `articles/*.md` の front matter の `source:` で判定する。
  **`source:` を消すと同じ台本から二重に記事が作られる**

### 動画の字幕を素材にしない理由

`tools/fetch_captions.py` で字幕は取得できるが、CHIKATABIの動画に付いているのは
**自動生成字幕のみ**で、この分野の精度に耐えない。2026-08-06の実測：

| 字幕 | 正しくは |
|---|---|
| 無料手荷物1個 23**km** | 23**kg** |
| 1回の**発見**で完結 | **発券** |
| 株主優**体**運賃 | 株主優**待**運賃 |
| ANA**国内戦**（1本に8回） | ANA**国内線** |

1本に数字が114箇所あり、そのまま記事にすると誤情報を大量生産することになる。
台本には「データ出典」と「ハルシネーションチェック」が付いているので、そちらを使う。

**ツールを `/sfc/` に置いてサブドメインにしていないのは意図的。**
被リンクの評価をドメイン全体に貯めるため。記事サイトを別サブドメインに切らないこと。
概要欄901本にURLを貼ったあとは移動できないので、この配置は動かさない前提。

## ⚠️ いま最優先の申し送り

**ANAがこの改定の見直しを検討中で、2026年9月末までに再発表される。**
300万円という基準そのものが変わりうる。再発表が出たら下の手順で更新すること。

## 更新手順（9月末の再発表後）

1. `RULES_SOURCE.md` の手順どおりANA公式を取り直す
   （**WebFetchはタイムアウトする。ブラウザで開くこと**）
2. `RULES_SOURCE.md` に差分を反映
3. `index.html` の先頭にある `RULES` オブジェクトだけを書き換える
   - `threshold` / `periodStart` / `periodEnd` / `timeline` など
   - 内容が確定したら `underReview: false` にする（画面上の警告バナーが消える）
   - `version` を更新する（画面フッターに出る）
4. `python3 test_logic.py` を実行して29件通ることを確認
5. `git push` すると GitHub Pages が自動で再公開する

**画面の文言・計算・日程表はすべて `RULES` を参照している。**
数値をHTML本文に直書きしないこと。1か所で完結する構造を壊さないため。

## テスト

```bash
python3 test_logic.py
```

`index.html` から `RULES` / `periodProgress` / `evaluate` を実際に抜き出して実行する。
本体を直せばテストも自動で追随する（テスト用にロジックを写経していない）。

Node が入っていないので macOS 標準の `osascript -l JavaScript` で走らせている。
Node を入れたら `node` に差し替えてよい。

見ている境界：300万円ちょうど／合算／除外の差し引き／不足額／100万LTマイル例外と
5,000マイルの関係／判定期間の前・中・後／不正な日付。

## 公開まわり

- ホスティング: GitHub Pages（main ブランチのルート）
- 独自ドメイン: `lovely-chikatabi.com`（`CNAME` ファイルで指定）
- DNS: お名前.com。Apex に A 4本 + AAAA 4本、`www` に CNAME 1本

```
@    A      185.199.108.153 / 185.199.109.153 / 185.199.110.153 / 185.199.111.153
@    AAAA   2606:50c0:8000::153 / 8001::153 / 8002::153 / 8003::153
www  CNAME  chikatabi.github.io
```

- **`chikatabi.email` とは別のドメイン。あちらは MX でメールが動いているので触らないこと。**
  ネームサーバーごと移すとメールが止まる

## 設計上きめたこと

- **判定はするが、結論は出さない。**「300万円使うために無理に決済しましょう」とは
  言わない。条件によって最適解が変わるので、数字を出したあとは個別相談へ送る。
- **LITEを赤色にしない。** 未達は失敗ではなく区分。ANA公式も「退会にはならない」と
  明言しているので、色でも文言でも脅かさない。
- **非公式であることを明記。** ANAが提供するものと誤解されないよう、
  フッターに書いてある。ここは消さないこと。
- ロジックは `evaluate()` に閉じてDOMに触らせていない。テストできる形を保つため。
