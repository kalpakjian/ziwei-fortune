'use strict';

const {
  PALACE_INFO,
  FOUR_TRANSFORM,
  BRIGHTNESS_SCORE,
  BRIGHTNESS_NOTE,
  MAJOR_STARS,
  MINOR_STAR_INFO,
} = require('./knowledge');

function starWeight(star) {
  if (star.type === 'major') {
    const base = BRIGHTNESS_SCORE[star.brightness] ?? 1.5;
    return (base - 1.5) * 6;
  }
  const info = MINOR_STAR_INFO[star.name];
  if (!info) return 0;
  if (info.tone === 'good') return 4;
  if (info.tone === 'bad') return -5;
  return 0;
}

function mutagenWeight(mutagen) {
  return { 祿: 7, 權: 5, 科: 5, 忌: -8 }[mutagen] || 0;
}

/** 單一宮位本身的強弱（不含三方） */
function palaceOwnScore(palace) {
  let score = 0;
  for (const s of palace.majorStars) score += starWeight(s);
  for (const s of palace.minorStars) score += starWeight(s);
  for (const s of [...palace.majorStars, ...palace.minorStars]) score += mutagenWeight(s.mutagen);
  return score;
}

function gradeOf(score) {
  if (score >= 82) return '上吉';
  if (score >= 70) return '吉';
  if (score >= 58) return '平穩';
  if (score >= 46) return '需留意';
  return '較辛苦';
}

/** 含三方四正的宮位分數（自己 60%、三方平均 40%） */
function palaceScore(ctx, palace) {
  const own = palaceOwnScore(palace);
  const others = ctx
    .surroundIndices(palace)
    .filter((i) => i !== palace.index)
    .map((i) => palaceOwnScore(ctx.palaceAt(i)));
  const avgOthers = others.length ? others.reduce((a, b) => a + b, 0) / others.length : 0;
  const raw = own * 0.6 + avgOthers * 0.4;
  // tanh 軟性壓縮，避免強宮全部擠在 97 分
  const score = Math.max(5, Math.min(96, Math.round(60 + 34 * Math.tanh(raw / 9))));
  return { score, grade: gradeOf(score) };
}

function palaceDimension(name) {
  return (
    {
      命宮: 'personality',
      官祿: 'career',
      財帛: 'wealth',
      夫妻: 'love',
      疾厄: 'health',
    }[name] || 'short'
  );
}

function starSentence(star, palaceName) {
  const info = MAJOR_STARS[star.name];
  if (!info) return '';
  const dim = palaceDimension(palaceName);
  const body = info[dim] || info.short;
  const note = star.brightness ? BRIGHTNESS_NOTE[star.brightness] : '';
  const label = `${star.name}${star.brightness ? `（${star.brightness}）` : ''}`;
  return `${label}：${body}${note ? `\n亮度提示：${note}。` : ''}`;
}

function describeMutagen(star) {
  if (!star.mutagen) return '';
  const t = FOUR_TRANSFORM[star.mutagen];
  if (!t) return '';
  return `${star.name}${t.name}：${t.text}`;
}

function palaceReading(ctx, palace) {
  const lines = [];
  const major = palace.majorStars;
  const info = PALACE_INFO[palace.name] || { domain: palace.name, short: palace.name };

  if (major.length) {
    for (const s of major) lines.push(starSentence(s, palace.name));
  } else {
    const opposite = ctx.palaceAt(ctx.ringIndex(palace.index, 6));
    const borrowed = opposite.majorStars.map((s) => s.name).join('、');
    lines.push(
      `本宮無十四主星，屬「空宮」，要借對宮${opposite.name}${
        borrowed ? `的${borrowed}` : ''
      }來看。這代表${info.domain}的可塑性高，但也容易受環境與他人影響。`
    );
  }

  const mutagenLines = [...major, ...palace.minorStars].map(describeMutagen).filter(Boolean);
  if (mutagenLines.length) lines.push(...mutagenLines);

  const auspicious = palace.minorStars.filter(
    (s) => (MINOR_STAR_INFO[s.name] || {}).tone === 'good'
  );
  if (auspicious.length) {
    lines.push(
      `吉星加持：${auspicious
        .map((s) => `${s.name}（${MINOR_STAR_INFO[s.name].text}）`)
        .join('；')}`
    );
  }

  const malefic = palace.minorStars.filter(
    (s) => (MINOR_STAR_INFO[s.name] || {}).tone === 'bad'
  );
  if (malefic.length) {
    lines.push(
      `需留意：${malefic.map((s) => `${s.name}（${MINOR_STAR_INFO[s.name].text}）`).join('；')}`
    );
  }

  if (!major.length && !auspicious.length && !malefic.length) {
    lines.push('本宮星曜較少，事情多半平順但需要自己主動經營，不宜等待。');
  }

  const { score, grade } = palaceScore(ctx, palace);
  return {
    index: palace.index,
    name: palace.name,
    branch: palace.earthlyBranch,
    stem: palace.heavenlyStem,
    domain: info.domain,
    score,
    grade,
    stars: major.map((s) => ({
      name: s.name,
      brightness: s.brightness,
      mutagen: s.mutagen,
      title: MAJOR_STARS[s.name] ? MAJOR_STARS[s.name].title : '',
    })),
    text: lines.join('\n\n'),
  };
}

module.exports = {
  starWeight,
  palaceOwnScore,
  palaceScore,
  gradeOf,
  palaceReading,
  palaceDimension,
  starSentence,
  describeMutagen,
};
