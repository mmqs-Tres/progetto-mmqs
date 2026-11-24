// public/js/admin.js
// Dashboard Amministratore: Ingestione Dataset (CSV/JSON) e Moderazione Segnalazioni
//
// Regole di sicurezza: i testi degli utenti passano solo da textContent, mai da innerHTML.
// L'accesso avviene nel tab Segnalazioni: qui si ascolta solo l'evento 'pharma:auth'.

(() => {
  const adminTab = document.getElementById('tab-admin');
  if (!adminTab) return;

  let activeUser = null;

  function el(tag, props = {}, ...children) {
    const { attrs = {}, ...rest } = props;
    const node = Object.assign(document.createElement(tag), rest);
    Object.entries(attrs).forEach(([name, value]) => node.setAttribute(name, value));
    node.append(...children.filter((child) => child !== null && child !== undefined));
    return node;
  }

  // SQLite salva in UTC senza indicarlo: senza la Z il browser leggerebbe un'ora locale.
  function formatDate(value) {
    const date = new Date(`${String(value || '').replace(' ', 'T')}Z`);
    return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString('it-IT');
  }

  /**
   * Render principale della dashboard admin
   */
  function renderDashboard() {
    const user = activeUser;
    adminTab.replaceChildren();

    // Il tab è già nascosto da reports-auth.js; i permessi li verifica comunque il server.
    if (!user || user.role !== 'admin') {
      adminTab.append(
        el('div', { className: 'card' }, el('h1', { textContent: 'Accesso riservato agli amministratori' }))
      );
      return;
    }

    // Utente loggato come Admin
    const headerRow = el('div', {
      className: 'section-head'
    });
    const headerLeft = el('div');
    const headerTitle = el('h1', { textContent: 'Pannello Amministrazione' });
    const headerDesc = el('p', {
      className: 'text-muted small-meta',
      textContent: 'Gestione dataset sanitari e moderazione segnalazioni Regione Puglia'
    });
    headerLeft.append(headerTitle, headerDesc);

    headerRow.append(headerLeft);

    // SEZIONE 1: Ingestione Dataset
    const uploadCard = el('div', { className: 'card' });
    const uploadTitle = el('h2', { textContent: '1. Ingestione Dataset Ufficiali (CSV / JSON)', className: 'section-subtitle' });
    const uploadDesc = el('p', {
      className: 'text-muted section-desc',
      textContent: 'Carica o aggiorna i dataset territoriali regionali e ministeriali. I record esistenti vengono aggiornati, i nuovi inseriti.'
    });

    const uploadForm = el('form', {
      id: 'admin-upload-form',
      className: 'upload-grid'
    });

    const selGroup = el('div', { className: 'form-group' });
    const selLabel = el('label', { htmlFor: 'upload-dataset-select', textContent: 'Tipologia Dataset', className: 'form-label' });
    const datasetSelect = el('select', {
      id: 'upload-dataset-select',
      required: true,
      className: 'form-control'
    });
    datasetSelect.append(
      el('option', { value: 'pharmacies', textContent: 'Presidi Sanitari (Farmacie e Parafarmacie)' }),
      el('option', { value: 'medicines', textContent: 'Prontuario Medicinali ed Equivalenti (AIFA)' }),
      el('option', { value: 'districts', textContent: 'Distretti Socio-Sanitari e ASL Puglia' })
    );
    selGroup.append(selLabel, datasetSelect);

    const fileGroup = el('div', { className: 'form-group' });
    const fileLabel = el('label', { htmlFor: 'upload-file-input', textContent: 'File Sorgente (.csv o .json)', className: 'form-label' });
    const fileInput = el('input', {
      id: 'upload-file-input',
      type: 'file',
      accept: '.csv,.json',
      required: true,
      className: 'form-control'
    });
    fileGroup.append(fileLabel, fileInput);

    const btnGroup = el('div');
    const submitBtn = el('button', {
      id: 'upload-submit-btn',
      type: 'submit',
      className: 'btn btn-primary',
      textContent: 'Carica ed Elabora'
    });
    btnGroup.append(submitBtn);

    uploadForm.append(selGroup, fileGroup, btnGroup);

    const resultBox = el('div', {
      id: 'upload-result-box',
      className: 'notice-box is-hidden'
    });

    uploadForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!fileInput.files || fileInput.files.length === 0) {
        alert('Seleziona un file prima di procedere.');
        return;
      }

      const file = fileInput.files[0];
      const dataset = datasetSelect.value;
      const formData = new FormData();
      formData.append('file', file);

      submitBtn.disabled = true;
      submitBtn.textContent = 'Elaborazione in corso...';
      resultBox.classList.add('is-hidden');
      resultBox.replaceChildren();

      try {
        const token = window.PharmaAPI ? window.PharmaAPI.getToken() : localStorage.getItem('pharmapuglia_token');
        const res = await fetch(`/api/admin/upload/${dataset}`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Errore durante il caricamento del file.');
        }

        resultBox.dataset.type = 'success';

        const head = el('div', {
          textContent: `Dataset "${dataset}" elaborato con successo!`,
          className: 'notice-title'
        });

        const statsRow = el('div', {
          className: 'notice-stats'
        });
        statsRow.append(
          el('span', {}, 'Nuovi record inseriti: ', el('strong', { textContent: String(data.inserted) })),
          el('span', {}, 'Record aggiornati: ', el('strong', { textContent: String(data.updated) })),
          el('span', {}, 'Record scartati: ', el('strong', { textContent: String(data.skipped) })),
          el('span', {}, 'Totale esaminati: ', el('strong', { textContent: String(data.total) }))
        );

        resultBox.append(head, statsRow);
        resultBox.classList.remove('is-hidden');
        fileInput.value = '';
      } catch (err) {
        resultBox.dataset.type = 'error';
        const errHead = el('div', { textContent: 'Errore durante l\'elaborazione', className: 'notice-title' });
        const errMsg = el('div', { textContent: err.message });
        resultBox.append(errHead, errMsg);
        resultBox.classList.remove('is-hidden');
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Carica ed Elabora';
      }
    });

    uploadCard.append(uploadTitle, uploadDesc, uploadForm, resultBox);

    // SEZIONE 2: Moderazione Segnalazioni
    const reportsCard = el('div', { className: 'card' });
    const reportsHead = el('div', {
      className: 'section-head'
    });
    const reportsHeadLeft = el('div');
    const reportsTitle = el('h2', { textContent: '2. Moderazione Segnalazioni Cittadine', className: 'section-subtitle' });
    const reportsDesc = el('p', {
      className: 'text-muted small-meta',
      textContent: 'Revisiona le segnalazioni degli utenti su turni, disponibilità ed eventuali disservizi.'
    });
    reportsHeadLeft.append(reportsTitle, reportsDesc);

    const reportsHeadRight = el('div', { className: 'filter-inline' });
    const filterLabel = el('label', { htmlFor: 'reports-filter-status', textContent: 'Filtra per stato:', className: 'form-label' });
    const filterSelect = el('select', {
      id: 'reports-filter-status',
      className: 'form-control'
    });
    filterSelect.append(
      el('option', { value: '', textContent: 'Tutte le segnalazioni' }),
      el('option', { value: 'pending', textContent: 'In attesa (Pending)', selected: true }),
      el('option', { value: 'approved', textContent: 'Approvate' }),
      el('option', { value: 'rejected', textContent: 'Rifiutate' })
    );
    const refreshBtn = el('button', {
      type: 'button',
      className: 'btn btn-sm',
      textContent: 'Aggiorna'
    });
    reportsHeadRight.append(filterLabel, filterSelect, refreshBtn);
    reportsHead.append(reportsHeadLeft, reportsHeadRight);

    const reportsContainer = el('div', { id: 'reports-container', className: 'table-scroll' });
    reportsCard.append(reportsHead, reportsContainer);

    adminTab.append(headerRow, uploadCard, reportsCard);

    filterSelect.addEventListener('change', () => loadReports(filterSelect.value));
    refreshBtn.addEventListener('click', () => loadReports(filterSelect.value));

    loadReports('pending');
  }

  /**
   * Recupera e renderizza le segnalazioni
   */
  async function loadReports(status = '') {
    const container = document.getElementById('reports-container');
    if (!container) return;

    container.replaceChildren(el('p', { className: 'text-muted', textContent: 'Caricamento segnalazioni in corso...' }));

    try {
      const url = status ? `/api/admin/reports?status=${encodeURIComponent(status)}` : '/api/admin/reports';
      const data = await window.PharmaAPI.request(url);
      const reports = Array.isArray(data) ? data : (data.reports || []);

      if (reports.length === 0) {
        const emptyBox = el('div', {
          className: 'empty-state'
        });
        emptyBox.textContent = 'Nessuna segnalazione trovata con lo stato selezionato.';
        container.replaceChildren(emptyBox);
        return;
      }

      const table = el('table', { className: 'data-table' });
      const thead = el('thead');
      const headerTr = el('tr');
      headerTr.append(
        el('th', { textContent: 'Data', attrs: { scope: 'col' } }),
        el('th', { textContent: 'Cittadino', attrs: { scope: 'col' } }),
        el('th', { textContent: 'Presidio Sanitario', attrs: { scope: 'col' } }),
        el('th', { textContent: 'Categoria / Farmaco', attrs: { scope: 'col' } }),
        el('th', { textContent: 'Messaggio', attrs: { scope: 'col' } }),
        el('th', { textContent: 'Stato', className: 'cell-center', attrs: { scope: 'col' } }),
        el('th', { textContent: 'Azioni Moderatore', className: 'cell-end', attrs: { scope: 'col' } })
      );
      thead.append(headerTr);

      const tbody = el('tbody');
      for (const rep of reports) {
        const dateFormatted = formatDate(rep.created_at);
        let badgeClass = 'badge-neutral';
        let badgeLabel = rep.status;

        if (rep.status === 'approved') {
          badgeClass = 'badge-success';
          badgeLabel = 'Approvata';
        } else if (rep.status === 'pending') {
          badgeClass = 'badge-warning';
          badgeLabel = 'In Attesa';
        } else if (rep.status === 'rejected') {
          badgeClass = 'badge-danger';
          badgeLabel = 'Rifiutata';
        }

        const tr = el('tr');

        // Data
        const tdDate = el('td', { textContent: dateFormatted, className: 'cell-nowrap' });

        // Utente (DOM textContent per sicurezza)
        const tdUser = el('td');
        const userName = el('strong', { textContent: rep.user_name || 'Cittadino' });
        const userEmail = el('small', { textContent: rep.user_email || '', className: 'text-muted cell-sub' });
        tdUser.append(userName, userEmail);

        // Presidio (DOM textContent)
        const tdPharm = el('td');
        const pharmName = el('strong', { textContent: rep.pharmacy_name || 'Presidio non specificato' });
        tdPharm.append(pharmName);
        if (rep.pharmacy_comune) {
          const pharmComune = el('small', { textContent: rep.pharmacy_comune, className: 'text-muted cell-sub' });
          tdPharm.append(pharmComune);
        }

        // Categoria / Farmaco (DOM textContent)
        const tdCategory = el('td');
        const catBadge = el('span', { className: 'badge badge-neutral badge-capitalize', textContent: rep.category });
        tdCategory.append(catBadge);
        if (rep.medicine_name) {
          const medName = el('small', { textContent: rep.medicine_name, className: 'cell-sub' });
          tdCategory.append(medName);
        }

        // Messaggio utente (DOM textContent - NO XSS)
        const tdMsg = el('td', { textContent: rep.message || '', className: 'cell-message' });

        // Stato
        const tdStatus = el('td', { className: 'cell-center' });
        const stBadge = el('span', { className: `badge ${badgeClass}`, textContent: badgeLabel });
        tdStatus.append(stBadge);

        // Azioni
        const tdActions = el('td', { className: 'cell-end' });
        const actionsGroup = el('div', { className: 'row-actions' });

        const approveBtn = el('button', {
          type: 'button',
          className: 'btn btn-sm btn-success',
          textContent: 'Approva'
        });
        if (rep.status === 'approved') {
          approveBtn.disabled = true;
        } else {
          approveBtn.addEventListener('click', () => updateReportStatus(rep.id, 'approved'));
        }

        const rejectBtn = el('button', {
          type: 'button',
          className: 'btn btn-sm btn-danger',
          textContent: 'Rifiuta'
        });
        if (rep.status === 'rejected') {
          rejectBtn.disabled = true;
        } else {
          rejectBtn.addEventListener('click', () => updateReportStatus(rep.id, 'rejected'));
        }

        actionsGroup.append(approveBtn, rejectBtn);
        tdActions.append(actionsGroup);

        tr.append(tdDate, tdUser, tdPharm, tdCategory, tdMsg, tdStatus, tdActions);
        tbody.append(tr);
      }

      table.append(thead, tbody);
      container.replaceChildren(table);
    } catch (err) {
      const errBox = el('div', {
        className: 'feedback-banner',
        textContent: `Errore durante il caricamento delle segnalazioni: ${err.message}`,
        attrs: { 'data-type': 'error' }
      });
      container.replaceChildren(errBox);
    }
  }

  /**
   * Modifica lo stato di una segnalazione
   */
  async function updateReportStatus(reportId, newStatus) {
    try {
      await window.PharmaAPI.request(`/api/admin/reports/${reportId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus })
      });

      if (window.PharmaAPI.showFeedback) {
        window.PharmaAPI.showFeedback(`Segnalazione #${reportId} impostata su "${newStatus}".`, 'success');
        setTimeout(() => window.PharmaAPI.hideFeedback(), 3000);
      }

      const filterSelect = document.getElementById('reports-filter-status');
      const currentFilter = filterSelect ? filterSelect.value : '';
      loadReports(currentFilter);
    } catch (err) {
      alert(`Errore nell'aggiornamento dello stato: ${err.message}`);
    }
  }

  // Ascolta l'evento condiviso di cambio autenticazione da reports-auth.js
  document.addEventListener('pharma:auth', (e) => {
    activeUser = e.detail ? e.detail.user : null;
    renderDashboard();
  });

  const navTabAdmin = document.getElementById('nav-tab-admin');
  if (navTabAdmin) {
    navTabAdmin.addEventListener('click', renderDashboard);
  }

  // Espone metodi utili globalmente
  window.AdminPanel = {
    renderDashboard,
    loadReports
  };
})();
