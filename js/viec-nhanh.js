// ============================================================
// viec-nhanh.js — HÀNG NÚT "VIỆC HẰNG NGÀY" ĐẦU TRANG CHỦ (29/9/2026)
//
// Thầy Chung: "các chức năng hay dùng, như Sổ chủ nhiệm, Báo việc, báo nghỉ
// phân công dạy thay dễ thấy nhất có thể". Trước đây: Dạy thay ở Điều hành ›
// Thời khóa biểu › Dạy thay (3 lần bấm), Xin nghỉ / Báo việc nằm trong Điều hành.
//
// Bốn nút TO, theo vai:
//   BGH / phụ trách điểm trường: Báo nghỉ · Dạy thay │ Duyệt đơn │ Báo việc │ Sổ chủ nhiệm
//   Giáo viên:                    Sổ chủ nhiệm (GVCN) hoặc TKB của tôi │ Xin nghỉ │ Báo việc │ Dạy thay của tôi
// Có số đếm (người vắng hôm nay, đơn chờ duyệt, tiết dạy thay chưa nhận).
// Máy tính: hàng nút đầu trang chủ. Điện thoại (≤760px): thanh cố định ở ĐÁY màn
// hình — nằm trong #mh-home nên chỉ hiện ở trang chủ (style.css khối .vn-*).
// Nút chỉ là LỐI TẮT: quyền thật vẫn do RLS + từng màn quyết định.
// ============================================================
(function () {
  'use strict';

  function may() { return window.MAY_CHU; }
  function thoat(s) { return window.thoatHTML ? window.thoatHTML(s) : String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return '&#' + c.charCodeAt(0) + ';'; }); }
  function pad(n) { return ('0' + n).slice(-2); }
  function homNay() { var d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function toi() { return window.NGUOI_DUNG || null; }
  function email() { return String((toi() || {}).email || '').toLowerCase(); }

  var DEM = { khoa: '', vang: 0, don: 0, chuaNhan: 0, phuTrach: false };

  // Mỗi nút: [biểu tượng, nhãn, hàm mở, số đếm]
  var MO = {
    dayThay: function () { if (window.DAY_THAY && window.DAY_THAY.moKhung) window.DAY_THAY.moKhung('bo-tri'); },
    dayThayCuaToi: function () { if (window.DAY_THAY && window.DAY_THAY.moKhung) window.DAY_THAY.moKhung('cua-toi'); },
    duyetDon: function () { if (window.DH) window.DH.moTab('dexuat'); },
    xinNghi: function () { if (window.DH) window.DH.moTab('dexuat'); },
    baoViec: function () { if (window.DH) window.DH.moTab('baoviec'); },
    tkb: function () { if (window.DH) window.DH.moTab('tkb'); },
    soCN: function () {
      var q = window.SCN_QUYEN || {}, S = window.SO_CHU_NHIEM;
      if (!S) return;
      if (!q.gvcn && laQuanLy() && S.moKiemTra) S.moKiemTra(); else S.moLop();
    }
  };
  function laQuanLy() { var u = toi(); return !may() || (!!u && (u.vai_tro === 'admin' || u.vai_tro === 'ban_giam_hieu')); }

  function dsNut() {
    var q = window.SCN_QUYEN || {};
    if (laQuanLy() || DEM.phuTrach) {
      return [
        ['👨‍🏫', 'Báo nghỉ · Dạy thay', 'dayThay', DEM.vang, 'người vắng hôm nay'],
        ['✅', 'Duyệt đơn', 'duyetDon', DEM.don, 'đơn chờ duyệt'],
        ['⚡', 'Báo việc', 'baoViec', 0, ''],
        ['📓', 'Sổ chủ nhiệm', 'soCN', 0, '']
      ];
    }
    return [
      q.gvcn ? ['📓', 'Sổ chủ nhiệm', 'soCN', 0, ''] : ['🗓️', 'TKB của tôi', 'tkb', 0, ''],
      ['🙋', 'Xin nghỉ', 'xinNghi', 0, ''],
      ['⚡', 'Báo việc', 'baoViec', 0, ''],
      ['👩‍🏫', 'Dạy thay của tôi', 'dayThayCuaToi', DEM.chuaNhan, 'tiết chưa nhận']
    ];
  }

  function ve() {
    var o = document.getElementById('viec-nhanh');
    if (!o) return;
    if (may() && !toi()) { o.innerHTML = ''; o.className = ''; return; }   // chưa đăng nhập
    o.className = 'vn-hang';
    o.innerHTML = dsNut().map(function (n) {
      return '<button type="button" class="vn-nut" data-vn="' + n[2] + '"' + (n[3] ? ' title="' + n[3] + ' ' + thoat(n[4]) + '"' : '') + '>' +
        '<span class="vn-bi" aria-hidden="true">' + n[0] + '</span><span class="vn-chu">' + thoat(n[1]) + '</span>' +
        (n[3] ? '<span class="vn-so">' + n[3] + '</span>' : '') + '</button>';
    }).join('');
    document.body.classList.add('co-viec-nhanh');
    demSo();
  }

  // Số đếm: rẻ (head count), mỗi người mỗi ngày hỏi một lần; lỗi thì thôi không hiện số.
  function demSo() {
    if (!may()) return;
    var u = toi(), e = email(), hn = homNay(), khoa = e + '|' + hn;
    if (!u || !e || DEM.khoa === khoa) return;
    DEM.khoa = khoa;
    var dem = function (q) { return q.then(function (r) { return (r && !r.error && r.count) || 0; }, function () { return 0; }); };
    Promise.all([
      may().from('co_so').select('ma').eq('hoat_dong', true).ilike('phu_trach_email', e).then(function (r) { return (r && r.data) || []; }, function () { return []; }),
      dem(may().from('gv_vang').select('id', { count: 'exact', head: true }).lte('ngay', hn)
        .or('and(den_ngay.is.null,ngay.eq.' + hn + '),den_ngay.gte.' + hn)),
      laQuanLy() ? dem(may().from('de_xuat').select('id', { count: 'exact', head: true }).eq('trang_thai', 'cho_duyet')) : Promise.resolve(0),
      dem(may().from('day_thay').select('id', { count: 'exact', head: true }).eq('gv_thay_email', e).gte('ngay', hn)
        .in('trang_thai', ['da_phan', 'da_bao']))
    ]).then(function (r) {
      if (DEM.khoa !== khoa) return;
      DEM.phuTrach = r[0].length > 0; DEM.vang = r[1]; DEM.don = r[2]; DEM.chuaNhan = r[3];
      var o = document.getElementById('viec-nhanh');
      if (o && o.innerHTML) veLai();
    });
  }
  function veLai() { var k = DEM.khoa; ve(); DEM.khoa = k; }

  function gan() {
    var o = document.getElementById('viec-nhanh'), mh = document.getElementById('mh-home');
    if (!o) return;
    o.addEventListener('click', function (e) {
      var b = e.target && e.target.closest ? e.target.closest('[data-vn]') : null;
      if (b && MO[b.getAttribute('data-vn')]) MO[b.getAttribute('data-vn')]();
    });
    var hien = function () { if (!mh || mh.classList.contains('hien')) ve(); };
    if (mh && window.MutationObserver) new MutationObserver(hien).observe(mh, { attributes: true, attributeFilter: ['class'] });
    document.addEventListener('dangnhap-xong', function () { DEM.khoa = ''; hien(); });
    hien();
  }

  // Làm mới khi vai thay đổi (so-chu-nhiem.js báo SCN_QUYEN; dạy thay vừa nhận…)
  window.VIEC_NHANH = { ve: function (lamMoi) { if (lamMoi) DEM.khoa = ''; ve(); } };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', gan); else gan();
})();
