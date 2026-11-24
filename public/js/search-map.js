// Modulo frontend: Ricerca farmaci, equivalenti AIFA, distretti ASL e mappa Leaflet
// Sviluppato sul branch: feat/search-map-ui

(() => {
  const PUGLIA_CENTER = [41.05, 16.65];
  const PUGLIA_DEFAULT_ZOOM = 8;

  const state = {
    districts: [],
    medicines: [],
    pharmacies: [],
    selectedComune: '',
    userLocation: null, // { lat, lng, label }
    map: null,
    markersLayer: null,
    userLayer: null,
    markersById: new Map(),
    activeMedicineContext: null
  };

  const VISIBLE_MEDICINES = 9;

  function escapeHtml(value) {
    if (value === null || value === undefined) return '';
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function formatEuro(amount) {
    if (typeof amount !== 'number' || Number.isNaN(amount)) {
      return 'N/D';
    }
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  }

  function buildDirectionsUrl(pharmacy) {
    if (state.userLocation && typeof pharmacy.lat === 'number' && typeof pharmacy.lng === 'number') {
      return `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${state.userLocation.lat}%2C${state.userLocation.lng}%3B${pharmacy.lat}%2C${pharmacy.lng}`;
    }
    if (typeof pharmacy.lat === 'number' && typeof pharmacy.lng === 'number') {
      return `https://www.openstreetmap.org/?mlat=${pharmacy.lat}&mlon=${pharmacy.lng}#map=17/${pharmacy.lat}/${pharmacy.lng}`;
    }
    const query = encodeURIComponent(`${pharmacy.address}, ${pharmacy.comune}, Puglia, Italia`);
    return `https://www.openstreetmap.org/search?query=${query}`;
  }

  // --- 1. Inizializzazione Mappa Leaflet ---
  function initLeafletMap() {
    const mapContainer = document.getElementById('pharmacy-map');
    if (!mapContainer || typeof window.L === 'undefined') {
      return;
    }

    state.map = window.L.map(mapContainer, {
      scrollWheelZoom: true,
      preferCanvas: true // i presidi sono quasi duemila: un elemento HTML ciascuno sarebbe lento
    }).setView(PUGLIA_CENTER, PUGLIA_DEFAULT_ZOOM);

    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(state.map);

    state.markersLayer = window.L.layerGroup().addTo(state.map);
    state.userLayer = window.L.layerGroup().addTo(state.map);

    // Ricalcola dimensioni Leaflet quando si torna sulla tab Cerca & Mappa
    const searchTabBtn = document.querySelector('.nav-tab[data-tab="search"]');
    if (searchTabBtn) {
      searchTabBtn.addEventListener('click', () => {
        setTimeout(() => {
          if (state.map) state.map.invalidateSize();
        }, 80);
      });
    }
  }

  function createUserIcon() {
    if (typeof window.L === 'undefined') return null;
    return window.L.divIcon({
      className: '',
      html: '<div class="custom-leaflet-marker marker-user" aria-hidden="true">●</div>',
      iconSize: [28, 28],
      iconAnchor: [14, 14],
      popupAnchor: [0, -14]
    });
  }

  // --- 2. Inquadramento Comune -> ASL / Distretto Socio-Sanitario ---
  async function loadDistricts(comuneFilter = '') {
    const query = comuneFilter ? `?comune=${encodeURIComponent(comuneFilter)}` : '';
    const data = await window.PharmaAPI.request(`/api/districts${query}`);
    const districts = Array.isArray(data.districts) ? data.districts : [];

    if (!comuneFilter) {
      state.districts = districts;
      populateComuneSelects(districts);
      const kpiDistricts = document.getElementById('kpi-districts-count');
      if (kpiDistricts) {
        kpiDistricts.textContent = String(districts.length);
      }
    }

    renderDistrictResult(districts, comuneFilter);
    return districts;
  }

  function populateComuneSelects(districts) {
    const uniqueComuni = Array.from(new Set(districts.map((d) => d.comune))).sort((a, b) =>
      a.localeCompare(b, 'it')
    );

    const districtSelect = document.getElementById('district-comune-select');
    const pharmacySelect = document.getElementById('pharmacy-comune-filter');

    if (districtSelect) {
      const currentVal = districtSelect.value;
      districtSelect.innerHTML =
        '<option value="">Tutti i Comuni della Puglia</option>' +
        uniqueComuni
          .map((c) => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`)
          .join('');
      districtSelect.value = currentVal;
    }

    if (pharmacySelect) {
      const currentVal = pharmacySelect.value;
      pharmacySelect.innerHTML =
        '<option value="">Tutti i Comuni</option>' +
        uniqueComuni
          .map((c) => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`)
          .join('');
      pharmacySelect.value = currentVal;
    }
  }

  function renderDistrictResult(districts, selectedComune) {
    const container = document.getElementById('district-result-container');
    if (!container) return;

    // Aggiorna stato attivo sui chip Comuni
    document.querySelectorAll('[data-quick-comune]').forEach((btn) => {
      const isMatch =
        selectedComune &&
        btn.dataset.quickComune.toLowerCase() === selectedComune.toLowerCase();
      btn.classList.toggle('is-active', Boolean(isMatch));
    });

    if (districts.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          Nessun Distretto Socio-Sanitario trovato per il Comune selezionato.
        </div>
      `;
      return;
    }

    if (selectedComune && districts.length === 1) {
      const d = districts[0];
      container.innerHTML = `
        <div class="district-card">
          <div class="district-card-header">
            <h3 class="district-card-title">${escapeHtml(d.comune)} (${escapeHtml(d.provincia)})</h3>
            <span class="badge badge-accent">${escapeHtml(d.asl_name)}</span>
          </div>
          <div class="district-meta-grid">
            <div class="district-meta-item">
              <span>Distretto Socio-Sanitario</span>
              <strong>${escapeHtml(d.district_name)}</strong>
            </div>
            <div class="district-meta-item">
              <span>Codice Distretto</span>
              <strong>${escapeHtml(d.district_code || 'N/D')}</strong>
            </div>
            <div class="district-meta-item">
              <span>Azienda Sanitaria</span>
              <strong>${escapeHtml(d.asl_name)}</strong>
            </div>
            <div class="district-meta-item">
              <span>Presidi censiti nel Comune</span>
              <strong>${Number(d.pharmacies_count) || 0} presidi</strong>
            </div>
          </div>
          <div class="input-row">
            <button
              type="button"
              class="btn btn-sm btn-primary"
              data-focus-comune-map="${escapeHtml(d.comune)}"
            >
              Mostra presidi di ${escapeHtml(d.comune)} su mappa
            </button>
            <button
              type="button"
              class="btn btn-sm"
              id="district-clear-btn"
            >
              Vedi tutte le ASL Puglia
            </button>
          </div>
        </div>
      `;
    } else {
      const itemsHtml = districts
        .map(
          (d) => `
          <button
            type="button"
            class="district-mini-item"
            data-select-district-comune="${escapeHtml(d.comune)}"
          >
            <strong>${escapeHtml(d.comune)} (${escapeHtml(d.provincia)})</strong>
            <span>${escapeHtml(d.asl_name)} · ${escapeHtml(d.district_name)}</span>
          </button>
        `
        )
        .join('');

      container.innerHTML = `
        <div class="district-card">
          <div class="district-card-header">
            <strong class="district-card-title">Ripartizione Territoriale ASL Regione Puglia (${districts.length} Comuni)</strong>
            <span class="badge badge-primary">6 ASL Provinciali</span>
          </div>
          <div class="district-summary-list">
            ${itemsHtml}
          </div>
        </div>
      `;
    }

    container.querySelectorAll('[data-select-district-comune]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const comune = btn.getAttribute('data-select-district-comune');
        selectComuneAndSync(comune, true);
      });
    });

    container.querySelectorAll('[data-focus-comune-map]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const comune = btn.getAttribute('data-focus-comune-map');
        selectComuneAndSync(comune, true);
        const mapCard = document.getElementById('map-section-card');
        if (mapCard) {
          mapCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });

    const clearBtn = container.querySelector('#district-clear-btn');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        selectComuneAndSync('', false);
      });
    }
  }

  async function selectComuneAndSync(comune, syncMap = true) {
    state.selectedComune = comune;
    const districtSelect = document.getElementById('district-comune-select');
    if (districtSelect) {
      districtSelect.value = comune;
    }

    await loadDistricts(comune);

    if (syncMap) {
      const pharmacyComuneSelect = document.getElementById('pharmacy-comune-filter');
      if (pharmacyComuneSelect) {
        pharmacyComuneSelect.value = comune;
      }
      await loadPharmacies();
    }
  }

  // --- 3. Ricerca Farmaci AIFA & Matching Equivalenti ---
  async function loadMedicines() {
    const queryInput = document.getElementById('medicine-query-input');
    const genericSelect = document.getElementById('medicine-generic-filter');
    const prescriptionSelect = document.getElementById('medicine-prescription-filter');

    const q = queryInput ? queryInput.value.trim() : '';
    const generic = genericSelect ? genericSelect.value : '';
    const prescription = prescriptionSelect ? prescriptionSelect.value : '';

    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (generic !== '') params.set('generic', generic);
    if (prescription !== '') params.set('prescription', prescription);

    const qs = params.toString() ? `?${params.toString()}` : '';
    const data = await window.PharmaAPI.request(`/api/medicines${qs}`);
    const medicines = Array.isArray(data.medicines) ? data.medicines : [];
    state.medicines = medicines;

    if (!q && generic === '' && prescription === '') {
      const kpiMedicines = document.getElementById('kpi-medicines-count');
      if (kpiMedicines) {
        kpiMedicines.textContent = String(Number(data.total) || medicines.length);
      }
    }

    // Aggiorna stato attivo sui chip farmaci
    document.querySelectorAll('[data-quick-medicine]').forEach((btn) => {
      const chipQuery = btn.dataset.quickMedicine;
      btn.classList.toggle('is-active', chipQuery.toLowerCase() === q.toLowerCase());
    });

    renderMedicines(medicines, q, Number(data.total) || medicines.length);
    return medicines;
  }

  // Senza limite le schede spingono la mappa migliaia di pixel più in basso.
  function limitVisibleMedicines(gridEl) {
    const hiddenCards = [...gridEl.children].slice(VISIBLE_MEDICINES);
    if (hiddenCards.length === 0) return;

    hiddenCards.forEach((card) => card.classList.add('is-hidden'));
    const moreBtn = document.createElement('button');
    moreBtn.type = 'button';
    moreBtn.className = 'btn medicines-more';
    moreBtn.textContent = `Mostra altri ${hiddenCards.length} farmaci`;
    moreBtn.addEventListener('click', () => {
      hiddenCards.forEach((card) => card.classList.remove('is-hidden'));
      moreBtn.remove();
      hiddenCards[0].querySelector('button')?.focus();
    });
    gridEl.append(moreBtn);
  }

  function renderMedicines(medicines, query, total) {
    const summaryEl = document.getElementById('medicine-results-summary');
    const gridEl = document.getElementById('medicine-results-grid');
    if (!gridEl || !summaryEl) return;

    if (medicines.length === 0) {
      summaryEl.textContent = query
        ? `Nessun medicinale trovato per "${query}". Prova con il principio attivo (es. Paracetamolo, Ibuprofene).`
        : 'Nessun medicinale disponibile con i filtri selezionati.';
      gridEl.innerHTML = `
        <div class="empty-state">
          Nessun farmaco corrisponde ai criteri di ricerca impostati.
        </div>
      `;
      return;
    }

    const shown = medicines.length < total ? `Primi ${medicines.length} di ${total} medicinali` : `${total} medicinali`;
    summaryEl.textContent = query ? `${shown} per "${query}".` : `${shown}.`;

    gridEl.innerHTML = medicines
      .map((med) => {
        const isGeneric = Number(med.is_generic) === 1;
        const needsPrescription = Number(med.prescription_required) === 1;
        const equivalents = Array.isArray(med.equivalents) ? med.equivalents : [];
        const cheapestPrice = med.cheapest_equivalent_price;
        const saving = Number(med.potential_saving) || 0;

        let equivalentsHtml = '';
        if (equivalents.length === 0) {
          equivalentsHtml = `
            <div class="equivalents-box">
              <div class="equivalents-header">
                <span>Farmaci Equivalenti AIFA</span>
                <span class="badge badge-neutral">Nessun altro equivalente</span>
              </div>
              <p class="small-meta text-muted">
                Non risultano altri medicinali con lo stesso principio attivo in elenco.
              </p>
            </div>
          `;
        } else {
          const savingBadgeHtml =
            saving > 0
              ? `<span class="saving-pill">Risparmio fino a ${formatEuro(saving)}</span>`
              : `<span class="badge badge-success">Prezzo più basso della categoria</span>`;

          const listItems = equivalents
            .map((eq) => {
              const isCheapest = cheapestPrice !== null && eq.price === cheapestPrice;
              const eqBadge = Number(eq.is_generic) === 1 ? 'Generico' : 'Brand';
              return `
                <li class="equivalent-item ${isCheapest ? 'is-cheapest' : ''}">
                  <div class="equivalent-info">
                    <strong>${escapeHtml(eq.commercial_name)}</strong>
                    <small>AIC ${escapeHtml(eq.aic_code)} · ${escapeHtml(eq.holder || 'AIFA')} · ${eqBadge}</small>
                  </div>
                  <span class="equivalent-price">${formatEuro(eq.price)}</span>
                </li>
              `;
            })
            .join('');

          equivalentsHtml = `
            <div class="equivalents-box">
              <div class="equivalents-header">
                <span>Equivalenti (${equivalents.length}) · stesso principio attivo</span>
                ${savingBadgeHtml}
              </div>
              <ul class="equivalent-list">
                ${listItems}
              </ul>
            </div>
          `;
        }

        return `
          <article class="medicine-card">
            <div>
              <div class="medicine-card-top">
                <div>
                  <h3 class="medicine-name">${escapeHtml(med.commercial_name)}</h3>
                  <p class="medicine-ingredient">Principio attivo: ${escapeHtml(med.active_ingredient)}</p>
                </div>
                <span class="price-tag">${formatEuro(med.price)}</span>
              </div>

              <div class="medicine-badges">
                <span class="badge ${isGeneric ? 'badge-success' : 'badge-neutral'}">
                  ${isGeneric ? 'Equivalente / Generico AIFA' : 'Farmaco Brand'}
                </span>
                <span class="badge ${needsPrescription ? 'badge-warning' : 'badge-accent'}">
                  ${needsPrescription ? 'Ricetta Medica Obbligatoria (RR)' : 'Senza Ricetta (SOP / OTC)'}
                </span>
              </div>

              <div class="medicine-meta">
                <span><strong>AIC:</strong> ${escapeHtml(med.aic_code)}</span>
                <span><strong>ATC:</strong> ${escapeHtml(med.atc_code || 'N/D')}</span>
                <span><strong>Titolare:</strong> ${escapeHtml(med.holder || 'N/D')}</span>
              </div>

              ${equivalentsHtml}
            </div>

            <button
              type="button"
              class="btn btn-sm btn-accent"
              data-find-pharmacy-for-med="${escapeHtml(med.commercial_name)}"
              data-med-prescription="${needsPrescription ? '1' : '0'}"
            >
              ${
                needsPrescription
                  ? 'Trova Farmacie abilitate (richiede ricetta)'
                  : 'Trova Farmacie e Parafarmacie vicine'
              }
            </button>
          </article>
        `;
      })
      .join('');

    limitVisibleMedicines(gridEl);

    gridEl.querySelectorAll('[data-find-pharmacy-for-med]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const medName = btn.getAttribute('data-find-pharmacy-for-med');
        const needsPrescription = btn.getAttribute('data-med-prescription') === '1';
        await focusPharmaciesForMedicine(medName, needsPrescription);
      });
    });
  }

  async function focusPharmaciesForMedicine(medicineName, needsPrescription) {
    state.activeMedicineContext = { medicineName, needsPrescription };
    const typeSelect = document.getElementById('pharmacy-type-filter');
    if (typeSelect) {
      typeSelect.value = needsPrescription ? 'farmacia' : '';
    }

    const contextEl = document.getElementById('active-medicine-context');
    if (contextEl) {
      contextEl.classList.remove('is-hidden');
      contextEl.innerHTML = `
        <span>
          Dispensazione per <strong>${escapeHtml(medicineName)}</strong>:
          ${needsPrescription ? 'filtrate solo Farmacie (obbligo di ricetta)' : 'abilitate Farmacie e Parafarmacie'}
        </span>
        <button type="button" class="btn btn-sm" id="clear-med-context-btn">Rimuovi filtro</button>
      `;
      const clearBtn = contextEl.querySelector('#clear-med-context-btn');
      if (clearBtn) {
        clearBtn.addEventListener('click', async () => {
          state.activeMedicineContext = null;
          contextEl.classList.add('is-hidden');
          if (typeSelect) typeSelect.value = '';
          await loadPharmacies();
        });
      }
    }

    await loadPharmacies();

    const mapSection = document.getElementById('map-section-card');
    if (mapSection) {
      mapSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  // --- 4. Caricamento Presidi Farmaceutici, Geocoding Nominatim e Rendering Mappa ---
  async function loadPharmacies() {
    const comuneSelect = document.getElementById('pharmacy-comune-filter');
    const typeSelect = document.getElementById('pharmacy-type-filter');
    const radiusSelect = document.getElementById('pharmacy-radius-filter');

    const comune = comuneSelect ? comuneSelect.value.trim() : '';
    const type = typeSelect ? typeSelect.value.trim() : '';
    const radiusKm = radiusSelect ? radiusSelect.value.trim() : '';

    const params = new URLSearchParams();
    if (comune) params.set('comune', comune);
    if (type) params.set('type', type);
    if (state.userLocation) {
      params.set('lat', String(state.userLocation.lat));
      params.set('lng', String(state.userLocation.lng));
      if (radiusKm) {
        params.set('radius_km', radiusKm);
      }
    }

    const qs = params.toString() ? `?${params.toString()}` : '';
    const data = await window.PharmaAPI.request(`/api/pharmacies${qs}`);
    const pharmacies = Array.isArray(data.pharmacies) ? data.pharmacies : [];
    state.pharmacies = pharmacies;

    if (!comune && !type && !state.userLocation) {
      const kpiPharmacies = document.getElementById('kpi-pharmacies-count');
      if (kpiPharmacies) {
        kpiPharmacies.textContent = String(pharmacies.length);
      }
    }

    renderPharmacyList(pharmacies);
    renderPharmacyMarkers(pharmacies, radiusKm ? Number(radiusKm) : null);
    return pharmacies;
  }

  function renderPharmacyList(pharmacies) {
    const container = document.getElementById('pharmacy-list-container');
    const badge = document.getElementById('pharmacy-results-badge');
    const title = document.getElementById('pharmacy-list-title');

    if (badge) {
      badge.textContent = `${pharmacies.length} presidi`;
    }
    if (title) {
      title.textContent = state.userLocation
        ? 'Presidi più vicini alla posizione'
        : 'Presidi sul territorio pugliese';
    }
    if (!container) return;

    if (pharmacies.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          Nessuna farmacia o parafarmacia trovata con i filtri attuali. Prova ad ampliare il raggio in km o a selezionare "Tutti i Comuni".
        </div>
      `;
      return;
    }

    container.innerHTML = pharmacies
      .map((p) => {
        const isParafarmacia = p.type === 'parafarmacia';
        const distanceHtml =
          typeof p.distance_km === 'number'
            ? `<span class="badge badge-primary">${p.distance_km.toFixed(2)} km</span>`
            : '';
        const directionsUrl = buildDirectionsUrl(p);

        return `
          <article class="pharmacy-item" data-pharmacy-card-id="${p.id}">
            <div class="pharmacy-item-top">
              <div>
                <h3 class="pharmacy-item-title">${escapeHtml(p.name)}</h3>
                <p class="pharmacy-item-address">
                  ${escapeHtml(p.address)} · ${escapeHtml(p.cap || '')} ${escapeHtml(p.comune)} (${escapeHtml(p.provincia)})
                </p>
              </div>
              <div class="pharmacy-item-badges">
                ${distanceHtml}
                <span class="badge ${isParafarmacia ? 'badge-accent' : 'badge-success'}">
                  ${isParafarmacia ? 'Parafarmacia' : 'Farmacia'}
                </span>
              </div>
            </div>

            <div class="pharmacy-item-district">
              <strong>${escapeHtml(p.asl_name || 'ASL Puglia')}</strong> ·
              ${escapeHtml(p.district_name || 'Distretto territoriale')}
              ${p.ministry_code ? ` · Cod. Min. <code>${escapeHtml(p.ministry_code)}</code>` : ''}
            </div>

            <div class="pharmacy-item-actions">
              <button
                type="button"
                class="btn btn-sm btn-primary"
                data-focus-pharmacy-id="${p.id}"
              >
                Mostra su mappa
              </button>
              <a
                class="btn btn-sm"
                href="${escapeHtml(directionsUrl)}"
                target="_blank"
                rel="noopener noreferrer"
              >
                Indicazioni stradali ↗
              </a>
            </div>
          </article>
        `;
      })
      .join('');

    container.querySelectorAll('[data-focus-pharmacy-id]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = Number(btn.getAttribute('data-focus-pharmacy-id'));
        focusPharmacyOnMap(id);
      });
    });
  }

  function renderPharmacyMarkers(pharmacies, radiusKm) {
    if (!state.map || !state.markersLayer || !state.userLayer || typeof window.L === 'undefined') {
      return;
    }

    state.markersLayer.clearLayers();
    state.userLayer.clearLayers();
    state.markersById.clear();

    const boundsPoints = [];

    if (state.userLocation) {
      const { lat, lng, label } = state.userLocation;
      const userMarker = window.L.marker([lat, lng], {
        icon: createUserIcon()
      }).bindPopup(`
        <div class="popup-title">Posizione selezionata</div>
        <div class="popup-meta">${escapeHtml(label)}</div>
      `);
      state.userLayer.addLayer(userMarker);
      boundsPoints.push([lat, lng]);

      if (radiusKm && radiusKm > 0) {
        const circle = window.L.circle([lat, lng], {
          radius: radiusKm * 1000,
          color: '#0f766e',
          fillColor: '#ccfbf1',
          fillOpacity: 0.2,
          weight: 2
        });
        state.userLayer.addLayer(circle);
      }
    }

    pharmacies.forEach((p) => {
      if (typeof p.lat !== 'number' || typeof p.lng !== 'number') return;

      const directionsUrl = buildDirectionsUrl(p);
      const distanceText =
        typeof p.distance_km === 'number' ? `<br/><strong>Distanza:</strong> ${p.distance_km.toFixed(2)} km` : '';

      const marker = window.L.circleMarker([p.lat, p.lng], {
        radius: 6,
        color: '#ffffff',
        weight: 1,
        fillColor: p.type === 'parafarmacia' ? '#1d4ed8' : '#0f766e',
        fillOpacity: 0.9
      }).bindPopup(`
        <div class="popup-title">${escapeHtml(p.name)}</div>
        <div class="popup-meta">
          ${escapeHtml(p.address)} — ${escapeHtml(p.comune)} (${escapeHtml(p.provincia)})<br/>
          <strong>${escapeHtml(p.asl_name || 'ASL Puglia')}</strong> · ${escapeHtml(p.district_name || '')}
          ${distanceText}
        </div>
        <div class="popup-actions">
          <a class="btn btn-sm btn-primary" href="${escapeHtml(directionsUrl)}" target="_blank" rel="noopener noreferrer">
            Indicazioni stradali ↗
          </a>
        </div>
      `);

      marker.on('click', () => {
        highlightPharmacyCard(p.id);
      });

      state.markersLayer.addLayer(marker);
      state.markersById.set(p.id, { marker, pharmacy: p });
      boundsPoints.push([p.lat, p.lng]);
    });

    if (boundsPoints.length === 1) {
      state.map.setView(boundsPoints[0], 14);
    } else if (boundsPoints.length > 1) {
      state.map.fitBounds(boundsPoints, { padding: [36, 36], maxZoom: 14 });
    } else {
      state.map.setView(PUGLIA_CENTER, PUGLIA_DEFAULT_ZOOM);
    }
  }

  function highlightPharmacyCard(pharmacyId) {
    document.querySelectorAll('.pharmacy-item').forEach((card) => {
      const isTarget = Number(card.getAttribute('data-pharmacy-card-id')) === pharmacyId;
      card.classList.toggle('is-selected', isTarget);
      if (isTarget) {
        card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    });
  }

  function focusPharmacyOnMap(pharmacyId) {
    const entry = state.markersById.get(pharmacyId);
    if (!entry || !state.map) return;

    highlightPharmacyCard(pharmacyId);
    state.map.setView([entry.pharmacy.lat, entry.pharmacy.lng], 15, { animate: true });
    entry.marker.openPopup();
  }

  function updateGeocodeStatusBar() {
    const bar = document.getElementById('geocode-status-bar');
    if (!bar) return;

    if (!state.userLocation) {
      bar.classList.add('is-hidden');
      bar.innerHTML = '';
      return;
    }

    bar.classList.remove('is-hidden');
    bar.innerHTML = `
      <span>
        Punto di riferimento attivo: <strong>${escapeHtml(state.userLocation.label)}</strong>
        (${state.userLocation.lat.toFixed(4)}, ${state.userLocation.lng.toFixed(4)})
      </span>
      <button type="button" class="btn btn-sm" id="clear-user-location-btn">Rimuovi posizione</button>
    `;

    const clearBtn = bar.querySelector('#clear-user-location-btn');
    if (clearBtn) {
      clearBtn.addEventListener('click', async () => {
        state.userLocation = null;
        const geocodeInput = document.getElementById('geocode-address-input');
        if (geocodeInput) geocodeInput.value = '';
        updateGeocodeStatusBar();
        await loadPharmacies();
      });
    }
  }

  async function handleGeocodeSearch(addressQuery) {
    if (!addressQuery) {
      window.PharmaAPI.showFeedback('Inserisci un indirizzo o un Comune pugliese da geocodificare.', 'error');
      return;
    }

    try {
      window.PharmaAPI.hideFeedback();
      const result = await window.PharmaAPI.request(
        `/api/geocode?q=${encodeURIComponent(addressQuery)}`
      );
      state.userLocation = {
        lat: Number(result.lat),
        lng: Number(result.lng),
        label: result.display_name || addressQuery
      };
      updateGeocodeStatusBar();
      await loadPharmacies();
    } catch (err) {
      window.PharmaAPI.showFeedback(err.message || 'Impossibile geocodificare l’indirizzo inserito.', 'error');
    }
  }

  function handleBrowserGeolocation() {
    if (!navigator.geolocation) {
      window.PharmaAPI.showFeedback('La geolocalizzazione GPS non è supportata da questo browser.', 'error');
      return;
    }

    window.PharmaAPI.hideFeedback();
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        state.userLocation = {
          lat: Number(pos.coords.latitude),
          lng: Number(pos.coords.longitude),
          label: 'Posizione GPS rilevata dal dispositivo'
        };
        updateGeocodeStatusBar();
        await loadPharmacies();
      },
      () => {
        window.PharmaAPI.showFeedback(
          'Permesso GPS negato o posizione non disponibile. Puoi inserire manualmente un indirizzo o Comune nella barra Nominatim.',
          'error'
        );
      },
      { enableHighAccuracy: true, timeout: 6000 }
    );
  }

  // --- 5. Binding Eventi DOM ---
  function bindEvents() {
    // Form Inquadramento Comune -> ASL
    const districtForm = document.getElementById('district-search-form');
    const districtSelect = document.getElementById('district-comune-select');
    if (districtForm && districtSelect) {
      districtForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await selectComuneAndSync(districtSelect.value, true);
      });
      districtSelect.addEventListener('change', async () => {
        await selectComuneAndSync(districtSelect.value, true);
      });
    }

    // Chip rapidi Comuni
    document.querySelectorAll('[data-quick-comune]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const comune = btn.getAttribute('data-quick-comune') || '';
        await selectComuneAndSync(comune, true);
      });
    });

    // Form Ricerca Farmaci AIFA
    const medicineForm = document.getElementById('medicine-search-form');
    const medicineInput = document.getElementById('medicine-query-input');
    const genericFilter = document.getElementById('medicine-generic-filter');
    const prescriptionFilter = document.getElementById('medicine-prescription-filter');
    const medicineResetBtn = document.getElementById('medicine-reset-btn');

    let debounceTimer = null;
    if (medicineForm) {
      medicineForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await loadMedicines();
      });
    }
    if (medicineInput) {
      medicineInput.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          loadMedicines();
        }, 240);
      });
    }
    if (genericFilter) {
      genericFilter.addEventListener('change', () => loadMedicines());
    }
    if (prescriptionFilter) {
      prescriptionFilter.addEventListener('change', () => loadMedicines());
    }
    if (medicineResetBtn) {
      medicineResetBtn.addEventListener('click', async () => {
        if (medicineInput) medicineInput.value = '';
        if (genericFilter) genericFilter.value = '';
        if (prescriptionFilter) prescriptionFilter.value = '';
        await loadMedicines();
      });
    }

    // Chip rapidi Farmaci
    document.querySelectorAll('[data-quick-medicine]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const medQuery = btn.getAttribute('data-quick-medicine') || '';
        if (medicineInput) {
          medicineInput.value = medQuery;
        }
        await loadMedicines();
      });
    });

    // Controlli Mappa & Geocoding Nominatim
    const mapFilterForm = document.getElementById('map-filter-form');
    const geocodeInput = document.getElementById('geocode-address-input');
    const useGpsBtn = document.getElementById('use-gps-btn');
    const pharmacyComuneFilter = document.getElementById('pharmacy-comune-filter');
    const pharmacyTypeFilter = document.getElementById('pharmacy-type-filter');
    const pharmacyRadiusFilter = document.getElementById('pharmacy-radius-filter');
    const mapResetBtn = document.getElementById('map-reset-btn');

    if (mapFilterForm) {
      mapFilterForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const q = geocodeInput ? geocodeInput.value.trim() : '';
        if (q) {
          await handleGeocodeSearch(q);
        } else {
          await loadPharmacies();
        }
      });
    }

    if (useGpsBtn) {
      useGpsBtn.addEventListener('click', handleBrowserGeolocation);
    }

    if (pharmacyComuneFilter) {
      pharmacyComuneFilter.addEventListener('change', async () => {
        const selected = pharmacyComuneFilter.value;
        state.selectedComune = selected;
        if (districtSelect) districtSelect.value = selected;
        await Promise.all([loadDistricts(selected), loadPharmacies()]);
      });
    }

    if (pharmacyTypeFilter) {
      pharmacyTypeFilter.addEventListener('change', () => loadPharmacies());
    }

    if (pharmacyRadiusFilter) {
      pharmacyRadiusFilter.addEventListener('change', () => loadPharmacies());
    }

    if (mapResetBtn) {
      mapResetBtn.addEventListener('click', async () => {
        state.userLocation = null;
        state.selectedComune = '';
        state.activeMedicineContext = null;

        if (geocodeInput) geocodeInput.value = '';
        if (pharmacyComuneFilter) pharmacyComuneFilter.value = '';
        if (pharmacyTypeFilter) pharmacyTypeFilter.value = '';
        if (pharmacyRadiusFilter) pharmacyRadiusFilter.value = '';
        if (districtSelect) districtSelect.value = '';

        const contextEl = document.getElementById('active-medicine-context');
        if (contextEl) contextEl.classList.add('is-hidden');

        updateGeocodeStatusBar();
        await Promise.all([loadDistricts(''), loadPharmacies()]);
      });
    }
  }

  async function initSearchAndMapModule() {
    initLeafletMap();
    bindEvents();

    try {
      await Promise.all([loadDistricts(''), loadMedicines(), loadPharmacies()]);
    } catch (err) {
      window.PharmaAPI.showFeedback(
        err.message || 'Errore durante il caricamento iniziale dei dati sanitari.',
        'error'
      );
    }
  }

  document.addEventListener('DOMContentLoaded', initSearchAndMapModule);
})();
