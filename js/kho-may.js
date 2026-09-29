// ════════════════════════════════════════════════════════════════════════════
// KHO TRÊN MÁY (IndexedDB) — nhớ dữ liệu đã tải để lần sau hiện ngay (29/9/2026)
//
// Dùng cho Sổ chủ nhiệm: mở sổ là hiện bản đã lưu, đồng thời hỏi máy chủ bản mới
// rồi vẽ lại. Máy chủ vẫn là nguồn duy nhất — kho này CHỈ để xem nhanh, không
// bao giờ ghi ngược lên máy chủ từ đây.
//
// 🔴 CÓ DỮ LIỆU CÁ NHÂN HỌC SINH — ba chốt chặn, đừng gỡ:
//   1. Mọi khoá bắt đầu bằng id tài khoản ("<uid>|…"). Người khác đăng nhập
//      trên cùng máy → giuNguoi(uid) xoá hết của người trước (supabase-ket-noi.js).
//   2. Đăng xuất → xoaHet() TRƯỚC khi signOut (supabase-ket-noi.js).
//   3. Bản lưu quá HAN ngày coi như không có và bị xoá.
// Trình duyệt không cho IndexedDB (chế độ ẩn danh cũ, bị chặn…) → mọi hàm trả
// null / không làm gì: app chạy như chưa có kho, chỉ chậm hơn.
// ════════════════════════════════════════════════════════════════════════════
(function () {
  var TEN = 'quan-tri-so', BANG = 'du-lieu', HAN = 7 * 24 * 3600 * 1000;
  var moSan = null;

  function mo() {
    if (moSan) return moSan;
    moSan = new Promise(function (xong) {
      try {
        if (!window.indexedDB) return xong(null);
        var r = indexedDB.open(TEN, 1);
        r.onupgradeneeded = function () { r.result.createObjectStore(BANG); };
        r.onsuccess = function () { xong(r.result); };
        r.onerror = r.onblocked = function () { xong(null); };
      } catch (e) { xong(null); }
    });
    return moSan;
  }
  // Chạy một việc trên bảng; lỗi gì cũng trả `mac` thay vì làm hỏng app.
  function lam(kieu, viec, mac) {
    return mo().then(function (db) {
      if (!db) return mac;
      return new Promise(function (xong) {
        try {
          var gd = db.transaction(BANG, kieu), bang = gd.objectStore(BANG), kq = mac;
          viec(bang, function (v) { kq = v; });
          gd.oncomplete = function () { xong(kq); };
          gd.onerror = gd.onabort = function () { xong(mac); };
        } catch (e) { xong(mac); }
      });
    });
  }

  window.KHO_MAY = {
    // → { v: giá trị, t: lúc lưu (ms) } hoặc null
    doc: function (khoa) {
      return lam('readonly', function (bang, tra) {
        var r = bang.get(khoa);
        r.onsuccess = function () { tra(r.result || null); };
      }, null).then(function (b) {
        if (!b || !b.t || Date.now() - b.t > HAN) return null;
        return b;
      });
    },
    ghi: function (khoa, v) {
      return lam('readwrite', function (bang) { bang.put({ v: v, t: Date.now() }, khoa); }, null);
    },
    xoaHet: function () {
      return lam('readwrite', function (bang) { bang.clear(); }, null);
    },
    // Xoá mọi thứ không thuộc tài khoản uid, và mọi bản đã quá hạn.
    giuNguoi: function (uid) {
      var dau = String(uid || '') + '|';
      return lam('readwrite', function (bang) {
        var r = bang.openCursor();
        r.onsuccess = function () {
          var c = r.result;
          if (!c) return;
          var b = c.value;
          if (!uid || String(c.key).indexOf(dau) !== 0 || !b || !b.t || Date.now() - b.t > HAN) c.delete();
          c.continue();
        };
      }, null);
    }
  };
})();
