'use strict';

const { astro } = require('iztro');
const { GRID_POSITION, MAJOR_STARS, MINOR_STAR_INFO } = require('./knowledge');

const TIME_OPTIONS = [
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

class InputError extends Error {}

function assertInt(value, name, min, max) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < min || n > max) {
    throw new InputError(`${name} 必須是 ${min}–${max} 之間的整數`);
  }
  return n;
}

/**
 * 建立 iztro 星盤。
 * @param {object} input
 * @param {'solar'|'lunar'} input.calendar
 * @param {number} input.year 西元年（農曆輸入時為農曆年）
 * @param {number} input.month
 * @param {number} input.day
 * @param {number} input.timeIndex 0–12
 * @param {'男'|'女'} input.gender
 * @param {boolean} [input.isLeapMonth]
 * @param {boolean} [input.fixLeap]
 */
function createAstrolabe(input = {}) {
  const { calendar = 'solar', gender = '女', name = '' } = input;
  const year = assertInt(input.year, '年', 1900, 2100);
  const month = assertInt(input.month, '月', 1, 12);
  const day = assertInt(input.day, '日', 1, 31);
  const timeIndex = assertInt(input.timeIndex, '時辰', 0, 12);

  if (!['男', '女'].includes(gender)) throw new InputError('性別必須是「男」或「女」');
  if (!['solar', 'lunar'].includes(calendar)) throw new InputError('曆別必須是 solar 或 lunar');

  const dateStr = `${year}-${month}-${day}`;
  const fixLeap = input.fixLeap !== false;
  let astrolabe;

  try {
    astrolabe =
      calendar === 'lunar'
        ? astro.byLunar(dateStr, timeIndex, gender, !!input.isLeapMonth, fixLeap, 'zh-TW')
        : astro.bySolar(dateStr, timeIndex, gender, fixLeap, 'zh-TW');
  } catch (err) {
    throw new InputError(
      calendar === 'lunar'
        ? `農曆日期無法排盤：${dateStr}（請確認農曆月份與閏月）`
        : `國曆日期無法排盤：${dateStr}（請確認日期存在）`
    );
  }

  astrolabe.__name = String(name || '').trim().slice(0, 20);
  astrolabe.__calendar = calendar;
  return astrolabe;
}

function decorateStar(star) {
  const info = MAJOR_STARS[star.name] || MINOR_STAR_INFO[star.name] || null;
  return {
    name: star.name,
    type: star.type,
    scope: star.scope,
    brightness: star.brightness || '',
    mutagen: star.mutagen || '',
    title: (info && info.title) || '',
    tone: (info && info.tone) || (info && info.kind) || '',
    text: (info && (info.short || info.text)) || '',
  };
}

function toView(astrolabe) {
  const palaces = astrolabe.palaces.map((p) => {
    const info = MAJOR_STARS[p.majorStars[0] && p.majorStars[0].name] || null;
    const pos = GRID_POSITION[p.earthlyBranch] || [0, 0];
    return {
      index: p.index,
      name: p.name,
      heavenlyStem: p.heavenlyStem,
      earthlyBranch: p.earthlyBranch,
      grid: { row: pos[0], col: pos[1] },
      isBodyPalace: !!p.isBodyPalace,
      isOriginalPalace: !!p.isOriginalPalace,
      majorStars: p.majorStars.map(decorateStar),
      minorStars: p.minorStars.map(decorateStar),
      adjectiveStars: p.adjectiveStars.map((s) => ({
        name: s.name,
        type: s.type,
        brightness: s.brightness || '',
        mutagen: s.mutagen || '',
      })),
      decadal: {
        range: p.decadal.range,
        heavenlyStem: p.decadal.heavenlyStem,
        earthlyBranch: p.decadal.earthlyBranch,
      },
      ages: p.ages,
      firstStarTitle: (info && info.title) || '',
    };
  });

  return {
    meta: {
      name: astrolabe.__name || '',
      gender: astrolabe.gender,
      calendar: astrolabe.__calendar || 'solar',
      solarDate: astrolabe.solarDate,
      lunarDate: astrolabe.lunarDate,
      chineseDate: astrolabe.chineseDate,
      time: astrolabe.time,
      timeRange: astrolabe.timeRange,
      sign: astrolabe.sign,
      zodiac: astrolabe.zodiac,
      fiveElementsClass: astrolabe.fiveElementsClass,
      soul: astrolabe.soul,
      body: astrolabe.body,
      soulBranch: astrolabe.earthlyBranchOfSoulPalace,
      bodyBranch: astrolabe.earthlyBranchOfBodyPalace,
    },
    palaces,
    soulPalaceIndex: palaces.find((p) => p.name === '命宮')?.index ?? 0,
    bodyPalaceIndex: palaces.find((p) => p.isBodyPalace)?.index ?? null,
    timeOptions: TIME_OPTIONS,
  };
}

module.exports = { createAstrolabe, toView, TIME_OPTIONS, InputError };
