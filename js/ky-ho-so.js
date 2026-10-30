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
  function chucDanhTu(cv) {
    var b = boDau(cv).trim();
    if (/^pho hieu truong/.test(b)) return 'PHÓ HIỆU TRƯỞNG';
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
    function f(px, dam) { return (dam ? 'bold ' : '') + Math.round(px * co * tl) / tl + 'px ' + PH; }
    function bo(chu, px, dam, giua) {         // ngắt dòng theo bề ngang
      g.font = f(px, dam);
      String(chu).split(/\n/).forEach(function (doan) {
        var tu = doan.split(/\s+/), hang = '';
        tu.forEach(function (w) {
          var thu = hang ? hang + ' ' + w : w;
          if (g.measureText(thu).width > rong - 2 * dem && hang) { dong.push({ s: hang, f: f(px, dam), px: px, giua: giua }); hang = w; }
          else hang = thu;
        });
        dong.push({ s: hang, f: f(px, dam), px: px, giua: giua });
      });
    }
    if (o.ketLuan) bo(o.ketLuan, 13.5, true, false);
    if (o.nhanXet) bo(o.nhanXet, 13, false, false);
    var dauKy = dong.length;
    bo(o.diaDanh ? o.diaDanh + ', ' + chuNgay(new Date()) : chuNgay(new Date()).replace(/^n/, 'N'), 12.5, false, true);
    if (o.chucDanh) bo(o.chucDanh, 13, true, true);
    var caoKy = 46 * co, iKy = dong.length;
    if (o.hoTen) bo(o.hoTen, 13.5, true, true);

    var dg = function (d) { return d.px * co * 1.38; };
    dong.forEach(function (d, i) { cao += dg(d); if (i === dauKy && dauKy > 0) cao += 6 * co; });
    cao += caoKy + 2 * dem;
    c.width = Math.ceil(rong * tl); c.height = Math.ceil(cao * tl);
    g.scale(tl, tl);
    g.fillStyle = MUC; g.textBaseline = 'top';
    var y = dem;
    dong.forEach(function (d, i) {
      if (i === dauKy && dauKy > 0) y += 6 * co;
      if (i === iKy) {
        if (anhChuKy) {
          var r = Math.min((rong - 2 * dem) / anhChuKy.width, caoKy / anhChuKy.height);
          var w = anhChuKy.width * r, h = anhChuKy.height * r;
          g.drawImage(anhChuKy, (rong - w) / 2, y + (caoKy - h) / 2, w, h);
        }
        y += caoKy;
      }
      g.font = d.f;
      g.textAlign = d.giua ? 'center' : 'left';
      g.fillText(d.s, d.giua ? rong / 2 : dem, y + d.px * co * .16);
      y += dg(d);
    });
    if (iKy >= dong.length) {   // không có họ tên: chữ ký vẫn phải vẽ
      if (anhChuKy) {
        var r2 = Math.min((rong - 2 * dem) / anhChuKy.width, caoKy / anhChuKy.height);
        g.drawImage(anhChuKy, (rong - anhChuKy.width * r2) / 2, y, anhChuKy.width * r2, anhChuKy.height * r2);
      }
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
    if (p.pdf) { try { p.pdf.destroy(); } catch (e) { /* đã huỷ */ } }
    if (p.phu.parentNode) p.phu.parentNode.removeChild(p.phu);
    if (p.tro && p.tro.focus) p.tro.focus();
  }
  function phim(e) {
    if (e.key !== 'Escape' || !phien) return;
    if (phien.phu.querySelector('.khs-bang-ky:not([hidden])')) { dongBangKy(); return; }
    dong();
  }

  function mo(thuMuc, hoTen, tro) {
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
    phien = { phu: phu, thuMuc: thuMuc, hoTen: hoTen, tro: tro, huy: false, ds: [], nguoiKy: {} };
    document.documentElement.classList.add('ck-xvb-khoa');
    document.addEventListener('keydown', phim);
    phu.addEventListener('click', bam);
    phu.addEventListener('input', doiO);
    phu.addEventListener('change', doiO);
    phu.querySelector('[data-khs="dong"]').focus();
    taiDanhSach(phien);
  }

  function than(p) { return p.phu.querySelector('[data-khs="than"]'); }
  function phuDe(p, s) { p.phu.querySelector('[data-khs="phu-de"]').textContent = s; }

  function taiDanhSach(p) {
    goi('ds', { thu_muc: p.thuMuc }).then(function (kq) {
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
    phuDe(p, 'Chọn tệp PDF cần kiểm tra');
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
    p.man = 'ky'; p.tep = f; p.dat = null; p.trang = [];
    phuDe(p, f.ten);
    var nk = p.nguoiKy || {};
    var chucDanh = nho('chuc-danh') || chucDanhTu(nk.chuc_vu);
    var hoTen = nho('ho-ten') || nk.ho_ten || (window.NGUOI_DUNG || {}).ho_ten || '';
    than(p).innerHTML =
      '<div class="khs-ky">' +
        '<div class="khs-xem" data-khs="xem"><p class="ck-xvb-cho">Đang tải giáo án…</p></div>' +
        '<div class="khs-ben">' +
          '<button type="button" class="khs-lui" data-khs="lui">‹ Danh sách tệp</button>' +
          '<div class="khs-o"><span class="khs-nhan">Kết luận</span>' +
            '<div class="khs-chon">' +
              '<label><input type="radio" name="khs-kl" value="Đã kiểm tra. Đạt yêu cầu." checked> Đạt yêu cầu</label>' +
              '<label><input type="radio" name="khs-kl" value="Đã kiểm tra. Cần bổ sung, điều chỉnh."> Cần bổ sung</label>' +
              '<label><input type="radio" name="khs-kl" value="Đã kiểm tra."> Chỉ ghi đã kiểm tra</label>' +
            '</div></div>' +
          '<label class="khs-o"><span class="khs-nhan">Nhận xét (không bắt buộc)</span>' +
            '<textarea data-khs="nx" rows="3" maxlength="400" placeholder="Ví dụ: Mục tiêu rõ, cần thêm hoạt động vận dụng."></textarea></label>' +
          '<div class="khs-hai">' +
            '<label class="khs-o"><span class="khs-nhan">Chức danh</span><input data-khs="cd" value="' + t(chucDanh) + '"></label>' +
            '<label class="khs-o"><span class="khs-nhan">Họ tên</span><input data-khs="ht" value="' + t(hoTen) + '"></label>' +
          '</div>' +
          '<div class="khs-o"><span class="khs-nhan">Chữ ký</span>' +
            '<div class="khs-chu-ky"><span data-khs="anh-ky" class="khs-anh-ky"></span>' +
            '<button type="button" class="khs-nut-phu" data-khs="ky-moi">Ký mới</button></div></div>' +
          '<label class="khs-o"><span class="khs-nhan">Cỡ khối chữ ký</span>' +
            '<input type="range" data-khs="co" min="170" max="340" step="10" value="' + t(nho('co') || 240) + '"></label>' +
          '<p class="khs-goi-y" data-khs="goi-y">Bấm vào trang giáo án, đúng chỗ muốn đặt chữ ký. Kéo khối chữ ký để dời chỗ.</p>' +
          '<button type="button" class="nut-chinh khs-luu" data-khs="luu" disabled>Ký và lưu vào Drive</button>' +
        '</div>' +
      '</div>';
    napChuKy(p);
    var xem = p.phu.querySelector('[data-khs="xem"]');
    Promise.all([goi('tai', { thu_muc: p.thuMuc, tep: f.id }), napPdfJs()]).then(function (r) {
      if (p.huy || p.tep !== f) return;
      p.byte = b64SangByte(r[0].b64);
      p.suaLuc = r[0].sua_luc;
      return r[1].getDocument({ data: p.byte.slice() }).promise;   // pdf.js chiếm bộ đệm → đưa bản sao
    }).then(function (pdf) {
      if (!pdf || p.huy || p.tep !== f) return;
      if (p.pdf) { try { p.pdf.destroy(); } catch (e) { /* bỏ */ } }
      p.pdf = pdf;
      xem.innerHTML = '';
      var rongKhung = Math.min(xem.clientWidth - 24, 860);
      var n = 0;
      (function veTiep() {
        if (p.huy || p.tep !== f || ++n > pdf.numPages) return;
        var so = n;
        pdf.getPage(so).then(function (trang) {
          if (p.huy || p.tep !== f) return;
          var v1 = trang.getViewport({ scale: 1 });
          var tl = rongKhung / v1.width, vp = trang.getViewport({ scale: tl });
          var dpr = Math.min(window.devicePixelRatio || 1, 2);
          var giay = document.createElement('div');
          giay.className = 'ck-xvb-giay khs-giay';
          giay.setAttribute('data-trang', so - 1);
          giay.style.width = vp.width + 'px'; giay.style.height = vp.height + 'px';
          var cv = document.createElement('canvas');
          cv.width = Math.floor(vp.width * dpr); cv.height = Math.floor(vp.height * dpr);
          cv.style.width = vp.width + 'px'; cv.style.height = vp.height + 'px';
          giay.appendChild(cv);
          giay.insertAdjacentHTML('beforeend', '<span class="ck-xvb-so">' + so + ' / ' + pdf.numPages + '</span>');
          xem.appendChild(giay);
          p.trang[so - 1] = { vp: vp, giay: giay };
          return trang.render({ canvasContext: cv.getContext('2d'), viewport: vp,
            transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : null }).promise;
        }).then(veTiep, veTiep);
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
  function rongKhoi(p, tr) { return (Number(giaTri(p, 'co')) || 240) * tr.vp.width / RONG_CHUAN; }
  function giaTri(p, k) { var o = p.phu.querySelector('[data-khs="' + k + '"]'); return o ? o.value : ''; }
  function thongTinKhoi(p) {
    var kl = p.phu.querySelector('input[name="khs-kl"]:checked');
    return { ketLuan: kl ? kl.value : '', nhanXet: giaTri(p, 'nx').trim(), diaDanh: C().DIA_DANH || '',
             chucDanh: giaTri(p, 'cd').trim().toUpperCase(), hoTen: giaTri(p, 'ht').trim() };
  }

  function napChuKy(p) {
    var du = nho('chu-ky');
    var o = p.phu.querySelector('[data-khs="anh-ky"]');
    anhChuKy = null;
    if (!du) { o.innerHTML = '<em>Chưa có chữ ký</em>'; capNutLuu(p); return; }
    var im = new Image();
    im.onload = function () { anhChuKy = im; o.innerHTML = ''; o.appendChild(im.cloneNode()); veLaiKhoi(p); };
    im.src = du;
  }

  function capNutLuu(p) {
    var n = p.phu.querySelector('[data-khs="luu"]'), g = p.phu.querySelector('[data-khs="goi-y"]');
    if (!n) return;
    n.disabled = !(p.dat && anhChuKy && p.byte);
    if (!anhChuKy) g.textContent = 'Bấm "Ký mới" để ký tên một lần; máy nhớ cho những lần sau.';
    else if (!p.dat) g.textContent = 'Bấm vào trang giáo án, đúng chỗ muốn đặt chữ ký. Kéo khối chữ ký để dời chỗ.';
    else g.textContent = 'Kiểm tra lại khối chữ ký trên trang (kéo để dời), rồi bấm Ký và lưu.';
  }

  // Đặt / vẽ lại khối chữ ký trên trang đang chọn
  function veLaiKhoi(p) {
    if (!p.dat) { capNutLuu(p); return; }
    var tr = p.trang[p.dat.trang];
    if (!tr) return;
    var k = veKhoi(thongTinKhoi(p), rongKhoi(p, tr));
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
    if (p.man !== 'ky') return;
    if (e.type === 'change') {
      if (k === 'cd') nho('chuc-danh', e.target.value.trim());
      if (k === 'ht') nho('ho-ten', e.target.value.trim());
      if (k === 'co') nho('co', e.target.value);
    }
    veLaiKhoi(p);
  }

  // ── Ghi chữ ký vào PDF rồi gửi lên Drive ──
  function kyVaLuu(p) {
    var nut = p.phu.querySelector('[data-khs="luu"]');
    if (!p.dat || !anhChuKy || !p.byte) return;
    var f = p.tep, dat = p.dat, tr = p.trang[dat.trang];
    nut.disabled = true; nut.textContent = 'Đang ký và lưu…';
    // Bản in vẽ lại ở bề ngang cố định 520 (x3 = 1560 px ảnh) cho nét — mọi kích
    // thước trong veKhoi tỉ lệ với bề ngang nên bố cục y như khối trên màn hình.
    var k = veKhoi(thongTinKhoi(p), 520);
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
          return doc.save();
        });
      });
    }).then(function (moi) {
      return goi('luu', { thu_muc: p.thuMuc, tep: f.id, sua_luc: p.suaLuc, b64: byteSangB64(moi) });
    }).then(function (kq) {
      if (p.huy) return;
      f.da_ky = kq.da_ky || f.da_ky;
      if (kq.sua_luc) f.sua_luc = kq.sua_luc;
      if (p.pdf) { try { p.pdf.destroy(); } catch (x) { /* bỏ */ } p.pdf = null; }
      veDanhSach(p);
      baoNhanh('Đã ký và lưu "' + f.ten + '" vào thư mục của ' + p.hoTen + '.');
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
          if (sang > 165) d[i + 3] = 0;
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
  document.addEventListener('click', function (e) {
    var n = e.target.closest && e.target.closest('[data-ky-thu]');
    if (!n) return;
    e.preventDefault();
    mo(n.getAttribute('data-ky-thu'), n.getAttribute('data-ky-ten') || '', n);
  });

  window.KY_HO_SO = {
    mo: mo,
    bat: function () { return !!(C().LINK_KY_HO_SO && window.MAY_CHU); },
    // phần thuần cho bài thử
    _chuNgay: chuNgay, _chucDanhTu: chucDanhTu
  };
})();
