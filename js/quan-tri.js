// ============================================================
// quan-tri.js — màn Quản trị hệ thống DẠNG THẺ (tab)
// Thẻ gốc: Tài khoản · Sổ nhật ký. Các module khác đăng ký thẻ
// qua window.qtTabPhu.push({ma, ten, ve(hop)}) — kiến trúc Bạch Liêu.
// window.moQuanTri('hd') mở thẳng một thẻ. RLS phía máy chủ là hàng
// rào thật; kiểm tra ở đây chỉ để ẩn giao diện.
// ============================================================
(function () {
  'use strict';

  function thoat(s) { return window.thoatHTML ? window.thoatHTML(s) : String(s || ''); }

  var TEN_VAI_TRO = {
    admin: 'Quản trị', ban_giam_hieu: 'Ban giám hiệu', to_truong: 'Tổ trưởng',
    giao_vien: 'Giáo viên', nhan_vien: 'Nhân viên'
  };
  var TEN_TRANG_THAI = { cho_duyet: '🟡 Chờ duyệt', hoat_dong: '🟢 Hoạt động', khoa: '🔴 Khóa' };

  window.qtTabPhu = window.qtTabPhu || [];
  var TAB = 'tk';

  function laQT() {
    var u = window.NGUOI_DUNG;
    return !!u && (u.vai_tro === 'admin' || u.vai_tro === 'ban_giam_hieu');
  }

  function toiLaAi() { return (window.NGUOI_DUNG || {}).id; }

  window.moQuanTri = function (ma) {
    TAB = ma || 'tk';
    window.veQuanTri();
  };

  window.veQuanTri = function () {
    var vung = document.getElementById('vung-quantri');
    if (!vung || !window.MAY_CHU || !laQT()) return;
    var baoCu = document.getElementById('quantri-thong-bao');
    if (baoCu) baoCu.style.display = 'none';

    var tabs = [{ ma: 'tk', ten: '👥 Tài khoản' }]
      .concat(window.qtTabPhu)
      .concat([{ ma: 'nk', ten: '📒 Sổ nhật ký' }]);

    vung.innerHTML =
      '<div class="qt-tab">' + tabs.map(function (t) {
        return '<button class="' + (TAB === t.ma ? 'on' : '') + '" data-qt="' + t.ma + '">' + t.ten + '</button>';
      }).join('') + '</div>' +
      '<div id="qt-than"><div class="the-thong-bao">Đang tải…</div></div>';

    Array.prototype.slice.call(vung.querySelectorAll('[data-qt]')).forEach(function (b) {
      b.addEventListener('click', function () { TAB = b.getAttribute('data-qt'); window.veQuanTri(); });
    });

    var hop = document.getElementById('qt-than');
    if (TAB === 'tk') return veTaiKhoan(hop);
    if (TAB === 'nk') return veNhatKy(hop);
    var phu = window.qtTabPhu.filter(function (t) { return t.ma === TAB; })[0];
    if (phu) phu.ve(hop);
    else hop.innerHTML = '<div class="the-thong-bao">Thẻ này chưa có nội dung.</div>';
  };

  function chonHTML(ten, giaTri, dsMa, dsTen) {
    return '<select data-cot="' + ten + '">' + dsMa.map(function (ma) {
      return '<option value="' + ma + '"' + (ma === giaTri ? ' selected' : '') + '>' + dsTen[ma] + '</option>';
    }).join('') + '</select>';
  }

  // ── Thẻ Tài khoản ──
  function veTaiKhoan(hop) {
    window.MAY_CHU.from('nguoi_dung')
      .select('id,email,ho_ten,chuc_vu,vai_tro,trang_thai,lan_vao_cuoi').order('ho_ten')
      .then(function (kq) {
        if (kq.error) { hop.innerHTML = '<div class="the-thong-bao">Không đọc được danh sách người dùng.</div>'; return; }
        var ds = kq.data || [];
        var choDuyet = ds.filter(function (u) { return u.trang_thai === 'cho_duyet'; }).length;

        hop.innerHTML = '<div class="nhan-nho" style="margin:14px 0 10px">Đã đăng nhập ' + ds.length + ' tài khoản' +
          // --canh (#8f5d14) đạt 5,1:1 trên nền sáng; #c8901c cũ chỉ 3,3:1 và
          // đã bị bỏ khỏi bảng màu phiên 14-15/8.
          (choDuyet ? ' · <b style="color:var(--canh)">' + choDuyet + ' chờ duyệt</b>' : '') +
          ' — thầy cô có tên trong danh sách mời thì lần đầu đăng nhập là vào thẳng, không cần duyệt.</div>' +
          '<div class="cuon-ngang"><table class="bang-quan-tri"><thead><tr>' +
          '<th>Họ tên</th><th>Email</th><th>Vai trò</th><th>Trạng thái</th><th></th></tr></thead><tbody>' +
          ds.map(function (u) {
            // Không vẽ nút Xóa ở dòng của chính mình và ở dòng admin/BGH —
            // hàm xoa_tai_khoan trên máy chủ cũng chặn, đây chỉ là ẩn cho gọn.
            var xoaDuoc = u.id !== toiLaAi() && u.vai_tro !== 'admin' && u.vai_tro !== 'ban_giam_hieu';
            return '<tr data-id="' + u.id + '" data-email="' + thoat(u.email) + '"' +
              (u.trang_thai === 'cho_duyet' ? ' class="dong-cho"' : '') + '>' +
              '<td><b>' + thoat(u.ho_ten) + '</b>' + (u.chuc_vu ? '<br><small>' + thoat(u.chuc_vu) + '</small>' : '') + '</td>' +
              '<td>' + thoat(u.email) + '</td>' +
              '<td>' + chonHTML('vai_tro', u.vai_tro, ['admin', 'ban_giam_hieu', 'to_truong', 'giao_vien', 'nhan_vien'], TEN_VAI_TRO) + '</td>' +
              '<td>' + chonHTML('trang_thai', u.trang_thai, ['cho_duyet', 'hoat_dong', 'khoa'], TEN_TRANG_THAI) + '</td>' +
              '<td><button class="nut-luu-nd">Lưu</button>' +
              (xoaDuoc ? '<button class="nut-xoa-nd">Xóa</button>' : '') + '</td></tr>';
          }).join('') + '</tbody></table></div>';

        Array.prototype.slice.call(hop.querySelectorAll('.nut-luu-nd')).forEach(function (nut) {
          nut.addEventListener('click', function () {
            var dong = nut.closest('tr');
            var id = dong.getAttribute('data-id');
            nut.textContent = '…';
            window.MAY_CHU.from('nguoi_dung').update({
              vai_tro: dong.querySelector('select[data-cot="vai_tro"]').value,
              trang_thai: dong.querySelector('select[data-cot="trang_thai"]').value
            }).eq('id', id).select()
              .then(function (r) {
                var ok = !r.error && r.data && r.data.length;
                nut.textContent = ok ? 'Đã lưu ✓' : 'Lỗi!';
                if (ok) dong.classList.remove('dong-cho');
                setTimeout(function () { nut.textContent = 'Lưu'; }, 2500);
              });
          });
        });

        // Xóa hẳn: gọi hàm xoa_tai_khoan (sql/21-xoa-tai-khoan.sql). Hàm xóa ở
        // auth.users, dòng nguoi_dung đi theo nhờ cascade. Mọi hàng rào nằm ở
        // máy chủ; hộp thoại dưới đây chỉ để tay không nhanh hơn đầu.
        Array.prototype.slice.call(hop.querySelectorAll('.nut-xoa-nd')).forEach(function (nut) {
          nut.addEventListener('click', function () {
            var dong = nut.closest('tr');
            var email = dong.getAttribute('data-email');
            if (!window.confirm(
              'Xóa hẳn tài khoản ' + email + ' khỏi hệ thống?\n\n' +
              'Người này mất toàn bộ quyền truy cập và biến khỏi danh sách. ' +
              'Sổ nhật ký vẫn giữ vết ai xóa, lúc nào.\n\n' +
              'Chỉ muốn chặn tạm thì chọn trạng thái 🔴 Khóa rồi bấm Lưu, đừng xóa.')) return;

            nut.disabled = true; nut.textContent = '…';
            window.MAY_CHU.rpc('xoa_tai_khoan', { p_id: dong.getAttribute('data-id') })
              .then(function (r) {
                if (r.error) {
                  window.alert('Không xóa được.\n\n' + (r.error.message || 'Lỗi không rõ.'));
                  nut.disabled = false; nut.textContent = 'Xóa';
                  return;
                }
                if (r.data && r.data.con_trong_ds_moi) {
                  window.alert('Đã xóa ' + email + '.\n\n' +
                    'LƯU Ý: email này vẫn nằm trong DANH SÁCH MỜI, nên nếu người đó đăng nhập ' +
                    'Google lần nữa thì tài khoản tự tạo lại và vào thẳng, không cần duyệt. ' +
                    'Muốn chặn hẳn thì phải bỏ tên khỏi danh sách mời.');
                }
                veTaiKhoan(hop);
              })
              // Mạng rớt giữa chừng thì promise reject, không vào nhánh r.error
              // ở trên — thiếu chỗ này là nút đứng mãi ở dấu "…" và admin tưởng
              // đã xóa xong. Hỏng thì phải NÓI RA.
              .catch(function (e) {
                window.alert('Không gọi được máy chủ.\n\n' + ((e && e.message) || e) +
                  '\n\nKiểm tra mạng rồi thử lại — chưa có gì bị xóa.');
                nut.disabled = false; nut.textContent = 'Xóa';
              });
          });
        });
      });
  }

  // ── Thẻ Sổ nhật ký ──
  function veNhatKy(hop) {
    window.MAY_CHU.from('nhat_ky')
      .select('email,hanh_dong,bang,ban_ghi,thoi_gian')
      .order('thoi_gian', { ascending: false }).limit(60)
      .then(function (kq) {
        var ds = kq.data || [];
        hop.innerHTML = '<div class="nhan-nho" style="margin:14px 0 10px">60 thao tác gần nhất — nhật ký do máy chủ tự ghi, ' +
          'không ai sửa/xóa được kể cả quản trị (Luật Bảo vệ dữ liệu cá nhân năm 2025).</div>' +
          (ds.length
            ? '<div class="cuon-ngang"><table class="bang-quan-tri nho"><thead><tr>' +
              '<th>Thời gian</th><th>Ai</th><th>Làm gì</th><th>Ở đâu</th></tr></thead><tbody>' +
              ds.map(function (n) {
                return '<tr><td>' + new Date(n.thoi_gian).toLocaleString('vi-VN') + '</td>' +
                  '<td>' + thoat(n.email || 'hệ thống') + '</td><td>' + thoat(n.hanh_dong) + '</td>' +
                  '<td>' + thoat((n.bang || '') + (n.ban_ghi ? ' · ' + n.ban_ghi : '')) + '</td></tr>';
              }).join('') + '</tbody></table></div>'
            : '<div class="the-thong-bao">Chưa có thao tác nào được ghi.</div>');
      });
  }
})();
