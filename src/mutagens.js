'use strict';

const { FOUR_TRANSFORM } = require('./knowledge');

function findStarPalace(ctx, starName) {
  for (const p of ctx.palaces) {
    if ([...p.majorStars, ...p.minorStars].some((s) => s.name === starName)) return p;
  }
  return null;
}

function mutagenName(i) {
  return ['祿', '權', '科', '忌'][i];
}

/** 把一組四化（[祿,權,科,忌] 星名）翻成落宮說明 */
function mapMutagens(ctx, mutagenStars, layerPalaceNames, layerLabel) {
  return (mutagenStars || []).map((starName, i) => {
    const key = mutagenName(i);
    const natalPalace = findStarPalace(ctx, starName);
    const layerPalace =
      natalPalace && layerPalaceNames ? layerPalaceNames[natalPalace.index] : null;
    const info = FOUR_TRANSFORM[key];
    return {
      mutagen: key,
      star: starName,
      natalPalace: natalPalace ? natalPalace.name : null,
      layerPalace: layerPalace || null,
      tone: info ? info.tone : 'neutral',
      keyword: info ? info.keyword : '',
      text: info ? info.text : '',
      label: `${starName}化${key}`,
      target: layerPalace
        ? `${layerLabel}${layerPalace}`
        : natalPalace
        ? `本命${natalPalace.name}`
        : '未找到落宮',
    };
  });
}

function surroundStarsOf(ctx, palace) {
  const names = [];
  for (const i of ctx.surroundIndices(palace)) {
    for (const s of ctx.palaceAt(i).majorStars) names.push(s.name);
  }
  return [...new Set(names)];
}

module.exports = { findStarPalace, mutagenName, mapMutagens, surroundStarsOf };
