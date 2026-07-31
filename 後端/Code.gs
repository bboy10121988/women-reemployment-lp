/**
 * 婦女再就業說明會 報名表單接收端點
 *
 * 落地頁以 POST 送出 JSON，此處驗證後寫入報名名單試算表。
 * 前端使用 no-cors 模式送出，讀不到回應內容，因此所有錯誤都必須寫入
 * 錯誤紀錄分頁，否則問題會完全隱形。
 */

var SHEET_ID   = '11J7WufKxG6Mjo4uRq5NE4RQxK7H8ifdOl4dLHk_uBKM';
var TAB_MAIN   = '報名名單';
var TAB_ERROR  = '錯誤紀錄';
var DEDUPE_MIN = 5; // 同一手機號碼幾分鐘內重複送出視為誤觸

var HEADERS = [
  '送出時間', '姓名', '手機', '希望場次', '投保狀況', '想問的問題',
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term',
  'fbclid', '來源網址'
];

function doGet() {
  return json({ ok: true, service: '婦女再就業說明會報名端點', time: now() });
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
  } catch (err) {
    logError('取得鎖定失敗', err, e);
    return json({ ok: false, error: 'busy' });
  }

  try {
    var raw = (e && e.postData && e.postData.contents) || '';
    var data;
    try {
      data = JSON.parse(raw);
    } catch (err) {
      logError('JSON 解析失敗', err, e);
      return json({ ok: false, error: 'bad_json' });
    }

    var name    = trim(data.name);
    var phone   = normalizePhone(data.phone);
    var session = trim(data.session);
    var status  = trim(data.status);

    if (!name || !phone || !session || !status) {
      logError('必填欄位不完整', new Error(JSON.stringify({
        name: !!name, phone: !!phone, session: !!session, status: !!status
      })), e);
      return json({ ok: false, error: 'missing_fields' });
    }
    if (!/^09\d{8}$/.test(phone)) {
      logError('手機格式不符', new Error(phone), e);
      return json({ ok: false, error: 'bad_phone' });
    }

    var sheet = getTab(TAB_MAIN, HEADERS);

    if (isDuplicate(sheet, phone)) {
      return json({ ok: true, duplicate: true });
    }

    sheet.appendRow([
      now(),
      name,
      "'" + phone,                 // 前置單引號，避免試算表把 09 開頭當數字吃掉前導零
      session,
      status,
      trim(data.note),
      trim(data.utm_source),
      trim(data.utm_medium),
      trim(data.utm_campaign),
      trim(data.utm_content),
      trim(data.utm_term),
      trim(data.fbclid),
      trim(data.source)
    ]);

    return json({ ok: true });

  } catch (err) {
    logError('未預期錯誤', err, e);
    return json({ ok: false, error: 'internal' });
  } finally {
    lock.releaseLock();
  }
}

/* ---------- 工具 ---------- */

function getTab(tabName, headers) {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName(tabName);
  if (!sheet) sheet = ss.insertSheet(tabName);

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

/**
 * 只回頭檢查最後 50 列，避免名單長大後每次送出都全表掃描。
 */
function isDuplicate(sheet, phone) {
  var last = sheet.getLastRow();
  if (last < 2) return false;

  var from = Math.max(2, last - 49);
  var rows = sheet.getRange(from, 1, last - from + 1, 3).getValues();
  var cutoff = new Date().getTime() - DEDUPE_MIN * 60 * 1000;

  for (var i = 0; i < rows.length; i++) {
    var cell = String(rows[i][2]).replace(/^'/, '');
    if (cell !== phone) continue;

    var t = Date.parse(rows[i][0]);
    if (!isNaN(t) && t >= cutoff) return true;
  }
  return false;
}

function logError(label, err, e) {
  try {
    var sheet = getTab(TAB_ERROR, ['時間', '錯誤類型', '訊息', '原始內容']);
    sheet.appendRow([
      now(),
      label,
      err && err.message ? err.message : String(err),
      (e && e.postData && e.postData.contents ? e.postData.contents : '').slice(0, 2000)
    ]);
  } catch (ignore) {
    // 連錯誤都寫不進去時不再往上拋，避免整個端點掛掉
  }
}

function trim(v) {
  return v === undefined || v === null ? '' : String(v).trim();
}

function normalizePhone(v) {
  return trim(v).replace(/[\s\-()]/g, '');
}

function now() {
  return Utilities.formatDate(new Date(), 'Asia/Taipei', 'yyyy-MM-dd HH:mm:ss');
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
