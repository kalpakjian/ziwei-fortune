'use strict';

/* 匯出：把整份解讀（含 v4.0 資料集）輸出成 Markdown 檔，方便寄給朋友。 */
(function () {
  const { esc, palaceLabel } = window.ZiweiRender;

  function line(text) {
    return String(text ?? '').replace(/\r\n/g, '\n').trim();
  }

  /** 資料集內文自帶 markdown 標題，匯出時往下壓一層，避免與主題標題同級 */
  function demoteHeadings(text) {
    return String(text || '').replace(/^(#{1,5})\s/gm, (m, hashes) => `${hashes}# `);
  }

  /** 以節氣換月的四柱（主流八字軟體口徑），與 iztro 印的通書式月柱互相對照 */
  function baziBySolarTerm(meta) {
    const G = window.ZiweiGanzhi;
    if (!G) return '';
    const m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(String(meta.solarDate || ''));
    if (!m) return '';
    const label = String(meta.time || '');
    let timeIndex = -1;
    if (label === '早子時') timeIndex = 0;
    else if (label === '晚子時') timeIndex = 12;
    else {
      const idx = (G.BRANCHES || []).indexOf(label[0]);
      if (idx >= 0) timeIndex = idx;
    }
    if (timeIndex < 0) return '';
    const p = G.pillars([Number(m[1]), Number(m[2]), Number(m[3])], timeIndex, true);
    return `${p.year} ${p.month} ${p.day} ${p.hour}`;
  }

  function buildMarkdown(result) {
    const { chart, reading, fortune, dataset } = result;
    const meta = chart.meta;
    const out = [];

    out.push(`# ${meta.name || '無名'} 的命盤解讀`);
    out.push('');
    out.push(`- 性別：${meta.gender}`);
    out.push(`- 國曆：${meta.solarDate}（${meta.time} ${meta.timeRange}）`);
    out.push(`- 農曆：${meta.lunarDate} · ${meta.chineseDate}`);
    const bazi = baziBySolarTerm(meta);
    if (bazi) out.push(`- 四柱（節氣換月）：${bazi}`);
    out.push(`- 五行局：${meta.fiveElementsClass} · 命主 ${meta.soul} · 身主 ${meta.body}`);
    out.push(`- 生肖 ${meta.zodiac} · 命宮在${meta.soulBranch}`);
    out.push('');

    out.push(`## 總覽（${reading.summary.score} 分／${reading.summary.grade}）`);
    out.push('');
    out.push(line(reading.summary.intro));
    if (reading.summary.tags.length) {
      out.push(`關鍵字：${reading.summary.tags.join('、')}`);
    }
    out.push('');

    out.push('## 性格');
    out.push('');
    reading.personality.paragraphs.forEach((p) => {
      out.push(line(p));
      out.push('');
    });

    out.push('## 十二宮');
    out.push('');
    reading.palaces.forEach((p) => {
      const stars = p.stars.map((s) => s.name + (s.mutagen ? `化${s.mutagen}` : '')).join('、') || '空宮';
      out.push(`### ${palaceLabel(p.name)}（${p.stem}${p.branch}）· ${p.score} 分／${p.grade}`);
      out.push(`星曜：${stars}`);
      out.push('');
      out.push(line(p.text));
      out.push('');
    });

    out.push('## 格局');
    out.push('');
    if (reading.patterns.length) {
      reading.patterns.forEach((p) => {
        out.push(`- **${p.name}**：${line(p.text)}`);
      });
    } else {
      out.push('- 命宮三方四正沒有落入本程式收錄的強烈格局，屬於平穩盤。');
    }
    out.push('');

    out.push(`## 運限（${fortune.year} 年）`);
    out.push('');
    out.push(`### 大限 ${fortune.decadal.stemBranch}（${fortune.decadal.range[0]}–${fortune.decadal.range[1]} 歲）`);
    out.push(line(fortune.decadal.text));
    out.push('');
    out.push(`### 流年 ${fortune.yearly.stemBranch}`);
    out.push(line(fortune.yearly.text));
    out.push('');

    if (dataset && dataset.available) {
      out.push('## 詳細解讀（v4.0 資料集）');
      out.push('');
      out.push(
        `資料集索引 ${dataset.key}${dataset.soulStar ? ` · 命宮主星 ${dataset.soulStar}` : ''} · 共 ${dataset.totalChars.toLocaleString()} 字`
      );
      out.push('');
      dataset.topics.forEach((t) => {
        out.push(`### ${t.label}（${t.chars.toLocaleString()} 字）`);
        out.push('');
        out.push(line(demoteHeadings(t.text)));
        out.push('');
      });
      out.push(`> 出處：${dataset.source.attribution}`);
      out.push(`> ${dataset.source.note}`);
      out.push('');
    } else {
      out.push('## 詳細解讀（v4.0 資料集）');
      out.push('');
      out.push('> **本份匯出不含 v4.0 詳細解讀。**');
      if (dataset && dataset.message) out.push(`> 原因：${dataset.message}`);
      out.push('> 線上靜態版（GitHub Pages）無法內建資料集，只有本機版才有這一段。');
      out.push('> 要完整內容：本機執行 `npm run dataset:download -- --year <西元年>`，');
      out.push('> 再用 `npm start` 開啟的網頁排盤並匯出。');
      out.push('');
    }

    out.push('---');
    out.push('');
    out.push('命理是文化與自我對話的工具，不是科學預測。本內容不構成醫療、法律、投資或婚姻建議。');
    out.push('排盤引擎：iztro（MIT）。解讀文字由本程式規則庫與 v4.0 開源解讀資料集產生，僅供自我覺察與娛樂參考。');
    out.push('');

    return out.join('\n');
  }

  function safeName(text) {
    return String(text || '命盤').replace(/[\\/:*?"<>|]/g, '_').slice(0, 40);
  }

  function download(text, filename) {
    const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function exportMarkdown(result) {
    if (!result) return;
    const md = buildMarkdown(result);
    const meta = result.chart.meta;
    download(md, `命盤解讀_${safeName(meta.name)}_${meta.solarDate}.md`);
  }

  /** 批次匯出：多張盤合成一份 Markdown */
  function exportBatch(results) {
    const list = (results || []).filter(Boolean);
    if (!list.length) return;
    const stamp = new Date().toISOString().slice(0, 10);
    const head = [
      `# 批次命盤解讀（${list.length} 人）`,
      '',
      `匯出時間：${new Date().toLocaleString('zh-TW')}`,
      '',
      '> 命理是文化與自我對話的工具，不是科學預測。本內容不構成醫療、法律、投資或婚姻建議。',
      '',
    ].join('\n');
    const body = list.map((r) => buildMarkdown(r)).join('\n\n---\n\n');
    download(`${head}${body}`, `命盤解讀_批次_${list.length}人_${stamp}.md`);
  }

  /** 匯出純文字（可直接貼到通訊軟體） */
  function exportPlainText(result) {
    if (!result) return;
    const md = buildMarkdown(result);
    const text = window.ZiweiMd2Txt ? window.ZiweiMd2Txt.convert(md) : md;
    const meta = result.chart.meta;
    download(text, `命盤解讀_${safeName(meta.name)}_${meta.solarDate}.txt`);
  }

  /** 批次匯出純文字 */
  function exportBatchText(results) {
    const list = (results || []).filter(Boolean);
    if (!list.length) return;
    const stamp = new Date().toISOString().slice(0, 10);
    const md = list.map((r) => buildMarkdown(r)).join('\n\n---\n\n');
    const text = window.ZiweiMd2Txt ? window.ZiweiMd2Txt.convert(md) : md;
    download(text, `命盤解讀_批次_${list.length}人_${stamp}.txt`);
  }

  window.ZiweiExport = {
    buildMarkdown,
    exportMarkdown,
    exportBatch,
    exportPlainText,
    exportBatchText,
  };
})();
