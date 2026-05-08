import { createAasxBlob } from "./aasx-export.js";
import { readAasxPackage } from "./aasx-import.js";

const fileInput = document.querySelector("#fileInput");
const dropZone = document.querySelector(".drop-zone");
const loadSampleButton = document.querySelector("#loadSampleButton");
const downloadButton = document.querySelector("#downloadButton");
const downloadAasxButton = document.querySelector("#downloadAasxButton");
const statusLabel = document.querySelector("#statusLabel");
const summaryText = document.querySelector("#summaryText");
const stats = document.querySelector("#stats");
const issuesList = document.querySelector("#issuesList");
const explorer = document.querySelector("#explorer");
const searchInput = document.querySelector("#searchInput");
const mappingDialog = document.querySelector("#mappingDialog");
const mappingForm = document.querySelector("#mappingForm");
const mappingFields = document.querySelector("#mappingFields");
const mappingPreview = document.querySelector("#mappingPreview");
const mappingSummary = document.querySelector("#mappingSummary");
const closeMappingButton = document.querySelector("#closeMappingButton");
const cancelMappingButton = document.querySelector("#cancelMappingButton");
const manualGeneratorForm = document.querySelector("#manualGeneratorForm");
const submodelBuilder = document.querySelector("#submodelBuilder");
const addSubmodelButton = document.querySelector("#addSubmodelButton");
const gatewayForm = document.querySelector("#gatewayForm");
const repositoryForm = document.querySelector("#repositoryForm");
const repositoryReason = document.querySelector("#repositoryReason");
const saveRepositoryButton = document.querySelector("#saveRepositoryButton");
const refreshRepositoryButton = document.querySelector("#refreshRepositoryButton");
const repositoryStatus = document.querySelector("#repositoryStatus");
const repositoryList = document.querySelector("#repositoryList");
const routeLinks = [...document.querySelectorAll("[data-route-link]")];

let currentPackage = null;
let currentFileName = "aas-export";
let pendingTableImport = null;
let gatewayMappingCounter = 1;
let submodelCounter = 1;
let propertyCounter = 1;
let repositoryAssets = [];

const targetColumns = [
  { key: "assetId", label: "Asset ID", required: true, aliases: ["assetid", "asset id", "globalassetid", "global asset id"] },
  { key: "assetName", label: "Asset Name", required: true, aliases: ["assetname", "asset name", "name", "asset"] },
  { key: "submodelId", label: "Submodel ID", required: true, aliases: ["submodelid", "submodel id", "submodel"] },
  { key: "submodelName", label: "Submodel Name", required: true, aliases: ["submodelname", "submodel name"] },
  { key: "idShort", label: "Property idShort", required: true, aliases: ["idshort", "property", "propertyid", "property name"] },
  { key: "valueType", label: "Value Type", required: true, aliases: ["valuetype", "value type", "type", "datatype", "data type"] },
  { key: "value", label: "Value", required: true, aliases: ["value", "wert"] },
  { key: "semanticId", label: "Semantic ID", required: false, aliases: ["semanticid", "semantic id", "irdi", "concept"] },
  { key: "unit", label: "Unit", required: false, aliases: ["unit", "einheit", "uom"] },
];

const sampleCsv = `assetId,assetName,submodelId,submodelName,idShort,valueType,value,semanticId,unit
urn:example:asset:Pump-001,Pump 001,urn:example:submodel:Pump-001:TechnicalData,Technical Data,Manufacturer,string,ACME Industrial,https://admin-shell.io/idta/Manufacturer,
urn:example:asset:Pump-001,Pump 001,urn:example:submodel:Pump-001:TechnicalData,Technical Data,NominalPower,double,7.5,https://admin-shell.io/idta/NominalPower,kW
urn:example:asset:Pump-001,Pump 001,urn:example:submodel:Pump-001:OperationalData,Operational Data,OperatingHours,integer,1840,https://admin-shell.io/idta/OperatingHours,h
urn:example:asset:Pump-001,Pump 001,urn:example:submodel:Pump-001:OperationalData,Operational Data,Status,string,Running,https://admin-shell.io/idta/Status,`;

window.addEventListener("hashchange", applyRoute);
applyRoute();
addSubmodelEditor({
  idShort: "TechnicalData",
  properties: [
    {
      idShort: "Manufacturer",
      valueType: "string",
      value: "ACME Industrial",
      semanticId: "https://admin-shell.io/idta/Manufacturer",
      unit: "",
    },
  ],
});

fileInput.addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  await importSelectedFile(file);
  fileInput.value = "";
});

dropZone.addEventListener("dragenter", (event) => {
  event.preventDefault();
  dropZone.classList.add("is-dragging");
});

dropZone.addEventListener("dragover", (event) => {
  event.preventDefault();
  event.dataTransfer.dropEffect = "copy";
  dropZone.classList.add("is-dragging");
});

dropZone.addEventListener("dragleave", (event) => {
  if (!dropZone.contains(event.relatedTarget)) {
    dropZone.classList.remove("is-dragging");
  }
});

dropZone.addEventListener("drop", async (event) => {
  event.preventDefault();
  dropZone.classList.remove("is-dragging");
  await importSelectedFile(event.dataTransfer.files?.[0]);
});

async function importSelectedFile(file) {
  if (!file) return;

  currentFileName = file.name.replace(/\.[^.]+$/, "") || "aas-export";
  const lowerName = file.name.toLowerCase();

  try {
    if (lowerName.endsWith(".csv")) {
      openMappingDialog(parseCsv(await file.text()), "CSV-Datei");
    } else if (lowerName.endsWith(".xlsx")) {
      openMappingDialog(await parseXlsx(await file.arrayBuffer()), "Excel-Datei");
    } else if (lowerName.endsWith(".aasx")) {
      loadPackage(normalizeAasJson(await readAasxPackage(await file.arrayBuffer())));
      navigateTo("explorer");
    } else {
      loadPackage(normalizeAasJson(JSON.parse(await file.text())));
      navigateTo("explorer");
    }
  } catch (error) {
    renderError(error);
  }
}

loadSampleButton.addEventListener("click", () => {
  currentFileName = "sample-aas";
  loadPackage(rowsToAasPackage(parseCsv(sampleCsv)));
  navigateTo("explorer");
});

downloadButton.addEventListener("click", () => {
  if (!currentPackage) return;
  downloadBlob(
    new Blob([JSON.stringify(currentPackage, null, 2)], { type: "application/json" }),
    `${currentFileName}.json`,
  );
});

downloadAasxButton.addEventListener("click", () => {
  if (!currentPackage) return;
  downloadBlob(createAasxBlob(currentPackage), `${currentFileName}.aasx`);
});

searchInput.addEventListener("input", () => {
  if (currentPackage) renderExplorer(currentPackage, searchInput.value);
});

repositoryForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  await saveCurrentPackageToRepository();
});

refreshRepositoryButton.addEventListener("click", refreshRepository);

repositoryList.addEventListener("click", async (event) => {
  const loadVersionButton = event.target.closest("[data-action='load-version']");
  if (!loadVersionButton) return;
  await loadRepositoryVersion(loadVersionButton.dataset.assetId, loadVersionButton.dataset.version);
});

manualGeneratorForm.addEventListener("submit", (event) => {
  event.preventDefault();
  try {
    const aasPackage = buildPackageFromGenerator();
    const formData = new FormData(manualGeneratorForm);
    currentFileName = toIdShort(formData.get("assetName") || formData.get("assetId") || "generated-aas").toLowerCase();
    loadPackage(aasPackage);
    navigateTo("explorer");
  } catch (error) {
    renderError(error);
  }
});

addSubmodelButton.addEventListener("click", () => addSubmodelEditor());

submodelBuilder.addEventListener("click", (event) => {
  const addPropertyButton = event.target.closest("[data-action='add-property']");
  if (addPropertyButton) {
    addPropertyEditor(addPropertyButton.closest(".submodel-editor").querySelector(".property-list"));
    return;
  }

  const removePropertyButton = event.target.closest("[data-action='remove-property']");
  if (removePropertyButton) {
    const propertyEditor = removePropertyButton.closest(".property-editor");
    const propertyList = propertyEditor.closest(".property-list");
    if (propertyList.querySelectorAll(".property-editor").length > 1) {
      propertyEditor.remove();
    }
    return;
  }

  const removeSubmodelButton = event.target.closest("[data-action='remove-submodel']");
  if (removeSubmodelButton && submodelBuilder.querySelectorAll(".submodel-editor").length > 1) {
    removeSubmodelButton.closest(".submodel-editor").remove();
  }
});

gatewayForm.addEventListener("submit", (event) => {
  event.preventDefault();
  try {
    const mapping = Object.fromEntries(new FormData(gatewayForm).entries());
    addGatewayMapping(mapping);
  } catch (error) {
    renderError(error);
  }
});

mappingForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!pendingTableImport) return;

  const formData = new FormData(mappingForm);
  const mapping = Object.fromEntries(targetColumns.map((column) => [column.key, formData.get(column.key)]));
  const missing = targetColumns
    .filter((column) => column.required && mapping[column.key] === "")
    .map((column) => column.label);

  if (missing.length > 0) {
    renderError(new Error(`Bitte Pflichtfelder zuordnen: ${missing.join(", ")}`));
    return;
  }

  loadPackage(rowsToAasPackage(pendingTableImport.rows, mapping));
  mappingDialog.close();
  pendingTableImport = null;
});

closeMappingButton.addEventListener("click", closeMappingDialog);
cancelMappingButton.addEventListener("click", closeMappingDialog);

function applyRoute() {
  const route = getRoute();
  document.body.dataset.route = route;
  routeLinks.forEach((link) => {
    link.classList.toggle("active", link.dataset.routeLink === route);
  });
}

function getRoute() {
  const route = window.location.hash.replace("#", "") || "home";
  return ["home", "import", "generator", "gateway", "repository", "explorer"].includes(route) ? route : "home";
}

function navigateTo(route) {
  if (getRoute() === route) {
    applyRoute();
  } else {
    window.location.hash = route;
  }
}

function closeMappingDialog() {
  pendingTableImport = null;
  mappingDialog.close();
}

function addSubmodelEditor(seed = {}) {
  const submodelIndex = submodelCounter;
  submodelCounter += 1;
  const submodel = document.createElement("section");
  submodel.className = "submodel-editor";
  submodel.dataset.submodelIndex = String(submodelIndex);
  submodel.innerHTML = `
    <div class="submodel-editor-header">
      <h3>Submodel</h3>
      <button class="secondary-button" type="button" data-action="remove-submodel">Entfernen</button>
    </div>
    <div class="form-grid">
      <label class="field">
        <span>Submodel ID</span>
        <input data-field="submodelId" placeholder="urn:example:submodel:Pump-001:TechnicalData" />
      </label>
      <label class="field">
        <span>Submodel Name</span>
        <input data-field="submodelName" required placeholder="Technical Data" />
      </label>
    </div>
    <div class="property-list"></div>
    <div class="action-row">
      <button class="secondary-button" type="button" data-action="add-property">Property hinzufügen</button>
    </div>
  `;

  submodel.querySelector("[data-field='submodelName']").value = seed.idShort ?? "";
  submodel.querySelector("[data-field='submodelId']").value = seed.id ?? "";
  submodelBuilder.append(submodel);

  const propertyList = submodel.querySelector(".property-list");
  const properties = seed.properties?.length ? seed.properties : [{}];
  properties.forEach((property) => addPropertyEditor(propertyList, property));
}

function addPropertyEditor(propertyList, seed = {}) {
  const propertyIndex = propertyCounter;
  propertyCounter += 1;
  const property = document.createElement("section");
  property.className = "property-editor";
  property.dataset.propertyIndex = String(propertyIndex);
  property.innerHTML = `
    <div class="property-editor-header">
      <h4>Property</h4>
      <button class="secondary-button" type="button" data-action="remove-property">Entfernen</button>
    </div>
    <div class="form-grid">
      <label class="field">
        <span>idShort</span>
        <input data-field="idShort" required placeholder="NominalPower" />
      </label>
      <label class="field">
        <span>Value Type</span>
        <select data-field="valueType" required>
          <option value="string">string</option>
          <option value="double">double</option>
          <option value="integer">integer</option>
          <option value="boolean">boolean</option>
          <option value="date">date</option>
        </select>
      </label>
      <label class="field">
        <span>Value</span>
        <input data-field="value" required placeholder="7.5" />
      </label>
      <label class="field">
        <span>Semantic ID</span>
        <input data-field="semanticId" placeholder="https://admin-shell.io/idta/NominalPower" />
      </label>
      <label class="field">
        <span>Unit</span>
        <input data-field="unit" placeholder="kW" />
      </label>
    </div>
  `;

  property.querySelector("[data-field='idShort']").value = seed.idShort ?? "";
  property.querySelector("[data-field='valueType']").value = seed.valueType ?? "string";
  property.querySelector("[data-field='value']").value = seed.value ?? "";
  property.querySelector("[data-field='semanticId']").value = seed.semanticId ?? "";
  property.querySelector("[data-field='unit']").value = seed.unit ?? "";
  propertyList.append(property);
}

function buildPackageFromGenerator() {
  const formData = new FormData(manualGeneratorForm);
  const assetId = String(formData.get("assetId") ?? "").trim();
  const assetName = String(formData.get("assetName") ?? "").trim();
  if (!assetId || !assetName) {
    throw new Error("Asset ID und Asset Name sind Pflichtfelder.");
  }

  const records = [];
  for (const submodelEditor of submodelBuilder.querySelectorAll(".submodel-editor")) {
    const submodelName = submodelEditor.querySelector("[data-field='submodelName']").value.trim();
    const explicitSubmodelId = submodelEditor.querySelector("[data-field='submodelId']").value.trim();
    if (!submodelName) {
      throw new Error("Jedes Submodel braucht einen Namen.");
    }

    const submodelId = explicitSubmodelId || `${assetId}:submodel:${toIdShort(submodelName)}`;
    for (const propertyEditor of submodelEditor.querySelectorAll(".property-editor")) {
      const record = {
        assetId,
        assetName,
        submodelId,
        submodelName,
        idShort: propertyEditor.querySelector("[data-field='idShort']").value.trim(),
        valueType: propertyEditor.querySelector("[data-field='valueType']").value,
        value: propertyEditor.querySelector("[data-field='value']").value.trim(),
        semanticId: propertyEditor.querySelector("[data-field='semanticId']").value.trim(),
        unit: propertyEditor.querySelector("[data-field='unit']").value.trim(),
      };

      if (!record.idShort || !record.value) {
        throw new Error(`Submodel ${submodelName} enthaelt eine unvollstaendige Property.`);
      }
      records.push(record);
    }
  }

  if (records.length === 0) {
    throw new Error("Mindestens eine Property ist erforderlich.");
  }

  return recordsToAasPackage(records);
}

function loadPackage(aasPackage) {
  currentPackage = aasPackage;
  const report = validateAasPackage(aasPackage);
  renderValidation(report);
  renderExplorer(aasPackage, searchInput.value);
  downloadButton.disabled = false;
  downloadAasxButton.disabled = false;
  saveRepositoryButton.disabled = false;
}

async function saveCurrentPackageToRepository() {
  if (!currentPackage) return;

  try {
    const response = await fetch("/api/aas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        payload: currentPackage,
        changeReason: repositoryReason.value.trim() || "Saved from Workbench",
        createdBy: "Workbench UI",
      }),
    });
    const result = await readApiResponse(response);
    repositoryReason.value = "";
    repositoryStatus.textContent = `Gespeichert: ${result.idShort}, Version ${result.version}.`;
    await refreshRepository();
  } catch (error) {
    repositoryStatus.textContent = `Repository nicht verfuegbar: ${error.message}`;
  }
}

async function refreshRepository() {
  try {
    repositoryStatus.textContent = "Repository wird geladen ...";
    const response = await fetch("/api/aas");
    repositoryAssets = await readApiResponse(response);
    renderRepositoryList(repositoryAssets);
    repositoryStatus.textContent = repositoryAssets.length
      ? `${repositoryAssets.length} AAS im Repository.`
      : "Repository ist erreichbar, aber noch leer.";
  } catch (error) {
    repositoryStatus.textContent = `Repository nicht verfuegbar: ${error.message}`;
    repositoryList.innerHTML = "";
  }
}

async function loadRepositoryVersion(assetId, version) {
  try {
    const response = await fetch(`/api/aas/${encodeURIComponent(assetId)}/versions/${encodeURIComponent(version)}`);
    const result = await readApiResponse(response);
    currentFileName = toIdShort(result.asset.idShort || "repository-aas").toLowerCase();
    loadPackage(normalizeAasJson(result.payload));
    repositoryStatus.textContent = `Geladen: ${result.asset.idShort}, Version ${result.version}.`;
    navigateTo("explorer");
  } catch (error) {
    repositoryStatus.textContent = `Version konnte nicht geladen werden: ${error.message}`;
  }
}

async function readApiResponse(response) {
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error || `HTTP ${response.status}`);
  }
  return payload;
}

function renderRepositoryList(assets) {
  repositoryList.innerHTML = assets.length
    ? assets.map(renderRepositoryCard).join("")
    : `<div class="repository-card"><h3>Keine AAS gespeichert</h3><div class="repository-meta">Speichere zuerst eine geladene AAS.</div></div>`;
}

function renderRepositoryCard(asset) {
  const versions = Array.from({ length: asset.latestVersion }, (_, index) => index + 1);
  return `
    <article class="repository-card">
      <h3>${escapeHtml(asset.idShort)}</h3>
      <div class="repository-meta">${escapeHtml(asset.globalAssetId)}</div>
      <div class="repository-meta">Latest Version: ${asset.latestVersion} | Updated: ${formatDateTime(asset.updatedAt)}</div>
      <div class="version-list">
        ${versions
          .map(
            (version) =>
              `<button class="secondary-button" type="button" data-action="load-version" data-asset-id="${escapeHtml(asset.id)}" data-version="${version}">v${version}</button>`,
          )
          .join("")}
      </div>
    </article>
  `;
}

function formatDateTime(value) {
  if (!value) return "unbekannt";
  return new Date(value).toLocaleString("de-DE");
}

function addGatewayMapping(mapping) {
  if (!currentPackage?.assetAdministrationShells?.length) {
    throw new Error("Lade oder erzeuge zuerst eine AAS, bevor ein Gateway-Mapping hinzugefuegt wird.");
  }

  const aasPackage = structuredClone(currentPackage);
  const shell = aasPackage.assetAdministrationShells[0];
  const assetId = shell.assetInformation?.globalAssetId ?? shell.id ?? "asset";
  const submodelId = `${assetId}:GatewayMapping`;
  let submodel = aasPackage.submodels.find((candidate) => candidate.id === submodelId);

  if (!submodel) {
    submodel = {
      modelType: "Submodel",
      id: submodelId,
      idShort: "GatewayMapping",
      semanticId: referenceTo("ConceptDescription", "https://admin-shell.io/idta/GatewayMapping"),
      submodelElements: [],
    };
    aasPackage.submodels.push(submodel);
  }

  if (!shell.submodels?.some((reference) => reference.keys?.at(-1)?.value === submodelId)) {
    shell.submodels = shell.submodels ?? [];
    shell.submodels.push(referenceTo("Submodel", submodelId));
  }

  submodel.submodelElements.push({
    modelType: "SubmodelElementCollection",
    idShort: `Mapping${gatewayMappingCounter}`,
    semanticId: referenceTo("ConceptDescription", "https://admin-shell.io/idta/GatewayMappingEntry"),
    value: [
      gatewayProperty("Protocol", mapping.protocol),
      gatewayProperty("Endpoint", mapping.endpoint),
      gatewayProperty("SourceAddress", mapping.sourceAddress),
      gatewayProperty("TargetProperty", mapping.targetProperty),
      gatewayProperty("SamplingInterval", mapping.samplingInterval, "xs:integer", "ms"),
    ],
  });

  gatewayMappingCounter += 1;
  loadPackage(aasPackage);
}

function gatewayProperty(idShort, value, valueType = "xs:string", unit = "") {
  const property = {
    modelType: "Property",
    idShort,
    valueType,
    value: String(value ?? ""),
  };

  if (unit) {
    property.qualifiers = [{ type: "unit", valueType: "xs:string", value: unit }];
  }

  return property;
}

function normalizeAasJson(json) {
  if (Array.isArray(json.assetAdministrationShells) || Array.isArray(json.submodels)) {
    return {
      assetAdministrationShells: json.assetAdministrationShells ?? [],
      submodels: json.submodels ?? [],
      conceptDescriptions: json.conceptDescriptions ?? [],
    };
  }

  if (json.modelType === "AssetAdministrationShell" || json.assetInformation) {
    return {
      assetAdministrationShells: [json],
      submodels: [],
      conceptDescriptions: [],
    };
  }

  throw new Error("Die JSON-Datei sieht nicht wie ein AAS-Package aus.");
}

function openMappingDialog(rows, sourceLabel) {
  const cleanedRows = rows.filter((row) => row.some((cell) => String(cell ?? "").trim() !== ""));
  if (cleanedRows.length < 2) throw new Error(`${sourceLabel} enthält keine Datenzeilen.`);

  pendingTableImport = { rows: cleanedRows };
  const headers = getHeaders(cleanedRows);
  const dataRows = cleanedRows.slice(1, 6);

  mappingSummary.textContent = `${sourceLabel}: ${cleanedRows.length - 1} Datenzeilen erkannt. Ordne die Spalten den AAS-Zielfeldern zu.`;
  mappingFields.innerHTML = targetColumns.map((column) => renderMappingField(column, headers)).join("");
  mappingPreview.innerHTML = renderPreviewTable(headers, dataRows);
  mappingDialog.showModal();
}

function renderMappingField(column, headers) {
  const selectedIndex = guessColumnIndex(column, headers);
  const options = [
    `<option value="">Nicht zuordnen</option>`,
    ...headers.map((header, index) => {
      const selected = selectedIndex === index ? " selected" : "";
      return `<option value="${index}"${selected}>${escapeHtml(header)}</option>`;
    }),
  ].join("");

  return `
    <div class="mapping-field">
      <label for="mapping-${column.key}">
        ${escapeHtml(column.label)}${column.required ? ` <span class="required-mark">*</span>` : ""}
      </label>
      <select id="mapping-${column.key}" name="${column.key}">
        ${options}
      </select>
    </div>
  `;
}

function renderPreviewTable(headers, rows) {
  return `
    <thead>
      <tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr>
    </thead>
    <tbody>
      ${rows
        .map((row) => `<tr>${headers.map((_, index) => `<td>${escapeHtml(row[index] ?? "")}</td>`).join("")}</tr>`)
        .join("")}
    </tbody>
  `;
}

function guessColumnIndex(column, headers) {
  const normalizedAliases = new Set([column.key, column.label, ...column.aliases].map(normalizeHeader));
  return headers.findIndex((header) => normalizedAliases.has(normalizeHeader(header)));
}

function normalizeHeader(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function getHeaders(rows) {
  const firstRow = rows[0] ?? [];
  return firstRow.map((header, index) => {
    const text = String(header ?? "").trim();
    return text || `Spalte ${index + 1}`;
  });
}

function rowsToAasPackage(rows, mapping = defaultMapping(rows)) {
  const headers = getHeaders(rows);
  const records = rows
    .slice(1)
    .filter((row) => row.some((cell) => String(cell ?? "").trim() !== ""))
    .map((row) => {
      return Object.fromEntries(
        targetColumns.map((column) => {
          const index = Number(mapping[column.key]);
          const value = Number.isInteger(index) && index >= 0 ? row[index] : "";
          return [column.key, String(value ?? "").trim()];
        }),
      );
    });

  const missing = targetColumns
    .filter((column) => column.required && !records.every((record) => record[column.key]))
    .map((column) => column.key);

  if (missing.length > 0) {
    throw new Error(`Pflichtwerte fehlen in der Tabelle: ${missing.join(", ")}`);
  }

  return recordsToAasPackage(records, headers);
}

function defaultMapping(rows) {
  const headers = getHeaders(rows);
  return Object.fromEntries(targetColumns.map((column) => [column.key, String(guessColumnIndex(column, headers))]));
}

function recordsToAasPackage(records) {
  const shellMap = new Map();
  const submodelMap = new Map();

  for (const record of records) {
    const assetId = record.assetId;
    const assetName = record.assetName || toIdShort(assetId);
    const submodelId = record.submodelId;
    const submodelName = record.submodelName || toIdShort(submodelId);

    if (!shellMap.has(assetId)) {
      shellMap.set(assetId, {
        modelType: "AssetAdministrationShell",
        id: `${assetId}:aas`,
        idShort: toIdShort(assetName),
        assetInformation: {
          assetKind: "Instance",
          globalAssetId: assetId,
        },
        submodels: [],
      });
    }

    if (!submodelMap.has(submodelId)) {
      submodelMap.set(submodelId, {
        modelType: "Submodel",
        id: submodelId,
        idShort: toIdShort(submodelName),
        submodelElements: [],
      });
    }

    const shell = shellMap.get(assetId);
    if (!shell.submodels.some((reference) => reference.keys?.[0]?.value === submodelId)) {
      shell.submodels.push(referenceTo("Submodel", submodelId));
    }

    const submodel = submodelMap.get(submodelId);
    const property = {
      modelType: "Property",
      idShort: toIdShort(record.idShort),
      valueType: normalizeValueType(record.valueType),
      value: record.value,
    };

    if (record.semanticId) {
      property.semanticId = referenceTo("ConceptDescription", record.semanticId);
    }

    if (record.unit) {
      property.qualifiers = [
        {
          type: "unit",
          valueType: "xs:string",
          value: record.unit,
        },
      ];
    }

    submodel.submodelElements.push(property);
  }

  return {
    assetAdministrationShells: [...shellMap.values()],
    submodels: [...submodelMap.values()],
    conceptDescriptions: [],
  };
}

function parseCsv(csvText) {
  const text = csvText.trim();
  const delimiter = detectDelimiter(text);
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"' && inQuotes && next === '"') {
      cell += '"';
      index += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === delimiter && !inQuotes) {
      row.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  row.push(cell);
  rows.push(row);
  return rows;
}

function detectDelimiter(text) {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
  const candidates = [",", ";", "\t"];
  return candidates
    .map((delimiter) => ({ delimiter, count: firstLine.split(delimiter).length }))
    .sort((left, right) => right.count - left.count)[0].delimiter;
}

async function parseXlsx(buffer) {
  const entries = await readZipEntries(buffer);
  const workbook = parseXml(readTextEntry(entries, "xl/workbook.xml", "Excel-Datei"));
  const rels = parseRelationships(readTextEntry(entries, "xl/_rels/workbook.xml.rels", "Excel-Datei"));
  const firstSheet = [...workbook.getElementsByTagNameNS("*", "sheet")][0];
  if (!firstSheet) throw new Error("Die Excel-Datei enthält kein Worksheet.");

  const relationshipId = firstSheet.getAttribute("r:id") ?? firstSheet.getAttributeNS("*", "id");
  const target = rels.get(relationshipId);
  if (!target) throw new Error("Worksheet-Referenz konnte nicht gelesen werden.");

  const sheetPath = resolveZipPath("xl/workbook.xml", target);
  const sharedStrings = entries.has("xl/sharedStrings.xml")
    ? parseSharedStrings(readTextEntry(entries, "xl/sharedStrings.xml", "Excel-Datei"))
    : [];
  return parseWorksheet(readTextEntry(entries, sheetPath, "Excel-Datei"), sharedStrings);
}

async function readZipEntries(buffer) {
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);
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

  if (!("DecompressionStream" in window)) {
    throw new Error("Dieser Browser kann komprimierte ZIP/OPC-Dateien nicht entpacken.");
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

function readTextEntry(entries, path, packageLabel = "Datei") {
  const entry = entries.get(path);
  if (!entry) throw new Error(`${packageLabel} enthaelt ${path} nicht.`);
  return new TextDecoder().decode(entry);
}

function parseXml(text) {
  const document = new DOMParser().parseFromString(text, "application/xml");
  if (document.querySelector("parsererror")) throw new Error("XML in der Datei ist ungueltig.");
  return document;
}

function parseRelationships(xmlText) {
  const document = parseXml(xmlText);
  const relationships = new Map();
  for (const relationship of document.getElementsByTagNameNS("*", "Relationship")) {
    relationships.set(relationship.getAttribute("Id"), relationship.getAttribute("Target"));
  }
  return relationships;
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

function parseSharedStrings(xmlText) {
  const document = parseXml(xmlText);
  return [...document.getElementsByTagNameNS("*", "si")].map((item) => {
    return [...item.getElementsByTagNameNS("*", "t")].map((node) => node.textContent ?? "").join("");
  });
}

function parseWorksheet(xmlText, sharedStrings) {
  const document = parseXml(xmlText);
  const parsedRows = [];

  for (const row of document.getElementsByTagNameNS("*", "row")) {
    const values = [];
    let fallbackIndex = 0;

    for (const cell of row.getElementsByTagNameNS("*", "c")) {
      const reference = cell.getAttribute("r");
      const index = reference ? columnReferenceToIndex(reference) : fallbackIndex;
      values[index] = readCellValue(cell, sharedStrings);
      fallbackIndex = index + 1;
    }

    parsedRows.push(values.map((value) => value ?? ""));
  }

  return parsedRows;
}

function readCellValue(cell, sharedStrings) {
  const type = cell.getAttribute("t");
  const valueNode = cell.getElementsByTagNameNS("*", "v")[0];

  if (type === "inlineStr") {
    return [...cell.getElementsByTagNameNS("*", "t")].map((node) => node.textContent ?? "").join("");
  }

  const rawValue = valueNode?.textContent ?? "";
  if (type === "s") return sharedStrings[Number(rawValue)] ?? "";
  if (type === "b") return rawValue === "1" ? "true" : "false";
  return rawValue;
}

function columnReferenceToIndex(reference) {
  const letters = reference.replace(/[^A-Z]/gi, "").toUpperCase();
  let index = 0;
  for (const letter of letters) {
    index = index * 26 + letter.charCodeAt(0) - 64;
  }
  return Math.max(0, index - 1);
}

function validateAasPackage(aasPackage) {
  const issues = [];
  const shells = aasPackage.assetAdministrationShells ?? [];
  const submodels = aasPackage.submodels ?? [];
  const submodelIds = new Set(submodels.map((submodel) => submodel.id).filter(Boolean));
  const elementCount = submodels.reduce(
    (count, submodel) => count + (submodel.submodelElements?.length ?? 0),
    0,
  );

  if (!Array.isArray(aasPackage.assetAdministrationShells)) {
    issues.push(errorIssue("Package", "assetAdministrationShells muss ein Array sein."));
  }

  if (!Array.isArray(aasPackage.submodels)) {
    issues.push(errorIssue("Package", "submodels muss ein Array sein."));
  }

  shells.forEach((shell, shellIndex) => {
    const path = `assetAdministrationShells[${shellIndex}]`;
    requireField(shell, "id", path, issues);
    requireField(shell, "idShort", path, issues);

    if (!shell.assetInformation?.globalAssetId) {
      issues.push(warnIssue(path, "assetInformation.globalAssetId fehlt."));
    }

    if (!isValidIdShort(shell.idShort)) {
      issues.push(errorIssue(path, `idShort "${shell.idShort}" ist nicht AAS-kompatibel.`));
    }

    for (const reference of shell.submodels ?? []) {
      const target = reference.keys?.at(-1)?.value;
      if (target && !submodelIds.has(target)) {
        issues.push(errorIssue(path, `Submodel-Referenz nicht gefunden: ${target}`));
      }
    }
  });

  submodels.forEach((submodel, submodelIndex) => {
    const path = `submodels[${submodelIndex}]`;
    requireField(submodel, "id", path, issues);
    requireField(submodel, "idShort", path, issues);

    if (!isValidIdShort(submodel.idShort)) {
      issues.push(errorIssue(path, `idShort "${submodel.idShort}" ist nicht AAS-kompatibel.`));
    }

    const seenElements = new Set();
    for (const [elementIndex, element] of (submodel.submodelElements ?? []).entries()) {
      const elementPath = `${path}.submodelElements[${elementIndex}]`;
      requireField(element, "idShort", elementPath, issues);

      if (!isValidIdShort(element.idShort)) {
        issues.push(errorIssue(elementPath, `idShort "${element.idShort}" ist nicht AAS-kompatibel.`));
      }

      if (seenElements.has(element.idShort)) {
        issues.push(warnIssue(elementPath, `Doppeltes idShort im Submodel: ${element.idShort}`));
      }
      seenElements.add(element.idShort);

      if (element.modelType === "Property" && !element.valueType) {
        issues.push(errorIssue(elementPath, "Property ohne valueType."));
      }

      if (!element.semanticId) {
        issues.push(warnIssue(elementPath, "semanticId fehlt; Interoperabilitaet ist eingeschraenkt."));
      }
    }
  });

  return {
    issues,
    stats: {
      shells: shells.length,
      submodels: submodels.length,
      elements: elementCount,
    },
  };
}

function renderValidation(report) {
  const errorCount = report.issues.filter((issue) => issue.level === "error").length;
  const warningCount = report.issues.filter((issue) => issue.level === "warning").length;

  statusLabel.className = "status-pill";
  if (errorCount > 0) {
    statusLabel.classList.add("invalid");
    statusLabel.textContent = `${errorCount} Fehler`;
  } else if (warningCount > 0) {
    statusLabel.classList.add("warning");
    statusLabel.textContent = `${warningCount} Warnungen`;
  } else {
    statusLabel.classList.add("valid");
    statusLabel.textContent = "Valide Basisstruktur";
  }

  summaryText.textContent =
    errorCount > 0
      ? "Die Datei braucht Korrekturen, bevor sie als robuste AAS weiterverarbeitet werden sollte."
      : warningCount > 0
        ? "Die Struktur ist nutzbar, aber einige semantische Angaben sollten ergaenzt werden."
        : "Die wichtigsten Pflichtfelder und Referenzen sind konsistent.";

  stats.innerHTML = `
    <div><strong>${report.stats.shells}</strong><span>AAS</span></div>
    <div><strong>${report.stats.submodels}</strong><span>Submodels</span></div>
    <div><strong>${report.stats.elements}</strong><span>Elements</span></div>
  `;

  issuesList.innerHTML = report.issues.length
    ? report.issues
        .map(
          (issue) => `
            <div class="issue ${issue.level === "error" ? "error" : ""}">
              <strong>${escapeHtml(issue.title)}</strong>
              <span>${escapeHtml(issue.message)}</span>
            </div>
          `,
        )
        .join("")
    : `<div class="issue"><strong>Keine Issues gefunden</strong><span>Basispruefung erfolgreich.</span></div>`;
}

function renderExplorer(aasPackage, query = "") {
  const normalizedQuery = query.trim().toLowerCase();
  const submodels = aasPackage.submodels ?? [];
  const submodelById = new Map(submodels.map((submodel) => [submodel.id, submodel]));
  const shells = aasPackage.assetAdministrationShells ?? [];

  const html = shells
    .map((shell) => {
      const referencedSubmodels = (shell.submodels ?? [])
        .map((reference) => submodelById.get(reference.keys?.at(-1)?.value))
        .filter(Boolean);

      const matchingSubmodels = referencedSubmodels
        .map((submodel) => filterSubmodel(submodel, normalizedQuery))
        .filter(Boolean);

      const shellMatches = matchesQuery(shell, normalizedQuery);
      if (normalizedQuery && !shellMatches && matchingSubmodels.length === 0) return "";

      return `
        <article class="aas-card">
          <div class="aas-header">
            <h3>${escapeHtml(shell.idShort ?? "AAS ohne idShort")}</h3>
            <div class="meta">${escapeHtml(shell.id ?? "")}</div>
            <div class="meta">Asset: ${escapeHtml(shell.assetInformation?.globalAssetId ?? "nicht gesetzt")}</div>
          </div>
          ${matchingSubmodels.map(renderSubmodel).join("") || `<div class="submodel">Keine passenden Submodels.</div>`}
        </article>
      `;
    })
    .join("");

  explorer.className = html ? "" : "explorer-empty";
  explorer.innerHTML = html || "Keine passenden Eintraege gefunden.";
}

function renderSubmodel(submodel) {
  return `
    <section class="submodel">
      <h4>${escapeHtml(submodel.idShort ?? "Submodel ohne idShort")}</h4>
      <div class="meta">${escapeHtml(submodel.id ?? "")}</div>
      <div class="element-grid">
        ${(submodel.submodelElements ?? []).map(renderElement).join("") || "<p>Keine Elemente.</p>"}
      </div>
    </section>
  `;
}

function renderElement(element) {
  const semantic = element.semanticId?.keys?.at(-1)?.value ?? "keine semanticId";
  const unit = element.qualifiers?.find((qualifier) => qualifier.type === "unit")?.value;
  if (element.modelType === "SubmodelElementCollection") {
    return `
      <div class="element-row collection-row">
        <code>${escapeHtml(element.idShort ?? "")}</code>
        <span>Collection</span>
        <span class="value-cell">${escapeHtml((element.value ?? []).map((item) => `${item.idShort}: ${formatValue(item.value)}`).join("; "))}</span>
        <span class="semantic-cell">${escapeHtml(semantic)}</span>
      </div>
    `;
  }

  return `
    <div class="element-row">
      <code>${escapeHtml(element.idShort ?? "")}</code>
      <span>${escapeHtml(element.valueType ?? element.modelType ?? "")}</span>
      <span class="value-cell">${escapeHtml(formatValue(element.value))}${unit ? ` ${escapeHtml(unit)}` : ""}</span>
      <span class="semantic-cell">${escapeHtml(semantic)}</span>
    </div>
  `;
}

function filterSubmodel(submodel, normalizedQuery) {
  if (!normalizedQuery) return submodel;
  if (matchesQuery(submodel, normalizedQuery)) return submodel;

  const matchingElements = (submodel.submodelElements ?? []).filter((element) =>
    matchesQuery(element, normalizedQuery),
  );

  if (matchingElements.length === 0) return null;
  return { ...submodel, submodelElements: matchingElements };
}

function matchesQuery(entity, normalizedQuery) {
  if (!normalizedQuery) return true;
  return JSON.stringify(entity).toLowerCase().includes(normalizedQuery);
}

function renderError(error) {
  currentPackage = null;
  downloadButton.disabled = true;
  downloadAasxButton.disabled = true;
  saveRepositoryButton.disabled = true;
  statusLabel.className = "status-pill invalid";
  statusLabel.textContent = "Importfehler";
  summaryText.textContent = error.message;
  stats.innerHTML = `
    <div><strong>0</strong><span>AAS</span></div>
    <div><strong>0</strong><span>Submodels</span></div>
    <div><strong>0</strong><span>Elements</span></div>
  `;
  issuesList.innerHTML = "";
  explorer.className = "explorer-empty";
  explorer.textContent = "Die Datei konnte nicht geladen werden.";
}

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

function requireField(entity, field, path, issues) {
  if (!entity?.[field]) {
    issues.push(errorIssue(path, `${field} fehlt.`));
  }
}

function errorIssue(title, message) {
  return { level: "error", title, message };
}

function warnIssue(title, message) {
  return { level: "warning", title, message };
}

function referenceTo(type, value) {
  return {
    type: "ExternalReference",
    keys: [{ type, value }],
  };
}

function toIdShort(value) {
  const cleaned = String(value || "Element")
    .replace(/^[^A-Za-z]+/, "")
    .replace(/[^A-Za-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
  return cleaned || "Element";
}

function normalizeValueType(valueType) {
  const value = String(valueType || "string").toLowerCase();
  const map = {
    string: "xs:string",
    text: "xs:string",
    double: "xs:double",
    float: "xs:float",
    integer: "xs:integer",
    int: "xs:integer",
    boolean: "xs:boolean",
    bool: "xs:boolean",
    date: "xs:date",
    datetime: "xs:dateTime",
  };
  return map[value] ?? valueType;
}

function isValidIdShort(value) {
  return typeof value === "string" && /^[A-Za-z][A-Za-z0-9_]*$/.test(value);
}

function formatValue(value) {
  if (value === undefined || value === null || value === "") return "leer";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
