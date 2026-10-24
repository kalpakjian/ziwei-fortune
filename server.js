'use strict';

const path = require('path');
const express = require('express');
const { cast, TIME_OPTIONS, InputError } = require('./src');
const dataset = require('./dataset');

const app = express();
const PORT = Number(process.env.PORT) || 5199;
const HOST = process.env.HOST || '127.0.0.1';

app.use(express.json({ limit: '64kb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/favicon.ico', (req, res) => {
  res.redirect(302, '/favicon.svg');
});

app.get('/api/health', (req, res) => {
  res.json({ ok: true, service: 'ziwei-fortune', timeOptions: TIME_OPTIONS.length });
});

app.get('/api/time-options', (req, res) => {
  res.json({ timeOptions: TIME_OPTIONS });
});

app.get('/api/dataset/status', (req, res) => {
  res.json(dataset.status());
});

app.post('/api/chart', async (req, res) => {
  try {
    const body = req.body || {};
    const result = cast({
      name: body.name,
      gender: body.gender,
      calendar: body.calendar,
      year: Number(body.year),
      month: Number(body.month),
      day: Number(body.day),
      timeIndex: Number(body.timeIndex),
      isLeapMonth: !!body.isLeapMonth,
      fixLeap: body.fixLeap !== false,
      fortuneYear: body.fortuneYear ? Number(body.fortuneYear) : undefined,
    });
    // v4.0 資料集是選用的：沒有下載資料集時只是少一段內容，不影響排盤
    result.dataset = await dataset.lookup({
      solarDate: result.chart.meta.solarDate,
      timeIndex: Number(body.timeIndex),
      gender: body.gender,
    });
    res.json(result);
  } catch (err) {
    if (err instanceof InputError) {
      res.status(400).json({ error: err.message });
      return;
    }
    console.error('[ziwei] 排盤失敗：', err);
    res.status(500).json({ error: '排盤時發生未預期的錯誤，請確認輸入後再試一次。' });
  }
});

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

if (require.main === module) {
  app.listen(PORT, HOST, () => {
    console.log(`紫微斗數排盤程式已啟動： http://localhost:${PORT}`);
  });
}

module.exports = app;
