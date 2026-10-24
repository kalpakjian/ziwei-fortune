'use strict';

/* 解讀面板：v4.0 資料集的 13 維詳細解讀（僅本機裝有資料集時出現）。 */
(function () {
  const { esc } = window.ZiweiRender;

  /** 資料集內文的標記：✦ 星曜、· 依據、▸ 引用、▍ 段落 */
  const LIST_MARK = /^[✦·▸▍▶◆・]/;

  function inline(text) {
    return esc(text).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  }

  /** 把資料集的純文字段落轉成 HTML：標題、條列、內文 */
  function renderText(text) {
    const blocks = String(text || '')
      .split(/\n{2,}/)
      .map((b) => b.trim())
      .filter(Boolean);
    const html = [];
    for (const block of blocks) {
      const heading = /^\*\*(.+?)\*\*$/.exec(block);
      if (heading) {
        html.push(`<h4 class="ds-h">${inline(heading[1])}</h4>`);
        continue;
      }
      const lines = block
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean);
      if (lines.length > 1 && lines.every((l) => LIST_MARK.test(l))) {
        html.push(
          `<ul class="ds-list">${lines
            .map((l) => `<li>${inline(l.replace(LIST_MARK, '').trim())}</li>`)
            .join('')}</ul>`
        );
        continue;
      }
      html.push(`<p class="ds-p">${inline(lines.join(' '))}</p>`);
    }
    return html.join('');
  }

  function renderUnavailable(ds) {
    const how = [
      'npm run dataset:download -- --year 1990',
      'npm run dataset:cache -- --year 1990',
    ]
      .map((c) => `<code>${esc(c)}</code>`)
      .join('<br />');
    return `
      <div class="panel dataset-panel">
        <h2>詳細解讀</h2>
        <p class="ds-note">${esc(ds.message || '這次查不到資料集內容。')}</p>
        <p class="ds-note">
          v4.0 資料集是選用的：下載年度檔之後，這裡會多出 13 個主題、每張盤約 2–3 萬字的詳細解讀。
        </p>
        <p class="ds-code">${how}</p>
      </div>`;
  }

  function renderDataset(result) {
    const tab = document.getElementById('datasetTab');
    const panel = document.getElementById('datasetPanel');
    if (!tab || !panel) return;

    const ds = result && result.dataset;
    if (!ds) {
      // 靜態版沒有資料集，隱藏分頁
      tab.hidden = true;
      panel.innerHTML = '';
      return;
    }

    tab.hidden = false;
    if (!ds.available) {
      panel.innerHTML = renderUnavailable(ds);
      return;
    }

    const cards = ds.topics
      .map(
        (t) => `
        <article class="dataset-card">
          <header>
            <h3>${esc(t.label)}</h3>
            <span class="ds-count">${(t.chars || 0).toLocaleString()} 字</span>
          </header>
          <div class="ds-body">${renderText(t.text)}</div>
        </article>`
      )
      .join('');

    panel.innerHTML = `
      <div class="panel dataset-intro">
        <h2>詳細解讀</h2>
        <p>
          資料集索引 <b>${esc(ds.key)}</b>${ds.soulStar ? ` · 命宮主星 ${esc(ds.soulStar)}` : ''} ·
          共 ${(ds.totalChars || 0).toLocaleString()} 字、${ds.topics.length} 個主題。
        </p>
        <p class="ds-note">${esc(ds.source.note || '')}</p>
      </div>
      <div class="dataset-list">${cards}</div>
      <p class="dataset-source">
        出處：<a href="${esc(ds.source.repo)}" target="_blank" rel="noreferrer">Renhuai123/ziwei-doushu</a>
        〈${esc(ds.source.name)}〉（${esc(ds.source.license)}）
      </p>`;
  }

  window.ZiweiReading = Object.assign(window.ZiweiReading || {}, { renderDataset });
})();
