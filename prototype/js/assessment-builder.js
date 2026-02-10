/**
 * Assessment Builder - Template Editor
 * Card-based layout with inline rubric editing, auto-save, drag-and-drop, version control
 */

(function() {
  'use strict';

  // ── State ──────────────────────────────────────────────

  const state = {
    assessmentTypes: [],
    selectedTypeId: null,
    selectedTypeCode: null,
    templates: [],
    selectedTemplateId: null,
    template: null,          // full detail (with dimensions + questions)
    selectedDimensionId: null,
    isDraft: false,
    saveTimeout: null,
    pendingSaves: 0,
    expandedQuestions: new Set(),
    activeEditWarningShown: false,
  };

  // ── Init ───────────────────────────────────────────────

  document.addEventListener('DOMContentLoaded', async () => {
    await loadAssessmentTypes();
    renderFrameworkTabs();
  });

  async function loadAssessmentTypes() {
    try {
      const data = await apiRequest('/assessment-types');
      state.assessmentTypes = Array.isArray(data) ? data : (data.items || []);
    } catch (e) {
      console.error('Failed to load assessment types:', e);
      state.assessmentTypes = [];
    }
  }

  function renderFrameworkTabs() {
    const container = document.getElementById('frameworkTabs');
    if (!container) return;
    container.innerHTML = '';

    state.assessmentTypes.forEach(t => {
      const btn = document.createElement('button');
      btn.className = 'btn btn--ghost';
      btn.setAttribute('data-type', t.code);
      btn.textContent = t.short_name || t.name;
      btn.onclick = () => selectFramework(t.id, t.code);
      container.appendChild(btn);
    });
  }

  async function selectFramework(typeId, typeCode) {
    state.selectedTypeId = typeId;
    state.selectedTypeCode = typeCode;

    // Highlight tab
    document.querySelectorAll('.builder-toolbar__frameworks .btn').forEach(b => {
      b.classList.toggle('active', b.getAttribute('data-type') === typeCode);
    });

    await loadTemplatesForType(typeCode);
  }

  async function loadTemplatesForType(typeCode) {
    try {
      const data = await apiRequest(`/assessments/templates?type=${typeCode}`);
      state.templates = data.items || [];
    } catch (e) {
      console.error('Failed to load templates:', e);
      state.templates = [];
    }
    renderVersionSelect();

    // Auto-select first template
    if (state.templates.length > 0) {
      const active = state.templates.find(t => t.status === 'active' || t.is_active);
      const sel = active || state.templates[0];
      document.getElementById('versionSelect').value = sel.id;
      await selectTemplate(sel.id);
    } else {
      state.selectedTemplateId = null;
      state.template = null;
      showEmptyState(true);
    }
  }

  function renderVersionSelect() {
    const select = document.getElementById('versionSelect');
    select.innerHTML = '<option value="">Select version...</option>';
    state.templates.forEach(t => {
      const opt = document.createElement('option');
      opt.value = t.id;
      const statusLabel = t.status ? ` [${t.status}]` : (t.is_active ? ' [active]' : '');
      opt.textContent = `${t.name} v${t.version}${statusLabel}`;
      select.appendChild(opt);
    });
  }

  async function selectTemplate(id) {
    if (!id) return;
    state.selectedTemplateId = Number(id);

    try {
      const data = await apiRequest(`/assessments/templates/${id}`);
      state.template = data;
      state.isDraft = data.status === 'draft';
    } catch (e) {
      console.error('Failed to load template:', e);
      return;
    }

    // Reset card state on template change
    state.expandedQuestions.clear();
    state.activeEditWarningShown = false;

    showEmptyState(false);
    renderAll();
  }

  // ── Rendering ──────────────────────────────────────────

  function showEmptyState(show) {
    const emptyEl = document.getElementById('emptyState');
    const metaEl = document.getElementById('templateMeta');
    const contentEl = document.getElementById('builderContent');
    if (emptyEl) emptyEl.style.display = show ? '' : 'none';
    if (metaEl) metaEl.style.display = show ? 'none' : '';
    if (contentEl) contentEl.style.display = show ? 'none' : '';
  }

  function renderAll() {
    renderStatusTag();
    renderTemplateMeta();
    renderDimensionTabs();
    renderQuestionCards();
    updateEditableState();
    updateActionButtons();
    updateActiveWarning();
  }

  function renderStatusTag() {
    const el = document.getElementById('templateStatusTag');
    if (!el || !state.template) return;
    const s = state.template.status || (state.template.is_active ? 'active' : 'archived');
    el.innerHTML = `<span class="builder-status-tag builder-status-tag--${s}">${s}</span>`;
  }

  function renderTemplateMeta() {
    const t = state.template;
    if (!t) return;
    document.getElementById('metaName').textContent = t.name || '(untitled)';
    document.getElementById('metaDescription').textContent = t.description || '(no description)';
  }

  function renderDimensionTabs() {
    const container = document.getElementById('dimensionTabs');
    if (!container || !state.template) return;
    container.innerHTML = '';

    const dims = (state.template.dimensions || []).sort((a, b) => a.display_order - b.display_order);

    dims.forEach(dim => {
      const btn = document.createElement('button');
      btn.className = 'builder-dimension-tab' + (state.selectedDimensionId === dim.id ? ' active' : '');
      btn.textContent = dim.name;
      btn.onclick = () => {
        state.selectedDimensionId = dim.id;
        renderDimensionTabs();
        renderQuestionCards();
        updateActionButtons();
      };
      container.appendChild(btn);
    });

    // Show "All" tab
    const allBtn = document.createElement('button');
    allBtn.className = 'builder-dimension-tab' + (state.selectedDimensionId === null ? ' active' : '');
    allBtn.textContent = 'All';
    allBtn.onclick = () => {
      state.selectedDimensionId = null;
      renderDimensionTabs();
      renderQuestionCards();
      updateActionButtons();
    };
    container.insertBefore(allBtn, container.firstChild);

    // Add dimension button (only for drafts)
    if (state.isDraft) {
      const addBtn = document.createElement('button');
      addBtn.className = 'builder-dimension-tab builder-dimension-tab--add';
      addBtn.textContent = '+ Add';
      addBtn.onclick = () => addDimension();
      container.appendChild(addBtn);
    }

    updateDimensionInfo();
  }

  function updateDimensionInfo() {
    const el = document.getElementById('dimensionInfo');
    if (!el) return;
    if (state.selectedDimensionId === null) {
      const total = (state.template.questions || []).length;
      el.textContent = `Showing all ${total} questions across all dimensions`;
    } else {
      const dim = (state.template.dimensions || []).find(d => d.id === state.selectedDimensionId);
      if (dim) {
        const qCount = (state.template.questions || []).filter(q => q.dimension_id === state.selectedDimensionId).length;
        el.textContent = `${dim.name} — ${qCount} questions (weight: ${dim.weight})`;
      }
    }
  }

  function updateActiveWarning() {
    const el = document.getElementById('activeEditWarning');
    if (!el) return;
    // Show warning for active templates only when warning has been triggered
    el.style.display = (!state.isDraft && state.activeEditWarningShown) ? '' : 'none';
  }

  function showActiveEditWarning() {
    if (state.isDraft || state.activeEditWarningShown) return;
    state.activeEditWarningShown = true;
    updateActiveWarning();
  }

  // ── Card Rendering ─────────────────────────────────────

  function renderQuestionCards() {
    const container = document.getElementById('questionCards');
    if (!container || !state.template) return;
    container.innerHTML = '';

    let questions = state.template.questions || [];
    if (state.selectedDimensionId !== null) {
      questions = questions.filter(q => q.dimension_id === state.selectedDimensionId);
    }
    questions.sort((a, b) => a.display_order - b.display_order);

    if (questions.length === 0) {
      container.innerHTML = '<div class="builder-empty-state"><p>No questions in this dimension yet.</p></div>';
      return;
    }

    questions.forEach(q => {
      container.appendChild(renderQuestionCard(q));
    });

    if (state.isDraft) {
      initCardDragAndDrop();
    }
  }

  function renderQuestionCard(q) {
    const card = document.createElement('div');
    const isExpanded = state.expandedQuestions.has(q.id);
    card.className = 'builder-card' + (isExpanded ? ' builder-card--expanded' : '');
    card.setAttribute('data-question-id', q.id);
    if (state.isDraft) {
      card.setAttribute('draggable', 'true');
    }

    // Header
    const header = document.createElement('div');
    header.className = 'builder-card__header';

    // Drag handle (draft only)
    if (state.isDraft) {
      const drag = document.createElement('div');
      drag.className = 'builder-card__drag';
      drag.innerHTML = '<svg viewBox="0 0 16 16"><circle cx="5" cy="3" r="1.5"/><circle cx="11" cy="3" r="1.5"/><circle cx="5" cy="8" r="1.5"/><circle cx="11" cy="8" r="1.5"/><circle cx="5" cy="13" r="1.5"/><circle cx="11" cy="13" r="1.5"/></svg>';
      drag.addEventListener('mousedown', (e) => e.stopPropagation());
      header.appendChild(drag);
    }

    // Question number (click to edit)
    const numEl = document.createElement('span');
    numEl.className = 'builder-card__number';
    numEl.textContent = q.question_number || '';
    numEl.addEventListener('click', (e) => {
      e.stopPropagation();
      startCardFieldEdit('question_number', q.id, numEl);
    });
    header.appendChild(numEl);

    // Question text (click to edit)
    const textEl = document.createElement('span');
    textEl.className = 'builder-card__text';
    textEl.textContent = q.question_text || '';
    textEl.addEventListener('click', (e) => {
      e.stopPropagation();
      startCardFieldEdit('question_text', q.id, textEl);
    });
    header.appendChild(textEl);

    // Expand/collapse toggle
    const toggle = document.createElement('button');
    toggle.className = 'builder-card__toggle';
    toggle.innerHTML = '<svg width="16" height="16" viewBox="0 0 32 32"><path d="M16 22L6 12l1.4-1.4L16 19.2l8.6-8.6L26 12z" fill="currentColor"/></svg>';
    toggle.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleCardExpand(q.id);
    });
    header.appendChild(toggle);

    // Click header area (not number/text) to toggle
    header.addEventListener('click', () => toggleCardExpand(q.id));

    card.appendChild(header);

    // Meta row
    const meta = document.createElement('div');
    meta.className = 'builder-card__meta';

    if (q.is_required) {
      meta.innerHTML += '<span class="builder-card__badge builder-card__badge--required">Required</span>';
    }

    const completeness = getRubricCompleteness(q);
    const completeClass = completeness.filled === completeness.total ? 'builder-card__badge--complete' : 'builder-card__badge--incomplete';
    meta.innerHTML += `<span class="builder-card__badge ${completeClass}">Rubric: ${completeness.filled}/${completeness.total} complete</span>`;

    card.appendChild(meta);

    // Body (inline rubric table)
    const body = document.createElement('div');
    body.className = 'builder-card__body';
    body.appendChild(renderInlineRubric(q));
    card.appendChild(body);

    // Footer (delete button for drafts)
    if (state.isDraft) {
      const footer = document.createElement('div');
      footer.className = 'builder-card__footer';
      const delBtn = document.createElement('button');
      delBtn.className = 'btn btn--ghost btn--sm';
      delBtn.style.color = 'var(--cds-support-error)';
      delBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 32 32" fill="currentColor"><path d="M12 12h2v12h-2zm6 0h2v12h-2z"/><path d="M4 6v2h2v20a2 2 0 002 2h16a2 2 0 002-2V8h2V6zm4 22V8h16v20zm4-26h8v2h-8z"/></svg> Delete Question';
      delBtn.onclick = () => deleteQuestion(q.id);
      footer.appendChild(delBtn);
      card.appendChild(footer);
    }

    return card;
  }

  function getRubricCompleteness(q) {
    const min = q.min_score || 1;
    const max = q.max_score || 5;
    const total = (max - min + 1) * 3; // 3 fields per score level: label, description, evidence
    let filled = 0;

    const labels = q.score_labels || {};
    const descs = q.score_descriptions || {};
    const evids = q.score_evidence || {};

    for (let i = min; i <= max; i++) {
      const s = String(i);
      if (labels[s] && labels[s].trim()) filled++;
      if (descs[s] && descs[s].trim()) filled++;
      if (evids[s] && evids[s].trim()) filled++;
    }

    return { filled, total };
  }

  function toggleCardExpand(qId) {
    if (state.expandedQuestions.has(qId)) {
      state.expandedQuestions.delete(qId);
    } else {
      state.expandedQuestions.add(qId);
    }
    renderQuestionCards();
  }

  // ── Inline Rubric ──────────────────────────────────────

  function renderInlineRubric(q) {
    const table = document.createElement('table');
    table.className = 'builder-rubric-table';

    const thead = document.createElement('thead');
    thead.innerHTML = `<tr>
      <th style="width:50px;">Score</th>
      <th>Label</th>
      <th>Description</th>
      <th>Evidence</th>
    </tr>`;
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    const min = q.min_score || 1;
    const max = q.max_score || 5;
    const labels = q.score_labels || {};
    const descs = q.score_descriptions || {};
    const evids = q.score_evidence || {};

    for (let i = min; i <= max; i++) {
      const s = String(i);
      const tr = document.createElement('tr');

      // Score number
      const tdScore = document.createElement('td');
      tdScore.className = 'rubric-score-num';
      tdScore.textContent = s;
      tr.appendChild(tdScore);

      // Label cell
      tr.appendChild(createRubricCell(q.id, s, 'label', labels[s]));
      // Description cell
      tr.appendChild(createRubricCell(q.id, s, 'description', descs[s]));
      // Evidence cell
      tr.appendChild(createRubricCell(q.id, s, 'evidence', evids[s]));

      tbody.appendChild(tr);
    }

    table.appendChild(tbody);
    return table;
  }

  function createRubricCell(qId, score, field, value) {
    const td = document.createElement('td');
    const cell = document.createElement('div');
    cell.className = 'builder-rubric-cell' + (!value || !value.trim() ? ' builder-rubric-cell--empty' : '');
    cell.textContent = value && value.trim() ? value : 'Click to add...';
    cell.addEventListener('click', (e) => {
      e.stopPropagation();
      startRubricCellEdit(qId, score, field, cell);
    });
    td.appendChild(cell);
    return td;
  }

  function startRubricCellEdit(qId, score, field, cellEl) {
    if (cellEl.querySelector('input, textarea')) return; // already editing

    const q = (state.template.questions || []).find(q => q.id === qId);
    if (!q) return;

    const fieldMap = { label: 'score_labels', description: 'score_descriptions', evidence: 'score_evidence' };
    const stateField = fieldMap[field];
    const data = q[stateField] || {};
    const currentValue = data[score] || '';
    const isMultiline = field !== 'label';

    // Show warning on first active template edit
    showActiveEditWarning();

    if (isMultiline) {
      const textarea = document.createElement('textarea');
      textarea.className = 'builder-inline-textarea';
      textarea.value = currentValue;
      textarea.rows = 2;
      cellEl.innerHTML = '';
      cellEl.className = 'builder-rubric-cell';
      cellEl.appendChild(textarea);
      textarea.focus();

      textarea.onblur = () => finishRubricCellEdit(qId, score, field, cellEl, textarea.value, currentValue);
      textarea.onkeydown = (e) => {
        if (e.key === 'Escape') finishRubricCellEdit(qId, score, field, cellEl, currentValue, currentValue);
        else if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); textarea.blur(); }
      };
    } else {
      const input = document.createElement('input');
      input.className = 'builder-inline-input';
      input.type = 'text';
      input.value = currentValue;
      cellEl.innerHTML = '';
      cellEl.className = 'builder-rubric-cell';
      cellEl.appendChild(input);
      input.focus();
      input.select();

      input.onblur = () => finishRubricCellEdit(qId, score, field, cellEl, input.value, currentValue);
      input.onkeydown = (e) => {
        if (e.key === 'Escape') finishRubricCellEdit(qId, score, field, cellEl, currentValue, currentValue);
        else if (e.key === 'Enter') input.blur();
      };
    }
  }

  function finishRubricCellEdit(qId, score, field, cellEl, newValue, oldValue) {
    const trimmed = newValue.trim();
    cellEl.innerHTML = '';
    cellEl.className = 'builder-rubric-cell' + (!trimmed ? ' builder-rubric-cell--empty' : '');
    cellEl.textContent = trimmed || 'Click to add...';

    // Re-attach click handler
    cellEl.addEventListener('click', (e) => {
      e.stopPropagation();
      startRubricCellEdit(qId, score, field, cellEl);
    });

    if (newValue !== oldValue) {
      saveRubricCell(qId, score, field, trimmed);
    }
  }

  async function saveRubricCell(qId, score, field, value) {
    const q = (state.template.questions || []).find(q => q.id === qId);
    if (!q) return;

    const fieldMap = { label: 'score_labels', description: 'score_descriptions', evidence: 'score_evidence' };
    const stateField = fieldMap[field];

    // Update local state first
    if (!q[stateField]) q[stateField] = {};
    q[stateField][score] = value;

    // Build the full payload (send all three fields to /scores endpoint)
    const body = {
      score_labels: q.score_labels || {},
      score_descriptions: q.score_descriptions || {},
      score_evidence: q.score_evidence || {},
    };

    updateSaveStatus('saving');
    state.pendingSaves++;

    try {
      // /scores endpoint works on any template status
      await apiRequest(`/assessments/templates/${state.selectedTemplateId}/questions/${qId}/scores`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
    } catch (e) {
      console.error('Save rubric cell failed:', e);
      updateSaveStatus('error');
      state.pendingSaves--;
      return;
    }

    state.pendingSaves--;
    if (state.pendingSaves <= 0) {
      state.pendingSaves = 0;
      updateSaveStatus('saved');
    }

    // Update completeness badge without full re-render
    const card = document.querySelector(`.builder-card[data-question-id="${qId}"]`);
    if (card) {
      const badge = card.querySelector('.builder-card__badge--complete, .builder-card__badge--incomplete');
      if (badge) {
        const comp = getRubricCompleteness(q);
        const cls = comp.filled === comp.total ? 'builder-card__badge--complete' : 'builder-card__badge--incomplete';
        badge.className = `builder-card__badge ${cls}`;
        badge.textContent = `Rubric: ${comp.filled}/${comp.total} complete`;
      }
    }
  }

  // ── Card Field Editing (question_text, question_number) ─

  function startCardFieldEdit(field, qId, el) {
    if (el.querySelector('input, textarea')) return; // already editing

    // Show warning on first active template edit
    showActiveEditWarning();

    const currentValue = getQuestionFieldValue(qId, field);
    const isMultiline = field === 'question_text';

    if (isMultiline) {
      const textarea = document.createElement('textarea');
      textarea.className = 'builder-inline-textarea';
      textarea.value = currentValue || '';
      textarea.rows = 3;
      textarea.style.width = '100%';

      el.innerHTML = '';
      el.appendChild(textarea);
      textarea.focus();
      textarea.select();

      textarea.onblur = () => finishCardFieldEdit(field, qId, el, textarea.value, currentValue);
      textarea.onkeydown = (e) => {
        if (e.key === 'Escape') finishCardFieldEdit(field, qId, el, currentValue, currentValue);
        else if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); textarea.blur(); }
      };
    } else {
      const input = document.createElement('input');
      input.className = 'builder-inline-input';
      input.type = 'text';
      input.value = currentValue || '';
      input.style.width = '60px';

      el.innerHTML = '';
      el.appendChild(input);
      input.focus();
      input.select();

      input.onblur = () => finishCardFieldEdit(field, qId, el, input.value, currentValue);
      input.onkeydown = (e) => {
        if (e.key === 'Escape') finishCardFieldEdit(field, qId, el, currentValue, currentValue);
        else if (e.key === 'Enter') input.blur();
      };
    }
  }

  function finishCardFieldEdit(field, qId, el, newValue, oldValue) {
    el.textContent = newValue || '';

    if (newValue !== oldValue) {
      saveQuestionFieldAdaptive(qId, field, newValue);
    }
  }

  // ── Adaptive Save (routes to /minor for active templates) ─

  async function saveQuestionFieldAdaptive(qId, field, value) {
    updateSaveStatus('saving');
    state.pendingSaves++;

    try {
      const body = {};
      body[field] = value;

      // For active templates, use /minor endpoint for text/number fields
      const isMinorField = (field === 'question_text' || field === 'question_number');
      const endpoint = (!state.isDraft && isMinorField)
        ? `/assessments/templates/${state.selectedTemplateId}/questions/${qId}/minor`
        : `/assessments/templates/${state.selectedTemplateId}/questions/${qId}`;

      await apiRequest(endpoint, {
        method: 'PATCH',
        body: JSON.stringify(body),
      });

      // Update local state
      const q = (state.template.questions || []).find(q => q.id === qId);
      if (q) q[field] = value;
    } catch (e) {
      console.error('Save failed:', e);
      updateSaveStatus('error');
      state.pendingSaves--;
      return;
    }

    state.pendingSaves--;
    if (state.pendingSaves <= 0) {
      state.pendingSaves = 0;
      updateSaveStatus('saved');
    }
  }

  // ── Legacy saveQuestionField (for checkbox etc) ────────

  async function saveQuestionField(qId, field, value) {
    updateSaveStatus('saving');
    state.pendingSaves++;

    try {
      const body = {};
      body[field] = value;
      await apiRequest(`/assessments/templates/${state.selectedTemplateId}/questions/${qId}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      });

      // Update local state
      const q = (state.template.questions || []).find(q => q.id === qId);
      if (q) q[field] = value;
    } catch (e) {
      console.error('Save failed:', e);
      updateSaveStatus('error');
      state.pendingSaves--;
      return;
    }

    state.pendingSaves--;
    if (state.pendingSaves <= 0) {
      state.pendingSaves = 0;
      updateSaveStatus('saved');
    }
  }

  // ── Other Rendering Helpers ────────────────────────────

  function updateEditableState() {
    const readonly = !state.isDraft;
    document.querySelectorAll('.builder-editable-field').forEach(el => {
      el.setAttribute('data-readonly', readonly ? 'true' : 'false');
    });
  }

  function updateActionButtons() {
    const draft = state.isDraft;
    const hasTemplate = !!state.template;

    const btnClone = document.getElementById('btnClone');
    const btnHistory = document.getElementById('btnHistory');
    const btnPromote = document.getElementById('btnPromote');
    const btnAddQ = document.getElementById('btnAddQuestion');
    const btnEditDim = document.getElementById('btnEditDimension');
    const btnDeleteDim = document.getElementById('btnDeleteDimension');

    if (btnClone) btnClone.disabled = !hasTemplate;
    if (btnHistory) btnHistory.disabled = !hasTemplate;
    if (btnPromote) btnPromote.style.display = draft ? '' : 'none';
    if (btnAddQ) btnAddQ.style.display = (draft && hasTemplate) ? '' : 'none';
    if (btnEditDim) btnEditDim.style.display = (draft && state.selectedDimensionId) ? '' : 'none';
    if (btnDeleteDim) btnDeleteDim.style.display = (draft && state.selectedDimensionId) ? '' : 'none';
  }

  function updateSaveStatus(status) {
    const el = document.getElementById('saveStatus');
    const txt = document.getElementById('saveStatusText');
    if (!el || !txt) return;
    el.className = 'builder-save-status';
    if (status === 'saving') {
      el.classList.add('builder-save-status--saving');
      txt.textContent = 'Saving...';
    } else if (status === 'error') {
      el.classList.add('builder-save-status--error');
      txt.textContent = 'Save failed';
    } else {
      txt.textContent = 'All changes saved';
    }
  }

  // ── Template Metadata Editing ──────────────────────────

  function startFieldEdit(el) {
    if (el.getAttribute('data-readonly') === 'true') return;
    if (el.querySelector('input, textarea')) return;

    const field = el.getAttribute('data-field');
    const currentValue = state.template[field] || '';
    const isLong = field === 'description';

    if (isLong) {
      const textarea = document.createElement('textarea');
      textarea.className = 'builder-inline-textarea';
      textarea.value = currentValue;
      textarea.rows = 2;
      el.innerHTML = '';
      el.appendChild(textarea);
      textarea.focus();
      textarea.onblur = () => {
        el.textContent = textarea.value || `(no ${field})`;
        if (textarea.value !== currentValue) {
          saveTemplateField(field, textarea.value);
        }
      };
      textarea.onkeydown = (e) => {
        if (e.key === 'Escape') {
          el.textContent = currentValue || `(no ${field})`;
        }
      };
    } else {
      const input = document.createElement('input');
      input.className = 'builder-inline-input';
      input.type = 'text';
      input.value = currentValue;
      el.innerHTML = '';
      el.appendChild(input);
      input.focus();
      input.select();
      input.onblur = () => {
        el.textContent = input.value || `(no ${field})`;
        if (input.value !== currentValue) {
          saveTemplateField(field, input.value);
        }
      };
      input.onkeydown = (e) => {
        if (e.key === 'Enter') input.blur();
        if (e.key === 'Escape') {
          el.textContent = currentValue || `(no ${field})`;
        }
      };
    }
  }

  async function saveTemplateField(field, value) {
    updateSaveStatus('saving');
    try {
      const body = {};
      body[field] = value;
      await apiRequest(`/assessments/templates/${state.selectedTemplateId}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
      state.template[field] = value;
      updateSaveStatus('saved');
    } catch (e) {
      console.error('Save failed:', e);
      updateSaveStatus('error');
    }
  }

  async function saveDimensionField(dimId, field, value) {
    updateSaveStatus('saving');
    try {
      const body = {};
      body[field] = value;
      await apiRequest(`/assessments/templates/${state.selectedTemplateId}/dimensions/${dimId}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
      const dim = (state.template.dimensions || []).find(d => d.id === dimId);
      if (dim) dim[field] = value;
      updateSaveStatus('saved');
    } catch (e) {
      console.error('Save failed:', e);
      updateSaveStatus('error');
    }
  }

  function getQuestionFieldValue(qId, field) {
    const q = (state.template.questions || []).find(q => q.id === qId);
    return q ? (q[field] || '') : '';
  }

  // ── Version Control ────────────────────────────────────

  function openNewDraftModal() {
    if (!state.selectedTemplateId) return;

    // Populate source dropdown with templates for this framework
    const select = document.getElementById('draftSourceSelect');
    select.innerHTML = '';
    state.templates.forEach(t => {
      const opt = document.createElement('option');
      opt.value = t.id;
      const statusLabel = t.status ? ` [${t.status}]` : '';
      opt.textContent = `v${t.version}${statusLabel} — ${t.name}`;
      if (t.id === state.selectedTemplateId) opt.selected = true;
      select.appendChild(opt);
    });

    // Clear version input
    document.getElementById('draftVersion').value = '';
    document.getElementById('newDraftModal').style.display = '';

    // Focus version input
    setTimeout(() => document.getElementById('draftVersion').focus(), 100);
  }

  function closeNewDraftModal() {
    document.getElementById('newDraftModal').style.display = 'none';
  }

  async function createDraftFromModal() {
    const version = document.getElementById('draftVersion').value.trim();
    if (!version) {
      alert('Please enter a version number.');
      return;
    }

    const sourceId = document.getElementById('draftSourceSelect').value;
    if (!sourceId) {
      alert('Please select a source template.');
      return;
    }

    try {
      const result = await apiRequest(`/assessments/templates/${sourceId}/clone`, {
        method: 'POST',
        body: JSON.stringify({ new_version: version }),
      });

      closeNewDraftModal();
      alert(`Draft v${result.version} created!`);

      // Reload templates and select the new one
      await loadTemplatesForType(state.selectedTypeCode);
      document.getElementById('versionSelect').value = result.id;
      await selectTemplate(result.id);
    } catch (e) {
      console.error('Clone failed:', e);
      alert('Failed to create draft: ' + e.message);
    }
  }

  async function promoteToActive() {
    if (!state.selectedTemplateId || !state.isDraft) return;

    if (!confirm('Promote this draft to active? This will deactivate the current active template for this framework.')) return;

    try {
      await apiRequest(`/assessments/templates/${state.selectedTemplateId}/promote`, {
        method: 'POST',
      });

      alert('Template promoted to active!');
      await loadTemplatesForType(state.selectedTypeCode);
      document.getElementById('versionSelect').value = state.selectedTemplateId;
      await selectTemplate(state.selectedTemplateId);
    } catch (e) {
      console.error('Promote failed:', e);
      alert('Failed to promote template: ' + e.message);
    }
  }

  // ── Dimension Management ───────────────────────────────

  function addDimension() {
    document.getElementById('dimensionModalTitle').textContent = 'Add Dimension';
    document.getElementById('dimEditId').value = '';
    document.getElementById('dimName').value = '';
    document.getElementById('dimDescription').value = '';
    document.getElementById('dimWeight').value = '1.0';
    document.getElementById('dimOrder').value = String((state.template.dimensions || []).length);
    document.getElementById('dimensionModal').style.display = '';
  }

  function editCurrentDimension() {
    if (!state.selectedDimensionId) return;
    const dim = (state.template.dimensions || []).find(d => d.id === state.selectedDimensionId);
    if (!dim) return;

    document.getElementById('dimensionModalTitle').textContent = 'Edit Dimension';
    document.getElementById('dimEditId').value = dim.id;
    document.getElementById('dimName').value = dim.name;
    document.getElementById('dimDescription').value = dim.description || '';
    document.getElementById('dimWeight').value = dim.weight;
    document.getElementById('dimOrder').value = dim.display_order;
    document.getElementById('dimensionModal').style.display = '';
  }

  async function handleDimensionSubmit() {
    const editId = document.getElementById('dimEditId').value;
    const body = {
      name: document.getElementById('dimName').value.trim(),
      description: document.getElementById('dimDescription').value.trim() || null,
      weight: parseFloat(document.getElementById('dimWeight').value) || 1.0,
      display_order: parseInt(document.getElementById('dimOrder').value) || 0,
    };

    if (!body.name) {
      alert('Name is required');
      return;
    }

    try {
      if (editId) {
        // Update
        await apiRequest(`/assessments/templates/${state.selectedTemplateId}/dimensions/${editId}`, {
          method: 'PATCH',
          body: JSON.stringify(body),
        });
      } else {
        // Create
        await apiRequest(`/assessments/templates/${state.selectedTemplateId}/dimensions`, {
          method: 'POST',
          body: JSON.stringify(body),
        });
      }

      closeDimensionModal();
      // Reload full template to get updated dimensions
      await selectTemplate(state.selectedTemplateId);
    } catch (e) {
      console.error('Dimension save failed:', e);
      alert('Failed to save dimension: ' + e.message);
    }
  }

  async function deleteCurrentDimension() {
    if (!state.selectedDimensionId) return;
    const dim = (state.template.dimensions || []).find(d => d.id === state.selectedDimensionId);
    if (!dim) return;

    if (!confirm(`Delete dimension "${dim.name}" and all its questions?`)) return;

    try {
      await apiRequest(`/assessments/templates/${state.selectedTemplateId}/dimensions/${state.selectedDimensionId}`, {
        method: 'DELETE',
      });
      state.selectedDimensionId = null;
      await selectTemplate(state.selectedTemplateId);
    } catch (e) {
      console.error('Delete dimension failed:', e);
      alert('Failed to delete dimension: ' + e.message);
    }
  }

  function closeDimensionModal() {
    document.getElementById('dimensionModal').style.display = 'none';
  }

  // ── Question Management ────────────────────────────────

  async function addQuestion() {
    const dimId = state.selectedDimensionId;
    if (!dimId) {
      const dims = state.template.dimensions || [];
      if (dims.length === 0) {
        alert('Please add a dimension first.');
        return;
      }
      alert('Please select a specific dimension tab before adding a question.');
      return;
    }

    const dim = (state.template.dimensions || []).find(d => d.id === dimId);
    const dimIdx = (state.template.dimensions || []).indexOf(dim) + 1;
    const existingQs = (state.template.questions || []).filter(q => q.dimension_id === dimId);
    const qNum = `${dimIdx}.${existingQs.length + 1}`;
    const maxOrder = existingQs.reduce((m, q) => Math.max(m, q.display_order || 0), 0);

    try {
      const result = await apiRequest(`/assessments/templates/${state.selectedTemplateId}/questions`, {
        method: 'POST',
        body: JSON.stringify({
          dimension_id: dimId,
          question_text: 'New question - click to edit',
          question_number: qNum,
          display_order: maxOrder + 1,
        }),
      });

      // Reload template and auto-expand the new card
      await selectTemplate(state.selectedTemplateId);
      state.expandedQuestions.add(result.id);
      renderQuestionCards();

      // Start editing the new question text
      setTimeout(() => {
        const card = document.querySelector(`.builder-card[data-question-id="${result.id}"]`);
        if (card) {
          const textEl = card.querySelector('.builder-card__text');
          if (textEl) startCardFieldEdit('question_text', result.id, textEl);
        }
      }, 100);
    } catch (e) {
      console.error('Add question failed:', e);
      alert('Failed to add question: ' + e.message);
    }
  }

  async function deleteQuestion(qId) {
    if (!confirm('Delete this question?')) return;

    try {
      await apiRequest(`/assessments/templates/${state.selectedTemplateId}/questions/${qId}`, {
        method: 'DELETE',
      });
      state.expandedQuestions.delete(qId);
      await selectTemplate(state.selectedTemplateId);
    } catch (e) {
      console.error('Delete question failed:', e);
      alert('Failed to delete question: ' + e.message);
    }
  }

  // ── Card Drag and Drop ─────────────────────────────────

  function initCardDragAndDrop() {
    const container = document.getElementById('questionCards');
    if (!container) return;

    let draggedCard = null;

    container.querySelectorAll('.builder-card[draggable="true"]').forEach(card => {
      card.addEventListener('dragstart', (e) => {
        draggedCard = card;
        card.classList.add('builder-dragging');
        e.dataTransfer.effectAllowed = 'move';
      });

      card.addEventListener('dragend', () => {
        card.classList.remove('builder-dragging');
        container.querySelectorAll('.builder-drag-over').forEach(c => c.classList.remove('builder-drag-over'));
        draggedCard = null;
      });

      card.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (card !== draggedCard) {
          card.classList.add('builder-drag-over');
        }
      });

      card.addEventListener('dragleave', () => {
        card.classList.remove('builder-drag-over');
      });

      card.addEventListener('drop', (e) => {
        e.preventDefault();
        card.classList.remove('builder-drag-over');
        if (!draggedCard || card === draggedCard) return;

        // Reorder in DOM
        const allCards = Array.from(container.querySelectorAll('.builder-card[data-question-id]'));
        const fromIdx = allCards.indexOf(draggedCard);
        const toIdx = allCards.indexOf(card);

        if (fromIdx < toIdx) {
          card.parentNode.insertBefore(draggedCard, card.nextSibling);
        } else {
          card.parentNode.insertBefore(draggedCard, card);
        }

        // Save new order
        handleCardDrop();
      });
    });
  }

  async function handleCardDrop() {
    const cards = document.querySelectorAll('#questionCards .builder-card[data-question-id]');
    const items = [];
    cards.forEach((card, idx) => {
      const qId = parseInt(card.getAttribute('data-question-id'));
      items.push({ id: qId, display_order: idx });
      // Update local state
      const q = (state.template.questions || []).find(q => q.id === qId);
      if (q) q.display_order = idx;
    });

    try {
      await apiRequest(`/assessments/templates/${state.selectedTemplateId}/questions/reorder`, {
        method: 'POST',
        body: JSON.stringify({ items }),
      });
    } catch (e) {
      console.error('Reorder failed:', e);
    }
  }

  // ── Audit Trail ────────────────────────────────────────

  async function showAuditTrail() {
    if (!state.selectedTemplateId) return;

    try {
      const data = await apiRequest(`/assessments/templates/${state.selectedTemplateId}/audit?limit=100`);
      const tbody = document.getElementById('auditTableBody');
      tbody.innerHTML = '';

      if (!data.items || data.items.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:var(--cds-text-secondary); padding:24px;">No changes recorded yet.</td></tr>';
      } else {
        data.items.forEach(entry => {
          const tr = document.createElement('tr');
          const when = new Date(entry.changed_at).toLocaleString();
          const who = entry.changed_by ? `${entry.changed_by.first_name} ${entry.changed_by.last_name}` : 'System';
          tr.innerHTML = `
            <td>${escHtml(when)}</td>
            <td>${escHtml(who)}</td>
            <td>${escHtml(entry.entity_type)}</td>
            <td>${escHtml(entry.field_name)}</td>
            <td><span class="audit-old-value">${escHtml(truncate(entry.old_value || '', 60))}</span></td>
            <td><span class="audit-new-value">${escHtml(truncate(entry.new_value || '', 60))}</span></td>
          `;
          tbody.appendChild(tr);
        });
      }

      document.getElementById('auditModal').style.display = '';
    } catch (e) {
      console.error('Load audit failed:', e);
      alert('Failed to load audit trail: ' + e.message);
    }
  }

  function closeAuditTrailModal() {
    document.getElementById('auditModal').style.display = 'none';
  }

  // ── Utilities ──────────────────────────────────────────

  function escHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function escAttr(str) {
    return str.replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function truncate(str, max) {
    return str && str.length > max ? str.substring(0, max) + '...' : (str || '');
  }

  // ── Public API ─────────────────────────────────────────

  window.AB = {
    selectTemplate,
    startFieldEdit,
    openNewDraftModal,
    closeNewDraftModal,
    createDraftFromModal,
    promoteToActive,
    showAuditTrail,
    closeAuditTrailModal,
    addDimension,
    editCurrentDimension,
    handleDimensionSubmit,
    deleteCurrentDimension,
    closeDimensionModal,
    addQuestion,
    deleteQuestion,
  };

})();
