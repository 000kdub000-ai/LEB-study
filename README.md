# LEB Study

A simple study app for the LEB contract law class: flashcards, a quiz with
easy and hard modes, and a list of the questions you got wrong so you can
practice them.

It's plain HTML, CSS and JavaScript. There's nothing to install or build, and
your missed list is saved in your own browser (localStorage).

## What's in this folder

| File | What it does |
|---|---|
| `index.html` | The page layout, plus the list of data files to load |
| `style.css` | How it looks (colors at the top, light and dark mode) |
| `app.js` | How it works: flashcards, quiz and the missed list |
| `data/chapter-11.js`, `data/chapter-12.js`, `data/chapter-13.js` | The study questions, one file per chapter |
| `sounds.js` | The "streak lost" messages and which sound goes with each |
| `sounds/` | The sound recordings (credits at the bottom of this README) |
| `sound-test.html` | A test page: tap a button to hear each sound and see its message |
| `tools/convert_docx.py` | Optional helper that turns a study Word doc into data files |

## 1. Open the app on your computer

**Quickest way:** double-click `index.html` to open it in your browser.

**Closer to the real website:** run a tiny local web server. In Terminal:

```bash
cd ~/claude/leb-study-app
```

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000>. Press `Ctrl+C` in Terminal to stop it.

After you change a file, refresh the page to see the change.

## 2. Put the project on GitHub

1. Sign in at <https://github.com> (create a free account if you need one).
2. Click **+** (top right), then **New repository**.
3. Name it, for example `leb-study`. Choose **Public**. Free GitHub Pages
   needs a public repo, so anyone with the link can see the questions.
   **Don't** tick "Add a README" (this project already has one).
4. Click **Create repository**.
5. GitHub then shows a page of commands. Use the ones under
   **"…or push an existing repository from the command line"**. They look
   like this, but with your username:

   ```bash
   cd ~/claude/leb-study-app
   ```

   ```bash
   git remote add origin https://github.com/YOUR-USERNAME/leb-study.git
   ```

   ```bash
   git push -u origin main
   ```

   The first push may ask you to sign in to GitHub. If it asks for a
   password, GitHub needs a *personal access token*, not your account
   password. The easiest fix is installing GitHub's own sign-in helper
   (`brew install gh`, then `gh auth login`), or using the GitHub Desktop app.

## 3. Turn on GitHub Pages

1. On your repo's page on GitHub, open **Settings**.
2. In the left sidebar, click **Pages**.
3. Under **Build and deployment**:
   - **Source:** Deploy from a branch
   - **Branch:** `main`, folder `/ (root)`, then click **Save**.
4. Wait a minute or two, then refresh that page. The live address appears
   at the top, like `https://YOUR-USERNAME.github.io/leb-study/`.

Bookmark it or add it to your phone's home screen. Share that link with the
people who'll use it.

## 4. Update the live site after changes

If you changed `style.css` or `app.js`, first raise the `?v=` number on both
of their lines in `index.html` (for example `?v=2` to `?v=3`). That makes
browsers load the new files instead of an old saved copy.

Then, every time you change something:

```bash
cd ~/claude/leb-study-app
```

```bash
git add .
```

```bash
git commit -m "Describe what you changed"
```

```bash
git push
```

GitHub Pages republishes automatically, usually within a minute or two. If you
don't see the change, do a hard refresh (`Cmd+Shift+R` on a Mac).

## Adding or changing study material

All questions live in the `data/` folder, one file per chapter. The app builds
the Chapter and Topic dropdowns from these files automatically. Each file's
`section` line is the name shown in the Chapter dropdown, for example
`section: "Chapter 13: Consideration"`.

### Add an answer to an existing question (for example, Chapter 12)

Open `data/chapter-12.js`, find the question, and add an `answer`. The answer
is the **exact text** of the correct option:

```js
// before
{"q": "Taylor says to Bianka, ...", "options": ["offer", "invitation to negotiate, not an offer", ...]},
// after
{"q": "Taylor says to Bianka, ...", "options": ["offer", "invitation to negotiate, not an offer", ...], "answer": "..."},
```

- True/false: `"answer": true` or `"answer": false`
- Select all that apply: a list, `"answer": ["first correct option", "second correct option"]`.
  Remove `"multi": true` once the answer is there (it's only needed while the
  answer is missing).
- Optional: `"note": "a short explanation"` is shown with the answer.

Questions without an answer still appear as flashcards, but quizzes skip them.

### Add a new chapter by hand

1. Copy `data/chapter-11.js` to a new file, such as `data/chapter-14.js`.
2. Change the `section` name (for example `"Chapter 14: Capacity"`) and replace the topics and questions. The
   comment at the top of each data file shows the format for every question
   type.
3. In `index.html`, add a line for the new file next to the others:

   ```html
   <script src="data/chapter-14.js"></script>
   ```

### Add a new chapter from a Word doc

If a new study doc uses the **same layout** as
`Contract_Law_Quiz_Questions_by_Topic.docx` ("Section N: …" headings,
numbered topics, `(Q12 · Multiple Choice)` tags and `Answer:` lines):

```bash
python3 tools/convert_docx.py path/to/new-file.docx
```

It writes `data/section-N.js` for each section in the doc and reports any
answers it couldn't match. Then add any new files to `index.html` as shown
above. **Note:** if the doc includes sections that already exist, it
overwrites those files, including any answers you added by hand.

The converter names files and sections after the doc's "Section N" numbers.
Rename the file to `chapter-N.js` and change its `section` line to
`"Chapter N: …"` to match the others. (The original doc's Sections 1 and 2
are now Chapters 11 and 12, so don't re-run it on that doc.)

A tip if you edit questions: the missed list remembers questions by their
text. If you change a question's wording, it drops off the missed list.

## Sound credits

The "streak lost" sounds are trimmed recordings from Wikimedia Commons.

| Sound | Original file | By | License |
|---|---|---|---|
| `sounds/streak-lost.m4a` | [Fim efeito sonoro retrô.oga](https://commons.wikimedia.org/wiki/File:Fim_efeito_sonoro_retr%C3%B4.oga) | Rafaeljuliani | CC0 |
| `sounds/nope.m4a` | [Buzzer.wav](https://commons.wikimedia.org/wiki/File:Buzzer.wav) | David Pride | CC0 |
| `sounds/cmon-really.m4a` | [Three sighs.ogg](https://commons.wikimedia.org/wiki/File:Three_sighs.ogg) (the third sigh) | ezwa | Public domain |
| `sounds/lock-in.m4a` | [Field cricket Gryllus pennsylvanicus.ogg](https://commons.wikimedia.org/wiki/File:Field_cricket_Gryllus_pennsylvanicus.ogg) | Thatcher | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/) (trimmed and volume-adjusted; this trimmed copy is shared under the same license) |
| `sounds/cs-get-degrees.m4a` | [Luftrüssel.ogg](https://commons.wikimedia.org/wiki/File:Luftr%C3%BCssel.ogg) | Flo Sorg | Public domain |
| `sounds/effort.m4a` | [619016 mrrap4food clapping-then-leaving.mp3](https://commons.wikimedia.org/wiki/File:619016_mrrap4food_clapping-then-leaving.mp3) | mrrap4food | CC0 |
| `sounds/womp-womp.m4a` | [Sad Trombone-Joe Lamb-665429450.ogg](https://commons.wikimedia.org/wiki/File:Sad_Trombone-Joe_Lamb-665429450.ogg) | Joe Lamb | [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/) (trimmed and volume-adjusted) |
