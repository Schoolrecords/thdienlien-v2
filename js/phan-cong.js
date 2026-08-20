// ============================================================
// phan-cong.js — SỔ PHÂN CÔNG & ỦY QUYỀN
//
// Nhà trường sau sắp xếp phải trả lời được ba câu bất cứ lúc nào:
// AI phụ trách địa điểm nào · ĐƯỢC làm những việc gì · ĐẾN BAO GIỜ.
// Màn này là chỗ giữ ba câu trả lời đó, và tự nhắc khi có địa điểm chưa
// giao ai hoặc có ủy quyền sắp hết hạn.
//
// Căn cứ: CV 5555/BGDĐT-GDPT ngày 18/8/2026, Phụ lục II. Bảng dữ liệu và
// ràng buộc "ủy quyền bắt buộc có thời hạn" nằm ở sql/40.
//
// ⚠️ Màn này CHỈ GHI LẠI văn bản đã ban hành — nó KHÔNG cấp quyền gì trong
//    app. Phân quyền thật vẫn ở nguoi_dung.vai_tro và RLS. Công văn cấm phát
//    sinh cấp quản lý trung gian, nên ghi phân công ở đây không được kéo theo
//    bất kỳ thẩm quyền nào trong hệ thống — xem mục 26.3 sổ dự án.
//
// Đăng ký thẻ qua window.qtTabPhu — KHÔNG sửa quan-tri.js.
// Nạp SAU hop-thoai.js (dùng window.hopHoi).
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

  var DS = [];          // các dòng phân công của năm học đang xem
  var CO_SO = [];       // danh sách cơ sở đang hoạt động
  var THIEU = [];       // cơ sở chưa giao ai phụ trách
  var NAM_XEM = null;
  var DANG_SUA = null;  // bản ghi đang mở trong biểu mẫu; {} = thêm mới

  var TEN_LOAI = { phan_cong: 'Phân công', uy_quyen: 'Ủy quyền' };

  // Tình trạng do khung nhìn v_phan_cong_quan_ly tính sẵn theo ngày hôm nay —
  // cố ý KHÔNG tính lại ở đây: hai nơi cùng tính là sớm muộn lệch nhau.
  var TEN_TT = {
    du_thao:       { chu: 'Dự thảo',        mau: 'var(--chu-mo)' },
    chua_hieu_luc: { chu: 'Chưa đến hạn',   mau: 'var(--chu-mo)' },
    dang_hieu_luc: { chu: '✔ Đang hiệu lực', mau: 'var(--ok)' },
    sap_het_han:   { chu: '⏳ Sắp hết hạn',  mau: '#c26a1f' },
    da_het_han:    { chu: '✘ Đã hết hạn',   mau: 'var(--thieu)' },
    thu_hoi:       { chu: 'Đã thu hồi',     mau: 'var(--thieu)' }
  };

  function ngayVN(s) {
    if (!s) return '';
    var p = String(s).split('-');
    return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : String(s);
  }

  // ══════════ ĐỌC DỮ LIỆU ══════════
  function nap(hop) {
    NAM_XEM = NAM_XEM || nam();
    hop.innerHTML = '<div class="the-thong-bao">Đang tải…</div>';

    // Chế độ xem thử không có kết nối cơ sở dữ liệu. Không chắn ở đây thì
    // may().from(...) ném lỗi NGAY (lỗi đồng bộ, không rơi vào .catch của
    // Promise) và màn đứng mãi ở chữ "Đang tải…".
    if (!may()) {
      hop.innerHTML =
        '<div class="the-thong-bao" style="text-align:center;padding:26px">' +
        '<div style="font-size:34px">🧑‍💼</div>' +
        '<p style="margin-top:8px"><b>Sổ phân công – ủy quyền</b></p>' +
        '<p style="font-size:14px;color:var(--chu-mo);margin-top:6px">' +
        'Mục này làm việc với dữ liệu thật của nhà trường nên cần đăng nhập.<br>' +
        'Bản xem thử chưa nối cơ sở dữ liệu.</p></div>';
      return;
    }

    Promise.all([
      may().from('v_phan_cong_quan_ly').select('*')
        .eq('nam_hoc', NAM_XEM)
        .order('co_so_ma', { ascending: true, nullsFirst: true })
        .order('loai').order('ho_ten'),
      may().from('co_so').select('ma, ten, loai, so_tt').eq('hoat_dong', true).order('so_tt'),
      may().rpc('co_so_chua_phan_cong', { p_nam_hoc: NAM_XEM })
    ]).then(function (r) {
      if (r[0].error) throw r[0].error;
      DS = r[0].data || [];
      CO_SO = (r[1].data) || [];
      // Lời nhắc thiếu người phụ trách là phần PHỤ: hàm lỗi thì bỏ lời nhắc
      // chứ không được làm hỏng cả màn — sổ phân công vẫn phải xem được.
      THIEU = (r[2] && !r[2].error && r[2].data) ? r[2].data : [];
      ve(hop);
    }).catch(function (e) {
      hop.innerHTML =
        '<div class="hd-kiem do"><b>Chưa mở được sổ phân công.</b><br>' +
        'Nếu đây là lần đầu dùng mục này, nhà trường cần cài đặt bổ sung một lần ' +
        '(tệp <code>sql/40</code>) — báo người phụ trách hệ thống.' +
        '<div style="margin-top:6px;font-size:13px;opacity:.8">' + thoat(e.message || e) + '</div></div>';
    });
  }

  // ══════════ LỜI NHẮC ══════════
  function veNhac() {
    var ra = '';

    if (THIEU.length) {
      ra += '<div class="hd-kiem vang" style="margin-bottom:12px">' +
        '⚠ <b>Có ' + THIEU.length + ' địa điểm chưa giao ai phụ trách:</b> ' +
        THIEU.map(function (c) { return thoat(c.ten); }).join(' · ') +
        '<div style="margin-top:5px;font-size:13.4px">Mỗi điểm trường cần một người làm đầu mối ' +
        'để xử lý công việc thường ngày và báo cáo về trường chính.</div></div>';
    }

    var het = DS.filter(function (d) { return d.tinh_trang === 'da_het_han'; });
    var sap = DS.filter(function (d) { return d.tinh_trang === 'sap_het_han'; });

    if (het.length) {
      ra += '<div class="hd-kiem do" style="margin-bottom:12px">' +
        '🔴 <b>' + het.length + ' văn bản đã hết hạn</b> nhưng chưa có văn bản thay thế: ' +
        het.map(function (d) { return thoat(d.ho_ten) + ' (đến ' + ngayVN(d.den_ngay) + ')'; }).join(' · ') +
        '<div style="margin-top:5px;font-size:13.4px">Cần ban hành văn bản mới, hoặc đánh dấu thu hồi ' +
        'nếu không tiếp tục giao nữa.</div></div>';
    }
    if (sap.length) {
      ra += '<div class="hd-kiem vang" style="margin-bottom:12px">' +
        '⏳ <b>' + sap.length + ' văn bản sắp hết hạn trong 30 ngày tới:</b> ' +
        sap.map(function (d) {
          return thoat(d.ho_ten) + ' (còn ' + d.con_lai_ngay + ' ngày)';
        }).join(' · ') + '</div>';
    }
    return ra;
  }

  // ══════════ DANH SÁCH ══════════
  // Cố ý KHÔNG dùng bảng. Đã thử: bảy cột trong đó có hai cột văn xuôi dài,
  // trên màn điện thoại 430px cột "Nội dung" bị bóp còn một chữ mỗi dòng,
  // đọc không nổi. Thẻ xếp dọc thì điện thoại đọc được thẳng, màn rộng xếp
  // hai cột — thầy Chung làm việc chủ yếu bằng điện thoại.
  function veDanhSach() {
    if (!DS.length) {
      return '<div class="the-thong-bao" style="text-align:center;padding:26px">' +
        '<div style="font-size:34px">🗂️</div>' +
        '<p style="margin-top:8px"><b>Năm học ' + thoat(NAM_XEM) + ' chưa có văn bản nào trong sổ.</b></p>' +
        '<p style="font-size:14px;color:var(--chu-mo);margin-top:6px">' +
        'Bắt đầu bằng việc ghi lại quyết định phân công nhiệm vụ đầu năm học.</p></div>';
    }

    return '<div class="pc-ds">' + DS.map(function (d) {
      var tt = TEN_TT[d.tinh_trang] || { chu: d.tinh_trang, mau: 'var(--chu-mo)' };
      var uq = d.loai === 'uy_quyen';

      return '<div class="pc-the' + (uq ? ' uy-quyen' : '') + '">' +

        '<div class="pc-dau">' +
        '<div><b>' + thoat(d.ho_ten) + '</b>' +
        (d.chuc_vu ? '<div class="pc-nho">' + thoat(d.chuc_vu) + '</div>' : '') + '</div>' +
        '<span class="pc-tt" style="color:' + tt.mau + '">' + tt.chu + '</span>' +
        '</div>' +

        '<div class="pc-hieu">' +
        '<span class="pc-nhan' + (uq ? ' cam' : '') + '">' + (uq ? 'Ủy quyền' : 'Phân công') + '</span>' +
        '<span class="pc-nhan">📍 ' + thoat(d.pham_vi_dia_diem) + '</span>' +
        (d.linh_vuc ? '<span class="pc-nhan">' + thoat(d.linh_vuc) + '</span>' : '') +
        '</div>' +

        '<p class="pc-noi-dung">' + thoat(d.noi_dung) + '</p>' +
        (d.pham_vi ? '<p class="pc-nho"><b>Phạm vi:</b> ' + thoat(d.pham_vi) + '</p>' : '') +

        '<div class="pc-chan">' +
        '<span>🗓 ' + ngayVN(d.tu_ngay) +
        (d.den_ngay ? ' → ' + ngayVN(d.den_ngay) : ' → đến khi có văn bản thay thế') + '</span>' +
        (d.so_qd || d.link_drive
          ? '<span>📄 ' + thoat(d.so_qd || 'chưa ghi số') +
            (d.link_drive
              ? ' <a href="' + thoat(d.link_drive) + '" target="_blank" rel="noopener">xem bản ký</a>'
              : '') + '</span>'
          : '<span class="pc-thieu-vb">📄 chưa có văn bản</span>') +
        '</div>' +

        (laQT()
          ? '<div class="pc-nut"><button class="nut-luu-nd" data-sua="' + d.id + '">Sửa</button>' +
            '<button class="nut-xoa-nd" data-xoa="' + d.id + '">Xoá</button></div>'
          : '') +
        '</div>';
    }).join('') + '</div>';
  }

  // ══════════ XUẤT WORD ══════════
  // Bản TỔNG HỢP để kẹp vào hồ sơ và làm minh chứng, KHÔNG phải quyết định.
  // Cố ý không tự sinh quyết định: phần "Căn cứ…" của một quyết định phải do
  // nhà trường tự chịu trách nhiệm về pháp lý, máy đặt hộ là đặt sai lúc nào
  // không biết. Bản này chỉ tổng hợp lại đúng những gì trường đã ghi vào sổ.
  // Phần dựng thân văn bản tách riêng thành HÀM THUẦN (chỉ nhận tham số, không
  // đọc biến ngoài) để kiểm thử được bằng node — cùng cách sao-luu.js đã làm
  // với phần sinh SQL. Thể thức Nghị định 30 là chỗ dự án đã trả giá nhiều
  // lần, phải soi được bản dựng ra mà không cần mở trình duyệt.
  function thanWord(ds, namHoc, W) {
    var hang = ds.map(function (d, i) {
      return '<tr>' +
        '<td class="giua">' + (i + 1) + '</td>' +
        '<td><b>' + W.chan(d.ho_ten) + '</b>' +
        (d.chuc_vu ? '<br>' + W.chan(d.chuc_vu) : '') + '</td>' +
        '<td class="giua">' + (d.loai === 'uy_quyen' ? 'Ủy quyền' : 'Phân công') + '</td>' +
        '<td>' + W.chan(d.pham_vi_dia_diem) + '</td>' +
        '<td>' + W.chan(d.noi_dung) +
        (d.pham_vi ? '<br><i>Phạm vi: ' + W.chan(d.pham_vi) + '</i>' : '') + '</td>' +
        '<td class="giua">' + ngayVN(d.tu_ngay) +
        (d.den_ngay ? '<br>đến ' + ngayVN(d.den_ngay) : '<br><i>đến khi thay thế</i>') + '</td>' +
        '<td class="giua">' + W.chan(d.so_qd || '') + '</td>' +
        '</tr>';
    }).join('');

    return W.theThuc() +
      '<p class="giua" style="margin:18pt 0 0"><b style="font-size:14pt">' +
      'BẢNG TỔNG HỢP PHÂN CÔNG NHIỆM VỤ VÀ ỦY QUYỀN</b></p>' +
      '<p class="giua" style="margin:4pt 0 0"><b>Năm học ' + W.chan(namHoc) + '</b></p>' +
      '<p class="nghieng giua" style="margin:2pt 0 14pt;font-size:12pt">' +
      '(Tổng hợp các văn bản đã ban hành, phục vụ theo dõi và lưu hồ sơ)</p>' +

      '<table class="co-dinh"><thead><tr>' +
      '<th style="width:5%">TT</th><th style="width:17%">Họ và tên, chức vụ</th>' +
      '<th style="width:9%">Hình thức</th><th style="width:15%">Địa điểm phụ trách</th>' +
      '<th style="width:32%">Nội dung nhiệm vụ, phạm vi</th>' +
      '<th style="width:12%">Thời hạn</th><th style="width:10%">Số văn bản</th>' +
      '</tr></thead><tbody>' + hang + '</tbody></table>' +

      '<p style="margin-top:12pt;font-size:12pt" class="nghieng">' +
      'Tổng số: ' + ds.length + ' văn bản, trong đó ' +
      ds.filter(function (d) { return d.loai === 'uy_quyen'; }).length + ' văn bản ủy quyền.</p>' +

      W.khoiKy(null);
  }

  function xuatWord() {
    var W = window.WORD_TIEN_ICH;
    if (!W) { window.hopHoi('Chưa nạp được khung xuất Word.'); return; }
    // Trang NGANG: bảy cột, trong đó có cột văn xuôi dài — dựng dọc thì cột
    // nội dung bị bóp, đúng lỗi đã gặp ở giao diện.
    W.taiVe(W.khungWord('Phân công - Ủy quyền ' + NAM_XEM, thanWord(DS, NAM_XEM, W), true),
      'phan-cong-uy-quyen-' + NAM_XEM + '.doc');
  }

  // ══════════ BIỂU MẪU ══════════
  function o(nhan, ten, giaTri, kieu, goiY) {
    return '<label class="pc-o"><span>' + thoat(nhan) + '</span>' +
      '<input name="' + ten + '" type="' + (kieu || 'text') + '" value="' + thoat(giaTri || '') + '"' +
      (goiY ? ' placeholder="' + thoat(goiY) + '"' : '') + '></label>';
  }

  function veBieuMau() {
    var d = DANG_SUA || {};
    var ds = (window.DS_TAI_KHOAN || []).slice().sort(function (a, b) {
      return String(a.ho_ten || '').localeCompare(String(b.ho_ten || ''), 'vi');
    });

    return '<div class="the-thong-bao" id="pc-bieu-mau" style="margin-bottom:16px">' +
      '<b>' + (d.id ? 'Sửa văn bản trong sổ' : 'Ghi một văn bản vào sổ') + '</b>' +

      '<div class="pc-luoi" style="margin-top:12px">' +

      '<label class="pc-o"><span>Người được giao *</span><select name="nguoi_dung_id">' +
      '<option value="">— chọn trong danh sách —</option>' +
      ds.map(function (u) {
        return '<option value="' + thoat(u.id) + '"' +
          (d.nguoi_dung_id === u.id ? ' selected' : '') + '>' +
          thoat(u.ho_ten) + (u.chuc_vu ? ' — ' + thoat(u.chuc_vu) : '') + '</option>';
      }).join('') + '</select></label>' +

      '<label class="pc-o"><span>Việc *</span><select name="loai">' +
      '<option value="phan_cong"' + (d.loai !== 'uy_quyen' ? ' selected' : '') + '>Phân công nhiệm vụ</option>' +
      '<option value="uy_quyen"' + (d.loai === 'uy_quyen' ? ' selected' : '') + '>Ủy quyền của Hiệu trưởng</option>' +
      '</select></label>' +

      '<label class="pc-o"><span>Địa điểm phụ trách</span><select name="co_so_ma">' +
      '<option value="">Toàn trường</option>' +
      CO_SO.map(function (c) {
        return '<option value="' + thoat(c.ma) + '"' +
          (d.co_so_ma === c.ma ? ' selected' : '') + '>' + thoat(c.ten) + '</option>';
      }).join('') + '</select></label>' +

      o('Lĩnh vực', 'linh_vuc', d.linh_vuc, 'text', 'Chuyên môn · Cơ sở vật chất · Bán trú…') +

      '<label class="pc-o pc-rong"><span>Nội dung nhiệm vụ / nội dung ủy quyền *</span>' +
      '<textarea name="noi_dung" rows="2">' + thoat(d.noi_dung || '') + '</textarea></label>' +

      '<label class="pc-o pc-rong"><span>Phạm vi giải quyết công việc</span>' +
      '<textarea name="pham_vi" rows="2" placeholder="Được ký những loại văn bản nào, quyết những việc gì, việc gì phải xin ý kiến">' +
      thoat(d.pham_vi || '') + '</textarea></label>' +

      o('Từ ngày *', 'tu_ngay', d.tu_ngay, 'date') +
      o('Đến ngày', 'den_ngay', d.den_ngay, 'date') +
      o('Số văn bản', 'so_qd', d.so_qd, 'text', '12/QĐ-THDL') +
      o('Ngày văn bản', 'ngay_qd', d.ngay_qd, 'date') +

      '<label class="pc-o pc-rong"><span>Đường dẫn bản đã ký trên Drive</span>' +
      '<input name="link_drive" type="url" value="' + thoat(d.link_drive || '') + '" placeholder="https://drive.google.com/…"></label>' +

      '<label class="pc-o"><span>Tình trạng</span><select name="trang_thai">' +
      ['du_thao', 'hieu_luc', 'thu_hoi'].map(function (t) {
        var ten = { du_thao: 'Dự thảo', hieu_luc: 'Đã ban hành', thu_hoi: 'Đã thu hồi' }[t];
        return '<option value="' + t + '"' +
          ((d.trang_thai || 'hieu_luc') === t ? ' selected' : '') + '>' + ten + '</option>';
      }).join('') + '</select></label>' +

      '</div>' +

      '<div class="hd-kiem vang" id="pc-nhac-han" style="margin-top:10px">' +
      'Ủy quyền <b>bắt buộc phải có ngày kết thúc</b>. Phân công nhiệm vụ thường xuyên thì để trống ' +
      'ô “Đến ngày”, nghĩa là có hiệu lực đến khi có văn bản khác thay thế.</div>' +

      '<p class="ht-loi" id="pc-loi" hidden></p>' +

      '<div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap">' +
      '<button class="nut-chinh" id="pc-luu">Lưu vào sổ</button>' +
      '<button class="nut-vien" id="pc-huy">Huỷ</button>' +
      '</div></div>';
  }

  function docBieuMau(hop) {
    var g = function (t) {
      var e = hop.querySelector('[name="' + t + '"]');
      return e ? String(e.value || '').trim() : '';
    };
    var ds = window.DS_TAI_KHOAN || [];
    var id = g('nguoi_dung_id');
    var u = ds.filter(function (x) { return x.id === id; })[0];

    return {
      nam_hoc:       NAM_XEM,
      nguoi_dung_id: id || null,
      // Chép cứng họ tên và chức vụ tại thời điểm ghi: văn bản đã ban hành thì
      // phải đọc lại được nguyên văn, kể cả sau khi người đó rời trường.
      ho_ten:        u ? u.ho_ten : '',
      chuc_vu:       u ? (u.chuc_vu || null) : null,
      loai:          g('loai') || 'phan_cong',
      co_so_ma:      g('co_so_ma') || null,
      linh_vuc:      g('linh_vuc') || null,
      noi_dung:      g('noi_dung'),
      pham_vi:       g('pham_vi') || null,
      tu_ngay:       g('tu_ngay') || null,
      den_ngay:      g('den_ngay') || null,
      so_qd:         g('so_qd') || null,
      ngay_qd:       g('ngay_qd') || null,
      link_drive:    g('link_drive') || null,
      trang_thai:    g('trang_thai') || 'hieu_luc'
    };
  }

  function baoLoi(hop, chu) {
    var e = hop.querySelector('#pc-loi');
    if (!e) return;
    e.textContent = chu;
    e.hidden = false;
    e.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }

  function luu(hop) {
    var b = docBieuMau(hop);

    if (!b.nguoi_dung_id) return baoLoi(hop, 'Chưa chọn người được giao.');
    if (!b.noi_dung)      return baoLoi(hop, 'Chưa ghi nội dung nhiệm vụ.');
    if (!b.tu_ngay)       return baoLoi(hop, 'Chưa ghi ngày bắt đầu.');
    // Chặn ngay tại đây cho người dùng thấy lời tiếng Việt. CSDL cũng chặn
    // (ràng buộc uy_quyen_phai_co_thoi_han ở sql/40) — hai lớp, vì có thể nhập
    // thẳng qua Supabase mà không đi qua màn này.
    if (b.loai === 'uy_quyen' && !b.den_ngay) {
      return baoLoi(hop, 'Ủy quyền phải ghi ngày kết thúc. Nếu giao lâu dài không thời hạn ' +
        'thì đó là phân công nhiệm vụ, hãy chọn lại ở ô “Việc”.');
    }
    if (b.den_ngay && b.den_ngay < b.tu_ngay) {
      return baoLoi(hop, 'Ngày kết thúc đang trước ngày bắt đầu.');
    }

    var nut = hop.querySelector('#pc-luu');
    if (nut) { nut.disabled = true; nut.textContent = 'Đang lưu…'; }

    var q = (DANG_SUA && DANG_SUA.id)
      ? may().from('phan_cong_quan_ly').update(b).eq('id', DANG_SUA.id)
      : may().from('phan_cong_quan_ly').insert(b);

    q.then(function (r) {
      if (r.error) throw r.error;
      DANG_SUA = null;
      nap(hop);
    }).catch(function (e) {
      if (nut) { nut.disabled = false; nut.textContent = 'Lưu vào sổ'; }
      // 23514 = vi phạm ràng buộc check của CSDL. Dịch sang lời người đọc hiểu
      // được, chứ không ném nguyên câu tiếng Anh của Postgres lên màn hình.
      baoLoi(hop, e.code === '23514'
        ? 'Ủy quyền phải có ngày kết thúc, và ngày kết thúc không được trước ngày bắt đầu.'
        : (e.message || 'Không lưu được.'));
    });
  }

  function xoa(hop, id) {
    var d = DS.filter(function (x) { return String(x.id) === String(id); })[0] || {};
    window.hopHoi({
      tieuDe: 'Xoá khỏi sổ phân công?',
      noiDung: 'Xoá dòng của ' + (d.ho_ten || '') + '. Văn bản đã ban hành thì nên đánh dấu ' +
               '“Đã thu hồi” thay vì xoá — xoá là mất dấu vết trong sổ.',
      nutOK: 'Vẫn xoá', nguyHiem: true
    }).then(function (dong_y) {
      if (!dong_y) return;
      may().from('phan_cong_quan_ly').delete().eq('id', id).then(function (r) {
        if (r.error) { baoLoi(hop, r.error.message); return; }
        nap(hop);
      });
    });
  }

  // ══════════ VẼ ══════════
  function ve(hop) {
    var namTruoc = String(+NAM_XEM.split('-')[0] - 1) + '-' + NAM_XEM.split('-')[0];
    var namSau   = NAM_XEM.split('-')[1] + '-' + String(+NAM_XEM.split('-')[1] + 1);

    hop.innerHTML =
      '<div class="the-thong-bao" style="margin-bottom:14px">' +
      '<b>Sổ ghi việc phân công và ủy quyền của Hiệu trưởng.</b> ' +
      'Mỗi người được giao việc gì, ở địa điểm nào, trong thời hạn bao lâu — ghi vào đây một lần, ' +
      'cả trường tra được và khỏi phải tìm lại quyết định giấy.' +
      '<div style="margin-top:7px;font-size:13.6px;color:var(--chu-mo)">' +
      'Việc <b>ủy quyền</b> — giao người khác thay Hiệu trưởng giải quyết một số việc — phải có ' +
      'văn bản và phải ghi rõ thời hạn. Hệ thống sẽ nhắc trước 30 ngày khi sắp hết hạn.</div></div>' +

      '<div class="chip-hang" style="margin:0 0 14px">' +
      '<button class="chip-loc" data-nam="' + namTruoc + '">← ' + namTruoc + '</button>' +
      '<button class="chip-loc on">' + thoat(NAM_XEM) + '</button>' +
      '<button class="chip-loc" data-nam="' + namSau + '">' + namSau + ' →</button>' +
      '</div>' +

      veNhac() +
      (DANG_SUA ? veBieuMau() : '') +
      (!DANG_SUA
        ? '<div style="margin-bottom:12px;display:flex;gap:8px;flex-wrap:wrap">' +
          (laQT() ? '<button class="nut-chinh" id="pc-them">+ Ghi văn bản vào sổ</button>' : '') +
          (DS.length ? '<button class="nut-vien" id="pc-word">📄 Xuất bảng tổng hợp (Word)</button>' : '') +
          '</div>'
        : '') +
      veDanhSach();

    // ── nối sự kiện ──
    Array.prototype.slice.call(hop.querySelectorAll('[data-nam]')).forEach(function (b) {
      b.addEventListener('click', function () {
        NAM_XEM = b.getAttribute('data-nam'); DANG_SUA = null; nap(hop);
      });
    });
    var them = hop.querySelector('#pc-them');
    if (them) them.addEventListener('click', function () { DANG_SUA = {}; ve(hop); });
    var word = hop.querySelector('#pc-word');
    if (word) word.addEventListener('click', xuatWord);
    var huy = hop.querySelector('#pc-huy');
    if (huy) huy.addEventListener('click', function () { DANG_SUA = null; ve(hop); });
    var nutLuu = hop.querySelector('#pc-luu');
    if (nutLuu) nutLuu.addEventListener('click', function () { luu(hop); });

    Array.prototype.slice.call(hop.querySelectorAll('[data-sua]')).forEach(function (b) {
      b.addEventListener('click', function () {
        var id = b.getAttribute('data-sua');
        DANG_SUA = DS.filter(function (x) { return String(x.id) === String(id); })[0] || {};
        ve(hop);
        var bm = hop.querySelector('#pc-bieu-mau');
        if (bm) bm.scrollIntoView({ block: 'start', behavior: 'smooth' });
      });
    });
    Array.prototype.slice.call(hop.querySelectorAll('[data-xoa]')).forEach(function (b) {
      b.addEventListener('click', function () { xoa(hop, b.getAttribute('data-xoa')); });
    });

    // Ô "Đến ngày" bắt buộc hay không là tuỳ loại việc — đổi ô Việc thì lời
    // nhắc phải đổi theo, không thì người dùng chỉ biết mình sai lúc bấm Lưu.
    var oLoai = hop.querySelector('[name="loai"]');
    var oDen  = hop.querySelector('[name="den_ngay"]');
    var nhac  = hop.querySelector('#pc-nhac-han');
    if (oLoai && oDen && nhac) {
      var doi = function () {
        var uq = oLoai.value === 'uy_quyen';
        oDen.required = uq;
        nhac.innerHTML = uq
          ? '🔴 Đây là <b>ủy quyền</b> — bắt buộc ghi ngày kết thúc và nên kèm văn bản đã ký.'
          : 'Phân công nhiệm vụ thường xuyên thì để trống ô “Đến ngày”: có hiệu lực đến khi có ' +
            'văn bản khác thay thế.';
        nhac.className = uq ? 'hd-kiem do' : 'hd-kiem vang';
        nhac.style.marginTop = '10px';
      };
      oLoai.addEventListener('change', doi);
      doi();
    }
  }

  // Cho phép kiểm thử phần dựng văn bản ngoài trình duyệt (node)
  window.PHAN_CONG_TIEN_ICH = { thanWord: thanWord, ngayVN: ngayVN };

  window.qtTabPhu = window.qtTabPhu || [];
  window.qtTabPhu.push({
    ma: 'pc', ten: '🧑‍💼 Phân công – Ủy quyền',
    ve: function (hop) { nap(hop); }
  });
})();
