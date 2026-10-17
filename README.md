# tech-shorts

自分で録ったナレーションを ffmpeg で文ごとに区切り、その区切りに合わせて字幕・図・効果音（ffmpeg で合成）を Remotion で動かす、縦型の図解ショートを作るリポジトリ。

## 作り方

1. `videos/<id>/script.ts` に台本を書く
2. `videos/<id>/Visuals.tsx` を作り、`src/Root.tsx` の `videos` に追加する
3. `npm run narrate -- <id> --draft` で仮音声を作る
4. `npm run dev` で確認しながら図を書く
5. 全文を1テイクで録音し、`videos/<id>/take.m4a` に置く
6. `npm run narrate -- <id>` で文ごとに区切る
7. `npm run render -- <id>` → `out/<id>.mp4`

## 台本

- 1文 = 字幕1枚。30字以内
- 強調したい語を `**` で囲むと、字幕にマーカーが付く（例: `**少し汚れていても**`）
- `sources` に、内容の根拠になる公式情報の URL を書く

## 録音

- 文の間は1秒あける
- 言い間違えたら最初から録り直す
- `narrate` が止まったら録り直すか、`videos/<id>/boundaries.json` に2文目以降の話し始めの秒を書く（例: `[4.4, 9.4]`）

## 効果音

- `Visuals.tsx` に `<Sfx name="pop" at={1} delay={8} />` のように置く。`at` と `delay` は鳴らしたい動きの `enter()` と同じ値にする
- `pop`（要素が出る）、`tick`（文字・数字）、`miss`（×・失敗）、`done`（正解・完了）
- 音色を変えたら `pipeline/sfx.ts` を直して `npm run sfx`
