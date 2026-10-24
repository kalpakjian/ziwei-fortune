'use strict';

/**
 * 命盤查詢工具：把 iztro 的宮位資料包成好用的查詢函式。
 * 宮位陣列順序為寅→丑，與地支循環一致，因此可用索引加減找三方四正。
 */
function ringIndex(index, offset) {
  return (index + offset + 12) % 12;
}

function palaceTokens(palace) {
  if (!palace) return [];
  const tokens = [];
  for (const s of palace.majorStars) {
    tokens.push(s.name);
    if (s.mutagen) tokens.push(`化${s.mutagen}`);
  }
  for (const s of palace.minorStars) {
    tokens.push(s.name);
    if (s.mutagen) tokens.push(`化${s.mutagen}`);
  }
  return tokens;
}

function createContext(astrolabe) {
  const palaces = astrolabe.palaces;

  const palaceOf = (name) => palaces.find((p) => p.name === name) || null;
  const palaceAt = (index) => palaces[ringIndex(index, 0)] || null;
  const soul = palaceOf('命宮') || palaces[0];

  const surroundIndices = (palace) => {
    const i = palace.index;
    return [i, ringIndex(i, 6), ringIndex(i, 4), ringIndex(i, 8)];
  };

  const hasToken = (palace, token) => palaceTokens(palace).includes(token);

  const inSurround = (names) => {
    const set = surroundIndices(soul);
    return set.some((i) => names.some((n) => hasToken(palaceAt(i), n)));
  };

  const countInSurround = (names) => {
    const set = new Set(surroundIndices(soul));
    let count = 0;
    for (const i of set) {
      const tokens = palaceTokens(palaceAt(i));
      if (names.some((n) => tokens.includes(n))) count += 1;
    }
    return count;
  };

  const hasInPalace = (palaceName, names) => {
    const p = palaceOf(palaceName);
    if (!p) return false;
    const tokens = palaceTokens(p);
    return names.every((n) => tokens.includes(n));
  };

  const hasTogether = (names) =>
    palaces.some((p) => {
      const tokens = palaceTokens(p);
      return names.every((n) => tokens.includes(n));
    });

  /** 夾宮：命宮左右兩宮是否分別出現指定星曜（順序不拘） */
  const isFlankedBy = (names) => {
    const i = soul.index;
    const left = palaceTokens(palaceAt(ringIndex(i, -1)));
    const right = palaceTokens(palaceAt(ringIndex(i, 1)));
    const [a, b] = names;
    return (left.includes(a) && right.includes(b)) || (left.includes(b) && right.includes(a));
  };

  const findStar = (name) => {
    for (const p of palaces) {
      for (const s of [...p.majorStars, ...p.minorStars]) {
        if (s.name === name) return { ...s, palace: p };
      }
    }
    return null;
  };

  return {
    astrolabe,
    palaces,
    soul,
    ringIndex,
    palaceOf,
    palaceAt,
    surroundIndices,
    hasToken,
    inSurround,
    countInSurround,
    hasInPalace,
    hasTogether,
    isFlankedBy,
    findStar,
  };
}

module.exports = { ringIndex, palaceTokens, createContext };
