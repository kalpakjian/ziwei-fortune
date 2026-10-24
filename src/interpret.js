'use strict';

const { createContext } = require('./ctx');
const { palaceReading, palaceScore } = require('./scoring');
const {
  PATTERNS,
  DIMENSIONS,
  MAJOR_STARS,
  PALACE_INFO,
  BRANCH_ELEMENT,
  FOUR_TRANSFORM,
  palaceLabel,
} = require('./knowledge');

const ELEMENT_LUCK = {
  木: { color: '青、綠', direction: '東方', action: '學習、成長型的事業' },
  火: { color: '紅、橙', direction: '南方', action: '曝光、行銷、需要熱度的任務' },
  土: { color: '黃、棕', direction: '中央、西南', action: '穩定累積、房地產與長期資產' },
  金: { color: '白、金、銀', direction: '西方', action: '制度、財務、需要精準的專業' },
  水: { color: '黑、藍', direction: '北方', action: '流動、資訊、跨域與人際連結' },
};

function unique(list) {
  return [...new Set(list)];
}

function buildReading(astrolabe, options = {}) {
  const ctx = createContext(astrolabe);
  const soul = ctx.soul;
  const soulMajor = soul.majorStars;
  const soulNames = soulMajor.map((s) => s.name);
  const { score, grade } = palaceScore(ctx, soul);

  const surroundStars = unique(
    ctx
      .surroundIndices(soul)
      .flatMap((i) => ctx.palaceAt(i).majorStars.map((s) => s.name))
  );

  const keywords = unique(
    soulMajor.flatMap((s) => (MAJOR_STARS[s.name] ? MAJOR_STARS[s.name].keywords : []))
  ).slice(0, 6);

  const bodyPalace = ctx.palaces.find((p) => p.isBodyPalace);
  const patterns = PATTERNS.map((p) => {
    let hit = false;
    try {
      hit = !!p.test(ctx);
    } catch (err) {
      hit = false;
    }
    return hit ? { name: p.name, tone: p.tone, text: p.text } : null;
  }).filter(Boolean);

  const palaceReadings = ctx.palaces.map((p) => palaceReading(ctx, p));
  const byName = Object.fromEntries(palaceReadings.map((p) => [p.name, p]));

  const dimensions = DIMENSIONS.map((d) => {
    const reading = byName[d.palace];
    return {
      key: d.key,
      label: d.label,
      palace: d.palace,
      score: reading ? reading.score : null,
      grade: reading ? reading.grade : null,
      text: reading ? reading.text : '',
    };
  });

  const element = (astrolabe.fiveElementsClass || '').charAt(0);
  const luck = ELEMENT_LUCK[element] || null;

  const personalityParagraphs = [
    `命宮在${soul.earthlyBranch}（${soul.heavenlyStem}${soul.earthlyBranch}），${
      astrolabe.fiveElementsClass
    }，命主${astrolabe.soul}、身主${astrolabe.body}。${
      element ? `命局屬${element}，思考與行動的底色偏向${
        { 木: '成長與規劃', 火: '熱度與表達', 土: '穩定與務實', 金: '精準與效率', 水: '流動與應變' }[element]
      }。` : ''
    }`,
    soulMajor.length
      ? soulMajor.map((s) => MAJOR_STARS[s.name]?.personality || '').filter(Boolean).join('\n\n')
      : '命宮無主星，個性會隨著環境與年齡調整，彈性大但也容易沒有定見；建議用「環境選擇」來塑造自己，而不是硬逼自己固定成某一種人。',
    `三方四正會照：${surroundStars.length ? surroundStars.join('、') : '主星較少，需借對宮與大限補足'}。這組星曜決定了你在事業、財富與外出舞台上的基本盤。`,
    bodyPalace
      ? `身宮落在${palaceLabel(bodyPalace.name)}，代表成年之後，人生的重心會逐漸偏向「${PALACE_INFO[bodyPalace.name]?.domain || bodyPalace.name}」，這也是你後天最值得投入的地方。`
      : '',
    soulMajor.length
      ? `給你的提醒：${unique(
          soulMajor.map((s) => MAJOR_STARS[s.name]?.advice).filter(Boolean)
        ).join(' ')}`
      : '給你的提醒：先選環境，再談努力；方向對了，力氣才不會白花。',
  ].filter(Boolean);

  const headline = soulNames.length
    ? `${soulNames.join('・')}坐命`
    : `命宮空宮・借${ctx.palaceAt(ctx.ringIndex(soul.index, 6)).name}之力`;

  const tags = unique([
    ...keywords.slice(0, 4),
    ...patterns.filter((p) => p.tone === 'good').slice(0, 2).map((p) => p.name),
  ]).slice(0, 6);

  return {
    summary: {
      score,
      grade,
      headline,
      tags,
      intro: soulMajor.length
        ? `${soulMajor.map((s) => `${s.name}${s.brightness ? `（${s.brightness}）` : ''}`).join('、')}坐命，整體格局以「${keywords.slice(0, 3).join('、')}」為主調。`
        : `命宮無主星，特質隨環境流動，適合借力使力、跨界發展。`,
      fortune: luck,
    },
    personality: {
      keywords,
      paragraphs: personalityParagraphs,
      soulBranch: soul.earthlyBranch,
      element,
    },
    palaces: palaceReadings,
    dimensions,
    patterns,
    meta: {
      fiveElementsClass: astrolabe.fiveElementsClass,
      soul: astrolabe.soul,
      body: astrolabe.body,
      soulBranch: astrolabe.earthlyBranchOfSoulPalace,
      bodyBranch: astrolabe.earthlyBranchOfBodyPalace,
    },
    notes: [
      '本解讀由規則引擎依紫微斗數通則自動生成，用於自我覺察與娛樂參考。',
      '同一張命盤會因出生時辰、真太陽時與流派差異而有不同判讀；重大決定請回到現實條件與專業建議。',
      '程式計算的是「傾向」而非「注定」，運勢會隨大限、流年與個人選擇改變。',
    ],
  };
}

module.exports = { buildReading, ELEMENT_LUCK, FOUR_TRANSFORM, BRANCH_ELEMENT };
