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
    khong_quyen_bgh: 'Chỉ Hiệu trưởng, Phó Hiệu trưởng (và quản trị) được làm việc này.',
    khong_quyen_dang: 'Hồ sơ Đảng này do Bí thư phụ trách ký (người được ghi ở ô Người phụ trách của hồ sơ).',
    khong_thay: 'Không thấy người hoặc hồ sơ này trong dữ liệu của trường. Tải lại trang rồi thử lại.',
    chua_co_mau: 'Chưa có thư mục nào làm mẫu (chưa người, hồ sơ nào cùng nhóm được gắn thư mục). Gắn tay một thư mục đầu tiên rồi thử lại.',
    tep_da_doi: 'Tệp vừa được thay hoặc sửa sau lúc thầy cô mở. Mở lại tệp rồi ký lại.',
    tep_qua_lon: 'Tệp lớn quá 15 MB, chưa ký trong app được.',
    khong_phai_pdf: 'Tệp này không phải PDF.',
    ngoai_thu_muc: 'Tệp không nằm trong thư mục hồ sơ này.',
    truong_la: 'Dịch vụ ký chưa khai trường này. Báo quản trị viên.',
    drive_tu_choi: 'Drive không cho ghi tệp. Báo quản trị viên.',
    loi_may: 'Dịch vụ ký gặp lỗi. Thử lại sau ít phút.'
  };
  // Địa chỉ dịch vụ phải đúng dạng ứng dụng web Apps Script: app gửi kèm phiên đăng
  // nhập, nên không gửi tới bất kỳ địa chỉ nào khác lỡ dán vào ô cấu hình.
  function urlDichVu() {
    var u = String(C().LINK_KY_HO_SO || '').trim();
    return /^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]{20,}\/exec$/.test(u) ? u : '';
  }
  function goi(viec, them) {
    var url = urlDichVu();
    if (!url || !window.MAY_CHU) return Promise.reject(new Error('Trường chưa bật chức năng ký.'));
    return window.MAY_CHU.auth.getSession().then(function (r) {
      var tk = r && r.data && r.data.session && r.data.session.access_token;
      if (!tk) throw new Error(LOI.het_phien);
      // Mã Sở trước: QC1 còn MA = 'dienlien' (mã cũ), dịch vụ ký tra bảng TRUONG theo mã Sở
      var than = Object.assign({ viec: viec, ma: String(C().MA_SO || C().MA || ''), token: tk }, them);
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
    // Khối gọn (thầy Chung 30/10): chỉ ngày tháng · chữ ký · dấu · họ tên
    if (o.ketLuan && !o.gon) bo(o.ketLuan, 13.5, true, false, MUC_DO);
    if (o.nhanXet && !o.gon) bo(o.nhanXet, 13, false);
    var dauKy = dong.length;
    var ngayKy = o.ngay || new Date();   // chọn được ngày khác hôm nay (ký bù, ký trước)
    bo(o.diaDanh ? o.diaDanh + ', ' + chuNgay(ngayKy) : chuNgay(ngayKy).replace(/^n/, 'N'), 12.5, false, true);   // NĐ 30: in nghiêng
    if (o.chucDanh && !o.gon) bo(o.chucDanh, 13, true);
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

  function mo(thuMuc, hoTen, tro, loai, dang) {
    loai = loai === 'ho_so' ? 'ho_so' : 'giao_vien';
    // Hồ sơ Đảng (app.js loaiHopDang): khối chữ ký + khối nhận xét kiểu công tác Đảng
    dang = loai === 'ho_so' && (dang === 'dang_uy' || dang === 'chi_bo') ? dang : '';
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
    phien = { phu: phu, thuMuc: thuMuc, hoTen: hoTen, tro: tro, loai: loai, dang: dang, huy: false, ds: [], nguoiKy: {} };
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
    if (p.dang) {
      p.khoi = { ky: null, nx: null }; p.dangDat = 'ky'; p.du = false; p.tuDat = false;
      than(p).innerHTML = khungDangHtml(p, f, nk);
      napChuKy(p); napDau(p); capChuDang(p);
    } else {
    than(p).innerHTML =
      '<div class="khs-ky">' +
        '<div class="khs-xem" data-khs="xem"><p class="ck-xvb-cho">Đang tải ' + (hs ? 'hồ sơ' : 'giáo án') +
          (f.co ? ' (' + (f.co / 1048576).toFixed(1).replace('.', ',') + ' MB)' : '') + '…</p></div>' +
        '<div class="khs-ben">' +
          '<button type="button" class="khs-lui" data-khs="lui">‹ Danh sách tệp</button>' +
          '<label class="khs-dong-dau"><input type="checkbox" data-khs="gon"' + (nho('gon' + duoi) === '1' ? ' checked' : '') + '> ' +
            '<span>Khối gọn: chỉ ngày tháng, chữ ký' + (coDau ? ', dấu' : '') + ' và họ tên</span></label>' +
          '<div class="khs-o khs-phan-day" data-khs="phan-day"><span class="khs-nhan">Kết luận</span>' +
            '<div class="khs-chon">' +
              // Hồ sơ GV: bốn mức (thầy Chung hỏi 30/10 — tổ trưởng "kiểm tra", không "duyệt")
              KL.map(function (k, i) {
                return '<label><input type="radio" name="khs-kl" value="' + t(k[0]) + '"' + (i ? '' : ' checked') + '> ' + t(k[1]) + '</label>';
              }).join('') +
            '</div></div>' +
          '<label class="khs-o khs-phan-day"><span class="khs-nhan">Nhận xét (không bắt buộc)</span>' +
            '<textarea data-khs="nx" rows="3" maxlength="400" placeholder="Ví dụ: Mục tiêu rõ, cần thêm hoạt động vận dụng."></textarea></label>' +
          '<div class="khs-hai">' +
            '<label class="khs-o khs-phan-day"><span class="khs-nhan">Chức danh</span><textarea data-khs="cd" rows="2">' + t(chucDanh) + '</textarea></label>' +
            '<label class="khs-o"><span class="khs-nhan">Họ tên</span><input data-khs="ht" value="' + t(hoTen) + '"></label>' +
          '</div>' +
          '<label class="khs-o"><span class="khs-nhan">Ngày ký</span><input type="date" data-khs="ngay" value="' + homNay() + '"></label>' +
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
    apKhoiGon(p);
    }
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
        if (p.huy || p.tep !== f) return;
        if (++n > pdf.numPages) { p.du = true; if (p.dang) datNhuTruocDang(p, true); return; }
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
  function homNay() {
    var d = new Date();
    return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
  }
  // Khối gọn: kết luận, nhận xét, chức danh không in → làm mờ cho khỏi nhầm
  function apKhoiGon(p) {
    var g = p.phu.querySelector('[data-khs="gon"]'), gon = !!(g && g.checked);
    p.phu.querySelectorAll('.khs-phan-day').forEach(function (x) { x.classList.toggle('khs-mo', gon); });
  }
  // Con dấu tròn của trường: in đúng cỡ thật 35 mm (≈ 99 pt), không co giãn theo khối
  var DAU_PT = 35 / 25.4 * 72;
  var anhDau = null;
  // Dấu Đảng ủy KHÁC dấu nhà trường → nhớ riêng trên máy
  function khoaDau(p) { return p && p.dang ? 'dau-dang' : 'dau'; }
  function laBGH() { var v = (window.NGUOI_DUNG || {}).vai_tro; return v === 'admin' || v === 'ban_giam_hieu'; }
  function dongDau(p) {
    var o = p.phu.querySelector('[data-khs="dong-dau"]');
    return !!(o && o.checked && anhDau && (p.dang ? p.dang === 'dang_uy' : laBGH()));
  }
  function napDau(p) {
    var du = nho(khoaDau(p)), o = p.phu.querySelector('[data-khs="anh-dau"]'), x = p.phu.querySelector('[data-khs="dau-xoa"]');
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
          if (d[i + 3] < 128 || do_ < 35) { d[i + 3] = 0; continue; }
          d[i] = 206; d[i + 1] = 24; d[i + 2] = 36; d[i + 3] = Math.min(255, do_ * 2.4); coMuc++;
        }
        if (coMuc < 200) {
          var chu = 'Không thấy nét mực đỏ trong ảnh. Thầy cô chụp hoặc quét con dấu đỏ đóng trên giấy trắng, đủ sáng, rồi chọn lại.';
          if (window.hopBao) window.hopBao({ tieuDe: 'Chưa dùng được ảnh dấu', bieuTuong: '⚠️', noiDung: chu }); else baoNhanh(chu);
          return;
        }
        g.putImageData(a, 0, 0);
        var cat = catSat(c);
        nho(khoaDau(p), cat.toDataURL('image/png'));
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
    hoi.then(function (dongY) { if (dongY && !p.huy) { nho(khoaDau(p), null); napDau(p); } });
  }
  function giaTri(p, k) { var o = p.phu.querySelector('[data-khs="' + k + '"]'); return o ? o.value : ''; }
  function thongTinKhoi(p, tr, rong) {
    var kl = p.phu.querySelector('input[name="khs-kl"]:checked');
    var o = { ketLuan: kl ? kl.value : '', nhanXet: giaTri(p, 'nx').trim(), diaDanh: C().DIA_DANH || '',
              chucDanh: giaTri(p, 'cd').trim().toUpperCase(), hoTen: giaTri(p, 'ht').trim() };
    var g = p.phu.querySelector('[data-khs="gon"]');
    o.gon = !!(g && g.checked);
    var nd = /^(\d{4})-(\d{2})-(\d{2})$/.exec(giaTri(p, 'ngay'));
    if (nd) o.ngay = new Date(+nd[1], +nd[2] - 1, +nd[3]);
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
    if (p.dang) { capNutLuuDang(p); return; }
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
    if (p.dang) { veLaiDangCa(p); return; }
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
    if (giay && p.man === 'ky' && p.dang) { datKhoiDangBam(p, e, giay); return; }
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
    else if (k === 'bo-khoi') { if (p.dang) boKhoiDang(p, p.dangDat); else boKhoi(p); }
    else if (k === 'dat' && p.dang) { p.dangDat = n.getAttribute('data-loai') === 'nx' ? 'nx' : 'ky'; batNx(p); capNutLuuDang(p); }
    else if (k === 'nhu-truoc' && p.dang) datNhuTruocDang(p, false);
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
    // Ô chọn tệp phát CẢ 'input' lẫn 'change': chỉ đọc + xoá ô ở 'change' — bản đầu
    // xoá ngay ở 'input' nên tới 'change' ảnh dấu đã mất (thử thật QC2 30/10)
    if (k === 'dau-tep') {
      if (e.type === 'change') { var tepDau = e.target.files && e.target.files[0]; e.target.value = ''; docAnhDau(p, tepDau); }
      return;
    }
    if (p.man !== 'ky') return;
    if (p.dang) { doiODang(p, e, k); return; }
    if (e.type === 'change') {
      if (k === 'cd') nho('chuc-danh' + (p.loai === 'ho_so' ? '-hs' : ''), e.target.value.trim());
      if (k === 'ht') nho('ho-ten', e.target.value.trim());
      if (k === 'co') nho('co' + (p.loai === 'ho_so' ? '-hs' : ''), e.target.value);
      if (k === 'gon') { nho('gon' + (p.loai === 'ho_so' ? '-hs' : ''), e.target.checked ? '1' : null); apKhoiGon(p); }
    }
    veLaiKhoi(p);
  }

  // ── Ghi chữ ký vào PDF rồi gửi lên Drive ──
  function kyVaLuu(p) {
    if (p.dang) { kyVaLuuDang(p); return; }
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
  // KÝ HỒ SƠ ĐẢNG (thầy Chung 10/11/2026) — hộp H04 / H04.n (app.js loaiHopDang)
  //   · Khối chữ ký: chức danh Đảng (T/M ĐẢNG ỦY / T/M CHI BỘ…), khoảng ký rộng
  //     (mặc định 2,6 cm) cho chữ ký nằm giữa thoáng; dấu Đảng ủy riêng (chi bộ
  //     trực thuộc không có dấu).
  //   · Khối nhận xét RIÊNG, đặt chỗ khác: bề rộng chỉnh được (kéo mép phải),
  //     chiều cao tự tính theo cỡ chữ + giãn dòng NĐ 30 (dòng đơn → 1,5; cách
  //     đoạn 6 pt; lùi đầu dòng 1 cm).
  //   Hai khối vẽ theo đơn vị pt (in đúng cỡ thật), không co giãn theo màn hình.
  // ══════════════════════════════════════════════════════════════
  var PT_CM = 72 / 2.54, S_IN = 4;
  var PH_IN = '"Times New Roman", Times, "Noto Serif", serif';
  var MAU_MUC = { xanh: MUC, den: '#111111' };
  var DANG = {
    dang_uy: {
      cd: ['T/M ĐẢNG ỦY\nBÍ THƯ', 'BÍ THƯ ĐẢNG ỦY', 'BÍ THƯ'],
      td: ['Ý kiến của Đảng ủy:', 'Nhận xét của Đảng ủy:', 'Xác nhận của Đảng ủy:', 'Đảng ủy phê duyệt:', 'NHẬN XÉT, ĐÁNH GIÁ CỦA ĐẢNG ỦY'],
      cau: [
        ['Cam kết, kế hoạch học tập và làm theo Bác', [
          'Đảng ủy nhất trí với nội dung cam kết.',
          'Đề nghị chi bộ theo dõi, đánh giá việc thực hiện cam kết của đảng viên.']],
        ['Kiểm điểm, đánh giá, xếp loại', [
          'Đảng ủy nhất trí với đề nghị của Chi bộ.',
          'Đảng ủy xếp loại: Hoàn thành tốt nhiệm vụ.',
          'Đảng ủy xếp loại: Hoàn thành xuất sắc nhiệm vụ.']],
        ['Báo cáo, kế hoạch của chi bộ', [
          'Đảng ủy nhất trí, đề nghị chi bộ tổ chức thực hiện.',
          'Đảng ủy phê duyệt.',
          'Đề nghị chi bộ bổ sung, hoàn thiện và gửi lại Đảng ủy.']]]
    },
    chi_bo: {
      cd: ['T/M CHI BỘ\nBÍ THƯ', 'T/M CHI ỦY\nBÍ THƯ', 'BÍ THƯ CHI BỘ', 'BÍ THƯ'],
      td: ['Nhận xét của Chi bộ:', 'Nhận xét của Chi ủy:', 'Ý kiến của Chi bộ:', 'Xác nhận của Chi bộ:', 'NHẬN XÉT, ĐÁNH GIÁ CỦA CHI ỦY'],
      cau: [
        ['Cam kết, kế hoạch học tập và làm theo Bác', [
          'Bản cam kết đầy đủ nội dung, sát với chức trách, nhiệm vụ được giao.',
          'Nội dung đăng ký cụ thể, có biện pháp và thời gian thực hiện. Đề nghị đồng chí thực hiện nghiêm túc.',
          'Đề nghị đồng chí bổ sung nội dung đăng ký làm theo cụ thể hơn, gắn với nhiệm vụ chuyên môn.']],
        ['Kiểm điểm, đánh giá, xếp loại đảng viên', [
          'Chi ủy nhất trí với nội dung tự kiểm điểm của đồng chí.',
          'Đồng chí có bản lĩnh chính trị vững vàng; phẩm chất đạo đức, lối sống tốt; hoàn thành tốt nhiệm vụ được giao.',
          'Đề nghị Chi bộ xếp loại: Hoàn thành tốt nhiệm vụ.',
          'Đề nghị Chi bộ xếp loại: Hoàn thành xuất sắc nhiệm vụ.']],
        ['Báo cáo, kế hoạch, hồ sơ trình Đảng ủy', [
          'Chi bộ nhất trí, đề nghị Đảng ủy xem xét.',
          'Đã xem, nhất trí.']]]
    }
  };
  var GIAN_DONG = [['1', 'Dòng đơn'], ['1.15', '1,15'], ['1.3', '1,3'], ['1.5', '1,5 (tối đa)']];
  var nxNho = '';   // nội dung nhận xét giữ qua các tệp trong một lần mở (ký hàng loạt cùng lời)

  function nhoD(k, gt) { return nho('dg-' + k, gt); }
  function macDinhD(k, gt) { var v = nhoD(k); return v == null ? gt : v; }
  function soVN(x) { return Number(x).toFixed(1).replace('.', ','); }
  function luaChon(ds, chon, nhanRong) {
    return (nhanRong ? '<option value="">' + t(nhanRong) + '</option>' : '') + ds.map(function (x) {
      var v = Array.isArray(x) ? x[0] : x, n = Array.isArray(x) ? x[1] : x.replace(/\n/g, ' / ');
      return '<option value="' + t(v) + '"' + (v === chon ? ' selected' : '') + '>' + t(n) + '</option>';
    }).join('');
  }
  function oD(p, k) { return p.phu.querySelector('[data-khs="' + k + '"]'); }
  function chonD(p, k) { var x = oD(p, k); return !!(x && x.checked); }

  function khungDangHtml(p, f, nk) {
    var D = DANG[p.dang], laDU = p.dang === 'dang_uy';
    var cd = macDinhD('cd-' + p.dang, D.cd[0]), td = macDinhD('td-' + p.dang, D.td[0]);
    var coNx = macDinhD('nx-co', '1') === '1';
    return '<div class="khs-ky khs-ky-dang">' +
      '<div class="khs-xem" data-khs="xem"><p class="ck-xvb-cho">Đang tải hồ sơ' +
        (f.co ? ' (' + (f.co / 1048576).toFixed(1).replace('.', ',') + ' MB)' : '') + '…</p></div>' +
      '<div class="khs-ben">' +
        '<button type="button" class="khs-lui" data-khs="lui">‹ Danh sách tệp</button>' +
        // ── Khối nhận xét ──
        '<div class="khs-muc' + (coNx ? '' : ' tat') + '" data-khs="muc-nx"><b><label class="khs-dong-dau"><input type="checkbox" data-khs="nx-co"' + (coNx ? ' checked' : '') + '> Khối nhận xét</label></b>' +
          '<label class="khs-o"><span class="khs-nhan">Tiêu đề</span><select data-khs="td-mau">' + luaChon(D.td, D.td.indexOf(td) >= 0 ? td : '', 'Tự gõ / không có tiêu đề') + '</select>' +
            '<input data-khs="td" value="' + t(td) + '" placeholder="Không có tiêu đề"></label>' +
          '<label class="khs-o"><span class="khs-nhan">Câu mẫu (chọn để thêm vào nội dung)</span><select data-khs="cau-mau"><option value="">Chọn câu mẫu…</option>' +
            D.cau.map(function (nh) { return '<optgroup label="' + t(nh[0]) + '">' + nh[1].map(function (c) { return '<option>' + t(c) + '</option>'; }).join('') + '</optgroup>'; }).join('') +
          '</select></label>' +
          '<label class="khs-o"><span class="khs-nhan">Nội dung nhận xét</span><textarea data-khs="nx" rows="4" maxlength="1500" placeholder="Gõ nhận xét, mỗi ý một dòng.">' + t(nxNho) + '</textarea></label>' +
          '<div class="khs-o"><span class="khs-tri khs-nhan">Bề rộng <b data-khs="nx-rong-chu"></b></span><input type="range" data-khs="nx-rong" min="4" max="18" step="0.1" value="' + t(macDinhD('nx-rong', '16')) + '"></div>' +
          '<div class="khs-hai"><label class="khs-o"><span class="khs-nhan">Giãn dòng</span><select data-khs="nx-gian">' + luaChon(GIAN_DONG, macDinhD('nx-gian', '1.15')) + '</select></label>' +
            '<div class="khs-o"><span class="khs-nhan">Chiều cao</span><span data-khs="nx-cao">tự tính</span></div></div>' +
          '<label class="khs-dong-dau"><input type="checkbox" data-khs="nx-deu"' + (macDinhD('nx-deu', '1') === '1' ? ' checked' : '') + '> <span>Căn đều hai bên</span></label>' +
          '<label class="khs-dong-dau"><input type="checkbox" data-khs="nx-lui"' + (macDinhD('nx-lui', '0') === '1' ? ' checked' : '') + '> <span>Lùi đầu dòng 1 cm</span></label>' +
        '</div>' +
        // ── Khối chữ ký ──
        '<div class="khs-muc"><b>Khối chữ ký</b>' +
          '<label class="khs-o"><span class="khs-nhan">Chức danh</span><select data-khs="cd-mau">' + luaChon(D.cd, D.cd.indexOf(cd) >= 0 ? cd : '', 'Tự gõ…') + '</select>' +
            '<textarea data-khs="cd" rows="2">' + t(cd) + '</textarea></label>' +
          '<label class="khs-o"><span class="khs-nhan">Họ tên</span><input data-khs="ht" value="' + t(nho('ho-ten') || nk.ho_ten || (window.NGUOI_DUNG || {}).ho_ten || '') + '"></label>' +
          '<div class="khs-o"><span class="khs-tri khs-nhan">Khoảng chức danh – họ tên (chỗ ký) <b data-khs="kk-chu"></b></span><input type="range" data-khs="kk" min="1.5" max="4" step="0.1" value="' + t(macDinhD('kk', '2.6')) + '"></div>' +
          '<label class="khs-dong-dau"><input type="checkbox" data-khs="co-ngay"' + (macDinhD('co-ngay', '0') === '1' ? ' checked' : '') + '> <span>Ghi địa danh, ngày tháng trên chức danh</span></label>' +
          '<label class="khs-o" data-khs="dong-ngay"><span class="khs-nhan">Ngày ký</span><input type="date" data-khs="ngay" value="' + homNay() + '"></label>' +
          '<div class="khs-o"><span class="khs-nhan">Chữ ký</span>' +
            '<div class="khs-chu-ky"><span data-khs="anh-ky" class="khs-anh-ky"></span>' +
            '<span class="khs-nut-ky"><button type="button" class="khs-nut-phu" data-khs="ky-moi">Ký mới</button>' +
            '<button type="button" class="khs-nut-phu khs-nut-xoa" data-khs="xoa-ky" hidden>Xoá</button></span></div></div>' +
          (laDU
            ? '<div class="khs-o"><label class="khs-dong-dau"><input type="checkbox" data-khs="dong-dau"' + (macDinhD('dong-dau', '1') === '1' ? ' checked' : '') + '> ' +
                '<span class="khs-nhan">Đóng dấu Đảng ủy</span></label>' +
              '<div class="khs-chu-ky"><span data-khs="anh-dau" class="khs-anh-ky khs-anh-dau"></span>' +
              '<span class="khs-nut-ky"><button type="button" class="khs-nut-phu" data-khs="dau-chon">Chọn ảnh dấu</button>' +
              '<button type="button" class="khs-nut-phu khs-nut-xoa" data-khs="dau-xoa" hidden>Xoá</button></span></div>' +
              '<span class="khs-tri khs-nhan">Đường kính dấu <b data-khs="mm-chu"></b></span><input type="range" data-khs="mm" min="28" max="42" step="1" value="' + t(macDinhD('mm', '35')) + '">' +
              '<input type="file" accept="image/*" data-khs="dau-tep" hidden></div>'
            : '') +
        '</div>' +
        // ── Chữ, vị trí ──
        '<div class="khs-muc"><b>Chữ và vị trí</b>' +
          '<div class="khs-hai"><label class="khs-o"><span class="khs-nhan">Cỡ chữ</span><select data-khs="fs">' + luaChon([['13', '13'], ['14', '14']], macDinhD('fs', '14')) + '</select></label>' +
            '<label class="khs-o"><span class="khs-nhan">Màu chữ</span><select data-khs="mau">' + luaChon([['xanh', 'Mực xanh'], ['den', 'Đen']], macDinhD('mau', 'xanh')) + '</select></label></div>' +
          '<div class="khs-o"><span class="khs-nhan">Bấm lên trang để đặt</span><div class="khs-chon-dat">' +
            '<button type="button" data-khs="dat" data-loai="ky" class="chon">Khối chữ ký</button><button type="button" data-khs="dat" data-loai="nx">Khối nhận xét</button></div></div>' +
          '<p class="khs-goi-y" data-khs="goi-y"></p>' +
          '<button type="button" class="khs-nut-phu" data-khs="nhu-truoc" hidden>Đặt như lần trước</button>' +
          '<button type="button" class="khs-lui khs-bo-khoi" data-khs="bo-khoi" hidden>✕ Bỏ khối đang chọn</button>' +
        '</div>' +
        '<button type="button" class="nut-chinh khs-luu" data-khs="luu" disabled>Ký và lưu vào Drive</button>' +
      '</div>' +
    '</div>';
  }

  // Đo chữ theo pt (vẽ thử ở cỡ ×10 cho đủ chính xác)
  var doCv = null;
  function phongIn(px, dam, nghieng) { return (nghieng ? 'italic ' : '') + (dam ? 'bold ' : '') + px + 'px ' + PH_IN; }
  function doRong(chu, fs, dam, nghieng) {
    if (!doCv) doCv = document.createElement('canvas').getContext('2d');
    doCv.font = phongIn(fs * 10, dam, nghieng);
    return doCv.measureText(chu).width / 10;
  }

  // Khối chữ ký: [địa danh, ngày] · chức danh · khoảng ký (chữ ký + dấu) · họ tên. s = điểm ảnh / pt
  function veKyDang(o, s) {
    var fs = o.fs, lh = fs * 1.25, le = 4, dong = [];
    if (o.coNgay) {
      var nk = o.ngay || new Date();
      dong.push({ s: o.diaDanh ? o.diaDanh + ', ' + chuNgay(nk) : chuNgay(nk).replace(/^n/, 'N'), n: true });
    }
    String(o.chucDanh || '').split(/\n/).map(function (x) { return x.trim(); }).filter(Boolean)
      .forEach(function (x) { dong.push({ s: x.toUpperCase(), d: true }); });
    var rongChu = 0;
    dong.forEach(function (d) { rongChu = Math.max(rongChu, doRong(d.s, fs, d.d, d.n)); });
    if (o.hoTen) rongChu = Math.max(rongChu, doRong(o.hoTen, fs, true));
    var D = o.dau ? o.dauPt : 0;
    var W = Math.max(rongChu + 2 * le, 5.5 * PT_CM, D * 1.9);
    var sw = 0, sh = 0;
    if (o.chuKy) {
      var r = Math.min(Math.min(W - 2 * le, 6.5 * PT_CM) / o.chuKy.width, o.khoangKy * 0.86 / o.chuKy.height);
      sw = o.chuKy.width * r; sh = o.chuKy.height * r;
    }
    var y = le, viTri = [];
    dong.forEach(function (d) { viTri.push(y); y += lh; if (d.n) y += 4; });
    var yKy = y; y += o.khoangKy;
    var yTen = y; if (o.hoTen) y += lh;
    var H = y + le, trai = (W - sw) / 2, R = D / 2, cx = 0, cy = 0, tren = 0, duoi = 0;
    if (D) {   // NĐ 30: dấu trùm khoảng 1/3 chữ ký về bên trái
      cx = sw ? trai + sw / 3 - R * 0.9 : W / 2 - R * 0.4;
      cx = Math.max(R + 1, Math.min(cx, W - R - 1));
      cy = yKy + o.khoangKy / 2;
      tren = Math.max(0, R - cy + 1); duoi = Math.max(0, cy + R - H + 1);
    }
    var c = document.createElement('canvas');
    c.width = Math.ceil(W * s); c.height = Math.ceil((H + tren + duoi) * s);
    var g = c.getContext('2d');
    g.scale(s, s); g.translate(0, tren);
    g.textAlign = 'center'; g.textBaseline = 'alphabetic'; g.fillStyle = o.mau;
    var chan = (lh - fs) / 2 + fs * 0.86;
    dong.forEach(function (d, i) { g.font = phongIn(fs, d.d, d.n); g.fillText(d.s, W / 2, viTri[i] + chan); });
    if (o.hoTen) { g.font = phongIn(fs, true); g.fillText(o.hoTen, W / 2, yTen + chan); }
    if (o.chuKy) g.drawImage(o.chuKy, trai, yKy + (o.khoangKy - sh) / 2, sw, sh);
    if (D) {
      var m = Math.max(o.dau.width, o.dau.height);
      g.save(); g.globalAlpha = .9; g.globalCompositeOperation = 'multiply';
      g.drawImage(o.dau, cx - R * o.dau.width / m, cy - R * o.dau.height / m, D * o.dau.width / m, D * o.dau.height / m);
      g.restore();
    }
    return { canvas: c, rong: W, cao: H + tren + duoi };
  }

  // Khối nhận xét: ngắt dòng theo bề rộng đã chọn; chiều cao = số dòng × cỡ chữ × giãn dòng
  function catDong(doan, fs, dam, rongDau, rong) {
    var tu = doan.split(/\s+/).filter(Boolean), kq = [], hang = [], rh = 0, cach = doRong(' ', fs, dam);
    tu.forEach(function (w) {
      var rw = doRong(w, fs, dam), toiDa = kq.length ? rong : rongDau;
      var thu = hang.length ? rh + cach + rw : rw;
      if (hang.length && thu > toiDa) { kq.push({ tu: hang, rong: rh }); hang = [w]; rh = rw; }
      else { hang.push(w); rh = thu; }
    });
    if (hang.length) kq.push({ tu: hang, rong: rh });
    return kq;
  }
  function boCucNx(o) {
    var fs = o.fs, lh = fs * 1.15 * o.gian, CACH_DOAN = 6, lui = o.lui ? PT_CM : 0, W = o.rong, doan = [], dong = [], y = 2;
    if (o.tieuDe) doan.push({ s: o.tieuDe, d: true, tieuDe: true });
    String(o.noiDung || '').split(/\n/).forEach(function (x) { if (x.trim()) doan.push({ s: x.trim() }); });
    doan.forEach(function (d, i) {
      if (i) y += CACH_DOAN;
      var l = d.tieuDe ? 0 : lui, hs = catDong(d.s, fs, d.d, W - l, W);
      hs.forEach(function (h, j) {
        dong.push({ tu: h.tu, rong: h.rong, d: d.d, x: j ? 0 : l, y: y, cuoi: j === hs.length - 1, toiDa: W - (j ? 0 : l) });
        y += lh;
      });
    });
    return { dong: dong, cao: doan.length ? y + 2 : 0, lh: lh };
  }
  function veNxDang(o, s) {
    var bc = boCucNx(o), fs = o.fs, c = document.createElement('canvas');
    c.width = Math.ceil(o.rong * s); c.height = Math.max(1, Math.ceil(bc.cao * s));
    var g = c.getContext('2d');
    g.scale(s, s); g.textBaseline = 'alphabetic'; g.fillStyle = o.mau;
    var chan = (bc.lh - fs) / 2 + fs * 0.86;
    bc.dong.forEach(function (d) {
      g.font = phongIn(fs, d.d);
      var cach = doRong(' ', fs, d.d), x = d.x;
      if (o.canDeu && !d.cuoi && d.tu.length > 1) cach += (d.toiDa - d.rong) / (d.tu.length - 1);
      d.tu.forEach(function (w) { g.fillText(w, x, d.y + chan); x += doRong(w, fs, d.d) + cach; });
    });
    return { canvas: c, rong: o.rong, cao: bc.cao };
  }

  function thongTinKyDang(p) {
    var x = { fs: Number(giaTri(p, 'fs')) || 14, mau: MAU_MUC[giaTri(p, 'mau')] || MUC, chucDanh: giaTri(p, 'cd'),
              hoTen: giaTri(p, 'ht').trim(), coNgay: chonD(p, 'co-ngay'), diaDanh: C().DIA_DANH || '',
              khoangKy: (Number(giaTri(p, 'kk')) || 2.6) * PT_CM, chuKy: anhChuKy };
    var nd = /^(\d{4})-(\d{2})-(\d{2})$/.exec(giaTri(p, 'ngay'));
    if (nd) x.ngay = new Date(+nd[1], +nd[2] - 1, +nd[3]);
    if (dongDau(p)) { x.dau = anhDau; x.dauPt = (Number(giaTri(p, 'mm')) || 35) / 25.4 * 72; }
    return x;
  }
  function thongTinNxDang(p) {
    return { fs: Number(giaTri(p, 'fs')) || 14, mau: MAU_MUC[giaTri(p, 'mau')] || MUC, tieuDe: giaTri(p, 'td').trim(),
             noiDung: giaTri(p, 'nx'), rong: (Number(giaTri(p, 'nx-rong')) || 16) * PT_CM,
             gian: Number(giaTri(p, 'nx-gian')) || 1.15, canDeu: chonD(p, 'nx-deu'), lui: chonD(p, 'nx-lui') };
  }
  function veKhoiDang(p, loai, s) { return loai === 'ky' ? veKyDang(thongTinKyDang(p), s) : veNxDang(thongTinNxDang(p), s); }
  function coNx(p) { return chonD(p, 'nx-co'); }
  function nxCoChu(p) { return coNx(p) && !!(giaTri(p, 'td').trim() || giaTri(p, 'nx').trim()); }
  function batNx(p) {   // chọn đặt khối nhận xét mà đang tắt → bật lên
    if (p.dangDat === 'nx' && !coNx(p)) { oD(p, 'nx-co').checked = true; nhoD('nx-co', '1'); capChuDang(p); }
  }

  function capChuDang(p) {
    if (!oD(p, 'kk')) return;
    oD(p, 'kk-chu').textContent = soVN(giaTri(p, 'kk')) + ' cm';
    if (oD(p, 'mm-chu')) oD(p, 'mm-chu').textContent = giaTri(p, 'mm') + ' mm';
    oD(p, 'nx-rong-chu').textContent = soVN(giaTri(p, 'nx-rong')) + ' cm';
    oD(p, 'dong-ngay').hidden = !chonD(p, 'co-ngay');
    oD(p, 'muc-nx').classList.toggle('tat', !coNx(p));
    var bc = boCucNx(thongTinNxDang(p));
    oD(p, 'nx-cao').textContent = bc.dong.length ? soVN(bc.cao / PT_CM) + ' cm (' + bc.dong.length + ' dòng)' : 'tự tính';
  }
  function capNutLuuDang(p) {
    var n = oD(p, 'luu'), g = oD(p, 'goi-y');
    if (!n || !p.khoi) return;
    var thieuNx = nxCoChu(p) && !p.khoi.nx;
    n.disabled = !(p.khoi.ky && anhChuKy && p.byte) || thieuNx;
    oD(p, 'bo-khoi').hidden = !p.khoi[p.dangDat];
    oD(p, 'nhu-truoc').hidden = !nhoD('vi-tri') || !p.du;
    p.phu.querySelectorAll('[data-khs="dat"]').forEach(function (b) { b.classList.toggle('chon', b.getAttribute('data-loai') === p.dangDat); });
    ['ky', 'nx'].forEach(function (l) { var k = p.khoi[l]; if (k && k.el) k.el.classList.toggle('dang-dat', l === p.dangDat); });
    if (!anhChuKy) g.textContent = 'Bấm "Ký mới" để ký tên một lần; máy nhớ cho những lần sau.';
    else if (chonD(p, 'dong-dau') && !anhDau) g.textContent = 'Chưa có ảnh con dấu Đảng ủy: bấm "Chọn ảnh dấu" (ảnh chụp dấu đỏ trên giấy trắng), hoặc bỏ chọn Đóng dấu.';
    else if (!p.khoi.ky) g.textContent = 'Bấm vào trang, đúng chỗ muốn đặt khối chữ ký. Kéo khối để dời chỗ.';
    else if (thieuNx) g.textContent = 'Chọn "Khối nhận xét" ở trên rồi bấm lên trang để đặt. Kéo ô vuông ở mép phải khối để chỉnh bề rộng.';
    else g.textContent = (p.tuDat ? 'Đã đặt như lần trước. ' : '') + 'Xem lại các khối trên trang (kéo để dời; kéo mép phải khối nhận xét để chỉnh bề rộng), rồi bấm Ký và lưu.';
  }

  function veLaiDang(p, loai) {
    var k = p.khoi && p.khoi[loai];
    if (!k) return;
    if (loai === 'nx' && !coNx(p)) { boKhoiDang(p, 'nx'); return; }
    var tr = p.trang[k.trang];
    if (!tr) return;
    var v = veKhoiDang(p, loai, tr.vp.scale * Math.min(window.devicePixelRatio || 1, 2));
    if (!k.el) k.el = taoKhoiDang(p, loai);
    if (k.el.parentNode !== tr.giay) tr.giay.appendChild(k.el);
    k.rong = v.rong * tr.vp.scale; k.cao = Math.max(8, v.cao * tr.vp.scale);
    k.x = Math.max(0, Math.min(k.x, tr.vp.width - k.rong));
    k.y = Math.max(0, Math.min(k.y, tr.vp.height - k.cao));
    k.el.firstChild.src = v.canvas.toDataURL('image/png');
    k.el.style.left = k.x + 'px'; k.el.style.top = k.y + 'px';
    k.el.style.width = k.rong + 'px'; k.el.style.height = k.cao + 'px';
  }
  function veLaiDangCa(p) {
    if (!p.khoi) return;
    veLaiDang(p, 'ky'); veLaiDang(p, 'nx'); capChuDang(p); capNutLuuDang(p);
  }
  function taoKhoiDang(p, loai) {
    var el = document.createElement('div');
    el.className = 'khs-khoi';
    el.setAttribute('aria-label', loai === 'ky' ? 'Khối chữ ký' : 'Khối nhận xét');
    var im = document.createElement('img'); im.alt = ''; im.draggable = false;
    el.appendChild(im);
    var tay = null;
    if (loai === 'nx') { tay = document.createElement('span'); tay.className = 'khs-keo-rong'; tay.title = 'Kéo để chỉnh bề rộng'; el.appendChild(tay); }
    var bd = null;
    el.addEventListener('pointerdown', function (e) {
      e.preventDefault(); e.stopPropagation();
      var k = p.khoi[loai];
      p.dangDat = loai;
      bd = { x: e.clientX, y: e.clientY, ox: k.x, oy: k.y, rong: e.target === tay, cm: Number(giaTri(p, 'nx-rong')) || 16 };
      el.setPointerCapture(e.pointerId);
      capNutLuuDang(p);
    });
    el.addEventListener('pointermove', function (e) {
      if (!bd) return;
      var k = p.khoi[loai], tr = p.trang[k.trang];
      if (bd.rong) {
        var cm = bd.cm + (e.clientX - bd.x) / tr.vp.scale / PT_CM;
        cm = Math.max(4, Math.min(cm, (tr.vp.width - k.x) / tr.vp.scale / PT_CM, 18));
        oD(p, 'nx-rong').value = cm.toFixed(1);
        veLaiDang(p, 'nx'); capChuDang(p);
        return;
      }
      k.x = Math.max(0, Math.min(bd.ox + e.clientX - bd.x, tr.vp.width - k.rong));
      k.y = Math.max(0, Math.min(bd.oy + e.clientY - bd.y, tr.vp.height - k.cao));
      p.tuDat = false;
      el.style.left = k.x + 'px'; el.style.top = k.y + 'px';
    });
    function tha() { if (bd && bd.rong) nhoD('nx-rong', giaTri(p, 'nx-rong')); bd = null; capNutLuuDang(p); }
    el.addEventListener('pointerup', tha);
    el.addEventListener('pointercancel', tha);
    el.addEventListener('click', function (e) { e.stopPropagation(); });
    return el;
  }
  function boKhoiDang(p, loai) {
    var k = p.khoi && p.khoi[loai];
    if (k && k.el && k.el.parentNode) k.el.parentNode.removeChild(k.el);
    if (p.khoi) p.khoi[loai] = null;
    p.tuDat = false;
    capNutLuuDang(p);
  }
  function datKhoiDang(p, loai, so, x, y) {
    var cu = p.khoi[loai];
    if (cu && cu.el && cu.el.parentNode) cu.el.parentNode.removeChild(cu.el);
    p.khoi[loai] = { trang: so, x: x, y: y, el: cu && cu.el };
    veLaiDang(p, loai);
  }
  function datKhoiDangBam(p, e, giay) {
    var r = giay.getBoundingClientRect(), so = Number(giay.getAttribute('data-trang')), tr = p.trang[so];
    if (!tr) return;
    var loai = p.dangDat;
    batNx(p);
    var rong = (loai === 'nx' ? (Number(giaTri(p, 'nx-rong')) || 16) : 6) * PT_CM * tr.vp.scale;
    datKhoiDang(p, loai, so, e.clientX - r.left - (loai === 'nx' ? 10 : rong / 2), e.clientY - r.top - 12);
    p.tuDat = false;
    // Đặt xong khối chữ ký mà khối nhận xét có chữ, chưa đặt → chuyển sang đặt khối nhận xét
    if (loai === 'ky' && nxCoChu(p) && !p.khoi.nx) p.dangDat = 'nx';
    else if (loai === 'nx' && !p.khoi.ky) p.dangDat = 'ky';
    capChuDang(p); capNutLuuDang(p);
  }
  // Vị trí lần ký trước (theo tỉ lệ trang): văn bản cùng mẫu thì hai khối rơi đúng chỗ
  function datNhuTruocDang(p, tuDong) {
    if (!p.du || !p.khoi) return;
    var v = null;
    try { v = JSON.parse(nhoD('vi-tri') || 'null'); } catch (e) { v = null; }
    if (!v || !v.ky || (tuDong && p.khoi.ky)) { capNutLuuDang(p); return; }
    var n = p.trang.length, dau = null;
    ['ky', 'nx'].forEach(function (l) {
      var x = v[l];
      if (!x || (l === 'nx' && !coNx(p))) return;
      var so = x.cuoi ? n - 1 : Math.min(x.trang, n - 1), tr = p.trang[so];
      if (!tr) return;
      datKhoiDang(p, l, so, x.fx * tr.vp.width, x.fy * tr.vp.height);
      if (!dau) dau = { tr: tr, y: p.khoi[l].y };
    });
    p.tuDat = true;
    p.dangDat = 'ky';
    capChuDang(p); capNutLuuDang(p);
    var xem = oD(p, 'xem');
    if (dau && xem) xem.scrollTop = Math.max(0, dau.tr.giay.offsetTop + dau.y - xem.clientHeight / 3);
  }

  function doiODang(p, e, k) {
    if (!k) return;
    var x = e.target;
    if (e.type === 'change') {
      if (k === 'cd-mau') { if (x.value) { oD(p, 'cd').value = x.value; nhoD('cd-' + p.dang, x.value); } else oD(p, 'cd').focus(); }
      if (k === 'td-mau') { oD(p, 'td').value = x.value; nhoD('td-' + p.dang, x.value); }
      if (k === 'cau-mau') {
        var c = x.value; x.value = '';
        if (c) { var ta = oD(p, 'nx'); ta.value = ta.value.trim() ? ta.value.replace(/\s+$/, '') + '\n' + c : c; nxNho = ta.value; }
      }
      if (k === 'cd') { nhoD('cd-' + p.dang, x.value); oD(p, 'cd-mau').value = DANG[p.dang].cd.indexOf(x.value) >= 0 ? x.value : ''; }
      if (k === 'td') nhoD('td-' + p.dang, x.value);
      if (k === 'ht') nho('ho-ten', x.value.trim());
      if (['kk', 'mm', 'fs', 'mau', 'nx-rong', 'nx-gian'].indexOf(k) >= 0) nhoD(k, x.value);
      if (['co-ngay', 'dong-dau', 'nx-co', 'nx-deu', 'nx-lui'].indexOf(k) >= 0) nhoD(k, x.checked ? '1' : '0');
    }
    if (k === 'nx') nxNho = x.value;
    if (k === 'nx-co' && x.checked && p.khoi.ky && !p.khoi.nx && nxCoChu(p)) p.dangDat = 'nx';
    veLaiDangCa(p);
  }

  // Ghi hai khối vào PDF (mỗi khối một ảnh PNG, đúng cỡ pt) rồi gửi lên Drive
  function kyVaLuuDang(p) {
    var nut = oD(p, 'luu');
    if (!p.khoi.ky || !anhChuKy || !p.byte) return;
    var f = p.tep, viTri = {};
    var ve = ['ky', 'nx'].filter(function (l) { return p.khoi[l] && (l === 'ky' || nxCoChu(p)); }).map(function (l) {
      var k = p.khoi[l], tr = p.trang[k.trang];
      viTri[l] = { cuoi: k.trang === p.trang.length - 1, trang: k.trang, fx: k.x / tr.vp.width, fy: k.y / tr.vp.height };
      return { k: k, tr: tr, v: veKhoiDang(p, l, S_IN) };
    });
    nut.disabled = true; nut.textContent = 'Đang ghi vào tệp…';
    napPdfLib().then(function (L) {
      return L.PDFDocument.load(p.byte, { ignoreEncryption: true }).then(function (doc) {
        return ve.reduce(function (hua, x) {
          return hua.then(function () {
            return doc.embedPng(x.v.canvas.toDataURL('image/png')).then(function (png) {
              var pg = doc.getPage(x.k.trang);
              var goc = x.tr.vp.convertToPdfPoint(x.k.x, x.k.y + x.v.cao * x.tr.vp.scale);
              var xoay = ((pg.getRotation().angle % 360) + 360) % 360;
              pg.drawImage(png, { x: goc[0], y: goc[1], width: x.v.rong, height: x.v.cao, rotate: L.degrees(xoay) });
            });
          });
        }, Promise.resolve()).then(function () { return doc.save({ objectsPerTick: 2000 }); });
      });
    }).then(function (moi) {
      if (p.huy) return;
      nut.textContent = 'Đang lưu lên Drive (' + (moi.length / 1048576).toFixed(1).replace('.', ',') + ' MB)…';
      return goi('luu', { thu_muc: p.thuMuc, loai: p.loai, tep: f.id, sua_luc: p.suaLuc, b64: byteSangB64(moi) });
    }).then(function (kq) {
      if (p.huy || !kq) return;
      f.da_ky = kq.da_ky || f.da_ky;
      if (kq.sua_luc) f.sua_luc = kq.sua_luc;
      nhoD('vi-tri', JSON.stringify(viTri));
      if (p.pdf) { try { p.pdf.destroy(); } catch (x) { /* bỏ */ } p.pdf = null; }
      veDanhSach(p);
      baoNhanh('Đã ký và lưu "' + f.ten + '" vào hồ sơ ' + p.hoTen + '.');
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
    mo(n.getAttribute('data-ky-thu'), n.getAttribute('data-ky-ten') || '', n, n.getAttribute('data-ky-loai'), n.getAttribute('data-ky-dang'));
  }
  document.addEventListener('click', function (e) {
    var n = e.target.closest && e.target.closest('[data-ky-thu]');
    if (!n) return;
    e.preventDefault();
    moTu(n);
  });

  // ══════════════════════════════════════════════════════════════
  // TẠO THƯ MỤC HỒ SƠ (thầy Chung 30/10/2026: quản trị tự thêm thư mục, link
  // mà không phải nhờ ai). Dịch vụ chạy bằng Gmail chủ cây thư mục tạo hộ,
  // đặt cạnh thư mục "anh em" (cùng tổ / cùng hộp), chép thư mục con, chia sẻ
  // cho giáo viên; app ghi link vào CSDL (RLS: chỉ quản trị, BGH ghi được).
  // ══════════════════════════════════════════════════════════════
  function taoThuMuc(loai, khoa, ten, nut) {
    var laHs = loai === 'ho_so';
    var hoi = window.hopHoi
      ? window.hopHoi({ tieuDe: 'Tạo thư mục trên Drive?', bieuTuong: '📁', nutOK: 'Tạo thư mục',
          noiDung: laHs
            ? 'Tạo thư mục cho hồ sơ ' + ten + ', đặt cùng chỗ với các hồ sơ cùng hộp, rồi gắn link vào app.'
            : 'Tạo thư mục hồ sơ cá nhân cho ' + ten + ' trong thư mục tổ, chia sẻ quyền sửa cho Gmail của người này, rồi gắn link vào app.' })
      : Promise.resolve(window.confirm('Tạo thư mục trên Drive cho ' + ten + '?'));
    return hoi.then(function (dongY) {
      if (!dongY) return null;
      if (nut) { nut.disabled = true; nut.classList.add('dang-tao'); }
      baoNhanh('Đang tạo thư mục trên Drive…');
      return goi('tao_tm', { loai: laHs ? 'ho_so' : 'giao_vien', khoa: khoa }).then(function (kq) {
        var may = window.MAY_CHU, link = kq.link;
        var ghi = laHs
          ? may.from('ho_so').update({ link_drive: link }).eq('ma', khoa).select('ma')
          : Promise.all([
              may.from('moi_tai_khoan').update({ link_drive: link }).eq('email', khoa).select('email'),
              may.from('moi_tai_khoan').update({ link_drive: link }).eq('email_chinh', khoa).select('email')
            ]).then(function (r) { return { error: r[0].error || r[1].error, data: (r[0].data || []).concat(r[1].data || []) }; });
        return Promise.resolve(ghi).then(function (r) {
          if (r.error || !r.data || !r.data.length) {
            throw new Error('Đã tạo thư mục trên Drive nhưng chưa ghi được link vào app' +
              (r.error ? ' (' + r.error.message + ')' : '') + '. Link: ' + link);
          }
          if (laHs && window.HS_BAN_GHI && window.HS_BAN_GHI[khoa]) window.HS_BAN_GHI[khoa].link_drive = link;
          var chu = kq.da_co ? 'Hồ sơ này đã có thư mục — đã gắn lại link.'
            : 'Đã tạo thư mục cho ' + ten + (kq.chia_se ? ' và chia sẻ cho ' + kq.chia_se + ' Gmail' : '') + '.';
          if (kq.loi_chia_se && kq.loi_chia_se.length) chu += ' Chưa chia sẻ được cho: ' + kq.loi_chia_se.join(', ') + ' (kiểm tra lại Gmail).';
          baoNhanh(chu);
          if (window.napDuLieuThat) window.napDuLieuThat();
          return link;
        });
      }).catch(function (e) {
        if (nut) { nut.disabled = false; nut.classList.remove('dang-tao'); }
        var chu = (e && e.message) || String(e);
        if (window.hopBao) window.hopBao({ tieuDe: 'Chưa tạo được thư mục', bieuTuong: '⚠️', noiDung: chu });
        else baoNhanh(chu);
        return null;
      });
    });
  }
  document.addEventListener('click', function (e) {
    var n = e.target.closest && e.target.closest('[data-tao-tm]');
    if (!n) return;
    e.preventDefault(); e.stopPropagation();
    taoThuMuc(n.getAttribute('data-tao-loai') || 'giao_vien', n.getAttribute('data-tao-tm'), n.getAttribute('data-tao-ten') || '', n);
  });

  // ── Bảng ký ĐỨNG RIÊNG (07/11/2026): sổ chủ nhiệm ký khi tổ kiểm tra / BGH duyệt.
  //    Cùng chữ ký nhớ trên máy (khs:chu-ky:<gmail>) với nút ✍ ký giáo án.
  //    Trả Promise<dataURL PNG | null (không ký)>. ──
  function kyRieng(tieuDe) {
    return new Promise(function (xong) {
      var lop = document.createElement('div');
      lop.className = 'khs-bang-ky rieng';
      lop.setAttribute('role', 'dialog'); lop.setAttribute('aria-modal', 'true');
      lop.innerHTML = '<div class="khs-bk-hop"><b>' + t(tieuDe || 'Ký tên vào khung') + '</b>' +
        '<small>Dùng chuột hoặc ngón tay. Máy nhớ chữ ký cho những lần sau (dùng chung với ký giáo án).</small>' +
        '<canvas class="khs-bk-giay"></canvas><div class="khs-bk-nut">' +
        '<button type="button" class="khs-nut-phu" data-r="xoa">Ký lại</button><span class="khs-gian"></span>' +
        '<button type="button" class="khs-nut-phu" data-r="huy">Không ký</button>' +
        '<button type="button" class="nut-chinh" data-r="dung">Dùng chữ ký này</button></div></div>';
      document.body.appendChild(lop);
      var cv = lop.querySelector('canvas');
      var rong = Math.max(240, Math.min(520, lop.querySelector('.khs-bk-hop').clientWidth - 32)), cao = Math.round(rong * .42);
      var dpr = window.devicePixelRatio || 1;
      cv.style.width = rong + 'px'; cv.style.height = cao + 'px';
      cv.width = Math.round(rong * dpr); cv.height = Math.round(cao * dpr);
      var g = cv.getContext('2d'), co = false, ve = false, truoc = null;
      g.scale(dpr, dpr); g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = MUC; g.lineWidth = 2.6;
      cv.addEventListener('pointerdown', function (e) {
        e.preventDefault(); cv.setPointerCapture(e.pointerId);
        var r = cv.getBoundingClientRect(); ve = true; truoc = [e.clientX - r.left, e.clientY - r.top];
        g.beginPath(); g.arc(truoc[0], truoc[1], 1.2, 0, 7); g.fillStyle = MUC; g.fill(); co = true;
      });
      cv.addEventListener('pointermove', function (e) {
        if (!ve) return;
        var r = cv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
        g.beginPath(); g.moveTo(truoc[0], truoc[1]); g.lineTo(x, y); g.stroke(); truoc = [x, y];
      });
      var het = function () { ve = false; };
      cv.addEventListener('pointerup', het); cv.addEventListener('pointercancel', het);
      var dong = function (kq) { if (lop.parentNode) lop.parentNode.removeChild(lop); xong(kq); };
      lop.addEventListener('click', function (e) {
        var b = e.target.closest && e.target.closest('[data-r]');
        if (!b) return;
        var r = b.getAttribute('data-r');
        if (r === 'xoa') { g.clearRect(0, 0, cv.width, cv.height); co = false; }
        else if (r === 'huy') dong(null);
        else if (r === 'dung') {
          var c = co && catSat(cv);
          if (!c) { baoNhanh('Thầy cô ký vào khung trước đã.'); return; }
          var url = c.toDataURL('image/png');
          nho('chu-ky', url);
          dong(url);
        }
      });
    });
  }

  window.KY_HO_SO = {
    // Sổ chủ nhiệm (07/11/2026): chữ ký / dấu đã nhớ trên máy + bảng ký riêng
    chuKyToi: function () { return nho('chu-ky') || ''; },
    dauToi: function () { return nho('dau') || ''; },
    kyRieng: kyRieng,
    taoThuMuc: taoThuMuc,
    mo: mo,
    // Nút "Kiểm tra ngay" (app.js): {mã hồ sơ: id thư mục} → {mã: số tệp | -1}
    demTep: function (ds) { return goi('dem', { ds: ds }).then(function (kq) { return kq.dem || {}; }); },
    moTu: moTu,   // nút nằm trong vùng chặn nổi bọt (dòng danh mục hồ sơ, app.js) gọi thẳng
    bat: function () { return !!(urlDichVu() && window.MAY_CHU); },
    // phần thuần cho bài thử
    _chuNgay: chuNgay, _chucDanhTu: chucDanhTu
  };
})();
