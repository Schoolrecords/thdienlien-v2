// ============================================================
// tcqg-word.js — XUẤT WORD MODULE TRƯỜNG CHUẨN QUỐC GIA
// Kế thừa xuat-hoi-dong.js / xuat-minh-chung-tdg.js / xuatBieu2 Bạch Liêu.
// Gồm: Danh sách hội đồng · Bảng phân công · Danh mục minh chứng
// (bản NỘI BỘ 7 cột — bản nộp Sở đúng mẫu 5 cột nằm trong Báo cáo TĐG) ·
// Kế hoạch cải tiến Biểu 2 (A4 ngang, bảng 10 cột).
// Báo cáo TĐG Biểu 1 đầy đủ làm ở đợt sau (bản đồ sộ nhất).
// ============================================================
(function () {
  'use strict';

  function W() { return window.WORD_TIEN_ICH; }

  function ngayBanHanh(iso) {
    if (!iso) return 'ngày … tháng … năm …';
    var d = new Date(iso);
    // NĐ 30: chỉ tháng 1 và tháng 2 mới thêm số 0 phía trước
    var thang = d.getMonth() + 1;
    return 'ngày ' + String(d.getDate()).padStart(2, '0') +
      ' tháng ' + (thang < 3 ? '0' + thang : thang) + ' năm ' + d.getFullYear();
  }

  function khungNgang(tieuDe, than) {
    // A4 NGANG cho bảng nhiều cột. Trước đây hàm này thay chuỗi @page trong
    // khung dọc — Word bỏ qua @page không tên nên bản xuất ra vẫn là A4 dọc.
    // Khổ ngang bây giờ do chính khungWord dựng bằng section có tên.
    return W().khungWord(tieuDe, than, true);
  }

  function kyHoiDong(tv) {
    var chan = W().chan;
    var thuKy = tv.filter(function (t) { return t.vai_tro === 'Thư ký'; })[0];
    var chuTich = tv.filter(function (t) { return t.vai_tro === 'Chủ tịch'; })[0];
    return '<table style="border:none;width:100%;margin-top:16pt"><tr>' +
      '<td style="border:none;width:50%;text-align:center;font-size:12pt"><b>THƯ KÝ HỘI ĐỒNG</b><br>' +
      '<div style="height:56pt"></div>' +
      (thuKy ? '<b>' + chan(thuKy.ho_ten) + '</b>' : '<span style="letter-spacing:1pt">.....................................</span>') + '</td>' +
      '<td style="border:none;width:50%;text-align:center;font-size:12pt"><b>TM. HỘI ĐỒNG TỰ ĐÁNH GIÁ</b><br><b>CHỦ TỊCH</b><br>' +
      '<span class="nghieng">(Ký tên, đóng dấu)</span><div style="height:44pt"></div>' +
      (chuTich ? '<b>' + chan(chuTich.ho_ten) + '</b>' : '<span style="letter-spacing:1pt">.....................................</span>') + '</td>' +
      '</tr></table>';
  }

  // ── F3. DANH SÁCH HỘI ĐỒNG ──
  window.xuatDanhSachHoiDong = function () {
    var d = window.duLieuHoiDong && window.duLieuHoiDong();
    if (!d || !d.tv.length) { window.notify('Chưa có thành viên hội đồng để in.'); return; }
    var chan = W().chan;
    var dong = d.tv.map(function (t, i) {
      return '<tr><td class="giua">' + (i + 1) + '</td><td>' + chan(t.ho_ten) + '</td>' +
        '<td>' + chan(t.chuc_vu || '') + '</td><td class="giua">' + chan(t.vai_tro) + '</td>' +
        '<td>' + chan(t.ghi_chu || '') + '</td></tr>';
    }).join('');
    var luuY = '';
    if (d.kiem && !d.kiem.hop_le) {
      luuY = '<p class="nghieng" style="font-size:11.5pt;margin:8pt 0 0">Lưu ý: hội đồng hiện chưa đáp ứng đủ ' +
        'Điều 9 TT57 (tối thiểu 05 thành viên, số lẻ, đúng 01 Chủ tịch và 01 Thư ký) — nhà trường rà soát trước khi ban hành.</p>';
    }
    var than = W().theThuc() +
      '<p class="giua" style="font-size:15pt;font-weight:bold;margin:0">DANH SÁCH HỘI ĐỒNG TỰ ĐÁNH GIÁ</p>' +
      '<p class="giua nghieng" style="font-size:12pt;margin:2pt 0 4pt">Năm học ' + chan(d.namHoc) + '</p>' +
      '<p class="giua nghieng" style="font-size:12pt;margin:0 0 12pt">(Kèm theo Quyết định số ' +
      chan((d.hd && d.hd.so_quyet_dinh) || '……/QĐ-…') +
      (d.hd && d.hd.ngay_quyet_dinh ? ' ngày ' + new Date(d.hd.ngay_quyet_dinh).toLocaleDateString('vi-VN') : ' ngày … tháng … năm …') +
      ' của Hiệu trưởng ' + chan(W().cauHinh('TEN_TRUONG')) + ')</p>' +
      '<table><thead><tr><th style="width:8%">TT</th><th style="width:30%">Họ và tên</th>' +
      '<th style="width:24%">Chức vụ</th><th style="width:22%">Vai trò trong Hội đồng</th><th style="width:16%">Ghi chú</th></tr></thead>' +
      '<tbody>' + dong + '</tbody></table>' +
      '<p style="margin:8pt 0 0">Danh sách gồm ' + d.tv.length + ' thành viên.</p>' + luuY +
      kyHoiDong(d.tv);
    W().taiVe(W().khungWord('Danh sách hội đồng TĐG', than), 'danh-sach-hoi-dong-tdg-' + d.namHoc + '.doc');
    window.notify('Đã tải danh sách hội đồng — ' + d.tv.length + ' thành viên.');
  };

  // ── F4. BẢNG PHÂN CÔNG NHIỆM VỤ ──
  window.xuatPhanCongHoiDong = function () {
    var d = window.duLieuHoiDong && window.duLieuHoiDong();
    if (!d || !d.tv.length) { window.notify('Chưa có thành viên hội đồng để in.'); return; }
    var chan = W().chan;
    var tenTC = {};
    (window.TIEU_CHI || []).forEach(function (t) { tenTC[t.ma] = t.ten; });
    var chuaGiao = 0;
    var dong = d.tv.map(function (t, i) {
      var tc = (t.tieu_chi_phu_trach || []);
      if (!tc.length) chuaGiao++;
      return '<tr><td class="giua">' + (i + 1) + '</td><td>' + chan(t.ho_ten) + '</td>' +
        '<td>' + chan(t.chuc_vu || '') + '</td><td class="giua">' + chan(t.vai_tro) + '</td>' +
        '<td class="giua">' + chan(t.nhom || '') + '</td>' +
        '<td>' + tc.map(function (ma) { return chan(ma + '. ' + (tenTC[ma] || '')); }).join('<br>') + '</td>' +
        '<td>' + chan(t.nhiem_vu || '') + '</td></tr>';
    }).join('');
    var than = W().theThuc() +
      '<p class="giua" style="font-size:15pt;font-weight:bold;margin:0">BẢNG PHÂN CÔNG NHIỆM VỤ HỘI ĐỒNG TỰ ĐÁNH GIÁ</p>' +
      '<p class="giua nghieng" style="font-size:12pt;margin:2pt 0 12pt">Năm học ' + chan(d.namHoc) +
      ' — theo điểm b khoản 3 Điều 9 Thông tư 57/2026/TT-BGDĐT</p>' +
      '<table><thead><tr><th style="width:5%">TT</th><th style="width:16%">Họ và tên</th><th style="width:13%">Chức vụ</th>' +
      '<th style="width:10%">Vai trò</th><th style="width:10%">Nhóm công tác</th><th style="width:26%">Tiêu chí phụ trách</th>' +
      '<th style="width:20%">Nhiệm vụ cụ thể</th></tr></thead><tbody>' + dong + '</tbody></table>' +
      (chuaGiao ? '<p class="nghieng" style="font-size:11.5pt;margin:8pt 0 0">Còn ' + chuaGiao + ' thành viên chưa được phân công tiêu chí.</p>' : '') +
      kyHoiDong(d.tv);
    W().taiVe(khungNgang('Bảng phân công hội đồng TĐG', than), 'phan-cong-hoi-dong-tdg-' + d.namHoc + '.doc');
    window.notify('Đã tải bảng phân công nhiệm vụ hội đồng.');
  };

  // ── F5. DANH MỤC MINH CHỨNG (bản nội bộ 7 cột) ──
  function xuatMinhChung(dsTieuChi, nhan) {
    var chan = W().chan;
    var TEN_TT = W().TEN_TT;
    // Gom theo mã — một minh chứng dùng nhiều tiêu chí chỉ vào bảng MỘT lần (Phụ lục IV mục I.3)
    var gom = {};
    window.HO_SO.forEach(function (h) {
      var dinh = (h.tc || []).filter(function (ma) { return dsTieuChi.indexOf(ma) >= 0; });
      if (!dinh.length) return;
      if (!gom[h.ma]) gom[h.ma] = { h: h, tc: (h.tc || []).slice() };
    });
    var ds = Object.keys(gom).sort(function (a, b) { return a.localeCompare(b, 'vi'); }).map(function (ma) { return gom[ma]; });
    if (!ds.length) { window.notify('Không có minh chứng nào thuộc phạm vi đã chọn.'); return; }
    var dem = { co: 0, dang: 0, chua: 0 };
    var dong = ds.map(function (x, i) {
      dem[x.h.tt]++;
      var banGhi = (window.HS_BAN_GHI && window.HS_BAN_GHI[x.h.ma]) || {};
      return '<tr><td class="giua">' + (i + 1) + '</td>' +
        '<td class="giua"><b>' + (x.h.link ? '<a href="' + chan(x.h.link) + '">' + chan(x.h.ma) + '</a>' : chan(x.h.ma)) + '</b></td>' +
        '<td>' + chan(x.h.ten) + (banGhi.ghi_chu ? '<br><span class="nghieng" style="font-size:10.5pt">' + chan(banGhi.ghi_chu) + '</span>' : '') + '</td>' +
        '<td class="giua">' + x.tc.join(', ') + '</td>' +
        '<td class="duongdan">' + (x.h.link ? chan(x.h.link) : (banGhi.dinh_dang ? chan(banGhi.dinh_dang) : 'Hồ sơ lưu tại trường')) + '</td>' +
        '<td>' + chan(x.h.phuTrach || '') + '</td>' +
        '<td class="giua">' + (TEN_TT[x.h.tt] || '') + '</td></tr>';
    }).join('');
    var than = W().theThuc() +
      '<p class="giua" style="font-size:15pt;font-weight:bold;margin:0">DANH MỤC MÃ MINH CHỨNG</p>' +
      '<p class="giua nghieng" style="font-size:12pt;margin:2pt 0 4pt">' + chan(nhan) + ' · Năm học ' + chan(W().cauHinh('NAM_HOC')) + '</p>' +
      '<p class="giua nghieng" style="font-size:11pt;margin:0 0 12pt">(Bản dùng trong nội bộ nhà trường — bản nộp Sở theo đúng mẫu 05 cột ' +
      'tại mục II khoản 4 Phụ lục IV được kết xuất kèm Báo cáo tự đánh giá.)</p>' +
      // A4 ngang, bề ngang chữ 26,2cm — cột chia theo tỉ lệ dưới đây:
      // TT 1,05 · mã 2,62 · tên 6,29 · tiêu chí 2,10 · đường dẫn 7,07 · phụ trách 3,93 · trạng thái 3,14 (cm)
      '<table class="co-dinh"><thead><tr><th style="width:4%">TT</th><th style="width:10%">Mã minh chứng</th><th style="width:24%">Tên minh chứng</th>' +
      '<th style="width:8%">Dùng cho tiêu chí</th><th style="width:27%">Định dạng, vị trí lưu trữ / đường dẫn</th>' +
      '<th style="width:15%">Người phụ trách</th><th style="width:12%">Trạng thái</th></tr></thead><tbody>' + dong + '</tbody></table>' +
      '<p style="margin:8pt 0 0">Tổng: ' + ds.length + ' minh chứng — đã có ' + dem.co + ', đang cập nhật ' + dem.dang + ', chưa có ' + dem.chua + '.' +
      (dem.chua ? ' <span class="nghieng">Nhà trường bổ sung các minh chứng còn thiếu trước khi hoàn thiện báo cáo.</span>' : '') + '</p>';
    W().taiVe(khungNgang('Danh mục minh chứng', than), 'danh-muc-minh-chung-' + W().cauHinh('NAM_HOC') + '.doc');
    window.notify('Đã tải danh mục ' + ds.length + ' minh chứng (' + nhan + ').');
  }

  window.xuatMinhChungTheoTieuChuan = function () {
    var std = +((document.getElementById('kd-std') || {}).value || 0);
    var ds = (window.TIEU_CHI || []).filter(function (t) { return !std || t.ma.charAt(0) === String(std); })
      .map(function (t) { return t.ma; });
    xuatMinhChung(ds, std ? 'Tiêu chuẩn ' + std : 'Toàn bộ 4 tiêu chuẩn');
  };
  window.xuatMinhChungTieuChi = function (ma) {
    xuatMinhChung([ma], 'Tiêu chí ' + ma);
  };

  // ── F2. KẾ HOẠCH CẢI TIẾN — BIỂU 2 (A4 ngang) ──
  window.xuatBieu2 = function () {
    var may = window.MAY_CHU;
    var namHoc = window.CAU_HINH.NAM_HOC;
    var chan = W().chan;
    Promise.all([
      may.from('khct_thong_tin').select('*').eq('nam_hoc', namHoc).maybeSingle(),
      may.from('khct_van_de').select('*').eq('nam_hoc', namHoc).order('so_tt'),
      may.from('ke_hoach_cai_tien').select('*').eq('nam_hoc', namHoc).order('so_tt'),
      may.from('khct_theo_doi').select('*').eq('nam_hoc', namHoc)
    ]).then(function (kq) {
      var tt = kq[0].data || {}, vd = kq[1].data || [], kh = kq[2].data || [], td = kq[3].data || [];
      var oTD = {};
      td.forEach(function (r) { oTD[r.thoi_diem] = r; });
      var trong = '<span class="nghieng">(nhà trường bổ sung)</span>';

      // Thể thức NĐ 30 — dùng chung thông số với xuat-word.js (ô 44/56, đường
      // kẻ dựng bằng bảng đo bằng cm để Word không kéo dài hết ô).
      var theThuc = '<table style="border:none;width:100%;border-collapse:collapse"><tr>' +
        '<td style="border:none;padding:0;width:' + W().O_TRAI + '%;text-align:center;vertical-align:top;font-size:12pt">' +
        chan(W().cauHinh('CO_QUAN_QUAN_LY').toUpperCase()) + '<br>' +
        '<b>' + chan(W().cauHinh('TEN_TRUONG').toUpperCase()) + '</b>' +
        W().gachTenTruong(W().cauHinh('TEN_TRUONG')) +
        '<p style="margin:8pt 0 0;font-size:12pt">Số: ' + chan(tt.so_ke_hoach || '……/KH-THDL') + '</p></td>' +
        '<td style="border:none;padding:0;width:' + W().O_PHAI + '%;text-align:center;vertical-align:top;font-size:12pt">' +
        '<b style="white-space:nowrap">CỘNG&nbsp;HÒA&nbsp;XÃ&nbsp;HỘI&nbsp;CHỦ&nbsp;NGHĨA&nbsp;VIỆT&nbsp;NAM</b><br>' +
        '<b style="font-size:13pt">Độc lập - Tự do - Hạnh phúc</b>' +
        W().gach(4.4, 13) +
        '<p class="nghieng" style="margin:10pt 0 0;font-size:13pt">' +
        chan(W().diaDanh()) + ', ' + ngayBanHanh(tt.ngay_ban_hanh) + '</p></td></tr></table>';

      var b6 = ['Cuối học kỳ I', 'Cuối năm học'].map(function (thoiDiem, i) {
        var r = oTD[thoiDiem] || {};
        return '<tr><td class="giua">' + (i + 1) + '</td><td>' + thoiDiem + '</td>' +
          '<td>' + (chan(r.noi_dung || '') || trong) + '</td><td>' + chan(r.ket_qua || '') + '</td>' +
          '<td>' + chan(r.dieu_chinh || '') + '</td><td>' + chan(r.nguoi_danh_gia || '') + '</td></tr>';
      }).join('');

      var than = theThuc +
        '<p class="giua" style="font-size:15pt;font-weight:bold;margin:12pt 0 0">KẾ HOẠCH</p>' +
        '<p class="giua" style="font-size:13pt;font-weight:bold;margin:2pt 0 14pt">Cải tiến chất lượng giáo dục năm học ' + chan(namHoc) + '</p>' +

        '<p><b>I. THÔNG TIN CHUNG</b></p>' +
        '<p>Tên trường: ' + chan(W().cauHinh('TEN_TRUONG')) + ' · Loại hình và cấp học: Công lập — Tiểu học · Địa chỉ: ' +
        chan(W().cauHinh('DIA_CHI_TRUONG')) + '</p>' +

        '<p><b>II. CĂN CỨ XÂY DỰNG KẾ HOẠCH</b></p>' +
        '<p>1. Thông tư 57/2026/TT-BGDĐT ngày 07/7/2026 của Bộ trưởng Bộ Giáo dục và Đào tạo;<br>' +
        '2. Kết quả tự đánh giá của nhà trường năm học ' + chan(namHoc) + ';<br>' +
        '3. Kế hoạch năm học và điều kiện thực tế của nhà trường' +
        (tt.can_cu_khac ? ';<br>4. ' + chan(tt.can_cu_khac) : '') + '.</p>' +

        '<p><b>III. MỤC ĐÍCH, YÊU CẦU</b></p>' +
        '<p>1. Mục đích: a) khắc phục các hạn chế đã chỉ ra qua tự đánh giá; b) duy trì, nâng cao chất lượng giáo dục và ' +
        'điều kiện bảo đảm chất lượng; c) làm căn cứ theo dõi, đánh giá sự tiến bộ theo từng năm học.<br>' +
        '2. Yêu cầu: a) tập trung vào các vấn đề trọng tâm, không dàn trải theo toàn bộ tiêu chí; b) rõ mục tiêu, giải pháp, ' +
        'chỉ số kết quả, thời gian và người phụ trách; c) phù hợp nguồn lực thực tế; d) có minh chứng kiểm chứng được; ' +
        'đ) được rà soát, điều chỉnh tối thiểu 02 lần trong năm học.</p>' +

        '<p><b>IV. CÁC VẤN ĐỀ TRỌNG TÂM CẦN CẢI TIẾN</b></p>' +
        '<table><thead><tr><th style="width:4%">TT</th><th style="width:8%">Tiêu chuẩn</th><th style="width:8%">Tiêu chí (nếu có)</th>' +
        '<th style="width:28%">Đánh giá hiện trạng</th><th style="width:26%">Điểm hạn chế</th><th style="width:26%">Nguyên nhân</th></tr></thead><tbody>' +
        (vd.length ? vd.map(function (v, i) {
          return '<tr><td class="giua">' + (i + 1) + '</td><td class="giua">' + (v.tieu_chuan || '') + '</td>' +
            '<td class="giua">' + chan(v.tieu_chi_ma || '') + '</td><td>' + chan(v.hien_trang || '') + '</td>' +
            '<td>' + chan(v.han_che || '') + '</td><td>' + chan(v.nguyen_nhan || '') + '</td></tr>';
        }).join('') : '<tr><td colspan="6">' + trong + '</td></tr>') + '</tbody></table>' +
        '<p class="nghieng" style="font-size:11pt">Chỉ lựa chọn các vấn đề trọng tâm cần ưu tiên cải tiến, không lập cho toàn bộ tiêu chí.</p>' +

        '<p><b>V. KẾ HOẠCH CẢI TIẾN CHẤT LƯỢNG</b></p>' +
        '<table><thead><tr><th>TT<br>(1)</th><th>Nội dung cải tiến<br>(2)</th><th>Mục tiêu<br>(3)</th><th>Hoạt động, giải pháp<br>(4)</th>' +
        '<th>Chỉ số đánh giá kết quả<br>(5)</th><th>Thời gian<br>(6)</th><th>Phụ trách<br>(7)</th><th>Nguồn lực<br>(8)</th>' +
        '<th>Minh chứng dự kiến<br>(9)</th><th>Mức độ thực hiện<br>(10)</th></tr></thead><tbody>' +
        (kh.length ? kh.map(function (v, i) {
          return '<tr><td class="giua">' + (i + 1) + '</td>' +
            ['ten', 'muc_tieu', 'giai_phap', 'chi_so_ket_qua', 'thoi_gian_thuc_hien', 'nguoi_phu_trach', 'nguon_luc', 'minh_chung_du_kien', 'muc_do_thuc_hien'].map(function (c) {
              return '<td>' + chan(v[c] || '') + '</td>';
            }).join('') + '</tr>';
        }).join('') : '<tr><td colspan="10">' + trong + '</td></tr>') + '</tbody></table>' +

        '<p><b>VI. THEO DÕI, ĐÁNH GIÁ</b></p>' +
        '<table><thead><tr><th style="width:4%">TT</th><th style="width:14%">Thời điểm</th><th style="width:26%">Nội dung</th>' +
        '<th style="width:22%">Kết quả</th><th style="width:18%">Điều chỉnh</th><th style="width:16%">Người đánh giá</th></tr></thead>' +
        '<tbody>' + b6 + '</tbody></table>' +

        '<p><b>VII. TỔ CHỨC THỰC HIỆN</b></p>' +
        '<p>1. Trách nhiệm của người đứng đầu: ' + (chan(tt.tc_nguoi_dung_dau || '') || trong) + '</p>' +
        '<p>2. Trách nhiệm của Hội đồng tự đánh giá: ' + (chan(tt.tc_hoi_dong || '') || trong) + '</p>' +
        '<p>3. Trách nhiệm của tổ chuyên môn, bộ phận: ' + (chan(tt.tc_to_chuyen_mon || '') || trong) + '</p>' +

        '<p><b>VIII. CƠ CHẾ THEO DÕI, ĐÁNH GIÁ</b></p>' +
        '<p>a) Kế hoạch được rà soát, đánh giá tối thiểu 02 lần trong năm học; b) kết quả thực hiện là căn cứ cập nhật ' +
        'báo cáo tự đánh giá của năm học tiếp theo; c) hồ sơ theo dõi được lưu trong hệ thống hồ sơ số của nhà trường.</p>' +

        '<table style="border:none;width:100%;margin-top:14pt"><tr>' +
        '<td style="border:none;width:45%;font-size:11.5pt;vertical-align:top"><b class="nghieng">Nơi nhận:</b><br>' +
        chan(tt.noi_nhan || ('- ' + W().cauHinh('CO_QUAN_THUONG') + ';- ' +
          W().cauHinh('CHU_QUAN_THUONG') + ';- Lưu: VT.')).split(/;\s*/).join('<br>') + '</td>' +
        '<td style="border:none;width:55%;text-align:center;font-size:12pt"><b>HIỆU TRƯỞNG</b><br>' +
        '<span class="nghieng">(Ký tên, đóng dấu)</span><div style="height:56pt"></div><b>' + chan(W().cauHinh('HIEU_TRUONG')) + '</b></td>' +
        '</tr></table>';

      W().taiVe(khungNgang('Kế hoạch cải tiến ' + namHoc, than), 'ke-hoach-cai-tien-' + namHoc + '.doc');
      var chuaMucDo = kh.filter(function (v) { return !v.muc_do_thuc_hien; }).length;
      window.notify('Đã tải Biểu 2: ' + vd.length + ' vấn đề trọng tâm, ' + kh.length + ' việc cải tiến' +
        (chuaMucDo ? ', ' + chuaMucDo + ' việc chưa ghi mức độ thực hiện' : '') + '.');
    });
  };
})();
