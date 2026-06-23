import puppeteer from 'puppeteer';

declare const document: any;

export async function generatePdfFromHtml(html: string, width: number, height: number): Promise<Buffer> {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-web-security'
    ]
  });

  try {
    const page = await browser.newPage();
    
    await page.setViewport({
      width: width || 794,
      height: height || 1123,
      deviceScaleFactor: 2
    });

    await page.setContent(html, {
      waitUntil: 'networkidle0' as any
    });

    await page.evaluate(`
      new Promise((resolve) => {
        const start = Date.now();
        const checkReady = () => {
          const svgs = document.querySelectorAll('svg');
          const icons = document.querySelectorAll('i[data-lucide]');
          if (svgs.length > 0 || icons.length === 0 || (Date.now() - start) > 2000) {
            resolve();
          } else {
            setTimeout(checkReady, 50);
          }
        };
        checkReady();
      })
    `);

    const pdfBuffer = await page.pdf({
      width: `${width || 794}px`,
      height: `${height || 1123}px`,
      printBackground: true,
      margin: {
        top: '0px',
        right: '0px',
        bottom: '0px',
        left: '0px'
      }
    });

    return Buffer.from(pdfBuffer);
  } finally {
    await browser.close();
  }
}
