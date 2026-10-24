'use strict';

/** 輔星、煞星、雜曜：只列常見且會影響判讀的星曜 */
const MINOR_STAR_INFO = {
  左輔: { kind: 'auspicious', tone: 'good', text: '貴人與助力，代表有人幫你補位。' },
  右弼: { kind: 'auspicious', tone: 'good', text: '人際支援與協調力，代表關鍵時刻有人拉一把。' },
  文昌: { kind: 'auspicious', tone: 'good', text: '文書、考試、表達與才華，也帶一點文藝桃花。' },
  文曲: { kind: 'auspicious', tone: 'good', text: '口才、藝術、感性與人緣，適合靠表達取勝。' },
  天魁: { kind: 'auspicious', tone: 'good', text: '明貴人，多在正式場合或長輩處得到提攜。' },
  天鉞: { kind: 'auspicious', tone: 'good', text: '暗貴人，常在關鍵時刻出現意料之外的協助。' },
  祿存: { kind: 'auspicious', tone: 'good', text: '財祿與穩定，代表守得住、也容易保守。' },
  天馬: { kind: 'neutral', tone: 'neutral', text: '奔波與變動，代表機會在外地、也代表停不下來。' },
  紅鸞: { kind: 'auspicious', tone: 'good', text: '喜慶與婚緣，代表感情與人緣的活躍。' },
  天喜: { kind: 'auspicious', tone: 'good', text: '喜事與桃花，代表心情與關係容易有好消息。' },
  天姚: { kind: 'neutral', tone: 'neutral', text: '魅力與風情，感情上較有吸引力，也需注意界線。' },
  咸池: { kind: 'neutral', tone: 'neutral', text: '情慾與異性緣，容易有浪漫際遇。' },
  擎羊: { kind: 'malefic', tone: 'bad', text: '衝勁與刑傷，代表競爭、急躁與意外。' },
  陀羅: { kind: 'malefic', tone: 'bad', text: '拖延與糾纏，代表事情容易反覆、需要耐性。' },
  火星: { kind: 'malefic', tone: 'bad', text: '急躁與突發，代表來得快去得也快的情緒與事件。' },
  鈴星: { kind: 'malefic', tone: 'bad', text: '焦慮與暗火，代表壓力累積後的突然爆發。' },
  地空: { kind: 'malefic', tone: 'bad', text: '空想與落差，代表計畫容易落空、適合轉向精神面。' },
  地劫: { kind: 'malefic', tone: 'bad', text: '耗損與變數，代表財務或成果容易被打斷。' },
  天刑: { kind: 'neutral', tone: 'neutral', text: '自律與刑剋，適合法律、醫療，也代表自我要求高。' },
  天月: { kind: 'neutral', tone: 'neutral', text: '小疾與慢性疲勞，提醒作息與保養。' },
  陰煞: { kind: 'malefic', tone: 'bad', text: '小人與暗疾，代表不易察覺的阻礙。' },
  孤辰: { kind: 'neutral', tone: 'neutral', text: '孤獨感與獨立性，代表需要自己的空間。' },
  寡宿: { kind: 'neutral', tone: 'neutral', text: '獨處與疏離，感情上需要主動經營。' },
  華蓋: { kind: 'neutral', tone: 'neutral', text: '宗教、藝術與孤高，適合鑽研專業。' },
  解神: { kind: 'auspicious', tone: 'good', text: '解厄與轉圜，代表事情有轉機。' },
  天巫: { kind: 'auspicious', tone: 'good', text: '醫藥、玄學與靈感，適合專業進修。' },
  天廚: { kind: 'auspicious', tone: 'good', text: '食祿與口福，代表生活品質。' },
  天福: { kind: 'auspicious', tone: 'good', text: '福氣與順遂，代表小確幸多。' },
  破碎: { kind: 'malefic', tone: 'bad', text: '破裂與不完整，提醒細節與收尾。' },
  蜚廉: { kind: 'malefic', tone: 'bad', text: '口舌與小人，提醒說話與合約。' },
};

module.exports = { MINOR_STAR_INFO };
