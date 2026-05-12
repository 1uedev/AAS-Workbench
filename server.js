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
const gatewayStreamClients = new Set();

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

  if (parts[1] === "gateway") {
    handleGatewayApi(request, response, parts);
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

  if (parts[1] === "rest") {
    await handleRestApi(request, response, parts);
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

function handleGatewayApi(request, response, parts) {
  if (request.method === "GET" && parts.length === 3 && parts[2] === "stream") {
    startGatewayStream(request, response);
    return;
  }

  if (request.method === "GET" && parts.length === 2) {
    sendJson(response, 200, getGatewayServiceStatus());
    return;
  }

  sendJson(response, 404, { error: "Gateway route not found" });
}

function startGatewayStream(request, response) {
  response.writeHead(200, {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  response.write("retry: 2000\n\n");
  gatewayStreamClients.add(response);
  sendGatewayStreamSnapshot(response);

  const heartbeat = setInterval(() => {
    sendGatewayStreamSnapshot(response);
  }, 2500);

  request.on("close", () => {
    clearInterval(heartbeat);
    gatewayStreamClients.delete(response);
  });
}

function sendGatewayStreamSnapshot(response) {
  if (response.destroyed) return;
  try {
    response.write("event: gateway\n");
    response.write(`data: ${JSON.stringify(getGatewayServiceStatus())}\n\n`);
  } catch {
    gatewayStreamClients.delete(response);
  }
}

function broadcastGatewaySnapshot() {
  for (const client of gatewayStreamClients) {
    sendGatewayStreamSnapshot(client);
  }
}

function getGatewayServiceStatus() {
  const opcua = getOpcUaServiceStatus();
  const mqtt = getMqttServiceStatus();
  const rest = getRestServiceStatus();
  const opcuaConnections = listOpcUaConnections();
  const mqttSubscriptions = listMqttSubscriptions();
  const restEndpoints = listRestEndpoints();
  const opcuaRuntime = summarizeGatewayItems(opcuaConnections);
  const mqttRuntime = summarizeGatewayItems(mqttSubscriptions);
  const restRuntime = summarizeGatewayItems(restEndpoints);
  const runtime = mergeGatewaySummaries([opcuaRuntime, mqttRuntime, restRuntime]);
  const missingAdapters = [
    opcua.adapter === "not installed" ? "OPC UA" : "",
    mqtt.adapter === "not installed" ? "MQTT" : "",
  ].filter(Boolean);

  return {
    service: "gateway",
    status: deriveGatewayStatus(runtime),
    updatedAt: new Date().toISOString(),
    message: buildGatewayStatusMessage(runtime, missingAdapters),
    totals: {
      mappings: runtime.total,
      active: runtime.connected,
      attention: runtime.attention,
      configured: runtime.configured,
      disconnected: runtime.disconnected,
    },
    protocols: {
      opcua: {
        adapter: opcua.adapter,
        status: opcua.status,
        mappings: opcuaConnections.length,
        runtime: opcuaRuntime,
      },
      mqtt: {
        adapter: mqtt.adapter,
        status: mqtt.status,
        mappings: mqttSubscriptions.length,
        runtime: mqttRuntime,
      },
      rest: {
        adapter: rest.adapter,
        status: rest.status,
        mappings: restEndpoints.length,
        runtime: restRuntime,
      },
    },
    recentValues: [
      ...opcuaConnections
        .filter((connection) => connection.lastValue !== undefined)
        .map((connection) => ({
          protocol: "OPC UA",
          label: connection.targetProperty || connection.nodeId,
          source: connection.nodeId,
          value: connection.lastValue,
          receivedAt: connection.lastReadAt || "",
        })),
      ...mqttSubscriptions
        .filter((subscription) => subscription.lastMessage !== undefined)
        .map((subscription) => ({
          protocol: "MQTT",
          label: subscription.targetProperty || subscription.topic,
          source: subscription.lastTopic || subscription.topic,
          value: subscription.lastMessage,
          receivedAt: subscription.lastMessageAt || "",
        })),
      ...restEndpoints
        .filter((endpoint) => endpoint.lastValue !== undefined)
        .map((endpoint) => ({
          protocol: "REST API",
          label: endpoint.targetProperty || endpoint.valuePath || endpoint.url,
          source: endpoint.valuePath ? `${endpoint.url} -> ${endpoint.valuePath}` : endpoint.url,
          value: endpoint.lastValue,
          receivedAt: endpoint.lastReadAt || "",
        })),
    ]
      .sort((a, b) => String(b.receivedAt).localeCompare(String(a.receivedAt)))
      .slice(0, 5),
  };
}

function summarizeGatewayItems(items) {
  return items.reduce(
    (summary, item) => {
      const status = item.runtimeStatus || item.status || "configured";
      summary.total += 1;
      summary.byStatus[status] = (summary.byStatus[status] || 0) + 1;
      if (status === "connected") summary.connected += 1;
      if (status === "configured") summary.configured += 1;
      if (status === "disconnected") summary.disconnected += 1;
      if (status === "error" || status === "adapter_unavailable") summary.attention += 1;
      return summary;
    },
    {
      total: 0,
      connected: 0,
      configured: 0,
      disconnected: 0,
      attention: 0,
      byStatus: {},
    },
  );
}

function mergeGatewaySummaries(summaries) {
  return summaries.reduce(
    (merged, summary) => {
      for (const key of ["total", "connected", "configured", "disconnected", "attention"]) {
        merged[key] += summary[key] || 0;
      }
      for (const [status, count] of Object.entries(summary.byStatus)) {
        merged.byStatus[status] = (merged.byStatus[status] || 0) + count;
      }
      return merged;
    },
    {
      total: 0,
      connected: 0,
      configured: 0,
      disconnected: 0,
      attention: 0,
      byStatus: {},
    },
  );
}

function deriveGatewayStatus(runtime) {
  if (runtime.total === 0) return "empty";
  if (runtime.connected === runtime.total) return "connected";
  if (runtime.connected > 0 && runtime.attention > 0) return "degraded";
  if (runtime.connected > 0) return "partial";
  if (runtime.attention > 0) return "attention";
  return "configured";
}

function buildGatewayStatusMessage(runtime, missingAdapters) {
  if (runtime.total === 0) return "No gateway mappings are configured yet.";
  const base = `${runtime.total} mappings configured, ${runtime.connected} active, ${runtime.attention} need attention.`;
  if (missingAdapters.length === 0) return base;
  return `${base} Missing optional adapters: ${missingAdapters.join(", ")}.`;
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

  if (request.method === "POST" && parts.length === 5 && parts[4] === "write") {
    sendJson(response, 200, await writeOpcUaConnection(connectionId, await readJsonBody(request)));
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
  const writeEnabled = parseWriteEnabled(body.writeEnabled);

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
    writeEnabled,
    updatedAt: now,
    lastError: "",
  });

  if (!existing) store.opcuaConnections.push(connection);
  writeGatewayStore(store);
  broadcastGatewaySnapshot();
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

async function writeOpcUaConnection(connectionId, body) {
  const connection = findOpcUaConnection(connectionId);
  const value = requireSafeWrite(connection, body, "OPC UA");
  const adapter = loadOpcUaAdapter();
  if (!adapter.available) return updateOpcUaConnectionStatus(connectionId, "adapter_unavailable", adapter.error.message);

  let runtime = opcUaRuntimeConnections.get(connectionId);
  if (!runtime) {
    const connected = await connectOpcUaConnection(connectionId);
    if (connected.status !== "connected") return connected;
    runtime = opcUaRuntimeConnections.get(connectionId);
  }

  try {
    const valueType = body.valueType || inferWriteValueType(value);
    const statusCode = await runtime.session.write({
      nodeId: connection.nodeId,
      attributeId: adapter.module.AttributeIds.Value,
      value: {
        value: createOpcUaVariant(adapter, value, valueType),
      },
    });

    if (statusCode?.isNotGood?.()) {
      throw new Error(`OPC UA write failed with status ${statusCode.toString()}`);
    }

    return updateOpcUaConnectionWrite(connectionId, value, valueType, statusCode?.toString?.() || "Good");
  } catch (error) {
    return updateOpcUaConnectionStatus(connectionId, "error", error.message);
  }
}

function createOpcUaVariant(adapter, value, valueType) {
  const type = String(valueType || "string").toLowerCase();
  const { DataType, Variant } = adapter.module;

  if (type === "boolean" || type === "bool" || type === "xs:boolean") {
    return new Variant({ dataType: DataType.Boolean, value: value === true || value === "true" || value === "1" });
  }

  if (type === "integer" || type === "int" || type === "int32" || type === "xs:integer" || type === "xs:int") {
    const parsed = Number(value);
    if (!Number.isInteger(parsed)) throw new Error("OPC UA integer write requires an integer value");
    return new Variant({ dataType: DataType.Int32, value: parsed });
  }

  if (type === "float" || type === "single" || type === "xs:float") {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) throw new Error("OPC UA float write requires a numeric value");
    return new Variant({ dataType: DataType.Float, value: parsed });
  }

  if (type === "double" || type === "number" || type === "xs:double") {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) throw new Error("OPC UA double write requires a numeric value");
    return new Variant({ dataType: DataType.Double, value: parsed });
  }

  return new Variant({ dataType: DataType.String, value: String(value) });
}

function inferWriteValueType(value) {
  const text = String(value).trim();
  if (text === "true" || text === "false") return "boolean";
  if (/^-?\d+$/.test(text)) return "integer";
  if (/^-?\d+\.\d+$/.test(text)) return "double";
  return "string";
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
  broadcastGatewaySnapshot();
  return connection;
}

function updateOpcUaConnectionWrite(connectionId, value, valueType, writeStatus) {
  const store = readGatewayStore();
  const connection = store.opcuaConnections.find((candidate) => candidate.id === connectionId);
  if (!connection) throw notFound("OPC UA connection not found");
  connection.status = "connected";
  connection.lastError = "";
  connection.lastWriteAt = new Date().toISOString();
  connection.lastWriteValue = String(value);
  connection.lastWriteType = String(valueType);
  connection.lastWriteStatus = writeStatus;
  connection.updatedAt = new Date().toISOString();
  writeGatewayStore(store);
  broadcastGatewaySnapshot();
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

  if (request.method === "POST" && parts.length === 5 && parts[4] === "publish") {
    sendJson(response, 200, await publishMqttSubscription(subscriptionId, await readJsonBody(request)));
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
  const writeEnabled = parseWriteEnabled(body.writeEnabled);

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
    writeEnabled,
    updatedAt: now,
    lastError: "",
  });

  if (!existing) store.mqttSubscriptions.push(subscription);
  writeGatewayStore(store);
  broadcastGatewaySnapshot();
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

async function publishMqttSubscription(subscriptionId, body) {
  const subscription = findMqttSubscription(subscriptionId);
  const value = requireSafeWrite(subscription, body, "MQTT");

  if (subscription.topic.includes("+") || subscription.topic.includes("#")) {
    const error = new Error("MQTT write-back requires an exact topic without + or # wildcards");
    error.status = 400;
    throw error;
  }

  const adapter = loadMqttAdapter();
  if (!adapter.available) return updateMqttSubscriptionStatus(subscriptionId, "adapter_unavailable", adapter.error.message);

  let runtime = mqttRuntimeSubscriptions.get(subscriptionId);
  if (!runtime) {
    const connected = await connectMqttSubscription(subscriptionId);
    if (connected.status !== "connected") return connected;
    runtime = mqttRuntimeSubscriptions.get(subscriptionId);
  }

  try {
    await publishMqttMessage(runtime.client, subscription, value);
    return updateMqttSubscriptionWrite(subscriptionId, value);
  } catch (error) {
    return updateMqttSubscriptionStatus(subscriptionId, "error", error.message);
  }
}

function publishMqttMessage(client, subscription, value) {
  return new Promise((resolve, reject) => {
    client.publish(subscription.topic, String(value), { qos: subscription.qos, retain: false }, (error) => {
      if (error) reject(error);
      else resolve();
    });
  });
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
  broadcastGatewaySnapshot();
  return subscription;
}

function updateMqttSubscriptionWrite(subscriptionId, value) {
  const store = readGatewayStore();
  const subscription = store.mqttSubscriptions.find((candidate) => candidate.id === subscriptionId);
  if (!subscription) throw notFound("MQTT subscription not found");
  subscription.status = "connected";
  subscription.lastError = "";
  subscription.lastWriteAt = new Date().toISOString();
  subscription.lastWriteValue = String(value);
  subscription.updatedAt = new Date().toISOString();
  writeGatewayStore(store);
  broadcastGatewaySnapshot();
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

async function handleRestApi(request, response, parts) {
  if (request.method === "GET" && parts.length === 2) {
    sendJson(response, 200, getRestServiceStatus());
    return;
  }

  if (request.method === "GET" && parts.length === 3 && parts[2] === "endpoints") {
    sendJson(response, 200, listRestEndpoints());
    return;
  }

  if (request.method === "POST" && parts.length === 3 && parts[2] === "endpoints") {
    sendJson(response, 201, saveRestEndpoint(await readJsonBody(request)));
    return;
  }

  const endpointId = parts[3];
  if (!endpointId || parts[2] !== "endpoints") {
    sendJson(response, 404, { error: "REST route not found" });
    return;
  }

  if (request.method === "POST" && parts.length === 5 && parts[4] === "read") {
    sendJson(response, 200, await readRestEndpoint(endpointId));
    return;
  }

  if (request.method === "POST" && parts.length === 5 && parts[4] === "write") {
    sendJson(response, 200, await writeRestEndpoint(endpointId, await readJsonBody(request)));
    return;
  }

  sendJson(response, 404, { error: "REST route not found" });
}

function getRestServiceStatus() {
  const available = typeof fetch === "function";
  return {
    service: "rest",
    status: available ? "ready" : "adapter_unavailable",
    adapter: available ? "built-in fetch" : "not available",
    endpoints: listRestEndpoints().length,
    message: available
      ? "REST API backend service is ready."
      : "REST API backend requires a Node runtime with global fetch.",
  };
}

function listRestEndpoints() {
  return readGatewayStore().restEndpoints.map((endpoint) => ({
    ...endpoint,
    runtimeStatus: endpoint.status,
  }));
}

function saveRestEndpoint(body) {
  const url = normalizeRestUrl(body.url ?? body.endpoint ?? "");
  const valuePath = String(body.valuePath ?? body.sourceAddress ?? "").trim();
  const targetProperty = String(body.targetProperty ?? "").trim();
  const samplingInterval = Number(body.samplingInterval || 1000);
  const writeEnabled = parseWriteEnabled(body.writeEnabled);

  if (!valuePath) {
    const error = new Error("REST value path is required");
    error.status = 400;
    throw error;
  }

  const store = readGatewayStore();
  const now = new Date().toISOString();
  const existing = store.restEndpoints.find(
    (endpoint) => endpoint.url === url && endpoint.valuePath === valuePath && endpoint.targetProperty === targetProperty,
  );
  const endpoint = existing ?? {
    id: crypto.randomUUID(),
    createdAt: now,
    status: "configured",
  };

  Object.assign(endpoint, {
    url,
    valuePath,
    targetProperty,
    samplingInterval: Number.isFinite(samplingInterval) ? samplingInterval : 1000,
    readMethod: "GET",
    writeMethod: endpoint.writeMethod || "POST",
    writeEnabled,
    updatedAt: now,
    lastError: "",
  });

  if (!existing) store.restEndpoints.push(endpoint);
  writeGatewayStore(store);
  broadcastGatewaySnapshot();
  return endpoint;
}

async function readRestEndpoint(endpointId) {
  const endpoint = findRestEndpoint(endpointId);
  if (typeof fetch !== "function") {
    return updateRestEndpointStatus(endpointId, "adapter_unavailable", "Global fetch is not available in this Node runtime.");
  }

  try {
    const response = await fetchRestUrl(endpoint.url, { method: "GET", acceptJson: true });
    if (!response.ok) throw new Error(`REST read failed with HTTP ${response.status}`);
    const payload = await parseRestResponse(response);
    const value = extractRestValue(payload, endpoint.valuePath);
    return updateRestEndpointStatus(endpointId, "connected", "", value);
  } catch (error) {
    return updateRestEndpointStatus(endpointId, "error", restErrorMessage(error));
  }
}

async function writeRestEndpoint(endpointId, body) {
  const endpoint = findRestEndpoint(endpointId);
  const value = requireSafeWrite(endpoint, body, "REST");
  const method = normalizeRestWriteMethod(body.method || body.writeMethod || endpoint.writeMethod || "POST");
  if (typeof fetch !== "function") {
    return updateRestEndpointStatus(endpointId, "adapter_unavailable", "Global fetch is not available in this Node runtime.");
  }

  try {
    const response = await fetchRestUrl(endpoint.url, {
      method,
      acceptJson: true,
      body: JSON.stringify({
        value,
        targetProperty: endpoint.targetProperty,
        valuePath: endpoint.valuePath,
      }),
    });
    if (!response.ok) throw new Error(`REST write failed with HTTP ${response.status}`);
    return updateRestEndpointWrite(endpointId, value, method, response.status);
  } catch (error) {
    return updateRestEndpointStatus(endpointId, "error", restErrorMessage(error));
  }
}

async function fetchRestUrl(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  const headers = options.acceptJson ? { Accept: "application/json" } : {};
  if (options.body !== undefined) headers["Content-Type"] = "application/json";

  try {
    return await fetch(url, {
      method: options.method || "GET",
      headers,
      body: options.body,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function parseRestResponse(response) {
  const contentType = response.headers.get("content-type") || "";
  const text = await response.text();
  if (!text) return null;
  if (contentType.includes("json")) return JSON.parse(text);

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function extractRestValue(payload, valuePath) {
  const pathSegments = String(valuePath || "")
    .split(".")
    .map((segment) => segment.trim())
    .filter(Boolean);
  let current = payload;

  for (const segment of pathSegments) {
    if (current === null || current === undefined) throw new Error(`REST value path not found: ${valuePath}`);
    const key = Array.isArray(current) && /^\d+$/.test(segment) ? Number(segment) : segment;
    if (!Object.prototype.hasOwnProperty.call(Object(current), key)) {
      throw new Error(`REST value path not found: ${valuePath}`);
    }
    current = current[key];
  }

  return current;
}

function normalizeRestUrl(value) {
  try {
    const url = new URL(String(value || "").trim());
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new Error();
    }
    return url.toString();
  } catch {
    const error = new Error("REST URL must start with http:// or https://");
    error.status = 400;
    throw error;
  }
}

function normalizeRestWriteMethod(method) {
  const normalized = String(method || "POST").trim().toUpperCase();
  if (["POST", "PUT", "PATCH"].includes(normalized)) return normalized;
  const error = new Error("REST write method must be POST, PUT or PATCH");
  error.status = 400;
  throw error;
}

function updateRestEndpointStatus(endpointId, status, errorMessage = "", value) {
  const store = readGatewayStore();
  const endpoint = store.restEndpoints.find((candidate) => candidate.id === endpointId);
  if (!endpoint) throw notFound("REST endpoint not found");
  endpoint.status = status;
  endpoint.lastError = errorMessage;
  endpoint.lastReadAt = value === undefined ? endpoint.lastReadAt : new Date().toISOString();
  endpoint.lastValue = value === undefined ? endpoint.lastValue : formatGatewayValue(value);
  endpoint.updatedAt = new Date().toISOString();
  writeGatewayStore(store);
  broadcastGatewaySnapshot();
  return endpoint;
}

function updateRestEndpointWrite(endpointId, value, method, statusCode) {
  const store = readGatewayStore();
  const endpoint = store.restEndpoints.find((candidate) => candidate.id === endpointId);
  if (!endpoint) throw notFound("REST endpoint not found");
  endpoint.status = "connected";
  endpoint.lastError = "";
  endpoint.lastWriteAt = new Date().toISOString();
  endpoint.lastWriteValue = String(value);
  endpoint.lastWriteMethod = method;
  endpoint.lastWriteStatus = String(statusCode);
  endpoint.updatedAt = new Date().toISOString();
  writeGatewayStore(store);
  broadcastGatewaySnapshot();
  return endpoint;
}

function findRestEndpoint(endpointId) {
  const endpoint = readGatewayStore().restEndpoints.find((candidate) => candidate.id === endpointId);
  if (!endpoint) throw notFound("REST endpoint not found");
  return endpoint;
}

function formatGatewayValue(value) {
  if (value === undefined) return "";
  if (value === null) return "null";
  return typeof value === "object" ? JSON.stringify(value) : String(value);
}

function restErrorMessage(error) {
  return error.name === "AbortError" ? "REST request timed out" : error.message;
}

function parseWriteEnabled(value) {
  return value === true || value === "true" || value === "on" || value === "1";
}

function requireSafeWrite(target, body, protocol) {
  if (!target.writeEnabled) {
    const error = new Error(`${protocol} write-back is disabled for this mapping`);
    error.status = 403;
    throw error;
  }

  if (body?.confirmWrite !== true) {
    const error = new Error(`${protocol} write-back requires explicit confirmation`);
    error.status = 400;
    throw error;
  }

  const value = body.value;
  if (value === undefined || value === null || String(value).trim() === "") {
    const error = new Error(`${protocol} write-back value is required`);
    error.status = 400;
    throw error;
  }

  if (String(value).length > 512) {
    const error = new Error(`${protocol} write-back value exceeds 512 characters`);
    error.status = 400;
    throw error;
  }

  return String(value);
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
  const assetKind = shell.assetInformation?.assetKind || "Instance";
  const typeAasId = getReferenceValue(shell.derivedFrom);
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
  asset.assetKind = assetKind;
  asset.typeAasId = typeAasId;
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
      assetKind,
      typeAasId,
    },
  });

  writeRepository(repository);
  return {
    id: asset.id,
    globalAssetId: asset.globalAssetId,
    idShort: asset.idShort,
    assetKind: asset.assetKind,
    typeAasId: asset.typeAasId,
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
    assetKind: asset.assetKind,
    typeAasId: asset.typeAasId,
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

function getReferenceValue(reference) {
  return Array.isArray(reference?.keys) ? reference.keys.at(-1)?.value || "" : "";
}

function versionResponse(asset, version) {
  return {
    asset: {
      id: asset.id,
      globalAssetId: asset.globalAssetId,
      idShort: asset.idShort,
      assetKind: asset.assetKind,
      typeAasId: asset.typeAasId,
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
    writeGatewayStore({ opcuaConnections: [], mqttSubscriptions: [], restEndpoints: [] });
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
    restEndpoints: Array.isArray(store.restEndpoints) ? store.restEndpoints : [],
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
