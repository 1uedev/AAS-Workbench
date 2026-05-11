const crypto = require("node:crypto");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { URL } = require("node:url");

const rootDir = __dirname;
const dataDir = path.join(rootDir, "data");
const gatewayPath = path.join(dataDir, "gateway.json");
const repositoryPath = path.join(dataDir, "repository.json");
const port = Number(process.env.PORT || 8081);
const writeRoles = new Set(["editor", "admin"]);
const repositoryRoles = new Set(["viewer", "editor", "admin"]);
const opcUaRuntimeConnections = new Map();
const mqttRuntimeSubscriptions = new Map();

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
ensureGatewayStore();

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${request.headers.host}`);
    if (url.pathname.startsWith("/api/")) {
      await handleApi(request, response, url);
      return;
    }

    serveStatic(response, url.pathname);
  } catch (error) {
    sendJson(response, error.status || 500, { error: error.message });
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

  if (parts[1] === "opcua") {
    await handleOpcUaApi(request, response, parts);
    return;
  }

  if (parts[1] === "mqtt") {
    await handleMqttApi(request, response, parts);
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
    const role = requireRepositoryWriteAccess(request);
    const body = await readJsonBody(request);
    sendJson(response, 201, saveAasVersion(body, role));
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

async function handleOpcUaApi(request, response, parts) {
  if (request.method === "GET" && parts.length === 2) {
    sendJson(response, 200, getOpcUaServiceStatus());
    return;
  }

  if (request.method === "GET" && parts.length === 3 && parts[2] === "connections") {
    sendJson(response, 200, listOpcUaConnections());
    return;
  }

  if (request.method === "POST" && parts.length === 3 && parts[2] === "connections") {
    sendJson(response, 201, saveOpcUaConnection(await readJsonBody(request)));
    return;
  }

  const connectionId = parts[3];
  if (!connectionId || parts[2] !== "connections") {
    sendJson(response, 404, { error: "OPC UA route not found" });
    return;
  }

  if (request.method === "POST" && parts.length === 5 && parts[4] === "connect") {
    sendJson(response, 200, await connectOpcUaConnection(connectionId));
    return;
  }

  if (request.method === "POST" && parts.length === 5 && parts[4] === "disconnect") {
    sendJson(response, 200, await disconnectOpcUaConnection(connectionId));
    return;
  }

  if (request.method === "POST" && parts.length === 5 && parts[4] === "read") {
    sendJson(response, 200, await readOpcUaConnection(connectionId));
    return;
  }

  sendJson(response, 404, { error: "OPC UA route not found" });
}

function getOpcUaServiceStatus() {
  const adapter = loadOpcUaAdapter();
  return {
    service: "opcua",
    status: adapter.available ? "ready" : "adapter_unavailable",
    adapter: adapter.available ? "node-opcua" : "not installed",
    connections: listOpcUaConnections().length,
    message: adapter.available
      ? "OPC UA backend service is ready."
      : "Install node-opcua to enable live OPC UA connections. Configuration persistence is available.",
  };
}

function listOpcUaConnections() {
  return readGatewayStore().opcuaConnections.map((connection) => ({
    ...connection,
    runtimeStatus: opcUaRuntimeConnections.has(connection.id) ? "connected" : connection.status,
  }));
}

function saveOpcUaConnection(body) {
  const endpoint = String(body.endpoint ?? "").trim();
  const nodeId = String(body.nodeId ?? body.sourceAddress ?? "").trim();
  const targetProperty = String(body.targetProperty ?? "").trim();
  const samplingInterval = Number(body.samplingInterval || 1000);

  if (!endpoint.startsWith("opc.tcp://")) {
    const error = new Error("OPC UA endpoint must start with opc.tcp://");
    error.status = 400;
    throw error;
  }

  if (!nodeId) {
    const error = new Error("OPC UA nodeId is required");
    error.status = 400;
    throw error;
  }

  const store = readGatewayStore();
  const now = new Date().toISOString();
  const existing = store.opcuaConnections.find(
    (connection) => connection.endpoint === endpoint && connection.nodeId === nodeId && connection.targetProperty === targetProperty,
  );
  const connection = existing ?? {
    id: crypto.randomUUID(),
    createdAt: now,
    status: "configured",
  };

  Object.assign(connection, {
    endpoint,
    nodeId,
    targetProperty,
    samplingInterval: Number.isFinite(samplingInterval) ? samplingInterval : 1000,
    updatedAt: now,
    lastError: "",
  });

  if (!existing) store.opcuaConnections.push(connection);
  writeGatewayStore(store);
  return connection;
}

async function connectOpcUaConnection(connectionId) {
  const connection = findOpcUaConnection(connectionId);
  const adapter = loadOpcUaAdapter();
  if (!adapter.available) return updateOpcUaConnectionStatus(connectionId, "adapter_unavailable", adapter.error.message);

  try {
    const client = adapter.module.OPCUAClient.create({ endpointMustExist: false });
    await client.connect(connection.endpoint);
    const session = await client.createSession();
    opcUaRuntimeConnections.set(connectionId, { client, session, connectedAt: new Date().toISOString() });
    return updateOpcUaConnectionStatus(connectionId, "connected", "");
  } catch (error) {
    return updateOpcUaConnectionStatus(connectionId, "error", error.message);
  }
}

async function disconnectOpcUaConnection(connectionId) {
  const runtime = opcUaRuntimeConnections.get(connectionId);
  if (runtime) {
    try {
      await runtime.session.close();
      await runtime.client.disconnect();
    } catch {
      // Runtime cleanup should not hide the requested disconnected state.
    }
    opcUaRuntimeConnections.delete(connectionId);
  }
  return updateOpcUaConnectionStatus(connectionId, "disconnected", "");
}

async function readOpcUaConnection(connectionId) {
  const connection = findOpcUaConnection(connectionId);
  const adapter = loadOpcUaAdapter();
  if (!adapter.available) return updateOpcUaConnectionStatus(connectionId, "adapter_unavailable", adapter.error.message);

  let runtime = opcUaRuntimeConnections.get(connectionId);
  if (!runtime) {
    const connected = await connectOpcUaConnection(connectionId);
    if (connected.status !== "connected") return connected;
    runtime = opcUaRuntimeConnections.get(connectionId);
  }

  try {
    const dataValue = await runtime.session.read({
      nodeId: connection.nodeId,
      attributeId: adapter.module.AttributeIds.Value,
    });
    const value = dataValue.value?.value;
    return updateOpcUaConnectionStatus(connectionId, "connected", "", value);
  } catch (error) {
    return updateOpcUaConnectionStatus(connectionId, "error", error.message);
  }
}

function updateOpcUaConnectionStatus(connectionId, status, errorMessage = "", value) {
  const store = readGatewayStore();
  const connection = store.opcuaConnections.find((candidate) => candidate.id === connectionId);
  if (!connection) throw notFound("OPC UA connection not found");
  connection.status = status;
  connection.lastError = errorMessage;
  connection.lastReadAt = value === undefined ? connection.lastReadAt : new Date().toISOString();
  connection.lastValue = value === undefined ? connection.lastValue : String(value);
  connection.updatedAt = new Date().toISOString();
  writeGatewayStore(store);
  return connection;
}

function findOpcUaConnection(connectionId) {
  const connection = readGatewayStore().opcuaConnections.find((candidate) => candidate.id === connectionId);
  if (!connection) throw notFound("OPC UA connection not found");
  return connection;
}

function loadOpcUaAdapter() {
  try {
    return { available: true, module: require("node-opcua") };
  } catch (error) {
    return { available: false, error };
  }
}

async function handleMqttApi(request, response, parts) {
  if (request.method === "GET" && parts.length === 2) {
    sendJson(response, 200, getMqttServiceStatus());
    return;
  }

  if (request.method === "GET" && parts.length === 3 && parts[2] === "subscriptions") {
    sendJson(response, 200, listMqttSubscriptions());
    return;
  }

  if (request.method === "POST" && parts.length === 3 && parts[2] === "subscriptions") {
    sendJson(response, 201, saveMqttSubscription(await readJsonBody(request)));
    return;
  }

  const subscriptionId = parts[3];
  if (!subscriptionId || parts[2] !== "subscriptions") {
    sendJson(response, 404, { error: "MQTT route not found" });
    return;
  }

  if (request.method === "POST" && parts.length === 5 && parts[4] === "connect") {
    sendJson(response, 200, await connectMqttSubscription(subscriptionId));
    return;
  }

  if (request.method === "POST" && parts.length === 5 && parts[4] === "disconnect") {
    sendJson(response, 200, await disconnectMqttSubscription(subscriptionId));
    return;
  }

  sendJson(response, 404, { error: "MQTT route not found" });
}

function getMqttServiceStatus() {
  const adapter = loadMqttAdapter();
  return {
    service: "mqtt",
    status: adapter.available ? "ready" : "adapter_unavailable",
    adapter: adapter.available ? "mqtt" : "not installed",
    subscriptions: listMqttSubscriptions().length,
    message: adapter.available
      ? "MQTT backend service is ready."
      : "Install mqtt to enable live MQTT subscriptions. Configuration persistence is available.",
  };
}

function listMqttSubscriptions() {
  return readGatewayStore().mqttSubscriptions.map((subscription) => ({
    ...subscription,
    runtimeStatus: mqttRuntimeSubscriptions.has(subscription.id) ? "connected" : subscription.status,
  }));
}

function saveMqttSubscription(body) {
  const brokerUrl = String(body.brokerUrl ?? body.endpoint ?? "").trim();
  const topic = String(body.topic ?? body.sourceAddress ?? "").trim();
  const targetProperty = String(body.targetProperty ?? "").trim();
  const samplingInterval = Number(body.samplingInterval || 1000);
  const qos = Number(body.qos ?? 0);

  if (!["mqtt://", "mqtts://", "ws://", "wss://"].some((prefix) => brokerUrl.startsWith(prefix))) {
    const error = new Error("MQTT broker URL must start with mqtt://, mqtts://, ws:// or wss://");
    error.status = 400;
    throw error;
  }

  if (!topic) {
    const error = new Error("MQTT topic is required");
    error.status = 400;
    throw error;
  }

  const store = readGatewayStore();
  const now = new Date().toISOString();
  const existing = store.mqttSubscriptions.find(
    (subscription) =>
      subscription.brokerUrl === brokerUrl && subscription.topic === topic && subscription.targetProperty === targetProperty,
  );
  const subscription = existing ?? {
    id: crypto.randomUUID(),
    createdAt: now,
    status: "configured",
  };

  Object.assign(subscription, {
    brokerUrl,
    topic,
    targetProperty,
    samplingInterval: Number.isFinite(samplingInterval) ? samplingInterval : 1000,
    qos: [0, 1, 2].includes(qos) ? qos : 0,
    updatedAt: now,
    lastError: "",
  });

  if (!existing) store.mqttSubscriptions.push(subscription);
  writeGatewayStore(store);
  return subscription;
}

async function connectMqttSubscription(subscriptionId) {
  const subscription = findMqttSubscription(subscriptionId);
  const adapter = loadMqttAdapter();
  if (!adapter.available) return updateMqttSubscriptionStatus(subscriptionId, "adapter_unavailable", adapter.error.message);

  const existingRuntime = mqttRuntimeSubscriptions.get(subscriptionId);
  if (existingRuntime) return updateMqttSubscriptionStatus(subscriptionId, "connected", "");

  let client;
  try {
    client = adapter.module.connect(subscription.brokerUrl, {
      connectTimeout: 7000,
      reconnectPeriod: 0,
    });
    await waitForMqttConnect(client);
    await subscribeMqttTopic(client, subscription);
    mqttRuntimeSubscriptions.set(subscriptionId, { client, connectedAt: new Date().toISOString() });
    attachMqttRuntimeHandlers(subscriptionId, client);
    return updateMqttSubscriptionStatus(subscriptionId, "connected", "");
  } catch (error) {
    if (client) {
      try {
        client.end(true);
      } catch {
        // Closing a failed MQTT client is best-effort cleanup.
      }
    }
    mqttRuntimeSubscriptions.delete(subscriptionId);
    return updateMqttSubscriptionStatus(subscriptionId, "error", error.message);
  }
}

async function disconnectMqttSubscription(subscriptionId) {
  const runtime = mqttRuntimeSubscriptions.get(subscriptionId);
  if (runtime) {
    mqttRuntimeSubscriptions.delete(subscriptionId);
    try {
      await endMqttClient(runtime.client);
    } catch {
      // Runtime cleanup should not hide the requested disconnected state.
    }
  }
  return updateMqttSubscriptionStatus(subscriptionId, "disconnected", "");
}

function waitForMqttConnect(client) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => finish(new Error("MQTT connect timeout")), 8000);

    function finish(error) {
      clearTimeout(timeout);
      client.off("connect", onConnect);
      client.off("error", onError);
      if (error) reject(error);
      else resolve();
    }

    function onConnect() {
      finish();
    }

    function onError(error) {
      finish(error);
    }

    client.once("connect", onConnect);
    client.once("error", onError);
  });
}

function subscribeMqttTopic(client, subscription) {
  return new Promise((resolve, reject) => {
    client.subscribe(subscription.topic, { qos: subscription.qos }, (error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

function endMqttClient(client) {
  return new Promise((resolve) => {
    client.end(true, {}, resolve);
  });
}

function attachMqttRuntimeHandlers(subscriptionId, client) {
  client.on("message", (topic, message) => {
    try {
      updateMqttSubscriptionStatus(subscriptionId, "connected", "", message.toString("utf8"), topic);
    } catch {
      // Runtime event handlers should not crash the server for stale subscriptions.
    }
  });

  client.on("error", (error) => {
    try {
      updateMqttSubscriptionStatus(subscriptionId, "error", error.message);
    } catch {
      // Runtime event handlers should not crash the server for stale subscriptions.
    }
  });

  client.on("close", () => {
    const runtime = mqttRuntimeSubscriptions.get(subscriptionId);
    if (runtime?.client !== client) return;
    mqttRuntimeSubscriptions.delete(subscriptionId);
    try {
      updateMqttSubscriptionStatus(subscriptionId, "disconnected", "");
    } catch {
      // Runtime event handlers should not crash the server for stale subscriptions.
    }
  });
}

function updateMqttSubscriptionStatus(subscriptionId, status, errorMessage = "", message, topic) {
  const store = readGatewayStore();
  const subscription = store.mqttSubscriptions.find((candidate) => candidate.id === subscriptionId);
  if (!subscription) throw notFound("MQTT subscription not found");
  subscription.status = status;
  subscription.lastError = errorMessage;
  subscription.lastMessageAt = message === undefined ? subscription.lastMessageAt : new Date().toISOString();
  subscription.lastMessage = message === undefined ? subscription.lastMessage : String(message);
  subscription.lastTopic = topic === undefined ? subscription.lastTopic : String(topic);
  subscription.updatedAt = new Date().toISOString();
  writeGatewayStore(store);
  return subscription;
}

function findMqttSubscription(subscriptionId) {
  const subscription = readGatewayStore().mqttSubscriptions.find((candidate) => candidate.id === subscriptionId);
  if (!subscription) throw notFound("MQTT subscription not found");
  return subscription;
}

function loadMqttAdapter() {
  try {
    return { available: true, module: require("mqtt") };
  } catch (error) {
    return { available: false, error };
  }
}

function saveAasVersion(body, role = "editor") {
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
      role,
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

function requireRepositoryWriteAccess(request) {
  const role = getRepositoryRole(request);
  if (!writeRoles.has(role)) {
    const error = new Error(`Repository role "${role}" is read-only`);
    error.status = 403;
    throw error;
  }
  return role;
}

function getRepositoryRole(request) {
  const role = String(request.headers["x-workbench-role"] || "editor").trim().toLowerCase();
  return repositoryRoles.has(role) ? role : "viewer";
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

function ensureGatewayStore() {
  fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(gatewayPath)) {
    writeGatewayStore({ opcuaConnections: [], mqttSubscriptions: [] });
  }
}

function readRepository() {
  ensureRepository();
  return JSON.parse(fs.readFileSync(repositoryPath, "utf8"));
}

function writeRepository(repository) {
  fs.writeFileSync(repositoryPath, `${JSON.stringify(repository, null, 2)}\n`);
}

function readGatewayStore() {
  ensureGatewayStore();
  const store = JSON.parse(fs.readFileSync(gatewayPath, "utf8"));
  return {
    opcuaConnections: Array.isArray(store.opcuaConnections) ? store.opcuaConnections : [],
    mqttSubscriptions: Array.isArray(store.mqttSubscriptions) ? store.mqttSubscriptions : [],
  };
}

function writeGatewayStore(store) {
  fs.writeFileSync(gatewayPath, `${JSON.stringify(store, null, 2)}\n`);
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
