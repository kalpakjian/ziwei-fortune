'use strict';

/* 解讀面板：格局、大限流年、時間軸。 */
(function () {
  const { esc } = window.ZiweiRender;

  const TONE_LABEL = { good: '吉格', bad: '需留意', neutral: '中性' };

  function renderPatterns(reading) {
    const wrap = document.getElementById('patternList');
    if (!reading.patterns.length) {
      wrap.innerHTML =
        '<p class="pattern-empty">這張盤的命宮三方四正沒有落入本程式收錄的強烈格局，屬於「無格」的平穩盤：優點是限制少、可塑性高，缺點是需要自己定義方向。</p>';
      return;
    }
    wrap.innerHTML = reading.patterns
      .map(
        (p) => `
        <article class="pattern-card ${esc(p.tone)}">
          <h3>${esc(p.name)}<span class="pattern-badge">${esc(
          TONE_LABEL[p.tone] || '格局'
        )}</span></h3>
          <p>${esc(p.text)}</p>
        </article>`
      )
      .join('');
  }

  function mutagenChips(mutagens) {
    if (!mutagens || !mutagens.length) return '';
    return `<div class="fc-mutagens">${mutagens
      .map(
        (m) =>
          `<span class="fc-mut ${esc(m.mutagen === '祿' ? 'lu' : m.mutagen === '權' ? 'quan' : m.mutagen === '科' ? 'ke' : 'ji')}">${esc(
            m.label
          )} → ${esc(m.target)}</span>`
      )
      .join('')}</div>`;
  }

  function card({ kicker, title, sub, score, grade, stars, mutagens, text }) {
    return `
      <article class="fortune-card">
        <header>
          <div>
            <div class="fc-sub">${esc(kicker)}</div>
            <h3>${esc(title)}</h3>
            <div class="fc-sub">${esc(sub)}</div>
          </div>
          <div class="fc-score"><strong>${score}</strong><span>${esc(grade)}</span></div>
        </header>
        <div class="fc-stars">${
          stars.length
            ? stars.map((s) => `<span class="fc-star">${esc(s)}</span>`).join('')
            : '<span class="fc-star">空宮</span>'
        }</div>
        ${mutagenChips(mutagens)}
        <p class="fc-text">${esc(text)}</p>
      </article>`;
  }

  function renderFortune(result) {
    const f = result.fortune;
    const name = result.chart.meta.name || '命主';
    document.getElementById(
      'fortuneSub'
    ).textContent = `${name} · 西元 ${f.year} 年 · 虛歲 ${f.nominalAge} 歲 · 小限在${f.age.palace}宮`;

    document.getElementById('fortuneGrid').innerHTML =
      card({
        kicker: `大限 ${f.decadal.range[0]}–${f.decadal.range[1]} 歲（約 ${f.decadal.years[0]}–${f.decadal.years[1]}）`,
        title: `${f.decadal.stemBranch} 大限`,
        sub: `大限命宮在本命${f.decadal.palace}宮 · ${f.decadal.domain}`,
        score: f.decadal.score,
        grade: f.decadal.grade,
        stars: f.decadal.stars,
        mutagens: f.decadal.mutagens,
        text: f.decadal.text,
      }) +
      card({
        kicker: `${f.year} 流年`,
        title: `${f.yearly.stemBranch} 流年`,
        sub: `流年命宮在本命${f.yearly.palace}宮 · ${f.yearly.domain}`,
        score: f.yearly.score,
        grade: f.yearly.grade,
        stars: f.yearly.stars,
        mutagens: f.yearly.mutagens,
        text: f.yearly.text,
      });

    document.getElementById('timeline').innerHTML = f.timeline
      .map(
        (t) => `
        <li class="${t.isCurrent ? 'is-current' : ''}">
          <span class="tl-age">${t.ageFrom}–${t.ageTo} 歲</span>
          <span class="tl-palace">${esc(t.stemBranch)} · ${esc(t.palace)}宮${
          t.isCurrent ? '（現在）' : ''
        }</span>
          <span class="tl-year">${t.yearFrom}–${t.yearTo}</span>
          <span class="tl-stars">${esc(t.stars.join('、') || '空宮')}</span>
        </li>`
      )
      .join('');
  }

  function renderAll(result) {
    window.ZiweiReading.renderOverview(result.reading);
    window.ZiweiReading.renderPalaceCards(result);
    renderPatterns(result.reading);
    renderFortune(result);
    if (window.ZiweiReading.renderDataset) window.ZiweiReading.renderDataset(result);
  }

  window.ZiweiReading = Object.assign(window.ZiweiReading || {}, {
    renderPatterns,
    renderFortune,
    renderAll,
  });
})();
