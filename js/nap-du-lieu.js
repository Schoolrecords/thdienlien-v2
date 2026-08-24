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
  // Số lượt soi thử. Đổi năm hai lần liên tiếp là hai lượt đối chiếu cùng
  // chạy; lượt cũ về SAU sẽ vẽ đè kết quả của lượt mới — bảng nói năm 2025
  // trong khi ô chọn ghi 2026. Mỗi lượt mang số của mình, về mà số đã lệch
  // thì bỏ, không vẽ.
  var LUOT_SOI = 0;
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

  // Biểu chia lớp tuyển sinh do CHÍNH TRƯỜNG lập — không phải mẫu của Bộ.
  // Mỗi trường một kiểu, nhưng khung thì giống nhau: một dòng "LỚP 1A" rồi tới
  // các dòng học sinh. Không có cột mã học sinh, vì lúc này Bộ chưa cấp mã.
  var COT_TS = {
    ho_ten:     { ten: 'Họ và tên',   tim: ['ho va ten', 'ho ten'],                 buoc: true },
    ngay_sinh:  { ten: 'Ngày sinh',   tim: ['ngay sinh'],                           buoc: true },
    dinh_danh:  { ten: 'Số CCCD',     tim: ['so cccd', 'so dinh danh', 'cccd', 'so cmnd/tcc'] },
    nu:         { ten: 'Nữ',          tim: ['nu'] },
    dan_toc:    { ten: 'Dân tộc',     tim: ['dan toc'] },
    khuyet_tat: { ten: 'K.tật',       tim: ['k.tat', 'k tat', 'khuyet tat'] }
  };

  var BO_NAP = {
    hs: {
      ten: 'Học sinh', tenDai: 'Danh sách học sinh',
      tepMau: 'C1-HocSinh', duong: 'Học sinh → Xuất Excel',
      coNam: true, cot: COT_HS, batBuoc: ['ma', 'ho_ten', 'lop']
    },
    ts: {
      ten: 'Tuyển sinh lớp 1', tenDai: 'Danh sách tuyển sinh lớp 1',
      tepMau: 'biểu chia lớp của trường', duong: 'biểu chia lớp nhà trường tự lập',
      coNam: true, cot: COT_TS, batBuoc: ['ho_ten', 'ngay_sinh'], maTam: true
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

    // 🔴 SỐ SÊ-RI EXCEL. Ô nào người lập biểu để định dạng "Số" thay vì "Ngày"
    //    thì SheetJS trả về "44096" chứ không phải "08/09/2020" — dù raw:false.
    //    Gặp thật ở biểu tuyển sinh Châu Đình: đúng MỘT em trong 73, và nếu bỏ
    //    qua thì em đó lặng lẽ biến mất khỏi danh sách.
    //    Mốc 30/12/1899 là gốc của Excel; khoảng 20000–60000 tương ứng
    //    1954–2064, đủ rộng cho ngày sinh mà không nuốt nhầm mã số.
    if (/^\d{4,5}$/.test(t)) {
      var so = +t;
      if (so >= 20000 && so <= 60000) {
        var ng = new Date(Date.UTC(1899, 11, 30) + so * 86400000);
        if (!isNaN(ng.getTime())) return ng.toISOString().slice(0, 10);
      }
    }
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
    if (LOAI === 'gv') return phanTichGV(t);
    if (LOAI === 'ts') return phanTichTS(t);
    return phanTichHS(t);
  }

  // ══════════════════════════════════════════════════════════════
  // TUYỂN SINH LỚP 1 — MÃ TẠM
  //
  // Trường tuyển sinh xong là có danh sách chia lớp ngay, nhưng CSDL ngành chưa
  // cấp mã học sinh (phải nhập lên Bộ rồi Bộ mới sinh mã). Trong khi chờ, nhà
  // trường vẫn cần thấy lớp 1 trong hệ thống để phân công và làm hồ sơ đầu năm.
  //
  // Nạp với mã tạm 'TAM-<số căn cước>'. Khi có tệp của Bộ, màn nạp Học sinh sẽ
  // ĐỔI mã tạm thành mã thật (đối chiếu bằng số căn cước, hàm doi_ma_tam ở
  // sql/52) — KHÔNG tạo bản ghi thứ hai. Vì vậy cột Số CCCD là cột đáng đòi
  // nhất trong biểu tuyển sinh: em nào thiếu là sau này phải sửa tay.
  //
  // Tên lớp nằm ở DÒNG RIÊNG ("LỚP 1A") chứ không phải một cột — đặc trưng của
  // biểu chia lớp do trường tự lập.
  // ══════════════════════════════════════════════════════════════
  function phanTichTS(t) {
    var cot = t.cot;
    var em = [], loi = [], nhac = [], daGap = {}, thieuCC = 0;
    var lop = '', chuaCoLop = 0;

    function doDongLop(d) {
      var cum = d.map(function (x) { return String(x == null ? '' : x).trim(); }).join(' ');
      var m = cum.match(/LỚP\s*([1-5][A-Za-zĐđ]?)\b/i);
      // "LỚP 1A" đứng một mình mới là dòng tiêu đề lớp; dòng học sinh có số thứ
      // tự ở cột đầu.
      if (m && !/^\d+$/.test(String(d[0] == null ? '' : d[0]).trim())) return m[1].toUpperCase();
      return '';
    }

    // 🔴 Lớp ĐẦU TIÊN thường nằm TRÊN hàng tiêu đề: biểu của trường hay xếp
    //    "LỚP 1A" ngay dưới dòng "DANH SÁCH TUYỂN SINH", rồi mới tới hàng tiêu
    //    đề cột. Chỉ quét xuôi từ hàng tiêu đề là mất trắng lớp đầu — mà mất
    //    lặng lẽ: máy vẫn báo đọc xong, chỉ thiếu 24 em.
    for (var q = t.dongTieuDe - 1; q >= 0 && !lop; q--) {
      lop = doDongLop(t.hang[q] || []);
    }

    for (var r = t.dongTieuDe + 1; r < t.hang.length; r++) {
      var d = t.hang[r] || [];
      var lay = function (k) { return cot[k] == null ? '' : String(d[cot[k]] == null ? '' : d[cot[k]]).trim(); };
      var soDong = r + 1;

      var lopMoiDong = doDongLop(d);
      if (lopMoiDong) { lop = lopMoiDong; continue; }

      var hoTen = lay('ho_ten');
      if (!hoTen) continue;
      // Dòng chữ ký, dòng tổng cộng ở cuối biểu — bỏ qua, đừng báo lỗi ầm ĩ.
      if (/^(tổng|cộng|người lập|hiệu trưởng|ghi chú)/i.test(hoTen)) continue;
      // 🔴 Biểu chia lớp LẶP LẠI HÀNG TIÊU ĐỀ ở đầu mỗi lớp. Không loại thì mỗi
      //    lớp dư một "em" tên là "Họ và tên" — sĩ số sai đúng bằng số lớp, một
      //    con số nhỏ vừa đủ để không ai nghi ngờ.
      if (['ho va ten', 'ho ten', 'stt', 'ho va ten hoc sinh'].indexOf(chuanHoa(hoTen)) >= 0) continue;

      if (!lop) { chuaCoLop++; continue; }

      var ns = doiNgay(lay('ngay_sinh'));
      if (!ns) {
        loi.push('Hàng ' + soDong + ': ' + hoTen + ' — ngày sinh "' + lay('ngay_sinh') + '" không đọc được');
        continue;
      }

      var cc = lay('dinh_danh').replace(/\s+/g, '');
      var ma;
      if (cc) {
        if (daGap[cc]) {
          loi.push('Hàng ' + soDong + ': ' + hoTen + ' trùng số căn cước với ' + daGap[cc] + ' (' + cc + ')');
          continue;
        }
        daGap[cc] = hoTen;
        ma = 'TAM-' + cc;
      } else {
        // Không có căn cước thì vẫn nạp được, nhưng sau này KHÔNG tự đối chiếu
        // để đổi sang mã thật — phải sửa tay. Mã dựng từ ngày sinh + tên bỏ dấu
        // cho ổn định giữa các lần nạp lại.
        thieuCC++;
        ma = 'TAM-' + ns.replace(/-/g, '') + '-' +
          chuanHoa(hoTen).replace(/[^a-z0-9]/g, '').slice(0, 16);
      }

      em.push({
        ma: ma,
        ho_ten: hoTen.replace(/\s+/g, ' '),
        ngay_sinh: ns,
        gioi_tinh: lay('nu') ? 'Nữ' : 'Nam',
        dan_toc: lay('dan_toc') || null,
        khuyet_tat_hoa_nhap: !!lay('khuyet_tat'),
        ghi_chu: 'Mã tạm — chờ mã CSDL ngành',
        lop: lop,
        khoi: doiKhoi(lop) || 1,
        trang_thai: 'dang_hoc',
        dinh_danh: cc || null
      });
    }

    if (chuaCoLop) {
      nhac.push('<b>' + chuaCoLop + ' dòng nằm TRƯỚC dòng "LỚP …" đầu tiên nên bị bỏ qua.</b> ' +
        'Biểu phải có dòng ghi tên lớp (ví dụ “LỚP 1A”) ngay trên nhóm học sinh của lớp đó.');
    }
    if (thieuCC) {
      nhac.push('<b>' + thieuCC + ' em chưa có số căn cước.</b> Vẫn nạp được, nhưng khi có tệp ' +
        'CSDL ngành thì máy KHÔNG tự đối chiếu để gán mã chính thức cho các em này — phải sửa tay. ' +
        'Nên bổ sung số căn cước vào biểu rồi nạp lại trước khi đi tiếp.');
    }
    nhac.push('Học sinh nạp theo đường này mang <b>mã tạm</b> (bắt đầu bằng <b>TAM-</b>). ' +
      'Khi nhà trường nhập tuyển sinh lên truong.csdl.moet.gov.vn và tải được tệp ' +
      '<i>C1-HocSinh</i>, hãy nạp lại bằng loại <b>Học sinh</b> — máy sẽ <b>đổi mã tạm thành mã ' +
      'chính thức</b>, không tạo thêm bản ghi nào.');

    return { trang: t.trang, em: em, loi: loi, nhac: nhac, namDoan: '', soCot: t.soCot };
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
      may.from('lop_hoc').select('lop,khoi,co_so_ma').eq('nam_hoc', nam),
      // Số căn cước của những em đang mang MÃ TẠM — chìa khoá để đổi sang mã
      // chính thức thay vì tạo bản ghi thứ hai. Bảng này chỉ quản trị đọc được;
      // lỗi quyền thì coi như không có em mã tạm nào, đừng làm hỏng cả lần nạp.
      may.from('hoc_sinh_dinh_danh').select('hoc_sinh_ma,so_dinh_danh')
        .like('hoc_sinh_ma', 'TAM-%')
        .then(function (r) { return r.error ? { data: [] } : r; }, function () { return { data: [] }; })
    ]).then(function (bo) {
      var coSan = {};   bo[0].forEach(function (x) { coSan[x.ma] = true; });
      var xepLop = {};  bo[1].forEach(function (x) { xepLop[x.hoc_sinh_ma] = x; });
      var lopCu = {};
      if (bo[2].error) throw bo[2].error;
      (bo[2].data || []).forEach(function (x) { lopCu[x.lop] = x; });

      // Số căn cước → mã tạm. Chỉ dựng bảng này khi tệp CÓ cột số định danh
      // (tệp tuyển sinh nạp lại thì không cần: mã của nó vốn đã là mã tạm).
      var maTamTheoCC = {};
      if (LOAI === 'hs') {
        (bo[3].data || []).forEach(function (x) {
          var cc = String(x.so_dinh_danh || '').trim();
          if (cc) maTamTheoCC[cc] = x.hoc_sinh_ma;
        });
      }

      var themMoi = 0, capNhat = 0, chuyenLop = [], lopMoi = {}, khongCoTrongTep = [];
      var doiMa = [];

      kq.em.forEach(function (e) {
        // Em này đang nằm trong hệ thống dưới một mã tạm → sẽ ĐỔI mã, không
        // thêm bản ghi mới.
        var cc = String(e.dinh_danh || '').trim();
        if (cc && !coSan[e.ma] && maTamTheoCC[cc]) {
          e.ma_tam_cu = maTamTheoCC[cc];
          doiMa.push(e.ho_ten + ' (' + maTamTheoCC[cc] + ' → ' + e.ma + ')');
        }
        if (coSan[e.ma]) capNhat++; else themMoi++;
        var cu = xepLop[e.ma];
        if (cu && String(cu.lop).trim().toUpperCase() !== e.lop.trim().toUpperCase()) {
          chuyenLop.push(e.ho_ten + ': ' + cu.lop + ' → ' + e.lop);
        }
        if (!lopCu[e.lop]) lopMoi[e.lop] = e.khoi;
      });

      bo[1].forEach(function (x) {
        // Em mang mã tạm sắp được đổi sang mã thật thì KHÔNG phải "em bị thiếu
        // trong tệp" — báo thế là doạ người dùng vì một việc bình thường.
        if (maTrongTep[x.hoc_sinh_ma]) return;
        var sapDoi = doiMa.some(function (s) { return s.indexOf('(' + x.hoc_sinh_ma + ' →') >= 0; });
        if (!sapDoi) khongCoTrongTep.push(x.hoc_sinh_ma);
      });

      // Em sắp đổi mã đang bị đếm vào "thêm mới" — trừ ra cho đúng.
      themMoi -= doiMa.length;

      return {
        themMoi: themMoi, capNhat: capNhat, chuyenLop: chuyenLop,
        lopMoi: lopMoi, khongCoTrongTep: khongCoTrongTep,
        lopDaCo: lopCu, doiMa: doiMa
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

    // 0. ĐỔI MÃ TẠM → MÃ CHÍNH THỨC, TRƯỚC MỌI VIỆC KHÁC.
    //    Làm sau khi upsert là muộn: lúc đó em đã có thêm một bản ghi mang mã
    //    thật, và hàm doi_ma_tam sẽ từ chối vì "mã chính thức đã tồn tại".
    //    Đổi từng em một (số lượng nhỏ, mỗi năm một khối), lỗi em nào ghi lại
    //    em đó chứ không dừng cả lần nạp — 73 em mà hỏng vì 1 em là vô lý.
    var loiDoiMa = [];
    var canDoi = em.filter(function (e) { return e.ma_tam_cu; });

    return (function () {
      if (!canDoi.length) return Promise.resolve();
      var i = 0;
      function tiep() {
        if (i >= canDoi.length) return Promise.resolve();
        var e = canDoi[i++];
        bao('Gán mã chính thức cho em đã có mã tạm ' + i + '/' + canDoi.length + '…');
        return may.rpc('doi_ma_tam', { p_dinh_danh: e.dinh_danh, p_ma_that: e.ma })
          .then(function (r) {
            if (r.error) loiDoiMa.push(e.ho_ten + ': ' + (r.error.message || 'lỗi không rõ'));
            else if (r.data && r.data.loi) loiDoiMa.push(e.ho_ten + ': ' + r.data.loi);
            return tiep();
          })
          .catch(function (er) {
            loiDoiMa.push(e.ho_ten + ': ' + ((er && er.message) || er));
            return tiep();
          });
      }
      return tiep();
    })()

    // 1. HỌC SINH. Chỉ gửi các cột lấy từ tệp — upsert của PostgREST chỉ ghi đè
    //    đúng những cột có trong dữ liệu gửi lên, nên mien_giam_mon / ghi_chu do
    //    nhà trường tự nhập trong app KHÔNG bị xoá.
      .then(function () {
        return loKe(em, function (phan) {
          return may.from('hoc_sinh').upsert(phan.map(function (e) {
            var o = {
              ma: e.ma, ho_ten: e.ho_ten, ngay_sinh: e.ngay_sinh,
              gioi_tinh: e.gioi_tinh, dan_toc: e.dan_toc,
              khuyet_tat_hoa_nhap: e.khuyet_tat_hoa_nhap
            };
            // Chỉ bộ tuyển sinh mới đặt ghi_chu (đánh dấu mã tạm). Bộ Học sinh
            // KHÔNG gửi cột này để khỏi xoá ghi chú nhà trường tự nhập.
            if (e.ghi_chu) o.ghi_chu = e.ghi_chu;
            return o;
          }), { onConflict: 'ma' });
        }, 'Ghi hồ sơ học sinh');
      })

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
      //    NGOẠI LỆ: bộ Tuyển sinh lớp 1 LUÔN ghi. Ở đó số căn cước không phải
      //    dữ liệu thêm thắt mà là CHÌA KHOÁ: không có nó thì sau này không đối
      //    chiếu được để đổi mã tạm sang mã chính thức của Bộ.
      .then(function () {
        if (!keDinhDanh && LOAI !== 'ts') return;
        var ds = em.filter(function (e) { return e.dinh_danh; })
          .map(function (e) { return { hoc_sinh_ma: e.ma, so_dinh_danh: e.dinh_danh }; });
        if (!ds.length) return;
        return loKe(ds, function (phan) {
          return may.from('hoc_sinh_dinh_danh').upsert(phan, { onConflict: 'hoc_sinh_ma' });
        }, 'Ghi số căn cước');
      })

      // Đổi mã hỏng thì KHÔNG được im lặng: em đó giờ có hai bản ghi trong hệ
      // thống, một mã tạm một mã thật. Ném lỗi ra để màn hình nói thẳng.
      .then(function () {
        if (loiDoiMa.length) {
          throw new Error('Đã ghi xong, NHƯNG ' + loiDoiMa.length + ' em không gán được mã chính ' +
            'thức nên hiện có HAI bản ghi (một mã tạm, một mã thật): ' +
            loiDoiMa.slice(0, 5).join(' · ') +
            (loiDoiMa.length > 5 ? ' … và ' + (loiDoiMa.length - 5) + ' em nữa' : '') +
            '. Vào Quản lý học sinh tìm mã bắt đầu bằng TAM- để xử lý.');
        }
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

    // 🔴 ĐỔI NĂM SAU KHI ĐÃ SOI THỬ thì phải soi lại. Bản đầu không bắt sự
    //    kiện này: thầy cô soi xong, thấy máy nhắc "kiểm lại năm học", đổi ô
    //    năm rồi bấm Ghi — hộp xác nhận ghi năm mới, nhưng KQ.nam, bảng lớp
    //    mới, danh sách đổi lớp vẫn là của năm cũ. Đối chiếu một năm, ghi năm
    //    khác, mà màn hình không nói gì. Nay đổi năm là đối chiếu lại từ đầu
    //    (lớp và sĩ số mỗi năm mỗi khác); đang ghi dở thì không cho đổi.
    var oNamChon = document.getElementById('nap-nam');
    if (oNamChon) oNamChon.addEventListener('change', function () {
      if (DANG_GHI) {
        if (KQ && KQ.nam) oNamChon.value = KQ.nam;
        if (window.notify) window.notify('Đang ghi dở — không đổi năm học lúc này.');
        return;
      }
      if (KQ && KQ.em && KQ.em.length) veSoiThu();
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
    KQ.soi = null;    // kết quả cũ thuộc năm cũ — xoá ngay, kẻo bamGhi dùng nhầm
    ket.innerHTML = '<div class="the-thong-bao">Đang đối chiếu với dữ liệu đang có…</div>';

    var luot = ++LUOT_SOI, kqCuaLuot = KQ;
    doiChieu(KQ, nam).then(function (soi) {
      // Đã có lượt soi mới hơn, hoặc tệp đã bị thay / huỷ trong lúc chờ.
      if (luot !== LUOT_SOI || KQ !== kqCuaLuot) return;
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
        ((soi.doiMa && soi.doiMa.length) ? dong('Gán MÃ CHÍNH THỨC cho em đang mang mã tạm',
          '<b>' + soi.doiMa.length + '</b> em<br><small>' +
          thoat(soi.doiMa.slice(0, 6).join(' · ')) +
          (soi.doiMa.length > 6 ? ' … và ' + (soi.doiMa.length - 6) + ' em nữa' : '') +
          '<br>Các em này nạp trước bằng danh sách tuyển sinh. Máy đối chiếu theo <b>số căn ' +
          'cước</b> và <b>đổi mã</b> — không tạo thêm bản ghi, kết quả học tập đã nhập giữ nguyên.' +
          '</small>') : '') +
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

      html += (LOAI === 'ts'
        ? '<div class="hd-kiem vang" style="margin-top:12px"><b>Số căn cước luôn được lưu</b> với ' +
          'đường nạp này — không phải tích ô. Đó là chìa khoá để sau này máy nhận ra em nào đã có ' +
          'trong hệ thống mà gán mã chính thức của Bộ, thay vì tạo bản ghi thứ hai. ' +
          'Số này chỉ quản trị đọc được.</div>'
        : '<label style="display:block;margin:14px 0">' +
          '<input type="checkbox" id="nap-dinh-danh"> Nạp cả <b>số định danh cá nhân</b> ' +
          '(căn cước) — chỉ quản trị đọc được, dùng khi làm học bạ số. Không cần thì để trống.</label>') +

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
      if (luot !== LUOT_SOI || KQ !== kqCuaLuot) return;
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
    // Chốt chặn cuối: năm đã đối chiếu phải TRÙNG năm đang chọn trên ô. Lệch
    // là có ai đổi ô mà lượt soi lại chưa kịp về (hoặc bị lỗi) — không ghi,
    // soi lại rồi mới hỏi tiếp. Ghi năm khác năm đã đối chiếu là tạo lớp
    // thừa và xếp lớp sai năm mà hộp xác nhận vẫn nói đúng số.
    var oNamHienTai = document.getElementById('nap-nam');
    if (bo().coNam && oNamHienTai && String(oNamHienTai.value || '').trim() !== String(nam || '')) {
      if (window.notify) window.notify('Ô năm học đã đổi sau khi soi thử — máy đối chiếu lại rồi mới ghi.');
      veSoiThu();
      return;
    }
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
