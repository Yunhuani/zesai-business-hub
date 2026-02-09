/**
 * PPT Assembler
 * Assembles slide images into a PPTX file using pptxgenjs
 */
import PptxGenJS from 'pptxgenjs';
import { storagePut } from './storage';
import path from 'path';
import fs from 'fs';
import os from 'os';

/**
 * Assemble slide images into a PPTX file and upload to S3
 */
export async function assemblePPT(
  slideImages: Buffer[],
  title: string,
  userId: number,
  documentId: number
): Promise<{ url: string; fileSize: number }> {
  const pptx = new PptxGenJS();
  
  pptx.layout = 'LAYOUT_16x9';
  pptx.title = title;
  pptx.author = '泽思 Zenith AI';
  
  for (const imgBuffer of slideImages) {
    const slide = pptx.addSlide();
    const base64 = imgBuffer.toString('base64');
    slide.addImage({
      data: `image/png;base64,${base64}`,
      x: 0,
      y: 0,
      w: '100%',
      h: '100%',
    });
  }
  
  // Write to temp file
  const tmpDir = os.tmpdir();
  const tmpFile = path.join(tmpDir, `ppt_${userId}_${documentId}_${Date.now()}.pptx`);
  
  try {
    await pptx.writeFile({ fileName: tmpFile });
    
    // Read file and upload to S3
    const fileBuffer = fs.readFileSync(tmpFile);
    const fileSize = fileBuffer.length;
    
    const s3Key = `ppt/${userId}/${documentId}/${title.replace(/[^a-zA-Z0-9\u4e00-\u9fff]/g, '_')}.pptx`;
    const result = await storagePut(
      s3Key,
      fileBuffer,
      'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    );
    
    return { url: result.url, fileSize };
  } finally {
    // Cleanup temp file
    try { fs.unlinkSync(tmpFile); } catch {}
  }
}

/**
 * Generate preview images (return base64 for frontend display)
 */
export function generatePreviewBase64(slideImages: Buffer[]): string[] {
  return slideImages.map(buf => `data:image/png;base64,${buf.toString('base64')}`);
}
