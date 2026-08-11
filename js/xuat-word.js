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

  // Ô tên cơ quan chỉ rộng 38% trang, Word tự ngắt thì rớt một chữ lẻ xuống
  // dòng cuối ("TRƯỜNG TIỂU HỌC DIỄN / LIÊN"). Ngắt sẵn ngay sau cấp học —
  // đúng cách các trường vẫn in tiêu đề văn bản.
  function ngatTenTruong(ten) {
    var m = ten.match(/^(.*?(?:MẦM NON|MẪU GIÁO|TIỂU HỌC|TRUNG HỌC CƠ SỞ|TRUNG HỌC PHỔ THÔNG|THCS|THPT))\s+(.+)$/);
    if (m) return chan(m[1]) + '<br>' + chan(m[2]);
    return chan(ten);
  }

  // So khớp chức vụ không phân biệt hoa/thường và dấu
  function boDau(s) {
    return String(s || '').toLowerCase().normalize('NFD')
      .replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').trim();
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

  // Đường kẻ ngang dưới tên cơ quan / tiêu ngữ / trích yếu.
  // NĐ 30: dài bằng 1/3 đến 1/2 ĐỘ DÀI DÒNG CHỮ và đặt cân đối so với dòng
  // chữ — không phải kéo hết chiều ngang ô. Tham số là % của ô chứa nó.
  function gach(rong, tren, duoi) {
    return '<div style="width:' + rong + '%;margin:' + (tren || 3) + 'pt auto ' +
      (duoi || 0) + 'pt;border-bottom:1px solid #000;font-size:1pt;line-height:1pt">&nbsp;</div>';
  }

  // Thể thức NĐ 30 (Phụ lục I):
  //  · ô 38%: chủ quản in hoa KHÔNG đậm · tên trường in hoa VÀ đậm
  //  · ô 62%: Quốc hiệu in hoa đậm 12pt · tiêu ngữ đậm 13pt
  //  · địa danh + ngày tháng in nghiêng, canh giữa NGAY DƯỚI ô Quốc hiệu —
  //    nên đặt trong chính ô đó, không căn lề phải cả trang như trước
  function theThuc() {
    return '<table style="border:none;width:100%;border-collapse:collapse"><tr>' +
      '<td style="border:none;padding:0;width:38%;text-align:center;vertical-align:top;font-size:12pt">' +
      chan(cauHinh('DON_VI_CHU_QUAN').toUpperCase()) + '<br>' +
      '<b>' + ngatTenTruong(cauHinh('TEN_TRUONG').toUpperCase()) + '</b>' +
      gach(32) + '</td>' +
      '<td style="border:none;padding:0;width:62%;text-align:center;vertical-align:top;font-size:12pt">' +
      '<b style="white-space:nowrap">CỘNG&nbsp;HÒA&nbsp;XÃ&nbsp;HỘI&nbsp;CHỦ&nbsp;NGHĨA&nbsp;VIỆT&nbsp;NAM</b><br>' +
      '<b style="font-size:13pt">Độc lập - Tự do - Hạnh phúc</b>' +
      gach(30) +
      '<p class="nghieng" style="margin:12pt 0 0;font-size:13pt">' +
      chan(diaDanh()) + ', ' + ngayVN() + '</p></td>' +
      '</tr></table><div style="height:12pt"></div>';
  }

  // Khối ký. Gọi khoiKy(null) khi phiếu do CHÍNH hiệu trưởng nhận việc —
  // khi đó chỉ để một chữ ký bên phải (chỗ của người có thẩm quyền ký),
  // không bày ra cảnh hiệu trưởng ký cả hai bên một tờ phiếu.
  function khoiKy(nhanChuc, tenNhan) {
    var chuc = nhanChuc === undefined ? 'NGƯỜI NHẬN VIỆC' : nhanChuc;
    return '<table style="border:none;width:100%;margin-top:16pt"><tr>' +
      '<td style="border:none;width:50%;text-align:center;font-size:12pt">' +
      (chuc
        ? '<b>' + chan(chuc) + '</b><br>' +
          '<span class="nghieng">(Ký, ghi rõ họ tên)</span>' +
          '<div style="height:56pt"></div>' +
          (tenNhan ? '<b>' + chan(tenNhan) + '</b>'
                   : '<span style="letter-spacing:1pt">.....................................</span>')
        : '&nbsp;') + '</td>' +
      '<td style="border:none;width:50%;text-align:center;font-size:12pt">' +
      '<b>HIỆU TRƯỞNG</b><br>' +
      '<span class="nghieng">(Ký tên, đóng dấu)</span>' +
      '<div style="height:56pt"></div>' +
      '<b>' + chan(cauHinh('HIEU_TRUONG')) + '</b></td>' +
      '</tr></table>';
  }

  // Chức vụ → họ tên thật. Danh bạ tài khoản trên CSDL là nguồn chính,
  // cấu hình trường là chỗ dựa khi chưa nối CSDL. Trả '' nếu không tra được
  // (lúc đó chỗ gọi in nguyên chuỗi đang có — có thể vốn đã là họ tên).
  function tenTheoChucVu(chucVu) {
    var can = boDau(chucVu);
    if (!can) return '';
    var ds = window.DS_TAI_KHOAN || [];
    for (var i = 0; i < ds.length; i++) {
      if (boDau(ds[i].chuc_vu) === can) return ds[i].ho_ten || '';
    }
    if (can === 'pho hieu truong') return cauHinh('PHO_HIEU_TRUONG');
    if (can === 'hieu truong') return cauHinh('HIEU_TRUONG');
    return '';
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
    ngatTenTruong: ngatTenTruong, gach: gach,
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
        '<td class="giua"><b>' + chan(h.ma) + '</b></td>' +
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

    // Cột "Người phụ trách" trong CSDL thường ghi CHỨC VỤ; phiếu giao việc là
    // giấy tờ đưa tận tay nên phải có họ tên thật, chức vụ đi kèm sau.
    var tenPT = tenTheoChucVu(phuTrach);
    var laHieuTruong = !!tenPT && tenPT === cauHinh('HIEU_TRUONG');

    var than = theThuc() +
      // Tên loại (in hoa, đậm, 14pt) → trích yếu (chữ thường, đậm) → đường kẻ
      // ngang ngắn bên dưới trích yếu, đúng Mẫu 1.2 NĐ 30.
      '<p class="giua" style="font-size:14pt;font-weight:bold;margin:0">PHIẾU GIAO VIỆC</p>' +
      '<p class="giua" style="font-size:13pt;font-weight:bold;margin:4pt 0 0">' +
      'Hoàn thiện hồ sơ minh chứng - Hộp ' + chan(maHop) + '. ' + chan(hop.ten) + '</p>' +
      gach(20, 5, 14) +
      '<p style="margin:0 0 4pt"><b>Năm học:</b> ' + chan(cauHinh('NAM_HOC')) + '</p>' +
      '<p style="margin:0 0 4pt"><b>Người phụ trách:</b> ' +
      (tenPT ? chan(tenPT) + ' - ' + chan(phuTrach)
             : (phuTrach ? chan(phuTrach) : '.....................................')) + '</p>' +
      '<p style="margin:0 0 12pt"><b>Số đầu hồ sơ:</b> ' + ds.length +
      ' (đã có: ' + daCo + '; còn phải hoàn thiện: ' + (ds.length - daCo) + ').</p>' +
      '<table><thead><tr>' +
      '<th style="width:6%">TT</th>' +
      '<th style="width:18%">Mã minh chứng</th>' +
      '<th style="width:44%">Tên hồ sơ</th>' +
      '<th style="width:14%">Trạng thái</th>' +
      '<th style="width:18%">Thời hạn hoàn thành</th>' +
      '</tr></thead><tbody>' + dong + '</tbody></table>' +
      '<p class="nghieng" style="font-size:11.5pt;margin:10pt 0 0">' +
      'Ghi chú: cột "Thời hạn hoàn thành" do nhà trường ghi khi giao việc. ' +
      'Hồ sơ nộp lên thư mục Google Drive của từng minh chứng.</p>' +
      (laHieuTruong ? khoiKy(null) : khoiKy('NGƯỜI PHỤ TRÁCH', tenPT));

    var tenTep = 'phieu-giao-viec-' + maHop.toLowerCase() + '-' + cauHinh('NAM_HOC') + '.doc';
    taiVe(khungWord('Phiếu giao việc ' + maHop, than), tenTep);
    window.notify('Đã tải phiếu giao việc "' + maHop + '. ' + hop.ten + '" — ' + ds.length + ' đầu hồ sơ.');
  };
})();
