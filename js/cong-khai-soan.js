// ============================================================
// cong-khai-soan.js — thẻ "🏛 Công khai" trong Quản trị: SOẠN · XEM TRƯỚC · CÔNG BỐ
// nội dung công khai theo Thông tư 09/2024/TT-BGDĐT. Sổ dự án mục 121 · sql/80.
//
// Luồng: chọn năm học → chọn mục → "⚡ Điền số liệu tự động" (hàm cong_khai_so_lieu,
// chỉ SỐ TỔNG HỢP) + gõ phần còn thiếu → "💾 Lưu nháp" → "👁 Xem trước" → "📢 Công bố".
// Công bố đi qua hàm máy chủ cong_khai_cong_bo(): bản công bố cũ thành 'thay_the'
// (giữ lại — lưu 05 năm), ngày công bố do máy chủ ghi.
// Đăng ký thẻ qua window.qtTabPhu — KHÔNG sửa quan-tri.js.
// ============================================================
(function () {
  'use strict';

  function t(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function may() { return window.MAY_CHU; }
  function ngayGio(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    return d.getDate() + '/' + (d.getMonth() + 1) + '/' + d.getFullYear() + ' ' +
      ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
  }
  function homNay() { var d = new Date(); return d.getDate() + '/' + (d.getMonth() + 1) + '/' + d.getFullYear(); }
  function baoLoi(e) {
    var m = (e && e.message) || String(e || '');
    if (/cong_khai|does not exist|schema cache|PGRST20/i.test(m)) m = 'Trường chưa chạy tệp sql/80-cong-khai.sql. ' + m;
    window.hopHoi ? window.hopHoi({ tieuDe: 'Không thực hiện được', moTa: m, bieuTuong: '⚠️', nutOK: 'Đóng', nutHuy: 'Đóng' }) : alert(m);
  }
  function laThuMuc(u) { return /drive\.google\.com\/(drive\/(u\/\d+\/)?folders|open\?id=.*folder)|\/folders\//i.test(String(u || '')); }

  // ══════════ KHUÔN TỪNG MỤC ══════════
  // kieu: text · area · so · bang (cot) · vb (danh sách văn bản) · nhom (tiêu đề nhóm)
  var VB_COT = [{ k: 'ten', nhan: 'Tên văn bản', rong: 1 }, { k: 'mo_ta', nhan: 'Mô tả ngắn (số, ngày, năm)' }, { k: 'link', nhan: 'Link tệp PDF đã chia sẻ công khai' }];
  var KHUON = {
    thong_tin: [
      { kieu: 'nhom', nhan: 'Thông tin cơ bản (Điều 4 khoản 1–3)' },
      { k: 'ten', nhan: 'Tên trường' }, { k: 'loai_hinh', nhan: 'Loại hình', goiY: 'Công lập' },
      { k: 'co_quan_truc_tiep', nhan: 'Cơ quan quản lý trực tiếp' }, { k: 'co_quan_chuyen_mon', nhan: 'Cơ quan quản lý chuyên môn' },
      { k: 'tru_so', nhan: 'Trụ sở chính (địa chỉ)' }, { k: 'diem_truong', nhan: 'Các điểm trường' },
      { k: 'dien_thoai', nhan: 'Điện thoại' }, { k: 'email', nhan: 'Thư điện tử' }, { k: 'cong_thong_tin', nhan: 'Cổng thông tin (địa chỉ web)' },
      { kieu: 'nhom', nhan: 'Sứ mạng · Tầm nhìn · Mục tiêu · Lịch sử (Điều 4 khoản 4, 5)' },
      { k: 'su_menh', nhan: 'Sứ mạng', kieu: 'area' }, { k: 'tam_nhin', nhan: 'Tầm nhìn', kieu: 'area' },
      { k: 'muc_tieu', nhan: 'Mục tiêu', kieu: 'area' }, { k: 'lich_su', nhan: 'Tóm tắt quá trình hình thành và phát triển', kieu: 'area' },
      { kieu: 'nhom', nhan: 'Số liệu nổi bật ở đầu cổng', mo: 'Bấm "Điền số liệu tự động" để lấy từ hệ thống.' },
      { k: 'tom_tat.diem_truong', nhan: 'Số điểm trường', kieu: 'so' }, { k: 'tom_tat.lop', nhan: 'Số lớp', kieu: 'so' },
      { k: 'tom_tat.hoc_sinh', nhan: 'Số học sinh', kieu: 'so' }, { k: 'tom_tat.cbgv', nhan: 'Số CBGV, nhân viên', kieu: 'so' },
      { k: 'tom_tat.chuan_qg', nhan: 'Chuẩn quốc gia (ghi ngắn, vd "Mức 2")' }, { k: 'tom_tat.chot', nhan: 'Ngày chốt số liệu' },
      { kieu: 'nhom', nhan: 'Lãnh đạo nhà trường (Điều 4 khoản 6, khoản 7 điểm e — bắt buộc có điện thoại, thư điện tử)' },
      { k: 'lanh_dao', kieu: 'bang', cot: [{ k: 'chuc_vu', nhan: 'Chức vụ' }, { k: 'ho_ten', nhan: 'Họ và tên' },
        { k: 'dien_thoai', nhan: 'Điện thoại' }, { k: 'email', nhan: 'Thư điện tử' }, { k: 'nhiem_vu', nhan: 'Nhiệm vụ phụ trách', rong: 1 }] },
      { kieu: 'nhom', nhan: 'Văn bản tổ chức bộ máy, quy chế (Điều 4 khoản 7, 8)' },
      { k: 'van_ban', kieu: 'vb', goiYVb: ['Quyết định thành lập, sáp nhập trường', 'Quyết định bổ nhiệm Hiệu trưởng, Phó Hiệu trưởng',
        'Quy chế tổ chức và hoạt động; sơ đồ tổ chức bộ máy', 'Quy chế thực hiện dân chủ ở cơ sở', 'Quy chế chi tiêu nội bộ', 'Chiến lược phát triển nhà trường'] },
      { k: 'nguoi_phu_trach', nhan: 'Người phụ trách công tác công khai (in ở chân trang)', goiY: 'Hiệu trưởng …' },
      { kieu: 'nhom', nhan: 'Cho người ngoài tra cứu thêm (BGH chốt 04/10/2026)', mo: 'Có hiệu lực sau khi CÔNG BỐ mục I. Chỉ đưa ra những cột được phép (sql/81): TKB — lớp, tiết, môn, tên giáo viên; danh mục — số, tên, thời hạn, đơn vị lập (không trạng thái, không link).' },
      { k: 'hien_tkb', nhan: 'Hiện thời khóa biểu từng lớp (bản đã công bố, đang áp dụng)', kieu: 'chk' },
      { k: 'hien_danh_muc', nhan: 'Hiện danh mục hồ sơ nhà trường (mẫu ban hành NĐ 30)', kieu: 'chk' }
    ],
    tai_chinh: [
      { k: 'cho', nhan: 'Đang chờ (để TRỐNG khi đã công bố đủ)', goiY: 'Chờ quyết toán năm 2026 · hạn 30/6/2027' },
      { k: 'cho_ghi', nhan: 'Giải thích thêm khi đang chờ', kieu: 'area' },
      { kieu: 'nhom', nhan: 'Các khoản thu và mức thu (Điều 5 khoản 2)' },
      { k: 'khoan_thu', kieu: 'bang', cot: [{ k: 'ten', nhan: 'Khoản thu', rong: 1 }, { k: 'muc', nhan: 'Mức thu' }, { k: 'don_vi', nhan: 'Đơn vị tính' }, { k: 'can_cu', nhan: 'Căn cứ', rong: 1 }] },
      { kieu: 'nhom', nhan: 'Thu, chi năm tài chính trước (Điều 5 khoản 1)' },
      { k: 'thu_chi', kieu: 'bang', cot: [{ k: 'noi_dung', nhan: 'Nội dung', rong: 1 }, { k: 'so_tien', nhan: 'Số tiền (đồng)', kieu: 'so' }] },
      { k: 'mien_giam', nhan: 'Chính sách và kết quả miễn, giảm, hỗ trợ (Điều 5 khoản 3)', kieu: 'area' },
      { k: 'so_du_quy', nhan: 'Số dư các quỹ (Điều 5 khoản 4)', kieu: 'area' },
      { kieu: 'nhom', nhan: 'Văn bản công khai tài chính (biểu mẫu theo quy định tài chính)' },
      { k: 'van_ban', kieu: 'vb' }
    ],
    doi_ngu: [
      { kieu: 'nhom', nhan: 'Theo vị trí việc làm và trình độ đào tạo (Điều 8 khoản 1 điểm a)', mo: '"Điền tự động" chỉ đếm được TỔNG SỐ theo chức vụ; cột trình độ nhà trường nhập.' },
      { k: 'bang', kieu: 'bang', cot: [{ k: 'vi_tri', nhan: 'Vị trí việc làm', rong: 1 }, { k: 'tong', nhan: 'Tổng', kieu: 'so' },
        { k: 'thac_si', nhan: 'Thạc sĩ+', kieu: 'so' }, { k: 'dai_hoc', nhan: 'Đại học', kieu: 'so' }, { k: 'cao_dang', nhan: 'Cao đẳng', kieu: 'so' }, { k: 'khac', nhan: 'TC, khác', kieu: 'so' }] },
      { kieu: 'nhom', nhan: 'Tỷ lệ đạt chuẩn, bồi dưỡng (Điều 8 khoản 1 điểm b, c)' },
      { k: 'dc_dat', nhan: 'GV đạt chuẩn trình độ đào tạo — số đạt', kieu: 'so' }, { k: 'dc_tong', nhan: '— trên tổng số GV', kieu: 'so' }, { k: 'dc_ghi', nhan: '— ghi chú (vd: năm trước …)' },
      { k: 'nn_dat', nhan: 'Đạt chuẩn nghề nghiệp — số đạt', kieu: 'so' }, { k: 'nn_tong', nhan: '— trên tổng số CBQL, GV', kieu: 'so' }, { k: 'nn_ghi', nhan: '— ghi chú (vd: mức Khá trở lên …)' },
      { k: 'bd_dat', nhan: 'Hoàn thành bồi dưỡng hằng năm — số', kieu: 'so' }, { k: 'bd_tong', nhan: '— trên tổng số', kieu: 'so' }, { k: 'bd_ghi', nhan: '— ghi chú (năm học)' },
      { k: 'ghi_chu', nhan: 'Ghi chú cuối mục', kieu: 'area' }
    ],
    csvc: [
      { kieu: 'nhom', nhan: 'Diện tích (Điều 8 khoản 2 điểm a)' },
      { k: 'so_diem', nhan: 'Số điểm trường', kieu: 'so' }, { k: 'dien_tich', nhan: 'Tổng diện tích khu đất (m²)', kieu: 'so' },
      { k: 'hoc_sinh', nhan: 'Số học sinh (để tính bình quân)', kieu: 'so' }, { k: 'toi_thieu_bq', nhan: 'Mức tối thiểu m²/học sinh theo quy định', kieu: 'so' },
      { kieu: 'nhom', nhan: 'Các khối phòng, thiết bị — đối sánh tối thiểu (Điều 8 khoản 2 điểm b, c)', mo: '"Điền tự động" lấy số Hiện có từ bảng Kiểm kê CSVC năm học này; cột Tối thiểu nhà trường nhập theo quy chuẩn.' },
      { k: 'phong', kieu: 'bang', cot: [{ k: 'hang_muc', nhan: 'Hạng mục', rong: 1 }, { k: 'hien_co', nhan: 'Hiện có', kieu: 'so' }, { k: 'toi_thieu', nhan: 'Tối thiểu', kieu: 'so' }] },
      { kieu: 'nhom', nhan: 'Sách giáo khoa, tài liệu học tập (Điều 8 khoản 2 điểm d)' },
      { k: 'van_ban', kieu: 'vb', goiYVb: ['Danh mục sách giáo khoa sử dụng năm học', 'Danh mục xuất bản phẩm tham khảo tối thiểu'] },
      { k: 'ghi_chu', nhan: 'Ghi chú cuối mục', kieu: 'area' }
    ],
    kiem_dinh: [
      { kieu: 'nhom', nhan: 'Các mốc tự đánh giá, đánh giá ngoài, chuẩn quốc gia (Điều 8 khoản 3)', mo: 'Đánh dấu "Kế hoạch" cho mốc chưa diễn ra (chấm xám trên cổng).' },
      { k: 'moc', kieu: 'bang', cot: [{ k: 'thoi_gian', nhan: 'Thời gian' }, { k: 'tieu_de', nhan: 'Nội dung', rong: 1 }, { k: 'mo_ta', nhan: 'Mô tả', rong: 1 }, { k: 'ke_hoach', nhan: 'Kế hoạch', kieu: 'chk' }] },
      { k: 'van_ban', kieu: 'vb', goiYVb: ['Báo cáo tự đánh giá', 'Kế hoạch cải tiến chất lượng', 'Quyết định công nhận đạt chuẩn quốc gia'] },
      { k: 'ghi_chu', nhan: 'Ghi chú cuối mục', kieu: 'area' }
    ],
    ke_hoach: [
      { kieu: 'nhom', nhan: 'Văn bản kế hoạch năm học (Điều 9 khoản 1)' },
      { k: 'van_ban', kieu: 'vb', goiYVb: ['Kế hoạch tuyển sinh lớp 1', 'Kế hoạch giáo dục nhà trường',
        'Quy chế phối hợp giữa nhà trường, gia đình và xã hội', 'Các chương trình, hoạt động hỗ trợ học tập, rèn luyện, sinh hoạt'] },
      { k: 'thuc_don', nhan: 'Thực đơn hằng ngày (nếu có bán trú: dán link thực đơn tuần; không có thì ghi "nhà trường không tổ chức bán trú")' },
      { k: 'ghi_chu', nhan: 'Ghi chú cuối mục', kieu: 'area' }
    ],
    ket_qua: [
      { k: 'nam_truoc', nhan: 'Năm học của số liệu', goiY: '2025-2026' },
      { k: 'phu_de', nhan: 'Ghi chú dưới tiêu đề', goiY: 'Số liệu gộp ba trường tiền thân' },
      { kieu: 'nhom', nhan: 'Theo khối (Điều 9 khoản 2 điểm a, b)', mo: '"Điền tự động" lấy từ danh sách học sinh năm trước. Cột "Học 2 buổi/ngày" nhà trường nhập. Kết quả HTXS/HTT/HT/CHT chỉ có khi đã nạp kết quả đánh giá.' },
      { k: 'khoi', kieu: 'bang', cot: [{ k: 'khoi', nhan: 'Khối', kieu: 'so' }, { k: 'so_lop', nhan: 'Lớp', kieu: 'so' }, { k: 'hoc_sinh', nhan: 'HS', kieu: 'so' },
        { k: 'hai_buoi', nhan: '2 buổi', kieu: 'so' }, { k: 'nu', nhan: 'Nữ', kieu: 'so' }, { k: 'dtts', nhan: 'DTTS', kieu: 'so' }, { k: 'khuyet_tat', nhan: 'KT', kieu: 'so' },
        { k: 'htxs', nhan: 'HTXS', kieu: 'so' }, { k: 'htt', nhan: 'HTT', kieu: 'so' }, { k: 'ht', nhan: 'HT', kieu: 'so' }, { k: 'cht', nhan: 'CHT', kieu: 'so' },
        { k: 'len_lop', nhan: 'Lên lớp', kieu: 'so' }, { k: 'khong_len_lop', nhan: 'Không LL', kieu: 'so' }] },
      { k: 'chuyen_den', nhan: 'Số học sinh chuyển đến trong năm', kieu: 'so' }, { k: 'chuyen_di', nhan: 'Số học sinh chuyển đi trong năm', kieu: 'so' },
      { k: 'hoan_thanh_cth', nhan: 'Lớp 5 hoàn thành chương trình tiểu học — số em', kieu: 'so' }, { k: 'tong_lop5', nhan: '— trên tổng số học sinh lớp 5', kieu: 'so' },
      { k: 'ghi_chu', nhan: 'Ghi chú cuối mục', kieu: 'area' }
    ],
    bao_cao: [
      { kieu: 'nhom', nhan: 'Báo cáo thường niên (Điều 14 khoản 1 điểm b · Phụ lục I)', mo: 'Mỗi dòng một bản PDF (đã ký, đóng dấu). Báo cáo năm trước của các trường tiền thân cũng đưa vào đây để lưu trữ đủ 05 năm.' },
      { k: 'ban', kieu: 'bang', cot: [{ k: 'nam', nhan: 'Năm' }, { k: 'ten', nhan: 'Tên', rong: 1 }, { k: 'don_vi', nhan: 'Đơn vị (trường tiền thân)' },
        { k: 'ghi_chu', nhan: 'Ghi chú (ngày công bố…)' }, { k: 'link', nhan: 'Link tệp PDF', rong: 1 }] },
      { kieu: 'nhom', nhan: 'Mục VII của báo cáo thường niên', mo: 'Nút "📄 Báo cáo thường niên (Word)" ở đầu thẻ dựng bản Word 7 mục từ các mục công khai; ô dưới là phần VII do nhà trường viết.' },
      { k: 'nhiem_vu_khac', nhan: 'Kết quả thực hiện các nhiệm vụ trọng tâm khác', kieu: 'area' }
    ]
  };

  // ══════════ TRẠNG THÁI ══════════
  var NAM = '';
  var DONG = [];      // các dòng cong_khai của năm đang chọn (nháp + công bố)
  var MUC_CHON = '';
  var HOP = null;

  function namHienTai() { return (window.CAU_HINH || {}).NAM_HOC || ''; }
  function namTruoc(n) { var a = parseInt(String(n).split('-')[0], 10); return a ? (a - 1) + '-' + a : ''; }
  function dong(muc, tt) { for (var i = 0; i < DONG.length; i++) if (DONG[i].muc === muc && DONG[i].trang_thai === tt) return DONG[i]; return null; }

  function layGT(o, k) { return k.split('.').reduce(function (a, p) { return a && a[p] != null ? a[p] : undefined; }, o); }
  function datGT(o, k, v) {
    var ps = k.split('.'), cur = o;
    for (var i = 0; i < ps.length - 1; i++) { if (!cur[ps[i]] || typeof cur[ps[i]] !== 'object') cur[ps[i]] = {}; cur = cur[ps[i]]; }
    cur[ps[ps.length - 1]] = v;
  }

  // ══════════ VẼ THẺ ══════════
  function ve(hop) {
    HOP = hop;
    if (!NAM) NAM = namHienTai();
    hop.innerHTML = '<div class="the-thong-bao">Đang tải nội dung công khai…</div>';
    may().from('cong_khai').select('*').eq('nam_hoc', NAM).in('trang_thai', ['nhap', 'cong_bo'])
      .then(function (r) {
        if (r.error) {
          hop.innerHTML = '<div class="the-thong-bao"><b>Chưa bật được Cổng công khai.</b><br>' +
            'Trường cần chạy tệp <code>sql/80-cong-khai.sql</code> trên Supabase (SQL Editor) một lần. Chi tiết lỗi: ' + t(r.error.message) + '</div>';
          return;
        }
        DONG = r.data || [];
        veDanhSach();
      }, baoLoi);
  }

  function trangThaiMuc(m) {
    var cb = dong(m.ma, 'cong_bo'), nh = dong(m.ma, 'nhap');
    var h = '';
    if (cb) h += '<span class="ckq-chip ckq-tot">Đã công bố ' + t(ngayGio(cb.cong_bo_luc)) + '</span>';
    if (nh) h += '<span class="ckq-chip ckq-cho">Nháp ' + (cb ? 'cập nhật chưa công bố' : 'chưa công bố') + ' · sửa ' + t(ngayGio(nh.sua_luc)) + '</span>';
    if (!cb && !nh) h += '<span class="ckq-chip ckq-ko">Chưa soạn</span>';
    return h;
  }

  function veDanhSach() {
    var namChon = [namHienTai(), namTruoc(namHienTai())].filter(Boolean);
    if (namChon.indexOf(NAM) < 0) namChon.push(NAM);
    var soCB = window.CONG_KHAI.MUC.filter(function (m) { return dong(m.ma, 'cong_bo'); }).length;
    HOP.innerHTML = '<div class="ckq-khu">' +
      '<div class="ckq-dau"><div><h3>🏛 Cổng công khai — Thông tư 09/2024/TT-BGDĐT</h3>' +
      '<p>Nội dung công bố ở đây hiện trên trang chủ cho <b>mọi người</b> (không cần đăng nhập). Hạn công bố trước <b>' +
      t(window.CONG_KHAI.hanNam(NAM)) + '</b>; có thay đổi thì cập nhật chậm nhất <b>10 ngày làm việc</b> (Điều 15). ' +
      'Chỉ đưa <b>số tổng hợp</b> — không đưa tên, điểm của học sinh.</p></div>' +
      '<div class="ckq-nut-dau"><label>Năm học <select id="ckq-nam">' + namChon.map(function (n) {
        return '<option' + (n === NAM ? ' selected' : '') + '>' + t(n) + '</option>';
      }).join('') + '</select></label>' +
      '<button class="nut-phu" id="ckq-xem-truoc">👁 Xem trước cả cổng</button>' +
      '<button class="nut-phu" id="ckq-bctn" title="Phụ lục I Thông tư 09/2024 — dựng từ các mục công khai của năm học đang chọn, đối sánh năm trước">📄 Báo cáo thường niên (Word)</button></div></div>' +
      (soCB ? '' : '<div class="ckq-goi-y">Cổng chỉ thay cho hộp đăng nhập ở trang chủ khi nhà trường đã <b>công bố ít nhất một mục</b>. ' +
        'Trước đó thầy cô cứ soạn và xem trước thoải mái — người ngoài chưa thấy gì.</div>') +
      '<div class="ckq-ds">' + window.CONG_KHAI.MUC.map(function (m) {
        return '<div class="ckq-dong' + (m.ma === MUC_CHON ? ' on' : '') + '"><div class="ckq-so">' + m.so + '</div><div class="ckq-ten"><b>' + t(m.ten) +
          '</b><small>' + t(m.dieu) + ' · ' + t(m.mo) + '</small><div>' + trangThaiMuc(m) + '</div></div>' +
          '<button class="nut-chinh" data-ckq-soan="' + m.ma + '">✏️ Soạn</button></div>';
      }).join('') + '</div><div id="ckq-soan"></div></div>';

    document.getElementById('ckq-nam').addEventListener('change', function () { NAM = this.value; MUC_CHON = ''; ve(HOP); });
    document.getElementById('ckq-xem-truoc').addEventListener('click', xemTruoc);
    document.getElementById('ckq-bctn').addEventListener('click', function () { xuatBCTN(this); });
    Array.prototype.slice.call(HOP.querySelectorAll('[data-ckq-soan]')).forEach(function (b) {
      b.addEventListener('click', function () { MUC_CHON = b.getAttribute('data-ckq-soan'); veDanhSach(); });
    });
    if (MUC_CHON) veSoan(MUC_CHON);
  }

  // ══════════ BIỂU MẪU SOẠN ══════════
  function oNhap(f, gt) {
    var v = gt == null ? '' : gt;
    if (f.kieu === 'chk') return '<label class="ckq-chk"><input type="checkbox" data-k="' + f.k + '"' + (v === true || v === 'true' ? ' checked' : '') + '> ' + t(f.nhan) + '</label>';
    if (f.kieu === 'area') return '<textarea data-k="' + f.k + '" rows="3" placeholder="' + t(f.goiY || '') + '">' + t(v) + '</textarea>';
    return '<input data-k="' + f.k + '" ' + (f.kieu === 'so' ? 'type="number" step="any" inputmode="decimal"' : 'type="text"') +
      ' value="' + t(v) + '" placeholder="' + t(f.goiY || '') + '">';
  }
  function dongBang(cot, d) {
    return '<tr>' + cot.map(function (c) {
      var v = d[c.k] == null ? '' : d[c.k];
      if (c.kieu === 'chk') return '<td class="ckq-giua"><input type="checkbox" data-c="' + c.k + '"' + (v ? ' checked' : '') + '></td>';
      var canhBao = c.k === 'link' && laThuMuc(v) ? ' ckq-sai' : '';
      return '<td><input class="' + (c.rong ? 'ckq-rong' : '') + canhBao + '" data-c="' + c.k + '" ' +
        (c.kieu === 'so' ? 'type="number" step="any"' : 'type="text"') + ' value="' + t(v) + '"></td>';
    }).join('') + '<td class="ckq-giua"><button type="button" class="ckq-xoa" title="Xoá dòng">✕</button></td></tr>';
  }
  function bangHTML(f, ds, cot) {
    ds = Array.isArray(ds) && ds.length ? ds : [{}];
    return '<div class="ckq-bang-cuon"><table class="ckq-bang" data-bang="' + f.k + '"><thead><tr>' +
      cot.map(function (c) { return '<th>' + t(c.nhan) + '</th>'; }).join('') + '<th></th></tr></thead><tbody>' +
      ds.map(function (d) { return dongBang(cot, d); }).join('') + '</tbody></table></div>' +
      '<div class="ckq-bang-nut"><button type="button" class="nut-phu" data-them="' + f.k + '">＋ Thêm dòng</button>' +
      (f.kieu === 'vb' ? veChonHoSo(f) : '') + '</div>';
  }
  function veChonHoSo(f) {
    var ds = (window.HO_SO || []).filter(function (h) { return h.link; });
    var goiY = (f.goiYVb || []).map(function (g) { return '<option value="g:' + t(g) + '">＋ ' + t(g) + '</option>'; }).join('');
    return '<select class="ckq-chon-hs" data-chon-hs="' + f.k + '"><option value="">— Thêm từ gợi ý / kho hồ sơ —</option>' +
      (goiY ? '<optgroup label="Gợi ý theo Thông tư">' + goiY + '</optgroup>' : '') +
      (ds.length ? '<optgroup label="Kho hồ sơ minh chứng (lấy tên + link)">' + ds.map(function (h, i) {
        return '<option value="h:' + i + '">' + t(h.ma + ' · ' + h.ten) + '</option>';
      }).join('') + '</optgroup>' : '') + '</select>';
  }

  // ndMoi: nội dung vẽ thay (sau "Điền số liệu tự động" — chưa lưu)
  function veSoan(ma, ndMoi) {
    var m = window.CONG_KHAI.MUC.filter(function (x) { return x.ma === ma; })[0];
    var vung = document.getElementById('ckq-soan');
    if (!m || !vung) return;
    var nh = dong(ma, 'nhap'), cb = dong(ma, 'cong_bo');
    var nd = ndMoi || JSON.parse(JSON.stringify((nh || cb || {}).noi_dung || {}));
    var khuon = KHUON[ma];
    var coTuDong = !!TU_DONG[ma];

    vung.innerHTML = '<div class="ckq-soan" id="ckq-form"><div class="ckq-soan-dau"><h3>Mục ' + m.so + '. ' + t(m.tenDai) +
      ' <small>' + t(m.dieu) + '</small></h3><div>' +
      (nh ? 'Đang sửa <b>bản nháp</b>' : cb ? 'Đang sửa từ <b>bản đã công bố</b> — lưu sẽ tạo bản nháp cập nhật' : 'Mục mới') + '</div></div>' +
      (coTuDong ? '<button type="button" class="nut-phu ckq-tu-dong" id="ckq-tu-dong">⚡ Điền số liệu tự động từ hệ thống</button>' : '') +
      (ma === 'ket_qua' ? ' <label class="nut-phu ckq-tu-dong ckq-nut-tep" title="Chọn một hoặc nhiều tệp kết quả cuối năm (TT 27) kết xuất từ CSDL ngành — kể cả của trường tiền thân. Chỉ ĐẾM trên máy, không lưu tên học sinh.">' +
        '📥 Đếm từ tệp Excel CSDL ngành<input type="file" id="ckq-tep-tt27" accept=".xls,.xlsx" multiple hidden></label>' +
        '<div id="ckq-tt27"></div>' : '') +
      '<div class="ckq-luoi">' + khuon.map(function (f) {
        if (f.kieu === 'nhom') return '<div class="ckq-nhom"><b>' + t(f.nhan) + '</b>' + (f.mo ? '<small>' + t(f.mo) + '</small>' : '') + '</div>';
        if (f.kieu === 'bang') return '<div class="ckq-o ckq-o-rong">' + (f.nhan ? '<label>' + t(f.nhan) + '</label>' : '') + bangHTML(f, layGT(nd, f.k), f.cot) + '</div>';
        if (f.kieu === 'vb') return '<div class="ckq-o ckq-o-rong">' + bangHTML(f, layGT(nd, f.k), VB_COT) +
          '<small class="ckq-luu-y">Dán link <b>TỆP PDF</b> đã đặt chia sẻ "Bất kỳ ai có đường liên kết — Người xem". ' +
          '<b>Không</b> dán link thư mục hồ sơ (ô sẽ tô đỏ): thư mục hồ sơ là dữ liệu nội bộ.</small></div>';
        if (f.kieu === 'chk') return '<div class="ckq-o ckq-o-rong">' + oNhap(f, layGT(nd, f.k)) + '</div>';
        return '<div class="ckq-o' + (f.kieu === 'area' ? ' ckq-o-rong' : '') + '"><label>' + t(f.nhan) + '</label>' + oNhap(f, layGT(nd, f.k)) + '</div>';
      }).join('') + '</div>' +
      '<div class="ckq-chan"><button type="button" class="nut-chinh" id="ckq-luu">💾 Lưu nháp</button>' +
      '<button type="button" class="nut-phu" id="ckq-xem">👁 Xem trước</button>' +
      '<button type="button" class="nut-chinh ckq-cong-bo" id="ckq-cong-bo">📢 Công bố</button>' +
      (nh ? '<button type="button" class="nut-phu" id="ckq-bo-nhap">Bỏ bản nháp</button>' : '') +
      (cb ? '<button type="button" class="nut-phu ckq-nguy" id="ckq-thu-hoi">Thu hồi bản đã công bố</button>' : '') +
      '<span class="ckq-bao" id="ckq-bao"></span></div></div>';

    var form = document.getElementById('ckq-form');
    form.addEventListener('click', function (e) {
      var b = e.target.closest('button');
      if (!b) return;
      if (b.classList.contains('ckq-xoa')) {
        var tb = b.closest('tbody');
        b.closest('tr').remove();
        if (tb && !tb.children.length) { var bg = tb.closest('table'); themDong(bg.getAttribute('data-bang'), {}); }
      }
      if (b.hasAttribute('data-them')) themDong(b.getAttribute('data-them'), {});
    });
    form.addEventListener('input', function (e) {
      if (e.target.getAttribute('data-c') === 'link') e.target.classList.toggle('ckq-sai', laThuMuc(e.target.value));
    });
    Array.prototype.slice.call(form.querySelectorAll('[data-chon-hs]')).forEach(function (s) {
      s.addEventListener('change', function () {
        var v = s.value; s.value = '';
        if (!v) return;
        var k = s.getAttribute('data-chon-hs');
        if (v.indexOf('g:') === 0) themDong(k, { ten: v.slice(2) });
        else {
          var h = (window.HO_SO || []).filter(function (x) { return x.link; })[parseInt(v.slice(2), 10)];
          if (h) themDong(k, { ten: h.ten, mo_ta: h.ma, link: h.link });
        }
      });
    });
    if (coTuDong) document.getElementById('ckq-tu-dong').addEventListener('click', function () { tuDong(ma, this); });
    var tepTT27 = document.getElementById('ckq-tep-tt27');
    if (tepTT27) tepTT27.addEventListener('change', function () { demTT27(Array.prototype.slice.call(this.files || [])); this.value = ''; });
    document.getElementById('ckq-luu').addEventListener('click', function () { luu(ma).then(function (ok) { if (ok) ve(HOP); }); });
    document.getElementById('ckq-xem').addEventListener('click', function () { xemTruoc(ma); });
    document.getElementById('ckq-cong-bo').addEventListener('click', function () { congBo(ma); });
    var bo = document.getElementById('ckq-bo-nhap');
    if (bo) bo.addEventListener('click', function () { boNhap(ma); });
    var th = document.getElementById('ckq-thu-hoi');
    if (th) th.addEventListener('click', function () { thuHoi(ma); });
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });

    function themDong(k, d) {
      var bg = form.querySelector('table[data-bang="' + k + '"]');
      if (!bg) return;
      var f = khuon.filter(function (x) { return x.k === k; })[0];
      var cot = f.kieu === 'vb' ? VB_COT : f.cot;
      var tb = bg.querySelector('tbody');
      // dòng trống duy nhất thì thay luôn
      var rows = tb.querySelectorAll('tr');
      if (rows.length === 1 && dongTrong(rows[0])) rows[0].remove();
      tb.insertAdjacentHTML('beforeend', dongBang(cot, d));
    }
  }
  function dongTrong(tr) {
    return Array.prototype.every.call(tr.querySelectorAll('[data-c]'), function (i) { return i.type === 'checkbox' ? !i.checked : !String(i.value).trim(); });
  }

  // Đọc biểu mẫu → noi_dung
  function docForm(ma) {
    var form = document.getElementById('ckq-form');
    var nd = {};
    Array.prototype.slice.call(form.querySelectorAll('[data-k]')).forEach(function (i) {
      if (i.type === 'checkbox') { if (i.checked) datGT(nd, i.getAttribute('data-k'), true); return; }
      var v = String(i.value || '').trim();
      if (v === '') return;
      datGT(nd, i.getAttribute('data-k'), i.type === 'number' ? Number(v) : v);
    });
    Array.prototype.slice.call(form.querySelectorAll('table[data-bang]')).forEach(function (bg) {
      var ds = [];
      Array.prototype.slice.call(bg.querySelectorAll('tbody tr')).forEach(function (tr) {
        if (dongTrong(tr)) return;
        var d = {};
        Array.prototype.slice.call(tr.querySelectorAll('[data-c]')).forEach(function (i) {
          var k = i.getAttribute('data-c');
          if (i.type === 'checkbox') { if (i.checked) d[k] = true; return; }
          var v = String(i.value || '').trim();
          if (v !== '') d[k] = i.type === 'number' ? Number(v) : v;
        });
        ds.push(d);
      });
      if (ds.length) datGT(nd, bg.getAttribute('data-bang'), ds);
    });
    return nd;
  }

  function linkThuMuc(nd) {
    var sai = [];
    (function quet(o) {
      if (!o || typeof o !== 'object') return;
      Object.keys(o).forEach(function (k) {
        var v = o[k];
        if (k === 'link' || k === 'cong_thong_tin') {
          if (laThuMuc(v)) sai.push((o.ten || v) + ' (link thư mục)');
          else if (v && !/^https?:\/\//i.test(String(v))) sai.push((o.ten || v) + ' (link phải bắt đầu bằng https://)');
        } else if (k === 'thuc_don' && laThuMuc(v)) sai.push('Thực đơn (link thư mục)');
        else if (typeof v === 'object') quet(v);
      });
    })(nd);
    return sai;
  }

  function bao(chu) { var b = document.getElementById('ckq-bao'); if (b) b.innerHTML = chu; }

  // Lưu nháp (upsert dòng nháp của năm × mục). Trả Promise<bool>.
  function luu(ma) {
    var nd = docForm(ma);
    var nh = dong(ma, 'nhap');
    bao('Đang lưu…');
    var lh = nh
      ? may().from('cong_khai').update({ noi_dung: nd }).eq('id', nh.id).select('*').single()
      : may().from('cong_khai').insert({ nam_hoc: NAM, muc: ma, noi_dung: nd }).select('*').single();
    return lh.then(function (r) {
      if (r.error) { bao(''); baoLoi(r.error); return false; }
      DONG = DONG.filter(function (d) { return !(d.muc === ma && d.trang_thai === 'nhap'); }).concat([r.data]);
      bao('✅ Đã lưu nháp ' + ngayGio(r.data.sua_luc));
      var sai = linkThuMuc(nd);
      if (sai.length) bao('⚠️ Đã lưu, nhưng còn ' + sai.length + ' link chưa đúng (thư mục, hoặc không bắt đầu bằng https://) — sửa trước khi công bố.');
      return true;
    }, function (e) { bao(''); baoLoi(e); return false; });
  }

  function congBo(ma) {
    var nd = docForm(ma);
    var sai = linkThuMuc(nd);
    if (sai.length) {
      window.hopHoi({ tieuDe: 'Còn link chưa đúng', bieuTuong: '⚠️', nutOK: 'Đã hiểu', nutHuy: 'Đóng',
        moTa: 'Chưa công bố được vì: ' + sai.join('; ') + '. Link THƯ MỤC hồ sơ là dữ liệu nội bộ, không đưa ra cổng.' +
          ' Thầy cô mở thư mục, chọn đúng tệp PDF, đặt chia sẻ "Bất kỳ ai có đường liên kết — Người xem" rồi dán link tệp.' });
      return;
    }
    var m = window.CONG_KHAI.MUC.filter(function (x) { return x.ma === ma; })[0];
    window.hopHoi({
      tieuDe: 'Công bố mục ' + m.so + '. ' + m.ten + '?', bieuTuong: '📢', nutOK: 'Công bố', nutHuy: 'Thôi',
      moTa: 'Nội dung sẽ hiện NGAY trên cổng công khai cho mọi người (không cần đăng nhập), năm học ' + NAM +
        '. Bản công bố trước (nếu có) được lưu lại làm lịch sử. Ngày công bố do máy chủ ghi.'
    }).then(function (ok) {
      if (!ok) return;
      luu(ma).then(function (daLuu) {
        if (!daLuu) return;
        bao('Đang công bố…');
        may().rpc('cong_khai_cong_bo', { p_nam: NAM, p_muc: ma }).then(function (r) {
          if (r.error) { bao(''); baoLoi(r.error); return; }
          bao('');
          if (window.notify) window.notify('Đã công bố mục ' + m.so + '. ' + m.ten);
          ve(HOP);
        }, baoLoi);
      });
    });
  }

  function boNhap(ma) {
    var nh = dong(ma, 'nhap'); if (!nh) return;
    window.hopHoi({ tieuDe: 'Bỏ bản nháp?', moTa: 'Bản nháp chưa công bố của mục này sẽ bị xoá. Bản đã công bố (nếu có) giữ nguyên.', nutOK: 'Bỏ nháp', nutHuy: 'Thôi', nguyHiem: true })
      .then(function (ok) {
        if (!ok) return;
        may().from('cong_khai').delete().eq('id', nh.id).then(function (r) { if (r.error) baoLoi(r.error); else ve(HOP); }, baoLoi);
      });
  }

  function thuHoi(ma) {
    var m = window.CONG_KHAI.MUC.filter(function (x) { return x.ma === ma; })[0];
    window.hopHoi({ tieuDe: 'Thu hồi mục ' + m.so + '. ' + m.ten + '?', nguyHiem: true, nutOK: 'Thu hồi', nutHuy: 'Thôi',
      moTa: 'Mục này sẽ không còn hiện trên cổng (cổng ghi "Đang cập nhật"). Bản đã công bố vẫn lưu trong hệ thống. Chỉ dùng khi công bố nhầm.' })
      .then(function (ok) {
        if (!ok) return;
        may().rpc('cong_khai_thu_hoi', { p_nam: NAM, p_muc: ma }).then(function (r) { if (r.error) baoLoi(r.error); else ve(HOP); }, baoLoi);
      });
  }

  // Xem trước: mục đang soạn lấy từ biểu mẫu; các mục khác của năm lấy nháp (nếu có) rồi
  // mới tới bản công bố; năm khác lấy bản công bố (báo cáo thường niên các năm).
  function xemTruoc(maDangSoan) {
    may().from('cong_khai').select(window.CONG_KHAI.COT).eq('trang_thai', 'cong_bo').then(function (r) {
      var ds = ((r && r.data) || []).filter(function (x) { return x.nam_hoc !== NAM; });
      window.CONG_KHAI.MUC.forEach(function (m) {
        var x = dong(m.ma, 'nhap') || dong(m.ma, 'cong_bo');
        if (typeof maDangSoan === 'string' && m.ma === maDangSoan && document.getElementById('ckq-form')) {
          x = Object.assign({}, x || { nam_hoc: NAM, muc: m.ma }, { noi_dung: docForm(m.ma), trang_thai: 'nhap' });
        }
        if (x) ds.push(x);
      });
      window.xemCongKhai(ds);
    }, baoLoi);
  }

  // ══════════ ĐẾM KẾT QUẢ TT27 TỪ EXCEL (js/cong-khai-tt27.js) ══════════
  function demTT27(tep) {
    var vung = document.getElementById('ckq-tt27');
    if (!vung || !tep.length || !window.CK_TT27) return;
    vung.innerHTML = '<div class="ckq-goi-y">Đang đọc ' + tep.length + ' tệp…</div>';
    Promise.all(tep.map(function (f) { return window.CK_TT27.docTep(f).catch(function (e) { return [{ ten: f.name, khoi: {}, ma: [], so_dong: 0, canh_bao: ['Không đọc được: ' + ((e && e.message) || e)] }]; }); }))
      .then(function (ds) {
        var g = window.CK_TT27.gop([].concat.apply([], ds));
        var khoi = Object.keys(g.khoi).sort();
        if (!khoi.length) {
          vung.innerHTML = '<div class="ckq-goi-y">Không đếm được học sinh nào. ' + t(g.canh_bao.join(' · ')) + '</div>';
          return;
        }
        var cot = [['so_lop', 'Lớp'], ['hoc_sinh', 'HS']].concat(g.co_gioi ? [['nu', 'Nữ']] : [])
          .concat(g.co_xl ? [['htxs', 'HTXS'], ['htt', 'HTT'], ['ht', 'HT'], ['cht', 'CHT']] : [])
          .concat(g.co_len ? [['len_lop', 'Lên lớp'], ['khong_len_lop', 'Không LL']] : [])
          .concat(g.co_htct ? [['hoan_thanh_cth', 'HTCT tiểu học']] : []);
        vung.innerHTML = '<div class="ckq-tt27"><b>Đếm được ' + g.so_dong + ' học sinh từ ' + tep.length + ' tệp</b> — đối chiếu với tổng hợp của trường trước khi điền:' +
          '<div class="ckq-bang-cuon"><table class="ckq-bang"><thead><tr><th>Khối</th>' + cot.map(function (c2) { return '<th>' + c2[1] + '</th>'; }).join('') +
          '</tr></thead><tbody>' + khoi.map(function (k) {
            return '<tr><td>Khối ' + k + '</td>' + cot.map(function (c2) { return '<td>' + g.khoi[k][c2[0]] + '</td>'; }).join('') + '</tr>';
          }).join('') + '</tbody></table></div>' +
          (g.canh_bao.length ? '<div class="ckq-luu-y">⚠️ ' + t(g.canh_bao.join(' · ')) + '</div>' : '') +
          '<button type="button" class="nut-chinh" id="ckq-tt27-dien">✔ Điền vào bảng theo khối</button> ' +
          '<button type="button" class="nut-phu" id="ckq-tt27-bo">Bỏ</button></div>';
        document.getElementById('ckq-tt27-bo').onclick = function () { vung.innerHTML = ''; };
        document.getElementById('ckq-tt27-dien').onclick = function () {
          var nd = docForm('ket_qua');
          var cu = nd.khoi || [];
          nd.khoi = khoi.map(function (k) {
            var a = g.khoi[k], r = cu.filter(function (x) { return String(x.khoi) === String(k); })[0] || {};
            r.khoi = +k; r.so_lop = a.so_lop; r.hoc_sinh = a.hoc_sinh;
            if (g.co_gioi) r.nu = a.nu;
            if (g.co_xl) { r.htxs = a.htxs; r.htt = a.htt; r.ht = a.ht; r.cht = a.cht; }
            if (g.co_len && +k < 5) { r.len_lop = a.len_lop; r.khong_len_lop = a.khong_len_lop; }
            return r;
          }).concat(cu.filter(function (x) { return khoi.indexOf(String(x.khoi)) < 0; }));
          if (g.khoi[5]) { nd.tong_lop5 = g.khoi[5].hoc_sinh; if (g.co_htct) nd.hoan_thanh_cth = g.khoi[5].hoan_thanh_cth; }
          veSoan('ket_qua', nd);
          bao('📥 Đã điền số đếm từ ' + tep.length + ' tệp Excel (' + g.so_dong + ' học sinh). Kiểm tra cột "2 buổi", DTTS, KT rồi bấm Lưu nháp.');
        };
      });
  }

  // ══════════ BÁO CÁO THƯỜNG NIÊN (js/cong-khai-bctn.js) ══════════
  // Năm học đang chọn: bản CÔNG BỐ, mục nào chưa công bố thì lấy NHÁP (BGH thường xuất báo
  // cáo để rà trước rồi mới công bố). Năm trước liền kề: chỉ bản công bố.
  function xuatBCTN(nut) {
    if (!window.xuatBaoCaoThuongNien) { baoLoi('Chưa tải được phần xuất báo cáo — tải lại trang.'); return; }
    var cu = nut.textContent; nut.disabled = true; nut.textContent = 'Đang dựng báo cáo…';
    may().from('cong_khai').select('nam_hoc,muc,noi_dung,trang_thai').in('nam_hoc', [NAM, namTruoc(NAM)]).in('trang_thai', ['nhap', 'cong_bo'])
      .then(function (r) {
        nut.disabled = false; nut.textContent = cu;
        if (r.error) { baoLoi(r.error); return; }
        var nam = {}, truoc = {};
        (r.data || []).forEach(function (x) {
          if (x.nam_hoc === NAM) { if (x.trang_thai === 'cong_bo' || !nam[x.muc]) nam[x.muc] = x.noi_dung; }
          else if (x.trang_thai === 'cong_bo') truoc[x.muc] = x.noi_dung;
        });
        if (!Object.keys(nam).length) { baoLoi('Năm học ' + NAM + ' chưa soạn mục công khai nào — chưa có gì để dựng báo cáo.'); return; }
        window.xuatBaoCaoThuongNien(NAM, nam, truoc);
      }, function (e) { nut.disabled = false; nut.textContent = cu; baoLoi(e); });
  }

  // ══════════ ĐIỀN SỐ LIỆU TỰ ĐỘNG ══════════
  var SO_LIEU = {};
  function laySoLieu() {
    if (SO_LIEU[NAM]) return Promise.resolve(SO_LIEU[NAM]);
    return may().rpc('cong_khai_so_lieu', { p_nam: NAM }).then(function (r) {
      if (r.error) throw r.error;
      SO_LIEU[NAM] = r.data; return r.data;
    });
  }
  // Bằng công nhận CQG chỉ tính khi đã khai số quyết định hoặc ngày ký — bảng cnqg_bang
  // dựng sẵn một dòng MẪU (Mức 1, trống QĐ) cho trường điền; đọc dòng đó là ghi sai mức.
  function bangCQG(sl) {
    var q = sl && sl.chuan_qg;
    return q && q.muc_do && (q.so_quyet_dinh || q.ngay_ky) ? q : null;
  }
  function tong(ds, k) { return (ds || []).reduce(function (a, d) { return a + (Number(d[k]) || 0); }, 0); }
  function trong(v) { return v == null || v === '' || (Array.isArray(v) && !v.length); }

  function tuDong(ma, nut) {
    nut.disabled = true; var cu = nut.textContent; nut.textContent = 'Đang lấy số liệu…';
    laySoLieu().then(function (sl) {
      var nd = docForm(ma);
      var ghiChu = TU_DONG[ma](nd, sl) || '';
      veSoan(ma, nd);   // vẽ lại biểu mẫu với nội dung mới (giữ những gì đã gõ), CHƯA lưu
      bao('⚡ Đã điền số liệu lấy lúc ' + ngayGio(sl.lay_luc) + '. ' + ghiChu + ' Kiểm tra lại rồi bấm Lưu nháp.');
    }, function (e) { nut.disabled = false; nut.textContent = cu; baoLoi(e); });
  }

  function demCBGV() {
    var ds = (window.DS_TAI_KHOAN || []).filter(function (u) { return !u.trang_thai || u.trang_thai !== 'khoa'; });
    var nhom = { cbql: 0, gv: 0, tpt: 0, nv: 0 };
    ds.forEach(function (u) {
      var cv = String(u.chuc_vu || '').toLowerCase();
      if (/hiệu trưởng/.test(cv)) nhom.cbql++;
      else if (/tổng phụ trách/.test(cv)) nhom.tpt++;
      else if (/nhân viên|kế toán|văn thư|thư viện|thiết bị|y tế|bảo vệ|phục vụ|thủ quỹ|cấp dưỡng/.test(cv) || u.vai_tro === 'nhan_vien') nhom.nv++;
      else nhom.gv++;
    });
    nhom.tong = ds.length;
    return nhom;
  }

  var TU_DONG = {
    thong_tin: function (nd, sl) {
      var C = window.CAU_HINH || {};
      if (trong(nd.ten)) nd.ten = C.TEN_TRUONG;
      if (trong(nd.loai_hinh)) nd.loai_hinh = 'Công lập';
      if (trong(nd.co_quan_truc_tiep) && C.CHU_QUAN_THUONG) nd.co_quan_truc_tiep = C.CHU_QUAN_THUONG;
      if (trong(nd.co_quan_chuyen_mon) && C.CO_QUAN_THUONG) nd.co_quan_chuyen_mon = C.CO_QUAN_THUONG;
      if (trong(nd.tru_so) && C.DIA_CHI_TRUONG) nd.tru_so = C.DIA_CHI_TRUONG;
      if (trong(nd.dien_thoai) && C.DIEN_THOAI) nd.dien_thoai = C.DIEN_THOAI;
      if (trong(nd.email) && C.EMAIL_TRUONG) nd.email = C.EMAIL_TRUONG;
      if (trong(nd.cong_thong_tin)) nd.cong_thong_tin = location.origin;
      var cs = sl.co_so || [];
      if (trong(nd.diem_truong) && cs.length) nd.diem_truong = cs.map(function (c) { return c.ten; }).join(' · ');
      nd.tom_tat = nd.tom_tat || {};
      if (cs.length) nd.tom_tat.diem_truong = cs.length;
      var lop = tong(sl.hien_tai, 'so_lop'), hs = tong(sl.hien_tai, 'hoc_sinh');
      if (lop) nd.tom_tat.lop = lop;
      if (hs) nd.tom_tat.hoc_sinh = hs;
      var cb = demCBGV();
      if (cb.tong) nd.tom_tat.cbgv = cb.tong;
      if (bangCQG(sl) && trong(nd.tom_tat.chuan_qg)) nd.tom_tat.chuan_qg = 'Mức ' + bangCQG(sl).muc_do;
      nd.tom_tat.chot = homNay();
      if (trong(nd.lanh_dao)) {
        var ld = (window.DS_TAI_KHOAN || []).filter(function (u) { return /hiệu trưởng/i.test(u.chuc_vu || ''); })
          .sort(function (a, b) { return /phó/i.test(a.chuc_vu) - /phó/i.test(b.chuc_vu); })
          .map(function (u) { return { chuc_vu: u.chuc_vu, ho_ten: u.ho_ten, email: u.email || '', dien_thoai: u.so_dien_thoai || u.sdt || '' }; });
        if (ld.length) nd.lanh_dao = ld;
      }
      return 'Số lớp, học sinh theo danh sách lớp năm ' + NAM + '; CBGV theo danh sách tài khoản (' + cb.tong + ' người).' +
        (bangCQG(sl) ? '' : ' Ô chuẩn quốc gia: chưa khai bằng công nhận (số QĐ) trong hệ thống — thầy cô ghi tay, ví dụ "Mức 2 (bảo lưu)".');
    },
    doi_ngu: function (nd) {
      var c = demCBGV();
      var mau = [['Cán bộ quản lý', c.cbql], ['Giáo viên', c.gv], ['Tổng phụ trách Đội', c.tpt], ['Nhân viên', c.nv]];
      var cu = nd.bang || [];
      nd.bang = mau.filter(function (x) { return x[1]; }).map(function (x) {
        var d = cu.filter(function (r) { return r.vi_tri === x[0]; })[0] || { vi_tri: x[0] };
        d.tong = x[1];
        return d;
      }).concat(cu.filter(function (r) { return !mau.some(function (x) { return x[0] === r.vi_tri; }); }));
      if (trong(nd.dc_tong) && c.gv) nd.dc_tong = c.gv + c.tpt;
      if (trong(nd.nn_tong) && (c.gv + c.cbql)) nd.nn_tong = c.gv + c.tpt + c.cbql;
      if (trong(nd.bd_tong) && c.tong) nd.bd_tong = c.tong;
      return 'Tổng số đếm theo chức vụ trong danh sách tài khoản — kiểm tra lại, chia cột trình độ.';
    },
    csvc: function (nd, sl) {
      var cs = sl.co_so || [];
      if (cs.length) nd.so_diem = cs.length;
      var hs = tong(sl.hien_tai, 'hoc_sinh'); if (hs) nd.hoc_sinh = hs;
      if (trong(nd.toi_thieu_bq)) nd.toi_thieu_bq = 10;
      var ten = {};
      ((window.CSVC && window.CSVC.nhom) || []).forEach(function (n) { (n.muc || []).forEach(function (m) { ten[m.ma] = m.ten; }); });
      var ds = (sl.csvc || []).filter(function (c) { return Number(c.so_luong) > 0; });
      if (ds.length) {
        var cu = nd.phong || [];
        var lop = tong(sl.hien_tai, 'so_lop');
        nd.phong = ds.map(function (c) {
          var tn = ten[c.hang_muc] || c.hang_muc;
          var d = cu.filter(function (r) { return r.hang_muc === tn; })[0] || { hang_muc: tn };
          d.hien_co = Number(c.so_luong);
          if (c.hang_muc === 'phong_hoc' && trong(d.toi_thieu) && lop) d.toi_thieu = lop;
          return d;
        });
        return 'Số Hiện có lấy từ Kiểm kê CSVC năm ' + NAM + '.';
      }
      return 'Chưa có số liệu Kiểm kê CSVC năm ' + NAM + ' — nhập tay hoặc kiểm kê ở mục Đảm bảo chất lượng.';
    },
    kiem_dinh: function (nd, sl) {
      var q = bangCQG(sl);
      if (!q) return 'Chưa khai bằng công nhận chuẩn quốc gia (số QĐ, ngày ký) trong hệ thống — nhập tay các mốc.';
      nd.moc = nd.moc || [];
      var tieuDe = 'Công nhận đạt chuẩn quốc gia Mức độ ' + q.muc_do;
      if (!nd.moc.some(function (x) { return x.tieu_de === tieuDe; })) {
        var d = q.ngay_ky ? new Date(q.ngay_ky) : null;
        nd.moc.unshift({ thoi_gian: d ? (d.getMonth() + 1) + '/' + d.getFullYear() : '', tieu_de: tieuDe,
          mo_ta: [q.so_quyet_dinh ? 'Quyết định số ' + q.so_quyet_dinh : '', q.co_quan_cap || '',
            q.ngay_het_han ? 'hiệu lực đến ' + new Date(q.ngay_het_han).toLocaleDateString('vi-VN') : ''].filter(Boolean).join(' · ') });
      }
      return 'Đã thêm mốc từ bằng công nhận chuẩn quốc gia.';
    },
    ket_qua: function (nd, sl) {
      var ds = sl.ket_qua || [];
      if (!ds.length) return 'Chưa có danh sách học sinh năm ' + sl.nam_truoc + ' trong hệ thống — nhập tay.';
      nd.nam_truoc = sl.nam_truoc;
      var coKQ = ds.some(function (d) { return d.htxs + d.htt + d.ht + d.cht > 0; });
      var coLL = ds.some(function (d) { return d.len_lop + d.khong_len_lop > 0; });
      var cu = nd.khoi || [];
      nd.khoi = ds.map(function (d) {
        var r = cu.filter(function (x) { return Number(x.khoi) === Number(d.khoi); })[0] || {};
        r.khoi = d.khoi; r.so_lop = d.so_lop; r.hoc_sinh = d.hoc_sinh; r.nu = d.nu; r.dtts = d.dtts; r.khuyet_tat = d.khuyet_tat;
        if (coKQ) { r.htxs = d.htxs; r.htt = d.htt; r.ht = d.ht; r.cht = d.cht; }
        if (coLL && Number(d.khoi) < 5) { r.len_lop = d.len_lop; r.khong_len_lop = d.khong_len_lop; }
        return r;
      });
      nd.chuyen_di = tong(ds, 'chuyen_di');
      var k5 = ds.filter(function (d) { return Number(d.khoi) === 5; })[0];
      if (k5) { nd.tong_lop5 = k5.hoc_sinh; if (k5.hoan_thanh_cth) nd.hoan_thanh_cth = k5.hoan_thanh_cth; }
      return (coKQ ? '' : 'Chưa có kết quả đánh giá TT27 năm ' + sl.nam_truoc + ' — cột HTXS/HTT/HT/CHT nhập tay. ') +
        (coLL ? '' : 'Chưa có dữ liệu lên lớp — nhập tay. ');
    }
  };

  window.qtTabPhu = window.qtTabPhu || [];
  window.qtTabPhu.push({ ma: 'ck', ten: '🏛 Công khai', ve: ve });
})();
