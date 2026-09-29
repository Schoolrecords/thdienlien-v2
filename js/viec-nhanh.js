// ============================================================
// viec-nhanh.js — "VIỆC HẰNG NGÀY" Ở ĐẦU TRANG CHỦ (29/9/2026)
//
// Thầy Chung: "các chức năng hay dùng, như Sổ chủ nhiệm, Báo việc, báo nghỉ
// phân công dạy thay dễ thấy nhất có thể" · "Việc duyệt, và bố trí dạy thay vẫn
// chưa thấy rõ". Hai phần:
//
// 1) HÀNG 4 NÚT TO theo vai (#viec-nhanh):
//   BGH / phụ trách điểm trường: Báo nghỉ · Dạy thay │ Duyệt đơn │ Báo việc │ Sổ chủ nhiệm
//   Giáo viên:                    Sổ chủ nhiệm (GVCN) hoặc TKB của tôi │ Xin nghỉ │ Báo việc │ Dạy thay của tôi
//   Máy tính: đầu trang chủ. Điện thoại (≤760px): thanh cố định ở ĐÁY màn hình —
//   nằm trong #mh-home nên chỉ hiện ở trang chủ (style.css khối .vn-*).
//
// 2) KHUNG "VIỆC CẦN XỬ LÝ" (#viec-can-lam) — chỉ BGH / phụ trách điểm trường:
//   · Dạy thay HÔM NAY và NGÀY HỌC KẾ TIẾP: người vắng · tiết cần thay · tiết CHƯA CÓ
//     NGƯỜI (đỏ) · tiết chưa nhận + nút "Bố trí ngay" (DAY_THAY.tomTat, luật y hệt màn Dạy thay)
//   · Từng ĐƠN XIN NGHỈ chờ duyệt, bấm Duyệt / Không duyệt NGAY TẠI TRANG CHỦ
//   Phạm vi: người phụ trách điểm trường → điểm mình; Hiệu trưởng (không phụ trách điểm nào) → toàn trường.
//
// Nút chỉ là LỐI TẮT: quyền thật vẫn do RLS + từng màn quyết định.
// ============================================================
(function () {
  'use strict';

  function may() { return window.MAY_CHU; }
  function thoat(s) { return window.thoatHTML ? window.thoatHTML(s) : String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return '&#' + c.charCodeAt(0) + ';'; }); }
  function pad(n) { return ('0' + n).slice(-2); }
  function iso(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function homNay() { return iso(new Date()); }
  // Ngày học kế tiếp (bỏ Chủ nhật) — thứ Bảy có trường còn học nên giữ
  function ngayHocSau(tu) { var p = tu.split('-'), d = new Date(+p[0], +p[1] - 1, +p[2] + 1); if (d.getDay() === 0) d.setDate(d.getDate() + 1); return iso(d); }
  var TEN_THU = ['Chủ nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
  function tenNgay(s) { var p = s.split('-'), d = new Date(+p[0], +p[1] - 1, +p[2]); return TEN_THU[d.getDay()] + ' ' + p[2] + '/' + p[1]; }
  function ngayVN(s) { var p = String(s || '').split('-'); return p.length === 3 ? p[2] + '/' + p[1] : ''; }
  function toi() { return window.NGUOI_DUNG || null; }
  function email() { return String((toi() || {}).email || '').toLowerCase(); }
  function bao(s) { if (window.notify) window.notify(s); }

  var DEM = { khoa: '', xong: false, vang: 0, don: 0, chuaNhan: 0, phuTrach: false, csToi: [], tenCS: {} };
  var LOAI_NGHI = { nghi_phep: 'Nghỉ phép', nghi_om: 'Nghỉ ốm', cong_tac: 'Công tác', viec_rieng: 'Việc riêng' };
  var BUOI = { ca_ngay: 'cả ngày', sang: 'buổi sáng', chieu: 'buổi chiều' };

  var MO = {
    dayThay: function () { if (window.DAY_THAY && window.DAY_THAY.moKhung) window.DAY_THAY.moKhung('bo-tri'); },
    dayThayCuaToi: function () { if (window.DAY_THAY && window.DAY_THAY.moKhung) window.DAY_THAY.moKhung('cua-toi'); },
    duyetDon: function () {
      // Có khung Việc cần xử lý thì đơn nằm ngay dưới — cuộn tới; không thì sang màn Đề xuất
      var k = document.getElementById('vcl-don');
      if (k && k.scrollIntoView) k.scrollIntoView({ behavior: 'smooth', block: 'center' });
      else if (window.DH) window.DH.moTab('dexuat');
    },
    xinNghi: function () { if (window.DH && window.DH.moXinNghi) window.DH.moXinNghi(); else if (window.DH) window.DH.moTab('dexuat'); },
    baoViec: function () { if (window.DH) window.DH.moTab('baoviec'); },
    tkb: function () { if (window.DH) window.DH.moTab('tkb'); },
    soCN: function () {
      var q = window.SCN_QUYEN || {}, S = window.SO_CHU_NHIEM;
      if (!S) return;
      if (!q.gvcn && laQuanLy() && S.moKiemTra) S.moKiemTra(); else S.moLop();
    }
  };
  function laQuanLy() { var u = toi(); return !may() || (!!u && (u.vai_tro === 'admin' || u.vai_tro === 'ban_giam_hieu')); }
  function laNguoiBoTri() { return laQuanLy() || DEM.phuTrach; }

  function dsNut() {
    var q = window.SCN_QUYEN || {};
    if (laNguoiBoTri()) {
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
    if (may() && !toi()) { o.innerHTML = ''; o.className = ''; veKhung(true); return; }   // chưa đăng nhập
    o.className = 'vn-hang';
    o.innerHTML = dsNut().map(function (n) {
      return '<button type="button" class="vn-nut" data-vn="' + n[2] + '"' + (n[3] ? ' title="' + n[3] + ' ' + thoat(n[4]) + '"' : '') + '>' +
        '<span class="vn-bi" aria-hidden="true">' + n[0] + '</span><span class="vn-chu">' + thoat(n[1]) + '</span>' +
        (n[3] ? '<span class="vn-so">' + n[3] + '</span>' : '') + '</button>';
    }).join('');
    demSo();
    veKhung();
  }

  // Số đếm: rẻ (head count), mỗi người mỗi ngày hỏi một lần; lỗi thì thôi không hiện số.
  function demSo() {
    if (!may()) return;
    var u = toi(), e = email(), hn = homNay(), khoa = e + '|' + hn;
    if (!u || !e || DEM.khoa === khoa) return;
    DEM.khoa = khoa; DEM.xong = false;
    var dem = function (q) { return q.then(function (r) { return (r && !r.error && r.count) || 0; }, function () { return 0; }); };
    Promise.all([
      may().from('co_so').select('ma, ten, phu_trach_email').eq('hoat_dong', true).then(function (r) { return (r && r.data) || []; }, function () { return []; }),
      dem(may().from('gv_vang').select('id', { count: 'exact', head: true }).lte('ngay', hn)
        .or('and(den_ngay.is.null,ngay.eq.' + hn + '),den_ngay.gte.' + hn)),
      laQuanLy() ? dem(may().from('de_xuat').select('id', { count: 'exact', head: true }).eq('trang_thai', 'cho_duyet')) : Promise.resolve(0),
      dem(may().from('day_thay').select('id', { count: 'exact', head: true }).eq('gv_thay_email', e).gte('ngay', hn)
        .in('trang_thai', ['da_phan', 'da_bao']))
    ]).then(function (r) {
      if (DEM.khoa !== khoa) return;
      DEM.tenCS = {}; r[0].forEach(function (c) { DEM.tenCS[c.ma] = c.ten; });
      DEM.csToi = r[0].filter(function (c) { return String(c.phu_trach_email || '').toLowerCase() === e; }).map(function (c) { return c.ma; });
      DEM.xong = true;
      DEM.phuTrach = DEM.csToi.length > 0; DEM.vang = r[1]; DEM.don = r[2]; DEM.chuaNhan = r[3];
      KHUNG.khoa = '';
      var o = document.getElementById('viec-nhanh');
      if (o && o.innerHTML) veLai();
    });
  }
  function veLai() { var k = DEM.khoa; ve(); DEM.khoa = k; }

  // ══════════════════════════════════════════════════════════════
  // KHUNG "VIỆC CẦN XỬ LÝ" — BGH / phụ trách điểm trường
  // ══════════════════════════════════════════════════════════════
  var KHUNG = { khoa: '', luc: 0, html: '' };
  function veKhung(an) {
    var o = document.getElementById('viec-can-lam');
    if (!o) return;
    if (an || (may() && !DEM.xong)) { if (an) o.innerHTML = ''; return; }   // chờ biết phân hiệu mình phụ trách
    if (!laNguoiBoTri()) { o.innerHTML = ''; return; }
    var hn = homNay(), mai = ngayHocSau(hn), cs = DEM.csToi.slice();
    var khoa = email() + '|' + hn + '|' + cs.join(',');
    // Vẽ lại bản nhớ nếu vừa tính (< 60 giây) — mỗi lần về trang chủ khỏi tính lại TKB
    if (KHUNG.khoa === khoa && Date.now() - KHUNG.luc < 60000) { o.innerHTML = KHUNG.html; return; }
    KHUNG.khoa = khoa; KHUNG.luc = Date.now();
    if (!KHUNG.html) o.innerHTML = '<section class="vcl"><div class="vcl-dau"><b>Việc cần xử lý</b><small>Đang tải…</small></div></section>';
    var DT = window.DAY_THAY;
    var trongPham = function (ma) { return !cs.length || cs.indexOf(ma) >= 0; };
    Promise.all([
      DT && DT.tomTat ? DT.tomTat(hn, cs).catch(function () { return null; }) : null,
      DT && DT.tomTat ? DT.tomTat(mai, cs).catch(function () { return null; }) : null,
      !may() ? Promise.resolve([{ id: -9, loai: 'nghi_phep', noi_dung: 'Việc gia đình', tu_ngay: mai, den_ngay: null, buoi: 'ca_ngay', co_so_ma: '', nguoi_gui_ten: 'Trần Văn Bình' }])
        : laQuanLy() ? may().from('de_xuat').select('id, loai, noi_dung, tu_ngay, den_ngay, buoi, co_so_ma, nguoi_gui_ten')
          .eq('trang_thai', 'cho_duyet').in('loai', Object.keys(LOAI_NGHI)).order('tu_ngay').limit(30)
          .then(function (r) { return (r && !r.error && r.data) || []; }, function () { return []; }) : Promise.resolve([])
    ]).then(function (r) {
      if (KHUNG.khoa !== khoa) return;
      var don = r[2].filter(function (d) { return trongPham(d.co_so_ma); }), donKhac = r[2].length - don.length;
      var tenPham = cs.length ? cs.map(function (m) { return DEM.tenCS[m] || m; }).join(', ') : 'toàn trường';
      var h = '<section class="vcl"><div class="vcl-dau"><b>Việc cần xử lý</b><small>' + thoat(tenPham) + '</small>' +
        '<button type="button" class="dh-nut-nho" data-vcl="bao-nghi">🙋 Báo nghỉ thay giáo viên</button></div>' +
        dongDayThay('Hôm nay', hn, r[0]) + dongDayThay('Ngày mai', mai, r[1]);
      if (don.length) {
        h += '<div id="vcl-don" class="vcl-nhom">📝 <b>' + don.length + ' đơn xin nghỉ chờ duyệt</b></div>' + don.map(function (d) {
          return '<div class="vcl-dong vang"><div><b>' + thoat(d.nguoi_gui_ten) + '</b> xin ' + thoat((LOAI_NGHI[d.loai] || d.loai).toLowerCase()) + ' ' +
            ngayVN(d.tu_ngay) + (d.den_ngay && d.den_ngay !== d.tu_ngay ? ' → ' + ngayVN(d.den_ngay) : '') + ' (' + (BUOI[d.buoi] || '') + ')' +
            (!cs.length && d.co_so_ma && DEM.tenCS[d.co_so_ma] ? ' · ' + thoat(DEM.tenCS[d.co_so_ma]) : '') +
            (d.noi_dung ? '<small>' + thoat(d.noi_dung) + '</small>' : '') + '</div>' +
            '<span class="vcl-nut"><button type="button" class="nut-chinh" data-vcl-duyet="' + d.id + '" data-tu="' + thoat(d.tu_ngay || '') + '">✓ Duyệt</button>' +
            '<button type="button" class="dh-nut-nho" data-vcl-tu-choi="' + d.id + '">Không duyệt</button></span></div>';
        }).join('');
      } else h += '<div class="vcl-dong xanh"><div>📝 Không có đơn xin nghỉ nào chờ duyệt' + (cs.length ? ' ở ' + thoat(tenPham) : '') + '.</div></div>';
      if (donKhac > 0) h += '<div class="vcl-phu">' + donKhac + ' đơn của phân hiệu khác — <a href="#" data-vcl="de-xuat">xem ở Đề xuất – duyệt ›</a></div>';
      h += '</section>';
      KHUNG.html = h;
      var o2 = document.getElementById('viec-can-lam');
      if (o2) o2.innerHTML = h;
    });
  }
  function dongDayThay(nhan, ngay, t) {
    var dau = '<b>' + nhan + '</b> · ' + tenNgay(ngay) + ': ';
    var nut = '<span class="vcl-nut"><button type="button" class="' + (t && t.chua ? 'nut-chinh' : 'dh-nut-nho') + '" data-vcl-bo="' + ngay + '">' +
      (t && t.chua ? '👨‍🏫 Bố trí ngay' : 'Mở dạy thay') + '</button></span>';
    if (!t) return '<div class="vcl-dong"><div>' + dau + 'không đọc được dữ liệu dạy thay.</div>' + nut + '</div>';
    if (!t.vang) return '<div class="vcl-dong xanh"><div>' + dau + 'không ai vắng.</div></div>';
    var ten = t.nguoi.slice(0, 3).map(function (n) { return thoat(n.ten); }).join(', ') + (t.nguoi.length > 3 ? '…' : '');
    if (!t.coTKB) return '<div class="vcl-dong vang"><div>' + dau + t.vang + ' người vắng (' + ten + ') — chưa có thời khóa biểu áp dụng ngày này.</div>' + nut + '</div>';
    var lop = t.chua ? 'do' : t.chuaNhan ? 'vang' : 'xanh';
    return '<div class="vcl-dong ' + lop + '"><div>' + dau + '<b>' + t.vang + '</b> người vắng (' + ten + ') · ' + t.tong + ' tiết cần thay' +
      (t.chua ? ' · <b class="vcl-do">' + t.chua + ' tiết chưa có người</b>' : t.tong ? ' · đã bố trí đủ' : '') +
      (t.chuaNhan ? ' · ' + t.chuaNhan + ' tiết chưa nhận' : '') + '</div>' + nut + '</div>';
  }
  function duyet(id, dongY, nut, tuNgay) {
    var hoi = window.hopHoi ? window.hopHoi(dongY ? 'Duyệt đơn xin nghỉ? Người này vào sổ vắng, rồi bố trí dạy thay được ngay.' : 'Không duyệt đơn này?',
      { tieuDe: 'Đơn xin nghỉ', nutOK: dongY ? 'Duyệt' : 'Không duyệt' }) : Promise.resolve(window.confirm(dongY ? 'Duyệt đơn?' : 'Không duyệt đơn?'));
    hoi.then(function (ok) {
      if (!ok) return;
      var xong = function () {
        DEM.khoa = ''; KHUNG.khoa = ''; KHUNG.html = '';
        ve();
        if (dongY && tuNgay && window.DAY_THAY) {
          bao('✅ Đã duyệt — bấm "Bố trí ngay" để chọn người dạy thay.');
        } else bao(dongY ? '✅ Đã duyệt.' : 'Đã ghi: không duyệt.');
      };
      if (!may()) { xong(); return; }
      nut.disabled = true;
      may().rpc('duyet_de_xuat', { p_id: id, p_dong_y: dongY, p_ghi_chu: null }).then(function (r) {
        if (r.error) { nut.disabled = false; bao('Không duyệt được: ' + r.error.message); return; }
        xong();
      });
    });
  }

  function gan() {
    var o = document.getElementById('viec-nhanh'), k = document.getElementById('viec-can-lam'), mh = document.getElementById('mh-home');
    if (!o) return;
    o.addEventListener('click', function (e) {
      var b = e.target && e.target.closest ? e.target.closest('[data-vn]') : null;
      if (b && MO[b.getAttribute('data-vn')]) MO[b.getAttribute('data-vn')]();
    });
    if (k) k.addEventListener('click', function (e) {
      var b = e.target && e.target.closest ? e.target.closest('[data-vcl],[data-vcl-bo],[data-vcl-duyet],[data-vcl-tu-choi]') : null;
      if (!b) return;
      e.preventDefault();
      if (b.hasAttribute('data-vcl-bo')) { if (window.DAY_THAY) window.DAY_THAY.moKhung('bo-tri', b.getAttribute('data-vcl-bo')); }
      else if (b.hasAttribute('data-vcl-duyet')) duyet(+b.getAttribute('data-vcl-duyet'), true, b, b.getAttribute('data-tu'));
      else if (b.hasAttribute('data-vcl-tu-choi')) duyet(+b.getAttribute('data-vcl-tu-choi'), false, b, '');
      else if (b.getAttribute('data-vcl') === 'bao-nghi') { if (window.DAY_THAY) window.DAY_THAY.moKhung('bao-nghi'); }
      else if (b.getAttribute('data-vcl') === 'de-xuat') { if (window.DH) window.DH.moTab('dexuat'); }
    });
    var hien = function () { if (!mh || mh.classList.contains('hien')) ve(); };
    if (mh && window.MutationObserver) new MutationObserver(hien).observe(mh, { attributes: true, attributeFilter: ['class'] });
    document.addEventListener('dangnhap-xong', function () { DEM.khoa = ''; KHUNG.khoa = ''; KHUNG.html = ''; hien(); });
    hien();
  }

  // Làm mới khi vai thay đổi (so-chu-nhiem.js báo SCN_QUYEN; dạy thay vừa nhận/bố trí…)
  window.VIEC_NHANH = { ve: function (lamMoi) { if (lamMoi) { DEM.khoa = ''; KHUNG.khoa = ''; } ve(); },
    // Màn Dạy thay vừa ghi (bố trí/huỷ/báo nghỉ/duyệt) → lần về trang chủ sau tính lại
    lamCu: function () { DEM.khoa = ''; KHUNG.khoa = ''; } };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', gan); else gan();
})();
