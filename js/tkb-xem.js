// ============================================================
// tkb-xem.js — MÀN "THỜI KHÓA BIỂU" (Điều hành › Kế hoạch › Thời khóa biểu)
//
// Thầy Chung chốt 14/9/2026 (sổ dự án 91.13): CBGV xem ngay TKB của mình,
// của lớp, của đồng nghiệp — thay cho link sang app TKB riêng. Dữ liệu là
// phiên bản ĐÃ CÔNG BỐ nạp ở Quản trị › 🗓️ Thời khóa biểu (js/tkb-nap.js).
//
// Bốn cách xem:
//   Của tôi       mặc định với giáo viên — tô cột hôm nay, tổng tiết/tuần
//   Theo lớp      danh sách lớp, mỗi ô môn + người dạy
//   Theo GV       tìm theo tên; ô trống = giờ rảnh (BGH nhìn ra ai trống tiết)
//   Toàn trường   lưới rộng mọi lớp, lọc theo điểm trường, tiêu đề dính 2 chiều
// In (mở cửa sổ in riêng, A4/A3 ngang) · Xuất Excel (js/xuat-excel.js).
//
// dieu-hanh.js vẽ khung bằng chuỗi HTML rồi gọi TKB_XEM.ve(el). Màn Điều hành
// vẽ lại thường xuyên (đổi buổi, dữ liệu về) → module GIỮ dữ liệu trong bộ
// nhớ, vẽ lại không gọi máy chủ; chỉ nạp lại khi đổi phiên bản hoặc
// TKB_XEM.xoaBoNho() (thẻ quản trị gọi sau khi nạp bản mới).
// ============================================================
(function () {
  'use strict';

  function thoat(s) { return window.thoatHTML ? window.thoatHTML(s) : String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return '&#' + c.charCodeAt(0) + ';'; }); }
  function may() { return window.MAY_CHU; }
  function khongDau(s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase(); }

  var TEN_THU = { 2: 'Thứ Hai', 3: 'Thứ Ba', 4: 'Thứ Tư', 5: 'Thứ Năm', 6: 'Thứ Sáu', 7: 'Thứ Bảy', 8: 'Chủ nhật' };
  var TEN_THU_NGAN = { 2: 'T2', 3: 'T3', 4: 'T4', 5: 'T5', 6: 'T6', 7: 'T7', 8: 'CN' };

  // ── Trạng thái giữ qua các lần vẽ lại ──
  var S = {
    dsPhienBan: null,  // [{id, ap_dung_tu, nam_hoc, hoc_ky, cong_bo}]
    pbId: null,        // phiên bản đang xem
    dl: null,          // { tiet:[], gv:[], lopCoSo:{}, coSo:[] } của pbId
    dangNap: false, loi: '',
    napXong: false,    // đã hỏi máy chủ xong (kể cả khi trường CHƯA có phiên bản nào)
    cheDo: null,       // 'toi' | 'lop' | 'gv' | 'truong'
    lop: '', gv: '', buoi: 'ca', coSo: 'all', timGV: '',
    mau: false         // đang dùng dữ liệu mẫu (chưa nối CSDL)
  };
  var EL = null;

  // ── Màu môn: nhóm theo tên môn đã bỏ dấu (mỗi trường đặt tên một kiểu) ──
  function nhomMon(mon) {
    var m = khongDau(mon).replace(/[^a-z&]/g, '');
    if (/^(tiengviet|tviet|tv)$/.test(m)) return 'tv';
    if (/^toan/.test(m)) return 'toan';
    if (/anh|ngoaingu|nngu/.test(m)) return 'anh';
    if (/tnxh|tunhien|khoahoc|lichsu|lsdl|ls&dl|diali/.test(m)) return 'tn';
    if (/hdtn|trainghiem|chaoco|shl|sinhhoat|hdth/.test(m)) return 'hd';
    if (/mythuat|mithuat|amnhac|nhac|nghethuat/.test(m)) return 'nt';
    if (/gdtc|thechat/.test(m)) return 'gd';
    if (/daoduc|dduc/.test(m)) return 'dd';
    if (/tinhoc|congnghe|^cn$|thoc/.test(m)) return 'tin';
    return 'khac';
  }
  function homNayISO() {
    var d = new Date();
    return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
  }
  function thuHomNay() { var g = new Date().getDay(); return g === 0 ? 8 : g + 1; }
  function ngayVN(iso) { var p = String(iso || '').split('-'); return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : ''; }
  function soSanhLop(a, b) { return String(a).localeCompare(String(b), 'vi', { numeric: true }); }
  function toiEmail() { return String((window.NGUOI_DUNG || {}).email || '').toLowerCase(); }
  function laQT() { var u = window.NGUOI_DUNG; return !u || u.vai_tro === 'admin' || u.vai_tro === 'ban_giam_hieu'; }

  // ══════════════════════════════════════════════════════════════
  // NẠP DỮ LIỆU
  // ══════════════════════════════════════════════════════════════
  // PostgREST trả tối đa 1000 dòng một lần — trường 25 lớp đã 700+ tiết, trường
  // 40 lớp là quá 1000. Đọc theo trang, đừng để lưới thiếu tiết mà không báo.
  function docHet(bang, cot, loc) {
    var ra = [], co = 1000;
    function trang(tu) {
      return loc(may().from(bang).select(cot)).range(tu, tu + co - 1).then(function (r) {
        if (r.error) throw r.error;
        ra = ra.concat(r.data || []);
        return (r.data || []).length === co ? trang(tu + co) : ra;
      });
    }
    return trang(0);
  }
  // Dữ liệu MỘT phiên bản — dùng chung cho màn xem và màn dạy thay (js/day-thay.js),
  // giữ trong bộ nhớ theo id: đổi qua lại giữa hai màn không gọi máy chủ lại.
  var BO_NHO_PB = {};
  function docPhienBan(pb) {
    if (BO_NHO_PB[pb.id]) return BO_NHO_PB[pb.id];
    BO_NHO_PB[pb.id] = Promise.all([
      docHet('tkb_tiet', 'lop,thu,buoi,tiet,mon,gv_nhan,gv_email', function (q) { return q.eq('phien_ban_id', pb.id).order('lop').order('thu').order('buoi').order('tiet'); }),
      may().from('tkb_giao_vien').select('gv_nhan,ho_ten,email,lop_cn,phan_cong,so_tiet,so_tiet_pcgd').eq('phien_ban_id', pb.id),
      may().from('lop_hoc').select('lop,co_so_ma').eq('nam_hoc', pb.nam_hoc),
      may().from('co_so').select('ma,ten,so_tt').eq('hoat_dong', true).order('so_tt')
    ]).then(function (r) {
      if (r[1].error) throw r[1].error;
      var lopCoSo = {};
      (r[2].data || []).forEach(function (x) { lopCoSo[x.lop] = x.co_so_ma || ''; });
      return { tiet: r[0], gv: r[1].data || [], lopCoSo: lopCoSo, coSo: (r[3] && r[3].data) || [] };
    }, function (e) { delete BO_NHO_PB[pb.id]; throw e; });
    return BO_NHO_PB[pb.id];
  }
  function docDsPhienBan() {
    if (S.dsPhienBan) return Promise.resolve(S.dsPhienBan);
    return may().from('tkb_phien_ban').select('id,nam_hoc,hoc_ky,ap_dung_tu,cong_bo,so_lop,so_tiet')
      .order('ap_dung_tu', { ascending: false }).order('id', { ascending: false }).limit(20)
      .then(function (r) { if (r.error) throw r.error; S.dsPhienBan = r.data || []; return S.dsPhienBan; });
  }
  // Bản ĐÃ CÔNG BỐ áp dụng cho một ngày (khớp hàm tkb_phien_ban_ngay trong sql/64)
  function phienBanNgay(ds, ngay) {
    return (ds || []).filter(function (x) { return x.cong_bo && x.ap_dung_tu <= ngay; })[0] || null;
  }
  function napTatCa(tiepTheo) {
    S.dangNap = true; S.loi = '';
    docDsPhienBan().then(function (ds) {
      if (!ds.length) { S.dl = null; return null; }
      if (!S.pbId || !ds.some(function (x) { return x.id === S.pbId; })) {
        var hn = homNayISO();
        var dung = ds.filter(function (x) { return x.cong_bo && x.ap_dung_tu <= hn; })[0] ||
                   ds.filter(function (x) { return x.cong_bo; }).slice(-1)[0] || ds[0];
        S.pbId = dung.id;
      }
      var pb = ds.filter(function (x) { return x.id === S.pbId; })[0];
      return docPhienBan(pb).then(function (dl) { S.dl = dl; });
    }).catch(function (e) {
      var m = String((e && (e.message || e.details)) || e || '');
      S.loi = /tkb_|does not exist|schema cache|Could not find/i.test(m)
        ? 'Cơ sở dữ liệu của trường chưa có bảng thời khóa biểu — người phụ trách hệ thống cần chạy sql/64-thoi-khoa-bieu.sql.'
        : 'Không tải được thời khóa biểu: ' + m;
    }).then(function () {
      S.dangNap = false; S.napXong = true;
      if (tiepTheo) tiepTheo();
    });
  }

  // Dữ liệu mẫu cho chế độ xem thử — rõ ràng là MẪU, tên người bịa
  function duLieuMau() {
    var lop = ['1A', '1B', '2A', '3A', '4A', '5A'];
    var cn = ['Cô Lan', 'Cô Hoa', 'Cô Mai', 'Thầy Nam', 'Cô Thu', 'Cô Hằng'];
    var bm = { 'Tiếng Anh': 'Cô Vy', 'Mỹ thuật': 'Thầy Hải', 'Âm nhạc': 'Cô Nga', 'GDTC': 'Thầy Tùng', 'Tin học': 'Cô Yến' };
    var monCN = ['Tiếng Việt', 'Tiếng Việt', 'Toán', 'TNXH', 'Đạo đức', 'HĐTN'];
    var monBM = Object.keys(bm);
    var tiet = [], seed = 7;
    function rnd(n) { seed = (seed * 9301 + 49297) % 233280; return Math.floor(seed / 233280 * n); }
    lop.forEach(function (l, i) {
      for (var thu = 2; thu <= 6; thu++) {
        ['sang', 'chieu'].forEach(function (b) {
          var so = b === 'sang' ? 4 : (thu % 2 ? 2 : 3);
          for (var t = 1; t <= so; t++) {
            var laBM = rnd(5) === 0 && !(thu === 2 && b === 'sang' && t === 1);
            var mon = thu === 2 && b === 'sang' && t === 1 ? 'HĐTN' : laBM ? monBM[(i + thu + t) % monBM.length] : monCN[rnd(monCN.length)];
            if (mon === 'Tin học' && +l.charAt(0) < 3) mon = 'Tiếng Anh';   // khối 1–2 không học Tin
            var nhan = laBM ? bm[mon] : cn[i];
            if (laBM && tiet.some(function (x) { return x.thu === thu && x.buoi === b && x.tiet === t && x.gv_nhan === nhan; })) { mon = 'Toán'; nhan = cn[i]; }
            tiet.push({ lop: l, thu: thu, buoi: b, tiet: t, mon: mon, gv_nhan: nhan, gv_email: '' });
          }
        });
      }
    });
    var gv = cn.map(function (n, i) { return { gv_nhan: n, ho_ten: n.replace(/^Cô /, 'Nguyễn Thị ').replace(/^Thầy /, 'Nguyễn Văn '), lop_cn: lop[i] }; })
      .concat(monBM.map(function (m) { return { gv_nhan: bm[m], ho_ten: bm[m].replace(/^Cô /, 'Trần Thị ').replace(/^Thầy /, 'Trần Văn '), phan_cong: m }; }));
    return { tiet: tiet, gv: gv, lopCoSo: {}, coSo: [] };
  }

  // ══════════════════════════════════════════════════════════════
  // VẼ
  // ══════════════════════════════════════════════════════════════
  function ve(el) {
    if (el) EL = el;
    if (!EL || !document.body.contains(EL)) return;
    if (!may()) {
      S.mau = true;
      if (!S.dl) { S.dl = duLieuMau(); S.dsPhienBan = [{ id: 0, ap_dung_tu: homNayISO(), nam_hoc: (window.CAU_HINH || {}).NAM_HOC || '', hoc_ky: 1, cong_bo: true }]; S.pbId = 0; }
    } else if (S.mau) { S.mau = false; S.dl = null; S.dsPhienBan = null; S.napXong = false; }

    // 🔴 Phải xét napXong, KHÔNG chỉ xét S.dl: trường chưa nạp TKB nào thì tải xong
    // S.dl vẫn null → điều kiện cũ lại gọi tải lần nữa, lặp vô tận, màn kẹt mãi ở
    // "Đang tải…" (Tân Châu 1 trên trang thật 14/9/2026 — bản thử dùng dữ liệu mẫu nên không lộ).
    if (!S.mau && !S.napXong && !S.loi) {
      if (!S.dangNap) napTatCa(function () { ve(); });
      EL.innerHTML = '<div class="the-thong-bao">Đang tải thời khóa biểu…</div>';
      return;
    }
    // Trường chưa chạy sql/64: giáo viên chỉ cần biết "chưa có", câu kỹ thuật
    // (tên tệp SQL) để dành cho quản trị — mã lên mạng trước khi mọi trường
    // kịp chạy SQL, đừng để thầy cô thấy một khung đỏ khó hiểu.
    if (S.loi && !laQT() && /sql\/64/.test(S.loi)) {
      EL.innerHTML = '<div class="the-thong-bao"><b>Nhà trường chưa nạp thời khóa biểu.</b><br>' +
        'Ban giám hiệu nạp từ Smart Scheduler xong thì thầy cô xem được ngay tại đây.</div>';
      return;
    }
    if (S.loi) {
      EL.innerHTML = '<div class="hd-kiem do">' + thoat(S.loi) + '</div>' +
        '<button class="dh-nut-nho" id="tkb-thu-lai">Thử lại</button>';
      document.getElementById('tkb-thu-lai').onclick = function () { xoaBoNho(); ve(); };
      return;
    }
    if (!S.dl) {
      EL.innerHTML = '<div class="the-thong-bao"><b>Nhà trường chưa nạp thời khóa biểu.</b><br>' +
        (laQT() ? 'Vào <b>Quản trị › 🗓️ Thời khóa biểu</b>, chọn tệp Smart Scheduler kết xuất (Hệ thống › Chuyển đổi dữ liệu sang Excel).'
          : 'Ban giám hiệu sẽ nạp từ Smart Scheduler; nạp xong thầy cô xem được ngay tại đây.') + '</div>';
      return;
    }

    var dl = S.dl;
    var dsGV = gvDanhSach();
    var cuaToi = dsGV.filter(function (g) { return g.email && g.email === toiEmail(); });
    if (!S.cheDo) S.cheDo = cuaToi.length ? 'toi' : (laQT() ? 'truong' : 'lop');
    if (S.cheDo === 'toi' && !cuaToi.length && !S.mau) S.cheDo = 'lop';
    var dsLop = lopDanhSach();
    if (!S.lop || dsLop.indexOf(S.lop) < 0) S.lop = dsLop[0] || '';
    if (!S.gv || !dsGV.some(function (g) { return g.gv_nhan === S.gv; })) S.gv = dsGV[0] ? dsGV[0].gv_nhan : '';

    var pb = (S.dsPhienBan || []).filter(function (x) { return x.id === S.pbId; })[0] || {};
    var chonPB = (S.dsPhienBan || []).length > 1
      ? '<select id="tkb-pb" class="tkb-chon">' + S.dsPhienBan.map(function (x) {
          return '<option value="' + x.id + '"' + (x.id === S.pbId ? ' selected' : '') + '>Áp dụng từ ' + ngayVN(x.ap_dung_tu) +
            (x.cong_bo ? '' : ' · nháp') + '</option>';
        }).join('') + '</select>'
      : '';

    // Thầy Chung 14/9/2026: "giao diện phẳng, dễ xem, không cần màu sắc; có xem Phân hiệu,
    // từng lớp, từng giáo viên, có thống kê tiết dạy" — mã màn giữ nguyên ('truong' = Phân hiệu).
    var tabs = [['toi', 'TKB của tôi'], ['truong', 'Phân hiệu'], ['lop', 'Từng lớp'], ['gv', 'Từng giáo viên'], ['thongke', 'Thống kê tiết dạy']]
      .concat(window.DAY_THAY ? [['daythay', 'Dạy thay']] : [])
      .filter(function (t) { return t[0] !== 'toi' || cuaToi.length || S.mau; });

    var html =
      // Chế độ xem thử: màn Điều hành đã có dải vàng "BẢN XEM THỬ" chung — không lặp.
      '<div class="tkb-dau">' +
        '<div class="tkb-tabs" role="tablist">' + tabs.map(function (t) {
          return '<button role="tab" class="' + (S.cheDo === t[0] ? 'on' : '') + '" data-che-do="' + t[0] + '">' + t[1] + '</button>';
        }).join('') + '</div>' +
        '<div class="tkb-dau-phai">' +
          '<span class="tkb-meta">Năm học ' + thoat(pb.nam_hoc || '') + (pb.hoc_ky ? ' · HK' + pb.hoc_ky : '') +
          ' · áp dụng từ <b>' + ngayVN(pb.ap_dung_tu) + '</b>' + (pb.cong_bo === false ? ' · <b style="color:var(--canh)">BẢN NHÁP</b>' : '') + '</span>' +
          chonPB +
          '<div class="tkb-buoi">' + [['ca', 'Cả ngày'], ['sang', 'Sáng'], ['chieu', 'Chiều']].map(function (b) {
            return '<button class="' + (S.buoi === b[0] ? 'on' : '') + '" data-buoi="' + b[0] + '">' + b[1] + '</button>';
          }).join('') + '</div>' +
          '<button class="dh-nut-nho" id="tkb-in">🖨️ In</button>' +
          '<button class="dh-nut-nho" id="tkb-excel">⬇️ Excel</button>' +
        '</div>' +
      '</div>';

    // Dạy thay có đầu màn riêng (chọn NGÀY, không chọn phiên bản) — js/day-thay.js
    if (S.cheDo === 'daythay' && window.DAY_THAY) {
      EL.innerHTML = '<div class="tkb-dau"><div class="tkb-tabs" role="tablist">' + tabs.map(function (t) {
          return '<button role="tab" class="' + (S.cheDo === t[0] ? 'on' : '') + '" data-che-do="' + t[0] + '">' + t[1] + '</button>';
        }).join('') + '</div></div><div id="dt-vung"></div>';
      Array.prototype.slice.call(EL.querySelectorAll('[data-che-do]')).forEach(function (b) {
        b.addEventListener('click', function () { S.cheDo = b.getAttribute('data-che-do'); ve(); });
      });
      window.DAY_THAY.ve(document.getElementById('dt-vung'));
      return;
    }
    if (S.cheDo === 'toi') html += veCuaToi(cuaToi.length ? cuaToi : dsGV.slice(0, 1));
    else if (S.cheDo === 'lop') html += veTheoLop(dsLop);
    else if (S.cheDo === 'gv') html += veTheoGV(dsGV);
    else if (S.cheDo === 'thongke') html += veThongKe(dsGV);
    else html += veToanTruong();

    EL.innerHTML = html;
    ganSuKien();
  }

  function gvDanhSach() {
    var dl = S.dl, theoNhan = {};
    dl.gv.forEach(function (g) { theoNhan[g.gv_nhan] = { gv_nhan: g.gv_nhan, ho_ten: g.ho_ten || g.gv_nhan, email: String(g.email || '').toLowerCase(), lop_cn: g.lop_cn, phan_cong: g.phan_cong, so_tiet_pcgd: g.so_tiet_pcgd }; });
    dl.tiet.forEach(function (x) { if (x.gv_nhan && !theoNhan[x.gv_nhan]) theoNhan[x.gv_nhan] = { gv_nhan: x.gv_nhan, ho_ten: x.gv_nhan, email: String(x.gv_email || '').toLowerCase() }; });
    return Object.keys(theoNhan).map(function (k) { return theoNhan[k]; })
      .sort(function (a, b) { return tenCuoi(a.ho_ten).localeCompare(tenCuoi(b.ho_ten), 'vi') || a.ho_ten.localeCompare(b.ho_ten, 'vi'); });
  }
  function tenCuoi(s) { var p = String(s || '').trim().split(/\s+/); return p[p.length - 1] || ''; }
  function lopDanhSach() {
    var d = {};
    S.dl.tiet.forEach(function (x) { d[x.lop] = 1; });
    return Object.keys(d).sort(soSanhLop);
  }
  function thuCo() {
    var d = {};
    S.dl.tiet.forEach(function (x) { d[x.thu] = 1; });
    var ds = [2, 3, 4, 5, 6];
    if (d[7]) ds.push(7);
    return ds;
  }
  // Số tiết tối đa từng buổi, lấy theo toàn trường — lưới mọi lớp cùng số dòng
  function soTietBuoi() {
    var m = { sang: 0, chieu: 0 };
    S.dl.tiet.forEach(function (x) { if (x.tiet > m[x.buoi]) m[x.buoi] = x.tiet; });
    return m;
  }
  function dsBuoi() { return S.buoi === 'ca' ? ['sang', 'chieu'] : [S.buoi]; }

  // ── Lưới tuần: hàng = tiết (S1…, C1…), cột = thứ ──
  // o(thu, buoi, tiet) trả { mon, phu, thay } hoặc null
  function luoiTuan(o, tieuDe) {
    var dsThu = thuCo(), mt = soTietBuoi(), hn = thuHomNay();
    var h = '<div class="tkb-cuon"><table class="tkb-luoi"><thead><tr><th class="tkb-o-tiet">Tiết</th>' +
      dsThu.map(function (t) { return '<th class="' + (t === hn ? 'hom-nay' : '') + '">' + TEN_THU[t] + (t === hn ? '<small>hôm nay</small>' : '') + '</th>'; }).join('') +
      '</tr></thead><tbody>';
    dsBuoi().forEach(function (b) {
      for (var i = 1; i <= mt[b]; i++) {
        h += '<tr class="' + (b === 'chieu' ? 'chieu' : '') + (i === mt[b] ? ' het-buoi' : '') + '">' +
          '<td class="tkb-o-tiet">' + (b === 'sang' ? 'S' : 'C') + i + '</td>' +
          dsThu.map(function (t) {
            var v = o(t, b, i);
            if (!v) return '<td class="' + (t === hn ? 'hom-nay' : '') + '"><div class="tkb-trong"></div></td>';
            return '<td class="' + (t === hn ? 'hom-nay' : '') + '"><div class="tkb-mon tkb-m-' + nhomMon(v.mon) + (v.trung ? ' trung' : '') + '">' +
              '<b>' + thoat(v.mon) + '</b><i>' + thoat(v.phu || '') + '</i></div></td>';
          }).join('') + '</tr>';
      }
    });
    return h + '</tbody></table></div>';
  }

  function chiMuc(loc) {
    var m = {};
    S.dl.tiet.forEach(function (x) {
      if (!loc(x)) return;
      var k = x.thu + '|' + x.buoi + '|' + x.tiet;
      (m[k] = m[k] || []).push(x);
    });
    return m;
  }

  function veCuaToi(cuaToi) {
    var nhan = {}; cuaToi.forEach(function (g) { nhan[g.gv_nhan] = 1; });
    var g = cuaToi[0];
    var m = chiMuc(function (x) { return nhan[x.gv_nhan]; });
    var so = 0; Object.keys(m).forEach(function (k) { so += m[k].length; });
    var hn = thuHomNay(), homNay = 0;
    Object.keys(m).forEach(function (k) { if (+k.split('|')[0] === hn) homNay += m[k].length; });
    return '<div class="tkb-tom">' +
      '<div><span class="tkb-nhan">Giáo viên</span><b>' + thoat(g.ho_ten) + '</b><small>' + thoat(g.gv_nhan) + (g.lop_cn ? ' · chủ nhiệm ' + thoat(g.lop_cn) : '') + '</small></div>' +
      '<div><span class="tkb-nhan">Cả tuần</span><b class="so">' + so + ' tiết</b>' + (g.so_tiet_pcgd ? '<small>phân công ' + g.so_tiet_pcgd + ' tiết</small>' : '') + '</div>' +
      '<div><span class="tkb-nhan">' + (TEN_THU[hn] || 'Hôm nay') + '</span><b class="so">' + homNay + ' tiết</b><small>' + (hn > 7 ? 'hôm nay nghỉ' : 'hôm nay') + '</small></div>' +
      '</div>' +
      luoiTuan(function (t, b, i) {
        var a = m[t + '|' + b + '|' + i];
        return a ? { mon: a[0].mon, phu: a.map(function (x) { return x.lop; }).join(' + '), trung: a.length > 1 } : null;
      }) + thongKeMot(function (x) { return nhan[x.gv_nhan]; }, 'lop');
  }

  function veTheoLop(dsLop) {
    var gvCua = {};
    gvDanhSach().forEach(function (g) { gvCua[g.gv_nhan] = g; });
    var m = chiMuc(function (x) { return x.lop === S.lop; });
    var cn = gvDanhSach().filter(function (g) { return g.lop_cn && String(g.lop_cn).split(/\s*,\s*/).indexOf(S.lop) >= 0; })[0];
    var theoKhoi = {};
    dsLop.forEach(function (l) { var k = (String(l).match(/^\d+/) || ['Khác'])[0]; (theoKhoi[k] = theoKhoi[k] || []).push(l); });
    return '<div class="tkb-hai-cot">' +
      '<nav class="tkb-ds-lop" aria-label="Chọn lớp">' + Object.keys(theoKhoi).sort(soSanhLop).map(function (k) {
        return '<div class="tkb-khoi"><span>' + (isFinite(+k) ? 'Khối ' + k : k) + '</span>' + theoKhoi[k].map(function (l) {
          return '<button class="' + (l === S.lop ? 'on' : '') + '" data-lop="' + thoat(l) + '">' + thoat(l) + '</button>';
        }).join('') + '</div>';
      }).join('') + '</nav>' +
      '<div class="tkb-phai"><div class="tkb-tom"><div><span class="tkb-nhan">Lớp</span><b>' + thoat(S.lop) + '</b>' +
        (cn ? '<small>Chủ nhiệm: ' + thoat(cn.ho_ten) + '</small>' : '') + '</div>' +
        '<div><span class="tkb-nhan">Cả tuần</span><b class="so">' + Object.keys(m).length + ' tiết</b></div></div>' +
      luoiTuan(function (t, b, i) {
        var a = m[t + '|' + b + '|' + i];
        if (!a) return null;
        var g = gvCua[a[0].gv_nhan];
        return { mon: a[0].mon, phu: a[0].gv_nhan || '' , ten: g && g.ho_ten };
      }) + thongKeMot(function (x) { return x.lop === S.lop; }, 'gv') + '</div></div>';
  }

  function veTheoGV(dsGV) {
    var tim = khongDau(S.timGV);
    var loc = dsGV.filter(function (g) { return !tim || khongDau(g.ho_ten + ' ' + g.gv_nhan).indexOf(tim) >= 0; });
    var g = dsGV.filter(function (x) { return x.gv_nhan === S.gv; })[0] || dsGV[0];
    if (!g) return '<div class="the-thong-bao">Chưa có giáo viên nào trong thời khóa biểu.</div>';
    var m = chiMuc(function (x) { return x.gv_nhan === g.gv_nhan; });
    var so = 0; Object.keys(m).forEach(function (k) { so += m[k].length; });
    var mt = soTietBuoi(), tongO = thuCo().length * (dsBuoi().reduce(function (a, b) { return a + mt[b]; }, 0));
    var coTiet = Object.keys(m).filter(function (k) { return dsBuoi().indexOf(k.split('|')[1]) >= 0; }).length;
    return '<div class="tkb-hai-cot">' +
      '<nav class="tkb-ds-gv" aria-label="Chọn giáo viên">' +
        '<input type="search" id="tkb-tim-gv" class="tkb-chon" placeholder="Tìm tên…" value="' + thoat(S.timGV) + '">' +
        '<div class="tkb-ds-gv-cuon">' + loc.map(function (x) {
          return '<button class="' + (x.gv_nhan === g.gv_nhan ? 'on' : '') + '" data-gv="' + thoat(x.gv_nhan) + '">' +
            '<b>' + thoat(x.ho_ten) + '</b><small>' + thoat(x.gv_nhan) + '</small></button>';
        }).join('') + (loc.length ? '' : '<small class="mo">Không có ai khớp.</small>') + '</div>' +
      '</nav>' +
      '<div class="tkb-phai"><div class="tkb-tom">' +
        '<div><span class="tkb-nhan">Giáo viên</span><b>' + thoat(g.ho_ten) + '</b><small>' + thoat(g.gv_nhan) + (g.lop_cn ? ' · CN ' + thoat(g.lop_cn) : '') + '</small></div>' +
        '<div><span class="tkb-nhan">Cả tuần</span><b class="so">' + so + ' tiết</b>' + (g.so_tiet_pcgd ? '<small>phân công ' + g.so_tiet_pcgd + '</small>' : '') + '</div>' +
        '<div><span class="tkb-nhan">Ô trống</span><b class="so">' + (tongO - coTiet) + '</b><small>tiết rảnh trong ' + (S.buoi === 'ca' ? 'tuần' : 'các buổi ' + (S.buoi === 'sang' ? 'sáng' : 'chiều')) + '</small></div>' +
      '</div>' +
      (g.phan_cong ? '<div class="tkb-pc">Phân công: ' + thoat(g.phan_cong) + '</div>' : '') +
      luoiTuan(function (t, b, i) {
        var a = m[t + '|' + b + '|' + i];
        return a ? { mon: a[0].mon, phu: a.map(function (x) { return x.lop; }).join(' + '), trung: a.length > 1 } : null;
      }) + thongKeMot(function (x) { return x.gv_nhan === g.gv_nhan; }, 'lop') + '</div></div>';
  }

  function veToanTruong() {
    var dl = S.dl, dsLop = lopDanhSach();
    var coSo = dl.coSo.filter(function (c) { return dsLop.some(function (l) { return (dl.lopCoSo[l] || '') === c.ma; }); });
    if (S.coSo !== 'all' && !coSo.some(function (c) { return c.ma === S.coSo; })) S.coSo = 'all';
    var lop = S.coSo !== 'all' ? dsLop.filter(function (l) { return (dl.lopCoSo[l] || '') === S.coSo; }) : dsLop;
    var m = {};
    dl.tiet.forEach(function (x) { m[x.lop + '|' + x.thu + '|' + x.buoi + '|' + x.tiet] = x; });
    var mt = soTietBuoi(), dsThu = thuCo(), hn = thuHomNay();
    var khoi = [];
    lop.forEach(function (l) {
      var k = (String(l).match(/^\d+/) || [''])[0];
      if (khoi.length && khoi[khoi.length - 1].k === k) khoi[khoi.length - 1].n++;
      else khoi.push({ k: k, n: 1 });
    });
    var soTietCS = dl.tiet.filter(function (x) { return lop.indexOf(x.lop) >= 0; }).length;
    var soGVCS = {};
    dl.tiet.forEach(function (x) { if (lop.indexOf(x.lop) >= 0 && x.gv_nhan) soGVCS[x.gv_nhan] = 1; });
    var h = '<div class="tkb-loc-cs">' + [{ ma: 'all', ten: 'Toàn trường' }].concat(coSo.length > 1 ? coSo : []).map(function (c) {
        return '<button class="tkb-chip-loc' + (S.coSo === c.ma ? ' on' : '') + '" data-co-so="' + thoat(c.ma) + '">' + thoat(c.ten) + '</button>';
      }).join('') + '<span class="tkb-meta">' + lop.length + ' lớp · ' + soTietCS + ' tiết/tuần · ' + Object.keys(soGVCS).length + ' giáo viên</span></div>' +
      '<div class="tkb-cuon tkb-cuon-rong"><table class="tkb-rong"><thead>' +
      '<tr><th rowspan="2" class="dinh-trai">Thứ</th><th rowspan="2" class="dinh-trai2">Tiết</th>' +
      khoi.map(function (k) { return '<th colspan="' + k.n + '" class="tkb-khoi-dau">' + (k.k ? 'Khối ' + k.k : '') + '</th>'; }).join('') + '</tr>' +
      '<tr>' + lop.map(function (l) { return '<th class="tkb-lop-dau">' + thoat(l) + '</th>'; }).join('') + '</tr></thead><tbody>';
    dsThu.forEach(function (t) {
      var soDong = dsBuoi().reduce(function (a, b) { return a + mt[b]; }, 0);
      var dau = true;
      dsBuoi().forEach(function (b) {
        for (var i = 1; i <= mt[b]; i++) {
          h += '<tr class="' + (b === 'chieu' ? 'chieu' : '') + (dau ? ' dau-thu' : '') + '">' +
            (dau ? '<th rowspan="' + soDong + '" class="dinh-trai tkb-thu' + (t === hn ? ' hom-nay' : '') + '">' + TEN_THU_NGAN[t] + '</th>' : '') +
            '<th class="dinh-trai2 tkb-o-tiet">' + (b === 'sang' ? 'S' : 'C') + i + '</th>' +
            lop.map(function (l) {
              var x = m[l + '|' + t + '|' + b + '|' + i];
              return x ? '<td><div class="tkb-mon nho tkb-m-' + nhomMon(x.mon) + '"><b>' + thoat(x.mon) + '</b><i>' + thoat(x.gv_nhan || '') + '</i></div></td>'
                : '<td></td>';
            }).join('') + '</tr>';
          dau = false;
        }
      });
    });
    return h + '</tbody></table></div>';
  }

  // ── Thống kê tiết dạy của MỘT người hoặc MỘT lớp: theo thứ · buổi · môn · lớp/người ──
  // theo: 'lop' (thống kê của giáo viên, chia theo lớp) | 'gv' (của lớp, chia theo người dạy)
  function thongKeMot(loc, theo) {
    var ds = S.dl.tiet.filter(loc);
    if (!ds.length) return '';
    var dsThu = thuCo(), theoThu = {}, sang = 0, chieu = 0, theoMon = {}, theoPhu = {};
    ds.forEach(function (x) {
      var k = x.thu + (x.buoi === 'sang' ? 'S' : 'C');
      theoThu[k] = (theoThu[k] || 0) + 1;
      if (x.buoi === 'sang') sang++; else chieu++;
      theoMon[x.mon] = (theoMon[x.mon] || 0) + 1;
      var p = theo === 'lop' ? x.lop : (x.gv_nhan || 'chưa ghi tên');
      theoPhu[p] = (theoPhu[p] || 0) + 1;
    });
    function dongDem(obj, sx) {
      return Object.keys(obj).sort(sx || function (a, b) { return obj[b] - obj[a] || String(a).localeCompare(b, 'vi', { numeric: true }); })
        .map(function (k) { return '<span>' + thoat(k) + ' <b>' + obj[k] + '</b></span>'; }).join('');
    }
    return '<div class="tkb-thong-ke">' +
      '<div class="tkb-tk-tieu">Thống kê tiết dạy · <b>' + ds.length + '</b> tiết/tuần · sáng ' + sang + ' · chiều ' + chieu + '</div>' +
      '<div class="tkb-cuon"><table class="tkb-tk-bang"><thead><tr><th></th>' + dsThu.map(function (t) { return '<th>' + TEN_THU[t] + '</th>'; }).join('') + '<th>Cộng</th></tr></thead><tbody>' +
      ['S', 'C'].map(function (b) {
        var cong = 0;
        return '<tr><th>' + (b === 'S' ? 'Sáng' : 'Chiều') + '</th>' + dsThu.map(function (t) { var v = theoThu[t + b] || 0; cong += v; return '<td>' + (v || '·') + '</td>'; }).join('') + '<td><b>' + cong + '</b></td></tr>';
      }).join('') +
      '<tr class="cong"><th>Cả ngày</th>' + dsThu.map(function (t) { var v = (theoThu[t + 'S'] || 0) + (theoThu[t + 'C'] || 0); return '<td><b>' + (v || '·') + '</b></td>'; }).join('') + '<td><b>' + ds.length + '</b></td></tr>' +
      '</tbody></table></div>' +
      '<div class="tkb-tk-dong"><span class="tkb-tk-nhan">Theo môn</span>' + dongDem(theoMon) + '</div>' +
      '<div class="tkb-tk-dong"><span class="tkb-tk-nhan">' + (theo === 'lop' ? 'Theo lớp' : 'Người dạy') + '</span>' + dongDem(theoPhu, theo === 'lop' ? soSanhLop : null) + '</div>' +
      '</div>';
  }

  // ── Bảng thống kê tiết dạy TOÀN TRƯỜNG: mỗi giáo viên một dòng ──
  function veThongKe(dsGV) {
    var dl = S.dl, dsThu = thuCo();
    var coSo = dl.coSo.filter(function (c) { return lopDanhSach().some(function (l) { return (dl.lopCoSo[l] || '') === c.ma; }); });
    if (S.coSo !== 'all' && !coSo.some(function (c) { return c.ma === S.coSo; })) S.coSo = 'all';
    var dem = {};
    dl.tiet.forEach(function (x) {
      if (!x.gv_nhan) return;
      if (S.coSo !== 'all' && (dl.lopCoSo[x.lop] || '') !== S.coSo) return;
      var d = dem[x.gv_nhan] || (dem[x.gv_nhan] = { tong: 0, sang: 0, chieu: 0, thu: {}, lop: {} });
      d.tong++; d[x.buoi]++; d.thu[x.thu] = (d.thu[x.thu] || 0) + 1; d.lop[x.lop] = 1;
    });
    var ds = dsGV.filter(function (g) { return dem[g.gv_nhan]; });
    var tong = { tong: 0, sang: 0, chieu: 0, thu: {} };
    ds.forEach(function (g) {
      var d = dem[g.gv_nhan];
      tong.tong += d.tong; tong.sang += d.sang; tong.chieu += d.chieu;
      dsThu.forEach(function (t) { tong.thu[t] = (tong.thu[t] || 0) + (d.thu[t] || 0); });
    });
    return (coSo.length > 1 ? '<div class="tkb-loc-cs">' + [{ ma: 'all', ten: 'Toàn trường' }].concat(coSo).map(function (c) {
        return '<button class="tkb-chip-loc' + (S.coSo === c.ma ? ' on' : '') + '" data-co-so="' + thoat(c.ma) + '">' + thoat(c.ten) + '</button>';
      }).join('') + '</div>' : '') +
      '<div class="tkb-cuon"><table class="tkb-tk-bang rong"><thead><tr><th>TT</th><th class="trai">Giáo viên</th><th class="trai">Chủ nhiệm</th>' +
      '<th>Tổng tiết/tuần</th><th>Sáng</th><th>Chiều</th>' + dsThu.map(function (t) { return '<th>' + TEN_THU_NGAN[t] + '</th>'; }).join('') +
      '<th>Số lớp</th><th>Phân công</th><th>Chênh</th></tr></thead><tbody>' +
      ds.map(function (g, i) {
        var d = dem[g.gv_nhan];
        var chenh = g.so_tiet_pcgd ? d.tong - g.so_tiet_pcgd : null;
        return '<tr><td>' + (i + 1) + '</td><td class="trai"><button class="tkb-lien" data-gv-mo="' + thoat(g.gv_nhan) + '">' + thoat(g.ho_ten) + '</button><small>' + thoat(g.gv_nhan) + '</small></td>' +
          '<td class="trai">' + thoat(g.lop_cn || '') + '</td><td><b>' + d.tong + '</b></td><td>' + d.sang + '</td><td>' + d.chieu + '</td>' +
          dsThu.map(function (t) { return '<td>' + (d.thu[t] || '·') + '</td>'; }).join('') +
          '<td>' + Object.keys(d.lop).length + '</td><td>' + (g.so_tiet_pcgd || '') + '</td>' +
          '<td>' + (chenh === null || S.coSo !== 'all' ? '' : chenh === 0 ? '0' : '<b>' + (chenh > 0 ? '+' : '') + chenh + '</b>') + '</td></tr>';
      }).join('') +
      '<tr class="cong"><td></td><td class="trai"><b>Cộng ' + ds.length + ' giáo viên</b></td><td></td><td><b>' + tong.tong + '</b></td><td><b>' + tong.sang + '</b></td><td><b>' + tong.chieu + '</b></td>' +
      dsThu.map(function (t) { return '<td><b>' + (tong.thu[t] || 0) + '</b></td>'; }).join('') + '<td></td><td></td><td></td></tr>' +
      '</tbody></table></div>' +
      '<p class="tkb-meta" style="margin-top:8px">"Phân công" là số tiết khai ở trang PCGD của Smart Scheduler; "Chênh" khác 0 nghĩa là thời khóa biểu xếp thiếu hoặc thừa so với phân công. Bấm tên để xem thời khóa biểu của người đó.</p>';
  }

  function ganSuKien() {
    function tat(sel, fn) { Array.prototype.slice.call(EL.querySelectorAll(sel)).forEach(function (b) { b.addEventListener('click', function () { fn(b); }); }); }
    tat('[data-che-do]', function (b) { S.cheDo = b.getAttribute('data-che-do'); ve(); });
    tat('[data-buoi]', function (b) { S.buoi = b.getAttribute('data-buoi'); ve(); });
    tat('[data-lop]', function (b) { S.lop = b.getAttribute('data-lop'); ve(); });
    tat('[data-gv]', function (b) { S.gv = b.getAttribute('data-gv'); ve(); });
    tat('[data-co-so]', function (b) { S.coSo = b.getAttribute('data-co-so'); ve(); });
    tat('[data-gv-mo]', function (b) { S.gv = b.getAttribute('data-gv-mo'); S.cheDo = 'gv'; ve(); window.scrollTo(0, EL.getBoundingClientRect().top + window.scrollY - 80); });
    var pb = document.getElementById('tkb-pb');
    if (pb) pb.addEventListener('change', function () { S.pbId = +pb.value; S.dl = null; S.napXong = false; ve(); });
    var tim = document.getElementById('tkb-tim-gv');
    if (tim) tim.addEventListener('input', function () {
      S.timGV = tim.value;
      var vt = tim.selectionStart;
      ve();
      var moi = document.getElementById('tkb-tim-gv');
      if (moi) { moi.focus(); try { moi.setSelectionRange(vt, vt); } catch (e) { /* ô search cũ không hỗ trợ */ } }
    });
    document.getElementById('tkb-in').addEventListener('click', inTrang);
    document.getElementById('tkb-excel').addEventListener('click', xuatExcel);
  }

  // ══════════════════════════════════════════════════════════════
  // IN — cửa sổ riêng, chỉ có lưới, khổ ngang
  // ══════════════════════════════════════════════════════════════
  function inTrang() {
    var bang = EL.querySelector('.tkb-luoi, .tkb-rong, .tkb-tk-bang.rong');
    var tom = EL.querySelector('.tkb-tom');
    if (!bang) return;
    var cs = S.cheDo === 'truong';
    var w = window.open('', '_blank');
    if (!w) { if (window.notify) window.notify('Trình duyệt chặn cửa sổ in — cho phép cửa sổ bật lên rồi bấm lại.'); return; }
    var tieuDe = (window.CAU_HINH || {}).TEN_TRUONG || '';
    w.document.write('<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>Thời khóa biểu</title><style>' +
      '@page{size:' + (cs ? 'A3' : 'A4') + ' landscape;margin:10mm}' +
      'body{font:11px "Times New Roman",serif;color:#000;margin:0}h1{font-size:16px;text-align:center;margin:0 0 2px}' +
      '.phu{text-align:center;margin-bottom:8px}.tkb-tom{display:flex;gap:24px;justify-content:center;margin-bottom:6px}' +
      '.tkb-tom small{display:block}.tkb-nhan{font-weight:bold;margin-right:4px}' +
      'table{border-collapse:collapse;width:100%}th,td{border:1px solid #555;padding:2px 3px;text-align:center;vertical-align:middle}' +
      'th{background:#e8edf5}tr.chieu td{background:#fbf6e6}.tkb-mon b{display:block;font-size:' + (cs ? '9' : '11') + 'px}' +
      '.tkb-mon i{font-style:normal;font-size:' + (cs ? '8' : '10') + 'px;color:#333}.tkb-trong{height:14px}small{font-weight:normal}' +
      '</style></head><body><h1>THỜI KHÓA BIỂU</h1><div class="phu">' + thoat(tieuDe) + ' · ' +
      thoat(EL.querySelector('.tkb-meta') ? EL.querySelector('.tkb-meta').textContent : '') + '</div>' +
      (tom && !cs ? tom.outerHTML : '') + bang.outerHTML + '</body></html>');
    w.document.close();
    w.focus();
    setTimeout(function () { w.print(); }, 250);
  }

  // ══════════════════════════════════════════════════════════════
  // EXCEL — lưới rộng: theo lớp (cột = lớp) hoặc theo giáo viên (cột = GV)
  // ══════════════════════════════════════════════════════════════
  function xuatExcel() {
    if (!window.EXCEL_DEP) { if (window.notify) window.notify('Chưa nạp được bộ tạo Excel — tải lại trang.'); return; }
    var theoGV = S.cheDo === 'gv' || S.cheDo === 'toi';
    var dsCot = theoGV ? gvDanhSach().map(function (g) { return { khoa: g.gv_nhan, ten: g.ho_ten }; })
      : lopDanhSach().map(function (l) { return { khoa: l, ten: l }; });
    var m = {};
    S.dl.tiet.forEach(function (x) {
      var k = (theoGV ? x.gv_nhan : x.lop) + '|' + x.thu + '|' + x.buoi + '|' + x.tiet;
      var chuO = x.mon + '\n' + (theoGV ? x.lop : (x.gv_nhan || ''));
      m[k] = m[k] ? m[k] + ' + ' + (theoGV ? x.lop : (x.gv_nhan || '')) : chuO;
    });
    var mt = soTietBuoi(), dsThu = thuCo();
    var pb = (S.dsPhienBan || []).filter(function (x) { return x.id === S.pbId; })[0] || {};
    var sheets = ['sang', 'chieu'].filter(function (b) { return mt[b]; }).map(function (b) {
      var rows = [
        { cao: 24, o: [{ v: 'THỜI KHÓA BIỂU ' + (theoGV ? 'GIÁO VIÊN' : 'CÁC LỚP') + ' — BUỔI ' + (b === 'sang' ? 'SÁNG' : 'CHIỀU'), k: 'tt', gopN: dsCot.length + 1 }] },
        { o: [{ v: ((window.CAU_HINH || {}).TEN_TRUONG || '') + ' · Năm học ' + (pb.nam_hoc || '') + ' · áp dụng từ ' + ngayVN(pb.ap_dung_tu), k: 'tt3', gopN: dsCot.length + 1 }] },
        { o: [] },
        { cao: 30, o: [{ v: 'Thứ', k: 'dau' }, { v: 'Tiết', k: 'dau' }].concat(dsCot.map(function (c) { return { v: c.ten, k: 'dauW' }; })) }
      ];
      dsThu.forEach(function (t) {
        for (var i = 1; i <= mt[b]; i++) {
          rows.push({ cao: 32, o: [i === 1 ? { v: TEN_THU[t], k: 'thu', gopD: mt[b] - 1 } : { bo: true }, { v: i, k: 'tiet', so: true }]
            .concat(dsCot.map(function (c) { return { v: m[c.khoa + '|' + t + '|' + b + '|' + i] || '', k: 'oL' }; })) });
        }
      });
      return { ten: b === 'sang' ? 'Buổi sáng' : 'Buổi chiều', cols: [9, 5].concat(dsCot.map(function () { return theoGV ? 14 : 12; })), rows: rows,
        in: { dongBang: 4, cotBang: 2, vuaNgang: true } };
    });
    var byte = window.EXCEL_DEP.tao({ sheets: sheets });
    var ten = 'TKB-' + (theoGV ? 'giao-vien' : 'cac-lop') + '-' + (pb.ap_dung_tu || '') + '.xlsx';
    var u = URL.createObjectURL(new Blob([byte], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
    var a = document.createElement('a'); a.href = u; a.download = ten;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(u); }, 4000);
  }

  function xoaBoNho() { S.dsPhienBan = null; S.dl = null; S.pbId = null; S.loi = ''; S.napXong = false; BO_NHO_PB = {}; }

  window.TKB_XEM = {
    ve: ve, xoaBoNho: xoaBoNho,
    // cho js/day-thay.js
    docDsPhienBan: docDsPhienBan, docPhienBan: docPhienBan, phienBanNgay: phienBanNgay,
    duLieuMau: function () { return duLieuMau(); },
    moDayThay: function () { S.cheDo = 'daythay'; ve(); }
  };
})();
