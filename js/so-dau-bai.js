// ============================================================
// so-dau-bai.js — SỔ GHI ĐẦU BÀI ĐIỆN TỬ (sql/83)
//
// TT 15/2026/TT-BGDĐT Đ.21 k.1 điểm e: sổ ghi đầu bài là hồ sơ BẮT BUỘC của nhà
// trường; Đ.21 k.4: dùng bản điện tử thì không bắt buộc lập sổ giấy.
// Thầy Chung chốt 5/10/2026: KHÔNG xếp loại tiết học · hạn ghi TRONG BUỔI (quá
// giờ vẫn ghi, mang dấu "ghi bù") · GVCN CHỐT TUẦN, Ban giám hiệu KÝ THÁNG.
//
// Hai chỗ dùng:
//   Điều hành › 📖 Ghi đầu bài   giáo viên mở trên điện thoại, thấy SẴN các tiết
//                                 của mình hôm nay (thời khóa biểu + dạy thay), chỉ
//                                 gõ tên bài rồi bấm Lưu. BGH thấy thêm tình hình
//                                 ghi sổ của cả trường hôm nay.
//   Lớp học › Sổ đầu bài          sổ một TUẦN của một lớp như trang sổ giấy: tiết ·
//                                 môn · tên bài · người ký · học sinh vắng (đọc từ
//                                 điểm danh, không ghi lại) · chốt tuần · ký tháng · tải Word.
//
// KHÔNG phát sinh nguồn thứ hai: khung tiết = tkb_tiet (qua TKB_XEM) + day_thay;
// học sinh vắng = diem_danh_lop + hs_vang. Bảng riêng chỉ giữ tên bài, ghi chú, chữ ký.
// Quyền thật nằm ở RLS sql/83 — ẩn/hiện ở đây chỉ cho gọn.
//
// Trường CHƯA chạy sql/83: thẻ không hiện (dò một lần sau đăng nhập — SDB_BAT).
// ============================================================
(function () {
  'use strict';

  function thoat(s) { return window.thoatHTML ? window.thoatHTML(s) : String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return '&#' + c.charCodeAt(0) + ';'; }); }
  function may() { return window.MAY_CHU; }
  function bao(s) { if (window.notify) window.notify(s); }
  function pad(n) { return ('0' + n).slice(-2); }
  function isoCua(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function homNayISO() { return isoCua(new Date()); }
  function congNgay(iso, n) { var p = iso.split('-'); return isoCua(new Date(+p[0], +p[1] - 1, +p[2] + n)); }
  function ngayVN(iso) { var p = String(iso || '').split('-'); return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : ''; }
  function ngayNgan(iso) { var p = String(iso || '').split('-'); return p.length === 3 ? p[2] + '/' + p[1] : ''; }
  function thuCuaNgay(iso) { var p = String(iso).split('-'); var g = new Date(+p[0], +p[1] - 1, +p[2]).getDay(); return g === 0 ? 8 : g + 1; }
  function thuHai(iso) { return congNgay(iso, 2 - thuCuaNgay(iso)); }
  var TEN_THU = { 2: 'Thứ Hai', 3: 'Thứ Ba', 4: 'Thứ Tư', 5: 'Thứ Năm', 6: 'Thứ Sáu', 7: 'Thứ Bảy', 8: 'Chủ nhật' };
  var TEN_BUOI = { sang: 'Buổi sáng', chieu: 'Buổi chiều' };
  function kiHieu(b, t) { return (b === 'sang' ? 'S' : 'C') + t; }
  function chuanLop(s) { return String(s || '').trim().toUpperCase(); }
  function khongDau(s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase(); }
  function chuanMon(s) { return khongDau(s).replace(/[^a-z0-9]/g, ''); }
  function khoa(b, t, l) { return b + '|' + t + '|' + chuanLop(l); }
  function toiEmail() { return String((window.NGUOI_DUNG || {}).email || '').toLowerCase(); }
  function vaiTro() { return (window.NGUOI_DUNG || {}).vai_tro || ''; }
  function laQT() { return !may() || vaiTro() === 'admin' || vaiTro() === 'ban_giam_hieu'; }
  function namHoc() { return (window.CAU_HINH && window.CAU_HINH.NAM_HOC) || ''; }
  function gioPhut(ts) { var d = new Date(ts); return isNaN(d) ? '' : pad(d.getHours()) + ':' + pad(d.getMinutes()); }
  function ngayCuaTs(ts) { var d = new Date(ts); return isNaN(d) ? '' : isoCua(d); }
  function thangChu(ym) { return 'tháng ' + (+ym.slice(5, 7)) + '/' + ym.slice(0, 4); }

  // Ghi chú bấm nhanh — KHÔNG có ô xếp loại / chấm điểm tiết (thầy Chung chốt 5/10/2026)
  var GHI_CHU_NHANH = ['Chưa xong bài, dạy tiếp tiết sau', 'Lớp tích cực, hiểu bài', 'Có học sinh cần kèm thêm', 'Dạy bù'];
  var LY_DO_KHONG_DAY = ['Hoạt động chung toàn trường', 'Nghỉ theo kế hoạch nhà trường', 'Lớp tự quản', 'Khác'];

  // ══════════════════════════════════════════════════════════════
  // DÒ TRƯỜNG ĐÃ BẬT SỔ ĐẦU BÀI (đã chạy sql/83) CHƯA
  // ══════════════════════════════════════════════════════════════
  var BAT = null;          // null = chưa dò · true · false
  function laThieuBang(e) { return /sdb_|does not exist|schema cache|Could not find/i.test(String((e && (e.message || e.details)) || e || '')); }
  function doBat() {
    if (!may()) { BAT = true; return Promise.resolve(true); }
    return may().from('sdb_chot').select('id').limit(1).then(function (r) {
      BAT = !(r.error && laThieuBang(r.error));
      return BAT;
    }, function () { BAT = null; return null; });
  }
  // dieu-hanh.js / hocsinh.js hỏi: false = ẩn thẻ. Chưa dò xong cũng ẩn (khỏi hiện rồi biến).
  window.SDB_BAT = function () { return !may() ? true : BAT === true; };
  document.addEventListener('dangnhap-xong', function () {
    BAT = null; V.khoa = ''; L.khoiTao = false; BO_NHO_TKB = {};
    doBat().then(function (b) {
      if (b && window.DH && window.DH.ve) window.DH.ve();
      if (b && window.LOP_HOC_VE_LAI) window.LOP_HOC_VE_LAI();
    });
  });

  // ══════════════════════════════════════════════════════════════
  // NGUỒN CHUNG: KHUNG TIẾT MỘT NGÀY = THỜI KHÓA BIỂU + DẠY THAY
  // ══════════════════════════════════════════════════════════════
  var BO_NHO_TKB = {};
  function tkbNgay(ngay) {
    if (!window.TKB_XEM) return Promise.resolve(null);
    if (!may()) return Promise.resolve(window.TKB_XEM.duLieuMau());
    if (BO_NHO_TKB[ngay]) return BO_NHO_TKB[ngay];
    BO_NHO_TKB[ngay] = window.TKB_XEM.docDsPhienBan().then(function (ds) {
      var pb = window.TKB_XEM.phienBanNgay(ds, ngay);
      return pb ? window.TKB_XEM.docPhienBan(pb) : null;
    }, function (e) { delete BO_NHO_TKB[ngay]; throw e; });
    return BO_NHO_TKB[ngay];
  }
  // → [{lop, buoi, tiet, mon, gvEmail, gvNhan, thay, gvGoc, tuQuan}] — đã thay người theo day_thay
  function khungNgay(dl, dayThay, ngay, lopLoc) {
    var thu = thuCuaNgay(ngay), ra = [], theo = {};
    if (dl && thu !== 8) {
      dl.tiet.forEach(function (x) {
        if (+x.thu !== thu) return;
        if (lopLoc && chuanLop(x.lop) !== chuanLop(lopLoc)) return;
        var o = { lop: x.lop, buoi: x.buoi, tiet: +x.tiet, mon: x.mon, gvEmail: String(x.gv_email || '').toLowerCase(), gvNhan: x.gv_nhan || '', thay: false };
        ra.push(o); theo[khoa(o.buoi, o.tiet, o.lop)] = o;
      });
    }
    (dayThay || []).forEach(function (d) {
      if (d.trang_thai === 'huy' || d.ngay !== ngay) return;
      if (lopLoc && chuanLop(d.lop) !== chuanLop(lopLoc)) return;
      var k = khoa(d.buoi, d.tiet, d.lop), o = theo[k];
      if (!o) { o = { lop: d.lop, buoi: d.buoi, tiet: +d.tiet, mon: d.mon, gvEmail: '', gvNhan: '' }; ra.push(o); theo[k] = o; }
      o.gvGoc = o.gvNhan;
      o.gvEmail = String(d.gv_thay_email || '').toLowerCase();
      o.gvNhan = d.gv_thay_ten || d.gv_thay_nhan || '';
      o.thay = true;
      o.tuQuan = !o.gvEmail && !o.gvNhan;
    });
    return ra.sort(function (a, b) {
      return (a.buoi === b.buoi ? 0 : a.buoi === 'sang' ? -1 : 1) || a.tiet - b.tiet ||
        String(a.lop).localeCompare(String(b.lop), 'vi', { numeric: true });
    });
  }

  // ══════════════════════════════════════════════════════════════
  // KẾ HOẠCH DẠY HỌC → TÊN BÀI (thầy Chung chốt 5/10/2026, phương án a)
  // Bản tham khảo Bút Xanh (KNTT, Phụ lục CV 2345) — data/khdh/lopN.js, sinh bởi
  // quan-tri/sinh-khdh-sdb.py: SDB_KHDH['4']['toan'] = [[tiết PPCT, tuần, tên bài], …].
  // Ghép theo TUẦN: tiết thứ k của môn M trong tuần N (theo TKB, bỏ ngày nghỉ và tiết
  // đã ghi "không dạy" — các tiết sau tự lùi) ↔ tiết PPCT thứ k của tuần N.
  // Tuần 1 = cau_hinh 'sdb_tuan_1', mặc định thứ Hai đầu tiên từ 05/9 (QC1: 07/9/2026);
  // tuần cả thứ Hai–Sáu đều nghỉ (ngay_nghi) không đếm. Tên bài điền sẵn KHÔNG phải chữ ký:
  // tiết chỉ vào sổ khi giáo viên bấm xác nhận.
  // ══════════════════════════════════════════════════════════════
  var KHDH_V = '5318362a46';
  var DANG_NAP_KHDH = {};
  function napKhdh(khoi) {
    var kho = window.SDB_KHDH || {};
    if (!khoi) return Promise.resolve(null);
    if (kho[khoi]) return Promise.resolve(kho[khoi]);
    if (DANG_NAP_KHDH[khoi]) return DANG_NAP_KHDH[khoi];
    DANG_NAP_KHDH[khoi] = new Promise(function (xong) {
      var s = document.createElement('script');
      s.src = 'data/khdh/lop' + khoi + '.js?v=' + KHDH_V;
      s.onload = function () { xong((window.SDB_KHDH || {})[khoi] || null); };
      s.onerror = function () { delete DANG_NAP_KHDH[khoi]; xong(null); };
      document.head.appendChild(s);
    });
    return DANG_NAP_KHDH[khoi];
  }
  function khoiCua(lop) { var m = String(lop || '').match(/\d/); return m ? m[0] : ''; }
  // Tên môn trong thời khóa biểu (mỗi trường viết một kiểu) → mã môn của kế hoạch
  function maMon(mon) {
    var m = khongDau(mon).replace(/[^a-z&]/g, '');
    if (/^(tiengviet|tviet|tv)$/.test(m)) return 'tieng-viet';
    if (/^toan/.test(m)) return 'toan';
    if (/anh|ngoaingu|nngu/.test(m)) return 'ngoai-ngu-1';
    if (/daoduc|dduc/.test(m)) return 'dao-duc';
    if (/tnxh|tunhien/.test(m)) return 'tu-nhien-va-xa-hoi';
    if (/khoahoc/.test(m)) return 'khoa-hoc';
    if (/lsdl|ls&dl|lichsu|diali/.test(m)) return 'lich-su-va-dia-li';
    if (/tinhoc|^tin$/.test(m)) return 'tin-hoc';
    if (/congnghe|^cn$|^cnghe$/.test(m)) return 'cong-nghe';
    if (/amnhac|^nhac$/.test(m)) return 'am-nhac';
    if (/mythuat|mithuat|^mt$/.test(m)) return 'mi-thuat';
    if (/gdtc|thechat|theduc/.test(m)) return 'giao-duc-the-chat';
    if (/hdtn|trainghiem|chaoco|shl|sinhhoat|hdtt/.test(m)) return 'hoat-dong-trai-nghiem';
    return '';
  }
  var TUAN_1 = '', NGHI_NAM = {};
  function tuan1() {
    if (TUAN_1) return TUAN_1;
    var y = +(String(namHoc()).slice(0, 4)) || new Date().getFullYear(), d = y + '-09-05';
    while (thuCuaNgay(d) !== 2) d = congNgay(d, 1);
    return d;
  }
  function tuanNghiTron(thu2) {
    for (var i = 0; i < 5; i++) if (!NGHI_NAM[congNgay(thu2, i)]) return false;
    return true;
  }
  // Số tuần học của ngày (0 = trước tuần 1 hoặc tuần nghỉ trọn)
  function soTuan(ngay) {
    var t1 = tuan1(), m = thuHai(ngay);
    if (m < t1 || tuanNghiTron(m)) return 0;
    var n = 0;
    for (var x = t1; x <= m; x = congNgay(x, 7)) if (!tuanNghiTron(x)) n++;
    return n;
  }
  // dsNgay: [{ngay, khung, ghi, nghi}] các ngày của MỘT tuần (từ thứ Hai, theo thứ tự) → { 'ngay|khoá tiết': {ppct, ten} }
  function ganKeHoach(lop, dsNgay, kh) {
    var ra = {};
    if (!kh || !dsNgay.length) return ra;
    var n = soTuan(dsNgay[0].ngay), dem = {}, theoTuan = {};
    if (!n) return ra;
    dsNgay.forEach(function (d) {
      if (d.nghi) return;
      d.khung.filter(function (t) { return chuanLop(t.lop) === chuanLop(lop); }).forEach(function (t) {
        var id = maMon(t.mon), k = khoa(t.buoi, t.tiet, t.lop), r = d.ghi[k];
        if (!id || !kh[id]) return;
        if (r && r.tinh_trang === 'khong_day') return;
        if (!theoTuan[id]) theoTuan[id] = kh[id].filter(function (x) { return x[1] === n; });
        var i = dem[id] || 0;
        dem[id] = i + 1;
        var x = theoTuan[id][i];
        if (x) ra[d.ngay + '|' + k] = { ppct: x[0], ten: x[2] };
      });
    });
    return ra;
  }

  // Cấu hình dùng chung: giờ hết buổi — hạn "ghi trong buổi" (sql/83; mặc định 11:30 / 17:30),
  // mốc tuần 1 (sdb_tuan_1) và ngày nghỉ cả năm học (để bỏ tuần nghỉ Tết khi đếm tuần)
  var HET_BUOI = { sang: '11:30', chieu: '17:30' };
  var DA_DOC_GIO = false;
  function docGioHetBuoi() {
    if (DA_DOC_GIO || !may()) return Promise.resolve();
    var y = +(String(namHoc()).slice(0, 4)) || new Date().getFullYear();
    return Promise.all([
      may().from('cau_hinh').select('khoa, gia_tri').in('khoa', ['sdb_het_buoi_sang', 'sdb_het_buoi_chieu', 'sdb_tuan_1']),
      may().from('ngay_nghi').select('ngay, loai').gte('ngay', y + '-08-01').lte('ngay', (y + 1) + '-07-31')
    ]).then(function (kq) {
      DA_DOC_GIO = true;
      ((kq[0] && kq[0].data) || []).forEach(function (x) {
        var g = String(x.gia_tri || '').trim();
        if (x.khoa === 'sdb_tuan_1') { if (/^\d{4}-\d{2}-\d{2}$/.test(g)) TUAN_1 = thuHai(g); return; }
        if (!/^\d{1,2}:\d{2}$/.test(g)) return;
        HET_BUOI[x.khoa === 'sdb_het_buoi_sang' ? 'sang' : 'chieu'] = g;
      });
      ((kq[1] && !kq[1].error && kq[1].data) || []).forEach(function (x) { if (x.loai !== 'lam_bu') NGHI_NAM[x.ngay] = 1; });
    }, function () { DA_DOC_GIO = true; });
  }
  function hetBuoi(ngay, buoi) {
    var p = ngay.split('-'), g = HET_BUOI[buoi].split(':');
    return new Date(+p[0], +p[1] - 1, +p[2], +g[0], +g[1]);
  }
  function quaHan(ngay, buoi) { return new Date() > hetBuoi(ngay, buoi); }

  function chuLoi(e) {
    var m = String((e && (e.message || e.details)) || e || '');
    if (/đã chốt|Không ghi trước/.test(m)) return m.replace(/^.*?(Tuần|Không)/, '$1');
    if (/row-level security|violates row/i.test(m)) return 'Máy chủ không nhận: tiết này không thuộc thời khóa biểu, phân công hay dạy thay của thầy/cô.';
    if (/duplicate key|ux_sdb_tiet/i.test(m)) return 'Tiết này vừa có người ký — tải lại để xem.';
    if (laThieuBang(e)) return 'Cơ sở dữ liệu của trường chưa có Sổ đầu bài — người phụ trách hệ thống cần chạy sql/83-so-dau-bai.sql.';
    return 'Không lưu được: ' + m;
  }
  // Tiết PPCT lưu kèm: chỉ khi tên bài đúng như kế hoạch (dạy khác kế hoạch thì không gán số tiết)
  function ppctCua(kh, n, ten) { return kh && !n.khongDay && String(ten || '').trim() === kh.ten ? kh.ppct : null; }
  // Ghi vào sdb_tiet. Trường chưa chạy sql/84 (chưa có cột tiet_ppct) → ghi lại không có cột đó.
  function boPpct(rows) { return rows.map(function (x) { var y = Object.assign({}, x); delete y.tiet_ppct; return y; }); }
  function thieuCotPpct(kq) { return kq && kq.error && /tiet_ppct/.test(String(kq.error.message || '')); }
  function ghiThem(rows) {
    return may().from('sdb_tiet').insert(rows).select().then(function (kq) {
      return thieuCotPpct(kq) ? may().from('sdb_tiet').insert(boPpct(rows)).select() : kq;
    });
  }
  function ghiSua(id, row) {
    var o = { mon: row.mon, tinh_trang: row.tinh_trang, ten_bai: row.ten_bai, ghi_chu: row.ghi_chu, day_thay: row.day_thay, tiet_ppct: row.tiet_ppct };
    return may().from('sdb_tiet').update(o).eq('id', id).select().then(function (kq) {
      return thieuCotPpct(kq) ? may().from('sdb_tiet').update(boPpct([o])[0]).eq('id', id).select() : kq;
    });
  }
  function chipDong(r) {
    return (r.ghi_bu ? ' <span class="tkb-chip vang" title="Ký sau giờ hết buổi">ghi bù</span>' : '') +
      (r.sua_sau_han && !r.ghi_bu ? ' <span class="tkb-chip xam" title="Có sửa sau giờ hết buổi">đã sửa</span>' : '') +
      (r.day_thay ? ' <span class="tkb-chip xam">dạy thay</span>' : '');
  }
  function kyLuc(r, ngay) {
    var n = ngayCuaTs(r.ghi_luc);
    return gioPhut(r.ghi_luc) + (n && n !== ngay ? ' ' + ngayNgan(n) : '');
  }

  // ── Dữ liệu mẫu (chưa đăng nhập) — giữ trong trang, không lưu đi đâu ──
  var MAU = { ghi: [], chot: [], id: 1 };
  var MAU_TOI = 'Cô Lan';      // người xem thử "là" cô chủ nhiệm 1A của TKB mẫu

  // ══════════════════════════════════════════════════════════════
  // A. ĐIỀU HÀNH › GHI ĐẦU BÀI (giáo viên, điện thoại)
  // ══════════════════════════════════════════════════════════════
  var V = { ngay: homNayISO(), khoa: '', dangNap: false, loi: '', khung: [], ghi: {}, vang: {}, siSo: {}, goiY: {}, keHoach: {},
    nghi: null, nhap: {}, sua: {}, dangLuu: false, coTKB: true };
  var EL_V = null;

  function laCuaToi(t) {
    if (!may()) return t.gvNhan === MAU_TOI;
    var e = toiEmail();
    return !!e && t.gvEmail === e;
  }
  function napToi() {
    var ngay = V.ngay, k = ngay + '|' + toiEmail();
    V.khoa = k; V.dangNap = true; V.loi = '';
    var xong = function () { if (V.khoa === k) { V.dangNap = false; veToi(); } };
    if (!may()) {
      return tkbNgay(ngay).then(function (dl) {
        V.coTKB = !!dl; V.khung = khungNgay(dl, [], ngay); V.ghi = {}; V.vang = {}; V.siSo = {}; V.nghi = null;
        MAU.ghi.forEach(function (r) { if (r.ngay === ngay) V.ghi[khoa(r.buoi, r.tiet, r.lop)] = r; });
        V.goiY = goiYTu(MAU.ghi, ngay);
        return keHoachNgay(ngay, lopCuaToi()).then(function (kh) { if (V.khoa === k) V.keHoach = kh; });
      }).then(xong, xong);
    }
    return Promise.all([
      tkbNgay(ngay),
      may().from('day_thay').select('ngay, buoi, tiet, lop, mon, gv_thay_email, gv_thay_nhan, gv_thay_ten, trang_thai').eq('ngay', ngay).neq('trang_thai', 'huy'),
      may().from('sdb_tiet').select('*').eq('ngay', ngay).limit(2000),
      may().from('ngay_nghi').select('ngay, ten, loai').eq('ngay', ngay).limit(1),
      may().from('diem_danh_lop').select('lop, buoi, si_so, so_vang').eq('ngay', ngay),
      may().from('hs_vang').select('lop, buoi, phep, hoc_sinh_ma, hoc_sinh(ho_ten)').eq('ngay', ngay),
      docGioHetBuoi()
    ]).then(function (r) {
      if (V.khoa !== k) return;
      if (r[2].error) throw r[2].error;
      V.coTKB = !!r[0];
      V.khung = khungNgay(r[0], (r[1] && r[1].data) || [], ngay);
      V.ghi = {};
      (r[2].data || []).forEach(function (x) { V.ghi[khoa(x.buoi, x.tiet, x.lop)] = x; });
      var n = r[3] && !r[3].error && (r[3].data || [])[0];
      V.nghi = n && n.loai !== 'lam_bu' ? n : null;
      V.siSo = {}; V.vang = {};
      ((r[4] && r[4].data) || []).forEach(function (x) { V.siSo[x.buoi + '|' + chuanLop(x.lop)] = x; });
      ((r[5] && !r[5].error && r[5].data) || []).forEach(function (x) {
        var kk = x.buoi + '|' + chuanLop(x.lop);
        (V.vang[kk] = V.vang[kk] || []).push({ ten: (x.hoc_sinh && x.hoc_sinh.ho_ten) || x.hoc_sinh_ma, phep: x.phep });
      });
      // Gợi ý tên bài: kế hoạch dạy học của tuần (điền sẵn) + các bài đã ghi gần đây của đúng lớp + môn
      var dsLop = lopCuaToi();
      if (!dsLop.length) { V.goiY = {}; V.keHoach = {}; return; }
      return Promise.all([
        may().from('sdb_tiet').select('ngay, buoi, tiet, lop, mon, ten_bai, tinh_trang')
          .in('lop', dsLop).gte('ngay', congNgay(ngay, -35)).lte('ngay', ngay)
          .order('ngay', { ascending: false }).limit(800),
        keHoachNgay(ngay, dsLop)
      ]).then(function (g) {
        if (V.khoa !== k) return;
        V.goiY = goiYTu((g[0] && g[0].data) || [], ngay);
        V.keHoach = g[1] || {};
      });
    }).catch(function (e) { if (V.khoa === k) V.loi = chuLoi(e); }).then(xong);
  }
  function lopCuaToi() {
    var lop = {};
    V.khung.forEach(function (t) { if (laCuaToi(t)) lop[t.lop] = 1; });
    return Object.keys(lop);
  }
  // Kế hoạch của MỘT ngày cho các lớp: cần cả các ngày trước đó trong tuần (đếm tiết thứ k của môn)
  // → { 'buoi|tiet|LỚP': {ppct, ten} }
  function keHoachNgay(ngay, dsLop) {
    if (!dsLop.length) return Promise.resolve({});
    var t2 = thuHai(ngay), ngays = [];
    for (var x = t2; x <= ngay; x = congNgay(x, 1)) ngays.push(x);
    var khoi = {};
    dsLop.forEach(function (l) { if (khoiCua(l)) khoi[khoiCua(l)] = 1; });
    return Promise.all([
      Promise.all(ngays.map(function (n) { return tkbNgay(n).catch(function () { return null; }); })),
      may() ? may().from('sdb_tiet').select('ngay, buoi, tiet, lop, tinh_trang').in('lop', dsLop).gte('ngay', t2).lte('ngay', ngay)
        : Promise.resolve({ data: MAU.ghi.filter(function (g) { return g.ngay >= t2 && g.ngay <= ngay; }) }),
      Promise.all(Object.keys(khoi).map(napKhdh))
    ]).then(function (kq) {
      var ra = {}, ghiTuan = (kq[1] && kq[1].data) || [];
      dsLop.forEach(function (lop) {
        var kh = (window.SDB_KHDH || {})[khoiCua(lop)];
        var dsNgay = ngays.map(function (n, i) {
          var ghi = {};
          ghiTuan.forEach(function (g) { if (g.ngay === n && chuanLop(g.lop) === chuanLop(lop)) ghi[khoa(g.buoi, g.tiet, g.lop)] = g; });
          return { ngay: n, khung: khungNgay(kq[0][i], [], n, lop), ghi: ghi, nghi: !!NGHI_NAM[n] };
        });
        var g = ganKeHoach(lop, dsNgay, kh);
        Object.keys(g).forEach(function (kk) { if (kk.indexOf(ngay + '|') === 0) ra[kk.slice(ngay.length + 1)] = g[kk]; });
      });
      return ra;
    }, function () { return {}; });
  }
  // goiY['LOP|mon'] = [tên bài mới nhất trước, …] (không tính tiết đang ghi của chính ngày đó sau nó)
  function goiYTu(ds, ngay) {
    var ra = {};
    ds.slice().sort(function (a, b) {
      return a.ngay < b.ngay ? 1 : a.ngay > b.ngay ? -1 : (a.buoi === b.buoi ? b.tiet - a.tiet : a.buoi === 'chieu' ? -1 : 1);
    }).forEach(function (x) {
      if (x.tinh_trang === 'khong_day' || !x.ten_bai) return;
      var k = chuanLop(x.lop) + '|' + chuanMon(x.mon), m = ra[k] = ra[k] || [];
      if (m.indexOf(x.ten_bai) < 0 && m.length < 5) m.push(x.ten_bai);
    });
    return ra;
  }
  // "Bài 12 … (Tiết 1)" → "Bài 12 … (Tiết 2)": gợi ý tiết kế tiếp của cùng bài
  function tiepTheo(ten) {
    var m = String(ten || '').match(/^(.*?(?:tiết|Tiết|TIẾT)\s*)(\d+)(\D*)$/);
    return m ? m[1] + (+m[2] + 1) + m[3] : '';
  }

  function veToi() {
    var el = EL_V;
    if (!el || !document.body.contains(el)) return;
    var ngay = V.ngay, hn = homNayISO();
    var dau = '<div class="sdb-dau">' +
      '<div class="sdb-ngay-chon">' +
      '<button type="button" class="dh-nut-nho" data-sdb="lui" aria-label="Ngày trước">‹</button>' +
      '<label><span>' + thoat(TEN_THU[thuCuaNgay(ngay)]) + '</span>' +
      '<input type="date" class="dh-o-nhap" data-sdb="ngay" value="' + ngay + '" max="' + hn + '" min="' + congNgay(hn, -30) + '"></label>' +
      '<button type="button" class="dh-nut-nho" data-sdb="toi"' + (ngay >= hn ? ' disabled' : '') + ' aria-label="Ngày sau">›</button>' +
      (ngay !== hn ? '<button type="button" class="dh-nut-nho" data-sdb="homnay">Hôm nay</button>' : '') +
      '</div>' +
      '<div class="sdb-chu-dau">Tiết của tôi theo thời khóa biểu và dạy thay. Gõ tên bài rồi bấm <b>Lưu</b> — chữ ký và giờ ký app tự ghi. ' +
      'Hạn ghi: trong buổi (sáng đến ' + thoat(HET_BUOI.sang) + ', chiều đến ' + thoat(HET_BUOI.chieu) + '); quá hạn vẫn ghi được, sổ đánh dấu <i>ghi bù</i>.</div>' +
      '</div>';
    if (!may()) dau = '<div class="hd-kiem vang">🧪 <b>Xem thử</b> — thầy/cô đang xem với vai "' + thoat(MAU_TOI) + '" (chủ nhiệm 1A) của thời khóa biểu mẫu. Bấm Lưu chỉ giữ trong trang.</div>' + dau;
    if (V.dangNap && !V.khung.length) { el.innerHTML = dau + '<div class="the-thong-bao">Đang tải các tiết…</div>'; return; }
    if (V.loi) { el.innerHTML = dau + '<div class="hd-kiem do">⚠ ' + thoat(V.loi) + '</div>'; return; }
    var than = '';
    if (thuCuaNgay(ngay) === 8) than = '<div class="the-thong-bao">Chủ nhật — không có tiết học.</div>';
    else if (V.nghi) than = '<div class="hd-kiem xanh">📌 ' + ngayVN(ngay) + ' là ngày nghỉ: <b>' + thoat(V.nghi.ten || 'Nghỉ') + '</b> — không phải ghi sổ.</div>';
    else if (!V.coTKB) than = '<div class="hd-kiem vang">Trường chưa công bố thời khóa biểu áp dụng cho ngày này — chưa có khung tiết để ghi.</div>';
    else {
      var cua = V.khung.filter(laCuaToi);
      if (!cua.length) {
        than = '<div class="the-thong-bao">Ngày ' + ngayVN(ngay) + ' thầy/cô không có tiết nào theo thời khóa biểu. ' +
          'Tiết được phân dạy thay sẽ tự hiện ở đây.</div>';
      } else {
        ['sang', 'chieu'].forEach(function (b) {
          var ds = cua.filter(function (t) { return t.buoi === b; });
          if (ds.length) than += veBuoiToi(b, ds);
        });
      }
    }
    el.innerHTML = dau + than + (laQT() && may() && V.coTKB && !V.nghi && thuCuaNgay(ngay) !== 8 ? veTinhHinh() : '');
  }

  function veBuoiToi(b, ds) {
    var qua = quaHan(V.ngay, b), chua = ds.filter(function (t) { return !V.ghi[khoa(t.buoi, t.tiet, t.lop)]; }).length;
    var html = '<div class="sdb-buoi">' +
      '<div class="sdb-buoi-dau"><b>' + TEN_BUOI[b] + '</b>' +
      '<span class="tkb-chip ' + (chua ? (qua ? 'vang' : 'xam') : 'xanh') + '">' +
      (chua ? (qua ? 'quá giờ ' + thoat(HET_BUOI[b]) + ' · còn ' + chua + ' tiết' : 'hạn ' + thoat(HET_BUOI[b]) + ' · còn ' + chua + ' tiết') : '✓ đã ghi đủ') + '</span></div>';
    ds.forEach(function (t) { html += veTietToi(t, qua); });
    var coNhap = ds.some(function (t) { var k = khoa(t.buoi, t.tiet, t.lop); return (V.sua[k] || !V.ghi[k]) && !t.tuQuan; });
    if (coNhap) {
      html += '<button type="button" class="sdb-nut-luu" data-sdb="luu" data-buoi="' + b + '"' + (V.dangLuu ? ' disabled' : '') + '>' +
        (V.dangLuu ? 'Đang lưu…' : '✓ Xác nhận đã dạy · ' + (b === 'sang' ? 'buổi sáng' : 'buổi chiều')) + '</button>' +
        '<div class="sdb-chu-dau">Tên bài điền sẵn theo kế hoạch dạy học. Tiết nào dạy khác thì sửa hoặc tích "không dạy" trước khi xác nhận.</div>';
    }
    return html + '</div>';
  }

  function veVang(lop, b) {
    var ss = V.siSo[b + '|' + chuanLop(lop)], ds = V.vang[b + '|' + chuanLop(lop)] || [];
    if (!ss && !ds.length) return '<div class="sdb-vang mo">Chưa điểm danh buổi này.</div>';
    var ten = ds.map(function (h) { return thoat(h.ten) + (h.phep === 'co_phep' ? ' (P)' : h.phep === 'khong_phep' ? ' (K)' : ''); }).join(', ');
    return '<div class="sdb-vang">Vắng ' + (ss ? ss.so_vang + '/' + ss.si_so : ds.length) + (ten ? ': ' + ten : '') + '</div>';
  }

  function veTietToi(t, qua) {
    var k = khoa(t.buoi, t.tiet, t.lop), r = V.ghi[k], dangSua = !!V.sua[k];
    var dau = '<div class="sdb-tiet-dau"><span class="sdb-ki">' + kiHieu(t.buoi, t.tiet) + '</span>' +
      '<b>' + thoat(t.lop) + '</b> · ' + thoat(t.mon) +
      (t.thay ? ' <span class="tkb-chip xam">dạy thay' + (t.gvGoc ? ' ' + thoat(t.gvGoc) : '') + '</span>' : '') + '</div>';
    if (r && !dangSua) {
      var cuaToi = !may() || String(r.gv_email || '').toLowerCase() === toiEmail();
      return '<div class="sdb-tiet da">' + dau +
        '<div class="sdb-bai">' + (r.tinh_trang === 'khong_day' ? '<i>Không dạy</i>' + (r.ghi_chu ? ' — ' + thoat(r.ghi_chu) : '') : '✓ ' + thoat(r.ten_bai)) + '</div>' +
        (r.tinh_trang !== 'khong_day' && r.ghi_chu ? '<div class="sdb-ghi-chu">' + thoat(r.ghi_chu) + '</div>' : '') +
        '<div class="sdb-ky">Ký: ' + thoat(r.gv_ten || r.gv_email || '') + ' · ' + kyLuc(r, V.ngay) + chipDong(r) +
        (cuaToi ? ' <button type="button" class="sdb-sua" data-sdb="sua" data-k="' + thoat(k) + '">Sửa</button>' : '') + '</div>' +
        veVang(t.lop, t.buoi) + '</div>';
    }
    var kh = V.keHoach[k];
    var n = V.nhap[k] || (r ? { ten: r.ten_bai || '', ghiChu: r.ghi_chu || '', khongDay: r.tinh_trang === 'khong_day' } : { ten: kh ? kh.ten : '', ghiChu: '', khongDay: false });
    V.nhap[k] = n;
    var theoKH = kh && !n.khongDay && String(n.ten).trim() === kh.ten;
    var gy = V.goiY[chuanLop(t.lop) + '|' + chuanMon(t.mon)] || [];
    var tiep = gy.length ? tiepTheo(gy[0]) : '';
    var chip = '';
    if (!n.khongDay) {
      if (tiep && tiep !== n.ten) chip += '<button type="button" class="chip-loc" data-sdb="dien" data-k="' + thoat(k) + '" data-v="' + thoat(tiep) + '">↻ ' + thoat(tiep) + '</button>';
      gy.slice(0, 3).forEach(function (g) {
        if (g !== n.ten) chip += '<button type="button" class="chip-loc" data-sdb="dien" data-k="' + thoat(k) + '" data-v="' + thoat(g) + '">' + thoat(g) + '</button>';
      });
    }
    return '<div class="sdb-tiet' + (qua ? ' tre' : '') + '">' + dau +
      (n.khongDay
        ? '<select class="dh-o-nhap" data-sdb-o="ghiChu" data-k="' + thoat(k) + '">' +
          LY_DO_KHONG_DAY.map(function (l) { return '<option' + (n.ghiChu === l ? ' selected' : '') + '>' + thoat(l) + '</option>'; }).join('') + '</select>'
        : '<input class="dh-o-nhap sdb-o-bai" data-sdb-o="ten" data-k="' + thoat(k) + '" value="' + thoat(n.ten) + '" maxlength="300" ' +
          'placeholder="' + thoat(gy.length ? 'Lần trước: ' + gy[0] : 'Tên bài dạy (VD: Bài 5. Phép cộng – tiết 1)') + '" enterkeyhint="done">') +
      (kh && !n.khongDay ? '<div class="sdb-kh-nhan">' + (theoKH ? '📘 Theo kế hoạch · tiết PPCT ' + kh.ppct
        : '<button type="button" class="chip-loc" data-sdb="dien" data-k="' + thoat(k) + '" data-v="' + thoat(kh.ten) + '">📘 Kế hoạch: ' + thoat(kh.ten) + '</button>') + '</div>' : '') +
      (chip && !theoKH ? '<div class="sdb-goi-y">' + chip + '</div>' : '') +
      (n.khongDay ? '' : '<input class="dh-o-nhap sdb-o-chu" data-sdb-o="ghiChu" data-k="' + thoat(k) + '" value="' + thoat(n.ghiChu) + '" maxlength="500" placeholder="Ghi chú (không bắt buộc)" list="sdb-ghi-chu-nhanh">') +
      '<label class="sdb-khong-day"><input type="checkbox" data-sdb-o="khongDay" data-k="' + thoat(k) + '"' + (n.khongDay ? ' checked' : '') + '> Tiết này không dạy</label>' +
      (dangSua ? ' <button type="button" class="sdb-sua" data-sdb="boSua" data-k="' + thoat(k) + '">Thôi sửa</button>' : '') +
      veVang(t.lop, t.buoi) + '</div>';
  }

  // BGH: tình hình ghi sổ toàn trường của ngày đang xem
  function veTinhHinh() {
    var lop = {};
    V.khung.forEach(function (t) {
      var x = lop[t.lop] = lop[t.lop] || { lop: t.lop, phai: 0, da: 0, tre: 0 };
      if (t.tuQuan) return;
      x.phai++;
      if (V.ghi[khoa(t.buoi, t.tiet, t.lop)]) x.da++;
      else if (quaHan(V.ngay, t.buoi)) x.tre++;
    });
    var ds = Object.keys(lop).map(function (l) { return lop[l]; })
      .sort(function (a, b) { return (b.tre - a.tre) || String(a.lop).localeCompare(String(b.lop), 'vi', { numeric: true }); });
    if (!ds.length) return '';
    var phai = 0, da = 0;
    ds.forEach(function (x) { phai += x.phai; da += x.da; });
    return '<div class="dh-tieu-de" style="margin-top:24px">Tình hình ghi sổ toàn trường · ' + ngayVN(V.ngay) + '</div>' +
      '<div class="sdb-tong">Đã ký <b>' + da + '/' + phai + '</b> tiết (' + (phai ? Math.round(da * 100 / phai) : 0) + '%). Bấm một lớp để mở sổ tuần.</div>' +
      '<div class="sdb-luoi-lop">' + ds.map(function (x) {
        var mau = x.da >= x.phai ? 'xanh' : x.tre ? 'do' : 'xam';
        return '<button type="button" class="sdb-o-lop ' + mau + '" data-sdb="moLop" data-lop="' + thoat(x.lop) + '"><b>' + thoat(x.lop) + '</b><span>' + x.da + '/' + x.phai + '</span></button>';
      }).join('') + '</div>';
  }

  function luuBuoi(b) {
    if (V.dangLuu) return;
    var them = [], sua = [];
    V.khung.filter(function (t) { return laCuaToi(t) && t.buoi === b && !t.tuQuan; }).forEach(function (t) {
      var k = khoa(t.buoi, t.tiet, t.lop), cu = V.ghi[k];
      if (cu && !V.sua[k]) return;
      var n = V.nhap[k];
      if (!n) return;
      var ten = String(n.ten || '').trim(), ghi = String(n.ghiChu || '').trim();
      if (n.khongDay && !ghi) ghi = LY_DO_KHONG_DAY[0];
      if (!n.khongDay && !ten) return;
      // Mọi dòng cùng MỘT bộ cột (bài học sổ dự án 124: upsert nhiều dòng thiếu cột → NULL)
      var row = { nam_hoc: namHoc(), ngay: V.ngay, buoi: t.buoi, tiet: t.tiet, lop: t.lop, mon: t.mon,
        tinh_trang: n.khongDay ? 'khong_day' : 'da_day', ten_bai: n.khongDay ? null : ten, ghi_chu: ghi || null, day_thay: !!t.thay,
        tiet_ppct: ppctCua(V.keHoach[k], n, ten) };
      if (cu) sua.push({ id: cu.id, k: k, row: row }); else them.push({ k: k, row: row });
    });
    if (!them.length && !sua.length) { bao('Chưa có tiết nào điền tên bài.'); return; }
    if (!may()) {
      var bayGio = new Date().toISOString();
      them.forEach(function (x) {
        var r = Object.assign({ id: MAU.id++, gv_ten: MAU_TOI, gv_email: '', ghi_luc: bayGio, sua_luc: bayGio, ghi_bu: quaHan(V.ngay, b), sua_sau_han: false }, x.row);
        MAU.ghi.push(r); V.ghi[x.k] = r;
      });
      sua.forEach(function (x) { Object.assign(V.ghi[x.k], x.row, { sua_luc: bayGio }); delete V.sua[x.k]; });
      them.concat(sua).forEach(function (x) { delete V.nhap[x.k]; });
      V.goiY = goiYTu(MAU.ghi, V.ngay);
      bao('Đã lưu ' + (them.length + sua.length) + ' tiết (xem thử — không gửi đi đâu).');
      veToi(); return;
    }
    V.dangLuu = true; veToi();
    var viec = [];
    if (them.length) viec.push(ghiThem(them.map(function (x) { return x.row; })));
    sua.forEach(function (x) {
      var row = Object.assign({}, x.row);
      viec.push(ghiSua(x.id, row));
    });
    Promise.all(viec).then(function (kq) {
      var loi = kq.filter(function (r) { return r.error; })[0];
      var so = 0;
      kq.forEach(function (r) {
        (r.data || []).forEach(function (x) {
          var k = khoa(x.buoi, x.tiet, x.lop);
          V.ghi[k] = x; delete V.nhap[k]; delete V.sua[k]; so++;
        });
      });
      if (loi) bao(chuLoi(loi.error));
      else bao('Đã lưu ' + so + ' tiết vào sổ đầu bài.');
    }, function (e) { bao(chuLoi(e)); }).then(function () { V.dangLuu = false; veToi(); });
  }

  function batSuKienToi(el) {
    if (el.getAttribute('data-sdb-gan')) return;
    el.setAttribute('data-sdb-gan', '1');
    el.addEventListener('click', function (e) {
      var a = e.target.closest ? e.target.closest('[data-sdb]') : null;
      if (!a || a.tagName === 'INPUT') return;
      var v = a.getAttribute('data-sdb'), k = a.getAttribute('data-k');
      if (v === 'lui' || v === 'toi' || v === 'homnay') {
        var moi = v === 'homnay' ? homNayISO() : congNgay(V.ngay, v === 'lui' ? -1 : 1);
        if (moi > homNayISO()) return;
        V.ngay = moi; V.nhap = {}; V.sua = {}; V.khung = []; napToi(); veToi();
      } else if (v === 'luu') luuBuoi(a.getAttribute('data-buoi'));
      else if (v === 'sua') { V.sua[k] = true; delete V.nhap[k]; veToi(); }
      else if (v === 'boSua') { delete V.sua[k]; delete V.nhap[k]; veToi(); }
      else if (v === 'dien') {
        V.nhap[k] = V.nhap[k] || { ten: '', ghiChu: '', khongDay: false };
        V.nhap[k].ten = a.getAttribute('data-v') || '';
        veToi();
        var o = el.querySelector('[data-sdb-o="ten"][data-k="' + k.replace(/"/g, '\\"') + '"]');
        if (o) { o.focus(); try { o.setSelectionRange(o.value.length, o.value.length); } catch (x) { /* bỏ qua */ } }
      } else if (v === 'moLop') moLop(a.getAttribute('data-lop'));
    });
    el.addEventListener('input', function (e) {
      var o = e.target, f = o.getAttribute && o.getAttribute('data-sdb-o');
      if (!f) return;
      var k = o.getAttribute('data-k');
      V.nhap[k] = V.nhap[k] || { ten: '', ghiChu: '', khongDay: false };
      if (f === 'khongDay') { V.nhap[k].khongDay = o.checked; V.nhap[k].ghiChu = o.checked ? LY_DO_KHONG_DAY[0] : ''; veToi(); }
      else V.nhap[k][f] = o.value;
    });
    el.addEventListener('change', function (e) {
      var o = e.target;
      if (o.getAttribute && o.getAttribute('data-sdb') === 'ngay' && o.value) {
        var moi = o.value > homNayISO() ? homNayISO() : o.value;
        V.ngay = moi; V.nhap = {}; V.sua = {}; V.khung = []; napToi(); veToi();
      } else if (o.getAttribute && o.getAttribute('data-sdb-o') === 'ghiChu' && o.tagName === 'SELECT') {
        var k = o.getAttribute('data-k'); V.nhap[k] = V.nhap[k] || { ten: '', khongDay: true }; V.nhap[k].ghiChu = o.value;
      }
    });
  }

  // dieu-hanh.js gọi khi mở thẻ "Ghi đầu bài"
  function ganGhiChuNhanh() {
    if (document.getElementById('sdb-ghi-chu-nhanh')) return;
    var dl = document.createElement('datalist'); dl.id = 'sdb-ghi-chu-nhanh';
    dl.innerHTML = GHI_CHU_NHANH.map(function (g) { return '<option value="' + thoat(g) + '">'; }).join('');
    document.body.appendChild(dl);
  }
  function veDieuHanh(el) {
    if (!el) return;
    EL_V = el;
    ganGhiChuNhanh();
    batSuKienToi(el);
    var k = V.ngay + '|' + toiEmail();
    if (V.khoa !== k && !V.dangNap) napToi();
    veToi();
  }

  // ══════════════════════════════════════════════════════════════
  // B. LỚP HỌC › SỔ ĐẦU BÀI (sổ tuần của một lớp)
  // ══════════════════════════════════════════════════════════════
  var L = { keHoach: {}, khoiTao: false, dangNap: false, loi: '', dsLop: [], lopCN: [], lop: '', lopMuon: '', tuan: thuHai(homNayISO()),
    ngay: [], chot: [], khoa: '', dangLuu: false, mo: null, nhap: {} };
  var EL_L = null;

  function napDsLop() {
    var nam = namHoc();
    if (!may()) {
      var dl = window.TKB_XEM ? window.TKB_XEM.duLieuMau() : { tiet: [] }, co = {};
      dl.tiet.forEach(function (x) { co[x.lop] = 1; });
      L.dsLop = Object.keys(co).sort(function (a, b) { return a.localeCompare(b, 'vi', { numeric: true }); });
      L.lopCN = ['1A'];
      return Promise.resolve();
    }
    var uid = (window.NGUOI_DUNG || {}).id;
    return Promise.all([
      may().from('lop_hoc').select('lop, khoi').eq('nam_hoc', nam).order('khoi').order('lop'),
      uid ? may().from('phan_cong_day').select('lop, la_chu_nhiem').eq('nam_hoc', nam).eq('nguoi_dung_id', uid) : Promise.resolve({ data: [] }),
      tkbNgay(homNayISO()).catch(function () { return null; })
    ]).then(function (r) {
      var tat = ((r[0] && r[0].data) || []).map(function (x) { return x.lop; });
      var pc = (r[1] && r[1].data) || [];
      L.lopCN = pc.filter(function (x) { return x.la_chu_nhiem; }).map(function (x) { return x.lop; });
      if (laQT()) L.dsLop = tat;
      else {
        var co = {};
        pc.forEach(function (x) { co[chuanLop(x.lop)] = x.lop; });
        var e = toiEmail();
        ((r[2] && r[2].tiet) || []).forEach(function (x) { if (e && String(x.gv_email || '').toLowerCase() === e) co[chuanLop(x.lop)] = co[chuanLop(x.lop)] || x.lop; });
        L.dsLop = Object.keys(co).map(function (k) { return co[k]; });
      }
      L.dsLop.sort(function (a, b) { return String(a).localeCompare(String(b), 'vi', { numeric: true }); });
    });
  }

  function napTuan() {
    var lop = L.lop, tu = L.tuan, den = congNgay(tu, 6), k = lop + '|' + tu;
    L.khoa = k; L.dangNap = true; L.loi = '';
    var ngays = [0, 1, 2, 3, 4, 5].map(function (i) { return congNgay(tu, i); });
    var xong = function () { if (L.khoa === k) { L.dangNap = false; veLop(); } };
    if (!lop) { L.ngay = []; L.dangNap = false; veLop(); return Promise.resolve(); }
    if (!may()) {
      return Promise.all([tkbNgay(tu), napKhdh(khoiCua(lop))]).then(function (kq0) {
        var dl = kq0[0];
        L.ngay = ngays.map(function (n) {
          var ghi = {};
          MAU.ghi.forEach(function (r) { if (r.ngay === n && chuanLop(r.lop) === chuanLop(lop)) ghi[khoa(r.buoi, r.tiet, r.lop)] = r; });
          return { ngay: n, khung: khungNgay(dl, [], n, lop), ghi: ghi, nghi: null, siSo: {}, vang: {} };
        });
        L.chot = MAU.chot.filter(function (c) { return chuanLop(c.lop) === chuanLop(lop); });
      }).then(xong, xong);
    }
    return Promise.all([
      Promise.all(ngays.map(function (n) { return tkbNgay(n).catch(function () { return null; }); })),
      may().from('day_thay').select('ngay, buoi, tiet, lop, mon, gv_thay_email, gv_thay_nhan, gv_thay_ten, trang_thai')
        .gte('ngay', tu).lte('ngay', den).eq('lop', lop).neq('trang_thai', 'huy'),
      may().from('sdb_tiet').select('*').eq('lop', lop).gte('ngay', tu).lte('ngay', den).limit(500),
      may().from('ngay_nghi').select('ngay, ten, loai').gte('ngay', tu).lte('ngay', den),
      may().from('diem_danh_lop').select('ngay, buoi, si_so, so_vang').eq('lop', lop).gte('ngay', tu).lte('ngay', den),
      may().from('hs_vang').select('ngay, buoi, phep, hoc_sinh_ma, hoc_sinh(ho_ten)').eq('lop', lop).gte('ngay', tu).lte('ngay', den),
      may().from('sdb_chot').select('*').eq('nam_hoc', namHoc()).eq('lop', lop).order('tu_ngay'),
      docGioHetBuoi(),
      napKhdh(khoiCua(lop))
    ]).then(function (r) {
      if (L.khoa !== k) return;
      if (r[2].error) throw r[2].error;
      if (r[6].error) throw r[6].error;
      var dt = (r[1] && r[1].data) || [];
      L.ngay = ngays.map(function (n, i) {
        var o = { ngay: n, khung: khungNgay(r[0][i], dt, n, lop), ghi: {}, nghi: null, siSo: {}, vang: {} };
        (r[2].data || []).forEach(function (x) { if (x.ngay === n) o.ghi[khoa(x.buoi, x.tiet, x.lop)] = x; });
        ((r[3] && !r[3].error && r[3].data) || []).forEach(function (x) { if (x.ngay === n && x.loai !== 'lam_bu') o.nghi = x; });
        ((r[4] && r[4].data) || []).forEach(function (x) { if (x.ngay === n) o.siSo[x.buoi] = x; });
        ((r[5] && !r[5].error && r[5].data) || []).forEach(function (x) {
          if (x.ngay === n) (o.vang[x.buoi] = o.vang[x.buoi] || []).push({ ten: (x.hoc_sinh && x.hoc_sinh.ho_ten) || x.hoc_sinh_ma, phep: x.phep });
        });
        return o;
      });
      L.chot = r[6].data || [];
    }).catch(function (e) { if (L.khoa === k) L.loi = chuLoi(e); }).then(xong);
  }

  function chotPhu(ngay, loai) {
    return L.chot.filter(function (c) { return (!loai || c.loai === loai) && ngay >= c.tu_ngay && ngay <= c.den_ngay; })[0] || null;
  }
  function laCN() { return !may() ? true : L.lopCN.some(function (l) { return chuanLop(l) === chuanLop(L.lop); }); }

  // Số tiết phải ghi / đã ghi của tuần (bỏ ngày nghỉ, tiết lớp tự quản)
  function demTuan() {
    var phai = 0, da = 0, thieu = [];
    L.ngay.forEach(function (d) {
      var co = {};
      Object.keys(d.ghi).forEach(function (k) { co[k] = 1; });
      if (!d.nghi) {
        d.khung.forEach(function (t) {
          if (t.tuQuan) return;
          var k = khoa(t.buoi, t.tiet, t.lop);
          phai++;
          if (d.ghi[k]) da++;
          else if (d.ngay < homNayISO() || (d.ngay === homNayISO() && quaHan(d.ngay, t.buoi))) thieu.push(ngayNgan(d.ngay) + ' ' + kiHieu(t.buoi, t.tiet));
        });
      }
    });
    return { phai: phai, da: da, thieu: thieu };
  }

  function veLop() {
    var el = EL_L;
    if (!el) return;
    var dau = (window.LOP_HOC_THE ? window.LOP_HOC_THE('sodaubai') : '') +
      '<div class="sdb-trang"><div class="sdb-lop-dau"><h2>Sổ ghi đầu bài</h2>' +
      '<div class="sdb-chon">' +
      (L.dsLop.length ? '<label><span>Lớp</span><select class="dh-o-nhap" data-sdbl="lop">' + L.dsLop.map(function (l) {
        return '<option value="' + thoat(l) + '"' + (chuanLop(l) === chuanLop(L.lop) ? ' selected' : '') + '>' + thoat(l) + '</option>';
      }).join('') + '</select></label>' : '') +
      '<div class="sdb-ngay-chon"><button type="button" class="dh-nut-nho" data-sdbl="lui" aria-label="Tuần trước">‹</button>' +
      '<span class="sdb-tuan-chu">Tuần ' + ngayNgan(L.tuan) + ' – ' + ngayNgan(congNgay(L.tuan, 5)) + '</span>' +
      '<button type="button" class="dh-nut-nho" data-sdbl="toi" aria-label="Tuần sau"' + (L.tuan >= thuHai(homNayISO()) ? ' disabled' : '') + '>›</button>' +
      (L.tuan !== thuHai(homNayISO()) ? '<button type="button" class="dh-nut-nho" data-sdbl="nay">Tuần này</button>' : '') +
      '</div></div></div>';
    if (!may()) dau += '<div class="hd-kiem vang">🧪 <b>Xem thử</b> — thời khóa biểu và tên người là dữ liệu mẫu; ghi thử chỉ giữ trong trang.</div>';
    dau += '<div class="sdb-huong-dan">✍ <b>Cách ghi:</b> tên bài <span class="sdb-kh">in mờ</span> là bài <b>theo kế hoạch dạy học</b>, chưa phải chữ ký. ' +
      'Dạy đúng kế hoạch: bấm <b>✓ Xác nhận</b> ở ô buổi — ký cả buổi một lần. Dạy khác: bấm <b>✍ Ghi</b> cuối dòng để sửa tên bài. ' +
      'Trên điện thoại: <a href="#" data-sdbl="dieuHanh">Điều hành › 📖 Ghi đầu bài</a>.</div>';
    if (!L.khoiTao || (L.dangNap && !L.ngay.length)) { el.innerHTML = dau + '<div class="the-thong-bao">Đang tải sổ…</div></div>'; return; }
    if (!L.dsLop.length) {
      el.innerHTML = dau + '<div class="the-thong-bao">Thầy/cô chưa chủ nhiệm hay dạy lớp nào trong thời khóa biểu năm học ' + thoat(namHoc()) + ', nên chưa có sổ để xem.</div></div>';
      return;
    }
    if (L.loi) { el.innerHTML = dau + '<div class="hd-kiem do">⚠ ' + thoat(L.loi) + '</div></div>'; return; }
    var d = demTuan();
    var chotT = chotPhu(congNgay(L.tuan, 2), 'tuan');
    var tom = '<div class="sdb-tong">Đã ký <b>' + d.da + '/' + d.phai + '</b> tiết trong tuần' +
      (d.thieu.length ? ' · <span class="sdb-do">quá hạn chưa ghi ' + d.thieu.length + ' tiết: ' + thoat(d.thieu.slice(0, 8).join(', ')) + (d.thieu.length > 8 ? '…' : '') + '</span>' : '') +
      ' <button type="button" class="dh-nut-nho sdb-in" data-sdbl="in" title="Tải tệp Word sổ tuần này — một trang A4 dọc">📄 Tải Sổ đầu bài</button></div>';
    L.keHoach = ganKeHoach(L.lop, L.ngay, (window.SDB_KHDH || {})[khoiCua(L.lop)]);
    var tuanSo = soTuan(L.tuan);
    tom = '<div class="sdb-tuan-so">' + (tuanSo ? 'TUẦN ' + tuanSo : 'Ngoài tuần học') + '</div>' + tom;
    el.innerHTML = dau + tom + veBangTuan(false) + veChotTuan(chotT, d) + veKyThang() + '</div>';
  }

  // ── SỔ TUẦN KIỂU LỊCH BÁO GIẢNG (5/10/2026, thầy Chung: "giống Lịch báo giảng", học bố cục vnEdu) ──
  // MỘT bảng cả tuần: Thứ, ngày | Buổi | HS vắng | Tiết | Môn | Tiết PPCT | Tên bài · ghi chú | Giáo viên ký | (thao tác)
  // Ô chưa ký: hiện mờ tên bài THEO KẾ HOẠCH (chỉ trên màn hình, bản in để trống) — không ghi chữ trạng thái vào từng dòng.
  function dongCuaNgay(d) {
    var dong = {};
    d.khung.forEach(function (t) { dong[khoa(t.buoi, t.tiet, t.lop)] = { t: t }; });
    Object.keys(d.ghi).forEach(function (k) {
      var r = d.ghi[k];
      if (!dong[k]) dong[k] = { t: { lop: r.lop, buoi: r.buoi, tiet: r.tiet, mon: r.mon, gvNhan: '' } };
    });
    return Object.keys(dong).map(function (k) { return { k: k, t: dong[k].t, r: d.ghi[k] }; }).sort(function (a, b) {
      return (a.t.buoi === b.t.buoi ? 0 : a.t.buoi === 'sang' ? -1 : 1) || a.t.tiet - b.t.tiet;
    });
  }
  function laTietCuaToi(t) { return !may() ? t.gvNhan === MAU_TOI : (!!toiEmail() && t.gvEmail === toiEmail()); }
  // Các tiết của CHÍNH người xem trong một buổi còn chưa ký, có tên bài kế hoạch → nút "Xác nhận buổi"
  function tietXacNhan(d, b) {
    return dongCuaNgay(d).filter(function (x) {
      return x.t.buoi === b && !x.r && !x.t.tuQuan && laTietCuaToi(x.t) && quyenGhiDong(d, x.t, null) && L.keHoach[d.ngay + '|' + x.k];
    });
  }
  function veVangBuoi(d, b) {
    var ss = d.siSo[b], vg = d.vang[b] || [];
    if (!ss && !vg.length) return '';
    return (ss ? ss.so_vang + '/' + ss.si_so : vg.length) +
      (vg.length ? '<div class="sdb-vang-ten">' + vg.map(function (h) { return thoat(h.ten) + (h.phep === 'co_phep' ? ' (P)' : h.phep === 'khong_phep' ? ' (K)' : ''); }).join(', ') + '</div>' : '');
  }
  function veBangTuan(inRa) {
    var cot = inRa ? 8 : 9, tb = '';
    L.ngay.forEach(function (d) {
      var ds = dongCuaNgay(d);
      if (thuCuaNgay(d.ngay) === 7 && !ds.length) return;
      var khoaN = chotPhu(d.ngay);
      var oNgay = '<b>' + TEN_THU[thuCuaNgay(d.ngay)].replace('Thứ ', '') + '</b><br>' + ngayNgan(d.ngay) +
        (khoaN && !inRa ? '<div class="sdb-khoa" title="' + (khoaN.loai === 'thang' ? 'Đã ký tháng' : 'Đã chốt tuần') + '">🔒</div>' : '');
      if (!ds.length || (d.nghi && !Object.keys(d.ghi).length)) {
        tb += '<tr class="sdb-ngay-moi"><td class="sdb-c-ngay">' + oNgay + '</td><td colspan="' + (cot - 1) + '" class="sdb-mo">' +
          (d.nghi ? 'Nghỉ: ' + thoat(d.nghi.ten || '') : 'Không có tiết theo thời khóa biểu') + '</td></tr>';
        return;
      }
      var buoi = ['sang', 'chieu'].map(function (b) { return { b: b, ds: ds.filter(function (x) { return x.t.buoi === b; }) }; })
        .filter(function (x) { return x.ds.length; });
      var moO = function (x) { return !inRa && L.mo && L.mo.ngay === d.ngay && L.mo.k === x.k; };
      var soDongNgay = 0;
      buoi.forEach(function (g) { soDongNgay += g.ds.length + g.ds.filter(moO).length; });
      buoi.forEach(function (g, gi) {
        var soDongBuoi = g.ds.length + g.ds.filter(moO).length;
        var xn = inRa ? [] : tietXacNhan(d, g.b);
        g.ds.forEach(function (x, i) {
          var r = x.r, t = x.t, kh = L.keHoach[d.ngay + '|' + x.k];
          var tre = !r && !t.tuQuan && !d.nghi && (d.ngay < homNayISO() || (d.ngay === homNayISO() && quaHan(d.ngay, t.buoi)));
          var html = '<tr class="' + [gi === 0 && i === 0 ? 'sdb-ngay-moi' : '', i === 0 && gi > 0 ? 'sdb-buoi-moi' : '', r ? 'da' : tre && !inRa ? 'tre' : ''].join(' ').trim() + '">';
          if (gi === 0 && i === 0) html += '<td class="sdb-c-ngay" rowspan="' + soDongNgay + '">' + oNgay + '</td>';
          if (i === 0) {
            html += '<td class="sdb-c-buoi" rowspan="' + soDongBuoi + '">' + (g.b === 'sang' ? 'Sáng' : 'Chiều') +
              (xn.length && !L.dangLuu ? '<button type="button" class="sdb-nut-xn" data-sdbl="xacNhan" data-ngay="' + d.ngay + '" data-buoi="' + g.b + '" title="Ký các tiết của tôi trong buổi theo đúng tên bài kế hoạch">✓ Xác nhận ' + xn.length + ' tiết</button>' : '') + '</td>' +
              '<td class="sdb-c-vang" rowspan="' + soDongBuoi + '">' + veVangBuoi(d, g.b) + '</td>';
          }
          var ten;
          if (r) ten = r.tinh_trang === 'khong_day' ? '<i>Không dạy' + (r.ghi_chu ? ' — ' + thoat(r.ghi_chu) : '') + '</i>'
            : thoat(r.ten_bai) + (r.ghi_chu ? '<div class="sdb-ghi-chu">' + thoat(r.ghi_chu) + '</div>' : '');
          else if (t.tuQuan) ten = '<span class="sdb-mo">Lớp tự quản</span>';
          else ten = kh && !inRa ? '<span class="sdb-kh" title="Theo kế hoạch dạy học — chưa ký">' + thoat(kh.ten) + '</span>' : '';
          var ppct = r ? (r.tiet_ppct || '') : (kh && !inRa ? '<span class="sdb-kh">' + kh.ppct + '</span>' : '');
          var ky = r ? thoat(r.gv_ten || r.gv_email || '') + '<small>' + kyLuc(r, d.ngay) + '</small>' + (inRa ? '' : chipDong(r))
            : (!inRa && tre ? '<span class="sdb-chua-ky">chưa ký</span>' : '') + (!inRa && t.gvNhan ? '<small>' + thoat(t.gvNhan) + (t.thay ? ' (dạy thay)' : '') + '</small>' : '');
          html += '<td class="sdb-c-tiet">' + t.tiet + '</td><td class="sdb-c-mon">' + thoat(t.mon) + '</td><td class="sdb-c-ppct">' + ppct + '</td>' +
            '<td class="sdb-c-bai">' + ten + '</td><td class="sdb-c-ky">' + ky + '</td>';
          if (!inRa) {
            var q = quyenGhiDong(d, t, r);
            html += '<td class="sdb-c-tt">' + (q && !moO(x) ? '<button type="button" class="sdb-nut-ghi' + (r ? ' sua' : '') + '" data-sdbl="ghi" data-ngay="' + d.ngay + '" data-k="' + thoat(x.k) + '">' +
              (r ? 'Sửa' : '✍ Ghi') + '</button>' : '') + '</td>';
          }
          tb += html + '</tr>';
          if (moO(x)) tb += '<tr class="sdb-dong-sua"><td colspan="6">' + veOGhiDong(d, t, r) + '</td></tr>';
        });
      });
    });
    return '<div class="sdb-bang-cuon"><table class="sdb-lbg"><thead><tr><th>Thứ, ngày</th><th>Buổi</th><th>HS vắng</th><th>Tiết</th><th>Môn</th>' +
      '<th>Tiết PPCT</th><th>Tên bài · ghi chú</th><th>Giáo viên ký</th>' + (inRa ? '' : '<th class="sdb-c-tt"></th>') + '</tr></thead><tbody>' + tb + '</tbody></table></div>';
  }

  // Ai được ghi / sửa MỘT dòng ngay trên sổ tuần (5/10/2026 — thầy Chung: "không thấy giáo viên ghi vào đâu").
  // Ghi: người dạy tiết đó (TKB/dạy thay), GVCN lớp (ghi hộ — người ký là GVCN), BGH. Sửa: người đã ký, BGH.
  // Không ghi trước ngày; tuần đã chốt thì chỉ BGH. Hàng rào thật vẫn là RLS sql/83.
  function quyenGhiDong(d, t, r) {
    if (d.ngay > homNayISO() || t.tuQuan) return false;
    if (chotPhu(d.ngay) && !laQT()) return false;
    if (!may()) return true;
    if (r) return laQT() || String(r.gv_email || '').toLowerCase() === toiEmail();
    return laQT() || laCN() || (!!toiEmail() && t.gvEmail === toiEmail());
  }
  function veOGhiDong(d, t, r) {
    var n = L.nhap;
    // Gợi ý: bài ghi gần nhất của cùng môn trong tuần đang xem (trước tiết này)
    var truoc = [];
    L.ngay.forEach(function (dd) {
      Object.keys(dd.ghi).forEach(function (k) {
        var g = dd.ghi[k];
        if (g.ten_bai && chuanMon(g.mon) === chuanMon(t.mon) && (dd.ngay < d.ngay || (dd.ngay === d.ngay && (g.buoi < t.buoi || (g.buoi === t.buoi && g.tiet < t.tiet)))))
          truoc.push({ s: dd.ngay + g.buoi + pad(g.tiet), ten: g.ten_bai });
      });
    });
    truoc.sort(function (a, b) { return a.s < b.s ? 1 : -1; });
    var tiep = truoc.length ? tiepTheo(truoc[0].ten) : '';
    var chip = !n.khongDay && tiep && tiep !== n.ten ? '<div class="sdb-goi-y"><button type="button" class="chip-loc" data-sdbl="dien" data-v="' + thoat(tiep) + '">↻ ' + thoat(tiep) + '</button></div>' : '';
    var ghiHo = !r && may() && t.gvEmail && t.gvEmail !== toiEmail();
    return '<div class="sdb-o-dong">' +
      (n.khongDay
        ? '<select class="dh-o-nhap" data-sdbl-o="ghiChu">' + LY_DO_KHONG_DAY.map(function (l) { return '<option' + (n.ghiChu === l ? ' selected' : '') + '>' + thoat(l) + '</option>'; }).join('') + '</select>'
        : '<input class="dh-o-nhap sdb-o-bai" data-sdbl-o="ten" value="' + thoat(n.ten) + '" maxlength="300" placeholder="Tên bài dạy (VD: Bài 5. Phép cộng – tiết 1)" enterkeyhint="done">' + chip +
          '<input class="dh-o-nhap sdb-o-chu" data-sdbl-o="ghiChu" value="' + thoat(n.ghiChu) + '" maxlength="500" placeholder="Ghi chú (không bắt buộc)" list="sdb-ghi-chu-nhanh">') +
      '<label class="sdb-khong-day"><input type="checkbox" data-sdbl-o="khongDay"' + (n.khongDay ? ' checked' : '') + '> Tiết này không dạy</label>' +
      (ghiHo ? '<div class="sdb-mo">Thầy/cô ghi hộ tiết của ' + thoat(t.gvNhan || 'giáo viên khác') + ' — sổ ghi tên người bấm là người ký.</div>' : '') +
      '<div class="sdb-o-dong-nut"><button type="button" class="sdb-nut-luu" data-sdbl="luuDong"' + (L.dangLuu ? ' disabled' : '') + '>' + (L.dangLuu ? 'Đang lưu…' : '✓ Lưu tiết ' + kiHieu(t.buoi, t.tiet)) + '</button>' +
      '<button type="button" class="dh-nut-nho" data-sdbl="huyDong">Huỷ</button></div></div>';
  }
  function moGhiDong(ngay, k) {
    var d = L.ngay.filter(function (x) { return x.ngay === ngay; })[0];
    if (!d) return;
    var r = d.ghi[k];
    L.mo = { ngay: ngay, k: k };
    var kh = (L.keHoach || {})[ngay + '|' + k];
    L.nhap = r ? { ten: r.ten_bai || '', ghiChu: r.ghi_chu || '', khongDay: r.tinh_trang === 'khong_day' } : { ten: kh ? kh.ten : '', ghiChu: '', khongDay: false };
    veLop();
    var o = EL_L && EL_L.querySelector('[data-sdbl-o="ten"]');
    if (o) { try { o.focus(); } catch (e) { /* bỏ qua */ } }
  }
  function luuDong() {
    if (!L.mo || L.dangLuu) return;
    var d = L.ngay.filter(function (x) { return x.ngay === L.mo.ngay; })[0];
    if (!d) return;
    var k = L.mo.k, r = d.ghi[k];
    var t = d.khung.filter(function (x) { return khoa(x.buoi, x.tiet, x.lop) === k; })[0] ||
      (r ? { lop: r.lop, buoi: r.buoi, tiet: r.tiet, mon: r.mon, thay: r.day_thay } : null);
    if (!t) return;
    var n = L.nhap, ten = String(n.ten || '').trim(), ghi = String(n.ghiChu || '').trim();
    if (n.khongDay && !ghi) ghi = LY_DO_KHONG_DAY[0];
    if (!n.khongDay && !ten) { bao('Chưa điền tên bài.'); return; }
    var row = { nam_hoc: namHoc(), ngay: d.ngay, buoi: t.buoi, tiet: t.tiet, lop: t.lop, mon: t.mon,
      tinh_trang: n.khongDay ? 'khong_day' : 'da_day', ten_bai: n.khongDay ? null : ten, ghi_chu: ghi || null, day_thay: !!t.thay,
      tiet_ppct: ppctCua((L.keHoach || {})[d.ngay + '|' + k], n, ten) };
    if (!may()) {
      var bayGio = new Date().toISOString();
      if (r) Object.assign(r, row, { sua_luc: bayGio });
      else {
        r = Object.assign({ id: MAU.id++, gv_ten: MAU_TOI, gv_email: '', ghi_luc: bayGio, sua_luc: bayGio, ghi_bu: quaHan(d.ngay, t.buoi), sua_sau_han: false }, row);
        MAU.ghi.push(r); d.ghi[k] = r;
      }
      L.mo = null; bao('Đã lưu (xem thử — không gửi đi đâu).'); veLop(); return;
    }
    L.dangLuu = true; veLop();
    var viec = r
      ? ghiSua(r.id, row)
      : ghiThem([row]);
    viec.then(function (kq) {
      if (kq.error) { bao(chuLoi(kq.error)); return; }
      var x = (kq.data || [])[0];
      if (!x) { bao('Máy chủ không nhận — thầy/cô không có quyền sửa dòng này.'); return; }
      d.ghi[k] = x; L.mo = null; V.khoa = '';   // màn Ghi đầu bài ở Điều hành đọc lại lần tới
      bao('Đã lưu tiết ' + kiHieu(t.buoi, t.tiet) + ' vào sổ đầu bài.');
    }, function (e) { bao(chuLoi(e)); }).then(function () { L.dangLuu = false; veLop(); });
  }

  // Ký cả buổi một lần các tiết của chính mình, tên bài đúng như kế hoạch
  function xacNhanBuoi(ngay, b) {
    if (L.dangLuu) return;
    var d = L.ngay.filter(function (x) { return x.ngay === ngay; })[0];
    if (!d) return;
    var ds = tietXacNhan(d, b);
    if (!ds.length) return;
    var rows = ds.map(function (x) {
      var kh = L.keHoach[ngay + '|' + x.k];
      return { nam_hoc: namHoc(), ngay: ngay, buoi: b, tiet: x.t.tiet, lop: x.t.lop, mon: x.t.mon, tinh_trang: 'da_day',
        ten_bai: kh.ten, ghi_chu: null, day_thay: !!x.t.thay, tiet_ppct: kh.ppct };
    });
    if (!may()) {
      var bayGio = new Date().toISOString();
      rows.forEach(function (row) {
        var r = Object.assign({ id: MAU.id++, gv_ten: MAU_TOI, gv_email: '', ghi_luc: bayGio, sua_luc: bayGio, ghi_bu: quaHan(ngay, b), sua_sau_han: false }, row);
        MAU.ghi.push(r); d.ghi[khoa(r.buoi, r.tiet, r.lop)] = r;
      });
      bao('Đã ký ' + rows.length + ' tiết (xem thử — không gửi đi đâu).'); veLop(); return;
    }
    L.dangLuu = true; veLop();
    ghiThem(rows).then(function (kq) {
      if (kq.error) { bao(chuLoi(kq.error)); return; }
      (kq.data || []).forEach(function (x) { d.ghi[khoa(x.buoi, x.tiet, x.lop)] = x; });
      V.khoa = '';
      bao('Đã ký ' + (kq.data || []).length + ' tiết ' + (b === 'sang' ? 'buổi sáng' : 'buổi chiều') + ' ' + ngayNgan(ngay) + ' theo kế hoạch.');
    }, function (e) { bao(chuLoi(e)); }).then(function () { L.dangLuu = false; veLop(); });
  }

  function veChotTuan(c, d) {
    var html = '<div class="sdb-chot"><div class="dh-tieu-de">GVCN chốt tuần</div>';
    if (c) {
      var goDuoc = laQT() || (laCN() && String(c.nguoi_email || '').toLowerCase() === toiEmail() && !chotPhu(congNgay(L.tuan, 2), 'thang'));
      html += '<div class="hd-kiem xanh">🔒 Đã chốt bởi <b>' + thoat(c.nguoi_ten || c.nguoi_email || '') + '</b> lúc ' + gioPhut(c.luc) + ' ' + ngayVN(ngayCuaTs(c.luc)) +
        (c.so_tiet_ghi != null ? ' · ' + c.so_tiet_ghi + ' tiết đã ký' + (c.so_tiet_thieu ? ', thiếu ' + c.so_tiet_thieu : '') : '') +
        (c.nhan_xet ? '<br>Nhận xét: ' + thoat(c.nhan_xet) : '') + '</div>' +
        (goDuoc ? '<button type="button" class="dh-nut-nho" data-sdbl="goChot" data-id="' + c.id + '">Mở lại tuần</button>' : '');
    } else if (laCN() || laQT()) {
      var xong = congNgay(L.tuan, 4) <= homNayISO();
      html += '<div class="sdb-chu-dau">Chốt xong thì giáo viên không sửa được các tiết trong tuần nữa' +
        (laQT() ? '' : ' (muốn sửa: tự mở lại khi tháng chưa ký, hoặc nhờ Ban giám hiệu)') + '.</div>' +
        (xong ? '<button type="button" class="sdb-nut-luu" data-sdbl="chot"' + (L.dangLuu ? ' disabled' : '') + '>🔒 Chốt tuần ' + ngayNgan(L.tuan) + ' – ' + ngayNgan(congNgay(L.tuan, 5)) +
          (d.thieu.length ? ' (còn ' + d.thieu.length + ' tiết chưa ghi)' : '') + '</button>'
          : '<div class="sdb-mo">Chốt được từ thứ Sáu của tuần.</div>');
    } else html += '<div class="sdb-mo">Tuần này GVCN chưa chốt.</div>';
    return html + '</div>';
  }

  function veKyThang() {
    var ym = congNgay(L.tuan, 2).slice(0, 7), dau = ym + '-01';
    var cuoi = congNgay(congNgay(dau, 32).slice(0, 8) + '01', -1);
    var ky = L.chot.filter(function (c) { return c.loai === 'thang' && c.tu_ngay === dau; })[0];
    var tuanCuaThang = [], t = thuHai(dau);
    while (t <= cuoi) { if (congNgay(t, 5) >= dau) tuanCuaThang.push(t); t = congNgay(t, 7); }
    var dsT = tuanCuaThang.map(function (tt) {
      var c = L.chot.filter(function (x) { return x.loai === 'tuan' && x.tu_ngay <= congNgay(tt, 2) && x.den_ngay >= congNgay(tt, 2); })[0];
      return '<span class="tkb-chip ' + (c ? 'xanh' : 'xam') + '">' + ngayNgan(tt) + (c ? ' ✓' : ' chưa chốt') + '</span>';
    }).join(' ');
    var html = '<div class="sdb-chot"><div class="dh-tieu-de">Ban giám hiệu ký duyệt ' + thangChu(ym) + '</div><div class="sdb-tuan-ds">' + dsT + '</div>';
    if (ky) {
      html += '<div class="hd-kiem xanh">✍ Đã ký duyệt bởi <b>' + thoat(ky.nguoi_ten || ky.nguoi_email || '') + '</b> lúc ' + gioPhut(ky.luc) + ' ' + ngayVN(ngayCuaTs(ky.luc)) +
        (ky.nhan_xet ? '<br>Nhận xét: ' + thoat(ky.nhan_xet) : '') + '</div>' +
        (laQT() ? '<button type="button" class="dh-nut-nho" data-sdbl="goChot" data-id="' + ky.id + '">Gỡ ký tháng</button>' : '');
    } else if (laQT()) {
      html += cuoi.slice(0, 7) <= homNayISO().slice(0, 7) && congNgay(cuoi, -6) <= homNayISO()
        ? '<button type="button" class="sdb-nut-luu" data-sdbl="kyThang" data-tu="' + dau + '" data-den="' + cuoi + '"' + (L.dangLuu ? ' disabled' : '') + '>✍ Ký duyệt ' + thangChu(ym) + '</button>'
        : '<div class="sdb-mo">Ký được trong tuần cuối của tháng.</div>';
    } else html += '<div class="sdb-mo">Chưa ký.</div>';
    return html + '</div>';
  }

  function chot(loai, tu, den) {
    var d = demTuan();
    var hoi = window.hopNhap ? window.hopNhap({
      tieuDe: loai === 'tuan' ? 'Chốt sổ tuần ' + ngayNgan(tu) + ' – ' + ngayNgan(congNgay(tu, 5)) + ' · lớp ' + L.lop : 'Ký duyệt sổ đầu bài ' + thangChu(tu.slice(0, 7)) + ' · lớp ' + L.lop,
      moTa: loai === 'tuan'
        ? 'Đã ký ' + d.da + '/' + d.phai + ' tiết.' + (d.thieu.length ? ' Còn ' + d.thieu.length + ' tiết chưa ghi — chốt thì ghi chú lý do bên dưới.' : '') + ' Chốt xong giáo viên không sửa được tuần này.'
        : 'Ký duyệt tháng khoá mọi ngày trong tháng; chỉ Ban giám hiệu mở lại được.',
      nhan: 'Nhận xét (không bắt buộc)', kieu: 'vanban', toiDa: 1000, nutLuu: loai === 'tuan' ? 'Chốt tuần' : 'Ký duyệt'
    }) : Promise.resolve('');
    hoi.then(function (nx) {
      if (nx === null) return;
      var row = { nam_hoc: namHoc(), lop: L.lop, loai: loai, tu_ngay: tu, den_ngay: den, nhan_xet: String(nx || '').trim() || null,
        so_tiet_ghi: loai === 'tuan' ? d.da : null, so_tiet_thieu: loai === 'tuan' ? d.phai - d.da : null };
      if (!may()) {
        MAU.chot.push(Object.assign({ id: MAU.id++, nguoi_ten: MAU_TOI, nguoi_email: '', luc: new Date().toISOString() }, row));
        L.chot = MAU.chot.filter(function (c) { return chuanLop(c.lop) === chuanLop(L.lop); });
        veLop(); return;
      }
      L.dangLuu = true; veLop();
      may().from('sdb_chot').insert(row).select().then(function (r) {
        if (r.error) bao(/row-level|violates row/i.test(r.error.message || '') ? 'Máy chủ không nhận: chỉ GVCN của lớp chốt tuần, Ban giám hiệu ký tháng.' : chuLoi(r.error));
        else { L.chot = L.chot.concat(r.data || []); bao(loai === 'tuan' ? 'Đã chốt tuần.' : 'Đã ký duyệt tháng.'); }
      }, function (e) { bao(chuLoi(e)); }).then(function () { L.dangLuu = false; veLop(); });
    });
  }
  function goChot(id) {
    var hoi = window.hopHoi ? window.hopHoi({ tieuDe: 'Mở lại sổ?', moTa: 'Giáo viên sẽ sửa được các tiết trong khoảng này cho tới khi chốt lại. Việc mở lại được ghi vào nhật ký.', nutOK: 'Mở lại' }) : Promise.resolve(true);
    hoi.then(function (ok) {
      if (!ok) return;
      if (!may()) { MAU.chot = MAU.chot.filter(function (c) { return String(c.id) !== String(id); }); L.chot = MAU.chot.filter(function (c) { return chuanLop(c.lop) === chuanLop(L.lop); }); veLop(); return; }
      may().from('sdb_chot').delete().eq('id', id).select().then(function (r) {
        if (r.error || !(r.data || []).length) bao(r.error ? chuLoi(r.error) : 'Máy chủ không cho mở lại (tháng đã ký — nhờ Ban giám hiệu).');
        else { L.chot = L.chot.filter(function (c) { return String(c.id) !== String(id); }); bao('Đã mở lại.'); }
        veLop();
      }, function (e) { bao(chuLoi(e)); });
    });
  }

  // ── TẢI SỔ ĐẦU BÀI (Word) — 5/10/2026, thầy Chung: "thay nút In tuần bằng Tải Sổ đầu bài, file Word chuẩn
  // 1 trang A4 dọc" + "trang bìa thật đẹp, màu khác Sổ chủ nhiệm nhưng cấu tạo tương tự, có trang Căn cứ và
  // Hướng dẫn sử dụng". Tệp gồm 3 section (WORD_TIEN_ICH.khungWordBiaAnh, gói MHTML kèm ảnh):
  //   1. Bìa in màu: img/bia-so-dau-bai.jpg — CÙNG khuôn ảnh bìa sổ chủ nhiệm (trống đồng, khung thông tin),
  //      đổi sang tông đồng/vàng, chữ "SỔ GHI ĐẦU BÀI – TIỂU HỌC" in sẵn trên ảnh → vị trí chữ dùng lại số đo
  //      của bìa sổ chủ nhiệm (so-chu-nhiem.js, đo bằng Word COM 29/9/2026).
  //   2. Căn cứ + Hướng dẫn sử dụng — lề NĐ 30.
  //   3. Sổ tuần — MỘT trang: lề trên/dưới 1,5 · trái 2 · phải 1,5 cm, bảng cố định 17,5 cm, cỡ chữ tự hạ
  //      (11 → 7,5pt) theo chiều cao ước tính của bảng (caoBang — số dòng × số dòng chữ mỗi ô). Tiết chưa ký để TRỐNG — tên bài kế hoạch chỉ là gợi ý
  //      trên màn hình, không phải chữ ký.
  var ANH_BIA = 'bia-so-dau-bai.jpg', ANH_BIA_WEB = 'img/bia-so-dau-bai.jpg', ANH_BIA_B64 = null;
  // Bề rộng cột (cm, tổng 17,5): tên bài Bút Xanh dài trung vị 47 ký tự, 10% từ 79 trở lên → dành cột Tên bài rộng nhất.
  var COT_WORD = [['Thứ, ngày', 1.1], ['Buổi', 1.0], ['HS vắng', 1.8], ['Tiết', 0.65], ['Môn', 1.75], ['Tiết PPCT', 0.9], ['Tên bài · ghi chú', 6.9], ['Giáo viên ký', 3.4]];
  // Ước chiều cao phần thân bảng (cm) ở cỡ chữ co: mỗi dòng cao bằng ô nhiều dòng nhất. Đo bằng Word COM 5/10/2026:
  // tên bài ~0,43em mỗi ký tự; họ tên, tên môn (nhiều chữ hoa, dấu) ~0,5em — ước hẹp hơn thì "Nguyễn Thị Hoàn Mỹ"
  // rớt dòng ở MỌI tiết, bảng cao vọt từ 18,5 lên 27 cm.
  function caoBang(dong, co) {
    var soKt = function (i) { return Math.max(4, (COT_WORD[i][1] - 0.22) / (co * 0.0353 * (i === 6 ? 0.43 : 0.5))); };
    return dong.reduce(function (s, x) {
      var n = Math.max(1, Math.ceil(x[0] / soKt(4)), Math.ceil(x[1] / soKt(6)), Math.ceil(x[2] / soKt(7)));
      return s + n * co * 1.15 * 0.0353 + 0.09;
    }, 0);
  }

  function biaWord(lop, gvcn) {
    var W = window.WORD_TIEN_ICH, ch = W.chan, MAU = '#4A2306';
    var dongCo = function (t, cao, kieu) {
      return '<p style="margin:0;line-height:' + cao + 'pt;mso-line-height-rule:exactly;color:' + MAU + ';' + (kieu || '') + '">' + t + '</p>';
    };
    var trongCo = function (cao) { return '<p style="margin:0;line-height:' + cao + 'pt;mso-line-height-rule:exactly;font-size:6pt">&nbsp;</p>'; };
    var oBia = function (t) { return dongCo('<b>' + t + '</b>', 37, 'margin-left:51pt;font-size:18pt;white-space:nowrap'); };
    var truong = W.cauHinh('TEN_TRUONG'), chuQuan = W.cauHinh('DON_VI_CHU_QUAN') || W.cauHinh('CHU_QUAN_THUONG');
    return trongCo(21) +
      dongCo('<b>' + ch(String(chuQuan).toUpperCase()) + '</b>', 27, 'text-align:center;font-size:17pt') +
      dongCo('<b>' + ch(String(truong).toUpperCase()) + '</b>', 27.2, 'text-align:center;font-size:18.5pt') +
      trongCo(468) +
      oBia('Giáo viên chủ nhiệm : ' + (gvcn ? ch(gvcn) : '…………………………………')) +
      oBia('Lớp : ' + ch(lop)) +
      oBia(ch(truong)) +
      oBia(ch(W.cauHinh('DIA_CHI_TRUONG') || '') || '&nbsp;') +
      trongCo(27) +
      dongCo('<b>NĂM HỌC: ' + ch(namHoc()) + '</b>', 30, 'text-align:center;font-size:16.5pt');
  }

  // Trang 2 — chỉ ghi điều đã kiểm chứng trong văn bản (bộ nhớ so-dau-bai-quyet-dinh) và cách app đang chạy.
  function canCuWord() {
    var W = window.WORD_TIEN_ICH;
    var muc = function (t) { return '<p style="margin:10pt 0 4pt;font-size:13pt"><b>' + t + '</b></p>'; };
    var y = function (t) { return '<p style="margin:0 0 4pt;text-align:justify;text-indent:1cm;font-size:13pt;line-height:1.3">' + t + '</p>'; };
    return '<p style="margin:0;text-align:center;font-size:12pt">' + W.chan(W.cauHinh('TEN_TRUONG').toUpperCase()) + '</p>' +
      '<p style="margin:8pt 0 6pt;text-align:center;font-size:15pt"><b>CĂN CỨ VÀ HƯỚNG DẪN SỬ DỤNG<br>SỔ GHI ĐẦU BÀI ĐIỆN TỬ</b></p>' +
      muc('I. CĂN CỨ') +
      y('1. Thông tư số 15/2026/TT-BGDĐT ban hành Điều lệ trường tiểu học: điểm e khoản 1 Điều 21 quy định <i>sổ ghi đầu bài</i> là hồ sơ quản lý hoạt động giáo dục của nhà trường; khoản 4 Điều 21 quy định hồ sơ điện tử có giá trị pháp lý như hồ sơ giấy, nhà trường đã dùng hồ sơ điện tử thì không bắt buộc lập hồ sơ giấy.') +
      y('2. Kế hoạch giáo dục của nhà trường, kế hoạch dạy học các môn học và thời khóa biểu năm học ' + W.chan(namHoc()) + '.') +
      y('3. Sổ không dùng để xếp loại hay chấm điểm tiết dạy; chỉ ghi nhận bài đã dạy, người dạy và học sinh vắng.') +
      muc('II. HƯỚNG DẪN SỬ DỤNG') +
      y('<b>1. Ghi sổ.</b> Giáo viên ghi trên điện thoại tại <b>Điều hành › Ghi đầu bài</b>, hoặc trên máy tính tại <b>Lớp học › Sổ đầu bài</b>. Các tiết trong ngày lấy sẵn từ thời khóa biểu (kể cả tiết dạy thay). Tên bài và tiết theo phân phối chương trình (PPCT) điền sẵn theo kế hoạch dạy học; dạy đúng kế hoạch thì bấm <b>Xác nhận</b> một lần cho cả buổi, dạy khác thì sửa tên bài của tiết đó.') +
      y('<b>2. Thời hạn.</b> Ghi trong buổi dạy. Quá buổi vẫn ghi được, sổ đánh dấu <i>(ghi bù)</i>.') +
      y('<b>3. Tiết không dạy.</b> Đánh dấu "Tiết này không dạy" và chọn lý do; các tiết sau của môn đó tự lùi một bài theo kế hoạch.') +
      y('<b>4. Học sinh vắng.</b> Lấy từ điểm danh của lớp, không ghi lại. Ghi dạng số vắng/sĩ số; (P) vắng có phép, (K) vắng không phép.') +
      y('<b>5. Chốt và ký duyệt.</b> Giáo viên chủ nhiệm <b>chốt tuần</b> từ thứ Sáu; tuần đã chốt thì giáo viên không sửa được. Ban giám hiệu <b>ký duyệt tháng</b> trong tuần cuối của tháng. Các xác nhận này ghi trên hệ thống kèm thời gian.') +
      y('<b>6. Tải sổ.</b> Nút <b>Tải Sổ đầu bài</b> ở Lớp học › Sổ đầu bài tải tệp Word gồm trang bìa, trang này và sổ của tuần đang xem (một trang A4 dọc) để lưu hồ sơ hoặc in khi cần.');
  }

  function tuanWord(lop, tuan, dsNgay, dsChot, tuanSo, coEp) {
    var W = window.WORD_TIEN_ICH, ch = W.chan;
    var chotCua = function (ngay, loai) { return (dsChot || []).filter(function (c) { return c.loai === loai && ngay >= c.tu_ngay && ngay <= c.den_ngay; })[0] || null; };
    // Giãn dòng ĐẶT CỨNG theo pt (exactly): để % thì Word lấy giãn 1,5 của body, mỗi dòng cao gấp đôi chữ.
    var O = 'font-size:@COpt;margin:0;mso-para-margin:0;padding:1pt 3pt;line-height:@LHpt;mso-line-height-rule:exactly;vertical-align:middle';
    var td = function (noi, i, them) { return '<td' + (them || '') + ' style="width:' + COT_WORD[i][1] + 'cm;' + O + '">' + noi + '</td>'; };
    var vangChu = function (d, b) {
      var ss = d.siSo[b], vg = d.vang[b] || [];
      if (!ss && !vg.length) return '';
      return (ss ? ss.so_vang + '/' + ss.si_so : String(vg.length)) +
        (vg.length ? '<br><span style="font-size:@NHOpt">' + vg.map(function (h) { return ch(h.ten) + (h.phep === 'co_phep' ? ' (P)' : h.phep === 'khong_phep' ? ' (K)' : ''); }).join(', ') + '</span>' : '');
    };
    var tb = '', soDong = 0, phai = 0, da = 0, dong = [];
    dsNgay.forEach(function (d) {
      var ds = dongCuaNgay(d);
      if (thuCuaNgay(d.ngay) === 7 && !ds.length) return;
      var oNgay = '<b>' + TEN_THU[thuCuaNgay(d.ngay)].replace('Thứ ', '') + '</b><br>' + ngayNgan(d.ngay);
      if (!ds.length || (d.nghi && !Object.keys(d.ghi).length)) {
        soDong++; dong.push([0, 30, 0]);
        tb += '<tr class="ngay-moi">' + td(oNgay, 0, ' class="giua"') + '<td colspan="7" class="nghieng" style="' + O + '">' +
          (d.nghi ? 'Nghỉ: ' + ch(d.nghi.ten || '') : 'Không có tiết theo thời khóa biểu') + '</td></tr>';
        return;
      }
      var buoi = ['sang', 'chieu'].map(function (b) { return { b: b, ds: ds.filter(function (x) { return x.t.buoi === b; }) }; })
        .filter(function (x) { return x.ds.length; });
      buoi.forEach(function (g, gi) {
        g.ds.forEach(function (x, i) {
          var r = x.r, t = x.t;
          soDong++;
          if (!t.tuQuan && !d.nghi) { phai++; if (r) da++; }
          var ten = r ? (r.tinh_trang === 'khong_day' ? '<i>Không dạy' + (r.ghi_chu ? ' — ' + ch(r.ghi_chu) : '') + '</i>'
            : ch(r.ten_bai) + (r.ghi_chu ? ' <i style="font-size:@NHOpt">(' + ch(r.ghi_chu) + ')</i>' : '')) : (t.tuQuan ? '<i>Lớp tự quản</i>' : '');
          var ky = r ? ch(r.gv_ten || r.gv_email || '') + (r.ghi_bu ? ' <i style="font-size:@NHOpt">(ghi bù)</i>' : '') + (r.day_thay ? ' <i style="font-size:@NHOpt">(dạy thay)</i>' : '') : '';
          var html = '<tr' + (gi === 0 && i === 0 ? ' class="ngay-moi"' : '') + '>';
          if (gi === 0 && i === 0) html += td(oNgay, 0, ' class="giua" rowspan="' + ds.length + '"');
          if (i === 0) html += td(g.b === 'sang' ? 'Sáng' : 'Chiều', 1, ' class="giua" rowspan="' + g.ds.length + '"') +
            td(vangChu(d, g.b), 2, ' rowspan="' + g.ds.length + '"');
          html += td(String(t.tiet), 3, ' class="giua"') + td(ch(t.mon), 4) +
            td(r && r.tiet_ppct ? String(r.tiet_ppct) : '', 5, ' class="giua"') + td(ten, 6) + td(ky, 7);
          tb += html + '</tr>';
          dong.push([String(t.mon || '').length, r ? String(r.ten_bai || '').length + (r.ghi_chu ? String(r.ghi_chu).length + 3 : 0) + (r.tinh_trang === 'khong_day' ? 12 : 0) : 0,
            r ? String(r.gv_ten || r.gv_email || '').length + (r.ghi_bu ? 10 : 0) + (r.day_thay ? 12 : 0) : 0]);
        });
      });
    });
    // Cỡ chữ lớn nhất để thân bảng vừa ~20 cm (trang 26,7 cm trừ đầu trang, hàng tiêu đề, dòng tổng, chỗ ký)
    var co = coEp || [11, 10.5, 10, 9.5, 9, 8.5, 8, 7.5].filter(function (c) { return caoBang(dong, c) <= 21; })[0] || 7.5;
    var css = 'table.sdb tr.ngay-moi td{border-top:1.5pt solid #000}';
    var giua = congNgay(tuan, 2), c = chotCua(giua, 'tuan'), ky = chotCua(giua, 'thang');
    var dau = '<table style="border:none;width:100%;border-collapse:collapse"><tr>' +
      '<td style="border:none;padding:0;width:42%;text-align:center;vertical-align:top;font-size:11pt">' +
      ch(W.cauHinh('DON_VI_CHU_QUAN').toUpperCase()) + '<br><b>' + ch(W.cauHinh('TEN_TRUONG').toUpperCase()) + '</b></td>' +
      '<td style="border:none;padding:0;width:58%;text-align:center;vertical-align:top">' +
      '<b style="font-size:15pt">SỔ GHI ĐẦU BÀI</b><br><span style="font-size:12pt"><b>Lớp ' + ch(lop) + '</b> · Năm học ' + ch(namHoc()) + '</span><br>' +
      '<span style="font-size:11.5pt">' + (tuanSo ? '<b>TUẦN ' + tuanSo + '</b>: ' : '') + 'từ ' + ngayVN(tuan) + ' đến ' + ngayVN(congNgay(tuan, 5)) + '</span></td></tr></table>';
    // KHÔNG đặt margin cho bảng: Word đổ margin-top của bảng thành "cách trên" của MỌI đoạn trong ô (đo 5/10/2026: 6pt mỗi dòng).
    var bang = '<p style="margin:0;font-size:4pt;line-height:4pt;mso-line-height-rule:exactly">&nbsp;</p><table class="sdb co-dinh" style="width:17.5cm"><colgroup>' +
      COT_WORD.map(function (k) { return '<col style="width:' + k[1] + 'cm">'; }).join('') + '</colgroup><thead><tr>' +
      COT_WORD.map(function (k) { return '<th style="width:' + k[1] + 'cm;' + O.replace('@CO', '@TH') + '">' + k[0] + '</th>'; }).join('') + '</tr></thead><tbody>' + tb + '</tbody></table>';
    var tong = '<p class="nghieng" style="margin:3pt 0 0;font-size:10pt">Đã ký ' + da + '/' + phai + ' tiết trong tuần. HS vắng: số vắng/sĩ số; (P) có phép, (K) không phép.</p>';
    var oKy = function (tieuDe, x) {
      return '<td style="border:none;width:50%;text-align:center;vertical-align:top;font-size:12pt"><b>' + tieuDe + '</b><br>' +
        (x ? '<span class="nghieng" style="font-size:10pt">(Đã xác nhận điện tử lúc ' + gioPhut(x.luc) + ' ' + ngayVN(ngayCuaTs(x.luc)) + ')</span>' +
          (x.nhan_xet ? '<br><span style="font-size:10pt">Nhận xét: ' + ch(x.nhan_xet) + '</span>' : '') + '<br><b>' + ch(x.nguoi_ten || x.nguoi_email || '') + '</b>'
          : '<span class="nghieng" style="font-size:10pt">(Ký, ghi rõ họ tên)</span><div style="height:36pt"></div>') + '</td>';
    };
    var cuoi = '<p style="margin:0;font-size:6pt;line-height:6pt;mso-line-height-rule:exactly">&nbsp;</p><table style="border:none;width:100%"><tr>' + oKy('GIÁO VIÊN CHỦ NHIỆM', c) + oKy('BAN GIÁM HIỆU KÝ DUYỆT', ky) + '</tr></table>';
    var than = (dau + bang + tong + cuoi).replace(/@COpt/g, co + 'pt').replace(/@THpt/g, (co - 0.5) + 'pt').replace(/@NHOpt/g, Math.max(7, co - 1.5) + 'pt')
      .replace(/@LHpt/g, (Math.round(co * 11.5) / 10) + 'pt');
    return { than: than, css: css, soDong: soDong, co: co, uoc: caoBang(dong, co) };
  }

  function htmlSoWord(lop, tuan, dsNgay, dsChot, tuanSo, gvcn, coEp) {   // coEp: ép cỡ chữ — chỉ bài đo dùng
    var tw = tuanWord(lop, tuan, dsNgay, dsChot, tuanSo, coEp);
    var html = window.WORD_TIEN_ICH.khungWordBiaAnh('Sổ ghi đầu bài lớp ' + lop, biaWord(lop, gvcn), [
      { than: canCuWord() },
      { than: tw.than, le: '1.5cm 1.5cm 1.5cm 2cm', css: tw.css }
    ], ANH_BIA);
    return { html: html, soDong: tw.soDong, co: tw.co, uoc: tw.uoc };
  }

  function docAnhBia() {
    if (ANH_BIA_B64) return Promise.resolve(ANH_BIA_B64);
    if (!window.fetch || !window.FileReader) return Promise.reject(new Error('trình duyệt không đọc được ảnh'));
    return fetch(ANH_BIA_WEB).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.blob(); })
      .then(function (b) {
        return new Promise(function (xong, hong) {
          var fr = new FileReader();
          fr.onload = function () { ANH_BIA_B64 = String(fr.result).split(',')[1] || ''; xong(ANH_BIA_B64); };
          fr.onerror = function () { hong(fr.error); };
          fr.readAsDataURL(b);
        });
      });
  }
  // Tên GVCN in bìa: phân công chủ nhiệm (tài khoản đã đăng nhập) → GVCN dự kiến ở lop_hoc (sql/70). Lỗi thì để chấm.
  function docGvcn(lop) {
    if (!may()) return Promise.resolve(MAU_TOI);
    return Promise.all([
      may().from('phan_cong_day').select('lop, nguoi_dung:nguoi_dung_id(ho_ten)').eq('nam_hoc', namHoc()).eq('la_chu_nhiem', true).eq('lop', lop).limit(1),
      may().from('lop_hoc').select('lop, gvcn_ten').eq('nam_hoc', namHoc()).eq('lop', lop).limit(1)
    ]).then(function (r) {
      var p = (r[0] && !r[0].error && r[0].data || [])[0], l = (r[1] && !r[1].error && r[1].data || [])[0];
      return (p && p.nguoi_dung && p.nguoi_dung.ho_ten) || (l && l.gvcn_ten) || '';
    }, function () { return ''; });
  }
  function taiTuan() {
    var W = window.WORD_TIEN_ICH;
    if (!W || !W.khungWordBiaAnh) { bao('Chưa nạp xong bộ xuất Word — tải lại trang (F5) rồi bấm lại.'); return; }
    if (!L.ngay.length || L.dangTai) { if (!L.ngay.length) bao('Sổ tuần chưa tải xong.'); return; }
    var lop = L.lop, tuan = L.tuan, ngay = L.ngay, chotDs = L.chot, tuanSo = soTuan(tuan);
    var tenTep = 'So-dau-bai_Lop-' + String(lop).replace(/[^\w-]/g, '') + '_' + (tuanSo ? 'Tuan-' + pad(tuanSo) : tuan) + '.doc';
    L.dangTai = true;
    docGvcn(lop).then(function (gvcn) {
      var html = htmlSoWord(lop, tuan, ngay, chotDs, tuanSo, gvcn).html;
      return docAnhBia().then(function (b64) {
        W.taiVeMHT(html, tenTep, [{ ten: ANH_BIA, loai: 'image/jpeg', b64: b64 }]);
        bao('Đã tải ' + tenTep + ' — bìa, căn cứ và sổ tuần (một trang A4 dọc).');
      }, function () {
        W.taiVe(html, tenTep);   // mất mạng đọc ảnh: vẫn cho tải, bìa không có nền màu
        bao('Đã tải ' + tenTep + '. Chưa tải được ảnh nền bìa — bìa không có màu.');
      });
    }).catch(function (e) { bao(chuLoi(e)); }).then(function () { L.dangTai = false; });
  }

  function batSuKienLop(el) {
    el.addEventListener('click', function (e) {
      var a = e.target.closest ? e.target.closest('[data-sdbl]') : null;
      if (!a || a.tagName === 'SELECT') return;
      var v = a.getAttribute('data-sdbl');
      if (v === 'lui' || v === 'toi' || v === 'nay') {
        var moi = v === 'nay' ? thuHai(homNayISO()) : congNgay(L.tuan, v === 'lui' ? -7 : 7);
        if (moi > thuHai(homNayISO())) return;
        L.tuan = moi; L.ngay = []; L.mo = null; napTuan(); veLop();
      } else if (v === 'chot') chot('tuan', L.tuan, congNgay(L.tuan, 6));
      else if (v === 'kyThang') chot('thang', a.getAttribute('data-tu'), a.getAttribute('data-den'));
      else if (v === 'goChot') goChot(a.getAttribute('data-id'));
      else if (v === 'in') taiTuan();
      else if (v === 'ghi') moGhiDong(a.getAttribute('data-ngay'), a.getAttribute('data-k'));
      else if (v === 'huyDong') { L.mo = null; veLop(); }
      else if (v === 'luuDong') luuDong();
      else if (v === 'xacNhan') xacNhanBuoi(a.getAttribute('data-ngay'), a.getAttribute('data-buoi'));
      else if (v === 'dien') { L.nhap.ten = a.getAttribute('data-v') || ''; veLop(); }
      else if (v === 'dieuHanh') { e.preventDefault(); if (window.DH && window.DH.moTab) window.DH.moTab('sodaubai'); }
    });
    el.addEventListener('input', function (e) {
      var o = e.target, f = o.getAttribute && o.getAttribute('data-sdbl-o');
      if (!f) return;
      if (f === 'khongDay') { L.nhap.khongDay = o.checked; L.nhap.ghiChu = o.checked ? LY_DO_KHONG_DAY[0] : ''; veLop(); }
      else L.nhap[f] = o.value;
    });
    el.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && e.target.getAttribute && e.target.getAttribute('data-sdbl-o') === 'ten') { e.preventDefault(); luuDong(); }
    });
    el.addEventListener('change', function (e) {
      var o = e.target;
      if (o.getAttribute && o.getAttribute('data-sdbl') === 'lop') { L.lop = o.value; L.ngay = []; L.mo = null; napTuan(); veLop(); }
      else if (o.tagName === 'SELECT' && o.getAttribute('data-sdbl-o') === 'ghiChu') L.nhap.ghiChu = o.value;
    });
  }

  function khiHienLop() {
    var mh = document.getElementById('mh-sodaubai');
    if (!mh || !mh.classList.contains('hien')) return;
    if (!L.khoiTao) {
      L.khoiTao = true; L.dangNap = true; veLop();
      napDsLop().then(function () {
        var muon = L.lopMuon; L.lopMuon = '';
        var hop = muon && L.dsLop.filter(function (l) { return chuanLop(l) === chuanLop(muon); })[0];
        L.lop = hop || L.lopCN.filter(function (l) { return L.dsLop.some(function (x) { return chuanLop(x) === chuanLop(l); }); })[0] || L.dsLop[0] || '';
        return napTuan();
      }).catch(function (e) { L.loi = chuLoi(e); L.dangNap = false; veLop(); });
      return;
    }
    if (L.lopMuon) {
      var m = L.lopMuon; L.lopMuon = '';
      var h = L.dsLop.filter(function (l) { return chuanLop(l) === chuanLop(m); })[0];
      if (h && chuanLop(h) !== chuanLop(L.lop)) { L.lop = h; L.ngay = []; napTuan(); }
    }
    veLop();
  }
  function moLop(lop) {
    if (lop) L.lopMuon = lop;
    if (window.chuyenManHinh) window.chuyenManHinh('sodaubai');
    khiHienLop();
  }

  function gan() {
    var mh = document.getElementById('mh-sodaubai'), vung = document.getElementById('vung-sodaubai');
    if (mh && vung) {
      EL_L = vung;
      ganGhiChuNhanh();
      batSuKienLop(vung);
      if (window.MutationObserver) new MutationObserver(khiHienLop).observe(mh, { attributes: true, attributeFilter: ['class'] });
      khiHienLop();
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', gan); else gan();

  window.SO_DAU_BAI = {
    veDieuHanh: veDieuHanh, moLop: moLop,
    // cho bài thử
    _khungNgay: khungNgay, _tiepTheo: tiepTheo, _goiYTu: goiYTu, _thuHai: thuHai, _soTuan: soTuan, _ganKeHoach: ganKeHoach, _maMon: maMon, _htmlSoWord: htmlSoWord
  };
})();
