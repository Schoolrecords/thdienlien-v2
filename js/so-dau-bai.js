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
//                                 điểm danh, không ghi lại) · chốt tuần · ký tháng · in.
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

  // Giờ hết buổi — hạn "ghi trong buổi" (cau_hinh, sql/83; mặc định 11:30 / 17:30)
  var HET_BUOI = { sang: '11:30', chieu: '17:30' };
  var DA_DOC_GIO = false;
  function docGioHetBuoi() {
    if (DA_DOC_GIO || !may()) return Promise.resolve();
    return may().from('cau_hinh').select('khoa, gia_tri').in('khoa', ['sdb_het_buoi_sang', 'sdb_het_buoi_chieu']).then(function (r) {
      DA_DOC_GIO = true;
      ((r && r.data) || []).forEach(function (x) {
        if (!/^\d{1,2}:\d{2}$/.test(String(x.gia_tri || '').trim())) return;
        HET_BUOI[x.khoa === 'sdb_het_buoi_sang' ? 'sang' : 'chieu'] = String(x.gia_tri).trim();
      });
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
  var V = { ngay: homNayISO(), khoa: '', dangNap: false, loi: '', khung: [], ghi: {}, vang: {}, siSo: {}, goiY: {},
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
      // Gợi ý tên bài: các bài đã ghi gần đây của đúng lớp + môn mình dạy
      var lop = {};
      V.khung.forEach(function (t) { if (laCuaToi(t)) lop[t.lop] = 1; });
      var dsLop = Object.keys(lop);
      if (!dsLop.length) { V.goiY = {}; return; }
      return may().from('sdb_tiet').select('ngay, buoi, tiet, lop, mon, ten_bai, tinh_trang')
        .in('lop', dsLop).gte('ngay', congNgay(ngay, -35)).lte('ngay', ngay)
        .order('ngay', { ascending: false }).limit(800).then(function (g) {
          if (V.khoa === k) V.goiY = goiYTu((g && g.data) || [], ngay);
        });
    }).catch(function (e) { if (V.khoa === k) V.loi = chuLoi(e); }).then(xong);
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
        (V.dangLuu ? 'Đang lưu…' : '✓ Lưu các tiết ' + (b === 'sang' ? 'buổi sáng' : 'buổi chiều')) + '</button>';
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
    var n = V.nhap[k] || (r ? { ten: r.ten_bai || '', ghiChu: r.ghi_chu || '', khongDay: r.tinh_trang === 'khong_day' } : { ten: '', ghiChu: '', khongDay: false });
    V.nhap[k] = n;
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
      (chip ? '<div class="sdb-goi-y">' + chip + '</div>' : '') +
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
        tinh_trang: n.khongDay ? 'khong_day' : 'da_day', ten_bai: n.khongDay ? null : ten, ghi_chu: ghi || null, day_thay: !!t.thay };
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
    if (them.length) viec.push(may().from('sdb_tiet').insert(them.map(function (x) { return x.row; })).select());
    sua.forEach(function (x) {
      var row = Object.assign({}, x.row);
      viec.push(may().from('sdb_tiet').update({ mon: row.mon, tinh_trang: row.tinh_trang, ten_bai: row.ten_bai, ghi_chu: row.ghi_chu, day_thay: row.day_thay })
        .eq('id', x.id).select());
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
  function veDieuHanh(el) {
    if (!el) return;
    EL_V = el;
    if (!document.getElementById('sdb-ghi-chu-nhanh')) {
      var dl = document.createElement('datalist'); dl.id = 'sdb-ghi-chu-nhanh';
      dl.innerHTML = GHI_CHU_NHANH.map(function (g) { return '<option value="' + thoat(g) + '">'; }).join('');
      document.body.appendChild(dl);
    }
    batSuKienToi(el);
    var k = V.ngay + '|' + toiEmail();
    if (V.khoa !== k && !V.dangNap) napToi();
    veToi();
  }

  // ══════════════════════════════════════════════════════════════
  // B. LỚP HỌC › SỔ ĐẦU BÀI (sổ tuần của một lớp)
  // ══════════════════════════════════════════════════════════════
  var L = { khoiTao: false, dangNap: false, loi: '', dsLop: [], lopCN: [], lop: '', lopMuon: '', tuan: thuHai(homNayISO()),
    ngay: [], chot: [], khoa: '', dangLuu: false };
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
      return tkbNgay(tu).then(function (dl) {
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
      docGioHetBuoi()
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
    if (!may()) dau += '<div class="hd-kiem vang">🧪 <b>Xem thử</b> — thời khóa biểu và tên người là dữ liệu mẫu. Ghi thử ở Điều hành › Ghi đầu bài rồi quay lại đây xem.</div>';
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
      ' <button type="button" class="dh-nut-nho sdb-in" data-sdbl="in">🖨 In tuần</button></div>';
    var ngayHtml = L.ngay.map(veNgayLop).join('');
    el.innerHTML = dau + tom + ngayHtml + veChotTuan(chotT, d) + veKyThang() + '</div>';
  }

  function veNgayLop(d) {
    var co = d.khung.length || Object.keys(d.ghi).length;
    if (thuCuaNgay(d.ngay) === 7 && !co) return '';
    var khoa1 = chotPhu(d.ngay);
    var dau = '<div class="sdb-ngay-dau"><b>' + TEN_THU[thuCuaNgay(d.ngay)] + ' · ' + ngayVN(d.ngay) + '</b>' +
      (khoa1 ? ' <span class="tkb-chip xanh" title="Đã chốt / ký — không sửa được nữa">🔒 ' + (khoa1.loai === 'thang' ? 'đã ký tháng' : 'đã chốt tuần') + '</span>' : '') +
      (d.nghi ? ' <span class="tkb-chip vang">Nghỉ: ' + thoat(d.nghi.ten || '') + '</span>' : '') + '</div>';
    if (d.nghi && !Object.keys(d.ghi).length) return '<div class="sdb-ngay">' + dau + '</div>';
    if (!co) return '<div class="sdb-ngay">' + dau + '<div class="sdb-trong">Không có tiết theo thời khóa biểu.</div></div>';
    var dong = {};
    d.khung.forEach(function (t) { dong[khoa(t.buoi, t.tiet, t.lop)] = { t: t }; });
    Object.keys(d.ghi).forEach(function (k) {
      var r = d.ghi[k];
      if (!dong[k]) dong[k] = { t: { lop: r.lop, buoi: r.buoi, tiet: r.tiet, mon: r.mon, gvNhan: '' } };
    });
    var ds = Object.keys(dong).map(function (k) { return { k: k, t: dong[k].t, r: d.ghi[k] }; }).sort(function (a, b) {
      return (a.t.buoi === b.t.buoi ? 0 : a.t.buoi === 'sang' ? -1 : 1) || a.t.tiet - b.t.tiet;
    });
    var html = '';
    ['sang', 'chieu'].forEach(function (b) {
      var nhom = ds.filter(function (x) { return x.t.buoi === b; });
      if (!nhom.length) return;
      var ss = d.siSo[b], vg = d.vang[b] || [];
      html += '<tr class="sdb-hang-buoi"><td colspan="4">' + TEN_BUOI[b] +
        (ss || vg.length ? ' · vắng ' + (ss ? ss.so_vang + '/' + ss.si_so : vg.length) +
          (vg.length ? ': ' + vg.map(function (h) { return thoat(h.ten) + (h.phep === 'co_phep' ? ' (P)' : h.phep === 'khong_phep' ? ' (K)' : ''); }).join(', ') : '')
          : ' · chưa điểm danh') + '</td></tr>';
      nhom.forEach(function (x) {
        var r = x.r, t = x.t, o;
        if (r) {
          o = '<td>' + (r.tinh_trang === 'khong_day' ? '<i>Không dạy</i>' + (r.ghi_chu ? ' — ' + thoat(r.ghi_chu) : '') :
            thoat(r.ten_bai) + (r.ghi_chu ? '<div class="sdb-ghi-chu">' + thoat(r.ghi_chu) + '</div>' : '')) + '</td>' +
            '<td class="sdb-cot-ky">' + thoat(r.gv_ten || r.gv_email || '') + '<small>' + kyLuc(r, d.ngay) + '</small>' + chipDong(r) + '</td>';
        } else if (t.tuQuan) {
          o = '<td colspan="2" class="sdb-mo">Lớp tự quản (dạy thay)</td>';
        } else {
          var tre = !d.nghi && (d.ngay < homNayISO() || (d.ngay === homNayISO() && quaHan(d.ngay, t.buoi)));
          o = '<td colspan="2" class="' + (tre ? 'sdb-do' : 'sdb-mo') + '">' + (tre ? 'Chưa ghi' : 'Chưa tới hạn') +
            (t.gvNhan ? ' · ' + thoat(t.gvNhan) : '') + (t.thay ? ' (dạy thay)' : '') + '</td>';
        }
        html += '<tr' + (r ? '' : ' class="chua"') + '><td class="sdb-cot-tiet">' + kiHieu(t.buoi, t.tiet) + '</td><td class="sdb-cot-mon">' + thoat(t.mon) + '</td>' + o + '</tr>';
      });
    });
    return '<div class="sdb-ngay">' + dau + '<div class="sdb-bang-cuon"><table class="sdb-bang"><thead><tr><th>Tiết</th><th>Môn</th><th>Tên bài · ghi chú</th><th>Giáo viên ký</th></tr></thead><tbody>' +
      html + '</tbody></table></div></div>';
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

  // In một tuần — cửa sổ in riêng, A4 dọc, giống trang sổ giấy
  function inTuan() {
    var ten = (window.CAU_HINH && (window.CAU_HINH.TEN_TRUONG || window.CAU_HINH.tenTruong)) || '';
    var bang = L.ngay.map(veNgayLop).join('');
    var c = chotPhu(congNgay(L.tuan, 2), 'tuan'), ky = chotPhu(congNgay(L.tuan, 2), 'thang');
    var w = window.open('', '_blank');
    if (!w) { bao('Trình duyệt chặn cửa sổ in — cho phép cửa sổ bật lên rồi bấm lại.'); return; }
    w.document.write('<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>Sổ ghi đầu bài lớp ' + thoat(L.lop) + '</title><style>' +
      'body{font:12.5px "Times New Roman",serif;margin:14mm;color:#000}h1{font-size:17px;text-align:center;margin:0 0 2px}' +
      '.p{text-align:center;margin:0 0 10px}table{border-collapse:collapse;width:100%;margin:4px 0 10px}td,th{border:1px solid #000;padding:3px 5px;vertical-align:top}' +
      'th{background:#eee}.sdb-ngay-dau{font-weight:700;margin-top:8px}.sdb-hang-buoi td{background:#f4f4f4;font-style:italic}.tkb-chip{font-size:10px;border:1px solid #888;border-radius:6px;padding:0 4px}' +
      'small{display:block;color:#333}.sdb-ghi-chu{font-style:italic}.sdb-do{color:#b00}.ky{display:flex;justify-content:space-around;margin-top:18px;text-align:center}' +
      '@page{size:A4 portrait;margin:12mm}</style></head><body>' +
      '<div class="p">' + thoat(ten) + '</div><h1>SỔ GHI ĐẦU BÀI — LỚP ' + thoat(L.lop) + '</h1>' +
      '<div class="p">Năm học ' + thoat(namHoc()) + ' · Tuần ' + ngayVN(L.tuan) + ' – ' + ngayVN(congNgay(L.tuan, 5)) + '</div>' + bang +
      '<div class="ky"><div>GVCN chốt tuần<br>' + (c ? thoat(c.nguoi_ten || '') + '<br><small>(xác nhận điện tử ' + gioPhut(c.luc) + ' ' + ngayVN(ngayCuaTs(c.luc)) + ')</small>' : '<br><br>') + '</div>' +
      '<div>Ban giám hiệu ký duyệt<br>' + (ky ? thoat(ky.nguoi_ten || '') + '<br><small>(xác nhận điện tử ' + gioPhut(ky.luc) + ' ' + ngayVN(ngayCuaTs(ky.luc)) + ')</small>' : '<br><br>') + '</div></div>' +
      '</body></html>');
    w.document.close();
    setTimeout(function () { try { w.focus(); w.print(); } catch (e) { /* bỏ qua */ } }, 400);
  }

  function batSuKienLop(el) {
    el.addEventListener('click', function (e) {
      var a = e.target.closest ? e.target.closest('[data-sdbl]') : null;
      if (!a || a.tagName === 'SELECT') return;
      var v = a.getAttribute('data-sdbl');
      if (v === 'lui' || v === 'toi' || v === 'nay') {
        var moi = v === 'nay' ? thuHai(homNayISO()) : congNgay(L.tuan, v === 'lui' ? -7 : 7);
        if (moi > thuHai(homNayISO())) return;
        L.tuan = moi; L.ngay = []; napTuan(); veLop();
      } else if (v === 'chot') chot('tuan', L.tuan, congNgay(L.tuan, 6));
      else if (v === 'kyThang') chot('thang', a.getAttribute('data-tu'), a.getAttribute('data-den'));
      else if (v === 'goChot') goChot(a.getAttribute('data-id'));
      else if (v === 'in') inTuan();
    });
    el.addEventListener('change', function (e) {
      var o = e.target;
      if (o.getAttribute && o.getAttribute('data-sdbl') === 'lop') { L.lop = o.value; L.ngay = []; napTuan(); veLop(); }
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
      batSuKienLop(vung);
      if (window.MutationObserver) new MutationObserver(khiHienLop).observe(mh, { attributes: true, attributeFilter: ['class'] });
      khiHienLop();
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', gan); else gan();

  window.SO_DAU_BAI = {
    veDieuHanh: veDieuHanh, moLop: moLop,
    // cho bài thử
    _khungNgay: khungNgay, _tiepTheo: tiepTheo, _goiYTu: goiYTu, _thuHai: thuHai
  };
})();
