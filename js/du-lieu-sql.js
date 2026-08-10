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
        window.baoTrangThai && window.baoTrangThai('loi', '⚠️ Không đọc được dữ liệu từ máy chủ: ' + loi[0].error.message);
        daNap = false;
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
      // Năm học: mặc định TỰ TÍNH theo mốc trong CSDL (30/08).
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
      // Quy mô trường: CSDL là nguồn duy nhất, số trong cauhinh.js chỉ là dự
      // phòng cho lúc chưa đăng nhập. Đổi quy mô thì sửa bảng cau_hinh, không
      // sửa mã — tránh mỗi nơi một con số.
      if (ch.so_lop) window.CAU_HINH.SO_LOP = parseInt(ch.so_lop, 10);
      if (ch.so_hoc_sinh) window.CAU_HINH.SO_HOC_SINH = parseInt(ch.so_hoc_sinh, 10);
      document.querySelectorAll('.dien-ten-truong').forEach(function (e) { e.textContent = window.CAU_HINH.TEN_TRUONG; });
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
      var daVe = {}; // 1 người 2 email (thầy Chung) chỉ vẽ 1 thẻ
      var html = '';
      NHOM.forEach(function (nh) {
        var ds = moi.filter(function (m) {
          if (m.la_ky_thuat || nh.loc.indexOf(m.vai_tro) < 0) return false;
          if (daVe[m.ho_ten]) return false;
          daVe[m.ho_ten] = true;
          return true;
        });
        if (!ds.length) return;
        html += '<div class="dau-muc" style="text-align:left;margin:20px 0 10px"><div class="nhan-nho">' + nh.ten +
          ' · ' + ds.length + ' người</div></div><div class="luoi-cbgv">';
        html += ds.map(function (m) {
          var u = nd[(m.email || '').toLowerCase()];
          return '<div class="the-cbgv">' +
            (u && u.anh_dai_dien ? '<img class="anh" src="' + thoat(u.anh_dai_dien) + '" alt="" referrerpolicy="no-referrer">' : '<span class="anh chu">👤</span>') +
            '<div class="phan-chu"><b>' + thoat(m.ho_ten) + '</b>' +
            '<small>' + thoat(m.chuc_vu || TEN_VAI_TRO[m.vai_tro]) +
            (m.to_chuyen_mon ? ' · ' + thoat(m.to_chuyen_mon) : '') + '</small>' +
            '<small class="' + (u && u.trang_thai === 'hoat_dong' ? 'da-vao' : 'chua-vao') + '">' +
            (u && u.trang_thai === 'hoat_dong' ? '● Đã kích hoạt tài khoản' : '○ Chưa đăng nhập lần nào') + '</small></div>' +
            (m.link_drive ? '<a class="nut-drive" target="_blank" rel="noopener" href="' + thoat(m.link_drive) + '">📁</a>' : '') +
            '</div>';
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
