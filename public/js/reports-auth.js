// Modulo frontend: Autenticazione RBAC e CRUD segnalazioni utente.
//
// A ogni cambio di sessione emette su document l'evento 'pharma:auth'
// con detail = { user } (user è null per l'ospite).
//
// Sicurezza: i testi degli utenti passano solo da textContent, mai da innerHTML.
(() => {
  const CATEGORY_LABELS = {
    turno: 'Turno',
    disponibilita: 'Disponibilità farmaco',
    disservizio: 'Disservizio',
    altro: 'Altro'
  };
  const STATUS_BADGES = {
    pending: ['In attesa di moderazione', 'badge-warning'],
    approved: ['Pubblicata', 'badge-success'],
    rejected: ['Respinta', 'badge-danger']
  };
  const ROLE_LABELS = { cittadino: 'Cittadino', admin: 'Admin' };
  const EVENT_NAME = 'pharma:auth';

  let currentUser = null;
  let authMode = 'login';
  let editingReport = null;
  let lastLoadId = 0;
  const ui = {};

  // --- Utilità ---

  function el(tag, props = {}, ...children) {
    const { attrs = {}, ...rest } = props;
    const node = Object.assign(document.createElement(tag), rest);
    Object.entries(attrs).forEach(([name, value]) => node.setAttribute(name, value));
    node.append(...children.filter((child) => child !== null));
    return node;
  }

  function field(labelText, input, action = null) {
    input.classList.add('form-control');
    return el(
      'div',
      { className: 'form-group' },
      el('label', { className: 'form-label', htmlFor: input.id, textContent: labelText }),
      action ? el('div', { className: 'input-row' }, input, action) : input
    );
  }

  function button(text, className = 'btn', type = 'button') {
    return el('button', { type, className, textContent: text });
  }

  function categorySelect(id, emptyLabel) {
    const options = Object.entries(CATEGORY_LABELS).map(([value, text]) => el('option', { value, textContent: text }));
    if (emptyLabel) {
      options.unshift(el('option', { value: '', textContent: emptyLabel }));
    }
    return el('select', { id }, ...options);
  }

  // SQLite salva in UTC senza indicarlo: senza la Z il browser leggerebbe un'ora locale.
  function formatDate(value) {
    const date = new Date(`${String(value).replace(' ', 'T')}Z`);
    return Number.isNaN(date.getTime())
      ? ''
      : date.toLocaleString('it-IT', { dateStyle: 'medium', timeStyle: 'short' });
  }

  function notify(message, type = 'info') {
    PharmaAPI.showFeedback(message, type);
    document.getElementById('global-feedback')?.scrollIntoView({ block: 'center' });
  }

  // Esegue un'azione disattivando il pulsante, così un doppio clic non la ripete.
  async function run(trigger, action) {
    if (trigger.disabled) return;
    trigger.disabled = true;
    PharmaAPI.hideFeedback();
    try {
      await action();
    } catch (err) {
      console.error(err);
      // fetch segnala la rete assente con un TypeError dal testo in inglese.
      notify(
        err instanceof TypeError ? 'Operazione non riuscita: controlla la connessione e riprova.' : err.message,
        'error'
      );
      await checkSession();
    } finally {
      trigger.disabled = false;
    }
  }

  function onSubmit(form, submitButton, action) {
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      run(submitButton, action);
    });
  }

  // --- Sessione ---

  function setUser(user) {
    currentUser = user;
    editingReport = null;
    // La lista si svuota subito: dopo il logout non devono restare visibili le proprie segnalazioni.
    ui.list?.replaceChildren();
    renderUserBar();
    renderAdminTab();
    renderAccount();
    loadReports();
    document.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { user } }));
  }

  // Usa fetch diretto perché PharmaAPI.request non espone lo status:
  // il token va cancellato solo su 401, non se il server è irraggiungibile.
  async function checkSession() {
    const token = PharmaAPI.getToken();
    if (!token) {
      if (currentUser) setUser(null);
      return;
    }
    let user = null;
    try {
      const res = await fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } });
      if (PharmaAPI.getToken() !== token) return; // sessione cambiata durante l'attesa
      if (res.status === 401) {
        PharmaAPI.clearToken();
        setUser(null);
        notify('La sessione è scaduta: accedi di nuovo.', 'error');
        return;
      }
      if (!res.ok) return;
      user = (await res.json()).user;
    } catch {
      return;
    }
    if (PharmaAPI.getToken() !== token) return;
    if (!currentUser || currentUser.id !== user.id || currentUser.role !== user.role) {
      setUser(user);
    }
  }

  function logout() {
    PharmaAPI.clearToken();
    setUser(null);
    notify('Sei uscito dal tuo account.');
  }

  function openReportsTab() {
    document.querySelector('.nav-tab[data-tab="reports"]')?.click();
  }

  function renderAdminTab() {
    const tab = document.getElementById('nav-tab-admin');
    if (!tab) return;
    const isAdmin = currentUser?.role === 'admin';
    tab.classList.toggle('is-hidden', !isAdmin);
    if (!isAdmin && tab.classList.contains('is-active')) {
      openReportsTab();
    }
  }

  function renderUserBar() {
    const bar = document.getElementById('user-bar');
    if (!bar) return;
    const badge = document.getElementById('user-status-badge');
    if (badge) {
      badge.textContent = currentUser
        ? `${currentUser.name} · ${ROLE_LABELS[currentUser.role] || currentUser.role}`
        : 'Ospite';
    }
    ui.sessionButton?.remove();
    ui.sessionButton = button(currentUser ? 'Esci' : 'Accedi', 'btn btn-sm');
    ui.sessionButton.addEventListener('click', currentUser ? logout : () => {
      openReportsTab();
      document.getElementById('auth-email')?.focus();
    });
    bar.append(ui.sessionButton);
  }

  // --- Accesso e registrazione ---

  function renderAuthForm() {
    const isRegister = authMode === 'register';
    const name = el('input', { id: 'auth-name', type: 'text', required: true, maxLength: 100, autocomplete: 'name' });
    const email = el('input', { id: 'auth-email', type: 'email', required: true, maxLength: 254, autocomplete: 'email' });
    const password = el('input', {
      id: 'auth-password',
      type: 'password',
      required: true,
      autocomplete: isRegister ? 'new-password' : 'current-password'
    });
    if (isRegister) {
      password.minLength = 8;
      password.setAttribute('aria-describedby', 'auth-password-hint');
    }

    const submit = button(isRegister ? 'Crea account' : 'Accedi', 'btn btn-primary', 'submit');
    const toggle = button(isRegister ? 'Ho già un account' : 'Non ho un account');
    toggle.addEventListener('click', () => {
      authMode = isRegister ? 'login' : 'register';
      PharmaAPI.hideFeedback();
      renderAccount();
      document.getElementById(authMode === 'register' ? 'auth-name' : 'auth-email').focus();
    });

    const form = el(
      'form',
      { className: 'form-stack form-narrow' },
      isRegister ? field('Nome', name) : null,
      field('Email', email),
      field('Password', password),
      isRegister
        ? el('p', { id: 'auth-password-hint', className: 'text-muted small-meta', textContent: 'Almeno 8 caratteri.' })
        : null,
      el('div', { className: 'form-actions' }, submit, toggle)
    );
    onSubmit(form, submit, async () => {
      const body = { email: email.value, password: password.value };
      if (isRegister) body.name = name.value;
      const data = await PharmaAPI.request(`/api/auth/${isRegister ? 'register' : 'login'}`, {
        method: 'POST',
        body: JSON.stringify(body)
      });
      authMode = 'login';
      PharmaAPI.setToken(data.token);
      setUser(data.user);
      notify(`Accesso effettuato: ${data.user.name}.`, 'success');
    });

    ui.account.replaceChildren(
      el('h2', { textContent: isRegister ? 'Crea un account' : 'Accedi' }),
      el('p', { className: 'text-muted', textContent: 'Serve un account per inviare e gestire le tue segnalazioni.' }),
      form
    );
  }

  // --- Form segnalazione ---

  function createPharmacyPicker(report) {
    const comune = el('input', { id: 'report-comune', type: 'text', maxLength: 100, autocomplete: 'off' });
    const search = button('Cerca farmacie');
    const select = el('select', { id: 'report-pharmacy' });
    const status = el('p', { className: 'text-muted', attrs: { role: 'status', 'aria-live': 'polite' } });

    const addOption = (value, text) => select.append(el('option', { value: String(value), textContent: text }));
    addOption('', 'Nessuna farmacia specifica');
    if (report?.pharmacy_id) {
      addOption(report.pharmacy_id, `${report.pharmacy_name} (${report.pharmacy_comune})`);
      select.value = String(report.pharmacy_id);
    }

    async function searchPharmacies() {
      const query = comune.value.trim();
      if (!query) {
        status.textContent = 'Scrivi il comune in cui cercare.';
        return;
      }
      if (search.disabled) return;
      search.disabled = true;
      status.textContent = 'Ricerca in corso…';
      try {
        const data = await PharmaAPI.request(`/api/pharmacies?comune=${encodeURIComponent(query)}`);
        const pharmacies = Array.isArray(data) ? data : data.pharmacies || [];
        const selected = select.selectedOptions[0];
        select.replaceChildren();
        addOption('', 'Nessuna farmacia specifica');
        if (selected?.value && !pharmacies.some((item) => String(item.id) === selected.value)) {
          select.append(selected);
        }
        pharmacies.forEach((item) => addOption(item.id, `${item.name} — ${item.address} (${item.comune})`));
        select.value = selected?.value || '';
        status.textContent = pharmacies.length
          ? `Farmacie trovate: ${pharmacies.length}. Scegline una dall'elenco.`
          : 'Nessuna farmacia trovata in questo comune.';
      } catch {
        status.textContent = 'Elenco farmacie non disponibile: puoi inviare la segnalazione anche senza.';
      } finally {
        search.disabled = false;
      }
    }

    search.addEventListener('click', searchPharmacies);
    comune.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault(); // altrimenti invierebbe la segnalazione
        searchPharmacies();
      }
    });

    const node = el(
      'fieldset',
      { className: 'form-fieldset' },
      el('legend', { className: 'form-label', textContent: 'Farmacia (facoltativa)' }),
      field('Comune', comune, search),
      status,
      field('Farmacia', select)
    );
    return { node, getValue: () => (select.value ? Number(select.value) : null) };
  }

  function renderReportForm() {
    const report = editingReport;
    const category = categorySelect('report-category');
    category.value = report?.category || 'turno';
    const medicine = el('input', { id: 'report-medicine', type: 'text', maxLength: 200, value: report?.medicine_name || '' });
    const message = el('textarea', {
      id: 'report-message',
      required: true,
      maxLength: 1000,
      rows: 4,
      value: report?.message || '',
      attrs: { 'aria-describedby': 'report-message-hint' }
    });
    const pharmacy = createPharmacyPicker(report);
    const submit = button(report ? 'Salva modifiche' : 'Invia segnalazione', 'btn btn-primary', 'submit');
    const cancel = report ? button('Annulla') : null;
    cancel?.addEventListener('click', () => {
      editingReport = null;
      renderAccount();
    });

    const form = el(
      'form',
      { className: 'form-stack form-narrow' },
      field('Categoria', category),
      field('Farmaco (facoltativo)', medicine),
      pharmacy.node,
      field('Messaggio', message),
      el('p', {
        id: 'report-message-hint',
        className: 'text-muted small-meta',
        textContent: 'Non inserire dati personali o sanitari: il testo può diventare pubblico.'
      }),
      el('div', { className: 'form-actions' }, submit, cancel)
    );
    onSubmit(form, submit, async () => {
      const body = JSON.stringify({
        category: category.value,
        medicine_name: medicine.value,
        message: message.value,
        pharmacy_id: pharmacy.getValue()
      });
      const data = await PharmaAPI.request(report ? `/api/reports/${report.id}` : '/api/reports', {
        method: report ? 'PUT' : 'POST',
        body
      });
      editingReport = null;
      renderAccount();
      await loadReports();
      notify(
        data.report.status === 'pending'
          ? 'Segnalazione salvata: sarà pubblica dopo la moderazione.'
          : 'Segnalazione salvata.',
        'success'
      );
    });

    ui.account.replaceChildren(
      el('h2', { textContent: report ? 'Modifica segnalazione' : 'Nuova segnalazione' }),
      el('p', {
        className: 'text-muted',
        textContent: report && currentUser.role !== 'admin'
          ? 'Dopo la modifica la segnalazione torna in moderazione.'
          : 'Le segnalazioni diventano pubbliche dopo la moderazione.'
      }),
      form
    );
  }

  function renderAccount() {
    if (!ui.account) return;
    if (currentUser) {
      renderReportForm();
    } else {
      renderAuthForm();
    }
  }

  // --- Elenco segnalazioni ---

  function startEditing(report) {
    editingReport = report;
    renderAccount();
    ui.account.scrollIntoView({ block: 'center' });
    document.getElementById('report-message').focus({ preventScroll: true });
  }

  function deleteReport(report, trigger) {
    if (!window.confirm('Eliminare definitivamente questa segnalazione?')) return;
    run(trigger, async () => {
      await PharmaAPI.request(`/api/reports/${report.id}`, { method: 'DELETE' });
      if (editingReport?.id === report.id) {
        editingReport = null;
        renderAccount();
      }
      await loadReports();
      notify('Segnalazione eliminata.', 'success');
    });
  }

  function renderReport(report) {
    const badges = el(
      'div',
      { className: 'report-badges' },
      el('span', { className: 'badge badge-neutral', textContent: CATEGORY_LABELS[report.category] || report.category })
    );
    if (report.is_owner) {
      const [text, className] = STATUS_BADGES[report.status] || [report.status, 'badge-neutral'];
      badges.append(el('span', { className: `badge ${className}`, textContent: text }));
    }

    const details = [
      report.medicine_name ? `Farmaco: ${report.medicine_name}` : null,
      report.pharmacy_name ? `Farmacia: ${report.pharmacy_name} (${report.pharmacy_comune})` : null,
      formatDate(report.created_at)
    ].filter(Boolean).join(' · ');

    const message = el('p', { className: 'report-message', textContent: report.message });

    const item = el(
      'article',
      { className: 'report-item' },
      badges,
      message,
      el('p', { className: 'text-muted small-meta', textContent: details })
    );
    if (report.is_owner || currentUser?.role === 'admin') {
      const edit = button('Modifica', 'btn btn-sm');
      const remove = button('Elimina', 'btn btn-sm');
      edit.setAttribute('aria-label', `Modifica la segnalazione ${report.id}`);
      remove.setAttribute('aria-label', `Elimina la segnalazione ${report.id}`);
      edit.addEventListener('click', () => startEditing(report));
      remove.addEventListener('click', () => deleteReport(report, remove));
      item.append(el('div', { className: 'form-actions' }, edit, remove));
    }
    return item;
  }

  async function loadReports() {
    if (!ui.list) return;
    const loadId = ++lastLoadId;
    ui.listStatus.textContent = 'Caricamento…';
    const category = ui.filter.value;
    try {
      const { reports } = await PharmaAPI.request(`/api/reports${category ? `?category=${category}` : ''}`);
      if (loadId !== lastLoadId) return; // è già partita una richiesta più recente
      ui.list.replaceChildren(...reports.map(renderReport));
      ui.listStatus.textContent = reports.length ? `Segnalazioni: ${reports.length}` : 'Nessuna segnalazione da mostrare.';
    } catch {
      if (loadId !== lastLoadId) return;
      ui.list.replaceChildren();
      ui.listStatus.textContent = 'Impossibile caricare le segnalazioni. Riprova più tardi.';
    }
  }

  // --- Avvio ---

  function init() {
    const panel = document.getElementById('tab-reports');
    if (panel) {
      ui.account = el('div', { className: 'card' });
      ui.filter = categorySelect('reports-filter', 'Tutte');
      ui.filter.addEventListener('change', loadReports);
      ui.listStatus = el('p', { className: 'text-muted', attrs: { role: 'status', 'aria-live': 'polite' } });
      ui.list = el('div', { className: 'report-list' });
      panel.replaceChildren(
        el(
          'div',
          { className: 'card' },
          el('h1', { textContent: 'Segnalazioni' }),
          el('p', {
            className: 'text-muted',
            textContent: 'Turni, disponibilità dei farmaci e disservizi segnalati dai cittadini.'
          })
        ),
        ui.account,
        el(
          'div',
          { className: 'card' },
          el('h2', { textContent: 'Elenco' }),
          el('div', { className: 'form-narrow' }, field('Filtra per categoria', ui.filter)),
          ui.listStatus,
          ui.list
        )
      );
    }
    setUser(null);
    checkSession();
    // Accesso o uscita da un'altra scheda del browser.
    window.addEventListener('storage', checkSession);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
