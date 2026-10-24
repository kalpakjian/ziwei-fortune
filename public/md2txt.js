'use strict';

/**
 * Markdown → 純文字轉換（瀏覽器與 Node.js 共用）。
 * 讓匯出的解讀可以直接貼到通訊軟體，不會看到 ** 或 # 之類的記號。
 */
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.ZiweiMd2Txt = api;
})(typeof self !== 'undefined' ? self : this, function () {
  /** 去掉行內的 Markdown 標記 */
  function stripInline(text) {
    return text
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1$2')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1（$2）')
      .replace(/<br\s*\/?>/gi, ' ')
      .trimEnd();
  }

  function convert(src) {
    const lines = String(src || '').replace(/\r\n/g, '\n').split('\n');
    const out = [];
    let inCode = false;

    for (const raw of lines) {
      if (/^```/.test(raw)) {
        inCode = !inCode;
        continue;
      }
      if (inCode) {
        out.push(raw);
        continue;
      }
      if (/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(raw)) {
        out.push('────────────────────────────');
        continue;
      }
      const heading = /^(#{1,6})\s+(.*)$/.exec(raw);
      if (heading) {
        const text = stripInline(heading[2]);
        out.push('');
        out.push(text);
        out.push('─'.repeat(Math.min(text.length, 24)));
        continue;
      }
      const quote = /^>\s?(.*)$/.exec(raw);
      if (quote) {
        out.push(`　${stripInline(quote[1])}`);
        continue;
      }
      const list = /^(\s*)([-*+]|\d+\.)\s+(.*)$/.exec(raw);
      if (list) {
        out.push(`${list[1]}${list[2]} ${stripInline(list[3])}`);
        continue;
      }
      out.push(stripInline(raw));
    }

    const tidy = [];
    for (const line of out) {
      if (line === '' && tidy.length && tidy[tidy.length - 1] === '') continue;
      tidy.push(line);
    }
    return `${tidy.join('\n').replace(/\n+$/, '')}\n`;
  }

  return { convert, stripInline };
});
