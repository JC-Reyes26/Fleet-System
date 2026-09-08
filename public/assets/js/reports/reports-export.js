/* ==========================================
   Reports Print / PDF / Excel
   Uses getActiveReportOutputModel() — no pipeline re-run
========================================== */

function canExportReports() {
    return window.FleetRBAC?.hasPermission?.("reports", "canExport") === true;
}

let reportsExportBusy = false;

function showReportsExportToast(message, type) {
  if (typeof showToast === "function") {
    showToast(message, type);
  } else if (typeof window.showToast === "function") {
    window.showToast(message, type);
  }
}

async function auditReportExport(format, model) {
    if (!window.REPORT_AUDIT_URL || !model) {
        return;
    }

    try {
        const csrfToken = document
            .querySelector('meta[name="csrf-token"]')
            ?.getAttribute("content");
        const dateRange =
            document.getElementById("reportDateRange")?.value || null;
        const startDate =
            document.getElementById("reportStartDate")?.value || null;
        const endDate = document.getElementById("reportEndDate")?.value || null;
        const vehicleValue =
            document.getElementById("reportVehicleFilter")?.value || null;
        const departmentValue =
            document.getElementById("reportDepartmentFilter")?.value || null;
        const response = await fetch(window.REPORT_AUDIT_URL, {
            method: "POST",

            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
                "X-CSRF-TOKEN": csrfToken,
            },

            body: JSON.stringify({
                format: format,
                report_type: model.reportType || "overview",
                date_range: dateRange,
                start_date: dateRange === "custom" ? startDate : null,
                end_date: dateRange === "custom" ? endDate : null,
                vehicle_id:
                    vehicleValue && vehicleValue !== "all"
                        ? Number(vehicleValue)
                        : null,
                department:
                    departmentValue && departmentValue !== "all"
                        ? departmentValue
                        : null,
            }),
        });

        if (!response.ok) {
            console.error("Report audit request failed:", response.status);
        }
    } catch (error) {
        /*
    |--------------------------------------------------------------------------
    | Never break an already-successful export
    |--------------------------------------------------------------------------
    */
        console.error("Report export audit failed:", error);
    }
}

function getReportsExportDateStamp() {
  const now = new Date();
  return (
    now.getFullYear() +
    "-" +
    String(now.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(now.getDate()).padStart(2, "0")
  );
}

function getReportsFileSlug(title) {
  return String(title || "report")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getReportsExportFilename(ext) {
  const model =
    typeof getActiveReportOutputModel === "function"
      ? getActiveReportOutputModel()
      : { title: "report", reportType: "overview" };

  const typeSlugs = {
    overview: "overview-report",
    utilization: "fleet-utilization-report",
    trips: "trip-dispatch-report",
    reservations: "reservations-report",
    maintenance: "maintenance-report",
    fuel: "fuel-cost-report",
    drivers: "driver-performance-report",
  };

  const slug =
    typeSlugs[model.reportType] || getReportsFileSlug(model.title) || "report";
  return slug + "-" + getReportsExportDateStamp() + "." + ext;
}

function buildReportsKpiLines(model, options = {}) {
    const k = model.kpis || {};
    const type = model.reportType;

    const cur =
        typeof options.currencyFormatter === "function"
            ? options.currencyFormatter
            : typeof formatReportCurrency === "function"
              ? formatReportCurrency
              : (value) => String(value ?? 0);
    const lit =
        typeof formatReportLiters === "function"
            ? formatReportLiters
            : (v) => String(v ?? 0);
    const pct =
        typeof formatReportPercent === "function"
            ? formatReportPercent
            : (v) => String(v ?? 0);

    if (type === "overview") {
        return [
            ["Total Vehicles", k.totalVehicles ?? 0],
            ["Available Vehicles", k.availableVehicles ?? 0],
            ["Completed Trips", k.completedTrips ?? 0],
            ["Active Reservations", k.activeReservations ?? 0],
            ["Maintenance Cost", cur(k.maintenanceCost)],
            ["Fuel Cost", cur(k.fuelCost)],
        ];
    }
    if (type === "utilization") {
        return [
            ["Total Vehicles", k.totalVehicles ?? 0],
            ["Vehicles Used", k.vehiclesUsed ?? 0],
            ["Available Vehicles", k.availableVehicles ?? 0],
            ["Utilization Rate", pct(k.utilizationRate)],
        ];
    }
    if (type === "trips") {
        return [
            ["Total Trips", k.total ?? 0],
            ["Completed", k.completed ?? 0],
            ["Ongoing", k.ongoing ?? 0],
            ["Cancelled", k.cancelled ?? 0],
        ];
    }
    if (type === "reservations") {
        return [
            ["Total Reservations", k.total ?? 0],
            ["Pending", k.pending ?? 0],
            ["Approved", k.approved ?? 0],
            ["Completed", k.completed ?? 0],
            ["Cancelled", k.cancelled ?? 0],
        ];
    }
    if (type === "maintenance") {
        return [
            ["Total Maintenance Records", k.total ?? 0],
            ["Scheduled", k.scheduled ?? 0],
            ["In Progress", k.inProgress ?? 0],
            ["Completed", k.completed ?? 0],
            ["Total Maintenance Cost", cur(k.totalCost)],
        ];
    }
    if (type === "fuel") {
        return [
            ["Total Fuel Records", k.total ?? 0],
            ["Total Fuel Consumed", lit(k.quantity)],
            ["Total Fuel Cost", cur(k.totalCost)],
            ["Average Cost per Liter", cur(k.averagePerLiter) + "/L"],
        ];
    }
    if (type === "drivers") {
        return [
            ["Total Drivers", k.total ?? 0],
            ["Active Drivers", k.active ?? 0],
            ["Drivers with Completed Trips", k.withTrips ?? 0],
            [
                "Average Trips per Active Driver",
                Number(k.avgTrips || 0).toLocaleString(undefined, {
                    maximumFractionDigits: 1,
                }),
            ],
        ];
    }
    return Object.entries(k).map(([key, value]) => [key, value]);
}

function hasMeaningfulReportData(model) {
  if (!model) return false;
  if ((model.rows || []).length > 0) return true;
  const kpis = model.kpis || {};
  return Object.values(kpis).some((v) => {
    if (typeof v === "number") return v !== 0 && !Number.isNaN(v);
    return Boolean(v);
  });
}

function formatReportsPdfCurrency(value) {
    const num = Number(value);
    if (Number.isNaN(num)) {
        return "PHP 0.00";
    }
    return (
        "PHP " +
        num.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        })
    );
}

function normalizeReportsPdfText(value) {
    if (value == null || value === "") {
        return "—";
    }
    return String(value).replace(/₱\s*/g, "PHP ");
}

function formatReportsPdfCell(value, col) {
    if (value == null || value === "") {
        return "—";
    }
    if (col?.type === "currency") {
        return formatReportsPdfCurrency(value);
    }
    const key = String(col?.key || "").toLowerCase();
    if (
        (key.includes("cost") ||
            key === "costperliter" ||
            key === "totalcost") &&
        typeof value === "number"
    ) {
        return formatReportsPdfCurrency(value);
    }
    if (col?.type === "percent" && typeof formatReportPercent === "function") {
        return formatReportPercent(value);
    }
    if (col?.type === "number") {
        const num = Number(value);
        if (Number.isNaN(num)) {
            return normalizeReportsPdfText(value);
        }
        return num.toLocaleString(undefined, {
            maximumFractionDigits: 2,
        });
    }
    return normalizeReportsPdfText(value);
}

function formatReportsExportCell(value, col) {
  if (value == null || value === "") return "";

  const key = (col?.key || "").toLowerCase();
  if (
    (key.includes("cost") || key === "costperliter" || key === "totalcost") &&
    typeof value === "number" &&
    typeof formatReportCurrency === "function"
  ) {
    return formatReportCurrency(value);
  }

  if (col?.type === "number" && typeof value === "number") {
    return value;
  }

  return value;
}

function escapeReportsHtml(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildReportsPrintHtml(model) {
  const kpiLines = buildReportsKpiLines(model);
  const columns = model.columns || [];
  const rows = model.rows || [];
  const filters = (model.filterSummary || [])
    .map((line) => `<p class="meta">${escapeReportsHtml(line)}</p>`)
    .join("");

  const kpiHtml = kpiLines
    .map(
      ([label, value]) =>
        `<span><strong>${escapeReportsHtml(label)}:</strong> ${escapeReportsHtml(
          value,
        )}</span>`,
    )
    .join("");

  const head = columns
    .map((c) => `<th>${escapeReportsHtml(c.label)}</th>`)
    .join("");

  const body =
    rows.length === 0
      ? `<tr><td colspan="${Math.max(columns.length, 1)}">No table rows for this report.</td></tr>`
      : rows
          .map((row) => {
            return (
              "<tr>" +
              columns
                .map((col) => {
                  const raw = formatReportsExportCell(row[col.key], col);
                  return (
                    "<td>" +
                    escapeReportsHtml(
                      raw === "" || raw == null ? "—" : raw,
                    ) +
                    "</td>"
                  );
                })
                .join("") +
              "</tr>"
            );
          })
          .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${escapeReportsHtml(model.title)}</title>
  <style>
    @page { size: A4 landscape; margin: 12mm; }
    * { box-sizing: border-box; }
    body {
      margin: 0; padding: 0;
      font-family: Arial, Helvetica, sans-serif;
      color: #000; background: #fff; font-size: 10px; line-height: 1.35;
    }
    h1 { margin: 0 0 2px; font-size: 16px; color: #00a86b; }
    h2 { margin: 0 0 4px; font-size: 13px; font-weight: 600; }
    h3 { margin: 0 0 8px; font-size: 14px; }
    .meta { margin: 2px 0; color: #333; }
    .summary {
      margin: 8px 0 12px; padding: 8px 10px;
      border: 1px solid #ddd; background: #f8fafc;
      display: flex; flex-wrap: wrap; gap: 8px 16px;
    }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; }
    thead { display: table-header-group; }
    th, td {
      border: 1px solid #333; padding: 4px 5px;
      text-align: left; vertical-align: top; word-wrap: break-word;
    }
    th { background: #e8f8f2; font-weight: 700; font-size: 9px; }
    tr { page-break-inside: avoid; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <h1>Fleet &amp; Transportation Management</h1>
  <h2>Hospital Information Management System</h2>
  <h3>Reports &amp; Analytics — ${escapeReportsHtml(model.title)}</h3>
  <p class="meta">Generated Date: ${escapeReportsHtml(model.generatedDate)}</p>
  <p class="meta">Generated Time: ${escapeReportsHtml(model.generatedTime)}</p>
  ${filters}
  <p class="meta">Total Report Records: ${rows.length}</p>
  <div class="summary">${kpiHtml}</div>
  ${
    columns.length
      ? `<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`
      : ""
  }
</body>
</html>`;
}

function printReports() {
  if (!canExportReports()) {
      showReportsExportToast(
          "You do not have permission to export reports.",
          "error",
      );
      return;
  }
  if (reportsExportBusy) return;

  const model =
    typeof getActiveReportOutputModel === "function"
      ? getActiveReportOutputModel()
      : null;

  if (!hasMeaningfulReportData(model)) {
    showReportsExportToast("No report data available to print.", "warning");
    return;
  }

  /* Charts are CSS/SVG (not Chart.js canvas) — print KPI + table only */
  let printWindow;
  try {
    printWindow = window.open(
      "",
      "_blank",
      "noopener,noreferrer,width=1100,height=760",
    );
  } catch (error) {
    console.error("Reports print window failed:", error);
    showReportsExportToast("Unable to open the print report.", "error");
    return;
  }

  if (!printWindow) {
    showReportsExportToast("Unable to open the print report.", "error");
    return;
  }

  reportsExportBusy = true;
  try {
    printWindow.document.open();
    printWindow.document.write(buildReportsPrintHtml(model));
    printWindow.document.close();

    const runPrint = () => {
      try {
        printWindow.focus();
        printWindow.print();
        void auditReportExport("print", model);
      } catch (error) {
        console.error("Reports print failed:", error);
        showReportsExportToast("Unable to print report.", "error");
      }
      const closeWindow = () => {
        try {
          printWindow.close();
        } catch {
          /* ignore */
        }
        reportsExportBusy = false;
      };
      if (typeof printWindow.addEventListener === "function") {
        printWindow.addEventListener("afterprint", closeWindow, { once: true });
      }
      setTimeout(closeWindow, 1500);
    };

    if (printWindow.document.readyState === "complete") {
      runPrint();
    } else {
      printWindow.onload = runPrint;
    }
  } catch (error) {
    console.error("Reports print failed:", error);
    showReportsExportToast("Unable to print report.", "error");
    reportsExportBusy = false;
    try {
      printWindow.close();
    } catch {
      /* ignore */
    }
  }
}

function exportReportsToExcel() {
  if (!canExportReports()) {
      showReportsExportToast(
          "You do not have permission to export reports.",
          "error",
      );
      return;
  }
  if (reportsExportBusy) return;

  const xlsx = window.XLSX;
  if (!xlsx?.utils) {
    showReportsExportToast("Excel export is unavailable.", "error");
    return;
  }

  const model =
    typeof getActiveReportOutputModel === "function"
      ? getActiveReportOutputModel()
      : null;

  if (!hasMeaningfulReportData(model)) {
    showReportsExportToast("No report data available to export.", "warning");
    return;
  }

  reportsExportBusy = true;
  try {
    const kpiLines = buildReportsKpiLines(model);
    const columns = model.columns || [];
    const rows = model.rows || [];

    const summary = [
      ["Fleet & Transportation Management"],
      ["Hospital Information Management System"],
      ["Reports & Analytics"],
      [model.title],
      [],
      ["Generated Date", model.generatedDate],
      ["Generated Time", model.generatedTime],
      ["Total Records", rows.length],
      [],
      ["Applied Filters"],
      ...(model.filterSummary || []).map((line) => [line]),
      [],
      ["KPI Summary"],
      ...kpiLines.map(([label, value]) => [label, value]),
    ];

    const dataSheet =
      columns.length === 0
        ? [["No table data for this report type"]]
        : [
            columns.map((c) => c.label),
            ...rows.map((row) =>
              columns.map((col) => {
                const value = formatReportsExportCell(row[col.key], col);
                /* Prefer raw numbers for numeric columns in Excel */
                if (
                    (col.type === "number" ||
                        col.type === "currency" ||
                        col.type === "percent") &&
                    typeof row[col.key] === "number"
                ) {
                    return row[col.key];
                }
                if (
                  (col.key || "").toLowerCase().includes("cost") &&
                  typeof row[col.key] === "number"
                ) {
                  return row[col.key];
                }
                return value == null ? "" : value;
              }),
            ),
          ];

    const workbook = xlsx.utils.book_new();
    const summarySheet = xlsx.utils.aoa_to_sheet(summary);
    summarySheet["!cols"] = [{ wch: 34 }, { wch: 48 }];
    xlsx.utils.book_append_sheet(workbook, summarySheet, "Report Summary");
    const reportSheet = xlsx.utils.aoa_to_sheet(dataSheet);
    reportSheet["!cols"] = (model.columns || []).map((column) => {
        if (column.type === "currency") {
            return { wch: 18 };
        }
        if (column.type === "date") {
            return { wch: 14 };
        }

        if (
            [
                "vehicle",
                "vehicleName",
                "driverName",
                "assignedVehicle",
            ].includes(column.key)
        ) {
            return { wch: 30 };
        }

        if (
            ["origin", "destination", "purpose", "serviceProvider"].includes(
                column.key,
            )
        ) {
            return { wch: 28 };
        }
        return { wch: 20 };
    });

    xlsx.utils.book_append_sheet(workbook, reportSheet, "Report Data");
    xlsx.writeFile(workbook, getReportsExportFilename("xlsx"));
    void auditReportExport("excel", model);
    showReportsExportToast("Report exported to Excel successfully.", "success");
  } catch (error) {
    console.error("Reports Excel export failed:", error);
    showReportsExportToast("Unable to export report to Excel.", "error");
  } finally {
    reportsExportBusy = false;
  }
}

function exportReportsToPdf() {
  if (!canExportReports()) {
      showReportsExportToast(
          "You do not have permission to export reports.",
          "error",
      );
      return;
  }
  if (reportsExportBusy) return;

  const jsPDF = window.jspdf?.jsPDF;
  if (!jsPDF) {
    showReportsExportToast("PDF export is unavailable.", "error");
    return;
  }

  const model =
    typeof getActiveReportOutputModel === "function"
      ? getActiveReportOutputModel()
      : null;

  if (!hasMeaningfulReportData(model)) {
    showReportsExportToast("No report data available to export.", "warning");
    return;
  }

  reportsExportBusy = true;
  try {
    const pdf = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    });

    if (typeof pdf.autoTable !== "function") {
      showReportsExportToast("PDF export is unavailable.", "error");
      return;
    }

    const columns = model.columns || [];
    const rows = model.rows || [];
    const kpiLines = buildReportsKpiLines(model, {
        currencyFormatter: formatReportsPdfCurrency,
    });
    let y = 14;

    pdf.setFontSize(16);
    pdf.setTextColor(0, 168, 107);
    pdf.text("Hospital Information Management System", 14, y);
    y += 7;
    pdf.setFontSize(11);
    pdf.setTextColor(0, 0, 0);
    pdf.text("Fleet & Transportation Management", 14, y);
    y += 6;
    pdf.setFontSize(12);
    pdf.text("Reports & Analytics", 14, y);
    y += 7;
    pdf.setFontSize(14);
    pdf.text(model.title, 14, y);
    y += 8;
    pdf.setFontSize(9);
    pdf.text("Generated Date: " + model.generatedDate, 14, y);
    y += 5;
    pdf.text("Generated Time: " + model.generatedTime, 14, y);
    y += 5;
    (model.filterSummary || []).forEach((line) => {
      pdf.text(String(line), 14, y);
      y += 4.5;
    });
    pdf.text("Total Report Records: " + rows.length, 14, y);
    y += 7;

    pdf.setFontSize(10);
    pdf.text("KPI Summary", 14, y);
    y += 5;
    pdf.setFontSize(9);
    kpiLines.forEach(([label, value]) => {
      pdf.text(String(label) + ": " + String(value), 14, y);
      y += 4.5;
    });
    y += 3;

    /* CSS charts are not canvas images — table export only */

    if (columns.length > 0 && rows.length > 0) {
      pdf.autoTable({
        head: [columns.map((c) => c.label)],
        body: rows.map((row) =>
          columns.map((col) => {
            const value = formatReportsPdfCell(row[col.key], col);
            return value == null || value === "" ? "—" : String(value);
          }),
        ),
        startY: y,
        styles: {
          fontSize: 7,
          cellPadding: 1.5,
          overflow: "linebreak",
          valign: "top",
        },
        headStyles: {
          fillColor: [0, 168, 107],
          textColor: 255,
          fontStyle: "bold",
          fontSize: 7,
        },
        alternateRowStyles: { fillColor: [245, 247, 250] },
        margin: { top: 14, right: 10, bottom: 14, left: 10 },
        showHead: "everyPage",
        didDrawPage: () => {
          const pageSize = pdf.internal.pageSize;
          const pageHeight = pageSize.height || pageSize.getHeight();
          const pageWidth = pageSize.width || pageSize.getWidth();
          pdf.setFontSize(8);
          pdf.setTextColor(100);
          pdf.text(
            "Page " + pdf.internal.getNumberOfPages(),
            pageWidth - 12,
            pageHeight - 8,
            { align: "right" },
          );
        },
      });
    }

    pdf.save(getReportsExportFilename("pdf"));
    void auditReportExport("pdf", model);
    showReportsExportToast("Report PDF exported successfully.", "success");
  } catch (error) {
    console.error("Reports PDF export failed:", error);
    showReportsExportToast("Unable to export report PDF.", "error");
  } finally {
    reportsExportBusy = false;
  }
}

function initReportsExport() {
  const printBtn = document.getElementById("printReports");
  const pdfBtn = document.getElementById("exportReportsPDF");
  const excelBtn = document.getElementById("exportReportsExcel");

  if (printBtn && printBtn.dataset.reportsPrintInit !== "true") {
    printBtn.dataset.reportsPrintInit = "true";
    printBtn.type = "button";
    printBtn.addEventListener("click", (event) => {
      event.preventDefault();
      printReports();
    });
  }

  if (pdfBtn && pdfBtn.dataset.reportsPdfInit !== "true") {
    pdfBtn.dataset.reportsPdfInit = "true";
    pdfBtn.type = "button";
    pdfBtn.addEventListener("click", (event) => {
      event.preventDefault();
      exportReportsToPdf();
    });
  }

  if (excelBtn && excelBtn.dataset.reportsExcelInit !== "true") {
    excelBtn.dataset.reportsExcelInit = "true";
    excelBtn.type = "button";
    excelBtn.addEventListener("click", (event) => {
      event.preventDefault();
      exportReportsToExcel();
    });
  }
}
