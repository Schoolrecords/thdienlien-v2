// ============================================================
// cong-khai-bctn.js — BÁO CÁO THƯỜNG NIÊN (Phụ lục I Thông tư 09/2024/TT-BGDĐT) ra Word
// Sổ dự án mục 121.3. Dựng từ CHÍNH nội dung công khai (bảng cong_khai, sql/80):
//   I   Thông tin chung            ← mục thong_tin (Điều 4)
//   II  Đội ngũ                    ← mục doi_ngu   (Điều 8 khoản 1) — đối sánh năm trước
//   III Cơ sở vật chất             ← mục csvc      (Điều 8 khoản 2) — đối sánh năm trước
//   IV  Kiểm định chất lượng       ← mục kiem_dinh (Điều 8 khoản 3)
//   V   Kết quả hoạt động giáo dục ← mục ke_hoach + ket_qua (Điều 9) — đối sánh năm trước
//   VI  Kết quả tài chính          ← mục tai_chinh (Điều 5)
//   VII Nhiệm vụ trọng tâm khác    ← mục bao_cao, ô nhiem_vu_khac
// Phụ lục I chú thích 1: mẫu chỉ quy định thông tin BẮT BUỘC; tiêu đề, thứ tự, hình thức
// do cơ sở giáo dục quyết định. Báo cáo tính đến 31/12 → năm Y lấy năm học "Y-(Y+1)".
// Thể thức đầu trang + khối ký dùng window.WORD_TIEN_ICH (js/xuat-word.js, NĐ 30).
// window.xuatBaoCaoThuongNien(namHoc, dongNam, dongTruoc)
//   dongNam / dongTruoc: { muc: noi_dung } của năm học báo cáo / năm học liền trước.
// ============================================================
(function () {
  'use strict';

  function W() { return window.WORD_TIEN_ICH; }
  function c(s) { return W().chan(s == null ? '' : s); }
  function so(n) {
    if (n === '' || n == null) return '';
    var x = Number(n);
    return isFinite(x) ? x.toLocaleString('vi-VN', { maximumFractionDigits: 2 }) : c(n);
  }
  function soN(n) { var x = Number(n); return isFinite(x) ? x : 0; }
  function tl(dat, tong) { return soN(tong) ? Math.round(soN(dat) * 1000 / soN(tong)) / 10 : null; }
  function tlChu(dat, tong) { var p = tl(dat, tong); return p == null ? '' : so(p) + '% (' + so(dat) + '/' + so(tong) + ')'; }
  function cong(ds, k) {
    var co = false, s = 0;
    (ds || []).forEach(function (d) { if (d[k] !== '' && d[k] != null && !isNaN(Number(d[k]))) { co = true; s += Number(d[k]); } });
    return co ? s : '';
  }

  var CHUA = '<p class="nghieng">Chưa có số liệu (nhà trường đang cập nhật).</p>';
  function h2(chu) { return '<p style="margin:14pt 0 4pt"><b>' + c(chu) + '</b></p>'; }
  function h3(chu) { return '<p style="margin:8pt 0 3pt"><b><i>' + c(chu) + '</i></b></p>'; }
  function doan(chu) { return chu ? '<p style="margin:0 0 4pt;text-indent:1cm;text-align:justify">' + c(chu).replace(/\n/g, '<br>') + '</p>' : ''; }
  function bang(cot, dong, tong) {
    return '<table class="co-dinh"><thead><tr>' + cot.map(function (x) {
      return '<th' + (x.rong ? ' style="width:' + x.rong + '"' : '') + '>' + c(x.nhan) + '</th>';
    }).join('') + '</tr></thead><tbody>' +
      dong.concat(tong ? [tong] : []).map(function (d, i) {
        var dam = tong && i === dong.length;
        return '<tr>' + cot.map(function (x) {
          var v = x.ham ? x.ham(d) : (x.so ? so(d[x.k]) : c(d[x.k]));
          return '<td class="' + (x.so ? 'phai' : x.giua ? 'giua' : '') + '">' + (dam ? '<b>' + v + '</b>' : v) + '</td>';
        }).join('') + '</tr>';
      }).join('') + '</tbody></table>';
  }
  function vanBan(ds) {
    ds = (ds || []).filter(function (v) { return v && v.ten; });
    if (!ds.length) return '';
    return bang([{ k: 'stt', nhan: 'TT', giua: 1, rong: '1.2cm' }, { k: 'ten', nhan: 'Văn bản' }, { k: 'mo_ta', nhan: 'Số, ngày / ghi chú', rong: '5cm' }],
      ds.map(function (v, i) { return { stt: i + 1, ten: v.ten, mo_ta: v.mo_ta || (v.link ? 'Đăng trên cổng thông tin' : '') }; }));
  }

  // ── I. Thông tin chung ──
  function mucI(nd) {
    if (!nd) return CHUA;
    var dong = [['Tên cơ sở giáo dục', nd.ten], ['Loại hình', nd.loai_hinh], ['Cơ quan quản lý trực tiếp', nd.co_quan_truc_tiep],
      ['Cơ quan quản lý chuyên môn', nd.co_quan_chuyen_mon], ['Địa chỉ trụ sở chính', nd.tru_so], ['Các điểm trường', nd.diem_truong],
      ['Điện thoại', nd.dien_thoai], ['Thư điện tử', nd.email], ['Cổng thông tin điện tử', nd.cong_thong_tin],
      ['Sứ mạng', nd.su_menh], ['Tầm nhìn', nd.tam_nhin], ['Mục tiêu', nd.muc_tieu], ['Quá trình hình thành và phát triển', nd.lich_su]]
      .filter(function (x) { return x[1]; });
    var h = bang([{ k: 'a', nhan: 'Nội dung', rong: '5.2cm' }, { k: 'b', nhan: 'Thông tin' }], dong.map(function (x) { return { a: x[0], b: x[1] }; }));
    var ld = (nd.lanh_dao || []).filter(function (x) { return x && x.ho_ten; });
    if (ld.length) h += h3('Lãnh đạo nhà trường') + bang([
      { k: 'chuc_vu', nhan: 'Chức vụ', rong: '3.4cm' }, { k: 'ho_ten', nhan: 'Họ và tên', rong: '3.8cm' },
      { k: 'dien_thoai', nhan: 'Điện thoại', rong: '2.8cm' }, { k: 'email', nhan: 'Thư điện tử' }, { k: 'nhiem_vu', nhan: 'Nhiệm vụ' }], ld);
    var vb = vanBan(nd.van_ban);
    if (vb) h += h3('Tổ chức bộ máy, quy chế và văn bản khác') + vb;
    return h;
  }

  // ── II. Đội ngũ (đối sánh năm trước) ──
  function mucII(nd, tr) {
    if (!nd) return CHUA;
    var h = '';
    var ds = (nd.bang || []).filter(function (x) { return x && x.vi_tri; });
    var dsTr = ((tr || {}).bang || []);
    function tongTruoc(vt) { var r = dsTr.filter(function (x) { return x.vi_tri === vt; })[0]; return r ? r.tong : ''; }
    if (ds.length) {
      var tongDong = { vi_tri: 'Tổng cộng', tong: cong(ds, 'tong'), thac_si: cong(ds, 'thac_si'), dai_hoc: cong(ds, 'dai_hoc'),
        cao_dang: cong(ds, 'cao_dang'), khac: cong(ds, 'khac'), truoc: cong(dsTr, 'tong') };
      h += bang([
        { k: 'vi_tri', nhan: 'Vị trí việc làm' }, { k: 'tong', nhan: 'Tổng số', so: 1, rong: '1.8cm' },
        { k: 'thac_si', nhan: 'Thạc sĩ trở lên', so: 1, rong: '1.9cm' }, { k: 'dai_hoc', nhan: 'Đại học', so: 1, rong: '1.8cm' },
        { k: 'cao_dang', nhan: 'Cao đẳng', so: 1, rong: '1.8cm' }, { k: 'khac', nhan: 'Trung cấp, khác', so: 1, rong: '1.9cm' },
        { k: 'truoc', nhan: 'Năm trước (tổng)', so: 1, rong: '2cm' }
      ], ds.map(function (d) { return Object.assign({ truoc: tongTruoc(d.vi_tri) }, d); }), ds.length > 1 ? tongDong : null);
    }
    var t = tr || {};
    var ct = [
      ['Giáo viên đạt chuẩn trình độ đào tạo', tlChu(nd.dc_dat, nd.dc_tong), tlChu(t.dc_dat, t.dc_tong)],
      ['CBQL, giáo viên đạt chuẩn nghề nghiệp', tlChu(nd.nn_dat, nd.nn_tong), tlChu(t.nn_dat, t.nn_tong)],
      ['Hoàn thành bồi dưỡng hằng năm', tlChu(nd.bd_dat, nd.bd_tong), tlChu(t.bd_dat, t.bd_tong)]
    ].filter(function (x) { return x[1] || x[2]; });
    if (ct.length) h += h3('Tỷ lệ đạt chuẩn, hoàn thành bồi dưỡng') +
      bang([{ k: 'a', nhan: 'Chỉ tiêu' }, { k: 'b', nhan: 'Năm báo cáo', rong: '4.2cm', giua: 1 }, { k: 'c', nhan: 'Năm trước liền kề', rong: '4.2cm', giua: 1 }],
        ct.map(function (x) { return { a: x[0], b: x[1], c: x[2] }; }));
    return h || CHUA;
  }

  // ── III. Cơ sở vật chất (đối sánh năm trước, tối thiểu) ──
  function mucIII(nd, tr) {
    if (!nd) return CHUA;
    var h = '';
    var bq = nd.dien_tich && nd.hoc_sinh ? Math.round(soN(nd.dien_tich) * 10 / soN(nd.hoc_sinh)) / 10 : '';
    var t = tr || {};
    var bqTr = t.dien_tich && t.hoc_sinh ? Math.round(soN(t.dien_tich) * 10 / soN(t.hoc_sinh)) / 10 : '';
    if (nd.dien_tich) h += bang([{ k: 'a', nhan: 'Chỉ tiêu' }, { k: 'b', nhan: 'Năm báo cáo', so: 1, rong: '3cm' }, { k: 'c', nhan: 'Năm trước', so: 1, rong: '3cm' }, { k: 'd', nhan: 'Tối thiểu theo quy định', so: 1, rong: '3.4cm' }], [
      { a: 'Diện tích khu đất (m²)', b: nd.dien_tich, c: t.dien_tich, d: '' },
      { a: 'Diện tích bình quân (m²/học sinh)', b: bq, c: bqTr, d: nd.toi_thieu_bq }
    ]);
    var ph = (nd.phong || []).filter(function (x) { return x && x.hang_muc; });
    var phTr = t.phong || [];
    if (ph.length) h += h3('Các khối phòng, thiết bị dạy học') + bang([
      { k: 'hang_muc', nhan: 'Hạng mục' }, { k: 'hien_co', nhan: 'Hiện có', so: 1, rong: '2cm' },
      { k: 'truoc', nhan: 'Năm trước', so: 1, rong: '2cm' }, { k: 'toi_thieu', nhan: 'Tối thiểu', so: 1, rong: '2cm' },
      { k: 'x', nhan: 'Đối sánh', rong: '2.4cm', giua: 1, ham: function (d) {
        if (d.toi_thieu === '' || d.toi_thieu == null) return '';
        var thieu = soN(d.toi_thieu) - soN(d.hien_co);
        return thieu > 0 ? 'Thiếu ' + so(thieu) : 'Đạt';
      } }
    ], ph.map(function (d) {
      var r = phTr.filter(function (x) { return x.hang_muc === d.hang_muc; })[0];
      return Object.assign({ truoc: r ? r.hien_co : '' }, d);
    }));
    var vb = vanBan(nd.van_ban);
    if (vb) h += h3('Sách giáo khoa, tài liệu học tập') + vb;
    return h || CHUA;
  }

  // ── IV. Kiểm định ──
  function mucIV(nd) {
    if (!nd) return CHUA;
    var moc = (nd.moc || []).filter(function (x) { return x && x.tieu_de; });
    var h = moc.length ? bang([{ k: 'thoi_gian', nhan: 'Thời gian', rong: '2.8cm' }, { k: 'tieu_de', nhan: 'Nội dung' }, { k: 'mo_ta', nhan: 'Ghi chú' },
      { k: 'tt', nhan: 'Tình trạng', rong: '2.4cm', giua: 1, ham: function (d) { return d.ke_hoach ? 'Kế hoạch' : 'Đã thực hiện'; } }], moc) : '';
    var vb = vanBan(nd.van_ban);
    if (vb) h += h3('Văn bản liên quan') + vb;
    return h || CHUA;
  }

  // ── V. Kết quả hoạt động giáo dục ──
  function mucV(kh, kq, kqTr) {
    var h = '';
    if (kh && (kh.van_ban || []).length) h += h3('Kế hoạch hoạt động giáo dục của năm học') + vanBan(kh.van_ban);
    if (kq && (kq.khoi || []).length) {
      var ds = kq.khoi.filter(function (x) { return x && x.khoi !== '' && x.khoi != null; });
      var dsTr = (kqTr && kqTr.khoi) || [];
      h += h3('Học sinh và kết quả giáo dục năm học ' + c(kq.nam_truoc || '')) + bang([
        { k: 'ten', nhan: 'Khối', rong: '2.2cm' }, { k: 'so_lop', nhan: 'Lớp', so: 1 }, { k: 'hoc_sinh', nhan: 'Học sinh', so: 1 },
        { k: 'nu', nhan: 'Nữ', so: 1 }, { k: 'dtts', nhan: 'DTTS', so: 1 }, { k: 'khuyet_tat', nhan: 'KT', so: 1 },
        { k: 'htxs', nhan: 'HTXS', so: 1 }, { k: 'htt', nhan: 'HTT', so: 1 }, { k: 'ht', nhan: 'HT', so: 1 }, { k: 'cht', nhan: 'CHT', so: 1 },
        { k: 'len_lop', nhan: 'Lên lớp', so: 1 }
      ], ds.map(function (d) { return Object.assign({ ten: 'Khối ' + d.khoi }, d); }), ds.length > 1 ? {
        ten: 'Toàn trường', so_lop: cong(ds, 'so_lop'), hoc_sinh: cong(ds, 'hoc_sinh'), nu: cong(ds, 'nu'), dtts: cong(ds, 'dtts'),
        khuyet_tat: cong(ds, 'khuyet_tat'), htxs: cong(ds, 'htxs'), htt: cong(ds, 'htt'), ht: cong(ds, 'ht'), cht: cong(ds, 'cht'), len_lop: cong(ds, 'len_lop')
      } : null);
      h += '<p class="nghieng" style="font-size:11pt;margin:2pt 0 6pt">HTXS: Hoàn thành xuất sắc · HTT: Hoàn thành tốt · HT: Hoàn thành · CHT: Chưa hoàn thành · DTTS: dân tộc thiểu số · KT: khuyết tật.</p>';
      // Đối sánh toàn trường với năm trước liền kề
      function tong(dsx, k) { return cong(dsx, k); }
      var dong = [
        ['Tổng số học sinh', tong(ds, 'hoc_sinh'), tong(dsTr, 'hoc_sinh')],
        ['Số học sinh học 2 buổi/ngày', tong(ds, 'hai_buoi'), tong(dsTr, 'hai_buoi')],
        ['Hoàn thành xuất sắc + Hoàn thành tốt', soN(tong(ds, 'htxs')) + soN(tong(ds, 'htt')) || '', soN(tong(dsTr, 'htxs')) + soN(tong(dsTr, 'htt')) || ''],
        ['Chưa hoàn thành', tong(ds, 'cht'), tong(dsTr, 'cht')],
        ['Lớp 5 hoàn thành chương trình tiểu học', kq.hoan_thanh_cth, kqTr ? kqTr.hoan_thanh_cth : '']
      ].filter(function (x) { return x[1] !== '' || x[2] !== ''; });
      if (dong.length) h += bang([{ k: 'a', nhan: 'Chỉ tiêu (toàn trường)' }, { k: 'b', nhan: 'Năm báo cáo', so: 1, rong: '3cm' }, { k: 'c', nhan: 'Năm trước liền kề', so: 1, rong: '3cm' }],
        dong.map(function (x) { return { a: x[0], b: x[1], c: x[2] }; }));
      var ghi = [];
      if (kq.chuyen_den !== '' && kq.chuyen_den != null) ghi.push('chuyển đến ' + so(kq.chuyen_den));
      if (kq.chuyen_di !== '' && kq.chuyen_di != null) ghi.push('chuyển đi ' + so(kq.chuyen_di));
      if (ghi.length) h += doan('Biến động học sinh trong năm học: ' + ghi.join(', ') + '.');
    }
    return h || CHUA;
  }

  // ── VI. Tài chính ──
  function mucVI(nd) {
    if (!nd) return CHUA;
    var h = '';
    if (nd.cho) h += doan(nd.cho + (nd.cho_ghi ? '. ' + nd.cho_ghi : ''));
    var tc = (nd.thu_chi || []).filter(function (x) { return x && x.noi_dung; });
    if (tc.length) h += h3('Tình hình thu, chi năm tài chính') + bang([{ k: 'noi_dung', nhan: 'Nội dung' }, { k: 'so_tien', nhan: 'Số tiền (đồng)', so: 1, rong: '4cm' }], tc);
    var kt = (nd.khoan_thu || []).filter(function (x) { return x && x.ten; });
    if (kt.length) h += h3('Các khoản thu và mức thu') + bang([{ k: 'ten', nhan: 'Khoản thu' }, { k: 'muc', nhan: 'Mức thu', rong: '3cm' },
      { k: 'don_vi', nhan: 'Đơn vị tính', rong: '2.6cm' }, { k: 'can_cu', nhan: 'Căn cứ' }], kt);
    if (nd.mien_giam) h += h3('Chính sách và kết quả miễn, giảm, hỗ trợ') + doan(nd.mien_giam);
    if (nd.so_du_quy) h += h3('Số dư các quỹ') + doan(nd.so_du_quy);
    return h || CHUA;
  }

  window.xuatBaoCaoThuongNien = function (namHoc, dongNam, dongTruoc) {
    if (!W()) { window.notify && window.notify('Chưa tải được bộ xuất Word — tải lại trang rồi thử lại.'); return; }
    var N = dongNam || {}, T = dongTruoc || {};
    var nam = String(namHoc || '').split('-')[0];
    var bc = N.bao_cao || {};
    var than =
      W().theThuc() +
      '<p class="giua" style="margin:18pt 0 0;font-size:14pt"><b>BÁO CÁO THƯỜNG NIÊN</b></p>' +
      '<p class="giua" style="margin:0 0 4pt"><b>Năm ' + c(nam) + '</b></p>' +
      '<p class="giua nghieng" style="margin:0 0 12pt;font-size:12pt">(Theo Phụ lục I Thông tư số 09/2024/TT-BGDĐT ngày 03/6/2024 của Bộ trưởng Bộ Giáo dục và Đào tạo; số liệu tính đến ngày 31/12/' + c(nam) + ', năm học ' + c(namHoc) + ')</p>' +
      h2('I. THÔNG TIN CHUNG') + mucI(N.thong_tin) +
      h2('II. ĐỘI NGŨ NHÀ GIÁO, CÁN BỘ QUẢN LÝ VÀ NHÂN VIÊN') + mucII(N.doi_ngu, T.doi_ngu) +
      h2('III. CƠ SỞ VẬT CHẤT') + mucIII(N.csvc, T.csvc) +
      h2('IV. KIỂM ĐỊNH CHẤT LƯỢNG GIÁO DỤC') + mucIV(N.kiem_dinh) +
      h2('V. KẾT QUẢ HOẠT ĐỘNG GIÁO DỤC') + mucV(N.ke_hoach, N.ket_qua, T.ket_qua) +
      h2('VI. KẾT QUẢ TÀI CHÍNH') + mucVI(N.tai_chinh) +
      h2('VII. KẾT QUẢ THỰC HIỆN CÁC NHIỆM VỤ TRỌNG TÂM KHÁC') + (bc.nhiem_vu_khac ? doan(bc.nhiem_vu_khac) : CHUA) +
      '<table style="border:none;width:100%;margin-top:16pt"><tr><td style="border:none;width:50%;font-size:11pt;vertical-align:top">' +
      '<b><i>Nơi nhận:</i></b><br>- Cổng thông tin điện tử của trường;<br>- Lưu: VT.</td>' +
      '<td style="border:none;width:50%;text-align:center;font-size:12pt"><b>THỦ TRƯỞNG ĐƠN VỊ</b><br>' +
      '<span class="nghieng">(Ký tên, đóng dấu)</span><div style="height:56pt"></div><b>' + c(W().cauHinh('HIEU_TRUONG')) + '</b></td></tr></table>';
    W().taiVe(W().khungWord('Báo cáo thường niên ' + nam, than, false), 'Bao-cao-thuong-nien-' + nam + '.doc');
  };
})();
