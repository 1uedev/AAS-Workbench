import { createAasxBlob } from "./aasx-export.js";
import { readAasxPackage } from "./aasx-import.js";
import { createAasPdfBlob } from "./pdf-export.js";
import { createAasExcelBlob } from "./xlsx-export.js";
import { createValidationReportBlob } from "./validation-report-export.js";

const fileInput = document.querySelector("#fileInput");
const dropZone = document.querySelector(".drop-zone");
const loadSampleButton = document.querySelector("#loadSampleButton");
const downloadButton = document.querySelector("#downloadButton");
const downloadAasxButton = document.querySelector("#downloadAasxButton");
const downloadPdfButton = document.querySelector("#downloadPdfButton");
const downloadExcelButton = document.querySelector("#downloadExcelButton");
const downloadValidationReportButton = document.querySelector("#downloadValidationReportButton");
const statusLabel = document.querySelector("#statusLabel");
const summaryText = document.querySelector("#summaryText");
const stats = document.querySelector("#stats");
const issuesList = document.querySelector("#issuesList");
const explorer = document.querySelector("#explorer");
const searchInput = document.querySelector("#searchInput");
const expandTreeButton = document.querySelector("#expandTreeButton");
const collapseTreeButton = document.querySelector("#collapseTreeButton");
const jsonInspectorTitle = document.querySelector("#jsonInspectorTitle");
const jsonInspectorMeta = document.querySelector("#jsonInspectorMeta");
const jsonInspectorContent = document.querySelector("#jsonInspectorContent");
const copyJsonButton = document.querySelector("#copyJsonButton");
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
const compareResult = document.querySelector("#compareResult");
const routeLinks = [...document.querySelectorAll("[data-route-link]")];

let currentPackage = null;
let currentValidationReport = null;
let currentFileName = "aas-export";
let pendingTableImport = null;
let gatewayMappingCounter = 1;
let submodelCounter = 1;
let propertyCounter = 1;
let repositoryAssets = [];
let explorerNodes = new Map();
let selectedExplorerNodeId = "package";
let expandedExplorerNodeIds = new Set(["package"]);
let lastExplorerQuery = "";

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

const nestedModelSearchKeys = new Set([
  "assetAdministrationShells",
  "submodels",
  "conceptDescriptions",
  "submodelElements",
  "statements",
  "value",
]);

const aasModelTypes = new Set([
  "AssetAdministrationShell",
  "Submodel",
  "ConceptDescription",
  "Property",
  "MultiLanguageProperty",
  "Range",
  "Blob",
  "File",
  "ReferenceElement",
  "RelationshipElement",
  "AnnotatedRelationshipElement",
  "Entity",
  "SubmodelElementCollection",
  "SubmodelElementList",
  "Operation",
  "Capability",
  "BasicEventElement",
]);

const submodelElementTypes = new Set([
  "AnnotatedRelationshipElement",
  "BasicEventElement",
  "Blob",
  "Capability",
  "Entity",
  "File",
  "MultiLanguageProperty",
  "Operation",
  "Property",
  "Range",
  "ReferenceElement",
  "RelationshipElement",
  "SubmodelElementCollection",
  "SubmodelElementList",
]);

const aasReferenceTypes = new Set(["ExternalReference", "ModelReference"]);

const aasKeyTypes = new Set([
  "AnnotatedRelationshipElement",
  "AssetAdministrationShell",
  "BasicEventElement",
  "Blob",
  "Capability",
  "ConceptDescription",
  "Entity",
  "File",
  "FragmentReference",
  "GlobalReference",
  "Identifiable",
  "MultiLanguageProperty",
  "Operation",
  "Property",
  "Range",
  "Referable",
  "ReferenceElement",
  "RelationshipElement",
  "Submodel",
  "SubmodelElement",
  "SubmodelElementCollection",
  "SubmodelElementList",
]);

const aasValueTypes = new Set([
  "xs:anyURI",
  "xs:base64Binary",
  "xs:boolean",
  "xs:byte",
  "xs:date",
  "xs:dateTime",
  "xs:decimal",
  "xs:double",
  "xs:duration",
  "xs:float",
  "xs:gDay",
  "xs:gMonth",
  "xs:gMonthDay",
  "xs:gYear",
  "xs:gYearMonth",
  "xs:hexBinary",
  "xs:int",
  "xs:integer",
  "xs:long",
  "xs:negativeInteger",
  "xs:nonNegativeInteger",
  "xs:nonPositiveInteger",
  "xs:positiveInteger",
  "xs:short",
  "xs:string",
  "xs:time",
  "xs:unsignedByte",
  "xs:unsignedInt",
  "xs:unsignedLong",
  "xs:unsignedShort",
]);

const assetKinds = new Set(["Instance", "Type", "NotApplicable", "Role"]);
const entityTypes = new Set(["CoManagedEntity", "SelfManagedEntity"]);
const eventDirections = new Set(["input", "output"]);
const eventStates = new Set(["on", "off"]);

const issueSeverityLabels = {
  error: "Fehler",
  warning: "Warnung",
  info: "Info",
};

const issueCategoryLabels = {
  structure: "Struktur",
  references: "Referenzen",
  datatypes: "Datentypen",
  semantics: "Semantik",
  interoperability: "Interoperabilitaet",
};

const issueCategoryOrder = ["structure", "references", "datatypes", "semantics", "interoperability"];

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
updateTreeControls(false);

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

downloadPdfButton.addEventListener("click", () => {
  if (!currentPackage) return;
  downloadBlob(
    createAasPdfBlob(currentPackage, {
      fileName: currentFileName,
      validationReport: currentValidationReport,
      generatedAt: new Date(),
    }),
    `${currentFileName}-report.pdf`,
  );
});

downloadExcelButton.addEventListener("click", () => {
  if (!currentPackage) return;
  downloadBlob(
    createAasExcelBlob(currentPackage, {
      fileName: currentFileName,
      validationReport: currentValidationReport,
      generatedAt: new Date(),
    }),
    `${currentFileName}-export.xlsx`,
  );
});

downloadValidationReportButton.addEventListener("click", () => {
  if (!currentPackage || !currentValidationReport) return;
  downloadBlob(
    createValidationReportBlob(currentPackage, currentValidationReport, {
      fileName: currentFileName,
      generatedAt: new Date(),
    }),
    `${currentFileName}-validation-report.json`,
  );
});

searchInput.addEventListener("input", () => {
  if (currentPackage) renderExplorer(currentPackage, searchInput.value);
});

explorer.addEventListener("click", (event) => {
  const toggleButton = event.target.closest("[data-tree-toggle]");
  if (toggleButton) {
    const nodeId = toggleButton.dataset.treeToggle;
    if (expandedExplorerNodeIds.has(nodeId)) {
      expandedExplorerNodeIds.delete(nodeId);
    } else {
      expandedExplorerNodeIds.add(nodeId);
    }
    renderExplorer(currentPackage, searchInput.value);
    return;
  }

  const selectButton = event.target.closest("[data-node-id]");
  if (!selectButton) return;
  selectedExplorerNodeId = selectButton.dataset.nodeId;
  renderExplorer(currentPackage, searchInput.value);
});

expandTreeButton.addEventListener("click", () => {
  if (!currentPackage) return;
  explorerNodes.forEach((node) => {
    if (node.children.length > 0) expandedExplorerNodeIds.add(node.id);
  });
  renderExplorer(currentPackage, searchInput.value);
});

collapseTreeButton.addEventListener("click", () => {
  if (!currentPackage) return;
  expandedExplorerNodeIds = new Set(["package"]);
  renderExplorer(currentPackage, searchInput.value);
});

copyJsonButton.addEventListener("click", async () => {
  const node = explorerNodes.get(selectedExplorerNodeId);
  if (!node) return;

  const originalText = copyJsonButton.textContent;
  try {
    await navigator.clipboard.writeText(JSON.stringify(node.value, null, 2));
    copyJsonButton.textContent = "Kopiert";
  } catch {
    copyJsonButton.textContent = "Nicht kopiert";
  }
  window.setTimeout(() => {
    copyJsonButton.textContent = originalText;
  }, 1200);
});

repositoryForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  await saveCurrentPackageToRepository();
});

refreshRepositoryButton.addEventListener("click", refreshRepository);

repositoryList.addEventListener("click", async (event) => {
  const loadVersionButton = event.target.closest("[data-action='load-version']");
  if (loadVersionButton) {
    await loadRepositoryVersion(loadVersionButton.dataset.assetId, loadVersionButton.dataset.version);
    return;
  }

  const compareButton = event.target.closest("[data-action='compare-versions']");
  if (!compareButton) return;

  const controls = compareButton.closest("[data-compare-asset]");
  const baseVersion = controls.querySelector("[data-compare-base]").value;
  const targetVersion = controls.querySelector("[data-compare-target]").value;
  await compareRepositoryVersions(controls.dataset.compareAsset, baseVersion, targetVersion);
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
  resetExplorerState();
  const report = validateAasPackage(aasPackage);
  currentValidationReport = report;
  renderValidation(report);
  renderExplorer(aasPackage, searchInput.value);
  downloadButton.disabled = false;
  downloadAasxButton.disabled = false;
  downloadPdfButton.disabled = false;
  downloadExcelButton.disabled = false;
  downloadValidationReportButton.disabled = false;
  saveRepositoryButton.disabled = false;
}

function resetExplorerState() {
  selectedExplorerNodeId = "package";
  expandedExplorerNodeIds = new Set(["package"]);
  explorerNodes = new Map();
  lastExplorerQuery = "";
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

async function compareRepositoryVersions(assetId, baseVersion, targetVersion) {
  if (baseVersion === targetVersion) {
    compareResult.className = "compare-empty";
    compareResult.textContent = "Waehle zwei unterschiedliche Versionen aus.";
    return;
  }

  try {
    compareResult.className = "compare-empty";
    compareResult.textContent = `Vergleich v${baseVersion} gegen v${targetVersion} wird geladen ...`;
    const [base, target] = await Promise.all([
      fetchRepositoryVersion(assetId, baseVersion),
      fetchRepositoryVersion(assetId, targetVersion),
    ]);
    const comparison = compareAasPackages(normalizeAasJson(base.payload), normalizeAasJson(target.payload));
    renderCompareResult(base, target, comparison);
    repositoryStatus.textContent = `Vergleich geladen: ${base.asset.idShort}, v${base.version} gegen v${target.version}.`;
  } catch (error) {
    compareResult.className = "compare-empty";
    compareResult.textContent = `Vergleich konnte nicht geladen werden: ${error.message}`;
  }
}

async function fetchRepositoryVersion(assetId, version) {
  const response = await fetch(`/api/aas/${encodeURIComponent(assetId)}/versions/${encodeURIComponent(version)}`);
  return readApiResponse(response);
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
  const compareControls =
    versions.length > 1
      ? `
        <div class="compare-controls" data-compare-asset="${escapeHtml(asset.id)}">
          <label>
            <span>Basis</span>
            <select data-compare-base>
              ${renderVersionOptions(versions, Math.max(1, asset.latestVersion - 1))}
            </select>
          </label>
          <label>
            <span>Ziel</span>
            <select data-compare-target>
              ${renderVersionOptions(versions, asset.latestVersion)}
            </select>
          </label>
          <button class="secondary-button" type="button" data-action="compare-versions">Vergleichen</button>
        </div>
      `
      : `<div class="repository-meta">Fuer Compare mindestens zwei Versionen speichern.</div>`;

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
      ${compareControls}
    </article>
  `;
}

function renderVersionOptions(versions, selectedVersion) {
  return versions
    .map((version) => `<option value="${version}"${version === selectedVersion ? " selected" : ""}>v${version}</option>`)
    .join("");
}

function compareAasPackages(basePackage, targetPackage) {
  const baseEntries = buildCompareEntries(basePackage);
  const targetEntries = buildCompareEntries(targetPackage);
  const result = {
    added: [],
    removed: [],
    changed: [],
    unchanged: [],
    baseStats: getPackageCompareStats(basePackage),
    targetStats: getPackageCompareStats(targetPackage),
  };

  const keys = [...new Set([...baseEntries.keys(), ...targetEntries.keys()])].sort((left, right) => {
    const leftEntry = baseEntries.get(left) ?? targetEntries.get(left);
    const rightEntry = baseEntries.get(right) ?? targetEntries.get(right);
    return leftEntry.sortKey.localeCompare(rightEntry.sortKey);
  });

  for (const key of keys) {
    const baseEntry = baseEntries.get(key);
    const targetEntry = targetEntries.get(key);

    if (!baseEntry && targetEntry) {
      result.added.push(targetEntry);
      continue;
    }

    if (baseEntry && !targetEntry) {
      result.removed.push(baseEntry);
      continue;
    }

    if (stableJson(baseEntry.compareValue) !== stableJson(targetEntry.compareValue)) {
      result.changed.push({
        ...targetEntry,
        before: baseEntry,
        changes: diffComparableValues(baseEntry.compareValue, targetEntry.compareValue),
      });
      continue;
    }

    result.unchanged.push(targetEntry);
  }

  return result;
}

function buildCompareEntries(aasPackage) {
  const entries = new Map();
  const shells = aasPackage.assetAdministrationShells ?? [];
  const submodels = aasPackage.submodels ?? [];

  shells.forEach((shell, shellIndex) => {
    const shellKey = shell.id || `index:${shellIndex}`;
    addCompareEntry(entries, {
      type: "AAS",
      key: `shell:${shellKey}`,
      label: shell.idShort ?? `AAS ${shellIndex + 1}`,
      path: shell.id ?? `assetAdministrationShells[${shellIndex}]`,
      sortKey: `0:${shell.idShort ?? shellKey}`,
      compareValue: comparableShell(shell),
    });
  });

  submodels.forEach((submodel, submodelIndex) => {
    const submodelKey = submodel.id || `index:${submodelIndex}`;
    addCompareEntry(entries, {
      type: "Submodel",
      key: `submodel:${submodelKey}`,
      label: submodel.idShort ?? `Submodel ${submodelIndex + 1}`,
      path: submodel.id ?? `submodels[${submodelIndex}]`,
      sortKey: `1:${submodel.idShort ?? submodelKey}`,
      compareValue: comparableSubmodel(submodel),
    });

    (submodel.submodelElements ?? []).forEach((element, elementIndex) => {
      addElementCompareEntries(entries, element, submodelKey, submodel.idShort ?? submodelKey, [elementIndex], []);
    });
  });

  return entries;
}

function addElementCompareEntries(entries, element, submodelKey, submodelLabel, indexPath, labelPath) {
  const labelSegment = element.idShort || `Element${indexPath.at(-1) + 1}`;
  const nextLabelPath = [...labelPath, labelSegment];
  const elementKey = `element:${submodelKey}:${nextLabelPath.join("/")}`;
  const label = nextLabelPath.join(" / ");

  addCompareEntry(entries, {
    type: element.modelType ?? "Element",
    key: elementKey,
    label,
    path: `${submodelLabel} / ${label}`,
    sortKey: `2:${submodelLabel}:${nextLabelPath.join(":")}`,
    compareValue: comparableElement(element),
  });

  getElementChildren(element).forEach((child, childIndex) => {
    addElementCompareEntries(entries, child, submodelKey, submodelLabel, [...indexPath, childIndex], nextLabelPath);
  });
}

function addCompareEntry(entries, entry) {
  entries.set(entry.key, entry);
}

function comparableShell(shell) {
  return {
    ...cloneComparable(omitKeys(shell, ["submodels"])),
    submodelReferences: (shell.submodels ?? []).map((reference) => reference.keys?.at(-1)?.value ?? reference),
  };
}

function comparableSubmodel(submodel) {
  return cloneComparable(omitKeys(submodel, ["submodelElements"]));
}

function comparableElement(element) {
  const childEntries = getElementChildren(element);
  const keysToOmit = childEntries.length ? ["value", "statements"] : [];
  return cloneComparable(omitKeys(element, keysToOmit));
}

function omitKeys(entity, keys) {
  const skipped = new Set(keys);
  return Object.fromEntries(Object.entries(entity ?? {}).filter(([key]) => !skipped.has(key)));
}

function cloneComparable(value) {
  const text = JSON.stringify(value);
  return text ? JSON.parse(text) : null;
}

function getPackageCompareStats(aasPackage) {
  const submodels = aasPackage.submodels ?? [];
  return {
    shells: aasPackage.assetAdministrationShells?.length ?? 0,
    submodels: submodels.length,
    elements: countSubmodelElements(submodels),
  };
}

function diffComparableValues(baseValue, targetValue) {
  const baseFlat = flattenComparableValue(baseValue);
  const targetFlat = flattenComparableValue(targetValue);
  return [...new Set([...baseFlat.keys(), ...targetFlat.keys()])]
    .sort()
    .filter((path) => baseFlat.get(path) !== targetFlat.get(path))
    .map((path) => ({
      path,
      before: baseFlat.has(path) ? baseFlat.get(path) : "nicht gesetzt",
      after: targetFlat.has(path) ? targetFlat.get(path) : "nicht gesetzt",
    }));
}

function flattenComparableValue(value, path = "", output = new Map()) {
  if (value === null || typeof value !== "object") {
    output.set(path || "value", formatCompareValue(value));
    return output;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      output.set(path || "value", "[]");
      return output;
    }
    value.forEach((entry, index) => flattenComparableValue(entry, `${path}[${index}]`, output));
    return output;
  }

  const keys = Object.keys(value).sort();
  if (keys.length === 0) {
    output.set(path || "value", "{}");
    return output;
  }

  keys.forEach((key) => {
    const nextPath = path ? `${path}.${key}` : key;
    flattenComparableValue(value[key], nextPath, output);
  });
  return output;
}

function formatCompareValue(value) {
  if (value === undefined) return "nicht gesetzt";
  if (value === null) return "null";
  if (value === "") return "leer";
  return String(value);
}

function stableJson(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  return `{${Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`)
    .join(",")}}`;
}

function renderCompareResult(base, target, comparison) {
  const changedCount = comparison.added.length + comparison.removed.length + comparison.changed.length;
  compareResult.className = "compare-result";
  compareResult.innerHTML = `
    <div class="compare-header">
      <div>
        <h3>${escapeHtml(base.asset.idShort)}: v${base.version} gegen v${target.version}</h3>
        <div class="repository-meta">${escapeHtml(base.asset.globalAssetId)}</div>
      </div>
      <span class="status-pill ${changedCount ? "warning" : "valid"}">${changedCount ? `${changedCount} Unterschiede` : "Keine Unterschiede"}</span>
    </div>
    <div class="compare-version-meta">
      <div><strong>Basis v${base.version}</strong><span>${formatDateTime(base.createdAt)} | ${escapeHtml(base.changeReason)}</span></div>
      <div><strong>Ziel v${target.version}</strong><span>${formatDateTime(target.createdAt)} | ${escapeHtml(target.changeReason)}</span></div>
    </div>
    <div class="compare-summary-grid">
      ${renderCompareSummary("AAS", comparison.baseStats.shells, comparison.targetStats.shells)}
      ${renderCompareSummary("Submodels", comparison.baseStats.submodels, comparison.targetStats.submodels)}
      ${renderCompareSummary("Elements", comparison.baseStats.elements, comparison.targetStats.elements)}
      <div><strong>${comparison.unchanged.length}</strong><span>Unveraendert</span></div>
    </div>
    <div class="compare-groups">
      ${renderCompareGroup("Geaendert", comparison.changed, "changed")}
      ${renderCompareGroup("Hinzugefuegt", comparison.added, "added")}
      ${renderCompareGroup("Entfernt", comparison.removed, "removed")}
    </div>
  `;
}

function renderCompareSummary(label, baseValue, targetValue) {
  const changed = baseValue !== targetValue;
  return `
    <div class="${changed ? "changed" : ""}">
      <strong>${escapeHtml(baseValue)} -> ${escapeHtml(targetValue)}</strong>
      <span>${escapeHtml(label)}</span>
    </div>
  `;
}

function renderCompareGroup(title, entries, kind) {
  return `
    <section class="compare-group">
      <h3>${escapeHtml(title)} <span>${entries.length}</span></h3>
      ${
        entries.length
          ? entries.slice(0, 50).map((entry) => renderCompareItem(entry, kind)).join("")
          : `<div class="compare-empty-row">Keine Eintraege.</div>`
      }
      ${entries.length > 50 ? `<div class="compare-empty-row">${entries.length - 50} weitere Eintraege ausgeblendet.</div>` : ""}
    </section>
  `;
}

function renderCompareItem(entry, kind) {
  return `
    <article class="compare-item ${kind}">
      <div class="compare-item-head">
        <strong>${escapeHtml(entry.label)}</strong>
        <span>${escapeHtml(entry.type)} | ${escapeHtml(entry.path)}</span>
      </div>
      ${entry.changes?.length ? `<div class="field-diff-list">${entry.changes.slice(0, 12).map(renderFieldDiff).join("")}</div>` : ""}
      ${entry.changes?.length > 12 ? `<div class="compare-empty-row">${entry.changes.length - 12} weitere Feldunterschiede.</div>` : ""}
    </article>
  `;
}

function renderFieldDiff(change) {
  return `
    <div class="field-diff">
      <code>${escapeHtml(change.path)}</code>
      <span>${escapeHtml(change.before)}</span>
      <span>${escapeHtml(change.after)}</span>
    </div>
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
  if (!aasPackage || typeof aasPackage !== "object") {
    issues.push(errorIssue("Package", "AAS-Package muss ein JSON-Objekt sein."));
    return { issues, stats: { shells: 0, submodels: 0, elements: 0 } };
  }

  const shells = Array.isArray(aasPackage.assetAdministrationShells) ? aasPackage.assetAdministrationShells : [];
  const submodels = Array.isArray(aasPackage.submodels) ? aasPackage.submodels : [];
  const conceptDescriptions = Array.isArray(aasPackage.conceptDescriptions) ? aasPackage.conceptDescriptions : [];
  const submodelIds = new Set(submodels.map((submodel) => submodel.id).filter(Boolean));
  const elementCount = countSubmodelElements(submodels);

  if (!Array.isArray(aasPackage.assetAdministrationShells)) {
    issues.push(errorIssue("Package", "assetAdministrationShells muss ein Array sein."));
  }

  if (!Array.isArray(aasPackage.submodels)) {
    issues.push(errorIssue("Package", "submodels muss ein Array sein."));
  }

  if (aasPackage.conceptDescriptions !== undefined && !Array.isArray(aasPackage.conceptDescriptions)) {
    issues.push(errorIssue("Package", "conceptDescriptions muss ein Array sein."));
  }

  shells.forEach((shell, shellIndex) => {
    const path = `assetAdministrationShells[${shellIndex}]`;
    if (!isPlainObject(shell)) {
      issues.push(errorIssue(path, "AssetAdministrationShell muss ein Objekt sein."));
      return;
    }

    validateModelType(shell, "AssetAdministrationShell", path, issues);
    requireField(shell, "id", path, issues);
    requireField(shell, "idShort", path, issues);
    validateIdShort(shell.idShort, `${path}.idShort`, issues);
    validateAssetInformation(shell.assetInformation, `${path}.assetInformation`, issues);

    if (shell.submodels !== undefined && !Array.isArray(shell.submodels)) {
      issues.push(errorIssue(`${path}.submodels`, "Submodel-Referenzen muessen ein Array sein."));
    }

    for (const [referenceIndex, reference] of (Array.isArray(shell.submodels) ? shell.submodels : []).entries()) {
      const referencePath = `${path}.submodels[${referenceIndex}]`;
      validateReference(reference, referencePath, issues, {
        expectedKeyType: "Submodel",
        expectedReferenceType: "ModelReference",
      });
      const target = reference.keys?.at(-1)?.value;
      if (target && !submodelIds.has(target)) {
        issues.push(errorIssue(referencePath, `Submodel-Referenz nicht gefunden: ${target}`));
      }
    }
  });

  submodels.forEach((submodel, submodelIndex) => {
    const path = `submodels[${submodelIndex}]`;
    if (!isPlainObject(submodel)) {
      issues.push(errorIssue(path, "Submodel muss ein Objekt sein."));
      return;
    }

    validateModelType(submodel, "Submodel", path, issues);
    requireField(submodel, "id", path, issues);
    requireField(submodel, "idShort", path, issues);
    validateIdShort(submodel.idShort, `${path}.idShort`, issues);
    validateReferenceIfPresent(submodel.semanticId, `${path}.semanticId`, issues);

    if (submodel.submodelElements !== undefined && !Array.isArray(submodel.submodelElements)) {
      issues.push(errorIssue(`${path}.submodelElements`, "submodelElements muss ein Array sein."));
    } else {
      validateSubmodelElements(submodel.submodelElements ?? [], `${path}.submodelElements`, issues);
    }
  });

  conceptDescriptions.forEach((conceptDescription, conceptIndex) => {
    const path = `conceptDescriptions[${conceptIndex}]`;
    if (!isPlainObject(conceptDescription)) {
      issues.push(errorIssue(path, "ConceptDescription muss ein Objekt sein."));
      return;
    }

    validateModelType(conceptDescription, "ConceptDescription", path, issues);
    requireField(conceptDescription, "id", path, issues);
    if (conceptDescription.idShort) validateIdShort(conceptDescription.idShort, `${path}.idShort`, issues);
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

function validateModelType(entity, expectedModelType, path, issues) {
  if (!entity.modelType) {
    issues.push(errorIssue(path, `modelType fehlt; erwartet wird "${expectedModelType}".`));
    return;
  }

  if (!aasModelTypes.has(entity.modelType)) {
    issues.push(errorIssue(path, `Unbekannter modelType "${entity.modelType}".`));
    return;
  }

  if (entity.modelType !== expectedModelType) {
    issues.push(errorIssue(path, `modelType muss "${expectedModelType}" sein, ist aber "${entity.modelType}".`));
  }
}

function validateSubmodelElements(elements, path, issues, options = {}) {
  if (!Array.isArray(elements)) {
    issues.push(errorIssue(path, "Submodel-Elemente muessen ein Array sein."));
    return;
  }

  const seenElements = new Set();
  elements.forEach((element, elementIndex) => {
    const elementPath = `${path}[${elementIndex}]`;
    if (options.enforceUniqueIdShort !== false && typeof element?.idShort === "string") {
      if (seenElements.has(element.idShort)) {
        issues.push(warnIssue(elementPath, `Doppeltes idShort in diesem Kontext: ${element.idShort}`));
      }
      seenElements.add(element.idShort);
    }
    validateSubmodelElement(element, elementPath, issues, options);
  });
}

function validateSubmodelElement(element, path, issues, options = {}) {
  if (!isPlainObject(element)) {
    issues.push(errorIssue(path, "Submodel-Element muss ein Objekt sein."));
    return;
  }

  if (!element.modelType) {
    issues.push(errorIssue(path, "modelType fehlt."));
  } else if (!submodelElementTypes.has(element.modelType)) {
    issues.push(errorIssue(path, `modelType "${element.modelType}" ist kein AAS-3.x-SubmodelElement.`));
  }

  if (options.requireIdShort === false) {
    if (element.idShort) validateIdShort(element.idShort, `${path}.idShort`, issues);
  } else {
    requireField(element, "idShort", path, issues);
    validateIdShort(element.idShort, `${path}.idShort`, issues);
  }

  if (element.semanticId) {
    validateReference(element.semanticId, `${path}.semanticId`, issues);
  } else {
    issues.push(warnIssue(path, "semanticId fehlt; Interoperabilitaet ist eingeschraenkt."));
  }

  validateQualifiers(element.qualifiers, `${path}.qualifiers`, issues);

  switch (element.modelType) {
    case "Property":
      validateProperty(element, path, issues);
      break;
    case "MultiLanguageProperty":
      validateMultiLanguageProperty(element, path, issues);
      break;
    case "Range":
      validateRange(element, path, issues);
      break;
    case "Blob":
    case "File":
      validateContentElement(element, path, issues);
      break;
    case "ReferenceElement":
      validateReferenceIfPresent(element.value, `${path}.value`, issues);
      break;
    case "RelationshipElement":
    case "AnnotatedRelationshipElement":
      validateRelationshipElement(element, path, issues);
      break;
    case "Entity":
      validateEntity(element, path, issues);
      break;
    case "SubmodelElementCollection":
      validateCollection(element, path, issues);
      break;
    case "SubmodelElementList":
      validateElementList(element, path, issues);
      break;
    case "Operation":
      validateOperation(element, path, issues);
      break;
    case "BasicEventElement":
      validateBasicEventElement(element, path, issues);
      break;
    default:
      break;
  }
}

function validateProperty(element, path, issues) {
  if (!element.valueType) {
    issues.push(errorIssue(path, "Property ohne valueType."));
    return;
  }

  validateValueType(element.valueType, `${path}.valueType`, issues);
  validatePropertyValueByType(element.value, element.valueType, `${path}.value`, issues);
}

function validateRange(element, path, issues) {
  if (!element.valueType) {
    issues.push(errorIssue(path, "Range ohne valueType."));
    return;
  }

  validateValueType(element.valueType, `${path}.valueType`, issues);
  validatePropertyValueByType(element.min, element.valueType, `${path}.min`, issues);
  validatePropertyValueByType(element.max, element.valueType, `${path}.max`, issues);
}

function validateMultiLanguageProperty(element, path, issues) {
  if (element.value === undefined) return;
  if (!Array.isArray(element.value)) {
    issues.push(errorIssue(`${path}.value`, "MultiLanguageProperty.value muss ein Array sein."));
    return;
  }

  element.value.forEach((entry, entryIndex) => {
    const entryPath = `${path}.value[${entryIndex}]`;
    if (!isPlainObject(entry)) {
      issues.push(errorIssue(entryPath, "LangString muss ein Objekt sein."));
      return;
    }
    requireField(entry, "language", entryPath, issues);
    requireField(entry, "text", entryPath, issues);
    if (entry.language && !/^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})*$/.test(entry.language)) {
      issues.push(warnIssue(`${entryPath}.language`, `language "${entry.language}" sieht nicht wie ein BCP-47-Tag aus.`));
    }
  });
}

function validateContentElement(element, path, issues) {
  if (!element.contentType) {
    issues.push(errorIssue(path, `${element.modelType} braucht contentType.`));
  } else if (typeof element.contentType !== "string") {
    issues.push(errorIssue(`${path}.contentType`, "contentType muss ein String sein."));
  }
}

function validateRelationshipElement(element, path, issues) {
  validateRequiredReference(element.first, `${path}.first`, issues);
  validateRequiredReference(element.second, `${path}.second`, issues);

  if (element.modelType === "AnnotatedRelationshipElement") {
    if (element.annotations !== undefined && !Array.isArray(element.annotations)) {
      issues.push(errorIssue(`${path}.annotations`, "annotations muss ein Array sein."));
    } else {
      validateSubmodelElements(element.annotations ?? [], `${path}.annotations`, issues);
    }
  }
}

function validateEntity(element, path, issues) {
  if (!element.entityType) {
    issues.push(errorIssue(path, "Entity ohne entityType."));
  } else if (!entityTypes.has(element.entityType)) {
    issues.push(errorIssue(`${path}.entityType`, `entityType "${element.entityType}" ist nicht gueltig.`));
  }

  if (element.statements !== undefined && !Array.isArray(element.statements)) {
    issues.push(errorIssue(`${path}.statements`, "statements muss ein Array sein."));
  } else {
    validateSubmodelElements(element.statements ?? [], `${path}.statements`, issues);
  }

  if (element.entityType === "SelfManagedEntity" && !element.globalAssetId && !element.specificAssetIds) {
    issues.push(warnIssue(path, "SelfManagedEntity sollte globalAssetId oder specificAssetIds setzen."));
  }
}

function validateCollection(element, path, issues) {
  if (element.value !== undefined && !Array.isArray(element.value)) {
    issues.push(errorIssue(`${path}.value`, "SubmodelElementCollection.value muss ein Array sein."));
    return;
  }

  validateSubmodelElements(element.value ?? [], `${path}.value`, issues);
}

function validateElementList(element, path, issues) {
  if (element.value !== undefined && !Array.isArray(element.value)) {
    issues.push(errorIssue(`${path}.value`, "SubmodelElementList.value muss ein Array sein."));
    return;
  }

  if (!element.typeValueList) {
    issues.push(warnIssue(path, "SubmodelElementList ohne typeValueList ist schwer interoperabel."));
  } else if (!submodelElementTypes.has(element.typeValueList)) {
    issues.push(errorIssue(`${path}.typeValueList`, `typeValueList "${element.typeValueList}" ist nicht gueltig.`));
  }

  validateSubmodelElements(element.value ?? [], `${path}.value`, issues, {
    requireIdShort: false,
    enforceUniqueIdShort: false,
  });

  if (element.typeValueList) {
    (element.value ?? []).forEach((child, childIndex) => {
      if (child?.modelType && child.modelType !== element.typeValueList) {
        issues.push(
          errorIssue(
            `${path}.value[${childIndex}]`,
            `Listenelement muss modelType "${element.typeValueList}" haben, ist aber "${child.modelType}".`,
          ),
        );
      }
    });
  }
}

function validateOperation(element, path, issues) {
  validateOperationVariables(element.inputVariables, `${path}.inputVariables`, issues);
  validateOperationVariables(element.outputVariables, `${path}.outputVariables`, issues);
  validateOperationVariables(element.inoutputVariables, `${path}.inoutputVariables`, issues);
}

function validateOperationVariables(variables, path, issues) {
  if (variables === undefined) return;
  if (!Array.isArray(variables)) {
    issues.push(errorIssue(path, "OperationVariables muessen ein Array sein."));
    return;
  }

  variables.forEach((variable, variableIndex) => {
    const variablePath = `${path}[${variableIndex}]`;
    if (!isPlainObject(variable)) {
      issues.push(errorIssue(variablePath, "OperationVariable muss ein Objekt sein."));
      return;
    }
    if (!variable.value) {
      issues.push(errorIssue(variablePath, "OperationVariable.value fehlt."));
    } else {
      validateSubmodelElement(variable.value, `${variablePath}.value`, issues, { requireIdShort: false });
    }
  });
}

function validateBasicEventElement(element, path, issues) {
  validateRequiredReference(element.observed, `${path}.observed`, issues, { expectedReferenceType: "ModelReference" });

  if (element.direction && !eventDirections.has(element.direction)) {
    issues.push(errorIssue(`${path}.direction`, `direction "${element.direction}" ist nicht gueltig.`));
  }

  if (element.state && !eventStates.has(element.state)) {
    issues.push(errorIssue(`${path}.state`, `state "${element.state}" ist nicht gueltig.`));
  }
}

function validateAssetInformation(assetInformation, path, issues) {
  if (!isPlainObject(assetInformation)) {
    issues.push(errorIssue(path, "assetInformation fehlt oder ist kein Objekt."));
    return;
  }

  if (!assetInformation.assetKind) {
    issues.push(errorIssue(path, "assetKind fehlt."));
  } else if (!assetKinds.has(assetInformation.assetKind)) {
    issues.push(errorIssue(`${path}.assetKind`, `assetKind "${assetInformation.assetKind}" ist nicht gueltig.`));
  }

  if (!assetInformation.globalAssetId) {
    issues.push(warnIssue(path, "globalAssetId fehlt."));
  }

  if (assetInformation.specificAssetIds !== undefined && !Array.isArray(assetInformation.specificAssetIds)) {
    issues.push(errorIssue(`${path}.specificAssetIds`, "specificAssetIds muss ein Array sein."));
  }
}

function validateReferenceIfPresent(reference, path, issues, options = {}) {
  if (reference === undefined || reference === null || reference === "") return;
  validateReference(reference, path, issues, options);
}

function validateRequiredReference(reference, path, issues, options = {}) {
  if (!reference) {
    issues.push(errorIssue(path, "Reference fehlt."));
    return;
  }
  validateReference(reference, path, issues, options);
}

function validateReference(reference, path, issues, options = {}) {
  if (!isPlainObject(reference)) {
    issues.push(errorIssue(path, "Reference muss ein Objekt sein."));
    return;
  }

  if (!reference.type) {
    issues.push(errorIssue(path, "Reference.type fehlt."));
  } else if (!aasReferenceTypes.has(reference.type)) {
    issues.push(errorIssue(`${path}.type`, `Reference.type "${reference.type}" ist nicht gueltig.`));
  } else if (options.expectedReferenceType && reference.type !== options.expectedReferenceType) {
    issues.push(
      warnIssue(path, `AAS 3.x erwartet Reference.type "${options.expectedReferenceType}" fuer diese Referenz.`),
    );
  }

  if (!Array.isArray(reference.keys) || reference.keys.length === 0) {
    issues.push(errorIssue(path, "Reference.keys muss ein nicht-leeres Array sein."));
    return;
  }

  reference.keys.forEach((key, keyIndex) => {
    const keyPath = `${path}.keys[${keyIndex}]`;
    if (!isPlainObject(key)) {
      issues.push(errorIssue(keyPath, "Key muss ein Objekt sein."));
      return;
    }
    if (!key.type) {
      issues.push(errorIssue(keyPath, "Key.type fehlt."));
    } else if (!aasKeyTypes.has(key.type)) {
      issues.push(errorIssue(`${keyPath}.type`, `Key.type "${key.type}" ist nicht gueltig.`));
    }
    if (!key.value) {
      issues.push(errorIssue(keyPath, "Key.value fehlt."));
    }
  });

  const lastKeyType = reference.keys.at(-1)?.type;
  if (options.expectedKeyType && lastKeyType && lastKeyType !== options.expectedKeyType) {
    issues.push(errorIssue(path, `Letzter Key muss Typ "${options.expectedKeyType}" haben, ist aber "${lastKeyType}".`));
  }
}

function validateQualifiers(qualifiers, path, issues) {
  if (qualifiers === undefined) return;
  if (!Array.isArray(qualifiers)) {
    issues.push(errorIssue(path, "qualifiers muss ein Array sein."));
    return;
  }

  qualifiers.forEach((qualifier, qualifierIndex) => {
    const qualifierPath = `${path}[${qualifierIndex}]`;
    if (!isPlainObject(qualifier)) {
      issues.push(errorIssue(qualifierPath, "Qualifier muss ein Objekt sein."));
      return;
    }
    requireField(qualifier, "type", qualifierPath, issues);
    if (qualifier.valueType) {
      validateValueType(qualifier.valueType, `${qualifierPath}.valueType`, issues);
      validatePropertyValueByType(qualifier.value, qualifier.valueType, `${qualifierPath}.value`, issues);
    }
  });
}

function validateIdShort(value, path, issues) {
  if (value === undefined || value === null || value === "") return;
  if (!isValidIdShort(value)) {
    issues.push(errorIssue(path, `idShort "${value}" ist nicht AAS-3.x-kompatibel.`));
  }
}

function validateValueType(valueType, path, issues) {
  if (!aasValueTypes.has(valueType)) {
    issues.push(errorIssue(path, `valueType "${valueType}" ist kein gueltiger AAS-3.x-DataTypeDefXsd.`));
  }
}

function validatePropertyValueByType(value, valueType, path, issues) {
  if (value === undefined || value === null || value === "") return;
  const raw = String(value);

  if (valueType === "xs:boolean" && !["true", "false", "0", "1"].includes(raw.toLowerCase())) {
    issues.push(errorIssue(path, `Wert "${raw}" passt nicht zu xs:boolean.`));
  }

  const integerTypes = new Set([
    "xs:byte",
    "xs:int",
    "xs:integer",
    "xs:long",
    "xs:negativeInteger",
    "xs:nonNegativeInteger",
    "xs:nonPositiveInteger",
    "xs:positiveInteger",
    "xs:short",
    "xs:unsignedByte",
    "xs:unsignedInt",
    "xs:unsignedLong",
    "xs:unsignedShort",
  ]);

  if (integerTypes.has(valueType) && !/^-?\d+$/.test(raw)) {
    issues.push(errorIssue(path, `Wert "${raw}" passt nicht zu ${valueType}.`));
  }

  if (
    ["xs:decimal", "xs:double", "xs:float"].includes(valueType) &&
    !Number.isFinite(Number(raw))
  ) {
    issues.push(errorIssue(path, `Wert "${raw}" passt nicht zu ${valueType}.`));
  }

  if (valueType === "xs:positiveInteger" && /^-?\d+$/.test(raw) && Number(raw) <= 0) {
    issues.push(errorIssue(path, `Wert "${raw}" muss groesser als 0 sein.`));
  }

  if (["xs:nonNegativeInteger", "xs:unsignedByte", "xs:unsignedInt", "xs:unsignedLong", "xs:unsignedShort"].includes(valueType) && /^-?\d+$/.test(raw) && Number(raw) < 0) {
    issues.push(errorIssue(path, `Wert "${raw}" darf nicht negativ sein.`));
  }

  if (valueType === "xs:negativeInteger" && /^-?\d+$/.test(raw) && Number(raw) >= 0) {
    issues.push(errorIssue(path, `Wert "${raw}" muss negativ sein.`));
  }

  if (valueType === "xs:nonPositiveInteger" && /^-?\d+$/.test(raw) && Number(raw) > 0) {
    issues.push(errorIssue(path, `Wert "${raw}" darf nicht positiv sein.`));
  }

  if (valueType === "xs:date" && !/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    issues.push(errorIssue(path, `Wert "${raw}" passt nicht zu xs:date.`));
  }

  if (valueType === "xs:dateTime" && Number.isNaN(Date.parse(raw))) {
    issues.push(errorIssue(path, `Wert "${raw}" passt nicht zu xs:dateTime.`));
  }

  if (valueType === "xs:time" && !/^\d{2}:\d{2}:\d{2}/.test(raw)) {
    issues.push(errorIssue(path, `Wert "${raw}" passt nicht zu xs:time.`));
  }

  if (valueType === "xs:duration" && !/^-?P/.test(raw)) {
    issues.push(errorIssue(path, `Wert "${raw}" passt nicht zu xs:duration.`));
  }

  if (valueType === "xs:anyURI" && /\s/.test(raw)) {
    issues.push(errorIssue(path, `Wert "${raw}" enthaelt Leerzeichen und passt nicht zu xs:anyURI.`));
  }
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function renderValidation(report) {
  const errorCount = report.issues.filter((issue) => issue.level === "error").length;
  const warningCount = report.issues.filter((issue) => issue.level === "warning").length;
  const infoCount = report.issues.filter((issue) => issue.level === "info").length;

  statusLabel.className = "status-pill";
  if (errorCount > 0) {
    statusLabel.classList.add("invalid");
    statusLabel.textContent = `${errorCount} Fehler`;
  } else if (warningCount > 0) {
    statusLabel.classList.add("warning");
    statusLabel.textContent = `${warningCount} Warnungen`;
  } else {
    statusLabel.classList.add("valid");
    statusLabel.textContent = "Valide AAS 3.x";
  }

  summaryText.textContent =
    errorCount > 0
      ? "Die Datei verletzt AAS-3.x-Regeln und braucht Korrekturen vor der Weiterverarbeitung."
      : warningCount > 0
        ? "Die Struktur ist AAS-3.x-lesbar, aber einige semantische Angaben sollten ergaenzt werden."
        : "Die wichtigsten AAS-3.x-Pflichtfelder, Typen und Referenzen sind konsistent.";

  stats.innerHTML = `
    <div><strong>${report.stats.shells}</strong><span>AAS</span></div>
    <div><strong>${report.stats.submodels}</strong><span>Submodels</span></div>
    <div><strong>${report.stats.elements}</strong><span>Elements</span></div>
  `;

  issuesList.innerHTML = report.issues.length
    ? `
      <div class="issue-summary">
        <span class="issue-badge severity-error">${errorCount} Fehler</span>
        <span class="issue-badge severity-warning">${warningCount} Warnungen</span>
        ${infoCount ? `<span class="issue-badge severity-info">${infoCount} Infos</span>` : ""}
        ${renderIssueCategorySummary(report.issues)}
      </div>
      ${report.issues.map(renderIssueCard).join("")}
    `
    : `<div class="issue"><strong>Keine Issues gefunden</strong><span>AAS-3.x-Metamodel-Pruefung erfolgreich.</span></div>`;
}

function renderIssueCategorySummary(issues) {
  const categoryCounts = countIssuesByCategory(issues);
  return issueCategoryOrder
    .filter((category) => categoryCounts.get(category) > 0)
    .map(
      (category) =>
        `<span class="issue-badge category-${category}">${getIssueCategoryLabel(category)} ${categoryCounts.get(category)}</span>`,
    )
    .join("");
}

function renderIssueCard(issue) {
  return `
    <div class="issue ${getIssueLevelClass(issue.level)}">
      <div class="issue-meta">
        <span class="issue-badge ${getIssueLevelClass(issue.level)}">${getIssueSeverityLabel(issue.level)}</span>
        <span class="issue-badge category-${issue.category ?? "structure"}">${getIssueCategoryLabel(issue.category)}</span>
      </div>
      <strong>${escapeHtml(issue.title)}</strong>
      <span>${escapeHtml(issue.message)}</span>
    </div>
  `;
}

function countIssuesByCategory(issues) {
  return issues.reduce((counts, issue) => {
    const category = issue.category ?? "structure";
    counts.set(category, (counts.get(category) ?? 0) + 1);
    return counts;
  }, new Map());
}

function getIssueSeverityLabel(level) {
  return issueSeverityLabels[level] ?? level ?? "Issue";
}

function getIssueCategoryLabel(category) {
  return issueCategoryLabels[category] ?? issueCategoryLabels.structure;
}

function getIssueLevelClass(level) {
  return level === "error" ? "error" : level === "info" ? "info" : "warning";
}

function renderExplorer(aasPackage, query = "") {
  if (!aasPackage) return;

  const normalizedQuery = query.trim().toLowerCase();
  updateTreeControls(Boolean(normalizedQuery));
  const rootNode = buildExplorerTree(aasPackage);
  const visibleTree = filterTreeNode(rootNode, normalizedQuery);
  const visibleNodes = new Map();
  if (visibleTree) collectExplorerNodes(visibleTree, visibleNodes);
  explorerNodes = visibleNodes;

  const shouldPreferSearchHit =
    normalizedQuery && normalizedQuery !== lastExplorerQuery && selectedExplorerNodeId === "package";

  if (!explorerNodes.has(selectedExplorerNodeId) || shouldPreferSearchHit) {
    selectedExplorerNodeId = findPreferredVisibleNode(visibleTree, normalizedQuery)?.id ?? "package";
  }
  lastExplorerQuery = normalizedQuery;

  if (!visibleTree) {
    explorer.className = "explorer-empty";
    explorer.innerHTML = "Keine passenden Eintraege gefunden.";
    renderJsonInspector();
    return;
  }

  explorer.className = "explorer-tree";
  explorer.innerHTML = `
    <ul class="tree-list">
      ${renderTreeNode(visibleTree, 0, Boolean(normalizedQuery))}
    </ul>
  `;
  renderJsonInspector();
}

function buildExplorerTree(aasPackage) {
  const shells = aasPackage.assetAdministrationShells ?? [];
  const submodels = aasPackage.submodels ?? [];
  const conceptDescriptions = aasPackage.conceptDescriptions ?? [];
  const submodelById = new Map(submodels.map((submodel, index) => [submodel.id, { submodel, index }]));
  const referencedSubmodelIds = new Set(
    shells.flatMap((shell) => (shell.submodels ?? []).map((reference) => reference.keys?.at(-1)?.value).filter(Boolean)),
  );

  const shellNodes = shells.map((shell, shellIndex) => buildShellNode(shell, shellIndex, submodelById));
  const unreferencedSubmodels = submodels
    .map((submodel, index) => ({ submodel, index }))
    .filter(({ submodel }) => !referencedSubmodelIds.has(submodel.id));
  const groupNodes = [];

  if (unreferencedSubmodels.length > 0) {
    groupNodes.push(
      createExplorerNode({
        id: "unreferenced-submodels",
        kind: "Gruppe",
        label: "Nicht referenzierte Submodels",
        meta: `${unreferencedSubmodels.length} Submodels`,
        value: unreferencedSubmodels.map(({ submodel }) => submodel),
        children: unreferencedSubmodels.map(({ submodel, index }) => buildSubmodelNode(submodel, index)),
      }),
    );
  }

  if (conceptDescriptions.length > 0) {
    groupNodes.push(
      createExplorerNode({
        id: "concept-descriptions",
        kind: "Gruppe",
        label: "Concept Descriptions",
        meta: `${conceptDescriptions.length} Eintraege`,
        value: conceptDescriptions,
        children: conceptDescriptions.map(buildConceptDescriptionNode),
      }),
    );
  }

  return createExplorerNode({
    id: "package",
    kind: "Package",
    label: "AAS Package",
    meta: `${shells.length} AAS | ${submodels.length} Submodels | ${countSubmodelElements(submodels)} Elements`,
    value: aasPackage,
    children: [...shellNodes, ...groupNodes],
  });
}

function buildShellNode(shell, shellIndex, submodelById) {
  return createExplorerNode({
    id: `shell:${shellIndex}`,
    kind: "AAS",
    label: shell.idShort ?? `AAS ${shellIndex + 1}`,
    meta: shell.assetInformation?.globalAssetId ?? shell.id ?? "",
    value: shell,
    children: buildReferencedSubmodelNodes(shell, shellIndex, submodelById),
  });
}

function buildReferencedSubmodelNodes(shell, shellIndex, submodelById) {
  return (shell.submodels ?? []).map((reference, referenceIndex) => {
    const target = reference.keys?.at(-1)?.value;
    const match = submodelById.get(target);
    if (match) return buildSubmodelNode(match.submodel, match.index);

    return createExplorerNode({
      id: `shell:${shellIndex}:missing-submodel:${referenceIndex}`,
      kind: "Referenz",
      label: target || `Submodel-Referenz ${referenceIndex + 1}`,
      meta: "Nicht gefunden",
      value: reference,
      children: [],
    });
  });
}

function buildSubmodelNode(submodel, submodelIndex) {
  const elements = submodel.submodelElements ?? [];
  return createExplorerNode({
    id: `submodel:${submodelIndex}`,
    kind: "Submodel",
    label: submodel.idShort ?? `Submodel ${submodelIndex + 1}`,
    meta: `${elements.length} Elements | ${submodel.id ?? ""}`,
    value: submodel,
    children: elements.map((element, elementIndex) => buildElementNode(element, submodelIndex, [elementIndex])),
  });
}

function buildElementNode(element, submodelIndex, elementPath) {
  const children = getElementChildren(element);
  const unit = element.qualifiers?.find((qualifier) => qualifier.type === "unit")?.value;
  const valueLabel = children.length
    ? `${children.length} Children`
    : [element.valueType, formatValue(element.value), unit].filter(Boolean).join(" ");

  return createExplorerNode({
    id: `submodel:${submodelIndex}:element:${elementPath.join("-")}`,
    kind: element.modelType ?? "Element",
    label: element.idShort ?? `Element ${elementPath.at(-1) + 1}`,
    meta: valueLabel,
    value: element,
    children: children.map((child, childIndex) => buildElementNode(child, submodelIndex, [...elementPath, childIndex])),
  });
}

function getElementChildren(element) {
  switch (element?.modelType) {
    case "SubmodelElementCollection":
    case "SubmodelElementList":
      return Array.isArray(element.value) ? element.value.filter(isPlainObject) : [];
    case "Entity":
      return Array.isArray(element.statements) ? element.statements.filter(isPlainObject) : [];
    case "AnnotatedRelationshipElement":
      return Array.isArray(element.annotations) ? element.annotations.filter(isPlainObject) : [];
    case "Operation":
      return [
        ...(element.inputVariables ?? []),
        ...(element.outputVariables ?? []),
        ...(element.inoutputVariables ?? []),
      ]
        .map((variable) => variable?.value)
        .filter(isPlainObject);
    default:
      return [];
  }
}

function buildConceptDescriptionNode(conceptDescription, index) {
  return createExplorerNode({
    id: `concept:${index}`,
    kind: "Concept",
    label: conceptDescription.idShort ?? conceptDescription.id ?? `Concept ${index + 1}`,
    meta: conceptDescription.id ?? "",
    value: conceptDescription,
    children: [],
  });
}

function createExplorerNode({ id, kind, label, meta, value, children = [] }) {
  return {
    id,
    kind,
    label,
    meta,
    value,
    children,
  };
}

function filterTreeNode(node, normalizedQuery) {
  if (!normalizedQuery || nodeMatchesQuery(node, normalizedQuery)) return node;

  const children = node.children
    .map((child) => filterTreeNode(child, normalizedQuery))
    .filter(Boolean);

  if (children.length === 0) return null;
  return { ...node, children };
}

function nodeMatchesQuery(node, normalizedQuery) {
  const haystack = [
    node.kind,
    node.label,
    node.meta,
    JSON.stringify(getSearchableValue(node.value)),
  ].join(" ");
  return haystack.toLowerCase().includes(normalizedQuery);
}

function getSearchableValue(value) {
  if (!value || typeof value !== "object") return value;
  if (Array.isArray(value)) {
    return value.every((item) => item && typeof item === "object") ? [] : value;
  }

  return Object.fromEntries(
    Object.entries(value)
      .filter(([key, entry]) => !isNestedModelArray(key, entry))
      .map(([key, entry]) => [key, getSearchableValue(entry)]),
  );
}

function isNestedModelArray(key, value) {
  return nestedModelSearchKeys.has(key) && Array.isArray(value) && value.every((item) => item && typeof item === "object");
}

function collectExplorerNodes(node, nodes) {
  nodes.set(node.id, node);
  node.children.forEach((child) => collectExplorerNodes(child, nodes));
}

function findPreferredVisibleNode(node, normalizedQuery) {
  if (!node) return null;
  if (normalizedQuery && node.id !== "package" && nodeMatchesQuery(node, normalizedQuery)) return node;

  for (const child of node.children) {
    const match = findPreferredVisibleNode(child, normalizedQuery);
    if (match) return match;
  }

  return node;
}

function renderTreeNode(node, depth, forceExpanded) {
  const hasChildren = node.children.length > 0;
  const isExpanded = hasChildren && (forceExpanded || expandedExplorerNodeIds.has(node.id));
  const isSelected = node.id === selectedExplorerNodeId;

  return `
    <li>
      <div class="tree-node${isSelected ? " selected" : ""}" style="--tree-depth: ${depth}">
        <button
          class="tree-toggle"
          type="button"
          data-tree-toggle="${escapeHtml(node.id)}"
          aria-label="${isExpanded ? "Knoten schliessen" : "Knoten oeffnen"}"
          aria-expanded="${isExpanded}"
          ${hasChildren ? "" : "disabled"}
        >${hasChildren ? (isExpanded ? "-" : "+") : ""}</button>
        <button class="tree-select" type="button" data-node-id="${escapeHtml(node.id)}">
          <span class="tree-kind">${escapeHtml(node.kind)}</span>
          <span class="tree-label">${escapeHtml(node.label)}</span>
          ${node.meta ? `<span class="tree-meta">${escapeHtml(node.meta)}</span>` : ""}
        </button>
      </div>
      ${
        isExpanded
          ? `<ul class="tree-list">${node.children.map((child) => renderTreeNode(child, depth + 1, forceExpanded)).join("")}</ul>`
          : ""
      }
    </li>
  `;
}

function renderJsonInspector() {
  const node = explorerNodes.get(selectedExplorerNodeId);
  if (!node) {
    jsonInspectorTitle.textContent = "Keine Auswahl";
    jsonInspectorMeta.textContent = "Keine passenden Daten im aktuellen Filter.";
    jsonInspectorContent.textContent = "Keine Daten geladen.";
    copyJsonButton.disabled = true;
    return;
  }

  const childLabel = node.children.length === 1 ? "1 Unterknoten" : `${node.children.length} Unterknoten`;
  jsonInspectorTitle.textContent = node.label;
  jsonInspectorMeta.textContent = [node.kind, node.meta, childLabel].filter(Boolean).join(" | ");
  jsonInspectorContent.textContent = JSON.stringify(node.value, null, 2);
  copyJsonButton.disabled = false;
}

function updateTreeControls(hasActiveSearch) {
  const disabled = !currentPackage || hasActiveSearch;
  expandTreeButton.disabled = disabled;
  collapseTreeButton.disabled = disabled;
}

function countSubmodelElements(submodels) {
  return submodels.reduce((count, submodel) => {
    return count + countElements(submodel.submodelElements ?? []);
  }, 0);
}

function countElements(elements) {
  return elements.reduce((count, element) => {
    return count + 1 + countElements(getElementChildren(element));
  }, 0);
}

function renderError(error) {
  currentPackage = null;
  currentValidationReport = null;
  downloadButton.disabled = true;
  downloadAasxButton.disabled = true;
  downloadPdfButton.disabled = true;
  downloadExcelButton.disabled = true;
  downloadValidationReportButton.disabled = true;
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
  resetExplorerState();
  updateTreeControls(false);
  explorer.className = "explorer-empty";
  explorer.textContent = "Die Datei konnte nicht geladen werden.";
  renderJsonInspector();
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

function errorIssue(title, message, category) {
  return createIssue("error", title, message, category);
}

function warnIssue(title, message, category) {
  return createIssue("warning", title, message, category);
}

function infoIssue(title, message, category) {
  return createIssue("info", title, message, category);
}

function createIssue(level, title, message, category) {
  return {
    level,
    severity: level,
    category: category ?? inferIssueCategory(title, message),
    title,
    message,
  };
}

function inferIssueCategory(title, message) {
  const text = `${title} ${message}`.toLowerCase();
  if (text.includes("reference") || text.includes("referenz") || text.includes("key.")) return "references";
  if (
    text.includes("valuetype") ||
    text.includes("datatype") ||
    text.includes("wert") ||
    text.includes("xs:") ||
    text.includes("contenttype") ||
    text.includes("language")
  ) {
    return "datatypes";
  }
  if (
    text.includes("semanticid") ||
    text.includes("globalassetid") ||
    text.includes("interoperabilitaet")
  ) {
    return "interoperability";
  }
  if (
    text.includes("assetkind") ||
    text.includes("entitytype") ||
    text.includes("typevaluelist") ||
    text.includes("qualifier")
  ) {
    return "semantics";
  }
  return "structure";
}

function referenceTo(type, value) {
  return {
    type: type === "Submodel" ? "ModelReference" : "ExternalReference",
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
  return typeof value === "string" && /^[A-Za-z][A-Za-z0-9_-]*$/.test(value);
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
