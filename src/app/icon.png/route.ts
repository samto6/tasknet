// Placeholder 1x1 PNG; replace with a proper 512x512 PNG in /public for production
const ONE_BY_ONE_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMB/axhVZwAAAAASUVORK5CYII=";

export function GET() {
  const buf = Buffer.from(ONE_BY_ONE_PNG_BASE64, "base64");
  return new Response(buf, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
