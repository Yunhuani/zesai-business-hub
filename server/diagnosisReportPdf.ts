import puppeteer from "puppeteer";

type RenderDiagnosisReportPdfOptions = {
  baseUrl: string;
  diagnosisId: number;
  preview: boolean;
  authToken?: string;
  cookieHeader?: string;
};

function parseCookies(cookieHeader: string, baseUrl: string) {
  return cookieHeader
    .split(";")
    .map(part => part.trim())
    .filter(Boolean)
    .flatMap(part => {
      const separator = part.indexOf("=");
      if (separator <= 0) return [];

      return [{
        name: part.slice(0, separator),
        value: part.slice(separator + 1),
        url: baseUrl,
      }];
    });
}

export async function renderDiagnosisReportPdf({
  baseUrl,
  diagnosisId,
  preview,
  authToken,
  cookieHeader,
}: RenderDiagnosisReportPdfOptions): Promise<Buffer> {
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--font-render-hinting=none",
    ],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 });

    if (cookieHeader) {
      const cookies = parseCookies(cookieHeader, baseUrl);
      if (cookies.length > 0) {
        await page.setCookie(...cookies);
      }
    }

    if (authToken) {
      await page.goto(baseUrl, {
        waitUntil: "domcontentloaded",
        timeout: 30_000,
      });
      await page.evaluate(token => {
        localStorage.setItem("auth_token", token);
      }, authToken);
    }

    const query = new URLSearchParams({ pdf: "1" });
    if (preview) query.set("preview", "1");
    const reportUrl =
      `${baseUrl}/diagnosis/${diagnosisId}/report?${query.toString()}`;

    await page.goto(reportUrl, {
      waitUntil: "networkidle0",
      timeout: 60_000,
    });
    await page.waitForSelector(".diagnosis-report", {
      visible: true,
      timeout: 30_000,
    });
    await page.evaluate(() => document.fonts.ready);
    await page.emulateMediaType("print");

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      margin: {
        top: "0",
        right: "0",
        bottom: "0",
        left: "0",
      },
    });

    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
