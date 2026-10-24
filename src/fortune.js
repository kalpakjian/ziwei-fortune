'use strict';

const { palaceScore, gradeOf } = require('./scoring');
const { PALACE_INFO, MAJOR_STARS } = require('./knowledge');
const { findStarPalace, mapMutagens, surroundStarsOf } = require('./mutagens');

function buildFortune(astrolabe, ctx, options = {}) {
  const now = new Date();
  const year = Number(options.year) || now.getFullYear();
  const birthMonth = Number(options.birthMonth) || 6;
  const birthDay = Number(options.birthDay) || 15;
  const birthYear = Number((astrolabe.solarDate || '').split('-')[0] || now.getFullYear());

  let h;
  try {
    h = astrolabe.horoscope(`${year}-${birthMonth}-${birthDay}`);
  } catch (err) {
    h = astrolabe.horoscope(`${year}-06-15`);
  }

  const decadalPalace = ctx.palaceAt(h.decadal.index);
  const yearlyPalace = ctx.palaceAt(h.yearly.index);
  const agePalace = ctx.palaceAt(h.age.index);
  const [ageFrom, ageTo] = decadalPalace.decadal.range;
  const decadalRangeYears = [birthYear + ageFrom - 1, birthYear + ageTo - 1];

  const decadalScore = palaceScore(ctx, decadalPalace);
  const baseYearScore = palaceScore(ctx, yearlyPalace).score;

  const yearlyMutagens = mapMutagens(ctx, h.yearly.mutagen, h.yearly.palaceNames, '流年');
  const decadalMutagens = mapMutagens(ctx, h.decadal.mutagen, h.decadal.palaceNames, '大限');

  // 流年四化若落在大限命宮或流年命宮的三方四正，調整當年分數
  let delta = 0;
  const yearlySurround = new Set(ctx.surroundIndices(yearlyPalace));
  for (const m of yearlyMutagens) {
    const p = findStarPalace(ctx, m.star);
    if (!p || !yearlySurround.has(p.index)) continue;
    delta += { 祿: 8, 權: 5, 科: 5, 忌: -9 }[m.mutagen] || 0;
  }
  const yearScore = Math.max(5, Math.min(97, baseYearScore + delta));

  const decStars = decadalPalace.majorStars;
  const yearStars = yearlyPalace.majorStars;

  const decadalText = [
    `${ageFrom}–${ageTo} 歲（虛歲，約西元 ${decadalRangeYears[0]}–${decadalRangeYears[1]} 年）行 ${decadalPalace.heavenlyStem}${decadalPalace.earthlyBranch} 大限，大限命宮落在本命${decadalPalace.name}宮。`,
    decStars.length
      ? `這十年的主調是：${decStars
          .map((s) => `${s.name}${s.brightness ? `（${s.brightness}）` : ''}──${
            MAJOR_STARS[s.name] ? MAJOR_STARS[s.name].short : ''
          }`)
          .join('；')}`
      : '大限命宮無主星，主調偏向流動與調整，適合借力使力、換環境或重新定位。',
    `大限三方四正會照：${surroundStarsOf(ctx, decadalPalace).join('、') || '主星較少，宜借對宮'}。`,
    decadalMutagens.length
      ? `大限四化：${decadalMutagens.map((m) => `${m.label}入${m.target}`).join('；')}。機會集中在化祿所在，壓力與功課則在化忌。`
      : '',
  ].filter(Boolean);

  const yearText = [
    `${year} 年（${h.yearly.heavenlyStem}${h.yearly.earthlyBranch}）流年，流年命宮落在本命${yearlyPalace.name}宮，虛歲 ${h.age.nominalAge} 歲；小限在${agePalace.name}宮。`,
    yearStars.length
      ? `今年主題：${yearStars
          .map((s) => `${s.name}${s.brightness ? `（${s.brightness}）` : ''}──${
            MAJOR_STARS[s.name] ? MAJOR_STARS[s.name].short : ''
          }`)
          .join('；')}`
      : '流年命宮無主星，今年適合機動調整，不宜把話說死。',
    yearlyMutagens.length
      ? `流年四化：${yearlyMutagens.map((m) => `${m.label}入${m.target}`).join('；')}。`
      : '',
    `今年提示：${
      delta > 0
        ? '流年吉化會照命宮，適合主動出擊、談合作或推進卡住的事。'
        : delta < 0
        ? '流年忌星會照命宮，宜守成、降低槓桿，先處理舊帳與健康。'
        : '流年四化未直接會照命宮，屬於平穩盤，按自己的節奏走即可。'
    }`,
  ].filter(Boolean);

  const timeline = ctx.palaces
    .map((p) => ({
      range: p.decadal.range,
      ageFrom: p.decadal.range[0],
      ageTo: p.decadal.range[1],
      yearFrom: birthYear + p.decadal.range[0] - 1,
      yearTo: birthYear + p.decadal.range[1] - 1,
      stemBranch: `${p.decadal.heavenlyStem}${p.decadal.earthlyBranch}`,
      palace: p.name,
      stars: p.majorStars.map((s) => s.name),
      isCurrent: p.index === decadalPalace.index,
    }))
    .sort((a, b) => a.ageFrom - b.ageFrom);

  return {
    year,
    nominalAge: h.age.nominalAge,
    decadal: {
      index: decadalPalace.index,
      palace: decadalPalace.name,
      domain: PALACE_INFO[decadalPalace.name]?.domain || '',
      stemBranch: `${decadalPalace.heavenlyStem}${decadalPalace.earthlyBranch}`,
      range: decadalPalace.decadal.range,
      years: decadalRangeYears,
      score: decadalScore.score,
      grade: decadalScore.grade,
      stars: decStars.map((s) => s.name),
      surround: surroundStarsOf(ctx, decadalPalace),
      mutagens: decadalMutagens,
      text: decadalText.join('\n\n'),
    },
    yearly: {
      index: yearlyPalace.index,
      palace: yearlyPalace.name,
      domain: PALACE_INFO[yearlyPalace.name]?.domain || '',
      stemBranch: `${h.yearly.heavenlyStem}${h.yearly.earthlyBranch}`,
      score: yearScore,
      grade: gradeOf(yearScore),
      stars: yearStars.map((s) => s.name),
      mutagens: yearlyMutagens,
      text: yearText.join('\n\n'),
    },
    age: {
      index: agePalace.index,
      palace: agePalace.name,
      stemBranch: `${h.age.heavenlyStem}${h.age.earthlyBranch}`,
    },
    timeline,
    yearOptions: [year - 2, year - 1, year, year + 1, year + 2],
  };
}

module.exports = { buildFortune };
