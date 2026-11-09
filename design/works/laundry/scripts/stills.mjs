// Renders the still images for works/laundry (dev tool, not deployed).
//   node stills.mjs <puppeteer-core dir> <base url> <outdir>
// og.png          1200x630 key visual from design/works/laundry/og.html
// thumb.png       1200x900 real capture of the page top (desktop, 1200 wide)
// favicon-32.png, apple-touch-icon.png from works/laundry/img/favicon.svg
import { createRequire } from 'module';
import path from 'path';
import fs from 'fs';

const [, , ppDir, base, out] = process.argv;
const require = createRequire(path.join(ppDir, 'package.json'));
const puppeteer = require('puppeteer-core');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true, args: ['--hide-scrollbars', '--no-first-run'],
});

{ // OG
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 630 });
  await page.goto(`${base}/design/works/laundry/og.html`, { waitUntil: 'networkidle0', timeout: 120000 });
  await page.waitForFunction('window.ready === true');
  await page.evaluate(() => document.fonts.ready);
  await sleep(300);
  await page.screenshot({ path: path.join(out, 'og.png') });
  await page.close();
}
{ // thumbnail: the real page, top of the board
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 900 });
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await page.goto(`${base}/laundry/`, { waitUntil: 'networkidle0', timeout: 120000 });
  await page.evaluate(() => document.fonts.ready);
  // hide the shared gallery badge so the capture shows only the work
  await page.addStyleTag({ content: '[data-gallery-back]{display:none!important}' });
  await sleep(800);
  await page.screenshot({ path: path.join(out, 'thumb.png') });
  await page.close();
}
{ // icons
  const svg = fs.readFileSync(path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1')), '../../../../works/laundry/img/favicon.svg'), 'utf8');
  const page = await browser.newPage();
  for (const [size, file, square] of [[32, 'favicon-32.png', false], [180, 'apple-touch-icon.png', true]]) {
    await page.setViewport({ width: size, height: size });
    const src = square ? svg.replace('rx="14"', 'rx="0"') : svg;
    await page.setContent(`<html><body style="margin:0;background:transparent">${src.replace('<svg ', `<svg width="${size}" height="${size}" `)}</body></html>`);
    await page.screenshot({ path: path.join(out, file), omitBackground: !square });
  }
  await page.close();
}
await browser.close();
console.log('stills written to', out);
