// ============================================================
// quan-tri.js — màn Quản trị hệ thống (chỉ admin / ban giám hiệu)
// Duyệt tài khoản chờ, đổi vai trò, khóa/mở, xem sổ nhật ký.
// supabase-ket-noi.js gọi window.veQuanTri() khi người đăng nhập
// có vai trò admin/ban_giam_hieu. RLS phía máy chủ chặn mọi trường
// hợp gọi trái phép — giao diện chỉ là lớp vỏ.
// ============================================================
(function () {
  'use strict';

  function thoat(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  var TEN_VAI_TRO = {
    admin: 'Quản trị', ban_giam_hieu: 'Ban giám hiệu', to_truong: 'Tổ trưởng',
    giao_vien: 'Giáo viên', nhan_vien: 'Nhân viên'
  };
  var TEN_TRANG_THAI = { cho_duyet: '🟡 Chờ duyệt', hoat_dong: '🟢 Hoạt động', khoa: '🔴 Khóa' };

  function chonHTML(ten, giaTri, dsMa, dsTen) {
    return '<select data-cot="' + ten + '">' + dsMa.map(function (ma) {
      return '<option value="' + ma + '"' + (ma === giaTri ? ' selected' : '') + '>' + dsTen[ma] + '</option>';
    }).join('') + '</select>';
  }

  window.veQuanTri = function () {
    var may = window.MAY_CHU;
    var vung = document.getElementById('vung-quantri');
    if (!may || !vung) return;

    Promise.all([
      may.from('nguoi_dung').select('id,email,ho_ten,chuc_vu,vai_tro,trang_thai,lan_vao_cuoi').order('ho_ten'),
      may.from('nhat_ky').select('email,hanh_dong,bang,ban_ghi,thoi_gian').order('thoi_gian', { ascending: false }).limit(30)
    ]).then(function (kq) {
      if (kq[0].error) { vung.innerHTML = '<div class="the-thong-bao">Không đọc được danh sách người dùng.</div>'; return; }
      var ds = kq[0].data || [];
      var nhatKy = kq[1].data || [];
      var choDuyet = ds.filter(function (u) { return u.trang_thai === 'cho_duyet'; }).length;

      var html = '<div class="dau-muc" style="text-align:left"><div class="nhan-nho">👥 Tài khoản đã đăng nhập · ' +
        ds.length + ' người' + (choDuyet ? ' · <b style="color:#c8901c">' + choDuyet + ' chờ duyệt</b>' : '') + '</div></div>';

      html += '<div class="cuon-ngang"><table class="bang-quan-tri"><thead><tr>' +
        '<th>Họ tên</th><th>Email</th><th>Vai trò</th><th>Trạng thái</th><th></th></tr></thead><tbody>';
      html += ds.map(function (u) {
        return '<tr data-id="' + u.id + '"' + (u.trang_thai === 'cho_duyet' ? ' class="dong-cho"' : '') + '>' +
          '<td><b>' + thoat(u.ho_ten) + '</b>' + (u.chuc_vu ? '<br><small>' + thoat(u.chuc_vu) + '</small>' : '') + '</td>' +
          '<td>' + thoat(u.email) + '</td>' +
          '<td>' + chonHTML('vai_tro', u.vai_tro, ['admin', 'ban_giam_hieu', 'to_truong', 'giao_vien', 'nhan_vien'], TEN_VAI_TRO) + '</td>' +
          '<td>' + chonHTML('trang_thai', u.trang_thai, ['cho_duyet', 'hoat_dong', 'khoa'], TEN_TRANG_THAI) + '</td>' +
          '<td><button class="nut-luu-nd">Lưu</button></td></tr>';
      }).join('');
      html += '</tbody></table></div>';

      html += '<div class="dau-muc" style="text-align:left;margin-top:26px"><div class="nhan-nho">📒 Sổ nhật ký — 30 thao tác gần nhất (không xóa được)</div></div>';
      html += nhatKy.length
        ? '<div class="cuon-ngang"><table class="bang-quan-tri nho"><thead><tr><th>Thời gian</th><th>Ai</th><th>Làm gì</th><th>Ở đâu</th></tr></thead><tbody>' +
          nhatKy.map(function (n) {
            var t = new Date(n.thoi_gian);
            return '<tr><td>' + t.toLocaleString('vi-VN') + '</td><td>' + thoat(n.email || 'hệ thống') + '</td>' +
              '<td>' + thoat(n.hanh_dong) + '</td><td>' + thoat((n.bang || '') + (n.ban_ghi ? ' · ' + n.ban_ghi : '')) + '</td></tr>';
          }).join('') + '</tbody></table></div>'
        : '<div class="the-thong-bao">Chưa có thao tác nào được ghi.</div>';

      vung.innerHTML = html;
      var baoCu = document.getElementById('quantri-thong-bao');
      if (baoCu) baoCu.style.display = 'none';

      Array.prototype.slice.call(vung.querySelectorAll('.nut-luu-nd')).forEach(function (nut) {
        nut.addEventListener('click', function () {
          var dong = nut.closest('tr');
          var id = dong.getAttribute('data-id');
          var vaiTro = dong.querySelector('select[data-cot="vai_tro"]').value;
          var trangThai = dong.querySelector('select[data-cot="trang_thai"]').value;
          nut.textContent = '…';
          may.from('nguoi_dung').update({ vai_tro: vaiTro, trang_thai: trangThai }).eq('id', id)
            .then(function (r) {
              nut.textContent = r.error ? 'Lỗi!' : 'Đã lưu ✓';
              if (!r.error) dong.classList.remove('dong-cho');
              setTimeout(function () { nut.textContent = 'Lưu'; }, 2500);
            });
        });
      });
    });
  };
})();
