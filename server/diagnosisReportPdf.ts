import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { readFile, unlink, writeFile } from "node:fs/promises";
import { PDFDocument } from "pdf-lib";
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

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function mergePdfBuffers(parts: Buffer[]): Promise<Buffer> {
  const merged = await PDFDocument.create();

  for (const part of parts) {
    const source = await PDFDocument.load(part);
    const pages = await merged.copyPages(source, source.getPageIndices());
    for (const page of pages) {
      merged.addPage(page);
    }
  }

  return Buffer.from(await merged.save());
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
    const companyName = await page.$eval(
      ".diagnosis-report",
      element => element.getAttribute("data-report-company") || "企业"
    ).catch(() => "企业");
    const safeCompanyName = escapeHtml(companyName);

    const coverPrintStyle = await page.addStyleTag({
      content: `
        @page { margin: 0 !important; }
        .diagnosis-report {
          min-height: 0 !important;
          overflow: visible !important;
        }
      `,
    });
    const coverPdf = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      pageRanges: "1",
      margin: {
        top: "0",
        right: "0",
        bottom: "0",
        left: "0",
      },
    });
    await coverPrintStyle.evaluate(element => element.remove());

    await page.addStyleTag({
      content: `
        @page { margin: 20mm 0 18mm 0 !important; }
        .diagnosis-report {
          min-height: 0 !important;
          overflow: visible !important;
        }
      `,
    });
    const bodyPdf = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: false,
      displayHeaderFooter: true,
      headerTemplate: `
        <div style="-webkit-print-color-adjust:exact;print-color-adjust:exact;box-sizing:border-box;width:100%;height:100%;margin:0;background:#121317;font-family:'Noto Sans SC',sans-serif;color:#7f8592;">
          <div style="-webkit-print-color-adjust:exact;print-color-adjust:exact;box-sizing:border-box;width:100%;height:12mm;margin:0;padding:5mm 14mm 0;background:#121317;display:flex;align-items:flex-start;justify-content:space-between;font-size:8px;">
            <span>${safeCompanyName}</span>
            <span style="letter-spacing:.08em;color:#d4a83e;">NBG 增长诊断</span>
          </div>
        </div>
      `,
      footerTemplate: `
        <div style="-webkit-print-color-adjust:exact;print-color-adjust:exact;box-sizing:border-box;width:100%;height:100%;margin:0;background:#121317;font-family:'Noto Sans SC',sans-serif;color:#7f8592;">
          <div style="-webkit-print-color-adjust:exact;print-color-adjust:exact;box-sizing:border-box;width:100%;height:10mm;margin:0;padding:0 14mm 4mm;background:#121317;display:flex;align-items:flex-end;justify-content:space-between;font-size:8px;">
            <span>泽思AI · zesai&#46;com</span>
            <span><span class="pageNumber"></span> / <span class="totalPages"></span></span>
          </div>
        </div>
      `,
      margin: {
        top: "20mm",
        right: "0",
        bottom: "18mm",
        left: "0",
      },
      pageRanges: "2-1000",
    });
    const pdf = await mergePdfBuffers([
      Buffer.from(coverPdf),
      Buffer.from(bodyPdf),
    ]);

    return compressPdfWithGhostscript(pdf, diagnosisId);
  } finally {
    await browser.close();
  }
}
