(() => {
  'use strict';

  const APP_VERSION = 'v3.4';

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
    { id: 'fullHouse', label: 'Full House', hint: '25 points', fixedScore: 25 },
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
  const STORAGE_KEY = 'yams-scorekeeper-v3';
  const DEFAULT_TRACKS = ['Descente', 'Montée', 'Libre', 'Premier'];
  const THEME_STORAGE_KEY = 'yams-scorekeeper-theme';
  const THEMES = {
    LIGHT: 'light',
    DARK: 'dark'
  };

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

  const boardsContainer = document.querySelector('#boards');
  let crossModeToggleButton = document.querySelector('[data-action="toggle-cross-mode"]');

  console.log(`Yams Scorekeeper ${APP_VERSION}`);

  let state = loadState() ?? createDefaultState();
  let isCrossMode = false;
  let currentTheme = loadThemePreference();

  // Afficher la version dans le footer
  const versionElement = document.getElementById('app-version');
  if (versionElement) {
    versionElement.textContent = APP_VERSION;
  }

  applyTheme(currentTheme);
  render();

  // Header buttons
  document.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    const btn = target.closest('.header-btn, .editor-btn');
    const editor = document.getElementById('column-editor');

    if (btn && btn.dataset.action) {
      const action = btn.dataset.action;

      if (action === 'delete-tracks') {
        editor.setAttribute('hidden', '');
        if (confirm('Supprimer toutes les pistes ?')) {
          state.boards = [];
          saveState();
          render();
        }
        return;
      }

      if (action === 'reset-scores') {
        if (confirm('Vider toutes les grilles ?')) {
          state.boards.forEach(resetBoardEntries);
          saveState();
          renderBoards();
        }
        return;
      }

      if (action === 'add-track') {
        editor.setAttribute('hidden', '');
        const name = prompt('Nom du joueur:', `Joueur ${state.boards.length + 1}`);
        if (name && name.trim()) {
          state.boards.push(createBoard(name.trim()));
          saveState();
          renderBoards();
        }
        return;
      }

      if (action === 'add-three-tracks') {
        editor.setAttribute('hidden', '');
        if (confirm('Cela supprimera toutes les pistes actuelles et ajoutera les trois pistes classiques. Continuer ?')) {
          state.boards = ['Descente', 'Montée', 'Libre'].map((name) => createBoard(name));
          saveState();
          render();
        }
        return;
      }

      if (action === 'add-four-tracks') {
        editor.setAttribute('hidden', '');
        if (confirm('Cela supprimera toutes les pistes actuelles et ajoutera les quatre pistes classiques. Continuer ?')) {
          state.boards = DEFAULT_TRACKS.map((name) => createBoard(name));
          saveState();
          render();
        }
        return;
      }

      if (action === 'toggle-cross-mode') {
        setCrossMode(!isCrossMode, btn);
        return;
      }

      if (action === 'toggle-theme') {
        const nextTheme = currentTheme === THEMES.DARK ? THEMES.LIGHT : THEMES.DARK;
        setTheme(nextTheme);
        return;
      }

      if (action === 'edit-columns') {
        const isHidden = editor.hasAttribute('hidden');
        if (isHidden) {
          editor.removeAttribute('hidden');
        } else {
          editor.setAttribute('hidden', '');
        }
        return;
      }
    }

    // Si on clique ailleurs (pas sur un bouton), fermer l'éditeur si ouvert
    const clickedInEditor = target.closest('#column-editor');
    if (!clickedInEditor && !editor.hasAttribute('hidden')) {
      editor.setAttribute('hidden', '');
    }
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
    const categoryId = input.dataset.categoryId;

    if (!boardId || !categoryId) {
      return;
    }

    const board = state.boards.find(b => b.id === boardId);
    if (!board) {
      return;
    }

    const crossedMap = board.crossed ?? (board.crossed = createEmptyMarks());
    crossedMap[categoryId] = false;
    const cell = input.closest('.score-cell');
    if (cell) {
      cell.classList.remove('score-cell-crossed');
    }
    input.disabled = false;
    input.classList.remove('score-input-crossed');
    const rawValue = input.value.trim();
    if (rawValue === '') {
      board.entries[categoryId] = null;
      saveState();
      updateBoardTotalsUI(board);
      return;
    }

    let numericValue = Number(rawValue.replace(',', '.'));
    if (!Number.isFinite(numericValue)) {
      input.value = '';
      board.entries[categoryId] = null;
      saveState();
      updateBoardTotalsUI(board);
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
    } else if (categoryId === 'chance') {
      isValid = numericValue >= 5 && numericValue <= 30;
    }

    input.classList.toggle('invalid', !isValid);

    if (!isValid) {
      return;
    }

    if (numericValue === 0) {
      board.entries[categoryId] = null;
      input.value = '';
      input.classList.remove('invalid');
      saveState();
      updateBoardTotalsUI(board);
      return;
    }

    board.entries[categoryId] = numericValue;
    input.value = String(numericValue);
    input.classList.remove('invalid');
    saveState();
    updateBoardTotalsUI(board);
  });

  boardsContainer.addEventListener('click', (event) => {
    const button = event.target instanceof HTMLElement ? event.target.closest('[data-action]') : null;
    if (!button) {
      if (isCrossMode && event.target.closest('.score-cell')) {
        const cell = event.target.closest('.score-cell');
        const boardId = cell.dataset.boardId;
        const categoryId = cell.dataset.categoryId;
        const board = state.boards.find(b => b.id === boardId);
        if (board) {
          const crossedMap = board.crossed ?? (board.crossed = createEmptyMarks());
          crossedMap[categoryId] = !crossedMap[categoryId];
          if (crossedMap[categoryId]) {
            board.entries[categoryId] = null;
          }
          saveState();
          renderBoards();
          setCrossMode(false);
        }
      }
      return;
    }
    const boardId = button.dataset.boardId;
    const action = button.dataset.action;

    if (!boardId || !action) {
      return;
    }

    const board = state.boards.find(b => b.id === boardId);
    if (!board) {
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
      const crossedMap = board.crossed ?? (board.crossed = createEmptyMarks());
      if (isCrossMode) {
        crossedMap[categoryId] = !crossedMap[categoryId];
        if (crossedMap[categoryId]) {
          board.entries[categoryId] = null;
        }
        saveState();
        renderBoards();
        setCrossMode(false);
        return;
      }
      if (crossedMap[categoryId]) {
        crossedMap[categoryId] = false;
        board.entries[categoryId] = null;
      } else {
        const isActive = board.entries[categoryId] === category.fixedScore;
        board.entries[categoryId] = isActive ? null : category.fixedScore;
      }
      saveState();
      renderBoards();
      return;
    }
  });

  function setTheme(theme) {
    const normalized = theme === THEMES.DARK ? THEMES.DARK : THEMES.LIGHT;
    applyTheme(normalized);
    saveThemePreference(normalized);
  }

  function applyTheme(theme) {
    const normalized = theme === THEMES.DARK ? THEMES.DARK : THEMES.LIGHT;
    currentTheme = normalized;
    const body = document.body;
    if (body) {
      body.classList.toggle('theme-dark', normalized === THEMES.DARK);
      body.classList.toggle('theme-light', normalized !== THEMES.DARK);
    }
    updateThemeToggleButton(normalized);
  }

  function updateThemeToggleButton(theme) {
    const button = document.querySelector('[data-action="toggle-theme"]');
    if (!button) {
      return;
    }
    const isDark = theme === THEMES.DARK;
    button.textContent = isDark ? 'Mode clair' : 'Mode sombre';
    button.setAttribute('aria-pressed', isDark ? 'true' : 'false');
    button.setAttribute('title', isDark ? 'Passer en mode clair' : 'Passer en mode sombre');
  }

  function loadThemePreference() {
    if (!storageAvailable) {
      return THEMES.LIGHT;
    }
    try {
      const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
      return stored === THEMES.DARK ? THEMES.DARK : THEMES.LIGHT;
    } catch (error) {
      console.warn('Impossible de charger le thème :', error);
      return THEMES.LIGHT;
    }
  }

  function saveThemePreference(theme) {
    if (!storageAvailable) {
      return;
    }
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch (error) {
      console.warn('Impossible de sauvegarder le thème :', error);
    }
  }

  function setCrossMode(active, sourceButton) {
    isCrossMode = !!active;
    if (sourceButton instanceof HTMLElement) {
      crossModeToggleButton = sourceButton;
    } else if (!crossModeToggleButton || !crossModeToggleButton.isConnected) {
      crossModeToggleButton = document.querySelector('[data-action="toggle-cross-mode"]');
    }
    const targetButton = crossModeToggleButton;
    if (targetButton) {
      targetButton.classList.toggle('active', isCrossMode);
    }
    if (document.body) {
      document.body.classList.toggle('cross-mode-active', isCrossMode);
    }
  }

  function render() {
    renderBoards();
  }

  function renderBoards() {
    const previousScrollLeft = boardsContainer.scrollLeft;
    const previousScrollTop = boardsContainer.scrollTop;
    const activeElement = document.activeElement;
    const focusInfo = (() => {
      if (
        activeElement instanceof HTMLInputElement &&
        activeElement.classList.contains('score-input') &&
        boardsContainer.contains(activeElement)
      ) {
        return {
          boardId: activeElement.dataset.boardId,
          categoryId: activeElement.dataset.categoryId,
          selectionStart: activeElement.selectionStart,
          selectionEnd: activeElement.selectionEnd
        };
      }
      return null;
    })();
    boardsContainer.innerHTML = '';
    if (!state.boards.length) {
      boardsContainer.appendChild(createEmptyState());
      return;
    }
    boardsContainer.appendChild(createScoreGrid(state.boards));
    boardsContainer.scrollLeft = previousScrollLeft;
    boardsContainer.scrollTop = previousScrollTop;
    if (focusInfo?.boardId && focusInfo?.categoryId) {
      const selector = `.score-input[data-board-id="${focusInfo.boardId}"][data-category-id="${focusInfo.categoryId}"]`;
      const nextInput = boardsContainer.querySelector(selector);
      if (nextInput instanceof HTMLInputElement && !nextInput.readOnly && !nextInput.disabled) {
        nextInput.focus();
        if (
          typeof focusInfo.selectionStart === 'number' &&
          typeof focusInfo.selectionEnd === 'number'
        ) {
          nextInput.setSelectionRange(focusInfo.selectionStart, focusInfo.selectionEnd);
        } else {
          const cursor = nextInput.value.length;
          nextInput.setSelectionRange(cursor, cursor);
        }
      }
    }
  }

  function createEmptyState() {
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
    headerRow.appendChild(categoryHeader);

    boards.forEach((board) => {
      headerRow.appendChild(createBoardHeaderCell(board));
    });

    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');

    // tbody.appendChild(createSectionRow('', boards.length + 1));
    UPPER_CATEGORIES.forEach((category) => {
      tbody.appendChild(createCategoryDataRow(category, boards));
    });
    tbody.appendChild(createTotalsDataRow('Score', 'upper', boards, totalsByBoard));
    tbody.appendChild(createTotalsDataRow('Bonus (≥ 63)', 'bonusStatus', boards, totalsByBoard, true));
    tbody.appendChild(createTotalsDataRow('Total supérieur', 'upperWithBonus', boards, totalsByBoard));

    tbody.appendChild(createSectionRow('', boards.length + 1));
    LOWER_CATEGORIES.forEach((category) => {
      tbody.appendChild(createCategoryDataRow(category, boards));
    });
    tbody.appendChild(createTotalsDataRow('Total inférieur', 'lower', boards, totalsByBoard));
    tbody.appendChild(createSectionRow('', boards.length + 1));
    tbody.appendChild(createTotalsDataRow('Total', 'grand', boards, totalsByBoard));
    if (boards.length > 1) {
      tbody.appendChild(createGlobalTotalRow(boards, totalsByBoard));
    }

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

    const fullName = document.createElement('span');
    fullName.className = 'board-full-name';
    fullName.dataset.boardId = board.id;
    fullName.dataset.boardLabel = 'name';
    fullName.textContent = board.name;
    fullName.style.cursor = 'pointer';
    fullName.addEventListener('click', () => {
      const newName = prompt('Nouveau nom:', board.name);
      if (newName && newName.trim()) {
        board.name = newName.trim();
        saveState();
        renderBoards();
      }
    });
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
      toggle.dataset.categoryId = category.id;
      const isActive = value === category.fixedScore;
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
      input.value = value === 0 ? '' : (value ?? '');
      input.dataset.boardId = board.id;
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
    }
    row.className = rowClass;

    const headerCell = document.createElement('th');
    headerCell.scope = 'row';
    headerCell.className = 'total-cell';
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
    const crossedMap = crossed || {};
    const upper = UPPER_CATEGORIES.reduce((total, category) => total + (entries[category.id] ?? 0), 0);
    const bonusAdvance = UPPER_CATEGORIES.reduce((total, category) => {
      const score = entries[category.id];
      if (crossedMap[category.id]) {
        return total - 3 * category.number;
      } else if (score != null) {
        return total + score - 3 * category.number;
      } else {
        return total;
      }
    }, 0);
    const isUpperComplete = UPPER_CATEGORIES.every(cat => entries[cat.id] != null || crossedMap[cat.id]);
    const lower = LOWER_CATEGORIES.reduce((total, category) => total + (entries[category.id] ?? 0), 0);
    const bonus = upper >= 63 ? 35 : 0;
    const upperWithBonus = upper + bonus;
    const grand = upperWithBonus + lower;
    let bonusStatus;
    if (!isUpperComplete) {
      bonusStatus = { type: 'advance', value: bonusAdvance };
    } else {
      bonusStatus = { type: 'final', value: bonus > 0 };
    }
    return { upper, bonusAdvance, lower, bonus, upperWithBonus, grand, bonusStatus };
  }

  function computeMaxRemainingAdvance(board) {
    const crossedMap = board.crossed || {};
    const remainingCats = UPPER_CATEGORIES.filter(cat => board.entries[cat.id] == null && !crossedMap[cat.id]);
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
      if (value > 0) {
        displayValue = `+${value}`;
      } else if (value === 0) {
        displayValue = '';
      }
    } else if (value === 0) {
      displayValue = '';
    }
    if (displayValue == null) {
      displayValue = '';
    }
    element.textContent = displayValue;
    if (key === 'bonus') {
      element.classList.toggle('bonus-zero', value === 0);
    }
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

    // Mise à jour du total global si plusieurs boards
    if (state.boards.length > 1) {
      const globalTotal = state.boards.reduce((sum, b) => {
        const bTotals = computeTotals(b.entries, b.crossed);
        return sum + (bTotals.grand || 0);
      }, 0);
      const globalCell = boardsContainer.querySelector('.global-total-cell .total-value');
      if (globalCell) {
        globalCell.textContent = globalTotal === 0 ? '' : String(globalTotal);
      }
    }
  }

  function createDefaultState() {
    return {
      boards: DEFAULT_TRACKS.map((name) => createBoard(name))
    };
  }

  function createBoard(name) {
    return {
      id: generateId(),
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
      const boards = Array.isArray(parsed.boards)
        ? parsed.boards.map((board, index) => sanitizeBoard(board, `J${index + 1}`))
        : [];
      return { boards };
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
      const payload = JSON.stringify({ boards: state.boards });
      window.localStorage.setItem(STORAGE_KEY, payload);
    } catch (error) {
      console.warn('Impossible de sauvegarder les scores :', error);
    }
  }

  function sanitizeBoard(raw, fallbackName) {
    const sanitized = {
      id: typeof raw?.id === 'string' ? raw.id : generateId(),
      name: typeof raw?.name === 'string' && raw.name.trim() ? raw.name.trim() : fallbackName,
      entries: createEmptyEntries(),
      crossed: createEmptyMarks(),
      createdAt: typeof raw?.createdAt === 'number' ? raw.createdAt : Date.now()
    };
    const sourceEntries = raw?.entries ?? {};
    const sourceCrossed = raw?.crossed ?? {};
    ALL_CATEGORIES.forEach((category) => {
      const value = sourceEntries[category.id];
      if (sourceCrossed[category.id]) {
        sanitized.entries[category.id] = null;
        sanitized.crossed[category.id] = true;
        return;
      }
      if (typeof value === 'string' && value.trim() === '') {
        sanitized.entries[category.id] = null;
        return;
      }
      const numeric = Number(value);
      if (Number.isFinite(numeric) && numeric >= 0) {
        const normalized = Math.min(999, Math.max(0, Math.round(numeric)));
        sanitized.entries[category.id] = normalized;
      } else {
        sanitized.entries[category.id] = null;
      }
    });
    return sanitized;
  }

  function createGlobalTotalRow(boards, totalsByBoard) {
    const row = document.createElement('tr');
    row.className = 'score-row totals-row global-total-row';

    const headerCell = document.createElement('th');
    headerCell.scope = 'row';
    headerCell.className = 'total-cell';
    headerCell.textContent = 'Somme des pistes';
    row.appendChild(headerCell);

    const globalTotal = boards.reduce((sum, board) => sum + (totalsByBoard[board.id].grand || 0), 0);

    const totalCell = document.createElement('td');
    totalCell.className = 'total-cell global-total-cell';
    totalCell.colSpan = boards.length;
    const value = document.createElement('span');
    value.className = 'total-value';
    value.textContent = globalTotal === 0 ? '' : String(globalTotal);
    totalCell.appendChild(value);
    row.appendChild(totalCell);

    return row;
  }
})();
