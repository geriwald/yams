(() => {
  'use strict';

  const UPPER_CATEGORIES = [
    { id: 'ones', label: 'As', hint: 'Total des dés à 1', number: 1 },
    { id: 'twos', label: 'Deux', hint: 'Total des dés à 2', number: 2 },
    { id: 'threes', label: 'Trois', hint: 'Total des dés à 3', number: 3 },
    { id: 'fours', label: 'Quatre', hint: 'Total des dés à 4', number: 4 },
    { id: 'fives', label: 'Cinq', hint: 'Total des dés à 5', number: 5 },
    { id: 'sixes', label: 'Six', hint: 'Total des dés à 6', number: 6 }
  ];

  const LOWER_CATEGORIES = [
    { id: 'threeKind', label: 'Brelan', hint: 'Somme des dés identiques si plus de 3' },
    { id: 'fourKind', label: 'Carré', hint: 'Somme des dés identiques si plus de 4' },
    { id: 'fullHouse', label: 'Full', hint: '25 points', fixedScore: 25 },
    { id: 'smallStraight', label: 'Petite suite', hint: '30 points', fixedScore: 30 },
    { id: 'largeStraight', label: 'Grande suite', hint: '40 points', fixedScore: 40 },
    { id: 'yahtzee', label: 'Yams', hint: '50 points', fixedScore: 50 },
    { id: 'chance', label: 'Chance', hint: 'Somme des dés' }
  ];

  const ALL_CATEGORIES = [...UPPER_CATEGORIES, ...LOWER_CATEGORIES];
  const CATEGORY_MAP = ALL_CATEGORIES.reduce((accumulator, category) => {
    accumulator[category.id] = category;
    return accumulator;
  }, Object.create(null));
  const STORAGE_KEY = 'yams-scorekeeper-v1';
  const DEFAULT_TRACKS = ['Montée', 'Descente', 'Libre', 'Premier'];

  const storageAvailable = (() => {
    try {
      const key = '__yams_test__';
      window.localStorage.setItem(key, '1');
      window.localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.warn("Stockage local indisponible, l'application ne persistera pas les scores.");
      return false;
    }
  })();

  const modeSelect = document.querySelector('#mode-select');
  const boardsContainer = document.querySelector('#boards');
  const multiplayerControls = document.querySelector('#multiplayer-controls');
  const multipisteControls = document.querySelector('#multipiste-controls');
  const addPlayerForm = document.querySelector('#add-player-form');
  const addTrackForm = document.querySelector('#add-track-form');
  const resetAllButton = document.querySelector('#reset-all');
  const restoreTracksButton = document.querySelector('#restore-default-tracks');
  const controlsPanel = document.querySelector('#controls-panel');
  const toggleControlsButton = document.querySelector('#toggle-controls');

  let state = loadState() ?? createDefaultState();
  let isCrossMode = false;
  ensureDefaultBoards();
  render();

  if (toggleControlsButton && controlsPanel) {
    toggleControlsButton.addEventListener('click', () => {
      const isHidden = controlsPanel.hasAttribute('hidden');
      if (isHidden) {
        controlsPanel.removeAttribute('hidden');
        toggleControlsButton.setAttribute('aria-expanded', 'true');
      } else {
        controlsPanel.setAttribute('hidden', '');
        toggleControlsButton.setAttribute('aria-expanded', 'false');
      }
    });
  }

  modeSelect.addEventListener('change', (event) => {
    const newMode = event.target.value === 'multipiste' ? 'multipiste' : 'multiplayer';
    if (state.mode === newMode) {
      return;
    }
    state.mode = newMode;
    ensureDefaultBoards();
    saveState();
    render();
  });

  addPlayerForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const formData = new FormData(addPlayerForm);
    const rawName = (formData.get('player-name') ?? '').toString().trim();
    if (!rawName) {
      return;
    }
    state.boards.multiplayer.push(createBoard(rawName, 'multiplayer'));
    addPlayerForm.reset();
    saveState();
    if (state.mode !== 'multiplayer') {
      state.mode = 'multiplayer';
      modeSelect.value = 'multiplayer';
    }
    renderBoards();
  });

  addTrackForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const formData = new FormData(addTrackForm);
    const rawName = (formData.get('track-name') ?? '').toString().trim();
    if (!rawName) {
      return;
    }
    state.boards.multipiste.push(createBoard(rawName, 'multipiste'));
    addTrackForm.reset();
    saveState();
    if (state.mode !== 'multipiste') {
      state.mode = 'multipiste';
      modeSelect.value = 'multipiste';
    }
    renderBoards();
  });

  resetAllButton.addEventListener('click', () => {
    if (!window.confirm('Réinitialiser toutes les grilles ?')) {
      return;
    }
    for (const collection of Object.values(state.boards)) {
      collection.forEach(resetBoardEntries);
    }
    saveState();
    renderBoards();
  });

  restoreTracksButton.addEventListener('click', () => {
    if (!window.confirm('Restaurer les pistes classiques ? Les valeurs actuelles seront perdues.')) {
      return;
    }
    state.boards.multipiste = DEFAULT_TRACKS.map((name) => createBoard(name, 'multipiste'));
    state.mode = 'multipiste';
    modeSelect.value = 'multipiste';
    saveState();
    render();
  });

  boardsContainer.addEventListener('input', (event) => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement) || !input.classList.contains('score-input')) {
      return;
    }
    if (input.readOnly) {
      return;
    }

    const boardId = input.dataset.boardId;
    const boardType = input.dataset.boardType;
    const categoryId = input.dataset.categoryId;

    if (!boardId || !boardType || !categoryId) {
      return;
    }

    const context = getBoardContext(boardId, boardType);
    if (!context) {
      return;
    }

    const crossedMap = context.board.crossed ?? (context.board.crossed = createEmptyMarks());
    crossedMap[categoryId] = false; // Keep for compatibility, but mechanism removed
    const cell = input.closest('.score-cell');
    if (cell) {
      cell.classList.remove('score-cell-crossed');
    }
    input.disabled = false;
    input.classList.remove('score-input-crossed');
    const rawValue = input.value.trim();
    if (rawValue === '') {
      context.board.entries[categoryId] = null;
      saveState();
      updateBoardTotalsUI(context.board);
      return;
    }

    let numericValue = Number(rawValue.replace(',', '.'));
    if (!Number.isFinite(numericValue)) {
      input.value = '';
      context.board.entries[categoryId] = null;
      saveState();
      updateBoardTotalsUI(context.board);
      return;
    }

    numericValue = Math.max(0, Math.round(numericValue));
    if (numericValue > 999) {
      numericValue = 999;
    }

    // Validation
    let isValid = true;
    if (UPPER_CATEGORIES.some(cat => cat.id === categoryId)) {
      const cat = UPPER_CATEGORIES.find(cat => cat.id === categoryId);
      if (numericValue >= cat.number) {
        isValid = numericValue % cat.number === 0 && numericValue <= 6 * cat.number;
      }
    } else if (categoryId === 'threeKind') {
      const validThreeKind = [3, 6, 9, 12, 15, 18];
      isValid = validThreeKind.includes(numericValue);
    } else if (categoryId === 'fourKind') {
      const validFourKind = [4, 8, 12, 16, 20, 24];
      isValid = validFourKind.includes(numericValue);
    }

    input.classList.toggle('invalid', !isValid);

    if (!isValid) {
      // Don't save invalid, but display
      return;
    }

    if (numericValue === 0) {
      context.board.entries[categoryId] = null;
      input.value = '';
      input.classList.remove('invalid');
      saveState();
      updateBoardTotalsUI(context.board);
      return;
    }

    context.board.entries[categoryId] = numericValue;
    input.value = String(numericValue);
    input.classList.remove('invalid');
    saveState();
    updateBoardTotalsUI(context.board);
  });

  boardsContainer.addEventListener('click', (event) => {
    const button = event.target instanceof HTMLElement ? event.target.closest('[data-action]') : null;
    if (!button) {
      if (isCrossMode && event.target.closest('.score-cell')) {
        const cell = event.target.closest('.score-cell');
        const boardId = cell.dataset.boardId;
        const boardType = cell.dataset.boardType;
        const categoryId = cell.dataset.categoryId;
        const context = getBoardContext(boardId, boardType);
        if (context) {
          const crossedMap = context.board.crossed ?? (context.board.crossed = createEmptyMarks());
          crossedMap[categoryId] = !crossedMap[categoryId];
          if (crossedMap[categoryId]) {
            // Si biffé, remettre entry à null
            context.board.entries[categoryId] = null;
          }
          saveState();
          renderBoards();
          isCrossMode = false;
          document.querySelector('[data-action="toggle-cross-mode"]').classList.remove('active');
        }
      }
      return;
    }
    const boardId = button.dataset.boardId;
    const boardType = button.dataset.boardType ?? state.mode;
    const action = button.dataset.action;

    if (!boardId || !boardType || !action) {
      return;
    }

    const context = getBoardContext(boardId, boardType);
    if (!context) {
      return;
    }

    if (action === 'toggle-fixed') {
      const categoryId = button.dataset.categoryId;
      if (!categoryId) {
        return;
      }
      const category = CATEGORY_MAP[categoryId];
      if (!category || typeof category.fixedScore !== 'number') {
        return;
      }
      const crossedMap = context.board.crossed ?? (context.board.crossed = createEmptyMarks());
      if (isCrossMode) {
        // En mode biffure, toggle crossed au lieu de toggle fixed
        crossedMap[categoryId] = !crossedMap[categoryId];
        if (crossedMap[categoryId]) {
          context.board.entries[categoryId] = null;
        }
        saveState();
        renderBoards();
        isCrossMode = false;
        document.querySelector('[data-action="toggle-cross-mode"]').classList.remove('active');
        return;
      }
      if (crossedMap[categoryId]) {
        // Si déjà biffé, débiffer
        crossedMap[categoryId] = false;
        context.board.entries[categoryId] = null;
      } else {
        const isActive = context.board.entries[categoryId] === category.fixedScore;
        context.board.entries[categoryId] = isActive ? null : category.fixedScore;
      }
      saveState();
      renderBoards();
      return;
    }
  });

  // Header buttons
  document.addEventListener('click', (event) => {
    const btn = event.target.closest('.header-btn');
    if (!btn) return;
    const action = btn.dataset.action;
    if (action === 'delete-tracks') {
      if (confirm('Supprimer toutes les pistes ?')) {
        state.boards.multipiste = [];
        saveState();
        render();
      }
    } else if (action === 'reset-scores') {
      if (confirm('Réinitialiser tous les scores ?')) {
        for (const collection of Object.values(state.boards)) {
          collection.forEach(resetBoardEntries);
        }
        saveState();
        renderBoards();
      }
    } else if (action === 'add-track') {
      state.boards.multipiste.push(createBoard(`J${state.boards.multipiste.length + 1}`, 'multipiste'));
      saveState();
      renderBoards();
    } else if (action === 'add-classic') {
      state.boards.multipiste = DEFAULT_TRACKS.map((name) => createBoard(name, 'multipiste'));
      saveState();
      render();
    } else if (action === 'toggle-cross-mode') {
      isCrossMode = !isCrossMode;
      const btn = event.target.closest('.header-btn');
      btn.classList.toggle('active', isCrossMode);
    }
  });

  function render() {
    modeSelect.value = state.mode;
    multiplayerControls.hidden = state.mode !== 'multiplayer';
    multipisteControls.hidden = state.mode !== 'multipiste';
    renderBoards();
  }

  function renderBoards() {
    const previousScrollLeft = boardsContainer.scrollLeft;
    const previousScrollTop = boardsContainer.scrollTop;
    boardsContainer.innerHTML = '';
    const boards = state.boards[state.mode];
    if (!boards.length) {
      boardsContainer.appendChild(createEmptyState(state.mode));
      return;
    }
    boardsContainer.appendChild(createScoreGrid(boards));
    boardsContainer.scrollLeft = previousScrollLeft;
    boardsContainer.scrollTop = previousScrollTop;
  }

  function createEmptyState(mode) {
    const message = 'Ajoutez vos pistes pour commencer.'
    const wrapper = document.createElement('div');
    wrapper.className = 'empty-state';
    wrapper.textContent = message;
    return wrapper;
  }

  function createScoreGrid(boards) {
    const totalsByBoard = computeAllTotals(boards);

    const wrapper = document.createElement('div');
    wrapper.className = 'score-grid';

    const table = document.createElement('table');
    table.className = 'score-grid-table';

    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');

    const categoryHeader = document.createElement('th');
    categoryHeader.scope = 'col';
    categoryHeader.className = 'category-header';
    // categoryHeader.textContent = 'Catégorie';
    headerRow.appendChild(categoryHeader);

    boards.forEach((board) => {
      headerRow.appendChild(createBoardHeaderCell(board));
    });

    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');

    tbody.appendChild(createSectionRow('Section supérieure', boards.length + 1));
    UPPER_CATEGORIES.forEach((category) => {
      tbody.appendChild(createCategoryDataRow(category, boards));
    });
    tbody.appendChild(createTotalsDataRow('Somme supérieure', 'upper', boards, totalsByBoard));
    tbody.appendChild(createTotalsDataRow('Bonus (≥ 63)', 'bonusStatus', boards, totalsByBoard, true));
    tbody.appendChild(createTotalsDataRow('Total supérieur', 'upperWithBonus', boards, totalsByBoard));

    tbody.appendChild(createSectionRow('Section inférieure', boards.length + 1));
    LOWER_CATEGORIES.forEach((category) => {
      tbody.appendChild(createCategoryDataRow(category, boards));
    });
    tbody.appendChild(createTotalsDataRow('Total inférieur', 'lower', boards, totalsByBoard));
    tbody.appendChild(createTotalsDataRow('Total général', 'grand', boards, totalsByBoard));

    table.appendChild(tbody);
    wrapper.appendChild(table);

    return wrapper;
  }

  function createBoardHeaderCell(board) {
    const th = document.createElement('th');
    th.scope = 'col';
    th.className = 'board-header-cell';
    th.dataset.boardId = board.id;

    const block = document.createElement('div');
    block.className = 'board-header-block';

    const initials = document.createElement('span');
    initials.className = 'board-initials';
    initials.dataset.boardId = board.id;
    initials.dataset.boardLabel = 'initials';
    initials.textContent = getBoardInitials(board.name);
    initials.title = board.name;
    initials.style.cursor = 'pointer';
    initials.addEventListener('click', () => {
      const newName = prompt('Nouveau nom:', board.name);
      if (newName && newName.trim()) {
        board.name = newName.trim();
        saveState();
        renderBoards();
      }
    });
    // block.appendChild(initials);

    const fullName = document.createElement('span');
    fullName.className = 'board-full-name';
    fullName.dataset.boardId = board.id;
    fullName.dataset.boardLabel = 'name';
    fullName.textContent = board.name;
    block.appendChild(fullName);

    th.appendChild(block);
    return th;
  }

  function createSectionRow(label, colSpan) {
    const row = document.createElement('tr');
    row.className = 'section-row';
    const cell = document.createElement('th');
    cell.scope = 'row';
    cell.colSpan = colSpan;
    cell.className = 'section-cell';
    cell.textContent = label;
    row.appendChild(cell);
    return row;
  }

  function createCategoryDataRow(category, boards) {
    const row = document.createElement('tr');
    row.className = 'score-row';

    const headerCell = document.createElement('th');
    headerCell.scope = 'row';
    headerCell.className = 'category-cell';
    const labelButton = document.createElement('button');
    labelButton.type = 'button';
    labelButton.className = 'category-button';
    labelButton.textContent = category.label;
    if (category.hint) {
      labelButton.dataset.tooltip = category.hint;
      labelButton.setAttribute('aria-label', `${category.label}. ${category.hint}`);
    } else {
      labelButton.setAttribute('aria-label', category.label);
    }
    headerCell.appendChild(labelButton);
    row.appendChild(headerCell);

    boards.forEach((board) => {
      row.appendChild(createScoreCell(board, category));
    });

    return row;
  }

  function createScoreCell(board, category) {
    const cell = document.createElement('td');
    cell.className = 'score-cell';
    cell.dataset.boardId = board.id;
    cell.dataset.boardType = board.type;
    cell.dataset.categoryId = category.id;
    const isFixed = typeof category.fixedScore === 'number';
    const crossedMap = board.crossed ?? (board.crossed = createEmptyMarks());
    const isCrossed = crossedMap[category.id];
    if (isCrossed) {
      cell.classList.add('score-cell-crossed');
    }

    const value = board.entries[category.id];
    const container = document.createElement('div');
    container.className = 'score-cell-content';

    if (isFixed) {
      const toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'score-fixed-toggle';
      toggle.dataset.action = 'toggle-fixed';
      toggle.dataset.boardId = board.id;
      toggle.dataset.boardType = board.type;
      toggle.dataset.categoryId = category.id;
      const isActive = value === category.fixedScore; // Removed crossed check
      toggle.textContent = isActive ? String(category.fixedScore) : '\u00A0';
      toggle.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      if (isActive) {
        toggle.classList.add('active');
      }
      if (isCrossed) {
        toggle.disabled = true;
      }
      container.appendChild(toggle);
    } else {
      const input = document.createElement('input');
      input.type = 'text';
      input.inputMode = 'numeric';
      input.pattern = '[0-9]*';
      input.placeholder = '';
      input.autocomplete = 'off';
      input.className = 'score-input';
      input.value = value ?? '';
      input.dataset.boardId = board.id;
      input.dataset.boardType = board.type;
      input.dataset.categoryId = category.id;
      if (isCrossed) {
        input.readOnly = true;
        input.value = '';
        input.classList.add('score-input-crossed');
      }
      container.appendChild(input);
    }

    cell.appendChild(container);
    return cell;
  }

  function createTotalsDataRow(label, key, boards, totalsByBoard, isBonus = false) {
    const row = document.createElement('tr');
    let rowClass = `score-row totals-row`;
    if (isBonus) {
      rowClass += ' totals-row-bonus';
    } else if (key === 'bonusAdvance') {
      rowClass += ' totals-row-advance';
    }
    row.className = rowClass;

    const headerCell = document.createElement('th');
    headerCell.scope = 'row';
    headerCell.className = 'category-cell';
    headerCell.textContent = label;
    row.appendChild(headerCell);

    boards.forEach((board) => {
      const cell = document.createElement('td');
      cell.className = 'total-cell';
      const value = document.createElement('span');
      value.className = 'total-value';
      value.dataset.total = key;
      value.dataset.boardId = board.id;
      const totals = totalsByBoard[board.id];
      if (key === 'bonusStatus') {
        const status = totals.bonusStatus;
        renderBonusStatus(value, status, board);
      } else {
        renderTotalValue(value, key, totals[key]);
      }
      cell.appendChild(value);
      row.appendChild(cell);
    });

    return row;
  }

  function computeAllTotals(boards) {
    return boards.reduce((accumulator, board) => {
      accumulator[board.id] = computeTotals(board.entries, board.crossed);
      return accumulator;
    }, {});
  }

  function computeTotals(entries, crossed) {
    const upper = UPPER_CATEGORIES.reduce((total, category) => total + (entries[category.id] ?? 0), 0);
    const bonusAdvance = UPPER_CATEGORIES.reduce((total, category) => {
      const score = entries[category.id];
      if (crossed[category.id]) {
        return total - 3 * category.number;
      } else if (score != null) {
        return total + score - 3 * category.number;
      } else {
        return total;
      }
    }, 0);
    const isUpperComplete = UPPER_CATEGORIES.every(cat => entries[cat.id] != null || crossed[cat.id]);
    const lower = LOWER_CATEGORIES.reduce((total, category) => total + (entries[category.id] ?? 0), 0);
    const bonus = upper >= 63 ? 35 : 0;
    const upperWithBonus = upper + bonus;
    const grand = upperWithBonus + lower;
    // For bonus status
    let bonusStatus;
    if (!isUpperComplete) {
      bonusStatus = { type: 'advance', value: bonusAdvance };
    } else {
      bonusStatus = { type: 'final', value: bonus > 0 };
    }
    return { upper, bonusAdvance, lower, bonus, upperWithBonus, grand, bonusStatus };
  }

  function computeMaxRemainingAdvance(board) {
    const remainingCats = UPPER_CATEGORIES.filter(cat => board.entries[cat.id] == null && !board.crossed[cat.id]);
    return remainingCats.reduce((sum, cat) => sum + 2 * cat.number, 0);
  }

  function renderBonusStatus(element, status, board) {
    element.style.color = '';
    if (status.type === 'advance') {
      if (status.value === 0 && UPPER_CATEGORIES.every(cat => board.entries[cat.id] == null)) {
        element.textContent = '';
      } else {
        element.textContent = status.value > 0 ? `+${status.value}` : status.value;
        if (status.value > 0) {
          element.style.color = 'green';
        } else {
          const maxRemainingAdvance = computeMaxRemainingAdvance(board);
          if (status.value + maxRemainingAdvance >= 0) {
            element.style.color = 'orange';
          } else {
            element.style.color = 'red';
          }
        }
      }
    } else {
      element.textContent = status.value ? '✓' : '✗';
      element.style.color = status.value ? 'green' : 'red';
    }
  }

  function renderTotalValue(element, key, value) {
    let displayValue = value;
    if (key === 'bonusAdvance') {
      displayValue = value > 0 ? `+${value}` : value;
    }
    element.textContent = displayValue;
    if (key === 'bonus') {
      element.classList.toggle('bonus-zero', value === 0);
    }
  }

  function getBoardContext(boardId, boardType) {
    const collection = state.boards[boardType];
    if (!Array.isArray(collection)) {
      return null;
    }
    const index = collection.findIndex((board) => board.id === boardId);
    if (index === -1) {
      return null;
    }
    return { collection, board: collection[index], index };
  }

  function resetBoardEntries(board) {
    ALL_CATEGORIES.forEach((category) => {
      board.entries[category.id] = null;
      if (board.crossed) {
        board.crossed[category.id] = false;
      }
    });
  }

  function updateBoardTotalsUI(board) {
    const totals = computeTotals(board.entries, board.crossed);
    const totalMap = {
      upper: totals.upper,
      bonusAdvance: totals.bonusAdvance,
      bonus: totals.bonus,
      upperWithBonus: totals.upperWithBonus,
      lower: totals.lower,
      grand: totals.grand,
      bonusStatus: totals.bonusStatus
    };
    Object.entries(totalMap).forEach(([key, value]) => {
      boardsContainer.querySelectorAll(`[data-total="${key}"][data-board-id="${board.id}"]`).forEach((target) => {
        if (key === 'bonusStatus') {
          const status = value;
          renderBonusStatus(target, status, board);
        } else {
          renderTotalValue(target, key, value);
        }
      });
    });
  }

  function createDefaultState() {
    return {
      mode: 'multiplayer',
      boards: {
        multiplayer: [createBoard('Joueur 1', 'multiplayer')],
        multipiste: DEFAULT_TRACKS.map((name) => createBoard(name, 'multipiste'))
      }
    };
  }

  function ensureDefaultBoards() {
    if (!state.boards.multiplayer.length) {
      state.boards.multiplayer.push(createBoard(`Joueur ${state.boards.multiplayer.length + 1}`, 'multiplayer'));
    }
    if (!state.boards.multipiste.length) {
      state.boards.multipiste = DEFAULT_TRACKS.map((name) => createBoard(name, 'multipiste'));
    }
  }

  function createBoard(name, type) {
    return {
      id: generateId(),
      type,
      name,
      entries: createEmptyEntries(),
      crossed: createEmptyMarks(),
      createdAt: Date.now()
    };
  }

  function createEmptyEntries() {
    return ALL_CATEGORIES.reduce((accumulator, category) => {
      accumulator[category.id] = null;
      return accumulator;
    }, {});
  }

  function createEmptyMarks() {
    return ALL_CATEGORIES.reduce((accumulator, category) => {
      accumulator[category.id] = false;
      return accumulator;
    }, {});
  }

  function generateId() {
    return `board-${Math.random().toString(16).slice(2)}-${Date.now()}`;
  }

  function getBoardInitials(name) {
    const safeName = typeof name === 'string' ? name.trim() : '';
    if (!safeName) {
      return '?';
    }
    const tokens = safeName.split(/\s+/).filter(Boolean);
    let initials = tokens.map((token) => token[0]).join('');
    if (!initials) {
      initials = safeName.slice(0, 2);
    }
    initials = initials.slice(0, 3).toUpperCase();
    return initials || '?';
  }

  function loadState() {
    if (!storageAvailable) {
      return null;
    }
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return null;
      }
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') {
        return null;
      }
      const mode = parsed.mode === 'multipiste' ? 'multipiste' : 'multiplayer';
      const boards = {
        multiplayer: Array.isArray(parsed.boards?.multiplayer)
          ? parsed.boards.multiplayer.map((board, index) => sanitizeBoard(board, `Joueur ${index + 1}`, 'multiplayer'))
          : [],
        multipiste: Array.isArray(parsed.boards?.multipiste)
          ? parsed.boards.multipiste.map((board, index) => {
            const fallback = DEFAULT_TRACKS[index] ?? `Piste ${index + 1}`;
            return sanitizeBoard(board, fallback, 'multipiste');
          })
          : []
      };
      return { mode, boards };
    } catch (error) {
      console.warn('Impossible de charger les scores précédents :', error);
      return null;
    }
  }

  function saveState() {
    if (!storageAvailable) {
      return;
    }
    try {
      const payload = JSON.stringify({
        mode: state.mode,
        boards: state.boards
      });
      window.localStorage.setItem(STORAGE_KEY, payload);
    } catch (error) {
      console.warn('Impossible de sauvegarder les scores :', error);
    }
  }

  function sanitizeBoard(raw, fallbackName, enforcedType) {
    const sanitized = {
      id: typeof raw?.id === 'string' ? raw.id : generateId(),
      type: enforcedType,
      name: typeof raw?.name === 'string' && raw.name.trim() ? raw.name.trim() : fallbackName,
      entries: createEmptyEntries(),
      crossed: createEmptyMarks(),
      createdAt: typeof raw?.createdAt === 'number' ? raw.createdAt : Date.now()
    };
    const sourceEntries = raw?.entries ?? {};
    const sourceCrossed = raw?.crossed ?? {};
    ALL_CATEGORIES.forEach((category) => {
      const value = sourceEntries[category.id];
      const numeric = Number(value);
      if (sourceCrossed[category.id]) {
        sanitized.entries[category.id] = null;
        sanitized.crossed[category.id] = true;
        return;
      }
      sanitized.entries[category.id] = Number.isFinite(numeric) && numeric > 0 ? Math.min(999, Math.round(numeric)) : null;
    });
    return sanitized;
  }
})();
