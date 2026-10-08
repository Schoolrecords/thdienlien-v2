// ============================================================
// viec-nhanh.js — KHUNG "VIỆC CẦN XỬ LÝ" ĐẦU ĐIỀU HÀNH › TỔNG QUAN (29/9/2026)
//
// Thầy Chung: báo nghỉ, duyệt đơn, bố trí dạy thay phải dễ thấy — nhưng "để giao diện
// [trang chủ] như vốn có… các chức năng này nghiên cứu cho vào Điều hành". Bản đặt
// hàng nút + khung lên trang chủ (sáng 29/9) đã GỠ. Nay:
//   · Điều hành có thẻ riêng "Báo nghỉ – Dạy thay" (nhóm HÔM NAY, dieu-hanh.js + day-thay.js)
//   · Khung này ở ĐẦU thẻ Tổng quan — chỉ Ban giám hiệu / người phụ trách điểm trường:
//       - Dạy thay HÔM NAY và NGÀY HỌC KẾ TIẾP: người vắng · tiết cần thay · tiết CHƯA CÓ
//         NGƯỜI (đỏ) · tiết chưa nhận + "Bố trí ngay" (DAY_THAY.tomTat — luật y hệt màn Dạy thay)
//       - Từng ĐƠN XIN NGHỈ chờ duyệt: Duyệt / Không duyệt ngay tại chỗ
//   Phạm vi: phụ trách điểm trường → điểm mình; Hiệu trưởng (không phụ trách điểm nào) → toàn trường.
// dieu-hanh.js gọi VIEC_NHANH.veKhung(el) sau mỗi lần vẽ Tổng quan.
// ============================================================
(function () {
  'use strict';

  function may() { return window.MAY_CHU; }
  function thoat(s) { return window.thoatHTML ? window.thoatHTML(s) : String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return '&#' + c.charCodeAt(0) + ';'; }); }
  function pad(n) { return ('0' + n).slice(-2); }
  function iso(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function homNay() { return iso(new Date()); }
  // Ngày học kế tiếp theo cau_hinh.ngay_lam_viec (ISO 1..7, mặc định T2–T6; trường học sáng thứ Bảy
  // có 6) — Điều hành nạp và đưa ra qua window.DH_NGAY_LAM. Chưa nạp thì coi T2–T6.
  function ngayHocSau(tu) {
    var lam = (window.DH_NGAY_LAM && window.DH_NGAY_LAM()) || [1, 2, 3, 4, 5];
    var p = tu.split('-'), d = new Date(+p[0], +p[1] - 1, +p[2] + 1);
    for (var i = 0; i < 7 && lam.indexOf(d.getDay() === 0 ? 7 : d.getDay()) < 0; i++) d.setDate(d.getDate() + 1);
    return iso(d);
  }
  var TEN_THU = ['Chủ nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
  function tenNgay(s) { var p = s.split('-'), d = new Date(+p[0], +p[1] - 1, +p[2]); return TEN_THU[d.getDay()] + ' ' + p[2] + '/' + p[1]; }
  function ngayVN(s) { var p = String(s || '').split('-'); return p.length === 3 ? p[2] + '/' + p[1] : ''; }
  function toi() { return window.NGUOI_DUNG || null; }
  function email() { return String((toi() || {}).email || '').toLowerCase(); }
  function bao(s) { if (window.notify) window.notify(s); }
  function laQuanLy() { var u = toi(); return !may() || (!!u && (u.vai_tro === 'admin' || u.vai_tro === 'ban_giam_hieu')); }

  var LOAI_NGHI = { nghi_phep: 'Nghỉ phép', nghi_om: 'Nghỉ ốm', cong_tac: 'Công tác', viec_rieng: 'Việc riêng' };
  var BUOI = { ca_ngay: 'cả ngày', sang: 'buổi sáng', chieu: 'buổi chiều' };

  // Phân hiệu mình phụ trách — hỏi một lần mỗi người mỗi ngày
  var CS = { khoa: '', xong: null, csToi: [], tenCS: {} };
  function docPhanHieu() {
    var e = email(), khoa = e + '|' + homNay();
    if (CS.khoa === khoa && CS.xong) return CS.xong;
    CS.khoa = khoa;
    CS.xong = !may() ? Promise.resolve() : may().from('co_so').select('ma, ten, phu_trach_email').eq('hoat_dong', true).then(function (r) {
      var ds = (r && !r.error && r.data) || [];
      CS.tenCS = {}; ds.forEach(function (c) { CS.tenCS[c.ma] = c.ten; });
      CS.csToi = ds.filter(function (c) { return String(c.phu_trach_email || '').toLowerCase() === e; }).map(function (c) { return c.ma; });
    }, function () { CS.csToi = []; });
    return CS.xong;
  }

  var KHUNG = { khoa: '', luc: 0, html: '', el: null };
  function veKhung(el) {
    if (el) KHUNG.el = el;
    var o = KHUNG.el;
    if (!o || !document.body.contains(o)) return;
    if (may() && !toi()) { o.innerHTML = ''; return; }
    docPhanHieu().then(function () {
      if (!laQuanLy() && !CS.csToi.length) { o.innerHTML = ''; return; }   // giáo viên: không có khung
      var hn = homNay(), mai = ngayHocSau(hn), cs = CS.csToi.slice();
      var khoa = email() + '|' + hn + '|' + cs.join(',');
      // Vẽ lại bản nhớ nếu vừa tính (< 60 giây) — đổi thẻ qua lại khỏi tính lại TKB
      if (KHUNG.khoa === khoa && Date.now() - KHUNG.luc < 60000 && KHUNG.html) { o.innerHTML = KHUNG.html; return; }
      KHUNG.khoa = khoa; KHUNG.luc = Date.now();
      if (!KHUNG.html) o.innerHTML = '<section class="vcl"><div class="vcl-dau"><b>Việc cần xử lý</b><small>Đang tải…</small></div></section>';
      else o.innerHTML = KHUNG.html;
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
        var tenPham = cs.length ? cs.map(function (m) { return CS.tenCS[m] || m; }).join(', ') : 'toàn trường';
        var h = '<section class="vcl"><div class="vcl-dau"><b>Việc cần xử lý</b><small>' + thoat(tenPham) + '</small>' +
          '<button type="button" class="nut-chinh" data-vcl="bao-nghi">🙋 Báo nghỉ &amp; bố trí</button></div>' +
          dongDayThay('Hôm nay', hn, r[0]) + dongDayThay('Ngày mai', mai, r[1]);
        if (don.length) {
          h += '<div id="vcl-don" class="vcl-nhom">📝 <b>' + don.length + ' đơn xin nghỉ chờ duyệt</b></div>' + don.map(function (d) {
            return '<div class="vcl-dong vang"><div><b>' + thoat(d.nguoi_gui_ten) + '</b> xin ' + thoat((LOAI_NGHI[d.loai] || d.loai).toLowerCase()) + ' ' +
              ngayVN(d.tu_ngay) + (d.den_ngay && d.den_ngay !== d.tu_ngay ? ' → ' + ngayVN(d.den_ngay) : '') + ' (' + (BUOI[d.buoi] || '') + ')' +
              (!cs.length && d.co_so_ma && CS.tenCS[d.co_so_ma] ? ' · ' + thoat(CS.tenCS[d.co_so_ma]) : '') +
              (d.noi_dung ? '<small>' + thoat(d.noi_dung) + '</small>' : '') + '</div>' +
              '<span class="vcl-nut"><button type="button" class="nut-chinh" data-vcl-duyet="' + d.id + '">✓ Duyệt</button>' +
              '<button type="button" class="dh-nut-nho" data-vcl-tu-choi="' + d.id + '">Không duyệt</button></span></div>';
          }).join('');
        } else if (laQuanLy()) h += '<div class="vcl-dong xanh"><div>📝 Không có đơn xin nghỉ nào chờ duyệt' + (cs.length ? ' ở ' + thoat(tenPham) : '') + '.</div></div>';
        // Phụ trách điểm KHÔNG thuộc BGH: máy không đọc đơn chờ duyệt (đơn do BGH duyệt) — trước 1/10/2026
        // dòng trên vẫn hiện "Không có đơn…" dù có đơn, tức là nói sai. Nay im lặng, chỉ dẫn lối xem.
        else h += '<div class="vcl-phu">Đơn xin nghỉ do Ban giám hiệu duyệt — <a href="#" data-vcl="de-xuat">xem ở Đề xuất – duyệt ›</a></div>';
        if (donKhac > 0) h += '<div class="vcl-phu">' + donKhac + ' đơn của phân hiệu khác — <a href="#" data-vcl="de-xuat">xem ở Đề xuất – duyệt ›</a></div>';
        h += '</section>';
        KHUNG.html = h;
        if (KHUNG.el && document.body.contains(KHUNG.el)) KHUNG.el.innerHTML = h;
      });
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
  function duyet(id, dongY, nut) {
    var hoi = window.hopHoi ? window.hopHoi(dongY ? 'Duyệt đơn xin nghỉ? Người này vào sổ vắng, rồi bố trí dạy thay được ngay.' : 'Không duyệt đơn này?',
      { tieuDe: 'Đơn xin nghỉ', nutOK: dongY ? 'Duyệt' : 'Không duyệt' }) : Promise.resolve(window.confirm(dongY ? 'Duyệt đơn?' : 'Không duyệt đơn?'));
    hoi.then(function (ok) {
      if (!ok) return;
      var xong = function () {
        KHUNG.khoa = ''; KHUNG.html = '';
        if (!dongY) bao('Đã ghi: không duyệt.');
        veKhung();
      };
      if (!may()) { xong(); return; }
      nut.disabled = true;
      may().rpc('duyet_de_xuat', { p_id: id, p_dong_y: dongY, p_ghi_chu: null }).then(function (r) {
        if (r.error) { nut.disabled = false; bao('Không duyệt được: ' + r.error.message); return; }
        xong();
        // 8/10/2026: duyệt xong mở luôn khung chọn người dạy thay (bớt bước tìm thẻ, bấm Phương án)
        if (dongY && window.DAY_THAY && window.DAY_THAY.boTriDon) window.DAY_THAY.boTriDon(id);
      });
    });
  }

  // Một bộ bắt sự kiện cho cả trang (khung được vẽ lại mỗi lần vẽ Tổng quan)
  document.addEventListener('click', function (e) {
    var b = e.target && e.target.closest ? e.target.closest('.vcl [data-vcl],.vcl [data-vcl-bo],.vcl [data-vcl-duyet],.vcl [data-vcl-tu-choi]') : null;
    if (!b) return;
    e.preventDefault();
    if (b.hasAttribute('data-vcl-bo')) { if (window.DAY_THAY) window.DAY_THAY.moKhung('bo-tri', b.getAttribute('data-vcl-bo')); }
    else if (b.hasAttribute('data-vcl-duyet')) duyet(+b.getAttribute('data-vcl-duyet'), true, b);
    else if (b.hasAttribute('data-vcl-tu-choi')) duyet(+b.getAttribute('data-vcl-tu-choi'), false, b);
    else if (b.getAttribute('data-vcl') === 'bao-nghi') { if (window.DAY_THAY) window.DAY_THAY.moKhung('bao-nghi'); }
    else if (b.getAttribute('data-vcl') === 'de-xuat') { if (window.DH) window.DH.tab('dexuat'); }
  });
  document.addEventListener('dangnhap-xong', function () { CS.khoa = ''; KHUNG.khoa = ''; KHUNG.html = ''; });

  window.VIEC_NHANH = {
    veKhung: veKhung,
    ve: function (lamMoi) { if (lamMoi) KHUNG.khoa = ''; veKhung(); },
    // Màn Dạy thay vừa ghi (bố trí/huỷ/báo nghỉ/duyệt) → lần mở Tổng quan sau tính lại
    lamCu: function () { KHUNG.khoa = ''; }
  };
})();
