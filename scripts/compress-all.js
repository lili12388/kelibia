import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, '../public/uploads');

async function compressAll() {
  const files = fs.readdirSync(uploadsDir);
  let compressedCount = 0;
  let totalSavedBytes = 0;

  for (const file of files) {
    if (file.endsWith('.webp') || file.endsWith('.jpg') || file.endsWith('.png') || file.endsWith('.jpeg')) {
      const filePath = path.join(uploadsDir, file);
      try {
        const statsBefore = fs.statSync(filePath);
        // Read file into buffer
        const buffer = fs.readFileSync(filePath);
        
        // Process with sharp
        const newBuffer = await sharp(buffer)
          .resize(1280, 720, { 
            fit: 'inside',
            withoutEnlargement: true 
          })
          .webp({ quality: 75 })
          .toBuffer();
          
        const savedBytes = statsBefore.size - newBuffer.length;
        
        // Only overwrite if we actually saved space (or if we converted format, but here they are mostly webp already)
        if (savedBytes > 0) {
          fs.writeFileSync(filePath, newBuffer);
          compressedCount++;
          totalSavedBytes += savedBytes;
          console.log(`Compressed ${file}: saved ${(savedBytes / 1024).toFixed(2)} KB`);
        } else {
          console.log(`Skipped ${file}: no space saved`);
        }
      } catch (e) {
        console.error(`Error processing ${file}:`, e.message);
      }
    }
  }
  
  console.log(`\nDone! Compressed ${compressedCount} images.`);
  console.log(`Total space saved: ${(totalSavedBytes / 1024 / 1024).toFixed(2)} MB`);
}

compressAll().catch(console.error);
