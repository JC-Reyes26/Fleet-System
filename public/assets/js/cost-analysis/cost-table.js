/* ==========================================
   Cost Analysis table: search, sort, pagination
========================================== */

let costTableConfig = null;
let costTableState = {
  search: "",
  sourceFilter: "all",
  categoryFilter: "all",
  statusFilter: "all",
  sortField: null,
  sortDir: null,
  page: 1,
  pageSize: 5,
};
let costTableInitialized = false;
/*
function setCostTableConfig(config, options = {}) {
  costTableConfig = config || {
    columns: [],
    rows: [],
    emptyMessage: "No cost records found.",
    searchable: [],
  };
  if (options.resetPage) costTableState.page = 1;
  renderCostTable();
}
*/
function getCostTableWorkingRows() {
  let rows = (costTableConfig?.rows || []).slice();

  if (costTableState.sourceFilter !== "all") {
    rows = rows.filter(
      (r) =>
        r.sourceModule === costTableState.sourceFilter ||
        r.source === costTableState.sourceFilter,
    );
  }
  if (costTableState.categoryFilter !== "all") {
    rows = rows.filter((r) => r.category === costTableState.categoryFilter);
  }
  if (costTableState.statusFilter !== "all") {
    rows = rows.filter((r) => r.status === costTableState.statusFilter);
  }

  const q = (costTableState.search || "").trim().toLowerCase();
  if (q) {
    const fields =
      costTableConfig.searchable ||
      (costTableConfig.columns || []).map((c) => c.key);
    rows = rows.filter((row) =>
      fields.some((f) =>
        String(row[f] == null ? "" : row[f])
          .toLowerCase()
          .includes(q),
      ),
    );
  }

  const field = costTableState.sortField;
  const dir = costTableState.sortDir === "desc" ? -1 : 1;
  if (field && costTableState.sortDir) {
    const col = (costTableConfig.columns || []).find((c) => c.key === field);
    const type = col?.type || "text";
    rows.sort((a, b) => {
      let av = a[field];
      let bv = b[field];
      if (type === "number" || type === "currency" || type === "percent") {
        av = Number(av);
        bv = Number(bv);
        const aEmpty = Number.isNaN(av);
        const bEmpty = Number.isNaN(bv);
        if (aEmpty && bEmpty) return 0;
        if (aEmpty) return 1;
        if (bEmpty) return -1;
        if (av === bv) return 0;
        return av < bv ? -dir : dir;
      }
      if (type === "date") {
        av = Date.parse(av);
        bv = Date.parse(bv);
        if (Number.isNaN(av) && Number.isNaN(bv)) return 0;
        if (Number.isNaN(av)) return 1;
        if (Number.isNaN(bv)) return -1;
        if (av === bv) return 0;
        return av < bv ? -dir : dir;
      }
      return (
        String(av ?? "").localeCompare(String(bv ?? ""), undefined, {
          sensitivity: "base",
          numeric: true,
        }) * dir
      );
    });
  }

  return rows;
}

function formatCostTableCell(value, type) {
  if (value == null || value === "") return "—";
  if (type === "currency") {
    return typeof formatCostCurrency === "function"
      ? formatCostCurrency(value)
      : String(value);
  }
  if (type === "percent") {
    return typeof formatCostPercent === "function"
      ? formatCostPercent(value)
      : String(value);
  }
  if (type === "number") {
    const n = Number(value);
    if (Number.isNaN(n)) return String(value);
    return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
  }
  return String(value);
}

function escapeCostTableHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function renderCostTable() {
  const thead = document.getElementById("costTableHead");
  const tbody = document.getElementById("costTableBody");
  if (!thead || !tbody || !costTableConfig) return;

  const columns = costTableConfig.columns || [];
  thead.innerHTML =
    "<tr>" +
    columns
      .map((col) => {
        const sorted =
          costTableState.sortField === col.key ? costTableState.sortDir : null;
        const icon =
          sorted === "asc"
            ? "ph-caret-up"
            : sorted === "desc"
              ? "ph-caret-down"
              : "ph-caret-up-down";
        return `<th class="sortable" data-field="${col.key}" ${
          sorted
            ? `aria-sort="${sorted === "asc" ? "ascending" : "descending"}"`
            : ""
        }>
          ${col.label}
          <i class="ph ${icon} sort-icon" aria-hidden="true"></i>
        </th>`;
      })
      .join("") +
    "</tr>";

  const rows = getCostTableWorkingRows();
  const total = rows.length;
  const pageSize = costTableState.pageSize;
  const totalPages = Math.ceil(total / pageSize) || 0;
  if (totalPages === 0) costTableState.page = 1;
  else {
    costTableState.page = Math.min(
      Math.max(costTableState.page, 1),
      totalPages,
    );
  }

  const startIndex = (costTableState.page - 1) * pageSize;
  const pageRows = rows.slice(startIndex, startIndex + pageSize);
  const start = total === 0 ? 0 : startIndex + 1;
  const end = Math.min(startIndex + pageSize, total);

  if (total === 0) {
    tbody.innerHTML = `<tr class="helper-row" data-helper-row="true"><td colspan="${Math.max(
      columns.length,
      1,
    )}">${costTableConfig.emptyMessage || "No cost records found."}</td></tr>`;
  } else {
    tbody.innerHTML = pageRows
        .map(
            (row) =>
                "<tr>" +
                columns
                    .map(
                        (col) =>
                            `<td>${escapeCostTableHtml(
                                formatCostTableCell(row[col.key], col.type),
                            )}</td>`,
                    )
                    .join("") +
                "</tr>",
        )
        .join("");
  }

  const info = document.getElementById("costTablePaginationInfo");
  if (info) {
    const range = document.createElement("strong");
    const tot = document.createElement("strong");
    range.textContent = `${start}–${end}`;
    tot.textContent = String(total);
    info.replaceChildren(
      document.createTextNode("Showing "),
      range,
      document.createTextNode(" of "),
      tot,
      document.createTextNode(" records"),
    );
  }

  const pagination = document.getElementById("costTablePagination");
  if (pagination) {
    const frag = document.createDocumentFragment();
    const btn = ({
        label = "",
        aria,
        iconClass = null,
        disabled = false,
        active = false,
        action,
        pageNumber = null,
    }) => {
        const b = document.createElement("button");
        b.type = "button";
        b.setAttribute("aria-label", aria);
        b.disabled = disabled;
        if (action) {
            b.dataset.costPage = action;
        }
        if (pageNumber != null) {
            b.dataset.pageNumber = String(pageNumber);
        }
        if (active) {
            b.classList.add("active");
            b.setAttribute("aria-current", "page");
        }
        if (iconClass) {
            const icon = document.createElement("i");
            icon.className = iconClass;
            icon.setAttribute("aria-hidden", "true");
            b.appendChild(icon);
        } else {
            b.textContent = label;
        }
        return b;
    };
    frag.appendChild(
        btn({
            aria: "Previous page",
            disabled: costTableState.page <= 1 || totalPages === 0,
            action: "prev",
            iconClass: "ph ph-caret-left",
        }),
    );
    for (let p = 1; p <= totalPages; p += 1) {
        frag.appendChild(
            btn({
                label: String(p),
                aria: `Page ${p}`,
                active: p === costTableState.page,
                action: "page",
                pageNumber: p,
            }),
        );
    }
    frag.appendChild(
        btn({
            aria: "Next page",
            disabled: totalPages === 0 || costTableState.page >= totalPages,
            action: "next",
            iconClass: "ph ph-caret-right",
        }),
    );
    pagination.replaceChildren(frag);
  }
}

function syncCostTableFilters() {
    const view = costAnalysisState?.analysisView || "overview";
    const source = document.getElementById("costTableSourceFilter");
    const category = document.getElementById("costTableCategoryFilter");
    const status = document.getElementById("costTableStatusFilter");
    const aggregateView = view === "vehicles" || view === "departments";
    if (source) {
        source.disabled = aggregateView;
        if (aggregateView) {
            source.value = "all";
            costTableState.sourceFilter = "all";
        }
    }
    if (category) {
        category.disabled = aggregateView;
        if (aggregateView) {
            category.value = "all";
            costTableState.categoryFilter = "all";
        }
    }
    if (status) {
        status.disabled = aggregateView;
        if (aggregateView) {
            status.value = "all";
            costTableState.statusFilter = "all";
        }
    }
}

function setCostTableConfig(config, options = {}) {
    costTableConfig = config || {
        columns: [],
        rows: [],
        emptyMessage: "No cost records found.",
        searchable: [],
    };

    if (options.resetPage) {
        costTableState.page = 1;
    }

    syncCostTableFilters();
    renderCostTable();
}

function initCostTable() {
  if (costTableInitialized) return;
  costTableInitialized = true;

  document.getElementById("costTableSearch")?.addEventListener("input", (e) => {
    costTableState.search = e.target.value || "";
    costTableState.page = 1;
    renderCostTable();
  });

  document.getElementById("costTableSourceFilter")?.addEventListener("change", (e) => {
    costTableState.sourceFilter = e.target.value || "all";
    costTableState.page = 1;
    renderCostTable();
  });

  document.getElementById("costTableCategoryFilter")?.addEventListener("change", (e) => {
    costTableState.categoryFilter = e.target.value || "all";
    costTableState.page = 1;
    renderCostTable();
  });

  document.getElementById("costTableStatusFilter")?.addEventListener("change", (e) => {
    costTableState.statusFilter = e.target.value || "all";
    costTableState.page = 1;
    renderCostTable();
  });

  document.getElementById("costTablePageSize")?.addEventListener("change", (e) => {
    costTableState.pageSize = Number(e.target.value) || 5;
    costTableState.page = 1;
    renderCostTable();
  });

  document.getElementById("costTablePagination")?.addEventListener("click", (e) => {
    const button = e.target.closest("button[data-cost-page]");
    if (!button || button.disabled) return;
    const action = button.dataset.costPage;
    const rows = getCostTableWorkingRows();
    const totalPages = Math.ceil(rows.length / costTableState.pageSize) || 0;
    if (action === "prev" && costTableState.page > 1) {
      costTableState.page -= 1;
    } else if (action === "next" && costTableState.page < totalPages) {
      costTableState.page += 1;
    } else if (action === "page") {
      const p = Number(button.dataset.pageNumber);
      if (p) costTableState.page = p;
    } else return;
    renderCostTable();
  });

  document.getElementById("costTableHead")?.addEventListener("click", (e) => {
    const th = e.target.closest("th.sortable[data-field]");
    if (!th) return;
    const field = th.dataset.field;
    if (costTableState.sortField === field) {
      if (costTableState.sortDir === "asc") costTableState.sortDir = "desc";
      else if (costTableState.sortDir === "desc") {
        costTableState.sortField = null;
        costTableState.sortDir = null;
      } else costTableState.sortDir = "asc";
    } else {
      costTableState.sortField = field;
      costTableState.sortDir = "asc";
    }
    renderCostTable();
  });
}
