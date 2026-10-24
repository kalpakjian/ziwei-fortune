'use strict';

/**
 * 靜態版進入點：把 src/index.js 的排盤與解讀打包成瀏覽器可用的 engine.js。
 * 由 scripts/build-static.mjs 產出 docs/engine.js。
 */
const { cast, TIME_OPTIONS, InputError } = require('../src/index.js');

window.ZiweiEngine = {
  cast,
  TIME_OPTIONS,
  InputError,
  version: '1.0.0',
};
