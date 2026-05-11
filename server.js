const crypto = require("node:crypto");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { URL } = require("node:url");

const rootDir = __dirname;
const dataDir = path.join(rootDir, "data");
const repositoryPath = path.join(dataDir, "repository.json");
const port = Number(process.env.PORT || 8081);

const contentTypes = {
  ".aasx": "application/asset-administration-shell-package",
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".csv": "text/csv; charset=utf-8",
};

ensureRepository();

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${request.headers.host}`);
    if (url.pathname.startsWith("/api/")) {
      await handleApi(request, response, url);
      return;
    }

    serveStatic(response, url.pathname);
  } catch (error) {
    sendJson(response, 500, { error: error.message });
  }
});

server.listen(port, () => {
  console.log(`AAS Workbench listening on http://localhost:${port}`);
});

async function handleApi(request, response, url) {
  const parts = url.pathname.split("/").filter(Boolean);

  if (request.method === "GET" && url.pathname === "/api/health") {
    sendJson(response, 200, { ok: true });
    return;
  }

  if (parts[1] !== "aas") {
    sendJson(response, 404, { error: "API route not found" });
    return;
  }

  if (request.method === "GET" && parts.length === 2) {
    sendJson(response, 200, listAssets());
    return;
  }

  if (request.method === "POST" && parts.length === 2) {
    const body = await readJsonBody(request);
    sendJson(response, 201, saveAasVersion(body));
    return;
  }

  const assetId = parts[2];
  if (!assetId) {
    sendJson(response, 404, { error: "AAS asset not found" });
    return;
  }

  if (request.method === "GET" && parts.length === 3) {
    sendJson(response, 200, getLatestVersion(assetId));
    return;
  }

  if (request.method === "GET" && parts.length === 4 && parts[3] === "versions") {
    sendJson(response, 200, listVersions(assetId));
    return;
  }

  if (request.method === "GET" && parts.length === 5 && parts[3] === "versions") {
    sendJson(response, 200, getVersion(assetId, Number(parts[4])));
    return;
  }

  if (request.method === "GET" && parts.length === 4 && parts[3] === "events") {
    sendJson(response, 200, listEvents(assetId));
    return;
  }

  sendJson(response, 404, { error: "API route not found" });
}

function saveAasVersion(body) {
  const payload = body?.payload;
  if (!payload?.assetAdministrationShells?.length) {
    const error = new Error("payload.assetAdministrationShells is required");
    error.status = 400;
    throw error;
  }

  const repository = readRepository();
  const shell = payload.assetAdministrationShells[0];
  const globalAssetId = shell.assetInformation?.globalAssetId || shell.id;
  const idShort = shell.idShort || "AAS";
  let asset = repository.assets.find((candidate) => candidate.globalAssetId === globalAssetId);
  const now = new Date().toISOString();

  if (!asset) {
    asset = {
      id: crypto.randomUUID(),
      globalAssetId,
      idShort,
      createdAt: now,
      updatedAt: now,
      versions: [],
      events: [],
    };
    repository.assets.push(asset);
  }

  const version = asset.versions.length + 1;
  const versionRecord = {
    version,
    createdAt: now,
    createdBy: body.createdBy || "Workbench",
    changeReason: body.changeReason || "Saved from Workbench",
    payload,
  };

  asset.idShort = idShort;
  asset.updatedAt = now;
  asset.versions.push(versionRecord);
  asset.events.push({
    id: crypto.randomUUID(),
    version,
    eventType: version === 1 ? "created" : "version_created",
    message: versionRecord.changeReason,
    createdAt: now,
    metadata: {
      createdBy: versionRecord.createdBy,
      shellId: shell.id,
      globalAssetId,
    },
  });

  writeRepository(repository);
  return {
    id: asset.id,
    globalAssetId: asset.globalAssetId,
    idShort: asset.idShort,
    version,
    createdAt: versionRecord.createdAt,
  };
}

function listAssets() {
  return readRepository().assets.map((asset) => ({
    id: asset.id,
    globalAssetId: asset.globalAssetId,
    idShort: asset.idShort,
    createdAt: asset.createdAt,
    updatedAt: asset.updatedAt,
    latestVersion: asset.versions.length,
  }));
}

function getLatestVersion(assetId) {
  const asset = findAsset(assetId);
  const latest = asset.versions.at(-1);
  if (!latest) throw notFound("No versions found");
  return versionResponse(asset, latest);
}

function listVersions(assetId) {
  const asset = findAsset(assetId);
  return asset.versions.map((version) => ({
    assetId: asset.id,
    version: version.version,
    createdAt: version.createdAt,
    createdBy: version.createdBy,
    changeReason: version.changeReason,
  }));
}

function getVersion(assetId, versionNumber) {
  const asset = findAsset(assetId);
  const version = asset.versions.find((candidate) => candidate.version === versionNumber);
  if (!version) throw notFound(`Version ${versionNumber} not found`);
  return versionResponse(asset, version);
}

function listEvents(assetId) {
  return findAsset(assetId).events;
}

function versionResponse(asset, version) {
  return {
    asset: {
      id: asset.id,
      globalAssetId: asset.globalAssetId,
      idShort: asset.idShort,
    },
    version: version.version,
    createdAt: version.createdAt,
    createdBy: version.createdBy,
    changeReason: version.changeReason,
    payload: version.payload,
  };
}

function findAsset(assetId) {
  const asset = readRepository().assets.find((candidate) => candidate.id === assetId);
  if (!asset) throw notFound("AAS asset not found");
  return asset;
}

function notFound(message) {
  const error = new Error(message);
  error.status = 404;
  return error;
}

function ensureRepository() {
  fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(repositoryPath)) {
    writeRepository({ assets: [] });
  }
}

function readRepository() {
  ensureRepository();
  return JSON.parse(fs.readFileSync(repositoryPath, "utf8"));
}

function writeRepository(repository) {
  fs.writeFileSync(repositoryPath, `${JSON.stringify(repository, null, 2)}\n`);
}

async function readJsonBody(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  if (chunks.length === 0) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function sendJson(response, status, payload) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(payload, null, 2));
}

function serveStatic(response, pathname) {
  const requestPath = pathname === "/" ? "/index.html" : decodeURIComponent(pathname);
  const filePath = path.normalize(path.join(rootDir, requestPath));

  if (!filePath.startsWith(rootDir)) {
    sendJson(response, 403, { error: "Forbidden" });
    return;
  }

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    sendJson(response, 404, { error: "Not found" });
    return;
  }

  const extension = path.extname(filePath);
  response.writeHead(200, {
    "Content-Type": contentTypes[extension] || "application/octet-stream",
    "Cache-Control": "no-store",
  });
  fs.createReadStream(filePath).pipe(response);
}
