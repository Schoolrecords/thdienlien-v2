// ============================================================
// app.js — khung SPA + vẽ 3 module (chế độ xem thử)
// Khi nối Supabase: các file *-sql.js ghi đè mảng dữ liệu trong
// du-lieu-demo.js rồi gọi lại veTatCa() — không sửa file này.
// ============================================================
(function () {
  'use strict';

  // ── Tiện ích ──
  function $(s, p) { return (p || document).querySelector(s); }
  function $$(s, p) { return Array.prototype.slice.call((p || document).querySelectorAll(s)); }
  // Bỏ dấu tiếng Việt để tìm kiếm
  function boDau(s) {
    return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
  }
  function thoatHTML(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // ── Điều hướng ──
  function chuyenManHinh(ma) {
    $$('.man-hinh').forEach(function (m) { m.classList.toggle('hien', m.id === 'mh-' + ma); });
    $$('nav.thanh-dieu-huong button').forEach(function (b) {
      b.classList.toggle('dang-chon', b.getAttribute('data-di') === ma);
    });
    window.scrollTo(0, 0);
  }
  window.chuyenManHinh = chuyenManHinh; // các thẻ module trang chủ gọi

  // ── Trang chủ ──
  function veTrangChu() {
    var hs = window.HO_SO;
    var co = hs.filter(function (h) { return h.tt === 'co'; }).length;
    var dang = hs.filter(function (h) { return h.tt === 'dang'; }).length;
    $('#tk-tong').textContent = hs.length;
    $('#tk-co').textContent = co;
    $('#tk-dang').textContent = dang;
    $('#tk-chua').textContent = hs.length - co - dang;
  }

  // ── Module 1: Quản lý Hồ sơ ──
  var locTrangThai = 'tatca';
  var tuKhoa = '';

  function veHoSo() {
    var goc = $('#danh-muc-ho-so');
    var tim = boDau(tuKhoa);
    var html = '';
    window.BO_PHAN.forEach(function (bp) {
      var htmlHop = '';
      bp.hop.forEach(function (maHop) {
        var hop = window.HOP[maHop];
        var ds = window.HO_SO.filter(function (h) { return h.hop === maHop; })
          .filter(function (h) { return locTrangThai === 'tatca' || h.tt === locTrangThai; })
          .filter(function (h) {
            if (!tim) return true;
            return boDau(h.ten + ' ' + h.ma + ' ' + h.maCu + ' ' + (hop.phuTrach || '')).indexOf(tim) >= 0;
          });
        if (!ds.length) return;
        var dong = ds.map(function (h) {
          return '<div class="dong-ho-so">' +
            '<span class="cham ' + h.tt + '"></span>' +
            '<div class="ten">' + thoatHTML(h.ten) +
            '<small>Mã cũ: ' + thoatHTML(h.maCu) + ' · Tiêu chí TT57: ' + h.tc.join(', ') + '</small></div>' +
            '<span class="ma">' + thoatHTML(h.ma) + '</span></div>';
        }).join('');
        htmlHop += '<div class="the hop" data-hop="' + maHop + '">' +
          '<button class="hop-dau" type="button">' + thoatHTML(hop.ten) +
          '<span class="dem">' + ds.length + ' hồ sơ · ' + thoatHTML(hop.phuTrach) + '</span></button>' +
          '<div class="hop-than">' + dong + '</div></div>';
      });
      if (htmlHop) html += '<section class="bo-phan"><h2>' + bp.icon + ' ' + thoatHTML(bp.ten) + '</h2>' + htmlHop + '</section>';
    });
    goc.innerHTML = html || '<p class="the">Không tìm thấy hồ sơ phù hợp.</p>';
    // Đang tìm kiếm thì mở sẵn mọi hộp cho dễ nhìn
    if (tim || locTrangThai !== 'tatca') $$('.hop', goc).forEach(function (h) { h.classList.add('mo'); });
    $$('.hop-dau', goc).forEach(function (nut) {
      nut.addEventListener('click', function () { nut.parentElement.classList.toggle('mo'); });
    });
  }

  // ── Module 2: Trường chuẩn Quốc gia ──
  function veTieuChi() {
    var goc = $('#danh-sach-tieu-chi');
    var html = '';
    window.TIEU_CHUAN.forEach(function (tc) {
      var dong = window.TIEU_CHI.filter(function (t) { return t.ma.charAt(0) === String(tc.so); })
        .map(function (t) {
          var soMC = window.HO_SO.filter(function (h) { return h.tc.indexOf(t.ma) >= 0; }).length;
          return '<div class="dong-tc"><span class="ma-tc">' + t.ma + '</span>' +
            '<span class="ten-tc">' + thoatHTML(t.ten) +
            ' <span class="nhan-mc">· ' + soMC + ' minh chứng trong kho</span></span>' +
            (t.batBuoc ? '<span class="nhan-bb">BẮT BUỘC</span>' : '') + '</div>';
        }).join('');
      html += '<div class="nhom-tc"><h3>Tiêu chuẩn ' + tc.so + '. ' + thoatHTML(tc.ten) + '</h3>' +
        '<div class="the" style="padding:0">' + dong + '</div></div>';
    });
    goc.innerHTML = html;
  }

  // ── Khởi động ──
  document.addEventListener('DOMContentLoaded', function () {
    // Điền thông tin trường
    $$('.dien-ten-truong').forEach(function (e) { e.textContent = window.CAU_HINH.TEN_TRUONG; });
    $('#dien-slogan').textContent = window.CAU_HINH.SLOGAN;
    $('#dien-nam-hoc').textContent = window.CAU_HINH.NAM_HOC;
    $('#dien-muc-tieu').textContent = window.CAU_HINH.MUC_TIEU_CHUAN_QG;
    if (window.DA_NOI) $('#bang-xem-thu').style.display = 'none';

    $$('nav.thanh-dieu-huong button').forEach(function (b) {
      b.addEventListener('click', function () { chuyenManHinh(b.getAttribute('data-di')); });
    });
    $('#o-tim-ho-so').addEventListener('input', function () { tuKhoa = this.value; veHoSo(); });
    $$('#loc-trang-thai button').forEach(function (b) {
      b.addEventListener('click', function () {
        locTrangThai = b.getAttribute('data-tt');
        $$('#loc-trang-thai button').forEach(function (x) { x.classList.toggle('dang-chon', x === b); });
        veHoSo();
      });
    });

    veTatCa();
  });

  function veTatCa() { veTrangChu(); veHoSo(); veTieuChi(); }
  window.veTatCa = veTatCa; // cho *-sql.js gọi lại sau khi ghi đè dữ liệu
})();
