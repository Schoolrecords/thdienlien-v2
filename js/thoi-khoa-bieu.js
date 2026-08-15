// ============================================================
// thoi-khoa-bieu.js — MODULE THỜI KHÓA BIỂU
// Thay chỗ màn Dự giờ trên thanh tab Điều hành (thầy Chung chốt 15/8/2026).
//
// ĐỌC TỆP EXCEL DO CÔNG CỤ XẾP LỊCH TẠO RA, không bắt ai gõ lại 710 tiết.
// Mẫu đối chiếu: TKB-Truong-Tieu-hoc-moi-20260815.xlsx — 10 tab, trong đó:
//   · TKB_LOP / TOAN_TRUONG : Thứ | Buổi | Tiết | <25 cột lớp>, ô = "Môn — GV"
//   · TKB_GV                : cùng lưới nhưng cột là giáo viên, ô = "Môn — Lớp"
//   · PCGD                  : TT | Giáo viên | Mã GV | Lớp | Điểm trường | Môn | Số tiết
//   · DIEM_TRUONG           : tổng hợp số lớp / GV / tiết mỗi điểm
//
// 🔑 CHỈ ĐỌC TAB THEO LỚP. Ba tab KHOI_*, TOAN_TRUONG, TKB_GV đều là CÙNG MỘT
//    dữ liệu bày theo cách khác — đọc nhiều tab là tự đẻ ra mâu thuẫn khi
//    người ta sửa tay một tab rồi quên tab kia. TKB theo giáo viên app TỰ
//    dựng lại từ dữ liệu lớp (xem doiChieuGV), luôn khớp.
//
// ⚠️ KHÔNG tự ý sửa nội dung tệp tải lên. Xếp thời khóa biểu là việc của
//    người, app chỉ nhận, kiểm tra rồi bày ra.
// ============================================================
(function () {
  'use strict';

  function thoat(s) { return window.thoatHTML ? window.thoatHTML(s) : String(s || ''); }
  function $(s) { return document.querySelector(s); }

  var THU = ['Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy', 'Chủ nhật'];
  var XEM = 'lop';        // lop | gv | ngay
  var CHON = '';          // lớp hoặc giáo viên đang xem
  var DU_LIEU = null;     // { tiet: [...], nguon: '', luc: '' }
  var LOI_DOC = '';

  // ══════════ ĐỌC TỆP EXCEL ══════════
  // Trả về mảng phẳng: { thu, buoi, tiet, lop, mon, gv }
  // Một dòng = một tiết của một lớp. Đây là dạng duy nhất lưu vào cơ sở dữ
  // liệu; mọi cách bày (theo lớp, theo giáo viên, theo ngày) đều dựng lại từ
  // đây — một nguồn sự thật, đúng nguyên tắc dự án.
  function docBang(ws, XLSX) {
    var hang = XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: false, defval: '' });
    // Tìm dòng tiêu đề: dòng đầu tiên có ô "Thứ" và ô "Tiết"
    var iTieuDe = -1;
    for (var i = 0; i < Math.min(hang.length, 12); i++) {
      var r = hang[i].map(function (x) { return String(x).trim().toLowerCase(); });
      if (r.indexOf('thứ') >= 0 && r.indexOf('tiết') >= 0) { iTieuDe = i; break; }
    }
    if (iTieuDe < 0) return { loi: 'Không tìm thấy dòng tiêu đề có cột "Thứ" và "Tiết".' };

    var td = hang[iTieuDe].map(function (x) { return String(x).trim(); });
    var cThu = -1, cBuoi = -1, cTiet = -1;
    td.forEach(function (t, i) {
      var k = t.toLowerCase();
      if (k === 'thứ') cThu = i;
      else if (k === 'buổi') cBuoi = i;
      else if (k === 'tiết') cTiet = i;
    });
    if (cThu < 0 || cTiet < 0) return { loi: 'Thiếu cột "Thứ" hoặc "Tiết".' };

    // Các cột còn lại (sau cột Tiết) là danh sách lớp
    var cotLop = [];
    for (var c = cTiet + 1; c < td.length; c++) {
      if (td[c]) cotLop.push({ i: c, ten: td[c] });
    }
    if (!cotLop.length) return { loi: 'Không thấy cột lớp nào sau cột "Tiết".' };

    var ra = [], thuHienTai = '', buoiHienTai = '';
    for (var h = iTieuDe + 1; h < hang.length; h++) {
      var d = hang[h];
      if (!d) continue;
      // Ô gộp: dòng dưới bỏ trống thì kế thừa dòng trên
      var thu = String(d[cThu] || '').trim() || thuHienTai;
      var buoi = cBuoi >= 0 ? (String(d[cBuoi] || '').trim() || buoiHienTai) : '';
      var tiet = String(d[cTiet] || '').trim();
      if (!thu || !tiet) continue;
      thuHienTai = thu; buoiHienTai = buoi;

      cotLop.forEach(function (cl) {
        var o = String(d[cl.i] || '').trim();
        if (!o) return;
        // Ô dạng "Tiếng Việt — Nguyễn Thị A". Dấu gạch có thể là — – hoặc -
        var p = o.split(/\s+[—–-]\s+/);
        ra.push({
          thu: thu, buoi: buoi, tiet: parseInt(tiet, 10) || 0,
          lop: cl.ten, mon: (p[0] || '').trim(), gv: (p[1] || '').trim()
        });
      });
    }
    return ra.length ? { tiet: ra } : { loi: 'Đọc được bảng nhưng không có tiết nào.' };
  }

  function chonTab(wb) {
    // Ưu tiên tab theo lớp. KHÔNG đọc TKB_GV (cùng dữ liệu, bày kiểu khác).
    var uu = ['TKB_LOP', 'TOAN_TRUONG'];
    for (var i = 0; i < uu.length; i++) {
      if (wb.SheetNames.indexOf(uu[i]) >= 0) return uu[i];
    }
    // Không có tab quen thì lấy tab đầu KHÔNG phải TKB_GV / PCGD / DIEM_TRUONG
    var bo = ['TKB_GV', 'PCGD', 'DIEM_TRUONG'];
    for (var j = 0; j < wb.SheetNames.length; j++) {
      if (bo.indexOf(wb.SheetNames[j]) < 0) return wb.SheetNames[j];
    }
    return wb.SheetNames[0];
  }

  window.tkbChonTep = function (input) {
    var tep = input.files && input.files[0];
    if (!tep) return;
    LOI_DOC = '';
    if (!window.XLSX) {
      LOI_DOC = 'Chưa nạp được thư viện đọc Excel (lib/xlsx.min.js).';
      return veLai();
    }
    var fr = new FileReader();
    fr.onerror = function () { LOI_DOC = 'Không đọc được tệp.'; veLai(); };
    fr.onload = function (e) {
      try {
        // Bản xlsx.min.js này là bản CHO TRÌNH DUYỆT — chỉ có XLSX.read, KHÔNG
        // có readFile. Phải truyền mảng byte, không truyền đường dẫn.
        var wb = window.XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
        var ten = chonTab(wb);
        var kq = docBang(wb.Sheets[ten], window.XLSX);
        if (kq.loi) { LOI_DOC = 'Tab "' + ten + '": ' + kq.loi; DU_LIEU = null; }
        else {
          DU_LIEU = { tiet: kq.tiet, nguon: tep.name, tab: ten,
            luc: new Date().toLocaleString('vi-VN') };
          CHON = '';
        }
      } catch (err) {
        LOI_DOC = 'Tệp không đọc được: ' + (err && err.message ? err.message : err);
        DU_LIEU = null;
      }
      veLai();
    };
    fr.readAsArrayBuffer(tep);
  };

  function veLai() {
    var vung = $('#tkb-vung');
    if (vung) vung.innerHTML = thanTKB();
    else if (window.DH && window.DH.tab) window.DH.tab('tkb');
  }

  // ══════════ GOM DỮ LIỆU ══════════
  function dsLop() {
    var t = {}; (DU_LIEU.tiet || []).forEach(function (x) { t[x.lop] = 1; });
    return Object.keys(t).sort(function (a, b) { return a.localeCompare(b, 'vi'); });
  }
  function dsGV() {
    var t = {}; (DU_LIEU.tiet || []).forEach(function (x) { if (x.gv) t[x.gv] = 1; });
    // Sắp theo TÊN (chữ cuối) rồi mới họ đệm — đúng cách thầy cô lập danh sách
    return Object.keys(t).sort(function (a, b) {
      var ta = a.trim().split(/\s+/).pop(), tb = b.trim().split(/\s+/).pop();
      return ta.localeCompare(tb, 'vi') || a.localeCompare(b, 'vi');
    });
  }
  function dsThu() {
    var t = {}; (DU_LIEU.tiet || []).forEach(function (x) { t[x.thu] = 1; });
    return Object.keys(t).sort(function (a, b) {
      var ia = THU.indexOf(a), ib = THU.indexOf(b);
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
    });
  }
  // Khung dòng: [{thu, buoi, tiet}] theo đúng thứ tự trong tuần
  function khungDong() {
    var thay = {}, ra = [];
    (DU_LIEU.tiet || []).forEach(function (x) {
      var k = x.thu + '|' + x.buoi + '|' + x.tiet;
      if (!thay[k]) { thay[k] = 1; ra.push({ thu: x.thu, buoi: x.buoi, tiet: x.tiet }); }
    });
    return ra.sort(function (a, b) {
      var ia = THU.indexOf(a.thu), ib = THU.indexOf(b.thu);
      if (ia !== ib) return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
      var ba = a.buoi === 'Sáng' ? 0 : 1, bb = b.buoi === 'Sáng' ? 0 : 1;
      if (ba !== bb) return ba - bb;
      return a.tiet - b.tiet;
    });
  }

  // ══════════ ĐỐI CHIẾU — chỗ app đáng tiền hơn tệp Excel ══════════
  // Tệp Excel bày ra thì đẹp, nhưng KHÔNG ai soi được hai lỗi dưới đây bằng
  // mắt trên 710 tiết. Máy đối chiếu trong một nốt nhạc.
  function doiChieuGV() {
    var trung = [], theoGV = {};
    (DU_LIEU.tiet || []).forEach(function (x) {
      if (!x.gv) return;
      var k = x.gv + '|' + x.thu + '|' + x.buoi + '|' + x.tiet;
      (theoGV[k] = theoGV[k] || []).push(x);
    });
    Object.keys(theoGV).forEach(function (k) {
      if (theoGV[k].length > 1) trung.push(theoGV[k]);
    });
    return trung;
  }
  function tietThieuGV() {
    return (DU_LIEU.tiet || []).filter(function (x) { return !x.gv; });
  }
  // Lớp trong tệp mà cơ sở dữ liệu nhà trường không có (và ngược lại)
  function lechLop() {
    // Cầu nối DH_KHO trả DL bằng HÀM chứ không phải giá trị — vì DL đổi sau
    // khi đăng nhập (ghi chú ở mục 11.2 sổ dự án). Danh sách lớp nằm trong
    // DL.lop, dạng { '1A': {khoi, coSo, siSo}, ... }.
    var dl = (window.DH_KHO && window.DH_KHO.dl) ? window.DH_KHO.dl() : null;
    var cuaApp = Object.keys((dl && dl.lop) || {});
    if (!cuaApp.length) return null;      // chưa có dữ liệu lớp thì không đối chiếu
    var cuaTep = dsLop();
    return {
      thieu: cuaApp.filter(function (l) { return cuaTep.indexOf(l) < 0; }),
      thua: cuaTep.filter(function (l) { return cuaApp.indexOf(l) < 0; })
    };
  }

  // ══════════ VẼ ══════════
  function daiTaiLen() {
    return '<div class="tkb-tai">' +
      '<div class="tkb-tai-chu"><b>Nạp thời khóa biểu từ tệp Excel</b>' +
      '<span>Tệp do phần mềm xếp thời khóa biểu tạo ra — cần có các cột ' +
      '<b>Thứ · Buổi · Tiết</b> rồi đến từng cột lớp, mỗi ô ghi <b>Môn — Giáo viên</b>. ' +
      'App đọc tab theo LỚP; bảng theo giáo viên app tự dựng lại nên luôn khớp.</span></div>' +
      '<label class="tkb-nut-tai">📂 Chọn tệp .xlsx' +
      '<input type="file" accept=".xlsx,.xls" onchange="tkbChonTep(this)" hidden></label>' +
      '</div>' +
      (LOI_DOC ? '<div class="hd-kiem do">⚠ ' + thoat(LOI_DOC) + '</div>' : '');
  }

  function daiKiemTra() {
    var trung = doiChieuGV(), thieu = tietThieuGV(), lech = lechLop();
    var o = [];
    if (trung.length) {
      o.push('<div class="hd-kiem do"><b>⚠ ' + trung.length +
        ' chỗ một giáo viên bị xếp hai lớp cùng lúc</b><br>' +
        trung.slice(0, 5).map(function (n) {
          return thoat(n[0].gv) + ' — ' + thoat(n[0].thu) + ' ' + thoat(n[0].buoi) +
            ' tiết ' + n[0].tiet + ': ' + n.map(function (x) { return thoat(x.lop); }).join(' và ');
        }).join('<br>') +
        (trung.length > 5 ? '<br>… còn ' + (trung.length - 5) + ' chỗ nữa' : '') +
        '<br><span style="opacity:.85">Sửa trong phần mềm xếp lịch rồi nạp lại tệp — ' +
        'app không tự sửa thời khóa biểu.</span></div>');
    }
    if (thieu.length) {
      o.push('<div class="hd-kiem vang"><b>' + thieu.length +
        ' tiết chưa ghi tên giáo viên.</b> Những tiết này sẽ không hiện trong bảng ' +
        'theo giáo viên, và không bố trí dạy thay được.</div>');
    }
    if (lech && (lech.thieu.length || lech.thua.length)) {
      o.push('<div class="hd-kiem vang"><b>Lớp trong tệp lệch với danh sách lớp của trường:</b><br>' +
        (lech.thieu.length ? 'Trường có nhưng tệp thiếu: <b>' + lech.thieu.join(', ') + '</b><br>' : '') +
        (lech.thua.length ? 'Tệp có nhưng trường chưa khai: <b>' + lech.thua.join(', ') + '</b>' : '') +
        '</div>');
    }
    if (!o.length) {
      o.push('<div class="hd-kiem xanh">✅ Không thấy giáo viên nào bị xếp trùng giờ, ' +
        'mọi tiết đều có tên người dạy.</div>');
    }
    return o.join('');
  }

  function bangTheoLop(lop) {
    var dong = khungDong();
    var tra = {};
    DU_LIEU.tiet.forEach(function (x) {
      if (x.lop === lop) tra[x.thu + '|' + x.buoi + '|' + x.tiet] = x;
    });
    var thuTruoc = '';
    return '<div class="cuon-ngang"><table class="bang-quan-tri nho tkb-bang"><thead><tr>' +
      '<th>Thứ</th><th>Buổi</th><th>Tiết</th><th>Môn</th><th>Giáo viên</th></tr></thead><tbody>' +
      dong.map(function (d) {
        var x = tra[d.thu + '|' + d.buoi + '|' + d.tiet];
        var moiThu = d.thu !== thuTruoc; thuTruoc = d.thu;
        return '<tr' + (moiThu ? ' class="tkb-dau-thu"' : '') + '>' +
          '<td>' + (moiThu ? '<b>' + thoat(d.thu) + '</b>' : '') + '</td>' +
          '<td>' + thoat(d.buoi) + '</td><td style="text-align:center">' + d.tiet + '</td>' +
          '<td>' + (x ? '<b>' + thoat(x.mon) + '</b>' : '<span class="tkb-trong">—</span>') + '</td>' +
          '<td>' + (x ? thoat(x.gv) : '') + '</td></tr>';
      }).join('') + '</tbody></table></div>';
  }

  function bangTheoGV(gv) {
    var dong = khungDong(), tra = {};
    DU_LIEU.tiet.forEach(function (x) {
      if (x.gv === gv) tra[x.thu + '|' + x.buoi + '|' + x.tiet] = x;
    });
    var soTiet = DU_LIEU.tiet.filter(function (x) { return x.gv === gv; }).length;
    var thuTruoc = '';
    return '<div class="tkb-tom">Tổng <b>' + soTiet + ' tiết</b> một tuần</div>' +
      '<div class="cuon-ngang"><table class="bang-quan-tri nho tkb-bang"><thead><tr>' +
      '<th>Thứ</th><th>Buổi</th><th>Tiết</th><th>Lớp</th><th>Môn</th></tr></thead><tbody>' +
      dong.map(function (d) {
        var x = tra[d.thu + '|' + d.buoi + '|' + d.tiet];
        var moiThu = d.thu !== thuTruoc; thuTruoc = d.thu;
        return '<tr' + (moiThu ? ' class="tkb-dau-thu"' : '') + '>' +
          '<td>' + (moiThu ? '<b>' + thoat(d.thu) + '</b>' : '') + '</td>' +
          '<td>' + thoat(d.buoi) + '</td><td style="text-align:center">' + d.tiet + '</td>' +
          '<td>' + (x ? '<b>' + thoat(x.lop) + '</b>' : '<span class="tkb-trong">trống</span>') + '</td>' +
          '<td>' + (x ? thoat(x.mon) : '') + '</td></tr>';
      }).join('') + '</tbody></table></div>';
  }

  function bangTheoNgay(thu) {
    var lops = dsLop();
    var dong = khungDong().filter(function (d) { return d.thu === thu; });
    var tra = {};
    DU_LIEU.tiet.forEach(function (x) {
      if (x.thu === thu) tra[x.buoi + '|' + x.tiet + '|' + x.lop] = x;
    });
    return '<div class="cuon-ngang"><table class="bang-quan-tri nho tkb-bang tkb-ngay"><thead><tr>' +
      '<th class="cot-dinh">Buổi · Tiết</th>' +
      lops.map(function (l) { return '<th>' + thoat(l) + '</th>'; }).join('') +
      '</tr></thead><tbody>' +
      dong.map(function (d) {
        return '<tr><td class="cot-dinh"><b>' + thoat(d.buoi) + ' ' + d.tiet + '</b></td>' +
          lops.map(function (l) {
            var x = tra[d.buoi + '|' + d.tiet + '|' + l];
            return '<td>' + (x
              ? '<b>' + thoat(x.mon) + '</b><br><small>' + thoat(x.gv) + '</small>'
              : '<span class="tkb-trong">—</span>') + '</td>';
          }).join('') + '</tr>';
      }).join('') + '</tbody></table></div>';
  }

  function thanTKB() {
    if (!DU_LIEU) {
      return daiTaiLen() +
        '<div class="the-thong-bao">Chưa nạp thời khóa biểu. Chọn tệp Excel ở trên.<br><br>' +
        '<b>Thời khóa biểu dùng để làm gì trong app:</b><br>' +
        '· Xem nhanh lớp nào đang học môn gì, ai dạy<br>' +
        '· Máy tự soát <b>một giáo viên bị xếp hai lớp cùng lúc</b> — thứ không ai dò nổi bằng mắt trên 710 tiết<br>' +
        '· Là nền để bố trí <b>dạy thay theo tiết</b> khi có người vắng (màn Lịch tuần)</div>';
    }

    var lops = dsLop(), gvs = dsGV(), thus = dsThu();
    if (!CHON) CHON = XEM === 'lop' ? lops[0] : XEM === 'gv' ? gvs[0] : thus[0];
    var ds = XEM === 'lop' ? lops : XEM === 'gv' ? gvs : thus;
    if (ds.indexOf(CHON) < 0) CHON = ds[0];

    return daiTaiLen() +
      '<div class="tkb-nguon">📄 <b>' + thoat(DU_LIEU.nguon) + '</b> · tab ' +
      thoat(DU_LIEU.tab) + ' · ' + DU_LIEU.tiet.length + ' tiết · ' + lops.length +
      ' lớp · ' + gvs.length + ' giáo viên · đọc lúc ' + thoat(DU_LIEU.luc) +
      '<br><span class="tkb-canh">Mới đọc trên máy anh chị, <b>chưa lưu vào cơ sở dữ liệu</b> — ' +
      'tải lại trang là mất.</span></div>' +
      daiKiemTra() +
      '<div class="dh-chon-hang" style="margin-top:12px">' +
      [['lop', 'Theo lớp'], ['gv', 'Theo giáo viên'], ['ngay', 'Theo ngày']].map(function (x) {
        return '<button class="chip-loc' + (XEM === x[0] ? ' on' : '') +
          '" onclick="tkbXem(\'' + x[0] + '\')">' + x[1] + '</button>';
      }).join('') + '</div>' +
      '<div class="dh-chon-hang tkb-cuon-chon">' +
      ds.map(function (v) {
        return '<button class="chip-loc' + (CHON === v ? ' on' : '') +
          '" onclick="tkbChon(' + JSON.stringify(v).replace(/"/g, '&quot;') + ')">' +
          thoat(v) + '</button>';
      }).join('') + '</div>' +
      (XEM === 'lop' ? bangTheoLop(CHON) : XEM === 'gv' ? bangTheoGV(CHON) : bangTheoNgay(CHON));
  }

  window.tkbXem = function (m) { XEM = m; CHON = ''; veLai(); };
  window.tkbChon = function (v) { CHON = v; veLai(); };

  // Hàm màn Điều hành gọi
  window.veTKB = function () {
    return '<div id="tkb-vung">' + thanTKB() + '</div>';
  };
})();
