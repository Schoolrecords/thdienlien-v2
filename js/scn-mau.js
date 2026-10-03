// ============================================================
// scn-mau.js — "✨ ĐIỀN MẪU" CHO SỔ CHỦ NHIỆM (thuần, chạy được Node)
//
// 3/10/2026 thầy Chung: "nhập Kế hoạch hoặc các nội dung khác cho Sổ chủ nhiệm: có nút
// 'Mẫu AI', bấm nút nội dung tự điền sẵn cho các thầy cô chỉ sửa" — "ở mức tốt nhất KHÔNG
// có API, mà là tự App mình sinh ra".
//
// Không gọi máy chủ, không gửi dữ liệu học sinh đi đâu: ghép KHO CÂU soạn sẵn theo khối,
// tháng, chủ điểm (CHU_DIEM của so-chu-nhiem.js) với SỐ LIỆU THẬT của lớp (sĩ số, chuyên
// cần, nhật ký khen/nhắc, học sinh cần hỗ trợ). Mỗi lớp chọn cách diễn đạt khác nhau theo
// tên lớp (băm) để sổ các lớp không giống hệt nhau. Chỉ điền ô TRỐNG — so-chu-nhiem.js lo.
//
// sinh(loai, ctx) → { 'id-o-nhap': 'nội dung', … }
//   loai: 'nam' | 'thang' | 'tuan' | 'hop' | 'tk' | 'ht'
// ============================================================
(function (goc) {
  'use strict';

  // ── tiện ích ──
  function bam(s) { var h = 0; s = String(s || ''); for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; }
  function chon(ds, hat) { return ds[bam(hat) % ds.length]; }
  function dsTen(a, toiDa) {
    a = (a || []).filter(Boolean);
    if (!a.length) return '';
    var n = toiDa || 6, dau = a.slice(0, n);
    return dau.join(', ') + (a.length > n ? '… (' + a.length + ' em)' : '');
  }
  function pt(a, b) { return so(b ? Math.round(a / b * 1000) / 10 : 0); }
  function so(n) { return String(n).replace('.', ','); }   // số thập phân kiểu Việt: 99,5%
  function dong(ds) { return ds.filter(Boolean).map(function (x) { return /^[-*+]/.test(x) ? x : '- ' + x; }).join('\n'); }

  // ── nội dung trọng tâm theo khối (CT GDPT 2018, cấp tiểu học) ──
  var KHOI = {
    1: { tv: 'làm quen âm, vần; đọc đúng, viết đúng mẫu chữ; tư thế ngồi viết, cầm bút', toan: 'các số trong phạm vi 10, 100; cộng trừ không nhớ',
      ne: 'làm quen nền nếp lớp 1: giờ giấc, xếp hàng, giữ gìn sách vở, tự phục vụ', ky: 'mạnh dạn giao tiếp, biết chào hỏi, xin phép' },
    2: { tv: 'đọc trơn, đọc hiểu đoạn ngắn; viết đúng chính tả, câu đơn giản', toan: 'cộng trừ có nhớ trong phạm vi 100, 1000; bảng nhân chia 2, 5',
      ne: 'giữ nền nếp học tập, tự giác chuẩn bị đồ dùng', ky: 'hợp tác trong nhóm đôi, nhóm bốn' },
    3: { tv: 'đọc hiểu, viết đoạn văn ngắn; mở rộng vốn từ', toan: 'bảng nhân chia; nhân chia số có nhiều chữ số; làm quen phân số đơn giản',
      ne: 'tự quản trong học tập; giữ vở sạch chữ đẹp', ky: 'trình bày ý kiến trước lớp, làm việc nhóm' },
    4: { tv: 'đọc hiểu văn bản dài hơn, viết bài văn (kể chuyện, miêu tả)', toan: 'số tự nhiên lớp triệu; phân số và các phép tính với phân số',
      ne: 'tự học, tự quản; ý thức trách nhiệm với nhóm, lớp', ky: 'tự học, tìm kiếm thông tin, thuyết trình' },
    5: { tv: 'đọc hiểu, cảm thụ văn bản; viết bài văn hoàn chỉnh', toan: 'số thập phân, tỉ số phần trăm, hình học và đo lường',
      ne: 'tự giác, tự quản; làm gương cho các em lớp dưới', ky: 'chuẩn bị tâm thế, kỹ năng học tập để vào lớp 6' }
  };
  function k(ctx) { return KHOI[ctx.khoi] || KHOI[3]; }

  // ════════════════════════════════════════════════════════════
  // KẾ HOẠCH NĂM
  // ════════════════════════════════════════════════════════════
  function nam(ctx) {
    var K = k(ctx), h = ctx.lop + '|nam', hs = ctx.siSo || 0;
    var r = {};
    r['kh-dac-diem'] = ctx.dacDiem || '';
    r['kh-thuan-loi'] = dong([
      chon(['Đa số học sinh ngoan, lễ phép, có ý thức học tập', 'Phần lớn học sinh chăm ngoan, đi học đều, có ý thức tốt'], h + 1) + (ctx.khoi > 1 ? '; nền nếp lớp đã được rèn từ năm học trước.' : '; các em háo hức, thích đến trường.'),
      'Nhà trường quan tâm chỉ đạo; cơ sở vật chất, phòng học, thiết bị dạy học cơ bản đủ cho học 2 buổi/ngày.',
      'Cha mẹ học sinh quan tâm, phối hợp với giáo viên; Ban đại diện cha mẹ học sinh lớp nhiệt tình.',
      'Giáo viên chủ nhiệm nắm được đặc điểm, hoàn cảnh của từng em ngay từ đầu năm.'
    ]);
    var kk = [];
    if (ctx.hoTro) kk.push('Có ' + ctx.hoTro + ' em cần quan tâm, hỗ trợ (học tập, hoàn cảnh, sức khỏe…) — cần kèm cặp thường xuyên.');
    if (ctx.hoaNhap) kk.push(ctx.hoaNhap + ' em khuyết tật học hòa nhập — cần kế hoạch giáo dục cá nhân.');
    if (ctx.chinhSach) kk.push(ctx.chinhSach + ' em thuộc diện chính sách, hoàn cảnh khó khăn.');
    kk.push(chon(['Một số em còn rụt rè, chưa mạnh dạn phát biểu; chữ viết chưa đều.', 'Một số em tiếp thu chậm, còn quên đồ dùng học tập, chưa tự giác ôn bài.'], h + 2));
    kk.push('Một số gia đình đi làm ăn xa, học sinh ở với ông bà nên việc kèm cặp ở nhà còn hạn chế.');
    if (hs > 35) kk.push('Sĩ số đông (' + hs + ' em) nên việc quan tâm từng em cần chia nhóm, giao việc cho ban cán sự.');
    r['kh-kho-khan'] = dong(kk);
    var cs = ctx.chiTieu || {};
    r['kh-m-duy_tri'] = '* Mục tiêu: Duy trì sĩ số 100% (' + hs + '/' + hs + ' em); tỉ lệ chuyên cần từ 98% trở lên; không có học sinh bỏ học.\n' +
      '* Nhiệm vụ và giải pháp:\n' + dong([
        'Điểm danh hằng buổi trên sổ; em vắng không phép liên hệ gia đình ngay trong buổi.',
        'Theo dõi em có nguy cơ bỏ học, hoàn cảnh khó khăn; báo Ban giám hiệu khi vắng dài ngày.',
        'Xây dựng lớp học thân thiện, hạnh phúc để các em thích đến trường.']);
    r['kh-m-chat_luong'] = '* Mục tiêu: 100% học sinh hoàn thành chương trình lớp học; phẩm chất, năng lực Đạt trở lên, trong đó Tốt từ 70% trở lên' + (cs.ghiChu ? ' (' + cs.ghiChu + ')' : '') + '.\n' +
      '* Nhiệm vụ và giải pháp:\n' + dong([
        'Tiếng Việt: ' + K.tv + '.', 'Toán: ' + K.toan + '.',
        'Dạy học phân hóa: bồi dưỡng em năng khiếu, phụ đạo em chưa hoàn thành ngay trong tiết và buổi 2.',
        'Đánh giá thường xuyên bằng nhận xét theo Thông tư 27/2020; ghi nhận tiến bộ của từng em.',
        'Rèn ' + K.ne + '; ' + K.ky + '.']);
    r['kh-m-ngoai_gio'] = '* Mục tiêu: 100% học sinh tham gia các hoạt động giáo dục ngoài giờ, hoạt động trải nghiệm theo chủ điểm tháng.\n' +
      '* Nhiệm vụ và giải pháp:\n' + dong([
        'Thực hiện sinh hoạt dưới cờ, sinh hoạt lớp theo chủ điểm; lồng ghép an toàn giao thông, kỹ năng sống, phòng chống đuối nước.',
        'Tổ chức đọc sách thư viện, trò chơi dân gian, văn nghệ chào mừng các ngày lễ.',
        'Giữ gìn vệ sinh lớp học, chăm sóc bồn hoa, cây xanh được giao.']);
    r['kh-m-phong_trao'] = '* Mục tiêu: Lớp hưởng ứng tốt các phong trào thi đua của trường, Liên đội.\n' +
      '* Nhiệm vụ và giải pháp:\n' + dong([
        'Thi đua "Dạy tốt - Học tốt", "Vở sạch - Chữ đẹp", "Lớp học thân thiện".',
        'Vận dụng phương pháp dạy học tích cực: học theo nhóm, trò chơi học tập, bàn tay nặn bột, giáo dục STEM.',
        'Phát huy vai trò Hội đồng tự quản; thi đua giữa các tổ hằng tuần.']);
    r['kh-m-doi'] = '* Mục tiêu: ' + (ctx.khoi <= 2 ? '100% học sinh là Sao nhi đồng chăm ngoan' : (ctx.khoi === 3 ? 'Phấn đấu kết nạp Đội viên đợt 26/3 cho các em đủ điều kiện' : '100% học sinh là Đội viên, Chi đội vững mạnh')) + '.\n' +
      '* Nhiệm vụ và giải pháp:\n' + dong([
        'Phối hợp với Tổng phụ trách Đội tổ chức sinh hoạt ' + (ctx.khoi <= 2 ? 'Sao' : 'Chi đội') + ' theo chủ điểm tháng.',
        'Tham gia kế hoạch nhỏ, nuôi heo đất, ủng hộ bạn khó khăn.',
        'Học tập và làm theo 5 điều Bác Hồ dạy.']);
    r['kh-m-hoi_thi'] = '* Mục tiêu: Tham gia đầy đủ các hội thi, sân chơi do trường và cấp trên tổ chức' + (ctx.khoi >= 3 ? ' (Trạng nguyên Tiếng Việt, Violympic, Tiếng Anh, An toàn giao thông…)' : '') + '.\n' +
      '* Nhiệm vụ và giải pháp:\n' + dong([
        'Phát hiện em có năng khiếu từ đầu năm, bồi dưỡng trong buổi 2.',
        'Phối hợp cha mẹ học sinh tạo điều kiện cho các em luyện tập, dự thi.']);
    r['kh-m-phoi_hop'] = '* Mục tiêu: Giữ liên lạc thường xuyên với 100% gia đình học sinh; họp cha mẹ học sinh 3 lần/năm.\n' +
      '* Nhiệm vụ và giải pháp:\n' + dong([
        'Họp cha mẹ học sinh đầu năm, cuối học kỳ I, cuối năm; trao đổi riêng khi em có biểu hiện bất thường.',
        'Nhóm liên lạc của lớp chỉ đưa thông tin chung; kết quả từng em trao đổi riêng với gia đình.',
        'Phối hợp Ban đại diện cha mẹ học sinh trong các hoạt động; không thu các khoản ngoài quy định.']);
    return r;
  }

  // ════════════════════════════════════════════════════════════
  // KẾ HOẠCH THÁNG
  // ════════════════════════════════════════════════════════════
  function thang(ctx) {
    var K = k(ctx), cd = ctx.cd || {}, h = ctx.lop + '|' + ctx.ym, m = +String(ctx.ym || '').slice(5, 7);
    var r = {};
    var day = [];
    if (m === 9) day.push('Ổn định tổ chức lớp, bầu Hội đồng tự quản; kiểm tra sách vở, đồ dùng học tập.', 'Rà soát chất lượng đầu năm, lập danh sách học sinh cần hỗ trợ, học sinh năng khiếu.');
    else if (m === 12 || m === 5) day.push('Ôn tập, củng cố kiến thức; kiểm tra định kỳ ' + (m === 12 ? 'cuối học kỳ I' : 'cuối năm học') + (ctx.khoi >= 4 || m === 5 ? ' môn Tiếng Việt, Toán' : '') + ' nghiêm túc, đúng quy chế.');
    else if (m === 11 || m === 3) day.push('Thực hiện chương trình theo kế hoạch dạy học; ' + (ctx.khoi >= 4 ? 'kiểm tra định kỳ giữa học kỳ (Tiếng Việt, Toán).' : 'đánh giá giữa học kỳ bằng nhận xét.'));
    else if (m === 2) day.push('Ổn định nền nếp sau Tết; kiểm tra chuyên cần, nhắc nhở em nghỉ học kéo dài.');
    else day.push('Thực hiện đúng chương trình, kế hoạch dạy học tháng ' + m + '.');
    day.push('Tiếng Việt: ' + K.tv + '. Toán: ' + K.toan + '.');
    day.push(chon(['Phụ đạo em chưa hoàn thành, bồi dưỡng em năng khiếu trong buổi 2.', 'Kèm cặp em tiếp thu chậm theo nhóm; giao bài nâng cao cho em học tốt.'], h + 1));
    if (ctx.hoTroTen) day.push('Tiếp tục theo dõi, hỗ trợ: ' + ctx.hoTroTen + '.');
    day.push('Thi đua "Vở sạch - Chữ đẹp"; kiểm tra vở, nhận xét chữ viết cuối tháng.');
    r['kh-day-hoc'] = dong(day);
    var doi = [];
    if (cd.doi) doi.push('Chủ điểm tháng: "' + cd.doi + '"' + (cd.khgd && cd.khgd !== cd.doi ? ' — chủ đề giáo dục "' + cd.khgd + '"' : '') + '.');
    if (cd.shdc && cd.shdc.length) doi.push('Sinh hoạt dưới cờ: ' + cd.shdc.map(function (s) { return 'tuần ' + s[0] + ' "' + s[1] + '"'; }).join('; ') + '.');
    doi.push(ctx.khoi <= 2 ? 'Sinh hoạt Sao theo chủ điểm; tập bài hát, trò chơi Sao nhi đồng.' : 'Sinh hoạt Chi đội theo chủ điểm; thực hiện kế hoạch nhỏ, nuôi heo đất.');
    if (cd.moc) cd.moc.filter(function (x) { return /\d+\/\d+\s/.test(x); }).slice(0, 3).forEach(function (x) { doi.push('Hoạt động chào mừng ' + x.replace(/^\d+\/\d+\s*/, '').replace(/^Ngày\s/, 'Ngày ') + ' (' + (x.match(/^\d+\/\d+/) || [''])[0] + ').'); });
    r['kh-doi'] = dong(doi);
    var khac = [];
    if (cd.moc) cd.moc.filter(function (x) { return !/^\d+\/\d+\s/.test(x); }).slice(0, 4).forEach(function (x) { khac.push(x + '.'); });
    if (m === 9 || m === 1 || m === 5) khac.push('Chuẩn bị nội dung họp cha mẹ học sinh ' + (m === 9 ? 'đầu năm' : m === 1 ? 'cuối học kỳ I' : 'cuối năm') + '.');
    khac.push(chon(['Giữ gìn vệ sinh lớp học, khu vực được phân công; trang trí lớp theo chủ điểm.', 'Lao động vệ sinh trường lớp; chăm sóc cây xanh, bồn hoa của lớp.'], h + 2));
    khac.push(m >= 4 && m <= 5 ? 'Tuyên truyền phòng chống đuối nước, an toàn mùa hè.' : (m === 12 || m === 1 ? 'Tuyên truyền an toàn giao thông, phòng chống pháo nổ dịp Tết.' : 'Nhắc nhở an toàn giao thông, an toàn trường học; phòng chống dịch bệnh theo mùa.'));
    r['kh-khac'] = dong(khac);
    var sl = ctx.soLieu;
    if (sl && sl.buoi) {
      r['kh-ket-qua'] = dong([
        'Sĩ số: ' + ctx.siSo + ' em' + (ctx.tangGiam ? ' (' + ctx.tangGiam + ')' : ', ổn định') + '.',
        'Chuyên cần: ' + sl.vang.tong + ' lượt vắng (có phép ' + sl.vang.P + ', không phép ' + sl.vang.K + ') trên ' + sl.buoi + ' buổi' + (sl.tiLe != null ? ' — đạt ' + so(sl.tiLe) + '%' : '') + '.',
        sl.khen ? 'Tuyên dương ' + sl.khen + ' lượt' + (sl.emKhen && sl.emKhen.length ? ': ' + dsTen(sl.emKhen) : '') + '.' : '',
        sl.nhac ? 'Nhắc nhở ' + sl.nhac + ' lượt (nền nếp, chuẩn bị bài).' : 'Lớp giữ nền nếp tốt, không có em vi phạm phải nhắc nhở.',
        'Hoàn thành chương trình tháng ' + m + ' theo kế hoạch.'
      ]);
    }
    return r;
  }

  // ════════════════════════════════════════════════════════════
  // SINH HOẠT LỚP TUẦN
  // ════════════════════════════════════════════════════════════
  function tuan(ctx) {
    var sl = ctx.soLieu || {}, h = ctx.lop + '|T' + ctx.tuan, r = {};
    var sk = [];
    var v = sl.vang || { tong: 0, P: 0, K: 0 };
    sk.push('Nề nếp: ' + (v.tong ? 'vắng ' + v.tong + ' lượt (có phép ' + v.P + ', không phép ' + v.K + ')' + (sl.emVang && sl.emVang.length ? ' — ' + dsTen(sl.emVang, 5) : '') : 'đi học đầy đủ, đúng giờ') +
      '; ' + chon(['xếp hàng ra vào lớp nghiêm túc', 'truy bài đầu giờ tốt', 'thực hiện tốt nội quy lớp học'], h + 1) + '.');
    sk.push('Học tập: ' + chon(['đa số các em chuẩn bị bài đầy đủ, hăng hái phát biểu', 'các em học bài và làm bài đầy đủ, nhiều em tiến bộ', 'lớp sôi nổi xây dựng bài, hoàn thành nội dung bài học trong tuần'], h + 2) + '.');
    sk.push('Vệ sinh: ' + chon(['lớp học, khu vực được giao sạch sẽ', 'vệ sinh cá nhân, lớp học gọn gàng', 'các tổ trực nhật đúng lịch'], h + 3) + '.');
    if (sl.emKhen && sl.emKhen.length) sk.push('Tuyên dương: ' + dsTen(sl.emKhen) + '.');
    if (sl.emTienBo && sl.emTienBo.length) sk.push('Tiến bộ: ' + dsTen(sl.emTienBo) + '.');
    if (sl.emNhac && sl.emNhac.length) sk.push('Nhắc nhở: ' + dsTen(sl.emNhac) + ' — cần cố gắng hơn.');
    r['kh-so-ket'] = dong(sk);
    var lg = [];
    if (ctx.shdc) lg.push('Liên hệ chủ đề sinh hoạt dưới cờ "' + ctx.shdc + '".');
    var thang = +String(ctx.ym || '').slice(5, 7);
    lg.push(chon([
      'An toàn giao thông: đi bộ bên phải, quan sát khi sang đường.',
      'Kỹ năng sống: biết nói lời cảm ơn, xin lỗi; giúp đỡ bạn.',
      'Đọc sách: mỗi em đọc một câu chuyện, kể lại cho cả lớp.',
      'Phòng tránh xâm hại, bắt nạt học đường: biết nói "Không" và báo người lớn.',
      thang >= 4 && thang <= 5 ? 'Phòng chống đuối nước, an toàn khi tắm sông, ao, hồ.' : 'Giữ gìn vệ sinh cá nhân, ăn uống hợp vệ sinh.'
    ], h + 4));
    r['kh-long-ghep'] = dong(lg);
    var tt = [];
    tt.push('Duy trì sĩ số, nền nếp; ' + chon(['khắc phục những tồn tại của tuần này', 'tiếp tục phát huy ưu điểm, khắc phục tồn tại'], h + 5) + '.');
    if (ctx.shdcSau) tt.push('Chuẩn bị sinh hoạt dưới cờ tuần ' + (ctx.tuan + 1) + ': "' + ctx.shdcSau + '".');
    if (ctx.hdtn) tt.push('Hoạt động trải nghiệm theo chủ đề: ' + ctx.hdtn + '.');
    tt.push('Học chương trình tuần ' + (ctx.tuan + 1) + '; phụ đạo, bồi dưỡng theo nhóm.');
    if (ctx.mocSau) tt.push(ctx.mocSau + '.');
    r['kh-tuan-toi'] = dong(tt);
    return r;
  }

  // ════════════════════════════════════════════════════════════
  // HỌP CHA MẸ HỌC SINH (theo KHUNG_HOP của sổ)
  // ════════════════════════════════════════════════════════════
  function hop(ctx) {
    var r = {}, ky = ctx.kyHop, K = k(ctx), sl = ctx.soLieu || {}, hs = ctx.siSo;
    if (ky === 'dau_nam') {
      r['hop-m-tinh_hinh'] = 'Lớp ' + ctx.lop + ' có ' + hs + ' học sinh' + (ctx.nu != null ? ' (' + ctx.nu + ' nữ)' : '') + '. Thuận lợi: đa số các em ngoan, gia đình quan tâm. Khó khăn: ' +
        (ctx.hoTro ? ctx.hoTro + ' em cần hỗ trợ; ' : '') + 'một số em chưa tự giác học ở nhà.';
      r['hop-m-chi_tieu'] = dong(['Duy trì sĩ số 100%, chuyên cần từ 98%.', '100% học sinh hoàn thành chương trình lớp học.', 'Phẩm chất, năng lực Tốt từ 70% trở lên.', 'Lớp đạt danh hiệu Lớp tiên tiến.']);
      r['hop-m-bien_phap'] = dong(['Nề nếp: ' + K.ne + '.', 'Học tập: ' + K.tv + '; ' + K.toan + '.', 'Gia đình nhắc các em học bài, chuẩn bị đồ dùng; đưa đón đúng giờ, an toàn.']);
      r['hop-m-tung_hs'] = 'Nhóm học tốt, có năng khiếu: ' + (ctx.emNoiTroi || '…') + '.\nNhóm cần giúp đỡ: ' + (ctx.hoTroTen || '…') + '.';
      r['hop-m-cu_ban'] = 'Bầu Ban đại diện cha mẹ học sinh lớp gồm 3 người: Trưởng ban …, Phó ban …, Ủy viên ….';
    } else if (ky === 'cuoi_hk1') {
      r['hop-m-tinh_hinh'] = 'Sĩ số ' + hs + ' em' + (sl.tiLe != null ? '; chuyên cần học kỳ I đạt ' + so(sl.tiLe) + '%' : '') + '.';
      if (sl.dg) r['hop-m-ket_qua'] = 'Đánh giá cuối học kỳ I (lượt môn): Hoàn thành tốt ' + sl.dg.T + ' · Hoàn thành ' + sl.dg.H + ' · Chưa hoàn thành ' + sl.dg.C + '.';
      r['hop-m-ne_nep'] = 'Đa số các em ngoan, thực hiện tốt nội quy' + (sl.khen ? '; ' + sl.khen + ' lượt được tuyên dương' : '') + (sl.nhac ? '; ' + sl.nhac + ' lượt nhắc nhở' : '') + '.';
      r['hop-m-ke_hoach_hk2'] = dong(['Giữ vững nền nếp, phấn đấu đạt chỉ tiêu cả năm.', 'Tập trung phụ đạo em chưa hoàn thành: ' + (ctx.hoTroTen || '…') + '.', 'Gia đình phối hợp kiểm tra việc học ở nhà, nhất là sau Tết.']);
    } else if (ky === 'cuoi_nam') {
      r['hop-m-li_do'] = 'Tổng kết năm học ' + (ctx.nam || '') + ', thông báo kết quả học tập, rèn luyện của học sinh; phổ biến kế hoạch hè.';
    }
    r['hop-noi-dung'] = 'Giáo viên chủ nhiệm thông qua nội dung cuộc họp; cha mẹ học sinh trao đổi, thống nhất các biện pháp phối hợp giáo dục.';
    r['hop-ket-luan'] = 'Cuộc họp thống nhất ' + (ky === 'cuoi_nam' ? 'kết quả năm học và kế hoạch hè cho các em' : 'các chỉ tiêu, biện pháp đã nêu') + '; gia đình phối hợp chặt chẽ với giáo viên chủ nhiệm.';
    return r;
  }

  // ════════════════════════════════════════════════════════════
  // SƠ KẾT HỌC KỲ I / TỔNG KẾT NĂM
  // ════════════════════════════════════════════════════════════
  function tk(ctx) {
    var sl = ctx.soLieu || {}, r = {}, hk1 = ctx.ky === 'hk1', h = ctx.lop + '|' + ctx.ky;
    var ld = [];
    ld.push('Duy trì sĩ số ' + ctx.siSo + ' em' + (sl.tiLe != null ? '; tỉ lệ chuyên cần ' + so(sl.tiLe) + '%' : '') + '.');
    if (sl.dg) { var tong = sl.dg.T + sl.dg.H + sl.dg.C; ld.push('Kết quả các môn (lượt): Hoàn thành tốt ' + sl.dg.T + ' (' + pt(sl.dg.T, tong) + '%), Hoàn thành ' + sl.dg.H + ', Chưa hoàn thành ' + sl.dg.C + '.'); }
    ld.push(chon(['Lớp có nền nếp tốt, các em đoàn kết, giúp đỡ nhau trong học tập.', 'Học sinh ngoan, lễ phép; Hội đồng tự quản hoạt động có hiệu quả.'], h + 1));
    if (sl.khen) ld.push('Nhật ký theo dõi ghi ' + sl.khen + ' lượt khen, ' + (sl.tienBo || 0) + ' lượt tiến bộ.');
    if (sl.hoTro) ld.push('Theo dõi, hỗ trợ ' + sl.hoTro + ' em; ' + (sl.daOn || 0) + ' em đã ổn.');
    ld.push('Tham gia đầy đủ các hoạt động, phong trào của trường, Liên đội' + (sl.hop ? '; họp cha mẹ học sinh ' + sl.hop + ' lần' : '') + '.');
    r['tk-lam-duoc'] = dong(ld);
    var tt = [];
    if (sl.dg && sl.dg.C) tt.push('Còn ' + sl.dg.C + ' lượt môn chưa hoàn thành — cần tiếp tục phụ đạo.');
    if (sl.vang && sl.vang.K) tt.push('Còn ' + sl.vang.K + ' lượt vắng không phép.');
    if (sl.nhac) tt.push('Một số em còn phải nhắc nhở về nền nếp, chuẩn bị bài (' + sl.nhac + ' lượt).');
    tt.push(chon(['Chữ viết của một số em chưa đẹp, trình bày vở chưa cẩn thận.', 'Một số em chưa mạnh dạn, ít phát biểu xây dựng bài.'], h + 2));
    r['tk-ton-tai'] = dong(tt);
    r['tk-de-xuat'] = dong(['Nhà trường tiếp tục quan tâm, hỗ trợ học sinh có hoàn cảnh khó khăn.', 'Cha mẹ học sinh phối hợp nhắc nhở các em học bài ở nhà.']);
    if (hk1) r['tk-phuong-huong'] = dong(['Phát huy ưu điểm, khắc phục tồn tại của học kỳ I.', 'Phấn đấu hoàn thành các chỉ tiêu đã đăng ký cuối năm.', 'Tăng cường phụ đạo em chưa hoàn thành, bồi dưỡng em năng khiếu.', 'Giữ vững nền nếp sau Tết; an toàn trong học tập và vui chơi.']);
    else r['tk-ban-giao'] = dong([
      ctx.hoTroTen ? 'Học sinh cần tiếp tục hỗ trợ: ' + ctx.hoTroTen + '.' : 'Không có học sinh cần tiếp tục hỗ trợ đặc biệt.',
      'Học sinh nổi trội, cần bồi dưỡng: ' + (ctx.emNoiTroi || '…') + '.',
      'Lưu ý sức khỏe, hoàn cảnh: ' + (ctx.luuY || 'xem hồ sơ hoàn cảnh từng em trong sổ') + '.']);
    return r;
  }

  // ════════════════════════════════════════════════════════════
  // HỖ TRỢ HỌC SINH — biện pháp theo loại
  // ════════════════════════════════════════════════════════════
  var BP = {
    hoc_tap: 'Kèm cặp trong giờ học; đôi bạn cùng tiến; phụ đạo buổi 2 phần kiến thức còn hổng; giao bài vừa sức, khen ngợi khi tiến bộ; trao đổi với gia đình cách kèm ở nhà.',
    nguy_co_bo_hoc: 'Theo dõi chuyên cần hằng ngày; thăm gia đình tìm nguyên nhân; báo Ban giám hiệu, Ban đại diện cha mẹ học sinh hỗ trợ; tạo niềm vui đến lớp (giao việc, khen ngợi).',
    hoan_canh: 'Đề nghị nhà trường, Hội cha mẹ hỗ trợ sách vở, đồ dùng; lớp quyên góp giúp bạn; quan tâm động viên tinh thần.',
    khuyet_tat: 'Thực hiện kế hoạch giáo dục cá nhân; giao nhiệm vụ phù hợp khả năng; xếp chỗ ngồi gần giáo viên; đánh giá theo sự tiến bộ của em.',
    tam_ly: 'Trò chuyện riêng, lắng nghe; phối hợp gia đình theo dõi; nhờ cán bộ tư vấn học đường; tránh phê bình trước lớp.',
    bat_nat: 'Gặp riêng các em liên quan; phối hợp gia đình; giáo dục kỹ năng ứng xử, an toàn trên mạng; theo dõi sát và báo Ban giám hiệu nếu tái diễn.',
    suc_khoe: 'Phối hợp nhân viên y tế và gia đình; xếp chỗ ngồi, hoạt động phù hợp; nhắc em uống thuốc, nghỉ ngơi đúng chỉ định.',
    noi_troi: 'Giao bài nâng cao, nhiệm vụ thử thách; bồi dưỡng buổi 2; khuyến khích tham gia hội thi, sân chơi; giao vai trò hỗ trợ bạn.',
    khac: 'Theo dõi, trao đổi với gia đình; có biện pháp giúp đỡ phù hợp.'
  };
  function ht(ctx) { return { 'ht-bien-phap': BP[ctx.loaiHT] || BP.khac }; }

  var SINH = { nam: nam, thang: thang, tuan: tuan, hop: hop, tk: tk, ht: ht };
  function sinh(loai, ctx) { return SINH[loai] ? SINH[loai](ctx || {}) : {}; }

  var API = { sinh: sinh, KHOI: KHOI, BP: BP };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (goc) goc.SCN_MAU = API;
})(typeof window !== 'undefined' ? window : null);
