// ============================================================
// nap-luoi.js — TẢI CHẬM phần xuất biểu ít dùng (30/9/2026, sổ dự án 110)
//
// Đề xuất 6 mục 106 / việc sau mục 105: gói chính js/goi.min.js ~1 MB (~290 KB
// sau nén) mà mọi máy phải tải lúc mở app. Ba tệp CHỈ chạy khi có người bấm nút
// xuất nay nằm ở gói phụ js/goi-phu.min.js (dong-goi.js dựng từ khối
// <template id="goi-nguon-phu"> của index.html):
//   bieu-mau.js · tcqg-word.js · xuat-bao-cao-tdg.js
// Tệp này (gói chính) đặt "CỬA THAY" đúng các tên mà nơi khác gọi — bấm nút là
// tải gói phụ rồi gọi hàm thật với đúng tham số. Tệp thật nạp xong GHI ĐÈ các
// tên đó. Đăng nhập xong ~10 giây app tự tải sẵn gói phụ ở chế độ ngầm (sw.js
// giữ lại theo ?v=), nên lần bấm đầu hầu như không phải chờ.
//
// 🔴 Thêm hàm mới vào ba tệp trên mà nơi khác gọi tới → PHẢI thêm tên vào CUA
//    dưới đây, không thì chỗ gọi thấy "chưa có hàm". Điều kiện để một tệp được
//    chuyển sang gói phụ: không đăng ký gì lúc mở app mà nơi khác dùng ĐỒNG BỘ
//    (du-gio.js KHÔNG được: dieu-hanh.js đọc DG.oGiu ngay khi nạp).
// ============================================================
(function () {
  'use strict';

  var hua = null;
  function duongDan() {
    var m = document.querySelector('meta[name="goi-phu"]');
    return (m && m.getAttribute('content')) || 'js/goi-phu.min.js';
  }
  // Tải gói phụ đúng MỘT lần; lỗi mạng thì lần bấm sau thử lại
  function napGoiPhu() {
    if (hua) return hua;
    hua = new Promise(function (xong, hong) {
      var s = document.createElement('script');
      s.src = duongDan();
      s.onload = function () { xong(); };
      s.onerror = function () { hua = null; hong(new Error('không tải được phần xuất biểu (mạng chập chờn?)')); };
      document.head.appendChild(s);
    });
    return hua;
  }
  function baoLoi(e) { if (window.notify) window.notify('Chưa mở được: ' + ((e && e.message) || e) + ' — bấm lại sau vài giây.'); }

  // Cửa thay cho một hàm toàn cục: tải gói rồi gọi hàm thật (đã ghi đè tên này)
  function cuaHam(ten) {
    var cua = function () {
      var thamSo = arguments;
      napGoiPhu().then(function () {
        var that = window[ten];
        if (typeof that === 'function' && that !== cua) that.apply(window, thamSo);
        else baoLoi(new Error('thiếu hàm ' + ten));
      }, baoLoi);
    };
    cua.laCuaThay = true;
    return cua;
  }
  ['xuatDanhSachHoiDong', 'xuatPhanCongHoiDong', 'xuatMinhChungTheoTieuChuan', 'xuatMinhChungTieuChi', 'xuatBieu2', 'xuatBaoCaoTuDanhGia']
    .forEach(function (ten) { if (!window[ten]) window[ten] = cuaHam(ten); });

  // Cửa thay cho BIEU_MAU (đối tượng nhiều hàm, đều không trả giá trị)
  if (!window.BIEU_MAU) {
    var cuaBM = { laCuaThay: true };
    ['xem', 'danhMuc', 'dayThay', 'diemDanhLop', 'diemDanhTruong', 've'].forEach(function (ten) {
      cuaBM[ten] = function () {
        var thamSo = arguments;
        napGoiPhu().then(function () {
          var that = window.BIEU_MAU;
          if (that && that !== cuaBM && typeof that[ten] === 'function') that[ten].apply(that, thamSo);
          else baoLoi(new Error('thiếu phần biểu mẫu'));
        }, baoLoi);
      };
    });
    window.BIEU_MAU = cuaBM;
  }

  window.napGoiPhu = napGoiPhu;
  // Tải sẵn ngầm sau khi đăng nhập (không chen vào lúc đang dựng màn đầu)
  document.addEventListener('dangnhap-xong', function () {
    setTimeout(function () { napGoiPhu().catch(function () { /* bấm nút sẽ thử lại */ }); }, 10000);
  });
})();
