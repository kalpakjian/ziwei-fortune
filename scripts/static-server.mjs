// 預覽靜態版，模擬 GitHub Pages 的子路徑部署：
//   /ziwei-fortune/  →  docs/
// 執行：npm run preview
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DOCS = path.join(ROOT, 'docs');
const PREFIX = process.env.PREFIX || '/ziwei-fortune';
const PORT = Number(process.env.PORT) || 5200;

const app = express();
app.use(PREFIX, express.static(DOCS, { extensions: ['html'] }));
app.get('/', (_req, res) => res.redirect(`${PREFIX}/`));
app.use((_req, res) => res.status(404).send('Not found'));

app.listen(PORT, '127.0.0.1', () => {
  console.log(`靜態版預覽： http://localhost:${PORT}${PREFIX}/`);
});
