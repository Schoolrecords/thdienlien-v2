// ============================================================
// cong-khai.js — CỔNG CÔNG KHAI theo Thông tư 09/2024/TT-BGDĐT (mặt ngoài app)
// Sổ dự án mục 121 · SQL sql/80-cong-khai.sql
//
// Người chưa đăng nhập mở trang trường → thấy cổng này thay cho hộp đăng nhập,
// với nút "Đăng nhập CBGV". Cổng CHỈ đọc bảng cong_khai, CHỈ dòng 'cong_bo' (RLS
// sql/80 chặn mọi thứ khác — rào thật nằm ở máy chủ, không ở đây).
//
// Khi nào cổng hiện: trường đã chạy sql/80 VÀ đã công bố ít nhất một mục. Chưa
// thì giữ nguyên hộp đăng nhập cũ — trường chưa làm công khai không bị trang
// trống trơn, và BGH soạn xong mới "ra mắt" bằng lần công bố đầu tiên.
//
// window.CONG_KHAI:
//   thu(may, dangNhap) → Promise<bool>  đọc bản công bố; có thì dựng cổng, trả true
//   xem(dongLai, banNhap?)              người ĐÃ đăng nhập xem cổng (BGH xem trước nháp)
//   dong()                              gỡ cổng (khi mở khoá vào hệ thống)
//   MUC                                 danh sách 8 mục (cong-khai-soan.js dùng chung)
// ============================================================
(function () {
  'use strict';

  // ⚠️ Danh sách cột PHẢI khớp quyền cột cấp cho anon ở sql/80 mục 4.
  //    select('*') với anon sẽ bị máy chủ từ chối (không có quyền cột cong_bo_boi…).
  var COT = 'id,nam_hoc,muc,noi_dung,trang_thai,lan_dau_luc,cong_bo_luc';

  var MUC = [
    { ma: 'thong_tin', so: 'I', ten: 'Thông tin chung', tenDai: 'Thông tin chung về nhà trường', dieu: 'Điều 4',
      mo: 'Giới thiệu, bộ máy, lãnh đạo, văn bản của trường', bi: 'truong' },
    { ma: 'tai_chinh', so: 'II', ten: 'Thu, chi tài chính', tenDai: 'Thu, chi tài chính', dieu: 'Điều 5',
      mo: 'Thu chi năm trước, các khoản thu, miễn giảm, số dư quỹ', bi: 'tien' },
    { ma: 'doi_ngu', so: 'III', ten: 'Đội ngũ', tenDai: 'Đội ngũ cán bộ quản lý, giáo viên, nhân viên', dieu: 'Điều 8 khoản 1',
      mo: 'Số lượng, trình độ, chuẩn nghề nghiệp, bồi dưỡng', bi: 'nguoi' },
    { ma: 'csvc', so: 'IV', ten: 'Cơ sở vật chất', tenDai: 'Cơ sở vật chất và tài liệu học tập', dieu: 'Điều 8 khoản 2',
      mo: 'Diện tích, các khối phòng, thiết bị, sách giáo khoa', bi: 'luoi' },
    { ma: 'kiem_dinh', so: 'V', ten: 'Kiểm định chất lượng', tenDai: 'Kết quả đánh giá và kiểm định chất lượng giáo dục', dieu: 'Điều 8 khoản 3',
      mo: 'Tự đánh giá, cải tiến, đánh giá ngoài, chuẩn quốc gia', bi: 'huy' },
    { ma: 'ke_hoach', so: 'VI', ten: 'Kế hoạch năm học', tenDai: 'Kế hoạch hoạt động giáo dục', dieu: 'Điều 9 khoản 1',
      mo: 'Tuyển sinh, kế hoạch giáo dục, phối hợp gia đình', bi: 'lich' },
    { ma: 'ket_qua', so: 'VII', ten: 'Kết quả năm học trước', tenDai: 'Kết quả giáo dục năm học trước', dieu: 'Điều 9 khoản 2',
      mo: 'Học sinh, kết quả đánh giá, hoàn thành chương trình', bi: 'bieu' },
    { ma: 'bao_cao', so: 'VIII', ten: 'Báo cáo thường niên', tenDai: 'Báo cáo thường niên', dieu: 'Điều 14',
      mo: 'Bản PDF hằng năm · lưu trữ tối thiểu 05 năm', bi: 'tep' }
  ];

  var BIEU_TUONG = {
    truong: '<path d="M3 21h18"/><path d="M5 21V8l7-5 7 5v13"/><path d="M10 21v-6h4v6"/>',
    tien: '<rect x="2" y="6" width="20" height="13" rx="2"/><circle cx="12" cy="12.5" r="2.5"/><path d="M6 10v5M18 10v5"/>',
    nguoi: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><circle cx="17" cy="9" r="2.5"/><path d="M16 14.2a5 5 0 0 1 5.5 4.8"/>',
    luoi: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    huy: '<circle cx="12" cy="9" r="6"/><path d="M15.5 14 17 22l-5-3-5 3 1.5-8"/>',
    lich: '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4"/>',
    bieu: '<path d="M3 3v18h18"/><path d="M7 15l4-4 3 3 5-6"/>',
    tep: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h5"/>',
    khoa: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    tai: '<path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/>',
    dong_ho: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'
  };
  function svg(ten, cls) {
    return '<svg class="' + (cls || '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (BIEU_TUONG[ten] || '') + '</svg>';
  }

  // ── tiện ích ──
  function t(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  // Chỉ nhận đường dẫn http(s) — nội dung do người soạn nhập, không để lọt javascript:…
  function link(u) {
    u = String(u || '').trim();
    return /^https?:\/\//i.test(u) ? u : '';
  }
  function so(n) {
    if (n === '' || n == null || isNaN(Number(n))) return n == null ? '' : t(n);
    return Number(n).toLocaleString('vi-VN', { maximumFractionDigits: 2 });
  }
  function soN(n) { var x = Number(n); return isFinite(x) ? x : 0; }
  function ngay(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    if (isNaN(d)) return '';
    // Thể thức NĐ 30: ngày, tháng không thêm số 0 (trừ khi cần) — trên web ghi ngắn gọn d/m/yyyy
    return d.getDate() + '/' + (d.getMonth() + 1) + '/' + d.getFullYear();
  }
  function tiLe(dat, tong) {
    dat = soN(dat); tong = soN(tong);
    if (!tong) return null;
    return Math.round(dat * 1000 / tong) / 10;
  }
  function hanNam(namHoc) {
    // Năm học 2026-2027 → hạn công bố 30/6/2027 (Điều 15 khoản 1)
    var y = parseInt(String(namHoc || '').split('-')[1], 10);
    return y ? '30/6/' + y : '30/6';
  }
  function C() { return window.CAU_HINH || {}; }

  // ── trạng thái chung ──
  var BAN = [];          // các dòng đang hiển thị (công bố, hoặc nháp khi BGH xem trước)
  var NAM = '';          // năm học đang chọn
  var CHE_DO = 'ngoai';  // 'ngoai' (chưa đăng nhập) | 'xem' (đã đăng nhập xem cổng) | 'thu' (xem trước nháp)
  var NUT_DANG_NHAP = null, NUT_DONG = null, TIEU_DE_CU = null;

  function dsNam() {
    var m = {};
    BAN.forEach(function (b) { if (b.muc !== 'bao_cao') m[b.nam_hoc] = 1; });
    var ds = Object.keys(m).sort().reverse();
    if (!ds.length) BAN.forEach(function (b) { m[b.nam_hoc] = 1; });
    return Object.keys(m).sort().reverse();
  }
  function lay(muc, nam) {
    for (var i = 0; i < BAN.length; i++) if (BAN[i].muc === muc && BAN[i].nam_hoc === (nam || NAM)) return BAN[i];
    return null;
  }

  // ══════════ KHUNG TRANG ══════════
  function khung() {
    var el = document.getElementById('ck-trang');
    if (!el) {
      el = document.createElement('div');
      el.id = 'ck-trang';
      el.className = 'ck-trang';
      document.body.appendChild(el);
    }
    return el;
  }

  function veTrang() {
    var c = C(), el = khung();
    var tt = (lay('thong_tin') || {}).noi_dung || {};
    var ten = tt.ten || c.TEN_TRUONG || 'Trường học';
    var anh = (c.THU_MUC_ANH || 'img/') + 'truong.jpg';
    var logo = (c.THU_MUC_ANH || 'img/') + 'logo.png';
    var coQuan = [c.CHU_QUAN_THUONG, c.CO_QUAN_THUONG].filter(Boolean).join(' · ');
    var nam = dsNam();
    var bcMoi = baoCaoMoiNhat();

    var nutPhai = CHE_DO === 'ngoai'
      ? '<button class="ck-nut-dn" type="button" data-ck="dang-nhap" title="Cán bộ, giáo viên, nhân viên đăng nhập bằng Gmail">' + svg('khoa') + 'Đăng nhập CBGV</button>'
      : '<button class="ck-nut-dn" type="button" data-ck="dong">↩ ' + (CHE_DO === 'thu' ? 'Đóng xem trước' : 'Về hệ thống') + '</button>';

    el.innerHTML =
      (CHE_DO === 'thu' ? '<div class="ck-dai-thu">XEM TRƯỚC — gồm cả bản NHÁP chưa công bố. Người ngoài chỉ thấy các mục đã công bố.</div>' : '') +
      '<div class="ck-thanh"><div class="ck-khung">' +
        '<div><span class="ck-cq">' + t(coQuan) + (coQuan ? ' · ' : '') + '</span><b>Cổng công khai thông tin</b></div>' + nutPhai +
      '</div></div>' +
      '<header class="ck-dau"><div class="ck-khung">' +
        '<img src="' + t(logo) + '" alt="" onerror="this.onerror=null;this.src=\'img/he-thong.svg\'">' +
        '<div class="ck-ten">' + t(ten) + (c.SLOGAN ? '<small>' + t(c.SLOGAN) + '</small>' : '') + '</div>' +
        '<nav class="ck-menu"><a href="#ck-dau-trang">Giới thiệu</a><a href="#ck-muc-luc">Công khai</a>' +
        '<a href="#ck-bao_cao">Báo cáo thường niên</a><a href="#ck-lien-he">Liên hệ</a></nav>' +
      '</div></header>' +
      '<section class="ck-hero" id="ck-dau-trang"><div class="ck-anh" data-anh="' + t(anh) + '"></div><div class="ck-phu"></div><div class="ck-khung">' +
        '<span class="ck-nhan">Công khai theo Thông tư 09/2024/TT-BGDĐT</span>' +
        '<h1>Thông tin công khai về hoạt động giáo dục của nhà trường</h1>' +
        '<p class="ck-dan">Minh bạch điều kiện bảo đảm chất lượng, kế hoạch và kết quả giáo dục, thu chi tài chính — để cha mẹ học sinh, người học và xã hội cùng biết, cùng giám sát.</p>' +
        '<div class="ck-hero-hang">' +
          (nam.length ? '<div class="ck-chon-nam" role="tablist" aria-label="Chọn năm học">' + nam.map(function (n) {
            return '<button type="button" data-nam="' + t(n) + '" class="' + (n === NAM ? 'chon' : '') + '">' + t(n.replace('-', '–')) + '</button>';
          }).join('') + '</div>' : '') +
          (bcMoi && link(bcMoi.link) ? '<a class="ck-nut-vang" href="' + t(link(bcMoi.link)) + '" target="_blank" rel="noopener">' + svg('tai') +
            t(bcMoi.ten || ('Báo cáo thường niên ' + (bcMoi.nam || ''))) + ' (PDF)</a>' : '') +
        '</div>' +
        veSoLieuHero(tt) +
      '</div></section>' +
      '<main class="ck-than"><div class="ck-khung">' +
        '<div class="ck-dau-muc" id="ck-muc-luc"><div><h2>Nội dung công khai</h2>' +
        '<div class="ck-phu-de">Bố cục theo Chương II Thông tư 09/2024/TT-BGDĐT · năm học ' + t(NAM.replace('-', '–')) + '</div></div></div>' +
        '<div class="ck-luoi-muc">' + MUC.map(veThe).join('') + '</div>' +
        '<div class="ck-bo-cuc"><aside class="ck-muc-luc"><div class="ck-tieu">Mục lục</div>' +
          MUC.map(function (m) { return '<a href="#ck-' + m.ma + '"><span>' + m.so + '</span>' + t(m.ten) + '</a>'; }).join('') +
          '<div class="ck-ghi">Nội dung được công bố trước ngày 30/6 hằng năm và cập nhật chậm nhất 10 ngày làm việc khi có thay đổi (Điều 15).</div>' +
        '</aside><div class="ck-cac-muc">' + MUC.map(veMuc).join('') + '</div></div>' +
      '</div></main>' +
      veChan(tt, ten);

    // Ảnh trường: chỉ đặt khi tải được (thiếu ảnh thì nền navy trơn, không khung vỡ)
    var oAnh = el.querySelector('.ck-anh');
    if (oAnh) {
      var im = new Image();
      im.onload = function () { oAnh.style.backgroundImage = 'url("' + anh.replace(/"/g, '%22') + '")'; };
      im.src = anh;
    }
    ganSuKien(el);
  }

  function veSoLieuHero(tt) {
    var s = tt.tom_tat || {};
    var o = [
      [s.diem_truong, 'điểm trường'], [s.lop, 'lớp học'], [s.hoc_sinh, 'học sinh'],
      [s.cbgv, 'cán bộ, giáo viên, nhân viên'], [s.chuan_qg, 'chuẩn quốc gia']
    ].filter(function (x) { return x[0] !== '' && x[0] != null; });
    if (!o.length) return '';
    var r = lay('thong_tin');
    return '<div class="ck-so-lieu">' + o.map(function (x) {
      return '<div class="ck-o"><div class="ck-so">' + (isNaN(Number(x[0])) ? t(x[0]) : so(x[0])) + '</div><div class="ck-nhan-so">' + x[1] + '</div></div>';
    }).join('') + '</div>' +
      (r && r.cong_bo_luc ? '<div class="ck-chot">' + (s.chot ? 'Số liệu chốt ngày ' + t(s.chot) + ' · ' : '') +
        'Nhà trường công bố ngày ' + ngay(r.cong_bo_luc) + '</div>' : '');
  }

  function trangThaiThe(m) {
    var r = m.ma === 'bao_cao' ? baoCaoRow() : lay(m.ma);
    if (!r) return '<span class="ck-tt ck-tt-ko">Đang cập nhật · hạn ' + hanNam(NAM) + '</span>';
    var nd = r.noi_dung || {};
    if (nd.cho) return '<span class="ck-tt ck-tt-cho">' + t(nd.cho) + '</span>';
    if (r.trang_thai === 'nhap') return '<span class="ck-tt ck-tt-cho">Bản nháp</span>';
    var capNhat = r.lan_dau_luc && r.cong_bo_luc && ngay(r.lan_dau_luc) !== ngay(r.cong_bo_luc);
    return '<span class="ck-tt ck-tt-tot">' + (capNhat ? 'Cập nhật ' + ngay(r.cong_bo_luc) : 'Đã công bố ' + ngay(r.cong_bo_luc || r.lan_dau_luc)) + '</span>';
  }

  function veThe(m) {
    return '<a class="ck-the" href="#ck-' + m.ma + '"><div class="ck-the-dau"><div class="ck-bi">' + svg(m.bi) + '</div>' +
      '<span class="ck-dieu">' + t(m.dieu.toUpperCase()) + '</span></div><h3>' + t(m.ten) + '</h3>' +
      '<div class="ck-mo">' + t(m.mo) + '</div>' + trangThaiThe(m) + '</a>';
  }

  // ══════════ TỪNG MỤC ══════════
  function dauMuc(m, r, phuThem) {
    var ngayHtml = '';
    if (r && r.trang_thai === 'nhap') ngayHtml = '<b>Bản nháp</b>';
    else if (r) {
      ngayHtml = 'Công bố <b>' + ngay(r.lan_dau_luc || r.cong_bo_luc) + '</b>';
      if (r.lan_dau_luc && ngay(r.lan_dau_luc) !== ngay(r.cong_bo_luc)) ngayHtml += '<br>Cập nhật <b>' + ngay(r.cong_bo_luc) + '</b>';
    }
    return '<div class="ck-muc-dau"><div><div class="ck-so-la-ma">Mục ' + m.so + '</div><h2>' + t(m.tenDai) +
      (m.ma === 'ket_qua' && r && r.noi_dung && r.noi_dung.nam_truoc ? ' ' + t(String(r.noi_dung.nam_truoc).replace('-', '–')) : '') +
      (m.ma === 'ke_hoach' ? ' ' + t(NAM.replace('-', '–')) : '') +
      '</h2><div class="ck-can-cu">' + t(m.dieu) + ' Thông tư 09/2024/TT-BGDĐT' + (phuThem ? ' · ' + t(phuThem) : '') + '</div></div>' +
      (ngayHtml ? '<div class="ck-ngay">' + ngayHtml + '</div>' : '') + '</div>';
  }

  function choCapNhat(chu) {
    return '<div class="ck-cho">' + svg('dong_ho') + '<div>' + chu + '</div></div>';
  }

  function veMuc(m) {
    var r = m.ma === 'bao_cao' ? baoCaoRow() : lay(m.ma);
    var nd = (r && r.noi_dung) || {};
    var than;
    if (!r) {
      than = choCapNhat('<b>Đang cập nhật.</b> Nhà trường công bố nội dung này trước ngày ' + hanNam(NAM) +
        ' (Điều 15 khoản 1 Thông tư 09/2024/TT-BGDĐT).');
    } else {
      than = (VE[m.ma] || function () { return ''; })(nd, r);
      if (nd.cho) than = choCapNhat('<b>' + t(nd.cho) + '.</b> ' + t(nd.cho_ghi || '')) + than;
      if (nd.ghi_chu) than += '<p class="ck-ghi-chu">' + t(nd.ghi_chu) + '</p>';
    }
    return '<section class="ck-muc" id="ck-' + m.ma + '">' + dauMuc(m, r, nd.phu_de) + than + '</section>';
  }

  function tieuNho(chu, em) { return '<h3 class="ck-tieu-nho">' + t(chu) + (em ? ' <em>' + t(em) + '</em>' : '') + '</h3>'; }

  function dsVanBan(ds) {
    ds = (ds || []).filter(function (v) { return v && (v.ten || v.link); });
    if (!ds.length) return '';
    return '<ul class="ck-van-ban">' + ds.map(function (v) {
      var u = link(v.link);
      return '<li><span class="ck-pdf">PDF</span><span class="ck-tvb"><b>' + t(v.ten) + '</b>' +
        (v.mo_ta ? '<small>' + t(v.mo_ta) + '</small>' : '') + '</span>' +
        (u ? '<a class="ck-xem" href="' + t(u) + '" target="_blank" rel="noopener">Xem ›</a>' : '<span class="ck-xem ck-mo-nhat">Đang cập nhật</span>') + '</li>';
    }).join('') + '</ul>';
  }

  function bang(cot, dong, tong) {
    // cot: [{k, nhan, so?}]  ·  dong: [{…}]  ·  tong: dòng tổng (tuỳ chọn)
    function o(c, d) {
      var v = d[c.k];
      if (c.ham) return c.ham(d);
      return c.so ? so(v) : t(v);
    }
    return '<div class="ck-cuon"><table><thead><tr>' + cot.map(function (c) { return '<th' + (c.trai ? ' class="ck-trai"' : '') + '>' + t(c.nhan) + '</th>'; }).join('') +
      '</tr></thead><tbody>' + dong.map(function (d) {
        return '<tr>' + cot.map(function (c) { return '<td' + (c.trai ? ' class="ck-trai"' : '') + '>' + o(c, d) + '</td>'; }).join('') + '</tr>';
      }).join('') +
      (tong ? '<tr class="ck-tong">' + cot.map(function (c) { return '<td' + (c.trai ? ' class="ck-trai"' : '') + '>' + o(c, tong) + '</td>'; }).join('') + '</tr>' : '') +
      '</tbody></table></div>';
  }

  function cong(ds, cot) {
    var r = {};
    cot.forEach(function (k) {
      var co = false, s = 0;
      ds.forEach(function (d) { if (d[k] !== '' && d[k] != null && !isNaN(Number(d[k]))) { co = true; s += Number(d[k]); } });
      r[k] = co ? s : '';
    });
    return r;
  }

  function oChiTieu(nhan, dat, tongSo, phu) {
    var p = tiLe(dat, tongSo);
    if (p == null) return '';
    return '<div class="ck-ct"><div class="ck-ct-nhan">' + t(nhan) + '</div><div class="ck-ct-so">' + so(p) + '% <small>(' + so(dat) + '/' + so(tongSo) + ')</small></div>' +
      '<div class="ck-thanh-tl" role="img" aria-label="' + t(nhan) + ': ' + so(p) + '%" title="' + so(dat) + '/' + so(tongSo) + '"><i style="width:' + Math.min(100, p) + '%"></i></div>' +
      (phu ? '<div class="ck-ct-phu">' + t(phu) + '</div>' : '') + '</div>';
  }
  function luoiChiTieu(o) { o = o.filter(Boolean); return o.length ? '<div class="ck-chi-tieu">' + o.join('') + '</div>' : ''; }

  var VE = {
    thong_tin: function (nd) {
      var dong = [
        ['Tên trường', nd.ten], ['Loại hình', nd.loai_hinh], ['Cơ quan quản lý trực tiếp', nd.co_quan_truc_tiep],
        ['Cơ quan quản lý chuyên môn', nd.co_quan_chuyen_mon], ['Trụ sở chính', nd.tru_so], ['Các điểm trường', nd.diem_truong],
        ['Điện thoại', nd.dien_thoai], ['Thư điện tử', nd.email], ['Cổng thông tin', nd.cong_thong_tin]
      ].filter(function (x) { return x[1]; });
      var h = '';
      if (dong.length) h += tieuNho('Thông tin cơ bản') + '<dl class="ck-tt-bang">' + dong.map(function (x) {
        var v = x[0] === 'Cổng thông tin' && link(x[1]) ? '<a href="' + t(link(x[1])) + '" target="_blank" rel="noopener">' + t(x[1].replace(/^https?:\/\//, '')) + '</a>' : t(x[1]);
        return '<dt>' + x[0] + '</dt><dd>' + v + '</dd>';
      }).join('') + '</dl>';
      var o = [['Sứ mạng', nd.su_menh], ['Tầm nhìn', nd.tam_nhin], ['Mục tiêu', nd.muc_tieu]].filter(function (x) { return x[1]; });
      if (o.length) h += tieuNho('Sứ mạng · Tầm nhìn · Mục tiêu') + '<div class="ck-hai-cot">' + o.map(function (x) {
        return '<div class="ck-o-chu"><h4>' + x[0] + '</h4><p>' + t(x[1]) + '</p></div>';
      }).join('') + '</div>';
      if (nd.lich_su) h += tieuNho('Quá trình hình thành và phát triển') + '<div class="ck-o-chu"><p>' + t(nd.lich_su) + '</p></div>';
      var ld = (nd.lanh_dao || []).filter(function (x) { return x && x.ho_ten; });
      if (ld.length) h += tieuNho('Lãnh đạo nhà trường', 'Điều 4 khoản 6, khoản 7 điểm e') + '<div class="ck-lanh-dao">' + ld.map(function (x) {
        return '<div class="ck-ld"><div class="ck-vt">' + t(x.chuc_vu) + '</div><div class="ck-ld-ten">' + t(x.ho_ten) + '</div><div class="ck-lh">' +
          (x.dien_thoai ? '<i>Điện thoại</i> ' + t(x.dien_thoai) + '<br>' : '') + (x.email ? '<i>Thư</i> ' + t(x.email) + '<br>' : '') +
          (x.nhiem_vu ? t(x.nhiem_vu) : '') + '</div></div>';
      }).join('') + '</div>';
      var vb = dsVanBan(nd.van_ban);
      if (vb) h += tieuNho('Văn bản tổ chức bộ máy và quy chế') + vb;
      return h;
    },
    tai_chinh: function (nd) {
      var h = '';
      var kt = (nd.khoan_thu || []).filter(function (x) { return x && x.ten; });
      if (kt.length) h += tieuNho('Các khoản thu và mức thu', 'Điều 5 khoản 2') + bang([
        { k: 'ten', nhan: 'Khoản thu', trai: 1 }, { k: 'muc', nhan: 'Mức thu' }, { k: 'don_vi', nhan: 'Đơn vị tính' }, { k: 'can_cu', nhan: 'Căn cứ', trai: 1 }
      ], kt);
      var tc = (nd.thu_chi || []).filter(function (x) { return x && x.noi_dung; });
      if (tc.length) h += tieuNho('Tình hình thu, chi năm tài chính trước', 'Điều 5 khoản 1') + bang([
        { k: 'noi_dung', nhan: 'Nội dung', trai: 1 }, { k: 'so_tien', nhan: 'Số tiền (đồng)', so: 1 }
      ], tc);
      if (nd.mien_giam) h += tieuNho('Chính sách và kết quả miễn, giảm, hỗ trợ', 'Điều 5 khoản 3') + '<div class="ck-o-chu"><p>' + t(nd.mien_giam) + '</p></div>';
      if (nd.so_du_quy) h += tieuNho('Số dư các quỹ', 'Điều 5 khoản 4') + '<div class="ck-o-chu"><p>' + t(nd.so_du_quy) + '</p></div>';
      var vb = dsVanBan(nd.van_ban);
      if (vb) h += tieuNho('Văn bản công khai tài chính') + vb;
      return h;
    },
    doi_ngu: function (nd) {
      var h = '';
      var ds = (nd.bang || []).filter(function (x) { return x && x.vi_tri; });
      var cot = ['tong', 'thac_si', 'dai_hoc', 'cao_dang', 'khac'];
      if (ds.length) h += tieuNho('Theo vị trí việc làm và trình độ đào tạo') + bang([
        { k: 'vi_tri', nhan: 'Vị trí việc làm', trai: 1 }, { k: 'tong', nhan: 'Tổng số', so: 1 }, { k: 'thac_si', nhan: 'Thạc sĩ trở lên', so: 1 },
        { k: 'dai_hoc', nhan: 'Đại học', so: 1 }, { k: 'cao_dang', nhan: 'Cao đẳng', so: 1 }, { k: 'khac', nhan: 'Trung cấp, khác', so: 1 }
      ], ds, ds.length > 1 ? Object.assign({ vi_tri: 'Tổng cộng' }, cong(ds, cot)) : null);
      h += luoiChiTieu([
        oChiTieu('Giáo viên đạt chuẩn trình độ đào tạo', nd.dc_dat, nd.dc_tong, nd.dc_ghi),
        oChiTieu('Đạt chuẩn nghề nghiệp (CBQL, giáo viên)', nd.nn_dat, nd.nn_tong, nd.nn_ghi),
        oChiTieu('Hoàn thành bồi dưỡng hằng năm', nd.bd_dat, nd.bd_tong, nd.bd_ghi)
      ]);
      return h;
    },
    csvc: function (nd) {
      var h = '', o = [];
      if (nd.dien_tich) o.push('<div class="ck-ct"><div class="ck-ct-nhan">Diện tích khu đất' + (nd.so_diem ? ' (' + t(nd.so_diem) + ' điểm trường)' : '') +
        '</div><div class="ck-ct-so">' + so(nd.dien_tich) + ' <small>m²</small></div></div>');
      var bq = nd.dien_tich && nd.hoc_sinh ? Math.round(soN(nd.dien_tich) * 10 / soN(nd.hoc_sinh)) / 10 : null;
      if (bq) {
        var tt = soN(nd.toi_thieu_bq);
        o.push('<div class="ck-ct"><div class="ck-ct-nhan">Bình quân mỗi học sinh</div><div class="ck-ct-so">' + so(bq) + ' <small>m²/HS</small></div>' +
          (tt ? '<div class="ck-ct-phu">Tối thiểu theo quy định: ' + so(tt) + ' m²/HS · ' + (bq >= tt ? '<span class="ck-dat">Đạt</span>' : '<span class="ck-chua">Chưa đạt</span>') + '</div>' : '') + '</div>');
      }
      if (o.length) h += '<div class="ck-chi-tieu ck-chi-tieu-dau">' + o.join('') + '</div>';
      var ph = (nd.phong || []).filter(function (x) { return x && x.hang_muc; });
      if (ph.length) h += tieuNho('Các khối phòng, thiết bị — đối sánh yêu cầu tối thiểu') + bang([
        { k: 'hang_muc', nhan: 'Hạng mục', trai: 1 }, { k: 'hien_co', nhan: 'Hiện có', so: 1 }, { k: 'toi_thieu', nhan: 'Tối thiểu', so: 1 },
        { k: 'x', nhan: 'Đối sánh', ham: function (d) {
          if (d.toi_thieu === '' || d.toi_thieu == null) return '—';
          var thieu = soN(d.toi_thieu) - soN(d.hien_co);
          return thieu > 0 ? '<span class="ck-chua">Thiếu ' + so(thieu) + '</span>' : '<span class="ck-dat">Đạt</span>';
        } }
      ], ph);
      var vb = dsVanBan(nd.van_ban);
      if (vb) h += tieuNho('Sách giáo khoa, tài liệu học tập') + vb;
      return h;
    },
    kiem_dinh: function (nd) {
      var h = '';
      var moc = (nd.moc || []).filter(function (x) { return x && x.tieu_de; });
      if (moc.length) h += '<ul class="ck-moc">' + moc.map(function (x) {
        return '<li class="' + (x.ke_hoach ? 'ck-sap' : '') + '"><div class="ck-tg">' + t(x.thoi_gian) + '</div><b>' + t(x.tieu_de) + '</b>' +
          (x.mo_ta ? '<p>' + t(x.mo_ta) + '</p>' : '') + '</li>';
      }).join('') + '</ul>';
      var vb = dsVanBan(nd.van_ban);
      if (vb) h += tieuNho('Báo cáo, quyết định, kế hoạch cải tiến') + vb;
      return h;
    },
    ke_hoach: function (nd) {
      var h = dsVanBan(nd.van_ban);
      if (nd.thuc_don) h += '<p class="ck-ghi-chu">Thực đơn hằng ngày: ' + (link(nd.thuc_don)
        ? '<a href="' + t(link(nd.thuc_don)) + '" target="_blank" rel="noopener">xem thực đơn tuần ›</a>' : t(nd.thuc_don)) + '</p>';
      return h;
    },
    ket_qua: function (nd) {
      var h = '';
      var ds = (nd.khoi || []).filter(function (x) { return x && x.khoi !== '' && x.khoi != null; });
      if (ds.length) {
        var cotHs = ['so_lop', 'hoc_sinh', 'hai_buoi', 'nu', 'dtts', 'khuyet_tat'];
        var tongHs = cong(ds, cotHs);
        tongHs.ten = 'Toàn trường';
        tongHs.bq = tongHs.so_lop ? Math.round(tongHs.hoc_sinh * 10 / tongHs.so_lop) / 10 : '';
        var dsHs = ds.map(function (d) {
          return Object.assign({ ten: 'Khối ' + d.khoi, bq: soN(d.so_lop) ? Math.round(soN(d.hoc_sinh) * 10 / soN(d.so_lop)) / 10 : '' }, d);
        });
        h += tieuNho('Học sinh theo khối') + bang([
          { k: 'ten', nhan: 'Khối', trai: 1 }, { k: 'so_lop', nhan: 'Số lớp', so: 1 }, { k: 'hoc_sinh', nhan: 'Học sinh', so: 1 },
          { k: 'bq', nhan: 'Bình quân/lớp', so: 1 }, { k: 'hai_buoi', nhan: 'Học 2 buổi/ngày', so: 1 }, { k: 'nu', nhan: 'Nữ', so: 1 },
          { k: 'dtts', nhan: 'Dân tộc thiểu số', so: 1 }, { k: 'khuyet_tat', nhan: 'Khuyết tật', so: 1 }
        ], dsHs, ds.length > 1 ? tongHs : null);
        var ghi = [];
        if (nd.chuyen_den !== '' && nd.chuyen_den != null) ghi.push('Chuyển đến ' + so(nd.chuyen_den));
        if (nd.chuyen_di !== '' && nd.chuyen_di != null) ghi.push('chuyển đi ' + so(nd.chuyen_di));
        if (ghi.length) h += '<p class="ck-ghi-chu">' + ghi.join(' · ') + ' trong năm học.</p>';

        var cotKq = ['htxs', 'htt', 'ht', 'cht', 'len_lop', 'khong_len_lop'];
        var coKq = ds.some(function (d) { return cotKq.some(function (k) { return d[k] !== '' && d[k] != null; }); });
        if (coKq) {
          var tongKq = cong(ds, cotKq); tongKq.ten = 'Toàn trường';
          h += tieuNho('Kết quả đánh giá học sinh', 'Thông tư 27/2020/TT-BGDĐT') + bang([
            { k: 'ten', nhan: 'Khối', trai: 1 }, { k: 'htxs', nhan: 'Hoàn thành xuất sắc', so: 1 }, { k: 'htt', nhan: 'Hoàn thành tốt', so: 1 },
            { k: 'ht', nhan: 'Hoàn thành', so: 1 }, { k: 'cht', nhan: 'Chưa hoàn thành', so: 1 },
            { k: 'len_lop', nhan: 'Lên lớp', so: 1 }, { k: 'khong_len_lop', nhan: 'Không lên lớp', so: 1 }
          ], dsHs, ds.length > 1 ? tongKq : null);
        }
        var lenLop = cong(ds.filter(function (d) { return Number(d.khoi) < 5; }), ['len_lop', 'khong_len_lop']);
        h += luoiChiTieu([
          oChiTieu('Học sinh lớp 5 hoàn thành chương trình tiểu học', nd.hoan_thanh_cth, nd.tong_lop5),
          lenLop.len_lop !== '' ? oChiTieu('Tỷ lệ lên lớp (khối 1–4)', lenLop.len_lop, soN(lenLop.len_lop) + soN(lenLop.khong_len_lop)) : '',
          tongHs.hai_buoi !== '' ? oChiTieu('Học sinh học 2 buổi/ngày', tongHs.hai_buoi, tongHs.hoc_sinh) : ''
        ]);
      }
      return h;
    },
    bao_cao: function () {
      var ds = tatCaBaoCao();
      var h = '';
      if (ds.length) {
        var moi = ds[0];
        h += '<ul class="ck-van-ban">' + [moi].map(function (v) {
          var u = link(v.link);
          return '<li><span class="ck-pdf">PDF</span><span class="ck-tvb"><b>' + t(v.ten || ('Báo cáo thường niên năm ' + v.nam)) + '</b><small>' +
            t(v.ghi_chu || ('Số liệu đến 31/12/' + v.nam)) + '</small></span>' +
            (u ? '<a class="ck-xem" href="' + t(u) + '" target="_blank" rel="noopener">Tải về ›</a>' : '') + '</li>';
        }).join('') + '</ul>';
        if (ds.length > 1) h += tieuNho('Lưu trữ các năm') + '<div class="ck-luu-tru">' + ds.slice(1).map(function (v) {
          var u = link(v.link);
          return u ? '<a href="' + t(u) + '" target="_blank" rel="noopener"><b>' + t(v.nam) + '</b>' + t(v.don_vi || 'Tải về') + '</a>'
                   : '<span class="ck-luu-mo"><b>' + t(v.nam) + '</b>' + t(v.don_vi || '') + '</span>';
        }).join('') + '</div>';
      }
      return h;
    }
  };

  // Báo cáo thường niên: gộp MỌI năm học đã công bố (lưu trữ 05 năm — Điều 15 khoản 2)
  function tatCaBaoCao() {
    var ds = [];
    BAN.forEach(function (r) {
      if (r.muc !== 'bao_cao') return;
      ((r.noi_dung || {}).ban || []).forEach(function (b) { if (b && (b.nam || b.link)) ds.push(b); });
    });
    var thay = {};
    ds = ds.filter(function (b) { var k = (b.nam || '') + '|' + (b.link || '') + '|' + (b.don_vi || ''); if (thay[k]) return false; thay[k] = 1; return true; });
    ds.sort(function (a, b) { return String(b.nam || '').localeCompare(String(a.nam || '')); });
    return ds;
  }
  function baoCaoMoiNhat() { return tatCaBaoCao()[0] || null; }
  function baoCaoRow() {
    var r = lay('bao_cao');
    if (r) return r;
    var ds = BAN.filter(function (x) { return x.muc === 'bao_cao'; })
      .sort(function (a, b) { return String(b.nam_hoc).localeCompare(String(a.nam_hoc)); });
    return ds[0] || null;
  }

  function veChan(tt, ten) {
    var c = C();
    var lh = [tt.dien_thoai ? 'Điện thoại: ' + t(tt.dien_thoai) : '', tt.email ? 'Thư điện tử: ' + t(tt.email) : ''].filter(Boolean).join(' · ');
    return '<footer class="ck-chan" id="ck-lien-he"><div class="ck-khung"><div><h4>' + t(ten) + '</h4><p>' + t(tt.tru_so || c.DIA_CHI_TRUONG || '') +
      (lh ? '<br>' + lh : '') + '</p>' +
      (tt.nguoi_phu_trach ? '<p class="ck-cach">Người phụ trách công tác công khai: <b>' + t(tt.nguoi_phu_trach) + '</b></p>' : '') + '</div>' +
      '<div><h4>Căn cứ công khai</h4><p>Thông tư 09/2024/TT-BGDĐT ngày 03/6/2024 của Bộ trưởng Bộ Giáo dục và Đào tạo quy định về công khai trong hoạt động của các cơ sở giáo dục thuộc hệ thống giáo dục quốc dân.</p></div>' +
      '<div><h4>Dành cho cán bộ, giáo viên</h4><p>Hồ sơ, điều hành, lớp học và các dữ liệu nội bộ chỉ xem được sau khi đăng nhập.</p>' +
      (CHE_DO === 'ngoai' ? '<p class="ck-cach"><a href="#" data-ck="dang-nhap">Đăng nhập bằng Gmail ›</a></p>' : '') + '</div>' +
      '</div><div class="ck-day">© ' + new Date().getFullYear() + ' ' + t(ten) + ' · Hệ thống Quản trị số Trường học</div></footer>';
  }

  // ══════════ SỰ KIỆN ══════════
  var daGanCuon = false;
  function ganSuKien(el) {
    Array.prototype.slice.call(el.querySelectorAll('[data-ck="dang-nhap"]')).forEach(function (b) {
      b.addEventListener('click', function (e) {
        e.preventDefault();
        b.disabled = true;
        if (b.tagName === 'BUTTON') b.innerHTML = 'Đang chuyển sang Google…';
        if (NUT_DANG_NHAP) NUT_DANG_NHAP();
      });
    });
    Array.prototype.slice.call(el.querySelectorAll('[data-ck="dong"]')).forEach(function (b) {
      b.addEventListener('click', function () { var f = NUT_DONG; window.CONG_KHAI.dong(); if (f) f(); });
    });
    Array.prototype.slice.call(el.querySelectorAll('[data-nam]')).forEach(function (b) {
      b.addEventListener('click', function () { NAM = b.getAttribute('data-nam'); veTrang(); });
    });
    // Liên kết #ck-… : cuộn trong trang, không đổi địa chỉ (app dùng # cho màn hình)
    Array.prototype.slice.call(el.querySelectorAll('a[href^="#ck-"]')).forEach(function (a) {
      a.addEventListener('click', function (e) {
        var dich = document.getElementById(a.getAttribute('href').slice(1));
        if (!dich) return;
        e.preventDefault();
        window.scrollTo({ top: dich.getBoundingClientRect().top + window.pageYOffset - 80, behavior: 'smooth' });
      });
    });
    if (!daGanCuon) {
      daGanCuon = true;
      window.addEventListener('scroll', toSangMucLuc, { passive: true });
    }
    toSangMucLuc();
  }
  function toSangMucLuc() {
    var el = document.getElementById('ck-trang');
    if (!el || !document.body.classList.contains('ck-mo')) return;
    var links = Array.prototype.slice.call(el.querySelectorAll('.ck-muc-luc a'));
    var y = window.pageYOffset + 130, k = 0;
    links.forEach(function (a, i) {
      var m = document.getElementById(a.getAttribute('href').slice(1));
      if (m && m.getBoundingClientRect().top + window.pageYOffset <= y) k = i;
    });
    links.forEach(function (a, i) { a.classList.toggle('dang', i === k); });
  }

  function mo(banGhi, cheDo) {
    BAN = banGhi || [];
    CHE_DO = cheDo;
    var nam = dsNam();
    if (nam.indexOf(NAM) < 0) NAM = nam[0] || (window.CAU_HINH && window.CAU_HINH.NAM_HOC) || '';
    document.body.classList.add('ck-mo');
    veTrang();
    window.scrollTo(0, 0);
    // Tiêu đề thẻ trình duyệt — giữ lại tiêu đề cũ để trả về khi đóng cổng
    if (TIEU_DE_CU == null) TIEU_DE_CU = document.title;
    document.title = 'Công khai — ' + ((C().TEN_TRUONG) || 'Quản trị số');
  }

  window.CONG_KHAI = {
    MUC: MUC,
    COT: COT,
    hanNam: hanNam,
    // Người chưa đăng nhập: đọc bản công bố, có thì dựng cổng.
    thu: function (may, dangNhap) {
      if (!may) return Promise.resolve(false);
      // ?dangnhap=1 — lối tắt cho thầy cô lưu vào dấu trang: vào thẳng hộp đăng nhập
      if (/[?&]dangnhap=1\b/.test(location.search)) return Promise.resolve(false);
      NUT_DANG_NHAP = dangNhap;
      return Promise.resolve(may.from('cong_khai').select(COT).eq('trang_thai', 'cong_bo'))
        .then(function (r) {
          // Bảng chưa có (trường chưa chạy sql/80) hay lỗi gì khác → giữ cổng đăng nhập cũ
          if (!r || r.error || !r.data || !r.data.length) return false;
          mo(r.data, 'ngoai');
          return true;
        }, function () { return false; });
    },
    // Người đã đăng nhập xem cổng (menu tài khoản) hoặc BGH xem trước nháp
    xem: function (may, dongLai, banNhap) {
      NUT_DONG = dongLai || null;
      if (banNhap) { mo(banNhap, 'thu'); return Promise.resolve(true); }
      return Promise.resolve(may.from('cong_khai').select(COT).eq('trang_thai', 'cong_bo')).then(function (r) {
        mo((r && r.data) || [], 'xem');
        return true;
      });
    },
    dong: function () {
      document.body.classList.remove('ck-mo');
      var el = document.getElementById('ck-trang');
      if (el) el.innerHTML = '';
      NUT_DONG = null;
      if (TIEU_DE_CU != null) { document.title = TIEU_DE_CU; TIEU_DE_CU = null; }
    },
    dangMo: function () { return document.body.classList.contains('ck-mo'); }
  };
})();
