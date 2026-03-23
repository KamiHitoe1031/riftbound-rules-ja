/**
 * Riftbound Core Rules 翻訳ビューアー
 * 原文と翻訳を並列表示し、キーワードの英語/日本語切替機能を提供
 */

// DOM要素の参照
const elements = {
  contentEn: document.getElementById('content-en'),
  contentJa: document.getElementById('content-ja'),
  keywordToggle: document.getElementById('keyword-toggle'),
  syncToggle: document.getElementById('sync-toggle'),
  sidebar: document.getElementById('sidebar'),
  sidebarToggle: document.getElementById('sidebar-toggle'),
  mainContent: document.getElementById('main-content'),
  navList: document.getElementById('nav-list'),
  backToTop: document.getElementById('back-to-top'),
  loading: document.getElementById('loading'),
};

// 状態管理
const state = {
  keywordMode: 'en', // 'en' または 'ja'
  syncScroll: true,
  sidebarOpen: window.innerWidth > 1024,
  data: null,
};

// Riftboundの公式セクションタイトル（ルール番号で始まる大分類のみ）
const MAIN_SECTIONS = new Set([
  // ルールブック内で明示的にセクション見出しとして使われるもの
  'Golden and Silver Rules', 'Golden Rule', 'Silver Rule',
  'Game Concepts', 'Deck Construction', 'Setup', 'Spaces',
  'Setup Process', 'Game Objects', 'Cards', 'Privacy',
  'Units', 'Gear', 'Spells', 'Runes', 'Rune Pools',
  'Basic Runes', 'Battlefields', 'Legends', 'Tokens', 'Control',
  'Playing the Game', 'The Turn', 'States of the Turn',
  'Priority and Focus', 'Phases of the Turn',
  'Start of Turn', 'Action Phase', 'End of Turn Phase',
  'Cleanups', 'Chains and Showdowns', 'Chains', 'Showdowns',
  'Playing Cards', 'Abilities',
  'Passive Abilities', 'Replacement Effects', 'Activated Abilities',
  'Triggered Abilities', 'Reflexive Triggers', 'Delayed Abilities',
  'Playing or Activating Abilities',
  'Game Actions', 'Types of Actions',
  'Draw', 'Exhaust', 'Ready', 'Recycle', 'Deal', 'Heal',
  'Play', 'Move', 'Hide', 'Discard', 'Stun', 'Reveal',
  'Counter', 'Buff', 'Banish', 'Kill', 'Add', 'Channel',
  'Burn Out', 'Movement', 'Recalls', 'Combat',
  'The Steps of Combat', 'Scoring', 'Modes of Play',
  'Buffs', 'Keywords',
]);

/**
 * 初期化
 */
async function init() {
  try {
    const response = await fetch('data.json');
    state.data = await response.json();
    renderContent();
    renderNavigation();
    setupEventListeners();
    elements.loading.classList.add('hidden');

    if (window.innerWidth <= 1024) {
      elements.sidebar.classList.add('collapsed');
      elements.mainContent.classList.add('expanded');
    }
  } catch (error) {
    console.error('データ読み込みエラー:', error);
    elements.loading.innerHTML = `
      <p style="color: var(--accent-red);">データの読み込みに失敗しました</p>
      <p style="color: var(--text-secondary); font-size: 0.8rem;">${error.message}</p>
    `;
  }
}

/**
 * コンテンツを描画
 */
function renderContent() {
  const { pages } = state.data;
  
  let enHtml = '';
  let jaHtml = '';
  
  pages.forEach((page, index) => {
    const pageId = `page-${index}`;
    
    // linesからen/ja_keyword_en/ja_keyword_jaの配列を抽出
    const enLines = page.lines.map(l => l.en);
    const jaEnLines = page.lines.map(l => l.ja_keyword_en);
    const jaJaLines = page.lines.map(l => l.ja_keyword_ja);
    
    // 英語原文
    enHtml += `<div class="page-block" id="${pageId}-en">`;
    enHtml += `<div class="page-number">📄 Page ${index + 1}</div>`;
    enHtml += renderLines(enLines, 'en');
    enHtml += '</div>';
    
    // 日本語翻訳（キーワード英語版）
    jaHtml += `<div class="page-block" id="${pageId}-ja">`;
    jaHtml += `<div class="page-number">📄 ページ ${index + 1}</div>`;
    jaHtml += `<div class="ja-content ja-keyword-en">`;
    jaHtml += renderLines(jaEnLines, 'ja');
    jaHtml += '</div>';
    // キーワード日本語版（初期非表示）
    jaHtml += `<div class="ja-content ja-keyword-ja" style="display:none;">`;
    jaHtml += renderLines(jaJaLines, 'ja');
    jaHtml += '</div>';
    jaHtml += '</div>';
  });
  
  elements.contentEn.innerHTML = enHtml;
  elements.contentJa.innerHTML = jaHtml;
}

/**
 * 行のリストをHTMLに変換
 */
function renderLines(lines, lang) {
  if (!lines || !Array.isArray(lines)) return '';
  
  let html = '';
  for (const line of lines) {
    if (!line || (typeof line === 'string' && line.trim() === '')) continue;
    const trimmed = typeof line === 'string' ? line.trim() : String(line);
    html += classifyAndRender(trimmed, lang);
  }
  return html;
}

/**
 * 行を分類してHTMLノードに変換
 */
function classifyAndRender(text, lang) {
  // ルール番号パターン（例: 001. / 103.1.b.4. / 352.8.a.3.）
  const ruleMatch = text.match(/^(\d+\.[\d.a-z]*\.?)\s*(.*)/);
  
  if (ruleMatch) {
    const ruleNum = ruleMatch[1];
    const content = ruleMatch[2] || '';
    const indent = getIndentLevel(ruleNum);
    
    // メインセクションタイトルの判定（ルール番号の後の内容がセクション名に完全一致）
    const isSection = MAIN_SECTIONS.has(content.trim());
    
    if (isSection) {
      return `<div class="section-title" id="section-${ruleNum}">` +
             `<span class="rule-number">${esc(ruleNum)}</span> ${esc(content)}</div>`;
    }
    
    return `<div class="rule-section rule-indent-${indent}">` +
           `<span class="rule-number">${esc(ruleNum)}</span>` +
           `<span class="rule-text">${esc(content)}</span>` +
           `</div>`;
  }
  
  // 例文（Example: で始まる、または翻訳で「例:」）
  if (/^(Example|Examples|例|例：)\s*[:：]/.test(text)) {
    return `<div class="rule-example">${esc(text)}</div>`;
  }
  
  // ルール参照（See rule ... / 参照:）
  if (/^(See rule|参照\s*[:：])/.test(text)) {
    return `<div class="rule-see-also">${esc(text)}</div>`;
  }
  
  // 箇条書き
  if (text.startsWith('*')) {
    return `<div class="rule-text rule-indent-1">${esc(text)}</div>`;
  }
  
  // 通常テキスト
  return `<div class="rule-text">${esc(text)}</div>`;
}

/**
 * ルール番号からインデントレベルを算出
 * 例: 001. → 0, 103.1. → 1, 103.1.a. → 2, 103.1.a.1. → 3
 */
function getIndentLevel(ruleNum) {
  // 末尾のドットを除去して分割
  const cleaned = ruleNum.replace(/\.$/, '');
  const parts = cleaned.split('.').filter(p => p !== '');
  return Math.min(Math.max(parts.length - 1, 0), 4);
}

/**
 * HTMLエスケープ
 */
function esc(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * ナビゲーションの描画
 */
function renderNavigation() {
  const { pages } = state.data;
  let html = '';
  pages.forEach((page, index) => {
    const title = page.title || `Page ${index + 1}`;
    html += `<li><a href="#page-${index}-en" data-page="${index}">${esc(title)}</a></li>`;
  });
  elements.navList.innerHTML = html;
}

/**
 * イベントリスナーの設定
 */
function setupEventListeners() {
  if (elements.keywordToggle) {
    elements.keywordToggle.addEventListener('click', toggleKeywords);
  }
  elements.syncToggle.addEventListener('click', toggleSyncScroll);
  elements.sidebarToggle.addEventListener('click', toggleSidebar);
  window.addEventListener('scroll', handleScroll);
  elements.backToTop.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
  window.addEventListener('resize', handleResize);
  elements.navList.addEventListener('click', (e) => {
    if (e.target.tagName === 'A' && window.innerWidth <= 1024) {
      toggleSidebar();
    }
  });

  // モバイルタブ切替
  const tabBar = document.getElementById('mobile-tab-bar');
  if (tabBar) {
    tabBar.addEventListener('click', (e) => {
      const tab = e.target.closest('.mobile-tab');
      if (!tab) return;
      const target = tab.dataset.target;
      tabBar.querySelectorAll('.mobile-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById('column-en').classList.toggle('mobile-active', target === 'en');
      document.getElementById('column-ja').classList.toggle('mobile-active', target === 'ja');
    });
  }

  // 初期状態: モバイル幅なら日本語カラムを表示
  initMobileTab();
}

/**
 * キーワード英語/日本語切替
 */
function toggleKeywords() {
  const options = elements.keywordToggle.querySelectorAll('.toggle-option');
  
  if (state.keywordMode === 'en') {
    state.keywordMode = 'ja';
    options[0].classList.remove('active');
    options[1].classList.add('active');
    // 日本語カラムのコンテンツを切替
    document.querySelectorAll('.ja-keyword-en').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.ja-keyword-ja').forEach(el => el.style.display = 'block');
  } else {
    state.keywordMode = 'en';
    options[0].classList.add('active');
    options[1].classList.remove('active');
    document.querySelectorAll('.ja-keyword-en').forEach(el => el.style.display = 'block');
    document.querySelectorAll('.ja-keyword-ja').forEach(el => el.style.display = 'none');
  }
}

/**
 * 同期スクロール切替
 */
function toggleSyncScroll() {
  state.syncScroll = !state.syncScroll;
  elements.syncToggle.classList.toggle('active');
}

/**
 * サイドバー切替
 */
function toggleSidebar() {
  state.sidebarOpen = !state.sidebarOpen;
  elements.sidebar.classList.toggle('collapsed');
  elements.sidebar.classList.toggle('open');
  elements.mainContent.classList.toggle('expanded');
}

/**
 * スクロールハンドラ
 */
function handleScroll() {
  elements.backToTop.classList.toggle('visible', window.scrollY > 400);
  updateActiveNav();
}

/**
 * アクティブナビゲーション更新
 */
function updateActiveNav() {
  const blocks = document.querySelectorAll('.column-en .page-block');
  let activeId = null;
  blocks.forEach(block => {
    if (block.getBoundingClientRect().top <= 200) {
      activeId = block.id;
    }
  });
  if (activeId) {
    elements.navList.querySelectorAll('a').forEach(link => {
      link.classList.toggle('active', link.getAttribute('href') === '#' + activeId);
    });
  }
}

/**
 * リサイズハンドラ
 */
function handleResize() {
  if (window.innerWidth > 1024) {
    elements.sidebar.classList.remove('collapsed', 'open');
    elements.mainContent.classList.remove('expanded');
    state.sidebarOpen = true;
  } else if (!state.sidebarOpen) {
    elements.sidebar.classList.add('collapsed');
    elements.mainContent.classList.add('expanded');
  }
  initMobileTab();
}

/**
 * モバイルタブの初期化・リサイズ対応
 */
function initMobileTab() {
  const colEn = document.getElementById('column-en');
  const colJa = document.getElementById('column-ja');
  if (window.innerWidth <= 768) {
    // モバイル: アクティブなタブに合わせて表示
    if (!colEn.classList.contains('mobile-active') && !colJa.classList.contains('mobile-active')) {
      colJa.classList.add('mobile-active');
    }
  } else {
    // PC: 両カラム表示に戻す
    colEn.classList.remove('mobile-active');
    colJa.classList.remove('mobile-active');
  }
}

// 初期化実行
document.addEventListener('DOMContentLoaded', init);
