// ============================================================
// DỮ LIỆU MẪU (chế độ xem thử) — thdienlien-v2
// Nguồn: danh mục 109 hồ sơ app cũ, đã ánh xạ sang khung TT57.
// Khi nối Supabase, các file *-sql.js sẽ GHI ĐÈ các mảng này rồi
// gọi lại hàm vẽ — không sửa file này.
// Mã MC là mã GỢI Ý sinh tự động (trùng cách sinh trong sql/02),
// BGH duyệt lại trên màn hình quản trị.
// tc: tiêu chí TT57 minh chứng phục vụ · maCu: mã hồ sơ app cũ
// tt: trạng thái 'co' | 'dang' | 'chua'
// ============================================================

window.BO_PHAN = [
  { soTT: 1, ten: 'LÃNH ĐẠO - QUẢN LÝ', icon: '🏛', hop: ['H01', 'H02', 'H03'] },
  { soTT: 2, ten: 'ĐẢNG - ĐOÀN THỂ', icon: '🚩', hop: ['H04', 'H05'] },
  { soTT: 3, ten: 'CHUYÊN MÔN', icon: '📚', hop: ['H06', 'H07', 'H08'] },
  { soTT: 4, ten: 'HÀNH CHÍNH', icon: '🗄', hop: ['H09', 'H10', 'H11', 'H12'] },
  { soTT: 5, ten: 'BAN - HỘI', icon: '🤝', hop: ['H13', 'H14'] },
];

window.HOP = {
  H01: { ten: 'Hộp 01 · Hiệu trưởng', phuTrach: 'Hiệu trưởng' },
  H02: { ten: 'Hộp 02 · Phó Hiệu trưởng', phuTrach: 'Phó Hiệu trưởng' },
  H03: { ten: 'Hộp 03 · Hội đồng trường & các hội đồng', phuTrach: 'Chủ tịch Hội đồng trường' },
  H04: { ten: 'Hộp 04 · Chi bộ', phuTrach: 'Bí thư Chi bộ' },
  H05: { ten: 'Hộp 05 · Đội TNTP & Sao Nhi đồng', phuTrach: 'Tổng phụ trách Đội' },
  H06: { ten: 'Hộp 06 · Tổ chuyên môn khối 1-2-3', phuTrach: 'Tổ trưởng Tổ 1-2-3' },
  H07: { ten: 'Hộp 07 · Tổ chuyên môn khối 4-5', phuTrach: 'Tổ trưởng Tổ 4-5' },
  H08: { ten: 'Hộp 08 · Giáo viên & GVCN', phuTrach: 'Cá nhân CB-GV-NV' },
  H09: { ten: 'Hộp 09 · Văn thư', phuTrach: 'Văn thư' },
  H10: { ten: 'Hộp 10 · Kế toán', phuTrach: 'Kế toán' },
  H11: { ten: 'Hộp 11 · Y tế học đường', phuTrach: 'Y tế học đường' },
  H12: { ten: 'Hộp 12 · Thư viện - Thiết bị', phuTrach: 'Thủ thư / CB Thiết bị' },
  H13: { ten: 'Hộp 13 · Ban đại diện CMHS', phuTrach: 'Trưởng Ban ĐDCMHS' },
  H14: { ten: 'Hộp 14 · Ban an ninh - truyền thông', phuTrach: 'Ban an ninh' },
};

// 94 hồ sơ nghiệp vụ (15 hồ sơ KĐCL/ĐBCL cũ do app tự sinh — không nằm trong kho)
window.HO_SO = [
  // ── H01 · Hiệu trưởng (29)
  { hop: 'H01', maCu: '1.1.1', ten: 'Chiến lược phát triển giáo dục', tc: ['1.1', '4.2'], tt: 'co' },
  { hop: 'H01', maCu: '1.1.2', ten: 'Kế hoạch giáo dục nhà trường', tc: ['1.1', '3.1'], tt: 'co' },
  { hop: 'H01', maCu: '1.1.3', ten: 'Kế hoạch phát triển giáo dục', tc: ['1.1'], tt: 'chua' },
  { hop: 'H01', maCu: '1.1.4', ten: 'Kế hoạch tháng - tuần và các kế hoạch khác', tc: ['3.1'], tt: 'co' },
  { hop: 'H01', maCu: '1.3.1', ten: 'Quy chế dân chủ và chi tiêu nội bộ', tc: ['1.3', '1.4'], tt: 'co' },
  { hop: 'H01', maCu: '1.3.2', ten: 'Quy chế chuyên môn, thi đua - khen thưởng, quản lý tài sản', tc: ['1.3', '3.1'], tt: 'co' },
  { hop: 'H01', maCu: '1.3.3', ten: 'Quy chế tổ chức và hoạt động nhà trường', tc: ['1.2'], tt: 'chua' },
  { hop: 'H01', maCu: '1.4.1', ten: 'Quyết định tổ chức nhân sự', tc: ['1.2', '2.2'], tt: 'co' },
  { hop: 'H01', maCu: '1.4.2', ten: 'Quyết định thành lập các hội đồng', tc: ['1.2'], tt: 'co' },
  { hop: 'H01', maCu: '1.4.3', ten: 'Quyết định về học sinh', tc: ['1.3', '3.4'], tt: 'co' },
  { hop: 'H01', maCu: '1.5.1', ten: 'Văn bản chỉ đạo thu - chi và quyết định tài chính', tc: ['1.3'], tt: 'co' },
  { hop: 'H01', maCu: '1.5.2', ten: 'Công khai tài chính', tc: ['1.3', '1.4'], tt: 'co' },
  { hop: 'H01', maCu: '1.5.3', ten: 'Kế hoạch mua sắm, sửa chữa lớn', tc: ['1.3', '4.1'], tt: 'co' },
  { hop: 'H01', maCu: '1.6.1', ten: 'Hồ sơ tài sản đầu vào (đất đai, XDCB, mua sắm, biếu tặng)', tc: ['1.3', '4.1'], tt: 'co' },
  { hop: 'H01', maCu: '1.6.2', ten: 'Sổ tài sản cố định, sổ công cụ - dụng cụ', tc: ['1.3'], tt: 'co' },
  { hop: 'H01', maCu: '1.6.3', ten: 'Hồ sơ cấp phát, sử dụng, bảo dưỡng tài sản', tc: ['1.3', '4.1'], tt: 'co' },
  { hop: 'H01', maCu: '1.6.4', ten: 'Hồ sơ kiểm kê, thanh lý, tiêu hủy tài sản', tc: ['1.3'], tt: 'co' },
  { hop: 'H01', maCu: '1.7.1', ten: 'Sơ đồ tổ chức, quyết định thành lập tổ và phân công nhiệm vụ', tc: ['1.2', '2.2'], tt: 'co' },
  { hop: 'H01', maCu: '1.7.2', ten: 'Hồ sơ viên chức và hợp đồng lao động', tc: ['2.1', '2.2', '2.3'], tt: 'co' },
  { hop: 'H01', maCu: '1.8.1', ten: 'Hồ sơ phát động, đăng ký, giao ước thi đua', tc: ['2.2'], tt: 'co' },
  { hop: 'H01', maCu: '1.8.2', ten: 'Hồ sơ xét khen thưởng GV, NV và học sinh', tc: ['2.2', '3.4'], tt: 'co' },
  { hop: 'H01', maCu: '1.8.3', ten: 'Hồ sơ kỷ luật GV, NV và học sinh', tc: ['2.2', '3.4'], tt: 'co' },
  { hop: 'H01', maCu: '1.8.4', ten: 'Hồ sơ sáng kiến kinh nghiệm', tc: ['2.2'], tt: 'co' },
  { hop: 'H01', maCu: '1.9.2', ten: 'Y tế và chăm sóc sức khỏe', tc: ['4.2', '4.3'], tt: 'co' },
  { hop: 'H01', maCu: '1.9.3', ten: 'Giáo dục truyền thống và khuyến học', tc: ['4.3', '3.3'], tt: 'co' },
  { hop: 'H01', maCu: '1.10.1', ten: 'Báo cáo sơ kết học kỳ I và tổng kết năm học', tc: ['1.1', '3.1', '3.5'], tt: 'co' },
  { hop: 'H01', maCu: '1.10.2', ten: 'Báo cáo thống kê định kỳ', tc: ['1.1', '3.5'], tt: 'co' },
  { hop: 'H01', maCu: '1.10.3', ten: 'Báo cáo chuyên đề (QCDC, ANTH-ATGT, TV-TB)', tc: ['1.4', '4.2', '4.1'], tt: 'co' },
  { hop: 'H01', maCu: '1.10.4', ten: 'Báo cáo đột xuất và giải trình', tc: ['1.1'], tt: 'co' },
  // ── H03 · Hội đồng trường (5)
  { hop: 'H03', maCu: '1.2.1', ten: 'Nghị quyết kế hoạch phát triển nhà trường', tc: ['1.1', '1.2'], tt: 'co' },
  { hop: 'H03', maCu: '1.2.2', ten: 'Nghị quyết quy chế tổ chức và hoạt động', tc: ['1.2'], tt: 'co' },
  { hop: 'H03', maCu: '1.2.3', ten: 'Nghị quyết tài chính - tài sản', tc: ['1.2', '1.3'], tt: 'co' },
  { hop: 'H03', maCu: '1.2.4', ten: 'Nghị quyết giám sát', tc: ['1.2'], tt: 'co' },
  { hop: 'H03', maCu: '1.7.3', ten: 'Hồ sơ các hội đồng (TĐKT, Tuyển sinh, TVCM, Kỷ luật)', tc: ['1.2', '2.2'], tt: 'co' },
  // ── H02 · Phó Hiệu trưởng (18)
  { hop: 'H02', maCu: '2.1.1', ten: 'Sổ đăng bộ và học bạ', tc: ['3.4', '3.5'], tt: 'co' },
  { hop: 'H02', maCu: '2.1.2', ten: 'Sổ theo dõi và đánh giá học sinh', tc: ['3.4', '3.5'], tt: 'chua' },
  { hop: 'H02', maCu: '2.1.3', ten: 'Hồ sơ chuyển trường và tiếp nhận', tc: ['1.3', '3.4'], tt: 'chua' },
  { hop: 'H02', maCu: '2.1.4', ten: 'Hồ sơ theo dõi học sinh khuyết tật', tc: ['3.4'], tt: 'chua' },
  { hop: 'H02', maCu: '2.2.1', ten: 'Kế hoạch dạy học CT GDPT 2018', tc: ['3.1'], tt: 'chua' },
  { hop: 'H02', maCu: '2.2.2', ten: 'Kế hoạch bồi dưỡng thường xuyên', tc: ['2.2'], tt: 'co' },
  { hop: 'H02', maCu: '2.2.3', ten: 'Kế hoạch hội thi, trải nghiệm, STEM', tc: ['3.3'], tt: 'co' },
  { hop: 'H02', maCu: '2.2.4', ten: 'Kế hoạch phụ đạo và bồi dưỡng năng khiếu', tc: ['3.4', '3.5'], tt: 'co' },
  { hop: 'H02', maCu: '2.2.5', ten: 'Kế hoạch giáo dục địa phương', tc: ['3.1'], tt: 'chua' },
  { hop: 'H02', maCu: '2.3.1', ten: 'Thời khóa biểu và phân công chuyên môn', tc: ['1.2', '3.1'], tt: 'co' },
  { hop: 'H02', maCu: '2.3.2', ten: 'Phân công dạy thay', tc: ['2.2', '3.1'], tt: 'co' },
  { hop: 'H02', maCu: '2.4.1', ten: 'Ma trận và đề kiểm tra định kỳ', tc: ['3.1', '3.5'], tt: 'co' },
  { hop: 'H02', maCu: '2.4.2', ten: 'Tổng hợp kết quả chất lượng giáo dục', tc: ['3.5'], tt: 'co' },
  { hop: 'H02', maCu: '2.4.3', ten: 'Danh sách khen thưởng học sinh', tc: ['3.4', '3.5'], tt: 'co' },
  { hop: 'H02', maCu: '2.5.1', ten: 'Văn bản chỉ đạo phổ cập GDTH', tc: ['1.3'], tt: 'co' },
  { hop: 'H02', maCu: '2.5.2', ten: 'Hồ sơ phổ cập GDTH (KH, BC, tờ trình, biểu mẫu)', tc: ['1.3'], tt: 'co' },
  { hop: 'H02', maCu: '2.6.1', ten: 'Hồ sơ tuyển sinh lớp 1', tc: ['1.3', '3.4'], tt: 'co' },
  { hop: 'H02', maCu: '2.6.2', ten: 'Hồ sơ SHCM trường và kiểm tra nội bộ chuyên môn', tc: ['3.1', '2.2'], tt: 'co' },
  // ── H06 · Tổ CM khối 1-2-3 (8)
  { hop: 'H06', maCu: '3.1.1', ten: 'Kế hoạch môn học Lớp 1', tc: ['3.1'], tt: 'co' },
  { hop: 'H06', maCu: '3.1.2', ten: 'Kế hoạch môn học Lớp 2', tc: ['3.1'], tt: 'co' },
  { hop: 'H06', maCu: '3.1.3', ten: 'Kế hoạch môn học Lớp 3', tc: ['3.1'], tt: 'co' },
  { hop: 'H06', maCu: '3.2.1', ten: 'Kế hoạch và biên bản SHCM Tổ 1-2-3', tc: ['1.2', '2.2'], tt: 'co' },
  { hop: 'H06', maCu: '3.2.3', ten: 'Sổ ghi chép hoạt động các tổ CM (dùng chung)', tc: ['1.2', '2.2'], tt: 'chua' },
  { hop: 'H06', maCu: '3.3.1', ten: 'Ngân hàng đề kiểm tra và thư viện giáo án (dùng chung)', tc: ['3.1', '3.5'], tt: 'co' },
  { hop: 'H06', maCu: '3.3.2', ten: 'Kho tranh ảnh, video, tài liệu chuyên đề (dùng chung)', tc: ['4.1', '3.1'], tt: 'co' },
  { hop: 'H06', maCu: '3.3.3', ten: 'Hồ sơ đổi mới PPDH và CNTT (dùng chung)', tc: ['2.2', '3.2'], tt: 'chua' },
  // ── H07 · Tổ CM khối 4-5 (3)
  { hop: 'H07', maCu: '3.1.4', ten: 'Kế hoạch môn học Lớp 4', tc: ['3.1'], tt: 'co' },
  { hop: 'H07', maCu: '3.1.5', ten: 'Kế hoạch môn học Lớp 5', tc: ['3.1'], tt: 'co' },
  { hop: 'H07', maCu: '3.2.2', ten: 'Kế hoạch và biên bản SHCM Tổ 4-5', tc: ['1.2', '2.2'], tt: 'co' },
  // ── H08 · Giáo viên & GVCN (5)
  { hop: 'H08', maCu: '9.1.1', ten: 'Hồ sơ năng lực (TCCB)', tc: ['2.1', '2.2', '2.3'], tt: 'chua' },
  { hop: 'H08', maCu: '9.1.2', ten: 'Đánh giá xếp loại NĐ 90 và chuẩn nghề nghiệp GV', tc: ['2.1', '2.2'], tt: 'chua' },
  { hop: 'H08', maCu: '9.1.3', ten: 'Hồ sơ BDTX theo module', tc: ['2.2'], tt: 'chua' },
  { hop: 'H08', maCu: '9.1.4', ten: 'Kế hoạch bài dạy; sổ dự giờ', tc: ['2.2', '3.2'], tt: 'chua' },
  { hop: 'H08', maCu: '9.2.1', ten: 'Sổ chủ nhiệm (kế hoạch, theo dõi, nhận xét học sinh)', tc: ['2.2', '3.4', '3.1'], tt: 'co' },
  // ── H09 · Văn thư (4)
  { hop: 'H09', maCu: '4.1.1', ten: 'Văn bản đến', tc: ['1.3'], tt: 'co' },
  { hop: 'H09', maCu: '4.1.2', ten: 'Văn bản đi và quản lý văn bản điện tử', tc: ['1.3'], tt: 'co' },
  { hop: 'H09', maCu: '4.1.3', ten: 'Quyết định - tờ trình nội bộ và hồ sơ học vụ', tc: ['1.3'], tt: 'co' },
  { hop: 'H09', maCu: '4.1.4', ten: 'Biểu mẫu, quy trình và lưu trữ thống kê', tc: ['1.3'], tt: 'co' },
  // ── H10 · Kế toán (5)
  { hop: 'H10', maCu: '5.1', ten: 'Bảng thanh toán lương', tc: ['1.3', '2.2'], tt: 'co' },
  { hop: 'H10', maCu: '5.2', ten: 'Hợp đồng lao động', tc: ['2.2', '2.3'], tt: 'co' },
  { hop: 'H10', maCu: '5.3', ten: 'Biên bản (kế toán)', tc: ['1.3'], tt: 'co' },
  { hop: 'H10', maCu: '5.4', ten: 'Quyết định (kế toán)', tc: ['1.3'], tt: 'co' },
  { hop: 'H10', maCu: '5.5', ten: 'Báo cáo tài chính', tc: ['1.3'], tt: 'co' },
  // ── H11 · Y tế học đường (2)
  { hop: 'H11', maCu: '4.4.1', ten: 'KH - văn bản y tế, theo dõi sức khỏe HS, nhật ký phòng y tế', tc: ['4.2', '4.1'], tt: 'co' },
  { hop: 'H11', maCu: '4.4.2', ten: 'BHYT và truyền thông phòng dịch', tc: ['4.2', '4.3'], tt: 'co' },
  // ── H12 · Thư viện - Thiết bị (4)
  { hop: 'H12', maCu: '4.2.1', ten: 'Hồ sơ pháp lý - kế hoạch, sổ nghiệp vụ và kiểm kê thư viện', tc: ['4.1'], tt: 'co' },
  { hop: 'H12', maCu: '4.2.2', ten: 'Hồ sơ xây dựng và phát triển văn hóa đọc', tc: ['4.1', '3.3'], tt: 'chua' },
  { hop: 'H12', maCu: '4.3.1', ten: 'Danh mục - kho thiết bị, mượn - trả, báo hỏng', tc: ['4.1'], tt: 'co' },
  { hop: 'H12', maCu: '4.3.2', ten: 'Kế hoạch mua sắm và kiểm kê thiết bị', tc: ['1.3', '4.1'], tt: 'co' },
  // ── H04 · Chi bộ (5)
  { hop: 'H04', maCu: '6.1', ten: 'Nghị quyết Chi bộ', tc: ['1.2'], tt: 'co' },
  { hop: 'H04', maCu: '6.2', ten: 'Quyết định (Chi bộ)', tc: ['1.2'], tt: 'co' },
  { hop: 'H04', maCu: '6.3', ten: 'Biên bản họp Chi ủy, Chi bộ', tc: ['1.2'], tt: 'co' },
  { hop: 'H04', maCu: '6.4', ten: 'Báo cáo (Chi bộ)', tc: ['1.2'], tt: 'co' },
  { hop: 'H04', maCu: '6.5', ten: 'Xếp loại đảng viên', tc: ['1.2'], tt: 'co' },
  // ── H05 · Đội & Sao Nhi đồng (3)
  { hop: 'H05', maCu: '7.1', ten: 'KH hoạt động và QĐ tổ chức Đội, Sao Nhi đồng', tc: ['1.2', '3.3'], tt: 'co' },
  { hop: 'H05', maCu: '7.2', ten: 'Biên bản, báo cáo hoạt động Đội', tc: ['1.2', '3.3'], tt: 'co' },
  { hop: 'H05', maCu: '7.3', ten: 'Hình ảnh, tư liệu hoạt động ngoài giờ lên lớp', tc: ['3.3'], tt: 'co' },
  // ── H13 · Ban đại diện CMHS (2)
  { hop: 'H13', maCu: '8.1.1', ten: 'Danh sách trích ngang; quy chế hoạt động Ban ĐDCMHS', tc: ['4.3'], tt: 'co' },
  { hop: 'H13', maCu: '8.1.2', ten: 'Kế hoạch hoạt động và các biên bản Ban ĐDCMHS', tc: ['4.3'], tt: 'co' },
  // ── H14 · Ban an ninh - truyền thông (1)
  { hop: 'H14', maCu: '1.9.1', ten: 'An ninh trật tự và an toàn trường học', tc: ['4.2', '4.3'], tt: 'co' },
];

// Sinh mã MC.x.y.zz gợi ý theo tiêu chí ĐẦU trong mảng tc (trùng thuật toán sql/02)
(function sinhMaMC() {
  var dem = {};
  // Sắp theo mã cũ kiểu số tự nhiên để mã sinh ra ổn định
  var sx = window.HO_SO.slice().sort(function (a, b) {
    var pa = a.maCu.split('.').map(Number), pb = b.maCu.split('.').map(Number);
    for (var i = 0; i < Math.max(pa.length, pb.length); i++) {
      var x = pa[i] || 0, y = pb[i] || 0;
      if (x !== y) return x - y;
    }
    return 0;
  });
  sx.forEach(function (h) {
    var tc = h.tc[0];
    dem[tc] = (dem[tc] || 0) + 1;
    h.ma = 'MC.' + tc + '.' + String(dem[tc]).padStart(2, '0');
  });
})();

// 15 tiêu chí TT57 (tên + bắt buộc) — nguyên văn Mức 1/2 nạp từ CSDL khi nối Supabase
window.TIEU_CHUAN = [
  { so: 1, ten: 'Quản trị nhà trường và bảo đảm chất lượng' },
  { so: 2, ten: 'Phát triển đội ngũ' },
  { so: 3, ten: 'Thực hiện chương trình, đổi mới phương pháp giáo dục và phát triển người học' },
  { so: 4, ten: 'Điều kiện giáo dục, môi trường an toàn và phối hợp xã hội' },
];
window.TIEU_CHI = [
  { ma: '1.1', ten: 'Tầm nhìn, sứ mạng/mục tiêu và kế hoạch phát triển', batBuoc: false },
  { ma: '1.2', ten: 'Cơ cấu tổ chức, phân công nhiệm vụ và phối hợp nội bộ', batBuoc: false },
  { ma: '1.3', ten: 'Quản lý kế hoạch, nguồn lực, thông tin và dữ liệu', batBuoc: true },
  { ma: '1.4', ten: 'Tự đánh giá, cải tiến chất lượng, công khai và trách nhiệm giải trình', batBuoc: true },
  { ma: '2.1', ten: 'Cán bộ quản lý cơ sở giáo dục', batBuoc: true },
  { ma: '2.2', ten: 'Giáo viên', batBuoc: true },
  { ma: '2.3', ten: 'Nhân sự hỗ trợ giáo dục', batBuoc: false },
  { ma: '3.1', ten: 'Tổ chức thực hiện chương trình giáo dục', batBuoc: true },
  { ma: '3.2', ten: 'Đổi mới phương pháp giáo dục và theo dõi, đánh giá sự phát triển, tiến bộ của học sinh', batBuoc: true },
  { ma: '3.3', ten: 'Tổ chức hoạt động giáo dục và phát triển toàn diện', batBuoc: false },
  { ma: '3.4', ten: 'Quản lý, theo dõi, hỗ trợ học sinh và giáo dục hòa nhập', batBuoc: false },
  { ma: '3.5', ten: 'Kết quả học tập, phát triển, rèn luyện và sự tiến bộ của học sinh', batBuoc: false },
  { ma: '4.1', ten: 'Cơ sở vật chất, thiết bị, học liệu và hạ tầng kỹ thuật', batBuoc: true },
  { ma: '4.2', ten: 'Môi trường giáo dục an toàn, tích cực, hỗ trợ phát triển học sinh', batBuoc: true },
  { ma: '4.3', ten: 'Phối hợp với gia đình, cộng đồng và tổ chức liên quan', batBuoc: false },
];
