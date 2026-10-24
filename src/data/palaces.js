'use strict';

/** 地支、宮位、四化、亮度等基礎資料 */

const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

const BRANCH_ELEMENT = {
  子: '水', 丑: '土', 寅: '木', 卯: '木', 辰: '土', 巳: '火',
  午: '火', 未: '土', 申: '金', 酉: '金', 戌: '土', 亥: '水',
};

/** 命盤 4x4 版位：頂列巳午未申，底列寅丑子亥，中央 2x2 為資訊區 */
const GRID_POSITION = {
  巳: [1, 1], 午: [1, 2], 未: [1, 3], 申: [1, 4],
  辰: [2, 1], 酉: [2, 4],
  卯: [3, 1], 戌: [3, 4],
  寅: [4, 1], 丑: [4, 2], 子: [4, 3], 亥: [4, 4],
};

const PALACE_INFO = {
  命宮: { key: 'self', domain: '自我性格、人生方向與格局', short: '你本身' },
  兄弟: { key: 'siblings', domain: '手足緣分、同輩與合作關係', short: '手足與同輩' },
  夫妻: { key: 'spouse', domain: '伴侶特質、婚姻與親密關係', short: '伴侶與婚姻' },
  子女: { key: 'children', domain: '子女緣分、部屬、創作與投資成果', short: '子女與作品' },
  財帛: { key: 'wealth', domain: '賺錢方式、理財態度與現金流', short: '財運與理財' },
  疾厄: { key: 'health', domain: '體質、健康弱點與壓力反應', short: '健康與體質' },
  遷移: { key: 'travel', domain: '外出發展、環境際遇與社交舞台', short: '外出與際遇' },
  交友: { key: 'friends', domain: '朋友、人脈與部屬關係', short: '人脈與朋友' },
  僕役: { key: 'friends', domain: '朋友、人脈與部屬關係', short: '人脈與朋友' },
  官祿: { key: 'career', domain: '事業方向、工作型態與學業', short: '事業與學業' },
  田宅: { key: 'property', domain: '家庭、不動產與財庫', short: '家庭與不動產' },
  福德: { key: 'fortune', domain: '精神生活、興趣、福氣與內心', short: '精神與福氣' },
  父母: { key: 'parents', domain: '父母長輩、文書與庇蔭', short: '長輩與庇蔭' },
};

const FOUR_TRANSFORM = {
  祿: {
    name: '化祿', tone: 'good', keyword: '機會與財源',
    text: '代表資源、人緣與順水推舟的助力；落在哪一宮，那一宮就是容易「多出來」的地方。',
  },
  權: {
    name: '化權', tone: 'good', keyword: '掌控與執行',
    text: '代表主導權、企圖心與責任；落在哪一宮，那一宮就會想自己作主，也容易被推上火線。',
  },
  科: {
    name: '化科', tone: 'good', keyword: '名聲與貴人',
    text: '代表名聲、學習與貴人；落在哪一宮，那一宮容易因專業、口碑或文書而得利。',
  },
  忌: {
    name: '化忌', tone: 'bad', keyword: '執著與功課',
    text: '代表牽掛、阻力與反覆的功課；落在哪一宮，那一宮就是此生特別在意、也特別容易卡住的地方。',
  },
};

const BRIGHTNESS_SCORE = { 廟: 3, 旺: 2.5, 得: 2, 利: 1.5, 平: 1, 不: 0.5, 陷: 0.5 };

const BRIGHTNESS_NOTE = {
  廟: '正處最有力的位置，特質能完整發揮',
  旺: '力量充足，做事容易到位',
  得: '力量穩定，屬於可用的狀態',
  利: '尚稱得地，需要後天搭配',
  平: '力量普通，成敗看搭配與努力',
  不: '略顯無力，特質容易打折',
  陷: '落入弱位，優點不易展現、缺點較明顯',
};

module.exports = {
  BRANCHES,
  BRANCH_ELEMENT,
  GRID_POSITION,
  PALACE_INFO,
  FOUR_TRANSFORM,
  BRIGHTNESS_SCORE,
  BRIGHTNESS_NOTE,
  palaceLabel,
};

/** 宮位名稱補上「宮」字：「命宮」本身已有「宮」，不再重複成「命宮宮」。 */
function palaceLabel(name) {
  const n = String(name || '');
  return n.endsWith('宮') ? n : `${n}宮`;
}
