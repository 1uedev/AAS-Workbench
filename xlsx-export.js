import { createZip } from "./aasx-export.js";

export function createAasExcelBlob(aasPackage, options = {}) {
  return new Blob([createAasExcelBytes(aasPackage, options)], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

export function createAasExcelBytes(aasPackage, options = {}) {
  const sheets = buildWorkbookSheets(aasPackage, options);
  return createZip([
    { path: "[Content_Types].xml", content: contentTypesXml(sheets) },
    { path: "_rels/.rels", content: rootRelsXml() },
    { path: "docProps/core.xml", content: corePropertiesXml(options.generatedAt ?? new Date()) },
    { path: "docProps/app.xml", content: appPropertiesXml(sheets) },
    { path: "xl/workbook.xml", content: workbookXml(sheets) },
    { path: "xl/_rels/workbook.xml.rels", content: workbookRelsXml(sheets) },
    { path: "xl/styles.xml", content: stylesXml() },
    ...sheets.map((sheet, index) => ({
      path: `xl/worksheets/sheet${index + 1}.xml`,
      content: worksheetXml(sheet),
    })),
  ]);
}

function buildWorkbookSheets(aasPackage, options) {
  const validation = options.validationReport ?? { issues: [], stats: packageStats(aasPackage) };
  const stats = validation.stats ?? packageStats(aasPackage);
  const issueCounts = countIssues(validation.issues ?? []);
  const generatedAt = options.generatedAt ? new Date(options.generatedAt) : new Date();
  const { shells, submodels, elements } = extractAasRows(aasPackage);

  return [
    {
      name: "Summary",
      widths: [24, 54],
      rows: [
        ["AAS Workbench Export", ""],
        ["File", options.fileName ?? "aas-export"],
        ["Generated", generatedAt.toLocaleString("de-DE")],
        ["AAS", stats.shells],
        ["Submodels", stats.submodels],
        ["Elements", stats.elements],
        ["Validation Errors", issueCounts.errors],
        ["Validation Warnings", issueCounts.warnings],
        ["Validation Info", issueCounts.infos],
      ],
    },
    {
      name: "AAS",
      widths: [26, 44, 18, 44, 48],
      rows: [
        ["idShort", "id", "assetKind", "globalAssetId", "submodelReferences"],
        ...shells.map((shell) => [
          shell.idShort,
          shell.id,
          shell.assetKind,
          shell.globalAssetId,
          shell.submodelReferences,
        ]),
      ],
    },
    {
      name: "Submodels",
      widths: [26, 52, 18, 36],
      rows: [
        ["idShort", "id", "elementCount", "referencedByAAS"],
        ...submodels.map((submodel) => [
          submodel.idShort,
          submodel.id,
          submodel.elementCount,
          submodel.referencedByAAS,
        ]),
      ],
    },
    {
      name: "Elements",
      widths: [24, 42, 26, 26, 20, 34, 12, 52],
      rows: [
        ["submodel", "path", "idShort", "modelType", "valueType", "value", "unit", "semanticId"],
        ...elements.map((element) => [
          element.submodel,
          element.path,
          element.idShort,
          element.modelType,
          element.valueType,
          element.value,
          element.unit,
          element.semanticId,
        ]),
      ],
    },
    {
      name: "Issues",
      widths: [16, 22, 44, 80],
      rows: [
        ["severity", "category", "path", "message"],
        ...(validation.issues ?? []).map((issue) => [
          issue.severity ?? issue.level,
          issue.category ?? "structure",
          issue.title,
          issue.message,
        ]),
      ],
    },
  ];
}

function extractAasRows(aasPackage) {
  const shellRows = [];
  const submodelRows = [];
  const elementRows = [];
  const shells = aasPackage.assetAdministrationShells ?? [];
  const submodels = aasPackage.submodels ?? [];
  const submodelById = new Map(submodels.map((submodel) => [submodel.id, submodel]));
  const referencedBySubmodelId = new Map();

  shells.forEach((shell) => {
    const refs = (shell.submodels ?? []).map((reference) => reference.keys?.at(-1)?.value).filter(Boolean);
    refs.forEach((submodelId) => {
      const aasLabel = shell.idShort ?? shell.id ?? "AAS";
      const existing = referencedBySubmodelId.get(submodelId) ?? [];
      existing.push(aasLabel);
      referencedBySubmodelId.set(submodelId, existing);
    });

    shellRows.push({
      idShort: shell.idShort ?? "",
      id: shell.id ?? "",
      assetKind: shell.assetInformation?.assetKind ?? "",
      globalAssetId: shell.assetInformation?.globalAssetId ?? "",
      submodelReferences: refs.join("\n"),
    });
  });

  submodels.forEach((submodel) => {
    const elements = submodel.submodelElements ?? [];
    submodelRows.push({
      idShort: submodel.idShort ?? "",
      id: submodel.id ?? "",
      elementCount: countElements(elements),
      referencedByAAS: (referencedBySubmodelId.get(submodel.id) ?? []).join(", "),
    });

    elements.forEach((element, index) => {
      collectElementRows(elementRows, element, {
        submodelLabel: submodel.idShort ?? submodel.id ?? "Submodel",
        path: [element.idShort || `Element${index + 1}`],
      });
    });
  });

  for (const [submodelId, submodel] of submodelById) {
    if (!submodelRows.some((row) => row.id === submodelId)) {
      submodelRows.push({
        idShort: submodel.idShort ?? "",
        id: submodel.id ?? "",
        elementCount: countElements(submodel.submodelElements ?? []),
        referencedByAAS: "",
      });
    }
  }

  return { shells: shellRows, submodels: submodelRows, elements: elementRows };
}

function collectElementRows(rows, element, context) {
  const children = getElementChildren(element);
  const unit = element.qualifiers?.find((qualifier) => qualifier.type === "unit")?.value ?? "";
  const semanticId = element.semanticId?.keys?.at(-1)?.value ?? "";
  rows.push({
    submodel: context.submodelLabel,
    path: context.path.join(" / "),
    idShort: element.idShort ?? "",
    modelType: element.modelType ?? "",
    valueType: element.valueType ?? "",
    value: children.length ? `${children.length} child elements` : formatCellValue(element.value),
    unit,
    semanticId,
  });

  children.forEach((child, index) => {
    collectElementRows(rows, child, {
      submodelLabel: context.submodelLabel,
      path: [...context.path, child.idShort || `Element${index + 1}`],
    });
  });
}

function worksheetXml(sheet) {
  const rowXml = sheet.rows
    .map((row, rowIndex) => {
      const cells = row.map((value, colIndex) => cellXml(value, rowIndex + 1, colIndex + 1, rowIndex === 0));
      return `<row r="${rowIndex + 1}">${cells.join("")}</row>`;
    })
    .join("");
  const dimension = `A1:${columnName(Math.max(1, sheet.rows[0]?.length ?? 1))}${Math.max(1, sheet.rows.length)}`;
  const cols = sheet.widths
    .map((width, index) => `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`)
    .join("");
  const autoFilter =
    sheet.rows.length > 1 ? `<autoFilter ref="A1:${columnName(sheet.rows[0].length)}${sheet.rows.length}"/>` : "";

  return xmlDecl(`\
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <dimension ref="${dimension}"/>
  <sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
  <cols>${cols}</cols>
  <sheetData>${rowXml}</sheetData>
  ${autoFilter}
</worksheet>`);
}

function cellXml(value, rowNumber, colNumber, isHeader) {
  const ref = `${columnName(colNumber)}${rowNumber}`;
  const style = isHeader ? 1 : 0;
  if (typeof value === "number" && Number.isFinite(value)) {
    return `<c r="${ref}" s="${style}"><v>${value}</v></c>`;
  }

  return `<c r="${ref}" s="${style}" t="inlineStr"><is><t${needsPreserve(value) ? ' xml:space="preserve"' : ""}>${escapeXml(String(value ?? ""))}</t></is></c>`;
}

function contentTypesXml(sheets) {
  return xmlDecl(`\
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  ${sheets
    .map((_, index) => `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`)
    .join("\n  ")}
</Types>`);
}

function rootRelsXml() {
  return xmlDecl(`\
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`);
}

function workbookXml(sheets) {
  return xmlDecl(`\
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <bookViews><workbookView/></bookViews>
  <sheets>
    ${sheets.map((sheet, index) => `<sheet name="${escapeXml(sheet.name)}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`).join("\n    ")}
  </sheets>
</workbook>`);
}

function workbookRelsXml(sheets) {
  return xmlDecl(`\
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  ${sheets.map((_, index) => `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`).join("\n  ")}
  <Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`);
}

function stylesXml() {
  return xmlDecl(`\
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="2">
    <font><sz val="11"/><name val="Calibri"/></font>
    <font><b/><color rgb="FFFFFFFF"/><sz val="11"/><name val="Calibri"/></font>
  </fonts>
  <fills count="3">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF116A5C"/><bgColor indexed="64"/></patternFill></fill>
  </fills>
  <borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="2">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
  </cellXfs>
  <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`);
}

function corePropertiesXml(date) {
  const timestamp = new Date(date).toISOString();
  return xmlDecl(`\
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:creator>AAS Workbench</dc:creator>
  <cp:lastModifiedBy>AAS Workbench</cp:lastModifiedBy>
  <dcterms:created xsi:type="dcterms:W3CDTF">${timestamp}</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">${timestamp}</dcterms:modified>
</cp:coreProperties>`);
}

function appPropertiesXml(sheets) {
  return xmlDecl(`\
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Application>AAS Workbench</Application>
  <DocSecurity>0</DocSecurity>
  <ScaleCrop>false</ScaleCrop>
  <HeadingPairs><vt:vector size="2" baseType="variant"><vt:variant><vt:lpstr>Worksheets</vt:lpstr></vt:variant><vt:variant><vt:i4>${sheets.length}</vt:i4></vt:variant></vt:vector></HeadingPairs>
  <TitlesOfParts><vt:vector size="${sheets.length}" baseType="lpstr">${sheets.map((sheet) => `<vt:lpstr>${escapeXml(sheet.name)}</vt:lpstr>`).join("")}</vt:vector></TitlesOfParts>
</Properties>`);
}

function packageStats(aasPackage) {
  const submodels = aasPackage.submodels ?? [];
  return {
    shells: aasPackage.assetAdministrationShells?.length ?? 0,
    submodels: submodels.length,
    elements: countElements(submodels.flatMap((submodel) => submodel.submodelElements ?? [])),
  };
}

function countElements(elements) {
  return elements.reduce((total, element) => total + 1 + countElements(getElementChildren(element)), 0);
}

function getElementChildren(element) {
  if (Array.isArray(element.value) && element.value.every((item) => item && typeof item === "object")) {
    return element.value;
  }

  if (Array.isArray(element.statements)) {
    return element.statements;
  }

  return [];
}

function countIssues(issues) {
  return {
    errors: issues.filter((issue) => issue.level === "error").length,
    warnings: issues.filter((issue) => issue.level === "warning").length,
    infos: issues.filter((issue) => issue.level === "info").length,
  };
}

function formatCellValue(value) {
  if (value === undefined || value === null) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function columnName(index) {
  let name = "";
  let value = index;
  while (value > 0) {
    const remainder = (value - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    value = Math.floor((value - 1) / 26);
  }
  return name || "A";
}

function xmlDecl(xml) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n${xml}`;
}

function escapeXml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function needsPreserve(value) {
  return /^\s|\s$|\n/.test(String(value ?? ""));
}
