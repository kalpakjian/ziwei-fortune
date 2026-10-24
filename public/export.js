'use strict';

/* 匯出：把整份解讀（含 v4.0 資料集）輸出成 Markdown 檔，方便寄給朋友。 */
(function () {
  const { esc } = window.ZiweiRender;

  function line(text) {
    return String(text ?? '').replace(/\r\n/g, '\n').trim();
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
      out.push(`### ${p.name}宮（${p.stem}${p.branch}）· ${p.score} 分／${p.grade}`);
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
        out.push(line(t.text));
        out.push('');
      });
      out.push(`> 出處：${dataset.source.attribution}`);
      out.push(`> ${dataset.source.note}`);
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

  function exportMarkdown(result) {
    if (!result) return;
    const md = buildMarkdown(result);
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const meta = result.chart.meta;
    a.href = url;
    a.download = `命盤解讀_${safeName(meta.name)}_${meta.solarDate}.md`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  window.ZiweiExport = { buildMarkdown, exportMarkdown };
})();
