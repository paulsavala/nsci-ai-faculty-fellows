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

// ?section=<training id>/<section id> returns that section's shared answers.
// Visiting the bare web-app URL in a browser confirms it's deployed.
function doGet(e) {
  const section = e && e.parameter && e.parameter.section;
  if (!section) return ContentService.createTextOutput("Training response collector is running.");
  return json_(sharedAnswers_(section));
}

// Everyone's latest answer to each question in a shared section, with no names attached.
// Type anything in a row's "Hide" cell to keep that answer from being shown.
function sharedAnswers_(section) {
  if (!/^[\w-]+\/[\w-]+$/.test(section)) return { ok: false, error: "Unknown section." };
  const cache = CacheService.getScriptCache();
  const cached = cache.get("shared:" + section);
  if (cached) return JSON.parse(cached);

  const values = getSheet_().getDataRange().getValues();
  const col = name => values[0].indexOf(name);
  const cQid = col("Question ID"), cAns = col("Answer"), cSess = col("Session ID"), cHide = col("Hide");
  const prefix = section + "-";
  const latest = {}; // "session|question" -> answer; later rows replace earlier ones
  for (let i = 1; i < values.length; i++) {
    const row = values[i], qid = String(row[cQid] || "");
    if (!qid.startsWith(prefix)) continue;
    latest[row[cSess] + "|" + qid] = String(row[cHide] || "").trim() ? "" : String(row[cAns] || "").trim();
  }

  const answers = {}, people = {};
  Object.keys(latest).forEach(k => {
    if (!latest[k]) return;
    const [sess, qid] = k.split("|");
    const key = qid.slice(section.indexOf("/") + 1); // e.g. "s1-q0"
    (answers[key] = answers[key] || []).push(latest[k]);
    people[sess] = true;
  });
  // Shuffle so the order doesn't hint at who wrote what.
  Object.keys(answers).forEach(k => answers[k].sort(() => Math.random() - 0.5));

  const result = { ok: true, people: Object.keys(people).length, answers: answers };
  try { cache.put("shared:" + section, JSON.stringify(result), 60); } catch (err) { /* too big to cache: fine */ }
  return result;
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
