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
    dsTu: '', dsDen: '', dsDong: null,
    // 29/9/2026 (thầy Chung): PHT điểm trường báo nghỉ thay GV ngay ở đây, đơn xin nghỉ
    // chờ duyệt hiện ngay ở đây, mặc định chỉ xem phân hiệu mình phụ trách.
    cs: null,          // null = chưa đặt (lần nạp đầu tự chọn phân hiệu mình); '' = toàn trường
    cbgv: [], donCho: [], moBao: false
  };
  var LY_DO_VANG = ['Nghỉ ốm', 'Nghỉ phép', 'Công tác', 'Việc riêng', 'Khác'];
  var LOAI_DON = { nghi_phep: 'Nghỉ phép', nghi_om: 'Nghỉ ốm', cong_tac: 'Công tác', viec_rieng: 'Việc riêng' };
  function tenBuoiVang(b) { return b === 'ca_ngay' ? 'cả ngày' : b === 'sang' ? 'buổi sáng' : 'buổi chiều'; }
  // Trạng thái một tiết đã phân: đã nhận (người thay bấm, sql/74) · đã báo · chưa báo
  function chipTT(d) {
    return d.trang_thai === 'da_nhan' ? '<span class="tkb-chip xanh">✓ đã nhận</span>'
      : d.trang_thai === 'da_bao' ? '<span class="tkb-chip vang">đã báo · chờ nhận</span>'
      : '<span class="tkb-chip xam">chưa báo</span>';
  }
  function phanHieuCuaToi() {
    var e = toiEmail();
    return D.coSo.filter(function (c) { return !!e && String(c.phu_trach_email || '').toLowerCase() === e; });
  }
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
      D.dayThay = []; D.dayThayThang = []; D.quanLy = {}; D.coSo = []; D.cs = '';
      D.cbgv = [{ ho_ten: 'Nguyễn Thị Mai', email: 'mai@vidu.vn', co_so_ma: '' }, { ho_ten: 'Trần Văn Bình', email: 'binh@vidu.vn', co_so_ma: '' }];
      D.donCho = [{ id: -9, loai: 'nghi_phep', noi_dung: 'Việc gia đình', tu_ngay: congNgay(ngay, 1), den_ngay: null, buoi: 'ca_ngay', co_so_ma: '', nguoi_gui_ten: 'Trần Văn Bình' }];
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
        may().from('gv_vang').select('id, ho_ten, email, co_so_ma, ly_do, buoi, ngay, den_ngay, de_xuat_id, ghi_luc')
          .lte('ngay', ngay).or('and(den_ngay.is.null,ngay.eq.' + ngay + '),den_ngay.gte.' + ngay),
        may().from('day_thay').select('*').eq('ngay', ngay).neq('trang_thai', 'huy').order('buoi').order('tiet'),
        may().from('day_thay').select('id, ngay, buoi, tiet, lop, gv_thay_email, gv_thay_nhan, trang_thai')
          .gte('ngay', dauThang).lte('ngay', cuoiThang).neq('trang_thai', 'huy'),
        may().from('co_so').select('ma, ten, phu_trach_email').eq('hoat_dong', true).order('so_tt'),
        may().from('nguoi_dung').select('email, vai_tro').in('vai_tro', ['admin', 'ban_giam_hieu']),
        may().from('moi_tai_khoan').select('ho_ten, email, chuc_vu, co_so_ma').order('ho_ten'),
        // Đơn xin nghỉ chờ duyệt — chỉ BGH/quản trị duyệt được (duyet_de_xuat đòi la_admin)
        laQT() ? may().from('de_xuat').select('id, loai, noi_dung, tu_ngay, den_ngay, buoi, co_so_ma, nguoi_gui_ten, gui_luc')
          .eq('trang_thai', 'cho_duyet').in('loai', Object.keys(LOAI_DON)).order('tu_ngay').limit(100) : null
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
      D.cbgv = ((r[6] && r[6].data) || []).filter(function (c) { return c.ho_ten; });
      D.donCho = (r[7] && r[7].data) || [];
      if (D.cs === null) { var cua = phanHieuCuaToi(); D.cs = cua.length ? cua[0].ma : ''; }
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
  // Người được IN danh sách dạy thay (bản có ô ký "NGƯỜI LẬP"): BGH, hoặc người
  // phụ trách ít nhất một điểm trường — đúng người máy chủ cho ghi day_thay.
  // Rà phân quyền 28/9/2026 (sổ dự án mục 100): trước đây mọi giáo viên đều thấy nút.
  function laPhuTrachNao() {
    if (laQT()) return true;
    var e = toiEmail();
    return !!e && D.coSo.some(function (c) { return String(c.phu_trach_email || '').toLowerCase() === e; });
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
    // Phạm vi: PHT mặc định phân hiệu mình; ai cũng bấm xem được điểm khác / toàn trường
    if (D.coSo.length > 1) {
      h += '<div class="dt-pham-vi">' + [{ ma: '', ten: 'Toàn trường' }].concat(D.coSo).map(function (c) {
        return '<button class="chip-loc' + (D.cs === c.ma ? ' on' : '') + '" data-cs="' + thoat(c.ma) + '">' + thoat(c.ten) + '</button>';
      }).join('') + '</div>';
    }
    var trongPham = function (ma) { return !D.cs || ma === D.cs; };
    var dsVang = D.vang.filter(function (v) { return trongPham(v.co_so_ma); });
    var coQuyenBao = laPhuTrachNao();
    if (coQuyenBao) h += veBaoNghi();
    if (laQT()) h += veDonCho(D.donCho.filter(function (d) { return trongPham(d.co_so_ma); }));
    var thu = L().thuCuaNgay(D.ngay);
    if (!D.pb || !D.dl) {
      EL.innerHTML = h + '<div class="the-thong-bao">Chưa có thời khóa biểu <b>đã công bố</b> áp dụng cho ngày này — ' +
        'không biết lớp nào học tiết nào để bố trí.</div>';
      ganKhung(); ganNgay(); ganPhamVi(); return;
    }
    if (thu === 8) { EL.innerHTML = h + '<div class="the-thong-bao">Chủ nhật — không có tiết học.</div>'; ganKhung(); ganNgay(); ganPhamVi(); return; }

    var bc = boiCanh();
    var tong = 0, chua = 0;
    var the = dsVang.map(function (v) {
      var dsTiet = L().tietCanThay(bc, v);
      tong += dsTiet.length;
      chua += dsTiet.filter(function (x) { return !x.daPhan; }).length;
      return veNguoiVang(bc, v, dsTiet);
    });
    var dtPham = D.dayThay.filter(function (d) { return trongPham(d.co_so_ma); });
    var chuaNhan = dtPham.filter(function (d) { return (d.gv_thay_email || d.gv_thay_nhan) && d.trang_thai !== 'da_nhan'; }).length;

    h += '<div class="tkb-tom">' +
      '<div><span class="tkb-nhan">Người vắng</span><b class="so">' + dsVang.length + '</b><small>theo sổ vắng ngày này</small></div>' +
      '<div><span class="tkb-nhan">Tiết cần thay</span><b class="so">' + tong + '</b><small>theo TKB áp dụng từ ' + ngayVN(D.pb.ap_dung_tu) + '</small></div>' +
      '<div><span class="tkb-nhan">Chưa bố trí</span><b class="so" style="color:' + (chua ? 'var(--thieu)' : 'var(--ok)') + '">' + chua + '</b><small>' + (chua ? 'tiết' : 'đã đủ') + '</small></div>' +
      (dtPham.length ? '<div><span class="tkb-nhan">Chưa nhận</span><b class="so" style="color:' + (chuaNhan ? 'var(--thieu)' : 'var(--ok)') + '">' + chuaNhan + '</b><small>' + (chuaNhan ? 'tiết — người thay chưa bấm Đã nhận' : 'đều đã nhận') + '</small></div>' : '') +
      (dtPham.length ? '<div class="dt-nut-tom"><button class="dh-nut-nho" id="dt-zalo">📋 Chép tin Zalo</button>' +
        // Máy chủ (dt_sua) cho cả người phụ trách điểm; RLS tự lọc đúng tiết điểm của họ.
        (dtPham.some(function (d) { return d.trang_thai === 'da_phan' && duocBoTri(d.co_so_ma); }) ? '<button class="dh-nut-nho" id="dt-da-bao">✓ Đánh dấu đã báo</button>' : '') + '</div>' : '') +
      '</div>';

    if (!dsVang.length) {
      h += '<div class="hd-kiem xanh">🟢 Không có ai ' + (D.cs ? 'của ' + thoat(tenCoSo(D.cs)) + ' ' : '') + 'trong sổ vắng ngày ' + ngayVN(D.ngay) + ' — chưa phải bố trí dạy thay.' +
        (coQuyenBao ? ' Có giáo viên xin nghỉ thì bấm <b>🙋 Báo nghỉ thay giáo viên</b> ở trên.' : '') + '</div>';
    }
    EL.innerHTML = h + the.join('');
    ganKhung(); ganNgay(); ganPhamVi(); ganBoTri(bc);
  }
  function tenCoSo(ma) { var c = D.coSo.filter(function (x) { return x.ma === ma; })[0]; return c ? c.ten : ma; }

  // ── Báo nghỉ thay giáo viên (PHT điểm trường / BGH) → ghi thẳng sổ vắng gv_vang,
  //    KHÔNG qua duyệt (thầy Chung 29/9/2026). RLS gvv_them: quản trị/BGH, hoặc phụ trách đúng điểm.
  function dsBaoNghi() { return D.cbgv.filter(function (c) { return (!D.cs || c.co_so_ma === D.cs) && (laQT() || duocBoTri(c.co_so_ma)); }); }
  function veBaoNghi() {
    if (!D.moBao) return '<div class="dt-bao-nghi-mo"><button class="nut-chinh" id="dt-mo-bao">🙋 Báo nghỉ thay giáo viên</button>' +
      '<small>Giáo viên gọi điện, nhắn tin xin nghỉ — ghi vào sổ vắng ngay rồi bố trí dạy thay bên dưới.</small></div>';
    var ds = dsBaoNghi();
    return '<section class="dt-the dt-form-bao"><header><div><b>🙋 Báo nghỉ thay giáo viên</b><small>ghi thẳng sổ vắng — bảng công và dạy thay cập nhật ngay</small></div>' +
      '<button class="dh-nut-nho" id="dt-dong-bao">Đóng</button></header>' +
      '<div class="dt-form-luoi">' +
      '<label>Giáo viên<select id="dt-bao-nguoi" class="tkb-chon"><option value="">— chọn —</option>' + ds.map(function (c, i) {
        return '<option value="' + i + '">' + thoat(c.ho_ten) + (c.chuc_vu ? ' · ' + thoat(c.chuc_vu) : '') + (!D.cs && c.co_so_ma ? ' · ' + thoat(tenCoSo(c.co_so_ma)) : '') + '</option>';
      }).join('') + '</select></label>' +
      '<label>Từ ngày<input type="date" id="dt-bao-tu" class="tkb-chon" value="' + D.ngay + '"></label>' +
      '<label>Đến ngày <small>(nếu nghỉ nhiều ngày)</small><input type="date" id="dt-bao-den" class="tkb-chon"></label>' +
      '<label>Buổi<select id="dt-bao-buoi" class="tkb-chon"><option value="ca_ngay">Cả ngày</option><option value="sang">Buổi sáng</option><option value="chieu">Buổi chiều</option></select></label>' +
      '<label>Lý do<select id="dt-bao-ly" class="tkb-chon">' + LY_DO_VANG.map(function (l) { return '<option>' + l + '</option>'; }).join('') + '</select></label>' +
      '</div><div class="dt-form-nut"><button class="nut-chinh" id="dt-ghi-bao">Ghi báo nghỉ</button></div></section>';
  }

  function veDonCho(ds) {
    if (!ds.length) return '';
    return '<section class="dt-the dt-don-cho"><header><div><b>📝 Đơn xin nghỉ chờ duyệt (' + ds.length + ')</b>' +
      '<small>duyệt xong là vào sổ vắng, bố trí dạy thay được ngay</small></div></header>' + ds.map(function (d) {
        return '<div class="dt-don"><div><b>' + thoat(d.nguoi_gui_ten) + '</b> · ' + thoat(LOAI_DON[d.loai] || d.loai) +
          '<small>' + ngayVN(d.tu_ngay) + (d.den_ngay && d.den_ngay !== d.tu_ngay ? ' → ' + ngayVN(d.den_ngay) : '') + ' · ' + tenBuoiVang(d.buoi) +
          (d.co_so_ma && !D.cs ? ' · ' + thoat(tenCoSo(d.co_so_ma)) : '') + (d.noi_dung ? ' · ' + thoat(d.noi_dung) : '') + '</small></div>' +
          '<span class="dt-hanh"><button class="nut-chinh" data-duyet="' + d.id + '" data-tu="' + thoat(d.tu_ngay || '') + '">Duyệt</button>' +
          '<button class="dh-nut-nho" data-tu-choi="' + d.id + '">Không duyệt</button></span></div>';
      }).join('') + '</section>';
  }

  function veNguoiVang(bc, v, dsTiet) {
    var khop = L().gvCuaVang(bc, v);
    var h = '<section class="dt-the"><header><div><b>' + thoat(v.ho_ten) + '</b>' +
      (khop[0] && khop[0].nhan !== v.ho_ten ? ' <small>(' + thoat(khop[0].nhan) + ')</small>' : '') +
      '<small>' + thoat(v.ly_do || '') + ' · ' + (v.buoi === 'ca_ngay' ? 'cả ngày' : v.buoi === 'sang' ? 'buổi sáng' : 'buổi chiều') +
      (v.den_ngay && v.den_ngay !== v.ngay ? ' · ' + ngayVN(v.ngay) + ' → ' + ngayVN(v.den_ngay) : '') + '</small></div>' +
      '<span class="dt-hanh"><span class="tkb-chip ' + (dsTiet.every(function (x) { return x.daPhan; }) ? 'xanh' : 'do') + '">' +
      dsTiet.filter(function (x) { return x.daPhan; }).length + '/' + dsTiet.length + ' tiết đã bố trí</span>' +
      // Xoá báo nghỉ: chỉ dòng KHÔNG sinh từ đơn đã duyệt; RLS gvv_xoa cho phụ trách trong 2 ngày, quản trị luôn
      (v.id > 0 && !v.de_xuat_id && duocBoTri(v.co_so_ma) ? '<button class="dh-nut-nho" data-xoa-vang="' + v.id + '" title="Báo nhầm — xoá khỏi sổ vắng">Xoá báo nghỉ</button>' : '') +
      '</span></header>';
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
            (d.gv_thay_email || d.gv_thay_nhan ? ' ' + chipTT(d) : '') : '<span class="tkb-chip do">chưa có người</span>') + '</span>' +
          (coQuyen ? '<span class="dt-hanh">' + (d
            ? ((d.gv_thay_email || d.gv_thay_nhan) ? '<button class="dh-nut-nho" data-zalo-nguoi="' + thoat(d.gv_thay_email || d.gv_thay_nhan) + '" title="Chép tin nhắn riêng cho người này">📋</button>' : '') +
              '<button class="dh-nut-nho" data-mo="' + thoat(k) + '">Đổi</button><button class="dh-nut-nho" data-huy="' + d.id + '">Huỷ</button>'
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

  function ganPhamVi() {
    tat('[data-cs]', function (b) { D.cs = b.getAttribute('data-cs'); D.mo = ''; D.moPA = ''; ve(); });
    var mo = document.getElementById('dt-mo-bao'); if (mo) mo.addEventListener('click', function () { D.moBao = true; ve(); });
    var dong = document.getElementById('dt-dong-bao'); if (dong) dong.addEventListener('click', function () { D.moBao = false; ve(); });
    var ghiB = document.getElementById('dt-ghi-bao'); if (ghiB) ghiB.addEventListener('click', function () { ghiBaoNghi(ghiB); });
    tat('[data-duyet]', function (b) { duyetDon(+b.getAttribute('data-duyet'), true, b, b.getAttribute('data-tu')); });
    tat('[data-tu-choi]', function (b) { duyetDon(+b.getAttribute('data-tu-choi'), false, b, ''); });
    tat('[data-xoa-vang]', function (b) { xoaVang(+b.getAttribute('data-xoa-vang'), b); });
    tat('[data-zalo-nguoi]', function (b) {
      var k = b.getAttribute('data-zalo-nguoi');
      chepZalo(D.ngay, D.dayThay.filter(function (d) { return (d.gv_thay_email || d.gv_thay_nhan) === k; }));
    });
  }

  function giaTri(id) { var o = document.getElementById(id); return o ? o.value : ''; }
  function ghiBaoNghi(nut) {
    var c = dsBaoNghi()[+giaTri('dt-bao-nguoi')];
    var tu = giaTri('dt-bao-tu'), den = giaTri('dt-bao-den'), buoi = giaTri('dt-bao-buoi') || 'ca_ngay', ly = giaTri('dt-bao-ly') || 'Khác';
    if (giaTri('dt-bao-nguoi') === '' || !c) { bao('Chọn giáo viên nghỉ.'); return; }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(tu)) { bao('Chọn ngày bắt đầu nghỉ.'); return; }
    if (den && den < tu) { bao('"Đến ngày" đang trước "Từ ngày" — chọn lại.'); return; }
    if (!c.co_so_ma && may()) { bao(c.ho_ten + ' chưa được gán điểm trường — sửa ở Quản trị › Tài khoản rồi báo lại.'); return; }
    var dong = { ngay: tu, den_ngay: den && den > tu ? den : null, buoi: buoi, ho_ten: c.ho_ten, email: c.email || null,
      co_so_ma: c.co_so_ma, ly_do: ly, ghi_chu: 'Báo nghỉ ở màn Dạy thay', nguoi_ghi_id: (window.NGUOI_DUNG || {}).id || null };
    if (!may()) {
      D.vang.push(Object.assign({ id: -2 - D.vang.length }, dong)); D.moBao = false; D.ngay = tu; ve();
      bao('Đã ghi (bản xem thử).'); return;
    }
    nut.disabled = true;
    may().from('gv_vang').insert(dong).select('id').then(function (r) {
      nut.disabled = false;
      if (r.error) { bao('Không ghi được: ' + (/row-level|policy/i.test(r.error.message) ? 'thầy cô không phụ trách điểm trường của người này.' : r.error.message)); return; }
      bao('✅ Đã ghi ' + c.ho_ten + ' nghỉ ' + tenBuoiVang(buoi) + ' ' + ngayVN(tu) + (dong.den_ngay ? ' → ' + ngayVN(dong.den_ngay) : '') + '. Bố trí dạy thay bên dưới.');
      D.moBao = false; D.ngay = tu; taiLai();
    });
  }
  function duyetDon(id, dongY, nut, tuNgay) {
    var hoi = window.hopHoi ? window.hopHoi(dongY ? 'Duyệt đơn xin nghỉ? Người này sẽ vào sổ vắng và hiện ra để bố trí dạy thay.' : 'Không duyệt đơn này?',
      { tieuDe: 'Đơn xin nghỉ', nutOK: dongY ? 'Duyệt' : 'Không duyệt' }) : Promise.resolve(window.confirm(dongY ? 'Duyệt đơn?' : 'Không duyệt đơn?'));
    hoi.then(function (ok) {
      if (!ok) return;
      if (!may()) { D.donCho = D.donCho.filter(function (d) { return d.id !== id; }); ve(); return; }
      nut.disabled = true;
      may().rpc('duyet_de_xuat', { p_id: id, p_dong_y: dongY, p_ghi_chu: null }).then(function (r) {
        if (r.error) { nut.disabled = false; bao('Không duyệt được: ' + r.error.message); return; }
        bao(dongY ? '✅ Đã duyệt — đã vào sổ vắng.' : 'Đã ghi: không duyệt.');
        if (dongY && /^\d{4}-\d{2}-\d{2}$/.test(tuNgay || '')) D.ngay = tuNgay;
        taiLai();
      });
    });
  }
  function xoaVang(id, nut) {
    var hoi = window.hopHoi ? window.hopHoi('Xoá báo nghỉ này khỏi sổ vắng? Chỉ dùng khi báo nhầm — các tiết đã bố trí dạy thay vẫn giữ, huỷ riêng từng tiết nếu cần.',
      { tieuDe: 'Xoá báo nghỉ', nutOK: 'Xoá' }) : Promise.resolve(window.confirm('Xoá báo nghỉ?'));
    hoi.then(function (ok) {
      if (!ok) return;
      if (!may()) { D.vang = D.vang.filter(function (v) { return v.id !== id; }); ve(); return; }
      nut.disabled = true;
      may().from('gv_vang').delete().eq('id', id).select('id').then(function (r) {
        if (r.error || !r.data || !r.data.length) { nut.disabled = false; bao('Không xoá được — quá 2 ngày kể từ lúc ghi, tháng đã chốt công, hoặc không đủ quyền. Nhờ quản trị xoá.'); return; }
        bao('Đã xoá báo nghỉ.'); taiLai();
      });
    });
  }

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
          // TKB ghép nhiều phân hiệu (sql/66) có id dạng chữ 'g…' — ghi id bản chứa lớp đó
          phien_ban_id: (D.dl && D.dl.lopPB && D.dl.lopPB[g.tiet.lop]) || (D.pb && typeof D.pb.id === 'number' && D.pb.id) || null, gv_vang_id: v.id > 0 ? v.id : null,
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
      (laPhuTrachNao() ? '<button class="dh-nut-nho" id="dt-in">🖨️ In</button>' : '') + '</div><div id="dt-ds-bang"><div class="the-thong-bao">Đang tải…</div></div>';
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
            '<td>' + (d.gv_thay_email || d.gv_thay_nhan ? chipTT(d) : '') + '</td>' +
            '<td><button class="dh-nut-nho" data-toi-ngay="' + d.ngay + '">Mở ngày</button></td></tr>';
        }).join('') + '</tbody></table></div>';
      Array.prototype.slice.call(bang.querySelectorAll('[data-toi-ngay]')).forEach(function (b) {
        b.addEventListener('click', function () { D.ngay = b.getAttribute('data-toi-ngay'); D.khung = 'bo-tri'; ve(); });
      });
      var nutIn = document.getElementById('dt-in');
      if (nutIn) nutIn.onclick = function () { inDanhSach(ds, theoNguoi, tuQuan); };
    }).catch(function (e) { bang.innerHTML = '<div class="hd-kiem do">Không tải được: ' + thoat((e && e.message) || e) + '</div>'; });
  }

  function inDanhSach(ds, theoNguoi, tuQuan) {
    if (!laPhuTrachNao()) { bao('Chỉ Ban giám hiệu hoặc người phụ trách điểm trường mới in được danh sách dạy thay.'); return; }
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
  // NGƯỜI DẠY THAY BẤM "ĐÃ NHẬN" (sql/74, hàm nhan_day_thay — chỉ đổi dòng của chính mình)
  // ══════════════════════════════════════════════════════════════
  function nhan(ids, nut, xong) {
    if (!ids.length) return;
    if (nut) nut.disabled = true;
    may().rpc('nhan_day_thay', { p_ids: ids }).then(function (r) {
      if (r.error) {
        if (nut) nut.disabled = false;
        bao(/nhan_day_thay|does not exist|Could not find/i.test(r.error.message)
          ? 'Nhà trường chưa bật nút "Đã nhận" — người phụ trách hệ thống cần chạy sql/74-day-thay-da-nhan.sql.'
          : 'Không xác nhận được: ' + r.error.message);
        return;
      }
      bao('✅ Đã xác nhận ' + (r.data || 0) + ' tiết dạy thay — người bố trí thấy ngay.');
      NHAC.khoa = '';
      if (window.VIEC_NHANH) window.VIEC_NHANH.ve(true);
      if (xong) xong();
    });
  }
  function daNhan(d) { return d.trang_thai === 'da_nhan'; }

  // ══════════════════════════════════════════════════════════════
  // TIẾT DẠY THAY CỦA TÔI
  // ══════════════════════════════════════════════════════════════
  function veCuaToi(vung) {
    var e = toiEmail();
    if (!may() || !e) { vung.innerHTML = '<div class="the-thong-bao">Đăng nhập để xem tiết dạy thay của mình.</div>'; return; }
    var hn = homNayISO();
    vung.innerHTML = '<div class="the-thong-bao">Đang tải…</div>';
    Promise.all([
      may().from('day_thay').select('*').eq('gv_thay_email', e).neq('trang_thai', 'huy')
        .gte('ngay', hn.slice(0, 8) + '01').order('ngay').order('buoi').order('tiet').limit(300),
      // Tiết của CHÍNH MÌNH (mình vắng) đã có người thay — GV vắng biết ai dạy lớp mình
      may().from('day_thay').select('ngay, buoi, tiet, lop, mon, gv_thay_ten, gv_thay_nhan, gv_thay_email, trang_thai')
        .eq('gv_vang_email', e).neq('trang_thai', 'huy').gte('ngay', hn).order('ngay').order('buoi').order('tiet').limit(100)
    ]).then(function (rr) {
        var r = rr[0];
        if (r.error) throw r.error;
        var ds = r.data || [];
        var sap = ds.filter(function (d) { return d.ngay >= hn; });
        var chuaNhan = sap.filter(function (d) { return !daNhan(d); });
        var thangNay = ds.filter(function (d) { return d.ngay.slice(0, 7) === hn.slice(0, 7); }).length;
        var cuaMinh = (rr[1] && rr[1].data) || [];
        vung.innerHTML = '<div class="tkb-tom"><div><span class="tkb-nhan">Sắp tới</span><b class="so">' + sap.length + ' tiết</b><small>từ hôm nay</small></div>' +
          '<div><span class="tkb-nhan">Tháng này</span><b class="so">' + thangNay + ' tiết</b><small>đã và sẽ dạy thay</small></div>' +
          (chuaNhan.length ? '<div class="dt-nut-tom"><button class="nut-chinh" id="dt-nhan-het">✓ Đã nhận ' + chuaNhan.length + ' tiết</button></div>' : '') + '</div>' +
          (sap.length ? '<div class="dt-cua-toi">' + sap.map(function (d) {
            return '<div class="dt-tiet' + (d.ngay === hn ? ' hom-nay' : '') + '"><span class="dt-ki">' + kiHieuTiet(d.buoi, d.tiet) + '</span>' +
              '<span class="dt-lop"><b>' + thoat(d.lop) + '</b> · ' + thoat(d.mon) + '</span>' +
              '<span class="dt-ai">' + thoat(tenNgay(d.ngay)) + (d.ngay === hn ? ' · <b>hôm nay</b>' : '') + ' <small>thay ' + thoat(d.gv_vang_ten || '') + '</small></span>' +
              '<span class="dt-hanh">' + (daNhan(d) ? '<span class="tkb-chip xanh">✓ đã nhận</span>' : '<button class="dh-nut-nho" data-nhan="' + d.id + '">Đã nhận</button>') + '</span></div>';
          }).join('') + '</div>' : '<div class="hd-kiem xanh">Thầy cô chưa được phân dạy thay tiết nào sắp tới.</div>') +
          (cuaMinh.length ? '<div class="dh-tieu-de" style="margin-top:18px">Tiết của thầy cô đã có người dạy thay</div><div class="dt-cua-toi">' + cuaMinh.map(function (d) {
            var ai = d.gv_thay_email || d.gv_thay_nhan ? thoat(d.gv_thay_ten || d.gv_thay_nhan) : '<i>Lớp tự quản</i>';
            return '<div class="dt-tiet"><span class="dt-ki">' + kiHieuTiet(d.buoi, d.tiet) + '</span><span class="dt-lop"><b>' + thoat(d.lop) + '</b> · ' + thoat(d.mon) + '</span>' +
              '<span class="dt-ai">' + thoat(tenNgay(d.ngay)) + ' → ' + ai + '</span></div>';
          }).join('') + '</div>' : '');
        var het = document.getElementById('dt-nhan-het');
        if (het) het.addEventListener('click', function () { nhan(chuaNhan.map(function (d) { return d.id; }), het, function () { veCuaToi(vung); }); });
        Array.prototype.slice.call(vung.querySelectorAll('[data-nhan]')).forEach(function (b) {
          b.addEventListener('click', function () { nhan([+b.getAttribute('data-nhan')], b, function () { veCuaToi(vung); }); });
        });
      }).catch(function (err) { vung.innerHTML = '<div class="hd-kiem do">Không tải được: ' + thoat((err && err.message) || err) + '</div>'; });
  }

  // ══════════════════════════════════════════════════════════════
  // NHẮC TRÊN TRANG CHỦ — tiết dạy thay HÔM NAY VÀ 7 NGÀY TỚI (29/9/2026: trước chỉ hôm nay,
  // phân tối nay cho sáng mai thì người thay không biết) + nút "Đã nhận" ngay tại chỗ.
  // Người VẮNG cũng thấy tiết của mình đã có ai thay.
  // ══════════════════════════════════════════════════════════════
  var NHAC = { khoa: '', html: '', ids: [] };
  function ganNhac(vung) {
    if (!vung || !may()) return;
    var e = toiEmail(), hn = homNayISO(), khoa = e + '|' + hn;
    if (!e) { vung.innerHTML = ''; return; }
    if (NHAC.khoa === khoa) { vung.innerHTML = NHAC.html; ganNutNhac(vung); return; }
    NHAC.khoa = khoa;
    var den = congNgay(hn, 7);
    Promise.all([
      may().from('day_thay').select('id, ngay, buoi, tiet, lop, mon, gv_vang_ten, trang_thai').eq('gv_thay_email', e)
        .gte('ngay', hn).lte('ngay', den).neq('trang_thai', 'huy').order('ngay').order('buoi').order('tiet'),
      may().from('day_thay').select('ngay, buoi, tiet, lop, gv_thay_ten, gv_thay_nhan, gv_thay_email').eq('gv_vang_email', e)
        .gte('ngay', hn).lte('ngay', den).neq('trang_thai', 'huy').order('ngay').order('buoi').order('tiet')
    ]).then(function (rr) {
      if (NHAC.khoa !== khoa) return;
      var ds = (rr[0] && !rr[0].error && rr[0].data) || [], cuaMinh = (rr[1] && !rr[1].error && rr[1].data) || [];
      var h = '';
      if (ds.length) {
        var chua = ds.filter(function (d) { return !daNhan(d); });
        NHAC.ids = chua.map(function (d) { return d.id; });
        var theoNgay = {};
        ds.forEach(function (d) { (theoNgay[d.ngay] = theoNgay[d.ngay] || []).push(d); });
        h += '<div class="dt-nhac' + (chua.length ? ' can-nhan' : '') + '"><div class="dt-nhac-chu"><b>👩‍🏫 Thầy cô được phân dạy thay ' + ds.length + ' tiết</b>' +
          Object.keys(theoNgay).map(function (n) {
            return '<div>' + (n === hn ? '<b>Hôm nay</b>' : n === congNgay(hn, 1) ? '<b>Ngày mai</b>' : thoat(tenNgay(n))) + ': ' + theoNgay[n].map(function (d) {
              return kiHieuTiet(d.buoi, d.tiet) + ' ' + thoat(d.lop) + ' ' + thoat(d.mon) + (d.gv_vang_ten ? ' (thay ' + thoat(d.gv_vang_ten) + ')' : '') + (daNhan(d) ? ' ✓' : '');
            }).join(' · ') + '</div>';
          }).join('') + '</div><div class="dt-nhac-nut">' +
          (chua.length ? '<button class="nut-chinh" data-nhac-nhan="1">✓ Đã nhận</button>' : '<span class="tkb-chip xanh">✓ đã nhận hết</span>') +
          '<a href="#" onclick="DAY_THAY.moKhung(\'cua-toi\');return false;">Xem ›</a></div></div>';
      } else NHAC.ids = [];
      if (cuaMinh.length) {
        h += '<div class="dt-nhac nhe"><div class="dt-nhac-chu"><b>Tiết của thầy cô đã có người dạy thay:</b> ' + cuaMinh.map(function (d) {
          return (d.ngay === hn ? 'hôm nay' : thoat(ngayVN(d.ngay).slice(0, 5))) + ' ' + kiHieuTiet(d.buoi, d.tiet) + ' ' + thoat(d.lop) + ' → ' +
            (d.gv_thay_email || d.gv_thay_nhan ? thoat(d.gv_thay_ten || d.gv_thay_nhan) : 'lớp tự quản');
        }).join(' · ') + '</div></div>';
      }
      NHAC.html = h; vung.innerHTML = h; ganNutNhac(vung);
    }, function () { NHAC.khoa = ''; });
  }
  function ganNutNhac(vung) {
    var b = vung.querySelector('[data-nhac-nhan]');
    if (b) b.addEventListener('click', function () { nhan(NHAC.ids, b, function () { ganNhac(vung); }); });
  }

  window.DAY_THAY = { ve: ve, ganNhac: ganNhac, moNgay: function (ngay) { D.ngay = ngay || homNayISO(); D.khung = 'bo-tri'; },
    // Mở thẳng một khung của thẻ Dạy thay từ nơi khác (trang chủ, hàng Việc hằng ngày)
    moKhung: function (khung) {
      D.khung = khung || 'bo-tri';
      if (D.khung === 'bo-tri') D.ngay = homNayISO();
      if (window.DH) window.DH.moTab('tkb');
      if (window.TKB_XEM && window.TKB_XEM.moDayThay) window.TKB_XEM.moDayThay();
    } };
})();
