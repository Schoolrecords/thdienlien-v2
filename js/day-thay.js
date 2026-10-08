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
    cbgv: [], donCho: [], nghi: null
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
  // ── Đọc mọi thứ cần cho MỘT ngày (màn Bố trí và khung Báo nghỉ nhanh dùng chung) ──
  // → { pb, dl, vang, dayThay, dayThayThang, coSo, quanLy, cbgv, donCho, nghi }
  //   nghi = dòng ngay_nghi của ngày đó (lễ / nghỉ bù / nghỉ khác) — rà dạy thay 8/10/2026: trước đây
  //   đơn nghỉ dài ngày vẫn hiện tiết cần thay vào ngày lễ.
  var MAU_VANG = [{ id: -1, ho_ten: 'Nguyễn Thị Mai', email: '', buoi: 'ca_ngay', co_so_ma: '', ly_do: 'Nghỉ ốm' }];
  var MAU_CBGV = [{ ho_ten: 'Nguyễn Thị Mai', email: '', co_so_ma: '' }, { ho_ten: 'Nguyễn Thị Lan', email: '', co_so_ma: '' }, { ho_ten: 'Trần Văn Bình', email: 'binh@vidu.vn', co_so_ma: '' }];
  function docNgay(ngay) {
    if (!may()) {
      // Xem thử: TKB mẫu + một người vắng mẫu
      return Promise.resolve({
        pb: { id: 0, ap_dung_tu: ngay, cong_bo: true }, dl: window.TKB_XEM.duLieuMau(),
        vang: (DEMO.boMau ? [] : MAU_VANG.slice()).concat(DEMO.vang.filter(function (v) { return (v.ngay || ngay) <= ngay && (v.den_ngay || v.ngay || ngay) >= ngay; })),
        dayThay: DEMO.dayThay.filter(function (d) { return d.ngay === ngay; }), dayThayThang: DEMO.dayThay.slice(),
        coSo: [], quanLy: {}, cbgv: MAU_CBGV.slice(), nghi: null,
        donCho: [{ id: -9, loai: 'nghi_phep', noi_dung: 'Việc gia đình', tu_ngay: congNgay(ngay, 1), den_ngay: null, buoi: 'ca_ngay', co_so_ma: '', nguoi_gui_ten: 'Trần Văn Bình' }]
          .filter(function (d) { return !DEMO.donXong[d.id]; })
      });
    }
    var dauThang = ngay.slice(0, 8) + '01', cuoiThang = congNgay(congNgay(dauThang, 32).slice(0, 8) + '01', -1);
    var kq = {};
    return window.TKB_XEM.docDsPhienBan().then(function (ds) {
      kq.pb = window.TKB_XEM.phienBanNgay(ds, ngay);
      return Promise.all([
        kq.pb ? window.TKB_XEM.docPhienBan(kq.pb) : Promise.resolve(null),
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
          .eq('trang_thai', 'cho_duyet').in('loai', Object.keys(LOAI_DON)).order('tu_ngay').limit(100) : null,
        // Bảng ngày nghỉ có thể chưa có ở trường cũ — lỗi thì coi như ngày học
        may().from('ngay_nghi').select('ngay, loai, ten').eq('ngay', ngay).limit(1).then(function (x) { return x; }, function () { return null; })
      ]);
    }).then(function (r) {
      if (r[2].error) throw r[2].error;
      if (r[1].error) throw r[1].error;
      kq.dl = r[0];
      kq.vang = (r[1].data || []).sort(function (a, b) { return String(a.ho_ten).localeCompare(b.ho_ten, 'vi'); });
      kq.dayThay = r[2].data || [];
      kq.dayThayThang = (r[3].data || []);
      kq.coSo = (r[4] && r[4].data) || [];
      kq.quanLy = {};
      ((r[5] && r[5].data) || []).forEach(function (u) { kq.quanLy[String(u.email || '').toLowerCase()] = true; });
      kq.cbgv = ((r[6] && r[6].data) || []).filter(function (c) { return c.ho_ten; });
      kq.donCho = (r[7] && r[7].data) || [];
      var n = r[8] && !r[8].error && r[8].data && r[8].data[0];
      kq.nghi = n && n.loai !== 'lam_bu' ? n : null;
      return kq;
    });
  }
  function loiDoc(e) {
    var m = String((e && (e.message || e.details)) || e || '');
    return /day_thay|does not exist|schema cache|Could not find/i.test(m)
      ? 'Cơ sở dữ liệu của trường chưa có bảng dạy thay — người phụ trách hệ thống cần chạy sql/65-day-thay.sql.'
      : 'Không tải được dữ liệu dạy thay: ' + m;
  }
  function napNgay() {
    var ngay = D.ngay, khoa = ngay;
    D.dangNap = true; D.loi = ''; D.khoa = khoa;
    return docNgay(ngay).then(function (kq) {
      if (D.khoa !== khoa) return;
      D.pb = kq.pb; D.dl = kq.dl; D.vang = kq.vang; D.dayThay = kq.dayThay; D.dayThayThang = kq.dayThayThang;
      D.coSo = kq.coSo; D.quanLy = kq.quanLy; D.cbgv = kq.cbgv; D.donCho = kq.donCho; D.nghi = kq.nghi;
      if (!may()) D.cs = '';
      if (D.cs === null) { var cua = phanHieuCuaToi(); D.cs = cua.length ? cua[0].ma : ''; }
    }).catch(function (e) { D.loi = loiDoc(e); })
      .then(function () { if (D.khoa === khoa) D.dangNap = false; });
  }

  // ── Một người báo nghỉ hai lần cùng ngày (PHT báo qua điện thoại + BGH duyệt đơn) → gộp một thẻ.
  //    Giữ dòng sinh từ đơn đã duyệt (không xoá được ở đây), buổi lấy rộng nhất. ──
  function khoaNguoi(v) { return String(v.email || '').trim().toLowerCase() || 'h:' + L().khongDau(v.ho_ten || ''); }
  function gopVang(ds) {
    var theo = {}, ra = [];
    ds.forEach(function (v) {
      var k = khoaNguoi(v), cu = theo[k];
      if (!cu) { theo[k] = Object.assign({}, v, { trung: [] }); ra.push(theo[k]); return; }
      cu.trung.push(v);
      if (cu.buoi !== v.buoi) cu.buoi = 'ca_ngay';
      if (!cu.de_xuat_id && v.de_xuat_id) { var giu = cu.trung; Object.assign(cu, v, { buoi: cu.buoi, trung: giu }); }
    });
    return ra;
  }

  // ── Một người vắng có thuộc phạm vi phân hiệu đang xem không: tài khoản ở đó HOẶC có tiết cần thay ở đó.
  //    Rà 8/10/2026: cô Linh (tài khoản Diễn Liên) dạy 1A2 Diễn Thái — trước đây PHT Diễn Thái không thấy cô vắng.
  function thuocPham(bc, v, trong) {
    if (trong(v.co_so_ma)) return true;
    return !!bc && L().tietCanThay(bc, v).some(function (x) { return trong(x.coSo); });
  }

  // ── Tóm tắt dạy thay MỘT NGÀY cho khung "Việc cần xử lý" ở Điều hành (js/viec-nhanh.js).
  //    Đọc riêng, KHÔNG đụng D (màn Dạy thay có thể đang mở ngày khác).
  //    dsCS: mảng mã phân hiệu cần xem ([] = toàn trường).
  //    → { coTKB, nghi, vang, tong, chua, chuaNhan, nguoi: [{ ten, tong, chua }] }
  function tomTat(ngay, dsCS) {
    var trong = function (ma) { return !dsCS || !dsCS.length || dsCS.indexOf(ma) >= 0; };
    return docNgay(ngay).then(function (kq) {
      var vang = gopVang(kq.vang);
      var ra = { coTKB: !!kq.dl, nghi: kq.nghi, vang: 0, tong: 0, chua: 0, chuaNhan: 0, nguoi: [] };
      ra.chuaNhan = kq.dayThay.filter(function (d) { return trong(d.co_so_ma) && (d.gv_thay_email || d.gv_thay_nhan) && d.trang_thai !== 'da_nhan'; }).length;
      if (!kq.dl || kq.nghi || L().thuCuaNgay(ngay) === 8) {
        vang = vang.filter(function (v) { return trong(v.co_so_ma); });
        ra.vang = vang.length; ra.nguoi = vang.map(function (v) { return { ten: v.ho_ten, tong: 0, chua: 0 }; });
        return ra;
      }
      var bc = L().boiCanh({ ngay: ngay, tiet: kq.dl.tiet, gv: kq.dl.gv, lopCoSo: kq.dl.lopCoSo, vang: vang, dayThay: kq.dayThay, dayThayThang: [], quanLy: {} });
      vang.forEach(function (v) {
        var ds = L().tietCanThay(bc, v).filter(function (x) { return trong(x.coSo); });
        if (!trong(v.co_so_ma) && !ds.length) return;
        var chua = ds.filter(function (x) { return !x.daPhan; }).length;
        ra.vang++; ra.tong += ds.length; ra.chua += chua;
        ra.nguoi.push({ ten: v.ho_ten, tong: ds.length, chua: chua });
      });
      return ra;
    });
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
  function boiCanhCua(ngay, ctx, vang) {
    return L().boiCanh({ ngay: ngay, tiet: ctx.dl.tiet, gv: ctx.dl.gv, lopCoSo: ctx.dl.lopCoSo, vang: vang,
      dayThay: ctx.dayThay, dayThayThang: ctx.dayThayThang, quanLy: ctx.quanLy });
  }
  function boiCanh() { return boiCanhCua(D.ngay, D, gopVang(D.vang)); }
  function laDienThoai() { return !!(window.matchMedia && window.matchMedia('(max-width: 640px)').matches); }

  // ══════════════════════════════════════════════════════════════
  // VẼ — THẺ "BÁO NGHỈ – DẠY THAY"
  // ══════════════════════════════════════════════════════════════
  function ve(el) {
    if (el) EL = el;
    if (!EL || !document.body.contains(EL)) return;
    // Người không bố trí được (giáo viên) mở thẻ lần đầu → thấy tiết dạy thay của mình
    if (!D.khungChon) { D.khungChon = true; if (!laQT() && may()) D.khung = 'cua-toi'; }
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

    var coQuyenBao = laPhuTrachNao();
    // Nút chính đặt TRƯỚC ô chọn ngày — mở là thấy ngay, không phải cuộn (thầy Chung 8/10: "ít chạm nhất")
    var h = dau + (coQuyenBao ? '<div class="dt-bao-nghi-mo"><button class="nut-chinh dt-nut-lon" id="dt-mo-bao">🙋 Báo nghỉ &amp; bố trí dạy thay</button>' +
      '<small>Chọn người nghỉ → chọn buổi → máy xếp sẵn người dạy thay, gửi Zalo một chạm.</small></div>' : '');
    h += '<div class="dt-ngay">' +
      '<button class="dh-nut-nho" data-lui="-1" aria-label="Ngày trước">‹</button>' +
      '<input type="date" id="dt-chon-ngay" class="tkb-chon" value="' + D.ngay + '">' +
      '<button class="dh-nut-nho" data-lui="1" aria-label="Ngày sau">›</button>' +
      '<b>' + thoat(tenNgay(D.ngay)) + '</b>' +
      (D.ngay !== homNayISO() ? '<button class="dh-nut-nho" data-hom-nay="1">Hôm nay</button>' : '') + '</div>';

    if (D.loi) { EL.innerHTML = h + '<div class="hd-kiem do">' + thoat(D.loi) + '</div>'; ganKhung(); ganNgay(); ganPhamVi(); return; }
    // Phạm vi: PHT mặc định phân hiệu mình; ai cũng bấm xem được điểm khác / toàn trường
    if (D.coSo.length > 1) {
      h += '<div class="dt-pham-vi">' + [{ ma: '', ten: 'Toàn trường' }].concat(D.coSo).map(function (c) {
        return '<button class="chip-loc' + (D.cs === c.ma ? ' on' : '') + '" data-cs="' + thoat(c.ma) + '">' + thoat(c.ten) + '</button>';
      }).join('') + '</div>';
    }
    var trongPham = function (ma) { return !D.cs || ma === D.cs; };
    if (laQT()) h += veDonCho(D.donCho.filter(function (d) { return trongPham(d.co_so_ma); }));
    var thu = L().thuCuaNgay(D.ngay);
    var vangGop = gopVang(D.vang);
    if (D.nghi) {
      EL.innerHTML = h + '<div class="hd-kiem xanh">🎌 ' + thoat(tenNgay(D.ngay)) + ' là ngày nghỉ (<b>' + thoat(D.nghi.ten || 'nghỉ') + '</b>) — không có tiết, không cần bố trí dạy thay.</div>';
      ganKhung(); ganNgay(); ganPhamVi(); return;
    }
    if (!D.pb || !D.dl) {
      EL.innerHTML = h + '<div class="the-thong-bao">Chưa có thời khóa biểu <b>đã công bố</b> áp dụng cho ngày này — ' +
        'không biết lớp nào học tiết nào để bố trí.</div>';
      ganKhung(); ganNgay(); ganPhamVi(); return;
    }
    if (thu === 8) { EL.innerHTML = h + '<div class="the-thong-bao">Chủ nhật — không có tiết học.</div>'; ganKhung(); ganNgay(); ganPhamVi(); return; }

    var bc = boiCanh();
    var dsVang = vangGop.filter(function (v) { return thuocPham(bc, v, trongPham); });
    var tong = 0, chua = 0, daHien = {};
    var the = dsVang.map(function (v) {
      var tatCa = L().tietCanThay(bc, v);
      var dsTiet = tatCa.filter(function (x) { return trongPham(x.coSo); });
      tong += dsTiet.length;
      chua += dsTiet.filter(function (x) { return !x.daPhan; }).length;
      tatCa.forEach(function (x) { if (x.daPhan) daHien[x.daPhan.id] = 1; if (x.thayHo) daHien[x.thayHo.id] = 1; });
      return veNguoiVang(bc, v, dsTiet, tatCa.length - dsTiet.length);
    });
    var dtPham = D.dayThay.filter(function (d) { return trongPham(d.co_so_ma); });
    var chuaNhan = dtPham.filter(function (d) { return (d.gv_thay_email || d.gv_thay_nhan) && d.trang_thai !== 'da_nhan'; }).length;
    var chuaBao = dtPham.filter(function (d) { return d.trang_thai === 'da_phan'; }).length;

    h += '<div class="tkb-tom">' +
      '<div><span class="tkb-nhan">Người vắng</span><b class="so">' + dsVang.length + '</b><small>theo sổ vắng ngày này</small></div>' +
      '<div><span class="tkb-nhan">Tiết cần thay</span><b class="so">' + tong + '</b><small>theo TKB áp dụng từ ' + ngayVN(D.pb.ap_dung_tu) + '</small></div>' +
      '<div><span class="tkb-nhan">Chưa bố trí</span><b class="so" style="color:' + (chua ? 'var(--thieu)' : 'var(--ok)') + '">' + chua + '</b><small>' + (chua ? 'tiết' : 'đã đủ') + '</small></div>' +
      (dtPham.length ? '<div><span class="tkb-nhan">Chưa nhận</span><b class="so" style="color:' + (chuaNhan ? 'var(--thieu)' : 'var(--ok)') + '">' + chuaNhan + '</b><small>' + (chuaNhan ? 'tiết — người thay chưa bấm Đã nhận' : 'đều đã nhận') + '</small></div>' : '') +
      // 8/10/2026: gộp "Chép tin Zalo" + "Đánh dấu đã báo" làm MỘT nút — trước đây hay quên bước thứ hai
      (dtPham.length ? '<div class="dt-nut-tom"><button class="' + (chuaBao ? 'nut-chinh' : 'dh-nut-nho') + '" id="dt-zalo">📤 Gửi Zalo' + (chuaBao ? ' (' + chuaBao + ' tiết chưa báo)' : '') + '</button></div>' : '') +
      '</div>';

    if (!dsVang.length) {
      h += '<div class="hd-kiem xanh">🟢 Không có ai ' + (D.cs ? 'của ' + thoat(tenCoSo(D.cs)) + ' ' : '') + 'trong sổ vắng ngày ' + ngayVN(D.ngay) + ' — chưa phải bố trí dạy thay.' +
        (coQuyenBao ? ' Có giáo viên xin nghỉ thì bấm <b>🙋 Báo nghỉ &amp; bố trí dạy thay</b> ở trên.' : '') + '</div>';
    }
    // Tiết đã bố trí nhưng không còn khớp người vắng nào (xoá báo nghỉ, đổi TKB…) — vẫn huỷ được ở đây
    var moCoi = dtPham.filter(function (d) { return !daHien[d.id]; });
    EL.innerHTML = h + the.join('') + (moCoi.length ? veMoCoi(moCoi) : '');
    ganKhung(); ganNgay(); ganPhamVi(); ganBoTri(bc);
  }
  function tenCoSo(ma) { var c = D.coSo.filter(function (x) { return x.ma === ma; })[0]; return c ? c.ten : ma; }

  function veDonCho(ds) {
    if (!ds.length) return '';
    return '<section class="dt-the dt-don-cho"><header><div><b>📝 Đơn xin nghỉ chờ duyệt (' + ds.length + ')</b>' +
      '<small>duyệt xong là bố trí người dạy thay ngay</small></div></header>' + ds.map(function (d) {
        return '<div class="dt-don"><div><b>' + thoat(d.nguoi_gui_ten) + '</b> · ' + thoat(LOAI_DON[d.loai] || d.loai) +
          '<small>' + ngayVN(d.tu_ngay) + (d.den_ngay && d.den_ngay !== d.tu_ngay ? ' → ' + ngayVN(d.den_ngay) : '') + ' · ' + tenBuoiVang(d.buoi) +
          (d.co_so_ma && !D.cs ? ' · ' + thoat(tenCoSo(d.co_so_ma)) : '') + (d.noi_dung ? ' · ' + thoat(d.noi_dung) : '') + '</small></div>' +
          '<span class="dt-hanh"><button class="nut-chinh" data-duyet="' + d.id + '" data-tu="' + thoat(d.tu_ngay || '') + '">Duyệt &amp; bố trí</button>' +
          '<button class="dh-nut-nho" data-tu-choi="' + d.id + '">Không duyệt</button></span></div>';
      }).join('') + '</section>';
  }

  function veMoCoi(ds) {
    return '<section class="dt-the dt-mo-coi"><header><div><b>⚠ Tiết đã bố trí nhưng không còn khớp người vắng</b>' +
      '<small>báo nghỉ đã xoá hoặc thời khóa biểu đã đổi — huỷ nếu không còn cần</small></div></header>' + ds.map(function (d) {
        return '<div class="dt-tiet da"><span class="dt-ki">' + kiHieuTiet(d.buoi, d.tiet) + '</span>' +
          '<span class="dt-lop"><b>' + thoat(d.lop) + '</b> · ' + thoat(d.mon || '') + '</span>' +
          '<span class="dt-ai">' + (d.gv_thay_email || d.gv_thay_nhan ? '👤 <b>' + thoat(d.gv_thay_ten || d.gv_thay_nhan) + '</b>' : '<i>Lớp tự quản</i>') +
          (d.gv_vang_ten ? ' <small>thay ' + thoat(d.gv_vang_ten) + '</small>' : '') + '</span>' +
          (duocBoTri(d.co_so_ma) ? '<span class="dt-hanh"><button class="dh-nut-nho dt-nut-huy" data-huy="' + d.id + '">Huỷ</button></span>' : '') + '</div>';
      }).join('') + '</section>';
  }

  function veNguoiVang(bc, v, dsTiet, soNgoai) {
    var khop = L().gvCuaVang(bc, v);
    var conTrongTat = dsTiet.filter(function (x) { return !x.daPhan; });
    var coQuyenNhanh = conTrongTat.some(function (x) { return duocBoTri(x.coSo); });
    var h = '<section class="dt-the"><header><div><b>' + thoat(v.ho_ten) + '</b>' +
      (khop[0] && khop[0].nhan !== v.ho_ten ? ' <small>(' + thoat(khop[0].nhan) + ')</small>' : '') +
      '<small>' + thoat(v.ly_do || '') + ' · ' + tenBuoiVang(v.buoi) +
      (v.den_ngay && v.den_ngay !== v.ngay ? ' · ' + ngayVN(v.ngay) + ' → ' + ngayVN(v.den_ngay) : '') + '</small>' +
      (v.trung && v.trung.length ? '<small class="dt-canh">⚠ Báo nghỉ ' + (v.trung.length + 1) + ' lần (báo tay + đơn) — đã gộp một thẻ</small>' : '') +
      (soNgoai ? '<small>+ ' + soNgoai + ' tiết ở phân hiệu khác (xem "Toàn trường")</small>' : '') + '</div>' +
      '<span class="dt-hanh"><span class="tkb-chip ' + (!conTrongTat.length ? 'xanh' : 'do') + '">' +
      (dsTiet.length - conTrongTat.length) + '/' + dsTiet.length + ' tiết đã bố trí</span>' +
      // Xoá báo nghỉ: chỉ dòng KHÔNG sinh từ đơn đã duyệt; RLS gvv_xoa cho phụ trách trong 2 ngày, quản trị luôn
      ((v.id > 0 || (!may() && v.id !== -1)) && !v.de_xuat_id && duocBoTri(v.co_so_ma) ? '<button class="dh-nut-nho" data-xoa-vang="' + v.id + '" title="Báo nhầm — xoá khỏi sổ vắng">Xoá báo nghỉ</button>' : '') +
      '</span></header>';
    if (coQuyenNhanh) h += '<button class="nut-chinh dt-nut-lon dt-nhanh" data-nhanh="' + v.id + '">⚡ Bố trí nhanh ' + conTrongTat.length + ' tiết</button>';
    if (!khop.length && !dsTiet.length) {
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
        (coQuyen && conTrong.length ? '<button class="dh-nut-nho dt-nut-pa" data-pa="' + thoat(khoaPA) + '">' +
          (D.moPA === khoaPA ? 'Ẩn phương án' : '🧩 Xem phương án (' + conTrong.length + ' tiết)') + '</button>' : '') + '</div>';
      if (coQuyen && D.moPA === khoaPA) h += vePhuongAn(bc, tiet, khoaPA);
      tiet.forEach(function (x) {
        var k = [x.buoi, x.tiet, x.lop].join('|');
        var d = x.daPhan;
        h += '<div class="dt-tiet' + (d ? ' da' : '') + '"><span class="dt-ki">' + kiHieuTiet(x.buoi, x.tiet) + '</span>' +
          '<span class="dt-lop"><b>' + thoat(x.lop) + '</b> · ' + thoat(x.mon) + '</span>' +
          '<span class="dt-ai">' + (d ? (d.gv_thay_email || d.gv_thay_nhan ? '👤 <b>' + thoat(d.gv_thay_ten || d.gv_thay_nhan) + '</b>' : '<i>Lớp tự quản</i>') +
            (d.gv_thay_email || d.gv_thay_nhan ? ' ' + chipTT(d) : '') : '<span class="tkb-chip do">chưa có người</span>') +
            (x.thayVang ? ' <span class="tkb-chip do">⚠ người thay cũng nghỉ — đổi người</span>' : '') +
            (x.thayHo ? ' <span class="tkb-chip vang">đang dạy thay cho ' + thoat(x.thayHo.gv_vang_ten || 'người khác') + ' — cần người khác</span>' : '') + '</span>' +
          (coQuyen ? '<span class="dt-hanh"><button class="dh-nut-nho" data-mo="' + thoat(k) + '">' + (D.mo === k ? 'Ẩn' : d ? 'Đổi' : 'Chọn người') + '</button></span>' : '') +
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
  function boQuaCua(x) { return x.daPhan ? [x.daPhan.id] : x.thayHo ? [x.thayHo.id] : []; }
  function veGoiY(bc, x, v) {
    var uv = L().ungVien(bc, x, boQuaCua(x)).slice(0, 8);
    var k = [x.buoi, x.tiet, x.lop].join('|');
    var d = x.daPhan;
    var nhomTruoc = 0;
    return '<div class="dt-goi-y">' +
      // Việc phụ của tiết ĐÃ có người: gói vào đây cho dòng tiết chỉ còn một nút (trước có 📋 · Đổi · Huỷ sát nhau, dễ bấm nhầm Huỷ)
      (d ? '<div class="dt-goi-y-phu">' + ((d.gv_thay_email || d.gv_thay_nhan) ? '<button class="dh-nut-nho" data-zalo-nguoi="' + thoat(d.gv_thay_email || d.gv_thay_nhan) + '">📋 Chép tin riêng cho ' + thoat(d.gv_thay_ten || d.gv_thay_nhan) + '</button>' : '') +
        '<button class="dh-nut-nho dt-nut-huy" data-huy="' + d.id + '">Huỷ bố trí tiết này</button></div>' : '') +
      (uv.length ? uv.map(function (u, i) {
        var dauNhom = u.nhom !== nhomTruoc ? '<div class="dt-nhom-uv">' + u.nhom + '. ' + thoat((L().TEN_NHOM || {})[u.nhom] || '') + '</div>' : '';
        nhomTruoc = u.nhom;
        return dauNhom + '<div class="dt-uv' + (i === 0 ? ' nhat' : '') + '"><div><b>' + thoat(u.gv.ten) + '</b> <small>' + thoat(u.gv.nhan) + '</small>' +
          (u.gv.email ? '' : ' <span class="tkb-chip vang">chưa có Gmail — không nhận được nhắc trên app</span>') +
          '<div class="dt-ly-do">' + chips(u.lyDo) + '</div></div>' +
          '<button class="' + (i === 0 ? 'nut-chinh' : 'dh-nut-nho') + '" data-phan="' + thoat(k) + '" data-gv="' + thoat(u.gv.nhan) + '" data-vang="' + v.id + '">Chọn</button></div>';
      }).join('') : '<div class="hd-kiem vang" style="margin:0">Không còn ai hợp lệ cho tiết này (đều đang có tiết, vắng, ở điểm trường khác hoặc đã đủ ' + L().GIOI_HAN_BUOI + ' tiết/buổi).</div>') +
      '<div class="dt-uv tu-quan"><div><b>Không cần người (lớp tự quản)</b><div class="dt-ly-do"><span class="tkb-chip xam">vẫn ghi vào danh sách để theo dõi</span></div></div>' +
      '<button class="dh-nut-nho" data-phan="' + thoat(k) + '" data-gv="" data-vang="' + v.id + '">Chọn</button></div></div>';
  }
  function vePhuongAn(bc, tiet, khoaPA) {
    var boQua = [];
    tiet.forEach(function (x) { if (x.thayHo) boQua.push(x.thayHo.id); });
    var pa = L().phuongAn(bc, tiet, boQua);
    if (!pa.length) return '<div class="dt-goi-y"><div class="hd-kiem vang" style="margin:0">Không còn ai hợp lệ để ghép đủ các tiết — dùng nút Chọn người từng tiết hoặc chọn lớp tự quản.</div></div>';
    PA_TAM[khoaPA] = pa;
    return '<div class="dt-goi-y dt-pa-ds"><div class="dt-pa-chu">Ưu tiên: <b>cùng khối</b> → <b>GV đang có tiết buổi này</b> (chỉ trống đúng tiết đó) → hết người mới đến GV <b>không có tiết buổi này</b> (phải đến trường).</div>' +
      pa.map(function (p, i) {
        return '<div class="dt-pa' + (i === 0 ? ' nhat' : '') + '"><div class="dt-pa-dau"><b>' + thoat(p.tieuDe) + '</b>' +
          '<button class="' + (i === 0 ? 'nut-chinh' : 'dh-nut-nho') + '" data-chon-pa="' + thoat(khoaPA) + '" data-i="' + i + '">Chọn phương án này</button></div>' +
          '<div class="dt-ly-do">' + chips(p.lyDo || []) + '</div>' +
          '<div class="dt-pa-tiet">' + p.gan.map(function (g) {
            return '<div><span class="dt-ki">' + kiHieuTiet(g.tiet.buoi, g.tiet.tiet) + '</span> ' + thoat(g.tiet.lop) + ' · ' + thoat(g.tiet.mon) +
              ' → <b>' + thoat(g.gv.ten) + '</b> <span class="tkb-chip ' + (g.nhom <= 2 ? 'xanh' : g.nhom <= 4 ? 'vang' : 'xam') + '">' +
              thoat((L().TEN_NHOM || {})[g.nhom] || '') + '</span></div>';
          }).join('') + '</div></div>';
      }).join('') + '</div>';
  }
  var PA_TAM = {};

  // ══════════════════════════════════════════════════════════════
  // SỰ KIỆN + GHI
  // ══════════════════════════════════════════════════════════════
  function tat(sel, fn) { Array.prototype.slice.call(EL.querySelectorAll(sel)).forEach(function (b) { b.addEventListener('click', function () { fn(b); }); }); }
  function ganKhung() { tat('[data-khung]', function (b) { D.khung = b.getAttribute('data-khung'); D.khungChon = true; ve(); }); }
  function ganNgay() {
    var o = document.getElementById('dt-chon-ngay');
    if (o) o.addEventListener('change', function () { if (/^\d{4}-\d{2}-\d{2}$/.test(o.value)) { D.ngay = o.value; D.mo = ''; D.moPA = ''; ve(); } });
    tat('[data-lui]', function (b) { D.ngay = congNgay(D.ngay, +b.getAttribute('data-lui')); D.mo = ''; D.moPA = ''; ve(); });
    tat('[data-hom-nay]', function () { D.ngay = homNayISO(); D.mo = ''; D.moPA = ''; ve(); });
  }
  function vangTheoId(id) { return gopVang(D.vang).filter(function (x) { return String(x.id) === String(id); })[0]; }
  function ganBoTri(bc) {
    tat('[data-mo]', function (b) { var k = b.getAttribute('data-mo'); D.mo = D.mo === k ? '' : k; D.moPA = ''; ve(); });
    tat('[data-pa]', function (b) { var k = b.getAttribute('data-pa'); D.moPA = D.moPA === k ? '' : k; D.mo = ''; ve(); });
    tat('[data-nhanh]', function (b) { var v = vangTheoId(b.getAttribute('data-nhanh')); if (v) BN.mo({ v: v, ngay: D.ngay }); });
    tat('[data-phan]', function (b) {
      var p = b.getAttribute('data-phan').split('|');
      var v = vangTheoId(b.getAttribute('data-vang'));
      var x = v && L().tietCanThay(bc, v).filter(function (t) { return t.buoi === p[0] && String(t.tiet) === p[1] && t.lop === p[2]; })[0];
      if (!x) return;
      var g = b.getAttribute('data-gv') ? bc.theoNhan[b.getAttribute('data-gv')] : null;
      ghi([{ tiet: x, gv: g }], v, b);
    });
    tat('[data-chon-pa]', function (b) {
      var pa = (PA_TAM[b.getAttribute('data-chon-pa')] || [])[+b.getAttribute('data-i')];
      var v = vangTheoId(b.getAttribute('data-chon-pa').split('|')[0]);
      if (pa && v) ghi(pa.gan, v, b);
    });
    tat('[data-huy]', function (b) {
      var id = +b.getAttribute('data-huy');
      var xn = window.hopHoi ? window.hopHoi('Huỷ bố trí dạy thay tiết này? Tiết sẽ trở lại "chưa có người". Nhớ báo lại người đã được phân.', { tieuDe: 'Dạy thay', nutOK: 'Huỷ bố trí' }) : Promise.resolve(window.confirm('Huỷ bố trí tiết này?'));
      xn.then(function (ok) {
        if (!ok) return;
        if (!may()) { DEMO.dayThay = DEMO.dayThay.filter(function (d) { return d.id !== id; }); taiLai(); return; }
        b.disabled = true;
        may().from('day_thay').update({ trang_thai: 'huy' }).eq('id', id).select('id').then(function (r) {
          if (r.error || !r.data || !r.data.length) { b.disabled = false; bao('Không huỷ được: ' + (r.error ? r.error.message : 'không đủ quyền')); return; }
          bao('Đã huỷ bố trí.'); taiLai();
        });
      });
    });
    var z = document.getElementById('dt-zalo');
    // Chỉ phân hiệu đang lọc (rà toàn app 1/10/2026: trước đây chép cả trường dù đang xem một điểm)
    if (z) z.addEventListener('click', function () {
      var ds = D.dayThay.filter(function (d) { return !D.cs || d.co_so_ma === D.cs; });
      guiZalo(D.ngay, ds, z).then(function (daGui) { if (daGui) danhDauDaBao(ds).then(taiLai); });
    });
  }
  function taiLai() {
    D.khoa = ''; D.mo = ''; D.moPA = '';
    NHAC.khoa = '';
    if (window.VIEC_NHANH && window.VIEC_NHANH.ve) window.VIEC_NHANH.ve(true);
    ve();
  }

  function ganPhamVi() {
    tat('[data-cs]', function (b) { D.cs = b.getAttribute('data-cs'); D.mo = ''; D.moPA = ''; ve(); });
    var mo = document.getElementById('dt-mo-bao'); if (mo) mo.addEventListener('click', function () { BN.mo({ ngay: D.ngay }); });
    tat('[data-duyet]', function (b) { duyetDon(+b.getAttribute('data-duyet'), true, b, b.getAttribute('data-tu')); });
    tat('[data-tu-choi]', function (b) { duyetDon(+b.getAttribute('data-tu-choi'), false, b, ''); });
    tat('[data-xoa-vang]', function (b) { xoaVang(+b.getAttribute('data-xoa-vang'), b); });
    tat('[data-zalo-nguoi]', function (b) {
      var k = b.getAttribute('data-zalo-nguoi');
      var ds = D.dayThay.filter(function (d) { return (d.gv_thay_email || d.gv_thay_nhan) === k; });
      guiZalo(D.ngay, ds, b).then(function (daGui) { if (daGui) danhDauDaBao(ds).then(taiLai); });
    });
  }

  // Duyệt đơn → mở thẳng khung bố trí của người đó (không phải tìm lại thẻ, bấm Phương án…)
  function duyetDon(id, dongY, nut, tuNgay) {
    var hoi = window.hopHoi ? window.hopHoi(dongY ? 'Duyệt đơn xin nghỉ? Người này vào sổ vắng, máy mở ngay khung chọn người dạy thay.' : 'Không duyệt đơn này?',
      { tieuDe: 'Đơn xin nghỉ', nutOK: dongY ? 'Duyệt' : 'Không duyệt' }) : Promise.resolve(window.confirm(dongY ? 'Duyệt đơn?' : 'Không duyệt đơn?'));
    hoi.then(function (ok) {
      if (!ok) return;
      if (!may()) {
        var don = D.donCho.filter(function (d) { return d.id === id; })[0];
        D.donCho = D.donCho.filter(function (d) { return d.id !== id; });
        if (dongY && don) {
          var v = { id: -200 - DEMO.vang.length, ho_ten: don.nguoi_gui_ten, email: '', buoi: don.buoi, co_so_ma: don.co_so_ma, ly_do: LOAI_DON[don.loai] || 'Nghỉ', ngay: don.tu_ngay, den_ngay: don.den_ngay, de_xuat_id: id };
          DEMO.vang.push(v); DEMO.donXong[id] = 1; D.ngay = don.tu_ngay; taiLai(); BN.mo({ v: v, ngay: don.tu_ngay });
        } else ve();
        return;
      }
      nut.disabled = true;
      may().rpc('duyet_de_xuat', { p_id: id, p_dong_y: dongY, p_ghi_chu: null }).then(function (r) {
        if (r.error) { nut.disabled = false; bao('Không duyệt được: ' + r.error.message); return; }
        if (dongY && /^\d{4}-\d{2}-\d{2}$/.test(tuNgay || '')) D.ngay = tuNgay;
        taiLai();
        if (dongY) boTriDon(id); else bao('Đã ghi: không duyệt.');
      });
    });
  }
  // Mở khung bố trí cho người vừa được duyệt đơn (dòng gv_vang có de_xuat_id)
  function boTriDon(deXuatId) {
    if (!may()) return;
    may().from('gv_vang').select('id, ho_ten, email, co_so_ma, ly_do, buoi, ngay, den_ngay, de_xuat_id').eq('de_xuat_id', deXuatId).limit(1).then(function (r) {
      var v = r && !r.error && r.data && r.data[0];
      if (v) { bao('✅ Đã duyệt — chọn người dạy thay.'); BN.mo({ v: v, ngay: v.ngay }); }
      else bao('✅ Đã duyệt — vào sổ vắng.');
    });
  }
  function xoaVang(id, nut) {
    var hoi = window.hopHoi ? window.hopHoi('Xoá báo nghỉ này khỏi sổ vắng? Chỉ dùng khi báo nhầm. Các tiết đã bố trí dạy thay cho người này cũng được HUỶ theo.',
      { tieuDe: 'Xoá báo nghỉ', nutOK: 'Xoá' }) : Promise.resolve(window.confirm('Xoá báo nghỉ?'));
    hoi.then(function (ok) {
      if (!ok) return;
      if (!may()) {
        DEMO.vang = DEMO.vang.filter(function (v) { return v.id !== id; });
        DEMO.dayThay = DEMO.dayThay.filter(function (d) { return d.gv_vang_id !== id; });
        if (id === -1) DEMO.boMau = true;
        taiLai(); return;
      }
      nut.disabled = true;
      // Huỷ dạy thay TRƯỚC — rà 8/10/2026: xoá sổ vắng trước thì các dòng day_thay mồ côi (FK set null),
      // không còn nút nào huỷ mà vẫn vào tin Zalo, lời nhắc và bảng tính giờ dạy thay.
      may().from('day_thay').update({ trang_thai: 'huy' }).eq('gv_vang_id', id).neq('trang_thai', 'huy').select('id').then(function (h) {
        if (h.error) throw h.error;
        return may().from('gv_vang').delete().eq('id', id).select('id').then(function (r) {
          if (r.error || !r.data || !r.data.length) { nut.disabled = false; bao('Không xoá được — quá 2 ngày kể từ lúc ghi, tháng đã chốt công, hoặc không đủ quyền. Nhờ quản trị xoá.' + ((h.data || []).length ? ' (' + h.data.length + ' tiết dạy thay đã huỷ — bố trí lại nếu vẫn nghỉ.)' : '')); taiLai(); return; }
          bao('Đã xoá báo nghỉ' + ((h.data || []).length ? ' và huỷ ' + h.data.length + ' tiết dạy thay.' : '.')); taiLai();
        });
      }).catch(function (e) { nut.disabled = false; bao('Không xoá được: ' + ((e && e.message) || e)); });
    });
  }

  // ── Một dòng day_thay để ghi. ctx = dữ liệu của ngày (docNgay/D) ──
  function banGhi(ngay, g, v, ctx) {
    var h = g.tiet.thayHo;   // tiết người vắng đang dạy thay cho người khác → giữ người vắng GỐC
    return { ngay: ngay, buoi: g.tiet.buoi, tiet: g.tiet.tiet, lop: g.tiet.lop, mon: g.tiet.mon, co_so_ma: g.tiet.coSo || null,
      // TKB ghép nhiều phân hiệu (sql/66) có id dạng chữ 'g…' — ghi id bản chứa lớp đó
      phien_ban_id: (ctx.dl && ctx.dl.lopPB && ctx.dl.lopPB[g.tiet.lop]) || (ctx.pb && typeof ctx.pb.id === 'number' && ctx.pb.id) || null,
      gv_vang_id: h ? (h.gv_vang_id || null) : (v.id > 0 || (!may() && v.id) ? v.id : null),
      gv_vang_nhan: h ? h.gv_vang_nhan : g.tiet.gvNhan, gv_vang_ten: h ? h.gv_vang_ten : v.ho_ten, gv_vang_email: h ? (h.gv_vang_email || null) : (v.email || null),
      gv_thay_nhan: g.gv ? g.gv.nhan : null, gv_thay_ten: g.gv ? g.gv.ten : null, gv_thay_email: g.gv ? (g.gv.email || null) : null,
      trang_thai: 'da_phan' };
  }
  // ── Ghi bố trí: đọc lại day_thay của ngày → soát xung đột → huỷ dòng cũ → chèn dòng mới.
  //    Chèn hỏng thì TRẢ dòng cũ về trạng thái trước (rà 8/10/2026: trước đây "Đổi" hỏng giữa chừng là
  //    tiết mất người, người cũ — kể cả đã bấm Đã nhận — bị gỡ mà không ai hay).
  //    → Promise<dòng mới>
  function ghiDayThay(ngay, gan, v, ctx, vangBc) {
    var boQua = [];
    gan.forEach(function (g) { boQuaCua(g.tiet).forEach(function (id) { boQua.push(id); }); });
    var dong = gan.map(function (g) {
      return { buoi: g.tiet.buoi, tiet: g.tiet.tiet, lop: g.tiet.lop, gv_thay_email: g.gv ? g.gv.email : '', gv_thay_nhan: g.gv ? g.gv.nhan : '' };
    });
    if (!may()) {
      var moi = gan.map(function (g, i) { return Object.assign({ id: -1000 - DEMO.dayThay.length - i }, banGhi(ngay, g, v, ctx)); });
      DEMO.dayThay = DEMO.dayThay.filter(function (d) { return boQua.indexOf(d.id) < 0; }).concat(moi);
      return Promise.resolve(moi);
    }
    var cu = [];
    return may().from('day_thay').select('*').eq('ngay', ngay).neq('trang_thai', 'huy').then(function (r) {
      if (r.error) throw r.error;
      var moiNhat = r.data || [];
      var bc = L().boiCanh({ ngay: ngay, tiet: ctx.dl.tiet, gv: ctx.dl.gv, lopCoSo: ctx.dl.lopCoSo, vang: vangBc,
        dayThay: moiNhat, dayThayThang: [], quanLy: ctx.quanLy });
      var loi = L().xungDot(bc, dong, boQua);
      var trungLop = gan.filter(function (g) { return moiNhat.some(function (d) { return boQua.indexOf(d.id) < 0 && d.buoi === g.tiet.buoi && +d.tiet === +g.tiet.tiet && d.lop === g.tiet.lop; }); });
      if (trungLop.length) loi.push('Tiết ' + trungLop.map(function (g) { return kiHieuTiet(g.tiet.buoi, g.tiet.tiet) + ' ' + g.tiet.lop; }).join(', ') + ' vừa được người khác bố trí');
      if (loi.length) throw new Error('Chưa ghi — ' + loi.join('; ') + '. Màn hình đã tải lại số mới.');
      cu = moiNhat.filter(function (d) { return boQua.indexOf(d.id) >= 0; });
      return boQua.length ? may().from('day_thay').update({ trang_thai: 'huy' }).in('id', boQua).select('id') : { data: [] };
    }).then(function (h) {
      if (h.error) throw h.error;
      return may().from('day_thay').insert(gan.map(function (g) { return banGhi(ngay, g, v, ctx); })).select('*');
    }).then(function (w) {
      if (!w.error) return w.data || [];
      var m = String(w.error.message || '');
      var loi = new Error(/duplicate|unique|23505/i.test(m + w.error.code) ? 'Vừa có người bố trí trùng lớp/tiết hoặc trùng người — tải lại để xem.' : m);
      if (!cu.length) throw loi;
      // Trả dòng cũ về đúng trạng thái trước khi huỷ
      var theoTT = {};
      cu.forEach(function (d) { (theoTT[d.trang_thai] = theoTT[d.trang_thai] || []).push(d.id); });
      return Promise.all(Object.keys(theoTT).map(function (tt) { return may().from('day_thay').update({ trang_thai: tt }).in('id', theoTT[tt]); }))
        .then(function () { throw new Error(loi.message + ' Người dạy thay cũ được giữ nguyên.'); });
    });
  }
  // Bố trí từ thẻ người vắng (Chọn người / Chọn phương án): hỏi lại một lần rồi ghi
  function ghi(gan, v, nut) {
    var chuHoi = gan.map(function (g) {
      return kiHieuTiet(g.tiet.buoi, g.tiet.tiet) + ' · ' + g.tiet.lop + ' · ' + g.tiet.mon + ' → ' + (g.gv ? g.gv.ten + (g.gv.email ? '' : ' (chưa có Gmail — không nhận được nhắc)') : 'lớp tự quản');
    }).join('\n');
    var xn = window.hopHoi ? window.hopHoi('Bố trí dạy thay ' + tenNgay(D.ngay) + ' (thay ' + v.ho_ten + '):\n\n' + chuHoi, { tieuDe: 'Dạy thay', nutOK: 'Bố trí' })
      : Promise.resolve(window.confirm(chuHoi));
    xn.then(function (ok) {
      if (!ok) return;
      if (nut) nut.disabled = true;
      ghiDayThay(D.ngay, gan, v, D, gopVang(D.vang)).then(function (moi) {
        bao('✅ Đã bố trí ' + moi.length + ' tiết — bấm 📤 Gửi Zalo để báo người dạy thay.');
        taiLai();
      }).catch(function (e) { if (nut) nut.disabled = false; bao('Không ghi được: ' + ((e && e.message) || e)); taiLai(); });
    });
  }

  // ── Gửi tin Zalo: điện thoại mở bảng chia sẻ (chọn Zalo → nhóm), máy tính chép vào bộ nhớ.
  //    → Promise<true nếu đã gửi/chép> ──
  function guiZalo(ngay, dong, nut) {
    var chu = L().vanBanZalo(ngay, dong, (window.CAU_HINH || {}).TEN_TRUONG || '');
    if (!dong.length) { bao('Chưa có tiết nào để báo.'); return Promise.resolve(false); }
    if (navigator.share && laDienThoai()) {
      return navigator.share({ text: chu }).then(function () { return true; }, function (e) {
        if (e && e.name === 'AbortError') return false;   // người dùng đóng bảng chia sẻ
        return chepChu(chu);
      });
    }
    return chepChu(chu);
  }
  function chepChu(chu) {
    var xong = function () { bao('📋 Đã chép tin — mở Zalo, dán vào nhóm của trường.'); return true; };
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(chu).then(xong, function () { return Promise.resolve(hienChu(chu)); });
    return Promise.resolve(hienChu(chu));
  }
  function hienChu(chu) {
    var t = document.createElement('textarea');
    t.value = chu; document.body.appendChild(t); t.select();
    var ok = true;
    try { document.execCommand('copy'); bao('📋 Đã chép tin — mở Zalo, dán vào nhóm của trường.'); } catch (e) { window.prompt('Chép đoạn này:', chu); }
    document.body.removeChild(t);
    return ok;
  }
  // Đánh dấu "đã báo" ĐÚNG các dòng vừa gửi (rà 8/10/2026: trước đây đánh theo ngày — ở chế độ Toàn trường
  // đổi luôn tiết của phân hiệu khác chưa ai báo)
  function danhDauDaBao(ds) {
    var ids = ds.filter(function (d) { return d.trang_thai === 'da_phan' && d.id; }).map(function (d) { return d.id; });
    if (!ids.length) return Promise.resolve();
    if (!may()) { DEMO.dayThay.forEach(function (d) { if (ids.indexOf(d.id) >= 0) d.trang_thai = 'da_bao'; }); return Promise.resolve(); }
    return may().from('day_thay').update({ trang_thai: 'da_bao' }).in('id', ids).eq('trang_thai', 'da_phan').select('id').then(function (r) {
      if (r.error) bao('Đã gửi nhưng chưa đánh dấu được "đã báo": ' + r.error.message);
    });
  }

  // ══════════════════════════════════════════════════════════════
  // BÁO NGHỈ NHANH — khung trượt (điện thoại) / hộp giữa màn (máy tính)
  //   Thầy Chung 8/10/2026: "đảm bảo người dùng ít chạm nhất".
  //   ① chạm tên người nghỉ  ② chạm buổi (Sáng nay / Cả ngày mai…)  ③ máy xếp sẵn người dạy thay cho
  //   MỌI tiết cả hai buổi → "Ghi nghỉ & bố trí"  ④ "Gửi Zalo" (gửi + đánh dấu đã báo một lần).
  //   Mở từ: nút trong thẻ Dạy thay · nút ở khung Việc cần xử lý · "⚡ Bố trí nhanh" trên thẻ người vắng ·
  //   ngay sau khi Duyệt đơn xin nghỉ.
  // ══════════════════════════════════════════════════════════════
  var DEMO = { vang: [], dayThay: [], donXong: {}, boMau: false };   // bản xem thử (không có máy chủ)
  var BN = { el: null };
  BN.mo = function (o) {
    o = o || {};
    BN.buoc = o.v ? 3 : 1; BN.v = o.v || null; BN.nguoi = o.v ? { ho_ten: o.v.ho_ten, email: o.v.email, co_so_ma: o.v.co_so_ma } : null;
    BN.lyDo = (o.v && o.v.ly_do) || 'Nghỉ ốm'; BN.tim = ''; BN.khac = false; BN.loi = ''; BN.dangGhi = false; BN.xong = null;
    BN.tu = o.v ? (o.ngay || o.v.ngay) : ''; BN.den = o.v ? (o.v.den_ngay || '') : ''; BN.buoi = o.v ? o.v.buoi : 'ca_ngay';
    BN.chon = {}; BN.pa = {}; BN.moTiet = '';
    // Phạm vi: phân hiệu đang xem ở thẻ Dạy thay; chưa mở thẻ đó (mở từ Việc cần xử lý) → tính sau khi nạp co_so
    // (thử trên trang thật 8/10/2026: trước mặc định Toàn trường, PHT phải tìm trong 94 người)
    BN.cs = D.cs !== null && D.cs !== undefined && D.coSo.length ? D.cs : undefined;
    BN.hn = homNayISO();
    if (!BN.el) {
      BN.el = document.createElement('div'); BN.el.className = 'bn-man'; BN.el.id = 'bn-man';
      BN.el.addEventListener('click', bnBam);
      BN.el.addEventListener('input', function (e) { if (e.target && e.target.id === 'bn-tim') { BN.tim = e.target.value; bnVeDs(); } });
      BN.el.addEventListener('change', function (e) {
        var t = e.target; if (!t) return;
        if (t.id === 'bn-tu') BN.tuTam = t.value; else if (t.id === 'bn-den') BN.denTam = t.value; else if (t.id === 'bn-buoi-khac') BN.buoiTam = t.value;
      });
      document.body.appendChild(BN.el);
    }
    BN.el.style.display = '';
    document.documentElement.classList.add('bn-khoa-cuon');
    bnTai(BN.buoc === 3 ? BN.tu : BN.hn);
  };
  BN.dong = function () {
    if (BN.el) { BN.el.style.display = 'none'; BN.el.innerHTML = ''; }
    document.documentElement.classList.remove('bn-khoa-cuon');
  };
  // Dữ liệu cho một ngày (nhớ trong phiên khung đang mở)
  function bnTai(ngay) {
    BN.ctxNgay = ngay; BN.ctx = null; BN.dangTai = true; bnVe();
    docNgay(ngay).then(function (kq) {
      if (BN.ctxNgay !== ngay) return;
      BN.ctx = kq; BN.dangTai = false;
      if (BN.cs === undefined) {
        var e = toiEmail(), cua = kq.coSo.filter(function (c) { return !!e && String(c.phu_trach_email || '').toLowerCase() === e; });
        BN.cs = cua.length ? cua[0].ma : '';
      }
      if (!D.coSo.length && kq.coSo.length) D.coSo = kq.coSo;
      bnVe();
    }).catch(function (e) { if (BN.ctxNgay === ngay) { BN.dangTai = false; BN.loi = loiDoc(e); bnVe(); } });
  }
  function ngayHocSau(iso) { var n = congNgay(iso, 1); return L().thuCuaNgay(n) === 8 ? congNgay(n, 1) : n; }
  function bnDsNguoi() {
    var ctx = BN.ctx; if (!ctx) return [];
    var bc = ctx.dl ? boiCanhCua(BN.hn, ctx, []) : null;
    var lopCN = {};
    if (ctx.dl) (ctx.dl.gv || []).forEach(function (g) { if (g.email && g.lop_cn) lopCN[String(g.email).toLowerCase()] = g.lop_cn; });
    var dangNghi = {};
    gopVang(ctx.vang).forEach(function (v) { dangNghi[khoaNguoi(v)] = v; });
    return ctx.cbgv.filter(function (c) { return (!BN.cs || c.co_so_ma === BN.cs) && (laQT() || duocBoTri(c.co_so_ma)); }).map(function (c) {
      var v = { ho_ten: c.ho_ten, email: c.email, buoi: 'ca_ngay' };
      var so = bc && L().thuCuaNgay(BN.hn) !== 8 ? L().tietCanThay(bc, v).length : 0;
      return { c: c, so: so, lop: lopCN[String(c.email || '').toLowerCase()] || '', nghi: dangNghi[khoaNguoi(c)] || null };
    }).sort(function (a, b) { return (b.so > 0) - (a.so > 0) || String(a.c.ho_ten).localeCompare(b.c.ho_ten, 'vi'); });
  }
  function bnVeDs() {
    var o = BN.el && BN.el.querySelector('#bn-ds'); if (!o) return;
    var t = L().khongDau(BN.tim || '');
    var ds = BN.dsNguoi.filter(function (x) { return !t || L().khongDau(x.c.ho_ten).indexOf(t) >= 0; });
    o.innerHTML = ds.length ? ds.map(function (x) {
      var i = BN.dsNguoi.indexOf(x);
      return '<button type="button" class="bn-nguoi" data-bn-nguoi="' + i + '"><b>' + thoat(x.c.ho_ten) + '</b><small>' +
        [x.lop ? 'CN ' + x.lop : (x.c.chuc_vu || ''), x.so ? x.so + ' tiết hôm nay' : 'không có tiết hôm nay', !BN.cs && x.c.co_so_ma ? tenCoSo(x.c.co_so_ma) : '']
          .filter(Boolean).map(thoat).join(' · ') + '</small>' +
        (x.nghi ? '<span class="tkb-chip vang">đang nghỉ ' + thoat(tenBuoiVang(x.nghi.buoi)) + '</span>' : '') + '</button>';
    }).join('') : '<div class="the-thong-bao">Không có ai khớp "' + thoat(BN.tim) + '".</div>';
  }
  // Tiết cần thay + gán đang chọn (theo phương án và các chỗ người dùng đổi tay)
  function bnTinh() {
    var ctx = BN.ctx, kq = { ds: [], buoi: {}, gan: [], bc: null, v: null };
    if (!ctx || !ctx.dl || ctx.nghi || L().thuCuaNgay(BN.tu) === 8) return kq;
    var v = BN.v || { id: 0, ho_ten: BN.nguoi.ho_ten, email: BN.nguoi.email, co_so_ma: BN.nguoi.co_so_ma, buoi: BN.buoi, ly_do: BN.lyDo, ngay: BN.tu, den_ngay: BN.den || null };
    var vang = gopVang(ctx.vang.filter(function (x) { return !BN.v || String(x.id) !== String(BN.v.id); }).concat([v]));
    var vg = vang.filter(function (x) { return khoaNguoi(x) === khoaNguoi(v); })[0] || v;
    var bc = boiCanhCua(BN.tu, ctx, vang);
    kq.bc = bc; kq.v = vg; kq.vang = vang;
    // Chỉ tiết của phân hiệu đang chọn — GV dạy 2 phân hiệu: PHT mỗi nơi bố trí phần của mình (thử 8/10/2026)
    var tatCa = L().tietCanThay(bc, vg), trongCS = function (x) { return !BN.cs || x.coSo === BN.cs; };
    kq.ds = tatCa.filter(function (x) { return !x.daPhan && duocBoTri(x.coSo) && trongCS(x); });
    kq.daCo = tatCa.filter(function (x) { return x.daPhan && trongCS(x); });
    kq.ngoai = tatCa.filter(function (x) { return !trongCS(x); }).length;
    ['sang', 'chieu'].forEach(function (b) {
      var can = kq.ds.filter(function (x) { return x.buoi === b; });
      if (!can.length) return;
      var boQua = []; can.forEach(function (x) { if (x.thayHo) boQua.push(x.thayHo.id); });
      var pa = L().phuongAn(bc, can, boQua);
      var i = Math.min(BN.pa[b] || 0, Math.max(pa.length - 1, 0));
      kq.buoi[b] = { can: can, pa: pa, i: i };
      can.forEach(function (x) {
        var k = [x.buoi, x.tiet, x.lop].join('|');
        var g = null;
        if (Object.prototype.hasOwnProperty.call(BN.chon, k)) g = BN.chon[k] ? bc.theoNhan[BN.chon[k]] || null : null;
        else if (pa[i]) { var a = pa[i].gan.filter(function (y) { return y.tiet === x; })[0]; g = a ? a.gv : null; }
        kq.gan.push({ tiet: x, gv: g, k: k, tay: Object.prototype.hasOwnProperty.call(BN.chon, k) });
      });
    });
    return kq;
  }
  function bnVe() {
    if (!BN.el) return;
    var h = '<div class="bn-hop" role="dialog" aria-modal="true" aria-label="Báo nghỉ và bố trí dạy thay"><div class="bn-dau">' +
      (BN.buoc === 2 || (BN.buoc === 3 && !BN.v) ? '<button type="button" class="bn-lui" data-bn="lui" aria-label="Quay lại">‹</button>' : '') +
      '<b>' + (BN.buoc === 1 ? 'Ai nghỉ?' : BN.buoc === 2 ? 'Nghỉ khi nào?' : BN.buoc === 3 ? 'Người dạy thay' : 'Đã xong') + '</b>' +
      '<span class="bn-buoc">' + (BN.buoc < 4 ? 'Bước ' + BN.buoc + '/3' : '') + '</span>' +
      '<button type="button" class="bn-x" data-bn="dong" aria-label="Đóng">✕</button></div><div class="bn-than">';
    var chan = '';
    if (BN.loi && !BN.ctx) h += '<div class="hd-kiem do">' + thoat(BN.loi) + '</div>';
    else if (BN.dangTai || !BN.ctx) h += '<div class="the-thong-bao">Đang tải…</div>';
    else if (BN.buoc === 1) {
      BN.dsNguoi = bnDsNguoi();
      if (D.coSo.length > 1) {
        h += '<div class="bn-cs">' + [{ ma: '', ten: 'Toàn trường' }].concat(D.coSo).map(function (c) {
          return '<button type="button" class="chip-loc' + (BN.cs === c.ma ? ' on' : '') + '" data-bn-cs="' + thoat(c.ma) + '">' + thoat(c.ten) + '</button>';
        }).join('') + '</div>';
      }
      h += '<input type="search" id="bn-tim" class="bn-tim" placeholder="🔍 Gõ vài chữ của tên…" value="' + thoat(BN.tim) + '" autocomplete="off">' +
        '<div id="bn-ds" class="bn-ds"></div>';
    } else if (BN.buoc === 2) {
      var hn = BN.hn, mai = ngayHocSau(hn);
      var hang = function (nhan, ngay) {
        return '<div class="bn-ngay"><div class="bn-ngay-ten"><b>' + nhan + '</b><small>' + thoat(tenNgay(ngay)) + '</small></div><div class="bn-ngay-nut">' +
          [['ca_ngay', 'Cả ngày'], ['sang', 'Sáng'], ['chieu', 'Chiều']].map(function (b) {
            return '<button type="button" class="bn-chon' + (b[0] === 'ca_ngay' ? ' chinh' : '') + '" data-bn-ngay="' + ngay + '" data-bn-buoi="' + b[0] + '">' + b[1] + '</button>';
          }).join('') + '</div></div>';
      };
      h += '<div class="bn-ai"><b>' + thoat(BN.nguoi.ho_ten) + '</b></div>' +
        '<div class="bn-nhan-nho">Lý do</div><div class="bn-ly">' + LY_DO_VANG.map(function (l) {
          return '<button type="button" class="chip-loc' + (BN.lyDo === l ? ' on' : '') + '" data-bn-ly="' + thoat(l) + '">' + thoat(l) + '</button>';
        }).join('') + '</div>' +
        (L().thuCuaNgay(hn) !== 8 ? hang('Hôm nay', hn) : '') + hang(L().thuCuaNgay(hn) === 8 ? 'Ngày mai' : (mai === congNgay(hn, 1) ? 'Ngày mai' : 'Ngày học sau'), mai) +
        (BN.khac
          ? '<div class="bn-khac"><label><span>Từ ngày</span><input type="date" id="bn-tu" class="tkb-chon" value="' + (BN.tuTam || congNgay(mai, 1)) + '"></label>' +
            '<label><span>Đến ngày</span><input type="date" id="bn-den" class="tkb-chon" value="' + (BN.denTam || '') + '"></label>' +
            '<label><span>Buổi</span><select id="bn-buoi-khac" class="tkb-chon"><option value="ca_ngay">Cả ngày</option><option value="sang">Buổi sáng</option><option value="chieu">Buổi chiều</option></select></label>' +
            '<button type="button" class="nut-chinh" data-bn="khac-tiep">Tiếp ›</button></div>'
          : '<button type="button" class="bn-chon bn-chon-khac" data-bn="khac">📅 Ngày khác / nghỉ nhiều ngày…</button>');
    } else if (BN.buoc === 3) {
      var kq = BN.kq = bnTinh();
      var nhan = BN.nguoi.ho_ten + ' · ' + BN.lyDo + ' · ' + tenBuoiVang(BN.buoi) + ' ' + tenNgay(BN.tu) + (BN.den && BN.den > BN.tu ? ' → ' + ngayVN(BN.den) : '');
      h += '<div class="bn-ai"><b>' + thoat(BN.nguoi.ho_ten) + '</b><small>' + thoat(nhan.slice(BN.nguoi.ho_ten.length + 3)) + '</small></div>';
      if (BN.loi) h += '<div class="hd-kiem do">' + thoat(BN.loi) + '</div>';
      var nutGhiNghi = !BN.v ? '<button type="button" class="dh-nut-nho bn-phu" data-bn="chi-nghi">Chỉ ghi nghỉ, bố trí sau</button>' : '';
      if (BN.ctx.nghi) {
        h += '<div class="hd-kiem xanh">🎌 ' + thoat(tenNgay(BN.tu)) + ' là ngày nghỉ (' + thoat(BN.ctx.nghi.ten || '') + ') — không có tiết.</div>';
        chan = !BN.v ? '<button type="button" class="nut-chinh bn-ghi" data-bn="chi-nghi">✓ Ghi nghỉ</button>' : '';
      } else if (!BN.ctx.dl) {
        h += '<div class="hd-kiem vang">Chưa có thời khóa biểu đã công bố cho ngày này — ghi nghỉ trước, bố trí sau khi có TKB.</div>';
        chan = !BN.v ? '<button type="button" class="nut-chinh bn-ghi" data-bn="chi-nghi">✓ Ghi nghỉ</button>' : '';
      } else if (!kq.ds.length) {
        h += '<div class="hd-kiem xanh">' + (kq.daCo && kq.daCo.length ? 'Các tiết ' + tenBuoiVang(BN.buoi) + ' đã có người dạy thay.' : 'Không có tiết nào ' + tenBuoiVang(BN.buoi) + ' — không cần người dạy thay.') + '</div>';
        chan = !BN.v ? '<button type="button" class="nut-chinh bn-ghi" data-bn="chi-nghi">✓ Ghi nghỉ</button>' : '<button type="button" class="nut-chinh bn-ghi" data-bn="dong">Xong</button>';
      } else {
        ['sang', 'chieu'].forEach(function (b) {
          var x = kq.buoi[b]; if (!x) return;
          var p = x.pa[x.i];
          // 8/10/2026 (thầy Chung: "không có phương án dạy thay khác?") — các phương án hiện thành THẺ để chọn,
          // không giấu sau nút "↻"; ghi rõ người dạy thay của từng phương án.
          var coTay = x.can.some(function (t) { return Object.prototype.hasOwnProperty.call(BN.chon, [t.buoi, t.tiet, t.lop].join('|')); });
          h += '<div class="bn-buoi"><div class="bn-buoi-dau"><b>' + (b === 'sang' ? '☀️ Buổi sáng' : '🌤️ Buổi chiều') + '</b><small>' + x.can.length + ' tiết cần người</small></div>';
          if (x.pa.length > 1) {
            h += '<div class="bn-nhan-nho" style="margin-top:2px">Chọn cách xếp (' + x.pa.length + ' phương án):</div><div class="bn-pa-chon">' + x.pa.map(function (pp, i) {
              var ten = [], da = {};
              pp.gan.forEach(function (g) { if (g.gv && !da[g.gv.nhan]) { da[g.gv.nhan] = 1; ten.push(g.gv.ten); } });
              return '<button type="button" class="bn-pa-the' + (i === x.i && !coTay ? ' on' : '') + '" data-bn-pa="' + b + '" data-i="' + i + '">' +
                '<b>' + (i === x.i && !coTay ? '✓ ' : '') + thoat(pp.tieuDe) + '</b><span>' + ten.map(thoat).join(', ') + '</span>' +
                '<small>' + (pp.lyDo || []).map(function (l) { return thoat(l.t); }).join(' · ') + '</small></button>';
            }).join('') + '</div>';
          } else if (p) h += '<div class="bn-pa-ten">Chỉ có 1 cách xếp hợp lệ · ' + (p.lyDo || []).map(function (l) { return thoat(l.t); }).join(' · ') + '</div>';
          if (coTay) h += '<div class="bn-nhan-nho">✏️ Đã đổi tay một số tiết.</div>';
          h += '<div class="bn-nhan-nho">👉 Chạm vào từng tiết để chọn người khác.</div>';
          kq.gan.filter(function (g) { return g.tiet.buoi === b; }).forEach(function (g) {
            var t = g.tiet;
            h += '<button type="button" class="bn-tiet' + (BN.moTiet === g.k ? ' mo' : '') + (g.gv ? '' : ' trong') + '" data-bn-tiet="' + thoat(g.k) + '">' +
              '<span class="dt-ki">' + kiHieuTiet(t.buoi, t.tiet) + '</span><span class="bn-lop"><b>' + thoat(t.lop) + '</b> · ' + thoat(t.mon) +
              (t.thayHo ? '<small>đang dạy thay cho ' + thoat(t.thayHo.gv_vang_ten || '') + '</small>' : '') + '</span>' +
              '<span class="bn-nguoi-thay">' + (g.gv ? thoat(g.gv.ten) + (g.gv.email ? '' : ' ⚠') : '<i>Lớp tự quản</i>') + ' <span class="bn-doi">▾</span></span></button>';
            if (BN.moTiet === g.k) h += bnVeUngVien(kq, g);
          });
          h += '</div>';
        });
        if (kq.daCo && kq.daCo.length) h += '<div class="bn-nhan-nho">Đã có người: ' + kq.daCo.map(function (x) { return kiHieuTiet(x.buoi, x.tiet) + ' ' + thoat(x.lop) + ' → ' + thoat(x.daPhan.gv_thay_ten || x.daPhan.gv_thay_nhan || 'tự quản'); }).join(' · ') + '</div>';
        if (kq.gan.some(function (g) { return g.gv && !g.gv.email; })) h += '<div class="bn-nhan-nho">⚠ = chưa có Gmail trong hệ thống, người này không nhận được nhắc trên app — gọi điện hoặc nhắn riêng.</div>';
        chan = '<button type="button" class="nut-chinh bn-ghi" data-bn="ghi"' + (BN.dangGhi ? ' disabled' : '') + '>' +
          (BN.dangGhi ? 'Đang ghi…' : '✓ ' + (BN.v ? 'Bố trí ' : 'Ghi nghỉ & bố trí ') + kq.gan.length + ' tiết') + '</button>' + nutGhiNghi;
      }
      if (kq.ngoai) h += '<div class="bn-nhan-nho">+ ' + kq.ngoai + ' tiết ở phân hiệu khác — PHT phân hiệu đó bố trí (hoặc chọn "Toàn trường" ở bước 1).</div>';
      if (BN.den && BN.den > BN.tu) h += '<div class="bn-nhan-nho">Nghỉ đến ' + ngayVN(BN.den) + '. Các ngày sau: thẻ <b>Báo nghỉ – Dạy thay</b> › chọn ngày › <b>⚡ Bố trí nhanh</b> (khung Việc cần xử lý sẽ nhắc).</div>';
    } else if (BN.buoc === 4) {
      var x4 = BN.xong;
      h += '<div class="hd-kiem xanh" style="margin-top:0">✅ ' + (x4.vangMoi ? 'Đã ghi ' + thoat(BN.nguoi.ho_ten) + ' nghỉ ' + tenBuoiVang(BN.buoi) + ' ' + ngayVN(BN.tu) + '. ' : '') +
        (x4.rows.length ? 'Đã bố trí ' + x4.rows.length + ' tiết.' : '') + (x4.trungVang ? ' (Người này đã có trong sổ vắng — không ghi thêm.)' : '') + '</div>';
      if (x4.rows.length) {
        h += '<div class="bn-tom">' + x4.rows.map(function (d) {
          return '<div><span class="dt-ki">' + kiHieuTiet(d.buoi, d.tiet) + '</span> ' + thoat(d.lop) + ' · ' + thoat(d.mon) + ' → <b>' + (d.gv_thay_ten ? thoat(d.gv_thay_ten) : '<i>lớp tự quản</i>') + '</b></div>';
        }).join('') + '</div>';
        chan = x4.daGui
          ? '<div class="hd-kiem xanh" style="margin:0 0 8px">📤 Đã gửi — người dạy thay bấm “Đã nhận” trên app là thầy cô thấy.</div><button type="button" class="nut-chinh bn-ghi" data-bn="dong">Xong</button>'
          : '<button type="button" class="nut-chinh bn-ghi" data-bn="zalo">📤 Gửi Zalo cho người dạy thay</button>' +
            '<div class="bn-phu-hang"><button type="button" class="dh-nut-nho" data-bn="doi-sau">✏️ Đổi người dạy thay</button><button type="button" class="dh-nut-nho" data-bn="dong">Để sau</button></div>';
      } else chan = '<button type="button" class="nut-chinh bn-ghi" data-bn="dong">Xong</button>';
    }
    h += '</div>' + (chan ? '<div class="bn-chan">' + chan + '</div>' : '') + '</div>';
    BN.el.innerHTML = h;
    if (BN.buoc === 1 && BN.ctx) {
      bnVeDs();
      var tim = BN.el.querySelector('#bn-tim');
      if (tim && !laDienThoai()) tim.focus();   // điện thoại: không bật bàn phím che danh sách
    }
    var mo = BN.el.querySelector('.bn-tiet.mo');
    if (mo && mo.scrollIntoView) mo.scrollIntoView({ block: 'nearest' });
  }
  function bnVeUngVien(kq, g) {
    // Bối cảnh tính cả các tiết khác đang chọn trong khung (tránh một người hai lớp cùng giờ)
    var tam = kq.gan.filter(function (y) { return y !== g && y.gv; }).map(function (y, i) {
      return { id: -500 - i, buoi: y.tiet.buoi, tiet: y.tiet.tiet, lop: y.tiet.lop, gv_thay_email: y.gv.email, gv_thay_nhan: y.gv.nhan };
    });
    var bc = Object.assign({}, kq.bc, { dayThay: kq.bc.dayThay.concat(tam) });
    var uv = L().ungVien(bc, g.tiet, boQuaCua(g.tiet)).slice(0, 6);
    return '<div class="bn-uv-ds">' + uv.map(function (u) {
      return '<button type="button" class="bn-uv' + (g.gv && g.gv.nhan === u.gv.nhan ? ' on' : '') + '" data-bn-gv="' + thoat(u.gv.nhan) + '"><b>' + thoat(u.gv.ten) + (u.gv.email ? '' : ' ⚠') + '</b>' +
        '<small>' + thoat((L().TEN_NHOM || {})[u.nhom] || '') + ' · ' + u.lyDo.filter(function (l) { return l.k === 'tot'; }).map(function (l) { return thoat(l.t); }).slice(0, 2).join(' · ') + '</small></button>';
    }).join('') + '<button type="button" class="bn-uv' + (!g.gv ? ' on' : '') + '" data-bn-gv=""><b>Không cần người (lớp tự quản)</b></button></div>';
  }
  function bnBam(e) {
    var t = e.target;
    if (t === BN.el) { BN.dong(); return; }   // chạm nền tối
    var b = t.closest ? t.closest('[data-bn],[data-bn-nguoi],[data-bn-cs],[data-bn-ly],[data-bn-ngay],[data-bn-pa],[data-bn-tiet],[data-bn-gv]') : null;
    if (!b) return;
    var a = b.getAttribute('data-bn');
    if (a === 'dong') { BN.dong(); return; }
    if (a === 'lui') { BN.buoc = BN.buoc === 3 ? 2 : 1; BN.loi = ''; if (BN.buoc === 1 || BN.buoc === 2) { if (BN.ctxNgay !== BN.hn) bnTai(BN.hn); else bnVe(); } return; }
    if (b.hasAttribute('data-bn-cs')) { BN.cs = b.getAttribute('data-bn-cs'); bnVe(); return; }
    if (b.hasAttribute('data-bn-nguoi')) { var x = BN.dsNguoi[+b.getAttribute('data-bn-nguoi')]; if (!x) return; BN.nguoi = x.c; BN.buoc = 2; bnVe(); return; }
    if (b.hasAttribute('data-bn-ly')) { BN.lyDo = b.getAttribute('data-bn-ly'); bnVe(); return; }
    if (b.hasAttribute('data-bn-ngay')) { bnSangBuoc3(b.getAttribute('data-bn-ngay'), '', b.getAttribute('data-bn-buoi')); return; }
    if (a === 'khac') { BN.khac = true; bnVe(); return; }
    if (a === 'khac-tiep') {
      var tu = (BN.el.querySelector('#bn-tu') || {}).value, den = (BN.el.querySelector('#bn-den') || {}).value, bu = (BN.el.querySelector('#bn-buoi-khac') || {}).value || 'ca_ngay';
      if (!/^\d{4}-\d{2}-\d{2}$/.test(tu || '')) { bao('Chọn ngày bắt đầu nghỉ.'); return; }
      if (den && den < tu) { bao('"Đến ngày" đang trước "Từ ngày" — chọn lại.'); return; }
      bnSangBuoc3(tu, den && den > tu ? den : '', bu); return;
    }
    if (b.hasAttribute('data-bn-pa')) { var bb = b.getAttribute('data-bn-pa'), kq = BN.kq, n = kq && kq.buoi[bb] ? kq.buoi[bb].pa.length : 1;
      BN.pa[bb] = b.hasAttribute('data-i') ? +b.getAttribute('data-i') : ((BN.pa[bb] || 0) + 1) % n;
      Object.keys(BN.chon).forEach(function (k) { if (k.indexOf(bb + '|') === 0) delete BN.chon[k]; });
      BN.moTiet = ''; bnVe(); return; }
    if (b.hasAttribute('data-bn-tiet')) { var k = b.getAttribute('data-bn-tiet'); BN.moTiet = BN.moTiet === k ? '' : k; bnVe(); return; }
    if (b.hasAttribute('data-bn-gv')) { BN.chon[BN.moTiet] = b.getAttribute('data-bn-gv'); BN.moTiet = ''; bnVe(); return; }
    // Sau khi ghi muốn đổi người: mở thẻ Dạy thay của ngày đó (mỗi tiết có nút Đổi)
    if (a === 'doi-sau') { var ng = BN.tu; BN.dong(); if (window.DAY_THAY) window.DAY_THAY.moKhung('bo-tri', ng); return; }
    if (a === 'ghi') { bnGhi(true); return; }
    if (a === 'chi-nghi') { bnGhi(false); return; }
    if (a === 'zalo') {
      guiZalo(BN.tu, BN.xong.rows, b).then(function (daGui) {
        if (!daGui) return;
        danhDauDaBao(BN.xong.rows).then(function () { BN.xong.daGui = true; bnVe(); taiLaiNen(); });
      });
    }
  }
  function bnSangBuoc3(tu, den, buoi) {
    BN.tu = tu; BN.den = den; BN.buoi = buoi || 'ca_ngay'; BN.buoc = 3; BN.chon = {}; BN.pa = {}; BN.moTiet = ''; BN.loi = '';
    if (BN.ctxNgay !== tu) bnTai(tu); else bnVe();
  }
  // Ghi sổ vắng (nếu là báo nghỉ mới) rồi bố trí. boTri = false → chỉ ghi nghỉ.
  function bnGhi(boTri) {
    if (BN.dangGhi) return;
    var kq = BN.kq || bnTinh();
    var gan = boTri ? kq.gan.map(function (g) { return { tiet: g.tiet, gv: g.gv }; }) : [];
    BN.dangGhi = true; BN.loi = ''; bnVe();
    var trungVang = false, vangMoi = false;
    var buocVang = BN.v ? Promise.resolve(BN.v) : ghiVangMoi().then(function (r) { trungVang = r.trung; vangMoi = !r.trung; return r.v; });
    buocVang.then(function (v) {
      BN.v = v;
      if (!gan.length) return [];
      var vang = (kq.vang || []).map(function (x) { return khoaNguoi(x) === khoaNguoi(v) ? Object.assign({}, x, { id: v.id }) : x; });
      return ghiDayThay(BN.tu, gan, v, BN.ctx, vang);
    }).then(function (rows) {
      BN.dangGhi = false; BN.xong = { rows: rows || [], vangMoi: vangMoi, trungVang: trungVang, daGui: false }; BN.buoc = 4;
      bnVe(); taiLaiNen();
    }).catch(function (e) {
      BN.dangGhi = false; BN.loi = (e && e.message) || String(e);
      if (BN.v) { bnTai(BN.tu); } else bnVe();
      taiLaiNen();
    });
  }
  // Báo nghỉ mới — soát trùng trước (rà 8/10/2026: báo tay rồi lại duyệt đơn → hai thẻ, số tiết nhân đôi)
  function ghiVangMoi() {
    var c = BN.nguoi, den = BN.den || BN.tu;
    var dong = { ngay: BN.tu, den_ngay: BN.den && BN.den > BN.tu ? BN.den : null, buoi: BN.buoi, ho_ten: c.ho_ten, email: c.email || null,
      co_so_ma: c.co_so_ma || null, ly_do: BN.lyDo, ghi_chu: 'Báo nghỉ nhanh (màn Dạy thay)', nguoi_ghi_id: (window.NGUOI_DUNG || {}).id || null };
    var trungVoi = function (ds) {
      return (ds || []).filter(function (v) {
        return khoaNguoi(v) === khoaNguoi(c) && v.ngay <= den && (v.den_ngay || v.ngay) >= BN.tu && (v.buoi === 'ca_ngay' || BN.buoi === 'ca_ngay' || v.buoi === BN.buoi);
      })[0];
    };
    if (!may()) {
      var cu = trungVoi(DEMO.vang.concat(DEMO.boMau ? [] : MAU_VANG.map(function (v) { return Object.assign({ ngay: BN.tu }, v); })));
      if (cu) return Promise.resolve({ v: cu, trung: true });
      var v = Object.assign({ id: -300 - DEMO.vang.length }, dong);
      DEMO.vang.push(v);
      return Promise.resolve({ v: v, trung: false });
    }
    if (!c.co_so_ma) return Promise.reject(new Error(c.ho_ten + ' chưa được gán điểm trường — sửa ở Quản trị › Tài khoản rồi báo lại.'));
    return may().from('gv_vang').select('id, ho_ten, email, co_so_ma, ly_do, buoi, ngay, den_ngay, de_xuat_id').eq('ho_ten', c.ho_ten).lte('ngay', den).limit(50).then(function (r) {
      var cu = r && !r.error ? trungVoi(r.data) : null;
      if (cu) return { v: cu, trung: true };
      return may().from('gv_vang').insert(dong).select('id, ho_ten, email, co_so_ma, ly_do, buoi, ngay, den_ngay, de_xuat_id').then(function (w) {
        if (w.error) throw new Error('Không ghi được báo nghỉ: ' + (/row-level|policy/i.test(w.error.message) ? 'thầy cô không phụ trách điểm trường của người này.' : w.error.message));
        return { v: w.data[0], trung: false };
      });
    });
  }
  // Làm mới màn đang mở phía sau khung (thẻ Dạy thay, khung Việc cần xử lý, lời nhắc)
  function taiLaiNen() {
    D.khoa = ''; NHAC.khoa = '';
    if (window.VIEC_NHANH && window.VIEC_NHANH.ve) window.VIEC_NHANH.ve(true);
    if (EL && document.body.contains(EL)) ve();
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
      (laPhuTrachNao() ? '<button class="dh-nut-nho" id="dt-in">📄 Xem &amp; tải Word</button>' : '') + '</div><div id="dt-ds-bang"><div class="the-thong-bao">Đang tải…</div></div>';
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
      // Lọc đúng phân hiệu đang xem — khớp với bản Word (rà 8/10/2026: danh sách lấy cả trường, Word lọc một điểm)
      ds = ds.filter(function (d) { return !D.cs || d.co_so_ma === D.cs; });
      if (!ds.length) { bang.innerHTML = '<div class="the-thong-bao">Không có tiết dạy thay nào ' + (D.cs ? 'ở ' + thoat(tenCoSo(D.cs)) + ' ' : '') + 'từ ' + ngayVN(D.dsTu) + ' đến ' + ngayVN(D.dsDen) + '.</div>'; return; }
      // Gộp theo GMAIL (một người hai tên gọi ở hai phân hiệu không bị tách); đếm riêng tiết đã qua và sắp tới
      var theoNguoi = {}, hnNay = homNayISO();
      ds.forEach(function (d) {
        if (!d.gv_thay_email && !d.gv_thay_nhan) return;
        var k = String(d.gv_thay_email || '').toLowerCase() || 'n:' + d.gv_thay_nhan;
        var x = theoNguoi[k] = theoNguoi[k] || { ten: d.gv_thay_ten || d.gv_thay_nhan, da: 0, sap: 0 };
        if (d.ngay <= hnNay) x.da++; else x.sap++;
      });
      var tuQuan = ds.filter(function (d) { return !d.gv_thay_email && !d.gv_thay_nhan; }).length;
      bang.innerHTML =
        '<div class="dh-tieu-de">Tổng hợp theo người dạy thay · ' + ngayVN(D.dsTu) + ' → ' + ngayVN(D.dsDen) + (D.cs ? ' · ' + thoat(tenCoSo(D.cs)) : '') + '</div>' +
        '<div class="dt-tong-nguoi">' + Object.keys(theoNguoi).map(function (k) { return theoNguoi[k]; }).sort(function (a, b) { return (b.da + b.sap) - (a.da + a.sap) || String(a.ten).localeCompare(b.ten, 'vi'); }).map(function (x) {
          return '<span><b>' + thoat(x.ten) + '</b> ' + x.da + ' tiết' + (x.sap ? ' <small>+ ' + x.sap + ' sắp tới</small>' : '') + '</span>';
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
      if (nutIn) nutIn.onclick = function () { inDanhSach(); };
    }).catch(function (e) { bang.innerHTML = '<div class="hd-kiem do">Không tải được: ' + thoat((e && e.message) || e) + '</div>'; });
  }

  // 30/9/2026: bản in thô (cửa sổ in, không thể thức) → khung xem trước + Word thể thức NĐ 30
  // (js/bieu-mau.js): chi tiết từng tiết + tổng hợp số tiết từng người có cột ký nhận.
  function inDanhSach() {
    if (!laPhuTrachNao()) { bao('Chỉ Ban giám hiệu hoặc người phụ trách điểm trường mới xuất được danh sách dạy thay.'); return; }
    if (!window.BIEU_MAU) { bao('Chưa tải được bộ biểu mẫu — tải lại trang.'); return; }
    window.BIEU_MAU.dayThay({ tu: D.dsTu, den: D.dsDen, coSo: D.coSo, cs: D.cs || '' });
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
  var NHAC = { khoa: '', html: '', ids: [], luc: 0 };
  function ganNhac(vung) {
    if (!vung || !may()) return;
    var e = toiEmail(), hn = homNayISO(), khoa = e + '|' + hn;
    if (!e) { vung.innerHTML = ''; return; }
    // Nhớ tối đa 60 giây (rà 8/10/2026: trước nhớ cả ngày — bị đổi/huỷ phân công vẫn thấy tin cũ)
    if (NHAC.khoa === khoa && Date.now() - NHAC.luc < 60000) { vung.innerHTML = NHAC.html; ganNutNhac(vung); return; }
    NHAC.khoa = khoa; NHAC.luc = Date.now();
    if (NHAC.html) { vung.innerHTML = NHAC.html; ganNutNhac(vung); }
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

  window.DAY_THAY = { ve: ve, ganNhac: ganNhac, tomTat: tomTat, baoNhanh: function (o) { BN.mo(o); }, boTriDon: boTriDon, moNgay: function (ngay) { D.ngay = ngay || homNayISO(); D.khung = 'bo-tri'; },
    // Mở thẳng một khung của thẻ Dạy thay từ nơi khác (trang chủ, hàng Việc hằng ngày)
    moKhung: function (khung, ngay) {
      // 8/10/2026: 'bao-nghi' mở thẳng khung Báo nghỉ nhanh ngay tại chỗ — không chuyển thẻ
      if (khung === 'bao-nghi') { BN.mo({ ngay: ngay }); return; }
      D.khung = khung || 'bo-tri';
      if (D.khung === 'bo-tri') D.ngay = ngay || homNayISO();
      D.khungChon = true;
      // 29/9/2026: thẻ riêng Điều hành › Báo nghỉ – Dạy thay (trước: Thời khóa biểu › Dạy thay)
      if (window.DH) window.DH.moTab('daythay');
    } };
})();
