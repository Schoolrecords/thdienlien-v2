// ============================================================
// xuat-excel.js — SINH TỆP .xlsx THẬT, CÓ ĐỊNH DẠNG
// ============================================================
// VÌ SAO PHẢI TỰ VIẾT:
//   · SheetJS bản miễn phí ghi được .xlsx nhưng KHÔNG ghi định dạng — không
//     viền, không màu, không khổ giấy. Tệp ra trắng trơn, in không dùng được.
//   · Dựng bằng HTML (.xls) hay SpreadsheetML (.xml) thì đẹp, nhưng Windows
//     không nhận ra là tệp Excel: thầy cô tải về thấy "XML Document", nhấp
//     đúp là mở bằng trình duyệt. Đổi đuôi thành .xls thì Excel lại kêu
//     "định dạng không khớp phần mở rộng" mỗi lần mở.
//
// Nên ở đây tự đóng gói .xlsx đúng chuẩn OOXML. Không cần thư viện nén:
// định dạng zip cho phép lưu KHÔNG NÉN (stored) — chỉ cần đúng header, CRC32
// và bảng thư mục cuối tệp. Tệp to hơn chút, nhưng đổi lại không phụ thuộc
// gì bên ngoài, mà tệp mẫu vài chục KB thì chẳng đáng kể.
//
// Dùng: window.EXCEL_DEP.tao({ ten, sheets: [...] })
// ============================================================
(function () {
  'use strict';

  // ══════════ ZIP (lưu không nén) ══════════
  var BANG_CRC = (function () {
    var b = new Int32Array(256);
    for (var n = 0; n < 256; n++) {
      var c = n;
      for (var k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      b[n] = c;
    }
    return b;
  })();
  function crc32(u8) {
    var c = -1;
    for (var i = 0; i < u8.length; i++) c = (c >>> 8) ^ BANG_CRC[(c ^ u8[i]) & 0xFF];
    return (c ^ -1) >>> 0;
  }
  function chuSangByte(s) {
    // Tự mã hoá UTF-8, không dùng TextEncoder để chạy được cả trên máy cũ
    var ra = [], i, c;
    for (i = 0; i < s.length; i++) {
      c = s.charCodeAt(i);
      if (c < 0x80) ra.push(c);
      else if (c < 0x800) ra.push(0xC0 | (c >> 6), 0x80 | (c & 63));
      else if (c >= 0xD800 && c <= 0xDBFF) {          // cặp thay thế (emoji…)
        var c2 = s.charCodeAt(++i);
        c = 0x10000 + ((c - 0xD800) << 10) + (c2 - 0xDC00);
        ra.push(0xF0 | (c >> 18), 0x80 | ((c >> 12) & 63), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
      } else ra.push(0xE0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
    }
    return new Uint8Array(ra);
  }
  function so2(a, v) { a.push(v & 255, (v >> 8) & 255); }
  function so4(a, v) { a.push(v & 255, (v >> 8) & 255, (v >> 16) & 255, (v >>> 24) & 255); }

  function dongGoiZip(tep) {         // tep: [{ ten, chu }]
    var cuc = [], muc = [], viTri = 0;
    tep.forEach(function (t) {
      var du = chuSangByte(t.chu), tenB = chuSangByte(t.ten), c = crc32(du);
      var h = [];
      so4(h, 0x04034b50); so2(h, 20); so2(h, 0x0800);   // cờ 0x800 = tên tệp UTF-8
      so2(h, 0); so2(h, 0); so2(h, 0);                   // không nén, giờ/ngày 0
      so4(h, c); so4(h, du.length); so4(h, du.length);
      so2(h, tenB.length); so2(h, 0);
      cuc.push(new Uint8Array(h), tenB, du);

      var m = [];
      so4(m, 0x02014b50); so2(m, 20); so2(m, 20); so2(m, 0x0800);
      so2(m, 0); so2(m, 0); so2(m, 0);
      so4(m, c); so4(m, du.length); so4(m, du.length);
      so2(m, tenB.length); so2(m, 0); so2(m, 0); so2(m, 0); so2(m, 0);
      so4(m, 0); so4(m, viTri);
      muc.push(new Uint8Array(m), tenB);

      viTri += h.length + tenB.length + du.length;
    });
    var dauMuc = viTri, coMuc = 0;
    muc.forEach(function (x) { coMuc += x.length; });
    var cuoi = [];
    so4(cuoi, 0x06054b50); so2(cuoi, 0); so2(cuoi, 0);
    so2(cuoi, tep.length); so2(cuoi, tep.length);
    so4(cuoi, coMuc); so4(cuoi, dauMuc); so2(cuoi, 0);

    var tong = viTri + coMuc + cuoi.length;
    var ra = new Uint8Array(tong), v = 0;
    cuc.concat(muc).concat([new Uint8Array(cuoi)]).forEach(function (x) { ra.set(x, v); v += x.length; });
    return ra;
  }

  // ══════════ OOXML ══════════
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
  }
  function tenCot(i) {                 // 0 -> A, 26 -> AA
    var s = '';
    for (i++; i > 0; i = Math.floor((i - 1) / 26)) s = String.fromCharCode(65 + (i - 1) % 26) + s;
    return s;
  }

  // Bộ kiểu dùng chung cho mọi tệp trường xuất ra.
  // Thứ tự trong bốn mảng dưới đây CHÍNH LÀ chỉ số mà cellXfs trỏ tới —
  // thêm bớt phải sửa cả hai chỗ, nếu không Excel tô nhầm màu.
  var PHONG = [
    { co: 11 },                                          // 0 mặc định
    { co: 11, dam: 1, mau: 'FFFFFFFF' },                 // 1 tiêu đề bảng
    { co: 16, dam: 1, mau: 'FF14306B' },                 // 2 tiêu đề lớn
    { co: 10, nghieng: 1, mau: 'FF5A6B8C' },             // 3 chú thích
    { co: 11, dam: 1, mau: 'FF14306B' },                 // 4 đậm navy
    { co: 10, mau: 'FF5A6B8C' },                         // 5 chữ phụ
    { co: 9,  mau: 'FF5A6B8C' },                         // 6 rất nhỏ
    { co: 11, nghieng: 1 }                               // 7 nghiêng
  ];
  var NEN = ['none', 'gray125', 'FF14306B', 'FFDDE5F0', 'FFEEF2F9', 'FFF7F9FC'];
  // cellXfs: [phông, nền, có viền, canh ngang, xuống dòng]
  var KIEU = {
    thuong:  [0, 0, 0, '', 0],
    tt:      [2, 0, 0, 'center', 0],
    tt2:     [0, 0, 0, 'center', 0],
    tt3:     [3, 0, 0, 'center', 0],
    dau:     [1, 2, 1, 'center', 0],
    dau2:    [4, 3, 1, 'center', 0],
    thu:     [4, 4, 1, 'center', 0],
    buoi:    [5, 0, 1, 'center', 0],
    tiet:    [5, 0, 1, 'center', 0],
    nhapS:   [0, 0, 1, 'left', 1],
    nhapC:   [0, 5, 1, 'left', 1],
    sis:     [6, 4, 1, 'center', 0],
    oL:      [0, 0, 1, 'left', 1],
    oG:      [0, 0, 1, 'center', 0],
    oB:      [4, 0, 1, 'left', 0],
    ky:      [7, 0, 0, 'right', 0],
    hd:      [0, 0, 0, 'left', 1],
    hdb:     [4, 0, 0, 'left', 1]
  };
  var THU_TU_KIEU = Object.keys(KIEU);
  function soKieu(ten) {
    var i = THU_TU_KIEU.indexOf(ten);
    return i < 0 ? 0 : i;
  }

  function xmlStyles() {
    var fonts = PHONG.map(function (f) {
      return '<font><sz val="' + f.co + '"/>' + (f.dam ? '<b/>' : '') + (f.nghieng ? '<i/>' : '') +
        '<color rgb="' + (f.mau || 'FF1C2B4A') + '"/><name val="Times New Roman"/></font>';
    }).join('');
    var fills = NEN.map(function (n) {
      return n === 'none' || n === 'gray125'
        ? '<fill><patternFill patternType="' + n + '"/></fill>'
        : '<fill><patternFill patternType="solid"><fgColor rgb="' + n + '"/>' +
          '<bgColor indexed="64"/></patternFill></fill>';
    }).join('');
    var canh = '<border><left/><right/><top/><bottom/><diagonal/></border>' +
      '<border>' + ['left', 'right', 'top', 'bottom'].map(function (p) {
        return '<' + p + ' style="thin"><color rgb="FF7F8FA6"/></' + p + '>';
      }).join('') + '<diagonal/></border>';
    var xfs = THU_TU_KIEU.map(function (k) {
      var d = KIEU[k];
      return '<xf numFmtId="0" fontId="' + d[0] + '" fillId="' + d[1] + '" borderId="' + d[2] + '"' +
        ' applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">' +
        '<alignment' + (d[3] ? ' horizontal="' + d[3] + '"' : '') +
        ' vertical="center"' + (d[4] ? ' wrapText="1"' : '') + '/></xf>';
    }).join('');
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
      '<fonts count="' + PHONG.length + '">' + fonts + '</fonts>' +
      '<fills count="' + NEN.length + '">' + fills + '</fills>' +
      '<borders count="2">' + canh + '</borders>' +
      '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
      '<cellXfs count="' + THU_TU_KIEU.length + '">' + xfs + '</cellXfs>' +
      '</styleSheet>';
  }

  // sheet: { ten, cols:[rộng], rows:[{cao, o:[{v, k, so, gopN, gopD, bo}]}], in:{...} }
  function xmlSheet(s) {
    var gop = [];
    var rows = s.rows.map(function (r, ri) {
      var cot = 0;
      var oXml = (r.o || []).map(function (c) {
        if (c && c.bo) { cot += 1; return ''; }        // ô bị ô gộp bên trên nuốt
        var dc = tenCot(cot) + (ri + 1);
        if (c && (c.gopN || c.gopD)) {
          gop.push(dc + ':' + tenCot(cot + (c.gopN || 0)) + (ri + 1 + (c.gopD || 0)));
        }
        var k = soKieu((c && c.k) || 'thuong');
        var noi = '';
        if (c && c.v !== '' && c.v != null) {
          noi = c.so
            ? '<v>' + Number(c.v) + '</v>'
            : '<is><t xml:space="preserve">' + esc(c.v) + '</t></is>';
        }
        var x = '<c r="' + dc + '" s="' + k + '"' + (c && c.so ? '' : ' t="inlineStr"') + '>' + noi + '</c>';
        cot += 1 + ((c && c.gopN) || 0);
        return x;
      }).join('');
      return '<row r="' + (ri + 1) + '"' + (r.cao ? ' ht="' + r.cao + '" customHeight="1"' : '') + '>' +
        oXml + '</row>';
    }).join('');

    var i = s.in || {};
    var dongBang = i.dongBang ? '<pane ySplit="' + i.dongBang + '" xSplit="' + (i.cotBang || 0) +
      '" topLeftCell="' + tenCot(i.cotBang || 0) + (i.dongBang + 1) +
      '" activePane="bottomRight" state="frozen"/>' : '';

    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
      (i.vuaTrang ? '<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>' : '') +
      '<sheetViews><sheetView workbookViewId="0" showGridLines="0">' + dongBang + '</sheetView></sheetViews>' +
      '<sheetFormatPr defaultRowHeight="15"/>' +
      (s.cols && s.cols.length
        ? '<cols>' + s.cols.map(function (w, ci) {
            return '<col min="' + (ci + 1) + '" max="' + (ci + 1) + '" width="' + w + '" customWidth="1"/>';
          }).join('') + '</cols>'
        : '') +
      '<sheetData>' + rows + '</sheetData>' +
      (gop.length ? '<mergeCells count="' + gop.length + '">' +
        gop.map(function (g) { return '<mergeCell ref="' + g + '"/>'; }).join('') + '</mergeCells>' : '') +
      '<pageMargins left="0.4" right="0.4" top="0.5" bottom="0.5" header="0.3" footer="0.3"/>' +
      '<pageSetup paperSize="9" orientation="' + (i.doc ? 'portrait' : 'landscape') + '"' +
        (i.vuaTrang ? ' fitToWidth="1" fitToHeight="1"' : ' fitToWidth="1" fitToHeight="0"') + '/>' +
      (i.dauTrang || i.chanTrang
        ? '<headerFooter><oddHeader>&amp;R&amp;9' + esc(i.dauTrang || '') + '</oddHeader>' +
          '<oddFooter>' + esc(i.chanTrang || '') + '</oddFooter></headerFooter>'
        : '') +
      '</worksheet>';
  }

  window.EXCEL_DEP = {
    kieu: KIEU,
    tao: function (opt) {
      var sheets = opt.sheets || [];
      var tep = [];
      tep.push({ ten: '[Content_Types].xml',
        chu: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
          '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
          '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
          '<Default Extension="xml" ContentType="application/xml"/>' +
          '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
          sheets.map(function (s, i) {
            return '<Override PartName="/xl/worksheets/sheet' + (i + 1) + '.xml" ' +
              'ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>';
          }).join('') +
          '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
          '</Types>' });
      tep.push({ ten: '_rels/.rels',
        chu: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
          '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
          '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
          '</Relationships>' });
      tep.push({ ten: 'xl/workbook.xml',
        chu: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
          '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" ' +
          'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>' +
          sheets.map(function (s, i) {
            return '<sheet name="' + esc(s.ten) + '" sheetId="' + (i + 1) + '" r:id="rId' + (i + 1) + '"/>';
          }).join('') + '</sheets></workbook>' });
      tep.push({ ten: 'xl/_rels/workbook.xml.rels',
        chu: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
          '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
          sheets.map(function (s, i) {
            return '<Relationship Id="rId' + (i + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet' + (i + 1) + '.xml"/>';
          }).join('') +
          '<Relationship Id="rId' + (sheets.length + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
          '</Relationships>' });
      tep.push({ ten: 'xl/styles.xml', chu: xmlStyles() });
      sheets.forEach(function (s, i) {
        tep.push({ ten: 'xl/worksheets/sheet' + (i + 1) + '.xml', chu: xmlSheet(s) });
      });
      return dongGoiZip(tep);
    }
  };
})();
