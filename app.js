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
    for (const [topic, items] of Object.entries(sec.topics)) {
      group.append(new Option(`${topic} (${items.length})`, `t|${sec.section}|${topic}`));
    }
    select.append(group);
  });
}

// The questions matching the dropdown choice
function selectedQuestions() {
  const [type, section, topic] = $("topic-select").value.split("|");
  if (type === "s") return QUESTIONS.filter((q) => q.section === section);
  if (type === "t") return QUESTIONS.filter((q) => q.section === section && q.topic === topic);
  return QUESTIONS;
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

// mode: "easy" keeps going after a wrong answer, "hard" ends the run.
// review: practicing the missed list, where a right answer removes
// the question from the list.
const quiz = { pool: [], order: [], index: 0, score: 0, mode: "easy", review: false };

function startQuiz(review) {
  quiz.review = review;
  quiz.mode = document.querySelector('input[name="mode"]:checked').value;
  if (!review) quiz.pool = selectedQuestions().filter(hasAnswer);
  showView("quiz");
  restartQuiz();
}

function restartQuiz() {
  if (quiz.review) quiz.pool = missedQuestions(); // the list may have changed
  quiz.order = shuffle(quiz.pool);
  quiz.index = 0;
  quiz.score = 0;
  renderQuestion();
}

function renderQuestion() {
  const q = quiz.order[quiz.index];
  const score = quiz.mode === "hard" ? `streak ${quiz.score}` : `${quiz.score} ✓`;
  $("quiz-progress").textContent =
    `${quiz.review ? "Missed · " : ""}${quiz.mode === "hard" ? "Hard" : "Easy"} · ` +
    `${quiz.index + 1} of ${quiz.order.length} · ${score}`;
  $("quiz-topic").textContent = q.topic;
  $("quiz-question").textContent = q.text;

  // "Choose 3." hint, unless the question already says how many to pick
  const saysHowMany = /choose (two|three|four|\d)/i.test(q.text);
  $("quiz-hint").textContent = q.kind === "multi" && !saysHowMany ? `Choose ${q.correct.length}.` : "";
  $("quiz-hint").hidden = !$("quiz-hint").textContent;

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
    const label = el("label");
    label.append(input, el("span", option));
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

  if (!isRight && quiz.mode === "hard") {
    feedback.textContent += ` Streak over at ${quiz.score}.`;
    showRestart("Restart");
  } else if (quiz.index === quiz.order.length - 1) {
    feedback.textContent += ` Done! You got ${quiz.score} of ${quiz.order.length} right.`;
    // In review, there's nothing to go again with once the list is empty
    if (!quiz.review || missed.size > 0) showRestart("Go again");
  } else {
    $("quiz-next").hidden = false;
  }

  // On long questions, scroll the card so the correct answer is visible
  $("quiz-options").querySelector("label.correct")
    .scrollIntoView({ block: "nearest", behavior: "smooth" });
}

function showRestart(label) {
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

// The card flips on tap/click, or with Enter or Space on a keyboard
$("card").addEventListener("click", flipCard);
$("card").addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    flipCard();
  }
});
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
$("quiz-restart").addEventListener("click", restartQuiz);

buildTopicSelect();
updateHome();
