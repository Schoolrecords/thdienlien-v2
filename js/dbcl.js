// ============================================================
// dbcl.js — MODULE 3: ĐẢM BẢO CHẤT LƯỢNG (khung Thông tư 57/2026)
// ĐỢT NÀY CHỈ DỰNG GIAO DIỆN — chưa nối cơ sở dữ liệu.
//
// Bốn màn theo đúng bốn trọng tâm bảo đảm chất lượng của TT57:
//   1. Chuẩn đầu ra & Cam kết   (nền của cả vòng)
//   2. Đối sánh chất lượng      → đổi mới phương pháp dạy học
//   3. Điều kiện bảo đảm        → phát triển đội ngũ + tăng cường điều kiện
//   4. Tổ ĐBCL & Hồ sơ          → nâng cao hiệu quả quản trị
//
// ⚠️ MỌI SỐ TRONG FILE NÀY LÀ SỐ MẪU ĐỂ XEM BỐ CỤC.
//    Nguyên tắc của dự án: KHÔNG được để người dùng nhầm số mẫu là số thật →
//    mọi bảng số mẫu đều có băng cảnh báo và chữ "mẫu" ngay trên đầu.
//
// ⚠️ KHÔNG ghi tên thật cán bộ giáo viên vào đây — repo là kho công khai.
//    Bảng Tổ ĐBCL chỉ ghi CHỨC VỤ; tên thật nạp từ CSDL sau.
// ============================================================
(function () {
  'use strict';

  function thoat(s) { return window.thoatHTML ? window.thoatHTML(s) : String(s || ''); }

  var TAB = 'cdr';

  // ── Dữ liệu mẫu: chuẩn đầu ra theo mức TT27 ──
  // Cột "diem" giữ lại vì trường CÓ cam kết điểm với UBND xã (thầy Chung xác nhận
  // 11/8/2026). Nhưng Điều 7 TT27: điểm kiểm tra định kỳ KHÔNG dùng xếp loại →
  // điểm chỉ là số THAM KHẢO đặt cạnh, mức T/H/C mới là chỉ tiêu chính.
  var MON_MAU = [
    { ten: 'Toán',                    htt: 45, ht: 54, cht: 1, diem: '7,5' },
    { ten: 'Tiếng Việt',              htt: 42, ht: 57, cht: 1, diem: '7,0' },
    { ten: 'Ngoại ngữ (Tiếng Anh)',   htt: 38, ht: 60, cht: 2, diem: '6,5' },
    { ten: 'Đạo đức',                 htt: 55, ht: 45, cht: 0, diem: '' },
    { ten: 'Tự nhiên và Xã hội',      htt: 48, ht: 52, cht: 0, diem: '' },
    { ten: 'Tin học – Công nghệ',     htt: 40, ht: 59, cht: 1, diem: '' },
    { ten: 'Nghệ thuật (Âm nhạc)',    htt: 52, ht: 48, cht: 0, diem: '' },
    { ten: 'Nghệ thuật (Mĩ thuật)',   htt: 52, ht: 48, cht: 0, diem: '' },
    { ten: 'Hoạt động trải nghiệm',   htt: 50, ht: 50, cht: 0, diem: '' },
    { ten: 'Giáo dục thể chất',       htt: 46, ht: 54, cht: 0, diem: '' }
  ];

  var NL_PC_MAU = [
    { ten: 'Năng lực (5 thành phần)',  tot: 50, dat: 49, can: 1 },
    { ten: 'Phẩm chất (5 thành phần)', tot: 58, dat: 42, can: 0 }
  ];

  var CAM_KET = [
    { bi: '📝', tu: 'Giáo viên', den: 'Hiệu trưởng',
      mo: 'Cam kết chỉ tiêu chất lượng môn dạy và lớp chủ nhiệm đầu năm học. Hai mẫu: giáo viên chủ nhiệm và giáo viên chuyên.',
      pl: 'Phụ lục 15a + 15b', mau: '#33418f' },
    { bi: '🤝', tu: 'Giáo viên chủ nhiệm', den: 'Ban đại diện CMHS lớp',
      mo: 'Cam kết chỉ tiêu chất lượng lớp tại buổi họp phụ huynh đầu năm.',
      pl: 'chưa có mẫu — cần bổ sung', mau: '#1e7a55' },
    { bi: '📋', tu: 'Hiệu trưởng', den: 'UBND xã Quảng Châu',
      mo: 'Cam kết chỉ tiêu chất lượng toàn trường với cơ quan quản lý: kết quả học tập, đội ngũ, cơ sở vật chất, khen thưởng.',
      pl: 'Phụ lục 16', mau: '#c26a1f' },
    { bi: '🏫', tu: 'Nhà trường', den: 'Ban đại diện CMHS trường',
      mo: 'Cam kết tổng hợp tại Hội nghị cha mẹ học sinh đầu năm.',
      pl: 'Biên bản Hội nghị', mau: '#7c3aed' }
  ];

  var MOC = [
    { ma: 'm1', ten: '30/9',  mo: 'Đầu năm — chốt chuẩn đầu ra và ký cam kết' },
    { ma: 'm2', ten: '30/01', mo: 'Giữa năm — đối sánh học kỳ I, điều chỉnh' },
    { ma: 'm3', ten: '15/6',  mo: 'Hạn phê duyệt tự đánh giá (Điều 9 TT57)' },
    { ma: 'm4', ten: '30/7',  mo: 'Cuối năm — tổng kết, chuyển vấn đề sang Biểu 2' }
  ];

  var PHAN_CONG = [
    { tt: 1, viec: 'Phân tích yếu tố bên trong, bên ngoài nhà trường', pl: '10, 11, 12, 13' },
    { tt: 2, viec: 'Tầm nhìn, sứ mệnh, giá trị cốt lõi, mục tiêu chương trình giáo dục', pl: '10, 11, 12, 13' },
    { tt: 3, viec: 'Xác định chuẩn đầu ra', pl: '1, 2' },
    { tt: 4, viec: 'Chương trình giáo dục', pl: '5, 15, 16' },
    { tt: 5, viec: 'Xây dựng văn hoá nhà trường', pl: '8, 9' },
    { tt: 6, viec: 'Phát triển cán bộ quản lý, giáo viên, nhân viên', pl: '3' },
    { tt: 7, viec: 'Cơ sở vật chất, trang thiết bị dạy học', pl: '4' },
    { tt: 8, viec: 'Khảo sát giáo viên, phụ huynh, học sinh và các bên liên quan', pl: '6, 7' },
    { tt: 9, viec: 'Kinh phí thực hiện', pl: '14' }
  ];

  var PHU_LUC = [
    { so: 1,  ten: 'Thực trạng nhà trường',                        loai: 'số liệu' },
    { so: 2,  ten: 'Chuẩn đầu ra chất lượng học tập',              loai: 'số liệu' },
    { so: 3,  ten: 'Nâng cao chất lượng cán bộ, giáo viên, nhân viên', loai: 'số liệu' },
    { so: 4,  ten: 'Nâng cao cơ sở vật chất, trang thiết bị',      loai: 'kế hoạch' },
    { so: 5,  ten: 'Kết quả học tập, rèn luyện năm trước',         loai: 'số liệu' },
    { so: 6,  ten: 'Phiếu khảo sát phụ huynh đối với giáo viên',   loai: 'khảo sát' },
    { so: 7,  ten: 'Phiếu khảo sát giáo viên về chất lượng học sinh', loai: 'khảo sát' },
    { so: 8,  ten: 'Bộ tiêu chí đánh giá Chương trình giáo dục',   loai: 'khảo sát' },
    { so: 9,  ten: 'Phiếu đánh giá cán bộ quản lý',                loai: 'khảo sát' },
    { so: 10, ten: 'Quyết định thành lập Tổ Đảm bảo chất lượng',   loai: 'quyết định' },
    { so: 11, ten: 'Phân công nhiệm vụ Tổ ĐBCL',                   loai: 'kế hoạch' },
    { so: 12, ten: 'Bìa, danh sách và chữ ký Tổ ĐBCL',             loai: 'bìa' },
    { so: 13, ten: 'Kế hoạch Đảm bảo chất lượng năm học',          loai: 'kế hoạch' },
    { so: 14, ten: 'Dự toán kinh phí ĐBCL',                        loai: 'kinh phí' },
    { so: 15, ten: 'Bản cam kết giáo viên (2 mẫu)',                loai: 'cam kết' },
    { so: 16, ten: 'Bản cam kết Hiệu trưởng với UBND xã',          loai: 'cam kết' }
  ];

  // Tổ ĐBCL — CHỈ chức vụ, KHÔNG tên thật (repo công khai)
  var TO_DBCL = [
    { cv: 'Hiệu trưởng',                 vt: 'Tổ trưởng' },
    { cv: 'Phó Hiệu trưởng',             vt: 'Tổ phó' },
    { cv: 'Thư ký Hội đồng',             vt: 'Thư ký' },
    { cv: 'Tổ trưởng chuyên môn khối 1-2-3', vt: 'Thành viên' },
    { cv: 'Tổ phó chuyên môn khối 1-2-3',    vt: 'Thành viên' },
    { cv: 'Tổ trưởng chuyên môn khối 4-5',   vt: 'Thành viên' },
    { cv: 'Tổ phó chuyên môn khối 4-5',      vt: 'Thành viên' },
    { cv: 'Giáo viên Tổng phụ trách Đội', vt: 'Thành viên' },
    { cv: 'Giáo viên Tiếng Anh',          vt: 'Thành viên' },
    { cv: 'Nhân viên Thư viện – Thiết bị', vt: 'Thành viên' },
    { cv: 'Nhân viên Kế toán',            vt: 'Thành viên' }
  ];

  var KHOI = 1;
  var MOC_CHON = 'm2';

  function bangMau(chu) {
    return '<div class="hd-kiem vang">⚠ <b>Giao diện mẫu — chưa nối cơ sở dữ liệu.</b> ' +
      thoat(chu) + '</div>';
  }

  function chipHang(ds, dangChon, thuoc) {
    return '<div class="chip-hang" style="margin:12px 0 14px">' + ds.map(function (c) {
      return '<button class="chip-loc' + (c.ma === dangChon ? ' on' : '') +
        '" data-' + thuoc + '="' + c.ma + '">' + thoat(c.ten) + '</button>';
    }).join('') + '</div>';
  }

  // ══════════ MÀN 1 · CHUẨN ĐẦU RA & CAM KẾT ══════════
  function veChuanDauRa() {
    var chipKhoi = [1, 2, 3, 4, 5].map(function (k) {
      return { ma: String(k), ten: 'Khối ' + k };
    });

    var bangMon = '<div class="cuon-ngang"><table class="bang-quan-tri nho"><thead><tr>' +
      '<th>Môn học</th><th>Hoàn thành tốt</th><th>Hoàn thành</th><th>Chưa hoàn thành</th>' +
      '<th>Điểm TB tham khảo</th></tr></thead><tbody>' +
      MON_MAU.map(function (m) {
        return '<tr><td><b>' + thoat(m.ten) + '</b></td>' +
          '<td style="text-align:center">≥ ' + m.htt + '%</td>' +
          '<td style="text-align:center">' + m.ht + '%</td>' +
          '<td style="text-align:center">≤ ' + m.cht + '%</td>' +
          '<td style="text-align:center">' + (m.diem || '<span style="color:var(--chu-mo)">—</span>') + '</td></tr>';
      }).join('') +
      NL_PC_MAU.map(function (m) {
        return '<tr style="background:#f8fafd"><td><b>' + thoat(m.ten) + '</b>' +
          '<br><small style="color:var(--chu-mo)">Tốt / Đạt / Cần cố gắng</small></td>' +
          '<td style="text-align:center">≥ ' + m.tot + '%</td>' +
          '<td style="text-align:center">' + m.dat + '%</td>' +
          '<td style="text-align:center">≤ ' + m.can + '%</td>' +
          '<td style="text-align:center"><span style="color:var(--chu-mo)">—</span></td></tr>';
      }).join('') +
      '</tbody></table></div>';

    var theCamKet = '<div class="luoi-module" style="margin:16px 0 0">' +
      CAM_KET.map(function (c) {
        return '<div class="the-module" style="background:#fff;cursor:default">' +
          '<div class="bi" style="background:' + c.mau + '18;color:' + c.mau + ';font-size:24px">' + c.bi + '</div>' +
          '<h3 style="font-size:16px;color:' + c.mau + '">' + thoat(c.tu) + ' → ' + thoat(c.den) + '</h3>' +
          '<p style="font-size:13.5px">' + thoat(c.mo) + '</p>' +
          '<div class="chip-hang" style="margin-top:12px"><span class="chip">' + thoat(c.pl) + '</span>' +
          '<span class="chip" style="color:var(--chu-mo)">chưa ký</span></div>' +
          '</div>';
      }).join('') + '</div>';

    return bangMau('Số liệu dưới đây là ví dụ về bố cục, KHÔNG phải chỉ tiêu của trường.') +

      '<div class="dau-muc" style="text-align:left;margin:6px 0 4px">' +
      '<div class="nhan-nho">Chuẩn đầu ra theo Thông tư 27/2020</div></div>' +
      '<div class="nhan-nho" style="text-transform:none;letter-spacing:0;color:var(--chu-mo);margin-bottom:6px">' +
      'Chỉ tiêu đặt bằng <b>tỉ lệ mức đạt</b> (Hoàn thành tốt / Hoàn thành / Chưa hoàn thành), ' +
      'không đặt bằng điểm trung bình — Điều 7 Thông tư 27/2020 quy định điểm kiểm tra định kỳ ' +
      '<b>chỉ để tham khảo, không dùng xếp loại</b>. Cột điểm bên phải giữ lại vì nhà trường có ' +
      'cam kết điểm với UBND xã; đó là số tham khảo đặt cạnh, không phải căn cứ đánh giá.</div>' +
      chipHang(chipKhoi, String(KHOI), 'khoi') +
      bangMon +

      '<div class="dau-muc" style="text-align:left;margin:24px 0 4px">' +
      '<div class="nhan-nho">Bốn cấp cam kết chất lượng</div></div>' +
      '<div class="nhan-nho" style="text-transform:none;letter-spacing:0;color:var(--chu-mo)">' +
      'Cam kết ký đầu năm, đối chiếu ở các mốc trong năm. Cấp nào hụt chỉ tiêu sẽ tự đề xuất ' +
      'thành dòng trong Kế hoạch cải tiến (Biểu 2).</div>' +
      theCamKet;
  }

  // ══════════ MÀN 2 · ĐỐI SÁNH CHẤT LƯỢNG ══════════
  function veDoiSanh() {
    var mauMau = [
      { mon: 'Toán',        ck: 45, tt: 47 },
      { mon: 'Tiếng Việt',  ck: 42, tt: 39 },
      { mon: 'Ngoại ngữ',   ck: 38, tt: 30 },
      { mon: 'Đạo đức',     ck: 55, tt: 58 }
    ];

    return bangMau('Màn này cần dữ liệu kết quả học sinh. Hiện <b>chưa nạp danh sách học sinh</b> ' +
      'nên bảng dưới chỉ minh hoạ cách trình bày.') +

      '<div class="dau-muc" style="text-align:left;margin:6px 0 4px">' +
      '<div class="nhan-nho">Mốc đối sánh trong năm học</div></div>' +
      '<div class="nhan-nho" style="text-transform:none;letter-spacing:0;color:var(--chu-mo);margin-bottom:2px">' +
      'Ba mốc 30/9 · 30/01 · 30/7 theo khung Nghệ An, cộng mốc 15/6 là hạn phê duyệt tự đánh giá ' +
      'của Thông tư 57. Các mốc này để ở phần cấu hình — Sở ban hành văn bản mới thì sửa cấu hình, ' +
      'không phải sửa chương trình.</div>' +
      chipHang(MOC, MOC_CHON, 'moc') +
      '<div class="nhan-nho" style="text-transform:none;letter-spacing:0;color:var(--chu-mo);margin:-6px 0 14px">' +
      thoat((MOC.filter(function (m) { return m.ma === MOC_CHON; })[0] || {}).mo || '') + '</div>' +

      '<div class="cuon-ngang"><table class="bang-quan-tri nho"><thead><tr>' +
      '<th>Môn học</th><th>Đã cam kết</th><th>Kết quả thật</th><th>Chênh lệch</th><th>Kết luận</th>' +
      '</tr></thead><tbody>' +
      mauMau.map(function (r) {
        var lech = r.tt - r.ck;
        var mau = lech >= 0 ? 'var(--ok)' : 'var(--thieu)';
        return '<tr><td><b>' + thoat(r.mon) + '</b></td>' +
          '<td style="text-align:center">≥ ' + r.ck + '%</td>' +
          '<td style="text-align:center">' + r.tt + '%</td>' +
          '<td style="text-align:center;color:' + mau + ';font-weight:800">' +
          (lech >= 0 ? '+' : '') + lech + '</td>' +
          '<td style="color:' + mau + ';font-weight:700">' +
          (lech >= 0 ? '✔ Đạt cam kết' : '✘ Hụt — đưa vào Biểu 2') + '</td></tr>';
      }).join('') + '</tbody></table></div>' +

      '<div class="the-thong-bao" style="margin-top:18px">' +
      '<p style="font-size:14.5px"><b>Vì sao màn này quan trọng nhất</b></p>' +
      '<p style="font-size:14px;color:var(--chu-mo);margin-top:6px">' +
      'Đây là chỗ nối Đảm bảo chất lượng với Trường chuẩn Quốc gia. Môn nào <b>hụt cam kết</b> sẽ ' +
      'tự đề xuất thành một dòng trong <b>Kế hoạch cải tiến (Biểu 2)</b> — cùng một bảng dữ liệu ' +
      'với module Trường chuẩn Quốc gia. Nhờ vậy nhà trường làm một lần, dùng được cho cả hai việc, ' +
      'thay vì làm hai bản rời nhau như trước.</p>' +
      '<p style="font-size:14px;color:var(--chu-mo);margin-top:8px">' +
      '⚠️ Màn này <b>không có ô nhập điểm nào</b>. Toàn bộ kết quả lấy từ module Quản lý học sinh ' +
      '— một số liệu chỉ nhập ở một nơi.</p>' +
      '</div>';
  }

  // ══════════ MÀN 3 · ĐIỀU KIỆN BẢO ĐẢM ══════════
  function veDieuKien() {
    var oSo =
      '<div class="luoi-thong-ke">' +
      '<div class="o-so"><div class="so vang">' + (window.CAU_HINH.SO_CBGV || 37) + '</div>' +
      '<div class="nhan">cán bộ, giáo viên, nhân viên</div></div>' +
      '<div class="o-so"><div class="so trang">' + (window.CAU_HINH.SO_LOP || 25) + '</div>' +
      '<div class="nhan">lớp học</div></div>' +
      '<div class="o-so"><div class="so xanh">—</div>' +
      '<div class="nhan">phòng học kiên cố</div></div>' +
      '<div class="o-so"><div class="so hong">—</div>' +
      '<div class="nhan">kinh phí ĐBCL năm học</div></div>' +
      '</div>';

    var trongTam = [
      { bi: '🧑‍🏫', ten: 'Phát triển đội ngũ',
        mo: 'Trình độ đào tạo, chuẩn nghề nghiệp, bồi dưỡng thường xuyên, tỉ lệ giáo viên trên lớp.',
        nguon: 'Lấy từ danh sách mời và hồ sơ CBGV — không nhập lại.' },
      { bi: '🏫', ten: 'Cơ sở vật chất, thiết bị',
        mo: 'Phòng học, phòng chức năng, thư viện, thiết bị dạy học tối thiểu, an toàn trường học.',
        nguon: 'Nhập theo năm học, đối chiếu với tiêu chuẩn 4 của Thông tư 57.' },
      { bi: '💰', ten: 'Kinh phí bảo đảm chất lượng',
        mo: 'Dự toán và quyết toán kinh phí dành cho hoạt động bảo đảm chất lượng từng năm.',
        nguon: 'Phụ lục 14 — hiện là tệp, sẽ chuyển thành số liệu tính được.' },
      { bi: '📚', ten: 'Đổi mới phương pháp dạy học',
        mo: 'Sinh hoạt chuyên môn, dự giờ, chuyên đề, ứng dụng công nghệ thông tin trong dạy học.',
        nguon: 'Gắn với hồ sơ tổ chuyên môn trong kho hồ sơ số.' }
    ];

    return bangMau('Các ô số đang lấy từ cấu hình trường; phần cơ sở vật chất và kinh phí ' +
      'chưa có bảng dữ liệu nên để dấu gạch, không điền số giả.') +
      oSo +
      '<div class="dau-muc" style="text-align:left;margin:20px 0 10px">' +
      '<div class="nhan-nho">Bốn trọng tâm bảo đảm chất lượng — Thông tư 57/2026</div></div>' +
      '<div class="luoi-module" style="margin:0">' +
      trongTam.map(function (t) {
        return '<div class="the-module" style="background:#fff;cursor:default">' +
          '<div class="bi" style="background:#eef2fb;font-size:24px">' + t.bi + '</div>' +
          '<h3 style="font-size:16.5px">' + thoat(t.ten) + '</h3>' +
          '<p style="font-size:13.5px">' + thoat(t.mo) + '</p>' +
          '<div class="chip-hang" style="margin-top:12px"><span class="chip" style="color:var(--chu-mo)">' +
          thoat(t.nguon) + '</span></div></div>';
      }).join('') + '</div>';
  }

  // ══════════ MÀN 4 · TỔ ĐBCL & HỒ SƠ ══════════
  function veToHoSo() {
    var bangTo = '<div class="cuon-ngang"><table class="bang-quan-tri nho"><thead><tr>' +
      '<th style="width:56px">TT</th><th>Chức vụ</th><th>Vai trò trong Tổ</th><th>Họ và tên</th>' +
      '</tr></thead><tbody>' +
      TO_DBCL.map(function (t, i) {
        return '<tr><td style="text-align:center">' + (i + 1) + '</td>' +
          '<td>' + thoat(t.cv) + '</td>' +
          '<td><b>' + thoat(t.vt) + '</b></td>' +
          '<td style="color:var(--chu-mo)">nạp từ cơ sở dữ liệu</td></tr>';
      }).join('') + '</tbody></table></div>';

    var bangPC = '<div class="cuon-ngang"><table class="bang-quan-tri nho"><thead><tr>' +
      '<th style="width:56px">TT</th><th>Nội dung công việc</th><th>Phụ lục liên quan</th>' +
      '<th>Người phụ trách</th></tr></thead><tbody>' +
      PHAN_CONG.map(function (p) {
        return '<tr><td style="text-align:center">' + p.tt + '</td>' +
          '<td>' + thoat(p.viec) + '</td>' +
          '<td style="text-align:center">' + thoat(p.pl) + '</td>' +
          '<td style="color:var(--chu-mo)">nạp từ cơ sở dữ liệu</td></tr>';
      }).join('') + '</tbody></table></div>';

    var bangPL = '<div class="cuon-ngang"><table class="bang-quan-tri nho"><thead><tr>' +
      '<th style="width:56px">Số</th><th>Tên phụ lục</th><th>Loại</th><th>Dạng lưu</th><th></th>' +
      '</tr></thead><tbody>' +
      PHU_LUC.map(function (p) {
        var laSoLieu = p.loai === 'số liệu';
        return '<tr><td style="text-align:center"><b>' + p.so + '</b></td>' +
          '<td>' + thoat(p.ten) + '</td>' +
          '<td><span class="chip">' + thoat(p.loai) + '</span></td>' +
          '<td>' + (laSoLieu
            ? '<b style="color:var(--ok)">đưa vào bảng dữ liệu</b>'
            : '<span style="color:var(--chu-mo)">giữ dạng tệp trên Drive</span>') + '</td>' +
          '<td style="text-align:center"><span style="color:var(--chu-mo)">📂</span></td></tr>';
      }).join('') + '</tbody></table></div>';

    return bangMau('Danh sách Tổ ĐBCL chỉ ghi <b>chức vụ</b>, chưa ghi tên thật — kho mã nguồn là ' +
      'kho công khai, tên và thông tin cá nhân chỉ nằm trong cơ sở dữ liệu có phân quyền.') +

      '<div class="dau-muc" style="text-align:left;margin:6px 0 10px">' +
      '<div class="nhan-nho">Tổ Đảm bảo chất lượng · 11 thành viên</div></div>' + bangTo +

      '<div class="dau-muc" style="text-align:left;margin:24px 0 10px">' +
      '<div class="nhan-nho">Phân công nhiệm vụ · 9 nhóm việc</div></div>' + bangPC +

      '<div class="dau-muc" style="text-align:left;margin:24px 0 6px">' +
      '<div class="nhan-nho">Hồ sơ Đảm bảo chất lượng · 16 phụ lục</div></div>' +
      '<div class="nhan-nho" style="text-transform:none;letter-spacing:0;color:var(--chu-mo);margin-bottom:8px">' +
      'Phụ lục chia hai loại: loại <b>số liệu</b> sẽ đưa vào bảng dữ liệu để máy tự đối sánh và tự ' +
      'sinh ngược ra tệp khi cần in; loại <b>biểu mẫu, quyết định</b> giữ nguyên dạng tệp trên Drive ' +
      'vì đó đúng bản chất của chúng.</div>' + bangPL;
  }

  // ══════════ KHUNG ══════════
  var THE = [
    { ma: 'cdr', ten: '🎯 Chuẩn đầu ra & Cam kết', ve: veChuanDauRa },
    { ma: 'ds',  ten: '📊 Đối sánh chất lượng',    ve: veDoiSanh },
    { ma: 'dk',  ten: '🏫 Điều kiện bảo đảm',      ve: veDieuKien },
    { ma: 'to',  ten: '🧑‍⚖️ Tổ ĐBCL & Hồ sơ',      ve: veToHoSo }
  ];

  window.veDBCL = function () {
    var vung = document.getElementById('vung-dbcl');
    if (!vung) return;

    vung.innerHTML =
      '<div class="qt-tab">' + THE.map(function (t) {
        return '<button class="' + (TAB === t.ma ? 'on' : '') + '" data-dbcl="' + t.ma + '">' +
          t.ten + '</button>';
      }).join('') + '</div>' +
      '<div id="dbcl-than" style="margin-top:16px"></div>';

    var than = document.getElementById('dbcl-than');
    var the = THE.filter(function (t) { return t.ma === TAB; })[0] || THE[0];
    than.innerHTML = the.ve();

    Array.prototype.slice.call(vung.querySelectorAll('[data-dbcl]')).forEach(function (b) {
      b.addEventListener('click', function () { TAB = b.getAttribute('data-dbcl'); window.veDBCL(); });
    });
    Array.prototype.slice.call(than.querySelectorAll('[data-khoi]')).forEach(function (b) {
      b.addEventListener('click', function () { KHOI = +b.getAttribute('data-khoi'); window.veDBCL(); });
    });
    Array.prototype.slice.call(than.querySelectorAll('[data-moc]')).forEach(function (b) {
      b.addEventListener('click', function () { MOC_CHON = b.getAttribute('data-moc'); window.veDBCL(); });
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', window.veDBCL);
  } else {
    window.veDBCL();
  }
})();
