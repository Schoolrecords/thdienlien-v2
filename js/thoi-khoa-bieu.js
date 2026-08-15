// ============================================================
// thoi-khoa-bieu.js — MODULE THỜI KHÓA BIỂU
// Thay chỗ màn Dự giờ trên thanh tab Điều hành (thầy Chung chốt 15/8/2026).
//
// ĐỌC TỆP EXCEL DO CÔNG CỤ XẾP LỊCH TẠO RA, không bắt ai gõ lại 710 tiết.
// Mẫu đối chiếu: TKB-Truong-Tieu-hoc-moi-20260815.xlsx — 10 tab, trong đó:
//   · TKB_LOP / TOAN_TRUONG : Thứ | Buổi | Tiết | <25 cột lớp>, ô = "Môn — GV"
//   · TKB_GV                : cùng lưới nhưng cột là giáo viên, ô = "Môn — Lớp"
//   · PCGD                  : TT | Giáo viên | Mã GV | Lớp | Điểm trường | Môn | Số tiết
//   · DIEM_TRUONG           : tổng hợp số lớp / GV / tiết mỗi điểm
//
// 🔑 CHỈ ĐỌC TAB THEO LỚP. Ba tab KHOI_*, TOAN_TRUONG, TKB_GV đều là CÙNG MỘT
//    dữ liệu bày theo cách khác — đọc nhiều tab là tự đẻ ra mâu thuẫn khi
//    người ta sửa tay một tab rồi quên tab kia. TKB theo giáo viên app TỰ
//    dựng lại từ dữ liệu lớp (xem doiChieuGV), luôn khớp.
//
// ⚠️ KHÔNG tự ý sửa nội dung tệp tải lên. Xếp thời khóa biểu là việc của
//    người, app chỉ nhận, kiểm tra rồi bày ra.
// ============================================================
(function () {
  'use strict';

  function thoat(s) { return window.thoatHTML ? window.thoatHTML(s) : String(s || ''); }
  function $(s) { return document.querySelector(s); }

  var THU = ['Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy', 'Chủ nhật'];
  var XEM = 'lop';        // lop | gv | ngay
  var CHON = '';          // lớp hoặc giáo viên đang xem
  var DU_LIEU = null;     // { tiet: [...], nguon: '', luc: '' }
  var LOI_DOC = '';

  // ══════════════════════════════════════════════════════════════════
  // TẠO TỆP MẪU — app điền sẵn mọi thứ đã biết, trường chỉ điền phần
  // app không thể biết (tiết nào học môn gì, ai dạy).
  // ══════════════════════════════════════════════════════════════════
  // 🔑 VÌ SAO PHẢI CÓ TỆP MẪU DO APP TẠO:
  // Tệp của phần mềm xếp lịch ghi tên lớp, tên giáo viên theo cách của nó —
  // "Điểm trường Diễn Liên" hay "Diễn Liên", "Cô Hòa" hay "Nguyễn Thị Hòa".
  // Lệch một chữ là app không tra được về đúng người, đúng lớp. Tệp mẫu chép
  // sẵn DANH SÁCH THẬT từ cơ sở dữ liệu nhà trường vào các tab danh mục, nên
  // người điền chỉ việc chọn lại, không gõ tay.
  //
  // Khung tiết mặc định: Thứ Hai–Thứ Sáu, sáng 4 tiết, chiều 3 tiết — đúng
  // nếp tiểu học 2 buổi/ngày. Trường dạy khác thì thêm/bớt DÒNG trong tab
  // TKB, app đọc theo dòng thật chứ không ép khung này.
  var MON_DP = [
    ['TV', 'Tiếng Việt', '1, 2, 3, 4, 5'], ['TOAN', 'Toán', '1, 2, 3, 4, 5'],
    ['DD', 'Đạo đức', '1, 2, 3, 4, 5'], ['TNXH', 'Tự nhiên và Xã hội', '1, 2, 3'],
    ['KH', 'Khoa học', '4, 5'], ['LSDL', 'Lịch sử và Địa lí', '4, 5'],
    ['THCN', 'Tin học và Công nghệ', '3, 4, 5'], ['NN1', 'Ngoại ngữ 1 (Tiếng Anh)', '3, 4, 5'],
    ['GDTC', 'Giáo dục thể chất', '1, 2, 3, 4, 5'], ['AN', 'Âm nhạc', '1, 2, 3, 4, 5'],
    ['MT', 'Mĩ thuật', '1, 2, 3, 4, 5'], ['HDTN', 'Hoạt động trải nghiệm', '1, 2, 3, 4, 5']
  ];

  function kho() { return (window.DH_KHO && window.DH_KHO.dl) ? window.DH_KHO.dl() : null; }

  function docMonHoc() {
    // Đọc danh mục môn + khối từ CSDL; lỗi hoặc chưa đăng nhập thì dùng bản
    // dự phòng ở trên (đúng seed sql/04, theo Chương trình GDPT 2018).
    if (!window.MAY_CHU || !(window.DH_KHO && window.DH_KHO.that && window.DH_KHO.that())) {
      return Promise.resolve(MON_DP);
    }
    return Promise.all([
      window.MAY_CHU.from('mon_hoc').select('ma, ten, so_tt').order('so_tt'),
      window.MAY_CHU.from('mon_hoc_khoi').select('mon_ma, khoi')
    ]).then(function (kq) {
      if (kq[0].error || kq[1].error || !(kq[0].data || []).length) return MON_DP;
      var khoi = {};
      (kq[1].data || []).forEach(function (x) {
        (khoi[x.mon_ma] = khoi[x.mon_ma] || []).push(x.khoi);
      });
      return kq[0].data.map(function (m) {
        return [m.ma, m.ten, (khoi[m.ma] || []).sort(function (a, b) { return a - b; }).join(', ')];
      });
    }).catch(function () { return MON_DP; });
  }

  window.tkbTaiMau = function () {
    if (!window.XLSX) { window.notify('Chưa nạp được thư viện Excel.'); return; }
    var dl = kho();
    if (!dl) { window.notify('Chưa nạp được dữ liệu nhà trường — đăng nhập rồi thử lại.'); return; }

    docMonHoc().then(function (dsMon) {
      var CH = window.CAU_HINH || {};
      var namHoc = (window.DH_KHO.nam && window.DH_KHO.nam()) || CH.NAM_HOC || '';
      var tenTruong = CH.TEN_TRUONG || 'Nhà trường';

      // ── Danh sách lớp thật, sắp theo khối rồi tên ──
      var lops = Object.keys(dl.lop || {}).sort(function (a, b) {
        var ka = (dl.lop[a] || {}).khoi || 0, kb = (dl.lop[b] || {}).khoi || 0;
        return ka - kb || a.localeCompare(b, 'vi');
      });
      if (!lops.length) {
        window.notify('Chưa có lớp nào của năm học ' + namHoc +
          '. Nạp danh sách lớp trước (Quản trị → Lên lớp hoặc Cơ sở & Sáp nhập).');
        return;
      }
      var tenCS = function (ma) {
        var c = (dl.coSo || []).filter(function (x) { return x.ma === ma; })[0];
        return c ? c.ten : (ma || '');
      };

      taoMauDep(dl, lops, tenCS, dsMon, tenTruong, namHoc);
    });
  };

  // ══════════════════════════════════════════════════════════════════
  // SINH TỆP MẪU KHỔ A4 NGANG — định dạng SpreadsheetML 2003 (.xml)
  // ══════════════════════════════════════════════════════════════════
  // Đã thử và LOẠI hai đường trước đó:
  //  · .xlsx qua SheetJS  → bản miễn phí KHÔNG ghi được định dạng: không
  //    viền, không màu, không khổ giấy. Đúng dữ liệu nhưng trắng trơn.
  //  · .xls dựng bằng HTML → có viền và màu, nhưng ĐO BẰNG EXCEL thì khổ giấy
  //    vẫn ra DỌC: Excel bỏ qua khối <x:WorksheetOptions> nhét trong HTML.
  //
  // SpreadsheetML 2003 là định dạng Excel GỐC nên nhận đủ: kiểu ô (viền, nền,
  // phông), độ rộng cột, chiều cao dòng, gộp ô, VÀ trang in (A4 ngang, lề,
  // vừa một trang ngang, đóng băng dòng tiêu đề, lặp tiêu đề khi sang trang,
  // đầu trang – chân trang). Excel mở thẳng, và bộ đọc của app cũng đọc lại
  // được — đã thử vòng tròn.
  //
  // 🔑 MỖI KHỐI MỘT TRANG TÍNH (5 lớp): 25 lớp xếp ngang trên A4 thì mỗi cột
  //    còn hơn 1cm, chữ bé như kiến. Bảng 5 lớp vừa khít A4 ngang, và đúng
  //    nếp nhà trường vẫn in thời khóa biểu theo khối.
  function taoMauDep(dl, lops, tenCS, dsMon, tenTruong, namHoc) {
    var THU5 = ['Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu'];
    var diaChi = (window.CAU_HINH || {}).DIA_CHI || '';

    function xml(s) {
      return String(s == null ? '' : s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
    }
    // Một ô. kieu: mã Style; gop: số cột gộp thêm; gopDoc: số dòng gộp thêm;
    // nhay: nhảy tới cột thứ mấy (1-based) — cần khi dòng trước đã gộp dọc.
    function o(chu, kieu, gop, gopDoc, nhay, soThuc) {
      return '<Cell' + (nhay ? ' ss:Index="' + nhay + '"' : '') +
        (kieu ? ' ss:StyleID="' + kieu + '"' : '') +
        (gop ? ' ss:MergeAcross="' + gop + '"' : '') +
        (gopDoc ? ' ss:MergeDown="' + gopDoc + '"' : '') + '>' +
        (chu === '' || chu == null ? '' :
          '<Data ss:Type="' + (soThuc ? 'Number' : 'String') + '">' + xml(chu) + '</Data>') +
        '</Cell>';
    }
    function dong(cells, cao) {
      return '<Row' + (cao ? ' ss:Height="' + cao + '"' : '') + '>' + cells + '</Row>';
    }

    // ── Bộ kiểu dùng chung ──
    var vien = '<Borders>' +
      ['Left', 'Top', 'Right', 'Bottom'].map(function (p) {
        return '<Border ss:Position="' + p + '" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#7F8FA6"/>';
      }).join('') + '</Borders>';
    var giua = '<Alignment ss:Horizontal="Center" ss:Vertical="Center"/>';
    var trai = '<Alignment ss:Horizontal="Left" ss:Vertical="Center" ss:WrapText="1"/>';
    var styles = '<Styles>' +
      '<Style ss:ID="Default" ss:Name="Normal"><Alignment ss:Vertical="Center"/>' +
        '<Font ss:FontName="Times New Roman" ss:Size="11" ss:Color="#1C2B4A"/></Style>' +
      // tiêu đề trang
      '<Style ss:ID="tt"><Alignment ss:Horizontal="Center" ss:Vertical="Center"/>' +
        '<Font ss:FontName="Times New Roman" ss:Size="16" ss:Bold="1" ss:Color="#14306B"/></Style>' +
      '<Style ss:ID="tt2"><Alignment ss:Horizontal="Center" ss:Vertical="Center"/>' +
        '<Font ss:FontName="Times New Roman" ss:Size="11" ss:Color="#1C2B4A"/></Style>' +
      '<Style ss:ID="tt3"><Alignment ss:Horizontal="Center" ss:Vertical="Center"/>' +
        '<Font ss:FontName="Times New Roman" ss:Size="10" ss:Italic="1" ss:Color="#5A6B8C"/></Style>' +
      // hàng tiêu đề bảng: nền navy chữ trắng
      '<Style ss:ID="dau">' + giua + vien +
        '<Font ss:FontName="Times New Roman" ss:Size="11" ss:Bold="1" ss:Color="#FFFFFF"/>' +
        '<Interior ss:Color="#14306B" ss:Pattern="Solid"/></Style>' +
      // hàng tiêu đề phụ: nền xanh nhạt
      '<Style ss:ID="dau2">' + giua + vien +
        '<Font ss:FontName="Times New Roman" ss:Size="10" ss:Bold="1" ss:Color="#14306B"/>' +
        '<Interior ss:Color="#DDE5F0" ss:Pattern="Solid"/></Style>' +
      // cột Thứ (gộp dọc)
      '<Style ss:ID="thu">' + giua + vien +
        '<Font ss:FontName="Times New Roman" ss:Size="11" ss:Bold="1" ss:Color="#14306B"/>' +
        '<Interior ss:Color="#EEF2F9" ss:Pattern="Solid"/></Style>' +
      '<Style ss:ID="buoi">' + giua + vien +
        '<Font ss:FontName="Times New Roman" ss:Size="10" ss:Color="#5A6B8C"/></Style>' +
      '<Style ss:ID="tiet">' + giua + vien +
        '<Font ss:FontName="Times New Roman" ss:Size="10" ss:Color="#5A6B8C"/></Style>' +
      // ô để điền — buổi sáng nền trắng, buổi chiều nền xám rất nhạt
      '<Style ss:ID="nhapS">' + trai + vien + '</Style>' +
      '<Style ss:ID="nhapC">' + trai + vien +
        '<Interior ss:Color="#F7F9FC" ss:Pattern="Solid"/></Style>' +
      '<Style ss:ID="sis">' + giua + vien +
        '<Font ss:FontName="Times New Roman" ss:Size="9" ss:Color="#5A6B8C"/>' +
        '<Interior ss:Color="#EEF2F9" ss:Pattern="Solid"/></Style>' +
      '<Style ss:ID="oL">' + trai + vien + '</Style>' +
      '<Style ss:ID="oG">' + giua + vien + '</Style>' +
      '<Style ss:ID="oB">' + trai + vien +
        '<Font ss:FontName="Times New Roman" ss:Size="11" ss:Bold="1" ss:Color="#1C2B4A"/></Style>' +
      '<Style ss:ID="ky"><Alignment ss:Horizontal="Right" ss:Vertical="Center"/>' +
        '<Font ss:FontName="Times New Roman" ss:Size="11" ss:Italic="1"/></Style>' +
      '<Style ss:ID="hd"><Alignment ss:Horizontal="Left" ss:Vertical="Center" ss:WrapText="1"/>' +
        '<Font ss:FontName="Times New Roman" ss:Size="11"/></Style>' +
      '<Style ss:ID="hdb"><Alignment ss:Horizontal="Left" ss:Vertical="Center" ss:WrapText="1"/>' +
        '<Font ss:FontName="Times New Roman" ss:Size="11" ss:Bold="1" ss:Color="#14306B"/></Style>' +
      '</Styles>';

    // ── Trang in: A4 ngang, vừa một trang ngang, đóng băng + lặp tiêu đề ──
    function trangIn(dongDongBang, vuaMotTrang) {
      return '<WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel">' +
        '<PageSetup>' +
          '<Layout x:Orientation="Landscape" x:CenterHorizontal="1"/>' +
          '<PageMargins x:Bottom="0.5" x:Left="0.4" x:Right="0.4" x:Top="0.5"/>' +
          '<Header x:Data="&amp;R&amp;9' + xml(tenTruong) + '"/>' +
          '<Footer x:Data="&amp;L&amp;9Năm học ' + xml(namHoc) + '&amp;R&amp;9Trang &amp;P/&amp;N"/>' +
        '</PageSetup>' +
        // ⚠️ HAI ĐIỀU KIỆN, THIẾU MỘT LÀ HỎNG — đo bằng Excel mới lộ ra:
        //  · phải có <FitToPage/> để BẬT chế độ "co cho vừa trang". Không có
        //    nó thì FitWidth/FitHeight bị bỏ qua hoàn toàn.
        //  · TUYỆT ĐỐI không khai <Scale>: Excel coi đó là "phóng theo tỉ lệ
        //    cố định" và nó ghi đè FitToPage.
        // Lúc còn <Scale>100</Scale> và thiếu <FitToPage/>, một khối in ra
        // BỐN trang dù đã khai vừa 1 trang ngang.
        (vuaMotTrang ? '<FitToPage/>' : '') +
        '<Print><ValidPrinterInfo/><PaperSizeIndex>9</PaperSizeIndex>' +
          '<FitWidth>1</FitWidth><FitHeight>' + (vuaMotTrang ? 1 : 0) + '</FitHeight>' +
          '<HorizontalResolution>600</HorizontalResolution></Print>' +
        (dongDongBang
          ? '<FreezePanes/><FrozenNoSplit/>' +
            '<SplitHorizontal>' + dongDongBang + '</SplitHorizontal>' +
            '<TopRowBottomPane>' + dongDongBang + '</TopRowBottomPane>' +
            '<SplitVertical>3</SplitVertical><LeftColumnRightPane>3</LeftColumnRightPane>' +
            '<ActivePane>0</ActivePane>'
          : '') +
        '<DoNotDisplayGridlines/>' +
        '</WorksheetOptions>';
    }

    // ── Một trang tính cho một khối ──
    function trangKhoi(k, ds) {
      var soCot = 3 + ds.length;
      var cols = '<Column ss:Width="62"/><Column ss:Width="42"/><Column ss:Width="30"/>' +
        ds.map(function () { return '<Column ss:Width="132"/>'; }).join('');

      var r = '';
      r += dong(o(tenTruong + (diaChi ? ' · ' + diaChi : ''), 'tt2', soCot - 1), 18);
      r += dong(o('THỜI KHÓA BIỂU KHỐI ' + k, 'tt', soCot - 1), 30);
      r += dong(o('Năm học ' + namHoc + ' · Mỗi ô ghi:  Tên môn | Họ tên giáo viên', 'tt3', soCot - 1), 20);
      r += dong(o('', null, soCot - 1), 8);
      // hàng tiêu đề (dòng thứ 5) — chỉ TÊN LỚP, không kèm gì khác
      r += dong(o('Thứ', 'dau') + o('Buổi', 'dau') + o('Tiết', 'dau') +
        ds.map(function (l) { return o(l, 'dau'); }).join(''), 26);
      // hàng sĩ số: ba cột đầu để trống nên bộ đọc tự bỏ qua dòng này
      r += dong(o('Sĩ số', 'sis', 2) +
        ds.map(function (l) {
          var x = dl.lop[l] || {};
          return o(x.siSo ? x.siSo + ' HS' : '—', 'sis');
        }).join(''), 16);

      THU5.forEach(function (t) {
        for (var b = 0; b < 2; b++) {
          var tenB = b === 0 ? 'Sáng' : 'Chiều';
          var soT = b === 0 ? 4 : 3;
          var kieuNhap = b === 0 ? 'nhapS' : 'nhapC';
          for (var i = 1; i <= soT; i++) {
            var c = '';
            // Ô "Thứ" gộp cả 7 tiết trong ngày, ô "Buổi" gộp các tiết của buổi.
            // Dòng nào bị ô gộp nuốt mất cột thì phải NHẢY chỉ số cột, nếu
            // không Excel đẩy dữ liệu lệch sang phải một ô.
            if (b === 0 && i === 1) c += o(t, 'thu', 0, 6);
            if (i === 1) c += o(tenB, 'buoi', 0, soT - 1, (b === 0 && i === 1) ? 0 : 2);
            c += o(i, 'tiet', 0, 0, (i === 1 ? 0 : 3), true);
            c += ds.map(function () { return o('', kieuNhap); }).join('');
            r += dong(c, 22);
          }
        }
      });
      r += dong(o('', null, soCot - 1), 10);
      r += dong(o('Ngày …… tháng …… năm ………          HIỆU TRƯỞNG', 'ky', soCot - 1), 30);

      return '<Worksheet ss:Name="KHOI_' + k + '">' +
        '<Table ss:ExpandedColumnCount="' + soCot + '" x:FullColumns="1" x:FullRows="1">' +
        cols + r + '</Table>' + trangIn(6, true) + '</Worksheet>';
    }

    // ── Trang hướng dẫn ──
    function trangHD() {
      var d = [
        ['hdb', 'CÁCH ĐIỀN THỜI KHÓA BIỂU'],
        ['hd', ''],
        ['hd', '1.  Mỗi khối một trang tính riêng ở dưới: KHOI_1, KHOI_2, … Tên lớp đã điền sẵn, đừng đổi.'],
        ['hd', '2.  Mỗi ô ghi theo mẫu:      Tên môn | Họ tên giáo viên'],
        ['hd', '     Ví dụ:      Toán | Nguyễn Thị Hòa'],
        ['hd', '     Dùng dấu gạch đứng  |  ngăn giữa môn và tên người. Tiết trống thì để ô trống.'],
        ['hd', '3.  Tên môn lấy đúng ở trang MON-HOC. Tên giáo viên lấy đúng ở trang GIAO-VIEN.'],
        ['hd', '     Sai một chữ là phần mềm không tra về đúng người, đúng lớp.'],
        ['hd', '4.  Khung sẵn: Thứ Hai–Thứ Sáu, sáng 4 tiết, chiều 3 tiết.'],
        ['hd', '     Trường dạy khác thì thêm hoặc bớt DÒNG — phần mềm đọc theo dòng thật.'],
        ['hd', '5.  Điền xong lưu lại, vào app:  Điều hành → Thời khóa biểu → Chọn tệp'],
        ['hd', ''],
        ['hdb', 'PHẦN MỀM SẼ TỰ SOÁT GIÚP'],
        ['hd', '·  Một giáo viên bị xếp hai lớp cùng một tiết'],
        ['hd', '·  Tiết đã ghi môn nhưng chưa ghi tên người dạy'],
        ['hd', '·  Lớp trong tệp lệch với danh sách lớp của trường'],
        ['hd', ''],
        ['hdb', 'CÁC TRANG DANH MỤC'],
        ['hd', 'LOP · GIAO-VIEN · MON-HOC do phần mềm điền sẵn từ cơ sở dữ liệu nhà trường, không cần sửa.']
      ];
      return '<Worksheet ss:Name="HUONG-DAN"><Table ss:ExpandedColumnCount="2">' +
        '<Column ss:Width="640"/>' +
        dong(o(tenTruong, 'tt2'), 18) +
        dong(o('TỆP MẪU THỜI KHÓA BIỂU · Năm học ' + namHoc, 'tt'), 30) +
        dong(o('', null), 10) +
        d.map(function (x) { return dong(o(x[1], x[0]), 18); }).join('') +
        '</Table>' + trangIn(0, false) + '</Worksheet>';
    }

    // ── Ba trang danh mục ──
    function trangDM() {
      var gvs = (dl.gvDs || []).slice().sort(function (a, b) {
        var ta = String(a.ten).trim().split(/\s+/).pop(), tb = String(b.ten).trim().split(/\s+/).pop();
        return ta.localeCompare(tb, 'vi') || String(a.ten).localeCompare(String(b.ten), 'vi');
      });
      var tLop = '<Worksheet ss:Name="LOP"><Table ss:ExpandedColumnCount="4">' +
        '<Column ss:Width="60"/><Column ss:Width="45"/><Column ss:Width="180"/><Column ss:Width="55"/>' +
        dong(o('DANH SÁCH LỚP — phần mềm điền sẵn, không sửa', 'tt', 3), 26) +
        dong(o('', null, 3), 8) +
        dong(o('Lớp', 'dau') + o('Khối', 'dau') + o('Điểm trường', 'dau') + o('Sĩ số', 'dau'), 22) +
        lops.map(function (l) {
          var x = dl.lop[l] || {};
          return dong(o(l, 'oB') + o(x.khoi || '', 'oG', 0, 0, 0, true) +
            o(tenCS(x.coSo), 'oL') + o(x.siSo || 0, 'oG', 0, 0, 0, true), 18);
        }).join('') + '</Table>' + trangIn(0, false) + '</Worksheet>';

      var tGV = '<Worksheet ss:Name="GIAO-VIEN"><Table ss:ExpandedColumnCount="3">' +
        '<Column ss:Width="180"/><Column ss:Width="150"/><Column ss:Width="180"/>' +
        dong(o('CÁN BỘ, GIÁO VIÊN — chép đúng cột Họ tên sang bảng thời khóa biểu', 'tt', 2), 26) +
        dong(o('', null, 2), 8) +
        dong(o('Họ tên', 'dau') + o('Chức vụ', 'dau') + o('Điểm trường', 'dau'), 22) +
        gvs.map(function (g) {
          return dong(o(g.ten, 'oB') + o(g.chucVu || '', 'oL') + o(tenCS(g.coSo), 'oL'), 18);
        }).join('') + '</Table>' + trangIn(0, false) + '</Worksheet>';

      var tMon = '<Worksheet ss:Name="MON-HOC"><Table ss:ExpandedColumnCount="3">' +
        '<Column ss:Width="55"/><Column ss:Width="200"/><Column ss:Width="110"/>' +
        dong(o('MÔN HỌC — Chương trình GDPT 2018', 'tt', 2), 26) +
        dong(o('Cột "Dạy ở khối" cho biết môn đó có trong khối nào — khỏi xếp nhầm.', 'tt3', 2), 18) +
        dong(o('', null, 2), 8) +
        dong(o('Mã', 'dau') + o('Tên môn', 'dau') + o('Dạy ở khối', 'dau'), 22) +
        dsMon.map(function (m) {
          return dong(o(m[0], 'oG') + o(m[1], 'oB') + o(m[2], 'oG'), 18);
        }).join('') + '</Table>' + trangIn(0, false) + '</Worksheet>';

      return tLop + tGV + tMon;
    }

    // Gom lớp theo khối
    var theoKhoi = {};
    lops.forEach(function (l) {
      var k = (dl.lop[l] || {}).khoi || 0;
      (theoKhoi[k] = theoKhoi[k] || []).push(l);
    });
    var cacKhoi = Object.keys(theoKhoi).sort(function (a, b) { return a - b; });

    var wb = '<?xml version="1.0"?>\n<?mso-application progid="Excel.Sheet"?>\n' +
      '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"' +
      ' xmlns:o="urn:schemas-microsoft-com:office:office"' +
      ' xmlns:x="urn:schemas-microsoft-com:office:excel"' +
      ' xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"' +
      ' xmlns:html="http://www.w3.org/TR/REC-html40">' +
      '<DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">' +
      '<Title>Thời khóa biểu — ' + xml(tenTruong) + '</Title>' +
      '<Company>' + xml(tenTruong) + '</Company></DocumentProperties>' +
      styles + trangHD() +
      cacKhoi.map(function (k) { return trangKhoi(k, theoKhoi[k]); }).join('') +
      trangDM() + '</Workbook>';

    var ten = 'TKB-mau-' + khongDau(tenTruong) + '-' + String(namHoc).replace(/\D/g, '') + '.xml';
    taiVe(new Blob(['﻿' + wb], { type: 'application/vnd.ms-excel;charset=utf-8' }), ten);
    window.notify('✅ Đã tạo tệp mẫu ' + ten + ' — mở bằng Excel (khổ A4 ngang, mỗi khối một trang), ' +
      'điền xong lưu lại rồi nạp lên ở màn này.');
  }

  function khongDau(s) {
    return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/đ/g, 'd').replace(/Đ/g, 'D')
      .replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }
  function taiVe(blob, ten) {
    var u = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = u; a.download = ten;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    // Thu hồi muộn: Safari trên iPad huỷ tải nếu URL mất ngay lập tức
    setTimeout(function () { URL.revokeObjectURL(u); }, 4000);
  }

  // ══════════ ĐỌC TỆP EXCEL ══════════
  // Trả về mảng phẳng: { thu, buoi, tiet, lop, mon, gv }
  // Một dòng = một tiết của một lớp. Đây là dạng duy nhất lưu vào cơ sở dữ
  // liệu; mọi cách bày (theo lớp, theo giáo viên, theo ngày) đều dựng lại từ
  // đây — một nguồn sự thật, đúng nguyên tắc dự án.
  // Quét MỌI dòng tiêu đề trong bảng tính. Tệp mẫu app tạo chia mỗi khối một
  // bảng (5 lớp/bảng) để in vừa A4 ngang — 25 lớp xếp ngang thì chữ bé như
  // kiến, không ai đọc nổi. Vì thế bộ đọc phải gom được nhiều bảng nối tiếp
  // nhau trong cùng một trang tính, chứ không chỉ bảng đầu tiên.
  function laTieuDe(hang) {
    var r = hang.map(function (x) { return String(x).trim().toLowerCase(); });
    return r.indexOf('thứ') >= 0 && r.indexOf('tiết') >= 0;
  }

  function docBang(ws, XLSX) {
    var hang = XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: false, defval: '' });
    var moc = [];
    for (var i = 0; i < hang.length; i++) if (laTieuDe(hang[i])) moc.push(i);
    if (!moc.length) return { loi: 'Không tìm thấy dòng tiêu đề có cột "Thứ" và "Tiết".' };

    var gom = [], loi = '';
    for (var k = 0; k < moc.length; k++) {
      var het = k + 1 < moc.length ? moc[k + 1] : hang.length;
      var kq = docMotBang(hang, moc[k], het);
      if (kq.loi) { if (!loi) loi = kq.loi; }
      else gom = gom.concat(kq.tiet);
    }
    return gom.length ? { tiet: gom } : { loi: loi || 'Đọc được bảng nhưng không có tiết nào.' };
  }

  function docMotBang(hang, iTieuDe, iHet) {
    var td = hang[iTieuDe].map(function (x) { return String(x).trim(); });
    var cThu = -1, cBuoi = -1, cTiet = -1;
    td.forEach(function (t, i) {
      var k = t.toLowerCase();
      if (k === 'thứ') cThu = i;
      else if (k === 'buổi') cBuoi = i;
      else if (k === 'tiết') cTiet = i;
    });
    if (cThu < 0 || cTiet < 0) return { loi: 'Thiếu cột "Thứ" hoặc "Tiết".' };

    // Các cột còn lại (sau cột Tiết) là danh sách lớp
    // Tên lớp: cắt ở dấu xuống dòng và bỏ phần trong ngoặc. Ô tiêu đề của
    // nhiều phần mềm xếp lịch ghi kèm sĩ số hoặc tên giáo viên chủ nhiệm
    // ngay dưới tên lớp — lấy nguyên cả cụm thì không tra về lớp thật được.
    var cotLop = [];
    for (var c = cTiet + 1; c < td.length; c++) {
      var ten = String(td[c]).split(/[\r\n]/)[0].replace(/\s*\(.*$/, '').trim();
      if (ten) cotLop.push({ i: c, ten: ten });
    }
    if (!cotLop.length) return { loi: 'Không thấy cột lớp nào sau cột "Tiết".' };

    var ra = [], thuHienTai = '', buoiHienTai = '';
    for (var h = iTieuDe + 1; h < iHet; h++) {
      var d = hang[h];
      if (!d) continue;
      // Ô gộp: dòng dưới bỏ trống thì kế thừa dòng trên
      var thu = String(d[cThu] || '').trim() || thuHienTai;
      var buoi = cBuoi >= 0 ? (String(d[cBuoi] || '').trim() || buoiHienTai) : '';
      var tiet = String(d[cTiet] || '').trim();
      if (!thu || !tiet) continue;
      thuHienTai = thu; buoiHienTai = buoi;

      cotLop.forEach(function (cl) {
        var o = String(d[cl.i] || '').trim();
        if (!o) return;
        // Ô dạng "Toán | Nguyễn Thị Hòa" (tệp mẫu app tạo) hoặc
        // "Toán — Nguyễn Thị Hòa" (tệp của phần mềm xếp lịch).
        // Gạch đứng an toàn hơn hẳn: tên người không bao giờ chứa "|", còn
        // gạch ngang thì có (tên ghép, tên nước ngoài).
        var p = o.split(/\s*\|\s*|\s+[—–]\s+|\s+-\s+/);
        ra.push({
          thu: thu, buoi: buoi, tiet: parseInt(tiet, 10) || 0,
          lop: cl.ten, mon: (p[0] || '').trim(), gv: (p[1] || '').trim()
        });
      });
    }
    return ra.length ? { tiet: ra } : { loi: 'Đọc được bảng nhưng không có tiết nào.' };
  }

  function chonTab(wb) {
    // Ưu tiên tab theo lớp. KHÔNG đọc TKB_GV (cùng dữ liệu, bày kiểu khác).
    var uu = ['TKB_LOP', 'TOAN_TRUONG'];
    for (var i = 0; i < uu.length; i++) {
      if (wb.SheetNames.indexOf(uu[i]) >= 0) return uu[i];
    }
    // Không có tab quen thì lấy tab đầu KHÔNG phải TKB_GV / PCGD / DIEM_TRUONG
    var bo = ['TKB_GV', 'PCGD', 'DIEM_TRUONG'];
    for (var j = 0; j < wb.SheetNames.length; j++) {
      if (bo.indexOf(wb.SheetNames[j]) < 0) return wb.SheetNames[j];
    }
    return wb.SheetNames[0];
  }

  window.tkbChonTep = function (input) {
    var tep = input.files && input.files[0];
    if (!tep) return;
    LOI_DOC = '';
    if (!window.XLSX) {
      LOI_DOC = 'Chưa nạp được thư viện đọc Excel (lib/xlsx.min.js).';
      return veLai();
    }
    var fr = new FileReader();
    fr.onerror = function () { LOI_DOC = 'Không đọc được tệp.'; veLai(); };
    fr.onload = function (e) {
      try {
        // Bản xlsx.min.js này là bản CHO TRÌNH DUYỆT — chỉ có XLSX.read, KHÔNG
        // có readFile. Phải truyền mảng byte, không truyền đường dẫn.
        //
        // Tệp mẫu app tạo là SpreadsheetML (XML chữ), đọc theo kiểu 'array'
        // được; nhưng thầy cô mở ra rồi bấm Ctrl+S thì Excel lưu lại thành
        // .xlsx hoặc .xls thật. Cả hai nhánh đều phải đọc được, nên hỏng
        // đường này thì thử đường kia chứ đừng báo lỗi ngay.
        var wb;
        try {
          wb = window.XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
        } catch (e1) {
          var chu = new TextDecoder('utf-8').decode(new Uint8Array(e.target.result));
          wb = window.XLSX.read(chu, { type: 'string' });
        }
        var ten = chonTab(wb);
        var kq = docBang(wb.Sheets[ten], window.XLSX);
        if (kq.loi) { LOI_DOC = 'Tab "' + ten + '": ' + kq.loi; DU_LIEU = null; }
        else {
          DU_LIEU = { tiet: kq.tiet, nguon: tep.name, tab: ten,
            luc: new Date().toLocaleString('vi-VN') };
          CHON = '';
        }
      } catch (err) {
        LOI_DOC = 'Tệp không đọc được: ' + (err && err.message ? err.message : err);
        DU_LIEU = null;
      }
      veLai();
    };
    fr.readAsArrayBuffer(tep);
  };

  function veLai() {
    var vung = $('#tkb-vung');
    if (vung) vung.innerHTML = thanTKB();
    else if (window.DH && window.DH.tab) window.DH.tab('tkb');
  }

  // ══════════ GOM DỮ LIỆU ══════════
  function dsLop() {
    var t = {}; (DU_LIEU.tiet || []).forEach(function (x) { t[x.lop] = 1; });
    return Object.keys(t).sort(function (a, b) { return a.localeCompare(b, 'vi'); });
  }
  function dsGV() {
    var t = {}; (DU_LIEU.tiet || []).forEach(function (x) { if (x.gv) t[x.gv] = 1; });
    // Sắp theo TÊN (chữ cuối) rồi mới họ đệm — đúng cách thầy cô lập danh sách
    return Object.keys(t).sort(function (a, b) {
      var ta = a.trim().split(/\s+/).pop(), tb = b.trim().split(/\s+/).pop();
      return ta.localeCompare(tb, 'vi') || a.localeCompare(b, 'vi');
    });
  }
  function dsThu() {
    var t = {}; (DU_LIEU.tiet || []).forEach(function (x) { t[x.thu] = 1; });
    return Object.keys(t).sort(function (a, b) {
      var ia = THU.indexOf(a), ib = THU.indexOf(b);
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
    });
  }
  // Khung dòng: [{thu, buoi, tiet}] theo đúng thứ tự trong tuần
  function khungDong() {
    var thay = {}, ra = [];
    (DU_LIEU.tiet || []).forEach(function (x) {
      var k = x.thu + '|' + x.buoi + '|' + x.tiet;
      if (!thay[k]) { thay[k] = 1; ra.push({ thu: x.thu, buoi: x.buoi, tiet: x.tiet }); }
    });
    return ra.sort(function (a, b) {
      var ia = THU.indexOf(a.thu), ib = THU.indexOf(b.thu);
      if (ia !== ib) return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
      var ba = a.buoi === 'Sáng' ? 0 : 1, bb = b.buoi === 'Sáng' ? 0 : 1;
      if (ba !== bb) return ba - bb;
      return a.tiet - b.tiet;
    });
  }

  // ══════════ ĐỐI CHIẾU — chỗ app đáng tiền hơn tệp Excel ══════════
  // Tệp Excel bày ra thì đẹp, nhưng KHÔNG ai soi được hai lỗi dưới đây bằng
  // mắt trên 710 tiết. Máy đối chiếu trong một nốt nhạc.
  function doiChieuGV() {
    var trung = [], theoGV = {};
    (DU_LIEU.tiet || []).forEach(function (x) {
      if (!x.gv) return;
      var k = x.gv + '|' + x.thu + '|' + x.buoi + '|' + x.tiet;
      (theoGV[k] = theoGV[k] || []).push(x);
    });
    Object.keys(theoGV).forEach(function (k) {
      if (theoGV[k].length > 1) trung.push(theoGV[k]);
    });
    return trung;
  }
  function tietThieuGV() {
    return (DU_LIEU.tiet || []).filter(function (x) { return !x.gv; });
  }
  // Lớp trong tệp mà cơ sở dữ liệu nhà trường không có (và ngược lại)
  function lechLop() {
    // Cầu nối DH_KHO trả DL bằng HÀM chứ không phải giá trị — vì DL đổi sau
    // khi đăng nhập (ghi chú ở mục 11.2 sổ dự án). Danh sách lớp nằm trong
    // DL.lop, dạng { '1A': {khoi, coSo, siSo}, ... }.
    var dl = (window.DH_KHO && window.DH_KHO.dl) ? window.DH_KHO.dl() : null;
    var cuaApp = Object.keys((dl && dl.lop) || {});
    if (!cuaApp.length) return null;      // chưa có dữ liệu lớp thì không đối chiếu
    var cuaTep = dsLop();
    return {
      thieu: cuaApp.filter(function (l) { return cuaTep.indexOf(l) < 0; }),
      thua: cuaTep.filter(function (l) { return cuaApp.indexOf(l) < 0; })
    };
  }

  // ══════════ VẼ ══════════
  function daiTaiLen() {
    return '<div class="tkb-tai">' +
      '<div class="tkb-tai-chu"><b>Nạp thời khóa biểu từ tệp Excel</b>' +
      '<span>Chưa có tệp thì bấm <b>Tải tệp mẫu</b> — phần mềm chép sẵn danh sách lớp, ' +
      'giáo viên và môn học thật của trường vào tệp, điền xong nạp lại đây. ' +
      'Tệp của phần mềm xếp lịch cũng đọc được, miễn có cột <b>Thứ · Buổi · Tiết</b> ' +
      'rồi đến từng cột lớp.</span></div>' +
      '<div class="tkb-nut-hang">' +
      '<button class="tkb-nut-mau" onclick="tkbTaiMau()">⬇ Tải tệp mẫu</button>' +
      '<label class="tkb-nut-tai">📂 Chọn tệp .xlsx' +
      // .xml là tệp mẫu do app tạo (SpreadsheetML — Excel mở thẳng)
      '<input type="file" accept=".xlsx,.xls,.xml" onchange="tkbChonTep(this)" hidden></label>' +
      '</div></div>' +
      (LOI_DOC ? '<div class="hd-kiem do">⚠ ' + thoat(LOI_DOC) + '</div>' : '');
  }

  function daiKiemTra() {
    var trung = doiChieuGV(), thieu = tietThieuGV(), lech = lechLop();
    var o = [];
    if (trung.length) {
      o.push('<div class="hd-kiem do"><b>⚠ ' + trung.length +
        ' chỗ một giáo viên bị xếp hai lớp cùng lúc</b><br>' +
        trung.slice(0, 5).map(function (n) {
          return thoat(n[0].gv) + ' — ' + thoat(n[0].thu) + ' ' + thoat(n[0].buoi) +
            ' tiết ' + n[0].tiet + ': ' + n.map(function (x) { return thoat(x.lop); }).join(' và ');
        }).join('<br>') +
        (trung.length > 5 ? '<br>… còn ' + (trung.length - 5) + ' chỗ nữa' : '') +
        '<br><span style="opacity:.85">Sửa trong phần mềm xếp lịch rồi nạp lại tệp — ' +
        'app không tự sửa thời khóa biểu.</span></div>');
    }
    if (thieu.length) {
      o.push('<div class="hd-kiem vang"><b>' + thieu.length +
        ' tiết chưa ghi tên giáo viên.</b> Những tiết này sẽ không hiện trong bảng ' +
        'theo giáo viên, và không bố trí dạy thay được.</div>');
    }
    if (lech && (lech.thieu.length || lech.thua.length)) {
      o.push('<div class="hd-kiem vang"><b>Lớp trong tệp lệch với danh sách lớp của trường:</b><br>' +
        (lech.thieu.length ? 'Trường có nhưng tệp thiếu: <b>' + lech.thieu.join(', ') + '</b><br>' : '') +
        (lech.thua.length ? 'Tệp có nhưng trường chưa khai: <b>' + lech.thua.join(', ') + '</b>' : '') +
        '</div>');
    }
    if (!o.length) {
      o.push('<div class="hd-kiem xanh">✅ Không thấy giáo viên nào bị xếp trùng giờ, ' +
        'mọi tiết đều có tên người dạy.</div>');
    }
    return o.join('');
  }

  function bangTheoLop(lop) {
    var dong = khungDong();
    var tra = {};
    DU_LIEU.tiet.forEach(function (x) {
      if (x.lop === lop) tra[x.thu + '|' + x.buoi + '|' + x.tiet] = x;
    });
    var thuTruoc = '';
    return '<div class="cuon-ngang"><table class="bang-quan-tri nho tkb-bang"><thead><tr>' +
      '<th>Thứ</th><th>Buổi</th><th>Tiết</th><th>Môn</th><th>Giáo viên</th></tr></thead><tbody>' +
      dong.map(function (d) {
        var x = tra[d.thu + '|' + d.buoi + '|' + d.tiet];
        var moiThu = d.thu !== thuTruoc; thuTruoc = d.thu;
        return '<tr' + (moiThu ? ' class="tkb-dau-thu"' : '') + '>' +
          '<td>' + (moiThu ? '<b>' + thoat(d.thu) + '</b>' : '') + '</td>' +
          '<td>' + thoat(d.buoi) + '</td><td style="text-align:center">' + d.tiet + '</td>' +
          '<td>' + (x ? '<b>' + thoat(x.mon) + '</b>' : '<span class="tkb-trong">—</span>') + '</td>' +
          '<td>' + (x ? thoat(x.gv) : '') + '</td></tr>';
      }).join('') + '</tbody></table></div>';
  }

  function bangTheoGV(gv) {
    var dong = khungDong(), tra = {};
    DU_LIEU.tiet.forEach(function (x) {
      if (x.gv === gv) tra[x.thu + '|' + x.buoi + '|' + x.tiet] = x;
    });
    var soTiet = DU_LIEU.tiet.filter(function (x) { return x.gv === gv; }).length;
    var thuTruoc = '';
    return '<div class="tkb-tom">Tổng <b>' + soTiet + ' tiết</b> một tuần</div>' +
      '<div class="cuon-ngang"><table class="bang-quan-tri nho tkb-bang"><thead><tr>' +
      '<th>Thứ</th><th>Buổi</th><th>Tiết</th><th>Lớp</th><th>Môn</th></tr></thead><tbody>' +
      dong.map(function (d) {
        var x = tra[d.thu + '|' + d.buoi + '|' + d.tiet];
        var moiThu = d.thu !== thuTruoc; thuTruoc = d.thu;
        return '<tr' + (moiThu ? ' class="tkb-dau-thu"' : '') + '>' +
          '<td>' + (moiThu ? '<b>' + thoat(d.thu) + '</b>' : '') + '</td>' +
          '<td>' + thoat(d.buoi) + '</td><td style="text-align:center">' + d.tiet + '</td>' +
          '<td>' + (x ? '<b>' + thoat(x.lop) + '</b>' : '<span class="tkb-trong">trống</span>') + '</td>' +
          '<td>' + (x ? thoat(x.mon) : '') + '</td></tr>';
      }).join('') + '</tbody></table></div>';
  }

  function bangTheoNgay(thu) {
    var lops = dsLop();
    var dong = khungDong().filter(function (d) { return d.thu === thu; });
    var tra = {};
    DU_LIEU.tiet.forEach(function (x) {
      if (x.thu === thu) tra[x.buoi + '|' + x.tiet + '|' + x.lop] = x;
    });
    return '<div class="cuon-ngang"><table class="bang-quan-tri nho tkb-bang tkb-ngay"><thead><tr>' +
      '<th class="cot-dinh">Buổi · Tiết</th>' +
      lops.map(function (l) { return '<th>' + thoat(l) + '</th>'; }).join('') +
      '</tr></thead><tbody>' +
      dong.map(function (d) {
        return '<tr><td class="cot-dinh"><b>' + thoat(d.buoi) + ' ' + d.tiet + '</b></td>' +
          lops.map(function (l) {
            var x = tra[d.buoi + '|' + d.tiet + '|' + l];
            return '<td>' + (x
              ? '<b>' + thoat(x.mon) + '</b><br><small>' + thoat(x.gv) + '</small>'
              : '<span class="tkb-trong">—</span>') + '</td>';
          }).join('') + '</tr>';
      }).join('') + '</tbody></table></div>';
  }

  function thanTKB() {
    if (!DU_LIEU) {
      return daiTaiLen() +
        '<div class="the-thong-bao">Chưa nạp thời khóa biểu. Bấm <b>⬇ Tải tệp mẫu</b> ở trên nếu chưa có tệp.<br><br>' +
        '<b>Thời khóa biểu dùng để làm gì trong app:</b><br>' +
        '· Xem nhanh lớp nào đang học môn gì, ai dạy<br>' +
        '· Máy tự soát <b>một giáo viên bị xếp hai lớp cùng lúc</b> — thứ không ai dò nổi bằng mắt trên 710 tiết<br>' +
        '· Là nền để bố trí <b>dạy thay theo tiết</b> khi có người vắng (màn Lịch tuần)</div>';
    }

    var lops = dsLop(), gvs = dsGV(), thus = dsThu();
    if (!CHON) CHON = XEM === 'lop' ? lops[0] : XEM === 'gv' ? gvs[0] : thus[0];
    var ds = XEM === 'lop' ? lops : XEM === 'gv' ? gvs : thus;
    if (ds.indexOf(CHON) < 0) CHON = ds[0];

    return daiTaiLen() +
      '<div class="tkb-nguon">📄 <b>' + thoat(DU_LIEU.nguon) + '</b> · tab ' +
      thoat(DU_LIEU.tab) + ' · ' + DU_LIEU.tiet.length + ' tiết · ' + lops.length +
      ' lớp · ' + gvs.length + ' giáo viên · đọc lúc ' + thoat(DU_LIEU.luc) +
      '<br><span class="tkb-canh">Mới đọc trên máy anh chị, <b>chưa lưu vào cơ sở dữ liệu</b> — ' +
      'tải lại trang là mất.</span></div>' +
      daiKiemTra() +
      '<div class="dh-chon-hang" style="margin-top:12px">' +
      [['lop', 'Theo lớp'], ['gv', 'Theo giáo viên'], ['ngay', 'Theo ngày']].map(function (x) {
        return '<button class="chip-loc' + (XEM === x[0] ? ' on' : '') +
          '" onclick="tkbXem(\'' + x[0] + '\')">' + x[1] + '</button>';
      }).join('') + '</div>' +
      '<div class="dh-chon-hang tkb-cuon-chon">' +
      ds.map(function (v) {
        return '<button class="chip-loc' + (CHON === v ? ' on' : '') +
          '" onclick="tkbChon(' + JSON.stringify(v).replace(/"/g, '&quot;') + ')">' +
          thoat(v) + '</button>';
      }).join('') + '</div>' +
      (XEM === 'lop' ? bangTheoLop(CHON) : XEM === 'gv' ? bangTheoGV(CHON) : bangTheoNgay(CHON));
  }

  window.tkbXem = function (m) { XEM = m; CHON = ''; veLai(); };
  window.tkbChon = function (v) { CHON = v; veLai(); };

  // Hàm màn Điều hành gọi
  window.veTKB = function () {
    return '<div id="tkb-vung">' + thanTKB() + '</div>';
  };
})();
