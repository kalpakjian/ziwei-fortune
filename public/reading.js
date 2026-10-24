'use strict';

/* 解讀面板：總覽、十二宮卡片。 */
(function () {
  const { esc } = window.ZiweiRender;

  function renderOverview(reading) {
    const personality = document.getElementById('personalityText');
    personality.innerHTML = reading.personality.paragraphs
      .map((p) => `<p>${esc(p)}</p>`)
      .join('');

    const keywordRow = document.getElementById('keywordRow');
    keywordRow.innerHTML = reading.personality.keywords
      .map((k) => `<span>${esc(k)}</span>`)
      .join('');

    const dims = document.getElementById('dimensionList');
    dims.innerHTML = reading.dimensions
      .map(
        (d) => `
        <div class="dimension-row">
          <span class="dimension-label">${esc(d.label)}</span>
          <span class="dimension-bar"><i style="width:${Math.max(4, d.score || 0)}%"></i></span>
          <span class="dimension-score"><b>${d.score ?? '—'}</b> / ${esc(d.grade || '')}</span>
        </div>`
      )
      .join('');

    const luck = document.getElementById('luckPanel');
    const fortune = reading.summary.fortune;
    luck.innerHTML = `
      <div>
        <h2>幸運元素</h2>
        <p>依命局五行（${esc(reading.personality.element)}）給出的日常提示，不是吉凶保證。</p>
      </div>
      <div class="luck-items">
        <div class="luck-item"><small>幸運色</small><strong>${esc(fortune ? fortune.color : '—')}</strong></div>
        <div class="luck-item"><small>有利方位</small><strong>${esc(fortune ? fortune.direction : '—')}</strong></div>
        <div class="luck-item"><small>適合投入</small><strong>${esc(fortune ? fortune.action : '—')}</strong></div>
      </div>`;

    document.getElementById('notesList').innerHTML = reading.notes
      .map((n) => `<li>${esc(n)}</li>`)
      .join('');
  }

  function renderPalaceCards(result) {
    const { reading, chart } = result;
    const wrap = document.getElementById('palaceCards');
    wrap.innerHTML = reading.palaces
      .map((p) => {
        const raw = chart.palaces.find((x) => x.index === p.index);
        const isOpen = p.name === '命宮';
        const stars = p.stars.length
          ? p.stars
              .map(
                (s) =>
                  `<span class="pd-star">${esc(s.name)}${
                    s.brightness ? `<small>${esc(s.brightness)}</small>` : ''
                  }${s.mutagen ? `<small>化${esc(s.mutagen)}</small>` : ''}</span>`
              )
              .join('')
          : '<span class="pd-star">空宮</span>';
        return `
          <details class="palace-card" ${isOpen ? 'open' : ''} data-index="${p.index}">
            <summary>
              <span class="pc-title">${esc(p.name)}宮<small>${esc(p.stem)}${esc(
                p.branch
              )}</small></span>
              ${raw && raw.isBodyPalace ? '<span class="pc-tag">身宮</span>' : ''}
              <span class="pc-score"><b>${p.score}</b> 分 · ${esc(p.grade)}</span>
            </summary>
            <div class="palace-card-body">
              <div class="pd-stars">${stars}</div>
              <p>${esc(p.text)}</p>
              <button type="button" class="text-btn js-palace-link" data-index="${p.index}">
                在命盤上查看三方四正 →
              </button>
            </div>
          </details>`;
      })
      .join('');
  }

  window.ZiweiReading = { renderOverview, renderPalaceCards };
})();
