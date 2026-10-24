'use strict';

/* 八字干支運算（純前端、無相依）。
 *
 * 口徑與主流八字軟體一致：
 *   - 年柱以「立春」換年
 *   - 月柱以「節氣」換月（寅月起）
 *   - 日柱：60 天一循環
 *   - 時柱：23:00 起為子時，晚子時「子時換日」（日柱進位隔日）
 *
 * 資料由 scripts/ganzhi-generate.mjs 產生，並以 lunar-typescript 交叉驗證
 * （見 scripts/ganzhi-test.mjs）。
 */
(function () {
  const data = window.ZiweiGanzhiData || {};
  const GAN_ZHI = data.GAN_ZHI || [];
  const JIEQI_TABLE = data.JIEQI_TABLE || {};
  const ANCHOR = data.DAY_ANCHOR || { date: '1900-01-01', pillar: '甲戌' };

  const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
  const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
  /** 時辰索引 0–11 對應的支（0 早子、11 亥） */
  const HOUR_BRANCH = BRANCHES;

  const DAY_MS = 86400000;

  function utc(y, m, d) {
    return Date.UTC(y, m - 1, d);
  }

  function fromUTC(ts) {
    const d = new Date(ts);
    return [d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()];
  }

  function daysBetween(a, b) {
    return Math.round((utc(b[0], b[1], b[2]) - utc(a[0], a[1], a[2])) / DAY_MS);
  }

  function addDays(date, n) {
    return fromUTC(utc(date[0], date[1], date[2]) + n * DAY_MS);
  }

  function mmddToDate(year, raw) {
    // 格式 'MM-DD HH:mm:ss'
    const m = Number(raw.slice(0, 2));
    const d = Number(raw.slice(3, 5));
    const hh = Number(raw.slice(6, 8)) || 0;
    const mm = Number(raw.slice(9, 11)) || 0;
    const ss = Number(raw.slice(12, 14)) || 0;
    return { date: [year, m, d], time: [hh, mm, ss] };
  }

  /** 某年的 12 個月柱起點（立春…大雪、次年小寒），每個邊界帶完整日期與時刻 */
  function cycleBoundaries(cycleYear) {
    const raw = JIEQI_TABLE[cycleYear];
    if (!raw) return null;
    const parts = raw.split(',');
    const out = parts
      .slice(0, 11)
      .map((s, i) => ({ ...mmddToDate(cycleYear, s), monthIndex: i }));
    out.push({ ...mmddToDate(cycleYear + 1, parts[11]), monthIndex: 11 });
    return out;
  }

  /** 時辰索引的代表時刻：子=00:00（早子）、丑=01:00…亥=21:00、晚子=23:00 */
  function repTime(hourIndex) {
    if (hourIndex === 12) return [23, 0];
    if (hourIndex === 0) return [0, 0];
    return [hourIndex * 2 - 1, 0];
  }

  /** 邊界時刻是否晚於出生時刻 */
  function isAfter(boundary, date, hourIndex) {
    const t = repTime(hourIndex);
    const bd = boundary.date;
    const bt = boundary.time;
    if (bd[0] !== date[0]) return bd[0] > date[0];
    if (bd[1] !== date[1]) return bd[1] > date[1];
    if (bd[2] !== date[2]) return bd[2] > date[2];
    const bs = (bt[0] || 0) * 3600 + (bt[1] || 0) * 60 + (bt[2] || 0);
    return bs > t[0] * 3600 + t[1] * 60;
  }

  const ANCHOR_DATE = ANCHOR.date.split('-').map(Number);
  const ANCHOR_INDEX = Math.max(0, GAN_ZHI.indexOf(ANCHOR.pillar));

  /** 日柱索引（0–59） */
  function dayIndex(date) {
    const n = ANCHOR_INDEX + daysBetween(ANCHOR_DATE, date);
    return ((n % 60) + 60) % 60;
  }

  function pillarOf(index) {
    return GAN_ZHI[((index % 60) + 60) % 60] || '';
  }

  /** 由天干與地支合成干支（索引須同時滿足 index%10=天干、index%12=地支） */
  function combine(stem, branch) {
    for (let i = 0; i < 60; i += 1) {
      if (i % 10 === stem && i % 12 === branch) return GAN_ZHI[i];
    }
    return '';
  }

  /** 所屬的立春週期（年柱以立春換年） */
  function cycleOf(date, hourIndex) {
    const [y] = date;
    let boundaries = cycleBoundaries(y);
    if (!boundaries) return null;
    if (isAfter(boundaries[0], date, hourIndex)) {
      boundaries = cycleBoundaries(y - 1);
      if (!boundaries) return null;
      return y - 1;
    }
    return y;
  }

  /** 以立春換年的年柱 */
  function yearPillar(date, hourIndex = 6) {
    const cycle = cycleOf(date, hourIndex);
    if (cycle === null) return '';
    return pillarOf(cycle - 1984);
  }

  /** 以節氣換月的月柱（寅月為 0） */
  function monthPillar(date, hourIndex = 6) {
    const cycle = cycleOf(date, hourIndex);
    if (cycle === null) return '';
    const boundaries = cycleBoundaries(cycle);
    if (!boundaries) return '';
    // 挑「不晚於出生時刻」中最晚的一個邊界
    let best = null;
    for (const b of boundaries) {
      if (isAfter(b, date, hourIndex)) continue;
      if (
        !best ||
        b.date[0] > best.date[0] ||
        (b.date[0] === best.date[0] &&
          (b.date[1] > best.date[1] ||
            (b.date[1] === best.date[1] && b.date[2] > best.date[2])))
      ) {
        best = b;
      }
    }
    const idx = best ? best.monthIndex : 0;
    const yearGan = (((cycle - 1984) % 60 + 60) % 60) % 10;
    const stem = ((yearGan % 5) * 2 + 2 + idx) % 10;
    const branch = (2 + idx) % 12;
    return combine(stem, branch);
  }

  /** 時柱；hourIndex 0–11（0 早子、11 亥），12 代表晚子（23:00 後） */
  function hourPillar(date, hourIndex) {
    const branch = hourIndex === 12 ? 0 : hourIndex % 12;
    const dayGan = dayIndex(date) % 10;
    const stem = (dayGan * 2 + branch) % 10;
    return combine(stem, branch);
  }

  /**
   * 某個時辰的四柱。
   * @param {number[]} date [y, m, d]
   * @param {number} hourIndex 0–12（12 為晚子）
   * @param {boolean} ziSwitch 晚子是否換日（主流＝true）
   */
  function pillars(date, hourIndex, ziSwitch = true) {
    const lateZi = hourIndex === 12;
    const pillarDate = lateZi && ziSwitch ? addDays(date, 1) : date;
    return {
      year: yearPillar(date, hourIndex),
      month: monthPillar(date, hourIndex),
      day: pillarOf(dayIndex(pillarDate)),
      hour: hourPillar(pillarDate, hourIndex),
    };
  }

  /**
 * 從四柱反查日期（可能多筆：不同年份、同一八字重覆、或子時早晚兩種）
 * mode：
 *   exact  年柱、月柱、日柱、時柱都要完全相符（節氣換月口徑）
 *   branch 年柱與月柱只比地支（對應「農曆月柱」來源）
 *   day    只比日柱與時柱（最後手段，候選會很多）
 */
  function datesFromPillars(input, options = {}) {
    const yIdx = GAN_ZHI.indexOf(input.year);
    const mIdx = GAN_ZHI.indexOf(input.month);
    const dIdx = GAN_ZHI.indexOf(input.day);
    const hIdx = GAN_ZHI.indexOf(input.hour);
    if (yIdx < 0 || mIdx < 0 || dIdx < 0 || hIdx < 0) return [];

    const mode = options.mode || 'exact';
    const hourBranch = hIdx % 12;
    const out = [];

    const cycles = [];
    for (let c = 1900; c <= 2030; c += 1) {
      const yearBranch = (((c - 1984) % 12) + 12) % 12;
      if (mode === 'exact') {
        if ((((c - 1984) % 60) + 60) % 60 !== yIdx) continue;
      } else if (mode === 'branch') {
        if (yearBranch !== BRANCHES.indexOf(input.year[1])) continue;
      }
      cycles.push(c);
    }

    for (const cycle of cycles) {
      const boundaries = cycleBoundaries(cycle);
      const next = cycleBoundaries(cycle + 1);
      if (!boundaries || !next) continue;
      const start = boundaries[0].date; // 立春
      const end = next[0].date; // 翌年立春
      const startTs = utc(start[0], start[1], start[2]);
      // 立春有時刻：當天立春之前仍屬前一個週期
      const endTime = next[0].time || [0, 0, 0];
      const endTs =
        utc(end[0], end[1], end[2]) +
        (endTime[0] || 0) * 3600000 +
        (endTime[1] || 0) * 60000 +
        (endTime[2] || 0) * 1000;
      const offset = (((dIdx - dayIndex(start)) % 60) + 60) % 60;

      for (let ts = startTs + offset * DAY_MS; ts < endTs; ts += 60 * DAY_MS) {
        const d0 = fromUTC(ts); // 日柱命中的那天
        // 子時有兩種可能：早子＝當天 00:00；晚子＝前一天 23:00（子時換日）
        const candidates = hourBranch === 0
          ? [{ date: d0, timeIndex: 0 }, { date: addDays(d0, -1), timeIndex: 12 }]
          : [{ date: d0, timeIndex: hourBranch }];
        for (const c of candidates) {
          const p = pillars(c.date, c.timeIndex, true);
          if (mode === 'exact') {
            if (p.year !== input.year || p.month !== input.month) continue;
          }
          if (p.day !== input.day || p.hour !== input.hour) continue;
          out.push({ date: c.date, timeIndex: c.timeIndex, pillars: p });
        }
      }
    }
    // 排序：年柱完全相符優先，其次月柱地支接近者，再次早子優先與年份
    const branchGap = (a, b) => {
      const d = Math.abs(BRANCHES.indexOf(a) - BRANCHES.indexOf(b));
      return Math.min(d, 12 - d);
    };
    out.sort((a, b) => {
      if (mode !== 'day') {
        const ay = a.pillars.year === input.year ? 0 : 1;
        const by = b.pillars.year === input.year ? 0 : 1;
        if (ay !== by) return ay - by;
        const am = branchGap(a.pillars.month[1], input.month[1]);
        const bm = branchGap(b.pillars.month[1], input.month[1]);
        if (am !== bm) return am - bm;
      }
      return a.timeIndex - b.timeIndex || a.date[0] - b.date[0];
    });
    return out;
  }

  window.ZiweiGanzhi = {
    GAN_ZHI,
    STEMS,
    BRANCHES,
    dayIndex,
    pillarOf,
    yearPillar,
    monthPillar,
    hourPillar,
    pillars,
    datesFromPillars,
    addDays,
  };
})();
