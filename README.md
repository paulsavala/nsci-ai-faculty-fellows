# NSCI AI Faculty Fellows: training site

Self-paced trainings for the NSCI Faculty Workshop. Each training is a folder with its own page; they all share one look, one engine, and one Google Sheet for answers.

```
index.html                 home page: one card per training
shared/
  workshop.css             the look (sidebar, fonts, colors)
  workshop.js              sidebar, videos, slides, saving answers
  site-config.js           Google Sheet URL, presenter, department list
apps-script.gs             paste into Google Apps Script (one-time setup)
understanding-ai/
  index.html               this training's sections and activities
  slides/                  one PDF per section
```

The site is plain HTML: nothing to build or install.

## 1. Connect the Google Sheet (one time, about 15 minutes)

1. Create a new Google Sheet (for example, "NSCI Training Responses").
2. In the sheet, choose **Extensions → Apps Script**.
3. Delete whatever is in the editor, paste in all of `apps-script.gs`, and click **Save**.
4. Click **Deploy → New deployment**. Click the gear next to "Select type" and choose **Web app**.
   - Execute as: **Me**
   - Who has access: **Anyone**
5. Click **Deploy** and approve the permissions. Google will warn that the app isn't verified; click **Advanced → Go to (project name)**. This is your own script.
6. Copy the **Web app URL** (it ends in `/exec`) into `shared/site-config.js`:
   ```js
   sheetUrl: "https://script.google.com/macros/s/XXXX/exec",
   ```
7. Test: open a training, fill in a name, department, and one answer, and click Submit. A "Responses" tab appears in the sheet with one row per question.

Every training writes to the same sheet; the **Training** column says which one. If someone edits and resubmits, new rows are added below the old ones, and the latest timestamp is their final answer.

If you later change `apps-script.gs`, use **Deploy → Manage deployments → Edit → New version** so the URL stays the same.

## 2. Add videos and slides to a training

Everything for a training is in its `index.html`, in the block marked **THIS TRAINING'S CONTENT**.

- **Videos:** upload to YouTube as **Unlisted**. From `https://www.youtube.com/watch?v=AbC123xyz`, copy the part after `v=`:
  ```js
  youtubeId: "AbC123xyz",
  ```
- **Slides:** export one PDF per section into that training's `slides/` folder and set `slidesPdf: "slides/section-1.pdf"`. Update the `slides: "1–11"` label to match. Put the whole deck in the same folder and set `fullSlidesPdf: "slides/all-slides.pdf"`; it shows up as a button in the sidebar.

## 3. Other people's answers

Each training page has an **Others' answers** sidebar on the right, collapsed by default. It shows everyone's latest answers for the current section, grouped by department and then by person ("Person 1", "Person 2", and "You" for your own). Names are never shown. People can drag the sidebar's left edge to make it wider. It loads from the same Google Sheet, so it works once the sheet is connected.

- **Hiding an answer:** type anything (for example, `x`) in that row's **Hide** column in the sheet. It disappears from the sidebar within a minute.
- **Answers from before this feature** don't have a **Question ID** and won't appear in the sidebar. They're still in the sheet.

## 4. Add a new training

1. Copy the `understanding-ai/` folder and rename it (for example, `prompting-for-research/`).
2. In the new `index.html`, change `id` (must be unique: it keeps each training's saved answers separate), `title`, `subtitle`, and the `sections` list.
3. On the home page (`index.html` at the top level), copy a card and point it at the new folder.

## 5. Publishing

GitHub Pages serves this repo directly: **Settings → Pages → Deploy from a branch → main / (root)**. After a push, the live site updates within a minute or two.

## Notes

- **After changing anything in `shared/`, bump the version number.** Each page loads the shared files as `workshop.js?v=2` and so on. Change every `?v=2` to `?v=3` (in `index.html` and each training's `index.html`) so browsers fetch the new files instead of using an old saved copy.

- **Answers are also kept in each person's browser** (per training), so they can close the tab and come back. Name and department carry over between trainings.
- **The web-app URL is visible in the page source.** Anyone who finds it could add rows to the sheet, or read the same anonymous answers the sidebar shows (departments, never names). That's fine for a faculty workshop; if spam ever shows up, deploy a new version and update the URL.
