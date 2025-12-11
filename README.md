This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Local CI (same as Actions)

Run the same checks as CI locally:

```bash
npm run ci:local
```

This runs lint -> PDF test -> production build.

## Backend integrations (Google Drive / Sheets)

Set the following environment variables for server-side storage of PDFs and回答データ:

- `GOOGLE_DRIVE_FOLDER_ID`: DriveフォルダID（PDF保存用）
- `GOOGLE_SHEETS_ID`: 回答を追記するスプレッドシートID
- `GOOGLE_SERVICE_ACCOUNT_EMAIL`: サービスアカウントのメール
- `GOOGLE_SERVICE_ACCOUNT_KEY`: サービスアカウント秘密鍵（`\n`は改行に置換されます）
- `PERSIST_DRY_RUN` (optional): `"true"` でDrive/Sheets書き込みをスキップし、テスト用のダミー結果を返す
- `PERSIST_DEBUG_LOG` (optional): `"true"` でDrive/Sheetsへの成功・失敗ログを出力（開発時のみ推奨）

これらが未設定の場合、Drive/Sheetsへの保存はスキップされ、ユーザー向けのPDFダウンロード動作のみ行われます。
