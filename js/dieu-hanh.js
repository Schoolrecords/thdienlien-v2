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
  function tenBuoi(b) { return b === 'sang' ? 'buổi sáng' : 'buổi chiều'; }

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
    return DL.coSo.filter(function (c) { return c.phuTrach && c.phuTrach === emailToi(); })
      .map(function (c) { return c.ma; });
  }
  function tenCoSo(ma) {
    var c = DL.coSo.filter(function (x) { return x.ma === ma; })[0];
    return c ? c.ten : (ma || 'Toàn trường');
  }

  // ── Bản mẫu (khi chưa nối) — tên người, tên lớp đều là GIẢ ĐỊNH ──
  function duLieuMau() {
    return {
      coSo: [
        { ma: 'CS01', ten: 'Cơ sở chính', loai: 'chinh', phuTrach: '', gvTong: 20 },
        { ma: 'CS02', ten: 'Điểm trường số 2 (mẫu)', loai: 'diem_truong', phuTrach: '', gvTong: 10 },
        { ma: 'CS03', ten: 'Điểm trường số 3 (mẫu)', loai: 'diem_truong', phuTrach: '', gvTong: 7 }
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
        CS01: { sang: { anToan: 'xanh', luc: '7:05', ghiChu: '', chieuKhongHoc: false } },
        CS02: { sang: { anToan: 'vang', luc: '7:12', ghiChu: 'Đường ống nước khu vệ sinh bị rò, đã khoá van tạm.', chieuKhongHoc: false } },
        CS03: {}
      },
      gvVang: [
        { ten: 'Cô Nguyễn Thị A.', coSo: 'CS01', lyDo: 'Nghỉ ốm', buoi: 'ca_ngay' },
        { ten: 'Thầy Trần Văn B.', coSo: 'CS02', lyDo: 'Công tác', buoi: 'ca_ngay' }
      ],
      ddLop: { sang: { '1A': { siSo: 35, soVang: 0, luc: '7:02' }, '2A': { siSo: 33, soVang: 1, luc: '7:04' }, '4A': { siSo: 34, soVang: 2, luc: '7:06' } }, chieu: {} },
      hsVang: [
        { lop: '2A', buoi: 'sang', ma: 'M1', ten: 'Nguyễn Văn An (mẫu)', phep: 'co_phep' },
        { lop: '4A', buoi: 'sang', ma: 'M2', ten: 'Trần Thị Bích (mẫu)', phep: 'co_phep' },
        { lop: '4A', buoi: 'sang', ma: 'M3', ten: 'Lê Văn Cường (mẫu)', phep: 'chua_ro' }
      ],
      nghiDai: [{ ten: 'Lê Văn Cường (mẫu)', lop: '4A', soBuoi: 3 }],
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
      ]
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

  function napThat() {
    var may = window.MAY_CHU;
    if (!may || !window.NGUOI_DUNG) return Promise.resolve();
    var t = homNayISO();

    // Bảng của sql/20 hỏi TRƯỚC — thiếu là biết ngay, khỏi nửa thật nửa mẫu
    return may.from('bao_cao_dau_buoi').select('id').limit(1)
      .then(function (r) {
        if (r.error) throw r.error;
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
          viec: [], suViec: [], nhatKy: []
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
        DL = moi; THAT = true; LOI_SQL = '';
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
        veDieuHanh();
      });
  }

  // Dữ liệu "hôm nay" — gọi lại sau MỖI thao tác ghi để màn luôn đúng CSDL
  function napHomNay(moi) {
    var may = window.MAY_CHU;
    var t = homNayISO(), tuan = ngayISOCach(-6);
    return Promise.all([
      may.from('bao_cao_dau_buoi')
        .select('co_so_ma, buoi, an_toan, ghi_chu, chieu_khong_hoc, gui_luc').eq('ngay', t),
      may.from('gv_vang')
        .select('ho_ten, email, co_so_ma, ly_do, buoi, ngay, den_ngay, bao_muon')
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
        .order('bao_luc', { ascending: false }).limit(100)
    ]).then(function (kq) {
      kq.forEach(function (r) { if (r.error) throw r.error; });
      moi.baoCao = {}; moi.gvVang = []; moi.ddLop = { sang: {}, chieu: {} };
      moi.hsVang = []; moi.nghiDai = []; moi.viec = []; moi.suViec = []; moi.nhatKy = [];

      (kq[0].data || []).forEach(function (b) {
        if (!moi.baoCao[b.co_so_ma]) moi.baoCao[b.co_so_ma] = {};
        moi.baoCao[b.co_so_ma][b.buoi] = {
          anToan: b.an_toan, ghiChu: b.ghi_chu || '',
          chieuKhongHoc: !!b.chieu_khong_hoc, luc: gioTu(b.gui_luc)
        };
        moi.nhatKy.push({ khi: b.gui_luc, chu: tenCoSoTho(moi, b.co_so_ma) + ' báo cáo ' + tenBuoi(b.buoi) + ': ' +
          (b.an_toan === 'xanh' ? '🟢 An toàn' : b.an_toan === 'vang' ? '🟡 Cần lưu ý' : '🔴 Có sự việc') +
          (b.ghi_chu ? ' — ' + b.ghi_chu : '') });
      });
      (kq[1].data || []).forEach(function (g) {
        moi.gvVang.push({ ten: g.ho_ten, email: g.email, coSo: g.co_so_ma, lyDo: g.ly_do, buoi: g.buoi,
          denNgay: g.den_ngay, baoMuon: g.bao_muon });
      });
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
        demNghi[k].ngay[v.ngay] = 1;
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
        moi.nhatKy.push({ khi: s.bao_luc, chu: (s.muc === 'do' ? '🔴' : '🟡') + ' Báo việc: ' + s.loai + ' — ' + s.mo_ta +
          ' (' + s.nguoi_bao_ten + ')' });
        if (s.xu_ly_luc) moi.nhatKy.push({ khi: s.xu_ly_luc, chu: '🟢 Đã xử lý sự việc: ' + s.loai + (s.ket_qua ? ' — ' + s.ket_qua : '') });
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
    var b = buoiHienTai();

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

    return { dsCS: dsCS, buoi: b, gvTong: gvTong, gvVang: gvVang,
      hsTong: hsTong, hsVang: hsVang, lopDaDD: lopDaDD, lopTong: cacLop.length,
      soXanh: soXanh, soVang: soVang, soDo: soDo, soChua: soChua, soNghiChieu: soNghiChieu,
      viecTong: viec.length, vXong: viec.filter(function (v) { return v.tt === 'xong'; }).length,
      vQuaHan: vQuaHan, vHomNay: vHomNay, svCanXuLy: svCanXuLy, tietThieu: tietThieu };
  }

  // ════════════════════════════════════════════════════════════
  // TAB 1 · ĐIỀU HÀNH HÔM NAY
  // ════════════════════════════════════════════════════════════
  function veHomNay() {
    var t = tinh();
    var bang;
    if (t.soDo) bang = '<div class="dh-bang do">🔴 CÓ SỰ VIỆC CẦN XỬ LÝ NGAY</div>';
    else if (t.soChua) bang = '<div class="dh-bang xam">⚪ ' + t.soChua + ' điểm trường CHƯA XÁC NHẬN ' + tenBuoi(t.buoi) + ' — chưa được coi là an toàn</div>';
    else if (t.soVang) bang = '<div class="dh-bang vang">🟡 Có điểm trường cần lưu ý</div>';
    else bang = '<div class="dh-bang xanh">🟢 TOÀN TRƯỜNG AN TOÀN</div>';

    var the5 =
      '<div class="luoi-thong-ke dh-5the">' +
      '<div class="o-so"><div class="so trang">' + (t.gvTong - t.gvVang.length) + '/' + t.gvTong + '</div><div class="nhan">CBGV-NV có mặt · ' + t.gvVang.length + ' vắng</div></div>' +
      '<div class="o-so"><div class="so trang">' + (t.hsTong - t.hsVang).toLocaleString('vi-VN') + '/' + t.hsTong.toLocaleString('vi-VN') + '</div><div class="nhan">học sinh · ' + t.hsVang + ' vắng · ' + t.lopDaDD + '/' + t.lopTong + ' lớp đã điểm danh</div></div>' +
      '<div class="o-so"><div class="so xanh">' + t.soXanh + '/' + t.dsCS.length + '</div><div class="nhan">điểm trường an toàn' + (t.soChua ? ' · ' + t.soChua + ' chưa xác nhận' : '') + '</div></div>' +
      '<div class="o-so"><div class="so vang">' + t.vXong + '/' + t.viecTong + '</div><div class="nhan">việc hoàn thành' + (t.vQuaHan ? ' · ' + t.vQuaHan + ' quá hạn' : '') + '</div></div>' +
      '<div class="o-so"><div class="so ' + (t.svCanXuLy ? 'hong' : 'xanh') + '">' + t.svCanXuLy + '</div><div class="nhan">sự việc cần xử lý</div></div>' +
      '</div>';

    var hangCS = DL.coSo.map(function (c) {
      var bc = (DL.baoCao[c.ma] || {})[t.buoi];
      var sang = (DL.baoCao[c.ma] || {}).sang;
      var cham, chu, nutBC = '';
      if (t.buoi === 'chieu' && !bc && sang && sang.chieuKhongHoc) {
        cham = 'xam'; chu = 'Chiều nay không học (đã báo từ buổi sáng)';
      } else if (!bc) {
        cham = 'xam'; chu = 'Chưa báo cáo ' + tenBuoi(t.buoi);
        if (coSoDuocBao().indexOf(c.ma) >= 0) nutBC = '<button class="dh-nut-nho" onclick="DH.tab(\'baocao\')">Báo cáo ngay</button>';
      }
      else if (bc.anToan === 'xanh') { cham = 'xanh'; chu = 'Đã xác nhận AN TOÀN lúc ' + bc.luc; }
      else if (bc.anToan === 'vang') { cham = 'vang'; chu = 'Cần lưu ý (' + bc.luc + '): ' + bc.ghiChu; }
      else { cham = 'do'; chu = 'CÓ SỰ VIỆC (' + bc.luc + '): ' + bc.ghiChu; }
      return '<div class="dh-diem-hang"><span class="dh-cham ' + cham + '"></span>' +
        '<div class="tt"><b>' + thoat(c.ten) + '</b><small>' + thoat(chu) + '</small></div>' + nutBC + '</div>';
    }).join('');

    var gvVangChu = t.gvVang.length
      ? t.gvVang.map(function (g) {
          return '<li>' + thoat(g.ten) + ' — ' + thoat(g.lyDo) +
            (g.denNgay ? ' (đến ' + ngayVN(g.denNgay) + ')' : '') +
            (g.baoMuon ? ' <span class="dh-do">⚠ báo muộn</span>' : '') + '</li>';
        }).join('')
      : '<li>Không có ai vắng ' + tenBuoi(t.buoi) + ' này.</li>';

    var dayThayChu = THAT
      ? '<div class="hd-kiem vang">👨‍🏫 Bố trí <b>dạy thay theo tiết</b> sẽ mở khi nạp thời khóa biểu — xem bản mẫu ở thẻ Dạy thay.</div>'
      : (t.tietThieu
        ? '<div class="hd-kiem do">🔴 Lớp 3B còn <b>' + t.tietThieu + ' tiết chưa có người dạy thay</b> — <a href="javascript:DH.tab(\'daythay\')">bố trí ngay →</a></div>'
        : '<div class="hd-kiem xanh">🟢 Mọi lớp có giáo viên vắng đều đã bố trí dạy thay.</div>');

    var nghiDai = DL.nghiDai.length
      ? '<div class="hd-kiem do">⚠ <b>Nghỉ nhiều buổi trong 7 ngày:</b> ' +
        DL.nghiDai.map(function (n) { return thoat(n.ten) + ' (' + thoat(n.lop) + ' — ' + n.soBuoi + ' buổi)'; }).join(' · ') +
        '</div>'
      : '';

    return bang + the5 +
      '<div class="dh-hai-cot">' +
      '<div><div class="dh-tieu-de">Tình hình từng điểm trường</div>' + hangCS + '</div>' +
      '<div><div class="dh-tieu-de">CBGV-NV vắng hôm nay</div>' +
      '<ul class="dh-ul">' + gvVangChu + '</ul>' + dayThayChu + nghiDai + '</div>' +
      '</div>';
  }

  // ════════════════════════════════════════════════════════════
  // TAB 2 · BÁO CÁO ĐẦU BUỔI + AN TOÀN XANH
  // ════════════════════════════════════════════════════════════
  var BC_CS = '';          // cơ sở đang báo cáo
  var BC_ANTOAN = null;
  var BC_GV_VANG = {};     // email/tên -> lý do
  var BC_MO_CHON_GV = false;

  function veBaoCao() {
    var duocBao = coSoDuocBao();
    if (!duocBao.length) {
      return '<div class="the-thong-bao"><p style="font-size:14.5px"><b>Màn này dành cho người phụ trách điểm trường và Ban giám hiệu.</b></p>' +
        '<p style="font-size:13.5px;color:var(--chu-mo);margin-top:6px">Tài khoản của thầy cô chưa được gán phụ trách điểm trường nào. ' +
        'Ban giám hiệu gán người phụ trách trong Quản trị → Cơ sở &amp; Sáp nhập.</p></div>';
    }
    if (!BC_CS || duocBao.indexOf(BC_CS) < 0) {
      // Mặc định mở điểm CHƯA báo cáo buổi này
      BC_CS = duocBao.filter(function (m) { return !(DL.baoCao[m] || {})[buoiHienTai()]; })[0] || duocBao[0];
    }
    var b = buoiHienTai();
    var daGui = (DL.baoCao[BC_CS] || {})[b];

    var chonCS = duocBao.length > 1
      ? '<div class="dh-chon-hang" style="margin-bottom:10px">' + duocBao.map(function (m) {
          return '<button class="chip-loc' + (m === BC_CS ? ' on' : '') + '" onclick="DH.bcChonCS(\'' + m + '\')">' + thoat(tenCoSo(m)) + '</button>';
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

    // GV của cơ sở đang báo
    var gvCS = DL.gvDs.filter(function (g) { return g.coSo === BC_CS; });
    var soVang = Object.keys(BC_GV_VANG).length;
    var LY_DO = ['Nghỉ ốm', 'Nghỉ phép', 'Công tác', 'Việc riêng', 'Khác'];

    var oGV = '<div class="dh-tieu-de">1 · Cán bộ, giáo viên, nhân viên</div>' +
      '<div class="dh-chon-hang">' +
      '<button class="dh-nut-lon' + (!soVang && !BC_MO_CHON_GV ? ' on' : '') + '" onclick="DH.bcGvDu()">✓ Đủ ' + gvCS.length + '/' + gvCS.length + '</button>' +
      '<button class="dh-nut-lon' + (soVang || BC_MO_CHON_GV ? ' on' : '') + '" onclick="DH.bcGvVang()">Có người vắng</button>' +
      '</div>' +
      (BC_MO_CHON_GV
        ? '<div class="dh-hop-chon">' + gvCS.map(function (g) {
            var on = BC_GV_VANG[g.email] !== undefined;
            return '<button class="chip-loc' + (on ? ' on' : '') + '" onclick="DH.bcTickGv(this)" data-email="' + thoat(g.email) + '" data-ten="' + thoat(g.ten) + '">' + thoat(g.ten) + '</button>';
          }).join('') + '</div>' +
          (soVang ? '<div style="margin-top:8px">' + Object.keys(BC_GV_VANG).map(function (em) {
            var v = BC_GV_VANG[em];
            return '<div class="dh-diem-hang" style="padding:8px 12px"><div class="tt"><b>' + thoat(v.ten) + '</b></div>' +
              '<select class="dh-o-nhap" style="max-width:150px" onchange="DH.bcLyDo(\'' + thoat(em) + '\', this.value)">' +
              LY_DO.map(function (l) { return '<option' + (v.lyDo === l ? ' selected' : '') + '>' + l + '</option>'; }).join('') +
              '</select></div>';
          }).join('') + '</div>' : '')
        : '');

    // HS: tự tổng từ điểm danh các lớp của cơ sở này
    var cacLop = Object.keys(DL.lop).filter(function (l) { return DL.lop[l].coSo === BC_CS; });
    var hsTongCS = 0, daDD = 0, vangCS = 0;
    cacLop.forEach(function (l) {
      hsTongCS += DL.lop[l].siSo;
      var d = DL.ddLop[b][l];
      if (d) { daDD++; vangCS += d.soVang; }
    });
    var oHS = '<div class="dh-tieu-de">2 · Học sinh</div>' +
      '<div class="hd-kiem ' + (daDD === cacLop.length && cacLop.length ? 'xanh' : 'vang') + '" style="margin-top:2px">' +
      'Sĩ số: <b>' + hsTongCS.toLocaleString('vi-VN') + '</b> em / ' + cacLop.length + ' lớp · ' +
      'các lớp đã điểm danh: <b>' + daDD + '/' + cacLop.length + '</b> · báo vắng <b>' + vangCS + '</b> em. ' +
      'Hệ thống tự cộng từ điểm danh của giáo viên — người phụ trách <b>không nhập lại</b>.</div>';

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
    var oChieu = b === 'sang'
      ? '<label class="dh-tick"><input type="checkbox" id="dh-bc-1buoi"> Chiều nay điểm trường <b>không học</b> (dashboard sẽ không chờ báo cáo chiều)</label>'
      : '';

    return chonCS +
      '<div class="hd-kiem xanh" style="margin-top:0">Đang báo cáo <b>' + tenBuoi(b) + ' ' + ngayVN(homNayISO()) + '</b> cho <b>' + thoat(tenCoSo(BC_CS)) + '</b>.</div>' +
      oGV + oHS + oAT + oGhiChu + oChieu +
      '<button class="dh-nut-gui' + (BC_ANTOAN ? '' : ' mo') + '" onclick="DH.bcGui()">XÁC NHẬN ĐẦU BUỔI</button>' +
      '<div class="dh-ghi-chu-nho" style="text-align:center">Sau khi xác nhận, dashboard Ban giám hiệu cập nhật ngay lập tức.</div>';
  }

  // ════════════════════════════════════════════════════════════
  // TAB 3 · ĐIỂM DANH HỌC SINH
  // ════════════════════════════════════════════════════════════
  var LOP_MO = null;        // lớp đang mở ô chọn em vắng
  var LOP_CHON = {};        // {hoc_sinh_ma: phep} của lớp đang mở
  var DS_DANG_MO = [];      // danh sách HS của lớp đang mở

  function veDiemDanh() {
    var b = buoiHienTai();
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
              ? ' · vắng: ' + vangLop.map(function (v) { return thoat(v.ten) + ' (' + PHEP[v.phep] + ')'; }).join(', ')
              : ' · đủ') + '</div>' +
            '<button class="dh-nut-nho" style="margin-top:8px" onclick="DH.ddSua(\'' + thoat(l) + '\')">✏ Sửa</button>';
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
              '<select class="dh-o-nhap" style="max-width:140px" onchange="DH.ddPhep(\'' + thoat(ma) + '\', this.value)">' +
              '<option value="co_phep"' + (c.phep === 'co_phep' ? ' selected' : '') + '>Có phép</option>' +
              '<option value="khong_phep"' + (c.phep === 'khong_phep' ? ' selected' : '') + '>Không phép</option>' +
              '<option value="chua_ro"' + (c.phep === 'chua_ro' ? ' selected' : '') + '>Chưa rõ</option>' +
              '</select></div>';
          }).join('') : '') +
          '<div class="dh-chon-hang" style="margin-top:8px">' +
          '<button class="dh-nut-nho" onclick="DH.ddLuu(\'' + thoat(l) + '\')">💾 Lưu điểm danh (' + soChon + ' vắng)</button>' +
          '<button class="dh-nut-nho" onclick="DH.ddDong()">Hủy</button></div>';
        } else {
          dau = '<div class="dh-chon-hang">' +
            '<button class="dh-nut-lon" onclick="DH.ddDu(\'' + thoat(l) + '\')">✓ ĐỦ ' + info.siSo + '/' + info.siSo + '</button>' +
            '<button class="dh-nut-lon phu" onclick="DH.ddMoVang(\'' + thoat(l) + '\')">Có HS vắng</button></div>';
        }
        return '<div class="dh-lop-the"><div class="dh-lop-ten">Lớp ' + thoat(l) +
          ' <small>· sĩ số ' + info.siSo + '</small></div>' + dau + '</div>';
      }).join('');
      return '<div class="dh-tieu-de">Khối ' + k + '</div>' + the;
    }).join('');

    return '<div class="hd-kiem ' + (THAT ? 'xanh' : 'vang') + '" style="margin-top:0">Điểm danh <b>' + tenBuoi(buoiHienTai()) + ' ' +
      ngayVN(homNayISO()) + '</b> — giáo viên dạy đầu buổi bấm lớp mình dạy: lớp đủ thì đúng MỘT nút, ' +
      'chỉ khi có em vắng mới chọn tên. Hệ thống ghi lại ai điểm danh, lúc mấy giờ.</div>' + noiDung;
  }

  // ════════════════════════════════════════════════════════════
  // TAB 4 · DẠY THAY (bản mẫu — chờ thời khóa biểu)
  // ════════════════════════════════════════════════════════════
  function veDayThay() {
    var daDu = DAY_THAY.every(function (x) { return x.gv; });
    return '<div class="hd-kiem vang" style="margin-top:0">🧪 <b>BẢN MẪU</b> — bố trí dạy thay theo TIẾT cần thời khóa biểu. ' +
      'Khi nhà trường gửi file TKB Excel, hệ thống sẽ đọc và mở chức năng này với dữ liệu thật. ' +
      'Nguyên tắc đã chốt: giáo viên báo nghỉ <b>trước ít nhất 1 buổi</b>; báo muộn vẫn gửi được nhưng bị đánh dấu ⚠.</div>' +
      '<button class="dh-nut-nho" style="margin-bottom:10px" onclick="window.notify(\'Khi có thời khóa biểu thật (Excel), nạp tại đây — hệ thống đọc bằng SheetJS ngay trên trình duyệt.\')">📥 Nạp thời khóa biểu (Excel)</button>' +
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
      (daDu ? '' :
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

  function veViec() {
    var t = homNayISO();
    var xong = DL.viec.filter(function (v) { return v.tt === 'xong'; }).length;
    var dang = DL.viec.filter(function (v) { return v.tt === 'dang'; }).length;
    var quaHan = DL.viec.filter(function (v) { return v.han && v.han < t && v.tt !== 'xong'; }).length;

    var theoNguoi = {};
    DL.viec.forEach(function (v) { (theoNguoi[v.nguoiTen] = theoNguoi[v.nguoiTen] || []).push(v); });

    var dsNguoi = Object.keys(theoNguoi).map(function (ng) {
      var ds = theoNguoi[ng];
      var dong = ds.map(function (v) {
        var tt = TT_VIEC[v.tt];
        var qh = v.han && v.han < t && v.tt !== 'xong';
        var suaDuoc = laQT() || (v.nguoiEmail && v.nguoiEmail === emailToi());
        return '<div class="dh-viec' + (qh ? ' qua-han' : '') + '">' +
          (suaDuoc
            ? '<button class="dh-viec-tt" title="Chạm để chuyển trạng thái" onclick="DH.vDoi(' + v.id + ')">' + tt[0] + '</button>'
            : '<span class="dh-viec-tt">' + tt[0] + '</span>') +
          '<div class="tt"><b>' + thoat(v.noiDung) + '</b> ' + (MUC_VIEC[v.muc] || '') +
          '<small>' + thoat(v.coSo ? tenCoSo(v.coSo) : 'Toàn trường') +
          (v.han ? ' · hạn: ' + ngayVN(v.han) : '') + (qh ? ' · <b class="dh-do">QUÁ HẠN</b>' : '') +
          ' · ' + tt[1] + (v.tienDo ? ' — ' + thoat(v.tienDo) : '') + '</small></div></div>';
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
      '⚪ → 🟡 → 🟢. Đây là "việc cần làm của nhà trường", không phải phần mềm quản lý dự án.</div>' +
      '<div class="dh-viec-tom">TUẦN NÀY: <b>' + DL.viec.length + '</b> việc · 🟢 ' + xong + ' · 🟡 ' + dang +
      ' · 🔴 ' + quaHan + ' quá hạn</div>' + formGiao + dsNguoi;
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
      '<div class="dh-ghi-chu-nho">Mọi thao tác (báo cáo đầu buổi, điểm danh, an toàn xanh, báo việc, giao việc) ' +
      'tự ghi vết — đây là nguồn để sau này <b>tự sinh báo cáo ngày / tuần / tháng</b>, không nhập lại.</div>';

    return '<div class="dh-tieu-de" style="margin-top:0">Sự việc đang theo dõi</div>' + dsSV + formBV + nhatKy;
  }

  // ════════════════════════════════════════════════════════════
  // KHUNG MODULE
  // ════════════════════════════════════════════════════════════
  var TAB = 'homnay';
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

    var bang;
    if (THAT) {
      bang = '<div class="hd-kiem xanh">✅ <b>Đang chạy với dữ liệu thật</b> — năm học ' + thoat(NAM) +
        ' · ' + DL.coSo.length + ' cơ sở · ' + DL.gvDs.length + ' CBGV-NV · ' +
        Object.keys(DL.lop).length + ' lớp · ' + DL.hsTong.toLocaleString('vi-VN') + ' học sinh. ' +
        'Mọi thao tác ghi vào cơ sở dữ liệu nhà trường và có nhật ký.</div>';
    } else if (LOI_SQL) {
      bang = '<div class="hd-kiem do">⚠ ' + thoat(LOI_SQL) + '</div>';
    } else {
      bang = '<div class="hd-kiem vang">🧪 <b>BẢN XEM THỬ — toàn bộ số liệu, tên người, tên lớp là DỮ LIỆU MẪU.</b> ' +
        'Đăng nhập để chạy với dữ liệu thật của nhà trường.</div>';
    }

    var dauNgay = '<div class="dh-dau"><div><b>ĐIỀU HÀNH HÔM NAY</b><small>' + homNayChu() +
      ' · ' + tenBuoi(buoiHienTai()) + '</small></div></div>';

    // Bộ lọc cơ sở CHỈ hiện khi trường có ≥2 cơ sở (như quy tắc ở hocsinh.js)
    var locCS = (TAB === 'homnay' && DL.coSo.length > 1)
      ? '<div class="dh-chon-hang dh-loc-cs">' +
        [{ ma: 'all', ten: 'Toàn trường' }].concat(DL.coSo).map(function (c) {
          return '<button class="chip-loc' + (LOC_CS === c.ma ? ' on' : '') + '" onclick="DH.locCS(\'' + c.ma + '\')">' + thoat(c.ten) + '</button>';
        }).join('') + '</div>'
      : '';

    var thanhTab = '<div class="dh-thanh-tab">' + DS_TAB.map(function (x) {
      return '<button class="' + (TAB === x.ma ? 'on' : '') + '" onclick="DH.tab(\'' + x.ma + '\')">' + x.ten + '</button>';
    }).join('') + '</div>';

    var noiDung =
      TAB === 'homnay' ? veHomNay() :
      TAB === 'baocao' ? veBaoCao() :
      TAB === 'diemdanh' ? veDiemDanh() :
      TAB === 'daythay' ? veDayThay() :
      TAB === 'viec' ? veViec() : veBaoViec();

    vung.innerHTML = bang + dauNgay + thanhTab + locCS + '<div class="dh-noi-dung">' + noiDung + '</div>';
  }

  // Sau MỖI thao tác ghi thật: đọc lại "hôm nay" rồi vẽ — màn luôn đúng CSDL
  function taiLai() {
    if (!THAT) { veDieuHanh(); return Promise.resolve(); }
    return napHomNay(DL).then(function () { veDieuHanh(); })
      .catch(function (e) { window.notify('Lỗi đọc lại dữ liệu: ' + (e.message || e)); });
  }
  function baoLoi(e) {
    window.notify('Không ghi được: ' + ((e && e.message) || e) + '');
  }

  // ════════════════════════════════════════════════════════════
  // THAO TÁC
  // ════════════════════════════════════════════════════════════
  window.DH = {
    tab: function (ma) { TAB = ma; veDieuHanh(); window.scrollTo(0, 0); },
    locCS: function (ma) { LOC_CS = ma; veDieuHanh(); },

    // ── Báo cáo đầu buổi ──
    bcChonCS: function (ma) { BC_CS = ma; BC_ANTOAN = null; BC_GV_VANG = {}; BC_MO_CHON_GV = false; veDieuHanh(); },
    bcGvDu: function () { BC_GV_VANG = {}; BC_MO_CHON_GV = false; veDieuHanh(); },
    bcGvVang: function () { BC_MO_CHON_GV = true; veDieuHanh(); },
    bcTickGv: function (nut) {
      var em = nut.getAttribute('data-email');
      if (BC_GV_VANG[em] !== undefined) delete BC_GV_VANG[em];
      else BC_GV_VANG[em] = { ten: nut.getAttribute('data-ten'), lyDo: 'Nghỉ ốm' };
      veDieuHanh();
    },
    bcLyDo: function (em, lyDo) { if (BC_GV_VANG[em]) BC_GV_VANG[em].lyDo = lyDo; },
    bcAnToan: function (ma) {
      BC_ANTOAN = ma;
      var ghiChu = ($('#dh-bc-ghichu') || {}).value;
      veDieuHanh();
      if (ghiChu && $('#dh-bc-ghichu')) $('#dh-bc-ghichu').value = ghiChu;
    },
    bcSua: function () {
      // Mở lại biểu mẫu: xóa dòng báo cáo buổi này (bản mới sẽ ghi đè)
      var b = buoiHienTai();
      if (!THAT) { delete (DL.baoCao[BC_CS] || {})[b]; veDieuHanh(); return; }
      window.MAY_CHU.from('bao_cao_dau_buoi').delete()
        .eq('ngay', homNayISO()).eq('buoi', b).eq('co_so_ma', BC_CS)
        .then(function (r) { if (r.error) baoLoi(r.error); else taiLai(); });
    },
    bcGui: function () {
      if (!BC_ANTOAN) { window.notify('Chọn một trong ba nút An toàn trước khi xác nhận.'); return; }
      var b = buoiHienTai();
      var ghiChu = (($('#dh-bc-ghichu') || {}).value || '').trim();
      var khongHocChieu = !!(($('#dh-bc-1buoi') || {}).checked);
      var dsVang = Object.keys(BC_GV_VANG).map(function (em) {
        var g = DL.gvDs.filter(function (x) { return x.email === em; })[0] || {};
        return { ho_ten: BC_GV_VANG[em].ten, email: em, co_so_ma: BC_CS,
          ly_do: BC_GV_VANG[em].lyDo, buoi: 'ca_ngay', ngay: homNayISO(), nguoi_ghi_id: idToi() };
      });

      if (!THAT) {
        if (!DL.baoCao[BC_CS]) DL.baoCao[BC_CS] = {};
        DL.baoCao[BC_CS][b] = { anToan: BC_ANTOAN, ghiChu: ghiChu, luc: gioPhut(), chieuKhongHoc: khongHocChieu };
        dsVang.forEach(function (v) { DL.gvVang.push({ ten: v.ho_ten, coSo: BC_CS, lyDo: v.ly_do, buoi: 'ca_ngay' }); });
        BC_ANTOAN = null; BC_GV_VANG = {}; BC_MO_CHON_GV = false;
        TAB = 'homnay'; veDieuHanh();
        window.notify('Đã xác nhận (bản mẫu — chưa ghi cơ sở dữ liệu).');
        return;
      }
      var may = window.MAY_CHU;
      may.from('bao_cao_dau_buoi').upsert({
        ngay: homNayISO(), buoi: b, co_so_ma: BC_CS, an_toan: BC_ANTOAN,
        ghi_chu: ghiChu || null, chieu_khong_hoc: khongHocChieu, nguoi_gui_id: idToi()
      }, { onConflict: 'ngay,buoi,co_so_ma' })
        .then(function (r) {
          if (r.error) throw r.error;
          return dsVang.length ? may.from('gv_vang').insert(dsVang) : { error: null };
        })
        .then(function (r) {
          if (r.error) throw r.error;
          BC_ANTOAN = null; BC_GV_VANG = {}; BC_MO_CHON_GV = false;
          TAB = 'homnay';
          window.notify('✅ Đã xác nhận đầu buổi — dashboard đã cập nhật.');
          return taiLai();
        })
        .catch(baoLoi);
    },

    // ── Điểm danh HS ──
    ddDu: function (lop) {
      var b = buoiHienTai(), siSo = DL.lop[lop].siSo;
      if (!THAT) {
        DL.ddLop[b][lop] = { siSo: siSo, soVang: 0, luc: gioPhut() };
        veDieuHanh(); window.notify('Bản mẫu — chưa ghi cơ sở dữ liệu.');
        return;
      }
      window.MAY_CHU.from('diem_danh_lop').insert({
        ngay: homNayISO(), buoi: b, nam_hoc: NAM, lop: lop,
        si_so: siSo, so_vang: 0, nguoi_ghi_id: idToi()
      }).then(function (r) {
        if (r.error) { baoLoi(r.error); return; }
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
      var b = buoiHienTai(), siSo = DL.lop[lop].siSo;
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
      }).catch(baoLoi);
    },
    ddSua: function (lop) {
      var b = buoiHienTai();
      if (!THAT) {
        delete DL.ddLop[b][lop];
        DL.hsVang = DL.hsVang.filter(function (v) { return !(v.lop === lop && v.buoi === b); });
        veDieuHanh(); return;
      }
      var may = window.MAY_CHU, t = homNayISO();
      may.from('hs_vang').delete().eq('ngay', t).eq('buoi', b).eq('lop', lop)
        .then(function () {
          return may.from('diem_danh_lop').delete().eq('ngay', t).eq('buoi', b).eq('lop', lop);
        })
        .then(function (r) {
          if (r.error) throw r.error;
          window.notify('Đã mở lại điểm danh lớp ' + lop + ' — ghi bản mới.');
          return taiLai();
        })
        .catch(baoLoi);
    },

    // ── Dạy thay (mẫu) ──
    dtChon: function (gv) {
      DAY_THAY.forEach(function (x) { if (!x.gv) x.gv = gv; });
      veDieuHanh();
      window.notify('Bản mẫu — khi có thời khóa biểu, phân công sẽ ghi thật và báo cho giáo viên.');
    },

    // ── Việc trong tuần ──
    vDoi: function (id) {
      var v = DL.viec.filter(function (x) { return x.id === id; })[0];
      if (!v) return;
      var moi = v.tt === 'chua' ? 'dang' : v.tt === 'dang' ? 'xong' : 'chua';
      if (!THAT) { v.tt = moi; veDieuHanh(); return; }
      window.MAY_CHU.from('cong_viec')
        .update({ trang_thai: moi, cap_nhat_luc: new Date().toISOString() })
        .eq('id', id)
        .then(function (r) {
          if (r.error) { baoLoi(r.error); return; }
          if (moi === 'xong') window.notify('🟢 Đã đánh dấu hoàn thành.');
          taiLai();
        });
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
    bvLoai: function (nut) {
      var moTa = ($('#dh-bv-mota') || {}).value;
      BV_LOAI = nut.getAttribute('data-loai'); veDieuHanh();
      if (moTa && $('#dh-bv-mota')) $('#dh-bv-mota').value = moTa;
    },
    bvMuc: function (m) {
      var moTa = ($('#dh-bv-mota') || {}).value;
      BV_MUC = m; veDieuHanh();
      if (moTa && $('#dh-bv-mota')) $('#dh-bv-mota').value = moTa;
    },
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
      if (!THAT) {
        var s = DL.suViec.filter(function (x) { return x.id === id; })[0];
        if (s) s.tt = 'da_xu_ly';
        veDieuHanh(); return;
      }
      window.MAY_CHU.from('su_viec')
        .update({ trang_thai: 'da_xu_ly', xu_ly_luc: new Date().toISOString() })
        .eq('id', id)
        .then(function (r) {
          if (r.error) baoLoi(r.error);
          else { window.notify('🟢 Đã đóng sự việc.'); taiLai(); }
        });
    }
  };

  // ── Khởi động: vẽ bản mẫu ngay; đăng nhập xong thì nạp dữ liệu thật ──
  document.addEventListener('DOMContentLoaded', veDieuHanh);
  document.addEventListener('dangnhap-xong', function () { napThat(); });
  // Phòng khi sự kiện đã phát trước lúc file này nạp
  if (window.NGUOI_DUNG && window.MAY_CHU) napThat();
})();
