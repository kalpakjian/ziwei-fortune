'use strict';

/* 匯入：把生辰（或八字）一次貼上，直接排盤並匯出詳細解讀。 */
(function () {
  const { esc } = window.ZiweiRender;

  const HOUR_LABELS = [
    '早子時', '丑時', '寅時', '卯時', '辰時', '巳時', '午時',
    '未時', '申時', '酉時', '戌時', '亥時', '晚子時',
  ];
  const HOUR_CHARS = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
  const STEMS = '甲乙丙丁戊己庚辛壬癸';
  const BRANCHES = '子丑寅卯辰巳午未申酉戌亥';
  const GANZHI = window.ZiweiGanzhi ? window.ZiweiGanzhi.GAN_ZHI : [];

  /** 每行的解析結果 */
  let records = [];

  function isGanzhi(token) {
    return GANZHI.indexOf(token) >= 0;
  }

  /** 從文字抽出日期 */
  function pickDate(text) {
    const m = /(\d{4})\s*[-/.年]\s*(\d{1,2})\s*[-/.月]\s*(\d{1,2})\s*日?/.exec(text);
    if (!m) return null;
    return { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]), matched: m[0] };
  }

  /** 從文字抽出時辰（回傳 index 與命中的字串） */
  function pickHour(text) {
    const late = /晚\s*[子時时]/.exec(text);
    if (late) return { index: 12, matched: late[0] };
    const withShi = /([子丑寅卯辰巳午未申酉戌亥])\s*[時时]/.exec(text);
    if (withShi) {
      const idx = HOUR_CHARS.indexOf(withShi[1]);
      if (idx >= 0) return { index: idx, matched: withShi[0] };
    }
    const numeric = /(?:時辰|时辰|時|时)\s*[:：]?\s*(\d{1,2})/.exec(text);
    if (numeric) {
      const n = Number(numeric[1]);
      if (n >= 0 && n <= 12) return { index: n, matched: numeric[0] };
    }
    return null;
  }

  function pickGender(text) {
    if (/男|male|\bM\b/i.test(text)) return { value: '男', matched: '男' };
    if (/女|female|\bF\b/i.test(text)) return { value: '女', matched: '女' };
    return null;
  }

  function pickCalendar(text) {
    if (/農曆|农历|lunar/i.test(text)) return { value: 'lunar', matched: '農曆' };
    if (/國曆|公歷|公历|西元|solar/i.test(text)) return { value: 'solar', matched: '國曆' };
    return null;
  }

  /** 抓出四柱（八字） */
  function pickBazi(text) {
    const tokens = text.match(/[甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥]/g) || [];
    if (tokens.length < 4) return null;
    const four = tokens.slice(0, 4);
    if (!four.every(isGanzhi)) return null;
    return { pillars: four, matched: four.join(' ') };
  }

  /** 單行解析 */
  function parseLine(raw, index) {
    const line = String(raw || '').trim();
    if (!line || line.startsWith('#')) return null;

    const bazi = pickBazi(line);
    const date = pickDate(line);
    const hour = pickHour(line);
    const gender = pickGender(line);
    const calendar = pickCalendar(line);

    const rec = {
      index,
      name: '',
      calendar: calendar ? calendar.value : 'solar',
      year: '',
      month: '',
      day: '',
      timeIndex: hour ? hour.index : 6,
      gender: gender ? gender.value : '女',
      note: '',
      alternatives: [],
    };

    if (bazi) {
      const G = window.ZiweiGanzhi;
      const pillars = {
        year: bazi.pillars[0],
        month: bazi.pillars[1],
        day: bazi.pillars[2],
        hour: bazi.pillars[3],
      };
      let candidates = G ? G.datesFromPillars(pillars) : [];
      let relaxed = false;
      if (!candidates.length && G) {
        // 有些來源用「農曆月柱」（通書式），改用年柱、月柱只比地支再試一次
        candidates = G.datesFromPillars(pillars, { mode: 'branch' });
        relaxed = candidates.length > 0;
      }
      if (!candidates.length) {
        rec.note = `八字「${bazi.pillars.join(' ')}」查不到對應日期`;
        rec.error = true;
        return rec;
      }
      const first = candidates[0];
      rec.year = first.date[0];
      rec.month = first.date[1];
      rec.day = first.date[2];
      rec.timeIndex = first.timeIndex;
      rec.bazi = bazi.pillars.join(' ');
      rec.alternatives = candidates.map((c) => ({
        year: c.date[0],
        month: c.date[1],
        day: c.date[2],
        timeIndex: c.timeIndex,
      }));
      if (relaxed) {
        rec.note = `月柱對不上（可能是農曆月柱），已列出同日柱的可能日期`;
      } else if (candidates.length > 1) {
        rec.note = `八字對到 ${candidates.length} 個可能，已選第一個`;
      }
      rec.name = cleanName(line, [bazi.matched]);
      return rec;
    }

    if (!date) {
      rec.error = true;
      rec.note = '看不出日期';
      rec.name = line;
      return rec;
    }
    rec.year = date.year;
    rec.month = date.month;
    rec.day = date.day;
    if (!hour) rec.note = '沒指定時辰，預設午時';
    if (!gender) rec.note = (rec.note ? rec.note + '；' : '') + '沒指定性別，預設女';

    const skip = [date.matched];
    if (hour) skip.push(hour.matched);
    if (gender) skip.push(gender.matched);
    if (calendar) skip.push(calendar.matched);
    rec.name = cleanName(line, skip);
    return rec;
  }

  /** 移除已辨識的片段，剩下的當姓名 */
  function cleanName(line, skipParts) {
    let rest = line;
    skipParts.filter(Boolean).forEach((s) => {
      rest = rest.replace(s, ' ');
    });
    rest = rest.replace(/[，,、;；|]+/g, ' ').replace(/\s+/g, ' ').trim();
    if (/^\d+$/.test(rest)) return '';
    return rest.slice(0, 20);
  }

  function parseAll(text) {
    const lines = String(text || '').split(/\r?\n/);
    records = lines.map((line, i) => parseLine(line, i)).filter(Boolean);
    renderPreview();
    const ok = records.filter((r) => !r.error).length;
    setStatus(`解析完成：${ok} 筆可用${records.length > ok ? `，${records.length - ok} 筆有問題` : ''}。`);
  }

  function renderPreview() {
    const wrap = document.getElementById('importPreview');
    if (!wrap) return;
    if (!records.length) {
      wrap.innerHTML = '<p class="import-empty">尚未貼上資料。</p>';
      return;
    }
    const rows = records
      .map((r, i) => {
        const alts =
          r.alternatives && r.alternatives.length > 1
            ? `<select class="import-alt" data-alt="${i}" title="八字對到的其他可能">
                 ${r.alternatives
                   .map(
                     (a) =>
                       `<option value="${a.year}-${a.month}-${a.day}-${a.timeIndex}"${
                         a.year === r.year && a.month === r.month && a.day === r.day && a.timeIndex === r.timeIndex
                           ? ' selected'
                           : ''
                       }>${a.year}-${a.month}-${a.day} ${HOUR_LABELS[a.timeIndex]}</option>`
                   )
                   .join('')}
               </select>`
            : '';
        return `
          <tr data-row="${i}" class="${r.error ? 'is-error' : ''}">
            <td><input type="text" data-field="name" value="${esc(r.name)}" placeholder="姓名" /></td>
            <td>
              <select data-field="calendar">
                <option value="solar"${r.calendar === 'solar' ? ' selected' : ''}>國曆</option>
                <option value="lunar"${r.calendar === 'lunar' ? ' selected' : ''}>農曆</option>
              </select>
            </td>
            <td><input type="number" data-field="year" value="${esc(r.year)}" min="1900" max="2100" /></td>
            <td><input type="number" data-field="month" value="${esc(r.month)}" min="1" max="12" /></td>
            <td><input type="number" data-field="day" value="${esc(r.day)}" min="1" max="31" /></td>
            <td>
              <select data-field="timeIndex">
                ${HOUR_LABELS.map(
                  (l, k) => `<option value="${k}"${k === r.timeIndex ? ' selected' : ''}>${l}</option>`
                ).join('')}
              </select>
            </td>
            <td>
              <select data-field="gender">
                <option value="男"${r.gender === '男' ? ' selected' : ''}>男</option>
                <option value="女"${r.gender === '女' ? ' selected' : ''}>女</option>
              </select>
            </td>
            <td class="import-note">${esc(r.note || '')}${alts}</td>
          </tr>`;
      })
      .join('');
wrap.innerHTML = `
      <div class="import-scroll">
        <table class="import-table">
          <thead>
            <tr><th>姓名</th><th>曆別</th><th>年</th><th>月</th><th>日</th><th>時辰</th><th>性別</th><th>備註</th></tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;

    wrap.querySelectorAll('tr[data-row]').forEach((tr) => {
      const idx = Number(tr.dataset.row);
      tr.querySelectorAll('[data-field]').forEach((el) => {
        el.addEventListener('change', () => {
          const field = el.dataset.field;
          records[idx][field] = field === 'timeIndex' ? Number(el.value) : el.value;
          if (field === 'calendar' && el.value === 'lunar') {
            setStatus('提醒：農曆日期請確認是否閏月（可用下方勾選，或改用國曆）。');
          }
        });
      });
      const alt = tr.querySelector('[data-alt]');
      if (alt) {
        alt.addEventListener('change', () => {
          const [y, m, d, h] = alt.value.split('-').map(Number);
          records[idx].year = y;
          records[idx].month = m;
          records[idx].day = d;
          records[idx].timeIndex = h;
          renderPreview();
        });
      }
    });
  }

  function setStatus(text) {
    const el = document.getElementById('importStatus');
    if (el) el.textContent = text || '';
  }

  function currentRecords() {
    return records.filter((r) => !r.error && r.year && r.month && r.day);
  }

  /** 把一筆資料填進主表單 */
  function fillForm(rec) {
    const app = window.ZiweiApp;
    if (!app || !app.fillForm) return;
    app.fillForm({
      name: rec.name || '',
      gender: rec.gender || '女',
      calendar: rec.calendar || 'solar',
      year: Number(rec.year),
      month: Number(rec.month),
      day: Number(rec.day),
      timeIndex: Number(rec.timeIndex),
      isLeapMonth: document.getElementById('importLeap')?.checked === true,
    });
  }

  async function importFirst() {
    const list = currentRecords();
    if (!list.length) {
      setStatus('沒有可匯入的資料。');
      return;
    }
    fillForm(list[0]);
    setStatus(`已匯入「${list[0].name || '未命名'}」，開始排盤…`);
    await window.ZiweiApp.submitForm();
    document.getElementById('result')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }


async function importBatch() {
    const list = currentRecords();
    if (!list.length) {
      setStatus('沒有可匯入的資料。');
      return;
    }
    const fortuneYear =
      Number(document.getElementById('fortuneYear')?.value) || new Date().getFullYear();
    const leap = document.getElementById('importLeap')?.checked === true;
    const results = [];
    for (let i = 0; i < list.length; i += 1) {
      const r = list[i];
      setStatus(`排盤中…（${i + 1}/${list.length}）${r.name || ''}`);
      try {
        const result = await window.ZiweiApp.requestChart({
          name: r.name || '',
          gender: r.gender || '女',
          calendar: r.calendar || 'solar',
          year: Number(r.year),
          month: Number(r.month),
          day: Number(r.day),
          timeIndex: Number(r.timeIndex),
          isLeapMonth: leap && r.calendar === 'lunar',
          fixLeap: true,
          fortuneYear,
        });
        results.push(result);
      } catch (err) {
        setStatus(`「${r.name || '未命名'}」排盤失敗：${err.message}`);
      }
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
    if (!results.length) {
      setStatus('沒有排盤成功的資料。');
      return;
    }
    window.ZiweiExport.exportBatch(results);
    const withDataset = results.filter((x) => x.dataset && x.dataset.available).length;
    setStatus(
      `完成 ${results.length} 筆，已匯出${
        withDataset
          ? `（其中 ${withDataset} 筆含 v4.0 詳細解讀）`
          : '（此版本沒有 v4.0 資料集，只有規則庫解讀）'
      }。`
    );
  }

  function init() {
    const parseBtn = document.getElementById('importParseBtn');
    if (!parseBtn) return;
    parseBtn.addEventListener('click', () => {
      parseAll(document.getElementById('importText').value);
    });
    document.getElementById('importFirstBtn').addEventListener('click', importFirst);
    document.getElementById('importBatchBtn').addEventListener('click', importBatch);
  }

  window.ZiweiImport = { init, parseAll, parseLine, records: () => records };
})();
