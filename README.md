# riftbound-rules-ja

Riftbound Core Rules v1.1 の日本語翻訳ビューアー

## 概要

Riftbound（League of Legends TCG）のコアルール全文を、英語原文と日本語翻訳の並列表示で閲覧できる静的Webサイトです。

## 機能

- 📖 英語原文と日本語翻訳の並列表示
- 🔄 キーワード表記の切替（英語 / 日本語）
- 🔗 同期スクロール
- 📑 目次ナビゲーション（サイドバー）
- 📱 レスポンシブ対応
- ⬆️ ページトップへ戻るボタン

## 技術スタック

- HTML / CSS / JavaScript（フレームワーク不使用）
- データ: JSON（翻訳済み全70ページ・3,449行）

## デプロイ

Cloudflare Pages にデプロイされています。

### ローカルで確認する場合

```bash
python -m http.server 8080
# ブラウザで http://localhost:8080 を開く
```

## 免責事項

Riftbound™ は Riot Games, Inc. の商標です。  
このサイトは非公式のファンプロジェクトです。ゲームデータは © Riot Games, Inc. に帰属します。
