// public/js/admin.js
// Dashboard Amministratore: Ingestione Dataset (CSV/JSON) e Moderazione Segnalazioni
// Sviluppato per il branch feat/data-ingestion-admin (PR #2)
//
// Regole di sicurezza: i testi degli utenti passano solo da textContent, mai da innerHTML.
// Ascolta l'evento 'pharma:auth' per aggiornamenti di sessione in tempo reale.

(() => {
  const adminTab = document.getElementById('tab-admin');
  const navTabAdmin = document.getElementById('nav-tab-admin');
  if (!adminTab) return;

  let activeUser = null;

  function el(tag, props = {}, ...children) {
    const { attrs = {}, ...rest } = props;
    const node = Object.assign(document.createElement(tag), rest);
    Object.entries(attrs).forEach(([name, value]) => node.setAttribute(name, value));
    node.append(...children.filter((child) => child !== null && child !== undefined));
    return node;
  }

  /**
   * Decodifica il payload JWT salvato in localStorage
   */
  function getCurrentUser() {
    if (activeUser) return activeUser;
    const token = window.PharmaAPI ? window.PharmaAPI.getToken() : localStorage.getItem('pharmapuglia_token');
    if (!token) return null;
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const jsonStr = decodeURIComponent(
        atob(base64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonStr);
    } catch {
      return null;
    }
  }

  /**
   * Controlla la visibilità del tab admin nella navbar
   */
  function updateAdminNavVisibility(user) {
    if (navTabAdmin) {
      if (user && user.role === 'admin') {
        navTabAdmin.classList.remove('is-hidden');
      } else {
        navTabAdmin.classList.add('is-hidden');
      }
    }
  }

  /**
   * Render principale della dashboard admin
   */
  function renderDashboard() {
    const user = getCurrentUser();
    updateAdminNavVisibility(user);
    adminTab.replaceChildren();

    if (!user || user.role !== 'admin') {
      const card = el('div', { className: 'card', style: 'max-width: 600px; margin-inline: auto;' });
      const title = el('h2', { textContent: 'Accesso Riservato Amministratori' });
      const desc = el('p', {
        className: 'text-muted',
        textContent: 'Questa sezione è riservata al personale autorizzato per la gestione dei dataset territoriali e la moderazione delle segnalazioni dei cittadini pugliesi.'
      });

      const credBox = el('div', {
        style: 'background: var(--bg-subtle); padding: 1rem; border-radius: var(--radius-sm); margin-bottom: 1.5rem;'
      });
      credBox.innerHTML = `
        <strong>Credenziali Amministratore di Prova:</strong><br />
        Email: <code>admin@pharmapuglia.test</code><br />
        Password: <code>Admin123!</code>
      `;

      const form = el('form', { id: 'admin-quick-login-form' });

      const emailField = el('div', { style: 'margin-bottom: 1rem;' });
      const emailLabel = el('label', { htmlFor: 'admin-login-email', textContent: 'Email', style: 'display: block; font-weight: 600; margin-bottom: 0.3rem;' });
      const emailInput = el('input', {
        id: 'admin-login-email',
        type: 'email',
        required: true,
        value: 'admin@pharmapuglia.test',
        style: 'width: 100%; padding: 0.6rem; border: 1px solid var(--border-color); border-radius: var(--radius-sm); font: inherit;'
      });
      emailField.append(emailLabel, emailInput);

      const passField = el('div', { style: 'margin-bottom: 1.25rem;' });
      const passLabel = el('label', { htmlFor: 'admin-login-password', textContent: 'Password', style: 'display: block; font-weight: 600; margin-bottom: 0.3rem;' });
      const passInput = el('input', {
        id: 'admin-login-password',
        type: 'password',
        required: true,
        value: 'Admin123!',
        style: 'width: 100%; padding: 0.6rem; border: 1px solid var(--border-color); border-radius: var(--radius-sm); font: inherit;'
      });
      passField.append(passLabel, passInput);

      const feedback = el('div', {
        id: 'admin-login-feedback',
        className: 'is-hidden',
        style: 'margin-bottom: 1rem; color: var(--danger); font-size: 0.9rem;'
      });

      const submitBtn = el('button', {
        type: 'submit',
        className: 'btn btn-primary',
        textContent: 'Accedi come Admin',
        style: 'width: 100%;'
      });

      form.append(emailField, passField, feedback, submitBtn);

      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        feedback.classList.add('is-hidden');
        feedback.textContent = '';

        try {
          const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: emailInput.value.trim(), password: passInput.value })
          });
          const data = await res.json();
          if (!res.ok) {
            throw new Error(data.error || 'Errore durante il login.');
          }
          if (data.token) {
            if (window.PharmaAPI) window.PharmaAPI.setToken(data.token);
            activeUser = data.user;
            document.dispatchEvent(new CustomEvent('pharma:auth', { detail: { user: data.user } }));
          }
        } catch (err) {
          feedback.textContent = err.message;
          feedback.classList.remove('is-hidden');
        }
      });

      card.append(title, desc, credBox, form);
      adminTab.append(card);
      return;
    }

    // Utente loggato come Admin
    const headerRow = el('div', {
      style: 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; flex-wrap: wrap; gap: 0.5rem;'
    });
    const headerLeft = el('div');
    const headerTitle = el('h1', { textContent: 'Pannello Amministrazione', style: 'margin-bottom: 0.2rem;' });
    const headerDesc = el('p', {
      className: 'text-muted',
      textContent: 'Gestione dataset sanitari e moderazione segnalazioni Regione Puglia',
      style: 'margin: 0;'
    });
    headerLeft.append(headerTitle, headerDesc);

    const headerRight = el('div', { style: 'display: flex; align-items: center; gap: 0.75rem;' });
    const adminBadge = el('span', {
      className: 'badge badge-success',
      textContent: `Admin: ${user.name || user.email}`
    });
    const logoutBtn = el('button', {
      type: 'button',
      className: 'btn',
      textContent: 'Esci',
      style: 'font-size: 0.85rem; padding: 0.35rem 0.75rem;'
    });
    logoutBtn.addEventListener('click', () => {
      if (window.PharmaAPI) window.PharmaAPI.clearToken();
      activeUser = null;
      document.dispatchEvent(new CustomEvent('pharma:auth', { detail: { user: null } }));
    });
    headerRight.append(adminBadge, logoutBtn);
    headerRow.append(headerLeft, headerRight);

    // SEZIONE 1: Ingestione Dataset
    const uploadCard = el('div', { className: 'card', style: 'margin-bottom: 1.5rem;' });
    const uploadTitle = el('h2', { textContent: '1. Ingestione Dataset Ufficiali (CSV / JSON)', style: 'font-size: 1.25rem; margin-bottom: 0.5rem;' });
    const uploadDesc = el('p', {
      className: 'text-muted',
      textContent: 'Carica o aggiorna i dataset territoriali regionali e ministeriali. I record esistenti vengono aggiornati, i nuovi inseriti.',
      style: 'font-size: 0.92rem; margin-bottom: 1.25rem;'
    });

    const uploadForm = el('form', {
      id: 'admin-upload-form',
      style: 'display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1rem; align-items: end;'
    });

    const selGroup = el('div');
    const selLabel = el('label', { htmlFor: 'upload-dataset-select', textContent: 'Tipologia Dataset', style: 'display: block; font-weight: 600; font-size: 0.9rem; margin-bottom: 0.35rem;' });
    const datasetSelect = el('select', {
      id: 'upload-dataset-select',
      required: true,
      style: 'width: 100%; padding: 0.6rem; border: 1px solid var(--border-color); border-radius: var(--radius-sm); font: inherit; background: var(--bg-surface);'
    });
    datasetSelect.append(
      el('option', { value: 'pharmacies', textContent: 'Presidi Sanitari (Farmacie e Parafarmacie)' }),
      el('option', { value: 'medicines', textContent: 'Prontuario Medicinali ed Equivalenti (AIFA)' }),
      el('option', { value: 'districts', textContent: 'Distretti Socio-Sanitari e ASL Puglia' })
    );
    selGroup.append(selLabel, datasetSelect);

    const fileGroup = el('div');
    const fileLabel = el('label', { htmlFor: 'upload-file-input', textContent: 'File Sorgente (.csv o .json)', style: 'display: block; font-weight: 600; font-size: 0.9rem; margin-bottom: 0.35rem;' });
    const fileInput = el('input', {
      id: 'upload-file-input',
      type: 'file',
      accept: '.csv,.json',
      required: true,
      style: 'width: 100%; padding: 0.45rem; border: 1px solid var(--border-color); border-radius: var(--radius-sm); font: inherit; background: var(--bg-surface);'
    });
    fileGroup.append(fileLabel, fileInput);

    const btnGroup = el('div');
    const submitBtn = el('button', {
      id: 'upload-submit-btn',
      type: 'submit',
      className: 'btn btn-primary',
      textContent: 'Carica ed Elabora',
      style: 'width: 100%; height: 42px;'
    });
    btnGroup.append(submitBtn);

    uploadForm.append(selGroup, fileGroup, btnGroup);

    const resultBox = el('div', {
      id: 'upload-result-box',
      className: 'is-hidden',
      style: 'margin-top: 1.25rem; padding: 1rem; border-radius: var(--radius-sm); border: 1px solid var(--border-color);'
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

        resultBox.style.background = 'var(--success-soft)';
        resultBox.style.borderColor = '#86efac';

        const head = el('div', {
          textContent: `Dataset "${dataset}" elaborato con successo!`,
          style: 'color: var(--success); font-weight: 700; margin-bottom: 0.4rem;'
        });

        const statsRow = el('div', {
          style: 'font-size: 0.9rem; color: var(--text-primary); display: flex; gap: 1.5rem; flex-wrap: wrap;'
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
        resultBox.style.background = 'var(--danger-soft)';
        resultBox.style.borderColor = '#fca5a5';
        const errHead = el('div', { textContent: 'Errore durante l\'elaborazione', style: 'color: var(--danger); font-weight: 700;' });
        const errMsg = el('div', { textContent: err.message, style: 'font-size: 0.9rem; color: var(--text-primary);' });
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
      style: 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; flex-wrap: wrap; gap: 0.75rem;'
    });
    const reportsHeadLeft = el('div');
    const reportsTitle = el('h2', { textContent: '2. Moderazione Segnalazioni Cittadine', style: 'font-size: 1.25rem; margin-bottom: 0.2rem;' });
    const reportsDesc = el('p', {
      className: 'text-muted',
      textContent: 'Revisiona le segnalazioni degli utenti su turni, disponibilità ed eventuali disservizi.',
      style: 'font-size: 0.92rem; margin: 0;'
    });
    reportsHeadLeft.append(reportsTitle, reportsDesc);

    const reportsHeadRight = el('div', { style: 'display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap;' });
    const filterLabel = el('label', { htmlFor: 'reports-filter-status', textContent: 'Filtra per stato:', style: 'font-weight: 600; font-size: 0.85rem;' });
    const filterSelect = el('select', {
      id: 'reports-filter-status',
      style: 'padding: 0.4rem 0.6rem; border: 1px solid var(--border-color); border-radius: var(--radius-sm); font: inherit;'
    });
    filterSelect.append(
      el('option', { value: '', textContent: 'Tutte le segnalazioni' }),
      el('option', { value: 'pending', textContent: 'In attesa (Pending)', selected: true }),
      el('option', { value: 'approved', textContent: 'Approvate' }),
      el('option', { value: 'rejected', textContent: 'Rifiutate' })
    );
    const refreshBtn = el('button', {
      type: 'button',
      className: 'btn',
      textContent: 'Aggiorna',
      style: 'padding: 0.4rem 0.8rem; font-size: 0.85rem;'
    });
    reportsHeadRight.append(filterLabel, filterSelect, refreshBtn);
    reportsHead.append(reportsHeadLeft, reportsHeadRight);

    const reportsContainer = el('div', { id: 'reports-container', style: 'overflow-x: auto;' });
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
          style: 'padding: 2rem; text-align: center; background: var(--bg-subtle); border-radius: var(--radius-sm);'
        });
        emptyBox.append(el('p', { className: 'text-muted', textContent: 'Nessuna segnalazione trovata con lo stato selezionato.', style: 'margin: 0;' }));
        container.replaceChildren(emptyBox);
        return;
      }

      const table = el('table', { style: 'width: 100%; border-collapse: collapse; text-align: left;' });
      const thead = el('thead');
      const headerTr = el('tr', { style: 'border-bottom: 2px solid var(--border-color); font-size: 0.85rem; color: var(--text-secondary);' });
      headerTr.append(
        el('th', { textContent: 'Data', style: 'padding: 0.5rem;' }),
        el('th', { textContent: 'Cittadino', style: 'padding: 0.5rem;' }),
        el('th', { textContent: 'Presidio Sanitario', style: 'padding: 0.5rem;' }),
        el('th', { textContent: 'Categoria / Farmaco', style: 'padding: 0.5rem;' }),
        el('th', { textContent: 'Messaggio', style: 'padding: 0.5rem;' }),
        el('th', { textContent: 'Stato', style: 'padding: 0.5rem; text-align: center;' }),
        el('th', { textContent: 'Azioni Moderatore', style: 'padding: 0.5rem; text-align: right;' })
      );
      thead.append(headerTr);

      const tbody = el('tbody');
      for (const rep of reports) {
        const dateFormatted = rep.created_at ? new Date(rep.created_at).toLocaleString('it-IT') : '-';
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

        const tr = el('tr', { style: 'border-bottom: 1px solid var(--border-color);' });

        // Data
        const tdDate = el('td', { textContent: dateFormatted, style: 'padding: 0.75rem 0.5rem; font-size: 0.85rem; white-space: nowrap;' });

        // Utente (DOM textContent per sicurezza)
        const tdUser = el('td', { style: 'padding: 0.75rem 0.5rem; font-size: 0.88rem;' });
        const userName = el('strong', { textContent: rep.user_name || 'Cittadino' });
        const userEmail = el('small', { textContent: rep.user_email || '', className: 'text-muted', style: 'display: block;' });
        tdUser.append(userName, userEmail);

        // Presidio (DOM textContent)
        const tdPharm = el('td', { style: 'padding: 0.75rem 0.5rem; font-size: 0.88rem;' });
        const pharmName = el('strong', { textContent: rep.pharmacy_name || 'Presidio non specificato' });
        tdPharm.append(pharmName);
        if (rep.pharmacy_comune) {
          const pharmComune = el('small', { textContent: rep.pharmacy_comune, className: 'text-muted', style: 'display: block;' });
          tdPharm.append(pharmComune);
        }

        // Categoria / Farmaco (DOM textContent)
        const tdCategory = el('td', { style: 'padding: 0.75rem 0.5rem; font-size: 0.88rem;' });
        const catBadge = el('span', { className: 'badge badge-neutral', textContent: rep.category, style: 'text-transform: capitalize;' });
        tdCategory.append(catBadge);
        if (rep.medicine_name) {
          const medName = el('small', { textContent: rep.medicine_name, style: 'display: block; font-weight: 600;' });
          tdCategory.append(medName);
        }

        // Messaggio utente (DOM textContent - NO XSS)
        const tdMsg = el('td', { textContent: rep.message || '', style: 'padding: 0.75rem 0.5rem; font-size: 0.88rem; max-width: 300px; word-break: break-word;' });

        // Stato
        const tdStatus = el('td', { style: 'padding: 0.75rem 0.5rem; text-align: center;' });
        const stBadge = el('span', { className: `badge ${badgeClass}`, textContent: badgeLabel });
        tdStatus.append(stBadge);

        // Azioni
        const tdActions = el('td', { style: 'padding: 0.75rem 0.5rem; text-align: right; white-space: nowrap;' });
        const actionsGroup = el('div', { style: 'display: flex; gap: 0.4rem; justify-content: flex-end;' });

        const approveBtn = el('button', {
          type: 'button',
          className: 'btn btn-action-approve',
          textContent: 'Approva',
          style: 'padding: 0.3rem 0.6rem; font-size: 0.8rem; background: var(--success); color: white; border: none;'
        });
        if (rep.status === 'approved') {
          approveBtn.disabled = true;
          approveBtn.style.opacity = '0.5';
          approveBtn.style.cursor = 'not-allowed';
        } else {
          approveBtn.addEventListener('click', () => updateReportStatus(rep.id, 'approved'));
        }

        const rejectBtn = el('button', {
          type: 'button',
          className: 'btn btn-action-reject',
          textContent: 'Rifiuta',
          style: 'padding: 0.3rem 0.6rem; font-size: 0.8rem; background: var(--danger); color: white; border: none;'
        });
        if (rep.status === 'rejected') {
          rejectBtn.disabled = true;
          rejectBtn.style.opacity = '0.5';
          rejectBtn.style.cursor = 'not-allowed';
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
        style: 'background: var(--danger-soft); color: var(--danger); border-color: #fca5a5;'
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

  // Inizializzazione al caricamento del DOM
  document.addEventListener('DOMContentLoaded', () => {
    renderDashboard();

    if (navTabAdmin) {
      navTabAdmin.addEventListener('click', renderDashboard);
    }
  });

  // Espone metodi utili globalmente
  window.AdminPanel = {
    renderDashboard,
    loadReports
  };
})();
