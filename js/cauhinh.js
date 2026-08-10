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
  NAM_HOC: '2026-2027',
  SLOGAN: 'Vững bước tương lai – Tự tin hội nhập',

  // --- Mục tiêu chất lượng ---
  MUC_TIEU_CHUAN_QG: 'Giữ vững chuẩn quốc gia Mức độ 1 — phấn đấu Mức độ 2',
};
// Cờ suy ra, các file khác đọc cờ này — không tự kiểm tra chuỗi rỗng
window.DA_NOI = !!(window.CAU_HINH.DIA_CHI && window.CAU_HINH.KHOA_CONG_KHAI);
