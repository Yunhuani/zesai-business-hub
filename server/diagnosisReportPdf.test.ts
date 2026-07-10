import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { describe, expect, it, vi } from "vitest";
import { compressPdfWithGhostscript } from "./diagnosisReportPdf";

vi.mock("node:child_process", () => ({
  execFile: vi.fn(),
}));

const mockedExecFile = vi.mocked(execFile);

describe("compressPdfWithGhostscript", () => {
  it("runs ghostscript with pdfwrite settings and returns the compressed file", async () => {
    mockedExecFile.mockImplementationOnce(((
      _command: string,
      args: string[],
      _options: unknown,
      callback: (error: Error | null) => void
    ) => {
      const outputArg = args.find(arg => arg.startsWith("-sOutputFile="));
      const outputFile = outputArg?.slice("-sOutputFile=".length);
      if (!outputFile) throw new Error("missing output file");

      import("node:fs").then(fs =>
        fs.writeFileSync(outputFile, Buffer.from("compressed"))
      ).then(() => callback(null));
      return {} as any;
    }) as any);

    const result = await compressPdfWithGhostscript(Buffer.from("original"), 123);

    expect(result.toString()).toBe("compressed");
    expect(mockedExecFile).toHaveBeenCalledWith(
      "gs",
      expect.arrayContaining([
        "-sDEVICE=pdfwrite",
        "-dCompatibilityLevel=1.5",
        "-dPDFSETTINGS=/printer",
        "-dNOPAUSE",
        "-dQUIET",
        "-dBATCH",
      ]),
      { timeout: 30_000 },
      expect.any(Function)
    );
  });

  it("returns the original PDF when ghostscript fails", async () => {
    mockedExecFile.mockImplementationOnce(((
      _command: string,
      _args: string[],
      _options: unknown,
      callback: (error: Error | null) => void
    ) => {
      callback(new Error("gs missing"));
      return {} as any;
    }) as any);

    const original = Buffer.from("original");
    const result = await compressPdfWithGhostscript(original, 456);

    expect(result).toEqual(original);
  });

  it("cleans up temporary files after compression", async () => {
    let inputFile = "";
    let outputFile = "";
    mockedExecFile.mockImplementationOnce(((
      _command: string,
      args: string[],
      _options: unknown,
      callback: (error: Error | null) => void
    ) => {
      outputFile = args.find(arg => arg.startsWith("-sOutputFile="))!
        .slice("-sOutputFile=".length);
      inputFile = args[args.length - 1];

      import("node:fs").then(fs =>
        fs.writeFileSync(outputFile, Buffer.from("compressed"))
      ).then(() => callback(null));
      return {} as any;
    }) as any);

    await compressPdfWithGhostscript(Buffer.from("original"), 789);

    await expect(readFile(inputFile)).rejects.toThrow();
    await expect(readFile(outputFile)).rejects.toThrow();
  });
});
