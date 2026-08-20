// ============================================================
// DỮ LIỆU MẪU (chế độ xem thử) — thdienlien-v2
//
// ⚠️ PHẦN DANH MỤC HỒ SƠ DO MÁY SINH RA từ danh-muc-ho-so-2026.json
//    (quan-tri/sinh-du-lieu-demo.js trong kho tài liệu). Đừng sửa tay ba mảng
//    BO_PHAN / HOP / HO_SO — sửa danh mục rồi sinh lại cả ba đầu:
//        node quan-tri/sinh-du-lieu-demo.js    (tệp này)
//        node quan-tri/sinh-apps-script.js     (cây thư mục Drive)
//        node quan-tri/sinh-sql-danh-muc.js    (danh mục trong CSDL)
//
// Nguồn: Điều lệ Thông tư 15/2026/TT-BGDĐT (Điều 21), TT 57/2026 (Phụ lục III,
// IV), CV 5555/BGDĐT-GDPT. 101 đầu hồ sơ · 13 hộp · 5 bộ phận.
// Tầng: A bắt buộc theo văn bản (66) · B minh chứng TT57 (25) · C nội bộ (10).
//
// Khi nối Supabase, các file *-sql.js GHI ĐÈ các mảng này rồi gọi lại hàm vẽ.
// tc: tiêu chí TT57 mà hồ sơ làm minh chứng · maCu: mã hồ sơ app cũ (rỗng =
// đầu hồ sơ lập mới) · tt: 'co' | 'dang' | 'chua' · tang: A | B | C
//
// ⚠️ KHÔNG ghi tên thật cán bộ giáo viên vào tệp này — kho mã là kho công khai.
//    Cột phuTrach chỉ ghi CHỨC VỤ.
// ============================================================

window.BO_PHAN = [
  { soTT: 1, ten: 'Bộ phận Lãnh đạo, quản lý', icon: '🏛', hop: ['H01', 'H02', 'H03'] },
  { soTT: 2, ten: 'Bộ phận Đảng, đoàn thể', icon: '🚩', hop: ['H04', 'H05'] },
  { soTT: 3, ten: 'Bộ phận Chuyên môn', icon: '📚', hop: ['H06', 'H08'] },
  { soTT: 4, ten: 'Bộ phận Văn phòng', icon: '🗄', hop: ['H09', 'H10', 'H11', 'H12'] },
  { soTT: 5, ten: 'Bộ phận Ban, hội', icon: '🤝', hop: ['H13', 'H14'] },
];

window.HOP = {
  H01: { ten: 'Hiệu trưởng', phuTrach: 'Hiệu trưởng', moTa: 'Hồ sơ chỉ đạo, điều hành và quản lý chung của người đứng đầu nhà trường.' },
  H02: { ten: 'Phó Hiệu trưởng', phuTrach: 'Phó Hiệu trưởng', moTa: 'Hồ sơ quản lý chuyên môn, hoạt động dạy học, phổ cập và chất lượng giáo dục.' },
  H03: { ten: 'Các hội đồng', phuTrach: 'Hiệu trưởng', moTa: 'Hồ sơ các hội đồng theo Điều lệ: thi đua khen thưởng, kỉ luật, tư vấn, tự đánh giá.' },
  H04: { ten: 'Chi bộ', phuTrach: 'Bí thư Chi bộ', moTa: 'Hồ sơ hoạt động của Chi bộ Đảng trong nhà trường.' },
  H05: { ten: 'Đoàn TNCS, Đội TNTP & Sao Nhi đồng', phuTrach: 'Tổng phụ trách Đội', moTa: 'Kế hoạch, biên bản và tư liệu hoạt động Đoàn, Đội, Sao Nhi đồng.' },
  H06: { ten: 'Tổ chuyên môn', phuTrach: 'Tổ trưởng chuyên môn', moTa: 'Sổ ghi chép hoạt động tổ, kế hoạch dạy học và sinh hoạt chuyên môn.' },
  H08: { ten: 'Giáo viên & Giáo viên chủ nhiệm', phuTrach: 'Giáo viên', moTa: 'Kế hoạch bài dạy và sổ chủ nhiệm — hồ sơ giáo viên theo Điều 21 khoản 2.' },
  H09: { ten: 'Văn thư, lưu trữ', phuTrach: 'Văn thư', moTa: 'Văn bản đi - đến, quản lý văn bản điện tử, danh mục hồ sơ và lưu trữ.' },
  H10: { ten: 'Kế toán', phuTrach: 'Kế toán', moTa: 'Hồ sơ tài chính, tài sản, mua sắm, kiểm kê và công khai tài chính.' },
  H11: { ten: 'Y tế học đường', phuTrach: 'Nhân viên y tế', moTa: 'Theo dõi sức khoẻ học sinh, y tế học đường và an toàn thực phẩm.' },
  H12: { ten: 'Thư viện - Thiết bị', phuTrach: 'Cán bộ Thiết bị', moTa: 'Hồ sơ thư viện, thiết bị dạy học, hạ tầng công nghệ thông tin và học liệu số.' },
  H13: { ten: 'Ban đại diện cha mẹ học sinh', phuTrach: 'Trưởng Ban ĐDCMHS', moTa: 'Quy chế, kế hoạch và biên bản hoạt động Ban đại diện cha mẹ học sinh.' },
  H14: { ten: 'Ban an ninh - an toàn trường học', phuTrach: 'Ban an ninh - an toàn', moTa: 'An ninh trật tự, an toàn trường học, phòng chống bạo lực và xử lý sự cố.' },
};

// 101 đầu hồ sơ. Mã MC lấy thẳng từ danh mục đã duyệt — KHÔNG tự sinh lại,
// vì tự sinh là ra mã khác mã trong cơ sở dữ liệu.
window.HO_SO = [
  // ── H01 · Hiệu trưởng (26)
  { hop: 'H01', ma: 'MC.1.1.01', maCu: '1.1.1 + 1.1.3', ten: 'Kế hoạch chiến lược phát triển nhà trường', tc: ['1.1'], tt: 'co', phuTrach: 'Hiệu trưởng', tang: 'A' },
  { hop: 'H01', ma: 'MC.1.1.02', maCu: '1.1.2', ten: 'Kế hoạch giáo dục của nhà trường theo năm học', tc: ['1.1', '3.1'], tt: 'co', phuTrach: 'Hiệu trưởng', tang: 'A' },
  { hop: 'H01', ma: 'MC.3.1.01', maCu: '1.1.4', ten: 'Kế hoạch tháng, tuần và các kế hoạch công tác khác', tc: ['3.1', '1.1'], tt: 'co', phuTrach: 'Hiệu trưởng', tang: 'C' },
  { hop: 'H01', ma: 'MC.1.2.01', maCu: '1.3.3', ten: 'Quy chế tổ chức và hoạt động của nhà trường', tc: ['1.2'], tt: 'chua', phuTrach: 'Hiệu trưởng', tang: 'A' },
  { hop: 'H01', ma: 'MC.1.2.02', maCu: '', ten: 'Quy chế làm việc và các quy định nội bộ sau sắp xếp', tc: ['1.2'], tt: 'chua', phuTrach: 'Hiệu trưởng', tang: 'A' },
  { hop: 'H01', ma: 'MC.1.2.03', maCu: '1.3.1 (tách)', ten: 'Quy chế thực hiện dân chủ trong hoạt động của nhà trường', tc: ['1.2', '1.4'], tt: 'co', phuTrach: 'Hiệu trưởng', tang: 'A' },
  { hop: 'H01', ma: 'MC.3.1.02', maCu: '1.3.2 (tách)', ten: 'Quy chế chuyên môn', tc: ['3.1', '1.2'], tt: 'co', phuTrach: 'Hiệu trưởng', tang: 'C' },
  { hop: 'H01', ma: 'MC.1.2.04', maCu: '1.3.2 (tách)', ten: 'Quy chế thi đua, khen thưởng nội bộ', tc: ['1.2', '2.2'], tt: 'co', phuTrach: 'Hiệu trưởng', tang: 'C' },
  { hop: 'H01', ma: 'MC.1.3.01', maCu: '1.3.2 (tách)', ten: 'Quy chế quản lý, sử dụng tài sản', tc: ['1.3', '4.1'], tt: 'co', phuTrach: 'Hiệu trưởng', tang: 'C' },
  { hop: 'H01', ma: 'MC.1.2.05', maCu: '1.4.1', ten: 'Quyết định về tổ chức, nhân sự', tc: ['1.2', '2.2'], tt: 'co', phuTrach: 'Hiệu trưởng', tang: 'A' },
  { hop: 'H01', ma: 'MC.1.2.06', maCu: '1.7.1', ten: 'Sơ đồ tổ chức, quyết định thành lập tổ và phân công nhiệm vụ', tc: ['1.2', '2.2'], tt: 'co', phuTrach: 'Hiệu trưởng', tang: 'B' },
  { hop: 'H01', ma: 'MC.1.2.07', maCu: '', ten: 'Văn bản phân công, ủy quyền cho Phó Hiệu trưởng phụ trách phân hiệu, điểm trường', tc: ['1.2'], tt: 'chua', phuTrach: 'Hiệu trưởng', tang: 'A' },
  { hop: 'H01', ma: 'MC.2.2.01', maCu: '1.7.2 + 9.1.1', ten: 'Hồ sơ viên chức, hợp đồng làm việc', tc: ['2.2', '2.1', '2.3'], tt: 'co', phuTrach: 'Hiệu trưởng', tang: 'A' },
  { hop: 'H01', ma: 'MC.2.1.01', maCu: '9.1.2', ten: 'Hồ sơ kiểm tra, đánh giá cán bộ quản lý, giáo viên, nhân sự hỗ trợ giáo dục', tc: ['2.1', '2.2', '2.3'], tt: 'chua', phuTrach: 'Hiệu trưởng', tang: 'A' },
  { hop: 'H01', ma: 'MC.1.4.01', maCu: '2.6.2 (tách)', ten: 'Hồ sơ kiểm tra nội bộ', tc: ['1.4'], tt: 'co', phuTrach: 'Hiệu trưởng', tang: 'B' },
  { hop: 'H01', ma: 'MC.2.2.02', maCu: '1.8.1', ten: 'Hồ sơ thi đua: phát động, đăng ký, giao ước', tc: ['2.2'], tt: 'co', phuTrach: 'Hiệu trưởng', tang: 'C' },
  { hop: 'H01', ma: 'MC.2.2.03', maCu: '1.8.2 + 1.8.3 (tách)', ten: 'Hồ sơ khen thưởng, kỷ luật giáo viên, nhân viên', tc: ['2.2'], tt: 'co', phuTrach: 'Hiệu trưởng', tang: 'B' },
  { hop: 'H01', ma: 'MC.2.2.04', maCu: '1.8.4', ten: 'Hồ sơ sáng kiến kinh nghiệm', tc: ['2.2'], tt: 'co', phuTrach: 'Hiệu trưởng', tang: 'C' },
  { hop: 'H01', ma: 'MC.1.4.02', maCu: 'MOI.2', ten: 'Hồ sơ công khai theo quy định', tc: ['1.4'], tt: 'chua', phuTrach: 'Hiệu trưởng', tang: 'A' },
  { hop: 'H01', ma: 'MC.4.1.01', maCu: '1.6.1', ten: 'Hồ sơ pháp lý về đất đai, xây dựng cơ bản', tc: ['4.1', '1.3'], tt: 'co', phuTrach: 'Hiệu trưởng', tang: 'A' },
  { hop: 'H01', ma: 'MC.1.3.02', maCu: '', ten: 'Hồ sơ bàn giao, tiếp nhận hồ sơ - tài liệu của các trường trước sắp xếp', tc: ['1.3'], tt: 'chua', phuTrach: 'Hiệu trưởng', tang: 'A' },
  { hop: 'H01', ma: 'MC.1.3.03', maCu: '', ten: 'Hồ sơ rà soát, chuẩn hóa, hợp nhất dữ liệu sau sắp xếp', tc: ['1.3'], tt: 'chua', phuTrach: 'Hiệu trưởng', tang: 'A' },
  { hop: 'H01', ma: 'MC.1.1.03', maCu: '1.10.1', ten: 'Báo cáo sơ kết học kỳ, tổng kết năm học', tc: ['1.1', '1.4', '3.5'], tt: 'co', phuTrach: 'Hiệu trưởng', tang: 'B' },
  { hop: 'H01', ma: 'MC.1.3.04', maCu: '1.10.2', ten: 'Báo cáo thống kê định kỳ', tc: ['1.3', '3.5'], tt: 'co', phuTrach: 'Hiệu trưởng', tang: 'B' },
  { hop: 'H01', ma: 'MC.1.4.03', maCu: '1.10.4', ten: 'Báo cáo đột xuất và giải trình', tc: ['1.4'], tt: 'co', phuTrach: 'Hiệu trưởng', tang: 'B' },
  { hop: 'H01', ma: 'MC.1.4.04', maCu: '1.10.3 (tách)', ten: 'Báo cáo chuyên đề thực hiện quy chế dân chủ', tc: ['1.4'], tt: 'co', phuTrach: 'Hiệu trưởng', tang: 'C' },
  // ── H02 · Phó Hiệu trưởng (24)
  { hop: 'H02', ma: 'MC.3.4.01', maCu: '2.1.1 (tách)', ten: 'Sổ đăng bộ', tc: ['3.4', '1.3'], tt: 'co', phuTrach: 'Phó Hiệu trưởng', tang: 'A' },
  { hop: 'H02', ma: 'MC.3.5.01', maCu: '2.1.1 (tách)', ten: 'Học bạ học sinh', tc: ['3.5', '3.4'], tt: 'co', phuTrach: 'Phó Hiệu trưởng', tang: 'A' },
  { hop: 'H02', ma: 'MC.3.5.02', maCu: '2.1.2', ten: 'Sổ theo dõi và đánh giá học sinh', tc: ['3.5', '3.2'], tt: 'chua', phuTrach: 'Phó Hiệu trưởng', tang: 'A' },
  { hop: 'H02', ma: 'MC.3.5.03', maCu: '', ten: 'Bảng tổng hợp kết quả đánh giá giáo dục của lớp', tc: ['3.5'], tt: 'chua', phuTrach: 'Phó Hiệu trưởng', tang: 'A' },
  { hop: 'H02', ma: 'MC.3.1.03', maCu: '', ten: 'Sổ ghi đầu bài', tc: ['3.1'], tt: 'chua', phuTrach: 'Phó Hiệu trưởng', tang: 'A' },
  { hop: 'H02', ma: 'MC.3.4.02', maCu: '2.1.4', ten: 'Hồ sơ giáo dục đối với học sinh khuyết tật', tc: ['3.4'], tt: 'chua', phuTrach: 'Phó Hiệu trưởng', tang: 'A' },
  { hop: 'H02', ma: 'MC.3.4.03', maCu: '2.6.1', ten: 'Hồ sơ tuyển sinh lớp 1', tc: ['3.4'], tt: 'co', phuTrach: 'Phó Hiệu trưởng', tang: 'A' },
  { hop: 'H02', ma: 'MC.3.4.04', maCu: '2.1.3', ten: 'Hồ sơ chuyển trường và tiếp nhận học sinh', tc: ['3.4'], tt: 'chua', phuTrach: 'Phó Hiệu trưởng', tang: 'A' },
  { hop: 'H02', ma: 'MC.3.4.05', maCu: '2.5.1 + 2.5.2', ten: 'Hồ sơ phổ cập giáo dục', tc: ['3.4', '1.3'], tt: 'co', phuTrach: 'Phó Hiệu trưởng', tang: 'A' },
  { hop: 'H02', ma: 'MC.3.5.04', maCu: '1.8.2 + 1.8.3 + 2.4.3', ten: 'Hồ sơ khen thưởng, kỷ luật học sinh', tc: ['3.5', '3.3'], tt: 'co', phuTrach: 'Phó Hiệu trưởng', tang: 'A' },
  { hop: 'H02', ma: 'MC.1.3.05', maCu: 'MOI.1', ten: 'Sổ, dữ liệu theo dõi chuyên cần học sinh', tc: ['1.3', '3.1'], tt: 'chua', phuTrach: 'GVCN - Phó Hiệu trưởng', tang: 'B' },
  { hop: 'H02', ma: 'MC.3.1.04', maCu: '3.1.1→3.1.5 + 2.2.1', ten: 'Kế hoạch dạy học các môn học và hoạt động giáo dục', tc: ['3.1'], tt: 'co', phuTrach: 'Phó Hiệu trưởng', tang: 'A' },
  { hop: 'H02', ma: 'MC.3.1.05', maCu: '2.3.1 + 2.3.2', ten: 'Thời khóa biểu và phân công chuyên môn', tc: ['3.1', '1.2'], tt: 'co', phuTrach: 'Phó Hiệu trưởng', tang: 'B' },
  { hop: 'H02', ma: 'MC.3.1.06', maCu: '2.2.5', ten: 'Kế hoạch giáo dục địa phương', tc: ['3.1'], tt: 'chua', phuTrach: 'Phó Hiệu trưởng', tang: 'B' },
  { hop: 'H02', ma: 'MC.3.2.01', maCu: '2.6.2 + 3.2.1 + 3.2.2 + 3.3.3', ten: 'Hồ sơ sinh hoạt chuyên môn cấp trường', tc: ['3.2', '2.2'], tt: 'co', phuTrach: 'Phó Hiệu trưởng', tang: 'B' },
  { hop: 'H02', ma: 'MC.3.2.02', maCu: '3.3.1', ten: 'Ngân hàng đề kiểm tra và thư viện giáo án', tc: ['3.2', '3.1'], tt: 'co', phuTrach: 'Phó Hiệu trưởng', tang: 'B' },
  { hop: 'H02', ma: 'MC.3.1.07', maCu: '2.4.1', ten: 'Ma trận và đề kiểm tra định kỳ', tc: ['3.1', '3.2'], tt: 'co', phuTrach: 'Phó Hiệu trưởng', tang: 'B' },
  { hop: 'H02', ma: 'MC.3.5.05', maCu: '2.4.2', ten: 'Tổng hợp kết quả chất lượng giáo dục', tc: ['3.5'], tt: 'co', phuTrach: 'Phó Hiệu trưởng', tang: 'B' },
  { hop: 'H02', ma: 'MC.2.2.05', maCu: '2.2.2', ten: 'Kế hoạch bồi dưỡng thường xuyên', tc: ['2.2'], tt: 'co', phuTrach: 'Phó Hiệu trưởng', tang: 'A' },
  { hop: 'H02', ma: 'MC.2.2.06', maCu: '9.1.3', ten: 'Hồ sơ bồi dưỡng thường xuyên theo mô-đun', tc: ['2.2'], tt: 'chua', phuTrach: 'Phó Hiệu trưởng', tang: 'B' },
  { hop: 'H02', ma: 'MC.3.4.06', maCu: '2.2.4', ten: 'Kế hoạch phụ đạo và bồi dưỡng năng khiếu', tc: ['3.4', '3.5'], tt: 'co', phuTrach: 'Phó Hiệu trưởng', tang: 'B' },
  { hop: 'H02', ma: 'MC.3.3.01', maCu: '2.2.3', ten: 'Kế hoạch hội thi, trải nghiệm, STEM', tc: ['3.3'], tt: 'co', phuTrach: 'Phó Hiệu trưởng', tang: 'B' },
  { hop: 'H02', ma: 'MC.3.4.07', maCu: '', ten: 'Hồ sơ tư vấn, hỗ trợ tâm lý học sinh', tc: ['3.4'], tt: 'chua', phuTrach: 'Phó Hiệu trưởng', tang: 'B' },
  { hop: 'H02', ma: 'MC.4.2.01', maCu: 'MOI.5', ten: 'Hồ sơ bảo vệ dữ liệu cá nhân và an toàn số', tc: ['4.2', '1.3'], tt: 'chua', phuTrach: 'Phó Hiệu trưởng', tang: 'A' },
  // ── H03 · Các hội đồng (7)
  { hop: 'H03', ma: 'MC.1.2.08', maCu: '1.4.2', ten: 'Quyết định thành lập các hội đồng', tc: ['1.2'], tt: 'co', phuTrach: 'Hiệu trưởng', tang: 'A' },
  { hop: 'H03', ma: 'MC.1.2.09', maCu: '1.7.3 (tách)', ten: 'Hồ sơ Hội đồng thi đua, khen thưởng', tc: ['1.2'], tt: 'co', phuTrach: 'Hiệu trưởng', tang: 'A' },
  { hop: 'H03', ma: 'MC.1.2.10', maCu: '1.7.3 (tách)', ten: 'Hồ sơ Hội đồng kỷ luật', tc: ['1.2'], tt: 'co', phuTrach: 'Hiệu trưởng', tang: 'A' },
  { hop: 'H03', ma: 'MC.1.2.11', maCu: '1.7.3 (tách)', ten: 'Hồ sơ Hội đồng tư vấn', tc: ['1.2'], tt: 'co', phuTrach: 'Hiệu trưởng', tang: 'A' },
  { hop: 'H03', ma: 'MC.1.2.12', maCu: '1.2.1→1.2.4', ten: 'Hồ sơ Hội đồng trường (nghị quyết, biên bản, giám sát)', tc: ['1.2'], tt: 'co', phuTrach: 'Hiệu trưởng', tang: 'A' },
  { hop: 'H03', ma: 'MC.1.4.05', maCu: '—', ten: 'Hồ sơ Hội đồng tự đánh giá', tc: ['1.4'], tt: 'co', phuTrach: 'Hiệu trưởng', tang: 'A' },
  { hop: 'H03', ma: 'MC.1.2.13', maCu: '', ten: 'Biên bản bàn giao hồ sơ, tài liệu của Hội đồng trường cho Hiệu trưởng', tc: ['1.2'], tt: 'chua', phuTrach: 'Hiệu trưởng', tang: 'A' },
  // ── H04 · Chi bộ (5)
  { hop: 'H04', ma: 'MC.1.2.14', maCu: '6.1', ten: 'Nghị quyết Chi bộ', tc: ['1.2'], tt: 'co', phuTrach: 'Bí thư Chi bộ', tang: 'A' },
  { hop: 'H04', ma: 'MC.1.2.15', maCu: '6.2', ten: 'Quyết định của Chi bộ', tc: ['1.2'], tt: 'co', phuTrach: 'Bí thư Chi bộ', tang: 'A' },
  { hop: 'H04', ma: 'MC.1.2.16', maCu: '6.3', ten: 'Biên bản họp Chi ủy, Chi bộ', tc: ['1.2'], tt: 'co', phuTrach: 'Bí thư Chi bộ', tang: 'A' },
  { hop: 'H04', ma: 'MC.1.2.17', maCu: '6.4', ten: 'Báo cáo của Chi bộ', tc: ['1.2'], tt: 'co', phuTrach: 'Bí thư Chi bộ', tang: 'A' },
  { hop: 'H04', ma: 'MC.1.2.18', maCu: '6.5', ten: 'Hồ sơ đánh giá, xếp loại đảng viên', tc: ['1.2'], tt: 'co', phuTrach: 'Bí thư Chi bộ', tang: 'A' },
  // ── H05 · Đoàn TNCS, Đội TNTP & Sao Nhi đồng (6)
  { hop: 'H05', ma: 'MC.3.3.02', maCu: '', ten: 'Hồ sơ công tác Đoàn TNCS Hồ Chí Minh', tc: ['3.3', '1.2'], tt: 'chua', phuTrach: 'Bí thư Đoàn', tang: 'A' },
  { hop: 'H05', ma: 'MC.3.3.03', maCu: '7.1 + 7.2 (tách)', ten: 'Sổ công tác Đội', tc: ['3.3'], tt: 'co', phuTrach: 'Tổng phụ trách Đội', tang: 'A' },
  { hop: 'H05', ma: 'MC.3.3.04', maCu: '7.1', ten: 'Kế hoạch hoạt động Đội, Sao Nhi đồng và quyết định tổ chức', tc: ['3.3', '1.2'], tt: 'co', phuTrach: 'Tổng phụ trách Đội', tang: 'B' },
  { hop: 'H05', ma: 'MC.3.3.05', maCu: '7.2', ten: 'Biên bản, báo cáo hoạt động Đội', tc: ['3.3', '1.2'], tt: 'co', phuTrach: 'Tổng phụ trách Đội', tang: 'B' },
  { hop: 'H05', ma: 'MC.3.3.06', maCu: '7.3', ten: 'Hình ảnh, tư liệu hoạt động ngoài giờ lên lớp', tc: ['3.3'], tt: 'co', phuTrach: 'Tổng phụ trách Đội', tang: 'B' },
  { hop: 'H05', ma: 'MC.3.3.07', maCu: '1.9.3', ten: 'Hồ sơ giáo dục truyền thống và khuyến học', tc: ['3.3', '4.3'], tt: 'co', phuTrach: 'Tổng phụ trách Đội', tang: 'C' },
  // ── H06 · Tổ chuyên môn (4)
  { hop: 'H06', ma: 'MC.1.2.19', maCu: '3.2.3', ten: 'Sổ ghi chép hoạt động của Tổ chuyên môn khối 1-2-3', tc: ['1.2', '3.2'], tt: 'chua', phuTrach: 'Tổ trưởng chuyên môn', tang: 'A' },
  { hop: 'H06', ma: 'MC.1.2.20', maCu: '3.2.3', ten: 'Sổ ghi chép hoạt động của Tổ chuyên môn khối 4-5', tc: ['1.2', '3.2'], tt: 'chua', phuTrach: 'Tổ trưởng chuyên môn', tang: 'A' },
  { hop: 'H06', ma: 'MC.1.2.21', maCu: '', ten: 'Sổ ghi chép hoạt động của Tổ Ngoại ngữ - Công nghệ - Năng khiếu', tc: ['1.2', '3.2'], tt: 'chua', phuTrach: 'Tổ trưởng chuyên môn', tang: 'A' },
  { hop: 'H06', ma: 'MC.1.2.22', maCu: '', ten: 'Sổ ghi chép hoạt động của Tổ giáo dục đặc thù', tc: ['1.2', '3.2'], tt: 'chua', phuTrach: 'Tổ trưởng chuyên môn', tang: 'A' },
  // ── H08 · Giáo viên & Giáo viên chủ nhiệm (2)
  { hop: 'H08', ma: 'MC.3.2.03', maCu: '9.1.4', ten: 'Kế hoạch bài dạy (giáo án)', tc: ['3.2', '2.2'], tt: 'chua', phuTrach: 'Giáo viên', tang: 'A' },
  { hop: 'H08', ma: 'MC.3.4.08', maCu: '9.2.1', ten: 'Sổ chủ nhiệm', tc: ['3.4', '2.2', '3.2'], tt: 'co', phuTrach: 'Giáo viên chủ nhiệm', tang: 'A' },
  // ── H09 · Văn thư, lưu trữ (6)
  { hop: 'H09', ma: 'MC.1.3.06', maCu: '4.1.1', ten: 'Sổ quản lý văn bản đến', tc: ['1.3'], tt: 'co', phuTrach: 'Văn thư', tang: 'A' },
  { hop: 'H09', ma: 'MC.1.3.07', maCu: '4.1.2', ten: 'Sổ quản lý văn bản đi và hồ sơ lưu trữ văn bản điện tử', tc: ['1.3'], tt: 'co', phuTrach: 'Văn thư', tang: 'A' },
  { hop: 'H09', ma: 'MC.1.3.08', maCu: '4.1.4 (đổi tên)', ten: 'Danh mục hồ sơ và Bảng thời hạn bảo quản hồ sơ, tài liệu', tc: ['1.3'], tt: 'chua', phuTrach: 'Văn thư', tang: 'A' },
  { hop: 'H09', ma: 'MC.1.3.10', maCu: '4.1.3', ten: 'Quyết định, tờ trình nội bộ và hồ sơ học vụ', tc: ['1.3', '3.4'], tt: 'co', phuTrach: 'Văn thư', tang: 'B' },
  { hop: 'H09', ma: 'MC.1.4.06', maCu: 'MOI.3', ten: 'Hồ sơ tiếp nhận, xử lý phản ánh - kiến nghị', tc: ['1.4'], tt: 'chua', phuTrach: 'Văn thư', tang: 'A' },
  { hop: 'H09', ma: 'MC.1.2.23', maCu: '', ten: 'Sổ ghi chép hoạt động của Bộ phận Văn phòng', tc: ['1.2'], tt: 'chua', phuTrach: 'Phụ trách Văn phòng', tang: 'A' },
  // ── H10 · Kế toán (7)
  { hop: 'H10', ma: 'MC.1.3.11', maCu: '1.5.1 + 5.1 + 5.3 + 5.4', ten: 'Hồ sơ tài chính, kế toán (chứng từ, sổ kế toán, bảng lương)', tc: ['1.3'], tt: 'co', phuTrach: 'Kế toán', tang: 'A' },
  { hop: 'H10', ma: 'MC.1.3.12', maCu: '5.5', ten: 'Báo cáo tài chính, quyết toán', tc: ['1.3', '1.4'], tt: 'co', phuTrach: 'Kế toán', tang: 'A' },
  { hop: 'H10', ma: 'MC.1.4.07', maCu: '1.5.2', ten: 'Công khai tài chính', tc: ['1.4', '1.3'], tt: 'co', phuTrach: 'Kế toán', tang: 'A' },
  { hop: 'H10', ma: 'MC.1.3.13', maCu: '1.6.2 + 1.6.3', ten: 'Hồ sơ quản lý tài sản (sổ tài sản cố định, cấp phát, bảo dưỡng)', tc: ['1.3', '4.1'], tt: 'co', phuTrach: 'Kế toán', tang: 'A' },
  { hop: 'H10', ma: 'MC.4.1.02', maCu: '1.5.3 + 1.6.4 + 4.3.2', ten: 'Hồ sơ mua sắm, sửa chữa, kiểm kê, thanh lý tài sản', tc: ['4.1', '1.3'], tt: 'co', phuTrach: 'Kế toán', tang: 'A' },
  { hop: 'H10', ma: 'MC.1.3.14', maCu: '', ten: 'Hồ sơ kiểm kê và hợp nhất dữ liệu tài sản sau sắp xếp', tc: ['1.3', '4.1'], tt: 'chua', phuTrach: 'Kế toán', tang: 'A' },
  { hop: 'H10', ma: 'MC.2.3.01', maCu: '5.2', ten: 'Hợp đồng lao động và chế độ, chính sách', tc: ['2.3', '2.2'], tt: 'co', phuTrach: 'Kế toán', tang: 'A' },
  // ── H11 · Y tế học đường (3)
  { hop: 'H11', ma: 'MC.3.4.09', maCu: '4.4.1 (tách)', ten: 'Hồ sơ theo dõi sức khỏe học sinh', tc: ['3.4', '4.2'], tt: 'co', phuTrach: 'Nhân viên y tế', tang: 'A' },
  { hop: 'H11', ma: 'MC.4.2.02', maCu: '4.4.1 + 1.9.2', ten: 'Hồ sơ công tác y tế học đường (kế hoạch, nhật ký phòng y tế)', tc: ['4.2', '2.3'], tt: 'co', phuTrach: 'Nhân viên y tế', tang: 'A' },
  { hop: 'H11', ma: 'MC.4.2.03', maCu: '4.4.2', ten: 'Hồ sơ bảo hiểm y tế và truyền thông phòng dịch', tc: ['4.2', '4.3'], tt: 'co', phuTrach: 'Nhân viên y tế', tang: 'B' },
  // ── H12 · Thư viện - Thiết bị (4)
  { hop: 'H12', ma: 'MC.4.1.03', maCu: '4.2.1 + 4.2.2', ten: 'Hồ sơ quản lý thư viện', tc: ['4.1'], tt: 'co', phuTrach: 'Thủ thư', tang: 'A' },
  { hop: 'H12', ma: 'MC.4.1.04', maCu: '4.3.1', ten: 'Hồ sơ quản lý thiết bị giáo dục', tc: ['4.1'], tt: 'co', phuTrach: 'Cán bộ Thiết bị', tang: 'A' },
  { hop: 'H12', ma: 'MC.4.1.05', maCu: 'MOI.6 + 3.3.2', ten: 'Hồ sơ hạ tầng công nghệ thông tin và học liệu số', tc: ['4.1'], tt: 'chua', phuTrach: 'Cán bộ Thiết bị', tang: 'B' },
  { hop: 'H12', ma: 'MC.4.1.06', maCu: '1.10.3 (tách)', ten: 'Báo cáo chuyên đề thư viện - thiết bị', tc: ['4.1'], tt: 'co', phuTrach: 'Cán bộ Thiết bị', tang: 'C' },
  // ── H13 · Ban đại diện cha mẹ học sinh (4)
  { hop: 'H13', ma: 'MC.4.3.01', maCu: '8.1.1', ten: 'Danh sách trích ngang và quy chế hoạt động Ban đại diện', tc: ['4.3'], tt: 'co', phuTrach: 'Trưởng Ban ĐDCMHS', tang: 'A' },
  { hop: 'H13', ma: 'MC.4.3.02', maCu: '8.1.2', ten: 'Kế hoạch hoạt động và biên bản Ban đại diện', tc: ['4.3'], tt: 'co', phuTrach: 'Trưởng Ban ĐDCMHS', tang: 'A' },
  { hop: 'H13', ma: 'MC.4.3.03', maCu: 'MOI.7', ten: 'Hồ sơ kênh liên lạc và phản hồi của cha mẹ học sinh', tc: ['4.3'], tt: 'chua', phuTrach: 'GVCN - Ban ĐDCMHS', tang: 'B' },
  { hop: 'H13', ma: 'MC.4.3.04', maCu: '', ten: 'Hồ sơ phối hợp với UBND xã, y tế, công an và huy động nguồn lực', tc: ['4.3'], tt: 'chua', phuTrach: 'Hiệu trưởng', tang: 'B' },
  // ── H14 · Ban an ninh - an toàn trường học (3)
  { hop: 'H14', ma: 'MC.4.2.04', maCu: '1.9.1', ten: 'Hồ sơ an ninh trật tự và an toàn trường học', tc: ['4.2', '4.3'], tt: 'co', phuTrach: 'Ban an ninh - an toàn', tang: 'A' },
  { hop: 'H14', ma: 'MC.4.2.05', maCu: 'MOI.4', ten: 'Hồ sơ kiểm tra định kỳ điều kiện an toàn và xử lý sự cố', tc: ['4.2'], tt: 'chua', phuTrach: 'Ban an ninh - an toàn', tang: 'A' },
  { hop: 'H14', ma: 'MC.4.2.06', maCu: '1.10.3 (tách)', ten: 'Báo cáo chuyên đề an ninh trường học, an toàn giao thông', tc: ['4.2'], tt: 'co', phuTrach: 'Ban an ninh - an toàn', tang: 'C' },
];

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
