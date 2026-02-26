(() => {
  const page = window.location.pathname.split("/").pop().replace(".html", "");
  if (!page || page === "index") return;

  const contentGrid = document.querySelector(".content-grid");
  if (!contentGrid) return;

  const sourcePanel = contentGrid.querySelector(".panel.source");

  const money = (value) => {
    if (typeof value !== "number") return "N/A";
    return `$${value.toFixed(2)}`;
  };

  const storeLabel = (store, freeExternal = false) => {
    if (!store || !store.available) {
      if (freeExternal) return "Free (External)";
      return "Not Available";
    }
    if (store.free) return "Free";
    if (typeof store.current !== "number") return "Not Available";
    if (typeof store.normal === "number" && store.current < store.normal) {
      return `${money(store.current)} (List ${money(store.normal)})`;
    }
    return money(store.current);
  };

  const buildPath = (points) => {
    let path = "";
    let started = false;
    points.forEach((p) => {
      if (p.y == null) {
        started = false;
        return;
      }
      if (!started) {
        path += `M ${p.x} ${p.y}`;
        started = true;
      } else {
        path += ` L ${p.x} ${p.y}`;
      }
    });
    return path;
  };

  const normalizeHistory = (history) => {
    if (!Array.isArray(history)) return [];

    const normalized = history
      .map((h, i) => {
        let ts = null;
        if (typeof h?.at === "string") {
          const parsed = Date.parse(h.at);
          ts = Number.isFinite(parsed) ? parsed : null;
        }
        if (ts == null && typeof h?.date === "string") {
          const parsed = Date.parse(h.date);
          ts = Number.isFinite(parsed) ? parsed : null;
        }
        if (ts == null && typeof h?.month === "string") {
          const parsed = Date.parse(`${h.month}-01T00:00:00Z`);
          ts = Number.isFinite(parsed) ? parsed : null;
        }
        if (ts == null) ts = i;

        const label =
          typeof h?.month === "string"
            ? h.month
            : typeof h?.date === "string"
            ? h.date
            : typeof h?.at === "string"
            ? h.at.slice(0, 10)
            : `p${i + 1}`;

        return {
          ts,
          label,
          steam: typeof h?.steam === "number" ? h.steam : null,
          epic: typeof h?.epic === "number" ? h.epic : null
        };
      })
      .sort((a, b) => a.ts - b.ts);

    const compact = [];
    normalized.forEach((row) => {
      const prev = compact[compact.length - 1];
      if (prev && prev.ts === row.ts) {
        compact[compact.length - 1] = row;
      } else {
        compact.push(row);
      }
    });

    return compact;
  };

  const renderChart = (rawHistory) => {
    const history = normalizeHistory(rawHistory);

    const width = 760;
    const height = 260;
    const margin = { top: 18, right: 16, bottom: 34, left: 44 };
    const chartW = width - margin.left - margin.right;
    const chartH = height - margin.top - margin.bottom;

    const steamVals = history.map((h) => (typeof h.steam === "number" ? h.steam : null));
    const epicVals = history.map((h) => (typeof h.epic === "number" ? h.epic : null));
    const allVals = steamVals.concat(epicVals).filter((v) => typeof v === "number");

    if (!allVals.length) {
      return `<p class="price-note">No Steam/Epic price history points available for this title.</p>`;
    }

    const maxVal = Math.max(...allVals, 1);
    const yMax = Math.ceil(maxVal * 1.12);
    const minTs = history[0].ts;
    const maxTs = history[history.length - 1].ts;
    const tsRange = maxTs - minTs;
    const xPos = (row, index) => {
      if (tsRange <= 0) {
        const xStep = history.length > 1 ? chartW / (history.length - 1) : chartW;
        return margin.left + index * xStep;
      }
      return margin.left + ((row.ts - minTs) / tsRange) * chartW;
    };
    const yPos = (v) => margin.top + chartH - (v / yMax) * chartH;

    const steamPoints = history.map((h, i) => ({
      x: xPos(h, i),
      y: typeof h.steam === "number" ? yPos(h.steam) : null
    }));
    const epicPoints = history.map((h, i) => ({
      x: xPos(h, i),
      y: typeof h.epic === "number" ? yPos(h.epic) : null
    }));

    const gridRows = 4;
    let grid = "";
    for (let i = 0; i <= gridRows; i++) {
      const y = margin.top + (chartH / gridRows) * i;
      const labelValue = (yMax * (gridRows - i)) / gridRows;
      grid += `<line x1="${margin.left}" y1="${y}" x2="${width - margin.right}" y2="${y}" stroke="rgba(255,255,255,0.12)" />`;
      grid += `<text x="${margin.left - 8}" y="${y + 4}" fill="rgba(167,184,222,0.9)" font-size="11" text-anchor="end">$${labelValue.toFixed(0)}</text>`;
    }

    const lastIdx = history.length - 1;
    const midIdx = Math.floor(lastIdx / 2);
    const xLabels = [0, midIdx, lastIdx]
      .filter((v, i, arr) => arr.indexOf(v) === i)
      .map((idx) => {
        const x = steamPoints[idx].x;
        const label = history[idx].label;
        return `<text x="${x}" y="${height - 10}" fill="rgba(167,184,222,0.9)" font-size="11" text-anchor="middle">${label}</text>`;
      })
      .join("");

    const steamPath = buildPath(steamPoints);
    const epicPath = buildPath(epicPoints);

    return `
      <div class="chart-shell">
        <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Price chart">
          ${grid}
          <line x1="${margin.left}" y1="${margin.top + chartH}" x2="${width - margin.right}" y2="${margin.top + chartH}" stroke="rgba(255,255,255,0.25)" />
          ${steamPath ? `<path d="${steamPath}" fill="none" stroke="#66c2ff" stroke-width="2.5" />` : ""}
          ${epicPath ? `<path d="${epicPath}" fill="none" stroke="#ff7db5" stroke-width="2.5" />` : ""}
          ${xLabels}
        </svg>
      </div>
      <div class="chart-legend">
        <span><span class="legend-dot" style="background:#66c2ff"></span>Steam</span>
        <span><span class="legend-dot" style="background:#ff7db5"></span>Epic Games Store</span>
      </div>
    `;
  };

  const loadPriceData = () => {
    if (window.ALIVE_PRICE_DATA && typeof window.ALIVE_PRICE_DATA === "object") {
      return Promise.resolve(window.ALIVE_PRICE_DATA);
    }
    return fetch("price-data.json").then((res) => res.json());
  };

  loadPriceData()
    .then((allData) => {
      const gameData = allData[page];
      if (!gameData) return;

      if (document.getElementById("price-tracker-panel")) return;

      const steam = gameData.stores?.steam || {};
      const epic = gameData.stores?.epic || {};
      const freeExternal = Boolean(gameData.freeExternal);

      const panel = document.createElement("section");
      panel.className = "panel";
      panel.id = "price-tracker-panel";
      const chartInput =
        Array.isArray(gameData.historyPoints) && gameData.historyPoints.length
          ? gameData.historyPoints
          : Array.isArray(gameData.history)
          ? gameData.history
          : [];
      panel.innerHTML = `
        <h2>Steam and Epic Pricing</h2>
        <div class="price-grid">
          <div class="price-item">
            <strong>Steam (USD)</strong>
            <span>${storeLabel(steam, freeExternal)}</span>
          </div>
          <div class="price-item">
            <strong>Epic Games (USD)</strong>
            <span>${storeLabel(epic, freeExternal)}</span>
          </div>
        </div>
        ${renderChart(chartInput)}
        <p class="price-note">Updated: ${gameData.updatedAt}. Chart uses recorded price-change points over the last year.</p>
      `;

      if (sourcePanel) {
        contentGrid.insertBefore(panel, sourcePanel);
      } else {
        contentGrid.appendChild(panel);
      }
    })
    .catch(() => {});
})();
