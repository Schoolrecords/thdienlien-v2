// ============================================================
// so-chu-nhiem.js — SỔ CHỦ NHIỆM ĐIỆN TỬ (giáo viên chủ nhiệm tiểu học)
//
// Căn cứ: TT 15/2026/TT-BGDĐT Đ21.2b (Sổ chủ nhiệm là hồ sơ của GVCN), Đ21.4
// (điện tử là chủ yếu), Đ26 (nhiệm vụ GVCN). Đặc tả nghiệp vụ C1–C14:
// thdienlien-v2-tailieu/tai-lieu/DAC-TA-SO-CHU-NHIEM-2026-2027.md · sổ dự án 97.
// Bảng: sql/69-so-chu-nhiem.sql (scn_*) + DÙNG LẠI hs_vang / diem_danh_lop
// (sql/20) cho chuyên cần + CHỈ ĐỌC hs_ket_qua / hs_nl_pc / hs_tong_hop (sql/04).
//
// Chín thẻ: Tổng quan · Kế hoạch · Học sinh · Theo dõi hằng ngày · Phụ huynh ·
//          Hỗ trợ HS · Đánh giá (chỉ đọc) · Tổng kết · Kiểm tra – Duyệt (sql/71).
// Nút "Xem sổ chủ nhiệm" → khung xem trước toàn màn (tờ A4 dựng từ CHÍNH HTML xuất
// Word) có "Lưu về máy (Word)" + "In"; chọn bản lưu hồ sơ | bản nộp tổ chuyên môn
// (bản sau chỉ BGH/quản trị, tổ trưởng được giao). Word BÁM KHUNG SỔ CHỦ NHIỆM THẬT
// của trường: bìa một section có viền đôi, ruột section sau không viền; sổ là hồ
// sơ nên trang trong không in Quốc hiệu; tuỳ chọn kèm trích TT 27 (nạp lười
// js/so-chu-nhiem-tt27.js). Sổ dự án mục 99.
//
// Ai thấy gì:
//   GVCN            mở là vào thẳng lớp mình (tự nhận từ phan_cong_day), ghi được;
//                   nộp kỳ (tháng 9 → 5, cuối HK I, cả năm) ở thẻ Kiểm tra – Duyệt.
//   BGH / quản trị  có ô chọn điểm trường + lớp, chỉ ĐỌC sổ; đặt mốc KHOÁ SỔ; kiểm
//                   tra mọi lớp, DUYỆT kỳ HK I / cả năm (app đề nghị khoá sổ, bấm xác
//                   nhận mới khoá), khai "Người kiểm tra theo tổ" (scn_nguoi_duyet).
//   Tổ trưởng/tổ phó được giao (scn_nguoi_duyet — KHÔNG dựa vai 'to_truong'): chỉ
//                   thấy màn Kiểm tra – Duyệt, đọc BẢN CHỤP ĐÃ LỌC do máy chủ dựng lúc
//                   GVCN nộp, ghi Đã kiểm tra / Yêu cầu bổ sung cho KỲ THÁNG; không đọc
//                   sổ gốc. Đang chủ nhiệm một lớp thì vẫn vào sổ lớp mình như GVCN.
//   GV bộ môn, nhân viên: KHÔNG vào sổ (thầy Hiệu phó chốt 28/9/2026).
// RLS là hàng rào thật; ẩn/hiện nút ở đây chỉ để giao diện gọn.
//
// Giao diện PHẲNG ít màu (thầy Chung 14/9: "phẳng, dễ xem, không cần màu sắc"),
// dùng tốt trên điện thoại. Không bịa số: chưa có dữ liệu thì nói chưa có.
//
// QUYẾT ĐỊNH MẶC ĐỊNH cho các câu hỏi mở mục F của đặc tả (chờ thầy chốt):
//   F1  Hiện đủ khung C1–C14, gộp gọn: C4+C11 → thẻ Hỗ trợ HS; C7+C10+C13 → nhật ký
//       Theo dõi (loại khen / nhắc / sự việc); C12 chỉ gắn cờ, không nhân bản hồ sơ.
//       Không phần nào bị app ép "bắt buộc".
//   F3  Kế hoạch chủ nhiệm (năm/tháng/tuần) nằm TRONG sổ, không nộp riêng.
//   F4  Nguồn điểm danh học sinh = hs_vang của app (một nguồn); chưa làm nhập vnEdu.
//   F5  Nghỉ > 3 ngày: app chỉ CẢNH BÁO (K ≥ 2 buổi liên tiếp; vắng ≥ 3 ngày học liên
//       tục), gợi ý đưa vào Hỗ trợ HS — không tự đẩy, không làm luồng duyệt nghỉ.
//   F6  GVCN điểm danh trong sổ; GV khác vẫn ghi được qua policy cũ, GVCN sửa được.
//   F7  Dữ liệu nhạy cảm: chỉ GVCN lớp đó + BGH/quản trị. GV bộ môn, tổ trưởng không.
//   F8  Có ô "Con thương binh, liệt sĩ, người có công" (tuỳ chọn).
//   F9  Nghỉ Tết dự kiến 01/02–14/02/2027 (tuần 22 bắt đầu 15/02/2027) — một hằng số
//       KHUNG_NAM bên dưới, sửa khi có quyết định của UBND tỉnh.
//   F10 Hiển thị CẢ chủ điểm tháng (kế hoạch giáo dục) và chủ điểm Đội.
// ============================================================
(function (goc) {
  'use strict';

  // ══════════════════════════════════════════════════════════════
  // PHẦN THUẦN — không đụng DOM, không đụng máy chủ (bài thử
  // thdienlien-v2-tailieu/thu-so-chu-nhiem.js nạp thẳng phần này)
  // ══════════════════════════════════════════════════════════════
  function pad(n) { return ('0' + n).slice(-2); }
  function isoCua(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function taoNgay(iso) { var p = String(iso).split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function congNgay(iso, n) { var d = taoNgay(iso); d.setDate(d.getDate() + n); return isoCua(d); }
  function ngayVN(iso) { var p = String(iso || '').slice(0, 10).split('-'); return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : ''; }
  // Số ngày tính từ Thứ Hai 05/01/1970 (theo giờ UTC để không lệch vì múi giờ)
  function soNgay(iso) { var p = String(iso).split('-'); return Math.round((Date.UTC(+p[0], +p[1] - 1, +p[2]) - Date.UTC(1970, 0, 5)) / 864e5); }
  // Thứ Hai của tuần chứa ngày này
  function thuHai(iso) { var r = ((soNgay(iso) % 7) + 7) % 7; return congNgay(iso, -r); }
  // Thứ tự NGÀY HỌC (bỏ Thứ Bảy, Chủ nhật): hai ngày học kề nhau cách nhau đúng 1,
  // Thứ Sáu → Thứ Hai tuần sau cũng là 1. Thứ Bảy/Chủ nhật gộp vào Thứ Hai kế tiếp.
  function soNgayHoc(iso) { var d = soNgay(iso), w = Math.floor(d / 7), r = ((d % 7) + 7) % 7; return w * 5 + Math.min(r, 5); }
  function namDau(nam) { return +String(nam || '').slice(0, 4); }
  function chuanLop(s) { return String(s == null ? '' : s).replace(/\s+/g, '').toUpperCase(); }

  // Khung thời gian năm học. CHỈ 2026-2027 có số liệu thật (KHGD IV.1 theo
  // QĐ 3747/QĐ-UBND qua đặc tả mục D.1); năm khác app tự suy tuần 1 = Thứ Hai
  // đầu tiên từ 05/9 và NÓI RÕ là suy tạm, chưa có lịch nghỉ Tết.
  var KHUNG_NAM = {
    '2026-2027': {
      batDau: '2026-09-07', soTuan: 35, tuanHK1: 18,
      nghi: [{ tu: '2027-02-01', den: '2027-02-14', ten: 'Nghỉ Tết Nguyên đán (dự kiến — chờ lịch UBND tỉnh)' }],
      soKetHK1: '2027-01-18', tongKet: '2027-05-31', coChuDiem: true
    }
  };
  function khungNam(nam) {
    if (KHUNG_NAM[nam]) return KHUNG_NAM[nam];
    var y = namDau(nam);
    if (!y) return null;
    var d = y + '-09-05', r = ((soNgay(d) % 7) + 7) % 7;
    return { batDau: r === 0 ? d : congNgay(d, 7 - r), soTuan: 35, tuanHK1: 18, nghi: [],
      soKetHK1: (y + 1) + '-01-18', tongKet: (y + 1) + '-05-31', coChuDiem: false, suyTam: true };
  }
  function trongNghi(k, iso) { for (var i = 0; i < k.nghi.length; i++) if (iso >= k.nghi[i].tu && iso <= k.nghi[i].den) return k.nghi[i]; return null; }
  // Tuần thứ mấy của năm học. Trả { tuan, dau } · { nghi } · null (ngoài năm học)
  function tuanCuaNgay(nam, iso) {
    var k = khungNam(nam);
    if (!k || !iso || iso < k.batDau) return null;
    var n = trongNghi(k, iso);
    if (n) return { nghi: n.ten };
    var bo = 0;
    k.nghi.forEach(function (x) { if (x.den < iso) bo += Math.round((soNgay(x.den) - soNgay(x.tu) + 1) / 7); });
    var t = Math.floor((soNgay(iso) - soNgay(k.batDau)) / 7) - bo + 1;
    if (t > k.soTuan) return null;
    return { tuan: t, dau: ngayDauTuan(nam, t) };
  }
  function ngayDauTuan(nam, t) {
    var k = khungNam(nam);
    if (!k || t < 1 || t > k.soTuan) return '';
    var d = congNgay(k.batDau, (t - 1) * 7);
    k.nghi.forEach(function (x) { if (d >= x.tu) d = congNgay(d, Math.round((soNgay(x.den) - soNgay(x.tu) + 1) / 7) * 7); });
    return d;
  }
  // Chín tháng học: 9 → 5
  function dsThangNamHoc(nam) {
    var y = namDau(nam), ra = [];
    if (!y) return ra;
    [9, 10, 11, 12].forEach(function (m) { ra.push(y + '-' + pad(m)); });
    [1, 2, 3, 4, 5].forEach(function (m) { ra.push((y + 1) + '-' + pad(m)); });
    return ra;
  }
  var TEN_THANG = function (ym) { var p = String(ym).split('-'); return 'Tháng ' + (+p[1] < 3 ? pad(+p[1]) : +p[1]) + '/' + p[0]; };

  // ── CHỦ ĐIỂM THÁNG — đặc tả mục D.2 (KHGD PL2 · KH Liên đội bản sửa · ma trận
  //    35 tiết SHDC mẫu · SGK HĐTN Kết nối tri thức). Bỏ tên trường/địa danh riêng
  //    để dùng chung mọi trường; GVCN sửa theo kế hoạch của trường mình.
  //    shdc: [tuần, tên tiết, trường chủ trì?] · hdtn: [cđ, L1, L2, L3, L4, L5]
  var CHU_DIEM = { '2026-2027': {
    '2026-09': { khgd: 'Mái trường mến yêu', doi: 'Truyền thống nhà trường - An toàn trên đường đến trường',
      shdc: [[1, 'Chào năm học mới - Em là học sinh của trường', 1], [2, 'Em đi học an toàn'], [3, 'Vui hội Trăng rằm'], [4, 'Lớp học hạnh phúc - Em và các bạn']],
      hdtn: ['Chủ đề 1 (tuần 1-4)', 'Chào năm học mới', 'Khám phá bản thân', 'Tự giới thiệu về mình', 'Nhận diện bản thân', 'Em lớn lên mỗi ngày'],
      moc: ['Khai giảng 05/9', 'Tết Trung thu 25/9', 'Tháng An toàn giao thông, tháng Khuyến học', 'Chốt danh sách lớp trước 12/9', 'Họp cha mẹ học sinh đầu năm 14-19/9', 'Rà soát chất lượng đầu năm xong trước 19/9', 'Kế hoạch lớp + danh sách học sinh cần hỗ trợ trước 26/9', 'Cập nhật số liệu đầu năm trên CSDL ngành, triển khai học bạ số'] },
    '2026-10': { khgd: 'Vòng tay bè bạn', doi: 'Chăm ngoan, học giỏi',
      shdc: [[5, 'Nói lời hay - Làm việc tốt'], [6, 'Bạn tốt của em - Nói không với bắt nạt học đường'], [7, 'Tri ân bà, mẹ và cô giáo'], [8, 'Góc học tập gọn gàng, khoa học']],
      hdtn: ['Chủ đề 2 (tuần 5-8)', 'Em biết yêu thương', 'Rèn nếp sống', 'Nếp sống đẹp', 'Nếp sống và tư duy khoa học', 'Giữ gìn tình bạn'],
      moc: ['20/10 Ngày Phụ nữ Việt Nam', 'Tuần lễ học tập suốt đời', 'Thành lập, sinh hoạt câu lạc bộ', 'Hồ sơ phổ cập giáo dục'] },
    '2026-11': { khgd: 'Biết ơn thầy cô', doi: 'Tôn sư trọng đạo',
      shdc: [[9, 'Ngôi trường của chúng em'], [10, 'Thi đua dạy tốt - học tốt'], [11, 'Kỷ niệm Ngày Nhà giáo Việt Nam 20/11', 1], [12, 'Thầy cô trong trái tim em']],
      hdtn: ['Chủ đề 3 (tuần 9-12)', 'Truyền thống trường em', 'Em yêu trường em', 'Mái trường em yêu', 'Yêu trường, mến lớp', 'Tôn sư trọng đạo'],
      moc: ['Kiểm tra định kỳ giữa học kỳ I (tuần 9, lớp 4-5: Tiếng Việt, Toán)', '9/11 Ngày Pháp luật Việt Nam', '20/11 Ngày Nhà giáo Việt Nam'] },
    '2026-12': { khgd: 'Uống nước nhớ nguồn', doi: 'Uống nước nhớ nguồn',
      shdc: [[13, 'Việc của em - Em tự làm'], [14, 'Thời gian biểu của em'], [15, 'Nuôi heo đất - Tiết kiệm để sẻ chia'], [16, 'Chú bộ đội của em'], [17, 'Gia đình em - Tổ ấm yêu thương']],
      hdtn: ['Chủ đề 4 (tuần 13-16; chủ đề 5 bắt đầu tuần 17)', 'Em quý trọng bản thân', 'Tự phục vụ bản thân', 'Giữ gìn nhà cửa ngăn nắp, sạch đẹp', 'Tự lực thực hiện nhiệm vụ', 'Quản lí chi tiêu và lập kế hoạch kinh doanh'],
      moc: ['22/12 Ngày thành lập Quân đội nhân dân Việt Nam', 'Ngày hội STEM học kỳ I', 'Kiểm tra định kỳ cuối học kỳ I từ 28/12'] },
    '2027-01': { khgd: 'Mừng Đảng, mừng Xuân', doi: 'Ngày Tết quê em',
      shdc: [[18, 'Tự hào học sinh Việt Nam'], [19, 'Sơ kết học kỳ I - Gương sáng học đường', 1], [20, 'Tết quê em'], [21, 'Mừng Đảng, mừng Xuân - Vui Tết an toàn']],
      hdtn: ['Chủ đề 5 (tuần 17-20; chủ đề 6 bắt đầu tuần 21)', 'Vui đón mùa xuân', 'Gia đình thân thương', 'Gia đình yêu thương', 'Mái ấm gia đình', 'Gia đình đầm ấm'],
      moc: ['9/1 Ngày Học sinh - Sinh viên Việt Nam', 'Tổng hợp đánh giá cuối học kỳ I, sơ kết trước 18/01', 'Họp cha mẹ học sinh cuối học kỳ I', 'Tuyên truyền phòng chống pháo nổ'] },
    '2027-02': { khgd: 'Em yêu Tổ quốc', doi: 'Mừng Đảng, mừng Xuân',
      shdc: [[22, 'Trở lại trường - Chuyên cần và nền nếp'], [23, 'Kỹ năng phòng tránh xâm hại và bắt cóc']],
      hdtn: ['Chủ đề 6 (tuần 21-24)', 'An toàn cho em', 'Tự chăm sóc và bảo vệ bản thân', 'Ăn uống an toàn, hợp vệ sinh', 'Phòng tránh bị xâm hại', 'Sống an toàn và tự chủ'],
      moc: ['Nghỉ Tết Nguyên đán 2 tuần (dự kiến)', '3/2 Ngày thành lập Đảng Cộng sản Việt Nam', 'Ổn định nền nếp, kiểm tra chuyên cần sau Tết', 'Tết trồng cây'] },
    '2027-03': { khgd: 'Tiến bước lên Đoàn', doi: 'Tiến bước lên Đoàn',
      shdc: [[24, 'Bàn tay sạch - Cơ thể khỏe'], [25, 'Tri ân bà, mẹ, chị và cô giáo'], [26, 'Bạn cần - Có chúng tôi'], [27, 'Tiến bước lên Đoàn'], [28, 'Quê hương em']],
      hdtn: ['Chủ đề 7 (tuần 25-27; chủ đề 8 bắt đầu tuần 28)', 'Tham gia hoạt động cộng đồng', 'Chia sẻ cộng đồng', 'Hoạt động vì cộng đồng', 'Kết nối cộng đồng', 'Tham gia hoạt động xã hội'],
      moc: ['8/3 Ngày Quốc tế Phụ nữ', '26/3 Ngày thành lập Đoàn TNCS Hồ Chí Minh', 'Kiểm tra định kỳ giữa học kỳ II (tuần 27, lớp 4-5)'] },
    '2027-04': { khgd: 'Hòa bình và hữu nghị', doi: 'Hòa bình và hữu nghị',
      shdc: [[29, 'Trường học xanh - sạch - đẹp - an toàn'], [30, 'Nói không với rác thải nhựa'], [31, 'An toàn mùa hè - Phòng tránh đuối nước'], [32, 'Tự hào ngày 30/4']],
      hdtn: ['Chủ đề 8 (tuần 28-31; chủ đề 9 bắt đầu tuần 32)', 'Bảo vệ môi trường', 'Môi trường quanh em', 'Làm bạn với thiên nhiên', 'Quê hương em tươi đẹp', 'Tự hào quê hương em'],
      moc: ['21/4 Ngày Sách và Văn hóa đọc - Ngày hội sách', 'Ngày hội STEM học kỳ II', '30/4 và 1/5'] },
    '2027-05': { khgd: 'Bác Hồ kính yêu', doi: 'Bác Hồ kính yêu',
      shdc: [[33, 'Nghề của cha mẹ em - Làng nghề quê hương'], [34, 'Nhớ ơn Bác Hồ - Năm điều Bác Hồ dạy'], [35, 'Tổng kết năm học - Hành trang mùa hè', 1]],
      hdtn: ['Chủ đề 9 (tuần 32-35)', 'Tìm hiểu nghề nghiệp', 'Em tìm hiểu nghề nghiệp', 'Tìm hiểu thế giới nghề nghiệp', 'Trải nghiệm nghề truyền thống', 'Ước mơ nghề nghiệp'],
      moc: ['15/5 Ngày thành lập Đội TNTP Hồ Chí Minh', '19/5 Ngày sinh Chủ tịch Hồ Chí Minh', 'Kiểm tra định kỳ cuối năm 10-22/5', 'Xét hoàn thành chương trình lớp học / tiểu học', 'Bàn giao chất lượng; họp cha mẹ học sinh cuối năm', 'Kết thúc năm học trước 31/5'] }
  } };
  function chuDiemThang(nam, ym) { return (CHU_DIEM[nam] || {})[ym] || null; }
  // Tuần thuộc tháng nào: theo bảng SHDC (bảng xếp tuần 30/11 vào tháng 12, tuần
  // 29/3 vào tháng 3 — không theo một luật lịch nào), ngoài bảng thì theo Thứ Hai.
  function thangCuaTuan(nam, t) {
    var cd = CHU_DIEM[nam] || {}, ra = '';
    Object.keys(cd).forEach(function (ym) { cd[ym].shdc.forEach(function (s) { if (s[0] === t) ra = ym; }); });
    return ra || ngayDauTuan(nam, t).slice(0, 7);
  }
  function tietSHDC(nam, t) {
    var cd = CHU_DIEM[nam] || {}, ra = null;
    Object.keys(cd).forEach(function (ym) { cd[ym].shdc.forEach(function (s) { if (s[0] === t) ra = { ten: s[1], truong: !!s[2] }; }); });
    return ra;
  }

  // ── CHUYÊN CẦN — tổng hợp từ hs_vang (P = có phép · K = không phép · R = chưa rõ)
  function tongHopChuyenCan(vang, tu, den) {
    var hs = {}, lop = { P: 0, K: 0, R: 0, tong: 0 };
    (vang || []).forEach(function (v) {
      if ((tu && v.ngay < tu) || (den && v.ngay > den)) return;
      var k = v.phep === 'co_phep' ? 'P' : v.phep === 'khong_phep' ? 'K' : 'R';
      if (!hs[v.hoc_sinh_ma]) hs[v.hoc_sinh_ma] = { P: 0, K: 0, R: 0, tong: 0 };
      hs[v.hoc_sinh_ma][k]++; hs[v.hoc_sinh_ma].tong++; lop[k]++; lop.tong++;
    });
    return { theoHS: hs, lop: lop };
  }
  // Tỉ lệ chuyên cần = 1 − lượt vắng / (sĩ số × số buổi đã điểm danh). Thiếu mẫu số → null.
  function tiLeChuyenCan(soLuotVang, siSo, soBuoi) {
    var mau = (+siSo || 0) * (+soBuoi || 0);
    return mau > 0 ? Math.max(0, Math.round((1 - soLuotVang / mau) * 1000) / 10) : null;
  }
  // Cảnh báo (đặc tả C6, ngưỡng mặc định F5): K ≥ nguongK buổi LIÊN TIẾP ·
  // vắng (mọi loại) ≥ nguongNgay NGÀY HỌC liên tục. Mỗi em mỗi loại lấy đợt dài nhất.
  function canhBaoChuyenCan(vang, tuyChon) {
    var o = tuyChon || {}, nK = o.nguongK || 2, nN = o.nguongNgay || 3, theo = {};
    (vang || []).forEach(function (v) { (theo[v.hoc_sinh_ma] = theo[v.hoc_sinh_ma] || []).push(v); });
    var ra = [];
    Object.keys(theo).forEach(function (ma) {
      var ds = theo[ma];
      function dot(chiSo, nguong, loai) {
        var co = {}, dsCs = [];
        chiSo.forEach(function (c) { if (!co[c.i]) { co[c.i] = c; dsCs.push(c); } });
        dsCs.sort(function (a, b) { return a.i - b.i; });
        var tot = null, dau = 0;
        for (var j = 1; j <= dsCs.length; j++) {
          if (j < dsCs.length && dsCs[j].i === dsCs[j - 1].i + 1) continue;
          var dai = j - dau;
          if (dai >= nguong && (!tot || dai >= tot.so)) tot = { ma: ma, loai: loai, so: dai, tu: dsCs[dau].ngay, den: dsCs[j - 1].ngay };
          dau = j;
        }
        if (tot) ra.push(tot);
      }
      dot(ds.filter(function (v) { return v.phep === 'khong_phep'; })
        .map(function (v) { return { i: soNgayHoc(v.ngay) * 2 + (v.buoi === 'chieu' ? 1 : 0), ngay: v.ngay }; }), nK, 'k_lien_tiep');
      dot(ds.map(function (v) { return { i: soNgayHoc(v.ngay), ngay: v.ngay }; }), nN, 'ngay_lien_tiep');
    });
    return ra.sort(function (a, b) { return b.so - a.so || String(a.ma).localeCompare(b.ma); });
  }

  // ── LỚP CHỦ NHIỆM của một người: dòng phan_cong_day la_chu_nhiem ĐÚNG năm,
  //    so tên lớp bỏ khoảng trắng + chữ hoa ('4a' = '4A'), bỏ trùng.
  function lopCuaGVCN(phanCong, idNguoi, nam) {
    var da = {}, ra = [];
    (phanCong || []).forEach(function (p) {
      if (!p || !p.la_chu_nhiem || p.nam_hoc !== nam) return;
      if (idNguoi && p.nguoi_dung_id && p.nguoi_dung_id !== idNguoi) return;
      var k = chuanLop(p.lop);
      if (!k || da[k]) return;
      da[k] = 1; ra.push(String(p.lop).trim());
    });
    return ra.sort(function (a, b) { return chuanLop(a).localeCompare(chuanLop(b), 'vi', { numeric: true }); });
  }

  // ── ĐÁNH GIÁ TT27 — đếm mức theo môn / tiêu chí ở một kỳ. HS khuyết tật học
  //    hòa nhập TÍNH trong sĩ số nhưng LOẠI khỏi mẫu số (đánh giá theo KHGD cá nhân).
  var MON = [['TV', 'Tiếng Việt'], ['TOAN', 'Toán'], ['DD', 'Đạo đức'], ['TNXH', 'Tự nhiên và Xã hội'], ['KH', 'Khoa học'],
    ['LSDL', 'Lịch sử và Địa lí'], ['THCN', 'Tin học và Công nghệ'], ['NN1', 'Ngoại ngữ 1'], ['GDTC', 'Giáo dục thể chất'],
    ['AN', 'Âm nhạc'], ['MT', 'Mĩ thuật'], ['HDTN', 'Hoạt động trải nghiệm']];
  var NLPC = [['NLC1', 'Tự chủ và tự học'], ['NLC2', 'Giao tiếp và hợp tác'], ['NLC3', 'Giải quyết vấn đề và sáng tạo'],
    ['PC1', 'Yêu nước'], ['PC2', 'Nhân ái'], ['PC3', 'Chăm chỉ'], ['PC4', 'Trung thực'], ['PC5', 'Trách nhiệm']];
  function demMuc(dong, ky, khoaMa, dsMuc, loaiRa) {
    var bo = loaiRa || {}, ra = {};
    (dong || []).forEach(function (d) {
      if (d.ky !== ky || !d.muc || bo[d.hoc_sinh_ma]) return;
      var k = d[khoaMa];
      if (!ra[k]) { ra[k] = { mau: 0 }; dsMuc.forEach(function (m) { ra[k][m] = 0; }); }
      if (ra[k][d.muc] == null) return;
      ra[k][d.muc]++; ra[k].mau++;
    });
    return ra;
  }
  function phanTram(so, mau) { return mau > 0 ? Math.round(so * 1000 / mau) / 10 : null; }

  // Sắp theo TÊN (chữ cuối) rồi mới họ đệm — như danh sách lớp ở Việt Nam
  function sapTen(a, b) {
    var ta = String(a.ho_ten || '').trim().split(/\s+/), tb = String(b.ho_ten || '').trim().split(/\s+/);
    return ta[ta.length - 1].localeCompare(tb[tb.length - 1], 'vi') || String(a.ho_ten).localeCompare(String(b.ho_ten), 'vi');
  }

  // ── NỘP KIỂM TRA – KÝ DUYỆT (sql/71, sổ dự án 99) ──
  // Kỳ: tổ chuyên môn kiểm tra hằng tháng; BGH duyệt cuối học kỳ I và cuối năm.
  var KY_NOP = [['thang-9', 'Tháng 9'], ['thang-10', 'Tháng 10'], ['thang-11', 'Tháng 11'], ['thang-12', 'Tháng 12'],
    ['thang-1', 'Tháng 01'], ['thang-2', 'Tháng 02'], ['thang-3', 'Tháng 3'], ['thang-4', 'Tháng 4'], ['thang-5', 'Tháng 5'],
    ['hk1', 'Cuối học kỳ I'], ['ca-nam', 'Cuối năm học']];
  var TEN_KY_NOP = {}; KY_NOP.forEach(function (x) { TEN_KY_NOP[x[0]] = x[1]; });
  var TEN_TT_NOP = { da_nop: 'Đã nộp, chờ kiểm tra', da_kiem_tra: 'Đã kiểm tra', yeu_cau_bo_sung: 'Yêu cầu bổ sung', da_duyet: 'Đã duyệt', thay_the: 'Đã thay bằng lần nộp sau' };
  function laKyThang(ky) { return /^thang-/.test(String(ky || '')); }
  // Kỳ nên nộp ở ngày này: tháng 9 → 5 là kỳ tháng đó; ngoài thời gian học → cả năm
  function kyGoiY(iso) { var m = +String(iso || '').slice(5, 7); return (m >= 9 || m <= 5) && m ? 'thang-' + m : 'ca-nam'; }
  // Ngày cuối kỳ — mốc đề nghị khoá sổ sau khi BGH duyệt
  function cuoiKy(nam, ky) {
    var y = namDau(nam), k = khungNam(nam);
    if (ky === 'hk1') return k ? congNgay(ngayDauTuan(nam, k.tuanHK1), 6) : (y + 1) + '-01-15';
    if (ky === 'ca-nam') return k && k.tongKet ? k.tongKet : (y + 1) + '-05-31';
    var m = +String(ky).replace('thang-', ''); if (!m) return '';
    var nm = m >= 9 ? y : y + 1, d = new Date(Date.UTC(nm, m, 0));
    return nm + '-' + pad(m) + '-' + pad(d.getUTCDate());
  }
  // Che số điện thoại trong chữ tự do — CÙNG luật với scn_an_sdt() của sql/71
  function anSdt(s) {
    if (s == null) return s;
    // Không dùng lookbehind (?<!…): Safari iOS cũ báo lỗi cú pháp là hỏng cả tệp
    return String(s).replace(/(^|[^0-9])(\+84|0)(?:[ .-]?[0-9]){8,10}(?![0-9])/g, '$1[đã ẩn số điện thoại]');
  }
  function anSdtSau(o) { return o == null ? o : JSON.parse(anSdt(JSON.stringify(o))); }
  // Môn học, hoạt động giáo dục theo khối (CT GDPT 2018)
  function monTheoKhoi(khoi) {
    var ds = khoi >= 4 ? ['TV', 'TOAN', 'NN1', 'DD', 'KH', 'LSDL', 'THCN', 'GDTC', 'AN', 'MT', 'HDTN']
      : khoi === 3 ? ['TV', 'TOAN', 'NN1', 'DD', 'TNXH', 'THCN', 'GDTC', 'AN', 'MT', 'HDTN']
      : ['TV', 'TOAN', 'NN1', 'DD', 'TNXH', 'GDTC', 'AN', 'MT', 'HDTN'];
    return MON.filter(function (m) { return ds.indexOf(m[0]) >= 0; }).sort(function (a, b) { return ds.indexOf(a[0]) - ds.indexOf(b[0]); });
  }
  // Lớp (khối, điểm trường) có nằm trong phạm vi các dòng giao kiểm tra không
  function trongPhamViTo(dsGiao, khoi, coSo) {
    return (dsGiao || []).some(function (d) {
      return (d.khoi || []).map(Number).indexOf(+khoi) >= 0 && (!d.co_so_ma || d.co_so_ma === (coSo || null));
    });
  }
  // Lần nộp "đang tính" của mỗi (lớp, kỳ): lần mới nhất, bỏ lần đã bị thay
  function nopMoiNhat(dsNop) {
    var ra = {};
    (dsNop || []).forEach(function (n) {
      if (n.trang_thai === 'thay_the') return;
      var k = chuanLop(n.lop) + '|' + n.ky;
      if (!ra[k] || n.lan > ra[k].lan) ra[k] = n;
    });
    return Object.keys(ra).map(function (k) { return ra[k]; });
  }

  // BẢN GỬI TỔ TRƯỞNG từ mô hình sổ đầy đủ — bản sao ở trình duyệt của luật lọc
  // trong scn_ban_chup() (sql/71), CHỈ dùng cho bản xem thử và bài thử. Bản thật
  // tổ trưởng đọc luôn do MÁY CHỦ dựng lúc GVCN nộp (hàng rào thật).
  function locBanChup(m) {
    var r = JSON.parse(JSON.stringify(m || {}));
    r.muc_do = 'nop_duyet';
    delete r.gvcn_sdt; delete r.hoan_canh; delete r.trao_doi;
    r.hoc_sinh = (r.hoc_sinh || []).map(function (h) { return { ma: h.ma, ho_ten: h.ho_ten, ngay_sinh: h.ngay_sinh, gioi_tinh: h.gioi_tinh, dan_toc: h.dan_toc, hoa_nhap: !!h.hoa_nhap }; });
    r.ban_dai_dien = (r.ban_dai_dien || []).map(function (b) { return { vai_tro: b.vai_tro, ho_ten: b.ho_ten }; });
    r.su_viec_so = (r.theo_doi || []).filter(function (t) { return t.loai === 'su_viec'; }).length;
    r.theo_doi = (r.theo_doi || []).filter(function (t) { return t.loai !== 'su_viec'; })
      .map(function (t) { return { ngay: t.ngay, hoc_sinh: t.hoc_sinh, loai: t.loai, linh_vuc: t.linh_vuc, noi_dung: anSdt(t.noi_dung) }; });
    var khac = {};
    (r.ho_tro || []).forEach(function (x) { if (x.loai !== 'hoc_tap' && x.loai !== 'noi_troi') khac[x.loai] = (khac[x.loai] || 0) + 1; });
    r.ho_tro_khac_so = khac;
    r.ho_tro = (r.ho_tro || []).filter(function (x) { return x.loai === 'hoc_tap' || x.loai === 'noi_troi'; }).map(function (x) {
      return { ho_ten: x.ho_ten, loai: x.loai, ngay: x.ngay, moc: x.moc || null, bieu_hien: anSdt(x.bieu_hien), mon_ky_nang: anSdt(x.mon_ky_nang),
        bien_phap: anSdt(x.bien_phap), moc_xem_lai: x.moc_xem_lai, trang_thai: x.trang_thai, ket_qua: anSdt(x.ket_qua), hs_giup_do: x.hs_giup_do || null };
    });
    r.hop_cmhs = (r.hop_cmhs || []).map(function (x) { return anSdtSau(x); });
    r.ke_hoach = (r.ke_hoach || []).map(function (k) { return { cap: k.cap, ky: k.ky, ngay: k.ngay, noi_dung: anSdtSau(k.noi_dung || {}), ket_qua: anSdt(k.ket_qua) }; });
    r.tong_ket = (r.tong_ket || []).map(function (t) {
      return { ky: t.ky, ngay: t.ngay, viec_lam_duoc: anSdt(t.viec_lam_duoc), ton_tai: anSdt(t.ton_tai), de_xuat: anSdt(t.de_xuat),
        co_ban_giao: !!(t.co_ban_giao || String(t.ban_giao || '').trim()), them: anSdtSau(t.them || {}) };
    });
    return r;
  }

  var LUAT = {
    pad: pad, isoCua: isoCua, congNgay: congNgay, ngayVN: ngayVN, thuHai: thuHai, soNgayHoc: soNgayHoc, chuanLop: chuanLop,
    KHUNG_NAM: KHUNG_NAM, khungNam: khungNam, tuanCuaNgay: tuanCuaNgay, ngayDauTuan: ngayDauTuan,
    dsThangNamHoc: dsThangNamHoc, TEN_THANG: TEN_THANG, CHU_DIEM: CHU_DIEM, chuDiemThang: chuDiemThang,
    thangCuaTuan: thangCuaTuan, tietSHDC: tietSHDC,
    tongHopChuyenCan: tongHopChuyenCan, tiLeChuyenCan: tiLeChuyenCan, canhBaoChuyenCan: canhBaoChuyenCan,
    lopCuaGVCN: lopCuaGVCN, MON: MON, NLPC: NLPC, demMuc: demMuc, phanTram: phanTram, sapTen: sapTen,
    KY_NOP: KY_NOP, TEN_TT_NOP: TEN_TT_NOP, laKyThang: laKyThang, kyGoiY: kyGoiY, cuoiKy: cuoiKy,
    anSdt: anSdt, monTheoKhoi: monTheoKhoi, locBanChup: locBanChup, trongPhamViTo: trongPhamViTo, nopMoiNhat: nopMoiNhat
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = LUAT;
  if (!goc || typeof document === 'undefined') return;
  goc.SCN_LUAT = LUAT;

  // ══════════════════════════════════════════════════════════════
  // GIAO DIỆN
  // ══════════════════════════════════════════════════════════════
  function thoat(s) { return window.thoatHTML ? window.thoatHTML(s) : String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return '&#' + c.charCodeAt(0) + ';'; }); }
  function may() { return window.MAY_CHU; }
  function bao(s) { if (window.notify) window.notify(s); }
  function homNay() { return isoCua(new Date()); }
  function toi() { return window.NGUOI_DUNG || null; }
  function vaiTro() { var u = toi(); return u ? u.vai_tro : ''; }
  function laBGH() { return !may() || vaiTro() === 'admin' || vaiTro() === 'ban_giam_hieu'; }
  // "Quản lý" = người được chọn lớp bất kỳ để XEM: chỉ BGH và Quản trị (28/9/2026 bỏ tổ trưởng)
  function laQuanLy() { return laBGH(); }
  function loiChu(e) { return String((e && (e.message || e.details || e.hint)) || e || ''); }
  function thieuBang(m) { return /scn_|does not exist|schema cache|Could not find/i.test(m); }

  var LOAI_TD = [['khen', 'Khen'], ['nhac', 'Nhắc'], ['nhan_xet', 'Nhận xét'], ['tien_bo', 'Tiến bộ'], ['ne_nep', 'Nề nếp'], ['su_viec', 'Sự việc']];
  var TEN_LOAI_TD = {}; LOAI_TD.forEach(function (x) { TEN_LOAI_TD[x[0]] = x[1]; });
  var LINH_VUC = ['Học tập', 'Tiếng Việt', 'Toán', 'Môn học khác', 'Chăm chỉ', 'Trách nhiệm', 'Trung thực', 'Nhân ái', 'Yêu nước',
    'Tự chủ và tự học', 'Giao tiếp và hợp tác', 'Giải quyết vấn đề và sáng tạo', 'Nề nếp', 'Vệ sinh', 'An toàn', 'Khác'];
  var GOI_Y = {
    khen: ['Hăng hái phát biểu xây dựng bài', 'Giúp đỡ bạn trong học tập', 'Hoàn thành tốt nhiệm vụ được giao', 'Có tiến bộ rõ trong đọc, viết', 'Nhặt được của rơi trả lại người mất'],
    nhac: ['Chưa hoàn thành bài tập ở nhà', 'Đi học muộn', 'Nói chuyện riêng trong giờ học', 'Quên đồ dùng học tập', 'Chưa giữ vệ sinh lớp học'],
    nhan_xet: ['Đọc to, rõ ràng; cần viết cẩn thận hơn', 'Nắm được cách làm; cần tính toán cẩn thận hơn', 'Tích cực tham gia hoạt động nhóm'],
    tien_bo: ['Tiến bộ trong đọc thành tiếng', 'Tiến bộ trong kỹ năng tính toán', 'Mạnh dạn hơn khi giao tiếp'],
    ne_nep: ['Cả lớp xếp hàng ra vào lớp nghiêm túc', 'Tổ trực nhật sạch sẽ', 'Giữ trật tự tốt trong giờ học'],
    su_viec: []
  };
  var DIEN_CS = [['ho_ngheo', 'Hộ nghèo'], ['can_ngheo', 'Hộ cận nghèo'], ['mo_coi', 'Mồ côi'], ['khuyet_tat', 'Khuyết tật'],
    ['dtts', 'Dân tộc thiểu số'], ['nguoi_co_cong', 'Con thương binh, liệt sĩ, người có công'], ['khac', 'Hoàn cảnh đặc biệt khác']];
  var TEN_CS = {}; DIEN_CS.forEach(function (x) { TEN_CS[x[0]] = x[1]; });
  var LOAI_HT = [['hoc_tap', 'Khó khăn học tập (chưa hoàn thành)'], ['nguy_co_bo_hoc', 'Nguy cơ bỏ học'], ['hoan_canh', 'Hoàn cảnh khó khăn'],
    ['khuyet_tat', 'Khuyết tật học hòa nhập'], ['tam_ly', 'Tâm lý bất thường'], ['bat_nat', 'Nguy cơ bạo lực, bắt nạt (kể cả trên mạng)'],
    ['suc_khoe', 'Sức khỏe'], ['noi_troi', 'Năng lực nổi trội (bồi dưỡng)'], ['khac', 'Khác']];
  var TEN_HT = {}; LOAI_HT.forEach(function (x) { TEN_HT[x[0]] = x[1]; });
  var TT_HT = [['dang_theo_doi', 'Đang theo dõi'], ['da_on', 'Đã ổn'], ['chuyen_cap_tren', 'Đã báo BGH / cấp trên']];
  var TEN_TT_HT = {}; TT_HT.forEach(function (x) { TEN_TT_HT[x[0]] = x[1]; });
  var KY_HOP = [['dau_nam', 'Đầu năm'], ['cuoi_hk1', 'Cuối học kỳ I'], ['cuoi_nam', 'Cuối năm'], ['dot_xuat', 'Đột xuất']];
  var TEN_KY_HOP = {}; KY_HOP.forEach(function (x) { TEN_KY_HOP[x[0]] = x[1]; });
  var KY_DG = [['giua_ki_1', 'Giữa học kỳ I'], ['cuoi_ki_1', 'Cuối học kỳ I'], ['giua_ki_2', 'Giữa học kỳ II'], ['cuoi_nam', 'Cuối năm học']];
  var TEN_KY_DG = {}; KY_DG.forEach(function (x) { TEN_KY_DG[x[0]] = x[1]; });
  var CHUC_VU_MAC = ['Lớp trưởng', 'Lớp phó học tập', 'Lớp phó văn thể', 'Lớp phó lao động', 'Tổ trưởng tổ 1', 'Tổ trưởng tổ 2', 'Tổ trưởng tổ 3', 'Tổ trưởng tổ 4'];
  // Chỉ tiêu lớp mặc định = chỉ tiêu học sinh trường giao (đặc tả mục B, KHGD III.2.1)
  var CHI_TIEU_MAC = [
    '100% học sinh học 2 buổi/ngày; 100% học sinh đủ sách giáo khoa.',
    'Phẩm chất, năng lực: 100% Đạt trở lên, trong đó Tốt từ 70% trở lên.',
    '100% học sinh hoàn thành chương trình lớp học (học sinh khuyết tật theo kế hoạch giáo dục cá nhân).',
    '100% học sinh có học bạ số; 100% học sinh tham gia Đội/Sao nhi đồng; 100% học sinh có bảo hiểm y tế.',
    'Không có học sinh bỏ học; không có tai nạn thương tích nghiêm trọng, không có bạo lực học đường.'
  ].join('\n');
  // Kế hoạch chủ nhiệm năm — khung mục III theo MẪU SỔ THẬT của trường (Sổ chủ nhiệm 1B 2025-2026)
  var MUC_KH = [['duy_tri', '1. Duy trì sĩ số'], ['chat_luong', '2. Chất lượng giáo dục toàn diện (phẩm chất, năng lực; môn học và hoạt động giáo dục)'],
    ['ngoai_gio', '3. Các hoạt động giáo dục ngoài giờ lên lớp'], ['phong_trao', '4. Thực hiện các cuộc vận động, phong trào thi đua; phương pháp dạy học tích cực'],
    ['doi', '5. Công tác Đội, Sao nhi đồng'], ['hoi_thi', '6. Tham gia hội thi, giao lưu các cấp'], ['phoi_hop', '7. Phối hợp với cha mẹ học sinh và cộng đồng']];
  // Mục cũ (bản 28/9 sáng) → mục mới, để kế hoạch đã ghi không mất khi xuất Word
  var KH_CU = { chat_luong: ['bp_hoc_tap', 'bp_dao_duc', 'bp_ho_tro'], ngoai_gio: ['bp_ne_nep'], phoi_hop: ['bp_cmhs'] };
  var NL_DAY_DU = [['NLC1', 'Tự chủ và tự học', 1], ['NLC2', 'Giao tiếp và hợp tác', 1], ['NLC3', 'Giải quyết vấn đề và sáng tạo', 1],
    ['NDT1', 'Ngôn ngữ', 2], ['NDT2', 'Tính toán', 2], ['NDT3', 'Khoa học', 2], ['NDT4', 'Công nghệ', 2], ['NDT5', 'Tin học', 2], ['NDT6', 'Thẩm mĩ', 2], ['NDT7', 'Thể chất', 2]];
  var CT_CUOI_NAM = [['HTXS', 'Hoàn thành xuất sắc'], ['HTT', 'Hoàn thành tốt'], ['HT', 'Hoàn thành'], ['CHT', 'Chưa hoàn thành'],
    ['XS', 'Khen thưởng: Học sinh Xuất sắc'], ['TB', 'Khen thưởng: Học sinh Tiêu biểu hoàn thành tốt trong học tập và rèn luyện']];
  var MOC_HT = [['', 'Trong năm'], ['dau_nam', 'Đầu năm học'], ['hk1', 'Cuối học kỳ I'], ['cuoi_nam', 'Cuối năm học']];
  var TEN_MOC_HT = {}; MOC_HT.forEach(function (x) { TEN_MOC_HT[x[0]] = x[1]; });
  // Ba cuộc họp phụ huynh theo khung mẫu sổ: mỗi mục một ô, không có thì Word in dòng chấm
  var KHUNG_HOP = {
    dau_nam: { ten: 'KẾ HOẠCH HỌP PHỤ HUYNH LẦN THỨ NHẤT', muc: [
      ['bao_cao_truong', 'A. Báo cáo kết quả năm học trước; kế hoạch, chỉ tiêu năm học của nhà trường', '(Văn bản kèm theo)'],
      ['tinh_hinh', 'B. a) Tình hình chung của lớp (sĩ số, thuận lợi, khó khăn)'], ['chi_tieu', 'b) Các chỉ tiêu phấn đấu của lớp'],
      ['bien_phap', 'Biện pháp (nề nếp, học tập, các hoạt động khác)'], ['tung_hs', 'Báo cáo tình hình học tập từng học sinh (nhóm năng khiếu, nhóm cần giúp đỡ)'],
      ['thu_chi', 'C. Triển khai các khoản thu – chi (thu theo quy định; dịch vụ phục vụ, hỗ trợ hoạt động giáo dục)'],
      ['phu_huynh', 'Phụ huynh phát biểu'], ['giai_trinh', 'Giáo viên giải trình'], ['cu_ban', 'Cử Ban đại diện cha mẹ học sinh lớp (3 người)']] },
    cuoi_hk1: { ten: 'KẾ HOẠCH HỌP PHỤ HUYNH LẦN THỨ HAI', muc: [
      ['bao_cao_truong', 'I. Báo cáo một số hoạt động chính của nhà trường học kỳ I', '(Văn bản kèm theo)'],
      ['tinh_hinh', 'II. Tình hình chung của lớp'], ['ket_qua', 'Kết quả học tập'], ['ne_nep', 'Nề nếp – ý thức rèn luyện'], ['hoat_dong_khac', 'Hoạt động khác'],
      ['tung_hs', 'III. Đánh giá từng học sinh'], ['ke_hoach_hk2', 'IV. Kế hoạch của lớp trong học kỳ II (chỉ tiêu, biện pháp)'],
      ['phu_huynh', 'V. Ý kiến phát biểu của phụ huynh'], ['thong_qua', 'VI. Trưởng ban đại diện cha mẹ học sinh thông qua kế hoạch']] },
    cuoi_nam: { ten: 'NỘI DUNG HỌP PHỤ HUYNH CUỐI NĂM', muc: [
      ['li_do', 'II. Giáo viên chủ nhiệm nêu lí do họp'], ['thu_ky', 'III. Bầu thư kí cuộc họp'],
      ['bao_cao_truong', 'IV.1. Báo cáo một số nét chính hoạt động của nhà trường trong năm học', '(Văn bản kèm theo)'],
      ['ket_qua_lop', 'IV.2. Kết quả đạt được của tập thể lớp'], ['tung_hs', 'Báo cáo kết quả và nhận xét cụ thể từng học sinh'],
      ['dan_do', 'Dặn dò học sinh trong hè'], ['phu_huynh', 'Ý kiến phát biểu của phụ huynh'], ['giai_trinh', 'Giáo viên chủ nhiệm giải trình các ý kiến']] }
  };
  var BIEN_PHAP = [['bp_ne_nep', 'Nền nếp'], ['bp_hoc_tap', 'Học tập'], ['bp_dao_duc', 'Đạo đức, kỹ năng sống'], ['bp_ho_tro', 'Học sinh cần hỗ trợ'], ['bp_cmhs', 'Phối hợp cha mẹ học sinh']];
  // 29/9/2026: "Theo dõi hằng ngày" lên ngay sau Tổng quan (việc GVCN mở nhiều nhất).
  // Thẻ cuối "Nộp sổ" chỉ GVCN lớp đó thấy; việc kiểm tra/duyệt NHIỀU lớp của tổ
  // trưởng và BGH nay là màn riêng "Kiểm tra sổ" (D.che = 'kiemtra'), vào từ trang Lớp học.
  var TABS = [['tong-quan', 'Tổng quan'], ['theo-doi', 'Theo dõi hằng ngày'], ['ke-hoach', 'Kế hoạch'], ['hoc-sinh', 'Học sinh'],
    ['phu-huynh', 'Phụ huynh'], ['ho-tro', 'Hỗ trợ HS'], ['danh-gia', 'Đánh giá'], ['tong-ket', 'Tổng kết'], ['duyet', 'Nộp sổ']];

  // ── Trạng thái màn ──
  var D = {
    nam: '', khoiTao: false, dangNap: false, loiKhung: '', che: 'so',   // che: 'so' (sổ một lớp) | 'kiemtra' (kiểm tra nhiều lớp)
    lopCuaToi: [], dsLop: [], coSo: [], gvcnCua: {}, locCoSo: '', lop: '', khoi: 0, coSoTen: '',
    tab: 'tong-quan', hs: [], gvcnTen: '', loi: {}, so: null, khoaNap: '',
    capKH: 'thang', thangKH: '', tuanKH: 0,
    ngayTD: '', buoiTD: 'sang', ddTam: null, chon: {}, loaiTD: 'khen', hsMo: '', sua: null, kyDG: '', kyTK: 'hk1',
    // Nộp kiểm tra – ký duyệt (sql/71)
    dv: { nop: [], duyet: [], nguoiDuyet: [], loi: '' }, laToKT: false, dsLopKT: [], toCuaToi: [],
    kyNop: '', locKy: '', locTT: 'cho', moNop: null, bcMo: null, dangMo: false, hopKy: '', tt27: true,
    lopLoc: '', lopMuon: '', co71: true
  };
  var EL = null;

  function soTrong() { return { lop: null, keHoach: [], hoanCanh: {}, theoDoi: [], lienLac: [], hoTro: [], tongKet: {}, vang: [], ddl: [], kq: [], nlpc: [], th: [] }; }

  // ══════════ ĐỌC MÁY CHỦ ══════════
  // Đọc hết theo trang 1000 dòng. BẮT BUỘC .order('id') — không sắp thì PostgREST
  // không hứa thứ tự, phân trang có thể lặp/sót dòng (bài học hocsinh.js).
  function taiHet(bang, cot, eqs, ins) {
    var ket = [], tu = 0, buoc = 1000;
    function trang() {
      var q = may().from(bang).select(cot).order('id').range(tu, tu + buoc - 1);
      (eqs || []).forEach(function (l) { q = q.eq(l[0], l[1]); });
      (ins || []).forEach(function (l) { q = q.in(l[0], l[1]); });
      return q.then(function (r) {
        if (r.error) throw r.error;
        var d = r.data || [];
        ket = ket.concat(d);
        if (d.length < buoc) return ket;
        tu += buoc; return trang();
      });
    }
    return trang();
  }
  function motNguon(ten, hua) {
    return Promise.resolve(hua).then(function (r) {
      if (r && r.error) throw r.error;
      return r && r.data !== undefined ? r.data : r;
    }).catch(function (e) { D.loi[ten] = loiChu(e); return null; });
  }

  // Bước 1: biết mình là GVCN lớp nào; quản lý thì lấy danh sách lớp + điểm trường
  function napKhung() {
    D.nam = (window.CAU_HINH || {}).NAM_HOC || '';
    D.loiKhung = '';
    if (!may()) { mauKhung(); return Promise.resolve(); }
    var u = toi();
    if (!u) { D.loiKhung = 'Đăng nhập để mở sổ chủ nhiệm.'; return Promise.resolve(); }
    return Promise.all([
      may().from('phan_cong_day').select('id, lop, nam_hoc, la_chu_nhiem, nguoi_dung_id, nguoi_dung:nguoi_dung_id(ho_ten)')
        .eq('nam_hoc', D.nam).eq('la_chu_nhiem', true).order('id').limit(2000),
      may().from('lop_hoc').select('lop, khoi, co_so_ma').eq('nam_hoc', D.nam),
      may().from('co_so').select('ma, ten').eq('hoat_dong', true).order('so_tt'),
      // Bảng giao người kiểm tra (sql/71). RLS: BGH đọc hết, người khác chỉ dòng của mình.
      may().from('scn_nguoi_duyet').select('*').eq('nam_hoc', D.nam).order('id'),
      // GVCN DỰ KIẾN (sql/70): lớp chưa có phân công vì cô chưa đăng nhập lần nào
      // thì bìa sổ, ô chọn lớp vẫn có tên. Trường chưa chạy 70 → lỗi → bỏ qua.
      // + gvcn_sdt (sql/73): điện thoại GVCN in trên bìa khi cô chưa tự ghi.
      may().from('lop_hoc').select('lop, gvcn_ten, gvcn_sdt').eq('nam_hoc', D.nam).then(function (r) {
        return r.error ? may().from('lop_hoc').select('lop, gvcn_ten').eq('nam_hoc', D.nam) : r;
      })
    ]).then(function (r) {
      if (r[0].error) throw r[0].error;
      var pc = r[0].data || [];
      D.gvcnCua = {}; D.sdtCua = {};
      pc.forEach(function (p) { if (p.nguoi_dung && p.nguoi_dung.ho_ten) D.gvcnCua[chuanLop(p.lop)] = p.nguoi_dung.ho_ten; });
      ((r[4] && !r[4].error && r[4].data) || []).forEach(function (l) {
        if (l.gvcn_ten && !D.gvcnCua[chuanLop(l.lop)]) D.gvcnCua[chuanLop(l.lop)] = l.gvcn_ten;
        if (l.gvcn_sdt) D.sdtCua[chuanLop(l.lop)] = l.gvcn_sdt;
      });
      D.lopCuaToi = lopCuaGVCN(pc, u.id, D.nam);
      var lh = (r[1] && !r[1].error && r[1].data) || [];
      D.coSo = (r[2] && !r[2].error && r[2].data) || [];
      var tenCs = {}; D.coSo.forEach(function (c) { tenCs[c.ma] = c.ten; });
      var theoChuan = {};
      lh.forEach(function (l) { theoChuan[chuanLop(l.lop)] = { lop: l.lop, khoi: l.khoi, coSo: l.co_so_ma || '', coSoTen: tenCs[l.co_so_ma] || '' }; });
      // Lớp của tôi: đổi về đúng chuỗi tên lớp trong lop_hoc ('4a' → '4A')
      D.lopCuaToi = D.lopCuaToi.map(function (l) { return theoChuan[chuanLop(l)] ? theoChuan[chuanLop(l)].lop : l; });
      // Tổ trưởng / tổ phó được giao kiểm tra: lớp thuộc khối (và điểm trường) được giao
      D.dv.loi = r[3] && r[3].error ? loiChu(r[3].error) : '';
      D.co71 = !(r[3] && r[3].error && thieuBang(D.dv.loi));
      D.dv.nguoiDuyet = (r[3] && !r[3].error && r[3].data) || [];
      var em = String(u.email || '').trim().toLowerCase();
      D.toCuaToi = D.dv.nguoiDuyet.filter(function (d) { return String(d.email || '').toLowerCase() === em; });
      D.laToKT = D.toCuaToi.length > 0;
      D.dsLopKT = lh.filter(function (l) { return trongPhamViTo(D.toCuaToi, l.khoi, l.co_so_ma); })
        .map(function (l) { return theoChuan[chuanLop(l.lop)]; });
      // báo cho hàng thẻ trang Lớp học (hocsinh.js) biết ai thấy thẻ nào
      window.SCN_QUYEN = { gvcn: D.lopCuaToi.length > 0, toKT: D.laToKT };
      if (laQuanLy()) {
        D.dsLop = Object.keys(theoChuan).map(function (k) { return theoChuan[k]; });
        if (!D.dsLop.length) {
          // lop_hoc chưa khai năm này → lấy tên lớp từ biên chế học sinh
          return taiHet('hoc_sinh_lop', 'id, lop, khoi', [['nam_hoc', D.nam]]).then(function (ds) {
            var co = {};
            ds.forEach(function (d) { if (!co[chuanLop(d.lop)]) { co[chuanLop(d.lop)] = 1; D.dsLop.push({ lop: d.lop, khoi: d.khoi, coSo: '', coSoTen: '' }); } });
          });
        }
      } else {
        D.dsLop = D.lopCuaToi.map(function (l) { return theoChuan[chuanLop(l)] || { lop: l, khoi: +String(l).charAt(0) || 0, coSo: '', coSoTen: '' }; });
      }
    }).then(function () {
      D.dsLop.sort(function (a, b) { return chuanLop(a.lop).localeCompare(chuanLop(b.lop), 'vi', { numeric: true }); });
      if (!D.lop || !D.dsLop.some(function (l) { return l.lop === D.lop; })) {
        D.lop = D.lopCuaToi[0] || (D.dsLop[0] && D.dsLop[0].lop) || '';
      }
    }).catch(function (e) { D.loiKhung = 'Không đọc được phân công chủ nhiệm: ' + loiChu(e); });
  }

  // Bước 2: nạp một lớp
  function napLop() {
    var lop = D.lop, khoa = D.nam + '|' + lop;
    D.khoaNap = khoa; D.loi = {}; D.so = soTrong(); D.hs = []; D.ddTam = null; D.chon = {}; D.hsMo = ''; D.sua = null;
    var tt = D.dsLop.filter(function (l) { return l.lop === lop; })[0] || {};
    D.khoi = tt.khoi || +String(lop).charAt(0) || 0; D.coSoTen = tt.coSoTen || '';
    D.gvcnTen = D.gvcnCua[chuanLop(lop)] || '';
    if (!may()) { mauLop(); D.dangNap = false; return Promise.resolve(); }
    if (!lop) { D.dangNap = false; return Promise.resolve(); }
    D.dangNap = true;
    var N = [['nam_hoc', D.nam], ['lop', lop]];
    var S = D.so;
    // 29/9/2026: các bảng lọc theo (năm, lớp) KHÔNG cần danh sách học sinh →
    // gửi CÙNG LÚC với hoc_sinh_lop. Trước đây chúng xếp hàng chờ danh sách về
    // mới đi, mất thêm một lượt chờ máy chủ mỗi lần mở sổ. Chỉ 4 bảng lọc theo
    // mã học sinh (hoàn cảnh, đánh giá) mới phải chờ.
    var theoLop = Promise.all([
      motNguon('scn', may().from('scn_lop').select('*').eq('nam_hoc', D.nam).eq('lop', lop).maybeSingle()).then(function (d) { S.lop = d || null; }),
      motNguon('scn', taiHet('scn_ke_hoach', '*', N)).then(function (d) { S.keHoach = d || []; }),
      motNguon('scn', taiHet('scn_theo_doi', '*', N)).then(function (d) { S.theoDoi = (d || []).sort(function (a, b) { return a.ngay < b.ngay ? 1 : a.ngay > b.ngay ? -1 : b.id - a.id; }); }),
      motNguon('scn', taiHet('scn_lien_lac', '*', N)).then(function (d) { S.lienLac = (d || []).sort(function (a, b) { return a.ngay < b.ngay ? 1 : -1; }); }),
      motNguon('hoTro', taiHet('scn_ho_tro', '*', N)).then(function (d) { S.hoTro = d || []; }),
      motNguon('scn', taiHet('scn_tong_ket', '*', N)).then(function (d) { S.tongKet = {}; (d || []).forEach(function (x) { S.tongKet[x.ky] = x; }); }),
      motNguon('vang', taiHet('hs_vang', 'id, ngay, buoi, hoc_sinh_ma, phep, ghi_chu, nguoi_ghi_id', N)).then(function (d) { S.vang = d || []; }),
      motNguon('vang', taiHet('diem_danh_lop', 'id, ngay, buoi, si_so, so_vang, ghi_luc', N)).then(function (d) { S.ddl = d || []; })
    ]);
    var theoHs = taiHet('hoc_sinh_lop', 'id, hoc_sinh_ma, lop, khoi, trang_thai, hoc_sinh(ma, ho_ten, ngay_sinh, gioi_tinh, dan_toc, khuyet_tat_hoa_nhap)', N)
      .then(function (ds) {
        D.hs = ds.filter(function (d) { return d.hoc_sinh && (!d.trang_thai || d.trang_thai === 'dang_hoc'); })
          .map(function (d) { return d.hoc_sinh; }).sort(sapTen);
        var ma = D.hs.map(function (h) { return h.ma; });
        var coMa = ma.length ? [['hoc_sinh_ma', ma]] : null;
        return Promise.all([
          coMa ? motNguon('hoanCanh', taiHet('scn_hoan_canh', '*', [['nam_hoc', D.nam]], coMa)).then(function (d) { S.hoanCanh = {}; (d || []).forEach(function (x) { S.hoanCanh[x.hoc_sinh_ma] = x; }); }) : null,
          coMa ? motNguon('danhGia', taiHet('hs_ket_qua', 'id, ky, hoc_sinh_ma, mon_ma, muc', [['nam_hoc', D.nam]], coMa)).then(function (d) { S.kq = d || []; }) : null,
          coMa ? motNguon('danhGia', taiHet('hs_nl_pc', 'id, ky, hoc_sinh_ma, tieu_chi_ma, muc', [['nam_hoc', D.nam]], coMa)).then(function (d) { S.nlpc = d || []; }) : null,
          coMa ? motNguon('danhGia', taiHet('hs_tong_hop', 'id, hoc_sinh_ma, hoan_thanh_lop, khen_thuong', [['nam_hoc', D.nam]], coMa)).then(function (d) { S.th = d || []; }) : null
        ]);
      })
      .catch(function (e) { D.loi.hs = loiChu(e); });
    return Promise.all([theoLop, theoHs])
      .then(function () { if (D.khoaNap === khoa) D.dangNap = false; });
  }

  // Bước 3: các lần nộp + nhật ký kiểm tra của năm (RLS lọc: GVCN lớp mình, tổ
  // trưởng lớp thuộc tổ, BGH mọi lớp). KHÔNG kéo ban_chup ở đây — mở mới tải.
  // docDuyet() chỉ GỬI câu hỏi; napDuyet(hua) áp kết quả. Lúc mở sổ, ve() gửi
  // docDuyet() cùng lúc với napKhung() cho khỏi xếp hàng, nhưng vẫn ÁP sau
  // napKhung — vì napKhung ghi D.dv.loi (thiếu sql/71) mà ở đây phải đọc lại.
  function docDuyet() {
    if (!may() || !toi()) return null;
    var nam = (window.CAU_HINH || {}).NAM_HOC || D.nam;
    return Promise.all([
      may().from('scn_nop').select('id, nam_hoc, lop, ky, lan, trang_thai, ma_bam, nop_luc, ho_ten_nop, khoi, co_so_ma, den_ngay')
        .eq('nam_hoc', nam).order('id').limit(5000),
      may().from('scn_duyet').select('*').eq('nam_hoc', nam).order('id').limit(10000)
    ]);
  }
  function napDuyet(hua) {
    hua = hua || docDuyet();
    if (!hua) return Promise.resolve();
    return hua.then(function (r) {
      if (r[0].error) throw r[0].error;
      D.dv.nop = r[0].data || [];
      D.dv.duyet = (r[1] && !r[1].error && r[1].data) || [];
      if (!thieuBang(D.dv.loi)) D.dv.loi = '';
    }).catch(function (e) { D.dv.loi = loiChu(e); D.dv.nop = []; D.dv.duyet = []; });
  }

  // ══════════ DỮ LIỆU MẪU (bản xem thử — không tên thật) ══════════
  function mauKhung() {
    D.lopCuaToi = ['4A'];
    D.dsLop = [{ lop: '4A', khoi: 4, coSo: 'CS01', coSoTen: 'Điểm trường chính (mẫu)' }, { lop: '4C', khoi: 4, coSo: 'CS02', coSoTen: 'Phân hiệu (mẫu)' }];
    D.coSo = [{ ma: 'CS01', ten: 'Điểm trường chính (mẫu)' }, { ma: 'CS02', ten: 'Phân hiệu (mẫu)' }];
    D.gvcnCua = { '4A': 'Giáo viên mẫu A', '4C': 'Giáo viên mẫu C' };
    if (!D.lop) D.lop = '4A';
    mauDuyet();
  }
  // Xem thử thẻ Kiểm tra – Duyệt: người xem thử vừa là GVCN 4A vừa là BGH.
  // 4A tháng 9 đã được tổ kiểm tra; 4C tháng 9 đang chờ (BGH bấm thử được).
  function mauDuyet() {
    if (D.dv.mau) return;
    var y = namDau(D.nam) || 2026;
    D.dv = { mau: true, loi: '',
      nguoiDuyet: [{ id: -1, nam_hoc: D.nam, ten_to: 'Tổ 4, 5', ho_ten: 'Tổ trưởng mẫu', email: 'totruong.mau@example.com', chuc_vu: 'Tổ trưởng', khoi: [4, 5], co_so_ma: null },
        { id: -2, nam_hoc: D.nam, ten_to: 'Tổ 4, 5', ho_ten: 'Tổ phó mẫu', email: 'topho.mau@example.com', chuc_vu: 'Tổ phó', khoi: [4, 5], co_so_ma: 'CS02' }],
      nop: [{ id: -11, nam_hoc: D.nam, lop: '4A', ky: 'thang-9', lan: 1, trang_thai: 'da_kiem_tra', ma_bam: 'a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f9', nop_luc: y + '-09-26T15:05:00+07:00', ho_ten_nop: 'Giáo viên mẫu A', khoi: 4, co_so_ma: 'CS01' },
        { id: -12, nam_hoc: D.nam, lop: '4C', ky: 'thang-9', lan: 1, trang_thai: 'da_nop', ma_bam: '9f8e7d6c5b4a39281706f5e4d3c2b1a09f8e7d6c5b4a39281706f5e4d3c2b1a0', nop_luc: y + '-09-27T16:40:00+07:00', ho_ten_nop: 'Giáo viên mẫu C', khoi: 4, co_so_ma: 'CS02' }],
      duyet: [{ id: -21, nop_id: -11, nam_hoc: D.nam, lop: '4A', ky: 'thang-9', lan: 1, ho_ten: 'Tổ trưởng mẫu', chuc_vu: 'Tổ trưởng Tổ 4, 5', vai: 'to_truong',
        ket_qua: 'da_kiem_tra', nhan_xet: 'Kế hoạch tháng 9 đầy đủ; bổ sung kết quả cuối tháng.', ma_bam: 'a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f9', luc: y + '-09-28T09:10:00+07:00' }]
    };
    D.toCuaToi = []; D.laToKT = false; D.dsLopKT = [];
  }
  var TEN_MAU = ['Lê Minh An', 'Trần Bảo Châu', 'Phạm Gia Huy', 'Hoàng Ngọc Diệp', 'Vũ Đức Minh', 'Đặng Thu Hà', 'Bùi Quốc Khánh',
    'Đỗ Khánh Linh', 'Ngô Tuấn Kiệt', 'Hồ Mai Phương', 'Dương Thành Nam', 'Lý Hải Yến', 'Mai Xuân Phúc', 'Tạ Thảo Vy'];
  function mauLop() {
    var y = namDau(D.nam) || 2026, S = D.so;
    D.hs = TEN_MAU.map(function (t, i) {
      return { ma: 'MAU' + pad(i + 1), ho_ten: t, ngay_sinh: (y - 9) + '-' + pad(i % 12 + 1) + '-' + pad(i * 2 + 1), gioi_tinh: i % 2 ? 'Nữ' : 'Nam', khuyet_tat_hoa_nhap: i === 6 };
    }).sort(sapTen);
    var hn = homNay(), m = hn.slice(0, 8);
    S.lop = { nam_hoc: D.nam, lop: D.lop, ban_can_su: [{ chuc_vu: 'Lớp trưởng', hoc_sinh_ma: 'MAU02' }, { chuc_vu: 'Lớp phó học tập', hoc_sinh_ma: 'MAU08' }],
      ngay_bau: y + '-09-10', ban_dai_dien: [{ vai_tro: 'Trưởng ban', ho_ten: 'Phụ huynh mẫu 1', sdt: '0900 333 444', cua_hs: 'MAU03' }], khoa_den: null, gvcn_sdt: '0900 555 666' };
    S.hoanCanh = {
      MAU07: { hoc_sinh_ma: 'MAU07', o_voi: 'Bố mẹ', dien_chinh_sach: ['khuyet_tat'], kt_dang: 'Khuyết tật học tập (mẫu)', kt_co_giay: true, can_quan_tam: true },
      MAU04: { hoc_sinh_ma: 'MAU04', o_voi: 'Ông bà (bố mẹ đi làm ăn xa)', dien_chinh_sach: ['can_ngheo'], can_quan_tam: true,
        cha_me_ten: 'Phụ huynh mẫu 4', nghe_nghiep: 'Làm ruộng', sdt: '0900 111 222', dia_chi: 'Thôn mẫu', xom: 'Xóm 4',
        hoan_canh_gd: 'Bố mẹ đi làm ăn xa (mẫu)', dac_diem: 'Rụt rè khi phát biểu (mẫu)' },
      MAU11: { hoc_sinh_ma: 'MAU11', o_voi: 'Mẹ', dien_chinh_sach: ['ho_ngheo', 'mo_coi'], giay_xac_nhan: 'Giấy xác nhận hộ nghèo (mẫu)' }
    };
    S.theoDoi = [
      { id: -1, ngay: congNgay(hn, -1), hoc_sinh_ma: 'MAU02', loai: 'khen', linh_vuc: 'Trách nhiệm', noi_dung: 'Điều hành lớp sinh hoạt đầu giờ tốt', da_bao_cmhs: false },
      { id: -2, ngay: congNgay(hn, -2), hoc_sinh_ma: 'MAU05', loai: 'nhac', linh_vuc: 'Nề nếp', noi_dung: 'Đi học muộn', da_bao_cmhs: true },
      { id: -3, ngay: congNgay(hn, -3), hoc_sinh_ma: null, loai: 'ne_nep', linh_vuc: 'Nề nếp', noi_dung: 'Cả lớp xếp hàng ra vào lớp nghiêm túc', da_bao_cmhs: false },
      { id: -4, ngay: congNgay(hn, -5), hoc_sinh_ma: 'MAU04', loai: 'tien_bo', linh_vuc: 'Tiếng Việt', noi_dung: 'Tiến bộ trong đọc thành tiếng', da_bao_cmhs: false },
      { id: -5, ngay: congNgay(hn, -4), hoc_sinh_ma: 'MAU09', loai: 'su_viec', linh_vuc: 'An toàn', noi_dung: 'Va chạm nhẹ với bạn giờ ra chơi (mẫu)', da_bao_cmhs: true }
    ];
    S.vang = [
      { id: -1, ngay: m + '15', buoi: 'sang', hoc_sinh_ma: 'MAU05', phep: 'co_phep', ghi_chu: 'Ốm' },
      { id: -2, ngay: m + '22', buoi: 'sang', hoc_sinh_ma: 'MAU09', phep: 'khong_phep' },
      { id: -3, ngay: m + '22', buoi: 'chieu', hoc_sinh_ma: 'MAU09', phep: 'khong_phep' },
      { id: -4, ngay: m + '23', buoi: 'sang', hoc_sinh_ma: 'MAU09', phep: 'chua_ro' }
    ];
    S.ddl = [{ ngay: m + '22', buoi: 'sang', si_so: 14, so_vang: 1 }, { ngay: m + '22', buoi: 'chieu', si_so: 14, so_vang: 1 }, { ngay: m + '23', buoi: 'sang', si_so: 14, so_vang: 1 }];
    S.lienLac = [{ id: -1, loai: 'hop', ngay: y + '-09-16', ky_hop: 'dau_nam', gio: '7 giờ', dia_diem: 'Phòng học lớp ' + D.lop, so_du: 13, tong_so: 14,
      noi_dung: 'Triển khai kế hoạch năm học, bầu Ban đại diện cha mẹ học sinh lớp', phan_hoi: 'Nhất trí', ket_luan: 'Thống nhất nội dung phối hợp',
      muc: { thu_chi: 'Thu theo quy định; không thu khoản ngoài quy định.' } },
      { id: -2, loai: 'trao_doi', ngay: y + '-09-19', hoc_sinh_ma: 'MAU05', kenh: 'Điện thoại', noi_dung: 'Mẹ em báo sức khỏe em yếu (mẫu)', phan_hoi: 'Gia đình theo dõi', trang_thai: 'xong' }];
    S.hoTro = [{ id: -1, hoc_sinh_ma: 'MAU04', loai: 'hoc_tap', ngay: y + '-09-18', moc: 'dau_nam', hs_giup_do: 'MAU02', bieu_hien: 'Đọc còn chậm, viết sai chính tả', mon_ky_nang: 'Đọc, viết', bien_phap: 'Đôi bạn cùng tiến; phụ đạo buổi 2 thứ Ba', nguoi_phoi_hop: 'Cha mẹ học sinh', moc_xem_lai: y + '-11-06', trang_thai: 'dang_theo_doi' },
      { id: -2, hoc_sinh_ma: 'MAU02', loai: 'noi_troi', ngay: y + '-09-18', moc: 'dau_nam', bieu_hien: 'Đọc diễn cảm, tự tin', mon_ky_nang: 'Tiếng Việt', bien_phap: 'Bồi dưỡng Trạng Nguyên Tiếng Việt', trang_thai: 'dang_theo_doi' },
      { id: -3, hoc_sinh_ma: 'MAU07', loai: 'tam_ly', ngay: y + '-09-20', bieu_hien: 'Hay lo âu khi kiểm tra (mẫu)', bien_phap: 'Trò chuyện riêng', trang_thai: 'dang_theo_doi' }];
    S.kq = []; S.nlpc = []; S.th = [];
    D.hs.forEach(function (h, i) {
      ['TV', 'TOAN', 'DD', 'KH', 'LSDL', 'NN1'].forEach(function (mm, j) { S.kq.push({ ky: 'giua_ki_1', hoc_sinh_ma: h.ma, mon_ma: mm, muc: (i + j) % 4 === 0 ? 'T' : (i === 3 && j < 2 ? 'C' : 'H') }); });
      NLPC.forEach(function (n, j) { S.nlpc.push({ ky: 'giua_ki_1', hoc_sinh_ma: h.ma, tieu_chi_ma: n[0], muc: (i + j) % 3 === 0 ? 'T' : 'Đ' }); });
    });
    S.keHoach = [];
  }

  // ══════════ TIỆN ÍCH GIAO DIỆN ══════════
  function laGVCNLopNay() { return !may() || D.lopCuaToi.some(function (l) { return chuanLop(l) === chuanLop(D.lop); }); }
  // Phần NHẠY CẢM (hoàn cảnh, hỗ trợ, trao đổi riêng) bị RLS lọc ÂM THẦM — máy chủ
  // trả mảng rỗng chứ không báo lỗi. Phải tự biết mình có quyền không, kẻo tổ
  // trưởng thấy "0 em cần quan tâm" và tưởng lớp không có em nào.
  function anNhayCam() { return !!may() && !laGVCNLopNay() && !laBGH(); }
  function khoaDen() { return (D.so && D.so.lop && D.so.lop.khoa_den) || ''; }
  function ngayMo(iso) { var k = khoaDen(); return !k || !iso || iso > k; }
  function coGhi(ngay) { return laGVCNLopNay() && ngayMo(ngay); }
  function tenHS(ma) { var h = D.hs.filter(function (x) { return x.ma === ma; })[0]; return h ? h.ho_ten : (ma ? '(' + ma + ')' : 'Cả lớp'); }
  function hoaNhap() { var o = {}; D.hs.forEach(function (h) { if (h.khuyet_tat_hoa_nhap) o[h.ma] = 1; }); return o; }
  function keHoach(cap, ky) { return D.so.keHoach.filter(function (k) { return k.cap === cap && k.ky === ky; })[0] || null; }
  function oChon(id, ds, gt, them) {
    return '<select id="' + id + '" class="scn-o"' + (them || '') + '>' + ds.map(function (x) {
      var v = Array.isArray(x) ? x[0] : x, t = Array.isArray(x) ? x[1] : x;
      return '<option value="' + thoat(v) + '"' + (String(v) === String(gt) ? ' selected' : '') + '>' + thoat(t) + '</option>';
    }).join('') + '</select>';
  }
  function oChonHS(id, gt, coCaLop) {
    return oChon(id, (coCaLop ? [['', '— Cả lớp —']] : [['', '— Chọn học sinh —']]).concat(D.hs.map(function (h) { return [h.ma, h.ho_ten]; })), gt || '');
  }
  function oVan(id, gt, nhan, dong, khoa) {
    return '<label class="scn-nhan">' + thoat(nhan) + '<textarea id="' + id + '" class="scn-o" rows="' + (dong || 3) + '"' + (khoa ? ' disabled' : '') + '>' + thoat(gt || '') + '</textarea></label>';
  }
  function giaTri(id) { var o = document.getElementById(id); return o ? String(o.value || '').trim() : ''; }
  function the(tieuDe, than, them) { return '<section class="scn-the"' + (them || '') + '>' + (tieuDe ? '<h3>' + tieuDe + '</h3>' : '') + than + '</section>'; }
  function rong(chu) { return '<p class="scn-rong">' + chu + '</p>'; }
  function soO(nhan, so, phu) { return '<div class="scn-so"><span>' + nhan + '</span><b>' + so + '</b>' + (phu ? '<small>' + phu + '</small>' : '') + '</div>'; }
  function baoLoiNguon() {
    var ds = [];
    if (D.loi.hs) ds.push('Không đọc được danh sách học sinh: ' + thoat(D.loi.hs));
    if (D.loi.scn) ds.push(thieuBang(D.loi.scn) ? 'Cơ sở dữ liệu của trường <b>chưa có các bảng sổ chủ nhiệm</b> — người phụ trách hệ thống cần chạy <b>sql/69-so-chu-nhiem.sql</b>. Phần danh sách, chuyên cần, đánh giá vẫn xem được.' : 'Không đọc được dữ liệu sổ: ' + thoat(D.loi.scn));
    if (D.loi.vang) ds.push('Không đọc được chuyên cần: ' + thoat(D.loi.vang));
    if (D.loi.danhGia) ds.push('Không đọc được kết quả đánh giá: ' + thoat(D.loi.danhGia));
    if (D.loi.hoanCanh && !thieuBang(D.loi.hoanCanh)) ds.push('Không đọc được hồ sơ hoàn cảnh: ' + thoat(D.loi.hoanCanh));
    if (may() && !D.co71 && !D.loi.scn) ds.push('Cơ sở dữ liệu chưa chạy <b>sql/71-so-chu-nhiem-duyet.sql</b>: chưa nộp kiểm tra được, và các ô mới theo mẫu sổ (cha mẹ, điện thoại, địa chỉ, mốc hỗ trợ, khung họp phụ huynh…) chưa lưu được.');
    return ds.length ? '<div class="hd-kiem do">' + ds.join('<br>') + '</div>' : '';
  }

  // ══════════ VẼ ══════════
  function ve(el) {
    if (el) EL = el;
    if (!EL || !document.body.contains(EL)) return;
    if (!D.khoiTao) {
      D.khoiTao = true; D.dangNap = true;
      EL.innerHTML = dauMan() + '<div class="the-thong-bao">Đang tải sổ chủ nhiệm…</div>';
      // 29/9/2026: trước đây khung → duyệt → lớp nối đuôi (3 lượt chờ máy chủ,
      // chưa kể lượt trong napLop). Nay câu hỏi duyệt gửi ngay cùng khung; khung
      // về thì nạp lớp và áp duyệt song song — không bên nào cần kết quả bên kia.
      var huaDuyet = docDuyet();
      napKhung().then(function () {
        if (D.lopMuon) { apLopMuon(D.lopMuon); D.lopMuon = ''; }
        D.dangNap = false;
        return Promise.all([napDuyet(huaDuyet), D.lop ? napLop() : null]);
      }).then(function () { ve(); });
      return;
    }
    if (D.dangNap) { EL.innerHTML = dauMan() + '<div class="the-thong-bao">Đang tải…</div>'; ganChung(); return; }
    var h = dauMan();
    if (D.loiKhung) { EL.innerHTML = h + '<div class="hd-kiem do">' + thoat(D.loiKhung) + '</div>'; ganChung(); return; }
    if (D.che !== 'kiemtra' && !D.lop && D.laToKT) {
      // Tổ trưởng / tổ phó không chủ nhiệm: CHỈ màn kiểm tra, không thấy sổ gốc
      D.che = 'kiemtra'; h = dauMan();
    }
    if (D.che === 'kiemtra') { EL.innerHTML = h + '<div class="scn-than">' + veKiemTra() + '</div>'; ganChung(); return; }
    if (!D.lop) {
      EL.innerHTML = h + '<div class="the-thong-bao">' + (laQuanLy()
        ? 'Chưa có lớp nào của năm học ' + thoat(D.nam) + ' — khai lớp và phân công chủ nhiệm ở <b>Quản trị</b>.'
        : 'Sổ chủ nhiệm chỉ dành cho <b>GVCN lớp, Ban giám hiệu và Quản trị</b>. Thầy cô chưa được phân công chủ nhiệm lớp nào trong năm học ' +
          thoat(D.nam) + ' — nếu thầy cô đang chủ nhiệm, báo Ban giám hiệu ghi phân công ở <b>Quản trị › Phân công</b>.') + '</div>';
      ganChung(); return;
    }
    h += baoLoiNguon();
    if (khoaDen()) h += '<div class="hd-kiem vang">🔒 Sổ đã được Ban giám hiệu <b>khoá đến ngày ' + ngayVN(khoaDen()) + '</b> — các mục có ngày từ đó trở về trước chỉ xem, không sửa.</div>';
    if (may() && !laGVCNLopNay()) h += '<div class="scn-ghi-chu">Ban giám hiệu, Quản trị xem sổ ở chế độ chỉ đọc — chỉ giáo viên chủ nhiệm của lớp được ghi.</div>';
    var tabs = TABS.filter(function (t) { return t[0] !== 'duyet' || !may() || laGVCNLopNay(); });
    if (!tabs.some(function (t) { return t[0] === D.tab; })) D.tab = 'tong-quan';
    h += '<nav class="scn-tabs" role="tablist">' + tabs.map(function (t) {
      return '<button class="' + (D.tab === t[0] ? 'on' : '') + '" data-tab="' + t[0] + '">' + t[1] + '</button>';
    }).join('') + '</nav><div class="scn-than">';
    var f = { 'tong-quan': veTongQuan, 'ke-hoach': veKeHoach, 'hoc-sinh': veHocSinh, 'theo-doi': veTheoDoi,
      'phu-huynh': vePhuHuynh, 'ho-tro': veHoTro, 'danh-gia': veDanhGia, 'tong-ket': veTongKet, 'duyet': veDuyet }[D.tab] || veTongQuan;
    h += f() + '</div>';
    EL.innerHTML = h;
    ganChung();
  }

  function dauMan() {
    // Một tầng: đường dẫn "Trang chủ / Lớp học / …" + MỘT tiêu đề. Không vẽ lại
    // tiêu đề "Lớp học" và hàng thẻ của trang Lớp học ở đây (29/9/2026).
    var vet = window.LOP_HOC_VET ? window.LOP_HOC_VET(D.che === 'kiemtra' ? 'kiemtra' : 'sochunhiem') : '';
    if (D.che === 'kiemtra') {
      var moTa = D.laToKT && !laBGH() ? 'Sổ các lớp được giao · ' + thoat(tenToCua(D.toCuaToi)) : 'Sổ chủ nhiệm GVCN đã nộp: tổ kiểm tra hằng tháng, Ban giám hiệu duyệt cuối học kỳ I và cuối năm';
      return '<div class="lh-dau">' + vet + '</div><div class="scn-dau"><div class="scn-dau-tieu"><div><h2>Kiểm tra sổ chủ nhiệm</h2><p>' +
        moTa + ' · Năm học ' + thoat(D.nam) + '</p></div></div></div>';
    }
    var chon = '';
    if (laQuanLy() && D.dsLop.length) {
      var ds = D.dsLop.filter(function (l) { return !D.locCoSo || l.coSo === D.locCoSo; });
      chon = '<div class="scn-chon">' +
        (D.coSo.length > 1 ? oChon('scn-co-so', [['', 'Mọi điểm trường']].concat(D.coSo.map(function (c) { return [c.ma, c.ten]; })), D.locCoSo) : '') +
        oChon('scn-lop', ds.map(function (l) { return [l.lop, 'Lớp ' + l.lop + (D.gvcnCua[chuanLop(l.lop)] ? ' · ' + D.gvcnCua[chuanLop(l.lop)] : '')]; }), D.lop) + '</div>';
    } else if (D.lopCuaToi.length > 1) {
      chon = '<div class="scn-chon">' + oChon('scn-lop', D.lopCuaToi.map(function (l) { return [l, 'Lớp ' + l]; }), D.lop) + '</div>';
    }
    var phu = [D.lop && D.gvcnTen ? 'GVCN ' + thoat(D.gvcnTen) : '', 'Năm học ' + thoat(D.nam), D.lop && D.coSoTen ? thoat(D.coSoTen) : '']
      .filter(Boolean).join(' · ');
    // Một nút "Xem sổ chủ nhiệm" ở góc phải hàng tiêu đề — tách khỏi ô chọn điểm trường/lớp
    var xem = D.lop && !D.dangNap && !D.loiKhung ? '<button type="button" class="scn-nut-xem" data-act="xem-so">' + SVG.mat + '<span>Xem sổ chủ nhiệm</span></button>' : '';
    return '<div class="lh-dau">' + vet + '</div><div class="scn-dau"><div class="scn-dau-tieu"><div><h2>Sổ chủ nhiệm' + (D.lop ? ' – Lớp ' + thoat(D.lop) : '') +
      '</h2><p>' + phu + '</p></div>' + xem + '</div>' + chon + '</div>';
  }

  // ── Tổng quan ──
  function veTongQuan() {
    var hs = D.hs, nam = 0, nu = 0, hn = 0, cs = 0, qt = 0;
    hs.forEach(function (h) {
      if (h.gioi_tinh === 'Nam') nam++; else if (h.gioi_tinh === 'Nữ') nu++;
      if (h.khuyet_tat_hoa_nhap) hn++;
      var c = D.so.hoanCanh[h.ma];
      if (c && (c.dien_chinh_sach || []).length) cs++;
      if ((c && c.can_quan_tam) || D.so.hoTro.some(function (x) { return x.hoc_sinh_ma === h.ma && x.trang_thai === 'dang_theo_doi'; })) qt++;
    });
    var hnay = homNay(), ym = hnay.slice(0, 7);
    var cc = tongHopChuyenCan(D.so.vang, ym + '-01', ym + '-31');
    var buoi = D.so.ddl.filter(function (d) { return d.ngay.slice(0, 7) === ym; }).length;
    var tl = tiLeChuyenCan(cc.lop.tong, hs.length, buoi);
    var nhayCam = anNhayCam();
    var h = '<div class="scn-luoi-so">' +
      soO('Sĩ số', hs.length, 'đang học') + soO('Nam / Nữ', nam + ' / ' + nu, (hs.length - nam - nu) ? (hs.length - nam - nu) + ' em chưa ghi giới tính' : '') +
      soO('Hòa nhập', hn, 'khuyết tật học hòa nhập') +
      soO('Diện chính sách', nhayCam ? '–' : cs, nhayCam ? 'không đủ quyền xem' : 'theo hồ sơ hoàn cảnh') +
      soO('Cần quan tâm', nhayCam ? '–' : qt, nhayCam ? 'không đủ quyền xem' : 'đang theo dõi, hỗ trợ') +
      soO('Vắng ' + TEN_THANG(ym).toLowerCase(), cc.lop.tong, 'P ' + cc.lop.P + ' · K ' + cc.lop.K + (cc.lop.R ? ' · chưa rõ ' + cc.lop.R : '') + (tl != null ? ' · chuyên cần ' + tl + '%' : '')) +
      '</div>';
    var tuan = tuanCuaNgay(D.nam, hnay), k = khungNam(D.nam);
    var tDong = tuan ? (tuan.nghi ? thoat(tuan.nghi) : '<b>Tuần ' + tuan.tuan + '</b> (' + ngayVN(tuan.dau) + ' – ' + ngayVN(congNgay(tuan.dau, 6)) + ')' +
      (tietSHDC(D.nam, tuan.tuan) ? ' · Sinh hoạt dưới cờ: ' + thoat(tietSHDC(D.nam, tuan.tuan).ten) : '')) : 'Ngoài thời gian thực học của năm học.';
    if (k && k.suyTam) tDong += ' <small>(tuần suy tạm từ 05/9 — chưa có khung thời gian năm học này)</small>';
    h += the('Tuần này', '<p>' + tDong + '</p>');
    h += the('Việc tháng này — ' + TEN_THANG(ym), veKhungThang(ym));
    var cb = canhBaoChuyenCan(D.so.vang.filter(function (v) { return v.ngay >= congNgay(hnay, -30); }));
    if (cb.length) {
      h += the('Cảnh báo chuyên cần (30 ngày gần đây)', '<ul class="scn-ds">' + cb.map(function (c) {
        return '<li><b>' + thoat(tenHS(c.ma)) + '</b> — ' + (c.loai === 'k_lien_tiep' ? 'vắng không phép ' + c.so + ' buổi liên tiếp' : 'vắng ' + c.so + ' ngày học liên tục') +
          ' (' + ngayVN(c.tu) + ' → ' + ngayVN(c.den) + ')</li>';
      }).join('') + '</ul><p class="scn-ghi-chu">Nên liên lạc cha mẹ học sinh (thẻ Phụ huynh) và xem xét đưa vào danh sách Hỗ trợ HS. Nghỉ quá 03 ngày liên tục vượt quyền cho phép của GVCN (TT 15/2026 Đ26) — báo Ban giám hiệu.</p>');
    }
    if (laGVCNLopNay() && !keHoach('nam', '')) h += '<div class="hd-kiem vang">Lớp chưa có <b>kế hoạch chủ nhiệm năm</b> — vào thẻ Kế hoạch › Năm học.</div>';
    if (laBGH()) {
      h += the('Khoá sổ (Ban giám hiệu)', '<p class="scn-ghi-chu">Khoá theo mốc (cuối học kỳ I, cuối năm): mọi mục có ngày từ mốc trở về trước giáo viên không sửa được nữa. Mở lại = xoá mốc hoặc lùi mốc.</p>' +
        '<div class="scn-hang"><input type="date" id="scn-khoa" class="scn-o" value="' + thoat(khoaDen()) + '">' +
        '<button class="scn-nut" data-act="khoa">Khoá đến ngày này</button>' + (khoaDen() ? '<button class="scn-nut phu" data-act="mo-khoa">Mở khoá</button>' : '') + '</div>');
    }
    return h;
  }

  function veKhungThang(ym) {
    var cd = chuDiemThang(D.nam, ym);
    if (!cd) return rong('Chưa có khung chủ điểm cho ' + thoat(TEN_THANG(ym).toLowerCase()) + ' của năm học ' + thoat(D.nam) + ' — giáo viên tự ghi hoạt động ở thẻ Kế hoạch.');
    var khoi = D.khoi >= 1 && D.khoi <= 5 ? D.khoi : 0;
    return '<dl class="scn-dl">' +
      '<dt>Chủ điểm tháng</dt><dd>' + thoat(cd.khgd) + '</dd>' +
      '<dt>Chủ điểm Đội</dt><dd>' + thoat(cd.doi) + '</dd>' +
      '<dt>Sinh hoạt dưới cờ</dt><dd>' + cd.shdc.map(function (s) { return 'Tuần ' + s[0] + ' (' + ngayVN(ngayDauTuan(D.nam, s[0])).slice(0, 5) + '): ' + thoat(s[1]) + (s[2] ? ' <small>(trường chủ trì)</small>' : ''); }).join('<br>') + '</dd>' +
      '<dt>Hoạt động trải nghiệm</dt><dd>' + thoat(cd.hdtn[0]) + (khoi ? ': <b>' + thoat(cd.hdtn[khoi]) + '</b> (khối ' + khoi + ')' : '') + '</dd>' +
      '<dt>Ngày lễ, mốc cần nhớ</dt><dd><ul class="scn-ds">' + cd.moc.map(function (m) { return '<li>' + thoat(m) + '</li>'; }).join('') + '</ul></dd>' +
      '</dl><p class="scn-ghi-chu">Khung tham khảo năm học 2026-2027 (kế hoạch giáo dục mẫu, ma trận sinh hoạt dưới cờ, SGK Hoạt động trải nghiệm). Tên tiết, thứ tự tuần có thể khác theo kế hoạch của trường — ghi bổ sung ở thẻ Kế hoạch.</p>';
  }

  // ── Kế hoạch ──
  function veKeHoach() {
    var cap = D.capKH, hnay = homNay();
    var h = '<div class="scn-chips">' + [['nam', 'Năm học'], ['thang', 'Tháng'], ['tuan', 'Tuần']].map(function (c) {
      return '<button class="' + (cap === c[0] ? 'on' : '') + '" data-cap="' + c[0] + '">' + c[1] + '</button>';
    }).join('') + '</div>';
    var k = khungNam(D.nam);
    if (cap === 'nam') {
      var kh = keHoach('nam', ''), nd = (kh && kh.noi_dung) || {}, ngay = k ? k.batDau : D.nam.slice(0, 4) + '-09-01', khoa = !coGhi(ngay);
      var goiY = dacDiemTuSinh();
      var cu = function (key) { return (KH_CU[key] || []).map(function (o) { return nd[o]; }).filter(Boolean).join('\n'); };
      h += the('Kế hoạch chủ nhiệm năm học ' + thoat(D.nam),
        '<p class="scn-ghi-chu">Theo khung sổ chủ nhiệm của trường: I. Căn cứ · II. Đặc điểm tình hình · III. Chỉ tiêu, biện pháp (8 mục). Hạn nộp theo chương trình sinh hoạt chuyên môn: trước 26/9. Kế hoạch nằm trong sổ, không lập hồ sơ riêng.</p>' +
        oVan('kh-can-cu', nd.can_cu != null ? nd.can_cu : canCuMac(), 'I. Căn cứ xây dựng kế hoạch', 4, khoa) +
        oVan('kh-dac-diem', nd.dac_diem || '', 'II. Đặc điểm tình hình — tình hình chung', 3, khoa) +
        (khoa ? '' : '<button class="scn-nut phu nho" data-act="tu-sinh">Điền gợi ý từ số liệu lớp</button><span class="scn-an" id="kh-goi-y">' + thoat(goiY) + '</span>') +
        oVan('kh-thuan-loi', nd.thuan_loi || '', '1. Thuận lợi', 3, khoa) + oVan('kh-kho-khan', nd.kho_khan || '', '2. Khó khăn', 3, khoa));
      h += the('III. Chỉ tiêu, biện pháp', '<p class="scn-ghi-chu">Mỗi mục ghi <b>* Mục tiêu</b> và <b>* Nhiệm vụ và giải pháp</b> như sổ giấy.</p>' +
        MUC_KH.map(function (m) { return oVan('kh-m-' + m[0], nd['kh_' + m[0]] != null ? nd['kh_' + m[0]] : cu(m[0]), m[1], 3, khoa); }).join(''));
      h += the('Chỉ tiêu chất lượng (số học sinh — tỉ lệ máy tự tính theo sĩ số ' + D.hs.length + ')',
        '<p class="scn-nhan">Chỉ tiêu các môn học, hoạt động giáo dục</p>' + luoiChiTieu('ct_mon', monTheoKhoi(D.khoi), [['T', 'Hoàn thành tốt'], ['H', 'Hoàn thành'], ['C', 'Chưa hoàn thành']], nd.ct_mon, khoa) +
        '<p class="scn-nhan">Phẩm chất</p>' + luoiChiTieu('ct_pc', NLPC.filter(function (x) { return /^PC/.test(x[0]); }), [['T', 'Tốt'], ['Đ', 'Đạt'], ['C', 'Cần cố gắng']], nd.ct_pc, khoa) +
        '<p class="scn-nhan">Năng lực (chung và đặc thù)</p>' + luoiChiTieu('ct_nl', NL_DAY_DU, [['T', 'Tốt'], ['Đ', 'Đạt'], ['C', 'Cần cố gắng']], nd.ct_nl, khoa) +
        '<p class="scn-nhan">Đánh giá cuối năm học, khen thưởng</p>' + luoiChiTieu('ct_cn', CT_CUOI_NAM, [['SL', 'Số học sinh']], nd.ct_cn, khoa) +
        '<p class="scn-nhan">Học sinh tham gia các cuộc thi, sân chơi (tên cuộc thi — chỉ tiêu)</p>' +
        '<div id="kh-cuoc-thi">' + (nd.cuoc_thi && nd.cuoc_thi.length ? nd.cuoc_thi : [{}, {}]).map(dongCuocThi(khoa)).join('') + '</div>' +
        (khoa ? '' : '<button class="scn-nut phu nho" data-act="them-ct">+ Thêm cuộc thi</button>'));
      h += the('8. Chỉ tiêu chung',
        '<div class="scn-hang"><label class="scn-nhan ngang">Danh hiệu thi đua của lớp <input id="kh-dh-lop" class="scn-o" value="' + thoat(nd.danh_hieu_lop || '') + '"' + (khoa ? ' disabled' : '') + '></label>' +
        '<label class="scn-nhan ngang">Chi đội / Sao nhi đồng <input id="kh-dh-doi" class="scn-o" value="' + thoat(nd.danh_hieu_doi || '') + '"' + (khoa ? ' disabled' : '') + '></label>' +
        '<label class="scn-nhan ngang">Đội viên xuất sắc <input id="kh-dv-xs" class="scn-o so" value="' + thoat(nd.doi_vien_xs || '') + '"' + (khoa ? ' disabled' : '') + '></label></div>' +
        oVan('kh-chi-tieu', nd.chi_tieu != null ? nd.chi_tieu : CHI_TIEU_MAC, 'Chỉ tiêu trường giao, chỉ tiêu khác (mặc định = chỉ tiêu trường giao, sửa được)', 5, khoa) +
        oVan('kh-shdc', nd.shdc_phu_trach || '', 'Tuần lớp phụ trách sinh hoạt dưới cờ (nộp kịch bản trước 07 ngày)', 2, khoa) +
        (khoa ? '' : '<div class="scn-hang"><button class="scn-nut" data-act="luu-kh-nam">Lưu kế hoạch năm</button></div>'));
    } else if (cap === 'thang') {
      var dsT = dsThangNamHoc(D.nam);
      if (!D.thangKH) D.thangKH = dsT.indexOf(hnay.slice(0, 7)) >= 0 ? hnay.slice(0, 7) : dsT[0];
      var ym = D.thangKH, kt = keHoach('thang', ym), ndT = (kt && kt.noi_dung) || {}, khoaT = !coGhi(ym + '-01');
      h += '<div class="scn-hang">' + oChon('kh-thang', dsT.map(function (x) { return [x, TEN_THANG(x)]; }), ym) + '</div>';
      h += the('Khung ' + TEN_THANG(ym).toLowerCase() + ' (máy điền sẵn)', veKhungThang(ym));
      h += the('Kế hoạch và nhật ký ' + TEN_THANG(ym).toLowerCase() + ' (theo khung sổ)',
        oVan('kh-day-hoc', ndT.day_hoc != null ? ndT.day_hoc : (ndT.hoat_dong || ''), '1. Công tác dạy học', 4, khoaT) +
        oVan('kh-doi', ndT.doi || '', '2. Công tác Đội', 3, khoaT) +
        oVan('kh-khac', ndT.khac != null ? ndT.khac : (ndT.trong_tam || ''), '3. Công tác khác (họp cha mẹ, an toàn, vệ sinh, phong trào…)', 3, khoaT) +
        oVan('kh-ket-qua', (kt && kt.ket_qua) || '', 'Kết quả (cuối tháng)', 3, khoaT) +
        oVan('kh-ghi-chu-db', ndT.ghi_chu_db || '', 'Ghi chú đặc biệt', 2, khoaT) +
        (khoaT ? '' : '<div class="scn-hang"><button class="scn-nut" data-act="luu-kh-thang">Lưu kế hoạch tháng</button></div>'));
    } else {
      if (!D.tuanKH) { var tn = tuanCuaNgay(D.nam, hnay); D.tuanKH = (tn && tn.tuan) || 1; }
      var t = D.tuanKH, dau = ngayDauTuan(D.nam, t), ku = keHoach('tuan', 'T' + pad(t)), ndU = (ku && ku.noi_dung) || {}, khoaU = !coGhi(dau);
      var so = k ? k.soTuan : 35, dsU = [];
      for (var i = 1; i <= so; i++) dsU.push([i, 'Tuần ' + i + ' · ' + ngayVN(ngayDauTuan(D.nam, i)).slice(0, 5)]);
      var shdc = tietSHDC(D.nam, t), cd = chuDiemThang(D.nam, thangCuaTuan(D.nam, t));
      var chuDeMac = cd && D.khoi ? cd.hdtn[D.khoi] : '';
      h += '<div class="scn-hang">' + oChon('kh-tuan', dsU, t) + '<span class="scn-ghi-chu">' + ngayVN(dau) + ' – ' + ngayVN(congNgay(dau, 6)) + '</span></div>';
      if (shdc) h += '<p class="scn-ghi-chu">Sinh hoạt dưới cờ: <b>' + thoat(shdc.ten) + '</b>' + (shdc.truong ? ' (trường chủ trì)' : '') + '</p>';
      h += the('Sinh hoạt lớp tuần ' + t,
        oVan('kh-so-ket', ndU.so_ket || '', 'Sơ kết tuần (nề nếp, học tập, vệ sinh, tuyên dương)', 4, khoaU) +
        oVan('kh-chu-de', ndU.chu_de != null ? ndU.chu_de : chuDeMac, 'Hoạt động theo chủ đề (mặc định theo SGK Hoạt động trải nghiệm khối ' + (D.khoi || '') + ')', 2, khoaU) +
        oVan('kh-long-ghep', ndU.long_ghep || '', 'Nội dung lồng ghép (an toàn giao thông, kỹ năng sống, đọc sách…)', 2, khoaU) +
        oVan('kh-tuan-toi', ndU.tuan_toi || '', 'Kế hoạch tuần tới', 3, khoaU) +
        (khoaU ? '' : '<div class="scn-hang"><button class="scn-nut" data-act="luu-kh-tuan">Lưu tuần ' + t + '</button></div>'));
      var coDl = D.so.keHoach.filter(function (x) { return x.cap === 'tuan'; }).map(function (x) { return x.ky; }).sort();
      if (coDl.length) h += '<p class="scn-ghi-chu">Đã ghi: ' + coDl.map(function (x) { return 'tuần ' + (+x.slice(1)); }).join(', ') + '.</p>';
    }
    return h;
  }
  function dacDiemTuSinh() {
    var hs = D.hs, nu = hs.filter(function (h) { return h.gioi_tinh === 'Nữ'; }).length;
    var hn = hs.filter(function (h) { return h.khuyet_tat_hoa_nhap; }).length, cs = 0, dt = hs.filter(function (h) { return h.dan_toc && !/^kinh$/i.test(h.dan_toc); }).length;
    Object.keys(D.so.hoanCanh).forEach(function (m) { if ((D.so.hoanCanh[m].dien_chinh_sach || []).length) cs++; });
    return 'Lớp ' + D.lop + ' có ' + hs.length + ' học sinh (' + nu + ' nữ' + (dt ? ', ' + dt + ' dân tộc thiểu số' : '') + (hn ? ', ' + hn + ' khuyết tật học hòa nhập' : '') + ')' +
      (cs ? '; ' + cs + ' em thuộc diện chính sách' : '') + (D.so.hoTro.length ? '; ' + D.so.hoTro.length + ' em trong danh sách cần hỗ trợ' : '') + '.';
  }

  function canCuMac() {
    var ten = (window.CAU_HINH || {}).TEN_TRUONG || 'nhà trường';
    return ['- Căn cứ hướng dẫn nhiệm vụ năm học ' + D.nam + ' đối với giáo dục tiểu học của Bộ Giáo dục và Đào tạo, Sở Giáo dục và Đào tạo;',
      '- Căn cứ Kế hoạch giáo dục năm học ' + D.nam + ' của ' + ten + ';',
      '- Căn cứ kế hoạch của tổ chuyên môn;',
      '- Căn cứ tình hình thực tế của lớp ' + D.lop + ', giáo viên chủ nhiệm xây dựng kế hoạch chủ nhiệm năm học ' + D.nam + ' như sau:'].join('\n');
  }
  // Lưới chỉ tiêu: mỗi dòng một môn / phẩm chất / năng lực, mỗi cột một mức — nhập SỐ học sinh
  function luoiChiTieu(khoa, dong, cot, gt, khoaSo) {
    gt = gt || {};
    return '<div class="scn-bang-boc"><table class="scn-bang so"><thead><tr><th></th>' + cot.map(function (c) { return '<th>' + thoat(c[1]) + '</th>'; }).join('') + '</tr></thead><tbody>' +
      dong.map(function (d) {
        return '<tr><th>' + thoat(d[1]) + '</th>' + cot.map(function (c) {
          var v = gt[d[0]] && gt[d[0]][c[0]] != null ? gt[d[0]][c[0]] : '';
          return '<td><input type="number" min="0" class="scn-o so" data-ct="' + khoa + '|' + d[0] + '|' + c[0] + '" value="' + thoat(v) + '"' + (khoaSo ? ' disabled' : '') + '></td>';
        }).join('') + '</tr>';
      }).join('') + '</tbody></table></div>';
  }
  function docLuoiChiTieu() {
    var ra = { ct_mon: {}, ct_pc: {}, ct_nl: {}, ct_cn: {} };
    Array.prototype.slice.call(EL.querySelectorAll('[data-ct]')).forEach(function (i) {
      var p = i.getAttribute('data-ct').split('|'), v = String(i.value || '').trim();
      if (v === '' || !ra[p[0]]) return;
      (ra[p[0]][p[1]] = ra[p[0]][p[1]] || {})[p[2]] = +v;
    });
    return ra;
  }
  function dongCuocThi(khoa) {
    return function (x) {
      return '<div class="scn-hang scn-ct-dong"><input class="scn-o" data-ct-ten value="' + thoat(x.ten || '') + '" placeholder="Cuộc thi, sân chơi (Trạng Nguyên Tiếng Việt, VioEdu…)"' + (khoa ? ' disabled' : '') + '>' +
        '<input class="scn-o so" data-ct-so value="' + thoat(x.chi_tieu || '') + '" placeholder="Chỉ tiêu"' + (khoa ? ' disabled' : '') + '>' +
        (khoa ? '' : '<button class="scn-x" data-act="xoa-ct" title="Bỏ dòng">×</button>') + '</div>';
    };
  }

  // ── Học sinh ──
  function veHocSinh() {
    var S = D.so, ghi = coGhi(), nhayCam = anNhayCam();
    var bcs = (S.lop && S.lop.ban_can_su) || [];
    var h = the('Ban cán sự lớp', (ghi
      ? '<div id="scn-bcs">' + (bcs.length ? bcs : CHUC_VU_MAC.slice(0, 2).map(function (c) { return { chuc_vu: c }; })).map(dongBCS).join('') + '</div>' +
        '<div class="scn-hang"><button class="scn-nut phu nho" data-act="them-bcs">+ Thêm chức vụ</button>' +
        '<label class="scn-nhan ngang">Ngày bầu <input type="date" id="bcs-ngay" class="scn-o" value="' + thoat((S.lop && S.lop.ngay_bau) || '') + '"></label>' +
        '<button class="scn-nut" data-act="luu-bcs">Lưu ban cán sự</button></div>'
      : (bcs.length ? '<ul class="scn-ds">' + bcs.map(function (b) { return '<li>' + thoat(b.chuc_vu) + ': <b>' + thoat(b.ho_ten || tenHS(b.hoc_sinh_ma)) + '</b></li>'; }).join('') + '</ul>' : rong('Chưa ghi ban cán sự.'))));
    if (!D.hs.length) return h + rong('Lớp chưa có học sinh trong năm học này.');
    h += '<div class="scn-bang-boc"><table class="scn-bang"><thead><tr><th>TT</th><th>Họ và tên</th><th>Ngày sinh</th><th>Giới</th><th>Ghi chú</th></tr></thead><tbody>' +
      D.hs.map(function (hs, i) {
        var c = S.hoanCanh[hs.ma] || {}, chip = [];
        if (hs.khuyet_tat_hoa_nhap) chip.push('hòa nhập');
        (c.dien_chinh_sach || []).forEach(function (x) { chip.push(TEN_CS[x] || x); });
        if (c.can_quan_tam) chip.push('cần quan tâm');
        if (S.hoTro.some(function (x) { return x.hoc_sinh_ma === hs.ma && x.trang_thai === 'dang_theo_doi'; })) chip.push('đang hỗ trợ');
        var mo = D.hsMo === hs.ma;
        return '<tr class="' + (mo ? 'mo' : '') + '"><td>' + (i + 1) + '</td><td><button class="scn-lien" data-hs="' + thoat(hs.ma) + '">' + thoat(hs.ho_ten) + '</button></td>' +
          '<td>' + ngayVN(hs.ngay_sinh) + '</td><td>' + thoat(hs.gioi_tinh || '') + '</td><td>' + chip.map(function (x) { return '<span class="scn-chip">' + thoat(x) + '</span>'; }).join(' ') + '</td></tr>' +
          (mo ? '<tr class="scn-mo-rong"><td colspan="5">' + (nhayCam ? rong('Không đủ quyền xem hồ sơ hoàn cảnh (dữ liệu nhạy cảm — chỉ GVCN và Ban giám hiệu).') : veFormHoanCanh(hs, c, ghi)) + '</td></tr>' : '');
      }).join('') + '</tbody></table></div>';
    h += '<p class="scn-ghi-chu">Hồ sơ hoàn cảnh là dữ liệu cá nhân nhạy cảm (Luật Bảo vệ dữ liệu cá nhân 2025): chỉ GVCN lớp và Ban giám hiệu xem; không chia sẻ lên nhóm Zalo. Số định danh cá nhân không hiển thị ở đây.</p>';
    return h;
  }
  function oNgan(id, gt, nhan, k, them) {
    return '<label class="scn-nhan ngang">' + thoat(nhan) + ' <input id="' + id + '" class="scn-o" value="' + thoat(gt || '') + '"' + (them || '') + (k || '') + '></label>';
  }
  function dongBCS(b, i) {
    return '<div class="scn-hang scn-bcs-dong"><input class="scn-o" list="scn-ds-cv" data-bcs-cv value="' + thoat(b.chuc_vu || '') + '" placeholder="Chức vụ">' +
      oChonHS('bcs-hs-' + i, b.hoc_sinh_ma || '').replace('<select ', '<select data-bcs-hs ') +
      '<button class="scn-x" data-act="xoa-bcs" title="Bỏ dòng">×</button></div>' +
      (i === 0 ? '<datalist id="scn-ds-cv">' + CHUC_VU_MAC.concat(['Chi đội trưởng', 'Chi đội phó', 'Phụ trách sao']).map(function (c) { return '<option value="' + thoat(c) + '">'; }).join('') + '</datalist>' : '');
  }
  function veFormHoanCanh(hs, c, ghi) {
    var k = ghi ? '' : ' disabled';
    return '<div class="scn-form">' +
      '<p class="scn-ghi-chu">Các ô dưới đây in vào bảng "Thông tin về học sinh" của sổ (bản đầy đủ). Không có trong bản gửi tổ trưởng.</p>' +
      '<div class="scn-hang">' + oNgan('hc-cha-me-ten', c.cha_me_ten, 'Họ tên bố (mẹ) hoặc người giám hộ', k) + oNgan('hc-nghe', c.nghe_nghiep, 'Nghề nghiệp', k) +
      oNgan('hc-sdt', c.sdt, 'Số điện thoại', k, ' inputmode="tel"') + '</div>' +
      '<div class="scn-hang">' + oNgan('hc-dia-chi', c.dia_chi, 'Địa chỉ', k) + oNgan('hc-xom', c.xom, 'Xóm', k) +
      '<label class="scn-nhan ngang"><input type="checkbox" id="hc-ngoai-xa"' + (c.ngoai_xa ? ' checked' : '') + k + '> Ở ngoài xã</label></div>' +
      (c.cha_me ? '<p class="scn-ghi-chu">Ghi chú cũ về cha mẹ: ' + thoat(c.cha_me) + '</p>' : '') +
      '<label class="scn-nhan">Em đang ở với<input id="hc-o-voi" class="scn-o" value="' + thoat(c.o_voi || '') + '" placeholder="Bố mẹ / ông bà / người giám hộ…"' + k + '></label>' +
      oVan('hc-hoan-canh-gd', c.hoan_canh_gd, 'Hoàn cảnh gia đình', 2, !ghi) +
      oVan('hc-dac-diem', c.dac_diem, 'Đặc điểm cá nhân (khả năng vượt trội, hạn chế về học tập, năng lực, phẩm chất)', 2, !ghi) +
      '<div class="scn-nhan">Diện chính sách<div class="scn-o-chon">' + DIEN_CS.map(function (d) {
        return '<label><input type="checkbox" data-cs="' + d[0] + '"' + ((c.dien_chinh_sach || []).indexOf(d[0]) >= 0 ? ' checked' : '') + k + '> ' + thoat(d[1]) + '</label>';
      }).join('') + '</div></div>' +
      '<label class="scn-nhan">Giấy tờ xác nhận (số, ngày hết hạn)<input id="hc-giay" class="scn-o" value="' + thoat(c.giay_xac_nhan || '') + '"' + k + '></label>' +
      (hs.khuyet_tat_hoa_nhap || (c.dien_chinh_sach || []).indexOf('khuyet_tat') >= 0
        ? '<label class="scn-nhan">Khuyết tật: dạng, mức độ<input id="hc-kt" class="scn-o" value="' + thoat(c.kt_dang || '') + '"' + k + '></label>' +
          '<label class="scn-nhan ngang"><input type="checkbox" id="hc-kt-giay"' + (c.kt_co_giay ? ' checked' : '') + k + '> Đã có giấy xác nhận khuyết tật</label>' +
          '<p class="scn-ghi-chu">Kế hoạch giáo dục cá nhân lưu ở hồ sơ riêng — sổ chỉ ghi nhận, không chép lại.</p>' : '') +
      oVan('hc-suc-khoe', c.suc_khoe, 'Sức khỏe cần lưu ý (dị ứng, bệnh, thuốc dùng ở trường)', 2, !ghi) +
      '<div class="scn-o-chon"><label><input type="checkbox" id="hc-bhyt"' + (c.co_bhyt ? ' checked' : '') + k + '> Có bảo hiểm y tế</label>' +
      '<label><input type="checkbox" id="hc-sgk"' + (c.du_sgk ? ' checked' : '') + k + '> Đủ sách giáo khoa</label>' +
      '<label><input type="checkbox" id="hc-quan-tam"' + (c.can_quan_tam ? ' checked' : '') + k + '> <b>Cần quan tâm</b></label></div>' +
      '<label class="scn-nhan">Năng khiếu, sở thích<input id="hc-nang-khieu" class="scn-o" value="' + thoat(c.nang_khieu || '') + '"' + k + '></label>' +
      oVan('hc-ghi-chu', c.ghi_chu, 'Ghi chú', 2, !ghi) +
      (ghi ? '<div class="scn-hang"><button class="scn-nut" data-act="luu-hc" data-ma="' + thoat(hs.ma) + '">Lưu hồ sơ ' + thoat(hs.ho_ten) + '</button></div>' : '') + '</div>';
  }

  // ── Theo dõi hằng ngày ──
  function veTheoDoi() {
    if (!D.ngayTD) { D.ngayTD = homNay(); D.buoiTD = buoiMacDinh(); }
    var ngay = D.ngayTD, ghi = coGhi(ngay), S = D.so;
    var h = '<div class="scn-hang">' +
      '<button class="scn-nut phu nho" data-lui="-1" aria-label="Ngày trước">‹</button><input type="date" id="td-ngay" class="scn-o" value="' + ngay + '">' +
      '<button class="scn-nut phu nho" data-lui="1" aria-label="Ngày sau">›</button>' +
      (ngay !== homNay() ? '<button class="scn-nut phu nho" data-act="hom-nay">Hôm nay</button>' : '') + '</div>';
    // Chuyên cần
    var b = D.buoiTD, ddl = S.ddl.filter(function (d) { return d.ngay === ngay && d.buoi === b; })[0];
    var vang = {}; S.vang.forEach(function (v) { if (v.ngay === ngay && v.buoi === b) vang[v.hoc_sinh_ma] = v; });
    if (!D.ddTam || D.ddTam.khoa !== ngay + b) {
      D.ddTam = { khoa: ngay + b, tt: {}, ly: {} };
      Object.keys(vang).forEach(function (m) { D.ddTam.tt[m] = vang[m].phep; D.ddTam.ly[m] = vang[m].ghi_chu || ''; });
    }
    var tt = D.ddTam.tt, soV = Object.keys(tt).filter(function (m) { return tt[m]; }).length;
    h += the('Chuyên cần',
      '<div class="scn-chips">' + [['sang', 'Buổi sáng'], ['chieu', 'Buổi chiều']].map(function (x) { return '<button class="' + (b === x[0] ? 'on' : '') + '" data-buoi="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div>' +
      '<p class="scn-ghi-chu">' + (ddl ? 'Đã điểm danh buổi này: vắng ' + ddl.so_vang + '/' + ddl.si_so + '.' : 'Chưa điểm danh buổi này.') +
      ' Chỉ bấm em VẮNG — mặc định có mặt. <b>P</b> = có phép, <b>K</b> = không phép.</p>' +
      (D.loi.vang ? '' : '<div class="scn-dd">' + D.hs.map(function (hs) {
        var v = tt[hs.ma] || '';
        return '<div class="scn-dd-dong' + (v ? ' vang' : '') + '"><span>' + thoat(hs.ho_ten) + (v === 'chua_ro' ? ' <small>(chưa rõ phép)</small>' : '') + '</span>' +
          '<span class="scn-dd-nut">' + [['', 'Có mặt'], ['co_phep', 'P'], ['khong_phep', 'K']].map(function (x) {
            return '<button class="' + ((v || '') === x[0] || (x[0] === '' && !v) ? 'on' : '') + '" data-dd="' + thoat(hs.ma) + '" data-gt="' + x[0] + '"' + (ghi ? '' : ' disabled') + '>' + x[1] + '</button>';
          }).join('') + '</span>' +
          (v ? '<input class="scn-o scn-ly-do" data-ly="' + thoat(hs.ma) + '" value="' + thoat(D.ddTam.ly[hs.ma] || '') + '" placeholder="Lý do (ốm, việc gia đình…)"' + (ghi ? '' : ' disabled') + '>' : '') + '</div>';
      }).join('') + '</div>' +
      (ghi ? '<div class="scn-hang scn-dd-luu"><button class="scn-nut" data-act="luu-dd">' + (soV ? 'Lưu điểm danh · vắng ' + soV + '/' + D.hs.length : 'Lưu: cả lớp có mặt (' + D.hs.length + ')') + '</button></div>' : '')));
    // Ghi nhanh
    var n = Object.keys(D.chon).filter(function (m) { return D.chon[m]; }).length;
    if (ghi) {
      h += the('Ghi nhanh — nhận xét, khen, nhắc',
        '<p class="scn-ghi-chu">Chạm tên để chọn một hay nhiều em (mỗi em một dòng). Không chọn em nào = ghi chung cho cả lớp. Chỉ ghi khi có sự việc, không bắt nhận xét mọi em mỗi ngày.</p>' +
        '<div class="scn-chon-hs">' + D.hs.map(function (hs) { return '<button class="' + (D.chon[hs.ma] ? 'on' : '') + '" data-chon="' + thoat(hs.ma) + '">' + thoat(hs.ho_ten) + '</button>'; }).join('') + '</div>' +
        '<div class="scn-hang"><button class="scn-nut phu nho" data-act="chon-het">Chọn cả lớp</button><button class="scn-nut phu nho" data-act="bo-chon">Bỏ chọn</button><span class="scn-ghi-chu">Đã chọn ' + n + ' em</span></div>' +
        '<div class="scn-chips">' + LOAI_TD.map(function (x) { return '<button class="' + (D.loaiTD === x[0] ? 'on' : '') + '" data-loai="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div>' +
        '<div class="scn-hang">' + oChon('td-linh-vuc', [['', 'Lĩnh vực (không bắt buộc)']].concat(LINH_VUC), '') + '</div>' +
        ((GOI_Y[D.loaiTD] || []).length ? '<div class="scn-goi-y">' + GOI_Y[D.loaiTD].map(function (g) { return '<button data-goi-y="' + thoat(g) + '">' + thoat(g) + '</button>'; }).join('') + '</div>' : '') +
        (D.loaiTD === 'su_viec' ? '<p class="scn-ghi-chu">Sự việc (tai nạn, bắt nạt, bắt nạt trên mạng…): mô tả khách quan, ghi xử lý ban đầu và đã báo ai. Việc nghiêm trọng báo Ban giám hiệu NGAY, không chờ ghi sổ.</p>' : '') +
        '<textarea id="td-noi-dung" class="scn-o" rows="3" placeholder="Nội dung"></textarea>' +
        '<div class="scn-hang"><label class="scn-nhan ngang"><input type="checkbox" id="td-cmhs"> Đã trao đổi với cha mẹ</label>' +
        '<button class="scn-nut" data-act="luu-td">Ghi ' + (n ? 'cho ' + n + ' em' : 'chung cả lớp') + '</button></div>');
    }
    var trongNgay = S.theoDoi.filter(function (x) { return x.ngay === ngay; });
    var ganDay = S.theoDoi.filter(function (x) { return x.ngay < ngay; }).slice(0, 15);
    h += the('Đã ghi ngày ' + ngayVN(ngay), trongNgay.length ? dsTheoDoi(trongNgay, true) : rong('Chưa có dòng nào.'));
    if (ganDay.length) h += the('Các ngày trước (15 dòng gần nhất)', dsTheoDoi(ganDay, false));
    // Tổng hợp chuyên cần tháng
    var ym = ngay.slice(0, 7), cc = tongHopChuyenCan(S.vang, ym + '-01', ym + '-31');
    var ma = Object.keys(cc.theoHS);
    h += the('Chuyên cần ' + TEN_THANG(ym).toLowerCase(), ma.length
      ? '<div class="scn-bang-boc"><table class="scn-bang"><thead><tr><th>Học sinh</th><th>P</th><th>K</th><th>Chưa rõ</th><th>Tổng buổi</th></tr></thead><tbody>' +
        ma.sort(function (a, b) { return cc.theoHS[b].tong - cc.theoHS[a].tong; }).map(function (m) { var x = cc.theoHS[m]; return '<tr><td>' + thoat(tenHS(m)) + '</td><td>' + x.P + '</td><td>' + x.K + '</td><td>' + x.R + '</td><td><b>' + x.tong + '</b></td></tr>'; }).join('') +
        '</tbody></table></div>'
      : rong('Tháng này chưa có buổi vắng nào được ghi.'));
    return h;
  }
  function dsTheoDoi(ds, choXoa) {
    return '<ul class="scn-nk">' + ds.map(function (x) {
      return '<li><span class="scn-nk-loai l-' + x.loai + '">' + thoat(TEN_LOAI_TD[x.loai] || x.loai) + '</span>' +
        '<div><b>' + thoat(tenHS(x.hoc_sinh_ma)) + '</b>' + (x.linh_vuc ? ' · <small>' + thoat(x.linh_vuc) + '</small>' : '') + (choXoa ? '' : ' · <small>' + ngayVN(x.ngay) + '</small>') +
        '<br>' + thoat(x.noi_dung) + (x.da_bao_cmhs ? ' <small>(đã báo cha mẹ)</small>' : '') + '</div>' +
        (coGhi(x.ngay) ? '<button class="scn-x" data-xoa-td="' + x.id + '" title="Xoá dòng">×</button>' : '') + '</li>';
    }).join('') + '</ul>';
  }

  // ── Phụ huynh ──
  function vePhuHuynh() {
    var S = D.so, ghi = coGhi();
    var bdd = (S.lop && S.lop.ban_dai_dien) || [];
    var h = the('Ban đại diện cha mẹ học sinh lớp', ghi
      ? '<div id="scn-bdd">' + (bdd.length ? bdd : [{ vai_tro: 'Trưởng ban' }, { vai_tro: 'Phó trưởng ban' }]).map(function (b) {
          return '<div class="scn-hang scn-bdd-dong"><input class="scn-o" data-bdd-vt value="' + thoat(b.vai_tro || '') + '" placeholder="Vai trò">' +
            '<input class="scn-o" data-bdd-ten value="' + thoat(b.ho_ten || '') + '" placeholder="Họ tên">' +
            '<input class="scn-o" data-bdd-sdt value="' + thoat(b.sdt || '') + '" placeholder="Điện thoại" inputmode="tel">' +
            '<button class="scn-x" data-act="xoa-bdd" title="Bỏ dòng">×</button></div>';
        }).join('') + '</div><div class="scn-hang"><button class="scn-nut phu nho" data-act="them-bdd">+ Thêm người</button>' +
        '<label class="scn-nhan ngang">Điện thoại GVCN (in trên bìa sổ) <input id="bdd-gvcn-sdt" class="scn-o" inputmode="tel" value="' + thoat((S.lop && S.lop.gvcn_sdt) || (D.sdtCua || {})[chuanLop(D.lop)] || '') + '"></label>' +
        '<button class="scn-nut" data-act="luu-bdd">Lưu ban đại diện</button></div>' +
        '<p class="scn-ghi-chu">Trưởng ban (vai trò có chữ "Trưởng") và số điện thoại in trên bìa sổ bản đầy đủ; bản gửi tổ trưởng chỉ có họ tên.</p>'
      : (bdd.length ? '<ul class="scn-ds">' + bdd.map(function (b) { return '<li>' + thoat(b.vai_tro) + ': <b>' + thoat(b.ho_ten) + '</b></li>'; }).join('') + '</ul>' : rong('Chưa ghi.')));
    var hop = S.lienLac.filter(function (x) { return x.loai === 'hop'; }), td = S.lienLac.filter(function (x) { return x.loai !== 'hop'; });
    var dangSua = D.sua && D.sua.bang === 'scn_lien_lac' ? D.sua.dong : null;
    h += the('Họp cha mẹ học sinh', (hop.length ? '<ul class="scn-nk">' + hop.map(function (x) {
      return '<li><span class="scn-nk-loai">' + thoat(TEN_KY_HOP[x.ky_hop] || 'Họp') + '</span><div><b>' + ngayVN(x.ngay) + '</b>' +
        (x.tong_so ? ' · dự ' + (x.so_du || 0) + '/' + x.tong_so : '') + '<br>' + thoat(x.noi_dung || '') +
        (x.phan_hoi ? '<br><small>Ý kiến cha mẹ: ' + thoat(x.phan_hoi) + '</small>' : '') + (x.ket_luan ? '<br><small>Kết luận: ' + thoat(x.ket_luan) + '</small>' : '') + '</div>' +
        (coGhi(x.ngay) ? '<span><button class="scn-x" data-sua-ll="' + x.id + '" title="Sửa">✎</button><button class="scn-x" data-xoa-ll="' + x.id + '" title="Xoá">×</button></span>' : '') + '</li>';
    }).join('') + '</ul>' : rong('Chưa có biên bản họp. Kế hoạch: đầu năm (14-19/9), cuối học kỳ I (tháng 1), cuối năm (tháng 5).')) +
      (ghi ? veFormHop(dangSua && dangSua.loai === 'hop' ? dangSua : null) : ''));
    var nhayCam = anNhayCam() ? rong('Trao đổi riêng với cha mẹ là dữ liệu nhạy cảm — chỉ GVCN lớp và Ban giám hiệu xem.') : '';
    h += the('Trao đổi riêng, phản ánh', nhayCam || ((td.length ? '<ul class="scn-nk">' + td.map(function (x) {
      return '<li><span class="scn-nk-loai">' + (x.loai === 'phan_anh' ? 'Phản ánh' : 'Trao đổi') + '</span><div><b>' + thoat(tenHS(x.hoc_sinh_ma)) + '</b> · ' + ngayVN(x.ngay) + (x.kenh ? ' · ' + thoat(x.kenh) : '') +
        '<br>' + thoat(x.noi_dung || '') + (x.phan_hoi ? '<br><small>Phản hồi: ' + thoat(x.phan_hoi) + '</small>' : '') + (x.ket_luan ? '<br><small>Việc cần làm: ' + thoat(x.ket_luan) + '</small>' : '') +
        (x.trang_thai === 'dang_xu_ly' ? ' <span class="scn-chip">đang xử lý</span>' : x.trang_thai === 'chuyen_bgh' ? ' <span class="scn-chip">đã chuyển BGH</span>' : '') + '</div>' +
        (coGhi(x.ngay) ? '<span><button class="scn-x" data-sua-ll="' + x.id + '" title="Sửa">✎</button><button class="scn-x" data-xoa-ll="' + x.id + '" title="Xoá">×</button></span>' : '') + '</li>';
    }).join('') + '</ul>' : rong('Chưa có trao đổi nào.')) + (ghi ? veFormTraoDoi(dangSua && dangSua.loai !== 'hop' ? dangSua : null) : '')));
    h += '<p class="scn-ghi-chu">Kết quả, vi phạm của từng em trao đổi riêng với gia đình; nhóm lớp chỉ đưa thông tin chung, không đăng điểm, nhận xét, hình ảnh cá nhân khi chưa được phép.</p>';
    return h;
  }
  function veFormHop(x) {
    x = x || {};
    var ky = D.hopKy || x.ky_hop || 'dau_nam', khung = KHUNG_HOP[ky], muc = x.muc || {};
    return '<details class="scn-mo-them"' + (x.id || D.hopKy ? ' open' : '') + '><summary>' + (x.id ? 'Sửa kế hoạch, biên bản họp' : '+ Thêm kế hoạch, biên bản họp') + '</summary><div class="scn-form">' +
      '<p class="scn-ghi-chu">Ba cuộc họp theo khung sổ: đầu năm · cuối học kỳ I · cuối năm (mỗi mục một ô; bỏ trống thì bản Word in dòng chấm để viết tay).</p>' +
      '<div class="scn-hang">' + oChon('hop-ky', KY_HOP, ky) + '<input type="date" id="hop-ngay" class="scn-o" value="' + thoat(x.ngay || homNay()) + '">' +
      '<input id="hop-gio" class="scn-o" style="width:90px" placeholder="7 giờ" value="' + thoat(x.gio || '') + '">' +
      '<input id="hop-dia-diem" class="scn-o" placeholder="Địa điểm (phòng học lớp…)" value="' + thoat(x.dia_diem || '') + '">' +
      '<label class="scn-nhan ngang">Dự <input type="number" min="0" id="hop-du" class="scn-o so" value="' + thoat(x.so_du != null ? x.so_du : '') + '"></label>' +
      '<label class="scn-nhan ngang">/ <input type="number" min="0" id="hop-tong" class="scn-o so" value="' + thoat(x.tong_so != null ? x.tong_so : D.hs.length) + '"></label></div>' +
      (khung ? khung.muc.map(function (m) { return oVan('hop-m-' + m[0], muc[m[0]], m[1], 2); }).join('') : '') +
      oVan('hop-noi-dung', x.noi_dung, khung ? 'Nội dung khác, tóm tắt cuộc họp' : 'Nội dung họp', 3) + oVan('hop-y-kien', x.phan_hoi, 'Ý kiến cha mẹ học sinh (tóm tắt)', 2) + oVan('hop-ket-luan', x.ket_luan, 'Kết luận', 2) +
      '<div class="scn-hang"><button class="scn-nut" data-act="luu-hop"' + (x.id ? ' data-id="' + x.id + '"' : '') + '>Lưu biên bản</button>' + (x.id ? '<button class="scn-nut phu" data-act="huy-sua">Thôi</button>' : '') + '</div></div></details>';
  }
  function veFormTraoDoi(x) {
    x = x || {};
    return '<details class="scn-mo-them"' + (x.id ? ' open' : '') + '><summary>' + (x.id ? 'Sửa trao đổi' : '+ Ghi trao đổi / phản ánh') + '</summary><div class="scn-form">' +
      '<div class="scn-hang">' + oChon('tdph-loai', [['trao_doi', 'Trao đổi riêng'], ['phan_anh', 'Phản ánh, kiến nghị']], x.loai || 'trao_doi') +
      '<input type="date" id="tdph-ngay" class="scn-o" value="' + thoat(x.ngay || homNay()) + '">' + oChonHS('tdph-hs', x.hoc_sinh_ma, true) + '</div>' +
      '<div class="scn-hang">' + oChon('tdph-kenh', ['Gặp trực tiếp', 'Điện thoại', 'Tin nhắn', 'Phiếu liên lạc'], x.kenh || 'Gặp trực tiếp') +
      oChon('tdph-tt', [['xong', 'Đã xong'], ['dang_xu_ly', 'Đang xử lý'], ['chuyen_bgh', 'Chuyển Ban giám hiệu']], x.trang_thai || 'xong') + '</div>' +
      oVan('tdph-noi-dung', x.noi_dung, 'Nội dung (chuyên cần, học tập, sức khỏe, an toàn…)', 3) + oVan('tdph-phan-hoi', x.phan_hoi, 'Phản hồi của cha mẹ', 2) + oVan('tdph-viec', x.ket_luan, 'Việc cần làm', 2) +
      '<div class="scn-hang"><button class="scn-nut" data-act="luu-tdph"' + (x.id ? ' data-id="' + x.id + '"' : '') + '>Lưu</button>' + (x.id ? '<button class="scn-nut phu" data-act="huy-sua">Thôi</button>' : '') + '</div></div></details>';
  }

  // ── Hỗ trợ HS ──
  function veHoTro() {
    if (anNhayCam()) return rong('Danh sách học sinh cần hỗ trợ là dữ liệu nhạy cảm — chỉ GVCN lớp và Ban giám hiệu xem.');
    var S = D.so, ghi = coGhi(), h = '';
    // Gợi ý: cảnh báo chuyên cần · C / Cần cố gắng ở kỳ đánh giá mới nhất · cờ "cần quan tâm"
    var da = {}; S.hoTro.forEach(function (x) { if (x.trang_thai !== 'da_on') da[x.hoc_sinh_ma] = 1; });
    var goiY = {};
    canhBaoChuyenCan(S.vang.filter(function (v) { return v.ngay >= congNgay(homNay(), -30); })).forEach(function (c) { goiY[c.ma] = goiY[c.ma] || ['nguy_co_bo_hoc', 'Cảnh báo chuyên cần: ' + (c.loai === 'k_lien_tiep' ? c.so + ' buổi không phép liên tiếp' : c.so + ' ngày vắng liên tục')]; });
    var kyMoi = KY_DG.map(function (k) { return k[0]; }).filter(function (k) { return S.kq.some(function (x) { return x.ky === k; }); }).pop();
    if (kyMoi) S.kq.forEach(function (x) { if (x.ky === kyMoi && x.muc === 'C') goiY[x.hoc_sinh_ma] = goiY[x.hoc_sinh_ma] || ['hoc_tap', 'Chưa hoàn thành môn ' + ((MON.filter(function (m) { return m[0] === x.mon_ma; })[0] || [])[1] || x.mon_ma) + ' (' + TEN_KY_DG[kyMoi].toLowerCase() + ')']; });
    Object.keys(S.hoanCanh).forEach(function (m) { if (S.hoanCanh[m].can_quan_tam) goiY[m] = goiY[m] || ['hoan_canh', 'Hồ sơ hoàn cảnh đánh dấu cần quan tâm']; });
    var gy = Object.keys(goiY).filter(function (m) { return !da[m] && D.hs.some(function (x) { return x.ma === m; }); });
    if (gy.length && ghi) h += the('Gợi ý đưa vào danh sách', '<ul class="scn-nk">' + gy.map(function (m) {
      return '<li><span class="scn-nk-loai">Gợi ý</span><div><b>' + thoat(tenHS(m)) + '</b><br><small>' + thoat(goiY[m][1]) + '</small></div>' +
        '<button class="scn-nut phu nho" data-goi-y-ht="' + thoat(m) + '" data-loai-ht="' + goiY[m][0] + '" data-bh="' + thoat(goiY[m][1]) + '">Đưa vào</button></li>';
    }).join('') + '</ul>');
    var dangSua = D.sua && D.sua.bang === 'scn_ho_tro' ? D.sua.dong : null;
    TT_HT.forEach(function (t) {
      var ds = S.hoTro.filter(function (x) { return x.trang_thai === t[0]; });
      if (!ds.length && t[0] !== 'dang_theo_doi') return;
      h += the(t[1] + ' (' + ds.length + ')', ds.length ? '<ul class="scn-nk">' + ds.map(function (x) {
        return '<li><span class="scn-nk-loai">' + thoat((TEN_HT[x.loai] || x.loai).split(' (')[0]) + '</span><div><b>' + thoat(tenHS(x.hoc_sinh_ma)) + '</b> · từ ' + ngayVN(x.ngay) +
          (x.moc_xem_lai ? ' · xem lại ' + ngayVN(x.moc_xem_lai) + (x.moc_xem_lai <= homNay() && x.trang_thai === 'dang_theo_doi' ? ' <span class="scn-chip">đến hạn</span>' : '') : '') +
          (x.bieu_hien ? '<br>Biểu hiện: ' + thoat(x.bieu_hien) : '') + (x.mon_ky_nang ? '<br>Cần hỗ trợ: ' + thoat(x.mon_ky_nang) : '') +
          (x.bien_phap ? '<br>Biện pháp: ' + thoat(x.bien_phap) : '') + (x.nguoi_phoi_hop ? '<br><small>Phối hợp: ' + thoat(x.nguoi_phoi_hop) + '</small>' : '') +
          (x.hs_giup_do ? '<br><small>HS giúp đỡ: ' + thoat(tenHS(x.hs_giup_do)) + '</small>' : '') + (x.moc ? ' <span class="scn-chip">' + thoat(TEN_MOC_HT[x.moc]) + '</span>' : '') +
          (x.ket_qua ? '<br><small>Kết quả: ' + thoat(x.ket_qua) + '</small>' : '') + '</div>' +
          (coGhi(x.ngay) ? '<span><button class="scn-x" data-sua-ht="' + x.id + '" title="Sửa">✎</button><button class="scn-x" data-xoa-ht="' + x.id + '" title="Xoá">×</button></span>' : '') + '</li>';
      }).join('') + '</ul>' : rong('Chưa có em nào.'));
    });
    if (ghi) h += veFormHoTro(dangSua || (D.sua && D.sua.moi) || null);
    h += '<p class="scn-ghi-chu">Ghi điều quan sát được, không suy đoán bệnh lý. Phụ đạo không thu tiền. Việc nghiêm trọng (bạo lực, xâm hại, tự hại) báo Ban giám hiệu ngay.</p>';
    return h;
  }
  function veFormHoTro(x) {
    x = x || {};
    return '<details class="scn-mo-them" id="scn-form-ht"' + (x.id || x.hoc_sinh_ma ? ' open' : '') + '><summary>' + (x.id ? 'Sửa' : '+ Thêm học sinh cần hỗ trợ') + '</summary><div class="scn-form">' +
      '<div class="scn-hang">' + oChonHS('ht-hs', x.hoc_sinh_ma) + oChon('ht-loai', LOAI_HT, x.loai || 'hoc_tap') + '<input type="date" id="ht-ngay" class="scn-o" value="' + thoat(x.ngay || homNay()) + '"></div>' +
      '<div class="scn-hang"><label class="scn-nhan ngang">Mốc trong sổ ' + oChon('ht-moc', MOC_HT, x.id ? (x.moc || '') : (x.moc != null ? x.moc : mocGoiY(homNay()))) + '</label>' +
      '<label class="scn-nhan ngang">Phân công HS giúp đỡ ' + oChon('ht-giup', [['', '— Không —']].concat(D.hs.map(function (h) { return [h.ma, h.ho_ten]; })), x.hs_giup_do || '') + '</label></div>' +
      '<p class="scn-ghi-chu">Loại <b>khó khăn học tập</b> và <b>năng lực nổi trội</b> in vào các bảng "Mặt nổi trội" / "Mặt hạn chế cần giúp đỡ" của sổ và <b>có trong bản gửi tổ trưởng</b> (kèm tên học sinh) — chỉ ghi biểu hiện học tập, không ghi hoàn cảnh gia đình. Loại khác chỉ GVCN và Ban giám hiệu xem.</p>' +
      oVan('ht-bieu-hien', x.bieu_hien, 'Biểu hiện quan sát được (mặt nổi trội / mặt hạn chế cần giúp đỡ)', 2) +
      '<label class="scn-nhan">Môn / kỹ năng cần hỗ trợ<input id="ht-mon" class="scn-o" value="' + thoat(x.mon_ky_nang || '') + '" placeholder="Đọc, viết, tính toán…"></label>' +
      oVan('ht-bien-phap', x.bien_phap, 'Biện pháp (trong giờ, đôi bạn cùng tiến, phụ đạo buổi 2…)', 2) +
      '<label class="scn-nhan">Người phối hợp<input id="ht-phoi-hop" class="scn-o" value="' + thoat(x.nguoi_phoi_hop || '') + '" placeholder="Cha mẹ, GV bộ môn, Tổng phụ trách Đội, y tế…"></label>' +
      '<div class="scn-hang"><label class="scn-nhan ngang">Mốc xem lại <input type="date" id="ht-moc-xl" class="scn-o" value="' + thoat(x.moc_xem_lai || '') + '"></label>' + oChon('ht-tt', TT_HT, x.trang_thai || 'dang_theo_doi') + '</div>' +
      oVan('ht-ket-qua', x.ket_qua, 'Kết quả', 2) +
      '<div class="scn-hang"><button class="scn-nut" data-act="luu-ht"' + (x.id ? ' data-id="' + x.id + '"' : '') + '>Lưu</button>' + (x.id || x.hoc_sinh_ma ? '<button class="scn-nut phu" data-act="huy-sua">Thôi</button>' : '') + '</div></div></details>';
  }

  // Mốc gợi ý theo ngày ghi: tháng 9–10 đầu năm · tháng 12–01 cuối HK I · tháng 5 cuối năm
  function mocGoiY(iso) { var m = +String(iso).slice(5, 7); return m >= 9 && m <= 10 ? 'dau_nam' : (m === 12 || m === 1) ? 'hk1' : m === 5 ? 'cuoi_nam' : ''; }

  // ── Đánh giá (chỉ đọc) ──
  function veDanhGia() {
    var S = D.so;
    if (!D.kyDG) D.kyDG = KY_DG.map(function (k) { return k[0]; }).filter(function (k) { return S.kq.some(function (x) { return x.ky === k; }); }).pop() || 'giua_ki_1';
    var ky = D.kyDG, bo = hoaNhap(), soBo = Object.keys(bo).length;
    var h = '<div class="scn-chips">' + KY_DG.map(function (k) { return '<button class="' + (ky === k[0] ? 'on' : '') + '" data-ky-dg="' + k[0] + '">' + k[1] + '</button>'; }).join('') + '</div>' +
      '<p class="scn-ghi-chu">Chỉ đọc — kết quả nhập ở học bạ số / màn đánh giá, sổ không bắt nhập lại. Mẫu số = học sinh đã có mức' + (soBo ? ', không tính ' + soBo + ' em khuyết tật học hòa nhập (đánh giá theo kế hoạch giáo dục cá nhân)' : '') + '.</p>';
    var mon = demMuc(S.kq, ky, 'mon_ma', ['T', 'H', 'C'], bo), nl = demMuc(S.nlpc, ky, 'tieu_chi_ma', ['T', 'Đ', 'C'], bo);
    if (!Object.keys(mon).length && !Object.keys(nl).length) h += rong('Chưa có kết quả ' + TEN_KY_DG[ky].toLowerCase() + ' trên hệ thống.');
    else {
      function bang(ds, dem, muc, tenMuc) {
        var dong = ds.filter(function (x) { return dem[x[0]]; });
        if (!dong.length) return '';
        return '<div class="scn-bang-boc"><table class="scn-bang so"><thead><tr><th></th>' + tenMuc.map(function (t) { return '<th>' + t + '</th>'; }).join('') + '<th>Mẫu số</th></tr></thead><tbody>' +
          dong.map(function (x) { var d = dem[x[0]]; return '<tr><th>' + thoat(x[1]) + '</th>' + muc.map(function (m) { var p = phanTram(d[m], d.mau); return '<td>' + d[m] + (p != null ? ' <small>' + p + '%</small>' : '') + '</td>'; }).join('') + '<td>' + d.mau + '</td></tr>'; }).join('') +
          '</tbody></table></div>';
      }
      h += the('Môn học và hoạt động giáo dục', bang(MON, mon, ['T', 'H', 'C'], ['Hoàn thành tốt', 'Hoàn thành', 'Chưa hoàn thành']) || rong('Chưa có.'));
      h += the('Năng lực, phẩm chất', bang(NLPC, nl, ['T', 'Đ', 'C'], ['Tốt', 'Đạt', 'Cần cố gắng']) || rong('Chưa có.'));
      var can = {};
      S.kq.forEach(function (x) { if (x.ky === ky && x.muc === 'C') (can[x.hoc_sinh_ma] = can[x.hoc_sinh_ma] || []).push((MON.filter(function (m) { return m[0] === x.mon_ma; })[0] || [0, x.mon_ma])[1]); });
      S.nlpc.forEach(function (x) { if (x.ky === ky && x.muc === 'C') (can[x.hoc_sinh_ma] = can[x.hoc_sinh_ma] || []).push((NLPC.filter(function (m) { return m[0] === x.tieu_chi_ma; })[0] || [0, x.tieu_chi_ma])[1] + ' (cần cố gắng)'); });
      var ma = Object.keys(can);
      h += the('Học sinh chưa hoàn thành / cần cố gắng', ma.length ? '<ul class="scn-ds">' + ma.map(function (m) { return '<li><b>' + thoat(tenHS(m)) + '</b>: ' + thoat(can[m].join(', ')) + '</li>'; }).join('') + '</ul><p class="scn-ghi-chu">Xem thẻ Hỗ trợ HS để lập kế hoạch hỗ trợ.</p>' : rong('Không có.'));
    }
    if (ky === 'cuoi_nam') {
      var th = S.th, dem = { HT: 0, CHT: 0, RLTH: 0, XS: 0, TB: 0 };
      th.forEach(function (x) { if (dem[x.hoan_thanh_lop] != null) dem[x.hoan_thanh_lop]++; if (dem[x.khen_thuong] != null) dem[x.khen_thuong]++; });
      h += the('Tổng hợp cuối năm', th.length ? '<ul class="scn-ds"><li>Hoàn thành chương trình lớp học: <b>' + dem.HT + '</b></li><li>Chưa hoàn thành: <b>' + dem.CHT + '</b> · rèn luyện trong hè: <b>' + dem.RLTH + '</b></li>' +
        '<li>Khen thưởng: Học sinh Xuất sắc <b>' + dem.XS + '</b> · Học sinh Tiêu biểu hoàn thành tốt trong học tập và rèn luyện <b>' + dem.TB + '</b></li></ul>' : rong('Chưa có tổng hợp cuối năm.'));
    }
    return h;
  }

  // ── Tổng kết ──
  function soLieuKy(ky) {
    var k = khungNam(D.nam), S = D.so, y = namDau(D.nam);
    var tu = k ? k.batDau : y + '-09-01', den = ky === 'hk1' ? (k ? congNgay(ngayDauTuan(D.nam, k.tuanHK1), 6) : (y + 1) + '-01-15') : (k ? k.tongKet : (y + 1) + '-05-31');
    var cc = tongHopChuyenCan(S.vang, tu, den), buoi = S.ddl.filter(function (d) { return d.ngay >= tu && d.ngay <= den; }).length;
    var td = S.theoDoi.filter(function (x) { return x.ngay >= tu && x.ngay <= den; });
    var dem = function (l) { return td.filter(function (x) { return x.loai === l; }).length; };
    var kyDg = ky === 'hk1' ? 'cuoi_ki_1' : 'cuoi_nam';
    var mon = demMuc(S.kq, kyDg, 'mon_ma', ['T', 'H', 'C'], hoaNhap()), t = 0, hh = 0, c = 0;
    Object.keys(mon).forEach(function (m) { t += mon[m].T; hh += mon[m].H; c += mon[m].C; });
    return { tu: tu, den: den, cc: cc, buoi: buoi, tl: tiLeChuyenCan(cc.lop.tong, D.hs.length, buoi), khen: dem('khen'), nhac: dem('nhac'), tienBo: dem('tien_bo'), suViec: dem('su_viec'),
      hoTro: S.hoTro.length, daOn: S.hoTro.filter(function (x) { return x.trang_thai === 'da_on'; }).length,
      hop: S.lienLac.filter(function (x) { return x.loai === 'hop' && x.ngay >= tu && x.ngay <= den; }).length,
      dg: (t + hh + c) ? { T: t, H: hh, C: c, ky: kyDg } : null };
  }
  function veTongKet() {
    var ky = D.kyTK, sl = soLieuKy(ky), tk = D.so.tongKet[ky] || {}, k = khungNam(D.nam);
    var han = ky === 'hk1' ? (k ? k.soKetHK1 : '') : (k ? k.tongKet : '');
    var ngay = tk.ngay || homNay(), khoa = !coGhi(ngay);
    var h = '<div class="scn-chips"><button class="' + (ky === 'hk1' ? 'on' : '') + '" data-ky-tk="hk1">Sơ kết học kỳ I</button><button class="' + (ky === 'ca_nam' ? 'on' : '') + '" data-ky-tk="ca_nam">Tổng kết năm học</button></div>';
    h += the('Số liệu máy tự đếm (' + ngayVN(sl.tu) + ' → ' + ngayVN(sl.den) + ')', '<ul class="scn-ds">' +
      '<li>Sĩ số hiện tại: <b>' + D.hs.length + '</b> (' + D.hs.filter(function (x) { return x.gioi_tinh === 'Nữ'; }).length + ' nữ, ' + D.hs.filter(function (x) { return x.khuyet_tat_hoa_nhap; }).length + ' hòa nhập)</li>' +
      '<li>Chuyên cần: ' + sl.cc.lop.tong + ' lượt vắng (P ' + sl.cc.lop.P + ' · K ' + sl.cc.lop.K + (sl.cc.lop.R ? ' · chưa rõ ' + sl.cc.lop.R : '') + ') trên ' + sl.buoi + ' buổi đã điểm danh' + (sl.tl != null ? ' — tỉ lệ chuyên cần <b>' + sl.tl + '%</b>' : '') + '</li>' +
      '<li>Nhật ký theo dõi: khen ' + sl.khen + ' · tiến bộ ' + sl.tienBo + ' · nhắc ' + sl.nhac + ' · sự việc ' + sl.suViec + '</li>' +
      '<li>Học sinh cần hỗ trợ: ' + sl.hoTro + ' em, đã ổn ' + sl.daOn + '</li>' +
      '<li>Họp cha mẹ học sinh: ' + sl.hop + ' lần</li>' +
      '<li>Đánh giá ' + (sl.dg ? TEN_KY_DG[sl.dg.ky].toLowerCase() + ' (lượt môn): hoàn thành tốt ' + sl.dg.T + ' · hoàn thành ' + sl.dg.H + ' · chưa hoàn thành ' + sl.dg.C : (ky === 'hk1' ? 'cuối học kỳ I' : 'cuối năm') + ': chưa có dữ liệu') + '</li>' +
      '</ul>' + (han ? '<p class="scn-ghi-chu">Mốc: ' + (ky === 'hk1' ? 'sơ kết trước ' : 'tổng kết trước ') + ngayVN(han) + '.</p>' : ''));
    h += the('Giáo viên chủ nhiệm viết',
      '<label class="scn-nhan ngang">Ngày lập <input type="date" id="tk-ngay" class="scn-o" value="' + thoat(ngay) + '"' + (khoa ? ' disabled' : '') + '></label>' +
      oVan('tk-lam-duoc', tk.viec_lam_duoc, 'Những việc làm được', 4, khoa) + oVan('tk-ton-tai', tk.ton_tai, 'Tồn tại, hạn chế', 3, khoa) + oVan('tk-de-xuat', tk.de_xuat, 'Đề xuất', 2, khoa) +
      (ky === 'ca_nam' ? oVan('tk-ban-giao', tk.ban_giao, 'Bàn giao cho GVCN năm sau (HS cần tiếp tục hỗ trợ, HS nổi trội, lưu ý sức khỏe - hoàn cảnh)', 4, khoa) +
        '<label class="scn-nhan">Danh hiệu lớp (kết quả)<input id="tk-dh-lop" class="scn-o" value="' + thoat((tk.them || {}).danh_hieu_lop || '') + '"' + (khoa ? ' disabled' : '') + '></label>' +
        veKqCuocThi(tk, khoa) : '') +
      (khoa ? '' : '<div class="scn-hang"><button class="scn-nut" data-act="luu-tk">Lưu ' + (ky === 'hk1' ? 'sơ kết' : 'tổng kết') + '</button></div>'));
    return h;
  }

  function veKqCuocThi(tk, khoa) {
    var kn = keHoach('nam', ''), ds = ((kn && kn.noi_dung) || {}).cuoc_thi || [], kq = (tk.them || {}).cuoc_thi_kq || {};
    if (!ds.length) return '<p class="scn-ghi-chu">Kết quả cuộc thi, sân chơi: khai danh sách cuộc thi ở Kế hoạch năm (mục chỉ tiêu) thì nhập kết quả ở đây.</p>';
    return '<p class="scn-nhan">Kết quả cuộc thi, sân chơi (chỉ tiêu → đạt)</p>' + ds.map(function (c) {
      return '<div class="scn-hang"><span style="flex:1 1 200px">' + thoat(c.ten) + (c.chi_tieu ? ' <small>(chỉ tiêu ' + thoat(c.chi_tieu) + ')</small>' : '') + '</span>' +
        '<input class="scn-o so" data-kq-thi="' + thoat(c.ten) + '" value="' + thoat(kq[c.ten] || '') + '"' + (khoa ? ' disabled' : '') + '></div>';
    }).join('');
  }

  // ══════════ KIỂM TRA – DUYỆT (sql/71, sổ dự án 99) ══════════
  // GVCN: nộp kỳ · xem lịch sử, nhận xét. Tổ trưởng (bảng giao scn_nguoi_duyet):
  // danh sách lớp được giao, mở BẢN CHỤP ĐÃ LỌC, ghi Đã kiểm tra / Yêu cầu bổ sung
  // cho KỲ THÁNG. BGH: như tổ trưởng cho mọi lớp + duyệt hk1 / cả năm + đề nghị
  // khoá sổ + khai người kiểm tra theo tổ. Máy chủ kiểm quyền lần nữa (scn_duyet_ghi).
  function maNgan(bam) { return String(bam || '').slice(0, 8).toUpperCase(); }
  function gioVN(ts) {
    if (!ts) return '';
    var d = new Date(ts);
    if (isNaN(d.getTime())) return ngayVN(ts);
    return pad(d.getHours()) + ':' + pad(d.getMinutes()) + ' ' + pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear();
  }
  // NĐ 30: chỉ tháng 1, 2 thêm số 0
  function ngayChu(ts) {
    var d = typeof ts === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(ts) ? taoNgay(ts) : new Date(ts);
    if (isNaN(d.getTime())) return 'ngày …… tháng …… năm ……';
    var t = d.getMonth() + 1;
    return 'ngày ' + pad(d.getDate()) + ' tháng ' + (t < 3 ? pad(t) : t) + ' năm ' + d.getFullYear();
  }
  function chipTT(tt) { return '<span class="scn-chip">' + thoat(TEN_TT_NOP[tt] || tt || 'Chưa nộp') + '</span>'; }
  function laLopToi(lop) { return D.lopCuaToi.some(function (l) { return chuanLop(l) === chuanLop(lop); }); }
  function nopTheoId(id) { return D.dv.nop.filter(function (n) { return n.id === id; })[0] || null; }
  function thuTuKy(ky) { for (var i = 0; i < KY_NOP.length; i++) if (KY_NOP[i][0] === ky) return i; return 99; }
  function tenToCua(dsGiao) {
    var ra = [];
    (dsGiao || []).forEach(function (d) { var t = d.ten_to || ('Khối ' + (d.khoi || []).join(', ')); if (ra.indexOf(t) < 0) ra.push(t); });
    return ra.join('; ');
  }
  // Tổ chuyên môn của một khối (từ bảng giao, dòng không giới hạn điểm trường)
  function toCuaKhoi(khoi) {
    return tenToCua(D.dv.nguoiDuyet.filter(function (d) { return !d.co_so_ma && (d.khoi || []).map(Number).indexOf(+khoi) >= 0; }));
  }
  // Người đang xem được ghi gì lên lần nộp này (máy chủ kiểm lại)
  function quyenXN(n) {
    if (!n || n.trang_thai === 'thay_the') return [];
    var moiNhat = nopMoiNhat(D.dv.nop.filter(function (x) { return chuanLop(x.lop) === chuanLop(n.lop) && x.ky === n.ky; }))[0];
    if (!moiNhat || moiNhat.id !== n.id) return [];
    if (laLopToi(n.lop)) return [];
    var bgh = laBGH(), to = !bgh && trongPhamViTo(D.toCuaToi, n.khoi, n.co_so_ma);
    if (!bgh && !to) return [];
    if (laKyThang(n.ky)) return n.trang_thai === 'da_nop' ? [['da_kiem_tra', 'Đã kiểm tra'], ['yeu_cau_bo_sung', 'Yêu cầu bổ sung']] : [];
    if (!bgh) return [];
    return n.trang_thai === 'da_nop' || n.trang_thai === 'da_kiem_tra' ? [['da_duyet', 'Duyệt'], ['yeu_cau_bo_sung', 'Yêu cầu bổ sung']] : [];
  }
  function dsXacNhan(n) {
    var ds = D.dv.duyet.filter(function (x) { return x.nop_id === n.id; });
    if (!ds.length) return '';
    return '<ul class="scn-ds">' + ds.map(function (x) {
      return '<li><b>' + thoat(TEN_TT_NOP[x.ket_qua] || x.ket_qua) + '</b> — ' + thoat(x.ho_ten || '') + (x.chuc_vu ? ' (' + thoat(x.chuc_vu) + ')' : '') +
        ', ' + gioVN(x.luc) + (x.nhan_xet ? ': <i>' + thoat(x.nhan_xet) + '</i>' : '') + '</li>';
    }).join('') + '</ul>';
  }

  function baoLoiDuyet() {
    return D.dv.loi ? '<div class="hd-kiem ' + (thieuBang(D.dv.loi) ? 'vang' : 'do') + '">' + (thieuBang(D.dv.loi)
      ? 'Cơ sở dữ liệu của trường <b>chưa có phần nộp kiểm tra – ký duyệt</b> — người phụ trách hệ thống cần chạy <b>sql/71-so-chu-nhiem-duyet.sql</b>.'
      : 'Không đọc được dữ liệu kiểm tra: ' + thoat(D.dv.loi)) + '</div>' : '';
  }
  // Thẻ "Nộp sổ" trong sổ một lớp — chỉ GVCN lớp đó
  function veDuyet() {
    return baoLoiDuyet() + (D.lop && laGVCNLopNay() ? veNopCuaToi() : rong('Chỉ giáo viên chủ nhiệm lớp này nộp sổ.'));
  }
  // Màn "Kiểm tra sổ" (nhiều lớp) — tổ trưởng/tổ phó được giao + BGH
  function veKiemTra() {
    var h = baoLoiDuyet();
    if (laBGH() || D.laToKT) h += veDsKiemTra();
    if (laBGH()) h += veNguoiDuyet();
    return h === baoLoiDuyet() ? h + rong('Kiểm tra sổ chủ nhiệm dành cho <b>Ban giám hiệu</b> và <b>tổ trưởng, tổ phó được giao</b>. Thầy cô chưa được giao kiểm tra lớp nào trong năm học ' + thoat(D.nam) + '.') : h;
  }

  // ── GVCN: nộp kỳ + lịch sử ──
  function veNopCuaToi() {
    var ds = D.dv.nop.filter(function (n) { return chuanLop(n.lop) === chuanLop(D.lop); });
    if (!D.kyNop) D.kyNop = kyGoiY(homNay());
    var moi = nopMoiNhat(ds).filter(function (n) { return n.ky === D.kyNop; })[0];
    var xong = moi && (moi.trang_thai === 'da_kiem_tra' || moi.trang_thai === 'da_duyet');
    var nhan = !moi ? 'Nộp kỳ này' : moi.trang_thai === 'yeu_cau_bo_sung' ? 'Nộp lại (lần ' + (moi.lan + 1) + ')' : 'Nộp bản mới (thay lần ' + moi.lan + ')';
    var h = '<p class="scn-ghi-chu">Tổ chuyên môn <b>kiểm tra hằng tháng</b>; Ban giám hiệu <b>duyệt cuối học kỳ I và cuối năm</b>. Khi nộp, máy chủ tự chụp lại sổ và ' +
      '<b>lọc bỏ dữ liệu nhạy cảm</b> (hoàn cảnh gia đình, tâm lý, sự việc, trao đổi riêng với cha mẹ, số điện thoại, địa chỉ) — tổ trưởng chỉ đọc bản đã lọc này, ' +
      'kèm tên học sinh cần giúp đỡ, nổi trội về học tập. Nộp xong vẫn ghi sổ bình thường.</p>' +
      '<div class="scn-hang">' + oChon('dv-ky', KY_NOP, D.kyNop) +
      (xong ? chipTT(moi.trang_thai) : '<button class="scn-nut" data-act="nop-ky">' + nhan + '</button>') +
      (moi && !xong ? chipTT(moi.trang_thai) : '') + '</div>';
    var dsSap = ds.slice().sort(function (a, b) { return thuTuKy(a.ky) - thuTuKy(b.ky) || b.lan - a.lan; });
    h += dsSap.length ? '<div class="scn-bang-boc"><table class="scn-bang"><thead><tr><th>Kỳ</th><th>Lần</th><th>Nộp lúc</th><th>Trạng thái</th><th>Kiểm tra, nhận xét</th><th>Mã bản</th></tr></thead><tbody>' +
      dsSap.map(function (n) {
        return '<tr><td>' + thoat(TEN_KY_NOP[n.ky] || n.ky) + '</td><td>' + n.lan + '</td><td>' + gioVN(n.nop_luc) + '</td><td>' + chipTT(n.trang_thai) + '</td>' +
          '<td>' + (dsXacNhan(n) || '<span class="scn-ghi-chu">—</span>') + '</td><td><code>' + maNgan(n.ma_bam) + '</code></td></tr>';
      }).join('') + '</tbody></table></div>' : rong('Lớp chưa nộp kỳ nào.');
    return the('Nộp sổ để kiểm tra — lớp ' + thoat(D.lop), h);
  }

  // ── Tổ trưởng / BGH: danh sách lớp, mở bản chụp, xác nhận ──
  function veDsKiemTra() {
    var bgh = laBGH();
    var pham = bgh ? D.dsLop : D.dsLopKT;
    var trongPham = function (lop) { return bgh || pham.some(function (l) { return l && chuanLop(l.lop) === chuanLop(lop); }); };
    var ds = nopMoiNhat(D.dv.nop).filter(function (n) {
      if (!trongPham(n.lop)) return false;
      if (D.lopLoc && chuanLop(n.lop) !== chuanLop(D.lopLoc)) return false;
      if (D.locKy && n.ky !== D.locKy) return false;
      if (D.locTT === 'cho') return n.trang_thai === 'da_nop' || (!laKyThang(n.ky) && n.trang_thai === 'da_kiem_tra');
      return true;
    }).sort(function (a, b) { return thuTuKy(a.ky) - thuTuKy(b.ky) || chuanLop(a.lop).localeCompare(chuanLop(b.lop), 'vi', { numeric: true }); });
    var chuaNop = [];
    if (D.locKy) {
      var daNop = {};
      nopMoiNhat(D.dv.nop).forEach(function (n) { if (n.ky === D.locKy) daNop[chuanLop(n.lop)] = 1; });
      chuaNop = pham.filter(function (l) { return l && !daNop[chuanLop(l.lop)] && (!D.lopLoc || chuanLop(l.lop) === chuanLop(D.lopLoc)); });
    }
    var tieuDe = bgh ? 'Kiểm tra, duyệt sổ các lớp' : 'Lớp được giao kiểm tra — ' + thoat(tenToCua(D.toCuaToi));
    var h = '<p class="scn-ghi-chu">' + (bgh
      ? 'Ban giám hiệu xem mọi lớp: <b>kỳ tháng</b> ghi Đã kiểm tra / Yêu cầu bổ sung (thường do tổ trưởng làm); <b>cuối học kỳ I, cuối năm</b> ghi Duyệt / Yêu cầu bổ sung — không cần chờ tổ. Duyệt xong hệ thống đề nghị khoá sổ đến ngày cuối kỳ.'
      : 'Tổ trưởng chỉ đọc <b>bản chụp đã lọc</b> lúc giáo viên nộp (không có hoàn cảnh gia đình, tâm lý, sự việc, trao đổi riêng, số điện thoại) và chỉ ghi được <b>kỳ tháng</b>. Kỳ học kỳ I, cả năm do Ban giám hiệu duyệt. Không kiểm tra sổ lớp mình chủ nhiệm.') + '</p>' +
      '<div class="scn-hang">' + oChon('dv-loc-ky', [['', 'Mọi kỳ']].concat(KY_NOP), D.locKy) +
      oChon('dv-loc-tt', [['cho', 'Đang chờ xử lý'], ['tat_ca', 'Tất cả']], D.locTT) +
      (D.lopLoc ? '<button class="scn-nut phu nho" data-act="bo-loc-lop">Lớp ' + thoat(D.lopLoc) + ' ×</button>' : '') + '</div>';
    if (!pham.length && !bgh) h += rong('Chưa có lớp nào thuộc khối được giao trong năm học ' + thoat(D.nam) + '.');
    if (D.locKy && pham.length) {
      var soNop = pham.length - chuaNop.length;
      h += '<p class="scn-ghi-chu">' + thoat(TEN_KY_NOP[D.locKy]) + ': đã nộp <b>' + soNop + '/' + pham.length + '</b> lớp' + (chuaNop.length ? ' · chưa nộp: ' + chuaNop.map(function (l) { return thoat(l.lop); }).join(', ') : '') + '.</p>';
    }
    if (!ds.length) {
      h += rong(D.locTT === 'cho' ? 'Không có sổ nào đang chờ xử lý.' : 'Chưa có lần nộp nào.');
    } else {
      h += '<div class="scn-bang-boc"><table class="scn-bang"><thead><tr><th>Lớp</th><th>GVCN</th><th>Kỳ</th><th>Lần</th><th>Nộp lúc</th><th>Trạng thái</th><th></th></tr></thead><tbody>' +
        ds.map(function (n) {
          var mo = D.moNop === n.id;
          return '<tr class="' + (mo ? 'mo' : '') + '"><td><b>' + thoat(n.lop) + '</b></td><td>' + thoat(n.ho_ten_nop || D.gvcnCua[chuanLop(n.lop)] || '') + '</td>' +
            '<td>' + thoat(TEN_KY_NOP[n.ky] || n.ky) + '</td><td>' + n.lan + '</td><td>' + gioVN(n.nop_luc) + '</td><td>' + chipTT(n.trang_thai) + '</td>' +
            '<td><button class="scn-nut phu nho" data-mo-nop="' + n.id + '">' + (mo ? 'Đóng' : 'Mở') + '</button></td></tr>' +
            (mo ? '<tr class="scn-mo-rong"><td colspan="7">' + veMoNop(n) + '</td></tr>' : '');
        }).join('') + '</tbody></table></div>';
    }
    return the(tieuDe, h);
  }

  function veMoNop(n) {
    if (D.dangMo) return '<p class="scn-ghi-chu">Đang tải bản chụp…</p>';
    var bc = D.bcMo, h = '';
    if (bc) h += veTomBanChup(bc, n.ky);
    h += '<p class="scn-ghi-chu">Mã bản <code>' + maNgan(n.ma_bam) + '</code> (SHA-256 của bản chụp, máy chủ dựng lúc ' + gioVN(n.nop_luc) + ').</p>';
    var xn = dsXacNhan(n);
    if (xn) h += '<p class="scn-nhan">Đã xác nhận</p>' + xn;
    h += '<div class="scn-hang"><button class="scn-nut phu" data-act="xem-bc">Xem bản nộp tổ</button>' +
      (laBGH() && D.dsLop.some(function (l) { return chuanLop(l.lop) === chuanLop(n.lop); }) ? '<button class="scn-nut phu" data-act="mo-so" data-lop="' + thoat(n.lop) + '">Mở sổ đầy đủ lớp ' + thoat(n.lop) + '</button>' : '') + '</div>';
    var q = quyenXN(n);
    if (q.length) {
      h += oVan('dv-nx', '', 'Nhận xét' + (q.some(function (x) { return x[0] === 'yeu_cau_bo_sung'; }) ? ' (bắt buộc khi yêu cầu bổ sung)' : ''), 3) +
        '<div class="scn-hang">' + q.map(function (x) { return '<button class="scn-nut' + (x[0] === 'yeu_cau_bo_sung' ? ' phu' : '') + '" data-kq="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div>' +
        '<p class="scn-ghi-chu">Xác nhận điện tử: hệ thống lưu họ tên, chức vụ, thời điểm, nhận xét và mã bản — không sửa, không xoá được.</p>';
    } else if (laLopToi(n.lop)) {
      h += '<p class="scn-ghi-chu">Đây là lớp thầy cô chủ nhiệm — không tự kiểm tra, duyệt sổ lớp mình.</p>';
    } else if (!laKyThang(n.ky) && !laBGH() && n.trang_thai !== 'da_duyet') {
      h += '<p class="scn-ghi-chu">Kỳ cuối học kỳ I / cuối năm do Ban giám hiệu duyệt — tổ chuyên môn chỉ xem.</p>';
    }
    return h;
  }

  // Tóm tắt bản chụp trên màn (bản đầy đủ: nút "Xem bản nộp tổ" → khung xem trước)
  function veTomBanChup(bc, ky) {
    var ss = bc.si_so || {}, h = '<dl class="scn-dl">';
    h += '<dt>Lớp</dt><dd>' + thoat(bc.lop) + (bc.co_so_ten ? ' · ' + thoat(bc.co_so_ten) : '') + ' · GVCN ' + thoat(bc.gvcn || '') + ' · sĩ số ' + (ss.tong || 0) + ' (nữ ' + (ss.nu || 0) + ', hòa nhập ' + (ss.hoa_nhap || 0) + ')</dd>';
    var kn = (bc.ke_hoach || []).filter(function (k) { return k.cap === 'nam'; })[0];
    h += '<dt>Kế hoạch năm</dt><dd>' + (kn ? 'Đã có (ghi ' + ngayVN(kn.ngay) + ')' : '<i>Chưa có</i>') + '</dd>';
    if (laKyThang(ky)) {
      var m = +ky.replace('thang-', ''), y = namDau(bc.nam_hoc) + (m >= 9 ? 0 : 1), ym = y + '-' + pad(m);
      var kt = (bc.ke_hoach || []).filter(function (k) { return k.cap === 'thang' && k.ky === ym; })[0], nd = (kt && kt.noi_dung) || {};
      h += '<dt>Kế hoạch ' + thoat(TEN_THANG(ym).toLowerCase()) + '</dt><dd>' + (kt
        ? ['1. Dạy học: ' + (nd.day_hoc || nd.hoat_dong || '…'), '2. Đội: ' + (nd.doi || '…'), '3. Khác: ' + (nd.khac || nd.trong_tam || '…'), 'Kết quả: ' + (kt.ket_qua || '…')].map(thoat).join('<br>')
        : '<i>Chưa ghi</i>') + '</dd>';
      var td = (bc.theo_doi || []).filter(function (t) { return String(t.ngay).slice(0, 7) === ym; });
      var dem = {}; td.forEach(function (t) { dem[t.loai] = (dem[t.loai] || 0) + 1; });
      h += '<dt>Nhật ký tháng</dt><dd>' + (td.length ? Object.keys(dem).map(function (l) { return thoat(TEN_LOAI_TD[l] || l) + ' ' + dem[l]; }).join(' · ') : '<i>Chưa có dòng nào</i>') + '</dd>';
      var cc = ((bc.chuyen_can || {}).thang || []).filter(function (x) { return x.thang === ym; })[0];
      h += '<dt>Chuyên cần</dt><dd>' + (cc ? (cc.P + cc.K + cc.R) + ' lượt vắng (P ' + cc.P + ' · K ' + cc.K + ') / ' + cc.buoi + ' buổi đã điểm danh' : '<i>Chưa điểm danh</i>') + '</dd>';
    } else {
      var tk = (bc.tong_ket || []).filter(function (t) { return t.ky === (ky === 'hk1' ? 'hk1' : 'ca_nam'); })[0];
      h += '<dt>' + (ky === 'hk1' ? 'Sơ kết học kỳ I' : 'Tổng kết năm') + '</dt><dd>' + (tk ? thoat(tk.viec_lam_duoc || '') + (tk.ton_tai ? '<br><small>Tồn tại: ' + thoat(tk.ton_tai) + '</small>' : '') : '<i>Chưa viết</i>') + '</dd>';
    }
    var ht = (bc.ho_tro || []).filter(function (x) { return x.loai === 'hoc_tap' && x.trang_thai !== 'da_on'; });
    var nt = (bc.ho_tro || []).filter(function (x) { return x.loai === 'noi_troi'; });
    h += '<dt>Cần giúp đỡ học tập</dt><dd>' + (ht.length ? ht.map(function (x) { return '<b>' + thoat(x.ho_ten) + '</b>' + (x.mon_ky_nang ? ' (' + thoat(x.mon_ky_nang) + ')' : '') + (x.hs_giup_do ? ' — bạn giúp: ' + thoat(x.hs_giup_do) : ''); }).join('; ') : '<i>Không có</i>') + '</dd>';
    h += '<dt>Nổi trội</dt><dd>' + (nt.length ? nt.map(function (x) { return thoat(x.ho_ten); }).join(', ') : '<i>Chưa ghi</i>') + '</dd>';
    h += '<dt>Họp cha mẹ</dt><dd>' + (bc.hop_cmhs || []).length + ' lần · trao đổi riêng: ' + (bc.trao_doi_so || 0) + ' (chỉ số lượng)</dd>';
    return h + '</dl>';
  }

  // ── BGH: người kiểm tra theo tổ ──
  function veNguoiDuyet() {
    var ds = D.dv.nguoiDuyet.slice().sort(function (a, b) { return String(a.ten_to).localeCompare(String(b.ten_to), 'vi', { numeric: true }) || String(b.chuc_vu).localeCompare(String(a.chuc_vu), 'vi'); });
    var tenCs = {}; D.coSo.forEach(function (c) { tenCs[c.ma] = c.ten; });
    var h = '<p class="scn-ghi-chu">Tổ trưởng (hoặc tổ phó được giao theo điểm trường) kiểm tra sổ của các lớp thuộc <b>khối</b> ghi ở đây — không dựa vai trò tài khoản. Gmail là Gmail đăng nhập; người chưa đăng nhập lần nào vẫn khai trước được. Để trống điểm trường = mọi điểm trường.</p>' +
      (ds.length ? '<div class="scn-bang-boc"><table class="scn-bang"><thead><tr><th>Tổ</th><th>Họ tên</th><th>Chức vụ</th><th>Gmail</th><th>Khối</th><th>Điểm trường</th><th></th></tr></thead><tbody>' +
        ds.map(function (d) {
          return '<tr><td>' + thoat(d.ten_to || '') + '</td><td>' + thoat(d.ho_ten || '') + '</td><td>' + thoat(d.chuc_vu || '') + '</td><td>' + thoat(d.email) + '</td>' +
            '<td>' + thoat((d.khoi || []).join(', ')) + '</td><td>' + thoat(d.co_so_ma ? (tenCs[d.co_so_ma] || d.co_so_ma) : 'Mọi điểm') + '</td>' +
            '<td><button class="scn-x" data-nd-xoa="' + d.id + '" title="Bỏ">×</button></td></tr>';
        }).join('') + '</tbody></table></div>' : rong('Chưa khai người kiểm tra nào — tổ trưởng chưa thấy sổ lớp nào.'));
    h += '<details class="scn-mo-them"><summary>+ Thêm người kiểm tra</summary><div class="scn-form">' +
      '<div class="scn-hang"><input id="nd-to" class="scn-o" placeholder="Tổ (vd: Tổ 2, 3)"><input id="nd-ten" class="scn-o" placeholder="Họ và tên">' +
      oChon('nd-cv', ['Tổ trưởng', 'Tổ phó'], 'Tổ trưởng') + '</div>' +
      '<div class="scn-hang"><input id="nd-email" class="scn-o" type="email" placeholder="Gmail đăng nhập" style="flex:1 1 220px">' +
      (D.coSo.length > 1 ? oChon('nd-cs', [['', 'Mọi điểm trường']].concat(D.coSo.map(function (c) { return [c.ma, c.ten]; })), '') : '') + '</div>' +
      '<div class="scn-o-chon">Khối: ' + [1, 2, 3, 4, 5].map(function (k) { return '<label><input type="checkbox" data-nd-khoi="' + k + '"> ' + k + '</label>'; }).join('') + '</div>' +
      '<div class="scn-hang"><button class="scn-nut" data-act="nd-them">Thêm</button></div></div></details>';
    return the('Người kiểm tra theo tổ (Ban giám hiệu khai)', h);
  }

  // ── Hành động ──
  function nopKy(nut) {
    var ky = D.kyNop;
    var hoi = 'Nộp sổ lớp ' + D.lop + ' — ' + (TEN_KY_NOP[ky] || ky) + '? Máy chủ chụp lại sổ tại thời điểm này, lọc bỏ dữ liệu nhạy cảm rồi gửi ' + (laKyThang(ky) ? 'tổ chuyên môn' : 'Ban giám hiệu') + '.';
    var xn = window.hopHoi ? window.hopHoi(hoi, { tieuDe: 'Nộp sổ chủ nhiệm', nutOK: 'Nộp' }) : Promise.resolve(window.confirm(hoi));
    xn.then(function (ok) {
      if (!ok) return;
      if (!may()) {
        return xemThu(function () {
          var cu = nopMoiNhat(D.dv.nop.filter(function (n) { return n.lop === D.lop && n.ky === ky; }))[0];
          if (cu && cu.trang_thai === 'da_nop') cu.trang_thai = 'thay_the';
          D.dv.nop.push({ id: -Date.now(), nam_hoc: D.nam, lop: D.lop, ky: ky, lan: (cu ? cu.lan : 0) + 1, trang_thai: 'da_nop', khoi: D.khoi, co_so_ma: null,
            ma_bam: ('xemthu' + Date.now().toString(16) + '0000000000').slice(0, 16), nop_luc: new Date().toISOString(), ho_ten_nop: D.gvcnTen, _bc: locBanChup(dungMoHinh()) });
        });
      }
      ghiMay(may().rpc('scn_nop', { p_nam: D.nam, p_lop: D.lop, p_ky: ky }), nut, function (r) {
        bao('Đã nộp ' + (TEN_KY_NOP[ky] || ky) + ' (lần ' + (r && r.lan) + ') · mã bản ' + maNgan(r && r.ma_bam) + '.');
        napDuyet().then(function () { ve(); });
      });
    });
  }
  function moNop(id) {
    if (D.moNop === id) { D.moNop = null; D.bcMo = null; ve(); return; }
    var n = nopTheoId(id);
    D.moNop = id; D.bcMo = null;
    if (!n) return;
    if (!may()) {
      D.bcMo = n._bc || (function () { var b = locBanChup(dungMoHinh()); b.lop = n.lop; b.gvcn = D.gvcnCua[chuanLop(n.lop)] || b.gvcn; return b; })();
      ve(); return;
    }
    D.dangMo = true; ve();
    may().from('scn_nop').select('ban_chup').eq('id', id).maybeSingle().then(function (r) {
      D.dangMo = false;
      if (D.moNop !== id) return;
      if (r.error || !r.data) { bao('Không mở được bản chụp: ' + loiChu(r.error || 'không đủ quyền')); D.moNop = null; }
      else D.bcMo = r.data.ban_chup;
      ve();
    }, function (e) { D.dangMo = false; bao('Không mở được bản chụp: ' + loiChu(e)); ve(); });
  }
  function xacNhan(kq, nut) {
    var n = nopTheoId(D.moNop);
    if (!n) return;
    var nx = giaTri('dv-nx');
    if (kq === 'yeu_cau_bo_sung' && !nx) { bao('Ghi rõ nội dung cần bổ sung vào ô Nhận xét.'); return; }
    var hoi = 'Xác nhận điện tử "' + (TEN_TT_NOP[kq] || kq) + '" cho sổ lớp ' + n.lop + ' — ' + (TEN_KY_NOP[n.ky] || n.ky) + ' (lần ' + n.lan + ')? Hệ thống lưu họ tên, chức vụ, thời điểm và mã bản ' + maNgan(n.ma_bam) + '; không sửa, không xoá được.';
    var xn = window.hopHoi ? window.hopHoi(hoi, { tieuDe: 'Xác nhận kiểm tra sổ', nutOK: 'Xác nhận' }) : Promise.resolve(window.confirm(hoi));
    xn.then(function (ok) {
      if (!ok) return;
      var deNghi = kq === 'da_duyet' && !laKyThang(n.ky);
      if (!may()) {
        xemThu(function () {
          n.trang_thai = kq;
          D.dv.duyet.push({ id: -Date.now(), nop_id: n.id, nam_hoc: n.nam_hoc, lop: n.lop, ky: n.ky, lan: n.lan, ho_ten: 'Người xem thử', chuc_vu: laBGH() ? 'Ban giám hiệu' : 'Tổ trưởng',
            vai: laBGH() ? 'bgh' : 'to_truong', ket_qua: kq, nhan_xet: nx || null, ma_bam: n.ma_bam, luc: new Date().toISOString() });
        });
        if (deNghi) deNghiKhoa(n);
        return;
      }
      ghiMay(may().rpc('scn_duyet_ghi', { p_nop_id: n.id, p_ket_qua: kq, p_nhan_xet: nx || null, p_ma_bam: n.ma_bam }), nut, function (r) {
        bao('Đã ghi xác nhận: ' + (TEN_TT_NOP[kq] || kq) + ' — lớp ' + n.lop + '.');
        napDuyet().then(function () { ve(); if (r && r.de_nghi_khoa) deNghiKhoa(n); });
      });
    });
  }
  // BGH duyệt xong kỳ học kỳ → ĐỀ NGHỊ khoá sổ, bấm xác nhận mới khoá
  function deNghiKhoa(n) {
    var ngay = cuoiKy(D.nam, n.ky);
    if (!ngay) return;
    var hoi = 'Đã duyệt sổ lớp ' + n.lop + ' (' + (TEN_KY_NOP[n.ky] || n.ky) + '). Khoá sổ đến hết ngày ' + ngayVN(ngay) + '? Khoá rồi giáo viên không sửa được các mục có ngày từ đó trở về trước; mở lại ở thẻ Tổng quan của sổ lớp đó.';
    var xn = window.hopHoi ? window.hopHoi(hoi, { tieuDe: 'Đề nghị khoá sổ', nutOK: 'Khoá sổ', nutHuy: 'Để sau' }) : Promise.resolve(window.confirm(hoi));
    xn.then(function (ok) { if (ok) khoaLop(n.lop, ngay); });
  }
  function khoaLop(lop, ngay) {
    var capNhat = function (d) { if (chuanLop(lop) === chuanLop(D.lop) && D.so) D.so.lop = Object.assign({}, D.so.lop || {}, d || { khoa_den: ngay }); };
    if (!may()) return xemThu(function () { capNhat(); });
    ghiMay(may().from('scn_lop').upsert({ nam_hoc: D.nam, lop: lop, khoa_den: ngay }, { onConflict: 'nam_hoc,lop' }).select().maybeSingle(), null, function (d) {
      capNhat(d); bao('Đã khoá sổ lớp ' + lop + ' đến ' + ngayVN(ngay) + '.'); ve();
    });
  }
  function ndThem(nut) {
    var em = giaTri('nd-email').toLowerCase(), khoi = Array.prototype.slice.call(EL.querySelectorAll('[data-nd-khoi]')).filter(function (i) { return i.checked; }).map(function (i) { return +i.getAttribute('data-nd-khoi'); });
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) { bao('Gmail chưa đúng.'); return; }
    if (!khoi.length) { bao('Chọn ít nhất một khối.'); return; }
    var dong = { nam_hoc: D.nam, email: em, ho_ten: giaTri('nd-ten') || null, chuc_vu: giaTri('nd-cv') || null, ten_to: giaTri('nd-to'), khoi: khoi, co_so_ma: giaTri('nd-cs') || null };
    if (!may()) return xemThu(function () { D.dv.nguoiDuyet.push(Object.assign({ id: -Date.now() }, dong)); });
    ghiMay(may().from('scn_nguoi_duyet').insert(dong).select().maybeSingle(), nut, function (d) {
      D.dv.nguoiDuyet.push(d || dong); bao('Đã thêm người kiểm tra ' + (dong.ho_ten || em) + '.'); ve();
    });
  }
  function ndXoa(id) {
    var xn = window.hopHoi ? window.hopHoi('Bỏ người này khỏi danh sách kiểm tra sổ? Các xác nhận đã ghi vẫn giữ nguyên.', { tieuDe: 'Người kiểm tra', nutOK: 'Bỏ', nguyHiem: true }) : Promise.resolve(window.confirm('Bỏ?'));
    xn.then(function (ok) {
      if (!ok) return;
      var bo = function () { D.dv.nguoiDuyet = D.dv.nguoiDuyet.filter(function (x) { return x.id !== id; }); };
      if (!may()) return xemThu(bo);
      ghiMay(may().from('scn_nguoi_duyet').delete().eq('id', id).select('id'), null, function (d) {
        if (!d || !d.length) { bao('Không bỏ được — chỉ Ban giám hiệu, Quản trị.'); return; }
        bo(); bao('Đã bỏ.'); ve();
      });
    });
  }

  // ══════════ MÔ HÌNH SỔ ĐẦY ĐỦ (cùng hình dạng bản chụp của sql/71, thêm phần nhạy cảm) ══════════
  function dungMoHinh() {
    var S = D.so || soTrong(), hs = D.hs || [], bo = hoaNhap();
    var ten = {}; hs.forEach(function (h) { ten[h.ma] = h.ho_ten; });
    var tenHs = function (ma) { return ma ? (ten[ma] || '(' + ma + ')') : 'Cả lớp'; };
    var hcSo = { ho_ngheo: 0, can_ngheo: 0, mo_coi: 0, khuyet_tat: 0, dtts: 0, nguoi_co_cong: 0, khac: 0, chinh_sach: 0, can_quan_tam: 0, ngoai_xa: 0 };
    Object.keys(S.hoanCanh).forEach(function (ma) {
      if (!ten[ma]) return;
      var c = S.hoanCanh[ma], ds = c.dien_chinh_sach || [];
      ds.forEach(function (d) { hcSo[d] = (hcSo[d] || 0) + 1; });
      if (ds.length) hcSo.chinh_sach++;
      if (c.can_quan_tam) hcSo.can_quan_tam++;
      if (c.ngoai_xa) hcSo.ngoai_xa++;
    });
    var thang = {};
    S.vang.forEach(function (v) {
      var t = String(v.ngay).slice(0, 7), o = thang[t] = thang[t] || { thang: t, P: 0, K: 0, R: 0, buoi: 0 };
      o[v.phep === 'co_phep' ? 'P' : v.phep === 'khong_phep' ? 'K' : 'R']++;
    });
    S.ddl.forEach(function (d) { var t = String(d.ngay).slice(0, 7); (thang[t] = thang[t] || { thang: t, P: 0, K: 0, R: 0, buoi: 0 }).buoi++; });
    var cc = tongHopChuyenCan(S.vang);
    var dg = { mon: [], nlpc: [], cuoi_nam: { HT: 0, CHT: 0, RLTH: 0, XS: 0, TB: 0, co: S.th.length }, khen: [] };
    KY_DG.forEach(function (k) {
      var m = demMuc(S.kq, k[0], 'mon_ma', ['T', 'H', 'C'], bo);
      Object.keys(m).forEach(function (ma) { dg.mon.push({ ky: k[0], ma: ma, T: m[ma].T, H: m[ma].H, C: m[ma].C, mau: m[ma].mau }); });
      var n = demMuc(S.nlpc, k[0], 'tieu_chi_ma', ['T', 'Đ', 'C'], bo);
      Object.keys(n).forEach(function (ma) { dg.nlpc.push({ ky: k[0], ma: ma, T: n[ma].T, 'Đ': n[ma]['Đ'], C: n[ma].C, mau: n[ma].mau }); });
    });
    S.th.forEach(function (x) {
      if (dg.cuoi_nam[x.hoan_thanh_lop] != null) dg.cuoi_nam[x.hoan_thanh_lop]++;
      if (dg.cuoi_nam[x.khen_thuong] != null) { dg.cuoi_nam[x.khen_thuong]++; dg.khen.push({ ho_ten: tenHs(x.hoc_sinh_ma), khen: x.khen_thuong }); }
    });
    var tdAsc = S.theoDoi.slice().sort(function (a, b) { return a.ngay < b.ngay ? -1 : a.ngay > b.ngay ? 1 : (a.id || 0) - (b.id || 0); });
    return {
      phien_ban: 1, muc_do: 'day_du', nam_hoc: D.nam, lop: D.lop, khoi: D.khoi, co_so_ten: D.coSoTen, gvcn: D.gvcnTen,
      gvcn_sdt: (S.lop && S.lop.gvcn_sdt) || (D.sdtCua || {})[chuanLop(D.lop)] || '', to_chuyen_mon: toCuaKhoi(D.khoi), lap_luc: new Date().toISOString(), khoa_den: khoaDen() || null,
      si_so: { tong: hs.length, nu: hs.filter(function (h) { return h.gioi_tinh === 'Nữ'; }).length, nam: hs.filter(function (h) { return h.gioi_tinh === 'Nam'; }).length,
        hoa_nhap: hs.filter(function (h) { return h.khuyet_tat_hoa_nhap; }).length, dtts: hs.filter(function (h) { return h.dan_toc && !/^kinh$/i.test(String(h.dan_toc).trim()); }).length },
      hoc_sinh: hs.map(function (h) {
        var c = S.hoanCanh[h.ma] || {};
        return { ma: h.ma, ho_ten: h.ho_ten, ngay_sinh: h.ngay_sinh, gioi_tinh: h.gioi_tinh, dan_toc: h.dan_toc, hoa_nhap: !!h.khuyet_tat_hoa_nhap,
          cha_me_ten: c.cha_me_ten || c.cha_me || '', nghe_nghiep: c.nghe_nghiep || '', sdt: c.sdt || '', dia_chi: c.dia_chi || '',
          xom: c.xom || '', hoan_canh_gd: c.hoan_canh_gd || '', dac_diem: c.dac_diem || '' };
      }),
      giao_vien: [],
      ban_can_su: ((S.lop && S.lop.ban_can_su) || []).map(function (b) { return { chuc_vu: b.chuc_vu, ho_ten: b.ho_ten || tenHs(b.hoc_sinh_ma) }; }),
      ngay_bau: (S.lop && S.lop.ngay_bau) || null,
      ban_dai_dien: (S.lop && S.lop.ban_dai_dien) || [],
      hoan_canh_so: hcSo,
      hoan_canh: hs.filter(function (h) { return S.hoanCanh[h.ma]; }).map(function (h) {
        var c = S.hoanCanh[h.ma];
        return { ho_ten: h.ho_ten, dien: c.dien_chinh_sach || [], o_voi: c.o_voi || '', suc_khoe: c.suc_khoe || '', giay_xac_nhan: c.giay_xac_nhan || '', kt_dang: c.kt_dang || '', can_quan_tam: !!c.can_quan_tam };
      }),
      ke_hoach: S.keHoach.map(function (k) { return { cap: k.cap, ky: k.ky, ngay: k.ngay, noi_dung: k.noi_dung || {}, ket_qua: k.ket_qua || null }; }),
      chuyen_can: { thang: Object.keys(thang).sort().map(function (t) { return thang[t]; }),
        hoc_sinh: Object.keys(cc.theoHS).map(function (ma) { var x = cc.theoHS[ma]; return { ho_ten: tenHs(ma), P: x.P, K: x.K, R: x.R, tong: x.tong }; }).sort(function (a, b) { return b.tong - a.tong; }) },
      theo_doi: tdAsc.map(function (t) { return { ngay: t.ngay, hoc_sinh: tenHs(t.hoc_sinh_ma), loai: t.loai, linh_vuc: t.linh_vuc || null, noi_dung: t.noi_dung, da_bao_cmhs: !!t.da_bao_cmhs }; }),
      su_viec_so: S.theoDoi.filter(function (t) { return t.loai === 'su_viec'; }).length,
      ho_tro: S.hoTro.map(function (x) {
        return { ho_ten: tenHs(x.hoc_sinh_ma), loai: x.loai, ngay: x.ngay, moc: x.moc || null, bieu_hien: x.bieu_hien || null, mon_ky_nang: x.mon_ky_nang || null,
          bien_phap: x.bien_phap || null, nguoi_phoi_hop: x.nguoi_phoi_hop || null, moc_xem_lai: x.moc_xem_lai || null, trang_thai: x.trang_thai,
          ket_qua: x.ket_qua || null, hs_giup_do: x.hs_giup_do ? tenHs(x.hs_giup_do) : null };
      }),
      ho_tro_khac_so: {},
      hop_cmhs: S.lienLac.filter(function (x) { return x.loai === 'hop'; }).sort(function (a, b) { return a.ngay < b.ngay ? -1 : 1; }).map(function (x) {
        return { ngay: x.ngay, ky_hop: x.ky_hop, gio: x.gio || null, dia_diem: x.dia_diem || null, so_du: x.so_du, tong_so: x.tong_so, noi_dung: x.noi_dung || null,
          phan_hoi: x.phan_hoi || null, ket_luan: x.ket_luan || null, muc: x.muc || {} };
      }),
      trao_doi: S.lienLac.filter(function (x) { return x.loai !== 'hop'; }).sort(function (a, b) { return a.ngay < b.ngay ? -1 : 1; }).map(function (x) {
        return { ngay: x.ngay, loai: x.loai, hoc_sinh: tenHs(x.hoc_sinh_ma), kenh: x.kenh || '', noi_dung: x.noi_dung || '', phan_hoi: x.phan_hoi || '', ket_luan: x.ket_luan || '', trang_thai: x.trang_thai };
      }),
      trao_doi_so: S.lienLac.filter(function (x) { return x.loai === 'trao_doi'; }).length,
      phan_anh_so: S.lienLac.filter(function (x) { return x.loai === 'phan_anh'; }).length,
      danh_gia: dg,
      tong_ket: Object.keys(S.tongKet).map(function (k) {
        var t = S.tongKet[k];
        return { ky: k, ngay: t.ngay, viec_lam_duoc: t.viec_lam_duoc || null, ton_tai: t.ton_tai || null, de_xuat: t.de_xuat || null, ban_giao: t.ban_giao || null,
          co_ban_giao: !!String(t.ban_giao || '').trim(), them: t.them || {} };
      })
    };
  }

  // ══════════ XUẤT WORD — BÁM KHUNG SỔ CHỦ NHIỆM THẬT CỦA TRƯỜNG ══════════
  // (Sổ chủ nhiệm 1B năm học 2025-2026): bìa · [phụ lục TT27 tuỳ chọn] · thông tin
  // học sinh (2 bảng) · thông tin cơ bản của lớp + tình hình chất lượng đầu năm ·
  // kế hoạch chủ nhiệm năm (I, II, III.1–8) · họp phụ huynh lần 1 · kế hoạch và
  // nhật ký tháng 9 → 01 · kết quả cuối HK I · họp phụ huynh lần 2 · tháng 02 → 5 ·
  // kết quả cuối năm · họp phụ huynh cuối năm · phụ lục số liệu hệ thống · nhận xét
  // của BGH · bảng theo dõi kiểm tra · khối ký 3 cột. Sổ là HỒ SƠ: trang trong
  // KHÔNG in Quốc hiệu (chỉ phần trích TT27 nếu kèm). Không có dữ liệu thì in dòng
  // chấm / dòng bảng trống để viết tay như sổ giấy.
  // m.muc_do = 'nop_duyet' → BẢN GỬI TỔ TRƯỞNG: không có cột, bảng nhạy cảm (mô hình
  // vốn đã không có dữ liệu đó — lọc ở máy chủ; đây là lớp thứ hai).
  // Ngắt trang bằng một ĐOẠN rỗng 1pt mang page-break-before. <br page-break-before>
  // trần bị Word gộp vào đoạn liền trước khi ngay sau là một BẢNG → không ngắt
  // (đo bằng Word COM 28/9/2026: bìa dính liền trang trích TT27).
  var NGAT = '<p style="margin:0;font-size:1pt;line-height:1pt;page-break-before:always">&nbsp;</p>';
  var CHAM = new Array(126).join('.');
  function tiLe(so, mau) { return mau > 0 && so != null && so !== '' ? String(Math.round(so * 1000 / mau) / 10).replace('.', ',') + '%' : ''; }
  function mocCua(x) { return x.moc || mocGoiY(x.ngay || '') || ''; }
  function khoiKyDuLieu(dsNop, dsDuyet) {
    var sau = function (a, b) { return String(a.luc || a.nop_luc) < String(b.luc || b.nop_luc) ? -1 : 1; };
    var bgh = dsDuyet.filter(function (x) { return x.vai === 'bgh' && x.ket_qua === 'da_duyet'; })
      .sort(function (a, b) { return (a.ky === 'ca-nam') - (b.ky === 'ca-nam') || sau(a, b); }).pop() || null;
    var to = dsDuyet.filter(function (x) { return x.vai === 'to_truong' && x.ket_qua === 'da_kiem_tra'; }).sort(sau).pop() || null;
    var gv = (bgh && dsNop.filter(function (n) { return n.id === bgh.nop_id; })[0]) ||
      dsNop.filter(function (n) { return n.trang_thai !== 'thay_the'; }).sort(sau).pop() || null;
    return { gv: gv, to: to, bgh: bgh };
  }

  function wordSo(m, tc) {
    tc = tc || {};
    var W = window.WORD_TIEN_ICH, c = W.chan, loc = m.muc_do === 'nop_duyet';
    var nam = m.nam_hoc || D.nam, namCach = String(nam).replace('-', ' - '), lop = String(m.lop || ''), LOP = lop.toUpperCase();
    var ss = m.si_so || {}, siSo = ss.tong != null ? ss.tong : (m.hoc_sinh || []).length, hc = m.hoan_canh_so || {};
    var dl = W.diaDanh ? W.diaDanh() : '', so = function (v) { return v == null ? 0 : v; };
    var kn = (m.ke_hoach || []).filter(function (k) { return k.cap === 'nam'; })[0], nd = (kn && kn.noi_dung) || {};
    var tkCua = function (k) { return (m.tong_ket || []).filter(function (t) { return t.ky === k; })[0] || {}; };
    function tieuDe(t, co) { return '<p class="giua" style="margin:10pt 0 6pt"><b style="font-size:' + (co || 14) + 'pt">' + c(t) + '</b></p>'; }
    function muc(t) { return '<p style="margin:9pt 0 3pt"><b>' + c(t) + '</b></p>'; }
    function nho(t) { return '<p style="margin:6pt 0 2pt"><b><i>' + c(t) + '</i></b></p>'; }
    function dong(t) { return '<p style="margin:0 0 2pt">' + t + '</p>'; }
    function cham(n) { var h = ''; for (var i = 0; i < (n || 2); i++) h += '<p style="margin:0;line-height:1.7;font-size:12pt">' + CHAM + '</p>'; return h; }
    function van(t, n) {
      t = String(t == null ? '' : t).trim();
      return t ? t.split('\n').map(function (d) { return '<p style="margin:0 0 2pt;text-align:justify">' + c(d) + '</p>'; }).join('') : cham(n || 2);
    }
    function hoac(t) { t = String(t == null ? '' : t).trim(); return t ? '<b>' + c(t) + '</b>' : '………………………………'; }
    // ── Bảng trong sổ: Word CHỈ nghe đệm ô và độ rộng viết THẲNG vào từng ô ──
    // (đo bằng Word COM 28/9/2026: luật CSS theo lớp bị luật chung th,td đè → đệm
    // vẫn 6pt; độ rộng % bị Word chia lại → cột Họ và tên hẹp, tên rơi dòng).
    // Nên: đổi % → cm theo khổ chữ 16,5 cm, khai <colgroup>, khoá bề rộng bảng,
    // và ghi đệm 2pt × 3pt vào từng ô.
    var KHO_CM = 16.5, DEM = 'padding:2pt 3pt;line-height:1.2;',
      DEM_TH = 'background:#EAF3FB;text-align:center;vertical-align:middle;';
    function cm(r) { return /%$/.test(r) ? (parseFloat(r) * KHO_CM / 100).toFixed(2) + 'cm' : r; }
    function oDem(h) {
      return h.replace(/<t([hd])(\s[^>]*)?>/g, function (m, t, a) {
        a = a || '';
        // Ô tiêu đề: chữ giữa ô cả ngang lẫn dọc, nền xanh rất nhạt (thầy Chung
        // 28/9/2026 — không dùng nền xám). Word bỏ qua kiểu theo class nên ghi thẳng vào ô.
        var d = t === 'h' ? DEM + DEM_TH : DEM;
        return /style="/.test(a) ? '<t' + t + a.replace('style="', 'style="' + d) + '>' : '<t' + t + ' style="' + d + '"' + a + '>';
      });
    }
    function bang(dau, ds, rong, soTrong) {
      var rcm = rong ? rong.map(cm) : null;
      var th = '<tr>' + dau.map(function (d, i) { return '<th' + (rcm && rcm[i] ? ' style="width:' + rcm[i] + '"' : '') + '>' + c(d) + '</th>'; }).join('') + '</tr>';
      var trong = '<tr>' + dau.map(function () { return '<td>&nbsp;</td>'; }).join('') + '</tr>';
      var tb = ds.length ? ds.map(function (r) { return '<tr>' + r.map(function (o, i) { return '<td' + (i === 0 ? ' class="giua"' : '') + '>' + (o == null ? '' : o) + '</td>'; }).join('') + '</tr>'; }).join('')
        : new Array((soTrong || 5) + 1).join(trong);
      var cg = rcm ? '<colgroup>' + rcm.map(function (x) { return '<col style="width:' + x + '">'; }).join('') + '</colgroup>' : '';
      return oDem('<table class="co-dinh so-bang" style="width:' + KHO_CM + 'cm">' + cg + '<thead>' + th + '</thead><tbody>' + tb + '</tbody></table>');
    }
    // Bảng hai tầng tiêu đề: mỗi mức một cặp SL / TL (như sổ giấy)
    function bangMuc(tenCot, dsDong, mucs, lay, coSoDG, nhomTen) {
      var soCot = 2 + (coSoDG ? 1 : 0) + mucs.length * 2;
      // Độ rộng tuyệt đối (cm): TT 0,9 · tên 4,2 · (số HS ĐG 1,6) · các cột SL/TL chia đều phần còn lại
      var wTen = 4.2, wSo = coSoDG ? 1.6 : 0, wO = ((KHO_CM - 0.9 - wTen - wSo) / (mucs.length * 2)).toFixed(2) + 'cm';
      var cg = '<colgroup><col style="width:0.9cm"><col style="width:' + wTen + 'cm">' + (coSoDG ? '<col style="width:' + wSo + 'cm">' : '') +
        mucs.map(function () { return '<col style="width:' + wO + '"><col style="width:' + wO + '">'; }).join('') + '</colgroup>';
      var h = '<table class="co-dinh so-bang" style="width:' + KHO_CM + 'cm">' + cg + '<thead><tr><th rowspan="2" style="width:0.9cm">TT</th><th rowspan="2" style="width:' + wTen + 'cm">' + c(tenCot) + '</th>' +
        (coSoDG ? '<th rowspan="2" style="width:' + wSo + 'cm">Số HS được ĐG</th>' : '') +
        mucs.map(function (x) { return '<th colspan="2" style="width:' + (parseFloat(wO) * 2).toFixed(2) + 'cm">' + c(x[1]) + '</th>'; }).join('') + '</tr><tr>' +
        mucs.map(function () { return '<th style="width:' + wO + '">SL</th><th style="width:' + wO + '">TL</th>'; }).join('') + '</tr></thead><tbody>';
      var tt = 0, nhomCu = null;
      dsDong.forEach(function (d) {
        if (nhomTen && d[2] !== nhomCu) { nhomCu = d[2]; tt = 0; h += '<tr><td style="width:0.9cm"></td><td colspan="' + (soCot - 1) + '" style="width:' + (KHO_CM - 0.9).toFixed(2) + 'cm"><b>' + c(nhomTen[d[2]]) + '</b></td></tr>'; }
        var v = lay(d[0]) || {};
        // Ghi bề rộng vào TỪNG ô: tiêu đề có ô gộp dọc/ngang nên Word dựng lưới cột
        // theo hàng dữ liệu — không có bề rộng ở đây là cột TT, tên môn bị bóp.
        h += '<tr><td class="giua" style="width:0.9cm">' + (++tt) + '</td><td style="width:' + wTen + 'cm">' + c(d[1]) + '</td>' +
          (coSoDG ? '<td class="giua" style="width:' + wSo + 'cm">' + (v.mau != null ? v.mau : '') + '</td>' : '') +
          mucs.map(function (x) { var s = v[x[0]]; return '<td class="giua" style="width:' + wO + '">' + (s != null && s !== '' ? s : '') + '</td><td class="giua" style="width:' + wO + '">' + tiLe(s, v.mau) + '</td>'; }).join('') + '</tr>';
      });
      return oDem(h + '</tbody></table>');
    }
    var MUC_MON = [['T', 'Hoàn thành tốt (T)'], ['H', 'Hoàn thành (H)'], ['C', 'Chưa hoàn thành (C)']];
    var MUC_NL = [['T', 'Tốt (T)'], ['Đ', 'Đạt (Đ)'], ['C', 'Cần cố gắng (C)']];
    var PC = NLPC.filter(function (x) { return /^PC/.test(x[0]); });
    var NHOM_NL = { 1: 'I. Năng lực chung', 2: 'II. Năng lực đặc thù' };
    var ctLay = function (bo) { return function (ma) { return bo && bo[ma] ? Object.assign({ mau: siSo }, bo[ma]) : null; }; };
    var dgLay = function (loai, ky) { return function (ma) { return ((m.danh_gia || {})[loai] || []).filter(function (x) { return x.ky === ky && x.ma === ma; })[0] || null; }; };
    var hoTro = function (loai, moc) { return (m.ho_tro || []).filter(function (x) { return x.loai === loai && mocCua(x) === moc; }); };
    var bangNoiTroi = function (ds) { return bang(['TT', 'Họ tên HS', 'Mặt nổi trội'], ds.map(function (x, i) { return [i + 1, c(x.ho_ten), c([x.bieu_hien, x.mon_ky_nang].filter(Boolean).join('; '))]; }), ['8%', '34%', '58%'], 5); };
    var bangCanGiup = function (ds) {
      return bang(['TT', 'Họ tên HS', 'Mặt hạn chế cần giúp đỡ', 'Phân công HS giúp đỡ'], ds.map(function (x, i) {
        return [i + 1, c(x.ho_ten), c([x.bieu_hien, x.mon_ky_nang].filter(Boolean).join('; ')), c(x.hs_giup_do || '')];
      }), ['8%', '28%', '40%', '24%'], 5);
    };
    var kyKy = function (tieuDeTrai, ngayKy, chucVu, ten) {
      return '<table style="border:none;width:100%;margin-top:10pt"><tr><td style="border:none;width:45%">' + (tieuDeTrai || '') + '</td>' +
        '<td style="border:none;width:55%;text-align:center;font-size:13pt"><i>' + c(dl) + ', ' + (ngayKy ? ngayChu(ngayKy) : 'ngày …… tháng …… năm ……') + '</i><br>' +
        chucVu + '<div style="height:48pt"></div><b>' + c(ten || '') + '</b></td></tr></table>';
    };
    var h = '';

    // ── BÌA IN MÀU (WordSection1) — mẫu thầy Chung chọn 29/9/2026 ──
    // Nền: img/bia-so-chu-nhiem.jpg (trống đồng xanh, khung thông tin, chữ
    // "SỔ CHỦ NHIỆM – TIỂU HỌC" in sẵn trên ảnh; phần chữ riêng của từng trường
    // đã xoá khỏi ảnh). Chữ dưới đây đặt bằng dòng cao CỐ ĐỊNH (exactly) cho khớp
    // vị trí trên ảnh — đo chồng lên mẫu bằng Word COM. Lề section 1: 1 cm.
    var truong = W.cauHinh('TEN_TRUONG'), chuQuan = W.cauHinh('DON_VI_CHU_QUAN') || W.cauHinh('CHU_QUAN_THUONG');
    var truongBan = (m.ban_dai_dien || []).filter(function (b) { return /trưởng/i.test(b.vai_tro || '') && !/phó/i.test(b.vai_tro || ''); })[0] || null;
    var biaCham = function (t) { t = String(t == null ? '' : t).trim(); return t ? c(t) : '…………………………………'; };
    var MAU_BIA = '#0D1B5E';
    var dongCo = function (t, cao, kieu) {
      return '<p style="margin:0;line-height:' + cao + 'pt;mso-line-height-rule:exactly;color:' + MAU_BIA + ';' + (kieu || '') + '">' + t + '</p>';
    };
    var trongCo = function (cao) { return '<p style="margin:0;line-height:' + cao + 'pt;mso-line-height-rule:exactly;font-size:6pt">&nbsp;</p>'; };
    var oBia = function (t) { return dongCo('<b>' + t + '</b>', 37, 'margin-left:51pt;font-size:18pt;white-space:nowrap'); };
    var bia = trongCo(21) +
      dongCo('<b>' + c(String(chuQuan).toUpperCase()) + '</b>', 27, 'text-align:center;font-size:17pt') +
      dongCo('<b>' + c(String(truong).toUpperCase()) + '</b>', 27.2, 'text-align:center;font-size:18.5pt') +
      trongCo(468) +
      oBia('Giáo viên chủ nhiệm : ' + biaCham(m.gvcn)) +
      oBia('Lớp : ' + c(lop)) +
      oBia(c(truong)) +
      oBia(c(W.cauHinh('DIA_CHI_TRUONG') || '') || '&nbsp;') +   // trống vẫn giữ chỗ, kẻo năm học trôi lên
      trongCo(27) +
      dongCo('<b>NĂM HỌC: ' + c(nam) + '</b>', 30, 'text-align:center;font-size:16.5pt');

    // Không có trang "Thông tin chung" (thầy Chung 29/9/2026 bỏ). Bản nộp tổ
    // chỉ ghi một dòng nhỏ đầu phần ruột: đã lược dữ liệu + lần nộp, mã bản.
    if (loc) h += '<p class="nghieng" style="margin:0 0 4pt;font-size:11pt">Bản nộp tổ chuyên môn — đã lược dữ liệu cá nhân. ' +
      (tc.nop ? 'Bản nộp ' + c(TEN_KY_NOP[tc.nop.ky] || tc.nop.ky) + ' (lần ' + tc.nop.lan + ') lúc ' + gioVN(tc.nop.nop_luc) + ' · mã bản ' + maNgan(tc.nop.ma_bam) + '.'
        : 'Bản xem trước — chưa nộp kiểm tra.') + '</p>';

    // ── PHỤ LỤC TT27 (tuỳ chọn, văn bản tĩnh — phần DUY NHẤT có Quốc hiệu) ──
    if (tc.tt27 && tc.tt27.length) {
      h += '<table style="border:none;width:100%;border-collapse:collapse"><tr>' +
        '<td style="border:none;padding:0;width:40%;text-align:center;vertical-align:top;font-size:12pt"><b>BỘ GIÁO DỤC VÀ ĐÀO TẠO</b>' + W.gach(2.4) + '</td>' +
        '<td style="border:none;padding:0;width:60%;text-align:center;vertical-align:top;font-size:12pt"><b style="white-space:nowrap">CỘNG&nbsp;HÒA&nbsp;XÃ&nbsp;HỘI&nbsp;CHỦ&nbsp;NGHĨA&nbsp;VIỆT&nbsp;NAM</b><br>' +
        '<b style="font-size:13pt">Độc lập - Tự do - Hạnh phúc</b>' + W.gach(4.4, 13) + '</td></tr></table>' +
        tc.tt27.map(function (x) {
          if (x[0] === 'g') return '<p class="giua" style="margin:6pt 0 0"><b>' + c(x[1]) + '</b></p>';
          if (x[0] === 'n') return '<p class="giua nghieng" style="margin:0 0 6pt">' + c(x[1]) + '</p>';
          if (x[0] === 'd') return '<p style="margin:4pt 0 0;text-indent:1cm;text-align:justify"><b>' + c(x[1]) + '</b></p>';
          return '<p style="margin:0;text-indent:1cm;text-align:justify">' + c(x[1]) + '</p>';
        }).join('') + NGAT;
    }

    // ── THÔNG TIN VỀ HỌC SINH ──
    var hs = (m.hoc_sinh || []).slice().sort(sapTen);
    h += tieuDe('THÔNG TIN VỀ HỌC SINH LỚP ' + LOP + ' NĂM HỌC ' + namCach);
    h += loc
      ? bang(['TT', 'Họ và tên', 'Ngày sinh', 'Nữ', 'Dân tộc'], hs.map(function (x, i) {
          return [i + 1, c(x.ho_ten) + (x.hoa_nhap ? ' <i>(HN)</i>' : ''), '<span class="giua">' + ngayVN(x.ngay_sinh) + '</span>', x.gioi_tinh === 'Nữ' ? 'Nữ' : '', c(x.dan_toc || '')];
        }), ['0.9cm', '7.2cm', '2.6cm', '1.3cm', '4.5cm'], 35) +
        '<p class="nghieng" style="font-size:11pt;margin:3pt 0 0">Bản gửi tổ chuyên môn không có các cột họ tên và nghề nghiệp của cha mẹ.</p>'
      : bang(['TT', 'Họ và tên', 'Ngày sinh', 'Nữ', 'Dân tộc', 'Họ tên bố (mẹ) hoặc người giám hộ', 'Nghề nghiệp'], hs.map(function (x, i) {
          return [i + 1, c(x.ho_ten) + (x.hoa_nhap ? ' <i>(HN)</i>' : ''), '<span class="giua">' + ngayVN(x.ngay_sinh) + '</span>', x.gioi_tinh === 'Nữ' ? 'Nữ' : '',
            c(x.dan_toc || ''), c(x.cha_me_ten || ''), c(x.nghe_nghiep || '')];
        }), ['0.8cm', '4.1cm', '2.3cm', '0.9cm', '1.1cm', '5.1cm', '2.2cm'], 35);
    h += NGAT + tieuDe('THÔNG TIN VỀ HỌC SINH LỚP ' + LOP + ' NĂM HỌC ' + namCach) +
      (loc ? '<p class="nghieng">(Bảng số điện thoại, địa chỉ, hoàn cảnh gia đình, đặc điểm cá nhân là dữ liệu cá nhân nhạy cảm — chỉ có trong bản đầy đủ của giáo viên chủ nhiệm và Ban giám hiệu.)</p>'
        : bang(['TT', 'Họ và tên', 'Số điện thoại', 'Địa chỉ', 'Xóm', 'Hoàn cảnh gia đình', 'Đặc điểm cá nhân (khả năng vượt trội, hạn chế về học tập, NL, PC)'], hs.map(function (x, i) {
            return [i + 1, c(x.ho_ten), c(x.sdt || ''), c(x.dia_chi || ''), c(x.xom || ''), c(x.hoan_canh_gd || ''), c(x.dac_diem || '')];
          }), ['0.8cm', '4.3cm', '2.3cm', '2.2cm', '1.1cm', '2.9cm', '2.9cm'], 35));

    // ── THÔNG TIN CƠ BẢN VỀ LỚP ──
    h += NGAT + tieuDe('THÔNG TIN CƠ BẢN VỀ LỚP ' + LOP + ' NĂM HỌC ' + namCach) +
      muc('1. Tổng số học sinh của lớp: ' + siSo + ' em') +
      dong('Trong đó: Nam: ' + so(ss.nam) + '; Nữ: ' + so(ss.nu)) +
      dong('- Dân tộc thiểu số: ' + so(ss.dtts) + '; Học sinh khuyết tật học hòa nhập: ' + so(ss.hoa_nhap)) +
      dong('- Con gia đình chính sách (thương binh, liệt sĩ, người có công): ' + so(hc.nguoi_co_cong) + '; Con gia đình khó khăn, cần quan tâm: ' + so(hc.can_quan_tam)) +
      dong('- Con hộ nghèo: ' + so(hc.ho_ngheo) + '; Con hộ cận nghèo: ' + so(hc.can_ngheo) + '; Mồ côi: ' + so(hc.mo_coi)) +
      dong('- Học sinh trong xã: ' + Math.max(0, siSo - so(hc.ngoai_xa)) + '; ngoài xã: ' + so(hc.ngoai_xa)) +
      '<p class="nghieng" style="font-size:11pt;margin:2pt 0 4pt">Số liệu hoàn cảnh đếm theo hồ sơ giáo viên chủ nhiệm đã ghi trên hệ thống.</p>';
    h += nho('Ban cán sự lớp' + (m.ngay_bau ? ' (bầu ngày ' + ngayVN(m.ngay_bau) + ')' : '')) +
      bang(['TT', 'Chức vụ', 'Họ và tên'], (m.ban_can_su || []).map(function (b, i) { return [i + 1, c(b.chuc_vu), c(b.ho_ten)]; }), ['8%', '40%', '52%'], 4);
    h += nho('Ban đại diện cha mẹ học sinh lớp') + (loc
      ? bang(['TT', 'Vai trò', 'Họ và tên'], (m.ban_dai_dien || []).map(function (b, i) { return [i + 1, c(b.vai_tro), c(b.ho_ten)]; }), ['8%', '35%', '57%'], 3)
      : bang(['TT', 'Vai trò', 'Họ và tên', 'Điện thoại'], (m.ban_dai_dien || []).map(function (b, i) { return [i + 1, c(b.vai_tro), c(b.ho_ten), c(b.sdt || '')]; }), ['8%', '28%', '40%', '24%'], 3));
    if ((m.giao_vien || []).length) h += nho('Giáo viên dạy lớp') + bang(['TT', 'Họ và tên', 'Môn học, hoạt động giáo dục'], m.giao_vien.map(function (g, i) { return [i + 1, c(g.ho_ten), c(g.mon || '')]; }), ['8%', '45%', '47%']);
    h += muc('2. Tình hình chất lượng đầu năm học') +
      nho('a) Những học sinh có phẩm chất, năng lực hoặc kết quả học tập nổi trội') + bangNoiTroi(hoTro('noi_troi', 'dau_nam')) +
      nho('b) Những học sinh có mặt hạn chế cần giúp đỡ') + bangCanGiup(hoTro('hoc_tap', 'dau_nam'));

    // ── KẾ HOẠCH CHỦ NHIỆM NĂM HỌC ──
    var cuKH = function (key) { return (KH_CU[key] || []).map(function (o) { return nd[o]; }).filter(Boolean).join('\n'); };
    h += NGAT + tieuDe('KẾ HOẠCH CHỦ NHIỆM NĂM HỌC ' + namCach) +
      muc('I. CĂN CỨ XÂY DỰNG KẾ HOẠCH') + van(nd.can_cu, 4) +
      muc('II. ĐẶC ĐIỂM TÌNH HÌNH') + (nd.dac_diem ? van(nd.dac_diem) : '') +
      nho('1. Thuận lợi') + van(nd.thuan_loi, 3) + nho('2. Khó khăn') + van(nd.kho_khan, 3) +
      muc('III. CHỈ TIÊU, BIỆN PHÁP');
    MUC_KH.forEach(function (mk) {
      var v = nd['kh_' + mk[0]];
      h += nho(mk[1]) + van(v != null && String(v).trim() !== '' ? v : cuKH(mk[0]), 3);
      if (mk[0] === 'chat_luong') {
        h += nho('* Chỉ tiêu các môn học và hoạt động giáo dục') + bangMuc('Môn học', monTheoKhoi(m.khoi), MUC_MON, ctLay(nd.ct_mon)) +
          nho('* Chỉ tiêu phẩm chất') + bangMuc('Phẩm chất', PC, MUC_NL, ctLay(nd.ct_pc)) +
          nho('* Chỉ tiêu năng lực') + bangMuc('Các năng lực', NL_DAY_DU, MUC_NL, ctLay(nd.ct_nl), true, NHOM_NL) +
          nho('* Đánh giá cuối năm học') + bang(['TT', 'Nội dung', 'SL', 'TL'], CT_CUOI_NAM.map(function (x, i) {
            var s = nd.ct_cn && nd.ct_cn[x[0]] ? nd.ct_cn[x[0]].SL : '';
            return [i + 1, c(x[1]), '<span class="giua">' + (s != null ? s : '') + '</span>', tiLe(s, siSo)];
          }), ['8%', '62%', '15%', '15%']) +
          nho('* Học sinh tham gia các cuộc thi, sân chơi trí tuệ') + bang(['TT', 'Cuộc thi, sân chơi', 'Chỉ tiêu'], (nd.cuoc_thi || []).map(function (x, i) { return [i + 1, c(x.ten), c(x.chi_tieu || '')]; }), ['8%', '67%', '25%'], 4);
      }
    });
    h += nho('8. Chỉ tiêu chung') +
      dong('Danh hiệu thi đua của lớp: ' + hoac(nd.danh_hieu_lop)) + dong('Danh hiệu thi đua của Chi đội (Sao nhi đồng): ' + hoac(nd.danh_hieu_doi)) +
      dong('Đội viên xuất sắc: ' + hoac(nd.doi_vien_xs)) + dong('Chỉ tiêu khác:') + van(nd.chi_tieu, 2) +
      (nd.shdc_phu_trach ? dong('Tuần lớp phụ trách sinh hoạt dưới cờ: ' + c(nd.shdc_phu_trach)) : '');
    h += kyKy('', kn && kn.ngay, '<b>GIÁO VIÊN CHỦ NHIỆM</b>', m.gvcn);

    // ── HỌP PHỤ HUYNH ──
    function tuDongHop(ky, key) {
      var ten = function (ds) { return ds.map(function (x) { return x.ho_ten; }).join(', '); };
      if (ky === 'dau_nam' && key === 'tinh_hinh') return 'Tổng sĩ số: ' + siSo + '; nữ: ' + so(ss.nu) + ', nam: ' + so(ss.nam) + '.' + (nd.thuan_loi ? '\nThuận lợi: ' + nd.thuan_loi : '') + (nd.kho_khan ? '\nKhó khăn: ' + nd.kho_khan : '');
      if (ky === 'dau_nam' && key === 'chi_tieu') return [nd.danh_hieu_lop ? '- Danh hiệu lớp: ' + nd.danh_hieu_lop : '', nd.danh_hieu_doi ? '- Chi đội (Sao nhi đồng): ' + nd.danh_hieu_doi : '', nd.chi_tieu || ''].filter(Boolean).join('\n');
      if (key === 'tung_hs' && ky === 'dau_nam') {
        var a = hoTro('noi_troi', 'dau_nam'), b = hoTro('hoc_tap', 'dau_nam');
        return [a.length ? '+ Nhóm học sinh năng khiếu: ' + ten(a) : '', b.length ? '+ Nhóm cần giúp đỡ: ' + ten(b) : ''].filter(Boolean).join('\n');
      }
      if (ky === 'dau_nam' && key === 'cu_ban') return (m.ban_dai_dien || []).map(function (b) { return '- ' + (b.vai_tro ? b.vai_tro + ': ' : '') + b.ho_ten; }).join('\n');
      return '';
    }
    function wordHop(ky) {
      var kh = KHUNG_HOP[ky], x = (m.hop_cmhs || []).filter(function (y) { return y.ky_hop === ky; }).pop() || {}, mu = x.muc || {};
      var r = tieuDe(kh.ten) + (ky === 'cuoi_nam'
        ? dong('<b>I. Ổn định, điểm danh phụ huynh:</b> ' + (x.tong_so ? 'có mặt ' + so(x.so_du) + '/' + x.tong_so : '……………………'))
        : dong('<b>1. Thời gian:</b> Vào lúc ' + (x.gio ? c(x.gio) : '……') + ' ' + (x.ngay ? ngayChu(x.ngay) : 'ngày …… tháng …… năm ……')) +
          dong('<b>2. Địa điểm:</b> ' + (x.dia_diem ? c(x.dia_diem) : CHAM.slice(0, 80))) + dong('<b>3. Nội dung:</b>') +
          (ky === 'cuoi_hk1' ? dong('1. Ổn định, điểm danh: ' + (x.tong_so ? 'có mặt ' + so(x.so_du) + '/' + x.tong_so : '……………………')) : ''));
      kh.muc.forEach(function (k) {
        var v = mu[k[0]] || (k[0] === 'phu_huynh' && x.phan_hoi) || tuDongHop(ky, k[0]);
        r += nho(k[1]) + (v ? van(v) : k[2] ? dong('<i>' + c(k[2]) + '</i>') : cham(2));
      });
      if (x.noi_dung && !Object.keys(mu).length) r += nho('Nội dung cuộc họp') + van(x.noi_dung);
      if (x.ket_luan) r += nho('Kết luận') + van(x.ket_luan);
      return r + kyKy(ky === 'cuoi_nam' && truongBan ? '<p class="giua" style="margin:0"><b>HỘI CHA MẸ HỌC SINH</b></p><div style="height:48pt"></div><p class="giua"><b>' + c(truongBan.ho_ten) + '</b></p>' : '',
        x.ngay, '<b>NGƯỜI LÊN KẾ HOẠCH</b><br>GIÁO VIÊN CHỦ NHIỆM', m.gvcn);
    }

    // ── KẾ HOẠCH VÀ NHẬT KÝ THÁNG ──
    function wordThang(ym) {
      var so2 = +ym.split('-')[1], tenT = so2 < 3 ? pad(so2) : so2;
      var kt = (m.ke_hoach || []).filter(function (k) { return k.cap === 'thang' && k.ky === ym; })[0], n2 = (kt && kt.noi_dung) || {}, cd = chuDiemThang(nam, ym);
      var chon = function (a, b) { return a != null && String(a).trim() !== '' ? a : b; };
      var r = tieuDe('KẾ HOẠCH VÀ NHẬT KÝ THÁNG ' + tenT + ' - NĂM HỌC ' + namCach) +
        '<p class="giua" style="margin:0 0 6pt"><b>Chủ điểm: </b>' + (cd ? '"' + c(cd.khgd) + '"' + (cd.doi && cd.doi !== cd.khgd ? ' · Chủ điểm Đội: "' + c(cd.doi) + '"' : '') : CHAM.slice(0, 70)) + '</p>' +
        muc('1. Công tác dạy học') + van(chon(n2.day_hoc, n2.hoat_dong), 4) +
        muc('2. Công tác Đội') + van(n2.doi, 3) +
        muc('3. Công tác khác') + van(chon(n2.khac, n2.trong_tam), 3);
      var tuan = (m.ke_hoach || []).filter(function (x) { return x.cap === 'tuan' && thangCuaTuan(nam, +String(x.ky).slice(1)) === ym; }).sort(function (a, b) { return a.ky < b.ky ? -1 : 1; });
      if (tuan.length) r += nho('Sinh hoạt lớp hằng tuần') + bang(['Tuần', 'Sơ kết tuần', 'Chủ đề, lồng ghép', 'Kế hoạch tuần tới'], tuan.map(function (x) {
        var n3 = x.noi_dung || {}; return [+String(x.ky).slice(1), c(n3.so_ket || ''), c([n3.chu_de, n3.long_ghep].filter(Boolean).join('; ')), c(n3.tuan_toi || '')];
      }), ['9%', '33%', '28%', '30%']);
      var td = (m.theo_doi || []).filter(function (x) { return String(x.ngay).slice(0, 7) === ym; });
      if (td.length) r += nho('Nhật ký theo dõi, nhận xét, khen – nhắc') + bang(['Ngày', 'Học sinh', 'Loại', 'Nội dung'], td.map(function (x) {
        return [ngayVN(x.ngay), c(x.hoc_sinh || ''), c(TEN_LOAI_TD[x.loai] || x.loai), c(x.noi_dung || '') + (x.da_bao_cmhs && !loc ? ' <i>(đã báo cha mẹ)</i>' : '')];
      }), ['13%', '27%', '11%', '49%']);
      var cc = (((m.chuyen_can || {}).thang) || []).filter(function (x) { return x.thang === ym; })[0];
      if (cc) {
        var tl2 = tiLeChuyenCan(cc.P + cc.K + cc.R, siSo, cc.buoi);
        r += dong('<i>Chuyên cần:</i> ' + (cc.P + cc.K + cc.R) + ' lượt vắng (có phép ' + cc.P + ', không phép ' + cc.K + (cc.R ? ', chưa rõ ' + cc.R : '') + ') trên ' + cc.buoi + ' buổi đã điểm danh' + (tl2 != null ? ' — tỉ lệ chuyên cần ' + String(tl2).replace('.', ',') + '%' : '') + '.');
      }
      return r + muc('KẾT QUẢ') + van(kt && kt.ket_qua, 3) + muc('GHI CHÚ ĐẶC BIỆT') + van(n2.ghi_chu_db, 2);
    }
    function ketQuaKy(ky) {
      return muc('Kết quả các môn học và hoạt động giáo dục') + bangMuc('Môn học', monTheoKhoi(m.khoi), MUC_MON, dgLay('mon', ky), true) +
        muc('Đánh giá phẩm chất') + bangMuc('Phẩm chất', PC, MUC_NL, dgLay('nlpc', ky), true) +
        muc('Đánh giá năng lực') + bangMuc('Các năng lực', NL_DAY_DU, MUC_NL, dgLay('nlpc', ky), true, NHOM_NL);
    }
    h += NGAT + wordHop('dau_nam');
    var dsT = dsThangNamHoc(nam);
    dsT.slice(0, 5).forEach(function (ym) { h += NGAT + wordThang(ym); });

    // ── KẾT QUẢ CUỐI HỌC KỲ I ──
    var tk1 = tkCua('hk1');
    h += NGAT + tieuDe('KẾT QUẢ CUỐI HỌC KÌ I CỦA LỚP ' + LOP) +
      muc('1. Danh sách học sinh có phẩm chất, năng lực hoặc kết quả học tập nổi trội') + bangNoiTroi(hoTro('noi_troi', 'hk1')) +
      muc('2. Danh sách học sinh cần giúp đỡ thêm ở học kì II') + bangCanGiup(hoTro('hoc_tap', 'hk1')) +
      ketQuaKy('cuoi_ki_1') +
      muc('Sơ kết học kỳ I' + (tk1.ngay ? ' (lập ngày ' + ngayVN(tk1.ngay) + ')' : '')) +
      nho('Những việc làm được') + van(tk1.viec_lam_duoc, 3) + nho('Tồn tại, hạn chế') + van(tk1.ton_tai, 2) + nho('Đề xuất') + van(tk1.de_xuat, 2);
    h += NGAT + wordHop('cuoi_hk1');
    dsT.slice(5).forEach(function (ym) { h += NGAT + wordThang(ym); });

    // ── KẾT QUẢ CUỐI NĂM ──
    var tkN = tkCua('ca_nam'), them = tkN.them || {}, cn = (m.danh_gia || {}).cuoi_nam || {}, coCN = cn.co > 0;
    h += NGAT + tieuDe('KẾT QUẢ CUỐI NĂM HỌC CỦA LỚP ' + LOP) + ketQuaKy('cuoi_nam').replace('Kết quả các môn học', '1. Kết quả các môn học').replace('Đánh giá phẩm chất', '2. Đánh giá phẩm chất').replace('Đánh giá năng lực', '3. Đánh giá năng lực') +
      muc('4. Đánh giá kết quả giáo dục, khen thưởng cuối năm') + bang(['TT', 'Kết quả', 'SL', 'TL'], [
        ['1.1', 'Hoàn thành xuất sắc', '', ''], ['1.2', 'Hoàn thành tốt', '', ''],
        ['1.3', 'Hoàn thành chương trình lớp học', coCN ? cn.HT : '', coCN ? tiLe(cn.HT, siSo) : ''],
        ['1.4', 'Chưa hoàn thành (rèn luyện trong hè: ' + (coCN ? cn.RLTH : '…') + ')', coCN ? cn.CHT : '', coCN ? tiLe(cn.CHT, siSo) : ''],
        ['2.1', 'Khen thưởng: Học sinh Xuất sắc', coCN ? cn.XS : '', coCN ? tiLe(cn.XS, siSo) : ''],
        ['2.2', 'Khen thưởng: Học sinh Tiêu biểu hoàn thành tốt trong học tập và rèn luyện', coCN ? cn.TB : '', coCN ? tiLe(cn.TB, siSo) : '']
      ].map(function (r) { return [r[0], c(r[1]), '<span class="giua">' + r[2] + '</span>', r[3]]; }), ['9%', '61%', '15%', '15%']) +
      '<p class="nghieng" style="font-size:11pt;margin:2pt 0 0">Mức Hoàn thành xuất sắc / Hoàn thành tốt ghi theo học bạ số (hệ thống chưa lưu mức này).</p>' +
      muc('5. Học sinh tham gia các cuộc thi, sân chơi trí tuệ') + bang(['TT', 'Cuộc thi, sân chơi', 'Chỉ tiêu', 'Kết quả'], (nd.cuoc_thi || []).map(function (x, i) {
        return [i + 1, c(x.ten), c(x.chi_tieu || ''), c((them.cuoc_thi_kq || {})[x.ten] || '')];
      }), ['8%', '52%', '20%', '20%'], 4) +
      muc('6. Danh hiệu lớp') + dong(hoac(them.danh_hieu_lop)) +
      muc('7. Danh sách học sinh được khen thưởng') + bang(['TT', 'Họ tên HS', 'Nội dung, hình thức khen thưởng'], ((m.danh_gia || {}).khen || []).map(function (k, i) {
        return [i + 1, c(k.ho_ten), k.khen === 'XS' ? 'Học sinh Xuất sắc' : 'Học sinh Tiêu biểu hoàn thành tốt trong học tập và rèn luyện'];
      }), ['8%', '37%', '55%'], 6) +
      muc('8. Danh sách học sinh cần giúp đỡ thêm trong hè') + bangCanGiup(hoTro('hoc_tap', 'cuoi_nam')) +
      muc('9. Danh sách học sinh nổi trội') + bangNoiTroi(hoTro('noi_troi', 'cuoi_nam')) +
      muc('10. Tổng kết công tác chủ nhiệm' + (tkN.ngay ? ' (lập ngày ' + ngayVN(tkN.ngay) + ')' : '')) +
      nho('Những việc làm được') + van(tkN.viec_lam_duoc, 3) + nho('Tồn tại, hạn chế') + van(tkN.ton_tai, 2) + nho('Đề xuất') + van(tkN.de_xuat, 2) +
      nho('Bàn giao cho giáo viên chủ nhiệm năm sau') + (loc ? '<p class="nghieng">' + (tkN.co_ban_giao ? '(Đã có nội dung bàn giao — chỉ trong bản đầy đủ vì có thông tin sức khỏe, hoàn cảnh.)' : '(Chưa ghi.)') + '</p>' : van(tkN.ban_giao, 3));
    h += NGAT + wordHop('cuoi_nam');

    // ── PHỤ LỤC: SỐ LIỆU THEO DÕI TRÊN HỆ THỐNG (không có trong sổ giấy) ──
    var ccT = ((m.chuyen_can || {}).thang) || [], ccH = ((m.chuyen_can || {}).hoc_sinh) || [];
    h += NGAT + tieuDe('PHỤ LỤC — SỐ LIỆU THEO DÕI TRÊN HỆ THỐNG') +
      muc('A. Chuyên cần theo tháng') + bang(['Tháng', 'Có phép', 'Không phép', 'Chưa rõ', 'Buổi đã điểm danh', 'Tỉ lệ chuyên cần'], ccT.map(function (x) {
        var t = tiLeChuyenCan(x.P + x.K + x.R, siSo, x.buoi); return [c(TEN_THANG(x.thang)), x.P, x.K, x.R, x.buoi, t != null ? String(t).replace('.', ',') + '%' : ''];
      }), ['20%', '14%', '14%', '14%', '19%', '19%'], 3) +
      (ccH.length ? nho('Số buổi nghỉ từng học sinh (không ghi lý do)') + bang(['TT', 'Họ và tên', 'Có phép', 'Không phép', 'Chưa rõ', 'Tổng'], ccH.map(function (x, i) { return [i + 1, c(x.ho_ten), x.P, x.K, x.R, x.tong]; }), ['7%', '41%', '13%', '13%', '13%', '13%']) : '');
    var khac = (m.ho_tro || []).filter(function (x) { return x.loai !== 'hoc_tap' && x.loai !== 'noi_troi'; });
    h += muc('B. Học sinh cần hỗ trợ khác (nguy cơ bỏ học, hoàn cảnh, khuyết tật, tâm lý, sức khỏe…)') + (loc
      ? dong(Object.keys(m.ho_tro_khac_so || {}).length ? Object.keys(m.ho_tro_khac_so).map(function (k) { return c((TEN_HT[k] || k).split(' (')[0]) + ': ' + m.ho_tro_khac_so[k]; }).join('; ') + ' <i>(chỉ số lượng)</i>' : 'Không có.')
      : bang(['TT', 'Học sinh', 'Nhu cầu, biểu hiện', 'Biện pháp, phối hợp', 'Kết quả'], khac.map(function (x, i) {
          return [i + 1, c(x.ho_ten), c((TEN_HT[x.loai] || x.loai) + (x.bieu_hien ? ': ' + x.bieu_hien : '')), c([x.bien_phap, x.nguoi_phoi_hop].filter(Boolean).join(' — ')), c((TEN_TT_HT[x.trang_thai] || '') + (x.ket_qua ? ': ' + x.ket_qua : ''))];
        }), ['6%', '26%', '25%', '26%', '17%'], 3));
    h += muc('C. Trao đổi riêng, phản ánh với cha mẹ học sinh') + (loc
      ? dong('Trao đổi riêng: ' + so(m.trao_doi_so) + ' lần; phản ánh, kiến nghị: ' + so(m.phan_anh_so) + ' lần <i>(chỉ số lượng)</i>.')
      : bang(['Ngày', 'Học sinh', 'Nội dung', 'Phản hồi, việc cần làm'], (m.trao_doi || []).map(function (x) {
          return [ngayVN(x.ngay), c(x.hoc_sinh), c((x.loai === 'phan_anh' ? '[Phản ánh] ' : '') + x.noi_dung), c([x.phan_hoi, x.ket_luan].filter(Boolean).join(' — '))];
        }), ['13%', '27%', '33%', '27%'], 3));
    h += muc('D. Học sinh thuộc diện chính sách, cần quan tâm') + (loc
      ? dong('Diện chính sách: ' + so(hc.chinh_sach) + ' em; cần quan tâm: ' + so(hc.can_quan_tam) + ' em <i>(chỉ số lượng)</i>.')
      : bang(['TT', 'Họ và tên', 'Diện / hoàn cảnh', 'Ở với', 'Sức khỏe cần lưu ý'], (m.hoan_canh || []).filter(function (x) { return x.dien.length || x.can_quan_tam; }).map(function (x, i) {
          return [i + 1, c(x.ho_ten), c(x.dien.map(function (d) { return TEN_CS[d] || d; }).concat(x.can_quan_tam ? ['Cần quan tâm'] : []).join('; ')), c(x.o_voi), c(x.suc_khoe)];
        }), ['6%', '27%', '28%', '17%', '22%'], 3));
    if (loc) h += muc('E. Sự việc cần lưu ý (an toàn, bắt nạt…)') + dong('Đã ghi ' + so(m.su_viec_so) + ' sự việc <i>(nội dung chỉ giáo viên chủ nhiệm và Ban giám hiệu xem)</i>.');
    h += '<p class="nghieng" style="font-size:11pt;margin:6pt 0 0">Sổ có dữ liệu cá nhân của học sinh (Luật Bảo vệ dữ liệu cá nhân 2025): lưu hành nội bộ, không chia sẻ lên nhóm mạng xã hội.</p>';

    // ── NHẬN XÉT BGH · THEO DÕI KIỂM TRA · KHỐI KÝ ──
    var dsNop = tc.dsNop || [], dsDuyet = (tc.dsDuyet || []).slice().sort(function (a, b) { return String(a.luc) < String(b.luc) ? -1 : 1; });
    var kk = khoiKyDuLieu(dsNop, dsDuyet);
    h += NGAT + tieuDe('NHẬN XÉT CỦA BAN GIÁM HIỆU VỀ CÔNG TÁC CHỦ NHIỆM') +
      (kk.bgh && kk.bgh.nhan_xet ? van(kk.bgh.nhan_xet) + cham(2) : cham(8)) +
      kyKy('', kk.bgh && kk.bgh.luc, '<b>BAN GIÁM HIỆU</b>', kk.bgh ? kk.bgh.ho_ten : '');
    var lanCua = {}; dsNop.forEach(function (n) { lanCua[n.id] = n.lan; });
    h += tieuDe('BẢNG THEO DÕI KIỂM TRA SỔ CHỦ NHIỆM', 13) +
      bang(['Lần', 'Kỳ', 'Người kiểm tra (chức vụ)', 'Ngày', 'Nhận xét, yêu cầu', 'Trạng thái', 'Xác nhận'], dsDuyet.map(function (x, i) {
        return [i + 1, c(TEN_KY_NOP[x.ky] || x.ky) + (x.lan ? ' <i>(lần nộp ' + x.lan + ')</i>' : ''), c(x.ho_ten || '') + (x.chuc_vu ? '<br><i>' + c(x.chuc_vu) + '</i>' : ''),
          ngayVN(String(x.luc || '').slice(0, 10)), c(x.nhan_xet || ''), c(TEN_TT_NOP[x.ket_qua] || x.ket_qua), '<span style="font-size:10pt">Điện tử ' + gioVN(x.luc) + ' · mã ' + maNgan(x.ma_bam) + '</span>'];
      }), ['6%', '13%', '20%', '11%', '24%', '11%', '15%'], 8);
    var laHT = kk.bgh && /^\s*hiệu trưởng/i.test(kk.bgh.chuc_vu || '');
    var o = function (tieu, ghi, x, ten, luc, bam) {
      return '<td style="border:none;width:33%;text-align:center;vertical-align:top;font-size:12pt"><b>' + tieu + '</b><br><span class="nghieng">(Ký, ghi rõ họ tên)</span>' +
        (x ? '<br><span class="nghieng" style="font-size:11pt">' + ghi + '</span>' : '') + '<div style="height:44pt"></div>' +
        (ten ? '<b>' + c(ten) + '</b>' : '<span style="letter-spacing:1pt">.............................</span>') +
        (x ? '<br><span style="font-size:9.5pt">Xác nhận điện tử trên hệ thống Quản trị số lúc ' + gioVN(luc) + ' · mã ' + maNgan(bam) + '</span>' : '') + '</td>';
    };
    h += '<table style="border:none;width:100%;margin-top:14pt"><tr>' +
      o('GIÁO VIÊN CHỦ NHIỆM', 'Đã nộp điện tử', kk.gv, kk.gv ? (kk.gv.ho_ten_nop || m.gvcn) : m.gvcn, kk.gv && kk.gv.nop_luc, kk.gv && kk.gv.ma_bam) +
      o('TỔ TRƯỞNG CHUYÊN MÔN', 'Đã kiểm tra điện tử', kk.to, kk.to && kk.to.ho_ten, kk.to && kk.to.luc, kk.to && kk.to.ma_bam) +
      o(laHT ? 'HIỆU TRƯỞNG' : 'KT. HIỆU TRƯỞNG<br>PHÓ HIỆU TRƯỞNG', 'Đã duyệt điện tử', kk.bgh, kk.bgh && kk.bgh.ho_ten, kk.bgh && kk.bgh.luc, kk.bgh && kk.bgh.ma_bam) +
      '</tr></table>';
    h += '<p class="nghieng" style="font-size:10.5pt;margin-top:10pt">Sổ chủ nhiệm lớp ' + c(lop) + ', năm học ' + c(namCach) + ' — ' +
      (tc.nop ? 'Mã bản: ' + maNgan(tc.nop.ma_bam) + ' (SHA-256 của bản chụp nộp lúc ' + gioVN(tc.nop.nop_luc) + ')' : loc ? 'bản xem trước, chưa nộp kiểm tra' : 'BẢN LÀM VIỆC, xuất lúc ' + gioVN(new Date().toISOString())) + '.</p>';
    // Bìa một section (có viền), ruột một section (không viền) — tệp Word hoàn chỉnh
    return W.khungWordBiaAnh('Sổ chủ nhiệm lớp ' + lop + (loc ? ' (bản nộp tổ)' : ''), bia, h, ANH_BIA);
  }

  // ══════════ XEM SỔ CHỦ NHIỆM — KHUNG XEM TRƯỚC (28/9/2026) ══════════
  // Một nút "Xem sổ chủ nhiệm" → lớp phủ toàn màn: các tờ A4 dựng từ CHÍNH HTML
  // đem đi xuất Word (iframe srcdoc — kiểu chữ Times New Roman cỡ như Word, cô
  // lập khỏi CSS của app). Chọn bản: bản lưu hồ sơ (đầy đủ) | bản nộp tổ chuyên
  // môn (đã lọc — CHỈ BGH/quản trị và tổ trưởng được giao; GVCN chỉ có bản lưu
  // hồ sơ). "Lưu về máy (Word)" tải đúng bản đang xem; "In" in nội dung xem trước.
  var XT = { mo: false, ban: 'day_du', coBan: ['day_du'], lop: '', nam: '', moHinh: {}, nop: null, html: '', dem: 0, truoc: null };
  var TEN_BAN = { day_du: 'Sổ chủ nhiệm (bản lưu hồ sơ)', nop_duyet: 'Bản nộp tổ chuyên môn' };
  var SVG = {
    mat: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>',
    tai: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v11"/><path d="M7 10l5 5 5-5"/><path d="M5 20h14"/></svg>',
    inAn: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 9V3h10v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M7 14h10v7H7z"/></svg>',
    dong: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>'
  };
  // Bản nộp tổ chuyên môn chỉ BGH / quản trị và tổ trưởng được giao mới chọn được
  function banXemDuoc() { return laBGH() || D.laToKT ? ['day_du', 'nop_duyet'] : ['day_du']; }
  function tenTepWord(lop, nam, loc) { return 'so-chu-nhiem-lop-' + String(lop).toLowerCase().replace(/\s+/g, '') + '-' + nam + (loc ? '-ban-nop-to' : '') + '.doc'; }

  // HTML Word hoàn chỉnh của một mô hình (bìa section 1 có viền, ruột section 2)
  // Ảnh nền bìa màu: tên tệp trong gói Word (MHTML) và đường dẫn trên web
  var ANH_BIA = 'bia-so-chu-nhiem.jpg', ANH_BIA_WEB = 'img/bia-so-chu-nhiem.jpg';
  function htmlWord(m, nop) {
    var lop = m.lop || D.lop;
    return wordSo(m, { nop: nop || null, tt27: D.tt27 ? window.SCN_TT27 : null, to: toCuaKhoi(m.khoi),
      dsNop: D.dv.nop.filter(function (n) { return chuanLop(n.lop) === chuanLop(lop); }),
      dsDuyet: D.dv.duyet.filter(function (x) { return chuanLop(x.lop) === chuanLop(lop); }) });
  }
  // Kiểu riêng của bản XEM TRƯỚC, chèn vào cuối <head> của chính tệp Word: nền
  // xám, mỗi section một tờ A4 trắng có bóng; bìa có viền đôi đúng lề của Word;
  // mỗi ngắt trang trong ruột thành một khe xám giữa hai tờ. Khi in: bìa một
  // trang không lề (tự vẽ lề + viền), ruột theo lề thể thức.
  // 🔴 text-size-adjust: Safari trên iPhone tự PHÓNG TO chữ trong khung hẹp
  //    ("text autosizing") nhưng giữ nguyên chiều cao dòng Word (pt) → chữ đè
  //    lên nhau, tờ A4 tràn phải (ảnh thầy Chung 28/9/2026). Tắt hẳn đi.
  var CSS_XEM = '<style>' +
    'html{-webkit-text-size-adjust:none;text-size-adjust:none}' +
    'html{background:#e4e7ec}body{margin:0;padding:24px 12px 40px;background:#e4e7ec}' +
    '.WordSection1,.WordSection2{box-sizing:border-box;width:21cm;margin:0 auto 24px;background:#fff;' +
    'box-shadow:0 1px 3px rgba(15,23,42,.12),0 10px 28px rgba(15,23,42,.12)}' +
    // Bìa màu: ảnh nền phủ kín tờ, lề 1 cm như section 1 trong Word
    // +19pt: trình duyệt đặt chữ giữa dòng cao cố định, Word đặt sát đáy dòng —
    // đo chồng hai bản 29/9/2026 lệch ~19pt, bù ở lề trên cho bản xem khớp tệp Word.
    '.WordSection1{position:relative;height:29.7cm;overflow:hidden;padding:calc(1cm + 19pt) 1cm 0.5cm;' +
    'background:#bfe6fb url(' + ANH_BIA_WEB + ') center/100% 100% no-repeat;-webkit-print-color-adjust:exact;print-color-adjust:exact}' +
    '.WordSection2{min-height:29.7cm;padding:2cm 1.5cm 2cm 3cm}' +
    '.WordSection2 p[style*="page-break-before"]{height:24px;margin:2cm -1.5cm 2cm -3cm !important;background:#e4e7ec;font-size:0 !important;line-height:0 !important;' +
    'box-shadow:inset 0 6px 8px -6px rgba(15,23,42,.25),inset 0 -6px 8px -6px rgba(15,23,42,.25)}' +
    'br[style*="section-break"]{display:none}' +
    '@page WordSection1{margin:0;border:none;padding:0}' +
    '@media print{html{zoom:1 !important}html,body{background:#fff;padding:0}' +
    '.WordSection1,.WordSection2{box-shadow:none;margin:0;width:auto;min-height:0}' +
    '.WordSection1{height:29.6cm;overflow:hidden;page-break-after:always;padding:calc(1cm + 19pt) 1cm 0.5cm}.WordSection2{padding:0}' +
    '.WordSection2 p[style*="page-break-before"]{height:0;margin:0 !important;background:none;box-shadow:none;page-break-before:always}}' +
    '</style>';
  function htmlXem(html) { return html.replace('</head>', CSS_XEM + '</head>'); }

  // Mô hình của bản đang chọn (có đệm trong lúc khung đang mở)
  function layMoHinh(ban) {
    if (XT.moHinh[ban]) return Promise.resolve(XT.moHinh[ban]);
    var ghi = function (m) { XT.moHinh[ban] = m; return m; };
    if (ban !== 'nop_duyet') return Promise.resolve(ghi(dungMoHinh()));
    // Bản nộp tổ: máy chủ dựng bản xem trước (cùng hàm lọc lúc nộp)
    if (!may()) return Promise.resolve(ghi(locBanChup(dungMoHinh())));
    return may().rpc('scn_ban_chup', { p_nam: D.nam, p_lop: XT.lop }).then(function (r) {
      if (r.error) throw new Error(thieuBang(loiChu(r.error)) ? 'cơ sở dữ liệu chưa chạy sql/71.' : loiChu(r.error));
      return ghi(r.data);
    });
  }

  // Mở khung. tuy = { ban, coBan, moHinh, nop } — bản chụp đã nộp (màn duyệt) truyền sẵn mô hình
  // Mở thẳng một bản (bài kiểm tra dùng để soát bản nộp tổ đã lọc đúng chưa —
  // khung không còn công tắc hai bản).
  window.SCN_XEM_BAN = function (ban) { moXem({ ban: ban }); };
  function moXem(tuy) {
    tuy = tuy || {};
    XT.coBan = tuy.coBan || banXemDuoc();
    XT.ban = tuy.ban && XT.coBan.indexOf(tuy.ban) >= 0 ? tuy.ban : XT.coBan[0];
    XT.moHinh = {}; XT.nop = tuy.nop || null; XT.html = '';
    if (tuy.moHinh) XT.moHinh[XT.ban] = tuy.moHinh;
    XT.lop = (tuy.moHinh && tuy.moHinh.lop) || D.lop; XT.nam = (tuy.moHinh && tuy.moHinh.nam_hoc) || D.nam;
    if (!XT.mo) XT.truoc = document.activeElement;
    XT.mo = true;
    dungKhungXem();
    veXem();
  }
  function dongXem() {
    var k = document.getElementById('scn-xt');
    if (k) k.parentNode.removeChild(k);
    XT.mo = false; XT.moHinh = {}; XT.html = ''; XT.dem++;
    document.documentElement.classList.remove('scn-xt-khoa');
    document.removeEventListener('keydown', phimXem, true);
    if (XT.truoc && XT.truoc.focus && document.body.contains(XT.truoc)) XT.truoc.focus();
  }
  function phimXem(e) {
    if (!XT.mo) return;
    if (e.key === 'Escape' || e.key === 'Esc') { e.preventDefault(); e.stopPropagation(); dongXem(); return; }
    if (e.key === 'Tab') {
      // Giữ tiêu điểm trong khung (hộp thoại)
      var k = document.getElementById('scn-xt'); if (!k) return;
      var ds = Array.prototype.slice.call(k.querySelectorAll('button:not([disabled]), input, iframe:not([hidden])'));
      if (!ds.length) return;
      var dau = ds[0], cuoi = ds[ds.length - 1];
      if (e.shiftKey && document.activeElement === dau) { e.preventDefault(); cuoi.focus(); }
      else if (!e.shiftKey && document.activeElement === cuoi) { e.preventDefault(); dau.focus(); }
    }
  }
  function dungKhungXem() {
    var k = document.getElementById('scn-xt');
    if (k) return k;
    k = document.createElement('div');
    k.id = 'scn-xt'; k.className = 'scn-xt';
    k.setAttribute('role', 'dialog'); k.setAttribute('aria-modal', 'true'); k.setAttribute('aria-labelledby', 'scn-xt-td');
    k.innerHTML = '<div class="scn-xt-hop">' +
      '<header class="scn-xt-dau"><div class="scn-xt-tieu"><h2 id="scn-xt-td"></h2></div>' +
      '<div class="scn-xt-nut">' +
      '<button type="button" class="scn-xt-luu" data-xt="luu">' + SVG.tai + '<span>Lưu về máy (Word)</span></button>' +
      '<button type="button" class="scn-xt-in" data-xt="in">' + SVG.inAn + '<span>In</span></button>' +
      '<button type="button" class="scn-xt-dong" data-xt="dong" aria-label="Đóng" title="Đóng (Esc)">' + SVG.dong + '</button></div></header>' +
      '<div class="scn-xt-cuon"><div class="scn-xt-cho" id="scn-xt-cho">Đang dựng bản xem trước…</div>' +
      '<iframe class="scn-xt-khung" id="scn-xt-khung" title="Xem trước sổ chủ nhiệm" hidden></iframe></div></div>';
    document.body.appendChild(k);
    k.addEventListener('click', function (e) {
      if (e.target === k) { dongXem(); return; }
      var b = e.target.closest ? e.target.closest('button') : null;
      if (!b || b.disabled) return;
      var x = b.getAttribute('data-xt'), ban = b.getAttribute('data-ban');
      if (ban) { if (ban !== XT.ban) { XT.ban = ban; veXem(); } return; }
      if (x === 'dong') dongXem(); else if (x === 'luu') luuXem(); else if (x === 'in') inXem();
    });
    k.querySelector('#scn-xt-khung').addEventListener('load', coGianXem);
    if (!dungKhungXem.coResize) { dungKhungXem.coResize = true; window.addEventListener('resize', function () { if (XT.mo) coGianXem(); }); }
    document.addEventListener('keydown', phimXem, true);
    document.documentElement.classList.add('scn-xt-khoa');
    var nutDong = k.querySelector('[data-xt="dong"]'); if (nutDong && nutDong.focus) nutDong.focus();
    return k;
  }
  // Điện thoại: thu nhỏ tờ A4 cho vừa bề ngang khung
  function coGianXem() {
    var ifr = document.getElementById('scn-xt-khung');
    var d = ifr && ifr.contentDocument;
    if (!d || !d.documentElement || !ifr.clientWidth) return;
    var k = Math.min(1, (ifr.clientWidth - 16) / 820);
    d.documentElement.style.zoom = k < 1 ? String(Math.max(0.3, k)) : '';
  }
  function veXem() {
    var k = dungKhungXem(), loc = XT.ban === 'nop_duyet', lan = ++XT.dem;
    // Khung gọn (thầy Chung 29/9/2026): một hàng tiêu đề + nút, KHÔNG công tắc
    // hai bản, KHÔNG ô Thông tư 27 (luôn kèm), KHÔNG dòng mô tả. Bản nộp tổ
    // (tổ trưởng / BGH mở từ màn Kiểm tra – Duyệt) chỉ ghi thêm đuôi ngắn.
    k.querySelector('#scn-xt-td').textContent = 'Sổ chủ nhiệm lớp ' + XT.lop + ' · Năm học ' + XT.nam +
      (XT.nop ? ' · Bản nộp tổ lần ' + XT.nop.lan : loc ? ' · Bản nộp tổ' : '');
    var cho = k.querySelector('#scn-xt-cho'), ifr = k.querySelector('#scn-xt-khung'), luu = k.querySelector('[data-xt="luu"]'), nIn = k.querySelector('[data-xt="in"]');
    cho.textContent = 'Đang dựng bản xem trước…'; cho.hidden = false; ifr.hidden = true; luu.disabled = true; nIn.disabled = true; XT.html = '';
    if (!window.WORD_TIEN_ICH) { cho.textContent = 'Chưa tải được bộ xuất Word.'; return; }
    napTT27().then(function () { return layMoHinh(XT.ban); }).then(function (m) {
      if (lan !== XT.dem || !XT.mo) return;
      XT.html = htmlWord(m, XT.nop);
      ifr.srcdoc = htmlXem(XT.html);
      cho.hidden = true; ifr.hidden = false; luu.disabled = false; nIn.disabled = false;
    }).catch(function (e) {
      if (lan !== XT.dem) return;
      cho.textContent = 'Chưa dựng được ' + TEN_BAN[XT.ban].toLowerCase() + ': ' + loiChu(e);
    });
  }
  // Ảnh bìa đọc một lần, giữ dạng base64 để gói vào tệp Word
  var ANH_BIA_B64 = null;
  function docAnhBia() {
    if (ANH_BIA_B64) return Promise.resolve(ANH_BIA_B64);
    if (!window.fetch || !window.FileReader) return Promise.reject(new Error('trình duyệt không đọc được ảnh'));
    return fetch(ANH_BIA_WEB).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.blob(); })
      .then(function (b) {
        return new Promise(function (xong, hong) {
          var fr = new FileReader();
          fr.onload = function () { ANH_BIA_B64 = String(fr.result).split(',')[1] || ''; xong(ANH_BIA_B64); };
          fr.onerror = function () { hong(fr.error); };
          fr.readAsDataURL(b);
        });
      });
  }
  function luuXem() {
    if (!XT.html) return;
    var loc = XT.ban === 'nop_duyet', html = XT.html, ten = tenTepWord(XT.lop, XT.nam, loc), W = window.WORD_TIEN_ICH;
    var xong = function (kem) {
      bao('Đã tải ' + (loc ? 'bản nộp tổ chuyên môn' : 'sổ chủ nhiệm (bản lưu hồ sơ)') + ' lớp ' + XT.lop + '.' + (kem || ''));
    };
    if (!W.taiVeMHT || !window.fetch || !window.FileReader) { W.taiVe(html, ten); xong(); return; }
    docAnhBia().then(function (b64) {
      W.taiVeMHT(html, ten, [{ ten: ANH_BIA, loai: 'image/jpeg', b64: b64 }]); xong();
    }, function () {
      // Không đọc được ảnh (mất mạng…) thì vẫn cho tải — bìa không có nền màu
      W.taiVe(html, ten); xong(' Chưa tải được ảnh nền bìa — bìa không có màu.');
    });
  }
  function inXem() {
    var ifr = document.getElementById('scn-xt-khung');
    var w = ifr && ifr.contentWindow;
    if (!w || !XT.html) return;
    try { w.focus(); w.print(); } catch (e) { bao('Trình duyệt chặn lệnh in: ' + loiChu(e)); }
  }
  // Phụ lục TT27 nạp lười — chỉ khi người xem tích ô
  function napTT27() {
    if (!D.tt27 || window.SCN_TT27) return Promise.resolve();
    return new Promise(function (xong) {
      var s = document.createElement('script');
      var v = (String((document.querySelector('script[src*="so-chu-nhiem.js"]') || {}).src || '').match(/\?v=\d+/) || [''])[0];
      s.src = 'js/so-chu-nhiem-tt27.js' + v;
      s.onload = function () { xong(); };
      s.onerror = function () { bao('Không tải được phần trích Thông tư 27 — xem không kèm phụ lục.'); xong(); };
      // Mạng treo: quá 8 giây thì dựng sổ không kèm phụ lục, đừng để khung quay mãi
      setTimeout(xong, 8000);
      document.head.appendChild(s);
    });
  }
  // Tổ trưởng / BGH ở màn duyệt: xem bản chụp đã nộp — chỉ có bản nộp tổ
  function xemBanChup() {
    var n = nopTheoId(D.moNop);
    if (!n || !D.bcMo) return;
    moXem({ ban: 'nop_duyet', coBan: ['nop_duyet'], moHinh: D.bcMo, nop: n });
  }

  // ══════════ SỰ KIỆN ══════════
  // Gắn sự kiện ô chọn: mỗi hàm nhận CHÍNH ô của nó (bản trước dùng chung một
  // biến o cho mọi closure → lúc đổi lớp, o đã trỏ sang ô ngày / null).
  function ganChung() {
    function gan(id, fn) { var o = document.getElementById(id); if (o) o.onchange = function () { fn(o); }; }
    gan('scn-lop', function (o) { D.lop = o.value; D.tab = D.tab || 'tong-quan'; D.dangNap = true; ve(); napLop().then(function () { ve(); }); });
    gan('scn-co-so', function (o) {
      D.locCoSo = o.value;
      var ds = D.dsLop.filter(function (l) { return !D.locCoSo || l.coSo === D.locCoSo; });
      if (ds.length && !ds.some(function (l) { return l.lop === D.lop; })) { D.lop = ds[0].lop; D.dangNap = true; ve(); napLop().then(function () { ve(); }); } else ve();
    });
    gan('dv-ky', function (o) { D.kyNop = o.value; ve(); });
    gan('dv-loc-ky', function (o) { D.locKy = o.value; D.moNop = null; ve(); });
    gan('dv-loc-tt', function (o) { D.locTT = o.value; D.moNop = null; ve(); });
    gan('hop-ky', function (o) { D.hopKy = o.value; ve(); });
    gan('kh-thang', function (o) { D.thangKH = o.value; ve(); });
    gan('kh-tuan', function (o) { D.tuanKH = +o.value; ve(); });
    gan('td-ngay', function (o) { if (/^\d{4}-\d{2}-\d{2}$/.test(o.value)) { D.ngayTD = o.value; ve(); } });
    Array.prototype.slice.call(EL.querySelectorAll('[data-ly]')).forEach(function (i) { i.oninput = function () { D.ddTam.ly[i.getAttribute('data-ly')] = i.value; }; });
  }
  function khiBam(e) {
    var b = e.target.closest ? e.target.closest('button') : null;
    if (!b || !EL.contains(b) || b.disabled) return;
    var a = function (k) { return b.getAttribute(k); };
    if (a('data-tab')) { D.tab = a('data-tab'); D.sua = null; ve(); return; }
    if (a('data-cap')) { D.capKH = a('data-cap'); ve(); return; }
    if (a('data-buoi')) { D.buoiTD = a('data-buoi'); ve(); return; }
    if (a('data-lui')) { D.ngayTD = congNgay(D.ngayTD || homNay(), +a('data-lui')); ve(); return; }
    if (a('data-dd') != null) { D.ddTam.tt[a('data-dd')] = a('data-gt') || ''; ve(); return; }
    if (a('data-chon')) { D.chon[a('data-chon')] = !D.chon[a('data-chon')]; b.classList.toggle('on'); capNhatNutGhi(); return; }
    if (a('data-loai')) { D.loaiTD = a('data-loai'); var nd = giaTri('td-noi-dung'); ve(); var t = document.getElementById('td-noi-dung'); if (t) t.value = nd; return; }
    if (a('data-goi-y')) { var ta = document.getElementById('td-noi-dung'); if (ta) { ta.value = ta.value ? ta.value + '; ' + a('data-goi-y') : a('data-goi-y'); ta.focus(); } return; }
    if (a('data-hs')) { D.hsMo = D.hsMo === a('data-hs') ? '' : a('data-hs'); ve(); return; }
    if (a('data-ky-dg')) { D.kyDG = a('data-ky-dg'); ve(); return; }
    if (a('data-ky-tk')) { D.kyTK = a('data-ky-tk'); ve(); return; }
    if (a('data-xoa-td')) { xoaDong('scn_theo_doi', 'theoDoi', +a('data-xoa-td')); return; }
    if (a('data-xoa-ll')) { xoaDong('scn_lien_lac', 'lienLac', +a('data-xoa-ll')); return; }
    if (a('data-xoa-ht')) { xoaDong('scn_ho_tro', 'hoTro', +a('data-xoa-ht')); return; }
    if (a('data-sua-ll')) { D.sua = { bang: 'scn_lien_lac', dong: D.so.lienLac.filter(function (x) { return x.id === +a('data-sua-ll'); })[0] }; ve(); return; }
    if (a('data-sua-ht')) { D.sua = { bang: 'scn_ho_tro', dong: D.so.hoTro.filter(function (x) { return x.id === +a('data-sua-ht'); })[0] }; ve(); return; }
    if (a('data-mo-nop')) { moNop(+a('data-mo-nop')); return; }
    if (a('data-kq')) { xacNhan(a('data-kq'), b); return; }
    if (a('data-nd-xoa')) { ndXoa(+a('data-nd-xoa')); return; }
    if (a('data-goi-y-ht')) { D.sua = { bang: 'moi', moi: { hoc_sinh_ma: a('data-goi-y-ht'), loai: a('data-loai-ht'), bieu_hien: a('data-bh') } }; ve(); var f = document.getElementById('scn-form-ht'); if (f) f.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
    var act = a('data-act');
    if (!act) return;
    var H = {
      'hom-nay': function () { D.ngayTD = homNay(); ve(); },
      'chon-het': function () { D.hs.forEach(function (h) { D.chon[h.ma] = true; }); ve(); },
      'bo-chon': function () { D.chon = {}; ve(); },
      'huy-sua': function () { D.sua = null; ve(); },
      'tu-sinh': function () { var t = document.getElementById('kh-dac-diem'), g = document.getElementById('kh-goi-y'); if (t && g) t.value = t.value ? t.value + '\n' + g.textContent : g.textContent; },
      'them-bcs': function () { var v = document.getElementById('scn-bcs'); if (v) { var d = document.createElement('div'); d.innerHTML = dongBCS({ chuc_vu: '' }, v.children.length + 100); v.appendChild(d.firstChild); } },
      'xoa-bcs': function () { var d = b.closest('.scn-bcs-dong'); if (d) d.parentNode.removeChild(d); },
      'them-bdd': function () { var v = document.getElementById('scn-bdd'); if (v && v.firstChild) { var c = v.firstChild.cloneNode(true); Array.prototype.slice.call(c.querySelectorAll('input')).forEach(function (i) { i.value = ''; }); v.appendChild(c); } },
      'xoa-bdd': function () { var d = b.closest('.scn-bdd-dong'); if (d) d.parentNode.removeChild(d); },
      'luu-bcs': luuBCS, 'luu-bdd': luuBDD, 'luu-hc': function () { luuHoanCanh(a('data-ma'), b); },
      'luu-kh-nam': function () { luuKeHoach('nam', b); }, 'luu-kh-thang': function () { luuKeHoach('thang', b); }, 'luu-kh-tuan': function () { luuKeHoach('tuan', b); },
      'luu-dd': function () { luuDiemDanh(b); }, 'luu-td': function () { luuTheoDoi(b); },
      'luu-hop': function () { luuLienLac('hop', a('data-id'), b); }, 'luu-tdph': function () { luuLienLac('', a('data-id'), b); },
      'luu-ht': function () { luuHoTro(a('data-id'), b); }, 'luu-tk': function () { luuTongKet(b); },
      'khoa': function () { datKhoa(giaTri('scn-khoa') || null, b); }, 'mo-khoa': function () { datKhoa(null, b); },
      'xem-so': function () { moXem(); }, 'xem-bc': xemBanChup,
      'nop-ky': function () { nopKy(b); }, 'nd-them': function () { ndThem(b); }, 'bo-loc-lop': function () { D.lopLoc = ''; ve(); },
      'mo-so': function () { var l = a('data-lop'); D.moNop = null; D.che = 'so'; D.lop = l; D.tab = 'tong-quan'; D.dangNap = true; ve(); napLop().then(function () { ve(); }); },
      'them-ct': function () { var v = document.getElementById('kh-cuoc-thi'); if (v) { var d = document.createElement('div'); d.innerHTML = dongCuocThi(false)({}); v.appendChild(d.firstChild); } },
      'xoa-ct': function () { var d = b.closest('.scn-ct-dong'); if (d) d.parentNode.removeChild(d); }
    };
    if (H[act]) H[act]();
  }
  function capNhatNutGhi() {
    var n = Object.keys(D.chon).filter(function (m) { return D.chon[m]; }).length;
    var nut = EL.querySelector('[data-act="luu-td"]'); if (nut) nut.textContent = 'Ghi ' + (n ? 'cho ' + n + ' em' : 'chung cả lớp');
    var ghiChu = EL.querySelector('[data-act="bo-chon"] + .scn-ghi-chu'); if (ghiChu) ghiChu.textContent = 'Đã chọn ' + n + ' em';
  }

  // ══════════ GHI ══════════
  // Mọi lệnh ghi đi qua đây. Bản xem thử: sửa trong bộ nhớ, nói rõ không lưu.
  function ghiMay(hua, nut, xong) {
    if (nut) nut.disabled = true;
    return Promise.resolve(hua).then(function (r) {
      if (r && r.error) throw r.error;
      if (xong) xong(r ? r.data : null);
      return r;
    }).catch(function (e) {
      var m = loiChu(e);
      bao('Chưa lưu được: ' + (/row-level security|violates|permission/i.test(m) ? 'không đủ quyền (chỉ GVCN của lớp ghi được, và ngày chưa bị khoá sổ).' : thieuBang(m) ? 'cơ sở dữ liệu chưa chạy sql/69.' : m));
      if (nut) nut.disabled = false;
      return null;
    });
  }
  var COT_71 = { scn_hoan_canh: ['ton_giao', 'cha_me_ten', 'nghe_nghiep', 'sdt', 'dia_chi', 'xom', 'ngoai_xa', 'hoan_canh_gd', 'dac_diem'],
    scn_ho_tro: ['moc', 'hs_giup_do'], scn_lop: ['gvcn_sdt'], scn_lien_lac: ['gio', 'dia_diem', 'muc'], scn_tong_ket: ['them'] };
  function boCotMoi(bang, dong) {
    if (D.co71 || !COT_71[bang]) return dong;
    var r = Object.assign({}, dong);
    COT_71[bang].forEach(function (k) { delete r[k]; });
    return r;
  }
  function xemThu(xong) { if (xong) xong(); bao('Bản xem thử — đã cập nhật trên màn hình, không lưu lên máy chủ.'); ve(); }

  function luuSCNLop(truong, nut, thongBao) {
    var dong = Object.assign({ nam_hoc: D.nam, lop: D.lop }, truong);
    if (!may()) return xemThu(function () { D.so.lop = Object.assign({}, D.so.lop || {}, dong); });
    ghiMay(may().from('scn_lop').upsert(boCotMoi('scn_lop', dong), { onConflict: 'nam_hoc,lop' }).select().maybeSingle(), nut, function (d) {
      D.so.lop = d || Object.assign({}, D.so.lop || {}, dong); bao(thongBao); ve();
    });
  }
  function luuBCS() {
    var ds = [];
    Array.prototype.slice.call(EL.querySelectorAll('.scn-bcs-dong')).forEach(function (d) {
      var cv = String(d.querySelector('[data-bcs-cv]').value || '').trim(), ma = d.querySelector('[data-bcs-hs]').value;
      if (cv && ma) ds.push({ chuc_vu: cv, hoc_sinh_ma: ma, ho_ten: tenHS(ma) });
    });
    luuSCNLop({ ban_can_su: ds, ngay_bau: giaTri('bcs-ngay') || null }, null, 'Đã lưu ban cán sự lớp.');
  }
  function luuBDD() {
    var ds = [];
    Array.prototype.slice.call(EL.querySelectorAll('.scn-bdd-dong')).forEach(function (d) {
      var ten = String(d.querySelector('[data-bdd-ten]').value || '').trim();
      if (ten) ds.push({ vai_tro: String(d.querySelector('[data-bdd-vt]').value || '').trim(), ho_ten: ten, sdt: String(d.querySelector('[data-bdd-sdt]').value || '').trim() });
    });
    luuSCNLop({ ban_dai_dien: ds, gvcn_sdt: giaTri('bdd-gvcn-sdt') || null }, null, 'Đã lưu Ban đại diện cha mẹ học sinh lớp.');
  }
  function datKhoa(ngay, nut) {
    var hoi = ngay ? 'Khoá sổ lớp ' + D.lop + ' đến hết ngày ' + ngayVN(ngay) + '? Giáo viên sẽ không sửa được các mục có ngày từ đó trở về trước.' : 'Mở khoá sổ lớp ' + D.lop + '?';
    var xn = window.hopHoi ? window.hopHoi(hoi, { tieuDe: 'Khoá sổ chủ nhiệm', nutOK: ngay ? 'Khoá sổ' : 'Mở khoá' }) : Promise.resolve(window.confirm(hoi));
    xn.then(function (ok) { if (ok) luuSCNLop({ khoa_den: ngay }, nut, ngay ? 'Đã khoá sổ đến ' + ngayVN(ngay) + '.' : 'Đã mở khoá sổ.'); });
  }
  function luuHoanCanh(ma, nut) {
    var cs = Array.prototype.slice.call(EL.querySelectorAll('[data-cs]')).filter(function (i) { return i.checked; }).map(function (i) { return i.getAttribute('data-cs'); });
    var chk = function (id) { var o = document.getElementById(id); return o ? !!o.checked : null; };
    var dong = { nam_hoc: D.nam, hoc_sinh_ma: ma, lop: D.lop, o_voi: giaTri('hc-o-voi') || null, dien_chinh_sach: cs,
      giay_xac_nhan: giaTri('hc-giay') || null, suc_khoe: giaTri('hc-suc-khoe') || null, co_bhyt: chk('hc-bhyt'), du_sgk: chk('hc-sgk'),
      can_quan_tam: !!chk('hc-quan-tam'), nang_khieu: giaTri('hc-nang-khieu') || null, ghi_chu: giaTri('hc-ghi-chu') || null,
      cha_me_ten: giaTri('hc-cha-me-ten') || null, nghe_nghiep: giaTri('hc-nghe') || null, sdt: giaTri('hc-sdt') || null, dia_chi: giaTri('hc-dia-chi') || null,
      xom: giaTri('hc-xom') || null, ngoai_xa: chk('hc-ngoai-xa'),
      hoan_canh_gd: giaTri('hc-hoan-canh-gd') || null, dac_diem: giaTri('hc-dac-diem') || null };
    var cu = D.so.hoanCanh[ma]; if (cu && cu.cha_me) dong.cha_me = cu.cha_me;
    if (document.getElementById('hc-kt')) { dong.kt_dang = giaTri('hc-kt') || null; dong.kt_co_giay = chk('hc-kt-giay'); }
    if (!may()) return xemThu(function () { D.so.hoanCanh[ma] = dong; });
    ghiMay(may().from('scn_hoan_canh').upsert(boCotMoi('scn_hoan_canh', dong), { onConflict: 'nam_hoc,hoc_sinh_ma' }).select().maybeSingle(), nut, function (d) {
      D.so.hoanCanh[ma] = d || dong; bao('Đã lưu hồ sơ ' + tenHS(ma) + '.'); ve();
    });
  }
  function luuKeHoach(cap, nut) {
    var k = khungNam(D.nam), ky = '', ngay, nd = {}, ketQua = null;
    if (cap === 'nam') {
      ngay = k ? k.batDau : D.nam.slice(0, 4) + '-09-01';
      var cuKH = keHoach('nam', '');
      nd = Object.assign({}, (cuKH && cuKH.noi_dung) || {}, { can_cu: giaTri('kh-can-cu'), dac_diem: giaTri('kh-dac-diem'), thuan_loi: giaTri('kh-thuan-loi'),
        kho_khan: giaTri('kh-kho-khan'), chi_tieu: giaTri('kh-chi-tieu'), shdc_phu_trach: giaTri('kh-shdc'),
        danh_hieu_lop: giaTri('kh-dh-lop'), danh_hieu_doi: giaTri('kh-dh-doi'), doi_vien_xs: giaTri('kh-dv-xs') });
      MUC_KH.forEach(function (m) { nd['kh_' + m[0]] = giaTri('kh-m-' + m[0]); });
      Object.assign(nd, docLuoiChiTieu());
      nd.cuoc_thi = [];
      Array.prototype.slice.call(EL.querySelectorAll('.scn-ct-dong')).forEach(function (d) {
        var ten = String(d.querySelector('[data-ct-ten]').value || '').trim();
        if (ten) nd.cuoc_thi.push({ ten: ten, chi_tieu: String(d.querySelector('[data-ct-so]').value || '').trim() });
      });
    } else if (cap === 'thang') {
      ky = D.thangKH; ngay = ky + '-01';
      nd = { day_hoc: giaTri('kh-day-hoc'), doi: giaTri('kh-doi'), khac: giaTri('kh-khac'), ghi_chu_db: giaTri('kh-ghi-chu-db') }; ketQua = giaTri('kh-ket-qua') || null;
    } else {
      ky = 'T' + pad(D.tuanKH); ngay = ngayDauTuan(D.nam, D.tuanKH);
      nd = { so_ket: giaTri('kh-so-ket'), chu_de: giaTri('kh-chu-de'), long_ghep: giaTri('kh-long-ghep'), tuan_toi: giaTri('kh-tuan-toi') };
    }
    var dong = { nam_hoc: D.nam, lop: D.lop, cap: cap, ky: ky, ngay: ngay, noi_dung: nd, ket_qua: ketQua };
    var thay = function (d) { D.so.keHoach = D.so.keHoach.filter(function (x) { return !(x.cap === cap && x.ky === ky); }).concat([d || dong]); };
    if (!may()) return xemThu(function () { thay(dong); });
    ghiMay(may().from('scn_ke_hoach').upsert(dong, { onConflict: 'nam_hoc,lop,cap,ky' }).select().maybeSingle(), nut, function (d) { thay(d); bao('Đã lưu kế hoạch.'); ve(); });
  }
  function luuDiemDanh(nut) {
    var ngay = D.ngayTD, b = D.buoiTD, tt = D.ddTam.tt, u = toi();
    var vangMoi = D.hs.filter(function (h) { return tt[h.ma]; }).map(function (h) {
      return { ngay: ngay, buoi: b, nam_hoc: D.nam, lop: D.lop, hoc_sinh_ma: h.ma, phep: tt[h.ma], ghi_chu: String(D.ddTam.ly[h.ma] || '').trim() || null, nguoi_ghi_id: u ? u.id : null };
    });
    var coMat = D.so.vang.filter(function (v) { return v.ngay === ngay && v.buoi === b && !tt[v.hoc_sinh_ma]; }).map(function (v) { return v.hoc_sinh_ma; });
    var ddl = { ngay: ngay, buoi: b, nam_hoc: D.nam, lop: D.lop, si_so: D.hs.length, so_vang: vangMoi.length, nguoi_ghi_id: u ? u.id : null };
    var capNhat = function () {
      D.so.vang = D.so.vang.filter(function (v) { return !(v.ngay === ngay && v.buoi === b); }).concat(vangMoi);
      D.so.ddl = D.so.ddl.filter(function (d) { return !(d.ngay === ngay && d.buoi === b); }).concat([ddl]);
      D.ddTam = null;
    };
    if (!may()) return xemThu(capNhat);
    if (!u) { bao('Chưa đăng nhập.'); return; }
    nut.disabled = true;
    var xoa = coMat.length ? may().from('hs_vang').delete().eq('ngay', ngay).eq('buoi', b).eq('nam_hoc', D.nam).eq('lop', D.lop).in('hoc_sinh_ma', coMat) : Promise.resolve({});
    ghiMay(Promise.resolve(xoa).then(function (r) {
      if (r && r.error) throw r.error;
      return vangMoi.length ? may().from('hs_vang').upsert(vangMoi, { onConflict: 'ngay,buoi,hoc_sinh_ma' }) : {};
    }).then(function (r) {
      if (r && r.error) throw r.error;
      return may().from('diem_danh_lop').upsert(ddl, { onConflict: 'ngay,buoi,nam_hoc,lop' });
    }), nut, function () { capNhat(); bao('Đã lưu điểm danh ' + (b === 'sang' ? 'buổi sáng' : 'buổi chiều') + ' ' + ngayVN(ngay) + ': vắng ' + vangMoi.length + '.'); ve(); });
  }
  function luuTheoDoi(nut) {
    var nd = giaTri('td-noi-dung');
    if (!nd) { bao('Chưa có nội dung.'); return; }
    var ma = Object.keys(D.chon).filter(function (m) { return D.chon[m]; });
    var ds = (ma.length ? ma : [null]).map(function (m) {
      return { nam_hoc: D.nam, lop: D.lop, ngay: D.ngayTD, hoc_sinh_ma: m, loai: D.loaiTD, linh_vuc: giaTri('td-linh-vuc') || null, noi_dung: nd, da_bao_cmhs: !!(document.getElementById('td-cmhs') || {}).checked };
    });
    var them = function (rows) { D.so.theoDoi = rows.concat(D.so.theoDoi); D.chon = {}; };
    if (!may()) return xemThu(function () { them(ds.map(function (x, i) { return Object.assign({ id: -Date.now() - i }, x); })); });
    ghiMay(may().from('scn_theo_doi').insert(ds).select(), nut, function (d) { them(d || []); bao('Đã ghi ' + ds.length + ' dòng.'); ve(); });
  }
  function luuLienLac(loai, id, nut) {
    var dong;
    if (loai === 'hop') {
      var kh = KHUNG_HOP[giaTri('hop-ky')], muc = {};
      if (kh) kh.muc.forEach(function (m) { var v = giaTri('hop-m-' + m[0]); if (v) muc[m[0]] = v; });
      dong = { loai: 'hop', ky_hop: giaTri('hop-ky'), ngay: giaTri('hop-ngay') || homNay(), so_du: giaTri('hop-du') === '' ? null : +giaTri('hop-du'), tong_so: giaTri('hop-tong') === '' ? null : +giaTri('hop-tong'),
        gio: giaTri('hop-gio') || null, dia_diem: giaTri('hop-dia-diem') || null, muc: muc,
        noi_dung: giaTri('hop-noi-dung') || null, phan_hoi: giaTri('hop-y-kien') || null, ket_luan: giaTri('hop-ket-luan') || null, hoc_sinh_ma: null, trang_thai: 'xong' };
      if (!dong.noi_dung && Object.keys(muc).length) dong.noi_dung = (kh ? kh.ten.charAt(0) + kh.ten.slice(1).toLowerCase() : 'Họp cha mẹ học sinh');
    } else {
      dong = { loai: giaTri('tdph-loai') || 'trao_doi', ngay: giaTri('tdph-ngay') || homNay(), hoc_sinh_ma: giaTri('tdph-hs') || null, kenh: giaTri('tdph-kenh') || null,
        trang_thai: giaTri('tdph-tt') || 'xong', noi_dung: giaTri('tdph-noi-dung') || null, phan_hoi: giaTri('tdph-phan-hoi') || null, ket_luan: giaTri('tdph-viec') || null };
    }
    if (!dong.noi_dung) { bao('Chưa có nội dung.'); return; }
    D.hopKy = '';
    luuDongDanhSach('scn_lien_lac', 'lienLac', dong, id, nut, 'Đã lưu.');
  }
  function luuHoTro(id, nut) {
    var dong = { hoc_sinh_ma: giaTri('ht-hs'), loai: giaTri('ht-loai'), ngay: giaTri('ht-ngay') || homNay(), bieu_hien: giaTri('ht-bieu-hien') || null, mon_ky_nang: giaTri('ht-mon') || null,
      bien_phap: giaTri('ht-bien-phap') || null, nguoi_phoi_hop: giaTri('ht-phoi-hop') || null, moc_xem_lai: giaTri('ht-moc-xl') || null, trang_thai: giaTri('ht-tt'), ket_qua: giaTri('ht-ket-qua') || null,
      moc: giaTri('ht-moc') || null, hs_giup_do: giaTri('ht-giup') || null };
    if (dong.hs_giup_do === dong.hoc_sinh_ma) { bao('Học sinh giúp đỡ phải là bạn khác.'); return; }
    if (!dong.hoc_sinh_ma) { bao('Chọn học sinh.'); return; }
    luuDongDanhSach('scn_ho_tro', 'hoTro', dong, id, nut, 'Đã lưu kế hoạch hỗ trợ ' + tenHS(dong.hoc_sinh_ma) + '.');
  }
  function luuDongDanhSach(bang, khoa, dong, id, nut, chu) {
    dong = Object.assign({ nam_hoc: D.nam, lop: D.lop }, dong);
    var thay = function (d) {
      d = d || dong;
      if (id) D.so[khoa] = D.so[khoa].map(function (x) { return x.id === +id ? Object.assign({}, x, d) : x; });
      else D.so[khoa] = [d].concat(D.so[khoa]);
      D.sua = null;
    };
    if (!may()) return xemThu(function () { thay(Object.assign({ id: id ? +id : -Date.now() }, dong)); });
    var gui = boCotMoi(bang, dong);
    var q = id ? may().from(bang).update(gui).eq('id', +id).select().maybeSingle() : may().from(bang).insert(gui).select().maybeSingle();
    ghiMay(q, nut, function (d) {
      if (id && !d) { bao('Không sửa được — không đủ quyền hoặc ngày đã khoá sổ.'); if (nut) nut.disabled = false; return; }
      thay(d); bao(chu); ve();
    });
  }
  function luuTongKet(nut) {
    var dong = { nam_hoc: D.nam, lop: D.lop, ky: D.kyTK, ngay: giaTri('tk-ngay') || homNay(), viec_lam_duoc: giaTri('tk-lam-duoc') || null,
      ton_tai: giaTri('tk-ton-tai') || null, de_xuat: giaTri('tk-de-xuat') || null };
    if (D.kyTK === 'ca_nam') {
      dong.ban_giao = giaTri('tk-ban-giao') || null;
      var kq = {};
      Array.prototype.slice.call(EL.querySelectorAll('[data-kq-thi]')).forEach(function (i) { var v = String(i.value || '').trim(); if (v) kq[i.getAttribute('data-kq-thi')] = v; });
      dong.them = Object.assign({}, (D.so.tongKet.ca_nam || {}).them || {}, { danh_hieu_lop: giaTri('tk-dh-lop') || null, cuoc_thi_kq: kq });
    }
    if (!may()) return xemThu(function () { D.so.tongKet[D.kyTK] = dong; });
    ghiMay(may().from('scn_tong_ket').upsert(boCotMoi('scn_tong_ket', dong), { onConflict: 'nam_hoc,lop,ky' }).select().maybeSingle(), nut, function (d) { D.so.tongKet[D.kyTK] = d || dong; bao('Đã lưu.'); ve(); });
  }
  function xoaDong(bang, khoa, id) {
    var xn = window.hopHoi ? window.hopHoi('Xoá dòng này khỏi sổ chủ nhiệm?', { tieuDe: 'Sổ chủ nhiệm', nutOK: 'Xoá', nguyHiem: true }) : Promise.resolve(window.confirm('Xoá dòng này?'));
    xn.then(function (ok) {
      if (!ok) return;
      var bo = function () { D.so[khoa] = D.so[khoa].filter(function (x) { return x.id !== id; }); };
      if (!may()) return xemThu(bo);
      ghiMay(may().from(bang).delete().eq('id', id).select('id'), null, function (d) {
        if (!d || !d.length) { bao('Không xoá được — không đủ quyền hoặc ngày đã khoá sổ.'); return; }
        bo(); bao('Đã xoá.'); ve();
      });
    });
  }

  // ══════════ LỐI TẮT TRÊN TRANG CHỦ (theo vai, 29/9/2026) ══════════
  // Thay thẻ module lớn "Sổ chủ nhiệm" ở trang chủ. GVCN: sổ lớp mình + kỳ nộp
  // tháng này; tổ trưởng/tổ phó được giao, BGH: số sổ đang chờ. Người khác: trống.
  var NHAC = { khoa: '', html: '' };
  // Buổi mặc định theo giờ: sau 12 giờ trưa là buổi chiều (GV mở điện thoại điểm danh
  // đầu buổi chiều khỏi phải bấm đổi buổi).
  function buoiMacDinh() { return new Date().getHours() >= 12 ? 'chieu' : 'sang'; }
  function laNgayHoc(iso) { var t = new Date(iso + 'T00:00:00').getDay(); return t >= 1 && t <= 5; }
  var TEN_BUOI = { sang: 'buổi sáng', chieu: 'buổi chiều' };
  function dongNhacGV(lop, moi, ky, dd, buoi, ngayHoc) {
    var tt = !moi ? 'chưa nộp' : moi.trang_thai === 'da_nop' ? 'đã nộp, chờ kiểm tra' : moi.trang_thai === 'yeu_cau_bo_sung' ? '<b class="scn-nhac-do">cần bổ sung</b>' : 'đã kiểm tra';
    var ddChu = !ngayHoc ? '' : dd
      ? '<span class="scn-nhac-dd xong">Điểm danh ' + TEN_BUOI[buoi] + ': vắng ' + dd.so_vang + '/' + dd.si_so + '</span>'
      : '<span class="scn-nhac-dd chua">Chưa điểm danh ' + TEN_BUOI[buoi] + '</span>';
    return '<div class="scn-nhac"><span class="scn-nhac-chu"><b>Sổ chủ nhiệm lớp ' + thoat(lop) + '</b> · ' + thoat(TEN_KY_NOP[ky] || ky) + ': ' + tt +
      (ddChu ? '<br>' + ddChu : '') + '</span>' +
      '<span class="scn-nhac-nut"><button type="button" data-scn-nhac="theo-doi" data-lop="' + thoat(lop) + '">' + (ngayHoc && !dd ? 'Điểm danh' : 'Điểm danh, ghi theo dõi') + '</button>' +
      '<button type="button" data-scn-nhac="mo" data-lop="' + thoat(lop) + '">Mở sổ</button></span></div>';
  }
  function dongNhacKT(n, bgh) {
    return '<div class="scn-nhac"><span class="scn-nhac-chu"><b>' + n + ' sổ chủ nhiệm</b> đang chờ ' + (bgh ? 'kiểm tra, duyệt' : 'tổ kiểm tra') + '</span>' +
      '<span class="scn-nhac-nut"><button type="button" data-scn-nhac="kiemtra">Mở kiểm tra sổ</button></span></div>';
  }
  // BGH: điểm danh toàn trường buổi hiện tại (điểm danh do GVCN làm trong sổ — thầy Chung chốt 29/9/2026)
  function dongNhacDDTruong(dsLop, ddl, buoi) {
    var da = {}, vang = 0;
    ddl.forEach(function (d) { if (d.buoi === buoi) { da[chuanLop(d.lop)] = 1; vang += +d.so_vang || 0; } });
    var chua = dsLop.filter(function (l) { return !da[chuanLop(l)]; });
    var soDa = dsLop.length - chua.length;
    return '<div class="scn-nhac"><span class="scn-nhac-chu"><b>Điểm danh ' + TEN_BUOI[buoi] + ' hôm nay: ' + soDa + '/' + dsLop.length + ' lớp</b>' +
      (soDa ? ' · vắng ' + vang + ' em' : '') +
      (chua.length ? '<details class="scn-nhac-ct"><summary>' + chua.length + ' lớp chưa điểm danh</summary>' + chua.map(thoat).join(', ') + '</details>' : ' · đủ các lớp') +
      '</span></div>';
  }
  function veNhacHome() {
    var o = document.getElementById('scn-nhac-home');
    if (!o) return;
    var nam = (window.CAU_HINH || {}).NAM_HOC || '', ky = kyGoiY(homNay()), hn = homNay(), buoi = buoiMacDinh(), ngayHoc = laNgayHoc(hn);
    if (!may()) { o.innerHTML = dongNhacGV('4A', null, ky, null, buoi, ngayHoc); return; }   // xem thử: khớp lớp mẫu 4A
    var u = toi();
    if (!u || !u.id || !nam) { o.innerHTML = ''; return; }
    var khoa = u.id + '|' + nam + '|' + hn + '|' + buoi;
    if (NHAC.khoa === khoa) { o.innerHTML = NHAC.html; return; }
    NHAC.khoa = khoa;
    var bgh = vaiTro() === 'admin' || vaiTro() === 'ban_giam_hieu';
    var rongNeuLoi = function (r) { return r && !r.error ? (r.data || []) : []; };
    Promise.all([
      may().from('phan_cong_day').select('lop').eq('nam_hoc', nam).eq('la_chu_nhiem', true).eq('nguoi_dung_id', u.id),
      // RLS: người không phải BGH chỉ đọc được dòng giao của chính mình
      may().from('scn_nguoi_duyet').select('email, khoi, co_so_ma').eq('nam_hoc', nam),
      may().from('scn_nop').select('lop, ky, lan, trang_thai, khoi, co_so_ma').eq('nam_hoc', nam).order('id').limit(5000),
      ngayHoc ? may().from('diem_danh_lop').select('lop, buoi, si_so, so_vang').eq('ngay', hn).eq('nam_hoc', nam).limit(2000) : null,
      ngayHoc && bgh ? may().from('lop_hoc').select('lop').eq('nam_hoc', nam) : null
    ]).then(function (r) {
      var lopToi = [];
      rongNeuLoi(r[0]).forEach(function (p) { if (lopToi.indexOf(p.lop) < 0) lopToi.push(p.lop); });
      lopToi.sort(function (a, b) { return chuanLop(a).localeCompare(chuanLop(b), 'vi', { numeric: true }); });
      var em = String(u.email || '').trim().toLowerCase();
      var giao = rongNeuLoi(r[1]).filter(function (d) { return String(d.email || '').toLowerCase() === em; });
      // Báo vai cho hàng thẻ Lớp học + nút "Mở sổ" ở Hồ sơ số (trước khi mở màn sổ)
      window.SCN_QUYEN = { gvcn: lopToi.length > 0, toKT: giao.length > 0 };
      var moi = nopMoiNhat(rongNeuLoi(r[2]));
      var ddl = rongNeuLoi(r[3]);
      var laLopToi = function (lop) { return lopToi.some(function (l) { return chuanLop(l) === chuanLop(lop); }); };
      var h = lopToi.map(function (l) {
        var dd = ddl.filter(function (d) { return chuanLop(d.lop) === chuanLop(l) && d.buoi === buoi; })[0];
        return dongNhacGV(l, moi.filter(function (n) { return chuanLop(n.lop) === chuanLop(l) && n.ky === ky; })[0], ky, dd, buoi, ngayHoc);
      }).join('');
      if (bgh && ngayHoc) {
        var dsLop = rongNeuLoi(r[4]).map(function (l) { return l.lop; })
          .sort(function (a, b) { return chuanLop(a).localeCompare(chuanLop(b), 'vi', { numeric: true }); });
        if (dsLop.length) h += dongNhacDDTruong(dsLop, ddl, buoi);
      }
      if (bgh || giao.length) {
        var cho = moi.filter(function (n) {
          if (laLopToi(n.lop)) return false;   // không tự kiểm tra lớp mình chủ nhiệm
          if (bgh) return n.trang_thai === 'da_nop' || (!laKyThang(n.ky) && n.trang_thai === 'da_kiem_tra');
          return n.trang_thai === 'da_nop' && laKyThang(n.ky) && trongPhamViTo(giao, n.khoi, n.co_so_ma);
        }).length;
        if (cho) h += dongNhacKT(cho, bgh);
      }
      if (NHAC.khoa !== khoa) return;
      NHAC.html = h; o.innerHTML = h;
      if (window.veTatCa && document.querySelector('#mh-hoso.hien')) window.veTatCa();
    }, function () { NHAC.khoa = ''; });
  }
  function ganNhacHome() {
    var o = document.getElementById('scn-nhac-home'), mh = document.getElementById('mh-home');
    if (!o) return;
    o.addEventListener('click', function (e) {
      var b = e.target && e.target.closest ? e.target.closest('[data-scn-nhac]') : null;
      if (!b) return;
      var viec = b.getAttribute('data-scn-nhac'), lop = b.getAttribute('data-lop') || '';
      if (viec === 'kiemtra') moKiemTra();
      else moLop(lop, viec === 'theo-doi' ? 'theo-doi' : 'tong-quan');
    });
    var hien = function () { if (!mh || mh.classList.contains('hien')) veNhacHome(); };
    if (mh && window.MutationObserver) new MutationObserver(hien).observe(mh, { attributes: true, attributeFilter: ['class'] });
    document.addEventListener('dangnhap-xong', function () { NHAC.khoa = ''; hien(); });
    hien();
  }

  // ══════════ GẮN VÀO TRANG ══════════
  // Vẽ khi màn #mh-sochunhiem được bật (app.js chỉ đổi lớp "hien"), bất kể đi
  // bằng menu, thẻ trang chủ hay #sochunhiem trên địa chỉ.
  function khiHien() {
    var mh = document.getElementById('mh-sochunhiem'), vung = document.getElementById('vung-sochunhiem');
    if (mh && vung && mh.classList.contains('hien')) { NHAC.khoa = ''; ve(vung); }   // về trang chủ thì lối tắt đọc lại (vừa nộp, vừa kiểm tra)
  }
  function gan() {
    ganNhacHome();
    var mh = document.getElementById('mh-sochunhiem'), vung = document.getElementById('vung-sochunhiem');
    if (!mh || !vung) return;
    EL = vung;
    vung.addEventListener('click', khiBam);
    if (window.MutationObserver) new MutationObserver(khiHien).observe(mh, { attributes: true, attributeFilter: ['class'] });
    khiHien();
  }
  // Đăng nhập xong: xoá trạng thái xem thử, nạp lại lần tới khi mở màn
  document.addEventListener('dangnhap-xong', function () { D.khoiTao = false; D.lop = ''; D.so = null; D.che = 'so'; window.SCN_QUYEN = null; khiHien(); });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', gan); else gan();

  // Mở sổ, tuỳ chọn nhảy thẳng tới một lớp (liên kết ở dòng từng lớp của trang Lớp học).
  // Lớp không thuộc danh sách người này được xem thì napKhung tự trả về lớp mặc định.
  // Lớp muốn mở: thuộc danh sách được xem sổ → mở sổ; thuộc tổ được giao kiểm
  // tra → mở màn Kiểm tra – Duyệt lọc đúng lớp đó (tổ trưởng không thấy sổ gốc).
  // Trả true nếu phải nạp lại sổ lớp mới.
  function apLopMuon(lop) {
    var hop = D.dsLop.filter(function (l) { return chuanLop(l.lop) === chuanLop(lop); })[0];
    if (hop) {
      D.che = 'so';
      var tab = D.tabMuon || ''; D.tabMuon = '';
      if (hop.lop !== D.lop) { D.lop = hop.lop; D.tab = tab || 'tong-quan'; return true; }
      if (tab) D.tab = tab;
      return false;
    }
    var kt = D.dsLopKT.filter(function (l) { return l && chuanLop(l.lop) === chuanLop(lop); })[0];
    if (kt) { D.che = 'kiemtra'; D.lopLoc = kt.lop; D.locTT = 'tat_ca'; D.locKy = ''; }
    return false;
  }
  function moLop(lop, tab) {
    // Chỉ nhảy tới lớp nằm trong phạm vi người này được xem — không nạp trộm.
    D.che = 'so';
    if (tab) D.tabMuon = tab;
    if (tab === 'theo-doi') { D.ngayTD = homNay(); D.buoiTD = buoiMacDinh(); D.ddTam = null; }
    if (lop && D.khoiTao && !D.dangNap) {
      if (apLopMuon(lop)) { D.dangNap = true; napLop().then(function () { ve(); }); } else ve();
    } else if (lop) D.lopMuon = lop;
    else if (D.khoiTao && !D.dangNap) ve();
    if (window.chuyenManHinh) window.chuyenManHinh('sochunhiem');
  }
  // Màn "Kiểm tra sổ" — thẻ của trang Lớp học, lối tắt trên trang chủ
  function moKiemTra() {
    D.che = 'kiemtra'; D.moNop = null; D.lopLoc = '';
    if (D.khoiTao && !D.dangNap) ve();
    if (window.chuyenManHinh) window.chuyenManHinh('sochunhiem');
  }
  window.SO_CHU_NHIEM = { ve: ve, moLop: moLop, moKiemTra: moKiemTra, taiLai: function () { D.khoiTao = false; khiHien(); },
    // cho bài thử: dựng HTML bản Word từ một mô hình (vd. bản chụp máy chủ trả về)
    wordHtml: function (m, tc) { return wordSo(m, tc || {}); }, moHinh: function () { return dungMoHinh(); },
    moXem: moXem, dongXem: dongXem };
})(typeof window !== 'undefined' ? window : null);
