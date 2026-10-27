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
    if (!vung) return;
    if (!window.MAY_CHU || !laQT()) {
      // Không phải BGH/quản trị (hoặc vừa bị hạ vai giữa phiên): dọn sạch màn,
      // trả lại dòng báo — rà phân quyền 28/9/2026, sổ dự án mục 100.
      if (window.MAY_CHU) vung.innerHTML = '';
      var baoKhong = document.getElementById('quantri-thong-bao');
      if (baoKhong) baoKhong.style.display = '';
      return;
    }
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

  // ── Đổi Gmail một người ở MỌI chỗ (sql/86-ghep-tai-khoan.sql, 28/10/2026 — bê từ mầm non) ──
  // Danh sách mời, lớp chủ nhiệm, TKB, dạy thay, sổ chủ nhiệm, hồ sơ phụ trách (cả ô nhiều Gmail cách phẩy)…
  // cùng đổi trong một giao dịch; tài khoản đã đăng nhập bằng Gmail mới được duyệt theo dòng mời, kèm điểm trường
  // và lớp chủ nhiệm; thư mục hồ sơ cá nhân xếp lượt cho máy Drive chia sẻ.
  // Dùng chung: 👥 Tài khoản › Ghép và ✉️ Danh sách mời (thiet-lap.js). Trả Promise<true|false>;
  // duPhong = true: máy chủ chưa có hàm thì KHÔNG báo, trả 'chua_cai' để Danh sách mời lưu theo lối cũ.
  // QC1 1/10/2026: đổi Gmail hai cô là một lượt người làm kỹ thuật viết SQL + Apps Script riêng.
  window.doiGmailNguoi = function (cu, moi, duPhong) {
    function hong(chu) {
      return window.hopBao({ tieuDe: 'CHƯA đổi được Gmail', bieuTuong: '⚠️', noiDung: chu + '\n\nChưa có gì bị đổi.' })
        .then(function () { return false; });
    }
    return window.MAY_CHU.rpc('doi_gmail_nguoi', { p_cu: cu, p_moi: moi }).then(function (r) {
      if (r.error) {
        var chuaCai = r.error.code === 'PGRST202' || /could not find the function/i.test(r.error.message || '');
        if (chuaCai && duPhong) return 'chua_cai';
        return hong(chuaCai
          ? 'Máy chủ của trường chưa có bản cập nhật "Ghép tài khoản". Nhờ người làm kỹ thuật chạy ' +
            'sql/86-ghep-tai-khoan.sql cho trường rồi thử lại.'
          : 'Máy chủ báo: ' + (r.error.message || 'lỗi không rõ.'));
      }
      var d = r.data || {};
      var dong = ['Gmail của ' + (d.ho_ten || 'thầy cô') + ' nay là ' + moi + '.'];
      if (d.so_dong) dong.push('Đã đổi ' + d.so_dong + ' chỗ còn ghi Gmail cũ (danh sách mời, lớp chủ nhiệm, thời khoá biểu, ' +
        'dạy thay, sổ chủ nhiệm, hồ sơ phụ trách…).');
      dong.push(d.da_duyet
        ? 'Tài khoản đã được duyệt' + (d.lop_chu_nhiem ? ', nhận chủ nhiệm ' + d.lop_chu_nhiem + ' lớp' : '') +
          ' — thầy cô tải lại trang là vào được.'
        : 'Thầy cô đăng nhập bằng Gmail mới là vào thẳng, không phải chờ duyệt.');
      dong.push(d.cho_drive
        ? 'Thư mục hồ sơ cá nhân: máy Drive mở quyền cho Gmail mới trong khoảng 5 phút — theo dõi ở đầu thẻ 👥 Tài khoản.'
        : 'Dòng này chưa có link thư mục hồ sơ cá nhân nên không có thư mục nào để chia sẻ.');
      if (d.tai_khoan_cu_con) dong.push('LƯU Ý: Gmail cũ ' + cu + ' vẫn còn tài khoản đang hoạt động. Nếu không dùng ' +
        'nữa, chọn 🔴 Khóa ở dòng đó trong 👥 Tài khoản rồi bấm Lưu.');
      return window.hopBao({ tieuDe: 'Đã đổi Gmail', bieuTuong: '✅', noiDung: dong.join('\n\n') })
        .then(function () { return true; });
    }).catch(function (e) { return hong('Không gọi được máy chủ: ' + ((e && e.message) || e)); });
  };

  // Bỏ dấu, chữ thường, tách từ — để gợi ý "lan nguyen" (tên Google) là "Nguyễn Thị Lan" (danh sách mời).
  function tachTu(s) {
    return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd')
      .toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  }
  // Gợi ý chỉ khi CHẮC: ít nhất hai từ khớp và đứng đầu một mình. Không chắc thì để BGH tự chọn.
  function goiYGhep(tenGoogle, ungVien) {
    var tu = tachTu(tenGoogle);
    if (tu.length < 2) return '';
    var diem = ungVien.map(function (m) {
      var cua = tachTu(m.ho_ten);
      return { email: m.email, d: tu.filter(function (t) { return cua.indexOf(t) >= 0; }).length };
    }).sort(function (a, b) { return b.d - a.d; });
    if (!diem.length || diem[0].d < 2 || (diem[1] && diem[1].d === diem[0].d)) return '';
    return diem[0].email;
  }

  function truocDay(t) {
    var p = Math.round((Date.now() - new Date(t).getTime()) / 60000);
    if (p < 1) return 'vừa xong';
    if (p < 60) return p + ' phút trước';
    if (p < 48 * 60) return Math.round(p / 60) + ' giờ trước';
    return Math.round(p / 1440) + ' ngày trước';
  }

  // Khung trạng thái máy chia sẻ thư mục Drive. Trường chưa chạy SQL (không đọc được bảng) thì im lặng.
  function veDrive(khung, veLai) {
    if (!khung) return;
    Promise.all([
      window.MAY_CHU.from('hang_doi_drive')
        .select('id,thu_muc_id,email_moi,ho_ten,trang_thai,ket_qua,tao_luc,xong_luc')
        .order('id', { ascending: false }).limit(30),
      window.MAY_CHU.rpc('drive_lan_chay_cuoi')
    ]).then(function (kq) {
      if (kq[0].error) return;
      var chay = kq[1] && !kq[1].error ? kq[1].data : null;
      var tuan = Date.now() - 7 * 864e5;
      var ds = (kq[0].data || []).filter(function (v) {
        return v.ket_qua !== 'Thay bằng lượt mới' &&
          (v.trang_thai !== 'xong' || new Date(v.xong_luc || v.tao_luc).getTime() > tuan);
      });
      var lau = !chay || Date.now() - new Date(chay).getTime() > 30 * 60000;
      var conCho = ds.some(function (v) { return v.trang_thai !== 'xong'; });
      if (!ds.length && !chay) return;
      khung.className = 'tk-drive' + (lau && conCho ? ' canh' : '');
      khung.innerHTML = '<b>📁 Máy chia sẻ thư mục hồ sơ</b> — ' + (chay
        ? 'chạy lần cuối ' + truocDay(chay) + (lau ? ' <b class="tk-drive-canh">(lâu rồi không chạy — báo người làm kỹ thuật)</b>' : ' · 5 phút một lượt')
        : '<b class="tk-drive-canh">chưa chạy lần nào</b> — lượt chờ nằm yên tới khi người làm kỹ thuật cài máy cho trường.') +
        (ds.length ? '<ul>' + ds.map(function (v) {
          var tm = 'https://drive.google.com/drive/folders/' + encodeURIComponent(v.thu_muc_id);
          var dau = v.trang_thai === 'xong' ? '✅' : v.trang_thai === 'loi' ? '⚠️' : '⏳';
          var chu = v.trang_thai === 'xong' ? 'đã mở quyền ' + truocDay(v.xong_luc || v.tao_luc)
            : v.trang_thai === 'loi' ? 'chưa mở được quyền' : 'đang chờ mở quyền (xếp ' + truocDay(v.tao_luc) + ')';
          return '<li>' + dau + ' <b>' + thoat(v.ho_ten || '') + '</b> ' + thoat(v.email_moi) + ' — ' + chu +
            (v.trang_thai === 'loi'
              ? ' <a href="' + tm + '" target="_blank" rel="noopener">Mở thư mục</a>' +
                ' <button class="nut-drive-lai" data-id="' + v.id + '">Thử lại</button>' +
                '<small>' + thoat(v.ket_qua || '') + ' · Muốn tự làm: mở thư mục › Chia sẻ › dán Gmail › quyền Người chỉnh sửa.</small>'
              : '') + '</li>';
        }).join('') + '</ul>' : '');
      Array.prototype.slice.call(khung.querySelectorAll('.nut-drive-lai')).forEach(function (n) {
        n.addEventListener('click', function () {
          n.disabled = true; n.textContent = '…';
          window.MAY_CHU.rpc('drive_thu_lai', { p_id: Number(n.getAttribute('data-id')) }).then(function (r) {
            if (r.error) { n.disabled = false; n.textContent = 'Thử lại'; window.hopBao({ tieuDe: 'Không xếp lại được', bieuTuong: '⚠️', noiDung: r.error.message }); return; }
            veLai();
          });
        });
      });
    }).catch(function () { /* khung phụ — hỏng mạng thì bảng chính đã báo */ });
  }

  // ── Thẻ Tài khoản ──
  function veTaiKhoan(hop) {
    Promise.all([
      window.MAY_CHU.from('nguoi_dung')
        .select('id,email,ho_ten,chuc_vu,vai_tro,trang_thai,lan_vao_cuoi').order('ho_ten'),
      window.MAY_CHU.from('moi_tai_khoan').select('email,ho_ten,chuc_vu,to_chuyen_mon').order('ho_ten'),
      // Trường chưa chạy sql/86-ghep-tai-khoan.sql thì không có bảng này — khi ấy không bày nút Ghép.
      window.MAY_CHU.from('hang_doi_drive').select('id').limit(1)
    ])
      .then(function (kqs) {
        var kq = kqs[0];
        if (kq.error) { hop.innerHTML = '<div class="the-thong-bao">Không đọc được danh sách người dùng.</div>'; return; }
        var ds = kq.data || [];
        var choDuyet = ds.filter(function (u) { return u.trang_thai === 'cho_duyet'; }).length;
        // Ứng viên ghép: dòng mời mà CHƯA có tài khoản nào đăng nhập bằng đúng Gmail ấy.
        var daVao = {};
        ds.forEach(function (u) { if (u.trang_thai !== 'cho_duyet') daVao[String(u.email).toLowerCase()] = 1; });
        var coGhep = !!(kqs[2] && !kqs[2].error);
        var ungVien = (coGhep && kqs[1] && !kqs[1].error && kqs[1].data || []).filter(function (m) {
          return m.email && !daVao[String(m.email).toLowerCase()];
        });

        hop.innerHTML = '<div id="tk-drive"></div>' +
          '<div class="nhan-nho" style="margin:14px 0 10px">Đã đăng nhập ' + ds.length + ' tài khoản' +
          // --canh (#8f5d14) đạt 5,1:1 trên nền sáng; #c8901c cũ chỉ 3,3:1 và
          // đã bị bỏ khỏi bảng màu phiên 14-15/8.
          (choDuyet ? ' · <b style="color:var(--canh)">' + choDuyet + ' chờ duyệt</b>' : '') +
          ' — thầy cô có tên trong danh sách mời thì lần đầu đăng nhập là vào thẳng, không cần duyệt.' +
          (choDuyet && ungVien.length ? ' Tài khoản chờ duyệt mà thật ra là một thầy cô trong danh sách (Gmail trên ' +
            'phiếu ghi sai, hoặc thầy cô đổi Gmail) thì chọn người ở dòng vàng rồi bấm <b>Ghép</b>: lớp chủ nhiệm, ' +
            'thời khoá biểu, hồ sơ, thư mục theo về Gmail mới.' : '') +
          '</div>' +
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
              (xoaDuoc ? '<button class="nut-xoa-nd">Xóa</button>' : '') + '</td></tr>' +
              (u.trang_thai === 'cho_duyet' && ungVien.length ? dongGhep(u) : '');
          }).join('') + '</tbody></table></div>';

        function dongGhep(u) {
          var goiY = goiYGhep(u.ho_ten, ungVien);
          return '<tr class="dong-ghep" data-email="' + thoat(u.email) + '" data-ten="' + thoat(u.ho_ten) + '"><td colspan="5">' +
            '<div class="ghep-o">Đây là: <select class="chon-ghep"><option value="">— chọn thầy cô trong danh sách mời —</option>' +
            ungVien.map(function (m) {
              return '<option value="' + thoat(m.email) + '"' + (m.email === goiY ? ' selected' : '') + '>' +
                thoat(m.ho_ten || m.email) + (m.chuc_vu || m.to_chuyen_mon ? ' · ' + thoat(m.chuc_vu || m.to_chuyen_mon) : '') +
                ' · ' + thoat(m.email) + '</option>';
            }).join('') + '</select>' +
            '<button class="nut-ghep">Ghép</button>' +
            (goiY ? '<span class="goi-y">Gợi ý theo tên Google — xem lại cho chắc trước khi ghép.</span>' : '') +
            '</div></td></tr>';
        }

        veDrive(document.getElementById('tk-drive'), function () { veTaiKhoan(hop); });

        Array.prototype.slice.call(hop.querySelectorAll('.nut-ghep')).forEach(function (nut) {
          nut.addEventListener('click', function () {
            var dong = nut.closest('tr');
            var emailND = dong.getAttribute('data-email');
            var emailDS = dong.querySelector('select.chon-ghep').value;
            var m = ungVien.filter(function (x) { return x.email === emailDS; })[0];
            if (!m) {
              window.hopBao({ tieuDe: 'Chưa chọn người', bieuTuong: '☝️',
                noiDung: 'Chọn trong danh sách xem tài khoản ' + emailND + ' là thầy cô nào, rồi bấm Ghép.' });
              return;
            }
            window.hopHoi({
              tieuDe: 'Ghép ' + emailND + ' vào ' + (m.ho_ten || m.email) + '?', nutOK: 'Ghép', nutHuy: 'Huỷ',
              noiDung: 'Tài khoản Google "' + dong.getAttribute('data-ten') + '" (' + emailND + ') là ' +
                (m.ho_ten || m.email) + (m.chuc_vu ? ' — ' + m.chuc_vu : '') + '.\n\n' +
                'Gmail ' + m.email + ' sẽ đổi thành ' + emailND + ' ở mọi chỗ: danh sách mời, lớp chủ nhiệm, ' +
                'thời khoá biểu, dạy thay, sổ chủ nhiệm, hồ sơ phụ trách. Tài khoản được duyệt ngay với quyền, tổ, ' +
                'điểm trường của người này; thư mục hồ sơ cá nhân được mở quyền cho Gmail mới sau vài phút.\n\n' +
                'Chỉ bấm Ghép khi chắc chắn là cùng một người.'
            }).then(function (dongY) {
              if (!dongY) return;
              nut.disabled = true; nut.textContent = '…';
              window.doiGmailNguoi(m.email, emailND).then(function (xong) {
                if (xong) { veTaiKhoan(hop); return; }
                nut.disabled = false; nut.textContent = 'Ghép';
              });
            });
          });
        });

        Array.prototype.slice.call(hop.querySelectorAll('.nut-luu-nd')).forEach(function (nut) {
          nut.addEventListener('click', function () {
            var dong = nut.closest('tr');
            var id = dong.getAttribute('data-id');
            var email = dong.getAttribute('data-email') || 'tài khoản này';
            nut.textContent = '…'; nut.disabled = true;

            // Đây là màn CẤP QUYỀN. Hỏng ở đây mà chỉ nháy chữ "Lỗi!" rồi tự
            // xoá sau 2,5 giây thì admin quay đi là mất dấu — tưởng đã mở quyền
            // cho thầy cô, hôm sau người ta gọi điện hỏi vì sao vẫn không vào
            // được. Hỏng thì phải NÓI RA bằng hộp thoại, và nói rõ hỏng vì gì.
            function hong(chu) {
              nut.disabled = false; nut.textContent = 'Lỗi!';
              window.alert('CHƯA lưu được vai trò / trạng thái của ' + email + '.\n\n' + chu +
                '\n\nDòng trên màn hình đang hiện giá trị vừa chọn, nhưng máy chủ vẫn giữ ' +
                'giá trị cũ. Tải lại trang để thấy đúng thực tế.');
              setTimeout(function () { nut.textContent = 'Lưu'; }, 2500);
            }

            window.MAY_CHU.from('nguoi_dung').update({
              vai_tro: dong.querySelector('select[data-cot="vai_tro"]').value,
              trang_thai: dong.querySelector('select[data-cot="trang_thai"]').value
            }).eq('id', id).select()
              .then(function (r) {
                if (r.error) { hong('Máy chủ báo lỗi: ' + (r.error.message || 'không rõ.')); return; }
                // RLS chặn ghi thì không có error, chỉ 0 dòng trả về.
                if (!r.data || !r.data.length) {
                  hong('Máy chủ nhận lệnh nhưng KHÔNG dòng nào được ghi — thường là ' +
                    'tài khoản đang dùng không đủ quyền sửa người dùng khác.');
                  return;
                }
                nut.disabled = false; nut.textContent = 'Đã lưu ✓';
                dong.classList.remove('dong-cho');
                setTimeout(function () { nut.textContent = 'Lưu'; }, 2500);
              })
              .catch(function (e) {
                hong('Không gọi được máy chủ: ' + ((e && e.message) || e));
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
      })
      .catch(function (e) {
        hop.innerHTML = '<div class="hd-kiem do"><b>Không đọc được danh sách người dùng.</b><br>' +
          thoat((e && e.message) || e) +
          '<br><br><button class="nut-phu nut-tk-tai-lai">Thử lại</button></div>';
        var n = hop.querySelector('.nut-tk-tai-lai');
        if (n) n.addEventListener('click', function () { veTaiKhoan(hop); });
      });
  }

  // ── Thẻ Sổ nhật ký ──
  function veNhatKy(hop) {
    window.MAY_CHU.from('nhat_ky')
      .select('email,hanh_dong,bang,ban_ghi,thoi_gian')
      .order('thoi_gian', { ascending: false }).limit(60)
      .then(function (kq) {
        // Không xét kq.error thì lỗi máy chủ (hoặc RLS chặn đọc nhật ký) hiện
        // ra thành câu "Chưa có thao tác nào được ghi" — một sổ nhật ký trống
        // trơn là điều rất khác với một sổ không đọc được.
        if (kq.error) { hongNhatKy(hop, kq.error.message); return; }
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
      })
      .catch(function (e) { hongNhatKy(hop, (e && e.message) || e); });
  }

  function hongNhatKy(hop, chu) {
    hop.innerHTML = '<div class="hd-kiem do"><b>Không đọc được sổ nhật ký.</b><br>' +
      thoat(chu || 'Lỗi không rõ.') +
      '<br><br>Đây KHÔNG phải là "sổ trống" — nhật ký có thể vẫn đầy đủ trên máy chủ, ' +
      'chỉ là lần này không lấy về được.</div>' +
      '<div style="margin-top:12px"><button class="nut-phu nut-nk-tai-lai">Thử lại</button></div>';
    var n = hop.querySelector('.nut-nk-tai-lai');
    if (n) n.addEventListener('click', function () { veNhatKy(hop); });
  }
})();
