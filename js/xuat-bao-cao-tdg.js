/* ============================================================================
   XUẤT BÁO CÁO TỰ ĐÁNH GIÁ — BIỂU 1 PHỤ LỤC V THÔNG TƯ 57/2026/TT-BGDĐT

   Kết xuất tệp Word đủ bốn phần theo đúng Biểu 1:
     Phần I   — Tổng quan
     Phần II  — Tự đánh giá (từng tiêu chí + đánh giá chung từng tiêu chuẩn)
     Phần III — Kết luận (hai bảng tổng hợp, mức đạt, đề xuất kiến nghị)
     Phần IV  — Phụ lục (danh mục minh chứng)

   Cách trình bày bám lối viết quen thuộc của nhà trường trong báo cáo cũ:
   mỗi ý một đoạn, mã minh chứng đi liền sau đoạn đó.

   MÃ MINH CHỨNG — ĐẶT ĐÚNG CHỖ, ĐÚNG DẤU

   Phụ lục IV mục I.3: "trong nội dung báo cáo tự đánh giá, tại các nhận định,
   phân tích, đánh giá có sử dụng minh chứng, cơ sở giáo dục phải ghi rõ mã minh
   chứng tương ứng". Nghĩa là mã đi theo TỪNG Ý, không dồn thành một dòng ở cuối
   tiêu chí — dồn lại thì hội đồng thẩm định đọc không biết mã nào chứng cho ý
   nào, mà đó chính là việc họ phải làm.

   Phụ lục IV mục II.2 in sẵn cả ví dụ, nên cách ghi không có chỗ để chọn:
       "Nhà trường đã ban hành kế hoạch năm học theo quy định (MC.1.1.01)."
       Nhiều minh chứng: (MC.1.1.01, MC.1.1.02)
   Ngoặc TRÒN, đặt TRONG câu, TRƯỚC dấu chấm, nhiều mã cách nhau dấu phẩy.
   Không dùng ngoặc vuông kiểu [MC.1.1.01].

   MÔ TẢ HIỆN TRẠNG LẤY TỪ ĐÂU

   Biểu 1, Lưu ý 1: "Nội dung mô tả hiện trạng phải bám sát, thể hiện rõ mức đáp
   ứng TỪNG YÊU CẦU của từng mức đánh giá; sử dụng số liệu cụ thể và viện dẫn mã
   minh chứng tương ứng." Vì vậy mô tả được ghép từ bảng tdg_noi_ham — mỗi nội
   hàm một đoạn, mã minh chứng của riêng ý đó đặt cuối đoạn. Trường nào chưa nhập
   theo nội hàm thì quay về hai ô văn xuôi cũ, không mất chữ nào đã viết.

   Ba điểm khác bảng mẫu cũ, do quy định đổi chứ không phải bỏ sót:
     · Chỉ còn Mức 1 và Mức 2, không còn Mức 3
     · Điểm mạnh, điểm hạn chế viết ở cấp TIÊU CHUẨN thay vì từng tiêu chí
     · Kế hoạch cải tiến tách hẳn sang Biểu 2, không nằm trong báo cáo này
   ============================================================================ */

(function () {
  'use strict';

  if (typeof CAU_HINH === 'undefined' || !CAU_HINH.DA_NOI) return;

  const TR = "font-family:'Times New Roman',serif;";
  const O = TR + 'border:1px solid #000;padding:5pt 7pt;font-size:12pt;vertical-align:top;';
  /* Ô tiêu đề bảng: nền xám nhạt, chữ đậm, căn giữa — thống nhất cả báo cáo,
     để hội đồng lướt qua là phân biệt được ngay đâu là dòng tiêu đề. */
  const OT = O + 'background:#e8e8e8;font-weight:bold;text-align:center;vertical-align:middle;';

  function chan(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function doan(s) {
    /* Giữ cách xuống dòng người dùng đã gõ — mỗi ý một đoạn như báo cáo cũ */
    const t = String(s || '').trim();
    if (!t) return '<p style="' + TR + 'font-size:12pt;font-style:italic;color:#555;margin:0">'
      + '(chưa nhập)</p>';
    return t.split(/\n+/).map(function (d) {
      return '<p style="' + TR + 'font-size:12pt;margin:0 0 5pt;text-align:justify">'
        + chan(d.trim()) + '</p>';
    }).join('');
  }
  // ⚠️ App dùng chung cho nhiều trường: KHÔNG đặt giá trị dự phòng mang tên một
  //    trường cụ thể. Trống thì thấy ngay mà sửa; in nhầm tên trường khác vào
  //    văn bản đã đóng dấu thì không sửa được nữa.
  function tenTruong() {
    return (typeof CAU_HINH !== 'undefined' && CAU_HINH.TEN_TRUONG) || '';
  }
  function ngayThang() {
    const d = new Date();
    return (CAU_HINH.DIA_DANH || '') + ', ngày ' + d.getDate()
      + ' tháng ' + (d.getMonth() + 1) + ' năm ' + d.getFullYear();
  }

  function layDuLieu() {
    if (typeof window.duLieuTuDanhGia !== 'function') return null;
    const d = window.duLieuTuDanhGia();
    return (d && d.tieuChi && d.tieuChi.length) ? d : null;
  }

  /* Một đoạn văn xuôi do nhà trường nhập. Chưa nhập thì để trống có nhãn, KHÔNG
     tự viết thay: báo cáo tự đánh giá là văn bản Hiệu trưởng chịu trách nhiệm về
     tính trung thực, nên chỗ nào trường chưa nói thì phần mềm không được nói hộ. */
  function oNhap(gt, nhac) {
    const t = String(gt == null ? '' : gt).trim();
    if (t) return doan(t);
    return '<p style="' + TR + 'font-size:12pt;font-style:italic;color:#555;margin:0 0 5pt">'
      + '(' + chan(nhac || 'nhà trường bổ sung') + ')</p>';
  }

  /* Ghép mã minh chứng vào cuối một ý, đúng lối in trong Phụ lục IV mục II.2:
     ngoặc tròn, TRƯỚC dấu chấm câu. Câu nguyên trạng đã có dấu chấm nên phải
     bóc dấu chấm ra, chèn mã, rồi đặt dấu chấm lại — dán thẳng vào sau dấu chấm
     thì thành "…theo quy định. (MC.1.1.01)", lệch ví dụ của Thông tư. */
  /* Bảng tra "mã minh chứng -> đường dẫn Drive", dựng một lần cho cả bản in.
     Phụ lục IV mục I.4 khuyến khích đặt mã minh chứng dưới dạng liên kết điện
     tử tới thư mục lưu trữ. Trước đây chỉ bảng danh mục ở Phần IV có liên kết,
     còn mã nằm trong câu văn thì trơ — người thẩm định đọc tới "(MC.1.1.01)"
     phải lật ngược về cuối báo cáo dò bảng rồi mới bấm được. */
  let LINK_MC = {};
  function dungBangLink(d) {
    LINK_MC = {};
    Object.keys(d.mcTheoTC || {}).forEach(function (k) {
      (d.mcTheoTC[k] || []).forEach(function (h) {
        if (h && h.ma && h.link_drive) LINK_MC[h.ma] = h.link_drive;
      });
    });
  }

  /* Mã có link thì bọc thành liên kết bấm được; chưa gắn link Drive thì in mã
     trơn như cũ — KHÔNG bịa ra đường dẫn. */
  function maCoLink(ma) {
    const s = chan(ma);
    return LINK_MC[ma]
      ? '<a href="' + chan(LINK_MC[ma]) + '" style="color:#000;text-decoration:underline">' + s + '</a>'
      : s;
  }

  function nhetMa(cau, mcs) {
    const t = String(cau || '').trim();
    if (!mcs || !mcs.length) return chan(t);
    const ma = ' (' + mcs.map(maCoLink).join(', ') + ')';
    const m = t.match(/([.;:!?])\s*$/);
    return m ? chan(t.slice(0, m.index)) + ma + m[1] : chan(t) + ma;
  }

  /* Mô tả hiện trạng của một mức: ưu tiên bản nhập theo từng nội hàm. */
  function doanHienTrang(c, muc, d) {
    const ds = (d.noiHam || {})[c.code + '|' + muc] || [];
    const htNh = d.htNh || {};
    const coViet = ds.some(n => String((htNh[n.id] || {}).hien_trang || '').trim());
    if (!coViet) return doan(muc === 1 ? c.htM1 : c.htM2);

    return ds.map(function (n, i) {
      const r = htNh[n.id] || {};
      const t = String(r.hien_trang || '').trim();
      if (!t) {
        /* Nói rõ còn thiếu ý nào, chứ không lặng lẽ nhảy qua. Đây là "chưa mô
           tả", KHÔNG phải "không đạt" — hai điều khác nhau. */
        return '<p style="' + TR + 'font-size:12pt;font-style:italic;color:#555;'
          + 'margin:0 0 5pt;text-align:justify">Nội hàm ' + (i + 1)
          + ' (' + chan(cat(n.noi_dung, 80)) + '): chưa mô tả hiện trạng.</p>';
      }
      return '<p style="' + TR + 'font-size:12pt;margin:0 0 5pt;text-align:justify">'
        + nhetMa(t, r.ma_minh_chung || []) + '</p>';
    }).join('');
  }

  function cat(s, n) {
    s = String(s || '').trim();
    return s.length > n ? s.slice(0, n - 1) + '…' : s;
  }

  /* ĐẾM QUY MÔ TỪ DỮ LIỆU THẬT, không lấy số gõ trong cauhinh.js.
     Bản Word gửi Sở mà lệch số so với mọi màn hình khác của chính hệ thống này
     là lỗi nặng nhất của một báo cáo — và đã từng xảy ra (616 so với 636).
     Đếm không được thì trả về null để nơi in ra để trống, không đoán. */
  async function demQuyMo(namHoc) {
    const kq = { lop: null, hs: null, tong: null, cbql: null, gv: null, ht: null,
                 khac: 0, kyThuat: 0 };
    const s = window.sbClient;
    if (!s) return kq;
    try {
      const [hsl, mtk] = await Promise.all([
        s.from('hoc_sinh_lop').select('lop').eq('nam_hoc', namHoc).eq('trang_thai', 'dang_hoc'),
        /* Lấy cả cột la_ky_thuat (tệp sql/34) để LOẠI tài khoản kỹ thuật khỏi số
           lượng đội ngũ. Danh sách CBGV-NV có 39 dòng nhưng chỉ 38 người trong
           biên chế; in 39 vào báo cáo gửi Sở là khai vượt một người.
           Chưa chạy sql/34 thì cột chưa có, giá trị về undefined và mọi dòng
           đều được tính — đúng bằng cách cũ, không vỡ màn hình. */
        s.from('moi_tai_khoan').select('vai_tro, la_ky_thuat')
      ]);
      if (!hsl.error && hsl.data && hsl.data.length) {
        kq.hs = hsl.data.length;
        const lop = {};
        hsl.data.forEach(function (x) {
          const l = String(x.lop || '').trim();
          if (l) lop[l] = true;
        });
        kq.lop = Object.keys(lop).length || null;
      }
      if (!mtk.error && mtk.data && mtk.data.length) {
        const v = mtk.data.filter(function (x) { return !x.la_ky_thuat; })
          .map(function (x) { return String(x.vai_tro || ''); });
        kq.tong = v.length;
        kq.kyThuat = mtk.data.length - v.length;
        kq.cbql = v.filter(function (x) { return x === 'ban_giam_hieu'; }).length;
        kq.gv = v.filter(function (x) { return x === 'giao_vien' || x === 'to_truong'; }).length;
        kq.ht = v.filter(function (x) { return x === 'nhan_vien'; }).length;
        kq.khac = kq.tong - kq.cbql - kq.gv - kq.ht;
      }
    } catch (e) {
      console.error('[Báo cáo TĐG] Không đếm được quy mô:', e);
    }
    return kq;
  }
  function so(v) { return (v === null || v === undefined) ? '…' : String(v); }

  /* ---------------- Phần I — Tổng quan ---------------- */

  /* Mục "Thông tin chung" trước đây là sáu đoạn văn a) b) c)… — đúng nội dung
     nhưng hội đồng phải đọc hết cả đoạn mới thấy con số. Nay đưa vào bảng hai
     cột: bên trái mục, bên phải giá trị, đúng lối trình bày của Biểu 1. */
  function bangThongTin(hang) {
    let h = '<table style="width:100%;border-collapse:collapse;margin:0 0 6pt">'
      + '<colgroup><col style="width:38%"><col style="width:62%"></colgroup><tbody>';
    hang.forEach(function (r) {
      h += '<tr><td style="' + O + 'font-weight:bold">' + r[0] + '</td>'
        + '<td style="' + O + '">' + r[1] + '</td></tr>';
    });
    return h + '</tbody></table>';
  }

  function phanI(d, qm) {
    const bc = d.bc || {};
    const P = TR + 'font-size:12pt;margin:0 0 5pt;text-align:justify';
    const G = TR + 'font-size:12pt;margin:0 0 3pt;text-align:justify;padding-left:16pt';
    const MUC = TR + 'font-size:12pt;font-weight:bold;margin:8pt 0 4pt';
    const AB = TR + 'font-size:12pt;font-weight:bold;margin:6pt 0 3pt';

    /* Quy mô đếm từ bảng hoc_sinh_lop và moi_tai_khoan. Đếm ra 0 thì giữ số
       trong cauhinh.js — con số cũ dù cũ vẫn hơn con số 0 sai hẳn. */
    const bangQuyMo = '<table style="width:100%;border-collapse:collapse;margin:0 0 6pt">'
      + '<colgroup><col style="width:16%"><col style="width:20%"><col style="width:16%">'
      + '<col style="width:16%"><col style="width:16%"><col style="width:16%"></colgroup>'
      + '<thead><tr>'
      + '<td style="' + OT + '">Số lớp</td>'
      + '<td style="' + OT + '">Số học sinh</td>'
      + '<td style="' + OT + '">Tổng số CBQL, GV, NV</td>'
      + '<td style="' + OT + '">Cán bộ quản lý</td>'
      + '<td style="' + OT + '">Giáo viên</td>'
      + '<td style="' + OT + '">Nhân sự hỗ trợ giáo dục</td></tr></thead><tbody><tr>'
      + [so(qm.lop != null ? qm.lop : (CAU_HINH.SO_LOP || null)),
         so(qm.hs != null ? qm.hs : (CAU_HINH.SO_HOC_SINH || null)),
         so(qm.tong != null ? qm.tong : (CAU_HINH.SO_CBGV || null)),
         so(qm.cbql), so(qm.gv), so(qm.ht)]
          .map(function (x) { return '<td style="' + O + 'text-align:center">' + chan(x) + '</td>'; }).join('')
      + '</tr></tbody></table>'
      /* Ba nhóm cộng lại không bằng tổng thì nói ra, đừng để hội đồng tự cộng
         rồi thấy lệch mà không hiểu vì sao. Sau khi tách tài khoản kỹ thuật thì
         bình thường hai bên phải bằng nhau, còn lệch là dữ liệu có chỗ chưa xếp. */
      + (qm.khac > 0
          ? '<p style="' + TR + 'font-size:11pt;font-style:italic;margin:0 0 5pt">Trong tổng số trên có '
            + qm.khac + ' người chưa xếp vào ba nhóm — cần rà lại chức vụ và vai trò '
            + 'trong danh sách CBGV-NV.</p>'
          : '')
      /* Nói rõ đã loại tài khoản kỹ thuật, để hội đồng thẩm định đối chiếu với
         danh sách 39 dòng của nhà trường không thấy vênh mà không hiểu vì sao. */
      + (qm.kyThuat > 0
          ? '<p style="' + TR + 'font-size:11pt;font-style:italic;margin:0 0 5pt">Số liệu trên là '
            + 'người trong biên chế nhà trường; không tính ' + qm.kyThuat
            + ' tài khoản kỹ thuật dùng để quản trị hệ thống.</p>'
          : '');

    return ''
      + '<p style="' + TR + 'text-align:center;font-size:13pt;font-weight:bold;margin:16pt 0 8pt">Phần I. TỔNG QUAN</p>'

      + '<p style="' + MUC + '">1. Thông tin chung</p>'
      + bangThongTin([
          ['a) Tên cơ sở giáo dục', chan(tenTruong())],
          ['b) Địa chỉ, thông tin liên hệ', chan(CAU_HINH.DIA_CHI_TRUONG || '')
            + (CAU_HINH.DIEN_THOAI ? '<br>Điện thoại: ' + chan(CAU_HINH.DIEN_THOAI) : '')
            + (CAU_HINH.EMAIL_TRUONG ? '<br>Thư điện tử: ' + chan(CAU_HINH.EMAIL_TRUONG) : '')],
          ['c) Cơ quan quản lý trực tiếp', chan(CAU_HINH.CO_QUAN_THUONG || CAU_HINH.CO_QUAN_QUAN_LY || '')],
          ['d) Loại hình và cấp học', 'Công lập — Tiểu học'],
          ['đ) Năm thành lập', chan(String(bc.nam_thanh_lap || '').trim()
            || '(nhà trường bổ sung theo quyết định thành lập)')]
        ])
      + '<p style="' + TR + 'font-size:12pt;margin:6pt 0 3pt"><i>e) Quy mô nhà trường năm học '
      + chan(d.namHoc) + ':</i></p>'
      + bangQuyMo

      + '<p style="' + MUC + '">2. Bối cảnh và đặc điểm</p>'
      + '<p style="' + AB + '">a) Điều kiện kinh tế - xã hội địa phương</p>'
      + oNhap(bc.kt_xh, 'nhà trường bổ sung điều kiện kinh tế - xã hội của địa phương')
      + '<p style="' + AB + '">b) Thuận lợi</p>' + oNhap(bc.thuan_loi, 'nhà trường bổ sung')
      + '<p style="' + AB + '">c) Khó khăn</p>' + oNhap(bc.kho_khan, 'nhà trường bổ sung')
      + '<p style="' + AB + '">d) Đặc điểm người học</p>'
      + oNhap(bc.dac_diem_nguoi_hoc, 'nhà trường bổ sung đặc điểm học sinh')

      /* Mục 3 dưới đây là chữ IN SẴN trong Biểu 1 — bốn gạch mục đích, năm gạch
         phạm vi, ba gạch thời gian. Bản trước rút thành hai câu tự viết, nên bản
         Word thiếu hẳn phần nội dung mà mẫu đã quy định. */
      + '<p style="' + MUC + '">3. Mục đích, phạm vi, thời gian thực hiện tự đánh giá</p>'
      + '<p style="' + AB + '">a) Mục đích</p>'
      + '<p style="' + P + '">Báo cáo tự đánh giá được xây dựng nhằm:</p>'
      + ['Phân tích thực trạng chất lượng giáo dục của cơ sở giáo dục trên cơ sở các tiêu chuẩn, tiêu chí bảo đảm chất lượng;',
         'Xác định điểm mạnh, điểm hạn chế và nguyên nhân của những hạn chế trong quá trình tổ chức và thực hiện hoạt động giáo dục;',
         'Làm căn cứ để xây dựng, điều chỉnh và triển khai kế hoạch cải tiến chất lượng giáo dục theo hướng liên tục, thực chất và có minh chứng;',
         'Tăng cường năng lực tự chủ, tự chịu trách nhiệm của cơ sở giáo dục trong quản lý và bảo đảm chất lượng.']
          .map(function (x) { return '<p style="' + G + '">- ' + x + '</p>'; }).join('')
      + '<p style="' + AB + '">b) Phạm vi</p>'
      + '<p style="' + P + '">Phạm vi tự đánh giá bao gồm toàn bộ hoạt động của cơ sở giáo dục '
      + 'liên quan đến việc bảo đảm chất lượng giáo dục, cụ thể:</p>'
      + ['Các điều kiện bảo đảm chất lượng (đội ngũ, cơ sở vật chất, thiết bị, môi trường giáo dục…);',
         'Hoạt động tổ chức và thực hiện chương trình giáo dục;',
         'Hoạt động giáo dục, dạy học, trải nghiệm và hỗ trợ người học;',
         'Kết quả giáo dục và sự phát triển toàn diện của người học;',
         'Công tác quản lý, điều hành và cải tiến chất lượng của cơ sở giáo dục.']
          .map(function (x) { return '<p style="' + G + '">- ' + x + '</p>'; }).join('')
      + '<p style="' + P + '">Việc tự đánh giá được thực hiện theo từng tiêu chuẩn, tiêu chí quy định, '
      + 'bảo đảm tính hệ thống, đầy đủ và dựa trên minh chứng.</p>'
      + '<p style="' + AB + '">c) Thời gian thực hiện tự đánh giá</p>'
      + ['Tự đánh giá được thực hiện định kỳ hằng năm, gắn với chu kỳ kế hoạch năm học '
          + chan(d.namHoc) + ' của cơ sở giáo dục;',
         'Thời gian tổng hợp, hoàn thiện báo cáo tự đánh giá được thực hiện vào cuối năm học '
          + 'hoặc thời điểm phù hợp theo kế hoạch bảo đảm chất lượng của nhà trường;',
         'Kết quả tự đánh giá được cập nhật liên tục làm cơ sở cho việc xây dựng và điều chỉnh '
          + 'kế hoạch cải tiến chất lượng giáo dục của năm học tiếp theo.']
          .map(function (x) { return '<p style="' + G + '">- ' + x + '</p>'; }).join('')

      + '<p style="' + MUC + '">4. Quá trình thực hiện tự đánh giá</p>'
      + '<p style="' + AB + '">a) Lập kế hoạch tự đánh giá</p>'
      + oNhap(bc.lap_ke_hoach, 'nhà trường bổ sung: quyết định thành lập Hội đồng tự đánh giá, kế hoạch tự đánh giá')
      + '<p style="' + AB + '">b) Tổ chức thực hiện</p>'
      + oNhap(bc.to_chuc_thuc_hien, 'nhà trường bổ sung: phân công nhiệm vụ, thu thập minh chứng, rà soát hoạt động giáo dục')
      + '<p style="' + AB + '">c) Kiểm tra, phân tích</p>'
      + oNhap(bc.kiem_tra_phan_tich, 'nhà trường bổ sung: phân tích minh chứng, đối chiếu yêu cầu tiêu chí, xác định mức đạt')
      + '<p style="' + AB + '">d) Tổng hợp và xác nhận kết quả tự đánh giá</p>'
      + oNhap(bc.tong_hop_xac_nhan, 'nhà trường bổ sung');
  }

  /* ---------------- Phần II — Tự đánh giá ---------------- */
  function motTieuChi(c, d) {
    const datM1 = c.self >= 1, datM2 = c.self >= 2;
    const mc = d.mcTheoTC[c.code] || [];
    const theoNoiHam = ((d.noiHam || {})[c.code + '|1'] || []).some(function (n) {
      return String(((d.htNh || {})[n.id] || {}).hien_trang || '').trim();
    });

    /* Dòng liệt kê gộp mã minh chứng CHỈ in khi tiêu chí còn dùng lối văn xuôi
       cũ — lúc đó mã không nằm trong câu nên phải kể ra ở đâu đó. Nhập theo nội
       hàm rồi thì mã đã đứng đúng chỗ trong từng ý; in lại một dòng gộp nữa là
       trái Phụ lục IV mục I.3, mà cũng làm hội đồng tưởng có hai bộ mã. */
    const dsMa = theoNoiHam ? ''
      : (mc.length
          ? '<p style="' + TR + 'font-size:11.5pt;font-style:italic;margin:4pt 0 0">Minh chứng của tiêu chí: ('
            + mc.map(function (h) { return chan(h.ma); }).join(', ') + ')</p>'
          : '<p style="' + TR + 'font-size:11.5pt;font-style:italic;color:#555;margin:4pt 0 0">'
            + 'Tiêu chí này chưa có minh chứng trong danh mục.</p>');

    return ''
      + '<p style="' + TR + 'font-size:12pt;font-weight:bold;margin:12pt 0 4pt">Tiêu chí ' + chan(c.code)
      + '. ' + chan(c.name) + (c.bb ? ' <i>(tiêu chí bắt buộc)</i>' : '') + '</p>'
      + '<p style="' + TR + 'font-size:12pt;margin:0 0 3pt;text-align:justify"><b>Mức 1:</b> ' + chan(c.m1) + '</p>'
      + '<p style="' + TR + 'font-size:12pt;margin:0 0 3pt;text-align:justify"><b>Mức 2:</b> ' + chan(c.m2) + '</p>'
      /* Biểu 1 có ĐỦ BA dòng: Mức 1, Mức 2 và "Không đạt Mức 1". Bản trước thiếu
         hẳn dòng thứ ba nên báo cáo không đúng mẫu.
         Phụ lục II chỉ quy định nội dung của Mức 1 và Mức 2, không viết riêng nội
         dung cho "không đạt". Câu dưới đây là mệnh đề bù của Mức 1 theo điểm a
         khoản 2 Điều 5 (tiêu chí đánh giá theo 02 mức, mức xác định theo yêu cầu
         cụ thể tại phụ lục) — không phải trích nguyên văn, và không được viết
         thành trích dẫn. */
      + '<p style="' + TR + 'font-size:12pt;margin:0 0 5pt;text-align:justify"><b>Không đạt Mức 1:</b> '
      + 'Nhà trường không đáp ứng một hoặc một số yêu cầu quy định tại Mức 1.</p>'
      + '<p style="' + TR + 'font-size:12pt;font-style:italic;margin:0 0 3pt">Mô tả hiện trạng:</p>'
      + '<table style="width:100%;border-collapse:collapse">'
      + '<colgroup><col style="width:9%"><col style="width:76%"><col style="width:15%"></colgroup>'
      + '<thead><tr>'
      +   '<td style="' + OT + '">Mức</td>'
      +   '<td style="' + OT + '">Hiện trạng, kết quả đạt được của tiêu chí đến thời điểm đánh giá <i>(kèm theo mã minh chứng)</i></td>'
      +   '<td style="' + OT + '">Đánh giá <i>(Đạt/Không đạt)</i></td>'
      + '</tr></thead><tbody>'
      + '<tr>'
      +   '<td style="' + O + 'text-align:center">Mức 1</td>'
      +   '<td style="' + O + '">' + doanHienTrang(c, 1, d) + '</td>'
      +   '<td style="' + O + 'text-align:center;font-weight:bold">' + (datM1 ? 'Đạt' : 'Không đạt') + '</td>'
      + '</tr>'
      + '<tr>'
      +   '<td style="' + O + 'text-align:center">Mức 2</td>'
      +   '<td style="' + O + '">' + (datM1 ? doanHienTrang(c, 2, d)
            : '<p style="' + TR + 'font-size:12pt;font-style:italic;color:#555;margin:0">'
              + 'Chỉ xem xét Mức 2 khi Mức 1 được xác định đạt.</p>') + '</td>'
      +   '<td style="' + O + 'text-align:center;font-weight:bold">' + (datM2 ? 'Đạt' : 'Không đạt') + '</td>'
      + '</tr>'
      + '</tbody></table>'
      + dsMa
      + '<p style="' + TR + 'font-size:12pt;font-weight:bold;margin:5pt 0 0">Tự đánh giá: Tiêu chí '
      + (datM2 ? 'đạt Mức 2' : datM1 ? 'đạt Mức 1' : 'không đạt Mức 1') + '.</p>';
  }

  function danhGiaChung(soTC, d) {
    const r = d.dgtc[soTC] || {};
    const ds = d.tieuChi.filter(function (c) { return c.std === soTC; });
    let h = '<p style="' + TR + 'font-size:12pt;font-weight:bold;margin:12pt 0 5pt">Đánh giá chung về Tiêu chuẩn ' + soTC + ':</p>'
      + '<p style="' + TR + 'font-size:12pt;font-weight:bold;margin:5pt 0 2pt">1. Điểm mạnh nổi bật của Tiêu chuẩn ' + soTC + ':</p>' + doan(r.diem_manh)
      + '<p style="' + TR + 'font-size:12pt;font-weight:bold;margin:5pt 0 2pt">2. Điểm hạn chế trọng tâm của Tiêu chuẩn ' + soTC + ' và nguyên nhân cốt lõi:</p>' + doan(r.han_che_nguyen_nhan)
      + '<p style="' + TR + 'font-size:12pt;font-weight:bold;margin:5pt 0 2pt">3. Định hướng cải tiến chất lượng:</p>'
      + '<p style="' + TR + 'font-size:12pt;margin:0 0 2pt"><i>a) Phân tích chung về xu hướng chất lượng của Tiêu chuẩn ' + soTC + ' trong 03 năm học liên tiếp:</i></p>' + doan(r.xu_huong_3_nam)
      + '<p style="' + TR + 'font-size:12pt;margin:4pt 0 2pt"><i>b) Các vấn đề trọng tâm cần ưu tiên cải tiến ở Tiêu chuẩn ' + soTC + ':</i></p>' + doan(r.van_de_uu_tien)
      + '<p style="' + TR + 'font-size:12pt;font-weight:bold;margin:8pt 0 3pt">4. Tổng hợp kết quả đánh giá các tiêu chí của Tiêu chuẩn ' + soTC + ':</p>'
      + '<table style="width:100%;border-collapse:collapse">'
      + '<colgroup><col style="width:40%"><col style="width:20%"><col style="width:20%">'
      + '<col style="width:20%"></colgroup>'
      /* Ba dòng tiêu đề, đúng bảng in trong Biểu 1: cột "Không đạt" đứng riêng,
         còn "Mức 1" và "Mức 2" nằm dưới nhóm "Đạt". Gộp thành một dòng ba cột
         như bản trước thì mất chữ "Đạt" — mà đó là chữ phân biệt hai nhóm. */
      + '<thead>'
      + '<tr><td rowspan="3" style="' + OT + '">Tiêu chí</td>'
      +   '<td colspan="3" style="' + OT + '">Kết quả đánh giá tiêu chí</td></tr>'
      + '<tr><td rowspan="2" style="' + OT + '">Không đạt</td>'
      +   '<td colspan="2" style="' + OT + '">Đạt</td></tr>'
      + '<tr><td style="' + OT + '">Mức 1</td>'
      +   '<td style="' + OT + '">Mức 2</td></tr></thead><tbody>';
    ds.forEach(function (c) {
      h += '<tr><td style="' + O + '">Tiêu chí ' + chan(c.code) + '</td>'
        + '<td style="' + O + 'text-align:center">' + (c.self === 0 ? '×' : '') + '</td>'
        + '<td style="' + O + 'text-align:center">' + (c.self === 1 ? '×' : '') + '</td>'
        + '<td style="' + O + 'text-align:center">' + (c.self === 2 ? '×' : '') + '</td></tr>';
    });
    return h + '</tbody></table>';
  }

  function phanII(d) {
    let h = '<p style="' + TR + 'text-align:center;font-size:13pt;font-weight:bold;margin:18pt 0 8pt">Phần II. TỰ ĐÁNH GIÁ</p>';
    [1, 2, 3, 4].forEach(function (so) {
      const ds = d.tieuChi.filter(function (c) { return c.std === so; });
      if (!ds.length) return;
      h += '<p style="' + TR + 'font-size:12.5pt;font-weight:bold;margin:14pt 0 4pt">Tiêu chuẩn ' + so + ': '
        + chan((window.TEN_TC_BAOCAO && window.TEN_TC_BAOCAO[so]) || tenTC(so)).toUpperCase() + '</p>';
      ds.forEach(function (c) { h += motTieuChi(c, d); });
      h += danhGiaChung(so, d);
    });
    return h;
  }

  function tenTC(so) {
    return ({
      1: 'Quản trị nhà trường và bảo đảm chất lượng',
      2: 'Phát triển đội ngũ',
      3: 'Thực hiện chương trình, đổi mới phương pháp giáo dục và phát triển người học',
      4: 'Điều kiện giáo dục, môi trường an toàn và phối hợp xã hội'
    })[so] || '';
  }

  /* ---------------- Phần III — Kết luận ---------------- */
  function phanIII(d) {
    const tc = d.tieuChi;
    const ketLuan = (typeof xepMucNhaTruong === 'function') ? xepMucNhaTruong().ketLuan : '';

    let bang1 = '<table style="width:100%;border-collapse:collapse">'
      + '<colgroup><col style="width:40%"><col style="width:20%"><col style="width:20%">'
      + '<col style="width:20%"></colgroup>'
      + '<thead>'
      + '<tr><td rowspan="3" style="' + OT + '">Tiêu chuẩn, Tiêu chí</td>'
      +   '<td colspan="3" style="' + OT + '">Kết quả đánh giá tiêu chí</td></tr>'
      + '<tr><td rowspan="2" style="' + OT + '">Không đạt Mức 1</td>'
      +   '<td colspan="2" style="' + OT + '">Đạt</td></tr>'
      + '<tr><td style="' + OT + '">Mức 1</td>'
      +   '<td style="' + OT + '">Mức 2</td></tr></thead><tbody>';
    [1, 2, 3, 4].forEach(function (so) {
      bang1 += '<tr><td style="' + O + 'font-weight:bold;background:#f2f2f2">Tiêu chuẩn ' + so + '</td>'
        + '<td style="' + O + 'background:#f2f2f2"></td><td style="' + O + 'background:#f2f2f2"></td>'
        + '<td style="' + O + 'background:#f2f2f2"></td></tr>';
      tc.filter(function (c) { return c.std === so; }).forEach(function (c) {
        bang1 += '<tr><td style="' + O + '">Tiêu chí ' + chan(c.code) + '</td>'
          + '<td style="' + O + 'text-align:center">' + (c.self === 0 ? '×' : '') + '</td>'
          + '<td style="' + O + 'text-align:center">' + (c.self === 1 ? '×' : '') + '</td>'
          + '<td style="' + O + 'text-align:center">' + (c.self === 2 ? '×' : '') + '</td></tr>';
      });
    });
    const t0 = tc.filter(function (c) { return c.self === 0; }).length;
    const t1 = tc.filter(function (c) { return c.self === 1; }).length;
    const t2 = tc.filter(function (c) { return c.self === 2; }).length;
    bang1 += '<tr><td style="' + O + 'font-weight:bold;background:#e8e8e8">Cộng chung</td>'
      + '<td style="' + O + 'text-align:center;font-weight:bold;background:#e8e8e8">' + t0 + '</td>'
      + '<td style="' + O + 'text-align:center;font-weight:bold;background:#e8e8e8">' + t1 + '</td>'
      + '<td style="' + O + 'text-align:center;font-weight:bold;background:#e8e8e8">' + t2
      + '</td></tr></tbody></table>';

    function pt(a, b) { return b ? (Math.round(a / b * 1000) / 10) + '%' : '0%'; }
    /* Tám cột nhưng sáu cột cuối chỉ chứa một số hoặc một tỉ lệ, nên vẫn vừa
       khổ dọc — không phải xoay giấy chỉ vì đếm đầu cột. */
    let bang2 = '<table style="width:100%;border-collapse:collapse">'
      + '<colgroup><col style="width:26%"><col style="width:12%">'
      + '<col style="width:9%"><col style="width:11%"><col style="width:9%">'
      + '<col style="width:11%"><col style="width:9%"><col style="width:13%"></colgroup>'
      + '<thead>'
      + '<tr><td rowspan="3" style="' + OT + '">Tiêu chuẩn</td>'
      +   '<td rowspan="3" style="' + OT + '">Tổng số tiêu chí</td>'
      +   '<td colspan="6" style="' + OT + '">Tổng hợp kết quả đánh giá tiêu chí trong tiêu chuẩn</td></tr>'
      + '<tr><td colspan="2" style="' + OT + '">Không đạt</td>'
      +   '<td colspan="2" style="' + OT + '">Mức 1</td>'
      +   '<td colspan="2" style="' + OT + '">Mức 2</td></tr>'
      + '<tr>' + ['SL', '%', 'SL', '%', 'SL', '%'].map(function (x) {
          return '<td style="' + OT + 'font-style:italic">' + x + '</td>'; }).join('')
      + '</tr></thead><tbody>';
    [1, 2, 3, 4].forEach(function (so) {
      const ds = tc.filter(function (c) { return c.std === so; });
      const a0 = ds.filter(function (c) { return c.self === 0; }).length;
      const a1 = ds.filter(function (c) { return c.self === 1; }).length;
      const a2 = ds.filter(function (c) { return c.self === 2; }).length;
      bang2 += '<tr><td style="' + O + '">Tiêu chuẩn ' + so + '</td>'
        + '<td style="' + O + 'text-align:center">' + ds.length + '</td>'
        + '<td style="' + O + 'text-align:center">' + a0 + '</td><td style="' + O + 'text-align:center">' + pt(a0, ds.length) + '</td>'
        + '<td style="' + O + 'text-align:center">' + a1 + '</td><td style="' + O + 'text-align:center">' + pt(a1, ds.length) + '</td>'
        + '<td style="' + O + 'text-align:center">' + a2 + '</td><td style="' + O + 'text-align:center">' + pt(a2, ds.length) + '</td></tr>';
    });
    const oCong = O + 'text-align:center;font-weight:bold;background:#e8e8e8;';
    bang2 += '<tr><td style="' + O + 'font-weight:bold;background:#e8e8e8">Cộng chung</td>'
      + '<td style="' + oCong + '">' + tc.length + '</td>'
      + '<td style="' + oCong + '">' + t0 + '</td><td style="' + oCong + '">' + pt(t0, tc.length) + '</td>'
      + '<td style="' + oCong + '">' + t1 + '</td><td style="' + oCong + '">' + pt(t1, tc.length) + '</td>'
      + '<td style="' + oCong + '">' + t2 + '</td><td style="' + oCong + '">' + pt(t2, tc.length)
      + '</td></tr></tbody></table>';

    const bc = d.bc || {};
    const AB = TR + 'font-size:12pt;font-weight:bold;margin:6pt 0 3pt';

    return ''
      + '<p style="' + TR + 'text-align:center;font-size:13pt;font-weight:bold;margin:18pt 0 8pt">Phần III. KẾT LUẬN</p>'
      + '<p style="' + TR + 'font-size:12pt;font-weight:bold;margin:8pt 0 3pt">1. Khái quát về mức độ đáp ứng tiêu chuẩn chất lượng giáo dục của cơ sở giáo dục</p>'
      + oNhap(bc.khai_quat, 'nhà trường bổ sung nhận định khái quát về mức đáp ứng chung, '
          + 'mức độ ổn định và tính bền vững của hệ thống bảo đảm chất lượng nội bộ')
      + '<p style="' + TR + 'font-size:12pt;font-weight:bold;margin:8pt 0 3pt">2. Tổng hợp kết quả tự đánh giá</p>'
      + '<p style="' + TR + 'font-size:12pt;margin:0 0 3pt"><i>a) Bảng tổng hợp kết quả đánh giá tiêu chí</i></p>' + bang1
      + '<p style="' + TR + 'font-size:11pt;font-style:italic;margin:3pt 0 0">Đánh dấu (×) vào ô kết quả Đạt hoặc Không đạt (từ mức đạt thấp nhất đến mức đạt cao nhất của tiêu chí).</p>'
      + '<p style="' + TR + 'font-size:12pt;margin:8pt 0 3pt"><i>b) Bảng tổng hợp chung</i></p>' + bang2
      + '<p style="' + TR + 'font-size:12pt;font-weight:bold;margin:10pt 0 3pt">3. Mức đạt của cơ sở giáo dục</p>'
      + '<p style="' + TR + 'font-size:12pt;margin:0 0 5pt">Cơ sở giáo dục <b>' + chan(ketLuan) + '</b>.</p>'
      + '<p style="' + TR + 'font-size:11.5pt;font-style:italic;margin:0 0 5pt;text-align:justify">Căn cứ khoản 3 Điều 5 Thông tư số 57/2026/TT-BGDĐT: đạt Mức 1 khi tất cả tiêu chí bắt buộc đạt Mức 1 và có ít nhất 05 trong 07 tiêu chí còn lại đạt Mức 1 trở lên; đạt Mức 2 khi tất cả tiêu chí bắt buộc đạt Mức 2 và có ít nhất 05 trong 07 tiêu chí còn lại đạt Mức 2, các tiêu chí còn lại đạt tối thiểu Mức 1.</p>'
      + '<p style="' + TR + 'font-size:12pt;font-weight:bold;margin:8pt 0 3pt">4. Đề xuất, kiến nghị</p>'
      + '<p style="' + AB + '">a) Với ' + chan(CAU_HINH.CO_QUAN_THUONG || '') + '</p>'
      + oNhap(bc.kn_so, 'nhà trường bổ sung')
      + '<p style="' + AB + '">b) Với Uỷ ban nhân dân xã '
        + chan(CAU_HINH.DIA_DANH || '') + '</p>'
      + oNhap(bc.kn_ubnd, 'nhà trường bổ sung')
      /* Mục c) Biểu 1 ghi rõ "(nếu có)" nên không có thì bỏ hẳn mục, đừng in một
         dòng ba dấu chấm — văn bản gửi Sở không nên có chỗ trống vô cớ. */
      + (String(bc.kn_khac || '').trim()
          ? '<p style="' + AB + '">c) Với tổ chức, cá nhân liên quan</p>' + oNhap(bc.kn_khac)
          : '')
      + '<p style="' + TR + 'font-size:12pt;margin:8pt 0 0;text-align:justify">Hiệu trưởng chịu trách nhiệm về tính trung thực, chính xác của thông tin, số liệu và minh chứng trong báo cáo tự đánh giá./.</p>';
  }

  /* ---------------- Phần IV — Phụ lục ---------------- */
  function phanIV(d) {
    const ds = [];
    Object.keys(d.mcTheoTC).forEach(function (k) {
      d.mcTheoTC[k].forEach(function (h) {
        if (!ds.some(function (x) { return x.ma === h.ma; })) ds.push(h);
      });
    });
    ds.sort(function (a, b) { return String(a.ma).localeCompare(String(b.ma), 'vi'); });

    /* Biểu 1 quy định Phần IV gồm BỐN mục, bản trước chỉ có danh mục minh chứng.
       Mục 1 "Cơ sở dữ liệu (theo biểu mẫu đính kèm)" là một biểu mẫu riêng của
       Phụ lục V, nộp kèm chứ không in trong thân báo cáo — đúng chữ "đính kèm"
       của chính mẫu. */
    let h = '<p style="' + TR + 'text-align:center;font-size:13pt;font-weight:bold;margin:18pt 0 4pt">Phần IV. PHỤ LỤC</p>'
      + '<p style="' + TR + 'text-align:center;font-size:11.5pt;font-style:italic;margin:0 0 8pt">(Kèm theo báo cáo tự đánh giá)</p>'
      + '<p style="' + TR + 'font-size:12pt;margin:0 0 4pt">Phụ lục kèm theo báo cáo tự đánh giá gồm có:</p>'
      + '<p style="' + TR + 'font-size:12pt;margin:0 0 3pt">1. Cơ sở dữ liệu — Phần I '
        + '"Thông tin dữ liệu" (bảng số liệu 03 năm học, in ở cuối báo cáo này).</p>'
      + '<p style="' + TR + 'font-size:12pt;margin:0 0 3pt;text-align:justify">2. Các tư liệu, tài liệu liên quan: '
        + 'Quyết định thành lập Hội đồng tự đánh giá; kế hoạch tự đánh giá; các bảng biểu tổng hợp, thống kê.</p>'
      + '<p style="' + TR + 'font-size:12pt;margin:0 0 3pt">3. Danh mục minh chứng (bảng dưới đây).</p>'
      + '<p style="' + TR + 'font-size:12pt;margin:0 0 8pt">4. Văn bản, tài liệu khác có liên quan.</p>'

      + '<p style="' + TR + 'font-size:12pt;font-weight:bold;margin:10pt 0 5pt">Danh mục minh chứng</p>'
      /* Năm cột đúng bảng của Phụ lục IV mục 4. Bản trước có bốn cột, thiếu
         "Định dạng" và "Ghi chú". */
      + '<table style="width:100%;border-collapse:collapse">'
      + '<colgroup><col style="width:5%"><col style="width:15%"><col style="width:42%">'
      + '<col style="width:24%"><col style="width:14%"></colgroup>'
      + '<thead><tr><td style="' + OT + '">TT</td>'
      +   '<td style="' + OT + '">Mã minh chứng</td>'
      +   '<td style="' + OT + '">Tên minh chứng</td>'
      +   '<td style="' + OT + '">Định dạng, vị trí lưu trữ hoặc đường dẫn điện tử</td>'
      +   '<td style="' + OT + '">Ghi chú</td></tr></thead><tbody>';
    ds.forEach(function (m, i) {
      /* Phụ lục IV mục I.4 khuyến khích đặt mã dưới dạng liên kết điện tử tới
         thư mục lưu trữ. Kho hồ sơ số của trường đã có link Drive sẵn, nên chỗ
         này là lợi thế: hội đồng thẩm định bấm vào là mở đúng thư mục. */
      const vt = m.link_drive
        ? '<a href="' + chan(m.link_drive) + '">Thư mục trên hệ thống hồ sơ số</a>'
        : '<span style="color:#555;font-style:italic">Chưa gán thư mục lưu trữ</span>';
      h += '<tr><td style="' + O + 'text-align:center">' + (i + 1) + '</td>'
        + '<td style="' + O + 'font-weight:bold;text-align:center">' + chan(m.ma) + '</td>'
        + '<td style="' + O + '">' + chan(m.ten) + '</td>'
        + '<td style="' + O + 'font-size:11pt">' + vt + '</td>'
        + '<td style="' + O + 'font-size:11pt">' + chan(m.ghi_chu || '') + '</td></tr>';
    });
    if (!ds.length) {
      h += '<tr><td colspan="5" style="' + O + 'text-align:center;font-style:italic;color:#555">'
        + 'Danh mục minh chứng chưa có dữ liệu.</td></tr>';
    }
    return h + '</tbody></table>';
  }

  /* ---------------- Mục lục ---------------- */
  /* Biểu 1 có trang MỤC LỤC. Cột Trang để trống: tệp này xuất ra định dạng Word
     kiểu HTML, không có cách nào biết trước một đoạn văn rơi vào trang thứ mấy.
     Điền số bừa còn tệ hơn để trống. */
  function mucLuc(d) {
    let h = '<p style="' + TR + 'text-align:center;font-size:13pt;font-weight:bold;margin:0 0 8pt">MỤC LỤC</p>'
      + '<table style="width:100%;border-collapse:collapse">'
      + '<colgroup><col style="width:84%"><col style="width:16%"></colgroup>'
      + '<thead><tr><td style="' + OT + '">NỘI DUNG</td><td style="' + OT + '">Trang</td></tr></thead><tbody>';
    const dong = function (ten, dam, lui) {
      h += '<tr><td style="' + O + (dam ? 'font-weight:bold;' : '')
        + (lui ? 'padding-left:22pt;' : '') + '">' + ten + '</td>'
        + '<td style="' + O + '"></td></tr>';
    };
    dong('Mục lục');
    dong('Danh mục các chữ viết tắt (nếu có)');
    dong('Phần I. TỔNG QUAN', true);
    dong('Phần II. TỰ ĐÁNH GIÁ', true);
    [1, 2, 3, 4].forEach(function (so) {
      const ds = d.tieuChi.filter(function (c) { return c.std === so; });
      if (!ds.length) return;
      dong('Tiêu chuẩn ' + so + ': ' + chan(tenTC(so)), true, true);
      ds.forEach(function (c) { dong('Tiêu chí ' + chan(c.code) + '. ' + chan(c.name), false, true); });
    });
    dong('Phần III. KẾT LUẬN', true);
    dong('Phần IV. PHỤ LỤC', true);
    return h + '</tbody></table>'
      + '<p style="' + TR + 'font-size:11pt;font-style:italic;margin:5pt 0 0">'
      + 'Số trang do nhà trường điền sau khi chốt bản in.</p>'
      + '<p style="page-break-after:always">&nbsp;</p>';
  }

  /* ---------------- Ghép và tải ---------------- */
  const COT_BC = ['nam_thanh_lap', 'kt_xh', 'thuan_loi', 'kho_khan', 'dac_diem_nguoi_hoc',
                  'lap_ke_hoach', 'to_chuc_thuc_hien', 'kiem_tra_phan_tich', 'tong_hop_xac_nhan',
                  'khai_quat', 'kn_so', 'kn_ubnd'];

  async function xuatBaoCao() {
    const d = layDuLieu();
    if (!d) {
      if (typeof notify === 'function') {
        notify('Chưa có dữ liệu tự đánh giá — thầy cô đăng nhập rồi thử lại.');
      }
      return;
    }
    /* Dựng bảng tra link TRƯỚC khi ghép bất kỳ câu nào — nhetMa() đọc bảng này
       để bọc mã minh chứng thành liên kết bấm được. */
    dungBangLink(d);
    const qm = await demQuyMo(d.namHoc);

    /* Bảng số liệu 03 năm học — biểu mẫu "Cơ sở dữ liệu" đính kèm Phần IV. Do
       tệp so-lieu-tt57.js sinh, vì tệp đó giữ khai báo của biểu mẫu; để hai nơi
       tự liệt kê các dòng là có ngày lệch nhau. Tệp chưa nạp được thì báo cáo
       vẫn ra, chỉ thiếu biểu mẫu này. */
    let bangSoLieu = '';
    if (typeof window.bangSoLieuTT57Word === 'function') {
      try { bangSoLieu = await window.bangSoLieuTT57Word(d.namHoc); }
      catch (e) { console.error('[Báo cáo TĐG] Không lập được bảng số liệu:', e); }
    }

    /* Trang bìa mang đủ thể thức Nghị định 30/2020/NĐ-CP: tên cơ quan chủ quản
       và tên trường bên trái, Quốc hiệu — tiêu ngữ bên phải, dưới tiêu ngữ là
       địa danh và ngày tháng in nghiêng. Bản cũ không có Quốc hiệu nên khi in
       ra nộp Sở thì thiếu thành phần thể thức bắt buộc. */
    const bia = ''
      + '<table style="width:100%;border-collapse:collapse"><tr>'
      + '<td style="' + TR + 'width:42%;text-align:center;font-size:13pt;vertical-align:top">'
      +   chan(CAU_HINH.DON_VI_CHU_QUAN || 'UBND XÃ YÊN THÀNH')
      +   '<br><b>' + chan(tenTruong()).toUpperCase() + '</b>'
      +   '<div style="border-top:1px solid #000;width:58%;margin:2pt auto 0"></div></td>'
      + '<td style="' + TR + 'text-align:center;font-size:13pt;vertical-align:top">'
      +   '<b>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</b><br><b>Độc lập - Tự do - Hạnh phúc</b>'
      +   '<div style="border-top:1px solid #000;width:50%;margin:2pt auto 0"></div>'
      +   '<p style="' + TR + 'font-size:13pt;font-style:italic;margin:8pt 0 0">'
      +   ngayThang() + '</p></td></tr></table>'
      + '<p style="' + TR + 'text-align:center;font-size:17pt;font-weight:bold;margin:60pt 0 6pt">BÁO CÁO TỰ ĐÁNH GIÁ</p>'
      + '<p style="' + TR + 'text-align:center;font-size:13pt;font-weight:bold;margin:0 0 4pt">Năm học '
      + chan(d.namHoc) + '</p>'
      + '<p style="' + TR + 'text-align:center;font-size:11.5pt;font-style:italic;margin:6pt 0 40pt">'
      + 'Lập theo Biểu 1 Phụ lục V Thông tư số 57/2026/TT-BGDĐT ngày 07/7/2026<br>'
      + 'của Bộ trưởng Bộ Giáo dục và Đào tạo</p>'
      + '<p style="page-break-after:always">&nbsp;</p>';

    /* Bìa trong — Biểu 1 có riêng một trang này sau bìa ngoài: tên cơ quan quản
       lý và tên trường, rồi tên báo cáo, không có Quốc hiệu. */
    const biaTrong = ''
      + '<p style="' + TR + 'text-align:center;font-size:13pt;margin:24pt 0 2pt">'
      + chan(CAU_HINH.CO_QUAN_QUAN_LY || 'SỞ GIÁO DỤC VÀ ĐÀO TẠO NGHỆ AN').toUpperCase() + '</p>'
      + '<p style="' + TR + 'text-align:center;font-size:13pt;font-weight:bold;margin:0 0 60pt">'
      + chan(tenTruong()).toUpperCase() + '</p>'
      + '<p style="' + TR + 'text-align:center;font-size:17pt;font-weight:bold;margin:0 0 6pt">BÁO CÁO TỰ ĐÁNH GIÁ</p>'
      + '<p style="' + TR + 'text-align:center;font-size:13pt;font-weight:bold;margin:0 0 40pt">Năm học '
      + chan(d.namHoc) + '</p>'
      + '<p style="' + TR + 'text-align:center;font-size:13pt;font-style:italic;margin:60pt 0 0">'
      + chan(CAU_HINH.DIA_DANH || '') + ', năm ' + new Date().getFullYear() + '</p>'
      + '<p style="page-break-after:always">&nbsp;</p>';

    /* Khối chữ ký: chức vụ in hoa đậm — chừa chỗ ký và đóng dấu — họ tên đậm.
       Họ tên lấy ở cauhinh.js để khỏi mỗi tệp ghi một tên khác nhau. */
    const ht = CAU_HINH.HIEU_TRUONG || '';
    const cuoi = ''
      + '<table style="width:100%;border-collapse:collapse;margin-top:20pt"><tr>'
      + '<td style="width:52%"></td>'
      + '<td style="' + TR + 'text-align:center;font-size:13pt">'
      + '<b>HIỆU TRƯỞNG</b><br><i>(Ký tên, đóng dấu)</i><br><br><br><br>'
      + (ht ? '<b>' + chan(ht) + '</b>' : '') + '</td>'
      + '</tr></table>';

    /* A4 DỌC: đây là báo cáo văn xuôi bốn phần, bảng rộng nhất chỉ có tám cột
       mà sáu cột cuối chứa một con số hoặc một tỉ lệ — vẫn vừa bề ngang 16,5cm.
       Word cần kích thước ghi bằng centimet, chỉ ghi 'size:A4' là nó lấy khổ
       mặc định của máy in. */
    const html = '<html xmlns:o="urn:schemas-microsoft-com:office:office" '
      + 'xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">'
      + '<head><meta charset="utf-8"><title>Báo cáo tự đánh giá ' + chan(d.namHoc) + '</title>'
      + '<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom>'
      + '</w:WordDocument></xml><![endif]-->'
      + '<style>@page{size:21cm 29.7cm;margin:2cm 1.5cm 2cm 3cm}'
      + 'body{font-family:"Times New Roman",serif;font-size:13pt;line-height:1.5;color:#000}'
      + 'table{page-break-inside:auto;border-collapse:collapse}'
      /* Bảng tổng hợp tiêu chí dài hơn một trang; không có dòng này thì sang
         trang sau chỉ còn một rừng dấu × không biết thuộc cột nào. */
      + 'thead{display:table-header-group}'
      + 'tr{page-break-inside:avoid}td,th{line-height:1.3}</style>'
      /* Chữ ký của Hiệu trưởng đứng NGAY SAU Phần IV, trước biểu mẫu số liệu:
         biểu mẫu là phụ lục đính kèm, không phải phần thân báo cáo — đặt sau chữ
         ký mới đúng lối văn bản hành chính. */
      + '</head><body>' + bia + biaTrong + mucLuc(d)
      + phanI(d, qm) + phanII(d) + phanIII(d) + phanIV(d) + cuoi
      + bangSoLieu + '</body></html>';

    const blob = new Blob(['﻿' + html], { type: 'application/msword' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'bao-cao-tu-danh-gia-' + String(d.namHoc).replace(/\s/g, '') + '.doc';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 800);

    /* Nói đúng còn thiếu bao nhiêu, ở đâu — đây là kết quả của nút thầy cô vừa
       bấm, không phải lời nhắc chung. Đếm thật chứ không nhắc chung chung
       "những chỗ ghi (chưa nhập)". */
    if (typeof notify === 'function') {
      const thieu = [];
      const chuaTa = d.tieuChi.filter(function (c) {
        const coNh = ((d.noiHam || {})[c.code + '|1'] || []).some(function (n) {
          return String(((d.htNh || {})[n.id] || {}).hien_trang || '').trim();
        });
        return !coNh && !String(c.htM1 || '').trim();
      }).length;
      if (chuaTa) thieu.push(chuaTa + ' tiêu chí chưa mô tả hiện trạng Mức 1');
      const bc = d.bc || {};
      const oTrong = COT_BC.filter(function (k) { return !String(bc[k] || '').trim(); }).length;
      if (oTrong) thieu.push(oTrong + ' mục ở Phần I và Phần III chưa nhập');
      notify(thieu.length
        ? 'Đã tải Báo cáo tự đánh giá theo Biểu 1. Còn ' + thieu.join(' và ') + '.'
        : 'Đã tải Báo cáo tự đánh giá theo Biểu 1 — không còn mục nào để trống.');
    }
  }

  window.xuatBaoCaoTuDanhGia = xuatBaoCao;

  /* Gắn vào nút có sẵn trên màn hình Tự đánh giá */
  function ganNut() {
    const ds = document.querySelectorAll('#kd-thanh button');
    for (let i = 0; i < ds.length; i++) {
      if (ds[i].textContent.indexOf('Xuất báo cáo tự đánh giá') >= 0) {
        ds[i].removeAttribute('onclick');
        ds[i].addEventListener('click', xuatBaoCao);
        ds[i].title = 'Kết xuất Word theo Biểu 1 Phụ lục V Thông tư 57';
      }
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ganNut);
  } else {
    ganNut();
  }
})();
