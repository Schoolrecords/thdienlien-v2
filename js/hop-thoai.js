// ============================================================
// hop-thoai.js — HỘP THOẠI DÙNG CHUNG thay cho prompt/confirm của trình duyệt
//
// Vì sao phải có: prompt() và confirm() của Chrome hiện tên miền
// "quantrisotruonghoc.com cho biết", ô nhập chỉ MỘT dòng hẹp, không đặt được
// nhãn, không xuống dòng — trọng tâm tuần viết mấy ý là mất hút. Hộp này giữ
// đúng tông app (navy + nhũ vàng), ô nhập rộng, có nhãn - chú thích - đếm chữ.
//
// API (đều trả Promise, KHÔNG chặn luồng như prompt cũ):
//   window.hopNhap({...}) → Promise<string|null>   null = người dùng huỷ
//   window.hopHoi({...})  → Promise<boolean>
//
// Tuỳ chọn hopNhap:
//   tieuDe, moTa, bieuTuong, nhan, giaTri, kieu ('vanban'|'chu'|'so'|'ngay'),
//   goiY (chữ mờ trong ô), chuThich, toiDa (số ký tự), batBuoc,
//   nutLuu, nutHuy, kiemTra(giaTri) → trả chuỗi lỗi nếu sai, null nếu đạt
//
// Tuỳ chọn hopHoi: tieuDe, moTa, bieuTuong, nutOK, nutHuy, nguyHiem (nút đỏ)
// ============================================================
(function () {
  'use strict';

  var DANG_MO = null;          // chỉ cho phép một hộp tại một thời điểm

  function tao(the, lop, chu) {
    var e = document.createElement(the);
    if (lop) e.className = lop;
    if (chu != null) e.textContent = chu;
    return e;
  }

  // Dựng khung chung: lớp phủ + hộp + đầu + thân + chân.
  // Trả về các nút để hàm gọi tự lắp phần ruột.
  function dungKhung(o, lopThem) {
    var phu = tao('div', 'ht-phu' + (lopThem ? ' ' + lopThem : ''));
    var hop = tao('div', 'ht-hop');
    hop.setAttribute('role', 'dialog');
    hop.setAttribute('aria-modal', 'true');

    var dau = tao('div', 'ht-dau');
    dau.appendChild(tao('span', 'ht-ic', o.bieuTuong || '✎'));
    var tt = tao('div', 'ht-tt');
    var h = tao('h4', null, o.tieuDe || 'Nhập nội dung');
    var idTD = 'ht-td-' + Math.round(performance.now() * 1000);
    h.id = idTD;
    hop.setAttribute('aria-labelledby', idTD);
    tt.appendChild(h);
    if (o.moTa) tt.appendChild(tao('p', null, o.moTa));
    dau.appendChild(tt);
    var nutX = tao('button', 'ht-x', '✕');
    nutX.type = 'button';
    nutX.setAttribute('aria-label', 'Đóng');
    dau.appendChild(nutX);

    var than = tao('div', 'ht-than');
    var chan = tao('div', 'ht-chan');
    var nutHuy = tao('button', 'ht-nut ht-huy', o.nutHuy || 'Huỷ');
    var nutOK = tao('button', 'ht-nut ht-ok' + (o.nguyHiem ? ' nguy' : ''), o.nutOK || o.nutLuu || 'Lưu');
    nutHuy.type = 'button'; nutOK.type = 'button';
    chan.appendChild(nutHuy);
    chan.appendChild(nutOK);

    hop.appendChild(dau); hop.appendChild(than); hop.appendChild(chan);
    phu.appendChild(hop);

    return { phu: phu, hop: hop, than: than, nutX: nutX, nutHuy: nutHuy, nutOK: nutOK };
  }

  // Mở hộp: khoá cuộn nền, bẫy phím Tab trong hộp, Esc = huỷ.
  // xong(giaTri) được gọi đúng MỘT lần rồi dọn sạch.
  function moKhung(k, focusVao, xong, layGiaTri) {
    if (DANG_MO) DANG_MO();          // hộp cũ (nếu có) coi như bị huỷ
    var oCu = document.activeElement;
    var cuonCu = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.body.appendChild(k.phu);

    function dong(gt) {
      if (DANG_MO !== huy) return;
      DANG_MO = null;
      document.removeEventListener('keydown', banPhim, true);
      document.body.style.overflow = cuonCu;
      k.phu.classList.add('dong');
      setTimeout(function () { if (k.phu.parentNode) k.phu.parentNode.removeChild(k.phu); }, 140);
      try { if (oCu && oCu.focus) oCu.focus(); } catch (e) {}
      xong(gt);
    }
    function huy() { dong(null); }
    DANG_MO = huy;

    function banPhim(e) {
      if (e.key === 'Escape') { e.preventDefault(); huy(); return; }
      if (e.key !== 'Tab') return;
      var ds = k.hop.querySelectorAll('button, input, textarea, select, [tabindex]:not([tabindex="-1"])');
      if (!ds.length) return;
      var dau = ds[0], cuoi = ds[ds.length - 1];
      if (e.shiftKey && document.activeElement === dau) { e.preventDefault(); cuoi.focus(); }
      else if (!e.shiftKey && document.activeElement === cuoi) { e.preventDefault(); dau.focus(); }
    }
    document.addEventListener('keydown', banPhim, true);

    k.nutX.addEventListener('click', huy);
    k.nutHuy.addEventListener('click', huy);
    // Bấm ra nền thì đóng — TRỪ khi đang gõ dở: soạn xong mấy dòng trọng tâm
    // mà chạm hụt ra ngoài là mất trắng. Lúc đó hộp chỉ lắc nhẹ, muốn bỏ thì
    // bấm Huỷ hoặc ✕ cho rõ ý.
    k.phu.addEventListener('mousedown', function (e) {
      if (e.target !== k.phu) return;
      if (k.coThayDoi && k.coThayDoi()) {
        k.hop.classList.remove('lac');
        void k.hop.offsetWidth;          // ép trình duyệt chạy lại hiệu ứng
        k.hop.classList.add('lac');
        return;
      }
      huy();
    });
    k.nutOK.addEventListener('click', function () {
      var gt = layGiaTri();
      if (gt !== undefined) dong(gt);   // undefined = chưa hợp lệ, giữ hộp lại
    });

    // Chờ một nhịp cho hiệu ứng mở chạy xong rồi mới đặt con trỏ,
    // không thì trên điện thoại bàn phím bật lên giữa lúc hộp đang trượt.
    setTimeout(function () {
      try { focusVao.focus(); if (focusVao.setSelectionRange) focusVao.setSelectionRange(focusVao.value.length, focusVao.value.length); } catch (e) {}
    }, 60);
  }

  // ── Hộp NHẬP ──
  window.hopNhap = function (o) {
    o = o || {};
    return new Promise(function (traVe) {
      var nhieuDong = (o.kieu || 'vanban') === 'vanban';
      var k = dungKhung(o);

      if (o.nhan) {
        var nhan = tao('label', 'ht-nhan', o.nhan);
        nhan.setAttribute('for', 'ht-o-nhap');
        k.than.appendChild(nhan);
      }
      var o_ = nhieuDong ? tao('textarea', 'ht-o') : tao('input', 'ht-o');
      o_.id = 'ht-o-nhap';
      if (!nhieuDong) o_.type = (o.kieu === 'so' ? 'number' : o.kieu === 'ngay' ? 'date' : 'text');
      if (nhieuDong) o_.rows = 4;
      if (o.goiY) o_.placeholder = o.goiY;
      if (o.toiDa) o_.maxLength = o.toiDa;
      if (o.kieu === 'so') {
        if (o.nhoNhat != null) o_.min = o.nhoNhat;
        if (o.lonNhat != null) o_.max = o.lonNhat;
        o_.classList.add('hep');
      }
      if (o.kieu === 'ngay') o_.classList.add('hep');
      o_.value = o.giaTri == null ? '' : String(o.giaTri);
      k.than.appendChild(o_);

      var hang = tao('div', 'ht-hang');
      var ct = tao('p', 'ht-chu-thich', o.chuThich || '');
      var dem = tao('span', 'ht-dem', '');
      hang.appendChild(ct);
      if (o.toiDa) hang.appendChild(dem);
      if (o.chuThich || o.toiDa) k.than.appendChild(hang);
      var loi = tao('p', 'ht-loi', '');
      loi.hidden = true;
      k.than.appendChild(loi);

      function capNhat() {
        if (o.toiDa) dem.textContent = o_.value.length + '/' + o.toiDa;
        if (nhieuDong) {           // ô tự cao dần theo nội dung, tối đa 40% màn hình
          o_.style.height = 'auto';
          o_.style.height = Math.min(o_.scrollHeight + 2, Math.round(window.innerHeight * 0.4)) + 'px';
        }
      }
      o_.addEventListener('input', function () { loi.hidden = true; o_.classList.remove('sai'); capNhat(); });
      setTimeout(capNhat, 0);

      o_.addEventListener('keydown', function (e) {
        var xacNhanPhim = nhieuDong ? (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) : (e.key === 'Enter');
        if (xacNhanPhim) { e.preventDefault(); k.nutOK.click(); }
      });

      var banDau = o_.value;
      k.coThayDoi = function () { return o_.value !== banDau; };

      moKhung(k, o_, traVe, function () {
        var gt = String(o_.value == null ? '' : o_.value);
        if (!nhieuDong || o.catKhoangTrang !== false) gt = gt.trim();
        if (o.batBuoc && !gt) return baoSai('Chưa nhập nội dung.');
        var e = o.kiemTra ? o.kiemTra(gt) : null;
        if (e) return baoSai(e);
        return gt;
      });

      function baoSai(chu) {
        loi.textContent = chu; loi.hidden = false;
        o_.classList.add('sai'); o_.focus();
        return undefined;
      }
    });
  };

  // ── Hộp HỎI (thay confirm) ──
  window.hopHoi = function (o) {
    o = o || {};
    return new Promise(function (traVe) {
      var k = dungKhung({
        tieuDe: o.tieuDe || 'Xác nhận',
        moTa: o.moTa2 || '',
        bieuTuong: o.bieuTuong || (o.nguyHiem ? '⚠️' : '❓'),
        nutOK: o.nutOK || 'Đồng ý',
        nutHuy: o.nutHuy || 'Huỷ',
        nguyHiem: o.nguyHiem
      }, 'ht-hoi');
      k.than.appendChild(tao('p', 'ht-loi-nhac', o.noiDung || o.moTa || ''));
      moKhung(k, k.nutOK, function (gt) { traVe(gt !== null); }, function () { return true; });
    });
  };

  // Bản gọn cho những chỗ chỉ cần một câu hỏi: hopHoi('Xoá việc này?')
  var goc = window.hopHoi;
  window.hopHoi = function (a, b) {
    if (typeof a === 'string') return goc(Object.assign({ noiDung: a }, b || {}));
    return goc(a);
  };
})();
