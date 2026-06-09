const STORAGE_KEY = "maltameokgi-last-session";
const STARRED_STORAGE_KEY = "maltameokgi-starred-questions";
const ADMIN_MODE_STORAGE_KEY = "maltameokgi-admin-mode";
const ADMIN_ACCESS_CODE = "c2h1j3h6@76";
const THEME_STORAGE_KEY = "maltameokgi-theme-mode";
const STORAGE_RETENTION_DAYS = 30;

const state = {
  dataset: null,
  items: [],
  aliasDictionary: {},
  currentQuickRange: "all",
  quizItems: [],
  currentIndex: 0,
  attempts: [],
  wrongAnswers: [],
  answerSubmitted: false,
  currentSelection: null,
  viewingHistory: false,
  usedHintForCurrent: false,
  loadedHistorySession: null,
  datasetReady: false,
  allowShiftLineBreak: false,
  nextEnterAllowedAt: 0,
  adminMode: false,
  starredIds: new Set(),
  secretAdminClickCount: 0,
  secretAdminTimer: null,
};

const homeView = document.querySelector("#home-view");
const quizView = document.querySelector("#quiz-view");
const resultView = document.querySelector("#result-view");
const datasetCount = document.querySelector("#dataset-count");
const volumeStats = document.querySelector("#volume-stats");
const selectionPreview = document.querySelector("#selection-preview");
const startInput = document.querySelector("#start-id");
const endInput = document.querySelector("#end-id");
const orderModeSelect = document.querySelector("#order-mode");
const questionLimitInput = document.querySelector("#question-limit");
const questionLimitNumberInput = document.querySelector("#question-limit-number");
const questionLimitValue = document.querySelector("#question-limit-value");
const questionLimitRange = document.querySelector("#question-limit-range");
const historyCard = document.querySelector("#history-card");
const historySummary = document.querySelector("#history-summary");
const loadHistoryButton = document.querySelector("#load-history-button");
const retryHistoryWrongButton = document.querySelector("#retry-history-wrong-button");
const pdfCardGrid = document.querySelector("#pdf-card-grid");
const startQuizButton = document.querySelector("#start-quiz-button");
const adminModeButton = document.querySelector("#admin-mode-button");
const secretAdminTrigger = document.querySelector("#secret-admin-trigger");
const startStarredButton = document.querySelector("#start-starred-button");
const startSelectedStarredButton = document.querySelector("#start-selected-starred-button");
const starredSummary = document.querySelector("#starred-summary");
const starredList = document.querySelector("#starred-list");
const starredLimitInput = document.querySelector("#starred-limit");
const starredLimitNumberInput = document.querySelector("#starred-limit-number");
const starredLimitValue = document.querySelector("#starred-limit-value");
const starredLimitRange = document.querySelector("#starred-limit-range");
const starredSelectedCount = document.querySelector("#starred-selected-count");
const starredSelectAllButton = document.querySelector("#starred-select-all-button");
const starredClearSelectionButton = document.querySelector("#starred-clear-selection-button");
const themeModeToggle = document.querySelector("#theme-mode-toggle");
const themeModeLabel = document.querySelector("#theme-mode-label");

const questionIdBadge = document.querySelector("#question-id-badge");
const questionSourceBadge = document.querySelector("#question-source-badge");
const starCurrentButton = document.querySelector("#star-current-button");
const questionText = document.querySelector("#question-text");
const sourceStudyText = document.querySelector("#source-study-text");
const openSourceLink = document.querySelector("#open-source-link");
const hintBox = document.querySelector("#hint-box");
const answerInput = document.querySelector("#answer-input");
const feedbackCard = document.querySelector("#feedback-card");
const feedbackState = document.querySelector("#feedback-state");
const feedbackMessage = document.querySelector("#feedback-message");
const userAnswerOutput = document.querySelector("#user-answer-output");
const correctAnswerOutput = document.querySelector("#correct-answer-output");
const openReportButton = document.querySelector("#open-report-button");
const reportPanel = document.querySelector("#report-panel");
const reportMessageInput = document.querySelector("#report-message-input");
const copyReportButton = document.querySelector("#copy-report-button");
const submitReportButton = document.querySelector("#submit-report-button");
const closeReportButton = document.querySelector("#close-report-button");
const progressText = document.querySelector("#quiz-progress-text");
const wrongCountText = document.querySelector("#wrong-count-text");
const progressBar = document.querySelector("#quiz-progress-bar");

const resultTotal = document.querySelector("#result-total");
const resultCorrect = document.querySelector("#result-correct");
const resultWrong = document.querySelector("#result-wrong");
const wrongNoteList = document.querySelector("#wrong-note-list");

const REPORT_FORM_URL = "https://docs.google.com/forms/d/e/1FAIpQLSfKJu3AZGdbeY6Ta4Zfa7kV3hRhUJbN2oV5mlZ6a8LUjoLhXw/viewform";
const REPORT_FORM_FIELDS = {
  target: "entry.794287955",
  type: "entry.922210023",
  detail: "entry.960008490",
};
const DEFAULT_REPORT_TYPE = "정답이 잘못 설정되어 있습니다 (제가 입력한 정답이 맞는데 오답 처리됨)";

const PDF_LIBRARY = {
  1: {
    title: "토목기사 실기 말따먹기 1권",
    subtitle: "1권",
    description: "문제 해설 단어장 PDF",
    href: "./pdfs/volume1.pdf?v=20260525-3",
  },
  2: {
    title: "토목기사 실기 말따먹기 2권",
    subtitle: "2권",
    description: "문제 해설 단어장 PDF",
    href: "./pdfs/volume2.pdf?v=20260513-3",
  },
  3: {
    title: "토목기사 실기 말따먹기 3권",
    subtitle: "3권",
    description: "문제 해설 단어장 PDF",
    href: "./pdfs/volume3.pdf?v=20260513-3",
  },
};

function switchView(viewName) {
  homeView.classList.toggle("active", viewName === "home");
  quizView.classList.toggle("active", viewName === "quiz");
  resultView.classList.toggle("active", viewName === "result");
}

function applyThemeMode(mode) {
  const resolvedMode = mode === "dark" ? "dark" : "light";
  document.body.classList.toggle("theme-dark", resolvedMode === "dark");

  if (themeModeToggle) {
    themeModeToggle.setAttribute("aria-pressed", String(resolvedMode === "dark"));
  }

  if (themeModeLabel) {
    themeModeLabel.textContent = resolvedMode === "dark" ? "다크 모드" : "라이트 모드";
  }

  localStorage.setItem(THEME_STORAGE_KEY, resolvedMode);
}

function loadThemeMode() {
  return localStorage.getItem(THEME_STORAGE_KEY) === "dark" ? "dark" : "light";
}

function loadStarredIds() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STARRED_STORAGE_KEY) || "[]");
    return new Set(Array.isArray(parsed) ? parsed.filter(Boolean) : []);
  } catch {
    return new Set();
  }
}

function saveStarredIds() {
  localStorage.setItem(STARRED_STORAGE_KEY, JSON.stringify([...state.starredIds]));
}

function setAdminMode(isEnabled) {
  state.adminMode = Boolean(isEnabled);
  document.body.classList.toggle("admin-mode", state.adminMode);
  localStorage.setItem(ADMIN_MODE_STORAGE_KEY, state.adminMode ? "1" : "0");

  if (adminModeButton) {
    adminModeButton.classList.toggle("active", state.adminMode);
    adminModeButton.setAttribute("aria-pressed", String(state.adminMode));
    adminModeButton.textContent = state.adminMode ? "★" : "☆";
  }

  renderStarredSummary();
  updateStarButtonForCurrentQuestion();
}

function getStarredItems() {
  return state.items.filter((item) => state.starredIds.has(item.id));
}

function setStarredLimitValue(nextValue) {
  if (!starredLimitInput || !starredLimitNumberInput || !starredLimitValue) {
    return 0;
  }

  const max = Number(starredLimitInput.max) || 0;
  const parsedValue = toFiniteNumber(nextValue);
  const clampedValue = Math.min(Math.max(parsedValue ?? 0, 0), max);
  starredLimitInput.value = String(clampedValue);
  starredLimitNumberInput.value = String(clampedValue);
  starredLimitValue.textContent = `${clampedValue}문제`;
  return clampedValue;
}

function syncStarredLimitControl(count) {
  if (!starredLimitInput || !starredLimitNumberInput || !starredLimitRange) {
    return;
  }

  const previousMax = Number(starredLimitInput.max) || 0;
  const currentValue = toFiniteNumber(starredLimitNumberInput.value)
    ?? toFiniteNumber(starredLimitInput.value)
    ?? Math.min(30, count);
  const shouldUseDefault = previousMax === 0 && count > 0 && currentValue === 0;
  const nextValue = shouldUseDefault ? Math.min(30, count) : Math.min(currentValue, count);

  starredLimitInput.min = "0";
  starredLimitInput.max = String(count);
  starredLimitNumberInput.min = "0";
  starredLimitNumberInput.max = String(count);
  starredLimitRange.textContent = `0 ~ ${count}`;
  setStarredLimitValue(nextValue);
}

function getSelectedStarredItems() {
  if (!starredList) {
    return [];
  }

  return [...starredList.querySelectorAll("[data-starred-select]:checked")]
    .map((checkbox) => state.items.find((item) => item.id === checkbox.value))
    .filter(Boolean);
}

function updateStarredSelectedCount() {
  if (!starredSelectedCount || !startSelectedStarredButton) {
    return;
  }

  const selectedCount = getSelectedStarredItems().length;
  starredSelectedCount.textContent = `선택 ${selectedCount}개`;
  startSelectedStarredButton.disabled = selectedCount === 0;
}

function renderStarredLibrary(items) {
  if (!starredList) {
    return;
  }

  if (!items.length) {
    starredList.innerHTML = `<div class="empty-state">별표한 문제가 아직 없습니다.</div>`;
    updateStarredSelectedCount();
    return;
  }

  starredList.innerHTML = items
    .map((item) => `
      <label class="starred-list-item">
        <input type="checkbox" data-starred-select value="${escapeHtml(item.id)}" checked />
        <span class="starred-list-id">${escapeHtml(item.id)}</span>
        <span class="starred-list-question">${escapeHtml(item.question)}</span>
      </label>
    `)
    .join("");
  updateStarredSelectedCount();
}

function renderStarredSummary() {
  if (!starredSummary || !startStarredButton) {
    return;
  }

  const items = getStarredItems();
  const count = items.length;
  starredSummary.textContent = count
    ? `별표한 문제가 ${count}개 저장되어 있습니다. 이 기기에서만 보입니다.`
    : "별표한 문제가 아직 없습니다.";
  startStarredButton.disabled = count === 0;
  syncStarredLimitControl(count);
  renderStarredLibrary(items);
}

function updateStarButtonForCurrentQuestion() {
  if (!starCurrentButton || !state.quizItems.length) {
    return;
  }

  const item = state.quizItems[state.currentIndex];
  const isStarred = item ? state.starredIds.has(item.id) : false;
  starCurrentButton.classList.toggle("active", isStarred);
  starCurrentButton.setAttribute("aria-pressed", String(isStarred));
  starCurrentButton.textContent = isStarred ? "★ 별표됨" : "☆ 별표";
}

function toggleCurrentStarredQuestion() {
  const item = state.quizItems[state.currentIndex];
  if (!item) {
    return;
  }

  if (state.starredIds.has(item.id)) {
    state.starredIds.delete(item.id);
  } else {
    state.starredIds.add(item.id);
  }

  saveStarredIds();
  renderStarredSummary();
  updateStarButtonForCurrentQuestion();
}

function promptAdminMode() {
  if (state.adminMode) {
    setAdminMode(false);
    return;
  }

  const code = window.prompt("관리자 코드를 입력해 주세요.");
  if (code === ADMIN_ACCESS_CODE) {
    setAdminMode(true);
    return;
  }

  if (code !== null) {
    showToast("관리자 코드가 맞지 않습니다.");
  }
}

function handleSecretAdminTrigger(event) {
  event.preventDefault();
  event.stopPropagation();

  if (state.secretAdminTimer) {
    clearTimeout(state.secretAdminTimer);
    state.secretAdminTimer = null;
  }

  state.secretAdminClickCount += 1;

  if (state.secretAdminClickCount === 5) {
    state.secretAdminTimer = setTimeout(() => {
      state.secretAdminClickCount = 0;
      state.secretAdminTimer = null;
      promptAdminMode();
    }, 1000);
    return;
  }

  if (state.secretAdminClickCount > 5) {
    state.secretAdminClickCount = 0;
  }
}

function startStarredSession() {
  const itemsToStudy = getStarredItems();

  if (!itemsToStudy.length) {
    showToast("별표한 문제가 아직 없습니다.");
    return;
  }

  const limitValue = toFiniteNumber(starredLimitInput?.value) ?? itemsToStudy.length;
  if (limitValue < 1) {
    showToast("별표 문제 수를 1문제 이상으로 선택해 주세요.");
    return;
  }

  const finalItems = shuffle(itemsToStudy).slice(0, Math.min(limitValue, itemsToStudy.length));
  startQuizWithItems(finalItems, {
    label: `별표 전체 랜덤 · ${finalItems.length}문제`,
    orderMode: "random",
    quickRange: "starred",
    startId: finalItems[0]?.id ?? null,
    endId: finalItems[finalItems.length - 1]?.id ?? null,
    limit: finalItems.length,
  });
}

function startSelectedStarredSession() {
  const selectedItems = getSelectedStarredItems();

  if (!selectedItems.length) {
    showToast("선택한 별표 문제가 없습니다.");
    return;
  }

  const finalItems = shuffle(selectedItems);
  startQuizWithItems(finalItems, {
    label: `선택 별표 랜덤 · ${finalItems.length}문제`,
    orderMode: "random",
    quickRange: "starred-selected",
    startId: finalItems[0]?.id ?? null,
    endId: finalItems[finalItems.length - 1]?.id ?? null,
    limit: finalItems.length,
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function normalizeForLooseMatch(text) {
  return String(text).trim().replace(/[\s,·ㆍ.]/g, "").toLowerCase();
}

function normalizeForDisplay(text) {
  return String(text).trim().replace(/\s+/g, " ");
}

function toFiniteNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function deriveKoreanNounForm(text) {
  const normalized = normalizeForDisplay(text);
  if (!normalized.endsWith("다")) {
    return null;
  }

  const stem = normalized.slice(0, -1);
  const lastChar = stem.at(-1);
  if (!lastChar) {
    return null;
  }

  const code = lastChar.charCodeAt(0);
  if (code < 0xac00 || code > 0xd7a3) {
    return null;
  }

  const syllableIndex = code - 0xac00;
  const finalConsonantIndex = syllableIndex % 28;
  if (finalConsonantIndex === 0) {
    const withMieum = String.fromCharCode(code + 16);
    return `${stem.slice(0, -1)}${withMieum}`;
  }

  return `${stem}음`;
}

function getKoreanEndingVariants(text) {
  const normalized = normalizeForDisplay(text);
  const variants = new Set([normalized]);
  const nounForm = deriveKoreanNounForm(normalized);
  if (nounForm) {
    variants.add(nounForm);
  }
  return [...variants];
}

function parseId(text) {
  const match = String(text).trim().match(/^([1-3])-(\d+)$/);
  if (!match) {
    return null;
  }

  return {
    volume: Number(match[1]),
    order: Number(match[2]),
    raw: `${Number(match[1])}-${Number(match[2])}`,
  };
}

function compareIds(a, b) {
  if (a.volume !== b.volume) {
    return a.volume - b.volume;
  }
  return a.order - b.order;
}

function getVolumeLabel(item) {
  return `${item.volume}권 · p.${item.sourcePage}`;
}

function shuffle(items) {
  const list = [...items];
  for (let i = list.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

function parseUserAnswers(input) {
  const raw = String(input).trim();
  if (!raw) {
    return [];
  }

  return raw
    .split(/\n|,|\/|\|/g)
    .map((part) => normalizeForDisplay(part))
    .filter(Boolean);
}

function getAcceptedVariants(expectedToken) {
  const aliasEntry = state.aliasDictionary[expectedToken];
  const baseValues = aliasEntry?.acceptedAnswers?.length ? aliasEntry.acceptedAnswers : [expectedToken];
  const variants = new Set();

  for (const value of baseValues) {
    for (const variant of getKoreanEndingVariants(value)) {
      variants.add(variant);
    }
  }

  return [...variants].map((value) => normalizeForDisplay(value));
}

function tokenMatches(expectedToken, userToken) {
  const acceptedVariants = getAcceptedVariants(expectedToken);

  for (const variant of acceptedVariants) {
    if (normalizeForDisplay(variant) === normalizeForDisplay(userToken)) {
      return "exact";
    }
    if (normalizeForLooseMatch(variant) === normalizeForLooseMatch(userToken)) {
      return "whitespace";
    }
  }

  return "none";
}

function countEmbeddedAnswerMatches(expectedTokens, rawInput) {
  const normalizedInput = normalizeForLooseMatch(rawInput);
  let matchedCount = 0;

  for (const expectedToken of expectedTokens) {
    const acceptedVariants = getAcceptedVariants(expectedToken)
      .map((variant) => normalizeForLooseMatch(variant))
      .filter((variant) => variant.length >= 2);

    if (acceptedVariants.some((variant) => normalizedInput.includes(variant))) {
      matchedCount += 1;
    }
  }

  return matchedCount;
}

function usesParticleTolerantMatching(item) {
  return item.volume > 1 || (item.volume === 1 && item.order >= 156);
}

function stripKoreanParticle(word) {
  const normalized = String(word).toLowerCase();
  if (!/[가-힣]/.test(normalized)) {
    return normalized;
  }

  const particles = [
    "으로부터", "에게서", "에서부터", "으로서", "으로써", "로부터",
    "까지도", "까지는", "까지를", "까지가", "까지의", "까지에", "까지", "부터",
    "에서는", "에서의", "에서가", "에서를", "에는", "에도", "에의",
    "에게", "에서", "보다", "처럼", "마다", "조차", "마저", "이라도", "라도",
    "이나", "나", "이며", "이고", "으로", "하고", "와", "과", "은", "는",
    "이", "가", "을", "를", "의", "에", "로", "만", "랑"
  ];

  for (const particle of particles) {
    if (normalized.length - particle.length >= 2 && normalized.endsWith(particle)) {
      return normalized.slice(0, -particle.length);
    }
  }

  return normalized;
}

function stemKoreanKeyword(word) {
  let stem = stripKoreanParticle(word);
  if (!/[가-힣]/.test(stem)) {
    return stem;
  }

  const suffixRules = [
    ["시킨다", ""], ["시킴", ""], ["시켜", ""],
    ["한다", ""], ["하다", ""], ["되었다", ""], ["된다", ""], ["되다", ""],
    ["하였다", ""], ["하여", ""], ["하며", ""], ["하고", ""],
    ["이다", ""], ["있다", ""], ["없다", ""],
    ["같게", "같"], ["같다", "같"], ["같음", "같"],
    ["크게", "크"], ["크다", "크"], ["큼", "크"],
    ["작게", "작"], ["작다", "작"], ["적게", "적"], ["적다", "적"],
    ["많게", "많"], ["많다", "많"], ["많음", "많"],
    ["높게", "높"], ["높다", "높"], ["낮게", "낮"], ["낮다", "낮"],
    ["짧게", "짧"], ["짧다", "짧"], ["짧아", "짧"],
    ["길게", "길"], ["길다", "길"],
  ];

  for (const [suffix, replacement] of suffixRules) {
    if (stem.length - suffix.length >= 1 && stem.endsWith(suffix)) {
      stem = `${stem.slice(0, -suffix.length)}${replacement}`;
      break;
    }
  }

  return stem;
}

function extractParticleTolerantKeywords(text) {
  const stopwords = new Set(["그리고", "또는", "및", "대한", "관한", "위한", "경우", "사용", "실시"]);
  return String(text)
    .split(/[^0-9A-Za-z가-힣]+/g)
    .map((word) => stemKoreanKeyword(word))
    .map((word) => word.replace(/^(제|각)$/, ""))
    .filter((word) => word.length >= 2 && !stopwords.has(word));
}

function normalizeParticleTolerantInput(text) {
  return extractParticleTolerantKeywords(text).join("");
}

function particleKeywordVariantMatches(variant, normalizedInput) {
  const keywords = extractParticleTolerantKeywords(variant);
  if (!keywords.length) {
    return false;
  }

  return keywords.every((keyword) => normalizedInput.includes(keyword));
}

function countParticleTolerantAnswerMatches(item, expectedTokens, rawInput) {
  if (!usesParticleTolerantMatching(item)) {
    return 0;
  }

  const normalizedInput = normalizeParticleTolerantInput(rawInput);
  let matchedCount = 0;

  for (const expectedToken of expectedTokens) {
    const acceptedVariants = getAcceptedVariants(expectedToken);
    if (acceptedVariants.some((variant) => particleKeywordVariantMatches(variant, normalizedInput))) {
      matchedCount += 1;
    }
  }

  return matchedCount;
}

function keywordRequirementMatches(requirement, normalizedInput) {
  const options = Array.isArray(requirement) ? requirement : [requirement];
  return options.some((option) => normalizeForLooseMatch(option) && normalizedInput.includes(normalizeForLooseMatch(option)));
}

function countKeywordAnswerGroupMatches(keywordAnswerGroups, rawInput) {
  if (!Array.isArray(keywordAnswerGroups) || !keywordAnswerGroups.length) {
    return 0;
  }

  const normalizedInput = normalizeForLooseMatch(rawInput);
  return keywordAnswerGroups.filter((group) => (
    Array.isArray(group) &&
    group.length > 0 &&
    group.every((requirement) => keywordRequirementMatches(requirement, normalizedInput))
  )).length;
}

function getSectionText(normalizedInput, startAliases, otherAliases) {
  const starts = startAliases
    .map((alias) => normalizeForLooseMatch(alias))
    .filter(Boolean)
    .map((alias) => normalizedInput.indexOf(alias))
    .filter((index) => index >= 0);

  if (!starts.length) {
    return "";
  }

  const start = Math.min(...starts);
  const ends = otherAliases
    .map((alias) => normalizeForLooseMatch(alias))
    .filter(Boolean)
    .map((alias) => normalizedInput.indexOf(alias, start + 1))
    .filter((index) => index > start);
  const end = ends.length ? Math.min(...ends) : normalizedInput.length;
  return normalizedInput.slice(start, end);
}

function countClassifiedAnswerMatches(classifiedAnswerGroups, rawInput) {
  if (!Array.isArray(classifiedAnswerGroups) || !classifiedAnswerGroups.length) {
    return 0;
  }

  const normalizedInput = normalizeForLooseMatch(rawInput);
  let matchedCount = 0;

  for (const group of classifiedAnswerGroups) {
    const ownAliases = group.labelAliases || [];
    const otherAliases = classifiedAnswerGroups
      .filter((candidate) => candidate !== group)
      .flatMap((candidate) => candidate.labelAliases || []);
    const sectionText = getSectionText(normalizedInput, ownAliases, otherAliases);
    if (!sectionText) {
      continue;
    }

    for (const term of group.requiredTerms || []) {
      if (keywordRequirementMatches(term, sectionText)) {
        matchedCount += 1;
      }
    }
  }

  return matchedCount;
}

function answerLineMatches(answerLine, rawInput) {
  for (const variant of getKoreanEndingVariants(answerLine)) {
    if (normalizeForDisplay(variant) === normalizeForDisplay(rawInput)) {
      return "exact";
    }
    if (normalizeForLooseMatch(variant) === normalizeForLooseMatch(rawInput)) {
      return "whitespace";
    }
  }
  return "none";
}

function buildCorrectMessage(requiredCount, matchedCount, hadWhitespaceOnlyMatch, expectedTokenCount, hasExplicitCount) {
  if (hadWhitespaceOnlyMatch) {
    return `정답으로 처리했습니다. ${matchedCount}개를 맞혔고, 띄어쓰기는 정답 표기와 다른 항목이 있습니다.`;
  }

  if (hasExplicitCount) {
    return `정답입니다. 문제에서 요구한 ${requiredCount}개를 맞혔습니다.`;
  }

  if (expectedTokenCount < 3) {
    return `정답입니다. 필요한 ${requiredCount}개를 모두 맞혔습니다.`;
  }

  return `정답입니다. ${matchedCount}개를 맞혀 최소 기준 3개를 충족했습니다.`;
}

function buildIncorrectMessage(requiredCount, matchedCount, expectedTokenCount, hasExplicitCount) {
  if (hasExplicitCount) {
    return `오답입니다. 이 문제는 ${requiredCount}개를 맞혀야 합니다. 현재 ${matchedCount}개를 맞혔습니다.`;
  }

  if (expectedTokenCount < 3) {
    return `오답입니다. 이 문제는 ${requiredCount}개를 모두 맞혀야 합니다.`;
  }

  return `오답입니다. 현재 ${matchedCount}개만 맞아서 최소 3개 기준에 못 미칩니다.`;
}

function judgeAnswer(item, rawInput) {
  const trimmedInput = String(rawInput).trim();
  if (!trimmedInput) {
    return {
      isCorrect: false,
      feedbackMode: "incorrect",
      message: "답안을 입력한 뒤 정답 확인을 눌러주세요.",
    };
  }

  const canAcceptSingleLineMatch = item.answerLines.length <= 1;
  const lineMatchTypes = item.answerLines.map((line) => answerLineMatches(line, trimmedInput));
  if (canAcceptSingleLineMatch && (lineMatchTypes.includes("exact") || lineMatchTypes.includes("whitespace"))) {
    const isWhitespaceOnly = !lineMatchTypes.includes("exact") && lineMatchTypes.includes("whitespace");
    return {
      isCorrect: true,
      feedbackMode: isWhitespaceOnly ? "warning" : "correct",
      message: isWhitespaceOnly
        ? "정답으로 처리했습니다. 다만 띄어쓰기는 정답 표기와 다르니 주의해주세요."
        : "정답입니다. 전체 답안을 정확히 입력했습니다.",
    };
  }

  const expectedTokens = item.answerTokens.map((token) => normalizeForDisplay(token)).filter(Boolean);
  const userTokens = parseUserAnswers(trimmedInput);
  const explicitRequiredCount = toFiniteNumber(item.requiredAnswerCount);
  const hasExplicitCount = Boolean(explicitRequiredCount && explicitRequiredCount > 0);
  const requiredCount = hasExplicitCount
    ? Math.min(explicitRequiredCount, expectedTokens.length)
    : expectedTokens.length < 3 ? expectedTokens.length : 3;

  if (item.strictAnswerMode === "exact-token") {
    const unusedUserTokens = [...userTokens];
    let directTokenMatchedCount = 0;
    let hadWhitespaceOnlyMatch = false;

    for (const expectedToken of expectedTokens) {
      const matchIndex = unusedUserTokens.findIndex((userToken) => tokenMatches(expectedToken, userToken) !== "none");
      if (matchIndex === -1) {
        continue;
      }

      const matchType = tokenMatches(expectedToken, unusedUserTokens[matchIndex]);
      if (matchType === "whitespace") {
        hadWhitespaceOnlyMatch = true;
      }
      directTokenMatchedCount += 1;
      unusedUserTokens.splice(matchIndex, 1);
    }

    return {
      isCorrect: directTokenMatchedCount >= requiredCount,
      feedbackMode: hadWhitespaceOnlyMatch && directTokenMatchedCount >= requiredCount ? "warning" : directTokenMatchedCount >= requiredCount ? "correct" : "incorrect",
      message: directTokenMatchedCount >= requiredCount
        ? buildCorrectMessage(requiredCount, directTokenMatchedCount, hadWhitespaceOnlyMatch, expectedTokens.length, hasExplicitCount)
        : buildIncorrectMessage(requiredCount, directTokenMatchedCount, expectedTokens.length, hasExplicitCount),
    };
  }

  if (item.strictAnswerMode === "exact-token-groups" && Array.isArray(item.strictAnswerGroups)) {
    const unusedUserTokens = [...userTokens];
    let directTokenMatchedCount = 0;
    let hadWhitespaceOnlyMatch = false;

    for (const group of item.strictAnswerGroups) {
      const variants = Array.isArray(group) ? group : [group];
      const matchIndex = unusedUserTokens.findIndex((userToken) => variants.some((variant) => tokenMatches(variant, userToken) !== "none"));
      if (matchIndex === -1) {
        continue;
      }

      const matchedVariant = variants.find((variant) => tokenMatches(variant, unusedUserTokens[matchIndex]) !== "none");
      const matchType = tokenMatches(matchedVariant, unusedUserTokens[matchIndex]);
      if (matchType === "whitespace") {
        hadWhitespaceOnlyMatch = true;
      }
      directTokenMatchedCount += 1;
      unusedUserTokens.splice(matchIndex, 1);
    }

    return {
      isCorrect: directTokenMatchedCount >= requiredCount,
      feedbackMode: hadWhitespaceOnlyMatch && directTokenMatchedCount >= requiredCount ? "warning" : directTokenMatchedCount >= requiredCount ? "correct" : "incorrect",
      message: directTokenMatchedCount >= requiredCount
        ? buildCorrectMessage(requiredCount, directTokenMatchedCount, hadWhitespaceOnlyMatch, expectedTokens.length, hasExplicitCount)
        : buildIncorrectMessage(requiredCount, directTokenMatchedCount, expectedTokens.length, hasExplicitCount),
    };
  }

  if (item.strictAnswerMode === "mandatory-sections" && Array.isArray(item.mandatoryAnswerSections)) {
    const normalizedInput = normalizeForLooseMatch(trimmedInput);
    const allAliases = item.mandatoryAnswerSections.flatMap((section) => section.labelAliases || []);
    let matchedCount = 0;
    let isCorrect = true;

    for (const section of item.mandatoryAnswerSections) {
      const ownAliases = section.labelAliases || [];
      const otherAliases = allAliases.filter((alias) => !ownAliases.includes(alias));
      const sectionText = getSectionText(normalizedInput, ownAliases, otherAliases);
      const groups = section.keywordAnswerGroups || [];
      const sectionMatchedCount = countKeywordAnswerGroupMatches(groups, sectionText);
      matchedCount += sectionMatchedCount;
      if (sectionMatchedCount < (section.requiredCount || 1)) {
        isCorrect = false;
      }
    }

    return {
      isCorrect,
      feedbackMode: isCorrect ? "correct" : "incorrect",
      message: isCorrect
        ? "정답입니다. 번호별 핵심 답안 기준을 모두 충족했습니다."
        : "오답입니다. 각 번호에 맞는 핵심 답안을 모두 작성해야 합니다.",
    };
  }

  if (expectedTokens.length <= 1) {
    const target = expectedTokens[0] ?? item.answerLines[0] ?? "";
    const matchType = tokenMatches(target, trimmedInput);
    const keywordMatchedCount = countKeywordAnswerGroupMatches(item.keywordAnswerGroups, trimmedInput);
    const classifiedMatchedCount = countClassifiedAnswerMatches(item.classifiedAnswerGroups, trimmedInput);
    const particleTolerantMatchedCount = countParticleTolerantAnswerMatches(item, [target], trimmedInput);
    const isKeywordMatch = matchType === "none" && Math.max(keywordMatchedCount, classifiedMatchedCount) >= 1;
    const isParticleTolerantMatch = matchType === "none" && particleTolerantMatchedCount >= 1;
    const isCorrect = matchType !== "none" || isKeywordMatch || isParticleTolerantMatch;
    return {
      isCorrect,
      feedbackMode: matchType === "whitespace" ? "warning" : isCorrect ? "correct" : "incorrect",
      message:
        matchType === "exact"
          ? "정답입니다."
          : matchType === "whitespace"
            ? "정답으로 처리했습니다. 다만 띄어쓰기는 정답 표기와 다르니 주의해주세요."
            : isParticleTolerantMatch
              ? "정답입니다. 핵심 단어 기준으로 맞게 처리했습니다."
              : "오답입니다. 정답 표기를 확인해보세요.",
    };
  }

  const embeddedMatchedCount = countEmbeddedAnswerMatches(expectedTokens, trimmedInput);
  const keywordMatchedCount = countKeywordAnswerGroupMatches(item.keywordAnswerGroups, trimmedInput);
  const classifiedMatchedCount = countClassifiedAnswerMatches(item.classifiedAnswerGroups, trimmedInput);
  const particleTolerantMatchedCount = countParticleTolerantAnswerMatches(item, expectedTokens, trimmedInput);
  const rawFlexibleMatchedCount = Math.max(embeddedMatchedCount, keywordMatchedCount, classifiedMatchedCount, particleTolerantMatchedCount);
  const flexibleMatchedCount = Math.min(rawFlexibleMatchedCount, userTokens.length || rawFlexibleMatchedCount);
  if (flexibleMatchedCount >= requiredCount) {
    return {
      isCorrect: true,
      feedbackMode: "correct",
      message: buildCorrectMessage(requiredCount, flexibleMatchedCount, false, expectedTokens.length, hasExplicitCount),
    };
  }

  if (userTokens.length < requiredCount) {
    return {
      isCorrect: false,
      feedbackMode: "incorrect",
      message:
        expectedTokens.length < 3
          ? `이 문제는 ${expectedTokens.length}개의 답을 모두 맞혀야 합니다.`
          : hasExplicitCount
            ? `이 문제는 문제에서 요구한 ${requiredCount}개를 맞혀야 합니다.`
            : "이 문제는 답이 3개 이상이라 최소 3개를 맞혀야 합니다.",
    };
  }

  const unusedUserTokens = [...userTokens];
  const flexibleTokenMatchedCount = Math.max(keywordMatchedCount, classifiedMatchedCount, particleTolerantMatchedCount);
  let directTokenMatchedCount = 0;
  let hadWhitespaceOnlyMatch = false;

  for (const expectedToken of expectedTokens) {
    const matchIndex = unusedUserTokens.findIndex((userToken) => tokenMatches(expectedToken, userToken) !== "none");
    if (matchIndex === -1) {
      continue;
    }

    const matchType = tokenMatches(expectedToken, unusedUserTokens[matchIndex]);
    if (matchType === "whitespace") {
      hadWhitespaceOnlyMatch = true;
    }
    directTokenMatchedCount += 1;
    unusedUserTokens.splice(matchIndex, 1);
  }

  const matchedCount = Math.max(flexibleTokenMatchedCount, directTokenMatchedCount);
  const isCorrect = matchedCount >= requiredCount;
  return {
    isCorrect,
    feedbackMode: isCorrect ? (hadWhitespaceOnlyMatch ? "warning" : "correct") : "incorrect",
    message: isCorrect
      ? buildCorrectMessage(requiredCount, matchedCount, hadWhitespaceOnlyMatch, expectedTokens.length, hasExplicitCount)
      : buildIncorrectMessage(requiredCount, matchedCount, expectedTokens.length, hasExplicitCount),
  };
}

function getBaseItemsForSelection() {
  const startParsed = parseId(startInput.value);
  const endParsed = parseId(endInput.value);

  if (startInput.value.trim() || endInput.value.trim()) {
    if (!startParsed || !endParsed) {
      return null;
    }

    const lower = compareIds(startParsed, endParsed) <= 0 ? startParsed : endParsed;
    const upper = compareIds(startParsed, endParsed) <= 0 ? endParsed : startParsed;

    return state.items.filter((item) => {
      const itemId = { volume: item.volume, order: item.order };
      return compareIds(itemId, lower) >= 0 && compareIds(itemId, upper) <= 0;
    });
  }

  if (state.currentQuickRange === "all") {
    return [...state.items];
  }

  return state.items.filter((item) => item.volume === Number(state.currentQuickRange));
}

function getQuickSelectionLabel() {
  if (startInput.value.trim() || endInput.value.trim()) {
    return `${startInput.value.trim() || "?"} ~ ${endInput.value.trim() || "?"}`;
  }

  switch (state.currentQuickRange) {
    case "1":
      return "1권 전체";
    case "2":
      return "2권 전체";
    case "3":
      return "3권 전체";
    default:
      return "전체 범위";
  }
}

function setQuestionLimitValue(nextValue) {
  const max = Number(questionLimitInput.max) || state.items.length || 1;
  const min = toFiniteNumber(questionLimitInput.min) ?? 0;
  const parsedValue = toFiniteNumber(nextValue);
  const clampedValue = Math.min(Math.max(parsedValue ?? min, min), max);

  questionLimitInput.value = String(clampedValue);
  questionLimitNumberInput.value = String(clampedValue);
  questionLimitValue.textContent = `${clampedValue}문제`;
  return clampedValue;
}

function syncQuestionLimitControl() {
  const baseItems = getBaseItemsForSelection();
  const availableCount = baseItems?.length ?? state.items.length;
  const safeCount = Math.max(1, availableCount);
  const currentValue = toFiniteNumber(questionLimitNumberInput.value)
    ?? toFiniteNumber(questionLimitInput.value)
    ?? safeCount;
  const nextValue = Math.min(currentValue, safeCount);

  questionLimitInput.min = "0";
  questionLimitInput.max = String(safeCount);
  questionLimitNumberInput.min = "0";
  questionLimitNumberInput.max = String(safeCount);
  setQuestionLimitValue(nextValue);
  questionLimitRange.textContent = `0 ~ ${safeCount}`;
}

function updateSelectionPreview() {
  syncQuestionLimitControl();
  const orderLabel = orderModeSelect.value === "random" ? "랜덤" : "순서대로";
  const limitValue = toFiniteNumber(questionLimitInput.value)
    ?? toFiniteNumber(questionLimitInput.max)
    ?? state.items.length;
  selectionPreview.textContent = `${getQuickSelectionLabel()} · ${orderLabel} · ${limitValue}문제`;
}

function renderVolumeStats() {
  const counts = state.dataset.metadata.counts;
  const cards = [
    { label: "전체 문항", value: counts.total },
    { label: "1권", value: counts.volume1 },
    { label: "2권", value: counts.volume2 },
    { label: "3권", value: counts.volume3 },
  ];

  volumeStats.innerHTML = cards
    .map(
      (card) => `
        <article class="card stat-card">
          <span>${escapeHtml(card.label)}</span>
          <strong>${card.value}</strong>
        </article>
      `
    )
    .join("");
}

function renderPdfCards() {
  pdfCardGrid.innerHTML = Object.entries(PDF_LIBRARY)
    .map(
      ([volume, pdf]) => `
        <article class="pdf-card">
          <div class="pdf-card-head">
            <span class="question-id">${escapeHtml(pdf.subtitle)}</span>
            <strong>${escapeHtml(pdf.title)}</strong>
          </div>
          <p class="helper">${escapeHtml(pdf.description)}</p>
          <p class="pdf-card-meta">${state.dataset.metadata.counts[`volume${volume}`]}문항 연결</p>
          <div class="pdf-card-actions">
            <a class="pdf-card-button" href="${pdf.href}" target="_blank" rel="noopener noreferrer">PDF 열기</a>
            <button class="pdf-card-button" data-start-volume="${volume}"><span>이 자료로</span><span>퀴즈 시작</span></button>
          </div>
        </article>
      `
    )
    .join("");
}

function renderHistorySummary() {
  const saved = loadSavedSession();
  if (!saved) {
    historyCard.classList.add("hidden");
    return;
  }

  historyCard.classList.remove("hidden");
  const date = new Date(saved.savedAt);
  historySummary.classList.remove("empty");
  historySummary.innerHTML = `
    <strong>${escapeHtml(saved.selectionLabel || "지난 세션")}</strong><br />
    ${saved.total}문제 중 ${saved.correctCount}정답 · ${saved.wrongAnswers.length}오답<br />
    저장 시각: ${escapeHtml(date.toLocaleString("ko-KR"))}<br />
    보관 기간: ${STORAGE_RETENTION_DAYS}일
  `;
}


function shuffledCopy(items) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[randomIndex]] = [copy[randomIndex], copy[index]];
  }
  return copy;
}

function prepareDynamicMatchingQuestion(item) {
  if (!Array.isArray(item.dynamicMatching?.entries)) {
    return item;
  }

  const shuffledEntries = shuffledCopy(item.dynamicMatching.entries || []);
  const questionLines = [
    item.dynamicMatching.intro || item.question,
    ...shuffledEntries.map((entry, index) => `${entry.label} : (${index + 1})`),
  ];
  const answerLines = shuffledEntries.map((entry, index) => `${index + 1}. ${entry.answer}`);

  return {
    ...item,
    question: questionLines.join("\n"),
    promptLines: questionLines,
    answerLines,
    answerTokens: answerLines,
    rawBlock: answerLines,
    strictAnswerMode: "exact-token-groups",
    strictAnswerGroups: shuffledEntries.map((entry, index) => [
      `${index + 1}. ${entry.answer}`,
      `${index + 1} ${entry.answer}`,
    ]),
    keywordAnswerGroups: shuffledEntries.map((entry, index) => [String(index + 1), entry.answer]),
    requiredAnswerCount: shuffledEntries.length,
    dynamicMatchingState: {
      type: item.dynamicMatching.type,
      order: shuffledEntries.map((entry) => entry.label),
    },
  };
}

function renderQuestion() {
  let item = state.quizItems[state.currentIndex];
  if (item?.dynamicMatching && !item.dynamicMatchingState) {
    item = prepareDynamicMatchingQuestion(item);
    state.quizItems[state.currentIndex] = item;
  }
  const currentNumber = state.currentIndex + 1;
  const total = state.quizItems.length;
  const pdf = PDF_LIBRARY[item.volume];

  questionIdBadge.textContent = item.id;
  questionIdBadge.classList.add("hidden");
  questionSourceBadge.textContent = getVolumeLabel(item);
  const questionLines = Array.isArray(item.promptLines) && item.promptLines.length
    ? item.promptLines
    : String(item.question || "").split(/\n+/);
  questionText.innerHTML = questionLines
    .map((line) => `<span class="question-line">${escapeHtml(line)}</span>`)
    .join("");
  sourceStudyText.textContent = `${pdf.subtitle} · ${pdf.title}`;
  openSourceLink.href = pdf.href;
  progressText.textContent = `${currentNumber} / ${total}`;
  wrongCountText.textContent = `오답 ${state.wrongAnswers.length}개`;
  progressBar.style.width = `${(currentNumber / total) * 100}%`;

  hintBox.classList.add("hidden");
  hintBox.textContent = item.hint ? `힌트: ${item.hint}` : "이 문제에는 저장된 힌트가 없습니다.";
  answerInput.value = "";
  answerInput.disabled = false;
  answerInput.focus();
  feedbackCard.classList.add("hidden");
  feedbackCard.classList.remove("correct", "incorrect", "warning");
  userAnswerOutput.textContent = "";
  correctAnswerOutput.innerHTML = "";
  reportPanel.classList.add("hidden");
  reportMessageInput.value = "";
  state.answerSubmitted = false;
  state.usedHintForCurrent = false;
  state.nextEnterAllowedAt = 0;
  document.querySelector("#next-question-button").disabled = true;
  updateStarButtonForCurrentQuestion();
}

function recordAttempt(item, userAnswer, isCorrect) {
  const attempt = {
    id: item.id,
    question: item.question,
    sourcePage: item.sourcePage,
    volume: item.volume,
    hint: item.hint,
    answerLines: item.answerLines,
    answerTokens: item.answerTokens,
    dynamicMatchingState: item.dynamicMatchingState,
    userAnswer,
    isCorrect,
    usedHint: state.usedHintForCurrent,
  };

  state.attempts.push(attempt);

  if (!isCorrect) {
    state.wrongAnswers.push(attempt);
  }
}

function showFeedback(item, userAnswer, judgement) {
  questionIdBadge.classList.remove("hidden");
  feedbackCard.classList.remove("hidden", "correct", "incorrect", "warning");
  feedbackCard.classList.add(judgement.feedbackMode || (judgement.isCorrect ? "correct" : "incorrect"));
  feedbackState.textContent =
    judgement.feedbackMode === "warning"
      ? "띄어쓰기 주의"
      : judgement.isCorrect
        ? "정답"
        : "오답";
  feedbackMessage.textContent = judgement.message;
  userAnswerOutput.textContent = userAnswer.trim() || "입력 없음";
  correctAnswerOutput.innerHTML = item.answerLines.map((line) => escapeHtml(line)).join("<br />");
  reportPanel.classList.add("hidden");
  reportMessageInput.value = "";
}

function getCurrentAttemptForReport() {
  const currentItem = state.quizItems[state.currentIndex];
  if (!currentItem) {
    return null;
  }

  return state.attempts[state.attempts.length - 1] ?? {
    id: currentItem.id,
    question: currentItem.question,
    sourcePage: currentItem.sourcePage,
    volume: currentItem.volume,
    answerLines: currentItem.answerLines,
    dynamicMatchingState: currentItem.dynamicMatchingState,
    userAnswer: answerInput.value.trim(),
  };
}

function buildReportPayload(customMessage) {
  const attempt = getCurrentAttemptForReport();
  if (!attempt) {
    return null;
  }

  const pdf = PDF_LIBRARY[attempt.volume];
  const message = String(customMessage || "").trim();
  const issueTitle = `[문제 제보] ${attempt.id} ${attempt.question.slice(0, 40)}`;
  const issueBody = [
    "[제보 내용]",
    message || "정답 판정 또는 문제 표기를 확인해주세요.",
    "",
    "[자동 첨부 정보]",
    `문제 번호: ${attempt.id}`,
    `문제: ${attempt.question}`,
    `내가 입력한 답: ${attempt.userAnswer || "입력 없음"}`,
    `저장된 정답: ${(attempt.answerLines || []).join(" / ")}`,
    attempt.dynamicMatchingState ? `랜덤 순서: ${attempt.dynamicMatchingState.order.join(" / ")}` : "",
    `출처: ${pdf?.title || `${attempt.volume}권`} ${attempt.sourcePage}페이지`,
  ].join("\n");

  return { issueTitle, issueBody };
}

function buildGoogleFormReportUrl(payload) {
  const params = new URLSearchParams({
    usp: "pp_url",
    [REPORT_FORM_FIELDS.target]: payload.issueTitle,
    [REPORT_FORM_FIELDS.type]: DEFAULT_REPORT_TYPE,
    [REPORT_FORM_FIELDS.detail]: payload.issueBody,
  });
  return `${REPORT_FORM_URL}?${params.toString()}`;
}

function openReportPanel() {
  reportPanel.classList.remove("hidden");
  reportMessageInput.focus();
}

function closeReportPanelView() {
  reportPanel.classList.add("hidden");
}

async function copyReportText() {
  const message = reportMessageInput.value.trim();
  if (!message) {
    showToast("제보 내용을 한 줄이라도 적어주세요.");
    reportMessageInput.focus();
    return;
  }

  const payload = buildReportPayload(message);
  if (!payload) {
    showToast("제보할 문제 정보를 찾지 못했습니다.");
    return;
  }

  try {
    await navigator.clipboard.writeText(`${payload.issueTitle}\n\n${payload.issueBody}`);
    showToast("제보 내용이 복사되었습니다.");
  } catch {
    showToast("복사에 실패했습니다. 브라우저 권한을 확인해주세요.");
  }
}

async function submitReportIssue() {
  const message = reportMessageInput.value.trim();
  if (!message) {
    showToast("제보 내용을 한 줄이라도 적어주세요.");
    reportMessageInput.focus();
    return;
  }

  const payload = buildReportPayload(message);
  if (!payload) {
    showToast("제보할 문제 정보를 찾지 못했습니다.");
    return;
  }

  window.open(buildGoogleFormReportUrl(payload), "_blank", "noopener,noreferrer");
}

function goToNextQuestion() {
  if (state.currentIndex < state.quizItems.length - 1) {
    state.currentIndex += 1;
    renderQuestion();
    return;
  }

  saveCurrentSession();
  renderResultView({
    total: state.quizItems.length,
    wrongAnswers: state.wrongAnswers,
  });
}

function renderWrongNotes(wrongAnswers) {
  if (!wrongAnswers.length) {
    wrongNoteList.innerHTML = `<div class="empty-state">이번 세션에는 오답이 없습니다.</div>`;
    return;
  }

  wrongNoteList.innerHTML = wrongAnswers
    .map(
      (wrong) => `
        <article class="wrong-item">
          <div class="wrong-item-head">
            <div>
              <h4>${escapeHtml(wrong.id)} · ${escapeHtml(wrong.question)}</h4>
              <p class="wrong-meta">${escapeHtml(`${wrong.volume}권 · p.${wrong.sourcePage}`)}</p>
            </div>
            <span class="question-id">${wrong.usedHint ? "힌트 사용" : "힌트 미사용"}</span>
          </div>
          <div class="wrong-detail">
            <div><strong>내 답:</strong> ${escapeHtml(wrong.userAnswer || "입력 없음")}</div>
            <div><strong>정답:</strong> ${wrong.answerLines.map((line) => escapeHtml(line)).join(" / ")}</div>
          </div>
        </article>
      `
    )
    .join("");
}

function renderResultView(sessionData) {
  const total = sessionData.total;
  const wrong = sessionData.wrongAnswers.length;
  const correct = total - wrong;

  resultTotal.textContent = String(total);
  resultCorrect.textContent = String(correct);
  resultWrong.textContent = String(wrong);
  renderWrongNotes(sessionData.wrongAnswers);
  state.viewingHistory = false;
  state.loadedHistorySession = null;
  switchView("result");
}

function saveCurrentSession() {
  const payload = {
    savedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + STORAGE_RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString(),
    total: state.quizItems.length,
    correctCount: state.quizItems.length - state.wrongAnswers.length,
    selectionLabel: state.currentSelection?.label || "이번 세션",
    selection: state.currentSelection,
    wrongAnswers: state.wrongAnswers,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  renderHistorySummary();
}

function loadSavedSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (!parsed) {
      return null;
    }

    if (parsed.expiresAt && Date.parse(parsed.expiresAt) < Date.now()) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function buildSelectionLabel(items, options) {
  const first = items[0]?.id;
  const last = items[items.length - 1]?.id;
  const orderLabel = options.orderMode === "random" ? "랜덤" : "순서대로";
  return `${first} ~ ${last} · ${orderLabel} · ${items.length}문제`;
}

function resolveSelectedItems() {
  const baseItems = getBaseItemsForSelection();
  const startParsed = parseId(startInput.value);
  const endParsed = parseId(endInput.value);

  if (!baseItems || !baseItems.length) {
    if (startInput.value.trim() || endInput.value.trim()) {
      throw new Error("직접 범위는 `1-1` 같은 형식으로 시작과 끝을 모두 입력해주세요.");
    }
    throw new Error("선택한 범위에 해당하는 문제가 없습니다.");
  }

  const orderMode = orderModeSelect.value;
  const limitValue = toFiniteNumber(questionLimitInput.value) ?? baseItems.length;
  if (limitValue < 1) {
    throw new Error("문제 수는 1문제 이상으로 선택해주세요.");
  }
  let finalItems = orderMode === "random" ? shuffle(baseItems) : [...baseItems];
  finalItems = finalItems.slice(0, limitValue);

  return {
    items: finalItems,
    selection: {
      orderMode,
      quickRange: state.currentQuickRange,
      startId: startParsed?.raw ?? null,
      endId: endParsed?.raw ?? null,
      limit: limitValue,
      label: buildSelectionLabel(finalItems, { orderMode }),
    },
  };
}

function startQuizWithItems(items, selection) {
  state.quizItems = items;
  state.currentIndex = 0;
  state.attempts = [];
  state.wrongAnswers = [];
  state.currentSelection = selection;
  switchView("quiz");
  renderQuestion();
}

function startWrongOnlySession(savedSession) {
  const source = savedSession ?? loadSavedSession();
  if (!source?.wrongAnswers?.length) {
    showToast("다시 풀 오답 데이터가 없습니다.");
    return;
  }

  const itemsToRetry = shuffle(source.wrongAnswers
    .map((wrong) => state.items.find((item) => item.id === wrong.id))
    .filter(Boolean));

  if (!itemsToRetry.length) {
    showToast("오답 다시 풀기용 문제를 찾지 못했습니다.");
    return;
  }

  startQuizWithItems(itemsToRetry, {
    label: `오답 다시 풀기 · ${itemsToRetry.length}문제`,
    orderMode: "random",
    quickRange: null,
    startId: itemsToRetry[0]?.id ?? null,
    endId: itemsToRetry[itemsToRetry.length - 1]?.id ?? null,
    limit: itemsToRetry.length,
  });
}

function showToast(message) {
  window.alert(message);
}

function confirmGoHome() {
  if (window.confirm("진행 중인 세션을 종료하고 홈으로 돌아갈까요?")) {
    switchView("home");
  }
}

function submitCurrentAnswer() {
  if (state.answerSubmitted) {
    return;
  }

  const item = state.quizItems[state.currentIndex];
  const userAnswer = answerInput.value;
  const judgement = judgeAnswer(item, userAnswer);

  if (!userAnswer.trim()) {
    showToast(judgement.message);
    answerInput.focus();
    return;
  }

  state.answerSubmitted = true;
  state.nextEnterAllowedAt = Date.now() + 600;
  answerInput.disabled = true;
  document.querySelector("#next-question-button").disabled = false;
  recordAttempt(item, userAnswer.trim(), judgement.isCorrect);
  wrongCountText.textContent = `오답 ${state.wrongAnswers.length}개`;
  showFeedback(item, userAnswer, judgement);
}

function goToNextQuestionIfReady() {
  if (!state.answerSubmitted) {
    return;
  }

  if (Date.now() < state.nextEnterAllowedAt) {
    return;
  }

  goToNextQuestion();
}

function isPlainEnterEvent(event) {
  const key = event.key;
  const code = event.code;
  const keyCode = event.keyCode ?? event.which;

  return !event.shiftKey && (
    key === "Enter" ||
    code === "Enter" ||
    code === "NumpadEnter" ||
    keyCode === 13
  );
}

function handleGlobalQuizEnter(event) {
  if (!isPlainEnterEvent(event) || event.isComposing || !quizView.classList.contains("active")) {
    return;
  }

  const target = event.target;
  if (target === answerInput || !reportPanel.classList.contains("hidden")) {
    return;
  }

  const actionButton = target?.closest?.("#submit-answer-button, #next-question-button");
  const isOtherInteractive = target?.closest?.("button, a, input, select, textarea, [contenteditable='true']");
  if (isOtherInteractive && !actionButton) {
    return;
  }

  event.preventDefault();

  if (state.answerSubmitted) {
    goToNextQuestionIfReady();
    return;
  }

  submitCurrentAnswer();
}

function ensureDatasetScriptLoaded() {
  if (window.CIVIL_QUIZ_DATA) {
    return Promise.resolve(window.CIVIL_QUIZ_DATA);
  }

  if (window.__civilQuizDatasetPromise) {
    return window.__civilQuizDatasetPromise;
  }

  window.__civilQuizDatasetPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "./data/civil_quiz_dataset.js?v=20260609-2";
    script.async = true;
    script.onload = () => {
      if (window.CIVIL_QUIZ_DATA) {
        resolve(window.CIVIL_QUIZ_DATA);
        return;
      }
      reject(new Error("퀴즈 데이터 스크립트는 열렸지만 내용을 찾지 못했습니다."));
    };
    script.onerror = () => {
      reject(new Error("퀴즈 데이터 파일을 불러오지 못했습니다."));
    };
    document.body.append(script);
  });

  return window.__civilQuizDatasetPromise;
}

function setLoadingState(isLoading) {
  startQuizButton.disabled = isLoading;
  questionLimitInput.disabled = isLoading;
  questionLimitNumberInput.disabled = isLoading;
  orderModeSelect.disabled = isLoading;
  startInput.disabled = isLoading;
  endInput.disabled = isLoading;

  document.querySelectorAll("[data-quick-range]").forEach((button) => {
    button.disabled = isLoading;
  });

  if (isLoading) {
    datasetCount.textContent = "";
    selectionPreview.textContent = "데이터를 불러오는 중입니다.";
  }
}

async function loadDataset() {
  const dataset = await ensureDatasetScriptLoaded();
  if (!dataset) {
    throw new Error("브라우저에 퀴즈 데이터가 연결되지 않았습니다.");
  }

  state.dataset = dataset;
  state.items = dataset.items;
  state.aliasDictionary = dataset.answerAliasDictionary ?? {};
  state.datasetReady = true;
  datasetCount.textContent = "";
  renderVolumeStats();
  renderPdfCards();
  renderHistorySummary();
  renderStarredSummary();
  syncQuestionLimitControl();
  updateSelectionPreview();
}

function bindEvents() {
  if (themeModeToggle) {
    themeModeToggle.addEventListener("click", () => {
      applyThemeMode(document.body.classList.contains("theme-dark") ? "light" : "dark");
    });
  }

  if (adminModeButton) {
    adminModeButton.addEventListener("click", promptAdminMode);
  }

  if (secretAdminTrigger) {
    secretAdminTrigger.addEventListener("click", handleSecretAdminTrigger);
  }

  if (starCurrentButton) {
    starCurrentButton.addEventListener("click", toggleCurrentStarredQuestion);
  }

  if (startStarredButton) {
    startStarredButton.addEventListener("click", startStarredSession);
  }

  if (startSelectedStarredButton) {
    startSelectedStarredButton.addEventListener("click", startSelectedStarredSession);
  }

  if (starredList) {
    starredList.addEventListener("change", (event) => {
      if (event.target.matches("[data-starred-select]")) {
        updateStarredSelectedCount();
      }
    });
  }

  if (starredLimitInput) {
    starredLimitInput.addEventListener("input", () => {
      setStarredLimitValue(starredLimitInput.value);
    });
  }

  if (starredLimitNumberInput) {
    starredLimitNumberInput.addEventListener("input", () => {
      setStarredLimitValue(starredLimitNumberInput.value);
    });
    starredLimitNumberInput.addEventListener("focus", () => {
      starredLimitNumberInput.select();
    });
  }

  if (starredSelectAllButton) {
    starredSelectAllButton.addEventListener("click", () => {
      starredList?.querySelectorAll("[data-starred-select]").forEach((checkbox) => {
        checkbox.checked = true;
      });
      updateStarredSelectedCount();
    });
  }

  if (starredClearSelectionButton) {
    starredClearSelectionButton.addEventListener("click", () => {
      starredList?.querySelectorAll("[data-starred-select]").forEach((checkbox) => {
        checkbox.checked = false;
      });
      updateStarredSelectedCount();
    });
  }

  document.querySelectorAll("[data-quick-range]").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll("[data-quick-range]").forEach((node) => node.classList.remove("active"));
      button.classList.add("active");
      state.currentQuickRange = button.dataset.quickRange;
      updateSelectionPreview();
    });
  });

  [startInput, endInput, orderModeSelect].forEach((element) => {
    element.addEventListener("input", updateSelectionPreview);
    element.addEventListener("change", updateSelectionPreview);
  });

  questionLimitInput.addEventListener("input", () => {
    setQuestionLimitValue(questionLimitInput.value);
    updateSelectionPreview();
  });

  questionLimitNumberInput.addEventListener("input", () => {
    setQuestionLimitValue(questionLimitNumberInput.value);
    updateSelectionPreview();
  });

  questionLimitNumberInput.addEventListener("focus", () => {
    questionLimitNumberInput.select();
  });

  document.querySelector("#start-quiz-button").addEventListener("click", () => {
    try {
      const resolved = resolveSelectedItems();
      startQuizWithItems(resolved.items, resolved.selection);
    } catch (error) {
      showToast(error.message);
    }
  });

  document.querySelector("#show-hint-button").addEventListener("click", () => {
    if (hintBox.classList.contains("hidden")) {
      hintBox.classList.remove("hidden");
      state.usedHintForCurrent = true;
    } else {
      hintBox.classList.add("hidden");
    }
  });

  document.querySelector("#submit-answer-button").addEventListener("click", submitCurrentAnswer);

  document.querySelector("#next-question-button").addEventListener("click", goToNextQuestionIfReady);

  document.addEventListener("keydown", handleGlobalQuizEnter);

  answerInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && event.shiftKey) {
      state.allowShiftLineBreak = true;
      setTimeout(() => {
        state.allowShiftLineBreak = false;
      }, 0);
      return;
    }

    if (!isPlainEnterEvent(event)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    state.allowShiftLineBreak = false;

    if (state.answerSubmitted) {
      goToNextQuestionIfReady();
      return;
    }

    submitCurrentAnswer();
  });

  answerInput.addEventListener("keypress", (event) => {
    if (isPlainEnterEvent(event)) {
      event.preventDefault();
    }
  });

  answerInput.addEventListener("beforeinput", (event) => {
    if (event.inputType !== "insertLineBreak") {
      return;
    }

    if (state.allowShiftLineBreak) {
      state.allowShiftLineBreak = false;
      return;
    }

    event.preventDefault();
  });

  openReportButton.addEventListener("click", openReportPanel);
  closeReportButton.addEventListener("click", closeReportPanelView);
  copyReportButton.addEventListener("click", () => {
    void copyReportText();
  });
  submitReportButton.addEventListener("click", () => {
    void submitReportIssue();
  });

  document.querySelector("#back-home-button").addEventListener("click", confirmGoHome);
  document.querySelectorAll("[data-home-action='quiz']").forEach((button) => {
    button.addEventListener("click", confirmGoHome);
  });

  document.querySelector("#result-home-button").addEventListener("click", () => {
    switchView("home");
  });

  document.querySelector("#retry-session-button").addEventListener("click", () => {
    if (!state.currentSelection) {
      switchView("home");
      return;
    }

    try {
      const resolved = resolveSelectedItems();
      startQuizWithItems(resolved.items, resolved.selection);
    } catch {
      switchView("home");
      showToast("같은 범위를 다시 만들지 못해 홈으로 돌아갑니다.");
    }
  });

  document.querySelector("#retry-wrong-button").addEventListener("click", () => {
    if (state.viewingHistory && state.loadedHistorySession) {
      startWrongOnlySession(state.loadedHistorySession);
      return;
    }
    startWrongOnlySession({
      wrongAnswers: state.wrongAnswers,
    });
  });

  loadHistoryButton.addEventListener("click", () => {
    const saved = loadSavedSession();
    if (!saved) {
      showToast("불러올 오답노트가 없습니다.");
      return;
    }

    state.viewingHistory = true;
    state.loadedHistorySession = saved;
    resultTotal.textContent = String(saved.total);
    resultCorrect.textContent = String(saved.correctCount);
    resultWrong.textContent = String(saved.wrongAnswers.length);
    renderWrongNotes(saved.wrongAnswers);
    switchView("result");
  });

  retryHistoryWrongButton.addEventListener("click", () => {
    const saved = loadSavedSession();
    if (!saved) {
      showToast("최근 저장된 오답이 없습니다.");
      return;
    }
    startWrongOnlySession(saved);
  });

  pdfCardGrid.addEventListener("click", (event) => {
    const target = event.target.closest("[data-start-volume]");
    if (!target) {
      return;
    }

    const volume = target.getAttribute("data-start-volume");
    document.querySelectorAll("[data-quick-range]").forEach((node) => node.classList.remove("active"));
    const selectedButton = document.querySelector(`[data-quick-range="${volume}"]`);
    if (selectedButton) {
      selectedButton.classList.add("active");
    }
    state.currentQuickRange = volume;
    startInput.value = "";
    endInput.value = "";
    updateSelectionPreview();

    try {
      const resolved = resolveSelectedItems();
      startQuizWithItems(resolved.items, resolved.selection);
    } catch (error) {
      showToast(error.message);
    }
  });
}

async function init() {
  state.starredIds = loadStarredIds();
  applyThemeMode(loadThemeMode());
  setAdminMode(localStorage.getItem(ADMIN_MODE_STORAGE_KEY) === "1");
  bindEvents();
  setLoadingState(true);
  try {
    await loadDataset();
    setLoadingState(false);
  } catch (error) {
    datasetCount.textContent = "데이터 로드 실패";
    selectionPreview.textContent = "새로고침 후 다시 시도해주세요.";
    showToast(error.message);
  }
}

init();
