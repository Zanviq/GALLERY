// Render works/observatory/img/favicon.svg to the PNG icons the page links (dev tool).
//   node icons.mjs <puppeteer-core dir>
import { createRequire } from 'module';
import path from 'path';
import fs from 'fs';
import { fileURLToPath, pathToFileURL } from 'url';

const [, , ppDir] = process.argv;
const require = createRequire(path.join(ppDir, 'package.json'));
const puppeteer = require('puppeteer-core');
const here = path.dirname(fileURLToPath(import.meta.url));
const img = path.resolve(here, '../../../../works/observatory/img');
const svg = fs.readFileSync(path.join(img, 'favicon.svg'), 'utf8');

const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, timeout: 180000, protocolTimeout: 300000,
});
const page = await browser.newPage();
for (const [name, size, square] of [['favicon-32.png', 32, false], ['apple-touch-icon.png', 180, true]]) {
  // the touch icon is a full square: iOS rounds the corners itself
  const body = square ? svg.replace('rx="7"', 'rx="0"') : svg;
  await page.setViewport({ width: size, height: size, deviceScaleFactor: 1 });
  await page.setContent(`<html><body style="margin:0;background:transparent">${body.replace('<svg ', `<svg width="${size}" height="${size}" `)}</body></html>`);
  await page.screenshot({ path: path.join(img, name), omitBackground: !square, clip: { x: 0, y: 0, width: size, height: size } });
  console.log('wrote', name);
}
await browser.close();
void pathToFileURL;
