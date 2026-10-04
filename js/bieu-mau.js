// ============================================================
// bieu-mau.js — BIỂU MẪU TRÍCH XUẤT: XEM TRỰC TIẾP + TẢI WORD / EXCEL (30/9/2026)
//
// Thầy Chung: "tạo file xem trực tiếp và tải về bản Word: Danh sách dạy thay
// của giáo viên, Điểm danh hàng tháng, các biểu cần trích file, và nút tải
// Danh mục Hồ sơ" — sổ dự án mục 106; nâng cấp theo đề xuất ở mục 107 (kỳ
// tuần / học kỳ / cả năm, Excel, tổng hợp theo người nghỉ, nhiều lớp một tệp).
// Mã dùng chung → mọi trường có ngay.
//
//   BIEU_MAU.xem(tuy)          khung xem trước tờ A4 (dọc/ngang tự nhận) có
//                              "Tải Word" (+ "Excel" nếu biểu có) + "In" + hàng
//                              tuỳ chọn; tệp Word là CHÍNH HTML đang xem
//   BIEU_MAU.danhMuc()         Danh mục Hồ sơ toàn trường (khuôn bản 20/8/2026)
//   BIEU_MAU.dayThay(tuy)      Danh sách GV dạy thay + tổng hợp theo người dạy / người nghỉ
//   BIEU_MAU.diemDanhLop(tuy)  Bảng điểm danh HS: một hoặc nhiều lớp, mỗi tháng một trang
//   BIEU_MAU.diemDanhTruong(t) Tổng hợp chuyên cần học sinh toàn trường theo kỳ
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
  function congNgay(iso, n) { var d = taoNgay(iso); d.setDate(d.getDate() + n); return isoCua(d); }
  function ngayVN(iso) { var p = String(iso || '').split('-'); return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : ''; }
  function cuoiThang(ym) { var p = ym.split('-'); return ym + '-' + pad(new Date(+p[0], +p[1], 0).getDate()); }
  function thangSo(ym) { return +ym.slice(5, 7); }
  // NĐ 30: chỉ tháng 1, 2 thêm số 0 khi viết "tháng 01"; tiêu đề biểu viết "Tháng 9 năm 2026"
  function tenThang(ym) { return 'Tháng ' + thangSo(ym) + ' năm ' + ym.slice(0, 4); }
  // Các tháng (yyyy-mm) nằm trong khoảng tu → den
  function thangTrong(tu, den) {
    var ra = [], ym = tu.slice(0, 7);
    while (ym <= den.slice(0, 7)) { ra.push(ym); ym = congNgay(cuoiThang(ym), 1).slice(0, 7); }
    return ra;
  }
  var THU_NGAN = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
  var THU_DAI = ['Chủ nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
  function nd() { return window.NGUOI_DUNG || {}; }
  function laQT() { var u = window.NGUOI_DUNG; return !window.MAY_CHU || (!!u && (u.vai_tro === 'admin' || u.vai_tro === 'ban_giam_hieu')); }
  function namHoc() { return (window.CAU_HINH || {}).NAM_HOC || ''; }
  function namDau() { return +String(namHoc()).slice(0, 4) || new Date().getFullYear(); }
  function sapTen(a, b) {
    var ta = String(a || '').trim().split(/\s+/), tb = String(b || '').trim().split(/\s+/);
    return (ta[ta.length - 1] || '').localeCompare(tb[tb.length - 1] || '', 'vi') || String(a).localeCompare(String(b), 'vi');
  }
  function sapLop(a, b) { return String(a).localeCompare(String(b), 'vi', { numeric: true }); }
  // Thêm luật CSS vào khối <style> của tệp Word (bảng nhiều cột cần chữ nhỏ hơn 12pt mặc định)
  function kemCSS(html, css) { return html.replace('</style>', css + '</style>'); }
  function loiChu(e) { return String((e && (e.message || e.details)) || e || 'lỗi không rõ'); }
  function tl1(so) { return String(so).replace('.', ','); }
  // Ngắt trang trong tệp Word (đoạn có page-break-before — Word giữ; khung xem trước vẽ thành khe xám)
  var NGAT_TRANG = '<p class="bm-ngat" style="page-break-before:always;margin:0;font-size:1pt;line-height:1">&nbsp;</p>';

  // ── KỲ BÁO CÁO ──
  // Mốc học kỳ: lấy từ khung năm học của Sổ chủ nhiệm (window.SCN_KHUNG_KY — 2026-2027 HK I 07/9/2026 → 10/01/2027).

  var TEN_KY = [['thang', 'Tháng'], ['tuan', 'Tuần này'], ['tuan-truoc', 'Tuần trước'], ['hk1', 'Học kỳ I'], ['hk2', 'Học kỳ II'], ['nam', 'Cả năm học']];
  function khoangKy(ky, ym) {
    var y = namDau(), hn = homNayISO();
    if (ky === 'tuan' || ky === 'tuan-truoc') {
      var dau = congNgay(hn, -((taoNgay(hn).getDay() + 6) % 7) - (ky === 'tuan-truoc' ? 7 : 0)), cuoi = congNgay(dau, 6);
      return { tu: dau, den: cuoi, nhan: 'Tuần từ ngày ' + ngayVN(dau) + ' đến ngày ' + ngayVN(cuoi), ma: 'tuan-' + dau };
    }
    // Mốc lấy từ khung năm học của Sổ chủ nhiệm (window.SCN_KHUNG_KY) — cùng một nguồn với
    // phần tổng kết của sổ. Chưa nạp sổ thì dùng mốc dự phòng cũ.
    var kk = window.SCN_KHUNG_KY ? window.SCN_KHUNG_KY(namHoc()) : null;
    var bd = kk ? kk.batDau : y + '-09-01', h1 = kk ? kk.hetHK1 : (y + 1) + '-01-17',
        h2 = kk ? kk.dauHK2 : (y + 1) + '-01-18', tk = kk ? kk.tongKet : (y + 1) + '-05-31';
    if (ky === 'hk1') return { tu: bd, den: h1, nhan: 'Học kỳ I năm học ' + namHoc(), ma: 'hk1-' + namHoc() };
    if (ky === 'hk2') return { tu: h2, den: tk, nhan: 'Học kỳ II năm học ' + namHoc(), ma: 'hk2-' + namHoc() };
    if (ky === 'nam') return { tu: bd, den: tk, nhan: 'Năm học ' + namHoc(), ma: 'nam-' + namHoc() };
    ym = ym || hn.slice(0, 7);
    return { tu: ym + '-01', den: cuoiThang(ym), nhan: tenThang(ym), ma: ym };
  }
  function khoangChu(tu, den) {
    if (tu.slice(8) === '01' && den === cuoiThang(tu.slice(0, 7))) return tenThang(tu.slice(0, 7));
    return 'Từ ngày ' + ngayVN(tu) + ' đến ngày ' + ngayVN(den);
  }

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
  // EXCEL — bảng đơn giản qua EXCEL_DEP (js/xuat-excel.js, .xlsx thật có định dạng)
  // b = { ten, tieuDe, phu, cot: [[nhãn, rộng]], dong: [[giá trị]], cuoi: [[giá trị]], doc }
  // ══════════════════════════════════════════════════════════════
  function sheetBang(b) {
    var n = b.cot.length, ghep = Math.max(0, n - 1);
    var o = function (v, k) { var so = typeof v === 'number'; return { v: v == null ? '' : v, so: so, k: k || (so ? 'oG' : 'oL') }; };
    var rows = [
      { o: [{ v: String((window.CAU_HINH || {}).TEN_TRUONG || '').toUpperCase(), k: 'ttTruong', gopN: ghep }] },
      { cao: 24, o: [{ v: b.tieuDe, k: 'tt', gopN: ghep }] },
      { o: b.phu ? [{ v: b.phu, k: 'tt3w', gopN: ghep }] : [] },
      { o: [] },
      { cao: 34, o: b.cot.map(function (c) { return { v: c[0], k: 'dauW' }; }) }
    ];
    b.dong.forEach(function (d) { rows.push({ o: d.map(function (v) { return o(v); }) }); });
    (b.cuoi || []).forEach(function (d) { rows.push({ o: d.map(function (v) { return o(v, 'oB'); }) }); });
    return { ten: String(b.ten).replace(/[\[\]:*?\/\\]/g, '-').slice(0, 31), cols: b.cot.map(function (c) { return c[1]; }), rows: rows,
      in: { dongBang: 5, doc: !!b.doc, vuaNgang: true } };
  }
  function taiXlsx(mo) {
    if (!window.EXCEL_DEP) { bao('Chưa nạp được bộ xuất Excel (js/xuat-excel.js) — tải lại trang.'); return; }
    var byte = window.EXCEL_DEP.tao({ ten: mo.ten, sheets: mo.sheets });
    var blob = new Blob([byte], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = mo.ten;
    document.body.appendChild(a); a.click();
    setTimeout(function () { document.body.removeChild(a); URL.revokeObjectURL(a.href); }, 4000);
    bao('Đã tải ' + mo.ten + '.');
  }

  // ══════════════════════════════════════════════════════════════
  // KHUNG XEM TRƯỚC DÙNG CHUNG (dùng lại lớp .scn-xt của Sổ chủ nhiệm)
  // tuy = { tieuDe, moTa?, tenTep: fn(gt), dung: fn(gt) → html | Promise<html>,
  //         excel?: fn(gt) → { ten, sheets } | Promise,
  //         tuyChon: [{ ma, nhan, loai: 'o' (ô tích) | 'chon', ds: [[giá trị, nhãn]], mac }] }
  // ══════════════════════════════════════════════════════════════
  var XT = { mo: false, dem: 0, html: '', tuy: null, gt: {}, truoc: null };
  var CSS_XEM = '<style>' +
    'html{-webkit-text-size-adjust:none;text-size-adjust:none;background:#e4e7ec}' +
    'body{margin:0;padding:24px 12px 40px;background:#e4e7ec}' +
    '.Section1{box-sizing:border-box;width:21cm;min-height:29.7cm;padding:2cm 1.5cm 2cm 3cm;margin:0 auto 24px;background:#fff;' +
    'box-shadow:0 1px 3px rgba(15,23,42,.12),0 10px 28px rgba(15,23,42,.12)}' +
    'body.ngang .Section1{width:29.7cm;min-height:21cm;padding:1.5cm 1.5cm 1.5cm 2cm}' +
    // Ngắt trang: khe xám giữa hai tờ
    'p.bm-ngat{height:24px;margin:2cm -1.5cm 2cm -3cm !important;background:#e4e7ec;font-size:0 !important;' +
    'box-shadow:inset 0 6px 8px -6px rgba(15,23,42,.25),inset 0 -6px 8px -6px rgba(15,23,42,.25)}' +
    'body.ngang p.bm-ngat{margin:1.5cm -1.5cm 1.5cm -2cm !important}' +
    '@media print{html{zoom:1 !important}html,body{background:#fff;padding:0}' +
    '.Section1,body.ngang .Section1{box-shadow:none;margin:0;width:auto;min-height:0;padding:0}' +
    'p.bm-ngat,body.ngang p.bm-ngat{height:0;margin:0 !important;background:none;box-shadow:none;page-break-before:always}}' +
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
      (tuy.excel ? '<button type="button" class="scn-xt-in" data-bm="excel"><span>⬇ Excel</span></button>' : '') +
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
      else if (x === 'excel') excelTu(XT.tuy, XT.gt);
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
    var nut = Array.prototype.slice.call(k.querySelectorAll('[data-bm="luu"],[data-bm="in"],[data-bm="excel"]'));
    cho.textContent = 'Đang dựng bản xem trước…'; cho.hidden = false; ifr.hidden = true; XT.html = '';
    nut.forEach(function (b) { b.disabled = true; });
    if (!W()) { cho.textContent = 'Chưa tải được bộ xuất Word — tải lại trang.'; return; }
    Promise.resolve().then(function () { return XT.tuy.dung(XT.gt); }).then(function (html) {
      if (lan !== XT.dem || !XT.mo) return;
      XT.html = html;
      ifr.srcdoc = htmlXem(html);
      cho.hidden = true; ifr.hidden = false;
      nut.forEach(function (b) { b.disabled = false; });
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
  function excelTu(tuy, gt) {
    if (!tuy.excel) return;
    Promise.resolve().then(function () { return tuy.excel(gt); }).then(taiXlsx)
      .catch(function (e) { bao('Chưa dựng được bảng Excel: ' + loiChu(e)); });
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
  function macDinh(tuy) { var gt = {}; (tuy.tuyChon || []).forEach(function (o) { gt[o.ma] = o.mac; }); return gt; }
  // Tải thẳng không qua khung (nút "Tải Word" / "Tải Excel" ở thẻ Biểu mẫu). cach: 'word' | 'excel'
  function taiThang(tuy, cach) {
    var gt = macDinh(tuy);
    if (cach === 'excel') { bao('Đang dựng tệp Excel…'); excelTu(tuy, gt); return; }
    bao('Đang dựng tệp Word…');
    Promise.resolve().then(function () { return tuy.dung(gt); }).then(function (html) {
      var ten = tuy.tenTep(gt);
      W().taiVe(html, ten);
      bao('Đã tải ' + ten + '.');
    }).catch(function (e) { bao('Chưa dựng được biểu: ' + loiChu(e)); });
  }
  // tai: false/undefined = mở khung xem · true | 'word' = tải Word · 'excel' = tải Excel
  function moHoacTai(tuy, tai) { if (tai) taiThang(tuy, tai === 'excel' ? 'excel' : 'word'); else xem(tuy); }

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
  // ── Mẫu BAN HÀNH (Phụ lục V NĐ 30/2020) — thầy Chung 4/10/2026, sổ dự án 120. Cần cột ho_so.thoi_han (sql/79).
  //    Hồ sơ còn hiệu lực CÓ thời hạn bảo quản = Danh mục nhà trường (đề mục = hộp, số La Mã). Hồ sơ KHÔNG ghi thời hạn
  //    (hồ sơ Đảng, Đoàn — tổ chức đó tự quản lý) in thành phần riêng, không tính vào số hồ sơ ban hành.
  var LA_MA = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX'];
  var CHU_SO = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];
  function soChu(n) {
    if (n < 10) return CHU_SO[n];
    var ch = Math.floor(n / 10) % 10, dv = n % 10, tr = Math.floor(n / 100);
    var ra = (tr ? CHU_SO[tr] + ' trăm ' + (ch === 0 && dv ? 'linh ' : '') : '') +
      (ch === 1 ? 'mười' : ch ? CHU_SO[ch] + ' mươi' : '') +
      (dv ? ' ' + (dv === 5 && ch ? 'lăm' : dv === 1 && ch > 1 ? 'mốt' : dv === 4 && ch > 1 ? 'tư' : CHU_SO[dv]) : '');
    return ra.replace(/\s+/g, ' ').trim();
  }
  function coThoiHan() { return (window.HO_SO || []).some(function (h) { return !!banGhi(h).thoi_han; }); }
  function htmlDanhMucBH(gt) {
    var w = W(), c = w.chan;
    var HOP = window.HOP || {}, HS = window.HO_SO || [];
    var thuTuHop = [];
    (window.BO_PHAN || []).forEach(function (bp) { bp.hop.forEach(function (m) { if (thuTuHop.indexOf(m) < 0) thuTuHop.push(m); }); });
    var hieuLuc = HS.filter(function (h) { return h.tt !== 'da_dong'; });
    var trongDM = hieuLuc.filter(function (h) { return !!banGhi(h).thoi_han; });
    var ngoaiDM = hieuLuc.filter(function (h) { return !banGhi(h).thoi_han; });
    var cot = [['TT', 1.0], ['Số, ký hiệu hồ sơ', 2.3], ['Tên đề mục và tiêu đề hồ sơ', 0]];
    if (gt.tc) cot.push(['Tiêu chí TT57', 1.8]);
    cot.push(['Thời hạn bảo quản', 3.6], ['Đơn vị/người lập hồ sơ', 3.2]);
    if (gt.cc) cot.push(['Ghi chú (căn cứ)', 5.2]);
    if (gt.tt) cot.push(['Trạng thái', 2.0]);
    if (gt.link) cot.push(['Thư mục Drive', 3.8]);
    var tong = 26.2, khac = 0;
    cot.forEach(function (x) { khac += x[1]; });
    cot[2][1] = Math.max(6, tong - khac);
    var nCot = cot.length;
    var dau = '<tr>' + cot.map(function (x) { return '<th style="width:' + x[1].toFixed(2) + 'cm">' + x[0] + '</th>'; }).join('') + '</tr>';
    var stt = 0, so = 0, vv = 0, dong = '';
    thuTuHop.forEach(function (maHop) {
      var ds = trongDM.filter(function (h) { return h.hop === maHop; });
      if (!ds.length) return;
      so++;
      dong += '<tr><td class="giua" style="font-weight:bold">' + (LA_MA[so - 1] || so) + '</td><td colspan="' + (nCot - 1) + '" style="font-weight:bold">' +
        c(String((HOP[maHop] || {}).ten || maHop).toUpperCase()) + ' <i style="font-weight:normal;font-size:11pt">(hộp ' + c(maHop) + ' · ' + ds.length + ' hồ sơ)</i></td></tr>';
      ds.forEach(function (h) {
        var g = banGhi(h), link = /^https?:\/\//i.test(h.link || '') ? h.link : '';
        if (/^Vĩnh viễn/i.test(g.thoi_han || '')) vv++;
        dong += '<tr><td class="giua">' + (++stt) + '</td><td class="giua">' + c(h.ma) + '</td><td>' + c(h.ten) + '</td>' +
          (gt.tc ? '<td class="giua">' + c((h.tc || []).join(', ')) + '</td>' : '') +
          '<td>' + c(g.thoi_han || '') + '</td><td>' + c(g.don_vi_lap || h.phuTrach || (HOP[h.hop] || {}).phuTrach || '') + '</td>' +
          (gt.cc ? '<td style="font-size:10.5pt">' + c(g.can_cu || '') + '</td>' : '') +
          (gt.tt ? '<td class="giua">' + c(TEN_TT[h.tt] || h.tt || '') + '</td>' : '') +
          (gt.link ? '<td class="duongdan">' + (link ? '<a href="' + c(link) + '">' + c(link) + '</a>' : '') + '</td>' : '') + '</tr>';
      });
    });
    if (!stt) dong = '<tr><td colspan="' + nCot + '" class="giua nghieng">Chưa có hồ sơ nào ghi thời hạn bảo quản — dùng mẫu "Quản lý".</td></tr>';
    var phanRieng = ngoaiDM.length && gt.dang
      ? '<p style="margin:16pt 0 6pt"><b>Phần riêng — Hồ sơ của tổ chức Đảng, Đoàn quản lý trên hệ thống</b> <i>(không thuộc Danh mục hồ sơ nhà trường; tổ chức đó tự quản lý, phân quyền riêng)</i></p>' +
        '<table class="co-dinh bm-nho"><thead><tr><th style="width:1.2cm">TT</th><th style="width:2.6cm">Mã</th><th style="width:15cm">Tên hồ sơ</th><th style="width:7.4cm">Hộp</th></tr></thead><tbody>' +
        ngoaiDM.slice().sort(function (a, b) { return thuTuHop.indexOf(a.hop) - thuTuHop.indexOf(b.hop) || (a.ma < b.ma ? -1 : 1); }).map(function (h, i) {
          return '<tr><td class="giua">' + (i + 1) + '</td><td class="giua">' + c(h.ma) + '</td><td>' + c(h.ten) + '</td><td>' + c(h.hop + '. ' + ((HOP[h.hop] || {}).ten || '')) + '</td></tr>';
        }).join('') + '</tbody></table>'
      : '';
    var tenTruong = String((window.CAU_HINH || {}).TEN_TRUONG || '');
    var chu = soChu(stt); chu = chu.charAt(0).toUpperCase() + chu.slice(1);
    var than = w.theThuc() +
      '<p class="giua" style="margin:18pt 0 0"><b style="font-size:14pt">DANH MỤC HỒ SƠ CỦA ' + c(tenTruong.toUpperCase()) + '<br>NĂM HỌC ' + c(namHoc()) + '</b></p>' +
      '<p class="giua nghieng" style="margin:4pt 0 10pt">(Ban hành kèm theo Quyết định số &nbsp;&nbsp;&nbsp;&nbsp;/QĐ-&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ngày &nbsp;&nbsp;&nbsp; tháng &nbsp;&nbsp;&nbsp; năm ' +
        c(String(namHoc()).slice(0, 4)) + ' của Hiệu trưởng ' + c(tenTruong) + ')</p>' +
      '<table class="co-dinh bm-nho"><thead>' + dau + '</thead><tbody>' + dong + '</tbody></table>' +
      '<p style="margin:6pt 0 0;font-size:11pt"><i>Thời hạn bảo quản theo Phụ lục Thông tư số 08/2025/TT-BGDĐT ("STT" là số thứ tự trong Phụ lục; "vận dụng" là nhóm gần nhất khi Thông tư không nêu đích danh) ' +
        'và bảng thời hạn bảo quản tài liệu phổ biến. Hồ sơ ghi "nếu có" chỉ lập khi phát sinh.</i></p>' +
      '<p style="margin:8pt 0 0">Bản Danh mục hồ sơ này có <b>' + stt + '</b> (' + c(chu) + ') hồ sơ, bao gồm: <b>' + vv + '</b> hồ sơ bảo quản vĩnh viễn; <b>' + (stt - vv) + '</b> hồ sơ bảo quản có thời hạn.</p>' +
      phanRieng + w.khoiKy(null);
    return kemCSS(w.khungWord('Danh mục hồ sơ', than, true),
      'table.bm-nho th{font-size:11pt;padding:3pt 4pt}table.bm-nho td{font-size:11.5pt;padding:3pt 5pt}');
  }
  function tuyDanhMuc() {
    var bp = (window.BO_PHAN || []).map(function (b) { return [String(b.soTT), b.soTT + '. ' + b.ten]; });
    return {
      tieuDe: 'Danh mục Hồ sơ · Năm học ' + namHoc(),
      dung: function (gt) {
        if (!(window.HO_SO || []).length) throw new Error('chưa nạp được danh mục hồ sơ của trường.');
        return gt.mau === 'bh' && gt.loc !== 'chua' && !gt.bp ? htmlDanhMucBH(gt) : htmlDanhMuc(gt);
      },
      tenTep: function (gt) {
        return (gt.loc === 'chua' ? 'ho-so-chua-hoan-thien-' : 'danh-muc-ho-so-') + (gt.bp ? 'bo-phan-' + gt.bp + '-' : '') + namHoc() + '.doc';
      },
      tuyChon: [
        { ma: 'mau', nhan: 'Mẫu', loai: 'chon', ds: [['bh', 'Ban hành (NĐ 30, thời hạn bảo quản)'], ['ql', 'Quản lý (tiêu chí, người phụ trách)']], mac: coThoiHan() ? 'bh' : 'ql' },
        { ma: 'bp', nhan: 'Phạm vi', loai: 'chon', ds: [['', 'Toàn trường']].concat(bp), mac: '' },
        { ma: 'loc', nhan: 'Hồ sơ', loai: 'chon', ds: [['', 'Tất cả'], ['chua', 'Chỉ hồ sơ chưa hoàn thiện']], mac: '' },
        { ma: 'cc', nhan: 'Cột Áp dụng · Căn cứ', mac: true },
        { ma: 'tt', nhan: 'Cột Trạng thái', mac: false },
        { ma: 'link', nhan: 'Cột thư mục Drive', mac: false },
        { ma: 'tc', nhan: 'Cột tiêu chí TT57 (mẫu ban hành)', mac: false },
        { ma: 'dang', nhan: 'Kèm hồ sơ Đảng, Đoàn (mẫu ban hành)', mac: true }
      ]
    };
  }
  function danhMuc(tai) { moHoacTai(tuyDanhMuc(), tai); }

  // ══════════════════════════════════════════════════════════════
  // 2 · DANH SÁCH GIÁO VIÊN DẠY THAY
  //     I chi tiết từng tiết · II tổng hợp theo người dạy thay (ký nhận)
  //     III tổng hợp theo giáo viên nghỉ (lý do lấy từ sổ vắng gv_vang)
  // ══════════════════════════════════════════════════════════════
  function kiHieu(b, t) { return (b === 'sang' ? 'S' : 'C') + t; }
  function coNguoi(d) { return !!(d.gv_thay_email || d.gv_thay_nhan); }
  function tenThay(d) { return d.gv_thay_ten || d.gv_thay_nhan || ''; }
  function docDayThay(tu, den) {
    if (!may()) {
      return Promise.resolve({ coSo: [], lyDo: { 1: 'Nghỉ ốm' }, ds: [
        { ngay: tu, buoi: 'sang', tiet: 2, lop: '3A', mon: 'Toán', co_so_ma: '', gv_vang_id: 1, gv_vang_ten: 'Nguyễn Thị Mai', gv_thay_ten: 'Trần Văn Bình', gv_thay_email: 'binh@vidu.vn', trang_thai: 'da_nhan' },
        { ngay: tu, buoi: 'sang', tiet: 3, lop: '3A', mon: 'Tiếng Việt', co_so_ma: '', gv_vang_id: 1, gv_vang_ten: 'Nguyễn Thị Mai', gv_thay_ten: 'Lê Thị Hoa', gv_thay_email: 'hoa@vidu.vn', trang_thai: 'da_bao' },
        { ngay: tu, buoi: 'chieu', tiet: 1, lop: '3A', mon: 'Đạo đức', co_so_ma: '', gv_vang_id: 1, gv_vang_ten: 'Nguyễn Thị Mai', trang_thai: 'da_phan' }
      ] });
    }
    var kq = {};
    return Promise.all([
      taiHet('day_thay', '*', function (q) { return q.gte('ngay', tu).lte('ngay', den).neq('trang_thai', 'huy').order('ngay').order('buoi').order('tiet').order('id'); }),
      may().from('co_so').select('ma, ten').eq('hoat_dong', true).order('so_tt')
    ]).then(function (r) {
      kq.ds = r[0]; kq.coSo = (r[1] && !r[1].error && r[1].data) || []; kq.lyDo = {};
      // Lý do nghỉ: tra sổ vắng theo gv_vang_id (lô 200 id mỗi lượt); không đọc được thì bỏ trống
      var ids = [], da = {};
      kq.ds.forEach(function (d) { if (d.gv_vang_id && !da[d.gv_vang_id]) { da[d.gv_vang_id] = 1; ids.push(d.gv_vang_id); } });
      var lo = [];
      for (var i = 0; i < ids.length; i += 200) lo.push(ids.slice(i, i + 200));
      return Promise.all(lo.map(function (x) {
        return may().from('gv_vang').select('id, ly_do').in('id', x).then(function (t) {
          ((t && t.data) || []).forEach(function (v) { kq.lyDo[v.id] = v.ly_do || ''; });
        }, function () {});
      }));
    }).then(function () { return kq; }).catch(function (e) {
      if (/day_thay|does not exist|schema cache|Could not find/i.test(loiChu(e))) throw new Error('cơ sở dữ liệu của trường chưa có bảng dạy thay (sql/65).');
      throw e;
    });
  }
  // Số liệu dùng chung cho Word và Excel
  function tinhDayThay(dl, gt) {
    var ds = dl.ds.filter(function (d) { return (!gt.cs || d.co_so_ma === gt.cs) && (gt.tq || coNguoi(d)); });
    var coThay = ds.filter(coNguoi);
    var nguoi = {}, nghi = {};
    coThay.forEach(function (d) {
      var k = tenThay(d);
      var x = nguoi[k] = nguoi[k] || { ten: k, sang: 0, chieu: 0, lop: {}, nhan: 0 };
      x[d.buoi === 'sang' ? 'sang' : 'chieu']++; x.lop[d.lop] = 1; if (d.trang_thai === 'da_nhan') x.nhan++;
    });
    ds.forEach(function (d) {
      var k = d.gv_vang_ten || '(không rõ)';
      var x = nghi[k] = nghi[k] || { ten: k, tiet: 0, coNguoi: 0, tuQuan: 0, ngay: {}, lyDo: {} };
      x.tiet++; if (coNguoi(d)) x.coNguoi++; else x.tuQuan++;
      x.ngay[d.ngay] = 1;
      var ld = dl.lyDo[d.gv_vang_id]; if (ld) x.lyDo[ld] = 1;
    });
    var ra = function (o) { return Object.keys(o).map(function (k) { return o[k]; }).sort(function (a, b) { return sapTen(a.ten, b.ten); }); };
    return { ds: ds, coThay: coThay, tuQuan: ds.length - coThay.length, dsNguoi: ra(nguoi), dsNghi: ra(nghi) };
  }
  function htmlDayThay(dl, gt, tu, den, nhan) {
    var w = W(), c = w.chan;
    var tenCS = {}; dl.coSo.forEach(function (x) { tenCS[x.ma] = x.ten; });
    var t = tinhDayThay(dl, gt), ds = t.ds, dsNguoi = t.dsNguoi;
    var nhieuCS = dl.coSo.length > 1 && !gt.cs, so = 0, LA = ['I', 'II', 'III'];
    var h = w.theThuc() +
      '<p class="giua" style="margin:18pt 0 0"><b style="font-size:14pt">DANH SÁCH GIÁO VIÊN DẠY THAY</b></p>' +
      '<p class="giua" style="margin:2pt 0 0"><b>' + c(nhan || khoangChu(tu, den)) + '</b></p>' +
      (nhan && nhan !== khoangChu(tu, den) ? '<p class="giua nghieng" style="margin:2pt 0 0">(' + c(khoangChu(tu, den)) + ')</p>' : '') +
      (gt.cs ? '<p class="giua" style="margin:2pt 0 0">' + c(tenCS[gt.cs] || gt.cs) + '</p>' : '');
    h += '<p style="margin:12pt 0 6pt">Tổng số: <b>' + ds.length + '</b> tiết cần dạy thay của <b>' + t.dsNghi.length + '</b> giáo viên nghỉ' +
      (gt.tq && t.tuQuan ? ' (trong đó <b>' + t.tuQuan + '</b> tiết lớp tự quản)' : '') +
      '; <b>' + dsNguoi.length + '</b> giáo viên tham gia dạy thay <b>' + t.coThay.length + '</b> tiết.</p>';
    if (!ds.length) h += '<p class="giua nghieng">Không có tiết dạy thay nào trong khoảng thời gian này.</p>';

    if (gt.ct && ds.length) {
      h += '<p style="margin:10pt 0 4pt"><b>' + LA[so++] + '. CHI TIẾT CÁC TIẾT DẠY THAY</b></p>' +
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
      h += '<p style="margin:14pt 0 4pt"><b>' + LA[so++] + '. TỔNG HỢP SỐ TIẾT DẠY THAY THEO GIÁO VIÊN</b></p>' +
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
        '<td class="giua"><b>' + t.coThay.length + '</b></td><td></td><td></td></tr></tbody></table>';
    }
    if (gt.nn && t.dsNghi.length) {
      h += '<p style="margin:14pt 0 4pt"><b>' + LA[so++] + '. TỔNG HỢP THEO GIÁO VIÊN NGHỈ</b></p>' +
        '<table class="co-dinh bm-nho"><thead><tr><th style="width:1cm">TT</th><th style="width:6cm">Giáo viên nghỉ</th>' +
        '<th style="width:2.4cm">Số ngày có tiết phải thay</th><th style="width:2.4cm">Số tiết cần thay</th><th style="width:2.6cm">Có người dạy thay</th>' +
        '<th style="width:2.4cm">Lớp tự quản</th><th style="width:9.4cm">Lý do nghỉ (theo sổ vắng)</th></tr></thead><tbody>' +
        t.dsNghi.map(function (x, i) {
          return '<tr><td class="giua">' + (i + 1) + '</td><td>' + c(x.ten) + '</td><td class="giua">' + Object.keys(x.ngay).length + '</td>' +
            '<td class="giua"><b>' + x.tiet + '</b></td><td class="giua">' + (x.coNguoi || '') + '</td><td class="giua">' + (x.tuQuan || '') + '</td>' +
            '<td>' + c(Object.keys(x.lyDo).join('; ')) + '</td></tr>';
        }).join('') + '</tbody></table>';
    }
    h += w.khoiKy('NGƯỜI LẬP', may() ? (nd().ho_ten || '') : '');
    return kemCSS(w.khungWord('Danh sách dạy thay', h, true),
      'table.bm-nho th{font-size:11pt;padding:3pt 4pt}table.bm-nho td{font-size:11.5pt;padding:2pt 4pt}');
  }
  function excelDayThay(dl, gt, tu, den, nhan, ten) {
    var tenCS = {}; dl.coSo.forEach(function (x) { tenCS[x.ma] = x.ten; });
    var t = tinhDayThay(dl, gt), phu = (nhan || khoangChu(tu, den)) + (gt.cs ? ' · ' + (tenCS[gt.cs] || gt.cs) : '');
    var sheets = [
      sheetBang({ ten: 'Chi tiết', tieuDe: 'DANH SÁCH GIÁO VIÊN DẠY THAY', phu: phu,
        cot: [['TT', 5], ['Ngày', 12], ['Thứ', 10], ['Tiết', 6], ['Lớp', 7], ['Môn', 16], ['Điểm trường', 18], ['Giáo viên nghỉ', 24], ['Lý do nghỉ', 16], ['Giáo viên dạy thay', 24], ['Xác nhận', 11]],
        dong: t.ds.map(function (d, i) {
          return [i + 1, ngayVN(d.ngay), THU_DAI[taoNgay(d.ngay).getDay()], kiHieu(d.buoi, d.tiet), d.lop, d.mon || '', tenCS[d.co_so_ma] || '',
            d.gv_vang_ten || '', dl.lyDo[d.gv_vang_id] || '', coNguoi(d) ? tenThay(d) : 'Lớp tự quản',
            !coNguoi(d) ? '' : d.trang_thai === 'da_nhan' ? 'Đã nhận' : d.trang_thai === 'da_bao' ? 'Đã báo' : ''];
        }) }),
      sheetBang({ ten: 'Theo người dạy thay', tieuDe: 'TỔNG HỢP SỐ TIẾT DẠY THAY THEO GIÁO VIÊN', phu: phu,
        cot: [['TT', 5], ['Họ và tên', 28], ['Buổi sáng', 10], ['Buổi chiều', 10], ['Tổng số tiết', 11], ['Lớp đã dạy thay', 30], ['Ký nhận', 18]],
        dong: t.dsNguoi.map(function (x, i) { return [i + 1, x.ten, x.sang, x.chieu, x.sang + x.chieu, Object.keys(x.lop).sort(sapLop).join(', '), '']; }),
        cuoi: [['', 'Cộng', t.dsNguoi.reduce(function (s, x) { return s + x.sang; }, 0), t.dsNguoi.reduce(function (s, x) { return s + x.chieu; }, 0), t.coThay.length, '', '']] }),
      sheetBang({ ten: 'Theo người nghỉ', tieuDe: 'TỔNG HỢP THEO GIÁO VIÊN NGHỈ', phu: phu,
        cot: [['TT', 5], ['Giáo viên nghỉ', 28], ['Số ngày có tiết phải thay', 14], ['Số tiết cần thay', 12], ['Có người dạy thay', 12], ['Lớp tự quản', 10], ['Lý do nghỉ', 34]],
        dong: t.dsNghi.map(function (x, i) { return [i + 1, x.ten, Object.keys(x.ngay).length, x.tiet, x.coNguoi, x.tuQuan, Object.keys(x.lyDo).join('; ')]; }) })
    ];
    return { ten: ten, sheets: sheets };
  }
  // tuy = { tu, den, nhan?, cs, coSo, chiTongHop }
  function dayThay(tuy, tai) {
    tuy = tuy || {};
    var k = khoangKy('thang');
    var tu = tuy.tu || k.tu, den = tuy.den || k.den, nhan = tuy.nhan || '';
    var hua = null;
    var lay = function () { return hua || (hua = docDayThay(tu, den)); };
    var tenGoc = function (gt) { return (gt.ct ? 'danh-sach-day-thay-' : 'tong-hop-tiet-day-thay-') + (gt.cs ? gt.cs + '-' : '') + tu + '-den-' + den; };
    var bieu = {
      tieuDe: 'Danh sách giáo viên dạy thay · ' + (nhan || khoangChu(tu, den)),
      dung: function (gt) { return lay().then(function (dl) { return htmlDayThay(dl, gt, tu, den, nhan); }); },
      excel: function (gt) { return lay().then(function (dl) { return excelDayThay(dl, gt, tu, den, nhan, tenGoc(gt) + '.xlsx'); }); },
      tenTep: function (gt) { return tenGoc(gt) + '.doc'; },
      tuyChon: [
        { ma: 'ct', nhan: 'Chi tiết từng tiết', mac: !tuy.chiTongHop },
        { ma: 'th', nhan: 'Tổng hợp theo người dạy thay', mac: true },
        { ma: 'nn', nhan: 'Tổng hợp theo người nghỉ', mac: true },
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
  // 3 · ĐIỂM DANH HỌC SINH — bảng theo lớp (mỗi lớp × mỗi tháng một trang)
  //     và tổng hợp chuyên cần toàn trường theo kỳ.
  //     Nguồn: hs_vang + diem_danh_lop (điểm danh trong Sổ chủ nhiệm)
  // ══════════════════════════════════════════════════════════════
  var KY_PHEP = { co_phep: 'P', khong_phep: 'K' };
  function kyHieu(p) { return KY_PHEP[p] || '?'; }
  function loaiPhep(p) { return p === 'co_phep' ? 'P' : p === 'khong_phep' ? 'K' : 'R'; }
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

  // tuy = { lops: [...], tu, den, nam, (một lớp từ Sổ chủ nhiệm:) hs?, vang?, ddl?, gvcn? }
  // → { lop: { <lớp>: { hs, vang, ddl, gvcn } }, ngayTruong: [iso] }
  function docDiemDanh(tuy) {
    var tu = tuy.tu, den = tuy.den, nam = tuy.nam || namHoc(), lops = tuy.lops;
    var trong = function (x) { return x.ngay >= tu && x.ngay <= den; };
    var kq = { lop: {}, ngayTruong: [] };
    lops.forEach(function (l) { kq.lop[l] = { hs: [], vang: [], ddl: [], gvcn: '' }; });
    if (!may()) {
      var hsMau = [{ ma: 'a', ho_ten: 'Nguyễn Văn An' }, { ma: 'b', ho_ten: 'Trần Thị Bình' }, { ma: 'c', ho_ten: 'Lê Minh Châu' }];
      thangTrong(tu, den).forEach(function (ym) { kq.ngayTruong = kq.ngayTruong.concat(ngayHocThang(ym, [])); });
      lops.forEach(function (l) {
        kq.lop[l] = { hs: hsMau, gvcn: tuy.gvcn || '', ddl: kq.ngayTruong.map(function (n) { return { ngay: n, buoi: 'sang', si_so: 3 }; }),
          vang: kq.ngayTruong.length ? [{ ngay: kq.ngayTruong[0], buoi: 'sang', hoc_sinh_ma: 'b', phep: 'co_phep' }] : [] };
      });
      return Promise.resolve(kq);
    }
    var motLopSan = lops.length === 1 && tuy.hs;
    var theoKy = function (q) { return q.eq('nam_hoc', nam).gte('ngay', tu).lte('ngay', den).order('id'); };
    var loLop = function (q) { return lops.length === 1 ? q.eq('lop', lops[0]) : q.in('lop', lops); };
    return Promise.all([
      motLopSan ? Promise.resolve(null)
        : taiHet('hoc_sinh_lop', 'id, lop, hoc_sinh_ma, trang_thai, hoc_sinh(ma, ho_ten)', function (q) { return loLop(q.eq('nam_hoc', nam)).order('id'); }),
      motLopSan ? Promise.resolve(tuy.vang.filter(trong)) : taiHet('hs_vang', 'id, lop, ngay, buoi, hoc_sinh_ma, phep', function (q) { return loLop(theoKy(q)); }),
      // diem_danh_lop cả trường: vừa là số buổi của từng lớp, vừa là "ngày đi học" của trường
      taiHet('diem_danh_lop', 'id, lop, ngay, buoi, si_so, so_vang', theoKy).catch(function () { return motLopSan ? tuy.ddl.filter(trong) : []; }),
      tuy.gvcn != null ? Promise.resolve(null)
        : may().from('lop_hoc').select('lop, gvcn_ten').eq('nam_hoc', nam).then(function (r) { return (r && r.data) || []; }, function () { return []; })
    ]).then(function (r) {
      if (motLopSan) kq.lop[lops[0]].hs = tuy.hs.slice();
      else r[0].forEach(function (d) { if (kq.lop[d.lop] && d.hoc_sinh && (!d.trang_thai || d.trang_thai === 'dang_hoc')) kq.lop[d.lop].hs.push(d.hoc_sinh); });
      (r[1] || []).forEach(function (v) { var l = motLopSan ? lops[0] : v.lop; if (kq.lop[l]) kq.lop[l].vang.push(v); });
      (r[2] || []).forEach(function (x) { kq.ngayTruong.push(x.ngay); var l = motLopSan && !x.lop ? lops[0] : x.lop; if (kq.lop[l]) kq.lop[l].ddl.push(x); });
      if (tuy.gvcn != null) kq.lop[lops[0]].gvcn = tuy.gvcn;
      else (r[3] || []).forEach(function (x) { if (kq.lop[x.lop]) kq.lop[x.lop].gvcn = x.gvcn_ten || ''; });
      lops.forEach(function (l) { kq.lop[l].hs.sort(function (a, b) { return sapTen(a.ho_ten, b.ho_ten); }); });
      return kq;
    });
  }
  // Thân MỘT trang: một lớp, một tháng
  function thanDiemDanh(lop, ym, L, ngayTruong, nam) {
    var w = W(), c = w.chan;
    var vang = L.vang.filter(function (v) { return v.ngay.slice(0, 7) === ym; }), ddl = L.ddl.filter(function (x) { return x.ngay.slice(0, 7) === ym; });
    var ngay = ngayHocThang(ym, ngayTruong.concat(ddl.map(function (x) { return x.ngay; })).concat(vang.map(function (x) { return x.ngay; })));
    var daDD = {}; ddl.forEach(function (x) { daDD[x.ngay] = 1; });
    var o = {}, tongHS = {}, vangNgay = {};
    vang.forEach(function (v) {
      var k = v.hoc_sinh_ma + '|' + v.ngay;
      (o[k] = o[k] || { sang: '', chieu: '' })[v.buoi === 'chieu' ? 'chieu' : 'sang'] = kyHieu(v.phep);
      var t = tongHS[v.hoc_sinh_ma] = tongHS[v.hoc_sinh_ma] || { P: 0, K: 0, R: 0 };
      t[loaiPhep(v.phep)]++;
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
    var dong = L.hs.map(function (h, i) {
      var t = tongHS[h.ma] || { P: 0, K: 0, R: 0 };
      return '<tr><td class="giua">' + (i + 1) + '</td><td style="white-space:nowrap">' + c(h.ho_ten) + '</td>' +
        ngay.map(function (n) {
          var x = o[h.ma + '|' + n];
          if (!daDD[n] && !x) return '<td class="bm-o" style="background:#e6e6e6"></td>';
          return '<td class="bm-o giua">' + (x ? c(x.sang + x.chieu) : '') + '</td>';
        }).join('') + (ngay.length ? '' : '<td class="bm-o"></td>') +
        '<td class="giua">' + (t.P || '') + '</td><td class="giua">' + (t.K || '') + '</td>' + (coR ? '<td class="giua">' + (t.R || '') + '</td>' : '') +
        '<td class="giua"><b>' + ((t.P + t.K + t.R) || '') + '</b></td></tr>';
    }).join('');
    var lp = { P: 0, K: 0, R: 0 };
    Object.keys(tongHS).forEach(function (m) { lp.P += tongHS[m].P; lp.K += tongHS[m].K; lp.R += tongHS[m].R; });
    dong += '<tr><td></td><td><b>Số HS vắng</b></td>' + ngay.map(function (n) {
      var s = Object.keys(vangNgay[n] || {}).length;
      return '<td class="bm-o giua">' + (s || (daDD[n] ? '0' : '')) + '</td>';
    }).join('') + (ngay.length ? '' : '<td class="bm-o giua nghieng">chưa có ngày học nào được điểm danh</td>') + '<td class="giua"><b>' + lp.P + '</b></td><td class="giua"><b>' + lp.K + '</b></td>' + (coR ? '<td class="giua"><b>' + lp.R + '</b></td>' : '') +
      '<td class="giua"><b>' + (lp.P + lp.K + lp.R) + '</b></td></tr>';
    var siSoBuoi = 0; ddl.forEach(function (x) { siSoBuoi += +x.si_so || L.hs.length; });
    var tong = lp.P + lp.K + lp.R;
    var tl = siSoBuoi ? Math.max(0, Math.round((1 - tong / siSoBuoi) * 1000) / 10) : null;
    var chuaDD = ngay.filter(function (n) { return !daDD[n]; }).length;
    return w.theThuc() +
      '<p class="giua" style="margin:14pt 0 0"><b style="font-size:14pt">BẢNG ĐIỂM DANH HỌC SINH</b></p>' +
      '<p class="giua" style="margin:2pt 0 0"><b>Lớp ' + c(lop) + ' · ' + c(tenThang(ym)) + ' · Năm học ' + c(nam) + '</b></p>' +
      '<p style="margin:10pt 0 6pt">Giáo viên chủ nhiệm: <b>' + c(L.gvcn || '....................................') + '</b> · Sĩ số: <b>' + L.hs.length + '</b>' +
      ' · Số buổi đã điểm danh: <b>' + ddl.length + '</b>' + (tl != null ? ' · Tỉ lệ chuyên cần: <b>' + tl1(tl) + '%</b>' : '') + '.</p>' +
      '<table class="co-dinh bm-dd"><thead>' + dau1 + dau2 + '</thead><tbody>' + dong + '</tbody></table>' +
      '<p class="nghieng" style="font-size:11pt;margin:4pt 0 0">Ký hiệu: <b>P</b> - vắng có phép · <b>K</b> - vắng không phép · <b>?</b> - chưa rõ lý do; ' +
      'ô có hai ký hiệu là vắng cả hai buổi (sáng trước, chiều sau); ô để trống là có mặt' +
      (chuaDD ? '; ô <b>tô xám</b> là ngày lớp chưa điểm danh trên hệ thống (' + chuaDD + ' ngày)' : '') + '.</p>' +
      w.khoiKy('GIÁO VIÊN CHỦ NHIỆM', L.gvcn || '');
  }
  // Tháng chưa tới thì không in trang trống (xuất cả học kỳ khi mới đầu năm)
  function thangDaQua(tu, den) {
    var nay = homNayISO().slice(0, 7), ds = thangTrong(tu, den).filter(function (ym) { return ym <= nay; });
    return ds.length ? ds : [tu.slice(0, 7)];
  }
  function htmlDiemDanh(dl, tuy) {
    var nam = tuy.nam || namHoc(), trang = [];
    tuy.lops.forEach(function (l) {
      thangDaQua(tuy.tu, tuy.den).forEach(function (ym) { trang.push(thanDiemDanh(l, ym, dl.lop[l], dl.ngayTruong, nam)); });
    });
    return kemCSS(W().khungWord('Điểm danh học sinh', trang.join(NGAT_TRANG), true),
      'table.bm-dd th{font-size:9pt;padding:1pt 1pt}table.bm-dd td{font-size:10pt;padding:1pt 2pt;line-height:1.15}' +
      'table.bm-dd td.bm-o{font-size:8.5pt;padding:1pt 0}th.bm-ngay{font-weight:normal}');
  }
  // tuy = { lop | lops, nhan?, ym? | tu+den, nam, (từ Sổ chủ nhiệm:) hs, vang, ddl, gvcn }
  function diemDanhLop(tuy, tai) {
    tuy = Object.assign({}, tuy || {});
    tuy.lops = tuy.lops || (tuy.lop ? [tuy.lop] : []);
    if (!tuy.lops.length) { bao('Chọn lớp trước.'); return; }
    if (!tuy.tu) { var k = khoangKy('thang', tuy.ym); tuy.tu = k.tu; tuy.den = k.den; }
    var soThang = thangDaQua(tuy.tu, tuy.den).length, soTrang = soThang * tuy.lops.length;
    if (soTrang > 120) { bao('Quá nhiều trang (' + soTrang + ') — chọn ít lớp hơn hoặc kỳ ngắn hơn.'); return; }
    var nhan = tuy.nhan || khoangChu(tuy.tu, tuy.den);
    var ten = tuy.lops.length === 1 ? 'lớp ' + tuy.lops[0] : tuy.tenNhom || tuy.lops.length + ' lớp';
    var hua = null;
    moHoacTai({
      tieuDe: 'Bảng điểm danh ' + ten + ' · ' + nhan + (soTrang > 1 ? ' (' + soTrang + ' trang)' : ''),
      dung: function () { return (hua || (hua = docDiemDanh(tuy))).then(function (dl) { return htmlDiemDanh(dl, tuy); }); },
      tenTep: function () {
        return 'diem-danh-' + (tuy.lops.length === 1 ? 'lop-' + String(tuy.lops[0]).replace(/[^\w-]/g, '') : String(tuy.maNhom || 'nhieu-lop')) +
          '-' + (soThang === 1 ? tuy.tu.slice(0, 7) : tuy.tu + '-den-' + tuy.den) + '.doc';
      }
    }, tai);
  }

  // ── Tổng hợp chuyên cần toàn trường theo kỳ (Ban giám hiệu)
  function docTruong(tu, den) {
    var nam = namHoc();
    if (!may()) {
      return Promise.resolve({ lop: [{ lop: '1A', khoi: 1, co_so_ma: '', gvcn_ten: 'Cô Lan' }, { lop: '2A', khoi: 2, co_so_ma: '', gvcn_ten: 'Cô Hà' }],
        coSo: [], siSo: { '1A': 30, '2A': 28 }, ddl: [{ lop: '1A', ngay: tu, buoi: 'sang', si_so: 30 }, { lop: '2A', ngay: tu, buoi: 'sang', si_so: 28 }],
        vang: [{ lop: '1A', ngay: tu, buoi: 'sang', hoc_sinh_ma: 'x', phep: 'co_phep' }], tenHS: { x: 'Nguyễn Văn An' } });
    }
    var theoKy = function (q) { return q.eq('nam_hoc', nam).gte('ngay', tu).lte('ngay', den).order('id'); };
    return Promise.all([
      may().from('lop_hoc').select('lop, khoi, co_so_ma, gvcn_ten').eq('nam_hoc', nam),
      may().from('co_so').select('ma, ten').eq('hoat_dong', true).order('so_tt'),
      taiHet('hoc_sinh_lop', 'id, lop, trang_thai', function (q) { return q.eq('nam_hoc', nam).order('id'); }),
      taiHet('diem_danh_lop', 'id, lop, ngay, buoi, si_so, so_vang', theoKy),
      taiHet('hs_vang', 'id, lop, ngay, buoi, hoc_sinh_ma, phep', theoKy)
    ]).then(function (r) {
      if (r[0].error) throw r[0].error;
      var siSo = {};
      r[2].forEach(function (x) { if (!x.trang_thai || x.trang_thai === 'dang_hoc') siSo[x.lop] = (siSo[x.lop] || 0) + 1; });
      var kq = { lop: r[0].data || [], coSo: (r[1] && !r[1].error && r[1].data) || [], siSo: siSo, ddl: r[3], vang: r[4], tenHS: {} };
      // Tên học sinh vắng nhiều — chỉ tra những em có từ 3 lượt trở lên
      var dem = {};
      kq.vang.forEach(function (v) { dem[v.hoc_sinh_ma] = (dem[v.hoc_sinh_ma] || 0) + 1; });
      var can = Object.keys(dem).filter(function (m) { return dem[m] >= 3; }), lo = [];
      for (var i = 0; i < can.length; i += 200) lo.push(can.slice(i, i + 200));
      return Promise.all(lo.map(function (x) {
        return may().from('hoc_sinh').select('ma, ho_ten').in('ma', x).then(function (t) {
          ((t && t.data) || []).forEach(function (h) { kq.tenHS[h.ma] = h.ho_ten; });
        }, function () {});
      })).then(function () { return kq; });
    });
  }
  // Số liệu dùng chung cho Word và Excel
  function tinhTruong(dl, gt) {
    var dsLop = dl.lop.filter(function (l) { return !gt.cs || l.co_so_ma === gt.cs; }).sort(function (a, b) { return sapLop(a.lop, b.lop); });
    var trong = {}; dsLop.forEach(function (l) { trong[l.lop] = 1; });
    var tk = {};
    dsLop.forEach(function (l) { tk[l.lop] = { buoi: 0, siSoBuoi: 0, P: 0, K: 0, R: 0, hs: {} }; });
    dl.ddl.forEach(function (x) { var t = tk[x.lop]; if (t) { t.buoi++; t.siSoBuoi += +x.si_so || dl.siSo[x.lop] || 0; } });
    dl.vang.forEach(function (v) { var t = tk[v.lop]; if (!t) return; t[loaiPhep(v.phep)]++; t.hs[v.hoc_sinh_ma] = 1; });
    var nguong = +gt.nguong || 3, d = {};
    dl.vang.forEach(function (v) {
      if (!trong[v.lop]) return;
      var x = d[v.hoc_sinh_ma] = d[v.hoc_sinh_ma] || { ma: v.hoc_sinh_ma, lop: v.lop, P: 0, K: 0, R: 0 };
      x[loaiPhep(v.phep)]++;
    });
    var dsNhieu = Object.keys(d).map(function (m) { return d[m]; }).filter(function (x) { return x.P + x.K + x.R >= nguong; })
      .sort(function (a, b) { return (b.P + b.K + b.R) - (a.P + a.K + a.R) || sapLop(a.lop, b.lop); });
    var tl = function (t) { var v = t.P + t.K + t.R; return t.siSoBuoi ? Math.max(0, Math.round((1 - v / t.siSoBuoi) * 1000) / 10) : null; };
    var cong = function (ds) {
      var s = { buoi: 0, siSoBuoi: 0, P: 0, K: 0, R: 0, hs: {}, siSo: 0 };
      ds.forEach(function (l) { var t = tk[l.lop]; s.siSo += dl.siSo[l.lop] || 0; s.buoi += t.buoi; s.siSoBuoi += t.siSoBuoi; s.P += t.P; s.K += t.K; s.R += t.R; Object.keys(t.hs).forEach(function (m) { s.hs[m] = 1; }); });
      return s;
    };
    return { dsLop: dsLop, tk: tk, dsNhieu: dsNhieu, nguong: nguong, tl: tl, cong: cong,
      ngayHoc: (function () { var o = {}; dl.ddl.forEach(function (x) { o[x.ngay] = 1; }); return Object.keys(o).length; })() };
  }
  function htmlTruong(dl, gt, tu, den, nhan) {
    var w = W(), c = w.chan, t = tinhTruong(dl, gt);
    var tenCS = {}; dl.coSo.forEach(function (x) { tenCS[x.ma] = x.ten; });
    var tlChu = function (s) { var v = t.tl(s); return v == null ? '—' : tl1(v) + '%'; };
    var dongLop = function (l, i) {
      var s = t.tk[l.lop];
      return '<tr><td class="giua">' + (i + 1) + '</td><td class="giua"><b>' + c(l.lop) + '</b></td><td>' + c(l.gvcn_ten || '') + '</td>' +
        '<td class="giua">' + (dl.siSo[l.lop] || '') + '</td><td class="giua">' + s.buoi + '</td>' +
        '<td class="giua">' + (s.P || '') + '</td><td class="giua">' + (s.K || '') + '</td><td class="giua">' + (s.R || '') + '</td>' +
        '<td class="giua"><b>' + ((s.P + s.K + s.R) || '') + '</b></td><td class="giua">' + (Object.keys(s.hs).length || '') + '</td>' +
        '<td class="giua">' + tlChu(s) + '</td></tr>';
    };
    var dongCong = function (ds, nhanC) {
      var s = t.cong(ds);
      return '<tr style="background:#f2f2f2"><td colspan="3"><b>' + c(nhanC) + '</b></td><td class="giua"><b>' + s.siSo + '</b></td><td class="giua"><b>' + s.buoi + '</b></td>' +
        '<td class="giua"><b>' + s.P + '</b></td><td class="giua"><b>' + s.K + '</b></td><td class="giua"><b>' + s.R + '</b></td>' +
        '<td class="giua"><b>' + (s.P + s.K + s.R) + '</b></td><td class="giua"><b>' + Object.keys(s.hs).length + '</b></td><td class="giua"><b>' + tlChu(s) + '</b></td></tr>';
    };
    var nhomCS = dl.coSo.length > 1 && !gt.cs;
    var than = '', i = 0;
    if (nhomCS) {
      dl.coSo.concat([{ ma: null, ten: 'Chưa gán điểm trường' }]).forEach(function (cs) {
        var ds = t.dsLop.filter(function (l) { return cs.ma === null ? !tenCS[l.co_so_ma] : l.co_so_ma === cs.ma; });
        if (!ds.length) return;
        than += '<tr><td colspan="11" style="background:#d9d9d9;font-weight:bold">' + c(cs.ten) + '</td></tr>' +
          ds.map(function (l) { return dongLop(l, i++); }).join('') + dongCong(ds, 'Cộng ' + cs.ten);
      });
    } else than = t.dsLop.map(dongLop).join('');
    than += dongCong(t.dsLop, gt.cs ? 'Cộng' : 'Toàn trường');
    var chuaDD = t.dsLop.filter(function (l) { return !t.tk[l.lop].buoi; }).map(function (l) { return l.lop; });
    var h = w.theThuc() +
      '<p class="giua" style="margin:18pt 0 0"><b style="font-size:14pt">TỔNG HỢP CHUYÊN CẦN HỌC SINH</b></p>' +
      '<p class="giua" style="margin:2pt 0 0"><b>' + c(nhan || khoangChu(tu, den)) + (/Năm học/.test(nhan || '') ? '' : ' · Năm học ' + c(namHoc())) + '</b></p>' +
      (nhan && nhan !== khoangChu(tu, den) ? '<p class="giua nghieng" style="margin:2pt 0 0">(' + c(khoangChu(tu, den)) + ')</p>' : '') +
      (gt.cs ? '<p class="giua" style="margin:2pt 0 0">' + c(tenCS[gt.cs] || gt.cs) + '</p>' : '') +
      '<p style="margin:12pt 0 6pt">Số ngày học có điểm danh trong kỳ: <b>' + t.ngayHoc + '</b>; số lớp: <b>' + t.dsLop.length + '</b>. ' +
      'Đơn vị tính: <b>lượt buổi</b> vắng. Tỉ lệ chuyên cần = 1 − lượt vắng / (sĩ số × số buổi đã điểm danh).</p>' +
      '<table class="co-dinh bm-nho"><thead><tr><th style="width:0.9cm" rowspan="2">TT</th><th style="width:1.3cm" rowspan="2">Lớp</th>' +
      '<th style="width:3.4cm" rowspan="2">Giáo viên chủ nhiệm</th><th style="width:1.2cm" rowspan="2">Sĩ số</th><th style="width:1.4cm" rowspan="2">Buổi đã điểm danh</th>' +
      '<th colspan="4">Lượt vắng</th><th style="width:1.5cm" rowspan="2">Số HS có vắng</th><th style="width:1.7cm" rowspan="2">Tỉ lệ chuyên cần</th></tr>' +
      '<tr><th style="width:1.1cm">Có phép</th><th style="width:1.1cm">Không phép</th><th style="width:1.0cm">Chưa rõ</th><th style="width:1.0cm">Cộng</th></tr></thead>' +
      '<tbody>' + than + '</tbody></table>' +
      (chuaDD.length ? '<p class="nghieng" style="font-size:11.5pt;margin:4pt 0 0">Lớp chưa điểm danh buổi nào trong kỳ trên hệ thống: ' + c(chuaDD.join(', ')) + '.</p>' : '') +
      (gt.nhieu ? '<p style="margin:14pt 0 4pt"><b>Học sinh vắng từ ' + t.nguong + ' buổi trở lên trong kỳ</b></p>' + (t.dsNhieu.length
        ? '<table class="co-dinh bm-nho"><thead><tr><th style="width:1cm">TT</th><th style="width:5.6cm">Họ và tên</th><th style="width:1.6cm">Lớp</th>' +
          '<th style="width:1.8cm">Có phép</th><th style="width:1.8cm">Không phép</th><th style="width:1.6cm">Chưa rõ</th><th style="width:3.1cm">Tổng số buổi</th></tr></thead><tbody>' +
          t.dsNhieu.map(function (x, k) {
            return '<tr><td class="giua">' + (k + 1) + '</td><td>' + c(dl.tenHS[x.ma] || x.ma) + '</td><td class="giua">' + c(x.lop) + '</td>' +
              '<td class="giua">' + (x.P || '') + '</td><td class="giua">' + (x.K || '') + '</td><td class="giua">' + (x.R || '') + '</td>' +
              '<td class="giua"><b>' + (x.P + x.K + x.R) + '</b></td></tr>';
          }).join('') + '</tbody></table>'
        : '<p class="nghieng">Không có học sinh nào vắng từ ' + t.nguong + ' buổi trở lên.</p>') : '') +
      w.khoiKy('NGƯỜI LẬP BIỂU', may() ? (nd().ho_ten || '') : '');
    return kemCSS(w.khungWord('Tổng hợp chuyên cần', h),
      'table.bm-nho th{font-size:10.5pt;padding:2pt 3pt}table.bm-nho td{font-size:11.5pt;padding:2pt 4pt}');
  }
  function excelTruong(dl, gt, tu, den, nhan, ten) {
    var t = tinhTruong(dl, gt), tenCS = {};
    dl.coSo.forEach(function (x) { tenCS[x.ma] = x.ten; });
    var phu = (nhan || khoangChu(tu, den)) + (gt.cs ? ' · ' + (tenCS[gt.cs] || gt.cs) : '');
    var tl = function (s) { var v = t.tl(s); return v == null ? '' : v; };
    var sTong = t.cong(t.dsLop);
    return { ten: ten, sheets: [
      sheetBang({ ten: 'Theo lớp', tieuDe: 'TỔNG HỢP CHUYÊN CẦN HỌC SINH', phu: phu, doc: true,
        cot: [['TT', 5], ['Lớp', 8], ['Điểm trường', 18], ['Giáo viên chủ nhiệm', 24], ['Sĩ số', 7], ['Buổi đã điểm danh', 10], ['Vắng có phép', 9], ['Vắng không phép', 9], ['Chưa rõ', 8], ['Cộng lượt vắng', 9], ['Số HS có vắng', 9], ['Tỉ lệ chuyên cần (%)', 11]],
        dong: t.dsLop.map(function (l, i) {
          var s = t.tk[l.lop];
          return [i + 1, l.lop, tenCS[l.co_so_ma] || '', l.gvcn_ten || '', dl.siSo[l.lop] || 0, s.buoi, s.P, s.K, s.R, s.P + s.K + s.R, Object.keys(s.hs).length, tl(s)];
        }),
        cuoi: [['', 'Cộng', '', '', sTong.siSo, sTong.buoi, sTong.P, sTong.K, sTong.R, sTong.P + sTong.K + sTong.R, Object.keys(sTong.hs).length, tl(sTong)]] }),
      sheetBang({ ten: 'HS vắng nhiều', tieuDe: 'HỌC SINH VẮNG TỪ ' + t.nguong + ' BUỔI TRỞ LÊN', phu: phu, doc: true,
        cot: [['TT', 5], ['Họ và tên', 28], ['Lớp', 8], ['Có phép', 9], ['Không phép', 9], ['Chưa rõ', 8], ['Tổng số buổi', 10]],
        dong: t.dsNhieu.map(function (x, i) { return [i + 1, dl.tenHS[x.ma] || x.ma, x.lop, x.P, x.K, x.R, x.P + x.K + x.R]; }) })
    ] };
  }
  // tuy = { ym | tu+den, nhan, coSo, cs }
  function diemDanhTruong(tuy, tai) {
    tuy = tuy || {};
    var k = tuy.tu ? { tu: tuy.tu, den: tuy.den, nhan: tuy.nhan || khoangChu(tuy.tu, tuy.den), ma: tuy.maKy || (tuy.tu + '-den-' + tuy.den) } : khoangKy('thang', tuy.ym);
    var hua = null, lay = function () { return hua || (hua = docTruong(k.tu, k.den)); };
    var dai = thangTrong(k.tu, k.den).length > 1;
    var bieu = {
      tieuDe: 'Tổng hợp chuyên cần học sinh · ' + k.nhan,
      dung: function (gt) { return lay().then(function (dl) { return htmlTruong(dl, gt, k.tu, k.den, k.nhan); }); },
      excel: function (gt) { return lay().then(function (dl) { return excelTruong(dl, gt, k.tu, k.den, k.nhan, 'tong-hop-chuyen-can-' + (gt.cs ? gt.cs + '-' : '') + k.ma + '.xlsx'); }); },
      tenTep: function (gt) { return 'tong-hop-chuyen-can-' + (gt.cs ? gt.cs + '-' : '') + k.ma + '.doc'; },
      tuyChon: [
        { ma: 'nhieu', nhan: 'Kèm danh sách HS vắng nhiều', mac: true },
        { ma: 'nguong', nhan: 'Ngưỡng', loai: 'chon', ds: [['3', 'từ 3 buổi'], ['5', 'từ 5 buổi'], ['10', 'từ 10 buổi'], ['20', 'từ 20 buổi']], mac: dai ? '10' : '3' }
      ]
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
  var B = { ky: 'thang', ym: '', coSo: [], lop: [], lopToi: [], phuTrach: false, napXong: false, dangNap: false, lopChon: '' };
  function napThe() {
    if (B.napXong || B.dangNap) return Promise.resolve();
    if (!may()) {
      B.coSo = []; B.lop = [{ lop: '1A', khoi: 1 }, { lop: '2A', khoi: 2 }]; B.phuTrach = true; B.napXong = true;
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
  // Lựa chọn lớp: từng lớp; BGH thêm "cả khối", "từng điểm trường", "toàn trường"
  function luaChonLop(qt) {
    var ra = (qt ? B.lop.map(function (l) { return l.lop; }) : B.lopToi).map(function (l) { return [l, 'Lớp ' + l]; });
    if (!qt || B.lop.length < 2) return ra;
    var khoi = {};
    B.lop.forEach(function (l) { if (l.khoi) khoi[l.khoi] = 1; });
    Object.keys(khoi).sort().forEach(function (k) { ra.push(['k:' + k, '— Cả khối ' + k + ' —']); });
    if (B.coSo.length > 1) B.coSo.forEach(function (c) { ra.push(['cs:' + c.ma, '— ' + c.ten + ' —']); });
    ra.push(['*', '— Toàn trường —']);
    return ra;
  }
  function lopTheoChon(v) {
    if (v === '*') return { lops: B.lop.map(function (l) { return l.lop; }), ten: 'toàn trường', ma: 'toan-truong' };
    if (/^k:/.test(v)) return { lops: B.lop.filter(function (l) { return String(l.khoi) === v.slice(2); }).map(function (l) { return l.lop; }), ten: 'khối ' + v.slice(2), ma: 'khoi-' + v.slice(2) };
    if (/^cs:/.test(v)) {
      var cs = B.coSo.filter(function (c) { return c.ma === v.slice(3); })[0] || {};
      return { lops: B.lop.filter(function (l) { return l.co_so_ma === v.slice(3); }).map(function (l) { return l.lop; }), ten: cs.ten || v.slice(3), ma: 'diem-' + v.slice(3) };
    }
    return { lops: [v], ten: 'lớp ' + v, ma: '' };
  }
  function ve(el) {
    if (!el) return;
    if (!B.ym) B.ym = homNayISO().slice(0, 7);
    if (!B.napXong) {
      el.innerHTML = '<div class="the-thong-bao">Đang tải…</div>';
      napThe().then(function () { if (document.body.contains(el)) ve(el); });
      return;
    }
    var qt = laQT(), dsChon = luaChonLop(qt), k = khoangKy(B.ky, B.ym);
    if (!dsChon.some(function (x) { return x[0] === B.lopChon; })) B.lopChon = (dsChon[0] || [''])[0];
    var the = function (bi, ten, moTa, nut, them) {
      return '<section class="bm-the"><div class="bm-bi">' + bi + '</div><div class="bm-noi"><h3>' + ten + '</h3><p>' + moTa + '</p>' +
        (them || '') + '<div class="bm-nut">' + nut + '</div></div></section>';
    };
    var nut3 = function (ma, coExcel) {
      return '<button type="button" class="nut-chinh" data-bm-xem="' + ma + '">👁 Xem trước</button>' +
        '<button type="button" class="dh-nut-nho" data-bm-tai="' + ma + '">⬇ Tải Word</button>' +
        (coExcel ? '<button type="button" class="dh-nut-nho" data-bm-excel="' + ma + '">⬇ Tải Excel</button>' : '');
    };
    var h = '<div class="bm-dau"><label>Kỳ báo cáo <select id="bm-ky" class="tkb-chon">' + TEN_KY.map(function (x) {
      return '<option value="' + x[0] + '"' + (x[0] === B.ky ? ' selected' : '') + '>' + x[1] + '</option>';
    }).join('') + '</select></label>' +
      (B.ky === 'thang' ? '<input type="month" id="bm-thang" class="tkb-chon" value="' + B.ym + '" aria-label="Tháng">' : '') +
      '<b class="bm-khoang">' + thoat(k.nhan) + (k.nhan !== khoangChu(k.tu, k.den) ? ' · ' + thoat(ngayVN(k.tu)) + ' – ' + thoat(ngayVN(k.den)) : '') + '</b>' +
      '<small>Mỗi biểu xem được ngay trên màn hình, tải về tệp Word đúng thể thức (Nghị định 30) để chỉnh sửa, in, ký; biểu số liệu tải thêm được bản Excel.</small></div>' +
      '<div class="bm-luoi">';
    if (B.phuTrach) {
      h += the('👨‍🏫', 'Danh sách giáo viên dạy thay', 'Từng tiết dạy thay trong kỳ: ngày, tiết, lớp, môn, người nghỉ, người dạy thay, xác nhận — kèm tổng hợp theo người dạy thay và theo người nghỉ (lý do nghỉ).', nut3('daythay', true));
      h += the('🧮', 'Tổng hợp tiết dạy thay theo giáo viên', 'Số tiết dạy thay (sáng/chiều) của mỗi giáo viên trong kỳ, có cột ký nhận — căn cứ thanh toán. Bảng công tháng cũng đã có cột này.', nut3('daythay-th', true));
    }
    if (dsChon.length) {
      h += the('📅', 'Bảng điểm danh học sinh (theo lớp)', 'Lưới ngày × học sinh ghi P / K từng buổi, cộng số buổi vắng, tỉ lệ chuyên cần — mỗi lớp mỗi tháng một trang' +
        (qt ? '; chọn cả khối, điểm trường hoặc toàn trường để in một lần' : '') + '.', nut3('dd-lop', false),
        '<label class="bm-chon">Lớp <select id="bm-lop" class="tkb-chon">' + dsChon.map(function (x) {
          return '<option value="' + thoat(x[0]) + '"' + (x[0] === B.lopChon ? ' selected' : '') + '>' + thoat(x[1]) + '</option>';
        }).join('') + '</select></label>');
    }
    if (qt) {
      h += the('📊', 'Tổng hợp chuyên cần toàn trường', 'Mỗi lớp: sĩ số, buổi đã điểm danh, lượt vắng có phép / không phép, tỉ lệ chuyên cần; cộng theo điểm trường; danh sách học sinh vắng nhiều.', nut3('dd-truong', true));
      h += the('🧑‍🏫', 'Bảng tổng hợp ngày công CBGV-NV', 'Tính và chốt theo tháng ở màn Điểm danh & Chấm công, rồi bấm "Xem & tải Word" dưới bảng công (có cột tiết dạy thay).',
        '<button type="button" class="dh-nut-nho" data-bm-mo="baocao">Mở Điểm danh & Chấm công ›</button>');
    }
    h += the('🗂', 'Danh mục Hồ sơ', 'Toàn bộ danh mục hồ sơ của nhà trường theo bộ phận, hộp: mã MC, tên hồ sơ, tiêu chí, người phụ trách, tầng, căn cứ. Lọc được hồ sơ chưa hoàn thiện.', nut3('danhmuc', false));
    h += the('📅', 'Lịch công tác tuần', 'Xuất Word ở màn Lịch tuần (nút Word trên lịch).', '<button type="button" class="dh-nut-nho" data-bm-mo="lichtuan">Mở Lịch tuần ›</button>');
    h += '</div>';
    el.innerHTML = h;
    var oKy = el.querySelector('#bm-ky');
    if (oKy) oKy.addEventListener('change', function () { B.ky = oKy.value; ve(el); });
    var o = el.querySelector('#bm-thang');
    if (o) o.addEventListener('change', function () { if (/^\d{4}-\d{2}$/.test(o.value)) { B.ym = o.value; ve(el); } });
    var ol = el.querySelector('#bm-lop');
    if (ol) ol.addEventListener('change', function () { B.lopChon = ol.value; });
    var chay = function (ma, tai) {
      var kk = khoangKy(B.ky, B.ym);
      var chung = { tu: kk.tu, den: kk.den, nhan: kk.nhan, coSo: B.coSo };
      if (ma === 'daythay') dayThay(Object.assign({ cs: csCuaToi() }, chung), tai);
      else if (ma === 'daythay-th') dayThay(Object.assign({ cs: csCuaToi(), chiTongHop: true }, chung), tai);
      else if (ma === 'dd-lop') {
        var n = lopTheoChon(B.lopChon);
        if (!n.lops.length) { bao('Chưa có lớp nào trong lựa chọn này.'); return; }
        diemDanhLop({ lops: n.lops, tenNhom: n.ten, maNhom: n.ma, nam: namHoc(), tu: kk.tu, den: kk.den, nhan: kk.nhan }, tai);
      }
      else if (ma === 'dd-truong') diemDanhTruong(Object.assign({ maKy: kk.ma }, chung), tai);
      else if (ma === 'danhmuc') danhMuc(tai);
    };
    Array.prototype.slice.call(el.querySelectorAll('[data-bm-xem]')).forEach(function (b) { b.addEventListener('click', function () { chay(b.getAttribute('data-bm-xem'), false); }); });
    Array.prototype.slice.call(el.querySelectorAll('[data-bm-tai]')).forEach(function (b) { b.addEventListener('click', function () { chay(b.getAttribute('data-bm-tai'), 'word'); }); });
    Array.prototype.slice.call(el.querySelectorAll('[data-bm-excel]')).forEach(function (b) { b.addEventListener('click', function () { chay(b.getAttribute('data-bm-excel'), 'excel'); }); });
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
    _htmlDanhMuc: htmlDanhMuc, _khoangKy: khoangKy, _thangTrong: thangTrong, _thangDaQua: thangDaQua, _ngayHocThang: ngayHocThang, _sheetBang: sheetBang
  };
})();
