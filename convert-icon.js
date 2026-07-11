import sharp from 'sharp';
import fs from 'fs';

const svgBuffer = fs.readFileSync('public/logo.svg');

sharp(svgBuffer)
  .resize(192, 192)
  .png()
  .toFile('public/icon-192.png')
  .then(() => console.log('192 done'))
  .catch(console.error);

sharp(svgBuffer)
  .resize(512, 512)
  .png()
  .toFile('public/icon-512.png')
  .then(() => console.log('512 done'))
  .catch(console.error);
