import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { readFile, unlink, writeFile } from "node:fs/promises";
import puppeteer from "puppeteer";

const execFileAsync = promisify(execFile);
const GHOSTSCRIPT_TIMEOUT_MS = 30_000;

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

async function removeTempFile(file: string) {
  try {
    await unlink(file);
  } catch {
    // Best-effort cleanup. Compression must never fail the PDF download.
  }
}

export async function compressPdfWithGhostscript(
  pdf: Buffer,
  diagnosisId: number
): Promise<Buffer> {
  const id = `diagnosis-${diagnosisId}-${randomUUID()}`;
  const inputFile = join(tmpdir(), `${id}.pdf`);
  const outputFile = join(tmpdir(), `${id}.compressed.pdf`);

  try {
    await writeFile(inputFile, pdf);
    await execFileAsync(
      "gs",
      [
        "-sDEVICE=pdfwrite",
        "-dCompatibilityLevel=1.5",
        "-dPDFSETTINGS=/printer",
        "-dNOPAUSE",
        "-dQUIET",
        "-dBATCH",
        `-sOutputFile=${outputFile}`,
        inputFile,
      ],
      { timeout: GHOSTSCRIPT_TIMEOUT_MS }
    );

    const compressed = await readFile(outputFile);
    console.log(
      `[Diagnosis PDF] Ghostscript compressed diagnosis ${diagnosisId}: ` +
        `${pdf.length} -> ${compressed.length} bytes`
    );
    return compressed;
  } catch (error) {
    console.warn(
      `[Diagnosis PDF] Ghostscript compression failed for diagnosis ${diagnosisId}; ` +
        `returning original ${pdf.length} byte PDF.`,
      error
    );
    return pdf;
  } finally {
    await Promise.all([
      removeTempFile(inputFile),
      removeTempFile(outputFile),
    ]);
  }
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

    return compressPdfWithGhostscript(Buffer.from(pdf), diagnosisId);
  } finally {
    await browser.close();
  }
}
