// ============================================================
// tcqg-co-so.js — TỰ ĐÁNH GIÁ SOI TỪNG ĐỊA ĐIỂM
//
// CV 5555/BGDĐT-GDPT (PL II, V.2.b): tự đánh giá phải xem xét đầy đủ điều
// kiện và kết quả tại trường chính, các phân hiệu, điểm trường — KHÔNG chỉ
// căn cứ điều kiện tại trường chính hoặc kết quả chung của toàn trường.
//
// Bảng dữ liệu, hàm dò chênh lệch: sql/41.
//
// ⚠️ KHÔNG nhân bản cả bộ 15 tiêu chí cho từng địa điểm — vừa nặng cho hội
//    đồng, vừa phạm V.3.d ("không làm phát sinh hệ thống đánh giá riêng tại
//    từng địa điểm"). Chỉ 6 tiêu chí có theo_dia_diem = true mới hiện thẻ này.
//
// Tệp này ĐỨNG RIÊNG để tcqg.js (781 dòng, đang chạy thật) chỉ phải sửa ba
// chỗ nhỏ: nạp dữ liệu, thêm một tab, gọi vẽ. Mọi thứ khác nằm ở đây.
// ============================================================
(function () {
  'use strict';

  function thoat(s) { return window.thoatHTML ? window.thoatHTML(s) : String(s || ''); }
  function may() { return window.MAY_CHU; }
  function coQuyen() {
    var u = window.NGUOI_DUNG;
    return !!u && ['admin', 'ban_giam_hieu', 'to_truong'].indexOf(u.vai_tro) >= 0;
  }

  var CO_SO = [];     // cơ sở đang hoạt động
  var GHI = {};       // 'tieuChiMa|coSoMa' → bản ghi tdg_co_so
  var LECH = [];      // kết quả hàm tdg_chenh_lech
  var TIEU_CHI = [];  // các tiêu chí có theo_dia_diem (cho bản phụ biểu)
  var NAM = null;
  var SAN_SANG = false;

  function khoa(tcMa, csMa) { return tcMa + '|' + csMa; }

  // ══════════ NẠP ══════════
  // Trả về Promise LUÔN thành công: phần soi địa điểm là lớp thêm, hỏng thì
  // ẩn đi chứ tuyệt đối không được kéo sập cả màn Trường chuẩn Quốc gia.
  function nap(namHoc) {
    NAM = namHoc;
    SAN_SANG = false;
    if (!may()) return Promise.resolve(false);

    return Promise.all([
      may().from('co_so').select('ma, ten, loai, so_tt').eq('hoat_dong', true).order('so_tt'),
      may().from('tdg_co_so').select('*').eq('nam_hoc', namHoc),
      may().rpc('tdg_chenh_lech', { p_nam_hoc: namHoc }),
      // Đọc lại danh mục tiêu chí ở đây thay vì mượn của tcqg.js: bản phụ biểu
      // cần tên của MỌI tiêu chí soi địa điểm, không chỉ tiêu chí đang mở.
      may().from('tieu_chi').select('ma, ten, theo_dia_diem').order('so_tt')
    ]).then(function (r) {
      if (r[0].error || r[1].error) return false;
      CO_SO = r[0].data || [];
      GHI = {};
      (r[1].data || []).forEach(function (d) { GHI[khoa(d.tieu_chi_ma, d.co_so_ma)] = d; });
      LECH = (r[2] && !r[2].error && r[2].data) ? r[2].data : [];
      TIEU_CHI = (r[3] && !r[3].error && r[3].data)
        ? r[3].data.filter(function (t) { return t.theo_dia_diem; }) : [];
      SAN_SANG = true;
      return true;
    }).catch(function () { return false; });
  }

  // Chỉ hiện thẻ khi trường THỰC SỰ có nhiều địa điểm. Trường một điểm mà bày
  // ra bảng "điều kiện từng địa điểm" chỉ tổ rối: cột duy nhất trùng y hệt
  // phần kết luận toàn trường ngay bên cạnh.
  function dung() { return SAN_SANG && CO_SO.length >= 2; }

  // ══════════ BĂNG CẢNH BÁO CHÊNH LỆCH ══════════
  function canhBao() {
    if (!dung() || !LECH.length) return '';

    var theoTC = {};
    LECH.forEach(function (l) {
      (theoTC[l.tieu_chi_ma] = theoTC[l.tieu_chi_ma] || []).push(l);
    });

    return '<div class="hd-kiem do" style="margin:0 0 14px">' +
      '🔴 <b>Có ' + LECH.length + ' chỗ kết luận chung là đạt nhưng một địa điểm chưa đạt.</b>' +
      '<div style="margin-top:6px;font-size:13.6px">' +
      Object.keys(theoTC).sort().map(function (ma) {
        return '<div style="margin-top:3px"><b>' + thoat(ma) + '</b> — ' +
          theoTC[ma].map(function (l) {
            return thoat(l.co_so_ten) + ' (mức ' + l.muc_vuong + ')';
          }).join(' · ') + '</div>';
      }).join('') +
      '</div>' +
      '<div style="margin-top:8px;font-size:13.4px">Mức của toàn trường phải phản ánh được cả ' +
      'những địa điểm này. Chỗ nào còn thiếu thì đưa thành một dòng trong kế hoạch cải tiến.</div>' +
      '</div>';
  }

  // ══════════ THẺ ĐỊA ĐIỂM CỦA MỘT TIÊU CHÍ ══════════
  function ve(c) {
    if (!dung()) {
      return '<div class="ct-tomtat">Trường chỉ có một địa điểm nên không cần soi riêng.</div>';
    }

    var mucTT = c.self || 0;

    return '<div class="yc"><div class="yc-nhan">📍 Điều kiện tại từng địa điểm</div>' +
      '<p>Tiêu chí này có điều kiện khác nhau giữa các địa điểm, nên phải ghi riêng cho từng nơi. ' +
      'Kết luận chung của toàn trường vẫn ở thẻ <b>Kết luận</b> — phần dưới đây là căn cứ để ' +
      'kết luận đó không bỏ sót nơi nào.</p></div>' +

      '<div class="cs-ds">' + CO_SO.map(function (cs) {
        var g = GHI[khoa(c.ma, cs.ma)] || {};
        var chuaXet = g.dat_m1 === undefined || g.dat_m1 === null;
        // Lệch = toàn trường kết luận đạt mà nơi này đã xét và chưa đạt.
        var lech = mucTT >= 1 && (g.dat_m1 === false || (mucTT >= 2 && g.dat_m2 === false));

        return '<div class="cs-the' + (lech ? ' lech' : '') + '">' +
          '<div class="cs-dau"><b>' + thoat(cs.ten) + '</b>' +
          '<span class="cs-loai">' + (cs.loai === 'chinh' ? 'Trường chính'
            : cs.loai === 'phan_hieu' ? 'Phân hiệu' : 'Điểm trường') + '</span></div>' +

          nutMuc(c.ma, cs.ma, 1, g.dat_m1) +
          // Mức 2 chỉ hỏi khi toàn trường tự nhận mức 2 — hỏi sớm hơn là bắt
          // hội đồng chấm một mức mà trường chưa xét tới.
          (mucTT >= 2 ? nutMuc(c.ma, cs.ma, 2, g.dat_m2) : '') +

          (coQuyen()
            ? '<textarea class="cs-o" rows="2" placeholder="Điều kiện thực tế tại địa điểm này" ' +
              'data-cs-ht="' + thoat(c.ma) + '|' + thoat(cs.ma) + '">' +
              thoat(g.hien_trang || '') + '</textarea>' +
              '<textarea class="cs-o" rows="2" placeholder="Còn thiếu gì so với mức đang xét" ' +
              'data-cs-hc="' + thoat(c.ma) + '|' + thoat(cs.ma) + '">' +
              thoat(g.han_che || '') + '</textarea>'
            : (g.hien_trang ? '<p class="cs-chu">' + thoat(g.hien_trang) + '</p>' : '') +
              (g.han_che ? '<p class="cs-chu thieu"><b>Còn thiếu:</b> ' + thoat(g.han_che) + '</p>' : '')) +

          (chuaXet ? '<div class="cs-nhac">Chưa xét địa điểm này</div>' : '') +
          (lech ? '<div class="cs-nhac lech">Toàn trường đang kết luận đạt, nơi này chưa đạt</div>' : '') +
          '</div>';
      }).join('') + '</div>' +

      '<div style="margin-top:12px">' +
      '<button class="nut-vien" id="cs-word">📄 Xuất phụ biểu điều kiện từng địa điểm (Word)</button>' +
      '<div class="cs-chu" style="color:var(--chu-mo)">Gồm tất cả tiêu chí cần soi địa điểm, ' +
      'kẹp sau báo cáo tự đánh giá.</div></div>';
  }

  function nutMuc(tcMa, csMa, muc, dat) {
    var k = thoat(tcMa) + '|' + thoat(csMa) + '|' + muc;
    if (!coQuyen()) {
      return '<div class="cs-muc">Mức ' + muc + ': <b class="' +
        (dat ? 'chu-dat' : dat === false ? 'chu-khong' : '') + '">' +
        (dat === true ? 'Đạt' : dat === false ? 'Chưa đạt' : 'chưa xét') + '</b></div>';
    }
    return '<div class="cs-muc">Mức ' + muc + ':' +
      '<button class="pick dat' + (dat === true ? ' on' : '') + '" data-cs-muc="' + k + '|1">Đạt</button>' +
      '<button class="pick khong' + (dat === false ? ' on' : '') + '" data-cs-muc="' + k + '|0">Chưa đạt</button>' +
      '</div>';
  }

  // ══════════ GHI ══════════
  function luu(tcMa, csMa, thay) {
    var cu = GHI[khoa(tcMa, csMa)] || {};
    var ban = {
      nam_hoc: NAM, tieu_chi_ma: tcMa, co_so_ma: csMa,
      dat_m1: cu.dat_m1 === undefined ? null : cu.dat_m1,
      dat_m2: cu.dat_m2 === undefined ? null : cu.dat_m2,
      hien_trang: cu.hien_trang || null,
      han_che: cu.han_che || null,
      cap_nhat_luc: new Date().toISOString()
    };
    Object.keys(thay).forEach(function (k) { ban[k] = thay[k]; });

    // upsert theo đúng khoá duy nhất của sql/41 — không tự đếm id, không xoá
    // rồi chèn lại (xoá rồi chèn thì mất luôn phần người khác vừa ghi).
    return may().from('tdg_co_so')
      .upsert(ban, { onConflict: 'nam_hoc,tieu_chi_ma,co_so_ma' })
      .select().maybeSingle()
      .then(function (r) {
        if (r.error) throw r.error;
        if (r.data) GHI[khoa(tcMa, csMa)] = r.data;
        return r.data;
      });
  }

  // Nối sự kiện sau mỗi lần vẽ. tcqg.js vẽ lại cả khối nên phải nối lại,
  // không giữ được trình xử lý cũ.
  function noiSuKien(goc, veLai) {
    if (!goc) return;

    var nutW = goc.querySelector('#cs-word');
    if (nutW) nutW.addEventListener('click', xuatPhuBieu);

    Array.prototype.slice.call(goc.querySelectorAll('[data-cs-muc]')).forEach(function (b) {
      b.addEventListener('click', function () {
        var p = b.getAttribute('data-cs-muc').split('|');   // tc|cs|muc|dat
        var thay = {};
        var dat = p[3] === '1';
        // Bấm lại đúng nút đang sáng = bỏ chọn, quay về "chưa xét". Không có
        // đường này thì lỡ tay bấm nhầm là không gỡ ra được.
        var g = GHI[khoa(p[0], p[1])] || {};
        var hienTai = p[2] === '1' ? g.dat_m1 : g.dat_m2;
        thay[p[2] === '1' ? 'dat_m1' : 'dat_m2'] = (hienTai === dat) ? null : dat;
        // Mức 1 chuyển sang chưa đạt thì mức 2 không còn nghĩa — xoá theo,
        // đúng luật Biểu 1: chỉ xét Mức 2 khi Mức 1 đã đạt.
        if (p[2] === '1' && thay.dat_m1 !== true) thay.dat_m2 = null;
        luu(p[0], p[1], thay).then(function () { if (veLai) veLai(); });
      });
    });

    ['ht', 'hc'].forEach(function (o) {
      Array.prototype.slice.call(goc.querySelectorAll('[data-cs-' + o + ']')).forEach(function (t) {
        t.addEventListener('blur', function () {
          var p = t.getAttribute('data-cs-' + o).split('|');
          var g = GHI[khoa(p[0], p[1])] || {};
          var truong = o === 'ht' ? 'hien_trang' : 'han_che';
          var moi = t.value.trim() || null;
          if ((g[truong] || null) === moi) return;   // không ghi khi không đổi
          var thay = {}; thay[truong] = moi;
          luu(p[0], p[1], thay);
        });
      });
    });
  }

  // ══════════ PHỤ BIỂU WORD ══════════
  // Bản riêng, KHÔNG chèn vào xuat-bao-cao-tdg.js — tệp đó chạy nguyên văn
  // theo bản Bạch Liêu qua bach-lieu-shim.js, sửa vào là mất đường đối chiếu.
  // Phụ biểu này kẹp sau báo cáo tự đánh giá, đúng cái V.2.b đòi: chứng minh
  // hội đồng đã xem xét điều kiện tại từng địa điểm.
  function thanPhuBieu(dsTieuChi, dsCoSo, ghi, namHoc, W) {
    var bang = dsTieuChi.map(function (tc) {
      var hang = dsCoSo.map(function (cs) {
        var g = ghi[khoa(tc.ma, cs.ma)] || {};
        var mucChu = function (v) {
          return v === true ? 'Đạt' : v === false ? 'Chưa đạt' : '<i>chưa xét</i>';
        };
        return '<tr><td>' + W.chan(cs.ten) + '</td>' +
          '<td class="giua">' + mucChu(g.dat_m1) + '</td>' +
          '<td class="giua">' + mucChu(g.dat_m2) + '</td>' +
          '<td>' + W.chan(g.hien_trang || '') + '</td>' +
          '<td>' + W.chan(g.han_che || '') + '</td></tr>';
      }).join('');

      return '<p style="margin:14pt 0 5pt"><b>' + W.chan(tc.ma) + '. ' + W.chan(tc.ten) + '</b></p>' +
        '<table class="co-dinh"><thead><tr>' +
        '<th style="width:22%">Địa điểm</th><th style="width:10%">Mức 1</th>' +
        '<th style="width:10%">Mức 2</th><th style="width:33%">Điều kiện thực tế</th>' +
        '<th style="width:25%">Còn thiếu</th></tr></thead><tbody>' + hang + '</tbody></table>';
    }).join('');

    return W.theThuc() +
      '<p class="giua" style="margin:18pt 0 0"><b style="font-size:14pt">' +
      'PHỤ BIỂU — ĐIỀU KIỆN GIÁO DỤC TẠI TỪNG ĐỊA ĐIỂM</b></p>' +
      '<p class="giua" style="margin:4pt 0 0"><b>Năm học ' + W.chan(namHoc) + '</b></p>' +
      '<p class="nghieng giua" style="margin:2pt 0 12pt;font-size:12pt">' +
      '(Kèm theo Báo cáo tự đánh giá — Công văn số 5555/BGDĐT-GDPT ngày 18/8/2026, Phụ lục II mục V)</p>' +
      '<p style="font-size:12.5px;margin-bottom:6pt" class="nghieng">' +
      'Việc tự đánh giá xem xét điều kiện và kết quả tại trường chính, phân hiệu và các điểm ' +
      'trường; không chỉ căn cứ điều kiện tại trường chính hoặc kết quả chung của toàn trường.</p>' +
      bang +
      W.khoiKy(null);
  }

  function xuatPhuBieu() {
    var W = window.WORD_TIEN_ICH;
    if (!W || !dung()) return;
    W.taiVe(
      W.khungWord('Phu bieu dia diem ' + NAM, thanPhuBieu(TIEU_CHI, CO_SO, GHI, NAM, W), true),
      'phu-bieu-dieu-kien-tung-dia-diem-' + NAM + '.doc');
  }

  window.TCQG_CO_SO = {
    nap: nap, dung: dung, ve: ve, canhBao: canhBao,
    noiSuKien: noiSuKien, luu: luu, xuatPhuBieu: xuatPhuBieu,
    soCoSo: function () { return CO_SO.length; },
    soLech: function () { return LECH.length; },
    // Cho phép kiểm thử phần dựng văn bản ngoài trình duyệt (node)
    thanPhuBieu: thanPhuBieu
  };
})();
