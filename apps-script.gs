/**
 * Google Apps Script that collects answers from every training page.
 * Each submission adds one row per question to the sheet named "Responses".
 * It also hands back each section's answers, without names, for the "Others' answers" sidebar.
 * See README.md for setup steps.
 */

const SHEET_NAME = "Responses";
const HEADERS = ["Timestamp", "Training", "Name", "Department", "Section", "Activity", "Part", "Question", "Answer", "Session ID", "Question ID", "Hide"];

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000); // avoid two submissions writing at once
  try {
    const data = JSON.parse(e.postData.contents);
    const sheet = getSheet_();
    const now = new Date();
    const rows = (data.rows || []).map(r => [
      now,
      clean_(data.training),
      clean_(data.name),
      clean_(data.department),
      clean_(r.section),
      clean_(r.activity),
      clean_(r.part),
      clean_(r.question),
      clean_(r.answer),
      clean_(data.sessionId),
      clean_(r.questionId)
    ]);
    if (rows.length) {
      sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
    }
    return ContentService.createTextOutput(JSON.stringify({ ok: true, saved: rows.length }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

// ?section=<training id>/<section id> returns that section's shared answers;
// &me=<session id> marks the asker's own entry so the page can label it "You".
// Visiting the bare web-app URL in a browser confirms it's deployed.
function doGet(e) {
  const p = (e && e.parameter) || {};
  if (!p.section) return ContentService.createTextOutput("Training response collector is running.");
  return json_(sharedAnswers_(p.section, p.me || ""));
}

// Each person's latest answers in a section, with their department but no name.
// Type anything in a row's "Hide" cell to keep that answer from being shown.
function sharedAnswers_(section, me) {
  if (!/^[\w-]+\/[\w-]+$/.test(section)) return { ok: false, error: "Unknown section." };
  const cache = CacheService.getScriptCache();
  const cached = cache.get("shared:" + section);
  const people = cached ? JSON.parse(cached) : readPeople_(section);
  if (!cached) {
    try { cache.put("shared:" + section, JSON.stringify(people), 60); } catch (err) { /* too big to cache: fine */ }
  }
  // Session IDs stay on the server; the page only learns which entry is its own.
  return { ok: true, people: people.map(p => ({ dept: p.dept, answers: p.answers, mine: !!me && p.session === me })) };
}

function readPeople_(section) {
  const values = getSheet_().getDataRange().getValues();
  const col = name => values[0].indexOf(name);
  const cQid = col("Question ID"), cAns = col("Answer"), cSess = col("Session ID"), cHide = col("Hide"), cDept = col("Department");
  const prefix = section + "-";
  const bySession = {}; // later rows replace earlier ones, so each person's latest answers win
  const order = [];     // first-submission order, so "Person 1" stays the same person between visits
  for (let i = 1; i < values.length; i++) {
    const row = values[i], qid = String(row[cQid] || "");
    if (!qid.startsWith(prefix)) continue;
    const sess = String(row[cSess]);
    if (!bySession[sess]) { bySession[sess] = { session: sess, answers: {} }; order.push(sess); }
    const p = bySession[sess];
    p.dept = String(row[cDept] || "").trim();
    p.answers[qid.slice(section.indexOf("/") + 1)] = String(row[cHide] || "").trim() ? "" : String(row[cAns] || "").trim();
  }
  return order.map(s => bySession[s])
    .map(p => { Object.keys(p.answers).forEach(k => { if (!p.answers[k]) delete p.answers[k]; }); return p; })
    .filter(p => Object.keys(p.answers).length);
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME);
  // Writes the header row on a new sheet, and adds any new columns to an older one.
  const width = Math.max(sheet.getLastColumn(), 1);
  const current = sheet.getRange(1, 1, 1, width).getValues()[0];
  if (HEADERS.some((h, i) => current[i] !== h)) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]).setFontWeight("bold");
    sheet.setFrozenRows(1);
  }
  return sheet;
}

// Keep cells as plain text: stops a typed "=..." from being run as a formula, and caps length.
function clean_(v) {
  let s = (v === undefined || v === null) ? "" : String(v);
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return s.slice(0, 45000);
}
