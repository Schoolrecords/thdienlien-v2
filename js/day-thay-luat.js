// ============================================================
// day-thay-luat.js — LUẬT GỢI Ý DẠY THAY (thuần, không DOM, không máy chủ)
//
// Giai đoạn 2 của module thời khóa biểu (sổ dự án 92, thầy Chung duyệt 14/9/2026).
// Bộ luật MANG NGUYÊN từ app TKB riêng (TKB_App/src/index.html ungVienThay ~4218,
// phuongAnThay ~4311, xungDotDayThay ~4394) — đã chạy thật ở Diễn Liên:
//
// LOẠI HẲN (không đưa vào gợi ý, không phải xếp cuối):
//   1. chính người vắng
//   2. cũng vắng buổi đó
//   3. đang có tiết đúng giờ đó
//   4. đã nhận dạy thay giờ đó ở lớp khác
//   5. buổi đó dạy ở ĐIỂM TRƯỜNG KHÁC (tính cả tiết thay đã nhận)
//   6. đã đủ GIOI_HAN_BUOI tiết trong buổi (tiết chính + tiết thay)
//   7. (29/9/2026) người của PHÂN HIỆU KHÁC — mọi tiết trong TKB của họ đều ở cơ sở khác lớp cần thay
//   (luật "đăng ký bận cố định" của app cũ chưa có dữ liệu bên này — bỏ)
//
// XẾP THEO NHÓM (thầy Chung 29/9/2026 — nhóm trên LUÔN đứng trước nhóm dưới):
//   1 Cùng khối · đang có tiết buổi đó (chỉ trống đúng tiết cần thay — đã ở trường)
//   2 Khác khối · đang có tiết buổi đó
//   3 Cùng khối · KHÔNG có tiết buổi đó (phải đến trường — chỉ khi hết phương án trên)
//   4 Khác khối · KHÔNG có tiết buổi đó
//   5 Cán bộ quản lý (dự phòng)
//   "Cùng khối" = đang dạy hoặc chủ nhiệm một lớp cùng khối với lớp cần thay.
// TRONG MỘT NHÓM, CHẤM ĐIỂM (chỉ để xếp; màn hình hiện LÝ DO, không hiện điểm):
//   +40 chủ nhiệm lớp đó · +30 đang dạy lớp đó · +25 dạy cùng môn · +10 buổi đó đang ở cùng điểm trường
//   −3 mỗi tiết đã dạy trong ngày · −4 mỗi tiết đã thay trong tháng (chia đều)
//
// Chạy được trong Node: thdienlien-v2-tailieu/thu-day-thay-luat.js
// ============================================================
(function (goc) {
  'use strict';

  var GIOI_HAN_BUOI = 5;

  function khongDau(s) {
    return String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().trim().replace(/\s+/g, ' ');
  }
  function chuanMon(s) { return khongDau(s).replace(/[^a-z0-9&]/g, ''); }
  function khoiCua(lop) { var m = String(lop || '').match(/^\d+/); return m ? m[0] : ''; }
  function thuCuaNgay(iso) {
    var p = String(iso).split('-');
    var g = new Date(+p[0], +p[1] - 1, +p[2]).getDay();
    return g === 0 ? 8 : g + 1;
  }
  function email(s) { return String(s || '').trim().toLowerCase(); }

  // ════════════════════════════════════════════════════════════
  // DỰNG BỐI CẢNH MỘT NGÀY
  //   tiet     : tkb_tiet của phiên bản áp dụng [{lop,thu,buoi,tiet,mon,gv_nhan,gv_email}]
  //   gv       : tkb_giao_vien [{gv_nhan, ho_ten, email, lop_cn}]
  //   lopCoSo  : { '1A': 'CS01' }
  //   vang     : gv_vang của ngày [{id, ho_ten, email, buoi:'sang'|'chieu'|'ca_ngay', co_so_ma, ly_do}]
  //   dayThay  : day_thay (chưa huỷ) của NGÀY [{ngay,buoi,tiet,lop,gv_thay_email,gv_vang_email,...}]
  //   dayThayThang : day_thay (chưa huỷ) của cả THÁNG — để chia đều
  //   quanLy   : { email: true } — cán bộ quản lý (xếp cuối)
  // ════════════════════════════════════════════════════════════
  function boiCanh(o) {
    var thu = thuCuaNgay(o.ngay);
    var dsGV = (o.gv || []).map(function (g) {
      return { nhan: g.gv_nhan, ten: g.ho_ten || g.gv_nhan, email: email(g.email), lopCN: String(g.lop_cn || '') };
    });
    var theoNhan = {};
    dsGV.forEach(function (g) { theoNhan[g.nhan] = g; });
    // Tiết trong TKB mà không có dòng giáo viên (tệp thiếu PCGD) — vẫn dựng người từ tên gọi
    (o.tiet || []).forEach(function (x) {
      if (x.gv_nhan && !theoNhan[x.gv_nhan]) {
        theoNhan[x.gv_nhan] = { nhan: x.gv_nhan, ten: x.gv_nhan, email: email(x.gv_email), lopCN: '' };
        dsGV.push(theoNhan[x.gv_nhan]);
      }
    });
    var lichNgay = (o.tiet || []).filter(function (x) { return +x.thu === thu; });
    var tatCa = o.tiet || [];
    var monCua = {}, lopCua = {}, khoiCuaGV = {}, csCuaGV = {};
    var lopCoSo = o.lopCoSo || {};
    tatCa.forEach(function (x) {
      if (!x.gv_nhan) return;
      (monCua[x.gv_nhan] = monCua[x.gv_nhan] || {})[chuanMon(x.mon)] = 1;
      (lopCua[x.gv_nhan] = lopCua[x.gv_nhan] || {})[x.lop] = 1;
      (khoiCuaGV[x.gv_nhan] = khoiCuaGV[x.gv_nhan] || {})[khoiCua(x.lop)] = 1;
      if (lopCoSo[x.lop]) (csCuaGV[x.gv_nhan] = csCuaGV[x.gv_nhan] || {})[lopCoSo[x.lop]] = 1;
    });
    // Lớp chủ nhiệm cũng tính "cùng khối" (GVCN có thể không dạy môn nào ở khối khác)
    dsGV.forEach(function (g) {
      String(g.lopCN || '').split(/\s*,\s*/).filter(Boolean).forEach(function (l) {
        (khoiCuaGV[g.nhan] = khoiCuaGV[g.nhan] || {})[khoiCua(l)] = 1;
      });
    });
    return {
      ngay: o.ngay, thu: thu, dsGV: dsGV, theoNhan: theoNhan, lichNgay: lichNgay,
      lopCoSo: o.lopCoSo || {}, vang: o.vang || [], dayThay: (o.dayThay || []).filter(function (d) { return d.trang_thai !== 'huy'; }),
      dayThayThang: (o.dayThayThang || []).filter(function (d) { return d.trang_thai !== 'huy'; }),
      quanLy: o.quanLy || {}, monCua: monCua, lopCua: lopCua, khoiCuaGV: khoiCuaGV, csCuaGV: csCuaGV,
      gioiHan: o.gioiHan || GIOI_HAN_BUOI
    };
  }

  // Người trong TKB ứng với một dòng sổ vắng: email trước, rồi họ tên bỏ dấu (duy nhất)
  function gvCuaVang(bc, v) {
    var e = email(v.email);
    if (e) {
      var theoEmail = bc.dsGV.filter(function (g) { return g.email === e; });
      if (theoEmail.length) return theoEmail;
    }
    var t = khongDau(String(v.ho_ten || '').replace(/\s+(HT|PHT|TPT)$/i, ''));
    var theoTen = bc.dsGV.filter(function (g) { return khongDau(String(g.ten).replace(/\s+(HT|PHT|TPT)$/i, '')) === t; });
    return theoTen.length === 1 ? theoTen : [];
  }
  function vangBuoi(v, buoi) { return v.buoi === 'ca_ngay' || v.buoi === buoi; }
  function gvDangVang(bc, g, buoi) {
    return bc.vang.some(function (v) {
      return vangBuoi(v, buoi) && gvCuaVang(bc, v).some(function (x) { return x.nhan === g.nhan; });
    });
  }

  // Người dạy thay của dòng day_thay d có đang vắng buổi đó không
  function nguoiThayVang(bc, d) {
    if (!d || (!d.gv_thay_email && !d.gv_thay_nhan)) return false;
    var g = bc.dsGV.filter(function (y) { return laNguoi(y, d.gv_thay_email, d.gv_thay_nhan); })[0];
    return !!g && gvDangVang(bc, g, d.buoi);
  }

  // ── Các tiết cần người thay của MỘT dòng sổ vắng ──
  //   · tiết của chính người vắng theo TKB (daPhan = dòng day_thay đã có, thayVang = người thay ấy cũng vắng)
  //   · tiết người vắng ĐANG DẠY THAY cho người khác (thayHo = dòng day_thay đó) — rà 8/10/2026: trước đây
  //     A được phân thay 2B rồi chính A xin nghỉ thì tiết 2B vẫn ghi tên A, không ai biết lớp bỏ trống.
  function tietCanThay(bc, v) {
    var ds = gvCuaVang(bc, v), nhan = {};
    ds.forEach(function (g) { nhan[g.nhan] = 1; });
    var ra = bc.lichNgay.filter(function (x) { return nhan[x.gv_nhan] && vangBuoi(v, x.buoi); })
      .map(function (x) {
        var da = bc.dayThay.filter(function (d) { return d.buoi === x.buoi && +d.tiet === +x.tiet && d.lop === x.lop; })[0] || null;
        return { lop: x.lop, buoi: x.buoi, tiet: +x.tiet, mon: x.mon, gvNhan: x.gv_nhan, daPhan: da, coSo: bc.lopCoSo[x.lop] || '',
          thayVang: !!da && nguoiThayVang(bc, da) };
      });
    bc.dayThay.forEach(function (d) {
      if (!vangBuoi(v, d.buoi) || !ds.some(function (g) { return laNguoi(g, d.gv_thay_email, d.gv_thay_nhan); })) return;
      ra.push({ lop: d.lop, buoi: d.buoi, tiet: +d.tiet, mon: d.mon || '', gvNhan: d.gv_vang_nhan || '', daPhan: null,
        coSo: d.co_so_ma || bc.lopCoSo[d.lop] || '', thayHo: d });
    });
    return ra.sort(function (a, b) { return (a.buoi === b.buoi ? 0 : a.buoi === 'sang' ? -1 : 1) || a.tiet - b.tiet || String(a.lop).localeCompare(b.lop); });
  }

  // ── Ứng viên cho một tiết. boQua = [id day_thay đang sửa] ──
  function ungVien(bc, o, boQua) {
    boQua = boQua || [];
    var dt = bc.dayThay.filter(function (d) { return boQua.indexOf(d.id) < 0; });
    var csLop = bc.lopCoSo[o.lop] || '';
    var ra = [];
    bc.dsGV.forEach(function (g) {
      if (g.nhan === o.gvNhan) return;                                               // 1
      if (gvDangVang(bc, g, o.buoi)) return;                                         // 2
      var lichBuoi = bc.lichNgay.filter(function (x) { return x.gv_nhan === g.nhan && x.buoi === o.buoi; });
      if (lichBuoi.some(function (x) { return +x.tiet === +o.tiet; })) return;       // 3
      var thayBuoi = dt.filter(function (d) { return d.buoi === o.buoi && laNguoi(g, d.gv_thay_email, d.gv_thay_nhan); });
      if (thayBuoi.some(function (d) { return +d.tiet === +o.tiet; })) return;       // 4
      var csBuoi = {};
      lichBuoi.forEach(function (x) { csBuoi[bc.lopCoSo[x.lop] || ''] = 1; });
      thayBuoi.forEach(function (d) { csBuoi[bc.lopCoSo[d.lop] || ''] = 1; });
      var dsCS = Object.keys(csBuoi).filter(Boolean);
      if (csLop && dsCS.length && dsCS.some(function (c) { return c !== csLop; })) return; // 5
      if (lichBuoi.length + thayBuoi.length >= bc.gioiHan) return;                  // 6
      var csGV = Object.keys(bc.csCuaGV[g.nhan] || {});
      if (csLop && csGV.length && csGV.indexOf(csLop) < 0) return;                  // 7 phân hiệu khác

      var coBuoi = lichBuoi.length + thayBuoi.length > 0;
      var khoi = khoiCua(o.lop), cungKhoi = !!(khoi && bc.khoiCuaGV[g.nhan] && bc.khoiCuaGV[g.nhan][khoi]);
      var laQL = !!(g.email && bc.quanLy[g.email]);
      var nhom = laQL ? 5 : coBuoi ? (cungKhoi ? 1 : 2) : (cungKhoi ? 3 : 4);
      var diem = 0, lyDo = [];
      if (cungKhoi) lyDo.push({ t: 'Cùng khối ' + khoi, k: 'tot' });
      if (coBuoi) lyDo.push({ t: 'Có tiết ' + (o.buoi === 'sang' ? 'buổi sáng' : 'buổi chiều') + ' — đang ở trường', k: 'tot' });
      else lyDo.push({ t: 'Không có tiết buổi này — phải đến trường', k: 'canh' });
      if (csLop && dsCS.length && dsCS.indexOf(csLop) >= 0) diem += 10;
      if (g.lopCN && g.lopCN.split(/\s*,\s*/).indexOf(o.lop) >= 0) { diem += 40; lyDo.push({ t: 'Chủ nhiệm ' + o.lop, k: 'tot' }); }
      else if (bc.lopCua[g.nhan] && bc.lopCua[g.nhan][o.lop]) { diem += 30; lyDo.push({ t: 'Đang dạy ' + o.lop, k: 'tot' }); }
      if (bc.monCua[g.nhan] && bc.monCua[g.nhan][chuanMon(o.mon)]) { diem += 25; lyDo.push({ t: 'Dạy ' + o.mon, k: 'tot' }); }
      var soNgay = bc.lichNgay.filter(function (x) { return x.gv_nhan === g.nhan; }).length;
      diem -= 3 * soNgay;
      lyDo.push({ t: 'Hôm nay ' + soNgay + ' tiết', k: 'xam' });
      var soThang = bc.dayThayThang.filter(function (d) { return laNguoi(g, d.gv_thay_email, d.gv_thay_nhan); }).length;
      diem -= 4 * soThang;
      lyDo.push({ t: 'Tháng này thay ' + soThang + ' tiết', k: soThang >= 4 ? 'canh' : 'xam' });
      if (laQL) lyDo.push({ t: 'Cán bộ quản lý — dự phòng', k: 'canh' });
      ra.push({ gv: g, diem: diem, nhom: nhom, lyDo: lyDo, soNgay: soNgay, soThang: soThang, csBuoi: dsCS });
    });
    ra.sort(function (a, b) { return a.nhom - b.nhom || b.diem - a.diem || String(a.gv.ten).localeCompare(b.gv.ten, 'vi'); });
    return ra;
  }
  var TEN_NHOM = { 1: 'Cùng khối · đang có tiết buổi này', 2: 'Khác khối · đang có tiết buổi này',
    3: 'Cùng khối · phải đến trường', 4: 'Khác khối · phải đến trường', 5: 'Cán bộ quản lý (dự phòng)' };
  function laNguoi(g, e, nhan) { return (g.email && email(e) === g.email) || (!!nhan && nhan === g.nhan); }

  // ── PHƯƠNG ÁN DẠY THAY cho các tiết còn trống của MỘT người vắng trong MỘT buổi: tối đa 3 ──
  // (29/9/2026 thầy Chung: ưu tiên cùng khối, GV đang có tiết trong buổi; hết phương án mới gọi GV không
  //  có tiết buổi đó đến dạy.) Mỗi phương án phủ TRỌN các tiết còn trống, không tự xung đột:
  //   · "Phương án đề xuất": từng tiết lấy người xếp đầu (theo nhóm) CÒN hợp lệ sau các tiết đã gán
  //   · "Phương án thay thế": như trên nhưng tránh những người phương án đề xuất đã dùng (khi còn người)
  //   · "Một người dạy cả buổi": chỉ khi có người hợp lệ cho mọi tiết — lớp đỡ xáo trộn
  // Mỗi phương án kèm đếm: bao nhiêu tiết nhóm 1–2 (đang ở trường), bao nhiêu người phải đến trường.
  function ganTham(bc, can, boQua, tranh) {
    var gan = [], daGan = [];
    for (var j = 0; j < can.length; j++) {
      var bcTam = Object.assign({}, bc, { dayThay: bc.dayThay.concat(daGan) });
      var ds = ungVien(bcTam, can[j], boQua);
      var u = (tranh ? ds.filter(function (x) { return !tranh[x.gv.nhan]; })[0] : null) || ds[0];
      if (!u) return null;
      gan.push({ tiet: can[j], gv: u.gv, nhom: u.nhom, lyDo: u.lyDo });
      daGan.push({ id: -1 - j, buoi: can[j].buoi, tiet: can[j].tiet, lop: can[j].lop, gv_thay_email: u.gv.email, gv_thay_nhan: u.gv.nhan });
    }
    return gan;
  }
  function tomTatPA(gan) {
    var den = {}, oTruong = 0;
    gan.forEach(function (x) { if (x.nhom <= 2) oTruong++; else den[x.gv.nhan] = 1; });
    var ly = [];
    ly.push({ t: oTruong + '/' + gan.length + ' tiết do người đang ở trường dạy', k: oTruong === gan.length ? 'tot' : 'xam' });
    var soDen = Object.keys(den).length;
    ly.push(soDen ? { t: soDen + ' người phải đến trường', k: 'canh' } : { t: 'Không ai phải đến thêm', k: 'tot' });
    var ck = gan.filter(function (x) { return x.nhom === 1 || x.nhom === 3; }).length;
    if (ck) ly.push({ t: ck + ' tiết cùng khối', k: 'tot' });
    return ly;
  }
  function khoaGan(gan) { return gan.map(function (x) { return x.gv.nhan; }).join('|'); }
  function phuongAn(bc, dsTiet, boQua) {
    var can = dsTiet.filter(function (x) { return !x.daPhan; });
    if (!can.length) return [];
    var ra = [], da = {};
    var them = function (tieuDe, gan, loai) {
      if (!gan || da[khoaGan(gan)]) return;
      da[khoaGan(gan)] = 1;
      ra.push({ loai: loai, tieuDe: tieuDe, gan: gan, lyDo: tomTatPA(gan) });
    };
    var pa1 = ganTham(bc, can, boQua, null);
    them('Phương án đề xuất', pa1, 'de-xuat');
    if (pa1) {
      var dung = {}; pa1.forEach(function (x) { dung[x.gv.nhan] = 1; });
      them('Phương án thay thế', ganTham(bc, can, boQua, dung), 'thay-the');
    }
    if (can.length > 1) {
      // Một người cho mọi tiết: giao các danh sách ứng viên, chọn người nhóm tốt nhất (tổng nhóm nhỏ nhất)
      var theoTiet = can.map(function (x) { return ungVien(bc, x, boQua); });
      var chung = {};
      theoTiet[0].forEach(function (u) { chung[u.gv.nhan] = { gv: u.gv, tong: u.nhom * 1000 - u.diem, ds: [u] }; });
      for (var i = 1; i < theoTiet.length; i++) {
        var co = {};
        theoTiet[i].forEach(function (u) { var c = chung[u.gv.nhan]; if (c) { c.tong += u.nhom * 1000 - u.diem; c.ds.push(u); co[u.gv.nhan] = c; } });
        chung = co;
      }
      var tot = Object.keys(chung).map(function (k) { return chung[k]; }).sort(function (a, b) { return a.tong - b.tong; })[0];
      if (tot) them(tot.gv.ten + ' dạy cả ' + can.length + ' tiết', can.map(function (x, k) { return { tiet: x, gv: tot.gv, nhom: tot.ds[k].nhom, lyDo: tot.ds[k].lyDo }; }), 'mot-nguoi');
    }
    return ra;
  }

  // ── Soát xung đột ngay trước khi ghi (dữ liệu có thể đã đổi từ lúc gợi ý) ──
  // ds = [{buoi, tiet, lop, gv_thay_email, gv_thay_nhan}]
  function xungDot(bc, ds, boQua) {
    boQua = boQua || [];
    var loi = [];
    var dt = bc.dayThay.filter(function (d) { return boQua.indexOf(d.id) < 0; });
    ds.forEach(function (x, i) {
      if (!x.gv_thay_email && !x.gv_thay_nhan) return;   // lớp tự quản
      var g = bc.dsGV.filter(function (y) { return laNguoi(y, x.gv_thay_email, x.gv_thay_nhan); })[0];
      var ten = g ? g.ten : (x.gv_thay_email || x.gv_thay_nhan);
      if (ds.some(function (y, j) { return j < i && y.buoi === x.buoi && +y.tiet === +x.tiet && ((y.gv_thay_email && y.gv_thay_email === x.gv_thay_email) || (y.gv_thay_nhan && y.gv_thay_nhan === x.gv_thay_nhan)); }))
        loi.push(ten + ' được phân hai lớp cùng tiết ' + x.tiet);
      if (!g) return;
      if (gvDangVang(bc, g, x.buoi)) loi.push(ten + ' đang vắng buổi này');
      if (bc.lichNgay.some(function (y) { return y.gv_nhan === g.nhan && y.buoi === x.buoi && +y.tiet === +x.tiet; }))
        loi.push(ten + ' đang có tiết ' + (x.buoi === 'sang' ? 'S' : 'C') + x.tiet + ' theo thời khóa biểu');
      if (dt.some(function (d) { return d.buoi === x.buoi && +d.tiet === +x.tiet && d.lop !== x.lop && laNguoi(g, d.gv_thay_email, d.gv_thay_nhan); }))
        loi.push(ten + ' đã nhận dạy thay lớp khác tiết ' + (x.buoi === 'sang' ? 'S' : 'C') + x.tiet);
    });
    return loi;
  }

  // ── Văn bản gửi Zalo ──
  function vanBanZalo(ngay, dong, tenTruong) {
    var p = String(ngay).split('-');
    var thu = thuCuaNgay(ngay);
    var tenThu = { 2: 'Thứ Hai', 3: 'Thứ Ba', 4: 'Thứ Tư', 5: 'Thứ Năm', 6: 'Thứ Sáu', 7: 'Thứ Bảy', 8: 'Chủ nhật' }[thu];
    var h = ['📋 BỐ TRÍ DẠY THAY — ' + tenThu + ', ' + p[2] + '/' + p[1] + '/' + p[0] + (tenTruong ? '\n' + tenTruong : '')];
    ['sang', 'chieu'].forEach(function (b) {
      var d = dong.filter(function (x) { return x.buoi === b; }).sort(function (a, c) { return a.tiet - c.tiet || String(a.lop).localeCompare(c.lop); });
      if (!d.length) return;
      h.push('\n' + (b === 'sang' ? '☀️ Buổi sáng' : '🌤️ Buổi chiều'));
      d.forEach(function (x) {
        h.push('• Tiết ' + x.tiet + ' · ' + x.lop + ' · ' + x.mon + ': ' +
          (x.gv_thay_ten || x.gv_thay_nhan ? (x.gv_thay_ten || x.gv_thay_nhan) : 'lớp tự quản') +
          (x.gv_vang_ten ? ' (thay ' + x.gv_vang_ten + ')' : ''));
      });
    });
    h.push('\nThầy cô được phân vui lòng xác nhận. Trân trọng!');
    return h.join('\n');
  }

  var API = { GIOI_HAN_BUOI: GIOI_HAN_BUOI, TEN_NHOM: TEN_NHOM, thuCuaNgay: thuCuaNgay, boiCanh: boiCanh, gvCuaVang: gvCuaVang,
    tietCanThay: tietCanThay, ungVien: ungVien, phuongAn: phuongAn, xungDot: xungDot, vanBanZalo: vanBanZalo,
    khongDau: khongDau, vangBuoi: vangBuoi, nguoiThayVang: nguoiThayVang };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (goc) goc.DAY_THAY_LUAT = API;
})(typeof window !== 'undefined' ? window : null);
