'use strict';

/* 主控制器：請求 API、組裝畫面、處理互動。 */
(function () {
  const API = '/api/chart';
  const { state, $, collect, fillDemo, syncYearSelects } = window.ZiweiForm;

  async function requestChart(payload) {
    // 靜態版：直接用瀏覽器內的排盤引擎，不發任何請求
    const engine = window.ZiweiEngine;
    if (engine && typeof engine.cast === 'function') {
      return Promise.resolve().then(() => engine.cast(payload));
    }

    const res = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    let data = null;
    try {
      data = await res.json();
    } catch (err) {
      data = null;
    }
    if (!res.ok) throw new Error((data && data.error) || `排盤失敗（HTTP ${res.status}）`);
    return data;
  }

  function renderIdentity(result) {
    const { chart, reading } = result;
    const meta = chart.meta;
    $('identityName').textContent = meta.name ? `${meta.name} 的命盤` : '無名命盤';
    $('identityMeta').textContent = `${meta.gender} · 國曆 ${meta.solarDate} · 農曆 ${meta.lunarDate} · ${meta.time}（${meta.timeRange}）· ${meta.fiveElementsClass} · 命主 ${meta.soul} · 身主 ${meta.body}`;
    $('tagRow').innerHTML = reading.summary.tags
      .map((t) => `<span class="tag">${t}</span>`)
      .join('');

    $('scoreRing').style.setProperty('--p', String(reading.summary.score));
    $('scoreValue').textContent = String(reading.summary.score);
    $('scoreGrade').textContent = reading.summary.grade;
    document.title = `${meta.name || '命盤'}｜紫微斗數命盤解讀`;
  }

  function renderResult(result, options) {
    state.result = result;
    window.__ziwei = { result };

    renderIdentity(result);
    window.ZiweiRender.renderChart(result);
    window.ZiweiInteractions.bindChartEvents();
    window.ZiweiReading.renderAll(result);
    syncYearSelects(result.fortune.year);
    $('fortuneYear').value = String(result.fortune.year);
    $('fortuneYearInline').value = String(result.fortune.year);

    const panel = $('result');
    panel.hidden = false;
    panel.classList.remove('is-loading');
    if (options && options.scroll) panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function setLoading(on) {
    state.loading = on;
    const btn = $('submitBtn');
    btn.disabled = on;
    btn.querySelector('span').textContent = on ? '排盤中…' : '開始排盤';
    if (on && !$('result').hidden) $('result').classList.add('is-loading');
  }

  function showError(message) {
    const el = $('errorMsg');
    el.textContent = message;
    el.hidden = false;
  }

  async function submitForm(ev) {
    if (ev) ev.preventDefault();
    if (state.loading) return;
    $('errorMsg').hidden = true;

    setLoading(true);
    try {
      const result = await requestChart(collect());
      renderResult(result, { scroll: true });
    } catch (err) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function changeFortuneYear(year) {
    if (!state.result || state.loading) return;
    const payload = collect();
    payload.fortuneYear = Number(year);
    setLoading(true);
    const keepY = window.scrollY;
    try {
      const result = await requestChart(payload);
      renderResult(result, { scroll: false });
      window.scrollTo({ top: keepY });
    } catch (err) {
      window.ZiweiUI.toast(err.message);
    } finally {
      setLoading(false);
    }
  }

  function bindEvents() {
    $('birthForm').addEventListener('submit', submitForm);

    document.querySelectorAll('input[name="calendar"]').forEach((radio) => {
      radio.addEventListener('change', () => {
        const lunar = window.ZiweiForm.isLunar();
        $('leapWrap').hidden = !lunar;
        $('calendarHint').textContent = lunar ? '農曆' : '國曆（西元）';
        window.ZiweiForm.fillDays(true);
      });
    });

    $('year').addEventListener('change', () => {
      window.ZiweiForm.fillDays(true);
      syncYearSelects(Number($('fortuneYear').value) || state.year);
    });
    $('month').addEventListener('change', () => {
      window.ZiweiForm.fillDays(true);
      syncYearSelects(Number($('fortuneYear').value) || state.year);
    });

    $('fortuneYear').addEventListener('change', () => {
      $('fortuneYearInline').value = $('fortuneYear').value;
    });
    $('fortuneYearInline').addEventListener('change', (ev) => {
      $('fortuneYear').value = ev.target.value;
      changeFortuneYear(Number(ev.target.value));
    });

    $('demoBtn').addEventListener('click', () => {
      fillDemo();
      submitForm();
    });

    $('exportBtn').addEventListener('click', () => {
      if (!state.result) {
        window.ZiweiUI.toast('請先排盤，再匯出解讀文字檔。');
        return;
      }
      window.ZiweiExport.exportMarkdown(state.result);
      const ds = state.result.dataset;
      window.ZiweiUI.toast(
        ds && ds.available
          ? '已匯出完整解讀（含 v4.0 詳細解讀）。'
          : '已匯出精簡版：這個版本沒有 v4.0 資料集，詳細解讀請用本機版匯出。'
      );
    });

    $('exportTxtBtn').addEventListener('click', () => {
      if (!state.result) {
        window.ZiweiUI.toast('請先排盤，再匯出解讀文字檔。');
        return;
      }
      window.ZiweiExport.exportPlainText(state.result);
      window.ZiweiUI.toast('已匯出純文字檔（可直接貼到通訊軟體）。');
    });

    document.addEventListener('click', (ev) => {
      const link = ev.target.closest('.js-palace-link');
      if (!link) return;
      const index = Number(link.dataset.index);
      document.querySelector('.chart-panel').scrollIntoView({ behavior: 'smooth', block: 'start' });
      window.setTimeout(() => window.ZiweiInteractions.showPalace(index), 380);
    });
  }

  async function loadTimeOptions() {
    const engine = window.ZiweiEngine;
    if (engine && Array.isArray(engine.TIME_OPTIONS) && engine.TIME_OPTIONS.length === 13) {
      state.timeOptions = engine.TIME_OPTIONS;
      const current = $('timeIndex').value;
      window.ZiweiForm.fillTimeOptions();
      $('timeIndex').value = current || '6';
      return;
    }

    try {
      const res = await fetch('/api/time-options');
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.timeOptions) && data.timeOptions.length === 13) {
        state.timeOptions = data.timeOptions;
        const previous = $('timeIndex').value;
        window.ZiweiForm.fillTimeOptions();
        $('timeIndex').value = previous || '6';
      }
    } catch (err) {
      /* 沿用內建時辰表 */
    }
  }

  /** 把一筆生辰資料填進表單（匯入功能用） */
  function fillForm(data) {
    const $ = window.ZiweiForm.$;
    if (data.name !== undefined) $('name').value = data.name;
    if (data.gender) {
      const radio = document.querySelector(`input[name="gender"][value="${data.gender}"]`);
      if (radio) radio.checked = true;
    }
    if (data.calendar) {
      const radio = document.querySelector(`input[name="calendar"][value="${data.calendar}"]`);
      if (radio) {
        radio.checked = true;
        radio.dispatchEvent(new Event('change'));
      }
    }
    if (data.year) $('year').value = String(data.year);
    window.ZiweiForm.fillMonths();
    if (data.month) $('month').value = String(data.month);
    window.ZiweiForm.fillDays(true);
    if (data.day) $('day').value = String(data.day);
    if (data.timeIndex !== undefined) $('timeIndex').value = String(data.timeIndex);
    if (data.isLeapMonth !== undefined) {
      const leap = $('isLeapMonth');
      if (leap) leap.checked = !!data.isLeapMonth;
      const wrap = $('leapWrap');
      if (wrap) wrap.hidden = !data.isLeapMonth && !window.ZiweiForm.isLunar();
    }
    window.ZiweiForm.syncYearSelects(state.year);
  }

  function init() {
    window.ZiweiUI.initTheme();
    window.ZiweiUI.initTabs();
    window.ZiweiUI.initPrint();
    window.ZiweiForm.init();
    bindEvents();
    loadTimeOptions();
    if (window.ZiweiImport && window.ZiweiImport.init) window.ZiweiImport.init();

    // 列印時展開所有宮位卡，避免 details 收合導致內容消失
    window.addEventListener('beforeprint', () => {
      document.querySelectorAll('details.palace-card').forEach((d) => {
        d.open = true;
      });
    });
  }

  window.ZiweiApp = { requestChart, collect, fillForm, submitForm, renderResult };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
