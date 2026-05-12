import { createAasxBlob } from "./aasx-export.js";
import { readAasxPackage } from "./aasx-import.js";
import { createAasPdfBlob } from "./pdf-export.js";
import { createAasExcelBlob } from "./xlsx-export.js";
import { createValidationReportBlob } from "./validation-report-export.js";

const fileInput = document.querySelector("#fileInput");
const dropZone = document.querySelector(".drop-zone");
const loadSampleButton = document.querySelector("#loadSampleButton");
const homeLoadSampleButton = document.querySelector("#homeLoadSampleButton");
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
const submodelTemplateSelect = document.querySelector("#submodelTemplateSelect");
const addTemplateButton = document.querySelector("#addTemplateButton");
const templatePreview = document.querySelector("#templatePreview");
const generatorPreview = document.querySelector("#generatorPreview");
const dashboardElementSelect = document.querySelector("#dashboardElementSelect");
const dashboardWidgetType = document.querySelector("#dashboardWidgetType");
const dashboardLiveToggle = document.querySelector("#dashboardLiveToggle");
const addDashboardWidgetButton = document.querySelector("#addDashboardWidgetButton");
const refreshDashboardButton = document.querySelector("#refreshDashboardButton");
const saveDashboardLayoutButton = document.querySelector("#saveDashboardLayoutButton");
const loadDashboardLayoutButton = document.querySelector("#loadDashboardLayoutButton");
const clearDashboardLayoutButton = document.querySelector("#clearDashboardLayoutButton");
const dashboardStatus = document.querySelector("#dashboardStatus");
const dashboardGrid = document.querySelector("#dashboardGrid");
const gatewayForm = document.querySelector("#gatewayForm");
const gatewayUnifiedStatus = document.querySelector("#gatewayUnifiedStatus");
const gatewayLiveStreamStatus = document.querySelector("#gatewayLiveStreamStatus");
const gatewayLiveValues = document.querySelector("#gatewayLiveValues");
const gatewayBackendStatus = document.querySelector("#gatewayBackendStatus");
const refreshGatewayBackendButton = document.querySelector("#refreshGatewayBackendButton");
const opcUaConnectionList = document.querySelector("#opcUaConnectionList");
const mqttBackendStatus = document.querySelector("#mqttBackendStatus");
const mqttSubscriptionList = document.querySelector("#mqttSubscriptionList");
const repositoryForm = document.querySelector("#repositoryForm");
const repositoryReason = document.querySelector("#repositoryReason");
const saveRepositoryButton = document.querySelector("#saveRepositoryButton");
const refreshRepositoryButton = document.querySelector("#refreshRepositoryButton");
const repositorySearchForm = document.querySelector("#repositorySearchForm");
const repositoryRoleSelect = document.querySelector("#repositoryRoleSelect");
const repositoryAccessSummary = document.querySelector("#repositoryAccessSummary");
const repositoryStatus = document.querySelector("#repositoryStatus");
const repositoryList = document.querySelector("#repositoryList");
const repositoryEvents = document.querySelector("#repositoryEvents");
const repositoryAssetSearch = document.querySelector("#repositoryAssetSearch");
const repositoryManufacturerSearch = document.querySelector("#repositoryManufacturerSearch");
const repositorySemanticSearch = document.querySelector("#repositorySemanticSearch");
const repositorySubmodelSearch = document.querySelector("#repositorySubmodelSearch");
const clearRepositorySearchButton = document.querySelector("#clearRepositorySearchButton");
const compareResult = document.querySelector("#compareResult");
const routeLinks = [...document.querySelectorAll("[data-route-link]")];

let currentPackage = null;
let currentValidationReport = null;
let currentFileName = "aas-export";
let pendingTableImport = null;
let gatewayMappingCounter = 1;
let submodelCounter = 1;
let propertyCounter = 1;
let gatewayStatus = null;
let gatewayEventSource = null;
let opcUaConnections = [];
let mqttSubscriptions = [];
let repositoryAssets = [];
let explorerNodes = new Map();
let selectedExplorerNodeId = "package";
let expandedExplorerNodeIds = new Set(["package"]);
let lastExplorerQuery = "";
let selectedRepositoryEventAssetId = "";
let dashboardElementCatalog = [];
let dashboardWidgets = [];
let dashboardLiveTimer = null;

const dashboardLayoutStorageKey = "aasWorkbenchDashboardLayout";

const repositoryRoleDescriptions = {
  viewer: "Viewer darf Repository-Eintraege laden, vergleichen und Traceability Events ansehen. Speichern ist gesperrt.",
  editor: "Editor darf Repository-Eintraege laden, vergleichen, Events ansehen und neue Versionen speichern.",
  admin: "Admin hat vollen Repository-Zugriff fuer diese lokale Workbench.",
};

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
  units: "Units",
  interoperability: "Interoperabilitaet",
};

const issueCategoryOrder = ["structure", "references", "datatypes", "semantics", "units", "interoperability"];

const knownSemanticIdPrefixes = [
  "https://admin-shell.io/",
  "http://admin-shell.io/",
  "https://admin-shell.io/idta/",
  "https://admin-shell.io/zvei/",
  "https://industrialdigitaltwin.org/",
  "https://www.hsu-hh.de/aut/aas/",
];

const modelReferenceRootKeyTypes = new Set(["AssetAdministrationShell", "ConceptDescription", "Submodel"]);
const modelReferenceFragmentKeyTypes = new Set([
  "AnnotatedRelationshipElement",
  "BasicEventElement",
  "Blob",
  "Capability",
  "Entity",
  "File",
  "FragmentReference",
  "MultiLanguageProperty",
  "Operation",
  "Property",
  "Range",
  "ReferenceElement",
  "RelationshipElement",
  "SubmodelElement",
  "SubmodelElementCollection",
  "SubmodelElementList",
]);
const externalReferenceKeyTypes = new Set(["GlobalReference", "FragmentReference"]);
const numericValueTypes = new Set([
  "xs:byte",
  "xs:decimal",
  "xs:double",
  "xs:float",
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
const integerValueTypes = new Set([
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
const integerValueBounds = {
  "xs:byte": [-128n, 127n],
  "xs:short": [-32768n, 32767n],
  "xs:int": [-2147483648n, 2147483647n],
  "xs:long": [-9223372036854775808n, 9223372036854775807n],
  "xs:unsignedByte": [0n, 255n],
  "xs:unsignedShort": [0n, 65535n],
  "xs:unsignedInt": [0n, 4294967295n],
  "xs:unsignedLong": [0n, 18446744073709551615n],
};
const commonUnitSymbols = new Set([
  "%",
  "1",
  "A",
  "Hz",
  "K",
  "Pa",
  "V",
  "W",
  "bar",
  "cm",
  "count",
  "g",
  "h",
  "kg",
  "kPa",
  "kV",
  "kW",
  "kWh",
  "kWh/part",
  "m",
  "m/s",
  "min",
  "mm",
  "ms",
  "part",
  "parts",
  "parts/h",
  "rpm",
  "s",
]);

const sampleCsv = `assetId,assetName,submodelId,submodelName,idShort,valueType,value,semanticId,unit
urn:example:asset:Pump-001,Pump 001,urn:example:submodel:Pump-001:TechnicalData,Technical Data,Manufacturer,string,ACME Industrial,https://admin-shell.io/idta/Manufacturer,
urn:example:asset:Pump-001,Pump 001,urn:example:submodel:Pump-001:TechnicalData,Technical Data,NominalPower,double,7.5,https://admin-shell.io/idta/NominalPower,kW
urn:example:asset:Pump-001,Pump 001,urn:example:submodel:Pump-001:OperationalData,Operational Data,OperatingHours,integer,1840,https://admin-shell.io/idta/OperatingHours,h
urn:example:asset:Pump-001,Pump 001,urn:example:submodel:Pump-001:OperationalData,Operational Data,Status,string,Running,https://admin-shell.io/idta/Status,`;

const submodelTemplates = [
  {
    key: "technicalData",
    label: "Technical Data",
    description: "Basisdaten fuer Hersteller, Seriennummer und Nennleistung.",
    idShort: "TechnicalData",
    properties: [
      {
        idShort: "Manufacturer",
        valueType: "string",
        value: "ACME Industrial",
        semanticId: "https://admin-shell.io/idta/Manufacturer",
        unit: "",
      },
      {
        idShort: "SerialNumber",
        valueType: "string",
        value: "SN-001",
        semanticId: "https://admin-shell.io/idta/SerialNumber",
        unit: "",
      },
      {
        idShort: "NominalPower",
        valueType: "double",
        value: "7.5",
        semanticId: "https://admin-shell.io/idta/NominalPower",
        unit: "kW",
      },
    ],
  },
  {
    key: "nameplate",
    label: "Nameplate",
    description: "Typenschilddaten fuer Produktbezeichnung, Hersteller und Baujahr.",
    idShort: "Nameplate",
    properties: [
      {
        idShort: "ManufacturerName",
        valueType: "string",
        value: "ACME Industrial",
        semanticId: "https://admin-shell.io/idta/ManufacturerName",
        unit: "",
      },
      {
        idShort: "ManufacturerProductDesignation",
        valueType: "string",
        value: "Pump 001",
        semanticId: "https://admin-shell.io/idta/ManufacturerProductDesignation",
        unit: "",
      },
      {
        idShort: "YearOfConstruction",
        valueType: "integer",
        value: "2026",
        semanticId: "https://admin-shell.io/idta/YearOfConstruction",
        unit: "",
      },
    ],
  },
  {
    key: "operationalData",
    label: "Operational Data",
    description: "Betriebswerte fuer Laufzeit, Status und Auslastung.",
    idShort: "OperationalData",
    properties: [
      {
        idShort: "OperatingHours",
        valueType: "integer",
        value: "1840",
        semanticId: "https://admin-shell.io/idta/OperatingHours",
        unit: "h",
      },
      {
        idShort: "Status",
        valueType: "string",
        value: "Running",
        semanticId: "https://admin-shell.io/idta/Status",
        unit: "",
      },
      {
        idShort: "Utilization",
        valueType: "double",
        value: "72.5",
        semanticId: "https://admin-shell.io/idta/Utilization",
        unit: "%",
      },
    ],
  },
  {
    key: "maintenance",
    label: "Maintenance",
    description: "Wartungsdaten fuer letzte und naechste Instandhaltung.",
    idShort: "Maintenance",
    properties: [
      {
        idShort: "LastMaintenanceDate",
        valueType: "date",
        value: "2026-01-15",
        semanticId: "https://admin-shell.io/idta/LastMaintenanceDate",
        unit: "",
      },
      {
        idShort: "NextMaintenanceIn",
        valueType: "integer",
        value: "500",
        semanticId: "https://admin-shell.io/idta/NextMaintenanceIn",
        unit: "h",
      },
      {
        idShort: "MaintenanceStatus",
        valueType: "string",
        value: "Planned",
        semanticId: "https://admin-shell.io/idta/MaintenanceStatus",
        unit: "",
      },
    ],
  },
];

window.addEventListener("hashchange", applyRoute);
applyRoute();
initializeRepositoryAccess();
renderTemplateOptions();
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
renderTemplatePreview();
renderGeneratorPreview();
refreshDashboardCatalog();
renderDashboard();
refreshGatewayBackends();
startGatewayLiveStream();
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

function loadSamplePackage() {
  currentFileName = "sample-aas";
  loadPackage(rowsToAasPackage(parseCsv(sampleCsv)));
  navigateTo("explorer");
}

loadSampleButton.addEventListener("click", loadSamplePackage);
homeLoadSampleButton.addEventListener("click", loadSamplePackage);

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

window.addEventListener("beforeunload", () => {
  gatewayEventSource?.close();
});

repositoryForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  await saveCurrentPackageToRepository();
});

refreshRepositoryButton.addEventListener("click", refreshRepository);

[repositoryAssetSearch, repositoryManufacturerSearch, repositorySemanticSearch, repositorySubmodelSearch].forEach((input) => {
  input.addEventListener("input", renderFilteredRepositoryList);
});

repositorySearchForm.addEventListener("reset", () => window.setTimeout(renderFilteredRepositoryList));
clearRepositorySearchButton.addEventListener("click", clearRepositorySearch);
clearRepositorySearchButton.addEventListener("pointerdown", clearRepositorySearch);

repositoryRoleSelect.addEventListener("change", () => {
  localStorage.setItem("aasWorkbenchRepositoryRole", getRepositoryRole());
  updateRepositoryAccessState();
});

dashboardElementSelect.addEventListener("change", updateDashboardWidgetTypeState);
dashboardWidgetType.addEventListener("change", updateDashboardWidgetTypeState);
addDashboardWidgetButton.addEventListener("click", addDashboardWidgetFromSelection);
refreshDashboardButton.addEventListener("click", () => refreshDashboardValues("Dashboard-Werte aktualisiert."));
saveDashboardLayoutButton.addEventListener("click", saveDashboardLayout);
loadDashboardLayoutButton.addEventListener("click", loadDashboardLayout);
clearDashboardLayoutButton.addEventListener("click", clearDashboardLayout);
dashboardLiveToggle.addEventListener("change", updateDashboardLiveRefresh);
dashboardGrid.addEventListener("click", (event) => {
  const removeButton = event.target.closest("[data-dashboard-remove]");
  if (!removeButton) return;
  dashboardWidgets = dashboardWidgets.filter((widget) => widget.id !== removeButton.dataset.dashboardRemove);
  renderDashboard("Widget entfernt.");
});

repositoryList.addEventListener("click", async (event) => {
  const loadVersionButton = event.target.closest("[data-action='load-version']");
  if (loadVersionButton) {
    await loadRepositoryVersion(loadVersionButton.dataset.assetId, loadVersionButton.dataset.version);
    return;
  }

  const eventsButton = event.target.closest("[data-action='view-events']");
  if (eventsButton) {
    await loadRepositoryEvents(eventsButton.dataset.assetId);
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

addTemplateButton.addEventListener("click", () => {
  const template = getSelectedSubmodelTemplate();
  if (!template) return;
  addSubmodelEditor(cloneTemplateSeed(template));
});

submodelTemplateSelect.addEventListener("change", renderTemplatePreview);
manualGeneratorForm.addEventListener("input", renderGeneratorPreview);
manualGeneratorForm.addEventListener("change", renderGeneratorPreview);

submodelBuilder.addEventListener("click", (event) => {
  const addPropertyButton = event.target.closest("[data-action='add-property']");
  if (addPropertyButton) {
    addPropertyEditor(addPropertyButton.closest(".submodel-editor").querySelector(".property-list"));
    renderGeneratorPreview();
    return;
  }

  const removePropertyButton = event.target.closest("[data-action='remove-property']");
  if (removePropertyButton) {
    const propertyEditor = removePropertyButton.closest(".property-editor");
    const propertyList = propertyEditor.closest(".property-list");
    if (propertyList.querySelectorAll(".property-editor").length > 1) {
      propertyEditor.remove();
      renderGeneratorPreview();
    }
    return;
  }

  const removeSubmodelButton = event.target.closest("[data-action='remove-submodel']");
  if (removeSubmodelButton && submodelBuilder.querySelectorAll(".submodel-editor").length > 1) {
    removeSubmodelButton.closest(".submodel-editor").remove();
    renderGeneratorPreview();
  }
});

gatewayForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  let mapping;
  try {
    mapping = Object.fromEntries(new FormData(gatewayForm).entries());
    addGatewayMapping(mapping);
  } catch (error) {
    renderError(error);
    return;
  }

  try {
    if (mapping.protocol === "MQTT") {
      await registerMqttSubscription(mapping);
    } else {
      await registerOpcUaConnection(mapping);
    }
  } catch (error) {
    const statusElement = mapping.protocol === "MQTT" ? mqttBackendStatus : gatewayBackendStatus;
    statusElement.textContent = `${mapping.protocol} Backend konnte das Mapping nicht speichern: ${error.message}`;
  }
});

refreshGatewayBackendButton.addEventListener("click", refreshGatewayBackends);

opcUaConnectionList.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-opcua-action]");
  if (!button) return;
  await runOpcUaConnectionAction(button.dataset.opcuaAction, button.dataset.opcuaConnection, button.closest(".gateway-connection-card"));
});

mqttSubscriptionList.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-mqtt-action]");
  if (!button) return;
  await runMqttSubscriptionAction(button.dataset.mqttAction, button.dataset.mqttSubscription, button.closest(".gateway-connection-card"));
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

  const batchOptions = {
    assetMode: formData.get("batchAssetMode"),
    duplicateMode: formData.get("batchDuplicateMode"),
    skipEmptyValues: formData.get("batchSkipEmptyValues") === "on",
  };

  loadPackage(rowsToAasPackage(pendingTableImport.rows, mapping, batchOptions));
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
  return ["home", "import", "generator", "gateway", "repository", "dashboard", "explorer"].includes(route) ? route : "home";
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

function renderTemplateOptions() {
  submodelTemplateSelect.innerHTML = submodelTemplates
    .map((template) => `<option value="${template.key}">${escapeHtml(template.label)}</option>`)
    .join("");
}

function getSelectedSubmodelTemplate() {
  return submodelTemplates.find((template) => template.key === submodelTemplateSelect.value) ?? submodelTemplates[0];
}

function cloneTemplateSeed(template) {
  return {
    idShort: template.idShort,
    properties: template.properties.map((property) => ({ ...property })),
  };
}

function renderTemplatePreview() {
  const template = getSelectedSubmodelTemplate();
  if (!template) {
    templatePreview.textContent = "Kein Template ausgewaehlt.";
    return;
  }

  templatePreview.innerHTML = `
    <div class="preview-card">
      <h3>${escapeHtml(template.label)}</h3>
      <p>${escapeHtml(template.description)}</p>
      <div class="preview-tags">
        ${template.properties
          .map((property) => `<span>${escapeHtml(property.idShort)} (${escapeHtml(property.valueType)})</span>`)
          .join("")}
      </div>
    </div>
  `;
}

function renderGeneratorPreview() {
  const formData = new FormData(manualGeneratorForm);
  const assetId = String(formData.get("assetId") ?? "").trim();
  const assetName = String(formData.get("assetName") ?? "").trim();
  const submodels = [...submodelBuilder.querySelectorAll(".submodel-editor")].map((submodelEditor) => {
    const submodelName = submodelEditor.querySelector("[data-field='submodelName']").value.trim();
    const explicitSubmodelId = submodelEditor.querySelector("[data-field='submodelId']").value.trim();
    const properties = [...submodelEditor.querySelectorAll(".property-editor")].map((propertyEditor) => {
      return {
        idShort: propertyEditor.querySelector("[data-field='idShort']").value.trim() || "Property",
        valueType: propertyEditor.querySelector("[data-field='valueType']").value || "string",
        value: propertyEditor.querySelector("[data-field='value']").value.trim(),
      };
    });

    return {
      id: explicitSubmodelId || (assetId && submodelName ? `${assetId}:submodel:${toIdShort(submodelName)}` : ""),
      name: submodelName || "Submodel",
      properties,
    };
  });
  const propertyCount = submodels.reduce((count, submodel) => count + submodel.properties.length, 0);
  const assetLabel = assetName || assetId || "Noch kein Asset";

  generatorPreview.innerHTML = `
    <div class="preview-card">
      <h3>${escapeHtml(assetLabel)}</h3>
      <p>${escapeHtml(assetId || "Asset ID fehlt noch")} | ${submodels.length} Submodel | ${propertyCount} Properties</p>
    </div>
    ${submodels
      .map((submodel) => {
        const properties = submodel.properties.length
          ? submodel.properties
              .map((property) => {
                const value = property.value ? ` = ${property.value}` : "";
                return `<span>${escapeHtml(property.idShort)} (${escapeHtml(property.valueType)})${escapeHtml(value)}</span>`;
              })
              .join("")
          : "<span>Keine Properties</span>";
        return `
          <div class="preview-card">
            <h4>${escapeHtml(submodel.name)}</h4>
            <p>${escapeHtml(submodel.id || "Submodel ID wird aus Asset ID und Name erzeugt")}</p>
            <div class="preview-tags">${properties}</div>
          </div>
        `;
      })
      .join("")}
  `;
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
  renderGeneratorPreview();
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

function refreshDashboardCatalog() {
  dashboardElementCatalog = currentPackage ? buildDashboardElementCatalog(currentPackage) : [];
  const selectedKey = dashboardElementSelect.value;
  dashboardElementSelect.innerHTML = dashboardElementCatalog.length
    ? dashboardElementCatalog
        .map((entry) => `<option value="${escapeHtml(entry.key)}">${escapeHtml(entry.path)}</option>`)
        .join("")
    : `<option value="">Keine AAS geladen</option>`;

  if (dashboardElementCatalog.some((entry) => entry.key === selectedKey)) {
    dashboardElementSelect.value = selectedKey;
  }

  updateDashboardWidgetTypeState();
}

function buildDashboardElementCatalog(aasPackage) {
  const catalog = [];
  (aasPackage.submodels ?? []).forEach((submodel, submodelIndex) => {
    const submodelLabel = submodel.idShort || submodel.id || `Submodel ${submodelIndex + 1}`;
    (submodel.submodelElements ?? []).forEach((element, elementIndex) => {
      addDashboardElementEntry(catalog, submodel, submodelIndex, element, [elementIndex], [element.idShort || `Element${elementIndex + 1}`], submodelLabel);
    });
  });
  return catalog;
}

function addDashboardElementEntry(catalog, submodel, submodelIndex, element, indexPath, labelPath, submodelLabel) {
  const label = labelPath.at(-1) || `Element${indexPath.at(-1) + 1}`;
  const path = `${submodelLabel} / ${labelPath.join(" / ")}`;
  const value = getDashboardElementValue(element);
  const numericValue = Number(value);
  const isNumeric = numericValueTypes.has(element.valueType) && Number.isFinite(numericValue);
  const key = `${submodel.id || `submodel:${submodelIndex}`}:${indexPath.join(".")}:${labelPath.join("/")}`;

  catalog.push({
    key,
    label,
    path,
    submodelId: submodel.id ?? "",
    value,
    valueType: element.valueType ?? element.modelType ?? "Element",
    unit: getElementUnit(element),
    semanticId: getReferenceValues(element.semanticId).join(", "),
    numeric: isNumeric,
    numericValue: isNumeric ? numericValue : null,
  });

  getElementChildren(element).forEach((child, childIndex) => {
    const childLabel = child.idShort || `Element${childIndex + 1}`;
    addDashboardElementEntry(
      catalog,
      submodel,
      submodelIndex,
      child,
      [...indexPath, childIndex],
      [...labelPath, childLabel],
      submodelLabel,
    );
  });
}

function getDashboardElementValue(element) {
  if (element?.value !== undefined && element?.value !== null && typeof element.value !== "object") {
    return String(element.value);
  }
  const children = getElementChildren(element);
  if (children.length) return `${children.length} Children`;
  return "";
}

function getElementUnit(element) {
  return element?.qualifiers?.find((qualifier) => qualifier.type === "unit")?.value ?? "";
}

function updateDashboardWidgetTypeState() {
  const hasElements = dashboardElementCatalog.length > 0;
  const selected = getSelectedDashboardElement();
  const chartOption = dashboardWidgetType.querySelector("option[value='chart']");
  if (chartOption) chartOption.disabled = !selected?.numeric;
  if (dashboardWidgetType.value === "chart" && !selected?.numeric) dashboardWidgetType.value = "card";

  dashboardElementSelect.disabled = !hasElements;
  dashboardWidgetType.disabled = !hasElements;
  addDashboardWidgetButton.disabled = !hasElements || (dashboardWidgetType.value === "chart" && !selected?.numeric);
  refreshDashboardButton.disabled = !currentPackage || dashboardWidgets.length === 0;
  saveDashboardLayoutButton.disabled = dashboardWidgets.length === 0;
  clearDashboardLayoutButton.disabled = dashboardWidgets.length === 0;
  dashboardLiveToggle.disabled = !currentPackage;
}

function getSelectedDashboardElement() {
  return dashboardElementCatalog.find((entry) => entry.key === dashboardElementSelect.value) ?? dashboardElementCatalog[0];
}

function addDashboardWidgetFromSelection() {
  const entry = getSelectedDashboardElement();
  if (!entry) {
    renderDashboard("Lade eine AAS, um Dashboard Widgets zu erstellen.");
    return;
  }

  const widgetType = dashboardWidgetType.value;
  if (widgetType === "chart" && !entry.numeric) {
    renderDashboard("Charts brauchen einen numerischen Wert.");
    return;
  }

  const duplicate = dashboardWidgets.some((widget) => widget.elementKey === entry.key && widget.widgetType === widgetType);
  if (duplicate) {
    renderDashboard("Dieses Widget ist bereits im Dashboard.");
    return;
  }

  const widget = hydrateDashboardWidget(
    {
      id: createDashboardWidgetId(),
      elementKey: entry.key,
      widgetType,
      samples: [],
    },
    entry,
    true,
  );
  dashboardWidgets.push(widget);
  renderDashboard("Widget hinzugefuegt.");
}

function createDashboardWidgetId() {
  return crypto?.randomUUID ? crypto.randomUUID() : `dashboard-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function refreshDashboardValues(message = "") {
  if (currentPackage) refreshDashboardCatalog();
  dashboardWidgets = dashboardWidgets
    .map((widget) => {
      const entry = dashboardElementCatalog.find((candidate) => candidate.key === widget.elementKey);
      return entry ? hydrateDashboardWidget(widget, entry, true) : { ...widget, missing: true };
    })
    .filter(Boolean);
  renderDashboard(message);
}

function hydrateDashboardWidget(widget, entry, recordSample = false) {
  const samples = [...(widget.samples ?? [])];
  if (recordSample && entry.numeric) {
    samples.push(entry.numericValue);
    if (samples.length > 12) samples.shift();
  }

  return {
    ...widget,
    label: entry.label,
    path: entry.path,
    value: entry.value,
    valueType: entry.valueType,
    unit: entry.unit,
    semanticId: entry.semanticId,
    numeric: entry.numeric,
    numericValue: entry.numericValue,
    samples,
    updatedAt: new Date().toISOString(),
    missing: false,
  };
}

function renderDashboard(message = "") {
  updateDashboardWidgetTypeState();
  if (!currentPackage) {
    dashboardStatus.textContent = message || "Lade eine AAS, um Dashboard Widgets zu erstellen.";
  } else if (message) {
    dashboardStatus.textContent = message;
  } else {
    const liveLabel = dashboardLiveToggle.checked ? " | Live refresh aktiv" : "";
    dashboardStatus.textContent = `${dashboardWidgets.length} Widgets | ${dashboardElementCatalog.length} Elements verfuegbar${liveLabel}.`;
  }

  if (dashboardWidgets.length === 0) {
    dashboardGrid.className = "dashboard-empty";
    dashboardGrid.textContent = currentPackage ? "Noch keine Widgets." : "Keine AAS geladen.";
    return;
  }

  dashboardGrid.className = "dashboard-grid";
  dashboardGrid.innerHTML = dashboardWidgets.map(renderDashboardWidget).join("");
}

function renderDashboardWidget(widget) {
  const isChart = widget.widgetType === "chart";
  const value = widget.missing ? "nicht gefunden" : formatValue(widget.value);
  const unit = widget.unit ? `<span>${escapeHtml(widget.unit)}</span>` : "";
  return `
    <article class="dashboard-widget">
      <div class="dashboard-widget-header">
        <div>
          <div class="dashboard-widget-type">${isChart ? "Chart" : "Card"}</div>
          <h3>${escapeHtml(widget.label ?? "Element")}</h3>
        </div>
        <button class="secondary-button" type="button" data-dashboard-remove="${escapeHtml(widget.id)}">Entfernen</button>
      </div>
      <div class="dashboard-value">${escapeHtml(value)}${unit}</div>
      ${isChart ? renderDashboardChart(widget) : ""}
      <div class="dashboard-meta">
        <div>${escapeHtml(widget.valueType ?? "")}</div>
        <code>${escapeHtml(widget.path ?? widget.elementKey)}</code>
        ${widget.semanticId ? `<code>${escapeHtml(widget.semanticId)}</code>` : ""}
        <div>Live: ${escapeHtml(formatDateTime(widget.updatedAt))}</div>
      </div>
    </article>
  `;
}

function renderDashboardChart(widget) {
  if (!widget.numeric || !widget.samples?.length) {
    return `<div class="dashboard-chart">Keine numerischen Samples.</div>`;
  }

  const min = Math.min(...widget.samples);
  const max = Math.max(...widget.samples);
  const range = max - min;
  const bars = widget.samples.map((sample) => {
    const height = range === 0 ? 54 : 12 + ((sample - min) / range) * 88;
    return `<div class="dashboard-chart-bar" style="height:${height.toFixed(1)}%" title="${escapeHtml(sample)}"></div>`;
  });
  return `<div class="dashboard-chart" aria-label="Numeric history">${bars.join("")}</div>`;
}

function saveDashboardLayout() {
  const layout = {
    version: 1,
    savedAt: new Date().toISOString(),
    widgets: dashboardWidgets.map((widget) => ({
      elementKey: widget.elementKey,
      widgetType: widget.widgetType,
    })),
  };
  localStorage.setItem(dashboardLayoutStorageKey, JSON.stringify(layout));
  renderDashboard("Dashboard Layout gespeichert.");
}

function loadDashboardLayout() {
  if (!currentPackage) {
    renderDashboard("Lade zuerst eine AAS.");
    return;
  }

  const rawLayout = localStorage.getItem(dashboardLayoutStorageKey);
  if (!rawLayout) {
    renderDashboard("Kein gespeichertes Layout vorhanden.");
    return;
  }

  try {
    const layout = JSON.parse(rawLayout);
    const loadedWidgets = (layout.widgets ?? [])
      .map((savedWidget) => {
        const entry = dashboardElementCatalog.find((candidate) => candidate.key === savedWidget.elementKey);
        if (!entry) return null;
        return hydrateDashboardWidget(
          {
            id: createDashboardWidgetId(),
            elementKey: savedWidget.elementKey,
            widgetType: savedWidget.widgetType === "chart" && entry.numeric ? "chart" : "card",
            samples: [],
          },
          entry,
          true,
        );
      })
      .filter(Boolean);

    dashboardWidgets = loadedWidgets;
    renderDashboard(`${loadedWidgets.length} Widgets aus Layout geladen.`);
  } catch (error) {
    renderDashboard(`Layout konnte nicht geladen werden: ${error.message}`);
  }
}

function clearDashboardLayout() {
  dashboardWidgets = [];
  renderDashboard("Dashboard Layout geleert.");
}

function updateDashboardLiveRefresh() {
  if (dashboardLiveTimer) {
    window.clearInterval(dashboardLiveTimer);
    dashboardLiveTimer = null;
  }

  if (dashboardLiveToggle.checked && currentPackage) {
    dashboardLiveTimer = window.setInterval(() => {
      refreshDashboardValues("Live-Werte aktualisiert.");
    }, 3000);
  }
  renderDashboard();
}

function loadPackage(aasPackage) {
  currentPackage = aasPackage;
  resetExplorerState();
  const report = validateAasPackage(aasPackage);
  currentValidationReport = report;
  renderValidation(report);
  renderExplorer(aasPackage, searchInput.value);
  refreshDashboardCatalog();
  refreshDashboardValues();
  downloadButton.disabled = false;
  downloadAasxButton.disabled = false;
  downloadPdfButton.disabled = false;
  downloadExcelButton.disabled = false;
  downloadValidationReportButton.disabled = false;
  updateRepositoryAccessState();
}

function resetExplorerState() {
  selectedExplorerNodeId = "package";
  expandedExplorerNodeIds = new Set(["package"]);
  explorerNodes = new Map();
  lastExplorerQuery = "";
}

async function saveCurrentPackageToRepository() {
  if (!currentPackage) return;
  if (!canWriteRepository()) {
    repositoryStatus.textContent = "Aktuelle Rolle darf keine AAS-Versionen speichern.";
    return;
  }

  try {
    const response = await fetch("/api/aas", {
      method: "POST",
      headers: repositoryHeaders({ "Content-Type": "application/json" }),
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

function initializeRepositoryAccess() {
  const storedRole = localStorage.getItem("aasWorkbenchRepositoryRole");
  if (["viewer", "editor", "admin"].includes(storedRole)) {
    repositoryRoleSelect.value = storedRole;
  }
  updateRepositoryAccessState();
}

function getRepositoryRole() {
  return repositoryRoleSelect.value || "editor";
}

function canWriteRepository() {
  return ["editor", "admin"].includes(getRepositoryRole());
}

function repositoryHeaders(headers = {}) {
  return {
    ...headers,
    "X-Workbench-Role": getRepositoryRole(),
  };
}

function updateRepositoryAccessState() {
  const role = getRepositoryRole();
  repositoryAccessSummary.textContent = repositoryRoleDescriptions[role] ?? repositoryRoleDescriptions.viewer;
  saveRepositoryButton.disabled = !currentPackage || !canWriteRepository();
}

async function refreshRepository() {
  try {
    repositoryStatus.textContent = "Repository wird geladen ...";
    const response = await fetch("/api/aas", { headers: repositoryHeaders() });
    repositoryAssets = await enrichRepositoryAssets(await readApiResponse(response));
    renderFilteredRepositoryList();
    if (selectedRepositoryEventAssetId && repositoryAssets.some((asset) => asset.id === selectedRepositoryEventAssetId)) {
      await loadRepositoryEvents(selectedRepositoryEventAssetId, { silent: true });
    }
  } catch (error) {
    repositoryStatus.textContent = `Repository nicht verfuegbar: ${error.message}`;
    repositoryList.innerHTML = "";
  }
}

async function enrichRepositoryAssets(assets) {
  return Promise.all(
    assets.map(async (asset) => {
      try {
        const latestVersion = await fetchRepositoryVersion(asset.id, asset.latestVersion);
        const payload = normalizeAasJson(latestVersion.payload);
        return {
          ...asset,
          searchIndex: buildRepositorySearchIndex(asset, payload),
        };
      } catch (error) {
        return {
          ...asset,
          searchIndex: buildRepositorySearchIndex(asset),
          searchError: error.message,
        };
      }
    }),
  );
}

function renderFilteredRepositoryList() {
  const filteredAssets = filterRepositoryAssets(repositoryAssets);
  renderRepositoryList(filteredAssets);
  repositoryStatus.textContent = formatRepositoryStatus(repositoryAssets.length, filteredAssets.length);
}

function clearRepositorySearch(event) {
  event.preventDefault();
  repositorySearchForm.reset();
  repositoryAssetSearch.value = "";
  repositoryManufacturerSearch.value = "";
  repositorySemanticSearch.value = "";
  repositorySubmodelSearch.value = "";
  renderFilteredRepositoryList();
}

function filterRepositoryAssets(assets) {
  const queries = getRepositorySearchQueries();
  return assets.filter((asset) => {
    const searchIndex = asset.searchIndex ?? buildRepositorySearchIndex(asset);
    return (
      matchesRepositoryQuery(searchIndex.assetText, queries.asset) &&
      matchesRepositoryQuery(searchIndex.manufacturerText, queries.manufacturer) &&
      matchesRepositoryQuery(searchIndex.semanticText, queries.semanticId) &&
      matchesRepositoryQuery(searchIndex.submodelText, queries.submodel)
    );
  });
}

function getRepositorySearchQueries() {
  return {
    asset: repositoryAssetSearch.value.trim(),
    manufacturer: repositoryManufacturerSearch.value.trim(),
    semanticId: repositorySemanticSearch.value.trim(),
    submodel: repositorySubmodelSearch.value.trim(),
  };
}

function hasRepositorySearch() {
  return Object.values(getRepositorySearchQueries()).some(Boolean);
}

function matchesRepositoryQuery(text, query) {
  const terms = normalizeSearchText([query]).split(" ").filter(Boolean);
  if (terms.length === 0) return true;
  return terms.every((term) => text.includes(term));
}

function formatRepositoryStatus(totalCount, filteredCount) {
  if (totalCount === 0) return "Repository ist erreichbar, aber noch leer.";
  if (hasRepositorySearch()) return `${filteredCount} von ${totalCount} AAS gefunden.`;
  return `${totalCount} AAS im Repository.`;
}

function buildRepositorySearchIndex(asset, aasPackage = {}) {
  const assetTerms = new Set([asset.id, asset.idShort, asset.globalAssetId]);
  const manufacturerTerms = new Set();
  const semanticTerms = new Set();
  const submodelTerms = new Set();

  for (const shell of aasPackage.assetAdministrationShells ?? []) {
    addSearchValues(assetTerms, [
      shell.id,
      shell.idShort,
      shell.assetInformation?.globalAssetId,
      ...(shell.assetInformation?.specificAssetIds ?? []).flatMap((specificAssetId) => [
        specificAssetId.name,
        specificAssetId.value,
      ]),
    ]);
    (shell.submodels ?? []).forEach((reference) => addSearchValues(submodelTerms, getReferenceValues(reference)));
    collectSemanticValues(shell, semanticTerms);
  }

  for (const submodel of aasPackage.submodels ?? []) {
    addSearchValues(submodelTerms, [submodel.id, submodel.idShort]);
    collectSemanticValues(submodel, semanticTerms);
    (submodel.submodelElements ?? []).forEach((element) => collectRepositoryElementSearch(element, manufacturerTerms));
  }

  for (const conceptDescription of aasPackage.conceptDescriptions ?? []) {
    collectSemanticValues(conceptDescription, semanticTerms);
  }

  return {
    assetText: normalizeSearchText(assetTerms),
    manufacturerText: normalizeSearchText(manufacturerTerms),
    semanticText: normalizeSearchText(semanticTerms),
    submodelText: normalizeSearchText(submodelTerms),
    manufacturers: sortSearchValues(manufacturerTerms),
    semanticIds: sortSearchValues(semanticTerms),
    submodels: sortSearchValues(submodelTerms),
  };
}

function collectRepositoryElementSearch(element, manufacturerTerms) {
  if (isManufacturerElement(element)) {
    addSearchValues(manufacturerTerms, [element.value, element.idShort]);
  }
  getElementChildren(element).forEach((child) => collectRepositoryElementSearch(child, manufacturerTerms));
}

function isManufacturerElement(element) {
  const text = normalizeSearchText([element?.idShort, ...getReferenceValues(element?.semanticId)]);
  return text.includes("manufacturer") || text.includes("hersteller");
}

function collectSemanticValues(entity, semanticTerms, visited = new Set()) {
  if (!entity || typeof entity !== "object" || visited.has(entity)) return;
  visited.add(entity);

  if (Array.isArray(entity)) {
    entity.forEach((item) => collectSemanticValues(item, semanticTerms, visited));
    return;
  }

  if (entity.semanticId) {
    addSearchValues(semanticTerms, getReferenceValues(entity.semanticId));
  }

  Object.values(entity).forEach((value) => collectSemanticValues(value, semanticTerms, visited));
}

function getReferenceValues(reference) {
  if (!reference) return [];
  if (Array.isArray(reference.keys)) return reference.keys.map((key) => key?.value);
  return [];
}

function addSearchValues(target, values) {
  values.flat().forEach((value) => {
    const text = String(value ?? "").trim();
    if (text) target.add(text);
  });
}

function normalizeSearchText(values) {
  return [...values]
    .map((value) => String(value ?? "").trim().toLowerCase())
    .filter(Boolean)
    .join(" ");
}

function sortSearchValues(values) {
  return [...values].sort((left, right) => left.localeCompare(right));
}

async function loadRepositoryVersion(assetId, version) {
  try {
    const response = await fetch(`/api/aas/${encodeURIComponent(assetId)}/versions/${encodeURIComponent(version)}`, {
      headers: repositoryHeaders(),
    });
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
  const response = await fetch(`/api/aas/${encodeURIComponent(assetId)}/versions/${encodeURIComponent(version)}`, {
    headers: repositoryHeaders(),
  });
  return readApiResponse(response);
}

async function loadRepositoryEvents(assetId, options = {}) {
  try {
    selectedRepositoryEventAssetId = assetId;
    if (!options.silent) {
      repositoryEvents.className = "repository-events-empty";
      repositoryEvents.textContent = "Traceability Events werden geladen ...";
    }
    const response = await fetch(`/api/aas/${encodeURIComponent(assetId)}/events`, {
      headers: repositoryHeaders(),
    });
    const events = await readApiResponse(response);
    const asset = repositoryAssets.find((candidate) => candidate.id === assetId);
    renderRepositoryEvents(asset, events);
  } catch (error) {
    repositoryEvents.className = "repository-events-empty";
    repositoryEvents.textContent = `Traceability Events konnten nicht geladen werden: ${error.message}`;
  }
}

function renderRepositoryEvents(asset, events) {
  const sortedEvents = [...events].sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt));
  repositoryEvents.className = sortedEvents.length ? "repository-events" : "repository-events-empty";
  repositoryEvents.innerHTML = sortedEvents.length
    ? `
      <h3>Traceability Events: ${escapeHtml(asset?.idShort ?? "AAS")}</h3>
      <div class="event-list">
        ${sortedEvents.map(renderRepositoryEvent).join("")}
      </div>
    `
    : "Keine Traceability Events gespeichert.";
}

function renderRepositoryEvent(event) {
  const metadata = event.metadata ?? {};
  return `
    <article class="event-card">
      <strong>${escapeHtml(event.eventType ?? "event")} | v${escapeHtml(event.version ?? "")}</strong>
      <div class="repository-meta">${escapeHtml(formatDateTime(event.createdAt))} | ${escapeHtml(metadata.createdBy ?? "unbekannt")}</div>
      <div>${escapeHtml(event.message ?? "")}</div>
      <code>${escapeHtml(metadata.globalAssetId ?? "")}</code>
      <code>${escapeHtml(metadata.shellId ?? "")}</code>
      ${metadata.role ? `<div class="repository-meta">Role: ${escapeHtml(metadata.role)}</div>` : ""}
    </article>
  `;
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
    : renderRepositoryEmptyState();
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
      ${renderRepositorySearchMeta(asset)}
      <div class="version-list">
        ${versions
          .map(
            (version) =>
              `<button class="secondary-button" type="button" data-action="load-version" data-asset-id="${escapeHtml(asset.id)}" data-version="${version}">v${version}</button>`,
          )
          .join("")}
        <button class="secondary-button" type="button" data-action="view-events" data-asset-id="${escapeHtml(asset.id)}">Events</button>
      </div>
      ${compareControls}
    </article>
  `;
}

function renderRepositoryEmptyState() {
  return hasRepositorySearch()
    ? `<div class="repository-card"><h3>Keine Treffer</h3><div class="repository-meta">Passe die Suchfelder an oder setze die Suche zurueck.</div></div>`
    : `<div class="repository-card"><h3>Keine AAS gespeichert</h3><div class="repository-meta">Speichere zuerst eine geladene AAS.</div></div>`;
}

function renderRepositorySearchMeta(asset) {
  const searchIndex = asset.searchIndex ?? buildRepositorySearchIndex(asset);
  return `
    <div class="repository-search-meta">
      <div><strong>Manufacturer:</strong> ${escapeHtml(formatSearchPreview(searchIndex.manufacturers, "nicht gefunden"))}</div>
      <div><strong>Submodels:</strong> ${escapeHtml(formatSearchPreview(searchIndex.submodels, "keine Submodels"))}</div>
      <div><strong>Semantic IDs:</strong> ${escapeHtml(formatSearchPreview(searchIndex.semanticIds, "keine Semantic IDs"))}</div>
    </div>
  `;
}

function formatSearchPreview(values, emptyLabel) {
  if (!values.length) return emptyLabel;
  const visibleValues = values.slice(0, 3);
  const suffix = values.length > visibleValues.length ? ` +${values.length - visibleValues.length} weitere` : "";
  return `${visibleValues.join(", ")}${suffix}`;
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
      gatewayProperty("WriteBackEnabled", mapping.writeEnabled === "on", "xs:boolean"),
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

async function registerOpcUaConnection(mapping) {
  gatewayBackendStatus.textContent = "OPC UA Connection wird gespeichert ...";
  const response = await fetch("/api/opcua/connections", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      endpoint: mapping.endpoint,
      nodeId: mapping.sourceAddress,
      targetProperty: mapping.targetProperty,
      samplingInterval: mapping.samplingInterval,
      writeEnabled: mapping.writeEnabled === "on",
    }),
  });
  const connection = await readApiResponse(response);
  await refreshGatewayBackends();
  gatewayBackendStatus.textContent = `OPC UA Connection gespeichert: ${connection.targetProperty || connection.nodeId}.`;
}

async function registerMqttSubscription(mapping) {
  mqttBackendStatus.textContent = "MQTT Subscription wird gespeichert ...";
  const response = await fetch("/api/mqtt/subscriptions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      brokerUrl: mapping.endpoint,
      topic: mapping.sourceAddress,
      targetProperty: mapping.targetProperty,
      samplingInterval: mapping.samplingInterval,
      writeEnabled: mapping.writeEnabled === "on",
    }),
  });
  const subscription = await readApiResponse(response);
  await refreshGatewayBackends();
  mqttBackendStatus.textContent = `MQTT Subscription gespeichert: ${subscription.targetProperty || subscription.topic}.`;
}

async function refreshGatewayBackends() {
  await Promise.all([refreshGatewayStatus(), refreshOpcUaConnections(), refreshMqttSubscriptions()]);
}

async function refreshGatewayStatus() {
  try {
    const response = await fetch("/api/gateway");
    gatewayStatus = await readApiResponse(response);
    renderGatewayStatus();
    renderGatewayLiveValues();
  } catch (error) {
    gatewayUnifiedStatus.innerHTML = `
      <div class="gateway-status-heading">
        <strong>Nicht verfuegbar</strong>
        <span>Gateway-Status konnte nicht geladen werden: ${escapeHtml(error.message)}</span>
      </div>
    `;
  }
}

function renderGatewayStatus() {
  const totals = gatewayStatus?.totals ?? {};
  const protocols = gatewayStatus?.protocols ?? {};
  gatewayUnifiedStatus.innerHTML = `
    <div class="gateway-status-heading">
      <strong>${escapeHtml(gatewayStatus?.status ?? "unbekannt")}</strong>
      <span>${escapeHtml(gatewayStatus?.message ?? "Gateway-Status konnte nicht gelesen werden.")}</span>
    </div>
    <div class="gateway-status-metrics" aria-label="Gateway Kennzahlen">
      <div><strong>${escapeHtml(totals.mappings ?? 0)}</strong><span>Mappings</span></div>
      <div><strong>${escapeHtml(totals.active ?? 0)}</strong><span>Aktiv</span></div>
      <div><strong>${escapeHtml(totals.attention ?? 0)}</strong><span>Pruefen</span></div>
      <div><strong>${escapeHtml(totals.disconnected ?? 0)}</strong><span>Getrennt</span></div>
    </div>
    <div class="gateway-protocol-summary">
      <div>OPC UA: ${escapeHtml(protocols.opcua?.mappings ?? 0)} Mappings | Adapter: ${escapeHtml(protocols.opcua?.adapter ?? "unbekannt")}</div>
      <div>MQTT: ${escapeHtml(protocols.mqtt?.mappings ?? 0)} Mappings | Adapter: ${escapeHtml(protocols.mqtt?.adapter ?? "unbekannt")}</div>
    </div>
  `;
}

function startGatewayLiveStream() {
  if (!("EventSource" in window)) {
    gatewayLiveStreamStatus.textContent = "Live-Stream wird von diesem Browser nicht unterstuetzt.";
    renderGatewayLiveValues();
    return;
  }

  if (gatewayEventSource) gatewayEventSource.close();
  gatewayEventSource = new EventSource("/api/gateway/stream");

  gatewayEventSource.addEventListener("open", () => {
    gatewayLiveStreamStatus.textContent = "Live-Stream aktiv.";
  });

  gatewayEventSource.addEventListener("gateway", (event) => {
    gatewayStatus = JSON.parse(event.data);
    renderGatewayStatus();
    renderGatewayLiveValues();
    gatewayLiveStreamStatus.textContent = `Live-Stream aktiv | ${formatDateTime(gatewayStatus.updatedAt)}`;
  });

  gatewayEventSource.addEventListener("error", () => {
    gatewayLiveStreamStatus.textContent = "Live-Stream versucht neu zu verbinden ...";
  });
}

function renderGatewayLiveValues() {
  const recentValues = gatewayStatus?.recentValues ?? [];
  gatewayLiveValues.innerHTML = recentValues.length
    ? recentValues.map(renderGatewayLiveValue).join("")
    : `<div class="gateway-live-empty">Noch keine Live-Werte empfangen.</div>`;
}

function renderGatewayLiveValue(entry) {
  const receivedAt = entry.receivedAt ? formatDateTime(entry.receivedAt) : "unbekannt";
  return `
    <article class="gateway-live-value">
      <strong>${escapeHtml(entry.label || entry.source || entry.protocol)}</strong>
      <span>${escapeHtml(entry.protocol)} | ${escapeHtml(receivedAt)}</span>
      <code>${escapeHtml(entry.value)}</code>
      <span>${escapeHtml(entry.source)}</span>
    </article>
  `;
}

async function refreshOpcUaConnections() {
  try {
    const [statusResponse, connectionsResponse] = await Promise.all([
      fetch("/api/opcua"),
      fetch("/api/opcua/connections"),
    ]);
    const status = await readApiResponse(statusResponse);
    opcUaConnections = await readApiResponse(connectionsResponse);
    gatewayBackendStatus.textContent = `${status.status}: ${status.message}`;
    renderOpcUaConnections();
  } catch (error) {
    gatewayBackendStatus.textContent = `OPC UA Backend nicht verfuegbar: ${error.message}`;
    opcUaConnectionList.innerHTML = "";
  }
}

async function refreshMqttSubscriptions() {
  try {
    const [statusResponse, subscriptionsResponse] = await Promise.all([
      fetch("/api/mqtt"),
      fetch("/api/mqtt/subscriptions"),
    ]);
    const status = await readApiResponse(statusResponse);
    mqttSubscriptions = await readApiResponse(subscriptionsResponse);
    mqttBackendStatus.textContent = `${status.status}: ${status.message}`;
    renderMqttSubscriptions();
  } catch (error) {
    mqttBackendStatus.textContent = `MQTT Backend nicht verfuegbar: ${error.message}`;
    mqttSubscriptionList.innerHTML = "";
  }
}

function renderOpcUaConnections() {
  opcUaConnectionList.innerHTML = opcUaConnections.length
    ? opcUaConnections.map(renderOpcUaConnectionCard).join("")
    : `<div class="gateway-connection-card"><h3>Keine OPC UA Connections</h3><div class="gateway-connection-meta">Speichere zuerst ein OPC-UA-Mapping.</div></div>`;
}

function renderMqttSubscriptions() {
  mqttSubscriptionList.innerHTML = mqttSubscriptions.length
    ? mqttSubscriptions.map(renderMqttSubscriptionCard).join("")
    : `<div class="gateway-connection-card"><h3>Keine MQTT Subscriptions</h3><div class="gateway-connection-meta">Speichere zuerst ein MQTT-Mapping.</div></div>`;
}

function renderOpcUaConnectionCard(connection) {
  const status = connection.runtimeStatus || connection.status || "configured";
  const lastValue = connection.lastValue === undefined ? "nicht gelesen" : connection.lastValue;
  const lastReadAt = connection.lastReadAt ? formatDateTime(connection.lastReadAt) : "nie";
  return `
    <article class="gateway-connection-card">
      <h3>${escapeHtml(connection.targetProperty || connection.nodeId)}</h3>
      <div class="gateway-connection-meta">
        <div>Status: ${escapeHtml(status)}</div>
        <code>${escapeHtml(connection.endpoint)}</code>
        <code>${escapeHtml(connection.nodeId)}</code>
        <div>Sampling: ${escapeHtml(connection.samplingInterval)} ms | Last value: ${escapeHtml(lastValue)} | Read: ${escapeHtml(lastReadAt)}</div>
        <div>Write-back: ${connection.writeEnabled ? "aktiv" : "gesperrt"}${connection.lastWriteAt ? ` | Last write: ${escapeHtml(connection.lastWriteValue)} (${escapeHtml(formatDateTime(connection.lastWriteAt))})` : ""}</div>
        ${connection.lastError ? `<div>Fehler: ${escapeHtml(connection.lastError)}</div>` : ""}
      </div>
      <div class="action-row">
        <button class="secondary-button" type="button" data-opcua-action="connect" data-opcua-connection="${escapeHtml(connection.id)}">Verbinden</button>
        <button class="secondary-button" type="button" data-opcua-action="read" data-opcua-connection="${escapeHtml(connection.id)}">Wert lesen</button>
        <button class="secondary-button" type="button" data-opcua-action="disconnect" data-opcua-connection="${escapeHtml(connection.id)}">Trennen</button>
      </div>
      ${renderGatewayWriteControls("opcua", connection)}
    </article>
  `;
}

function renderMqttSubscriptionCard(subscription) {
  const status = subscription.runtimeStatus || subscription.status || "configured";
  const lastMessage = subscription.lastMessage === undefined ? "keine Nachricht" : subscription.lastMessage;
  const lastMessageAt = subscription.lastMessageAt ? formatDateTime(subscription.lastMessageAt) : "nie";
  return `
    <article class="gateway-connection-card">
      <h3>${escapeHtml(subscription.targetProperty || subscription.topic)}</h3>
      <div class="gateway-connection-meta">
        <div>Status: ${escapeHtml(status)}</div>
        <code>${escapeHtml(subscription.brokerUrl)}</code>
        <code>${escapeHtml(subscription.topic)}</code>
        <div>QoS: ${escapeHtml(subscription.qos)} | Last message: ${escapeHtml(lastMessage)} | Received: ${escapeHtml(lastMessageAt)}</div>
        <div>Write-back: ${subscription.writeEnabled ? "aktiv" : "gesperrt"}${subscription.lastWriteAt ? ` | Last publish: ${escapeHtml(subscription.lastWriteValue)} (${escapeHtml(formatDateTime(subscription.lastWriteAt))})` : ""}</div>
        ${subscription.lastTopic ? `<div>Last topic: ${escapeHtml(subscription.lastTopic)}</div>` : ""}
        ${subscription.lastError ? `<div>Fehler: ${escapeHtml(subscription.lastError)}</div>` : ""}
      </div>
      <div class="action-row">
        <button class="secondary-button" type="button" data-mqtt-action="connect" data-mqtt-subscription="${escapeHtml(subscription.id)}">Abonnieren</button>
        <button class="secondary-button" type="button" data-mqtt-action="disconnect" data-mqtt-subscription="${escapeHtml(subscription.id)}">Trennen</button>
      </div>
      ${renderGatewayWriteControls("mqtt", subscription)}
    </article>
  `;
}

function renderGatewayWriteControls(protocol, item) {
  if (!item.writeEnabled) {
    return `<div class="gateway-write-locked">Write-back ist fuer dieses Mapping nicht aktiviert.</div>`;
  }

  const action = protocol === "opcua" ? "write" : "publish";
  const dataAttribute = protocol === "opcua" ? "data-opcua-write-value" : "data-mqtt-write-value";
  const buttonAttribute = protocol === "opcua" ? "data-opcua-action" : "data-mqtt-action";
  const idAttribute = protocol === "opcua" ? "data-opcua-connection" : "data-mqtt-subscription";
  const buttonLabel = protocol === "opcua" ? "Wert schreiben" : "Nachricht publishen";

  return `
    <div class="gateway-write-panel">
      <input ${dataAttribute} placeholder="Write-back Wert" />
      <button class="secondary-button" type="button" ${buttonAttribute}="${action}" ${idAttribute}="${escapeHtml(item.id)}">${buttonLabel}</button>
    </div>
  `;
}

async function runOpcUaConnectionAction(action, connectionId, card) {
  if (!connectionId) return;
  const labels = {
    connect: "Verbindung wird aufgebaut ...",
    read: "OPC UA Wert wird gelesen ...",
    disconnect: "Verbindung wird getrennt ...",
    write: "OPC UA Wert wird geschrieben ...",
  };
  gatewayBackendStatus.textContent = labels[action] ?? "OPC UA Aktion wird ausgefuehrt ...";

  try {
    const body = action === "write" ? getGatewayWriteBody(card, "[data-opcua-write-value]") : null;
    const response = await fetch(`/api/opcua/connections/${encodeURIComponent(connectionId)}/${action}`, {
      method: "POST",
      headers: body ? { "Content-Type": "application/json" } : {},
      body: body ? JSON.stringify(body) : undefined,
    });
    const result = await readApiResponse(response);
    await refreshGatewayBackends();
    gatewayBackendStatus.textContent = `${result.status}: ${result.lastError || "OPC UA Aktion abgeschlossen."}`;
  } catch (error) {
    gatewayBackendStatus.textContent = `OPC UA Aktion fehlgeschlagen: ${error.message}`;
  }
}

async function runMqttSubscriptionAction(action, subscriptionId, card) {
  if (!subscriptionId) return;
  const labels = {
    connect: "MQTT Subscription wird verbunden ...",
    disconnect: "MQTT Subscription wird getrennt ...",
    publish: "MQTT Nachricht wird gesendet ...",
  };
  mqttBackendStatus.textContent = labels[action] ?? "MQTT Aktion wird ausgefuehrt ...";

  try {
    const body = action === "publish" ? getGatewayWriteBody(card, "[data-mqtt-write-value]") : null;
    const response = await fetch(`/api/mqtt/subscriptions/${encodeURIComponent(subscriptionId)}/${action}`, {
      method: "POST",
      headers: body ? { "Content-Type": "application/json" } : {},
      body: body ? JSON.stringify(body) : undefined,
    });
    const result = await readApiResponse(response);
    await refreshGatewayBackends();
    mqttBackendStatus.textContent = `${result.status}: ${result.lastError || "MQTT Aktion abgeschlossen."}`;
  } catch (error) {
    mqttBackendStatus.textContent = `MQTT Aktion fehlgeschlagen: ${error.message}`;
  }
}

function getGatewayWriteBody(card, selector) {
  const input = card?.querySelector(selector);
  const value = input?.value.trim();
  if (!value) throw new Error("Write-back Wert ist erforderlich.");
  return { value, confirmWrite: true };
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
  mappingForm.reset();
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

function rowsToAasPackage(rows, mapping = defaultMapping(rows), options = {}) {
  const batchOptions = normalizeBatchOptions(options);
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
    })
    .filter((record) => !batchOptions.skipEmptyValues || record.value !== "");

  if (records.length === 0) {
    throw new Error("Keine verwertbaren Datenzeilen gefunden.");
  }

  const missing = targetColumns
    .filter((column) => column.required && !records.every((record) => record[column.key]))
    .map((column) => column.key);

  if (missing.length > 0) {
    throw new Error(`Pflichtwerte fehlen in der Tabelle: ${missing.join(", ")}`);
  }

  return recordsToAasPackage(records, batchOptions);
}

function defaultMapping(rows) {
  const headers = getHeaders(rows);
  return Object.fromEntries(targetColumns.map((column) => [column.key, String(guessColumnIndex(column, headers))]));
}

function normalizeBatchOptions(options = {}) {
  return {
    assetMode: options.assetMode === "singleAsset" ? "singleAsset" : "byAssetId",
    duplicateMode: ["skip", "replace"].includes(options.duplicateMode) ? options.duplicateMode : "keep",
    skipEmptyValues: options.skipEmptyValues === true,
  };
}

function recordsToAasPackage(records, options = {}) {
  const batchOptions = normalizeBatchOptions(options);
  const firstRecord = records[0] ?? {};
  const shellMap = new Map();
  const submodelMap = new Map();

  for (const record of records) {
    const assetId = batchOptions.assetMode === "singleAsset" ? firstRecord.assetId : record.assetId;
    const assetName = (batchOptions.assetMode === "singleAsset" ? firstRecord.assetName : record.assetName) || toIdShort(assetId);
    const submodelName = record.submodelName || toIdShort(record.submodelId);
    const submodelId =
      batchOptions.assetMode === "singleAsset" ? `${assetId}:submodel:${toIdShort(submodelName)}` : record.submodelId;

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

    const existingPropertyIndex = submodel.submodelElements.findIndex((element) => element.idShort === property.idShort);
    if (batchOptions.duplicateMode === "skip" && existingPropertyIndex >= 0) {
      continue;
    }
    if (batchOptions.duplicateMode === "replace" && existingPropertyIndex >= 0) {
      submodel.submodelElements[existingPropertyIndex] = property;
    } else {
      submodel.submodelElements.push(property);
    }
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
  const semanticContext = createSemanticContext(conceptDescriptions);
  const referenceContext = createReferenceContext(shells, submodels, conceptDescriptions);
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
    validateAssetInformation(shell.assetInformation, `${path}.assetInformation`, issues, {
      referenceContext,
      semanticContext,
    });

    if (shell.submodels !== undefined && !Array.isArray(shell.submodels)) {
      issues.push(errorIssue(`${path}.submodels`, "Submodel-Referenzen muessen ein Array sein."));
    }

    for (const [referenceIndex, reference] of (Array.isArray(shell.submodels) ? shell.submodels : []).entries()) {
      const referencePath = `${path}.submodels[${referenceIndex}]`;
      validateReference(reference, referencePath, issues, {
        expectedKeyType: "Submodel",
        expectedReferenceType: "ModelReference",
        referenceContext,
        skipLocalTargetWarning: true,
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
    validateSemanticIdIfPresent(submodel.semanticId, `${path}.semanticId`, issues, semanticContext, referenceContext);

    if (submodel.submodelElements !== undefined && !Array.isArray(submodel.submodelElements)) {
      issues.push(errorIssue(`${path}.submodelElements`, "submodelElements muss ein Array sein."));
    } else {
      validateSubmodelElements(submodel.submodelElements ?? [], `${path}.submodelElements`, issues, {
        semanticContext,
        referenceContext,
      });
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
    validateConceptDescriptionUniqueness(conceptDescription, path, issues, semanticContext);
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

function createSemanticContext(conceptDescriptions) {
  const idCounts = new Map();
  const idShortCounts = new Map();

  conceptDescriptions.forEach((conceptDescription) => {
    if (conceptDescription?.id) {
      idCounts.set(conceptDescription.id, (idCounts.get(conceptDescription.id) ?? 0) + 1);
    }
    if (conceptDescription?.idShort) {
      idShortCounts.set(conceptDescription.idShort, (idShortCounts.get(conceptDescription.idShort) ?? 0) + 1);
    }
  });

  return {
    conceptDescriptionIds: new Set(idCounts.keys()),
    conceptDescriptionIdShorts: new Set(idShortCounts.keys()),
    conceptDescriptionIdCounts: idCounts,
    conceptDescriptionIdShortCounts: idShortCounts,
  };
}

function createReferenceContext(shells, submodels, conceptDescriptions) {
  const rootIdsByType = new Map([
    ["AssetAdministrationShell", new Set(shells.map((shell) => shell.id).filter(Boolean))],
    ["Submodel", new Set(submodels.map((submodel) => submodel.id).filter(Boolean))],
    ["ConceptDescription", new Set(conceptDescriptions.map((conceptDescription) => conceptDescription.id).filter(Boolean))],
  ]);
  const submodelsById = new Map(submodels.map((submodel) => [submodel.id, submodel]).filter(([id]) => Boolean(id)));

  return {
    rootIdsByType,
    submodelsById,
  };
}

function validateConceptDescriptionUniqueness(conceptDescription, path, issues, semanticContext) {
  if (conceptDescription.id && semanticContext.conceptDescriptionIdCounts.get(conceptDescription.id) > 1) {
    issues.push(errorIssue(path, `Doppelte ConceptDescription-ID: ${conceptDescription.id}`, "semantics"));
  }

  if (
    conceptDescription.idShort &&
    semanticContext.conceptDescriptionIdShortCounts.get(conceptDescription.idShort) > 1
  ) {
    issues.push(warnIssue(path, `Doppeltes ConceptDescription-idShort: ${conceptDescription.idShort}`, "semantics"));
  }
}

function validateSemanticIdIfPresent(reference, path, issues, semanticContext, referenceContext) {
  if (reference === undefined || reference === null || reference === "") return;
  validateSemanticId(reference, path, issues, semanticContext, referenceContext);
}

function validateSemanticId(reference, path, issues, semanticContext = createSemanticContext([]), referenceContext) {
  validateReference(reference, path, issues, {
    allowExternalConceptDescription: true,
    category: "semantics",
    referenceContext,
  });
  if (!isPlainObject(reference) || !Array.isArray(reference.keys) || reference.keys.length === 0) return;

  if (reference.keys.length > 1) {
    issues.push(
      warnIssue(
        path,
        "semanticId enthaelt mehrere Keys; fuer interoperable Semantic IDs sollte die Ziel-ConceptDescription eindeutig sein.",
        "semantics",
      ),
    );
  }

  const lastKey = reference.keys.at(-1);
  if (!isPlainObject(lastKey) || !lastKey.value) return;

  const value = String(lastKey.value).trim();
  if (value !== lastKey.value) {
    issues.push(warnIssue(path, "semanticId-Key.value enthaelt fuehrende oder folgende Leerzeichen.", "semantics"));
  }

  if (isHttpUrl(value) && !isValidUrl(value)) {
    issues.push(errorIssue(path, `semanticId-URL ist ungueltig: ${value}`, "semantics"));
    return;
  }

  const pointsToLocalConcept = semanticContext.conceptDescriptionIds.has(value);
  const pointsToLocalIdShort = semanticContext.conceptDescriptionIdShorts.has(value);
  const globalSemanticId = isGlobalSemanticId(value);

  if (lastKey.type === "ConceptDescription") {
    validateConceptDescriptionSemanticId(reference, path, issues, {
      value,
      pointsToLocalConcept,
      pointsToLocalIdShort,
      globalSemanticId,
    });
    return;
  }

  if (lastKey.type === "GlobalReference") {
    validateGlobalReferenceSemanticId(reference, path, issues, value, globalSemanticId);
    return;
  }

  issues.push(
    warnIssue(
      path,
      `semanticId sollte auf ConceptDescription oder GlobalReference zeigen, nicht auf ${lastKey.type ?? "unbekannt"}.`,
      "semantics",
    ),
  );
}

function validateConceptDescriptionSemanticId(reference, path, issues, context) {
  if (context.pointsToLocalConcept) {
    if (reference.type !== "ModelReference") {
      issues.push(
        warnIssue(
          path,
          "Lokale ConceptDescription-Verweise sollten als ModelReference modelliert werden.",
          "semantics",
        ),
      );
    }
    return;
  }

  if (context.pointsToLocalIdShort) {
    issues.push(
      warnIssue(
        path,
        `semanticId nutzt ein ConceptDescription-idShort (${context.value}); robuster ist die ConceptDescription-ID.`,
        "semantics",
      ),
    );
    return;
  }

  if (context.globalSemanticId) {
    if (reference.type !== "ExternalReference") {
      issues.push(
        warnIssue(
          path,
          "Externe semanticId-Verweise sollten als ExternalReference modelliert werden.",
          "semantics",
        ),
      );
    }
    return;
  }

  issues.push(
    warnIssue(
      path,
      `semanticId verweist auf ConceptDescription "${context.value}", die nicht im Package vorhanden ist und nicht wie eine globale ID aussieht.`,
      "semantics",
    ),
  );
}

function validateGlobalReferenceSemanticId(reference, path, issues, value, globalSemanticId) {
  if (reference.type !== "ExternalReference") {
    issues.push(
      warnIssue(path, "GlobalReference semanticIds sollten als ExternalReference modelliert werden.", "semantics"),
    );
  }

  if (!globalSemanticId) {
    issues.push(
      warnIssue(
        path,
        `GlobalReference semanticId "${value}" sollte eine IRI, URN oder IRDI-aehnliche globale Kennung sein.`,
        "semantics",
      ),
    );
  }
}

function isGlobalSemanticId(value) {
  return (
    knownSemanticIdPrefixes.some((prefix) => value.startsWith(prefix)) ||
    isHttpUrl(value) ||
    /^urn:/i.test(value) ||
    /^irdi:/i.test(value) ||
    /^\d{4}-\d#/.test(value)
  );
}

function isHttpUrl(value) {
  return /^https?:\/\//i.test(value);
}

function isValidUrl(value) {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
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
    validateSemanticId(element.semanticId, `${path}.semanticId`, issues, options.semanticContext, options.referenceContext);
  } else {
    issues.push(warnIssue(path, "semanticId fehlt; Interoperabilitaet ist eingeschraenkt."));
  }

  validateQualifiers(element.qualifiers, `${path}.qualifiers`, issues, options);

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
      validateReferenceIfPresent(element.value, `${path}.value`, issues, { referenceContext: options.referenceContext });
      break;
    case "RelationshipElement":
    case "AnnotatedRelationshipElement":
      validateRelationshipElement(element, path, issues, options);
      break;
    case "Entity":
      validateEntity(element, path, issues, options);
      break;
    case "SubmodelElementCollection":
      validateCollection(element, path, issues, options);
      break;
    case "SubmodelElementList":
      validateElementList(element, path, issues, options);
      break;
    case "Operation":
      validateOperation(element, path, issues, options);
      break;
    case "BasicEventElement":
      validateBasicEventElement(element, path, issues, options);
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
  validateValueId(element.valueId, `${path}.valueId`, issues);
  validateElementUnit(element, path, issues);
}

function validateRange(element, path, issues) {
  if (!element.valueType) {
    issues.push(errorIssue(path, "Range ohne valueType."));
    return;
  }

  validateValueType(element.valueType, `${path}.valueType`, issues);
  validatePropertyValueByType(element.min, element.valueType, `${path}.min`, issues);
  validatePropertyValueByType(element.max, element.valueType, `${path}.max`, issues);
  validateRangeOrder(element, path, issues);
  validateElementUnit(element, path, issues);
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

function validateRelationshipElement(element, path, issues, options = {}) {
  validateRequiredReference(element.first, `${path}.first`, issues, {
    expectedReferenceType: "ModelReference",
    referenceContext: options.referenceContext,
  });
  validateRequiredReference(element.second, `${path}.second`, issues, {
    expectedReferenceType: "ModelReference",
    referenceContext: options.referenceContext,
  });

  if (element.modelType === "AnnotatedRelationshipElement") {
    if (element.annotations !== undefined && !Array.isArray(element.annotations)) {
      issues.push(errorIssue(`${path}.annotations`, "annotations muss ein Array sein."));
    } else {
      validateSubmodelElements(element.annotations ?? [], `${path}.annotations`, issues, {
        semanticContext: options.semanticContext,
        referenceContext: options.referenceContext,
      });
    }
  }
}

function validateEntity(element, path, issues, options = {}) {
  if (!element.entityType) {
    issues.push(errorIssue(path, "Entity ohne entityType."));
  } else if (!entityTypes.has(element.entityType)) {
    issues.push(errorIssue(`${path}.entityType`, `entityType "${element.entityType}" ist nicht gueltig.`));
  }

  if (element.statements !== undefined && !Array.isArray(element.statements)) {
    issues.push(errorIssue(`${path}.statements`, "statements muss ein Array sein."));
  } else {
    validateSubmodelElements(element.statements ?? [], `${path}.statements`, issues, {
      semanticContext: options.semanticContext,
      referenceContext: options.referenceContext,
    });
  }

  if (element.entityType === "SelfManagedEntity" && !element.globalAssetId && !element.specificAssetIds) {
    issues.push(warnIssue(path, "SelfManagedEntity sollte globalAssetId oder specificAssetIds setzen."));
  }
}

function validateCollection(element, path, issues, options = {}) {
  if (element.value !== undefined && !Array.isArray(element.value)) {
    issues.push(errorIssue(`${path}.value`, "SubmodelElementCollection.value muss ein Array sein."));
    return;
  }

  validateSubmodelElements(element.value ?? [], `${path}.value`, issues, {
    semanticContext: options.semanticContext,
    referenceContext: options.referenceContext,
  });
}

function validateElementList(element, path, issues, options = {}) {
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
    semanticContext: options.semanticContext,
    referenceContext: options.referenceContext,
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

function validateOperation(element, path, issues, options = {}) {
  validateOperationVariables(element.inputVariables, `${path}.inputVariables`, issues, options);
  validateOperationVariables(element.outputVariables, `${path}.outputVariables`, issues, options);
  validateOperationVariables(element.inoutputVariables, `${path}.inoutputVariables`, issues, options);
}

function validateOperationVariables(variables, path, issues, options = {}) {
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
      validateSubmodelElement(variable.value, `${variablePath}.value`, issues, {
        requireIdShort: false,
        semanticContext: options.semanticContext,
        referenceContext: options.referenceContext,
      });
    }
  });
}

function validateBasicEventElement(element, path, issues, options = {}) {
  validateRequiredReference(element.observed, `${path}.observed`, issues, {
    expectedReferenceType: "ModelReference",
    referenceContext: options.referenceContext,
  });

  if (element.direction && !eventDirections.has(element.direction)) {
    issues.push(errorIssue(`${path}.direction`, `direction "${element.direction}" ist nicht gueltig.`));
  }

  if (element.state && !eventStates.has(element.state)) {
    issues.push(errorIssue(`${path}.state`, `state "${element.state}" ist nicht gueltig.`));
  }
}

function validateAssetInformation(assetInformation, path, issues, options = {}) {
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
  } else {
    validateSpecificAssetIds(assetInformation.specificAssetIds ?? [], `${path}.specificAssetIds`, issues, options);
  }
}

function validateSpecificAssetIds(specificAssetIds, path, issues, options = {}) {
  const seenNames = new Set();
  specificAssetIds.forEach((specificAssetId, index) => {
    const assetIdPath = `${path}[${index}]`;
    if (!isPlainObject(specificAssetId)) {
      issues.push(errorIssue(assetIdPath, "SpecificAssetId muss ein Objekt sein."));
      return;
    }
    requireField(specificAssetId, "name", assetIdPath, issues);
    requireField(specificAssetId, "value", assetIdPath, issues);
    if (specificAssetId.name) {
      if (seenNames.has(specificAssetId.name)) {
        issues.push(warnIssue(assetIdPath, `Doppelter SpecificAssetId.name: ${specificAssetId.name}`, "semantics"));
      }
      seenNames.add(specificAssetId.name);
    }
    validateSemanticIdIfPresent(specificAssetId.semanticId, `${assetIdPath}.semanticId`, issues, options.semanticContext, options.referenceContext);
    validateReferenceIfPresent(specificAssetId.externalSubjectId, `${assetIdPath}.externalSubjectId`, issues, {
      expectedReferenceType: "ExternalReference",
      referenceContext: options.referenceContext,
    });
  });
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
  const category = options.category ?? "references";
  if (!isPlainObject(reference)) {
    issues.push(errorIssue(path, "Reference muss ein Objekt sein.", category));
    return;
  }

  if (!reference.type) {
    issues.push(errorIssue(path, "Reference.type fehlt.", category));
  } else if (!aasReferenceTypes.has(reference.type)) {
    issues.push(errorIssue(`${path}.type`, `Reference.type "${reference.type}" ist nicht gueltig.`, category));
  } else if (options.expectedReferenceType && reference.type !== options.expectedReferenceType) {
    issues.push(
      warnIssue(path, `AAS 3.x erwartet Reference.type "${options.expectedReferenceType}" fuer diese Referenz.`, category),
    );
  }

  if (!Array.isArray(reference.keys) || reference.keys.length === 0) {
    issues.push(errorIssue(path, "Reference.keys muss ein nicht-leeres Array sein.", category));
    return;
  }

  reference.keys.forEach((key, keyIndex) => {
    const keyPath = `${path}.keys[${keyIndex}]`;
    if (!isPlainObject(key)) {
      issues.push(errorIssue(keyPath, "Key muss ein Objekt sein.", category));
      return;
    }
    if (!key.type) {
      issues.push(errorIssue(keyPath, "Key.type fehlt.", category));
    } else if (!aasKeyTypes.has(key.type)) {
      issues.push(errorIssue(`${keyPath}.type`, `Key.type "${key.type}" ist nicht gueltig.`, category));
    }
    if (!key.value) {
      issues.push(errorIssue(keyPath, "Key.value fehlt.", category));
    } else if (typeof key.value !== "string") {
      issues.push(errorIssue(`${keyPath}.value`, "Key.value muss ein String sein.", category));
    } else if (key.value.trim() !== key.value) {
      issues.push(warnIssue(`${keyPath}.value`, "Key.value enthaelt fuehrende oder folgende Leerzeichen.", category));
    }
  });

  const lastKeyType = reference.keys.at(-1)?.type;
  if (options.expectedKeyType && lastKeyType && lastKeyType !== options.expectedKeyType) {
    issues.push(errorIssue(path, `Letzter Key muss Typ "${options.expectedKeyType}" haben, ist aber "${lastKeyType}".`, category));
  }

  validateReferenceByType(reference, path, issues, { ...options, category });
}

function validateReferenceByType(reference, path, issues, options) {
  if (!Array.isArray(reference.keys) || reference.keys.length === 0) return;
  if (reference.type === "ModelReference") {
    validateModelReference(reference, path, issues, options);
    return;
  }
  if (reference.type === "ExternalReference") {
    validateExternalReference(reference, path, issues, options);
  }
}

function validateModelReference(reference, path, issues, options) {
  const [firstKey, ...fragmentKeys] = reference.keys;
  const category = options.category ?? "references";

  if (firstKey?.type && !modelReferenceRootKeyTypes.has(firstKey.type)) {
    issues.push(
      errorIssue(
        `${path}.keys[0].type`,
        `ModelReference muss mit AssetAdministrationShell, Submodel oder ConceptDescription beginnen, nicht mit ${firstKey.type}.`,
        category,
      ),
    );
  }

  fragmentKeys.forEach((key, index) => {
    const keyPath = `${path}.keys[${index + 1}]`;
    if (key?.type && !modelReferenceFragmentKeyTypes.has(key.type)) {
      issues.push(
        errorIssue(
          `${keyPath}.type`,
          `Folge-Key in einer ModelReference muss ein Referable/Fragment sein, nicht ${key.type}.`,
          category,
        ),
      );
    }

    const previousKey = reference.keys[index];
    if (key?.type === "FragmentReference" && !["Blob", "File"].includes(previousKey?.type)) {
      issues.push(warnIssue(keyPath, "FragmentReference sollte direkt auf einen File- oder Blob-Key folgen.", category));
    }

    if (previousKey?.type === "SubmodelElementList" && key?.value && !/^\d+$/.test(String(key.value))) {
      issues.push(errorIssue(keyPath, "Key.value nach SubmodelElementList muss ein nicht-negativer Integer-Index sein.", category));
    }
  });

  validateLocalModelReferenceTarget(reference, path, issues, options);
}

function validateExternalReference(reference, path, issues, options) {
  if (options.allowExternalConceptDescription && reference.keys.length === 1 && reference.keys[0]?.type === "ConceptDescription") {
    return;
  }

  const category = options.category ?? "references";
  const firstKey = reference.keys[0];
  const lastKey = reference.keys.at(-1);

  if (firstKey?.type && !externalReferenceKeyTypes.has(firstKey.type)) {
    issues.push(
      warnIssue(
        `${path}.keys[0].type`,
        `ExternalReference sollte mit GlobalReference oder FragmentReference beginnen, nicht mit ${firstKey.type}.`,
        category,
      ),
    );
  }

  if (lastKey?.type && !externalReferenceKeyTypes.has(lastKey.type)) {
    issues.push(
      warnIssue(
        `${path}.keys[${reference.keys.length - 1}].type`,
        `ExternalReference sollte mit GlobalReference oder FragmentReference enden, nicht mit ${lastKey.type}.`,
        category,
      ),
    );
  }
}

function validateLocalModelReferenceTarget(reference, path, issues, options) {
  const context = options.referenceContext;
  if (!context || !Array.isArray(reference.keys) || reference.keys.length === 0) return;

  const firstKey = reference.keys[0];
  const rootIds = context.rootIdsByType.get(firstKey?.type);
  if (rootIds && firstKey.value && !rootIds.has(firstKey.value) && !options.skipLocalTargetWarning) {
    issues.push(
      warnIssue(
        `${path}.keys[0].value`,
        `ModelReference-Ziel "${firstKey.value}" wurde im aktuellen Package nicht gefunden.`,
        options.category ?? "references",
      ),
    );
    return;
  }

  if (firstKey?.type === "Submodel" && context.submodelsById.has(firstKey.value) && reference.keys.length > 1) {
    validateSubmodelElementReferencePath(
      context.submodelsById.get(firstKey.value),
      reference.keys.slice(1),
      `${path}.keys`,
      issues,
      options.category ?? "references",
    );
  }
}

function validateSubmodelElementReferencePath(submodel, keys, path, issues, category) {
  let children = submodel.submodelElements ?? [];

  keys.forEach((key, index) => {
    if (!Array.isArray(children)) return;

    let match;
    if (index > 0 && keys[index - 1]?.type === "SubmodelElementList") {
      const listIndex = Number(key.value);
      match = Number.isInteger(listIndex) && listIndex >= 0 ? children[listIndex] : undefined;
    } else {
      match = children.find((child) => child?.idShort === key.value);
    }

    if (!match) {
      issues.push(
        warnIssue(
          `${path}[${index + 1}].value`,
          `SubmodelElement-Referenzpfad "${key.value}" wurde im aktuellen Submodel nicht gefunden.`,
          category,
        ),
      );
      children = null;
      return;
    }

    if (key.type && match.modelType && key.type !== "SubmodelElement" && key.type !== match.modelType) {
      issues.push(
        warnIssue(
          `${path}[${index + 1}].type`,
          `Key.type "${key.type}" passt nicht zum referenzierten Elementtyp "${match.modelType}".`,
          category,
        ),
      );
    }

    children = getElementChildren(match);
  });
}

function validateQualifiers(qualifiers, path, issues, options = {}) {
  if (qualifiers === undefined) return;
  if (!Array.isArray(qualifiers)) {
    issues.push(errorIssue(path, "qualifiers muss ein Array sein."));
    return;
  }

  const seenTypes = new Set();
  qualifiers.forEach((qualifier, qualifierIndex) => {
    const qualifierPath = `${path}[${qualifierIndex}]`;
    if (!isPlainObject(qualifier)) {
      issues.push(errorIssue(qualifierPath, "Qualifier muss ein Objekt sein."));
      return;
    }
    requireField(qualifier, "type", qualifierPath, issues);
    if (qualifier.type) {
      if (seenTypes.has(qualifier.type)) {
        issues.push(warnIssue(qualifierPath, `Doppelter Qualifier.type in diesem Element: ${qualifier.type}`, "semantics"));
      }
      seenTypes.add(qualifier.type);
    }
    if (qualifier.valueType) {
      validateValueType(qualifier.valueType, `${qualifierPath}.valueType`, issues);
      validatePropertyValueByType(qualifier.value, qualifier.valueType, `${qualifierPath}.value`, issues);
    } else if (qualifier.value !== undefined) {
      issues.push(errorIssue(qualifierPath, "Qualifier mit value braucht valueType.", "datatypes"));
    }

    validateValueId(qualifier.valueId, `${qualifierPath}.valueId`, issues);
    validateSemanticIdIfPresent(qualifier.semanticId, `${qualifierPath}.semanticId`, issues, options.semanticContext, options.referenceContext);

    if (qualifier.type === "unit") {
      validateUnitQualifier(qualifier, qualifierPath, issues);
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
    issues.push(errorIssue(path, `valueType "${valueType}" ist kein gueltiger AAS-3.x-DataTypeDefXsd.`, "datatypes"));
  }
}

function validatePropertyValueByType(value, valueType, path, issues) {
  if (value === undefined || value === null || value === "") return;
  if (!aasValueTypes.has(valueType)) return;
  if (typeof value === "object") {
    issues.push(errorIssue(path, `${valueType}-Werte muessen skalar sein, nicht Objekt oder Array.`, "datatypes"));
    return;
  }

  const raw = String(value);
  if (raw.trim() !== raw) {
    issues.push(warnIssue(path, "Wert enthaelt fuehrende oder folgende Leerzeichen.", "datatypes"));
  }

  if (valueType === "xs:boolean" && !["true", "false", "0", "1"].includes(raw.toLowerCase())) {
    issues.push(errorIssue(path, `Wert "${raw}" passt nicht zu xs:boolean.`, "datatypes"));
  }

  if (integerValueTypes.has(valueType)) {
    validateIntegerValue(raw, valueType, path, issues);
  }

  if (valueType === "xs:decimal" && !/^[+-]?((\d+(\.\d*)?)|(\.\d+))$/.test(raw)) {
    issues.push(errorIssue(path, `Wert "${raw}" passt nicht zu xs:decimal.`, "datatypes"));
  }

  if (["xs:double", "xs:float"].includes(valueType) && !Number.isFinite(Number(raw))) {
    issues.push(errorIssue(path, `Wert "${raw}" passt nicht zu ${valueType}.`, "datatypes"));
  }

  if (valueType === "xs:date" && !isValidIsoDate(raw)) {
    issues.push(errorIssue(path, `Wert "${raw}" passt nicht zu xs:date.`, "datatypes"));
  }

  if (valueType === "xs:dateTime" && !isValidIsoDateTime(raw)) {
    issues.push(errorIssue(path, `Wert "${raw}" passt nicht zu xs:dateTime.`, "datatypes"));
  }

  if (valueType === "xs:time" && !isValidIsoTime(raw)) {
    issues.push(errorIssue(path, `Wert "${raw}" passt nicht zu xs:time.`, "datatypes"));
  }

  if (valueType === "xs:duration" && !/^-?P(?=\d|T\d)(\d+Y)?(\d+M)?(\d+D)?(T(\d+H)?(\d+M)?(\d+(\.\d+)?S)?)?$/.test(raw)) {
    issues.push(errorIssue(path, `Wert "${raw}" passt nicht zu xs:duration.`, "datatypes"));
  }

  if (valueType === "xs:anyURI" && /\s/.test(raw)) {
    issues.push(errorIssue(path, `Wert "${raw}" enthaelt Leerzeichen und passt nicht zu xs:anyURI.`, "datatypes"));
  }

  if (valueType === "xs:hexBinary" && !/^[0-9A-Fa-f]*$/.test(raw)) {
    issues.push(errorIssue(path, `Wert "${raw}" passt nicht zu xs:hexBinary.`, "datatypes"));
  } else if (valueType === "xs:hexBinary" && raw.length % 2 !== 0) {
    issues.push(errorIssue(path, "xs:hexBinary braucht eine gerade Anzahl Hex-Zeichen.", "datatypes"));
  }

  if (valueType === "xs:base64Binary" && !isValidBase64(raw)) {
    issues.push(errorIssue(path, `Wert "${raw}" passt nicht zu xs:base64Binary.`, "datatypes"));
  }

  validateGregorianValue(raw, valueType, path, issues);
}

function validateIntegerValue(raw, valueType, path, issues) {
  if (!/^[+-]?\d+$/.test(raw)) {
    issues.push(errorIssue(path, `Wert "${raw}" passt nicht zu ${valueType}.`, "datatypes"));
    return;
  }

  const value = BigInt(raw);
  if (valueType === "xs:positiveInteger" && value <= 0n) {
    issues.push(errorIssue(path, `Wert "${raw}" muss groesser als 0 sein.`, "datatypes"));
  }
  if (valueType === "xs:negativeInteger" && value >= 0n) {
    issues.push(errorIssue(path, `Wert "${raw}" muss negativ sein.`, "datatypes"));
  }
  if (valueType === "xs:nonNegativeInteger" && value < 0n) {
    issues.push(errorIssue(path, `Wert "${raw}" darf nicht negativ sein.`, "datatypes"));
  }
  if (valueType === "xs:nonPositiveInteger" && value > 0n) {
    issues.push(errorIssue(path, `Wert "${raw}" darf nicht positiv sein.`, "datatypes"));
  }

  const bounds = integerValueBounds[valueType];
  if (bounds && (value < bounds[0] || value > bounds[1])) {
    issues.push(errorIssue(path, `Wert "${raw}" liegt ausserhalb des Wertebereichs von ${valueType}.`, "datatypes"));
  }
}

function validateGregorianValue(raw, valueType, path, issues) {
  if (valueType === "xs:gYear" && !/^-?\d{4,}(Z|[+-]\d{2}:\d{2})?$/.test(raw)) {
    issues.push(errorIssue(path, `Wert "${raw}" passt nicht zu xs:gYear.`, "datatypes"));
  }
  if (valueType === "xs:gYearMonth" && !/^-?\d{4,}-(0[1-9]|1[0-2])(Z|[+-]\d{2}:\d{2})?$/.test(raw)) {
    issues.push(errorIssue(path, `Wert "${raw}" passt nicht zu xs:gYearMonth.`, "datatypes"));
  }
  if (valueType === "xs:gMonth" && !/^--(0[1-9]|1[0-2])(Z|[+-]\d{2}:\d{2})?$/.test(raw)) {
    issues.push(errorIssue(path, `Wert "${raw}" passt nicht zu xs:gMonth.`, "datatypes"));
  }
  if (valueType === "xs:gDay" && !/^---(0[1-9]|[12]\d|3[01])(Z|[+-]\d{2}:\d{2})?$/.test(raw)) {
    issues.push(errorIssue(path, `Wert "${raw}" passt nicht zu xs:gDay.`, "datatypes"));
  }
  if (valueType === "xs:gMonthDay" && !/^--(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])(Z|[+-]\d{2}:\d{2})?$/.test(raw)) {
    issues.push(errorIssue(path, `Wert "${raw}" passt nicht zu xs:gMonthDay.`, "datatypes"));
  }
}

function validateRangeOrder(element, path, issues) {
  const comparison = compareTypedValues(element.min, element.max, element.valueType);
  if (comparison !== null && comparison > 0) {
    issues.push(errorIssue(path, "Range.min darf nicht groesser als Range.max sein.", "datatypes"));
  }
}

function validateValueId(reference, path, issues) {
  validateReferenceIfPresent(reference, path, issues, { category: "references" });
}

function validateElementUnit(element, path, issues) {
  const unitQualifiers = (element.qualifiers ?? []).filter((qualifier) => qualifier?.type === "unit");
  if (unitQualifiers.length > 1) {
    issues.push(warnIssue(path, "Mehrere unit-Qualifier gefunden; eine eindeutige Einheit ist robuster.", "units"));
  }

  if (unitQualifiers.length === 0 && numericValueTypes.has(element.valueType) && looksLikeMeasuredQuantity(element.idShort)) {
    issues.push(warnIssue(path, "Numerischer Messwert ohne unit-Qualifier.", "units"));
  }
}

function validateUnitQualifier(qualifier, path, issues) {
  if (qualifier.value === undefined || qualifier.value === null || qualifier.value === "") {
    issues.push(errorIssue(path, "unit-Qualifier braucht einen Wert.", "units"));
    return;
  }

  if (qualifier.valueType && qualifier.valueType !== "xs:string") {
    issues.push(warnIssue(`${path}.valueType`, "unit-Qualifier sollte valueType xs:string nutzen.", "units"));
  }

  const unit = String(qualifier.value);
  const trimmedUnit = unit.trim();
  if (unit !== trimmedUnit) {
    issues.push(warnIssue(`${path}.value`, "unit enthaelt fuehrende oder folgende Leerzeichen.", "units"));
  }

  if (!/^[A-Za-z0-9%][A-Za-z0-9%./*^_-]*$/.test(trimmedUnit)) {
    issues.push(warnIssue(`${path}.value`, `unit "${unit}" nutzt ungewoehnliche Zeichen.`, "units"));
  } else if (!commonUnitSymbols.has(trimmedUnit)) {
    issues.push(warnIssue(`${path}.value`, `unit "${unit}" ist nicht in der lokalen Common-Unit-Liste.`, "units"));
  }
}

function compareTypedValues(min, max, valueType) {
  if (min === undefined || min === null || min === "" || max === undefined || max === null || max === "") return null;
  if (numericValueTypes.has(valueType)) {
    const left = Number(min);
    const right = Number(max);
    return Number.isFinite(left) && Number.isFinite(right) ? left - right : null;
  }
  if (valueType === "xs:date" && isValidIsoDate(String(min)) && isValidIsoDate(String(max))) {
    return Date.parse(`${min}T00:00:00Z`) - Date.parse(`${max}T00:00:00Z`);
  }
  if (valueType === "xs:dateTime" && isValidIsoDateTime(String(min)) && isValidIsoDateTime(String(max))) {
    return Date.parse(min) - Date.parse(max);
  }
  if (valueType === "xs:time" && isValidIsoTime(String(min)) && isValidIsoTime(String(max))) {
    return timeToMillis(String(min)) - timeToMillis(String(max));
  }
  return null;
}

function looksLikeMeasuredQuantity(idShort) {
  return /temperature|pressure|power|energy|voltage|current|speed|length|height|width|weight|mass|flow|frequency|torque|distance|reach/i.test(
    String(idShort ?? ""),
  );
}

function isValidIsoDate(value) {
  const match = /^(-?\d{4,})-(\d{2})-(\d{2})(Z|[+-]\d{2}:\d{2})?$/.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(Date.UTC(0, month - 1, day));
  parsed.setUTCFullYear(year);
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day;
}

function isValidIsoDateTime(value) {
  return /^-?\d{4,}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?$/.test(value) && !Number.isNaN(Date.parse(value));
}

function isValidIsoTime(value) {
  const match = /^(\d{2}):(\d{2}):(\d{2})(\.\d+)?(Z|[+-]\d{2}:\d{2})?$/.exec(value);
  if (!match) return false;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  const seconds = Number(match[3]);
  return hours <= 23 && minutes <= 59 && seconds <= 59;
}

function timeToMillis(value) {
  const [, hours, minutes, seconds] = /^(\d{2}):(\d{2}):(\d{2})/.exec(value) ?? [];
  return (Number(hours) * 3600 + Number(minutes) * 60 + Number(seconds)) * 1000;
}

function isValidBase64(value) {
  return /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value);
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
  dashboardLiveToggle.checked = false;
  if (dashboardLiveTimer) {
    window.clearInterval(dashboardLiveTimer);
    dashboardLiveTimer = null;
  }
  refreshDashboardCatalog();
  renderDashboard("Lade eine AAS, um Dashboard Widgets zu erstellen.");
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
