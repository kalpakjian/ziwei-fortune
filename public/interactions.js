'use strict';

/* 命盤互動：三方四正高亮、宮位詳情。 */
(function () {
  const { esc } = window.ZiweiRender;

  function toggleTrine(indices, on) {
    for (const i of indices) {
      const cell = document.querySelector(`.palace-cell[data-index="${i}"]`);
      if (cell) cell.classList.toggle('is-trine', on);
    }
  }

  function showPalace(index) {
    const detail = document.getElementById('palaceDetail');
    const data = (window.__ziwei || {}).result;
    if (!detail || !data) return;

    const p = data.reading.palaces.find((r) => r.index === Number(index));
    const raw = data.chart.palaces.find((r) => r.index === Number(index));
    if (!p || !raw) return;

    document
      .querySelectorAll('.palace-cell.is-selected')
      .forEach((el) => el.classList.remove('is-selected'));
    const cell = document.querySelector(`.palace-cell[data-index="${index}"]`);
    if (cell) cell.classList.add('is-selected');

    detail.hidden = false;
    detail.innerHTML = `
      <div class="pd-head">
        <h3>${esc(p.name)}宮<small>${esc(p.stem)}${esc(p.branch)}${
          raw.isBodyPalace ? ' · 身宮' : ''
        }</small></h3>
        <button type="button" class="pd-close" aria-label="關閉">×</button>
      </div>
      <div class="pd-stars">
        ${
          p.stars.length
            ? p.stars
                .map(
                  (s) =>
                    `<span class="pd-star">${esc(s.name)}${
                      s.brightness ? `<small>${esc(s.brightness)}</small>` : ''
                    }${s.mutagen ? `<small>化${esc(s.mutagen)}</small>` : ''}</span>`
                )
                .join('')
            : '<span class="pd-star">空宮</span>'
        }
        <span class="pd-star">${p.score} 分 · ${esc(p.grade)}</span>
      </div>
      <p class="pd-text">${esc(p.text)}</p>`;

    detail.querySelector('.pd-close').addEventListener('click', () => {
      detail.hidden = true;
      document
        .querySelectorAll('.palace-cell.is-selected')
        .forEach((el) => el.classList.remove('is-selected'));
    });
  }

  function bindChartEvents() {
    const grid = document.getElementById('chartGrid');
    if (!grid) return;
    for (const cell of grid.querySelectorAll('.palace-cell')) {
      const index = Number(cell.dataset.index);
      const trine = window.ZiweiRender.surroundOf(index);
      cell.addEventListener('mouseenter', () => toggleTrine(trine, true));
      cell.addEventListener('mouseleave', () => toggleTrine(trine, false));
      cell.addEventListener('focus', () => toggleTrine(trine, true));
      cell.addEventListener('blur', () => toggleTrine(trine, false));
      cell.addEventListener('click', () => showPalace(index));
      cell.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter' || ev.key === ' ') {
          ev.preventDefault();
          showPalace(index);
        }
      });
    }

    const soulCell = grid.querySelector('.palace-cell.is-soul');
    if (soulCell) soulCell.classList.add('is-selected');
  }

  window.ZiweiInteractions = { toggleTrine, showPalace, bindChartEvents };
})();
