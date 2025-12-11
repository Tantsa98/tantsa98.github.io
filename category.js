// category.js
(function(){

  // визначення категорії/ключа сторінки
  // html[data-category] містить мітку для фільтрації (наприклад "Розвідка", "Бомбери", "FPV")
  // body.dataset.page містить ключ, що відповідає Cloudflare JSON (наприклад "rozvidka","bombers","fpv")
  const categoryLabel = document.documentElement.getAttribute('data-category')
    || document.body.getAttribute('data-category') || '';
  const pageKey = (document.body.dataset.page || '').trim(); // розпізнає "rozvidka" / "bombers" / "fpv"

  const filtersRoot = document.getElementById('filters');
  const galleryRoot = document.getElementById('gallery');
  const clearBtn = document.getElementById('clearFilters');

  const overlay = document.getElementById('overlay');
  const closeModal = document.getElementById('closeModal');
  const mName = document.getElementById('mName');
  const mType = document.getElementById('mType');
  const mAff = document.getElementById('mAff');
  const mDesc = document.getElementById('mDesc');

  const prevBtn = document.getElementById('prevImg');
  const nextBtn = document.getElementById('nextImg');
  const imgCount = document.getElementById('imgCount');
  let carouselEl = document.getElementById('carouselImg');

  let currentImages = [];
  let currentIndex = 0;
  let categoryData = [];

  let mediaIndex = null;
  let cloudCounts = null; // object mapping "Name" -> count for this page

  // ----------------------
  // load media-index.json (array of "imgId#N.ext")
  // ----------------------
  async function loadMediaIndex(){
    if (mediaIndex) return mediaIndex;
    try {
      const res = await fetch('data/media-index.json', {cache: "no-store"});
      mediaIndex = await res.json();
      return mediaIndex;
    } catch (e){
      console.error("Не вдалося завантажити media-index.json", e);
      mediaIndex = [];
      return mediaIndex;
    }
  }

  // given an imgId (e.g. "1burchuk") return list of filenames from media-index.json that start with "imgId#"
  async function findMediaByImgId(imgId){
    const all = await loadMediaIndex();
    if(!imgId) return [];
    return all.filter(name => name.startsWith(imgId + "#"));
  }

  // ----------------------
  // load BK.csv via existing App.loadCSV if available, otherwise fetch+parse simple
  // ----------------------
  async function loadCSVFallback(path='data/BK.csv'){
    try {
      const r = await fetch(path, {cache: "no-store"});
      if(!r.ok) throw new Error('CSV not found');
      const txt = await r.text();
      // reuse the same robust parser as main.js if present; otherwise fallback
      if(window.App && typeof window.App.loadCSV === 'function'){
        return await window.App.loadCSV();
      } else {
        // simple parser (handles quoted commas poorly but is fallback)
        const rows = txt.trim().split(/\r?\n/);
        const header = rows[0].split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/).map(h => h.replace(/^"|"$/g,'').trim());
        const out = [];
        for(let i=1;i<rows.length;i++){
          const line = rows[i];
          if(!line.trim()) continue;
          const values = line.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/).map(v => v.replace(/^"|"$/g,'').trim());
          const obj = {};
          header.forEach((h, idx) => {
            obj[h] = values[idx] === undefined ? '' : values[idx];
          });
          out.push(obj);
        }
        return out;
      }
    } catch (e) {
      console.error('Помилка завантаження CSV:', e);
      return [];
    }
  }

  // ----------------------
  // load cloud counts from your Cloudflare worker
  // ----------------------
  async function loadCloudCounts(){
    try {
      const res = await fetch('https://old-fog-c80a.tantsa98.workers.dev', {cache: "no-store"});
      if(!res.ok) throw new Error('Cloudflare response not ok');
      const j = await res.json();
      // expect keys: rozvidka, bombers, fpv
      if(pageKey && j && j[pageKey]){
        cloudCounts = j[pageKey];
      } else {
        cloudCounts = null;
      }
    } catch (e){
      console.warn("Не вдалося підвантажити дані з Cloudflare:", e);
      cloudCounts = null;
    }
  }

  function setOverlayVisible(visible){
    if(visible){
      overlay.classList.remove('hidden');
      overlay.setAttribute('aria-hidden','false');
    } else {
      overlay.classList.add('hidden');
      overlay.setAttribute('aria-hidden','true');
    }
  }

  function renderFilters(types){
    if(!filtersRoot) return;
    filtersRoot.innerHTML = '';
    if(!types.length){
      filtersRoot.innerHTML = '<p class="muted">Немає варіантів</p>';
      return;
    }

    const frag = document.createDocumentFragment();
    types.forEach(t => {
      const id = 'f_'+t.replace(/\s+/g,'_');
      const label = document.createElement('label');
      label.innerHTML = `<input type="checkbox" value="${t}" id="${id}"> ${t}`;
      frag.appendChild(label);
    });
    filtersRoot.appendChild(frag);
  }

  function getSelectedTypes(){
    if(!filtersRoot) return [];
    return Array.from(filtersRoot.querySelectorAll('input:checked'))
      .map(i => i.value);
  }

  function filterByTypes(data, selected){
    if(!selected.length) return data;
    return data.filter(d => selected.includes(d.Type));
  }

  // When rendering gallery cards we append cloud count if an exact match exists
  function renderGallery(data){
    galleryRoot.innerHTML = '';
    if(!data.length){
      galleryRoot.innerHTML = '<p class="muted">Нічого не знайдено.</p>';
      return;
    }

    const frag = document.createDocumentFragment();

    data.forEach(item => {
      const card = document.createElement('div');
      card.className = 'card-item';
      card.tabIndex = 0;
      card.setAttribute('role','button');
      card.dataset.imgId = item.imgId || '';
      card.dataset.id = item.ID || '';

      // determine displayed name: append (count) only on exact match of Name -> key in cloudCounts
      let displayName = item.Name || '';
      if(cloudCounts && displayName && Object.prototype.hasOwnProperty.call(cloudCounts, displayName)){
        displayName = `${displayName} (${cloudCounts[displayName]})`;
      }

      card.innerHTML = `<h3>${displayName}</h3><p class="type">${item.Type}</p>`;

      card.addEventListener('click', () => openModal(item));
      card.addEventListener('keydown', e => {
        if(e.key === 'Enter') openModal(item);
      });

      frag.appendChild(card);
    });

    galleryRoot.appendChild(frag);
  }

  async function openModal(item){
    mName.textContent = item.Name || '';
    // if cloudCounts has exact Name match, show the name with count in modal too
    if(cloudCounts && item.Name && Object.prototype.hasOwnProperty.call(cloudCounts, item.Name)){
      mName.textContent = `${item.Name} (${cloudCounts[item.Name]})`;
    }

    mType.textContent = item.Type || '';
    mAff.textContent = item.Affiliation || '';
    mDesc.textContent = item.Desc || '';

    const imgId = (item.imgId || '').trim();
    currentImages = await findMediaByImgId(imgId);

    currentIndex = 0;
    updateCarousel();
    setOverlayVisible(true);
  }

  function updateCarousel(){
    if(!currentImages.length){
      // replace carousel element with empty clone to remove old media and listeners
      carouselEl.replaceWith(carouselEl.cloneNode());
      carouselEl = document.getElementById('carouselImg');
      imgCount.textContent = '0 / 0';
      prevBtn.style.display = 'none';
      nextBtn.style.display = 'none';
      return;
    }

    const file = currentImages[currentIndex];
    const ext = file.split('.').pop().toLowerCase();
    const url = 'media/' + encodeURIComponent(file);

    let newEl;

    if(['mp4','webm','mov'].includes(ext)){
      newEl = document.createElement('video');
      newEl.controls = true;
    } else {
      newEl = document.createElement('img');
      newEl.alt = file;

      // lazy loading enhancements
      newEl.loading = "lazy";
      newEl.decoding = "async";
      newEl.classList.add("fade-in");
    }

    newEl.id = 'carouselImg';
    newEl.src = url;

    carouselEl.replaceWith(newEl);
    carouselEl = newEl;

    imgCount.textContent = (currentIndex+1)+' / '+currentImages.length;

    prevBtn.style.display = currentImages.length > 1 ? 'block' : 'none';
    nextBtn.style.display = currentImages.length > 1 ? 'block' : 'none';
  }

  function prevImage(){
    if(!currentImages.length) return;
    currentIndex = (currentIndex - 1 + currentImages.length) % currentImages.length;
    updateCarousel();
  }

  function nextImage(){
    if(!currentImages.length) return;
    currentIndex = (currentIndex + 1) % currentImages.length;
    updateCarousel();
  }

  function attachEvents(){
    if(filtersRoot){
      filtersRoot.addEventListener('change', () => {
        const selected = getSelectedTypes();
        renderGallery(filterByTypes(categoryData, selected));
      });
    }

    if(clearBtn){
      clearBtn.addEventListener('click', () => {
        if(filtersRoot) Array.from(filtersRoot.querySelectorAll('input')).forEach(i => i.checked = false);
        renderGallery(categoryData);
      });
    }

    if(closeModal) closeModal.addEventListener('click', () => setOverlayVisible(false));
    if(overlay) overlay.addEventListener('click', e => {
      if(e.target === overlay) setOverlayVisible(false);
    });

    if(prevBtn) prevBtn.addEventListener('click', prevImage);
    if(nextBtn) nextBtn.addEventListener('click', nextImage);
  }

  async function init(){
    attachEvents();

    // load CSV from existing App (main.js) if available, otherwise fallback
    const all = await loadCSVFallback();

    // Cloud counts may be used to append numbers to names (exact-match only)
    await loadCloudCounts();

    // we filter by Affiliation that contains categoryLabel (case-insensitive)
    categoryData = all.filter(it =>
      (it.Affiliation || '').trim().toLowerCase()
        .includes((categoryLabel || '').trim().toLowerCase())
    );

    // extract unique types for filters (using simple Set)
    const types = [...new Set(categoryData.map(d => d.Type).filter(Boolean))];

    renderFilters(types);
    renderGallery(categoryData);
  }

  // start
  init();

})();
