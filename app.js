const STORAGE_KEY = "maltameokgi-last-session";
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

const questionIdBadge = document.querySelector("#question-id-badge");
const questionSourceBadge = document.querySelector("#question-source-badge");
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
const progressText = document.querySelector("#quiz-progress-text");
const wrongCountText = document.querySelector("#wrong-count-text");
const progressBar = document.querySelector("#quiz-progress-bar");

const resultTotal = document.querySelector("#result-total");
const resultCorrect = document.querySelector("#result-correct");
const resultWrong = document.querySelector("#result-wrong");
const wrongNoteList = document.querySelector("#wrong-note-list");

const PDF_LIBRARY = {
  1: {
    title: "말따먹기 최강암기법",
    subtitle: "1권",
    description: "암기형 정리 노트 중심 자료",
    href: "./pdfs/volume1.pdf",
  },
  2: {
    title: "실기 말따먹기-1",
    subtitle: "2권",
    description: "문제집형 말따먹기 자료",
    href: "./pdfs/volume2.pdf",
  },
  3: {
    title: "토목기사실기_말따먹기_12개년",
    subtitle: "3권",
    description: "12개년 누적 정리 자료",
    href: "./pdfs/volume3.pdf",
  },
};

function switchView(viewName) {
  homeView.classList.toggle("active", viewName === "home");
  quizView.classList.toggle("active", viewName === "quiz");
  resultView.classList.toggle("active", viewName === "result");
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
  return String(text).trim().replace(/\s+/g, "").toLowerCase();
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

function buildCorrectMessage(requiredCount, matchedCount, hadWhitespaceOnlyMatch, expectedTokenCount) {
  if (hadWhitespaceOnlyMatch) {
    return `정답으로 처리했습니다. ${matchedCount}개를 맞혔고, 띄어쓰기는 정답 표기와 다른 항목이 있습니다.`;
  }

  if (expectedTokenCount < 3) {
    return `정답입니다. 필요한 ${requiredCount}개를 모두 맞혔습니다.`;
  }

  return `정답입니다. ${matchedCount}개를 맞혀 최소 기준 3개를 충족했습니다.`;
}

function buildIncorrectMessage(requiredCount, matchedCount, expectedTokenCount) {
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

  const lineMatchTypes = item.answerLines.map((line) => answerLineMatches(line, trimmedInput));
  if (lineMatchTypes.includes("exact") || lineMatchTypes.includes("whitespace")) {
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
  const requiredCount = expectedTokens.length < 3 ? expectedTokens.length : 3;

  if (expectedTokens.length <= 1) {
    const target = expectedTokens[0] ?? item.answerLines[0] ?? "";
    const matchType = tokenMatches(target, trimmedInput);
    return {
      isCorrect: matchType !== "none",
      feedbackMode: matchType === "whitespace" ? "warning" : matchType === "exact" ? "correct" : "incorrect",
      message:
        matchType === "exact"
          ? "정답입니다."
          : matchType === "whitespace"
            ? "정답으로 처리했습니다. 다만 띄어쓰기는 정답 표기와 다르니 주의해주세요."
            : "오답입니다. 정답 표기를 확인해보세요.",
    };
  }

  if (userTokens.length < requiredCount) {
    return {
      isCorrect: false,
      feedbackMode: "incorrect",
      message:
        expectedTokens.length < 3
          ? `이 문제는 ${expectedTokens.length}개의 답을 모두 맞혀야 합니다.`
          : "이 문제는 답이 3개 이상이라 최소 3개를 맞혀야 합니다.",
    };
  }

  const unusedUserTokens = [...userTokens];
  let matchedCount = 0;
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
    matchedCount += 1;
    unusedUserTokens.splice(matchIndex, 1);
  }

  const isCorrect = matchedCount >= requiredCount;
  return {
    isCorrect,
    feedbackMode: isCorrect ? (hadWhitespaceOnlyMatch ? "warning" : "correct") : "incorrect",
    message: isCorrect
      ? buildCorrectMessage(requiredCount, matchedCount, hadWhitespaceOnlyMatch, expectedTokens.length)
      : buildIncorrectMessage(requiredCount, matchedCount, expectedTokens.length),
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

function renderQuestion() {
  const item = state.quizItems[state.currentIndex];
  const currentNumber = state.currentIndex + 1;
  const total = state.quizItems.length;
  const pdf = PDF_LIBRARY[item.volume];

  questionIdBadge.textContent = item.id;
  questionIdBadge.classList.add("hidden");
  questionSourceBadge.textContent = getVolumeLabel(item);
  questionText.textContent = item.question;
  sourceStudyText.textContent = `${pdf.subtitle} · ${pdf.title} · ${item.sourcePage}페이지`;
  openSourceLink.href = `${pdf.href}#page=${item.sourcePage}`;
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
  state.answerSubmitted = false;
  state.usedHintForCurrent = false;
  document.querySelector("#next-question-button").disabled = true;
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

  const itemsToRetry = source.wrongAnswers
    .map((wrong) => state.items.find((item) => item.id === wrong.id))
    .filter(Boolean);

  if (!itemsToRetry.length) {
    showToast("오답 다시 풀기용 문제를 찾지 못했습니다.");
    return;
  }

  startQuizWithItems(itemsToRetry, {
    label: `오답 다시 풀기 · ${itemsToRetry.length}문제`,
    orderMode: "sequential",
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

function ensureDatasetScriptLoaded() {
  if (window.CIVIL_QUIZ_DATA) {
    return Promise.resolve(window.CIVIL_QUIZ_DATA);
  }

  if (window.__civilQuizDatasetPromise) {
    return window.__civilQuizDatasetPromise;
  }

  window.__civilQuizDatasetPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "./data/civil_quiz_dataset.js";
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
    datasetCount.textContent = "데이터 준비 중";
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
  datasetCount.textContent = `총 ${dataset.metadata.counts.total}문항 준비 완료`;
  renderVolumeStats();
  renderPdfCards();
  renderHistorySummary();
  syncQuestionLimitControl();
  updateSelectionPreview();
}

function bindEvents() {
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
