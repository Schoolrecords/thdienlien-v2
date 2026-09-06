// ============================================================
// mau-nhap-excel.js — DỰNG TỆP MẪU EXCEL ĐỂ NHÀ TRƯỜNG ĐIỀN RỒI NẠP LÊN
//
// VÌ SAO CÓ TỆP NÀY: trước đây trường mới chỉ có hai đường đưa danh sách vào
// hệ thống — gửi phiếu Excel sáu trang cho bộ phận triển khai sinh SQL, hoặc
// dán từng cột vào ô "Dán từ Excel". Cả hai đều cần người ở giữa. Nay nhà
// trường bấm "Tải mẫu" ngay trong thẻ Nạp dữ liệu, điền vào ô nền vàng, rồi
// chọn lại chính tệp đó ở nút "Chọn tệp" — không phải chờ ai.
//
// BA MẪU, mỗi mẫu khớp ĐÚNG bộ dò cột của js/nap-du-lieu.js:
//   gv — Đội ngũ CBGV      : Họ và tên · Email Google · Chức vụ · Tổ · Vai trò · Cơ sở
//   hs — Học sinh           : Mã lớp · Mã học sinh · Họ tên · Ngày sinh · Giới tính…
//   ts — Chia lớp tuyển sinh: khối "LỚP 1A" + Họ và tên · Ngày sinh · Nữ · Số CCCD…
// Sửa tên cột ở đây thì PHẢI sửa COT_GV / COT_HS / COT_TS bên kia, và ngược
// lại — bài thử thdienlien-v2-tailieu/thu-mau-nhap.js canh việc này.
//
// 🔴 HAI BẪY CỦA HÀNG TIÊU ĐỀ:
//   1. Dòng VÍ DỤ đặt TRÊN hàng tiêu đề, không đặt dưới. Bộ đọc lấy dữ liệu từ
//      hàng tiêu đề trở xuống — ví dụ nằm dưới là "Nguyễn Văn A" thành một
//      người thật trong danh sách đăng nhập.
//   2. Trang "Hướng dẫn" đứng TRƯỚC trang dữ liệu, mà bộ đọc quét 12 hàng đầu
//      của MỌI trang để tìm tiêu đề. Nên trong 12 hàng đầu của trang hướng dẫn
//      không ô nào được bắt đầu bằng "Họ tên", "Email", "Mã lớp"… — viết
//      "Cột Email…" thì được, viết "Email…" ở đầu ô là trang hướng dẫn bị
//      nhận nhầm làm trang dữ liệu.
//
// Chạy được cả trong Node (quan-tri/sinh-mau-nhap.js dùng để sinh tệp gửi
// trường chưa có tài khoản): chỉ cần window.EXCEL_DEP, không đụng DOM.
// ============================================================
(function (W) {
  'use strict';

  var VAI_TRO = ['Quản trị hệ thống', 'Ban giám hiệu', 'Tổ trưởng chuyên môn', 'Giáo viên', 'Nhân viên'];
  var GIOI_TINH = ['Nam', 'Nữ'];
  var TRANG_THAI_HS = ['Đang học', 'Chuyển đi', 'Thôi học'];

  function o(v, k, them) {
    var x = { v: v == null ? '' : v, k: k || 'thuong' };
    if (them) Object.keys(them).forEach(function (t) { x[t] = them[t]; });
    return x;
  }
  function trong(n, k) {
    var r = [];
    for (var i = 0; i < n; i++) r.push(o('', k));
    return r;
  }
  // Dòng chữ hướng dẫn gộp ngang hết bảng
  function dongChu(chu, soCot, k, cao) {
    return { cao: cao, o: [o(chu, k || 'hd', { gopN: soCot - 1 })] };
  }
  function tenCotExcel(i) {
    var s = '';
    for (i++; i > 0; i = Math.floor((i - 1) / 26)) s = String.fromCharCode(65 + (i - 1) % 26) + s;
    return s;
  }
  // Chiều cao hàng hướng dẫn theo độ dài chữ: cột rộng 96 ký tự, Times 11pt mỗi
  // dòng ~15pt. Đặt cứng 48pt thì đoạn dài 400 ký tự (5 dòng) bị cắt cụt cuối câu.
  function caoTheoChu(chu) {
    return Math.max(20, Math.ceil(String(chu).length / 85) * 15 + 8);
  }
  function hdRow(nhan, chu) {
    return { cao: caoTheoChu(chu), o: [o(nhan, 'oG'), o(chu, 'hd')] };
  }
  // Chữ cột Excel của một tiêu đề — để đổi thứ tự cột không làm lệch ô chọn.
  function cotCua(TIEU_DE, ten) {
    var i = TIEU_DE.indexOf(ten);
    if (i < 0) throw new Error('Không có cột "' + ten + '"');
    return tenCotExcel(i);
  }
  function khongDau(s) {
    return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/đ/g, 'd').replace(/Đ/g, 'D')
      .replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  // Trang DM: mỗi cột một danh sách, dùng cho ô xổ xuống. Trả về sheet + hàm
  // tra vùng ('DM!$A$1:$A$5') theo tên danh sách.
  function trangDM(ds) {
    var ten = Object.keys(ds), rows = [], vung = {};
    var caoNhat = 0;
    ten.forEach(function (t, i) {
      vung[t] = 'DM!$' + tenCotExcel(i) + '$1:$' + tenCotExcel(i) + '$' + ds[t].length;
      if (ds[t].length > caoNhat) caoNhat = ds[t].length;
    });
    for (var r = 0; r < caoNhat; r++) {
      rows.push({ o: ten.map(function (t) { return o(ds[t][r] == null ? '' : ds[t][r], 'thuong'); }) });
    }
    return {
      sheet: { ten: 'DM', cols: ten.map(function () { return 30; }), rows: rows, in: { doc: true } },
      vung: function (t) { return vung[t]; }
    };
  }

  // ══════════════════════════════════════════════════════════════
  // MẪU 1 — ĐỘI NGŨ CBGV (đích: danh sách được phép đăng nhập)
  // ══════════════════════════════════════════════════════════════
  function mauGV(opt) {
    var tenTruong = opt.tenTruong || 'Trường Tiểu học ……';
    var soDong = opt.soDong || 60;
    var coSo = opt.coSo || [];          // [{ ma, ten }]
    var coNhieuCoSo = coSo.length > 1;

    var dm = { 'Vai trò trên hệ thống': VAI_TRO };
    if (coNhieuCoSo) dm['Cơ sở công tác'] = coSo.map(function (c) { return c.ma + ' - ' + c.ten; });
    var DM = trangDM(dm);

    var TIEU_DE = ['TT', 'Họ và tên', 'Email Google (đăng nhập)', 'Chức vụ', 'Tổ chuyên môn',
      'Vai trò trên hệ thống', 'Cơ sở công tác', 'Ghi chú'];
    var N = TIEU_DE.length;

    var huongDan = {
      ten: 'Hướng dẫn', cols: [4, 96], in: { doc: true, vuaTrang: true },
      rows: [
        { cao: 30, o: [o('MẪU DANH SÁCH CÁN BỘ, GIÁO VIÊN, NHÂN VIÊN ĐỂ MỞ TÀI KHOẢN', 'tt', { gopN: 1 })] },
        { o: [o(tenTruong, 'tt2', { gopN: 1 })] },
        { o: [o('', 'thuong'), o('', 'thuong')] },
        { cao: 20, o: [o('', 'thuong'), o('CÁCH LÀM', 'hdb')] },
        hdRow('1', 'Mở trang "CBGV", điền mỗi người một dòng vào các ô NỀN VÀNG. Giữ nguyên hàng tiêu đề màu xanh — máy nhận cột theo tên tiêu đề.'),
        hdRow('2', 'Điền xong, lưu tệp (giữ đuôi .xlsx). Vào hệ thống → Quản trị → thẻ Nạp dữ liệu → Loại dữ liệu "Đội ngũ CBGV" → Chọn tệp → xem bảng soi thử → bấm Ghi.'),
        hdRow('3', 'Máy chỉ "mở cửa": ai có tên trong danh sách thì lần đầu đăng nhập Google là vào thẳng, đúng vai trò. Ai không có tên vẫn đăng nhập được nhưng dừng ở màn chờ duyệt.'),
        { o: [o('', 'thuong'), o('', 'thuong')] },
        { cao: 20, o: [o('', 'thuong'), o('TỪNG CỘT', 'hdb')] },
        hdRow('B', 'Cột "Email Google (đăng nhập)" là cột QUAN TRỌNG NHẤT: phải là địa chỉ Gmail (hoặc địa chỉ Google Workspace) thầy cô đang đăng nhập được. Sai một ký tự là người đó vĩnh viễn không vào được mà không hiểu vì sao. KHÔNG chép cột Email trong tệp CSDL_GiaoVien.xls của cơ sở dữ liệu ngành — cột đó nhiều địa chỉ công vụ @nghean.edu.vn không đăng nhập Google được, và hay chép nhầm dòng. Mỗi người MỘT địa chỉ riêng.'),
        hdRow('C', 'Cột "Chức vụ" ghi như trên thẻ CBGV: Hiệu trưởng · Phó Hiệu trưởng · Giáo viên · GV - Tổ trưởng tổ 1 · Nhân viên kế toán · Nhân viên văn thư…'),
        hdRow('D', 'Cột "Tổ chuyên môn": Tổ 1 · Tổ 2-3 · Tổ 4-5 · Tổ Văn phòng… (không có thì để trống).'),
        hdRow('E', 'Cột "Vai trò trên hệ thống" CHỌN trong danh sách xổ xuống: Quản trị hệ thống (chỉ 1–2 người: Hiệu trưởng hoặc người được giao quản trị — có quyền cao nhất) · Ban giám hiệu · Tổ trưởng chuyên môn · Giáo viên · Nhân viên. Để trống thì máy suy từ cột Chức vụ (có chữ "Hiệu trưởng" → Ban giám hiệu, "Tổ trưởng" → Tổ trưởng, "Nhân viên" → Nhân viên, còn lại → Giáo viên) và không bao giờ tự đặt Quản trị. Vai trò của người ĐÃ CÓ trong hệ thống không bị đổi khi nạp lại.'),
        hdRow('F', coNhieuCoSo
          ? 'Cột "Cơ sở công tác" CHỌN trong danh sách (trường có ' + coSo.length + ' cơ sở/điểm trường). Để trống là chưa gắn cơ sở — gán sau ở thẻ Tài khoản.'
          : 'Cột "Cơ sở công tác" chỉ dùng cho trường có phân hiệu, điểm trường lẻ (ghi tên hoặc mã cơ sở đã khai ở thẻ Cơ sở & Sáp nhập). Trường một điểm thì để trống.'),
        { o: [o('', 'thuong'), o('', 'thuong')] },
        hdRow('!', 'Hệ thống KHÔNG thu thập ngày sinh, số căn cước, điện thoại, địa chỉ, lương, ngạch bậc của cán bộ — mẫu này cố ý không có các cột đó.'),
        hdRow('!', 'Người đã nghỉ hưu, chuyển công tác thì đừng đưa vào. Muốn thêm/bớt người sau này: nạp lại tệp (máy không xoá ai, không hạ quyền ai) hoặc sửa ở thẻ Danh sách mời.')
      ]
    };

    var rows = [
      { cao: 30, o: [o('DANH SÁCH CÁN BỘ, GIÁO VIÊN, NHÂN VIÊN — ' + tenTruong.toUpperCase(), 'tt', { gopN: N - 1 })] },
      dongChu('Điền vào ô NỀN VÀNG, mỗi người một dòng. Giữ nguyên hàng tiêu đề màu xanh. Dòng "Ví dụ" chỉ để xem cách ghi, máy bỏ qua.', N, 'tt3', 20),
      { cao: 20, o: [
        o('Ví dụ →', 'vd'), o('Nguyễn Văn A', 'vd'), o('nguyenvana@example.com', 'vd'),
        o('GV - Tổ trưởng tổ 1', 'vd'), o('Tổ 1', 'vd'), o('Tổ trưởng chuyên môn', 'vd'),
        o(coNhieuCoSo ? (coSo[0].ma + ' - ' + coSo[0].ten) : '', 'vd'), o('Kiêm Bí thư chi bộ', 'vd')
      ] },
      { cao: 32, o: TIEU_DE.map(function (t) { return o(t, 'dau'); }) }
    ];
    var dauDuLieu = rows.length + 1;       // số hàng Excel của dòng dữ liệu đầu tiên
    for (var i = 1; i <= soDong; i++) {
      rows.push({ cao: 20, o: [o(i, 'oG', { so: 1 })].concat(trong(N - 1, 'nhapV')) });
    }
    var cuoi = rows.length;
    var cVT = cotCua(TIEU_DE, 'Vai trò trên hệ thống'), cCS = cotCua(TIEU_DE, 'Cơ sở công tác');
    var kiemTra = [{ vung: cVT + dauDuLieu + ':' + cVT + cuoi, ds: DM.vung('Vai trò trên hệ thống') }];
    if (coNhieuCoSo) kiemTra.push({ vung: cCS + dauDuLieu + ':' + cCS + cuoi, ds: DM.vung('Cơ sở công tác') });

    return {
      ten: 'MAU-NHAP-CBGV-' + khongDau(tenTruong) + '.xlsx',
      sheets: [
        huongDan,
        { ten: 'CBGV', cols: [7, 26, 32, 24, 16, 22, 26, 24], rows: rows,
          in: { dongBang: 4, cotBang: 2, dauTrang: tenTruong }, kiemTra: kiemTra },
        DM.sheet
      ]
    };
  }

  // ══════════════════════════════════════════════════════════════
  // MẪU 2 — HỌC SINH (mã chính thức của CSDL ngành)
  // ══════════════════════════════════════════════════════════════
  function mauHS(opt) {
    var tenTruong = opt.tenTruong || 'Trường Tiểu học ……';
    var namHoc = opt.namHoc || '';
    var soDong = opt.soDong || 400;
    var lop = opt.lop || [];             // ['1A','1B',…] — có thì cột Mã lớp thành ô chọn

    var dm = { 'Giới tính': GIOI_TINH, 'Trạng thái HS': TRANG_THAI_HS };
    if (lop.length) dm['Mã lớp'] = lop.slice();
    var DM = trangDM(dm);

    var TIEU_DE = ['TT', 'Mã lớp', 'Mã học sinh', 'Họ tên', 'Ngày sinh', 'Giới tính',
      'Dân tộc', 'Loại khuyết tật', 'Trạng thái HS', 'Số định danh cá nhân', 'Ghi chú'];
    var N = TIEU_DE.length;

    var huongDan = {
      ten: 'Hướng dẫn', cols: [4, 96], in: { doc: true, vuaTrang: true },
      rows: [
        { cao: 30, o: [o('MẪU DANH SÁCH HỌC SINH' + (namHoc ? ' NĂM HỌC ' + namHoc : ''), 'tt', { gopN: 1 })] },
        { o: [o(tenTruong, 'tt2', { gopN: 1 })] },
        { o: [o('', 'thuong'), o('', 'thuong')] },
        hdRow('!', 'CÁCH NHANH NHẤT KHÔNG PHẢI MẪU NÀY: vào truong.csdl.moet.gov.vn → Học sinh → Xuất Excel, tải tệp CSDL_HocSinh.xls về và nạp NGUYÊN TỆP ĐÓ (không sửa gì) ở thẻ Nạp dữ liệu — máy đọc thẳng. Mẫu này dành cho trường muốn tự lập danh sách, hoặc chỉ nạp bổ sung vài lớp.'),
        { o: [o('', 'thuong'), o('', 'thuong')] },
        { cao: 20, o: [o('', 'thuong'), o('CÁCH LÀM', 'hdb')] },
        hdRow('1', 'Mở trang "HocSinh", điền mỗi em một dòng vào các ô NỀN VÀNG. Giữ nguyên hàng tiêu đề màu xanh — máy nhận cột theo tên tiêu đề.'),
        hdRow('2', 'Lưu tệp (giữ đuôi .xlsx). Vào hệ thống → Quản trị → thẻ Nạp dữ liệu → Loại dữ liệu "Học sinh" → chọn đúng NĂM HỌC → Chọn tệp → xem bảng soi thử → bấm Ghi.'),
        { o: [o('', 'thuong'), o('', 'thuong')] },
        { cao: 20, o: [o('', 'thuong'), o('TỪNG CỘT', 'hdb')] },
        hdRow('B', 'Cột "Mã lớp": tên lớp như 1A, 2B, 5C — máy suy khối từ chữ số đầu tiên. Ô xổ xuống gợi ý các lớp đã có; lớp mới cứ gõ tay (Excel hỏi lại thì bấm Yes) — máy sẽ tạo lớp mới (chưa gắn điểm trường, vào thẻ Cơ sở & Sáp nhập gán sau).'),
        hdRow('C', 'Cột "Mã học sinh" BẮT BUỘC và phải là mã của cơ sở dữ liệu ngành (mỗi em một mã, dùng suốt cấp học). Không có mã thì máy không phân biệt được hai em trùng tên. Em chưa có mã (mới tuyển sinh) thì dùng mẫu "Chia lớp tuyển sinh" — máy cấp mã tạm.'),
        hdRow('E', 'Cột "Ngày sinh" ghi dạng ngày/tháng/năm, ví dụ 05/09/2019. Cột "Giới tính" chọn Nam/Nữ. Cột "Dân tộc" ghi Kinh, Thái, Thổ… (không có thì để trống).'),
        hdRow('H', 'Cột "Loại khuyết tật" chỉ ghi với em học hoà nhập có hồ sơ (ví dụ: Trí tuệ, Vận động). Cột "Trạng thái HS" để trống là Đang học; em đã chuyển đi / thôi học thì chọn tương ứng.'),
        hdRow('J', 'Cột "Số định danh cá nhân" (căn cước) KHÔNG bắt buộc. Máy chỉ lưu khi người nạp tích ô "Nạp cả số định danh" ở bước soi thử, và chỉ quản trị đọc được.'),
        { o: [o('', 'thuong'), o('', 'thuong')] },
        hdRow('!', 'Hệ thống KHÔNG thu thập số điện thoại, họ tên - nghề nghiệp cha mẹ, địa chỉ, nơi sinh — mẫu này cố ý không có các cột đó (Luật Bảo vệ dữ liệu cá nhân 2025).')
      ]
    };

    var rows = [
      { cao: 30, o: [o('DANH SÁCH HỌC SINH' + (namHoc ? ' NĂM HỌC ' + namHoc : '') + ' — ' + tenTruong.toUpperCase(), 'tt', { gopN: N - 1 })] },
      dongChu('Điền vào ô NỀN VÀNG, mỗi em một dòng. Mã học sinh lấy từ cơ sở dữ liệu ngành. Dòng "Ví dụ" chỉ để xem cách ghi, máy bỏ qua.', N, 'tt3', 20),
      { cao: 20, o: [
        o('Ví dụ →', 'vd'), o('3A', 'vd'), o('1234567890', 'vd'), o('Trần Văn Bình', 'vd'), o('05/09/2018', 'vd'),
        o('Nam', 'vd'), o('Kinh', 'vd'), o('', 'vd'), o('Đang học', 'vd'), o('', 'vd'), o('', 'vd')
      ] },
      { cao: 32, o: TIEU_DE.map(function (t) { return o(t, 'dau'); }) }
    ];
    var dauDuLieu = rows.length + 1;
    for (var i = 1; i <= soDong; i++) {
      rows.push({ cao: 18, o: [o(i, 'oG', { so: 1 }), o('', 'nhapVG'), o('', 'nhapV'), o('', 'nhapV'),
        o('', 'nhapVG'), o('', 'nhapVG'), o('', 'nhapV'), o('', 'nhapV'), o('', 'nhapVG'), o('', 'nhapV'), o('', 'nhapV')] });
    }
    var cuoi = rows.length;
    var cGT = cotCua(TIEU_DE, 'Giới tính'), cTT = cotCua(TIEU_DE, 'Trạng thái HS'), cML = cotCua(TIEU_DE, 'Mã lớp');
    var kiemTra = [
      { vung: cGT + dauDuLieu + ':' + cGT + cuoi, ds: DM.vung('Giới tính') },
      { vung: cTT + dauDuLieu + ':' + cTT + cuoi, ds: DM.vung('Trạng thái HS') }
    ];
    // Mã lớp: chỉ NHẮC, không chặn — lớp mới chưa có trong hệ thống vẫn phải gõ được.
    if (lop.length) kiemTra.push({ vung: cML + dauDuLieu + ':' + cML + cuoi, ds: DM.vung('Mã lớp'), canhBao: true });

    return {
      ten: 'MAU-NHAP-HOC-SINH-' + khongDau(tenTruong) + (namHoc ? '-' + namHoc.replace(/\D/g, '') : '') + '.xlsx',
      sheets: [
        huongDan,
        { ten: 'HocSinh', cols: [6, 9, 14, 26, 12, 10, 10, 14, 13, 18, 20], rows: rows,
          in: { dongBang: 4, cotBang: 4, dauTrang: tenTruong }, kiemTra: kiemTra },
        DM.sheet
      ]
    };
  }

  // ══════════════════════════════════════════════════════════════
  // MẪU 3 — BIỂU CHIA LỚP TUYỂN SINH (chưa có mã của Bộ → mã tạm)
  // Khung giống biểu các trường vẫn tự lập: dòng "LỚP 1A" rồi tới học sinh,
  // hàng tiêu đề lặp lại ở đầu mỗi lớp — bộ đọc phanTichTS nhận đúng kiểu này.
  // ══════════════════════════════════════════════════════════════
  function mauTS(opt) {
    var tenTruong = opt.tenTruong || 'Trường Tiểu học ……';
    var namHoc = opt.namHoc || '';
    var dsLop = opt.lopTuyenSinh || ['1A', '1B', '1C'];
    var moiLop = opt.soDongMoiLop || 40;

    var TIEU_DE = ['TT', 'Họ và tên', 'Ngày sinh', 'Nữ', 'Dân tộc', 'Số CCCD', 'K.tật', 'Ghi chú'];
    var N = TIEU_DE.length;

    var huongDan = {
      ten: 'Hướng dẫn', cols: [4, 96], in: { doc: true, vuaTrang: true },
      rows: [
        { cao: 30, o: [o('MẪU BIỂU CHIA LỚP TUYỂN SINH LỚP 1' + (namHoc ? ' NĂM HỌC ' + namHoc : ''), 'tt', { gopN: 1 })] },
        { o: [o(tenTruong, 'tt2', { gopN: 1 })] },
        { o: [o('', 'thuong'), o('', 'thuong')] },
        hdRow('!', 'Dùng khi trường đã tuyển sinh, đã chia lớp nhưng cơ sở dữ liệu ngành CHƯA cấp mã học sinh. Máy nạp với MÃ TẠM; khi có tệp CSDL_HocSinh.xls của Bộ, nạp lại bằng loại "Học sinh" — máy đối chiếu theo số căn cước và đổi sang mã chính thức, không tạo bản ghi thứ hai.'),
        { o: [o('', 'thuong'), o('', 'thuong')] },
        { cao: 20, o: [o('', 'thuong'), o('CÁCH LÀM', 'hdb')] },
        hdRow('1', 'Mở trang "ChiaLop". Mỗi lớp là một khối: dòng "LỚP 1A", hàng tiêu đề, rồi các em của lớp đó. Sửa tên lớp ngay trong ô "LỚP …" cho đúng trường mình.'),
        hdRow('2', 'Nhiều lớp hơn mẫu: chọn cả khối (từ dòng "LỚP …" đến hết) → chép → dán xuống dưới rồi đổi tên lớp. Ít lớp hơn: xoá khối thừa. Dòng trống trong khối máy tự bỏ qua.'),
        hdRow('3', 'Lưu tệp. Vào hệ thống → Quản trị → Nạp dữ liệu → Loại "Tuyển sinh lớp 1" → chọn NĂM HỌC → Chọn tệp → soi thử → Ghi.'),
        { o: [o('', 'thuong'), o('', 'thuong')] },
        { cao: 20, o: [o('', 'thuong'), o('TỪNG CỘT', 'hdb')] },
        hdRow('F', 'Cột "Số CCCD" (số định danh cá nhân 12 số) là cột ĐÁNG ĐIỀN NHẤT: đó là chìa khoá để sau này máy nhận ra em đã có trong hệ thống mà gán mã chính thức của Bộ. Em nào thiếu là sau này phải sửa tay.'),
        hdRow('C', 'Cột "Ngày sinh" ghi ngày/tháng/năm, ví dụ 12/03/2020. Cột "Nữ" đánh x với em nữ, để trống với em nam. Cột "K.tật" đánh x với em khuyết tật học hoà nhập.')
      ]
    };

    var rows = [
      { cao: 44, o: [o('DANH SÁCH TUYỂN SINH LỚP 1' + (namHoc ? ' NĂM HỌC ' + namHoc : '') + '\n' + tenTruong.toUpperCase(), 'tt', { gopN: N - 1 })] },
      dongChu('Mỗi lớp một khối: dòng "LỚP …" → hàng tiêu đề → các em. Điền ô NỀN VÀNG. Ngày sinh ghi ngày/tháng/năm.', N, 'tt3', 20),
      { cao: 20, o: [
        o('Ví dụ →', 'vd'), o('Lê Thị Mai', 'vd'), o('12/03/2020', 'vd'), o('x', 'vd'),
        o('Kinh', 'vd'), o('040320xxxxxx', 'vd'), o('', 'vd'), o('', 'vd')
      ] }
    ];
    dsLop.forEach(function (lop) {
      rows.push({ o: trong(N, 'thuong') });
      rows.push({ cao: 24, o: [o('LỚP ' + String(lop).toUpperCase(), 'oB', { gopN: N - 1 })] });
      rows.push({ cao: 32, o: TIEU_DE.map(function (t) { return o(t, 'dau'); }) });
      for (var i = 1; i <= moiLop; i++) {
        rows.push({ cao: 18, o: [o(i, 'oG', { so: 1 }), o('', 'nhapV'), o('', 'nhapVG'), o('', 'nhapVG'),
          o('', 'nhapV'), o('', 'nhapV'), o('', 'nhapVG'), o('', 'nhapV')] });
      }
    });

    return {
      ten: 'MAU-CHIA-LOP-TUYEN-SINH-' + khongDau(tenTruong) + (namHoc ? '-' + namHoc.replace(/\D/g, '') : '') + '.xlsx',
      sheets: [
        huongDan,
        { ten: 'ChiaLop', cols: [6, 28, 13, 6, 12, 18, 7, 22], rows: rows, in: { doc: true, dauTrang: tenTruong } }
      ]
    };
  }

  var BO = { gv: mauGV, hs: mauHS, ts: mauTS };

  W.MAU_NHAP_EXCEL = {
    VAI_TRO: VAI_TRO,
    // dung('gv', { tenTruong, namHoc, coSo, lop, lopTuyenSinh, soDong }) → { ten, sheets }
    dung: function (loai, opt) {
      if (!BO[loai]) throw new Error('Không có mẫu loại "' + loai + '"');
      return BO[loai](opt || {});
    },
    // Tiện: trả về mảng byte .xlsx (cần EXCEL_DEP đã nạp)
    taoByte: function (loai, opt) {
      if (!W.EXCEL_DEP) throw new Error('Chưa nạp js/xuat-excel.js');
      var m = BO[loai](opt || {});
      return { ten: m.ten, byte: W.EXCEL_DEP.tao({ sheets: m.sheets }) };
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
