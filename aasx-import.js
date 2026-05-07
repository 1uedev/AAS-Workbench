export async function readAasxPackage(buffer) {
  const entries = await readZipEntries(buffer);
  const rootRelationships = parseRelationshipList(readTextEntry(entries, "_rels/.rels", "AASX-Datei"));
  const originRelationship = rootRelationships.find((relationship) =>
    relationship.type.endsWith("/aasx-origin"),
  );

  if (!originRelationship) {
    throw new Error("AASX-Datei enthaelt keine aasx-origin Relationship.");
  }

  const originPath = normalizeZipPath(originRelationship.target);
  const originRelationshipPath = relationshipPartPath(originPath);
  const originRelationships = parseRelationshipList(readTextEntry(entries, originRelationshipPath, "AASX-Datei"));
  const aasSpecRelationship = originRelationships.find((relationship) =>
    relationship.type.endsWith("/aas-spec"),
  );

  if (!aasSpecRelationship) {
    throw new Error("AASX-Datei enthaelt keine aas-spec Relationship.");
  }

  const aasSpecPath = resolveZipPath(originPath, aasSpecRelationship.target);
  if (!aasSpecPath.toLowerCase().endsWith(".json")) {
    throw new Error(`AASX-Import unterstuetzt aktuell JSON-AAS-Daten, gefunden: ${aasSpecPath}`);
  }

  return JSON.parse(readTextEntry(entries, aasSpecPath, "AASX-Datei"));
}

async function readZipEntries(buffer) {
  const normalizedBuffer = buffer instanceof ArrayBuffer ? buffer : buffer.buffer;
  const bytes = new Uint8Array(normalizedBuffer);
  const view = new DataView(normalizedBuffer);
  const decoder = new TextDecoder();
  const eocdOffset = findEndOfCentralDirectory(view);
  const centralDirectorySize = view.getUint32(eocdOffset + 12, true);
  const centralDirectoryOffset = view.getUint32(eocdOffset + 16, true);
  const entries = new Map();
  let offset = centralDirectoryOffset;
  const end = centralDirectoryOffset + centralDirectorySize;

  while (offset < end) {
    if (view.getUint32(offset, true) !== 0x02014b50) break;

    const compressionMethod = view.getUint16(offset + 10, true);
    const compressedSize = view.getUint32(offset + 20, true);
    const fileNameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const localHeaderOffset = view.getUint32(offset + 42, true);
    const fileName = decoder.decode(bytes.slice(offset + 46, offset + 46 + fileNameLength));

    const localFileNameLength = view.getUint16(localHeaderOffset + 26, true);
    const localExtraLength = view.getUint16(localHeaderOffset + 28, true);
    const dataStart = localHeaderOffset + 30 + localFileNameLength + localExtraLength;
    const compressedBytes = bytes.slice(dataStart, dataStart + compressedSize);
    const data = compressionMethod === 0 ? compressedBytes : await inflateZipEntry(compressedBytes, compressionMethod);
    entries.set(fileName, data);

    offset += 46 + fileNameLength + extraLength + commentLength;
  }

  return entries;
}

function findEndOfCentralDirectory(view) {
  const minOffset = Math.max(0, view.byteLength - 65557);
  for (let offset = view.byteLength - 22; offset >= minOffset; offset -= 1) {
    if (view.getUint32(offset, true) === 0x06054b50) return offset;
  }
  throw new Error("Die Datei konnte nicht als ZIP/OPC-Package gelesen werden.");
}

async function inflateZipEntry(bytes, compressionMethod) {
  if (compressionMethod !== 8) {
    throw new Error(`ZIP-Kompressionsmethode ${compressionMethod} wird noch nicht unterstuetzt.`);
  }

  if (!("DecompressionStream" in globalThis)) {
    throw new Error("Diese Laufzeit kann komprimierte ZIP/OPC-Dateien nicht entpacken.");
  }

  const formats = ["deflate-raw", "deflate"];
  for (const format of formats) {
    try {
      const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream(format));
      return new Uint8Array(await new Response(stream).arrayBuffer());
    } catch {
      // Try the next supported stream format.
    }
  }

  throw new Error("ZIP/OPC-Eintrag konnte nicht entpackt werden.");
}

function readTextEntry(entries, path, packageLabel) {
  const entry = entries.get(path);
  if (!entry) throw new Error(`${packageLabel} enthaelt ${path} nicht.`);
  return new TextDecoder().decode(entry);
}

function parseRelationshipList(xmlText) {
  return [...xmlText.matchAll(/<Relationship\b([^>]*)\/?>/g)].map((match) => {
    const attributes = parseXmlAttributes(match[1]);
    return {
      id: attributes.Id ?? "",
      target: attributes.Target ?? "",
      type: attributes.Type ?? "",
    };
  });
}

function parseXmlAttributes(text) {
  return Object.fromEntries(
    [...text.matchAll(/\b([A-Za-z_:][\w:.-]*)="([^"]*)"/g)].map((match) => [match[1], decodeXml(match[2])]),
  );
}

function decodeXml(value) {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function resolveZipPath(basePath, target) {
  if (target.startsWith("/")) return normalizeZipPath(target);
  const parts = basePath.split("/");
  parts.pop();
  for (const segment of target.split("/")) {
    if (!segment || segment === ".") continue;
    if (segment === "..") {
      parts.pop();
    } else {
      parts.push(segment);
    }
  }
  return parts.join("/");
}

function normalizeZipPath(path) {
  return path.replace(/^\/+/, "");
}

function relationshipPartPath(sourcePath) {
  const parts = sourcePath.split("/");
  const fileName = parts.pop();
  return [...parts, "_rels", `${fileName}.rels`].filter(Boolean).join("/");
}
