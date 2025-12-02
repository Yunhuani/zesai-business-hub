import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'fs';

const sizes = [16, 32, 192];
const inputPath = 'client/public/favicon-source.png';

async function generateFavicons() {
  for (const size of sizes) {
    const outputPath = `client/public/favicon-${size}x${size}.png`;
    await sharp(inputPath)
      .resize(size, size, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png()
      .toFile(outputPath);
    console.log(`✅ Generated ${outputPath}`);
  }
  
  // Also copy as favicon.ico (using 32x32)
  await sharp(inputPath)
    .resize(32, 32, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    })
    .png()
    .toFile('client/public/favicon.ico');
  console.log('✅ Generated client/public/favicon.ico');
}

generateFavicons().catch(console.error);
