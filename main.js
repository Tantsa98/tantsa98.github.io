// ===== ЗАВАНТАЖЕННЯ BK.csv З WORKER =====
async function loadBK() {
    try {
        const res = await fetch(
            `https://old-fog-c80a.tantsa98.workers.dev/`
        );
        const text = await res.text();

        const lines = text.trim().split("\n");
        const map = {};

        for (let line of lines) {
            const [name, count] = line.split(",");
            map[name.trim()] = Number(count.trim());
        }
        return map;
    } catch (err) {
        console.error("Помилка BK:", err);
        return {};
    }
}

window.BKDATA = {};
loadBK().then(data => {
    window.BKDATA = data;
});

// ====== ЗАВАНТАЖЕННЯ JSON ======
async function loadJSON(path) {
    const res = await fetch(path);
    return await res.json();
}
