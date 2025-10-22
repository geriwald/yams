(() => {
  'use strict';

  const UPPER_CATEGORIES = [
    { id: 'ones', label: 'As', hint: 'Total des dés à 1' },
    { id: 'twos', label: 'Deux', hint: 'Total des dés à 2' },
    { id: 'threes', label: 'Trois', hint: 'Total des dés à 3' },
    { id: 'fours', label: 'Quatre', hint: 'Total des dés à 4' },
    { id: 'fives', label: 'Cinq', hint: 'Total des dés à 5' },
    { id: 'sixes', label: 'Six', hint: 'Total des dés à 6' }
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
  const DEFAULT_TRACKS = ['Descente', 'Montée', 'Hasard', 'Premier'];

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
    crossedMap[categoryId] = false;
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

    context.board.entries[categoryId] = numericValue;
    input.value = String(numericValue);
    saveState();
    updateBoardTotalsUI(context.board);
  });

  boardsContainer.addEventListener('click', (event) => {
    const button = event.target instanceof HTMLElement ? event.target.closest('[data-action]') : null;
    if (!button) {
      const targetElement = event.target instanceof HTMLElement ? event.target : null;
      if (!targetElement) {
        return;
      }
      const cell = targetElement.closest('.score-cell');
      if (!cell) {
        return;
      }
      if (targetElement.closest('.score-input') || targetElement.closest('.score-fixed-toggle')) {
        return;
      }
      const boardId = cell.dataset.boardId;
      const boardType = cell.dataset.boardType ?? state.mode;
      const categoryId = cell.dataset.categoryId;
      if (!boardId || !boardType || !categoryId) {
        return;
      }
      const context = getBoardContext(boardId, boardType);
      if (!context) {
        return;
      }
      const crossedMap = context.board.crossed ?? (context.board.crossed = createEmptyMarks());
      const currentlyCrossed = Boolean(crossedMap[categoryId]);
      if (currentlyCrossed) {
        crossedMap[categoryId] = false;
        context.board.entries[categoryId] = null;
      } else {
        crossedMap[categoryId] = true;
        context.board.entries[categoryId] = 0;
      }
      saveState();
      renderBoards();
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
      const isActive = !context.board.crossed?.[categoryId] && context.board.entries[categoryId] === category.fixedScore;
      context.board.crossed[categoryId] = false;
      context.board.entries[categoryId] = isActive ? null : category.fixedScore;
      saveState();
      renderBoards();
      return;
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
    const message = mode === 'multipiste'
      ? 'Ajoutez vos pistes (Descente, Montée, Hasard, Premier) pour commencer.'
      : 'Ajoutez vos joueurs pour lancer la partie.';
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

    // tbody.appendChild(createSectionRow('Section supérieure', boards.length + 1));
    UPPER_CATEGORIES.forEach((category) => {
      tbody.appendChild(createCategoryDataRow(category, boards));
    });
    tbody.appendChild(createTotalsDataRow('Somme supérieure', 'upper', boards, totalsByBoard));
    tbody.appendChild(createTotalsDataRow('Bonus (≥ 63)', 'bonus', boards, totalsByBoard, true));
    tbody.appendChild(createTotalsDataRow('Total supérieur', 'upperWithBonus', boards, totalsByBoard));

    // tbody.appendChild(createSectionRow('Section inférieure', boards.length + 1));
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
    block.appendChild(initials);

    // const fullName = document.createElement('span');
    // fullName.className = 'board-full-name';
    // fullName.dataset.boardId = board.id;
    // fullName.dataset.boardLabel = 'name';
    // fullName.textContent = board.name;
    // block.appendChild(fullName);

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
    const isCrossed = Boolean(crossedMap[category.id]);
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
      const isActive = !isCrossed && value === category.fixedScore;
      toggle.textContent = isActive ? String(category.fixedScore) : ' ';
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
        input.disabled = true;
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
    row.className = `score-row totals-row${isBonus ? ' totals-row-bonus' : ''}`;

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
      value.textContent = totals[key];
      if (key === 'bonus' && totals[key] === 0) {
        value.classList.add('bonus-zero');
      }
      cell.appendChild(value);
      row.appendChild(cell);
    });

    return row;
  }

  function computeAllTotals(boards) {
    return boards.reduce((accumulator, board) => {
      accumulator[board.id] = computeTotals(board.entries);
      return accumulator;
    }, {});
  }

  function computeTotals(entries) {
    const upper = UPPER_CATEGORIES.reduce((total, category) => total + (entries[category.id] ?? 0), 0);
    const lower = LOWER_CATEGORIES.reduce((total, category) => total + (entries[category.id] ?? 0), 0);
    const bonus = upper >= 63 ? 35 : 0;
    const upperWithBonus = upper + bonus;
    const grand = upperWithBonus + lower;
    return { upper, lower, bonus, upperWithBonus, grand };
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
    const totals = computeTotals(board.entries);
    const totalMap = {
      upper: totals.upper,
      bonus: totals.bonus,
      upperWithBonus: totals.upperWithBonus,
      lower: totals.lower,
      grand: totals.grand
    };
    Object.entries(totalMap).forEach(([key, value]) => {
      boardsContainer.querySelectorAll(`[data-total="${key}"][data-board-id="${board.id}"]`).forEach((target) => {
        target.textContent = value;
        if (key === 'bonus') {
          target.classList.toggle('bonus-zero', value === 0);
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
        sanitized.entries[category.id] = 0;
        sanitized.crossed[category.id] = true;
        return;
      }
      sanitized.entries[category.id] = Number.isFinite(numeric) && numeric >= 0 ? Math.min(999, Math.round(numeric)) : null;
    });
    return sanitized;
  }
})();
