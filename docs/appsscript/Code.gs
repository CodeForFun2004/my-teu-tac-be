/**
 * Apps Script Web App — nhận dữ liệu order "paid" từ backend Tễu Tạc và append vào Sheet.
 * Deploy: xem hướng dẫn trong docs/BUILD_PLAN.md, mục "Hướng dẫn setup Google Apps Script".
 *
 * Trước khi deploy: Project Settings > Script Properties > thêm key "WEBHOOK_SECRET"
 * với giá trị PHẢI khớp với GOOGLE_SHEET_WEBHOOK_SECRET trong .env của backend.
 */

const SHEET_NAME = 'Orders';
const HEADERS = [
  'Mã đơn',
  'Thời gian thanh toán',
  'Họ tên',
  'SĐT',
  'Email',
  'Tỉnh/Thành',
  'Địa chỉ cụ thể',
  'Ghi chú',
  'Sản phẩm',
  'Tổng tiền',
  'Mã giao dịch PayOS',
];

function getOrCreateSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function orderIdAlreadyExists(sheet, orderId) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return false;
  // Chỉ đọc cột A (Mã đơn) thay vì cả bảng — rẻ hơn khi Sheet có nhiều dòng.
  const ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  return ids.some((row) => row[0] === orderId);
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const expectedSecret = PropertiesService.getScriptProperties().getProperty('WEBHOOK_SECRET');

    if (!expectedSecret || body.secret !== expectedSecret) {
      return jsonResponse({ ok: false, error: 'unauthorized' });
    }
    if (!body.orderId) {
      return jsonResponse({ ok: false, error: 'missing orderId' });
    }

    // Lock toàn script trong lúc check-trùng + append — tránh 2 request đến gần như
    // đồng thời (webhook bắn lại, backend retry mạng) cùng đọc thấy "chưa có" rồi ghi trùng.
    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      const sheet = getOrCreateSheet();

      if (orderIdAlreadyExists(sheet, body.orderId)) {
        return jsonResponse({ ok: true, duplicate: true });
      }

      sheet.appendRow([
        body.orderId,
        body.paidAt || '',
        body.fullName || '',
        body.phone || '',
        body.email || '',
        body.city || '',
        body.addressDetail || '',
        body.note || '',
        body.itemsSummary || '',
        body.totalAmount || 0,
        body.payosTransactionId || '',
      ]);

      return jsonResponse({ ok: true });
    } finally {
      lock.releaseLock();
    }
  } catch (err) {
    return jsonResponse({ ok: false, error: String(err) });
  }
}
