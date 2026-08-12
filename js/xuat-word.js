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

  // NĐ 30: ngày nhỏ hơn 10 thì thêm số 0, nhưng THÁNG chỉ thêm số 0 khi là
  // tháng 1 hoặc tháng 2. Ghi "tháng 08" là sai thể thức.
  function ngayVN() {
    var t = new Date();
    var thang = t.getMonth() + 1;
    return 'ngày ' + String(t.getDate()).padStart(2, '0') +
      ' tháng ' + (thang < 3 ? '0' + thang : thang) + ' năm ' + t.getFullYear();
  }
  // Địa danh = tên xã, không kèm chữ "Xã", không kèm tỉnh
  function diaDanh() {
    var dc = cauHinh('DIA_CHI_TRUONG');
    var m = dc.match(/[Xx]ã\s+([^,]+)/);
    return m ? m[1].trim() : (dc.split(',')[0] || '').trim();
  }

  // Chiều rộng hai ô đầu trang, tính trên bề ngang chữ 16,5cm và trừ 0,38cm
  // lề trong ô của Word. Cả hai dòng dài nhất phải nằm gọn MỘT DÒNG:
  //   ô trái  43% = 7,10cm → dùng được 6,72cm · "TRƯỜNG TIỂU HỌC DIỄN LIÊN" 6,41cm
  //   ô phải  57% = 9,41cm → dùng được 9,03cm · Quốc hiệu (12pt đậm) 8,83cm
  // Để 38% như bản trước là Word ngắt dòng, rớt chữ cuối xuống dòng riêng.
  // Trường nào tên dài hơn thì nới ô trái, đừng để Word tự ngắt.
  var O_TRAI = 43, O_PHAI = 57;

  // So khớp chức vụ không phân biệt hoa/thường và dấu
  function boDau(s) {
    return String(s || '').toLowerCase().normalize('NFD')
      .replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').trim();
  }

  // Khổ giấy: Word BỎ QUA "@page{size:…}" không tên — phải khai báo section có
  // tên (@page Section1), thêm mso-page-orientation và bọc thân bài trong
  // <div class="Section1"> thì Word mới dựng đúng khổ. Bản trước chỉ đổi size
  // nên xuất ra vẫn là A4 dọc.
  //   ngang = false → 21 × 29,7cm · lề trên 2 · dưới 2 · trái 3 · phải 1,5 (NĐ 30)
  //   ngang = true  → 29,7 × 21cm · lề trên 1,5 · dưới 1,5 · trái 2 · phải 1,5
  //                   → bề ngang chữ 26,2cm cho các bảng nhiều cột
  function khungWord(tieuDeTab, than, ngang) {
    var trang = ngang
      ? 'size:29.7cm 21cm;mso-page-orientation:landscape;margin:1.5cm 1.5cm 1.5cm 2cm'
      : 'size:21cm 29.7cm;margin:2cm 1.5cm 2cm 3cm';
    return '<html xmlns:o="urn:schemas-microsoft-com:office:office" ' +
      'xmlns:w="urn:schemas-microsoft-com:office:word" ' +
      'xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8">' +
      '<title>' + chan(tieuDeTab) + '</title>' +
      '<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View>' +
      '<w:Zoom>100</w:Zoom></w:WordDocument></xml><![endif]-->' +
      '<style>' +
      '@page Section1{' + trang + '}div.Section1{page:Section1}' +
      'body{' + FONT + ';font-size:13pt;line-height:1.5;color:#000}' +
      'table{border-collapse:collapse;width:100%}' +
      // Bảng gắn class "co-dinh" thì Word giữ đúng bề rộng cột đã khai, không tự
      // nong cột theo nội dung dài nhất (áp cho cả bảng chứ không áp toàn cục,
      // để các bảng cũ giữ nguyên cách dàn cột đã kiểm chứng).
      'table.co-dinh{table-layout:fixed;mso-table-layout-alt:fixed}' +
      'th,td{border:1px solid #000;padding:4pt 6pt;font-size:12pt;vertical-align:top;' +
      'word-wrap:break-word;overflow-wrap:break-word}' +
      'th{background:#e8e8e8;font-weight:bold;text-align:center}' +
      'thead{display:table-header-group}tr{page-break-inside:avoid}' +
      '.giua{text-align:center}.phai{text-align:right}.nghieng{font-style:italic}' +
      // Ô chứa đường dẫn Drive: chuỗi ID dài không có dấu cách, phải cho ngắt
      // giữa chừng, nếu không Word nong cột đó ra và bóp các cột còn lại.
      '.duongdan{font-size:10.5pt;word-break:break-all}' +
      '</style></head><body><div class="Section1">' + than + '</div></body></html>';
  }

  // Đường kẻ ngang dưới tên cơ quan / tiêu ngữ — dựng bằng DÃY DẤU CÁCH CỨNG
  // ĐƯỢC GẠCH CHÂN. Hai cách hiển nhiên hơn đều hỏng khi mở bằng Word:
  //  · <div style="width:…"> → Word đổi thành ĐOẠN VĂN, mà đoạn văn không có
  //    chiều rộng nên kẻ hết chiều ngang ô
  //  · bảng lồng có width → bị luật table{width:100%} của khung kéo giãn hết ô
  // Gạch chân dấu cách thì Word giữ đúng chiều dài. Trong Times New Roman, dấu
  // cách rộng 0,25em → cỡ 12pt là 0,106cm mỗi dấu.
  function gach(rongCm, cot) {
    var co = cot || 12;
    var n = Math.max(4, Math.round(rongCm / (0.0088 * co)));
    return '<p class="giua" style="margin:1pt 0 0;font-size:' + co + 'pt;line-height:1"><u>' +
      new Array(n + 1).join('&nbsp;') + '</u></p>';
  }

  // Kẻ dưới tên cơ quan ban hành: NĐ 30 quy định dài bằng 1/3 đến 1/2 dòng
  // chữ. Tên trường mỗi trường một khác nên tính theo số ký tự (~0,24cm mỗi
  // ký tự in hoa cỡ 12pt) rồi lấy 40% — đúng tỉ lệ đo được trên bản mẫu chuẩn.
  function gachTenTruong(ten) {
    return gach(Math.max(2.2, Math.min(4, ten.length * 0.24 * 0.4)));
  }

  // Thể thức NĐ 30 (Phụ lục I) — thông số đo trên bản mẫu chuẩn của trường:
  //  · ô trái 44%: chủ quản in hoa KHÔNG đậm · tên trường in hoa VÀ đậm, MỘT DÒNG
  //  · ô phải 56%: Quốc hiệu in hoa đậm 12pt · tiêu ngữ đậm 13pt, kẻ dưới 4,4cm
  //  · địa danh + ngày tháng in nghiêng, canh giữa NGAY DƯỚI ô Quốc hiệu
  function theThuc() {
    return '<table style="border:none;width:100%;border-collapse:collapse"><tr>' +
      '<td style="border:none;padding:0;width:' + O_TRAI + '%;text-align:center;vertical-align:top;font-size:12pt">' +
      chan(cauHinh('DON_VI_CHU_QUAN').toUpperCase()) + '<br>' +
      '<b>' + chan(cauHinh('TEN_TRUONG').toUpperCase()) + '</b>' +
      gachTenTruong(cauHinh('TEN_TRUONG')) + '</td>' +
      '<td style="border:none;padding:0;width:' + O_PHAI + '%;text-align:center;vertical-align:top;font-size:12pt">' +
      '<b style="white-space:nowrap">CỘNG&nbsp;HÒA&nbsp;XÃ&nbsp;HỘI&nbsp;CHỦ&nbsp;NGHĨA&nbsp;VIỆT&nbsp;NAM</b><br>' +
      '<b style="font-size:13pt">Độc lập - Tự do - Hạnh phúc</b>' +
      gach(4.4, 13) +
      '<p class="nghieng" style="margin:10pt 0 0;font-size:13pt">' +
      chan(diaDanh()) + ', ' + ngayVN() + '</p></td>' +
      '</tr></table>';
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
    gach: gach, gachTenTruong: gachTenTruong, O_TRAI: O_TRAI, O_PHAI: O_PHAI,
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
      // Tên loại (in hoa, đậm, 14pt) rồi trích yếu (chữ thường, đậm). KHÔNG kẻ
      // ngang dưới trích yếu — bản mẫu chuẩn của trường không có đường kẻ đó.
      '<p class="giua" style="font-size:14pt;font-weight:bold;margin:14pt 0 0">PHIẾU GIAO VIỆC</p>' +
      '<p class="giua" style="font-size:13pt;font-weight:bold;margin:4pt 0 16pt">' +
      'Hoàn thiện hồ sơ minh chứng - Hộp ' + chan(maHop) + '. ' + chan(hop.ten) + '</p>' +
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
