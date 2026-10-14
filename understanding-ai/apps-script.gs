/**
 * Google Apps Script for the workshop site.
 * Receives answers from the web page and adds one row per question
 * to the sheet named "Responses". See README.md for setup steps.
 */

const SHEET_NAME = "Responses";
const HEADERS = ["Timestamp", "Name", "Department", "Section", "Activity", "Part", "Question", "Answer", "Session ID"];

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000); // avoid two submissions writing at once
  try {
    const data = JSON.parse(e.postData.contents);
    const sheet = getSheet_();
    const now = new Date();
    const rows = (data.rows || []).map(r => [
      now,
      clean_(data.name),
      clean_(data.department),
      clean_(r.section),
      clean_(r.activity),
      clean_(r.part),
      clean_(r.question),
      clean_(r.answer),
      clean_(data.sessionId)
    ]);
    if (rows.length) {
      sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, HEADERS.length).setValues(rows);
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

// Visiting the web-app URL in a browser shows this, which confirms it's deployed.
function doGet() {
  return ContentService.createTextOutput("Workshop response collector is running.");
}

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight("bold");
  }
  return sheet;
}

// Keep cells as plain text: stops a typed "=..." from being run as a formula, and caps length.
function clean_(v) {
  let s = (v === undefined || v === null) ? "" : String(v);
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return s.slice(0, 45000);
}
