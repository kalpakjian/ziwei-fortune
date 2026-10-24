'use strict';

const {
  BRANCHES,
  BRANCH_ELEMENT,
  GRID_POSITION,
  PALACE_INFO,
  FOUR_TRANSFORM,
  BRIGHTNESS_SCORE,
  BRIGHTNESS_NOTE,
  palaceLabel,
} = require('./data/palaces');
const { MAJOR_STARS } = require('./data/major-stars');
const { MINOR_STAR_INFO } = require('./data/minor-stars');
const { PATTERNS, DIMENSIONS } = require('./data/patterns');

module.exports = {
  BRANCHES,
  BRANCH_ELEMENT,
  GRID_POSITION,
  PALACE_INFO,
  FOUR_TRANSFORM,
  BRIGHTNESS_SCORE,
  BRIGHTNESS_NOTE,
  palaceLabel,
  MAJOR_STARS,
  STAR_INFO: MAJOR_STARS,
  MINOR_STAR_INFO,
  PATTERNS,
  DIMENSIONS,
};
