// LEB Study: flashcards, a quiz (easy/hard), and a review of missed questions.
// The questions come from the data/ files, so adding material never means
// changing this file.

// ---------- 1. Questions ----------

// Every question from every data file, in one shape:
// { text, section, topic, kind: "mc" | "tf" | "multi", options, correct, note }
// "correct" lists the right option texts ([] if there's no answer yet).
const QUESTIONS = [];
STUDY.forEach((sec) => {
  for (const [topic, items] of Object.entries(sec.topics)) {
    items.forEach((item) => {
      let kind, options, correct;
      if (typeof item.answer === "boolean" || !item.options) {
        kind = "tf";
        options = ["True", "False"];
        correct = item.answer === undefined ? [] : [item.answer ? "True" : "False"];
      } else if (Array.isArray(item.answer) || item.multi) {
        kind = "multi";
        options = item.options;
        correct = item.answer || [];
      } else {
        kind = "mc";
        options = item.options;
        correct = item.answer === undefined ? [] : [item.answer];
      }
      QUESTIONS.push({
        text: item.q, section: sec.section, topic, kind, options, correct,
        note: item.note || "", missedBefore: !!item.missedBefore,
      });
    });
  }
});

const hasAnswer = (q) => q.correct.length > 0;

// ---------- 2. Missed list (saved in localStorage) ----------

// Missed questions are saved by their text. try/catch keeps the app
// working if the browser blocks storage.
const STORAGE_KEY = "leb-missed";

function loadMissed() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      // Skip saved questions that no longer exist (e.g. reworded ones)
      const texts = new Set(QUESTIONS.map((q) => q.text));
      return new Set(JSON.parse(saved).filter((t) => texts.has(t)));
    }
  } catch (e) {}
  // First visit: start with the questions marked as missed in the study doc
  return new Set(QUESTIONS.filter((q) => q.missedBefore).map((q) => q.text));
}

function saveMissed() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...missed])); } catch (e) {}
}

const missed = loadMissed();
const missedQuestions = () => QUESTIONS.filter((q) => missed.has(q.text));

// ---------- 3. Helpers ----------

const $ = (id) => document.getElementById(id);

// A shuffled copy of a list (Fisher-Yates shuffle)
function shuffle(list) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Create an element with text (textContent keeps the text from being read as HTML)
function el(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}

// Show one screen (home, flash or quiz) and hide the others
function showView(name) {
  ["home", "flash", "quiz"].forEach((v) => ($(v + "-view").hidden = v !== name));
  $("brand").hidden = name !== "home";
}

// ---------- 4. Home screen ----------

// Fill the chapter dropdown: "All chapters" plus one choice per data file
// (each data file's "section" is its chapter, e.g. "Chapter 11: ...")
function buildChapterSelect() {
  const select = $("chapter-select");
  select.append(new Option(`All chapters (${QUESTIONS.length})`, "all"));
  STUDY.forEach((sec) => {
    const count = QUESTIONS.filter((q) => q.section === sec.section).length;
    select.append(new Option(`${sec.section} (${count})`, sec.section));
  });
  select.addEventListener("change", sectionChanged);
}

const selectedSection = () => $("chapter-select").value;

// A chapter was picked: fill the topic dropdown with that chapter's topics
// (hidden when "All chapters" is picked)
function sectionChanged() {
  const section = selectedSection();
  const select = $("topic-select");
  select.replaceChildren();
  $("topic-field").hidden = section === "all";
  if (section !== "all") {
    const sec = STUDY.find((s) => s.section === section);
    const count = QUESTIONS.filter((q) => q.section === section).length;
    select.append(new Option(`All topics (${count})`, "all"));
    for (const [topic, items] of Object.entries(sec.topics)) {
      select.append(new Option(`${topic} (${items.length})`, topic));
    }
  }
  updateHome();
}

// The questions matching the section and topic choice
function selectedQuestions() {
  const section = selectedSection();
  if (section === "all") return QUESTIONS;
  const topic = $("topic-select").value;
  return QUESTIONS.filter((q) => q.section === section && (topic === "all" || q.topic === topic));
}

function updateHome() {
  $("missed-count").textContent = missed.size;
  $("start-missed").disabled = missed.size === 0;
  if (missed.size === 0) showMissedChoice(false);
  $("clear-missed").hidden = missed.size === 0;
  const list = selectedQuestions();
  const noAnswer = list.filter((q) => !hasAnswer(q)).length;
  $("start-quiz").disabled = noAnswer === list.length;
  $("home-note").textContent = noAnswer
    ? `${noAnswer} of these questions don't have answers yet. They show up in flashcards but are skipped in quizzes.`
    : "";
}

// Show or hide the Flashcards / Quiz choice under "Review missed"
function showMissedChoice(show) {
  $("missed-choice").hidden = !show;
  $("start-missed").setAttribute("aria-expanded", show);
}

function goHome() {
  showMissedChoice(false);
  updateHome();
  showView("home");
}

// ---------- 5. Flashcards ----------

// review: flipping through the missed list instead of the dropdown choice
const flash = { cards: [], index: 0, flipped: false, review: false };

function startFlashcards(review) {
  flash.review = review;
  flash.cards = review ? missedQuestions() : selectedQuestions();
  showView("flash");
  showCard(0);
}

// Show card number `index`, question side up
function showCard(index) {
  flash.index = index;
  flash.flipped = false;
  renderCard();
}

function renderCard() {
  const q = flash.cards[flash.index];
  // Content goes in the card's scroll area so long questions scroll inside the card
  const body = $("card-scroll");
  body.replaceChildren();
  body.scrollTop = 0;

  if (!flash.flipped) {
    body.append(el("p", q.topic, "topic"), el("p", q.text, "question"));
    if (q.kind === "tf") {
      body.append(el("p", "True or false?", "hint"));
    } else {
      const ol = el("ol");
      ol.type = "a";
      q.options.forEach((o) => ol.append(el("li", o)));
      body.append(ol);
    }
  } else {
    body.append(el("p", "Answer", "topic"));
    if (hasAnswer(q)) {
      q.correct.forEach((c) => body.append(el("p", c, "answer")));
      if (q.note) body.append(el("p", q.note, "hint"));
    } else {
      body.append(el("p", "Answer not added yet.", "hint"));
    }
  }

  $("flash-progress").textContent =
    `${flash.review ? "Missed · " : ""}Card ${flash.index + 1} of ${flash.cards.length}`;
  $("flip-hint").textContent = flash.flipped ? "Tap to see the question" : "Tap the card to flip";
  $("flash-prev").disabled = flash.index === 0;
  $("flash-next").disabled = flash.index === flash.cards.length - 1;
}

function flipCard() {
  flash.flipped = !flash.flipped;
  renderCard();
}

// ---------- 6. Quiz (also used for "Review missed") ----------

// mode: "easy" keeps going after a wrong answer, "hard" sends you back
// to question 1. review: practicing the missed list, where a right answer
// removes the question from the list.
// score: right answers this run. streak: right answers in a row.
// shuffleOnRestart: false when the Restart button should keep the same order.
const quiz = {
  pool: [], order: [], index: 0, score: 0, streak: 0,
  mode: "easy", review: false, shuffleOnRestart: true,
};

// Losing a streak longer than this flashes "Streak lost" across the screen
const BIG_STREAK = 5;

function startQuiz(review) {
  quiz.review = review;
  quiz.mode = document.querySelector('input[name="mode"]:checked').value;
  if (!review) quiz.pool = selectedQuestions().filter(hasAnswer);
  showView("quiz");
  restartQuiz(true);
}

// Start from question 1: in a new shuffled order, or the same order again
function restartQuiz(reshuffle) {
  if (quiz.review) quiz.pool = missedQuestions(); // the list may have changed
  quiz.order = reshuffle ? shuffle(quiz.pool) : quiz.order.filter((q) => quiz.pool.includes(q));
  quiz.index = 0;
  quiz.score = 0;
  quiz.streak = 0;
  renderQuestion();
}

// Update the streak number; "pop" plays a little grow animation
function showStreak(pop) {
  const count = $("streak-count");
  count.textContent = quiz.streak;
  count.classList.remove("pop");
  if (pop) {
    void count.offsetWidth; // lets the animation play again
    count.classList.add("pop");
  }
}

// Flash a "Streak lost" page across the whole screen, picked at random:
// the LED sign with TRY HARDER, or WOMP WOMP.
// ms: how long it stays up. start/stop: its animation.
const STREAK_PAGES = [
  { id: "try-harder", ms: 2600, start: (page) => startLedSigns(page), stop: () => stopLedSigns() },
  { id: "womp-womp", ms: 2600, start: (page) => startWomp(page), stop: () => stopWomp() },
];

let streakLostTimer;
function flashStreakLost() {
  clearTimeout(streakLostTimer);
  hideStreakLost();
  const choice = STREAK_PAGES[Math.floor(Math.random() * STREAK_PAGES.length)];
  const page = $(choice.id);
  page.hidden = false;
  if (choice.start) choice.start(page);
  streakLostTimer = setTimeout(hideStreakLost, choice.ms);
}

function hideStreakLost() {
  STREAK_PAGES.forEach((choice) => {
    $(choice.id).hidden = true;
    if (choice.stop) choice.stop();
  });
}

// ---------- WOMP WOMP (flickering letters) ----------

let wompTimer = null;
const WOMP_DARK_SHARE = 1 / 6; // about 5 lit letters for every dark one

function startWomp(page) {
  stopWomp();
  // Enough rows of WOMP to fill the screen (each row is about 0.86 x 26vw tall)
  const rowHeight = innerWidth * 0.26 * 0.86;
  const rows = Math.ceil(innerHeight / rowHeight) + 1;
  page.replaceChildren();
  for (let r = 0; r < rows; r++) {
    const row = el("p", undefined, "womp-row");
    for (const ch of "WOMP") row.append(el("span", ch));
    page.append(row);
  }
  const letters = [...page.querySelectorAll("span")];
  const darkCount = Math.round(letters.length * WOMP_DARK_SHARE);
  shuffle(letters).slice(0, darkCount).forEach((l) => l.classList.add("off"));
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  // Every 70 ms some letters flicker; stutters go back on 35 ms later
  wompTimer = setInterval(() => {
    const stutters = wompTick(letters);
    setTimeout(() => stutters.forEach((l) => l.classList.remove("off")), 35);
  }, 70);
}

// One flicker: 1 or 2 dark letters light up while the same number of lit
// letters go dark, so the 5-to-1 balance holds. Sometimes a lit letter also
// stutters (goes dark for a moment, like a bad bulb). Returns the stuttering
// letters, which the caller turns back on.
function wompTick(letters) {
  const dark = letters.filter((l) => l.classList.contains("off"));
  const lit = letters.filter((l) => !l.classList.contains("off"));
  const swaps = 1 + Math.floor(Math.random() * 2);
  for (let i = 0; i < swaps && dark.length && lit.length; i++) {
    dark.splice(Math.floor(Math.random() * dark.length), 1)[0].classList.remove("off");
    lit.splice(Math.floor(Math.random() * lit.length), 1)[0].classList.add("off");
  }
  const stutters = [];
  if (Math.random() < 0.4 && lit.length) {
    const letter = lit[Math.floor(Math.random() * lit.length)];
    letter.classList.add("off");
    stutters.push(letter);
  }
  return stutters;
}

function stopWomp() {
  clearInterval(wompTimer);
  wompTimer = null;
}

// ---------- LED sign (for the TRY HARDER page) ----------

// Letters as 5 x 7 dots, like a real LED sign ("1" = lit)
const LED_FONT = {
  T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  Y: ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
  H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  D: ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
};

// The message as columns of dots, one letter after another, with a gap
// before it repeats, so it runs as one continuous stream
function ledColumns(text) {
  const columns = [];
  for (const ch of text) {
    if (ch === " ") { columns.push(0, 0, 0); continue; }
    const glyph = LED_FONT[ch];
    for (let x = 0; x < 5; x++) {
      let bits = 0;
      for (let y = 0; y < 7; y++) if (glyph[y][x] === "1") bits |= 1 << y;
      columns.push(bits);
    }
    columns.push(0); // space between letters
  }
  columns.push(0, 0, 0, 0); // space before it repeats
  return columns;
}

const LED_TEXT = ledColumns("TRY HARDER");
const LED_SPEED = 36; // columns per second
let ledFrame = null;

function startLedSigns(page) {
  stopLedSigns();
  const canvases = [...page.querySelectorAll("canvas.led")];
  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const start = performance.now();
  const draw = (now) => {
    // The lit dots move one column at a time, like a real LED sign
    const shift = still ? 0 : Math.floor(((now - start) / 1000) * LED_SPEED);
    canvases.forEach((canvas, i) => drawLed(canvas, shift + i * 9));
    ledFrame = still ? null : requestAnimationFrame(draw);
  };
  ledFrame = requestAnimationFrame(draw);
}

function stopLedSigns() {
  if (ledFrame) cancelAnimationFrame(ledFrame);
  ledFrame = null;
}

function drawLed(canvas, shift) {
  const ratio = window.devicePixelRatio || 1;
  const w = canvas.clientWidth, h = canvas.clientHeight;
  if (canvas.width !== Math.round(w * ratio)) {
    canvas.width = Math.round(w * ratio);
    canvas.height = Math.round(h * ratio);
  }
  const ctx = canvas.getContext("2d");
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.clearRect(0, 0, w, h);
  const rows = 9; // 7 rows of letter plus a blank row above and below
  const pitch = h / rows;
  const radius = pitch * 0.38;
  const cols = Math.ceil(w / pitch) + 1;
  for (let c = 0; c < cols; c++) {
    const bits = LED_TEXT[(shift + c) % LED_TEXT.length];
    for (let r = 0; r < rows; r++) {
      // Only the lit dots are drawn (no faint grid behind them)
      const lit = r > 0 && r < 8 && (bits >> (r - 1)) & 1;
      if (!lit) continue;
      ctx.beginPath();
      ctx.arc(c * pitch + pitch / 2, r * pitch + pitch / 2, radius, 0, Math.PI * 2);
      ctx.fillStyle = "#FF2424";
      ctx.shadowColor = "rgba(255, 36, 36, 0.8)";
      ctx.shadowBlur = radius * 1.6;
      ctx.fill();
    }
  }
}

function renderQuestion() {
  const q = quiz.order[quiz.index];
  $("quiz-progress").textContent =
    `${quiz.review ? "Missed · " : ""}${quiz.mode === "hard" ? "Hard" : "Easy"} · ` +
    `${quiz.index + 1} of ${quiz.order.length}` +
    (quiz.mode === "easy" ? ` · ${quiz.score} ✓` : "");
  showStreak(false);
  $("quiz-topic").textContent = q.topic;
  $("quiz-question").textContent = q.text;

  // "Choose 3." hint, unless the question already says how many to pick
  const saysHowMany = /choose (two|three|four|\d)/i.test(q.text);
  $("quiz-hint").textContent = q.kind === "multi" && !saysHowMany ? `Choose ${q.correct.length}.` : "";
  $("quiz-hint").hidden = !$("quiz-hint").textContent;

  // One radio button per choice (checkboxes for "select all that apply"),
  // each with its keyboard letter: A B C D, or T F for true/false
  const box = $("quiz-options");
  box.replaceChildren();
  const letters = q.kind === "tf" ? "TF" : "ABCD";
  q.options.forEach((option, i) => {
    const input = document.createElement("input");
    input.type = q.kind === "multi" ? "checkbox" : "radio";
    input.name = "choice";
    input.value = option;
    input.addEventListener("change", () => {
      $("quiz-submit").disabled = !box.querySelector("input:checked");
    });
    const label = el("label");
    label.append(input, el("span", letters[i], "letter"), el("span", option));
    box.append(label);
  });

  $("quiz-scroll").scrollTop = 0;
  $("quiz-feedback").textContent = "";
  $("quiz-feedback").className = "feedback";
  $("quiz-submit").hidden = false;
  $("quiz-submit").disabled = true;
  $("quiz-next").hidden = true;
  $("quiz-restart").hidden = true;
}

function checkAnswer() {
  const q = quiz.order[quiz.index];
  const inputs = [...$("quiz-options").querySelectorAll("input")];
  const chosen = inputs.filter((i) => i.checked).map((i) => i.value);

  // Right only if the chosen options exactly match the correct ones
  const isRight = chosen.length === q.correct.length && chosen.every((c) => q.correct.includes(c));

  // Lock the choices and color them: green = correct, red = picked but wrong
  inputs.forEach((i) => {
    i.disabled = true;
    if (q.correct.includes(i.value)) i.parentElement.classList.add("correct");
    else if (i.checked) i.parentElement.classList.add("wrong");
  });

  const feedback = $("quiz-feedback");
  if (isRight) {
    quiz.score++;
    quiz.streak++;
    if (quiz.review) missed.delete(q.text);
    feedback.textContent = quiz.review ? "Correct! Removed from your missed list." : "Correct!";
    feedback.className = "feedback good";
  } else {
    if (quiz.streak > BIG_STREAK) flashStreakLost();
    quiz.streak = 0;
    missed.add(q.text);
    feedback.textContent = "Not quite. The correct answer is highlighted in green." +
      (q.note ? " " + q.note : "");
    feedback.className = "feedback bad";
  }
  showStreak(isRight);
  saveMissed();
  $("quiz-submit").hidden = true;

  if (!isRight && quiz.mode === "hard") {
    // Hard mode: same questions, same order, from the start
    showRestart("Back to question 1", false);
  } else if (quiz.index === quiz.order.length - 1) {
    feedback.textContent += ` Done! You got ${quiz.score} of ${quiz.order.length} right.`;
    // In review, there's nothing to go again with once the list is empty
    if (!quiz.review || missed.size > 0) showRestart("Go again", true);
  } else {
    $("quiz-next").hidden = false;
  }

  // On long questions, scroll the card so the correct answer is visible
  $("quiz-options").querySelector("label.correct")
    .scrollIntoView({ block: "nearest", behavior: "smooth" });
}

function showRestart(label, reshuffle) {
  quiz.shuffleOnRestart = reshuffle;
  $("quiz-restart").textContent = label;
  $("quiz-restart").hidden = false;
}

// ---------- 7. Buttons ----------

$("topic-select").addEventListener("change", updateHome);
document.querySelectorAll(".home-btn").forEach((b) => b.addEventListener("click", goHome));

$("start-flash").addEventListener("click", () => startFlashcards(false));
$("start-quiz").addEventListener("click", () => startQuiz(false));
$("start-missed").addEventListener("click", () => showMissedChoice($("missed-choice").hidden));
$("missed-flash").addEventListener("click", () => startFlashcards(true));
$("missed-quiz").addEventListener("click", () => startQuiz(true));
$("clear-missed").addEventListener("click", () => {
  if (confirm("Clear your whole missed list?")) {
    missed.clear();
    saveMissed();
    updateHome();
  }
});

// The card flips on tap/click (and Enter or Space, in the shortcuts below)
$("card").addEventListener("click", flipCard);
$("flash-prev").addEventListener("click", () => showCard(flash.index - 1));
$("flash-next").addEventListener("click", () => showCard(flash.index + 1));
$("flash-shuffle").addEventListener("click", () => {
  flash.cards = shuffle(flash.cards);
  showCard(0);
});

$("quiz-submit").addEventListener("click", checkAnswer);
$("quiz-next").addEventListener("click", () => {
  quiz.index++;
  renderQuestion();
});
$("quiz-restart").addEventListener("click", () => restartQuiz(quiz.shuffleOnRestart));

// ---------- 8. Keyboard shortcuts ----------
//   Home:       F flashcards, Q quiz, M review missed (then F or Q),
//               E easy, H hard
//   Flashcards: Space or Enter flip, ← → previous / next, S shuffle
//   Quiz:       A B C D choose (T or F for true/false),
//               Enter check answer, then next / restart
//   Anywhere:   Esc back to Home
// (G is taken: it's the gravity easter egg.)

// Press a button the way a tap would, if it's showing and not greyed out
function press(id) {
  const button = $(id);
  if (button.disabled || button.closest("[hidden]")) return false;
  button.click();
  return true;
}

const showing = (view) => !$(view + "-view").hidden;

document.addEventListener("keydown", (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey) return; // leave browser shortcuts alone
  if (e.target.tagName === "SELECT") return;      // typing in a dropdown picks from it
  const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  // Enter or Space on a focused button already presses that button
  if ((key === "Enter" || key === " ") && e.target.tagName === "BUTTON") return;
  if (key === "Enter" && e.repeat) return; // holding Enter shouldn't race ahead

  let handled = true;
  if (key === "Escape") {
    if (showing("home")) showMissedChoice(false);
    else goHome();
  } else if (showing("home")) {
    const missedOpen = !$("missed-choice").hidden;
    if (key === "f") handled = press(missedOpen ? "missed-flash" : "start-flash");
    else if (key === "q") handled = press(missedOpen ? "missed-quiz" : "start-quiz");
    else if (key === "m") handled = press("start-missed");
    else if (key === "e" || key === "h") {
      document.querySelector(`input[name="mode"][value="${key === "e" ? "easy" : "hard"}"]`).click();
    } else handled = false;
  } else if (showing("flash")) {
    if (key === " " || key === "Enter") flipCard();
    else if (key === "ArrowLeft") handled = press("flash-prev");
    else if (key === "ArrowRight") handled = press("flash-next");
    else if (key === "s") handled = press("flash-shuffle");
    else handled = false;
  } else if (showing("quiz")) {
    if (key === "Enter") {
      handled = press("quiz-submit") || press("quiz-next") || press("quiz-restart");
    } else {
      // A-D pick a choice (a checkbox toggles); T and F also work for true/false
      const inputs = [...$("quiz-options").querySelectorAll("input")];
      let index = "abcd".indexOf(key);
      if (inputs.length === 2 && inputs[0].value === "True") {
        if (key === "t") index = 0;
        if (key === "f") index = 1;
      }
      const input = inputs[index];
      if (key.length === 1 && input && !input.disabled) input.click();
      else handled = false;
    }
  } else handled = false;

  if (handled) e.preventDefault(); // e.g. stop Space from scrolling
});

buildChapterSelect();
updateHome();
