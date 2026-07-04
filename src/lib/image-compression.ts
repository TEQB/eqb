import sharp from "sharp";

const MAX_IMAGE_WIDTH = 1800;
const JPEG_QUALITY = 82;

export async function compressExamImage(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer)
    .resize({ width: MAX_IMAGE_WIDTH, withoutEnlargement: true })
    .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
    .toBuffer();
}
