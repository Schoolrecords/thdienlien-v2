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

  // ⛔ HÀNG RÀO 1 — js/cauhinh.js phải chạy TRỌN VẸN thì mới tin được các cờ
  //    bên dưới. Cờ vắng mặt không có nghĩa là "trường chưa nối CSDL", nó cũng
  //    có thể nghĩa là "tệp cấu hình chưa chạy" — và lúc đó ta chưa biết gì cả,
  //    phải đóng. Xem khối chú thích cuối js/cauhinh.js.
  //    Hỏng ở đây thì trang treo mãi ở màn "Đang tải…" — đó là hỏng ĐÚNG hướng:
  //    thà không vào được còn hơn mở toang.
  if (window.CAU_HINH_XONG !== true) return;
  if (!window.CAU_HINH_SAN_SANG) return;

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
      // Trường chưa gửi logo riêng → quay về biểu trưng TRUNG TÍNH.
      // img/logo.png là con dấu của MỘT trường cụ thể, đừng lấy làm ảnh chung.
      '" alt="" onerror="this.onerror=null;this.src=\'img/he-thong.svg\'">' +
      '<h1>Hệ thống Hồ sơ số<br><span class="dien-ten-truong">' +
      thoat(C.TEN_TRUONG) + '</span></h1>';
  }

  function chanCong() {
    // ⛔ KHÔNG bày ô chọn trường ở đây. App dùng chung cho nhiều trường, nhưng
    //    mỗi trường phải thấy MỘT MÌNH mình: thầy cô Diễn Liên không việc gì
    //    phải biết trường Châu Đình cũng dùng app này, và ngược lại.
    //    Phân biệt trường bằng ĐỊA CHỈ (tên miền riêng, hoặc ?truong=<mã> mà
    //    nhà trường cấp cho thầy cô), không bằng ô chọn. Xem §12.6 bản kế hoạch.
    //    Riêng khi trường KHÔNG được nhận ra từ tên miền — tức người dùng đang ở
    //    một địa chỉ dùng chung và đã tự khai mã — thì phải có ĐƯỜNG LÙI: gõ
    //    nhầm mã một lần là máy nhớ, không có nút này thì kẹt vĩnh viễn ở cổng
    //    trường lạ. Đây là một ĐƯỜNG DẪN, không phải danh sách — không lộ tên ai.
    var lui = (window.THEO_TEN_MIEN !== true)
      ? '<div class="cong-lui"><a href="' + thoat(location.pathname) + '?doitruong=1">' +
        '↩ Không phải trường của thầy cô? Nhập lại mã trường</a></div>'
      : '';
    return lui + '<div class="chan">Nhà trường <b>không lưu giữ mật khẩu</b> Gmail của thầy cô. ' +
      'Việc xác thực do Google thực hiện. Dữ liệu cá nhân được bảo vệ theo ' +
      'Luật Bảo vệ dữ liệu cá nhân năm 2025.</div>';
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
          'Gmail khác với địa chỉ đã đăng ký, hãy đăng xuất rồi đăng nhập lại đúng địa chỉ đó.' +
          // Người vào nhầm địa chỉ trường khác dừng đúng ở đây — nhắc một câu để
          // họ tìm đường về, nhưng KHÔNG nêu tên trường nào cả.
          // Trước câu này chỉ hiện khi đếm được ≥2 trường trong window.DS_TRUONG;
          // mảng đó nay đã bỏ nên đếm mãi ra 0 và câu nhắc không bao giờ hiện.
          '<br><br>Nếu thầy cô công tác ở trường khác: mỗi trường có một hệ thống ' +
          'và một đường dẫn riêng — thầy cô mở đúng đường dẫn nhà trường mình đã cấp.') +
      '</div>' +
      '<button class="nut-phu" id="nut-thoat-cong">↩ Đăng xuất</button>' +
      '<div id="khu-admin-dau"></div>' +
      chanCong();
    document.getElementById('nut-thoat-cong').addEventListener('click', dangXuat);
    if (!laKhoa) hoiCoAdminChua();
  }

  // ── Trường MỚI: người đăng nhập đầu tiên tự nhận quyền quản trị ──
  // Bài toán con gà - quả trứng: CSDL mới dựng thì chưa ai là admin, mà không
  // có admin thì không ai cấp quyền cho ai. Trước đây phải chạy một câu UPDATE
  // bằng tay ở SQL Editor. Nay hàm nhan_quyen_admin_dau_tien() (sql/36) mở
  // đúng MỘT lần: có một quản trị viên rồi là khoá vĩnh viễn.
  function hoiCoAdminChua() {
    var khu = document.getElementById('khu-admin-dau');
    if (!khu || !may) return;
    may.rpc('tinh_trang_cai_dat').then(function (r) {
      // Lỗi ở đây là chuyện thường (chưa chạy sql/36) — im lặng, đừng dọa người dùng
      if (r.error || !r.data || r.data.so_admin > 0) return;
      khu.innerHTML =
        '<div class="hop-loi cho" style="margin-top:12px">' +
        '<b>🚀 Hệ thống này chưa có quản trị viên.</b><br>' +
        'Nếu thầy cô là người được giao quản trị hệ thống của nhà trường, bấm nút dưới ' +
        'để nhận quyền và bắt đầu khai báo. Chỉ người ĐẦU TIÊN bấm được — sau đó nút này ' +
        'biến mất, ai muốn có quyền phải do quản trị viên cấp.</div>' +
        '<button class="nut-google" id="nut-nhan-admin">Tôi là quản trị viên của trường</button>';
      document.getElementById('nut-nhan-admin').addEventListener('click', function () {
        if (!window.confirm('Nhận quyền quản trị hệ thống?\n\n' +
          'Thầy cô sẽ là người khai báo thông tin trường và cấp quyền cho những người khác. ' +
          'Chỉ bấm nếu nhà trường giao việc này cho thầy cô.')) return;
        this.disabled = true; this.textContent = 'Đang nhận quyền…';
        may.rpc('nhan_quyen_admin_dau_tien').then(function (kq) {
          if (kq.error) { window.alert('Không nhận được quyền.\n\n' + kq.error.message); location.reload(); return; }
          window.alert('Xong. Thầy cô đã là quản trị viên.\n\n' +
            'Trang sẽ tải lại. Vào Quản trị → thẻ 🚀 Cài đặt để khai báo nhà trường.');
          location.reload();
        }).catch(function (e) {
          window.alert('Không gọi được máy chủ.\n\n' + ((e && e.message) || e));
          location.reload();
        });
      });
    }).catch(function () { /* im lặng */ });
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
    // 🔴 PHẢI GIỮ LẠI ?truong=<mã> khi Google trả về.
    //
    // Bản cũ chỉ gửi origin + pathname, tức là RƠI MẤT phần sau dấu hỏi. Trường
    // nào vào bằng ?truong=<mã> trên tên miền của một trường khác (cách chào
    // hàng khi họ chưa có tên miền riêng) mà bấm đăng nhập, thì lúc Google trả
    // về địa chỉ chỉ còn trơ tên miền → app nhận diện theo TÊN MIỀN → họ rơi
    // vào CƠ SỞ DỮ LIỆU CỦA TRƯỜNG CHỦ TÊN MIỀN. Đăng nhập xong lại thành
    // "tài khoản chờ duyệt" ở một trường hoàn toàn xa lạ.
    //
    // Giữ nguyên cả chuỗi truy vấn là xong. Địa chỉ TRẦN thì chuỗi này rỗng nên
    // hành vi không đổi một chút nào — không đụng gì tới thầy cô đang dùng thật.
    //
    // ⚠️ Bên Supabase (Authentication → URL Configuration → Redirect URLs) phải
    //    có mẫu bao được chuỗi truy vấn, ví dụ https://<tên miền>/** — nếu chỉ
    //    khai đúng địa chỉ trần thì Google trả về sẽ bị từ chối.
    may.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: location.origin + location.pathname + (location.search || '') }
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
  // Chờ CẢ HAI: cây HTML dựng xong, và cauhinh.js tra xong địa chỉ này thuộc
  // trường nào. Cấu hình nay nằm ở tệp riêng (cau-hinh/…) nên phải tải về —
  // các cờ CHUA_CHON_TRUONG / DA_NOI chỉ có nghĩa SAU khi tải xong.
  function khiDomXong(viec) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', viec);
    else viec();
  }

  Promise.all([
    window.CAU_HINH_SAN_SANG,
    new Promise(function (ok) { khiDomXong(ok); })
  ]).then(function (kq) {
    var trangThai = kq[0];

    // ⛔ HÀNG RÀO 2 — chưa biết người vào thuộc trường nào (màn khai mã), hoặc
    //    không tải được cấu hình. Cả hai trường hợp js/cong-truong.js đang giữ
    //    màn hình; tệp này không có việc gì và TUYỆT ĐỐI không được gỡ khóa.
    if (trangThai === 'chua-biet' || trangThai === 'loi') return;

    // Chưa cấu hình CSDL (đang xem thử, hoặc trường chưa dựng Supabase) → phải
    // MỞ khóa vì trang khóa sẵn từ HTML. Không có nhánh này thì bản mẫu trắng màn.
    if (!window.DA_NOI) {
      document.body.classList.remove('dang-khoa');
      var congDemo = document.getElementById('cong-vao');
      if (congDemo) congDemo.classList.add('an');

      // 🔴 PHẢI NÓI RÕ TÌNH TRẠNG. Nhánh này trước đây return thẳng, mà
      //    veKhuTaiKhoan() nằm mãi phía dưới nên KHÔNG BAO GIỜ chạy → góc tài
      //    khoản là một ô rỗng, không tệp nào khác điền vào.
      //    Hậu quả thật: thầy admin trường mới gõ đúng mã, app mở ra mang đúng
      //    tên trường mình, đủ hồ sơ và thống kê — rồi thầy đi tìm nút đăng
      //    nhập để nhận quyền quản trị và KHÔNG THẤY Ở ĐÂU CẢ.
      //    Ở đây thật sự chưa có gì để đăng nhập (trường chưa dựng cơ sở dữ
      //    liệu), nên không dựng nút giả — nhưng phải nói cho người ta biết.
      var khuChua = document.getElementById('khu-tai-khoan');
      if (khuChua && window.CAU_HINH && window.CAU_HINH.MA) {
        khuChua.innerHTML =
          '<div class="chip-chua-mo" title="Trường chưa dựng cơ sở dữ liệu riêng">' +
          '<b>Chưa mở đăng nhập</b><small>Trường đang trong quá trình cài đặt</small></div>';
      }
      return;
    }

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
