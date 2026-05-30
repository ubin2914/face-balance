const puppeteer = require('puppeteer-core');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1080, height: 900 });

  const htmlPath = 'file://' + path.resolve(__dirname, 'portfolio.html');
  await page.goto(htmlPath, { waitUntil: 'networkidle0', timeout: 30000 });

  // 실제 콘텐츠 높이 측정
  const height = await page.evaluate(() => document.body.scrollHeight);
  console.log('페이지 높이:', height + 'px');

  const outPath = path.resolve(require('os').homedir(), 'Desktop/face-balance-portfolio.pdf');

  await page.pdf({
    path: outPath,
    width: '1080px',
    height: height + 'px',
    printBackground: true,
    margin: { top: 0, right: 0, bottom: 0, left: 0 },
  });

  await browser.close();
  console.log('저장 완료 →', outPath);
})();
