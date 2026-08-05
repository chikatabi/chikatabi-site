#!/usr/bin/env python3
"""
index.html から判定ロジック（RULES / periodProgress / evaluate）だけを抜き出して
実際に実行し、境界値をテストする。

Node が無い環境なので macOS 標準の osascript -l JavaScript (JavaScriptCore) で走らせる。
index.html を直接読むので、本体を直せばテストも自動で追随する。

    python3 test_logic.py
"""
import re
import subprocess
import sys
from pathlib import Path

HTML = Path(__file__).parent / "sfc" / "index.html"


def extract(src: str, start_marker: str) -> str:
    """start_marker から始まるトップレベルのブロックを、波かっこの対応で切り出す。

    関数は引数が分割代入だと ``function f({a, b}, c) {`` のように
    引数側に波かっこが出るので、本体の ``) {`` から数え始める。
    """
    i = src.index(start_marker)
    body = src.index(") {", i) + 2 if start_marker.startswith("function") else src.index("{", i)

    depth = 0
    for j in range(body, len(src)):
        if src[j] == "{":
            depth += 1
        elif src[j] == "}":
            depth -= 1
            if depth == 0:
                return src[i:j + 1]
    raise ValueError(f"ブロックを閉じられなかった: {start_marker}")


def build_harness() -> str:
    html = HTML.read_text(encoding="utf-8")
    script = re.findall(r"<script>(.*?)</script>", html, re.S)[-1]
    parts = [
        extract(script, "const RULES = {"),
        extract(script, "function periodProgress("),
        extract(script, "function evaluate("),
    ]
    return "\n".join(parts)


CASES = r"""
// osascript は「最後に値を持った文」を返すため、IIFE で包んで戻り値を確定させる
(function () {
var fails = [], passes = 0;
function eq(name, got, want) {
  if (got === want) { passes++; }
  else { fails.push(name + "  期待:" + want + "  実際:" + got); }
}
var MAN = 10000;
function run(o, now) {
  return evaluate({
    isLT: o.isLT || false, isNew: o.isNew || false,
    card: (o.card || 0) * MAN, pay: (o.pay || 0) * MAN,
    exclusions: (o.ex || []).map(function (v) { return v * MAN; })
  }, now);
}

// --- 閾値の境界 ---------------------------------------------------
eq("300万ちょうどはPLUS",        run({card: 300}).isPlus, true);
eq("299万9999円はLITE",          run({card: 299.9999}).isPlus, false);
eq("300万1円はPLUS",             run({card: 300.0001}).isPlus, true);
eq("0円はLITE",                  run({card: 0}).isPlus, false);

// --- 合算 ---------------------------------------------------------
eq("カード+ANA Payで合算される",  run({card: 250, pay: 50}).isPlus, true);
eq("合算しても足りなければLITE",  run({card: 250, pay: 49}).isPlus, false);

// --- 除外の差し引き -----------------------------------------------
eq("除外を引いて未達に転落",      run({card: 320, ex: [30]}).isPlus, false);
eq("除外を引いてもなお到達",      run({card: 350, ex: [30]}).isPlus, true);
eq("除外が複数でも合計で引く",    run({card: 350, ex: [20, 20, 20]}).isPlus, false);
eq("有効額は円で正しい",          run({card: 100, pay: 10, ex: [5]}).effective, 105 * MAN);
eq("引きすぎても0未満にならない", run({card: 10, ex: [999]}).effective, 0);

// --- 不足額 -------------------------------------------------------
eq("不足額が正しい",              run({card: 200}).shortfall, 100 * MAN);
eq("到達時の不足額は0",           run({card: 300}).shortfall, 0);

// --- 100万LTマイルの例外 -------------------------------------------
var lt = run({card: 50, isLT: true});
eq("LTマイル到達は決済0でもPLUS", lt.isPlus, true);
eq("LTマイルでも決済不足なら5000マイルは付かない", lt.getsMiles, false);
var ltFull = run({card: 300, isLT: true});
eq("LTマイル＋300万ならマイルも付く", ltFull.getsMiles, true);
eq("決済のみ300万でもマイルは付く", run({card: 300}).getsMiles, true);

// --- 判定期間 -----------------------------------------------------
var before = run({card: 0}, new Date("2026-08-05T12:00:00+09:00"));
eq("判定期間の前はbefore",        before.prog.state, "before");
eq("判定期間は365日",             before.prog.total, 365);
eq("期間前は残り＝期間全体",      before.prog.remaining, 365);

var during = run({card: 0}, new Date("2027-06-15T12:00:00+09:00"));
eq("期間中はduring",              during.prog.state, "during");
eq("期間中の残りは1〜365日",      during.prog.remaining > 0 && during.prog.remaining < 365, true);

var after = run({card: 0}, new Date("2028-01-01T12:00:00+09:00"));
eq("期間終了後はafter",           after.prog.state, "after");
eq("終了後は残り0",               after.prog.remaining, 0);
eq("終了後は月額を0にして割り算しない", after.perMonth, 0);

// --- 月あたり必要額 -----------------------------------------------
var need = run({card: 240}, new Date("2026-08-05T12:00:00+09:00"));
eq("不足60万を12か月で割ると月5万前後",
   Math.round(need.perMonth / 1000) * 1000 === 50000, true);
eq("到達していれば月額は0",       run({card: 300}).perMonth, 0);

// --- 入会区分 -----------------------------------------------------
eq("新規入会フラグは保持される",  run({card: 300, isNew: true}).isNew, true);

// --- 不正な入力で壊れないこと ---------------------------------------
eq("nowが不正でもNaNを外に出さない",
   isNaN(run({card: 240}, new Date("これは日付ではない")).perMonth), false);

return JSON.stringify({passes: passes, fails: fails});
})();
"""


def main() -> int:
    js = build_harness() + CASES
    proc = subprocess.run(
        ["osascript", "-l", "JavaScript", "-e", js],
        capture_output=True, text=True,
    )
    if proc.returncode != 0:
        print("実行に失敗しました:\n" + proc.stderr, file=sys.stderr)
        return 2

    import json
    result = json.loads(proc.stdout.strip())
    for f in result["fails"]:
        print("  ✗ " + f)
    total = result["passes"] + len(result["fails"])
    if result["fails"]:
        print(f"\n{len(result['fails'])} / {total} 失敗")
        return 1
    print(f"✅ {result['passes']} / {total} すべて通過")
    return 0


if __name__ == "__main__":
    sys.exit(main())
