// ============================================================
// dbcl-chi-tieu.js — CHỈ TIÊU CHẤT LƯỢNG ĐẦU NĂM (chuẩn đầu ra)
//
// Thay phần số mẫu của màn "Chuẩn đầu ra & Cam kết" bằng chỉ tiêu thật do
// nhà trường tự đặt. Bảng dữ liệu: sql/43.
//
// 🔑 CHỈ TIÊU ĐẶT BẰNG TỈ LỆ MỨC ĐẠT, KHÔNG ĐẶT BẰNG ĐIỂM.
//    Điều 7 Thông tư 27/2020: điểm kiểm tra định kỳ không dùng xếp loại, chỉ
//    để tham khảo. Ô điểm giữ lại vì nhà trường có cam kết điểm với UBND xã —
//    là số tham khảo đặt cạnh, không phải căn cứ đánh giá.
//
// Đây là nguồn cho cột "Đã cam kết" ở màn Đối sánh (js/dbcl-doi-sanh.js).
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

  var MON = [];       // danh mục môn
  var CT = {};        // 'doi_tuong|ma' → bản ghi chỉ tiêu chung cả trường
  var DA_NAP = false; // cờ RIÊNG — xem bài học ở mục 30.3 sổ dự án
  var DANG_TAI = false;
  var LOI = null;

  var NHOM_NLPC = [
    { ma: 'nang_luc',  ten: 'Năng lực (5 thành phần)' },
    { ma: 'pham_chat', ten: 'Phẩm chất (5 thành phần)' }
  ];

  function khoa(dt, ma) { return dt + '|' + (ma || ''); }

  // ══════════ ĐỌC ══════════
  function nap(veLai) {
    if (!may()) { LOI = 'chua_ket_noi'; DA_NAP = true; veLai(); return; }
    DANG_TAI = true; DA_NAP = true; LOI = null; veLai();

    Promise.all([
      may().from('mon_hoc').select('ma, ten, so_tt').order('so_tt'),
      // Chỉ lấy chỉ tiêu CHUNG cả trường (khoi rỗng). Chỉ tiêu riêng từng khối
      // vẫn lưu được ở CSDL nhưng màn này chưa bày ra — bày cả 12 môn × 5 khối
      // là 60 hàng ô nhập trên điện thoại, không ai nhập nổi.
      may().from('chi_tieu_chat_luong').select('*')
        .eq('nam_hoc', nam()).is('khoi', null)
    ]).then(function (r) {
      DANG_TAI = false;
      if (r[0].error || r[1].error) {
        LOI = (r[0].error || r[1].error).message; veLai(); return;
      }
      MON = r[0].data || [];
      CT = {};
      (r[1].data || []).forEach(function (c) { CT[khoa(c.doi_tuong, c.ma)] = c; });
      veLai();
    }).catch(function (e) {
      DANG_TAI = false; LOI = e.message || String(e); veLai();
    });
  }

  // ══════════ GHI ══════════
  function luu(dt, ma, thay) {
    var cu = CT[khoa(dt, ma)] || {};
    var ban = {
      nam_hoc: nam(), khoi: null, doi_tuong: dt, ma: ma || null,
      ti_le_tot:  cu.ti_le_tot  === undefined ? null : cu.ti_le_tot,
      ti_le_dat:  cu.ti_le_dat  === undefined ? null : cu.ti_le_dat,
      ti_le_chua: cu.ti_le_chua === undefined ? null : cu.ti_le_chua,
      diem_tb:    cu.diem_tb    === undefined ? null : cu.diem_tb
    };
    Object.keys(thay).forEach(function (k) { ban[k] = thay[k]; });

    return may().from('chi_tieu_chat_luong')
      .upsert(ban, { onConflict: 'nam_hoc,khoi,doi_tuong,ma' })
      .select().maybeSingle()
      .then(function (r) {
        if (r.error) throw r.error;
        if (r.data) CT[khoa(dt, ma)] = r.data;
        return r.data;
      });
  }

  // ══════════ VẼ ══════════
  function o(dt, ma, truong, giaTri, goiY) {
    var k = thoat(dt) + '|' + thoat(ma || '') + '|' + truong;
    if (!laQT()) {
      return '<span class="ct-xem">' +
        (giaTri == null || giaTri === '' ? '—' : (+giaTri) + (truong === 'diem_tb' ? '' : '%')) +
        '</span>';
    }
    return '<input class="ct-o" type="number" min="0" ' +
      (truong === 'diem_tb' ? 'max="10" step="0.1"' : 'max="100" step="0.1"') +
      ' value="' + (giaTri == null ? '' : thoat(giaTri)) + '"' +
      (goiY ? ' placeholder="' + thoat(goiY) + '"' : '') +
      ' data-ct="' + k + '">';
  }

  function hang(dt, ma, ten, phu, coDiem) {
    var c = CT[khoa(dt, ma)] || {};
    return '<tr><td class="ct-ten"><b>' + thoat(ten) + '</b>' +
      (phu ? '<br><small style="color:var(--chu-mo)">' + thoat(phu) + '</small>' : '') + '</td>' +
      '<td class="ct-cot">' + o(dt, ma, 'ti_le_tot', c.ti_le_tot) + '</td>' +
      '<td class="ct-cot">' + o(dt, ma, 'ti_le_dat', c.ti_le_dat) + '</td>' +
      '<td class="ct-cot">' + o(dt, ma, 'ti_le_chua', c.ti_le_chua) + '</td>' +
      (coDiem ? '<td class="ct-cot">' + o(dt, ma, 'diem_tb', c.diem_tb) + '</td>' : '<td class="ct-cot">—</td>') +
      '</tr>';
  }

  function ve(veLai) {
    var dau =
      '<div class="the-thong-bao" style="margin-bottom:14px">' +
      '<b>Chỉ tiêu chất lượng nhà trường đặt cho năm học ' + thoat(nam()) + '.</b> ' +
      'Đây là mức phấn đấu, dùng để đối chiếu với kết quả thật ở thẻ <b>Đối sánh chất lượng</b>.' +
      '<div style="margin-top:7px;font-size:13.6px;color:var(--chu-mo)">' +
      'Chỉ tiêu đặt bằng <b>tỉ lệ mức đạt</b>, không đặt bằng điểm — Thông tư 27/2020 quy định ' +
      'điểm kiểm tra định kỳ chỉ để tham khảo, không dùng xếp loại. Cột điểm bên phải giữ lại ' +
      'cho bản cam kết với ' +
      ((window.CAU_HINH && window.CAU_HINH.CHU_QUAN_THUONG) || 'đơn vị chủ quản') + '.</div></div>';

    if (DANG_TAI) return dau + '<div class="the-thong-bao">Đang tải…</div>';

    if (LOI === 'chua_ket_noi') {
      return dau + '<div class="the-thong-bao" style="text-align:center;padding:24px">' +
        '<p><b>Bản xem thử chưa nối cơ sở dữ liệu.</b></p>' +
        '<p style="font-size:14px;color:var(--chu-mo);margin-top:6px">' +
        'Chỉ tiêu là số liệu thật của nhà trường nên cần đăng nhập.</p></div>';
    }
    if (LOI) {
      return dau + '<div class="hd-kiem do"><b>Chưa mở được bảng chỉ tiêu.</b><br>' +
        'Nếu đây là lần đầu dùng mục này, nhà trường cần cài đặt bổ sung một lần ' +
        '(tệp <code>sql/43</code>) — báo người phụ trách hệ thống.' +
        '<div style="margin-top:6px;font-size:13px;opacity:.8">' + thoat(LOI) + '</div></div>';
    }

    var daDat = Object.keys(CT).length;

    return dau +
      (laQT() && !daDat
        ? '<div class="hd-kiem vang" style="margin-bottom:12px">' +
          'Năm học này chưa đặt chỉ tiêu. Nhập thẳng vào bảng dưới — gõ xong bấm ra ngoài ô là ' +
          'hệ thống tự lưu. Ô nào chưa có chỉ tiêu thì để trống.' +
          '<div style="margin-top:8px"><button class="nut-vien" id="ct-chep">' +
          '📋 Lấy lại chỉ tiêu năm trước</button></div></div>'
        : '') +

      '<div class="cuon-ngang"><table class="bang-quan-tri nho"><thead><tr>' +
      '<th>Môn học</th><th class="ct-cot">Hoàn thành tốt<br><small>tối thiểu</small></th>' +
      '<th class="ct-cot">Hoàn thành trở lên<br><small>tối thiểu</small></th>' +
      '<th class="ct-cot">Chưa hoàn thành<br><small>tối đa</small></th>' +
      '<th class="ct-cot">Điểm TB<br><small>tham khảo</small></th>' +
      '</tr></thead><tbody>' +
      MON.map(function (m) { return hang('mon', m.ma, m.ten, null, true); }).join('') +
      NHOM_NLPC.map(function (n) {
        return hang(n.ma, null, n.ten, 'Tốt / Đạt / Cần cố gắng', false);
      }).join('') +
      '</tbody></table></div>' +

      (laQT()
        ? '<div class="nhan-nho" style="text-transform:none;letter-spacing:0;color:var(--chu-mo);margin-top:10px">' +
          'Gõ xong bấm ra ngoài ô là tự lưu. Muốn bỏ chỉ tiêu của một ô thì xoá trắng ô đó.</div>'
        : '');
  }

  function noiSuKien(goc, veLai) {
    if (!goc) return;

    var chep = goc.querySelector('#ct-chep');
    if (chep) chep.addEventListener('click', function () {
      var n = nam().split('-');
      var truoc = (+n[0] - 1) + '-' + n[0];
      chep.disabled = true; chep.textContent = 'Đang lấy…';
      may().rpc('chep_chi_tieu', { p_tu_nam: truoc, p_sang_nam: nam() })
        .then(function (r) {
          if (r.error) throw r.error;
          if (!r.data) window.hopHoi('Năm học ' + truoc + ' cũng chưa đặt chỉ tiêu nào.');
          nap(veLai);
        })
        .catch(function (e) {
          chep.disabled = false; chep.textContent = '📋 Lấy lại chỉ tiêu năm trước';
          window.hopHoi('Không lấy được: ' + (e.message || e));
        });
    });

    Array.prototype.slice.call(goc.querySelectorAll('[data-ct]')).forEach(function (t) {
      t.addEventListener('blur', function () {
        var p = t.getAttribute('data-ct').split('|');   // doi_tuong|ma|truong
        var c = CT[khoa(p[0], p[1])] || {};
        var chu = t.value.trim();
        // Ô trắng = BỎ chỉ tiêu (null), khác hẳn số 0 = đặt chỉ tiêu bằng 0.
        var moi = chu === '' ? null : Math.round(parseFloat(chu.replace(',', '.')) * 100) / 100;
        if (moi != null && isNaN(moi)) { t.value = c[p[2]] == null ? '' : c[p[2]]; return; }
        var cuGT = c[p[2]] == null ? null : +c[p[2]];
        if (cuGT === moi) return;                       // không đổi thì không ghi
        var thay = {}; thay[p[2]] = moi;
        luu(p[0], p[1] || null, thay).catch(function (e) {
          window.hopHoi('Không lưu được chỉ tiêu: ' + (e.message || e));
          t.value = cuGT == null ? '' : cuGT;
        });
      });
    });
  }

  window.DBCL_CHI_TIEU = {
    ve: ve, nap: nap, noiSuKien: noiSuKien,
    daTai: function () { return DA_NAP; }
  };
})();
