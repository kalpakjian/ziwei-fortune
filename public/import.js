'use strict';

/* 匯入：把 .md 命盤解讀檔拖進來（或貼一行生辰／八字），直接排盤。 */
(function () {
  const { esc } = window.ZiweiRender;

  const HOUR_LABELS = [
    '早子時', '丑時', '寅時', '卯時', '辰時', '巳時', '午時',
    '未時', '申時', '酉時', '戌時', '亥時', '晚子時',
  ];
  const HOUR_CHARS = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
  const GANZHI = window.ZiweiGanzhi ? window.ZiweiGanzhi.GAN_ZHI : [];

  /** 目前解析出來的資料 */
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
    const early = /早\s*[子時时]/.exec(text);
    if (early) return { index: 0, matched: early[0] };
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

  /** 移除已辨識的片段，剩下的當姓名 */
  function cleanName(line, skipParts) {
    let rest = line;
    skipParts.filter(Boolean).forEach((s) => {
      rest = rest.replace(s, ' ');
    });
    rest = rest.replace(/[，,、;；|]+/g, ' ').replace(/\s+/g, ' ').trim();
    // 只剩下標點符號（例如「1984.3.1.卯时」多出來的點）→ 視為沒有姓名
    if (/^[\s.．·\-–—_/\\()（）[\]「」『』:：]+$/.test(rest)) return '';
    if (/^\d+$/.test(rest)) return '';
    return rest.slice(0, 20);
  }

  /** 建立一筆空資料 */
  function blankRecord(index) {
    return {
      index,
      name: '',
      calendar: 'solar',
      year: '',
      month: '',
      day: '',
      timeIndex: 6,
      gender: '女',
      note: '',
      alternatives: [],
      source: '',
    };
  }

/**
   * 解析一行生辰或八字。
   * @param {string} raw 一行文字
   * @param {number} index 序號
   * @param {string} source 來源說明（檔名等）
   */
  function parseLine(raw, index, source) {
    const line = String(raw || '').trim();
    const rec = blankRecord(index);
    rec.source = source || '';
    if (!line || line.startsWith('#')) return null;

    const bazi = pickBazi(line);
    const date = pickDate(line);
    const hour = pickHour(line);
    const gender = pickGender(line);
    const calendar = pickCalendar(line);

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
        rec.note = '月柱對不上（可能是農曆月柱），已列出同日柱的可能日期';
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
    if (hour) rec.timeIndex = hour.index;
    else rec.note = '沒指定時辰，預設午時';
    if (gender) rec.gender = gender.value;
    else rec.note = (rec.note ? rec.note + '；' : '') + '沒指定性別，預設女';
    if (calendar) rec.calendar = calendar.value;

    const skip = [date.matched];
    if (hour) skip.push(hour.matched);
    if (gender) skip.push(gender.matched);
    if (calendar) skip.push(calendar.matched);
    rec.name = cleanName(line, skip);
    return rec;
  }

  /**
   * 解析匯出檔（.md）：從標題與基本資料取出姓名、性別、國曆、時辰。
   */
  function parseMarkdown(text, source) {
    const src = String(text || '').replace(/\r\n/g, '\n');
    const rec = blankRecord(0);
    rec.source = source || '';

    const title = /^#\s*(.+?)\s*的命盤解讀/m.exec(src);
    if (title) rec.name = title[1].trim().slice(0, 20);

    const gender = /性別：\s*([男女])/.exec(src);
    if (gender) rec.gender = gender[1];

    const date = /國曆：\s*(\d{4})-(\d{1,2})-(\d{1,2})/.exec(src);
    if (date) {
      rec.year = Number(date[1]);
      rec.month = Number(date[2]);
      rec.day = Number(date[3]);
    }

    const hour = /（\s*(早子時|晚子時|[子丑寅卯辰巳午未申酉戌亥]時)\s/.exec(src);
    if (hour) {
      const label = hour[1];
      if (label === '早子時') rec.timeIndex = 0;
      else if (label === '晚子時') rec.timeIndex = 12;
      else rec.timeIndex = HOUR_CHARS.indexOf(label[0]);
    }

    const lunar = /農曆：\s*([^\n·]+)/.exec(src);
    if (lunar) rec.lunarText = lunar[1].trim();

    if (!rec.year) {
      rec.error = true;
      rec.note = '這個檔案裡看不出國曆生日';
    } else if (!hour) {
      rec.note = '檔案裡沒有時辰，預設午時';
    }
    return rec;
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

  /** 顯示解析結果，可逐欄修正 */
  function renderPreview() {
    const wrap = document.getElementById('importPreview');
    if (!wrap) return;
    if (!records.length) {
      wrap.innerHTML = '';
      return;
    }
    const rows = records
      .map((r, i) => {
        const alts =
          r.alternatives && r.alternatives.length > 1
            ? `<select class="import-alt" data-alt="${i}" title="其他可能">
                 ${r.alternatives
                   .map(
                     (a) =>
                       `<option value="${a.year}-${a.month}-${a.day}-${a.timeIndex}"${
                         a.year === r.year &&
                         a.month === r.month &&
                         a.day === r.day &&
                         a.timeIndex === r.timeIndex
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
            <td class="import-note">${esc(r.source ? r.source + '：' : '')}${esc(r.note || '')}${alts}</td>
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

/** 讀檔並解析（.md 匯出檔或純文字） */
  async function handleFiles(fileList) {
    const files = [...(fileList || [])].filter(
      (f) => /\.(md|markdown|txt)$/i.test(f.name) || /text\//.test(f.type)
    );
    if (!files.length) {
      setStatus('請拖入 .md（Markdown）或 .txt 檔案。');
      return;
    }
    setStatus(`讀取 ${files.length} 個檔案…`);
    const parsed = [];
    for (const f of files) {
      let text = '';
      try {
        text = await f.text();
      } catch (err) {
        setStatus(`讀取「${f.name}」失敗：${err.message}`);
        continue;
      }
      const isExport = /命盤解讀/.test(text) || /^#\s/m.test(text);
      const rec = isExport
        ? parseMarkdown(text, f.name)
        : parseLine(text, parsed.length, f.name) || parseMarkdown(text, f.name);
      if (rec) parsed.push(rec);
    }
    records = parsed;
    renderPreview();
    await runRecords();
  }

  /** 依解析結果排盤：單筆直接顯示，多筆合併匯出 */
  async function runRecords() {
    const list = currentRecords();
    if (!list.length) {
      setStatus('沒有可匯入的資料。');
      return;
    }
    if (list.length === 1) {
      fillForm(list[0]);
      setStatus(`已匯入「${list[0].name || '未命名'}」，完整解讀見下方。`);
      await window.ZiweiApp.submitForm();
      document.getElementById('result')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
    window.ZiweiExport.exportBatchText(results);
    const withDataset = results.filter((x) => x.dataset && x.dataset.available).length;
    setStatus(
      `完成 ${results.length} 筆，已合併匯出純文字檔${
        withDataset
          ? `（其中 ${withDataset} 筆含 v4.0 詳細解讀）`
          : '（此版本沒有 v4.0 資料集，只有規則庫解讀）'
      }。`
    );
  }

  /** 貼上一行生辰或八字 */
  function importText() {
    const el = document.getElementById('importText');
    const line = (el?.value || '').trim();
    if (!line) {
      setStatus('請先貼上一行生辰或八字。');
      return;
    }
    const rec = parseLine(line, 0, '貼上的文字');
    if (!rec) {
      setStatus('看不懂這行資料。');
      return;
    }
    records = [rec];
    renderPreview();
    runRecords();
  }

  function init() {
    const zone = document.getElementById('importDrop');
    if (!zone) return;

    ['dragenter', 'dragover'].forEach((evt) =>
      zone.addEventListener(evt, (e) => {
        e.preventDefault();
        zone.classList.add('is-over');
      })
    );
    ['dragleave', 'dragend'].forEach((evt) =>
      zone.addEventListener(evt, () => zone.classList.remove('is-over'))
    );
    zone.addEventListener('drop', (e) => {
      e.preventDefault();
      zone.classList.remove('is-over');
      handleFiles(e.dataTransfer && e.dataTransfer.files);
    });

    const picker = document.getElementById('importPick');
    if (picker) {
      picker.addEventListener('change', () => {
        handleFiles(picker.files);
        picker.value = '';
      });
    }
    const btn = document.getElementById('importPickBtn');
    if (btn) btn.addEventListener('click', () => picker && picker.click());

    const textBtn = document.getElementById('importTextBtn');
    if (textBtn) textBtn.addEventListener('click', importText);
  }

  window.ZiweiImport = { init, parseLine, parseMarkdown, handleFiles, records: () => records };
})();

