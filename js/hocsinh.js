// ============================================================
// hocsinh.js — MODULE QUẢN LÝ HỌC SINH (bản tiểu học, theo mẫu THCS Bạch Liêu)
//
// Luồng ba tầng: KHỐI (1-5) → LỚP → DANH SÁCH HỌC SINH (lớp phủ).
// Nguồn: hoc_sinh_lop ⋈ hoc_sinh · phan_cong_day (GVCN) · lop_hoc (cơ sở).
//
// Ba nguyên tắc bê từ Bạch Liêu:
//  1. KHÔNG bịa số. Đọc lỗi thì hiện băng cảnh báo nói thẳng, không im lặng để
//     bảng trống trông như "trường chưa có học sinh".
//  2. Năm học mở mặc định là năm CÓ DỮ LIỆU, không phải năm hiện hành. Hệ thống
//     đang ở 2026-2027 mà dữ liệu nạp là 2025-2026 thì cứ lấy năm hiện hành sẽ
//     ra màn trống trơn, người dùng tưởng mất dữ liệu.
//  3. Đổi năm mà lỗi thì TRẢ CẢ biến năm LẪN ô chọn về như cũ — không để ô chọn
//     một đằng số liệu một nẻo, vì năm học in cả lên bản danh sách.
//
// Luật Bảo vệ dữ liệu cá nhân 2025: số định danh cá nhân nằm ở bảng riêng (hoc_sinh_dinh_danh),
// màn này KHÔNG đọc và KHÔNG hiện.
// ============================================================
(function () {
  'use strict';

  function thoat(s) { return window.thoatHTML ? window.thoatHTML(s) : String(s || ''); }
  function $(s) { return document.querySelector(s); }

  var NAM = '';
  var CAC_NAM = [];
  var LOP = {};        // '1A' -> { khoi, coSo, em: [...] }
  var CN = {};         // '1A' -> 'Nguyễn Thị A'
  var KHOI_MO = null;
  var daNoi = false;

  // ── Đọc hết bảng lớn theo trang 1000 dòng (mẫu chung của dự án) ──
  // BẮT BUỘC có .order(): PostgREST không hứa thứ tự nào cả nếu truy vấn
  // không sắp xếp, nên phân trang bằng .range() có thể lấy lặp dòng của
  // trang trước và bỏ sót dòng khác — sĩ số sai mà không có dấu hiệu gì.
  // Một năm 863 em thì chưa chạm trần; thêm năm học nữa là lộ ngay.
  function taiHet(bang, cot, loc) {
    var ket = [], tu = 0, buoc = 1000;
    function trang() {
      var q = window.MAY_CHU.from(bang).select(cot).order('id').range(tu, tu + buoc - 1);
      (loc || []).forEach(function (l) { q = q.eq(l[0], l[1]); });
      return q.then(function (r) {
        if (r.error) throw r.error;
        var d = r.data || [];
        ket = ket.concat(d);
        if (d.length < buoc) return ket;
        tu += buoc;
        return trang();
      });
    }
    return trang();
  }

  function ngayVN(d) {
    if (!d) return '';
    var p = String(d).slice(0, 10).split('-');
    return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : String(d);
  }

  // Danh sách lớp ở Việt Nam sắp theo TÊN (chữ cuối) rồi mới đến họ đệm —
  // sắp thẳng cả cụm họ tên sẽ ra thứ tự lạ với thầy cô.
  function sapTen(a, b) {
    var ta = a.ho_ten.trim().split(/\s+/), tb = b.ho_ten.trim().split(/\s+/);
    var t = ta[ta.length - 1].localeCompare(tb[tb.length - 1], 'vi');
    return t || a.ho_ten.localeCompare(b.ho_ten, 'vi');
  }

  function canhBao(chu, loai) {
    var o = $('#hs-canh');
    if (!o) return;
    if (!chu) { o.innerHTML = ''; return; }
    o.innerHTML = '<div class="hd-kiem ' + (loai || 'vang') + '">' + chu + '</div>';
  }

  // ══════════ NẠP DỮ LIỆU ══════════
  function tai() {
    var may = window.MAY_CHU;
    return taiHet('hoc_sinh_lop', 'nam_hoc')
      .then(function (ds) {
        var co = {};
        ds.forEach(function (d) { if (d.nam_hoc) co[d.nam_hoc] = 1; });
        CAC_NAM = Object.keys(co).sort().reverse();
        if (!NAM) {
          var hienHanh = window.CAU_HINH.NAM_HOC;
          NAM = (co[hienHanh] ? hienHanh : CAC_NAM[0]) || hienHanh || '';
        }
        if (!CAC_NAM.length) return [];
        return taiHet('hoc_sinh_lop',
          'hoc_sinh_ma, lop, khoi, trang_thai, hoc_sinh(ma, ho_ten, ngay_sinh, gioi_tinh, khuyet_tat_hoa_nhap)',
          [['nam_hoc', NAM]]);
      })
      .then(function (ds) {
        LOP = {};
        (ds || []).forEach(function (d) {
          if (d.trang_thai && d.trang_thai !== 'dang_hoc') return;   // chuyển đi / thôi học
          var h = d.hoc_sinh;
          if (!h) return;
          if (!LOP[d.lop]) LOP[d.lop] = { khoi: d.khoi, coSo: '', em: [] };
          LOP[d.lop].em.push(h);
        });
        Object.keys(LOP).forEach(function (l) { LOP[l].em.sort(sapTen); });

        // GVCN và cơ sở đều là thông tin PHỤ — đọc lỗi thì bỏ qua, không chặn màn
        return Promise.all([
          may.from('phan_cong_day')
            .select('lop, nguoi_dung:nguoi_dung_id(ho_ten)')
            .eq('nam_hoc', NAM).eq('la_chu_nhiem', true)
            .then(function (r) { return r.error ? [] : (r.data || []); }, function () { return []; }),
          may.from('lop_hoc').select('lop, co_so_ma, co_so:co_so_ma(ten)')
            .eq('nam_hoc', NAM)
            .then(function (r) { return r.error ? [] : (r.data || []); }, function () { return []; })
        ]);
      })
      .then(function (kq) {
        CN = {};
        (kq[0] || []).forEach(function (p) {
          if (p.nguoi_dung && p.nguoi_dung.ho_ten) CN[p.lop] = p.nguoi_dung.ho_ten;
        });
        var nhieuCoSo = {};
        (kq[1] || []).forEach(function (l) {
          if (LOP[l.lop] && l.co_so && l.co_so.ten) LOP[l.lop].coSo = l.co_so.ten;
          if (l.co_so_ma) nhieuCoSo[l.co_so_ma] = 1;
        });
        // Chỉ hiện nhãn cơ sở khi trường THỰC SỰ có nhiều cơ sở — một cơ sở mà
        // dán nhãn khắp nơi thì chỉ tổ rối mắt.
        if (Object.keys(nhieuCoSo).length < 2) {
          Object.keys(LOP).forEach(function (l) { LOP[l].coSo = ''; });
        }
      });
  }

  // ══════════ VẼ ══════════
  function tongKet() {
    var lop = Object.keys(LOP), hs = 0;
    lop.forEach(function (l) { hs += LOP[l].em.length; });
    return { soLop: lop.length, soHS: hs };
  }

  function veThanh() {
    var t = tongKet();
    // Đang xem năm KHÁC năm học hiện hành thì phải nói rõ, kẻo thầy cô tưởng
    // số liệu này là của năm nay.
    var hienHanh = window.CAU_HINH.NAM_HOC;
    if (NAM && hienHanh && NAM !== hienHanh) {
      canhBao('📅 Đang xem năm học <b>' + thoat(NAM) + '</b>. Năm học hiện hành của hệ thống là <b>' +
        thoat(hienHanh) + '</b>' + (CAC_NAM.indexOf(hienHanh) < 0 ? ' — năm đó chưa có dữ liệu học sinh.' : '.'));
    } else {
      canhBao('');
    }
    var pill = $('#hs-pill');
    if (pill) {
      // KHÔNG nhắc lại năm học ở đây — ô chọn năm ngay bên cạnh đã nói rồi.
      pill.innerHTML = '<b>' + t.soLop + '</b> lớp · <b>' + t.soHS + '</b> học sinh';
    }
    // Ô chọn năm LUÔN hiện (như Bạch Liêu). Danh sách gồm các năm CÓ dữ liệu
    // cộng thêm năm học hiện hành — để đến 30/8 nhảy sang 2026-2027 thì năm đó
    // đã có sẵn trong ô chọn, thầy cô nhìn thấy ngay là chưa nạp dữ liệu.
    var boc = $('#hs-nam-boc');
    if (!boc) return;
    // Ba năm học (trước · nay · sau) LUÔN có mặt, cộng thêm mọi năm đã có dữ
    // liệu. Trước đây ô chỉ liệt kê năm có dữ liệu + năm hiện hành, nên trường
    // vừa nạp dữ liệu năm cũ không thấy đường xem lại, còn năm sau thì không có
    // chỗ nào để bắt đầu nạp. Hàm dùng chung ở cauhinh.js.
    var ds = window.baNamHoc
      ? window.baNamHoc(CAC_NAM.concat([NAM]))
      : (function () {
          var t = CAC_NAM.slice();
          if (hienHanh && t.indexOf(hienHanh) < 0) t.push(hienHanh);
          if (NAM && t.indexOf(NAM) < 0) t.push(NAM);
          return t.sort().reverse();
        })();
    boc.innerHTML = '<label for="hs-nam">Năm học</label>' +
      '<select id="hs-nam">' + ds.map(function (n) {
        return '<option value="' + thoat(n) + '"' + (n === NAM ? ' selected' : '') + '>' +
          thoat(n) + '</option>';
      }).join('') + '</select>';
    $('#hs-nam').addEventListener('change', doiNam);
  }

  function doiNam(e) {
    var cu = NAM, o = e.target;
    NAM = o.value;
    o.disabled = true;
    tai().then(function () {
      o.disabled = false;
      KHOI_MO = null;
      veTatCaHS();
    }).catch(function (err) {
      // Trả CẢ biến năm LẪN ô chọn về như cũ
      NAM = cu; o.value = cu; o.disabled = false;
      window.notify('Không đọc được dữ liệu năm ' + thoat(o.value) + ': ' + (err.message || err));
    });
  }

  function veKhoi() {
    var o = $('#hs-khoi');
    if (!o) return;
    var t = tongKet();
    if (!t.soLop) {
      o.innerHTML = '<div class="hs-trong"><b>Chưa có dữ liệu học sinh cho năm học ' + thoat(NAM) + '</b>' +
        'Danh sách học sinh nhập ở <b>Quản trị → Danh sách học sinh</b>, hoặc chuyển sang năm học khác ' +
        'nếu dữ liệu đã nạp cho năm trước.<br><br>' +
        // ⚠️ Đừng dự phòng bằng số của Diễn Liên. `0 || 25` trong JavaScript ra
        //    25, mà trường chưa khai quy mô thì để 0 — nên câu này từng khẳng
        //    định chắc nịch "25 lớp / 863 học sinh" với MỌI trường chưa khai,
        //    kể cả bản xem thử. Chưa có số thì im lặng, đừng nói bừa.
        (window.CAU_HINH.SO_LOP && window.CAU_HINH.SO_HOC_SINH
          ? 'Nhà trường có <b>' + window.CAU_HINH.SO_LOP + ' lớp</b> và <b>' +
            window.CAU_HINH.SO_HOC_SINH + ' học sinh</b> — hai số này lấy từ cấu hình trường, ' +
            'chưa phải số đếm từ danh sách thật.'
          : 'Nhà trường chưa khai quy mô (số lớp, số học sinh) trong phần cấu hình.') +
        '</div>';
      $('#hs-lop').innerHTML = '';
      return;
    }

    var dem = {};
    Object.keys(LOP).forEach(function (l) {
      var k = LOP[l].khoi;
      if (!dem[k]) dem[k] = { lop: 0, hs: 0 };
      dem[k].lop++; dem[k].hs += LOP[l].em.length;
    });

    o.innerHTML = '<div class="luoi-khoi">' + [1, 2, 3, 4, 5].map(function (k) {
      var d = dem[k] || { lop: 0, hs: 0 };
      return '<button class="the-khoi' + (KHOI_MO === k ? ' on' : '') + '" data-khoi="' + k + '"' +
        (d.lop ? '' : ' disabled') + '>' +
        '<div class="huy">' + k + '</div>' +
        '<div class="ten-khoi">Khối ' + k + '</div>' +
        '<hr class="ngan">' +
        '<div class="hai-cot">' +
        '<div><div class="so">' + d.lop + '</div><div class="nhan">Lớp</div></div>' +
        '<div><div class="so">' + d.hs + '</div><div class="nhan">Học sinh</div></div>' +
        '</div>' +
        (d.lop ? '<div class="mo-khoi">Xem các lớp →</div>' : '') +
        '</button>';
    }).join('') + '</div>';

    Array.prototype.slice.call(o.querySelectorAll('[data-khoi]')).forEach(function (b) {
      b.addEventListener('click', function () { veLop(+b.getAttribute('data-khoi')); });
    });
  }

  function veLop(khoi) {
    KHOI_MO = khoi;
    veKhoi();
    var o = $('#hs-lop');
    if (!o) return;
    var ds = Object.keys(LOP).filter(function (l) { return LOP[l].khoi === khoi; })
      .sort(function (a, b) { return a.localeCompare(b, 'vi'); });
    var hs = 0; ds.forEach(function (l) { hs += LOP[l].em.length; });

    o.innerHTML =
      '<div class="bang-khoi"><div class="so">K' + khoi + '</div>' +
      '<div><b>Khối ' + khoi + '</b><small>' + ds.length + ' lớp · ' + hs + ' học sinh · năm học ' +
      thoat(NAM) + '</small></div></div>' +
      '<div class="luoi-lop">' + ds.map(function (l) {
        var d = LOP[l];
        return '<button class="the-lop" data-lop="' + thoat(l) + '">' +
          '<div class="ten-lop">' + thoat(l) + '</div>' +
          '<div class="si-so">' + d.em.length + ' học sinh</div>' +
          // Chưa phân công thì KHÔNG ghi gì cả. In "chưa phân công chủ nhiệm"
          // lên cả 25 thẻ chỉ làm rối mắt, mà phân công xong lại phải xoá đi.
          (CN[l] ? '<div class="gvcn">👩‍🏫 ' + thoat(CN[l]) + '</div>' : '') +
          (d.coSo ? '<span class="co-so-nho">' + thoat(d.coSo) + '</span>' : '') +
          '</button>';
      }).join('') + '</div>';

    Array.prototype.slice.call(o.querySelectorAll('[data-lop]')).forEach(function (b) {
      b.addEventListener('click', function () { veDsHs(b.getAttribute('data-lop')); });
    });
    o.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function veDsHs(lop) {
    var d = LOP[lop];
    if (!d) return;
    $('#hsp-tieu-de').textContent = 'Lớp ' + lop;
    $('#hsp-phu').textContent = (CN[lop] ? 'Giáo viên chủ nhiệm: ' + CN[lop] + ' · ' : '') +
      'Năm học ' + NAM;

    var nam = 0, nu = 0, chua = 0, hoaNhap = 0;
    d.em.forEach(function (h) {
      if (h.gioi_tinh === 'Nam') nam++;
      else if (h.gioi_tinh === 'Nữ') nu++;
      else chua++;
      if (h.khuyet_tat_hoa_nhap) hoaNhap++;
    });

    $('#hsp-than').innerHTML =
      '<div class="sheet-sum">' +
      '<div><div class="big">' + d.em.length + ' học sinh</div>' +
      '<div class="sub-chu">Nam: ' + nam + ' · Nữ: ' + nu +
      (chua ? ' · chưa ghi giới tính: ' + chua : '') +
      (hoaNhap ? ' · khuyết tật hòa nhập: ' + hoaNhap : '') +
      ' · Năm học ' + thoat(NAM) + '</div></div>' +
      '<div class="sp"></div>' +
      '<button class="nut-kiem-tra" id="hsp-word">📄 Tải file Word</button> ' +
      '<button class="nut-kiem-tra" id="hsp-in" style="background:#5b6b85">🖨 In danh sách</button>' +
      '</div>' +
      '<div class="cuon-ngang"><table class="bang-quan-tri nho"><thead><tr>' +
      '<th style="width:56px">TT</th><th>Mã học sinh</th><th>Họ và tên</th>' +
      '<th>Ngày sinh</th><th>Giới tính</th></tr></thead><tbody>' +
      d.em.map(function (h, i) {
        return '<tr><td style="text-align:center">' + (i + 1) + '</td>' +
          '<td>' + thoat(h.ma) + '</td>' +
          '<td><b>' + thoat(h.ho_ten) + '</b>' +
          (h.khuyet_tat_hoa_nhap ? ' <span class="chip" style="font-size:11px">hòa nhập</span>' : '') + '</td>' +
          '<td>' + ngayVN(h.ngay_sinh) + '</td>' +
          '<td>' + thoat(h.gioi_tinh || '') + '</td></tr>';
      }).join('') + '</tbody></table></div>' +
      '<p style="font-size:12.6px;color:var(--chu-mo);margin-top:14px;line-height:1.7">' +
      'Thông tin cá nhân của học sinh được bảo vệ theo Luật Bảo vệ dữ liệu cá nhân năm 2025. ' +
      '<b>Số định danh cá nhân có lưu trong hệ thống nhưng KHÔNG hiển thị ở màn hình này</b> — ' +
      'số đó nằm ở bảng riêng, chỉ quản trị đọc được.</p>';

    $('#hsp-word').addEventListener('click', function () { xuatWord(lop, d); });
    // Gắn cờ để @media print chỉ in đúng lớp phủ danh sách, không in cả lưới
    // thẻ khối phía sau. Gỡ cờ ở sự kiện afterprint bên dưới.
    $('#hsp-in').addEventListener('click', function () {
      document.body.classList.add('in-danh-sach');
      window.print();
    });
    $('#hs-phu').classList.add('on');
    document.body.style.overflow = 'hidden';
  }

  window.dongDsHs = function () {
    var o = $('#hs-phu');
    if (o) o.classList.remove('on');
    document.body.style.overflow = '';
  };

  function xuatWord(lop, d) {
    var W = window.WORD_TIEN_ICH;
    if (!W) { window.notify('Chưa tải được bộ xuất Word.'); return; }
    var than = W.theThuc() +
      '<h2 class="giua" style="font-size:14pt">DANH SÁCH HỌC SINH LỚP ' + W.chan(lop.toUpperCase()) + '</h2>' +
      '<p class="giua nghieng" style="margin-bottom:12pt">Năm học ' + W.chan(NAM) +
      ' · Giáo viên chủ nhiệm: ' + W.chan(CN[lop] || '……………………') + '</p>' +
      '<table><thead><tr><th style="width:6%">TT</th><th style="width:16%">Mã học sinh</th>' +
      '<th>Họ và tên</th><th style="width:15%">Ngày sinh</th><th style="width:11%">Giới tính</th>' +
      '<th style="width:16%">Ghi chú</th></tr></thead><tbody>' +
      d.em.map(function (h, i) {
        return '<tr><td class="giua">' + (i + 1) + '</td><td>' + W.chan(h.ma) + '</td>' +
          '<td>' + W.chan(h.ho_ten) + '</td><td class="giua">' + ngayVN(h.ngay_sinh) + '</td>' +
          '<td class="giua">' + W.chan(h.gioi_tinh || '') + '</td><td></td></tr>';
      }).join('') + '</tbody></table>' +
      '<p style="margin-top:10pt;font-size:12pt"><i>Tổng số: ' + d.em.length + ' học sinh</i></p>' +
      W.khoiKy('GIÁO VIÊN CHỦ NHIỆM');
    W.taiVe(W.khungWord('Danh sách lớp ' + lop, than),
      'danh-sach-lop-' + lop.toLowerCase().replace(/\s+/g, '') + '-' + NAM + '.doc');
  }

  function veTatCaHS() {
    veThanh();
    veKhoi();
    if (KHOI_MO) veLop(KHOI_MO); else $('#hs-lop').innerHTML = '';
  }

  // ══════════ NỐI DỮ LIỆU THẬT ══════════
  function noi() {
    if (!window.MAY_CHU) return;
    canhBao('');
    return tai().then(function () {
      daNoi = true;
      veTatCaHS();
    }).catch(function (e) {
      // Nói thẳng, không để bảng trống trông như trường chưa có học sinh
      canhBao('⚠ <b>Chưa đọc được danh sách học sinh</b> — ' + thoat(e.message || e) +
        '. Thầy cô là giáo viên thì chỉ đọc được lớp mình phụ trách; nếu cần xem toàn trường, ' +
        'báo Ban giám hiệu cấp quyền.', 'do');
      var pill = $('#hs-pill');
      if (pill) pill.textContent = 'Chưa đọc được dữ liệu';
      $('#hs-khoi').innerHTML = '';
      $('#hs-lop').innerHTML = '';
    });
  }

  // Module khác nạp xong dữ liệu gọi cái này để màn cập nhật ngay, khỏi F5
  window.hocSinhNoiLai = noi;

  // Gỡ cờ in dù người dùng bấm In hay bấm Huỷ ở hộp thoại in. Quên gỡ thì lần
  // sau bấm Ctrl+P ở màn khác vẫn ra danh sách học sinh cũ — hỏng lặng lẽ.
  window.addEventListener('afterprint', function () {
    document.body.classList.remove('in-danh-sach');
  });

  document.addEventListener('dangnhap-xong', function () { if (!daNoi) noi(); });
})();
