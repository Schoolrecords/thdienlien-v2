// ============================================================
// dbcl-doi-sanh.js — ĐỐI SÁNH CHẤT LƯỢNG GIỮA CÁC ĐỊA ĐIỂM
//
// CV 5555/BGDĐT-GDPT (PL II mục V):
//   V.3.a — theo dõi, phân tích kết quả giáo dục theo TỪNG trường chính,
//           phân hiệu, điểm trường.
//   V.3.c — kết quả theo dõi dùng để XÁC ĐỊNH CHÊNH LỆCH, làm căn cứ điều
//           phối đội ngũ, cơ sở vật chất, nguồn lực.
//   V.4.b — ƯU TIÊN hỗ trợ nơi có kết quả thấp hơn mặt bằng chung.
//
// Số liệu và hàm dò chênh lệch: sql/42. KHÔNG có bảng mới — mọi con số tính
// từ kết quả học sinh đã nhập, qua lop_hoc.co_so_ma. Đúng V.3.d: theo dõi
// từng địa điểm phải nằm TRONG hệ thống chung, không đẻ thêm chế độ báo cáo
// riêng cho điểm trường.
//
// ⚠️ Màn này KHÔNG CÓ Ô NHẬP ĐIỂM NÀO. Toàn bộ lấy từ module Quản lý học
//    sinh — một số liệu chỉ nhập ở một nơi.
//
// Tệp đứng riêng, dbcl.js chỉ gọi window.DBCL_DOI_SANH.ve().
// ============================================================
(function () {
  'use strict';

  function thoat(s) { return window.thoatHTML ? window.thoatHTML(s) : String(s || ''); }
  function may() { return window.MAY_CHU; }
  function nam() {
    return (window.CAU_HINH || {}).NAM_HOC ||
      window.tinhNamHoc((window.CAU_HINH || {}).MOC_DOI_NAM_HOC);
  }

  var KY = [
    { ma: 'giua_ki_1', ten: 'Giữa kỳ I' },
    { ma: 'cuoi_ki_1', ten: 'Cuối kỳ I' },
    { ma: 'giua_ki_2', ten: 'Giữa kỳ II' },
    { ma: 'cuoi_nam',  ten: 'Cuối năm' }
  ];

  var KY_CHON = 'cuoi_nam';
  var NGUONG = 10;          // điểm phần trăm — dưới mặt bằng bao nhiêu thì gọi là chênh lệch
  var MON = [];             // kết quả từng môn theo địa điểm
  var TONG = [];            // tổng quan theo địa điểm
  var LECH = [];            // chênh lệch giữa các địa điểm
  var CAM_KET = [];         // đối chiếu chỉ tiêu đầu năm ↔ kết quả thật (sql/43)
  var DANG_TAI = false;
  var LOI = null;
  // 🔴 Cờ RIÊNG, không suy từ việc có dữ liệu hay không. Suy từ dữ liệu thì
  // trường chưa nhập kết quả nào sẽ rơi vào vòng lặp vô hạn: vẽ → thấy rỗng →
  // tưởng chưa nạp → nạp → vẽ lại → …
  var DA_NAP = false;

  // ══════════ ĐỌC ══════════
  function nap(veLai) {
    if (!may()) { LOI = 'chua_ket_noi'; DA_NAP = true; veLai(); return; }
    DANG_TAI = true; DA_NAP = true; LOI = null; veLai();

    var N = nam();
    Promise.all([
      may().rpc('chat_luong_mon_theo_co_so', { p_nam_hoc: N, p_ky: KY_CHON }),
      may().rpc('tong_quan_theo_co_so', { p_nam_hoc: N }),
      may().rpc('chat_luong_chenh_lech', { p_nam_hoc: N, p_ky: KY_CHON, p_nguong: NGUONG }),
      // Đối chiếu với chỉ tiêu nhà trường đặt đầu năm (sql/43). Trường chưa
      // chạy sql/43 hoặc chưa đặt chỉ tiêu thì phần này rỗng và bảng "Đã cam
      // kết" không hiện — phần so sánh giữa các địa điểm vẫn chạy đủ.
      may().rpc('doi_chieu_chi_tieu', { p_nam_hoc: N, p_ky: KY_CHON })
    ]).then(function (r) {
      DANG_TAI = false;
      // Chỉ hàm thứ nhất là bắt buộc; các hàm kia hỏng thì bớt phần đó chứ
      // không bỏ cả màn.
      if (r[0].error) { LOI = r[0].error.message; veLai(); return; }
      MON  = r[0].data || [];
      TONG = (r[1] && !r[1].error && r[1].data) ? r[1].data : [];
      LECH = (r[2] && !r[2].error && r[2].data) ? r[2].data : [];
      CAM_KET = (r[3] && !r[3].error && r[3].data) ? r[3].data : [];
      veLai();
    }).catch(function (e) {
      DANG_TAI = false; LOI = e.message || String(e); veLai();
    });
  }

  function soCoSo() {
    var d = {};
    MON.forEach(function (m) { d[m.co_so_ma] = 1; });
    TONG.forEach(function (t) { d[t.co_so_ma] = 1; });
    return Object.keys(d).length;
  }

  function tenKy() {
    var k = KY.filter(function (x) { return x.ma === KY_CHON; })[0];
    return k ? k.ten : KY_CHON;
  }

  // ══════════ CÁC KHỐI ══════════
  function chonKy() {
    return '<div class="chip-hang" style="margin:0 0 14px">' +
      KY.map(function (k) {
        return '<button class="chip-loc' + (k.ma === KY_CHON ? ' on' : '') +
          '" data-ds-ky="' + k.ma + '">' + thoat(k.ten) + '</button>';
      }).join('') + '</div>';
  }

  function veTongQuan() {
    if (!TONG.length) return '';
    var nhieu = TONG.length >= 2;

    return '<div class="dau-muc" style="text-align:left;margin:4px 0 8px">' +
      '<div class="nhan-nho">Quy mô và kết quả cả năm theo địa điểm</div></div>' +
      '<div class="ds-ds">' + TONG.map(function (t) {
        return '<div class="ds-the">' +
          '<div class="ds-dau"><b>' + thoat(t.co_so_ten) + '</b>' +
          (nhieu ? '<span class="cs-loai">' + (t.co_so_loai === 'chinh' ? 'Trường chính'
            : t.co_so_loai === 'phan_hieu' ? 'Phân hiệu' : 'Điểm trường') + '</span>' : '') +
          '</div>' +
          '<div class="ds-so">' +
          '<span><b>' + t.so_lop + '</b> lớp</span>' +
          '<span><b>' + t.si_so + '</b> học sinh</span>' +
          '<span><b>' + t.so_hs_vang + '</b> lượt vắng</span>' +
          '</div>' +
          (t.ti_le_ht != null
            ? '<div class="ds-ht">Hoàn thành chương trình lớp học: <b>' + t.ti_le_ht + '%</b>' +
              (t.chua_ht ? ' <span style="color:var(--thieu)">(' + t.chua_ht + ' em chưa hoàn thành)</span>' : '') +
              '</div>'
            : '<div class="ds-ht" style="color:var(--chu-mo)">Chưa có kết quả cuối năm</div>') +
          '</div>';
      }).join('') + '</div>';
  }

  function veCanhBao() {
    if (soCoSo() < 2) return '';
    if (!LECH.length) {
      return '<div class="hd-kiem" style="margin:14px 0;background:var(--ok-nen);border-color:var(--ok)">' +
        '✔ <b>Không nơi nào thấp hơn mặt bằng chung quá ' + NGUONG + ' điểm phần trăm</b> ở ' +
        thoat(tenKy()) + '.</div>';
    }
    return '<div class="hd-kiem do" style="margin:14px 0">' +
      '🔴 <b>' + LECH.length + ' chỗ thấp hơn mặt bằng chung của nhà trường</b> (' +
      thoat(tenKy()) + ', chênh từ ' + NGUONG + ' điểm phần trăm trở lên):' +
      '<div style="margin-top:7px;font-size:13.6px">' +
      LECH.map(function (l) {
        return '<div style="margin-top:3px">• <b>' + thoat(l.mon_ten) + '</b> tại ' +
          thoat(l.co_so_ten) + ': <b>' + l.ti_le_t + '%</b> hoàn thành tốt, ' +
          'toàn trường ' + l.ti_le_t_chung + '% (' +
          '<span style="color:var(--thieu)">' + l.chenh + '</span>)</div>';
      }).join('') + '</div>' +
      '<div style="margin-top:8px;font-size:13.4px">Những chỗ này nên được ưu tiên khi phân công ' +
      'giáo viên, bố trí thiết bị và xếp vào kế hoạch cải tiến.</div></div>';
  }

  function veBangMon() {
    if (!MON.length) return '';

    // Xoay bảng: mỗi hàng một môn, mỗi cột một địa điểm. Trường một địa điểm
    // thì thành bảng kết quả bình thường — vẫn có ích, không phải ẩn đi.
    var cs = [], thayCS = {};
    MON.forEach(function (m) {
      if (!thayCS[m.co_so_ma]) { thayCS[m.co_so_ma] = 1; cs.push({ ma: m.co_so_ma, ten: m.co_so_ten }); }
    });
    var mon = [], thayMon = {};
    MON.forEach(function (m) {
      if (!thayMon[m.mon_ma]) { thayMon[m.mon_ma] = 1; mon.push({ ma: m.mon_ma, ten: m.mon_ten }); }
    });
    var o = {};
    MON.forEach(function (m) { o[m.mon_ma + '|' + m.co_so_ma] = m; });

    // Mặt bằng chung tính trên TỔNG SỐ HỌC SINH, không lấy trung bình cộng
    // tỉ lệ các địa điểm — cùng cách sql/42 tính, để hai bên không lệch nhau.
    var chung = {};
    mon.forEach(function (mm) {
      var t = 0, n = 0;
      cs.forEach(function (c) {
        var x = o[mm.ma + '|' + c.ma];
        if (x) { t += +x.so_t; n += +x.si_so; }
      });
      chung[mm.ma] = n ? Math.round(1000 * t / n) / 10 : null;
    });

    return '<div class="dau-muc" style="text-align:left;margin:20px 0 6px">' +
      '<div class="nhan-nho">Tỉ lệ hoàn thành tốt từng môn — ' + thoat(tenKy()) + '</div></div>' +
      '<div class="nhan-nho" style="text-transform:none;letter-spacing:0;color:var(--chu-mo);margin-bottom:8px">' +
      'Ô tô đỏ là nơi thấp hơn mặt bằng chung của nhà trường từ ' + NGUONG + ' điểm phần trăm trở lên.</div>' +
      '<div class="cuon-ngang"><table class="bang-quan-tri nho"><thead><tr><th>Môn học</th>' +
      cs.map(function (c) { return '<th>' + thoat(c.ten) + '</th>'; }).join('') +
      (cs.length >= 2 ? '<th>Toàn trường</th>' : '') +
      '</tr></thead><tbody>' +
      mon.map(function (mm) {
        return '<tr><td><b>' + thoat(mm.ten) + '</b></td>' +
          cs.map(function (c) {
            var x = o[mm.ma + '|' + c.ma];
            if (!x) return '<td style="text-align:center;color:var(--chu-mo)">—</td>';
            var lech = chung[mm.ma] != null && x.si_so >= 5 &&
              (+x.ti_le_t) < chung[mm.ma] - NGUONG;
            return '<td style="text-align:center' +
              (lech ? ';background:var(--thieu-nen);color:var(--thieu);font-weight:800' : '') + '">' +
              x.ti_le_t + '%' +
              '<br><small style="color:var(--chu-mo);font-weight:400">' + x.si_so + ' em</small></td>';
          }).join('') +
          (cs.length >= 2
            ? '<td style="text-align:center;font-weight:700">' +
              (chung[mm.ma] == null ? '—' : chung[mm.ma] + '%') + '</td>'
            : '') +
          '</tr>';
      }).join('') + '</tbody></table></div>';
  }

  // ══════════ ĐÃ CAM KẾT ↔ KẾT QUẢ THẬT ══════════
  // Cột này từng bị gỡ ở sql/42 vì chưa có bảng nào giữ chỉ tiêu — bày số bịa
  // cạnh số thật là để nhà trường tin nhầm. Nay chỉ tiêu có nguồn thật
  // (sql/43) nên dựng lại được.
  function veCamKet() {
    if (!CAM_KET.length) return '';
    var hut = CAM_KET.filter(function (c) { return c.dat_cam_ket === false; });

    return '<div class="dau-muc" style="text-align:left;margin:22px 0 6px">' +
      '<div class="nhan-nho">Đã cam kết ↔ Kết quả thật — ' + thoat(tenKy()) + '</div></div>' +
      (hut.length
        ? '<div class="hd-kiem vang" style="margin-bottom:10px">⚠ <b>' + hut.length +
          ' môn chưa đạt chỉ tiêu đã đặt.</b> Những môn này nên thành một dòng trong ' +
          '<b>Kế hoạch cải tiến (Biểu 2)</b> của Trường chuẩn Quốc gia — làm một lần, dùng cho ' +
          'cả hai việc.</div>'
        : '<div class="hd-kiem" style="margin-bottom:10px;background:var(--ok-nen);border-color:var(--ok)">' +
          '✔ <b>Mọi môn có chỉ tiêu đều đạt.</b></div>') +

      '<div class="cuon-ngang"><table class="bang-quan-tri nho"><thead><tr>' +
      '<th>Môn học</th><th>Đã cam kết</th><th>Kết quả thật</th><th>Chênh lệch</th><th>Kết luận</th>' +
      '</tr></thead><tbody>' +
      CAM_KET.map(function (c) {
        var dat = c.dat_cam_ket !== false;
        // Một môn có thể ĐẠT chỉ tiêu Hoàn thành tốt mà VẪN hụt cam kết, do
        // vượt ngưỡng Chưa hoàn thành. Không nói rõ thì bảng hiện "+2,1" ngay
        // cạnh chữ "Hụt", người đọc không hiểu vì sao — đã gặp đúng cảnh này
        // lúc dựng thử.
        var hutVuot = !dat && c.chi_tieu_chua != null &&
          c.thuc_te_chua != null && (+c.thuc_te_chua) > (+c.chi_tieu_chua);
        // Ngưỡng "Hoàn thành trở lên" (cột chi_tieu_dat/thuc_te_dat của bản vá
        // sql/57). RPC bản cũ chưa có hai cột này → undefined → dòng không hiện,
        // bảng y như trước.
        var hutDat = !dat && c.chi_tieu_dat != null &&
          c.thuc_te_dat != null && (+c.thuc_te_dat) < (+c.chi_tieu_dat);
        var mau = dat ? 'var(--ok)' : 'var(--thieu)';
        // Cột chênh lệch tô theo CHÍNH nó, không tô theo kết luận chung: chỉ
        // tiêu Hoàn thành tốt đạt thì con số đó là số dương thật.
        var mauChenh = (c.chenh_tot != null && c.chenh_tot >= 0) ? 'var(--ok)' : 'var(--thieu)';
        return '<tr><td><b>' + thoat(c.mon_ten) + '</b></td>' +
          '<td style="text-align:center">' +
          (c.chi_tieu_tot == null ? '—' : '≥ ' + c.chi_tieu_tot + '%') +
          (c.chi_tieu_dat != null
            ? '<br><small style="color:var(--chu-mo)">HT trở lên ≥ ' + c.chi_tieu_dat + '%</small>'
            : '') +
          (c.chi_tieu_chua != null
            ? '<br><small style="color:var(--chu-mo)">chưa HT ≤ ' + c.chi_tieu_chua + '%</small>'
            : '') + '</td>' +
          '<td style="text-align:center">' + c.thuc_te_tot + '%' +
          (c.thuc_te_dat != null && c.chi_tieu_dat != null
            ? '<br><small style="color:' + (hutDat ? 'var(--thieu)' : 'var(--chu-mo)') + '">HT trở lên ' +
              c.thuc_te_dat + '%</small>'
            : '') +
          (c.thuc_te_chua != null
            ? '<br><small style="color:' + (hutVuot ? 'var(--thieu)' : 'var(--chu-mo)') + '">chưa HT ' +
              c.thuc_te_chua + '%</small>'
            : '<br><small style="color:var(--chu-mo)">' + c.si_so + ' em</small>') + '</td>' +
          '<td style="text-align:center;color:' + mauChenh + ';font-weight:800">' +
          (c.chenh_tot == null ? '—' : (c.chenh_tot > 0 ? '+' : '') + c.chenh_tot) + '</td>' +
          '<td style="color:' + mau + ';font-weight:700">' +
          (dat ? '✔ Đạt cam kết'
               : '✘ Hụt — đưa vào Biểu 2' +
                 (hutVuot
                   ? '<br><small style="font-weight:400">vì tỉ lệ chưa hoàn thành vượt ngưỡng</small>'
                   : hutDat
                   ? '<br><small style="font-weight:400">vì tỉ lệ hoàn thành trở lên hụt ngưỡng</small>'
                   : '')) +
          '</td></tr>';
      }).join('') + '</tbody></table></div>';
  }

  function veTrong() {
    return '<div class="the-thong-bao" style="text-align:center;padding:26px">' +
      '<div style="font-size:34px">📊</div>' +
      '<p style="margin-top:8px"><b>Chưa có kết quả học tập của ' + thoat(tenKy()) +
      ' năm học ' + thoat(nam()) + '.</b></p>' +
      '<p style="font-size:14px;color:var(--chu-mo);margin-top:6px">' +
      'Màn này lấy thẳng số liệu từ <b>Quản lý học sinh</b> — nhập kết quả ở đó xong là bảng ' +
      'dưới đây tự có, không phải nhập lại lần nữa.</p></div>';
  }

  // ══════════ VẼ ══════════
  function ve(veLai) {
    var dau =
      '<div class="the-thong-bao" style="margin-bottom:14px">' +
      '<b>So sánh kết quả giữa các địa điểm của trường.</b> ' +
      'Nơi nào thấp hơn mặt bằng chung sẽ được chỉ ra ngay, để nhà trường biết chỗ nào cần ưu tiên ' +
      'giáo viên, thiết bị và thời gian.' +
      '<div style="margin-top:7px;font-size:13.6px;color:var(--chu-mo)">' +
      'Toàn bộ số liệu lấy từ <b>Quản lý học sinh</b>. Màn này không có ô nhập nào — ' +
      'một số liệu chỉ nhập ở một nơi.</div></div>' + chonKy();

    if (DANG_TAI) return dau + '<div class="the-thong-bao">Đang tính…</div>';

    if (LOI === 'chua_ket_noi') {
      return dau + '<div class="the-thong-bao" style="text-align:center;padding:24px">' +
        '<p><b>Bản xem thử chưa nối cơ sở dữ liệu.</b></p>' +
        '<p style="font-size:14px;color:var(--chu-mo);margin-top:6px">' +
        'Mục này làm việc với kết quả học tập thật của nhà trường nên cần đăng nhập.</p></div>';
    }
    if (LOI) {
      return dau + '<div class="hd-kiem do"><b>Chưa tính được số liệu đối sánh.</b><br>' +
        'Nếu đây là lần đầu dùng mục này, nhà trường cần cài đặt bổ sung một lần ' +
        '(tệp <code>sql/42</code>) — báo người phụ trách hệ thống.' +
        '<div style="margin-top:6px;font-size:13px;opacity:.8">' + thoat(LOI) + '</div></div>';
    }
    if (!MON.length && !TONG.length) return dau + veTrong();

    return dau + veTongQuan() + veCamKet() + veCanhBao() + veBangMon();
  }

  function noiSuKien(goc, veLai) {
    if (!goc) return;
    Array.prototype.slice.call(goc.querySelectorAll('[data-ds-ky]')).forEach(function (b) {
      b.addEventListener('click', function () {
        KY_CHON = b.getAttribute('data-ds-ky');
        nap(veLai);
      });
    });
  }

  window.DBCL_DOI_SANH = {
    ve: ve, nap: nap, noiSuKien: noiSuKien,
    daTai: function () { return DA_NAP; }
  };
})();
