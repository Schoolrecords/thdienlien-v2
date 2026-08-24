// ============================================================
// tcqg.js — MÀN TỰ ĐÁNH GIÁ TRƯỜNG CHUẨN QUỐC GIA (TT57/2026)
// Kế thừa tudanhgia-sql.js của THCS Bạch Liêu, chạy trên CSDL Diễn Liên.
// Nguyên tắc giữ nguyên từ bản gốc:
//  · Người chấm 2 nút Đạt/Không đạt từng mức — máy KHÔNG suy mức từ nội hàm
//  · Khóa tuần tự: chưa đạt Mức 1 thì không chấm Mức 2
//  · Hàng đợi ghi (2 lệnh không chen nhau); CHỈ ghi cột vừa đổi (ghiMotDong);
//    đếm dòng sau ghi — bản gốc upsert đủ cột, đã bỏ vì hai người đè nhau
//  · Không re-render khi đang gõ — đếm lại chỉ vá tại chỗ
// du-lieu-sql.js gọi window.khoiDongTCQG() sau khi đăng nhập + nạp kho hồ sơ.
// ============================================================
(function () {
  'use strict';

  var $ = function (s) { return document.querySelector(s); };
  var thoat = function (s) { return window.thoatHTML(s); };

  var NAM = '';            // năm học người dùng CHỌN ở ô lọc
  // Năm học của dữ liệu ĐANG HIỂN THỊ. Khác NAM trong khoảng từ lúc đổi ô
  // chọn năm đến lúc dữ liệu năm mới về: màn vẫn bày dữ liệu năm cũ, nên mọi
  // lệnh ghi phải dùng NAM_DL — bấm Đạt trên màn năm cũ mà ghi vào năm mới
  // là sai lặng lẽ, không ai phát hiện cho tới khi in báo cáo.
  var NAM_DL = '';
  var TC = [];             // 15 tiêu chí + kết quả chấm
  var NOI_HAM = {};        // 'ma|muc' -> [rows noi_ham]
  var HT_NH = {};          // noi_ham_id -> row tdg_noi_ham
  var NH_CUA = {};         // noi_ham_id -> {ma, muc}
  var DGTC = {};           // tieu_chuan -> row danh_gia_tieu_chuan
  var BC = null;           // row bao_cao_tdg
  var TC_CHON = null;
  var TAB_CT = 'nd';
  var LOC = 'all';
  var STD = 0;             // 0 = cả 4 tiêu chuẩn
  var DANG_SUA = false;
  var TAI_HONG = false;

  // Là HÀM chứ không phải hằng: hai nhãn "Kiến nghị với …" lấy tên cơ quan từ
  // CAU_HINH, mà cấu hình trường về SAU khi tệp này nạp — chụp lúc nạp tệp thì
  // nhãn mãi mãi là chữ chung "cơ quan quản lý ngành". Đọc lúc vẽ mới đúng.
  function cotBC() { return [
    { nhom: 'Phần I — Thông tin chung', muc: [
      ['nam_thanh_lap', 'Năm thành lập trường', 1],
      ['kt_xh', 'Điều kiện kinh tế - xã hội của địa phương', 0],
      ['thuan_loi', 'Thuận lợi', 0],
      ['kho_khan', 'Khó khăn', 0],
      ['dac_diem_nguoi_hoc', 'Đặc điểm học sinh', 0]] },
    { nhom: 'Phần I mục 4 — Quá trình tự đánh giá', muc: [
      ['lap_ke_hoach', 'Lập kế hoạch tự đánh giá', 0],
      ['to_chuc_thuc_hien', 'Tổ chức thực hiện', 0],
      ['kiem_tra_phan_tich', 'Kiểm tra, phân tích dữ liệu', 0],
      ['tong_hop_xac_nhan', 'Tổng hợp, xác nhận kết quả', 0]] },
    { nhom: 'Phần III — Kết luận, kiến nghị', muc: [
      ['khai_quat', 'Khái quát kết quả tự đánh giá', 0],
      ['kn_so', 'Kiến nghị với ' + ((window.CAU_HINH && window.CAU_HINH.CO_QUAN_THUONG) || 'cơ quan quản lý ngành'), 0],
      ['kn_ubnd', 'Kiến nghị với ' + ((window.CAU_HINH && window.CAU_HINH.CHU_QUAN_THUONG) || 'đơn vị chủ quản'), 0],
      ['kn_khac', 'Kiến nghị khác (nếu có — trống thì báo cáo không in mục này)', 0]] }
  ]; }
  var MUC_DGTC = [
    ['diem_manh', '1. Điểm mạnh nổi bật'],
    ['han_che_nguyen_nhan', '2. Điểm hạn chế trọng tâm và nguyên nhân cốt lõi'],
    ['xu_huong_3_nam', '3a. Xu hướng chất lượng trong 03 năm học liên tiếp'],
    ['van_de_uu_tien', '3b. Các vấn đề trọng tâm cần ưu tiên cải tiến']
  ];

  // ── Quyền ──
  function coQuyenCham() {
    var u = window.NGUOI_DUNG;
    return !!u && ['admin', 'ban_giam_hieu', 'to_truong'].indexOf(u.vai_tro) >= 0;
  }
  function laQT() {
    var u = window.NGUOI_DUNG;
    return !!u && ['admin', 'ban_giam_hieu'].indexOf(u.vai_tro) >= 0;
  }

  // ── Hàng đợi ghi: các lệnh nối đuôi nhau, lệnh lỗi không giết hàng ──
  var HANG_GHI = Promise.resolve();
  // Đếm lệnh đang xếp hàng/đang bay. Các chỗ "không đổi thì khỏi ghi" phải
  // hỏi nó: bộ đệm chỉ đổi khi máy chủ TRẢ VỀ, nên "gõ, blur, sửa lại như cũ,
  // blur trước khi phản hồi về" mà chỉ so bộ đệm là lệnh sửa bị nuốt — DB giữ
  // bản nhầm, màn hiện bản đúng, không báo gì. Đang có lệnh bay thì cứ ghi:
  // thừa một lệnh cùng giá trị vô hại, nuốt một lệnh sửa thì không.
  var DEM_CHO = 0;
  function dangGhiDo() { return DEM_CHO > 0; }
  function xepHang(viec) {
    DEM_CHO++;
    var giam = function () { DEM_CHO--; };
    var lui = HANG_GHI.then(viec, viec);
    HANG_GHI = lui.then(giam, giam);
    return lui;
  }

  // ── Ghi MỘT dòng, CHỈ những cột vừa đổi ──
  // Dòng đã có (biết id / khoá) → update đúng cột đó. Dòng chưa có → upsert
  // lần đầu chỉ với cột khoá + cột đổi (cột còn lại có default hoặc null).
  // Tuyệt đối KHÔNG gửi lại cả bản ghi lấy từ bản chụp lúc mở trang: hai
  // người cùng sửa thì người bấm sau đè bản chụp cũ lên bài của người trước,
  // mà cả hai đều thấy "✓ đã lưu".
  //   dieuKien: {id: 5} hoặc {nam_hoc: '…'} — null nếu dòng chưa có
  //   khoa    : các cột khoá để upsert lần đầu
  // Trả về dòng máy chủ trả lại (đã qua trigger), hoặc ném lỗi. Ném cả khi
  // máy chủ KHÔNG trả dòng nào: RLS chặn update thì không báo lỗi mà lặng lẽ
  // ghi 0 dòng — không bắt ca này thì lại hiện "✓ đã lưu" khi chưa ghi.
  function ghiMotDong(bang, dieuKien, khoa, thayDoi, onConflict) {
    var ban = {};
    Object.keys(thayDoi).forEach(function (k) { ban[k] = thayDoi[k]; });
    ban.cap_nhat_boi = window.NGUOI_DUNG ? window.NGUOI_DUNG.id : null;
    var lenh;
    if (dieuKien) {
      lenh = window.MAY_CHU.from(bang).update(ban).match(dieuKien);
    } else {
      Object.keys(khoa).forEach(function (k) { ban[k] = khoa[k]; });
      lenh = window.MAY_CHU.from(bang).upsert(ban, { onConflict: onConflict });
    }
    return lenh.select().maybeSingle().then(function (r) {
      if (r.error) throw r.error;
      if (!r.data) throw new Error('máy chủ không ghi dòng nào — thầy cô có thể không có quyền, ' +
        'hoặc dòng đã bị người khác xoá. Tải lại trang rồi thử lại.');
      return r.data;
    });
  }
  function baoKhongLuu(viec, e) {
    window.notify('Không lưu được ' + viec + ': ' + ((e && e.message) || e) +
      ' Nội dung vừa gõ vẫn còn trong ô — chưa được ghi.');
  }

  function nhayDaLuu(id) {
    var o = document.getElementById(id);
    if (!o) return;
    o.style.opacity = 1;
    setTimeout(function () { o.style.opacity = 0; }, 2200);
  }

  // ══════════════════ TẢI DỮ LIỆU ══════════════════
  window.khoiDongTCQG = function () {
    // Không ghi cứng năm học — xem chú thích cùng việc ở js/tcqg-hoidong.js.
    NAM = NAM || window.CAU_HINH.NAM_HOC || window.tinhNamHoc(window.CAU_HINH.MOC_DOI_NAM_HOC);
    taiTCQG();
  };

  function taiTCQG() {
    var may = window.MAY_CHU;
    // Ghim năm lúc GỬI. Đổi năm hai lần liền thì hai phản hồi về không theo
    // thứ tự gửi — phản hồi nào không còn khớp NAM thì bỏ, không vẽ.
    var namTai = NAM;
    Promise.all([
      may.from('tieu_chi').select('*').order('so_tt'),
      may.from('noi_ham').select('*').order('so_tt'),
      may.from('tu_danh_gia').select('*').eq('nam_hoc', namTai),
      may.from('tdg_noi_ham').select('*').eq('nam_hoc', namTai),
      may.from('danh_gia_tieu_chuan').select('*').eq('nam_hoc', namTai),
      may.from('bao_cao_tdg').select('*').eq('nam_hoc', namTai).maybeSingle()
    ]).then(function (kq) {
      if (namTai !== NAM) return;   // người dùng đã chọn năm khác trong lúc chờ
      var loi = kq.filter(function (r) { return r.error; })[0];
      if (loi) {
        TAI_HONG = true;
        $('#kd-list').innerHTML = '<div class="hs-loi hien" style="margin:0">Không tải được dữ liệu tự đánh giá: ' +
          thoat(loi.error.message) + '</div>';
        ['#kd-stats', '#kd-giai-thich', '#kd-chi-tiet', '#kd-danh-gia-chung', '#kd-bao-cao'].forEach(function (s) {
          var o = $(s); if (o) o.innerHTML = '';
        });
        return;
      }
      TAI_HONG = false;
      NAM_DL = namTai;
      var tdg = {};
      kq[2].data.forEach(function (r) { tdg[r.tieu_chi_ma] = r; });
      TC = kq[0].data.map(function (t) {
        var r = tdg[t.ma] || {};
        return {
          // id + nam gắn CHẶT vào dòng: lệnh ghi đọc từ đây, không đọc NAM.
          id: r.id || null, nam: namTai,
          ma: t.ma, ten: t.ten, tieuChuan: t.tieu_chuan, batBuoc: t.bat_buoc,
          m1: t.muc_1, m2: t.muc_2,
          // Cột của sql/41: tiêu chí có điều kiện khác nhau giữa các địa điểm
          // thì phải soi riêng từng nơi (CV 5555 PL II V.2.b). Trường chưa
          // chạy sql/41 thì cột chưa có → undefined → thẻ Địa điểm không hiện.
          theoDiaDiem: !!t.theo_dia_diem,
          self: r.muc_dat || 0, datM1: !!r.dat_m1, datM2: !!r.dat_m2,
          htM1: r.hien_trang_m1 || '', htM2: r.hien_trang_m2 || '',
          ghiChu: r.ghi_chu || '', capNhatLuc: r.cap_nhat_luc || null
        };
      });
      NOI_HAM = {}; NH_CUA = {};
      kq[1].data.forEach(function (n) {
        var k = n.tieu_chi_ma + '|' + n.muc;
        (NOI_HAM[k] = NOI_HAM[k] || []).push(n);
        NH_CUA[n.id] = { ma: n.tieu_chi_ma, muc: n.muc };
      });
      HT_NH = {};
      kq[3].data.forEach(function (r) { HT_NH[r.noi_ham_id] = r; });
      DGTC = {};
      kq[4].data.forEach(function (r) { DGTC[r.tieu_chuan] = r; });
      BC = kq[5].data || null;
      if (!TC_CHON && TC.length) TC_CHON = TC[0].ma;
      window.TCQG_SAN_SANG = true;

      // Lớp soi từng địa điểm (js/tcqg-co-so.js). Nạp SAU khi màn đã dựng
      // xong: hỏng hay thiếu sql/41 thì màn Trường chuẩn Quốc gia vẫn chạy
      // đầy đủ như cũ, chỉ không có thẻ Địa điểm. Hàm nap() không bao giờ
      // trả về lỗi — xem chú thích trong tệp đó.
      veManTCQG();
      if (window.TCQG_CO_SO) {
        window.TCQG_CO_SO.nap(namTai).then(function (duoc) {
          if (duoc && namTai === NAM) veManTCQG();
        });
      }
    });
  }

  // Cầu dữ liệu cho file xuất Word — ĐÚNG HỢP ĐỒNG của xuat-bao-cao-tdg.js
  // Bạch Liêu (chạy nguyên văn qua bach-lieu-shim.js)
  window.duLieuTuDanhGia = function () {
    var mcTheoTC = {};
    window.HO_SO.forEach(function (h) {
      var banGhi = (window.HS_BAN_GHI && window.HS_BAN_GHI[h.ma]) || {};
      (h.tc || []).forEach(function (ma) {
        (mcTheoTC[ma] = mcTheoTC[ma] || []).push({
          ma: h.ma, ten: h.ten, trang_thai: h.tt, link_drive: h.link || null,
          ghi_chu: banGhi.ghi_chu || null, nguoi_phu_trach: h.phuTrach || null,
          dinh_dang: banGhi.dinh_dang || null
        });
      });
    });
    Object.keys(mcTheoTC).forEach(function (k) {
      mcTheoTC[k].sort(function (a, b) { return a.ma.localeCompare(b.ma, 'vi'); });
    });
    return {
      namHoc: NAM_DL || NAM,   // năm của dữ liệu đang có, không phải năm vừa chọn
      tieuChi: TC.map(function (t) {
        return { code: t.ma, std: t.tieuChuan, bb: t.batBuoc, name: t.ten,
                 m1: t.m1, m2: t.m2, self: t.self, htM1: t.htM1, htM2: t.htM2 };
      }),
      noiHam: NOI_HAM, htNh: HT_NH, dgtc: DGTC, bc: BC, mcTheoTC: mcTheoTC,
      thieuNoiHam: !Object.keys(NOI_HAM).length
    };
  };

  // Bản toàn cục cho file Bạch Liêu (phanIII Biểu 1 gọi thẳng tên này)
  window.xepMucNhaTruong = function () { return xepMuc(); };

  // ══════════════════ XẾP MỨC TOÀN TRƯỜNG (khoản 3 Điều 5) ══════════════════
  function xepMuc() {
    var bb = TC.filter(function (t) { return t.batBuoc; });
    var cl = TC.filter(function (t) { return !t.batBuoc; });

    // 🔴 HAI CHỐT AN TOÀN — đặt TRƯỚC mọi phép so sánh.
    //
    // ① Chưa có bộ tiêu chí thì KHÔNG KẾT LUẬN GÌ.
    //    Nếu bảng tieu_chi bị đọc rỗng (RLS chặn, mạng lỗi, CSDL mới chưa gieo)
    //    thì bb.length = 0, và vế `bbM2 === bb.length` thành ĐÚNG VÔ ĐIỀU KIỆN
    //    — chỉ cần 5 tiêu chí bất kỳ đạt Mức 2 là máy kết luận "Đạt Mức 2".
    //    Sai theo hướng CÓ LỢI cho trường, in vào Biểu 1 nộp Sở. Loại sai nguy
    //    hiểm nhất, vì không ai đi soi lại một kết luận đẹp.
    if (!TC.length || !bb.length || TC.length < 15) {
      return {
        ketLuan: 'Chưa tính được',
        vi: 'Bộ tiêu chí đọc về chưa đủ (' + TC.length + '/15 tiêu chí, ' +
            bb.length + ' tiêu chí bắt buộc). Chưa đủ căn cứ để xếp mức — ' +
            'thầy cô tải lại trang; nếu vẫn vậy thì báo quản trị viên.',
        bbM1: 0, bbM2: 0, clM1: 0, clM2: 0, bbTong: bb.length
      };
    }
    // ② Chưa chấm tiêu chí nào thì là CHƯA ĐÁNH GIÁ, không phải KHÔNG ĐẠT.
    //    Trường mới mở màn này lần đầu từng thấy thẻ navy to nhất ghi
    //    "Không đạt Mức 1" — trong khi trường đang giữ Bằng Mức độ 2.
    if (!TC.some(function (t) { return t.self > 0; })) {
      return {
        ketLuan: 'Chưa đánh giá',
        vi: 'Nhà trường chưa chấm tiêu chí nào cho năm học này. Xếp mức chỉ có ' +
            'nghĩa sau khi đã tự đánh giá — đây KHÔNG phải kết luận "không đạt".',
        bbM1: 0, bbM2: 0, clM1: 0, clM2: 0, bbTong: bb.length
      };
    }

    var bbM1 = bb.filter(function (t) { return t.self >= 1; }).length;
    var bbM2 = bb.filter(function (t) { return t.self >= 2; }).length;
    var clM1 = cl.filter(function (t) { return t.self >= 1; }).length;
    var clM2 = cl.filter(function (t) { return t.self >= 2; }).length;
    var clM0 = cl.filter(function (t) { return t.self === 0; }).length;
    var ketLuan, vi;
    if (bbM2 === bb.length && clM2 >= 5 && clM0 === 0) {
      ketLuan = 'Đạt Mức 2';
      vi = 'Cả ' + bb.length + ' tiêu chí bắt buộc đạt Mức 2, ' + clM2 + '/' + cl.length +
        ' tiêu chí còn lại đạt Mức 2 và không tiêu chí nào dưới Mức 1.';
    } else if (bbM1 === bb.length && clM1 >= 5) {
      ketLuan = 'Đạt Mức 1';
      var thieuM2 = bb.filter(function (t) { return t.self < 2; }).map(function (t) { return t.ma; });
      vi = 'Đủ điều kiện Mức 1. Muốn lên Mức 2: ' +
        (thieuM2.length ? 'các tiêu chí bắt buộc ' + thieuM2.join(', ') + ' phải đạt Mức 2' : 'đã đủ tiêu chí bắt buộc Mức 2') +
        (clM2 < 5 ? '; mới có ' + clM2 + '/7 tiêu chí còn lại đạt Mức 2 (cần ≥ 5)' : '') +
        (clM0 > 0 ? '; còn ' + clM0 + ' tiêu chí chưa đạt Mức 1' : '') + '.';
    } else {
      ketLuan = 'Không đạt Mức 1';
      var thieuBB = bb.filter(function (t) { return t.self < 1; }).map(function (t) { return t.ma; });
      vi = (thieuBB.length ? 'Tiêu chí bắt buộc chưa đạt Mức 1: ' + thieuBB.join(', ') + '. ' : '') +
        (clM1 < 5 ? 'Mới có ' + clM1 + '/7 tiêu chí còn lại đạt Mức 1 (cần ≥ 5).' : '');
    }
    return { ketLuan: ketLuan, vi: vi, bbM1: bbM1, bbM2: bbM2, clM1: clM1, clM2: clM2, bbTong: bb.length };
  }

  // ══════════════════ VẼ TOÀN MÀN ══════════════════
  window.veManTCQG = veManTCQG;
  function veManTCQG() {
    if (TAI_HONG) return;
    veThanh();
    veStats();
    veList();
    veChiTiet();
    veDanhGiaChung();
    veBaoCao();
    if (laQT()) {
      $('#kd-nut-hd').style.display = '';
      $('#kd-nut-kh').style.display = '';
    }
    window.veHoiDongTCQG && window.veHoiDongTCQG(NAM_DL || NAM);
  }

  function veThanh() {
    var thanh = $('#kd-thanh');
    var namNay = parseInt((window.CAU_HINH.NAM_HOC ||
      window.tinhNamHoc(window.CAU_HINH.MOC_DOI_NAM_HOC)).split('-')[0], 10);
    var nams = [];
    for (var i = 1; i >= -3; i--) nams.push((namNay + i) + '-' + (namNay + i + 1));
    thanh.innerHTML =
      '<span class="nhan-nam">Năm học:</span>' +
      '<select id="kd-nam-hoc">' + nams.map(function (n) {
        return '<option value="' + n + '"' + (n === NAM ? ' selected' : '') + '>' + n + '</option>';
      }).join('') + '</select>' +
      '<select id="kd-std">' +
      '<option value="0">Tất cả 4 tiêu chuẩn</option>' +
      window.TIEU_CHUAN.map(function (t) {
        return '<option value="' + t.so + '"' + (STD === t.so ? ' selected' : '') + '>Tiêu chuẩn ' + t.so + ' — ' + thoat(t.ten) + '</option>';
      }).join('') + '</select>' +
      '<span class="sp"></span>' +
      '<button class="nut-vien" onclick="window.xuatMinhChungTheoTieuChuan?xuatMinhChungTheoTieuChuan():notify(\'Bản xuất danh mục minh chứng sẽ có ở bước sau.\')">📋 Danh mục minh chứng</button>' +
      '<button class="nut-xuat-bc" onclick="window.xuatBaoCaoTuDanhGia?xuatBaoCaoTuDanhGia():notify(\'Bản xuất báo cáo sẽ có ở bước sau.\')">📄 Xuất báo cáo tự đánh giá</button>';
    $('#kd-nam-hoc').addEventListener('change', function () { NAM = this.value; taiTCQG(); });
    $('#kd-std').addEventListener('change', function () { STD = +this.value; veList(); veDanhGiaChung(); });
  }

  function demNoiHamTat() {
    var tong = 0, viet = 0;
    Object.keys(NOI_HAM).forEach(function (k) {
      NOI_HAM[k].forEach(function (n) {
        tong++;
        var ht = HT_NH[n.id];
        if (ht && ht.hien_trang && ht.hien_trang.trim()) viet++;
      });
    });
    return { tong: tong, viet: viet };
  }

  function veStats() {
    var kq = xepMuc();
    var chuaM1 = TC.filter(function (t) { return t.self === 0; }).length;
    var daM2 = TC.filter(function (t) { return t.self >= 2; }).length;
    var nh = demNoiHamTat();
    var pt = nh.tong ? Math.round(nh.viet * 100 / nh.tong) : 0;
    $('#kd-stats').innerHTML =
      '<div class="the navy"><span class="ic">🏠</span><span class="noi">' +
      '<span class="so">' + kq.ketLuan + '</span><span class="nhan">Mức hiện tại</span>' +
      '<span class="them">' + (chuaM1 ? chuaM1 + ' tiêu chí chưa đạt Mức 1' : 'Không tiêu chí nào chưa đạt Mức 1') + '</span></span></div>' +
      '<div class="the xanh"><span class="ic">📌</span><span class="noi">' +
      '<span class="so">' + TC.length + '</span><span class="nhan">Tiêu chí</span>' +
      '<span class="them">' + daM2 + ' tiêu chí đã đạt Mức 2</span></span></div>' +
      '<div class="the vang"><span class="ic">⭐</span><span class="noi">' +
      '<span class="so">' + kq.bbTong + '</span><span class="nhan">Tiêu chí bắt buộc</span>' +
      '<span class="them">' + kq.bbM2 + '/' + kq.bbTong + ' đạt Mức 2</span></span></div>' +
      '<div class="the la" id="kd-the-tien-do">' + theTienDoHTML(nh, pt) + '</div>';
    // Băng cảnh báo chênh lệch giữa các địa điểm đặt NGAY TRÊN câu giải thích
    // xếp mức: mức của toàn trường chỉ có nghĩa khi không bỏ sót địa điểm nào
    // (CV 5555 PL II V.2.b). Trường một địa điểm hoặc chưa chạy sql/41 thì
    // canhBao() trả chuỗi rỗng, giao diện y như cũ.
    $('#kd-giai-thich').innerHTML =
      (window.TCQG_CO_SO ? window.TCQG_CO_SO.canhBao() : '') +
      '<b>Vì sao xếp mức này:</b> ' + thoat(kq.vi);
  }

  function theTienDoHTML(nh, pt) {
    if (!nh.tong) return '<span class="ic">⏱</span><span class="noi"><span class="so">—</span><span class="nhan">chưa đếm được nội hàm</span></span>';
    return '<span class="vong" style="background:conic-gradient(#0f7b52 ' + (pt * 3.6) + 'deg,#d7ebe0 0)"><i>' + pt + '%</i></span>' +
      '<span class="noi"><span class="so" style="font-size:15px">Tiến độ</span>' +
      '<span class="nhan">đã viết ' + nh.viet + '/' + nh.tong + ' nội hàm</span>' +
      '<span class="them">còn ' + (nh.tong - nh.viet) + ' ý chưa viết</span></span>';
  }

  function veTienDoNoiHam() {
    var nh = demNoiHamTat();
    var pt = nh.tong ? Math.round(nh.viet * 100 / nh.tong) : 0;
    var o = $('#kd-the-tien-do');
    if (o && nh.tong) o.innerHTML = theTienDoHTML(nh, pt);
  }

  // ══════════════════ CỘT TRÁI: DANH SÁCH TIÊU CHÍ ══════════════════
  function dsDangLoc() {
    return TC.filter(function (t) {
      if (STD && t.tieuChuan !== STD) return false;
      if (LOC === 'bb') return t.batBuoc;
      if (LOC === 'chuaM2') return t.self < 2;
      if (LOC === 'daM2') return t.self >= 2;
      return true;
    });
  }

  function demNH(ma) {
    var tong = 0, viet = 0;
    [1, 2].forEach(function (m) {
      (NOI_HAM[ma + '|' + m] || []).forEach(function (n) {
        tong++;
        var ht = HT_NH[n.id];
        if (ht && ht.hien_trang && ht.hien_trang.trim()) viet++;
      });
    });
    return { tong: tong, viet: viet };
  }

  function huyHieu(self) {
    if (self >= 2) return '<span class="badge-m badge-m2">✓ Đạt Mức 2</span>';
    if (self >= 1) return '<span class="badge-m badge-m1">⊙ Đạt Mức 1</span>';
    return '<span class="badge-m badge-no">○ Chưa đạt Mức 1</span>';
  }

  function veList() {
    $('#kd-so-tc').textContent = STD ? '(Tiêu chuẩn ' + STD + ')' : '(4 tiêu chuẩn)';
    var demTat = TC.filter(function (t) { return !STD || t.tieuChuan === STD; });
    var loc = [
      ['all', 'Tất cả', demTat.length],
      ['bb', 'Bắt buộc', demTat.filter(function (t) { return t.batBuoc; }).length],
      ['chuaM2', 'Chưa đạt M2', demTat.filter(function (t) { return t.self < 2; }).length],
      ['daM2', 'Đã đạt M2', demTat.filter(function (t) { return t.self >= 2; }).length]
    ];
    $('#kd-loc').innerHTML = loc.map(function (l) {
      return '<button class="chip-loc' + (LOC === l[0] ? ' on' : '') + '" data-loc="' + l[0] + '">' + l[1] + ' <b>' + l[2] + '</b></button>';
    }).join('');
    Array.prototype.slice.call($('#kd-loc').querySelectorAll('button')).forEach(function (b) {
      b.addEventListener('click', function () { LOC = b.getAttribute('data-loc'); veList(); });
    });

    var ds = dsDangLoc();
    $('#kd-list').innerHTML = ds.length ? ds.map(function (t) {
      var nh = demNH(t.ma);
      return '<div class="tc-hang' + (t.ma === TC_CHON ? ' chon' : '') + '" data-ma="' + t.ma + '">' +
        '<span class="tc-ma">' + t.ma + '</span>' +
        '<span class="tc-ten">' + thoat(t.ten) + (t.batBuoc ? ' <span class="tc-bb">BẮT BUỘC</span>' : '') + '</span>' +
        (nh.tong ? '<span class="crit-nh' + (nh.viet >= nh.tong ? ' xong' : '') + '" data-nh="' + t.ma + '">' + nh.viet + '/' + nh.tong + ' ý</span>' : '') +
        huyHieu(t.self) + '</div>';
    }).join('') : '<div class="the-thong-bao">Không có tiêu chí nào khớp bộ lọc.</div>';
    Array.prototype.slice.call($('#kd-list').querySelectorAll('.tc-hang')).forEach(function (h) {
      h.addEventListener('click', function () {
        TC_CHON = h.getAttribute('data-ma');
        TAB_CT = 'nd';
        veList(); veChiTiet();
        if (window.innerWidth < 1000) $('#kd-chi-tiet').scrollIntoView({ behavior: 'smooth' });
      });
    });
  }

  // ══════════════════ CỘT PHẢI: CHI TIẾT TIÊU CHÍ ══════════════════
  function tcHienTai() {
    return TC.filter(function (t) { return t.ma === TC_CHON; })[0] || TC[0];
  }

  function veChiTiet() {
    var c = tcHienTai();
    if (!c) { $('#kd-chi-tiet').innerHTML = ''; return; }
    // Thẻ Địa điểm chỉ có với tiêu chí đã đánh dấu theo_dia_diem VÀ trường
    // thực sự có từ hai địa điểm trở lên.
    var coDD = !!(c.theoDiaDiem && window.TCQG_CO_SO && window.TCQG_CO_SO.dung());
    if (TAB_CT === 'dd' && !coDD) TAB_CT = 'nd';   // đổi sang tiêu chí không soi địa điểm
    var than = TAB_CT === 'mc' ? oMinhChung(c)
      : TAB_CT === 'kl' ? oKetLuan(c)
      : TAB_CT === 'dd' ? window.TCQG_CO_SO.ve(c)
      : oNoiDung(c);
    var ds = dsDangLoc();
    var viTri = ds.map(function (t) { return t.ma; }).indexOf(c.ma);
    var keTiep = viTri >= 0 && viTri < ds.length - 1 ? ds[viTri + 1].ma : null;
    var nh = demNH(c.ma);

    $('#kd-chi-tiet').innerHTML =
      '<div class="ct-dau"><span class="tc-ma">' + c.ma + '</span><b>' + thoat(c.ten) + '</b>' +
      (c.batBuoc ? '<span class="tc-bb">BẮT BUỘC</span>' : '') + '</div>' +
      '<div class="ct-tab">' +
      ['nd|Nội dung', 'mc|Minh chứng']
        .concat(coDD ? ['dd|📍 Địa điểm'] : [])
        .concat(['kl|Kết luận & Ghi chú']).map(function (x) {
        var p = x.split('|');
        return '<button class="' + (TAB_CT === p[0] ? 'on' : '') + '" data-tab="' + p[0] + '">' + p[1] + '</button>';
      }).join('') + '<span class="sp"></span>' + huyHieu(c.self) + '</div>' +
      '<div class="ct-than">' + than + '</div>' +
      '<div class="ct-day">' +
      '<button class="ct-nut" data-tab-di="kl">📝 Ghi chú</button>' +
      (nh.tong
        ? (nh.viet >= nh.tong
          ? '<span class="ct-nut xong">✓ Đã viết đủ nội dung</span>'
          : '<span class="ct-nut cho">Còn ' + (nh.tong - nh.viet) + ' ý chưa viết</span>')
        : '<span class="ct-nut cho">Chưa có danh mục nội hàm</span>') +
      (keTiep
        ? '<button class="ct-nut chinh" data-di-tc="' + keTiep + '">Tiếp theo: ' + keTiep + ' →</button>'
        : '<button class="ct-nut" disabled>Đã là tiêu chí cuối</button>') +
      '</div>';

    Array.prototype.slice.call($('#kd-chi-tiet').querySelectorAll('[data-tab]')).forEach(function (b) {
      b.addEventListener('click', function () { TAB_CT = b.getAttribute('data-tab'); veChiTiet(); });
    });
    // Nút và ô nhập của thẻ Địa điểm do js/tcqg-co-so.js tự nối — khối này
    // được dựng lại mỗi lần vẽ nên phải nối lại, không giữ được xử lý cũ.
    if (TAB_CT === 'dd' && window.TCQG_CO_SO) {
      window.TCQG_CO_SO.noiSuKien($('#kd-chi-tiet'), veChiTiet);
    }
    var nutKl = $('#kd-chi-tiet').querySelector('[data-tab-di]');
    if (nutKl) nutKl.addEventListener('click', function () { TAB_CT = 'kl'; veChiTiet(); });
    var nutDi = $('#kd-chi-tiet').querySelector('[data-di-tc]');
    if (nutDi) nutDi.addEventListener('click', function () {
      TC_CHON = nutDi.getAttribute('data-di-tc');
      TAB_CT = 'nd'; DANG_SUA = false;
      $('#kd-lam').classList.remove('rong');
      veList(); veChiTiet();
    });
  }

  // ── Tab Nội dung: khối Mức 1 + Mức 2 ──
  function oNoiDung(c) {
    return khoiMuc(c, 1) + khoiMuc(c, 2) + dongMinhChungGon(c);
  }

  function khoiMuc(c, muc) {
    var dat = muc === 1 ? c.datM1 : c.datM2;
    var daCham = muc === 1 ? (c.self >= 1 || c.datM1 === false && c.capNhatLuc) : null;
    var khoa = muc === 2 && !c.datM1;
    var html = '<div class="yc"><div class="yc-nhan">📌 Yêu cầu tiêu chí (Thông tư 57) — Mức ' + muc + '</div>' +
      '<p>' + thoat(muc === 1 ? c.m1 : c.m2) + '</p>';
    if (khoa) {
      html += '<div class="lv-pick khoa">Chỉ xem xét Mức 2 khi Mức 1 đã được xác định đạt (Biểu 1, Phụ lục V).</div></div>';
      return html;
    }
    if (coQuyenCham()) {
      html += '<div class="lv-pick">Nhà trường tự đánh giá Mức ' + muc + ':' +
        '<button class="pick dat' + (dat ? ' on' : '') + '" onclick="tcqgSetMuc(\'' + c.ma + '\',' + muc + ',true)">Đạt</button>' +
        '<button class="pick khong' + (c.capNhatLuc && !dat ? ' on' : '') + '" onclick="tcqgSetMuc(\'' + c.ma + '\',' + muc + ',false)">Không đạt</button></div>';
    } else {
      html += '<div class="lv-pick">Nhà trường tự đánh giá Mức ' + muc + ': <b class="' + (dat ? 'chu-dat' : 'chu-khong') + '">' +
        (c.capNhatLuc ? (dat ? 'Đạt' : 'Không đạt') : 'chưa chấm') + '</b></div>';
    }
    html += '</div>';

    // Thực trạng của mức
    var dsNH = NOI_HAM[c.ma + '|' + muc] || [];
    var viet = dsNH.filter(function (n) { var h = HT_NH[n.id]; return h && h.hien_trang && h.hien_trang.trim(); }).length;
    html += '<div class="tt-box"><div class="tt-dau"><b>Thực trạng &amp; kết quả thực hiện — Mức ' + muc + '</b>' +
      (dsNH.length ? '<span class="dem-nh" data-dem="' + c.ma + '|' + muc + '">đã viết ' + viet + '/' + dsNH.length + ' nội hàm</span>' : '') +
      (coQuyenCham() && !DANG_SUA ? '<button class="ct-quaylai" onclick="tcqgSua(true)">✏ Chỉnh sửa</button>' : '') +
      '</div>';
    if (DANG_SUA && coQuyenCham()) {
      html += dsNH.length ? oHienTrang(c, muc, dsNH) : oHienTrangVanXuoi(c, muc);
    } else {
      if (dsNH.length) {
        var dong = dsNH.map(function (n) {
          var h = HT_NH[n.id];
          if (h && h.hien_trang && h.hien_trang.trim()) {
            var chu = h.hien_trang.trim();
            return '<div class="ct-tomtat co">✓ ' + thoat(chu.length > 160 ? chu.slice(0, 160) + '…' : chu) + '</div>';
          }
          return '';
        }).join('');
        html += dong || '<div class="ct-tomtat">Chưa nhập nội dung nào cho mức này.</div>';
      } else {
        var vx = muc === 1 ? c.htM1 : c.htM2;
        html += vx ? '<div class="ct-tomtat co">' + thoat(vx.length > 300 ? vx.slice(0, 300) + '…' : vx) + '</div>'
          : '<div class="ct-tomtat">Chưa nhập nội dung nào cho mức này.</div>';
      }
    }
    html += '</div>';
    return html;
  }

  // Nhập theo nội hàm — mỗi yêu cầu một thẻ, tự lưu onblur, chip minh chứng
  function oHienTrang(c, muc, dsNH) {
    var mcTC = window.HO_SO.filter(function (h) { return (h.tc || []).indexOf(c.ma) >= 0; });
    return dsNH.map(function (n, i) {
      var h = HT_NH[n.id] || {};
      var daGan = h.ma_minh_chung || [];
      var xong = h.hien_trang && h.hien_trang.trim();
      return '<div class="nh-o' + (xong ? ' xong' : '') + '" data-nh-o="' + n.id + '">' +
        '<div class="nh-so">Nội hàm ' + (i + 1) + '/' + dsNH.length +
        '<span class="tdg-luu" id="luu-nh-' + n.id + '">✓ đã lưu</span></div>' +
        '<div class="nh-vb">' + thoat(n.noi_dung) + '</div>' +
        '<textarea placeholder="Nhà trường đã làm gì cho đúng yêu cầu này? Ghi số liệu cụ thể."' +
        ' onblur="tcqgLuuNoiHam(' + n.id + ', this.value)">' + thoat(h.hien_trang || '') + '</textarea>' +
        (mcTC.length
          ? '<div class="nh-mcs">Minh chứng cho ý này: ' + mcTC.map(function (mc) {
              return '<button class="nh-mc' + (daGan.indexOf(mc.ma) >= 0 ? ' on' : '') + '"' +
                ' title="' + thoat(mc.ten) + '" onclick="tcqgBatMC(' + n.id + ',\'' + mc.ma + '\',this)">' + mc.ma + '</button>';
            }).join('') + '</div>'
          : '<div class="nh-mcs">Kho hồ sơ chưa có minh chứng nào gắn tiêu chí ' + c.ma + ' — gắn ở màn Quản trị Hồ sơ.</div>') +
        '</div>';
    }).join('') +
    '<div style="margin-top:10px"><button class="nut-vien nho" onclick="tcqgSua(false)">✔ Xong — thu gọn</button></div>';
  }

  function oHienTrangVanXuoi(c, muc) {
    var vx = muc === 1 ? c.htM1 : c.htM2;
    return '<div class="nh-o"><div class="nh-so">Mô tả hiện trạng Mức ' + muc +
      '<span class="tdg-luu" id="luu-vx-' + c.ma + '-' + muc + '">✓ đã lưu</span></div>' +
      '<textarea style="min-height:120px" placeholder="Mô tả hiện trạng, viện dẫn mã minh chứng trong ngoặc tròn — ví dụ: … (MC.1.1.01, MC.1.1.02)."' +
      ' onblur="tcqgLuuVanXuoi(\'' + c.ma + '\',' + muc + ', this.value)">' + thoat(vx || '') + '</textarea></div>' +
      '<div style="margin-top:10px"><button class="nut-vien nho" onclick="tcqgSua(false)">✔ Xong — thu gọn</button></div>';
  }

  function dongMinhChungGon(c) {
    var mc = window.HO_SO.filter(function (h) { return (h.tc || []).indexOf(c.ma) >= 0; });
    var co = mc.filter(function (h) { return h.tt === 'co'; }).length;
    return '<div class="mc-dong">📎 Minh chứng: <b>' + co + '/' + mc.length + '</b> đã có trong kho' +
      (mc.length - co ? ' · <b style="color:var(--thieu)">' + (mc.length - co) + ' chưa có</b>' : '') +
      ' <button class="nut-vien nho" data-sang-mc>Xem tab Minh chứng →</button></div>';
  }

  // ── Tab Minh chứng ──
  function oMinhChung(c) {
    var mc = window.HO_SO.filter(function (h) { return (h.tc || []).indexOf(c.ma) >= 0; });
    if (!mc.length) return '<div class="the-thong-bao">Kho hồ sơ chưa có minh chứng nào gắn với tiêu chí ' + c.ma +
      '. Vào <b>Quản trị Hồ sơ</b> → sửa hồ sơ → thêm mã tiêu chí này.</div>';
    var dem = { co: 0, dang: 0, chua: 0 };
    mc.forEach(function (h) { dem[h.tt] = (dem[h.tt] || 0) + 1; });
    return '<div class="mc-dem"><span class="st st-co">✓ ' + dem.co + ' đã có</span>' +
      '<span class="st st-dang">◐ ' + (dem.dang || 0) + ' đang làm</span>' +
      '<span class="st st-chua">○ ' + (dem.chua || 0) + ' chưa có</span></div>' +
      '<div class="ev-list" style="margin-top:12px">' + mc.map(function (h) {
        var chip = '<span class="ev' + (h.tt !== 'co' ? ' thieu' : '') + '" title="Phụ trách: ' + thoat(h.phuTrach || '—') + '">📄 ' +
          thoat(h.ma + ' · ' + h.ten) + '</span>';
        return h.link ? '<a href="' + thoat(h.link) + '" target="_blank" rel="noopener" style="text-decoration:none">' + chip + '</a>' : chip;
      }).join('') + '</div>' +
      (dem.chua ? '<div class="hs-loi hien" style="margin:12px 0 0">Còn ' + dem.chua +
        ' minh chứng chưa có trong kho — việc chấm mức cần dựa trên minh chứng có thật.</div>' : '') +
      '<div style="margin-top:12px"><button class="nut-vien" onclick="window.xuatMinhChungTieuChi?xuatMinhChungTieuChi(\'' + c.ma + '\'):notify(\'Bản xuất sẽ có ở bước sau.\')">📄 Tải danh mục minh chứng của tiêu chí này (Word)</button></div>';
  }

  // ── Tab Kết luận & Ghi chú ──
  function gioVN(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    return d.toLocaleDateString('vi-VN') + ' lúc ' + d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  }
  function oKetLuan(c) {
    var lop = c.self >= 2 ? 'm2' : c.self >= 1 ? 'm1' : 'no';
    return '<div class="ct-kl-muc ' + lop + '">Nhà trường tự đánh giá: <b>' +
      (c.self >= 2 ? 'Đạt Mức 2' : c.self >= 1 ? 'Đạt Mức 1' : 'Chưa đạt Mức 1') + '</b>' +
      (c.capNhatLuc ? '<small>Lần chấm gần nhất: ' + gioVN(c.capNhatLuc) + '</small>' : '<small>Chưa chấm lần nào.</small>') + '</div>' +
      '<div class="nh-o" style="margin-top:12px"><div class="nh-so">Ghi chú làm việc của Hội đồng (không in vào báo cáo)' +
      '<span class="tdg-luu" id="luu-gc-' + c.ma + '">✓ đã lưu</span></div>' +
      '<textarea ' + (coQuyenCham() ? '' : 'disabled ') +
      'placeholder="Ví dụ: chờ bổ sung biên bản họp tháng 9; hỏi lại kế toán số liệu CSVC…"' +
      ' onblur="tcqgLuuGhiChu(\'' + c.ma + '\', this.value)">' + thoat(c.ghiChu || '') + '</textarea></div>' +
      '<div class="lv" style="margin-top:12px"><p style="font-size:13px">Điểm mạnh, hạn chế và định hướng viết MỘT LẦN cho cả ' +
      'tiêu chuẩn ở khối "Đánh giá chung" cuối trang; kế hoạch cải tiến lập ở Biểu 2 — TT57 không có ô điểm mạnh/điểm yếu ' +
      'riêng từng tiêu chí như bảng mẫu cũ.</p></div>';
  }

  // ══════════════════ LƯU ══════════════════
  // CHỈ gửi những cột thật sự đổi. Trước đây hàm này dựng lại CẢ bản ghi từ
  // bản chụp TC nạp lúc mở trang, nên hai người cùng chấm một tiêu chí thì
  // người bấm sau ghi đè bản chụp cũ lên bài của người bấm trước (mất trắng
  // hiện trạng + tụt muc_dat). Hội đồng 7 người ngồi chấm cùng buổi là gặp.
  // Lấy dòng TC ngay lúc BẤM (ngoài hàng đợi): năm học ghi vào là c.nam — năm
  // của dữ liệu đang bày trên màn — chứ không phải NAM lúc lệnh tới lượt chạy.
  function luuTDG(ma, thayDoi, sauKhi) {
    var c = TC.filter(function (t) { return t.ma === ma; })[0];
    if (!c) return;
    xepHang(function () {
      return ghiMotDong('tu_danh_gia',
        c.id ? { id: c.id } : null,
        { nam_hoc: c.nam, tieu_chi_ma: ma },
        thayDoi, 'nam_hoc,tieu_chi_ma'
      ).then(function (d) {
        // Cập nhật bộ đệm bằng dòng máy chủ trả về (muc_dat do trigger tính),
        // không dùng bản chụp cũ.
        c.id = d.id;
        c.datM1 = !!d.dat_m1; c.datM2 = !!d.dat_m2;
        c.self = d.muc_dat || 0;
        c.htM1 = d.hien_trang_m1 || ''; c.htM2 = d.hien_trang_m2 || '';
        c.ghiChu = d.ghi_chu || ''; c.capNhatLuc = d.cap_nhat_luc;
        if (sauKhi) sauKhi();
      }, function (e) { baoKhongLuu('tiêu chí ' + ma, e); });
    });
  }

  window.tcqgSetMuc = function (ma, muc, dat) {
    if (!coQuyenCham()) { window.notify('Thầy cô không có quyền chấm mức.'); return; }
    var thayDoi;
    // Bấm "đạt Mức 1" thì KHÔNG đụng tới dat_m2: trước đây câu này gửi kèm
    // dat_m2 = (c.self >= 2) lấy từ bản chụp cũ, nên nếu người khác vừa chấm
    // đạt Mức 2 xong thì thao tác này hạ ngược Mức 2 xuống.
    // Bỏ Mức 1 thì buộc phải bỏ luôn Mức 2 — ràng buộc tdg_muc_tuan_tu.
    if (muc === 1) thayDoi = dat ? { dat_m1: true } : { dat_m1: false, dat_m2: false };
    else thayDoi = { dat_m1: true, dat_m2: dat };
    luuTDG(ma, thayDoi, function () {
      veStats(); veList(); veChiTiet();
      window.notify('Đã lưu tiêu chí ' + ma + ' — người chấm và thời điểm đã ghi vào sổ nhật ký.');
    });
  };

  window.tcqgLuuVanXuoi = function (ma, muc, chu) {
    var c = TC.filter(function (t) { return t.ma === ma; })[0];
    var cu = muc === 1 ? c.htM1 : c.htM2;
    if (!dangGhiDo() && (chu || '').trim() === (cu || '').trim()) return;
    var thayDoi = {};
    thayDoi[muc === 1 ? 'hien_trang_m1' : 'hien_trang_m2'] = chu.trim() || null;
    luuTDG(ma, thayDoi, function () { nhayDaLuu('luu-vx-' + ma + '-' + muc); });
  };

  window.tcqgLuuGhiChu = function (ma, chu) {
    var c = TC.filter(function (t) { return t.ma === ma; })[0];
    if (!dangGhiDo() && (chu || '').trim() === (c.ghiChu || '').trim()) return;
    luuTDG(ma, { ghi_chu: chu.trim() || null }, function () { nhayDaLuu('luu-gc-' + ma); });
  };

  // Trước đây gửi kèm hien_trang + ma_minh_chung lấy từ HT_NH (bản chụp):
  // người A đang gõ hiện trạng, người B bấm chip minh chứng → lệnh của B mang
  // hien_trang cũ đè lên đoạn A vừa lưu. Nay chỉ gửi đúng cột đổi.
  function luuNH(id, thayDoi, sauKhi) {
    var nam = NAM_DL;   // ghim lúc bấm — năm của dữ liệu đang bày
    // Ghim `cu` ngay lúc gọi, KHÔNG đọc trong hàng đợi: hàng đợi bận mà người
    // dùng đổi năm thì HT_NH đã bị taiTCQG thay bằng năm khác — cu.id lúc đó
    // là dòng năm B, nhánh update theo id đè nội dung năm A lên dòng năm B.
    // Ghim sớm thì hai lệnh liên tiếp cùng nội hàm chỉ thành hai upsert,
    // onConflict vẫn gộp đúng. (luuTDG đã né đúng bẫy này bằng cách ghim `c`.)
    var cu = HT_NH[id];
    xepHang(function () {
      return ghiMotDong('tdg_noi_ham',
        cu && cu.id ? { id: cu.id } : null,
        { nam_hoc: nam, noi_ham_id: id },
        thayDoi, 'nam_hoc,noi_ham_id'
      ).then(function (d) {
        // Chỉ ghi ngược bộ đệm khi màn vẫn đang bày đúng năm ấy — phản hồi
        // năm A về sau khi đã chuyển sang năm B mà gán vào là ô nhiễm chéo năm.
        if (nam === NAM_DL) HT_NH[id] = d;
        if (sauKhi) sauKhi();
      }, function (e) { baoKhongLuu('nội hàm', e); });
    });
  }

  window.tcqgLuuNoiHam = function (id, chu) {
    var cu = (HT_NH[id] && HT_NH[id].hien_trang) || '';
    if (!dangGhiDo() && (chu || '').trim() === cu.trim()) return;
    luuNH(id, { hien_trang: chu.trim() || null }, function () {
      nhayDaLuu('luu-nh-' + id);
      var o = document.querySelector('[data-nh-o="' + id + '"]');
      if (o) o.classList.toggle('xong', !!chu.trim());
      demLaiNoiHam(NH_CUA[id]);
    });
  };

  window.tcqgBatMC = function (id, ma, nut) {
    var ds = ((HT_NH[id] && HT_NH[id].ma_minh_chung) || []).slice();
    var i = ds.indexOf(ma);
    if (i >= 0) ds.splice(i, 1); else ds.push(ma);
    luuNH(id, { ma_minh_chung: ds }, function () {
      nut.classList.toggle('on', ds.indexOf(ma) >= 0); // chỉ đổi đúng chip — không vẽ lại khối
    });
  };

  // Vá tại chỗ 3 chỗ đếm — không re-render khi đang gõ ô khác
  function demLaiNoiHam(cua) {
    if (!cua) return;
    var dsNH = NOI_HAM[cua.ma + '|' + cua.muc] || [];
    var viet = dsNH.filter(function (n) { var h = HT_NH[n.id]; return h && h.hien_trang && h.hien_trang.trim(); }).length;
    var oDem = document.querySelector('[data-dem="' + cua.ma + '|' + cua.muc + '"]');
    if (oDem) oDem.textContent = 'đã viết ' + viet + '/' + dsNH.length + ' nội hàm';
    var tt = demNH(cua.ma);
    var oHuy = document.querySelector('[data-nh="' + cua.ma + '"]');
    if (oHuy) {
      oHuy.textContent = tt.viet + '/' + tt.tong + ' ý';
      oHuy.classList.toggle('xong', tt.viet >= tt.tong);
    }
    veTienDoNoiHam();
  }

  window.tcqgSua = function (bat) {
    DANG_SUA = !!bat;
    $('#kd-lam').classList.toggle('rong', DANG_SUA);
    veChiTiet();
    if (!DANG_SUA) { veList(); veStats(); }
  };

  // ══════════════════ ĐÁNH GIÁ CHUNG CẤP TIÊU CHUẨN ══════════════════
  function veDanhGiaChung() {
    var goc = $('#kd-danh-gia-chung');
    if (!STD) {
      goc.innerHTML = '<div class="lv" style="margin-top:16px"><p style="font-size:13px">📌 Biểu 1 của TT57 đặt ' +
        '"Đánh giá chung" (điểm mạnh, hạn chế, xu hướng 3 năm, vấn đề ưu tiên) ở CẤP TIÊU CHUẨN. ' +
        'Chọn một Tiêu chuẩn ở ô lọc phía trên để nhập.</p></div>';
      return;
    }
    var r = DGTC[STD] || {};
    var suaDuoc = coQuyenCham();
    goc.innerHTML = '<div class="sub open" style="margin-top:16px"><div class="sub-head"><span class="fo">🧭</span>' +
      '<b>Đánh giá chung — Tiêu chuẩn ' + STD + '</b><span class="tdg-luu" id="luu-dgtc">✓ đã lưu</span></div>' +
      '<div class="sub-body" style="display:block;padding:14px 16px">' +
      MUC_DGTC.map(function (m) {
        return '<div class="hs-o"><label>' + m[1] + '</label>' +
          '<textarea ' + (suaDuoc ? '' : 'disabled ') + 'onblur="tcqgLuuDGTC(\'' + m[0] + '\', this.value)">' +
          thoat(r[m[0]] || '') + '</textarea></div>';
      }).join('') + '</div></div>';
  }

  window.tcqgLuuDGTC = function (cot, chu) {
    var r = DGTC[STD] || {};
    if (!dangGhiDo() && (chu || '').trim() === (r[cot] || '').trim()) return;
    var std = STD, nam = NAM_DL;
    var thayDoi = {};
    thayDoi[cot] = chu.trim() || null;
    // Bảng này KHÔNG có trigger chấm giờ (sql/05) nên gửi cap_nhat_luc từ đây.
    thayDoi.cap_nhat_luc = new Date().toISOString();
    xepHang(function () {
      // Bốn ô văn xuôi của một tiêu chuẩn là bốn cột cùng dòng — chỉ ghi cột
      // vừa rời khỏi, ba cột kia có thể đang do người khác gõ.
      return ghiMotDong('danh_gia_tieu_chuan',
        r.id ? { id: r.id } : null,
        { nam_hoc: nam, tieu_chuan: std },
        thayDoi, 'nam_hoc,tieu_chuan'
      ).then(function (d) {
        // Chắn chéo năm như luuNH: phản hồi của năm cũ không được gán vào
        // bộ đệm đang bày năm khác.
        if (nam === NAM_DL) DGTC[std] = d;
        nhayDaLuu('luu-dgtc');
      }, function (e) { baoKhongLuu('đánh giá chung', e); });
    });
  };

  // ══════════════════ CÁC MỤC VĂN XUÔI CỦA BÁO CÁO (Biểu 1 Phần I, III) ══════════════════
  function veBaoCao() {
    var goc = $('#kd-bao-cao');
    if (!laQT()) { goc.innerHTML = ''; return; }
    var bc = BC || {};
    goc.innerHTML = '<div class="sub" style="margin-top:14px"><div class="sub-head" role="button" ' +
      'onclick="this.parentNode.classList.toggle(\'open\')"><span class="fo">🖋</span>' +
      '<b>Các mục viết bằng lời của Báo cáo tự đánh giá (Phần I và Phần III)</b>' +
      '<span class="tdg-luu" id="luu-bc">✓ đã lưu</span><span class="sub-arrow">▶</span></div>' +
      '<div class="sub-body" style="padding:14px 16px">' +
      cotBC().map(function (nh) {
        return '<div class="nhan-nho" style="margin:12px 0 8px">' + nh.nhom + '</div>' +
          nh.muc.map(function (m) {
            return '<div class="hs-o"><label>' + m[1] + '</label>' +
              (m[2]
                ? '<input onblur="tcqgLuuBC(\'' + m[0] + '\', this.value)" value="' + thoat(bc[m[0]] || '') + '">'
                : '<textarea onblur="tcqgLuuBC(\'' + m[0] + '\', this.value)">' + thoat(bc[m[0]] || '') + '</textarea>') +
              '</div>';
          }).join('');
      }).join('') +
      '<div class="lv"><p style="font-size:12.5px">Ô chưa nhập sẽ in "(nhà trường bổ sung)" trong bản Word — phần mềm không viết hộ nội dung nào.</p></div>' +
      '</div></div>';
  }

  window.tcqgLuuBC = function (cot, chu) {
    var cu = (BC && BC[cot]) || '';
    if (!dangGhiDo() && (chu || '').trim() === cu.trim()) return;
    var nam = NAM_DL;
    var thayDoi = {};
    thayDoi[cot] = chu.trim() || null;
    xepHang(function () {
      // bao_cao_tdg khoá chính là nam_hoc, không có id → dòng đã có thì
      // update theo nam_hoc. 13 ô văn xuôi cùng một dòng, chỉ ghi ô vừa rời.
      // Trước đây sao chép nguyên BC (bản chụp) rồi upsert cả 13 cột.
      return ghiMotDong('bao_cao_tdg',
        BC && BC.nam_hoc === nam ? { nam_hoc: nam } : null,
        { nam_hoc: nam },
        thayDoi, 'nam_hoc'
      ).then(function (d) {
        // Chắn chéo năm (L4): năm ghi vào máy chủ vẫn đúng vì `nam` ghim lúc
        // blur, nhưng gán dòng năm A đè bộ đệm đang bày năm B là lần blur kế
        // so nhầm giá trị.
        if (nam === NAM_DL) BC = d;
        nhayDaLuu('luu-bc');
      }, function (e) { baoKhongLuu('mục báo cáo', e); });
    });
  };

  // Nút "Xem tab Minh chứng" trong dòng gọn (ủy nhiệm vì vẽ lại nhiều lần)
  document.addEventListener('click', function (e) {
    if (e.target.closest('[data-sang-mc]')) { TAB_CT = 'mc'; veChiTiet(); }
  });
})();
