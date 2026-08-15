// ============================================================
// dieu-hanh.js — MODULE ĐIỀU HÀNH NHÀ TRƯỜNG
// "Một vài nút chạm — nắm tình hình toàn trường."
//
// HAI CHẾ ĐỘ trong cùng một bộ giao diện:
//   · CHẠY THẬT — sau đăng nhập, đọc cơ sở/GV/lớp/HS thật và GHI thật vào
//     các bảng bao_cao_dau_buoi, gv_vang, diem_danh_lop, hs_vang, cong_viec,
//     su_viec (sql/20-dieu-hanh.sql). Cần đã chạy sql/20 trên Supabase.
//   · BẢN MẪU — chưa đăng nhập / chưa chạy sql/20: dữ liệu mẫu, thao tác lưu
//     tạm trong trang, có băng cảnh báo. KHÔNG bao giờ để số mẫu trông như thật.
//
// Riêng DẠY THAY THEO TIẾT vẫn là bản mẫu ở cả hai chế độ — chờ nạp thời khóa
// biểu thật (thiết kế đã chốt: TKB Excel → SheetJS → bảng tkb, file SQL sau).
//
// ⚠️ KHÔNG ghi tên thật CBGV/HS vào file này — repo công khai. Tên thật chỉ
//    xuất hiện khi trình duyệt đọc từ CSDL sau đăng nhập.
// ============================================================
(function () {
  'use strict';

  function $(s, p) { return (p || document).querySelector(s); }
  function thoat(s) { return window.thoatHTML ? window.thoatHTML(s) : String(s || ''); }

  // ── Ngày giờ (giờ máy người dùng — Việt Nam UTC+7) ──
  function pad2(n) { return String(n).padStart(2, '0'); }
  function homNayISO() {
    var d = new Date();
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  }
  function ngayISOCach(soNgay) {
    var d = new Date(); d.setDate(d.getDate() + soNgay);
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  }
  function gioPhut() {
    var d = new Date();
    return d.getHours() + ':' + pad2(d.getMinutes());
  }
  function gioTu(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    return isNaN(d) ? '' : d.getHours() + ':' + pad2(d.getMinutes());
  }
  function ngayVN(iso) {
    var p = String(iso || '').slice(0, 10).split('-');
    return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : String(iso || '');
  }
  function homNayChu() {
    var thu = ['Chủ nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
    var d = new Date();
    return thu[d.getDay()] + ', ngày ' + d.getDate() + '/' + (d.getMonth() + 1) + '/' + d.getFullYear();
  }
  function buoiHienTai() { return new Date().getHours() < 12 ? 'sang' : 'chieu'; }
  // Công tắc Sáng/Chiều của bản thiết kế: người dùng chọn buổi để XEM và để
  // BÁO CÁO. null = theo đồng hồ. Mọi màn dùng buoiXem(), không dùng thẳng
  // buoiHienTai() nữa — nếu không thì bấm 'Chiều' xong màn vẫn hiện buổi sáng.
  var BUOI_XEM = null;
  function buoiXem() { return BUOI_XEM || buoiHienTai(); }
  function tenBuoi(b) { return b === 'sang' ? 'buổi sáng' : 'buổi chiều'; }

  // ── Đề xuất: danh mục loại + tên hiển thị ──
  var LOAI_DX_DS = [
    { ma: 'nghi_phep',  ten: 'Nghỉ phép' },
    { ma: 'nghi_om',    ten: 'Nghỉ ốm' },
    { ma: 'cong_tac',   ten: 'Đi công tác' },
    { ma: 'viec_rieng', ten: 'Việc riêng' },
    { ma: 'mua_sam',    ten: 'Mua sắm / sửa chữa' },
    { ma: 'khac',       ten: 'Khác' }
  ];
  var LOAI_DX_NGHI = ['nghi_phep', 'nghi_om', 'cong_tac', 'viec_rieng'];
  function tenLoaiDX(ma) {
    var l = LOAI_DX_DS.filter(function (x) { return x.ma === ma; })[0];
    return l ? l.ten : ma;
  }

  // Mốc timestamptz từ máy chủ là UTC — lấy NGÀY phải qua new Date() để về
  // giờ máy (VN). Cắt chuỗi .slice(0,10) là sai suốt khung 0h–7h sáng.
  function ngayCuaMoc(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    return isNaN(d) ? '' : d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  }
  // So email không phân biệt hoa thường — nhập tay lệch một chữ hoa là
  // "Việc của tôi" trống trơn không lời giải thích
  function emailBang(a, b) {
    return !!a && !!b && String(a).toLowerCase() === String(b).toLowerCase();
  }
  // Nhúng giá trị vào chuỗi onclick='DH.x("…")' — phải khoá thêm nháy đơn
  // và gạch chéo, thoat() thường chỉ lo phần HTML
  function nhay(s) {
    return thoat(String(s == null ? '' : s).replace(/\\/g, '\\\\').replace(/'/g, "\\'"));
  }
  var TEN_THU = { 2: 'Thứ Hai', 3: 'Thứ Ba', 4: 'Thứ Tư', 5: 'Thứ Năm', 6: 'Thứ Sáu', 7: 'Thứ Bảy', 8: 'Chủ nhật' };

  // ── Đọc bảng lớn theo trang 1000 dòng (mẫu chung của dự án, xem hocsinh.js) ──
  function taiHet(bang, cot, loc) {
    var ket = [], tu = 0, buoc = 1000;
    function trang() {
      var q = window.MAY_CHU.from(bang).select(cot).order('id').range(tu, tu + buoc - 1);
      (loc || []).forEach(function (l) { q = q.eq(l[0], l[1]); });
      return q.then(function (r) {
        if (r.error) throw r.error;
        var d = r.data || [];
        ket = ket.concat(d);
        if (d.length < buoc) return ket;
        tu += buoc;
        return trang();
      });
    }
    return trang();
  }

  // ════════════════════════════════════════════════════════════
  // KHO DỮ LIỆU DÙNG CHUNG cho cả hai chế độ — mọi hàm vẽ chỉ đọc DL,
  // không biết dữ liệu đến từ CSDL hay bản mẫu.
  // ════════════════════════════════════════════════════════════
  var THAT = false;      // true = đã nạp dữ liệu thật
  var LOI_SQL = '';      // khác rỗng = đã đăng nhập nhưng thiếu bảng sql/20
  var NAM = '';          // năm học đang điều hành
  var DL = null;

  function laQT() {
    var nd = window.NGUOI_DUNG;
    return !window.DA_NOI || !!(nd && (nd.vai_tro === 'admin' || nd.vai_tro === 'ban_giam_hieu'));
  }
  function emailToi() { return (window.NGUOI_DUNG || {}).email || ''; }
  function idToi() { return (window.NGUOI_DUNG || {}).id || null; }
  function tenToi() { return (window.NGUOI_DUNG || {}).ho_ten || 'Người dùng'; }
  // Các cơ sở mà người này được báo cáo đầu buổi
  function coSoDuocBao() {
    if (laQT()) return DL.coSo.map(function (c) { return c.ma; });
    return DL.coSo.filter(function (c) { return emailBang(c.phuTrach, emailToi()); })
      .map(function (c) { return c.ma; });
  }
  function tenCoSo(ma) {
    var c = DL.coSo.filter(function (x) { return x.ma === ma; })[0];
    return c ? c.ten : (ma || 'Toàn trường');
  }

  // ════════════════════════════════════════════════════════════
  // MÀU ĐỊNH DANH TỪNG ĐIỂM TRƯỜNG (thầy Chung yêu cầu 15/8/2026)
  // ════════════════════════════════════════════════════════════
  // Ba thẻ điểm trường trước đây trắng y hệt nhau, phải ĐỌC chữ mới biết thẻ
  // nào là điểm nào — nhất là lúc cả ba cùng một trạng thái.
  //
  // Nhưng màu trạng thái (xanh/vàng/đỏ) đã chiếm viền trái rồi, nên hai chiều
  // thông tin phải nằm HAI CHỖ khác nhau, không được lẫn:
  //   · viền TRÊN + nền đầu thẻ  → màu ĐỊNH DANH điểm trường (cố định)
  //   · viền TRÁI + pill + số     → màu TRẠNG THÁI hôm nay (đổi hằng ngày)
  //
  // Gán theo THỨ TỰ trong danh sách cơ sở, KHÔNG viết cứng theo tên điểm —
  // trường còn thêm điểm nữa thì màu tự có, không phải sửa mã. Sáu màu xoay
  // vòng, đều là tông trầm không chói và KHÔNG trùng ba màu trạng thái.
  function mauCoSo(ma) {
    if (!ma) return '';
    var i = DL.coSo.map(function (c) { return c.ma; }).indexOf(ma);
    return i < 0 ? '' : 'cs' + (i % 6 + 1);
  }
  function coSoCuaToi() {
    var g = DL.gvDs.filter(function (x) { return emailBang(x.email, emailToi()); })[0];
    return g ? g.coSo : null;
  }
  // Thông báo này có dành cho TÔI không (phạm vi điểm trường)? BGH thấy hết.
  // Lưu ý: phạm vi chỉ để LỌC HIỂN THỊ — RLS vẫn cho mọi người đọc (minh bạch).
  function tbChoToi(x) {
    if (laQT()) return true;
    if (x.phamVi !== 'co_so') return true;
    var cs = coSoCuaToi();
    return !cs || x.coSo === cs;
  }
  // Cần TÔI bấm xác nhận: đúng phạm vi, chưa xác nhận, và không phải chính
  // mình là người gửi (BGH không tự nhắc mình nhận thông báo mình soạn)
  function tbCanToiXN(x) {
    return !!x.canXacNhan && !x.toiDaXacNhan && tbChoToi(x) &&
      !(x.guiId && x.guiId === idToi());
  }

  // ── Bản mẫu (khi chưa nối) — tên người, tên lớp đều là GIẢ ĐỊNH ──
  function duLieuMau() {
    return {
      coSo: [
        { ma: 'CS01', ten: 'Điểm chính Diễn Liên', loai: 'chinh', phuTrach: '', gvTong: 20 },
        { ma: 'CS02', ten: 'Điểm trường Diễn Đồng', loai: 'diem_truong', phuTrach: '', gvTong: 10 },
        { ma: 'CS03', ten: 'Điểm trường Diễn Thái', loai: 'diem_truong', phuTrach: '', gvTong: 7 }
      ],
      gvDs: ['Cô Nguyễn Thị A.', 'Cô Lê Thị C.', 'Thầy Phạm Văn D.', 'Cô Hoàng Thị E.',
        'Cô Vũ Thị G.', 'Thầy Đỗ Văn H.', 'Cô Bùi Thị K.'].map(function (t, i) {
          return { ten: t, email: 'mau' + i + '@mau', chucVu: 'Giáo viên', coSo: 'CS01' };
        }),
      lop: {
        '1A': { khoi: 1, coSo: 'CS01', siSo: 35 }, '2A': { khoi: 2, coSo: 'CS01', siSo: 33 },
        '3B': { khoi: 3, coSo: 'CS01', siSo: 32 }, '4A': { khoi: 4, coSo: 'CS01', siSo: 34 },
        '5A': { khoi: 5, coSo: 'CS01', siSo: 35 }
      },
      hsTong: 863,
      baoCao: {
        CS01: { sang: { anToan: 'xanh', luc: '7:05', ghiChu: '', chieuKhongHoc: false,
          dien: 'on', nuoc: 'on', csvc: 'on' } },
        CS02: { sang: { anToan: 'vang', luc: '7:12', ghiChu: 'Đường ống nước khu vệ sinh bị rò, đã khoá van tạm.',
          chieuKhongHoc: false, dien: 'on', nuoc: 'loi', csvc: 'on' } },
        CS03: {}
      },
      gvVang: [
        { ten: 'Cô Nguyễn Thị A.', coSo: 'CS01', lyDo: 'Nghỉ ốm', buoi: 'ca_ngay' },
        { ten: 'Thầy Trần Văn B.', coSo: 'CS02', lyDo: 'Công tác', buoi: 'ca_ngay' }
      ],
      // Điểm danh học sinh đã gỡ khỏi giao diện (VNEDU lo phần đó) — dọn luôn
      // dữ liệu mẫu, kẻo bản xem thử công khai vẫn nhắc "⚠ Nghỉ nhiều buổi:
      // Lê Văn Cường (mẫu)" cho một chức năng không còn thẻ nào để mở.
      ddLop: { sang: {}, chieu: {} },
      hsVang: [],
      nghiDai: [],
      viec: [
        { id: 1, noiDung: 'Hoàn thiện hồ sơ phổ cập gửi UBND xã', nguoiTen: 'Cô Lê Thị C.', nguoiEmail: '', coSo: 'CS01', han: homNayISO(), muc: 'quan_trong', tt: 'xong' },
        { id: 2, noiDung: 'Kiểm kê thiết bị dạy học đầu năm', nguoiTen: 'Thầy Phạm Văn D.', nguoiEmail: '', coSo: 'CS01', han: homNayISO(), muc: 'binh_thuong', tt: 'xong' },
        { id: 3, noiDung: 'Tổng hợp đăng ký bán trú tháng 9', nguoiTen: 'Cô Bùi Thị K.', nguoiEmail: '', coSo: 'CS01', han: ngayISOCach(3), muc: 'quan_trong', tt: 'dang' },
        { id: 4, noiDung: 'Sửa khoá cổng phụ khu B', nguoiTen: 'Thầy Phạm Văn D.', nguoiEmail: '', coSo: 'CS02', han: ngayISOCach(-1), muc: 'khan', tt: 'chua' }
      ],
      suViec: [
        { id: 1, loai: 'Cơ sở vật chất', muc: 'do', moTa: 'Cành cây phượng sân sau bị gãy treo lơ lửng, cần xử lý trước giờ ra chơi.', nguoiTen: 'Thầy Đỗ Văn H.', coSo: 'CS01', luc: '6:58', tt: 'moi' },
        { id: 2, loai: 'Điện / Nước', muc: 'vang', moTa: 'Đường ống nước khu vệ sinh rò rỉ, đã khoá van tạm.', nguoiTen: 'Cô Hoàng Thị E.', coSo: 'CS02', luc: '7:12', tt: 'tiep_nhan' }
      ],
      nhatKy: [
        { luc: '7:12', chu: 'Điểm trường số 2 báo cáo đầu buổi: 🟡 Cần lưu ý — rò nước khu vệ sinh.' },
        { luc: '7:05', chu: 'Cơ sở chính báo cáo đầu buổi: 🟢 An toàn.' },
        { luc: '6:58', chu: '🔴 Báo việc: cành cây gãy sân sau (Cơ sở chính).' }
      ],
      deXuat: [
        { id: 1, loai: 'nghi_phep', noiDung: 'Việc gia đình', tuNgay: ngayISOCach(1), denNgay: '',
          buoi: 'sang', coSo: 'CS01', tt: 'cho_duyet', ten: 'Cô Lê Thị C.', email: 'mau1@mau',
          guiId: null, luc: '6:45', ngay: homNayISO(), nguoiDuyet: '', ghiChuDuyet: '' },
        { id: 2, loai: 'mua_sam', noiDung: 'Đề nghị mua 02 quạt treo tường cho lớp 3B', tuNgay: '',
          denNgay: '', buoi: 'ca_ngay', coSo: 'CS01', tt: 'dong_y', ten: 'Thầy Phạm Văn D.',
          email: 'mau2@mau', guiId: null, luc: '16:20', ngay: ngayISOCach(-1),
          nguoiDuyet: 'Hiệu trưởng (mẫu)', ghiChuDuyet: '' }
      ],
      dxCoBang: true,
      thongBao: [
        { id: 1, tieuDe: 'Họp hội đồng sư phạm 14:00 thứ Sáu', noiDung: 'Tại hội trường cơ sở chính. Thành phần: toàn thể CBGV-NV.',
          canXacNhan: true, phamVi: 'toan_truong', coSo: null, nguoiGui: 'Hiệu trưởng (mẫu)', guiId: null,
          luc: '7:00', ngay: homNayISO(),
          daXNEmail: { 'mau0@mau': 1, 'mau2@mau': 1, 'mau3@mau': 1, 'mau4@mau': 1, 'mau5@mau': 1 },
          soXacNhan: 5, toiDaXacNhan: false, toiDaXem: true }
      ],
      tbCoBang: true,
      viecMau: [
        { id: 1, noiDung: 'Báo cáo chuyên cần tháng', nguoiTen: 'Cô Bùi Thị K.', nguoiEmail: '',
          coSo: null, muc: 'binh_thuong', chuKy: 'thang', thu: null, ngay: 28, thang: null,
          sinhTruoc: 3, dangBat: true }
      ],
      vmCoBang: true,
      ktDs: [
        { id: 1, ngay: ngayISOCach(-1), coSo: 'CS02',
          muc: { day_hoc: 'dat', ne_nep: 'dat', ve_sinh: 'dat', an_toan: 'dat', csvc: 'can_xu_ly' },
          ghiChu: 'Vòi nước khu vệ sinh HS bị rò (mẫu)', ten: 'Phó Hiệu trưởng (mẫu)',
          luc: '9:30', coCanhBao: true }
      ],
      ktCoBang: true
    };
  }
  DL = duLieuMau();

  // Dạy thay — BẢN MẪU ở cả hai chế độ (chờ thời khóa biểu thật)
  var DAY_THAY = [
    { tiet: 1, mon: 'Toán', gv: 'Cô Lê Thị C.' },
    { tiet: 2, mon: 'Tiếng Việt', gv: 'Cô Lê Thị C.' },
    { tiet: 3, mon: 'Tiếng Việt', gv: null },
    { tiet: 4, mon: 'Đạo đức', gv: null }
  ];
  var GOI_Y_RANH = [
    { ten: 'Cô Hoàng Thị E.', nhan: 'Rảnh cả buổi · cùng khối 3 · tháng này dạy thay 2 tiết' },
    { ten: 'Thầy Đỗ Văn H.', nhan: 'Rảnh tiết 3–4 · GV Thể chất · tháng này dạy thay 4 tiết' },
    { ten: 'Cô Bùi Thị K.', nhan: 'Rảnh tiết 3 · GV Âm nhạc · tháng này dạy thay 6 tiết' }
  ];

  // ════════════════════════════════════════════════════════════
  // NẠP DỮ LIỆU THẬT (sau đăng nhập)
  // ════════════════════════════════════════════════════════════
  var DS_HS_LOP = {};   // cache tên học sinh từng lớp: {'1A': [{ma, ten}]}
  var SI_SO = {};       // sĩ số đếm thật từng lớp

  function loiThieuBang(e) {
    return e && (e.code === '42P01' || e.code === 'PGRST205' ||
      /relation .* does not exist|Could not find the table/i.test(e.message || ''));
  }

  var DANG_NAP = false;   // chặn nạp ĐÔI khi cả sự kiện lẫn nhánh khởi động cùng chạy
  function napThat() {
    var may = window.MAY_CHU;
    if (!may || !window.NGUOI_DUNG) return Promise.resolve();
    if (DANG_NAP || THAT) return Promise.resolve();
    DANG_NAP = true;

    // Bảng của sql/20 hỏi TRƯỚC — thiếu là biết ngay, khỏi nửa thật nửa mẫu
    return may.from('bao_cao_dau_buoi').select('id').limit(1)
      .then(function (r) {
        if (r.error) throw r.error;
        // Sinh công việc định kỳ đến hạn (sql/25) — idempotent, ai mở app
        // trước thì việc sinh ra; CHƯA cài sql/25 thì lệnh lỗi êm, bỏ qua
        return may.rpc('sinh_cong_viec_dinh_ky');
      })
      .then(function () {
        return Promise.all([
          may.from('co_so').select('ma, ten, loai, phu_trach_email, so_tt')
            .eq('hoat_dong', true).order('so_tt'),
          may.from('moi_tai_khoan').select('ho_ten, email, chuc_vu, co_so_ma')
            .eq('la_ky_thuat', false).order('ho_ten'),
          may.from('lop_hoc').select('nam_hoc, lop, khoi, co_so_ma')
        ]);
      })
      .then(function (kq) {
        kq.forEach(function (r) { if (r.error) throw r.error; });
        var coSo = kq[0].data || [], gv = kq[1].data || [], lopHoc = kq[2].data || [];

        // Năm học: ưu tiên năm hiện hành, không có lớp thì lùi về năm CÓ dữ liệu
        // (bài học hocsinh.js: hệ 2026-2027 mà dữ liệu 2025-2026 → màn trống)
        var namCo = {};
        lopHoc.forEach(function (l) { namCo[l.nam_hoc] = 1; });
        var hienHanh = window.CAU_HINH.NAM_HOC;
        NAM = namCo[hienHanh] ? hienHanh : (Object.keys(namCo).sort().reverse()[0] || hienHanh);

        var csChinh = (coSo.filter(function (c) { return c.loai === 'chinh'; })[0] || coSo[0] || {}).ma;
        var moi = {
          coSo: coSo.map(function (c) {
            return { ma: c.ma, ten: c.ten, loai: c.loai, phuTrach: c.phu_trach_email || '', gvTong: 0 };
          }),
          gvDs: gv.map(function (g) {
            // Quy ước sql/10: người chưa gắn cơ sở quy về CƠ SỞ CHÍNH
            return { ten: g.ho_ten || g.email, email: g.email, chucVu: g.chuc_vu || '', coSo: g.co_so_ma || csChinh };
          }),
          lop: {}, hsTong: 0, baoCao: {}, gvVang: [],
          ddLop: { sang: {}, chieu: {} }, hsVang: [], nghiDai: [],
          viec: [], suViec: [], nhatKy: [],
          deXuat: [], dxCoBang: false, thongBao: [], tbCoBang: false,
          viecMau: [], vmCoBang: false, ktDs: [], ktCoBang: false
        };
        moi.gvDs.forEach(function (g) {
          var c = moi.coSo.filter(function (x) { return x.ma === g.coSo; })[0];
          if (c) c.gvTong++;
        });
        lopHoc.forEach(function (l) {
          if (l.nam_hoc !== NAM) return;
          moi.lop[l.lop] = { khoi: l.khoi, coSo: l.co_so_ma || csChinh, siSo: 0 };
        });

        // Sĩ số đếm THẬT từ hoc_sinh_lop (không lấy số cấu hình)
        return taiHet('hoc_sinh_lop', 'lop, trang_thai', [['nam_hoc', NAM]])
          .then(function (ds) {
            ds.forEach(function (d) {
              if (d.trang_thai && d.trang_thai !== 'dang_hoc') return;
              if (moi.lop[d.lop]) { moi.lop[d.lop].siSo++; moi.hsTong++; }
            });
            SI_SO = {};
            Object.keys(moi.lop).forEach(function (l) { SI_SO[l] = moi.lop[l].siSo; });
            return moi;
          });
      })
      .then(function (moi) { return napHomNay(moi); })
      .then(function (moi) {
        DL = moi; THAT = true; LOI_SQL = ''; DANG_NAP = false;
        // Vứt bảng công đã dựng ở BẢN MẪU. Trang mở khóa trước khi nạp xong,
        // ai bấm vào thẻ trong lúc chờ là bảng công dựng bằng tên giả — không
        // xóa thì nó nằm nguyên dưới băng xanh "đang chạy dữ liệu thật".
        CONG_THU = ''; CONG_KQ = null;
        // Module con cũng phải vứt bản mẫu của nó — cùng một cái bẫy
        // Dọn nốt trạng thái XEM của bản mẫu: bản mẫu có 3 cơ sở, trường thật
        // có thể chỉ 1 — giữ LOC_CS='CS02' là màn Tổng quan trắng không lối ra.
        LOC_CS = 'all'; BUOI_XEM = null; BC_CS = ''; KT_CS = ''; CONG_CHOT = [];
        BC_CSVC = { dien: '', nuoc: '', csvc: '' };
        if (window.LT && window.LT.datLai) window.LT.datLai();
        if (window.DG && window.DG.datLai) window.DG.datLai();
        veDieuHanh();
      })
      .catch(function (e) {
        if (loiThieuBang(e)) {
          LOI_SQL = 'Chưa cài phần cơ sở dữ liệu của module (tệp sql/20-dieu-hanh.sql). ' +
            'Đang hiển thị BẢN MẪU — nhờ quản trị chạy sql/20 trên Supabase rồi tải lại trang.';
        } else {
          LOI_SQL = 'Không đọc được dữ liệu điều hành: ' + (e.message || e) + ' — đang hiển thị bản mẫu.';
        }
        THAT = false;
        DANG_NAP = false;   // lỗi thì mở lại cửa cho lần nạp sau (F5 / đăng nhập lại)
        veDieuHanh();
      });
  }

  // Dữ liệu "hôm nay" — gọi lại sau MỖI thao tác ghi để màn luôn đúng CSDL
  function napHomNay(moi) {
    var may = window.MAY_CHU;
    var t = homNayISO(), tuan = ngayISOCach(-6);
    return Promise.all([
      may.from('bao_cao_dau_buoi')
        // select('*') chứ KHÔNG liệt kê cột: đẩy web lên trước khi chạy sql/34
        // thì ba cột dien/nuoc/csvc chưa tồn tại, PostgREST trả 42703 mà
        // loiThieuBang() không nhận ra → cả module rơi về BẢN MẪU, hiệu
        // trưởng mở app thấy tên người giả định. Lấy hết cột là miễn nhiễm.
        .select('*').eq('ngay', t),
      may.from('gv_vang')
        // id + ghi_chu để màn Điểm danh xoá được đúng dòng ghi nhầm
        .select('id, ho_ten, email, co_so_ma, ly_do, buoi, ngay, den_ngay, bao_muon, ghi_chu')
        .lte('ngay', t)
        .or('and(den_ngay.is.null,ngay.eq.' + t + '),den_ngay.gte.' + t),
      may.from('diem_danh_lop').select('lop, buoi, si_so, so_vang, ghi_luc').eq('ngay', t),
      may.from('hs_vang')
        .select('ngay, buoi, lop, phep, hoc_sinh_ma, hoc_sinh:hoc_sinh_ma(ho_ten)')
        .gte('ngay', tuan),
      may.from('cong_viec')
        .select('id, noi_dung, nguoi_email, nguoi_ten, co_so_ma, han, muc, trang_thai, tien_do, cap_nhat_luc')
        .order('han', { ascending: true }).limit(300),
      may.from('su_viec')
        .select('id, loai, muc, mo_ta, co_so_ma, trang_thai, ket_qua, nguoi_bao_ten, bao_luc, tiep_nhan_luc, xu_ly_luc')
        .order('bao_luc', { ascending: false }).limit(100),
      // ── 5 nguồn của sql/25 (đợt 2) — TÙY CHỌN, thiếu bảng thì phần đó ẩn ──
      may.from('de_xuat').select('*').order('gui_luc', { ascending: false }).limit(200),
      may.from('thong_bao').select('*').order('gui_luc', { ascending: false }).limit(50),
      may.from('thong_bao_nhan').select('thong_bao_id, nguoi_id, email, xem_luc, xac_nhan_luc')
        .order('id', { ascending: false }).limit(5000),
      may.from('kiem_tra_diem_truong').select('*').order('kt_luc', { ascending: false }).limit(30),
      may.from('cong_viec_mau').select('*').order('id'),
      // đơn CHỜ DUYỆT lấy riêng không giới hạn — kẻo đơn cũ tụt khỏi trang 200 dòng
      may.from('de_xuat').select('*').eq('trang_thai', 'cho_duyet').order('gui_luc'),
      // mốc giờ báo cáo đầu buổi (sql/34) — mỗi trường một giờ vào lớp
      may.from('cau_hinh').select('khoa, gia_tri').in('khoa', ['gio_bao_cao_sang', 'gio_bao_cao_chieu'])
    ]).then(function (kq) {
      kq.slice(0, 6).forEach(function (r) { if (r.error) throw r.error; });
      // Nguồn tùy chọn: thiếu bảng (chưa chạy sql/25) → trả null; lỗi khác vẫn ném
      function tuyChon(r) {
        if (!r.error) return r.data || [];
        if (loiThieuBang(r.error)) return null;
        throw r.error;
      }
      var dDX = tuyChon(kq[6]), dTB = tuyChon(kq[7]), dTBN = tuyChon(kq[8]),
          dKT = tuyChon(kq[9]), dVM = tuyChon(kq[10]), dDXCho = tuyChon(kq[11]);
      // ghép đơn chờ duyệt (đầy đủ) vào danh sách gần đây, khử trùng theo id
      if (dDX !== null && dDXCho !== null) {
        var dxDaCo = {};
        dDX.forEach(function (d) { dxDaCo[d.id] = 1; });
        dDXCho.forEach(function (d) { if (!dxDaCo[d.id]) dDX.push(d); });
      }
      moi.baoCao = {}; moi.gvVang = []; moi.ddLop = { sang: {}, chieu: {} };
      moi.hsVang = []; moi.nghiDai = []; moi.viec = []; moi.suViec = []; moi.nhatKy = [];
      moi.deXuat = []; moi.thongBao = []; moi.viecMau = []; moi.ktDs = [];
      moi.dxCoBang = dDX !== null;
      moi.tbCoBang = dTB !== null && dTBN !== null;
      moi.vmCoBang = dVM !== null;
      moi.ktCoBang = dKT !== null;

      (kq[0].data || []).forEach(function (b) {
        if (!moi.baoCao[b.co_so_ma]) moi.baoCao[b.co_so_ma] = {};
        moi.baoCao[b.co_so_ma][b.buoi] = {
          anToan: b.an_toan, ghiChu: b.ghi_chu || '',
          dien: b.dien || '', nuoc: b.nuoc || '', csvc: b.csvc || '',
          chieuKhongHoc: !!b.chieu_khong_hoc, luc: gioTu(b.gui_luc)
        };
        moi.nhatKy.push({ khi: b.gui_luc, chu: tenCoSoTho(moi, b.co_so_ma) + ' báo cáo ' + tenBuoi(b.buoi) + ': ' +
          (b.an_toan === 'xanh' ? '🟢 An toàn' : b.an_toan === 'vang' ? '🟡 Cần lưu ý' : '🔴 Có sự việc') +
          (b.ghi_chu ? ' — ' + b.ghi_chu : '') });
      });
      (kq[1].data || []).forEach(function (g) {
        moi.gvVang.push({ id: g.id, ten: g.ho_ten, email: g.email, coSo: g.co_so_ma, lyDo: g.ly_do,
          buoi: g.buoi, ngay: g.ngay, denNgay: g.den_ngay, baoMuon: g.bao_muon, nguon: g.ghi_chu });
      });
      // Điểm danh HS đã gỡ khỏi giao diện — vẫn ĐỌC bảng để dữ liệu cũ không
      // mất và bật lại được, nhưng KHÔNG đẩy vào nhật ký nữa: nhắc một việc
      // không còn thẻ nào để mở chỉ làm người dùng đi tìm vô ích.
      (kq[2].data || []).forEach(function (d) {
        moi.ddLop[d.buoi][d.lop] = { siSo: d.si_so, soVang: d.so_vang, luc: gioTu(d.ghi_luc) };
      });
      var t0 = homNayISO(), demNghi = {};
      (kq[3].data || []).forEach(function (v) {
        var ten = (v.hoc_sinh && v.hoc_sinh.ho_ten) || v.hoc_sinh_ma;
        if (v.ngay === t0) {
          moi.hsVang.push({ lop: v.lop, buoi: v.buoi, ma: v.hoc_sinh_ma, ten: ten, phep: v.phep });
        }
        var k = v.hoc_sinh_ma;
        if (!demNghi[k]) demNghi[k] = { ten: ten, lop: v.lop, ngay: {} };
        // đơn vị chuyên cần tiểu học là BUỔI (sql/20) — đếm ngày+buổi,
        // nghỉ cả sáng lẫn chiều một ngày phải tính 2 buổi
        demNghi[k].ngay[v.ngay + '|' + v.buoi] = 1;
      });
      Object.keys(demNghi).forEach(function (k) {
        var so = Object.keys(demNghi[k].ngay).length;
        if (so >= 3) moi.nghiDai.push({ ten: demNghi[k].ten, lop: demNghi[k].lop, soBuoi: so });
      });
      (kq[4].data || []).forEach(function (v) {
        moi.viec.push({ id: v.id, noiDung: v.noi_dung, nguoiTen: v.nguoi_ten, nguoiEmail: v.nguoi_email || '',
          coSo: v.co_so_ma, han: v.han, muc: v.muc, tt: v.trang_thai, tienDo: v.tien_do || '' });
      });
      (kq[5].data || []).forEach(function (s) {
        moi.suViec.push({ id: s.id, loai: s.loai, muc: s.muc, moTa: s.mo_ta, coSo: s.co_so_ma,
          tt: s.trang_thai, ketQua: s.ket_qua || '', nguoiTen: s.nguoi_bao_ten, luc: gioTu(s.bao_luc), khi: s.bao_luc });
        // Nhật ký là "HÔM NAY" — sự việc cũ vẫn nằm ở danh sách theo dõi,
        // nhưng không được lẫn vào nhật ký trong ngày
        if (ngayCuaMoc(s.bao_luc) === t0) {
          moi.nhatKy.push({ khi: s.bao_luc, chu: (s.muc === 'do' ? '🔴' : '🟡') + ' Báo việc: ' + s.loai + ' — ' + s.mo_ta +
            ' (' + s.nguoi_bao_ten + ')' });
        }
        if (s.xu_ly_luc && ngayCuaMoc(s.xu_ly_luc) === t0) {
          moi.nhatKy.push({ khi: s.xu_ly_luc, chu: '🟢 Đã xử lý sự việc: ' + s.loai + (s.ket_qua ? ' — ' + s.ket_qua : '') });
        }
      });
      // ── Đề xuất ──
      (dDX || []).forEach(function (d) {
        moi.deXuat.push({ id: d.id, loai: d.loai, noiDung: d.noi_dung, tuNgay: d.tu_ngay,
          denNgay: d.den_ngay, buoi: d.buoi, coSo: d.co_so_ma, tt: d.trang_thai,
          ten: d.nguoi_gui_ten, email: d.nguoi_gui_email || '', guiId: d.nguoi_gui_id || null,
          luc: gioTu(d.gui_luc),
          ngay: ngayCuaMoc(d.gui_luc), nguoiDuyet: d.nguoi_duyet_ten || '',
          ghiChuDuyet: d.ghi_chu_duyet || '' });
        if (ngayCuaMoc(d.gui_luc) === t0) {
          moi.nhatKy.push({ khi: d.gui_luc, chu: '🔄 ' + d.nguoi_gui_ten + ' gửi đề xuất: ' + tenLoaiDX(d.loai) + ' — ' + d.noi_dung });
        }
        if (d.duyet_luc && ngayCuaMoc(d.duyet_luc) === t0) {
          moi.nhatKy.push({ khi: d.duyet_luc, chu: (d.trang_thai === 'dong_y' ? '✅ ' : '✖ ') +
            (d.nguoi_duyet_ten || 'BGH') + (d.trang_thai === 'dong_y' ? ' duyệt' : ' từ chối') +
            ' đề xuất ' + tenLoaiDX(d.loai) + ' của ' + d.nguoi_gui_ten });
        }
      });
      // ── Thông báo + xác nhận đã nhận ──
      var nhanTheoTb = {};
      (dTBN || []).forEach(function (n) {
        (nhanTheoTb[n.thong_bao_id] = nhanTheoTb[n.thong_bao_id] || []).push(n);
      });
      (dTB || []).forEach(function (b2) {
        var ds = nhanTheoTb[b2.id] || [];
        var toi = ds.filter(function (n) { return n.nguoi_id === idToi(); })[0];
        var daXN = {};
        ds.forEach(function (n) { if (n.xac_nhan_luc && n.email) daXN[n.email.toLowerCase()] = 1; });
        moi.thongBao.push({ id: b2.id, tieuDe: b2.tieu_de, noiDung: b2.noi_dung || '',
          canXacNhan: !!b2.can_xac_nhan, phamVi: b2.pham_vi, coSo: b2.co_so_ma,
          nguoiGui: b2.nguoi_gui_ten, guiId: b2.nguoi_gui_id || null,
          luc: gioTu(b2.gui_luc), ngay: ngayCuaMoc(b2.gui_luc),
          daXNEmail: daXN, soXacNhan: Object.keys(daXN).length,
          toiDaXacNhan: !!(toi && toi.xac_nhan_luc), toiDaXem: !!(toi && toi.xem_luc) });
        if (ngayCuaMoc(b2.gui_luc) === t0) {
          moi.nhatKy.push({ khi: b2.gui_luc, chu: '📢 ' + b2.nguoi_gui_ten + ' gửi thông báo: ' + b2.tieu_de });
        }
      });
      // ── Phiếu kiểm tra điểm trường ──
      (dKT || []).forEach(function (k2) {
        var mucKT = { day_hoc: k2.day_hoc, ne_nep: k2.ne_nep, ve_sinh: k2.ve_sinh,
          an_toan: k2.an_toan, csvc: k2.csvc };
        var coCanhBao = Object.keys(mucKT).some(function (m2) { return mucKT[m2] === 'can_xu_ly'; });
        moi.ktDs.push({ id: k2.id, ngay: k2.ngay, coSo: k2.co_so_ma, muc: mucKT,
          ghiChu: k2.ghi_chu || '', ten: k2.nguoi_kt_ten, luc: gioTu(k2.kt_luc), coCanhBao: coCanhBao });
        if (ngayCuaMoc(k2.kt_luc) === t0) {
          moi.nhatKy.push({ khi: k2.kt_luc, chu: '🔍 ' + k2.nguoi_kt_ten + ' kiểm tra ' +
            tenCoSoTho(moi, k2.co_so_ma) + (coCanhBao ? ' — có mục ⚠ cần xử lý' : ' — các mặt đều đạt') });
        }
      });
      // ── Mẫu việc lặp định kỳ ──
      (dVM || []).forEach(function (m2) {
        moi.viecMau.push({ id: m2.id, noiDung: m2.noi_dung, nguoiTen: m2.nguoi_ten,
          nguoiEmail: m2.nguoi_email || '', coSo: m2.co_so_ma, muc: m2.muc, chuKy: m2.chu_ky,
          thu: m2.thu, ngay: m2.ngay, thang: m2.thang, sinhTruoc: m2.sinh_truoc_ngay,
          dangBat: m2.dang_bat });
      });
      if (kq[12] && !kq[12].error) (kq[12].data || []).forEach(function (c) {
        if (c.khoa === 'gio_bao_cao_sang' && c.gia_tri) GIO_BC.sang = c.gia_tri;
        if (c.khoa === 'gio_bao_cao_chieu' && c.gia_tri) GIO_BC.chieu = c.gia_tri;
      });
      moi.nhatKy.sort(function (a, b) { return String(b.khi).localeCompare(String(a.khi)); });
      moi.nhatKy = moi.nhatKy.map(function (n) { return { luc: gioTu(n.khi), chu: n.chu }; });
      return moi;
    });
  }
  function tenCoSoTho(moi, ma) {
    var c = (moi.coSo || []).filter(function (x) { return x.ma === ma; })[0];
    return c ? c.ten : ma;
  }

  // ── Nạp tên học sinh MỘT lớp khi cần (chọn em vắng) — mỗi lần ~35 dòng ──
  function napHsLop(lop) {
    if (!THAT) {
      return Promise.resolve(['Nguyễn Văn An (mẫu)', 'Trần Thị Bích (mẫu)', 'Lê Văn Cường (mẫu)',
        'Phạm Thị Dung (mẫu)', 'Hoàng Văn Em (mẫu)', 'Vũ Thị Phương (mẫu)']
        .map(function (t, i) { return { ma: 'M' + i, ten: t }; }));
    }
    if (DS_HS_LOP[lop]) return Promise.resolve(DS_HS_LOP[lop]);
    return window.MAY_CHU.from('hoc_sinh_lop')
      .select('hoc_sinh_ma, trang_thai, hoc_sinh:hoc_sinh_ma(ho_ten)')
      .eq('nam_hoc', NAM).eq('lop', lop)
      .then(function (r) {
        if (r.error) throw r.error;
        var ds = (r.data || [])
          .filter(function (d) { return !d.trang_thai || d.trang_thai === 'dang_hoc'; })
          .map(function (d) { return { ma: d.hoc_sinh_ma, ten: (d.hoc_sinh && d.hoc_sinh.ho_ten) || d.hoc_sinh_ma }; });
        // Sắp theo TÊN (chữ cuối) như danh sách lớp của thầy cô
        ds.sort(function (a, b) {
          var ta = a.ten.trim().split(/\s+/), tb = b.ten.trim().split(/\s+/);
          return ta[ta.length - 1].localeCompare(tb[tb.length - 1], 'vi') || a.ten.localeCompare(b.ten, 'vi');
        });
        DS_HS_LOP[lop] = ds;
        return ds;
      });
  }

  // ════════════════════════════════════════════════════════════
  // TỔNG HỢP SỐ LIỆU — mọi con số đều TÍNH, không viết cứng
  // ════════════════════════════════════════════════════════════
  var LOC_CS = 'all';
  function gvVangBuoi(b) {
    return DL.gvVang.filter(function (g) { return g.buoi === 'ca_ngay' || g.buoi === b; });
  }
  function tinh() {
    var dsCS = LOC_CS === 'all' ? DL.coSo : DL.coSo.filter(function (c) { return c.ma === LOC_CS; });
    var maCS = dsCS.map(function (c) { return c.ma; });
    var b = buoiXem();

    var gvTong = 0;
    dsCS.forEach(function (c) { gvTong += c.gvTong; });
    var gvVang = gvVangBuoi(b).filter(function (g) { return maCS.indexOf(g.coSo) >= 0; });

    var cacLop = Object.keys(DL.lop).filter(function (l) { return maCS.indexOf(DL.lop[l].coSo) >= 0; });
    var hsTong = 0;
    cacLop.forEach(function (l) { hsTong += DL.lop[l].siSo; });
    var lopDaDD = 0, hsVang = 0;
    cacLop.forEach(function (l) {
      var d = DL.ddLop[b][l];
      if (d) { lopDaDD++; hsVang += d.soVang; }
    });

    var soXanh = 0, soVang = 0, soDo = 0, soChua = 0, soNghiChieu = 0;
    dsCS.forEach(function (c) {
      var bc = (DL.baoCao[c.ma] || {})[b];
      if (b === 'chieu' && !bc) {
        var sang = (DL.baoCao[c.ma] || {}).sang;
        if (sang && sang.chieuKhongHoc) { soNghiChieu++; return; }
      }
      if (!bc) soChua++;
      else if (bc.anToan === 'xanh') soXanh++;
      else if (bc.anToan === 'vang') soVang++;
      else soDo++;
    });

    var viec = DL.viec.filter(function (v) { return !v.coSo || maCS.indexOf(v.coSo) >= 0; });
    var t = homNayISO();
    var vHomNay = viec.filter(function (v) { return v.han === t || (v.han && v.han < t && v.tt !== 'xong'); });
    var vQuaHan = viec.filter(function (v) { return v.han && v.han < t && v.tt !== 'xong'; }).length;
    var svCanXuLy = DL.suViec.filter(function (s) {
      return maCS.indexOf(s.coSo) >= 0 && s.tt !== 'da_xu_ly';
    }).length;
    var tietThieu = DAY_THAY.filter(function (x) { return !x.gv; }).length;
    var dxCho = (DL.deXuat || []).filter(function (d) { return d.tt === 'cho_duyet'; }).length;
    var tbToiChuaXN = (DL.thongBao || []).filter(tbCanToiXN).length;

    // CBGV có mặt — chỉ tính trên những điểm ĐÃ báo cáo (xem chú thích ở
    // tinhDiem). gvTong / gvVang bên dưới vẫn giữ nguyên vì nhiều chỗ khác
    // cần con số tổng đội ngũ, không phải con số điểm danh.
    var gvCoBC = 0, gvTongBC = 0, csDaBC = 0;
    dsCS.forEach(function (c) {
      if (!(DL.baoCao[c.ma] || {})[b]) return;
      csDaBC++;
      var v = gvVangBuoi(b).filter(function (g) { return g.coSo === c.ma; }).length;
      gvCoBC += (c.gvTong - v); gvTongBC += c.gvTong;
    });

    return { dsCS: dsCS, buoi: b, gvTong: gvTong, gvVang: gvVang,
      csDaBC: csDaBC, gvCoBC: gvCoBC, gvTongBC: gvTongBC,
      hsTong: hsTong, hsVang: hsVang, lopDaDD: lopDaDD, lopTong: cacLop.length,
      soXanh: soXanh, soVang: soVang, soDo: soDo, soChua: soChua, soNghiChieu: soNghiChieu,
      viecTong: viec.length, vXong: viec.filter(function (v) { return v.tt === 'xong'; }).length,
      vQuaHan: vQuaHan, vHomNay: vHomNay, svCanXuLy: svCanXuLy, tietThieu: tietThieu,
      dxCho: dxCho, tbToiChuaXN: tbToiChuaXN };
  }

  // ════════════════════════════════════════════════════════════
  // "CẦN TÔI XỬ LÝ" — gom MỌI ngoại lệ về một hàng đợi, mỗi dòng có nút
  // xử lý ngay. Nguyên tắc: mọi việc bình thường thì KHÔNG làm phiền ai;
  // xử lý xong dòng tự biến mất (dữ liệu đọc lại từ CSDL).
  // ════════════════════════════════════════════════════════════
  function canXuLyDs() {
    var ds = [], b = buoiXem(), t = homNayISO(), qt = laQT();
    var toi = emailToi();

    // 1 · Đề xuất chờ duyệt (BGH)
    if (qt) (DL.deXuat || []).forEach(function (d) {
      if (d.tt !== 'cho_duyet') return;
      ds.push({ mau: 'do', loai: 'ĐỀ XUẤT', pill: 'vang',
        chu: '<b>' + thoat(d.ten) + '</b> — ' + thoat(tenLoaiDX(d.loai)) +
          (d.tuNgay ? ' ' + ngayVN(d.tuNgay) + (d.denNgay ? '–' + ngayVN(d.denNgay) : '') +
            (d.buoi !== 'ca_ngay' ? ' (' + tenBuoi(d.buoi) + ')' : '') : '') +
          '<small>' + thoat(d.noiDung) + '</small>',
        nut: '<button class="dh-nut-hd xanh" onclick="DH.dxDuyet(' + d.id + ', true)">✓ Duyệt</button>' +
             '<button class="dh-nut-hd vien" onclick="DH.dxDuyet(' + d.id + ', false)">✗ Trao đổi lại</button>' });
    });

    // 2 · Sự việc chưa ai tiếp nhận (BGH)
    if (qt) (DL.suViec || []).forEach(function (s) {
      if (s.tt !== 'moi') return;
      ds.push({ mau: s.muc === 'do' ? 'do' : 'vang',
        loai: s.muc === 'do' ? 'XỬ LÝ NGAY' : 'CẦN LƯU Ý',
        pill: s.muc === 'do' ? 'do' : 'vang',
        chu: '<b>' + thoat(s.loai) + ' — ' + thoat(tenCoSo(s.coSo)) + '</b><small>' +
          thoat(s.moTa) + ' (' + thoat(s.nguoiTen) + ', ' + s.luc + ')</small>',
        nut: '<button class="dh-nut-nho" onclick="DH.svTiepNhan(' + s.id + ')">Tiếp nhận</button>' });
    });

    // 3 · Điểm trường chưa xác nhận buổi này — của mình thì có nút báo ngay
    var duocBao = coSoDuocBao();
    DL.coSo.forEach(function (c) {
      var bc = (DL.baoCao[c.ma] || {})[b];
      if (bc) return;
      if (b === 'chieu') {
        var sang = (DL.baoCao[c.ma] || {}).sang;
        if (sang && sang.chieuKhongHoc) return;
      }
      var cuaToi = duocBao.indexOf(c.ma) >= 0;
      if (!qt && !cuaToi) return;    // GV thường không cần thấy dòng này
      ds.push({ mau: 'xam', loai: 'CHƯA BÁO CÁO', pill: 'xam',
        chu: '<b>' + thoat(c.ten) + '</b> chưa xác nhận An toàn ' + tenBuoi(b),
        // Báo cáo đầu buổi nay nằm ở màn BÁO VIỆC, không phải màn Điểm danh
        nut: cuaToi ? '<button class="dh-nut-nho" onclick="DH.tab(\'baoviec\')">Báo cáo ngay</button>' : '' });
    });

    // 4 · Việc quá hạn — BGH thấy hết, cá nhân thấy việc của mình
    (DL.viec || []).forEach(function (v) {
      if (!(v.han && v.han < t && v.tt !== 'xong')) return;
      if (!qt && !emailBang(v.nguoiEmail, toi)) return;
      ds.push({ mau: 'vang', loai: 'QUÁ HẠN', pill: 'do',
        chu: '<b>Việc quá hạn:</b> ' + thoat(v.noiDung) +
          '<small>' + thoat(v.nguoiTen) + ' · hạn ' + ngayVN(v.han) + '</small>',
        nut: '<button class="dh-nut-nho" onclick="DH.tab(\'viec\')">Xem</button>' });
    });

    // 5 · Thông báo quan trọng TÔI chưa xác nhận (mọi vai trò)
    (DL.thongBao || []).forEach(function (x) {
      if (!tbCanToiXN(x)) return;
      ds.push({ mau: 'vang', loai: 'THÔNG BÁO', pill: 'navy',
        chu: '<b>Thông báo cần xác nhận:</b> ' + thoat(x.tieuDe) +
          '<small>' + thoat(x.nguoiGui) + ' · ' + ngayVN(x.ngay) + '</small>',
        nut: '<button class="dh-nut-nho" onclick="DH.tbXacNhan(' + x.id + ')">✓ Tôi đã nhận</button>' });
    });

    // 6 · Học sinh nghỉ nhiều buổi (BGH) — nguồn là hs_vang của thẻ Điểm danh
    // HS nay đã ẩn, nên dòng này chỉ còn hiện nếu CSDL còn dữ liệu cũ trong 7
    // ngày. KHÔNG kèm nút "Xem": thẻ đó không còn trên thanh, bấm sẽ lạc chỗ.
    if (qt) (DL.nghiDai || []).forEach(function (n) {
      ds.push({ mau: 'vang', loai: 'HỌC SINH', pill: 'vang',
        chu: '<b>Nghỉ nhiều buổi:</b> ' + thoat(n.ten) + ' (' + thoat(n.lop) + ')' +
          '<small>' + n.soBuoi + ' buổi trong 7 ngày — nhờ GVCN liên hệ gia đình</small>',
        nut: '' });
    });

    // 7 · Việc ĐẾN HẠN hôm nay của tôi (chưa xong, chưa quá hạn — nhắc nhẹ)
    if (!qt) (DL.viec || []).forEach(function (v) {
      if (!emailBang(v.nguoiEmail, toi) || v.tt === 'xong' || v.han !== t) return;
      ds.push({ mau: 'vang', loai: 'ĐẾN HẠN', pill: 'vang',
        chu: '<b>Đến hạn hôm nay:</b> ' + thoat(v.noiDung),
        nut: '<button class="dh-nut-nho" onclick="DH.tab(\'viec\')">Xem</button>' });
    });

    return ds;
  }

  // (Khối "Cần tôi xử lý" của bố cục CŨ đã bỏ — bản thiết kế v3 thay bằng
  //  veHangCho() với pill loại việc và nút một chạm. Xoá hẳn thay vì để lại
  //  mã chết, kẻo lần sau sửa nhầm chỗ.)

  // ════════════════════════════════════════════════════════════
  // MÀN TỔNG QUAN — bản thiết kế v3 phương án 1b
  // Ba tầng: dải trạng thái toàn trường → MỖI ĐIỂM TRƯỜNG MỘT CỘT (so sánh
  // ngang được) → hàng đợi "Cần Ban giám hiệu xử lý" mỗi dòng một nút.
  // Trên điện thoại mỗi cột co thành một thẻ viền trái màu trạng thái (CSS lo).
  // ════════════════════════════════════════════════════════════

  // Mốc giờ báo cáo lấy từ cau_hinh (sql/34) — quá giờ mà điểm chưa gửi thì
  // bảng điều hành tự sinh dòng "CHƯA BÁO CÁO". Mỗi trường một giờ vào lớp.
  var GIO_BC = { sang: '07:15', chieu: '13:45' };
  function quaGioBaoCao() {
    var m = /^(\d{1,2}):(\d{2})$/.exec(GIO_BC[buoiXem()] || '');
    if (!m) return false;
    var d = new Date();
    return d.getHours() * 60 + d.getMinutes() > (+m[1]) * 60 + (+m[2]);
  }

  function tenPhuTrach(email) {
    if (!email) return 'chưa gán phụ trách';
    var g = DL.gvDs.filter(function (x) { return emailBang(x.email, email); })[0];
    return g ? g.ten : email;
  }

  // Gom mọi thứ cần biết về MỘT điểm trường trong buổi đang xem
  function tinhDiem(c) {
    var b = buoiXem();
    var bc = (DL.baoCao[c.ma] || {})[b];
    var sang = (DL.baoCao[c.ma] || {}).sang;
    var nghiChieu = b === 'chieu' && !bc && sang && sang.chieuKhongHoc;

    var gvCS = DL.gvDs.filter(function (g) { return g.coSo === c.ma; }).length;
    var vang = gvVangBuoi(b).filter(function (g) { return g.coSo === c.ma; }).length;
    var cacLop = Object.keys(DL.lop).filter(function (l) { return DL.lop[l].coSo === c.ma; });
    var hs = 0;
    cacLop.forEach(function (l) { hs += DL.lop[l].siSo; });
    var svMo = (DL.suViec || []).filter(function (s) {
      return s.coSo === c.ma && s.tt !== 'da_xu_ly';
    }).length;

    // Cơ sở vật chất: gộp ba mục điện · nước · phòng học của phiếu đầu buổi
    var loi = [];
    if (bc) {
      if (bc.dien === 'loi') loi.push('điện');
      if (bc.nuoc === 'loi') loi.push('nước');
      if (bc.csvc === 'loi') loi.push('phòng học');
    }
    var csvcChu = !bc ? '—' : (loi.length ? 'Có vấn đề: ' + loi.join(', ') : 'Bình thường');

    var mau = nghiChieu ? 'xam'
      : !bc ? 'xam'
      : bc.anToan === 'xanh' ? 'xanh'
      : bc.anToan === 'vang' ? 'vang' : 'do';

    return {
      ma: c.ma, ten: c.ten, bc: bc, nghiChieu: nghiChieu, mau: mau,
      pill: nghiChieu ? 'Chiều không học' : (bc ? 'Đã báo cáo' : 'Chưa báo cáo'),
      phuTrach: tenPhuTrach(c.phuTrach),
      quyMo: cacLop.length + ' lớp · ' + hs.toLocaleString('vi-VN') + ' HS',
      anToan: !bc ? '—' : bc.anToan === 'xanh' ? 'Xanh' : bc.anToan === 'vang' ? 'Vàng' : 'Đỏ',
      csvc: csvcChu, csvcLoi: loi.length > 0,
      // ⚠️ CHƯA BÁO CÁO THÌ ĐỂ DẤU "—", ĐỪNG TÍNH RA SỐ.
      // Sổ vắng rỗng KHÔNG có nghĩa là cả trường đi đủ — nó có nghĩa là chưa
      // ai nói gì. Trước đây dòng này lấy thẳng (tổng − vắng) nên khi chưa
      // điểm nào báo cáo vẫn hiện "37/37 có mặt", đứng ngay cạnh dòng "chờ 1
      // điểm báo cáo". Đúng cái bẫy đã tránh ở bảng công tháng: khẳng định
      // trước một việc chưa xảy ra, mà tờ giấy này đi vào bảng lương.
      // Hai dòng An toàn và CSVC ngay trên đã để "—" từ đầu — nay thống nhất.
      gv: !bc ? '—' : (gvCS - vang) + '/' + gvCS,
      gvCo: gvCS - vang, gvTongSo: gvCS,
      svMo: svMo,
      ghiChu: bc ? (bc.ghiChu || '') : ''
    };
  }

  // Vàng #b7791f chỉ đạt 3,50:1 trên nền vàng nhạt và 3,64:1 trên trắng — mục
  // 12.6 đã đo và chốt thay bằng #a06a1a. Trước nay mới áp cho nền thẻ, còn
  // MAU_HEX vẫn giữ màu cũ nên CHỮ vẫn nhạt. Xám #8494b3 cũng vậy: dùng làm
  // màu CHỮ thì chỉ 3,06:1. Người đọc là cô giáo đứng ngoài sân, nắng, điện
  // thoại nhỏ — chữ thật thì ưu tiên đọc được.
  // Vàng: #b7791f cũ chỉ 3,64:1 trên trắng; #a06a1a (mục 12.6) lên 4,59 nhưng
  // đặt trên nền thẻ vàng nhạt #fffaf1 lại tụt còn 4,42 — đo bằng máy mới
  // thấy. Dùng #8f5d14, chính là biến --canh của bảng màu, đạt cả hai nền.
  var MAU_HEX = { xanh: '#1e7f4f', vang: '#8f5d14', do: '#c0392b', xam: '#5f7091' };

  function veTongQuan() {
    var b = buoiXem();
    // Van an toàn: bản mẫu có 3 cơ sở, trường thật có thể chỉ 1. Lọc theo mã
    // không còn tồn tại là màn TRẮNG, mà hàng chip lọc cũng không hiện (chỉ
    // hiện khi ≥2 cơ sở) nên không có đường bấm về — phải F5 mới thoát.
    if (LOC_CS !== 'all' && !DL.coSo.filter(function (c) { return c.ma === LOC_CS; }).length) {
      LOC_CS = 'all';
    }
    var dsCS = LOC_CS === 'all' ? DL.coSo : DL.coSo.filter(function (c) { return c.ma === LOC_CS; });
    var ds = dsCS.map(tinhDiem);
    var t = tinh();

    var daBao = ds.filter(function (d) { return d.bc || d.nghiChieu; }).length;
    var coDo = ds.some(function (d) { return d.mau === 'do'; });
    var coVang = ds.some(function (d) { return d.mau === 'vang'; });
    // Mục cơ sở vật chất "Có vấn đề" cũng phải kéo dải trạng thái xuống VÀNG.
    // Chỉ nhìn ô An toàn thì tick "mất nước khu B" xong vẫn báo ỔN ĐỊNH.
    var coCSVC = ds.some(function (d) { return d.csvcLoi; });
    var mauTT = coDo ? 'do' : (coVang || coCSVC) ? 'vang'
      : (daBao === ds.length && ds.length) ? 'xanh' : 'xam';
    // (Dòng "Toàn trường: …" đã bỏ — nội dung của nó nay nằm trong dòng phụ
    //  của hai thẻ đầu, để nguyên là nói hai lần cùng một chuyện.)

    // Chỉ cộng CBGV của những điểm ĐÃ báo cáo. Điểm chưa báo thì không biết
    // gì về nó, cộng vào là bịa; điểm nghỉ chiều cũng không có ai để đếm.
    var dsBC = ds.filter(function (d) { return d.bc; });
    var gvCoBC = 0, gvTongBC = 0;
    dsBC.forEach(function (d) { gvCoBC += d.gvCo; gvTongBC += d.gvTongSo; });
    var duBaoCao = daBao === ds.length && ds.length > 0;

    // ── NĂM THẺ SỐ LIỆU (bản thiết kế thầy Chung chọn 15/8/2026) ──
    // Mỗi thẻ có DÒNG PHỤ trả lời ngay câu hỏi kế tiếp: "2/3 điểm" thì thiếu
    // điểm nào, "33/37" thì bốn người kia đi đâu. Thiếu dòng đó thì nhìn số
    // xong vẫn phải đi tìm — mà chính chỗ phải đi tìm mới là chỗ bỏ cuộc.
    var conThieu = ds.length - daBao;
    var soLuuY = ds.filter(function (d) { return d.mau === 'vang' || d.csvcLoi; }).length;
    var soXuLy = ds.filter(function (d) { return d.mau === 'do'; }).length;

    // Gom lý do vắng thành "2 nghỉ phép · 1 tập huấn"
    var theoLyDo = {};
    t.gvVang.forEach(function (g) {
      var k = String(g.lyDo || 'vắng').toLowerCase();
      theoLyDo[k] = (theoLyDo[k] || 0) + 1;
    });
    var chuVang = Object.keys(theoLyDo).map(function (k) { return theoLyDo[k] + ' ' + k; }).join(' · ');

    var dxDiem = {};
    (DL.deXuat || []).forEach(function (d) { if (d.tt === 'cho_duyet' && d.coSo) dxDiem[d.coSo] = 1; });
    var soDiemDX = Object.keys(dxDiem).length;
    var svGap = (DL.suViec || []).filter(function (s) {
      return s.tt !== 'da_xu_ly' && s.muc === 'do';
    }).length;

    var kpis = [
      { nhan: 'Điểm đã báo cáo', so: daBao + '/' + ds.length,
        phu: conThieu ? 'còn ' + conThieu + ' điểm chưa gửi' : 'tất cả điểm đã gửi',
        mau: daBao === ds.length ? 'xanh' : 'vang' },
      // Tin XẤU thì hiện ngay dù chưa đủ điểm báo (một điểm báo Đỏ là cả trường
      // phải biết). Nhưng chữ "Xanh" — lời khẳng định cả trường an toàn — chỉ
      // được nói khi MỌI điểm đã báo cáo.
      { nhan: 'An toàn toàn trường',
        so: coDo ? 'Đỏ' : coVang ? 'Vàng' : duBaoCao ? 'Xanh' : '—',
        phu: soXuLy ? soXuLy + ' điểm cần xử lý ngay'
           : soLuuY ? soLuuY + ' điểm cần lưu ý'
           : duBaoCao ? 'mọi điểm báo an toàn'
           : 'chờ ' + conThieu + ' điểm báo cáo',
        mau: mauTT },
      { nhan: 'GV có mặt', so: dsBC.length ? gvCoBC + '/' + gvTongBC : '—',
        phu: !dsBC.length ? 'chưa điểm nào báo cáo'
           : (chuVang || 'không ai vắng') +
             (dsBC.length < ds.length ? ' · tính trên ' + dsBC.length + '/' + ds.length + ' điểm' : ''),
        mau: 'navy' },
      { nhan: 'Đề xuất chờ duyệt', so: t.dxCho,
        phu: !t.dxCho ? 'không có đơn nào chờ'
           : soDiemDX ? 'từ ' + soDiemDX + ' điểm trường' : 'chờ Ban giám hiệu',
        mau: t.dxCho ? 'vang' : 'xanh' },
      { nhan: 'Sự việc mở', so: t.svCanXuLy,
        phu: !t.svCanXuLy ? 'không có sự việc nào'
           : svGap ? svGap + ' cần xử lý ngay' : 'đang theo dõi',
        mau: t.svCanXuLy ? 'do' : 'xanh' }
    ];

    var dai = '<div class="dh-kpi-luoi">' + kpis.map(function (k) {
      var trong = String(k.so) === '—';
      return '<div class="dh-kpi-o ' + k.mau + '"><div class="nhan">' + thoat(k.nhan) + '</div>' +
        '<div class="so' + (trong ? ' trong' : '') + '" style="color:' +
        (k.mau === 'navy' ? '#14306b' : MAU_HEX[k.mau]) + '">' +
        thoat(String(k.so)) + '</div>' +
        '<div class="phu">' + thoat(k.phu) + '</div></div>';
    }).join('') + '</div>';

    var cot = '<div class="dh-cot-diem">' + ds.map(function (d) {
      return '<div class="dh-diem-cot ' + d.mau + ' ' + mauCoSo(d.ma) + '">' +
        '<div class="dh-diem-dau ' + d.mau + '">' +
        '<div class="hang"><div class="ten">' + thoat(d.ten) + '</div>' +
        '<div class="pill">' + thoat(d.pill) + '</div></div>' +
        '<div class="phu">' + thoat(d.phuTrach) + ' · ' + thoat(d.quyMo) + '</div></div>' +
        '<div class="dh-diem-than">' +
        '<div class="dh-diem-dong"><span>An toàn</span><b style="color:' +
          (d.bc ? MAU_HEX[d.mau] : '#8494b3') + '">' + thoat(d.anToan) + '</b></div>' +
        '<div class="dh-diem-dong"><span>CSVC · điện nước</span><b style="color:' +
          (d.csvcLoi ? MAU_HEX.do : d.bc ? MAU_HEX.xanh : '#8494b3') + '">' + thoat(d.csvc) + '</b></div>' +
        '<div class="dh-diem-dong"><span>GV có mặt</span><b style="color:#14306b">' + thoat(d.gv) + '</b></div>' +
        '<div class="dh-diem-dong"><span>Sự việc mở</span><b style="color:#14306b">' + d.svMo + '</b></div>' +
        '</div>' +
        (d.ghiChu ? '<div class="dh-diem-note">' + thoat(d.ghiChu) + '</div>' : '') +
        '</div>';
    }).join('') + '</div>';

    // THỨ TỰ: dải trạng thái → VIỆC CẦN XỬ LÝ → thẻ từng điểm trường.
    // Hàng đợi trước đây nằm sau các thẻ điểm trường, phải cuộn mới thấy —
    // trong khi nó chính là thứ Ban giám hiệu mở app để xem. Thẻ điểm trường
    // là bức tranh nền, xem sau cũng được; việc quá hạn, đề xuất chờ duyệt,
    // sự việc chưa ai tiếp nhận thì không.
    return dai + veHangCho() + cot + veDayThayNhac();
  }

  // ── Hàng đợi "Cần Ban giám hiệu xử lý" — mỗi dòng đúng MỘT nút ──
  function veHangCho() {
    var b = buoiXem();
    var maCS = (LOC_CS === 'all' ? DL.coSo : DL.coSo.filter(function (c) { return c.ma === LOC_CS; }))
      .map(function (c) { return c.ma; });
    var ds = canXuLyDs();

    // Quá giờ mà điểm chưa gửi báo cáo → THAY dòng "chưa xác nhận" của
    // canXuLyDs bằng dòng CHƯA BÁO CÁO có nút Nhắc. Không thay mà chỉ thêm
    // vào là mỗi điểm hiện HAI dòng, tiêu đề đếm gấp đôi, và trang chủ (chỉ
    // đếm canXuLyDs) lại ra số khác — ba con số cho một việc.
    if (laQT() && quaGioBaoCao()) {
      ds = ds.filter(function (r) {
        return String(r.chu || '').indexOf('chưa xác nhận An toàn') < 0;
      });
      var them = [];
      DL.coSo.forEach(function (c) {
        if (maCS.indexOf(c.ma) < 0) return;
        var bc = (DL.baoCao[c.ma] || {})[b];
        if (bc) return;
        if (b === 'chieu') {
          var sang = (DL.baoCao[c.ma] || {}).sang;
          if (sang && sang.chieuKhongHoc) return;
        }
        them.push({ loai: 'CHƯA BÁO CÁO', pill: 'xam',
          chu: thoat(c.ten) + ' chưa gửi báo cáo ' + tenBuoi(b),
          nguon: 'quá ' + (GIO_BC[b] || '') + ' · ' + tenPhuTrach(c.phuTrach),
          nut: 'Nhắc', ham: 'DH.nhacBaoCao(\'' + nhay(c.ma) + '\')' });
      });
      ds = them.concat(ds);   // giữ đúng thứ tự khai báo cơ sở, không đảo ngược
    }

    // Điểm báo mức ĐỎ hoặc có mục cơ sở vật chất "Có vấn đề" phải NHẢY LÊN
    // hàng đợi. Thiếu hai nhánh này thì phụ trách tick "Nước có vấn đề" xong
    // bảng điều hành vẫn báo "Toàn trường: ỔN ĐỊNH · 0 việc" — trái hẳn câu
    // chính biểu mẫu hứa với người ta.
    var themBC = [];
    DL.coSo.forEach(function (c) {
      if (maCS.indexOf(c.ma) < 0) return;
      var bc = (DL.baoCao[c.ma] || {})[b];
      if (!bc) return;
      if (bc.anToan === 'do') {
        themBC.push({ loai: 'XỬ LÝ NGAY', pill: 'do',
          chu: thoat(c.ten) + ' báo <b>🔴 CÓ SỰ VIỆC</b>' + (bc.ghiChu ? ' — ' + thoat(bc.ghiChu) : ''),
          nguon: 'báo cáo ' + tenBuoi(b) + ' lúc ' + thoat(bc.luc || ''),
          nut: 'Xem điểm trường', ham: 'DH.locCS(\'' + nhay(c.ma) + '\')' });
      }
      var loi = [];
      if (bc.dien === 'loi') loi.push('điện');
      if (bc.nuoc === 'loi') loi.push('nước');
      if (bc.csvc === 'loi') loi.push('phòng học');
      if (loi.length) {
        themBC.push({ loai: 'CSVC', pill: 'vang',
          chu: thoat(c.ten) + ' báo <b>' + thoat(loi.join(', ')) + '</b> có vấn đề',
          nguon: 'báo cáo ' + tenBuoi(b) + (bc.ghiChu ? ' — ' + thoat(bc.ghiChu) : ''),
          nut: 'Ghi thành sự việc', ham: 'DH.svTuCsvc(\'' + nhay(c.ma) + '\')' });
      }
    });
    ds = themBC.concat(ds);
    if (!ds.length) {
      return '<div class="dh-cho-khoi"><div class="dh-cho-dau">Cần Ban giám hiệu xử lý · 0 việc</div>' +
        '<div class="dh-cho-hang"><span class="dh-pill xanh">ỔN</span>' +
        '<div class="tt"><b>Không có việc nào chờ xử lý.</b>' +
        '<small>Mọi ngoại lệ — đơn chờ duyệt, sự việc mới, điểm chưa báo cáo, việc quá hạn — sẽ tự hiện ở đây.</small>' +
        '</div></div></div>';
    }
    // Khối này nặng hay nhẹ tùy CÓ VIỆC GẤP hay không: một dòng "XỬ LÝ NGAY"
    // là cả khối mang viền đỏ, còn lại thì vàng. Lúc rỗng (nhánh trên) để
    // trắng trơn — hàng đợi trống không đáng chiếm sự chú ý của ai.
    var gap = ds.some(function (r) { return r.mau === 'do' || r.pill === 'do'; });
    return '<div class="dh-cho-khoi ' + (gap ? 'gap' : 'luuy') + '">' +
      '<div class="dh-cho-dau">Cần Ban giám hiệu xử lý · ' +
      ds.length + ' việc</div>' +
      ds.map(function (r) {
        // canXuLyDs() cũ trả {mau, chu, nut}; dòng tự sinh ở trên trả dạng mới
        var pill = r.pill || (r.mau === 'do' ? 'do' : r.mau === 'vang' ? 'vang' : 'xam');
        var loai = r.loai || (r.mau === 'do' ? 'XỬ LÝ NGAY' : r.mau === 'vang' ? 'CẦN LƯU Ý' : 'CHỜ');
        var than = r.ham
          ? '<div class="tt"><b>' + r.chu + '</b><small>' + thoat(r.nguon || '') + '</small></div>' +
            '<button class="dh-nut-hd" onclick="' + r.ham + '">' + thoat(r.nut) + '</button>'
          : '<div class="tt">' + r.chu + '</div>' + (r.nut || '');
        return '<div class="dh-cho-hang"><span class="dh-pill ' + pill + '">' + thoat(loai) + '</span>' + than + '</div>';
      }).join('') + '</div>';
  }

  // Nhắc dạy thay khi có GV vắng — giữ nguyên tinh thần bản cũ
  function veDayThayNhac() {
    if (THAT) {
      // Nay đã có màn Thời khóa biểu thật — chỉ đúng chỗ để nạp, đừng bắt
      // người dùng đi tìm "bản mẫu ở cuối màn Lịch tuần" như trước.
      return '<div class="hd-kiem vang">👨‍🏫 Bố trí <b>dạy thay theo tiết</b> sẽ mở khi nạp thời khóa biểu — ' +
        '<a href="javascript:DH.tab(\'tkb\')">nạp ngay ở màn Thời khóa biểu →</a></div>';
    }
    var thieu = DAY_THAY.filter(function (x) { return !x.gv; }).length;
    return thieu
      ? '<div class="hd-kiem do">🔴 Lớp 3B còn <b>' + thieu + ' tiết chưa có người dạy thay</b> — ' +
        '<a href="javascript:DH.tab(\'lichtuan\')">bố trí ngay →</a></div>'
      : '<div class="hd-kiem xanh">🟢 Mọi lớp có giáo viên vắng đều đã bố trí dạy thay.</div>';
  }

  // ── Bảng trạng thái từng CBGV trong buổi đang xem (màn Điểm danh GV) ──
  // Nguồn vẫn là gv_vang: người phụ trách báo NGƯỜI VẮNG, mặc định là có mặt.
  // Bản thiết kế bày ra dạng bảng từng người — đây là DẪN XUẤT, không đổi
  // cách nhập, nên không đẻ thêm việc cho ai.
  var PILL_VANG = {
    'Nghỉ ốm': 'do', 'Nghỉ phép': 'vang', 'Việc riêng': 'vang',
    'Công tác': 'navy', 'Tập huấn': 'navy', 'Khác': 'xam'
  };
  function veBangTrangThaiGV() {
    var b = buoiXem();
    var vang = {};
    gvVangBuoi(b).forEach(function (g) {
      vang[khoaGV(g.email, g.ten)] = g;
    });
    var nhieuCS = DL.coSo.length > 1;
    var hang = (DL.gvDs || []).map(function (g) {
      var v = vang[khoaGV(g.email, g.ten)];
      // "Chưa điểm danh" chỉ đúng khi cơ sở đó CHƯA gửi báo cáo đầu buổi VÀ
      // cũng chưa ai khai vắng cho nó. Từ 15/8/2026 hai việc này tách hai
      // màn, nên nếu chỉ nhìn báo cáo đầu buổi thì cô phụ trách vừa khai hai
      // người nghỉ ốm xong mà cả bảng vẫn ghi "Chưa điểm danh" — vô lý.
      var coKhaiVang = gvVangBuoi(b).some(function (x) { return x.coSo === g.coSo; });
      var chuaBC = !(DL.baoCao[g.coSo] || {})[b] && !coKhaiVang;
      var pill, chu;
      if (v) { pill = PILL_VANG[v.lyDo] || 'vang'; chu = v.lyDo; }
      else if (chuaBC) { pill = 'xam'; chu = 'Chưa điểm danh'; }
      else { pill = 'xanh'; chu = 'Có mặt'; }
      return '<tr><td class="cot-dinh"><b>' + thoat(g.ten) + '</b>' +
        (g.chucVu ? '<br><small>' + thoat(g.chucVu) + '</small>' : '') + '</td>' +
        (nhieuCS ? '<td>' + thoat(tenCoSo(g.coSo)) + '</td>' : '') +
        '<td><span class="dh-pill ' + pill + '">' + thoat(chu) + '</span></td>' +
        '<td>' + (v ? (v.denNgay ? 'đến ' + ngayVN(v.denNgay) : '') +
          (v.baoMuon ? ' <b class="dh-do">⚠ báo muộn</b>' : '') : '') + '</td>' +
        // Đường XOÁ dòng vắng ghi nhầm. Trước 15/8/2026 việc này đi nhờ nút
        // "Sửa báo cáo" (nó xoá cả báo cáo lẫn sổ vắng cùng buổi); nay hai
        // việc đã tách hai màn nên nếu không có nút này thì lưu nhầm là KẸT —
        // mà đây là số liệu chảy thẳng vào bảng công, tức bảng lương.
        // Chỉ hiện với admin/BGH và chỉ cho dòng do điểm danh ghi ra: dòng
        // sinh từ ĐƠN NGHỈ đã duyệt phải rút đơn chứ không xoá lén ở đây.
        '<td>' + (v && v.id && laQT() && String(v.nguon || '').indexOf('Điểm danh') === 0
          ? '<button class="dh-nut-nho" onclick="DH.xoaVang(' + v.id + ', ' +
            JSON.stringify(v.ten).replace(/"/g, '&quot;') + ')">Xoá</button>'
          : '') + '</td></tr>';
    }).join('');

    return '<div class="dh-tieu-de" style="margin-top:22px">🧑‍🏫 Trạng thái CBGV-NV · ' + tenBuoi(b) + '</div>' +
      '<div class="dh-ghi-chu-nho" style="margin-top:0">Bảng này <b>dẫn xuất</b> từ sổ vắng — người phụ trách chỉ báo ' +
      'NGƯỜI VẮNG trong báo cáo đầu buổi, còn lại mặc định có mặt. Không ai phải điểm danh từng người.</div>' +
      '<div class="cuon-ngang"><table class="bang-quan-tri nho bang-cong"><thead><tr>' +
      '<th class="cot-dinh" style="text-align:left">CBGV-NV</th>' +
      (nhieuCS ? '<th>Điểm trường</th>' : '') +
      '<th>Trạng thái</th><th>Ghi chú bảng công</th><th></th></tr></thead><tbody>' +
      (hang || '<tr><td colspan="' + (nhieuCS ? 5 : 4) + '">Chưa có danh sách nhân sự.</td></tr>') +
      '</tbody></table></div>';
  }
  function khoaGV(email, ten) {
    return email ? 'e:' + String(email).trim().toLowerCase()
      : 't:' + String(ten || '').trim().replace(/\s+/g, ' ').toLowerCase();
  }

  // ════════════════════════════════════════════════════════════
  // TAB 2 · BÁO CÁO ĐẦU BUỔI + AN TOÀN XANH
  // ════════════════════════════════════════════════════════════
  var BC_CS = '';          // cơ sở đang báo cáo
  var BC_ANTOAN = null;
  var BC_GV_VANG = {};     // email/tên -> lý do
  var BC_MO_CHON_GV = false;
  // Ba mục cơ sở vật chất của màn 3c: '' = chưa chọn, 'on' | 'loi'
  var BC_CSVC = { dien: '', nuoc: '', csvc: '' };
  var TEN_CSVC = { dien: 'Điện', nuoc: 'Nước', csvc: 'Phòng học – thiết bị' };

  // (Hàm veBaoCao() gộp ba khối đã bỏ ngày 15/8/2026 — ba khối đó nay chia về
  //  hai màn theo việc NHẬP / XEM, xem chú thích ở chỗ chọn nội dung tab.
  //  Ba tầng của cùng một chuyện "ai có mặt" thì vẫn nguyên: hằng ngày báo cáo
  //  đầu buổi · xuống điểm thì tick phiếu kiểm tra · cuối tháng bảng công tự
  //  cộng ra từ chính sổ vắng đã bấm mỗi ngày — không ai nhập lại lần nào.)

  // ── Phiếu kiểm tra điểm trường: 5 mục tick nhanh trên điện thoại,
  //    mục ⚠ tự sinh thành SỰ VIỆC, phiếu tự vào nhật ký — không nhập lại ──
  var KT_CS = '';
  var KT_MUC = { day_hoc: 'dat', ne_nep: 'dat', ve_sinh: 'dat', an_toan: 'dat', csvc: 'dat' };
  var KT_TEN = { day_hoc: 'Dạy học', ne_nep: 'Nề nếp', ve_sinh: 'Vệ sinh', an_toan: 'An toàn', csvc: 'CSVC' };

  function veKiemTraDT() {
    if (THAT && !DL.ktCoBang) {
      return '<div class="dh-tieu-de" style="margin-top:22px">🔍 Kiểm tra điểm trường</div>' +
        '<div class="hd-kiem vang">Phần này cần chạy <b>sql/25-dieu-hanh-dot-2.sql</b> trên Supabase rồi tải lại trang.</div>';
    }
    if (!KT_CS || !DL.coSo.filter(function (c) { return c.ma === KT_CS; }).length) {
      KT_CS = (DL.coSo[0] || {}).ma || '';
    }
    var chonCS = DL.coSo.length > 1
      ? '<div class="dh-chon-hang">' + DL.coSo.map(function (c) {
          return '<button class="chip-loc' + (c.ma === KT_CS ? ' on' : '') + '" onclick="DH.ktChonCS(\'' + nhay(c.ma) + '\')">' + thoat(c.ten) + '</button>';
        }).join('') + '</div>'
      : '';
    // Lưới thẻ, không phải năm hàng tràn hết bề ngang — cùng lý do đã đổi ở
    // mục Cơ sở vật chất: nhãn một đầu, nút một đầu thì không ai liếc ra.
    var mucHang = '<div class="dh-luoi-tick">' + Object.keys(KT_TEN).map(function (m) {
      return '<div class="dh-o-tick"><div class="nhan">' + KT_TEN[m] + '</div><div class="nut">' +
        '<button class="chip-loc' + (KT_MUC[m] === 'dat' ? ' on' : '') + '" onclick="DH.ktMuc(\'' + m + '\', \'dat\')">✓ Đạt</button>' +
        '<button class="chip-loc' + (KT_MUC[m] === 'can_xu_ly' ? ' on' : '') + '" onclick="DH.ktMuc(\'' + m + '\', \'can_xu_ly\')">⚠ Cần xử lý</button>' +
        '</div></div>';
    }).join('') + '</div>';
    var ganDay = (DL.ktDs || []).slice(0, 5).map(function (k) {
      var tomTat = Object.keys(KT_TEN).filter(function (m) { return k.muc[m] === 'can_xu_ly'; })
        .map(function (m) { return KT_TEN[m]; }).join(', ');
      return '<div class="dh-nk-dong"><span class="dh-nk-luc">' + ngayVN(k.ngay) + '</span><span>' +
        thoat(tenCoSo(k.coSo)) + ' — ' + thoat(k.ten) +
        (tomTat ? ' · <b class="dh-do">⚠ ' + thoat(tomTat) + '</b>' : ' · các mặt đều đạt') +
        (k.ghiChu ? ' — ' + thoat(k.ghiChu) : '') + '</span></div>';
    }).join('');

    return '<div class="dh-tieu-de" style="margin-top:22px">🔍 Kiểm tra điểm trường (Ban giám hiệu)</div>' +
      '<div class="dh-ghi-chu-nho" style="margin-top:0">Xuống điểm trường chỉ cần tick 5 mục trên điện thoại. ' +
      'Mục <b>⚠ Cần xử lý</b> tự sinh thành SỰ VIỆC để theo dõi; phiếu tự vào nhật ký — không phải về văn phòng nhập lại.</div>' +
      chonCS + mucHang +
      '<textarea id="dh-kt-ghichu" class="dh-o-nhap" rows="2" placeholder="Ghi chú ngắn (bắt buộc khi có mục ⚠)…"></textarea>' +
      '<button class="dh-nut-nho" style="margin-top:8px" onclick="DH.ktLuu()">💾 Lưu phiếu kiểm tra</button>' +
      (ganDay ? '<div class="dh-tieu-de" style="margin-top:14px">Nhật ký kiểm tra gần đây</div><div class="dh-nk">' + ganDay + '</div>' : '');
  }

  function veBaoCaoChinh() {
    var duocBao = coSoDuocBao();
    if (!duocBao.length) {
      return '<div class="the-thong-bao"><p style="font-size:14.5px"><b>Màn này dành cho người phụ trách điểm trường và Ban giám hiệu.</b></p>' +
        '<p style="font-size:13.5px;color:var(--chu-mo);margin-top:6px">Tài khoản của thầy cô chưa được gán phụ trách điểm trường nào. ' +
        'Ban giám hiệu gán người phụ trách trong Quản trị → Cơ sở &amp; Sáp nhập.</p></div>';
    }
    if (!BC_CS || duocBao.indexOf(BC_CS) < 0) {
      // Mặc định mở điểm CHƯA báo cáo buổi này
      BC_CS = duocBao.filter(function (m) { return !(DL.baoCao[m] || {})[buoiXem()]; })[0] || duocBao[0];
    }
    var b = buoiXem();
    var daGui = (DL.baoCao[BC_CS] || {})[b];

    var chonCS = duocBao.length > 1
      ? '<div class="dh-chon-hang" style="margin-bottom:10px">' + duocBao.map(function (m) {
          return '<button class="chip-loc' + (m === BC_CS ? ' on' : '') + '" onclick="DH.bcChonCS(\'' + nhay(m) + '\')">' + thoat(tenCoSo(m)) + '</button>';
        }).join('') + '</div>'
      : '';

    if (daGui) {
      return chonCS + '<div class="the-thong-bao"><p style="font-size:15px">' +
        (daGui.anToan === 'xanh' ? '🟢' : daGui.anToan === 'vang' ? '🟡' : '🔴') +
        ' <b>' + thoat(tenCoSo(BC_CS)) + ' đã báo cáo ' + tenBuoi(b) + ' lúc ' + daGui.luc + '.</b></p>' +
        (daGui.ghiChu ? '<p style="font-size:13.5px;margin-top:6px">' + thoat(daGui.ghiChu) + '</p>' : '') +
        '<p style="font-size:13.5px;color:var(--chu-mo);margin-top:6px">Cần sửa thì bấm nút dưới — bản sửa ghi đè bản cũ, nhật ký giữ vết cả hai.</p>' +
        '<button class="dh-nut-nho" style="margin-top:10px" onclick="DH.bcSua()">✏ Sửa báo cáo ' + tenBuoi(b) + '</button></div>';
    }

    var nutAT = function (ma, chu, phu) {
      return '<button class="dh-an-toan ' + ma + (BC_ANTOAN === ma ? ' on' : '') + '" onclick="DH.bcAnToan(\'' + ma + '\')">' +
        '<b>' + chu + '</b><small>' + phu + '</small></button>';
    };
    var oAT = '<div class="dh-tieu-de">1 · Tình hình an toàn</div>' +
      '<div class="dh-an3">' +
      nutAT('xanh', '🟢 AN TOÀN', 'Mọi việc bình thường') +
      nutAT('vang', '🟡 CẦN LƯU Ý', 'Có việc cần theo dõi') +
      nutAT('do', '🔴 CÓ SỰ VIỆC', 'Cần BGH xử lý') +
      '</div>' +
      '<div class="dh-ghi-chu-nho">Bấm 🟢 là xác nhận nhanh: học sinh an toàn, hoạt động bình thường, cơ sở vật chất – điện nước – an ninh ' +
      'bình thường. <b>Không phải tick từng tiêu chí</b> khi mọi việc bình thường.</div>';

    // Mục 2 của màn 3c: ba dòng, mỗi dòng hai nút Ổn / Có vấn đề. Ghi vào
    // ba cột riêng (sql/34) chứ không nhét vào ghi chú — có cột thì bảng
    // điều hành mới hiện được "CSVC · điện nước" cho từng điểm.
    // Lưới thẻ thay cho ba hàng tràn hết bề ngang: trên màn 1720px, nhãn nằm
    // mép trái mà nút nằm mép phải thì mắt phải quét ngang cả sải tay mới
    // biết mục nào đang chọn gì. Thẻ gọn, nhãn và nút cạnh nhau.
    var oCSVC = '<div class="dh-tieu-de">2 · Cơ sở vật chất · điện nước</div>' +
      '<div class="dh-luoi-tick">' +
      Object.keys(TEN_CSVC).map(function (m) {
        return '<div class="dh-o-tick"><div class="nhan">' + TEN_CSVC[m] + '</div>' +
          '<div class="nut">' +
          '<button class="chip-loc' + (BC_CSVC[m] === 'on' ? ' on' : '') +
            '" onclick="DH.bcCsvc(\'' + m + '\', \'on\')">Ổn</button>' +
          '<button class="chip-loc' + (BC_CSVC[m] === 'loi' ? ' on' : '') +
            '" onclick="DH.bcCsvc(\'' + m + '\', \'loi\')">Có vấn đề</button>' +
          '</div></div>';
      }).join('') + '</div>' +
      '<div class="dh-ghi-chu-nho">Không bắt buộc. Chọn <b>Có vấn đề</b> ở mục nào thì bảng điều hành hiện ngay mục đó cho Ban giám hiệu.</div>';

    // Ô ghi chú LUÔN có (đặc tả màn 3c bước 3: không bắt buộc nhưng luôn hiện).
    // Trước đây chỉ hiện khi chọn Vàng/Đỏ — chọn Xanh mà muốn ghi một câu thì
    // không có chỗ, và đổi Vàng→Xanh là chữ đã gõ bay mất vì ô biến khỏi DOM.
    // Đánh số 3 chứ không phải 4 — mục "cán bộ, giáo viên" cũ đã sang màn khác
    var oGhiChu = '<div class="dh-tieu-de">3 · Ghi chú <small>(không bắt buộc)</small></div>' +
      '<textarea id="dh-bc-ghichu" class="dh-o-nhap" rows="2" placeholder="VD: cành cây gãy sát sân sau, đã rào tạm…"></textarea>';
    var oChieu = b === 'sang'
      ? '<label class="dh-tick"><input type="checkbox" id="dh-bc-1buoi"> Chiều nay điểm trường <b>không học</b> (dashboard sẽ không chờ báo cáo chiều)</label>'
      : '';

    // Mục 3 (ai vắng) đã chuyển sang màn Điểm danh & Chấm công — xem
    // veKhaiVang() ngay dưới đây.
    return chonCS +
      '<div class="hd-kiem xanh" style="margin-top:0">Đang báo cáo <b>' + tenBuoi(b) + ' ' + ngayVN(homNayISO()) + '</b> cho <b>' + thoat(tenCoSo(BC_CS)) + '</b>.</div>' +
      oAT + oCSVC + oGhiChu + oChieu +
      '<button class="dh-nut-gui' + (BC_ANTOAN ? '' : ' mo') + '" onclick="DH.bcGui()">XÁC NHẬN ĐẦU BUỔI</button>' +
      '<div class="dh-ghi-chu-nho" style="text-align:center">Sau khi xác nhận, bảng điều hành của Ban giám hiệu cập nhật ngay.</div>';
  }

  // ════════════════════════════════════════════════════════════
  // KHAI NGƯỜI VẮNG — nằm ở màn ĐIỂM DANH & CHẤM CÔNG
  // ════════════════════════════════════════════════════════════
  // Thầy Chung chuyển mục này khỏi báo cáo đầu buổi ngày 15/8/2026: an toàn và
  // cơ sở vật chất là chuyện CƠ SỞ, ai vắng là chuyện NHÂN SỰ — hai việc khác
  // nhau thì đứng hai màn.
  //
  // Về dữ liệu thì tách được sạch: an toàn/CSVC ghi bảng `bao_cao_dau_buoi`,
  // người vắng ghi bảng `gv_vang` — vốn ĐÃ là hai bảng riêng, chỉ là trước
  // đây một nút gửi ghi cả hai. Nay hai nút, mỗi nút ghi bảng của mình.
  //
  // ⚠️ Vì thế "đã báo cáo" của một điểm vẫn tính theo `bao_cao_dau_buoi` như
  //    cũ — không đổi định nghĩa, hàng chờ và nút Nhắc ở màn Tổng quan giữ
  //    nguyên cách hoạt động.
  var LY_DO = ['Nghỉ ốm', 'Nghỉ phép', 'Công tác', 'Tập huấn', 'Việc riêng', 'Khác'];

  function veKhaiVang() {
    var duocBao = coSoDuocBao();
    if (!duocBao.length) return '';        // giáo viên thường không khai hộ ai
    if (!BC_CS || duocBao.indexOf(BC_CS) < 0) BC_CS = duocBao[0];
    var b = buoiXem();
    var gvCS = DL.gvDs.filter(function (g) { return g.coSo === BC_CS; });
    var soVang = Object.keys(BC_GV_VANG).length;

    var chonCS = duocBao.length > 1
      ? '<div class="dh-chon-hang" style="margin-bottom:10px">' + duocBao.map(function (m) {
          return '<button class="chip-loc' + (m === BC_CS ? ' on' : '') +
            '" onclick="DH.bcChonCS(\'' + nhay(m) + '\')">' + thoat(tenCoSo(m)) + '</button>';
        }).join('') + '</div>'
      : '';

    var dau = '<div class="dh-tieu-de">🧑‍🏫 Khai người vắng · ' + tenBuoi(b) + ' ' + ngayVN(homNayISO()) + '</div>' +
      '<div class="dh-ghi-chu-nho" style="margin-top:0">Chỉ báo NGƯỜI VẮNG, còn lại mặc định có mặt — ' +
      'không ai phải điểm danh từng người. Số này cộng thẳng ra bảng công cuối tháng.</div>' +
      chonCS;

    // Điểm trường chưa có ai được gán về thì nói thẳng, đừng bày nút
    // "✓ Đủ 0/0" — trông như đã điểm danh xong trong khi thực ra chưa có
    // người nào. Sau sáp nhập, hai phân hiệu mới rơi đúng vào cảnh này cho
    // tới khi Ban giám hiệu gán nơi công tác cho từng người.
    if (!gvCS.length) {
      return dau + '<div class="hd-kiem vang">Chưa có cán bộ, giáo viên nào được gán về <b>' +
        thoat(tenCoSo(BC_CS)) + '</b>.<br>Vào <b>Quản trị → Cơ sở &amp; Sáp nhập</b> gán nơi công tác ' +
        'cho từng người, rồi mới khai vắng và tính bảng công cho điểm này được.</div>';
    }

    return dau +
      '<div class="dh-chon-hang">' +
      '<button class="dh-nut-lon' + (!soVang && !BC_MO_CHON_GV ? ' on' : '') + '" onclick="DH.bcGvDu()">✓ Đủ ' + gvCS.length + '/' + gvCS.length + '</button>' +
      '<button class="dh-nut-lon' + (soVang || BC_MO_CHON_GV ? ' on' : '') + '" onclick="DH.bcGvVang()">Có người vắng</button>' +
      '</div>' +
      (BC_MO_CHON_GV
        ? '<div class="dh-hop-chon">' + gvCS.map(function (g) {
            // người chưa có email (nhân viên hợp đồng) khóa theo tên — kẻo
            // hai người cùng khóa rỗng, tick người này bỏ chọn người kia
            var khoa = g.email || ('ten:' + g.ten);
            var on = BC_GV_VANG[khoa] !== undefined;
            return '<button class="chip-loc' + (on ? ' on' : '') + '" onclick="DH.bcTickGv(this)" data-email="' + thoat(khoa) + '" data-ten="' + thoat(g.ten) + '">' + thoat(g.ten) + '</button>';
          }).join('') + '</div>' +
          (soVang ? '<div class="dh-vang-ds">' + Object.keys(BC_GV_VANG).map(function (em) {
            var v = BC_GV_VANG[em];
            return '<div class="dh-vang-o"><b>' + thoat(v.ten) + '</b>' +
              '<select class="dh-o-nhap" onchange="DH.bcLyDo(\'' + nhay(em) + '\', this.value)">' +
              LY_DO.map(function (l) { return '<option' + (v.lyDo === l ? ' selected' : '') + '>' + l + '</option>'; }).join('') +
              '</select>' +
              '<select class="dh-o-nhap" onchange="DH.bcBuoiVang(\'' + nhay(em) + '\', this.value)">' +
              '<option value="ca_ngay"' + (v.buoi !== 'sang' && v.buoi !== 'chieu' ? ' selected' : '') + '>Cả ngày</option>' +
              '<option value="sang"' + (v.buoi === 'sang' ? ' selected' : '') + '>Buổi sáng</option>' +
              '<option value="chieu"' + (v.buoi === 'chieu' ? ' selected' : '') + '>Buổi chiều</option>' +
              '</select>' +
              '<label class="dh-vang-den">nghỉ đến' +
              '<input class="dh-o-nhap" type="date" min="' + homNayISO() + '" value="' + thoat(v.denNgay || '') + '" onchange="DH.bcDenNgay(\'' + nhay(em) + '\', this.value)"></label>' +
              '</div>';
          }).join('') + '</div>' +
          '<div class="dh-ghi-chu-nho">Ô "nghỉ đến" chỉ dùng khi nghỉ NHIỀU ngày (khai một lần, khỏi báo lại từng buổi) — nghỉ trong ngày thì để trống.</div>'
          : '') +
          '<button class="dh-nut-gui' + (soVang ? '' : ' mo') + '" onclick="DH.guiVang()">LƯU NGƯỜI VẮNG</button>'
        : '');
  }

  // ════════════════════════════════════════════════════════════
  // BẢNG CÔNG THÁNG (nằm trong thẻ Điểm danh GV)
  //
  // KHÔNG có bảng cong_thang trên CSDL — bảng công TÍNH RA từ gv_vang mỗi
  // lần mở. Chép số sang một bảng riêng là tự đẻ hai nguồn sự thật: sửa sổ
  // vắng mà bảng công đứng yên, cuối năm không ai biết tin bên nào.
  //
  // Đơn vị là BUỔI (tiểu học dạy 2 buổi/ngày) — trùng đơn vị của gv_vang,
  // khỏi quy đổi. Số buổi chuẩn = số ngày làm việc × 2, trong đó ngày làm
  // việc lấy từ cau_hinh.ngay_lam_viec trừ đi bảng ngay_nghi (sql/30).
  //
  // ⚠️ CHƯA có cột dạy thay / thừa giờ: hai số đó phải có thời khóa biểu
  //    mới tính được (đợt D). Thà để trống còn hơn bịa ra một con số mà
  //    người ta đem đi tính tiền.
  // ════════════════════════════════════════════════════════════
  var CONG_THANG = '';        // 'yyyy-mm' đang xem
  var CONG_KQ = null;         // kết quả đã tính (kèm .thang để đối chiếu)
  var CONG_THU = '';          // tháng ĐÃ gọi nạp — chặn nạp lại vô hạn khi lỗi
  var CONG_DANG = false;
  var CONG_LOI = '';
  var CONG_CO_NGHI = true;    // false = chưa chạy sql/30 (thiếu bảng ngay_nghi)
  var CONG_NGHI_MAU = [];     // ngày nghỉ khai ở BẢN MẪU (không ghi CSDL)
  var CONG_CHOT = [];         // các tháng 'yyyy-mm' đã chốt (bảng cong_thang_chot)
  // Cận dưới của nút lùi tháng — không chặn thì bấm giữ lùi về tận 1999,
  // mỗi lần một truy vấn mạng. Hai năm đủ cho mọi việc đối chiếu của trường.
  var MOC_CONG_SOM = '';      // gán sau, khi đã có thangNay()/thangDich()

  // 'Tập huấn' tách riêng khỏi 'Công tác' theo bản thiết kế — nó VẪN TÍNH
  // CÔNG, khác hẳn nghỉ phép, nên phải là cột riêng chứ không gộp vào Khác.
  var CONG_LY_DO = ['Nghỉ ốm', 'Nghỉ phép', 'Công tác', 'Tập huấn', 'Việc riêng', 'Khác'];
  var TEN_LOAI_NGHI = {
    le: 'Nghỉ lễ — không tính công', nghi_bu: 'Nghỉ bù — không tính công',
    nghi_khac: 'Nghỉ khác — không tính công', lam_bu: 'Đi làm bù — CÓ tính công'
  };

  function thangNay() { var d = new Date(); return d.getFullYear() + '-' + pad2(d.getMonth() + 1); }
  function thangDich(ym, buoc) {
    var n = +ym.slice(0, 4), m = +ym.slice(5, 7) + buoc;
    n += Math.floor((m - 1) / 12);
    m = ((m - 1) % 12 + 12) % 12 + 1;
    return n + '-' + pad2(m);
  }
  // NĐ 30: chỉ tháng 1 và tháng 2 mới thêm số 0
  function thangSo(ym) { var m = +ym.slice(5, 7); return m < 3 ? '0' + m : String(m); }
  function thangChu(ym) { return 'tháng ' + thangSo(ym) + '/' + ym.slice(0, 4); }
  function soNgayThang(ym) { return new Date(+ym.slice(0, 4), +ym.slice(5, 7), 0).getDate(); }
  MOC_CONG_SOM = thangDich(thangNay(), -24);
  function isoCua(d) { return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }

  // Danh sách ngày LÀM VIỆC của tháng. thuLam theo chuẩn ISO 1=Thứ Hai…7=CN
  // (getDay() trả 0 cho Chủ nhật nên phải đổi). Thứ tự ưu tiên: lịch tuần →
  // ngày nghỉ đè lên → 'lam_bu' đè lên tất (hoán đổi ngày nghỉ dịp lễ).
  function ngayLamTrongThang(ym, thuLam, dsNghi) {
    var soNgay = soNgayThang(ym), nam = +ym.slice(0, 4), thg = +ym.slice(5, 7);
    var khongLam = {}, lamBu = {};
    (dsNghi || []).forEach(function (n) {
      if (n.loai === 'lam_bu') lamBu[n.ngay] = 1; else khongLam[n.ngay] = 1;
    });
    var ds = [];
    for (var i = 1; i <= soNgay; i++) {
      var iso = ym + '-' + pad2(i);
      var thu = new Date(nam, thg - 1, i).getDay();
      var co = thuLam.indexOf(thu === 0 ? 7 : thu) >= 0;
      if (khongLam[iso]) co = false;
      if (lamBu[iso]) co = true;
      if (co) ds.push(iso);
    }
    return ds;
  }

  // Gộp khoảng trắng thừa: danh sách nhân sự ghi "Trần  Văn Nam" (hai dấu
  // cách) mà sổ vắng ghi "Trần Văn Nam" thì phải coi là MỘT người
  function chuanTen(t) { return String(t || '').trim().replace(/\s+/g, ' ').toLowerCase(); }
  function khoaNguoi(email, ten) {
    return email ? 'e:' + String(email).trim().toLowerCase() : 't:' + chuanTen(ten);
  }

  function tinhCong(ym, dsVang, dsNghi, thuLam) {
    var soNgay = soNgayThang(ym);
    var dau = ym + '-01', cuoi = ym + '-' + pad2(soNgay);
    var dsLam = ngayLamTrongThang(ym, thuLam, dsNghi);
    // Tháng ĐANG DIỄN RA thì chỉ tính tới hôm nay. Ngày 14 mà ghi "có mặt
    // 42/42 buổi" là hứa trước một việc chưa xảy ra — trên tờ giấy đem đi
    // tính lương. Ngược lại, cô đang nghỉ thai sản sẽ bị ghi "vắng cả tháng"
    // ngay từ mùng 2.
    var t0 = homNayISO();
    var dangDienRa = (ym === t0.slice(0, 7));
    if (dangDienRa) {
      dsLam = dsLam.filter(function (iso) { return iso <= t0; });
    }
    var laLam = {};
    dsLam.forEach(function (iso) { laLam[iso] = 1; });

    var nguoi = {}, thuTu = [];
    function them(k, ten, email, coSo, trongDs) {
      if (nguoi[k]) return nguoi[k];
      nguoi[k] = { ten: ten, email: email || '', coSo: coSo || '',
        buoi: {}, baoMuon: 0, trongDs: trongDs };
      thuTu.push(k);
      return nguoi[k];
    }
    // Gieo TOÀN BỘ danh sách nhân sự trước: người không vắng buổi nào vẫn
    // phải có dòng đủ công — đó mới là bảng công, không phải danh sách vắng.
    (DL.gvDs || []).forEach(function (g, i) {
      var k = khoaNguoi(g.email, g.ten);
      // Hai người CHƯA CÓ EMAIL mà trùng tên (bảo vệ và cấp dưỡng cùng tên)
      // đụng chung một khóa. Gộp lại là công người này chạy sang người kia,
      // lại nuốt mất một dòng — nên tách bằng chỉ số.
      if (nguoi[k]) k = k + '#' + i;
      them(k, g.ten, g.email, g.coSo, true);
    });
    // Cầu nối theo TÊN: dòng vắng của nhân viên chưa có email (hợp đồng) phải
    // rơi đúng vào dòng nhân sự của người đó, chứ không đẻ thêm một dòng
    // "ngoài danh sách". Tên trùng nhau thì bỏ cầu nối — thà tách hai dòng
    // còn hơn cộng công của người này sang người kia.
    var theoTen = {};
    (DL.gvDs || []).forEach(function (g) {
      var t = chuanTen(g.ten);
      if (!t) return;
      theoTen[t] = theoTen[t] === undefined ? khoaNguoi(g.email, g.ten) : null;
    });

    (dsVang || []).forEach(function (v) {
      if (!v || !v.ngay) return;
      var kh = khoaNguoi(v.email, v.ho_ten);
      if (!nguoi[kh]) {
        var k2 = theoTen[chuanTen(v.ho_ten)];
        if (k2) kh = k2;
      }
      var ng = them(kh, v.ho_ten, v.email, v.co_so_ma, false);
      var tu = v.ngay < dau ? dau : v.ngay;
      var den = v.den_ngay || v.ngay;
      if (den > cuoi) den = cuoi;
      if (tu > den) return;
      var d = new Date(+tu.slice(0, 4), +tu.slice(5, 7) - 1, +tu.slice(8, 10));
      var coBuoi = false;      // dòng này có rơi buổi nào vào tháng đang xem không
      for (var b = 0; b < 40; b++) {
        var iso = isoCua(d);
        if (iso > den) break;
        if (laLam[iso]) {
          coBuoi = true;
          // Hai dòng chồng nhau (đơn đã duyệt + báo cáo đầu buổi cùng ngày)
          // chỉ được tính MỘT buổi — khóa theo ngày|buổi, ghi lần đầu thắng.
          if (v.buoi !== 'chieu' && ng.buoi[iso + '|sang'] === undefined) {
            ng.buoi[iso + '|sang'] = v.ly_do || 'Khác';
          }
          if (v.buoi !== 'sang' && ng.buoi[iso + '|chieu'] === undefined) {
            ng.buoi[iso + '|chieu'] = v.ly_do || 'Khác';
          }
        }
        d.setDate(d.getDate() + 1);
      }
      // Chỉ ghi ⚠ khi dòng thật sự rơi buổi vào tháng này — đơn vắt hai tháng
      // mà cộng ⚠ cho cả hai, hoặc đơn rơi trọn vào Thứ Bảy–Chủ nhật mà vẫn
      // cộng ⚠, đều là trách oan người ta.
      if (v.bao_muon && coBuoi) ng.baoMuon++;
    });

    var buoiChuan = dsLam.length * 2;
    var hang = thuTu.map(function (k) {
      var ng = nguoi[k], theo = {}, tong = 0;
      Object.keys(ng.buoi).forEach(function (kk) {
        var ld = ng.buoi[kk];
        if (CONG_LY_DO.indexOf(ld) < 0) ld = 'Khác';
        theo[ld] = (theo[ld] || 0) + 1;
        tong++;
      });
      return { ten: ng.ten, email: ng.email, coSo: ng.coSo, theo: theo, tong: tong,
        coMat: Math.max(0, buoiChuan - tong), baoMuon: ng.baoMuon, trongDs: ng.trongDs };
    });
    // Sắp theo cơ sở (đúng thứ tự khai báo) rồi theo TÊN như danh sách trường
    var ttCS = {};
    (DL.coSo || []).forEach(function (c, i) { ttCS[c.ma] = i; });
    function tenCuoi(t) { var p = String(t || '').trim().split(/\s+/); return p[p.length - 1] || ''; }
    hang.sort(function (a, b) {
      var ca = ttCS[a.coSo] === undefined ? 99 : ttCS[a.coSo];
      var cb = ttCS[b.coSo] === undefined ? 99 : ttCS[b.coSo];
      return ca - cb || tenCuoi(a.ten).localeCompare(tenCuoi(b.ten), 'vi') ||
        String(a.ten).localeCompare(String(b.ten), 'vi');
    });
    return { thang: ym, soNgayLam: dsLam.length, buoiChuan: buoiChuan,
      dangDienRa: dangDienRa, tinhDen: dangDienRa ? t0 : cuoi,
      nghi: (dsNghi || []).slice().sort(function (a, b) { return a.ngay < b.ngay ? -1 : 1; }),
      hang: hang };
  }

  function napCong(ym) {
    if (!/^\d{4}-\d{2}$/.test(ym)) return;
    CONG_THU = ym; CONG_DANG = true; CONG_LOI = '';
    var soNgay = soNgayThang(ym), dau = ym + '-01', cuoi = ym + '-' + pad2(soNgay);

    if (!THAT) {
      // Bản mẫu: dựng vài dòng vắng GIẢ ĐỊNH rơi đúng ngày làm việc của tháng
      // đang xem, để thầy cô nhìn thấy bảng có số chứ không phải bảng trống.
      var nghiMau = CONG_NGHI_MAU.filter(function (n) { return n.ngay.slice(0, 7) === ym; });
      // Chỉ lấy ngày ĐÃ QUA — tinhCong cắt tháng đang diễn ra tại hôm nay,
      // chọn ngày tương lai thì bảng mẫu ra trống trơn suốt đầu tháng
      var t0m = homNayISO();
      var lam = ngayLamTrongThang(ym, [1, 2, 3, 4, 5], nghiMau)
        .filter(function (iso) { return iso <= t0m; });
      var mau = [];
      if (lam.length > 5) {
        mau = [
          { ngay: lam[1], den_ngay: null, buoi: 'ca_ngay', ho_ten: 'Cô Nguyễn Thị A.',
            email: 'mau0@mau', co_so_ma: 'CS01', ly_do: 'Nghỉ ốm', bao_muon: true },
          { ngay: lam[2], den_ngay: lam[4], buoi: 'ca_ngay', ho_ten: 'Thầy Phạm Văn D.',
            email: 'mau2@mau', co_so_ma: 'CS01', ly_do: 'Công tác', bao_muon: false },
          { ngay: lam[3], den_ngay: null, buoi: 'sang', ho_ten: 'Cô Bùi Thị K.',
            email: 'mau6@mau', co_so_ma: 'CS01', ly_do: 'Việc riêng', bao_muon: false }
        ];
      }
      CONG_CO_NGHI = true;
      CONG_KQ = tinhCong(ym, mau, nghiMau, [1, 2, 3, 4, 5]);
      CONG_DANG = false;
      return;
    }

    var may = window.MAY_CHU;
    Promise.all([
      // Mọi dòng vắng CHẠM vào tháng: bắt đầu trước ngày cuối tháng, và
      // (nghỉ 1 ngày thì ngày đó ≥ đầu tháng) hoặc (nghỉ dài thì kéo tới ≥ đầu tháng)
      may.from('gv_vang')
        .select('ngay, den_ngay, buoi, ho_ten, email, co_so_ma, ly_do, bao_muon')
        .lte('ngay', cuoi)
        // ⚠ KHÔNG thêm dấu ')' ở cuối — supabase-js tự bọc thành or=(…).
        // Thừa một ngoặc là PostgREST đọc ngày thành "2026-08-01)" rồi hỏng
        // cả truy vấn. Đối chiếu đúng bản đã chạy thật ở napHomNay.
        .or('and(den_ngay.is.null,ngay.gte.' + dau + '),den_ngay.gte.' + dau),
      may.from('ngay_nghi').select('id, ngay, loai, ten')
        .gte('ngay', dau).lte('ngay', cuoi).order('ngay'),
      may.from('cau_hinh').select('gia_tri').eq('khoa', 'ngay_lam_viec').limit(1),
      may.from('cong_thang_chot').select('thang')
    ]).then(function (kq) {
      if (kq[0].error) throw kq[0].error;
      var nghi = [];
      CONG_CO_NGHI = true;
      if (kq[1].error) {
        if (!loiThieuBang(kq[1].error)) throw kq[1].error;
        CONG_CO_NGHI = false;              // chưa chạy sql/30 — vẫn cộng được, chỉ thiếu ngày lễ
      } else {
        nghi = kq[1].data || [];
      }
      var thuLam = [1, 2, 3, 4, 5];
      if (!kq[2].error && kq[2].data && kq[2].data[0] && kq[2].data[0].gia_tri) {
        var ds = String(kq[2].data[0].gia_tri).split(',')
          .map(function (x) { return parseInt(x, 10); })
          .filter(function (x) { return x >= 1 && x <= 7; });
        if (ds.length) thuLam = ds;
      }
      CONG_CHOT = (kq[3] && !kq[3].error) ? (kq[3].data || []).map(function (x) { return x.thang; }) : [];
      CONG_KQ = tinhCong(ym, kq[0].data || [], nghi, thuLam);
      CONG_DANG = false;
      veGiu();
    }).catch(function (e) {
      CONG_LOI = 'Không đọc được bảng công: ' + ((e && e.message) || e);
      CONG_KQ = null; CONG_DANG = false;
      veGiu();
    });
  }

  function veBangCong() {
    if (!CONG_THANG) CONG_THANG = thangNay();
    if (!CONG_DANG && CONG_THU !== CONG_THANG) napCong(CONG_THANG);

    var tieuDe = '<div class="dh-tieu-de" style="margin-top:22px">📋 Bảng công ' + thangChu(CONG_THANG) + '</div>';
    var truoc = thangDich(CONG_THANG, -1), sau = thangDich(CONG_THANG, 1);
    var dieuHuong = '<div class="dh-chon-hang" style="margin-bottom:8px">' +
      (CONG_THANG > MOC_CONG_SOM
        ? '<button class="chip-loc" onclick="DH.congThang(-1)">← ' + thangChu(truoc) + '</button>' : '') +
      (CONG_THANG < thangNay()
        ? '<button class="chip-loc" onclick="DH.congThang(1)">' + thangChu(sau) + ' →</button>' : '') +
      '</div>';

    if (!CONG_KQ || CONG_KQ.thang !== CONG_THANG) {
      return tieuDe + dieuHuong + '<div class="the-thong-bao">' +
        (CONG_LOI ? '⚠ ' + thoat(CONG_LOI) : 'Đang cộng bảng công…') + '</div>';
    }

    var k = CONG_KQ, qt = laQT();
    // BGH xem toàn trường; giáo viên xem đúng dòng của mình (RLS vẫn cho đọc
    // hết — đây là lọc hiển thị cho đỡ tò mò, không phải hàng rào bảo mật)
    var hang = qt ? k.hang : k.hang.filter(function (h) {
      return emailBang(h.email, emailToi()) || (!h.email && h.ten === tenToi());
    });

    var nhieuCS = DL.coSo.length > 1;
    var soCot = 1 + (nhieuCS ? 1 : 0) + CONG_LY_DO.length + 3;
    var dauBang = '<tr><th class="cot-dinh" style="text-align:left">CBGV-NV</th>' +
      (nhieuCS ? '<th style="text-align:center">Cơ sở</th>' : '') +
      CONG_LY_DO.map(function (l) { return '<th style="text-align:center">' + l + '</th>'; }).join('') +
      '<th style="text-align:center">Tổng vắng</th><th style="text-align:center">Có mặt</th>' +
      '<th style="text-align:center">⚠</th></tr>';
    var than = hang.length
      ? hang.map(function (h) {
          // Cột tên DÍNH khi cuộn ngang: bảng 10 cột rộng gần 2,5 màn điện
          // thoại, trôi mất cột tên là nhìn thấy số mà không biết của ai.
          return '<tr><td class="cot-dinh"><b>' + thoat(h.ten) + '</b>' +
            (h.trongDs ? '' : ' <small class="dh-vang">(ngoài danh sách nhân sự)</small>') + '</td>' +
            (nhieuCS ? '<td style="text-align:center">' + thoat(tenCoSo(h.coSo)) + '</td>' : '') +
            CONG_LY_DO.map(function (l) {
              return '<td style="text-align:center">' + (h.theo[l] || '') + '</td>';
            }).join('') +
            '<td style="text-align:center">' + (h.tong ? '<b>' + h.tong + '</b>' : '') + '</td>' +
            '<td style="text-align:center"><b>' + h.coMat + '</b></td>' +
            '<td style="text-align:center">' + (h.baoMuon ? '<b class="dh-do">' + h.baoMuon + '</b>' : '') + '</td></tr>';
        }).join('')
      : '<tr><td colspan="' + soCot + '">' + (qt
          ? 'Chưa có dữ liệu nhân sự.'
          : 'Chưa tra được dòng của thầy/cô — thường là do email tài khoản khác email trong ' +
            'danh sách nhân sự. Nhờ Ban giám hiệu đối chiếu ở Quản trị → Tài khoản.') +
        '</td></tr>';

    var bang = '<div class="cuon-ngang"><table class="bang-quan-tri nho bang-cong"><thead>' + dauBang +
      '</thead><tbody>' + than + '</tbody></table></div>';

    var canhBaoNghi = CONG_CO_NGHI ? '' :
      '<div class="hd-kiem vang">Chưa cài bảng ngày nghỉ (tệp <b>sql/30-bang-cong.sql</b>) — ' +
      'bảng công đang tính theo lịch tuần, <b>chưa trừ ngày lễ</b>. Nhờ quản trị chạy sql/30 rồi tải lại trang.</div>';

    // Khối này là khối DUY NHẤT của module dựng số bằng phép tính, nên phải
    // đeo nhãn thật/mẫu rõ hơn cả các khối khác — số công là số đi tính lương.
    var nhan = THAT
      ? '<div class="hd-kiem xanh" style="margin-top:0">Cộng từ sổ vắng THẬT của nhà trường.</div>'
      : '<div class="hd-kiem vang" style="margin-top:0">🧪 <b>BẢN MẪU</b> — tên người và số buổi dưới đây là ' +
        'DỮ LIỆU GIẢ ĐỊNH, không phải nhân sự thật. Đăng nhập để xem bảng công thật.</div>';

    var mocTinh = k.dangDienRa
      ? 'Tháng chưa kết thúc — <b>tính đến hết ngày ' + ngayVN(k.tinhDen) + '</b>: '
      : 'Cả ' + thangChu(CONG_THANG) + ': ';
    var moTa = '<div class="dh-ghi-chu-nho" style="margin-top:0">Đơn vị là <b>buổi</b> (2 buổi/ngày). ' +
      mocTinh + '<b>' + k.soNgayLam + '</b> ngày làm việc = <b>' + k.buoiChuan + '</b> buổi chuẩn. ' +
      'Toàn bộ số liệu cộng ra từ sổ vắng đã bấm mỗi ngày — <b>không ai nhập lại</b>. ' +
      'Cột ⚠ đếm số lần báo nghỉ <b>sau hạn</b> (quy định là báo trước ít nhất 1 buổi). ' +
      'Danh sách lấy từ <b>danh sách nhân sự</b> của trường (' + k.hang.length + ' người); ' +
      'ai chưa có trong đó thì chưa có dòng. ' +
      'Dạy thay và thừa giờ <b>chưa có</b>: hai số đó cần thời khóa biểu.</div>';

    // "Chốt bảng công tháng" của bản thiết kế — KHÔNG chép số sang bảng khác
    // (bảng công vẫn cộng từ sổ vắng), mà KHOÁ SỬA sổ vắng của tháng đó với
    // người phụ trách điểm. Chốt rồi thì mọi con số đứng yên, nhưng vẫn luôn
    // khớp sổ gốc — không bao giờ có hai nguồn sự thật.
    var daChot = CONG_CHOT.indexOf(CONG_THANG) >= 0;
    var nutChot = qt
      ? (daChot
        ? '<div class="hd-kiem xanh">🔒 <b>Đã chốt ' + thangChu(CONG_THANG) + '</b> — người phụ trách điểm ' +
          'không sửa được sổ vắng của tháng này nữa. ' +
          '<a href="javascript:DH.congMoChot()">Mở lại để đính chính</a></div>'
        : '<button class="dh-nut-nho" style="margin-top:8px" onclick="DH.congChot()">🔒 Chốt bảng công tháng</button>')
      : '';

    var nutWord = qt
      ? '<button class="dh-nut-nho" style="margin-top:8px" onclick="DH.congWord()">📄 Xuất Word (A4 ngang)</button>' +
        (k.dangDienRa
          ? '<div class="dh-ghi-chu-nho">Xuất giữa tháng thì bản Word ghi rõ "tính đến ngày ' +
            ngayVN(k.tinhDen) + '" — đợi hết tháng mới là bản chốt.</div>'
          : '')
      : '';

    return tieuDe + dieuHuong + nhan + canhBaoNghi + moTa + bang + nutChot + nutWord + veNgayNghi();
  }

  // ── Khai ngày nghỉ của tháng (BGH) — Tết và Giỗ Tổ theo âm lịch, số ngày
  //    nghỉ thêm dịp Quốc khánh do Chính phủ báo hằng năm, nên phải nhập tay ──
  function veNgayNghi() {
    if (!laQT() || !CONG_KQ) return '';
    var ym = CONG_THANG, dau = ym + '-01', cuoi = ym + '-' + pad2(soNgayThang(ym));
    var ds = CONG_KQ.nghi.length
      ? CONG_KQ.nghi.map(function (n) {
          return '<div class="dh-diem-hang" style="padding:8px 12px">' +
            '<span class="dh-cham ' + (n.loai === 'lam_bu' ? 'xanh' : 'vang') + '"></span>' +
            '<div class="tt"><b>' + ngayVN(n.ngay) + ' — ' + thoat(n.ten) + '</b>' +
            '<small>' + (TEN_LOAI_NGHI[n.loai] || thoat(n.loai)) + '</small></div>' +
            (n.id ? '<button class="dh-nut-nho" onclick="DH.nghiXoa(' + n.id + ')">Xóa</button>' : '') +
            '</div>';
        }).join('')
      : '<div class="dh-ghi-chu-nho">Tháng này chưa khai ngày nghỉ nào.</div>';

    return '<div class="dh-tieu-de" style="margin-top:18px">📌 Ngày nghỉ trong ' + thangChu(ym) + '</div>' + ds +
      '<div class="dh-chon-hang" style="margin-top:8px;flex-wrap:wrap">' +
      '<input class="dh-o-nhap" type="date" id="dh-nghi-ngay" style="width:auto;margin-top:0" min="' + dau + '" max="' + cuoi + '">' +
      '<input class="dh-o-nhap" id="dh-nghi-ten" style="max-width:220px;margin-top:0" placeholder="Tên ngày nghỉ (VD: Nghỉ bù Tết)">' +
      '<select class="dh-o-nhap" id="dh-nghi-loai" style="width:auto;margin-top:0">' +
      Object.keys(TEN_LOAI_NGHI).map(function (m) {
        return '<option value="' + m + '">' + TEN_LOAI_NGHI[m] + '</option>';
      }).join('') + '</select>' +
      '<button class="dh-nut-nho" onclick="DH.nghiThem()">＋ Thêm</button></div>' +
      '<div class="dh-ghi-chu-nho">Ngày lễ dương lịch cố định đã gieo sẵn. <b>Tết Nguyên đán, Giỗ Tổ Hùng Vương</b> theo âm lịch ' +
      'và số ngày nghỉ thêm dịp Quốc khánh thì Ban giám hiệu tự khai ở đây. Chọn <b>Đi làm bù</b> cho ngày hoán đổi ' +
      'rơi vào thứ Bảy / Chủ nhật.</div>';
  }

  // ════════════════════════════════════════════════════════════
  // TAB · ĐỀ XUẤT — GV gửi đơn vài chạm; BGH duyệt tại "Cần tôi xử lý".
  // Duyệt đơn nghỉ KHÔNG dừng ở đổi trạng thái: hàm duyet_de_xuat (sql/25)
  // tự ghi vào gv_vang — người phụ trách điểm khỏi báo lại người này.
  // ════════════════════════════════════════════════════════════
  var DX_LOAI = null;

  function ttDX(tt) {
    return tt === 'cho_duyet' ? '<span class="dh-vang">⏳ Chờ duyệt</span>'
      : tt === 'dong_y' ? '<span class="dh-xanh">✅ Đã duyệt</span>'
      : '<span class="dh-do">✖ Từ chối</span>';
  }
  function dongDX(d, keomNut) {
    return '<div class="dh-diem-hang"><span class="dh-cham ' +
      (d.tt === 'cho_duyet' ? 'vang' : d.tt === 'dong_y' ? 'xanh' : 'do') + '"></span>' +
      '<div class="tt"><b>' + thoat(d.ten) + ' — ' + thoat(tenLoaiDX(d.loai)) + '</b>' +
      '<small>' + thoat(d.noiDung) +
      (d.tuNgay ? ' · ' + ngayVN(d.tuNgay) + (d.denNgay ? '–' + ngayVN(d.denNgay) : '') +
        (d.buoi !== 'ca_ngay' ? ' (' + tenBuoi(d.buoi) + ')' : '') : '') + '</small>' +
      '<small>' + ttDX(d.tt) +
      (d.nguoiDuyet ? ' — ' + thoat(d.nguoiDuyet) : '') +
      (d.ghiChuDuyet ? ' · ' + thoat(d.ghiChuDuyet) : '') + '</small></div>' +
      (keomNut || '') + '</div>';
  }

  function veDeXuat() {
    if (THAT && !DL.dxCoBang) {
      return '<div class="hd-kiem vang" style="margin-top:0">Chức năng Đề xuất cần chạy <b>sql/25-dieu-hanh-dot-2.sql</b> ' +
        'trên Supabase rồi tải lại trang. Các phần khác của module không bị ảnh hưởng.</div>';
    }
    var laNghi = LOAI_DX_NGHI.indexOf(DX_LOAI) >= 0;
    // bản mẫu không có đăng nhập — coi 'mau@mau' là "tôi" để xem thử đủ luồng
    var toi = THAT ? emailToi() : 'mau@mau';
    // cơ sở mặc định = cơ sở của chính người gửi
    var csToi = coSoCuaToi() || (DL.coSo[0] || {}).ma || '';

    var chips = '<div class="dh-hop-chon" style="margin-top:2px">' + LOAI_DX_DS.map(function (l) {
      return '<button class="chip-loc' + (DX_LOAI === l.ma ? ' on' : '') + '" onclick="DH.dxLoai(\'' + l.ma + '\')">' + l.ten + '</button>';
    }).join('') + '</div>';

    var form = '';
    if (DX_LOAI) {
      var oNgay = laNghi
        ? '<div class="dh-chon-hang" style="margin:8px 0">' +
          '<label style="font-size:13px">Từ ngày <input class="dh-o-nhap" type="date" id="dh-dx-tu" style="width:auto;margin-top:0" value="' + ngayISOCach(1) + '"></label>' +
          '<label style="font-size:13px">đến <input class="dh-o-nhap" type="date" id="dh-dx-den" style="width:auto;margin-top:0"></label>' +
          '<select class="dh-o-nhap" id="dh-dx-buoi" style="width:auto;margin-top:0">' +
          '<option value="ca_ngay">Cả ngày</option><option value="sang">Buổi sáng</option><option value="chieu">Buổi chiều</option></select>' +
          '</div>' +
          '<div class="dh-ghi-chu-nho" style="margin-top:0">Nghỉ MỘT ngày thì bỏ trống ô "đến". Quy định đã chốt: báo trước ít nhất 1 buổi — ' +
          'chọn từ hôm nay trở về trước vẫn gửi được nhưng đơn mang dấu ⚠ báo muộn.</div>'
        : '';
      var oCS = DL.coSo.length > 1
        ? '<select class="dh-o-nhap" id="dh-dx-coso" style="margin-top:8px">' + DL.coSo.map(function (c) {
            return '<option value="' + thoat(c.ma) + '"' + (c.ma === csToi ? ' selected' : '') + '>' + thoat(c.ten) + '</option>';
          }).join('') + '</select>'
        : '';
      form = oNgay + oCS +
        '<textarea class="dh-o-nhap" id="dh-dx-noidung" rows="2" placeholder="' +
        (laNghi ? 'Lý do (ngắn gọn)…' : 'Nội dung đề xuất (ngắn gọn)…') + '"></textarea>' +
        '<button class="dh-nut-gui" onclick="DH.dxGui()">GỬI ĐỀ XUẤT</button>';
    }

    var choDuyet = (DL.deXuat || []).filter(function (d) { return d.tt === 'cho_duyet'; });
    var khoiDuyet = laQT() && choDuyet.length
      ? '<div class="dh-tieu-de">⏳ Chờ duyệt (' + choDuyet.length + ')</div>' +
        choDuyet.map(function (d) {
          return dongDX(d,
            '<button class="dh-nut-hd xanh" onclick="DH.dxDuyet(' + d.id + ', true)">✓ Duyệt</button>' +
            '<button class="dh-nut-hd vien" onclick="DH.dxDuyet(' + d.id + ', false)">✗ Trao đổi lại</button>');
        }).join('')
      : '';

    // Đơn CỦA TÔI nhận theo id tài khoản trước (email có thể trống), email là dự phòng
    var cuaToi = (DL.deXuat || []).filter(function (d) {
      return (d.guiId && d.guiId === idToi()) || emailBang(d.email, toi);
    });
    var dsToi = cuaToi.length
      ? '<div class="dh-tieu-de">Đơn của tôi</div>' + cuaToi.slice(0, 10).map(function (d) {
          return dongDX(d, d.tt === 'cho_duyet'
            ? '<button class="dh-nut-nho" onclick="DH.dxRut(' + d.id + ')">Rút đơn</button>' : '');
        }).join('')
      : '';

    var ganDay = laQT()
      ? '<div class="dh-tieu-de">Gần đây</div>' +
        ((DL.deXuat || []).filter(function (d) { return d.tt !== 'cho_duyet'; }).slice(0, 10)
          .map(function (d) { return dongDX(d, ''); }).join('') ||
          '<div class="the-thong-bao">Chưa có đề xuất nào được xử lý.</div>')
      : '';

    return '<div class="hd-kiem ' + (THAT ? 'xanh' : 'vang') + '" style="margin-top:0">Chọn loại đề xuất — mỗi loại chỉ hỏi đúng thứ cần thiết. ' +
      'Đơn được duyệt là hệ thống tự làm bước tiếp theo (ví dụ đơn nghỉ tự vào danh sách vắng), không ai phải nhập lại.</div>' +
      '<div class="dh-tieu-de" style="margin-top:2px">＋ Tạo đề xuất</div>' +
      chips + form + khoiDuyet + dsToi + ganDay;
  }

  // ════════════════════════════════════════════════════════════
  // TAB 3 · ĐIỂM DANH HỌC SINH
  // ════════════════════════════════════════════════════════════
  var LOP_MO = null;        // lớp đang mở ô chọn em vắng
  var LOP_CHON = {};        // {hoc_sinh_ma: phep} của lớp đang mở
  var DS_DANG_MO = [];      // danh sách HS của lớp đang mở

  function veDiemDanh() {
    var b = buoiXem();
    var theoKhoi = {};
    Object.keys(DL.lop).sort().forEach(function (l) {
      var k = DL.lop[l].khoi;
      (theoKhoi[k] = theoKhoi[k] || []).push(l);
    });
    var PHEP = { co_phep: 'P', khong_phep: 'K', chua_ro: '?' };

    var noiDung = Object.keys(theoKhoi).sort().map(function (k) {
      var the = theoKhoi[k].map(function (l) {
        var info = DL.lop[l];
        var d = DL.ddLop[b][l];
        var dau;
        if (d) {
          var vangLop = DL.hsVang.filter(function (v) { return v.lop === l && v.buoi === b; });
          dau = '<div class="dh-lop-xong">🟢 ' + (d.siSo - d.soVang) + '/' + d.siSo + ' có mặt (' + d.luc + ')' +
            (vangLop.length
              ? ' · vắng: ' + vangLop.map(function (v) { return thoat(v.ten) + ' (' + (PHEP[v.phep] || '?') + ')'; }).join(', ')
              : ' · đủ') + '</div>' +
            '<button class="dh-nut-nho" style="margin-top:8px" onclick="DH.ddSua(\'' + nhay(l) + '\')">✏ Sửa</button>';
        } else if (LOP_MO === l) {
          var soChon = Object.keys(LOP_CHON).length;
          dau = '<div class="dh-hop-chon">' + DS_DANG_MO.map(function (h) {
            var on = LOP_CHON[h.ma] !== undefined;
            return '<button class="chip-loc' + (on ? ' on' : '') + '" onclick="DH.ddTick(this)" data-ma="' + thoat(h.ma) + '" data-ten="' + thoat(h.ten) + '">' + thoat(h.ten) + '</button>';
          }).join('') +
          '<div class="dh-ghi-chu-nho">Chạm tên em vắng rồi chọn Có phép / Không phép / Chưa rõ ở dưới.</div></div>' +
          (soChon ? Object.keys(LOP_CHON).map(function (ma) {
            var c = LOP_CHON[ma];
            return '<div class="dh-diem-hang" style="padding:8px 12px"><div class="tt"><b>' + thoat(c.ten) + '</b></div>' +
              '<select class="dh-o-nhap" style="max-width:140px" onchange="DH.ddPhep(\'' + nhay(ma) + '\', this.value)">' +
              '<option value="co_phep"' + (c.phep === 'co_phep' ? ' selected' : '') + '>Có phép</option>' +
              '<option value="khong_phep"' + (c.phep === 'khong_phep' ? ' selected' : '') + '>Không phép</option>' +
              '<option value="chua_ro"' + (c.phep === 'chua_ro' ? ' selected' : '') + '>Chưa rõ</option>' +
              '</select></div>';
          }).join('') : '') +
          '<div class="dh-chon-hang" style="margin-top:8px">' +
          '<button class="dh-nut-nho" onclick="DH.ddLuu(\'' + nhay(l) + '\')">💾 Lưu điểm danh (' + soChon + ' vắng)</button>' +
          '<button class="dh-nut-nho" onclick="DH.ddDong()">Hủy</button></div>';
        } else {
          dau = '<div class="dh-chon-hang">' +
            '<button class="dh-nut-lon" onclick="DH.ddDu(\'' + nhay(l) + '\')">✓ ĐỦ ' + info.siSo + '/' + info.siSo + '</button>' +
            '<button class="dh-nut-lon phu" onclick="DH.ddMoVang(\'' + nhay(l) + '\')">Có HS vắng</button></div>';
        }
        return '<div class="dh-lop-the"><div class="dh-lop-ten">Lớp ' + thoat(l) +
          ' <small>· sĩ số ' + info.siSo + '</small></div>' + dau + '</div>';
      }).join('');
      return '<div class="dh-tieu-de">Khối ' + k + '</div>' + the;
    }).join('');

    return '<div class="hd-kiem ' + (THAT ? 'xanh' : 'vang') + '" style="margin-top:0">Điểm danh <b>' + tenBuoi(buoiXem()) + ' ' +
      ngayVN(homNayISO()) + '</b> — giáo viên dạy đầu buổi bấm lớp mình dạy: lớp đủ thì đúng MỘT nút, ' +
      'chỉ khi có em vắng mới chọn tên. Hệ thống ghi lại ai điểm danh, lúc mấy giờ.</div>' + noiDung;
  }

  // ════════════════════════════════════════════════════════════
  // TAB 4 · DẠY THAY (bản mẫu — chờ thời khóa biểu)
  // ════════════════════════════════════════════════════════════
  function veDayThay() {
    var daDu = DAY_THAY.every(function (x) { return x.gv; });
    // Phần này nay nối SAU lịch công tác tuần (là dữ liệu thật) trên cùng một
    // màn cuộn. Phải có tiêu đề và băng cảnh báo riêng, kẻo cuộn tới đây gặp
    // "Lớp 3B" rồi tưởng lớp 3B thật đang thiếu người dạy.
    return '<div class="dh-tieu-de" style="margin-top:26px">👨‍🏫 Dạy thay theo tiết</div>' +
      '<div class="hd-kiem vang" style="margin-top:0">🧪 <b>BẢN MẪU — toàn bộ tên người, tên lớp dưới đây là GIẢ ĐỊNH.</b> ' +
      'Bố trí dạy thay theo TIẾT cần thời khóa biểu. ' +
      'Khi nhà trường gửi file TKB Excel, hệ thống sẽ đọc và mở chức năng này với dữ liệu thật. ' +
      'Nguyên tắc đã chốt: giáo viên báo nghỉ <b>trước ít nhất 1 buổi</b>; báo muộn vẫn gửi được nhưng bị đánh dấu ⚠.</div>' +
      // Nút nạp TKB là việc của Ban giám hiệu — trước đây thẻ Dạy thay riêng
      // nên giáo viên không mở tới, nay nó nằm trong thẻ họ xem mỗi ngày
      (laQT()
        ? '<button class="dh-nut-nho" style="margin-bottom:10px" onclick="window.notify(\'Khi có thời khóa biểu thật (Excel), nạp tại đây — hệ thống đọc bằng SheetJS ngay trên trình duyệt.\')">📥 Nạp thời khóa biểu (Excel)</button>'
        : '') +
      '<div class="dh-tieu-de">Đơn báo nghỉ (mẫu)</div>' +
      '<div class="dh-diem-hang"><span class="dh-cham vang"></span>' +
      '<div class="tt"><b>Cô Nguyễn Thị A. — Nghỉ ốm</b>' +
      '<small>Sáng nay · chủ nhiệm lớp 3B · báo lúc 20:15 hôm qua ✓ đúng quy định (trước ≥ 1 buổi)</small></div></div>' +
      '<div class="dh-tieu-de">Lớp 3B — buổi sáng (theo thời khóa biểu mẫu)</div>' +
      DAY_THAY.map(function (x) {
        return '<div class="dh-tiet' + (x.gv ? ' xong' : '') + '">' +
          '<span class="dh-tiet-so">Tiết ' + x.tiet + '</span>' +
          '<span class="dh-tiet-mon">' + thoat(x.mon) + '</span>' +
          (x.gv ? '<span class="dh-tiet-gv">🟢 ' + thoat(x.gv) + '</span>'
                : '<span class="dh-tiet-gv thieu">🔴 chưa có người</span>') + '</div>';
      }).join('') +
      (daDu || !laQT() ? '' :
        '<div class="dh-tieu-de">Gợi ý người dạy thay các tiết còn thiếu</div>' +
        '<div class="dh-ghi-chu-nho" style="margin-top:0">Hệ thống tra thời khóa biểu, chỉ hiện người <b>rảnh</b>; xếp trên: cùng điểm trường → ' +
        'cùng khối → <b>ít tiết dạy thay trong tháng</b> (chia đều, không dồn một người).</div>' +
        GOI_Y_RANH.map(function (g) {
          return '<button class="dh-goiy" onclick="DH.dtChon(\'' + thoat(g.ten) + '\')">' +
            '<b>' + thoat(g.ten) + '</b><small>' + thoat(g.nhan) + '</small><span>Chọn dạy các tiết còn thiếu →</span></button>';
        }).join('')) +
      '<div class="dh-tieu-de">Nhật ký dạy thay tháng này (mẫu)</div>' +
      '<div class="cuon-ngang"><table class="bang-quan-tri nho"><thead><tr>' +
      '<th>Giáo viên</th><th>Số tiết dạy thay</th><th>Thay cho</th></tr></thead><tbody>' +
      '<tr><td>Cô Lê Thị C.</td><td style="text-align:center"><b>6</b></td><td>Cô Nguyễn Thị A. (ốm)</td></tr>' +
      '<tr><td>Thầy Đỗ Văn H.</td><td style="text-align:center"><b>4</b></td><td>Thầy Trần Văn B. (công tác)</td></tr>' +
      '</tbody></table></div>' +
      '<div class="dh-ghi-chu-nho">Cuối tháng bảng này là căn cứ tính tăng giờ, xét thi đua — tự sinh từ thao tác bố trí, không ai phải ghi sổ lại.</div>';
  }

  // ════════════════════════════════════════════════════════════
  // TAB 5 · VIỆC TRONG TUẦN
  // ════════════════════════════════════════════════════════════
  var TT_VIEC = { chua: ['⚪', 'Chưa thực hiện'], dang: ['🟡', 'Đang thực hiện'], xong: ['🟢', 'Hoàn thành'] };
  var MUC_VIEC = { binh_thuong: '', quan_trong: '<span class="dh-muc qt">Quan trọng</span>', khan: '<span class="dh-muc kh">Khẩn</span>' };
  var VIEC_LOC = '';       // '' = tự chọn theo vai trò; 'cuatoi' | 'tatca'

  function veViec() {
    var t = homNayISO();
    // BGH mặc định xem TẤT CẢ, giáo viên mặc định xem VIỆC CỦA TÔI
    var loc = VIEC_LOC || (laQT() ? 'tatca' : 'cuatoi');
    var toi = emailToi();
    var dsViec = loc === 'cuatoi'
      ? DL.viec.filter(function (v) { return emailBang(v.nguoiEmail, toi); })
      : DL.viec;
    var xong = dsViec.filter(function (v) { return v.tt === 'xong'; }).length;
    var dang = dsViec.filter(function (v) { return v.tt === 'dang'; }).length;
    var quaHan = dsViec.filter(function (v) { return v.han && v.han < t && v.tt !== 'xong'; }).length;

    var chipLoc = '<div class="dh-chon-hang" style="margin-bottom:8px">' +
      '<button class="chip-loc' + (loc === 'cuatoi' ? ' on' : '') + '" onclick="DH.vLoc(\'cuatoi\')">Việc của tôi</button>' +
      '<button class="chip-loc' + (loc === 'tatca' ? ' on' : '') + '" onclick="DH.vLoc(\'tatca\')">Tất cả</button></div>';

    var theoNguoi = {};
    dsViec.forEach(function (v) { (theoNguoi[v.nguoiTen] = theoNguoi[v.nguoiTen] || []).push(v); });

    var dsNguoi = Object.keys(theoNguoi).map(function (ng) {
      var ds = theoNguoi[ng];
      var dong = ds.map(function (v) {
        var tt = TT_VIEC[v.tt];
        var qh = v.han && v.han < t && v.tt !== 'xong';
        var suaDuoc = laQT() || emailBang(v.nguoiEmail, emailToi());
        return '<div class="dh-viec' + (qh ? ' qua-han' : '') + '">' +
          (suaDuoc
            ? '<button class="dh-viec-tt" title="Chạm để chuyển trạng thái" onclick="DH.vDoi(' + v.id + ')">' + tt[0] + '</button>'
            : '<span class="dh-viec-tt">' + tt[0] + '</span>') +
          '<div class="tt"><b>' + thoat(v.noiDung) + '</b> ' + (MUC_VIEC[v.muc] || '') +
          '<small>' + thoat(v.coSo ? tenCoSo(v.coSo) : 'Toàn trường') +
          (v.han ? ' · hạn: ' + ngayVN(v.han) : '') + (qh ? ' · <b class="dh-do">QUÁ HẠN</b>' : '') +
          ' · ' + tt[1] + (v.tienDo ? ' — ' + thoat(v.tienDo) : '') + '</small></div>' +
          (suaDuoc ? '<button class="dh-nut-nho" title="Ghi tiến độ / vướng mắc" onclick="DH.vTienDo(' + v.id + ')">✎</button>' : '') +
          '</div>';
      }).join('');
      var soXong = ds.filter(function (v) { return v.tt === 'xong'; }).length;
      return '<div class="dh-nguoi-nhom"><div class="dh-nguoi-ten">' + thoat(ng) +
        ' <small>' + soXong + '/' + ds.length + ' việc hoàn thành</small></div>' + dong + '</div>';
    }).join('') || '<div class="the-thong-bao">Chưa có việc nào được giao.</div>';

    var formGiao = laQT()
      ? '<div class="dh-giao-viec">' +
        '<input class="dh-o-nhap" id="dh-viec-noidung" placeholder="Giao việc nhanh: nội dung công việc…">' +
        '<div class="dh-chon-hang">' +
        '<select class="dh-o-nhap" id="dh-viec-nguoi">' + DL.gvDs.map(function (g) {
          return '<option value="' + thoat(g.email) + '">' + thoat(g.ten) + '</option>';
        }).join('') + '</select>' +
        '<input class="dh-o-nhap" type="date" id="dh-viec-han" style="width:auto;margin-top:0" value="' + t + '">' +
        '<select class="dh-o-nhap" id="dh-viec-muc"><option value="binh_thuong">Bình thường</option><option value="quan_trong">Quan trọng</option><option value="khan">Khẩn</option></select>' +
        '<button class="dh-nut-nho" onclick="DH.vGiao()">+ Giao việc</button></div></div>'
      : '';

    return '<div class="hd-kiem ' + (THAT ? 'xanh' : 'vang') + '" style="margin-top:0">Ban giám hiệu giao việc; người thực hiện chạm chấm tròn để chuyển ' +
      '⚪ → 🟡 → 🟢, nút ✎ để ghi tiến độ. Đây là "việc cần làm của nhà trường", không phải phần mềm quản lý dự án.</div>' +
      chipLoc +
      '<div class="dh-viec-tom">' + (loc === 'cuatoi' ? 'VIỆC CỦA TÔI' : 'TUẦN NÀY') + ': <b>' + dsViec.length + '</b> việc · 🟢 ' + xong + ' · 🟡 ' + dang +
      ' · 🔴 ' + quaHan + ' quá hạn</div>' + formGiao + dsNguoi + (laQT() ? veViecMau() : '');
  }

  // ── Việc lặp định kỳ: mẫu việc tự sinh đúng thời điểm (BGH quản lý) ──
  function moTaChuKy(m) {
    if (m.chuKy === 'tuan') return 'Hằng tuần · ' + (TEN_THU[m.thu] || 'Thứ ' + m.thu);
    if (m.chuKy === 'thang') return 'Hằng tháng · ngày ' + m.ngay;
    return 'Hằng năm · ' + m.ngay + '/' + m.thang;
  }
  function veViecMau() {
    if (THAT && !DL.vmCoBang) {
      return '<div class="dh-tieu-de" style="margin-top:20px">🔁 Việc lặp định kỳ</div>' +
        '<div class="hd-kiem vang">Phần này cần chạy <b>sql/25-dieu-hanh-dot-2.sql</b> trên Supabase rồi tải lại trang.</div>';
    }
    var ds = (DL.viecMau || []).map(function (m) {
      return '<div class="dh-diem-hang"><span class="dh-cham ' + (m.dangBat ? 'xanh' : 'xam') + '"></span>' +
        '<div class="tt"><b>' + thoat(m.noiDung) + '</b>' +
        '<small>' + thoat(m.nguoiTen) + ' · ' + moTaChuKy(m) + ' · xuất hiện trước ' + m.sinhTruoc + ' ngày' +
        (m.dangBat ? '' : ' · <b>đang tắt</b>') + '</small></div>' +
        '<button class="dh-nut-nho" onclick="DH.vmBat(' + m.id + ', ' + (m.dangBat ? 'false' : 'true') + ')">' +
        (m.dangBat ? 'Tắt' : 'Bật') + '</button>' +
        '<button class="dh-nut-nho" onclick="DH.vmXoa(' + m.id + ')">Xóa</button></div>';
    }).join('') || '<div class="the-thong-bao">Chưa có mẫu việc định kỳ nào. Ví dụ nên tạo: '+
      '"Báo cáo chuyên cần tháng" (hằng tháng), "Kế hoạch tuần" (hằng tuần), "Kiểm tra CSVC" (hằng tháng).</div>';

    var formThem =
      '<input class="dh-o-nhap" id="dh-vm-noidung" placeholder="Nội dung việc định kỳ…">' +
      '<div class="dh-chon-hang" style="margin:8px 0">' +
      '<select class="dh-o-nhap" id="dh-vm-nguoi" style="width:auto;max-width:100%;margin-top:0">' + DL.gvDs.map(function (g) {
        return '<option value="' + thoat(g.email) + '">' + thoat(g.ten) + '</option>';
      }).join('') + '</select>' +
      '<select class="dh-o-nhap" id="dh-vm-chuky" style="width:auto;margin-top:0" onchange="DH.vmDoiChuKy(this.value)">' +
      '<option value="tuan">Hằng tuần</option><option value="thang" selected>Hằng tháng</option><option value="nam">Hằng năm</option></select>' +
      '<span id="dh-vm-o-thu" style="display:none"><select class="dh-o-nhap" style="width:auto;max-width:100%;margin-top:0" id="dh-vm-thu">' +
      [2, 3, 4, 5, 6, 7, 8].map(function (x) {
        return '<option value="' + x + '"' + (x === 6 ? ' selected' : '') + '>' + TEN_THU[x] + '</option>';
      }).join('') + '</select></span>' +
      '<span id="dh-vm-o-ngay"><label style="font-size:13px">ngày <input class="dh-o-nhap" type="number" min="1" max="28" value="28" id="dh-vm-ngay" style="width:64px;margin-top:0"></label></span>' +
      '<span id="dh-vm-o-thang" style="display:none"><label style="font-size:13px">tháng <input class="dh-o-nhap" type="number" min="1" max="12" value="9" id="dh-vm-thang" style="width:64px;margin-top:0"></label></span>' +
      '<label style="font-size:13px">xuất hiện trước <input class="dh-o-nhap" type="number" min="0" max="14" value="3" id="dh-vm-truoc" style="width:56px;margin-top:0"> ngày</label>' +
      '<button class="dh-nut-nho" onclick="DH.vmThem()">+ Thêm mẫu</button></div>';

    return '<div class="dh-tieu-de" style="margin-top:20px">🔁 Việc lặp định kỳ (tự sinh — không ai phải nhớ)</div>' +
      '<div class="dh-ghi-chu-nho" style="margin-top:0">Đến kỳ, hệ thống tự tạo việc và đưa vào "Việc của tôi" của người phụ trách + ' +
      '"Cần tôi xử lý" khi trễ hạn. Việc THEO HỌC KỲ thì tạo 2 mẫu "hằng năm" (một cho cuối HK1, một cho cuối năm).</div>' +
      ds + formThem;
  }

  // ════════════════════════════════════════════════════════════
  // TAB 6 · BÁO VIỆC & NHẬT KÝ
  // ════════════════════════════════════════════════════════════
  var LOAI_BV = ['Học sinh', 'Giáo viên', 'Cơ sở vật chất', 'Điện / Nước', 'An ninh', 'Y tế', 'Thiết bị', 'Khác'];
  var BV_LOAI = null, BV_MUC = null;

  function veBaoViec() {
    var TT_SV = { moi: ['do', 'Chờ tiếp nhận'], tiep_nhan: ['vang', 'Đã tiếp nhận — đang xử lý'], da_xu_ly: ['xanh', 'Đã xử lý'] };
    var dsSV = DL.suViec.map(function (s) {
      var tt = TT_SV[s.tt];
      return '<div class="dh-diem-hang"><span class="dh-cham ' + (s.muc === 'do' ? 'do' : 'vang') + '"></span>' +
        '<div class="tt"><b>' + thoat(s.loai) + ' — ' + thoat(tenCoSo(s.coSo)) + '</b>' +
        '<small>' + thoat(s.moTa) + '</small>' +
        '<small>' + thoat(s.nguoiTen) + ' báo lúc ' + s.luc + ' · <span class="dh-' + tt[0] + '">' + tt[1] + '</span>' +
        (s.ketQua ? ' — ' + thoat(s.ketQua) : '') + '</small></div>' +
        (laQT() && s.tt === 'moi' ? '<button class="dh-nut-nho" onclick="DH.svTiepNhan(' + s.id + ')">Đã tiếp nhận</button>'
          : laQT() && s.tt === 'tiep_nhan' ? '<button class="dh-nut-nho" onclick="DH.svXuLy(' + s.id + ')">Đã xử lý</button>' : '') +
        '</div>';
    }).join('') || '<div class="the-thong-bao">Chưa có sự việc nào.</div>';

    var chonCSBV = DL.coSo.length > 1
      ? '<select class="dh-o-nhap" id="dh-bv-coso" style="margin:8px 0 0">' + DL.coSo.map(function (c) {
          return '<option value="' + thoat(c.ma) + '">' + thoat(c.ten) + '</option>';
        }).join('') + '</select>'
      : '';

    var formBV = '<div class="dh-tieu-de">⚠️ Báo việc (dành cho mọi giáo viên)</div>' +
      '<div class="dh-hop-chon" style="margin-top:2px">' + LOAI_BV.map(function (l) {
        return '<button class="chip-loc' + (BV_LOAI === l ? ' on' : '') + '" onclick="DH.bvLoai(this)" data-loai="' + thoat(l) + '">' + thoat(l) + '</button>';
      }).join('') + '</div>' +
      '<div class="dh-chon-hang" style="margin:8px 0">' +
      '<button class="dh-nut-lon' + (BV_MUC === 'vang' ? ' on' : '') + '" onclick="DH.bvMuc(\'vang\')">🟡 Cần lưu ý</button>' +
      '<button class="dh-nut-lon' + (BV_MUC === 'do' ? ' on' : '') + '" onclick="DH.bvMuc(\'do\')">🔴 Cần xử lý ngay</button></div>' +
      chonCSBV +
      '<textarea class="dh-o-nhap" id="dh-bv-mota" rows="2" placeholder="Mô tả ngắn sự việc… (đính kèm ảnh sẽ có ở đợt sau)"></textarea>' +
      '<button class="dh-nut-gui" onclick="DH.bvGui()">GỬI BÁO CÁO</button>';

    var nhatKy = '<div class="dh-tieu-de" style="margin-top:20px">Nhật ký điều hành hôm nay</div>' +
      '<div class="dh-nk">' + (DL.nhatKy.length ? DL.nhatKy.map(function (n) {
        return '<div class="dh-nk-dong"><span class="dh-nk-luc">' + thoat(n.luc) + '</span><span>' + thoat(n.chu) + '</span></div>';
      }).join('') : '<div class="dh-nk-dong"><span>Chưa có hoạt động nào hôm nay.</span></div>') + '</div>' +
      '<div class="dh-ghi-chu-nho">Báo cáo đầu buổi, an toàn xanh, đề xuất – phê duyệt, báo việc và kết quả xử lý ' +
      'tự ghi vết ở đây (giao việc lưu vết ở nhật ký hệ thống) — đây là nguồn để sau này <b>tự sinh báo cáo ngày / tuần / tháng</b>, không nhập lại.</div>';

    // Bố cục hai cột theo bản thiết kế: bên trái là form báo việc (mọi giáo
    // viên dùng), bên phải là danh sách sự việc đang theo dõi. Điện thoại tự
    // xếp dọc (.dh-hai-cot đã lo). Nhật ký riêng của màn này bỏ đi — nay MỌI
    // màn đều có khối nhật ký ở cuối, để hai chỗ là đọc hai lần.
    return '<div class="dh-hai-cot">' +
      '<div>' + formBV + '</div>' +
      '<div><div class="dh-tieu-de" style="margin-top:0">Sự việc đang theo dõi</div>' + dsSV + '</div>' +
      '</div>';
  }

  // ════════════════════════════════════════════════════════════
  // TAB · THÔNG BÁO — ĐÃ NHẬN
  // Thông báo thường: chỉ cần đã xem. Thông báo quan trọng: nút TÔI ĐÃ NHẬN;
  // BGH thấy x/y đã xác nhận + danh sách ai chưa — khỏi hỏi lại qua Zalo.
  // ════════════════════════════════════════════════════════════
  function veThongBao() {
    if (THAT && !DL.tbCoBang) {
      return '<div class="hd-kiem vang" style="margin-top:0">Chức năng Thông báo cần chạy <b>sql/25-dieu-hanh-dot-2.sql</b> ' +
        'trên Supabase rồi tải lại trang.</div>';
    }
    var formGui = laQT()
      ? '<div class="dh-tieu-de" style="margin-top:2px">＋ Gửi thông báo</div>' +
        '<input class="dh-o-nhap" id="dh-tb-tieude" placeholder="Tiêu đề (ngắn gọn, đủ ý)…">' +
        '<textarea class="dh-o-nhap" id="dh-tb-noidung" rows="2" placeholder="Nội dung (không bắt buộc)…"></textarea>' +
        '<div class="dh-chon-hang" style="margin:8px 0">' +
        '<select class="dh-o-nhap" id="dh-tb-phamvi" style="width:auto;max-width:100%;margin-top:0">' +
        '<option value="">Toàn trường</option>' +
        DL.coSo.map(function (c) { return '<option value="' + thoat(c.ma) + '">' + thoat(c.ten) + '</option>'; }).join('') +
        '</select>' +
        '<label class="dh-tick" style="margin:0"><input type="checkbox" id="dh-tb-xacnhan"> Quan trọng — cần bấm <b>TÔI ĐÃ NHẬN</b></label>' +
        '</div>' +
        '<button class="dh-nut-nho" onclick="DH.tbGui()">📢 Gửi thông báo</button>'
      : '';

    // Danh sách nhân sự thuộc phạm vi để đếm "x/y đã xác nhận"
    function nguoiTrongPhamVi(x) {
      return DL.gvDs.filter(function (g) { return x.phamVi !== 'co_so' || g.coSo === x.coSo; });
    }
    var dsTB = (DL.thongBao || []).filter(tbChoToi).map(function (x) {
      var xacNhan = '';
      if (x.canXacNhan) {
        if (tbCanToiXN(x)) {
          xacNhan = '<button class="dh-nut-lon on" style="margin-top:8px" onclick="DH.tbXacNhan(' + x.id + ')">✓ TÔI ĐÃ NHẬN</button>';
        } else if (x.toiDaXacNhan) {
          xacNhan = '<div class="dh-ghi-chu-nho" style="margin-top:6px">✅ Thầy/cô đã xác nhận nhận thông báo này.</div>';
        }
        if (laQT()) {
          var trongPV = nguoiTrongPhamVi(x);
          var chua = trongPV.filter(function (g) {
            return !x.daXNEmail[(g.email || '').toLowerCase()];
          });
          xacNhan += '<div class="dh-ghi-chu-nho" style="margin-top:6px"><b>' +
            (trongPV.length - chua.length) + '/' + trongPV.length + ' đã xác nhận</b>' +
            (chua.length
              ? '</div><details style="font-size:12.5px;color:var(--chu-mo)"><summary style="cursor:pointer">' +
                chua.length + ' người chưa xác nhận — xem danh sách</summary>' +
                chua.map(function (g) { return thoat(g.ten); }).join(' · ') + '</details>'
              : ' 🎉</div>');
        }
      }
      return '<div class="dh-lop-the"><div class="dh-lop-ten">' +
        (x.canXacNhan ? '🔴 ' : '📄 ') + thoat(x.tieuDe) + '</div>' +
        (x.noiDung ? '<div style="font-size:13.5px;margin-top:4px">' + thoat(x.noiDung) + '</div>' : '') +
        '<div class="dh-ghi-chu-nho" style="margin-top:6px">' + thoat(x.nguoiGui) + ' · ' + ngayVN(x.ngay) + ' ' + x.luc +
        ' · ' + (x.phamVi === 'co_so' ? thoat(tenCoSo(x.coSo)) : 'Toàn trường') + '</div>' +
        xacNhan + '</div>';
    }).join('') || '<div class="the-thong-bao">Chưa có thông báo nào.</div>';

    return '<div class="hd-kiem ' + (THAT ? 'xanh' : 'vang') + '" style="margin-top:0">Thông báo thường chỉ cần ĐÃ XEM. ' +
      'Thông báo 🔴 quan trọng có nút xác nhận — Ban giám hiệu thấy ngay ai chưa nhận, không phải hỏi lại từng người.</div>' +
      formGui + '<div class="dh-tieu-de">Thông báo nhà trường</div>' + dsTB;
  }

  // ════════════════════════════════════════════════════════════
  // KHUNG MODULE
  // ════════════════════════════════════════════════════════════
  // ── Bố cục theo bản bàn giao "Điều hành v3 — phương án 1b" (14/8/2026) ──
  // Máy tính: thanh bên 232px phân nhóm nhiệm vụ. Điện thoại: thanh bên ẩn,
  // thay bằng thanh tab dưới 4 mục chính + hàng chip cho 5 màn còn lại.
  //
  // Thẻ "Điểm danh HS" ĐÃ ẨN — VNEDU đã làm việc đó. Mã veDiemDanh() và các
  // hàm dd* GIỮ NGUYÊN, bảng diem_danh_lop/hs_vang cũng giữ; bật lại chỉ cần
  // trả một mục vào DS_NHOM.
  var TAB = 'tongquan';
  // ⚠️ THAY ĐỔI 15/8/2026 theo yêu cầu thầy Chung:
  //  · "Điểm danh GV" + "Bảng công tháng" GỘP MỘT MỤC — vốn là hai tầng của
  //    cùng một chuyện (ai có mặt hôm nay → cộng thành công cả tháng), tách ra
  //    thì phải nhớ vào mục nào để xem gì.
  //  · "Dự giờ" GỠ KHỎI THANH TAB. Mã `js/du-gio.js`, bảng dữ liệu và hàm SQL
  //    (sql/33) GIỮ NGUYÊN — làm y như đã làm với Điểm danh học sinh ở mục
  //    11.2: bật lại chỉ cần trả một dòng vào danh sách này. Muốn xoá hẳn dữ
  //    liệu thì phải có lệnh riêng, và không lấy lại được.
  //  · Thêm "Thời khóa biểu" — module mới, thay chỗ Dự giờ.
  var DS_NHOM = [
    { nhom: 'HÔM NAY', muc: [
      { ma: 'tongquan', ten: 'Tổng quan', bi: '🏠', ngan: 'Hôm nay' },
      { ma: 'baoviec', ten: 'Báo việc', bi: '⚡', ngan: 'Báo việc' } ] },
    { nhom: 'NHÂN SỰ', muc: [
      { ma: 'baocao', ten: 'Điểm danh & Chấm công', bi: '🧑‍🏫', ngan: 'Chấm công' } ] },
    { nhom: 'CÔNG VIỆC', muc: [
      { ma: 'dexuat', ten: 'Đề xuất – duyệt', bi: '📝', ngan: 'Đề xuất' },
      { ma: 'viec', ten: 'Giao việc', bi: '✅' } ] },
    // Dạy thay nằm TRONG Lịch tuần: nó vốn là hệ quả của thời khóa biểu cộng
    // với người vắng, đứng riêng một màn thì lạc lõng.
    { nhom: 'KẾ HOẠCH', muc: [
      { ma: 'lichtuan', ten: 'Lịch tuần', bi: '📅' },
      { ma: 'tkb', ten: 'Thời khóa biểu', bi: '🗓️', ngan: 'TKB' },
      { ma: 'thongbao', ten: 'Thông báo', bi: '📢' } ] }
  ];
  // Bốn mục của thanh tab điện thoại — đúng bản thiết kế màn 3b
  var TAB_MOBILE = ['tongquan', 'baocao', 'dexuat', 'baoviec'];

  function moiMuc() {
    var ds = [];
    DS_NHOM.forEach(function (n) { n.muc.forEach(function (m) { ds.push(m); }); });
    return ds;
  }
  function tenMan(ma) {
    var m = moiMuc().filter(function (x) { return x.ma === ma; })[0];
    return m ? m.ten : 'Tổng quan';
  }
  // Số đếm đỏ trên thanh bên / thanh tab
  function demCho(ma) {
    if (ma === 'dexuat') {
      return laQT() ? (DL.deXuat || []).filter(function (d) { return d.tt === 'cho_duyet'; }).length : 0;
    }
    if (ma === 'thongbao') return (DL.thongBao || []).filter(tbCanToiXN).length;
    if (ma === 'baoviec') {
      return laQT() ? (DL.suViec || []).filter(function (s) { return s.tt === 'moi'; }).length : 0;
    }
    return 0;
  }

  // Mã màn CŨ → màn tương ứng hiện nay. Không có bảng này thì ai đang mở dở
  // một màn đã bị gộp hoặc gỡ (trạng thái còn trong bộ nhớ trình duyệt) sẽ
  // rơi vào màn không có tab nào sáng, không biết đường quay lại.
  var MAN_CU = { bangcong: 'baocao', diemdanh: 'baocao', daythay: 'lichtuan',
                 dugio: 'tkb', homnay: 'tongquan' };

  function veDieuHanh() {
    var vung = $('#vung-dieuhanh');
    if (!vung) return;
    if (MAN_CU[TAB]) TAB = MAN_CU[TAB];

    var bang;
    if (THAT) {
      // KHÔNG hiện gì khi đang chạy dữ liệu thật (thầy Chung bỏ 15/8/2026).
      // Chạy số thật là trạng thái BÌNH THƯỜNG — không có gì để báo. Chỉ khi
      // BẤT THƯỜNG (số mẫu, hoặc lỗi kết nối) mới cần nói ra. Quy mô trường
      // đã có ở dải số liệu ngay dưới.
      bang = '';
    } else if (LOI_SQL) {
      bang = '<div class="hd-kiem do">⚠ ' + thoat(LOI_SQL) + '</div>';
    } else {
      bang = '<div class="hd-kiem vang">🧪 <b>BẢN XEM THỬ — toàn bộ số liệu, tên người, tên lớp là DỮ LIỆU MẪU.</b> ' +
        'Đăng nhập để chạy với dữ liệu thật của nhà trường.</div>';
    }

    // ── THANH TAB NGANG (máy tính) — thay cho thanh bên navy ──
    // Thầy Chung chốt 15/8/2026: bỏ cột điều hướng bên trái, trải rộng ra.
    // Ba lý do cột trái phải đi: đầu trang ĐÃ có một hàng điều hướng 6 nút,
    // thêm cột thứ hai là hai tầng menu chồng nhau; nó là khối navy đặc 232px
    // dựng đứng giữa vùng làm việc sáng; và khung bị ép cao 620px nên màn nào
    // ngắn là phần dưới cột thành mảng navy trống.
    //
    // GIỮ ĐỦ 9 MỤC, không gộp "Lịch & Dự giờ" như bản mẫu — mục 12.3 sổ dự án
    // đã chốt hai màn đó phải để riêng, gộp lại là mất chức năng. Xếp ngang 9
    // tab hết chừng 900px, vẫn thừa chỗ.
    var b = buoiXem();
    var tabNgang = '<div class="dh-tab-hang chi-may-tinh">' +
      '<div class="dh-tab-cuon">' +
      moiMuc().map(function (m) {
        var d = demCho(m.ma);
        return '<button class="dh-tab-nut' + (TAB === m.ma ? ' on' : '') +
          '" onclick="DH.tab(\'' + m.ma + '\')">' + thoat(m.ten) +
          (d ? '<span class="dh-tab-badge">' + d + '</span>' : '') + '</button>';
      }).join('') + '</div>' +
      '<div class="dh-tab-phai">' +
      '<span class="dh-tab-ngay">' + thoat(homNayChu()) + ' · ' + tenBuoi(b) + '</span>' +
      '<div class="dh-buoi">' +
      '<button class="' + (b === 'sang' ? 'on' : '') + '" onclick="DH.buoi(\'sang\')">Sáng</button>' +
      '<button class="' + (b === 'chieu' ? 'on' : '') + '" onclick="DH.buoi(\'chieu\')">Chiều</button>' +
      '</div></div></div>';

    // ── Đầu màn: CHỈ CÒN TRÊN ĐIỆN THOẠI ──
    // Máy tính đã biết đang ở màn nào nhờ tab sáng trên thanh ngang. Điện
    // thoại thì thanh tab ngang ẩn đi (đi bằng thanh tab đáy + hàng chip),
    // nên vẫn cần dòng tên màn, kèm công tắc Sáng/Chiều.
    var dauMan = '<div class="dh-dau-man chi-dien-thoai"><div style="flex:1;min-width:180px">' +
      '<div class="dh-nhan-vang">TRUNG TÂM ĐIỀU HÀNH HẰNG NGÀY</div>' +
      '<div class="dh-tieu-man">' + thoat(tenMan(TAB)) + '</div></div>' +
      '<div class="dh-buoi">' +
      '<button class="' + (b === 'sang' ? 'on' : '') + '" onclick="DH.buoi(\'sang\')">Sáng</button>' +
      '<button class="' + (b === 'chieu' ? 'on' : '') + '" onclick="DH.buoi(\'chieu\')">Chiều</button>' +
      '</div></div>';

    // ── Điện thoại: 5 màn ngoài thanh tab đi bằng hàng chip này ──
    var chipKhac = '<div class="dh-chon-hang chi-dien-thoai" style="overflow-x:auto;flex-wrap:nowrap">' +
      moiMuc().filter(function (m) { return TAB_MOBILE.indexOf(m.ma) < 0; }).map(function (m) {
        var d = demCho(m.ma);
        return '<button class="chip-loc' + (TAB === m.ma ? ' on' : '') +
          '" onclick="DH.tab(\'' + m.ma + '\')">' + m.bi + ' ' + thoat(m.ten) +
          (d ? ' <b class="dh-do">(' + d + ')</b>' : '') + '</button>';
      }).join('') + '</div>';

    // Bộ lọc cơ sở CHỈ hiện ở Tổng quan khi trường có ≥2 cơ sở
    // Chip lọc mang ĐÚNG màu định danh của thẻ điểm trường bên dưới — bấm chip
    // nào là mắt bắt ngay được thẻ tương ứng, khỏi phải dò tên.
    var locCS = (TAB === 'tongquan' && DL.coSo.length > 1)
      ? '<div class="dh-chon-hang dh-loc-cs">' +
        [{ ma: 'all', ten: 'Toàn trường' }].concat(DL.coSo).map(function (c) {
          return '<button class="chip-loc ' + mauCoSo(c.ma) + (LOC_CS === c.ma ? ' on' : '') +
            '" onclick="DH.locCS(\'' + nhay(c.ma) + '\')">' + thoat(c.ten) + '</button>';
        }).join('') + '</div>'
      : '';

    var noiDung =
      TAB === 'tongquan' ? veTongQuan() :
      // ── CHIA VIỆC GIỮA HAI MÀN (thầy Chung chốt 15/8/2026) ──
      // "Báo việc"            = nơi NHẬP  → báo cáo đầu buổi (an toàn · cơ sở
      //                          vật chất · ai vắng) + sự việc đột xuất +
      //                          phiếu kiểm tra điểm trường của Ban giám hiệu
      // "Điểm danh & Chấm công" = nơi XEM → bảng từng người có mặt/vắng +
      //                          bảng công tháng
      //
      // 🔑 Báo cáo đầu buổi phải đi NGUYÊN MỘT KHỐI sang màn Báo việc, không
      // xé mục 1-2 sang một màn còn mục 3 ở lại: nó là MỘT hành động, ghi vào
      // MỘT bản ghi, và app căn đúng bản ghi đó để biết điểm nào chưa báo cáo
      // (dòng "quá 13:45 — Nhắc" ở màn Tổng quan). Xé đôi thì cô phụ trách
      // phải nhớ vào hai chỗ mới xong việc buổi sáng, và "đã báo cáo" không
      // còn định nghĩa được rõ ràng.
      TAB === 'baocao' ? (veKhaiVang() + veBangTrangThaiGV() + veBangCong()) :
      TAB === 'tkb' ? (window.veTKB ? window.veTKB() :
        '<div class="the-thong-bao">Chưa nạp được <b>js/thoi-khoa-bieu.js</b>.</div>') :
      TAB === 'diemdanh' ? veDiemDanh() :
      TAB === 'dexuat' ? veDeXuat() :
      // Lịch tuần ở tệp riêng (js/lich-tuan.js); thiếu tệp thì vẫn còn phần
      // Dạy thay chứ không để màn trắng trơn
      TAB === 'lichtuan' ? ((window.veLichTuan ? window.veLichTuan() : '') + veDayThay()) :
      // 'homnay' và 'daythay' là mã màn CŨ — ai còn giữ trạng thái cũ thì đưa
      // về đúng màn mới, đừng để lạc sang chỗ không mục nào sáng
      TAB === 'daythay' ? ((window.veLichTuan ? window.veLichTuan() : '') + veDayThay()) :
      TAB === 'dugio' ? (window.veDuGioKT ? window.veDuGioKT() : '') :
      TAB === 'thongbao' ? veThongBao() :
      TAB === 'viec' ? veViec() :
      // Báo cáo đầu buổi lên TRƯỚC: việc hằng ngày, ai cũng phải làm.
      // Báo sự việc đột xuất ở giữa, phiếu kiểm tra điểm (chỉ BGH) ở cuối.
      TAB === 'baoviec' ? (veBaoCaoChinh() + veBaoViec() + (laQT() ? veKiemTraDT() : '')) :
      veTongQuan();

    // ── Thanh tab dưới (điện thoại) ──
    var tabM = '<div class="dh-tabm">' + TAB_MOBILE.map(function (ma) {
      var m = moiMuc().filter(function (x) { return x.ma === ma; })[0] || { ten: ma, bi: '•' };
      var d = demCho(ma);
      return '<button class="' + (TAB === ma ? 'on' : '') + '" onclick="DH.tab(\'' + ma + '\')">' +
        '<div class="bi">' + m.bi + '</div><div class="ch">' + thoat(m.ngan || m.ten) +
        (d ? ' <b class="dh-do">' + d + '</b>' : '') + '</div></button>';
    }).join('') + '</div>';

    // Không còn khung hộp có viền + bóng + min-height 620px. Nội dung chảy
    // thẳng trên nền trang, trải rộng theo .dh-rong.
    vung.innerHTML = '<div class="dh-rong">' + tabNgang +
      '<div class="dh-than">' + dauMan + bang + chipKhac + locCS +
      '<div class="dh-noi-dung">' + noiDung + '</div>' +
      veNhatKyKhoi() + tabM + '</div></div>';
    veNhaCard();
  }

  // ── Khối "NHẬT KÝ ĐIỀU HÀNH HÔM NAY" — cuối MỌI màn, theo bản thiết kế.
  //    Mọi thao tác tự ghi vào đây, không ai phải chép sổ lại. ──
  function veNhatKyKhoi() {
    var ds = (DL.nhatKy || []).slice(0, 6);
    return '<div class="dh-nk-khoi"><b>NHẬT KÝ ĐIỀU HÀNH HÔM NAY</b>' +
      (ds.length
        ? ds.map(function (n) {
            return '<div class="dong"><span class="gio">' + thoat(n.luc) + '</span>' +
              '<span class="chu">' + thoat(n.chu) + '</span></div>';
          }).join('')
        : '<div class="dong"><span class="chu">Hôm nay chưa có thao tác nào được ghi nhận.</span></div>') +
      '</div>';
  }

  // ── Khối tóm tắt trên TRANG CHỦ, cá nhân hóa theo vai trò ──
  // BGH mở app là thấy ngay "hôm nay có bình thường không, có gì chờ tôi";
  // giáo viên thấy việc của mình. Chỉ hiện khi chạy dữ liệu thật.
  function veNhaCard() {
    var vung = $('#dh-home-card');
    if (!vung) return;
    if (!THAT) { vung.innerHTML = ''; return; }
    var cuu = LOC_CS; LOC_CS = 'all';
    var t = tinh();
    LOC_CS = cuu;
    var ds = canXuLyDs();
    var qt = laQT();

    var soLieu;
    if (qt) {
      // Cùng nguyên tắc với màn Tổng quan: chưa điểm nào báo cáo thì "—".
      soLieu = '👨‍🏫 <b>' + (t.csDaBC ? t.gvCoBC + '/' + t.gvTongBC : '—') + '</b> CBGV có mặt' +
        (t.csDaBC && t.csDaBC < t.dsCS.length ? ' <small>(' + t.csDaBC + '/' + t.dsCS.length + ' điểm)</small>' : '') + ' · ' +
        '👧 <b>' + t.hsTong.toLocaleString('vi-VN') + '</b> học sinh · ' +
        '🟢 <b>' + t.soXanh + '/' + t.dsCS.length + '</b> điểm trường an toàn' +
        (t.soChua ? ' · ⚪ <b>' + t.soChua + '</b> chưa xác nhận' : '');
    } else {
      var toi = emailToi();
      var vToi = DL.viec.filter(function (v) { return emailBang(v.nguoiEmail, toi) && v.tt !== 'xong'; }).length;
      var dxToi = (DL.deXuat || []).filter(function (d) {
        return ((d.guiId && d.guiId === idToi()) || emailBang(d.email, toi)) && d.tt === 'cho_duyet';
      }).length;
      soLieu = '✅ <b>' + vToi + '</b> việc đang chờ tôi · 🔄 <b>' + dxToi + '</b> đơn chờ duyệt · ' +
        '📢 <b>' + t.tbToiChuaXN + '</b> thông báo cần xác nhận';
    }
    var canhBao = ds.length
      ? '<div style="margin-top:6px">🔔 <b class="dh-do">' + ds.length + ' việc cần ' + (qt ? 'thầy/cô' : 'tôi') + ' xử lý</b></div>'
      : '<div style="margin-top:6px">👍 Không có việc nào chờ xử lý.</div>';

    vung.innerHTML = '<div class="the-thong-bao" style="margin-bottom:16px">' +
      '<div style="font-size:13px;color:var(--chu-mo)">' + homNayChu() + ' · ' + tenBuoi(buoiXem()) + '</div>' +
      '<div style="font-size:14.5px;margin-top:4px">' + soLieu + '</div>' + canhBao +
      '<div class="dh-chon-hang" style="margin-top:10px">' +
      '<button class="dh-nut-nho" onclick="DH.moTab(\'homnay\')">📊 Mở Điều hành</button>' +
      '<button class="dh-nut-nho" onclick="DH.moTab(\'dexuat\')">＋ Tạo đề xuất</button>' +
      (qt ? '' : '<button class="dh-nut-nho" onclick="DH.moTab(\'viec\')">✅ Việc của tôi</button>') +
      '</div></div>';
  }

  // ════════════════════════════════════════════════════════════
  // CẦU NỐI cho các module con của Điều hành (js/lich-tuan.js…)
  // Cố ý trả bằng HÀM chứ không phải giá trị: DL và THAT thay đổi sau khi
  // đăng nhập, module con giữ tham chiếu cũ là hiện dữ liệu mẫu mãi mãi.
  // ════════════════════════════════════════════════════════════
  window.DH_KHO = {
    dl: function () { return DL; },
    that: function () { return THAT; },
    nam: function () { return NAM; },
    laQT: laQT, emailToi: emailToi, idToi: idToi, tenToi: tenToi,
    tenCoSo: tenCoSo, coSoCuaToi: coSoCuaToi,
    thoat: thoat, nhay: nhay, ngayVN: ngayVN, homNayISO: homNayISO, pad2: pad2,
    loiThieuBang: loiThieuBang, TEN_THU: TEN_THU,
    veLai: function () { veGiu(); },
    baoLoi: function (e) { baoLoi(e); }
  };

  // Sau MỖI thao tác ghi thật: đọc lại "hôm nay" rồi vẽ — màn luôn đúng CSDL
  function taiLai() {
    // Mọi thao tác ghi đều đi qua đây, và ba trong số đó ĐỔI SỔ VẮNG:
    // báo cáo đầu buổi (chèn gv_vang), sửa báo cáo (xóa gv_vang), duyệt đơn
    // nghỉ (hàm duyet_de_xuat chèn gv_vang). Không dọn bộ nhớ đệm thì bảng
    // công đứng yên cả phiên, xuất Word ra thiếu đúng buổi vừa khai.
    CONG_THU = ''; CONG_KQ = null;
    if (!THAT) { veDieuHanh(); return Promise.resolve(); }
    return napHomNay(DL).then(function () { veDieuHanh(); })
      .catch(function (e) { window.notify('Lỗi đọc lại dữ liệu: ' + (e.message || e)); });
  }
  function baoLoi(e) {
    window.notify('Không ghi được: ' + ((e && e.message) || e) + '');
  }

  // Vẽ lại NHƯNG GIỮ mọi ô đang nhập dở — innerHTML xóa sạch form, người
  // đang gõ lý do mà bấm một chip là mất chữ. Một hàm dùng chung thay cho
  // việc từng handler tự lưu-đặt-lại (trước đây mỗi nơi nhớ một ô, sót nhau).
  var O_GIU_GOC = ['dh-bc-ghichu', 'dh-kt-ghichu', 'dh-bv-mota', 'dh-bv-coso',
    'dh-dx-noidung', 'dh-dx-tu', 'dh-dx-den', 'dh-dx-buoi', 'dh-dx-coso',
    'dh-tb-tieude', 'dh-tb-noidung', 'dh-tb-phamvi',
    'dh-viec-noidung', 'dh-viec-nguoi', 'dh-viec-han', 'dh-viec-muc',
    'dh-vm-noidung', 'dh-vm-nguoi', 'dh-vm-chuky', 'dh-vm-thu', 'dh-vm-ngay',
    'dh-vm-thang', 'dh-vm-truoc',
    'dh-nghi-ngay', 'dh-nghi-ten', 'dh-nghi-loai'];
  var O_GIU_TICK = ['dh-bc-1buoi', 'dh-tb-xacnhan'];
  function veGiu() {
    var luu = {}, tick = {};
    // Module con khai thêm ô của nó qua window.LT.oGiu — không thì mỗi lần vẽ
    // lại là mất chữ đang gõ trong khung thêm việc của Lịch tuần
    var O_GIU = O_GIU_GOC
      .concat((window.LT && window.LT.oGiu) || [])
      .concat((window.DG && window.DG.oGiu) || []);
    O_GIU.forEach(function (id) {
      var e = $('#' + id);
      if (e) luu[id] = e.value;
    });
    O_GIU_TICK.forEach(function (id) {
      var e = $('#' + id);
      if (e) tick[id] = e.checked;
    });
    veDieuHanh();
    O_GIU.forEach(function (id) {
      var e = $('#' + id);
      if (e && luu[id] !== undefined) e.value = luu[id];
    });
    O_GIU_TICK.forEach(function (id) {
      var e = $('#' + id);
      if (e && tick[id] !== undefined) e.checked = tick[id];
    });
    // ô chu kỳ mẫu việc điều khiển ẩn/hiện các ô ngày — khôi phục xong phải áp lại
    var ck = $('#dh-vm-chuky');
    if (ck && window.DH) window.DH.vmDoiChuKy(ck.value);
  }

  // Mở thẻ Thông báo là đánh dấu ĐÃ XEM mọi thông báo mới (âm thầm, không chặn)
  function tbDanhDauXem() {
    if (!THAT || !DL.tbCoBang || !idToi()) return;
    var chuaXem = (DL.thongBao || []).filter(function (x) { return !x.toiDaXem; });
    if (!chuaXem.length) return;
    var luc = new Date().toISOString();
    window.MAY_CHU.from('thong_bao_nhan').upsert(chuaXem.map(function (x) {
      return { thong_bao_id: x.id, nguoi_id: idToi(), email: emailToi() || null,
        ho_ten: tenToi(), xem_luc: luc };
    }), { onConflict: 'thong_bao_id,nguoi_id' }).then(function (r) {
      if (!r.error) chuaXem.forEach(function (x) { x.toiDaXem = true; });
    });
  }

  // ════════════════════════════════════════════════════════════
  // THAO TÁC
  // ════════════════════════════════════════════════════════════
  window.DH = {
    tab: function (ma) {
      TAB = ma;
      if (ma === 'thongbao') tbDanhDauXem();
      veDieuHanh(); window.scrollTo(0, 0);
    },
    // Mở màn Điều hành từ nơi khác (khối tóm tắt trang chủ) rồi vào đúng thẻ
    moTab: function (ma) {
      if (window.chuyenManHinh) window.chuyenManHinh('dieuhanh');
      window.DH.tab(ma);
    },
    locCS: function (ma) { LOC_CS = ma; veDieuHanh(); },

    // ── Công tắc Sáng/Chiều (bản thiết kế v3) ──
    // Đổi buổi là đổi CẢ dữ liệu xem lẫn buổi sẽ báo cáo — người phụ trách
    // biết trước chiều nghỉ thì gửi báo cáo chiều ngay từ sáng được.
    buoi: function (b) {
      BUOI_XEM = (b === 'sang' || b === 'chieu') ? b : null;
      BC_ANTOAN = null; BC_GV_VANG = {}; BC_MO_CHON_GV = false; BC_CSVC = { dien: '', nuoc: '', csvc: '' };
      veGiu();
    },

    // Biến mục "Có vấn đề" của báo cáo đầu buổi thành SỰ VIỆC để theo dõi tới
    // khi xử lý xong — không thì nó chỉ là một dòng chữ đỏ trong cột, sáng mai
    // báo cáo mới đè lên là mất dấu.
    svTuCsvc: function (ma) {
      var c = DL.coSo.filter(function (x) { return x.ma === ma; })[0];
      if (!c) return;
      var bc = (DL.baoCao[ma] || {})[buoiXem()];
      if (!bc) return;
      var loi = [];
      if (bc.dien === 'loi') loi.push('Điện');
      if (bc.nuoc === 'loi') loi.push('Nước');
      if (bc.csvc === 'loi') loi.push('Phòng học – thiết bị');
      if (!loi.length) return;
      var moTa = '[Báo cáo đầu buổi] ' + loi.join(', ') + ' có vấn đề' +
        (bc.ghiChu ? ': ' + bc.ghiChu : '');
      if (!THAT) {
        DL.suViec.unshift({ id: Date.now(), loai: 'Điện / Nước', muc: 'vang', moTa: moTa,
          coSo: ma, tt: 'moi', ketQua: '', nguoiTen: 'BGH (mẫu)', luc: gioPhut() });
        veDieuHanh(); window.notify('Bản mẫu — chưa ghi cơ sở dữ liệu.');
        return;
      }
      window.MAY_CHU.from('su_viec').insert({
        loai: (bc.dien === 'loi' || bc.nuoc === 'loi') ? 'Điện / Nước' : 'Cơ sở vật chất',
        muc: 'vang', mo_ta: moTa, co_so_ma: ma,
        nguoi_bao_id: idToi(), nguoi_bao_ten: tenToi()
      }).then(function (r) {
        if (r.error) { baoLoi(r.error); return; }
        window.notify('⚠ Đã ghi thành sự việc để theo dõi tới khi xử lý xong.');
        taiLai();
      });
    },

    // Nhắc điểm trường chưa gửi báo cáo — gửi một thông báo cần xác nhận,
    // KHÔNG nhắn ngoài app: có vết trong nhật ký thì mới đối chiếu được sau.
    nhacBaoCao: function (ma) {
      var c = DL.coSo.filter(function (x) { return x.ma === ma; })[0];
      if (!c) return;
      var chu = 'Nhắc gửi báo cáo đầu buổi — ' + c.ten + ' (' + tenBuoi(buoiXem()) + ' ' +
        ngayVN(homNayISO()) + ')';
      if (!THAT) {
        window.notify('Bản mẫu — đã nhắc ' + c.ten + '.');
        return;
      }
      if (!DL.tbCoBang) { window.notify('Chức năng nhắc cần chạy sql/25 trên Supabase.'); return; }
      // Bấm hai lần là hai thông báo, mà mỗi cái đòi cả điểm trường xác nhận —
      // tiêu đề đã chứa tên điểm + buổi + ngày nên đủ làm khoá chống trùng.
      var daNhac = (DL.thongBao || []).filter(function (x) {
        return x.tieuDe === chu && x.ngay === homNayISO();
      }).length;
      if (daNhac) {
        window.notify('Đã nhắc ' + c.ten + ' ' + daNhac + ' lần trong buổi này rồi.');
        return;
      }
      window.MAY_CHU.from('thong_bao').insert({
        tieu_de: chu,
        noi_dung: 'Ban giám hiệu nhắc điểm trường gửi báo cáo đầu buổi trên hệ thống.',
        can_xac_nhan: true, pham_vi: 'co_so', co_so_ma: ma,
        // nguoi_gui_ten là NOT NULL và chưa có trigger chép tên — thiếu nó thì
        // nút Nhắc thất bại 100% với lỗi tiếng Anh của Postgres.
        nguoi_gui_id: idToi(), nguoi_gui_ten: tenToi()
      }).then(function (r) {
        if (r.error) { baoLoi(r.error); return; }
        window.notify('🔔 Đã nhắc ' + c.ten + ' — lời nhắc vào nhật ký và cần xác nhận.');
        taiLai();
      });
    },

    // ── Báo cáo đầu buổi ──
    bcChonCS: function (ma) { BC_CS = ma; BC_ANTOAN = null; BC_GV_VANG = {}; BC_MO_CHON_GV = false; BC_CSVC = { dien: '', nuoc: '', csvc: '' }; veGiu(); },
    bcGvDu: function () { BC_GV_VANG = {}; BC_MO_CHON_GV = false; veGiu(); },
    bcGvVang: function () { BC_MO_CHON_GV = true; veGiu(); },
    bcTickGv: function (nut) {
      var em = nut.getAttribute('data-email');
      if (BC_GV_VANG[em] !== undefined) delete BC_GV_VANG[em];
      // Mặc định là ĐÚNG BUỔI đang báo cáo, không phải cả ngày: báo cáo
      // chiều mà mặc định 'cả ngày' là trừ oan buổi sáng người ta đã dạy.
      else BC_GV_VANG[em] = { ten: nut.getAttribute('data-ten'), lyDo: 'Nghỉ ốm', buoi: buoiXem(), denNgay: '' };
      veGiu();
    },
    bcLyDo: function (em, lyDo) { if (BC_GV_VANG[em]) BC_GV_VANG[em].lyDo = lyDo; },
    bcBuoiVang: function (em, buoi) { if (BC_GV_VANG[em]) BC_GV_VANG[em].buoi = buoi; },
    bcDenNgay: function (em, ngay) { if (BC_GV_VANG[em]) BC_GV_VANG[em].denNgay = ngay; },
    bcAnToan: function (ma) { BC_ANTOAN = ma; veGiu(); },
    bcCsvc: function (m, gia) { BC_CSVC[m] = (BC_CSVC[m] === gia ? '' : gia); veGiu(); },
    bcSua: function () {
      // Mở lại biểu mẫu báo cáo đầu buổi: xóa dòng báo cáo BUỔI NÀY, bản mới
      // sẽ ghi đè.
      //
      // ⚠️ TỪ 15/8/2026 KHÔNG ĐỤNG SỔ VẮNG NỮA. Trước đây hàm này xoá luôn
      // người vắng do báo cáo cùng buổi ghi ra, vì hai thứ đi chung một nút
      // gửi — sửa báo cáo mà không xoá thì tick lại là nhân đôi. Nay người
      // vắng khai ở màn Điểm danh & Chấm công bằng nút riêng, nên sửa lời
      // báo an toàn KHÔNG được phép động tới bảng lương của ai. Muốn sửa
      // người vắng thì sửa ngay tại màn đó.
      var b = buoiXem();
      if (!THAT) {
        delete (DL.baoCao[BC_CS] || {})[b];
        veDieuHanh(); return;
      }
      window.MAY_CHU.from('bao_cao_dau_buoi').delete()
        .eq('ngay', homNayISO()).eq('buoi', b).eq('co_so_ma', BC_CS)
        .then(function (r) {
          if (r.error) throw r.error;
          return taiLai();
        })
        .catch(baoLoi);
    },
    // Xác nhận đầu buổi — nay CHỈ ghi an toàn + cơ sở vật chất + ghi chú.
    // Người vắng tách sang guiVang() ở màn Điểm danh & Chấm công (15/8/2026).
    bcGui: function () {
      if (!BC_ANTOAN) { window.notify('Chọn một trong ba nút An toàn trước khi xác nhận.'); return; }
      var b = buoiXem();
      var ghiChu = (($('#dh-bc-ghichu') || {}).value || '').trim();
      var khongHocChieu = !!(($('#dh-bc-1buoi') || {}).checked);

      if (!THAT) {
        if (!DL.baoCao[BC_CS]) DL.baoCao[BC_CS] = {};
        DL.baoCao[BC_CS][b] = { anToan: BC_ANTOAN, ghiChu: ghiChu, luc: gioPhut(), chieuKhongHoc: khongHocChieu,
          dien: BC_CSVC.dien, nuoc: BC_CSVC.nuoc, csvc: BC_CSVC.csvc };
        BC_ANTOAN = null; BC_CSVC = { dien: '', nuoc: '', csvc: '' };
        TAB = 'tongquan'; veDieuHanh();
        window.notify('Đã xác nhận (bản mẫu — chưa ghi cơ sở dữ liệu).');
        return;
      }
      window.MAY_CHU.from('bao_cao_dau_buoi').upsert({
        ngay: homNayISO(), buoi: b, co_so_ma: BC_CS, an_toan: BC_ANTOAN,
        ghi_chu: ghiChu || null, chieu_khong_hoc: khongHocChieu, nguoi_gui_id: idToi(),
        dien: BC_CSVC.dien || null, nuoc: BC_CSVC.nuoc || null, csvc: BC_CSVC.csvc || null
      }, { onConflict: 'ngay,buoi,co_so_ma' })
        .then(function (r) {
          if (r.error) throw r.error;
          BC_ANTOAN = null; BC_CSVC = { dien: '', nuoc: '', csvc: '' };
          TAB = 'tongquan';
          window.notify('✅ Đã xác nhận đầu buổi — bảng điều hành đã cập nhật.');
          return taiLai();
        })
        .catch(baoLoi);
    },

    // Xoá một dòng vắng ghi nhầm (bảng trạng thái CBGV, chỉ admin/BGH).
    xoaVang: function (id, ten) {
      if (!window.confirm('Xoá dòng vắng của ' + ten + ' hôm nay?\n\n' +
        'Bảng công tháng sẽ cộng lại ngay. Nhật ký giữ vết ai xoá, lúc nào.')) return;
      if (!THAT) {
        DL.gvVang = DL.gvVang.filter(function (g) { return g.id !== id; });
        veDieuHanh(); return;
      }
      // .select() để biết có xoá được THẬT không — RLS chặn (tháng đã chốt,
      // quá hạn sửa) thì PostgREST trả 0 dòng chứ không báo lỗi, mà im lặng ở
      // đây nghĩa là người dùng tưởng đã xoá còn bảng công vẫn trừ công.
      window.MAY_CHU.from('gv_vang').delete().eq('id', id).select()
        .then(function (r) {
          if (r.error) { baoLoi(r.error); return; }
          if (!r.data || !r.data.length) {
            window.notify('Không xoá được — có thể tháng đã chốt bảng công, hoặc đã quá hạn sửa.');
            return;
          }
          window.notify('Đã xoá dòng vắng của ' + ten + '.');
          return taiLai();
        })
        .catch(baoLoi);
    },

    // Lưu người vắng — màn Điểm danh & Chấm công. Ghi thẳng vào gv_vang,
    // KHÔNG đụng bao_cao_dau_buoi: hai việc, hai bảng, hai nút.
    guiVang: function () {
      var b = buoiXem();
      var dsVang = Object.keys(BC_GV_VANG).map(function (em) {
        var v = BC_GV_VANG[em];
        return { ho_ten: v.ten,
          // khóa 'ten:…' nghĩa là người chưa có email (nhân viên hợp đồng)
          email: em.indexOf('ten:') === 0 ? null : em,
          co_so_ma: BC_CS,
          ly_do: v.lyDo, buoi: v.buoi || 'ca_ngay', ngay: homNayISO(),
          den_ngay: v.denNgay || null,
          // Dấu nguồn KÈM BUỔI — bcSua dựa vào đây để xoá đúng buổi, không
          // được bỏ chữ buổi đi (lỗi đã vá ở mục 12.4: sửa báo cáo chiều mà
          // xoá luôn sổ vắng buổi sáng).
          ghi_chu: 'Điểm danh ' + b,
          nguoi_ghi_id: idToi() };
      });
      if (!dsVang.length) { window.notify('Chưa chọn ai vắng.'); return; }
      // CSDL có ràng buộc den_ngay >= ngay — chặn trước cho lời báo dễ hiểu
      var denSai = dsVang.filter(function (v) { return v.den_ngay && v.den_ngay < v.ngay; })[0];
      if (denSai) { window.notify('Ô "nghỉ đến" của ' + denSai.ho_ten + ' đang ở QUÁ KHỨ — chọn lại hoặc để trống.'); return; }

      if (!THAT) {
        dsVang.forEach(function (v) { DL.gvVang.push({ ten: v.ho_ten, coSo: BC_CS, lyDo: v.ly_do,
          buoi: v.buoi, denNgay: v.den_ngay, tuBaoCao: true }); });
        BC_GV_VANG = {}; BC_MO_CHON_GV = false;
        veDieuHanh();
        window.notify('Đã lưu (bản mẫu — chưa ghi cơ sở dữ liệu).');
        return;
      }
      window.MAY_CHU.from('gv_vang').insert(dsVang)
        .then(function (r) {
          if (r.error) throw r.error;
          BC_GV_VANG = {}; BC_MO_CHON_GV = false;
          window.notify('✅ Đã lưu ' + dsVang.length + ' người vắng — bảng công tháng cộng lại ngay.');
          return taiLai();
        })
        .catch(baoLoi);
    },

    // ── Điểm danh HS ──
    ddDu: function (lop) {
      var b = buoiXem(), siSo = DL.lop[lop].siSo;
      if (!THAT) {
        DL.ddLop[b][lop] = { siSo: siSo, soVang: 0, luc: gioPhut() };
        veDieuHanh(); window.notify('Bản mẫu — chưa ghi cơ sở dữ liệu.');
        return;
      }
      window.MAY_CHU.from('diem_danh_lop').insert({
        ngay: homNayISO(), buoi: b, nam_hoc: NAM, lop: lop,
        si_so: siSo, so_vang: 0, nguoi_ghi_id: idToi()
      }).then(function (r) {
        if (r.error) {
          // 23505 = lớp này VỪA được người khác điểm danh (unique ngày+buổi+lớp)
          if (r.error.code === '23505') {
            window.notify('Lớp ' + lop + ' vừa được người khác điểm danh — màn hình sẽ cập nhật.');
            taiLai();
          } else baoLoi(r.error);
          return;
        }
        window.notify('✅ Lớp ' + lop + ': đủ ' + siSo + '/' + siSo + '.');
        taiLai();
      });
    },
    ddMoVang: function (lop) {
      LOP_MO = lop; LOP_CHON = {}; DS_DANG_MO = [];
      veDieuHanh();
      napHsLop(lop).then(function (ds) { DS_DANG_MO = ds; veDieuHanh(); })
        .catch(function (e) { LOP_MO = null; baoLoi(e); veDieuHanh(); });
    },
    ddDong: function () { LOP_MO = null; LOP_CHON = {}; DS_DANG_MO = []; veDieuHanh(); },
    ddTick: function (nut) {
      var ma = nut.getAttribute('data-ma');
      if (LOP_CHON[ma] !== undefined) delete LOP_CHON[ma];
      else LOP_CHON[ma] = { ten: nut.getAttribute('data-ten'), phep: 'co_phep' };
      veDieuHanh();
    },
    ddPhep: function (ma, phep) { if (LOP_CHON[ma]) LOP_CHON[ma].phep = phep; },
    ddLuu: function (lop) {
      var b = buoiXem(), siSo = DL.lop[lop].siSo;
      var dsVang = Object.keys(LOP_CHON).map(function (ma) {
        return { ngay: homNayISO(), buoi: b, nam_hoc: NAM, lop: lop,
          hoc_sinh_ma: ma, phep: LOP_CHON[ma].phep, nguoi_ghi_id: idToi() };
      });
      if (!THAT) {
        DL.ddLop[b][lop] = { siSo: siSo, soVang: dsVang.length, luc: gioPhut() };
        Object.keys(LOP_CHON).forEach(function (ma) {
          DL.hsVang.push({ lop: lop, buoi: b, ma: ma, ten: LOP_CHON[ma].ten, phep: LOP_CHON[ma].phep });
        });
        LOP_MO = null; LOP_CHON = {};
        veDieuHanh(); window.notify('Bản mẫu — chưa ghi cơ sở dữ liệu.');
        return;
      }
      var may = window.MAY_CHU;
      may.from('diem_danh_lop').insert({
        ngay: homNayISO(), buoi: b, nam_hoc: NAM, lop: lop,
        si_so: siSo, so_vang: dsVang.length, nguoi_ghi_id: idToi()
      }).then(function (r) {
        if (r.error) throw r.error;
        return dsVang.length ? may.from('hs_vang').insert(dsVang) : { error: null };
      }).then(function (r) {
        if (r.error) throw r.error;
        LOP_MO = null; LOP_CHON = {};
        window.notify('✅ Lớp ' + lop + ': đã ghi ' + dsVang.length + ' em vắng.');
        return taiLai();
      }).catch(function (e) {
        if (e && e.code === '23505') {
          LOP_MO = null; LOP_CHON = {};
          window.notify('Lớp ' + lop + ' vừa được người khác điểm danh — màn hình sẽ cập nhật.');
          taiLai();
        } else baoLoi(e);
      });
    },
    ddSua: function (lop) {
      var b = buoiXem();
      if (!THAT) {
        delete DL.ddLop[b][lop];
        DL.hsVang = DL.hsVang.filter(function (v) { return !(v.lop === lop && v.buoi === b); });
        veDieuHanh(); return;
      }
      var may = window.MAY_CHU, t = homNayISO();
      may.from('hs_vang').delete().eq('ngay', t).eq('buoi', b).eq('nam_hoc', NAM).eq('lop', lop)
        .then(function (r) {
          if (r.error) throw r.error;
          // .select() để biết có XÓA ĐƯỢC thật không — RLS chặn thì trả 0 dòng chứ không báo lỗi
          return may.from('diem_danh_lop').delete().eq('ngay', t).eq('buoi', b).eq('nam_hoc', NAM).eq('lop', lop).select();
        })
        .then(function (r) {
          if (r.error) throw r.error;
          if (!r.data || !r.data.length) {
            window.notify('Chỉ người đã điểm danh hoặc Ban giám hiệu mới sửa được lớp này.');
            return taiLai();
          }
          window.notify('Đã mở lại điểm danh lớp ' + lop + ' — ghi bản mới.');
          return taiLai();
        })
        .catch(baoLoi);
    },

    // ── Dạy thay (mẫu) ──
    dtChon: function (gv) {
      DAY_THAY.forEach(function (x) { if (!x.gv) x.gv = gv; });
      // veGiu chứ không veDieuHanh: phần Dạy thay nay nằm CHUNG một màn cuộn
      // với khung nhập của Lịch tuần, vẽ trắng là bay hết chữ đang gõ dở
      veGiu();
      window.notify('Bản mẫu — khi có thời khóa biểu, phân công sẽ ghi thật và báo cho giáo viên.');
    },

    // ── Việc trong tuần ──
    vDoi: function (id) {
      var v = DL.viec.filter(function (x) { return x.id === id; })[0];
      if (!v) return;
      var moi = v.tt === 'chua' ? 'dang' : v.tt === 'dang' ? 'xong' : 'chua';
      if (!THAT) { v.tt = moi; veGiu(); return; }
      window.MAY_CHU.from('cong_viec')
        .update({ trang_thai: moi, cap_nhat_luc: new Date().toISOString() })
        .eq('id', id)
        .then(function (r) {
          if (r.error) { baoLoi(r.error); return; }
          if (moi === 'xong') window.notify('🟢 Đã đánh dấu hoàn thành.');
          taiLai();
        });
    },
    vTienDo: function (id) {
      var v = DL.viec.filter(function (x) { return x.id === id; })[0];
      if (!v) return;
      var td = window.prompt('Tiến độ / vướng mắc (ghi ngắn gọn):', v.tienDo || '');
      if (td === null) return;      // bấm Hủy = không đổi gì
      td = td.trim();
      if (!THAT) { v.tienDo = td; veGiu(); return; }
      window.MAY_CHU.from('cong_viec')
        .update({ tien_do: td || null, cap_nhat_luc: new Date().toISOString() })
        .eq('id', id)
        .then(function (r) { if (r.error) baoLoi(r.error); else taiLai(); });
    },
    vGiao: function () {
      var noiDung = (($('#dh-viec-noidung') || {}).value || '').trim();
      if (!noiDung) { window.notify('Nhập nội dung việc cần giao.'); return; }
      var email = ($('#dh-viec-nguoi') || {}).value || '';
      var g = DL.gvDs.filter(function (x) { return x.email === email; })[0] || {};
      var han = ($('#dh-viec-han') || {}).value || null;
      var muc = ($('#dh-viec-muc') || {}).value || 'binh_thuong';
      if (!THAT) {
        DL.viec.push({ id: Date.now(), noiDung: noiDung, nguoiTen: g.ten || 'Người (mẫu)', nguoiEmail: email,
          coSo: g.coSo || null, han: han, muc: muc, tt: 'chua' });
        veDieuHanh(); window.notify('Bản mẫu — chưa ghi cơ sở dữ liệu.');
        return;
      }
      window.MAY_CHU.from('cong_viec').insert({
        noi_dung: noiDung, nguoi_email: email || null, nguoi_ten: g.ten || email,
        co_so_ma: g.coSo || null, han: han, muc: muc, tao_boi_id: idToi()
      }).then(function (r) {
        if (r.error) { baoLoi(r.error); return; }
        window.notify('✅ Đã giao việc cho ' + (g.ten || email) + '.');
        taiLai();
      });
    },

    // ── Báo việc / sự việc ──
    bvLoai: function (nut) { BV_LOAI = nut.getAttribute('data-loai'); veGiu(); },
    bvMuc: function (m) { BV_MUC = m; veGiu(); },
    bvGui: function () {
      var moTa = (($('#dh-bv-mota') || {}).value || '').trim();
      if (!BV_LOAI || !BV_MUC || !moTa) { window.notify('Chọn loại, mức độ và mô tả ngắn trước khi gửi.'); return; }
      var coSo = ($('#dh-bv-coso') || {}).value || (DL.coSo[0] || {}).ma;
      if (!THAT) {
        DL.suViec.unshift({ id: Date.now(), loai: BV_LOAI, muc: BV_MUC, moTa: moTa,
          nguoiTen: 'Giáo viên (mẫu)', coSo: coSo, luc: gioPhut(), tt: 'moi' });
        BV_LOAI = null; BV_MUC = null;
        veDieuHanh(); window.notify('Bản mẫu — chưa ghi cơ sở dữ liệu.');
        return;
      }
      window.MAY_CHU.from('su_viec').insert({
        loai: BV_LOAI, muc: BV_MUC, mo_ta: moTa, co_so_ma: coSo,
        nguoi_bao_id: idToi(), nguoi_bao_ten: tenToi()
      }).then(function (r) {
        if (r.error) { baoLoi(r.error); return; }
        BV_LOAI = null; BV_MUC = null;
        window.notify('✅ Đã gửi — Ban giám hiệu sẽ thấy ngay trên dashboard.');
        taiLai();
      });
    },
    svTiepNhan: function (id) {
      if (!THAT) {
        var s = DL.suViec.filter(function (x) { return x.id === id; })[0];
        if (s) s.tt = 'tiep_nhan';
        veDieuHanh(); return;
      }
      window.MAY_CHU.from('su_viec')
        .update({ trang_thai: 'tiep_nhan', tiep_nhan_luc: new Date().toISOString() })
        .eq('id', id)
        .then(function (r) { if (r.error) baoLoi(r.error); else taiLai(); });
    },
    svXuLy: function (id) {
      var kq = window.prompt('Kết quả xử lý (ghi ngắn gọn — lưu vào nhật ký, để trống cũng được):', '');
      if (kq === null) return;      // bấm Hủy = chưa đóng sự việc
      kq = kq.trim();
      if (!THAT) {
        var s = DL.suViec.filter(function (x) { return x.id === id; })[0];
        if (s) { s.tt = 'da_xu_ly'; s.ketQua = kq; }
        veDieuHanh(); return;
      }
      window.MAY_CHU.from('su_viec')
        .update({ trang_thai: 'da_xu_ly', ket_qua: kq || null, xu_ly_luc: new Date().toISOString() })
        .eq('id', id)
        .then(function (r) {
          if (r.error) baoLoi(r.error);
          else { window.notify('🟢 Đã đóng sự việc.'); taiLai(); }
        });
    },

    // ── Đề xuất ──
    dxLoai: function (ma) { DX_LOAI = DX_LOAI === ma ? null : ma; veGiu(); },
    dxGui: function () {
      if (!DX_LOAI) { window.notify('Chọn loại đề xuất trước.'); return; }
      var laNghi = LOAI_DX_NGHI.indexOf(DX_LOAI) >= 0;
      var noiDung = (($('#dh-dx-noidung') || {}).value || '').trim();
      if (!noiDung) { window.notify(laNghi ? 'Ghi lý do ngắn gọn trước khi gửi.' : 'Ghi nội dung đề xuất trước khi gửi.'); return; }
      var tu = laNghi ? (($('#dh-dx-tu') || {}).value || '') : null;
      var den = laNghi ? (($('#dh-dx-den') || {}).value || '') : null;
      var buoi = laNghi ? ((($('#dh-dx-buoi') || {}).value) || 'ca_ngay') : 'ca_ngay';
      if (laNghi && !tu) { window.notify('Chọn ngày bắt đầu nghỉ.'); return; }
      if (den && tu && den < tu) { window.notify('Ô "đến ngày" đang TRƯỚC ngày bắt đầu — chọn lại.'); return; }
      var coSo = ($('#dh-dx-coso') || {}).value ||
        (DL.gvDs.filter(function (g) { return g.email === emailToi(); })[0] || {}).coSo ||
        (DL.coSo[0] || {}).ma;
      if (!THAT) {
        DL.deXuat.unshift({ id: Date.now(), loai: DX_LOAI, noiDung: noiDung, tuNgay: tu || '',
          denNgay: den || '', buoi: buoi, coSo: coSo, tt: 'cho_duyet', ten: 'Giáo viên (mẫu)',
          email: emailToi() || 'mau@mau', luc: gioPhut(), nguoiDuyet: '', ghiChuDuyet: '' });
        DX_LOAI = null; veDieuHanh(); window.notify('Bản mẫu — chưa ghi cơ sở dữ liệu.');
        return;
      }
      window.MAY_CHU.from('de_xuat').insert({
        loai: DX_LOAI, noi_dung: noiDung, tu_ngay: tu || null, den_ngay: den || null,
        buoi: buoi, co_so_ma: coSo || null,
        nguoi_gui_id: idToi(), nguoi_gui_ten: tenToi(), nguoi_gui_email: emailToi() || null
      }).then(function (r) {
        if (r.error) { baoLoi(r.error); return; }
        DX_LOAI = null;
        window.notify('✅ Đã gửi — Ban giám hiệu sẽ thấy ở "Cần tôi xử lý".');
        taiLai();
      });
    },
    dxDuyet: function (id, dongY) {
      var ghiChu = null;
      if (!dongY) {
        ghiChu = window.prompt('Lý do từ chối (người gửi sẽ đọc được):', '');
        if (ghiChu === null) return;    // bấm Hủy = chưa quyết
      }
      if (!THAT) {
        var d = DL.deXuat.filter(function (x) { return x.id === id; })[0];
        if (d && d.tt === 'cho_duyet') {
          d.tt = dongY ? 'dong_y' : 'tu_choi';
          d.nguoiDuyet = 'BGH (mẫu)'; d.ghiChuDuyet = (ghiChu || '').trim();
          if (dongY && LOAI_DX_NGHI.indexOf(d.loai) >= 0) {
            DL.gvVang.push({ ten: d.ten, coSo: d.coSo, lyDo: tenLoaiDX(d.loai), buoi: d.buoi, denNgay: d.denNgay });
          }
        }
        veGiu(); return;
      }
      window.MAY_CHU.rpc('duyet_de_xuat', { p_id: id, p_dong_y: dongY, p_ghi_chu: ghiChu })
        .then(function (r) {
          if (r.error) { baoLoi(r.error); return; }
          window.notify(dongY
            ? '✅ Đã duyệt — đơn nghỉ được tự ghi vào danh sách vắng, khỏi báo lại.'
            : 'Đã từ chối — người gửi sẽ thấy lý do trong "Đơn của tôi".');
          taiLai();
        });
    },
    dxRut: function (id) {
      if (!window.confirm('Rút đề xuất này? Đơn sẽ bị xóa khỏi hàng chờ duyệt.')) return;
      if (!THAT) {
        DL.deXuat = DL.deXuat.filter(function (x) { return x.id !== id; });
        veGiu(); return;
      }
      // .select() để biết có xóa được thật không — RLS chặn thì trả 0 dòng
      window.MAY_CHU.from('de_xuat').delete().eq('id', id).eq('trang_thai', 'cho_duyet').select()
        .then(function (r) {
          if (r.error) { baoLoi(r.error); return; }
          if (!r.data || !r.data.length) {
            window.notify('Không rút được — đơn có thể vừa được duyệt. Màn hình sẽ cập nhật.');
          }
          taiLai();
        });
    },

    // ── Thông báo ──
    tbGui: function () {
      var tieuDe = (($('#dh-tb-tieude') || {}).value || '').trim();
      if (!tieuDe) { window.notify('Nhập tiêu đề thông báo.'); return; }
      var noiDung = (($('#dh-tb-noidung') || {}).value || '').trim();
      var coSo = ($('#dh-tb-phamvi') || {}).value || '';
      var canXN = !!(($('#dh-tb-xacnhan') || {}).checked);
      if (!THAT) {
        DL.thongBao.unshift({ id: Date.now(), tieuDe: tieuDe, noiDung: noiDung, canXacNhan: canXN,
          phamVi: coSo ? 'co_so' : 'toan_truong', coSo: coSo || null, nguoiGui: tenToi(),
          luc: gioPhut(), ngay: homNayISO(), daXNEmail: {}, soXacNhan: 0,
          toiDaXacNhan: false, toiDaXem: true });
        veDieuHanh(); window.notify('Bản mẫu — chưa ghi cơ sở dữ liệu.');
        return;
      }
      window.MAY_CHU.from('thong_bao').insert({
        tieu_de: tieuDe, noi_dung: noiDung || null,
        pham_vi: coSo ? 'co_so' : 'toan_truong', co_so_ma: coSo || null,
        can_xac_nhan: canXN, nguoi_gui_id: idToi(), nguoi_gui_ten: tenToi()
      }).then(function (r) {
        if (r.error) { baoLoi(r.error); return; }
        window.notify('📢 Đã gửi thông báo.');
        taiLai();
      });
    },
    tbXacNhan: function (id) {
      if (!THAT) {
        var x = DL.thongBao.filter(function (b) { return b.id === id; })[0];
        if (x && !x.toiDaXacNhan) { x.toiDaXacNhan = true; x.soXacNhan++; }
        veGiu(); return;
      }
      // Không gửi xem_luc ở đây — kẻo ghi đè mốc "đã xem" gốc; email/họ tên
      // do trigger tbn_chot_nguoi phía máy chủ tự chép từ tài khoản thật
      window.MAY_CHU.from('thong_bao_nhan').upsert({
        thong_bao_id: id, nguoi_id: idToi(),
        xac_nhan_luc: new Date().toISOString()
      }, { onConflict: 'thong_bao_id,nguoi_id' }).then(function (r) {
        if (r.error) { baoLoi(r.error); return; }
        window.notify('✅ Đã xác nhận — Ban giám hiệu thấy ngay.');
        taiLai();
      });
    },

    // ── Việc: lọc + mẫu định kỳ ──
    vLoc: function (ma) { VIEC_LOC = ma; veGiu(); },
    vmDoiChuKy: function (ck) {
      // đổi ô nhập theo chu kỳ NGAY TRONG TRANG, không vẽ lại (giữ chữ đã gõ)
      var oThu = $('#dh-vm-o-thu'), oNgay = $('#dh-vm-o-ngay'), oThang = $('#dh-vm-o-thang');
      if (oThu) oThu.style.display = ck === 'tuan' ? '' : 'none';
      if (oNgay) oNgay.style.display = ck === 'tuan' ? 'none' : '';
      if (oThang) oThang.style.display = ck === 'nam' ? '' : 'none';
    },
    vmThem: function () {
      var noiDung = (($('#dh-vm-noidung') || {}).value || '').trim();
      if (!noiDung) { window.notify('Nhập nội dung việc định kỳ.'); return; }
      var email = ($('#dh-vm-nguoi') || {}).value || '';
      var g = DL.gvDs.filter(function (x) { return x.email === email; })[0] || {};
      var ck = ($('#dh-vm-chuky') || {}).value || 'thang';
      var thu = parseInt(($('#dh-vm-thu') || {}).value, 10) || 6;
      var ngay = parseInt(($('#dh-vm-ngay') || {}).value, 10) || 28;
      var thang = parseInt(($('#dh-vm-thang') || {}).value, 10) || 9;
      var truoc = parseInt(($('#dh-vm-truoc') || {}).value, 10);
      if (isNaN(truoc) || truoc < 0 || truoc > 14) truoc = 3;
      if (ngay < 1 || ngay > 28) { window.notify('Ngày trong tháng chỉ nhận 1–28 (tránh lệch tháng thiếu ngày).'); return; }
      if (!THAT) {
        DL.viecMau.push({ id: Date.now(), noiDung: noiDung, nguoiTen: g.ten || 'Người (mẫu)',
          nguoiEmail: email, coSo: g.coSo || null, muc: 'binh_thuong', chuKy: ck,
          thu: thu, ngay: ngay, thang: thang, sinhTruoc: truoc, dangBat: true });
        veDieuHanh(); window.notify('Bản mẫu — chưa ghi cơ sở dữ liệu.');
        return;
      }
      window.MAY_CHU.from('cong_viec_mau').insert({
        noi_dung: noiDung, nguoi_email: email || null, nguoi_ten: g.ten || email,
        co_so_ma: g.coSo || null, chu_ky: ck,
        thu: ck === 'tuan' ? thu : null,
        ngay: ck === 'tuan' ? null : ngay,
        thang: ck === 'nam' ? thang : null,
        sinh_truoc_ngay: truoc, tao_boi_id: idToi()
      }).then(function (r) {
        if (r.error) { baoLoi(r.error); return; }
        window.notify('🔁 Đã thêm mẫu — đến kỳ, việc tự sinh, không ai phải nhớ.');
        taiLai();
      });
    },
    vmBat: function (id, bat) {
      if (!THAT) {
        var m = DL.viecMau.filter(function (x) { return x.id === id; })[0];
        if (m) m.dangBat = bat;
        veGiu(); return;
      }
      window.MAY_CHU.from('cong_viec_mau').update({ dang_bat: bat }).eq('id', id).select()
        .then(function (r) {
          if (r.error) { baoLoi(r.error); return; }
          if (!r.data || !r.data.length) window.notify('Chỉ Ban giám hiệu mới bật/tắt được mẫu việc.');
          taiLai();
        });
    },
    vmXoa: function (id) {
      if (!window.confirm('Xóa mẫu việc định kỳ này? Việc đã sinh ra trước đó vẫn giữ nguyên.')) return;
      if (!THAT) {
        DL.viecMau = DL.viecMau.filter(function (x) { return x.id !== id; });
        veGiu(); return;
      }
      window.MAY_CHU.from('cong_viec_mau').delete().eq('id', id).select()
        .then(function (r) {
          if (r.error) { baoLoi(r.error); return; }
          if (!r.data || !r.data.length) window.notify('Chỉ Ban giám hiệu mới xóa được mẫu việc.');
          taiLai();
        });
    },

    // ── Kiểm tra điểm trường ──
    ktChonCS: function (ma) { KT_CS = ma; veGiu(); },
    ktMuc: function (m, gia) { KT_MUC[m] = gia; veGiu(); },
    ktLuu: function () {
      var ghiChu = (($('#dh-kt-ghichu') || {}).value || '').trim();
      var canXuLy = Object.keys(KT_MUC).filter(function (m) { return KT_MUC[m] === 'can_xu_ly'; });
      if (canXuLy.length && !ghiChu) { window.notify('Có mục ⚠ — ghi chú ngắn để người xử lý biết việc gì.'); return; }
      if (!THAT) {
        DL.ktDs.unshift({ id: Date.now(), ngay: homNayISO(), coSo: KT_CS,
          muc: JSON.parse(JSON.stringify(KT_MUC)), ghiChu: ghiChu,
          ten: 'BGH (mẫu)', luc: gioPhut(), coCanhBao: canXuLy.length > 0 });
        KT_MUC = { day_hoc: 'dat', ne_nep: 'dat', ve_sinh: 'dat', an_toan: 'dat', csvc: 'dat' };
        veDieuHanh(); window.notify('Bản mẫu — chưa ghi cơ sở dữ liệu.');
        return;
      }
      var may = window.MAY_CHU;
      var ban = { co_so_ma: KT_CS, ghi_chu: ghiChu || null, nguoi_kt_id: idToi(), nguoi_kt_ten: tenToi() };
      Object.keys(KT_MUC).forEach(function (m) { ban[m] = KT_MUC[m]; });
      may.from('kiem_tra_diem_truong').insert(ban).then(function (r) {
        if (r.error) throw r.error;
        if (!canXuLy.length) return { error: null };
        // Mục ⚠ tự sinh thành SỰ VIỆC để theo dõi xử lý — không nhập lại
        var LOAI_SV = { an_toan: 'An ninh', csvc: 'Cơ sở vật chất', ve_sinh: 'Cơ sở vật chất',
          day_hoc: 'Khác', ne_nep: 'Khác' };
        return may.from('su_viec').insert(canXuLy.map(function (m) {
          return { loai: LOAI_SV[m], muc: 'vang',
            mo_ta: '[Kiểm tra điểm trường] ' + KT_TEN[m] + ' cần xử lý' + (ghiChu ? ': ' + ghiChu : ''),
            co_so_ma: KT_CS, nguoi_bao_id: idToi(), nguoi_bao_ten: tenToi() };
        }));
      }).then(function (r) {
        if (r.error) throw r.error;
        KT_MUC = { day_hoc: 'dat', ne_nep: 'dat', ve_sinh: 'dat', an_toan: 'dat', csvc: 'dat' };
        window.notify('✅ Đã lưu phiếu kiểm tra' +
          (canXuLy.length ? ' — ' + canXuLy.length + ' mục ⚠ đã thành sự việc để theo dõi.' : '.'));
        return taiLai();
      }).catch(baoLoi);
    },

    // ── Bảng công tháng ──
    congThang: function (buoc) {
      var moi = thangDich(CONG_THANG || thangNay(), buoc);
      if (moi > thangNay() || moi < MOC_CONG_SOM) return;   // không đi quá hai đầu
      CONG_THANG = moi; CONG_KQ = null; CONG_LOI = '';
      veGiu();
    },
    nghiThem: function () {
      var ngay = (($('#dh-nghi-ngay') || {}).value || '').trim();
      var ten = (($('#dh-nghi-ten') || {}).value || '').trim();
      var loai = (($('#dh-nghi-loai') || {}).value || 'le');
      if (!ngay) { window.notify('Chọn ngày trước đã.'); return; }
      if (!ten) { window.notify('Ghi tên ngày nghỉ (ví dụ: Nghỉ bù Tết Nguyên đán).'); return; }
      if (ngay.slice(0, 7) !== CONG_THANG) {
        window.notify('Ngày này không thuộc ' + thangChu(CONG_THANG) + ' — chuyển sang tháng đó rồi thêm.');
        return;
      }
      if (!THAT) {
        if (CONG_NGHI_MAU.filter(function (n) { return n.ngay === ngay; }).length) {
          window.notify('Ngày ' + ngayVN(ngay) + ' đã được khai rồi.');
          return;
        }
        // id âm = dòng của bản mẫu, để nút Xóa vẫn hiện và gỡ được
        CONG_NGHI_MAU.push({ id: -CONG_NGHI_MAU.length - 1, ngay: ngay, loai: loai, ten: ten });
        CONG_THU = ''; CONG_KQ = null;      // dựng lại cả bảng mẫu cho đúng
        veGiu(); window.notify('Bản mẫu — chưa ghi cơ sở dữ liệu.');
        return;
      }
      window.MAY_CHU.from('ngay_nghi')
        .insert({ ngay: ngay, loai: loai, ten: ten, nguoi_ghi_id: idToi() })
        .then(function (r) {
          if (r.error) {
            // 23505 = trùng ngày (unique) · 42501 = RLS chặn (không phải BGH)
            var ma = r.error.code;
            baoLoi(ma === '23505'
              ? { message: 'Ngày ' + ngayVN(ngay) + ' đã được khai rồi — xóa dòng cũ nếu muốn sửa.' }
              : ma === '42501'
                ? { message: 'Chỉ Ban giám hiệu mới khai được ngày nghỉ.' }
                : r.error);
            return;
          }
          // Dọn ô nhập, kẻo veGiu() khôi phục đúng giá trị vừa gửi rồi người
          // ta bấm Thêm lần nữa theo phản xạ và ăn ngay lỗi trùng ngày
          var oN = $('#dh-nghi-ngay'), oT = $('#dh-nghi-ten');
          if (oN) oN.value = '';
          if (oT) oT.value = '';
          CONG_THU = ''; CONG_KQ = null;     // buộc tính lại tháng đang xem
          window.notify('📌 Đã thêm — bảng công tính lại ngay.');
          veGiu();
        });
    },
    nghiXoa: function (id) {
      if (!id) return;
      if (!window.confirm('Xóa ngày nghỉ này? Bảng công của cả trường sẽ tính lại.')) return;
      if (!THAT) {
        CONG_NGHI_MAU = CONG_NGHI_MAU.filter(function (n) { return n.id !== id; });
        CONG_THU = ''; CONG_KQ = null;
        veGiu(); return;
      }
      window.MAY_CHU.from('ngay_nghi').delete().eq('id', id).select()
        .then(function (r) {
          if (r.error) { baoLoi(r.error); return; }
          if (!r.data || !r.data.length) { window.notify('Chỉ Ban giám hiệu mới xóa được ngày nghỉ.'); return; }
          CONG_THU = ''; CONG_KQ = null;
          veGiu();
        });
    },
    congChot: function () {
      if (CONG_KQ && CONG_KQ.dangDienRa &&
          !window.confirm('Tháng ' + thangSo(CONG_THANG) + ' CHƯA KẾT THÚC. Vẫn chốt?')) return;
      if (!window.confirm('Chốt bảng công ' + thangChu(CONG_THANG) + '?\n' +
        'Người phụ trách điểm sẽ không sửa được sổ vắng của tháng này nữa (Ban giám hiệu vẫn mở lại được).')) return;
      if (!THAT) { CONG_CHOT.push(CONG_THANG); veGiu(); window.notify('Bản mẫu — chưa ghi cơ sở dữ liệu.'); return; }
      window.MAY_CHU.from('cong_thang_chot').insert({ thang: CONG_THANG }).then(function (r) {
        if (r.error) {
          baoLoi(r.error.code === '23505' ? { message: 'Tháng này đã chốt rồi.' } : r.error);
          return;
        }
        CONG_THU = ''; CONG_KQ = null;
        window.notify('🔒 Đã chốt bảng công ' + thangChu(CONG_THANG) + '.');
        veGiu();
      });
    },
    congMoChot: function () {
      if (!window.confirm('Mở lại ' + thangChu(CONG_THANG) + ' để đính chính?')) return;
      if (!THAT) {
        CONG_CHOT = CONG_CHOT.filter(function (x) { return x !== CONG_THANG; });
        veGiu(); return;
      }
      window.MAY_CHU.from('cong_thang_chot').delete().eq('thang', CONG_THANG).select()
        .then(function (r) {
          if (r.error) { baoLoi(r.error); return; }
          if (!r.data || !r.data.length) { window.notify('Chỉ Ban giám hiệu mới mở lại được tháng đã chốt.'); return; }
          CONG_THU = ''; CONG_KQ = null;
          window.notify('🔓 Đã mở lại ' + thangChu(CONG_THANG) + '.');
          veGiu();
        });
    },
    congWord: function () {
      var W = window.WORD_TIEN_ICH;
      if (!W) { window.notify('Chưa nạp được bộ xuất Word (js/xuat-word.js).'); return; }
      if (!CONG_KQ || CONG_KQ.thang !== CONG_THANG) { window.notify('Bảng công chưa tính xong.'); return; }
      if (!laQT()) { window.notify('Chỉ Ban giám hiệu mới xuất được bảng công toàn trường.'); return; }
      var k = CONG_KQ, nhieuCS = DL.coSo.length > 1;
      // Bảng gắn class "co-dinh" thì PHẢI khai bề rộng từng cột, nếu không
      // Word tự dàn theo nội dung: cột họ tên co lại còn hơn 4cm, "Nguyễn Thị
      // Thanh Huyền" bị bẻ ba dòng trong khi năm cột số bỏ trống một nửa.
      var rTen = nhieuCS ? 20 : 26, rCS = nhieuCS ? 12 : 0;
      var rLyDo = 8, rCuoi = (100 - rTen - rCS - rLyDo * CONG_LY_DO.length) / 3;
      var dau = '<tr><th style="text-align:left;width:' + rTen + '%">Họ và tên</th>' +
        (nhieuCS ? '<th style="width:' + rCS + '%">Cơ sở</th>' : '') +
        CONG_LY_DO.map(function (l) {
          return '<th style="width:' + rLyDo + '%">' + W.chan(l) + '</th>';
        }).join('') +
        '<th style="width:' + rCuoi + '%">Tổng vắng</th>' +
        '<th style="width:' + rCuoi + '%">Có mặt</th>' +
        '<th style="width:' + rCuoi + '%">Báo muộn</th></tr>';
      var than = k.hang.map(function (h, i) {
        return '<tr><td>' + (i + 1) + '. ' + W.chan(h.ten) + '</td>' +
          (nhieuCS ? '<td class="giua">' + W.chan(tenCoSo(h.coSo)) + '</td>' : '') +
          CONG_LY_DO.map(function (l) {
            return '<td class="giua">' + (h.theo[l] || '') + '</td>';
          }).join('') +
          '<td class="giua">' + (h.tong || '') + '</td>' +
          '<td class="giua"><b>' + h.coMat + '</b></td>' +
          '<td class="giua">' + (h.baoMuon || '') + '</td></tr>';
      }).join('');
      var dsNghi = k.nghi.length
        ? '<p style="margin-top:10pt"><b>Ngày nghỉ trong tháng:</b> ' +
          k.nghi.map(function (n) {
            return W.chan(ngayVN(n.ngay) + ' (' + n.ten + ')' + (n.loai === 'lam_bu' ? ' — đi làm bù' : ''));
          }).join(' · ') + '.</p>'
        : '';
      var thanBai = W.theThuc() +
        '<p class="giua" style="margin-top:18pt"><b style="font-size:14pt">BẢNG TỔNG HỢP NGÀY CÔNG</b></p>' +
        '<p class="giua" style="margin-top:2pt"><b>Tháng ' + thangSo(CONG_THANG) + ' năm ' + CONG_THANG.slice(0, 4) + '</b></p>' +
        (k.dangDienRa
          ? '<p class="giua nghieng" style="margin-top:2pt">(Tháng chưa kết thúc — tính đến hết ngày ' +
            W.chan(ngayVN(k.tinhDen)) + ')</p>'
          : '') +
        '<p style="margin-top:12pt">Đơn vị tính: <b>buổi</b> (mỗi ngày 2 buổi). ' +
        (k.dangDienRa ? 'Tính đến ngày ' + W.chan(ngayVN(k.tinhDen)) + ', tháng này đã qua <b>'
                      : 'Tháng này có <b>') +
        k.soNgayLam + '</b> ngày làm việc, tương ứng <b>' + k.buoiChuan + '</b> buổi chuẩn. ' +
        'Số liệu tổng hợp từ sổ theo dõi vắng hằng ngày của các điểm trường; danh sách gồm <b>' +
        k.hang.length + '</b> cán bộ, giáo viên, nhân viên có tên trong danh sách nhân sự nhà trường.</p>' +
        '<table class="co-dinh"><thead>' + dau + '</thead><tbody>' + than + '</tbody></table>' +
        dsNghi +
        '<p class="nghieng" style="margin-top:10pt;font-size:12pt">Ghi chú: bảng chưa bao gồm số tiết dạy thay ' +
        'và giờ dạy vượt định mức.' +
        (k.dangDienRa ? ' Đây <b>chưa phải bản chốt tháng</b>.' : '') + '</p>' +
        W.khoiKy('NGƯỜI LẬP BẢNG', THAT ? tenToi() : '');
      W.taiVe(W.khungWord('Bảng công ' + thangChu(CONG_THANG), thanBai, true),
        'bang-cong-' + CONG_THANG + '.doc');
    }
  };

  // ── Khởi động: vẽ bản mẫu ngay; đăng nhập xong thì nạp dữ liệu thật ──
  document.addEventListener('DOMContentLoaded', veDieuHanh);
  document.addEventListener('dangnhap-xong', function () { napThat(); });
  // Phòng khi sự kiện đã phát trước lúc file này nạp
  if (window.NGUOI_DUNG && window.MAY_CHU) napThat();
})();
