<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Git

コード変更後はユーザーに言われなくても **`git add` → `commit` → `origin/main` へ `push`** まで行う（`.env*` はコミットしない）。

## ルーティング

- `/` … **動画編集者サポートツール**のハブ（ツール一覧）
- `/proposal` … **提案書ジェネレーター**（API は `/api/proposal/generate`）。他ツールは同様に `/（ツール名）` と `/api/（ツール名）/` で追加していく想定。
- `/thumbnail-generator` … **簡易サムネイル生成ツール**（API は `/api/thumbnail-generator/generate`、Gemini の画像生成を使用）。
