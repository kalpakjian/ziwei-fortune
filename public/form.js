'use strict';

/* 表單資料處理：選項、日期、收集與範例。 */
(function () {
  const TIME_FALLBACK = [
    { index: 0, label: '早子時', range: '00:00–00:59' },
    { index: 1, label: '丑時', range: '01:00–02:59' },
    { index: 2, label: '寅時', range: '03:00–04:59' },
    { index: 3, label: '卯時', range: '05:00–06:59' },
    { index: 4, label: '辰時', range: '07:00–08:59' },
    { index: 5, label: '巳時', range: '09:00–10:59' },
    { index: 6, label: '午時', range: '11:00–12:59' },
    { index: 7, label: '未時', range: '13:00–14:59' },
    { index: 8, label: '申時', range: '15:00–16:59' },
    { index: 9, label: '酉時', range: '17:00–18:59' },
    { index: 10, label: '戌時', range: '19:00–20:59' },
    { index: 11, label: '亥時', range: '21:00–22:59' },
    { index: 12, label: '晚子時', range: '23:00–23:59' },
  ];

  const state = {
    result: null,
    timeOptions: TIME_FALLBACK,
    year: new Date().getFullYear(),
    loading: false,
  };

  const $ = (id) => document.getElementById(id);

  function fillTimeOptions() {
    const sel = $('timeIndex');
    sel.innerHTML = state.timeOptions
      .map(
        (t) =>
          `<option value="${t.index}">${t.label}（${t.range}）${
            t.index === 0 ? ' — 當日' : t.index === 12 ? ' — 當日深夜' : ''
          }</option>`
      )
      .join('');
    sel.value = '6';
  }

  function daysInMonth(year, month) {
    return new Date(year, month, 0).getDate();
  }

  function isLunar() {
    return document.querySelector('input[name="calendar"]:checked').value === 'lunar';
  }

  function fillDays(preserve) {
    const year = Number($('year').value) || state.year;
    const month = Number($('month').value) || 1;
    const max = isLunar() ? 30 : daysInMonth(year, month);
    const current = preserve ? Number($('day').value) : 1;
    $('day').innerHTML = Array.from({ length: max }, (_, i) => i + 1)
      .map((d) => `<option value="${d}">${d} 日</option>`)
      .join('');
    $('day').value = String(Math.min(current || 1, max));
  }

  function fillMonths() {
    $('month').innerHTML = Array.from({ length: 12 }, (_, i) => i + 1)
      .map((m) => `<option value="${m}">${m} 月</option>`)
      .join('');
  }

  function fillYearSelect(select, birthYear, selected) {
    if (!select) return;
    const from = Math.max(1900, birthYear);
    const to = Math.min(2100, birthYear + 110);
    const years = [];
    for (let y = from; y <= to; y += 1) years.push(y);
    if (!years.includes(selected)) {
      years.push(selected);
      years.sort((a, b) => a - b);
    }
    select.innerHTML = years.map((y) => `<option value="${y}">${y} 年</option>`).join('');
    select.value = String(selected);
  }

  function syncYearSelects(selected) {
    const birthYear = Number($('year').value) || state.year;
    fillYearSelect($('fortuneYear'), birthYear, selected || state.year);
    fillYearSelect($('fortuneYearInline'), birthYear, selected || state.year);
  }

  function collect() {
    const fd = new FormData($('birthForm'));
    return {
      name: String(fd.get('name') || '').trim(),
      gender: fd.get('gender') || '女',
      calendar: fd.get('calendar') || 'solar',
      year: Number(fd.get('year')),
      month: Number(fd.get('month')),
      day: Number(fd.get('day')),
      timeIndex: Number(fd.get('timeIndex')),
      isLeapMonth: fd.get('isLeapMonth') === 'on',
      fixLeap: true,
      fortuneYear: Number(fd.get('fortuneYear')),
    };
  }

  function fillDemo() {
    $('name').value = '王小明';
    document.querySelector('input[name="gender"][value="女"]').checked = true;
    document.querySelector('input[name="calendar"][value="solar"]').checked = true;
    $('year').value = '1990';
    fillMonths();
    $('month').value = '5';
    fillDays(true);
    $('day').value = '17';
    $('timeIndex').value = '6';
    $('leapWrap').hidden = true;
    $('calendarHint').textContent = '國曆（西元）';
    syncYearSelects(state.year);
  }

  function init() {
    fillMonths();
    fillDays(false);
    fillTimeOptions();
    syncYearSelects(state.year);
  }

  window.ZiweiForm = {
    state,
    $,
    TIME_FALLBACK,
    init,
    fillTimeOptions,
    fillDays,
    fillMonths,
    fillYearSelect,
    syncYearSelects,
    collect,
    fillDemo,
    isLunar,
  };
})();
