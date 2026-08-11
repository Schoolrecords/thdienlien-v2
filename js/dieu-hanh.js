// ============================================================
// dieu-hanh.js — MODULE ĐIỀU HÀNH NHÀ TRƯỜNG (bản DEMO giao diện)
// "Một vài nút chạm — nắm tình hình toàn trường."
//
// ⚠️ ĐỢT NÀY CHỈ DỰNG GIAO DIỆN — chưa nối cơ sở dữ liệu.
//    MỌI SỐ LIỆU, TÊN NGƯỜI, TÊN LỚP TRONG FILE NÀY LÀ DỮ LIỆU MẪU.
//    Thao tác được (bấm nút, xác nhận, phân dạy thay…) nhưng chỉ lưu tạm
//    trong bộ nhớ trang — tải lại trang là trở về trạng thái mẫu ban đầu.
//
// ⚠️ KHÔNG ghi tên thật CBGV/HS vào đây — repo là kho công khai.
// ⚠️ KHÔNG dùng tên điểm trường dự kiến sáp nhập (chưa có quyết định) —
//    demo dùng "Điểm trường số 2/3 (mẫu)".
//
// Khi làm thật: dữ liệu chảy từ các bảng bao_cao_dau_buoi, diem_danh_*,
// cong_viec, su_viec, day_thay trên Supabase (thiết kế đã chốt với thầy
// Chung 11/8/2026) — giao diện này giữ nguyên, chỉ đổi nguồn dữ liệu.
// ============================================================
(function () {
  'use strict';

  function $(s, p) { return (p || document).querySelector(s); }
  function thoat(s) { return window.thoatHTML ? window.thoatHTML(s) : String(s || ''); }

  // ── Giờ phút hiện tại dạng "7:15" ──
  function gioPhut() {
    var d = new Date();
    return d.getHours() + ':' + String(d.getMinutes()).padStart(2, '0');
  }
  function homNayChu() {
    var thu = ['Chủ nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
    var d = new Date();
    return thu[d.getDay()] + ', ngày ' + d.getDate() + '/' + (d.getMonth() + 1) + '/' + d.getFullYear();
  }
  function buoiHienTai() { return new Date().getHours() < 12 ? 'sang' : 'chieu'; }
  function tenBuoi(b) { return b === 'sang' ? 'buổi sáng' : 'buổi chiều'; }

  // ════════════════════════════════════════════════════════════
  // DỮ LIỆU MẪU — tên người, tên lớp đều là giả định để xem bố cục
  // ════════════════════════════════════════════════════════════
  var CO_SO = [
    { ma: 'CS01', ten: 'Cơ sở chính', gvTong: 20, hsTong: 520 },
    { ma: 'CS02', ten: 'Điểm trường số 2 (mẫu)', gvTong: 10, hsTong: 230 },
    { ma: 'CS03', ten: 'Điểm trường số 3 (mẫu)', gvTong: 7, hsTong: 113 }
  ];

  // Trạng thái báo cáo đầu buổi của từng điểm (mẫu):
  // CS01 đã báo 🟢 · CS02 đã báo 🟡 có lưu ý · CS03 chưa báo ⚪
  var BAO_CAO = {
    CS01: { gui: true, luc: '7:05', anToan: 'xanh', ghiChu: '' },
    CS02: { gui: true, luc: '7:12', anToan: 'vang', ghiChu: 'Đường ống nước khu vệ sinh bị rò, đã khoá van tạm.' },
    CS03: { gui: false }
  };

  // GV vắng hôm nay (mẫu) — người phụ trách điểm báo trong báo cáo đầu buổi
  var GV_VANG = [
    { ten: 'Cô Nguyễn Thị A.', coSo: 'CS01', lyDo: 'Nghỉ ốm', lopCN: '3B', baoTruoc: true },
    { ten: 'Thầy Trần Văn B.', coSo: 'CS02', lyDo: 'Công tác', lopCN: null, baoTruoc: true }
  ];

  // Danh sách GV của điểm chính (mẫu) — dùng cho ô chọn người vắng & dạy thay
  var GV_MAU = ['Cô Nguyễn Thị A.', 'Cô Lê Thị C.', 'Thầy Phạm Văn D.', 'Cô Hoàng Thị E.',
    'Cô Vũ Thị G.', 'Thầy Đỗ Văn H.', 'Cô Bùi Thị K.'];

  // Điểm danh học sinh theo lớp (mẫu — bản demo hiển thị 5 lớp của điểm chính)
  var LOP_DD = [
    { ten: '1A', siSo: 35, xong: true, vang: [] },
    { ten: '2A', siSo: 33, xong: true, vang: [{ ten: 'Nguyễn Văn An (mẫu)', phep: 'phep' }] },
    { ten: '3B', siSo: 32, xong: false, vang: [] },
    { ten: '4A', siSo: 34, xong: true, vang: [{ ten: 'Trần Thị Bích (mẫu)', phep: 'phep' }, { ten: 'Lê Văn Cường (mẫu)', phep: 'chua_ro' }] },
    { ten: '5A', siSo: 35, xong: false, vang: [] }
  ];
  // Danh sách tên mẫu để chọn khi bấm "Có HS vắng"
  var HS_MAU = ['Nguyễn Văn An (mẫu)', 'Trần Thị Bích (mẫu)', 'Lê Văn Cường (mẫu)',
    'Phạm Thị Dung (mẫu)', 'Hoàng Văn Em (mẫu)', 'Vũ Thị Phương (mẫu)'];

  // Dạy thay: cô A. nghỉ ốm → lớp 3B trống 4 tiết sáng (theo TKB mẫu).
  // Tiết 1, 2 đã phân; tiết 3, 4 chưa — dashboard phải đỏ cho tới khi đủ.
  var DAY_THAY = [
    { tiet: 1, mon: 'Toán', gv: 'Cô Lê Thị C.' },
    { tiet: 2, mon: 'Tiếng Việt', gv: 'Cô Lê Thị C.' },
    { tiet: 3, mon: 'Tiếng Việt', gv: null },
    { tiet: 4, mon: 'Đạo đức', gv: null }
  ];
  // Gợi ý người rảnh từng tiết (mẫu) — khi làm thật sẽ tra TKB
  var GOI_Y_RANH = [
    { ten: 'Cô Hoàng Thị E.', nhan: 'Rảnh cả buổi · cùng khối 3 · tháng này dạy thay 2 tiết' },
    { ten: 'Thầy Đỗ Văn H.', nhan: 'Rảnh tiết 3–4 · GV Thể chất · tháng này dạy thay 4 tiết' },
    { ten: 'Cô Bùi Thị K.', nhan: 'Rảnh tiết 3 · GV Âm nhạc · tháng này dạy thay 6 tiết' }
  ];

  // Việc trong tuần (mẫu) — mỗi việc: nội dung, người, điểm, hạn, mức, trạng thái
  var VIEC = [
    { id: 1, noiDung: 'Hoàn thiện hồ sơ phổ cập gửi UBND xã', nguoi: 'Cô Lê Thị C.', coSo: 'CS01', han: 'Hôm nay', muc: 'quan_trong', tt: 'xong' },
    { id: 2, noiDung: 'Kiểm kê thiết bị dạy học đầu năm', nguoi: 'Thầy Phạm Văn D.', coSo: 'CS01', han: 'Hôm nay', muc: 'binh_thuong', tt: 'xong' },
    { id: 3, noiDung: 'Rà soát danh sách HS khuyết tật hoà nhập', nguoi: 'Cô Hoàng Thị E.', coSo: 'CS02', han: 'Hôm nay', muc: 'binh_thuong', tt: 'xong' },
    { id: 4, noiDung: 'Chuẩn bị nội dung họp chuyên môn khối 4-5', nguoi: 'Cô Vũ Thị G.', coSo: 'CS01', han: 'Thứ Tư', muc: 'binh_thuong', tt: 'xong' },
    { id: 5, noiDung: 'Cập nhật bảng tin an toàn trường học', nguoi: 'Thầy Đỗ Văn H.', coSo: 'CS03', han: 'Thứ Tư', muc: 'binh_thuong', tt: 'xong' },
    { id: 6, noiDung: 'Tổng hợp đăng ký bán trú tháng 9', nguoi: 'Cô Bùi Thị K.', coSo: 'CS01', han: 'Thứ Sáu', muc: 'quan_trong', tt: 'dang' },
    { id: 7, noiDung: 'Sửa khoá cổng phụ khu B', nguoi: 'Thầy Phạm Văn D.', coSo: 'CS02', han: 'Hôm qua', muc: 'khan', tt: 'chua', quaHan: true }
  ];

  // Sự việc (mẫu) — từ nút BÁO VIỆC
  var SU_VIEC = [
    { id: 1, loai: 'Cơ sở vật chất', muc: 'do', moTa: 'Cành cây phượng sân sau bị gãy treo lơ lửng, cần xử lý trước giờ ra chơi.', nguoi: 'Thầy Đỗ Văn H.', coSo: 'CS01', luc: '6:58', tt: 'moi' },
    { id: 2, loai: 'Điện / Nước', muc: 'vang', moTa: 'Đường ống nước khu vệ sinh rò rỉ, đã khoá van tạm.', nguoi: 'Cô Hoàng Thị E.', coSo: 'CS02', luc: '7:12', tt: 'tiep_nhan' }
  ];

  // Nhật ký điều hành (mẫu) — mọi thao tác tự ghi vào đây
  var NHAT_KY = [
    { luc: '7:12', chu: 'Điểm trường số 2 báo cáo đầu buổi: 🟡 Cần lưu ý — rò nước khu vệ sinh.' },
    { luc: '7:05', chu: 'Cơ sở chính báo cáo đầu buổi: 🟢 An toàn. GV vắng: cô Nguyễn Thị A. (ốm).' },
    { luc: '6:58', chu: '🔴 Báo việc: cành cây gãy sân sau (Cơ sở chính — thầy Đỗ Văn H.).' },
    { luc: 'Hôm qua', chu: 'Hiệu trưởng phân công dạy thay lớp 3B tiết 1–2: cô Lê Thị C.' }
  ];

  // ── Trạng thái màn hình ──
  var TAB = 'homnay';       // tab đang mở
  var LOC_CS = 'all';       // bộ lọc điểm trường trên dashboard
  var BC_ANTOAN = null;     // lựa chọn an toàn ở màn báo cáo đầu buổi
  var BC_GV_VANG = [];      // tên GV vắng đang tick ở màn báo cáo
  var LOP_MO_VANG = null;   // lớp đang mở ô chọn HS vắng
  var VIEC_ID_MOI = 100;

  function ghiNhatKy(chu) {
    NHAT_KY.unshift({ luc: gioPhut(), chu: chu });
  }
  function nhac() {
    window.notify('Bản mẫu — thao tác chỉ lưu tạm trên máy, tải lại trang là trở về ban đầu.');
  }

  // ════════════════════════════════════════════════════════════
  // TỔNG HỢP SỐ LIỆU — mọi con số trên dashboard đều TÍNH từ dữ liệu
  // bên trên, không viết cứng: đúng nguyên tắc "nhập một lần, tự tổng hợp"
  // ════════════════════════════════════════════════════════════
  function tinh() {
    var dsCS = LOC_CS === 'all' ? CO_SO : CO_SO.filter(function (c) { return c.ma === LOC_CS; });
    var maCS = dsCS.map(function (c) { return c.ma; });

    var gvTong = 0, hsTong = 0;
    dsCS.forEach(function (c) { gvTong += c.gvTong; hsTong += c.hsTong; });
    var gvVang = GV_VANG.filter(function (g) { return maCS.indexOf(g.coSo) >= 0; });

    var hsVang = 0;
    if (maCS.indexOf('CS01') >= 0) {
      LOP_DD.forEach(function (l) { if (l.xong) hsVang += l.vang.length; });
      hsVang += 4; // các lớp còn lại của điểm chính (mẫu)
    }
    if (maCS.indexOf('CS02') >= 0) hsVang += 5;
    if (maCS.indexOf('CS03') >= 0) hsVang += 3;

    var soXanh = 0, soVang = 0, soDo = 0, soChua = 0;
    dsCS.forEach(function (c) {
      var b = BAO_CAO[c.ma];
      if (!b || !b.gui) soChua++;
      else if (b.anToan === 'xanh') soXanh++;
      else if (b.anToan === 'vang') soVang++;
      else soDo++;
    });

    var viec = VIEC.filter(function (v) { return maCS.indexOf(v.coSo) >= 0; });
    var vXong = viec.filter(function (v) { return v.tt === 'xong'; }).length;
    var vQuaHan = viec.filter(function (v) { return v.quaHan && v.tt !== 'xong'; }).length;

    var svCanXuLy = SU_VIEC.filter(function (s) {
      return maCS.indexOf(s.coSo) >= 0 && s.tt !== 'da_xu_ly';
    }).length;

    var tietThieu = DAY_THAY.filter(function (t) { return !t.gv; }).length;

    return {
      dsCS: dsCS, gvTong: gvTong, gvVang: gvVang, hsTong: hsTong, hsVang: hsVang,
      soXanh: soXanh, soVang: soVang, soDo: soDo, soChua: soChua,
      viecTong: viec.length, vXong: vXong, vQuaHan: vQuaHan,
      svCanXuLy: svCanXuLy, tietThieu: tietThieu
    };
  }

  // ════════════════════════════════════════════════════════════
  // TAB 1 · ĐIỀU HÀNH HÔM NAY (dashboard của Ban giám hiệu)
  // ════════════════════════════════════════════════════════════
  function veHomNay() {
    var t = tinh();

    // Băng trạng thái toàn trường — chữ to, nhìn một giây là hiểu
    var bang;
    if (t.soDo) {
      bang = '<div class="dh-bang do">🔴 CÓ SỰ VIỆC CẦN XỬ LÝ NGAY</div>';
    } else if (t.soChua) {
      bang = '<div class="dh-bang xam">⚪ ' + t.soChua + ' điểm trường CHƯA XÁC NHẬN — chưa được coi là an toàn</div>';
    } else if (t.soVang) {
      bang = '<div class="dh-bang vang">🟡 Có điểm trường cần lưu ý</div>';
    } else {
      bang = '<div class="dh-bang xanh">🟢 TOÀN TRƯỜNG AN TOÀN</div>';
    }

    // 5 thẻ số liệu
    var the5 =
      '<div class="luoi-thong-ke dh-5the">' +
      '<div class="o-so"><div class="so trang">' + (t.gvTong - t.gvVang.length) + '/' + t.gvTong + '</div><div class="nhan">giáo viên có mặt · ' + t.gvVang.length + ' vắng</div></div>' +
      '<div class="o-so"><div class="so trang">' + (t.hsTong - t.hsVang).toLocaleString('vi-VN') + '/' + t.hsTong.toLocaleString('vi-VN') + '</div><div class="nhan">học sinh có mặt · ' + t.hsVang + ' vắng</div></div>' +
      '<div class="o-so"><div class="so xanh">' + t.soXanh + '/' + t.dsCS.length + '</div><div class="nhan">điểm trường an toàn' + (t.soChua ? ' · ' + t.soChua + ' chưa xác nhận' : '') + '</div></div>' +
      '<div class="o-so"><div class="so vang">' + t.vXong + '/' + t.viecTong + '</div><div class="nhan">việc hoàn thành' + (t.vQuaHan ? ' · ' + t.vQuaHan + ' quá hạn' : '') + '</div></div>' +
      '<div class="o-so"><div class="so ' + (t.svCanXuLy ? 'hong' : 'xanh') + '">' + t.svCanXuLy + '</div><div class="nhan">sự việc cần xử lý</div></div>' +
      '</div>';

    // Danh sách trạng thái từng điểm trường
    var hangCS = CO_SO.map(function (c) {
      var b = BAO_CAO[c.ma] || {};
      var cham, chu;
      if (!b.gui) { cham = 'xam'; chu = 'Chưa báo cáo ' + tenBuoi(buoiHienTai()); }
      else if (b.anToan === 'xanh') { cham = 'xanh'; chu = 'Đã xác nhận AN TOÀN lúc ' + b.luc; }
      else if (b.anToan === 'vang') { cham = 'vang'; chu = 'Cần lưu ý (' + b.luc + '): ' + b.ghiChu; }
      else { cham = 'do'; chu = 'CÓ SỰ VIỆC (' + b.luc + '): ' + b.ghiChu; }
      return '<div class="dh-diem-hang"><span class="dh-cham ' + cham + '"></span>' +
        '<div class="tt"><b>' + thoat(c.ten) + '</b><small>' + thoat(chu) + '</small></div>' +
        (!b.gui ? '<button class="dh-nut-nho" onclick="DH.tab(\'baocao\')">Báo cáo ngay</button>' : '') +
        '</div>';
    }).join('');

    // Ô cần chú ý: GV vắng + dạy thay + sự việc đỏ
    var gvVangChu = t.gvVang.length
      ? t.gvVang.map(function (g) {
          return '<li>' + thoat(g.ten) + ' — ' + thoat(g.lyDo) +
            (g.lopCN ? ' · chủ nhiệm <b>' + thoat(g.lopCN) + '</b>' : '') + '</li>';
        }).join('')
      : '<li>Không có giáo viên vắng.</li>';

    var dayThayChu = t.tietThieu
      ? '<div class="hd-kiem do">🔴 Lớp 3B còn <b>' + t.tietThieu + ' tiết chưa có người dạy thay</b> — ' +
        '<a href="javascript:DH.tab(\'daythay\')">bố trí ngay →</a></div>'
      : '<div class="hd-kiem xanh">🟢 Mọi lớp có giáo viên vắng đều đã bố trí dạy thay.</div>';

    return bang + the5 +
      '<div class="dh-hai-cot">' +
      '<div><div class="dh-tieu-de">Tình hình từng điểm trường</div>' + hangCS + '</div>' +
      '<div><div class="dh-tieu-de">Giáo viên vắng hôm nay</div>' +
      '<ul class="dh-ul">' + gvVangChu + '</ul>' + dayThayChu + '</div>' +
      '</div>';
  }

  // ════════════════════════════════════════════════════════════
  // TAB 2 · BÁO CÁO ĐẦU BUỔI + AN TOÀN XANH (người phụ trách điểm)
  // ════════════════════════════════════════════════════════════
  function veBaoCao() {
    var daGui = BAO_CAO.CS03.gui;
    if (daGui) {
      return '<div class="the-thong-bao"><p style="font-size:15px">🟢 <b>Điểm trường số 3 (mẫu) đã báo cáo ' +
        tenBuoi(buoiHienTai()) + ' lúc ' + BAO_CAO.CS03.luc + '.</b></p>' +
        '<p style="font-size:13.5px;color:var(--chu-mo);margin-top:6px">Khi làm thật, mỗi buổi chỉ báo một lần; ' +
        'muốn sửa thì mở lại trong ngày. Tải lại trang để xem lại luồng báo cáo mẫu.</p></div>';
    }

    var oGV = '<div class="dh-tieu-de">1 · Giáo viên</div>' +
      '<div class="dh-chon-hang">' +
      '<button class="dh-nut-lon' + (BC_GV_VANG.length === 0 ? ' on' : '') + '" onclick="DH.bcGvDu()">✓ Đủ 7/7</button>' +
      '<button class="dh-nut-lon' + (BC_GV_VANG.length ? ' on' : '') + '" onclick="DH.bcGvVang()">Có người vắng</button>' +
      '</div>' +
      (BC_GV_VANG.length || LOP_MO_VANG === 'gv'
        ? '<div class="dh-hop-chon">' + GV_MAU.slice(3).map(function (g) {
            var on = BC_GV_VANG.indexOf(g) >= 0;
            return '<button class="chip-loc' + (on ? ' on' : '') + '" onclick="DH.bcTickGv(this)" data-gv="' + thoat(g) + '">' + thoat(g) + '</button>';
          }).join('') +
          '<div class="dh-ghi-chu-nho">Chạm tên người vắng — khi làm thật sẽ chọn kèm lý do (ốm / phép / công tác…).</div></div>'
        : '');

    var oHS = '<div class="dh-tieu-de">2 · Học sinh</div>' +
      '<div class="hd-kiem xanh" style="margin-top:2px">Sĩ số điểm trường: <b>113</b> · hệ thống tự cộng từ điểm danh các lớp — ' +
      'người phụ trách <b>không phải nhập lại</b>. Hiện các lớp báo vắng <b>3</b> em → có mặt <b>110/113</b>, chuyên cần 97,3%.</div>';

    var nutAT = function (ma, chu, phu) {
      return '<button class="dh-an-toan ' + ma + (BC_ANTOAN === ma ? ' on' : '') + '" onclick="DH.bcAnToan(\'' + ma + '\')">' +
        '<b>' + chu + '</b><small>' + phu + '</small></button>';
    };
    var oAT = '<div class="dh-tieu-de">3 · An toàn</div>' +
      '<div class="dh-an3">' +
      nutAT('xanh', '🟢 AN TOÀN', 'Mọi việc bình thường') +
      nutAT('vang', '🟡 CẦN LƯU Ý', 'Có việc cần theo dõi') +
      nutAT('do', '🔴 CÓ SỰ VIỆC', 'Cần BGH xử lý') +
      '</div>' +
      '<div class="dh-ghi-chu-nho">Bấm 🟢 là xác nhận nhanh: học sinh an toàn, hoạt động bình thường, cơ sở vật chất – điện nước – an ninh ' +
      'bình thường. <b>Không phải tick từng tiêu chí</b> khi mọi việc bình thường.</div>';

    var oGhiChu = (BC_ANTOAN === 'vang' || BC_ANTOAN === 'do')
      ? '<div class="dh-tieu-de">4 · Ghi chú</div>' +
        '<textarea id="dh-bc-ghichu" class="dh-o-nhap" rows="2" placeholder="Mô tả ngắn vấn đề cần lưu ý / cần xử lý…"></textarea>'
      : '';

    var oChieu = buoiHienTai() === 'sang'
      ? '<label class="dh-tick"><input type="checkbox" id="dh-bc-1buoi"> Chiều nay điểm trường <b>không học</b> (dashboard sẽ không chờ báo cáo chiều)</label>'
      : '';

    return '<div class="hd-kiem vang">Màn này dành cho <b>người phụ trách điểm trường</b> — bản mẫu đóng vai ' +
      'người phụ trách <b>Điểm trường số 3</b> đang báo cáo ' + tenBuoi(buoiHienTai()) + '.</div>' +
      oGV + oHS + oAT + oGhiChu + oChieu +
      '<button class="dh-nut-gui' + (BC_ANTOAN ? '' : ' mo') + '" onclick="DH.bcGui()">XÁC NHẬN ĐẦU BUỔI</button>' +
      '<div class="dh-ghi-chu-nho" style="text-align:center">Sau khi xác nhận, dashboard Ban giám hiệu cập nhật ngay lập tức.</div>';
  }

  // ════════════════════════════════════════════════════════════
  // TAB 3 · ĐIỂM DANH HỌC SINH (giáo viên dạy đầu buổi)
  // ════════════════════════════════════════════════════════════
  function veDiemDanh() {
    var the = LOP_DD.map(function (l) {
      var coMat = l.siSo - l.vang.length;
      var dau;
      if (l.xong) {
        dau = '<div class="dh-lop-xong">🟢 ' + coMat + '/' + l.siSo + ' có mặt' +
          (l.vang.length
            ? ' · vắng: ' + l.vang.map(function (v) {
                return thoat(v.ten.replace(' (mẫu)', '')) + (v.phep === 'phep' ? ' (P)' : v.phep === 'khong_phep' ? ' (K)' : ' (?)');
              }).join(', ')
            : ' · đủ') + '</div>';
      } else if (LOP_MO_VANG === l.ten) {
        dau = '<div class="dh-hop-chon">' + HS_MAU.map(function (h) {
          var on = l.vang.some(function (v) { return v.ten === h; });
          return '<button class="chip-loc' + (on ? ' on' : '') + '" onclick="DH.ddTick(\'' + thoat(l.ten) + '\',this)" data-hs="' + thoat(h) + '">' + thoat(h.replace(' (mẫu)', '')) + '</button>';
        }).join('') +
        '<div class="dh-ghi-chu-nho">Chạm tên em vắng. Khi làm thật: danh sách đúng lớp, chọn kèm Có phép / Không phép / Chưa rõ.</div>' +
        '<button class="dh-nut-nho" onclick="DH.ddLuu(\'' + thoat(l.ten) + '\')">Lưu điểm danh (' + l.vang.length + ' vắng)</button></div>';
      } else {
        dau = '<div class="dh-chon-hang">' +
          '<button class="dh-nut-lon" onclick="DH.ddDu(\'' + thoat(l.ten) + '\')">✓ ĐỦ ' + l.siSo + '/' + l.siSo + '</button>' +
          '<button class="dh-nut-lon phu" onclick="DH.ddMoVang(\'' + thoat(l.ten) + '\')">Có HS vắng</button></div>';
      }
      return '<div class="dh-lop-the"><div class="dh-lop-ten">Lớp ' + thoat(l.ten) + ' <small>· sĩ số ' + l.siSo + '</small></div>' + dau + '</div>';
    }).join('');

    return '<div class="hd-kiem vang">Màn này dành cho <b>giáo viên dạy đầu buổi</b>: lớp đủ thì đúng MỘT nút, ' +
      'chỉ khi có em vắng mới chọn tên. Bản mẫu hiển thị 5 lớp.</div>' + the +
      '<div class="hd-kiem do" style="margin-top:14px">⚠ <b>Cảnh báo nghỉ dài (mẫu):</b> em Lê Văn Cường (4A) đã vắng ' +
      '<b>3 buổi liên tiếp, chưa rõ lý do</b> — hệ thống tự nhắc GV chủ nhiệm và Ban giám hiệu.</div>';
  }

  // ════════════════════════════════════════════════════════════
  // TAB 4 · BÁO NGHỈ & DẠY THAY (Ban giám hiệu bố trí)
  // ════════════════════════════════════════════════════════════
  function veDayThay() {
    var daDu = DAY_THAY.every(function (t) { return t.gv; });

    var donNghi = '<div class="dh-tieu-de">Đơn báo nghỉ</div>' +
      '<div class="dh-diem-hang"><span class="dh-cham vang"></span>' +
      '<div class="tt"><b>Cô Nguyễn Thị A. — Nghỉ ốm</b>' +
      '<small>Sáng nay · chủ nhiệm lớp 3B · báo lúc 20:15 hôm qua ✓ đúng quy định (trước ≥ 1 buổi)</small></div></div>';

    var bangTiet = '<div class="dh-tieu-de">Lớp 3B — ' + tenBuoi(buoiHienTai()) + ' (theo thời khoá biểu mẫu)</div>' +
      DAY_THAY.map(function (t) {
        return '<div class="dh-tiet' + (t.gv ? ' xong' : '') + '">' +
          '<span class="dh-tiet-so">Tiết ' + t.tiet + '</span>' +
          '<span class="dh-tiet-mon">' + thoat(t.mon) + '</span>' +
          (t.gv
            ? '<span class="dh-tiet-gv">🟢 ' + thoat(t.gv) + '</span>'
            : '<span class="dh-tiet-gv thieu">🔴 chưa có người</span>') +
          '</div>';
      }).join('');

    var goiY = daDu ? '' :
      '<div class="dh-tieu-de">Gợi ý người dạy thay các tiết còn thiếu</div>' +
      '<div class="dh-ghi-chu-nho" style="margin-top:0">Hệ thống tra thời khoá biểu, chỉ hiện người <b>rảnh</b>; xếp trên: cùng điểm trường → ' +
      'cùng khối → <b>ít tiết dạy thay trong tháng</b> (chia đều, không dồn một người).</div>' +
      GOI_Y_RANH.map(function (g) {
        return '<button class="dh-goiy" onclick="DH.dtChon(\'' + thoat(g.ten) + '\')">' +
          '<b>' + thoat(g.ten) + '</b><small>' + thoat(g.nhan) + '</small><span>Chọn dạy các tiết còn thiếu →</span></button>';
      }).join('');

    var nhatKyDT = '<div class="dh-tieu-de">Nhật ký dạy thay tháng này (mẫu)</div>' +
      '<div class="cuon-ngang"><table class="bang-quan-tri nho"><thead><tr>' +
      '<th>Giáo viên</th><th>Số tiết dạy thay</th><th>Thay cho</th></tr></thead><tbody>' +
      '<tr><td>Cô Lê Thị C.</td><td style="text-align:center"><b>6</b></td><td>Cô Nguyễn Thị A. (ốm)</td></tr>' +
      '<tr><td>Thầy Đỗ Văn H.</td><td style="text-align:center"><b>4</b></td><td>Thầy Trần Văn B. (công tác)</td></tr>' +
      '<tr><td>Cô Hoàng Thị E.</td><td style="text-align:center"><b>2</b></td><td>Cô Nguyễn Thị A. (ốm)</td></tr>' +
      '</tbody></table></div>' +
      '<div class="dh-ghi-chu-nho">Cuối tháng bảng này là căn cứ tính tăng giờ, xét thi đua — tự sinh từ thao tác bố trí, không ai phải ghi sổ lại.</div>';

    return '<div class="hd-kiem vang">Màn này dành cho <b>Ban giám hiệu</b>. Nguyên tắc: giáo viên báo nghỉ ' +
      '<b>trước ít nhất 1 buổi</b>; báo muộn vẫn gửi được nhưng bị đánh dấu ⚠ báo muộn.</div>' +
      '<button class="dh-nut-nho" style="margin-bottom:10px" onclick="window.notify(\'Khi có thời khoá biểu thật (Excel), nạp tại đây — hệ thống đọc bằng SheetJS ngay trên trình duyệt.\')">📥 Nạp thời khoá biểu (Excel)</button>' +
      donNghi + bangTiet + goiY + nhatKyDT;
  }

  // ════════════════════════════════════════════════════════════
  // TAB 5 · VIỆC TRONG TUẦN
  // ════════════════════════════════════════════════════════════
  var TT_VIEC = { chua: ['⚪', 'Chưa thực hiện'], dang: ['🟡', 'Đang thực hiện'], xong: ['🟢', 'Hoàn thành'] };
  var MUC_VIEC = { binh_thuong: '', quan_trong: '<span class="dh-muc qt">Quan trọng</span>', khan: '<span class="dh-muc kh">Khẩn</span>' };

  function veViec() {
    var xong = VIEC.filter(function (v) { return v.tt === 'xong'; }).length;
    var dang = VIEC.filter(function (v) { return v.tt === 'dang'; }).length;
    var quaHan = VIEC.filter(function (v) { return v.quaHan && v.tt !== 'xong'; }).length;

    // Gom theo người — góc nhìn "tuần này ai làm gì, đến đâu"
    var theoNguoi = {};
    VIEC.forEach(function (v) {
      (theoNguoi[v.nguoi] = theoNguoi[v.nguoi] || []).push(v);
    });

    var dsNguoi = Object.keys(theoNguoi).map(function (ng) {
      var ds = theoNguoi[ng];
      var dong = ds.map(function (v) {
        var tt = TT_VIEC[v.tt];
        return '<div class="dh-viec' + (v.quaHan && v.tt !== 'xong' ? ' qua-han' : '') + '">' +
          '<button class="dh-viec-tt" title="Chạm để chuyển trạng thái" onclick="DH.vDoi(' + v.id + ')">' + tt[0] + '</button>' +
          '<div class="tt"><b>' + thoat(v.noiDung) + '</b> ' + MUC_VIEC[v.muc] +
          '<small>' + thoat((CO_SO.filter(function (c) { return c.ma === v.coSo; })[0] || {}).ten || '') +
          ' · hạn: ' + thoat(v.han) + (v.quaHan && v.tt !== 'xong' ? ' · <b class="dh-do">QUÁ HẠN</b>' : '') +
          ' · ' + tt[1] + '</small></div></div>';
      }).join('');
      var soXong = ds.filter(function (v) { return v.tt === 'xong'; }).length;
      return '<div class="dh-nguoi-nhom"><div class="dh-nguoi-ten">' + thoat(ng) +
        ' <small>' + soXong + '/' + ds.length + ' việc hoàn thành</small></div>' + dong + '</div>';
    }).join('');

    return '<div class="hd-kiem vang">Ban giám hiệu giao việc; người thực hiện chạm vào chấm tròn để chuyển ' +
      '⚪ → 🟡 → 🟢. Đây là "việc cần làm của nhà trường", không phải phần mềm quản lý dự án.</div>' +
      '<div class="dh-viec-tom">TUẦN NÀY: <b>' + VIEC.length + '</b> việc · 🟢 ' + xong + ' · 🟡 ' + dang +
      ' · 🔴 ' + quaHan + ' quá hạn</div>' +
      '<div class="dh-giao-viec">' +
      '<input class="dh-o-nhap" id="dh-viec-noidung" placeholder="Giao việc nhanh: nội dung công việc…">' +
      '<div class="dh-chon-hang">' +
      '<select class="dh-o-nhap" id="dh-viec-nguoi">' + GV_MAU.map(function (g) { return '<option>' + thoat(g) + '</option>'; }).join('') + '</select>' +
      '<select class="dh-o-nhap" id="dh-viec-muc"><option value="binh_thuong">Bình thường</option><option value="quan_trong">Quan trọng</option><option value="khan">Khẩn</option></select>' +
      '<button class="dh-nut-nho" onclick="DH.vGiao()">+ Giao việc</button></div></div>' +
      dsNguoi;
  }

  // ════════════════════════════════════════════════════════════
  // TAB 6 · BÁO VIỆC & NHẬT KÝ ĐIỀU HÀNH
  // ════════════════════════════════════════════════════════════
  var LOAI_BV = ['Học sinh', 'Giáo viên', 'Cơ sở vật chất', 'Điện / Nước', 'An ninh', 'Y tế', 'Thiết bị', 'Khác'];
  var BV_LOAI = null, BV_MUC = null;

  function veBaoViec() {
    var TT_SV = { moi: ['do', 'Chờ tiếp nhận'], tiep_nhan: ['vang', 'Đã tiếp nhận — đang xử lý'], da_xu_ly: ['xanh', 'Đã xử lý'] };
    var dsSV = SU_VIEC.map(function (s) {
      var tt = TT_SV[s.tt];
      return '<div class="dh-diem-hang"><span class="dh-cham ' + (s.muc === 'do' ? 'do' : 'vang') + '"></span>' +
        '<div class="tt"><b>' + thoat(s.loai) + ' — ' + thoat((CO_SO.filter(function (c) { return c.ma === s.coSo; })[0] || {}).ten || '') + '</b>' +
        '<small>' + thoat(s.moTa) + '</small>' +
        '<small>' + thoat(s.nguoi) + ' báo lúc ' + s.luc + ' · <span class="dh-' + tt[0] + '">' + tt[1] + '</span></small></div>' +
        (s.tt === 'moi' ? '<button class="dh-nut-nho" onclick="DH.svTiepNhan(' + s.id + ')">Đã tiếp nhận</button>'
          : s.tt === 'tiep_nhan' ? '<button class="dh-nut-nho" onclick="DH.svXuLy(' + s.id + ')">Đã xử lý</button>' : '') +
        '</div>';
    }).join('');

    var formBV = '<div class="dh-tieu-de">⚠️ Báo việc (dành cho mọi giáo viên)</div>' +
      '<div class="dh-hop-chon" style="margin-top:2px">' + LOAI_BV.map(function (l) {
        return '<button class="chip-loc' + (BV_LOAI === l ? ' on' : '') + '" onclick="DH.bvLoai(this)" data-loai="' + thoat(l) + '">' + thoat(l) + '</button>';
      }).join('') + '</div>' +
      '<div class="dh-chon-hang" style="margin:8px 0">' +
      '<button class="dh-nut-lon' + (BV_MUC === 'vang' ? ' on' : '') + '" onclick="DH.bvMuc(\'vang\')">🟡 Cần lưu ý</button>' +
      '<button class="dh-nut-lon' + (BV_MUC === 'do' ? ' on' : '') + '" onclick="DH.bvMuc(\'do\')">🔴 Cần xử lý ngay</button></div>' +
      '<textarea class="dh-o-nhap" id="dh-bv-mota" rows="2" placeholder="Mô tả ngắn sự việc… (khi làm thật: kèm được 1–3 ảnh)"></textarea>' +
      '<button class="dh-nut-gui" onclick="DH.bvGui()">GỬI BÁO CÁO</button>';

    var nhatKy = '<div class="dh-tieu-de" style="margin-top:20px">Nhật ký điều hành</div>' +
      '<div class="dh-chon-hang" style="margin-bottom:8px">' +
      ['Hôm nay', 'Tuần này', 'Tháng này'].map(function (c, i) {
        return '<button class="chip-loc' + (i === 0 ? ' on' : '') + '" onclick="window.notify(\'Bản mẫu — bộ lọc thời gian hoạt động khi nối cơ sở dữ liệu.\')">' + c + '</button>';
      }).join('') + '</div>' +
      '<div class="dh-nk">' + NHAT_KY.map(function (n) {
        return '<div class="dh-nk-dong"><span class="dh-nk-luc">' + thoat(n.luc) + '</span><span>' + n.chu + '</span></div>';
      }).join('') + '</div>' +
      '<div class="dh-ghi-chu-nho">Mọi thao tác (báo cáo đầu buổi, điểm danh, an toàn xanh, báo việc, giao việc, dạy thay) ' +
      'tự ghi vào nhật ký — đây chính là nguồn để sau này <b>tự sinh báo cáo ngày / tuần / tháng</b>, không nhập lại.</div>';

    return '<div class="dh-tieu-de" style="margin-top:0">Sự việc đang theo dõi</div>' + dsSV + formBV + nhatKy;
  }

  // ════════════════════════════════════════════════════════════
  // KHUNG MODULE — thanh tab + nội dung
  // ════════════════════════════════════════════════════════════
  var DS_TAB = [
    { ma: 'homnay', ten: '📊 Hôm nay' },
    { ma: 'baocao', ten: '🟢 Báo cáo đầu buổi' },
    { ma: 'diemdanh', ten: '🎒 Điểm danh HS' },
    { ma: 'daythay', ten: '👨‍🏫 Dạy thay' },
    { ma: 'viec', ten: '✅ Việc trong tuần' },
    { ma: 'baoviec', ten: '⚠️ Báo việc' }
  ];

  function veDieuHanh() {
    var vung = $('#vung-dieuhanh');
    if (!vung) return;

    var dauNgay = '<div class="dh-dau"><div><b>ĐIỀU HÀNH HÔM NAY</b><small>' + homNayChu() +
      ' · ' + tenBuoi(buoiHienTai()) + '</small></div></div>';

    var locCS = TAB === 'homnay'
      ? '<div class="dh-chon-hang dh-loc-cs">' +
        [{ ma: 'all', ten: 'Toàn trường' }].concat(CO_SO.map(function (c) { return { ma: c.ma, ten: c.ten.replace(' (mẫu)', '') }; }))
          .map(function (c) {
            return '<button class="chip-loc' + (LOC_CS === c.ma ? ' on' : '') + '" onclick="DH.locCS(\'' + c.ma + '\')">' + thoat(c.ten) + '</button>';
          }).join('') + '</div>'
      : '';

    var thanhTab = '<div class="dh-thanh-tab">' + DS_TAB.map(function (t) {
      return '<button class="' + (TAB === t.ma ? 'on' : '') + '" onclick="DH.tab(\'' + t.ma + '\')">' + t.ten + '</button>';
    }).join('') + '</div>';

    var noiDung =
      TAB === 'homnay' ? veHomNay() :
      TAB === 'baocao' ? veBaoCao() :
      TAB === 'diemdanh' ? veDiemDanh() :
      TAB === 'daythay' ? veDayThay() :
      TAB === 'viec' ? veViec() : veBaoViec();

    vung.innerHTML =
      '<div class="hd-kiem vang">🧪 <b>BẢN XEM THỬ GIAO DIỆN — toàn bộ số liệu, tên người, tên lớp là DỮ LIỆU MẪU.</b> ' +
      'Bấm thử được mọi nút; thao tác chỉ lưu tạm trên máy, chưa ghi vào cơ sở dữ liệu.</div>' +
      dauNgay + thanhTab + locCS + '<div class="dh-noi-dung">' + noiDung + '</div>';
  }

  // ════════════════════════════════════════════════════════════
  // XỬ LÝ THAO TÁC (bản mẫu — đổi trạng thái trong bộ nhớ rồi vẽ lại)
  // ════════════════════════════════════════════════════════════
  window.DH = {
    tab: function (ma) { TAB = ma; veDieuHanh(); window.scrollTo(0, 0); },
    locCS: function (ma) { LOC_CS = ma; veDieuHanh(); },

    // ── Báo cáo đầu buổi ──
    bcGvDu: function () { BC_GV_VANG = []; LOP_MO_VANG = null; veDieuHanh(); },
    bcGvVang: function () { LOP_MO_VANG = 'gv'; veDieuHanh(); },
    bcTickGv: function (nut) {
      var g = nut.getAttribute('data-gv');
      var i = BC_GV_VANG.indexOf(g);
      if (i >= 0) BC_GV_VANG.splice(i, 1); else BC_GV_VANG.push(g);
      veDieuHanh();
    },
    bcAnToan: function (ma) { BC_ANTOAN = ma; veDieuHanh(); },
    bcGui: function () {
      if (!BC_ANTOAN) { window.notify('Chọn một trong ba nút An toàn trước khi xác nhận.'); return; }
      var ghiChu = ($('#dh-bc-ghichu') || {}).value || '';
      BAO_CAO.CS03 = { gui: true, luc: gioPhut(), anToan: BC_ANTOAN, ghiChu: ghiChu };
      var chuAT = BC_ANTOAN === 'xanh' ? '🟢 An toàn' : BC_ANTOAN === 'vang' ? '🟡 Cần lưu ý' : '🔴 Có sự việc';
      ghiNhatKy('Điểm trường số 3 báo cáo đầu buổi: ' + chuAT +
        (BC_GV_VANG.length ? ' · GV vắng: ' + BC_GV_VANG.join(', ') : ' · GV đủ') +
        (ghiChu ? ' — ' + ghiChu : ''));
      BC_GV_VANG.forEach(function (g) { GV_VANG.push({ ten: g, coSo: 'CS03', lyDo: '(mẫu)', lopCN: null, baoTruoc: false }); });
      TAB = 'homnay'; LOC_CS = 'all';
      veDieuHanh();
      window.notify('Đã xác nhận đầu buổi — dashboard cập nhật ngay (bản mẫu).');
    },

    // ── Điểm danh HS ──
    ddDu: function (lop) {
      var l = LOP_DD.filter(function (x) { return x.ten === lop; })[0];
      if (!l) return;
      l.xong = true; l.vang = [];
      ghiNhatKy('Lớp ' + lop + ' điểm danh: đủ ' + l.siSo + '/' + l.siSo + '.');
      veDieuHanh(); nhac();
    },
    ddMoVang: function (lop) { LOP_MO_VANG = lop; veDieuHanh(); },
    ddTick: function (lop, nut) {
      var l = LOP_DD.filter(function (x) { return x.ten === lop; })[0];
      if (!l) return;
      var ten = nut.getAttribute('data-hs');
      var i = l.vang.map(function (v) { return v.ten; }).indexOf(ten);
      if (i >= 0) l.vang.splice(i, 1); else l.vang.push({ ten: ten, phep: 'phep' });
      veDieuHanh();
    },
    ddLuu: function (lop) {
      var l = LOP_DD.filter(function (x) { return x.ten === lop; })[0];
      if (!l) return;
      l.xong = true; LOP_MO_VANG = null;
      ghiNhatKy('Lớp ' + lop + ' điểm danh: vắng ' + l.vang.length + ' em.');
      veDieuHanh(); nhac();
    },

    // ── Dạy thay ──
    dtChon: function (gv) {
      DAY_THAY.forEach(function (t) { if (!t.gv) t.gv = gv; });
      ghiNhatKy('Phân công dạy thay lớp 3B các tiết còn thiếu: ' + gv + '.');
      veDieuHanh();
      window.notify('Đã phân công ' + gv + ' — giáo viên sẽ thấy ngay khi mở app (bản mẫu).');
    },

    // ── Việc trong tuần ──
    vDoi: function (id) {
      var v = VIEC.filter(function (x) { return x.id === id; })[0];
      if (!v) return;
      v.tt = v.tt === 'chua' ? 'dang' : v.tt === 'dang' ? 'xong' : 'chua';
      if (v.tt === 'xong') ghiNhatKy('Hoàn thành việc: ' + v.noiDung + ' (' + v.nguoi + ').');
      veDieuHanh();
    },
    vGiao: function () {
      var o = $('#dh-viec-noidung');
      var noiDung = (o && o.value || '').trim();
      if (!noiDung) { window.notify('Nhập nội dung việc cần giao.'); return; }
      VIEC.push({
        id: ++VIEC_ID_MOI, noiDung: noiDung,
        nguoi: ($('#dh-viec-nguoi') || {}).value || GV_MAU[1],
        coSo: 'CS01', han: 'Tuần này',
        muc: ($('#dh-viec-muc') || {}).value || 'binh_thuong', tt: 'chua'
      });
      ghiNhatKy('Giao việc: ' + noiDung + '.');
      veDieuHanh(); nhac();
    },

    // ── Báo việc / sự việc ──
    bvLoai: function (nut) { BV_LOAI = nut.getAttribute('data-loai'); veDieuHanh(); },
    bvMuc: function (m) { BV_MUC = m; veDieuHanh(); },
    bvGui: function () {
      var moTa = (($('#dh-bv-mota') || {}).value || '').trim();
      if (!BV_LOAI || !BV_MUC || !moTa) { window.notify('Chọn loại, mức độ và mô tả ngắn trước khi gửi.'); return; }
      SU_VIEC.unshift({ id: SU_VIEC.length + 10, loai: BV_LOAI, muc: BV_MUC, moTa: moTa, nguoi: 'Giáo viên (mẫu)', coSo: 'CS01', luc: gioPhut(), tt: 'moi' });
      ghiNhatKy((BV_MUC === 'do' ? '🔴' : '🟡') + ' Báo việc: ' + BV_LOAI + ' — ' + moTa);
      BV_LOAI = null; BV_MUC = null;
      veDieuHanh();
      window.notify('Đã gửi — Ban giám hiệu thấy ngay trên dashboard (bản mẫu).');
    },
    svTiepNhan: function (id) {
      var s = SU_VIEC.filter(function (x) { return x.id === id; })[0];
      if (s) { s.tt = 'tiep_nhan'; ghiNhatKy('BGH tiếp nhận sự việc: ' + s.loai + ' — ' + s.moTa); }
      veDieuHanh(); nhac();
    },
    svXuLy: function (id) {
      var s = SU_VIEC.filter(function (x) { return x.id === id; })[0];
      if (s) { s.tt = 'da_xu_ly'; ghiNhatKy('🟢 Đã xử lý xong sự việc: ' + s.loai + ' — ' + s.moTa); }
      veDieuHanh(); nhac();
    }
  };

  document.addEventListener('DOMContentLoaded', veDieuHanh);
})();
