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

  window.napDuLieuThat = function () {
    if (daNap || !window.MAY_CHU) return;
    daNap = true;
    var may = window.MAY_CHU;

    // TRẢ VỀ promise: cổng vào chờ nạp xong mới mở khóa trang, nhờ vậy thầy cô
    // không thấy số liệu mẫu loé lên rồi mới nhảy sang số thật.
    return Promise.all([
      may.from('cau_hinh').select('khoa,gia_tri'),
      may.from('nhom_ho_so').select('id,so_tt,ten,mo_ta,bieu_tuong').order('so_tt'),
      may.from('nhom_con').select('id,ma,ten,so_tt,nhom_id').order('so_tt'),
      may.from('ho_so').select('*').order('so_tt'),
      may.from('tieu_chi').select('ma,ten,bat_buoc,muc_1,muc_2').order('ma'),
      may.from('nguoi_dung').select('id,ho_ten,email,chuc_vu,vai_tro').eq('trang_thai', 'hoat_dong').order('ho_ten')
    ]).then(function (kq) {
      var loi = kq.filter(function (r) { return r.error; });
      if (loi.length) {
        console.error('Lỗi nạp dữ liệu:', loi[0].error);
        window.baoTrangThai && window.baoTrangThai('loi',
          '⚠️ KHÔNG ĐỌC ĐƯỢC DỮ LIỆU CỦA NHÀ TRƯỜNG: ' + loi[0].error.message +
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
    });
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
  function napCBGV(may) {
    Promise.all([
      may.from('moi_tai_khoan').select('email,ho_ten,chuc_vu,to_chuyen_mon,vai_tro,link_drive,la_ky_thuat').order('ho_ten'),
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
        { ten: '🏛 Ban giám hiệu — Quản trị', loc: ['admin', 'ban_giam_hieu'] },
        { ten: '📚 Giáo viên', loc: ['to_truong', 'giao_vien'] },
        { ten: '🗄 Nhân viên', loc: ['nhan_vien'] }
      ];
      // Một người có thể có HAI email trong danh sách mời (thầy Chung: gmail và
      // nghean.edu.vn). Trước đây chỗ này giữ dòng gặp trước rồi BỎ dòng sau —
      // mà link Drive lại chỉ gắn cho một trong hai email, nên rơi đúng dòng
      // không có link là thẻ hiện "Chưa gán thư mục" dù thư mục vẫn có thật.
      // Nay GỘP hai dòng thành một thẻ: lấy link, chức vụ, tổ của dòng nào có,
      // và coi là đã kích hoạt nếu BẤT KỲ email nào đã đăng nhập.
      var daVe = {};
      var html = '';
      NHOM.forEach(function (nh) {
        var ds = [], viTri = {};
        moi.forEach(function (m) {
          if (m.la_ky_thuat || nh.loc.indexOf(m.vai_tro) < 0) return;
          if (daVe[m.ho_ten]) return;           // đã vẽ ở nhóm trước
          var i = viTri[m.ho_ten];
          if (i === undefined) {
            viTri[m.ho_ten] = ds.length;
            ds.push({
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
        ds.forEach(function (g) { daVe[g.ho_ten] = true; });
        if (!ds.length) return;
        html += '<div class="dau-muc" style="text-align:left;margin:20px 0 10px"><div class="nhan-nho">' + nh.ten +
          ' · ' + ds.length + ' người</div></div><div class="luoi-cbgv">';
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
          return '<div class="the-cbgv">' +
            '<div class="mu">' +
            (u && u.anh_dai_dien
              ? '<img class="anh" src="' + thoat(u.anh_dai_dien) + '" alt="" referrerpolicy="no-referrer">'
              : '<span class="anh chu-tat">' + thoat(chuTat(m.ho_ten)) + '</span>') +
            '</div>' +
            '<div class="than">' +
            '<b>' + thoat(m.ho_ten) + '</b>' +
            '<small class="vt">' + thoat(m.chuc_vu || TEN_VAI_TRO[m.vai_tro]) +
            (m.to_chuyen_mon ? ' · ' + thoat(m.to_chuyen_mon) : '') + '</small>' +
            '<small class="tt ' + (daVao ? 'da-vao' : 'chua-vao') + '">' +
            (daVao ? '● Đã kích hoạt tài khoản' : '○ Chưa đăng nhập lần nào') + '</small>' +
            (link
              ? '<a class="nut-hs" target="_blank" rel="noopener" href="' + thoat(link) + '">📁 Hồ sơ cá nhân</a>'
              : '<span class="nut-hs trong" title="Chưa gán thư mục Drive cho người này">📁 Chưa gán thư mục</span>') +
            '</div></div>';
        }).join('');
        html += '</div>';
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
