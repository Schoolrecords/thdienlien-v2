// ============================================================
// bieu-mau.js — BIỂU MẪU TRÍCH XUẤT: XEM TRỰC TIẾP + TẢI WORD (30/9/2026)
//
// Thầy Chung: "tạo file xem trực tiếp và tải về bản Word: Danh sách dạy thay
// của giáo viên, Điểm danh hàng tháng, các biểu cần trích file, và nút tải
// Danh mục Hồ sơ" — sổ dự án mục 106. Mã dùng chung → mọi trường có ngay.
//
//   BIEU_MAU.xem(tuy)          khung xem trước tờ A4 (dọc/ngang tự nhận) có
//                              "Tải Word" + "In" + hàng tuỳ chọn; tệp Word là
//                              CHÍNH HTML đang xem (WORD_TIEN_ICH, thể thức NĐ 30)
//   BIEU_MAU.danhMuc()         Danh mục Hồ sơ toàn trường (khuôn bản 20/8/2026)
//   BIEU_MAU.dayThay(tuy)      Danh sách giáo viên dạy thay + tổng hợp số tiết
//   BIEU_MAU.diemDanhLop(tuy)  Bảng điểm danh học sinh tháng của một lớp
//   BIEU_MAU.diemDanhTruong(t) Tổng hợp chuyên cần học sinh tháng toàn trường
//   BIEU_MAU.ve(el)            thẻ Điều hành › Biểu mẫu – Trích xuất
//
// Quyền: chỉ ẩn/hiện nút cho gọn — RLS máy chủ là hàng rào thật (dữ liệu nào
// người xem không đọc được thì biểu ra trống, không ra số giả).
// ============================================================
(function () {
  'use strict';

  function W() { return window.WORD_TIEN_ICH; }
  function may() { return window.MAY_CHU; }
  function bao(s) { if (window.notify) window.notify(s); }
  function thoat(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return '&#' + c.charCodeAt(0) + ';'; }); }
  function pad(n) { return ('0' + n).slice(-2); }
  function isoCua(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function homNayISO() { return isoCua(new Date()); }
  function taoNgay(iso) { var p = String(iso).split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function ngayVN(iso) { var p = String(iso || '').split('-'); return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : ''; }
  function cuoiThang(ym) { var p = ym.split('-'); return ym + '-' + pad(new Date(+p[0], +p[1], 0).getDate()); }
  function thangSo(ym) { return +ym.slice(5, 7); }
  // NĐ 30: chỉ tháng 1, 2 thêm số 0 khi viết "tháng 01"; tiêu đề biểu viết "Tháng 9 năm 2026"
  function tenThang(ym) { return 'Tháng ' + thangSo(ym) + ' năm ' + ym.slice(0, 4); }
  var THU_NGAN = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
  var THU_DAI = ['Chủ nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
  function nd() { return window.NGUOI_DUNG || {}; }
  function laQT() { var u = window.NGUOI_DUNG; return !window.MAY_CHU || (!!u && (u.vai_tro === 'admin' || u.vai_tro === 'ban_giam_hieu')); }
  function namHoc() { return (window.CAU_HINH || {}).NAM_HOC || ''; }
  function sapTen(a, b) {
    var ta = String(a || '').trim().split(/\s+/), tb = String(b || '').trim().split(/\s+/);
    return (ta[ta.length - 1] || '').localeCompare(tb[tb.length - 1] || '', 'vi') || String(a).localeCompare(String(b), 'vi');
  }
  function sapLop(a, b) { return String(a).localeCompare(String(b), 'vi', { numeric: true }); }
  // Thêm luật CSS vào khối <style> của tệp Word (bảng nhiều cột cần chữ nhỏ hơn 12pt mặc định)
  function kemCSS(html, css) { return html.replace('</style>', css + '</style>'); }
  function loiChu(e) { return String((e && (e.message || e.details)) || e || 'lỗi không rõ'); }

  // Đọc trọn một bảng (PostgREST trả tối đa 1000 dòng mỗi lượt)
  function taiHet(bang, cot, loc) {
    var ket = [], tu = 0, buoc = 1000;
    function trang() {
      var q = may().from(bang).select(cot).range(tu, tu + buoc - 1);
      q = loc(q);
      return q.then(function (r) {
        if (r.error) throw r.error;
        var d = r.data || [];
        ket = ket.concat(d);
        if (d.length < buoc) return ket;
        tu += buoc; return trang();
      });
    }
    return trang();
  }

  // ══════════════════════════════════════════════════════════════
  // KHUNG XEM TRƯỚC DÙNG CHUNG (dùng lại lớp .scn-xt của Sổ chủ nhiệm)
  // tuy = { tieuDe, tenTep: fn(gt) → tên tệp, dung: fn(gt) → html | Promise<html>,
  //         tuyChon: [{ ma, nhan, loai: 'o' (ô tích) | 'chon', ds: [[giá trị, nhãn]], mac }] }
  // ══════════════════════════════════════════════════════════════
  var XT = { mo: false, dem: 0, html: '', tuy: null, gt: {}, truoc: null };
  var CSS_XEM = '<style>' +
    'html{-webkit-text-size-adjust:none;text-size-adjust:none;background:#e4e7ec}' +
    'body{margin:0;padding:24px 12px 40px;background:#e4e7ec}' +
    '.Section1{box-sizing:border-box;width:21cm;min-height:29.7cm;padding:2cm 1.5cm 2cm 3cm;margin:0 auto 24px;background:#fff;' +
    'box-shadow:0 1px 3px rgba(15,23,42,.12),0 10px 28px rgba(15,23,42,.12)}' +
    'body.ngang .Section1{width:29.7cm;min-height:21cm;padding:1.5cm 1.5cm 1.5cm 2cm}' +
    '@media print{html{zoom:1 !important}html,body{background:#fff;padding:0}' +
    '.Section1,body.ngang .Section1{box-shadow:none;margin:0;width:auto;min-height:0;padding:0}}' +
    '</style>';
  function laNgang(html) { return /mso-page-orientation:landscape/.test(html); }
  function htmlXem(html) {
    return html.replace('</head>', CSS_XEM + '</head>').replace('<body>', laNgang(html) ? '<body class="ngang">' : '<body>');
  }

  function xem(tuy) {
    XT.tuy = tuy; XT.gt = {}; XT.html = '';
    (tuy.tuyChon || []).forEach(function (o) { XT.gt[o.ma] = o.mac; });
    if (!XT.mo) XT.truoc = document.activeElement;
    XT.mo = true;
    dungKhung();
    veXem();
  }
  function dungKhung() {
    var cu = document.getElementById('bm-xt');
    if (cu) cu.parentNode.removeChild(cu);
    var tuy = XT.tuy;
    var k = document.createElement('div');
    k.id = 'bm-xt'; k.className = 'scn-xt';
    k.setAttribute('role', 'dialog'); k.setAttribute('aria-modal', 'true'); k.setAttribute('aria-labelledby', 'bm-xt-td');
    var chon = (tuy.tuyChon || []).map(function (o) {
      if (o.loai === 'chon') {
        return '<label class="scn-xt-tt27">' + thoat(o.nhan) + ' <select class="tkb-chon" data-bm-tc="' + thoat(o.ma) + '">' +
          o.ds.map(function (x) { return '<option value="' + thoat(x[0]) + '"' + (x[0] === o.mac ? ' selected' : '') + '>' + thoat(x[1]) + '</option>'; }).join('') +
          '</select></label>';
      }
      return '<label class="scn-xt-tt27"><input type="checkbox" data-bm-tc="' + thoat(o.ma) + '"' + (o.mac ? ' checked' : '') + '> ' + thoat(o.nhan) + '</label>';
    }).join('');
    k.innerHTML = '<div class="scn-xt-hop">' +
      '<header class="scn-xt-dau"><div class="scn-xt-tieu"><h2 id="bm-xt-td">' + thoat(tuy.tieuDe) + '</h2>' +
      (tuy.moTa ? '<p>' + thoat(tuy.moTa) + '</p>' : '') + '</div>' +
      '<div class="scn-xt-nut">' +
      '<button type="button" class="scn-xt-luu" data-bm="luu"><span>⬇ Tải về (Word)</span></button>' +
      '<button type="button" class="scn-xt-in" data-bm="in"><span>🖨 In</span></button>' +
      '<button type="button" class="scn-xt-dong" data-bm="dong" aria-label="Đóng" title="Đóng (Esc)">✕</button></div></header>' +
      (chon ? '<div class="scn-xt-chon">' + chon + '</div>' : '') +
      '<div class="scn-xt-cuon"><div class="scn-xt-cho" id="bm-xt-cho">Đang dựng bản xem trước…</div>' +
      '<iframe class="scn-xt-khung" id="bm-xt-khung" title="Xem trước biểu mẫu" hidden></iframe></div></div>';
    document.body.appendChild(k);
    k.addEventListener('click', function (e) {
      if (e.target === k) { dong(); return; }
      var b = e.target.closest ? e.target.closest('button') : null;
      if (!b || b.disabled) return;
      var x = b.getAttribute('data-bm');
      if (x === 'dong') dong(); else if (x === 'luu') luu(); else if (x === 'in') inXem();
    });
    Array.prototype.slice.call(k.querySelectorAll('[data-bm-tc]')).forEach(function (o) {
      o.addEventListener('change', function () {
        XT.gt[o.getAttribute('data-bm-tc')] = o.type === 'checkbox' ? o.checked : o.value;
        veXem();
      });
    });
    k.querySelector('#bm-xt-khung').addEventListener('load', coGian);
    if (!dungKhung.coResize) { dungKhung.coResize = true; window.addEventListener('resize', function () { if (XT.mo) coGian(); }); }
    document.addEventListener('keydown', phim, true);
    document.documentElement.classList.add('scn-xt-khoa');
    var nd0 = k.querySelector('[data-bm="dong"]'); if (nd0 && nd0.focus) nd0.focus();
  }
  function coGian() {
    var ifr = document.getElementById('bm-xt-khung');
    var d = ifr && ifr.contentDocument;
    if (!d || !d.documentElement || !ifr.clientWidth) return;
    var rong = laNgang(XT.html) ? 1160 : 820;
    var k = Math.min(1, (ifr.clientWidth - 16) / rong);
    d.documentElement.style.zoom = k < 1 ? String(Math.max(0.25, k)) : '';
  }
  function veXem() {
    var k = document.getElementById('bm-xt'); if (!k) return;
    var lan = ++XT.dem;
    var cho = k.querySelector('#bm-xt-cho'), ifr = k.querySelector('#bm-xt-khung');
    var nLuu = k.querySelector('[data-bm="luu"]'), nIn = k.querySelector('[data-bm="in"]');
    cho.textContent = 'Đang dựng bản xem trước…'; cho.hidden = false; ifr.hidden = true; nLuu.disabled = true; nIn.disabled = true; XT.html = '';
    if (!W()) { cho.textContent = 'Chưa tải được bộ xuất Word — tải lại trang.'; return; }
    Promise.resolve().then(function () { return XT.tuy.dung(XT.gt); }).then(function (html) {
      if (lan !== XT.dem || !XT.mo) return;
      XT.html = html;
      ifr.srcdoc = htmlXem(html);
      cho.hidden = true; ifr.hidden = false; nLuu.disabled = false; nIn.disabled = false;
    }).catch(function (e) {
      if (lan !== XT.dem) return;
      cho.textContent = 'Chưa dựng được biểu: ' + loiChu(e);
    });
  }
  function luu() {
    if (!XT.html) return;
    var ten = XT.tuy.tenTep(XT.gt);
    W().taiVe(XT.html, ten);
    bao('Đã tải ' + ten + ' — mở bằng Word để chỉnh sửa, in, ký.');
  }
  function inXem() {
    var ifr = document.getElementById('bm-xt-khung');
    var w = ifr && ifr.contentWindow;
    if (!w || !XT.html) return;
    try { w.focus(); w.print(); } catch (e) { bao('Trình duyệt chặn lệnh in: ' + loiChu(e)); }
  }
  function dong() {
    var k = document.getElementById('bm-xt');
    if (k) k.parentNode.removeChild(k);
    XT.mo = false; XT.html = ''; XT.dem++;
    document.documentElement.classList.remove('scn-xt-khoa');
    document.removeEventListener('keydown', phim, true);
    if (XT.truoc && XT.truoc.focus && document.body.contains(XT.truoc)) XT.truoc.focus();
  }
  function phim(e) {
    if (!XT.mo) return;
    if (e.key === 'Escape' || e.key === 'Esc') { e.preventDefault(); e.stopPropagation(); dong(); }
  }
  // Tải thẳng không qua khung (nút "Tải Word" ở thẻ Biểu mẫu)
  function taiThang(tuy) {
    var gt = {};
    (tuy.tuyChon || []).forEach(function (o) { gt[o.ma] = o.mac; });
    bao('Đang dựng tệp Word…');
    Promise.resolve().then(function () { return tuy.dung(gt); }).then(function (html) {
      var ten = tuy.tenTep(gt);
      W().taiVe(html, ten);
      bao('Đã tải ' + ten + '.');
    }).catch(function (e) { bao('Chưa dựng được biểu: ' + loiChu(e)); });
  }
  function moHoacTai(tuy, tai) { if (tai) taiThang(tuy); else xem(tuy); }

  // ══════════════════════════════════════════════════════════════
  // 1 · DANH MỤC HỒ SƠ — khuôn bản DANH-MUC-HO-SO-2026.doc (20/8/2026)
  // ══════════════════════════════════════════════════════════════
  var CAN_CU_DM = [
    'Căn cứ Thông tư số 15/2026/TT-BGDĐT ngày 24 tháng 3 năm 2026 của Bộ trưởng Bộ Giáo dục và Đào tạo ban hành Điều lệ trường tiểu học, trường trung học cơ sở, trường trung học phổ thông và trường phổ thông có nhiều cấp học;',
    'Căn cứ Thông tư số 57/2026/TT-BGDĐT ngày 07 tháng 7 năm 2026 của Bộ trưởng Bộ Giáo dục và Đào tạo quy định về bảo đảm chất lượng giáo dục; công nhận đạt chuẩn quốc gia đối với trường mầm non và trường phổ thông;',
    'Căn cứ Thông tư số 08/2025/TT-BGDĐT ngày 12 tháng 5 năm 2025 của Bộ trưởng Bộ Giáo dục và Đào tạo quy định thời hạn lưu trữ hồ sơ, tài liệu thuộc lĩnh vực giáo dục và đào tạo;',
    'Căn cứ Công văn số 5555/BGDĐT-GDPT ngày 18 tháng 8 năm 2026 của Bộ Giáo dục và Đào tạo hướng dẫn tổ chức và hoạt động của cơ sở giáo dục mầm non, phổ thông công lập sau sắp xếp,'
  ];
  var TEN_TT = { co: 'Đã có', dang: 'Đang cập nhật', chua: 'Chưa có', da_dong: 'Đã đóng' };

  function banGhi(h) { return (window.HS_BAN_GHI || {})[h.ma] || {}; }
  function htmlDanhMuc(gt) {
    var w = W(), c = w.chan;
    var dsBP = (window.BO_PHAN || []).filter(function (b) { return !gt.bp || String(b.soTT) === String(gt.bp); });
    var HOP = window.HOP || {}, HS = window.HO_SO || [];
    var conHL = function (h) { return h.tt !== 'da_dong' && (gt.loc !== 'chua' || h.tt !== 'co'); };
    // Cột (cm, khổ ngang 26,2 cm). Tên hồ sơ lấy phần còn lại, tối thiểu 6 cm.
    var cot = [['STT', 1.1], ['Mã hồ sơ', 2.5], ['Tên hồ sơ', 0], ['Tiêu chí', 2.0], ['Người phụ trách', 3.5], ['Tầng', 1.1]];
    if (gt.tt) cot.push(['Trạng thái', 2.3]);
    if (gt.cc) { cot.push(['Áp dụng', 3.2]); cot.push(['Căn cứ', 3.8]); }
    if (gt.link) cot.push(['Thư mục Drive', 4.2]);
    var tong = 26.2, khac = 0;
    cot.forEach(function (x) { khac += x[1]; });
    var he = tong - khac < 6 ? (tong - 6) / khac : 1;
    cot.forEach(function (x) { x[1] = x[1] ? x[1] * he : 0; });
    cot[2][1] = tong - khac * he;
    var nCot = cot.length;
    var dau = '<tr>' + cot.map(function (x) { return '<th style="width:' + x[1].toFixed(2) + 'cm">' + x[0] + '</th>'; }).join('') + '</tr>';

    var stt = 0, soHop = 0, dong = '';
    dsBP.forEach(function (bp) {
      var dsBpHs = HS.filter(function (h) { return bp.hop.indexOf(h.hop) >= 0 && conHL(h); });
      if (!dsBpHs.length) return;
      dong += '<tr><td colspan="' + nCot + '" style="background:#d9d9d9;font-weight:bold;font-size:12pt">' +
        bp.soTT + '. ' + c(String(bp.ten).toUpperCase()) + ' &mdash; ' + dsBpHs.length + ' hồ sơ</td></tr>';
      bp.hop.forEach(function (maHop) {
        var ds = dsBpHs.filter(function (h) { return h.hop === maHop; });
        if (!ds.length) return;
        soHop++;
        dong += '<tr><td colspan="' + nCot + '" style="background:#f2f2f2;font-weight:bold">' + c(maHop) + '. ' +
          c((HOP[maHop] || {}).ten || '') + ' &mdash; ' + ds.length + ' hồ sơ</td></tr>';
        ds.forEach(function (h) {
          var g = banGhi(h);
          var link = /^https?:\/\//i.test(h.link || '') ? h.link : '';
          dong += '<tr><td class="giua">' + (++stt) + '</td><td class="giua">' + c(h.ma) + '</td><td>' + c(h.ten) + '</td>' +
            '<td class="giua">' + c((h.tc || []).join(', ')) + '</td>' +
            '<td>' + c(h.phuTrach || (HOP[h.hop] || {}).phuTrach || '') + '</td>' +
            '<td class="giua">' + c(g.tang || h.tang || '') + '</td>' +
            (gt.tt ? '<td class="giua">' + c(TEN_TT[h.tt] || h.tt || '') + '</td>' : '') +
            (gt.cc ? '<td>' + c(g.ap_dung || '') + '</td><td>' + c(g.can_cu || '') + '</td>' : '') +
            (gt.link ? '<td class="duongdan">' + (link ? '<a href="' + c(link) + '">' + c(link) + '</a>' : '') + '</td>' : '') +
            '</tr>';
        });
      });
    });
    if (!stt) dong = '<tr><td colspan="' + nCot + '" class="giua nghieng">Không có hồ sơ nào theo lựa chọn này.</td></tr>';

    var daDong = gt.bp || gt.loc === 'chua' ? [] : HS.filter(function (h) { return h.tt === 'da_dong'; });
    var bangDong = daDong.length
      ? '<p style="margin:16pt 0 6pt"><b>Hồ sơ đã đóng</b> <i>(giữ để tra cứu và làm minh chứng cho giai đoạn trước, không sinh mới)</i></p>' +
        '<table class="co-dinh"><thead><tr><th style="width:1.5cm">STT</th><th style="width:3cm">Mã hồ sơ</th><th style="width:11.5cm">Tên hồ sơ</th><th style="width:10.2cm">Lý do đóng</th></tr></thead><tbody>' +
        daDong.map(function (h, i) {
          return '<tr><td class="giua">' + (i + 1) + '</td><td class="giua">' + c(h.ma) + '</td><td>' + c(h.ten) + '</td><td>' + c(banGhi(h).ghi_chu || '') + '</td></tr>';
        }).join('') + '</tbody></table>'
      : '';

    var tenBP = gt.bp && dsBP[0] ? ' — ' + dsBP[0].ten : '';
    var than = w.theThuc() +
      '<p class="giua" style="margin:22pt 0 0"><b style="font-size:14pt">DANH MỤC HỒ SƠ' + c(tenBP.toUpperCase()) + '</b></p>' +
      '<p class="giua" style="margin:4pt 0 0"><b>Hệ thống hồ sơ quản lý hoạt động giáo dục của nhà trường · Năm học ' + c(namHoc()) + '</b></p>' +
      (gt.bp || gt.loc === 'chua' ? '' : CAN_CU_DM.map(function (x, i) { return '<p style="margin:' + (i ? 6 : 16) + 'pt 0 0"><i>' + c(x) + '</i></p>'; }).join('')) +
      '<p style="margin:12pt 0 6pt">' + (gt.loc === 'chua'
        ? 'Danh sách <b>' + stt + '</b> đầu hồ sơ <b>chưa hoàn thiện</b> (trạng thái "Chưa có" hoặc "Đang cập nhật") tính đến ' + c(w.ngayVN()) + ':'
        : (gt.bp ? 'Bộ phận gồm' : 'Nhà trường ban hành Danh mục hồ sơ gồm') + ' <b>' + stt + '</b> đầu hồ sơ, sắp xếp theo ' +
          (gt.bp ? '' : '<b>' + dsBP.length + '</b> bộ phận và ') + '<b>' + soHop + '</b> hộp hồ sơ như sau:') + '</p>' +
      '<p style="margin:0 0 10pt;font-size:12pt"><i>Chú giải cột <b>Tầng</b>: A - hồ sơ bắt buộc theo văn bản quy phạm pháp luật; ' +
      'B - minh chứng phục vụ tự đánh giá theo Thông tư 57; C - hồ sơ nội bộ do nhà trường tự đặt ra. ' +
      'Mã <b>MC.x.y.zz</b> theo Phụ lục IV Thông tư 57 (tiêu chuẩn · tiêu chí · số thứ tự).</i></p>' +
      '<table class="co-dinh bm-nho"><thead>' + dau + '</thead><tbody>' + dong + '</tbody></table>' +
      bangDong +
      '<p style="margin:16pt 0 0"><i>Danh mục này được rà soát, cập nhật khi có văn bản mới hoặc khi nhà trường thay đổi cơ cấu tổ chức. ' +
      'Thời hạn bảo quản của từng hồ sơ thực hiện theo Phụ lục ban hành kèm Thông tư số 08/2025/TT-BGDĐT.</i></p>' +
      w.khoiKy(null);
    return kemCSS(w.khungWord('Danh mục hồ sơ', than, true),
      'table.bm-nho th{font-size:11pt;padding:3pt 4pt}table.bm-nho td{font-size:11.5pt;padding:3pt 5pt}');
  }
  function tuyDanhMuc() {
    var bp = (window.BO_PHAN || []).map(function (b) { return [String(b.soTT), b.soTT + '. ' + b.ten]; });
    return {
      tieuDe: 'Danh mục Hồ sơ · Năm học ' + namHoc(),
      dung: function (gt) {
        if (!(window.HO_SO || []).length) throw new Error('chưa nạp được danh mục hồ sơ của trường.');
        return htmlDanhMuc(gt);
      },
      tenTep: function (gt) {
        return (gt.loc === 'chua' ? 'ho-so-chua-hoan-thien-' : 'danh-muc-ho-so-') + (gt.bp ? 'bo-phan-' + gt.bp + '-' : '') + namHoc() + '.doc';
      },
      tuyChon: [
        { ma: 'bp', nhan: 'Phạm vi', loai: 'chon', ds: [['', 'Toàn trường']].concat(bp), mac: '' },
        { ma: 'loc', nhan: 'Hồ sơ', loai: 'chon', ds: [['', 'Tất cả'], ['chua', 'Chỉ hồ sơ chưa hoàn thiện']], mac: '' },
        { ma: 'cc', nhan: 'Cột Áp dụng · Căn cứ', mac: true },
        { ma: 'tt', nhan: 'Cột Trạng thái', mac: false },
        { ma: 'link', nhan: 'Cột thư mục Drive', mac: false }
      ]
    };
  }
  function danhMuc(tai) { moHoacTai(tuyDanhMuc(), tai); }

  // ══════════════════════════════════════════════════════════════
  // 2 · DANH SÁCH GIÁO VIÊN DẠY THAY (+ tổng hợp số tiết theo người)
  // ══════════════════════════════════════════════════════════════
  function kiHieu(b, t) { return (b === 'sang' ? 'S' : 'C') + t; }
  function coNguoi(d) { return !!(d.gv_thay_email || d.gv_thay_nhan); }
  function tenThay(d) { return d.gv_thay_ten || d.gv_thay_nhan || ''; }
  function khoangChu(tu, den) {
    if (tu.slice(8) === '01' && den === cuoiThang(tu.slice(0, 7))) return tenThang(tu.slice(0, 7));
    return 'Từ ngày ' + ngayVN(tu) + ' đến ngày ' + ngayVN(den);
  }
  function docDayThay(tu, den) {
    if (!may()) {
      return Promise.resolve({ coSo: [], ds: [
        { ngay: tu, buoi: 'sang', tiet: 2, lop: '3A', mon: 'Toán', co_so_ma: '', gv_vang_ten: 'Nguyễn Thị Mai', gv_thay_ten: 'Trần Văn Bình', gv_thay_email: 'binh@vidu.vn', trang_thai: 'da_nhan' },
        { ngay: tu, buoi: 'sang', tiet: 3, lop: '3A', mon: 'Tiếng Việt', co_so_ma: '', gv_vang_ten: 'Nguyễn Thị Mai', gv_thay_ten: 'Lê Thị Hoa', gv_thay_email: 'hoa@vidu.vn', trang_thai: 'da_bao' }
      ] });
    }
    return Promise.all([
      taiHet('day_thay', '*', function (q) { return q.gte('ngay', tu).lte('ngay', den).neq('trang_thai', 'huy').order('ngay').order('buoi').order('tiet').order('id'); }),
      may().from('co_so').select('ma, ten').eq('hoat_dong', true).order('so_tt')
    ]).then(function (r) {
      return { ds: r[0], coSo: (r[1] && !r[1].error && r[1].data) || [] };
    }).catch(function (e) {
      if (/day_thay|does not exist|schema cache|Could not find/i.test(loiChu(e))) throw new Error('cơ sở dữ liệu của trường chưa có bảng dạy thay (sql/65).');
      throw e;
    });
  }
  function htmlDayThay(dl, gt, tu, den) {
    var w = W(), c = w.chan;
    var tenCS = {}; dl.coSo.forEach(function (x) { tenCS[x.ma] = x.ten; });
    var ds = dl.ds.filter(function (d) { return (!gt.cs || d.co_so_ma === gt.cs) && (gt.tq || coNguoi(d)); });
    var nhieuCS = dl.coSo.length > 1 && !gt.cs;
    var h = w.theThuc() +
      '<p class="giua" style="margin:18pt 0 0"><b style="font-size:14pt">DANH SÁCH GIÁO VIÊN DẠY THAY</b></p>' +
      '<p class="giua" style="margin:2pt 0 0"><b>' + c(khoangChu(tu, den)) + '</b></p>' +
      (gt.cs ? '<p class="giua" style="margin:2pt 0 0">' + c(tenCS[gt.cs] || gt.cs) + '</p>' : '');
    var coThay = ds.filter(coNguoi), tuQuan = ds.length - coThay.length;
    var nguoi = {};
    coThay.forEach(function (d) {
      var k = tenThay(d);
      var x = nguoi[k] = nguoi[k] || { ten: k, sang: 0, chieu: 0, lop: {}, nhan: 0 };
      x[d.buoi === 'sang' ? 'sang' : 'chieu']++; x.lop[d.lop] = 1; if (d.trang_thai === 'da_nhan') x.nhan++;
    });
    var dsNguoi = Object.keys(nguoi).map(function (k) { return nguoi[k]; }).sort(function (a, b) { return sapTen(a.ten, b.ten); });
    h += '<p style="margin:12pt 0 6pt">Tổng số: <b>' + ds.length + '</b> tiết cần dạy thay' +
      (gt.tq && tuQuan ? ' (trong đó <b>' + tuQuan + '</b> tiết lớp tự quản)' : '') +
      '; <b>' + dsNguoi.length + '</b> giáo viên tham gia dạy thay <b>' + coThay.length + '</b> tiết.</p>';
    if (!ds.length) h += '<p class="giua nghieng">Không có tiết dạy thay nào trong khoảng thời gian này.</p>';

    if (gt.ct && ds.length) {
      h += '<p style="margin:10pt 0 4pt"><b>I. CHI TIẾT CÁC TIẾT DẠY THAY</b></p>' +
        '<table class="co-dinh bm-nho"><thead><tr>' +
        '<th style="width:1cm">TT</th><th style="width:2.3cm">Ngày</th><th style="width:2.1cm">Thứ</th><th style="width:1.3cm">Tiết</th>' +
        '<th style="width:1.5cm">Lớp</th><th style="width:3cm">Môn</th>' + (nhieuCS ? '<th style="width:3cm">Điểm trường</th>' : '') +
        '<th style="width:' + (nhieuCS ? 4.4 : 5.9) + 'cm">Giáo viên nghỉ</th><th style="width:' + (nhieuCS ? 4.4 : 5.9) + 'cm">Giáo viên dạy thay</th>' +
        '<th style="width:3.2cm">Xác nhận</th></tr></thead><tbody>' +
        ds.map(function (d, i) {
          return '<tr><td class="giua">' + (i + 1) + '</td><td class="giua">' + ngayVN(d.ngay) + '</td><td>' + THU_DAI[taoNgay(d.ngay).getDay()] + '</td>' +
            '<td class="giua">' + kiHieu(d.buoi, d.tiet) + '</td><td class="giua">' + c(d.lop) + '</td><td>' + c(d.mon || '') + '</td>' +
            (nhieuCS ? '<td>' + c(tenCS[d.co_so_ma] || '') + '</td>' : '') +
            '<td>' + c(d.gv_vang_ten || '') + '</td><td>' + (coNguoi(d) ? c(tenThay(d)) : '<i>Lớp tự quản</i>') + '</td>' +
            '<td class="giua">' + (!coNguoi(d) ? '' : d.trang_thai === 'da_nhan' ? 'Đã nhận' : d.trang_thai === 'da_bao' ? 'Đã báo' : '') + '</td></tr>';
        }).join('') + '</tbody></table>' +
        '<p class="nghieng" style="font-size:11.5pt;margin:4pt 0 0">Ký hiệu tiết: S - buổi sáng, C - buổi chiều, kèm số thứ tự tiết. ' +
        '"Đã nhận": người dạy thay đã bấm xác nhận trên hệ thống.</p>';
    }
    if (gt.th && dsNguoi.length) {
      h += '<p style="margin:14pt 0 4pt"><b>' + (gt.ct ? 'II. ' : '') + 'TỔNG HỢP SỐ TIẾT DẠY THAY THEO GIÁO VIÊN</b></p>' +
        '<table class="co-dinh bm-nho"><thead><tr><th style="width:1cm">TT</th><th style="width:6cm">Họ và tên</th>' +
        '<th style="width:2.2cm">Buổi sáng</th><th style="width:2.2cm">Buổi chiều</th><th style="width:2.4cm">Tổng số tiết</th>' +
        '<th style="width:7.2cm">Lớp đã dạy thay</th><th style="width:5.2cm">Ký nhận</th></tr></thead><tbody>' +
        dsNguoi.map(function (x, i) {
          return '<tr><td class="giua">' + (i + 1) + '</td><td>' + c(x.ten) + '</td><td class="giua">' + (x.sang || '') + '</td>' +
            '<td class="giua">' + (x.chieu || '') + '</td><td class="giua"><b>' + (x.sang + x.chieu) + '</b></td>' +
            '<td>' + c(Object.keys(x.lop).sort(sapLop).join(', ')) + '</td><td></td></tr>';
        }).join('') +
        '<tr><td></td><td><b>Cộng</b></td><td class="giua"><b>' + dsNguoi.reduce(function (s, x) { return s + x.sang; }, 0) + '</b></td>' +
        '<td class="giua"><b>' + dsNguoi.reduce(function (s, x) { return s + x.chieu; }, 0) + '</b></td>' +
        '<td class="giua"><b>' + coThay.length + '</b></td><td></td><td></td></tr></tbody></table>';
    }
    h += w.khoiKy('NGƯỜI LẬP', may() ? (nd().ho_ten || '') : '');
    return kemCSS(w.khungWord('Danh sách dạy thay', h, true),
      'table.bm-nho th{font-size:11pt;padding:3pt 4pt}table.bm-nho td{font-size:11.5pt;padding:2pt 4pt}');
  }
  // tuy = { tu, den, cs, chiTongHop }
  function dayThay(tuy, tai) {
    tuy = tuy || {};
    var ym = homNayISO().slice(0, 7);
    var tu = tuy.tu || ym + '-01', den = tuy.den || cuoiThang(ym);
    var hua = null;
    var lay = function () { return hua || (hua = docDayThay(tu, den)); };
    var bieu = {
      tieuDe: 'Danh sách giáo viên dạy thay · ' + khoangChu(tu, den),
      dung: function (gt) { return lay().then(function (dl) { return htmlDayThay(dl, gt, tu, den); }); },
      tenTep: function (gt) { return (gt.ct ? 'danh-sach-day-thay-' : 'tong-hop-tiet-day-thay-') + tu + '-den-' + den + '.doc'; },
      tuyChon: [
        { ma: 'ct', nhan: 'Chi tiết từng tiết', mac: !tuy.chiTongHop },
        { ma: 'th', nhan: 'Tổng hợp theo giáo viên', mac: true },
        { ma: 'tq', nhan: 'Tính cả tiết lớp tự quản', mac: true }
      ]
    };
    // Phạm vi điểm trường: ô chọn thêm vào khi đã biết danh sách điểm trường
    var coSo = tuy.coSo || [];
    if (coSo.length > 1) {
      bieu.tuyChon.unshift({ ma: 'cs', nhan: 'Phạm vi', loai: 'chon',
        ds: [['', 'Toàn trường']].concat(coSo.map(function (x) { return [x.ma, x.ten]; })), mac: tuy.cs || '' });
    }
    moHoacTai(bieu, tai);
  }

  // ══════════════════════════════════════════════════════════════
  // 3 · ĐIỂM DANH HỌC SINH THÁNG — theo lớp (lưới ngày) và toàn trường
  //     Nguồn: hs_vang + diem_danh_lop (điểm danh trong Sổ chủ nhiệm)
  // ══════════════════════════════════════════════════════════════
  var KY_PHEP = { co_phep: 'P', khong_phep: 'K' };
  function kyHieu(p) { return KY_PHEP[p] || '?'; }
  // Ngày đi học của tháng = ngày có ít nhất một lớp điểm danh; tháng chưa có
  // lượt điểm danh nào thì lấy Thứ Hai → Thứ Sáu (tới hôm nay nếu tháng đang chạy).
  function ngayHocThang(ym, dsNgay) {
    var co = {}; (dsNgay || []).forEach(function (n) { if (n && n.slice(0, 7) === ym) co[n] = 1; });
    var ds = Object.keys(co).sort();
    if (ds.length) return ds;
    var hn = homNayISO(), den = cuoiThang(ym), d = taoNgay(ym + '-01'), ra = [];
    while (isoCua(d) <= den && isoCua(d) <= hn) {
      var t = d.getDay(); if (t >= 1 && t <= 5) ra.push(isoCua(d));
      d.setDate(d.getDate() + 1);
    }
    return ra;
  }

  // tuy = { lop, nam, ym, hs?:[{ma,ho_ten}], vang?:[], ddl?:[], gvcn? }
  function docLopThang(tuy) {
    var ym = tuy.ym, tu = ym + '-01', den = cuoiThang(ym), nam = tuy.nam || namHoc(), lop = tuy.lop;
    var trongThang = function (x) { return x.ngay >= tu && x.ngay <= den; };
    if (!may()) {
      var hsMau = [{ ma: 'a', ho_ten: 'Nguyễn Văn An' }, { ma: 'b', ho_ten: 'Trần Thị Bình' }, { ma: 'c', ho_ten: 'Lê Minh Châu' }];
      var ngay = ngayHocThang(ym, []);
      return Promise.resolve({ hs: hsMau, vang: ngay.length ? [{ ngay: ngay[0], buoi: 'sang', hoc_sinh_ma: 'b', phep: 'co_phep' }] : [],
        ddl: ngay.map(function (n) { return { ngay: n, buoi: 'sang', si_so: 3 }; }), ngayTruong: ngay, gvcn: tuy.gvcn || '' });
    }
    var eqL = function (q) { return q.eq('nam_hoc', nam).eq('lop', lop).gte('ngay', tu).lte('ngay', den).order('id'); };
    return Promise.all([
      tuy.hs ? Promise.resolve(tuy.hs) : taiHet('hoc_sinh_lop', 'id, hoc_sinh_ma, trang_thai, hoc_sinh(ma, ho_ten)', function (q) { return q.eq('nam_hoc', nam).eq('lop', lop).order('id'); })
        .then(function (ds) { return ds.filter(function (d) { return d.hoc_sinh && (!d.trang_thai || d.trang_thai === 'dang_hoc'); }).map(function (d) { return d.hoc_sinh; }); }),
      tuy.vang ? Promise.resolve(tuy.vang.filter(trongThang)) : taiHet('hs_vang', 'id, ngay, buoi, hoc_sinh_ma, phep', eqL),
      tuy.ddl ? Promise.resolve(tuy.ddl.filter(trongThang)) : taiHet('diem_danh_lop', 'id, ngay, buoi, si_so, so_vang', eqL),
      // Ngày đi học của cả trường (lớp nào chưa điểm danh ngày đó thì ô tô xám)
      taiHet('diem_danh_lop', 'id, ngay', function (q) { return q.eq('nam_hoc', nam).gte('ngay', tu).lte('ngay', den).order('id'); })
        .then(function (d) { return d.map(function (x) { return x.ngay; }); }, function () { return []; }),
      tuy.gvcn ? Promise.resolve(tuy.gvcn) : may().from('lop_hoc').select('gvcn_ten').eq('nam_hoc', nam).eq('lop', lop).maybeSingle()
        .then(function (r) { return (r && r.data && r.data.gvcn_ten) || ''; }, function () { return ''; })
    ]).then(function (r) {
      return { hs: (r[0] || []).slice().sort(function (a, b) { return sapTen(a.ho_ten, b.ho_ten); }), vang: r[1] || [], ddl: r[2] || [], ngayTruong: r[3] || [], gvcn: r[4] || '' };
    });
  }
  function htmlDiemDanhLop(dl, tuy) {
    var w = W(), c = w.chan, ym = tuy.ym;
    var ngay = ngayHocThang(ym, dl.ngayTruong.concat(dl.ddl.map(function (x) { return x.ngay; })).concat(dl.vang.map(function (x) { return x.ngay; })));
    var daDD = {}; dl.ddl.forEach(function (x) { daDD[x.ngay] = 1; });
    var o = {}, tongHS = {}, vangNgay = {};
    dl.vang.forEach(function (v) {
      var k = v.hoc_sinh_ma + '|' + v.ngay;
      (o[k] = o[k] || { sang: '', chieu: '' })[v.buoi === 'chieu' ? 'chieu' : 'sang'] = kyHieu(v.phep);
      var t = tongHS[v.hoc_sinh_ma] = tongHS[v.hoc_sinh_ma] || { P: 0, K: 0, R: 0 };
      t[v.phep === 'co_phep' ? 'P' : v.phep === 'khong_phep' ? 'K' : 'R']++;
      (vangNgay[v.ngay] = vangNgay[v.ngay] || {})[v.hoc_sinh_ma] = 1;
    });
    var coR = Object.keys(tongHS).some(function (m) { return tongHS[m].R; });
    // Khổ ngang 26,2 cm: TT 0,8 · Họ tên 4,6 · cột tổng 1,0 mỗi cột → phần còn lại chia đều cho ngày
    var nTong = coR ? 4 : 3, rNgay = Math.max(0.55, (26.2 - 0.8 - 4.6 - nTong * 1.0) / Math.max(1, ngay.length));
    var dau1 = '<tr><th rowspan="2" style="width:0.8cm">TT</th><th rowspan="2" style="width:4.6cm">Họ và tên</th>' +
      '<th colspan="' + Math.max(1, ngay.length) + '">Ngày trong tháng</th><th colspan="' + nTong + '">Số buổi vắng</th></tr>';
    var dau2 = '<tr>' + (ngay.length ? ngay.map(function (n) {
      return '<th class="bm-ngay" style="width:' + rNgay.toFixed(2) + 'cm">' + (+n.slice(8)) + '<br>' + THU_NGAN[taoNgay(n).getDay()] + '</th>';
    }).join('') : '<th></th>') +
      '<th style="width:1cm">P</th><th style="width:1cm">K</th>' + (coR ? '<th style="width:1cm">?</th>' : '') + '<th style="width:1cm">Cộng</th></tr>';
    var dong = dl.hs.map(function (h, i) {
      var t = tongHS[h.ma] || { P: 0, K: 0, R: 0 };
      return '<tr><td class="giua">' + (i + 1) + '</td><td style="white-space:nowrap">' + c(h.ho_ten) + '</td>' +
        ngay.map(function (n) {
          var x = o[h.ma + '|' + n];
          if (!daDD[n] && !x) return '<td class="bm-o" style="background:#e6e6e6"></td>';
          return '<td class="bm-o giua">' + (x ? c(x.sang + x.chieu) : '') + '</td>';
        }).join('') +
        '<td class="giua">' + (t.P || '') + '</td><td class="giua">' + (t.K || '') + '</td>' + (coR ? '<td class="giua">' + (t.R || '') + '</td>' : '') +
        '<td class="giua"><b>' + ((t.P + t.K + t.R) || '') + '</b></td></tr>';
    }).join('');
    var lp = { P: 0, K: 0, R: 0 };
    Object.keys(tongHS).forEach(function (m) { lp.P += tongHS[m].P; lp.K += tongHS[m].K; lp.R += tongHS[m].R; });
    dong += '<tr><td></td><td><b>Số HS vắng</b></td>' + ngay.map(function (n) {
      var s = Object.keys(vangNgay[n] || {}).length;
      return '<td class="bm-o giua">' + (s || (daDD[n] ? '0' : '')) + '</td>';
    }).join('') + '<td class="giua"><b>' + lp.P + '</b></td><td class="giua"><b>' + lp.K + '</b></td>' + (coR ? '<td class="giua"><b>' + lp.R + '</b></td>' : '') +
      '<td class="giua"><b>' + (lp.P + lp.K + lp.R) + '</b></td></tr>';
    var siSoBuoi = 0; dl.ddl.forEach(function (x) { siSoBuoi += +x.si_so || dl.hs.length; });
    var tong = lp.P + lp.K + lp.R;
    var tl = siSoBuoi ? Math.max(0, Math.round((1 - tong / siSoBuoi) * 1000) / 10) : null;
    var chuaDD = ngay.filter(function (n) { return !daDD[n]; }).length;
    var than = w.theThuc() +
      '<p class="giua" style="margin:14pt 0 0"><b style="font-size:14pt">BẢNG ĐIỂM DANH HỌC SINH</b></p>' +
      '<p class="giua" style="margin:2pt 0 0"><b>Lớp ' + c(tuy.lop) + ' · ' + c(tenThang(ym)) + ' · Năm học ' + c(tuy.nam || namHoc()) + '</b></p>' +
      '<p style="margin:10pt 0 6pt">Giáo viên chủ nhiệm: <b>' + c(dl.gvcn || '....................................') + '</b> · Sĩ số: <b>' + dl.hs.length + '</b>' +
      ' · Số buổi đã điểm danh: <b>' + dl.ddl.length + '</b>' + (tl != null ? ' · Tỉ lệ chuyên cần: <b>' + String(tl).replace('.', ',') + '%</b>' : '') + '.</p>' +
      '<table class="co-dinh bm-dd"><thead>' + dau1 + dau2 + '</thead><tbody>' + dong + '</tbody></table>' +
      '<p class="nghieng" style="font-size:11pt;margin:4pt 0 0">Ký hiệu: <b>P</b> - vắng có phép · <b>K</b> - vắng không phép · <b>?</b> - chưa rõ lý do; ' +
      'ô có hai ký hiệu là vắng cả hai buổi (sáng trước, chiều sau); ô để trống là có mặt' +
      (chuaDD ? '; ô <b>tô xám</b> là ngày lớp chưa điểm danh trên hệ thống (' + chuaDD + ' ngày)' : '') + '.</p>' +
      w.khoiKy('GIÁO VIÊN CHỦ NHIỆM', dl.gvcn || '');
    return kemCSS(w.khungWord('Điểm danh lớp ' + tuy.lop, than, true),
      'table.bm-dd th{font-size:9pt;padding:1pt 1pt}table.bm-dd td{font-size:10pt;padding:1pt 2pt;line-height:1.15}' +
      'table.bm-dd td.bm-o{font-size:8.5pt;padding:1pt 0}th.bm-ngay{font-weight:normal}');
  }
  function diemDanhLop(tuy, tai) {
    tuy = tuy || {};
    if (!tuy.lop) { bao('Chọn lớp trước.'); return; }
    tuy.ym = tuy.ym || homNayISO().slice(0, 7);
    var hua = null;
    moHoacTai({
      tieuDe: 'Bảng điểm danh lớp ' + tuy.lop + ' · ' + tenThang(tuy.ym),
      dung: function () { return (hua || (hua = docLopThang(tuy))).then(function (dl) { return htmlDiemDanhLop(dl, tuy); }); },
      tenTep: function () { return 'diem-danh-lop-' + String(tuy.lop).replace(/[^\w-]/g, '') + '-' + tuy.ym + '.doc'; }
    }, tai);
  }

  // ── Tổng hợp chuyên cần toàn trường theo tháng (Ban giám hiệu)
  function docTruongThang(ym) {
    var tu = ym + '-01', den = cuoiThang(ym), nam = namHoc();
    if (!may()) {
      return Promise.resolve({ lop: [{ lop: '1A', khoi: 1, co_so_ma: '', gvcn_ten: 'Cô Lan' }, { lop: '2A', khoi: 2, co_so_ma: '', gvcn_ten: 'Cô Hà' }],
        coSo: [], siSo: { '1A': 30, '2A': 28 }, ddl: [{ lop: '1A', ngay: tu, buoi: 'sang', si_so: 30 }, { lop: '2A', ngay: tu, buoi: 'sang', si_so: 28 }],
        vang: [{ lop: '1A', ngay: tu, buoi: 'sang', hoc_sinh_ma: 'x', phep: 'co_phep' }], tenHS: { x: 'Nguyễn Văn An' } });
    }
    var theoThang = function (q) { return q.eq('nam_hoc', nam).gte('ngay', tu).lte('ngay', den).order('id'); };
    return Promise.all([
      may().from('lop_hoc').select('lop, khoi, co_so_ma, gvcn_ten').eq('nam_hoc', nam),
      may().from('co_so').select('ma, ten').eq('hoat_dong', true).order('so_tt'),
      taiHet('hoc_sinh_lop', 'id, lop, trang_thai', function (q) { return q.eq('nam_hoc', nam).order('id'); }),
      taiHet('diem_danh_lop', 'id, lop, ngay, buoi, si_so, so_vang', theoThang),
      taiHet('hs_vang', 'id, lop, ngay, buoi, hoc_sinh_ma, phep', theoThang)
    ]).then(function (r) {
      if (r[0].error) throw r[0].error;
      var siSo = {};
      r[2].forEach(function (x) { if (!x.trang_thai || x.trang_thai === 'dang_hoc') siSo[x.lop] = (siSo[x.lop] || 0) + 1; });
      var kq = { lop: r[0].data || [], coSo: (r[1] && !r[1].error && r[1].data) || [], siSo: siSo, ddl: r[3], vang: r[4], tenHS: {} };
      // Tên học sinh vắng nhiều (≥ 3 buổi) — chỉ tra những em cần in
      var dem = {};
      kq.vang.forEach(function (v) { dem[v.hoc_sinh_ma] = (dem[v.hoc_sinh_ma] || 0) + 1; });
      var can = Object.keys(dem).filter(function (m) { return dem[m] >= 3; }).slice(0, 300);
      if (!can.length) return kq;
      return may().from('hoc_sinh').select('ma, ho_ten').in('ma', can).then(function (t) {
        ((t && t.data) || []).forEach(function (x) { kq.tenHS[x.ma] = x.ho_ten; });
        return kq;
      }, function () { return kq; });
    });
  }
  function htmlTruongThang(dl, gt, ym) {
    var w = W(), c = w.chan;
    var tenCS = {}; dl.coSo.forEach(function (x) { tenCS[x.ma] = x.ten; });
    var dsLop = dl.lop.filter(function (l) { return !gt.cs || l.co_so_ma === gt.cs; }).sort(function (a, b) { return sapLop(a.lop, b.lop); });
    var trong = {}; dsLop.forEach(function (l) { trong[l.lop] = 1; });
    var tk = {};
    dsLop.forEach(function (l) { tk[l.lop] = { buoi: 0, siSoBuoi: 0, P: 0, K: 0, R: 0, hs: {} }; });
    dl.ddl.forEach(function (x) { var t = tk[x.lop]; if (t) { t.buoi++; t.siSoBuoi += +x.si_so || dl.siSo[x.lop] || 0; } });
    dl.vang.forEach(function (v) { var t = tk[v.lop]; if (!t) return; t[v.phep === 'co_phep' ? 'P' : v.phep === 'khong_phep' ? 'K' : 'R']++; t.hs[v.hoc_sinh_ma] = 1; });
    var ngayHoc = ngayHocThang(ym, dl.ddl.map(function (x) { return x.ngay; }));
    var tl = function (t) { var v = t.P + t.K + t.R; return t.siSoBuoi ? String(Math.max(0, Math.round((1 - v / t.siSoBuoi) * 1000) / 10)).replace('.', ',') + '%' : '—'; };
    var dongLop = function (l, i) {
      var t = tk[l.lop];
      return '<tr><td class="giua">' + (i + 1) + '</td><td class="giua"><b>' + c(l.lop) + '</b></td><td>' + c(l.gvcn_ten || '') + '</td>' +
        '<td class="giua">' + (dl.siSo[l.lop] || '') + '</td><td class="giua">' + t.buoi + '</td>' +
        '<td class="giua">' + (t.P || '') + '</td><td class="giua">' + (t.K || '') + '</td><td class="giua">' + (t.R || '') + '</td>' +
        '<td class="giua"><b>' + ((t.P + t.K + t.R) || '') + '</b></td><td class="giua">' + (Object.keys(t.hs).length || '') + '</td>' +
        '<td class="giua">' + tl(t) + '</td></tr>';
    };
    var cong = function (ds, nhan) {
      var s = { buoi: 0, siSoBuoi: 0, P: 0, K: 0, R: 0, hs: {} }, ss = 0;
      ds.forEach(function (l) { var t = tk[l.lop]; ss += dl.siSo[l.lop] || 0; s.buoi += t.buoi; s.siSoBuoi += t.siSoBuoi; s.P += t.P; s.K += t.K; s.R += t.R; Object.keys(t.hs).forEach(function (m) { s.hs[m] = 1; }); });
      return '<tr style="background:#f2f2f2"><td colspan="3"><b>' + c(nhan) + '</b></td><td class="giua"><b>' + ss + '</b></td><td class="giua"><b>' + s.buoi + '</b></td>' +
        '<td class="giua"><b>' + s.P + '</b></td><td class="giua"><b>' + s.K + '</b></td><td class="giua"><b>' + s.R + '</b></td>' +
        '<td class="giua"><b>' + (s.P + s.K + s.R) + '</b></td><td class="giua"><b>' + Object.keys(s.hs).length + '</b></td><td class="giua"><b>' + tl(s) + '</b></td></tr>';
    };
    var nhomCS = dl.coSo.length > 1 && !gt.cs;
    var than = '', i = 0;
    if (nhomCS) {
      dl.coSo.concat([{ ma: null, ten: 'Chưa gán điểm trường' }]).forEach(function (cs) {
        var ds = dsLop.filter(function (l) { return cs.ma === null ? !tenCS[l.co_so_ma] : l.co_so_ma === cs.ma; });
        if (!ds.length) return;
        than += '<tr><td colspan="11" style="background:#d9d9d9;font-weight:bold">' + c(cs.ten) + '</td></tr>' +
          ds.map(function (l) { return dongLop(l, i++); }).join('') + cong(ds, 'Cộng ' + cs.ten);
      });
    } else than = dsLop.map(dongLop).join('');
    than += cong(dsLop, gt.cs ? 'Cộng' : 'Toàn trường');
    var chuaDD = dsLop.filter(function (l) { return !tk[l.lop].buoi; }).map(function (l) { return l.lop; });

    var dsNhieu = [];
    if (gt.nhieu) {
      var d = {};
      dl.vang.forEach(function (v) {
        if (!trong[v.lop]) return;
        var x = d[v.hoc_sinh_ma] = d[v.hoc_sinh_ma] || { ma: v.hoc_sinh_ma, lop: v.lop, P: 0, K: 0, R: 0 };
        x[v.phep === 'co_phep' ? 'P' : v.phep === 'khong_phep' ? 'K' : 'R']++;
      });
      dsNhieu = Object.keys(d).map(function (m) { return d[m]; }).filter(function (x) { return x.P + x.K + x.R >= 3; })
        .sort(function (a, b) { return (b.P + b.K + b.R) - (a.P + a.K + a.R) || sapLop(a.lop, b.lop); });
    }
    var h = w.theThuc() +
      '<p class="giua" style="margin:18pt 0 0"><b style="font-size:14pt">TỔNG HỢP CHUYÊN CẦN HỌC SINH</b></p>' +
      '<p class="giua" style="margin:2pt 0 0"><b>' + c(tenThang(ym)) + ' · Năm học ' + c(namHoc()) + '</b></p>' +
      (gt.cs ? '<p class="giua" style="margin:2pt 0 0">' + c(tenCS[gt.cs] || gt.cs) + '</p>' : '') +
      '<p style="margin:12pt 0 6pt">Số ngày học có điểm danh trong tháng: <b>' + ngayHoc.length + '</b>; số lớp: <b>' + dsLop.length + '</b>. ' +
      'Đơn vị tính: <b>lượt buổi</b> vắng. Tỉ lệ chuyên cần = 1 − lượt vắng / (sĩ số × số buổi đã điểm danh).</p>' +
      '<table class="co-dinh bm-nho"><thead><tr><th style="width:0.9cm" rowspan="2">TT</th><th style="width:1.3cm" rowspan="2">Lớp</th>' +
      '<th style="width:3.4cm" rowspan="2">Giáo viên chủ nhiệm</th><th style="width:1.2cm" rowspan="2">Sĩ số</th><th style="width:1.4cm" rowspan="2">Buổi đã điểm danh</th>' +
      '<th colspan="4">Lượt vắng</th><th style="width:1.5cm" rowspan="2">Số HS có vắng</th><th style="width:1.7cm" rowspan="2">Tỉ lệ chuyên cần</th></tr>' +
      '<tr><th style="width:1.1cm">Có phép</th><th style="width:1.1cm">Không phép</th><th style="width:1.0cm">Chưa rõ</th><th style="width:1.0cm">Cộng</th></tr></thead>' +
      '<tbody>' + than + '</tbody></table>' +
      (chuaDD.length ? '<p class="nghieng" style="font-size:11.5pt;margin:4pt 0 0">Lớp chưa điểm danh buổi nào trong tháng trên hệ thống: ' + c(chuaDD.join(', ')) + '.</p>' : '') +
      (gt.nhieu ? '<p style="margin:14pt 0 4pt"><b>Học sinh vắng từ 3 buổi trở lên trong tháng</b></p>' + (dsNhieu.length
        ? '<table class="co-dinh bm-nho"><thead><tr><th style="width:1cm">TT</th><th style="width:5.6cm">Họ và tên</th><th style="width:1.6cm">Lớp</th>' +
          '<th style="width:1.8cm">Có phép</th><th style="width:1.8cm">Không phép</th><th style="width:1.6cm">Chưa rõ</th><th style="width:3.1cm">Tổng số buổi</th></tr></thead><tbody>' +
          dsNhieu.map(function (x, k) {
            return '<tr><td class="giua">' + (k + 1) + '</td><td>' + c(dl.tenHS[x.ma] || x.ma) + '</td><td class="giua">' + c(x.lop) + '</td>' +
              '<td class="giua">' + (x.P || '') + '</td><td class="giua">' + (x.K || '') + '</td><td class="giua">' + (x.R || '') + '</td>' +
              '<td class="giua"><b>' + (x.P + x.K + x.R) + '</b></td></tr>';
          }).join('') + '</tbody></table>'
        : '<p class="nghieng">Không có học sinh nào vắng từ 3 buổi trở lên.</p>') : '') +
      w.khoiKy('NGƯỜI LẬP BIỂU', may() ? (nd().ho_ten || '') : '');
    return kemCSS(w.khungWord('Tổng hợp chuyên cần ' + ym, h),
      'table.bm-nho th{font-size:10.5pt;padding:2pt 3pt}table.bm-nho td{font-size:11.5pt;padding:2pt 4pt}');
  }
  function diemDanhTruong(tuy, tai) {
    tuy = tuy || {};
    var ym = tuy.ym || homNayISO().slice(0, 7), hua = null;
    var bieu = {
      tieuDe: 'Tổng hợp chuyên cần học sinh · ' + tenThang(ym),
      dung: function (gt) { return (hua || (hua = docTruongThang(ym))).then(function (dl) { return htmlTruongThang(dl, gt, ym); }); },
      tenTep: function (gt) { return 'tong-hop-chuyen-can-' + (gt.cs ? gt.cs + '-' : '') + ym + '.doc'; },
      tuyChon: [{ ma: 'nhieu', nhan: 'Kèm danh sách HS vắng từ 3 buổi', mac: true }]
    };
    if ((tuy.coSo || []).length > 1) {
      bieu.tuyChon.unshift({ ma: 'cs', nhan: 'Phạm vi', loai: 'chon',
        ds: [['', 'Toàn trường']].concat(tuy.coSo.map(function (x) { return [x.ma, x.ten]; })), mac: tuy.cs || '' });
    }
    moHoacTai(bieu, tai);
  }

  // ══════════════════════════════════════════════════════════════
  // 4 · THẺ "BIỂU MẪU – TRÍCH XUẤT" TRONG ĐIỀU HÀNH
  // ══════════════════════════════════════════════════════════════
  var B = { ym: '', coSo: [], lop: [], lopToi: [], phuTrach: false, napXong: false, dangNap: false, lopChon: '' };
  function napThe() {
    if (B.napXong || B.dangNap) return Promise.resolve();
    if (!may()) {
      B.coSo = []; B.lop = [{ lop: '1A' }, { lop: '2A' }]; B.phuTrach = true; B.napXong = true;
      return Promise.resolve();
    }
    B.dangNap = true;
    var em = String(nd().email || '').toLowerCase(), nam = namHoc();
    return Promise.all([
      may().from('co_so').select('ma, ten, phu_trach_email').eq('hoat_dong', true).order('so_tt'),
      may().from('lop_hoc').select('lop, khoi, co_so_ma').eq('nam_hoc', nam),
      // Lớp chủ nhiệm của tôi (phan_cong_day, vai chủ nhiệm) — như Sổ chủ nhiệm tự nhận
      nd().id ? may().from('phan_cong_day').select('lop, la_chu_nhiem').eq('nam_hoc', nam).eq('nguoi_dung_id', nd().id) : null
    ]).then(function (r) {
      B.coSo = (r[0] && !r[0].error && r[0].data) || [];
      B.phuTrach = laQT() || B.coSo.some(function (c) { return String(c.phu_trach_email || '').toLowerCase() === em; });
      B.lop = ((r[1] && !r[1].error && r[1].data) || []).sort(function (a, b) { return sapLop(a.lop, b.lop); });
      var pc = (r[2] && !r[2].error && r[2].data) || [];
      B.lopToi = pc.filter(function (p) { return p.la_chu_nhiem; }).map(function (p) { return p.lop; });
      (window.SCN_LOP_TOI || []).forEach(function (l) { B.lopToi.push(l); });
      // '4a' trong phân công → '4A' đúng chuỗi lop_hoc (hs_vang ghi theo chuỗi này)
      var chuan = function (s) { return String(s == null ? '' : s).replace(/\s+/g, '').toUpperCase(); }, theo = {}, da = {};
      B.lop.forEach(function (l) { theo[chuan(l.lop)] = l.lop; });
      B.lopToi = B.lopToi.map(function (l) { return theo[chuan(l)] || String(l).trim(); })
        .filter(function (l) { return da[l] ? false : (da[l] = 1); }).sort(sapLop);
    }).catch(function () { /* thiếu bảng nào thì thẻ tương ứng tự ẩn */ })
      .then(function () { B.dangNap = false; B.napXong = true; });
  }
  function ve(el) {
    if (!el) return;
    if (!B.ym) B.ym = homNayISO().slice(0, 7);
    if (!B.napXong) {
      el.innerHTML = '<div class="the-thong-bao">Đang tải…</div>';
      napThe().then(function () { if (document.body.contains(el)) ve(el); });
      return;
    }
    var qt = laQT(), dsLop = qt ? B.lop.map(function (l) { return l.lop; }) : B.lopToi;
    if (dsLop.indexOf(B.lopChon) < 0) B.lopChon = dsLop[0] || '';
    var the = function (bi, ten, moTa, nut, them) {
      return '<section class="bm-the"><div class="bm-bi">' + bi + '</div><div class="bm-noi"><h3>' + ten + '</h3><p>' + moTa + '</p>' +
        (them || '') + '<div class="bm-nut">' + nut + '</div></div></section>';
    };
    var hai = function (ma) {
      return '<button type="button" class="nut-chinh" data-bm-xem="' + ma + '">👁 Xem trước</button>' +
        '<button type="button" class="dh-nut-nho" data-bm-tai="' + ma + '">⬇ Tải Word</button>';
    };
    var h = '<div class="bm-dau"><label>Tháng <input type="month" id="bm-thang" class="tkb-chon" value="' + B.ym + '"></label>' +
      '<small>Mỗi biểu đều xem được ngay trên màn hình và tải về tệp Word đúng thể thức (Nghị định 30) để chỉnh sửa, in, ký.</small></div>' +
      '<div class="bm-luoi">';
    if (B.phuTrach) {
      h += the('👨‍🏫', 'Danh sách giáo viên dạy thay', 'Từng tiết dạy thay trong ' + tenThang(B.ym).toLowerCase() + ': ngày, tiết, lớp, môn, người nghỉ, người dạy thay, xác nhận — kèm tổng hợp số tiết từng người.', hai('daythay'));
      h += the('🧮', 'Tổng hợp tiết dạy thay theo giáo viên', 'Bảng số tiết dạy thay (sáng/chiều) của mỗi giáo viên trong tháng, có cột ký nhận — dùng làm căn cứ thanh toán.', hai('daythay-th'));
    }
    if (dsLop.length) {
      h += the('📅', 'Bảng điểm danh học sinh tháng (theo lớp)', 'Lưới ngày × học sinh ghi P / K từng buổi, cộng số buổi vắng, tỉ lệ chuyên cần — lấy từ điểm danh trong Sổ chủ nhiệm.', hai('dd-lop'),
        '<label class="bm-chon">Lớp <select id="bm-lop" class="tkb-chon">' + dsLop.map(function (l) {
          return '<option' + (l === B.lopChon ? ' selected' : '') + '>' + thoat(l) + '</option>';
        }).join('') + '</select></label>');
    }
    if (qt) {
      h += the('📊', 'Tổng hợp chuyên cần toàn trường', 'Mỗi lớp: sĩ số, buổi đã điểm danh, lượt vắng có phép / không phép, tỉ lệ chuyên cần; cộng theo điểm trường; danh sách học sinh vắng nhiều.', hai('dd-truong'));
      h += the('🧑‍🏫', 'Bảng tổng hợp ngày công CBGV-NV', 'Tính và chốt ở màn Điểm danh & Chấm công, rồi bấm "Xem & tải Word" ngay dưới bảng công.',
        '<button type="button" class="dh-nut-nho" data-bm-mo="baocao">Mở Điểm danh & Chấm công ›</button>');
    }
    h += the('🗂', 'Danh mục Hồ sơ', 'Toàn bộ danh mục hồ sơ của nhà trường theo bộ phận, hộp: mã MC, tên hồ sơ, tiêu chí, người phụ trách, tầng, căn cứ. Lọc được hồ sơ chưa hoàn thiện.', hai('danhmuc'));
    h += the('📅', 'Lịch công tác tuần', 'Xuất Word ở màn Lịch tuần (nút Word trên lịch).', '<button type="button" class="dh-nut-nho" data-bm-mo="lichtuan">Mở Lịch tuần ›</button>');
    h += '</div>';
    el.innerHTML = h;
    var o = el.querySelector('#bm-thang');
    if (o) o.addEventListener('change', function () { if (/^\d{4}-\d{2}$/.test(o.value)) { B.ym = o.value; ve(el); } });
    var ol = el.querySelector('#bm-lop');
    if (ol) ol.addEventListener('change', function () { B.lopChon = ol.value; });
    var chay = function (ma, tai) {
      var tu = B.ym + '-01', den = cuoiThang(B.ym);
      if (ma === 'daythay') dayThay({ tu: tu, den: den, coSo: B.coSo, cs: csCuaToi() }, tai);
      else if (ma === 'daythay-th') dayThay({ tu: tu, den: den, coSo: B.coSo, cs: csCuaToi(), chiTongHop: true }, tai);
      else if (ma === 'dd-lop') diemDanhLop({ lop: B.lopChon, nam: namHoc(), ym: B.ym }, tai);
      else if (ma === 'dd-truong') diemDanhTruong({ ym: B.ym, coSo: B.coSo }, tai);
      else if (ma === 'danhmuc') danhMuc(tai);
    };
    Array.prototype.slice.call(el.querySelectorAll('[data-bm-xem]')).forEach(function (b) { b.addEventListener('click', function () { chay(b.getAttribute('data-bm-xem'), false); }); });
    Array.prototype.slice.call(el.querySelectorAll('[data-bm-tai]')).forEach(function (b) { b.addEventListener('click', function () { chay(b.getAttribute('data-bm-tai'), true); }); });
    Array.prototype.slice.call(el.querySelectorAll('[data-bm-mo]')).forEach(function (b) { b.addEventListener('click', function () { if (window.DH) window.DH.moTab(b.getAttribute('data-bm-mo')); }); });
  }
  // Phó hiệu trưởng phụ trách phân hiệu: mặc định phân hiệu mình (HT: toàn trường)
  function csCuaToi() {
    if (!may() || nd().vai_tro === 'admin') return '';
    var em = String(nd().email || '').toLowerCase();
    var cua = B.coSo.filter(function (c) { return String(c.phu_trach_email || '').toLowerCase() === em; });
    return cua.length === 1 && String(nd().chuc_vu || '').toLowerCase().indexOf('hiệu trưởng') !== 0 ? cua[0].ma : '';
  }
  document.addEventListener('dangnhap-xong', function () { B.napXong = false; B.lopToi = []; B.lopChon = ''; });

  window.BIEU_MAU = {
    xem: xem, danhMuc: danhMuc, dayThay: dayThay, diemDanhLop: diemDanhLop, diemDanhTruong: diemDanhTruong, ve: ve,
    // phần thuần cho bài thử
    _htmlDanhMuc: htmlDanhMuc, _htmlDayThay: htmlDayThay, _htmlDiemDanhLop: htmlDiemDanhLop, _htmlTruongThang: htmlTruongThang, _ngayHocThang: ngayHocThang
  };
})();
