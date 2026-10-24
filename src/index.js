'use strict';

const { createAstrolabe, toView, TIME_OPTIONS, InputError } = require('./chart');
const { createContext } = require('./ctx');
const { buildReading } = require('./interpret');
const { buildFortune } = require('./fortune');

/**
 * 一次完成排盤、解讀與運限。
 * @returns {{chart: object, reading: object, fortune: object}}
 */
function cast(input = {}) {
  if (input.fortuneYear !== undefined && input.fortuneYear !== null && input.fortuneYear !== '') {
    const fy = Number(input.fortuneYear);
    if (!Number.isInteger(fy) || fy < 1900 || fy > 2100) {
      throw new InputError('流年年份必須是 1900–2100 之間的整數');
    }
  }

  const astrolabe = createAstrolabe(input);
  const ctx = createContext(astrolabe);
  const chart = toView(astrolabe);
  const reading = buildReading(astrolabe);

  const [sy, sm, sd] = (astrolabe.solarDate || '').split('-').map((n) => Number(n));
  const now = new Date();
  const fortune = buildFortune(astrolabe, ctx, {
    year: input.fortuneYear ? Number(input.fortuneYear) : now.getFullYear(),
    birthMonth: sm || 6,
    birthDay: sd || 15,
  });

  return {
    chart,
    reading,
    fortune,
    generatedAt: new Date().toISOString(),
  };
}

module.exports = { cast, TIME_OPTIONS, InputError };
