// ============================================================
// cong-truong.js — CỔNG CHUNG cho nhiều trường, làm theo cách CSDL ngành
// (truong.csdl.moet.gov.vn): mọi trường vào CÙNG một địa chỉ rồi KHAI MÃ
// TRƯỜNG của mình, không có danh sách trường nào bày ra cho ai cũng thấy.
//
// Tệp này phải nạp NGAY SAU cauhinh.js và TRƯỚC supabase-ket-noi.js.
//
// Bốn màn:
//   1. Khai mã trường  — gõ mã Sở / mã CSDL ngành / mã ngắn
//   2. Xem thử         — khung app đầy đủ với DỮ LIỆU MẪU, không cần đăng nhập
//   3. Đăng ký sử dụng — trường mới điền thông tin, gửi cho người quản trị
//   4. Lỗi tải cấu hình — mất mạng. PHẢI tách khỏi màn 1: đá thầy cô đang dùng
//      thật ra màn khai mã chỉ vì mạng chớp một nhịp là họ tưởng mất tài khoản.
//
// 🔑 GIỮ NGUYÊN NGUYÊN TẮC "hỏng thì hỏng theo hướng ĐÓNG": trang khóa sẵn
//    bằng CSS từ HTML (body class="dang-khoa"), tệp này chỉ MỞ khóa khi đã
//    xác định được trường hoặc người dùng chủ động chọn xem thử.
//
// 🔑 KHÔNG BAO GIỜ bày tên các trường khác. Gõ sai mã chỉ nhận đúng MỘT câu
//    trả lời, không gợi ý, không phân biệt "mã không có" với "mã chưa được
//    cấp quyền" — thầy cô trường này không việc gì phải biết trường kia cũng
//    dùng app (§12.6 bản kế hoạch nhân bản).
// ============================================================
(function () {
  'use strict';

  function thoat(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  var C = window.CHUNG || {};

  function hop() { return document.getElementById('cong-hop'); }

  function dauCong(phu) {
    // img/he-thong.svg — biểu trưng TRUNG TÍNH, vẽ theo logo Quản trị số. Trước
    // đây dùng img/logo.png, mà tệp đó khi ấy chính là con dấu Trường Tiểu học
    // Diễn Liên (có in tên trường và tên xã trên hình): khách lạ mở địa chỉ
    // giới thiệu lại thấy con dấu một trường cụ thể to 64px giữa màn hình.
    // Dùng SVG chứ không dùng bản ảnh có chữ: cạnh nó đã có sẵn dòng tên hệ
    // thống, thêm chữ trong logo nữa là đọc hai lần một câu.
    return '<img class="logo" src="img/he-thong.svg" alt="">' +
      '<h1>' + thoat(C.TEN_HE_THONG || 'Hệ thống Quản trị số Trường học') + '</h1>' +
      '<div class="loi-moi">' + thoat(phu) + '</div>';
  }

  function chanCong() {
    return '<div class="chan"><b>Hệ thống quản trị Trường tiểu học trong giai đoạn mới.</b> ' +
      'Việc xác thực do Google thực hiện. Dữ liệu cá nhân được bảo vệ theo ' +
      'Luật Bảo vệ dữ liệu cá nhân năm 2025.</div>';
  }

  // ── MÀN 1: khai mã trường ──────────────────────────────────
  function veManKhaiMa(loi, maCu) {
    var h = hop(); if (!h) return;
    h.innerHTML = dauCong('Thầy cô nhập mã trường để vào hệ thống của nhà trường mình.') +
      '<div class="cong-nhom">' +
      '<label class="cong-nhan" for="o-ma-truong">Mã trường</label>' +
      // KHÔNG đặt inputmode="numeric": trên iPhone nó bật bàn phím CHỈ CÓ SỐ,
      // mà mã trường còn có dạng chữ (mã ngắn, và mã cũ sau khi trường đổi mã).
      // Bàn phím không gõ được chữ là chặn cứng.
      // Mã ví dụ để 12345 — mã không có thật. Ghi mã của một trường đang dùng
      // app vào đây là tự quảng bá trường đó trên màn hình dùng chung.
      '<input class="cong-o" id="o-ma-truong" type="text" autocomplete="off" ' +
      'spellcheck="false" placeholder="Ví dụ: 12345" value="' + thoat(maCu) + '">' +
      '<div class="cong-mach">Mã trường là mã CSDL ngành được nhập khi đăng ký với Admin.</div>' +
      '</div>' +
      (loi ? '<div class="hop-loi khoa">' + thoat(loi) + '</div>' : '') +
      '<button class="nut-google cong-chinh" id="nut-vao">Vào hệ thống</button>' +
      '<div class="cong-ngan"><span>Trường chưa có tài khoản?</span></div>' +
      '<button class="nut-phu" id="nut-xem-thu">👁 Xem thử hệ thống</button>' +
      '<button class="nut-phu" id="nut-dang-ky">✍ Đăng ký sử dụng</button>' +
      chanCong();

    var o = document.getElementById('o-ma-truong');
    var nut = document.getElementById('nut-vao');

    // MỘT câu trả lời duy nhất cho mọi trường hợp không vào được. Không được
    // tách thành "mã không tồn tại" / "mã chưa được cấp quyền": tách ra là
    // người ngoài dò được mã nào đang có trong hệ thống.
    var LOI_MA = 'Mã trường không đúng hoặc chưa được cấp quyền sử dụng. ' +
      'Thầy cô kiểm tra lại mã; nếu nhà trường chưa có tài khoản thì bấm ' +
      '“Đăng ký sử dụng”.';

    function vao() {
      var ma = String(o.value || '').trim();
      if (!ma) { veManKhaiMa(LOI_MA, ''); return; }
      nut.disabled = true;
      nut.textContent = 'Đang kiểm tra…';
      window.napCauHinhTheoMa(ma).then(function (kq) {
        // MẤT MẠNG phải nói là mất mạng. Gộp chung với "mã sai" là đổ lỗi cho
        // người dùng về một việc họ làm đúng — họ sẽ gõ lại mãi rồi bỏ cuộc.
        if (kq === 'loi') {
          veManKhaiMa('Không kết nối được để kiểm tra mã trường. Mã thầy cô gõ ' +
            'có thể vẫn đúng — đây là lỗi đường mạng. Thầy cô kiểm tra mạng rồi ' +
            'bấm lại “Vào hệ thống”.', ma);
          return;
        }
        if (kq !== 'ok') { veManKhaiMa(LOI_MA, ma); return; }
        // Nạp lại kèm ?truong= để cả app khởi động lại với đúng cấu hình
        // trường, thay vì chạy tiếp trên một nửa cấu hình. Địa chỉ cũng nói rõ
        // đang ở trường nào, gửi cho nhau thì người nhận vào đúng chỗ.
        location.href = location.pathname + '?truong=' + encodeURIComponent(ma);
      }, function () {
        veManKhaiMa('Không kết nối được để kiểm tra mã trường. Thầy cô xem lại ' +
          'đường mạng rồi thử lại.', ma);
      });
    }

    nut.addEventListener('click', vao);
    o.addEventListener('keydown', function (e) { if (e.key === 'Enter') vao(); });
    document.getElementById('nut-xem-thu').addEventListener('click', function () {
      location.href = location.pathname + '?xemthu=1';
    });
    document.getElementById('nut-dang-ky').addEventListener('click', function () {
      veManDangKy();
    });
    o.focus();
  }

  // ── MÀN 4: không tải được cấu hình ─────────────────────────
  // Tách hẳn khỏi màn khai mã. Người dùng ở đây là thầy cô ĐANG DÙNG THẬT, chỉ
  // là mạng chớp một nhịp — bắt họ gõ lại mã trường là làm họ tưởng mất tài khoản.
  function veManLoiTai() {
    var h = hop(); if (!h) return;
    h.innerHTML = dauCong('Không tải được thông tin nhà trường.') +
      '<div class="hop-loi khoa">Máy chưa lấy được tệp cấu hình của nhà trường. ' +
      'Thường là do đường mạng chập chờn. Thầy cô kiểm tra mạng rồi bấm Tải lại; ' +
      'nếu vẫn không được thì báo quản trị viên.</div>' +
      '<button class="nut-google cong-chinh" id="nut-tai-lai-ch">↻ Tải lại trang</button>' +
      '<div class="cong-ngan"><span>hoặc</span></div>' +
      '<button class="nut-phu" id="nut-khai-ma">Nhập mã trường</button>' +
      chanCong();
    document.getElementById('nut-tai-lai-ch').addEventListener('click', function () {
      location.reload();
    });
    document.getElementById('nut-khai-ma').addEventListener('click', function () {
      veManKhaiMa();
    });
  }

  // ── MÀN 3: đăng ký sử dụng ─────────────────────────────────
  // Không có máy chủ nhận biểu mẫu, và cố ý KHÔNG dựng thêm một máy chủ nữa
  // chỉ để hứng vài chục dòng đăng ký mỗi năm. Người dùng bấm một nút là toàn
  // bộ nội dung nằm sẵn trong bộ nhớ tạm, dán vào Zalo hay thư điện tử đều được.
  var O_DK = [
    { ma: 'ten', nhan: 'Tên trường', bat: true, goi: 'Trường Tiểu học …' },
    // Nhãn KHÔNG có ngoặc đơn — soanNoiDung() cắt bỏ phần trong ngoặc khi
    // soạn nội dung gửi đi, để ngoặc thì bản đăng ký mất luôn chữ giải thích.
    { ma: 'maso', nhan: 'Mã trường ghi đúng trên CSDL ngành', bat: false, goi: 'mã trên truong.csdl.moet.gov.vn' },
    { ma: 'xa', nhan: 'Xã / phường', bat: true, goi: '' },
    { ma: 'tinh', nhan: 'Tỉnh / thành phố', bat: true, goi: '' },
    { ma: 'nguoi', nhan: 'Họ tên người liên hệ', bat: true, goi: '' },
    { ma: 'chucvu', nhan: 'Chức vụ', bat: false, goi: 'Hiệu trưởng, Phó Hiệu trưởng…' },
    { ma: 'dt', nhan: 'Số điện thoại', bat: true, goi: '' },
    { ma: 'email', nhan: 'Địa chỉ Gmail của người quản trị', bat: true, goi: 'dùng để đăng nhập hệ thống' },
    { ma: 'ghichu', nhan: 'Ghi chú', bat: false, goi: 'quy mô trường, có sáp nhập không…' }
  ];

  function veManDangKy(loi, cu) {
    var h = hop(); if (!h) return;
    cu = cu || {};
    h.innerHTML = dauCong('Nhà trường điền thông tin dưới đây rồi gửi cho người phụ trách hệ thống.') +
      '<div class="cong-form">' +
      O_DK.map(function (t) {
        return '<div class="cong-nhom">' +
          '<label class="cong-nhan" for="dk-' + t.ma + '">' + thoat(t.nhan) +
          (t.bat ? ' <b class="sao">*</b>' : '') + '</label>' +
          '<input class="cong-o" id="dk-' + t.ma + '" type="text" autocomplete="off" ' +
          'placeholder="' + thoat(t.goi) + '" value="' + thoat(cu[t.ma]) + '"></div>';
      }).join('') +
      '</div>' +
      (loi ? '<div class="hop-loi khoa">' + thoat(loi) + '</div>' : '') +
      '<div id="dk-ket-qua"></div>' +
      (coForm()
        ? '<button class="nut-google cong-chinh" id="nut-gui">📨 Gửi đăng ký</button>' +
          '<button class="nut-phu" id="nut-sao-chep">📋 Chỉ sao chép nội dung</button>'
        : '<button class="nut-google cong-chinh" id="nut-sao-chep">📋 Sao chép nội dung đăng ký</button>') +
      lienHe() +
      '<button class="nut-phu" id="nut-quay-lai">↩ Quay lại</button>' +
      chanCong();

    document.getElementById('nut-quay-lai').addEventListener('click', function () { veManKhaiMa(); });

    // Trả về dữ liệu đã điền, hoặc null nếu còn thiếu ô bắt buộc (đã vẽ lại màn
    // kèm câu nhắc). Hai nút dùng chung một hàng rào này.
    function duLieuDaDu() {
      var du = thuThap();
      var thieu = O_DK.filter(function (t) { return t.bat && !du[t.ma]; });
      if (!thieu.length) return du;
      veManDangKy('Thầy cô điền giúp: ' + thieu.map(function (t) { return t.nhan; }).join(' · '), du);
      // PHẢI cuộn tới chỗ báo lỗi. Vẽ lại innerHTML làm khung cuộn nhảy về
      // đầu, mà câu báo thiếu nằm dưới cả 9 ô — cách đó gần 1000px. Không
      // cuộn thì cô giáo bấm nút xong thấy màn hình giật lên đầu, không có gì
      // thay đổi, bấm lại vẫn thế, rồi kết luận "nút hỏng".
      var oLoi = document.querySelector('#cong-hop .hop-loi');
      if (oLoi && oLoi.scrollIntoView) oLoi.scrollIntoView({ block: 'center' });
      return null;
    }

    document.getElementById('nut-sao-chep').addEventListener('click', function () {
      var du = duLieuDaDu();
      if (du) chepVaBao(soanNoiDung(du));
    });

    var nutGui = document.getElementById('nut-gui');
    if (nutGui) nutGui.addEventListener('click', function () {
      var du = duLieuDaDu();
      if (!du) return;
      nutGui.disabled = true;
      nutGui.textContent = 'Đang gửi…';
      // Chép sẵn vào bộ nhớ tạm ngay, KHÔNG chờ kết quả gửi: đường mạng có
      // hỏng thì thầy cô vẫn dán được vào Zalo mà không phải điền lại 9 ô.
      var chu = soanNoiDung(du);
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(chu).then(null, function () {});
      }
      guiFormDangKy(du).then(function () {
        nutGui.textContent = '✅ Đã gửi';
        baoKetQua('<div class="hop-loi xong">✅ <b>Đã gửi đăng ký.</b> Người phụ trách hệ thống ' +
          'nhận được ngay và sẽ liên hệ lại theo số điện thoại hoặc Gmail thầy cô vừa ghi. ' +
          'Nội dung đăng ký cũng đã chép vào bộ nhớ tạm, thầy cô có thể dán vào Zalo gửi ' +
          'thêm cho chắc.</div>');
      }, function () {
        // Gửi hỏng thì PHẢI mở ra đường thứ hai ngay tại chỗ, kèm nguyên văn nội
        // dung — bắt thầy cô "thử lại sau" là mất luôn người đăng ký.
        nutGui.disabled = false;
        nutGui.textContent = '📨 Gửi lại';
        baoKetQua('<div class="hop-loi cho"><b>Chưa gửi được</b> — thường là do đường mạng. ' +
          'Thầy cô bấm “Gửi lại”, hoặc chép nội dung dưới đây gửi qua Zalo / thư điện tử ' +
          'cho người phụ trách hệ thống:<textarea class="cong-chep" readonly rows="10">' +
          thoat(chu) + '</textarea></div>');
      });
    });
  }

  function baoKetQua(html) {
    var o = document.getElementById('dk-ket-qua');
    if (!o) return;
    o.innerHTML = html;
    if (o.scrollIntoView) o.scrollIntoView({ block: 'nearest' });
  }

  // ── Gửi đăng ký thẳng vào Google Form của người phụ trách ──
  // Không có máy chủ riêng, và cũng KHÔNG cần: Google Form nhận được biểu mẫu
  // gửi bằng POST thường, ghi vào Google Sheet và tự báo thư. Chi phí 0 đồng.
  //
  // 🔑 mode:'no-cors' là BẮT BUỘC — Google không đặt nhãn CORS cho địa chỉ này,
  //    gửi kiểu thường thì trình duyệt chặn. Đổi lại, ta KHÔNG đọc được lời đáp:
  //    fetch chỉ báo "đã gửi đi", không nói Google có nhận không. Vì thế đường
  //    chép tay phải giữ nguyên, đừng bỏ đi cho gọn.
  function coForm() {
    var f = C.FORM_DANG_KY;
    // KHÔNG xét navigator.onLine ở đây: cờ đó chớp tắt theo mạng, mà nút thì đã
    // vẽ ra rồi. Mất mạng thì fetch tự hỏng và màn hình mở đường chép tay —
    // một lối xử lý, không phải hai.
    return !!(f && f.ID && f.O && typeof fetch === 'function' &&
      typeof URLSearchParams === 'function');
  }

  function guiFormDangKy(du) {
    var f = C.FORM_DANG_KY;
    if (!coForm()) return Promise.reject(new Error('chua khai form'));
    var b = new URLSearchParams(), co = false, k;
    for (k in f.O) {
      if (!Object.prototype.hasOwnProperty.call(f.O, k)) continue;
      if (du[k]) { b.append(f.O[k], du[k]); co = true; }
    }
    if (!co) return Promise.reject(new Error('khong co gi de gui'));
    return fetch('https://docs.google.com/forms/d/e/' + f.ID + '/formResponse', {
      method: 'POST', mode: 'no-cors', body: b
    });
  }

  function thuThap() {
    var du = {};
    O_DK.forEach(function (t) {
      var o = document.getElementById('dk-' + t.ma);
      du[t.ma] = o ? String(o.value || '').trim() : '';
    });
    return du;
  }

  function soanNoiDung(du) {
    var d = new Date();
    var dong = ['ĐĂNG KÝ SỬ DỤNG HỆ THỐNG QUẢN TRỊ SỐ TRƯỜNG HỌC', ''];
    O_DK.forEach(function (t) {
      if (du[t.ma]) dong.push(t.nhan.replace(/ \(.*\)/, '') + ': ' + du[t.ma]);
    });
    dong.push('');
    dong.push('Ngày gửi: ' + d.getDate() + '/' + (d.getMonth() + 1) + '/' + d.getFullYear());
    return dong.join('\n');
  }

  // Bộ nhớ tạm có hai đường: navigator.clipboard (cần trang chạy https) và
  // cách cũ qua ô ẩn. Trường mở bằng http hoặc trình duyệt cũ thì đường đầu
  // không có — luôn phải có đường lùi, không thì nút bấm không ra gì cả.
  function chepVaBao(chu) {
    function xong(duoc) {
      var o = document.getElementById('dk-ket-qua');
      if (!o) return;
      o.innerHTML = duoc
        ? '<div class="hop-loi xong">✅ Đã chép nội dung đăng ký. Thầy cô dán (Ctrl+V hoặc ' +
          'giữ rồi chọn Dán) vào Zalo hoặc thư điện tử để gửi cho người phụ trách hệ thống.</div>'
        : '<div class="hop-loi cho">Trình duyệt không cho chép tự động. Thầy cô chọn toàn bộ ' +
          'nội dung trong khung dưới rồi chép tay:<textarea class="cong-chep" readonly rows="10">' +
          thoat(chu) + '</textarea></div>';
      o.scrollIntoView({ block: 'nearest' });
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(chu).then(function () { xong(true); }, function () { xong(false); });
    } else {
      xong(false);
    }
  }

  // Chỉ in phần liên hệ khi đã có thật. Ô trống hoặc số bịa in lên màn hình
  // còn tệ hơn không in gì: trường gọi vào số sai rồi bỏ luôn ý định đăng ký.
  function lienHe() {
    var d = [];
    if (C.LIEN_HE_TEN) d.push(thoat(C.LIEN_HE_TEN));
    if (C.LIEN_HE_DIEN_THOAI) d.push('☎ ' + thoat(C.LIEN_HE_DIEN_THOAI));
    if (C.LIEN_HE_EMAIL) {
      d.push('✉ <a href="mailto:' + thoat(C.LIEN_HE_EMAIL) + '">' + thoat(C.LIEN_HE_EMAIL) + '</a>');
    }
    if (!d.length) return '';
    return '<div class="cong-lienhe">Gửi về: ' + d.join(' · ') + '</div>';
  }

  // ── Khởi động ──────────────────────────────────────────────
  // Chờ cauhinh.js tra xong địa chỉ này thuộc trường nào. Trong lúc chờ, trang
  // vẫn KHÓA và hộp cổng hiện "Đang tải…" (viết sẵn trong index.html).
  if (!window.CAU_HINH_SAN_SANG) return;
  window.CAU_HINH_SAN_SANG.then(function (trangThai) {
    if (trangThai === 'chua-biet') { veManKhaiMa(); return; }
    if (trangThai === 'loi') { veManLoiTai(); return; }
    // ── ĐƯỜNG LÙI trên băng xem thử ────────────────────────────────────────
    // Băng vàng hiện ra ở HAI hoàn cảnh khác nhau, và cả hai đều cần lối ra:
    //   · 'xem-thu'  → bản mẫu, chưa biết trường nào
    //   · 'da-biet' mà trường CHƯA NỐI CSDL → đã nhận ra trường (mã hoặc mã đã
    //     nhớ), nhưng trường còn đang cài đặt nên không có hộp đăng nhập.
    //
    // 🔴 Bản đầu chỉ xét 'xem-thu' nên hoàn cảnh thứ hai thành NGÕ CỤT: máy nhớ
    //    mã trường đang cài đặt, mở địa chỉ dùng chung là vào thẳng trường đó,
    //    băng vàng không có lối ra, hộp đăng nhập cũng không có (chưa nối CSDL
    //    thì supabase-ket-noi.js chỉ hiện "Trường đang trong quá trình cài đặt"
    //    — mà đường lùi lại nằm trong chân hộp cổng ấy). Kẹt vĩnh viễn, đúng
    //    cái đã lường trước ở chanCong() nhưng hàng rào không phủ tới.
    //    Gặp thật 21/8/2026: mở quantrisotruonghoc.com ra Hưng Đông.
    //
    // Trường có TÊN MIỀN RIÊNG thì KHÔNG bày — thầy cô ở đúng nhà mình, hỏi
    // "có phải trường của thầy cô không" là vô duyên. Giống hệt luật ở chanCong().
    var canLui = (trangThai === 'xem-thu') ||
                 (trangThai === 'da-biet' && !window.DA_NOI && window.THEO_TEN_MIEN !== true);
    if (canLui) {
      var b = document.getElementById('bang-xem-thu');
      if (b) b.innerHTML += ' · <a href="' + thoat(location.pathname) + '?doitruong=1">↩ Về cổng đăng nhập</a>';
    }
    // 'da-biet' và 'xem-thu' → nhường việc cho supabase-ket-noi.js
  });
})();
