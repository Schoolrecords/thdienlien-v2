// ============================================================
// xuat-word.js — PHIẾU GIAO VIỆC theo hộp hồ sơ (kế thừa Bạch Liêu)
// Bấm 📄 ở đầu mỗi hộp trong lớp phủ: tải bản Word khổ dọc, thể thức
// Nghị định 30/2020, có chỗ ký nhận — đưa cho từng người phần việc của họ.
// ============================================================
(function () {
  'use strict';

  var FONT = 'font-family:"Times New Roman",serif';

  function chan(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function cauHinh(khoa, mac) { return (window.CAU_HINH && window.CAU_HINH[khoa]) || mac || ''; }

  function ngayVN() {
    var t = new Date();
    return 'ngày ' + String(t.getDate()).padStart(2, '0') +
      ' tháng ' + String(t.getMonth() + 1).padStart(2, '0') + ' năm ' + t.getFullYear();
  }
  // Địa danh = tên xã, không kèm chữ "Xã", không kèm tỉnh
  function diaDanh() {
    var dc = cauHinh('DIA_CHI_TRUONG');
    var m = dc.match(/[Xx]ã\s+([^,]+)/);
    return m ? m[1].trim() : (dc.split(',')[0] || '').trim();
  }

  function khungWord(tieuDeTab, than) {
    return '<html xmlns:o="urn:schemas-microsoft-com:office:office" ' +
      'xmlns:w="urn:schemas-microsoft-com:office:word" ' +
      'xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8">' +
      '<title>' + chan(tieuDeTab) + '</title>' +
      '<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View>' +
      '<w:Zoom>100</w:Zoom></w:WordDocument></xml><![endif]-->' +
      '<style>' +
      '@page{size:21cm 29.7cm;margin:2cm 1.5cm 2cm 3cm}' +
      'body{' + FONT + ';font-size:13pt;line-height:1.5;color:#000}' +
      'table{border-collapse:collapse;width:100%}' +
      'th,td{border:1px solid #000;padding:4pt 6pt;font-size:12pt;vertical-align:top}' +
      'th{background:#e8e8e8;font-weight:bold;text-align:center}' +
      'thead{display:table-header-group}tr{page-break-inside:avoid}' +
      '.giua{text-align:center}.phai{text-align:right}.nghieng{font-style:italic}' +
      '</style></head><body>' + than + '</body></html>';
  }

  // Thể thức NĐ 30: chủ quản in hoa KHÔNG đậm, tên trường in hoa VÀ đậm; ô 38/62
  function theThuc() {
    return '<table style="border:none;width:100%;border-collapse:collapse"><tr>' +
      '<td style="border:none;padding:0;width:38%;text-align:center;font-size:12pt">' +
      chan(cauHinh('DON_VI_CHU_QUAN').toUpperCase()) + '<br>' +
      '<b>' + chan(cauHinh('TEN_TRUONG').toUpperCase()) + '</b>' +
      '<div style="width:62%;margin:3pt auto 0;border-bottom:1px solid #000;font-size:1pt;line-height:1pt">&nbsp;</div></td>' +
      '<td style="border:none;padding:0;width:62%;text-align:center;font-size:12pt">' +
      '<b style="white-space:nowrap">CỘNG&nbsp;HÒA&nbsp;XÃ&nbsp;HỘI&nbsp;CHỦ&nbsp;NGHĨA&nbsp;VIỆT&nbsp;NAM</b><br>' +
      '<b>Độc lập - Tự do - Hạnh phúc</b>' +
      '<div style="width:48%;margin:3pt auto 0;border-bottom:1px solid #000;font-size:1pt;line-height:1pt">&nbsp;</div></td>' +
      '</tr></table>' +
      '<p class="phai nghieng" style="margin:10pt 0 14pt;font-size:12pt">' +
      chan(diaDanh()) + ', ' + ngayVN() + '</p>';
  }

  function khoiKy(nhanChuc) {
    return '<table style="border:none;width:100%;margin-top:16pt"><tr>' +
      '<td style="border:none;width:50%;text-align:center;font-size:12pt">' +
      '<b>' + chan(nhanChuc || 'NGƯỜI NHẬN VIỆC') + '</b><br>' +
      '<span class="nghieng">(Ký, ghi rõ họ tên)</span>' +
      '<div style="height:56pt"></div>' +
      '<span style="letter-spacing:1pt">.....................................</span></td>' +
      '<td style="border:none;width:50%;text-align:center;font-size:12pt">' +
      '<b>HIỆU TRƯỞNG</b><br>' +
      '<span class="nghieng">(Ký tên, đóng dấu)</span>' +
      '<div style="height:56pt"></div>' +
      '<b>' + chan(cauHinh('HIEU_TRUONG')) + '</b></td>' +
      '</tr></table>';
  }

  function taiVe(html, tenTep) {
    // BOM đầu tệp để Word đọc đúng tiếng Việt có dấu
    var blob = new Blob(['﻿' + html], { type: 'application/msword' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = tenTep;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
      document.body.removeChild(a);
      URL.revokeObjectURL(a.href);
    }, 400);
  }

  var TEN_TT = { co: 'Đã có', dang: 'Đang cập nhật', chua: 'Chưa có' };

  // Tiện ích dùng chung cho các file xuất Word khác (tcqg-word.js…)
  window.WORD_TIEN_ICH = {
    chan: chan, cauHinh: cauHinh, ngayVN: ngayVN, diaDanh: diaDanh,
    khungWord: khungWord, theThuc: theThuc, khoiKy: khoiKy, taiVe: taiVe, TEN_TT: TEN_TT
  };

  // Phiếu giao việc của một hộp — nhận mã hộp 'H01'…'H14'
  window.xuatHopWord = function (maHop) {
    var hop = window.HOP[maHop];
    if (!hop) return;
    var ds = window.HO_SO.filter(function (h) { return h.hop === maHop; });
    if (!ds.length) { window.notify('Hộp này chưa có hồ sơ nào để xuất.'); return; }

    var dong = ds.map(function (h, i) {
      return '<tr>' +
        '<td class="giua">' + (i + 1) + '</td>' +
        '<td class="giua"><b>' + chan(h.ma) + '</b>' +
        (h.maCu ? '<br><span style="font-size:10pt">' + chan(h.maCu) + '</span>' : '') + '</td>' +
        '<td>' + chan(h.ten) + '</td>' +
        '<td class="giua">' + chan(TEN_TT[h.tt] || h.tt) + '</td>' +
        '<td></td></tr>';
    }).join('');

    var daCo = ds.filter(function (h) { return h.tt === 'co'; }).length;

    // Người phụ trách của hộp: người xuất hiện nhiều nhất trong hộp
    var dem = {};
    ds.forEach(function (h) {
      var n = h.phuTrach || hop.phuTrach || '';
      if (n) dem[n] = (dem[n] || 0) + 1;
    });
    var phuTrach = Object.keys(dem).sort(function (a, b) { return dem[b] - dem[a]; })[0] || hop.phuTrach || '';

    var than = theThuc() +
      '<p class="giua" style="font-size:15pt;font-weight:bold;margin:0">PHIẾU GIAO VIỆC</p>' +
      '<p class="giua" style="font-size:13pt;font-weight:bold;margin:4pt 0 2pt">HỒ SƠ MINH CHỨNG NHÀ TRƯỜNG</p>' +
      '<p class="giua nghieng" style="font-size:12pt;margin:0 0 14pt">' +
      chan(maHop) + '. ' + chan(hop.ten) + ' · Năm học ' + chan(cauHinh('NAM_HOC')) + '</p>' +
      '<p style="margin:0 0 4pt"><b>Người phụ trách:</b> ' +
      (phuTrach ? chan(phuTrach) : '.....................................') + '</p>' +
      '<p style="margin:0 0 12pt"><b>Số đầu hồ sơ:</b> ' + ds.length +
      ' &nbsp;·&nbsp; <b>Đã có:</b> ' + daCo +
      ' &nbsp;·&nbsp; <b>Còn phải hoàn thiện:</b> ' + (ds.length - daCo) + '</p>' +
      '<table><thead><tr>' +
      '<th style="width:6%">TT</th>' +
      '<th style="width:17%">Mã minh chứng<br><span style="font-weight:normal;font-size:10pt">mã mới / mã cũ</span></th>' +
      '<th style="width:45%">Tên minh chứng</th>' +
      '<th style="width:14%">Trạng thái</th>' +
      '<th style="width:18%">Thời hạn hoàn thành</th>' +
      '</tr></thead><tbody>' + dong + '</tbody></table>' +
      '<p class="nghieng" style="font-size:11.5pt;margin:10pt 0 0">' +
      'Ghi chú: cột "Thời hạn hoàn thành" do nhà trường ghi khi giao việc. ' +
      'Hồ sơ nộp lên thư mục Google Drive của từng minh chứng.</p>' +
      khoiKy('NGƯỜI PHỤ TRÁCH');

    var tenTep = 'phieu-giao-viec-' + maHop.toLowerCase() + '-' + cauHinh('NAM_HOC') + '.doc';
    taiVe(khungWord('Phiếu giao việc ' + maHop, than), tenTep);
    window.notify('Đã tải phiếu giao việc "' + maHop + '. ' + hop.ten + '" — ' + ds.length + ' đầu hồ sơ.');
  };
})();
