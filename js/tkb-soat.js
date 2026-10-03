// ============================================================
// tkb-soat.js — SOÁT LỖI + TỰ GỠ TRÙNG THỜI KHÓA BIỂU (thuần, chạy được Node)
//
// 3/10/2026 thầy Chung: "Quản trị sửa TKB, App cảnh báo các vấn đề trong xếp TKB
// như trùng tiết, và tự chạy xếp cho ổn" — "không API, tự App mình sinh ra".
//
// soat(tiet, opt)   → danh sách lỗi theo mức: do (phải sửa) · vang (nên sửa) · nhac (để biết)
// toiUu(tiet, opt)  → các bước ĐỔI CHỖ hai ô CỦA CÙNG MỘT LỚP (tiết ở ô A sang ô B và ngược lại)
//                     sao cho bớt lỗi. Không thêm/bớt tiết, không đổi môn, không đổi người dạy —
//                     phân công giữ nguyên, chỉ dời giờ. Mỗi bước phải giảm điểm phạt và KHÔNG
//                     sinh trùng mới; ô trống chỉ được dùng nếu nằm trong buổi lớp vốn có học.
//
// tiet: [{ lop, thu, buoi:'sang'|'chieu', tiet, mon, gv_nhan }] — gv_nhan là DANH TÍNH giáo viên
//       (bản ghép của tkb-xem.js đã hợp nhất người qua các phân hiệu, nên so bằng gv_nhan là đủ).
// opt:  { lopCoSo:{lop:ma}, dinhMuc:23, tenCoSo:{ma:ten} }
// ============================================================
(function (goc) {
  'use strict';

  var TEN_THU = { 2: 'Thứ Hai', 3: 'Thứ Ba', 4: 'Thứ Tư', 5: 'Thứ Năm', 6: 'Thứ Sáu', 7: 'Thứ Bảy', 8: 'Chủ nhật' };
  function khongDau(s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase(); }
  function tenBuoi(b) { return b === 'sang' ? 'sáng' : 'chiều'; }
  function moTaO(o) { return TEN_THU[o.thu] + ' ' + tenBuoi(o.buoi) + ' tiết ' + o.tiet; }
  function khoaO(o) { return o.thu + '|' + o.buoi + '|' + o.tiet; }
  function khoiCua(lop) { var m = String(lop || '').match(/^\s*(\d+)/); return m ? +m[1] : 0; }

  // Môn → mã chuẩn. Mỗi trường gõ một kiểu ("LS&ĐL", "Sử-Địa", "Lịch sử và Địa lí"…)
  function maMon(mon) {
    var m = khongDau(mon).replace(/[^a-z&]/g, '');
    if (/^(tiengviet|tviet|tv)$/.test(m)) return 'tv';
    if (/^toan/.test(m)) return 'toan';
    if (/anh|ngoaingu|nngu/.test(m)) return 'anh';
    if (/daoduc|dduc/.test(m)) return 'dd';
    if (/tnxh|tunhien/.test(m)) return 'tnxh';
    if (/khoahoc/.test(m)) return 'kh';
    if (/lichsu|lsdl|ls&dl|sudia|diali|dialy/.test(m)) return 'lsdl';
    if (/tinhoc|thoc/.test(m)) return 'tin';
    if (/congnghe|^cn$/.test(m)) return 'cn';
    if (/amnhac|nhac/.test(m)) return 'an';
    if (/mythuat|mithuat/.test(m)) return 'mt';
    if (/gdtc|thechat|theduc/.test(m)) return 'gdtc';
    if (/hdtn|trainghiem|chaoco|shl|sinhhoat/.test(m)) return 'hdtn';
    return '';
  }
  var TEN_MA = { tv: 'Tiếng Việt', toan: 'Toán', anh: 'Tiếng Anh', dd: 'Đạo đức', tnxh: 'Tự nhiên và Xã hội', kh: 'Khoa học',
    lsdl: 'Lịch sử và Địa lí', tin: 'Tin học', cn: 'Công nghệ', an: 'Âm nhạc', mt: 'Mĩ thuật', gdtc: 'Giáo dục thể chất', hdtn: 'Hoạt động trải nghiệm' };
  // Số tiết/tuần TỐI THIỂU các môn bắt buộc — Chương trình GDPT 2018 (TT 32/2018), cấp tiểu học.
  // Tiếng Anh lớp 1, 2 là tự chọn → không soát. Trường thêm tiết tăng cường thì chỉ dư, không báo.
  var CHUAN = {
    1: { tv: 12, toan: 3, dd: 1, tnxh: 2, an: 1, mt: 1, gdtc: 2, hdtn: 3 },
    2: { tv: 10, toan: 5, dd: 1, tnxh: 2, an: 1, mt: 1, gdtc: 2, hdtn: 3 },
    3: { tv: 7, toan: 5, anh: 4, dd: 1, tnxh: 2, tin: 1, cn: 1, an: 1, mt: 1, gdtc: 2, hdtn: 3 },
    4: { tv: 7, toan: 5, anh: 4, dd: 1, lsdl: 2, kh: 2, tin: 1, cn: 1, an: 1, mt: 1, gdtc: 2, hdtn: 3 },
    5: { tv: 7, toan: 5, anh: 4, dd: 1, lsdl: 2, kh: 2, tin: 1, cn: 1, an: 1, mt: 1, gdtc: 2, hdtn: 3 }
  };
  var DINH_MUC = 23;   // tiết/tuần, giáo viên tiểu học (TT 05/2025/TT-BGDĐT)

  // ════════════════════════════════════════════════════════════
  // SOÁT
  // ════════════════════════════════════════════════════════════
  // Mỗi lỗi: { ma, muc, tieuDe, chiTiet, lop?, gv?, o?, cacLop? }
  var LOAI = {
    'trung-gv':   ['do',   'Giáo viên trùng tiết'],
    'trung-lop':  ['do',   'Một lớp hai tiết cùng giờ'],
    'hai-diem':   ['vang', 'Dạy hai điểm trường trong cùng một buổi'],
    'thieu-tiet': ['vang', 'Thiếu tiết so với chương trình'],
    'don-ngay':   ['vang', 'Môn ít tiết dồn vào một ngày'],
    'lo-tiet':    ['vang', 'Lớp có tiết trống giữa buổi'],
    'dinh-muc':   ['nhac', 'Vượt định mức tiết dạy'],
    'thieu-gv':   ['nhac', 'Tiết chưa ghi giáo viên']
  };

  function soat(tiet, opt) {
    opt = opt || {};
    var dinhMuc = opt.dinhMuc || DINH_MUC, lopCoSo = opt.lopCoSo || {}, tenCoSo = opt.tenCoSo || {};
    var loi = [];
    function them(ma, x) { x.ma = ma; x.muc = LOAI[ma][0]; x.loai = LOAI[ma][1]; loi.push(x); }

    // 1. Giáo viên trùng tiết · lớp hai tiết một ô
    var theoGVO = {}, theoLopO = {};
    tiet.forEach(function (x) {
      var k = khoaO(x);
      if (x.gv_nhan) (theoGVO[x.gv_nhan + '#' + k] = theoGVO[x.gv_nhan + '#' + k] || []).push(x);
      (theoLopO[x.lop + '#' + k] = theoLopO[x.lop + '#' + k] || []).push(x);
    });
    Object.keys(theoGVO).forEach(function (k) {
      var a = theoGVO[k];
      if (a.length < 2) return;
      var x = a[0];
      them('trung-gv', { gv: x.gv_nhan, o: { thu: x.thu, buoi: x.buoi, tiet: x.tiet }, cacLop: a.map(function (y) { return y.lop; }),
        tieuDe: x.gv_nhan + ' — ' + moTaO(x), chiTiet: a.map(function (y) { return y.lop + ' ' + y.mon; }).join(' + ') });
    });
    Object.keys(theoLopO).forEach(function (k) {
      var a = theoLopO[k];
      if (a.length < 2) return;
      them('trung-lop', { lop: a[0].lop, o: { thu: a[0].thu, buoi: a[0].buoi, tiet: a[0].tiet },
        tieuDe: 'Lớp ' + a[0].lop + ' — ' + moTaO(a[0]), chiTiet: a.map(function (y) { return y.mon; }).join(' + ') });
    });

    // 2. Giáo viên dạy hai điểm trường trong cùng buổi (trường sáp nhập: phải đi lại giữa hai nơi)
    var dsCS = {}; Object.keys(lopCoSo).forEach(function (l) { if (lopCoSo[l]) dsCS[lopCoSo[l]] = 1; });
    if (Object.keys(dsCS).length > 1) {
      var gvBuoi = {};
      tiet.forEach(function (x) {
        var cs = lopCoSo[x.lop]; if (!x.gv_nhan || !cs) return;
        var k = x.gv_nhan + '#' + x.thu + '|' + x.buoi;
        (gvBuoi[k] = gvBuoi[k] || {})[cs] = (gvBuoi[k][cs] || []).concat([x.lop]);
      });
      Object.keys(gvBuoi).forEach(function (k) {
        var cs = Object.keys(gvBuoi[k]); if (cs.length < 2) return;
        var p = k.split('#'), o = p[1].split('|');
        them('hai-diem', { gv: p[0], o: { thu: +o[0], buoi: o[1], tiet: 0 },
          tieuDe: p[0] + ' — ' + TEN_THU[+o[0]] + ' ' + tenBuoi(o[1]),
          chiTiet: cs.map(function (c) { return (tenCoSo[c] || c) + ': ' + gvBuoi[k][c].join(', '); }).join(' · ') });
      });
    }

    // 3. Thiếu tiết theo chương trình · 4. môn ít tiết dồn một ngày · 5. lỗ giữa buổi
    var theoLop = {};
    tiet.forEach(function (x) { (theoLop[x.lop] = theoLop[x.lop] || []).push(x); });
    Object.keys(theoLop).forEach(function (lop) {
      var ds = theoLop[lop], chuan = CHUAN[khoiCua(lop)], dem = {}, ngay = {};
      ds.forEach(function (x) {
        var m = maMon(x.mon); if (!m) return;
        dem[m] = (dem[m] || 0) + 1;
        (ngay[m] = ngay[m] || {})[x.thu] = (ngay[m][x.thu] || 0) + 1;
      });
      if (chuan) Object.keys(chuan).forEach(function (m) {
        var co = dem[m] || 0;
        if (co < chuan[m]) them('thieu-tiet', { lop: lop, tieuDe: 'Lớp ' + lop + ' — ' + TEN_MA[m],
          chiTiet: 'có ' + co + ' tiết/tuần, chương trình tối thiểu ' + chuan[m] });
      });
      Object.keys(ngay).forEach(function (m) {
        if (m === 'tv' || m === 'toan' || (dem[m] || 0) > 2) return;
        Object.keys(ngay[m]).forEach(function (t) {
          if (ngay[m][t] >= 2) them('don-ngay', { lop: lop, o: { thu: +t, buoi: '', tiet: 0 }, tieuDe: 'Lớp ' + lop + ' — ' + TEN_MA[m],
            chiTiet: 'cả ' + ngay[m][t] + ' tiết/tuần đều vào ' + TEN_THU[+t] + ' — nên rải ra các ngày' });
        });
      });
      var buoi = {};
      ds.forEach(function (x) { (buoi[x.thu + '|' + x.buoi] = buoi[x.thu + '|' + x.buoi] || []).push(x.tiet); });
      Object.keys(buoi).forEach(function (k) {
        var a = buoi[k].slice().sort(function (p, q) { return p - q; }), lo = [];
        for (var t = a[0] + 1; t < a[a.length - 1]; t++) if (a.indexOf(t) < 0) lo.push(t);
        if (lo.length) { var p = k.split('|');
          them('lo-tiet', { lop: lop, o: { thu: +p[0], buoi: p[1], tiet: lo[0] }, tieuDe: 'Lớp ' + lop + ' — ' + TEN_THU[+p[0]] + ' ' + tenBuoi(p[1]),
            chiTiet: 'trống tiết ' + lo.join(', ') + ' giữa buổi' }); }
      });
    });

    // 6. Định mức · 7. tiết chưa ghi giáo viên
    var soTiet = {};
    tiet.forEach(function (x) { if (x.gv_nhan) soTiet[x.gv_nhan] = (soTiet[x.gv_nhan] || 0) + 1; });
    Object.keys(soTiet).forEach(function (g) {
      if (soTiet[g] > dinhMuc) them('dinh-muc', { gv: g, tieuDe: g, chiTiet: soTiet[g] + ' tiết/tuần (định mức ' + dinhMuc + ', vượt ' + (soTiet[g] - dinhMuc) + ')' });
    });
    var khongGV = {};
    tiet.forEach(function (x) { if (!x.gv_nhan && x.mon) (khongGV[x.lop] = khongGV[x.lop] || []).push(x); });
    Object.keys(khongGV).forEach(function (l) {
      them('thieu-gv', { lop: l, tieuDe: 'Lớp ' + l, chiTiet: khongGV[l].length + ' tiết không ghi người dạy (' +
        khongGV[l].slice(0, 3).map(function (x) { return x.mon + ' ' + moTaO(x).replace('tiết ', 't'); }).join('; ') + (khongGV[l].length > 3 ? '…' : '') + ')' });
    });

    var THU_TU = { do: 0, vang: 1, nhac: 2 };
    loi.sort(function (a, b) { return THU_TU[a.muc] - THU_TU[b.muc] || String(a.tieuDe).localeCompare(String(b.tieuDe), 'vi', { numeric: true }); });
    var dem = { do: 0, vang: 0, nhac: 0 };
    loi.forEach(function (x) { dem[x.muc]++; });
    return { loi: loi, dem: dem };
  }

  // ════════════════════════════════════════════════════════════
  // TỰ GỠ TRÙNG / SẮP LẠI CHO GỌN — leo đồi bằng phép đổi chỗ hai ô trong MỘT lớp
  // ════════════════════════════════════════════════════════════
  // Điểm phạt: trùng giáo viên 1000 · hai điểm trường cùng buổi 40 · môn ít tiết dồn một ngày 10 ·
  // lỗ giữa buổi 8 · môn Toán/Tiếng Việt quá 2 tiết một buổi 3.
  var PHAT = { trung: 1000, haiDiem: 40, donNgay: 10, lo: 8, nang: 3 };

  // Phạt chia hai phần để khi đổi chỗ chỉ tính lại phần bị đụng (một lớp + vài giáo viên),
  // không tính lại cả trường 1.200 tiết mỗi phép thử — điện thoại cũng chạy kịp.
  function phatLop(ds) {
    var p = 0, demMon = {}, monNgay = {}, buoi = {}, nang = {};
    ds.forEach(function (x) {
      var m = maMon(x.mon);
      if (m) {
        demMon[m] = (demMon[m] || 0) + 1;
        monNgay[m + '#' + x.thu] = (monNgay[m + '#' + x.thu] || 0) + 1;
        if (m === 'tv' || m === 'toan') nang[m + '#' + x.thu + x.buoi] = (nang[m + '#' + x.thu + x.buoi] || 0) + 1;
      }
      (buoi[x.thu + x.buoi] = buoi[x.thu + x.buoi] || []).push(x.tiet);
    });
    Object.keys(monNgay).forEach(function (k) {
      var m = k.split('#')[0];
      if (m !== 'tv' && m !== 'toan' && demMon[m] <= 2 && monNgay[k] >= 2) p += PHAT.donNgay;
    });
    Object.keys(buoi).forEach(function (k) {
      var a = buoi[k], mx = Math.max.apply(null, a), mn = Math.min.apply(null, a);
      p += PHAT.lo * Math.max(0, (mx - mn + 1) - a.length);
    });
    Object.keys(nang).forEach(function (k) { if (nang[k] > 2) p += PHAT.nang * (nang[k] - 2); });
    return p;
  }
  // { phat, trung } của MỘT giáo viên (ds = mọi tiết của người đó)
  function phatGV(ds, lopCoSo) {
    var o = {}, b = {}, trung = 0, p = 0;
    ds.forEach(function (x) {
      var k = khoaO(x); o[k] = (o[k] || 0) + 1;
      var cs = lopCoSo[x.lop]; if (cs) (b[x.thu + x.buoi] = b[x.thu + x.buoi] || {})[cs] = 1;
    });
    Object.keys(o).forEach(function (k) { if (o[k] > 1) trung += o[k] - 1; });
    Object.keys(b).forEach(function (k) { var n = Object.keys(b[k]).length; if (n > 1) p += PHAT.haiDiem * (n - 1); });
    return { phat: p + PHAT.trung * trung, trung: trung };
  }
  function nhom(tiet, f) { var r = {}; tiet.forEach(function (x) { var k = f(x); if (k) (r[k] = r[k] || []).push(x); }); return r; }
  function diem(tiet, lopCoSo) {
    lopCoSo = lopCoSo || {};
    var p = 0, l = nhom(tiet, function (x) { return x.lop; }), g = nhom(tiet, function (x) { return x.gv_nhan; });
    Object.keys(l).forEach(function (k) { p += phatLop(l[k]); });
    Object.keys(g).forEach(function (k) { p += phatGV(g[k], lopCoSo).phat; });
    return p;
  }
  function soTrung(tiet) {
    var n = 0, g = nhom(tiet, function (x) { return x.gv_nhan; });
    Object.keys(g).forEach(function (k) { n += phatGV(g[k], {}).trung; });
    return n;
  }

  // Ô được phép dùng của một lớp: mọi ô lớp đang có tiết + ô trống trong buổi lớp vốn học
  // (từ tiết 1 tới tiết cuối lớp đó học trong buổi ấy). Không mở buổi mới cho lớp.
  function oCuaLop(ds) {
    var buoi = {}, ra = [];
    ds.forEach(function (x) { var k = x.thu + '|' + x.buoi; buoi[k] = Math.max(buoi[k] || 0, x.tiet); });
    Object.keys(buoi).forEach(function (k) {
      var p = k.split('|');
      for (var t = 1; t <= buoi[k]; t++) ra.push({ thu: +p[0], buoi: p[1], tiet: t });
    });
    return ra;
  }
  // Tiết KHÔNG tự dời: Hoạt động trải nghiệm (gồm chào cờ đầu tuần, sinh hoạt lớp cuối tuần — giờ chung
  // của cả trường) — trừ khi chính tiết đó đang trùng giáo viên.
  function coDinh(x) { return maMon(x.mon) === 'hdtn'; }

  // opt.cheDo: 'trung' (chỉ gỡ trùng giáo viên — mặc định) | 'gon' (gỡ trùng rồi sắp cho gọn)
  //   opt.ghim: { 'lop|thu|buoi|tiet': true } ô không được đụng · opt.toiDa: số bước tối đa
  // Trả về { buoc:[{lop, a:{thu,buoi,tiet}, b:{…}, xa:{mon,gv_nhan}|null, xb:…, lyDo}], truoc, sau, trungTruoc, trungSau, tiet }
  function toiUu(tietVao, opt) {
    opt = opt || {};
    var lopCoSo = opt.lopCoSo || {}, ghim = opt.ghim || {}, cheDo = opt.cheDo || 'trung', toiDa = opt.toiDa || 60;
    var tiet = tietVao.map(function (x) { return { lop: x.lop, thu: x.thu, buoi: x.buoi, tiet: x.tiet, mon: x.mon, gv_nhan: x.gv_nhan || '' }; });
    var truoc = diem(tiet, lopCoSo), trungTruoc = soTrung(tiet), hienTai = truoc, trungNay = trungTruoc, buoc = [];
    var theoLop = nhom(tiet, function (x) { return x.lop; }), theoGV = nhom(tiet, function (x) { return x.gv_nhan; });
    var oLop = {}; Object.keys(theoLop).forEach(function (l) { oLop[l] = oCuaLop(theoLop[l]); });
    function tietTai(lop, o) { return theoLop[lop].filter(function (x) { return x.thu === o.thu && x.buoi === o.buoi && x.tiet === o.tiet; })[0] || null; }
    function dangTrung(x) { return !!(x && x.gv_nhan && theoGV[x.gv_nhan].some(function (y) { return y !== x && y.thu === x.thu && y.buoi === x.buoi && y.tiet === x.tiet; })); }
    function bi(lop, o) {
      if (ghim[lop + '|' + khoaO(o)]) return true;
      var x = tietTai(lop, o);
      return !!(x && coDinh(x) && !dangTrung(x));
    }
    function doi(lop, a, b) {
      var xa = tietTai(lop, a), xb = tietTai(lop, b);
      if (xa) { xa.thu = b.thu; xa.buoi = b.buoi; xa.tiet = b.tiet; }
      if (xb) { xb.thu = a.thu; xb.buoi = a.buoi; xb.tiet = a.tiet; }
    }
    // Phạt phần bị đụng khi đổi hai ô của lớp: chính lớp đó + giáo viên của hai tiết
    function phatCuc(lop, xs) {
      var p = phatLop(theoLop[lop]), tr = 0, da = {};
      xs.forEach(function (x) {
        if (!x || !x.gv_nhan || da[x.gv_nhan]) return; da[x.gv_nhan] = 1;
        var r = phatGV(theoGV[x.gv_nhan], lopCoSo); p += r.phat; tr += r.trung;
      });
      return { p: p, tr: tr };
    }
    // Ô cần xét: ô đang trùng giáo viên; chế độ "gọn" thêm ô của lớp/người đang có lỗi gọn
    function ungVien() {
      var ra = [];
      tiet.forEach(function (x) { if (dangTrung(x)) ra.push({ lop: x.lop, o: { thu: x.thu, buoi: x.buoi, tiet: x.tiet } }); });
      if (cheDo === 'gon' && !ra.length) {
        soat(tiet, { lopCoSo: lopCoSo }).loi.forEach(function (l) {
          if (l.ma === 'don-ngay' || l.ma === 'lo-tiet') theoLop[l.lop].filter(function (x) { return x.thu === l.o.thu; }).forEach(function (x) { ra.push({ lop: x.lop, o: { thu: x.thu, buoi: x.buoi, tiet: x.tiet } }); });
          if (l.ma === 'hai-diem') theoGV[l.gv].filter(function (x) { return x.thu === l.o.thu && x.buoi === l.o.buoi; }).forEach(function (x) { ra.push({ lop: x.lop, o: { thu: x.thu, buoi: x.buoi, tiet: x.tiet } }); });
        });
      }
      var thay = {}, gon = [];
      ra.forEach(function (u) { var k = u.lop + '|' + khoaO(u.o); if (!thay[k]) { thay[k] = 1; gon.push(u); } });
      return gon.slice(0, 60);
    }
    for (var vong = 0; vong < toiDa; vong++) {
      var uv = ungVien(), tot = null;
      if (!uv.length) break;
      uv.forEach(function (u) {
        if (bi(u.lop, u.o)) return;
        oLop[u.lop].forEach(function (b) {
          if ((b.thu === u.o.thu && b.buoi === u.o.buoi && b.tiet === u.o.tiet) || bi(u.lop, b)) return;
          var hai = [tietTai(u.lop, u.o), tietTai(u.lop, b)];
          var cu = phatCuc(u.lop, hai);
          doi(u.lop, u.o, b);
          var moi = phatCuc(u.lop, hai);
          doi(u.lop, b, u.o);
          var d = hienTai - cu.p + moi.p, tr = trungNay - cu.tr + moi.tr;
          // Không bao giờ đổi lấy trùng mới: số trùng không được tăng; điểm phải giảm thật
          if (tr > trungNay || d >= hienTai) return;
          // Hoà điểm thì ưu tiên đổi trong cùng ngày, cùng buổi (thầy cô ít phải nhớ lại)
          var gan = (b.thu === u.o.thu ? 0 : 1) + (b.buoi === u.o.buoi ? 0 : 1);
          if (!tot || d < tot.d || (d === tot.d && gan < tot.gan)) tot = { d: d, tr: tr, lop: u.lop, a: u.o, b: b, gan: gan };
        });
      });
      if (!tot) break;
      var xa = tietTai(tot.lop, tot.a), xb = tietTai(tot.lop, tot.b);
      doi(tot.lop, tot.a, tot.b);
      buoc.push({ lop: tot.lop, a: tot.a, b: tot.b,
        xa: xa ? { mon: xa.mon, gv_nhan: xa.gv_nhan } : null, xb: xb ? { mon: xb.mon, gv_nhan: xb.gv_nhan } : null,
        lyDo: tot.tr < trungNay ? 'gỡ trùng' : 'cho gọn', diemTruoc: hienTai, diemSau: tot.d });
      hienTai = tot.d; trungNay = tot.tr;
    }
    return { buoc: buoc, truoc: truoc, sau: hienTai, trungTruoc: trungTruoc, trungSau: soTrung(tiet), tiet: tiet };
  }

  // Một bước → câu đọc được: "1E: Mĩ thuật (Cô Hương) Thứ Tư sáng tiết 2 ⇄ Toán (Cô Vinh) Thứ Năm sáng tiết 3"
  function moTaBuoc(b) {
    function ve(x) { return x ? x.mon + (x.gv_nhan ? ' (' + x.gv_nhan + ')' : '') : '(ô trống)'; }
    return b.lop + ': ' + ve(b.xa) + ' ' + moTaO(b.a) + ' ⇄ ' + ve(b.xb) + ' ' + moTaO(b.b);
  }

  var API = { soat: soat, toiUu: toiUu, diem: diem, soTrung: soTrung, moTaBuoc: moTaBuoc, moTaO: moTaO, maMon: maMon,
    CHUAN: CHUAN, LOAI: LOAI, DINH_MUC: DINH_MUC };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (goc) goc.TKB_SOAT = API;
})(typeof window !== 'undefined' ? window : null);
