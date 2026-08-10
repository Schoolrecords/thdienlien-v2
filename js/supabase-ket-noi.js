// ============================================================
// supabase-ket-noi.js — cầu nối Supabase: đăng nhập Google,
// theo dõi phiên, hiện khu tài khoản trên đầu trang.
// Khi chưa nối CSDL (DA_NOI = false) file này không làm gì cả —
// trang chạy chế độ xem thử như cũ.
// ============================================================
(function () {
  'use strict';
  if (!window.DA_NOI) return;

  function thoat(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  var may = null;
  window.NGUOI_DUNG = null;

  // ── Băng thông báo trạng thái dưới đầu trang ──
  window.baoTrangThai = function (loai, chu) {
    var bang = document.getElementById('bang-trang-thai');
    if (!bang) return;
    if (!loai) { bang.style.display = 'none'; return; }
    bang.className = 'bang-trang-thai ' + loai;
    bang.innerHTML = chu;
    bang.style.display = '';
  };

  // ── Khu tài khoản góc phải đầu trang (chip + hộp xổ xuống kiểu Bạch Liêu) ──
  var TEN_VAI_TRO = {
    admin: 'Quản trị hệ thống', ban_giam_hieu: 'Ban giám hiệu', to_truong: 'Tổ trưởng chuyên môn',
    giao_vien: 'Giáo viên', nhan_vien: 'Nhân viên'
  };

  function veKhuTaiKhoan() {
    var khu = document.getElementById('khu-tai-khoan');
    if (!khu) return;
    var nd = window.NGUOI_DUNG;
    if (!nd) {
      khu.innerHTML = '<button class="nut-dang-nhap" id="nut-dang-nhap">🔑 Đăng nhập</button>';
      document.getElementById('nut-dang-nhap').addEventListener('click', dangNhap);
      return;
    }
    var laQT = (nd.vai_tro === 'admin' || nd.vai_tro === 'ban_giam_hieu');
    khu.innerHTML =
      '<button class="chip-nguoi" id="chip-nguoi">' +
      (nd.anh_dai_dien ? '<img src="' + thoat(nd.anh_dai_dien) + '" alt="" referrerpolicy="no-referrer">' : '<span class="anh-chu">👤</span>') +
      '<span class="chip-chu"><b>' + thoat(nd.ho_ten) + '</b>' +
      '<small>' + (TEN_VAI_TRO[nd.vai_tro] || '') + '</small></span></button>' +
      '<div class="hop-tai-khoan" id="hop-tai-khoan">' +
      '<div class="phan-ten"><b>' + thoat(nd.ho_ten) + '</b>' +
      '<div class="email">' + thoat(nd.email) + '</div>' +
      '<span class="the-vai-tro">' + (TEN_VAI_TRO[nd.vai_tro] || '') + '</span></div>' +
      (laQT ? '<button class="muc-menu" id="muc-quan-tri">⚙️ Quản trị hệ thống</button>' : '') +
      '<button class="muc-menu thoat" id="muc-dang-xuat">↩ Đăng xuất</button></div>';

    var hop = document.getElementById('hop-tai-khoan');
    document.getElementById('chip-nguoi').addEventListener('click', function (e) {
      e.stopPropagation();
      hop.classList.toggle('hien');
    });
    document.addEventListener('click', function () { hop.classList.remove('hien'); });
    var nutQT = document.getElementById('muc-quan-tri');
    if (nutQT) nutQT.addEventListener('click', function () {
      hop.classList.remove('hien');
      window.chuyenManHinh('quantri');
    });
    document.getElementById('muc-dang-xuat').addEventListener('click', dangXuat);
  }

  function dangNhap() {
    may.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: location.origin + location.pathname }
    });
  }

  function dangXuat() {
    may.auth.signOut().then(function () { location.reload(); });
  }

  // ── Xử lý phiên đăng nhập ──
  var idPhienDaXuLy = null;

  function xuLyPhien(phien) {
    if (!phien) {
      window.NGUOI_DUNG = null;
      idPhienDaXuLy = null;
      veKhuTaiKhoan();
      window.baoTrangThai('moi',
        '👁 Đang xem <b>dữ liệu mẫu</b>. Thầy cô bấm <b>🔑 Đăng nhập</b> (góc phải trên) bằng Gmail đã đăng ký với nhà trường để làm việc với dữ liệu thật.');
      return;
    }
    if (idPhienDaXuLy === phien.user.id) return; // tránh xử lý lặp khi đổi tab
    idPhienDaXuLy = phien.user.id;

    may.from('nguoi_dung').select('*').eq('id', phien.user.id).maybeSingle().then(function (r) {
      if (r.error || !r.data) {
        window.baoTrangThai('khoa', '⚠️ Không đọc được hồ sơ tài khoản. Anh/chị thử tải lại trang; nếu vẫn lỗi, báo quản trị viên.');
        return;
      }
      window.NGUOI_DUNG = r.data;
      veKhuTaiKhoan();

      if (r.data.trang_thai === 'hoat_dong') {
        window.baoTrangThai(null);
        may.from('nguoi_dung').update({ lan_vao_cuoi: new Date().toISOString() }).eq('id', r.data.id).then(function () {});
        window.napDuLieuThat && window.napDuLieuThat();
        // Cho các file bê nguyên từ Bạch Liêu sang (bach-lieu-shim.js)
        document.dispatchEvent(new Event('dangnhap-xong'));
        if (r.data.vai_tro === 'admin' || r.data.vai_tro === 'ban_giam_hieu') {
          window.veQuanTri && window.veQuanTri();
        }
      } else if (r.data.trang_thai === 'cho_duyet') {
        window.baoTrangThai('cho',
          '🕐 Tài khoản <b>' + thoat(r.data.email) + '</b> đang <b>chờ Ban giám hiệu duyệt</b>. Trong lúc chờ, trang hiển thị dữ liệu mẫu.');
      } else {
        window.baoTrangThai('khoa', '🔒 Tài khoản này đã bị khóa. Anh/chị liên hệ Ban giám hiệu để được mở lại.');
      }
    });
  }

  // ── Khởi động ──
  document.addEventListener('DOMContentLoaded', function () {
    if (!window.supabase || !window.supabase.createClient) {
      window.baoTrangThai('khoa', '⚠️ Không tải được thư viện kết nối. Kiểm tra đường mạng rồi tải lại trang.');
      return;
    }
    may = window.supabase.createClient(window.CAU_HINH.DIA_CHI, window.CAU_HINH.KHOA_CONG_KHAI);
    window.MAY_CHU = may;

    veKhuTaiKhoan();
    may.auth.getSession().then(function (r) { xuLyPhien(r.data ? r.data.session : null); });
    may.auth.onAuthStateChange(function (suKien, phien) {
      if (suKien === 'SIGNED_IN' || suKien === 'INITIAL_SESSION' || suKien === 'TOKEN_REFRESHED') xuLyPhien(phien);
      if (suKien === 'SIGNED_OUT') xuLyPhien(null);
    });
  });
})();
