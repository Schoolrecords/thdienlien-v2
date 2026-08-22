// ============================================================
// nap-du-lieu.js — THẺ "NẠP DỮ LIỆU" trong màn Quản trị
//
// VÌ SAO PHẢI CÓ: trước đây mỗi trường mới vào hệ thống là một lần sinh tệp SQL
// bằng tay rồi dán vào Supabase (sql/13-nap-hoc-sinh.sql). Cách đó không nhân
// bản được: trường thứ mười không thể chờ người viết SQL. Nay nhà trường tự bấm
// một nút, chọn đúng tệp đã tải về từ CSDL ngành, xem trước rồi ghi.
//
// LUỒNG BA BƯỚC, KHÔNG BAO GIỜ GHI THẲNG:
//   1. Chọn tệp  → 2. SOI THỬ (chỉ đọc, không đụng máy chủ) → 3. Ghi vào hệ thống
// Bước 2 nói rõ: bao nhiêu em thêm mới, bao nhiêu em cập nhật, em nào chuyển
// lớp, dòng nào hỏng. Không có bước này thì một tệp sai năm học hay sai lớp sẽ
// đi thẳng vào cơ sở dữ liệu mà không ai kịp thấy.
//
// KHÔNG NẠP dữ liệu cá nhân ngoài phạm vi: số điện thoại, họ tên - nghề nghiệp
// cha mẹ, địa chỉ, nơi sinh đều CÓ trong tệp của Bộ nhưng lược đồ cố ý không có
// cột chứa. Thu thập ít nhất có thể là nguyên tắc của Luật Bảo vệ dữ liệu cá
// nhân năm 2025. Số định danh cá nhân có ô tích riêng, mặc định TẮT.
//
// Quyền: thẻ chỉ hiện với admin / Ban giám hiệu (quan-tri.js đã lọc), và RLS
// máy chủ cũng chỉ cho la_admin() ghi ba bảng này — giao diện chỉ là lớp ngoài.
//
// Đăng ký thẻ qua window.qtTabPhu — KHÔNG sửa quan-tri.js.
// ============================================================
(function () {
  'use strict';

  function thoat(s) { return window.thoatHTML ? window.thoatHTML(s) : String(s == null ? '' : s); }

  // Bình thường quan-tri.js nạp trước và đã tạo mảng; giữ dòng này để đổi thứ
  // tự thẻ <script> không làm chết cả app vì một lỗi push của undefined.
  window.qtTabPhu = window.qtTabPhu || [];

  var LO = 200;          // số dòng gửi máy chủ mỗi lượt
  var TRAN_DONG = 6000;  // quá số này gần như chắc chắn chọn nhầm tệp

  var KQ = null;         // kết quả soi thử của lần chọn tệp gần nhất
  var DANG_GHI = false;
  var thuVien = null;    // Promise nạp SheetJS

  // ── SheetJS 930 KB: chỉ tải khi thầy cô thật sự chọn tệp ──
  // Nạp sẵn trong index.html thì mọi người mở app bằng 4G đều phải tải, dù cả
  // năm chỉ nạp dữ liệu một lần.
  function napThuVien() {
    if (window.XLSX) return Promise.resolve(window.XLSX);
    if (thuVien) return thuVien;
    thuVien = new Promise(function (xong, hong) {
      var s = document.createElement('script');
      s.src = 'lib/xlsx.min.js?v=202608244';
      s.onload = function () {
        if (window.XLSX) xong(window.XLSX);
        else hong(new Error('Tải được tệp thư viện nhưng không dùng được.'));
      };
      s.onerror = function () {
        thuVien = null;   // cho phép thử lại, đừng kẹt mãi ở lần hỏng đầu
        hong(new Error('Không tải được thư viện đọc Excel (lib/xlsx.min.js). Kiểm tra mạng rồi thử lại.'));
      };
      document.head.appendChild(s);
    });
    return thuVien;
  }

  // ══════════════════════════════════════════════════════════════
  // NHẬN DIỆN CỘT THEO TÊN TIÊU ĐỀ, KHÔNG THEO VỊ TRÍ
  // Bộ đổi mẫu là thứ tự cột đổi theo (ver2 → ver3 đã từng thêm cột). Dò theo
  // chữ ở hàng tiêu đề thì tệp phiên bản khác vẫn nạp được; dò theo số thứ tự
  // cột thì im lặng lấy nhầm cột bên cạnh — sai mà không báo.
  // ══════════════════════════════════════════════════════════════
  var COT_HS = {
    lop:        { ten: 'Mã lớp',                 tim: ['ma lop'],                     buoc: true },
    ma:         { ten: 'Mã học sinh',            tim: ['ma hoc sinh', 'ma hs'],       buoc: true },
    ho_ten:     { ten: 'Họ tên',                 tim: ['ho ten', 'ho va ten'],        buoc: true },
    ngay_sinh:  { ten: 'Ngày sinh',              tim: ['ngay sinh'] },
    gioi_tinh:  { ten: 'Giới tính',              tim: ['gioi tinh'] },
    trang_thai: { ten: 'Trạng thái HS',          tim: ['trang thai hs', 'trang thai hoc sinh'] },
    ngay_tt:    { ten: 'Ngày nhập trạng thái',   tim: ['ngay nhap trang thai'] },
    dan_toc:    { ten: 'Dân tộc',                tim: ['dan toc'] },
    khuyet_tat: { ten: 'Loại khuyết tật',        tim: ['loai khuyet tat'] },
    dinh_danh:  { ten: 'Số định danh cá nhân',   tim: ['so dinh danh ca nhan', 'so dinh danh'] }
  };

  // Tệp CSDL_GiaoVien của CSDL ngành — 72 cột, ta chỉ cần bốn.
  // Cột nhận diện bắt buộc là "Họ tên" + "Email": đó là cặp phân biệt tệp đội
  // ngũ với tệp học sinh (tệp học sinh không có cột Email).
  var COT_GV = {
    ho_ten:     { ten: 'Họ tên',              tim: ['ho ten', 'ho va ten'],   buoc: true },
    email:      { ten: 'Email',               tim: ['email', 'thu dien tu'],  buoc: true },
    trang_thai: { ten: 'Trạng thái CB',       tim: ['trang thai cb', 'trang thai can bo'] },
    vi_tri:     { ten: 'Vị trí việc làm',     tim: ['vi tri viec lam'] },
    chuc_vu:    { ten: 'Nhóm chức vụ',        tim: ['nhom chuc vu', 'chuc vu'] },
    mon:        { ten: 'Môn dạy',             tim: ['mon day'] }
  };

  var BO_NAP = {
    hs: {
      ten: 'Học sinh', tenDai: 'Danh sách học sinh',
      tepMau: 'C1-HocSinh', duong: 'Học sinh → Xuất Excel',
      coNam: true, cot: COT_HS, batBuoc: ['ma', 'ho_ten', 'lop']
    },
    gv: {
      ten: 'Đội ngũ CBGV', tenDai: 'Danh sách cán bộ, giáo viên, nhân viên',
      tepMau: 'CSDL_GiaoVien', duong: 'Cán bộ → Xuất Excel',
      coNam: false, cot: COT_GV, batBuoc: ['ho_ten', 'email']
    }
  };
  var LOAI = 'hs';
  function bo() { return BO_NAP[LOAI]; }

  // Bỏ dấu + gộp khoảng trắng: tiêu đề trong tệp của Bộ có xuống dòng giữa ô
  // ("Tỉnh/Thành phố\n(Theo địa chỉ thường trú)") và lẫn NFC/NFD.
  function chuanHoa(s) {
    return String(s == null ? '' : s)
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/đ/g, 'd').replace(/Đ/g, 'D')
      .toLowerCase().replace(/\s+/g, ' ').trim();
  }

  // Trạng thái của CSDL ngành (12 giá trị) → 4 giá trị của lược đồ.
  // "Nghỉ học xin học lại" là em ĐANG học trở lại, không phải thôi học.
  function doiTrangThai(s) {
    var c = chuanHoa(s);
    if (!c) return 'dang_hoc';
    if (c.indexOf('chuyen di') === 0) return 'chuyen_di';
    if (c.indexOf('thoi hoc') === 0) return 'thoi_hoc';
    return 'dang_hoc';   // đang học · chuyển đến · nghỉ học xin học lại
  }

  // dd/mm/yyyy (mẫu của Bộ) → yyyy-mm-dd. Nhận cả dấu - và . ngăn cách.
  // Excel đôi khi trả ô ngày dưới dạng số sê-ri; sheet_to_json với raw:false đã
  // đổi sẵn thành chữ nên ở đây chỉ còn lo phần chữ.
  function doiNgay(s) {
    var t = String(s == null ? '' : s).trim();
    if (!t) return null;
    var m = t.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
    if (m) {
      var d = +m[1], th = +m[2], n = +m[3];
      if (d < 1 || d > 31 || th < 1 || th > 12) return null;
      return n + '-' + (th < 10 ? '0' + th : th) + '-' + (d < 10 ? '0' + d : d);
    }
    if (/^\d{4}-\d{2}-\d{2}/.test(t)) return t.slice(0, 10);
    return null;
  }

  function doiGioiTinh(s) {
    var c = chuanHoa(s);
    if (c === 'nam' || c === 'm' || c === '01' || c === '1') return 'Nam';
    if (c === 'nu' || c === 'f' || c === '02' || c === '2') return 'Nữ';
    return null;
  }

  // '1A' → 1 · 'L2B' → 2. Lấy CHỮ SỐ ĐẦU TIÊN gặp trong tên lớp.
  function doiKhoi(lop) {
    var m = String(lop || '').match(/\d/);
    var k = m ? +m[0] : 0;
    return (k >= 1 && k <= 5) ? k : 0;
  }

  // Năm học suy từ ngày trong tệp: tháng ≥ 8 thuộc năm học bắt đầu năm đó.
  function namHocTuNgay(iso) {
    if (!iso) return '';
    var n = +iso.slice(0, 4), th = +iso.slice(5, 7);
    return th >= 8 ? (n + '-' + (n + 1)) : ((n - 1) + '-' + n);
  }

  // ══════════════════════════════════════════════════════════════
  // ĐỌC TỆP → BẢNG DÒNG SẠCH
  // ══════════════════════════════════════════════════════════════
  function docTep(tep) {
    return napThuVien().then(function (XLSX) {
      return tep.arrayBuffer().then(function (bo) {
        var wb;
        try {
          wb = XLSX.read(new Uint8Array(bo), { type: 'array' });
        } catch (e) {
          throw new Error('Không mở được tệp. Tệp phải là .xls hoặc .xlsx tải về từ CSDL ngành, ' +
            'không phải tệp đã đổi đuôi hay tệp .csv.');
        }
        return phanTich(XLSX, wb);
      });
    });
  }

  // Tìm trang tính và hàng tiêu đề: hàng nào có ĐỦ cả "Mã học sinh" và "Họ tên"
  // thì đó là hàng tiêu đề. Tệp của Bộ để dữ liệu ở "Sheet1" nhưng còn 16 trang
  // danh mục kèm theo, và trường nào lỡ đổi tên trang thì vẫn phải nạp được.
  function timTieuDe(XLSX, wb) {
    var COT = bo().cot, BUOC = bo().batBuoc;
    for (var i = 0; i < wb.SheetNames.length; i++) {
      var ten = wb.SheetNames[i];
      var hang = XLSX.utils.sheet_to_json(wb.Sheets[ten], { header: 1, raw: false, defval: '', blankrows: true });
      for (var r = 0; r < Math.min(hang.length, 12); r++) {
        var o = {}, co = 0;
        for (var c = 0; c < hang[r].length; c++) {
          var v = chuanHoa(hang[r][c]);
          if (!v) continue;
          Object.keys(COT).forEach(function (k) {
            if (o[k] != null) return;
            if (COT[k].tim.some(function (t) { return v === t || v.indexOf(t) === 0; })) o[k] = c;
          });
        }
        Object.keys(COT).forEach(function (k) { if (o[k] != null) co++; });
        if (BUOC.every(function (k) { return o[k] != null; })) {
          return { trang: ten, hang: hang, dongTieuDe: r, cot: o, soCot: co };
        }
      }
    }
    return null;
  }

  function phanTich(XLSX, wb) {
    var t = timTieuDe(XLSX, wb);
    if (!t) {
      var canCo = bo().batBuoc.map(function (k) { return '"' + bo().cot[k].ten + '"'; }).join(', ');
      throw new Error('Tệp này không giống ' + bo().tenDai.toLowerCase() + ' của CSDL ngành: không tìm ' +
        'thấy hàng tiêu đề có đủ các cột ' + canCo + '. ' +
        'Hãy tải lại tệp mẫu ' + bo().tepMau + ' từ trang truong.csdl.moet.gov.vn và giữ nguyên hàng ' +
        'tiêu đề. Cũng kiểm lại ô "Loại dữ liệu" ở bước 1 — chọn nhầm loại thì máy tìm nhầm cột.');
    }
    return LOAI === 'gv' ? phanTichGV(t) : phanTichHS(t);
  }

  function phanTichHS(t) {
    var cot = t.cot;
    var em = [], loi = [], nhac = [], daGap = {}, demNgay = {};
    var thieuCot = Object.keys(COT_HS).filter(function (k) { return cot[k] == null; });

    for (var r = t.dongTieuDe + 1; r < t.hang.length; r++) {
      var d = t.hang[r] || [];
      var lay = function (k) { return cot[k] == null ? '' : String(d[cot[k]] == null ? '' : d[cot[k]]).trim(); };

      var ma = lay('ma'), hoTen = lay('ho_ten'), lop = lay('lop');
      if (!ma && !hoTen && !lop) continue;                  // dòng trống cuối bảng
      var soDong = r + 1;                                   // số hàng như thầy cô thấy trong Excel

      if (!ma)    { loi.push('Hàng ' + soDong + ': thiếu MÃ HỌC SINH' + (hoTen ? ' (' + hoTen + ')' : '')); continue; }
      if (!hoTen) { loi.push('Hàng ' + soDong + ': thiếu HỌ TÊN (mã ' + ma + ')'); continue; }
      if (!lop)   { loi.push('Hàng ' + soDong + ': thiếu MÃ LỚP (' + hoTen + ')'); continue; }

      if (daGap[ma]) { loi.push('Hàng ' + soDong + ': mã ' + ma + ' bị lặp (đã có ở hàng ' + daGap[ma] + ')'); continue; }
      daGap[ma] = soDong;

      var khoi = doiKhoi(lop);
      if (!khoi) { loi.push('Hàng ' + soDong + ': lớp "' + lop + '" không đoán được khối 1-5'); continue; }

      // Giới tính sai thì máy chủ chặn cả lô (CHECK gioi_tinh in ('Nam','Nữ')),
      // nên bắt ngay ở đây cho thầy cô biết đích danh hàng nào.
      var gt = doiGioiTinh(lay('gioi_tinh'));
      if (cot.gioi_tinh != null && lay('gioi_tinh') && !gt) {
        loi.push('Hàng ' + soDong + ': giới tính "' + lay('gioi_tinh') + '" không phải Nam/Nữ');
        continue;
      }

      var ns = doiNgay(lay('ngay_sinh'));
      if (cot.ngay_sinh != null && lay('ngay_sinh') && !ns) {
        nhac.push('Hàng ' + soDong + ' (' + hoTen + '): ngày sinh "' + lay('ngay_sinh') + '" không đọc được — sẽ để trống');
      }

      var ngayTT = doiNgay(lay('ngay_tt'));
      if (ngayTT) { var nh = namHocTuNgay(ngayTT); demNgay[nh] = (demNgay[nh] || 0) + 1; }

      em.push({
        ma: ma,
        ho_ten: hoTen.replace(/\s+/g, ' '),
        ngay_sinh: ns,
        gioi_tinh: gt,
        dan_toc: lay('dan_toc') || null,
        khuyet_tat_hoa_nhap: !!lay('khuyet_tat'),
        lop: lop,
        khoi: khoi,
        trang_thai: doiTrangThai(lay('trang_thai')),
        dinh_danh: lay('dinh_danh') || null
      });
    }

    // Năm học ĐOÁN từ cột "Ngày nhập trạng thái" — sql/13 đã trả giá vì việc
    // này: nạp nhầm năm thì màn học sinh hiện đúng số nhưng sai năm, và số liệu
    // ba năm của Biểu 1 lệch theo mà không ai thấy.
    var namDoan = '';
    Object.keys(demNgay).forEach(function (k) { if (!namDoan || demNgay[k] > demNgay[namDoan]) namDoan = k; });

    if (thieuCot.length) {
      nhac.push('Tệp không có các cột: ' + thieuCot.map(function (k) { return COT_HS[k].ten; }).join(' · ') +
        ' — phần đó sẽ để trống.');
    }
    if (em.length > TRAN_DONG) {
      nhac.push('Tệp có ' + em.length + ' dòng, nhiều bất thường với một trường tiểu học — kiểm lại xem có đúng tệp không.');
    }

    return { trang: t.trang, em: em, loi: loi, nhac: nhac, namDoan: namDoan, soCot: t.soCot };
  }

  // ══════════════════════════════════════════════════════════════
  // ĐỘI NGŨ CBGV — đích đến là DANH SÁCH MỜI, không phải bảng nhân sự
  //
  // 🔴 CÁI BẪY LỚN NHẤT CỦA TỆP NÀY: cột "Email" trong CSDL ngành KHÔNG phải
  //    địa chỉ đăng nhập. Soi tệp thật của Diễn Liên thấy ngay hai kiểu hỏng:
  //      · người này mang email của người khác (khai vội, chép nhầm dòng);
  //      · email công vụ @nghean.edu.vn — không đăng nhập Google được, trừ khi
  //        Sở dựng trên Google Workspace.
  //    Đăng nhập hệ thống là đăng nhập BẰNG GOOGLE, nên địa chỉ sai là thầy cô
  //    vĩnh viễn không vào được mà chẳng hiểu vì sao. Vì vậy màn soi thử phải
  //    chỉ mặt từng dòng đáng ngờ, chứ không lặng lẽ nạp cho xong.
  // ══════════════════════════════════════════════════════════════
  function phanTichGV(t) {
    var cot = t.cot;
    var em = [], loi = [], nhac = [], daGap = {}, khongGmail = [], daNghi = 0;
    var thieuCot = Object.keys(COT_GV).filter(function (k) { return cot[k] == null; });

    for (var r = t.dongTieuDe + 1; r < t.hang.length; r++) {
      var d = t.hang[r] || [];
      var lay = function (k) { return cot[k] == null ? '' : String(d[cot[k]] == null ? '' : d[cot[k]]).trim(); };

      var hoTen = lay('ho_ten'), email = lay('email').toLowerCase();
      if (!hoTen && !email) continue;
      var soDong = r + 1;

      if (!hoTen) { loi.push('Hàng ' + soDong + ': thiếu HỌ TÊN (' + (email || 'không có email') + ')'); continue; }

      // Người đã nghỉ / chuyển đi: KHÔNG đưa vào danh sách được phép đăng nhập.
      var tt = chuanHoa(lay('trang_thai'));
      if (tt && tt.indexOf('dang lam viec') < 0) { daNghi++; continue; }

      if (!email) {
        loi.push('Hàng ' + soDong + ': ' + hoTen + ' KHÔNG có email — chưa cho đăng nhập được');
        continue;
      }
      if (!/^[^@\s]+@[^@\s.]+\.[^@\s]+$/.test(email)) {
        loi.push('Hàng ' + soDong + ': ' + hoTen + ' — "' + email + '" không phải một địa chỉ thư hợp lệ');
        continue;
      }
      if (daGap[email]) {
        loi.push('Hàng ' + soDong + ': ' + hoTen + ' dùng CHUNG email với ' + daGap[email] +
          ' (' + email + ') — hai người không thể chung một tài khoản, sửa trong tệp rồi nạp lại');
        continue;
      }
      daGap[email] = hoTen;

      if (email.slice(-10) !== '@gmail.com') khongGmail.push(hoTen + ' (' + email + ')');

      em.push({
        email: email,
        ho_ten: hoTen.replace(/\s+/g, ' '),
        chuc_vu: lay('chuc_vu') || lay('vi_tri') || null,
        vai_tro: doiVaiTro(lay('chuc_vu'), lay('vi_tri')),
        mon: lay('mon') || null
      });
    }

    if (daNghi) nhac.push('Bỏ qua ' + daNghi + ' người có trạng thái khác "Đang làm việc" (đã nghỉ, chuyển đi).');
    if (khongGmail.length) {
      nhac.push('<b>' + khongGmail.length + ' địa chỉ không phải Gmail</b> — đăng nhập hệ thống là đăng nhập ' +
        'bằng Google, địa chỉ không gắn với tài khoản Google thì thầy cô sẽ không vào được: ' +
        khongGmail.slice(0, 8).join(' · ') + (khongGmail.length > 8 ? ' … và ' + (khongGmail.length - 8) + ' người nữa' : ''));
    }
    if (thieuCot.length) {
      nhac.push('Tệp không có các cột: ' + thieuCot.map(function (k) { return COT_GV[k].ten; }).join(' · ') +
        ' — phần đó sẽ để trống.');
    }

    return { trang: t.trang, em: em, loi: loi, nhac: nhac, namDoan: '', soCot: t.soCot };
  }

  // Vai trò suy từ chức vụ trong tệp. TUYỆT ĐỐI không suy ra 'admin': quyền
  // quản trị do Admin hệ thống cấp (sql/51), không phải do một dòng Excel.
  function doiVaiTro(chucVu, viTri) {
    var c = chuanHoa(chucVu) + ' ' + chuanHoa(viTri);
    if (c.indexOf('hieu truong') >= 0) return 'ban_giam_hieu';   // gồm cả "phó hiệu trưởng"
    if (c.indexOf('to truong') >= 0) return 'to_truong';
    if (c.indexOf('giao vien') >= 0) return 'giao_vien';
    if (c.indexOf('nhan vien') >= 0) return 'nhan_vien';
    return 'giao_vien';
  }

  // ══════════════════════════════════════════════════════════════
  // ĐỐI CHIẾU VỚI CƠ SỞ DỮ LIỆU — soi thử, KHÔNG ghi gì
  // ══════════════════════════════════════════════════════════════
  function doiChieu(kq, nam) {
    var may = window.MAY_CHU;
    if (LOAI === 'gv') return doiChieuGV(kq);
    var maTrongTep = {};
    kq.em.forEach(function (e) { maTrongTep[e.ma] = e; });

    // Đọc theo trang 1000 dòng — trường 900 em vẫn dưới trần, nhưng vài năm
    // học cộng lại thì vượt, và PostgREST cắt im lặng ở 1000.
    function doc(bang, cot, loc) {
      var ra = [], tu = 0;
      function trang() {
        var q = may.from(bang).select(cot).range(tu, tu + 999).order(bang === 'hoc_sinh' ? 'ma' : 'id');
        (loc || []).forEach(function (l) { q = q.eq(l[0], l[1]); });
        return q.then(function (r) {
          if (r.error) throw r.error;
          var d = r.data || [];
          ra = ra.concat(d);
          if (d.length < 1000) return ra;
          tu += 1000;
          return trang();
        });
      }
      return trang();
    }

    return Promise.all([
      doc('hoc_sinh', 'ma'),
      doc('hoc_sinh_lop', 'id,hoc_sinh_ma,lop,khoi,trang_thai', [['nam_hoc', nam]]),
      may.from('lop_hoc').select('lop,khoi,co_so_ma').eq('nam_hoc', nam)
    ]).then(function (bo) {
      var coSan = {};   bo[0].forEach(function (x) { coSan[x.ma] = true; });
      var xepLop = {};  bo[1].forEach(function (x) { xepLop[x.hoc_sinh_ma] = x; });
      var lopCu = {};
      if (bo[2].error) throw bo[2].error;
      (bo[2].data || []).forEach(function (x) { lopCu[x.lop] = x; });

      var themMoi = 0, capNhat = 0, chuyenLop = [], lopMoi = {}, khongCoTrongTep = [];

      kq.em.forEach(function (e) {
        if (coSan[e.ma]) capNhat++; else themMoi++;
        var cu = xepLop[e.ma];
        if (cu && String(cu.lop).trim().toUpperCase() !== e.lop.trim().toUpperCase()) {
          chuyenLop.push(e.ho_ten + ': ' + cu.lop + ' → ' + e.lop);
        }
        if (!lopCu[e.lop]) lopMoi[e.lop] = e.khoi;
      });

      bo[1].forEach(function (x) {
        if (!maTrongTep[x.hoc_sinh_ma]) khongCoTrongTep.push(x.hoc_sinh_ma);
      });

      return {
        themMoi: themMoi, capNhat: capNhat, chuyenLop: chuyenLop,
        lopMoi: lopMoi, khongCoTrongTep: khongCoTrongTep,
        lopDaCo: lopCu
      };
    });
  }

  // Đối chiếu đội ngũ: so với DANH SÁCH MỜI và với người ĐÃ đăng nhập.
  function doiChieuGV(kq) {
    var may = window.MAY_CHU;
    return Promise.all([
      may.from('moi_tai_khoan').select('email,ho_ten,chuc_vu,vai_tro'),
      may.from('nguoi_dung').select('email,ho_ten,vai_tro,trang_thai')
    ]).then(function (r) {
      if (r[0].error) throw r[0].error;
      if (r[1].error) throw r[1].error;
      var moiCu = {}; (r[0].data || []).forEach(function (x) { moiCu[String(x.email).toLowerCase()] = x; });
      var daVao = {}; (r[1].data || []).forEach(function (x) { daVao[String(x.email).toLowerCase()] = x; });

      var themMoi = 0, capNhat = 0, giuVaiTro = [], daDangNhap = 0, khongCoTrongTep = [];
      var emTrongTep = {};

      kq.em.forEach(function (e) {
        emTrongTep[e.email] = true;
        var cu = moiCu[e.email];
        if (cu) {
          capNhat++;
          // 🔴 KHÔNG ĐỔI VAI TRÒ NGƯỜI ĐÃ CÓ. Tệp CSDL ngành chỉ biết chức vụ
          // hành chính, không biết ai được trường giao quản trị hệ thống. Nạp
          // đè là hạ quyền quản trị xuống 'giao_vien' — trường mất đường vào
          // mà không ai hiểu vì sao. Vai trò chỉ đặt cho người MỚI.
          if (cu.vai_tro && cu.vai_tro !== e.vai_tro) {
            giuVaiTro.push(e.ho_ten + ': giữ ' + TEN_VAI[cu.vai_tro] +
              ' (tệp ghi ' + TEN_VAI[e.vai_tro] + ')');
          }
          e.vai_tro_ghi = cu.vai_tro;
        } else {
          themMoi++;
          e.vai_tro_ghi = e.vai_tro;
        }
        if (daVao[e.email]) daDangNhap++;
      });

      Object.keys(moiCu).forEach(function (k) {
        if (!emTrongTep[k]) khongCoTrongTep.push(moiCu[k].ho_ten || k);
      });

      return {
        themMoi: themMoi, capNhat: capNhat, giuVaiTro: giuVaiTro,
        daDangNhap: daDangNhap, khongCoTrongTep: khongCoTrongTep
      };
    });
  }

  var TEN_VAI = {
    admin: 'Quản trị', ban_giam_hieu: 'Ban giám hiệu', to_truong: 'Tổ trưởng',
    giao_vien: 'Giáo viên', nhan_vien: 'Nhân viên'
  };

  // ══════════════════════════════════════════════════════════════
  // GHI — ba bảng, theo lô, dừng ngay khi có lỗi
  // ══════════════════════════════════════════════════════════════
  function ghi(kq, nam, keDinhDanh, bao) {
    var may = window.MAY_CHU;
    var em = kq.em;
    if (LOAI === 'gv') {
      return (function () {
        var i = 0;
        function tiep() {
          if (i >= em.length) return Promise.resolve();
          var phan = em.slice(i, i + LO);
          bao('Ghi danh sách được phép đăng nhập ' + Math.min(i + phan.length, em.length) + '/' + em.length + '…');
          return may.from('moi_tai_khoan').upsert(phan.map(function (e) {
            return {
              email: e.email, ho_ten: e.ho_ten, chuc_vu: e.chuc_vu,
              vai_tro: e.vai_tro_ghi || e.vai_tro
            };
          }), { onConflict: 'email' }).then(function (r) {
            if (r && r.error) throw r.error;
            i += LO;
            return tiep();
          });
        }
        return tiep();
      })();
    }

    function loKe(ds, lam, nhan) {
      var i = 0;
      function tiep() {
        if (i >= ds.length) return Promise.resolve();
        var phan = ds.slice(i, i + LO);
        bao(nhan + ' ' + Math.min(i + phan.length, ds.length) + '/' + ds.length + '…');
        return lam(phan).then(function (r) {
          if (r && r.error) throw r.error;
          i += LO;
          return tiep();
        });
      }
      return tiep();
    }

    // 1. HỌC SINH. Chỉ gửi các cột lấy từ tệp — upsert của PostgREST chỉ ghi đè
    //    đúng những cột có trong dữ liệu gửi lên, nên mien_giam_mon / ghi_chu do
    //    nhà trường tự nhập trong app KHÔNG bị xoá.
    return loKe(em, function (phan) {
      return may.from('hoc_sinh').upsert(phan.map(function (e) {
        return {
          ma: e.ma, ho_ten: e.ho_ten, ngay_sinh: e.ngay_sinh,
          gioi_tinh: e.gioi_tinh, dan_toc: e.dan_toc,
          khuyet_tat_hoa_nhap: e.khuyet_tat_hoa_nhap
        };
      }), { onConflict: 'ma' });
    }, 'Ghi hồ sơ học sinh')

      // 2. LỚP HỌC — CHỈ THÊM LỚP CHƯA CÓ.
      //    Không upsert cả danh sách: lop_hoc giữ co_so_ma (lớp thuộc điểm
      //    trường nào), tệp của Bộ không có thông tin đó, ghi đè là mất sạch
      //    công gán cơ sở của nhà trường.
      .then(function () {
        var them = Object.keys(kq.soi.lopMoi).map(function (l) {
          return { nam_hoc: nam, lop: l, khoi: kq.soi.lopMoi[l] };
        });
        if (!them.length) return;
        bao('Tạo ' + them.length + ' lớp mới…');
        return may.from('lop_hoc').insert(them).then(function (r) { if (r.error) throw r.error; });
      })

      // 3. XẾP LỚP THEO NĂM. len_lop / so_buoi_nghi không gửi → giữ nguyên.
      .then(function () {
        return loKe(em, function (phan) {
          return may.from('hoc_sinh_lop').upsert(phan.map(function (e) {
            return { hoc_sinh_ma: e.ma, nam_hoc: nam, lop: e.lop, khoi: e.khoi, trang_thai: e.trang_thai };
          }), { onConflict: 'hoc_sinh_ma,nam_hoc' });
        }, 'Xếp lớp');
      })

      // 4. SỐ ĐỊNH DANH — chỉ khi thầy cô chủ động tích ô.
      .then(function () {
        if (!keDinhDanh) return;
        var ds = em.filter(function (e) { return e.dinh_danh; })
          .map(function (e) { return { hoc_sinh_ma: e.ma, so_dinh_danh: e.dinh_danh }; });
        if (!ds.length) return;
        return loKe(ds, function (phan) {
          return may.from('hoc_sinh_dinh_danh').upsert(phan, { onConflict: 'hoc_sinh_ma' });
        }, 'Ghi số định danh');
      });
  }

  // ══════════════════════════════════════════════════════════════
  // GIAO DIỆN
  // ══════════════════════════════════════════════════════════════
  function veTab(hop) {
    var namNay = (window.CAU_HINH && window.CAU_HINH.NAM_HOC) || '';
    var dsNam = window.baNamHoc ? window.baNamHoc([KQ && KQ.nam]) : [namNay];
    // Năm chọn sẵn: lần trước thầy cô chọn gì thì giữ nguyên, chưa chọn thì
    // NĂM HIỆN HÀNH — không tự nhảy sang năm cũ dù tệp hay là dữ liệu năm cũ.
    var namChon = (KQ && KQ.nam) || namNay;

    var laGV = LOAI === 'gv';
    var so = 0;
    function soBuoc() { return '<div class="nap-so">' + (++so) + '</div>'; }

    hop.innerHTML =
      '<div class="nhan-nho" style="margin:14px 0 12px">' +
      'Nạp ' + bo().tenDai.toLowerCase() + ' từ tệp Excel tải về ở <b>CSDL ngành</b> ' +
      '(truong.csdl.moet.gov.vn → ' + bo().duong + ', tệp mẫu <i>' + bo().tepMau + '</i>). ' +
      'Máy <b>xem trước</b> và báo rõ sẽ ghi những gì, rồi mới hỏi có ghi hay không.</div>' +

      '<div class="hd-kiem vang" style="margin-bottom:16px">' +
      (laGV
        ? '<b>Hệ thống KHÔNG lấy</b> ngày sinh, số căn cước, điện thoại, địa chỉ, lương, ngạch bậc — ' +
          'dù tệp có sẵn tất cả. Chỉ lấy <b>họ tên · email · chức vụ</b> để dựng danh sách được phép ' +
          'đăng nhập.'
        : '<b>Hệ thống KHÔNG lấy</b> số điện thoại, họ tên cha mẹ, địa chỉ, nơi sinh — dù tệp có sẵn. ' +
          'Chỉ lấy phần cần cho sổ sách: mã, họ tên, ngày sinh, giới tính, dân tộc, lớp, trạng thái.') +
      '</div>' +

      '<div class="nap-buoc">' + soBuoc() +
      '<div class="nap-noi">' +
      '<label class="nap-nhan" for="nap-loai">Loại dữ liệu</label>' +
      '<select id="nap-loai" class="nap-chon">' +
      Object.keys(BO_NAP).map(function (k) {
        return '<option value="' + k + '"' + (k === LOAI ? ' selected' : '') + '>' +
          thoat(BO_NAP[k].ten) + '</option>';
      }).join('') + '</select>' +
      '<div class="nap-mach">Mỗi loại đọc một tệp mẫu khác nhau của CSDL ngành. ' +
      'Chọn nhầm loại thì máy báo không tìm thấy cột, chứ không nạp bừa.</div>' +
      '</div></div>' +

      (laGV ? '' :
        '<div class="nap-buoc">' + soBuoc() +
        '<div class="nap-noi">' +
        '<label class="nap-nhan" for="nap-nam">Nạp vào năm học nào</label>' +
        '<select id="nap-nam" class="nap-chon">' +
        dsNam.map(function (n) {
          // Hậu tố phải NGẮN: trên điện thoại ô chọn chỉ rộng chừng 250px, nhãn
          // dài bị cắt cụt giữa chừng ("2026-2027 — năm học hiện…").
          return '<option value="' + thoat(n) + '"' + (n === namChon ? ' selected' : '') + '>' +
            thoat(n) + (n === namNay ? ' (năm nay)' : '') + '</option>';
        }).join('') + '</select>' +
        '<div class="nap-mach">Trường mới vào hệ thống thường nạp <b>năm vừa xong</b> trước, ' +
        'vì tệp tải từ CSDL ngành là dữ liệu năm đó. Chọn sai năm thì máy sẽ nhắc lại ở bước xem trước.</div>' +
        '</div></div>') +

      '<div class="nap-buoc">' + soBuoc() +
      '<div class="nap-noi">' +
      '<label class="nap-nhan" for="nap-tep">Chọn tệp ' + bo().tenDai.toLowerCase() + '</label>' +
      '<input id="nap-tep" type="file" accept=".xls,.xlsx" class="nap-tep-that">' +
      '<label class="nap-nut-tep" for="nap-tep">📄 Chọn tệp Excel…</label>' +
      '<span id="nap-ten-tep" class="nap-ten-tep">Chưa chọn tệp nào</span>' +
      '<div class="nap-mach">Nhận tệp <b>.xls</b> và <b>.xlsx</b>. Giữ nguyên hàng tiêu đề của tệp mẫu, ' +
      'đừng xoá hay đổi tên cột.</div>' +
      '</div></div>' +

      '<div id="nap-ket"></div>';

    var oLoai = document.getElementById('nap-loai');
    if (oLoai) oLoai.addEventListener('change', function () {
      LOAI = oLoai.value;
      KQ = null;              // tệp cũ thuộc loại cũ, giữ lại là lẫn lộn
      veTab(hop);
    });

    var oTep = document.getElementById('nap-tep');
    oTep.addEventListener('change', function () {
      var tep = oTep.files && oTep.files[0];
      var oTen = document.getElementById('nap-ten-tep');
      if (!tep) { if (oTen) oTen.textContent = 'Chưa chọn tệp nào'; return; }
      if (oTen) oTen.textContent = tep.name;
      KQ = null;
      var ket = document.getElementById('nap-ket');
      ket.innerHTML = '<div class="the-thong-bao">Đang đọc tệp <b>' + thoat(tep.name) + '</b>…</div>';

      docTep(tep)
        .then(function (kq) {
          kq.tenTep = tep.name;
          KQ = kq;
          if (!kq.em.length) {
            ket.innerHTML = '<div class="hd-kiem do"><b>Không đọc được dòng nào.</b><br>' +
              (kq.loi.length ? kq.loi.slice(0, 10).map(thoat).join('<br>') : 'Trang tính “' + thoat(kq.trang) + '” chỉ có hàng tiêu đề.') +
              '</div>';
            return;
          }
          // KHÔNG tự ghi đè ô năm học. Thầy cô gõ 2026-2027 rồi chọn tệp mà máy
          // lặng lẽ đổi về 2025-2026 thì đúng số nhưng sai người quyết định —
          // và lần sau không ai hiểu vì sao dữ liệu nằm ở năm khác. Máy chỉ
          // NÓI năm nó đọc được từ tệp, kèm nút đổi; người bấm.
          var oNam = document.getElementById('nap-nam');
          if (oNam && kq.namDoan && !String(oNam.value || '').trim()) oNam.value = kq.namDoan;
          veSoiThu();
        })
        .catch(function (e) {
          ket.innerHTML = '<div class="hd-kiem do"><b>Không đọc được tệp.</b><br>' + thoat((e && e.message) || e) + '</div>';
        });
    });

    if (KQ && KQ.em && KQ.em.length) veSoiThu();
  }

  function veSoiThu() {
    var ket = document.getElementById('nap-ket');
    var oNam = document.getElementById('nap-nam');
    var nam = oNam ? String(oNam.value || '').trim() : '';
    if (bo().coNam && !/^\d{4}-\d{4}$/.test(nam)) {
      ket.innerHTML = '<div class="hd-kiem do"><b>Năm học phải viết dạng 2026-2027.</b> ' +
        'Sửa ô năm học rồi chọn lại tệp.</div>';
      return;
    }
    KQ.nam = nam;
    ket.innerHTML = '<div class="the-thong-bao">Đang đối chiếu với dữ liệu đang có…</div>';

    doiChieu(KQ, nam).then(function (soi) {
      KQ.soi = soi;
      if (LOAI === 'gv') return veSoiThuGV(ket, soi);

      var theoKhoi = {}, theoLop = {}, dangHoc = 0;
      KQ.em.forEach(function (e) {
        theoKhoi[e.khoi] = (theoKhoi[e.khoi] || 0) + 1;
        theoLop[e.lop] = true;
        if (e.trang_thai === 'dang_hoc') dangHoc++;
      });
      var soLop = Object.keys(theoLop).length;
      var lopMoi = Object.keys(soi.lopMoi);
      var canhBaoNam = KQ.namDoan && KQ.namDoan !== nam;

      var html =
        '<div class="hd-kiem xanh"><b>Đã đọc xong — chưa ghi gì vào hệ thống.</b><br>' +
        'Tệp <b>' + thoat(KQ.tenTep) + '</b> · trang tính “' + thoat(KQ.trang) + '”</div>';

      if (canhBaoNam) {
        html += '<div class="hd-kiem do" style="margin-top:10px"><b>Kiểm lại năm học!</b><br>' +
          'Ngày trong tệp cho thấy đây là dữ liệu năm học <b>' + thoat(KQ.namDoan) + '</b>, ' +
          'nhưng ô năm học đang để <b>' + thoat(nam) + '</b>. ' +
          'Nạp nhầm năm thì màn Quản lý học sinh vẫn hiện đủ số nhưng gắn sai năm, ' +
          'và số liệu ba năm của Biểu 1 lệch theo.<br><br>' +
          '<button class="nut-phu" id="nap-doi-nam">Dùng năm ' + thoat(KQ.namDoan) + ' theo tệp</button></div>';
      }

      html += '<div class="cuon-ngang" style="margin-top:12px"><table class="bang-quan-tri"><tbody>' +
        dong('Tổng số học sinh trong tệp', '<b>' + KQ.em.length + '</b> em' +
          (dangHoc !== KQ.em.length ? ' — trong đó <b>' + dangHoc + '</b> em đang học, ' +
            (KQ.em.length - dangHoc) + ' em đã chuyển đi / thôi học' : '')) +
        dong('Số lớp', soLop + ' lớp · ' + [1, 2, 3, 4, 5].map(function (k) {
          return theoKhoi[k] ? ('K' + k + ': ' + theoKhoi[k]) : null;
        }).filter(Boolean).join(' · ')) +
        dong('Thêm mới vào hệ thống', '<b>' + soi.themMoi + '</b> em') +
        dong('Cập nhật thông tin em đã có', soi.capNhat + ' em') +
        dong('Lớp sẽ tạo mới cho năm ' + thoat(nam),
          lopMoi.length ? '<b>' + lopMoi.length + '</b> lớp: ' + thoat(lopMoi.sort().join(', ')) +
            '<br><small>Lớp mới chưa gắn điểm trường — vào thẻ 🏫 Cơ sở &amp; Sáp nhập gán sau.</small>'
            : 'không có (mọi lớp đã khai)') +
        (soi.chuyenLop.length ? dong('Đổi lớp so với hiện tại',
          '<b>' + soi.chuyenLop.length + '</b> em<br><small>' +
          thoat(soi.chuyenLop.slice(0, 8).join(' · ')) +
          (soi.chuyenLop.length > 8 ? ' … và ' + (soi.chuyenLop.length - 8) + ' em nữa' : '') + '</small>') : '') +
        (soi.khongCoTrongTep.length ? dong('Có trong hệ thống, KHÔNG có trong tệp',
          '<b>' + soi.khongCoTrongTep.length + '</b> em<br><small>Hệ thống <b>không xoá</b> các em này. ' +
          'Nếu tệp là danh sách đầy đủ thì kiểm lại vì sao thiếu.</small>') : '') +
        '</tbody></table></div>';

      if (KQ.loi.length) {
        html += '<div class="hd-kiem do" style="margin-top:12px"><b>' + KQ.loi.length +
          ' dòng bị bỏ qua vì thiếu hoặc sai dữ liệu bắt buộc:</b><br>' +
          KQ.loi.slice(0, 15).map(thoat).join('<br>') +
          (KQ.loi.length > 15 ? '<br>… và ' + (KQ.loi.length - 15) + ' dòng nữa' : '') +
          '<br><br>Sửa trong tệp Excel rồi chọn lại tệp. Vẫn ghi được phần còn lại nếu thầy cô chấp nhận bỏ các dòng này.</div>';
      }
      if (KQ.nhac.length) {
        html += '<div class="hd-kiem vang" style="margin-top:12px">' +
          KQ.nhac.slice(0, 10).map(thoat).join('<br>') + '</div>';
      }

      html += '<label style="display:block;margin:14px 0">' +
        '<input type="checkbox" id="nap-dinh-danh"> Nạp cả <b>số định danh cá nhân</b> ' +
        '(căn cước) — chỉ quản trị đọc được, dùng khi làm học bạ số. Không cần thì để trống.</label>' +

        '<div class="nap-hanh-dong">' +
        '<button class="nut-chinh" id="nap-ghi">📥 Ghi ' + KQ.em.length + ' em vào hệ thống</button>' +
        '<button class="nut-phu" id="nap-huy">Huỷ</button></div>' +
        '<div id="nap-tien" style="margin-top:12px"></div>';

      ket.innerHTML = html;
      if (canhBaoNam) {
        var nutNam = document.getElementById('nap-doi-nam');
        if (nutNam) nutNam.addEventListener('click', function () {
          var oNam = document.getElementById('nap-nam');
          // Ô chọn chỉ dựng sẵn ba năm quanh năm hiện hành. Tệp cũ hơn thế
          // (trường nạp bù dữ liệu 2023-2024) thì gán value suông không ăn —
          // select bỏ qua giá trị không có trong danh sách và giữ nguyên năm cũ,
          // bấm nút xong không thấy gì đổi.
          if (oNam.querySelector && !oNam.querySelector('option[value="' + KQ.namDoan + '"]')) {
            var o = document.createElement('option');
            o.value = KQ.namDoan; o.textContent = KQ.namDoan;
            oNam.appendChild(o);
          }
          oNam.value = KQ.namDoan;
          veSoiThu();     // đối chiếu lại từ đầu: năm khác thì lớp và sĩ số khác
        });
      }
      document.getElementById('nap-ghi').addEventListener('click', bamGhi);
      document.getElementById('nap-huy').addEventListener('click', function () {
        KQ = null; window.veQuanTri();
      });
    }).catch(function (e) {
      ket.innerHTML = '<div class="hd-kiem do"><b>Không đối chiếu được với máy chủ.</b><br>' +
        thoat((e && e.message) || e) + '<br><br>Chưa có gì được ghi. Kiểm tra mạng rồi chọn lại tệp.</div>';
    });
  }

  // ── Xem trước ĐỘI NGŨ ──
  function veSoiThuGV(ket, soi) {
    var theoVai = {};
    KQ.em.forEach(function (e) {
      var v = e.vai_tro_ghi || e.vai_tro;
      theoVai[v] = (theoVai[v] || 0) + 1;
    });

    var html =
      '<div class="hd-kiem xanh"><b>Đã đọc xong — chưa ghi gì vào hệ thống.</b><br>' +
      'Tệp <b>' + thoat(KQ.tenTep) + '</b> · trang tính “' + thoat(KQ.trang) + '”</div>' +

      '<div class="cuon-ngang" style="margin-top:12px"><table class="bang-quan-tri"><tbody>' +
      dong('Đọc được', '<b>' + KQ.em.length + '</b> người đang làm việc') +
      dong('Thêm vào danh sách đăng nhập', '<b>' + soi.themMoi + '</b> người') +
      dong('Cập nhật họ tên / chức vụ', soi.capNhat + ' người') +
      dong('Phân theo vai trò', Object.keys(theoVai).map(function (v) {
        return TEN_VAI[v] + ': ' + theoVai[v];
      }).join(' · ')) +
      (soi.daDangNhap ? dong('Trong đó đã từng đăng nhập', soi.daDangNhap + ' người') : '') +
      (soi.giuVaiTro.length ? dong('GIỮ NGUYÊN vai trò đang có',
        '<b>' + soi.giuVaiTro.length + '</b> người<br><small>' +
        thoat(soi.giuVaiTro.slice(0, 6).join(' · ')) +
        (soi.giuVaiTro.length > 6 ? ' … và ' + (soi.giuVaiTro.length - 6) + ' người nữa' : '') +
        '<br>Tệp CSDL ngành chỉ biết chức vụ hành chính, không biết ai được trường giao quản trị ' +
        'hệ thống — nên nạp lại <b>không bao giờ hạ quyền ai</b>. Đổi vai trò ở thẻ 👥 Tài khoản.' +
        '</small>') : '') +
      (soi.khongCoTrongTep.length ? dong('Có trong danh sách, KHÔNG có trong tệp',
        '<b>' + soi.khongCoTrongTep.length + '</b> người<br><small>Hệ thống <b>không xoá</b> ai. ' +
        thoat(soi.khongCoTrongTep.slice(0, 6).join(' · ')) +
        (soi.khongCoTrongTep.length > 6 ? ' …' : '') + '</small>') : '') +
      '</tbody></table></div>';

    if (KQ.loi.length) {
      html += '<div class="hd-kiem do" style="margin-top:12px"><b>' + KQ.loi.length +
        ' dòng bị bỏ qua:</b><br>' + KQ.loi.slice(0, 15).map(thoat).join('<br>') +
        (KQ.loi.length > 15 ? '<br>… và ' + (KQ.loi.length - 15) + ' dòng nữa' : '') +
        '<br><br>Sửa trong tệp Excel rồi chọn lại tệp. Vẫn ghi được phần còn lại.</div>';
    }
    if (KQ.nhac.length) {
      // Cố ý KHÔNG thoát HTML: các câu nhắc do chính module này soạn, có thẻ <b>.
      html += '<div class="hd-kiem vang" style="margin-top:12px">' + KQ.nhac.join('<br><br>') + '</div>';
    }

    html += '<div class="hd-kiem vang" style="margin-top:12px">' +
      '<b>Việc này chỉ mở cửa đăng nhập, chưa tạo tài khoản cho ai.</b> Thầy cô có tên trong ' +
      'danh sách thì lần đầu đăng nhập Google là vào thẳng, đúng vai trò; ai không có tên vẫn ' +
      'đăng nhập được nhưng dừng ở màn chờ duyệt. ' +
      '<b>Địa chỉ phải đúng Gmail thầy cô dùng thật</b> — đăng nhập hệ thống là đăng nhập bằng Google.' +
      '</div>' +

      '<div class="nap-hanh-dong">' +
      '<button class="nut-chinh" id="nap-ghi">📥 Ghi ' + KQ.em.length + ' người vào danh sách</button>' +
      '<button class="nut-phu" id="nap-huy">Huỷ</button></div>' +
      '<div id="nap-tien" style="margin-top:12px"></div>';

    ket.innerHTML = html;
    document.getElementById('nap-ghi').addEventListener('click', bamGhi);
    document.getElementById('nap-huy').addEventListener('click', function () {
      KQ = null; window.veQuanTri();
    });
  }

  function dong(a, b) {
    return '<tr><td style="white-space:nowrap">' + a + '</td><td>' + b + '</td></tr>';
  }

  function bamGhi() {
    if (DANG_GHI || !KQ || !KQ.soi) return;
    var nam = KQ.nam;
    var oDD = document.getElementById('nap-dinh-danh');
    var keDinhDanh = !!(oDD && oDD.checked);
    var tien = document.getElementById('nap-tien');
    var nutGhi = document.getElementById('nap-ghi');

    var hoi = LOAI === 'gv'
      ? 'Ghi ' + KQ.em.length + ' người vào danh sách được phép đăng nhập?\n\n' +
        '· Thêm mới: ' + KQ.soi.themMoi + ' người\n' +
        '· Cập nhật họ tên / chức vụ: ' + KQ.soi.capNhat + ' người\n' +
        (KQ.soi.giuVaiTro.length ? '· GIỮ NGUYÊN vai trò của ' + KQ.soi.giuVaiTro.length + ' người đã có\n' : '') +
        '\nKhông xoá ai, không hạ quyền ai. Thao tác được ghi vào sổ nhật ký.'
      : 'Ghi ' + KQ.em.length + ' em vào năm học ' + nam + '?\n\n' +
        '· Thêm mới: ' + KQ.soi.themMoi + ' em\n' +
        '· Cập nhật: ' + KQ.soi.capNhat + ' em\n' +
        (Object.keys(KQ.soi.lopMoi).length ? '· Tạo mới ' + Object.keys(KQ.soi.lopMoi).length + ' lớp\n' : '') +
        (keDinhDanh ? '· KÈM số định danh cá nhân\n' : '') +
        '\nHệ thống không xoá em nào. Thao tác được ghi vào sổ nhật ký.';

    var xacNhan = window.hopHoi ? window.hopHoi(hoi, { tieuDe: 'Ghi vào hệ thống', nutOK: 'Ghi' })
      : Promise.resolve(window.confirm(hoi));

    xacNhan.then(function (dong_y) {
      if (!dong_y) return;
      DANG_GHI = true;
      nutGhi.disabled = true;
      document.getElementById('nap-huy').disabled = true;

      ghi(KQ, nam, keDinhDanh, function (chu) {
        tien.innerHTML = '<div class="the-thong-bao">' + thoat(chu) + '</div>';
      })
        .then(function () {
          DANG_GHI = false;
          tien.innerHTML = LOAI === 'gv'
            ? '<div class="hd-kiem xanh"><b>Xong. Đã ghi ' + KQ.em.length + ' người vào danh sách ' +
              'được phép đăng nhập.</b><br>' +
              'Soát lại ở thẻ <b>✉️ Danh sách mời</b>; ai đã đăng nhập rồi thì xem ở thẻ ' +
              '<b>👥 Tài khoản</b>. Vai trò sửa được ở đó.</div>'
            : '<div class="hd-kiem xanh"><b>Xong. Đã ghi ' + KQ.em.length +
              ' em vào năm học ' + thoat(nam) + '.</b><br>' +
              'Mở màn <b>Quản lý học sinh</b> để xem danh sách theo khối và lớp. ' +
              'Lớp mới tạo cần gán điểm trường ở thẻ <b>🏫 Cơ sở &amp; Sáp nhập</b>.</div>';
          KQ = null;
        })
        // Hỏng giữa chừng thì một PHẦN đã vào cơ sở dữ liệu — phải nói thẳng,
        // đừng để thầy cô tưởng chưa ghi gì rồi bấm lại từ đầu mà không kiểm.
        .catch(function (e) {
          DANG_GHI = false;
          nutGhi.disabled = false;
          document.getElementById('nap-huy').disabled = false;
          tien.innerHTML = '<div class="hd-kiem do"><b>Dừng giữa chừng vì lỗi.</b><br>' +
            thoat((e && e.message) || e) +
            '<br><br><b>Một phần dữ liệu có thể đã được ghi.</b> Bấm ghi lại là an toàn — ' +
            'hệ thống ghi đè theo mã học sinh, không sinh bản trùng.</div>';
        });
    });
  }

  window.qtTabPhu.push({ ma: 'nap', ten: '📥 Nạp dữ liệu', ve: veTab });
})();
