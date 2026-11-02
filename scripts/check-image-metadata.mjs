// Fails if any image under the given directory (default: dist) carries
// metadata: EXIF, XMP, IPTC, text or timestamp chunks, SVG editor data.
// Also checks images inlined as data: URIs in any text file.
// Usage: node scripts/check-image-metadata.mjs [dir]

import { readdirSync, readFileSync } from "node:fs";
import { extname, join } from "node:path";

const root = process.argv[2] ?? "dist";
const problems = [];

// PNG: allow only chunks that affect rendering.
const PNG_ALLOWED = new Set(["IHDR", "PLTE", "IDAT", "IEND", "tRNS", "gAMA", "cHRM", "sRGB", "iCCP", "sBIT", "bKGD", "pHYs"]);
function checkPng(b, where) {
  for (let i = 8; i + 8 <= b.length; ) {
    const len = b.readUInt32BE(i);
    const type = b.toString("latin1", i + 4, i + 8);
    if (!PNG_ALLOWED.has(type)) problems.push(`${where}: PNG chunk ${type}`);
    i += 12 + len;
  }
}

// JPEG: reject APP1 (EXIF/XMP), APP13 (IPTC) and comments.
function checkJpeg(b, where) {
  for (let i = 2; i + 4 <= b.length && b[i] === 0xff; ) {
    const marker = b[i + 1];
    if (marker === 0xda) break; // start of scan: no more headers
    if (marker === 0xe1 || marker === 0xed || marker === 0xfe)
      problems.push(`${where}: JPEG segment 0x${marker.toString(16)}`);
    i += 2 + b.readUInt16BE(i + 2);
  }
}

// WebP: reject EXIF and XMP chunks.
function checkWebp(b, where) {
  for (let i = 12; i + 8 <= b.length; ) {
    const type = b.toString("latin1", i, i + 4);
    if (type === "EXIF" || type === "XMP ") problems.push(`${where}: WebP chunk ${type}`);
    const len = b.readUInt32LE(i + 4);
    i += 8 + len + (len & 1);
  }
}

// AVIF (ISOBMFF): metadata lives as items in meta/iinf. Reject Exif items and
// mime items (XMP is a mime item with content type application/rdf+xml).
function boxes(b, start, end, fn) {
  for (let i = start; i + 8 <= end; ) {
    let size = b.readUInt32BE(i), head = 8;
    const type = b.toString("latin1", i + 4, i + 8);
    if (size === 1) { size = Number(b.readBigUInt64BE(i + 8)); head = 16; }
    else if (size === 0) size = end - i;
    if (size < head || i + size > end) break;
    fn(type, i + head, i + size);
    i += size;
  }
}
function checkAvif(b, where) {
  boxes(b, 0, b.length, (type, s, e) => {
    if (type !== "meta") return;
    boxes(b, s + 4, e, (type, s, e) => {
      if (type !== "iinf") return;
      const v = b[s];
      boxes(b, s + 4 + (v === 0 ? 2 : 4), e, (type, s, e) => {
        if (type !== "infe" || b[s] < 2) return;
        const t = s + 4 + (b[s] === 2 ? 2 : 4) + 2;
        const itemType = b.toString("latin1", t, t + 4);
        if (itemType === "Exif" || itemType === "mime") problems.push(`${where}: AVIF item ${itemType}`);
      });
    });
  });
}

const SVG_METADATA = /<metadata\b|<!--|xmlns:(?:rdf|dc|cc|inkscape|sodipodi|sketch|figma|xap|xmp)\b|\b(?:inkscape|sodipodi|sketch):/i;
function checkSvg(text, where) {
  const match = text.match(SVG_METADATA);
  if (match) problems.push(`${where}: SVG metadata (${match[0]})`);
  checkDataUris(text, where);
}

function checkDataUris(text, where) {
  for (const [, kind, data] of text.matchAll(/data:image\/(png|jpeg|jpg|webp|avif|svg\+xml);base64,([A-Za-z0-9+/=]+)/g))
    checkBytes(kind, Buffer.from(data, "base64"), `${where} (inline ${kind})`);
}

function checkBytes(kind, b, where) {
  if (kind === "png") checkPng(b, where);
  else if (kind === "jpeg" || kind === "jpg") checkJpeg(b, where);
  else if (kind === "webp") checkWebp(b, where);
  else if (kind === "avif") checkAvif(b, where);
  else if (kind === "svg+xml" || kind === "svg") checkSvg(b.toString("utf8"), where);
}

const IMAGE = new Set([".png", ".jpg", ".jpeg", ".webp", ".avif", ".svg"]);
const UNSUPPORTED = new Set([".gif", ".heic", ".tif", ".tiff", ".ico", ".bmp"]);
const TEXT = new Set([".html", ".js", ".mjs", ".css", ".json"]);

function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) { walk(path); continue; }
    const ext = extname(entry.name).toLowerCase();
    if (IMAGE.has(ext)) checkBytes(ext.slice(1), readFileSync(path), path);
    else if (UNSUPPORTED.has(ext)) problems.push(`${path}: format not checked; extend this script`);
    else if (TEXT.has(ext)) checkDataUris(readFileSync(path, "utf8"), path);
  }
}

walk(root);
if (problems.length) {
  console.error("Image metadata found:\n  " + problems.join("\n  "));
  process.exit(1);
}
console.log(`No image metadata under ${root}.`);
