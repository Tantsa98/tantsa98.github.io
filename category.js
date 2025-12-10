document.addEventListener("DOMContentLoaded", async () => {
    const CATEGORY_NAME = document.body.dataset.category;
    const gallery = document.getElementById("gallery");
    const filtersBox = document.getElementById("filters");

    // ==== Дані =====
    const data = await loadJSON("data.json");
    const mediaIndex = await loadJSON("media-index.json");

    const items = data.filter(el => el.category === CATEGORY_NAME);

    // Заповнити фільтри
    const types = [...new Set(items.map(x => x.type))];
    filtersBox.innerHTML = types
        .map(t => `<label><input type="checkbox" value="${t}"> ${t}</label>`)
        .join("");

    const checkboxes = filtersBox.querySelectorAll("input[type=checkbox]");
    const clearBtn = document.getElementById("clearFilters");

    function applyFilters() {
        const selected = [...checkboxes].filter(c => c.checked).map(c => c.value);

        const filtered = selected.length
            ? items.filter(x => selected.includes(x.type))
            : items;

        renderCards(filtered);
    }

    checkboxes.forEach(cb => cb.addEventListener("change", applyFilters));
    clearBtn.addEventListener("click", () => {
        checkboxes.forEach(c => (c.checked = false));
        applyFilters();
    });

    // ========= РЕНДЕР КАРТОК ===========
    function renderCards(arr) {
        gallery.innerHTML = arr
            .map(item => {
                const imgs = mediaIndex[item.id] || [];
                const count = window.BKDATA[item.name] ?? 0;

                return `
                <div class="card" data-id="${item.id}">
                    <img src="./media/${imgs[0]}" alt="${item.name}">
                    <h3>${item.name} (${count})</h3>
                    <p>${item.type}</p>
                </div>`;
            })
            .join("");
    }

    applyFilters();

    // ======== POPUP ==========
    const overlay = document.getElementById("overlay");
    const closeModal = document.getElementById("closeModal");

    const carouselImg = document.getElementById("carouselImg");
    const imgCount = document.getElementById("imgCount");

    const mName = document.getElementById("mName");
    const mType = document.getElementById("mType");
    const mAff = document.getElementById("mAff");
    const mDesc = document.getElementById("mDesc");

    let currentImages = [];
    let currentIndex = 0;

    gallery.addEventListener("click", e => {
        const card = e.target.closest(".card");
        if (!card) return;

        const id = card.dataset.id;
        const item = items.find(x => x.id == id);

        currentImages = mediaIndex[id] || [];
        currentIndex = 0;

        const count = window.BKDATA[item.name] ?? 0;

        mName.textContent = `${item.name} (${count})`;
        mType.textContent = item.type;
        mAff.textContent = item.affiliation;
        mDesc.textContent = item.description;

        updateCarousel();

        overlay.classList.remove("hidden");
    });

    function updateCarousel() {
        if (!currentImages.length) return;

        carouselImg.src = `./media/${currentImages[currentIndex]}`;
        imgCount.textContent = `${currentIndex + 1} / ${currentImages.length}`;
    }

    document.getElementById("prevImg").onclick = () => {
        if (currentIndex > 0) {
            currentIndex--;
            updateCarousel();
        }
    };

    document.getElementById("nextImg").onclick = () => {
        if (currentIndex < currentImages.length - 1) {
            currentIndex++;
            updateCarousel();
        }
    };

    closeModal.addEventListener("click", () => {
        overlay.classList.add("hidden");
    });

    overlay.addEventListener("click", e => {
        if (e.target === overlay) overlay.classList.add("hidden");
    });
});
