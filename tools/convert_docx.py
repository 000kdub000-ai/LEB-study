"""
Convert a study .docx (same format as Contract_Law_Quiz_Questions_by_Topic.docx)
into one data file per section, ready for the app.

Usage (macOS, from the project folder):
    python3 tools/convert_docx.py path/to/file.docx

It writes data/section-<N>.js for every "Section N: ..." in the document.
After running it, add any NEW files to index.html (see README).
"""
import json
import re
import subprocess
import sys
from pathlib import Path

QUESTION = re.compile(
    r"^\d+\.\s+(.*)\s+\(Q\d+ · (Multiple Choice|True/False|Select All That Apply)\)\s*$")
TOPIC = re.compile(r"^\d+\.\s+(.+)$")
SECTION = re.compile(r"^Section (\d+):\s*(.+?)\s*\(\d+ questions\)")
MISSED = re.compile(r"\s+— MISSED on Attempt 1 \(you chose .+\)$")

HEADER = """// One section of study material. Each question looks like one of these:
//   Multiple choice: {"q": "Question?", "options": ["A", "B", "C"], "answer": "B"}
//   True/false:      {"q": "Statement.", "answer": true}
//   Select all:      {"q": "Choose two.", "options": ["A", "B", "C"], "answer": ["A", "C"]}
// The answer is the exact option text. No answer yet? Leave "answer" out
// (and add "multi": true for a select-all question). Optional: "note".
"""


def read_text(docx):
    """Use macOS's built-in textutil to turn the .docx into plain text."""
    return subprocess.run(["textutil", "-convert", "txt", "-stdout", str(docx)],
                          check=True, capture_output=True, text=True).stdout


def set_answer(q, raw, problems):
    """Turn the 'Answer: ...' text into the app's answer format."""
    m = MISSED.search(raw)
    if m:
        q["missedBefore"] = True
        raw = raw[:m.start()]
    if q["kind"] == "tf":
        q["answer"] = raw.startswith("True")
    elif q["kind"] == "multi":  # e.g. "a and c" -> the text of options a and c
        q["answer"] = [q["options"]["abcdef".index(l)] for l in re.findall(r"\b([a-f])\b", raw)]
    else:
        match = [o for o in q["options"] if raw == o] or \
                [o for o in q["options"] if raw.startswith(o)]
        if len(match) != 1:
            problems.append(f"{q['q'][:60]}... -> answer '{raw}' not found in options")
            return
        q["answer"] = match[0]
        extra = raw[len(match[0]):].strip(" ()")
        if extra:
            q["note"] = extra


def parse(text):
    sections, problems = [], []
    sec = q = None
    for line in text.splitlines():
        s = line.strip()
        if not s:
            continue
        if m := SECTION.match(s):
            sec = {"num": m[1], "section": f"Section {m[1]}: {m[2]}", "topics": {}}
            sections.append(sec)
            topic = None
        elif line.startswith("\t•\t"):
            if s.lstrip("•").strip() and q:
                q["options"].append(line[3:].strip())
        elif s.startswith("Answer:") and q:
            set_answer(q, s[7:].strip(), problems)
            q = None
        elif m := QUESTION.match(s):
            kind = {"True/False": "tf", "Select All That Apply": "multi"}.get(m[2], "mc")
            q = {"q": m[1], "kind": kind, "options": []}
            sec["topics"][topic].append(q)
        elif sec and (m := TOPIC.match(s)):
            topic = m[1]
            sec["topics"][topic] = []
            q = None
    return sections, problems


def to_js(sec):
    """Write a section in the hand-editable format the app reads."""
    out = []
    for topic, qs in sec["topics"].items():
        items = []
        for q in qs:
            item = {"q": q["q"]}
            if q["kind"] != "tf":
                item["options"] = q["options"]
            if "answer" in q:
                item["answer"] = q["answer"]
            elif q["kind"] == "multi":
                item["multi"] = True  # needed only while the answer is missing
            for key in ("note", "missedBefore"):
                if key in q:
                    item[key] = q[key]
            items.append("      " + json.dumps(item, ensure_ascii=False))
        out.append(f"    {json.dumps(topic, ensure_ascii=False)}: [\n" + ",\n".join(items) + ",\n    ]")
    return (HEADER + "STUDY.push({\n"
            f"  section: {json.dumps(sec['section'], ensure_ascii=False)},\n"
            "  topics: {\n" + ",\n".join(out) + ",\n  },\n});\n")


if __name__ == "__main__":
    sections, problems = parse(read_text(sys.argv[1]))
    Path("data").mkdir(exist_ok=True)
    for sec in sections:
        path = Path("data") / f"section-{sec['num']}.js"
        path.write_text(to_js(sec), encoding="utf-8")
        n = sum(len(v) for v in sec["topics"].values())
        a = sum(1 for v in sec["topics"].values() for q in v if "answer" in q)
        print(f"wrote {path}: {len(sec['topics'])} topics, {n} questions, {a} with answers")
    for p in problems:
        print("CHECK:", p)
