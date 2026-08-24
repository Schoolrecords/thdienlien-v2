// ============================================================
// CẤU HÌNH — thdienlien-v2
//
// 🔴 TỆP NÀY KHÔNG CÒN CHỨA DANH SÁCH TRƯỜNG (đổi ngày 19/8/2026).
//
// Trước đây mọi trường khai chung trong một mảng DS_TRUONG ngay tại đây. Tệp
// này ai cũng tải về được, nên chỉ cần Ctrl+U là đọc trọn tên đầy đủ mọi
// trường, tên hiệu trưởng, mã Sở và địa chỉ Supabase. Khoá công khai thì không
// sao — hàng rào thật nằm ở RLS — nhưng DANH SÁCH TRƯỜNG thì không được để lộ:
// thầy cô trường này không việc gì phải biết trường kia cũng dùng app.
//
// Nay cấu hình từng trường nằm ở tệp riêng, CHỈ tải khi đã biết hỏi tệp nào:
//     cau-hinh/ma/<mã trường>.json        ← khi người dùng gõ đúng mã
//     cau-hinh/ten-mien/<tên miền>.json   ← khi mở đúng tên miền của trường
// Tệp bí danh chỉ ghi { "xem": "<mã chính>" } — nhờ vậy một trường có nhiều mã
// (mã Sở, mã CSDL ngành, mã ngắn) mà cấu hình vẫn chỉ có MỘT bản, không lệch.
// Đổi mã trường sau sáp nhập = thêm một tệp mã mới + giữ tệp mã cũ làm bí danh.
//
// ⚠️ GIỚI HẠN PHẢI BIẾT: kho mã này đang CÔNG KHAI, nên tuy xem mã nguồn trang
//    không còn ra danh sách, người vào github.com duyệt thư mục cau-hinh/ thì
//    vẫn đọc được. Chỉ đóng hẳn được khi kho mã chuyển RIÊNG TƯ — tức là
//    chuyển nơi đăng trang sang Cloudflare Pages (§15.2 bản kế hoạch).
//
// ⚠️ Cấu hình ở đây chỉ là bản DỰ PHÒNG lúc chưa đăng nhập. Đăng nhập xong,
//    js/du-lieu-sql.js ghi đè bằng bảng cau_hinh trên CSDL — đó mới là nguồn
//    chuẩn. Đổi tên hiệu trưởng, quy mô trường… sửa CSDL, KHÔNG sửa mã.
// ============================================================

// --- Phần dùng chung cho MỌI trường ---
window.CHUNG = {
  // App xếp Thời khóa biểu (dự án riêng: Schoolrecords/tkb) — Quản trị số KHÔNG
  // quản lý thời khóa biểu và KHÔNG bố trí dạy thay, app kia đã làm cả hai và
  // làm sâu hơn. Ở đây chỉ có lối mở sang đó. Xem mục 13.7 sổ dự án.
  //
  // ⚠️ App TKB là MỘT TRƯỜNG MỘT DỰ ÁN (Supabase riêng), không đa trường như
  //    Quản trị số. Địa chỉ dưới đây là app của Diễn Liên, mà khoá này nằm ở
  //    CHUNG nên MỌI trường đều mở vào đó. Trường nào có app thời khóa biểu
  //    riêng thì khai đè `"URL_TKB": "…"` trong cau-hinh/ma/<mã>.json — khoá
  //    khai trong tệp trường luôn thắng khoá ở CHUNG (window.apDungCauHinh).
  //    Khai chuỗi rỗng thì ô Thời khóa biểu ở trang chủ KHÔNG hiện.
  URL_TKB: 'https://tkb.quantrisotruonghoc.com/',

  // Mốc đổi năm học mặc định. Trường nào khác thì đặt đè trong tệp cấu hình
  // của trường, hoặc sửa khóa 'moc_doi_nam_hoc' trong bảng cau_hinh.
  // 19/8/2026 đổi 30/08 → 01/08: tháng 8 các trường đã tựu trường, họp hội
  // đồng, lên kế hoạch năm học MỚI, mà app vẫn đề năm học cũ suốt cả tháng.
  MOC_DOI_NAM_HOC: '01/08',

  // Tên hệ thống dùng khi chưa biết người vào thuộc trường nào.
  TEN_HE_THONG: 'Hệ thống Quản trị số Trường học',

  // ── Nơi nhận ĐĂNG KÝ SỬ DỤNG ──────────────────────────────────────────────
  // Google Form của người phụ trách hệ thống (thầy Chung lập 20/8/2026). Trường
  // mới bấm "Gửi đăng ký" là nội dung chạy thẳng vào Form → Google Sheet, và
  // Form bật thông báo thư nên người phụ trách biết ngay, không phải chờ trường
  // chủ động nhắn Zalo.
  //   · ID  : mã form, nằm trong địa chỉ .../forms/d/e/<ID>/viewform
  //   · O   : mã từng ô. KHÔNG gõ tay — lấy từ chính trang form
  //           (biến FB_PUBLIC_LOAD_DATA_ trong mã nguồn trang).
  // Sửa câu hỏi trong Form thì mã ô GIỮ NGUYÊN; chỉ khi XOÁ rồi thêm câu hỏi
  // mới mã mới đổi — lúc đó phải lấy lại, không thì đăng ký rơi vào ô trống.
  FORM_DANG_KY: {
    ID: '1FAIpQLSeLWXLSeJp5KYW1XU8O_pj3h0kIzMfXA0wtBFN5Apm14XWcfw',
    O: {
      ten:     'entry.1445456973',
      maso:    'entry.300178935',
      xa:      'entry.1698181416',
      tinh:    'entry.1238655743',
      nguoi:   'entry.314915178',
      chucvu:  'entry.2048514167',
      dt:      'entry.836614730',
      email:   'entry.1903822448',
      ghichu:  'entry.2022667342'
    }
  },

  // ── Liên hệ in trên màn Đăng ký sử dụng ──
  // ĐỂ TRỐNG có chủ ý: kho mã này CÔNG KHAI, điền vào là cả mạng đọc được và
  // máy quét thư rác lấy được. Thầy Chung chốt số/địa chỉ muốn công khai rồi
  // mới điền. Trống thì màn đăng ký tự ẩn phần liên hệ, không hiện ô rỗng.
  LIEN_HE_TEN: '',
  LIEN_HE_DIEN_THOAI: '',
  LIEN_HE_EMAIL: ''
};

// ============================================================
// CẤU HÌNH TRUNG TÍNH — luôn là một đối tượng dùng được, ngay từ nhịp đầu.
// Hơn hai chục tệp khác đọc window.CAU_HINH, có tệp đọc ngay lúc nạp; để nó
// undefined một nhịp là cả loạt tệp đó ném lỗi.
// KHÔNG mang tên, số liệu hay địa chỉ của trường nào — lỡ lọt ra màn hình thì
// cũng không in nhầm tên trường khác.
// ============================================================
window.CAU_HINH = (function () {
  var r = {
    MA: '', MA_SO: '', MA_MOET: '',
    DIA_CHI: '', KHOA_CONG_KHAI: '',
    TEN_TRUONG: window.CHUNG.TEN_HE_THONG, DIA_CHI_TRUONG: '', DIA_DANH: '',
    DON_VI_CHU_QUAN: '', CO_QUAN_QUAN_LY: '', CHU_QUAN_THUONG: '', CO_QUAN_THUONG: '',
    HIEU_TRUONG: '', PHO_HIEU_TRUONG: '', DIEN_THOAI: '', EMAIL_TRUONG: '',
    SLOGAN: '', MUC_TIEU_CHUAN_QG: '', MUC_CHUAN_QG: '',
    THU_MUC_ANH: 'img/', SO_LOP: 0, SO_HOC_SINH: 0, SO_CBGV: 0,
    // Tổ chức đảng của trường: 'chi_bo' | 'dang_bo' | 'khong'. Xem window.TU_NGU_DANG.
    TO_CHUC_DANG: 'chi_bo', SO_DANG_VIEN: 0
  }, k;
  for (k in window.CHUNG) if (Object.prototype.hasOwnProperty.call(window.CHUNG, k)) r[k] = window.CHUNG[k];
  return r;
})();

// ============================================================
// TỔ CHỨC ĐẢNG CỦA TRƯỜNG — BỘ TỪ VỰNG DÙNG CHUNG
//
// Trường sáp nhập đủ 30 đảng viên lập ĐẢNG BỘ cơ sở, dưới có các CHI BỘ trực
// thuộc (các xã chia theo điểm trường). Trường không sáp nhập vẫn chỉ là CHI
// BỘ cơ sở — TH Hưng Đông là một ví dụ. Hai mô hình KHÔNG phải hai danh mục:
// chi bộ cơ sở và đảng bộ cơ sở cùng là tổ chức cơ sở đảng, cùng nhiệm vụ theo
// Điều lệ Đảng, nên hồ sơ trùng khít. Khác đúng hai thứ: cụm từ gọi tên, và số
// tổ chức cấp dưới (0 hay N).
//
// 🔑 BẢNG NÀY KHÔNG DÙNG ĐỂ VẼ MÀN HÌNH. Tên hồ sơ lưu CHỮ THẬT trong cơ sở dữ
//    liệu, không lưu ký hiệu thay thế kiểu {TCCSĐ}. Lý do: đường hiển thị của
//    app quá nhiều — bảng danh mục, tải Word, xuất Excel, phiếu giao việc,
//    minh chứng bên Trường chuẩn. Sót MỘT chỗ thay là bản Word gửi Đảng ủy xã
//    in ra dấu ngoặc nhọn, mà app vẫn báo xuất thành công.
//    Bảng này chỉ để: (1) hiện nhãn đúng ở màn Quản trị, (2) đối chiếu khi
//    hàm chuyen_mo_hinh_dang() trên máy chủ (sql/54) đổi cụm từ.
//
// 🔴 "Đảng bộ" là TỔ CHỨC, "Đảng ủy" là CƠ QUAN BAN HÀNH văn bản. Nghị quyết do
//    Đảng ủy ra, đại hội là của Đảng bộ. Bên chi bộ thì chi bộ ra nghị quyết
//    trực tiếp — chi ủy không ra nghị quyết. Lẫn hai chữ này là sai thể thức.
// ============================================================
window.TU_NGU_DANG = {
  chi_bo: {
    nhan:     'Chi bộ',
    hop:      'Chi bộ',
    capUy:    'Chi ủy',
    biThu:    'Bí thư Chi bộ',
    nghiQuyet:'Nghị quyết chi bộ',
    daiHoi:   'Đại hội chi bộ',
    moTa:     'Trường chưa sáp nhập hoặc chưa đủ 30 đảng viên — tổ chức cơ sở đảng là chi bộ, dưới có tổ đảng.'
  },
  dang_bo: {
    nhan:     'Đảng bộ (có chi bộ trực thuộc)',
    // Tên HỘP là "Đảng bộ" (TỔ CHỨC — đối xứng hộp "Chi bộ" của trường nhỏ,
    // chốt của thầy Chung 24/8/2026). Các khoá dưới vẫn "Đảng ủy" vì đó là
    // CƠ QUAN ban hành / chức danh — xem chú thích 🔴 phía trên.
    hop:      'Đảng bộ',
    capUy:    'Ban Thường vụ Đảng ủy',
    biThu:    'Bí thư Đảng ủy',
    nghiQuyet:'Nghị quyết Đảng ủy',
    daiHoi:   'Đại hội Đảng bộ',
    moTa:     'Trường sáp nhập từ 30 đảng viên trở lên. Dưới 30 vẫn lập được nhưng phải có văn bản đồng ý của cấp ủy cấp trên (Điều lệ Đảng, Điều 21 khoản 5).'
  },
  khong: {
    nhan:     'Không có tổ chức đảng riêng',
    hop:      'Chi bộ',
    capUy:    'Chi ủy',
    biThu:    'Bí thư Chi bộ',
    nghiQuyet:'Nghị quyết chi bộ',
    daiHoi:   'Đại hội chi bộ',
    moTa:     'Dưới 3 đảng viên chính thức — chưa lập được tổ chức đảng, đảng viên sinh hoạt ghép nơi khác.'
  }
};

// Trả về bộ từ vựng đang dùng. Giá trị lạ thì lùi về chi_bo — mô hình phổ
// biến nhất, và là bên KHÔNG có chi bộ trực thuộc nên không bày ra thứ thừa.
window.tuNguDang = function () {
  return window.TU_NGU_DANG[window.CAU_HINH.TO_CHUC_DANG] || window.TU_NGU_DANG.chi_bo;
};

// ============================================================
// NĂM HỌC HIỆN HÀNH — TỰ TÍNH THEO NGÀY, KHÔNG GHI CỨNG
// Mốc mặc định 01/08: từ ngày này trở đi là năm học mới.
//   · 31/7/2026  → 2025-2026   (chưa qua mốc)
//   · 01/8/2026  → 2026-2027   (đúng ngày mốc là đổi)
//   · 20/5/2027  → 2026-2027
// Ghi cứng năm học là cái bẫy: đến hè năm sau không ai nhớ vào sửa, cả hệ
// thống ghi dữ liệu sai năm mà không ai biết.
// Mốc lấy từ bảng cau_hinh (khoá 'moc_doi_nam_hoc') khi đã đăng nhập —
// Sở đổi lịch năm học thì sửa cấu hình, không phải sửa mã.
// ============================================================
window.tinhNamHoc = function (moc, ngay) {
  var d = ngay || new Date();
  var m = /^(\d{1,2})\s*\/\s*(\d{1,2})$/.exec(String(moc || '01/08'));
  var ngayMoc = m ? +m[1] : 1;
  var thangMoc = m ? +m[2] : 8;
  var thang = d.getMonth() + 1;
  var quaMoc = thang > thangMoc || (thang === thangMoc && d.getDate() >= ngayMoc);
  var dau = quaMoc ? d.getFullYear() : d.getFullYear() - 1;
  return dau + '-' + (dau + 1);
};

// ============================================================
// BA NĂM HỌC: NĂM TRƯỚC · NĂM NAY · NĂM SAU
//
// Vì sao KHÔNG chỉ đưa năm hiện hành: phần lớn việc của nhà trường bắc cầu qua
// hai đến ba năm học. Trường mới vào hệ thống hầu như bao giờ cũng nạp dữ liệu
// NĂM CŨ trước (tệp tải từ CSDL ngành là dữ liệu năm vừa xong); Trường chuẩn
// Quốc gia đòi số liệu ba năm liền; đầu tháng 8 vừa đổi năm thì mọi việc dở
// dang vẫn nằm ở năm trước. Ô chọn chỉ có một năm là bắt thầy cô gõ tay —
// gõ tay thì sai chính tả năm học, mà sai năm là dữ liệu lạc chỗ.
//
// Dùng chung cho MỌI màn có chọn năm học. Truyền thêm mảng năm đã có dữ liệu
// thì các năm đó được gộp vào (trường nạp dữ liệu từ 2023 vẫn xem lại được).
// Kết quả sắp mới nhất trước.
// ============================================================
window.baNamHoc = function (themVao) {
  var nay = window.tinhNamHoc(window.CAU_HINH && window.CAU_HINH.MOC_DOI_NAM_HOC);
  var dau = parseInt(nay.slice(0, 4), 10);
  var ds = [
    (dau - 1) + '-' + dau,
    nay,
    (dau + 1) + '-' + (dau + 2)
  ];
  (themVao || []).forEach(function (n) {
    if (n && /^\d{4}-\d{4}$/.test(n) && ds.indexOf(n) < 0) ds.push(n);
  });
  return ds.sort().reverse();
};

// ============================================================
// ÁP CẤU HÌNH MỘT TRƯỜNG VÀO window.CAU_HINH
//
// 🔑 SỬA TẠI CHỖ, KHÔNG THAY CẢ ĐỐI TƯỢNG. Vài tệp giữ sẵn tham chiếu tới
//    window.CAU_HINH ngay lúc nạp (bach-lieu-shim.js, xuat-word.js…); thay cả
//    đối tượng thì chúng ôm bản cũ mà không ai biết. Đây cũng đúng lối
//    js/du-lieu-sql.js vẫn làm khi ghi đè bằng bảng cau_hinh.
// ============================================================
window.apDungCauHinh = function (obj) {
  var k;
  for (k in obj) {
    if (!Object.prototype.hasOwnProperty.call(obj, k)) continue;
    if (k.charAt(0) === '_' || k === 'xem') continue;   // khoá chú thích, không phải cấu hình
    window.CAU_HINH[k] = obj[k];
  }
  window.MA_TRUONG = window.CAU_HINH.MA || '';
  window.CAU_HINH.NAM_HOC = window.tinhNamHoc(window.CAU_HINH.MOC_DOI_NAM_HOC);
  window.DA_NOI = !!(window.CAU_HINH.DIA_CHI && window.CAU_HINH.KHOA_CONG_KHAI);
  window.CAU_HINH.DA_NOI = window.DA_NOI;   // tên mà các tệp bê từ Bạch Liêu trông đợi
  return window.CAU_HINH;
};
window.CAU_HINH.NAM_HOC = window.tinhNamHoc(window.CAU_HINH.MOC_DOI_NAM_HOC);
window.DA_NOI = false;
window.CAU_HINH.DA_NOI = false;

// ============================================================
// TẢI CẤU HÌNH
// ============================================================
(function () {
  var GOC = 'cau-hinh/';

  // Chỉ nhận chữ thường, số, gạch ngang, gạch dưới — chặn '..' và '/' để không
  // ai nắn được đường dẫn đi nơi khác bằng cách gõ mã bậy vào ô nhập.
  function saChMa(s) {
    var t = String(s || '').replace(/\s+/g, '').toLowerCase();
    return /^[a-z0-9_-]{1,32}$/.test(t) ? t : '';
  }
  function saChHost(s) {
    var t = String(s || '').replace(/^www\./, '').toLowerCase();
    return /^[a-z0-9.-]{1,64}$/.test(t) && t.indexOf('..') === -1 ? t : '';
  }

  // ── Nhớ cấu hình vào máy ────────────────────────────────────────────────
  // Tách cấu hình ra tệp riêng nghĩa là thêm MỘT lần tải mạng trước khi vào
  // được app — một chỗ hỏng mới cho thầy cô ở nơi mạng chập chờn. Nhớ lại bản
  // đã tải thành công thì lần sau mạng có trục trặc vẫn vào bình thường.
  // Đây là cấu hình trường của CHÍNH người dùng, không phải dữ liệu của ai khác.
  function khoaNho(ten) { return 'cau_hinh_v1_' + ten; }
  function ghiNho(ten, obj) {
    try { localStorage.setItem(khoaNho(ten), JSON.stringify(obj)); } catch (e) { /* bỏ qua */ }
  }
  function docNho(ten) {
    try {
      var s = localStorage.getItem(khoaNho(ten));
      return s ? JSON.parse(s) : null;
    } catch (e) { return null; }
  }

  // Tải một tệp cấu hình. Trả về:
  //   đối tượng  — đọc được
  //   'khong-co' — máy chủ trả 404, tức KHÔNG có trường nào mang mã/tên miền đó
  //   null       — lỗi mạng hoặc tệp hỏng (KHÁC HẲN 404, đừng gộp làm một)
  function tai(duongDan, tenNho) {
    if (typeof fetch !== 'function') return Promise.resolve(null);
    return fetch(duongDan, { cache: 'no-cache' }).then(function (r) {
      if (r.status === 404) return 'khong-co';
      if (!r.ok) return null;
      return r.json().then(function (o) {
        // Máy chủ trả lời được nhưng nội dung không phải một đối tượng cấu hình
        // → coi như KHÔNG CÓ tệp, đừng coi là lỗi. Xem khối 🔴 ngay dưới.
        if (!o || typeof o !== 'object') return 'khong-co';
        if (tenNho) ghiNho(tenNho, o);
        return o;
      }, function () { return 'khong-co'; });
    }, function () { return null; });   // mất mạng — CHỈ ở đây mới là lỗi thật
  }
  // 🔴 VÌ SAO "đọc được nhưng không phải JSON" = KHÔNG CÓ, chứ không phải LỖI
  //
  // Hai nơi đăng trang trả lời KHÁC NHAU khi tệp không tồn tại:
  //     GitHub Pages      → 404, đúng chuẩn
  //     Cloudflare Pages  → 200 kèm NGUYÊN index.html
  // Bản đầu chỉ xét status 404, nên trên Cloudflare Pages thì tra tệp cấu hình
  // không có sẽ nhận 200 + HTML, r.json() vỡ, và app tưởng MẤT MẠNG — hiện màn
  // "Không tải được thông tin nhà trường" thay vì màn khai mã trường. Nghĩa là
  // cổng chung không vào được, mà chẳng có lỗi nào để lần ra.
  //
  // Cách phân biệt đúng và bền, không phụ thuộc nơi đăng trang:
  //     · fetch NÉM LỖI            → mất mạng thật      → 'loi'
  //     · trả lời được, không JSON → tệp không tồn tại   → 'khong-co'
  // Máy chủ đã nói chuyện được thì đường mạng không hỏng; nó chỉ đưa nhầm thứ.

  // Tải theo mã, tự đi tiếp MỘT nấc bí danh ({ "xem": "<mã chính>" }).
  // Chỉ một nấc: bí danh trỏ vào bí danh là lỗi khai báo, đừng đuổi vòng quanh.
  function taiTheoMa(ma) {
    var m = saChMa(ma);
    if (!m) return Promise.resolve('khong-co');
    return tai(GOC + 'ma/' + m + '.json', 'ma_' + m).then(function (o) {
      if (!o || o === 'khong-co') {
        var nho = docNho('ma_' + m);
        return (o === null && nho) ? nho : o;    // mất mạng thì dùng bản đã nhớ
      }
      if (o.xem) {
        var g = saChMa(o.xem);
        if (!g) return null;
        return tai(GOC + 'ma/' + g + '.json', 'ma_' + g).then(function (p) {
          if (p === null) { var n2 = docNho('ma_' + g); if (n2) return n2; }
          return (p && p !== 'khong-co' && p.xem) ? null : p;   // bí danh hai nấc = khai sai
        });
      }
      return o;
    });
  }

  function taiTheoTenMien(host) {
    var h = saChHost(host);
    if (!h) return Promise.resolve('khong-co');
    return tai(GOC + 'ten-mien/' + h + '.json', 'host_' + h).then(function (o) {
      if (o === null) { var nho = docNho('host_' + h); if (nho) o = nho; }
      if (!o || o === 'khong-co') return o;
      return o.xem ? taiTheoMa(o.xem) : o;
    });
  }

  // Cho màn khai mã trường gọi khi người dùng gõ mã và bấm Vào hệ thống.
  // Trả về:  'ok'  vào được   ·  'khong-co'  không có trường nào mang mã đó
  //          'loi' MẤT MẠNG — KHÁC HẲN "mã sai", phải báo khác hẳn
  //
  // 🔴 Bản đầu gộp cả hai thành `false`, nên mạng chớp một nhịp là màn hình
  //    khẳng định "Mã trường không đúng hoặc chưa được cấp quyền sử dụng".
  //    Cô giáo trường mới gõ đúng mã, bị từ chối ba lần, rồi gọi điện báo là
  //    trường mình chưa được cấp quyền. Hàng rào phân biệt hai thứ này đã dựng
  //    kỹ ở hàm tai() phía trên — nhưng lúc đó chỉ dựng cho đường nạp đầu
  //    trang, quên đúng đường người dùng TỰ GÕ MÃ.
  window.napCauHinhTheoMa = function (ma) {
    return taiTheoMa(ma).then(function (o) {
      if (o === null) return 'loi';          // fetch ném lỗi = mất mạng thật
      if (!o || o === 'khong-co') return 'khong-co';
      window.apDungCauHinh(o);
      try { localStorage.setItem('ma_truong', saChMa(ma)); } catch (e) { /* bỏ qua */ }
      return 'ok';
    }, function () { return 'loi'; });
  };

  // ── Trường VỪA DÙNG trên máy này — cho lối tắt ở màn khai mã ───────────
  // Trả { ma, ten } nếu máy còn nhớ mã trường, null nếu không. Tên lấy từ bản
  // cấu hình đã nhớ (ghiNho) — chưa từng tải được thì đành trống, màn khai mã
  // tự lo cách hiện. CHỈ đọc dấu vết của CHÍNH máy này, không hỏi mạng: đây
  // là lịch sử của người dùng, không phải danh sách trường của hệ thống.
  window.truongVuaDung = function () {
    var ma = '';
    try { ma = saChMa(localStorage.getItem('ma_truong')); } catch (e) { return null; }
    if (!ma) return null;
    var o = docNho('ma_' + ma);
    if (o && o.xem) o = docNho('ma_' + saChMa(o.xem));
    return { ma: ma, ten: (o && o.TEN_TRUONG) || '' };
  };

  // ── Hồ sơ trường MẪU cho chế độ xem thử ────────────────────────────────
  // Tên "Minh Họa" cố tình bịa — đã đối chiếu bảng 513 trường tiểu học của Sở,
  // không trường nào trùng. Đặt tên một trường có thật vào bản mẫu là có ngày
  // số liệu giả bị chụp màn hình rồi lan đi như số liệu thật.
  var TRUONG_MAU = {
    MA: '', MA_SO: '', MA_MOET: '', DIA_CHI: '', KHOA_CONG_KHAI: '',
    TEN_TRUONG: 'Trường Tiểu học Minh Họa',
    DIA_CHI_TRUONG: 'Bản xem thử — không phải trường có thật',
    SLOGAN: 'Bản xem thử của hệ thống Quản trị số Trường học',
    THU_MUC_ANH: 'img/', SO_LOP: 0, SO_HOC_SINH: 0, SO_CBGV: 0,
    // Trường mẫu là trường SÁP NHẬP ba điểm nên đi theo mô hình đảng bộ —
    // khớp với js/du-lieu-demo.js (hộp H04 Đảng ủy + ba chi bộ H15-H17).
    // 28 đảng viên là con số CHƯA ĐỦ 30 có chủ ý: bản xem thử phô luôn lời
    // nhắc "phải có văn bản đồng ý của cấp ủy cấp trên" (Điều lệ Đảng Đ.21.5),
    // đúng tình cảnh phần lớn trường tiểu học sau sáp nhập.
    TO_CHUC_DANG: 'dang_bo', SO_DANG_VIEN: 28
  };
  window.hoSoTruongMau = function () { return TRUONG_MAU; };

  // ══════════════════════════════════════════════════════════
  // TRÌNH TỰ NHẬN DIỆN — giữ đúng thứ tự cũ
  //   1. ?truong=<mã>     người gõ rõ ra là đang chỉ định, phải nghe theo.
  //                       Nhờ vậy mở được bản xem thử của trường bạn ngay trên
  //                       địa chỉ của một trường khác để chào hàng — đừng đảo lại.
  //   2. tên miền riêng   cách nhận diện chính của từng trường.
  //   3. mã đã nhớ        thầy cô khỏi gõ lại trên điện thoại.
  //   4. không ra gì      → màn khai mã trường (cổng chung).
  //
  // Kết quả đặt ở window.TRANG_THAI_CAU_HINH:
  //   'da-biet'   biết trường rồi
  //   'chua-biet' địa chỉ này không thuộc trường nào → hiện màn khai mã
  //   'xem-thu'   đang chạy bản mẫu
  //   'loi'       KHÔNG tải được cấu hình (mất mạng, tệp hỏng)
  //               ⚠️ 'loi' KHÁC 'chua-biet'. Gộp hai cái làm một thì mạng trục
  //               trặc một nhịp là thầy cô đang dùng thật bị đá ra màn khai mã và
  //               tưởng mình mất tài khoản.
  // ══════════════════════════════════════════════════════════
  var timKiem = location.search || '';
  var host = saChHost(location.hostname || '');
  var qMa = /[?&]truong=([a-z0-9_-]+)/i.exec(timKiem);
  var laXemThu = /[?&]xemthu=1/.test(timKiem);
  var doiTruong = /[?&]doitruong=1/.test(timKiem);
  var epCong = /[?&]cong=1/.test(timKiem);

  if (doiTruong) { try { localStorage.removeItem('ma_truong'); } catch (e) { /* bỏ qua */ } }

  function xong(trangThai) {
    window.TRANG_THAI_CAU_HINH = trangThai;
    // Hai tên cũ, giữ để các tệp khác không phải đổi theo.
    window.CHUA_CHON_TRUONG = (trangThai === 'chua-biet');
    window.O_CONG_CHUNG = (trangThai === 'chua-biet' || trangThai === 'loi');
    try {
      document.dispatchEvent(new Event('cau-hinh-xong'));
    } catch (e) { /* trình duyệt quá cũ thì thôi, các tệp vẫn chờ bằng promise */ }
    return trangThai;
  }

  function nhoDuoc() {
    if (doiTruong || laXemThu) return '';
    try { return saChMa(localStorage.getItem('ma_truong')); } catch (e) { return ''; }
  }

  window.CAU_HINH_SAN_SANG = (function () {
    // Mở tệp thẳng từ ổ đĩa: fetch không chạy được với giao thức file: →
    // vào luôn bản mẫu. Đây chính là cách chạy thử ghi trong CLAUDE.md.
    if (location.protocol === 'file:') {
      window.apDungCauHinh(TRUONG_MAU);
      return Promise.resolve(xong('xem-thu'));
    }

    var maCanTim = (qMa && saChMa(qMa[1])) || '';
    var buoc;

    if (maCanTim) {
      buoc = taiTheoMa(maCanTim);
    } else if (laXemThu || epCong) {
      // ══════════════════════════════════════════════════════════
      // HAI ĐƯỜNG DẪN ĐỂ CHÀO HÀNG — chạy được trên MỌI địa chỉ, kể cả tên
      // miền riêng của một trường đang dùng thật:
      //     ?cong=1    → màn khai mã trường
      //     ?xemthu=1  → bản dùng thử với dữ liệu mẫu
      // Nhờ vậy chưa có tên miền chung vẫn gửi được đường dẫn cho trường bạn.
      //
      // 🔑 RANH GIỚI PHẢI GIỮ: hai tham số này người dùng phải TỰ GÕ RA. Địa
      //    chỉ TRẦN (không tham số) thì hành vi y hệt như xưa — thầy cô mở tên
      //    miền của trường mình vẫn vào thẳng, không ai bị hỏi mã.
      //
      // Vì sao mở lại cho phép: cả hai chỉ dẫn tới DỮ LIỆU MẪU hoặc màn khai
      // mã — không mở thêm quyền gì, không chạm cơ sở dữ liệu của trường nào
      // (DA_NOI = false), và bản mẫu luôn có băng vàng "CHẾ ĐỘ XEM THỬ" kèm
      // đường về. Cùng lắm là người mở thấy khác thường một nhịp rồi quay lại.
      buoc = Promise.resolve('khong-co');
    } else if (host) {
      window.THEO_TEN_MIEN = true;   // sẽ đặt lại false nếu tên miền không khớp trường nào
      // 🔑 Tên miền riêng của một trường LUÔN THẮNG. Không tham số nào trên
      //    địa chỉ được đổi việc đó — không ai đổi được vẻ ngoài trang thật của
      //    nhà trường chỉ bằng cách thêm chữ vào đường dẫn rồi gửi cho thầy cô.
      buoc = taiTheoTenMien(host).then(function (o) {
        // ── CỔNG CHUNG được khai rõ (cau-hinh/ten-mien/<tên miền>.json có
        //    "cong_chung": true) — tên miền gốc của HỆ THỐNG, không thuộc
        //    trường nào. LUÔN ra màn khai mã, KHÔNG lấy mã đã nhớ ra tự vào:
        //    máy nhớ mã một trường xem thử hôm trước là hôm sau mở trang chào
        //    hàng lại chui thẳng vào trường đó (ngõ cụt Hưng Đông 21/8/2026,
        //    sổ dự án mục 44). Mã đã nhớ chỉ còn dùng làm LỐI TẮT bày trên màn
        //    khai mã (truongVuaDung), người dùng phải tự bấm.
        if (o && o.cong_chung) {
          window.THEO_TEN_MIEN = false;
          return 'khong-co';
        }
        if (o && o !== 'khong-co') return o;
        window.THEO_TEN_MIEN = false;
        var nho = nhoDuoc();
        return nho ? taiTheoMa(nho) : o;
      });
    } else {
      var nho0 = nhoDuoc();
      buoc = nho0 ? taiTheoMa(nho0) : Promise.resolve('khong-co');
    }

    return buoc.then(function (o) {
      if (o && o !== 'khong-co') {
        window.apDungCauHinh(o);
        try {
          if (window.CAU_HINH.MA) {
            localStorage.setItem('ma_truong', window.CAU_HINH.MA);
            // Nhớ cấu hình dưới khóa của CHÍNH mã vừa ghi. Không có dòng này
            // thì truongVuaDung() tra 'ma_' + ma_truong (mã CHÍNH THỨC, ví dụ
            // 'dienlien') mà bản nhớ lại nằm ở khóa theo TÊN TỆP đã tải (ví dụ
            // 'ma_12345') → lối tắt mất tên trường ở đường vào phổ biến nhất
            // (tên miền riêng).
            ghiNho('ma_' + saChMa(window.CAU_HINH.MA), o);
          }
        } catch (e) { /* bỏ qua */ }
        return xong('da-biet');
      }
      if (o === null) return xong('loi');       // mất mạng / tệp hỏng
      if (laXemThu) { window.apDungCauHinh(TRUONG_MAU); return xong('xem-thu'); }
      if (maCanTim) {
        // ?truong=<mã> mà không có trường nào mang mã đó (gõ nhầm, hoặc trường
        // đã gỡ khỏi hệ thống). Nói cho màn khai mã biết để BÁO một câu, và dọn
        // mã đã nhớ nếu trùng — không dọn thì nút lối tắt "Vào lại…" thành nút
        // câm: bấm → nạp lại → màn cũ y nguyên → bấm lại, vòng quanh mãi.
        window.MA_TRUONG_KHONG_CO = maCanTim;
        try {
          if (saChMa(localStorage.getItem('ma_truong')) === maCanTim) localStorage.removeItem('ma_truong');
        } catch (e) { /* bỏ qua */ }
      }
      return xong('chua-biet');
    }, function () { return xong('loi'); });
  })();
})();

// ============================================================
// 🔴 CỜ KHẲNG ĐỊNH TỆP NÀY ĐÃ CHẠY TRỌN VẸN — PHẢI Ở DÒNG CUỐI CÙNG
//
// supabase-ket-noi.js quyết định mở khóa trang dựa trên các cờ khai ở đây.
// Trước đây nó xét sự VẮNG MẶT của cờ (`if (!window.DA_NOI)`), mà cờ vắng mặt
// có HAI nghĩa hoàn toàn khác nhau:
//   · "trường này chưa nối CSDL"  → cho vào xem bản mẫu, đúng
//   · "tệp cauhinh.js chưa chạy"  → CHƯA BIẾT GÌ CẢ, phải đóng
// Không phân biệt được hai nghĩa đó thì một dấu phẩy thiếu trong tệp này làm
// cả hệ thống MỞ TOANG cho người lạ. Đúng kiểu hỏng nguy hiểm nhất: im lặng,
// không báo gì, chỉ mất hàng rào.
//
// Nay đòi một khẳng định DƯƠNG: chỉ khi dòng dưới đây chạy được thì mới tin.
// ⚠️ Thêm mã mới thì thêm PHÍA TRÊN dòng này, đừng thêm dưới.
// ============================================================
window.CAU_HINH_XONG = true;
