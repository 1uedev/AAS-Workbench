const pageWidth = 595.28;
const pageHeight = 841.89;
const margin = 48;
const footerY = 28;
const contentWidth = pageWidth - margin * 2;
const maxReportElements = 260;

export function createAasPdfBlob(aasPackage, options = {}) {
  const builder = new PdfBuilder();
  buildReport(builder, aasPackage, options);
  return builder.toBlob();
}

function buildReport(builder, aasPackage, options) {
  const validation = options.validationReport ?? { issues: [], stats: packageStats(aasPackage) };
  const stats = validation.stats ?? packageStats(aasPackage);
  const issueCounts = countIssues(validation.issues ?? []);
  const generatedAt = options.generatedAt ? new Date(options.generatedAt) : new Date();

  builder.heading("AAS Workbench Report", 22);
  builder.text(`Datei: ${options.fileName ?? "aas-export"}`, { size: 10 });
  builder.text(`Erstellt: ${generatedAt.toLocaleString("de-DE")}`, { size: 10, gapAfter: 8 });

  builder.heading("Uebersicht", 15);
  builder.text(`AAS: ${stats.shells} | Submodels: ${stats.submodels} | Elements: ${stats.elements}`);
  builder.text(
    `Validierung: ${issueCounts.errors} Fehler | ${issueCounts.warnings} Warnungen${issueCounts.infos ? ` | ${issueCounts.infos} Infos` : ""}`,
    { gapAfter: 8 },
  );

  renderIssues(builder, validation.issues ?? []);
  renderShells(builder, aasPackage);
  renderUnreferencedSubmodels(builder, aasPackage);
}

function renderIssues(builder, issues) {
  builder.heading("Validierung", 15);
  if (!issues.length) {
    builder.text("Keine Issues gefunden.", { gapAfter: 8 });
    return;
  }

  issues.slice(0, 20).forEach((issue) => {
    builder.text(
      `${formatIssueLevel(issue.level)} | ${formatIssueCategory(issue.category)}: ${issue.title} - ${issue.message}`,
      {
        bullet: true,
        size: 9,
      },
    );
  });

  if (issues.length > 20) {
    builder.text(`${issues.length - 20} weitere Issues nicht im PDF aufgefuehrt.`, { size: 9 });
  }
  builder.space(8);
}

function renderShells(builder, aasPackage) {
  const shells = aasPackage.assetAdministrationShells ?? [];
  const submodels = aasPackage.submodels ?? [];
  const submodelById = new Map(submodels.map((submodel) => [submodel.id, submodel]));
  let renderedElements = 0;

  builder.heading("AAS Struktur", 15);
  if (!shells.length) {
    builder.text("Keine Asset Administration Shells vorhanden.");
    return;
  }

  shells.forEach((shell, shellIndex) => {
    builder.heading(`AAS ${shellIndex + 1}: ${shell.idShort ?? "ohne idShort"}`, 13);
    builder.text(`ID: ${shell.id ?? "nicht gesetzt"}`, { mono: true, size: 8 });
    builder.text(`Asset: ${shell.assetInformation?.globalAssetId ?? "nicht gesetzt"}`, {
      mono: true,
      size: 8,
      gapAfter: 5,
    });

    const references = shell.submodels ?? [];
    if (!references.length) {
      builder.text("Keine Submodel-Referenzen.", { bullet: true });
      return;
    }

    references.forEach((reference) => {
      const target = reference.keys?.at(-1)?.value;
      const submodel = submodelById.get(target);
      if (!submodel) {
        builder.text(`Submodel-Referenz nicht gefunden: ${target ?? "leer"}`, { bullet: true });
        return;
      }

      renderedElements = renderSubmodel(builder, submodel, renderedElements);
    });
  });

  if (renderedElements >= maxReportElements) {
    builder.text(`Elementliste nach ${maxReportElements} Eintraegen gekuerzt.`, { size: 9 });
  }
}

function renderUnreferencedSubmodels(builder, aasPackage) {
  const shells = aasPackage.assetAdministrationShells ?? [];
  const submodels = aasPackage.submodels ?? [];
  const referenced = new Set(
    shells.flatMap((shell) => (shell.submodels ?? []).map((reference) => reference.keys?.at(-1)?.value).filter(Boolean)),
  );
  const unreferenced = submodels.filter((submodel) => !referenced.has(submodel.id));

  if (!unreferenced.length) return;

  builder.heading("Nicht referenzierte Submodels", 15);
  let renderedElements = 0;
  unreferenced.forEach((submodel) => {
    renderedElements = renderSubmodel(builder, submodel, renderedElements);
  });
}

function renderSubmodel(builder, submodel, renderedElements) {
  const elements = submodel.submodelElements ?? [];
  builder.heading(`Submodel: ${submodel.idShort ?? "ohne idShort"}`, 11);
  builder.text(`ID: ${submodel.id ?? "nicht gesetzt"}`, { mono: true, size: 8 });
  builder.text(`Elements: ${elements.length}`, { size: 9 });

  for (const element of elements) {
    if (renderedElements >= maxReportElements) return renderedElements;
    renderedElements = renderElement(builder, element, renderedElements, 1);
  }

  builder.space(5);
  return renderedElements;
}

function renderElement(builder, element, renderedElements, depth) {
  if (renderedElements >= maxReportElements) return renderedElements;

  const children = getElementChildren(element);
  const unit = element.qualifiers?.find((qualifier) => qualifier.type === "unit")?.value;
  const value = children.length
    ? `${children.length} Children`
    : [formatValue(element.value), unit].filter(Boolean).join(" ");
  const type = element.valueType ?? element.modelType ?? "Element";
  const label = `${element.idShort ?? "Element"} [${type}]${value ? ` = ${value}` : ""}`;

  builder.text(label, { bullet: true, indent: depth * 12, size: 9 });
  renderedElements += 1;

  const semantic = element.semanticId?.keys?.at(-1)?.value;
  if (semantic) {
    builder.text(`semanticId: ${semantic}`, { indent: depth * 12 + 12, mono: true, size: 7 });
  }

  for (const child of children) {
    renderedElements = renderElement(builder, child, renderedElements, depth + 1);
  }

  return renderedElements;
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

function formatIssueLevel(level) {
  const labels = {
    error: "Fehler",
    warning: "Warnung",
    info: "Info",
  };
  return labels[level] ?? level ?? "Issue";
}

function formatIssueCategory(category) {
  const labels = {
    structure: "Struktur",
    references: "Referenzen",
    datatypes: "Datentypen",
    semantics: "Semantik",
    interoperability: "Interoperabilitaet",
  };
  return labels[category] ?? labels.structure;
}

function formatValue(value) {
  if (value === undefined || value === null || value === "") return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

class PdfBuilder {
  constructor() {
    this.pages = [];
    this.currentPage = null;
    this.pageNumber = 0;
    this.addPage();
  }

  heading(text, size) {
    this.addText(text, { font: "bold", size, gapBefore: size > 14 ? 8 : 5, gapAfter: 4 });
  }

  text(text, options = {}) {
    this.addText(text, options);
  }

  space(height) {
    this.currentPage.y -= height;
    this.ensureSpace(0);
  }

  addText(text, options = {}) {
    const size = options.size ?? 9;
    const font = options.mono ? "mono" : options.font ?? "regular";
    const lineHeight = Math.max(size + 3, 10);
    const indent = options.indent ?? 0;
    const prefix = options.bullet ? "- " : "";
    const availableWidth = contentWidth - indent;
    const maxChars = Math.max(28, Math.floor(availableWidth / (size * 0.52)));
    const lines = wrapText(`${prefix}${text}`, maxChars);

    if (options.gapBefore) this.space(options.gapBefore);

    lines.forEach((line, index) => {
      const lineIndent = index === 0 ? indent : indent + (options.bullet ? 10 : 0);
      this.ensureSpace(lineHeight);
      this.currentPage.commands.push(textCommand(line, margin + lineIndent, this.currentPage.y, size, font));
      this.currentPage.y -= lineHeight;
    });

    if (options.gapAfter) this.space(options.gapAfter);
  }

  ensureSpace(height) {
    if (this.currentPage.y - height < 62) {
      this.addFooter();
      this.addPage();
    }
  }

  addPage() {
    this.pageNumber += 1;
    this.currentPage = { commands: [], y: pageHeight - margin };
    this.pages.push(this.currentPage);
  }

  addFooter() {
    if (this.currentPage.footerAdded) return;
    this.currentPage.commands.push(textCommand(`Seite ${this.pageNumber}`, margin, footerY, 8, "regular"));
    this.currentPage.footerAdded = true;
  }

  toBlob() {
    this.addFooter();
    return writePdf(this.pages);
  }
}

function textCommand(text, x, y, size, font) {
  const fontName = font === "bold" ? "F2" : font === "mono" ? "F3" : "F1";
  return `BT /${fontName} ${size} Tf 1 0 0 1 ${number(x)} ${number(y)} Tm (${escapePdfText(text)}) Tj ET\n`;
}

function writePdf(pages) {
  const encoder = new TextEncoder();
  const offsets = [];
  const chunks = [];
  let byteLength = 0;

  const write = (text) => {
    chunks.push(text);
    byteLength += encoder.encode(text).length;
  };

  const writeObject = (id, body) => {
    offsets[id] = byteLength;
    write(`${id} 0 obj\n${body}\nendobj\n`);
  };

  write("%PDF-1.4\n");
  writeObject(1, "<< /Type /Catalog /Pages 2 0 R >>");
  writeObject(2, `<< /Type /Pages /Kids [${pages.map((_, index) => `${6 + index * 2} 0 R`).join(" ")}] /Count ${pages.length} >>`);
  writeObject(3, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  writeObject(4, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");
  writeObject(5, "<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>");

  pages.forEach((page, index) => {
    const pageId = 6 + index * 2;
    const contentId = pageId + 1;
    const content = page.commands.join("");
    writeObject(
      pageId,
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${number(pageWidth)} ${number(pageHeight)}] /Resources << /ProcSet [/PDF /Text] /Font << /F1 3 0 R /F2 4 0 R /F3 5 0 R >> >> /Contents ${contentId} 0 R >>`,
    );
    writeObject(contentId, `<< /Length ${encoder.encode(content).length} >>\nstream\n${content}endstream`);
  });

  const xrefOffset = byteLength;
  const objectCount = 5 + pages.length * 2;
  write(`xref\n0 ${objectCount + 1}\n`);
  write("0000000000 65535 f \n");
  for (let id = 1; id <= objectCount; id += 1) {
    write(`${String(offsets[id]).padStart(10, "0")} 00000 n \n`);
  }
  write(`trailer\n<< /Size ${objectCount + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`);

  return new Blob(chunks, { type: "application/pdf" });
}

function wrapText(text, maxChars) {
  const normalized = sanitizeText(text);
  const words = normalized.split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";

  words.forEach((word) => {
    const parts = splitLongWord(word, maxChars);
    parts.forEach((part) => {
      if (!line) {
        line = part;
      } else if (`${line} ${part}`.length <= maxChars) {
        line = `${line} ${part}`;
      } else {
        lines.push(line);
        line = part;
      }
    });
  });

  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

function splitLongWord(word, maxChars) {
  if (word.length <= maxChars) return [word];
  const parts = [];
  for (let index = 0; index < word.length; index += maxChars) {
    parts.push(word.slice(index, index + maxChars));
  }
  return parts;
}

function escapePdfText(text) {
  return sanitizeText(text)
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function sanitizeText(value) {
  return String(value ?? "")
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/Ä/g, "Ae")
    .replace(/Ö/g, "Oe")
    .replace(/Ü/g, "Ue")
    .replace(/ß/g, "ss")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, "?");
}

function number(value) {
  return Number(value).toFixed(2).replace(/\.?0+$/, "");
}
