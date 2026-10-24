'use strict';

/* 介面互動：主題、分頁、列印、提示。 */
(function () {
  const THEME_KEY = 'ziwei-theme';

  /* 背景圖對應表：淺色／深色 × 桌機／手機 */
  const BG_IMAGES = {
    dark: { desktop: './bg-ziwei.jpg', mobile: './bg-ziwei-mobile.jpg' },
    light: { desktop: './bg-ziwei-light.jpg', mobile: './bg-ziwei-light-mobile.jpg' },
  };

  /* 先把背景圖抓下來並解碼，切換主題時才不會出現背景消失又跳出的閃爍 */
  const bgReady = {};
  function preloadBg(mode) {
    const set = BG_IMAGES[mode];
    if (!set) return;
    const src = window.matchMedia('(max-width: 760px)').matches ? set.mobile : set.desktop;
    if (bgReady[src]) return bgReady[src];
    bgReady[src] = new Promise((resolve) => {
      const img = new Image();
      const done = () => resolve();
      img.onload = () => {
        if (img.decode) img.decode().then(done, done);
        else done();
      };
      img.onerror = done;
      img.src = src;
    });
    return bgReady[src];
  }

  function applyTheme(mode) {
    const light = mode === 'light';
    document.body.classList.toggle('light', light);
    const btn = document.getElementById('themeBtn');
    if (btn) btn.textContent = light ? '深色' : '淺色';
    try {
      localStorage.setItem(THEME_KEY, light ? 'light' : 'dark');
    } catch (err) {
      /* 忽略無法寫入 localStorage 的情況 */
    }
  }

  function initTheme() {
    let saved = null;
    try {
      saved = localStorage.getItem(THEME_KEY);
    } catch (err) {
      saved = null;
    }
    const mode = saved === 'light' ? 'light' : 'dark';
    applyTheme(mode);
    preloadBg(mode);
    const btn = document.getElementById('themeBtn');
    if (btn) {
      btn.addEventListener('click', () =>
        applyTheme(document.body.classList.contains('light') ? 'dark' : 'light')
      );
      /* 游標移上／鍵盤 focus 時，先把另一張背景圖解碼好，點下去就是直接換圖 */
      const warm = () => preloadBg(document.body.classList.contains('light') ? 'dark' : 'light');
      btn.addEventListener('pointerenter', warm);
      btn.addEventListener('focus', warm);
    }
  }

  function initTabs() {
    const tabs = [...document.querySelectorAll('.tab')];
    const panels = [...document.querySelectorAll('.tab-panel')];
    const activate = (name) => {
      tabs.forEach((t) => t.classList.toggle('is-active', t.dataset.tab === name));
      panels.forEach((p) => p.classList.toggle('is-active', p.dataset.panel === name));
      try {
        history.replaceState(null, '', `#${name}`);
      } catch (err) {
        /* 忽略 */
      }
    };
    tabs.forEach((tab) => tab.addEventListener('click', () => activate(tab.dataset.tab)));
    const initial = location.hash.replace('#', '');
    if (['overview', 'palaces', 'patterns', 'fortune'].includes(initial)) activate(initial);
  }

  let toastTimer = null;
  function toast(message) {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = message;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      el.hidden = true;
    }, 3200);
  }

  function initPrint() {
    const btn = document.getElementById('printBtn');
    if (btn) btn.addEventListener('click', () => window.print());
  }

  window.ZiweiUI = { initTheme, initTabs, initPrint, toast, applyTheme };
})();
