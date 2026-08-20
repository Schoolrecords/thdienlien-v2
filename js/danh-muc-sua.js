// ============================================================
// danh-muc-sua.js — NHÀ TRƯỜNG TỰ SỬA DANH MỤC HỒ SƠ
//
// Thầy Chung chốt 20/8/2026: danh mục 101 đầu hồ sơ theo Điều lệ TT 15/2026
// chỉ là KHUNG MẪU GỢI Ý. Mỗi trường tự thêm, sửa, xoá theo nhu cầu của mình —
// trường không có chi bộ riêng, không tổ chức Đội, không bán trú thì phải bỏ
// được những dòng đó đi, và thêm được hồ sơ riêng của trường.
//
// Quyền và hàm máy chủ: sql/49.
//   · Thêm / xoá / đổi cấu trúc  → chỉ Ban giám hiệu (policy + trigger chặn)
//   · Trạng thái, link, ghi chú  → người được giao vẫn tự sửa (js/hoso-sua.js)
//
// 🔑 MÃ MC DO MÁY ĐẶT, không cho gõ tay. Gọi rpc ma_ho_so_tiep_theo(tiêu chí)
//    lấy số còn trống nhỏ nhất. Để tự gõ là sớm muộn cũng trùng, mà ho_so.ma
//    là khoá duy nhất — lúc đó lỗi nổ ra giữa lúc người ta đang nhập dở.
//
// 🔑 XOÁ ĐI QUA rpc xoa_ho_so_an_toan: hồ sơ còn link Drive thì link được cất
//    vào kho lưu trữ trước khi dòng biến mất. Xoá thẳng là mất dấu cả một thư
//    mục minh chứng.
//
// Đăng ký thẻ qua window.qtTabPhu — KHÔNG sửa quan-tri.js.
// ============================================================
(function () {
  'use strict';

  function thoat(s) { return window.thoatHTML ? window.thoatHTML(s) : String(s || ''); }
  function may() { return window.MAY_CHU; }
  function laQT() {
    var u = window.NGUOI_DUNG;
    return !!u && (u.vai_tro === 'admin' || u.vai_tro === 'ban_giam_hieu');
  }

  var TANG = {
    A: { ten: 'A — bắt buộc theo văn bản', mau: 'var(--thieu)',
         nhac: 'Điều lệ, thông tư nêu đích danh. Không ai được bỏ.' },
    B: { ten: 'B — minh chứng TT57', mau: '#c26a1f',
         nhac: 'Phụ lục III TT57 gợi ý để chứng minh tiêu chí. Hội đồng tự đánh giá quyết.' },
    C: { ten: 'C — nội bộ nhà trường', mau: 'var(--ok)',
         nhac: 'Trường tự đặt cho tiện quản lý. Bỏ được, không sao cả.' }
  };

  var DS = [];        // danh mục hiện có
  var HOP = [];       // nhom_con
  var LOC_HOP = '';   // '' = mọi hộp
  var DANG_TAI = false;
  var LOI = null;
  var DA_NAP = false;   // cờ RIÊNG — bài học mục 30.3
  var DANG_THEM = false;

  // ══════════ ĐỌC ══════════
  function nap(veLai) {
    if (!may()) { LOI = 'chua_ket_noi'; DA_NAP = true; veLai(); return; }
    DANG_TAI = true; DA_NAP = true; LOI = null; veLai();

    Promise.all([
      may().from('ho_so').select('ma, ten, nhom_con_id, trang_thai, link_drive, tieu_chi, ' +
                                 'tang, can_cu, ap_dung, nguoi_phu_trach, so_tt').order('ma'),
      may().from('nhom_con').select('id, ma, ten, so_tt').order('so_tt')
    ]).then(function (r) {
      DANG_TAI = false;
      if (r[0].error) throw r[0].error;
      if (r[1].error) throw r[1].error;
      DS = r[0].data || [];
      HOP = r[1].data || [];
      veLai();
    }).catch(function (e) {
      DANG_TAI = false; LOI = e.message || String(e); veLai();
    });
  }

  function tenHop(id) {
    var h = HOP.filter(function (x) { return x.id === id; })[0];
    return h ? h.ten : '—';
  }

  // ══════════ VẼ ══════════
  function ve(hop) {
    if (!DA_NAP) { nap(function () { ve(hop); }); return; }
    if (DANG_TAI) { hop.innerHTML = '<div class="the-thong-bao">Đang tải danh mục…</div>'; return; }

    if (LOI === 'chua_ket_noi') {
      hop.innerHTML = '<div class="the-thong-bao" style="text-align:center;padding:24px">' +
        '<p><b>Bản xem thử chưa nối cơ sở dữ liệu.</b></p></div>';
      return;
    }
    if (LOI) {
      hop.innerHTML = '<div class="hd-kiem do"><b>Chưa mở được danh mục.</b><br>' +
        'Nếu đây là lần đầu dùng mục này, nhà trường cần cài đặt bổ sung một lần ' +
        '(tệp <code>sql/49</code>) — báo người phụ trách hệ thống.' +
        '<div style="margin-top:6px;font-size:13px;opacity:.8">' + thoat(LOI) + '</div></div>';
      return;
    }

    var loc = LOC_HOP ? DS.filter(function (h) { return String(h.nhom_con_id) === LOC_HOP; }) : DS;
    var demTang = { A: 0, B: 0, C: 0 };
    DS.forEach(function (h) { if (demTang[h.tang] !== undefined) demTang[h.tang]++; });

    hop.innerHTML =
      '<div class="yc" style="margin-top:14px"><div class="yc-nhan">📋 Danh mục hồ sơ của trường</div>' +
      '<p>Danh mục dựng sẵn theo Điều lệ <b>Thông tư 15/2026</b> là <b>khung gợi ý</b>. ' +
      'Nhà trường thêm hồ sơ của riêng mình, bỏ những dòng không dùng, sửa tên cho hợp thực tế. ' +
      'Cột <b>Tầng</b> cho biết dòng nào bỏ được: ' +
      Object.keys(TANG).map(function (k) {
        return '<b style="color:' + TANG[k].mau + '">' + k + '</b> ' + demTang[k];
      }).join(' · ') + '.</p></div>' +

      thanhCongCu(loc.length) +
      (DANG_THEM ? oThem() : '') +
      bangDanhMuc(loc);

    noiSuKien(hop);
  }

  function thanhCongCu(soHien) {
    return '<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin:4px 0 12px">' +
      '<select id="dm-loc-hop"><option value="">— mọi hộp (' + DS.length + ' hồ sơ) —</option>' +
      HOP.map(function (h) {
        var n = DS.filter(function (x) { return x.nhom_con_id === h.id; }).length;
        return '<option value="' + h.id + '"' + (LOC_HOP === String(h.id) ? ' selected' : '') + '>' +
          thoat(h.ten) + ' (' + n + ')</option>';
      }).join('') + '</select>' +
      (laQT()
        ? '<button class="nut-luu-nd" id="dm-them">+ Thêm đầu hồ sơ</button>'
        : '<span style="font-size:13.4px;color:var(--chu-mo)">Chỉ Ban giám hiệu sửa được danh mục.</span>') +
      '<span style="font-size:13.4px;color:var(--chu-mo)">Đang xem ' + soHien + ' hồ sơ</span>' +
      '</div>';
  }

  function oThem() {
    var tc = [];
    (window.TIEU_CHI || []).forEach(function (t) { tc.push(t.ma); });
    if (!tc.length) tc = ['1.1','1.2','1.3','1.4','2.1','2.2','2.3','3.1','3.2','3.3','3.4','3.5','4.1','4.2','4.3'];

    return '<div class="the-thong-bao" style="padding:16px;margin-bottom:14px">' +
      '<div class="nhan-nho" style="margin-bottom:10px">Thêm một đầu hồ sơ</div>' +
      '<div style="display:grid;gap:10px">' +
      '<input id="dm-ten" placeholder="Tên hồ sơ — ví dụ: Hồ sơ bán trú" style="width:100%">' +
      '<div style="display:flex;gap:10px;flex-wrap:wrap">' +
      '<select id="dm-hop">' + HOP.map(function (h) {
        return '<option value="' + h.id + '">' + thoat(h.ten) + '</option>';
      }).join('') + '</select>' +
      '<select id="dm-tc">' + tc.map(function (m) {
        return '<option value="' + m + '">Tiêu chí ' + m + '</option>';
      }).join('') + '</select>' +
      '<select id="dm-tang">' + Object.keys(TANG).map(function (k) {
        return '<option value="' + k + '"' + (k === 'C' ? ' selected' : '') + '>' + TANG[k].ten + '</option>';
      }).join('') + '</select>' +
      '</div>' +
      '<input id="dm-pt" placeholder="Người phụ trách — ghi CHỨC VỤ, ví dụ: Phó Hiệu trưởng" style="width:100%">' +
      '<input id="dm-cc" placeholder="Căn cứ (nếu có) — ví dụ: TT15/2026 Đ.21.1.e" style="width:100%">' +
      '</div>' +
      '<div style="margin-top:12px;display:flex;gap:10px;align-items:center;flex-wrap:wrap">' +
      '<button class="nut-luu-nd" id="dm-luu-them">Thêm vào danh mục</button>' +
      '<button class="nut-xoa-nd" id="dm-huy-them">Thôi</button>' +
      '<span style="font-size:13.2px;color:var(--chu-mo)">Mã hồ sơ do máy đặt theo tiêu chí đã chọn.</span>' +
      '</div></div>';
  }

  function bangDanhMuc(ds) {
    if (!ds.length) {
      return '<div class="the-thong-bao" style="text-align:center;padding:22px">' +
        '<p><b>Hộp này chưa có hồ sơ nào.</b></p></div>';
    }
    var sua = laQT();

    return '<div class="cuon-ngang"><table class="bang-quan-tri nho"><thead><tr>' +
      '<th style="width:104px">Mã</th><th>Tên hồ sơ</th><th>Hộp</th>' +
      '<th style="text-align:center">Tầng</th><th>Căn cứ</th>' +
      '<th style="text-align:center">Link</th>' + (sua ? '<th></th>' : '') +
      '</tr></thead><tbody>' +
      ds.map(function (h) {
        var t = TANG[h.tang] || {};
        return '<tr>' +
          '<td class="code">' + thoat(h.ma) + '</td>' +
          '<td>' + (sua
            ? '<input class="dm-o" value="' + thoat(h.ten) + '" data-dm-ten="' + thoat(h.ma) +
              '" style="width:100%;min-width:220px">'
            : '<b>' + thoat(h.ten) + '</b>') +
          (h.ap_dung && h.ap_dung !== 'Mọi trường'
            ? '<br><small style="color:var(--chu-mo)">áp dụng: ' + thoat(h.ap_dung) + '</small>'
            : '') + '</td>' +
          '<td style="font-size:13px">' + thoat(tenHop(h.nhom_con_id)) + '</td>' +
          '<td style="text-align:center">' + (sua
            ? '<select class="dm-o" data-dm-tang="' + thoat(h.ma) + '">' +
              Object.keys(TANG).map(function (k) {
                return '<option value="' + k + '"' + (h.tang === k ? ' selected' : '') + '>' + k + '</option>';
              }).join('') + '</select>'
            : '<b style="color:' + (t.mau || 'var(--chu-mo)') + '">' + thoat(h.tang || '—') + '</b>') + '</td>' +
          '<td style="font-size:12.6px;color:var(--chu-mo)">' + thoat(h.can_cu || '—') + '</td>' +
          '<td style="text-align:center">' + (h.link_drive
            ? '<a href="' + thoat(h.link_drive) + '" target="_blank" rel="noopener" title="Mở thư mục">📂</a>'
            : '<span style="color:var(--chu-mo)">—</span>') + '</td>' +
          (sua
            ? '<td style="text-align:center"><button class="nut-xoa-nd" data-dm-xoa="' + thoat(h.ma) +
              '" title="Gỡ khỏi danh mục">Gỡ</button></td>'
            : '') +
          '</tr>';
      }).join('') + '</tbody></table></div>' +
      '<div class="nhan-nho" style="text-transform:none;letter-spacing:0;color:var(--chu-mo);margin-top:10px">' +
      'Sửa tên xong thì bấm ra ngoài ô là lưu. Trạng thái, link Drive và người phụ trách sửa ở ' +
      'màn <b>Quản lý Hồ sơ</b> — nơi người được giao cũng tự cập nhật được.</div>';
  }

  // ══════════ SỰ KIỆN ══════════
  function veLai() {
    var than = document.getElementById('qt-than');
    if (than) ve(than);
  }

  function bao(e) { window.hopHoi('Không lưu được: ' + ((e && e.message) || e)); }

  function noiSuKien(goc) {
    var loc = goc.querySelector('#dm-loc-hop');
    if (loc) loc.addEventListener('change', function () { LOC_HOP = loc.value; veLai(); });

    var nutThem = goc.querySelector('#dm-them');
    if (nutThem) nutThem.addEventListener('click', function () { DANG_THEM = true; veLai(); });

    var huy = goc.querySelector('#dm-huy-them');
    if (huy) huy.addEventListener('click', function () { DANG_THEM = false; veLai(); });

    var luuThem = goc.querySelector('#dm-luu-them');
    if (luuThem) luuThem.addEventListener('click', function () { themHoSo(goc, luuThem); });

    Array.prototype.slice.call(goc.querySelectorAll('[data-dm-ten]')).forEach(function (o) {
      o.addEventListener('blur', function () {
        var ma = o.getAttribute('data-dm-ten');
        var cu = (DS.filter(function (x) { return x.ma === ma; })[0] || {}).ten;
        var moi = o.value.trim();
        if (!moi) { o.value = cu; return; }
        if (moi === cu) return;
        may().from('ho_so').update({ ten: moi }).eq('ma', ma).then(function (r) {
          if (r.error) { bao(r.error); o.value = cu; return; }
          nap(veLai);
        });
      });
    });

    Array.prototype.slice.call(goc.querySelectorAll('[data-dm-tang]')).forEach(function (s) {
      s.addEventListener('change', function () {
        var ma = s.getAttribute('data-dm-tang');
        may().from('ho_so').update({ tang: s.value }).eq('ma', ma).then(function (r) {
          if (r.error) { bao(r.error); return; }
          nap(veLai);
        });
      });
    });

    Array.prototype.slice.call(goc.querySelectorAll('[data-dm-xoa]')).forEach(function (b) {
      b.addEventListener('click', function () { goHoSo(b.getAttribute('data-dm-xoa'), b); });
    });
  }

  function themHoSo(goc, nut) {
    var ten = goc.querySelector('#dm-ten').value.trim();
    if (!ten) { window.hopHoi('Chưa đặt tên cho hồ sơ.'); return; }
    var hopId = +goc.querySelector('#dm-hop').value;
    var tc = goc.querySelector('#dm-tc').value;
    var tang = goc.querySelector('#dm-tang').value;
    var pt = goc.querySelector('#dm-pt').value.trim();
    var cc = goc.querySelector('#dm-cc').value.trim();

    nut.disabled = true;
    // Mã do máy cấp — lấy số còn trống nhỏ nhất trong tiêu chí đã chọn.
    may().rpc('ma_ho_so_tiep_theo', { p_tieu_chi: tc })
      .then(function (r) {
        if (r.error) throw r.error;
        return may().from('ho_so').insert({
          nhom_con_id: hopId, ma: r.data, ten: ten,
          nguoi_phu_trach: pt || null, trang_thai: 'chua',
          tieu_chi: [tc], tang: tang, can_cu: cc || null,
          ap_dung: 'Trường tự thêm',
          so_tt: DS.length + 1
        }).select().maybeSingle();
      })
      .then(function (r) {
        nut.disabled = false;
        if (r.error) throw r.error;
        DANG_THEM = false;
        window.hopHoi('Đã thêm ' + ((r.data || {}).ma || '') + ' — ' + ten +
          '. Tạo thư mục trên Drive rồi dán link vào ở màn Quản lý Hồ sơ.');
        nap(veLai);
      })
      .catch(function (e) { nut.disabled = false; bao(e); });
  }

  function goHoSo(ma, nut) {
    var h = DS.filter(function (x) { return x.ma === ma; })[0] || {};
    var t = TANG[h.tang] || {};
    var coLink = !!h.link_drive;

    window.hopHoi({
      tieuDe: 'Gỡ ' + ma + ' khỏi danh mục?',
      noiDung: h.ten +
        (h.tang === 'A'
          ? '\n\n🔴 Đây là hồ sơ TẦNG A — bắt buộc theo văn bản (' + (h.can_cu || 'chưa ghi căn cứ') +
            '). Gỡ đi là thiếu hồ sơ khi thanh tra.'
          : '\n\nTầng ' + (h.tang || '?') + ' — ' + (t.nhac || '')) +
        (coLink
          ? '\n\nHồ sơ này đang có thư mục Drive. Link sẽ được cất vào kho lưu trữ, không mất.'
          : ''),
      nutOK: 'Gỡ khỏi danh mục', nguyHiem: true
    }).then(function (dongY) {
      if (!dongY) return;
      nut.disabled = true;
      may().rpc('xoa_ho_so_an_toan', { p_ma: ma, p_ly_do: null })
        .then(function (r) {
          nut.disabled = false;
          if (r.error) { bao(r.error); return; }
          window.hopHoi(r.data || 'Đã gỡ.');
          nap(veLai);
        })
        .catch(function (e) { nut.disabled = false; bao(e); });
    });
  }

  window.DANH_MUC_SUA = { ve: ve, nap: nap, daTai: function () { return DA_NAP; } };

  window.qtTabPhu = window.qtTabPhu || [];
  window.qtTabPhu.push({ ma: 'dm', ten: '📋 Danh mục hồ sơ', ve: ve });
})();
