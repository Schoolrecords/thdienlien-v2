// ============================================================
// app.js — khung SPA + vẽ các module (kế thừa giao diện THCS Bạch Liêu)
// Khi nối Supabase: du-lieu-sql.js ghi đè các mảng dữ liệu rồi gọi lại
// veTatCa() — không sửa file này.
// ============================================================
(function () {
  'use strict';

  function $(s, p) { return (p || document).querySelector(s); }
  function $$(s, p) { return Array.prototype.slice.call((p || document).querySelectorAll(s)); }
  function boDau(s) {
    return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
  }
  function thoatHTML(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  window.boDau = boDau;
  window.thoatHTML = thoatHTML;

  var ST_LABEL = { co: 'Đã có', dang: 'Đang cập nhật', chua: 'Chưa có' };
  window.ST_LABEL = ST_LABEL;

  // ── Thông báo nổi (toast) ──
  var toastTimer = null;
  window.notify = function (msg) {
    var t = $('#toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('on'); }, 3600);
  };

  // ── Điều hướng: hero chỉ hiện ở Trang chủ ──
  function chuyenManHinh(ma) {
    $$('.man-hinh').forEach(function (m) { m.classList.toggle('hien', m.id === 'mh-' + ma); });
    var nutSang = (ma === 'cbgv') ? 'hoso' : ma;
    $$('nav.menu button').forEach(function (b) {
      b.classList.toggle('dang-chon', b.getAttribute('data-di') === nutSang);
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

  // ════════════════════════════════════════════════════════════
  // MODULE 1 · QUẢN TRỊ HỒ SƠ — thẻ bộ phận → lớp phủ chi tiết
  // (kế thừa giao diện danh mục minh chứng của THCS Bạch Liêu)
  // ════════════════════════════════════════════════════════════
  var tuKhoa = '';
  var locTT = 'tatca';
  var boPhanDangMo = null; // soTT bộ phận đang mở trong lớp phủ

  function banGhi(ma) { // bản ghi đầy đủ trong CSDL (null ở chế độ xem thử)
    return (window.HS_BAN_GHI && window.HS_BAN_GHI[ma]) || null;
  }

  // Một dòng minh chứng trong bảng
  function dongBang(h, hienHop) {
    var hs = banGhi(h.ma);
    var link = (hs && hs.link_drive) || h.link || '';
    var suaDuoc = window.coQuyenSuaHoSo ? window.coQuyenSuaHoSo(h.ma) : false;
    return '<tr data-ma="' + thoatHTML(h.ma) + '">' +
      '<td class="code">' + thoatHTML(h.ma) +
      (h.maCu
        ? '<span class="ma-cu" title="Mã theo danh mục cũ, dùng đối chiếu hồ sơ giấy">' + thoatHTML(h.maCu) + '</span>'
        : '<span class="ma-cu ma-moi" title="Minh chứng mới theo Thông tư 57">mục mới</span>') + '</td>' +
      '<td class="rname">' + thoatHTML(h.ten) +
      (hienHop ? '<span class="hop-phu">' + thoatHTML(window.HOP[h.hop].ten) + '</span>' : '') +
      '<span class="crits">' + (h.tc || []).map(function (c) {
        return '<span class="tag-crit" onclick="event.stopPropagation();xemTieuChi(\'' + c + '\')">Tiêu chí ' + c + '</span>';
      }).join('') + '</span></td>' +
      '<td class="owner">' + thoatHTML(h.phuTrach || (window.HOP[h.hop] || {}).phuTrach || '—') + '</td>' +
      '<td class="tdst"><span class="st st-' + h.tt + '">' + ST_LABEL[h.tt] + '</span>' +
      (link
        ? '<a class="drive" href="' + thoatHTML(link) + '" target="_blank" rel="noopener" title="Mở thư mục trên Drive" onclick="event.stopPropagation()">📂</a>'
        : '<button class="drive mo" title="Chưa gán thư mục Drive" onclick="event.stopPropagation();window.notify(\'Hồ sơ này chưa được gán thư mục trên Drive.\')">📂</button>') +
      (suaDuoc ? '<button class="drive hs-sua" title="Sửa hồ sơ này" onclick="event.stopPropagation();moSuaHoSo(\'' + thoatHTML(h.ma) + '\')">✏️</button>' : '') +
      '</td></tr>';
  }

  // Lưới 5 thẻ bộ phận (mặc định của màn Hồ sơ)
  function veHoSo() {
    var vung = $('#vung-hop');
    var tim = boDau(tuKhoa);

    // Đang gõ tìm hoặc lọc trạng thái → bảng phẳng toàn trường
    if (tim || locTT !== 'tatca') {
      var kq = window.HO_SO.filter(function (h) {
        if (locTT !== 'tatca' && h.tt !== locTT) return false;
        if (!tim) return true;
        var hop = window.HOP[h.hop] || {};
        return boDau(h.ten + ' ' + h.ma + ' ' + h.maCu + ' ' + hop.ten + ' ' + (h.phuTrach || hop.phuTrach)).indexOf(tim) >= 0;
      });
      vung.innerHTML = kq.length
        ? '<div class="sub open"><div class="sub-body" style="display:block"><table class="rec-tbl"><thead><tr>' +
          '<th style="width:120px">Mã minh chứng<br><span class="th-phu">mã mới / mã cũ</span></th><th>Tên minh chứng</th>' +
          '<th style="width:170px">Người phụ trách</th><th style="width:190px;text-align:right">Trạng thái</th></tr></thead><tbody>' +
          kq.map(function (h) { return dongBang(h, true); }).join('') + '</tbody></table></div></div>'
        : '<div class="the-thong-bao">Không tìm thấy hồ sơ phù hợp.</div>';
      return;
    }

    // Mặc định → 5 thẻ bộ phận
    vung.innerHTML = '<div class="cat-grid">' + window.BO_PHAN.map(function (bp) {
      var ds = window.HO_SO.filter(function (h) { return bp.hop.indexOf(h.hop) >= 0; });
      var d = demTrangThai(ds);
      var pt = d.tong ? Math.round(d.co * 100 / d.tong) : 0;
      var moTa = bp.hop.map(function (m) { return (window.HOP[m] || {}).ten; }).join(' · ');
      return '<button class="cat" onclick="moBoPhan(' + bp.soTT + ')">' +
        '<div class="cat-top"><div class="ic">' + String(bp.soTT).padStart(2, '0') + '</div>' +
        '<div class="tt"><div class="no">BỘ PHẬN ' + bp.icon + '</div><h3>' + thoatHTML(bp.ten) + '</h3></div></div>' +
        '<div class="cat-body"><p>' + thoatHTML(moTa) + '</p>' +
        '<div class="prog"><i style="width:' + pt + '%"></i></div>' +
        '<div class="cat-foot" style="margin-top:10px"><span class="cat-cnt">' + d.co + '/' + d.tong + ' hồ sơ đã có</span>' +
        '<span class="cat-open">Mở danh mục →</span></div></div></button>';
    }).join('') +
      // Thẻ thứ 6: lối vào hồ sơ đội ngũ
      '<button class="cat" onclick="chuyenManHinh(\'cbgv\')">' +
      '<div class="cat-top"><div class="ic">👥</div>' +
      '<div class="tt"><div class="no">ĐỘI NGŨ</div><h3>Hồ sơ CBGV – NV</h3></div></div>' +
      '<div class="cat-body"><p>Hồ sơ cá nhân của ban giám hiệu, giáo viên, nhân viên và đường dẫn tới hồ sơ trên Drive.</p>' +
      '<div class="prog" style="visibility:hidden"><i style="width:0"></i></div>' +
      '<div class="cat-foot" style="margin-top:10px"><span class="cat-cnt">Toàn trường</span>' +
      '<span class="cat-open">Xem đội ngũ →</span></div></div></button>' +
      '</div>';
  }

  // ── Lớp phủ chi tiết một bộ phận ──
  window.moBoPhan = function (soTT, maChon) {
    var bp = window.BO_PHAN.filter(function (b) { return b.soTT === soTT; })[0];
    if (!bp) return;
    boPhanDangMo = soTT;

    var dsBP = window.HO_SO.filter(function (h) { return bp.hop.indexOf(h.hop) >= 0; });
    var d = demTrangThai(dsBP);

    $('#lp-ic').textContent = String(soTT).padStart(2, '0');
    $('#lp-ic').className = 'ic num';
    $('#lp-tieu-de').textContent = bp.ten;
    $('#lp-phu').textContent = bp.hop.map(function (m) { return (window.HOP[m] || {}).ten; }).join(' · ');

    var hopChon = maChon ? (window.HO_SO.filter(function (h) { return h.ma === maChon; })[0] || {}).hop : null;

    $('#lp-than').innerHTML =
      '<div class="sheet-sum"><div>' +
      '<div class="big">' + d.co + '/' + d.tong + ' hồ sơ đã có tệp</div>' +
      '<div class="sub-chu">' + (window.DA_NOI ? 'Số liệu đọc trực tiếp từ cơ sở dữ liệu' : 'Đang xem dữ liệu mẫu') + '</div>' +
      '</div><div class="sp"></div>' +
      '<button class="nut-kiem-tra" onclick="window.notify(\'Chức năng rà soát thư mục Drive sẽ mở khi nạp xong link Drive các hồ sơ.\')">🔄 Kiểm tra ngay</button></div>' +
      bp.hop.map(function (maHop, i) {
        var hop = window.HOP[maHop];
        var ds = window.HO_SO.filter(function (h) { return h.hop === maHop; });
        var mo = hopChon ? (maHop === hopChon) : (i === 0);
        return '<div class="sub' + (mo ? ' open' : '') + '">' +
          '<div class="sub-head" role="button" tabindex="0"' +
          ' onclick="if(!event.target.closest(\'.sub-word\'))this.parentNode.classList.toggle(\'open\')"' +
          ' onkeydown="if(event.key===\'Enter\'||event.key===\' \'){event.preventDefault();this.parentNode.classList.toggle(\'open\')}">' +
          '<span class="fo">📁</span><b>' + thoatHTML(maHop + '. ' + hop.ten) + '</b>' +
          '<button type="button" class="sub-word" title="Tải phiếu giao việc của hộp này ra Word"' +
          ' onclick="event.stopPropagation();xuatHopWord(\'' + maHop + '\')">📄 Tải file Word</button>' +
          '<span class="sub-cnt">' + ds.length + ' hồ sơ</span><span class="sub-arrow">▶</span></div>' +
          '<div class="sub-body"><table class="rec-tbl"><thead><tr>' +
          '<th style="width:120px">Mã minh chứng<br><span class="th-phu">mã mới / mã cũ</span></th><th>Tên minh chứng</th>' +
          '<th style="width:170px">Người phụ trách</th><th style="width:190px;text-align:right">Trạng thái</th></tr></thead>' +
          '<tbody>' + ds.map(function (h) { return dongBang(h, false); }).join('') + '</tbody></table></div></div>';
      }).join('');

    $('#lop-phu').classList.add('on');
    document.body.style.overflow = 'hidden';

    if (maChon) {
      setTimeout(function () {
        var dong = $('#lp-than tr[data-ma="' + maChon + '"]');
        if (dong) { dong.scrollIntoView({ block: 'center' }); dong.classList.add('sang'); }
      }, 60);
    }
  };

  window.dongLopPhu = function () {
    $('#lop-phu').classList.remove('on');
    document.body.style.overflow = '';
    boPhanDangMo = null;
  };

  // Vẽ lại lớp phủ đang mở (sau khi lưu hồ sơ)
  window.veLaiLopPhu = function () {
    if (boPhanDangMo != null) window.moBoPhan(boPhanDangMo);
  };

  // ── Nguyên văn tiêu chí (Mức 1 / Mức 2) trong lớp phủ ──
  window.xemTieuChi = function (ma) {
    var tc = window.TIEU_CHI.filter(function (t) { return t.ma === ma; })[0];
    if (!tc) return;
    boPhanDangMo = null;
    $('#lp-ic').textContent = '✅';
    $('#lp-ic').className = 'ic';
    $('#lp-tieu-de').textContent = 'Tiêu chí ' + tc.ma + (tc.batBuoc ? ' · BẮT BUỘC' : '');
    $('#lp-phu').textContent = tc.ten;
    var mc = window.HO_SO.filter(function (h) { return (h.tc || []).indexOf(ma) >= 0; });
    $('#lp-than').innerHTML =
      (tc.m1
        ? '<div class="lv"><span class="lv-tag">MỨC 1</span><p>' + thoatHTML(tc.m1) + '</p></div>' +
          '<div class="lv"><span class="lv-tag m2">MỨC 2</span><p>' + thoatHTML(tc.m2) + '</p></div>'
        : '<div class="the-thong-bao">Nguyên văn Mức 1 / Mức 2 nạp từ cơ sở dữ liệu sau khi đăng nhập.</div>') +
      '<div class="lv" style="margin-top:16px"><b style="font-size:13.5px">📎 ' + mc.length + ' minh chứng trong kho đang gắn với tiêu chí này</b>' +
      '<div class="ev-list">' + mc.map(function (h) {
        return '<span class="ev">📄 ' + thoatHTML(h.ma + ' · ' + h.ten) + '</span>';
      }).join('') + '</div></div>';
    $('#lop-phu').classList.add('on');
    document.body.style.overflow = 'hidden';
  };

  // ── Ô tìm có gợi ý xổ xuống (kiểu Google) ──
  var GY_DS = [];
  function toDam(chu, kw) {
    var t = boDau(chu), k = boDau(kw);
    var i = k ? t.indexOf(k) : -1;
    if (i < 0) return thoatHTML(chu);
    return thoatHTML(chu.slice(0, i)) + '<mark>' + thoatHTML(chu.slice(i, i + kw.length)) + '</mark>' + thoatHTML(chu.slice(i + kw.length));
  }

  function veGoiY() {
    var o = $('#o-tim-ho-so'), xo = $('#hs-goi-y');
    if (!o || !xo) return;
    var kw = (o.value || '').trim();
    if (kw.length < 2) { xo.classList.remove('hien'); xo.innerHTML = ''; GY_DS = []; return; }
    var k = boDau(kw);

    var gom = [];
    window.HO_SO.forEach(function (h) {
      var tMa = boDau(h.ma), tTen = boDau(h.ten), tCu = boDau(h.maCu);
      var hang = -1;
      if (tTen.indexOf(k) === 0) hang = 0;
      else if (tMa.indexOf(k) === 0) hang = 1;
      else if (tCu.indexOf(k) === 0) hang = 2;
      else if (tTen.indexOf(k) > 0) hang = 3;
      else if (tMa.indexOf(k) > 0 || tCu.indexOf(k) > 0) hang = 4;
      if (hang >= 0) gom.push({ hang: hang, h: h });
    });
    gom.sort(function (a, b) { return a.hang - b.hang || a.h.ma.localeCompare(b.h.ma, 'vi'); });
    GY_DS = gom.slice(0, 8);

    if (!GY_DS.length) {
      xo.innerHTML = '<div class="het">Không có hồ sơ nào khớp "' + thoatHTML(kw) + '".</div>';
      xo.classList.add('hien');
      return;
    }
    xo.innerHTML = GY_DS.map(function (g, idx) {
      var hop = window.HOP[g.h.hop] || {};
      return '<button type="button" class="muc" data-i="' + idx + '">' +
        '<span class="ma">' + toDam(g.h.ma, kw) + '</span>' +
        '<span class="ten">' + toDam(g.h.ten, kw) +
        '<span class="phu">' + thoatHTML(hop.ten || '') + (g.h.maCu ? ' · mã cũ ' + toDam(g.h.maCu, kw) : '') + '</span></span></button>';
    }).join('');
    xo.classList.add('hien');
    $$('.muc', xo).forEach(function (nut) {
      nut.addEventListener('click', function () {
        var g = GY_DS[+nut.getAttribute('data-i')];
        xo.classList.remove('hien');
        var bp = window.BO_PHAN.filter(function (b) { return b.hop.indexOf(g.h.hop) >= 0; })[0];
        if (bp) window.moBoPhan(bp.soTT, g.h.ma);
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
          return '<div class="dong-tc" style="cursor:pointer" onclick="xemTieuChi(\'' + t.ma + '\')"><span class="ma-tc">' + t.ma + '</span>' +
            '<span class="ten-tc">' + thoatHTML(t.ten) +
            '<span class="nhan-mc">' + soMC + ' minh chứng trong kho hồ sơ · bấm xem nguyên văn</span></span>' +
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
    $('#o-tim-ho-so').addEventListener('input', function () { tuKhoa = this.value; veGoiY(); veHoSo(); });
    $('#chon-trang-thai').addEventListener('change', function () { locTT = this.value; veHoSo(); });
    document.addEventListener('click', function (e) {
      var xo = $('#hs-goi-y');
      if (xo && !e.target.closest('.hang-tim')) xo.classList.remove('hien');
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && $('#lop-phu').classList.contains('on')) window.dongLopPhu();
    });

    veTatCa();
  });

  function veTatCa() { veThongKe(); veHoSo(); veTieuChi(); }
  window.veTatCa = veTatCa;
})();
