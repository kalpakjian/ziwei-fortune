'use strict';

/**
 * 格局規則：每條規則都只依賴 ctx（由 interpret.js 提供）讀取命盤，
 * 回傳 true 即列入解讀。
 */
const PATTERNS = [
  {
    name: '紫府同宮', tone: 'good',
    test: (ctx) => ctx.hasInPalace('命宮', ['紫微', '天府']),
    text: '紫微與天府同守命宮，格局穩重，兼具開創與守成，適合掌資源、做長期事業；缺點是容易保守、放不下身段。',
  },
  {
    name: '紫府朝垣', tone: 'good',
    test: (ctx) => ctx.inSurround(['紫微']) && ctx.inSurround(['天府']) && !ctx.hasInPalace('命宮', ['紫微', '天府']),
    text: '紫微、天府會照命宮三方四正，代表格局有靠山、資源到位，做事容易得到上位者支持。',
  },
  {
    name: '君臣慶會', tone: 'good',
    test: (ctx) => ctx.inSurround(['紫微']) && ctx.countInSurround(['左輔', '右弼', '天魁', '天鉞', '文昌', '文曲']) >= 2,
    text: '紫微得輔弼魁鉞昌曲會照，屬於「有君有臣」的組合，領導力與貴人運兼備，適合帶團隊。',
  },
  {
    name: '殺破狼', tone: 'neutral',
    test: (ctx) => ['七殺', '破軍', '貪狼'].every((s) => ctx.inSurround([s])),
    text: '命宮三方四正見七殺、破軍、貪狼，屬於變動與開創型格局，人生節奏快、轉折多；適合業務、創業與需要衝勁的領域，但要控管風險。',
  },
  {
    name: '機月同梁', tone: 'good',
    test: (ctx) => ['天機', '太陰', '天同', '天梁'].every((s) => ctx.inSurround([s])),
    text: '機月同梁會照，屬於企劃、幕僚與專業服務型格局，適合穩定組織、技術職與公教體系，重腦力而非硬碰硬。',
  },
  {
    name: '陽梁昌祿', tone: 'good',
    test: (ctx) => ['太陽', '天梁', '文昌'].every((s) => ctx.inSurround([s])) && ctx.inSurround(['祿存', '化祿']),
    text: '太陽、天梁、文昌會祿，屬於考試、學術與公職的經典吉格，靠專業與名聲取得位置，越資深越吃香。',
  },
  {
    name: '日月並明', tone: 'good',
    test: (ctx) => {
      const sun = ctx.findStar('太陽');
      const moon = ctx.findStar('太陰');
      const strong = (s) => s && ['廟', '旺'].includes(s.brightness);
      return ctx.inSurround(['太陽']) && ctx.inSurround(['太陰']) && strong(sun) && strong(moon);
    },
    text: '太陽與太陰皆在廟旺且會照命宮，光明與細膩兼具，代表能兼顧外場與內務，名聲與人緣都不錯。',
  },
  {
    name: '日月反背', tone: 'bad',
    test: (ctx) => {
      const sun = ctx.findStar('太陽');
      const moon = ctx.findStar('太陰');
      const weak = (s) => s && ['不', '陷'].includes(s.brightness);
      return ['太陽', '太陰'].every((s) => ctx.inSurround([s])) && (weak(sun) || weak(moon));
    },
    text: '日月落陷或反背，代表日夜顛倒、付出與回收不成比例，容易勞心；適合彈性工時與幕後工作，避免硬撐。',
  },
  {
    name: '巨日同宮', tone: 'good',
    test: (ctx) => ctx.hasTogether(['太陽', '巨門']),
    text: '太陽與巨門同宮，口才與曝光兼具，適合教育、法律、媒體、醫療與業務；但言語是非多，需慎口。',
  },
  {
    name: '巨日對照', tone: 'good',
    test: (ctx) => {
      const sun = ctx.findStar('太陽');
      const ju = ctx.findStar('巨門');
      return !!sun && !!ju && Math.abs(sun.palace.index - ju.palace.index) === 6;
    },
    text: '太陽與巨門在對宮相互照會，主口才、專業與曝光，適合教育、法律、媒體、醫療與業務；是非與口舌也會跟著來，建議把話說在刀口上。',
  },
  {
    name: '火貪格', tone: 'good',
    test: (ctx) => ctx.hasTogether(['火星', '貪狼']) || (ctx.inSurround(['火星']) && ctx.inSurround(['貪狼'])),
    text: '火星與貪狼相會，屬於爆發型格局，容易在短時間內衝出成績或意外之財；來得快也要留得住。',
  },
  {
    name: '鈴貪格', tone: 'good',
    test: (ctx) => ctx.hasTogether(['鈴星', '貪狼']) || (ctx.inSurround(['鈴星']) && ctx.inSurround(['貪狼'])),
    text: '鈴星與貪狼相會，屬於沉潛後爆發的格局，適合業務、娛樂與投資；需避免情緒性決策。',
  },
  {
    name: '府相朝垣', tone: 'good',
    test: (ctx) => ctx.inSurround(['天府']) && ctx.inSurround(['天相']) && !ctx.inSurround(['紫微']),
    text: '天府、天相會照命宮，代表穩定、協調與助力，適合管理、幕僚與服務型事業，做事有貴人收尾。',
  },
  {
    name: '月朗天門', tone: 'good',
    test: (ctx) => {
      const p = ctx.palaceOf('命宮');
      return !!p && p.earthlyBranch === '亥' && p.mainStars.some((s) => s.name === '太陰');
    },
    text: '太陰坐命於亥，稱月朗天門，主聰慧、有財氣與人緣，適合財務、不動產與幕後策劃。',
  },
  {
    name: '石中隱玉', tone: 'good',
    test: (ctx) => {
      const p = ctx.palaceOf('命宮');
      return !!p && ['子', '午'].includes(p.earthlyBranch) && p.mainStars.some((s) => s.name === '巨門');
    },
    text: '巨門坐命於子或午，稱石中隱玉，主才華深藏、靠專業與口才翻身，早年較辛苦、中年後漸入佳境。',
  },
  {
    name: '極向離明', tone: 'good',
    test: (ctx) => {
      const p = ctx.palaceOf('命宮');
      return !!p && p.earthlyBranch === '午' && p.mainStars.some((s) => s.name === '紫微');
    },
    text: '紫微坐命於午，稱極向離明，主格局高、企圖心強，適合領導與公職，但需注意孤高與壓力。',
  },
  {
    name: '命無正曜', tone: 'neutral',
    test: (ctx) => !!ctx.palaceOf('命宮') && ctx.palaceOf('命宮').majorStars.length === 0,
    text: '命宮無十四主星，特質較有彈性、受環境與對宮影響大；適合借力使力、跨界發展，但需要更清楚自己的方向。',
  },
  {
    name: '羊陀夾命', tone: 'bad',
    test: (ctx) => ctx.isFlankedBy(['擎羊', '陀羅']),
    text: '擎羊、陀羅夾命宮，代表進退都有人事或現實壓力，做事容易卡關；宜穩紮穩打，避免投機與硬碰硬。',
  },
  {
    name: '左右夾命', tone: 'good',
    test: (ctx) => ctx.isFlankedBy(['左輔', '右弼']),
    text: '左輔、右弼夾命宮，代表身邊有實質助力，遇事容易有人補位，適合團隊合作與需要協調的角色。',
  },
  {
    name: '昌曲夾命', tone: 'good',
    test: (ctx) => ctx.isFlankedBy(['文昌', '文曲']),
    text: '文昌、文曲夾命宮，主聰明、有文采，適合考試、寫作、教育與需要表達的專業。',
  },
  {
    name: '雙祿交流', tone: 'good',
    test: (ctx) => ctx.inSurround(['祿存']) && ctx.inSurround(['化祿']),
    text: '祿存與化祿同會命宮三方四正，財源與守財兼具，適合穩健累積與資產配置。',
  },
  {
    name: '三奇嘉會', tone: 'good',
    test: (ctx) => ['化祿', '化權', '化科'].every((s) => ctx.inSurround([s])),
    text: '化祿、化權、化科三奇會照命宮，屬於難得的吉會，代表機會、權責與名聲能互相成全。',
  },
  {
    name: '馬頭帶劍', tone: 'neutral',
    test: (ctx) => {
      const p = ctx.palaceOf('命宮');
      return !!p && p.earthlyBranch === '午' && ctx.inSurround(['擎羊']);
    },
    text: '擎羊會命於午，稱馬頭帶劍，主衝勁與開創力強，適合競爭型產業；但需注意衝動與意外。',
  },
];

const DIMENSIONS = [
  { key: 'personality', label: '性格格局', palace: '命宮' },
  { key: 'career', label: '事業', palace: '官祿' },
  { key: 'wealth', label: '財運', palace: '財帛' },
  { key: 'love', label: '感情', palace: '夫妻' },
  { key: 'health', label: '健康', palace: '疾厄' },
];

module.exports = { PATTERNS, DIMENSIONS };
