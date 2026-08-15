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

  // ══════════ NẠP TRỄ THƯ VIỆN ĐỌC EXCEL ══════════
  // xlsx.min.js nặng 930 KB, bằng 61% toàn bộ trang, mà chỉ cần khi người
  // dùng bấm CHỌN TỆP ở đúng màn này. Nạp sẵn trong index.html là bắt mọi
  // thầy cô tải 930 KB mỗi lần mở app — trên điện thoại với mạng trường thì
  // rất nặng. Nay chỉ nạp khi thật sự đọc tệp.
  // (Tạo tệp mẫu KHÔNG cần thư viện này — bộ đóng gói .xlsx tự viết ở
  //  js/xuat-excel.js chỉ nặng ~9 KB và đã nạp sẵn.)
  var dangNap = null;
  function napXLSX() {
    if (window.XLSX) return Promise.resolve();
    if (dangNap) return dangNap;                 // bấm hai lần không tải hai lần
    dangNap = new Promise(function (xong, hong) {
      var s = document.createElement('script');
      // Bám theo số phiên bản của chính tệp này để không dính bộ nhớ đệm cũ
      var v = (document.querySelector('script[src*="thoi-khoa-bieu.js"]') || {}).src || '';
      var m = /[?&]v=(\d+)/.exec(v);
      s.src = 'lib/xlsx.min.js' + (m ? '?v=' + m[1] : '');
      s.onload = function () { xong(); };
      s.onerror = function () {
        dangNap = null;                          // hỏng thì cho thử lại
        hong(new Error('Không tải được thư viện đọc Excel (lib/xlsx.min.js). ' +
          'Kiểm tra mạng rồi chọn tệp lại.'));
      };
      document.head.appendChild(s);
    });
    return dangNap;
  }

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
    // Tạo tệp mẫu KHÔNG đụng tới SheetJS — dùng bộ đóng gói riêng ở
    // js/xuat-excel.js, nên bấm nút này không phải chờ tải 930 KB.
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
  // SINH TỆP MẪU .xlsx KHỔ A4 NGANG
  // ══════════════════════════════════════════════════════════════════
  // Đã thử và loại hai đường trước đó, cả hai chỉ lộ khi ĐO BẰNG EXCEL:
  //  · .xlsx qua SheetJS → bản miễn phí không ghi được định dạng, tệp trắng
  //    trơn, in ra không dùng được.
  //  · .xls / .xml dựng tay → đẹp, nhưng Windows không nhận là tệp Excel:
  //    thầy cô tải về thấy "XML Document", nhấp đúp là mở bằng trình duyệt.
  //    Đổi đuôi thành .xls thì Excel kêu "định dạng không khớp phần mở rộng".
  // Nay dùng bộ đóng gói .xlsx thật ở js/xuat-excel.js.
  //
  // 🔑 MỖI KHỐI MỘT TRANG TÍNH (5 lớp): 25 lớp xếp ngang trên A4 thì mỗi cột
  //    còn hơn 1cm, chữ bé như kiến. Bảng 5 lớp vừa khít A4 ngang, và đúng
  //    nếp nhà trường vẫn in thời khóa biểu theo khối.
  function taoMauDep(dl, lops, tenCS, dsMon, tenTruong, namHoc) {
    if (!window.EXCEL_DEP) { window.notify('Chưa nạp được js/xuat-excel.js.'); return; }
    var THU5 = ['Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu'];
    var diaChi = (window.CAU_HINH || {}).DIA_CHI || '';
    var chanTrang = '&L&9Năm học ' + namHoc + '&R&9Trang &P/&N';

    function o(v, k, gopN, gopD, so) { return { v: v, k: k, gopN: gopN, gopD: gopD, so: so }; }
    var BO = { bo: 1 };                    // ô bị ô gộp bên trên/bên trái nuốt

    // ── Gom lớp theo khối ──
    var theoKhoi = {};
    lops.forEach(function (l) {
      var k = (dl.lop[l] || {}).khoi || 0;
      (theoKhoi[k] = theoKhoi[k] || []).push(l);
    });
    var cacKhoi = Object.keys(theoKhoi).sort(function (a, b) { return a - b; });

    // ── Một trang tính cho một khối ──
    function trangKhoi(k) {
      var ds = theoKhoi[k], soCot = 3 + ds.length;
      var rows = [];
      // ⚠️ Ô GỘP NGANG TỰ NHẢY CỘT — đừng chèn thêm ô đánh dấu phía sau.
      // BO chỉ dành cho ô bị ô GỘP DỌC ở dòng trên nuốt mất. Chèn nhầm thì
      // các cột sau bị đẩy lệch: hàng "Sĩ số" từng nhảy sang tận cột 1C, hai
      // lớp đầu bỏ trống.
      var hangGop = function (chu, kieu, cao) {
        return { cao: cao, o: [o(chu, kieu, soCot - 1)] };
      };
      rows.push(hangGop(tenTruong + (diaChi ? ' · ' + diaChi : ''), 'tt2', 18));
      rows.push(hangGop('THỜI KHÓA BIỂU KHỐI ' + k, 'tt', 30));
      rows.push(hangGop('Năm học ' + namHoc + ' · Mỗi ô ghi:  Tên môn | Họ tên giáo viên', 'tt3', 20));
      rows.push({ cao: 8, o: [] });

      // Hàng tiêu đề — ô cột lớp CHỈ chứa TÊN LỚP, không kèm gì khác.
      // Ghi kèm sĩ số xuống dòng trong cùng ô thì bộ đọc lấy cả cụm thành
      // "1A\n31 HS" và không tra về lớp thật được.
      rows.push({ cao: 26, o: [o('Thứ', 'dau'), o('Buổi', 'dau'), o('Tiết', 'dau')]
        .concat(ds.map(function (l) { return o(l, 'dau'); })) });
      // Hàng sĩ số: ba cột đầu gộp lại, bộ đọc tự bỏ qua vì không có số tiết
      rows.push({ cao: 16, o: [o('Sĩ số', 'sis', 2)]
        .concat(ds.map(function (l) {
          var x = dl.lop[l] || {};
          return o(x.siSo ? x.siSo + ' HS' : '—', 'sis');
        })) });

      THU5.forEach(function (t) {
        for (var b = 0; b < 2; b++) {
          var tenB = b === 0 ? 'Sáng' : 'Chiều';
          var soT = b === 0 ? 4 : 3;
          var kNhap = b === 0 ? 'nhapS' : 'nhapC';
          for (var i = 1; i <= soT; i++) {
            var hang = [];
            // Ô "Thứ" gộp trọn 7 tiết trong ngày, ô "Buổi" gộp các tiết của
            // buổi. Dòng bị ô gộp nuốt phải đánh dấu BO, nếu không dữ liệu
            // các cột sau bị đẩy lệch sang phải.
            hang.push(b === 0 && i === 1 ? o(t, 'thu', 0, 6) : BO);
            hang.push(i === 1 ? o(tenB, 'buoi', 0, soT - 1) : BO);
            hang.push(o(i, 'tiet', 0, 0, true));
            ds.forEach(function () { hang.push(o('', kNhap)); });
            rows.push({ cao: 22, o: hang });
          }
        }
      });
      rows.push({ cao: 10, o: [] });
      rows.push(hangGop('Ngày …… tháng …… năm ………          HIỆU TRƯỞNG', 'ky', 30));

      return {
        ten: 'KHOI_' + k,
        cols: [9, 7, 5].concat(ds.map(function () { return 21; })),
        rows: rows,
        in: { vuaTrang: true, dongBang: 6, cotBang: 3,
              dauTrang: tenTruong, chanTrang: chanTrang }
      };
    }

    // ── Trang hướng dẫn ──
    function trangHD() {
      var d = [
        ['hdb', 'CÁCH ĐIỀN THỜI KHÓA BIỂU'],
        ['hd', ''],
        ['hd', '1.   Mỗi khối một trang tính riêng: KHOI_1, KHOI_2 … Tên lớp đã điền sẵn, đừng đổi.'],
        ['hd', '2.   Mỗi ô ghi theo mẫu:        Tên môn | Họ tên giáo viên'],
        ['hd', '      Ví dụ:        Toán | Nguyễn Thị Hòa'],
        ['hd', '      Dùng dấu gạch đứng  |  ngăn giữa môn và tên người. Tiết trống thì để ô trống.'],
        ['hd', '3.   Tên môn lấy đúng ở trang MON-HOC. Tên giáo viên lấy đúng ở trang GIAO-VIEN.'],
        ['hd', '      Sai một chữ là phần mềm không tra về đúng người, đúng lớp.'],
        ['hd', '4.   Khung sẵn: Thứ Hai – Thứ Sáu, sáng 4 tiết, chiều 3 tiết.'],
        ['hd', '      Trường dạy khác thì thêm hoặc bớt DÒNG — phần mềm đọc theo dòng thật.'],
        ['hd', '5.   Điền xong lưu lại, vào app:   Điều hành → Thời khóa biểu → Chọn tệp'],
        ['hd', ''],
        ['hdb', 'PHẦN MỀM SẼ TỰ SOÁT GIÚP'],
        ['hd', '·   Một giáo viên bị xếp hai lớp cùng một tiết'],
        ['hd', '·   Tiết đã ghi môn nhưng chưa ghi tên người dạy'],
        ['hd', '·   Lớp trong tệp lệch với danh sách lớp của trường'],
        ['hd', ''],
        ['hdb', 'CÁC TRANG DANH MỤC'],
        ['hd', 'LOP · GIAO-VIEN · MON-HOC do phần mềm điền sẵn từ cơ sở dữ liệu nhà trường, không cần sửa.']
      ];
      return {
        ten: 'HUONG-DAN', cols: [96],
        rows: [{ cao: 18, o: [o(tenTruong, 'tt2')] },
               { cao: 30, o: [o('TỆP MẪU THỜI KHÓA BIỂU · Năm học ' + namHoc, 'tt')] },
               { cao: 10, o: [] }]
          .concat(d.map(function (x) { return { cao: 18, o: [o(x[1], x[0])] }; })),
        in: { doc: true, dauTrang: tenTruong, chanTrang: chanTrang }
      };
    }

    // ── Ba trang danh mục ──
    function trangDM() {
      var gvs = (dl.gvDs || []).slice().sort(function (a, b) {
        var ta = String(a.ten).trim().split(/\s+/).pop(), tb = String(b.ten).trim().split(/\s+/).pop();
        return ta.localeCompare(tb, 'vi') || String(a.ten).localeCompare(String(b.ten), 'vi');
      });
      var tLop = { ten: 'LOP', cols: [10, 8, 32, 9],
        rows: [{ cao: 26, o: [o('DANH SÁCH LỚP — phần mềm điền sẵn, không sửa', 'tt', 3)] },
               { cao: 8, o: [] },
               { cao: 22, o: [o('Lớp', 'dau'), o('Khối', 'dau'), o('Điểm trường', 'dau'), o('Sĩ số', 'dau')] }]
          .concat(lops.map(function (l) {
            var x = dl.lop[l] || {};
            return { cao: 18, o: [o(l, 'oB'), o(x.khoi || '', 'oG', 0, 0, true),
              o(tenCS(x.coSo), 'oL'), o(x.siSo || 0, 'oG', 0, 0, true)] };
          })),
        in: { doc: true, dauTrang: tenTruong, chanTrang: chanTrang } };

      var tGV = { ten: 'GIAO-VIEN', cols: [30, 26, 32],
        rows: [{ cao: 26, o: [o('CÁN BỘ, GIÁO VIÊN — chép đúng cột Họ tên sang bảng thời khóa biểu', 'tt', 2)] },
               { cao: 8, o: [] },
               { cao: 22, o: [o('Họ tên', 'dau'), o('Chức vụ', 'dau'), o('Điểm trường', 'dau')] }]
          .concat(gvs.map(function (g) {
            return { cao: 18, o: [o(g.ten, 'oB'), o(g.chucVu || '', 'oL'), o(tenCS(g.coSo), 'oL')] };
          })),
        in: { doc: true, dauTrang: tenTruong, chanTrang: chanTrang } };

      var tMon = { ten: 'MON-HOC', cols: [9, 34, 20],
        rows: [{ cao: 26, o: [o('MÔN HỌC — Chương trình GDPT 2018', 'tt', 2)] },
               { cao: 18, o: [o('Cột "Dạy ở khối" cho biết môn đó có trong khối nào — khỏi xếp nhầm.', 'tt3', 2)] },
               { cao: 8, o: [] },
               { cao: 22, o: [o('Mã', 'dau'), o('Tên môn', 'dau'), o('Dạy ở khối', 'dau')] }]
          .concat(dsMon.map(function (m) {
            return { cao: 18, o: [o(m[0], 'oG'), o(m[1], 'oB'), o(m[2], 'oG')] };
          })),
        in: { doc: true, dauTrang: tenTruong, chanTrang: chanTrang } };

      return [tLop, tGV, tMon];
    }

    var sheets = [trangHD()]
      .concat(cacKhoi.map(trangKhoi))
      .concat(trangDM());
    var byte = window.EXCEL_DEP.tao({ sheets: sheets });
    var ten = 'TKB-mau-' + khongDau(tenTruong) + '-' + String(namHoc).replace(/\D/g, '') + '.xlsx';
    taiVe(new Blob([byte], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    }), ten);
    window.notify('✅ Đã tạo ' + ten + ' — mở bằng Excel (A4 ngang, mỗi khối một trang), ' +
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
    // Nạp thư viện TRƯỚC rồi mới đọc. Lần đầu mất một hai giây tải 930 KB —
    // nói ra để người dùng biết máy đang làm việc, đừng bấm lại.
    LOI_DOC = '';
    var vung = $('#tkb-vung');
    if (!window.XLSX && vung) {
      vung.insertAdjacentHTML('afterbegin',
        '<div class="hd-kiem vang" id="tkb-dang-tai">⏳ Đang tải bộ đọc Excel (lần đầu, ~1 MB)…</div>');
    }
    napXLSX().then(function () {
      var x = document.getElementById('tkb-dang-tai');
      if (x) x.remove();
      docTep(tep);
    }).catch(function (e) {
      var x = document.getElementById('tkb-dang-tai');
      if (x) x.remove();
      LOI_DOC = (e && e.message) || String(e);
      veLai();
    });
  };

  function docTep(tep) {
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
  }

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
