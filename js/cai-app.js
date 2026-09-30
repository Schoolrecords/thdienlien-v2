// ============================================================
// cai-app.js — "THÊM VÀO MÀN HÌNH CHÍNH" trên điện thoại (30/9/2026, sổ dự án 108)
//
// Thầy Chung: "khi mở app trên điện thoại, có thêm tính năng Thêm vào màn hình
// chính trên cả iPhone và Samsung (Android)".
//   · Android (Chrome, Samsung Internet): trình duyệt phát sự kiện
//     beforeinstallprompt (manifest display 'minimal-ui') → giữ lại, bấm mục
//     "📲 Cài app lên điện thoại" là hiện hộp Cài của chính hệ điều hành.
//   · iPhone: Apple KHÔNG cho trang web tự hiện hộp cài → hộp hướng dẫn 3 bước
//     (nút Chia sẻ → Thêm vào MH chính → Thêm).
//   · Mở từ Zalo / Facebook (trình duyệt trong app) thì không cài được → nhắc
//     mở bằng Safari / Chrome trước, kèm nút chép đường dẫn.
// Lối vào: mục trong menu tài khoản (js/supabase-ket-noi.js) + MỘT lời nhắc nhỏ
// ở đáy màn hình, chỉ trên điện thoại, chỉ một lần mỗi máy (bấm "Để sau" là thôi).
// KHÔNG đặt nút/khung lên trang chủ (thầy Chung 29/9/2026, sổ dự án 102.3).
// Đã mở từ màn hình chính (display-mode khác browser / navigator.standalone) → ẩn hết.
// ============================================================
(function () {
  'use strict';

  var hoiCai = null;          // sự kiện beforeinstallprompt giữ lại
  var KHOA_NHAC = 'qts-nhac-cai-app';
  var ua = navigator.userAgent || '';
  var laIOS = /iPhone|iPad|iPod/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  var laAndroid = /Android/i.test(ua);
  var laDienThoai = laIOS || laAndroid;
  var trongApp = /Zalo|FBAN|FBAV|FB_IAB|Instagram|Line\/|MicroMessenger|TikTok/i.test(ua);
  var laSamsung = /SamsungBrowser/i.test(ua);
  var laChromeIOS = /CriOS/i.test(ua);

  function daCai() {
    try {
      if (navigator.standalone) return true;
      return ['standalone', 'minimal-ui', 'fullscreen'].some(function (m) {
        return window.matchMedia && window.matchMedia('(display-mode: ' + m + ')').matches;
      });
    } catch (e) { return false; }
  }
  function bao(s) { if (window.notify) window.notify(s); }
  function doc(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function ghi(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* trình duyệt chặn lưu — bỏ qua */ } }

  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();          // không để thanh nhắc của Chrome tự bật; dùng mục menu + lời nhắc của app
    hoiCai = e;
    capNhatMuc();
  });
  window.addEventListener('appinstalled', function () {
    hoiCai = null; ghi(KHOA_NHAC, 'da-cai'); goNhac(); capNhatMuc();
    bao('✅ Đã cài Quản trị số lên màn hình chính.');
  });

  // Mục trong menu tài khoản: hiện trên điện thoại, hoặc máy tính có thể cài (Chrome/Edge)
  function capNhatMuc() {
    var m = document.getElementById('muc-cai-app');
    if (m) m.hidden = daCai() || !(laDienThoai || hoiCai);
  }

  function cai() {
    goNhac();
    if (hoiCai) {
      var e = hoiCai; hoiCai = null;
      e.prompt();
      Promise.resolve(e.userChoice).then(function (kq) {
        if (kq && kq.outcome === 'accepted') ghi(KHOA_NHAC, 'da-cai');
        capNhatMuc();
      });
      return;
    }
    moHuongDan();
  }

  // ── Hộp hướng dẫn theo từng máy / trình duyệt ──
  function buoc(ds) { return '<ol class="ca-buoc">' + ds.map(function (b) { return '<li>' + b + '</li>'; }).join('') + '</ol>'; }
  var CHIA_SE = '<span class="ca-bi" aria-label="nút Chia sẻ"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12"/><path d="m8 7 4-4 4 4"/><path d="M6 11H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-1"/></svg></span>';
  function noiDung() {
    if (trongApp) {
      return '<p>Thầy cô đang mở app <b>trong Zalo / Facebook</b> — trình duyệt này không cài được lên màn hình chính.</p>' +
        buoc([laIOS
          ? 'Bấm nút <b>⋯</b> (góc trên bên phải) → chọn <b>Mở bằng trình duyệt</b> / <b>Mở trong Safari</b>.'
          : 'Bấm nút <b>⋮</b> hoặc <b>⋯</b> (góc trên bên phải) → chọn <b>Mở bằng trình duyệt</b> (Chrome hoặc Samsung Internet).',
          'Trong trình duyệt vừa mở, đăng nhập rồi vào lại mục <b>📲 Cài app lên điện thoại</b>.']) +
        '<p class="ca-phu">Không thấy mục đó thì chép đường dẫn dưới đây, dán vào ' + (laIOS ? 'Safari' : 'Chrome') + ':</p>' +
        '<div class="ca-link"><code>' + location.origin + '</code><button type="button" class="dh-nut-nho" data-ca="chep">Chép</button></div>';
    }
    if (laIOS) {
      return '<p>iPhone không cho trang web tự cài — thầy cô làm 3 bước (chỉ một lần):</p>' +
        buoc([(laChromeIOS ? 'Bấm nút Chia sẻ ' + CHIA_SE + ' trên thanh địa chỉ (góc trên bên phải).'
                           : 'Bấm nút <b>Chia sẻ</b> ' + CHIA_SE + ' ở thanh dưới cùng của Safari (nếu thanh bị ẩn thì chạm nhẹ đáy màn hình cho hiện ra).'),
          'Kéo danh sách xuống, chọn <b>Thêm vào MH chính</b> (Add to Home Screen).',
          'Bấm <b>Thêm</b> ở góc trên bên phải. Biểu tượng <b>Quản trị số</b> hiện trên màn hình chính.']) +
        '<p class="ca-phu">Lần sau chạm biểu tượng là vào thẳng, không phải gõ địa chỉ. Đăng nhập Google giữ như trong Safari.</p>';
    }
    if (laSamsung) {
      return buoc(['Bấm nút <b>≡</b> (menu, góc dưới bên phải).', 'Chọn <b>Thêm trang vào</b> → <b>Màn hình chờ</b> (Home screen).', 'Bấm <b>Thêm</b>.']) +
        '<p class="ca-phu">Nếu thấy biểu tượng <b>⤓ Cài đặt</b> trên thanh địa chỉ thì bấm vào đó là nhanh nhất.</p>';
    }
    if (laAndroid) {
      return buoc(['Bấm nút <b>⋮</b> (góc trên bên phải của Chrome).', 'Chọn <b>Cài đặt ứng dụng</b> hoặc <b>Thêm vào màn hình chính</b>.', 'Bấm <b>Cài đặt</b> / <b>Thêm</b>.']);
    }
    return buoc(['Trên Chrome / Edge: bấm biểu tượng <b>⤓ Cài đặt</b> ở cuối thanh địa chỉ (hoặc menu <b>⋮ → Truyền, lưu và chia sẻ → Cài đặt trang dưới dạng ứng dụng</b>).', 'Bấm <b>Cài đặt</b>.']) +
      '<p class="ca-phu">Trên điện thoại: mở trang này rồi vào menu tài khoản → 📲 Cài app lên điện thoại.</p>';
  }
  function moHuongDan() {
    dongHuongDan();
    var k = document.createElement('div');
    k.id = 'ca-hop'; k.className = 'ca-nen';
    k.setAttribute('role', 'dialog'); k.setAttribute('aria-modal', 'true'); k.setAttribute('aria-labelledby', 'ca-td');
    k.innerHTML = '<div class="ca-hop"><div class="ca-dau"><img src="img/app-192.png" alt="" width="44" height="44">' +
      '<div><h2 id="ca-td">Cài Quản trị số lên màn hình chính</h2><small>' + (laIOS ? 'iPhone / iPad' : laSamsung ? 'Samsung Internet' : laAndroid ? 'Android' : 'Máy tính') + '</small></div>' +
      '<button type="button" class="ca-x" data-ca="dong" aria-label="Đóng">✕</button></div>' + noiDung() +
      '<div class="ca-nut"><button type="button" class="nut-chinh" data-ca="dong">Đã hiểu</button></div></div>';
    document.body.appendChild(k);
    k.addEventListener('click', function (e) {
      if (e.target === k) { dongHuongDan(); return; }
      var b = e.target.closest ? e.target.closest('[data-ca]') : null;
      if (!b) return;
      if (b.getAttribute('data-ca') === 'dong') dongHuongDan();
      else if (b.getAttribute('data-ca') === 'chep') chep(location.origin);
    });
    var nut = k.querySelector('.nut-chinh'); if (nut && nut.focus) nut.focus();
  }
  function dongHuongDan() { var k = document.getElementById('ca-hop'); if (k) k.parentNode.removeChild(k); }
  function chep(chu) {
    var xong = function () { bao('📋 Đã chép đường dẫn — dán vào ' + (laIOS ? 'Safari' : 'Chrome') + '.'); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(chu).then(xong, function () { window.prompt('Chép đường dẫn:', chu); });
    else window.prompt('Chép đường dẫn:', chu);
  }

  // ── Lời nhắc một lần ở đáy màn hình (điện thoại, sau khi đăng nhập) ──
  function nhac() {
    if (!laDienThoai || daCai() || doc(KHOA_NHAC) || document.getElementById('ca-nhac')) return;
    var d = document.createElement('div');
    d.id = 'ca-nhac'; d.className = 'ca-nhac'; d.setAttribute('role', 'status');
    d.innerHTML = '<img src="img/app-192.png" alt="" width="36" height="36"><span><b>Cài Quản trị số lên màn hình chính</b>' +
      '<small>Lần sau chạm biểu tượng là vào ngay</small></span>' +
      '<button type="button" class="nut-chinh" data-ca-nhac="cai">' + (hoiCai ? 'Cài' : 'Xem cách') + '</button>' +
      '<button type="button" class="ca-x" data-ca-nhac="sau" aria-label="Để sau">✕</button>';
    document.body.appendChild(d);
    d.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('[data-ca-nhac]') : null;
      if (!b) return;
      ghi(KHOA_NHAC, b.getAttribute('data-ca-nhac') === 'cai' ? 'da-bam' : 'de-sau');
      if (b.getAttribute('data-ca-nhac') === 'cai') cai(); else goNhac();
    });
  }
  function goNhac() { var d = document.getElementById('ca-nhac'); if (d) d.parentNode.removeChild(d); }

  // Đăng nhập xong mới nhắc (lúc đó thầy cô đã vào app, không chen vào cổng đăng nhập)
  document.addEventListener('dangnhap-xong', function () { setTimeout(nhac, 6000); });

  window.CAI_APP = {
    cai: cai, moHuongDan: moHuongDan, capNhatMuc: capNhatMuc, nhac: nhac, daCai: daCai,
    ganMenu: function (nut) {
      if (!nut) return;
      capNhatMuc();
      nut.addEventListener('click', function () {
        var hop = document.getElementById('hop-tai-khoan'); if (hop) hop.classList.remove('hien');
        cai();
      });
    }
  };
})();
