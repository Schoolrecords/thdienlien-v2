// ============================================================
// csvc.js — KIỂM KÊ ĐIỀU KIỆN CƠ SỞ VẬT CHẤT THEO TỪNG ĐỊA ĐIỂM
//
// Thay màn "Điều kiện bảo đảm" của module Đảm bảo chất lượng — màn cuối cùng
// còn là giao diện mẫu. Bảng dữ liệu: sql/45 (csvc_kiem_ke).
//
// Ba chỗ dùng chung số liệu này:
//   · Màn Điều kiện bảo đảm (ĐBCL) — chính là màn này.
//   · Tiêu chí 4.1 TCQG "Cơ sở vật chất, thiết bị, học liệu và hạ tầng kỹ
//     thuật" — tiêu chí BẮT BUỘC, hội đồng cần số để soi.
//   · CV 5555/BGDĐT-GDPT mục IV.3.e — theo dõi riêng điều kiện của từng phân
//     hiệu, điểm trường.
//
// 🔑 DANH MỤC HẠNG MỤC nằm ở tệp này, KHÔNG ở cơ sở dữ liệu — cùng lối với 9
//    nhóm việc và 16 phụ lục ĐBCL. Đây là khung chung của cấp tiểu học, không
//    phải thứ mỗi trường tự đặt. Bảng chỉ giữ con số của trường.
//
// ⚠️ KHÔNG ghi ĐỊNH MỨC CHUẨN vào danh mục (bao nhiêu m² một phòng, mấy chỗ
//    ngồi thư viện). Chưa đối chiếu văn bản gốc quy định tiêu chuẩn cơ sở vật
//    chất trường tiểu học thì con số đó là phỏng đoán. Cột "Đạt yêu cầu" để
//    nhà trường TỰ tích — app không kết luận thay hội đồng.
// ============================================================
(function () {
  'use strict';

  function thoat(s) { return window.thoatHTML ? window.thoatHTML(s) : String(s || ''); }
  function may() { return window.MAY_CHU; }
  function nam() {
    return (window.CAU_HINH || {}).NAM_HOC ||
      window.tinhNamHoc((window.CAU_HINH || {}).MOC_DOI_NAM_HOC);
  }
  function laQT() {
    var u = window.NGUOI_DUNG;
    return !!u && (u.vai_tro === 'admin' || u.vai_tro === 'ban_giam_hieu');
  }

  // ══════════ DANH MỤC HẠNG MỤC ══════════
  // kieu 'phong'    → chia kiên cố / bán kiên cố / tạm, tổng tự cộng
  // kieu 'so'       → chỉ một con số (cái, bộ, bản…)
  // kieu 'co_khong' → chỉ hỏi có hay không, không đếm
  var NHOM = [
    {
      ma: 'phong', ten: 'Phòng học và phòng chức năng',
      mo: 'Đếm theo phòng đang sử dụng được. Phòng đang xây, đang sửa lớn thì ghi vào ghi chú.',
      muc: [
        { ma: 'phong_hoc',        ten: 'Phòng học',                          kieu: 'phong' },
        { ma: 'p_tin_hoc',        ten: 'Phòng học bộ môn Tin học',           kieu: 'phong' },
        { ma: 'p_ngoai_ngu',      ten: 'Phòng học bộ môn Ngoại ngữ',         kieu: 'phong' },
        { ma: 'p_am_nhac',        ten: 'Phòng Âm nhạc',                      kieu: 'phong' },
        { ma: 'p_mi_thuat',       ten: 'Phòng Mĩ thuật',                     kieu: 'phong' },
        { ma: 'p_da_chuc_nang',   ten: 'Phòng đa chức năng, giáo dục thể chất', kieu: 'phong' },
        { ma: 'thu_vien',         ten: 'Thư viện',                           kieu: 'phong' },
        { ma: 'p_thiet_bi',       ten: 'Phòng thiết bị giáo dục',            kieu: 'phong' },
        { ma: 'p_truyen_thong',   ten: 'Phòng truyền thống, hoạt động Đội',  kieu: 'phong' },
        { ma: 'p_y_te',           ten: 'Phòng y tế học đường',               kieu: 'phong' },
        { ma: 'p_hieu_truong',    ten: 'Phòng làm việc Hiệu trưởng, Phó Hiệu trưởng', kieu: 'phong' },
        { ma: 'p_hanh_chinh',     ten: 'Phòng hành chính, văn phòng',        kieu: 'phong' },
        { ma: 'p_hop',            ten: 'Phòng họp, hội đồng',                kieu: 'phong' },
        { ma: 'p_bep_an',         ten: 'Bếp và phòng ăn bán trú (nếu có)',   kieu: 'phong' }
      ]
    },
    {
      ma: 'ngoai', ten: 'Khuôn viên và điều kiện chung',
      mo: 'Phần lớn là câu hỏi có hay chưa. Chỗ nào chưa đạt thì ghi rõ thiếu gì ở cột ghi chú.',
      muc: [
        { ma: 'san_choi',      ten: 'Sân chơi, bãi tập',                kieu: 'co_khong' },
        { ma: 'wc_hoc_sinh',   ten: 'Khu vệ sinh học sinh',             kieu: 'so', dv: 'khu' },
        { ma: 'wc_giao_vien',  ten: 'Khu vệ sinh giáo viên',            kieu: 'so', dv: 'khu' },
        { ma: 'nuoc_sach',     ten: 'Nguồn nước sạch',                  kieu: 'co_khong' },
        { ma: 'tuong_rao',     ten: 'Tường rào, cổng trường',           kieu: 'co_khong' },
        { ma: 'nha_de_xe',     ten: 'Khu để xe',                        kieu: 'co_khong' },
        { ma: 'pccc',          ten: 'Thiết bị phòng cháy chữa cháy',    kieu: 'co_khong' },
        { ma: 'camera',        ten: 'Camera an ninh',                   kieu: 'co_khong' }
      ]
    },
    {
      ma: 'thiet_bi', ten: 'Thiết bị, học liệu và hạ tầng công nghệ',
      mo: 'Bộ thiết bị dạy học tối thiểu đếm theo số khối lớp đã có đủ bộ, không đếm từng món.',
      muc: [
        { ma: 'bo_thiet_bi',   ten: 'Bộ thiết bị dạy học tối thiểu',    kieu: 'so', dv: 'khối lớp có đủ bộ' },
        { ma: 'may_tinh_day',  ten: 'Máy tính phục vụ dạy học',         kieu: 'so', dv: 'máy' },
        { ma: 'may_tinh_ql',   ten: 'Máy tính phục vụ quản lý',         kieu: 'so', dv: 'máy' },
        { ma: 'ti_vi_may_chieu', ten: 'Ti vi hoặc máy chiếu tại lớp',   kieu: 'so', dv: 'bộ' },
        { ma: 'internet',      ten: 'Kết nối Internet',                 kieu: 'co_khong' },
        { ma: 'dau_sach',      ten: 'Đầu sách thư viện',                kieu: 'so', dv: 'bản' }
      ]
    }
  ];

  // Tra nhanh mã hạng mục → định nghĩa, dùng khi vẽ bảng tổng hợp.
  var TRA_MUC = {};
  NHOM.forEach(function (n) {
    n.muc.forEach(function (m) { TRA_MUC[m.ma] = m; });
  });

  var CO_SO = [];      // cơ sở đang hoạt động
  var GHI = {};        // 'coSoMa|hangMuc' → bản ghi csvc_kiem_ke
  var CS_CHON = null;  // null = xem tổng hợp toàn trường
  var DANG_TAI = false;
  var LOI = null;
  // 🔴 Cờ RIÊNG, không suy từ việc có dữ liệu hay không — trường chưa khai
  // hạng mục nào mà suy từ dữ liệu thì rơi vào vòng lặp nạp vô hạn (mục 30.3).
  var DA_NAP = false;

  function khoa(csMa, hm) { return csMa + '|' + hm; }
  function o(csMa, hm) { return GHI[khoa(csMa, hm)] || {}; }
  function so(v) { var n = parseInt(v, 10); return isFinite(n) && n > 0 ? n : 0; }

  // ══════════ ĐỌC ══════════
  // Không bao giờ ném lỗi ra ngoài: trường chưa chạy sql/45 thì màn cũ vẫn
  // chạy nguyên, chỉ hiện lời nhắc cài đặt bổ sung.
  function nap(veLai) {
    if (!may()) { LOI = 'chua_ket_noi'; DA_NAP = true; veLai(); return; }
    DANG_TAI = true; DA_NAP = true; LOI = null; veLai();

    Promise.all([
      may().from('co_so').select('ma, ten, loai, so_tt').eq('hoat_dong', true).order('so_tt'),
      may().from('csvc_kiem_ke').select('*').eq('nam_hoc', nam())
    ]).then(function (r) {
      DANG_TAI = false;
      if (r[0].error) throw r[0].error;
      if (r[1].error) throw r[1].error;
      CO_SO = r[0].data || [];
      GHI = {};
      (r[1].data || []).forEach(function (d) { GHI[khoa(d.co_so_ma, d.hang_muc)] = d; });
      // Trường một địa điểm thì mở thẳng bảng nhập của địa điểm đó — bày bảng
      // "tổng hợp" một cột trùng y hệt bảng bên cạnh chỉ tổ rối.
      if (CS_CHON === null && CO_SO.length === 1) CS_CHON = CO_SO[0].ma;
      veLai();
    }).catch(function (e) {
      DANG_TAI = false; LOI = e.message || String(e); veLai();
    });
  }

  // ══════════ GHI ══════════
  // Hàng đợi ghi: các lệnh nối đuôi nhau, lệnh lỗi không giết hàng. Cần vì
  // gõ nhanh "Kiên cố = 3, Tab, Bán kiên cố = 2": lệnh ② phải chờ ① về mới
  // chạy, để cột tổng của ② tính từ dòng máy chủ đã có kien_co = 3.
  var HANG_GHI = Promise.resolve();
  function xepHang(viec) {
    var lui = HANG_GHI.then(viec, viec);
    HANG_GHI = lui.then(function () {}, function () {});
    return lui;
  }

  // Ghi MỘT dòng, CHỈ các cột trong `ban`. Dòng đã có id → update; chưa có →
  // upsert lần đầu với khoá + cột đổi (cột số có default 0, còn lại null).
  function ghiDong(csMa, hm, ban) {
    var cu = o(csMa, hm);
    ban.cap_nhat_boi = window.NGUOI_DUNG ? window.NGUOI_DUNG.id : null;
    var lenh;
    if (cu.id) {
      lenh = may().from('csvc_kiem_ke').update(ban).eq('id', cu.id);
    } else {
      ban.nam_hoc = nam(); ban.co_so_ma = csMa; ban.hang_muc = hm;
      lenh = may().from('csvc_kiem_ke').upsert(ban, { onConflict: 'nam_hoc,co_so_ma,hang_muc' });
    }
    return lenh.select().maybeSingle().then(function (r) {
      if (r.error) throw r.error;
      // RLS chặn update thì không lỗi mà ghi 0 dòng — coi là chưa lưu.
      if (!r.data) throw new Error('máy chủ không ghi dòng nào — có thể thầy cô không có ' +
        'quyền, hoặc dòng đã bị xoá. Tải lại trang rồi thử lại.');
      GHI[khoa(csMa, hm)] = r.data;
      return r.data;
    });
  }

  // Bản đầu gửi lại CẢ dòng lấy từ GHI (bản chụp lúc nạp) — hai lỗi một lúc:
  //  · hai người cùng khai một địa điểm thì người rời ô sau đè số cũ lên cột
  //    người kia vừa ghi, cả hai đều thấy lưu xong;
  //  · một người gõ nhanh hai ô liền nhau, lệnh ② gửi đi khi ① chưa về nên
  //    mang kien_co = 0 của bản chụp đè lên số 3 vừa gửi.
  // Nay chỉ ghi đúng cột đổi, xếp hàng, và tổng so_luong của hạng mục dạng
  // phòng tính từ DÒNG MÁY CHỦ TRẢ VỀ (đã có số người khác vừa ghi) rồi ghi
  // thêm một lượt nếu lệch — không tính từ bộ đệm.
  // Giá trị đã GỬI gần nhất của từng ô — kể cả lệnh còn đang bay. Dedup phải
  // so với nó chứ không so với bộ đệm GHI: bộ đệm chỉ đổi khi máy chủ TRẢ VỀ,
  // nên "gõ 3, Tab, nhận ra nhầm, sửa lại 0 trước khi phản hồi về" mà so bộ
  // đệm là lệnh sửa bị nuốt — DB giữ 3, ô hiện 0, không báo gì.
  var DA_GUI = {};
  function daGui(csMa, hm, truong, macDinh) {
    var k = khoa(csMa, hm) + '.' + truong;
    return DA_GUI.hasOwnProperty(k) ? DA_GUI[k] : macDinh;
  }

  function luu(csMa, hm, thay) {
    var cacCot = Object.keys(thay);
    cacCot.forEach(function (k) { DA_GUI[khoa(csMa, hm) + '.' + k] = thay[k]; });
    return xepHang(function () {
      var ban = {};
      cacCot.forEach(function (k) { ban[k] = thay[k]; });
      return ghiDong(csMa, hm, ban).then(function (d) {
        var mm = TRA_MUC[hm] || {};
        if (mm.kieu !== 'phong') return d;
        // Tổng luôn bằng tổng ba cột, không để người dùng gõ tay — gõ tay là
        // sớm muộn cũng lệch.
        var tongMoi = so(d.kien_co) + so(d.ban_kien_co) + so(d.tam);
        if (tongMoi === so(d.so_luong)) return d;
        return ghiDong(csMa, hm, { so_luong: tongMoi }).catch(function (e) {
          // Lượt ghi tổng hỏng giữa chừng: cột thành phần đã vào máy chủ mà
          // tổng thì chưa. Xoá bản đệm để lần gõ sau đi lại từ đầu và tự chữa
          // tổng — không xoá thì dedup nuốt lệnh, tổng lệch vĩnh viễn.
          delete GHI[khoa(csMa, hm)];
          throw e;
        });
      });
    }).catch(function (e) {
      // Lệnh hỏng thì xoá vết "đã gửi" để gõ lại đúng số ấy vẫn ghi được.
      cacCot.forEach(function (k) { delete DA_GUI[khoa(csMa, hm) + '.' + k]; });
      throw e;
    });
  }

  // ══════════ TỔNG HỢP ══════════
  // Cộng một hạng mục trên mọi địa điểm. Đây là "số của toàn trường" — bảng
  // không có dòng toàn trường riêng, xem chú thích cột co_so_ma ở sql/45.
  function tong(hm, truong) {
    var t = 0;
    CO_SO.forEach(function (cs) { t += so(o(cs.ma, hm)[truong]); });
    return t;
  }

  // Lộ ra cho màn khác dùng chung (tiêu chí 4.1 TCQG, ô số màn Điều kiện).
  // Trả null khi chưa nạp xong để nơi gọi biết mà để dấu gạch, thay vì hiện
  // số 0 — chưa biết và bằng không là hai chuyện khác nhau.
  function tomTat() {
    if (!DA_NAP || LOI) return null;
    return {
      phongHoc:    tong('phong_hoc', 'so_luong'),
      phongKienCo: tong('phong_hoc', 'kien_co'),
      thuVien:     tong('thu_vien', 'so_luong'),
      mayTinh:     tong('may_tinh_day', 'so_luong'),
      soDiaDiem:   CO_SO.length,
      // Đếm hạng mục nhà trường đã tự tích là CHƯA đạt, trên mọi địa điểm.
      chuaDat: CO_SO.reduce(function (n, cs) {
        return n + Object.keys(TRA_MUC).filter(function (hm) {
          return o(cs.ma, hm).dat_yeu_cau === false;
        }).length;
      }, 0),
      // ĐẾM HẠNG MỤC còn thiếu, KHÔNG cộng số lượng lại với nhau: 10 phòng
      // học + 500 bản sách = 510 là con số vô nghĩa mà lại trông như số thật.
      // Cần biết thiếu bao nhiêu cái gì thì mở bảng ra xem, cột "Cần bổ sung"
      // của từng hạng mục mới là chỗ cộng được. Nuôi Phụ lục 4 ĐBCL, Biểu 2.
      soHangMucThieu: CO_SO.reduce(function (n, cs) {
        return n + Object.keys(TRA_MUC).filter(function (hm) {
          return so(o(cs.ma, hm).nhu_cau) > 0;
        }).length;
      }, 0)
    };
  }

  // ══════════ VẼ — CHỌN ĐỊA ĐIỂM ══════════
  function chipDiaDiem() {
    if (CO_SO.length < 2) return '';
    return '<div class="chip-hang" style="margin:0 0 14px">' +
      '<button class="chip-loc' + (CS_CHON === null ? ' on' : '') + '" data-csvc-cs="">' +
      '🏫 Tổng hợp toàn trường</button>' +
      CO_SO.map(function (cs) {
        return '<button class="chip-loc' + (CS_CHON === cs.ma ? ' on' : '') +
          '" data-csvc-cs="' + thoat(cs.ma) + '">' + thoat(cs.ten) + '</button>';
      }).join('') + '</div>';
  }

  // ══════════ VẼ — BẢNG TỔNG HỢP ══════════
  function veTongHop() {
    return NHOM.map(function (n) {
      return '<div class="dau-muc" style="text-align:left;margin:20px 0 8px">' +
        '<div class="nhan-nho">' + thoat(n.ten) + '</div></div>' +
        '<div class="cuon-ngang"><table class="bang-quan-tri nho"><thead><tr>' +
        '<th>Hạng mục</th>' +
        CO_SO.map(function (cs) {
          return '<th style="text-align:center">' + thoat(cs.ten) + '</th>';
        }).join('') +
        '<th style="text-align:center">Toàn trường</th>' +
        '<th style="text-align:center">Cần bổ sung</th>' +
        '</tr></thead><tbody>' +
        n.muc.map(function (m) {
          var tongNC = tong(m.ma, 'nhu_cau');
          return '<tr><td><b>' + thoat(m.ten) + '</b>' +
            (m.dv ? '<br><small style="color:var(--chu-mo)">' + thoat(m.dv) + '</small>' : '') +
            '</td>' +
            CO_SO.map(function (cs) {
              return '<td style="text-align:center">' + oToanVan(m, o(cs.ma, m.ma)) + '</td>';
            }).join('') +
            '<td style="text-align:center"><b>' +
            (m.kieu === 'co_khong'
              // Hạng mục có/không thì "tổng" là số nơi đã có, cộng số lượng
              // của chúng lại thì ra một con số vô nghĩa.
              ? demCo(m.ma) + '/' + CO_SO.length + ' nơi'
              : tong(m.ma, 'so_luong')) + '</b></td>' +
            '<td style="text-align:center">' + (tongNC
              ? '<b style="color:#c26a1f">' + tongNC + '</b>'
              : '<span style="color:var(--chu-mo)">—</span>') + '</td></tr>';
        }).join('') +
        '</tbody></table></div>';
    }).join('');
  }

  function demCo(hm) {
    return CO_SO.filter(function (cs) { return o(cs.ma, hm).dat_yeu_cau === true; }).length;
  }

  // Một ô trong bảng tổng hợp: hiện gọn, đủ để thấy chỗ nào yếu.
  function oToanVan(m, d) {
    if (m.kieu === 'co_khong') {
      if (d.dat_yeu_cau === true)  return '<b style="color:var(--ok)">✔</b>';
      if (d.dat_yeu_cau === false) return '<b style="color:var(--thieu)">✘</b>';
      return '<span style="color:var(--chu-mo)">—</span>';
    }
    var n = so(d.so_luong);
    if (!n && d.dat_yeu_cau === undefined) return '<span style="color:var(--chu-mo)">—</span>';
    var chuaDat = d.dat_yeu_cau === false;
    return '<span' + (chuaDat ? ' style="color:var(--thieu);font-weight:600"' : '') + '>' + n +
      (m.kieu === 'phong' && so(d.kien_co) !== n
        ? '<br><small style="color:var(--chu-mo)">kiên cố ' + so(d.kien_co) + '</small>'
        : '') + '</span>';
  }

  // ══════════ VẼ — BẢNG NHẬP CỦA MỘT ĐỊA ĐIỂM ══════════
  function veMotNoi(csMa) {
    var cs = CO_SO.filter(function (c) { return c.ma === csMa; })[0];
    if (!cs) return '<div class="the-thong-bao">Không tìm thấy địa điểm này.</div>';
    var sua = laQT();

    return NHOM.map(function (n) {
      return '<div class="dau-muc" style="text-align:left;margin:20px 0 4px">' +
        '<div class="nhan-nho">' + thoat(n.ten) + '</div></div>' +
        '<div class="nhan-nho" style="text-transform:none;letter-spacing:0;color:var(--chu-mo);margin-bottom:8px">' +
        thoat(n.mo) + '</div>' +
        '<div class="cuon-ngang"><table class="bang-quan-tri nho"><thead><tr>' +
        '<th>Hạng mục</th><th style="text-align:center">Kiên cố</th>' +
        '<th style="text-align:center">Bán kiên cố</th><th style="text-align:center">Tạm</th>' +
        '<th style="text-align:center">Tổng / Số lượng</th>' +
        '<th style="text-align:center">Đạt yêu cầu</th>' +
        '<th style="text-align:center">Cần bổ sung</th><th>Ghi chú</th>' +
        '</tr></thead><tbody>' +
        n.muc.map(function (m) { return veDong(csMa, m, sua); }).join('') +
        '</tbody></table></div>';
    }).join('');
  }

  function veDong(csMa, m, sua) {
    var d = o(csMa, m.ma);
    var laPhong = m.kieu === 'phong';
    var laCoKhong = m.kieu === 'co_khong';
    var trong = '<td style="text-align:center;color:var(--chu-mo)">—</td>';

    function oSo(truong, giaTri) {
      if (!sua) return '<td style="text-align:center">' + so(giaTri) + '</td>';
      return '<td style="text-align:center"><input class="csvc-o" type="number" min="0" ' +
        'value="' + so(giaTri) + '" data-csvc-so="' + thoat(m.ma) + '" ' +
        'data-csvc-truong="' + truong + '" style="width:64px;text-align:center"></td>';
    }

    var cotSo = laCoKhong
      ? trong + trong + trong + trong
      : laPhong
        ? oSo('kien_co', d.kien_co) + oSo('ban_kien_co', d.ban_kien_co) + oSo('tam', d.tam) +
          // data-csvc-tong: ô tổng được vá tại chỗ sau mỗi lần lưu, không vẽ lại bảng
          '<td style="text-align:center"><b data-csvc-tong="' + thoat(m.ma) + '">' +
          so(d.so_luong) + '</b></td>'
        : trong + trong + trong + oSo('so_luong', d.so_luong);

    var cotDat = sua
      ? '<td style="text-align:center"><select class="csvc-o" data-csvc-dat="' + thoat(m.ma) + '">' +
        [['', 'chưa xét'], ['1', 'Đạt'], ['0', 'Chưa đạt']].map(function (x) {
          var dangLa = d.dat_yeu_cau === true ? '1' : d.dat_yeu_cau === false ? '0' : '';
          return '<option value="' + x[0] + '"' + (dangLa === x[0] ? ' selected' : '') + '>' +
            x[1] + '</option>';
        }).join('') + '</select></td>'
      : '<td style="text-align:center">' + (d.dat_yeu_cau === true
          ? '<b style="color:var(--ok)">Đạt</b>'
          : d.dat_yeu_cau === false
            ? '<b style="color:var(--thieu)">Chưa đạt</b>'
            : '<span style="color:var(--chu-mo)">chưa xét</span>') + '</td>';

    // Hạng mục dạng có/không KHÔNG có ô "cần bổ sung": "cần bổ sung 1 nguồn
    // nước sạch" không rõ nghĩa là gì. Ở đó, tích "Chưa đạt" đã nói đủ, cần
    // gì cụ thể thì viết vào ghi chú.
    var cotNC = laCoKhong
      ? trong
      : sua
        ? '<td style="text-align:center"><input class="csvc-o" type="number" min="0" ' +
          'value="' + so(d.nhu_cau) + '" data-csvc-so="' + thoat(m.ma) + '" ' +
          'data-csvc-truong="nhu_cau" style="width:64px;text-align:center"></td>'
        : '<td style="text-align:center">' + (so(d.nhu_cau) || '—') + '</td>';

    var cotGC = sua
      ? '<td><input class="csvc-o" type="text" value="' + thoat(d.ghi_chu || '') + '" ' +
        'data-csvc-gc="' + thoat(m.ma) + '" placeholder="…" style="width:100%;min-width:130px"></td>'
      : '<td>' + thoat(d.ghi_chu || '') + '</td>';

    return '<tr><td><b>' + thoat(m.ten) + '</b>' +
      (m.dv ? '<br><small style="color:var(--chu-mo)">' + thoat(m.dv) + '</small>' : '') +
      '</td>' + cotSo + cotDat + cotNC + cotGC + '</tr>';
  }

  // ══════════ VẼ — Ô SỐ ĐẦU MÀN ══════════
  function oSoTong() {
    var t = tomTat() || {};
    function s(v) { return (v === undefined || v === null) ? '—' : v; }
    return '<div class="luoi-thong-ke">' +
      '<div class="o-so"><div class="so trang">' + s(t.phongHoc) + '</div>' +
      '<div class="nhan">phòng học</div></div>' +
      '<div class="o-so"><div class="so xanh">' + s(t.phongKienCo) + '</div>' +
      '<div class="nhan">trong đó kiên cố</div></div>' +
      '<div class="o-so"><div class="so ' + (t.chuaDat ? 'hong' : 'vang') + '">' +
      s(t.chuaDat) + '</div><div class="nhan">hạng mục chưa đạt</div></div>' +
      '<div class="o-so"><div class="so vang">' + s(t.soHangMucThieu) + '</div>' +
      '<div class="nhan">hạng mục cần bổ sung</div></div>' +
      '</div>';
  }

  // ══════════ VẼ ══════════
  function ve(veLai) {
    if (DANG_TAI) return '<div class="the-thong-bao">Đang tải…</div>';

    if (LOI === 'chua_ket_noi') {
      return '<div class="the-thong-bao" style="text-align:center;padding:24px">' +
        '<p><b>Bản xem thử chưa nối cơ sở dữ liệu.</b></p>' +
        '<p style="font-size:14px;color:var(--chu-mo);margin-top:6px">' +
        'Số liệu cơ sở vật chất là dữ liệu thật của nhà trường nên cần đăng nhập.</p></div>';
    }
    if (LOI) {
      return '<div class="hd-kiem do"><b>Chưa mở được phần cơ sở vật chất.</b><br>' +
        'Nếu đây là lần đầu dùng mục này, nhà trường cần cài đặt bổ sung một lần ' +
        '(tệp <code>sql/45</code>) — báo người phụ trách hệ thống.' +
        '<div style="margin-top:6px;font-size:13px;opacity:.8">' + thoat(LOI) + '</div></div>';
    }
    if (!CO_SO.length) {
      return '<div class="the-thong-bao" style="text-align:center;padding:24px">' +
        '<p><b>Chưa khai địa điểm nào.</b></p>' +
        '<p style="font-size:14px;color:var(--chu-mo);margin-top:6px">' +
        'Vào Quản trị → 🏫 Cơ sở &amp; Sáp nhập khai trường chính và các phân hiệu, ' +
        'điểm trường trước đã.</p></div>';
    }

    var loiMo = CO_SO.length >= 2
      ? 'Cơ sở vật chất ghi riêng cho từng địa điểm theo mục IV.3.e Công văn 5555 — trường chính, ' +
        'phân hiệu và điểm trường có điều kiện khác nhau, gộp làm một số chung là che mất nơi thiếu.'
      : 'Số liệu dưới đây nuôi tiêu chí 4.1 Trường chuẩn Quốc gia và Phụ lục 4 của hồ sơ Đảm bảo chất lượng.';

    return '<div class="yc"><div class="yc-nhan">🏫 Điều kiện cơ sở vật chất · năm học ' +
      thoat(nam()) + '</div><p>' + loiMo + ' Cột <b>Đạt yêu cầu</b> do nhà trường tự tích — ' +
      'app không tự kết luận thay hội đồng.</p></div>' +

      // Bọc id để vá lại bốn ô số sau mỗi lần lưu mà không vẽ lại cả vùng.
      '<div id="csvc-o-so">' + oSoTong() + '</div>' + chipDiaDiem() +
      (CS_CHON === null ? veTongHop() : veMotNoi(CS_CHON)) +
      (laQT() ? nutChep() : '');
  }

  function nutChep() {
    return '<div style="margin-top:18px;display:flex;gap:10px;flex-wrap:wrap;align-items:center">' +
      '<button class="nut-luu-nd" id="csvc-chep">⧉ Chép số liệu từ năm học trước</button>' +
      '<span style="font-size:13.4px;color:var(--chu-mo)">Chỉ điền vào những hạng mục ' +
      'năm nay còn trống — số đã sửa của năm nay giữ nguyên.</span></div>';
  }

  // ══════════ SỰ KIỆN ══════════
  function noiSuKien(goc, veLai) {
    if (!goc) return;

    Array.prototype.slice.call(goc.querySelectorAll('[data-csvc-cs]')).forEach(function (b) {
      b.addEventListener('click', function () {
        var v = b.getAttribute('data-csvc-cs');
        CS_CHON = v === '' ? null : v;
        veLai();
      });
    });

    function bao(e) { window.hopHoi('Không lưu được: ' + ((e && e.message) || e)); }

    // 🔴 NÚT CHÉP PHẢI NỐI TRƯỚC CHỖ THOÁT SỚM. Bản đầu đặt nó ở cuối hàm,
    //    sau dòng `if (CS_CHON === null) return`, mà nút thì vẫn LUÔN được vẽ.
    //    Trường nhiều địa điểm mở màn ra là đang ở bảng tổng hợp
    //    (CS_CHON = null), nên nút hiện lên mà bấm không có gì xảy ra, cũng
    //    không báo lỗi gì — đúng thao tác đầu tiên của mỗi đầu năm học.
    noiNutChep(goc, veLai, bao);

    if (CS_CHON === null) return;   // bảng tổng hợp không có ô nhập nào

    // 🔴 KHÔNG gọi veLai() sau mỗi lần lưu. veLai là veDBCL — dựng lại cả
    //    vùng, nên ô người dùng vừa Tab sang bị dựng lại giữa lúc đang gõ,
    //    mất con trỏ và mất chữ. Chỉ vá ô tổng của dòng và bốn ô số đầu màn;
    //    mọi thứ khác đã đúng tại chỗ vì chính người dùng vừa gõ vào.
    // Ghim csMa lúc bấm: lệnh chạy sau trong hàng đợi, CS_CHON có thể đã đổi.
    function vaTaiCho(csMa, hm) {
      var d = o(csMa, hm);
      var oTong = goc.querySelector('[data-csvc-tong="' + hm + '"]');
      if (oTong && CS_CHON === csMa) oTong.textContent = so(d.so_luong);
      var oSo = goc.querySelector('#csvc-o-so');
      if (oSo) oSo.innerHTML = oSoTong();
    }

    Array.prototype.slice.call(goc.querySelectorAll('[data-csvc-so]')).forEach(function (t) {
      t.addEventListener('change', function () {
        var csMa = CS_CHON;
        var hm = t.getAttribute('data-csvc-so');
        var truong = t.getAttribute('data-csvc-truong');
        var moi = so(t.value);
        t.value = moi;   // "3.7", "-1", chữ → về số nguyên không âm ngay trong ô
        if (so(daGui(csMa, hm, truong, o(csMa, hm)[truong])) === moi) return;
        var thay = {}; thay[truong] = moi;
        luu(csMa, hm, thay)
          .then(function () { vaTaiCho(csMa, hm); })
          .catch(function (e) {
            // Lỗi thì trả ô về số đang có trên máy chủ, không để số chưa ghi
            // nằm trong ô trông như đã lưu.
            t.value = so(o(csMa, hm)[truong]);
            bao(e);
          });
      });
    });

    Array.prototype.slice.call(goc.querySelectorAll('[data-csvc-dat]')).forEach(function (s) {
      s.addEventListener('change', function () {
        var csMa = CS_CHON;
        var hm = s.getAttribute('data-csvc-dat');
        var v = s.value === '' ? null : s.value === '1';
        luu(csMa, hm, { dat_yeu_cau: v })
          .then(function () { vaTaiCho(csMa, hm); })
          .catch(function (e) {
            var cu = o(csMa, hm).dat_yeu_cau;
            s.value = cu === true ? '1' : cu === false ? '0' : '';
            bao(e);
          });
      });
    });

    Array.prototype.slice.call(goc.querySelectorAll('[data-csvc-gc]')).forEach(function (t) {
      t.addEventListener('blur', function () {
        var csMa = CS_CHON;
        var hm = t.getAttribute('data-csvc-gc');
        var cu = daGui(csMa, hm, 'ghi_chu', o(csMa, hm).ghi_chu || null);
        var moi = t.value.trim() || null;
        if (cu === moi) return;
        luu(csMa, hm, { ghi_chu: moi }).catch(function (e) {
          bao(e); t.value = o(csMa, hm).ghi_chu || '';
        });
      });
    });

  }

  // Tách riêng để nối được TRƯỚC chỗ thoát sớm của noiSuKien.
  function noiNutChep(goc, veLai, bao) {
    var chep = goc.querySelector('#csvc-chep');
    if (!chep) return;

    chep.addEventListener('click', function () {
      // Năm học ghi kiểu '2026-2027' → năm trước là '2025-2026'.
      var N = nam();
      var dau = parseInt(String(N).slice(0, 4), 10);
      if (!isFinite(dau)) { window.hopHoi('Không đoán được năm học trước từ "' + N + '".'); return; }
      var truoc = (dau - 1) + '-' + dau;

      window.hopHoi({
        tieuDe: 'Chép số liệu từ năm học ' + truoc + '?',
        noiDung: 'Những hạng mục năm nay còn trống sẽ lấy số của năm ' + truoc +
          '. Hạng mục năm nay đã khai thì giữ nguyên, không bị đè.',
        nutOK: 'Chép'
      }).then(function (dongY) {
        if (!dongY) return;
        chep.disabled = true;
        may().rpc('csvc_chep_nam_truoc', { p_nam_cu: truoc, p_nam_moi: N })
          .then(function (r) {
            chep.disabled = false;
            if (r.error) { bao(r.error); return; }
            // r.data = 0 có HAI nghĩa: năm trước trống, hoặc năm nay đã khai
            // đủ nên không còn ô nào để chèn (hàm dùng on conflict do nothing).
            // Nói cả hai, đừng đoán hộ.
            if (!r.data) {
              window.hopHoi('Không chép được dòng nào. Hoặc năm học ' + truoc +
                ' chưa có số liệu, hoặc năm nay đã khai hết các hạng mục rồi.');
              return;
            }
            window.hopHoi('Đã chép ' + r.data + ' dòng từ năm học ' + truoc + '.');
            nap(veLai);
          })
          .catch(function (e) { chep.disabled = false; bao(e); });
      });
    });
  }

  window.CSVC = {
    ve: ve, nap: nap, noiSuKien: noiSuKien,
    daTai: function () { return DA_NAP; },
    tomTat: tomTat
  };
})();
