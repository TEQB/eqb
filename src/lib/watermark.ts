import sharp from "sharp";

const WATERMARK_TEXT = "EQB \u2014 Shared Preview \u2014 Not for Redistribution";

export async function applyWatermark(buffer: Buffer): Promise<Buffer> {
  const image = sharp(buffer);
  const metadata = await image.metadata();
  const width = metadata.width ?? 1200;
  const height = metadata.height ?? 1600;

  const tileSize = 420;
  const cols = Math.ceil(width / tileSize) + 1;
  const rows = Math.ceil(height / tileSize) + 1;

  let tiles = "";
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = c * tileSize;
      const y = r * tileSize + (r % 2 === 0 ? 0 : tileSize / 2);
      tiles += `<text x="${x}" y="${y}" font-size="20" fill="white" fill-opacity="0.18" transform="rotate(-30 ${x} ${y})">${WATERMARK_TEXT}</text>`;
    }
  }

  const svgOverlay = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      ${tiles}
    </svg>
  `;

  return image
    .composite([{ input: Buffer.from(svgOverlay), top: 0, left: 0 }])
    .jpeg({ quality: 85 })
    .toBuffer();
}
