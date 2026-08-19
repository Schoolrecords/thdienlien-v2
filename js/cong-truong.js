// ============================================================
// cong-truong.js — CỔNG CHUNG cho nhiều trường, làm theo cách CSDL ngành
// (truong.csdl.moet.gov.vn): mọi trường vào CÙNG một địa chỉ rồi KHAI MÃ
// TRƯỜNG của mình, không có danh sách trường nào bày ra cho ai cũng thấy.
//
// Tệp này phải nạp NGAY SAU cauhinh.js và TRƯỚC supabase-ket-noi.js.
//
// Ba màn:
//   1. Khai mã trường  — gõ mã Sở (11819) / mã CSDL ngành / mã ngắn
//   2. Xem thử         — khung app đầy đủ với DỮ LIỆU MẪU, không cần đăng nhập
//   3. Đăng ký sử dụng — trường mới điền thông tin, gửi cho người quản trị
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

  // Ngoài tên miền cổng chung thì tệp này không có việc gì để làm: trường có
  // tên miền riêng vào thẳng như xưa, không ai phải gõ mã.
  if (!window.O_CONG_CHUNG) return;

  function thoat(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  var C = window.CHUNG || {};

  // Các thẻ script nằm CUỐI <body>, nên lúc tệp này chạy thì #cong-hop và
  // #bang-xem-thu đã có sẵn — vẽ được NGAY, không phải chờ DOMContentLoaded.
  // Chờ mới là hại: HTML ghi cứng tên "Trường Tiểu học Diễn Liên" trong hộp
  // cổng làm chỗ dựa lúc chưa có JS, chờ một nhịp là người lạ vào cổng chung
  // thấy loé tên một trường cụ thể rồi mới đổi. Vẫn giữ nhánh chờ phòng khi
  // sau này ai đó chuyển thẻ script lên <head>.
  function veKhiCoDom(viec) {
    if (document.getElementById('cong-hop')) viec();
    else document.addEventListener('DOMContentLoaded', viec);
  }

  // ══════════════════════════════════════════════════════════
  // CHẾ ĐỘ XEM THỬ — ?xemthu=1
  // Chạy đồng bộ NGAY LÚC NÀY, trước khi các tệp khác đọc CAU_HINH.
  //
  // Tên trường mẫu cố tình đặt là "Minh Họa" — đối chiếu bảng 513 trường tiểu
  // học của Sở, không trường nào trùng tên. Đặt tên một trường có thật vào bản
  // mẫu là có ngày số liệu giả bị chụp màn hình rồi lan đi như số liệu thật.
  // ══════════════════════════════════════════════════════════
  //
  // 🔴 CHỈ chạy khi CHƯA xác định được trường. Bản đầu quên chốt này nên
  //    `?cong=1&xemthu=1` lật được trang thật của nhà trường sang bản mẫu:
  //    gửi cho thầy cô đường dẫn tieuhocdienlien.com kèm hai tham số đó là họ
  //    thấy đúng tên miền quen thuộc mà nội dung là "Trường Tiểu học Minh Họa"
  //    với số liệu bịa. Không rò dữ liệu thật, nhưng phá nguyên tắc "trên tên
  //    miền riêng, hành vi phải y hệt như cũ" — và phá chính lời hứa ghi trong
  //    chú thích ?cong=1 ở cauhinh.js. Nay tên miền riêng luôn thắng.
  var LA_XEM_THU = /[?&]xemthu=1/.test(location.search) && window.CHUA_CHON_TRUONG;

  if (LA_XEM_THU) {
    var k;
    var mau = {
      MA: '', MA_SO: '', MA_MOET: '', TEN_MIEN: [],
      DIA_CHI: '', KHOA_CONG_KHAI: '',        // để trống → DA_NOI = false → dùng dữ liệu mẫu
      TEN_TRUONG: 'Trường Tiểu học Minh Họa',
      DIA_CHI_TRUONG: 'Bản xem thử — không phải trường có thật',
      DIA_DANH: '', DON_VI_CHU_QUAN: '', CO_QUAN_QUAN_LY: '',
      CHU_QUAN_THUONG: '', CO_QUAN_THUONG: '',
      HIEU_TRUONG: '', PHO_HIEU_TRUONG: '', DIEN_THOAI: '', EMAIL_TRUONG: '',
      SLOGAN: 'Bản xem thử của hệ thống Quản trị số Trường học',
      MUC_TIEU_CHUAN_QG: '', MUC_CHUAN_QG: '',
      THU_MUC_ANH: 'img/', SO_LOP: 0, SO_HOC_SINH: 0, SO_CBGV: 0
    };
    for (k in C) if (Object.prototype.hasOwnProperty.call(C, k) && !(k in mau)) mau[k] = C[k];
    window.CAU_HINH = mau;
    window.CAU_HINH.NAM_HOC = window.tinhNamHoc(mau.MOC_DOI_NAM_HOC);
    window.DA_NOI = false;
    window.CHUA_CHON_TRUONG = false;
    window.MA_TRUONG = '';
    window.LA_XEM_THU = true;

    // Thêm đường về cổng vào băng xem thử. Không có nó thì người xem thử mắc
    // kẹt trong bản mẫu, phải tự sửa địa chỉ mới ra được.
    veKhiCoDom(function () {
      var b = document.getElementById('bang-xem-thu');
      if (b) b.innerHTML += ' · <a href="' + thoat(location.pathname) + '">↩ Về cổng đăng nhập</a>';
    });
    return;
  }

  // Đã xác định được trường (tên miền con, ?truong=, hoặc lần trước đã gõ mã)
  // → nhường việc cho supabase-ket-noi.js, cổng đăng nhập hiện như thường.
  if (!window.CHUA_CHON_TRUONG) return;

  // ══════════════════════════════════════════════════════════
  // TỪ ĐÂY: chưa biết người vào thuộc trường nào → vẽ màn khai mã trường.
  // Trang vẫn KHÓA. Tuyệt đối không gọi remove('dang-khoa') ở nhánh này.
  // ══════════════════════════════════════════════════════════

  function hop() { return document.getElementById('cong-hop'); }

  function dauCong(phu) {
    // img/he-thong.svg — biểu trưng TRUNG TÍNH. Trước đây dùng img/logo.png,
    // mà tệp đó chính là con dấu Trường Tiểu học Diễn Liên (có in tên trường
    // và tên xã trên hình): khách lạ mở địa chỉ giới thiệu lại thấy con dấu
    // một trường cụ thể to 64px ngay giữa màn hình.
    return '<img class="logo" src="img/he-thong.svg" alt="">' +
      '<h1>' + thoat(C.TEN_HE_THONG || 'Hệ thống Quản trị số Trường học') + '</h1>' +
      '<div class="loi-moi">' + thoat(phu) + '</div>';
  }

  function chanCong() {
    return '<div class="chan">Hệ thống dùng chung cho nhiều trường, <b>mỗi trường một cơ sở ' +
      'dữ liệu riêng biệt</b>. Việc xác thực do Google thực hiện, nhà trường không lưu giữ ' +
      'mật khẩu. Dữ liệu cá nhân được bảo vệ theo Luật Bảo vệ dữ liệu cá nhân năm 2025.</div>';
  }

  // ── MÀN 1: khai mã trường ──────────────────────────────────
  function veManKhaiMa(loi, maCu) {
    var h = hop(); if (!h) return;
    h.innerHTML = dauCong('Thầy cô nhập mã trường để vào hệ thống của nhà trường mình.') +
      '<div class="cong-nhom">' +
      '<label class="cong-nhan" for="o-ma-truong">Mã trường</label>' +
      // KHÔNG đặt inputmode="numeric": trên iPhone nó bật bàn phím CHỈ CÓ SỐ,
      // mà timTruongTheoMa còn nhận cả mã dạng chữ (mã ngắn, và mã cũ trong
      // MA_KHAC sau này). Bàn phím không gõ được chữ là chặn cứng.
      // Mã ví dụ để 12345 — mã không có thật. Trước đây ghi 11819 là mã Diễn
      // Liên: đây là màn dùng chung cho MỌI trường, và sau sáp nhập 11819 chỉ
      // còn là mã một phân hiệu.
      '<input class="cong-o" id="o-ma-truong" type="text" autocomplete="off" ' +
      'spellcheck="false" placeholder="Ví dụ: 12345" value="' + thoat(maCu) + '">' +
      '<div class="cong-mach">Mã trường do Sở Giáo dục và Đào tạo cấp (5 chữ số). ' +
      'Dùng mã trong CSDL ngành cũng được.</div>' +
      '</div>' +
      (loi ? '<div class="hop-loi khoa">' + thoat(loi) + '</div>' : '') +
      '<button class="nut-google cong-chinh" id="nut-vao">Vào hệ thống</button>' +
      '<div class="cong-ngan"><span>Trường chưa có tài khoản?</span></div>' +
      '<button class="nut-phu" id="nut-xem-thu">👁 Xem thử hệ thống</button>' +
      '<button class="nut-phu" id="nut-dang-ky">✍ Đăng ký sử dụng</button>' +
      chanCong();

    var o = document.getElementById('o-ma-truong');

    function vao() {
      var ma = window.timTruongTheoMa(o.value);
      if (!ma) {
        // MỘT câu trả lời duy nhất cho mọi trường hợp sai. Không được tách
        // thành "mã không tồn tại" / "mã chưa được cấp quyền": tách ra là
        // người ngoài dò được mã nào đang có trong hệ thống.
        veManKhaiMa('Mã trường không đúng hoặc chưa được cấp quyền sử dụng. ' +
          'Thầy cô kiểm tra lại mã; nếu nhà trường chưa có tài khoản thì bấm ' +
          '“Đăng ký sử dụng”.', o.value);
        return;
      }
      try { localStorage.setItem('ma_truong', ma); } catch (e) { /* bỏ qua */ }
      // Đi kèm ?truong= để địa chỉ nói rõ đang ở trường nào — không phụ thuộc
      // vào việc trình duyệt có cho ghi nhớ hay không.
      location.href = location.pathname + '?truong=' + encodeURIComponent(ma);
    }

    document.getElementById('nut-vao').addEventListener('click', vao);
    o.addEventListener('keydown', function (e) { if (e.key === 'Enter') vao(); });
    document.getElementById('nut-xem-thu').addEventListener('click', function () {
      location.href = location.pathname + '?xemthu=1';
    });
    document.getElementById('nut-dang-ky').addEventListener('click', function () {
      veManDangKy();
    });
    o.focus();
  }

  // ── MÀN 2: đăng ký sử dụng ─────────────────────────────────
  // Không có máy chủ nhận biểu mẫu, và cố ý KHÔNG dựng thêm một máy chủ nữa
  // chỉ để hứng vài chục dòng đăng ký mỗi năm. Người dùng bấm một nút là toàn
  // bộ nội dung nằm sẵn trong bộ nhớ tạm, dán vào Zalo hay thư điện tử đều được.
  var O_DK = [
    { ma: 'ten', nhan: 'Tên trường', bat: true, goi: 'Trường Tiểu học …' },
    { ma: 'maso', nhan: 'Mã trường (Sở GD&ĐT cấp)', bat: false, goi: '5 chữ số' },
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
      '<button class="nut-google cong-chinh" id="nut-sao-chep">📋 Sao chép nội dung đăng ký</button>' +
      lienHe() +
      '<button class="nut-phu" id="nut-quay-lai">↩ Quay lại</button>' +
      chanCong();

    document.getElementById('nut-quay-lai').addEventListener('click', function () { veManKhaiMa(); });
    document.getElementById('nut-sao-chep').addEventListener('click', function () {
      var du = thuThap();
      var thieu = O_DK.filter(function (t) { return t.bat && !du[t.ma]; });
      if (thieu.length) {
        veManDangKy('Thầy cô điền giúp: ' + thieu.map(function (t) { return t.nhan; }).join(' · '), du);
        // PHẢI cuộn tới chỗ báo lỗi. Vẽ lại innerHTML làm khung cuộn nhảy về
        // đầu, mà câu báo thiếu nằm dưới cả 9 ô — cách đó gần 1000px. Không
        // cuộn thì cô giáo bấm nút xong thấy màn hình giật lên đầu, không có gì
        // thay đổi, bấm lại vẫn thế, rồi kết luận "nút hỏng".
        var oLoi = document.querySelector('#cong-hop .hop-loi');
        if (oLoi && oLoi.scrollIntoView) oLoi.scrollIntoView({ block: 'center' });
        return;
      }
      chepVaBao(soanNoiDung(du));
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

  // ── Khởi động ──
  veKhiCoDom(function () { veManKhaiMa(); });
})();
