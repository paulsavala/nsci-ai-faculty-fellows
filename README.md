# Workshop site: setup

Three things to fill in: the Google Sheet connection, the YouTube videos, and the slide PDFs. All of them are edited near the top of `index.html`, in the block marked **CONFIGURATION**.

## 1. Connect the Google Sheet (about 15 minutes)

1. Create a new Google Sheet (for example, "AI Workshop Responses").
2. In the sheet, choose **Extensions → Apps Script**.
3. Delete whatever is in the editor, paste in all of `apps-script.gs`, and click **Save**.
4. Click **Deploy → New deployment**. Click the gear next to "Select type" and choose **Web app**.
   - Execute as: **Me**
   - Who has access: **Anyone**
5. Click **Deploy** and approve the permissions it asks for. Google will warn that the app isn't verified; click **Advanced → Go to (project name)**. This is your own script.
6. Copy the **Web app URL** (it ends in `/exec`).
7. In `index.html`, set it:
   ```js
   const SHEET_URL = "https://script.google.com/macros/s/XXXX/exec";
   ```
8. Test: open the site, fill in a name, department, and one answer, and click Submit. A "Responses" tab should appear in the sheet with one row per question.

Each submission adds rows for name, department, section, activity, question, answer, and a session ID. If someone edits and resubmits, the new rows are added below the old ones; the latest timestamp is their final answer.

If you later change `apps-script.gs`, use **Deploy → Manage deployments → Edit → New version** so the URL stays the same.

## 2. Add the videos

Upload each section's video to YouTube as **Unlisted** (only people with the link can see it, and it won't show up in search). From a link like `https://www.youtube.com/watch?v=AbC123xyz`, copy the part after `v=` into that section:

```js
youtubeId: "AbC123xyz",
```

## 3. Add the slides

Export each section's slides as a PDF and put them in a `slides/` folder next to `index.html`:

```
index.html
slides/section-1.pdf
slides/section-2.pdf
...
```

Then set each section's `slidesPdf: "slides/section-1.pdf"` and update its `slides: "1–18"` label to the real slide numbers.

## 4. Publish on GitHub Pages

Put `index.html` and the `slides/` folder in a repository (or a folder in your existing GitHub Pages site) and push. The site is plain HTML; nothing needs to be built.

## Notes

- **Answers are also kept in each person's browser**, so they can close the tab and come back without losing work. Clearing browser data removes that local copy, but anything already submitted is in the sheet.
- **The web-app URL is visible in the page source.** Anyone who finds it could add rows to the sheet. That's fine for a faculty workshop. If spam ever shows up, deploy a new version and update the URL.
