// ============================================================
// CẤU HÌNH DUY NHẤT CỦA TRANG — thdienlien-v2
// File DUY NHẤT cần sửa khi nối backend thật.
// Khi DIA_CHI/KHOA_CONG_KHAI để trống → trang chạy CHẾ ĐỘ XEM THỬ
// (dữ liệu mẫu trong js/du-lieu-demo.js, không cần đăng nhập).
// ============================================================
window.CAU_HINH = {
  // --- Supabase (dự án th-dien-lien, dựng 10/8/2026) ---
  DIA_CHI: 'https://qbfyolhehltfrefudexz.supabase.co',
  KHOA_CONG_KHAI: 'sb_publishable_VLVtHQ2iHbbodarb0N0QAQ_kohJ0-_7', // khóa công khai — hàng rào nằm ở RLS

  // --- Thông tin trường (bản hiển thị; bản chính thức nằm ở bảng cau_hinh trên CSDL) ---
  TEN_TRUONG: 'Trường Tiểu học Diễn Liên',
  DIA_CHI_TRUONG: 'Xã Quảng Châu, Tỉnh Nghệ An',
  DON_VI_CHU_QUAN: 'UBND XÃ QUẢNG CHÂU',
  CO_QUAN_QUAN_LY: 'SỞ GIÁO DỤC VÀ ĐÀO TẠO NGHỆ AN',
  HIEU_TRUONG: 'Nguyễn Thị Hòa',
  PHO_HIEU_TRUONG: 'Trần Thanh Chung',
  // Năm học KHÔNG ghi cứng — tính theo ngày ở cuối tệp này.
  // Giá trị đặt sẵn đây chỉ là chỗ giữ chỗ, sẽ bị ghi đè ngay bên dưới.
  NAM_HOC: '',
  SLOGAN: 'Vững bước tương lai – Tự tin hội nhập',

  // --- App xếp Thời khóa biểu (dự án riêng: Schoolrecords/tkb) ---
  // Hồ sơ số KHÔNG quản lý thời khóa biểu và KHÔNG bố trí dạy thay — app kia
  // đã làm cả hai, lại làm sâu hơn (tự sinh phương án dạy thay để Hiệu trưởng
  // chọn). Ở đây chỉ có một nút mở sang đó. Xem mục 13.7 sổ dự án.
  URL_TKB: 'https://schoolrecords.github.io/tkb/',

  // --- Mục tiêu chất lượng ---
  // Trường đã đạt chuẩn quốc gia MỨC ĐỘ 2 từ năm 2022 (thầy Chung xác nhận 11/8/2026)
  MUC_TIEU_CHUAN_QG: 'Giữ vững và phát triển chuẩn quốc gia Mức độ 2',

  // --- Số dự phòng cho bản in khi chưa đếm được từ CSDL (máy đếm được thì
  //     luôn ưu tiên số đếm thật) ---
  DIA_DANH: 'Quảng Châu',
  SO_LOP: 25,
  SO_HOC_SINH: 863,
  SO_CBGV: 37,
};
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
window.CAU_HINH.MOC_DOI_NAM_HOC = '30/08';
window.CAU_HINH.NAM_HOC = window.tinhNamHoc(window.CAU_HINH.MOC_DOI_NAM_HOC);

// Cờ suy ra, các file khác đọc cờ này — không tự kiểm tra chuỗi rỗng
window.DA_NOI = !!(window.CAU_HINH.DIA_CHI && window.CAU_HINH.KHOA_CONG_KHAI);
