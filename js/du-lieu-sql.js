// ============================================================
// du-lieu-sql.js — nạp dữ liệu THẬT từ Supabase, ghi đè dữ liệu mẫu
// Chỉ chạy khi đã nối CSDL (DA_NOI) và người dùng đăng nhập hoạt động.
// supabase-ket-noi.js gọi window.napDuLieuThat() sau khi xác thực xong.
// ============================================================
(function () {
  'use strict';

  function thoat(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // 🔴 `admin` LÀ QUYỀN KỸ THUẬT, KHÔNG PHẢI CHỨC VỤ.
  //    Bản trước xếp thẳng mọi admin vào nhóm "Ban giám hiệu — Quản trị",
  //    nên một cô GIÁO VIÊN được cấp quyền quản trị hệ thống lại hiện trong
  //    Ban giám hiệu — sai với thực tế nhà trường, và ai nhìn danh bạ cũng
  //    tưởng cô ấy là cán bộ quản lý. Thầy Chung yêu cầu sửa 10/9/2026.
  //    Nay admin được xếp theo CHỨC VỤ nhà trường ghi; chỉ ai chức vụ thật
  //    là hiệu trưởng / phó hiệu trưởng mới vào Ban giám hiệu.
  //    Người KHÔNG phải admin thì giữ nguyên vai trò như cũ — không đụng.
  function boDau(s) {
    return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
  }
  var CV_NHAN_VIEN = /^(nhan vien|ke toan|van thu|thu vien|thiet bi|y te|bao ve|phuc vu)\b/;
  function nhomCua(m) {
    // Tổ trưởng Tổ Văn phòng là NHÂN VIÊN (kế toán, văn thư…) mang vai tổ
    // trưởng để duyệt việc của tổ — xếp theo chức vụ, quyền giữ nguyên.
    if (m.vai_tro === 'to_truong' && CV_NHAN_VIEN.test(boDau(m.chuc_vu))) return 'nhan_vien';
    if (m.vai_tro !== 'admin') return m.vai_tro;
    var cv = boDau(m.chuc_vu);
    // 🔑 CHƯA KHAI CHỨC VỤ THÌ GIỮ NGUYÊN NHƯ CŨ (Ban giám hiệu).
    //    Kho mã này dùng chung cho mọi trường. Trường nào có hiệu trưởng
    //    mang quyền admin mà ô chức vụ còn trống, đoán bừa là đẩy chính
    //    người đứng đầu trường xuống nhóm Giáo viên — hỏng nặng hơn nhiều
    //    so với việc để nguyên. Trống nghĩa là KHÔNG BIẾT, không phải
    //    "không phải Ban giám hiệu"; muốn xếp đúng thì khai chức vụ ở
    //    Quản trị → Tài khoản.
    if (!cv.trim()) return 'ban_giam_hieu';
    // Không neo đầu chuỗi ở đây: "Phó Hiệu trưởng" có chữ cần tìm ở GIỮA.
    if (/hieu truong|giam hieu/.test(cv)) return 'ban_giam_hieu';
    // 🔴 CHỈ NHÌN PHẦN ĐẦU CHUỖI, KHÔNG TÌM TỪ KHOÁ Ở BẤT KỲ ĐÂU.
    //    Chức vụ tiếng Việt ghi VIỆC CHÍNH TRƯỚC, việc kiêm nhiệm ghi sau:
    //    "Giáo viên kiêm thư viện", "Kế toán kiêm văn thư". Bản đầu tìm từ
    //    khoá ở bất kỳ đâu nên "Giáo viên kiêm thư viện" trúng chữ
    //    "thư viện" và bị xếp vào Nhân viên — đúng cái lỗi bản vá này sinh
    //    ra để chữa, chỉ đổi chiều. Ở trường tiểu học một người kiêm nhiều
    //    việc là chuyện thường, nên đây không phải ca hiếm.
    if (/^(gv|giao vien|to truong)\b/.test(cv)) return 'giao_vien';
    // Nhân viên: kể ra từng chức danh thay vì đoán, để người sau đọc là biết
    // ai rơi vào đâu.
    if (CV_NHAN_VIEN.test(cv)) {
      return 'nhan_vien';
    }
    // Chức vụ lạ thì về Giáo viên — nhóm đông nhất, và ở trường tiểu học
    // người được giao quản trị hệ thống thường là giáo viên.
    return 'giao_vien';
  }

  // Dùng chung cho bản Word báo cáo TĐG (xuat-bao-cao-tdg.js): màn hình và bản
  // Word PHẢI đếm theo cùng một luật, lệch nhau là báo cáo gửi Sở sai số.
  window.nhomCBGV = nhomCua;

  // Giữ lại mô tả + người phụ trách của các hộp từ dữ liệu mẫu
  // (CSDL bảng nhom_con không có 2 cột này — phần chữ tĩnh của giao diện)
  var HOP_MAU = {};
  Object.keys(window.HOP || {}).forEach(function (ma) {
    HOP_MAU[ma] = { moTa: window.HOP[ma].moTa || '', phuTrach: window.HOP[ma].phuTrach || '' };
  });

  var daNap = false;
  var DANG_CHAY = null;   // lời hứa của lượt nạp đang chạy dở (nếu có)

  // ══════════════════════════════════════════════════════════
  // QUY MÔ TRƯỜNG — số ĐẾM ĐƯỢC thắng số khai bằng tay
  //
  // Dải số liệu đầu trang trước đây chỉ đọc cau_hinh.so_lop / so_hoc_sinh, là
  // hai ô ADMIN TỰ GÕ ở màn Quản trị. Trường nào chưa gõ thì đầu trang trơ hai
  // dấu gạch — mà ngay bên dưới, thẻ Điều hành đã hiện "506 học sinh toàn
  // trường" đếm thật từ danh sách lớp. Cùng một trang, hai câu trả lời khác
  // nhau, và câu sai lại nằm ở chỗ dễ nhìn nhất (thầy Chung bắt được ở Châu
  // Đình 23/8/2026).
  //
  // Nay mọi màn hỏi qua hàm này. Đếm được thì lấy số đếm: danh sách học sinh
  // tăng giảm trong năm là đầu trang tự đúng theo, không ai phải nhớ vào sửa
  // cấu hình. Hai ô trong cau_hinh lùi về đúng vai DỰ PHÒNG cho trường chưa
  // nạp danh sách — lời chỉ dẫn ở màn Quản trị vốn đã hứa như vậy rồi.
  // ══════════════════════════════════════════════════════════
  window.quyMoTruong = function () {
    var qm = window.QUY_MO_THAT || {}, C = window.CAU_HINH || {};
    return {
      lop:  qm.lop  || C.SO_LOP      || 0,
      hs:   qm.hs   || C.SO_HOC_SINH || 0,
      khoi: qm.khoi || 0,             // 0 = chưa biết, ĐỪNG đoán bừa là 5 khối
      nam:  qm.nam  || C.NAM_HOC     || '',
      dem:  !!(qm.lop || qm.hs)       // true = số đếm thật, không phải số khai tay
    };
  };

  // Chạy RỜI, sau khi kho hồ sơ đã vẽ xong — hai câu đọc này KHÔNG được nằm
  // trong Promise.all chính, vì cổng vào chờ Promise.all ấy mới mở khoá trang.
  function demQuyMoThat(may) {
    // Bảng lop_hoc nhỏ (mỗi năm vài chục dòng) nên đọc trọn, không cần phân trang.
    return may.from('lop_hoc').select('lop, khoi, nam_hoc').then(function (r) {
      if (r.error || !r.data || !r.data.length) return;   // RLS chặn / chưa xếp lớp → im lặng
      var ds = r.data, namCo = {};
      ds.forEach(function (l) { if (l.nam_hoc) namCo[l.nam_hoc] = 1; });
      // Ưu tiên năm hiện hành; đầu tháng 9 chưa xếp lớp năm mới thì lùi về năm
      // CÓ dữ liệu — đúng cách dieu-hanh.js và hocsinh.js đang chọn, để ba màn
      // không nói ba con số của ba năm khác nhau.
      var hienHanh = window.CAU_HINH.NAM_HOC;
      var nam = namCo[hienHanh] ? hienHanh
        : (Object.keys(namCo).sort().reverse()[0] || hienHanh);

      var lop = {}, khoi = {};
      ds.forEach(function (l) {
        if (l.nam_hoc !== nam || !l.lop) return;
        lop[l.lop] = 1;
        if (l.khoi !== null && l.khoi !== undefined && l.khoi !== '') khoi[l.khoi] = 1;
      });
      var qm = window.QUY_MO_THAT = window.QUY_MO_THAT || {};
      qm.nam = nam;
      qm.lop = Object.keys(lop).length || null;
      qm.khoi = Object.keys(khoi).length || null;
      try { window.veThongKe && window.veThongKe(); } catch (e) {}

      // Sĩ số đếm bằng head:true — máy chủ trả về ĐÚNG MỘT CON SỐ, không kéo
      // về 500-800 dòng học sinh chỉ để lấy độ dài mảng (và cũng khỏi vướng
      // trần 1000 dòng của PostgREST). Dòng chưa ghi trạng thái vẫn tính là
      // đang học — đúng quy ước của hocsinh.js và dieu-hanh.js.
      return may.from('hoc_sinh_lop').select('*', { count: 'exact', head: true })
        .eq('nam_hoc', nam).or('trang_thai.is.null,trang_thai.eq.dang_hoc')
        .then(function (h) {
          if (h.error || h.count === null || h.count === undefined) return;
          qm.hs = h.count || null;
          try { window.veThongKe && window.veThongKe(); } catch (e) {}
        });
    }).catch(function (e) {
      // Quy mô là số PHỤ: hỏng thì đầu trang lùi về số khai tay, không việc gì
      // phải dựng băng đỏ hay chặn trang vì nó.
      console.warn('[Quy mô] Không đếm được từ danh sách lớp:', e);
    });
  }

  // ══════════ ÁP DỮ LIỆU CHUNG LÊN TRANG ══════════
  // tho = [cau_hinh, nhom_ho_so, nhom_con, ho_so, tieu_chi, nguoi_dung] — đúng
  // thứ tự sáu câu hỏi của napDuLieuThat. Tách riêng (29/9/2026) để lúc VÀO
  // NHANH áp được bản lưu trên máy (window.apDuLieuMay) rồi mới hỏi máy chủ.
  var THO_DA_AP = '';
  function apDuLieu(tho) {
    var cauHinh = tho[0] || [], boPhan = tho[1] || [], nhomCon = tho[2] || [],
        hoSo = tho[3] || [], tieuChi = tho[4] || [], taiKhoan = tho[5] || [];

    // Danh sách tài khoản hoạt động — cho ô "giao quyền sửa" trong hoso-sua.js
    window.DS_TAI_KHOAN = taiKhoan || [];

    // 1. Cấu hình trường
    var ch = {};
    cauHinh.forEach(function (d) { ch[d.khoa] = d.gia_tri; });
    if (ch.ten_truong) window.CAU_HINH.TEN_TRUONG = ch.ten_truong;
    if (ch.slogan) window.CAU_HINH.SLOGAN = ch.slogan;
    // Năm học: mặc định TỰ TÍNH theo mốc trong CSDL (01/08).
    // Chỉ khi quản trị đặt nam_hoc_tu_dong = 'khong' thì mới lấy giá trị
    // ghi cứng ở cột nam_hoc — để phòng trường hợp Sở lùi/đẩy năm học.
    if (ch.moc_doi_nam_hoc) window.CAU_HINH.MOC_DOI_NAM_HOC = ch.moc_doi_nam_hoc;
    if (ch.nam_hoc_tu_dong === 'khong' && ch.nam_hoc) {
      window.CAU_HINH.NAM_HOC = ch.nam_hoc;
    } else {
      window.CAU_HINH.NAM_HOC = window.tinhNamHoc(window.CAU_HINH.MOC_DOI_NAM_HOC);
    }
    if (ch.hieu_truong) window.CAU_HINH.HIEU_TRUONG = ch.hieu_truong;
    if (ch.don_vi_chu_quan) window.CAU_HINH.DON_VI_CHU_QUAN = ch.don_vi_chu_quan;
    if (ch.muc_tieu_chuan_qg) window.CAU_HINH.MUC_TIEU_CHUAN_QG = ch.muc_tieu_chuan_qg;
    // Bảy khoá dưới đây trước bị BỎ QUÊN: có trong bảng cau_hinh nhưng không
    // ai đọc, nên sửa trên CSDL không có tác dụng gì. Vá 17/8/2026.
    // ⚠️ ch.dia_chi là ĐỊA CHỈ TRƯỜNG, còn CAU_HINH.DIA_CHI là địa chỉ
    //    Supabase — trùng tên, gán nhầm là mất kết nối CSDL.
    if (ch.co_quan_quan_ly) window.CAU_HINH.CO_QUAN_QUAN_LY = ch.co_quan_quan_ly;
    if (ch.chu_quan_thuong) window.CAU_HINH.CHU_QUAN_THUONG = ch.chu_quan_thuong;
    if (ch.co_quan_thuong) window.CAU_HINH.CO_QUAN_THUONG = ch.co_quan_thuong;
    if (ch.dia_chi) window.CAU_HINH.DIA_CHI_TRUONG = ch.dia_chi;
    if (ch.dia_danh) window.CAU_HINH.DIA_DANH = ch.dia_danh;
    if (ch.pho_hieu_truong) window.CAU_HINH.PHO_HIEU_TRUONG = ch.pho_hieu_truong;
    if (ch.dien_thoai) window.CAU_HINH.DIEN_THOAI = ch.dien_thoai;
    if (ch.email_truong) window.CAU_HINH.EMAIL_TRUONG = ch.email_truong;
    if (ch.so_cbgv) window.CAU_HINH.SO_CBGV = parseInt(ch.so_cbgv, 10);
    if (ch.muc_chuan_qg) window.CAU_HINH.MUC_CHUAN_QG = ch.muc_chuan_qg;
    // Tổ chức đảng: chi_bo | dang_bo | khong. Giá trị lạ (gõ tay vào bảng
    // cau_hinh) thì BỎ QUA chứ không nhận — window.tuNguDang() sẽ lùi về
    // chi_bo, còn nhận vào đây thì màn Quản trị hiện một ô chọn rỗng.
    if (ch.to_chuc_dang && ['chi_bo','dang_bo','khong'].indexOf(ch.to_chuc_dang) >= 0) {
      window.CAU_HINH.TO_CHUC_DANG = ch.to_chuc_dang;
    }
    if (ch.so_dang_vien) window.CAU_HINH.SO_DANG_VIEN = parseInt(ch.so_dang_vien, 10) || 0;
    // URL dịch vụ đếm tệp Drive (sql/07 + quan-tri/kiem-tra-tep-drive.gs)
    // cho nút "🔄 Kiểm tra ngay". Gán không điều kiện: trường xoá URL trong
    // cau_hinh thì nút phải lùi về đếm theo trạng thái, không dùng URL cũ.
    window.CAU_HINH.LINK_KIEM_TRA_DRIVE = ch.link_kiem_tra_drive || '';
    // Quy mô trường: CSDL là nguồn duy nhất, số trong cauhinh.js chỉ là dự
    // phòng cho lúc chưa đăng nhập. Đổi quy mô thì sửa bảng cau_hinh, không
    // sửa mã — tránh mỗi nơi một con số.
    if (ch.so_lop) window.CAU_HINH.SO_LOP = parseInt(ch.so_lop, 10);
    if (ch.so_hoc_sinh) window.CAU_HINH.SO_HOC_SINH = parseInt(ch.so_hoc_sinh, 10);
    // Điền lại tên trường, địa chỉ, logo, tiêu đề tab… theo CẤU HÌNH TRÊN CSDL
    // (nguồn chuẩn), đè lên bản dự phòng trong js/cauhinh.js.
    if (typeof window.datNhanDienTruong === 'function') window.datNhanDienTruong();
    var oSlogan = document.getElementById('dien-slogan');
    if (oSlogan) oSlogan.textContent = window.CAU_HINH.SLOGAN;
    var oNamHoc = document.getElementById('dien-nam-hoc');
    if (oNamHoc) oNamHoc.textContent = window.CAU_HINH.NAM_HOC;

    // 2. Danh mục hồ sơ 3 tầng
    var maHop = {}; // id nhom_con -> 'H01'
    var HOP = {};
    nhomCon.forEach(function (nc) {
      maHop[nc.id] = nc.ma;
      var mau = HOP_MAU[nc.ma] || {};
      HOP[nc.ma] = {
        ten: nc.ten.replace(/^Hộp\s*\d+\s*·\s*/, ''),
        moTa: mau.moTa || '',
        phuTrach: mau.phuTrach || ''
      };
    });
    window.BO_PHAN = boPhan.map(function (bp) {
      return {
        soTT: bp.so_tt, ten: bp.ten, icon: bp.bieu_tuong || '🗂',
        hop: nhomCon.filter(function (nc) { return nc.nhom_id === bp.id; }).map(function (nc) { return nc.ma; })
      };
    });
    window.HOP = HOP;
    window.HS_BAN_GHI = {}; // ma -> bản ghi đầy đủ trong CSDL (cho ô sửa)
    window.HO_SO = hoSo.map(function (h) {
      window.HS_BAN_GHI[h.ma] = h;
      return {
        hop: maHop[h.nhom_con_id], ma: h.ma, maCu: h.ma_cu || '', ten: h.ten,
        tc: h.tieu_chi || [], tt: h.trang_thai, link: h.link_drive || '',
        phuTrach: h.nguoi_phu_trach || ''
      };
    });

    // 3. Tiêu chí TT57 (tên + bắt buộc + nguyên văn 2 mức từ CSDL)
    if (tieuChi.length) {
      window.TIEU_CHI = tieuChi.map(function (t) {
        return { ma: t.ma, ten: t.ten, batBuoc: !!t.bat_buoc, m1: t.muc_1 || '', m2: t.muc_2 || '' };
      });
    }

    window.veTatCa && window.veTatCa();
    window.khoiDongTCQG && window.khoiDongTCQG();
  }
  function baoChuaCapNhat(m) {
    window.baoTrangThai && window.baoTrangThai('loi',
      '⚠️ Chưa cập nhật được dữ liệu mới từ máy chủ: ' + thoat(m) +
      '. Số liệu đang hiện là bản đã lưu trước đó — thầy cô kiểm tra mạng rồi tải lại trang.');
  }
  window.apDuLieuMay = function (tho) {
    apDuLieu(tho);
    THO_DA_AP = JSON.stringify(tho);
  };

  window.napDuLieuThat = function () {
    if (daNap || !window.MAY_CHU) return;
    daNap = true;
    var may = window.MAY_CHU;

    // TRẢ VỀ promise: cổng vào chờ nạp xong mới mở khóa trang, nhờ vậy thầy cô
    // không thấy số liệu mẫu loé lên rồi mới nhảy sang số thật.
    // Bọc thuLaiSQL: đúng lúc vừa đăng nhập xong, vé có thể bị máy dữ liệu chê
    // "ký ở tương lai" vì hai máy chủ lệch đồng hồ vài giây (xem khối chú thích
    // ở js/supabase-ket-noi.js). Không thử lại thì cả kho hồ sơ bị xoá trắng và
    // băng đỏ hiện lên, trong khi chỉ cần chờ vài giây là đọc được.
    // Tệp này nạp TRƯỚC supabase-ket-noi.js nhưng hàm chỉ chạy khi được gọi,
    // lúc đó window.thuLaiSQL đã có; vẫn để đường lùi cho chắc.
    var thuLai = window.thuLaiSQL || function (goi) { return goi(); };
    var daBaoCho = false;
    var loiHua = thuLai(function () {
      return Promise.all([
      may.from('cau_hinh').select('khoa,gia_tri'),
      may.from('nhom_ho_so').select('id,so_tt,ten,mo_ta,bieu_tuong').order('so_tt'),
      may.from('nhom_con').select('id,ma,ten,so_tt,nhom_id').order('so_tt'),
      may.from('ho_so').select('*').order('so_tt'),
      may.from('tieu_chi').select('ma,ten,bat_buoc,muc_1,muc_2').order('ma'),
      may.from('nguoi_dung').select('id,ho_ten,email,chuc_vu,vai_tro').eq('trang_thai', 'hoat_dong').order('ho_ten')
      ]);
    }, function (lan) {
      daBaoCho = true;
      window.baoTrangThai && window.baoTrangThai('cho',
        '⏳ Máy chủ chưa sẵn sàng, đang tự thử lại lần ' + lan + '…');
    }).then(function (kq) {
      var loi = kq.filter(function (r) { return r.error; });
      // Gỡ băng chờ do chính mình treo lên. Không gỡ thì thử lại thành công rồi
      // mà dòng "đang tự thử lại lần 3…" vẫn nằm nguyên dưới đầu trang cả buổi.
      if (daBaoCho && !loi.length) { daBaoCho = false; window.baoTrangThai && window.baoTrangThai(null); }
      if (loi.length) {
        console.error('Lỗi nạp dữ liệu:', loi[0].error);
        // Trang đang hiện dữ liệu THẬT của trường (bản lưu trên máy lúc vào
        // nhanh, hoặc lượt nạp trước) → giữ nguyên, chỉ báo là chưa cập nhật.
        if (THO_DA_AP) { daNap = false; baoChuaCapNhat(loi[0].error.message); return; }
        window.baoTrangThai && window.baoTrangThai('loi',
          '⚠️ KHÔNG ĐỌC ĐƯỢC DỮ LIỆU CỦA NHÀ TRƯỜNG: ' + thoat(loi[0].error.message) +
          ' — <b>những con số đang hiện KHÔNG phải của trường</b>. Thầy cô tải lại trang.');
        daNap = false;

        // 🔴 PHẢI DỌN SẠCH DỮ LIỆU MẪU. Trước đây chỉ hiện băng đỏ rồi return —
        //    nhưng app.js đã vẽ 94 hồ sơ MẪU từ lúc mở trang, và vì DA_NOI=true
        //    nên băng vàng "CHẾ ĐỘ XEM THỬ" cũng bị ẩn đi. Kết quả: đọc lỗi mà
        //    màn hình hiện một trang đầy đủ, đẹp đẽ, thống kê "Đã có 62%" —
        //    toàn bộ là số của một trường KHÔNG CÓ THẬT.
        //    Hiệu trưởng chụp màn hình đó gửi nhóm báo cáo tiến độ là xong.
        //    Trống thì nguy hiểm, nhưng GIẢ MÀ TRÔNG THẬT thì nguy hiểm hơn.
        //    Kiểu dữ liệu phải giữ ĐÚNG như lúc app.js đang dùng: BO_PHAN/HO_SO/
        //    TIEU_CHI/DS_TAI_KHOAN là MẢNG, HOP/HS_BAN_GHI là ĐỐI TƯỢNG.
        //    Đặt sai kiểu là veTatCa() ném lỗi, băng đỏ còn nhưng số mẫu vẫn nằm đó.
        window.BO_PHAN = []; window.HO_SO = []; window.TIEU_CHI = [];
        window.DS_TAI_KHOAN = []; window.HOP = {}; window.HS_BAN_GHI = {};
        try { window.veTatCa && window.veTatCa(); } catch (e) { /* vẽ lỗi thì thôi, băng đỏ vẫn còn */ }
        return;
      }
      var tho = kq.map(function (r) { return r.data; });
      var chuoi = JSON.stringify(tho);
      // Vào nhanh (js/supabase-ket-noi.js) đã vẽ đúng bản này từ kho trên máy
      // thì thôi, khỏi vẽ lại cả trang; khác thì vẽ bản mới.
      if (chuoi !== THO_DA_AP) apDuLieu(tho);
      THO_DA_AP = chuoi;
      if (window.KHO_MAY && window.NGUOI_DUNG) window.KHO_MAY.ghi(window.NGUOI_DUNG.id + '|vao|du-lieu', tho);
      napCBGV(may);
      demQuyMoThat(may);
    }, function (e) {
      // Lời hứa bị TỪ CHỐI (đứt mạng, thử lại hết lượt) chứ không trả về
      // {error} — nhánh lỗi ở trên không chạy. Không có chỗ này thì trang mở ra
      // với 94 hồ sơ MẪU của một trường không có thật, mà không một lời cảnh báo.
      console.error('Lỗi nạp dữ liệu:', e);
      if (THO_DA_AP) { daNap = false; baoChuaCapNhat((e && e.message) || e); return; }
      window.baoTrangThai && window.baoTrangThai('loi',
        '⚠️ KHÔNG GỌI ĐƯỢC MÁY CHỦ: ' + thoat((e && e.message) || e) +
        ' — <b>những con số đang hiện KHÔNG phải của trường</b>. Thầy cô kiểm tra ' +
        'đường mạng rồi tải lại trang.');
      daNap = false;
      window.BO_PHAN = []; window.HO_SO = []; window.TIEU_CHI = [];
      window.DS_TAI_KHOAN = []; window.HOP = {}; window.HS_BAN_GHI = {};
      try { window.veTatCa && window.veTatCa(); } catch (e2) { /* băng đỏ vẫn còn */ }
    });
    DANG_CHAY = loiHua.then(function () { DANG_CHAY = null; }, function () { DANG_CHAY = null; });
    return loiHua;
  };

  // NẠP LẠI SAU KHI MÁY CHỦ ĐỔI DANH MỤC HÀNG LOẠT (chuyển mô hình đảng, sinh
  // chi bộ theo điểm trường…). Cờ daNap chặn napDuLieuThat chạy lần hai — đúng
  // cho lúc đăng nhập, nhưng nghĩa là mọi thẻ Quản trị gọi hàm RPC đổi tên hộp
  // xong thì kho hồ sơ trên màn vẫn là bản cũ cho tới khi tải lại trang
  // (link-cbgv.js đã phải dặn "Ctrl+F5"). Hàm này hạ cờ rồi nạp lại trọn bộ:
  // cấu hình, bộ phận, hộp, hồ sơ, tiêu chí, danh bạ — đúng những gì một lần
  // tải lại trang làm, nhưng không mất chỗ đang đứng.
  // Đang có lượt nạp chạy dở thì trả về chính lượt đó, không mở lượt thứ hai
  // chạy song song rồi hai lượt thay nhau ghi đè window.HO_SO.
  // ⚠️ Đang có lượt chạy dở thì KHÔNG trả về chính lượt đó: lượt ấy có thể đã
  // gửi truy vấn từ TRƯỚC khi RPC đổi danh mục xong — nơi gọi nhận nó về, coi
  // như "đã nạp lại" mà dữ liệu là bản trước RPC, tên hộp trên màn vẫn cũ và
  // không ai nạp nữa. Nối một lượt MỚI chạy sau khi lượt cũ về; các lần gọi
  // trong lúc chờ dùng chung lượt nối ấy, không đẻ thêm.
  var CHO_NAP_LAI = null;
  window.napLaiDuLieuThat = function () {
    if (DANG_CHAY) {
      if (!CHO_NAP_LAI) {
        CHO_NAP_LAI = DANG_CHAY.then(function () {
          CHO_NAP_LAI = null;
          if (!window.MAY_CHU) return;
          daNap = false;
          return window.napDuLieuThat() || Promise.resolve();
        });
      }
      return CHO_NAP_LAI;
    }
    if (!window.MAY_CHU) return Promise.resolve();
    daNap = false;
    return window.napDuLieuThat() || Promise.resolve();
  };

  // Chữ tắt trên huy hiệu: chữ đầu của HỌ + chữ đầu của TÊN — "Nguyễn Phúc Lộc"
  // ra "NL", đúng kiểu thẻ của Bạch Liêu. Tên một chữ thì lấy đúng chữ đó.
  function chuTat(hoTen) {
    var tu = String(hoTen || '').trim().split(/\s+/).filter(Boolean);
    if (!tu.length) return '?';
    if (tu.length === 1) return tu[0].charAt(0).toUpperCase();
    return (tu[0].charAt(0) + tu[tu.length - 1].charAt(0)).toUpperCase();
  }

  // ── Danh bạ CBGV-NV (màn Hồ sơ CBGV) ──
  // Cột `email_chinh` chỉ có ở trường đã chạy sql/55. Hỏi một cột không tồn tại
  // là PostgREST trả lỗi cho CẢ câu → màn hình rỗng trơn, không báo gì (nhánh
  // `kq[0].error` dưới kia im lặng vì RLS). Nên hỏi lần hai bỏ cột đó ra, thay
  // vì bắt mọi trường phải chạy di trú TRƯỚC khi đẩy bản web mới.
  var COT_MOI = 'email,ho_ten,chuc_vu,to_chuyen_mon,vai_tro,link_drive,la_ky_thuat';
  function docDanhSachMoi(may) {
    function thu(cot) {
      return may.from('moi_tai_khoan').select(cot).order('ho_ten');
    }
    // PostgREST hỏi một cột không tồn tại là hỏng CẢ câu, nên phải lùi dần.
    // 🔴 LÙI TỪNG CỘT MỘT, KHÔNG BỎ CẢ HAI CÙNG LÚC. Hiện trạng hay gặp nhất
    //    là trường CÓ co_so_ma (sql/10, gần như trường nào cũng có) mà THIẾU
    //    email_chinh (sql/55, mới hơn). Bỏ một lượt cả hai thì trường ấy mất
    //    luôn ô lọc cơ sở — mà đó lại đúng là nhóm trường sáp nhập nhiều điểm,
    //    tức là mất tính năng ở chính nơi cần nó nhất, lặng lẽ, không báo gì.
    return thu(COT_MOI + ',email_chinh,co_so_ma')
      .then(function (r) { return r.error ? thu(COT_MOI + ',co_so_ma')   : r; })
      .then(function (r) { return r.error ? thu(COT_MOI + ',email_chinh') : r; })
      .then(function (r) { return r.error ? thu(COT_MOI)                  : r; });
  }

  // ── Nhóm hiển thị của danh bạ (30/9/2026, thầy Chung — sổ dự án 109) ──
  //  Các cô báo "sắp xếp như thế này khó tìm tên mình" (83 giáo viên một khối
  //  phẳng xếp theo họ). Thầy chốt: Ban Giám hiệu · Giáo viên lớp 1 … lớp 5 ·
  //  Giáo viên Tiếng Anh · Giáo viên khác (Thể dục, Mĩ thuật, Âm nhạc, Tin học,
  //  giáo viên không chủ nhiệm) · Nhân viên.
  //  Khối lấy từ LỚP CHỦ NHIỆM trong phân công (phan_cong_day.la_chu_nhiem).
  //  Trường chưa nạp phân công chủ nhiệm nào → đoán theo tổ khi tổ chỉ mang MỘT
  //  số ("Tổ chuyên môn 1"); tổ ghép "2, 3" thì không đoán, vào Giáo viên khác.
  var NHOM_CBGV = [
    { ma: 'bgh', icon: '🏛', ten: 'Ban Giám hiệu' },
    { ma: 'k1', icon: '1️⃣', ten: 'Giáo viên lớp 1' },
    { ma: 'k2', icon: '2️⃣', ten: 'Giáo viên lớp 2' },
    { ma: 'k3', icon: '3️⃣', ten: 'Giáo viên lớp 3' },
    { ma: 'k4', icon: '4️⃣', ten: 'Giáo viên lớp 4' },
    { ma: 'k5', icon: '5️⃣', ten: 'Giáo viên lớp 5' },
    { ma: 'ta', icon: '🔤', ten: 'Giáo viên Tiếng Anh' },
    { ma: 'khac', icon: '🎨', ten: 'Giáo viên khác', phu: 'Thể dục, Mĩ thuật, Âm nhạc, Tin học, giáo viên không chủ nhiệm' },
    { ma: 'nv', icon: '🗄', ten: 'Nhân viên' }
  ];
  // Xếp theo TÊN rồi mới đến họ, như danh sách lớp — tìm "Hoa" thì nhìn ở vần H
  function sapTheoTen(a, b) {
    var ta = String(a.ho_ten || '').trim().split(/\s+/), tb = String(b.ho_ten || '').trim().split(/\s+/);
    return String(ta[ta.length - 1] || '').localeCompare(tb[tb.length - 1] || '', 'vi') ||
      String(a.ho_ten || '').localeCompare(String(b.ho_ten || ''), 'vi');
  }
  // p = người đã gộp (co: nhom cơ bản, emails, chuc_vu, to_chuyen_mon); pc = { khoi, ta } theo email
  function nhomChiTiet(p, pc, coPhanCongCN) {
    if (p.coBan === 'ban_giam_hieu') return 'bgh';
    if (p.coBan === 'nhan_vien') return 'nv';
    var khoi = 0, ta = false;
    p.emails.forEach(function (e) {
      var x = pc[String(e || '').toLowerCase()];
      if (!x) return;
      if (x.khoi && (!khoi || x.khoi < khoi)) khoi = x.khoi;
      if (x.ta) ta = true;
    });
    if (khoi) return 'k' + khoi;
    var chu = boDau((p.chuc_vu || '') + ' ' + (p.to_chuyen_mon || ''));
    if (ta || /tieng anh|ngoai ngu|anh van/.test(chu)) return 'ta';
    if (!coPhanCongCN) {
      var t = boDau(p.to_chuyen_mon || '').match(/^to\s*(chuyen mon\s*)?(khoi\s*)?([1-5])\s*$/);
      if (t) return 'k' + t[3];
    }
    return 'khac';
  }

  // Chỉ lấy dòng chủ nhiệm + dòng Tiếng Anh (NN1) — đủ để chia nhóm, lại không chạm
  // trần 1000 dòng mỗi lượt của PostgREST (phân công đủ môn của 90 giáo viên ~900 dòng).
  // Bọc try: máy chủ nào thiếu hàm lọc / thiếu bảng thì danh bạ vẫn vẽ, chỉ chia theo tổ.
  function docPhanCong(may, nam) {
    if (!nam) return Promise.resolve({ data: [] });
    try {
      var q = may.from('phan_cong_day').select('nguoi_dung_id,lop,mon_ma,la_chu_nhiem').eq('nam_hoc', nam);
      if (q.or) q = q.or('la_chu_nhiem.eq.true,mon_ma.eq.NN1');
      return Promise.resolve(q).then(function (r) { return r || { data: [] }; }, function () { return { data: [] }; });
    } catch (e) { return Promise.resolve({ data: [] }); }
  }
  // GVCN DỰ KIẾN theo Gmail (sql/70, lop_hoc.gvcn_email). 🔴 BẮT BUỘC ĐỌC THÊM:
  //  phan_cong_day cần nguoi_dung_id, nên người CHƯA ĐĂNG NHẬP lần nào không có
  //  dòng chủ nhiệm nào ở đó → bản 30/9 đẩy cả loạt cô chủ nhiệm (Đặng Thị Dung
  //  lớp 3 QC1…) sang "Giáo viên khác", các cô không tìm thấy tên mình.
  //  Trường chưa chạy sql/70 (thiếu cột) → lỗi → coi như rỗng, không hỏng danh bạ.
  function docGvcnDuKien(may, nam) {
    if (!nam) return Promise.resolve({ data: [] });
    try {
      return Promise.resolve(may.from('lop_hoc').select('lop,gvcn_email,gvcn_ten').eq('nam_hoc', nam))
        .then(function (r) { return r || { data: [] }; }, function () { return { data: [] }; });
    } catch (e) { return Promise.resolve({ data: [] }); }
  }
  // Khối của một tên lớp: "3A" → 3 · "Lớp 3A" / "DL-3A" → 3. Không ra 1…5 thì 0.
  function khoiCuaLop(lop) {
    var m = String(lop || '').trim().match(/(?:^|[^0-9])([1-5])(?![0-9])/);
    return m ? +m[1] : 0;
  }

  function napCBGV(may) {
    var nam = (window.CAU_HINH || {}).NAM_HOC || '';
    Promise.all([
      docDanhSachMoi(may),
      may.from('nguoi_dung').select('id,email,trang_thai,anh_dai_dien'),
      // Danh sách cơ sở để đặt tên cho ô lọc. Hỏng thì coi như trường một điểm
      // — không có ô lọc, chứ không làm hỏng danh bạ.
      may.from('co_so').select('ma,ten,loai,so_tt').eq('hoat_dong', true).order('so_tt'),
      // Phân công năm nay: lớp chủ nhiệm → khối; môn NN1 → giáo viên Tiếng Anh.
      // Hỏng (chưa có bảng, RLS) thì chia theo tổ / chức vụ — không làm hỏng danh bạ.
      docPhanCong(may, nam),
      docGvcnDuKien(may, nam)
    ]).then(function (kq) {
      if (kq[0].error) return; // GV chưa hoạt động thì RLS chặn — bỏ qua im lặng
      var moi = kq[0].data || [];
      var nd = {}, emailCuaId = {};
      (kq[1].data || []).forEach(function (u) {
        nd[String(u.email || '').toLowerCase()] = u;
        if (u.id) emailCuaId[u.id] = String(u.email || '').toLowerCase();
      });
      var dsCoSo = (kq[2] && !kq[2].error && kq[2].data) ? kq[2].data : [];
      var tenCS = {};
      dsCoSo.forEach(function (c) { tenCS[c.ma] = c.ten; });
      var pc = {}, coPhanCongCN = false;
      ((kq[3] && !kq[3].error && kq[3].data) || []).forEach(function (p) {
        var e = emailCuaId[p.nguoi_dung_id];
        if (!e) return;
        var x = pc[e] = pc[e] || { khoi: 0, ta: false };
        var k = khoiCuaLop(p.lop);
        if (p.la_chu_nhiem && k) { coPhanCongCN = true; if (!x.khoi || k < x.khoi) x.khoi = k; }
        if (p.mon_ma === 'NN1') x.ta = true;
      });
      // GVCN dự kiến (người chưa đăng nhập): khớp theo Gmail ở danh sách mời.
      // Lớp chưa ghi Gmail mà gvcn_ten trùng ĐÚNG MỘT người trong danh sách mời
      // thì mới nhận theo tên — hai người trùng tên thì bỏ, không đoán.
      var soTen = {}, emailTheoTen = {};
      moi.forEach(function (m) {
        var t = boDau(m.ho_ten).replace(/\s+/g, ' ').trim();
        if (!t || m.la_ky_thuat) return;
        var k = String(m.email_chinh || m.email || '').trim().toLowerCase();
        if (emailTheoTen[t] === undefined) { emailTheoTen[t] = k; soTen[t] = 1; }
        else if (emailTheoTen[t] !== k) soTen[t]++;
      });
      ((kq[4] && !kq[4].error && kq[4].data) || []).forEach(function (l) {
        var k = khoiCuaLop(l.lop);
        if (!k) return;
        var e = String(l.gvcn_email || '').trim().toLowerCase();
        if (!e) {
          var t = boDau(l.gvcn_ten).replace(/\s+/g, ' ').trim();
          if (!t || soTen[t] !== 1) return;
          e = emailTheoTen[t];
        }
        coPhanCongCN = true;
        var x = pc[e] = pc[e] || { khoi: 0, ta: false };
        if (!x.khoi || k < x.khoi) x.khoi = k;
      });

      var TEN_VAI_TRO = {
        admin: 'Quản trị', ban_giam_hieu: 'Ban giám hiệu', to_truong: 'Tổ trưởng',
        giao_vien: 'Giáo viên', nhan_vien: 'Nhân viên'
      };
      // Thứ tự ưu tiên khi một người có HAI dòng khác nhóm (hai email): nhóm đứng trước thắng
      var UU_TIEN = ['ban_giam_hieu', 'to_truong', 'giao_vien', 'nhan_vien'];

      // Một người có thể có HAI email trong danh sách mời (thầy Chung: gmail và
      // nghean.edu.vn). GỘP hai dòng thành một thẻ: lấy link, chức vụ, tổ của
      // dòng nào có, và coi là đã kích hoạt nếu BẤT KỲ email nào đã đăng nhập.
      // 🔴 GỘP THEO `email_chinh`, TUYỆT ĐỐI KHÔNG THEO HỌ TÊN — trùng họ tên là
      //    chuyện THƯỜNG trong một trường (Châu Đình có hai cô Nguyễn Thị Hà).
      //    Chỉ gộp khi nhà trường KHAI RÕ ở moi_tai_khoan.email_chinh.
      function khoaNguoi(m) {
        return String(m.email_chinh || m.email || '').trim().toLowerCase();
      }
      // Khoá lọc cho người CHƯA gắn cơ sở — chuỗi CÓ MẶT CHỮ, không phải dấu
      // cách (bản đầu lỡ dùng byte NUL trông y hệt dấu cách, lọc ra lưới trắng).
      var CS_TRONG = '--chua-gan--';

      // ── Ai được MỞ thư mục hồ sơ của ai (thầy Chung chốt 28/9/2026) ──
      //  BGH/Quản trị: mọi hồ sơ · Tổ trưởng, Tổ phó: hồ sơ người CÙNG TỔ ·
      //  còn lại: chỉ hồ sơ của chính mình. Quyền thật nằm ở chia sẻ Drive.
      var toi = window.NGUOI_DUNG || {};
      var emToi = String(toi.email || '').trim().toLowerCase();
      var toiBGH = toi.vai_tro === 'admin' || toi.vai_tro === 'ban_giam_hieu';
      var khoaToi = emToi, toToi = '', toiDungTo = false;
      moi.forEach(function (m) {
        if (String(m.email || '').trim().toLowerCase() !== emToi) return;
        khoaToi = khoaNguoi(m);
        toToi = boDau(m.to_chuyen_mon).trim();
        toiDungTo = toi.vai_tro === 'to_truong' || /^to (truong|pho)\b/.test(boDau(m.chuc_vu));
      });
      function moDuoc(g) {
        if (toiBGH || g.khoa === khoaToi || g.emails.indexOf(emToi) >= 0) return true;
        return toiDungTo && !!toToi && boDau(g.to_chuyen_mon).trim() === toToi;
      }

      // 1 · Gộp người (một thẻ mỗi người)
      var nguoi = [], viTri = {};
      moi.forEach(function (m) {
        if (m.la_ky_thuat) return;
        var nh = nhomCua(m);
        if (UU_TIEN.indexOf(nh) < 0) return;
        var k = khoaNguoi(m), i = viTri[k];
        if (i === undefined) {
          viTri[k] = nguoi.length;
          nguoi.push({ khoa: k, ho_ten: m.ho_ten, chuc_vu: m.chuc_vu, to_chuyen_mon: m.to_chuyen_mon,
            vai_tro: m.vai_tro, link_drive: m.link_drive, emails: [m.email], co_so_ma: m.co_so_ma || '', coBan: nh });
          return;
        }
        var g = nguoi[i];
        g.emails.push(m.email);
        if (UU_TIEN.indexOf(nh) < UU_TIEN.indexOf(g.coBan)) g.coBan = nh;
        if (!g.link_drive)    g.link_drive    = m.link_drive;
        if (!g.chuc_vu)       g.chuc_vu       = m.chuc_vu;
        if (!g.to_chuyen_mon) g.to_chuyen_mon = m.to_chuyen_mon;
        if (!g.co_so_ma)      g.co_so_ma      = m.co_so_ma || '';
      });
      // 2 · Nhóm chi tiết
      var theoNhom = {};
      nguoi.forEach(function (g) { g.nhom = nhomChiTiet(g, pc, coPhanCongCN); (theoNhom[g.nhom] = theoNhom[g.nhom] || []).push(g); });
      // Nhóm có tên tôi mở sẵn (không thấy thì nhóm đầu tiên có người)
      var nhomToi = '';
      nguoi.forEach(function (g) { if (g.khoa === khoaToi || g.emails.map(function (e) { return String(e || '').toLowerCase(); }).indexOf(emToi) >= 0) nhomToi = g.nhom; });

      // ── Thanh tìm + chọn nơi công tác: lọc CẢ danh bạ (trước chỉ lọc nhóm Giáo viên)
      var demCS = {};
      nguoi.forEach(function (g) { demCS[g.co_so_ma] = (demCS[g.co_so_ma] || 0) + 1; });
      var maCS = dsCoSo.map(function (c) { return c.ma; }).filter(function (ma) { return demCS[ma]; });
      var soTrong = demCS[''] || 0;
      var coLocCS = maCS.length > 1 || (maCS.length && soTrong);
      var html = '<div class="cbgv-loc cbgv-thanh">' +
        '<input type="search" id="cbgv-tim" class="cbgv-tim" autocomplete="off" placeholder="🔍 Gõ tên để tìm (không dấu cũng được)" aria-label="Tìm theo tên">' +
        (coLocCS
          ? '<label for="cbgv-loc-cs">📍 Nơi công tác</label> <select id="cbgv-loc-cs">' +
            '<option value="">— Tất cả (' + nguoi.length + ' Hồ sơ) —</option>' +
            maCS.map(function (ma) {
              return '<option value="' + thoat(ma) + '">' + thoat(tenCS[ma] || ma) + ' (' + demCS[ma] + ' Hồ sơ)</option>';
            }).join('') +
            // ⚠️ co_so_ma trống KHÔNG lặng lẽ nhét vào cơ sở chính: nhìn thấy
            //    "Chưa gắn cơ sở · 12 người" thì Ban giám hiệu mới biết mà đi gắn.
            (soTrong ? '<option value="' + CS_TRONG + '">Chưa gắn cơ sở (' + soTrong + ' Hồ sơ)</option>' : '') +
            '</select>'
          : '') +
        '<span class="cbgv-loc-dem"></span></div>';

      var soNhomDaVe = 0;
      NHOM_CBGV.forEach(function (nh) {
        var ds = theoNhom[nh.ma] || [];
        if (!ds.length) return;
        if (nh.ma === 'bgh') {
          // Ban giám hiệu: HIỆU TRƯỞNG đứng đầu, rồi Phó Hiệu trưởng (thầy Chung 28/9/2026)
          var bac = function (g) {
            var cv = String(g.chuc_vu || '').toLowerCase();
            return /phó\s*hiệu\s*trưởng/.test(cv) ? 1 : /hiệu\s*trưởng/.test(cv) ? 0 : 2;
          };
          ds = ds.slice().sort(function (x, y) { return bac(x) - bac(y) || sapTheoTen(x, y); });
        } else ds = ds.slice().sort(sapTheoTen);
        var moSan = nhomToi ? nh.ma === nhomToi : soNhomDaVe === 0;
        soNhomDaVe++;
        html += '<div class="sub' + (moSan ? ' open' : '') + '" data-nhom="' + nh.ma + '">' +
          '<div class="sub-head" role="button" tabindex="0"' +
          ' onclick="this.parentNode.classList.toggle(\'open\')"' +
          ' onkeydown="if(event.key===\'Enter\'||event.key===\' \'){event.preventDefault();this.parentNode.classList.toggle(\'open\')}">' +
          '<span class="fo">' + nh.icon + '</span><b>' + thoat(nh.ten) + '</b>' +
          (nh.phu ? '<small class="sub-phu">' + thoat(nh.phu) + '</small>' : '') +
          // "Hồ sơ" chứ không phải "người" — thầy Chung chốt 10/9/2026
          '<span class="sub-cnt" data-tong="' + ds.length + '">' + ds.length + ' Hồ sơ</span>' +
          '<span class="sub-arrow">▶</span></div>' +
          '<div class="sub-body"><div class="luoi-cbgv">';
        html += ds.map(function (m) {
          // Ảnh đại diện đầu tiên tìm được; một email đã đăng nhập là đã kích hoạt
          var u = null, daVao = false;
          m.emails.forEach(function (e) {
            var x = nd[(e || '').toLowerCase()];
            if (!x) return;
            if (!u || (!u.anh_dai_dien && x.anh_dai_dien)) u = x;
            if (x.trang_thai === 'hoat_dong') daVao = true;
          });
          // Chỉ nhận đường dẫn http(s) — ô link nhập tay có thể chứa 'javascript:'
          var link = /^https?:\/\//i.test(m.link_drive || '') ? m.link_drive : '';
          var laToi = m.khoa === khoaToi || m.emails.map(function (e) { return String(e || '').toLowerCase(); }).indexOf(emToi) >= 0;
          var tenDayDu = thoat(m.ho_ten);
          // data-cs: khoá lọc nơi công tác · data-tim: họ tên không dấu cho ô tìm
          return '<div class="the-cbgv' + (laToi ? ' cua-toi' : '') + '" data-cs="' + thoat(m.co_so_ma || CS_TRONG) + '"' +
            ' data-tim="' + thoat(boDau(m.ho_ten)) + '">' +
            '<span class="anh-bao ' + (daVao ? 'da-vao' : 'chua-vao') + '"' +
            ' title="' + (daVao ? 'Đã đăng nhập vào hệ thống ít nhất một lần'
                                : 'Người này chưa đăng nhập lần nào') + '">' +
            (u && u.anh_dai_dien
              ? '<img class="anh" src="' + thoat(u.anh_dai_dien) + '" alt="" referrerpolicy="no-referrer">'
              : '<span class="anh chu-tat">' + thoat(chuTat(m.ho_ten)) + '</span>') +
            '</span>' +
            '<div class="than">' +
            '<b title="' + tenDayDu + '">' + tenDayDu + '</b>' + (laToi ? '<span class="nhan-toi">Tôi</span>' : '') +
            '<small class="vt">' + thoat(m.chuc_vu || TEN_VAI_TRO[m.vai_tro]) +
            (m.to_chuyen_mon ? ' · ' + thoat(m.to_chuyen_mon) : '') +
            (coLocCS && m.co_so_ma && tenCS[m.co_so_ma] ? ' · ' + thoat(tenCS[m.co_so_ma]) : '') + '</small>' +
            (m.emails[0]
              ? '<span class="mail" title="' + thoat(m.emails.join(' · ')) + '">✉ ' + thoat(m.emails[0]) + '</span>'
              : '') +
            '</div>' +
            (link && !moDuoc(m)
              ? '<span class="nut-hs trong" title="Chỉ Ban giám hiệu, tổ trưởng/tổ phó cùng tổ và chính người này mở được"' +
                ' aria-label="Không có quyền mở hồ sơ của ' + tenDayDu + '">🔒</span>'
              : link
              ? '<a class="nut-hs" target="_blank" rel="noopener" href="' + thoat(link) + '"' +
                ' title="Mở thư mục hồ sơ cá nhân trên Drive"' +
                ' aria-label="Mở thư mục hồ sơ cá nhân của ' + tenDayDu + '">📁</a>'
              : '<span class="nut-hs trong" title="Chưa gán thư mục Drive cho người này"' +
                ' aria-label="' + tenDayDu + ' chưa được gán thư mục Drive">📁</span>') +
            '</div>';
        }).join('');
        html += '</div></div></div>';   // luoi-cbgv · sub-body · sub
      });

      var vung = document.getElementById('vung-cbgv');
      var baoCu = document.getElementById('cbgv-thong-bao');
      if (vung && soNhomDaVe) {
        vung.innerHTML = html;
        if (baoCu) baoCu.style.display = 'none';
        // 🔑 BỌC TRY/CATCH: ô tìm / ô lọc là tiện ích PHỤ, danh bạ đã vẽ xong rồi —
        //    khâu nối văng lỗi thì thà mất ô lọc còn hơn mất cả danh bạ.
        try {
          var oTim = vung.querySelector('#cbgv-tim'), oChon = vung.querySelector('#cbgv-loc-cs'), oDem = vung.querySelector('.cbgv-loc-dem');
          var loc = function () {
            var v = oChon ? oChon.value : '', tim = boDau(oTim ? oTim.value : '').replace(/\s+/g, ' ').trim(), tong = 0;
            Array.prototype.forEach.call(vung.querySelectorAll('.sub[data-nhom]'), function (sub) {
              var hien = 0;
              Array.prototype.forEach.call(sub.querySelectorAll('.the-cbgv'), function (the) {
                var khop = (!v || the.getAttribute('data-cs') === v) && (!tim || the.getAttribute('data-tim').indexOf(tim) >= 0);
                the.style.display = khop ? '' : 'none';
                if (khop) hien++;
              });
              tong += hien;
              var dem = sub.querySelector('.sub-cnt');
              if (dem) dem.textContent = (v || tim ? hien + '/' + dem.getAttribute('data-tong') : dem.getAttribute('data-tong')) + ' Hồ sơ';
              sub.style.display = hien ? '' : 'none';
              // Đang tìm tên thì mở hết các nhóm có người khớp — khỏi bấm từng nhóm
              if (tim && hien) sub.classList.add('open');
            });
            // Nói ra con số đang xem: lọc xong mà im lặng thì không biết đang nhìn một phần hay toàn bộ
            if (oDem) oDem.textContent = v || tim ? (tong ? 'đang xem ' + tong + ' Hồ sơ' : 'Không thấy ai khớp') : '';
          };
          if (oTim) oTim.addEventListener('input', loc);
          if (oChon) oChon.addEventListener('change', loc);
          loc();
        } catch (e) {
          console.warn('[Danh bạ CBGV] Không nối được ô tìm / lọc:', e);
        }
      }
    });
  }
  // Phần thuần cho bài thử (thu-danh-ba-cbgv.js)
  window.CBGV_NHOM = { nhomChiTiet: nhomChiTiet, sapTheoTen: sapTheoTen, NHOM: NHOM_CBGV };
})();
