# Binary Choice Survey

A mobile-first web app where users answer a series of binary (2-option) questions.
Built to validate a methodology for directing and scoping projects.

---

## Quick start

> **The app must be served over HTTP** — opening `index.html` directly via `file://` will fail because browsers block `fetch()` on the file protocol.

**Option 1 — Python (no install needed):**
```bash
cd r4
python -m http.server 8080
# open http://localhost:8080
```

**Option 2 — VS Code Live Server:**
Install the [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) extension, right-click `index.html` → "Open with Live Server".

---

## Customize questions

Edit `questions.json`. The structure is:

```json
{
  "meta": {
    "title": "Your survey title",
    "description": "A short description shown on the start screen."
  },
  "questions": [
    {
      "id": "q1",
      "text": "Your question here?",
      "options": [
        { "value": "a", "label": "Option A" },
        { "value": "b", "label": "Option B" }
      ]
    }
  ]
}
```

Rules:
- Each question **must** have exactly **2 options**
- `id` must be unique across questions
- Reload the page after saving to see changes

---

## File structure

```
r4/
├── index.html        # Single-page HTML shell (3 views)
├── style.css         # Mobile-first styles, CSS custom properties
├── app.js            # All app logic (IIFE, no framework)
├── questions.json    # Your questions data — edit this freely
├── .gitignore
└── README.md
```

---

## Why no framework?

This project is deliberately zero-dependency:

- No build step — open and run immediately
- Easy to read and modify without toolchain knowledge
- Validates the project concept before investing in infrastructure
- The entire app is ~120 lines of JS and ~200 lines of CSS
