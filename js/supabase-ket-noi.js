// ============================================================
// supabase-ket-noi.js — cầu nối Supabase: đăng nhập Google,
// theo dõi phiên, hiện khu tài khoản trên đầu trang.
// Khi chưa nối CSDL (DA_NOI = false) file này không làm gì cả —
// trang chạy chế độ xem thử như cũ.
// ============================================================
(function () {
  'use strict';

  function thoat(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // Chưa cấu hình CSDL → chạy chế độ xem thử, phải MỞ khóa vì trang khóa sẵn
  // từ HTML. Không có dòng này thì bản demo sẽ trắng màn.
  if (!window.DA_NOI) {
    document.body.classList.remove('dang-khoa');
    var congDemo = document.getElementById('cong-vao');
    if (congDemo) congDemo.classList.add('an');
    return;
  }

  var may = null;
  window.NGUOI_DUNG = null;

  // ══════════ CỔNG VÀO ══════════
  var LOGO_GOOGLE =
    '<svg viewBox="0 0 48 48" aria-hidden="true">' +
    '<path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>' +
    '<path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>' +
    '<path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>' +
    '<path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>' +
    '</svg>';

  function hopCong() { return document.getElementById('cong-hop'); }

  function dauCong() {
    var C = window.CAU_HINH || {};
    return '<img class="logo dien-logo" src="' + thoat((C.THU_MUC_ANH || 'img/') + 'logo.png') +
      '" alt="" onerror="this.onerror=null;this.src=\'img/logo.png\'">' +
      '<h1>Hệ thống Hồ sơ số<br><span class="dien-ten-truong">' +
      thoat(C.TEN_TRUONG) + '</span></h1>';
  }

  function chanCong() {
    return '<div class="chan">Nhà trường <b>không lưu giữ mật khẩu</b> Gmail của thầy cô. ' +
      'Việc xác thực do Google thực hiện. Dữ liệu cá nhân được bảo vệ theo ' +
      'Luật Bảo vệ dữ liệu cá nhân năm 2025.</div>' +
      // Nhiều trường dùng chung app: cho người vào nhầm trường tự đổi, thay vì
      // đăng nhập mãi không được mà không hiểu vì sao.
      (window.htmlChonTruong ? window.htmlChonTruong('Bạn ở trường khác?') : '');
  }

  // Trang chỉ mở khi tài khoản ĐÃ đăng nhập VÀ đang hoạt động
  function moKhoa() {
    document.body.classList.remove('dang-khoa');
    var cong = document.getElementById('cong-vao');
    if (cong) cong.classList.add('an');
  }

  function veCongDangNhap(loi) {
    var h = hopCong(); if (!h) return;
    h.innerHTML = dauCong() +
      '<div class="loi-moi">Đăng nhập bằng địa chỉ Gmail của thầy cô để vào hệ thống.</div>' +
      '<button class="nut-google" id="nut-google">' + LOGO_GOOGLE + ' Đăng nhập bằng Google</button>' +
      (loi ? '<div class="hop-loi khoa">' + thoat(loi) + '</div>' : '') +
      chanCong();
    document.getElementById('nut-google').addEventListener('click', function () {
      this.disabled = true;
      this.innerHTML = 'Đang chuyển sang Google…';
      dangNhap();
    });
  }

  function veCongChoDuyet(email, laKhoa) {
    var h = hopCong(); if (!h) return;
    h.innerHTML = dauCong() +
      '<div class="loi-moi">' + (laKhoa ? '🔒 Tài khoản đã bị khóa' : '🕐 Tài khoản đang chờ duyệt') + '</div>' +
      '<div class="hop-loi ' + (laKhoa ? 'khoa' : 'cho') + '">' +
      '<b>' + thoat(email) + '</b><br>' +
      (laKhoa
        ? 'Tài khoản này đã bị khóa. Thầy cô liên hệ Ban giám hiệu để được mở lại.'
        : 'Thầy cô đã đăng nhập thành công, nhưng địa chỉ Gmail này chưa có trong ' +
          'danh sách của nhà trường nên cần Ban giám hiệu duyệt. Nếu thầy cô dùng ' +
          'Gmail khác với địa chỉ đã đăng ký, hãy đăng xuất rồi đăng nhập lại đúng địa chỉ đó.') +
      '</div>' +
      '<button class="nut-phu" id="nut-thoat-cong">↩ Đăng xuất</button>' +
      chanCong();
    document.getElementById('nut-thoat-cong').addEventListener('click', dangXuat);
  }

  function veCongDangTai() {
    var h = hopCong(); if (!h) return;
    h.innerHTML = dauCong() + '<div class="dang-cho">Đang tải dữ liệu nhà trường…</div>';
  }

  function veCongLoi(chu) {
    var h = hopCong(); if (!h) return;
    h.innerHTML = dauCong() +
      '<div class="hop-loi khoa">' + thoat(chu) + '</div>' +
      '<button class="nut-phu" id="nut-tai-lai">↻ Tải lại trang</button>' +
      chanCong();
    document.getElementById('nut-tai-lai').addEventListener('click', function () { location.reload(); });
  }

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
      // Nút tròn trên màn rộng (CSS ẩn chữ, chỉ còn hình chìa khóa);
      // trong bảng ☰ dưới 1360px vẫn là nút chữ đầy đủ.
      khu.innerHTML = '<button class="nut-dang-nhap" id="nut-dang-nhap" title="Đăng nhập" aria-label="Đăng nhập">' +
        '<svg class="ic" viewBox="0 0 24 24"><circle cx="7.5" cy="15.5" r="4.5"/><path d="m11 12 9-9"/><path d="m17 6 3 3"/></svg>' +
        '<span>Đăng nhập</span></button>';
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
      veCongDangNhap();
      return;
    }
    if (idPhienDaXuLy === phien.user.id) return; // tránh xử lý lặp khi đổi tab
    idPhienDaXuLy = phien.user.id;

    may.from('nguoi_dung').select('*').eq('id', phien.user.id).maybeSingle().then(function (r) {
      if (r.error) {
        idPhienDaXuLy = null;
        veCongLoi('Không đọc được hồ sơ tài khoản: ' + (r.error.message || '') +
          '. Thầy cô thử tải lại trang; nếu vẫn lỗi thì báo quản trị viên.');
        return;
      }
      // Đăng nhập Google được nhưng CHƯA có dòng trong nguoi_dung: trigger tạo
      // hồ sơ chạy ngay sau khi Google trả về, đôi khi chậm hơn lần đọc này.
      // Coi như chờ duyệt và cho đăng xuất — KHÔNG mở khóa trang.
      if (!r.data) {
        veCongChoDuyet(phien.user.email || '', false);
        return;
      }
      window.NGUOI_DUNG = r.data;
      veKhuTaiKhoan();

      if (r.data.trang_thai === 'hoat_dong') {
        veCongDangTai();
        window.baoTrangThai(null);
        may.from('nguoi_dung').update({ lan_vao_cuoi: new Date().toISOString() }).eq('id', r.data.id).then(function () {});
        // Chờ dữ liệu thật nạp xong mới mở khóa. Nạp lỗi cũng mở — thà vào được
        // trang và thấy báo lỗi còn hơn kẹt mãi ở cổng.
        var dangNap = window.napDuLieuThat && window.napDuLieuThat();
        if (dangNap && dangNap.then) dangNap.then(moKhoa, moKhoa);
        else moKhoa();
        // Cho các file bê nguyên từ Bạch Liêu sang (bach-lieu-shim.js)
        document.dispatchEvent(new Event('dangnhap-xong'));
        if (r.data.vai_tro === 'admin' || r.data.vai_tro === 'ban_giam_hieu') {
          window.veQuanTri && window.veQuanTri();
        }
      } else {
        // cho_duyet hoặc khoa → giữ nguyên cổng, KHÔNG mở khóa trang
        veCongChoDuyet(r.data.email, r.data.trang_thai === 'khoa');
      }
    });
  }

  // ── Khởi động ──
  document.addEventListener('DOMContentLoaded', function () {
    if (!window.supabase || !window.supabase.createClient) {
      veCongLoi('Không tải được thư viện kết nối tới máy chủ. Thầy cô kiểm tra ' +
        'đường mạng rồi tải lại trang.');
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
