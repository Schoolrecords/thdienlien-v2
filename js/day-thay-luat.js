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
//   (luật 7 của app cũ "đăng ký bận cố định" chưa có dữ liệu bên này — bỏ)
// CHẤM ĐIỂM (chỉ để xếp thứ tự; màn hình hiện LÝ DO, không hiện điểm):
//   +50 buổi đó đang ở cùng điểm trường · +40 chủ nhiệm lớp đó · +30 đang dạy lớp đó
//   +25 dạy cùng môn · +15 dạy cùng khối · −3 mỗi tiết đã dạy trong ngày
//   −4 mỗi tiết đã thay trong tháng (chia đều) · −200 cán bộ quản lý (dự phòng)
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
    var monCua = {}, lopCua = {}, khoiCuaGV = {};
    tatCa.forEach(function (x) {
      if (!x.gv_nhan) return;
      (monCua[x.gv_nhan] = monCua[x.gv_nhan] || {})[chuanMon(x.mon)] = 1;
      (lopCua[x.gv_nhan] = lopCua[x.gv_nhan] || {})[x.lop] = 1;
      (khoiCuaGV[x.gv_nhan] = khoiCuaGV[x.gv_nhan] || {})[khoiCua(x.lop)] = 1;
    });
    return {
      ngay: o.ngay, thu: thu, dsGV: dsGV, theoNhan: theoNhan, lichNgay: lichNgay,
      lopCoSo: o.lopCoSo || {}, vang: o.vang || [], dayThay: (o.dayThay || []).filter(function (d) { return d.trang_thai !== 'huy'; }),
      dayThayThang: (o.dayThayThang || []).filter(function (d) { return d.trang_thai !== 'huy'; }),
      quanLy: o.quanLy || {}, monCua: monCua, lopCua: lopCua, khoiCuaGV: khoiCuaGV,
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

  // ── Các tiết cần người thay của MỘT dòng sổ vắng ──
  function tietCanThay(bc, v) {
    var ds = gvCuaVang(bc, v), nhan = {};
    ds.forEach(function (g) { nhan[g.nhan] = 1; });
    return bc.lichNgay.filter(function (x) { return nhan[x.gv_nhan] && vangBuoi(v, x.buoi); })
      .sort(function (a, b) { return (a.buoi === b.buoi ? 0 : a.buoi === 'sang' ? -1 : 1) || a.tiet - b.tiet || String(a.lop).localeCompare(b.lop); })
      .map(function (x) {
        var da = bc.dayThay.filter(function (d) { return d.buoi === x.buoi && +d.tiet === +x.tiet && d.lop === x.lop; })[0] || null;
        return { lop: x.lop, buoi: x.buoi, tiet: +x.tiet, mon: x.mon, gvNhan: x.gv_nhan, daPhan: da, coSo: bc.lopCoSo[x.lop] || '' };
      });
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

      var diem = 0, lyDo = [];
      if (csLop && dsCS.length && dsCS.indexOf(csLop) >= 0) { diem += 50; lyDo.push({ t: 'Cùng điểm trường', k: 'tot' }); }
      else if (!lichBuoi.length && !thayBuoi.length) lyDo.push({ t: 'Rảnh cả buổi', k: 'tot' });
      if (g.lopCN && g.lopCN.split(/\s*,\s*/).indexOf(o.lop) >= 0) { diem += 40; lyDo.push({ t: 'Chủ nhiệm ' + o.lop, k: 'tot' }); }
      else if (bc.lopCua[g.nhan] && bc.lopCua[g.nhan][o.lop]) { diem += 30; lyDo.push({ t: 'Đang dạy ' + o.lop, k: 'tot' }); }
      if (bc.monCua[g.nhan] && bc.monCua[g.nhan][chuanMon(o.mon)]) { diem += 25; lyDo.push({ t: 'Dạy ' + o.mon, k: 'tot' }); }
      if (bc.khoiCuaGV[g.nhan] && bc.khoiCuaGV[g.nhan][khoiCua(o.lop)]) { diem += 15; lyDo.push({ t: 'Cùng khối ' + khoiCua(o.lop), k: 'tot' }); }
      var soNgay = bc.lichNgay.filter(function (x) { return x.gv_nhan === g.nhan; }).length;
      diem -= 3 * soNgay;
      lyDo.push({ t: 'Hôm nay ' + soNgay + ' tiết', k: 'xam' });
      var soThang = bc.dayThayThang.filter(function (d) { return laNguoi(g, d.gv_thay_email, d.gv_thay_nhan); }).length;
      diem -= 4 * soThang;
      lyDo.push({ t: 'Tháng này thay ' + soThang + ' tiết', k: soThang >= 4 ? 'canh' : 'xam' });
      if (g.email && bc.quanLy[g.email]) { diem -= 200; lyDo.push({ t: 'Cán bộ quản lý', k: 'canh' }); }
      ra.push({ gv: g, diem: diem, lyDo: lyDo, soNgay: soNgay, soThang: soThang, csBuoi: dsCS });
    });
    ra.sort(function (a, b) { return b.diem - a.diem || String(a.gv.ten).localeCompare(b.gv.ten, 'vi'); });
    return ra;
  }
  function laNguoi(g, e, nhan) { return (g.email && email(e) === g.email) || (!!nhan && nhan === g.nhan); }

  // ── Phương án cho cả một buổi của một người vắng: tối đa 3 ──
  // Ưu tiên MỘT người thay trọn buổi (lớp đỡ xáo trộn); không ai trống trọn
  // buổi thì ghép từng tiết người điểm cao nhất, và nói rõ là ghép.
  function phuongAn(bc, dsTiet, boQua) {
    var can = dsTiet.filter(function (x) { return !x.daPhan; });
    if (!can.length) return [];
    var theoTiet = can.map(function (x) { return ungVien(bc, x, boQua); });
    var chung = {};
    theoTiet[0].forEach(function (u) { chung[u.gv.nhan] = { gv: u.gv, diem: u.diem, lyDo: u.lyDo }; });
    for (var i = 1; i < theoTiet.length; i++) {
      var co = {};
      theoTiet[i].forEach(function (u) { if (chung[u.gv.nhan]) { co[u.gv.nhan] = chung[u.gv.nhan]; co[u.gv.nhan].diem += u.diem; } });
      chung = co;
    }
    var tron = Object.keys(chung).map(function (k) { return chung[k]; })
      .sort(function (a, b) { return b.diem - a.diem || String(a.gv.ten).localeCompare(b.gv.ten, 'vi'); })
      .slice(0, 3)
      .map(function (c) { return { loai: 'tron', tieuDe: c.gv.ten + ' dạy thay ' + (can.length > 1 ? 'cả ' + can.length + ' tiết' : 'tiết này'), gv: c.gv, lyDo: c.lyDo, gan: can.map(function (x) { return { tiet: x, gv: c.gv }; }) }; });
    if (tron.length >= 3 || can.length === 1) return tron;
    // Ghép từng tiết: lấy người cao điểm nhất CÒN hợp lệ sau khi đã gán các tiết trước
    var gan = [], daGan = [];
    for (var j = 0; j < can.length; j++) {
      var tam = bc.dayThay.concat(daGan);
      var bcTam = Object.assign({}, bc, { dayThay: tam });
      var u = ungVien(bcTam, can[j], boQua)[0];
      if (!u) { gan = null; break; }
      gan.push({ tiet: can[j], gv: u.gv });
      daGan.push({ id: -1 - j, buoi: can[j].buoi, tiet: can[j].tiet, lop: can[j].lop, gv_thay_email: u.gv.email, gv_thay_nhan: u.gv.nhan });
    }
    if (gan && !tron.some(function (t) { return t.gan.every(function (x, k) { return x.gv.nhan === gan[k].gv.nhan; }); })) {
      var ten = {}; gan.forEach(function (x) { ten[x.gv.ten] = 1; });
      if (Object.keys(ten).length > 1) {
        tron.push({ loai: 'ghep', tieuDe: 'Ghép ' + Object.keys(ten).length + ' người theo từng tiết', lyDo: [{ t: 'Không ai trống trọn buổi', k: 'canh' }], gan: gan });
      }
    }
    return tron;
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

  var API = { GIOI_HAN_BUOI: GIOI_HAN_BUOI, thuCuaNgay: thuCuaNgay, boiCanh: boiCanh, gvCuaVang: gvCuaVang,
    tietCanThay: tietCanThay, ungVien: ungVien, phuongAn: phuongAn, xungDot: xungDot, vanBanZalo: vanBanZalo };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (goc) goc.DAY_THAY_LUAT = API;
})(typeof window !== 'undefined' ? window : null);
