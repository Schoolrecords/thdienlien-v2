// ============================================================
// cong-khai-tt27.js — ĐẾM kết quả đánh giá học sinh (TT 27/2020) từ tệp Excel CSDL ngành
// cho mục VII "Kết quả năm học trước" của Cổng công khai (TT 09/2024 Điều 9 khoản 2).
// Sổ dự án mục 121.3.
//
// CHỈ ĐẾM — không lưu tên, mã hay kết quả của em nào vào hệ thống: đọc tệp ngay trên máy,
// ra bảng số theo khối (HTXS · HTT · HT · CHT · lên lớp · hoàn thành chương trình), BGH
// xem rồi bấm "Điền vào bảng". Dùng được cả cho năm học của TRƯỜNG TIỀN THÂN (học sinh năm
// đó không có trong CSDL của trường mới) — chọn nhiều tệp một lúc, số được cộng dồn.
//
// Dò cột theo TIÊU ĐỀ (không gắn cứng vị trí): tệp kết xuất của CSDL ngành từng đổi chỗ cột
// giữa các năm, và mẫu tải lên (35 cột, CLAUDE.md) khác tệp kết xuất. Tiêu đề nhiều hàng
// (gộp ô) được nối lại theo cột rồi mới dò.
// window.CK_TT27 = { thongKeBang(hang, tenTep) · docTep(File) → Promise · gop(dsKetQua) }
// ============================================================
(function () {
  'use strict';

  function bo(s) {
    return String(s == null ? '' : s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/đ/g, 'd').replace(/\s+/g, ' ').trim();
  }
  var MAU = {
    ma: /\bma (hoc sinh|hs|dinh danh)\b|^ma hs$|^ma$/,
    ten: /\bho (va )?ten\b/,
    lop: /^lop$|\bma lop\b|\bten lop\b|^lop hoc$/,
    gioi: /gioi tinh/,
    xl: /^xl$|xl|xep loai|khen thuong|danh gia (chung|tong hop|cuoi nam)|ket qua (giao duc|hoc tap|danh gia)|muc dat duoc chung/,
    htct: /hoan thanh chuong trinh (tieu hoc|cap|lop 5)|\bht ?ct( th)?\b|hoan thanh cap/,
    htlop: /hoan thanh chuong trinh lop( hoc)?|\bht ?ct lop\b/,
    len: /len lop/
  };
  function laLop(v) { return /^\s*[1-5]\s*[a-zđ0-9]/i.test(String(v || '')) && String(v).length <= 12; }
  function khoiTu(lop, tenTep) {
    var m = String(lop || '').match(/^\s*([1-5])/);
    if (m) return +m[1];
    m = bo(tenTep).match(/khoi ?_?([1-5])/);
    return m ? +m[1] : null;
  }
  function co(v) {
    var x = bo(v);
    return x === 'x' || x === 'co' || x === '1' || x === 'true' || x === 'da' || x === 'dat' || x === 'hoan thanh' || x === 'ht' || x === 'len lop';
  }
  function xepLoai(v) {
    var x = bo(v);
    if (!x) return '';
    if (x === 'htxs' || /xuat sac/.test(x)) return 'htxs';
    if (x === 'htt' || /hoan thanh tot/.test(x) || /tieu bieu/.test(x)) return 'htt';
    if (x === 'cht' || /chua hoan thanh/.test(x)) return 'cht';
    if (x === 'ht' || /^hoan thanh$/.test(x)) return 'ht';
    return '';
  }

  // hang: mảng hai chiều (sheet_to_json header:1). Trả { khoi: {1:{…},…}, cot: {...}, so_dong, canh_bao[] }
  function thongKeBang(hang, tenTep) {
    var kq = { khoi: {}, cot: {}, so_dong: 0, canh_bao: [], ma: [] };
    if (!hang || !hang.length) return kq;
    // 1. Hàng tiêu đề: hàng đầu tiên (trong 20 hàng) có ô "Mã học sinh"/"Họ và tên"/"Lớp"
    var h = -1;
    for (var i = 0; i < Math.min(20, hang.length) && h < 0; i++) {
      (hang[i] || []).forEach(function (o) { var x = bo(o); if (MAU.ma.test(x) || MAU.ten.test(x)) h = i; });
    }
    if (h < 0) { kq.canh_bao.push('Không thấy hàng tiêu đề (Mã học sinh / Họ và tên)'); return kq; }
    // 2. Nối tiêu đề nhiều hàng: h..h+2, chỉ khi hàng đó KHÔNG phải dữ liệu
    var soCot = 0; hang.forEach(function (r) { soCot = Math.max(soCot, (r || []).length); });
    var dau = [], hetTieuDe = h;
    for (var k = h; k <= h + 2 && k < hang.length; k++) {
      var r = hang[k] || [];
      if (k > h && r.some(laLop)) break;
      hetTieuDe = k;
      for (var j = 0; j < soCot; j++) dau[j] = ((dau[j] || '') + ' ' + bo(r[j])).trim();
    }
    // Ô gộp ngang: tiêu đề cha chỉ nằm ở ô đầu → kéo sang phải cho cột con trống tiêu đề cha
    function timCot(mau, loaiTru) {
      for (var j = 0; j < soCot; j++) if (mau.test(dau[j] || '') && !(loaiTru && loaiTru.test(dau[j] || ''))) return j;
      return -1;
    }
    var c = {
      ma: timCot(MAU.ma), lop: timCot(MAU.lop), gioi: timCot(MAU.gioi),
      xl: timCot(MAU.xl), htct: timCot(MAU.htct), len: timCot(MAU.len), htlop: timCot(MAU.htlop)
    };
    if (c.htct === c.htlop) c.htct = timCot(MAU.htct, MAU.htlop);
    kq.cot = c;
    if (c.lop < 0) {
      // Không có cột lớp: lấy cột đầu tiên có giá trị dạng lớp ở hàng dữ liệu đầu
      var dong1 = hang[hetTieuDe + 1] || [];
      for (var j2 = 0; j2 < dong1.length; j2++) if (laLop(dong1[j2])) { c.lop = j2; break; }
    }
    if (c.xl < 0) kq.canh_bao.push('Không thấy cột xếp loại/khen thưởng (HTXS/HTT/HT/CHT)');
    // 3. Dòng dữ liệu
    var daThay = {};
    for (var d = hetTieuDe + 1; d < hang.length; d++) {
      var row = hang[d] || [];
      var lop = c.lop >= 0 ? String(row[c.lop] || '').trim() : '';
      var ma = c.ma >= 0 ? String(row[c.ma] || '').trim() : '';
      if (!(lop && laLop(lop)) && !ma) continue;
      if (ma && daThay[ma]) continue;
      if (ma) { daThay[ma] = 1; kq.ma.push(ma); }
      var kh = khoiTu(lop, tenTep);
      if (!kh) continue;
      var o = kq.khoi[kh] || (kq.khoi[kh] = { khoi: kh, lop: {}, hoc_sinh: 0, nu: 0, htxs: 0, htt: 0, ht: 0, cht: 0, len_lop: 0, khong_len_lop: 0, hoan_thanh_cth: 0 });
      o.hoc_sinh++;
      if (lop) o.lop[lop.toUpperCase()] = 1;
      if (c.gioi >= 0 && /^nu$/.test(bo(row[c.gioi]))) o.nu++;
      var x = c.xl >= 0 ? xepLoai(row[c.xl]) : '';
      if (x) o[x]++;
      if (c.len >= 0 && kh < 5) { if (co(row[c.len])) o.len_lop++; else o.khong_len_lop++; }
      if (c.htct >= 0 && kh === 5 && co(row[c.htct])) o.hoan_thanh_cth++;
    }
    kq.so_dong = kq.ma.length || Object.keys(kq.khoi).reduce(function (a, k) { return a + kq.khoi[k].hoc_sinh; }, 0);
    kq.co_len = c.len >= 0; kq.co_htct = c.htct >= 0; kq.co_gioi = c.gioi >= 0; kq.co_xl = c.xl >= 0;
    return kq;
  }

  // Cộng nhiều tệp/trang tính (bỏ mã trùng giữa các tệp)
  function gop(ds) {
    var tong = { khoi: {}, so_dong: 0, canh_bao: [], co_len: false, co_htct: false, co_gioi: false, co_xl: false, trung: 0 };
    var ma = {};
    ds.forEach(function (kq) {
      ['co_len', 'co_htct', 'co_gioi', 'co_xl'].forEach(function (k) { tong[k] = tong[k] || kq[k]; });
      tong.canh_bao = tong.canh_bao.concat(kq.canh_bao.map(function (cb) { return (kq.ten ? kq.ten + ': ' : '') + cb; }));
      var trung = kq.ma.filter(function (m) { return ma[m]; }).length;
      if (trung) { tong.trung += trung; tong.canh_bao.push((kq.ten || 'Tệp') + ': ' + trung + ' mã học sinh đã có ở tệp trước — kiểm tra có chọn trùng tệp không'); }
      kq.ma.forEach(function (m) { ma[m] = 1; });
      Object.keys(kq.khoi).forEach(function (k) {
        var a = kq.khoi[k], b = tong.khoi[k] || (tong.khoi[k] = { khoi: +k, lop: {}, hoc_sinh: 0, nu: 0, htxs: 0, htt: 0, ht: 0, cht: 0, len_lop: 0, khong_len_lop: 0, hoan_thanh_cth: 0 });
        Object.keys(a.lop).forEach(function (l) { b.lop[l] = 1; });
        ['hoc_sinh', 'nu', 'htxs', 'htt', 'ht', 'cht', 'len_lop', 'khong_len_lop', 'hoan_thanh_cth'].forEach(function (f) { b[f] += a[f]; });
      });
      tong.so_dong += kq.so_dong;
    });
    Object.keys(tong.khoi).forEach(function (k) { tong.khoi[k].so_lop = Object.keys(tong.khoi[k].lop).length; });
    return tong;
  }

  function napThuVien() {
    if (window.XLSX) return Promise.resolve(window.XLSX);
    return new Promise(function (xong, hong) {
      var s = document.createElement('script');
      s.src = 'lib/xlsx.min.js?v=202608244';
      s.onload = function () { window.XLSX ? xong(window.XLSX) : hong(new Error('Thư viện Excel tải lỗi')); };
      s.onerror = function () { hong(new Error('Không tải được thư viện đọc Excel (lib/xlsx.min.js). Kiểm tra mạng rồi thử lại.')); };
      document.head.appendChild(s);
    });
  }

  // Đọc MỘT tệp (mọi trang tính) → mảng kết quả thongKeBang (mỗi trang một phần tử có dữ liệu)
  function docTep(tep) {
    return napThuVien().then(function (XLSX) {
      return tep.arrayBuffer().then(function (bo2) {
        var wb = XLSX.read(new Uint8Array(bo2), { type: 'array' });
        var ra = [];
        wb.SheetNames.forEach(function (ten) {
          var hang = XLSX.utils.sheet_to_json(wb.Sheets[ten], { header: 1, raw: false, defval: '', blankrows: false });
          var kq = thongKeBang(hang, tep.name + ' ' + ten);
          kq.ten = tep.name + (wb.SheetNames.length > 1 ? ' › ' + ten : '');
          if (kq.so_dong || kq.canh_bao.length) ra.push(kq);
        });
        return ra;
      });
    });
  }

  window.CK_TT27 = { thongKeBang: thongKeBang, gop: gop, docTep: docTep, _bo: bo };
})();
