// ============================================================
// tcqg-hoidong.js — HỘI ĐỒNG TĐG (Điều 9) · KẾ HOẠCH CẢI TIẾN (Biểu 2,
// Điều 10) · ĐIỀU KIỆN CÔNG NHẬN CQG (Điều 16, 19, 20)
// Kế thừa tt57-hoidong-caitien-cnqg.js của Bạch Liêu.
// Đăng ký 3 thẻ vào màn Quản trị qua window.qtTabPhu; khối hội đồng
// CHỈ XEM đổ vào #kd-hoi-dong của màn Trường chuẩn Quốc gia.
// Ràng buộc Điều 9: ≥ 5 thành viên, số LẺ, đúng 01 Chủ tịch + 01 Thư ký;
// hạn phê duyệt báo cáo: trước 15/6 của năm học.
// ============================================================
(function () {
  'use strict';

  var thoat = function (s) { return window.thoatHTML(s); };
  var VAI = ['Chủ tịch', 'Phó Chủ tịch', 'Thư ký', 'Ủy viên'];
  var THU_TU_VAI = { 'Chủ tịch': 1, 'Phó Chủ tịch': 2, 'Thư ký': 3, 'Ủy viên': 4 };

  function laQT() {
    var u = window.NGUOI_DUNG;
    return !!u && (u.vai_tro === 'admin' || u.vai_tro === 'ban_giam_hieu');
  }
  function nam() { return window.CAU_HINH.NAM_HOC || '2026-2027'; }
  function ngayVN(d) { return d ? new Date(d).toLocaleDateString('vi-VN') : ''; }

  // Ghi + đếm dòng thật (chống RLS lưu giả)
  function ghi(bang, ban, onConflict) {
    var lenh = window.MAY_CHU.from(bang);
    var p = onConflict ? lenh.upsert(ban, { onConflict: onConflict }).select() : lenh.insert(ban).select();
    return p.then(function (r) {
      if (r.error) throw r.error;
      if (!r.data || !r.data.length) throw new Error('Máy chủ nhận lệnh nhưng không dòng nào đổi — kiểm tra quyền.');
      return r.data;
    });
  }
  function batLoi(e) { window.notify('Không lưu được: ' + (e.message || e)); }

  function sapThanhVien(ds) {
    return ds.slice().sort(function (a, b) {
      return (THU_TU_VAI[a.vai_tro] || 9) - (THU_TU_VAI[b.vai_tro] || 9) || (a.so_tt || 0) - (b.so_tt || 0);
    });
  }

  function taiHoiDong(namHoc) {
    var may = window.MAY_CHU;
    return may.from('hoi_dong_tdg').select('*').eq('nam_hoc', namHoc).maybeSingle().then(function (hd) {
      if (hd.error) throw hd.error;
      if (!hd.data) return { hd: null, tv: [], kiem: null };
      return Promise.all([
        may.from('thanh_vien_hoi_dong').select('*').eq('hoi_dong_id', hd.data.id).order('so_tt'),
        may.rpc('kiem_tra_hoi_dong', { p_nam_hoc: namHoc })
      ]).then(function (kq) {
        return { hd: hd.data, tv: kq[0].data || [], kiem: (kq[1].data && kq[1].data[0]) || null };
      });
    });
  }

  function daiKiem(k, gon) {
    if (!k || !k.so_thanh_vien) {
      return '<div class="hd-kiem vang">⚠ Chưa có hội đồng tự đánh giá cho năm học này' +
        (laQT() ? ' — vào thẻ Hội đồng TĐG trong Quản trị để lập.' : '.') + '</div>';
    }
    var thieu = [];
    if (!k.du_so_luong) thieu.push('chưa đủ 5 thành viên (đang ' + k.so_thanh_vien + ')');
    if (!k.la_so_le) thieu.push('số thành viên phải là số LẺ (đang ' + k.so_thanh_vien + ')');
    if (k.so_chu_tich !== 1) thieu.push('phải có đúng 01 Chủ tịch (đang ' + k.so_chu_tich + ')');
    if (k.so_thu_ky !== 1) thieu.push('phải có đúng 01 Thư ký (đang ' + k.so_thu_ky + ')');
    var hopLe = !thieu.length;
    var pd = '';
    if (!gon) {
      if (k.ngay_phe_duyet) {
        pd = k.phe_duyet_dung_han
          ? ' Báo cáo phê duyệt ' + ngayVN(k.ngay_phe_duyet) + ' — đúng hạn 15/6.'
          : ' ⚠ Báo cáo phê duyệt ' + ngayVN(k.ngay_phe_duyet) + ' — SAU hạn 15/6.';
      } else if (k.han_phe_duyet) {
        pd = ' Hạn phê duyệt báo cáo: trước ' + ngayVN(k.han_phe_duyet) + ' (chưa phê duyệt).';
      }
    }
    return '<div class="hd-kiem ' + (hopLe ? 'xanh' : 'vang') + '">' +
      (hopLe
        ? '✔ Hội đồng hợp lệ theo Điều 9: ' + k.so_thanh_vien + ' thành viên (số lẻ), 01 Chủ tịch, 01 Thư ký. ' +
          (k.so_da_tap_huan || 0) + '/' + k.so_thanh_vien + ' người đã tập huấn về bảo đảm chất lượng (ưu tiên, không bắt buộc).'
        : '⚠ Chưa hợp lệ theo Điều 9: ' + thieu.join('; ') + '.') + thoat(pd) + '</div>';
  }

  // ══════════ KHỐI CHỈ XEM TRÊN MÀN TCQG ══════════
  window.veHoiDongTCQG = function (namHoc) {
    var goc = document.getElementById('kd-hoi-dong');
    if (!goc) return;
    taiHoiDong(namHoc).then(function (d) {
      if (!d.hd) { goc.innerHTML = daiKiem(null); return; }
      var email = ((window.NGUOI_DUNG || {}).email || '').toLowerCase();
      var toi = d.tv.filter(function (t) { return (t.email || '').toLowerCase() === email; })[0];
      goc.innerHTML =
        '<div class="sub open"><div class="sub-head" role="button" onclick="this.parentNode.classList.toggle(\'open\')">' +
        '<span class="fo">👥</span><b>Hội đồng tự đánh giá · Năm học ' + thoat(namHoc) + ' · ' + d.tv.length + ' thành viên' +
        (d.hd.so_quyet_dinh ? ' · QĐ số ' + thoat(d.hd.so_quyet_dinh) + (d.hd.ngay_quyet_dinh ? ' ngày ' + ngayVN(d.hd.ngay_quyet_dinh) : '') : '') +
        '</b><span class="sub-arrow">▶</span></div>' +
        '<div class="sub-body" style="padding:12px 14px">' +
        (toi
          ? '<div class="hd-toi">🎯 <b>Phần của thầy cô:</b> ' + thoat(toi.vai_tro) +
            (toi.nhom ? ' · nhóm ' + thoat(toi.nhom) : '') +
            ((toi.tieu_chi_phu_trach || []).length
              ? ' · phụ trách tiêu chí ' + toi.tieu_chi_phu_trach.join(', ')
              : ' · chưa được giao tiêu chí') +
            (toi.nhiem_vu ? ' · ' + thoat(toi.nhiem_vu) : '') + '</div>'
          : '') +
        daiKiem(d.kiem, true) +
        '<div class="cuon-ngang"><table class="bang-quan-tri nho"><thead><tr>' +
        '<th>TT</th><th>Họ tên</th><th>Chức vụ</th><th>Vai trò</th><th>Nhóm</th><th>Tiêu chí phụ trách</th></tr></thead><tbody>' +
        sapThanhVien(d.tv).map(function (t, i) {
          var cuaToi = (t.email || '').toLowerCase() === email;
          return '<tr' + (cuaToi ? ' style="background:#eef7f1"' : '') + '><td>' + (i + 1) + '</td>' +
            '<td><b>' + thoat(t.ho_ten) + '</b>' + (cuaToi ? ' <span class="st st-co">thầy cô</span>' : '') + '</td>' +
            '<td>' + thoat(t.chuc_vu || '') + '</td><td>' + thoat(t.vai_tro) + '</td>' +
            '<td>' + thoat(t.nhom || '') + '</td><td>' + (t.tieu_chi_phu_trach || []).join(', ') + '</td></tr>';
        }).join('') + '</tbody></table></div>' +
        '<div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap">' +
        '<button class="nut-vien nho" onclick="window.xuatDanhSachHoiDong?xuatDanhSachHoiDong():notify(\'Bản in sẽ có ở bước sau.\')">📄 Danh sách hội đồng (Word)</button>' +
        '<button class="nut-vien nho" onclick="window.xuatPhanCongHoiDong?xuatPhanCongHoiDong():notify(\'Bản in sẽ có ở bước sau.\')">📄 Bảng phân công nhiệm vụ (Word)</button>' +
        '</div></div></div>';
      // Cầu dữ liệu cho bản in
      window.duLieuHoiDong = function () { return { namHoc: namHoc, hd: d.hd, tv: sapThanhVien(d.tv), kiem: d.kiem }; };
    });
  };

  // ══════════ THẺ QUẢN TRỊ 1: HỘI ĐỒNG TĐG ══════════
  function veTabHD(hop) {
    var namHoc = nam();
    Promise.all([taiHoiDong(namHoc), window.MAY_CHU.from('moi_tai_khoan').select('email,ho_ten,chuc_vu').eq('la_ky_thuat', false).order('ho_ten')])
      .then(function (kq) {
        var d = kq[0], dsMoi = kq[1].data || [];
        var hd = d.hd;
        var daCo = {};
        d.tv.forEach(function (t) { if (t.email) daCo[t.email.toLowerCase()] = 1; });
        var chuaVao = dsMoi.filter(function (m) { return !daCo[(m.email || '').toLowerCase()]; });

        hop.innerHTML =
          '<div class="nhan-nho" style="margin:14px 0 8px">Hội đồng tự đánh giá — Năm học ' + thoat(namHoc) + ' (Điều 9 TT57)</div>' +
          daiKiem(d.kiem) +
          '<div class="hd-form">' +
          '<div class="hs-o"><label>Số quyết định thành lập</label><input id="hd-so-qd" placeholder="…/QĐ-THDL" value="' + thoat(hd ? hd.so_quyet_dinh : '') + '"></div>' +
          '<div class="hs-o"><label>Ngày quyết định</label><input type="date" id="hd-ngay-qd" value="' + (hd && hd.ngay_quyet_dinh || '') + '"></div>' +
          '<div class="hs-o"><label>Ngày phê duyệt báo cáo (hạn: trước 15/6)</label><input type="date" id="hd-ngay-pd" value="' + (hd && hd.ngay_phe_duyet_bao_cao || '') + '"></div>' +
          '<div class="hs-o"><label>Ghi chú</label><input id="hd-ghi-chu" value="' + thoat(hd ? hd.ghi_chu : '') + '"></div>' +
          '<button class="nut-luu-nd" id="hd-luu-qd">Lưu quyết định</button></div>' +

          '<div class="nhan-nho" style="margin:18px 0 8px">Thành viên (' + d.tv.length + ') — chọn từ danh sách CBGV-NV, không gõ tay tên</div>' +
          '<div class="hd-form">' +
          '<select id="hd-chon-nguoi"><option value="">— Chọn thầy cô —</option>' +
          chuaVao.map(function (m) {
            return '<option value="' + thoat(m.email) + '">' + thoat(m.ho_ten + (m.chuc_vu ? ' — ' + m.chuc_vu : '')) + '</option>';
          }).join('') + '</select>' +
          '<select id="hd-chon-vai">' + VAI.map(function (v) { return '<option>' + v + '</option>'; }).join('') + '</select>' +
          '<label class="hd-th"><input type="checkbox" id="hd-tap-huan"> đã tập huấn BĐCL</label>' +
          '<button class="nut-luu-nd" id="hd-them">➕ Thêm</button></div>' +

          '<div class="cuon-ngang"><table class="bang-quan-tri nho"><thead><tr>' +
          '<th>Họ tên</th><th>Vai trò</th><th>Nhóm công tác</th><th>Tiêu chí phụ trách</th><th>Nhiệm vụ</th><th>Tập huấn</th><th></th></tr></thead><tbody>' +
          sapThanhVien(d.tv).map(function (t) {
            return '<tr data-tv="' + t.id + '">' +
              '<td><b>' + thoat(t.ho_ten) + '</b><br><small>' + thoat(t.chuc_vu || '') + '</small></td>' +
              '<td><select data-c="vai_tro">' + VAI.map(function (v) {
                return '<option' + (v === t.vai_tro ? ' selected' : '') + '>' + v + '</option>';
              }).join('') + '</select></td>' +
              '<td><input data-c="nhom" value="' + thoat(t.nhom || '') + '" placeholder="Nhóm 1…"></td>' +
              '<td><input data-c="tieu_chi_phu_trach" value="' + (t.tieu_chi_phu_trach || []).join(', ') + '" placeholder="1.1, 1.2"></td>' +
              '<td><input data-c="nhiem_vu" value="' + thoat(t.nhiem_vu || '') + '"></td>' +
              '<td style="text-align:center"><input type="checkbox" data-c="da_tap_huan"' + (t.da_tap_huan ? ' checked' : '') + '></td>' +
              '<td><button class="nut-vien nho" data-xoa>✕</button></td></tr>';
          }).join('') + '</tbody></table></div>' +
          '<div class="lv" style="margin-top:10px"><p style="font-size:12.5px">Sửa ô nào lưu ngay ô đó. Tiêu chí phụ trách gõ mã cách nhau dấu phẩy — ' +
          'mã sai sẽ bị từ chối và báo danh sách mã hợp lệ.</p></div>';

        // Lưu quyết định
        document.getElementById('hd-luu-qd').addEventListener('click', function () {
          var nut = this; nut.textContent = '…';
          ghi('hoi_dong_tdg', {
            nam_hoc: namHoc,
            so_quyet_dinh: document.getElementById('hd-so-qd').value.trim() || null,
            ngay_quyet_dinh: document.getElementById('hd-ngay-qd').value || null,
            ngay_phe_duyet_bao_cao: document.getElementById('hd-ngay-pd').value || null,
            ghi_chu: document.getElementById('hd-ghi-chu').value.trim() || null
          }, 'nam_hoc').then(function () {
            window.notify('Đã lưu quyết định hội đồng.');
            veTabHD(hop);
          }).catch(function (e) { batLoi(e); nut.textContent = 'Lưu quyết định'; });
        });

        // Thêm thành viên
        document.getElementById('hd-them').addEventListener('click', function () {
          var email = document.getElementById('hd-chon-nguoi').value;
          if (!email) { window.notify('Chọn một thầy cô trước đã.'); return; }
          var m = dsMoi.filter(function (x) { return x.email === email; })[0];
          var buoc = hd ? Promise.resolve([hd]) : ghi('hoi_dong_tdg', { nam_hoc: namHoc }, 'nam_hoc');
          buoc.then(function (rows) {
            return ghi('thanh_vien_hoi_dong', {
              hoi_dong_id: rows[0].id, ho_ten: m.ho_ten, chuc_vu: m.chuc_vu || null, email: m.email,
              vai_tro: document.getElementById('hd-chon-vai').value,
              da_tap_huan: document.getElementById('hd-tap-huan').checked,
              so_tt: d.tv.length + 1
            });
          }).then(function () {
            window.notify('Đã thêm ' + m.ho_ten + ' vào hội đồng.');
            veTabHD(hop);
            window.veHoiDongTCQG && window.veHoiDongTCQG(namHoc);
          }).catch(batLoi);
        });

        // Sửa inline từng ô
        Array.prototype.slice.call(hop.querySelectorAll('[data-tv] [data-c]')).forEach(function (o) {
          var suKien = o.tagName === 'SELECT' || o.type === 'checkbox' ? 'change' : 'blur';
          o.addEventListener(suKien, function () {
            var id = o.closest('tr').getAttribute('data-tv');
            var cot = o.getAttribute('data-c');
            var giaTri;
            if (o.type === 'checkbox') giaTri = o.checked;
            else if (cot === 'tieu_chi_phu_trach') {
              var ds = o.value.split(/[,;\s]+/).filter(Boolean);
              var hopLe = window.TIEU_CHI.map(function (t) { return t.ma; });
              var sai = ds.filter(function (ma) { return hopLe.indexOf(ma) < 0; });
              if (sai.length) {
                window.notify('Mã tiêu chí không hợp lệ: ' + sai.join(', ') + '. Mã đúng: ' + hopLe.join(', '));
                var tv = d.tv.filter(function (t) { return String(t.id) === id; })[0];
                o.value = (tv.tieu_chi_phu_trach || []).join(', ');
                return;
              }
              giaTri = ds;
            } else giaTri = o.value.trim() || null;
            var capNhat = {};
            capNhat[cot] = giaTri;
            window.MAY_CHU.from('thanh_vien_hoi_dong').update(capNhat).eq('id', id).select()
              .then(function (r) {
                if (r.error || !r.data.length) { batLoi(r.error || new Error('không dòng nào đổi')); return; }
                d.tv.forEach(function (t) { if (String(t.id) === id) t[cot] = giaTri; });
                window.notify('Đã lưu.');
              });
          });
        });

        // Xóa thành viên
        Array.prototype.slice.call(hop.querySelectorAll('[data-xoa]')).forEach(function (nut) {
          nut.addEventListener('click', function () {
            var dong = nut.closest('tr');
            var id = dong.getAttribute('data-tv');
            var tv = d.tv.filter(function (t) { return String(t.id) === id; })[0];
            if (!window.confirm('Đưa ' + tv.ho_ten + ' ra khỏi hội đồng? Lưu ý: bớt một người có thể làm số thành viên thành số chẵn (Điều 9 yêu cầu số lẻ).')) return;
            window.MAY_CHU.from('thanh_vien_hoi_dong').delete().eq('id', id).select()
              .then(function (r) {
                if (r.error || !r.data.length) { batLoi(r.error || new Error('không xóa được')); return; }
                veTabHD(hop);
                window.veHoiDongTCQG && window.veHoiDongTCQG(namHoc);
              });
          });
        });
      }).catch(function (e) {
        hop.innerHTML = '<div class="hs-loi hien" style="margin:14px 0">Không tải được hội đồng: ' + thoat(e.message || e) + '</div>';
      });
  }

  // ══════════ THẺ QUẢN TRỊ 2: KẾ HOẠCH CẢI TIẾN (Biểu 2) ══════════
  function veTabKH(hop) {
    var namHoc = nam();
    var may = window.MAY_CHU;
    Promise.all([
      may.from('khct_thong_tin').select('*').eq('nam_hoc', namHoc).maybeSingle(),
      may.from('khct_van_de').select('*').eq('nam_hoc', namHoc).order('so_tt'),
      may.from('ke_hoach_cai_tien').select('*').eq('nam_hoc', namHoc).order('so_tt'),
      may.from('khct_theo_doi').select('*').eq('nam_hoc', namHoc),
      may.from('danh_gia_tieu_chuan').select('*').eq('nam_hoc', namHoc)
    ]).then(function (kq) {
      var tt = kq[0].data || {}, vd = kq[1].data || [], kh = kq[2].data || [], td = kq[3].data || [], dgtc = kq[4].data || [];
      var oTD = {};
      td.forEach(function (r) { oTD[r.thoi_diem] = r; });

      function o(ten, giaTri, id, kieu) {
        return '<div class="hs-o"><label>' + ten + '</label><' + (kieu === 'ta' ? 'textarea' : 'input' + (kieu === 'date' ? ' type="date"' : '')) +
          ' id="' + id + '"' + (kieu === 'ta' ? '>' + thoat(giaTri || '') + '</textarea>' : ' value="' + thoat(giaTri || '') + '">') + '</div>';
      }

      hop.innerHTML =
        '<div class="nhan-nho" style="margin:14px 0 8px">Kế hoạch cải tiến chất lượng — Biểu 2 Phụ lục V (Điều 10 TT57) · Năm học ' + thoat(namHoc) + '</div>' +
        '<div class="lv"><p style="font-size:12.5px">📌 Điểm b mục III Biểu 2: KHÔNG lập kế hoạch cho toàn bộ tiêu chí — ' +
        'tập trung vào các vấn đề ưu tiên. Mục VIII: rà soát tối thiểu 02 lần trong năm học.</p></div>' +

        '<div class="hd-form" style="margin-top:10px">' +
        o('Số kế hoạch', tt.so_ke_hoach, 'kh-so') + o('Ngày ban hành', tt.ngay_ban_hanh, 'kh-ngay', 'date') +
        o('Căn cứ khác (nếu có)', tt.can_cu_khac, 'kh-cancu') + o('Nơi nhận', tt.noi_nhan, 'kh-noinhan') +
        '<button class="nut-luu-nd" id="kh-luu-tt">Lưu thông tin chung</button></div>' +

        '<div class="nhan-nho" style="margin:16px 0 8px">IV. Các vấn đề trọng tâm cần cải tiến (' + vd.length + ')</div>' +
        '<div style="display:flex;gap:8px;margin-bottom:8px;flex-wrap:wrap">' +
        '<button class="nut-vien nho" id="kh-them-vd">➕ Thêm vấn đề</button>' +
        '<button class="nut-vien nho" id="kh-lay-dgtc">↙ Lấy từ Đánh giá chung tiêu chuẩn</button></div>' +
        '<div class="cuon-ngang"><table class="bang-quan-tri nho"><thead><tr>' +
        '<th>TT</th><th>Tiêu chuẩn</th><th>Tiêu chí</th><th>Hiện trạng</th><th>Hạn chế</th><th>Nguyên nhân</th><th></th></tr></thead><tbody>' +
        vd.map(function (v, i) {
          return '<tr data-vd="' + v.id + '"><td>' + (i + 1) + '</td>' +
            '<td><input data-c="tieu_chuan" type="number" min="1" max="4" style="width:52px" value="' + (v.tieu_chuan || '') + '"></td>' +
            '<td><input data-c="tieu_chi_ma" style="width:64px" value="' + thoat(v.tieu_chi_ma || '') + '"></td>' +
            '<td><input data-c="hien_trang" value="' + thoat(v.hien_trang || '') + '"></td>' +
            '<td><input data-c="han_che" value="' + thoat(v.han_che || '') + '"></td>' +
            '<td><input data-c="nguyen_nhan" value="' + thoat(v.nguyen_nhan || '') + '"></td>' +
            '<td><button class="nut-vien nho" data-xoa-vd>✕</button></td></tr>';
        }).join('') + '</tbody></table></div>' +

        '<div class="nhan-nho" style="margin:16px 0 8px">V. Kế hoạch cải tiến (' + kh.length + ' việc)</div>' +
        '<button class="nut-vien nho" id="kh-them-viec" style="margin-bottom:8px">➕ Thêm việc cải tiến</button>' +
        '<div class="cuon-ngang"><table class="bang-quan-tri nho" style="min-width:1100px"><thead><tr>' +
        '<th>TT</th><th>Nội dung</th><th>Mục tiêu</th><th>Giải pháp</th><th>Chỉ số kết quả</th><th>Thời gian</th><th>Phụ trách</th><th>Nguồn lực</th><th>Minh chứng dự kiến</th><th>Mức độ</th><th></th></tr></thead><tbody>' +
        kh.map(function (v, i) {
          return '<tr data-kh="' + v.id + '"><td>' + (i + 1) + '</td>' +
            ['ten', 'muc_tieu', 'giai_phap', 'chi_so_ket_qua', 'thoi_gian_thuc_hien', 'nguoi_phu_trach', 'nguon_luc', 'minh_chung_du_kien'].map(function (c) {
              return '<td><input data-c="' + c + '" value="' + thoat(v[c] || '') + '"></td>';
            }).join('') +
            '<td><select data-c="muc_do_thuc_hien"><option value="">— chưa ghi —</option>' +
            ['Hoàn thành', 'Đang thực hiện', 'Chưa hoàn thành'].map(function (m) {
              return '<option' + (m === v.muc_do_thuc_hien ? ' selected' : '') + '>' + m + '</option>';
            }).join('') + '</select></td>' +
            '<td><button class="nut-vien nho" data-xoa-kh>✕</button></td></tr>';
        }).join('') + '</tbody></table></div>' +

        '<div class="nhan-nho" style="margin:16px 0 8px">VI. Theo dõi, đánh giá (tối thiểu 02 lần/năm)</div>' +
        '<div class="cuon-ngang"><table class="bang-quan-tri nho"><thead><tr>' +
        '<th>Thời điểm</th><th>Nội dung</th><th>Kết quả</th><th>Điều chỉnh</th><th>Người đánh giá</th></tr></thead><tbody>' +
        ['Cuối học kỳ I', 'Cuối năm học'].map(function (thoiDiem) {
          var r = oTD[thoiDiem] || {};
          return '<tr data-td="' + thoiDiem + '"><td><b>' + thoiDiem + '</b></td>' +
            ['noi_dung', 'ket_qua', 'dieu_chinh', 'nguoi_danh_gia'].map(function (c) {
              return '<td><input data-c="' + c + '" value="' + thoat(r[c] || '') + '"></td>';
            }).join('') + '</tr>';
        }).join('') + '</tbody></table></div>' +

        '<div class="nhan-nho" style="margin:16px 0 8px">VII. Tổ chức thực hiện</div>' +
        o('1. Trách nhiệm của người đứng đầu', tt.tc_nguoi_dung_dau, 'kh-tc1', 'ta') +
        o('2. Trách nhiệm của Hội đồng tự đánh giá', tt.tc_hoi_dong, 'kh-tc2', 'ta') +
        o('3. Trách nhiệm của tổ chuyên môn, bộ phận', tt.tc_to_chuyen_mon, 'kh-tc3', 'ta') +
        '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px">' +
        '<button class="nut-luu-nd" id="kh-luu-tc">Lưu mục VII</button>' +
        '<button class="nut-vien" onclick="window.xuatBieu2?xuatBieu2():notify(\'Bản xuất Biểu 2 sẽ có ở bước sau.\')">📄 Xuất Biểu 2 (Word)</button></div>';

      function luuThongTin(them) {
        var ban = {
          nam_hoc: namHoc,
          so_ke_hoach: document.getElementById('kh-so').value.trim() || null,
          ngay_ban_hanh: document.getElementById('kh-ngay').value || null,
          can_cu_khac: document.getElementById('kh-cancu').value.trim() || null,
          noi_nhan: document.getElementById('kh-noinhan').value.trim() || null,
          tc_nguoi_dung_dau: document.getElementById('kh-tc1').value.trim() || null,
          tc_hoi_dong: document.getElementById('kh-tc2').value.trim() || null,
          tc_to_chuyen_mon: document.getElementById('kh-tc3').value.trim() || null
        };
        ghi('khct_thong_tin', ban, 'nam_hoc')
          .then(function () { window.notify('Đã lưu.'); })
          .catch(batLoi);
      }
      document.getElementById('kh-luu-tt').addEventListener('click', luuThongTin);
      document.getElementById('kh-luu-tc').addEventListener('click', luuThongTin);

      document.getElementById('kh-them-vd').addEventListener('click', function () {
        ghi('khct_van_de', { nam_hoc: namHoc, so_tt: vd.length + 1 })
          .then(function () { veTabKH(hop); }).catch(batLoi);
      });
      document.getElementById('kh-lay-dgtc').addEventListener('click', function () {
        var chen = [];
        dgtc.forEach(function (r) {
          if (r.han_che_nguyen_nhan && !vd.filter(function (v) { return v.tieu_chuan === r.tieu_chuan; }).length) {
            chen.push({ nam_hoc: namHoc, so_tt: vd.length + chen.length + 1, tieu_chuan: r.tieu_chuan, han_che: r.han_che_nguyen_nhan, hien_trang: r.xu_huong_3_nam || null });
          }
        });
        if (!chen.length) { window.notify('Không có gì mới để lấy — các tiêu chuẩn có hạn chế đều đã có dòng.'); return; }
        ghi('khct_van_de', chen).then(function () { veTabKH(hop); }).catch(batLoi);
      });
      document.getElementById('kh-them-viec').addEventListener('click', function () {
        ghi('ke_hoach_cai_tien', { nam_hoc: namHoc, so_tt: kh.length + 1, ten: '(nội dung mới)' })
          .then(function () { veTabKH(hop); }).catch(batLoi);
      });

      // Sửa inline: vấn đề + kế hoạch + theo dõi
      function ganInline(chon, bang, khoa) {
        Array.prototype.slice.call(hop.querySelectorAll(chon + ' [data-c]')).forEach(function (o) {
          o.addEventListener(o.tagName === 'SELECT' ? 'change' : 'blur', function () {
            var dong = o.closest('tr');
            var capNhat = {};
            capNhat[o.getAttribute('data-c')] = o.value.trim() === '' ? null :
              (o.type === 'number' ? +o.value : o.value.trim());
            if (bang === 'khct_theo_doi') {
              var ban = { nam_hoc: namHoc, thoi_diem: dong.getAttribute('data-td') };
              ['noi_dung', 'ket_qua', 'dieu_chinh', 'nguoi_danh_gia'].forEach(function (c) {
                ban[c] = dong.querySelector('[data-c="' + c + '"]').value.trim() || null;
              });
              ghi(bang, ban, 'nam_hoc,thoi_diem').then(function () { window.notify('Đã lưu.'); }).catch(batLoi);
              return;
            }
            window.MAY_CHU.from(bang).update(capNhat).eq('id', dong.getAttribute(khoa)).select()
              .then(function (r) {
                if (r.error || !r.data.length) batLoi(r.error || new Error('không dòng nào đổi'));
                else window.notify('Đã lưu.');
              });
          });
        });
      }
      ganInline('[data-vd]', 'khct_van_de', 'data-vd');
      ganInline('[data-kh]', 'ke_hoach_cai_tien', 'data-kh');
      ganInline('[data-td]', 'khct_theo_doi', 'data-td');

      Array.prototype.slice.call(hop.querySelectorAll('[data-xoa-vd],[data-xoa-kh]')).forEach(function (nut) {
        nut.addEventListener('click', function () {
          var laVD = nut.hasAttribute('data-xoa-vd');
          var dong = nut.closest('tr');
          if (!window.confirm('Xóa dòng này?')) return;
          window.MAY_CHU.from(laVD ? 'khct_van_de' : 'ke_hoach_cai_tien')
            .delete().eq('id', dong.getAttribute(laVD ? 'data-vd' : 'data-kh')).select()
            .then(function (r) {
              if (r.error || !r.data.length) batLoi(r.error || new Error('không xóa được'));
              else veTabKH(hop);
            });
        });
      });
    });
  }

  // ══════════ THẺ QUẢN TRỊ 3: ĐIỀU KIỆN CÔNG NHẬN CQG ══════════
  function veTabCN(hop) {
    var namHoc = nam();
    var may = window.MAY_CHU;
    Promise.all([
      may.rpc('xep_muc_nha_truong', { p_nam_hoc: namHoc }),
      may.rpc('dem_nam_du_lieu', { p_nam_hoc: namHoc }),
      may.from('cnqg_tu_danh_gia').select('*').eq('nam_hoc', namHoc),
      may.from('cnqg_bang').select('*').order('ngay_ky', { ascending: false })
    ]).then(function (kq) {
      var xep = (kq[0].data && kq[0].data[0]) || {};
      var dem = (kq[1].data && kq[1].data[0]) || {};
      var tdg = {};
      (kq[2].data || []).forEach(function (r) { tdg[r.ma_dk] = r; });
      var bang = kq[3].data || [];

      var datC = /Đạt/.test(xep.ket_luan || '') && !/Không/.test(xep.ket_luan || '');
      var datB = (dem.so_nam_lien_tiep || 0) >= 3;

      var DK = [
        ['a', 'nhap', 'Có ít nhất một khóa học sinh đã hoàn thành Chương trình tiểu học'],
        ['b', 'dem', 'Có đủ 03 năm dữ liệu liên tiếp về tự đánh giá, cải tiến chất lượng và học sinh (điểm b khoản 1 Điều 16)'],
        ['c', 'tinh', 'Kết quả tự đánh giá đạt Mức 1 trở lên (khoản 3 Điều 5)'],
        ['d', 'nhap', 'Cơ sở vật chất, thiết bị và điều kiện bảo đảm an toàn trường học đáp ứng quy định']
      ];

      function den(dk) {
        var dat = dk[0] === 'b' ? datB : dk[0] === 'c' ? datC : (tdg[dk[0]] ? tdg[dk[0]].dap_ung : null);
        return dat === true ? '🟢' : dat === false ? '🔴' : '⚪';
      }

      var trangThai = DK.map(function (dk) {
        return dk[0] === 'b' ? datB : dk[0] === 'c' ? datC : (tdg[dk[0]] ? tdg[dk[0]].dap_ung : null);
      });
      var ketLuan;
      if (trangThai.some(function (t) { return t === null || t === undefined; })) {
        ketLuan = '<div class="hd-kiem vang">🕐 Chưa xét xong — còn điều kiện nhà trường chưa đánh dấu (chưa xét KHÔNG có nghĩa là không đạt).</div>';
      } else if (trangThai.some(function (t) { return t === false; })) {
        var vuong = DK.filter(function (dk, i) { return trangThai[i] === false; }).map(function (dk) { return dk[0]; });
        ketLuan = '<div class="hd-kiem do">✖ Chưa đủ điều kiện công nhận — vướng điều kiện: ' + vuong.join(', ') + '.</div>';
      } else {
        var mucDo = /Mức 2/.test(xep.ket_luan) ? 2 : 1;
        ketLuan = '<div class="hd-kiem xanh">✔ Đáp ứng đồng thời bốn điều kiện khoản 1 Điều 16 — tương ứng chuẩn quốc gia Mức độ ' + mucDo +
          '. Quyền xem xét, công nhận thuộc ' +
          ((window.CAU_HINH && window.CAU_HINH.CO_QUAN_THUONG) || 'cơ quan quản lý ngành') +
          ' (Điều 17).</div>';
      }

      hop.innerHTML =
        '<div class="nhan-nho" style="margin:14px 0 8px">Điều kiện công nhận trường đạt chuẩn quốc gia (khoản 1 Điều 16 TT57) · Năm học ' + thoat(namHoc) + '</div>' +
        DK.map(function (dk) {
          var r = tdg[dk[0]] || {};
          var chiTiet = dk[0] === 'b'
            ? '<small>' + thoat(dem.chi_tiet || '') + '</small>'
            : dk[0] === 'c'
              ? '<small>Máy tính: <b>' + thoat(xep.ket_luan || 'chưa tính được') + '</b> (bắt buộc M1: ' + (xep.bb_m1 || 0) + '/8 · M2: ' + (xep.bb_m2 || 0) + '/8 · còn lại M1: ' + (xep.cl_m1 || 0) + '/7 · M2: ' + (xep.cl_m2 || 0) + '/7)</small>'
              : '';
          return '<div class="tt-dk"><div class="tt-dk-dau">' + den(dk) + ' <b>Điều kiện ' + dk[0] + ')</b> ' + dk[2] + '</div>' +
            chiTiet +
            (dk[1] === 'nhap'
              ? '<div style="display:flex;gap:8px;align-items:center;margin-top:8px;flex-wrap:wrap">' +
                '<select data-dk="' + dk[0] + '"><option value=""' + (r.dap_ung == null ? ' selected' : '') + '>— chưa xét —</option>' +
                '<option value="1"' + (r.dap_ung === true ? ' selected' : '') + '>Đáp ứng</option>' +
                '<option value="0"' + (r.dap_ung === false ? ' selected' : '') + '>Chưa đáp ứng</option></select>' +
                '<input data-dk-gc="' + dk[0] + '" placeholder="Ghi chú, căn cứ…" value="' + thoat(r.ghi_chu || '') + '" style="flex:1;min-width:200px"></div>'
              : '<div><small style="color:var(--chu-mo)">Máy tính hộ — không nhập tay (khoản 4 Điều 27: dữ liệu chỉ hỗ trợ, không là căn cứ duy nhất).</small></div>') +
            '</div>';
        }).join('') +
        ketLuan +

        '<div class="nhan-nho" style="margin:18px 0 8px">Bằng công nhận hiện có</div>' +
        '<div class="cuon-ngang"><table class="bang-quan-tri nho"><thead><tr>' +
        '<th>Mức độ</th><th>Số QĐ</th><th>Ngày ký</th><th>Ngày hết hạn</th><th>Cơ quan cấp</th><th>Còn lại</th></tr></thead><tbody>' +
        bang.map(function (b) {
          var hetHan = b.ngay_het_han || (b.ngay_ky ? new Date(new Date(b.ngay_ky).setFullYear(new Date(b.ngay_ky).getFullYear() + 5)).toISOString().slice(0, 10) : null);
          var suyRa = !b.ngay_het_han && b.ngay_ky;
          var conLai = hetHan ? Math.round((new Date(hetHan) - new Date()) / 2592000000) : null;
          return '<tr data-bang="' + b.id + '"><td><b>Mức độ ' + b.muc_do + '</b></td>' +
            '<td><input data-c="so_quyet_dinh" value="' + thoat(b.so_quyet_dinh || '') + '"></td>' +
            '<td><input type="date" data-c="ngay_ky" value="' + (b.ngay_ky || '') + '"></td>' +
            '<td><input type="date" data-c="ngay_het_han" value="' + (b.ngay_het_han || '') + '">' + (suyRa ? '<br><small>suy ra: ' + ngayVN(hetHan) + ' (5 năm — khoản 2 Điều 19)</small>' : '') + '</td>' +
            '<td><input data-c="co_quan_cap" value="' + thoat(b.co_quan_cap || '') + '"></td>' +
            '<td>' + (conLai == null ? '' : conLai < 0 ? '<b style="color:var(--thieu)">đã hết hạn</b>' : '~' + conLai + ' tháng') + '</td></tr>';
        }).join('') + '</tbody></table></div>' +
        '<div class="lv" style="margin-top:10px"><p style="font-size:12.5px">📌 Khoản 4 Điều 19: trường có bằng Mức 1 từ đủ 02 năm có thể được Sở ' +
        'xem xét đánh giá lên Mức 2 — "có thể", không phải đương nhiên. Khoản 1 Điều 20: bằng có thể bị thu hồi nếu không giữ được ' +
        'điều kiện. Khoản 2 Điều 27: bằng cấp trước 07/7/2026 giữ giá trị đến hết thời hạn ghi trên bằng.</p></div>';

      // Lưu điều kiện a, d
      Array.prototype.slice.call(hop.querySelectorAll('[data-dk]')).forEach(function (o) {
        o.addEventListener('change', function () { luuDK(o.getAttribute('data-dk')); });
      });
      Array.prototype.slice.call(hop.querySelectorAll('[data-dk-gc]')).forEach(function (o) {
        o.addEventListener('blur', function () { luuDK(o.getAttribute('data-dk-gc')); });
      });
      function luuDK(ma) {
        var chon = hop.querySelector('[data-dk="' + ma + '"]').value;
        ghi('cnqg_tu_danh_gia', {
          nam_hoc: namHoc, ma_dk: ma,
          dap_ung: chon === '' ? null : chon === '1',
          ghi_chu: hop.querySelector('[data-dk-gc="' + ma + '"]').value.trim() || null
        }, 'nam_hoc,ma_dk').then(function () { veTabCN(hop); }).catch(batLoi);
      }

      // Sửa bằng công nhận
      Array.prototype.slice.call(hop.querySelectorAll('[data-bang] [data-c]')).forEach(function (o) {
        o.addEventListener('blur', function () {
          var capNhat = {};
          capNhat[o.getAttribute('data-c')] = o.value.trim() || null;
          window.MAY_CHU.from('cnqg_bang').update(capNhat).eq('id', o.closest('tr').getAttribute('data-bang')).select()
            .then(function (r) {
              if (r.error || !r.data.length) batLoi(r.error || new Error('không dòng nào đổi'));
              else window.notify('Đã lưu.');
            });
        });
      });
    });
  }

  // ══════════ ĐĂNG KÝ 3 THẺ ══════════
  window.qtTabPhu = window.qtTabPhu || [];
  window.qtTabPhu.push(
    { ma: 'hd', ten: '🧑‍⚖️ Hội đồng TĐG', ve: veTabHD },
    { ma: 'kh', ten: '📈 KH cải tiến (Biểu 2)', ve: veTabKH },
    { ma: 'cn', ten: '🏅 Chuẩn quốc gia', ve: veTabCN }
  );
})();
