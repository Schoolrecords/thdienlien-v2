// ============================================================
// app.js — khung SPA + vẽ 3 module (phong cách Bạch Liêu)
// Khi nối Supabase: các file *-sql.js ghi đè mảng dữ liệu trong
// du-lieu-demo.js rồi gọi lại veTatCa() — không sửa file này.
// ============================================================
(function () {
  'use strict';

  function $(s, p) { return (p || document).querySelector(s); }
  function $$(s, p) { return Array.prototype.slice.call((p || document).querySelectorAll(s)); }
  function boDau(s) {
    return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
  }
  function thoatHTML(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // ── Điều hướng: hero chỉ hiện ở Trang chủ ──
  function chuyenManHinh(ma) {
    $$('.man-hinh').forEach(function (m) { m.classList.toggle('hien', m.id === 'mh-' + ma); });
    $$('nav.menu button').forEach(function (b) {
      b.classList.toggle('dang-chon', b.getAttribute('data-di') === ma);
    });
    $('#hero').style.display = (ma === 'home') ? '' : 'none';
    window.scrollTo(0, 0);
  }
  window.chuyenManHinh = chuyenManHinh;

  // ── Đếm chung ──
  function demTrangThai(ds) {
    var co = 0, dang = 0;
    ds.forEach(function (h) { if (h.tt === 'co') co++; else if (h.tt === 'dang') dang++; });
    return { co: co, dang: dang, chua: ds.length - co - dang, tong: ds.length };
  }

  // ── Trang chủ + thống kê màn Hồ sơ ──
  function veThongKe() {
    var d = demTrangThai(window.HO_SO);
    $('#tk-tong').textContent = d.tong;
    $('#hs-tong').textContent = d.tong;
    $('#hs-co').textContent = d.co;
    $('#hs-co-nhan').textContent = 'Đã có — ' + Math.round(d.co * 100 / d.tong) + '%';
    $('#hs-dang').textContent = d.dang;
    $('#hs-chua').textContent = d.chua;
    $('#td-tong').style.width = '100%';
    $('#td-co').style.width = Math.round(d.co * 100 / d.tong) + '%';
  }

  // ── Module 1: Quản lý Hồ sơ ──
  var hopDangMo = null; // null = lưới thẻ hộp; 'H01'… = danh mục chi tiết
  var tuKhoa = '';
  var locTT = 'tatca';

  function dongHoSoHTML(h, hienHop) {
    var hop = window.HOP[h.hop];
    return '<div class="dong-ho-so">' +
      '<span class="cham ' + h.tt + '"></span>' +
      '<div class="ten">' + thoatHTML(h.ten) +
      '<small>Mã cũ: ' + thoatHTML(h.maCu) + ' · Tiêu chí TT57: ' + h.tc.join(', ') +
      (hienHop ? ' · ' + thoatHTML(hop.ten) : '') + '</small></div>' +
      '<span class="ma">' + thoatHTML(h.ma) + '</span></div>';
  }

  function veHoSo() {
    var vung = $('#vung-hop');
    var tim = boDau(tuKhoa);

    // Đang tìm kiếm hoặc lọc → hiện danh sách phẳng toàn trường
    if (tim || locTT !== 'tatca') {
      var kq = window.HO_SO.filter(function (h) {
        if (locTT !== 'tatca' && h.tt !== locTT) return false;
        if (!tim) return true;
        var hop = window.HOP[h.hop];
        return boDau(h.ten + ' ' + h.ma + ' ' + h.maCu + ' ' + hop.ten + ' ' + hop.phuTrach).indexOf(tim) >= 0;
      });
      vung.innerHTML = kq.length
        ? '<div class="bang-ho-so">' + kq.map(function (h) { return dongHoSoHTML(h, true); }).join('') + '</div>'
        : '<div class="the-thong-bao">Không tìm thấy hồ sơ phù hợp.</div>';
      return;
    }

    // Đang mở một hộp → danh mục chi tiết
    if (hopDangMo) {
      var hop = window.HOP[hopDangMo];
      var ds = window.HO_SO.filter(function (h) { return h.hop === hopDangMo; });
      vung.innerHTML =
        '<button class="nut-quay-lai" id="nut-quay-lai">← Quay lại các hộp hồ sơ</button>' +
        '<div class="nhom-tc"><div class="dau-nhom"><span class="so-tc">' + hopDangMo.replace('H', '') + '</span>' +
        '<div><div style="font-size:10.5px;letter-spacing:.2em;color:#b9d2c7">HỘP HỒ SƠ · ' + thoatHTML(hop.phuTrach).toUpperCase() + '</div>' +
        thoatHTML(hop.ten).toUpperCase() + '</div></div>' +
        '<div class="than-nhom">' + ds.map(function (h) { return dongHoSoHTML(h, false); }).join('') + '</div></div>';
      $('#nut-quay-lai').addEventListener('click', function () { hopDangMo = null; veHoSo(); });
      return;
    }

    // Mặc định → lưới thẻ hộp theo bộ phận
    var html = '';
    window.BO_PHAN.forEach(function (bp) {
      var theHop = bp.hop.map(function (maHop) {
        var hop = window.HOP[maHop];
        var ds = window.HO_SO.filter(function (h) { return h.hop === maHop; });
        var d = demTrangThai(ds);
        var pt = d.tong ? Math.round(d.co * 100 / d.tong) : 0;
        return '<div class="the-hop" data-hop="' + maHop + '">' +
          '<div class="dau"><span class="so-hop">' + maHop.replace('H', '') + '</span>' +
          '<div><div class="phu-tren">HỘP HỒ SƠ</div><div class="ten-hop">' + thoatHTML(hop.ten) + '</div></div></div>' +
          '<div class="than"><div class="mo-ta">' + thoatHTML(hop.moTa) + '</div>' +
          '<div class="thanh-tien-do"><i style="width:' + pt + '%"></i></div>' +
          '<div class="chan"><b>' + d.co + '/' + d.tong + ' hồ sơ đã có</b><span class="mo-dm">Mở danh mục →</span></div>' +
          '</div></div>';
      }).join('');
      html += '<div class="dau-muc" style="text-align:left;margin:22px 0 12px">' +
        '<div class="nhan-nho">' + bp.icon + ' ' + thoatHTML(bp.ten) + '</div></div>' +
        '<div class="luoi-hop">' + theHop + '</div>';
    });
    vung.innerHTML = html;
    $$('.the-hop', vung).forEach(function (t) {
      t.addEventListener('click', function () {
        hopDangMo = t.getAttribute('data-hop');
        veHoSo();
        window.scrollTo(0, 0);
      });
    });
  }

  // ── Module 2: Trường chuẩn Quốc gia ──
  function veTieuChi() {
    var goc = $('#danh-sach-tieu-chi');
    var html = '';
    window.TIEU_CHUAN.forEach(function (tc) {
      var dong = window.TIEU_CHI.filter(function (t) { return t.ma.charAt(0) === String(tc.so); })
        .map(function (t) {
          var soMC = window.HO_SO.filter(function (h) { return h.tc.indexOf(t.ma) >= 0; }).length;
          return '<div class="dong-tc"><span class="ma-tc">' + t.ma + '</span>' +
            '<span class="ten-tc">' + thoatHTML(t.ten) +
            '<span class="nhan-mc">' + soMC + ' minh chứng trong kho hồ sơ</span></span>' +
            (t.batBuoc ? '<span class="nhan-bb">BẮT BUỘC</span>' : '') + '</div>';
        }).join('');
      html += '<div class="nhom-tc"><div class="dau-nhom"><span class="so-tc">' + tc.so + '</span>' +
        'Tiêu chuẩn ' + tc.so + '. ' + thoatHTML(tc.ten) + '</div>' +
        '<div class="than-nhom">' + dong + '</div></div>';
    });
    goc.innerHTML = html;
  }

  // ── Khởi động ──
  document.addEventListener('DOMContentLoaded', function () {
    $$('.dien-ten-truong').forEach(function (e) { e.textContent = window.CAU_HINH.TEN_TRUONG; });
    $('#dien-slogan').textContent = window.CAU_HINH.SLOGAN;
    $('#dien-nam-hoc').textContent = window.CAU_HINH.NAM_HOC;
    $('#dien-muc-tieu').textContent = window.CAU_HINH.MUC_TIEU_CHUAN_QG.toLowerCase();
    if (window.DA_NOI) $('#bang-xem-thu').style.display = 'none';

    $$('nav.menu button').forEach(function (b) {
      b.addEventListener('click', function () { chuyenManHinh(b.getAttribute('data-di')); });
    });
    $('#o-tim-ho-so').addEventListener('input', function () { tuKhoa = this.value; veHoSo(); });
    $('#chon-trang-thai').addEventListener('change', function () { locTT = this.value; veHoSo(); });

    veTatCa();
  });

  function veTatCa() { veThongKe(); veHoSo(); veTieuChi(); }
  window.veTatCa = veTatCa;
})();
