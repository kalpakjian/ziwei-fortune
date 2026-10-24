// 後端 API 測試：node scripts/api-test.mjs
const BASE = process.env.BASE_URL || 'http://localhost:5199';
const cases = [
  {
    name: '國曆・女・午時',
    body: { gender: '女', year: 1990, month: 5, day: 17, timeIndex: 6, fortuneYear: 2026 },
    expect: (r) => r.chart.palaces.length === 12 && r.chart.meta.fiveElementsClass.includes('局'),
  },
  {
    name: '國曆・男・早子時',
    body: { gender: '男', year: 2000, month: 1, day: 1, timeIndex: 0 },
    expect: (r) => r.chart.palaces.length === 12 && r.chart.meta.time.includes('子'),
  },
  {
    name: '國曆・女・晚子時',
    body: { gender: '女', year: 1985, month: 12, day: 31, timeIndex: 12 },
    expect: (r) => r.chart.palaces.length === 12,
  },
  {
    name: '農曆・閏二月',
    body: { gender: '男', calendar: 'lunar', year: 2023, month: 2, day: 15, timeIndex: 3, isLeapMonth: true },
    expect: (r) => /闰|閏/.test(r.chart.meta.lunarDate) && r.chart.palaces.length === 12,
  },
  {
    name: '國曆・女・午時（含 v4.0 資料集欄位）',
    body: { gender: '女', year: 1990, month: 5, day: 17, timeIndex: 6 },
    expect: (r) => r.dataset && typeof r.dataset.available === 'boolean',
  },
  {
    name: '不存在的日期（應 400）',
    body: { gender: '女', year: 1990, month: 2, day: 31, timeIndex: 6 },
    status: 400,
  },
  {
    name: '時辰超出範圍（應 400）',
    body: { gender: '女', year: 1990, month: 5, day: 17, timeIndex: 13 },
    status: 400,
  },
  {
    name: '年份超出範圍（應 400）',
    body: { gender: '女', year: 1899, month: 5, day: 17, timeIndex: 6 },
    status: 400,
  },
  {
    name: '性別錯誤（應 400）',
    body: { gender: 'X', year: 1990, month: 5, day: 17, timeIndex: 6 },
    status: 400,
  },
];

let failed = 0;
for (const c of cases) {
  const res = await fetch(`${BASE}/api/chart`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(c.body),
  });
  const data = await res.json().catch(() => null);
  const statusOk = c.status ? res.status === c.status : res.status === 200;
  const dataOk = c.status ? !!data && typeof data.error === 'string' : !!data && c.expect(data);
  const ok = statusOk && dataOk;
  if (!ok) failed += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${c.name}  [HTTP ${res.status}]${data && data.error ? ` ${data.error}` : ''}`);
}

const health = await fetch(`${BASE}/api/health`);
console.log(`${health.ok ? 'PASS' : 'FAIL'}  /api/health`);

const dsStatus = await fetch(`${BASE}/api/dataset/status`);
const dsData = await dsStatus.json().catch(() => null);
const dsOk = dsStatus.ok && dsData && Array.isArray(dsData.years) && !!dsData.source;
console.log(`${dsOk ? 'PASS' : 'FAIL'}  /api/dataset/status  [HTTP ${dsStatus.status}]`);

const page = await fetch(BASE);
console.log(`${page.ok ? 'PASS' : 'FAIL'}  GET / (${page.status})`);

if (failed) {
  console.error(`\n${failed} case(s) failed`);
  process.exit(1);
}
console.log('\nALL API TESTS PASSED');
