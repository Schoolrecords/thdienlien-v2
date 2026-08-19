// ============================================================
// CẤU HÌNH CÁC TRƯỜNG DÙNG CHUNG APP NÀY — thdienlien-v2
// File DUY NHẤT cần sửa khi thêm một trường hoặc nối backend thật.
//
// MỘT mã nguồn — NHIỀU trường, mỗi trường MỘT dự án Supabase riêng.
// Vì sao gộp mọi trường vào một tệp chứ không tách js/truong/<mã>.js:
// trang không có bước build, thẻ <script> nạp đồng bộ, nên không thể chọn
// tệp cấu hình theo ?truong= trước khi các tệp khác chạy. Khóa công khai
// KHÔNG phải bí mật (hàng rào nằm ở RLS) nên để chung không sao.
// Quá ~8 trường thì mới cần tính chuyện tách tệp.
//
// Khi DIA_CHI/KHOA_CONG_KHAI của trường đang chọn để trống → trang chạy
// CHẾ ĐỘ XEM THỬ (dữ liệu mẫu trong js/du-lieu-demo.js, không cần đăng nhập).
// Nhờ vậy trường mới xem được bản demo mang tên mình TRƯỚC khi dựng CSDL.
//
// ⚠️ Cấu hình ở đây chỉ là bản DỰ PHÒNG lúc chưa đăng nhập. Đăng nhập xong,
//    js/du-lieu-sql.js ghi đè bằng bảng cau_hinh trên CSDL — đó mới là nguồn
//    chuẩn. Đổi tên hiệu trưởng, quy mô trường… sửa CSDL, KHÔNG sửa mã.
// ============================================================

// --- Phần dùng chung cho MỌI trường ---
window.CHUNG = {
  // App xếp Thời khóa biểu (dự án riêng: Schoolrecords/tkb) — Hồ sơ số KHÔNG
  // quản lý thời khóa biểu và KHÔNG bố trí dạy thay, app kia đã làm cả hai và
  // làm sâu hơn. Ở đây chỉ có một nút mở sang đó. Xem mục 13.7 sổ dự án.
  URL_TKB: 'https://schoolrecords.github.io/tkb/',

  // Mốc đổi năm học mặc định. Trường nào khác thì đặt đè trong mục của trường,
  // hoặc sửa khóa 'moc_doi_nam_hoc' trong bảng cau_hinh của trường đó.
  MOC_DOI_NAM_HOC: '30/08',

  // Tên hệ thống dùng ở CỔNG CHUNG, khi chưa biết người vào thuộc trường nào.
  TEN_HE_THONG: 'Hệ thống Quản trị số Trường học',

  // ── TÊN MIỀN CỔNG CHUNG — cách làm của CSDL ngành ──
  // Mọi trường vào CÙNG một địa chỉ rồi KHAI MÃ TRƯỜNG, giống
  // truong.csdl.moet.gov.vn. Mở địa chỉ trong danh sách này thì app KHÔNG mặc
  // định vào trường nào cả — nó dừng ở màn khai mã (js/cong-truong.js).
  // ⚠️ Tên miền RIÊNG của từng trường (TEN_MIEN bên dưới) KHÔNG được có mặt ở
  //    đây: thầy cô Diễn Liên mở tieuhocdienlien.com phải vào thẳng như xưa,
  //    không đời nào phải gõ mã.
  TEN_MIEN_CONG: ['quantrisotruonghoc.com'],

  // ── Liên hệ in trên màn Đăng ký sử dụng ──
  // ĐỂ TRỐNG có chủ ý: kho mã này CÔNG KHAI, điền vào là cả mạng đọc được và
  // máy quét thư rác lấy được. Thầy Chung chốt số/địa chỉ muốn công khai rồi
  // mới điền. Trống thì màn đăng ký tự ẩn phần liên hệ, không hiện ô rỗng.
  LIEN_HE_TEN: '',
  LIEN_HE_DIEN_THOAI: '',
  LIEN_HE_EMAIL: '',
};

// --- Từng trường ---
window.DS_TRUONG = {

  dienlien: {
    MA: 'dienlien',
    // ══════════════════════════════════════════════════════════
    // MÃ TRƯỜNG — cổng chung nhận HẾT các mã dưới đây
    //
    // MA_SO   mã CHÍNH, in ra màn hình. Bảng mã trường tiểu học do Sở GD&ĐT
    //         Nghệ An thống nhất (513 trường, 5 chữ số, không mã nào trùng —
    //         MatruongTH.xlsx thầy Chung cấp 19/8/2026).
    // MA_MOET mã CSDL ngành (truong.csdl.moet.gov.vn). Nhiều thầy cô quen mã
    //         này hơn; còn dùng lại khi làm chức năng xuất Excel MOET.
    // MA_KHAC mọi mã CŨ vẫn phải nhận. Xem khối 🔴 ngay dưới đây.
    //
    // 🔴 MÃ HIỆN TẠI LÀ TẠM — thầy Chung xác nhận 19/8/2026.
    //    Sáp nhập xong, ba trường gộp thành MỘT trường mang mã MỚI (chưa biết),
    //    còn 11819 · 11827 · 11806 tụt xuống thành mã của ba PHÂN HIỆU.
    //    Đến lúc đó phải làm ĐÚNG HAI việc, đừng làm hơn:
    //      1. MA_SO = mã mới của trường sáp nhập
    //      2. dồn '11819' vào MA_KHAC  ← ĐỪNG QUÊN BƯỚC NÀY
    //    Quên bước 2 là 37 thầy cô gõ mã quen thuộc rồi nhận "mã không đúng".
    //    Đổi mã đăng nhập của cả trường trong một đêm là chuyện không nên làm
    //    với người dùng, mà lại chẳng được lợi gì.
    //    Mã của từng PHÂN HIỆU thì ở CSDL (`co_so.ma_so`, sql/38), KHÔNG ghi
    //    vào đây — phân hiệu là dữ liệu của trường, không phải cấu hình app.
    // ══════════════════════════════════════════════════════════
    MA_SO: '11819',
    MA_MOET: '40425419',
    MA_KHAC: [],
    TEN_MIEN: ['tieuhocdienlien.com'],
    // --- Supabase (dự án th-dien-lien, dựng 10/8/2026) ---
    DIA_CHI: 'https://qbfyolhehltfrefudexz.supabase.co',
    KHOA_CONG_KHAI: 'sb_publishable_VLVtHQ2iHbbodarb0N0QAQ_kohJ0-_7', // khóa công khai — hàng rào nằm ở RLS
    // --- Thông tin trường ---
    TEN_TRUONG: 'Trường Tiểu học Diễn Liên',
    DIA_CHI_TRUONG: 'Xã Quảng Châu, Tỉnh Nghệ An',
    DIA_DANH: 'Quảng Châu',            // đứng trước ngày tháng trong văn bản
    DON_VI_CHU_QUAN: 'UBND XÃ QUẢNG CHÂU',
    CO_QUAN_QUAN_LY: 'SỞ GIÁO DỤC VÀ ĐÀO TẠO NGHỆ AN',
    // Hai khoá trên viết HOA vì đứng ở tiêu đề văn bản (NĐ 30). Hai khoá dưới
    // là chính hai tên đó viết thường, dùng khi nằm giữa câu văn — KHÔNG tự
    // đổi hoa/thường bằng mã, máy không biết đâu là tên riêng.
    CHU_QUAN_THUONG: 'UBND xã Quảng Châu',
    CO_QUAN_THUONG: 'Sở Giáo dục và Đào tạo Nghệ An',
    HIEU_TRUONG: 'Nguyễn Thị Hòa',
    PHO_HIEU_TRUONG: 'Trần Thanh Chung',
    DIEN_THOAI: '',                    // hiện Báo cáo TĐG bỏ trống mục này — xin số rồi điền
    EMAIL_TRUONG: '',
    SLOGAN: 'Vững bước tương lai – Tự tin hội nhập',
    // Trường đã đạt chuẩn quốc gia MỨC ĐỘ 2 từ năm 2022 (thầy Chung xác nhận 11/8/2026)
    MUC_TIEU_CHUAN_QG: 'Giữ vững và phát triển chuẩn quốc gia Mức độ 2',
    MUC_CHUAN_QG: 'Mức 2',             // hiện ở ô số liệu trang chủ; trống thì ô đó hiện "–"
    THU_MUC_ANH: 'img/dienlien/',
    // Số dự phòng cho bản in khi chưa đếm được từ CSDL (đếm được thì luôn ưu tiên số thật)
    SO_LOP: 25,
    SO_HOC_SINH: 863,
    SO_CBGV: 37,
  },

  // ══════════════════════════════════════════════════════════
  // TRƯỜNG TIỂU HỌC CHÂU ĐÌNH — xã Quỳ Hợp, tỉnh Nghệ An
  // Nhận app từ 17/8/2026. Cũng thuộc diện sáp nhập: gộp thêm 1 trường
  // CHƯA BIẾT TÊN, sẽ khai trên app (Cơ sở → Trường tiền thân → 'du_kien').
  //
  // ⛔ DIA_CHI/KHOA_CONG_KHAI để trống → đang chạy CHẾ ĐỘ XEM THỬ.
  //    Điền hai chuỗi này (Supabase → Settings → API) sau khi dựng xong CSDL.
  // ⚠️ Ô nào để trống là CHƯA XIN ĐƯỢC thông tin, KHÔNG phải quên.
  //    Thà để trống còn hơn in nhầm tên trường khác vào văn bản đã đóng dấu.
  // ✅ DIA_CHI_TRUONG / DON_VI_CHU_QUAN: Quỳ Hợp trước đây là HUYỆN, nay ĐÃ
  //    ĐỐI CHIẾU (19/8/2026) — bảng mã trường tiểu học của Sở GD&ĐT Nghệ An
  //    ghi Tiểu học Châu Đình (11217) thuộc **xã Quỳ Hợp**. Tên xã dưới đây đúng.
  // ══════════════════════════════════════════════════════════
  chaudinh: {
    MA: 'chaudinh',
    MA_SO: '11217',                    // bảng mã Sở GD&ĐT Nghệ An — TẠM, xem khối 🔴 ở trên
    MA_MOET: '',                       // chưa xin được — hỏi trường (§C0 bản thi công)
    MA_KHAC: [],
    TEN_MIEN: [],
    DIA_CHI: '',
    KHOA_CONG_KHAI: '',
    TEN_TRUONG: 'Trường Tiểu học Châu Đình',
    DIA_CHI_TRUONG: 'Xã Quỳ Hợp, Tỉnh Nghệ An',
    DIA_DANH: 'Quỳ Hợp',
    DON_VI_CHU_QUAN: 'UBND XÃ QUỲ HỢP',
    CO_QUAN_QUAN_LY: 'SỞ GIÁO DỤC VÀ ĐÀO TẠO NGHỆ AN',
    CHU_QUAN_THUONG: 'UBND xã Quỳ Hợp',
    CO_QUAN_THUONG: 'Sở Giáo dục và Đào tạo Nghệ An',
    HIEU_TRUONG: '',
    PHO_HIEU_TRUONG: '',
    DIEN_THOAI: '',
    EMAIL_TRUONG: '',
    SLOGAN: '',
    MUC_TIEU_CHUAN_QG: '',
    MUC_CHUAN_QG: '',
    THU_MUC_ANH: 'img/chaudinh/',
    SO_LOP: 0,
    SO_HOC_SINH: 0,
    SO_CBGV: 0,
  },

};

// ============================================================
// TRA TRƯỜNG THEO MÃ — dùng ở cổng chung khi người vào tự gõ mã trường mình.
// Nhận MỌI dạng mã của trường, gõ dạng nào cũng đúng:
//   · mã Sở GD&ĐT   — 11819      (mã chính, in trên màn hình)
//   · mã CSDL ngành — 40425419   (nhiều thầy cô quen mã này hơn)
//   · mã ngắn       — dienlien   (dùng trong ?truong= và địa chỉ)
//   · MA_KHAC       — mọi mã CŨ sau khi trường đổi mã (sáp nhập)
// Trả về mã ngắn, hoặc '' nếu không có trường nào khớp.
// Bỏ khoảng trắng giữa chuỗi: người gõ trên điện thoại hay lỡ chạm dấu cách.
//
// ⚠️ Ô nào TRỐNG thì phải bỏ qua, không được đem ra so. Châu Đình chưa xin
//    được mã CSDL ngành nên MA_MOET = '' — so cả ô rỗng thì người gõ trống
//    lại khớp bừa vào Châu Đình. Bài thử có mục canh đúng cái bẫy này.
// ============================================================
window.timTruongTheoMa = function (chuoi) {
  var s = String(chuoi || '').replace(/\s+/g, '').toLowerCase();
  if (!s) return '';
  var ds = window.DS_TRUONG, kq = '';
  Object.keys(ds).forEach(function (k) {
    if (kq) return;
    var t = ds[k];
    var moiMa = [k, t.MA_SO, t.MA_MOET].concat(t.MA_KHAC || []);
    moiMa.forEach(function (m) {
      if (!kq && m && String(m).toLowerCase() === s) kq = k;
    });
  });
  return kq;
};

// ============================================================
// CHỌN TRƯỜNG: ?truong=<mã> → tên miền riêng → lựa chọn đã nhớ → mặc định
// (Thứ tự này khớp §2 bản kế hoạch nhân bản. Trước đây dòng chú thích ghi
//  ngược "tên miền → ?truong=" trong khi mã làm đúng — đọc chú thích mà sửa
//  theo là hỏng cách chào hàng nêu ở bước 1 bên dưới.)
//
// 🔑 Bước 4 rẽ đôi theo địa chỉ đang đứng:
//    · Tên miền RIÊNG của một trường (hoặc mở tệp từ ổ đĩa) → mặc định
//      'dienlien' y như trước. Mọi đường dẫn đã phát cho 37 thầy cô giữ nguyên
//      hành vi, không ai phải học lại thao tác nào.
//    · Tên miền CỔNG CHUNG → KHÔNG mặc định vào trường nào. Để trống và bật cờ
//      CHUA_CHON_TRUONG; js/cong-truong.js sẽ hiện màn khai mã trường.
//      Mặc định về Diễn Liên ở đây là hỏng nặng: khách lạ vào địa chỉ giới
//      thiệu lại rơi thẳng vào cổng đăng nhập của một trường cụ thể.
// ============================================================
(function () {
  // Gộp hai đối tượng — viết tay theo lối ES5 cho đồng nhất với cả dự án.
  function gop(a, b) {
    var r = {}, k;
    for (k in a) if (Object.prototype.hasOwnProperty.call(a, k)) r[k] = a[k];
    for (k in b) if (Object.prototype.hasOwnProperty.call(b, k)) r[k] = b[k];
    return r;
  }
  var ds = window.DS_TRUONG;
  var ma = '';
  var host = String(location.hostname || '').replace(/^www\./, '').toLowerCase();

  // Có đúng trường mang mã này KHÔNG — hỏi bằng hasOwnProperty, đừng hỏi bằng
  // ds[k] cho tiện. Mọi đối tượng đều thừa kế 'constructor', 'toString',
  // 'valueOf', '__proto__'… nên ds['constructor'] là TRUTHY dù chẳng có trường
  // nào tên vậy. Hậu quả thật: ai đặt được localStorage.ma_truong='constructor'
  // thì ở bước 4 app tưởng đã biết trường, bỏ qua màn khai mã, rồi
  // supabase-ket-noi.js thấy DA_NOI=false liền GỠ KHÓA cả trang.
  function coTruong(k) {
    return !!k && Object.prototype.hasOwnProperty.call(ds, k);
  }

  // Đang đứng ở tên miền cổng chung? So cả tên miền con: chaudinh.quantriso…
  // cũng phải tính là cổng chung, vì tên miền con là cách cấp địa chỉ riêng
  // cho từng trường mà không phải mua thêm tên miền.
  window.O_CONG_CHUNG = (window.CHUNG.TEN_MIEN_CONG || []).some(function (t) {
    var g = String(t).replace(/^www\./, '').toLowerCase();
    return host === g || (host.length > g.length && host.slice(-(g.length + 1)) === '.' + g);
  });

  // ?cong=1 — ÉP vào chế độ cổng chung ở bất cứ đâu, kể cả mở tệp bằng file://.
  // Có nó thì xem và soát được màn cổng NGAY, không phải chờ trỏ xong tên miền.
  //
  // Vì sao đây KHÔNG phải cửa hậu: nó chỉ làm app CHẶT thêm một bước (bắt khai
  // mã trường trước khi tới cổng đăng nhập), không mở thêm bất cứ quyền gì.
  // Kẻ xấu bật cờ này lên thì chỉ tự đẩy mình ra xa hơn. Cửa hậu là thứ cho
  // vào dễ hơn — cái này ngược lại.
  //
  // ⚠️ Nói cho đúng phạm vi: cờ này chỉ đổi bước 4, ba bước trên vẫn chạy trước.
  //    · mở tệp bằng file:// hoặc localhost → ra màn cổng  ← cách xem thử
  //    · trên tieuhocdienlien.com → VẪN vào Diễn Liên, vì bước 2 khớp tên miền
  //      trước. Cố ý để vậy: không ai đổi được vẻ ngoài trang thật của nhà
  //      trường chỉ bằng cách thêm chữ vào địa chỉ rồi gửi cho người khác.
  //    · đã khai mã trường rồi thì cũng không bị đuổi ra (bước 3 khớp trước).
  //      Muốn quay lại màn cổng thì dùng ?doitruong=1.
  if (/[?&]cong=1/.test(location.search)) window.O_CONG_CHUNG = true;

  // 1. Theo ?truong=<mã> — ĐỨNG TRƯỚC tên miền, cố ý.
  //    Người gõ hẳn ra ?truong= là đang chỉ định rõ, phải nghe theo. Nhờ vậy
  //    trên chính địa chỉ của Diễn Liên vẫn mở được bản xem thử của trường
  //    khác để cho họ xem — đây là cách chào hàng, đừng đảo lại thứ tự này.
  //    Nhận cả mã CSDL ngành: ?truong=40425419 cũng vào đúng Diễn Liên.
  var q = /[?&]truong=([a-z0-9_-]+)/i.exec(location.search);
  if (q) ma = window.timTruongTheoMa(q[1]);

  // 2. Theo tên miền RIÊNG — cách nhận diện chính khi trường có tên miền riêng.
  //    Cả tên miền con của cổng chung: dienlien.quantrisotruonghoc.com. Khai
  //    tên miền con vào TEN_MIEN của trường là trường đó có địa chỉ riêng ngay,
  //    không tốn thêm đồng nào và người dùng khỏi gõ mã.
  if (!ma) {
    Object.keys(ds).forEach(function (k) {
      (ds[k].TEN_MIEN || []).forEach(function (t) {
        if (String(t).replace(/^www\./, '').toLowerCase() === host) ma = k;
      });
    });
  }

  // 3. Nhớ lựa chọn để thầy cô không phải gõ lại mã trên điện thoại — đúng
  //    cách CSDL ngành nhớ đơn vị đã chọn lần trước.
  //    An toàn: nhớ nhầm trường thì cùng lắm là KHÔNG đăng nhập được (mỗi
  //    trường một CSDL riêng), không đời nào nhìn thấy dữ liệu trường khác.
  //    Màn cổng luôn có nút "Đổi trường" để gỡ cái nhớ này.
  //    ?doitruong=1 là đường THOÁT: xóa cái nhớ rồi quay về màn khai mã. Không
  //    có nó thì ai gõ nhầm mã một lần là kẹt vĩnh viễn ở cổng của trường lạ,
  //    vì bước 3 cứ đọc lại đúng cái mã sai đó.
  //    Chỉ có tác dụng khi KHÔNG kèm ?truong= — người gõ rõ ?truong= là đang
  //    chỉ định trường, đừng vừa nghe vừa không nghe.
  //    ?xemthu=1 cũng bỏ qua cái nhớ: người bấm "Xem thử" là muốn xem bản mẫu
  //    ngay, mà lần trước họ đã gõ mã một trường thì cái nhớ sẽ kéo họ về cổng
  //    đăng nhập của trường đó — bấm nút xong không thấy gì xảy ra.
  var doiTruong = !ma && /[?&](doitruong=1|xemthu=1)/.test(location.search);
  try {
    if (/[?&]doitruong=1/.test(location.search) && !ma) localStorage.removeItem('ma_truong');
    if (!ma && !doiTruong) {
      var cu = localStorage.getItem('ma_truong');
      if (coTruong(cu)) ma = cu;
    }
    if (ma) localStorage.setItem('ma_truong', ma);
  } catch (e) { /* trình duyệt chặn localStorage thì bỏ qua, vẫn chạy được */ }

  // 4. Chưa xác định được → rẽ đôi theo địa chỉ (xem khối chú thích trên).
  if (!coTruong(ma)) {
    if (window.O_CONG_CHUNG) {
      window.CHUA_CHON_TRUONG = true;
      window.MA_TRUONG = '';
      // CAU_HINH vẫn phải là một đối tượng dùng được: nhiều tệp đọc nó ngay
      // lúc nạp. Đặt tên hệ thống trung tính, KHÔNG mang tên trường nào —
      // để lỡ lọt ra màn hình thì cũng không in nhầm tên trường khác.
      window.CAU_HINH = gop(window.CHUNG, {
        MA: '', MA_SO: '', MA_MOET: '', MA_KHAC: [], TEN_MIEN: [],
        DIA_CHI: '', KHOA_CONG_KHAI: '',
        TEN_TRUONG: window.CHUNG.TEN_HE_THONG, DIA_CHI_TRUONG: '', DIA_DANH: '',
        DON_VI_CHU_QUAN: '', CO_QUAN_QUAN_LY: '', CHU_QUAN_THUONG: '', CO_QUAN_THUONG: '',
        HIEU_TRUONG: '', PHO_HIEU_TRUONG: '', DIEN_THOAI: '', EMAIL_TRUONG: '',
        SLOGAN: '', MUC_TIEU_CHUAN_QG: '', MUC_CHUAN_QG: '', THU_MUC_ANH: 'img/',
        SO_LOP: 0, SO_HOC_SINH: 0, SO_CBGV: 0
      });
      window.CAU_HINH.NAM_HOC = '';
      return;
    }
    ma = 'dienlien';   // giữ nguyên hành vi cũ cho mọi đường dẫn đã phát ra
  }

  window.CHUA_CHON_TRUONG = false;
  window.MA_TRUONG = ma;
  window.CAU_HINH = gop(window.CHUNG, ds[ma]);
})();

// ============================================================
// ĐỔI TRƯỜNG — chỉ có tác dụng khi các trường còn dùng chung một địa chỉ.
// Trường nào đã có tên miền riêng thì vào thẳng tên miền đó, không cần chọn.
// Đặt ở đây (tệp nạp đầu tiên) để mọi màn hình đều gọi được.
// ============================================================
window.dsTruongDeChon = function () {
  return Object.keys(window.DS_TRUONG).map(function (k) {
    return { ma: k, ten: window.DS_TRUONG[k].TEN_TRUONG || k };
  });
};

// Ô chọn trường. Trả về chuỗi rỗng khi app mới có một trường — không bày ra
// thứ vô nghĩa. Gắn ở đâu cũng chạy, nhờ bắt sự kiện ở cấp document bên dưới.
window.htmlChonTruong = function (nhan) {
  var ds = window.dsTruongDeChon();
  if (ds.length < 2) return '';
  return '<div class="chon-truong">' + (nhan || 'Trường:') +
    ' <select class="o-chon-truong">' +
    ds.map(function (t) {
      return '<option value="' + t.ma + '"' +
        (t.ma === window.MA_TRUONG ? ' selected' : '') + '>' + t.ten + '</option>';
    }).join('') + '</select></div>';
};

document.addEventListener('change', function (e) {
  var o = e.target;
  if (!o || !o.classList || !o.classList.contains('o-chon-truong')) return;
  var ma = o.value;
  if (!window.DS_TRUONG[ma] || ma === window.MA_TRUONG) return;
  try { localStorage.setItem('ma_truong', ma); } catch (err) { /* bỏ qua */ }
  // Nạp lại kèm ?truong= để địa chỉ nói rõ đang ở trường nào — thầy cô gửi
  // đường dẫn cho nhau thì người nhận vào đúng trường, không phụ thuộc máy.
  location.href = location.pathname + '?truong=' + encodeURIComponent(ma);
});

// ============================================================
// NĂM HỌC HIỆN HÀNH — TỰ TÍNH THEO NGÀY, KHÔNG GHI CỨNG
// Mốc mặc định 30/08: từ ngày này trở đi là năm học mới.
//   · 11/8/2026  → 2025-2026   (chưa qua mốc)
//   · 30/8/2026  → 2026-2027   (đúng ngày mốc là đổi)
//   · 20/5/2027  → 2026-2027
// Ghi cứng năm học là cái bẫy: đến hè năm sau không ai nhớ vào sửa, cả hệ
// thống ghi dữ liệu sai năm mà không ai biết.
// Mốc lấy từ bảng cau_hinh (khoá 'moc_doi_nam_hoc') khi đã đăng nhập —
// Sở đổi lịch năm học thì sửa cấu hình, không phải sửa mã.
// ============================================================
window.tinhNamHoc = function (moc, ngay) {
  var d = ngay || new Date();
  var m = /^(\d{1,2})\s*\/\s*(\d{1,2})$/.exec(String(moc || '30/08'));
  var ngayMoc = m ? +m[1] : 30;
  var thangMoc = m ? +m[2] : 8;
  var thang = d.getMonth() + 1;
  var quaMoc = thang > thangMoc || (thang === thangMoc && d.getDate() >= ngayMoc);
  var dau = quaMoc ? d.getFullYear() : d.getFullYear() - 1;
  return dau + '-' + (dau + 1);
};
window.CAU_HINH.NAM_HOC = window.tinhNamHoc(window.CAU_HINH.MOC_DOI_NAM_HOC);

// Cờ suy ra, các file khác đọc cờ này — không tự kiểm tra chuỗi rỗng
window.DA_NOI = !!(window.CAU_HINH.DIA_CHI && window.CAU_HINH.KHOA_CONG_KHAI);

// ============================================================
// 🔴 CỜ KHẲNG ĐỊNH TỆP NÀY ĐÃ CHẠY TRỌN VẸN — PHẢI Ở DÒNG CUỐI CÙNG
//
// supabase-ket-noi.js quyết định mở khóa trang dựa trên các cờ khai ở đây.
// Trước đây nó xét sự VẮNG MẶT của cờ (`if (!window.DA_NOI)`), mà cờ vắng mặt
// có HAI nghĩa hoàn toàn khác nhau:
//   · "trường này chưa nối CSDL"  → cho vào xem bản mẫu, đúng
//   · "tệp cauhinh.js chưa chạy"  → CHƯA BIẾT GÌ CẢ, phải đóng
// Không phân biệt được hai nghĩa đó thì một dấu phẩy thiếu trong khối cấu hình
// một trường mới — thứ sẽ sửa mỗi lần thêm trường — làm tệp này ném lỗi giữa
// chừng, và cả hệ thống MỞ TOANG cho người lạ. Đúng kiểu hỏng nguy hiểm nhất:
// im lặng, không báo gì, chỉ mất hàng rào.
//
// Nay đòi một khẳng định DƯƠNG: chỉ khi dòng dưới đây chạy được thì mới tin.
// ⚠️ Thêm mã mới thì thêm PHÍA TRÊN dòng này, đừng thêm dưới.
// ============================================================
window.CAU_HINH_XONG = true;
