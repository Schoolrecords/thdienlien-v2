// ============================================================
// hoso-sua.js — ô sửa hồ sơ (kế thừa hoso-sql.js của THCS Bạch Liêu)
// Ai sửa được: admin / ban giám hiệu → mọi hồ sơ;
//              người được giao (phu_trach_id hoặc phu_trach_email) → hồ sơ của mình.
// Việc chặn thật nằm ở máy chủ (RLS) — kiểm tra ở đây chỉ để ẩn nút.
// ============================================================
(function () {
  'use strict';

  function $(id) { return document.getElementById(id); }

  function laQuanTri() {
    var u = window.NGUOI_DUNG;
    return !!u && (u.vai_tro === 'admin' || u.vai_tro === 'ban_giam_hieu');
  }

  window.coQuyenSuaHoSo = function (ma) {
    var u = window.NGUOI_DUNG;
    var hs = window.HS_BAN_GHI && window.HS_BAN_GHI[ma];
    if (!u || !hs) return false;
    if (laQuanTri() || hs.phu_trach_id === u.id) return true;
    // phu_trach_email: nhiều người cách nhau dấu phẩy; '*' = mọi tài khoản đã duyệt
    var ds = String(hs.phu_trach_email || '').toLowerCase();
    if (ds === '*') return true;
    return ds.split(',').map(function (s) { return s.trim(); }).indexOf(String(u.email || '').toLowerCase()) >= 0;
  };

  // ── Dựng ô sửa (chỉ một lần) ──
  var oSua = document.createElement('div');
  oSua.className = 'hs-lop';
  oSua.innerHTML =
    '<div class="hs-hop">' +
    '<div class="hs-dau"><span class="ma" id="hsMa"></span><h3 id="hsTen"></h3><button id="hsDong" title="Đóng">✕</button></div>' +
    '<div class="hs-than">' +
    // Ô sửa TÊN (thầy Chung yêu cầu 27/8): danh mục là khung mẫu, trường sửa
    // tên cho hợp đơn vị mình ngay tại bút chì. Chỉ BGH/quản trị thấy ô này —
    // máy chủ (trigger sql/49) vốn chỉ cho admin sửa cột cấu trúc, bày cho
    // giáo viên chỉ tổ bấm rồi bị từ chối. MÃ hồ sơ không cho sửa (đã in
    // trong báo cáo + đặt tên thư mục Drive — quy tắc Bạch Liêu).
    '<div class="hs-o" id="hsOTen"><label>Tên hồ sơ</label>' +
    '<input id="hsTenMoi" placeholder="Tên đầu hồ sơ trong danh mục">' +
    '<div class="goi-y">Sửa cho khớp cách gọi của trường mình. Tên thư mục trên Drive không tự đổi theo — link vẫn đúng, muốn khớp tên thì nhờ quản trị chạy đồng bộ tên Drive.</div></div>' +
    '<div class="hs-o"><label>Trạng thái hồ sơ</label>' +
    '<div class="hs-tt" id="hsTt">' +
    '<button type="button" data-tt="co">Đã có</button>' +
    '<button type="button" data-tt="dang">Đang cập nhật</button>' +
    '<button type="button" data-tt="chua">Chưa có</button>' +
    '<button type="button" data-tt="da_dong" id="hsNutDong">Đã đóng</button></div></div>' +
    // ĐÓNG / GỘP (1/10/2026 — áp danh mục tinh gọn 135 → 72 mà KHÔNG xoá): mã vẫn còn,
    // link + lịch sử còn, chỉ ra khỏi mẫu số và khỏi danh mục minh chứng. Chỉ BGH.
    '<div class="hs-o" id="hsODong" style="display:none"><label>Lý do đóng</label>' +
    '<input id="hsLyDo" placeholder="Ví dụ: Thôi lập theo Danh mục hồ sơ 2026-2027; dùng dữ liệu trên phần mềm">' +
    '<label style="margin-top:8px">Gộp vào hồ sơ (nếu có)</label>' +
    '<input id="hsGopVao" placeholder="Mã hồ sơ nhận gộp, ví dụ MC.3.1.04">' +
    '<div class="goi-y">Hồ sơ đã đóng giữ nguyên mã, link Drive và ghi chú để tra cứu — chỉ không còn tính vào tỉ lệ và danh mục minh chứng. ' +
    'Ghi mã nhận gộp thì các tiêu chí của hồ sơ này được chép sang hồ sơ đó.</div></div>' +
    '<div class="hs-o" id="hsOHop"><label>Thuộc hộp</label><select id="hsHop"></select>' +
    '<div class="goi-y">Chuyển hồ sơ sang hộp khác mà vẫn giữ mã, link, trạng thái và người phụ trách.</div></div>' +
    '<div class="hs-o" id="hsOTc"><label>Dùng cho tiêu chí (TT 57)</label>' +
    '<input id="hsTc" placeholder="Ví dụ: 1.1, 3.2">' +
    '<div class="goi-y">Các mã tiêu chí cách nhau dấu phẩy. Một minh chứng dùng cho nhiều tiêu chí thì ghi đủ ở đây.</div></div>' +
    // Người phụ trách + giao quyền = PHÂN CÔNG: chỉ BGH/quản trị (rà phân quyền
    // 28/9/2026, sổ dự án mục 100; máy chủ chặn thêm ở sql/72). Người được giao
    // chỉ cập nhật trạng thái, link Drive, ghi chú.
    '<div class="hs-o" id="hsONguoi"><label>Người phụ trách</label>' +
    '<input id="hsNguoi" placeholder="Ví dụ: Hiệu trưởng, Văn thư, Tổ trưởng Tổ 1-2-3…">' +
    '<div class="goi-y">Tên chức danh hiển thị trong bảng danh mục.</div></div>' +
    '<div class="hs-o" id="hsOTaiKhoan"><label>Giao quyền sửa cho tài khoản</label>' +
    '<select id="hsTaiKhoan"><option value="">— Không giao cho ai —</option></select>' +
    '<div class="goi-y">Người được chọn tự sửa được hồ sơ này mà không cần quản trị.</div></div>' +
    '<div class="hs-o"><label>Đường dẫn thư mục Google Drive</label>' +
    '<input id="hsLink" placeholder="https://drive.google.com/drive/folders/…">' +
    '<div class="goi-y">Dán đường dẫn thư mục chứa tệp của hồ sơ này.</div></div>' +
    '<div class="hs-o"><label>Ghi chú</label>' +
    '<textarea id="hsGhiChu" placeholder="Ghi chú nội bộ, ví dụ: còn thiếu biên bản tháng 9…"></textarea></div>' +
    '</div>' +
    '<div class="hs-loi" id="hsLoi"></div>' +
    '<div class="hs-chan"><button class="huy" id="hsHuy">Huỷ</button><button class="luu" id="hsLuu">Lưu thay đổi</button></div>' +
    '</div>';
  document.body.appendChild(oSua);

  var maDangSua = null;
  var ttDangChon = null;

  function dongOSua() {
    oSua.classList.remove('hien');
    document.body.style.overflow = '';
    $('hsLoi').classList.remove('hien');
  }
  function hienLoi(msg) {
    $('hsLoi').textContent = msg;
    $('hsLoi').classList.add('hien');
  }
  function veNutTrangThai() {
    Array.prototype.slice.call($('hsTt').querySelectorAll('button')).forEach(function (b) {
      b.classList.toggle('chon', b.getAttribute('data-tt') === ttDangChon);
    });
    var hs = window.HS_BAN_GHI && window.HS_BAN_GHI[maDangSua];
    // Ô lý do chỉ hiện khi ĐANG ĐÓNG một hồ sơ còn mở — đóng rồi thì lý do đã nằm trong ghi chú
    $('hsODong').style.display = (laQuanTri() && ttDangChon === 'da_dong' && hs && hs.trang_thai !== 'da_dong') ? '' : 'none';
  }
  function ngayNay() {
    var d = new Date(), h = function (n) { return (n < 10 ? '0' : '') + n; };
    return h(d.getDate()) + '/' + h(d.getMonth() + 1) + '/' + d.getFullYear();
  }
  // "1.1, 3.2 ;4.1" → ['1.1','3.2','4.1'] — trả null nếu có mã sai dạng
  function docTieuChi(chu) {
    var ds = String(chu || '').split(/[,;\s]+/).map(function (x) { return x.trim(); }).filter(Boolean);
    if (ds.some(function (x) { return !/^\d+\.\d+$/.test(x); })) return null;
    return ds.filter(function (x, i) { return ds.indexOf(x) === i; });
  }

  window.moSuaHoSo = function (ma) {
    var hs = window.HS_BAN_GHI && window.HS_BAN_GHI[ma];
    if (!hs) return;
    if (!window.coQuyenSuaHoSo(ma)) {
      window.notify('Thầy cô không được phân công phụ trách hồ sơ này.');
      return;
    }
    if (!laQuanTri() && hs.trang_thai === 'da_dong') {
      window.notify('Hồ sơ này đã đóng (hết căn cứ) — chỉ Ban giám hiệu mở lại được.');
      return;
    }
    maDangSua = ma;
    ttDangChon = hs.trang_thai;
    $('hsMa').textContent = hs.ma;
    $('hsTen').textContent = hs.ten;
    $('hsNguoi').value = hs.nguoi_phu_trach || '';
    $('hsLink').value = hs.link_drive || '';
    $('hsGhiChu').value = hs.ghi_chu || '';
    veNutTrangThai();

    $('hsTenMoi').value = hs.ten || '';
    $('hsOTen').style.display = laQuanTri() ? '' : 'none';
    $('hsONguoi').style.display = laQuanTri() ? '' : 'none';
    $('hsNutDong').style.display = laQuanTri() || hs.trang_thai === 'da_dong' ? '' : 'none';
    $('hsOHop').style.display = laQuanTri() ? '' : 'none';
    $('hsOTc').style.display = laQuanTri() ? '' : 'none';
    $('hsLyDo').value = ''; $('hsGopVao').value = '';
    $('hsTc').value = (hs.tieu_chi || []).join(', ');
    if (laQuanTri()) {
      var HOP = window.HOP || {};
      $('hsHop').innerHTML = (window.BO_PHAN || []).map(function (bp) {
        return '<optgroup label="' + window.thoatHTML(bp.ten) + '">' + bp.hop.map(function (m) {
          var dangO = HOP[m] && HOP[m].id === hs.nhom_con_id;
          return '<option value="' + (HOP[m] ? HOP[m].id : '') + '"' + (dangO ? ' selected' : '') + '>' +
            window.thoatHTML(m + ' · ' + ((HOP[m] || {}).ten || '')) + '</option>';
        }).join('') + '</optgroup>';
      }).join('');
    }
    veNutTrangThai();

    var oTk = $('hsOTaiKhoan');
    if (laQuanTri()) {
      oTk.style.display = '';
      $('hsTaiKhoan').innerHTML = '<option value="">— Không giao cho ai —</option>' +
        (window.DS_TAI_KHOAN || []).map(function (u) {
          return '<option value="' + u.id + '"' + (hs.phu_trach_id === u.id ? ' selected' : '') + '>' +
            window.thoatHTML(u.ho_ten + (u.chuc_vu ? ' — ' + u.chuc_vu : '')) + '</option>';
        }).join('');
    } else {
      oTk.style.display = 'none';
    }

    oSua.classList.add('hien');
    document.body.style.overflow = 'hidden';
  };

  $('hsTt').addEventListener('click', function (e) {
    var b = e.target.closest('button[data-tt]');
    if (!b) return;
    ttDangChon = b.getAttribute('data-tt');
    veNutTrangThai();
  });
  $('hsDong').addEventListener('click', dongOSua);
  $('hsHuy').addEventListener('click', dongOSua);
  oSua.addEventListener('click', function (e) { if (e.target === oSua) dongOSua(); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && oSua.classList.contains('hien')) dongOSua();
  });

  $('hsLuu').addEventListener('click', function () {
    var nut = $('hsLuu');
    var link = $('hsLink').value.trim();
    if (link && !/^https?:\/\//i.test(link)) {
      hienLoi('Đường dẫn Drive phải bắt đầu bằng http:// hoặc https://');
      return;
    }
    var tenMoi = $('hsTenMoi').value.trim();
    if (laQuanTri() && !tenMoi) {
      hienLoi('Tên hồ sơ không được để trống.');
      return;
    }
    var cu = window.HS_BAN_GHI[maDangSua] || {};
    var tcMoi = laQuanTri() ? docTieuChi($('hsTc').value) : null;
    if (laQuanTri() && !tcMoi) {
      hienLoi('Tiêu chí ghi dạng số.số, cách nhau dấu phẩy — ví dụ: 1.1, 3.2');
      return;
    }
    var dangDong = ttDangChon === 'da_dong' && cu.trang_thai !== 'da_dong';
    var gopVao = dangDong ? $('hsGopVao').value.trim().toUpperCase() : '';
    var dich = gopVao ? window.HS_BAN_GHI[gopVao] : null;
    if (gopVao && (!dich || gopVao === maDangSua || dich.trang_thai === 'da_dong')) {
      hienLoi(!dich ? 'Không có hồ sơ mã ' + gopVao + ' trong danh mục.'
        : gopVao === maDangSua ? 'Không gộp hồ sơ vào chính nó.'
        : 'Hồ sơ ' + gopVao + ' cũng đã đóng — chọn hồ sơ còn hiệu lực.');
      return;
    }
    nut.disabled = true;
    nut.textContent = 'Đang lưu…';
    $('hsLoi').classList.remove('hien');

    var thayDoi = {
      trang_thai: ttDangChon,
      link_drive: link || null,
      ghi_chu: (dangDong
        ? '[Đã đóng ' + ngayNay() + '] ' + ($('hsLyDo').value.trim() || 'Thôi lập theo danh mục hồ sơ mới') +
          (gopVao ? ' · Gộp vào ' + gopVao : '') + ($('hsGhiChu').value.trim() ? ' — ' + $('hsGhiChu').value.trim() : '')
        : $('hsGhiChu').value.trim()) || null,
      cap_nhat_luc: new Date().toISOString(),
      cap_nhat_boi: window.NGUOI_DUNG ? window.NGUOI_DUNG.id : null
    };
    if (laQuanTri()) {
      thayDoi.phu_trach_id = $('hsTaiKhoan').value || null;
      thayDoi.nguoi_phu_trach = $('hsNguoi').value.trim() || null;
      // Chỉ quản trị mới gửi cột tên — người khác gửi là trigger chặn cột
      // cấu trúc (sql/49) từ chối cả câu update.
      thayDoi.ten = tenMoi;
      thayDoi.tieu_chi = tcMoi;
      if ($('hsHop').value) thayDoi.nhom_con_id = +$('hsHop').value;
    }

    window.MAY_CHU.from('ho_so').update(thayDoi).eq('ma', maDangSua).select().single()
      .then(function (r) {
        if (r.error || !dich) return r;
        // Gộp: chép tiêu chí của hồ sơ vừa đóng sang hồ sơ nhận gộp (giữ minh chứng cho tiêu chí đó)
        var gop = (dich.tieu_chi || []).slice();
        (cu.tieu_chi || []).forEach(function (t) { if (gop.indexOf(t) < 0) gop.push(t); });
        var ghi = (dich.ghi_chu ? dich.ghi_chu + ' · ' : '') + 'Nhận gộp ' + maDangSua + ' (' + ngayNay() + ')';
        return window.MAY_CHU.from('ho_so').update({ tieu_chi: gop, ghi_chu: ghi }).eq('ma', gopVao).select().single()
          .then(function (r2) {
            if (r2.error) {
              window.notify('Đã đóng ' + maDangSua + ' nhưng chưa chép được tiêu chí sang ' + gopVao + ': ' + r2.error.message);
            } else {
              window.HS_BAN_GHI[gopVao] = r2.data;
              window.HO_SO.forEach(function (h) { if (h.ma === gopVao) h.tc = r2.data.tieu_chi || []; });
            }
            return r;
          });
      })
      .then(function (r) {
        nut.disabled = false;
        nut.textContent = 'Lưu thay đổi';
        if (r.error) {
          hienLoi('Không lưu được: ' + r.error.message +
            (r.error.code === '42501' ? ' — thầy cô không có quyền sửa hồ sơ này.' : ''));
          return;
        }
        var moi = r.data;
        window.HS_BAN_GHI[maDangSua] = moi;
        window.HO_SO.forEach(function (h) {
          if (h.ma === maDangSua) {
            h.ten = moi.ten;
            h.phuTrach = moi.nguoi_phu_trach || '';
            h.tt = moi.trang_thai;
            h.link = moi.link_drive || '';
            h.tc = moi.tieu_chi || [];
            Object.keys(window.HOP || {}).forEach(function (m) { if (window.HOP[m].id === moi.nhom_con_id) h.hop = m; });
          }
        });
        dongOSua();
        window.veTatCa();
        window.veLaiLopPhu && window.veLaiLopPhu();
        window.notify(dangDong ? 'Đã đóng hồ sơ ' + maDangSua + (gopVao ? ', gộp vào ' + gopVao : '') + '. Mã, link và ghi chú vẫn giữ.'
          : 'Đã lưu hồ sơ ' + maDangSua + '.');
      })
      .catch(function (e) {
        // Mất mạng: trước đây nút kẹt "Đang lưu…" mãi
        nut.disabled = false;
        nut.textContent = 'Lưu thay đổi';
        hienLoi('Không lưu được (mất kết nối?): ' + ((e && e.message) || e) + ' — kiểm tra mạng rồi bấm lưu lại.');
      });
  });
})();
