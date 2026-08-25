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
    '<button type="button" data-tt="chua">Chưa có</button></div></div>' +
    '<div class="hs-o"><label>Người phụ trách</label>' +
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
  }

  window.moSuaHoSo = function (ma) {
    var hs = window.HS_BAN_GHI && window.HS_BAN_GHI[ma];
    if (!hs) return;
    if (!window.coQuyenSuaHoSo(ma)) {
      window.notify('Thầy cô không được phân công phụ trách hồ sơ này.');
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
    nut.disabled = true;
    nut.textContent = 'Đang lưu…';
    $('hsLoi').classList.remove('hien');

    var thayDoi = {
      trang_thai: ttDangChon,
      nguoi_phu_trach: $('hsNguoi').value.trim() || null,
      link_drive: link || null,
      ghi_chu: $('hsGhiChu').value.trim() || null,
      cap_nhat_luc: new Date().toISOString(),
      cap_nhat_boi: window.NGUOI_DUNG ? window.NGUOI_DUNG.id : null
    };
    if (laQuanTri()) {
      thayDoi.phu_trach_id = $('hsTaiKhoan').value || null;
      // Chỉ quản trị mới gửi cột tên — người khác gửi là trigger chặn cột
      // cấu trúc (sql/49) từ chối cả câu update.
      thayDoi.ten = tenMoi;
    }

    window.MAY_CHU.from('ho_so').update(thayDoi).eq('ma', maDangSua).select().single()
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
          }
        });
        dongOSua();
        window.veTatCa();
        window.veLaiLopPhu && window.veLaiLopPhu();
        window.notify('Đã lưu hồ sơ ' + maDangSua + '.');
      });
  });
})();
