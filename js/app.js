/* ============================================================
   Indimi — app.js
   Dynamically binds to data/06_local_language_accessibility_feedback.csv
   (programme-provided dataset). No mock data anywhere: every KPI,
   chart, map marker, insight and recommended action is computed
   from the CSV at load time and recomputed on every filter change.
   ============================================================ */

"use strict";

const DATA_URL = "data/06_local_language_accessibility_feedback.csv";

const state = {
  rows: [],
  lang: "en",
  charts: {},
  map: null,
  mapLayer: null,
  last: { hotspots: [], byLangStats: [], nationalPct: 0 },
  filters: {
    monthFrom: "", monthTo: "",
    province: "", district: "",
    language: "", channel: "",
    content: "", settlement: ""
  }
};

/* ---------------- i18n helpers ---------------- */

function t(key) {
  return (I18N[state.lang] && I18N[state.lang][key]) || I18N.en[key] || key;
}
function fill(tpl, vars) {
  return tpl.replace(/\{(\w+)\}/g, (_, k) => (vars[k] !== undefined ? vars[k] : "{" + k + "}"));
}
function applyStaticText() {
  document.querySelectorAll("[data-i18n]").forEach(el => {
    el.textContent = t(el.getAttribute("data-i18n"));
  });
  document.querySelectorAll("[data-i18n-aria]").forEach(el => {
    el.setAttribute("aria-label", t(el.getAttribute("data-i18n-aria")));
  });
  document.documentElement.lang = state.lang;
}

/* ---------------- formatting ---------------- */

const fmtInt = n => Math.round(n).toLocaleString("en-ZW");
const fmtPct = n => n.toFixed(1);

/* ---------------- aggregation helpers ---------------- */

function wavg(rows, col) {
  let num = 0, den = 0;
  for (const r of rows) { num += r[col] * r.interactions; den += r.interactions; }
  return den ? num / den : 0;
}
function sum(rows, col) {
  let s = 0;
  for (const r of rows) s += r[col];
  return s;
}
function unresolvedEst(rows) {
  let s = 0;
  for (const r of rows) s += r.interactions * r.unresolved_query_rate_pct / 100;
  return s;
}
function groupBy(rows, keyFn) {
  const m = new Map();
  for (const r of rows) {
    const k = keyFn(r);
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(r);
  }
  return m;
}
function uniqueSorted(rows, col) {
  return [...new Set(rows.map(r => r[col]))].sort();
}

/* ---------------- filtering ---------------- */

function filterRows(exclude = []) {
  const f = state.filters;
  const skip = new Set(exclude);
  let from = f.monthFrom, to = f.monthTo;
  if (from && to && from > to) { const tmp = from; from = to; to = tmp; }
  return state.rows.filter(r => {
    if (!skip.has("month")) {
      if (from && r.month < from) return false;
      if (to && r.month > to) return false;
    }
    if (!skip.has("province") && f.province && r.province !== f.province) return false;
    if (!skip.has("district") && f.district && r.district !== f.district) return false;
    if (!skip.has("language") && f.language && r.language_name !== f.language) return false;
    if (!skip.has("channel") && f.channel && r.channel !== f.channel) return false;
    if (!skip.has("content") && f.content && r.content_type !== f.content) return false;
    if (!skip.has("settlement") && f.settlement && r.settlement_type !== f.settlement) return false;
    return true;
  });
}

/* ---------------- filter UI ---------------- */

function populateFilters() {
  const months = uniqueSorted(state.rows, "month");
  const defs = [
    ["f-month-from", months, false],
    ["f-month-to", months, false],
    ["f-province", uniqueSorted(state.rows, "province"), true],
    ["f-district", uniqueSorted(state.rows, "district"), true],
    ["f-language", uniqueSorted(state.rows, "language_name"), true],
    ["f-channel", uniqueSorted(state.rows, "channel"), true],
    ["f-content", uniqueSorted(state.rows, "content_type"), true],
    ["f-settlement", uniqueSorted(state.rows, "settlement_type"), true]
  ];
  for (const [id, values, hasAll] of defs) {
    const sel = document.getElementById(id);
    sel.innerHTML = "";
    if (hasAll) {
      const o = document.createElement("option");
      o.value = ""; o.textContent = t("f.all"); o.setAttribute("data-all", "1");
      sel.appendChild(o);
    }
    for (const v of values) {
      const o = document.createElement("option");
      o.value = v; o.textContent = v;
      sel.appendChild(o);
    }
  }
  document.getElementById("f-month-from").value = months[0];
  document.getElementById("f-month-to").value = months[months.length - 1];
  state.filters.monthFrom = months[0];
  state.filters.monthTo = months[months.length - 1];
}

function refreshDistrictOptions() {
  const sel = document.getElementById("f-district");
  const prov = state.filters.province;
  const source = prov ? state.rows.filter(r => r.province === prov) : state.rows;
  const districts = uniqueSorted(source, "district");
  const current = state.filters.district;
  sel.innerHTML = "";
  const all = document.createElement("option");
  all.value = ""; all.textContent = t("f.all");
  sel.appendChild(all);
  for (const d of districts) {
    const o = document.createElement("option");
    o.value = d; o.textContent = d;
    sel.appendChild(o);
  }
  sel.value = districts.includes(current) ? current : "";
  state.filters.district = sel.value;
}

function relabelAllOptions() {
  document.querySelectorAll(".filters select option[value='']").forEach(o => {
    o.textContent = t("f.all");
  });
}

function bindFilterEvents() {
  const map = {
    "f-month-from": "monthFrom", "f-month-to": "monthTo",
    "f-province": "province", "f-district": "district",
    "f-language": "language", "f-channel": "channel",
    "f-content": "content", "f-settlement": "settlement"
  };
  for (const [id, key] of Object.entries(map)) {
    document.getElementById(id).addEventListener("change", e => {
      state.filters[key] = e.target.value;
      if (key === "province") refreshDistrictOptions();
      render();
    });
  }
  document.getElementById("f-reset").addEventListener("click", () => {
    const months = uniqueSorted(state.rows, "month");
    state.filters = {
      monthFrom: months[0], monthTo: months[months.length - 1],
      province: "", district: "", language: "",
      channel: "", content: "", settlement: ""
    };
    populateFilters();
    refreshDistrictOptions();
    render();
  });
  document.getElementById("btn-export").addEventListener("click", downloadHotspotsCSV);
  document.getElementById("btn-copy").addEventListener("click", copyBriefingSummary);
  document.querySelectorAll(".lang-switch button").forEach(btn => {
    btn.addEventListener("click", () => {
      state.lang = btn.getAttribute("data-lang");
      document.querySelectorAll(".lang-switch button").forEach(b =>
        b.setAttribute("aria-pressed", b === btn ? "true" : "false"));
      applyStaticText();
      relabelAllOptions();
      render();
    });
  });
}

/* ---------------- chart helpers ---------------- */

const COLORS = {
  ink: "#201f1d", green: "#0b5a44", red: "#a0341a",
  grid: "#e4e1da", muted: "#55524c"
};
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function destroyChart(name) {
  if (state.charts[name]) { state.charts[name].destroy(); delete state.charts[name]; }
}

function renderAltTable(containerId, headers, rows) {
  const el = document.getElementById(containerId);
  const table = ["<table><thead><tr>",
    ...headers.map(h => `<th scope="col">${h}</th>`),
    "</tr></thead><tbody>",
    ...rows.map(r => "<tr>" + r.map((c, i) =>
      i === 0 ? `<th scope="row">${c}</th>` : `<td>${c}</td>`).join("") + "</tr>"),
    "</tbody></table>"].join("");
  el.innerHTML = table;
}

/* ---------------- section renderers ---------------- */

function renderKPIs(filtered, byLangStats) {
  const empty = filtered.length === 0;
  const totalInteractions = sum(filtered, "interactions");
  const success = wavg(filtered, "query_success_rate_pct");
  const unres = unresolvedEst(filtered);
  const issues = sum(filtered, "accessibility_issues_reported");
  const gap = byLangStats.length >= 2
    ? byLangStats[0].success - byLangStats[byLangStats.length - 1].success
    : 0;

  document.getElementById("kpi-interactions").textContent = empty ? "–" : fmtInt(totalInteractions);
  document.getElementById("kpi-success").textContent = empty ? "–" : fmtPct(success) + "%";
  document.getElementById("kpi-unresolved").textContent = empty ? "–" : "~" + fmtInt(unres);
  document.getElementById("kpi-issues").textContent = empty ? "–" : fmtInt(issues);
  document.getElementById("kpi-gap").textContent = byLangStats.length >= 2
    ? fmtPct(gap) + " " + t("kpi.gap.unit") : "–";

  document.getElementById("filter-status").textContent = fill(t("f.status"), {
    rows: fmtInt(filtered.length), interactions: fmtInt(totalInteractions)
  });
  return { success, gap };
}

function renderGapStrip(byLangStats, nationalPct) {
  const track = document.getElementById("gapstrip-track");
  track.innerHTML = "";
  const min = 50, max = 90;
  const pos = v => Math.min(98, Math.max(2, (v - min) / (max - min) * 100));

  const avg = document.createElement("div");
  avg.className = "avg-line";
  avg.style.left = pos(nationalPct) + "%";
  track.appendChild(avg);
  const avgLabel = document.createElement("div");
  avgLabel.className = "avg-label";
  avgLabel.style.left = pos(nationalPct) + "%";
  avgLabel.textContent = t("hero.avg") + " " + fmtPct(nationalPct) + "%";
  track.appendChild(avgLabel);

  const placed = [...byLangStats]
    .map((L, i) => ({ L, x: pos(L.success), rank: i }))
    .sort((a, b) => a.x - b.x);
  const levelLastX = [];
  for (const item of placed) {
    let level = 0;
    while (levelLastX[level] !== undefined && item.x - levelLastX[level] < 16) level++;
    levelLastX[level] = item.x;
    item.level = level;
  }
  for (const { L, x, rank, level } of placed) {
    const dot = document.createElement("div");
    dot.className = "dot " + (L.success >= nationalPct ? "good" : "bad");
    dot.style.left = x + "%";
    dot.setAttribute("title", `${L.name}: ${fmtPct(L.success)}%`);
    track.appendChild(dot);
    const lbl = document.createElement("div");
    const keep = rank === 0 || rank === byLangStats.length - 1;
    lbl.className = "dot-label" + (keep ? " keep" : "");
    lbl.style.left = x + "%";
    lbl.style.bottom = (18 + level * 24) + "px";
    lbl.textContent = `${L.name} ${fmtPct(L.success)}%`;
    track.appendChild(lbl);
  }

  const summary = byLangStats.map(L => `${L.name} ${fmtPct(L.success)}%`).join(", ");
  document.getElementById("gapstrip").setAttribute("aria-label",
    t("hero.gapstrip.title") + ". " + summary);
}

function computeByLanguage(rows) {
  const g = groupBy(rows, r => r.language_name);
  const out = [];
  for (const [name, rs] of g) {
    out.push({
      name,
      success: wavg(rs, "query_success_rate_pct"),
      interactions: sum(rs, "interactions"),
      unresolved: unresolvedEst(rs),
      rows: rs
    });
  }
  out.sort((a, b) => b.success - a.success);
  return out;
}

function renderLangChart(byLangStats, nationalPct) {
  destroyChart("lang");
  const ctx = document.getElementById("chart-lang");
  const labels = byLangStats.map(L => L.name);
  const data = byLangStats.map(L => +L.success.toFixed(1));
  const colors = byLangStats.map(L => L.success >= nationalPct ? COLORS.green : COLORS.red);

  state.charts.lang = new Chart(ctx, {
    type: "bar",
    data: { labels, datasets: [{ data, backgroundColor: colors, maxBarThickness: 24, borderRadius: 4 }] },
    options: {
      indexAxis: "y", responsive: true, maintainAspectRatio: false,
      animation: reduceMotion ? false : {},
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: c => fmtPct(c.parsed.x) + "% " + t("kpi.success").toLowerCase() } }
      },
      scales: {
        x: { min: 0, max: 100, ticks: { callback: v => v + "%", color: COLORS.muted }, grid: { color: COLORS.grid } },
        y: { ticks: { color: COLORS.ink }, grid: { display: false } }
      }
    }
  });
  ctx.setAttribute("aria-label", t("c.lang.title") + ". " +
    byLangStats.map(L => `${L.name} ${fmtPct(L.success)}%`).join(", "));
  renderAltTable("table-lang",
    [t("heat.language"), t("kpi.success") + " %", t("kpi.interactions")],
    byLangStats.map(L => [L.name, fmtPct(L.success), fmtInt(L.interactions)]));
}

function renderTrendChart(rows, byLangStats) {
  destroyChart("trend");
  const ctx = document.getElementById("chart-trend");
  const months = uniqueSorted(rows, "month");
  const nat = months.map(m => +wavg(rows.filter(r => r.month === m), "query_success_rate_pct").toFixed(1));
  const best = byLangStats[0], worst = byLangStats[byLangStats.length - 1];
  const series = name => months.map(m =>
    +wavg(rows.filter(r => r.month === m && r.language_name === name), "query_success_rate_pct").toFixed(1));

  const datasets = [
    { label: t("legend.national"), data: nat, borderColor: COLORS.ink, borderWidth: 2, pointRadius: 3, tension: 0.2 }
  ];
  if (best && worst && best.name !== worst.name) {
    datasets.push({ label: best.name, data: series(best.name), borderColor: COLORS.green, borderDash: [7, 4], borderWidth: 2, pointRadius: 3, pointStyle: "rect", tension: 0.2 });
    datasets.push({ label: worst.name, data: series(worst.name), borderColor: COLORS.red, borderDash: [2, 3], borderWidth: 2, pointRadius: 3, pointStyle: "triangle", tension: 0.2 });
  }

  state.charts.trend = new Chart(ctx, {
    type: "line",
    data: { labels: months, datasets },
    options: {
      responsive: true, maintainAspectRatio: false,
      animation: reduceMotion ? false : {},
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => `${c.dataset.label}: ${fmtPct(c.parsed.y)}%` } } },
      scales: {
        y: { min: 40, max: 100, ticks: { callback: v => v + "%", color: COLORS.muted }, grid: { color: COLORS.grid } },
        x: { ticks: { color: COLORS.muted }, grid: { display: false } }
      }
    }
  });

  const legend = document.getElementById("legend-trend");
  const item = (label, color, dash) =>
    `<span class="key"><svg width="26" height="10" aria-hidden="true"><line x1="0" y1="5" x2="26" y2="5" stroke="${color}" stroke-width="2.5" ${dash ? `stroke-dasharray="${dash}"` : ""}/></svg>${label}</span>`;
  legend.innerHTML = item(t("legend.national"), COLORS.ink, "") +
    (best && worst && best.name !== worst.name
      ? item(`${t("legend.best")}: ${best.name}`, COLORS.green, "7,4") +
        item(`${t("legend.worst")}: ${worst.name}`, COLORS.red, "2,3")
      : "");

  ctx.setAttribute("aria-label", t("c.trend.title") + ". " +
    months.map((m, i) => `${m}: ${nat[i]}%`).join(", "));
  renderAltTable("table-trend",
    ["Month", t("legend.national") + " %"].concat(
      best && worst && best.name !== worst.name ? [best.name + " %", worst.name + " %"] : []),
    months.map((m, i) => {
      const row = [m, fmtPct(nat[i])];
      if (best && worst && best.name !== worst.name) {
        row.push(fmtPct(series(best.name)[i]), fmtPct(series(worst.name)[i]));
      }
      return row;
    }));
}

function renderHeatmap(rows) {
  const langs = uniqueSorted(rows, "language_name");
  const channels = uniqueSorted(rows, "channel");
  let html = `<table><caption class="sr-only">${t("c.heat.title")}</caption><thead><tr><th scope="col">${t("heat.language")}</th>` +
    channels.map(c => `<th scope="col">${c}</th>`).join("") + "</tr></thead><tbody>";
  for (const L of langs) {
    html += `<tr><th scope="row">${L}</th>`;
    for (const C of channels) {
      const cell = rows.filter(r => r.language_name === L && r.channel === C);
      if (!cell.length) { html += "<td class='cell'>–</td>"; continue; }
      const v = wavg(cell, "query_success_rate_pct");
      const bin = v >= 75 ? "good" : v >= 65 ? "mid" : "bad";
      html += `<td class="cell h-${bin}"><span aria-hidden="true">${fmtPct(v)}%</span><span class="sr-only">${fmtPct(v)}% — ${t("heat.sr." + bin)}</span></td>`;
    }
    html += "</tr>";
  }
  html += "</tbody></table>";
  document.getElementById("heatmap").innerHTML = html;
}

/* ---------------- map ---------------- */

function renderMap(filtered) {
  if (typeof L === "undefined") {
    document.getElementById("map").outerHTML =
      "<p class='map-note'>Map library unavailable offline — see the district table below.</p>";
    return;
  }
  if (!state.map) {
    state.map = L.map("map", { scrollWheelZoom: false }).setView([-19.0, 29.8], 6);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors", maxZoom: 12
    }).addTo(state.map);
  }
  if (state.mapLayer) state.mapLayer.remove();
  state.mapLayer = L.layerGroup().addTo(state.map);

  const byDistrict = groupBy(filtered, r => r.district);
  const rowsForTable = [];
  for (const [district, rs] of byDistrict) {
    const success = wavg(rs, "query_success_rate_pct");
    const inter = sum(rs, "interactions");
    const issues = sum(rs, "accessibility_issues_reported");
    const color = success >= 75 ? COLORS.green : success >= 65 ? "#8a6a10" : COLORS.red;
    const radius = Math.max(7, Math.sqrt(inter) / 6);
    const marker = L.circleMarker([rs[0].latitude, rs[0].longitude], {
      radius, color, weight: 2, fillColor: color, fillOpacity: 0.35
    }).bindPopup(
      `<strong>${district}</strong> (${rs[0].province})<br>` +
      `${t("map.success")}: ${fmtPct(success)}%<br>` +
      `${t("map.interactions")}: ${fmtInt(inter)}<br>` +
      `${t("map.issues")}: ${fmtInt(issues)}`
    ).addTo(state.mapLayer);
    const el = marker.getElement();
    if (el) {
      el.setAttribute("tabindex", "0");
      el.setAttribute("role", "button");
      el.setAttribute("aria-label",
        `${district}, ${rs[0].province}. ${t("map.success")} ${fmtPct(success)}%. ` +
        `${t("map.interactions")} ${fmtInt(inter)}. ${t("map.issues")} ${fmtInt(issues)}.`);
      el.addEventListener("keydown", e => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); marker.openPopup(); }
      });
    }
    rowsForTable.push([district, rs[0].province, fmtPct(success), fmtInt(inter), fmtInt(issues)]);
  }
  rowsForTable.sort((a, b) => parseFloat(a[2]) - parseFloat(b[2]));
  renderAltTable("table-map",
    [t("hot.district"), t("f.province"), t("map.success") + " %", t("map.interactions"), t("map.issues")],
    rowsForTable);
}

/* ---------------- insights & actions ---------------- */

function computeHotspots(rows) {
  const g = groupBy(rows, r => r.district + "\u0001" + r.language_name);
  const cells = [];
  for (const [key, rs] of g) {
    const inter = sum(rs, "interactions");
    if (rs.length < 2 || inter < 600) continue;
    const [district, language] = key.split("\u0001");
    cells.push({
      district, language,
      success: wavg(rs, "query_success_rate_pct"),
      unresolved: unresolvedEst(rs)
    });
  }
  cells.sort((a, b) => a.success - b.success);
  return cells;
}

function renderInsights(scoped, byLangStats, nationalPct) {
  const container = document.getElementById("insight-cards");
  container.innerHTML = "";
  if (byLangStats.length < 2) return;

  const best = byLangStats[0], worst = byLangStats[byLangStats.length - 1];
  const gap = best.success - worst.success;

  const worstRows = scoped.filter(r => r.language_name === worst.name);
  const byChannel = [...groupBy(worstRows, r => r.channel)].map(([c, rs]) =>
    ({ channel: c, success: wavg(rs, "query_success_rate_pct") })).sort((a, b) => a.success - b.success);
  const worstChannel = byChannel[0];

  const geoRows = filterRows(["settlement"]);
  const urban = wavg(geoRows.filter(r => r.settlement_type === "Urban"), "query_success_rate_pct");
  const rural = wavg(geoRows.filter(r => r.settlement_type === "Rural"), "query_success_rate_pct");

  const cards = [
    { flag: true, tag: t("ins.gap.tag"), stat: fmtPct(gap) + " " + t("kpi.gap.unit"),
      text: fill(t("ins.gap.text"), {
        worstLang: worst.name, worstPct: fmtPct(worst.success),
        bestLang: best.name, bestPct: fmtPct(best.success), gap: fmtPct(gap)
      }) },
    worstChannel && { flag: true, tag: t("ins.channel.tag"), stat: fmtPct(worstChannel.success) + "%",
      text: fill(t("ins.channel.text"), {
        lang: worst.name, channel: worstChannel.channel, pct: fmtPct(worstChannel.success)
      }) },
    { flag: false, tag: t("ins.geo.tag"), stat: fmtPct(urban) + "% / " + fmtPct(rural) + "%",
      text: fill(t("ins.geo.text"), { urbanPct: fmtPct(urban), ruralPct: fmtPct(rural) }) }
  ].filter(Boolean);

  for (const c of cards) {
    const div = document.createElement("div");
    div.className = "card" + (c.flag ? " flag" : "");
    div.innerHTML = `<span class="tag">${c.tag}</span><span class="stat">${c.stat}</span><p>${c.text}</p>`;
    container.appendChild(div);
  }
}

function renderHotspotTable(hotspots) {
  renderAltTable("table-hotspots",
    [t("hot.district"), t("hot.language"), t("hot.success") + " %", t("hot.unresolved")],
    hotspots.slice(0, 6).map(h =>
      [h.district, h.language, fmtPct(h.success), "~" + fmtInt(h.unresolved)]));
}

function renderActions(scoped, byLangStats, hotspots, nationalPct) {
  const list = document.getElementById("action-list");
  list.innerHTML = "";
  if (!byLangStats.length) return;

  const worst = byLangStats[byLangStats.length - 1];
  const best = byLangStats[0];
  const gap = best.success - worst.success;
  const worstRows = scoped.filter(r => r.language_name === worst.name);

  const areaWeights = new Map();
  for (const r of worstRows) {
    areaWeights.set(r.priority_improvement_area,
      (areaWeights.get(r.priority_improvement_area) || 0) + r.interactions);
  }
  const topArea = [...areaWeights.entries()].sort((a, b) => b[1] - a[1])[0];
  const byChannel = [...groupBy(worstRows, r => r.channel)].map(([c, rs]) =>
    ({ channel: c, success: wavg(rs, "query_success_rate_pct") })).sort((a, b) => a.success - b.success);
  const wc = byChannel[0];

  const issueByDistrict = [...groupBy(filterRows(), r => r.district)].map(([d, rs]) =>
    ({ district: d, issues: sum(rs, "accessibility_issues_reported") })).sort((a, b) => b.issues - a.issues)[0];

  const actions = [];
  if (topArea && wc) {
    actions.push({
      text: fill(t("act.voice"), { area: topArea[0], lang: worst.name, channel: wc.channel }),
      why: fill(t("act.voice.why"), { channel: wc.channel, lang: worst.name, pct: fmtPct(wc.success), area: topArea[0] })
    });
  }
  if (hotspots.length) {
    const h = hotspots[0];
    actions.push({
      text: fill(t("act.hotspot"), { lang: h.language, district: h.district }),
      why: fill(t("act.hotspot.why"), { district: h.district, lang: h.language, pct: fmtPct(h.success), n: fmtInt(h.unresolved) })
    });
  }
  if (issueByDistrict) {
    actions.push({
      text: fill(t("act.assistive"), { district: issueByDistrict.district }),
      why: fill(t("act.assistive.why"), { district: issueByDistrict.district, n: fmtInt(issueByDistrict.issues) })
    });
  }
  actions.push({
    text: fill(t("act.monitor"), {}),
    why: fill(t("act.monitor.why"), { pct: fmtPct(nationalPct), gap: fmtPct(gap) })
  });

  for (const a of actions) {
    const li = document.createElement("li");
    li.innerHTML = `<strong>${a.text}</strong><span class="why">${a.why}</span>`;
    list.appendChild(li);
  }
}

/* ---------------- export & copy (persona take-away features) ---------------- */

function downloadHotspotsCSV() {
  const hs = state.last.hotspots || [];
  const lines = ["district,language,success_rate_pct,est_unresolved_queries"];
  for (const h of hs) {
    lines.push(`${h.district},${h.language},${h.success.toFixed(1)},${Math.round(h.unresolved)}`);
  }
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "indimi_hotspots.csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(a.href);
}

function buildBriefingSummary() {
  const kpiIds = ["kpi-interactions", "kpi-success", "kpi-unresolved", "kpi-issues", "kpi-gap"];
  const kpiKeys = ["kpi.interactions", "kpi.success", "kpi.unresolved", "kpi.issues", "kpi.gap"];
  const lines = [];
  lines.push("Indimi — " + document.getElementById("filter-status").textContent);
  kpiIds.forEach((id, i) =>
    lines.push(`${t(kpiKeys[i])}: ${document.getElementById(id).textContent}`));
  lines.push("");
  lines.push(t("ins.hotspots.title") + ":");
  (state.last.hotspots || []).slice(0, 3).forEach((h, i) =>
    lines.push(`${i + 1}. ${h.district} × ${h.language} — ${fmtPct(h.success)}% · ~${fmtInt(h.unresolved)}`));
  lines.push("");
  lines.push(t("s4.title") + ":");
  document.querySelectorAll("#action-list li strong").forEach((el, i) =>
    lines.push(`${i + 1}. ${el.textContent}`));
  lines.push("");
  lines.push(t("badge.synthetic"));
  return lines.join("\n");
}

function copyBriefingSummary() {
  const text = buildBriefingSummary();
  const status = document.getElementById("copy-status");
  const done = ok => {
    status.textContent = t(ok ? "msg.copied" : "msg.copyfail");
    setTimeout(() => { status.textContent = ""; }, 5000);
  };
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => done(true)).catch(() => legacyCopy(text, done));
  } else {
    legacyCopy(text, done);
  }
}
function legacyCopy(text, done) {
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.setAttribute("readonly", "");
  ta.style.position = "fixed";
  ta.style.left = "-9999px";
  document.body.appendChild(ta);
  ta.select();
  let ok = false;
  try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
  ta.remove();
  done(ok);
}

/* ---------------- master render ---------------- */

function render() {
  const filtered = filterRows();
  const scopedNoLang = filterRows(["language"]);
  const heatRows = filterRows(["language", "channel"]);
  const hotspotRows = filterRows(["language", "district"]);

  const byLangStats = computeByLanguage(scopedNoLang);
  const nationalPct = wavg(scopedNoLang, "query_success_rate_pct");

  document.getElementById("empty-note").hidden = filtered.length > 0;

  renderKPIs(filtered, byLangStats);
  renderGapStrip(byLangStats, nationalPct);
  renderLangChart(byLangStats, nationalPct);
  renderTrendChart(scopedNoLang, byLangStats);
  renderHeatmap(heatRows);
  renderMap(filtered);
  const hotspots = computeHotspots(hotspotRows);
  state.last = { hotspots, byLangStats, nationalPct };
  renderInsights(scopedNoLang, byLangStats, nationalPct);
  renderHotspotTable(hotspots);
  renderActions(scopedNoLang, byLangStats, hotspots, nationalPct);
}

/* ---------------- boot ---------------- */

function boot() {
  applyStaticText();
  const loadEl = document.getElementById("load-state");
  Papa.parse(DATA_URL, {
    download: true,
    header: true,
    dynamicTyping: true,
    skipEmptyLines: true,
    complete: results => {
      state.rows = results.data.filter(r => r.month && r.language_name);
      if (!state.rows.length) {
        loadEl.classList.add("error");
        loadEl.textContent = t("load.error");
        return;
      }
      loadEl.remove();
      document.getElementById("app").hidden = false;
      populateFilters();
      refreshDistrictOptions();
      bindFilterEvents();
      render();
    },
    error: () => {
      loadEl.classList.add("error");
      loadEl.textContent = t("load.error");
    }
  });
}

document.addEventListener("DOMContentLoaded", boot);
