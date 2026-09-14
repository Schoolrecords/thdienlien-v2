// ============================================================
// tkb-doc.js — ĐỌC TỆP THỜI KHÓA BIỂU DO SMART SCHEDULER KẾT XUẤT
//
// Nguồn: Smart Scheduler › Hệ thống › Chuyển đổi dữ liệu sang Excel. Tệp có
// 10 trang cố định tên (đã soi tệp thật Diễn Liên 31/7/2026 và Nghi Đồng):
//   PCGD · TKB_LOP_S · TKB_LOP_C · TKB_LOP_SC · TKB_GV_S · TKB_GV_C ·
//   TKB_GV_SC · TKB_PHONGHOC_S · TKB_PHONGHOC_C · TKB_PHONGHOC_SC
// Đọc PCGD (họ tên đầy đủ + phân công) và TKB_LOP_S/C (nguồn từng tiết).
// TKB_GV_S/C chỉ để ĐỐI CHIẾU; *_SC trùng dữ liệu, PHONGHOC tiểu học để trống.
//
// 🔑 Quyết định 14/9/2026 (sổ dự án 91.13): Quản trị số KHÔNG xếp lịch. Lịch
//    xếp trong Smart Scheduler; ở đây chỉ đọc bản đã xếp. Đổi lịch = sửa bên
//    ấy rồi tải lại — không sửa tay trên web, để hai nơi không bao giờ lệch.
//
// Bẫy đã biết (học từ app TKB riêng, docLuoiSS/khopLuoiSS):
//   · Dòng tiêu đề nằm dưới 3–4 dòng tên trường → DÒ dòng "THỨ | TIẾT".
//   · Ô "Thứ" gộp dọc: chỉ dòng đầu của mỗi thứ có số → mang số xuống.
//   · Tiêu đề cột lớp "1A\n(Cô Trinh)" — tên lớp + chủ nhiệm chung một ô.
//   · Ô tiết "Tiếng Việt - Cô Trinh": cắt ở " - " CUỐI (tên môn "LS&ĐL" không
//     có gạch, nhưng giữ lastIndexOf cho chắc).
//   · Tên gọi trùng thì phần mềm tự thêm hậu tố: Cô DungB, Cô LinhA, Cô K.Oanh.
//   · Mỗi trường đặt tên môn một kiểu (TViệt / Tiếng Việt, HĐTN / HDTN).
//
// Thuần JS, không đụng DOM, không gọi máy chủ — chạy được trong Node để thử
// trên tệp thật (thdienlien-v2-tailieu/thu-tkb-doc.js).
// ============================================================
(function (goc) {
  'use strict';

  var TRANG = {
    pcgd: 'PCGD',
    lopS: 'TKB_LOP_S', lopC: 'TKB_LOP_C',
    gvS: 'TKB_GV_S', gvC: 'TKB_GV_C'
  };
  var TEN_10_TRANG = ['PCGD', 'TKB_LOP_S', 'TKB_LOP_C', 'TKB_LOP_SC', 'TKB_GV_S', 'TKB_GV_C',
    'TKB_GV_SC', 'TKB_PHONGHOC_S', 'TKB_PHONGHOC_C', 'TKB_PHONGHOC_SC'];

  function khongDau(s) {
    return String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/đ/g, 'd').replace(/Đ/g, 'D');
  }
  // So khớp không phân biệt dấu, hoa thường, khoảng trắng. Giữ & cho "LS&ĐL".
  function chuan(s) {
    return khongDau(String(s == null ? '' : s).trim().toLowerCase()).replace(/[^a-z0-9&]/g, '');
  }
  function chuanTen(s) {
    return khongDau(String(s == null ? '' : s).trim().toLowerCase()).replace(/\s+/g, ' ');
  }
  function chu(o) { return String(o == null ? '' : o).trim(); }
  // Khoá TÊN GỌI: giữ nguyên dấu, chỉ hạ chữ thường + gộp khoảng trắng. KHÔNG dùng
  // chuan(): 'Cô Thủy' và 'Cô Thùy' là hai người (Diễn Liên 4C, 4D) — bỏ dấu là
  // trùng, máy báo nhầm một người dạy hai lớp cùng tiết (bắt được 14/9/2026).
  function khoaNhan(s) { return String(s == null ? '' : s).normalize('NFC').trim().toLowerCase().replace(/\s+/g, ' '); }

  // Tên gọi trong lưới → phần tên: "Cô DungB" → "dungb", "Thầy Tuấn" → "tuan"
  function boDanhXung(nhan) {
    return chuan(String(nhan || '').replace(/^\s*(cô|thầy|co|thay|cô giáo|thầy giáo)\s+/i, ''));
  }
  function tenGoiCua(hoTen) {
    var p = chu(hoTen).replace(/\s+(HT|PHT|TPT|NV)$/i, '').split(/\s+/);
    return chuan(p[p.length - 1] || '');
  }

  // ── Tiêu đề chung: "Trường tiểu học Diễn Liên\nNăm học 2025 - 2026\nHọc kỳ 1"
  //    và "Thực hiện từ ngày 08 tháng 09 năm 2025" ──
  function docTieuDe(aoa) {
    var kq = { truong: '', namHoc: '', hocKy: null, apDungTu: '' };
    (aoa || []).slice(0, 5).forEach(function (r) {
      (r || []).forEach(function (o) {
        var s = chu(o);
        if (!s) return;
        s.split(/\n/).forEach(function (d) {
          d = d.trim();
          var m;
          if (/^trường/i.test(d) && !kq.truong) kq.truong = d;
          if ((m = d.match(/năm học\s*(\d{4})\s*[-–]\s*(\d{4})/i))) kq.namHoc = m[1] + '-' + m[2];
          if ((m = d.match(/học kỳ\s*(\d)/i))) kq.hocKy = +m[1];
          if ((m = d.match(/ngày\s*(\d{1,2})\s*tháng\s*(\d{1,2})\s*năm\s*(\d{4})/i))) {
            kq.apDungTu = m[3] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2);
          }
        });
      });
    });
    return kq;
  }

  // ── Một lưới (lớp hoặc giáo viên) của một buổi → danh sách ô ──
  // kieu 'lop': cột = lớp, ô "Môn - Cô X"  ·  kieu 'gv': cột = tên gọi, ô "Môn - 1A"
  function docLuoi(aoa, buoi, kieu) {
    var o = [], cot = [], loi = [];
    if (!aoa || !aoa.length) return { o: o, cot: cot, loi: ['Trang trống.'] };
    var dau = -1;
    for (var i = 0; i < Math.min(aoa.length, 15); i++) {
      var r = aoa[i] || [];
      if (chuan(r[0]) === 'thu' && chuan(r[1]) === 'tiet') { dau = i; break; }
    }
    if (dau < 0) return { o: o, cot: cot, loi: ['Không thấy dòng tiêu đề "THỨ | TIẾT".'] };
    (aoa[dau] || []).forEach(function (v, j) {
      if (j < 2) return;
      var s = chu(v);
      if (!s) return;
      var dong = s.split(/\n/);
      var ten = dong[0].trim();
      var cn = '';
      if (kieu === 'lop') {
        // "1A\n(Cô Trinh)" — hoặc cùng dòng "1A (Cô Trinh)"
        var m = s.match(/\(([^)]+)\)/);
        if (m) cn = m[1].trim();
        ten = ten.replace(/\s*\(.*$/, '').trim();
      }
      if (ten) cot.push({ j: j, ten: ten, cn: cn });
    });
    var thu = 0;
    for (var k = dau + 1; k < aoa.length; k++) {
      var d = aoa[k] || [];
      var t0 = chu(d[0]);
      if (t0 !== '' && isFinite(+t0)) thu = +t0;
      var tiet = +chu(d[1]);
      if (!thu || chu(d[1]) === '' || !isFinite(tiet) || tiet < 1) continue;
      cot.forEach(function (c) {
        var s = chu(d[c.j]);
        if (!s) return;
        var v = s.lastIndexOf(' - ');
        var mon = (v < 0 ? s : s.slice(0, v)).trim();
        var ben = v < 0 ? '' : s.slice(v + 3).trim();
        if (kieu === 'lop') o.push({ lop: c.ten, thu: thu, buoi: buoi, tiet: tiet, mon: mon, nhan: ben });
        else o.push({ nhan: c.ten, thu: thu, buoi: buoi, tiet: tiet, mon: mon, lop: ben });
      });
    }
    return { o: o, cot: cot, loi: loi };
  }

  // ── PCGD: TT | Giáo viên | Kiêm nhiệm | CN | Phân công chuyên môn | Số tiết ──
  function docPCGD(aoa) {
    var ds = [], loi = [];
    if (!aoa || !aoa.length) return { ds: ds, loi: ['Không có trang PCGD.'] };
    var dau = -1, cotTen = 1, cotKN = 2, cotCN = 3, cotPC = 4, cotSo = 5;
    for (var i = 0; i < Math.min(aoa.length, 15); i++) {
      var r = (aoa[i] || []).map(chuan);
      var j = r.indexOf('giaovien');
      if (j >= 0) {
        dau = i; cotTen = j;
        r.forEach(function (x, c) {
          if (x === 'kiemnhiem') cotKN = c;
          else if (x === 'cn' || x === 'chunhiem') cotCN = c;
          else if (x.indexOf('phancong') === 0) cotPC = c;
          else if (x === 'sotiet') cotSo = c;
        });
        break;
      }
    }
    if (dau < 0) return { ds: ds, loi: ['Trang PCGD không có cột "Giáo viên".'] };
    for (var k = dau + 1; k < aoa.length; k++) {
      var d = aoa[k] || [];
      var hoTen = chu(d[cotTen]);
      if (!hoTen) continue;
      var pc = chu(d[cotPC]);
      var cap = [];
      // "Tiếng Việt (1A) + Toán (1A)" · "Tiếng Anh (3A, 4C, 4D)"
      pc.split(/\s*\+\s*/).forEach(function (m) {
        var x = m.match(/^(.+?)\s*\(([^)]*)\)\s*$/);
        if (!x) return;
        x[2].split(/\s*,\s*/).forEach(function (lop) {
          if (lop.trim()) cap.push({ mon: x[1].trim(), lop: lop.trim() });
        });
      });
      ds.push({
        hoTen: hoTen, kiemNhiem: chu(d[cotKN]), cn: chu(d[cotCN]),
        phanCong: pc, cap: cap, soTiet: +chu(d[cotSo]) || 0
      });
    }
    return { ds: ds, loi: loi };
  }

  function timTrang(trang, ten) {
    if (trang[ten]) return trang[ten];
    var n = chuan(ten);
    for (var k in trang) if (chuan(k) === n) return trang[k];
    return null;
  }

  // ════════════════════════════════════════════════════════════
  // ĐỌC CẢ TỆP. trang = { 'PCGD': aoa, 'TKB_LOP_S': aoa, … }
  // ════════════════════════════════════════════════════════════
  function docTep(trang) {
    var loi = [], nhac = [];
    var coLopS = timTrang(trang, TRANG.lopS), coLopC = timTrang(trang, TRANG.lopC);
    if (!coLopS && !coLopC) {
      return { loi: ['Tệp không có trang TKB_LOP_S / TKB_LOP_C — có đúng là tệp Smart Scheduler kết xuất ' +
        '(Hệ thống › Chuyển đổi dữ liệu sang Excel) không? Các trang đang có: ' +
        Object.keys(trang).join(', ') + '.'], nhac: [] };
    }
    var tieuDe = docTieuDe(coLopS || coLopC);
    var s = docLuoi(coLopS, 'sang', 'lop'), c = docLuoi(coLopC, 'chieu', 'lop');
    if (coLopS && s.loi.length) loi.push('TKB_LOP_S: ' + s.loi.join(' '));
    if (coLopC && c.loi.length) loi.push('TKB_LOP_C: ' + c.loi.join(' '));
    var tiet = s.o.concat(c.o);

    // Danh sách lớp theo thứ tự cột, kèm tên gọi chủ nhiệm trong tiêu đề
    var lop = [], daCo = {};
    s.cot.concat(c.cot).forEach(function (x) {
      if (daCo[x.ten]) { if (!daCo[x.ten].cn && x.cn) daCo[x.ten].cn = x.cn; return; }
      daCo[x.ten] = { ten: x.ten, cn: x.cn };
      lop.push(daCo[x.ten]);
    });

    var pcgd = docPCGD(timTrang(trang, TRANG.pcgd));
    if (!timTrang(trang, TRANG.pcgd)) nhac.push('Tệp không có trang PCGD — không có họ tên đầy đủ, máy chỉ ghép được theo tên gọi.');
    else if (pcgd.loi.length) nhac.push(pcgd.loi.join(' '));

    // Lưới giáo viên — để đối chiếu, không bắt buộc
    var gvS = timTrang(trang, TRANG.gvS), gvC = timTrang(trang, TRANG.gvC);
    var luoiGV = docLuoi(gvS, 'sang', 'gv').o.concat(docLuoi(gvC, 'chieu', 'gv').o);

    // ── Kiểm tra ──
    if (!tiet.length) loi.push('Không đọc được tiết nào trong lưới lớp — tệp mẫu chưa điền, hay xuất nhầm trang?');
    var trungGV = [], theoGio = {};
    tiet.forEach(function (x) {
      if (!x.nhan) return;
      var k = x.thu + '|' + x.buoi + '|' + x.tiet + '|' + khoaNhan(x.nhan);
      (theoGio[k] = theoGio[k] || []).push(x);
    });
    Object.keys(theoGio).forEach(function (k) {
      var a = theoGio[k];
      if (a.length > 1) {
        trungGV.push(a[0].nhan + ' — thứ ' + a[0].thu + ' ' + (a[0].buoi === 'sang' ? 'sáng' : 'chiều') +
          ' tiết ' + a[0].tiet + ': ' + a.map(function (x) { return x.lop + ' ' + x.mon; }).join(' + '));
      }
    });
    var khongNhan = tiet.filter(function (x) { return !x.nhan; }).length;

    var lech = 0;
    if (luoiGV.length) {
      var tapGV = {};
      luoiGV.forEach(function (x) {
        tapGV[x.thu + '|' + x.buoi + '|' + x.tiet + '|' + khoaNhan(x.nhan) + '|' + chuan(x.lop)] = 1;
      });
      tiet.forEach(function (x) {
        if (x.nhan && !tapGV[x.thu + '|' + x.buoi + '|' + x.tiet + '|' + khoaNhan(x.nhan) + '|' + chuan(x.lop)]) lech++;
      });
      if (lech) nhac.push(lech + ' tiết có trong lưới lớp nhưng không khớp lưới giáo viên — thường do tệp đã sửa tay sau khi xuất. Máy lấy theo lưới LỚP.');
    }

    var nhanDs = [], daNhan = {};
    tiet.forEach(function (x) {
      if (x.nhan && !daNhan[x.nhan]) { daNhan[x.nhan] = 1; nhanDs.push(x.nhan); }
    });

    var coThu7 = tiet.some(function (x) { return x.thu >= 7; });
    return {
      loi: loi, nhac: nhac, tieuDe: tieuDe,
      lop: lop, tiet: tiet, pcgd: pcgd.ds, luoiGV: luoiGV,
      nhan: nhanDs, trungGV: trungGV, khongNhan: khongNhan, lech: lech, coThu7: coThu7,
      coTrangGV: !!(gvS || gvC)
    };
  }

  // ════════════════════════════════════════════════════════════
  // GHÉP TÊN GỌI → HỌ TÊN (PCGD) → TÀI KHOẢN
  //   kq        : kết quả docTep
  //   taiKhoan  : [{ email, ho_ten, co_so_ma }] — danh sách mời của trường
  //   daLuu     : { 'Cô DungB': { email, ho_ten } } — bảng tkb_ten_goi
  // Trả về [{ nhan, hoTen, cachTen, email, cachEmail, soTiet, lopCN, lua:[…] }]
  // KHÔNG đoán mò: ghép không chắc thì để trống cho người nạp chọn tay.
  // ════════════════════════════════════════════════════════════
  function ghepTen(kq, taiKhoan, daLuu) {
    taiKhoan = taiKhoan || []; daLuu = daLuu || {};
    var pcgd = kq.pcgd || [];

    // Dấu vân tay phân công của từng tên gọi (lấy từ lưới LỚP — luôn có)
    var tapNhan = {}, soTietNhan = {};
    kq.tiet.forEach(function (x) {
      if (!x.nhan) return;
      (tapNhan[x.nhan] = tapNhan[x.nhan] || {})[chuan(x.mon) + '|' + chuan(x.lop)] = 1;
      soTietNhan[x.nhan] = (soTietNhan[x.nhan] || 0) + 1;
    });
    var tapPC = pcgd.map(function (p) {
      var t = {};
      p.cap.forEach(function (c) { t[chuan(c.mon) + '|' + chuan(c.lop)] = 1; });
      return t;
    });
    function jaccard(a, b) {
      var chung = 0, hop = 0, k;
      for (k in a) { hop++; if (b[k]) chung++; }
      for (k in b) if (!a[k]) hop++;
      return hop ? chung / hop : 0;
    }

    // Chủ nhiệm: tiêu đề "1A (Cô Trinh)" gặp cột CN = 1A
    var cnCua = {};
    kq.lop.forEach(function (l) { if (l.cn) cnCua[l.cn] = (cnCua[l.cn] || []).concat([l.ten]); });

    var kqGhep = kq.nhan.map(function (nhan) {
      var r = { nhan: nhan, hoTen: '', cachTen: '', email: '', cachEmail: '', soTiet: soTietNhan[nhan] || 0,
        lopCN: (cnCua[nhan] || []).join(', '), pcgdIdx: -1 };

      // 1. Dấu vân tay phân công — chắc nhất, bắt được cả giáo viên bộ môn
      var tot = -1, diem = 0, nhi = 0;
      tapPC.forEach(function (t, i) {
        var d = jaccard(tapNhan[nhan] || {}, t);
        if (d > diem) { nhi = diem; diem = d; tot = i; } else if (d > nhi) nhi = d;
      });
      if (tot >= 0 && diem >= 0.6 && diem - nhi >= 0.2) { r.pcgdIdx = tot; r.cachTen = 'phan-cong'; }

      // 2. Chủ nhiệm
      if (r.pcgdIdx < 0 && cnCua[nhan] && cnCua[nhan].length === 1) {
        var ung = [];
        pcgd.forEach(function (p, i) { if (chuan(p.cn) === chuan(cnCua[nhan][0])) ung.push(i); });
        if (ung.length === 1) { r.pcgdIdx = ung[0]; r.cachTen = 'chu-nhiem'; }
      }

      // 3. Tên gọi = tên cuối của đúng MỘT người
      if (r.pcgdIdx < 0) {
        var ten = boDanhXung(nhan);
        var kh = [];
        pcgd.forEach(function (p, i) { if (tenGoiCua(p.hoTen) === ten) kh.push(i); });
        if (kh.length !== 1 && ten) {
          kh = [];
          pcgd.forEach(function (p, i) { var g = tenGoiCua(p.hoTen); if (g && ten.indexOf(g) === 0) kh.push(i); });
        }
        if (kh.length === 1) { r.pcgdIdx = kh[0]; r.cachTen = 'ten-goi'; }
      }
      if (r.pcgdIdx >= 0) r.hoTen = pcgd[r.pcgdIdx].hoTen;
      return r;
    });

    // Một dòng PCGD không được gán cho hai tên gọi — trùng thì bỏ cả hai, bắt chọn tay
    var dem = {};
    kqGhep.forEach(function (r) { if (r.pcgdIdx >= 0) dem[r.pcgdIdx] = (dem[r.pcgdIdx] || 0) + 1; });
    kqGhep.forEach(function (r) {
      if (r.pcgdIdx >= 0 && dem[r.pcgdIdx] > 1) { r.pcgdIdx = -1; r.hoTen = ''; r.cachTen = ''; }
    });

    // Họ tên → tài khoản
    var theoTen = {};
    taiKhoan.forEach(function (t) {
      var k = chuanTen(String(t.ho_ten || '').replace(/\s+(HT|PHT|TPT)$/i, ''));
      (theoTen[k] = theoTen[k] || []).push(t);
    });
    var coEmail = {};
    taiKhoan.forEach(function (t) { coEmail[String(t.email || '').toLowerCase()] = t; });

    kqGhep.forEach(function (r) {
      var luu = daLuu[r.nhan];
      if (luu && luu.email && coEmail[String(luu.email).toLowerCase()]) {
        r.email = String(luu.email).toLowerCase(); r.cachEmail = 'da-luu';
        if (!r.hoTen) r.hoTen = coEmail[r.email].ho_ten || luu.ho_ten || '';
        return;
      }
      if (!r.hoTen) return;
      var k = chuanTen(r.hoTen.replace(/\s+(HT|PHT|TPT)$/i, ''));
      var ung = theoTen[k] || [];
      if (ung.length === 1) { r.email = String(ung[0].email).toLowerCase(); r.cachEmail = 'ho-ten'; }
      else if (ung.length > 1) r.cachEmail = 'trung-ten';
    });
    return kqGhep;
  }

  // ════════════════════════════════════════════════════════════
  // TỆP MẪU — ĐÚNG 10 TRANG, ĐÚNG VỊ TRÍ Ô NHƯ SMART SCHEDULER KẾT XUẤT
  // opt: { tenTruong, namHoc, hocKy, apDungTu (yyyy-mm-dd), lop:[…], giaoVien:[{hoTen, cn}] }
  // Trả về cấu trúc { ten, sheets } cho window.EXCEL_DEP.tao
  // ════════════════════════════════════════════════════════════
  function mauTep(opt) {
    opt = opt || {};
    var lop = (opt.lop && opt.lop.length) ? opt.lop : ['1A', '1B', '2A', '2B', '3A', '4A', '5A'];
    var gv = (opt.giaoVien && opt.giaoVien.length) ? opt.giaoVien : [];
    var nam = opt.namHoc || '';
    var tieuDe = (opt.tenTruong || 'Trường tiểu học') + '\nNăm học ' + nam.replace('-', ' - ') +
      '\nHọc kỳ ' + (opt.hocKy || 1);
    var ngay = '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(opt.apDungTu || '')) {
      var p = opt.apDungTu.split('-');
      ngay = 'Thực hiện từ ngày ' + p[2] + ' tháng ' + p[1] + ' năm ' + p[0];
    } else ngay = 'Thực hiện từ ngày ... tháng ... năm ...';
    var so = 5; // tiết mỗi buổi

    function o(v, k, x) { var c = { v: v, k: k || 'oL' }; if (x) for (var t in x) c[t] = x[t]; return c; }
    function bo() { return { bo: true }; }

    function dauTrang(soCot, buoiChu) {
      var gopN = Math.max(0, soCot - 6);
      var r1 = [o(tieuDe, 'hdb', { gopN: 4, gopD: 2 }), bo(), bo(), bo(), bo(),
        o('THỜI KHOÁ BIỂU ', 'tt', { gopN: gopN })];
      var r2 = [bo(), bo(), bo(), bo(), bo(), o(buoiChu || '', 'tt2', { gopN: gopN })];
      var r3 = [bo(), bo(), bo(), bo(), bo(), o(ngay, 'tt3', { gopN: gopN })];
      return [{ cao: 22, o: r1 }, { cao: 18, o: r2 }, { cao: 18, o: r3 }, { o: [] }];
    }
    function luoi(ten, buoiChu, cotTen) {
      var soCot = 2 + cotTen.length;
      var rows = dauTrang(soCot, buoiChu);
      rows.push({ cao: 30, o: [o('THỨ', 'dau'), o('TIẾT', 'dau')].concat(cotTen.map(function (t) { return o(t, 'dauW'); })) });
      for (var thu = 2; thu <= 6; thu++) {
        for (var t = 1; t <= so; t++) {
          var r = [t === 1 ? o(thu, 'thu', { so: true, gopD: so - 1 }) : bo(), o(t, 'tiet', { so: true })];
          cotTen.forEach(function () { r.push(o('', 'nhapV')); });
          rows.push({ cao: 18, o: r });
        }
      }
      return { ten: ten, cols: [6, 6].concat(cotTen.map(function () { return 16; })), rows: rows,
        in: { dongBang: 5, cotBang: 2, vuaNgang: true } };
    }
    function luoiSC(ten, cotTen) {
      var soCot = 2 + cotTen.length * 2;
      var rows = dauTrang(soCot, '').slice(0, 3);
      var h1 = [o('THỨ', 'dau', { gopD: 1 }), o('TIẾT', 'dau', { gopD: 1 })];
      var h2 = [bo(), bo()];
      cotTen.forEach(function (t) {
        h1.push(o(String(t).replace(/\n/, ' '), 'dauW', { gopN: 1 })); h1.push(bo());
        h2.push(o('Sáng', 'dau2')); h2.push(o('Chiều', 'dau2'));
      });
      rows.push({ cao: 30, o: h1 }, { o: h2 });
      for (var thu = 2; thu <= 6; thu++) {
        for (var t = 1; t <= so; t++) {
          var r = [t === 1 ? o(thu, 'thu', { so: true, gopD: so - 1 }) : bo(), o(t, 'tiet', { so: true })];
          cotTen.forEach(function () { r.push(o('', 'oL')); r.push(o('', 'oL')); });
          rows.push({ cao: 18, o: r });
        }
      }
      return { ten: ten, cols: [6, 6].concat(cotTen.map(function () { return 14; })).concat(cotTen.map(function () { return 14; })),
        rows: rows, in: { dongBang: 5, cotBang: 2, vuaNgang: true } };
    }

    var cnCua = {};
    gv.forEach(function (g) { if (g.cn) cnCua[g.cn] = g.nhan || ''; });
    var cotLop = lop.map(function (l) { return l + '\n(' + (cnCua[l] || '') + ')'; });
    var cotGV = gv.length ? gv.map(function (g) { return g.nhan || ''; }) : ['', '', '', '', ''];

    var pcRows = [
      { cao: 22, o: [o(tieuDe, 'hdb', { gopN: 2, gopD: 1 }), bo(), bo(), o('BẢNG PHÂN CÔNG GIẢNG DẠY', 'tt', { gopN: 2 })] },
      { cao: 18, o: [bo(), bo(), bo(), o('', 'tt2'), o(''), o(ngay, 'tt3')] },
      { o: [] },
      { cao: 24, o: [o('TT', 'dau'), o('Giáo viên', 'dau'), o('Kiêm nhiệm', 'dau'), o('CN', 'dau'),
        o('Phân công chuyên môn', 'dau'), o('Số tiết', 'dau')] }
    ];
    var dsPC = gv.length ? gv : [{}, {}, {}, {}, {}];
    dsPC.forEach(function (g, i) {
      pcRows.push({ cao: 18, o: [o(i + 1, 'oG', { so: true }), o(g.hoTen || '', 'nhapV'), o('', 'nhapV'),
        o(g.cn || '', 'nhapVG'), o('', 'nhapV'), o('', 'nhapVG')] });
    });
    var pc = { ten: 'PCGD', cols: [5, 26, 14, 7, 70, 8], rows: pcRows, in: { dongBang: 4, doc: false, vuaNgang: true } };

    var cotPhong = ['', '', '', '', '', '', '', '', '', ''];
    return {
      ten: 'MAU-TKB-SmartScheduler-' + (nam || 'nam-hoc') + '.xlsx',
      sheets: [
        pc,
        luoi('TKB_LOP_S', 'BUỔI SÁNG', cotLop), luoi('TKB_LOP_C', 'BUỔI CHIỀU', cotLop), luoiSC('TKB_LOP_SC', lop.map(function (l, i) { return cotLop[i]; })),
        luoi('TKB_GV_S', 'BUỔI SÁNG', cotGV), luoi('TKB_GV_C', 'BUỔI CHIỀU', cotGV), luoiSC('TKB_GV_SC', cotGV),
        luoi('TKB_PHONGHOC_S', 'BUỔI SÁNG', cotPhong), luoi('TKB_PHONGHOC_C', 'BUỔI CHIỀU', cotPhong), luoiSC('TKB_PHONGHOC_SC', cotPhong)
      ]
    };
  }

  var API = {
    TEN_10_TRANG: TEN_10_TRANG,
    chuan: chuan, khongDau: khongDau,
    docTieuDe: docTieuDe, docLuoi: docLuoi, docPCGD: docPCGD,
    docTep: docTep, ghepTen: ghepTen, mauTep: mauTep
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (goc) goc.TKB_DOC = API;
})(typeof window !== 'undefined' ? window : null);
