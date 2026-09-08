/* ==========================================
   Shared report table: search, sort, pagination
========================================== */

let reportsTableConfig = null;
let reportsTableState = {
  search: "",
  sortField: null,
  sortDir: null,
  page: 1,
  pageSize: 5,
};
let reportsTableInitialized = false;

function setReportsTableConfig(config, options = {}) {
  reportsTableConfig = config || {
    columns: [],
    rows: [],
    emptyMessage: "No records found.",
    searchable: [],
  };

  if (options.resetPage) {
    reportsTableState.page = 1;
  }

  renderReportsTable();
}

function getReportsTableSearchableRows(rows) {
  const query = (reportsTableState.search || "").trim().toLowerCase();
  if (!query) return rows.slice();

  const fields =
    reportsTableConfig?.searchable ||
    (reportsTableConfig?.columns || []).map((c) => c.key);

  return rows.filter((row) =>
    fields.some((field) =>
      String(row[field] == null ? "" : row[field])
        .toLowerCase()
        .includes(query),
    ),
  );
}

function compareReportValues(a, b, type, dir) {
  const direction = dir === "desc" ? -1 : 1;

  if (type === "number" || type === "currency" || type === "percent") {
      const an = Number(a);
      const bn = Number(b);
      const aEmpty = Number.isNaN(an);
      const bEmpty = Number.isNaN(bn);
      if (aEmpty && bEmpty) return 0;
      if (aEmpty) return 1;
      if (bEmpty) return -1;
      if (an === bn) return 0;
      return an < bn ? -direction : direction;
  }

  if (type === "date") {
    const at = Date.parse(a);
    const bt = Date.parse(b);
    const aEmpty = Number.isNaN(at);
    const bEmpty = Number.isNaN(bt);
    if (aEmpty && bEmpty) return 0;
    if (aEmpty) return 1;
    if (bEmpty) return -1;
    if (at === bt) return 0;
    return at < bt ? -direction : direction;
  }

  return (
    String(a ?? "").localeCompare(String(b ?? ""), undefined, {
      sensitivity: "base",
      numeric: true,
    }) * direction
  );
}

function sortReportsTableRows(rows) {
  const field = reportsTableState.sortField;
  const dir = reportsTableState.sortDir;
  if (!field || !dir) return rows;

  const col = (reportsTableConfig?.columns || []).find((c) => c.key === field);
  const type = col?.type || "text";
  return rows.slice().sort((a, b) =>
    compareReportValues(a[field], b[field], type, dir),
  );
}

/**
 * Processed table rows for output (search + sort; pagination ignored).
 * Does not mutate state or re-run the dashboard pipeline.
 */
function getProcessedReportsTableRows() {
  if (!reportsTableConfig) return [];
  const searched = getReportsTableSearchableRows(reportsTableConfig.rows || []);
  return sortReportsTableRows(searched);
}

function getReportsTableColumns() {
  return reportsTableConfig?.columns ? reportsTableConfig.columns.slice() : [];
}

function getReportsTableSearchValue() {
  return (reportsTableState.search || "").trim();
}

function applyReportsTablePresetState(preset) {
  if (!preset) return;
  if (preset.search != null) {
    reportsTableState.search = String(preset.search);
    const input = document.getElementById("reportsTableSearch");
    if (input) input.value = reportsTableState.search;
  }
  if (preset.sortField !== undefined) {
    reportsTableState.sortField = preset.sortField || null;
  }
  if (preset.sortDir !== undefined) {
    reportsTableState.sortDir = preset.sortDir || null;
  }
  if (preset.pageSize) {
    const size = Number(preset.pageSize) || 5;
    reportsTableState.pageSize = size;
    const select = document.getElementById("reportsTablePageSize");
    if (select) select.value = String(size);
  }
  reportsTableState.page = 1;
}

function escapeReportsTableHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function formatReportCell(value, type) {
    if (value == null || value === "") {
        return "—";
    }
    if (type === "currency") {
        return typeof formatReportCurrency === "function"
            ? formatReportCurrency(value)
            : String(value);
    }
    if (type === "percent") {
        return typeof formatReportPercent === "function"
            ? formatReportPercent(value)
            : String(value);
    }
    if (type === "number") {
        const num = Number(value);
        if (Number.isNaN(num)) {
            return String(value);
        }
        return num.toLocaleString(undefined, {
            maximumFractionDigits: 2,
        });
    }
    return String(value);
}

function updateReportsPaginationInfo(total, start, end) {
  const info = document.getElementById("reportsTablePaginationInfo");
  if (!info) return;
  const range = document.createElement("strong");
  const totalEl = document.createElement("strong");
  range.textContent = `${start}–${end}`;
  totalEl.textContent = String(total);
  info.replaceChildren(
    document.createTextNode("Showing "),
    range,
    document.createTextNode(" of "),
    totalEl,
    document.createTextNode(" rows"),
  );
}

function buildReportsPagination(totalPages) {
  const pagination = document.getElementById("reportsTablePagination");
  if (!pagination) return;

  const page = reportsTableState.page;
  const fragment = document.createDocumentFragment();

  const makeBtn = ({
      label = "",
      aria,
      iconClass = null,
      disabled,
      active,
      action,
      pageNumber,
  }) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.setAttribute("aria-label", aria);
      btn.disabled = disabled;
      if (action) {
          btn.dataset.reportsPage = action;
      }
      if (pageNumber != null) {
          btn.dataset.pageNumber = String(pageNumber);
      }
      if (active) {
          btn.classList.add("active");
          btn.setAttribute("aria-current", "page");
      }
      if (iconClass) {
          const icon = document.createElement("i");
          icon.className = iconClass;
          icon.setAttribute("aria-hidden", "true");
          btn.appendChild(icon);
      } else {
          btn.textContent = label;
      }
      return btn;
  };

  fragment.appendChild(
      makeBtn({
          aria: "Previous page",
          disabled: page <= 1 || totalPages === 0,
          action: "prev",
          iconClass: "ph ph-caret-left",
      }),
  );

  for (let p = 1; p <= totalPages; p += 1) {
    if (totalPages > 7 && Math.abs(p - page) > 1 && p !== 1 && p !== totalPages) {
      if (p === 2 || p === totalPages - 1) {
        const ellipsis = document.createElement("button");
        ellipsis.type = "button";
        ellipsis.textContent = "…";
        ellipsis.disabled = true;
        fragment.appendChild(ellipsis);
      }
      continue;
    }
    fragment.appendChild(
      makeBtn({
        label: String(p),
        aria: `Page ${p}`,
        active: p === page,
        action: "page",
        pageNumber: p,
      }),
    );
  }

  fragment.appendChild(
      makeBtn({
          aria: "Next page",
          disabled: totalPages === 0 || page >= totalPages,
          action: "next",
          iconClass: "ph ph-caret-right",
      }),
  );

  pagination.replaceChildren(fragment);
}

function renderReportsTable() {
  const thead = document.getElementById("reportsTableHead");
  const tbody = document.getElementById("reportsTableBody");
  if (!thead || !tbody || !reportsTableConfig) return;

  const columns = reportsTableConfig.columns || [];
  thead.innerHTML =
    "<tr>" +
    columns
      .map((col) => {
        const sortable = col.type !== "actions";
        const sorted =
          reportsTableState.sortField === col.key
            ? reportsTableState.sortDir
            : null;
        const icon =
          sorted === "asc"
            ? "ph-caret-up"
            : sorted === "desc"
              ? "ph-caret-down"
              : "ph-caret-up-down";
        return `<th class="${sortable ? "sortable" : ""}" data-field="${escapeReportsTableHtml(col.key)}" ${
            sorted
                ? `aria-sort="${sorted === "asc" ? "ascending" : "descending"}"`
                : ""
        }>
          ${escapeReportsTableHtml(col.label)}
          ${sortable ? `<i class="ph ${icon} sort-icon" aria-hidden="true"></i>` : ""}
        </th>`;
      })
      .join("") +
    "</tr>";

  let rows = getReportsTableSearchableRows(reportsTableConfig.rows || []);
  rows = sortReportsTableRows(rows);

  const total = rows.length;
  const pageSize = reportsTableState.pageSize;
  const totalPages = Math.ceil(total / pageSize) || 0;
  if (totalPages === 0) {
    reportsTableState.page = 1;
  } else {
    reportsTableState.page = Math.min(
      Math.max(reportsTableState.page, 1),
      totalPages,
    );
  }

  const startIndex = (reportsTableState.page - 1) * pageSize;
  const pageRows = rows.slice(startIndex, startIndex + pageSize);
  const start = total === 0 ? 0 : startIndex + 1;
  const end = Math.min(startIndex + pageSize, total);

  if (total === 0) {
    tbody.innerHTML = `<tr class="helper-row" data-helper-row="true"><td colspan="${Math.max(
      columns.length,
      1,
    )}">${reportsTableConfig.emptyMessage || "No records found."}</td></tr>`;
  } else {
    tbody.innerHTML = pageRows
      .map((row) => {
        return (
          "<tr>" +
          columns
            .map((col) => {
              const display = formatReportCell(row[col.key], col.type);
              return `
                <td>
                  ${escapeReportsTableHtml(display)}
                </td>
              `;
            })
            .join("") +
          "</tr>"
        );
      })
      .join("");
  }

  updateReportsPaginationInfo(total, start, end);
  buildReportsPagination(totalPages);
}

function initReportsTable() {
  if (reportsTableInitialized) return;
  reportsTableInitialized = true;

  const search = document.getElementById("reportsTableSearch");
  const pageSize = document.getElementById("reportsTablePageSize");
  const pagination = document.getElementById("reportsTablePagination");
  const thead = document.getElementById("reportsTableHead");

  search?.addEventListener("input", () => {
    reportsTableState.search = search.value || "";
    reportsTableState.page = 1;
    renderReportsTable();
  });

  pageSize?.addEventListener("change", () => {
    const size = Number(pageSize.value) || 5;
    reportsTableState.pageSize = size;
    reportsTableState.page = 1;
    renderReportsTable();
  });

  pagination?.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-reports-page]");
    if (!button || button.disabled) return;

    const action = button.dataset.reportsPage;
    const totalPages =
      Math.ceil(
        getReportsTableSearchableRows(reportsTableConfig?.rows || []).length /
          reportsTableState.pageSize,
      ) || 0;

    if (action === "prev" && reportsTableState.page > 1) {
      reportsTableState.page -= 1;
    } else if (action === "next" && reportsTableState.page < totalPages) {
      reportsTableState.page += 1;
    } else if (action === "page") {
      const p = Number(button.dataset.pageNumber);
      if (p) reportsTableState.page = p;
    } else {
      return;
    }

    renderReportsTable();
  });

  thead?.addEventListener("click", (event) => {
    const th = event.target.closest("th.sortable[data-field]");
    if (!th) return;
    const field = th.dataset.field;
    if (!field) return;

    if (reportsTableState.sortField === field) {
      if (reportsTableState.sortDir === "asc") {
        reportsTableState.sortDir = "desc";
      } else if (reportsTableState.sortDir === "desc") {
        reportsTableState.sortField = null;
        reportsTableState.sortDir = null;
      } else {
        reportsTableState.sortDir = "asc";
      }
    } else {
      reportsTableState.sortField = field;
      reportsTableState.sortDir = "asc";
    }

    renderReportsTable();
  });
}
