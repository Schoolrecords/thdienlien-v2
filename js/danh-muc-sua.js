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
  var BO_PHAN = [];   // nhom_ho_so
  var LOC_HOP = '';   // '' = mọi hộp
  var DANG_TAI = false;
  var LOI = null;
  var DA_NAP = false;   // cờ RIÊNG — bài học mục 30.3
  var DANG_THEM = false;
  var MUC = 'hs';       // 'hs' = đầu hồ sơ · 'cau-truc' = hộp và bộ phận

  // ══════════ ĐỌC ══════════
  // 🔴 BA CỘT tang / can_cu / ap_dung CHỈ CÓ Ở TRƯỜNG ĐÃ DÙNG DANH MỤC 2026
  //    (sql/46 với trường mới, sql/48 với trường di trú). Trường còn ở danh mục
  //    cũ — như Diễn Liên lúc này — chưa có ba cột đó, và PostgREST trả lỗi
  //    "column ho_so.tang does not exist" cho CẢ CÂU, mất luôn danh mục.
  //    Nên hỏi bản đầy đủ trước, trượt thì lùi về bản cơ bản và ẩn hai cột
  //    Tầng, Căn cứ đi. Màn vẫn dùng được, chỉ thiếu phần chưa có dữ liệu.
  var COT_CO_BAN = 'ma, ten, nhom_con_id, trang_thai, link_drive, tieu_chi, nguoi_phu_trach, so_tt';
  var COT_DAY_DU = COT_CO_BAN + ', tang, can_cu, ap_dung';
  var CO_COT_MOI = true;

  // 🔴 CHỈ HIỆN "Đang tải…" Ở LẦN NẠP ĐẦU.
  //    Bản đầu đặt DANG_TAI = true rồi vẽ ngay ở MỌI lần nạp, kể cả lần nạp
  //    lại sau khi lưu — cả bảng bị thay bằng chữ "Đang tải danh mục…".
  //    Người dùng sửa tên dòng 1, nhấn Tab sang dòng 2 gõ tiếp; lệnh lưu dòng
  //    1 xong sau chừng nửa giây là ô dòng 2 biến mất cùng chữ vừa gõ. Trên
  //    bảng trăm dòng thì gặp liên tục. Lần nạp lại giữ nguyên bảng cũ trên
  //    màn, thay xong mới vẽ.
  function nap(veLai, lanDau) {
    if (!may()) { LOI = 'chua_ket_noi'; DA_NAP = true; veLai(); return; }
    LOI = null;
    if (lanDau) { DANG_TAI = true; DA_NAP = true; veLai(); }
    else { DA_NAP = true; }

    may().from('ho_so').select(COT_DAY_DU).order('ma')
      .then(function (r) {
        if (!r.error) { CO_COT_MOI = true; return r; }
        // Chỉ lùi khi đúng là thiếu cột. Lỗi khác (mất mạng, hết quyền) thì để
        // nguyên cho nó nổi lên, đừng che bằng một câu truy vấn khác.
        if (!/column .* does not exist/i.test(r.error.message || '')) return r;
        CO_COT_MOI = false;
        return may().from('ho_so').select(COT_CO_BAN).order('ma');
      })
      .then(function (rHoSo) {
        if (rHoSo.error) throw rHoSo.error;
        DS = rHoSo.data || [];
        return Promise.all([
          may().from('nhom_con').select('id, ma, ten, so_tt, nhom_id').order('so_tt'),
          may().from('nhom_ho_so').select('id, so_tt, ten, mo_ta, bieu_tuong').order('so_tt')
        ]);
      })
      .then(function (r) {
        DANG_TAI = false;
        if (r[0].error) throw r[0].error;
        HOP = r[0].data || [];
        // Bản đầu nuốt lỗi bảng này. Nuốt xong thì thẻ Hộp và bộ phận hiện
        // "Bộ phận · 0", mọi ô chọn bộ phận rỗng — màn hình nói dối là trường
        // không có bộ phận nào, trong khi thật ra chỉ là đọc không được.
        if (r[1].error) throw r[1].error;
        BO_PHAN = r[1].data || [];
        veLai();
        veNeuDangMo();
      })
      .catch(function (e) {
        DANG_TAI = false; LOI = e.message || String(e); veLai();
        veNeuDangMo();
      });
  }

  // Lượt nạp NGẦM (lamTuoiKho của thẻ khác gọi, callback không vẽ) về đúng
  // lúc người dùng đang mở thẻ này: nap() đặt DA_NAP = true NGAY nên ve() đã
  // bày "chưa có đầu hồ sơ nào" từ DS rỗng — dữ liệu về mà không vẽ lại thì
  // màn cứ sai cho tới khi bấm lại thẻ. Vẽ lại, TRỪ khi đang gõ dở một ô
  // trong thẻ (dựng lại innerHTML là mất chữ và con trỏ).
  function veNeuDangMo() {
    var than = document.getElementById('qt-than');
    if (!than || !dangMoTheNay()) return;
    var act = document.activeElement;
    if (act && than.contains(act) &&
        (act.tagName === 'INPUT' || act.tagName === 'TEXTAREA' || act.tagName === 'SELECT')) return;
    ve(than);
  }

  function tenHop(id) {
    var h = HOP.filter(function (x) { return x.id === id; })[0];
    return h ? h.ten : '—';
  }

  // ══════════ VẼ ══════════
  function ve(hop) {
    if (!DA_NAP) {
      // 🔴 KHÔNG GIỮ THAM CHIẾU `hop` QUA LƯỢT CHỜ MÁY CHỦ. quan-tri.js dựng
      //    lại toàn bộ #qt-than mỗi lần bấm thẻ (vung.innerHTML = …): thầy cô
      //    mở thẻ này, chờ nửa giây thấy lâu, bấm sang thẻ khác rồi bấm lại —
      //    lần bấm lại tạo #qt-than MỚI và vẽ "Đang tải…" vào đó, còn dữ liệu
      //    về thì vẽ vào phần tử CŨ đã bị gỡ khỏi trang. Kết quả: kẹt "Đang
      //    tải danh mục…" mãi, dù dữ liệu đã về từ lâu. Lúc phản hồi về phải
      //    tra lại phần tử theo id; chỉ khi thẻ được vẽ vào một hộp khác
      //    (không phải #qt-than) mà hộp ấy còn trên trang thì mới dùng `hop`.
      nap(function () {
        var than = document.getElementById('qt-than');
        if (than && dangMoTheNay()) ve(than);
        else if (hop.isConnected) ve(hop);
      }, true);
      return;
    }
    if (DANG_TAI) { hop.innerHTML = '<div class="the-thong-bao">Đang tải danh mục…</div>'; return; }

    if (LOI === 'chua_ket_noi') {
      hop.innerHTML = '<div class="the-thong-bao" style="text-align:center;padding:24px">' +
        '<p><b>Bản xem thử chưa nối cơ sở dữ liệu.</b></p></div>';
      DA_NAP = false;   // nối được sau thì lần mở thẻ tới đọc lại
      return;
    }
    if (LOI) {
      hop.innerHTML = '<div class="hd-kiem do"><b>Chưa mở được danh mục.</b><br>' +
        'Nếu đây là lần đầu dùng mục này, nhà trường cần cài đặt bổ sung một lần ' +
        '(tệp <code>sql/49</code>) — báo người phụ trách hệ thống. ' +
        'Nếu chỉ là mất mạng, bấm lại thẻ này để đọc lại.' +
        '<div style="margin-top:6px;font-size:13px;opacity:.8">' + thoat(LOI) + '</div></div>';
      // Hạ cờ để lần mở thẻ tới nạp lại. Không hạ thì đứt mạng một lần là màn
      // này chết tới khi tải lại trang — trong khi lỗi có thể đã qua.
      DA_NAP = false;
      return;
    }

    var loc = LOC_HOP ? DS.filter(function (h) { return String(h.nhom_con_id) === LOC_HOP; }) : DS;
    var demTang = { A: 0, B: 0, C: 0 };
    DS.forEach(function (h) { if (demTang[h.tang] !== undefined) demTang[h.tang]++; });

    hop.innerHTML =
      '<div class="yc" style="margin-top:14px"><div class="yc-nhan">📋 Danh mục hồ sơ của trường</div>' +
      '<p>Danh mục dựng sẵn theo Điều lệ <b>Thông tư 15/2026</b> là <b>khung gợi ý</b>. ' +
      'Nhà trường thêm hồ sơ của riêng mình, bỏ những dòng không dùng, sửa tên cho hợp thực tế.' +
      (CO_COT_MOI
        ? ' Cột <b>Tầng</b> cho biết dòng nào bỏ được: ' +
          Object.keys(TANG).map(function (k) {
            return '<b style="color:' + TANG[k].mau + '">' + k + '</b> ' + demTang[k];
          }).join(' · ') + '.'
        : '') + '</p></div>' +

      (CO_COT_MOI ? '' :
        '<div class="hd-kiem vang" style="margin:0 0 14px">⚠ <b>Trường đang dùng danh mục cũ.</b> ' +
        'Cột <b>Tầng</b> (A bắt buộc / B minh chứng / C nội bộ) và <b>Căn cứ pháp lý</b> chỉ có ở ' +
        'danh mục theo Điều lệ Thông tư 15/2026 — chuyển sang danh mục mới thì hai cột đó tự hiện. ' +
        'Mọi việc thêm, sửa tên, gỡ hồ sơ dưới đây vẫn dùng bình thường.</div>') +

      '<div class="chip-hang" style="margin:0 0 14px">' +
      [{ ma: 'hs', ten: '📄 Đầu hồ sơ (' + DS.length + ')' },
       { ma: 'cau-truc', ten: '🗂 Hộp và bộ phận (' + HOP.length + ' hộp)' }].map(function (m) {
        return '<button class="chip-loc' + (MUC === m.ma ? ' on' : '') +
          '" data-dm-muc="' + m.ma + '">' + m.ten + '</button>';
      }).join('') + '</div>' +

      (MUC === 'cau-truc'
        ? veCauTruc()
        : thanhCongCu(loc.length) + (DANG_THEM ? oThem() : '') + bangDanhMuc(loc));

    noiSuKien(hop);
  }

  function thanhCongCu(soHien) {
    return '<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin:4px 0 12px">' +
      '<select id="dm-loc-hop" class="dm-o-nhap" style="min-width:230px">' +
      '<option value="">— mọi hộp (' + DS.length + ' hồ sơ) —</option>' +
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

    function o(nhan, ruot) {
      return '<div><label class="dm-nhan-o">' + nhan + '</label>' + ruot + '</div>';
    }

    return '<div class="the-thong-bao" style="padding:18px 18px 16px;margin-bottom:14px">' +
      '<div class="nhan-nho" style="margin-bottom:14px">Thêm một đầu hồ sơ</div>' +

      '<div style="display:grid;gap:14px">' +

      o('Tên hồ sơ',
        '<input id="dm-ten" class="dm-o-nhap" placeholder="ví dụ: Hồ sơ bán trú" autocomplete="off">') +

      '<div style="display:flex;gap:14px;flex-wrap:wrap">' +
      o('Xếp vào hộp',
        '<select id="dm-hop" class="dm-o-nhap">' + HOP.map(function (h) {
          return '<option value="' + h.id + '">' + thoat(h.ten) + '</option>';
        }).join('') + '</select>') +
      o('Minh chứng cho tiêu chí',
        '<select id="dm-tc" class="dm-o-nhap" style="min-width:132px">' + tc.map(function (m) {
          return '<option value="' + m + '">Tiêu chí ' + m + '</option>';
        }).join('') + '</select>') +
      (CO_COT_MOI
        ? o('Tầng',
            '<select id="dm-tang" class="dm-o-nhap" style="min-width:210px">' +
            Object.keys(TANG).map(function (k) {
              return '<option value="' + k + '"' + (k === 'C' ? ' selected' : '') + '>' +
                TANG[k].ten + '</option>';
            }).join('') + '</select>')
        : '') +
      '</div>' +

      o('Người phụ trách',
        '<input id="dm-pt" class="dm-o-nhap" autocomplete="off" ' +
        'placeholder="ghi chức vụ, ví dụ: Phó Hiệu trưởng">') +

      (CO_COT_MOI
        ? o('Căn cứ pháp lý <span style="font-weight:400">(để trống nếu là hồ sơ nội bộ)</span>',
            '<input id="dm-cc" class="dm-o-nhap" autocomplete="off" ' +
            'placeholder="ví dụ: TT15/2026 Đ.21.1.e">')
        : '') +
      '</div>' +

      '<div style="margin-top:18px;display:flex;gap:10px;align-items:center;flex-wrap:wrap">' +
      '<button class="nut-luu-nd" id="dm-luu-them">Thêm vào danh mục</button>' +
      '<button class="nut-phu-nd" id="dm-huy-them">Thôi</button>' +
      '<span style="font-size:13.2px;color:var(--chu-mo)">' +
      'Mã hồ sơ do hệ thống đặt theo tiêu chí đã chọn.</span>' +
      '</div></div>';
  }

  // Ô sửa TẠI CHỖ trong bảng mang lớp `dm-o`, còn khối "Thêm một đầu hồ sơ" và
  // các ô thêm hộp / bộ phận mang `dm-o-nhap` — hai lớp CỐ Ý khác nhau, không
  // phải sót hậu tố. `.dm-o-nhap` là khuôn to (đệm 10px, bo 10px) cho biểu
  // mẫu; nhét vào ô bảng `.nho` thì mỗi dòng cao gấp rưỡi. `.dm-o` là khuôn
  // nhỏ vừa ô bảng, luật nằm cạnh `.dm-o-nhap` trong style.css.
  function bangDanhMuc(ds) {
    if (!ds.length) {
      return '<div class="the-thong-bao" style="text-align:center;padding:22px">' +
        '<p><b>Hộp này chưa có hồ sơ nào.</b></p></div>';
    }
    var sua = laQT();

    return '<div class="cuon-ngang"><table class="bang-quan-tri nho"><thead><tr>' +
      '<th style="width:104px">Mã</th><th>Tên hồ sơ</th><th>Hộp</th>' +
      (CO_COT_MOI ? '<th style="text-align:center">Tầng</th><th>Căn cứ</th>' : '') +
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
          (CO_COT_MOI
            ? '<td style="text-align:center">' + (sua
                ? '<select class="dm-o" data-dm-tang="' + thoat(h.ma) + '">' +
                  Object.keys(TANG).map(function (k) {
                    return '<option value="' + k + '"' + (h.tang === k ? ' selected' : '') + '>' + k + '</option>';
                  }).join('') + '</select>'
                : '<b style="color:' + (t.mau || 'var(--chu-mo)') + '">' + thoat(h.tang || '—') + '</b>') + '</td>' +
              '<td style="font-size:12.6px;color:var(--chu-mo)">' + thoat(h.can_cu || '—') + '</td>'
            : '') +
          '<td style="text-align:center">' + (h.link_drive
            ? '<a href="' + thoat(h.link_drive) + '" target="_blank" rel="noopener" title="Mở thư mục">📂</a>'
            : '<span style="color:var(--chu-mo)">—</span>') + '</td>' +
          (sua
            ? '<td style="text-align:center;white-space:nowrap">' +
              '<button class="nut-luu-nd" data-dm-luu="' + thoat(h.ma) + '" style="padding:4px 10px;font-size:12.6px" title="Lưu tên vừa sửa">💾 Lưu</button> ' +
              '<button class="nut-xoa-nd" data-dm-xoa="' + thoat(h.ma) +
              '" title="Gỡ khỏi danh mục">Gỡ</button></td>'
            : '') +
          '</tr>';
      }).join('') + '</tbody></table></div>' +
      '<div class="nhan-nho" style="text-transform:none;letter-spacing:0;color:var(--chu-mo);margin-top:10px">' +
      'Sửa tên rồi bấm 💾 Lưu (nhấn Enter hoặc bấm ra ngoài ô cũng lưu). Trạng thái, link Drive và người phụ trách sửa ở ' +
      'màn <b>Quản lý Hồ sơ</b> — nơi người được giao cũng tự cập nhật được.</div>';
  }

  // ══════════ VẼ — HỘP VÀ BỘ PHẬN ══════════
  function demHoSoTrongHop(id) {
    return DS.filter(function (h) { return h.nhom_con_id === id; }).length;
  }

  function veCauTruc() {
    var sua = laQT();

    var bangHop = '<div class="dau-muc" style="text-align:left;margin:6px 0 8px">' +
      '<div class="nhan-nho">Hộp hồ sơ · ' + HOP.length + '</div></div>' +
      (sua ? '<div style="font-size:13.2px;color:var(--chu-mo);margin:0 0 8px">' +
        '✏ Sửa ngay trong ô rồi bấm <b>💾 Lưu</b> (nhấn Enter hoặc bấm ra ngoài ô cũng lưu) — ' +
        'có dòng báo xanh xác nhận.</div>' : '') +
      '<div class="cuon-ngang"><table class="bang-quan-tri nho"><thead><tr>' +
      '<th style="width:64px">Mã</th><th>Tên hộp</th><th>Thuộc bộ phận</th>' +
      '<th style="text-align:center">Số hồ sơ</th>' + (sua ? '<th></th>' : '') +
      '</tr></thead><tbody>' +
      HOP.map(function (h) {
        var n = demHoSoTrongHop(h.id);
        return '<tr><td class="code">' + thoat(h.ma) + '</td>' +
          '<td>' + (sua
            ? '<input class="dm-o" value="' + thoat(h.ten) + '" data-hop-ten="' + thoat(h.ma) +
              '" style="width:100%;min-width:200px">'
            : '<b>' + thoat(h.ten) + '</b>') + '</td>' +
          '<td>' + (sua
            ? '<select class="dm-o" data-hop-bp="' + thoat(h.ma) + '">' +
              BO_PHAN.map(function (b) {
                return '<option value="' + b.id + '"' + (b.id === h.nhom_id ? ' selected' : '') + '>' +
                  thoat(b.bieu_tuong || '') + ' ' + thoat(b.ten) + '</option>';
              }).join('') + '</select>'
            : thoat((BO_PHAN.filter(function (b) { return b.id === h.nhom_id; })[0] || {}).ten || '—')) + '</td>' +
          '<td style="text-align:center">' + (n
            ? '<b>' + n + '</b>'
            : '<span style="color:var(--chu-mo)">rỗng</span>') + '</td>' +
          // Nút Lưu và Xoá HIỆN RÕ ở mọi dòng (thầy Chung yêu cầu 27/8 —
          // trước đây Xoá chỉ hiện khi hộp rỗng, người dùng tìm không thấy).
          // Hộp còn hồ sơ thì bấm Xoá sẽ DẪN ĐƯỜNG chứ không giấu nút.
          (sua
            ? '<td style="text-align:center;white-space:nowrap">' +
              '<button class="nut-luu-nd" data-hop-luu="' + thoat(h.ma) + '" style="padding:4px 10px;font-size:12.6px">💾 Lưu</button> ' +
              '<button class="nut-xoa-nd" data-hop-xoa="' + thoat(h.ma) + '">Xoá</button></td>'
            : '') +
          '</tr>';
      }).join('') + '</tbody></table></div>' +
      (sua ? '<div style="margin-top:10px;display:flex;gap:10px;align-items:center;flex-wrap:wrap">' +
        '<input id="hop-ten-moi" class="dm-o-nhap" autocomplete="off" ' +
        'placeholder="Tên hộp mới — ví dụ: Bán trú" style="width:auto;min-width:230px">' +
        '<select id="hop-bp-moi" class="dm-o-nhap">' + BO_PHAN.map(function (b) {
          return '<option value="' + b.id + '">' + thoat(b.bieu_tuong || '') + ' ' + thoat(b.ten) + '</option>';
        }).join('') + '</select>' +
        '<button class="nut-luu-nd" id="hop-them">+ Thêm hộp</button>' +
        '<span style="font-size:13.2px;color:var(--chu-mo)">Mã hộp do hệ thống đặt.</span></div>' : '');

    var bangBP = '<div class="dau-muc" style="text-align:left;margin:24px 0 8px">' +
      '<div class="nhan-nho">Bộ phận · ' + BO_PHAN.length + '</div></div>' +
      '<div class="cuon-ngang"><table class="bang-quan-tri nho"><thead><tr>' +
      '<th style="width:56px">TT</th><th style="width:64px">Biểu tượng</th><th>Tên bộ phận</th>' +
      '<th style="text-align:center">Số hộp</th>' + (sua ? '<th></th>' : '') +
      '</tr></thead><tbody>' +
      BO_PHAN.map(function (b) {
        var soHop = HOP.filter(function (h) { return h.nhom_id === b.id; }).length;
        return '<tr><td style="text-align:center">' + b.so_tt + '</td>' +
          '<td style="text-align:center;font-size:20px">' + (sua
            ? '<input class="dm-o" value="' + thoat(b.bieu_tuong || '') + '" data-bp-icon="' + b.so_tt +
              '" style="width:52px;text-align:center;font-size:18px" maxlength="4">'
            : thoat(b.bieu_tuong || '')) + '</td>' +
          '<td>' + (sua
            ? '<input class="dm-o" value="' + thoat(b.ten) + '" data-bp-ten="' + b.so_tt +
              '" style="width:100%;min-width:200px">'
            : '<b>' + thoat(b.ten) + '</b>') + '</td>' +
          '<td style="text-align:center">' + (soHop
            ? '<b>' + soHop + '</b>'
            : '<span style="color:var(--chu-mo)">rỗng</span>') + '</td>' +
          (sua
            ? '<td style="text-align:center;white-space:nowrap">' +
              '<button class="nut-luu-nd" data-bp-luu="' + b.so_tt + '" style="padding:4px 10px;font-size:12.6px">💾 Lưu</button> ' +
              '<button class="nut-xoa-nd" data-bp-xoa="' + b.so_tt + '">Xoá</button></td>'
            : '') +
          '</tr>';
      }).join('') + '</tbody></table></div>' +
      // Không có nút này thì trường lỡ xoá hết bộ phận là kẹt luôn: không thêm
      // lại được bộ phận, mà cũng không thêm được hộp nữa vì ô chọn bộ phận
      // rỗng. Hàm so_tt_bo_phan_tiep_theo() đã có sẵn ở sql/50.
      (sua ? '<div style="margin-top:10px;display:flex;gap:10px;align-items:center;flex-wrap:wrap">' +
        '<input id="bp-icon-moi" class="dm-o-nhap" placeholder="🗂" maxlength="4" ' +
        'style="width:62px;text-align:center;font-size:18px">' +
        '<input id="bp-ten-moi" class="dm-o-nhap" autocomplete="off" ' +
        'placeholder="Tên bộ phận mới — ví dụ: Bộ phận Bán trú" style="width:auto;min-width:250px">' +
        '<button class="nut-luu-nd" id="bp-them">+ Thêm bộ phận</button>' +
        '<span style="font-size:13.2px;color:var(--chu-mo)">Số thứ tự do hệ thống đặt.</span></div>' : '');

    return bangHop + bangBP +
      '<div class="hd-kiem vang" style="margin-top:16px">' +
      '⚠ <b>Xoá hộp hay bộ phận chỉ làm được khi bên trong đã rỗng.</b> ' +
      'Trong cơ sở dữ liệu, hồ sơ gắn vào hộp và hộp gắn vào bộ phận theo kiểu xoá cha là mất con — ' +
      'xoá một hộp còn hồ sơ sẽ mất luôn cả hồ sơ, kể cả những hồ sơ đang giữ link Drive. ' +
      'Máy chủ chặn việc đó, không phải chỉ ẩn nút trên màn hình.</div>';
  }

  // ══════════ SỰ KIỆN ══════════
  // 🔴 CHỈ VẼ KHI THẺ NÀY ĐANG MỞ.
  //    #qt-than là thân dùng chung của MỌI thẻ trong màn Quản trị, còn biến
  //    TAB nằm riêng trong quan-tri.js. Bản đầu ghi thẳng vào đó: sửa một ô
  //    rồi bấm sang thẻ "👥 Tài khoản", chưa đầy nửa giây sau lệnh lưu xong và
  //    bảng danh mục ĐÈ LÊN danh sách tài khoản, trong khi thanh thẻ vẫn sáng
  //    ở "Tài khoản". Hỏi thanh thẻ xem ai đang mở thay vì đoán.
  function dangMoTheNay() {
    var nut = document.querySelector('[data-qt="dm"]');
    return !!nut && nut.className.indexOf('on') >= 0;
  }

  function veLai() {
    var than = document.getElementById('qt-than');
    if (than && dangMoTheNay()) ve(than);
  }

  function bao(e) { window.hopHoi('Không lưu được: ' + ((e && e.message) || e)); }

  // Enter trong ô sửa tại chỗ = lưu (ép blur). Dùng chung cho mọi bảng của tab.
  function enterLaLuu(o) {
    o.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); o.blur(); }
    });
  }

  function noiSuKien(goc) {
    Array.prototype.slice.call(goc.querySelectorAll('[data-dm-muc]')).forEach(function (b) {
      b.addEventListener('click', function () {
        MUC = b.getAttribute('data-dm-muc'); DANG_THEM = false; veLai();
      });
    });

    if (MUC === 'cau-truc') { noiCauTruc(goc); return; }

    var loc = goc.querySelector('#dm-loc-hop');
    if (loc) loc.addEventListener('change', function () { LOC_HOP = loc.value; veLai(); });

    var nutThem = goc.querySelector('#dm-them');
    if (nutThem) nutThem.addEventListener('click', function () { DANG_THEM = true; veLai(); });

    var huy = goc.querySelector('#dm-huy-them');
    if (huy) huy.addEventListener('click', function () { DANG_THEM = false; veLai(); });

    var luuThem = goc.querySelector('#dm-luu-them');
    if (luuThem) luuThem.addEventListener('click', function () { themHoSo(goc, luuThem); });

    function luuTenHoSo(ma, o) {
      var cu = (DS.filter(function (x) { return x.ma === ma; })[0] || {}).ten;
      var moi = o.value.trim();
      if (!moi) { o.value = cu; return; }
      if (moi === cu) {
        if (window.notify) window.notify(ma + ' không có gì thay đổi để lưu.');
        return;
      }
      may().from('ho_so').update({ ten: moi }).eq('ma', ma).then(function (r) {
        if (r.error) { bao(r.error); o.value = cu || ''; return; }
        if (window.notify) window.notify('Đã lưu tên ' + ma + ': ' + moi);
        nap(veLai);
      }).catch(function (e) { bao(e); o.value = cu || ''; });
    }

    Array.prototype.slice.call(goc.querySelectorAll('[data-dm-ten]')).forEach(function (o) {
      enterLaLuu(o);
      o.addEventListener('blur', function () {
        var ma = o.getAttribute('data-dm-ten');
        var cu = (DS.filter(function (x) { return x.ma === ma; })[0] || {}).ten;
        // Rời ô mà không đổi gì thì im lặng (khác nút Lưu — bấm nút phải có
        // tiếng vọng); có đổi mới lưu + báo.
        if (o.value.trim() === cu) return;
        luuTenHoSo(ma, o);
      });
    });

    Array.prototype.slice.call(goc.querySelectorAll('[data-dm-luu]')).forEach(function (nut) {
      nut.addEventListener('click', function () {
        var ma = nut.getAttribute('data-dm-luu');
        var o = goc.querySelector('[data-dm-ten="' + ma + '"]');
        if (o) luuTenHoSo(ma, o);
      });
    });

    Array.prototype.slice.call(goc.querySelectorAll('[data-dm-tang]')).forEach(function (s) {
      s.addEventListener('change', function () {
        var ma = s.getAttribute('data-dm-tang');
        may().from('ho_so').update({ tang: s.value }).eq('ma', ma).then(function (r) {
          if (r.error) { bao(r.error); return; }
          if (window.notify) window.notify('Đã lưu tầng của ' + ma + ': ' + s.value);
          nap(veLai);
        }).catch(bao);
      });
    });

    Array.prototype.slice.call(goc.querySelectorAll('[data-dm-xoa]')).forEach(function (b) {
      b.addEventListener('click', function () { goHoSo(b.getAttribute('data-dm-xoa'), b); });
    });
  }

  function themHoSo(goc, nut) {
    var ten = goc.querySelector('#dm-ten').value.trim();
    if (!ten) { window.hopHoi('Chưa đặt tên cho hồ sơ.'); return; }
    // Kho chưa có hộp nào thì select rỗng, +'' ra 0 — số hợp lệ về cú pháp nên
    // lọt xuống insert và chết ở khoá ngoại, mà lúc đó MÃ ĐÃ CẤP XONG rồi.
    var oHop = goc.querySelector('#dm-hop');
    if (!oHop || !oHop.value) {
      window.hopHoi('Chưa có hộp nào để xếp hồ sơ vào. Vào mục 🗂 Hộp và bộ phận thêm một hộp trước.');
      return;
    }
    var hopId = +oHop.value;
    var tc = goc.querySelector('#dm-tc').value;
    // Hai ô này chỉ dựng khi trường đã có ba cột mới — querySelector trả null
    // ở trường còn danh mục cũ, đọc .value thẳng là vỡ ngay tại đây.
    var oTang = goc.querySelector('#dm-tang');
    var oCc = goc.querySelector('#dm-cc');
    var tang = oTang ? oTang.value : 'C';
    var cc = oCc ? oCc.value.trim() : '';
    var pt = goc.querySelector('#dm-pt').value.trim();

    nut.disabled = true;
    // Mã do máy cấp — lấy số còn trống nhỏ nhất trong tiêu chí đã chọn.
    may().rpc('ma_ho_so_tiep_theo', { p_tieu_chi: tc })
      .then(function (r) {
        if (r.error) throw r.error;
        var ban = {
          nhom_con_id: hopId, ma: r.data, ten: ten,
          nguoi_phu_trach: pt || null, trang_thai: 'chua',
          tieu_chi: [tc], so_tt: DS.length + 1
        };
        // Trường còn ở danh mục cũ chưa có ba cột này — gửi lên là lỗi
        // "column does not exist", mà lỗi đó xảy ra sau khi đã cấp mã.
        if (CO_COT_MOI) {
          ban.tang = tang;
          ban.can_cu = cc || null;
          ban.ap_dung = 'Trường tự thêm';
        }
        return may().from('ho_so').insert(ban).select().maybeSingle();
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

  // ══════════ SỰ KIỆN — HỘP VÀ BỘ PHẬN ══════════
  function noiCauTruc(goc) {
    // Ô sửa tại chỗ lưu khi rời ô; Enter cũng lưu; nút 💾 Lưu ép lưu tường
    // minh; lưu xong BÁO RÕ bằng notify. Trước đây lưu trong im lặng, người
    // sửa không biết đã ăn hay chưa (thầy Chung vấp 27/8 khi đổi tên H04.1).
    function luuHop(ma, thay, oNhap, giaTriCu, loiBao) {
      may().from('nhom_con').update(thay).eq('ma', ma).then(function (r) {
        if (r.error) { bao(r.error); if (oNhap) oNhap.value = giaTriCu || ''; return; }
        if (loiBao && window.notify) window.notify(loiBao);
        nap(veLai);
      }).catch(function (e) { bao(e); if (oNhap) oNhap.value = giaTriCu || ''; });
    }

    Array.prototype.slice.call(goc.querySelectorAll('[data-hop-ten]')).forEach(function (o) {
      enterLaLuu(o);
      o.addEventListener('blur', function () {
        var ma = o.getAttribute('data-hop-ten');
        var cu = (HOP.filter(function (x) { return x.ma === ma; })[0] || {}).ten;
        var moi = o.value.trim();
        if (!moi) { o.value = cu; return; }
        if (moi === cu) return;
        luuHop(ma, { ten: moi }, o, cu, 'Đã lưu tên hộp ' + ma + ': ' + moi);
      });
    });

    Array.prototype.slice.call(goc.querySelectorAll('[data-hop-bp]')).forEach(function (s) {
      s.addEventListener('change', function () {
        var ma = s.getAttribute('data-hop-bp');
        luuHop(ma, { nhom_id: +s.value }, null, null,
          'Đã chuyển hộp ' + ma + ' sang bộ phận khác.');
      });
    });

    // Nút 💾 Lưu của dòng hộp: gom tên + bộ phận đang chọn trên dòng, lưu một
    // lượt. Không có gì đổi thì nói vậy — bấm Lưu mà im lặng là lại mơ hồ.
    Array.prototype.slice.call(goc.querySelectorAll('[data-hop-luu]')).forEach(function (nut) {
      nut.addEventListener('click', function () {
        var ma = nut.getAttribute('data-hop-luu');
        var h = HOP.filter(function (x) { return x.ma === ma; })[0] || {};
        var oTen = goc.querySelector('[data-hop-ten="' + ma + '"]');
        var oBp = goc.querySelector('[data-hop-bp="' + ma + '"]');
        var thay = {};
        var ten = oTen ? oTen.value.trim() : '';
        if (oTen && !ten) { window.hopHoi('Tên hộp không được để trống.'); oTen.value = h.ten; return; }
        if (oTen && ten !== h.ten) thay.ten = ten;
        if (oBp && +oBp.value !== h.nhom_id) thay.nhom_id = +oBp.value;
        if (!Object.keys(thay).length) {
          if (window.notify) window.notify('Hộp ' + ma + ' không có gì thay đổi để lưu.');
          return;
        }
        luuHop(ma, thay, oTen, h.ten, 'Đã lưu hộp ' + ma + '.');
      });
    });

    // Nút Xoá hộp — LUÔN hiện. Hộp rỗng: xoá thẳng (máy chủ kiểm lại lần
    // nữa). Hộp còn hồ sơ: KHÔNG giấu nút nữa mà dẫn đường — hỏi xác nhận rõ
    // số hồ sơ, rồi gỡ lần lượt từng hồ sơ qua xoa_ho_so_an_toan (hồ sơ có
    // link Drive được CẤT LINK vào kho lưu trữ trước khi xoá dòng — thư mục
    // trên Drive không bị đụng), xong mới xoá hộp.
    function xoaHop(ma, nut) {
      var h = HOP.filter(function (x) { return x.ma === ma; })[0] || {};
      var ds = DS.filter(function (x) { return x.nhom_con_id === h.id; });

      if (!ds.length) {
        window.hopHoi({
          tieuDe: 'Xoá hộp ' + ma + '?',
          noiDung: h.ten + '\n\nHộp này đang rỗng nên xoá được. Máy chủ sẽ kiểm lại một lần nữa ' +
            'lúc xoá — nếu vừa có ai thêm hồ sơ vào thì việc xoá sẽ dừng lại.',
          nutOK: 'Xoá hộp', nguyHiem: true
        }).then(function (dongY) {
          if (!dongY) return;
          nut.disabled = true;
          may().rpc('xoa_hop_an_toan', { p_ma: ma }).then(function (r) {
            nut.disabled = false;
            if (r.error) { bao(r.error); return; }
            window.hopHoi(r.data || 'Đã xoá.');
            nap(veLai);
          }).catch(function (e) { nut.disabled = false; bao(e); });
        });
        return;
      }

      var coLink = ds.filter(function (x) { return x.link_drive; }).length;
      window.hopHoi({
        tieuDe: 'Xoá hộp ' + ma + ' cùng ' + ds.length + ' hồ sơ bên trong?',
        noiDung: h.ten + '\n\nHộp còn ' + ds.length + ' hồ sơ:\n· ' +
          ds.map(function (x) { return x.ma + ' — ' + x.ten; }).join('\n· ') +
          (coLink
            ? '\n\n' + coLink + ' hồ sơ đang giữ link Drive — link sẽ được cất vào KHO LƯU TRỮ ' +
              'trước khi gỡ, và thư mục trên Drive KHÔNG bị xoá.'
            : '') +
          '\n\nBấm nút dưới là gỡ lần lượt từng hồ sơ khỏi danh mục rồi xoá hộp. Không hoàn tác được.',
        nutOK: 'Gỡ ' + ds.length + ' hồ sơ rồi xoá hộp', nguyHiem: true
      }).then(function (dongY) {
        if (!dongY) return;
        nut.disabled = true;
        (function goTiep(i) {
          if (i >= ds.length) {
            may().rpc('xoa_hop_an_toan', { p_ma: ma }).then(function (r) {
              nut.disabled = false;
              if (r.error) { bao(r.error); nap(veLai); return; }
              window.hopHoi('Đã xoá hộp ' + ma + ' cùng ' + ds.length + ' hồ sơ.' +
                (coLink ? ' Link Drive của ' + coLink + ' hồ sơ đã cất vào kho lưu trữ.' : ''));
              nap(veLai);
            }).catch(function (e) { nut.disabled = false; bao(e); nap(veLai); });
            return;
          }
          may().rpc('xoa_ho_so_an_toan', { p_ma: ds[i].ma, p_ly_do: 'Xoá cùng hộp ' + ma })
            .then(function (r) {
              if (r.error) {
                nut.disabled = false;
                bao({ message: 'dừng ở ' + ds[i].ma + ' — ' + r.error.message +
                  ' (các hồ sơ đã gỡ trước đó vẫn gỡ rồi, hộp chưa xoá)' });
                nap(veLai);
                return;
              }
              goTiep(i + 1);
            })
            .catch(function (e) { nut.disabled = false; bao(e); nap(veLai); });
        })(0);
      });
    }

    Array.prototype.slice.call(goc.querySelectorAll('[data-hop-xoa]')).forEach(function (b) {
      b.addEventListener('click', function () { xoaHop(b.getAttribute('data-hop-xoa'), b); });
    });

    var themBP = goc.querySelector('#bp-them');
    if (themBP) themBP.addEventListener('click', function () {
      var oTen = goc.querySelector('#bp-ten-moi');
      var oIcon = goc.querySelector('#bp-icon-moi');
      var ten = oTen ? oTen.value.trim() : '';
      if (!ten) { window.hopHoi('Chưa đặt tên cho bộ phận.'); return; }
      themBP.disabled = true;
      may().rpc('so_tt_bo_phan_tiep_theo')
        .then(function (r) {
          if (r.error) throw r.error;
          return may().from('nhom_ho_so').insert({
            so_tt: r.data, ten: ten,
            bieu_tuong: (oIcon && oIcon.value.trim()) || '🗂',
            mo_ta: null
          }).select().maybeSingle();
        })
        .then(function (r) {
          themBP.disabled = false;
          if (r.error) throw r.error;
          window.hopHoi('Đã thêm bộ phận ' + ten + '.');
          nap(veLai);
        })
        .catch(function (e) { themBP.disabled = false; bao(e); });
    });

    var themHop = goc.querySelector('#hop-them');
    if (themHop) themHop.addEventListener('click', function () {
      var ten = goc.querySelector('#hop-ten-moi').value.trim();
      if (!ten) { window.hopHoi('Chưa đặt tên cho hộp.'); return; }
      // Chưa có bộ phận nào thì ô chọn rỗng, +'' ra 0 — một số hợp lệ về cú
      // pháp nên lọt xuống insert rồi chết ở khoá ngoại. Chặn sớm cho rõ.
      var oBp = goc.querySelector('#hop-bp-moi');
      if (!oBp || !oBp.value) {
        window.hopHoi('Chưa có bộ phận nào để xếp hộp vào. Thêm một bộ phận trước đã.');
        return;
      }
      var bpId = +oBp.value;
      themHop.disabled = true;
      may().rpc('ma_hop_tiep_theo')
        .then(function (r) {
          if (r.error) throw r.error;
          return may().from('nhom_con').insert({
            ma: r.data, ten: ten, nhom_id: bpId, so_tt: HOP.length + 1
          }).select().maybeSingle();
        })
        .then(function (r) {
          themHop.disabled = false;
          if (r.error) throw r.error;
          window.hopHoi('Đã thêm hộp ' + ((r.data || {}).ma || '') + ' — ' + ten + '.');
          nap(veLai);
        })
        .catch(function (e) { themHop.disabled = false; bao(e); });
    });

    function luuBP(soTT, thay, oNhap, giaTriCu, loiBao) {
      may().from('nhom_ho_so').update(thay).eq('so_tt', soTT).then(function (r) {
        if (r.error) { bao(r.error); if (oNhap) oNhap.value = giaTriCu || ''; return; }
        if (loiBao && window.notify) window.notify(loiBao);
        nap(veLai);
      }).catch(function (e) { bao(e); if (oNhap) oNhap.value = giaTriCu || ''; });
    }

    Array.prototype.slice.call(goc.querySelectorAll('[data-bp-ten]')).forEach(function (o) {
      enterLaLuu(o);
      o.addEventListener('blur', function () {
        var tt = +o.getAttribute('data-bp-ten');
        var cu = (BO_PHAN.filter(function (x) { return x.so_tt === tt; })[0] || {}).ten;
        var moi = o.value.trim();
        if (!moi) { o.value = cu; return; }
        if (moi === cu) return;
        luuBP(tt, { ten: moi }, o, cu, 'Đã lưu tên bộ phận: ' + moi);
      });
    });

    Array.prototype.slice.call(goc.querySelectorAll('[data-bp-icon]')).forEach(function (o) {
      enterLaLuu(o);
      o.addEventListener('blur', function () {
        var tt = +o.getAttribute('data-bp-icon');
        var cu = (BO_PHAN.filter(function (x) { return x.so_tt === tt; })[0] || {}).bieu_tuong || '';
        var moi = o.value.trim();
        if (moi === cu) return;
        luuBP(tt, { bieu_tuong: moi || null }, o, cu, 'Đã lưu biểu tượng bộ phận.');
      });
    });

    // Nút 💾 Lưu của dòng bộ phận: gom tên + biểu tượng, lưu một lượt.
    Array.prototype.slice.call(goc.querySelectorAll('[data-bp-luu]')).forEach(function (nut) {
      nut.addEventListener('click', function () {
        var tt = +nut.getAttribute('data-bp-luu');
        var bp = BO_PHAN.filter(function (x) { return x.so_tt === tt; })[0] || {};
        var oTen = goc.querySelector('[data-bp-ten="' + tt + '"]');
        var oIcon = goc.querySelector('[data-bp-icon="' + tt + '"]');
        var thay = {};
        var ten = oTen ? oTen.value.trim() : '';
        if (oTen && !ten) { window.hopHoi('Tên bộ phận không được để trống.'); oTen.value = bp.ten; return; }
        if (oTen && ten !== bp.ten) thay.ten = ten;
        var icon = oIcon ? oIcon.value.trim() : null;
        if (oIcon && icon !== (bp.bieu_tuong || '')) thay.bieu_tuong = icon || null;
        if (!Object.keys(thay).length) {
          if (window.notify) window.notify('Bộ phận này không có gì thay đổi để lưu.');
          return;
        }
        luuBP(tt, thay, oTen, bp.ten, 'Đã lưu bộ phận: ' + (thay.ten || bp.ten));
      });
    });

    // Nút Xoá bộ phận — LUÔN hiện. Còn hộp thì KHÔNG xoá dây chuyền (xoá bộ
    // phận kéo theo hộp, hộp kéo theo hồ sơ — quá tay cho một cú bấm), chỉ
    // dẫn đường: chuyển hoặc xoá các hộp trước.
    Array.prototype.slice.call(goc.querySelectorAll('[data-bp-xoa]')).forEach(function (b) {
      b.addEventListener('click', function () {
        var tt = +b.getAttribute('data-bp-xoa');
        var bp = BO_PHAN.filter(function (x) { return x.so_tt === tt; })[0] || {};
        var soHop = HOP.filter(function (h) { return h.nhom_id === bp.id; }).length;
        if (soHop) {
          window.hopHoi(bp.ten + ' còn ' + soHop + ' hộp bên trong.\n\n' +
            'Chuyển các hộp ấy sang bộ phận khác (ô "Thuộc bộ phận" ở bảng trên) ' +
            'hoặc xoá từng hộp trước, rồi mới xoá được bộ phận. Xoá cả cây bằng ' +
            'một cú bấm là quá nguy hiểm nên hệ thống không làm.');
          return;
        }
        window.hopHoi({
          tieuDe: 'Xoá bộ phận này?',
          noiDung: bp.ten + '\n\nBộ phận này không còn hộp nào nên xoá được.',
          nutOK: 'Xoá bộ phận', nguyHiem: true
        }).then(function (dongY) {
          if (!dongY) return;
          b.disabled = true;
          may().rpc('xoa_bo_phan_an_toan', { p_so_tt: tt }).then(function (r) {
            b.disabled = false;
            if (r.error) { bao(r.error); return; }
            window.hopHoi(r.data || 'Đã xoá.');
            nap(veLai);
          }).catch(function (e) { b.disabled = false; bao(e); });
        });
      });
    });
  }

  window.DANH_MUC_SUA = { ve: ve, nap: nap, daTai: function () { return DA_NAP; } };

  window.qtTabPhu = window.qtTabPhu || [];
  window.qtTabPhu.push({ ma: 'dm', ten: '📋 Danh mục hồ sơ', ve: ve });
})();
