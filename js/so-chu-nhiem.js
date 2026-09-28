// ============================================================
// so-chu-nhiem.js — SỔ CHỦ NHIỆM ĐIỆN TỬ (giáo viên chủ nhiệm tiểu học)
//
// Căn cứ: TT 15/2026/TT-BGDĐT Đ21.2b (Sổ chủ nhiệm là hồ sơ của GVCN), Đ21.4
// (điện tử là chủ yếu), Đ26 (nhiệm vụ GVCN). Đặc tả nghiệp vụ C1–C14:
// thdienlien-v2-tailieu/tai-lieu/DAC-TA-SO-CHU-NHIEM-2026-2027.md · sổ dự án 97.
// Bảng: sql/69-so-chu-nhiem.sql (scn_*) + DÙNG LẠI hs_vang / diem_danh_lop
// (sql/20) cho chuyên cần + CHỈ ĐỌC hs_ket_qua / hs_nl_pc / hs_tong_hop (sql/04).
//
// Tám thẻ: Tổng quan · Kế hoạch · Học sinh · Theo dõi hằng ngày · Phụ huynh ·
//          Hỗ trợ HS · Đánh giá (chỉ đọc) · Tổng kết. Nút "Xuất Word" = cả sổ.
//
// Ai thấy gì:
//   GVCN            mở là vào thẳng lớp mình (tự nhận từ phan_cong_day), ghi được.
//   BGH / quản trị  có ô chọn điểm trường + lớp, chỉ ĐỌC; đặt được mốc KHOÁ SỔ.
//   Tổ trưởng       chọn lớp, đọc phần không nhạy cảm (RLS sql/69 lọc ở máy chủ).
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

  var LUAT = {
    pad: pad, isoCua: isoCua, congNgay: congNgay, ngayVN: ngayVN, thuHai: thuHai, soNgayHoc: soNgayHoc, chuanLop: chuanLop,
    KHUNG_NAM: KHUNG_NAM, khungNam: khungNam, tuanCuaNgay: tuanCuaNgay, ngayDauTuan: ngayDauTuan,
    dsThangNamHoc: dsThangNamHoc, TEN_THANG: TEN_THANG, CHU_DIEM: CHU_DIEM, chuDiemThang: chuDiemThang,
    thangCuaTuan: thangCuaTuan, tietSHDC: tietSHDC,
    tongHopChuyenCan: tongHopChuyenCan, tiLeChuyenCan: tiLeChuyenCan, canhBaoChuyenCan: canhBaoChuyenCan,
    lopCuaGVCN: lopCuaGVCN, MON: MON, NLPC: NLPC, demMuc: demMuc, phanTram: phanTram, sapTen: sapTen
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
  function laQuanLy() { return laBGH() || vaiTro() === 'to_truong'; }
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
  var BIEN_PHAP = [['bp_ne_nep', 'Nền nếp'], ['bp_hoc_tap', 'Học tập'], ['bp_dao_duc', 'Đạo đức, kỹ năng sống'], ['bp_ho_tro', 'Học sinh cần hỗ trợ'], ['bp_cmhs', 'Phối hợp cha mẹ học sinh']];
  var TABS = [['tong-quan', 'Tổng quan'], ['ke-hoach', 'Kế hoạch'], ['hoc-sinh', 'Học sinh'], ['theo-doi', 'Theo dõi hằng ngày'],
    ['phu-huynh', 'Phụ huynh'], ['ho-tro', 'Hỗ trợ HS'], ['danh-gia', 'Đánh giá'], ['tong-ket', 'Tổng kết']];

  // ── Trạng thái màn ──
  var D = {
    nam: '', khoiTao: false, dangNap: false, loiKhung: '',
    lopCuaToi: [], dsLop: [], coSo: [], gvcnCua: {}, locCoSo: '', lop: '', khoi: 0, coSoTen: '',
    tab: 'tong-quan', hs: [], gvcnTen: '', loi: {}, so: null, khoaNap: '',
    capKH: 'thang', thangKH: '', tuanKH: 0,
    ngayTD: '', buoiTD: 'sang', ddTam: null, chon: {}, loaiTD: 'khen', hsMo: '', sua: null, kyDG: '', kyTK: 'hk1'
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
      may().from('co_so').select('ma, ten').eq('hoat_dong', true).order('so_tt')
    ]).then(function (r) {
      if (r[0].error) throw r[0].error;
      var pc = r[0].data || [];
      D.gvcnCua = {};
      pc.forEach(function (p) { if (p.nguoi_dung && p.nguoi_dung.ho_ten) D.gvcnCua[chuanLop(p.lop)] = p.nguoi_dung.ho_ten; });
      D.lopCuaToi = lopCuaGVCN(pc, u.id, D.nam);
      var lh = (r[1] && !r[1].error && r[1].data) || [];
      D.coSo = (r[2] && !r[2].error && r[2].data) || [];
      var tenCs = {}; D.coSo.forEach(function (c) { tenCs[c.ma] = c.ten; });
      var theoChuan = {};
      lh.forEach(function (l) { theoChuan[chuanLop(l.lop)] = { lop: l.lop, khoi: l.khoi, coSo: l.co_so_ma || '', coSoTen: tenCs[l.co_so_ma] || '' }; });
      // Lớp của tôi: đổi về đúng chuỗi tên lớp trong lop_hoc ('4a' → '4A')
      D.lopCuaToi = D.lopCuaToi.map(function (l) { return theoChuan[chuanLop(l)] ? theoChuan[chuanLop(l)].lop : l; });
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
    return taiHet('hoc_sinh_lop', 'id, hoc_sinh_ma, lop, khoi, trang_thai, hoc_sinh(ma, ho_ten, ngay_sinh, gioi_tinh, dan_toc, khuyet_tat_hoa_nhap)', N)
      .then(function (ds) {
        D.hs = ds.filter(function (d) { return d.hoc_sinh && (!d.trang_thai || d.trang_thai === 'dang_hoc'); })
          .map(function (d) { return d.hoc_sinh; }).sort(sapTen);
        var ma = D.hs.map(function (h) { return h.ma; });
        var coMa = ma.length ? [['hoc_sinh_ma', ma]] : null;
        var S = D.so;
        return Promise.all([
          motNguon('scn', may().from('scn_lop').select('*').eq('nam_hoc', D.nam).eq('lop', lop).maybeSingle()).then(function (d) { S.lop = d || null; }),
          motNguon('scn', taiHet('scn_ke_hoach', '*', N)).then(function (d) { S.keHoach = d || []; }),
          coMa ? motNguon('hoanCanh', taiHet('scn_hoan_canh', '*', [['nam_hoc', D.nam]], coMa)).then(function (d) { S.hoanCanh = {}; (d || []).forEach(function (x) { S.hoanCanh[x.hoc_sinh_ma] = x; }); }) : null,
          motNguon('scn', taiHet('scn_theo_doi', '*', N)).then(function (d) { S.theoDoi = (d || []).sort(function (a, b) { return a.ngay < b.ngay ? 1 : a.ngay > b.ngay ? -1 : b.id - a.id; }); }),
          motNguon('scn', taiHet('scn_lien_lac', '*', N)).then(function (d) { S.lienLac = (d || []).sort(function (a, b) { return a.ngay < b.ngay ? 1 : -1; }); }),
          motNguon('hoTro', taiHet('scn_ho_tro', '*', N)).then(function (d) { S.hoTro = d || []; }),
          motNguon('scn', taiHet('scn_tong_ket', '*', N)).then(function (d) { S.tongKet = {}; (d || []).forEach(function (x) { S.tongKet[x.ky] = x; }); }),
          motNguon('vang', taiHet('hs_vang', 'id, ngay, buoi, hoc_sinh_ma, phep, ghi_chu, nguoi_ghi_id', N)).then(function (d) { S.vang = d || []; }),
          motNguon('vang', taiHet('diem_danh_lop', 'id, ngay, buoi, si_so, so_vang, ghi_luc', N)).then(function (d) { S.ddl = d || []; }),
          coMa ? motNguon('danhGia', taiHet('hs_ket_qua', 'id, ky, hoc_sinh_ma, mon_ma, muc', [['nam_hoc', D.nam]], coMa)).then(function (d) { S.kq = d || []; }) : null,
          coMa ? motNguon('danhGia', taiHet('hs_nl_pc', 'id, ky, hoc_sinh_ma, tieu_chi_ma, muc', [['nam_hoc', D.nam]], coMa)).then(function (d) { S.nlpc = d || []; }) : null,
          coMa ? motNguon('danhGia', taiHet('hs_tong_hop', 'id, hoc_sinh_ma, hoan_thanh_lop, khen_thuong', [['nam_hoc', D.nam]], coMa)).then(function (d) { S.th = d || []; }) : null
        ]);
      })
      .catch(function (e) { D.loi.hs = loiChu(e); })
      .then(function () { if (D.khoaNap === khoa) D.dangNap = false; });
  }

  // ══════════ DỮ LIỆU MẪU (bản xem thử — không tên thật) ══════════
  function mauKhung() {
    D.lopCuaToi = ['4A'];
    D.dsLop = [{ lop: '4A', khoi: 4, coSo: 'CS01', coSoTen: 'Điểm trường chính (mẫu)' }, { lop: '4C', khoi: 4, coSo: 'CS02', coSoTen: 'Phân hiệu (mẫu)' }];
    D.coSo = [{ ma: 'CS01', ten: 'Điểm trường chính (mẫu)' }, { ma: 'CS02', ten: 'Phân hiệu (mẫu)' }];
    D.gvcnCua = { '4A': 'Giáo viên mẫu A', '4C': 'Giáo viên mẫu C' };
    if (!D.lop) D.lop = '4A';
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
      ngay_bau: y + '-09-10', ban_dai_dien: [{ vai_tro: 'Trưởng ban', ho_ten: 'Phụ huynh mẫu 1', sdt: '', cua_hs: 'MAU03' }], khoa_den: null };
    S.hoanCanh = {
      MAU07: { hoc_sinh_ma: 'MAU07', o_voi: 'Bố mẹ', dien_chinh_sach: ['khuyet_tat'], kt_dang: 'Khuyết tật học tập (mẫu)', kt_co_giay: true, can_quan_tam: true },
      MAU04: { hoc_sinh_ma: 'MAU04', o_voi: 'Ông bà (bố mẹ đi làm ăn xa)', dien_chinh_sach: ['can_ngheo'], can_quan_tam: true },
      MAU11: { hoc_sinh_ma: 'MAU11', o_voi: 'Mẹ', dien_chinh_sach: ['ho_ngheo', 'mo_coi'], giay_xac_nhan: 'Giấy xác nhận hộ nghèo (mẫu)' }
    };
    S.theoDoi = [
      { id: -1, ngay: congNgay(hn, -1), hoc_sinh_ma: 'MAU02', loai: 'khen', linh_vuc: 'Trách nhiệm', noi_dung: 'Điều hành lớp sinh hoạt đầu giờ tốt', da_bao_cmhs: false },
      { id: -2, ngay: congNgay(hn, -2), hoc_sinh_ma: 'MAU05', loai: 'nhac', linh_vuc: 'Nề nếp', noi_dung: 'Đi học muộn', da_bao_cmhs: true },
      { id: -3, ngay: congNgay(hn, -3), hoc_sinh_ma: null, loai: 'ne_nep', linh_vuc: 'Nề nếp', noi_dung: 'Cả lớp xếp hàng ra vào lớp nghiêm túc', da_bao_cmhs: false },
      { id: -4, ngay: congNgay(hn, -5), hoc_sinh_ma: 'MAU04', loai: 'tien_bo', linh_vuc: 'Tiếng Việt', noi_dung: 'Tiến bộ trong đọc thành tiếng', da_bao_cmhs: false }
    ];
    S.vang = [
      { id: -1, ngay: m + '15', buoi: 'sang', hoc_sinh_ma: 'MAU05', phep: 'co_phep', ghi_chu: 'Ốm' },
      { id: -2, ngay: m + '22', buoi: 'sang', hoc_sinh_ma: 'MAU09', phep: 'khong_phep' },
      { id: -3, ngay: m + '22', buoi: 'chieu', hoc_sinh_ma: 'MAU09', phep: 'khong_phep' },
      { id: -4, ngay: m + '23', buoi: 'sang', hoc_sinh_ma: 'MAU09', phep: 'chua_ro' }
    ];
    S.ddl = [{ ngay: m + '22', buoi: 'sang', si_so: 14, so_vang: 1 }, { ngay: m + '22', buoi: 'chieu', si_so: 14, so_vang: 1 }, { ngay: m + '23', buoi: 'sang', si_so: 14, so_vang: 1 }];
    S.lienLac = [{ id: -1, loai: 'hop', ngay: y + '-09-16', ky_hop: 'dau_nam', so_du: 13, tong_so: 14, noi_dung: 'Triển khai kế hoạch năm học, bầu Ban đại diện cha mẹ học sinh lớp', phan_hoi: 'Nhất trí', ket_luan: 'Thống nhất nội dung phối hợp' }];
    S.hoTro = [{ id: -1, hoc_sinh_ma: 'MAU04', loai: 'hoc_tap', ngay: y + '-09-18', bieu_hien: 'Đọc còn chậm, viết sai chính tả', mon_ky_nang: 'Đọc, viết', bien_phap: 'Đôi bạn cùng tiến; phụ đạo buổi 2 thứ Ba', nguoi_phoi_hop: 'Cha mẹ học sinh', moc_xem_lai: y + '-11-06', trang_thai: 'dang_theo_doi' }];
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
    return ds.length ? '<div class="hd-kiem do">' + ds.join('<br>') + '</div>' : '';
  }

  // ══════════ VẼ ══════════
  function ve(el) {
    if (el) EL = el;
    if (!EL || !document.body.contains(EL)) return;
    if (!D.khoiTao) {
      D.khoiTao = true; D.dangNap = true;
      EL.innerHTML = dauMan() + '<div class="the-thong-bao">Đang tải sổ chủ nhiệm…</div>';
      napKhung().then(function () { D.dangNap = false; return D.lop ? napLop() : null; }).then(function () { ve(); });
      return;
    }
    if (D.dangNap) { EL.innerHTML = dauMan() + '<div class="the-thong-bao">Đang tải…</div>'; ganChung(); return; }
    var h = dauMan();
    if (D.loiKhung) { EL.innerHTML = h + '<div class="hd-kiem do">' + thoat(D.loiKhung) + '</div>'; ganChung(); return; }
    if (!D.lop) {
      EL.innerHTML = h + '<div class="the-thong-bao">' + (laQuanLy()
        ? 'Chưa có lớp nào của năm học ' + thoat(D.nam) + ' — khai lớp và phân công chủ nhiệm ở <b>Quản trị</b>.'
        : 'Thầy cô chưa được phân công <b>chủ nhiệm</b> lớp nào trong năm học ' + thoat(D.nam) +
          '. Sổ chủ nhiệm mở cho giáo viên chủ nhiệm; nếu thầy cô đang chủ nhiệm, báo Ban giám hiệu ghi phân công ở <b>Quản trị › Phân công</b>.') + '</div>';
      ganChung(); return;
    }
    h += baoLoiNguon();
    if (khoaDen()) h += '<div class="hd-kiem vang">🔒 Sổ đã được Ban giám hiệu <b>khoá đến ngày ' + ngayVN(khoaDen()) + '</b> — các mục có ngày từ đó trở về trước chỉ xem, không sửa.</div>';
    if (may() && !laGVCNLopNay()) h += '<div class="scn-ghi-chu">Thầy cô đang xem sổ của lớp khác — chỉ đọc. ' + (vaiTro() === 'to_truong' ? 'Tổ trưởng không xem phần hoàn cảnh, hỗ trợ học sinh và trao đổi riêng với cha mẹ (dữ liệu nhạy cảm).' : '') + '</div>';
    h += '<nav class="scn-tabs" role="tablist">' + TABS.map(function (t) {
      return '<button class="' + (D.tab === t[0] ? 'on' : '') + '" data-tab="' + t[0] + '">' + t[1] + '</button>';
    }).join('') + '</nav><div class="scn-than">';
    var f = { 'tong-quan': veTongQuan, 'ke-hoach': veKeHoach, 'hoc-sinh': veHocSinh, 'theo-doi': veTheoDoi,
      'phu-huynh': vePhuHuynh, 'ho-tro': veHoTro, 'danh-gia': veDanhGia, 'tong-ket': veTongKet }[D.tab] || veTongQuan;
    h += f() + '</div>';
    EL.innerHTML = h;
    ganChung();
  }

  function dauMan() {
    var chon = '';
    if (laQuanLy() && D.dsLop.length) {
      var ds = D.dsLop.filter(function (l) { return !D.locCoSo || l.coSo === D.locCoSo; });
      chon = '<div class="scn-chon">' +
        (D.coSo.length > 1 ? oChon('scn-co-so', [['', 'Mọi điểm trường']].concat(D.coSo.map(function (c) { return [c.ma, c.ten]; })), D.locCoSo) : '') +
        oChon('scn-lop', ds.map(function (l) { return [l.lop, 'Lớp ' + l.lop + (D.gvcnCua[chuanLop(l.lop)] ? ' · ' + D.gvcnCua[chuanLop(l.lop)] : '')]; }), D.lop) + '</div>';
    } else if (D.lopCuaToi.length > 1) {
      chon = '<div class="scn-chon">' + oChon('scn-lop', D.lopCuaToi.map(function (l) { return [l, 'Lớp ' + l]; }), D.lop) + '</div>';
    }
    var phu = D.lop ? ['Lớp <b>' + thoat(D.lop) + '</b>', D.gvcnTen ? 'GVCN ' + thoat(D.gvcnTen) : '', 'Năm học ' + thoat(D.nam), D.coSoTen ? thoat(D.coSoTen) : '']
      .filter(Boolean).join(' · ') : 'Năm học ' + thoat(D.nam);
    return '<div class="scn-dau"><div><h2>Sổ chủ nhiệm</h2><p>' + phu + '</p></div>' + chon +
      (D.lop && !D.dangNap ? '<button class="scn-nut" id="scn-word">Xuất Word sổ</button>' : '') + '</div>';
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
      h += the('Kế hoạch chủ nhiệm năm học ' + thoat(D.nam),
        '<p class="scn-ghi-chu">Hạn nộp theo chương trình sinh hoạt chuyên môn: trước 26/9. Kế hoạch chủ nhiệm nằm trong sổ, không lập hồ sơ riêng.</p>' +
        oVan('kh-dac-diem', nd.dac_diem || '', 'Đặc điểm tình hình lớp', 4, khoa) +
        (khoa ? '' : '<button class="scn-nut phu nho" data-act="tu-sinh">Điền gợi ý từ số liệu lớp</button><span class="scn-an" id="kh-goi-y">' + thoat(goiY) + '</span>') +
        oVan('kh-chi-tieu', nd.chi_tieu != null ? nd.chi_tieu : CHI_TIEU_MAC, 'Chỉ tiêu lớp (mặc định = chỉ tiêu trường giao, sửa được)', 5, khoa) +
        BIEN_PHAP.map(function (b) { return oVan('kh-' + b[0], nd[b[0]] || '', 'Biện pháp — ' + b[1], 3, khoa); }).join('') +
        oVan('kh-shdc', nd.shdc_phu_trach || '', 'Tuần lớp phụ trách sinh hoạt dưới cờ (nộp kịch bản trước 07 ngày)', 2, khoa) +
        (khoa ? '' : '<div class="scn-hang"><button class="scn-nut" data-act="luu-kh-nam">Lưu kế hoạch năm</button></div>'));
    } else if (cap === 'thang') {
      var dsT = dsThangNamHoc(D.nam);
      if (!D.thangKH) D.thangKH = dsT.indexOf(hnay.slice(0, 7)) >= 0 ? hnay.slice(0, 7) : dsT[0];
      var ym = D.thangKH, kt = keHoach('thang', ym), ndT = (kt && kt.noi_dung) || {}, khoaT = !coGhi(ym + '-01');
      h += '<div class="scn-hang">' + oChon('kh-thang', dsT.map(function (x) { return [x, TEN_THANG(x)]; }), ym) + '</div>';
      h += the('Khung ' + TEN_THANG(ym).toLowerCase() + ' (máy điền sẵn)', veKhungThang(ym));
      h += the('Giáo viên bổ sung',
        oVan('kh-hoat-dong', ndT.hoat_dong || '', 'Hoạt động của lớp trong tháng', 4, khoaT) +
        oVan('kh-trong-tam', ndT.trong_tam || '', 'Việc trọng tâm (họp cha mẹ, kiểm tra định kỳ, STEM, ngày lễ…)', 3, khoaT) +
        oVan('kh-ket-qua', (kt && kt.ket_qua) || '', 'Kết quả cuối tháng', 3, khoaT) +
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
  function dongBCS(b, i) {
    return '<div class="scn-hang scn-bcs-dong"><input class="scn-o" list="scn-ds-cv" data-bcs-cv value="' + thoat(b.chuc_vu || '') + '" placeholder="Chức vụ">' +
      oChonHS('bcs-hs-' + i, b.hoc_sinh_ma || '').replace('<select ', '<select data-bcs-hs ') +
      '<button class="scn-x" data-act="xoa-bcs" title="Bỏ dòng">×</button></div>' +
      (i === 0 ? '<datalist id="scn-ds-cv">' + CHUC_VU_MAC.concat(['Chi đội trưởng', 'Chi đội phó', 'Phụ trách sao']).map(function (c) { return '<option value="' + thoat(c) + '">'; }).join('') + '</datalist>' : '');
  }
  function veFormHoanCanh(hs, c, ghi) {
    var k = ghi ? '' : ' disabled';
    return '<div class="scn-form">' +
      '<label class="scn-nhan">Em đang ở với<input id="hc-o-voi" class="scn-o" value="' + thoat(c.o_voi || '') + '" placeholder="Bố mẹ / ông bà / người giám hộ…"' + k + '></label>' +
      oVan('hc-cha-me', c.cha_me, 'Cha mẹ / người giám hộ (họ tên, nghề nghiệp, số điện thoại)', 2, !ghi) +
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
    if (!D.ngayTD) D.ngayTD = homNay();
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
      (ghi ? '<div class="scn-hang"><button class="scn-nut" data-act="luu-dd">Lưu điểm danh · vắng ' + soV + '/' + D.hs.length + '</button></div>' : '')));
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
        }).join('') + '</div><div class="scn-hang"><button class="scn-nut phu nho" data-act="them-bdd">+ Thêm người</button><button class="scn-nut" data-act="luu-bdd">Lưu ban đại diện</button></div>'
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
    return '<details class="scn-mo-them"' + (x.id ? ' open' : '') + '><summary>' + (x.id ? 'Sửa biên bản họp' : '+ Thêm biên bản họp') + '</summary><div class="scn-form">' +
      '<div class="scn-hang">' + oChon('hop-ky', KY_HOP, x.ky_hop || 'dot_xuat') + '<input type="date" id="hop-ngay" class="scn-o" value="' + thoat(x.ngay || homNay()) + '">' +
      '<label class="scn-nhan ngang">Dự <input type="number" min="0" id="hop-du" class="scn-o so" value="' + thoat(x.so_du != null ? x.so_du : '') + '"></label>' +
      '<label class="scn-nhan ngang">/ <input type="number" min="0" id="hop-tong" class="scn-o so" value="' + thoat(x.tong_so != null ? x.tong_so : D.hs.length) + '"></label></div>' +
      oVan('hop-noi-dung', x.noi_dung, 'Nội dung họp', 3) + oVan('hop-y-kien', x.phan_hoi, 'Ý kiến cha mẹ học sinh', 2) + oVan('hop-ket-luan', x.ket_luan, 'Kết luận', 2) +
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
      oVan('ht-bieu-hien', x.bieu_hien, 'Biểu hiện quan sát được', 2) +
      '<label class="scn-nhan">Môn / kỹ năng cần hỗ trợ<input id="ht-mon" class="scn-o" value="' + thoat(x.mon_ky_nang || '') + '" placeholder="Đọc, viết, tính toán…"></label>' +
      oVan('ht-bien-phap', x.bien_phap, 'Biện pháp (trong giờ, đôi bạn cùng tiến, phụ đạo buổi 2…)', 2) +
      '<label class="scn-nhan">Người phối hợp<input id="ht-phoi-hop" class="scn-o" value="' + thoat(x.nguoi_phoi_hop || '') + '" placeholder="Cha mẹ, GV bộ môn, Tổng phụ trách Đội, y tế…"></label>' +
      '<div class="scn-hang"><label class="scn-nhan ngang">Mốc xem lại <input type="date" id="ht-moc" class="scn-o" value="' + thoat(x.moc_xem_lai || '') + '"></label>' + oChon('ht-tt', TT_HT, x.trang_thai || 'dang_theo_doi') + '</div>' +
      oVan('ht-ket-qua', x.ket_qua, 'Kết quả', 2) +
      '<div class="scn-hang"><button class="scn-nut" data-act="luu-ht"' + (x.id ? ' data-id="' + x.id + '"' : '') + '>Lưu</button>' + (x.id || x.hoc_sinh_ma ? '<button class="scn-nut phu" data-act="huy-sua">Thôi</button>' : '') + '</div></div></details>';
  }

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
      (ky === 'ca_nam' ? oVan('tk-ban-giao', tk.ban_giao, 'Bàn giao cho GVCN năm sau (HS cần tiếp tục hỗ trợ, HS nổi trội, lưu ý sức khỏe - hoàn cảnh)', 4, khoa) : '') +
      (khoa ? '' : '<div class="scn-hang"><button class="scn-nut" data-act="luu-tk">Lưu ' + (ky === 'hk1' ? 'sơ kết' : 'tổng kết') + '</button></div>'));
    return h;
  }

  // ══════════ SỰ KIỆN ══════════
  function ganChung() {
    var o;
    o = document.getElementById('scn-lop'); if (o) o.onchange = function () { D.lop = o.value; D.tab = D.tab || 'tong-quan'; D.dangNap = true; ve(); napLop().then(function () { ve(); }); };
    o = document.getElementById('scn-co-so'); if (o) o.onchange = function () {
      D.locCoSo = o.value;
      var ds = D.dsLop.filter(function (l) { return !D.locCoSo || l.coSo === D.locCoSo; });
      if (ds.length && !ds.some(function (l) { return l.lop === D.lop; })) { D.lop = ds[0].lop; D.dangNap = true; ve(); napLop().then(function () { ve(); }); } else ve();
    };
    o = document.getElementById('scn-word'); if (o) o.onclick = xuatWord;
    o = document.getElementById('kh-thang'); if (o) o.onchange = function () { D.thangKH = o.value; ve(); };
    o = document.getElementById('kh-tuan'); if (o) o.onchange = function () { D.tuanKH = +o.value; ve(); };
    o = document.getElementById('td-ngay'); if (o) o.onchange = function () { if (/^\d{4}-\d{2}-\d{2}$/.test(o.value)) { D.ngayTD = o.value; ve(); } };
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
      'khoa': function () { datKhoa(giaTri('scn-khoa') || null, b); }, 'mo-khoa': function () { datKhoa(null, b); }
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
  function xemThu(xong) { if (xong) xong(); bao('Bản xem thử — đã cập nhật trên màn hình, không lưu lên máy chủ.'); ve(); }

  function luuSCNLop(truong, nut, thongBao) {
    var dong = Object.assign({ nam_hoc: D.nam, lop: D.lop }, truong);
    if (!may()) return xemThu(function () { D.so.lop = Object.assign({}, D.so.lop || {}, dong); });
    ghiMay(may().from('scn_lop').upsert(dong, { onConflict: 'nam_hoc,lop' }).select().maybeSingle(), nut, function (d) {
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
    luuSCNLop({ ban_dai_dien: ds }, null, 'Đã lưu Ban đại diện cha mẹ học sinh lớp.');
  }
  function datKhoa(ngay, nut) {
    var hoi = ngay ? 'Khoá sổ lớp ' + D.lop + ' đến hết ngày ' + ngayVN(ngay) + '? Giáo viên sẽ không sửa được các mục có ngày từ đó trở về trước.' : 'Mở khoá sổ lớp ' + D.lop + '?';
    var xn = window.hopHoi ? window.hopHoi(hoi, { tieuDe: 'Khoá sổ chủ nhiệm', nutOK: ngay ? 'Khoá sổ' : 'Mở khoá' }) : Promise.resolve(window.confirm(hoi));
    xn.then(function (ok) { if (ok) luuSCNLop({ khoa_den: ngay }, nut, ngay ? 'Đã khoá sổ đến ' + ngayVN(ngay) + '.' : 'Đã mở khoá sổ.'); });
  }
  function luuHoanCanh(ma, nut) {
    var cs = Array.prototype.slice.call(EL.querySelectorAll('[data-cs]')).filter(function (i) { return i.checked; }).map(function (i) { return i.getAttribute('data-cs'); });
    var chk = function (id) { var o = document.getElementById(id); return o ? !!o.checked : null; };
    var dong = { nam_hoc: D.nam, hoc_sinh_ma: ma, lop: D.lop, o_voi: giaTri('hc-o-voi') || null, cha_me: giaTri('hc-cha-me') || null, dien_chinh_sach: cs,
      giay_xac_nhan: giaTri('hc-giay') || null, suc_khoe: giaTri('hc-suc-khoe') || null, co_bhyt: chk('hc-bhyt'), du_sgk: chk('hc-sgk'),
      can_quan_tam: !!chk('hc-quan-tam'), nang_khieu: giaTri('hc-nang-khieu') || null, ghi_chu: giaTri('hc-ghi-chu') || null };
    if (document.getElementById('hc-kt')) { dong.kt_dang = giaTri('hc-kt') || null; dong.kt_co_giay = chk('hc-kt-giay'); }
    if (!may()) return xemThu(function () { D.so.hoanCanh[ma] = dong; });
    ghiMay(may().from('scn_hoan_canh').upsert(dong, { onConflict: 'nam_hoc,hoc_sinh_ma' }).select().maybeSingle(), nut, function (d) {
      D.so.hoanCanh[ma] = d || dong; bao('Đã lưu hồ sơ ' + tenHS(ma) + '.'); ve();
    });
  }
  function luuKeHoach(cap, nut) {
    var k = khungNam(D.nam), ky = '', ngay, nd = {}, ketQua = null;
    if (cap === 'nam') {
      ngay = k ? k.batDau : D.nam.slice(0, 4) + '-09-01';
      nd = { dac_diem: giaTri('kh-dac-diem'), chi_tieu: giaTri('kh-chi-tieu'), shdc_phu_trach: giaTri('kh-shdc') };
      BIEN_PHAP.forEach(function (b) { nd[b[0]] = giaTri('kh-' + b[0]); });
    } else if (cap === 'thang') {
      ky = D.thangKH; ngay = ky + '-01';
      nd = { hoat_dong: giaTri('kh-hoat-dong'), trong_tam: giaTri('kh-trong-tam') }; ketQua = giaTri('kh-ket-qua') || null;
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
      dong = { loai: 'hop', ky_hop: giaTri('hop-ky'), ngay: giaTri('hop-ngay') || homNay(), so_du: giaTri('hop-du') === '' ? null : +giaTri('hop-du'), tong_so: giaTri('hop-tong') === '' ? null : +giaTri('hop-tong'),
        noi_dung: giaTri('hop-noi-dung') || null, phan_hoi: giaTri('hop-y-kien') || null, ket_luan: giaTri('hop-ket-luan') || null, hoc_sinh_ma: null, trang_thai: 'xong' };
    } else {
      dong = { loai: giaTri('tdph-loai') || 'trao_doi', ngay: giaTri('tdph-ngay') || homNay(), hoc_sinh_ma: giaTri('tdph-hs') || null, kenh: giaTri('tdph-kenh') || null,
        trang_thai: giaTri('tdph-tt') || 'xong', noi_dung: giaTri('tdph-noi-dung') || null, phan_hoi: giaTri('tdph-phan-hoi') || null, ket_luan: giaTri('tdph-viec') || null };
    }
    if (!dong.noi_dung) { bao('Chưa có nội dung.'); return; }
    luuDongDanhSach('scn_lien_lac', 'lienLac', dong, id, nut, 'Đã lưu.');
  }
  function luuHoTro(id, nut) {
    var dong = { hoc_sinh_ma: giaTri('ht-hs'), loai: giaTri('ht-loai'), ngay: giaTri('ht-ngay') || homNay(), bieu_hien: giaTri('ht-bieu-hien') || null, mon_ky_nang: giaTri('ht-mon') || null,
      bien_phap: giaTri('ht-bien-phap') || null, nguoi_phoi_hop: giaTri('ht-phoi-hop') || null, moc_xem_lai: giaTri('ht-moc') || null, trang_thai: giaTri('ht-tt'), ket_qua: giaTri('ht-ket-qua') || null };
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
    var q = id ? may().from(bang).update(dong).eq('id', +id).select().maybeSingle() : may().from(bang).insert(dong).select().maybeSingle();
    ghiMay(q, nut, function (d) {
      if (id && !d) { bao('Không sửa được — không đủ quyền hoặc ngày đã khoá sổ.'); if (nut) nut.disabled = false; return; }
      thay(d); bao(chu); ve();
    });
  }
  function luuTongKet(nut) {
    var dong = { nam_hoc: D.nam, lop: D.lop, ky: D.kyTK, ngay: giaTri('tk-ngay') || homNay(), viec_lam_duoc: giaTri('tk-lam-duoc') || null,
      ton_tai: giaTri('tk-ton-tai') || null, de_xuat: giaTri('tk-de-xuat') || null };
    if (D.kyTK === 'ca_nam') dong.ban_giao = giaTri('tk-ban-giao') || null;
    if (!may()) return xemThu(function () { D.so.tongKet[D.kyTK] = dong; });
    ghiMay(may().from('scn_tong_ket').upsert(dong, { onConflict: 'nam_hoc,lop,ky' }).select().maybeSingle(), nut, function (d) { D.so.tongKet[D.kyTK] = d || dong; bao('Đã lưu.'); ve(); });
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

  // ══════════ XUẤT WORD — "Sổ chủ nhiệm" đúng thể thức (WORD_TIEN_ICH, NĐ 30) ══════════
  function xuatWord() {
    var W = window.WORD_TIEN_ICH;
    if (!W) { bao('Chưa tải được bộ xuất Word.'); return; }
    var c = W.chan, S = D.so, hs = D.hs, k = khungNam(D.nam);
    var NGAT = '<br clear="all" style="page-break-before:always">';
    var muc = function (so, ten) { return '<p style="margin:14pt 0 6pt"><b>' + so + '. ' + c(ten) + '</b></p>'; };
    var nho = function (t) { return '<p style="margin:6pt 0 3pt"><b><i>' + c(t) + '</i></b></p>'; };
    var doan = function (t) { return t ? String(t).split('\n').map(function (d) { return '<p style="margin:0 0 3pt;text-align:justify">' + c(d) + '</p>'; }).join('') : '<p style="margin:0 0 3pt" class="nghieng">(chưa ghi)</p>'; };
    var bang = function (dau, dong, rongCot) {
      return '<table class="co-dinh"><thead><tr>' + dau.map(function (d, i) { return '<th' + (rongCot && rongCot[i] ? ' style="width:' + rongCot[i] + '"' : '') + '>' + c(d) + '</th>'; }).join('') + '</tr></thead><tbody>' +
        (dong.length ? dong.map(function (r) { return '<tr>' + r.map(function (o, i) { return '<td' + (i === 0 ? ' class="giua"' : '') + '>' + o + '</td>'; }).join('') + '</tr>'; }).join('') : '<tr><td colspan="' + dau.length + '" class="giua nghieng">Chưa có</td></tr>') + '</tbody></table>';
    };
    var chuQuan = W.cauHinh('DON_VI_CHU_QUAN'), truong = W.cauHinh('TEN_TRUONG');
    // Bìa
    var h = '<p class="giua" style="margin:0;font-size:13pt">' + c(String(chuQuan).toUpperCase()) + '</p>' +
      '<p class="giua" style="margin:0;font-size:13pt"><b>' + c(String(truong).toUpperCase()) + '</b></p>' + W.gachTenTruong(truong || 'TRUONG') +
      '<p style="margin:120pt 0 0"></p><p class="giua" style="margin:0"><b style="font-size:30pt">SỔ CHỦ NHIỆM</b></p>' +
      '<p class="giua" style="margin:18pt 0 0;font-size:18pt">Lớp: <b>' + c(D.lop) + '</b></p>' +
      '<p class="giua" style="margin:6pt 0 0;font-size:15pt">Năm học ' + c(D.nam) + '</p>' +
      '<p style="margin:90pt 0 0"></p>' +
      '<p style="margin:0 0 0 3cm;font-size:14pt">Giáo viên chủ nhiệm: <b>' + c(D.gvcnTen || '……………………………………') + '</b></p>' +
      (D.coSoTen ? '<p style="margin:4pt 0 0 3cm;font-size:14pt">Điểm trường: ' + c(D.coSoTen) + '</p>' : '') +
      '<p style="margin:4pt 0 0 3cm;font-size:14pt">Sĩ số: ' + hs.length + ' học sinh</p>' + NGAT;
    // Trang nội dung
    h += W.theThuc() + '<p class="giua" style="margin:14pt 0 0"><b style="font-size:14pt">SỔ CHỦ NHIỆM</b></p>' +
      '<p class="giua" style="margin:0 0 6pt"><b>Lớp ' + c(D.lop) + ' — năm học ' + c(D.nam) + '</b></p>' +
      '<p class="nghieng" style="font-size:11pt;margin:0 0 6pt">Sổ có dữ liệu cá nhân của học sinh (Luật Bảo vệ dữ liệu cá nhân 2025): lưu hành nội bộ, không chia sẻ lên nhóm mạng xã hội.</p>';
    var nam = hs.filter(function (x) { return x.gioi_tinh === 'Nam'; }).length, nu = hs.filter(function (x) { return x.gioi_tinh === 'Nữ'; }).length;
    h += muc('I', 'THÔNG TIN LỚP') + '<p style="margin:0">Sĩ số: <b>' + hs.length + '</b> (nam ' + nam + ', nữ ' + nu + '; khuyết tật học hòa nhập ' + hs.filter(function (x) { return x.khuyet_tat_hoa_nhap; }).length + ').</p>';
    var bcs = (S.lop && S.lop.ban_can_su) || [];
    h += nho('Ban cán sự lớp' + (S.lop && S.lop.ngay_bau ? ' (bầu ngày ' + ngayVN(S.lop.ngay_bau) + ')' : '')) + bang(['TT', 'Chức vụ', 'Họ và tên'], bcs.map(function (b, i) { return [i + 1, c(b.chuc_vu), c(b.ho_ten || tenHS(b.hoc_sinh_ma))]; }), ['8%', '40%', '52%']);
    h += muc('II', 'DANH SÁCH HỌC SINH') + bang(['TT', 'Họ và tên', 'Ngày sinh', 'Giới', 'Ghi chú'], hs.map(function (x, i) {
      return [i + 1, c(x.ho_ten), '<span class="giua">' + ngayVN(x.ngay_sinh) + '</span>', c(x.gioi_tinh || ''), x.khuyet_tat_hoa_nhap ? 'Hòa nhập' : ''];
    }), ['7%', '43%', '17%', '10%', '23%']);
    var dsCs = hs.filter(function (x) { var hc = S.hoanCanh[x.ma]; return hc && ((hc.dien_chinh_sach || []).length || hc.can_quan_tam); });
    h += nho('Học sinh thuộc diện chính sách, cần quan tâm') + (anNhayCam() ? '<p class="nghieng">(Không đủ quyền đọc hồ sơ hoàn cảnh.)</p>' : bang(['TT', 'Họ và tên', 'Diện / hoàn cảnh', 'Ở với'], dsCs.map(function (x, i) {
      var hc = S.hoanCanh[x.ma]; return [i + 1, c(x.ho_ten), c((hc.dien_chinh_sach || []).map(function (d) { return TEN_CS[d] || d; }).concat(hc.can_quan_tam ? ['Cần quan tâm'] : []).join('; ')), c(hc.o_voi || '')];
    }), ['7%', '33%', '40%', '20%']));
    // Kế hoạch năm
    var kn = keHoach('nam', ''), nd = (kn && kn.noi_dung) || {};
    h += muc('III', 'KẾ HOẠCH CHỦ NHIỆM NĂM HỌC') + nho('1. Đặc điểm tình hình') + doan(nd.dac_diem) + nho('2. Chỉ tiêu') + doan(nd.chi_tieu != null ? nd.chi_tieu : (kn ? '' : CHI_TIEU_MAC)) +
      nho('3. Biện pháp') + BIEN_PHAP.map(function (b) { return '<p style="margin:3pt 0 0"><i>' + c(b[1]) + ':</i></p>' + doan(nd[b[0]]); }).join('') +
      (nd.shdc_phu_trach ? nho('4. Tuần lớp phụ trách sinh hoạt dưới cờ') + doan(nd.shdc_phu_trach) : '');
    // Kế hoạch tháng + tuần
    h += muc('IV', 'KẾ HOẠCH THÁNG, SINH HOẠT LỚP HẰNG TUẦN');
    var coThang = false;
    dsThangNamHoc(D.nam).forEach(function (ym) {
      var kt = keHoach('thang', ym), tuan = S.keHoach.filter(function (x) { return x.cap === 'tuan' && thangCuaTuan(D.nam, +x.ky.slice(1)) === ym; }).sort(function (a, b) { return a.ky < b.ky ? -1 : 1; });
      if (!kt && !tuan.length) return;
      coThang = true;
      var cd = chuDiemThang(D.nam, ym), n2 = (kt && kt.noi_dung) || {};
      h += nho(TEN_THANG(ym) + (cd ? ' — chủ điểm: ' + cd.khgd + (cd.doi !== cd.khgd ? ' / Đội: ' + cd.doi : '') : ''));
      if (kt) h += '<p style="margin:0"><i>Hoạt động:</i></p>' + doan(n2.hoat_dong) + '<p style="margin:0"><i>Việc trọng tâm:</i></p>' + doan(n2.trong_tam) + '<p style="margin:0"><i>Kết quả:</i></p>' + doan(kt.ket_qua);
      if (tuan.length) h += bang(['Tuần', 'Sơ kết tuần', 'Chủ đề, lồng ghép', 'Kế hoạch tuần tới'], tuan.map(function (x) {
        var n3 = x.noi_dung || {}; return [+x.ky.slice(1), c(n3.so_ket || ''), c([n3.chu_de, n3.long_ghep].filter(Boolean).join('; ')), c(n3.tuan_toi || '')];
      }), ['9%', '33%', '28%', '30%']);
    });
    if (!coThang) h += '<p class="nghieng">(Chưa ghi kế hoạch tháng, tuần.)</p>';
    // Chuyên cần
    h += muc('V', 'CHUYÊN CẦN');
    var dongCc = dsThangNamHoc(D.nam).map(function (ym) {
      var cc = tongHopChuyenCan(S.vang, ym + '-01', ym + '-31'), buoi = S.ddl.filter(function (d) { return d.ngay.slice(0, 7) === ym; }).length, tl = tiLeChuyenCan(cc.lop.tong, hs.length, buoi);
      return (cc.lop.tong || buoi) ? [c(TEN_THANG(ym)), cc.lop.P, cc.lop.K, cc.lop.R, buoi, tl != null ? tl + '%' : ''] : null;
    }).filter(Boolean);
    h += bang(['Tháng', 'Có phép', 'Không phép', 'Chưa rõ', 'Buổi đã điểm danh', 'Tỉ lệ chuyên cần'], dongCc, ['20%', '14%', '14%', '14%', '19%', '19%']);
    var ccNam = tongHopChuyenCan(S.vang), maV = Object.keys(ccNam.theoHS);
    if (maV.length) h += nho('Số buổi nghỉ từng học sinh') + bang(['TT', 'Họ và tên', 'Có phép', 'Không phép', 'Chưa rõ', 'Tổng'], maV.sort(function (a, b) { return ccNam.theoHS[b].tong - ccNam.theoHS[a].tong; }).map(function (m, i) {
      var x = ccNam.theoHS[m]; return [i + 1, c(tenHS(m)), x.P, x.K, x.R, x.tong];
    }), ['7%', '41%', '13%', '13%', '13%', '13%']);
    // Theo dõi
    h += muc('VI', 'THEO DÕI, NHẬN XÉT, KHEN – NHẮC') + bang(['Ngày', 'Học sinh', 'Loại', 'Nội dung'], S.theoDoi.slice().reverse().map(function (x) {
      return [ngayVN(x.ngay), c(tenHS(x.hoc_sinh_ma)), c(TEN_LOAI_TD[x.loai] || x.loai), c(x.noi_dung) + (x.da_bao_cmhs ? ' <i>(đã báo cha mẹ)</i>' : '')];
    }), ['14%', '26%', '12%', '48%']);
    // Phụ huynh
    var bdd = (S.lop && S.lop.ban_dai_dien) || [];
    h += muc('VII', 'PHỐI HỢP VỚI CHA MẸ HỌC SINH') + nho('Ban đại diện cha mẹ học sinh lớp') + bang(['TT', 'Vai trò', 'Họ và tên'], bdd.map(function (b, i) { return [i + 1, c(b.vai_tro), c(b.ho_ten)]; }), ['8%', '32%', '60%']) +
      nho('Họp cha mẹ học sinh') + bang(['Ngày', 'Kỳ họp', 'Dự', 'Nội dung, ý kiến, kết luận'], S.lienLac.filter(function (x) { return x.loai === 'hop'; }).slice().reverse().map(function (x) {
        return [ngayVN(x.ngay), c(TEN_KY_HOP[x.ky_hop] || ''), x.tong_so ? (x.so_du || 0) + '/' + x.tong_so : '', c(x.noi_dung || '') + (x.phan_hoi ? '<br><i>Ý kiến:</i> ' + c(x.phan_hoi) : '') + (x.ket_luan ? '<br><i>Kết luận:</i> ' + c(x.ket_luan) : '')];
      }), ['14%', '18%', '10%', '58%']) +
      nho('Trao đổi riêng, phản ánh') + bang(['Ngày', 'Học sinh', 'Nội dung', 'Phản hồi, việc cần làm'], S.lienLac.filter(function (x) { return x.loai !== 'hop'; }).slice().reverse().map(function (x) {
        return [ngayVN(x.ngay), c(tenHS(x.hoc_sinh_ma)), c(x.noi_dung || ''), c([x.phan_hoi, x.ket_luan].filter(Boolean).join(' — '))];
      }), ['14%', '24%', '34%', '28%']);
    // Hỗ trợ
    h += muc('VIII', 'HỌC SINH CẦN HỖ TRỢ VÀ KẾ HOẠCH HỖ TRỢ') + (anNhayCam() ? '<p class="nghieng">(Không đủ quyền đọc.)</p>' : bang(['TT', 'Học sinh', 'Nhu cầu, biểu hiện', 'Biện pháp, phối hợp', 'Kết quả'], S.hoTro.map(function (x, i) {
      return [i + 1, c(tenHS(x.hoc_sinh_ma)), c((TEN_HT[x.loai] || x.loai) + (x.bieu_hien ? ': ' + x.bieu_hien : '')), c([x.bien_phap, x.nguoi_phoi_hop].filter(Boolean).join(' — ')), c((TEN_TT_HT[x.trang_thai] || '') + (x.ket_qua ? ': ' + x.ket_qua : ''))];
    }), ['6%', '20%', '28%', '28%', '18%']));
    // Đánh giá
    h += muc('IX', 'KẾT QUẢ ĐÁNH GIÁ ĐỊNH KỲ (theo Thông tư 27/2020/TT-BGDĐT)');
    var coDg = false;
    KY_DG.forEach(function (kk) {
      var mon = demMuc(S.kq, kk[0], 'mon_ma', ['T', 'H', 'C'], hoaNhap());
      var dong = MON.filter(function (m) { return mon[m[0]]; }).map(function (m) { var d = mon[m[0]]; return [c(m[1]), d.T, d.H, d.C, d.mau]; });
      if (!dong.length) return;
      coDg = true;
      h += nho(kk[1]) + bang(['Môn học, hoạt động giáo dục', 'Hoàn thành tốt', 'Hoàn thành', 'Chưa hoàn thành', 'Mẫu số'], dong, ['36%', '16%', '16%', '16%', '16%']);
    });
    if (!coDg) h += '<p class="nghieng">(Chưa có kết quả đánh giá trên hệ thống.)</p>';
    // Tổng kết
    h += muc('X', 'SƠ KẾT HỌC KỲ I, TỔNG KẾT NĂM HỌC');
    [['hk1', 'Sơ kết học kỳ I'], ['ca_nam', 'Tổng kết năm học']].forEach(function (kk) {
      var tk = S.tongKet[kk[0]], sl = soLieuKy(kk[0]);
      h += nho(kk[1] + (tk && tk.ngay ? ' (lập ngày ' + ngayVN(tk.ngay) + ')' : '')) +
        '<p style="margin:0">Chuyên cần: ' + sl.cc.lop.tong + ' lượt vắng (có phép ' + sl.cc.lop.P + ', không phép ' + sl.cc.lop.K + ')' + (sl.tl != null ? ', tỉ lệ chuyên cần ' + sl.tl + '%' : '') + '.</p>' +
        '<p style="margin:0"><i>Việc làm được:</i></p>' + doan(tk && tk.viec_lam_duoc) + '<p style="margin:0"><i>Tồn tại:</i></p>' + doan(tk && tk.ton_tai) + '<p style="margin:0"><i>Đề xuất:</i></p>' + doan(tk && tk.de_xuat) +
        (kk[0] === 'ca_nam' ? '<p style="margin:0"><i>Bàn giao cho giáo viên chủ nhiệm năm sau:</i></p>' + doan(tk && tk.ban_giao) : '');
    });
    h += W.khoiKy('GIÁO VIÊN CHỦ NHIỆM', D.gvcnTen || '');
    if (k && k.suyTam) h += '<p class="nghieng" style="font-size:11pt">Ghi chú: tuần học năm ' + c(D.nam) + ' suy tạm từ 05/9, chưa có khung thời gian chính thức.</p>';
    W.taiVe(W.khungWord('Sổ chủ nhiệm lớp ' + D.lop, h), 'so-chu-nhiem-lop-' + String(D.lop).toLowerCase().replace(/\s+/g, '') + '-' + D.nam + '.doc');
  }

  // ══════════ GẮN VÀO TRANG ══════════
  // Vẽ khi màn #mh-sochunhiem được bật (app.js chỉ đổi lớp "hien"), bất kể đi
  // bằng menu, thẻ trang chủ hay #sochunhiem trên địa chỉ.
  function khiHien() {
    var mh = document.getElementById('mh-sochunhiem'), vung = document.getElementById('vung-sochunhiem');
    if (mh && vung && mh.classList.contains('hien')) ve(vung);
  }
  function gan() {
    var mh = document.getElementById('mh-sochunhiem'), vung = document.getElementById('vung-sochunhiem');
    if (!mh || !vung) return;
    EL = vung;
    vung.addEventListener('click', khiBam);
    if (window.MutationObserver) new MutationObserver(khiHien).observe(mh, { attributes: true, attributeFilter: ['class'] });
    khiHien();
  }
  // Đăng nhập xong: xoá trạng thái xem thử, nạp lại lần tới khi mở màn
  document.addEventListener('dangnhap-xong', function () { D.khoiTao = false; D.lop = ''; D.so = null; khiHien(); });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', gan); else gan();

  // Mở sổ, tuỳ chọn nhảy thẳng tới một lớp (nút trong danh sách lớp ở màn Học sinh).
  // Lớp không thuộc danh sách người này được xem thì napKhung tự trả về lớp mặc định.
  function moLop(lop) {
    if (lop && lop !== D.lop) {
      D.lop = lop; D.tab = 'tong-quan';
      if (D.khoiTao) { D.dangNap = true; napLop().then(function () { ve(); }); }
    }
    if (window.chuyenManHinh) window.chuyenManHinh('sochunhiem');
  }
  window.SO_CHU_NHIEM = { ve: ve, moLop: moLop, taiLai: function () { D.khoiTao = false; khiHien(); } };
})(typeof window !== 'undefined' ? window : null);
