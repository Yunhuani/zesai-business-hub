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

type JsonObject = Record<string, unknown>;

type RenderBusinessPlanReportPdfOptions = {
  baseUrl: string;
  businessPlanId: number;
  companyName?: string | null;
  authToken?: string;
  cookieHeader?: string;
};

function object(value: unknown): JsonObject | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as JsonObject
    : null;
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function getBusinessPlanCompanyName(result: unknown): string | null {
  const root = object(result);
  const overview = object(root?.project_overview);
  const fields = object(overview?.fields);
  const companyName = object(fields?.company_name);
  return text(companyName?.value) ?? text(fields?.company_name);
}

export function buildBusinessPlanPdfFileName(
  companyName: string | null | undefined,
  businessPlanId: number
): string {
  return `${companyName ?? "商业计划书"}-商业计划书-${businessPlanId}.pdf`;
}

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
    for (const page of pages) merged.addPage(page);
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

export async function compressBusinessPlanPdfWithGhostscript(
  pdf: Buffer,
  businessPlanId: number
): Promise<Buffer> {
  const id = `business-plan-${businessPlanId}-${randomUUID()}`;
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
      `[BusinessPlan PDF] Ghostscript compressed business plan ${businessPlanId}: ` +
        `${pdf.length} -> ${compressed.length} bytes`
    );
    return compressed;
  } catch (error) {
    console.warn(
      `[BusinessPlan PDF] Ghostscript compression failed for business plan ${businessPlanId}; ` +
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

export async function renderBusinessPlanReportPdf({
  baseUrl,
  businessPlanId,
  companyName,
  authToken,
  cookieHeader,
}: RenderBusinessPlanReportPdfOptions): Promise<Buffer> {
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
      if (cookies.length > 0) await page.setCookie(...cookies);
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

    const reportUrl = `${baseUrl}/business-plan/${businessPlanId}/report`;
    await page.goto(reportUrl, {
      waitUntil: "networkidle0",
      timeout: 60_000,
    });
    await page.waitForSelector(".bp-report", {
      visible: true,
      timeout: 30_000,
    });
    await page.evaluate(() => document.fonts.ready);
    await page.emulateMediaType("print");
    const safeCompanyName = escapeHtml(companyName ?? "商业计划书");

    const coverPrintStyle = await page.addStyleTag({
      content: `
        @page { margin: 0 !important; }
        .bp-report { min-height: 0 !important; }
        .bp-report > *:not(.bp-document),
        .bp-document > *:not(.bp-cover) {
          display: none !important;
        }
        .bp-cover {
          display: block !important;
          min-height: 0 !important;
          margin: 0 !important;
          overflow: visible !important;
        }
        .bp-cover * { overflow: visible !important; }
      `,
    });
    const coverPdf = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
    });
    await coverPrintStyle.evaluate(element => element.remove());

    await page.addStyleTag({
      content: `
        @page { margin: 20mm 0 18mm 0 !important; }
        .bp-report { min-height: 0 !important; }
        .bp-report > header,
        .bp-cover,
        .bp-pdf-hidden { display: none !important; }
        .bp-report, .bp-report * { overflow: visible !important; }
        .bp-document-page { break-inside: auto !important; }
      `,
    });
    const bodyPdf = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: false,
      displayHeaderFooter: true,
      headerTemplate: `
        <div style="-webkit-print-color-adjust:exact;print-color-adjust:exact;box-sizing:border-box;width:100%;height:100%;margin:0;background:#1F3D32;font-family:'Noto Sans SC',sans-serif;color:#A9B7A6;">
          <div style="-webkit-print-color-adjust:exact;print-color-adjust:exact;box-sizing:border-box;width:100%;height:12mm;margin:0;padding:5mm 14mm 0;background:#1F3D32;display:flex;align-items:flex-start;justify-content:space-between;font-size:8px;">
            <span>${safeCompanyName}</span>
            <span style="letter-spacing:.08em;color:#DFC183;">商业计划书</span>
          </div>
        </div>
      `,
      footerTemplate: `
        <div style="-webkit-print-color-adjust:exact;print-color-adjust:exact;box-sizing:border-box;width:100%;height:100%;margin:0;background:#1F3D32;font-family:'Noto Sans SC',sans-serif;color:#A9B7A6;">
          <div style="-webkit-print-color-adjust:exact;print-color-adjust:exact;box-sizing:border-box;width:100%;height:10mm;margin:0;padding:0 14mm 4mm;background:#1F3D32;display:flex;align-items:flex-end;justify-content:space-between;font-size:8px;">
            <span>泽思AI · zesiai.com</span>
            <span><span class="pageNumber"></span> / <span class="totalPages"></span></span>
          </div>
        </div>
      `,
      margin: { top: "20mm", right: "0", bottom: "18mm", left: "0" },
    });

    const pdf = await mergePdfBuffers([
      Buffer.from(coverPdf),
      Buffer.from(bodyPdf),
    ]);
    return compressBusinessPlanPdfWithGhostscript(pdf, businessPlanId);
  } finally {
    await browser.close();
  }
}
