// ============================================================
// hocsinh.js — TRANG "LỚP HỌC" (trước 28/9/2026 tên "Quản lý học sinh")
//
// Mã màn VẪN là `hocsinh` (#mh-hocsinh, #hocsinh trên địa chỉ) để không gãy
// liên kết cũ — chỉ chữ hiển thị đổi thành "Lớp học".
//
// Ba thẻ con: Tổng quan (mặc định) · Sổ chủ nhiệm · Sổ đầu bài (sắp có).
// Thầy Hiệu phó chốt 28/9/2026: mở trang là thấy TỔNG THỂ trên một màn — dải số
// liệu + bảng lớp, mỗi dòng có sẵn lối vào Sổ chủ nhiệm / Sổ đầu bài; bảng tổng
// hợp điểm trường × khối thu gọn ở dưới. Thẻ Sổ chủ nhiệm là màn #mh-sochunhiem (so-chu-nhiem.js) — màn đó
// vẽ CÙNG hàng thẻ này ở đầu qua window.LOP_HOC_THE('sochunhiem') để người dùng
// thấy một trang liền mạch.
//
// QUYỀN SỔ CHỦ NHIỆM (thầy chốt 28/9/2026): chỉ Quản trị, BGH và GVCN của đúng
// lớp đó được XEM; chỉ GVCN lớp đó được SỬA. GV bộ môn, nhân viên không thấy lối
// vào. TỔ TRƯỞNG/TỔ PHÓ được BGH giao kiểm tra (bảng scn_nguoi_duyet, sql/71) thấy
// lối "Sổ chủ nhiệm" ở lớp thuộc khối được giao — bấm vào chỉ mở màn KIỂM TRA
// (bản chụp đã lọc), không mở sổ gốc. Cột thao tác hiện nhỏ trạng thái kỳ nộp gần
// nhất. Ẩn/hiện ở đây chỉ cho gọn — hàng rào thật là RLS sql/69 + sql/71.
//
// Nguồn: hoc_sinh_lop ⋈ hoc_sinh · phan_cong_day (GVCN) · lop_hoc (cơ sở).
//
// Ba nguyên tắc bê từ Bạch Liêu (giữ nguyên từ bản cũ):
//  1. KHÔNG bịa số. Đọc lỗi thì hiện băng cảnh báo nói thẳng, không im lặng để
//     bảng trống trông như "trường chưa có học sinh".
//  2. Năm học mở mặc định là năm CÓ DỮ LIỆU, không phải năm hiện hành. Hệ thống
//     đang ở 2026-2027 mà dữ liệu nạp là 2025-2026 thì cứ lấy năm hiện hành sẽ
//     ra màn trống trơn, người dùng tưởng mất dữ liệu.
//  3. Đổi năm mà lỗi thì TRẢ CẢ biến năm LẪN ô chọn về như cũ — không để ô chọn
//     một đằng số liệu một nẻo, vì năm học in cả lên bản danh sách.
//
// Luật Bảo vệ dữ liệu cá nhân 2025: số định danh cá nhân nằm ở bảng riêng (hoc_sinh_dinh_danh),
// màn này KHÔNG đọc và KHÔNG hiện.
// ============================================================
(function () {
  'use strict';

  function thoat(s) { return window.thoatHTML ? window.thoatHTML(s) : String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return '&#' + c.charCodeAt(0) + ';'; }); }
  function $(s) { return document.querySelector(s); }
  function boDau(s) {
    return window.boDau ? window.boDau(s || '')
      : String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
  }

  var NAM = '';
  var CAC_NAM = [];
  var LOP = {};        // '1A' -> { khoi, coSo, coSoMa, em: [...] }
  var CN = {};         // '1A' -> 'Nguyễn Thị A'
  var CN_ID = {};      // '1A' -> [nguoi_dung_id,…] (để nhận "Lớp của tôi")
  var NHIEU_CS = false;
  var LOP_TOI = [];    // lớp người đang xem làm GVCN (năm đang xem)
  var TO_TOI = [];     // dòng giao kiểm tra sổ của người đang xem (scn_nguoi_duyet, sql/71)
  var DUYET = {};      // '4A' -> lần nộp sổ chủ nhiệm gần nhất (scn_nop, RLS lọc theo quyền)
  var THE = 'tong-quan';
  var GOP_MO = false;   // bảng tổng hợp điểm trường × khối đang mở?
  var LOC = { cs: '', khoi: '', tim: '' };
  var SAP = { cot: 'lop', chieu: 1 };
  var TRANG_THAI = 'dang-doc';   // dang-doc · xong · loi
  var LOI_CHU = '';
  var daNoi = false;
  var XEM_THU = false;

  // ── Đọc hết bảng lớn theo trang 1000 dòng (mẫu chung của dự án) ──
  // BẮT BUỘC có .order(): PostgREST không hứa thứ tự nào cả nếu truy vấn
  // không sắp xếp, nên phân trang bằng .range() có thể lấy lặp dòng của
  // trang trước và bỏ sót dòng khác — sĩ số sai mà không có dấu hiệu gì.
  // Một năm 863 em thì chưa chạm trần; thêm năm học nữa là lộ ngay.
  function taiHet(bang, cot, loc) {
    var ket = [], tu = 0, buoc = 1000;
    function trang() {
      var q = window.MAY_CHU.from(bang).select(cot).order('id').range(tu, tu + buoc - 1);
      (loc || []).forEach(function (l) { q = q.eq(l[0], l[1]); });
      return q.then(function (r) {
        if (r.error) throw r.error;
        var d = r.data || [];
        ket = ket.concat(d);
        if (d.length < buoc) return ket;
        tu += buoc;
        return trang();
      });
    }
    return trang();
  }

  function ngayVN(d) {
    if (!d) return '';
    var p = String(d).slice(0, 10).split('-');
    return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : String(d);
  }

  // Danh sách lớp ở Việt Nam sắp theo TÊN (chữ cuối) rồi mới đến họ đệm —
  // sắp thẳng cả cụm họ tên sẽ ra thứ tự lạ với thầy cô.
  function sapTen(a, b) {
    var ta = a.ho_ten.trim().split(/\s+/), tb = b.ho_ten.trim().split(/\s+/);
    var t = ta[ta.length - 1].localeCompare(tb[tb.length - 1], 'vi');
    return t || a.ho_ten.localeCompare(b.ho_ten, 'vi');
  }
  function sapLop(a, b) { return String(a).localeCompare(String(b), 'vi', { numeric: true }); }

  function canhBao(chu, loai) {
    var o = $('#hs-canh');
    if (!o) return;
    if (!chu) { o.innerHTML = ''; return; }
    o.innerHTML = '<div class="hd-kiem ' + (loai || 'vang') + '">' + chu + '</div>';
  }

  // ══════════ NẠP DỮ LIỆU THẬT ══════════
  function tai() {
    var may = window.MAY_CHU;
    return taiHet('hoc_sinh_lop', 'nam_hoc')
      .then(function (ds) {
        var co = {};
        ds.forEach(function (d) { if (d.nam_hoc) co[d.nam_hoc] = 1; });
        CAC_NAM = Object.keys(co).sort().reverse();
        if (!NAM) {
          var hienHanh = window.CAU_HINH.NAM_HOC;
          NAM = (co[hienHanh] ? hienHanh : CAC_NAM[0]) || hienHanh || '';
        }
        if (!CAC_NAM.length) return [];
        return taiHet('hoc_sinh_lop',
          'hoc_sinh_ma, lop, khoi, trang_thai, hoc_sinh(ma, ho_ten, ngay_sinh, gioi_tinh, khuyet_tat_hoa_nhap)',
          [['nam_hoc', NAM]]);
      })
      .then(function (ds) {
        var moi = {};
        (ds || []).forEach(function (d) {
          if (d.trang_thai && d.trang_thai !== 'dang_hoc') return;   // chuyển đi / thôi học
          var h = d.hoc_sinh;
          if (!h) return;
          if (!moi[d.lop]) moi[d.lop] = { khoi: d.khoi, coSo: '', coSoMa: '', em: [] };
          moi[d.lop].em.push(h);
        });
        Object.keys(moi).forEach(function (l) { moi[l].em.sort(sapTen); });

        // GVCN và cơ sở đều là thông tin PHỤ — đọc lỗi thì bỏ qua, không chặn màn
        return Promise.all([
          moi,
          may.from('phan_cong_day')
            .select('lop, nguoi_dung_id, nguoi_dung:nguoi_dung_id(ho_ten)')
            .eq('nam_hoc', NAM).eq('la_chu_nhiem', true)
            .then(function (r) { return r.error ? [] : (r.data || []); }, function () { return []; }),
          // gvcn_ten = GVCN DỰ KIẾN (sql/70). Trường chưa chạy sql/70 thì cột chưa có →
          // đọc lại không có cột đó, kẻo mất luôn tên điểm trường.
          may.from('lop_hoc').select('lop, co_so_ma, gvcn_ten, co_so:co_so_ma(ten)')
            .eq('nam_hoc', NAM)
            .then(function (r) {
              if (!r.error) return r.data || [];
              return may.from('lop_hoc').select('lop, co_so_ma, co_so:co_so_ma(ten)').eq('nam_hoc', NAM)
                .then(function (r2) { return r2.error ? [] : (r2.data || []); });
            }, function () { return []; }),
          // Sổ chủ nhiệm — nộp kiểm tra (sql/71): phụ, lỗi (chưa chạy 71) thì bỏ qua
          may.from('scn_nop').select('lop, ky, lan, trang_thai, nop_luc').eq('nam_hoc', NAM).order('id').limit(5000)
            .then(function (r) { return r.error ? [] : (r.data || []); }, function () { return []; }),
          may.from('scn_nguoi_duyet').select('email, khoi, co_so_ma, ten_to').eq('nam_hoc', NAM)
            .then(function (r) { return r.error ? [] : (r.data || []); }, function () { return []; })
        ]);
      })
      .then(function (kq) {
        // Chỉ gán vào biến chung khi đã đọc XONG cả ba nguồn — đổi năm hỏng giữa
        // chừng thì màn vẫn giữ nguyên số của năm cũ, khớp với ô chọn được trả về.
        LOP = kq[0];
        CN = {}; CN_ID = {};
        (kq[1] || []).forEach(function (p) {
          if (p.nguoi_dung && p.nguoi_dung.ho_ten) CN[p.lop] = p.nguoi_dung.ho_ten;
          if (p.nguoi_dung_id) (CN_ID[p.lop] = CN_ID[p.lop] || []).push(p.nguoi_dung_id);
        });
        var nhieuCoSo = {};
        (kq[2] || []).forEach(function (l) {
          if (LOP[l.lop]) {
            LOP[l.lop].coSoMa = l.co_so_ma || '';
            LOP[l.lop].cnDuKien = l.gvcn_ten || '';
            if (l.co_so && l.co_so.ten) LOP[l.lop].coSo = l.co_so.ten;
          }
          if (l.co_so_ma) nhieuCoSo[l.co_so_ma] = 1;
        });
        // Chỉ hiện cột / ô lọc điểm trường khi trường THỰC SỰ có nhiều cơ sở —
        // một cơ sở mà dán nhãn khắp nơi thì chỉ tổ rối mắt.
        NHIEU_CS = Object.keys(nhieuCoSo).length >= 2;
        var u = window.NGUOI_DUNG;
        LOP_TOI = u && u.id ? Object.keys(CN_ID).filter(function (l) {
          return LOP[l] && CN_ID[l].indexOf(u.id) >= 0;
        }).sort(sapLop) : [];
        var em = String((u && u.email) || '').trim().toLowerCase();
        TO_TOI = (kq[4] || []).filter(function (d) { return String(d.email || '').toLowerCase() === em; });
        DUYET = napDuyet(kq[3] || []);
      });
  }

  // Lần nộp gần nhất của mỗi lớp (bỏ lần đã bị thay) — để hiện trạng thái nhỏ
  function napDuyet(ds) {
    var ra = {};
    ds.forEach(function (n) {
      if (n.trang_thai === 'thay_the') return;
      var cu = ra[n.lop];
      if (!cu || String(n.nop_luc) > String(cu.nop_luc)) ra[n.lop] = n;
    });
    return ra;
  }
  var KY_NGAN = { 'hk1': 'HK I', 'ca-nam': 'Cả năm' };
  var TT_NGAN = { da_nop: 'chờ kiểm tra', da_kiem_tra: 'đã kiểm tra', yeu_cau_bo_sung: 'cần bổ sung', da_duyet: 'đã duyệt' };
  var TT_DAI = { da_nop: 'Đã nộp, chờ kiểm tra', da_kiem_tra: 'Đã kiểm tra', yeu_cau_bo_sung: 'Yêu cầu bổ sung', da_duyet: 'Đã duyệt' };
  function oDuyet(lop) {
    var n = DUYET[lop];
    if (!n || !coTheXemSo(lop)) return '';
    var ky = KY_NGAN[n.ky] || ('T' + String(n.ky).replace('thang-', ''));
    return '<span class="lh-duyet' + (n.trang_thai === 'yeu_cau_bo_sung' ? ' bo-sung' : '') + '" title="Sổ chủ nhiệm — ' + thoat(ky === 'HK I' ? 'cuối học kỳ I' : ky === 'Cả năm' ? 'cuối năm' : 'tháng ' + ky.slice(1)) +
      ' (lần ' + n.lan + '): ' + thoat(TT_DAI[n.trang_thai] || n.trang_thai) + ' · nộp ' + ngayVN(n.nop_luc) + '">' + thoat(ky) + ' · ' + thoat(TT_NGAN[n.trang_thai] || n.trang_thai) + '</span>';
  }

  // ══════════ DỮ LIỆU MẪU (chế độ xem thử, !window.MAY_CHU) ══════════
  // Tên đều là tên giả, sinh cố định (không ngẫu nhiên mỗi lần tải). Lớp 4A
  // trùng 14 em của sổ chủ nhiệm mẫu để bấm "Mở sổ chủ nhiệm" thấy khớp.
  var HO = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Võ', 'Đặng', 'Bùi', 'Đỗ', 'Hồ', 'Ngô', 'Dương'];
  var DEM_NAM = ['Văn', 'Minh', 'Đức', 'Quốc', 'Gia', 'Hữu', 'Thành', 'Anh'];
  var DEM_NU = ['Thị', 'Ngọc', 'Thu', 'Khánh', 'Bảo', 'Mai', 'Phương', 'Thảo'];
  var TEN_NAM = ['An', 'Bình', 'Cường', 'Dũng', 'Huy', 'Khang', 'Long', 'Nam', 'Phúc', 'Quân', 'Sơn', 'Tuấn', 'Việt', 'Kiệt'];
  var TEN_NU = ['Anh', 'Chi', 'Diệp', 'Giang', 'Hà', 'Linh', 'My', 'Ngân', 'Nhi', 'Oanh', 'Trang', 'Vy', 'Yến', 'Hương'];
  var TEN_4A = ['Lê Minh An', 'Trần Bảo Châu', 'Phạm Gia Huy', 'Hoàng Ngọc Diệp', 'Vũ Đức Minh', 'Đặng Thu Hà', 'Bùi Quốc Khánh',
    'Đỗ Khánh Linh', 'Ngô Tuấn Kiệt', 'Hồ Mai Phương', 'Dương Thành Nam', 'Lý Hải Yến', 'Mai Xuân Phúc', 'Tạ Thảo Vy'];
  var LOP_MAU = [
    ['1A', 'CS01', 'Nguyễn Thị Hằng'], ['1B', 'CS01', 'Trần Thị Lan'], ['1C', 'CS02', 'Lê Thị Thu'],
    ['2A', 'CS01', 'Phạm Thị Nga'], ['2B', 'CS02', 'Hoàng Văn Tâm'],
    ['3A', 'CS01', 'Võ Thị Mai'], ['3B', 'CS01', ''],
    ['4A', 'CS01', 'Giáo viên mẫu A'], ['4B', 'CS01', 'Đặng Thị Hoa'], ['4C', 'CS02', 'Giáo viên mẫu C'],
    ['5A', 'CS01', 'Bùi Thị Hạnh'], ['5B', 'CS02', '']
  ];
  var CS_MAU = { CS01: 'Điểm trường chính (mẫu)', CS02: 'Phân hiệu (mẫu)' };
  function pad(n) { return ('0' + n).slice(-2); }
  function napMau() {
    var y = parseInt(String(NAM).slice(0, 4), 10) || 2026, hat = 7;
    function ngau(n) { hat = (hat * 9301 + 49297) % 233280; return Math.floor(hat / 233280 * n); }
    LOP = {}; CN = {}; CN_ID = {};
    LOP_MAU.forEach(function (x) {
      var lop = x[0], khoi = +lop.charAt(0), em = [];
      if (lop === '4A') {
        em = TEN_4A.map(function (t, i) {
          return { ma: 'MAU' + pad(i + 1), ho_ten: t, ngay_sinh: (y - 9) + '-' + pad(i % 12 + 1) + '-' + pad(i * 2 + 1),
            gioi_tinh: i % 2 ? 'Nữ' : 'Nam', khuyet_tat_hoa_nhap: i === 6 };
        });
      } else {
        var si = 24 + ngau(10);
        for (var i = 0; i < si; i++) {
          var nu = ngau(2) === 1;
          em.push({
            ma: 'MAU' + lop + pad(i + 1),
            ho_ten: HO[ngau(HO.length)] + ' ' + (nu ? DEM_NU[ngau(DEM_NU.length)] : DEM_NAM[ngau(DEM_NAM.length)]) + ' ' +
              (nu ? TEN_NU[ngau(TEN_NU.length)] : TEN_NAM[ngau(TEN_NAM.length)]),
            ngay_sinh: (y - 5 - khoi) + '-' + pad(1 + ngau(12)) + '-' + pad(1 + ngau(28)),
            gioi_tinh: nu ? 'Nữ' : 'Nam',
            khuyet_tat_hoa_nhap: ngau(45) === 0
          });
        }
      }
      em.sort(sapTen);
      LOP[lop] = { khoi: khoi, coSo: CS_MAU[x[1]], coSoMa: x[1], em: em };
      if (x[2]) CN[lop] = x[2];
    });
    NHIEU_CS = true;
    LOP_TOI = ['4A'];   // khớp sổ chủ nhiệm mẫu (người xem thử "chủ nhiệm" 4A)
    // khớp thẻ Kiểm tra – Duyệt mẫu của so-chu-nhiem.js
    DUYET = { '4A': { lop: '4A', ky: 'thang-9', lan: 1, trang_thai: 'da_kiem_tra', nop_luc: y + '-09-26T15:05:00+07:00' },
      '4C': { lop: '4C', ky: 'thang-9', lan: 1, trang_thai: 'da_nop', nop_luc: y + '-09-27T16:40:00+07:00' } };
    TO_TOI = [];
    CAC_NAM = [NAM];
  }

  // ══════════ HÀNG THẺ CON DÙNG CHUNG ══════════
  // so-chu-nhiem.js gọi window.LOP_HOC_THE('sochunhiem') để vẽ đúng đầu trang
  // này lên màn sổ. `phai` là HTML đặt bên phải tiêu đề (ô chọn năm học).
  // 29/9/2026: thẻ "Sổ chủ nhiệm" chỉ hiện với BGH/Quản trị + GVCN; thẻ "Kiểm tra sổ"
  // (danh sách sổ đã nộp của nhiều lớp) chỉ hiện với BGH/Quản trị + tổ trưởng/tổ phó
  // được giao. GV bộ môn, nhân viên chỉ thấy Tổng quan. so-chu-nhiem.js biết vai sớm
  // hơn (đọc ngay khi mở sổ) thì báo qua window.SCN_QUYEN.
  var CAC_THE = [['tong-quan', 'Tổng quan'], ['sochunhiem', 'Sổ chủ nhiệm'], ['kiemtra', 'Kiểm tra sổ'], ['sodaubai', 'Sổ đầu bài']];
  var TEN_THE = { sochunhiem: 'Sổ chủ nhiệm', kiemtra: 'Kiểm tra sổ' };
  function quyenSo() {
    var vt = (window.NGUOI_DUNG || {}).vai_tro || '', q = window.SCN_QUYEN || {};
    var bgh = XEM_THU || vt === 'admin' || vt === 'ban_giam_hieu';
    return { so: bgh || LOP_TOI.length > 0 || !!q.gvcn, kiemTra: bgh || TO_TOI.length > 0 || !!q.toKT };
  }
  window.LOP_HOC_QUYEN = quyenSo;
  // Đường dẫn vị trí trên màn sổ / màn kiểm tra: màn đó tự có tiêu đề và thẻ con
  // riêng, nên KHÔNG vẽ lại tiêu đề "Lớp học" + hàng thẻ (hai tầng thẻ chồng nhau
  // chiếm nửa màn điện thoại). Về trang Lớp học bằng chữ "Lớp học" ở đây.
  window.LOP_HOC_VET = function (ma) {
    return '<nav class="lh-vet" aria-label="Vị trí"><a href="#" data-lh-ve="home">Trang chủ</a><span>/</span>' +
      '<a href="#hocsinh" data-lh-the="tong-quan">Lớp học</a><span>/</span><b>' + (TEN_THE[ma] || 'Sổ chủ nhiệm') + '</b></nav>';
  };
  window.LOP_HOC_THE = function (maDangChon, phai) {
    if (maDangChon === 'sochunhiem' || maDangChon === 'kiemtra') return '<div class="lh-dau">' + window.LOP_HOC_VET(maDangChon) + '</div>';
    var q = quyenSo();
    return '<div class="lh-dau">' +
      '<nav class="lh-vet" aria-label="Vị trí"><a href="#" data-lh-ve="home">Trang chủ</a><span>/</span><b>Lớp học</b></nav>' +
      '<div class="lh-dau-hang"><h2>Lớp học</h2>' + (phai ? '<div class="lh-dau-phai">' + phai + '</div>' : '') + '</div>' +
      '<div class="lh-the" role="tablist">' + CAC_THE.filter(function (t) {
        return t[0] === 'sochunhiem' ? q.so : t[0] === 'kiemtra' ? q.kiemTra : true;
      }).map(function (t) {
        if (t[0] === 'sodaubai') {
          return '<button type="button" class="lh-the-mo" data-lh-the="sodaubai" aria-disabled="true" title="Chức năng đang xây dựng">' +
            t[1] + ' <small>sắp có</small></button>';
        }
        return '<button type="button" role="tab" data-lh-the="' + t[0] + '"' +
          (t[0] === maDangChon ? ' class="on" aria-selected="true"' : ' aria-selected="false"') + '>' + t[1] + '</button>';
      }).join('') + '</div></div>';
  };

  function moThe(ma) {
    if (ma === 'sodaubai') {
      if (window.notify) window.notify('Sổ đầu bài điện tử đang được xây dựng — chưa dùng được.');
      return;
    }
    if (ma === 'sochunhiem') {
      if (window.SO_CHU_NHIEM && window.SO_CHU_NHIEM.moLop) window.SO_CHU_NHIEM.moLop();
      else if (window.chuyenManHinh) window.chuyenManHinh('sochunhiem');
      return;
    }
    if (ma === 'kiemtra') {
      if (window.SO_CHU_NHIEM && window.SO_CHU_NHIEM.moKiemTra) window.SO_CHU_NHIEM.moKiemTra();
      else if (window.chuyenManHinh) window.chuyenManHinh('sochunhiem');
      return;
    }
    THE = ma;
    var mh = document.getElementById('mh-hocsinh');
    if (mh && !mh.classList.contains('hien') && window.chuyenManHinh) window.chuyenManHinh('hocsinh');
    ve();
  }

  function moSo(lop) {
    window.dongDsHs();
    if (window.SO_CHU_NHIEM && window.SO_CHU_NHIEM.moLop) window.SO_CHU_NHIEM.moLop(lop);
    else if (window.chuyenManHinh) window.chuyenManHinh('sochunhiem');
  }

  // Ai được mở sổ chủ nhiệm của lớp này: Quản trị, BGH, GVCN đúng lớp — và tổ
  // trưởng/tổ phó được giao kiểm tra lớp đó (mở màn kiểm tra, không mở sổ gốc).
  function laToKiemTra(lop) {
    var d = LOP[lop];
    return !!d && TO_TOI.some(function (g) {
      return (g.khoi || []).map(Number).indexOf(+d.khoi) >= 0 && (!g.co_so_ma || g.co_so_ma === d.coSoMa);
    });
  }
  function duocXuatDs(lop) {
    if (XEM_THU) return true;
    var vt = (window.NGUOI_DUNG || {}).vai_tro || '';
    return vt === 'admin' || vt === 'ban_giam_hieu' || LOP_TOI.indexOf(lop) >= 0;
  }
  function coTheXemSo(lop) {
    if (XEM_THU) return true;
    var u = window.NGUOI_DUNG, vt = u ? u.vai_tro : '';
    return vt === 'admin' || vt === 'ban_giam_hieu' || LOP_TOI.indexOf(lop) >= 0 || laToKiemTra(lop);
  }
  function oSo(lop) {
    if (!coTheXemSo(lop)) return '';
    var chiKiemTra = !XEM_THU && laToKiemTra(lop) && LOP_TOI.indexOf(lop) < 0 && !/^(admin|ban_giam_hieu)$/.test((window.NGUOI_DUNG || {}).vai_tro || '');
    return '<button type="button" class="lh-lien" data-lh-scn="' + thoat(lop) + '"' + (chiKiemTra ? ' title="Mở màn kiểm tra sổ (bản đã lọc) của lớp thuộc tổ"' : '') + '>Sổ chủ nhiệm</button>';
  }
  var O_SDB = '<span class="lh-sap-co" title="Chức năng đang xây dựng">Sổ đầu bài <small>sắp có</small></span>';

  // Bắt bấm trên CẢ trang (hàng thẻ còn nằm ở màn sổ chủ nhiệm)
  document.addEventListener('click', function (e) {
    var t = e.target && e.target.closest ? e.target : null;
    if (!t) return;
    var a = t.closest('[data-lh-the]');
    if (a) { e.preventDefault(); moThe(a.getAttribute('data-lh-the')); return; }
    a = t.closest('[data-lh-ve]');
    if (a) { e.preventDefault(); if (window.chuyenManHinh) window.chuyenManHinh(a.getAttribute('data-lh-ve')); return; }
    var mh = document.getElementById('mh-hocsinh');
    if (!mh || !mh.contains(t)) return;
    a = t.closest('[data-lh-scn]');
    if (a) { e.preventDefault(); moSo(a.getAttribute('data-lh-scn')); return; }
    a = t.closest('[data-lh-sap]');
    if (a) {
      var c = a.getAttribute('data-lh-sap');
      SAP = { cot: c, chieu: SAP.cot === c ? -SAP.chieu : 1 };
      veKetQua(); return;
    }
    a = t.closest('[data-lh-lop]');
    if (a) { e.preventDefault(); veDsHs(a.getAttribute('data-lh-lop')); }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { var o = $('#hs-phu'); if (o && o.classList.contains('on')) window.dongDsHs(); return; }
    if (e.key !== 'Enter' && e.key !== ' ') return;
    var t = e.target;
    if (t && t.classList && t.classList.contains('lh-dong') && t.getAttribute('data-lh-lop')) {
      e.preventDefault(); veDsHs(t.getAttribute('data-lh-lop'));
    }
  });

  // ══════════ TÍNH ══════════
  function demLop(l) {
    var d = LOP[l], nam = 0, nu = 0, hn = 0;
    d.em.forEach(function (h) {
      if (h.gioi_tinh === 'Nam') nam++; else if (h.gioi_tinh === 'Nữ') nu++;
      if (h.khuyet_tat_hoa_nhap) hn++;
    });
    return { lop: l, khoi: d.khoi, coSo: d.coSo, coSoMa: d.coSoMa, gvcn: CN[l] || '', gvcnDK: d.cnDuKien || '', siSo: d.em.length, nam: nam, nu: nu, hn: hn };
  }

  function dsCoSo() {
    var co = {};
    Object.keys(LOP).forEach(function (l) { if (LOP[l].coSoMa) co[LOP[l].coSoMa] = LOP[l].coSo || LOP[l].coSoMa; });
    return Object.keys(co).sort().map(function (m) { return [m, co[m]]; });
  }

  // Lọc theo điểm trường · khối · ô tìm. Ô tìm khớp tên lớp, tên GVCN hoặc tên
  // một học sinh trong lớp — gõ không dấu cũng được ("nguyen van an").
  function locLop() {
    var tu = boDau(LOC.tim).trim();
    var ra = [];
    Object.keys(LOP).forEach(function (l) {
      var d = LOP[l];
      if (NHIEU_CS && LOC.cs && d.coSoMa !== LOC.cs) return;
      if (LOC.khoi && String(d.khoi) !== LOC.khoi) return;
      var khopHs = [];
      if (tu) {
        var khopLop = boDau(l).indexOf(tu) >= 0 || boDau('lop ' + l).indexOf(tu) >= 0 || boDau(CN[l]).indexOf(tu) >= 0;
        d.em.forEach(function (h) { if (boDau(h.ho_ten).indexOf(tu) >= 0) khopHs.push(h.ho_ten); });
        if (!khopLop && !khopHs.length) return;
      }
      var x = demLop(l); x.khopHs = khopHs; ra.push(x);
    });
    return ra;
  }

  function tong(ds) {
    var t = { lop: ds.length, hs: 0, nu: 0, hn: 0, chuaCN: 0 };
    ds.forEach(function (x) { t.hs += x.siSo; t.nu += x.nu; t.hn += x.hn; if (!x.gvcn && !x.gvcnDK) t.chuaCN++; });
    return t;
  }

  // ══════════ VẼ ══════════
  function oNam() {
    var hienHanh = window.CAU_HINH && window.CAU_HINH.NAM_HOC;
    // Ba năm học (trước · nay · sau) LUÔN có mặt, cộng thêm mọi năm đã có dữ
    // liệu — hàm dùng chung ở cauhinh.js.
    var ds = window.baNamHoc
      ? window.baNamHoc(CAC_NAM.concat([NAM]))
      : (function () {
          var t = CAC_NAM.slice();
          if (hienHanh && t.indexOf(hienHanh) < 0) t.push(hienHanh);
          if (NAM && t.indexOf(NAM) < 0) t.push(NAM);
          return t.sort().reverse();
        })();
    return '<label class="lh-nam" for="hs-nam"><span>Năm học</span><select id="hs-nam">' + ds.map(function (n) {
      return '<option value="' + thoat(n) + '"' + (n === NAM ? ' selected' : '') + '>' + thoat(n) + '</option>';
    }).join('') + '</select></label>';
  }

  function ve() {
    var vung = $('#vung-lophoc');
    if (!vung) return;
    vung.innerHTML = window.LOP_HOC_THE(THE, NAM ? oNam() : '') +
      '<div id="hs-canh"></div><div id="lh-than"></div>';
    var o = $('#hs-nam');
    if (o) o.addEventListener('change', doiNam);

    if (TRANG_THAI === 'loi') { canhBao(LOI_CHU, 'do'); return; }
    if (TRANG_THAI === 'dang-doc') { $('#lh-than').innerHTML = '<p class="lh-cho">Đang đọc dữ liệu…</p>'; return; }
    // Đang xem năm KHÁC năm học hiện hành thì phải nói rõ, kẻo thầy cô tưởng
    // số liệu này là của năm nay.
    var hienHanh = window.CAU_HINH && window.CAU_HINH.NAM_HOC;
    if (NAM && hienHanh && NAM !== hienHanh) {
      canhBao('Đang xem năm học <b>' + thoat(NAM) + '</b>. Năm học hiện hành của hệ thống là <b>' +
        thoat(hienHanh) + '</b>' + (CAC_NAM.indexOf(hienHanh) < 0 ? ' — năm đó chưa có dữ liệu học sinh.' : '.'));
    }
    if (!Object.keys(LOP).length) { veTrong(); return; }
    veDanhSach();
  }

  function veTrong() {
    $('#lh-than').innerHTML = '<div class="hs-trong"><b>Chưa có dữ liệu học sinh cho năm học ' + thoat(NAM) + '</b>' +
      'Danh sách học sinh nhập ở <b>Quản trị → Danh sách học sinh</b>, hoặc chuyển sang năm học khác ' +
      'nếu dữ liệu đã nạp cho năm trước.<br><br>' +
      // ⚠️ Đừng dự phòng bằng số của Diễn Liên. `0 || 25` trong JavaScript ra
      //    25, mà trường chưa khai quy mô thì để 0 — nên câu này từng khẳng
      //    định chắc nịch "25 lớp / 863 học sinh" với MỌI trường chưa khai,
      //    kể cả bản xem thử. Chưa có số thì im lặng, đừng nói bừa.
      (window.CAU_HINH.SO_LOP && window.CAU_HINH.SO_HOC_SINH
        ? 'Nhà trường có <b>' + window.CAU_HINH.SO_LOP + ' lớp</b> và <b>' +
          window.CAU_HINH.SO_HOC_SINH + ' học sinh</b> — hai số này lấy từ cấu hình trường, ' +
          'chưa phải số đếm từ danh sách thật.'
        : 'Nhà trường chưa khai quy mô (số lớp, số học sinh) trong phần cấu hình.') +
      '</div>';
  }

  // ── Thẻ Tổng quan: thanh lọc · dải số · lớp của tôi · bảng lớp · tổng hợp ──
  function veDanhSach() {
    var cs = dsCoSo();
    $('#lh-than').innerHTML = '<div class="lh-loc">' +
      (NHIEU_CS ? '<select id="lh-loc-cs" aria-label="Điểm trường"><option value="">Tất cả điểm trường</option>' +
        cs.map(function (c) { return '<option value="' + thoat(c[0]) + '"' + (LOC.cs === c[0] ? ' selected' : '') + '>' + thoat(c[1]) + '</option>'; }).join('') +
        '</select>' : '') +
      '<select id="lh-loc-khoi" aria-label="Khối"><option value="">Tất cả khối</option>' +
      [1, 2, 3, 4, 5].map(function (k) { return '<option value="' + k + '"' + (LOC.khoi === String(k) ? ' selected' : '') + '>Khối ' + k + '</option>'; }).join('') +
      '</select>' +
      '<input type="search" id="lh-tim" aria-label="Tìm" placeholder="Tìm lớp, giáo viên chủ nhiệm, học sinh…" autocomplete="off" value="' + thoat(LOC.tim) + '">' +
      '</div><div id="lh-kq"></div>' +
      '<details class="lh-gop" id="lh-gop"' + (GOP_MO ? ' open' : '') + '><summary>Tổng hợp theo ' +
      (NHIEU_CS ? 'điểm trường và khối' : 'khối') + '</summary><div id="lh-gop-than">' + bangTongHop() + '</div></details>';
    $('#lh-gop').addEventListener('toggle', function () { GOP_MO = this.open; });
    var o = $('#lh-loc-cs');
    if (o) o.addEventListener('change', function () { LOC.cs = this.value; veKetQua(); });
    $('#lh-loc-khoi').addEventListener('change', function () { LOC.khoi = this.value; veKetQua(); });
    // Chỉ vẽ lại vùng kết quả — vẽ lại cả thanh lọc là ô tìm mất con trỏ.
    $('#lh-tim').addEventListener('input', function () { LOC.tim = this.value; veKetQua(); });
    veKetQua();
  }

  function giaTriSap(x, c) {
    if (c === 'coSo') return x.coSo || '';
    if (c === 'gvcn') return x.gvcn || x.gvcnDK || '￿';     // chưa có GVCN xếp cuối
    if (c === 'siSo') return x.siSo;
    if (c === 'nu') return x.nu;
    if (c === 'hn') return x.hn;
    return x.lop;
  }

  function veKetQua() {
    var o = $('#lh-kq');
    if (!o) return;
    var ds = locLop(), t = tong(ds), coLoc = !!(LOC.cs || LOC.khoi || LOC.tim.trim());
    var h = '<dl class="lh-so">' +
      [[t.lop, 'Lớp'], [t.hs, 'Học sinh'], [t.nu, 'Nữ'], [t.hn, 'Hoà nhập'], [t.chuaCN, 'Lớp chưa có GVCN']].map(function (x, i) {
        return '<div' + (i === 4 && x[0] ? ' class="canh"' : '') + '><dt>' + x[1] + '</dt><dd>' + x[0] + '</dd></div>';
      }).join('') + '</dl>' +
      (coLoc ? '<p class="lh-ghi">Số liệu theo bộ lọc đang chọn.</p>' : '');

    // "Lớp của tôi" — người đang xem là GVCN (năm đang xem)
    LOP_TOI.filter(function (l) { return LOP[l]; }).forEach(function (l) {
      h += '<div class="lh-cua-toi"><span class="nhan">Lớp của tôi</span><b>Lớp ' + thoat(l) + '</b>' +
        '<span>' + LOP[l].em.length + ' học sinh</span>' +
        '<button type="button" class="lh-lien" data-lh-scn="' + thoat(l) + '">Mở sổ chủ nhiệm</button>' +
        '<button type="button" class="lh-lien" data-lh-lop="' + thoat(l) + '">Danh sách học sinh</button></div>';
    });

    if (!ds.length) {
      o.innerHTML = h + '<p class="lh-rong">Không có lớp nào khớp bộ lọc.</p>';
      return;
    }

    var cot = [['lop', 'Lớp']];
    if (NHIEU_CS) cot.push(['coSo', 'Điểm trường']);
    cot.push(['gvcn', 'Giáo viên chủ nhiệm'], ['siSo', 'Sĩ số', 'so'], ['nu', 'Nam / Nữ', 'so'], ['hn', 'Hoà nhập', 'so']);
    var soCot = cot.length + 2;   // + cột TT + cột thao tác
    var stt = 0;                  // đánh số LIỀN cả trang, không đếm lại theo khối (thầy Chung 28/9/2026)

    // Nhóm theo khối; trong khối sắp theo cột người dùng chọn
    var theoKhoi = {};
    ds.forEach(function (x) { (theoKhoi[x.khoi] = theoKhoi[x.khoi] || []).push(x); });
    function so(a, b) {
      // Sắp theo lớp: trong khối gom theo ĐIỂM TRƯỜNG trước (thầy Chung 28/9/2026)
      // — 1A, 1A1, 1A2 của ba điểm xen kẽ nhau rất khó đọc.
      if (SAP.cot === 'lop' && NHIEU_CS && a.coSoMa !== b.coSoMa) {
        return String(a.coSoMa || '').localeCompare(String(b.coSoMa || '')) * SAP.chieu;
      }
      var va = giaTriSap(a, SAP.cot), vb = giaTriSap(b, SAP.cot);
      var r = (typeof va === 'number') ? va - vb : String(va).localeCompare(String(vb), 'vi', { numeric: true });
      return r ? r * SAP.chieu : sapLop(a.lop, b.lop);
    }

    h += '<div class="lh-bang-boc"><table class="lh-bang lh-ds"><thead><tr><th class="so c-stt">TT</th>' + cot.map(function (k) {
      var dang = SAP.cot === k[0];
      return '<th' + (k[2] ? ' class="so"' : '') + ' aria-sort="' + (dang ? (SAP.chieu > 0 ? 'ascending' : 'descending') : 'none') + '">' +
        '<button type="button" data-lh-sap="' + k[0] + '">' + k[1] +
        '<span class="lh-mui">' + (dang ? (SAP.chieu > 0 ? '▲' : '▼') : '') + '</span></button></th>';
    }).join('') + '<th class="tt"><span class="lh-an">Thao tác</span></th></tr></thead><tbody>';

    Object.keys(theoKhoi).sort(function (a, b) { return a - b; }).forEach(function (k) {
      var nhom = theoKhoi[k].sort(so), tk = tong(nhom);
      h += '<tr class="lh-nhom"><td colspan="' + soCot + '">Khối ' + thoat(k) + ' <span>· ' + tk.lop + ' lớp · ' + tk.hs + ' HS</span></td></tr>';
      nhom.forEach(function (x) {
        h += '<tr class="lh-dong" data-lh-lop="' + thoat(x.lop) + '" tabindex="0" title="Bấm để xem danh sách học sinh lớp ' + thoat(x.lop) + '">' +
          '<td class="so c-stt">' + (++stt) + '</td>' +
          '<td class="c-lop"><b>' + thoat(x.lop) + '</b>' +
          (x.khopHs.length ? '<small>' + x.khopHs.slice(0, 2).map(thoat).join(', ') +
            (x.khopHs.length > 2 ? ' và ' + (x.khopHs.length - 2) + ' em khác' : '') + '</small>' : '') + '</td>' +
          (NHIEU_CS ? '<td class="c-cs">' + thoat(x.coSo || '—') + '</td>' : '') +
          '<td class="c-cn">' + (x.gvcn ? thoat(x.gvcn)
            : x.gvcnDK ? '<span class="lh-dk" title="GVCN dự kiến — hệ thống tự ghi phân công khi thầy cô đăng nhập lần đầu">' + thoat(x.gvcnDK) + ' <small>chưa đăng nhập</small></span>'
            : '<span class="lh-chua">Chưa có GVCN</span>') + '</td>' +
          '<td class="so c-ss">' + x.siSo + '<span class="lh-dv"> HS</span></td>' +
          '<td class="so c-nn"><span class="lh-dv">Nam </span>' + x.nam + ' / <span class="lh-dv">Nữ </span>' + x.nu + '</td>' +
          '<td class="so c-hn">' + (x.hn ? '<span class="lh-dv">Hoà nhập </span>' + x.hn : '<span class="lh-nhat">0</span>') + '</td>' +
          '<td class="tt c-tt">' + oSo(x.lop) + oDuyet(x.lop) + O_SDB + '</td></tr>';
      });
    });
    h += '</tbody></table></div>';
    o.innerHTML = h;
  }

  // ── Bảng tổng hợp điểm trường × khối (thu gọn dưới bảng lớp) ──
  function bangTongHop() {
    var ds = Object.keys(LOP).map(demLop), nhom = {};
    ds.forEach(function (x) {
      var cs = NHIEU_CS ? (x.coSo || 'Chưa gắn điểm trường') : '';
      nhom[cs] = nhom[cs] || {};
      (nhom[cs][x.khoi] = nhom[cs][x.khoi] || []).push(x);
    });
    function dong(nhan1, nhan2, list, lop) {
      var t = tong(list);
      return '<tr' + (lop ? ' class="' + lop + '"' : '') + '>' + (NHIEU_CS ? '<td>' + nhan1 + '</td>' : '') + '<td>' + nhan2 + '</td>' +
        '<td class="so">' + t.lop + '</td><td class="so">' + t.hs + '</td><td class="so">' + t.nu + '</td>' +
        '<td class="so">' + t.hn + '</td><td class="so">' + (t.chuaCN ? '<span class="lh-chua">' + t.chuaCN + '</span>' : '0') + '</td></tr>';
    }
    var h = '<div class="lh-bang-boc"><table class="lh-bang lh-tq"><thead><tr>' +
      (NHIEU_CS ? '<th>Điểm trường</th>' : '') + '<th>Khối</th><th class="so">Số lớp</th><th class="so">Học sinh</th>' +
      '<th class="so">Nữ</th><th class="so">Hoà nhập</th><th class="so">Chưa có GVCN</th></tr></thead><tbody>';
    Object.keys(nhom).sort(function (a, b) { return a.localeCompare(b, 'vi'); }).forEach(function (cs) {
      var gop = [];
      Object.keys(nhom[cs]).sort(function (a, b) { return a - b; }).forEach(function (k, i) {
        gop = gop.concat(nhom[cs][k]);
        h += dong(i === 0 ? '<b>' + thoat(cs) + '</b>' : '', 'Khối ' + thoat(k), nhom[cs][k]);
      });
      if (NHIEU_CS) h += dong('', 'Cộng', gop, 'lh-cong');
    });
    h += dong('<b>Toàn trường</b>', NHIEU_CS ? '' : '<b>Toàn trường</b>', ds, 'lh-tong');
    h += '</tbody></table></div>';
    var chua = ds.filter(function (x) { return !x.gvcn; }).map(function (x) { return x.lop; }).sort(sapLop);
    if (chua.length) {
      h += '<p class="lh-ghi">Lớp chưa có giáo viên chủ nhiệm (' + chua.length + '): <b>' + chua.map(thoat).join(', ') + '</b>' +
        ' — phân công ở <b>Quản trị › Phân công</b>.</p>';
    }
    return h;
  }

  function doiNam(e) {
    var cu = NAM, o = e.target;
    NAM = o.value;
    if (XEM_THU) { napMau(); ve(); return; }
    o.disabled = true;
    tai().then(function () {
      o.disabled = false;
      ve();
    }).catch(function (err) {
      // Trả CẢ biến năm LẪN ô chọn về như cũ — nhưng lời báo phải nêu năm
      // VỪA CHỌN HỎNG, không phải năm cũ (trước đây gán o.value = cu rồi mới
      // đọc o.value nên báo sai năm).
      var hong = o.value;
      NAM = cu; o.value = cu; o.disabled = false;
      window.notify('Không đọc được dữ liệu năm ' + thoat(hong) + ': ' + (err.message || err));
    });
  }

  // ── Bảng chi tiết lớp (trượt ra bên phải) ──
  function veDsHs(lop) {
    var d = LOP[lop];
    if (!d) return;
    var x = demLop(lop), chua = x.siSo - x.nam - x.nu;
    $('#hsp-tieu-de').textContent = 'Lớp ' + lop;
    $('#hsp-phu').textContent = [CN[lop] ? 'GVCN: ' + CN[lop] : (d.cnDuKien ? 'GVCN (dự kiến, chưa đăng nhập): ' + d.cnDuKien : 'Chưa có GVCN'), d.em.length + ' học sinh',
      NHIEU_CS && d.coSo ? d.coSo : '', 'Năm học ' + NAM].filter(Boolean).join(' · ');

    $('#hsp-than').innerHTML =
      '<div class="lh-ngan-nut">' +
      (coTheXemSo(lop) ? '<button type="button" class="lh-lien" id="hsp-scn">Mở sổ chủ nhiệm</button>' : '') +
      // Xuất Word / In danh sách lớp (dữ liệu cá nhân học sinh): chỉ BGH/quản
      // trị và GVCN lớp đó — rà phân quyền 28/9/2026, sổ dự án mục 100.
      // Giáo viên khác vẫn XEM danh sách trên màn (máy chủ cho đọc).
      (duocXuatDs(lop)
        ? '<button type="button" class="lh-lien" id="hsp-word">Xuất Word</button>' +
          '<button type="button" class="lh-lien" id="hsp-in">In</button>'
        : '') + '</div>' +
      '<p class="lh-ngan-tom">Nam ' + x.nam + ' · Nữ ' + x.nu +
      (chua ? ' · chưa ghi giới tính ' + chua : '') + ' · Hoà nhập ' + x.hn + '</p>' +
      '<div class="lh-cuon"><table class="lh-bang lh-bang-hs"><thead><tr>' +
      '<th class="so">TT</th><th class="c-ma">Mã</th><th>Họ và tên</th><th>Ngày sinh</th><th>Giới tính</th><th class="so">Hoà nhập</th></tr></thead><tbody>' +
      d.em.map(function (h, i) {
        return '<tr><td class="so">' + (i + 1) + '</td>' +
          '<td class="lh-ma c-ma">' + thoat(h.ma) + '</td>' +
          '<td>' + thoat(h.ho_ten) + '</td>' +
          '<td>' + ngayVN(h.ngay_sinh) + '</td>' +
          '<td>' + thoat(h.gioi_tinh || '') + '</td>' +
          '<td class="so">' + (h.khuyet_tat_hoa_nhap ? 'Có' : '') + '</td></tr>';
      }).join('') + '</tbody></table></div>' +
      '<p class="lh-ghi">Thông tin cá nhân của học sinh được bảo vệ theo Luật Bảo vệ dữ liệu cá nhân năm 2025. ' +
      'Số định danh cá nhân có lưu trong hệ thống nhưng <b>không hiển thị</b> ở màn hình này — ' +
      'số đó nằm ở bảng riêng, chỉ quản trị đọc được.</p>';

    if ($('#hsp-word')) $('#hsp-word').addEventListener('click', function () { xuatWord(lop, d); });
    if ($('#hsp-scn')) $('#hsp-scn').addEventListener('click', function () { moSo(lop); });
    // Gắn cờ để @media print chỉ in đúng bảng chi tiết, không in cả trang
    // phía sau. Gỡ cờ ở sự kiện afterprint bên dưới.
    if ($('#hsp-in')) $('#hsp-in').addEventListener('click', function () {
      document.body.classList.add('in-danh-sach');
      window.print();
    });
    var phu = $('#hs-phu');
    phu.classList.add('on');
    phu.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    var nutX = phu.querySelector('.lh-x');
    if (nutX && nutX.focus) nutX.focus();
  }

  window.dongDsHs = function () {
    var o = $('#hs-phu');
    if (o) { o.classList.remove('on'); o.setAttribute('aria-hidden', 'true'); }
    document.body.style.overflow = '';
  };

  function xuatWord(lop, d) {
    var W = window.WORD_TIEN_ICH;
    if (!W) { window.notify('Chưa tải được bộ xuất Word.'); return; }
    if (!duocXuatDs(lop)) { window.notify('Chỉ Ban giám hiệu hoặc GVCN lớp ' + lop + ' mới xuất được danh sách lớp.'); return; }
    var than = W.theThuc() +
      // <p><b> chứ không phải <h2>: Word ánh xạ h2 vào kiểu "Heading 2"
      // (Calibri Light xanh) — font khai ở body không đè được kiểu Heading.
      '<p class="giua" style="margin:18pt 0 0"><b style="font-size:14pt">DANH SÁCH HỌC SINH LỚP ' + W.chan(lop.toUpperCase()) + '</b></p>' +
      '<p class="giua nghieng" style="margin-bottom:12pt">Năm học ' + W.chan(NAM) +
      ' · Giáo viên chủ nhiệm: ' + W.chan(CN[lop] || '……………………') + '</p>' +
      '<table><thead><tr><th style="width:6%">TT</th><th style="width:16%">Mã học sinh</th>' +
      '<th>Họ và tên</th><th style="width:15%">Ngày sinh</th><th style="width:11%">Giới tính</th>' +
      '<th style="width:16%">Ghi chú</th></tr></thead><tbody>' +
      d.em.map(function (h, i) {
        return '<tr><td class="giua">' + (i + 1) + '</td><td>' + W.chan(h.ma) + '</td>' +
          '<td>' + W.chan(h.ho_ten) + '</td><td class="giua">' + ngayVN(h.ngay_sinh) + '</td>' +
          '<td class="giua">' + W.chan(h.gioi_tinh || '') + '</td><td></td></tr>';
      }).join('') + '</tbody></table>' +
      '<p style="margin-top:10pt;font-size:12pt"><i>Tổng số: ' + d.em.length + ' học sinh</i></p>' +
      W.khoiKy('GIÁO VIÊN CHỦ NHIỆM');
    W.taiVe(W.khungWord('Danh sách lớp ' + lop, than),
      'danh-sach-lop-' + lop.toLowerCase().replace(/\s+/g, '') + '-' + NAM + '.doc');
  }

  // ══════════ NỐI DỮ LIỆU THẬT ══════════
  function noi() {
    if (!window.MAY_CHU) return;
    XEM_THU = false;
    TRANG_THAI = 'dang-doc';
    ve();
    return tai().then(function () {
      daNoi = true;
      TRANG_THAI = 'xong';
      ve();
    }).catch(function (e) {
      // Nói thẳng, không để bảng trống trông như trường chưa có học sinh
      TRANG_THAI = 'loi';
      LOI_CHU = '<b>Chưa đọc được danh sách học sinh</b> — ' + thoat(e.message || e) +
        '. Thầy cô là giáo viên thì chỉ đọc được lớp mình phụ trách; nếu cần xem toàn trường, ' +
        'báo Ban giám hiệu cấp quyền.';
      ve();
    });
  }

  // Module khác nạp xong dữ liệu gọi cái này để màn cập nhật ngay, khỏi F5
  window.hocSinhNoiLai = noi;

  // Gỡ cờ in dù người dùng bấm In hay bấm Huỷ ở hộp thoại in. Quên gỡ thì lần
  // sau bấm Ctrl+P ở màn khác vẫn ra danh sách học sinh cũ — hỏng lặng lẽ.
  window.addEventListener('afterprint', function () {
    document.body.classList.remove('in-danh-sach');
  });

  document.addEventListener('dangnhap-xong', function () { if (!daNoi) noi(); });

  // Chế độ xem thử: supabase-ket-noi.js dựng MAY_CHU trong DOMContentLoaded
  // (tệp đó nạp trước tệp này), nên tới đây vẫn chưa có máy chủ nghĩa là xem thử.
  function khoiDau() {
    if (window.MAY_CHU) { ve(); return; }
    XEM_THU = true;
    NAM = (window.CAU_HINH && window.CAU_HINH.NAM_HOC) || '';
    napMau();
    TRANG_THAI = 'xong';
    ve();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', khoiDau); else khoiDau();
})();
