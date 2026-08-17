// ============================================================
// bach-lieu-shim.js — LỚP TƯƠNG THÍCH để chạy NGUYÊN VĂN các file
// của app THCS Bạch Liêu trên nền Diễn Liên.
// Nguyên tắc: file gốc Bạch Liêu KHÔNG sửa (trừ chỗ dính cấp học) —
// mọi khác biệt tên gọi giữa hai app hấp thụ ở đây.
// Nạp TRƯỚC các file bê từ Bạch Liêu sang.
//
// Bảng ánh xạ:
//   Bạch Liêu              →  Diễn Liên
//   window.sbClient           window.MAY_CHU (gán muộn → dùng getter)
//   CAU_HINH.DA_NOI           window.DA_NOI
//   sự kiện 'dangnhap-xong'   supabase-ket-noi.js phát sau khi đăng nhập hoạt động
//   notify / qtTabPhu / moQuanTri / NGUOI_DUNG   (trùng tên sẵn)
//   xacNhan / baoTin          định nghĩa tại đây
// ============================================================
(function () {
  'use strict';

  // Cờ + hằng cấu hình các file Bạch Liêu trông đợi
  window.CAU_HINH.DA_NOI = !!window.DA_NOI;
  // ⛔ ĐỪNG đặt lại DIA_DANH ở đây. Trước có dòng gán mặc định 'Quảng Châu' —
  //    app nay dùng chung cho nhiều trường, dòng đó làm trường khác bị in
  //    "Quảng Châu, ngày…" vào bản Word. Địa danh chỉ lấy từ js/cauhinh.js
  //    hoặc bảng cau_hinh của chính trường đó; thiếu thì để trống cho thấy mà sửa.

  // sbClient được Bạch Liêu gán một lần sau đăng nhập; ở Diễn Liên client
  // nằm trong window.MAY_CHU và tạo muộn — getter để luôn lấy bản mới nhất.
  if (!('sbClient' in window)) {
    Object.defineProperty(window, 'sbClient', {
      get: function () { return window.MAY_CHU || null; },
      set: function () {} // file gốc có gán cũng không phá
    });
  }

  // Hộp hỏi - đáp: bản gốc là hộp thoại riêng; bản shim dùng confirm của
  // trình duyệt cho gọn (vẫn trả Promise<boolean> đúng hợp đồng "phải await").
  if (typeof window.xacNhan !== 'function') {
    window.xacNhan = function (noiDung) {
      return Promise.resolve(window.confirm(String(noiDung || 'Tiếp tục?')));
    };
  }
  if (typeof window.baoTin !== 'function') {
    window.baoTin = function (noiDung) {
      if (window.notify) window.notify(String(noiDung || ''));
      return Promise.resolve(true);
    };
  }
})();
