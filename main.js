// main.js
// Завантажує CSV + дані з Cloudflare Worker і робить їх доступними для всіх сторінок

const App = (function () {
  let _data = null;
  let _cloud = null;

  const WORKER_URL = "https://old-fog-c80a.tantsa98.workers.dev/";

  // CSV-парсер
  function parseCSV(text) {
    const rows = text.trim().split(/\r?\n/);
    if (!rows.length) return [];
    const header = rows[0]
      .split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/)
      .map((h) => h.replace(/^"|"$/g, "").trim());

    const out = [];
    for (let i = 1; i < rows.length; i++) {
      const line = rows[i];
      if (!line.trim()) continue;

      const values = line
        .split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/)
        .map((v) => v.replace(/^"|"$/g, "").trim());

      const obj = {};
      header.forEach((h, idx) => {
        obj[h] = values[idx] === undefined ? "" : values[idx];
      });
      out.push(obj);
    }
    return out;
  }

  // Завантаження CSV
  async function loadCSV(path = "data/BK.csv") {
    if (_data) return _data;
    try {
      const r = await fetch(path, { cache: "no-store" });
      if (!r.ok) throw new Error("CSV not found");
      const txt = await r.text();
      _data = parseCSV(txt);
      return _data;
    } catch (e) {
      console.error("Error loading CSV:", e);
      _data = [];
      return _data;
    }
  }

  // Завантаження Cloudflare JSON
  async function loadCloud() {
    if (_cloud) return _cloud;
    try {
      const r = await fetch(WORKER_URL, { cache: "no-store" });
      _cloud = await r.json();
      return _cloud;
    } catch (e) {
      console.error("Помилка завантаження Cloudflare JSON:", e);
      _cloud = {};
      return _cloud;
    }
  }

  // Повертає конкретну категорію: rozvidka / bombers / fpv
  async function getCloudCategory(cat) {
    const data = await loadCloud();
    return data[cat] || {};
  }

  // Унікальні значення
  function unique(arr) {
    return [...new Set(arr)].filter(Boolean);
  }

  return {
    loadCSV,
    loadCloud,
    getCloudCategory,
    getAll: () => _data,
    utils: { unique },
  };
})();

window.App = App;
