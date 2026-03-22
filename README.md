# riftbound-rules-ja

Riftbound（League of Legends TCG）日本語翻訳プロジェクト

## 概要

Riftbound のコアルール全文およびカードテキストの日本語翻訳を閲覧できる静的Webサイトです。

## 機能

### 📖 ルールブック翻訳
- 英語原文と日本語翻訳の並列表示
- 🔄 キーワード表記の切替（英語 / 日本語）
- 🔗 同期スクロール
- 📑 目次ナビゲーション（サイドバー）
- 📱 レスポンシブ対応

### 🃏 カード翻訳ギャラリー
- 全825カードの画像・テキスト表示
- TCG文脈を踏まえた日本語翻訳（キーワード正式訳対応）
- カード検索・フィルター（タイプ、ドメイン、セット、レアリティ）
- 用語集（27キーワード、7ドメイン、4セット）
- グリッド/リスト表示切替

## 技術スタック

- HTML / CSS / JavaScript（フレームワーク不使用）
- ルールブック: JSON（全70ページ・3,449行）
- カードデータ: JSON（全825カード・661ユニークテキスト翻訳）

## デプロイ

Cloudflare Pages にデプロイされています。

### ローカルで確認する場合

```bash
cd public
python -m http.server 8080
# ブラウザで http://localhost:8080 を開く
# カードギャラリーは http://localhost:8080/cards/ でアクセス
```

## ディレクトリ構造

```
public/
├── index.html      # ルールブック翻訳ビューアー
├── style.css       # ルールブック スタイルシート
├── app.js          # ルールブック JavaScript
├── data.json       # ルールブック翻訳データ
└── cards/          # カード翻訳ギャラリー
    ├── index.html  # カードギャラリー
    ├── style.css   # カードギャラリー スタイルシート
    ├── app.js      # カードギャラリー JavaScript
    ├── glossary.html # 用語集ページ
    └── data/       # カードデータ
        ├── cards_data.json    # カード情報
        ├── glossary.json      # 用語集
        └── translations.json  # 翻訳データ
```

## 免責事項

Riftbound™ は Riot Games, Inc. の商標です。  
このサイトは非公式のファンプロジェクトです。ゲームデータは © Riot Games, Inc. に帰属します。
