import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
  page.on('pageerror', err => console.log('BROWSER ERROR:', err.toString()));
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
  const rootHtml = await page.$eval('#root', el => el.innerHTML);
  console.log('ROOT HTML:', rootHtml.substring(0, 500));
  await browser.close();
})();
