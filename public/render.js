'use strict';

/* 命盤渲染：只做 DOM 輸出，不在這裡發請求。 */
(function () {
  const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ESC[c]);
  const MUT_CLASS = { 祿: 'lu', 權: 'quan', 科: 'ke', 忌: 'ji' };

  function surroundOf(index) {
    return [index, (index + 6) % 12, (index + 4) % 12, (index + 8) % 12];
  }

  function starHtml(star) {
    const mut = star.mutagen
      ? `<i class="mut ${MUT_CLASS[star.mutagen] || ''}" title="化${star.mutagen}">${star.mutagen}</i>`
      : '';
    const bright = star.brightness ? `<i class="bright">${esc(star.brightness)}</i>` : '';
    const title = star.text ? ` title="${esc(star.text)}"` : '';
    return `<span class="star"${title}>${esc(star.name)}${bright}${mut}</span>`;
  }

  function minorHtml(star) {
    const cls = star.tone === 'bad' ? 'malefic' : star.tone === 'good' ? 'auspicious' : '';
    return `<span class="${cls}" title="${esc(star.text || '')}">${esc(star.name)}</span>`;
  }

  function yearLabel(fortune) {
    if (!fortune) return '';
    return `${fortune.yearly.stemBranch}年 · 虛歲 ${fortune.nominalAge}`;
  }

  function renderChart(result) {
    const { chart, reading, fortune } = result;
    const grid = document.getElementById('chartGrid');
    if (!grid) return;
    grid.innerHTML = '';

    const limitLabels = new Map();
    if (fortune) {
      for (const [idx, label] of [
        [fortune.decadal.index, '大限'],
        [fortune.yearly.index, '流年'],
      ]) {
        const list = limitLabels.get(idx) || [];
        list.push(label);
        limitLabels.set(idx, list);
      }
    }

    const palaces = [...chart.palaces].sort((a, b) => a.index - b.index);
    for (const p of palaces) {
      const isSoul = p.name === '命宮';
      const labels = limitLabels.get(p.index) || [];
      const el = document.createElement('div');
      el.className = ['palace-cell', isSoul ? 'is-soul' : '', labels.length ? 'is-limit' : '']
        .filter(Boolean)
        .join(' ');
      el.style.gridRow = String(p.grid.row);
      el.style.gridColumn = String(p.grid.col);
      el.dataset.index = String(p.index);
      el.tabIndex = 0;
      el.setAttribute('role', 'button');
      el.setAttribute(
        'aria-label',
        `${p.name}宮 ${p.heavenlyStem}${p.earthlyBranch}，${
          p.majorStars.map((s) => s.name).join('、') || '空宮'
        }`
      );
      if (labels.length) el.dataset.limit = labels.join('·');

      const majors = p.majorStars.length
        ? p.majorStars.map(starHtml).join('')
        : '<span class="empty-star">空宮</span>';
      const minors = p.minorStars.map(minorHtml).join('');

      el.innerHTML = `
        <div class="pc-top">
          <span class="pc-name">${esc(p.name)}${p.isBodyPalace ? '<span class="body-tag">身</span>' : ''}</span>
          <span class="pc-branch">${esc(p.heavenlyStem)}${esc(p.earthlyBranch)}</span>
        </div>
        <div class="pc-stars">${majors}</div>
        <div class="pc-minor">${minors}</div>
        <div class="pc-bottom">
          <span>${p.decadal.range[0]}–${p.decadal.range[1]} 歲</span>
          <span>${esc(p.decadal.heavenlyStem)}${esc(p.decadal.earthlyBranch)}</span>
        </div>`;
      grid.appendChild(el);
    }

    // 中央資訊
    const mutagens = [];
    for (const p of chart.palaces) {
      for (const s of [...p.majorStars, ...p.minorStars]) {
        if (s.mutagen) mutagens.push({ star: s.name, mut: s.mutagen, palace: p.name });
      }
    }
    const order = { 祿: 0, 權: 1, 科: 2, 忌: 3 };
    mutagens.sort((a, b) => order[a.mut] - order[b.mut]);

    const center = document.createElement('div');
    center.className = 'chart-center';
    center.innerHTML = `
      <div class="cc-name">${esc(chart.meta.name || '無名')}</div>
      <div class="cc-meta">
        ${esc(chart.meta.gender)} · ${esc(chart.meta.chineseDate)}<br />
        國曆 ${esc(chart.meta.solarDate)}　農曆 ${esc(chart.meta.lunarDate)}<br />
        ${esc(chart.meta.time)}（${esc(chart.meta.timeRange)}）· ${esc(chart.meta.fiveElementsClass)}
      </div>
      <div class="cc-grid">
        <div class="cc-item"><small>命宮</small><strong>${esc(chart.meta.soulBranch)}</strong></div>
        <div class="cc-item"><small>身宮</small><strong>${esc(chart.meta.bodyBranch)}</strong></div>
        <div class="cc-item"><small>命主</small><strong>${esc(chart.meta.soul)}</strong></div>
        <div class="cc-item"><small>身主</small><strong>${esc(chart.meta.body)}</strong></div>
      </div>
      <div class="cc-mutagen">生年四化：${mutagens
        .map(
          (m) =>
            `<b class="${MUT_CLASS[m.mut]}">${esc(m.star)}${esc(m.mut)}</b><span>（${esc(
              m.palace
            )}）</span>`
        )
        .join(' ')}</div>
      ${
        fortune
          ? `<div class="cc-meta">${esc(fortune.decadal.range[0])}–${esc(
              fortune.decadal.range[1]
            )} 歲大限 · ${esc(fortune.yearly.stemBranch)}流年<br />${esc(yearLabel(fortune))}</div>`
          : ''
      }`;
    grid.appendChild(center);
  }

  window.ZiweiRender = {
    esc,
    renderChart,
    surroundOf,
    starHtml,
    minorHtml,
    yearLabel,
    MUT_CLASS,
    ESC,
  };
})();
