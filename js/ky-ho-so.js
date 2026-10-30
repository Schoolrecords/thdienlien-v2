// ============================================================
// ky-ho-so.js — KÝ HỒ SƠ (GIÁO ÁN PDF) NGAY TRONG APP (30/10/2026)
//
// Thầy Chung 30/10/2026 (QC2, trước buổi tập huấn): tổ trưởng phải tải giáo án
// về, ký bằng Edge, tải lên thay tệp cũ — "nhiều thao tác quá"; hỏi cách mở PDF
// trên trình duyệt, nhận xét, ký rồi lưu lại. Không trình duyệt nào lưu đè được
// đúng tệp trong thư mục giáo viên (Chrome "Lưu vào Drive" chỉ tạo BẢN SAO; ký
// điện tử của Drive cần Workspace trả phí) → làm ngay trong app:
//
//   ✍ trên thẻ giáo viên (màn Hồ sơ CBGV – NV) → danh sách PDF trong thư mục
//   hồ sơ → bấm một tệp: các trang hiện trong khung → gõ nhận xét, chọn kết
//   luận → bấm vào trang chỗ muốn ký (kéo để dời) → "Ký và lưu vào Drive".
//
// Khối chữ ký (kết luận · nhận xét · địa danh, ngày · chức danh · chữ ký · họ
// tên) vẽ thành ẢNH bằng canvas rồi pdf-lib dán vào trang — chữ Việt đủ dấu mà
// không phải nhúng phông vào PDF. Dịch vụ Apps Script của Gmail chủ cây thư mục
// (thdienlien-v2-tailieu/apps-script/ky-ho-so-drive.gs, URL ở
// cau_hinh.link_ky_ho_so) kiểm quyền bằng CSDL của trường, ghi đè ĐÚNG tệp đó
// (cùng id, cùng chỗ), giữ vĩnh viễn bản trước khi ký trong Lịch sử phiên bản.
// Chưa khai link_ky_ho_so thì không có nút ✍ — trường khác không đổi gì.
//
// Ai thấy nút: đúng luật mở thư mục (du-lieu-sql.js moDuoc) trừ hồ sơ của chính
// mình — BGH/quản trị: mọi hồ sơ · tổ trưởng, tổ phó: người cùng tổ. Dịch vụ
// kiểm lại y hệt; ẩn/hiện nút ở đây chỉ để giao diện gọn.
//
// Chữ ký tay lưu trên MÁY (localStorage, theo Gmail) — ký một lần, lần sau
// dùng lại; không đưa lên CSDL.
// ============================================================
(function () {
  'use strict';

  var PDFJS = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/';
  var PDFLIB = 'https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js';
  var MUC = '#1b3a8f';           // màu mực xanh của khối chữ ký
  // Dòng kết luận mực ĐỎ (thầy Chung 30/10) — chỉ lời kết luận; chữ ký, họ tên giữ
  // mực xanh vì NĐ 30/2020 không dùng mực đỏ khi ký văn bản.
  var MUC_DO = '#b3261e';
  var phien = null;              // khung đang mở

  function t(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function boDau(s) {
    return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd');
  }
  function baoNhanh(s) { if (window.notify) window.notify(s); }
  function C() { return window.CAU_HINH || {}; }
  function emailToi() { return String((window.NGUOI_DUNG || {}).email || '').trim().toLowerCase(); }
  function nho(khoa, gt) {
    try {
      if (gt === undefined) return localStorage.getItem('khs:' + khoa + ':' + emailToi());
      if (gt === null) localStorage.removeItem('khs:' + khoa + ':' + emailToi());
      else localStorage.setItem('khs:' + khoa + ':' + emailToi(), gt);
    } catch (e) { /* trình duyệt chặn lưu — chỉ mất phần nhớ */ }
    return null;
  }

  // ── Nạp thư viện (tải chậm, lần đầu bấm ✍) ──
  var huaJs = {};
  function napJs(src, ten) {
    if (huaJs[src]) return huaJs[src];
    huaJs[src] = new Promise(function (ok, hong) {
      var s = document.createElement('script');
      s.src = src;
      s.onload = function () { ok(); };
      s.onerror = function () { delete huaJs[src]; hong(new Error('Không tải được ' + ten + ' (mạng chập chờn?)')); };
      document.head.appendChild(s);
    });
    return huaJs[src];
  }
  function napPdfJs() {
    if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
    return napJs(PDFJS + 'pdf.min.js', 'bộ đọc PDF').then(function () {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS + 'pdf.worker.min.js';
      return window.pdfjsLib;
    });
  }
  function napPdfLib() {
    if (window.PDFLib) return Promise.resolve(window.PDFLib);
    return napJs(PDFLIB, 'bộ ghi PDF').then(function () { return window.PDFLib; });
  }

  // ── Gọi dịch vụ Apps Script ──
  var LOI = {
    het_phien: 'Phiên đăng nhập đã hết. Thầy cô tải lại trang rồi thử lại.',
    chua_duyet: 'Tài khoản chưa được duyệt nên chưa ký được.',
    khong_phai_ho_so: 'Thư mục này không phải thư mục hồ sơ của thầy cô nào trong trường.',
    tu_ky: 'Không tự ký hồ sơ của chính mình.',
    khong_quyen: 'Chỉ Ban giám hiệu và tổ trưởng, tổ phó cùng tổ được ký hồ sơ này.',
    khong_quyen_bgh: 'Chỉ Hiệu trưởng, Phó Hiệu trưởng được ký, đóng dấu hồ sơ của trường.',
    tep_da_doi: 'Tệp vừa được thay hoặc sửa sau lúc thầy cô mở. Mở lại tệp rồi ký lại.',
    tep_qua_lon: 'Tệp lớn quá 15 MB, chưa ký trong app được.',
    khong_phai_pdf: 'Tệp này không phải PDF.',
    ngoai_thu_muc: 'Tệp không nằm trong thư mục hồ sơ này.',
    truong_la: 'Dịch vụ ký chưa khai trường này. Báo quản trị viên.',
    drive_tu_choi: 'Drive không cho ghi tệp. Báo quản trị viên.',
    loi_may: 'Dịch vụ ký gặp lỗi. Thử lại sau ít phút.'
  };
  function goi(viec, them) {
    var url = C().LINK_KY_HO_SO;
    if (!url || !window.MAY_CHU) return Promise.reject(new Error('Trường chưa bật chức năng ký.'));
    return window.MAY_CHU.auth.getSession().then(function (r) {
      var tk = r && r.data && r.data.session && r.data.session.access_token;
      if (!tk) throw new Error(LOI.het_phien);
      var than = Object.assign({ viec: viec, ma: String(C().MA || ''), token: tk }, them);
      // ⚠️ KHÔNG đặt Content-Type: application/json là dính preflight mà Apps Script không trả lời
      return fetch(url, { method: 'POST', body: JSON.stringify(than), redirect: 'follow' });
    }).then(function (res) {
      if (!res.ok) throw new Error('Dịch vụ ký không trả lời (mã ' + res.status + ').');
      return res.json();
    }).then(function (kq) {
      if (kq && kq.loi) {
        // Lỗi phía Drive / máy: kèm mã lỗi gốc (cắt ngắn) để chụp màn hình là dò ra
        var them = (kq.loi === 'drive_tu_choi' || kq.loi === 'loi_may') && kq.chi_tiet
          ? ' Mã lỗi: ' + String(kq.chi_tiet).replace(/\s+/g, ' ').slice(0, 160) : '';
        var e = new Error((LOI[kq.loi] || ('Lỗi: ' + kq.loi)) + them);
        e.ma = kq.loi;
        throw e;
      }
      return kq;
    });
  }

  function b64SangByte(b64) {
    var s = atob(b64), n = s.length, a = new Uint8Array(n);
    for (var i = 0; i < n; i++) a[i] = s.charCodeAt(i);
    return a;
  }
  function byteSangB64(a) {
    var s = '', KHUC = 0x8000;
    for (var i = 0; i < a.length; i += KHUC) s += String.fromCharCode.apply(null, a.subarray(i, i + KHUC));
    return btoa(s);
  }

  // ── Ngày theo thể thức NĐ 30: ngày dưới 10 thêm 0; tháng chỉ 1, 2 thêm 0 ──
  function chuNgay(d) {
    var ng = d.getDate(), th = d.getMonth() + 1;
    return 'ngày ' + (ng < 10 ? '0' : '') + ng + ' tháng ' + (th < 3 ? '0' : '') + th + ' năm ' + d.getFullYear();
  }
  function chucDanhTu(cv, loai) {
    var b = boDau(cv).trim();
    // Hồ sơ của trường (danh mục): Phó Hiệu trưởng ký thay Hiệu trưởng (NĐ 30)
    if (/^pho hieu truong/.test(b)) return loai === 'ho_so' ? 'KT. HIỆU TRƯỞNG\nPHÓ HIỆU TRƯỞNG' : 'PHÓ HIỆU TRƯỞNG';
    if (/^hieu truong/.test(b)) return 'HIỆU TRƯỞNG';
    if (/^to pho/.test(b)) return 'TỔ PHÓ';
    if (/^to truong/.test(b)) return 'TỔ TRƯỞNG';
    return 'NGƯỜI KIỂM TRA';
  }

  // ── Khối chữ ký vẽ thành ảnh. rong = bề ngang theo px màn hình; trả canvas
  //    độ phân giải x3 (in ra vẫn nét) kèm kích thước hiển thị.
  var anhChuKy = null;   // Image của chữ ký đang dùng
  function veKhoi(o, rong) {
    var tl = 3, co = rong / 260;                 // cỡ chữ co giãn theo bề ngang khối
    var c = document.createElement('canvas'), g = c.getContext('2d');
    var dem = 6 * co, cao = 0, dong = [];
    var PH = '"Times New Roman", Times, serif';
    function f(px, dam, nghieng) { return (nghieng ? 'italic ' : '') + (dam ? 'bold ' : '') + Math.round(px * co * tl) / tl + 'px ' + PH; }
    // Thầy Chung 30/10: kết luận, nhận xét canh trái lệch với cụm ngày tháng – chữ
    // ký canh giữa → CANH GIỮA CẢ KHỐI, và ngắt dòng CÂN (các dòng dài gần bằng
    // nhau, không để dòng cuối trơ một hai chữ).
    function ngat(doan, rongToiDa) {
      var tu = doan.split(/\s+/).filter(Boolean), kq = [], hang = '';
      tu.forEach(function (w) {
        var thu = hang ? hang + ' ' + w : w;
        if (g.measureText(thu).width > rongToiDa && hang) { kq.push(hang); hang = w; }
        else hang = thu;
      });
      kq.push(hang);
      return kq;
    }
    function bo(chu, px, dam, nghieng, mau) {
      g.font = f(px, dam, nghieng);
      var toiDa = rong - 2 * dem;
      String(chu).split(/\n/).forEach(function (doan) {
        var hang = ngat(doan, toiDa);
        if (hang.length > 1) {            // tìm bề ngang nhỏ nhất mà vẫn đủ ngần ấy dòng
          var lo = toiDa * .4, hi = toiDa;
          for (var k = 0; k < 14; k++) {
            var giua = (lo + hi) / 2;
            if (ngat(doan, giua).length > hang.length) lo = giua; else hi = giua;
          }
          hang = ngat(doan, hi);
        }
        hang.forEach(function (h) { dong.push({ s: h, f: f(px, dam, nghieng), px: px, giua: true, mau: mau }); });
      });
    }
    if (o.ketLuan) bo(o.ketLuan, 13.5, true, false, MUC_DO);
    if (o.nhanXet) bo(o.nhanXet, 13, false);
    var dauKy = dong.length;
    bo(o.diaDanh ? o.diaDanh + ', ' + chuNgay(new Date()) : chuNgay(new Date()).replace(/^n/, 'N'), 12.5, false, true);   // NĐ 30: in nghiêng
    if (o.chucDanh) bo(o.chucDanh, 13, true);
    // Đóng dấu (BGH): dấu đúng cỡ thật — o.dauTiLe = đường kính dấu / bề ngang khối,
    // tính sẵn từ cỡ trang (veLaiKhoi) — nên chỗ ký cao bằng con dấu.
    var dauD = (o.dau && o.dauTiLe) ? o.dauTiLe * rong : 0;
    var caoKy = Math.max(46 * co, dauD * .95), iKy = dong.length;
    if (o.hoTen) bo(o.hoTen, 13.5, true);

    var dg = function (d) { return d.px * co * 1.38; };
    dong.forEach(function (d, i) { cao += dg(d); if (i === dauKy && dauKy > 0) cao += 9 * co; });
    cao += caoKy + 2 * dem;
    c.width = Math.ceil(rong * tl); c.height = Math.ceil(cao * tl);
    g.scale(tl, tl);
    g.fillStyle = MUC; g.textBaseline = 'top';
    var y = dem, yKy = -1, kyTrai = rong / 2, kyRong = 0;
    function veChuKy() {
      yKy = y;
      if (anhChuKy) {
        // có dấu: chữ ký gọn lại ~3/4 bề ngang cho dấu khỏi che kín
        var r = Math.min((rong - 2 * dem) * (dauD ? .75 : 1) / anhChuKy.width, Math.min(caoKy, 60 * co) / anhChuKy.height);
        var w = anhChuKy.width * r, h = anhChuKy.height * r;
        kyTrai = (rong - w) / 2; kyRong = w;
        g.drawImage(anhChuKy, kyTrai, y + (caoKy - h) / 2, w, h);
      }
      y += caoKy;
    }
    dong.forEach(function (d, i) {
      if (i === dauKy && dauKy > 0) y += 9 * co;
      if (i === iKy) veChuKy();
      g.font = d.f;
      g.fillStyle = d.mau || MUC;
      g.textAlign = d.giua ? 'center' : 'left';
      g.fillText(d.s, d.giua ? rong / 2 : dem, y + d.px * co * .16);
      y += dg(d);
    });
    if (iKy >= dong.length) veChuKy();   // không có họ tên: chữ ký vẫn phải vẽ
    // Dấu vẽ SAU CÙNG, đè lên chữ ký: NĐ 30 — dấu trùm khoảng 1/3 chữ ký về bên trái
    if (dauD) {
      var R = dauD / 2, s = Math.max(o.dau.width, o.dau.height);
      var cx = kyRong ? kyTrai + kyRong / 3 - R * .9 : rong / 2 - R * .4;
      cx = Math.max(R + 1, Math.min(cx, rong - R - 1));
      var cy = yKy + caoKy / 2;
      g.save();
      g.globalAlpha = .9;
      g.globalCompositeOperation = 'multiply';   // nét chữ ký vẫn lộ qua mực dấu như dấu thật
      g.drawImage(o.dau, cx - R * o.dau.width / s, cy - R * o.dau.height / s, dauD * o.dau.width / s, dauD * o.dau.height / s);
      g.restore();
    }
    return { canvas: c, rong: rong, cao: cao };
  }

  // ══════════════════════════════════════════════════════════════
  // KHUNG
  // ══════════════════════════════════════════════════════════════
  function dong() {
    if (!phien) return;
    var p = phien; phien = null;
    p.huy = true;
    document.removeEventListener('keydown', phim);
    document.documentElement.classList.remove('ck-xvb-khoa');
    if (p.quan) p.quan.disconnect();
    if (p.pdf) { try { p.pdf.destroy(); } catch (e) { /* đã huỷ */ } }
    if (p.phu.parentNode) p.phu.parentNode.removeChild(p.phu);
    if (p.tro && p.tro.focus) p.tro.focus();
  }
  function phim(e) {
    if (e.key !== 'Escape' || !phien) return;
    if (phien.phu.querySelector('.khs-bang-ky:not([hidden])')) { dongBangKy(); return; }
    dong();
  }

  function mo(thuMuc, hoTen, tro, loai) {
    loai = loai === 'ho_so' ? 'ho_so' : 'giao_vien';
    dong();
    var phu = document.createElement('div');
    phu.className = 'ck-xvb-phu khs-phu';
    phu.innerHTML =
      '<div class="ck-xvb khs" role="dialog" aria-modal="true" aria-label="Ký hồ sơ">' +
        '<div class="ck-xvb-dau">' +
          '<div class="ck-xvb-tt"><h4>Ký hồ sơ · ' + t(hoTen) + '</h4>' +
          '<p data-khs="phu-de">Chọn tệp PDF cần kiểm tra</p></div>' +
          '<div class="ck-xvb-nut"><button type="button" class="ht-x" data-khs="dong" aria-label="Đóng">✕</button></div>' +
        '</div>' +
        '<div class="khs-than" data-khs="than"><p class="ck-xvb-cho">Đang mở thư mục hồ sơ…</p></div>' +
        bangKyHtml() +
      '</div>';
    document.body.appendChild(phu);
    phien = { phu: phu, thuMuc: thuMuc, hoTen: hoTen, tro: tro, loai: loai, huy: false, ds: [], nguoiKy: {} };
    document.documentElement.classList.add('ck-xvb-khoa');
    document.addEventListener('keydown', phim);
    phu.addEventListener('click', bam);
    phu.addEventListener('input', doiO);
    phu.addEventListener('change', doiO);
    phu.querySelector('[data-khs="dong"]').focus();
    taiDanhSach(phien);
    napPdfJs().catch(function () { /* tải lại khi mở tệp */ });   // tải sẵn trong lúc chờ danh sách
  }

  function than(p) { return p.phu.querySelector('[data-khs="than"]'); }
  function phuDe(p, s) { p.phu.querySelector('[data-khs="phu-de"]').textContent = s; }

  function taiDanhSach(p) {
    goi('ds', { thu_muc: p.thuMuc, loai: p.loai }).then(function (kq) {
      if (p.huy) return;
      p.ds = kq.tep || [];
      p.nguoiKy = kq.nguoi_ky || {};
      veDanhSach(p);
    }).catch(function (e) {
      if (p.huy) return;
      than(p).innerHTML = '<p class="ck-xvb-cho">' + t(e.message) + '</p>';
    });
  }

  function nhanDaKy(s) {
    if (!s) return '';
    var x = String(s).split('|'), d = (x[0] || '').split('-');
    return 'Đã ký ' + (d.length === 3 ? d[2] + '/' + d[1] : '') + (x[1] ? ' · ' + x[1] : '');
  }

  function veDanhSach(p) {
    p.man = 'ds';
    phuDe(p, p.loai === 'ho_so' ? 'Chọn tệp PDF cần ký, đóng dấu' : 'Chọn tệp PDF cần kiểm tra');
    if (!p.ds.length) {
      than(p).innerHTML = '<p class="ck-xvb-cho">Thư mục hồ sơ chưa có tệp PDF nào.</p>';
      return;
    }
    var nhieu = p.ds.length > 8;
    than(p).innerHTML = '<div class="khs-ds">' +
      (nhieu ? '<input type="search" class="khs-tim" data-khs="tim" placeholder="🔍 Gõ tên tệp hoặc tuần để lọc" aria-label="Lọc tệp">' : '') +
      '<ul class="khs-tep">' + p.ds.map(function (f, i) {
        var ngay = f.sua_luc ? new Date(f.sua_luc) : null;
        return '<li data-tim="' + t(boDau(f.ten + ' ' + f.duong)) + '"><button type="button" data-khs="mo-tep" data-i="' + i + '">' +
          '<span class="ck-pdf">PDF</span>' +
          '<span class="khs-tep-tt"><b>' + t(f.ten) + '</b>' +
          '<small>' + t([f.duong, ngay ? 'sửa ' + ngay.toLocaleDateString('vi-VN') : ''].filter(Boolean).join(' · ')) + '</small></span>' +
          (f.da_ky ? '<span class="khs-da-ky">' + t(nhanDaKy(f.da_ky)) + '</span>' : '') +
          '</button></li>';
      }).join('') + '</ul></div>';
    var o = than(p).querySelector('[data-khs="tim"]');
    if (o) o.focus();
  }

  // ── Màn ký một tệp ──
  function moTep(p, i) {
    var f = p.ds[i];
    if (!f) return;
    if (p.quan) { p.quan.disconnect(); p.quan = null; }
    p.man = 'ky'; p.tep = f; p.dat = null; p.trang = [];
    phuDe(p, f.ten);
    var nk = p.nguoiKy || {};
    var hs = p.loai === 'ho_so', duoi = hs ? '-hs' : '';
    var chucDanh = nho('chuc-danh' + duoi) || chucDanhTu(nk.chuc_vu, p.loai);
    // Hồ sơ của trường (Hiệu trưởng, Phó Hiệu trưởng ký): thêm "Duyệt" và "Không ghi
    // kết luận"; hồ sơ giáo viên giữ bốn mức của tổ trưởng.
    var KL = (hs ? [['DUYỆT', 'Duyệt']] : []).concat([
      ['Đã kiểm tra. Đạt yêu cầu.', 'Đạt yêu cầu'],
      ['Đã kiểm tra. Đạt yêu cầu, cần điều chỉnh một số nội dung.', 'Đạt, cần điều chỉnh'],
      ['Đã kiểm tra. Chưa đạt yêu cầu, cần bổ sung.', 'Chưa đạt, cần bổ sung'],
      hs ? ['', 'Không ghi kết luận'] : ['Đã kiểm tra.', 'Chỉ ghi đã kiểm tra']]);
    var coDau = laBGH();
    var hoTen = nho('ho-ten') || nk.ho_ten || (window.NGUOI_DUNG || {}).ho_ten || '';
    than(p).innerHTML =
      '<div class="khs-ky">' +
        '<div class="khs-xem" data-khs="xem"><p class="ck-xvb-cho">Đang tải ' + (hs ? 'hồ sơ' : 'giáo án') +
          (f.co ? ' (' + (f.co / 1048576).toFixed(1).replace('.', ',') + ' MB)' : '') + '…</p></div>' +
        '<div class="khs-ben">' +
          '<button type="button" class="khs-lui" data-khs="lui">‹ Danh sách tệp</button>' +
          '<div class="khs-o"><span class="khs-nhan">Kết luận</span>' +
            '<div class="khs-chon">' +
              // Hồ sơ GV: bốn mức (thầy Chung hỏi 30/10 — tổ trưởng "kiểm tra", không "duyệt")
              KL.map(function (k, i) {
                return '<label><input type="radio" name="khs-kl" value="' + t(k[0]) + '"' + (i ? '' : ' checked') + '> ' + t(k[1]) + '</label>';
              }).join('') +
            '</div></div>' +
          '<label class="khs-o"><span class="khs-nhan">Nhận xét (không bắt buộc)</span>' +
            '<textarea data-khs="nx" rows="3" maxlength="400" placeholder="Ví dụ: Mục tiêu rõ, cần thêm hoạt động vận dụng."></textarea></label>' +
          '<div class="khs-hai">' +
            '<label class="khs-o"><span class="khs-nhan">Chức danh</span><textarea data-khs="cd" rows="2">' + t(chucDanh) + '</textarea></label>' +
            '<label class="khs-o"><span class="khs-nhan">Họ tên</span><input data-khs="ht" value="' + t(hoTen) + '"></label>' +
          '</div>' +
          '<div class="khs-o"><span class="khs-nhan">Chữ ký</span>' +
            '<div class="khs-chu-ky"><span data-khs="anh-ky" class="khs-anh-ky"></span>' +
            '<span class="khs-nut-ky"><button type="button" class="khs-nut-phu" data-khs="ky-moi">Ký mới</button>' +
            '<button type="button" class="khs-nut-phu khs-nut-xoa" data-khs="xoa-ky" hidden>Xoá</button></span></div></div>' +
          // Con dấu: chỉ Ban giám hiệu. Ảnh dấu chỉ nằm trên máy người ký (như chữ ký).
          (coDau
            ? '<div class="khs-o"><label class="khs-dong-dau"><input type="checkbox" data-khs="dong-dau"' + (hs ? ' checked' : '') + '> ' +
                '<span class="khs-nhan">Đóng dấu</span></label>' +
              '<div class="khs-chu-ky"><span data-khs="anh-dau" class="khs-anh-ky khs-anh-dau"></span>' +
              '<span class="khs-nut-ky"><button type="button" class="khs-nut-phu" data-khs="dau-chon">Chọn ảnh dấu</button>' +
              '<button type="button" class="khs-nut-phu khs-nut-xoa" data-khs="dau-xoa" hidden>Xoá</button></span></div>' +
              '<input type="file" accept="image/*" data-khs="dau-tep" hidden></div>'
            : '') +
          '<label class="khs-o"><span class="khs-nhan">Cỡ khối chữ ký</span>' +
            '<input type="range" data-khs="co" min="170" max="420" step="10" value="' + t(nho('co' + duoi) || (hs ? 340 : 240)) + '"></label>' +
          '<p class="khs-goi-y" data-khs="goi-y">Bấm vào trang giáo án, đúng chỗ muốn đặt chữ ký. Kéo khối chữ ký để dời chỗ.</p>' +
          '<button type="button" class="khs-lui khs-bo-khoi" data-khs="bo-khoi" hidden>✕ Bỏ khối chữ ký trên trang</button>' +
          '<button type="button" class="nut-chinh khs-luu" data-khs="luu" disabled>Ký và lưu vào Drive</button>' +
        '</div>' +
      '</div>';
    napChuKy(p);
    if (coDau) napDau(p);
    napPdfLib().catch(function () { /* tải lại lúc bấm lưu */ });   // tải sẵn — bấm lưu khỏi chờ
    var xem = p.phu.querySelector('[data-khs="xem"]');
    Promise.all([goi('tai', { thu_muc: p.thuMuc, loai: p.loai, tep: f.id }), napPdfJs()]).then(function (r) {
      if (p.huy || p.tep !== f) return;
      p.byte = b64SangByte(r[0].b64);
      p.suaLuc = r[0].sua_luc;
      return r[1].getDocument({ data: p.byte.slice() }).promise;   // pdf.js chiếm bộ đệm → đưa bản sao
    }).then(function (pdf) {
      if (!pdf || p.huy || p.tep !== f) return;
      if (p.pdf) { try { p.pdf.destroy(); } catch (e) { /* bỏ */ } }
      p.pdf = pdf;
      xem.innerHTML = '';
      var rongKhung = Math.min(xem.clientWidth - 44, 860);   // chừa thanh cuộn dọc, khỏi cuộn ngang
      // Thầy Chung 30/10: giáo án 19 trang mở chậm → chỉ VẼ trang sắp cuộn tới
      // (khung giấy đủ cỡ dựng sẵn cho cả tệp, nên đặt chữ ký trang nào cũng được).
      var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      function veTrang(giay) {
        var so = Number(giay.getAttribute('data-trang')), tr = p.trang[so];
        if (!tr || tr.da) return;
        tr.da = true;
        pdf.getPage(so + 1).then(function (trang) {
          if (p.huy || p.tep !== f) return;
          var cv = document.createElement('canvas');
          cv.width = Math.floor(tr.vp.width * dpr); cv.height = Math.floor(tr.vp.height * dpr);
          cv.style.width = tr.vp.width + 'px'; cv.style.height = tr.vp.height + 'px';
          giay.insertBefore(cv, giay.firstChild);
          return trang.render({ canvasContext: cv.getContext('2d'), viewport: tr.vp,
            transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : null }).promise;
        }).catch(function () { tr.da = false; });
      }
      var quan = ('IntersectionObserver' in window) ? new IntersectionObserver(function (ds) {
        ds.forEach(function (x) { if (x.isIntersecting) { quan.unobserve(x.target); veTrang(x.target); } });
      }, { root: xem, rootMargin: '900px 0px' }) : null;
      p.quan = quan;
      var n = 0;
      (function dungTiep() {
        if (p.huy || p.tep !== f || ++n > pdf.numPages) return;
        var so = n;
        pdf.getPage(so).then(function (trang) {
          if (p.huy || p.tep !== f) return;
          var v1 = trang.getViewport({ scale: 1 });
          var vp = trang.getViewport({ scale: rongKhung / v1.width });
          var giay = document.createElement('div');
          giay.className = 'ck-xvb-giay khs-giay';
          giay.setAttribute('data-trang', so - 1);
          giay.style.width = vp.width + 'px'; giay.style.height = vp.height + 'px';
          giay.insertAdjacentHTML('beforeend', '<span class="ck-xvb-so">' + so + ' / ' + pdf.numPages + '</span>');
          xem.appendChild(giay);
          p.trang[so - 1] = { vp: vp, giay: giay };
          if (quan) quan.observe(giay); else veTrang(giay);
          dungTiep();
        }, dungTiep);
      })();
    }).catch(function (e) {
      if (p.huy || p.tep !== f) return;
      xem.innerHTML = '<p class="ck-xvb-cho">' + t(e.message || 'Không mở được tệp này.') + '</p>';
    });
  }

  // Cỡ khối tính theo bề ngang TRANG GIẤY (thanh trượt = số px trên trang rộng
  // 860 px), không theo px màn hình — không thì ký trên điện thoại (trang hiện
  // rộng ~370 px) khối in ra to gấp đôi ký trên máy tính.
  var RONG_CHUAN = 860;
  function rongKhoi(p, tr) {
    var r = (Number(giaTri(p, 'co')) || 240) * tr.vp.width / RONG_CHUAN;
    // Có đóng dấu: khối rộng ít nhất ~2,2 lần đường kính dấu (≈ 77 mm), dấu khỏi tràn mép
    return (dongDau(p) && tr.vp.scale) ? Math.max(r, DAU_PT * tr.vp.scale * 2.2) : r;
  }
  // Con dấu tròn của trường: in đúng cỡ thật 35 mm (≈ 99 pt), không co giãn theo khối
  var DAU_PT = 35 / 25.4 * 72;
  var anhDau = null;
  function laBGH() { var v = (window.NGUOI_DUNG || {}).vai_tro; return v === 'admin' || v === 'ban_giam_hieu'; }
  function dongDau(p) {
    var o = p.phu.querySelector('[data-khs="dong-dau"]');
    return !!(o && o.checked && anhDau && laBGH());
  }
  function napDau(p) {
    var du = nho('dau'), o = p.phu.querySelector('[data-khs="anh-dau"]'), x = p.phu.querySelector('[data-khs="dau-xoa"]');
    anhDau = null;
    if (!o) return;
    if (x) x.hidden = !du;
    if (!du) { o.innerHTML = '<em>Chưa có ảnh dấu</em>'; veLaiKhoi(p); return; }
    var im = new Image();
    im.onload = function () { anhDau = im; o.innerHTML = ''; o.appendChild(im.cloneNode()); veLaiKhoi(p); };
    im.src = du;
  }
  // Ảnh chụp / quét con dấu: giữ nét MỰC ĐỎ, bỏ nền và mọi nét không đỏ, cắt sát
  function docAnhDau(p, tep) {
    if (!tep) return;
    var fr = new FileReader();
    fr.onload = function () {
      var im = new Image();
      im.onload = function () {
        var r = Math.min(1, 800 / Math.max(im.width, im.height)), c = document.createElement('canvas');
        c.width = Math.round(im.width * r); c.height = Math.round(im.height * r);
        var g = c.getContext('2d');
        g.drawImage(im, 0, 0, c.width, c.height);
        var a = g.getImageData(0, 0, c.width, c.height), d = a.data, coMuc = 0;
        for (var i = 0; i < d.length; i += 4) {
          var do_ = d[i] - Math.max(d[i + 1], d[i + 2]);
          if (d[i + 3] < 128 || do_ < 45) { d[i + 3] = 0; continue; }
          d[i] = 206; d[i + 1] = 24; d[i + 2] = 36; d[i + 3] = Math.min(255, do_ * 2.4); coMuc++;
        }
        if (coMuc < 200) { baoNhanh('Không thấy nét mực đỏ trong ảnh. Thầy cô chụp con dấu đỏ trên giấy trắng, đủ sáng.'); return; }
        g.putImageData(a, 0, 0);
        var cat = catSat(c);
        nho('dau', cat.toDataURL('image/png'));
        napDau(p);
      };
      im.src = fr.result;
    };
    fr.readAsDataURL(tep);
  }
  function xoaDau(p) {
    var hoi = window.hopHoi
      ? window.hopHoi({ tieuDe: 'Xoá ảnh con dấu?', noiDung: 'Máy này sẽ quên ảnh con dấu. Các tệp đã đóng dấu trên Drive không thay đổi.', nutOK: 'Xoá ảnh dấu', nguyHiem: true })
      : Promise.resolve(window.confirm('Xoá ảnh con dấu trên máy này?'));
    hoi.then(function (dongY) { if (dongY && !p.huy) { nho('dau', null); napDau(p); } });
  }
  function giaTri(p, k) { var o = p.phu.querySelector('[data-khs="' + k + '"]'); return o ? o.value : ''; }
  function thongTinKhoi(p, tr, rong) {
    var kl = p.phu.querySelector('input[name="khs-kl"]:checked');
    var o = { ketLuan: kl ? kl.value : '', nhanXet: giaTri(p, 'nx').trim(), diaDanh: C().DIA_DANH || '',
              chucDanh: giaTri(p, 'cd').trim().toUpperCase(), hoTen: giaTri(p, 'ht').trim() };
    if (dongDau(p) && tr && rong) { o.dau = anhDau; o.dauTiLe = DAU_PT * tr.vp.scale / rong; }
    return o;
  }

  function napChuKy(p) {
    var du = nho('chu-ky');
    var o = p.phu.querySelector('[data-khs="anh-ky"]');
    var xoa = p.phu.querySelector('[data-khs="xoa-ky"]');
    anhChuKy = null;
    if (xoa) xoa.hidden = !du;
    if (!du) { o.innerHTML = '<em>Chưa có chữ ký</em>'; veLaiKhoi(p); return; }
    var im = new Image();
    im.onload = function () { anhChuKy = im; o.innerHTML = ''; o.appendChild(im.cloneNode()); veLaiKhoi(p); };
    im.src = du;
  }

  function capNutLuu(p) {
    var n = p.phu.querySelector('[data-khs="luu"]'), g = p.phu.querySelector('[data-khs="goi-y"]');
    if (!n) return;
    n.disabled = !(p.dat && anhChuKy && p.byte);
    var bo = p.phu.querySelector('[data-khs="bo-khoi"]');
    if (bo) bo.hidden = !p.dat;
    if (!anhChuKy) g.textContent = 'Bấm "Ký mới" để ký tên một lần; máy nhớ cho những lần sau.';
    else if (!p.dat) g.textContent = 'Bấm vào trang giáo án, đúng chỗ muốn đặt chữ ký. Kéo khối chữ ký để dời chỗ.';
    else g.textContent = 'Kiểm tra lại khối chữ ký trên trang (kéo để dời), rồi bấm Ký và lưu.';
  }

  // Thầy Chung 30/10: chữ ký thử nghiệm không xoá được (chỉ có "Ký mới" đè lên)
  // → nút Xoá chữ ký đã nhớ trên máy, và nút bỏ khối đã đặt trên trang.
  function xoaChuKyDaNho(p) {
    var hoi = window.hopHoi
      ? window.hopHoi({ tieuDe: 'Xoá chữ ký đã lưu?', noiDung: 'Máy này sẽ quên chữ ký của thầy cô. Lần ký sau cần ký lại hoặc chọn lại ảnh chữ ký. Các tệp đã ký trên Drive không thay đổi.', nutOK: 'Xoá chữ ký', nguyHiem: true })
      : Promise.resolve(window.confirm('Xoá chữ ký đã lưu trên máy này?'));
    hoi.then(function (dongY) {
      if (!dongY || p.huy) return;
      nho('chu-ky', null);
      napChuKy(p);
      baoNhanh('Đã xoá chữ ký trên máy này.');
    });
  }
  function boKhoi(p) {
    if (p.dat && p.dat.anh && p.dat.anh.parentNode) p.dat.anh.parentNode.removeChild(p.dat.anh);
    p.dat = null;
    capNutLuu(p);
  }

  // Đặt / vẽ lại khối chữ ký trên trang đang chọn
  function veLaiKhoi(p) {
    if (!p.dat) { capNutLuu(p); return; }
    var tr = p.trang[p.dat.trang];
    if (!tr) return;
    var rk = rongKhoi(p, tr);
    var k = veKhoi(thongTinKhoi(p, tr, rk), rk);
    var im = p.dat.anh;
    if (!im) {
      im = p.dat.anh = document.createElement('img');
      im.className = 'khs-khoi';
      im.alt = 'Khối chữ ký';
      im.draggable = false;
      keoDuoc(p, im);
    }
    if (im.parentNode !== tr.giay) tr.giay.appendChild(im);
    p.dat.rong = k.rong; p.dat.cao = k.cao;
    // Giữ trong trang
    p.dat.x = Math.max(0, Math.min(p.dat.x, tr.vp.width - k.rong));
    p.dat.y = Math.max(0, Math.min(p.dat.y, tr.vp.height - k.cao));
    im.src = k.canvas.toDataURL('image/png');
    im.style.left = p.dat.x + 'px'; im.style.top = p.dat.y + 'px';
    im.style.width = k.rong + 'px'; im.style.height = k.cao + 'px';
    capNutLuu(p);
  }

  function keoDuoc(p, im) {
    var bd = null;
    im.addEventListener('pointerdown', function (e) {
      e.preventDefault(); e.stopPropagation();
      bd = { x: e.clientX, y: e.clientY, ox: p.dat.x, oy: p.dat.y };
      im.setPointerCapture(e.pointerId);
    });
    im.addEventListener('pointermove', function (e) {
      if (!bd) return;
      p.dat.x = bd.ox + e.clientX - bd.x; p.dat.y = bd.oy + e.clientY - bd.y;
      var tr = p.trang[p.dat.trang];
      p.dat.x = Math.max(0, Math.min(p.dat.x, tr.vp.width - p.dat.rong));
      p.dat.y = Math.max(0, Math.min(p.dat.y, tr.vp.height - p.dat.cao));
      im.style.left = p.dat.x + 'px'; im.style.top = p.dat.y + 'px';
    });
    function tha() { bd = null; }
    im.addEventListener('pointerup', tha);
    im.addEventListener('pointercancel', tha);
    im.addEventListener('click', function (e) { e.stopPropagation(); });
  }

  function bam(e) {
    var p = phien;
    if (!p) return;
    // Bấm ra nền KHÔNG đóng: đang đặt chữ ký mà lỡ tay là mất việc — chỉ ✕ / Esc
    var n = e.target.closest && e.target.closest('[data-khs]');
    var giay = e.target.closest && e.target.closest('.khs-giay');
    if (giay && p.man === 'ky') {   // (n lúc này là khung [data-khs="xem"] bọc ngoài trang)
      var r = giay.getBoundingClientRect(), so = Number(giay.getAttribute('data-trang'));
      var rong = rongKhoi(p, p.trang[so] || { vp: { width: r.width } });
      if (p.dat && p.dat.anh && p.dat.anh.parentNode) p.dat.anh.parentNode.removeChild(p.dat.anh);
      p.dat = { trang: so, x: e.clientX - r.left - rong / 2, y: e.clientY - r.top - 20, anh: p.dat && p.dat.anh };
      veLaiKhoi(p);
      return;
    }
    if (!n) return;
    var k = n.getAttribute('data-khs');
    if (k === 'dong') dong();
    else if (k === 'mo-tep') moTep(p, Number(n.getAttribute('data-i')));
    else if (k === 'lui') { if (p.pdf) { try { p.pdf.destroy(); } catch (x) { /* bỏ */ } p.pdf = null; } veDanhSach(p); }
    else if (k === 'ky-moi') moBangKy();
    else if (k === 'xoa-ky') xoaChuKyDaNho(p);
    else if (k === 'dau-chon') p.phu.querySelector('[data-khs="dau-tep"]').click();
    else if (k === 'dau-xoa') xoaDau(p);
    else if (k === 'bo-khoi') boKhoi(p);
    else if (k === 'luu') kyVaLuu(p);
    else if (k === 'bk-xoa') xoaBangKy();
    else if (k === 'bk-huy') dongBangKy();
    else if (k === 'bk-dung') dungBangKy();
    else if (k === 'bk-anh') p.phu.querySelector('[data-khs="bk-tep"]').click();
  }

  function doiO(e) {
    var p = phien;
    if (!p) return;
    var k = e.target.getAttribute && e.target.getAttribute('data-khs');
    if (k === 'tim') {
      var q = boDau(e.target.value).trim();
      p.phu.querySelectorAll('.khs-tep li').forEach(function (li) {
        li.hidden = !!q && li.getAttribute('data-tim').indexOf(q) < 0;
      });
      return;
    }
    if (k === 'bk-tep') { if (e.type === 'change') docAnhKy(e.target.files && e.target.files[0]); return; }
    if (k === 'dau-tep') { if (e.type === 'change') docAnhDau(p, e.target.files && e.target.files[0]); e.target.value = ''; return; }
    if (p.man !== 'ky') return;
    if (e.type === 'change') {
      if (k === 'cd') nho('chuc-danh' + (p.loai === 'ho_so' ? '-hs' : ''), e.target.value.trim());
      if (k === 'ht') nho('ho-ten', e.target.value.trim());
      if (k === 'co') nho('co' + (p.loai === 'ho_so' ? '-hs' : ''), e.target.value);
    }
    veLaiKhoi(p);
  }

  // ── Ghi chữ ký vào PDF rồi gửi lên Drive ──
  function kyVaLuu(p) {
    var nut = p.phu.querySelector('[data-khs="luu"]');
    if (!p.dat || !anhChuKy || !p.byte) return;
    var f = p.tep, dat = p.dat, tr = p.trang[dat.trang];
    nut.disabled = true; nut.textContent = 'Đang ghi chữ ký vào tệp…';
    // Bản in vẽ lại ở bề ngang cố định 520 (x3 = 1560 px ảnh) cho nét — mọi kích
    // thước trong veKhoi tỉ lệ với bề ngang nên bố cục y như khối trên màn hình.
    var k = veKhoi(thongTinKhoi(p, tr, dat.rong), 520);
    var caoIn = dat.rong * k.cao / k.rong;
    napPdfLib().then(function (L) {
      return L.PDFDocument.load(p.byte, { ignoreEncryption: true }).then(function (doc) {
        var pg = doc.getPage(dat.trang);
        return doc.embedPng(k.canvas.toDataURL('image/png')).then(function (png) {
          // Góc dưới-trái của khối (theo mắt nhìn) đổi sang toạ độ PDF; trang
          // xoay (/Rotate) thì xoay ảnh ngược chiều cùng góc để khối đứng thẳng.
          var tl = tr.vp.scale;
          var goc = tr.vp.convertToPdfPoint(dat.x, dat.y + caoIn);
          var xoay = ((pg.getRotation().angle % 360) + 360) % 360;
          pg.drawImage(png, { x: goc[0], y: goc[1], width: dat.rong / tl, height: caoIn / tl, rotate: L.degrees(xoay) });
          return doc.save({ objectsPerTick: 2000 });   // mặc định 50 vật/lượt — tệp dài ghi rất lâu
        });
      });
    }).then(function (moi) {
      if (p.huy) return;
      nut.textContent = 'Đang lưu lên Drive (' + (moi.length / 1048576).toFixed(1).replace('.', ',') + ' MB)…';
      return goi('luu', { thu_muc: p.thuMuc, loai: p.loai, tep: f.id, sua_luc: p.suaLuc, b64: byteSangB64(moi) });
    }).then(function (kq) {
      if (p.huy) return;
      f.da_ky = kq.da_ky || f.da_ky;
      if (kq.sua_luc) f.sua_luc = kq.sua_luc;
      if (p.pdf) { try { p.pdf.destroy(); } catch (x) { /* bỏ */ } p.pdf = null; }
      veDanhSach(p);
      baoNhanh('Đã ký và lưu "' + f.ten + '" vào ' + (p.loai === 'ho_so' ? 'hồ sơ ' : 'thư mục của ') + p.hoTen + '.');
    }).catch(function (e) {
      if (p.huy) return;
      nut.disabled = false; nut.textContent = 'Ký và lưu vào Drive';
      var chu = (e && e.message) || String(e);
      if (window.hopBao) window.hopBao({ tieuDe: 'Chưa lưu được', bieuTuong: '⚠️', noiDung: chu });
      else baoNhanh(chu);
    });
  }

  // ══════════════════════════════════════════════════════════════
  // BẢNG KÝ TÊN (vẽ bằng chuột / ngón tay, hoặc tải ảnh chữ ký)
  // ══════════════════════════════════════════════════════════════
  function bangKyHtml() {
    return '<div class="khs-bang-ky" hidden>' +
      '<div class="khs-bk-hop">' +
        '<b>Ký tên vào khung</b><small>Dùng chuột hoặc ngón tay. Máy nhớ chữ ký cho những lần sau.</small>' +
        '<canvas class="khs-bk-giay" data-khs-bk="giay"></canvas>' +
        '<div class="khs-bk-nut">' +
          '<button type="button" class="khs-nut-phu" data-khs="bk-xoa">Ký lại</button>' +
          '<button type="button" class="khs-nut-phu" data-khs="bk-anh">Dùng ảnh chữ ký</button>' +
          '<input type="file" accept="image/*" data-khs="bk-tep" hidden>' +
          '<span class="khs-gian"></span>' +
          '<button type="button" class="khs-nut-phu" data-khs="bk-huy">Huỷ</button>' +
          '<button type="button" class="nut-chinh" data-khs="bk-dung">Dùng chữ ký này</button>' +
        '</div>' +
      '</div></div>';
  }
  var bk = null;   // { cv, g, co (đã có nét), net }
  function moBangKy() {
    var p = phien, hop = p.phu.querySelector('.khs-bang-ky');
    hop.hidden = false;
    var cv = hop.querySelector('[data-khs-bk="giay"]');
    var rong = Math.min(520, hop.querySelector('.khs-bk-hop').clientWidth - 32), cao = Math.round(rong * .42);
    var dpr = window.devicePixelRatio || 1;
    cv.style.width = rong + 'px'; cv.style.height = cao + 'px';
    cv.width = Math.round(rong * dpr); cv.height = Math.round(cao * dpr);
    var g = cv.getContext('2d');
    g.scale(dpr, dpr); g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = MUC; g.lineWidth = 2.6;
    bk = { cv: cv, g: g, co: false, ve: false, truoc: null };
    if (!cv.dataset.daGan) {
      cv.dataset.daGan = '1';
      cv.addEventListener('pointerdown', function (e) {
        if (!bk) return;
        e.preventDefault();
        cv.setPointerCapture(e.pointerId);
        var r = cv.getBoundingClientRect();
        bk.ve = true; bk.truoc = [e.clientX - r.left, e.clientY - r.top];
        bk.g.beginPath(); bk.g.arc(bk.truoc[0], bk.truoc[1], 1.2, 0, 7); bk.g.fillStyle = MUC; bk.g.fill();
        bk.co = true;
      });
      cv.addEventListener('pointermove', function (e) {
        if (!bk || !bk.ve) return;
        var r = cv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
        bk.g.beginPath(); bk.g.moveTo(bk.truoc[0], bk.truoc[1]); bk.g.lineTo(x, y); bk.g.stroke();
        bk.truoc = [x, y];
      });
      var het = function () { if (bk) bk.ve = false; };
      cv.addEventListener('pointerup', het);
      cv.addEventListener('pointercancel', het);
    }
  }
  function xoaBangKy() { if (!bk) return; bk.g.clearRect(0, 0, bk.cv.width, bk.cv.height); bk.co = false; }
  function dongBangKy() { if (!phien) return; phien.phu.querySelector('.khs-bang-ky').hidden = true; }

  // Cắt sát nét chữ, nền trong suốt
  function catSat(cv) {
    var g = cv.getContext('2d'), w = cv.width, h = cv.height, d = g.getImageData(0, 0, w, h).data;
    var x0 = w, y0 = h, x1 = -1, y1 = -1;
    for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) {
      if (d[(y * w + x) * 4 + 3] > 20) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    }
    if (x1 < 0) return null;
    var le = 6, o = document.createElement('canvas');
    o.width = x1 - x0 + 1 + 2 * le; o.height = y1 - y0 + 1 + 2 * le;
    o.getContext('2d').drawImage(cv, x0, y0, x1 - x0 + 1, y1 - y0 + 1, le, le, x1 - x0 + 1, y1 - y0 + 1);
    return o;
  }
  function luuChuKy(cv) {
    var c = catSat(cv);
    if (!c) { baoNhanh('Khung ký còn trống.'); return false; }
    nho('chu-ky', c.toDataURL('image/png'));
    dongBangKy();
    if (phien) napChuKy(phien);
    return true;
  }
  function dungBangKy() { if (bk && bk.co) luuChuKy(bk.cv); else baoNhanh('Thầy cô ký vào khung trước đã.'); }

  // Ảnh chụp chữ ký trên giấy trắng: bỏ nền sáng, nét tối đổi sang mực xanh
  function docAnhKy(tep) {
    if (!tep) return;
    var fr = new FileReader();
    fr.onload = function () {
      var im = new Image();
      im.onload = function () {
        var r = Math.min(1, 900 / im.width), c = document.createElement('canvas');
        c.width = Math.round(im.width * r); c.height = Math.round(im.height * r);
        var g = c.getContext('2d');
        g.drawImage(im, 0, 0, c.width, c.height);
        var a = g.getImageData(0, 0, c.width, c.height), d = a.data;
        for (var i = 0; i < d.length; i += 4) {
          var sang = (d[i] * 299 + d[i + 1] * 587 + d[i + 2] * 114) / 1000;
          // Ảnh PNG nền trong suốt: điểm trong suốt mang màu đen (0,0,0) — không loại
          // trước là cả nền thành mảng mực xanh (thử thật QC2 30/10/2026)
          if (d[i + 3] < 128 || sang > 165) d[i + 3] = 0;
          else { d[i] = 27; d[i + 1] = 58; d[i + 2] = 143; d[i + 3] = Math.min(255, (200 - sang) * 2.2); }
        }
        g.putImageData(a, 0, 0);
        luuChuKy(c);
      };
      im.src = fr.result;
    };
    fr.readAsDataURL(tep);
  }

  // ── Lối vào: nút ✍ trên thẻ giáo viên (du-lieu-sql.js vẽ, có data-ky-thu) ──
  function moTu(n) {
    mo(n.getAttribute('data-ky-thu'), n.getAttribute('data-ky-ten') || '', n, n.getAttribute('data-ky-loai'));
  }
  document.addEventListener('click', function (e) {
    var n = e.target.closest && e.target.closest('[data-ky-thu]');
    if (!n) return;
    e.preventDefault();
    moTu(n);
  });

  window.KY_HO_SO = {
    mo: mo,
    moTu: moTu,   // nút nằm trong vùng chặn nổi bọt (dòng danh mục hồ sơ, app.js) gọi thẳng
    bat: function () { return !!(C().LINK_KY_HO_SO && window.MAY_CHU); },
    // phần thuần cho bài thử
    _chuNgay: chuNgay, _chucDanhTu: chucDanhTu
  };
})();
