// ════════════════════════════════════════════════════════════════════════════
// SERVICE WORKER — GIỮ SẴN MÃ APP TRÊN MÁY THẦY CÔ (29/9/2026)
//
// Vì sao: mỗi lần mở trang, trình duyệt phải hỏi lại Cloudflare từng tệp trong
// ~45 tệp js/css (Cloudflare Pages mặc định max-age=0) rồi mới chạy được app.
// Tệp đã mang số phiên bản ?v=… thì nội dung KHÔNG BAO GIỜ đổi dưới cùng một
// địa chỉ — đổi mã là đổi số — nên lấy thẳng từ máy là đúng, không cần hỏi.
//
// 🔴 CHỈ giữ đúng hai loại:
//   1. Tệp CÙNG tên miền có tham số ?v=  → lấy ở máy trước, không có mới tải.
//   2. Thư viện supabase-js trên jsdelivr → dùng bản ở máy, tải bản mới ngầm.
// MỌI THỨ KHÁC ĐI THẲNG LÊN MẠNG, service worker không đụng tới:
//   - trang HTML (index.html) → bản mới triển khai là thầy cô thấy ngay, và
//     đường Google trả về sau đăng nhập (?code=…) giữ nguyên như cũ;
//   - cau-hinh/*.json → cauhinh.js đã tự nhớ vào localStorage;
//   - mọi lời gọi dữ liệu Supabase → KHÔNG giữ dữ liệu học sinh/CBGV ở đây.
//
// Đổi số ?v= trong index.html là máy tự lấy bản mới; bản cũ cùng đường dẫn bị
// xoá ngay khi bản mới vào kho, kho không phình dần.
// Sửa chính tệp này (sw.js) thì tăng số ở KHO để dọn sạch kho cũ.
// ════════════════════════════════════════════════════════════════════════════
var KHO = 'qts-tinh-v1';
var SUPABASE_CDN = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js';

self.addEventListener('install', function () { self.skipWaiting(); });

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k.indexOf('qts-tinh-') === 0 && k !== KHO; })
      .map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin === self.location.origin) {
    if (url.searchParams.has('v') && req.mode !== 'navigate') e.respondWith(layMayTruoc(req, url));
    return;
  }
  if (req.url === SUPABASE_CDN) e.respondWith(dungCuTaiNgam(req));
});

// Tệp có ?v=: có ở máy thì trả luôn; chưa có thì tải, cất, xoá bản số cũ.
function layMayTruoc(req, url) {
  return caches.open(KHO).then(function (kho) {
    return kho.match(req).then(function (co) {
      if (co) return co;
      return fetch(req).then(function (res) {
        if (dangCat(res, url)) {
          kho.put(req, res.clone()).then(function () { return xoaBanCu(kho, url); }).catch(function () {});
        }
        return res;
      });
    });
  }).catch(function () { return fetch(req); });
}

// Chỉ cất bản trả về lành: 200, cùng tên miền, và KHÔNG phải trang HTML dự
// phòng (Cloudflare Pages trả index.html cho đường dẫn không có — cất nhầm thì
// tệp js ấy hỏng tới khi đổi số phiên bản).
function dangCat(res, url) {
  if (!res || res.status !== 200 || res.type !== 'basic') return false;
  var loai = res.headers.get('content-type') || '';
  return !(loai.indexOf('text/html') === 0 && !/\.html?$/.test(url.pathname));
}

function xoaBanCu(kho, url) {
  return kho.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) {
      var u = new URL(k.url);
      return u.pathname === url.pathname && u.search !== url.search;
    }).map(function (k) { return kho.delete(k); }));
  });
}

// supabase-js@2 là nhãn trôi (bản 2.x mới nhất): dùng bản ở máy cho nhanh,
// đồng thời tải bản mới về cất cho lần sau. Mất mạng vẫn có bản cũ để chạy.
function dungCuTaiNgam(req) {
  return caches.open(KHO).then(function (kho) {
    return kho.match(req).then(function (co) {
      var moi = fetch(req).then(function (res) {
        if (res && (res.ok || res.type === 'opaque')) kho.put(req, res.clone()).catch(function () {});
        return res;
      });
      if (co) { moi.catch(function () {}); return co; }
      return moi;
    });
  }).catch(function () { return fetch(req); });
}
