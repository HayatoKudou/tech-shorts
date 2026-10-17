# tech-shorts

## 作り方

1. `videos/<id>/script.ts` に台本を書く（1文30字以内、`**語**` でマーカー、`sources` に出典）
2. `videos/<id>/Visuals.tsx` を作り、`src/Root.tsx` の `videos` に1行足す
3. `npm run narrate -- <id> --draft` で仮音声を作る
4. `npm run dev` で確認しながら `Visuals.tsx` に図を書く
5. 全文を1テイクで録音し、`videos/<id>/take.m4a` に置く（文の間は1秒あける。言い間違えたら最初から）
6. `npm run narrate -- <id>` で文ごとに区切る（止まったら録り直すか、`videos/<id>/boundaries.json` に2文目以降の話し始めの秒を書く）
7. `npm run render -- <id>` → `out/<id>.mp4`
