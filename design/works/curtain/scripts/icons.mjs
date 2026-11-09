// Render works/curtain/img/favicon.svg to the PNG sizes the page links.
//   node design/works/curtain/scripts/icons.mjs <puppeteer-core dir>
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
const img = path.resolve(here, '../../../../works/curtain/img');
const require = createRequire(path.join(process.argv[2], 'package.json'));
const puppeteer = require('puppeteer-core');
const svg = fs.readFileSync(path.join(img, 'favicon.svg'), 'utf8');
const data = 'data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64');

const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const page = await browser.newPage();
for (const [name, size, bg] of [['favicon-32.png', 32, 'transparent'], ['apple-touch-icon.png', 180, '#000']]) {
  await page.setViewport({ width: size, height: size, deviceScaleFactor: 1 });
  // the touch icon is full-bleed black: iOS rounds the corners itself
  const inset = bg === '#000' ? 0 : 0;
  await page.setContent(`<body style="margin:0;background:${bg}"><img src="${data}" style="display:block;width:${size - inset * 2}px;height:${size - inset * 2}px;margin:${inset}px"></body>`);
  await page.evaluate(() => document.images[0].decode());
  await page.screenshot({ path: path.join(img, name), omitBackground: bg === 'transparent' });
  console.log(name);
}
await browser.close();
