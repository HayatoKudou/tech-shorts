# tech-shorts

## 目的
身の回りのテクノロジーの仕組みを 60〜90 秒で図解する縦型ショート（1080x1920, 30fps）を作る。
ナレーションは本人が録音した声。同じ mp4 を YouTube Shorts / TikTok / Instagram Reels に投稿する。
台本と図はコード（Remotion）で書き、正確さは一次情報で担保する。

## オリジナリティ
他チャンネルの構成・見た目を写さない。特に次はやらない。
- 英語の見出し、「Step N」ラベル、毎回同じ見出しブロック
- 暗い背景、実写映像の背景、紫系の配色、画面下の英字注記
- 「なぜ存在する → 規模 → 設計 → 手順 → 数字 → 注意点 → まとめ」のような固定の章立て。構成は題材ごとに決める
- 他人の動画の文字起こし・スクショ・チャンネル名をこのリポジトリやプロンプトに入れない

このリポジトリの見た目: 方眼ノート（生成りの紙＋ドット）、黒インクの線を描き足していく、強調は朱、補助は藍、
キーワードに蛍光マーカー。日本語のみ。値は `src/kit/theme.ts`。

## 台本 `videos/<id>/script.ts`
- 1拍 = 1文 = 字幕1枚。1拍30文字以内（`validateScript` が弾く）。全体で 60〜90 秒
- `text` は字幕であり、そのまま読む原稿。`**語**` でマーカー、`\n` で改行位置の指定
- 書く前に一次情報（公式仕様・規格・公式解説）を確認し、URL を `sources` に残す。数値は出典どおりに書く

## 音声
1. 台本を声に出して読み、言い回しを確定させる（録音後に文を変えると録り直し）
2. `npm run narrate -- <id> --draft` で仮音声（macOS の say）を作り、図を作る。仮音声の動画には「仮音声」が焼き込まれる
3. 本番は全文を1テイクで録る（QuickTime の新規オーディオ収録など）。文と文の間は1秒あける。言い間違えたら最初から録り直す
4. `videos/<id>/take.m4a` に置いて `npm run narrate -- <id>`。区切りが怪しいと止まるので、録り直すか
   `videos/<id>/boundaries.json` に2文目以降の話し始め（秒）を書く
- take は git 管理外（本人の声）。別途バックアップする
- 声のクローン（合成音声）は使わない。使うなら YouTube の「改変または合成されたコンテンツ」の申告が必要になる

## 図 `videos/<id>/Visuals.tsx`
- 動画ごとに書く。`STAGE_BOX` の大きさの座標系（字幕の下〜セーフゾーンの下端）に SVG で描く
- タイミングは `useBeat()` で拍を基準に書き、秒数を直接書かない。`enter(i)` は拍 i から 0→1、`draw(p)` は線を描く
- 拍0の要素は最初から描き終えておく（先頭フレームがサムネイルになる。`enter(0)` は常に 1）
- 乱数は remotion の `random(seed)`。`Math.random()` や CSS の transition/animation は使わない
- 2本以上の動画で同じ部品を書いたら `src/kit/` に移す。それまでは動画側に置く

## 効果音
- `<Sfx name at delay />` に、対応する `enter(at, { delay })` と同じ値を渡す（`<svg>` の外に置く）
- pop = 要素が出る、tick = 文字・数字が出る、miss = ×・失敗、done = 正解・完了。鳴らしすぎない（1文に1〜2回）
- 音は `pipeline/sfx.ts` で ffmpeg 合成した自作音（`public/sfx/`、git 管理）。音色を変えたら `npm run sfx`。
  音量はファイル側でナレーションより約10dB下にそろえてあるので、`volume` は基本触らない
- 外部の素材は使うなら git に入れない（公開リポジトリなので再配布になる）。入手元 URL と規約を記録する

## セーフゾーン
上 260 / 下 480 / 左 72 / 右 192 px（`SAFE`）。字幕と重要な要素はこの中。通常投稿の公式値は無いので、
広告テンプレートの値のうち最も厳しいものを採った近似。中心は x=480 になる。
Studio の props で `guides: true` にすると枠を重ねて確認できる。

## コマンド
- `npm run dev` Remotion Studio
- `npm run narrate -- <id> [--draft]` ナレーション → `public/audio/<id>/`（git 管理外）
- `npm run render -- <id>` → `out/<id>.mp4`（h264, crf 18, bt709。音声は最後にリミッターでピーク -2dBFS 以下）
- `npm run sfx` 効果音を合成し直す → `public/sfx/`
- `npm run typecheck`
- 新しい動画は `videos/<id>/` に script.ts と Visuals.tsx を作り、`src/Root.tsx` の `videos` に1行足す

## 依存
- `~/.npmrc` の min-release-age により公開24時間未満の版は入らない。バージョンは固定し、Remotion 系（remotion, @remotion/*）は同じ版にそろえる
- Remotion のライセンス: 個人と3人以下の組織は無料。会社（4人以上）の仕事として作るなら Company License が必要
- フォントは `@ibm/plex-sans-jp`（OFL）の woff2 をバンドル。Google Fonts 経由は日本語が約120分割になり重いので使わない

## 作業ルール
- 大きな設計変更は先に方針を示す
- 曖昧な仕様は推測せず質問する
