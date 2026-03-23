/**
 * Riftbound カード翻訳ギャラリー - メインアプリケーション
 * 
 * カードデータの読み込み、表示、フィルタリング、翻訳表示を管理する
 */

// ========== グローバル状態 ==========
const state = {
    cards: [],           // 全カードデータ
    glossary: null,      // 用語集データ
    translations: {},    // 翻訳データ
    filteredCards: [],    // フィルター適用後のカード
    filters: {
        type: null,
        domain: null,
        set: null,
        rarity: null,
        search: ''
    },
    viewMode: 'grid',    // 'grid' or 'list'
    initialized: false,
};

// ========== ドメインカラーマッピング ==========
const DOMAIN_COLORS = {
    'Body': '#8B6B3D',
    'Calm': '#4A7FCC',
    'Chaos': '#CC3E50',
    'Fury': '#D97A1F',
    'Mind': '#7C5EBF',
    'Order': '#C9A636',
    'Colorless': '#6B7280',
};


// ========== 初期化 ==========
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await loadData();
        initFilters();
        initEventListeners();
        applyFilters();
        updateStats();
        state.initialized = true;
        document.getElementById('loading').style.display = 'none';
    } catch (err) {
        console.error('初期化エラー:', err);
        document.getElementById('loading').innerHTML = `
            <p style="color: #CC3E50;">データの読み込みに失敗しました</p>
            <p style="color: #94a3b8; font-size: 0.85rem; margin-top: 8px;">
                先に <code>python fetch_cards.py</code> を実行してデータを取得してください
            </p>
        `;
    }
});

// ========== データ読み込み ==========
async function loadData() {
    // カードデータ、用語集、翻訳データを並列読み込み
    const [cardsRes, glossaryRes, translationsRes] = await Promise.all([
        fetch('data/cards_data.json'),
        fetch('data/glossary.json'),
        fetch('data/translations.json').catch(() => null),
    ]);

    if (!cardsRes.ok) throw new Error('カードデータが見つかりません');
    state.cards = await cardsRes.json();
    
    if (glossaryRes.ok) {
        state.glossary = await glossaryRes.json();
    }
    
    if (translationsRes && translationsRes.ok) {
        state.translations = await translationsRes.json();
    }
    
    console.log(`読み込み完了: ${state.cards.length}枚のカード`);
}

// ========== フィルター初期化 ==========
function initFilters() {
    // ユニークな値を収集
    const types = new Set();
    const domains = new Set();
    const sets = new Set();
    const rarities = new Set();
    
    state.cards.forEach(card => {
        if (card.cardType) types.add(card.cardType);
        if (card.domains) card.domains.forEach(d => domains.add(d));
        if (card.set) sets.add(card.set);
        if (card.rarity) rarities.add(card.rarity);
    });
    
    // フィルターチップを生成
    renderFilterChips('filter-type', [...types].sort(), 'type');
    renderFilterChips('filter-domain', [...domains].sort(), 'domain');
    renderFilterChips('filter-set', [...sets].sort(), 'set');
    renderFilterChips('filter-rarity', [...rarities].sort(), 'rarity');
}

/**
 * フィルターチップをレンダリングする
 */
function renderFilterChips(containerId, values, filterKey) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = values.map(val => {
        const attrs = filterKey === 'domain' ? ` data-domain="${val}"` : '';
        return `<button class="filter-chip" data-filter="${filterKey}" data-value="${val}"${attrs}>${val}</button>`;
    }).join('');
}

// ========== イベントリスナー ==========
function initEventListeners() {
    // 検索入力
    const searchInput = document.getElementById('search-input');
    const searchClear = document.getElementById('search-clear');
    let searchTimeout;
    
    searchInput.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            state.filters.search = searchInput.value.trim().toLowerCase();
            applyFilters();
        }, 200);
        searchClear.classList.toggle('visible', searchInput.value.length > 0);
    });
    
    searchClear.addEventListener('click', () => {
        searchInput.value = '';
        state.filters.search = '';
        searchClear.classList.remove('visible');
        applyFilters();
    });
    
    // フィルターチップ（イベント委譲）
    document.querySelectorAll('.filter-chips').forEach(container => {
        container.addEventListener('click', (e) => {
            const chip = e.target.closest('.filter-chip');
            if (!chip) return;
            
            const filterKey = chip.dataset.filter;
            const value = chip.dataset.value;
            
            // 同じチップを再度クリックした場合はフィルター解除
            if (state.filters[filterKey] === value) {
                state.filters[filterKey] = null;
                chip.classList.remove('active');
            } else {
                // 同じグループの他のチップを非アクティブに
                container.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
                state.filters[filterKey] = value;
                chip.classList.add('active');
            }
            
            applyFilters();
        });
    });
    
    // 表示切替
    document.getElementById('view-grid').addEventListener('click', () => setViewMode('grid'));
    document.getElementById('view-list').addEventListener('click', () => setViewMode('list'));
    
    // フィルタリセット
    document.getElementById('btn-reset').addEventListener('click', resetFilters);
    
    // フィルター折りたたみ（モバイル）
    const filterToggle = document.getElementById('filter-toggle');
    if (filterToggle) {
        filterToggle.addEventListener('click', () => {
            document.getElementById('filters-section').classList.toggle('filters-open');
        });
    }

    // モーダル閉じる
    document.getElementById('modal-close').addEventListener('click', closeModal);
    document.getElementById('modal-overlay').addEventListener('click', (e) => {
        if (e.target === e.currentTarget) closeModal();
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeModal();
    });
}

// ========== フィルタリング ==========
function applyFilters() {
    const { type, domain, set, rarity, search } = state.filters;
    
    state.filteredCards = state.cards.filter(card => {
        // タイプフィルター
        if (type && card.cardType !== type) return false;
        
        // ドメインフィルター
        if (domain && (!card.domains || !card.domains.includes(domain))) return false;
        
        // セットフィルター
        if (set && card.set !== set) return false;
        
        // レアリティフィルター
        if (rarity && card.rarity !== rarity) return false;
        
        // テキスト検索
        if (search) {
            const searchTarget = [
                card.name,
                card.abilityText,
                card.flavorText,
                card.publicCode,
                ...(card.tags || []),
            ].join(' ').toLowerCase();
            
            // 翻訳データも検索対象に
            const trans = state.translations[card.id];
            if (trans) {
                const transTarget = [
                    trans.name_ja,
                    trans.abilityText_ja,
                    trans.flavorText_ja,
                ].join(' ').toLowerCase();
                
                if (!searchTarget.includes(search) && !transTarget.includes(search)) {
                    return false;
                }
            } else if (!searchTarget.includes(search)) {
                return false;
            }
        }
        
        return true;
    });
    
    renderCards();
    updateResultCount();
}

// ========== カードレンダリング ==========
function renderCards() {
    const grid = document.getElementById('card-grid');
    const noResults = document.getElementById('no-results');
    
    if (state.filteredCards.length === 0) {
        grid.innerHTML = '';
        noResults.style.display = 'block';
        return;
    }
    
    noResults.style.display = 'none';
    
    // パフォーマンス: DocumentFragmentを使用
    const fragment = document.createDocumentFragment();
    
    state.filteredCards.forEach(card => {
        const el = createCardElement(card);
        fragment.appendChild(el);
    });
    
    grid.innerHTML = '';
    grid.appendChild(fragment);
}

/**
 * カード要素を作成する
 */
function createCardElement(card) {
    const div = document.createElement('div');
    div.className = 'card-item';
    div.setAttribute('data-card-id', card.id);
    div.addEventListener('click', () => openModal(card));
    
    // ドメインの色
    const domainColor = card.domains && card.domains.length > 0 
        ? DOMAIN_COLORS[card.domains[0]] || DOMAIN_COLORS.Colorless
        : DOMAIN_COLORS.Colorless;
    
    // コスト表示
    const costStr = card.energy != null ? `⚡${card.energy}` : '';
    const mightStr = card.might != null ? ` ⚔${card.might}` : '';
    
    div.innerHTML = `
        <div class="card-image-wrapper">
            <img class="card-image" 
                 src="${card.imageUrl}" 
                 alt="${card.name}" 
                 loading="lazy"
                 onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 744 1039%22><rect fill=%22%231a2035%22 width=%22744%22 height=%221039%22/><text fill=%22%2364748b%22 x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dominant-baseline=%22middle%22 font-size=%2240%22>No Image</text></svg>'">
        </div>
        <div class="card-info">
            <div class="card-name">${escapeHtml(card.name)}</div>
            <div class="card-meta">
                <span class="card-domain-dot" style="background:${domainColor}"></span>
                <span class="card-type-badge">${escapeHtml(card.cardType)}</span>
                <span class="card-cost">${costStr}${mightStr}</span>
            </div>
        </div>
    `;
    
    return div;
}

// ========== モーダル ==========
function openModal(card) {
    const overlay = document.getElementById('modal-overlay');
    const trans = state.translations[card.id] || {};
    
    // カード画像
    document.getElementById('modal-image').src = card.imageUrl;
    document.getElementById('modal-image').alt = card.name;
    
    // カード名・番号
    document.getElementById('modal-name').textContent = card.name;
    document.getElementById('modal-code').textContent = card.publicCode;
    
    // メタ情報
    const metaEl = document.getElementById('modal-meta');
    let metaHtml = '';
    
    // カードタイプ
    if (card.cardType) {
        metaHtml += `<span class="meta-tag">${card.cardType}</span>`;
    }
    
    // ドメイン
    if (card.domains && card.domains.length > 0) {
        card.domains.forEach(d => {
            const color = DOMAIN_COLORS[d] || '#6B7280';
            metaHtml += `<span class="meta-tag"><span class="dot" style="background:${color}"></span>${d}</span>`;
        });
    }
    
    // コスト
    if (card.energy != null) {
        metaHtml += `<span class="meta-tag">⚡ Energy: ${card.energy}</span>`;
    }
    if (card.might != null) {
        metaHtml += `<span class="meta-tag">⚔ Might: ${card.might}</span>`;
    }
    
    // レアリティ
    if (card.rarity) {
        metaHtml += `<span class="meta-tag">✦ ${card.rarity}</span>`;
    }
    
    // セット
    if (card.set) {
        metaHtml += `<span class="meta-tag">📦 ${card.set}</span>`;
    }
    
    // タグ
    if (card.tags && card.tags.length > 0) {
        card.tags.forEach(t => {
            metaHtml += `<span class="meta-tag">🏷 ${t}</span>`;
        });
    }
    
    metaEl.innerHTML = metaHtml;
    
    // 英語アビリティテキスト（キーワードハイライト付き）
    const abilityEnEl = document.getElementById('modal-ability-en');
    if (card.abilityText) {
        abilityEnEl.innerHTML = highlightKeywords(stripIconPrefix(escapeHtml(card.abilityText)));
        abilityEnEl.parentElement.style.display = 'block';
    } else {
        abilityEnEl.parentElement.style.display = 'none';
    }

    // 日本語翻訳テキスト
    const abilityJaEl = document.getElementById('modal-ability-ja');
    if (trans.abilityText_ja) {
        abilityJaEl.innerHTML = highlightKeywords(stripIconPrefix(escapeHtml(trans.abilityText_ja)));
        abilityJaEl.parentElement.style.display = 'block';
    } else {
        // 翻訳がない場合は自動翻訳のプレースホルダーを表示
        abilityJaEl.innerHTML = card.abilityText 
            ? `<span style="color:var(--text-muted); font-style:italic;">翻訳準備中です。用語集を参照して解釈してください。</span>`
            : '';
        abilityJaEl.parentElement.style.display = card.abilityText ? 'block' : 'none';
    }
    
    // フレーバーテキスト
    const flavorSection = document.getElementById('modal-flavor-section');
    const flavorEl = document.getElementById('modal-flavor');
    if (card.flavorText) {
        flavorEl.textContent = card.flavorText;
        flavorSection.style.display = 'block';
    } else {
        flavorSection.style.display = 'none';
    }
    
    // 検出されたキーワード一覧（バッジ＋※注釈）
    const keywordsEl = document.getElementById('modal-keywords');
    const detectedKeywords = detectKeywords(card.abilityText || '');
    if (detectedKeywords.length > 0) {
        // バッジ行
        const badges = detectedKeywords.map(kw =>
            `<span class="keyword-badge">${kw.en} → ${kw.ja}</span>`
        ).join('');
        // ※注釈行
        const notes = detectedKeywords.map(kw =>
            `<div class="keyword-note">※ <strong>${kw.ja}</strong>: ${escapeHtml(kw.description_ja)}</div>`
        ).join('');
        keywordsEl.innerHTML =
            `<div class="keyword-badges">${badges}</div>` +
            `<div class="keyword-notes">${notes}</div>`;
        keywordsEl.style.display = 'block';
    } else {
        keywordsEl.style.display = 'none';
    }
    
    // フッター
    const footerEl = document.getElementById('modal-footer');
    let footerParts = [];
    if (card.illustrator) footerParts.push(`🎨 ${card.illustrator}`);
    if (card.publicCode) footerParts.push(`# ${card.publicCode}`);
    footerEl.textContent = footerParts.join(' | ');
    
    // モーダル表示
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    const overlay = document.getElementById('modal-overlay');
    overlay.classList.remove('active');
    document.body.style.overflow = '';
}

// ========== キーワードハイライト ==========
/**
 * テキスト内のゲームキーワードをハイライトし、ツールチップを付与する
 */
function highlightKeywords(text) {
    if (!state.glossary || !state.glossary.keywords) return text;
    
    let result = text;
    
    // キーワードを長さ順にソート（長いものから置換して部分一致を防ぐ）
    const sortedKeywords = [...state.glossary.keywords].sort(
        (a, b) => b.en.length - a.en.length
    );
    
    sortedKeywords.forEach(kw => {
        // [Keyword] 形式と単語単体の両方を検索
        const bracketRegex = new RegExp(`\\[${escapeRegex(kw.en)}\\]`, 'gi');
        const replacement = `<span class="keyword-highlight">[${kw.en}]<span class="keyword-tooltip"><span class="kw-name">${kw.en} / ${kw.ja}</span>${escapeHtml(kw.description_ja)}</span></span>`;
        result = result.replace(bracketRegex, replacement);
    });
    
    return result;
}

/**
 * テキストからキーワードを検出する
 */
function detectKeywords(text) {
    if (!state.glossary || !state.glossary.keywords || !text) return [];
    
    const detected = [];
    const textLower = text.toLowerCase();
    
    state.glossary.keywords.forEach(kw => {
        // [Keyword] 形式または単語として出現するか確認
        if (textLower.includes(`[${kw.en.toLowerCase()}]`) || 
            textLower.includes(kw.en.toLowerCase())) {
            detected.push(kw);
        }
    });
    
    return detected;
}

// ========== 表示切替 ==========
function setViewMode(mode) {
    state.viewMode = mode;
    const grid = document.getElementById('card-grid');
    
    if (mode === 'list') {
        grid.classList.add('list-view');
    } else {
        grid.classList.remove('list-view');
    }
    
    document.getElementById('view-grid').classList.toggle('active', mode === 'grid');
    document.getElementById('view-list').classList.toggle('active', mode === 'list');
}

// ========== フィルタリセット ==========
function resetFilters() {
    state.filters = { type: null, domain: null, set: null, rarity: null, search: '' };
    
    // UIリセット
    document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
    document.getElementById('search-input').value = '';
    document.getElementById('search-clear').classList.remove('visible');
    
    applyFilters();
}

// ========== 統計更新 ==========
function updateStats() {
    document.getElementById('stat-total').textContent = state.cards.length;
    
    const sets = new Set(state.cards.map(c => c.set).filter(Boolean));
    document.getElementById('stat-sets').textContent = sets.size;
    
    const domains = new Set();
    state.cards.forEach(c => {
        if (c.domains) c.domains.forEach(d => domains.add(d));
    });
    document.getElementById('stat-domains').textContent = domains.size;
}

function updateResultCount() {
    const el = document.getElementById('result-count');
    el.textContent = `${state.filteredCards.length} 枚のカード`;
}

// ========== ユーティリティ ==========
function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
}

function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * :rb_xxx: タグからrb_プレフィックスを除去する
 * 例: :rb_might: → :might:, :rb_energy_1: → :energy_1:
 */
function stripIconPrefix(text) {
    return text.replace(/:rb_/g, ':');
}
