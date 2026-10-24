'use strict';

/**
 * 終端機版排盤：
 *   node cli.js --name 小明 --gender 女 --date 1990-5-17 --time 6 --year 2026
 *   node cli.js --lunar --date 1990-4-23 --leap --gender 男 --time 0
 */
const { cast, TIME_OPTIONS } = require('./src');

function parseArgs(argv) {
  const args = { gender: '女', calendar: 'solar', time: 0, year: new Date().getFullYear() };
  for (let i = 2; i < argv.length; i += 1) {
    const key = argv[i];
    const next = argv[i + 1];
    switch (key) {
      case '--name': args.name = next; i += 1; break;
      case '--gender': args.gender = next; i += 1; break;
      case '--date': args.date = next; i += 1; break;
      case '--time': args.time = Number(next); i += 1; break;
      case '--year': args.year = Number(next); i += 1; break;
      case '--lunar': args.calendar = 'lunar'; break;
      case '--leap': args.isLeapMonth = true; break;
      case '--help':
      case '-h': args.help = true; break;
      default:
        if (key.startsWith('--')) console.warn(`忽略未知參數：${key}`);
    }
  }
  return args;
}

function usage() {
  console.log(`紫微斗數排盤 CLI

用法：
  node cli.js --date 1990-5-17 --time 6 --gender 女 [--name 小明] [--year 2026]
  node cli.js --lunar --date 1990-4-23 --leap --time 0 --gender 男

參數：
  --date    生日（國曆 YYYY-M-D；加 --lunar 則為農曆）
  --time    時辰索引 0–12（0 早子、1 丑 … 6 午 … 12 晚子）
  --gender  男 / 女
  --name    姓名（可省略）
  --year    要看的流年（西元，預設今年）
  --lunar   以農曆輸入
  --leap    農曆閏月
`);
  console.log('時辰對照：');
  for (const t of TIME_OPTIONS) console.log(`  ${t.index}\t${t.label}\t${t.range}`);
}

function formatStars(palace) {
  if (!palace.majorStars.length) return '（空宮）';
  return palace.majorStars
    .map(
      (s) =>
        `${s.name}${s.brightness ? `(${s.brightness})` : ''}${
          s.mutagen ? `[化${s.mutagen}]` : ''
        }`
    )
    .join(' ');
}

function printChart(chart, reading, fortune) {
  const { meta } = chart;
  console.log('='.repeat(78));
  console.log(`紫微斗數命盤${meta.name ? ` · ${meta.name}` : ''}`);
  console.log(
    `${meta.gender} · 國曆 ${meta.solarDate} · 農曆 ${meta.lunarDate} · ${meta.time}（${meta.timeRange}）`
  );
  console.log(
    `${meta.chineseDate} · 生肖 ${meta.zodiac} · ${meta.fiveElementsClass} · 命主 ${meta.soul} · 身主 ${meta.body}`
  );
  console.log('='.repeat(78));

  const cell = (branch) => {
    const p = chart.palaces.find((x) => x.earthlyBranch === branch);
    if (!p) return [' '.repeat(24)];
    const name = `${p.name}${p.isBodyPalace ? '·身' : ''}`;
    return [
      `${p.heavenlyStem}${p.earthlyBranch} ${name}`.padEnd(24, ' '),
      formatStars(p).padEnd(24, ' '),
      `大限 ${p.decadal.range[0]}-${p.decadal.range[1]}`.padEnd(24, ' '),
    ];
  };

  const rows = [
    ['巳', '午', '未', '申'],
    ['辰', null, null, '酉'],
    ['卯', null, null, '戌'],
    ['寅', '丑', '子', '亥'],
  ];

  for (const row of rows) {
    const cells = row.map((b) => (b ? cell(b) : [' '.repeat(24), ' '.repeat(24), ' '.repeat(24)]));
    for (let line = 0; line < 3; line += 1) {
      console.log(cells.map((c) => `| ${c[line]} `).join('') + '|');
    }
    console.log('-'.repeat(4 * 27));
  }

  console.log('\n【整體】');
  console.log(
    `${reading.summary.headline}　評分 ${reading.summary.score}/100（${reading.summary.grade}）`
  );
  console.log(reading.summary.intro);
  console.log(`關鍵字：${reading.summary.tags.join('、') || '—'}`);
  console.log(`幸運元素：${reading.summary.fortune.color} / ${reading.summary.fortune.direction}`);

  console.log('\n【性格】');
  reading.personality.paragraphs.forEach((p) => console.log(`- ${p}`));

  console.log('\n【格局】');
  if (reading.patterns.length) {
    reading.patterns.forEach((p) => console.log(`- ${p.name}：${p.text}`));
  } else {
    console.log('- 無特別強烈的格局，命宮三方四正以平穩取勝。');
  }

  console.log('\n【十二宮】');
  for (const p of reading.palaces) {
    console.log(
      `\n${p.name}宮（${p.stem}${p.branch}）${p.score} 分／${p.grade}：${p.stars
        .map((s) => s.name + (s.mutagen ? `化${s.mutagen}` : ''))
        .join('、') || '空宮'}`
    );
    console.log(p.text);
  }

  console.log('\n【大限】');
  console.log(fortune.decadal.text);
  console.log('\n【流年】');
  console.log(fortune.yearly.text);
  console.log('\n' + reading.notes.map((n) => `※ ${n}`).join('\n'));
}

function main() {
  const args = parseArgs(process.argv);
  if (args.help || !args.date) {
    usage();
    process.exit(args.help ? 0 : 1);
  }
  const parts = args.date.split(/[-/.]/).map(Number);
  if (parts.length !== 3) {
    console.error('日期格式錯誤，請使用 YYYY-M-D');
    process.exit(1);
  }
  try {
    const result = cast({
      name: args.name,
      gender: args.gender,
      calendar: args.calendar,
      year: parts[0],
      month: parts[1],
      day: parts[2],
      timeIndex: args.time,
      isLeapMonth: !!args.isLeapMonth,
      fortuneYear: args.year,
    });
    printChart(result.chart, result.reading, result.fortune);
  } catch (err) {
    console.error(`錯誤：${err.message}`);
    process.exit(1);
  }
}

main();
