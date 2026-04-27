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
- `/chat-review` … **クライアントワーク添削ツール**（API は `/api/chat-review/analyze`、Claude Sonnet 4.6 を使用、発言者名はサーバー側で `[話者A]` 等にマスクしてからAIへ送信）。
- `/eq-rewrite` … **クライアントメッセージ EQ リライト**（API は `/api/eq-rewrite/rewrite`、Claude Sonnet 4 を使用、相手・状況・文体・温度感のヒアリング情報をもとにEQ高めの文章へリライト）。
- `/portfolio-check` … **ポートフォリオ魅力度チェックツール**（API は `/api/portfolio-check/analyze`、URLをサーバー側で取得→HTMLからテキスト/構造シグナルを抽出→Claudeが4観点で100点満点採点）。
