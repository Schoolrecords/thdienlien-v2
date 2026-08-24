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
      var cauHinh = kq[0].data, boPhan = kq[1].data, nhomCon = kq[2].data,
          hoSo = kq[3].data, tieuChi = kq[4].data, taiKhoan = kq[5].data;

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
      napCBGV(may);
      demQuyMoThat(may);
    }, function (e) {
      // Lời hứa bị TỪ CHỐI (đứt mạng, thử lại hết lượt) chứ không trả về
      // {error} — nhánh lỗi ở trên không chạy. Không có chỗ này thì trang mở ra
      // với 94 hồ sơ MẪU của một trường không có thật, mà không một lời cảnh báo.
      console.error('Lỗi nạp dữ liệu:', e);
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
    return may.from('moi_tai_khoan').select(COT_MOI + ',email_chinh').order('ho_ten')
      .then(function (r) {
        if (!r.error) return r;
        return may.from('moi_tai_khoan').select(COT_MOI).order('ho_ten');
      });
  }

  function napCBGV(may) {
    Promise.all([
      docDanhSachMoi(may),
      may.from('nguoi_dung').select('email,trang_thai,anh_dai_dien')
    ]).then(function (kq) {
      if (kq[0].error) return; // GV chưa hoạt động thì RLS chặn — bỏ qua im lặng
      var moi = kq[0].data || [];
      var nd = {};
      (kq[1].data || []).forEach(function (u) { nd[u.email.toLowerCase()] = u; });

      var TEN_VAI_TRO = {
        admin: 'Quản trị', ban_giam_hieu: 'Ban giám hiệu', to_truong: 'Tổ trưởng',
        giao_vien: 'Giáo viên', nhan_vien: 'Nhân viên'
      };
      var NHOM = [
        { icon: '🏛', ten: 'Ban giám hiệu — Quản trị', loc: ['admin', 'ban_giam_hieu'] },
        { icon: '📚', ten: 'Giáo viên', loc: ['to_truong', 'giao_vien'] },
        { icon: '🗄', ten: 'Nhân viên', loc: ['nhan_vien'] }
      ];
      // Một người có thể có HAI email trong danh sách mời (thầy Chung: gmail và
      // nghean.edu.vn). Trước đây chỗ này giữ dòng gặp trước rồi BỎ dòng sau —
      // mà link Drive lại chỉ gắn cho một trong hai email, nên rơi đúng dòng
      // không có link là thẻ hiện "Chưa gán thư mục" dù thư mục vẫn có thật.
      // Nay GỘP hai dòng thành một thẻ: lấy link, chức vụ, tổ của dòng nào có,
      // và coi là đã kích hoạt nếu BẤT KỲ email nào đã đăng nhập.
      //
      // 🔴 GỘP THEO `email_chinh`, TUYỆT ĐỐI KHÔNG THEO HỌ TÊN. Bản đầu gộp theo
      //    họ tên nên HAI NGƯỜI TRÙNG TÊN bị nhập làm một: Châu Đình có hai cô
      //    Nguyễn Thị Hà, danh bạ chỉ hiện một thẻ — cô còn lại mất cả thẻ lẫn
      //    nút mở thư mục Drive, mà không có chỗ nào báo là thiếu người.
      //    Trùng họ tên là chuyện THƯỜNG trong một trường; một người hai địa chỉ
      //    mới là chuyện hiếm. Vậy chỉ gộp khi nhà trường KHAI RÕ ở cột
      //    moi_tai_khoan.email_chinh (⚙️ Thiết lập → ✉️ Danh sách mời → cột
      //    "Gộp vào"), chứ không đoán.
      function khoaNguoi(m) {
        return String(m.email_chinh || m.email || '').trim().toLowerCase();
      }
      // Hai người khác nhau mà trùng họ tên thì thẻ nào cũng chỉ ghi "Nguyễn Thị
      // Hà", nhìn vào không biết ai với ai. Ghi thêm phần đầu địa chỉ thư — đúng
      // cách script Drive đặt tên thư mục cá nhân cho hai cô.
      var tenTrung = {};
      (function () {
        var thay = {};
        moi.forEach(function (m) {
          if (m.la_ky_thuat) return;
          var t = String(m.ho_ten || '').trim();
          (thay[t] = thay[t] || {})[khoaNguoi(m)] = 1;
        });
        Object.keys(thay).forEach(function (t) {
          if (Object.keys(thay[t]).length > 1) tenTrung[t] = 1;
        });
      })();

      var daVe = {};
      var html = '';
      var soNhomDaVe = 0;   // nhóm đầu tiên CÓ người thì mở sẵn, các nhóm sau đóng
      NHOM.forEach(function (nh) {
        var ds = [], viTri = {};
        moi.forEach(function (m) {
          if (m.la_ky_thuat || nh.loc.indexOf(m.vai_tro) < 0) return;
          var k = khoaNguoi(m);
          if (daVe[k]) return;                  // đã vẽ ở nhóm trước
          var i = viTri[k];
          if (i === undefined) {
            viTri[k] = ds.length;
            ds.push({
              khoa: k,
              ho_ten: m.ho_ten, chuc_vu: m.chuc_vu, to_chuyen_mon: m.to_chuyen_mon,
              vai_tro: m.vai_tro, link_drive: m.link_drive, emails: [m.email]
            });
            return;
          }
          var g = ds[i];
          g.emails.push(m.email);
          if (!g.link_drive)    g.link_drive    = m.link_drive;
          if (!g.chuc_vu)       g.chuc_vu       = m.chuc_vu;
          if (!g.to_chuyen_mon) g.to_chuyen_mon = m.to_chuyen_mon;
        });
        ds.forEach(function (g) { daVe[g.khoa] = true; });
        if (!ds.length) return;
        // Xếp gọn thành khối bấm mở — dùng lại đúng kiểu `.sub` của danh mục hộp
        // hồ sơ, đừng vẽ kiểu riêng. Trường 39 người mà trải phẳng một mạch thì
        // phải cuộn hết trang mới thấy nhóm Nhân viên nằm cuối.
        // Nhóm đầu tiên có người mở sẵn: mở app ra mà toàn khối đóng thì người
        // dùng không biết bên trong có gì, tưởng màn hình rỗng.
        var moSan = (soNhomDaVe === 0);
        soNhomDaVe++;
        html += '<div class="sub' + (moSan ? ' open' : '') + '">' +
          '<div class="sub-head" role="button" tabindex="0"' +
          ' onclick="this.parentNode.classList.toggle(\'open\')"' +
          ' onkeydown="if(event.key===\'Enter\'||event.key===\' \'){event.preventDefault();this.parentNode.classList.toggle(\'open\')}">' +
          '<span class="fo">' + nh.icon + '</span><b>' + thoat(nh.ten) + '</b>' +
          '<span class="sub-cnt">' + ds.length + ' người</span>' +
          '<span class="sub-arrow">▶</span></div>' +
          '<div class="sub-body"><div class="luoi-cbgv">';
        html += ds.map(function (m) {
          // Duyệt mọi email của người này: lấy ảnh đại diện đầu tiên tìm được,
          // và chỉ cần MỘT email đã đăng nhập là coi như đã kích hoạt.
          var u = null, daVao = false;
          m.emails.forEach(function (e) {
            var x = nd[(e || '').toLowerCase()];
            if (!x) return;
            if (!u || (!u.anh_dai_dien && x.anh_dai_dien)) u = x;
            if (x.trang_thai === 'hoat_dong') daVao = true;
          });
          // Chỉ nhận đường dẫn http(s) — ô link nhập tay có thể chứa 'javascript:'
          var link = /^https?:\/\//i.test(m.link_drive || '') ? m.link_drive : '';
          // Thẻ NẰM NGANG: ảnh · (tên / chức vụ / trạng thái) · nút thư mục.
          // Trạng thái rút gọn còn "Đã kích hoạt" / "Chưa đăng nhập", câu đầy đủ
          // để trong title — dòng dài làm thẻ phải nới ngang, mà nới ngang thì
          // mỗi hàng bớt một thẻ.
          var tenDayDu = thoat(m.ho_ten);
          return '<div class="the-cbgv">' +
            (u && u.anh_dai_dien
              ? '<img class="anh" src="' + thoat(u.anh_dai_dien) + '" alt="" referrerpolicy="no-referrer">'
              : '<span class="anh chu-tat">' + thoat(chuTat(m.ho_ten)) + '</span>') +
            '<div class="than">' +
            '<b title="' + tenDayDu + '">' + tenDayDu + '</b>' +
            '<small class="vt">' + thoat(m.chuc_vu || TEN_VAI_TRO[m.vai_tro]) +
            (m.to_chuyen_mon ? ' · ' + thoat(m.to_chuyen_mon) : '') +
            (tenTrung[String(m.ho_ten || '').trim()]
              ? ' · ' + thoat(String(m.emails[0] || '').split('@')[0]) : '') + '</small>' +
            '<small class="tt ' + (daVao ? 'da-vao' : 'chua-vao') + '"' +
            ' title="' + (daVao ? 'Đã đăng nhập vào hệ thống ít nhất một lần'
                                : 'Người này chưa đăng nhập lần nào') + '">' +
            (daVao ? '● Đã kích hoạt' : '○ Chưa đăng nhập') + '</small>' +
            '</div>' +
            // Nút chỉ còn biểu tượng — đúng kiểu nút 📂 ở bảng danh mục hồ sơ,
            // nên thầy cô đã quen. Tên người nằm trong aria-label để trình đọc
            // màn hình không đọc ra 39 nút giống hệt nhau.
            (link
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
      if (vung && html) {
        vung.innerHTML = html;
        if (baoCu) baoCu.style.display = 'none';
      }
    });
  }
})();
