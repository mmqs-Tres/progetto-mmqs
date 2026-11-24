// public/js/admin.js
// Dashboard Amministratore: Ingestione Dataset (CSV/JSON) e Moderazione Segnalazioni
// Sviluppato per il branch feat/data-ingestion-admin (PR #2)

(() => {
  const adminTab = document.getElementById('tab-admin');
  const navTabAdmin = document.getElementById('nav-tab-admin');
  if (!adminTab) return;

  /**
   * Decodifica il payload JWT salvato in localStorage
   */
  function getCurrentUser() {
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
  function updateAdminNavVisibility() {
    const user = getCurrentUser();
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
    updateAdminNavVisibility();
    const user = getCurrentUser();

    if (!user || user.role !== 'admin') {
      adminTab.innerHTML = `
        <div class="card" style="max-width: 600px; margin-inline: auto;">
          <h2>Accesso Riservato Amministratori</h2>
          <p class="text-muted">
            Questa sezione è riservata al personale autorizzato per la gestione dei dataset territoriali 
            e la moderazione delle segnalazioni dei cittadini pugliesi.
          </p>
          <div style="background: var(--bg-subtle); padding: 1rem; border-radius: var(--radius-sm); margin-bottom: 1.5rem;">
            <strong>Credenziali Amministratore di Prova:</strong><br />
            Email: <code>admin@pharmapuglia.test</code><br />
            Password: <code>Admin123!</code>
          </div>
          <form id="admin-quick-login-form">
            <div style="margin-bottom: 1rem;">
              <label for="admin-login-email" style="display: block; font-weight: 600; margin-bottom: 0.3rem;">Email</label>
              <input type="email" id="admin-login-email" required value="admin@pharmapuglia.test" style="width: 100%; padding: 0.6rem; border: 1px solid var(--border-color); border-radius: var(--radius-sm); font: inherit;" />
            </div>
            <div style="margin-bottom: 1.25rem;">
              <label for="admin-login-password" style="display: block; font-weight: 600; margin-bottom: 0.3rem;">Password</label>
              <input type="password" id="admin-login-password" required value="Admin123!" style="width: 100%; padding: 0.6rem; border: 1px solid var(--border-color); border-radius: var(--radius-sm); font: inherit;" />
            </div>
            <div id="admin-login-feedback" class="is-hidden" style="margin-bottom: 1rem; color: var(--danger); font-size: 0.9rem;"></div>
            <button type="submit" class="btn btn-primary" style="width: 100%;">Accedi come Admin</button>
          </form>
        </div>
      `;

      const loginForm = document.getElementById('admin-quick-login-form');
      if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
          e.preventDefault();
          const email = document.getElementById('admin-login-email').value.trim();
          const password = document.getElementById('admin-login-password').value;
          const fb = document.getElementById('admin-login-feedback');
          fb.classList.add('is-hidden');

          try {
            const res = await fetch('/api/auth/login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email, password })
            });
            const data = await res.json();
            if (!res.ok) {
              throw new Error(data.error || 'Errore durante il login.');
            }
            if (data.token) {
              window.PharmaAPI.setToken(data.token);
              const userBadge = document.getElementById('user-status-badge');
              if (userBadge) {
                userBadge.textContent = `${data.user.name} (${data.user.role})`;
                userBadge.className = 'badge badge-success';
              }
              renderDashboard();
              loadReports();
            }
          } catch (err) {
            fb.textContent = err.message;
            fb.classList.remove('is-hidden');
          }
        });
      }
      return;
    }

    // Utente loggato come Admin
    adminTab.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; flex-wrap: wrap; gap: 0.5rem;">
        <div>
          <h1 style="margin-bottom: 0.2rem;">Pannello Amministrazione</h1>
          <p class="text-muted" style="margin: 0;">Gestione dataset sanitari e moderazione segnalazioni Regione Puglia</p>
        </div>
        <div style="display: flex; align-items: center; gap: 0.75rem;">
          <span class="badge badge-success">Admin: ${user.name || user.email}</span>
          <button id="admin-logout-btn" class="btn" type="button" style="font-size: 0.85rem; padding: 0.35rem 0.75rem;">Esci</button>
        </div>
      </div>

      <!-- SEZIONE 1: Ingestione Dataset -->
      <div class="card" style="margin-bottom: 1.5rem;">
        <h2 style="font-size: 1.25rem; margin-bottom: 0.5rem;">1. Ingestione Dataset Ufficiali (CSV / JSON)</h2>
        <p class="text-muted" style="font-size: 0.92rem; margin-bottom: 1.25rem;">
          Carica o aggiorna i dataset territoriali regionali e ministeriali. I record esistenti vengono aggiornati, i nuovi inseriti.
        </p>

        <form id="admin-upload-form" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1rem; align-items: end;">
          <div>
            <label for="upload-dataset-select" style="display: block; font-weight: 600; font-size: 0.9rem; margin-bottom: 0.35rem;">
              Tipologia Dataset
            </label>
            <select id="upload-dataset-select" required style="width: 100%; padding: 0.6rem; border: 1px solid var(--border-color); border-radius: var(--radius-sm); font: inherit; background: var(--bg-surface);">
              <option value="pharmacies">Presidi Sanitari (Farmacie e Parafarmacie)</option>
              <option value="medicines">Prontuario Medicinali ed Equivalenti (AIFA)</option>
              <option value="districts">Distretti Socio-Sanitari e ASL Puglia</option>
            </select>
          </div>

          <div>
            <label for="upload-file-input" style="display: block; font-weight: 600; font-size: 0.9rem; margin-bottom: 0.35rem;">
              File Sorgente (.csv o .json)
            </label>
            <input type="file" id="upload-file-input" accept=".csv,.json" required style="width: 100%; padding: 0.45rem; border: 1px solid var(--border-color); border-radius: var(--radius-sm); font: inherit; background: var(--bg-surface);" />
          </div>

          <div>
            <button type="submit" id="upload-submit-btn" class="btn btn-primary" style="width: 100%; height: 42px;">
              Carica ed Elabora
            </button>
          </div>
        </form>

        <div id="upload-result-box" class="is-hidden" style="margin-top: 1.25rem; padding: 1rem; border-radius: var(--radius-sm); border: 1px solid var(--border-color);"></div>
      </div>

      <!-- SEZIONE 2: Moderazione Segnalazioni -->
      <div class="card">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; flex-wrap: wrap; gap: 0.75rem;">
          <div>
            <h2 style="font-size: 1.25rem; margin-bottom: 0.2rem;">2. Moderazione Segnalazioni Cittadine</h2>
            <p class="text-muted" style="font-size: 0.92rem; margin: 0;">Revisiona le segnalazioni degli utenti su turni, disponibilità ed eventuali disservizi.</p>
          </div>
          <div style="display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap;">
            <label for="reports-filter-status" style="font-weight: 600; font-size: 0.85rem;">Filtra per stato:</label>
            <select id="reports-filter-status" style="padding: 0.4rem 0.6rem; border: 1px solid var(--border-color); border-radius: var(--radius-sm); font: inherit;">
              <option value="">Tutte le segnalazioni</option>
              <option value="pending" selected>In attesa (Pending)</option>
              <option value="approved">Approvate</option>
              <option value="rejected">Rifiutate</option>
            </select>
            <button id="reports-refresh-btn" class="btn" type="button" style="padding: 0.4rem 0.8rem; font-size: 0.85rem;">Aggiorna</button>
          </div>
        </div>

        <div id="reports-container" style="overflow-x: auto;">
          <p class="text-muted">Caricamento segnalazioni in corso...</p>
        </div>
      </div>
    `;

    // Logout handler
    const logoutBtn = document.getElementById('admin-logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        window.PharmaAPI.clearToken();
        const userBadge = document.getElementById('user-status-badge');
        if (userBadge) {
          userBadge.textContent = 'Ospite';
          userBadge.className = 'badge badge-neutral';
        }
        renderDashboard();
      });
    }

    // Upload form handler
    const uploadForm = document.getElementById('admin-upload-form');
    if (uploadForm) {
      uploadForm.addEventListener('submit', handleUploadSubmit);
    }

    // Reports filter and refresh handlers
    const filterSelect = document.getElementById('reports-filter-status');
    if (filterSelect) {
      filterSelect.addEventListener('change', () => loadReports(filterSelect.value));
    }
    const refreshBtn = document.getElementById('reports-refresh-btn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => loadReports(filterSelect.value));
    }

    // Carica segnalazioni iniziali (filtro default 'pending')
    loadReports('pending');
  }

  /**
   * Gestione Invio Upload Dataset
   */
  async function handleUploadSubmit(e) {
    e.preventDefault();
    const datasetSelect = document.getElementById('upload-dataset-select');
    const fileInput = document.getElementById('upload-file-input');
    const submitBtn = document.getElementById('upload-submit-btn');
    const resultBox = document.getElementById('upload-result-box');

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

    try {
      const token = window.PharmaAPI.getToken();
      const res = await fetch(`/api/admin/upload/${dataset}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Errore durante il caricamento del file.');
      }

      resultBox.style.background = 'var(--success-soft)';
      resultBox.style.borderColor = '#86efac';
      resultBox.innerHTML = `
        <div style="color: var(--success); font-weight: 700; margin-bottom: 0.4rem;">
          Dataset "${dataset}" elaborato con successo!
        </div>
        <div style="font-size: 0.9rem; color: var(--text-primary); display: flex; gap: 1.5rem; flex-wrap: wrap;">
          <span>Nuovi record inseriti: <strong>${data.inserted}</strong></span>
          <span>Record aggiornati: <strong>${data.updated}</strong></span>
          <span>Record scartati: <strong>${data.skipped}</strong></span>
          <span>Totale esaminati: <strong>${data.total}</strong></span>
        </div>
      `;
      resultBox.classList.remove('is-hidden');
      fileInput.value = '';
    } catch (err) {
      resultBox.style.background = 'var(--danger-soft)';
      resultBox.style.borderColor = '#fca5a5';
      resultBox.innerHTML = `
        <div style="color: var(--danger); font-weight: 700;">Errore durante l'elaborazione</div>
        <div style="font-size: 0.9rem; color: var(--text-primary);">${err.message}</div>
      `;
      resultBox.classList.remove('is-hidden');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Carica ed Elabora';
    }
  }

  /**
   * Recupera e renderizza le segnalazioni
   */
  async function loadReports(status = '') {
    const container = document.getElementById('reports-container');
    if (!container) return;

    container.innerHTML = '<p class="text-muted">Caricamento segnalazioni in corso...</p>';

    try {
      const url = status ? `/api/admin/reports?status=${encodeURIComponent(status)}` : '/api/admin/reports';
      const data = await window.PharmaAPI.request(url);
      const reports = Array.isArray(data) ? data : (data.reports || []);

      if (reports.length === 0) {
        container.innerHTML = `
          <div style="padding: 2rem; text-align: center; background: var(--bg-subtle); border-radius: var(--radius-sm);">
            <p class="text-muted" style="margin: 0;">Nessuna segnalazione trovata con lo stato selezionato.</p>
          </div>
        `;
        return;
      }

      const rowsHtml = reports.map((rep) => {
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

        const isPending = rep.status === 'pending';

        return `
          <tr data-report-id="${rep.id}" style="border-bottom: 1px solid var(--border-color);">
            <td style="padding: 0.75rem 0.5rem; font-size: 0.85rem; white-space: nowrap;">${dateFormatted}</td>
            <td style="padding: 0.75rem 0.5rem; font-size: 0.88rem;">
              <strong>${escapeHtml(rep.user_name || 'Cittadino')}</strong><br />
              <small class="text-muted">${escapeHtml(rep.user_email || '')}</small>
            </td>
            <td style="padding: 0.75rem 0.5rem; font-size: 0.88rem;">
              <strong>${escapeHtml(rep.pharmacy_name || 'Presidio non specificato')}</strong>
              ${rep.pharmacy_comune ? `<br /><small class="text-muted">${escapeHtml(rep.pharmacy_comune)}</small>` : ''}
            </td>
            <td style="padding: 0.75rem 0.5rem; font-size: 0.88rem;">
              <span class="badge badge-neutral" style="text-transform: capitalize;">${escapeHtml(rep.category)}</span>
              ${rep.medicine_name ? `<br /><small style="font-weight: 600;">${escapeHtml(rep.medicine_name)}</small>` : ''}
            </td>
            <td style="padding: 0.75rem 0.5rem; font-size: 0.88rem; max-width: 300px;">
              ${escapeHtml(rep.message)}
            </td>
            <td style="padding: 0.75rem 0.5rem; text-align: center;">
              <span class="badge ${badgeClass}">${badgeLabel}</span>
            </td>
            <td style="padding: 0.75rem 0.5rem; text-align: right; white-space: nowrap;">
              <div style="display: flex; gap: 0.4rem; justify-content: flex-end;">
                <button 
                  type="button" 
                  class="btn btn-action-approve" 
                  data-id="${rep.id}" 
                  style="padding: 0.3rem 0.6rem; font-size: 0.8rem; background: var(--success); color: white; border: none;"
                  ${rep.status === 'approved' ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''}
                >
                  Approva
                </button>
                <button 
                  type="button" 
                  class="btn btn-action-reject" 
                  data-id="${rep.id}" 
                  style="padding: 0.3rem 0.6rem; font-size: 0.8rem; background: var(--danger); color: white; border: none;"
                  ${rep.status === 'rejected' ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''}
                >
                  Rifiuta
                </button>
              </div>
            </td>
          </tr>
        `;
      }).join('');

      container.innerHTML = `
        <table style="width: 100%; border-collapse: collapse; text-align: left;">
          <thead>
            <tr style="border-bottom: 2px solid var(--border-color); font-size: 0.85rem; color: var(--text-secondary);">
              <th style="padding: 0.5rem;">Data</th>
              <th style="padding: 0.5rem;">Cittadino</th>
              <th style="padding: 0.5rem;">Presidio Sanitario</th>
              <th style="padding: 0.5rem;">Categoria / Farmaco</th>
              <th style="padding: 0.5rem;">Messaggio</th>
              <th style="padding: 0.5rem; text-align: center;">Stato</th>
              <th style="padding: 0.5rem; text-align: right;">Azioni Moderatore</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      `;

      // Event listeners per pulsanti Approva e Rifiuta
      container.querySelectorAll('.btn-action-approve').forEach((btn) => {
        btn.addEventListener('click', () => updateReportStatus(btn.dataset.id, 'approved'));
      });
      container.querySelectorAll('.btn-action-reject').forEach((btn) => {
        btn.addEventListener('click', () => updateReportStatus(btn.dataset.id, 'rejected'));
      });
    } catch (err) {
      container.innerHTML = `
        <div style="padding: 1rem; color: var(--danger); background: var(--danger-soft); border-radius: var(--radius-sm);">
          Errore durante il caricamento delle segnalazioni: ${err.message}
        </div>
      `;
    }
  }

  /**
   * Modifica lo stato di una segnalazione
   */
  async function updateReportStatus(reportId, newStatus) {
    try {
      const res = await window.PharmaAPI.request(`/api/admin/reports/${reportId}/status`, {
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

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Inizializzazione al caricamento del DOM
  document.addEventListener('DOMContentLoaded', () => {
    renderDashboard();

    // Ascolta anche i click sui nav-tab per ri-renderizzare se necessario
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
