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
      // Từ 20/8/2026 img/logo.png cũng chính là logo Quản trị số nên hai đường
      // ra cùng một hình; vẫn giữ đường dự phòng để trường nào thả logo riêng
      // vào img/<mã>/logo.png là dùng được ngay, thiếu tệp cũng không vỡ giao diện.
      '" alt="" onerror="this.onerror=null;this.src=\'img/he-thong.svg\'">' +
      '<h1>Hệ thống Quản trị số<br><span class="dien-ten-truong">' +
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
    // href tương đối chỉ-truy-vấn — không ghép location.pathname (pathname dạng
    // //evil.com/ ghép vào là thành địa chỉ tuyệt đối sang tên miền khác).
    var lui = (window.THEO_TEN_MIEN !== true)
      ? '<div class="cong-lui"><a href="?doitruong=1">' +
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
          // Trường vừa mở: người được nhà trường khai làm quản trị mà vẫn dừng
          // ở đây thì gần như chắc chắn địa chỉ khai trong đơn khác địa chỉ vừa
          // đăng nhập. Nói thẳng ra, đừng để họ ngồi đợi một lời duyệt không
          // bao giờ tới — trường mới chưa có ai đủ quyền mà duyệt cả.
          '<br><br>Nếu thầy cô là <b>người nhà trường cử làm quản trị</b> mà vẫn thấy màn ' +
          'hình này: địa chỉ vừa đăng nhập khác với địa chỉ nhà trường ghi trong đơn đăng ký. ' +
          'Thầy cô đăng nhập lại đúng địa chỉ đó, hoặc báo người phụ trách hệ thống.' +
          // Người vào nhầm địa chỉ trường khác dừng đúng ở đây — nhắc một câu để
          // họ tìm đường về, nhưng KHÔNG nêu tên trường nào cả.
          // Trước câu này chỉ hiện khi đếm được ≥2 trường trong window.DS_TRUONG;
          // mảng đó nay đã bỏ nên đếm mãi ra 0 và câu nhắc không bao giờ hiện.
          '<br><br>Nếu thầy cô công tác ở trường khác: mỗi trường có một hệ thống ' +
          'và một đường dẫn riêng — thầy cô mở đúng đường dẫn nhà trường mình đã cấp.') +
      '</div>' +
      '<button class="nut-phu" id="nut-thoat-cong">↩ Đăng xuất</button>' +
      chanCong();
    document.getElementById('nut-thoat-cong').addEventListener('click', dangXuat);
  }

  // ── ĐÃ GỠ: nút "Tôi là quản trị viên của trường" (22/8/2026, thầy Chung chốt)
  // Trước đây cơ sở dữ liệu mới chưa có quản trị viên thì người ĐẦU TIÊN đăng
  // nhập Google bấm một nút là thành admin (sql/36 + sql/37). Lỗ hổng không nằm
  // ở kỹ thuật mà ở quy trình: gửi đường dẫn cho nhà trường, một giáo viên tò
  // mò bấm vào trước Hiệu trưởng là người đó thành quản trị — và cửa đóng vĩnh
  // viễn, sửa phải vào SQL Editor.
  //
  // Nay quyền quản trị do ADMIN HỆ THỐNG cấp: nhà trường khai "Địa chỉ Gmail
  // của người quản trị" trong đơn đăng ký, người dựng cơ sở dữ liệu gieo sẵn
  // địa chỉ ấy vào danh sách mời với vai trò 'admin' (sql/51, hàm
  // gieo_quan_tri). Người đó đăng nhập là vào thẳng, không phải bấm gì.
  //
  // Nghĩa là màn "chờ duyệt" ở trên KHÔNG còn lối rẽ nào nữa — ai thấy nó thì
  // đúng là chưa được cấp quyền, và câu chữ ở đó phải tự nó đủ chỉ đường.

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
    // prompt: 'select_account' — BẮT Google hỏi chọn tài khoản mỗi lần. Không có
    // nó thì máy nào đang đăng nhập sẵn một tài khoản Google là Google lẳng lặng
    // dùng luôn tài khoản ấy. Thầy cô có cả Gmail riêng lẫn mail nhà trường trên
    // cùng một điện thoại sẽ KHÔNG có đường đổi sang tài khoản kia — vào nhầm
    // rồi chỉ còn cách đăng xuất khỏi Google, việc mà ít người nghĩ ra.
    may.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: location.origin + location.pathname + (location.search || ''),
        queryParams: { prompt: 'select_account' }
      }
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
