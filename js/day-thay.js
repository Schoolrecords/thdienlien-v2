// ============================================================
// day-thay.js — THẺ "DẠY THAY" TRONG MÀN THỜI KHÓA BIỂU (giai đoạn 2)
//
// Thầy Chung duyệt 14/9/2026 (sổ dự án 92). Ba khung:
//   Bố trí          chọn NGÀY → đọc sổ vắng (gv_vang, gồm đơn nghỉ đã duyệt) →
//                   liệt kê tiết trống theo TKB bản áp dụng ngày đó → gợi ý
//                   (js/day-thay-luat.js) → Phân / Lớp tự quản / Huỷ
//   Danh sách       theo tuần / tháng, chép tin Zalo, in, tổng hợp mỗi người
//   Tiết của tôi    giáo viên thấy tiết mình được phân
// Quyền bố trí: quản trị / BGH toàn trường; phụ trách điểm trường trong điểm mình
// (thầy chốt 14/9). Tổ trưởng, giáo viên chỉ xem. RLS sql/65 là hàng rào thật.
//
// Nhắc trên TRANG CHỦ: DAY_THAY.ganNhac() — "Hôm nay thầy/cô dạy thay N tiết".
// ============================================================
(function () {
  'use strict';

  var L = function () { return window.DAY_THAY_LUAT; };
  function thoat(s) { return window.thoatHTML ? window.thoatHTML(s) : String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return '&#' + c.charCodeAt(0) + ';'; }); }
  function may() { return window.MAY_CHU; }
  function bao(s) { if (window.notify) window.notify(s); }
  function pad(n) { return ('0' + n).slice(-2); }
  function isoCua(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function homNayISO() { return isoCua(new Date()); }
  function congNgay(iso, n) { var p = iso.split('-'); var d = new Date(+p[0], +p[1] - 1, +p[2] + n); return isoCua(d); }
  function ngayVN(iso) { var p = String(iso || '').split('-'); return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : ''; }
  var TEN_THU = { 2: 'Thứ Hai', 3: 'Thứ Ba', 4: 'Thứ Tư', 5: 'Thứ Năm', 6: 'Thứ Sáu', 7: 'Thứ Bảy', 8: 'Chủ nhật' };
  function tenNgay(iso) { return (TEN_THU[L().thuCuaNgay(iso)] || '') + ', ' + ngayVN(iso); }
  function toiEmail() { return String((window.NGUOI_DUNG || {}).email || '').toLowerCase(); }
  function laQT() { var u = window.NGUOI_DUNG; return !window.MAY_CHU || (!!u && (u.vai_tro === 'admin' || u.vai_tro === 'ban_giam_hieu')); }
  function kiHieuTiet(b, t) { return (b === 'sang' ? 'S' : 'C') + t; }

  var D = {
    khung: 'bo-tri', ngay: homNayISO(), mo: '', moPA: '',
    ds: null, dl: null, pb: null, vang: [], dayThay: [], dayThayThang: [], quanLy: {}, coSo: [],
    dangNap: false, loi: '', khoa: '',
    dsTu: '', dsDen: '', dsDong: null
  };
  var EL = null;

  // ══════════════════════════════════════════════════════════════
  // NẠP
  // ══════════════════════════════════════════════════════════════
  function napNgay() {
    var ngay = D.ngay, khoa = ngay;
    D.dangNap = true; D.loi = ''; D.khoa = khoa;
    if (!may()) {
      // Xem thử: TKB mẫu + một người vắng mẫu
      var mau = window.TKB_XEM.duLieuMau();
      D.dl = mau; D.pb = { id: 0, ap_dung_tu: ngay, cong_bo: true };
      D.vang = [{ id: -1, ho_ten: 'Nguyễn Thị Mai', email: '', buoi: 'ca_ngay', co_so_ma: '', ly_do: 'Nghỉ ốm' }];
      D.dayThay = []; D.dayThayThang = []; D.quanLy = {}; D.coSo = [];
      D.dangNap = false;
      return Promise.resolve();
    }
    var dauThang = ngay.slice(0, 8) + '01', cuoiThang = congNgay(congNgay(dauThang, 32).slice(0, 8) + '01', -1);
    return window.TKB_XEM.docDsPhienBan().then(function (ds) {
      D.ds = ds;
      var pb = window.TKB_XEM.phienBanNgay(ds, ngay);
      D.pb = pb;
      return Promise.all([
        pb ? window.TKB_XEM.docPhienBan(pb) : Promise.resolve(null),
        may().from('gv_vang').select('id, ho_ten, email, co_so_ma, ly_do, buoi, ngay, den_ngay')
          .lte('ngay', ngay).or('and(den_ngay.is.null,ngay.eq.' + ngay + '),den_ngay.gte.' + ngay),
        may().from('day_thay').select('*').eq('ngay', ngay).neq('trang_thai', 'huy').order('buoi').order('tiet'),
        may().from('day_thay').select('id, ngay, buoi, tiet, lop, gv_thay_email, gv_thay_nhan, trang_thai')
          .gte('ngay', dauThang).lte('ngay', cuoiThang).neq('trang_thai', 'huy'),
        may().from('co_so').select('ma, ten, phu_trach_email').eq('hoat_dong', true).order('so_tt'),
        may().from('nguoi_dung').select('email, vai_tro').in('vai_tro', ['admin', 'ban_giam_hieu'])
      ]);
    }).then(function (r) {
      if (D.khoa !== khoa) return;
      if (r[2].error) throw r[2].error;
      if (r[1].error) throw r[1].error;
      D.dl = r[0];
      D.vang = (r[1].data || []).sort(function (a, b) { return String(a.ho_ten).localeCompare(b.ho_ten, 'vi'); });
      D.dayThay = r[2].data || [];
      D.dayThayThang = (r[3].data || []);
      D.coSo = (r[4] && r[4].data) || [];
      D.quanLy = {};
      ((r[5] && r[5].data) || []).forEach(function (u) { D.quanLy[String(u.email || '').toLowerCase()] = true; });
    }).catch(function (e) {
      var m = String((e && (e.message || e.details)) || e || '');
      D.loi = /day_thay|does not exist|schema cache|Could not find/i.test(m)
        ? 'Cơ sở dữ liệu của trường chưa có bảng dạy thay — người phụ trách hệ thống cần chạy sql/65-day-thay.sql.'
        : 'Không tải được dữ liệu dạy thay: ' + m;
    }).then(function () { if (D.khoa === khoa) D.dangNap = false; });
  }

  function duocBoTri(coSoMa) {
    if (laQT()) return true;
    var e = toiEmail();
    return !!e && D.coSo.some(function (c) { return c.ma === coSoMa && String(c.phu_trach_email || '').toLowerCase() === e; });
  }
  function boiCanh() {
    return L().boiCanh({ ngay: D.ngay, tiet: D.dl.tiet, gv: D.dl.gv, lopCoSo: D.dl.lopCoSo, vang: D.vang,
      dayThay: D.dayThay, dayThayThang: D.dayThayThang, quanLy: D.quanLy });
  }

  // ══════════════════════════════════════════════════════════════
  // VẼ
  // ══════════════════════════════════════════════════════════════
  function ve(el) {
    if (el) EL = el;
    if (!EL || !document.body.contains(EL)) return;
    if (!L()) { EL.innerHTML = '<div class="hd-kiem do">Thiếu tệp js/day-thay-luat.js — tải lại trang.</div>'; return; }
    var khungNut = [['bo-tri', 'Bố trí theo ngày'], ['danh-sach', 'Danh sách dạy thay'], ['cua-toi', 'Tiết dạy thay của tôi']];
    var dau = '<div class="dt-dau"><div class="tkb-buoi">' + khungNut.map(function (k) {
      return '<button class="' + (D.khung === k[0] ? 'on' : '') + '" data-khung="' + k[0] + '">' + k[1] + '</button>';
    }).join('') + '</div></div>';

    if (D.khung === 'danh-sach') { EL.innerHTML = dau + '<div id="dt-than"></div>'; ganKhung(); veDanhSach(document.getElementById('dt-than')); return; }
    if (D.khung === 'cua-toi') { EL.innerHTML = dau + '<div id="dt-than"></div>'; ganKhung(); veCuaToi(document.getElementById('dt-than')); return; }

    if (D.khoa !== D.ngay && !D.dangNap) {
      EL.innerHTML = dau + '<div class="the-thong-bao">Đang tải…</div>';
      ganKhung();
      napNgay().then(function () { ve(); });
      return;
    }
    if (D.dangNap) { EL.innerHTML = dau + '<div class="the-thong-bao">Đang tải…</div>'; ganKhung(); return; }

    var chonNgay = '<div class="dt-ngay">' +
      '<button class="dh-nut-nho" data-lui="-1" aria-label="Ngày trước">‹</button>' +
      '<input type="date" id="dt-chon-ngay" class="tkb-chon" value="' + D.ngay + '">' +
      '<button class="dh-nut-nho" data-lui="1" aria-label="Ngày sau">›</button>' +
      '<b>' + thoat(tenNgay(D.ngay)) + '</b>' +
      (D.ngay !== homNayISO() ? '<button class="dh-nut-nho" data-hom-nay="1">Hôm nay</button>' : '') + '</div>';

    var h = dau + chonNgay;
    if (D.loi) { EL.innerHTML = h + '<div class="hd-kiem do">' + thoat(D.loi) + '</div>'; ganKhung(); ganNgay(); return; }
    var thu = L().thuCuaNgay(D.ngay);
    if (!D.pb || !D.dl) {
      EL.innerHTML = h + '<div class="the-thong-bao">Chưa có thời khóa biểu <b>đã công bố</b> áp dụng cho ngày này — ' +
        'không biết lớp nào học tiết nào để bố trí.</div>';
      ganKhung(); ganNgay(); return;
    }
    if (thu === 8) { EL.innerHTML = h + '<div class="the-thong-bao">Chủ nhật — không có tiết học.</div>'; ganKhung(); ganNgay(); return; }

    var bc = boiCanh();
    var tong = 0, chua = 0;
    var the = D.vang.map(function (v) {
      var dsTiet = L().tietCanThay(bc, v);
      tong += dsTiet.length;
      chua += dsTiet.filter(function (x) { return !x.daPhan; }).length;
      return veNguoiVang(bc, v, dsTiet);
    });

    h += '<div class="tkb-tom">' +
      '<div><span class="tkb-nhan">Người vắng</span><b class="so">' + D.vang.length + '</b><small>theo sổ vắng ngày này</small></div>' +
      '<div><span class="tkb-nhan">Tiết cần thay</span><b class="so">' + tong + '</b><small>theo TKB áp dụng từ ' + ngayVN(D.pb.ap_dung_tu) + '</small></div>' +
      '<div><span class="tkb-nhan">Chưa bố trí</span><b class="so" style="color:' + (chua ? 'var(--thieu)' : 'var(--ok)') + '">' + chua + '</b><small>' + (chua ? 'tiết' : 'đã đủ') + '</small></div>' +
      (D.dayThay.length ? '<div class="dt-nut-tom"><button class="dh-nut-nho" id="dt-zalo">📋 Chép tin Zalo</button>' +
        (laQT() && D.dayThay.some(function (d) { return d.trang_thai === 'da_phan'; }) ? '<button class="dh-nut-nho" id="dt-da-bao">✓ Đánh dấu đã báo</button>' : '') + '</div>' : '') +
      '</div>';

    if (!D.vang.length) {
      h += '<div class="hd-kiem xanh">🟢 Không có ai trong sổ vắng ngày ' + ngayVN(D.ngay) + ' — chưa phải bố trí dạy thay. ' +
        'Người vắng khai ở <b>Điểm danh &amp; Chấm công</b> (hoặc đơn nghỉ đã duyệt) sẽ hiện ra đây.</div>';
    }
    EL.innerHTML = h + the.join('');
    ganKhung(); ganNgay(); ganBoTri(bc);
  }

  function veNguoiVang(bc, v, dsTiet) {
    var khop = L().gvCuaVang(bc, v);
    var h = '<section class="dt-the"><header><div><b>' + thoat(v.ho_ten) + '</b>' +
      (khop[0] && khop[0].nhan !== v.ho_ten ? ' <small>(' + thoat(khop[0].nhan) + ')</small>' : '') +
      '<small>' + thoat(v.ly_do || '') + ' · ' + (v.buoi === 'ca_ngay' ? 'cả ngày' : v.buoi === 'sang' ? 'buổi sáng' : 'buổi chiều') +
      (v.den_ngay && v.den_ngay !== v.ngay ? ' · ' + ngayVN(v.ngay) + ' → ' + ngayVN(v.den_ngay) : '') + '</small></div>' +
      '<span class="tkb-chip ' + (dsTiet.every(function (x) { return x.daPhan; }) ? 'xanh' : 'do') + '">' +
      dsTiet.filter(function (x) { return x.daPhan; }).length + '/' + dsTiet.length + ' tiết đã bố trí</span></header>';
    if (!khop.length) {
      return h + '<div class="hd-kiem vang" style="margin:10px 0 0">Không tìm thấy người này trong thời khóa biểu (không có tiết, hoặc email/họ tên khác với tệp Smart Scheduler). ' +
        'Nếu người này có dạy, ghép lại tên ở <b>Quản trị › 🗓️ Thời khóa biểu</b>.</div></section>';
    }
    if (!dsTiet.length) return h + '<p class="dt-rong">Không có tiết nào ' + (v.buoi === 'ca_ngay' ? 'trong ngày' : 'buổi này') + ' — không cần người thay.</p></section>';

    ['sang', 'chieu'].forEach(function (b) {
      var tiet = dsTiet.filter(function (x) { return x.buoi === b; });
      if (!tiet.length) return;
      var coQuyen = duocBoTri(tiet[0].coSo);
      var conTrong = tiet.filter(function (x) { return !x.daPhan; });
      var khoaPA = v.id + '|' + b;
      h += '<div class="dt-buoi"><div class="dt-buoi-dau"><span>' + (b === 'sang' ? 'Buổi sáng' : 'Buổi chiều') + '</span>' +
        (coQuyen && conTrong.length > 1 ? '<button class="dh-nut-nho" data-pa="' + thoat(khoaPA) + '">' + (D.moPA === khoaPA ? 'Ẩn phương án' : '✨ Phương án cả buổi') + '</button>' : '') + '</div>';
      if (coQuyen && D.moPA === khoaPA) h += vePhuongAn(bc, tiet, khoaPA);
      tiet.forEach(function (x) {
        var k = [x.buoi, x.tiet, x.lop].join('|');
        var d = x.daPhan;
        h += '<div class="dt-tiet' + (d ? ' da' : '') + '"><span class="dt-ki">' + kiHieuTiet(x.buoi, x.tiet) + '</span>' +
          '<span class="dt-lop"><b>' + thoat(x.lop) + '</b> · ' + thoat(x.mon) + '</span>' +
          '<span class="dt-ai">' + (d ? (d.gv_thay_email || d.gv_thay_nhan ? '👤 <b>' + thoat(d.gv_thay_ten || d.gv_thay_nhan) + '</b>' : '<i>Lớp tự quản</i>') +
            (d.trang_thai === 'da_bao' ? ' <span class="tkb-chip xanh">đã báo</span>' : '') : '<span class="tkb-chip do">chưa có người</span>') + '</span>' +
          (coQuyen ? '<span class="dt-hanh">' + (d
            ? '<button class="dh-nut-nho" data-mo="' + thoat(k) + '">Đổi</button><button class="dh-nut-nho" data-huy="' + d.id + '">Huỷ</button>'
            : '<button class="dh-nut-nho" data-mo="' + thoat(k) + '">' + (D.mo === k ? 'Ẩn' : 'Gợi ý') + '</button>') + '</span>' : '') +
          '</div>';
        if (coQuyen && D.mo === k) h += veGoiY(bc, x, v);
      });
      h += '</div>';
    });
    return h + '</section>';
  }

  function chips(lyDo) {
    return lyDo.map(function (l) { return '<span class="tkb-chip ' + (l.k === 'tot' ? 'xanh' : l.k === 'canh' ? 'vang' : 'xam') + '">' + thoat(l.t) + '</span>'; }).join('');
  }
  function veGoiY(bc, x, v) {
    var boQua = x.daPhan ? [x.daPhan.id] : [];
    var uv = L().ungVien(bc, x, boQua).slice(0, 5);
    var k = [x.buoi, x.tiet, x.lop].join('|');
    return '<div class="dt-goi-y">' + (uv.length ? uv.map(function (u, i) {
      return '<div class="dt-uv' + (i === 0 ? ' nhat' : '') + '"><div><b>' + thoat(u.gv.ten) + '</b> <small>' + thoat(u.gv.nhan) + '</small>' +
        '<div class="dt-ly-do">' + chips(u.lyDo) + '</div></div>' +
        '<button class="' + (i === 0 ? 'nut-chinh' : 'dh-nut-nho') + '" data-phan="' + thoat(k) + '" data-gv="' + thoat(u.gv.nhan) + '" data-vang="' + v.id + '">Phân</button></div>';
    }).join('') : '<div class="hd-kiem vang" style="margin:0">Không còn ai hợp lệ cho tiết này (đều đang có tiết, vắng, ở điểm trường khác hoặc đã đủ ' + L().GIOI_HAN_BUOI + ' tiết/buổi).</div>') +
      '<div class="dt-uv tu-quan"><div><b>Lớp tự quản</b><div class="dt-ly-do"><span class="tkb-chip xam">không phân người — ghi vào danh sách để theo dõi</span></div></div>' +
      '<button class="dh-nut-nho" data-phan="' + thoat(k) + '" data-gv="" data-vang="' + v.id + '">Chọn</button></div></div>';
  }
  function vePhuongAn(bc, tiet, khoaPA) {
    var pa = L().phuongAn(bc, tiet);
    if (!pa.length) return '<div class="dt-goi-y"><div class="hd-kiem vang" style="margin:0">Không ghép được phương án cả buổi — dùng nút Gợi ý từng tiết.</div></div>';
    PA_TAM[khoaPA] = pa;
    return '<div class="dt-goi-y">' + pa.map(function (p, i) {
      return '<div class="dt-uv' + (i === 0 ? ' nhat' : '') + '"><div><b>' + thoat(p.tieuDe) + '</b>' +
        '<div class="dt-ly-do">' + chips(p.lyDo || []) + '</div>' +
        (p.loai === 'ghep' ? '<small>' + p.gan.map(function (g) { return kiHieuTiet(g.tiet.buoi, g.tiet.tiet) + ' ' + thoat(g.gv.ten); }).join(' · ') + '</small>' : '') +
        '</div><button class="' + (i === 0 ? 'nut-chinh' : 'dh-nut-nho') + '" data-chon-pa="' + thoat(khoaPA) + '" data-i="' + i + '">Chọn</button></div>';
    }).join('') + '</div>';
  }
  var PA_TAM = {};

  // ══════════════════════════════════════════════════════════════
  // SỰ KIỆN + GHI
  // ══════════════════════════════════════════════════════════════
  function tat(sel, fn) { Array.prototype.slice.call(EL.querySelectorAll(sel)).forEach(function (b) { b.addEventListener('click', function () { fn(b); }); }); }
  function ganKhung() { tat('[data-khung]', function (b) { D.khung = b.getAttribute('data-khung'); ve(); }); }
  function ganNgay() {
    var o = document.getElementById('dt-chon-ngay');
    if (o) o.addEventListener('change', function () { if (/^\d{4}-\d{2}-\d{2}$/.test(o.value)) { D.ngay = o.value; D.mo = ''; D.moPA = ''; ve(); } });
    tat('[data-lui]', function (b) { D.ngay = congNgay(D.ngay, +b.getAttribute('data-lui')); D.mo = ''; D.moPA = ''; ve(); });
    tat('[data-hom-nay]', function () { D.ngay = homNayISO(); ve(); });
  }
  function ganBoTri(bc) {
    tat('[data-mo]', function (b) { var k = b.getAttribute('data-mo'); D.mo = D.mo === k ? '' : k; D.moPA = ''; ve(); });
    tat('[data-pa]', function (b) { var k = b.getAttribute('data-pa'); D.moPA = D.moPA === k ? '' : k; D.mo = ''; ve(); });
    tat('[data-phan]', function (b) {
      var p = b.getAttribute('data-phan').split('|');
      var v = D.vang.filter(function (x) { return String(x.id) === b.getAttribute('data-vang'); })[0];
      var x = L().tietCanThay(bc, v).filter(function (t) { return t.buoi === p[0] && String(t.tiet) === p[1] && t.lop === p[2]; })[0];
      if (!x) return;
      var g = b.getAttribute('data-gv') ? bc.theoNhan[b.getAttribute('data-gv')] : null;
      ghi([{ tiet: x, gv: g }], v, b);
    });
    tat('[data-chon-pa]', function (b) {
      var pa = (PA_TAM[b.getAttribute('data-chon-pa')] || [])[+b.getAttribute('data-i')];
      var v = D.vang.filter(function (x) { return String(x.id) === b.getAttribute('data-chon-pa').split('|')[0]; })[0];
      if (pa && v) ghi(pa.gan, v, b);
    });
    tat('[data-huy]', function (b) {
      var id = +b.getAttribute('data-huy');
      var xn = window.hopHoi ? window.hopHoi('Huỷ bố trí dạy thay tiết này? Tiết sẽ trở lại "chưa có người".', { tieuDe: 'Dạy thay', nutOK: 'Huỷ bố trí' }) : Promise.resolve(window.confirm('Huỷ bố trí tiết này?'));
      xn.then(function (ok) {
        if (!ok) return;
        if (!may()) { D.dayThay = D.dayThay.filter(function (d) { return d.id !== id; }); ve(); return; }
        b.disabled = true;
        may().from('day_thay').update({ trang_thai: 'huy' }).eq('id', id).select('id').then(function (r) {
          if (r.error || !r.data || !r.data.length) { b.disabled = false; bao('Không huỷ được: ' + (r.error ? r.error.message : 'không đủ quyền')); return; }
          bao('Đã huỷ bố trí.'); taiLai();
        });
      });
    });
    var z = document.getElementById('dt-zalo');
    if (z) z.addEventListener('click', function () { chepZalo(D.ngay, D.dayThay); });
    var db = document.getElementById('dt-da-bao');
    if (db) db.addEventListener('click', function () {
      if (!may()) return;
      db.disabled = true;
      may().from('day_thay').update({ trang_thai: 'da_bao' }).eq('ngay', D.ngay).eq('trang_thai', 'da_phan').select('id').then(function (r) {
        if (r.error) { db.disabled = false; bao('Không lưu được: ' + r.error.message); return; }
        bao('Đã đánh dấu ' + (r.data || []).length + ' tiết là đã báo.'); taiLai();
      });
    });
  }
  function taiLai() { D.khoa = ''; D.mo = ''; D.moPA = ''; ve(); }

  // gan = [{ tiet: {buoi,tiet,lop,mon,gvNhan,coSo,daPhan}, gv: {nhan,ten,email} | null }]
  function ghi(gan, v, nut) {
    var dong = gan.map(function (g) {
      return { buoi: g.tiet.buoi, tiet: g.tiet.tiet, lop: g.tiet.lop, gv_thay_email: g.gv ? g.gv.email : '', gv_thay_nhan: g.gv ? g.gv.nhan : '' };
    });
    var boQua = gan.map(function (g) { return g.tiet.daPhan ? g.tiet.daPhan.id : null; }).filter(Boolean);
    var chuHoi = gan.map(function (g) {
      return kiHieuTiet(g.tiet.buoi, g.tiet.tiet) + ' · ' + g.tiet.lop + ' · ' + g.tiet.mon + ' → ' + (g.gv ? g.gv.ten : 'lớp tự quản');
    }).join('\n');
    var xn = window.hopHoi ? window.hopHoi('Bố trí dạy thay ' + tenNgay(D.ngay) + ' (thay ' + v.ho_ten + '):\n\n' + chuHoi, { tieuDe: 'Dạy thay', nutOK: 'Bố trí' })
      : Promise.resolve(window.confirm(chuHoi));
    xn.then(function (ok) {
      if (!ok) return;
      if (nut) nut.disabled = true;
      var ban = function (g) {
        return { ngay: D.ngay, buoi: g.tiet.buoi, tiet: g.tiet.tiet, lop: g.tiet.lop, mon: g.tiet.mon, co_so_ma: g.tiet.coSo || null,
          phien_ban_id: D.pb && D.pb.id ? D.pb.id : null, gv_vang_id: v.id > 0 ? v.id : null,
          gv_vang_nhan: g.tiet.gvNhan, gv_vang_ten: v.ho_ten, gv_vang_email: v.email || null,
          gv_thay_nhan: g.gv ? g.gv.nhan : null, gv_thay_ten: g.gv ? g.gv.ten : null, gv_thay_email: g.gv ? (g.gv.email || null) : null,
          trang_thai: 'da_phan' };
      };
      if (!may()) {
        gan.forEach(function (g, i) { D.dayThay = D.dayThay.filter(function (d) { return !(d.buoi === g.tiet.buoi && d.tiet === g.tiet.tiet && d.lop === g.tiet.lop); }); D.dayThay.push(Object.assign({ id: -100 - D.dayThay.length - i }, ban(g))); });
        D.mo = ''; D.moPA = ''; ve(); return;
      }
      // Đọc lại dạy thay của ngày NGAY TRƯỚC KHI GHI rồi soát — người khác có thể vừa bố trí
      may().from('day_thay').select('*').eq('ngay', D.ngay).neq('trang_thai', 'huy').then(function (r) {
        if (r.error) throw r.error;
        D.dayThay = r.data || [];
        var loi = L().xungDot(boiCanh(), dong, boQua);
        var trungLop = gan.filter(function (g) { return D.dayThay.some(function (d) { return boQua.indexOf(d.id) < 0 && d.buoi === g.tiet.buoi && +d.tiet === +g.tiet.tiet && d.lop === g.tiet.lop; }); });
        if (trungLop.length) loi.push('Tiết ' + trungLop.map(function (g) { return kiHieuTiet(g.tiet.buoi, g.tiet.tiet) + ' ' + g.tiet.lop; }).join(', ') + ' vừa được người khác bố trí');
        if (loi.length) { if (nut) nut.disabled = false; bao('Chưa ghi — ' + loi.join('; ') + '. Màn hình đã tải lại số mới.'); taiLai(); return null; }
        var huyCu = boQua.length ? may().from('day_thay').update({ trang_thai: 'huy' }).in('id', boQua).select('id') : Promise.resolve({ data: [] });
        return huyCu.then(function (h) {
          if (h.error) throw h.error;
          return may().from('day_thay').insert(gan.map(ban)).select('id');
        }).then(function (w) {
          if (w.error) {
            var m = String(w.error.message || '');
            throw new Error(/duplicate|unique|23505/i.test(m + w.error.code) ? 'Vừa có người bố trí trùng lớp/tiết hoặc trùng người — tải lại để xem.' : m);
          }
          bao('✅ Đã bố trí ' + gan.length + ' tiết.');
          taiLai();
        });
      }).catch(function (e) { if (nut) nut.disabled = false; bao('Không ghi được: ' + ((e && e.message) || e)); taiLai(); });
    });
  }

  function chepZalo(ngay, dong) {
    var chu = L().vanBanZalo(ngay, dong, (window.CAU_HINH || {}).TEN_TRUONG || '');
    var xong = function () { bao('📋 Đã chép — dán vào nhóm Zalo của trường.'); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(chu).then(xong, function () { hienChu(chu); });
    else hienChu(chu);
  }
  function hienChu(chu) {
    var t = document.createElement('textarea');
    t.value = chu; document.body.appendChild(t); t.select();
    try { document.execCommand('copy'); bao('📋 Đã chép — dán vào nhóm Zalo của trường.'); } catch (e) { window.prompt('Chép đoạn này:', chu); }
    document.body.removeChild(t);
  }

  // ══════════════════════════════════════════════════════════════
  // DANH SÁCH DẠY THAY
  // ══════════════════════════════════════════════════════════════
  function veDanhSach(vung) {
    var hn = homNayISO();
    if (!D.dsTu) { D.dsTu = hn.slice(0, 8) + '01'; D.dsDen = congNgay(congNgay(D.dsTu, 32).slice(0, 8) + '01', -1); }
    var dauTuan = congNgay(hn, -((L().thuCuaNgay(hn) - 2 + 7) % 7));
    var h = '<div class="dt-ngay">' +
      '<button class="chip-loc" data-tam="tuan">Tuần này</button><button class="chip-loc" data-tam="thang">Tháng này</button>' +
      '<button class="chip-loc" data-tam="thang-truoc">Tháng trước</button>' +
      '<label>Từ <input type="date" id="dt-tu" class="tkb-chon" value="' + D.dsTu + '"></label>' +
      '<label>đến <input type="date" id="dt-den" class="tkb-chon" value="' + D.dsDen + '"></label>' +
      '<button class="dh-nut-nho" id="dt-in">🖨️ In</button></div><div id="dt-ds-bang"><div class="the-thong-bao">Đang tải…</div></div>';
    vung.innerHTML = h;
    function doi(tu, den) { D.dsTu = tu; D.dsDen = den; veDanhSach(vung); }
    Array.prototype.slice.call(vung.querySelectorAll('[data-tam]')).forEach(function (b) {
      b.addEventListener('click', function () {
        var t = b.getAttribute('data-tam');
        if (t === 'tuan') doi(dauTuan, congNgay(dauTuan, 6));
        else if (t === 'thang') doi(hn.slice(0, 8) + '01', congNgay(congNgay(hn.slice(0, 8) + '01', 32).slice(0, 8) + '01', -1));
        else { var dau = congNgay(hn.slice(0, 8) + '01', -1).slice(0, 8) + '01'; doi(dau, congNgay(hn.slice(0, 8) + '01', -1)); }
      });
    });
    ['dt-tu', 'dt-den'].forEach(function (id) {
      document.getElementById(id).addEventListener('change', function () {
        var tu = document.getElementById('dt-tu').value, den = document.getElementById('dt-den').value;
        if (tu && den && tu <= den) doi(tu, den);
      });
    });
    var bang = document.getElementById('dt-ds-bang');
    var lay = may() ? may().from('day_thay').select('*').gte('ngay', D.dsTu).lte('ngay', D.dsDen).neq('trang_thai', 'huy')
      .order('ngay').order('buoi').order('tiet').limit(2000).then(function (r) { if (r.error) throw r.error; return r.data || []; })
      : Promise.resolve(D.dayThay);
    lay.then(function (ds) {
      if (!ds.length) { bang.innerHTML = '<div class="the-thong-bao">Không có tiết dạy thay nào từ ' + ngayVN(D.dsTu) + ' đến ' + ngayVN(D.dsDen) + '.</div>'; return; }
      var theoNguoi = {};
      ds.forEach(function (d) { if (d.gv_thay_email || d.gv_thay_nhan) { var k = d.gv_thay_ten || d.gv_thay_nhan; theoNguoi[k] = (theoNguoi[k] || 0) + 1; } });
      var tuQuan = ds.filter(function (d) { return !d.gv_thay_email && !d.gv_thay_nhan; }).length;
      bang.innerHTML =
        '<div class="dh-tieu-de">Tổng hợp theo người dạy thay · ' + ngayVN(D.dsTu) + ' → ' + ngayVN(D.dsDen) + '</div>' +
        '<div class="dt-tong-nguoi">' + Object.keys(theoNguoi).sort(function (a, b) { return theoNguoi[b] - theoNguoi[a] || a.localeCompare(b, 'vi'); }).map(function (k) {
          return '<span><b>' + thoat(k) + '</b> ' + theoNguoi[k] + ' tiết</span>';
        }).join('') + (tuQuan ? '<span><i>Lớp tự quản</i> ' + tuQuan + ' tiết</span>' : '') + '</div>' +
        '<div class="cuon-ngang" style="margin-top:10px"><table class="bang-quan-tri nho dt-bang"><thead><tr><th>Ngày</th><th>Tiết</th><th>Lớp · Môn</th><th>Người vắng</th><th>Người dạy thay</th><th>Trạng thái</th><th></th></tr></thead><tbody>' +
        ds.map(function (d) {
          return '<tr><td>' + thoat(tenNgay(d.ngay)) + '</td><td class="ma">' + kiHieuTiet(d.buoi, d.tiet) + '</td><td><b>' + thoat(d.lop) + '</b> · ' + thoat(d.mon) + '</td>' +
            '<td>' + thoat(d.gv_vang_ten || '') + '</td><td>' + (d.gv_thay_email || d.gv_thay_nhan ? thoat(d.gv_thay_ten || d.gv_thay_nhan) : '<i>Lớp tự quản</i>') + '</td>' +
            '<td>' + (d.trang_thai === 'da_bao' ? '<span class="tkb-chip xanh">đã báo</span>' : '<span class="tkb-chip vang">chưa báo</span>') + '</td>' +
            '<td><button class="dh-nut-nho" data-toi-ngay="' + d.ngay + '">Mở ngày</button></td></tr>';
        }).join('') + '</tbody></table></div>';
      Array.prototype.slice.call(bang.querySelectorAll('[data-toi-ngay]')).forEach(function (b) {
        b.addEventListener('click', function () { D.ngay = b.getAttribute('data-toi-ngay'); D.khung = 'bo-tri'; ve(); });
      });
      document.getElementById('dt-in').onclick = function () { inDanhSach(ds, theoNguoi, tuQuan); };
    }).catch(function (e) { bang.innerHTML = '<div class="hd-kiem do">Không tải được: ' + thoat((e && e.message) || e) + '</div>'; });
  }

  function inDanhSach(ds, theoNguoi, tuQuan) {
    var w = window.open('', '_blank');
    if (!w) { bao('Trình duyệt chặn cửa sổ in — cho phép cửa sổ bật lên rồi bấm lại.'); return; }
    var ten = (window.CAU_HINH || {}).TEN_TRUONG || '';
    w.document.write('<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>Danh sách dạy thay</title><style>' +
      '@page{size:A4 portrait;margin:15mm 15mm 15mm 25mm}body{font:13px "Times New Roman",serif;color:#000}' +
      'h1{font-size:15px;text-align:center;margin:10px 0 2px}.phu{text-align:center;font-style:italic;margin-bottom:10px}' +
      'table{border-collapse:collapse;width:100%}th,td{border:1px solid #000;padding:3px 5px;vertical-align:top}th{background:#eee}' +
      '.tong{margin:8px 0}.tong span{margin-right:14px}.ky{display:flex;justify-content:flex-end;margin-top:24px;text-align:center}' +
      '</style></head><body><div><b>' + thoat(String(ten).toUpperCase()) + '</b></div>' +
      '<h1>DANH SÁCH BỐ TRÍ DẠY THAY</h1><div class="phu">Từ ngày ' + ngayVN(D.dsTu) + ' đến ngày ' + ngayVN(D.dsDen) + '</div>' +
      '<table><thead><tr><th>TT</th><th>Ngày</th><th>Tiết</th><th>Lớp</th><th>Môn</th><th>Người vắng</th><th>Người dạy thay</th></tr></thead><tbody>' +
      ds.map(function (d, i) {
        return '<tr><td>' + (i + 1) + '</td><td>' + ngayVN(d.ngay) + '</td><td>' + kiHieuTiet(d.buoi, d.tiet) + '</td><td>' + thoat(d.lop) + '</td><td>' + thoat(d.mon) + '</td>' +
          '<td>' + thoat(d.gv_vang_ten || '') + '</td><td>' + (d.gv_thay_ten || d.gv_thay_nhan ? thoat(d.gv_thay_ten || d.gv_thay_nhan) : 'Lớp tự quản') + '</td></tr>';
      }).join('') + '</tbody></table><div class="tong"><b>Tổng hợp:</b> ' + Object.keys(theoNguoi).map(function (k) { return '<span>' + thoat(k) + ': ' + theoNguoi[k] + ' tiết</span>'; }).join('') +
      (tuQuan ? '<span>Lớp tự quản: ' + tuQuan + ' tiết</span>' : '') + '</div>' +
      '<div class="ky"><div><b>NGƯỜI LẬP</b><br><br><br><br></div></div></body></html>');
    w.document.close(); w.focus(); setTimeout(function () { w.print(); }, 250);
  }

  // ══════════════════════════════════════════════════════════════
  // TIẾT DẠY THAY CỦA TÔI
  // ══════════════════════════════════════════════════════════════
  function veCuaToi(vung) {
    var e = toiEmail();
    if (!may() || !e) { vung.innerHTML = '<div class="the-thong-bao">Đăng nhập để xem tiết dạy thay của mình.</div>'; return; }
    var hn = homNayISO();
    vung.innerHTML = '<div class="the-thong-bao">Đang tải…</div>';
    may().from('day_thay').select('*').eq('gv_thay_email', e).neq('trang_thai', 'huy')
      .gte('ngay', hn.slice(0, 8) + '01').order('ngay').order('buoi').order('tiet').limit(300)
      .then(function (r) {
        if (r.error) throw r.error;
        var ds = r.data || [];
        var sap = ds.filter(function (d) { return d.ngay >= hn; });
        var thangNay = ds.filter(function (d) { return d.ngay.slice(0, 7) === hn.slice(0, 7); }).length;
        vung.innerHTML = '<div class="tkb-tom"><div><span class="tkb-nhan">Sắp tới</span><b class="so">' + sap.length + ' tiết</b><small>từ hôm nay</small></div>' +
          '<div><span class="tkb-nhan">Tháng này</span><b class="so">' + thangNay + ' tiết</b><small>đã và sẽ dạy thay</small></div></div>' +
          (sap.length ? '<div class="dt-cua-toi">' + sap.map(function (d) {
            return '<div class="dt-tiet' + (d.ngay === hn ? ' hom-nay' : '') + '"><span class="dt-ki">' + kiHieuTiet(d.buoi, d.tiet) + '</span>' +
              '<span class="dt-lop"><b>' + thoat(d.lop) + '</b> · ' + thoat(d.mon) + '</span>' +
              '<span class="dt-ai">' + thoat(tenNgay(d.ngay)) + (d.ngay === hn ? ' · <b>hôm nay</b>' : '') + '</span>' +
              '<span class="dt-hanh"><small>thay ' + thoat(d.gv_vang_ten || '') + '</small></span></div>';
          }).join('') + '</div>' : '<div class="hd-kiem xanh">Thầy cô chưa được phân dạy thay tiết nào sắp tới.</div>');
      }).catch(function (err) { vung.innerHTML = '<div class="hd-kiem do">Không tải được: ' + thoat((err && err.message) || err) + '</div>'; });
  }

  // ══════════════════════════════════════════════════════════════
  // NHẮC TRÊN TRANG CHỦ — "Hôm nay thầy/cô dạy thay N tiết"
  // ══════════════════════════════════════════════════════════════
  var NHAC = { khoa: '', html: '' };
  function ganNhac(vung) {
    if (!vung || !may()) return;
    var e = toiEmail(), hn = homNayISO(), khoa = e + '|' + hn;
    if (!e) { vung.innerHTML = ''; return; }
    if (NHAC.khoa === khoa) { vung.innerHTML = NHAC.html; return; }
    NHAC.khoa = khoa;
    may().from('day_thay').select('buoi, tiet, lop, mon, gv_vang_ten').eq('gv_thay_email', e).eq('ngay', hn).neq('trang_thai', 'huy')
      .order('buoi').order('tiet').then(function (r) {
        if (r.error || !(r.data || []).length) { NHAC.html = ''; vung.innerHTML = ''; return; }
        var ds = r.data;
        NHAC.html = '<a class="dt-nhac" href="#" onclick="DH.moTab(\'tkb\');window.TKB_XEM&&TKB_XEM.moDayThay();return false;">' +
          '<b>👩‍🏫 Hôm nay thầy cô dạy thay ' + ds.length + ' tiết:</b> ' +
          ds.map(function (d) { return kiHieuTiet(d.buoi, d.tiet) + ' ' + thoat(d.lop) + ' ' + thoat(d.mon) + (d.gv_vang_ten ? ' (thay ' + thoat(d.gv_vang_ten) + ')' : ''); }).join(' · ') +
          ' <span>Xem ›</span></a>';
        vung.innerHTML = NHAC.html;
      }, function () { NHAC.khoa = ''; });
  }

  window.DAY_THAY = { ve: ve, ganNhac: ganNhac, moNgay: function (ngay) { D.ngay = ngay || homNayISO(); D.khung = 'bo-tri'; } };
})();
