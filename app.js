// LEB Study: flashcards, quiz (easy/hard), and a "missed questions" review.
// All study material lives in the data/ folder; this file never needs to change
// when you add more questions.

/* ============================================================
   1. Load the study material into one flat list of questions
   ============================================================ */

// Turn every question from every data file into the same simple shape:
// { text, section, topic, kind: "mc" | "tf" | "multi", options, correct, note }
// "correct" is a list of the right option texts ([] if no answer yet).
const QUESTIONS = [];
STUDY.forEach((sec) => {
  for (const [topic, list] of Object.entries(sec.topics)) {
    list.forEach((item) => {
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

/* ============================================================
   2. Saved data (localStorage): the list of missed questions
   ============================================================ */

// Missed questions are saved by their text, so nothing else needs an ID.
// try/catch keeps the app working if the browser blocks storage.
const STORAGE_KEY = "leb-missed";

function loadMissed() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return new Set(JSON.parse(saved));
  } catch (e) { /* storage unavailable: start empty */ }
  // First visit: start with the questions marked as missed in the study doc.
  return new Set(QUESTIONS.filter((q) => q.missedBefore).map((q) => q.text));
}

function saveMissed() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...missed])); } catch (e) {}
}

const missed = loadMissed();

/* ============================================================
   3. Small helpers
   ============================================================ */

const $ = (id) => document.getElementById(id);

// Return a shuffled copy of a list (Fisher-Yates shuffle).
function shuffle(list) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Make a text element safely (avoids putting raw text into innerHTML).
function el(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}

// Show one screen (home, flashcards or quiz) and hide the others.
function showView(name) {
  ["home", "flash", "quiz"].forEach((v) => ($(v + "-view").hidden = v !== name));
  $("home-btn").hidden = name === "home";
  window.scrollTo(0, 0);
}

/* ============================================================
   4. Home screen: topic picker and buttons
   ============================================================ */

// Fill the "Study" dropdown: All, then each section and its topics.
// Option values look like "all", "s|<section>" or "t|<section>|<topic>".
function buildTopicSelect() {
  const select = $("topic-select");
  select.append(new Option(`All questions (${QUESTIONS.length})`, "all"));
  STUDY.forEach((sec) => {
    const group = document.createElement("optgroup");
    group.label = sec.section;
    const count = QUESTIONS.filter((q) => q.section === sec.section).length;
    group.append(new Option(`All of ${sec.section.split(":")[0]} (${count})`, "s|" + sec.section));
    Object.keys(sec.topics).forEach((topic) => {
      group.append(new Option(`${topic} (${sec.topics[topic].length})`, `t|${sec.section}|${topic}`));
    });
    select.append(group);
  });
}

// The questions that match the current dropdown choice.
function selectedQuestions() {
  const [type, section, topic] = $("topic-select").value.split("|");
  if (type === "s") return QUESTIONS.filter((q) => q.section === section);
  if (type === "t") return QUESTIONS.filter((q) => q.section === section && q.topic === topic);
  return QUESTIONS;
}

const selectedMode = () => document.querySelector('input[name="mode"]:checked').value;

// Refresh the counts and notes on the home screen.
function updateHome() {
  $("missed-count").textContent = missed.size;
  $("start-missed").disabled = missed.size === 0;
  $("clear-missed").hidden = missed.size === 0;
  const list = selectedQuestions();
  const noAnswer = list.filter((q) => !hasAnswer(q)).length;
  $("start-quiz").disabled = noAnswer === list.length;
  $("home-note").textContent = noAnswer
    ? `${noAnswer} of these questions don't have answers yet. They show up in flashcards but are skipped in quizzes.`
    : "";
}

/* ============================================================
   5. Flashcards
   ============================================================ */

const flash = { cards: [], index: 0, flipped: false };

function startFlashcards() {
  flash.cards = selectedQuestions();
  flash.index = 0;
  flash.flipped = false;
  showView("flash");
  renderCard();
}

function renderCard() {
  const q = flash.cards[flash.index];
  const card = $("card");
  card.replaceChildren();
  $("flash-progress").textContent = `Card ${flash.index + 1} of ${flash.cards.length} · tap the card to flip`;

  if (!flash.flipped) {
    // Front: the question (and its choices, if any)
    card.append(el("p", q.topic, "topic"), el("p", q.text, "question"));
    if (q.kind !== "tf") {
      const ol = el("ol");
      ol.type = "a";
      q.options.forEach((o) => ol.append(el("li", o)));
      card.append(ol);
    } else {
      card.append(el("p", "True or false?", "hint"));
    }
  } else {
    // Back: the answer
    card.append(el("p", "Answer", "label"));
    if (hasAnswer(q)) {
      q.correct.forEach((c) => card.append(el("p", c, "answer")));
      if (q.note) card.append(el("p", q.note, "hint"));
    } else {
      card.append(el("p", "Answer not added yet.", "hint"));
    }
  }
  $("flash-prev").disabled = flash.index === 0;
  $("flash-next").disabled = flash.index === flash.cards.length - 1;
}

/* ============================================================
   6. Quiz (also used for "Review missed")
   ============================================================ */

// mode: "easy" keeps going after a wrong answer, "hard" restarts.
// review: true when practicing the missed list; a right answer
// there removes the question from the list.
const quiz = { pool: [], order: [], index: 0, score: 0, mode: "easy", review: false };

function startQuiz(review) {
  quiz.review = review;
  quiz.mode = selectedMode();
  quiz.pool = review
    ? QUESTIONS.filter((q) => missed.has(q.text))
    : selectedQuestions().filter(hasAnswer);
  restartQuiz();
  showView("quiz");
}

function restartQuiz() {
  quiz.order = shuffle(quiz.pool);
  quiz.index = 0;
  quiz.score = 0;
  renderQuestion();
}

function renderQuestion() {
  const q = quiz.order[quiz.index];
  const label = quiz.mode === "hard" ? "streak" : "correct";
  $("quiz-progress").textContent =
    `${quiz.review ? "Missed review · " : ""}${quiz.mode === "hard" ? "Hard" : "Easy"} · ` +
    `Question ${quiz.index + 1} of ${quiz.order.length} · ${quiz.score} ${label}`;
  $("quiz-topic").textContent = q.topic;
  $("quiz-question").textContent = q.text;
  $("quiz-hint").textContent = q.kind === "multi" ? `Choose ${q.correct.length}.` : "";

  // One radio button per choice (checkboxes for "select all that apply")
  const box = $("quiz-options");
  box.replaceChildren();
  q.options.forEach((option) => {
    const input = document.createElement("input");
    input.type = q.kind === "multi" ? "checkbox" : "radio";
    input.name = "choice";
    input.value = option;
    input.addEventListener("change", () => {
      $("quiz-submit").disabled = !box.querySelector("input:checked");
    });
    const row = el("label");
    row.append(input, el("span", option));
    box.append(row);
  });

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

  // Right only if the chosen set exactly matches the correct set
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
    if (quiz.review) missed.delete(q.text);
    feedback.textContent = quiz.review ? "Correct! Removed from your missed list." : "Correct!";
    feedback.className = "feedback good";
  } else {
    missed.add(q.text);
    feedback.textContent = "Not quite. The correct answer is highlighted in green." +
      (q.note ? " " + q.note : "");
    feedback.className = "feedback bad";
  }
  saveMissed();

  $("quiz-submit").hidden = true;
  const last = quiz.index === quiz.order.length - 1;
  if (!isRight && quiz.mode === "hard") {
    feedback.textContent += ` Streak over at ${quiz.score}.`;
    $("quiz-restart").hidden = false;
  } else if (last) {
    showSummary();
  } else {
    $("quiz-next").hidden = false;
  }
  // On long questions, bring the feedback and Next button on screen
  $("quiz-next").parentElement.scrollIntoView({ block: "nearest", behavior: "smooth" });
}

// End of the quiz: show the score and offer to go again.
function showSummary() {
  const total = quiz.order.length;
  $("quiz-feedback").textContent += ` Done! You got ${quiz.score} of ${total} right.`;
  $("quiz-restart").textContent = "Go again";
  $("quiz-restart").hidden = false;
  if (quiz.review) quiz.pool = QUESTIONS.filter((q) => missed.has(q.text));
  if (quiz.pool.length === 0) $("quiz-restart").hidden = true; // nothing left to review
}

/* ============================================================
   7. Wire up the buttons
   ============================================================ */

$("topic-select").addEventListener("change", updateHome);
$("home-btn").addEventListener("click", () => { updateHome(); showView("home"); });

$("start-flash").addEventListener("click", startFlashcards);
$("start-quiz").addEventListener("click", () => startQuiz(false));
$("start-missed").addEventListener("click", () => startQuiz(true));
$("clear-missed").addEventListener("click", () => {
  if (confirm("Clear your whole missed list?")) {
    missed.clear();
    saveMissed();
    updateHome();
  }
});

$("card").addEventListener("click", () => { flash.flipped = !flash.flipped; renderCard(); });
$("flash-prev").addEventListener("click", () => { flash.index--; flash.flipped = false; renderCard(); });
$("flash-next").addEventListener("click", () => { flash.index++; flash.flipped = false; renderCard(); });
$("flash-shuffle").addEventListener("click", () => {
  flash.cards = shuffle(flash.cards);
  flash.index = 0;
  flash.flipped = false;
  renderCard();
});

$("quiz-submit").addEventListener("click", checkAnswer);
$("quiz-next").addEventListener("click", () => { quiz.index++; renderQuestion(); });
$("quiz-restart").addEventListener("click", () => {
  $("quiz-restart").textContent = "Restart";
  restartQuiz();
});

// Start on the home screen
buildTopicSelect();
updateHome();
