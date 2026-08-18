// ============================================================
// CẤU HÌNH CÁC TRƯỜNG DÙNG CHUNG APP NÀY — thdienlien-v2
// File DUY NHẤT cần sửa khi thêm một trường hoặc nối backend thật.
//
// MỘT mã nguồn — NHIỀU trường, mỗi trường MỘT dự án Supabase riêng.
// Vì sao gộp mọi trường vào một tệp chứ không tách js/truong/<mã>.js:
// trang không có bước build, thẻ <script> nạp đồng bộ, nên không thể chọn
// tệp cấu hình theo ?truong= trước khi các tệp khác chạy. Khóa công khai
// KHÔNG phải bí mật (hàng rào nằm ở RLS) nên để chung không sao.
// Quá ~8 trường thì mới cần tính chuyện tách tệp.
//
// Khi DIA_CHI/KHOA_CONG_KHAI của trường đang chọn để trống → trang chạy
// CHẾ ĐỘ XEM THỬ (dữ liệu mẫu trong js/du-lieu-demo.js, không cần đăng nhập).
// Nhờ vậy trường mới xem được bản demo mang tên mình TRƯỚC khi dựng CSDL.
//
// ⚠️ Cấu hình ở đây chỉ là bản DỰ PHÒNG lúc chưa đăng nhập. Đăng nhập xong,
//    js/du-lieu-sql.js ghi đè bằng bảng cau_hinh trên CSDL — đó mới là nguồn
//    chuẩn. Đổi tên hiệu trưởng, quy mô trường… sửa CSDL, KHÔNG sửa mã.
// ============================================================

// --- Phần dùng chung cho MỌI trường ---
window.CHUNG = {
  // App xếp Thời khóa biểu (dự án riêng: Schoolrecords/tkb) — Hồ sơ số KHÔNG
  // quản lý thời khóa biểu và KHÔNG bố trí dạy thay, app kia đã làm cả hai và
  // làm sâu hơn. Ở đây chỉ có một nút mở sang đó. Xem mục 13.7 sổ dự án.
  URL_TKB: 'https://schoolrecords.github.io/tkb/',

  // Mốc đổi năm học mặc định. Trường nào khác thì đặt đè trong mục của trường,
  // hoặc sửa khóa 'moc_doi_nam_hoc' trong bảng cau_hinh của trường đó.
  MOC_DOI_NAM_HOC: '30/08',
};

// --- Từng trường ---
window.DS_TRUONG = {

  dienlien: {
    MA: 'dienlien',
    TEN_MIEN: ['tieuhocdienlien.com'],
    // --- Supabase (dự án th-dien-lien, dựng 10/8/2026) ---
    DIA_CHI: 'https://qbfyolhehltfrefudexz.supabase.co',
    KHOA_CONG_KHAI: 'sb_publishable_VLVtHQ2iHbbodarb0N0QAQ_kohJ0-_7', // khóa công khai — hàng rào nằm ở RLS
    // --- Thông tin trường ---
    TEN_TRUONG: 'Trường Tiểu học Diễn Liên',
    DIA_CHI_TRUONG: 'Xã Quảng Châu, Tỉnh Nghệ An',
    DIA_DANH: 'Quảng Châu',            // đứng trước ngày tháng trong văn bản
    DON_VI_CHU_QUAN: 'UBND XÃ QUẢNG CHÂU',
    CO_QUAN_QUAN_LY: 'SỞ GIÁO DỤC VÀ ĐÀO TẠO NGHỆ AN',
    // Hai khoá trên viết HOA vì đứng ở tiêu đề văn bản (NĐ 30). Hai khoá dưới
    // là chính hai tên đó viết thường, dùng khi nằm giữa câu văn — KHÔNG tự
    // đổi hoa/thường bằng mã, máy không biết đâu là tên riêng.
    CHU_QUAN_THUONG: 'UBND xã Quảng Châu',
    CO_QUAN_THUONG: 'Sở Giáo dục và Đào tạo Nghệ An',
    HIEU_TRUONG: 'Nguyễn Thị Hòa',
    PHO_HIEU_TRUONG: 'Trần Thanh Chung',
    DIEN_THOAI: '',                    // hiện Báo cáo TĐG bỏ trống mục này — xin số rồi điền
    EMAIL_TRUONG: '',
    SLOGAN: 'Vững bước tương lai – Tự tin hội nhập',
    // Trường đã đạt chuẩn quốc gia MỨC ĐỘ 2 từ năm 2022 (thầy Chung xác nhận 11/8/2026)
    MUC_TIEU_CHUAN_QG: 'Giữ vững và phát triển chuẩn quốc gia Mức độ 2',
    MUC_CHUAN_QG: 'Mức 2',             // hiện ở ô số liệu trang chủ; trống thì ô đó hiện "–"
    THU_MUC_ANH: 'img/dienlien/',
    // Số dự phòng cho bản in khi chưa đếm được từ CSDL (đếm được thì luôn ưu tiên số thật)
    SO_LOP: 25,
    SO_HOC_SINH: 863,
    SO_CBGV: 37,
  },

  // ══════════════════════════════════════════════════════════
  // TRƯỜNG TIỂU HỌC CHÂU ĐÌNH — xã Quỳ Hợp, tỉnh Nghệ An
  // Nhận app từ 17/8/2026. Cũng thuộc diện sáp nhập: gộp thêm 1 trường
  // CHƯA BIẾT TÊN, sẽ khai trên app (Cơ sở → Trường tiền thân → 'du_kien').
  //
  // ⛔ DIA_CHI/KHOA_CONG_KHAI để trống → đang chạy CHẾ ĐỘ XEM THỬ.
  //    Điền hai chuỗi này (Supabase → Settings → API) sau khi dựng xong CSDL.
  // ⚠️ Ô nào để trống là CHƯA XIN ĐƯỢC thông tin, KHÔNG phải quên.
  //    Thà để trống còn hơn in nhầm tên trường khác vào văn bản đã đóng dấu.
  // ⚠️ DIA_CHI_TRUONG / DON_VI_CHU_QUAN: Quỳ Hợp trước đây là HUYỆN. Tên xã
  //    dưới đây CHƯA đối chiếu văn bản hiện hành — phải xác nhận trước khi
  //    trường xuất bản Word đầu tiên.
  // ══════════════════════════════════════════════════════════
  chaudinh: {
    MA: 'chaudinh',
    TEN_MIEN: [],
    DIA_CHI: '',
    KHOA_CONG_KHAI: '',
    TEN_TRUONG: 'Trường Tiểu học Châu Đình',
    DIA_CHI_TRUONG: 'Xã Quỳ Hợp, Tỉnh Nghệ An',
    DIA_DANH: 'Quỳ Hợp',
    DON_VI_CHU_QUAN: 'UBND XÃ QUỲ HỢP',
    CO_QUAN_QUAN_LY: 'SỞ GIÁO DỤC VÀ ĐÀO TẠO NGHỆ AN',
    CHU_QUAN_THUONG: 'UBND xã Quỳ Hợp',
    CO_QUAN_THUONG: 'Sở Giáo dục và Đào tạo Nghệ An',
    HIEU_TRUONG: '',
    PHO_HIEU_TRUONG: '',
    DIEN_THOAI: '',
    EMAIL_TRUONG: '',
    SLOGAN: '',
    MUC_TIEU_CHUAN_QG: '',
    MUC_CHUAN_QG: '',
    THU_MUC_ANH: 'img/chaudinh/',
    SO_LOP: 0,
    SO_HOC_SINH: 0,
    SO_CBGV: 0,
  },

};

// ============================================================
// CHỌN TRƯỜNG: ?truong=<mã> → tên miền → lựa chọn đã nhớ → mặc định
// (Thứ tự này khớp §2 bản kế hoạch nhân bản. Trước đây dòng chú thích ghi
//  ngược "tên miền → ?truong=" trong khi mã làm đúng — đọc chú thích mà sửa
//  theo là hỏng cách chào hàng nêu ở bước 1 bên dưới.)
// ============================================================
(function () {
  // Gộp hai đối tượng — viết tay theo lối ES5 cho đồng nhất với cả dự án.
  function gop(a, b) {
    var r = {}, k;
    for (k in a) if (Object.prototype.hasOwnProperty.call(a, k)) r[k] = a[k];
    for (k in b) if (Object.prototype.hasOwnProperty.call(b, k)) r[k] = b[k];
    return r;
  }
  var ds = window.DS_TRUONG;
  var ma = '';
  var host = String(location.hostname || '').replace(/^www\./, '');

  // 1. Theo ?truong=<mã> — ĐỨNG TRƯỚC tên miền, cố ý.
  //    Người gõ hẳn ra ?truong= là đang chỉ định rõ, phải nghe theo. Nhờ vậy
  //    trên chính địa chỉ của Diễn Liên vẫn mở được bản xem thử của trường
  //    khác để cho họ xem — đây là cách chào hàng, đừng đảo lại thứ tự này.
  var q = /[?&]truong=([a-z0-9_-]+)/i.exec(location.search);
  if (q && ds[q[1].toLowerCase()]) ma = q[1].toLowerCase();

  // 2. Theo tên miền — cách nhận diện chính khi mỗi trường có tên miền riêng
  if (!ma) {
    Object.keys(ds).forEach(function (k) {
      (ds[k].TEN_MIEN || []).forEach(function (t) {
        if (String(t).replace(/^www\./, '').toLowerCase() === host.toLowerCase()) ma = k;
      });
    });
  }

  // 3. Nhớ lựa chọn để thầy cô không phải gõ lại ?truong= trên điện thoại.
  //    An toàn: nhớ nhầm trường thì cùng lắm là KHÔNG đăng nhập được (mỗi
  //    trường một CSDL riêng), không đời nào nhìn thấy dữ liệu trường khác.
  try {
    if (!ma) {
      var cu = localStorage.getItem('ma_truong');
      if (cu && ds[cu]) ma = cu;
    }
    if (ma) localStorage.setItem('ma_truong', ma);
  } catch (e) { /* trình duyệt chặn localStorage thì bỏ qua, vẫn chạy được */ }

  // 4. Mặc định — giữ nguyên hành vi cũ cho mọi đường dẫn Diễn Liên đã phát ra
  if (!ds[ma]) ma = 'dienlien';

  window.MA_TRUONG = ma;
  window.CAU_HINH = gop(window.CHUNG, ds[ma]);
})();

// ============================================================
// ĐỔI TRƯỜNG — chỉ có tác dụng khi các trường còn dùng chung một địa chỉ.
// Trường nào đã có tên miền riêng thì vào thẳng tên miền đó, không cần chọn.
// Đặt ở đây (tệp nạp đầu tiên) để mọi màn hình đều gọi được.
// ============================================================
window.dsTruongDeChon = function () {
  return Object.keys(window.DS_TRUONG).map(function (k) {
    return { ma: k, ten: window.DS_TRUONG[k].TEN_TRUONG || k };
  });
};

// Ô chọn trường. Trả về chuỗi rỗng khi app mới có một trường — không bày ra
// thứ vô nghĩa. Gắn ở đâu cũng chạy, nhờ bắt sự kiện ở cấp document bên dưới.
window.htmlChonTruong = function (nhan) {
  var ds = window.dsTruongDeChon();
  if (ds.length < 2) return '';
  return '<div class="chon-truong">' + (nhan || 'Trường:') +
    ' <select class="o-chon-truong">' +
    ds.map(function (t) {
      return '<option value="' + t.ma + '"' +
        (t.ma === window.MA_TRUONG ? ' selected' : '') + '>' + t.ten + '</option>';
    }).join('') + '</select></div>';
};

document.addEventListener('change', function (e) {
  var o = e.target;
  if (!o || !o.classList || !o.classList.contains('o-chon-truong')) return;
  var ma = o.value;
  if (!window.DS_TRUONG[ma] || ma === window.MA_TRUONG) return;
  try { localStorage.setItem('ma_truong', ma); } catch (err) { /* bỏ qua */ }
  // Nạp lại kèm ?truong= để địa chỉ nói rõ đang ở trường nào — thầy cô gửi
  // đường dẫn cho nhau thì người nhận vào đúng trường, không phụ thuộc máy.
  location.href = location.pathname + '?truong=' + encodeURIComponent(ma);
});

// ============================================================
// NĂM HỌC HIỆN HÀNH — TỰ TÍNH THEO NGÀY, KHÔNG GHI CỨNG
// Mốc mặc định 30/08: từ ngày này trở đi là năm học mới.
//   · 11/8/2026  → 2025-2026   (chưa qua mốc)
//   · 30/8/2026  → 2026-2027   (đúng ngày mốc là đổi)
//   · 20/5/2027  → 2026-2027
// Ghi cứng năm học là cái bẫy: đến hè năm sau không ai nhớ vào sửa, cả hệ
// thống ghi dữ liệu sai năm mà không ai biết.
// Mốc lấy từ bảng cau_hinh (khoá 'moc_doi_nam_hoc') khi đã đăng nhập —
// Sở đổi lịch năm học thì sửa cấu hình, không phải sửa mã.
// ============================================================
window.tinhNamHoc = function (moc, ngay) {
  var d = ngay || new Date();
  var m = /^(\d{1,2})\s*\/\s*(\d{1,2})$/.exec(String(moc || '30/08'));
  var ngayMoc = m ? +m[1] : 30;
  var thangMoc = m ? +m[2] : 8;
  var thang = d.getMonth() + 1;
  var quaMoc = thang > thangMoc || (thang === thangMoc && d.getDate() >= ngayMoc);
  var dau = quaMoc ? d.getFullYear() : d.getFullYear() - 1;
  return dau + '-' + (dau + 1);
};
window.CAU_HINH.NAM_HOC = window.tinhNamHoc(window.CAU_HINH.MOC_DOI_NAM_HOC);

// Cờ suy ra, các file khác đọc cờ này — không tự kiểm tra chuỗi rỗng
window.DA_NOI = !!(window.CAU_HINH.DIA_CHI && window.CAU_HINH.KHOA_CONG_KHAI);
