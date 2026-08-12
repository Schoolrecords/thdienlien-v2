// ============================================================
// co-so.js — CƠ SỞ (phân hiệu / điểm trường) & SÁP NHẬP TRƯỜNG
// Căn cứ: Nghị quyết 105/NQ-CP (08/4/2026) · Công văn 4054/BGDĐT-GDPT
// (30/6/2026) · Thông tư 57/2026/TT-BGDĐT (07/7/2026).
// Đăng ký 1 thẻ vào màn Quản trị qua window.qtTabPhu.
// Cần bảng/hàm của sql/10-sap-nhap.sql.
//
// Nguyên tắc: máy chỉ TÍNH HỘ và ĐẾM NGƯỢC. Mức công nhận, ngày hết hạn,
// điều kiện "đã có khóa học sinh học trọn cấp" đều do NGƯỜI khai — Điều 27.4
// TT57 cấm lấy dữ liệu định lượng làm căn cứ duy nhất.
// ============================================================
(function () {
  'use strict';

  function thoat(s) { return window.thoatHTML ? window.thoatHTML(s) : String(s || ''); }
  function batLoi(e) { window.notify('Không lưu được: ' + ((e && e.message) || e)); }
  function ngayVN(d) { return d ? new Date(d).toLocaleDateString('vi-VN') : '—'; }

  var TEN_LOAI = { chinh: 'Cơ sở chính', phan_hieu: 'Phân hiệu', diem_truong: 'Điểm trường' };
  var TRANG_THAI_TTT = [
    { ma: 'hien_tai', ten: 'Trường mình' },
    { ma: 'du_kien',  ten: 'Dự kiến sáp nhập' },
    { ma: 'da_gop',   ten: 'Đã gộp vào' }
  ];
  var HINH_THUC = [
    { ma: '',            ten: '— chưa xác định —' },
    { ma: 'doi_ten',     ten: 'Chỉ đổi tên, không đổi cấp học và điều kiện' },
    { ma: 'deu_co_bang', ten: 'Các trường sáp nhập đều đang có bằng còn hiệu lực' },
    { ma: 'khac',        ten: 'Trường hợp khác' }
  ];

  // Ghi có kiểm chứng dòng thật (RLS chặn thì Supabase vẫn trả ok, data rỗng)
  function ghi(bang, ban, onConflict) {
    var lenh = window.MAY_CHU.from(bang);
    var p = onConflict ? lenh.upsert(ban, { onConflict: onConflict }).select() : lenh.insert(ban).select();
    return p.then(function (r) {
      if (r.error) throw r.error;
      if (!r.data || !r.data.length) throw new Error('Máy chủ nhận lệnh nhưng không dòng nào đổi — kiểm tra quyền.');
      return r.data;
    });
  }

  function o(ten, giaTri, kieu, rong) {
    return '<input data-c="' + ten + '" type="' + (kieu || 'text') + '" value="' +
      thoat(giaTri == null ? '' : giaTri) + '"' + (rong ? ' style="min-width:' + rong + 'px"' : '') + '>';
  }
  function chon(ten, giaTri, ds) {
    return '<select data-c="' + ten + '">' + ds.map(function (m) {
      return '<option value="' + m.ma + '"' + (m.ma === (giaTri || '') ? ' selected' : '') +
        '>' + thoat(m.ten) + '</option>';
    }).join('') + '</select>';
  }
  function co(ten, bat) {
    return '<input data-c="' + ten + '" type="checkbox"' + (bat ? ' checked' : '') + '>';
  }
  // Đọc giá trị các ô data-c trong một vùng → object gửi thẳng lên máy chủ
  function gomO(vung) {
    var ban = {};
    Array.prototype.slice.call(vung.querySelectorAll('[data-c]')).forEach(function (e) {
      if (e.type === 'checkbox') ban[e.getAttribute('data-c')] = e.checked;
      else ban[e.getAttribute('data-c')] = e.value.trim() || null;
    });
    return ban;
  }

  // ══════════ 1. BĂNG TRẠNG THÁI CHUẨN QUỐC GIA SAU SÁP NHẬP ══════════
  function daiTrangThai(tt) {
    if (!tt) return '<div class="hd-kiem vang">⚠ Chưa đọc được trạng thái công nhận — kiểm tra đã chạy sql/10-sap-nhap.sql chưa.</div>';

    var canhBao = tt.canh_bao || [];
    var mau = canhBao.length ? 'vang' : (tt.tinh_huong === 'khac' ? 'do' : 'xanh');
    var dong = [];

    if (tt.muc_do) dong.push('<b>Mức độ ' + tt.muc_do + '</b>');
    if (tt.ngay_het_han) dong.push('Hết hạn: <b>' + ngayVN(tt.ngay_het_han) + '</b>');
    if (tt.som_nhat_danh_gia_lai) {
      dong.push('Sớm nhất được đánh giá lại: <b>' + ngayVN(tt.som_nhat_danh_gia_lai) + '</b>');
    }
    if (tt.con_lai_thang != null) {
      dong.push(tt.con_lai_thang > 0
        ? 'Còn <b>' + tt.con_lai_thang + ' tháng</b>'
        : '<b>Đã đến hạn</b>');
    }

    return '<div class="hd-kiem ' + mau + '">' +
      '<b>🏅 ' + thoat(tt.tieu_de || '') + '</b>' +
      (dong.length ? '<br>' + dong.join(' · ') : '') +
      (tt.mo_ta ? '<br><span style="opacity:.85">' + thoat(tt.mo_ta) + '</span>' : '') +
      (canhBao.length
        ? '<br>' + canhBao.map(function (c) { return '⚠ ' + thoat(c); }).join('<br>')
        : '') +
      '</div>';
  }

  // ══════════ 2. HỘP KHAI BÁO SÁP NHẬP ══════════
  function daiKhaiBao(sn) {
    sn = sn || {};
    return '<div class="dau-muc" style="text-align:left;margin:22px 0 10px">' +
      '<div class="nhan-nho">Khai báo sáp nhập</div></div>' +
      '<div class="the-thong-bao" id="cs-khai-bao">' +
      '<label style="display:flex;gap:8px;align-items:center;font-weight:700">' +
      co('co_sap_nhap', sn.co_sap_nhap) + ' Trường đã có quyết định sáp nhập</label>' +
      '<div class="cuon-ngang" style="margin-top:12px"><table class="bang-quan-tri nho"><tbody>' +
      '<tr><th style="width:200px">Tên trường mới</th><td>' + o('ten_truong_moi', sn.ten_truong_moi) + '</td></tr>' +
      '<tr><th>Số quyết định</th><td>' + o('so_quyet_dinh', sn.so_quyet_dinh) + '</td></tr>' +
      '<tr><th>Ngày quyết định</th><td>' + o('ngay_quyet_dinh', sn.ngay_quyet_dinh, 'date') + '</td></tr>' +
      '<tr><th>Ngày hoạt động</th><td>' + o('ngay_hoat_dong', sn.ngay_hoat_dong, 'date') + '</td></tr>' +
      '<tr><th>Cơ quan ban hành</th><td>' + o('co_quan_ban_hanh', sn.co_quan_ban_hanh) + '</td></tr>' +
      '<tr><th>Hình thức</th><td>' + chon('hinh_thuc', sn.hinh_thuc, HINH_THUC) + '</td></tr>' +
      '<tr><th>Đã có khóa học sinh học trọn cấp tại trường mới</th><td>' +
      co('da_co_khoa_ra_truong', sn.da_co_khoa_ra_truong) + '</td></tr>' +
      '</tbody></table></div>' +
      '<div style="margin-top:12px"><button class="nut-luu-sn">Lưu khai báo</button></div>' +
      '<div class="nhan-nho" style="margin-top:10px;text-transform:none;letter-spacing:0;color:var(--chu-mo)">' +
      'Hình thức quyết định bằng công nhận chuẩn quốc gia của trường mới. Chưa rõ thì để trống — ' +
      'máy sẽ không tính thời hạn thay vì tính sai.</div>' +
      '</div>';
  }

  // ══════════ 3. BẢNG CƠ SỞ ══════════
  function daiCoSo(dsCoSo, thongKe, dsTruong, dsGV) {
    var tk = {};
    (thongKe || []).forEach(function (t) { tk[t.ma] = t; });
    // Cột phu_trach_email do sql/20 thêm — CSDL chưa chạy sql/20 thì ẨN cột
    // này đi, kẻo lệnh Lưu gửi cột không tồn tại làm hỏng cả việc sửa tên/địa chỉ
    var coCotPT = !(dsCoSo || []).length || ('phu_trach_email' in dsCoSo[0]);
    var chonTruong = [{ ma: '', ten: '—' }].concat((dsTruong || []).map(function (t) {
      return { ma: t.ma, ten: t.ten };
    }));
    // Người phụ trách chọn từ danh sách nhân sự — gán bằng gõ tay dễ sai một
    // ký tự email là người đó không báo cáo đầu buổi được
    var chonPhuTrach = [{ ma: '', ten: '— chưa gán —' }].concat((dsGV || []).map(function (g) {
      return { ma: g.email, ten: (g.ho_ten || g.email) + (g.chuc_vu ? ' · ' + g.chuc_vu : '') };
    }));

    return '<div class="dau-muc" style="text-align:left;margin:22px 0 10px">' +
      '<div class="nhan-nho">Cơ sở · phân hiệu · điểm trường</div></div>' +
      '<div class="nhan-nho" style="text-transform:none;letter-spacing:0;color:var(--chu-mo);margin-bottom:8px">' +
      'Số lớp / học sinh đếm theo năm học ' + thoat(window.CAU_HINH.NAM_HOC || '') +
      '. Cột CBGV đếm từ danh sách mời (bỏ tài khoản kỹ thuật) — đây là đội ngũ thật, ' +
      'khác với số người đã kích hoạt tài khoản ghi bên dưới. ' +
      '<b>Người phụ trách</b> là người báo cáo đầu buổi + An toàn xanh của điểm trường đó ' +
      'trên màn Điều hành (Ban giám hiệu luôn báo được mọi điểm).</div>' +
      '<div class="cuon-ngang"><table class="bang-quan-tri nho"><thead><tr>' +
      '<th>Mã</th><th>Tên cơ sở</th><th>Loại</th><th>Địa chỉ</th><th>Trường tiền thân</th>' +
      (coCotPT ? '<th>Người phụ trách</th>' : '') +
      '<th>Lớp</th><th>HS</th><th>CBGV</th><th>Đang dùng</th><th></th></tr></thead><tbody>' +
      (dsCoSo || []).map(function (c) {
        var t = tk[c.ma] || {};
        // Email đã gán mà không còn trong danh sách nhân sự: vẫn phải hiện ra,
        // nếu không thì mở bảng rồi bấm Lưu là lặng lẽ mất gán
        var dsPT = chonPhuTrach;
        if (c.phu_trach_email && !chonPhuTrach.filter(function (m) { return m.ma === c.phu_trach_email; }).length) {
          dsPT = chonPhuTrach.concat([{ ma: c.phu_trach_email, ten: c.phu_trach_email + ' (ngoài danh sách)' }]);
        }
        return '<tr data-ma="' + thoat(c.ma) + '">' +
          '<td><b>' + thoat(c.ma) + '</b></td>' +
          '<td>' + o('ten', c.ten, 'text', 170) + '</td>' +
          '<td>' + chon('loai', c.loai, [
            { ma: 'chinh', ten: TEN_LOAI.chinh },
            { ma: 'phan_hieu', ten: TEN_LOAI.phan_hieu },
            { ma: 'diem_truong', ten: TEN_LOAI.diem_truong }]) + '</td>' +
          '<td>' + o('dia_chi', c.dia_chi, 'text', 160) + '</td>' +
          '<td>' + chon('truong_cu_ma', c.truong_cu_ma, chonTruong) + '</td>' +
          (coCotPT ? '<td>' + chon('phu_trach_email', c.phu_trach_email, dsPT) + '</td>' : '') +
          '<td style="text-align:center">' + (t.so_lop || 0) + '</td>' +
          '<td style="text-align:center">' + (t.so_hoc_sinh || 0) + '</td>' +
          '<td style="text-align:center">' + (t.so_cbgv || 0) +
          '<br><small style="opacity:.7">' + (t.so_da_kich_hoat || 0) + ' đã vào app</small></td>' +
          '<td style="text-align:center">' + co('hoat_dong', c.hoat_dong) + '</td>' +
          '<td><button class="nut-luu-cs">Lưu</button></td></tr>';
      }).join('') +
      '</tbody></table></div>' +
      '<div style="margin-top:10px"><button class="nut-them-cs">+ Thêm cơ sở</button></div>';
  }

  // ══════════ 4. BẢNG TRƯỜNG TIỀN THÂN ══════════
  function daiTruong(dsTruong) {
    return '<div class="dau-muc" style="text-align:left;margin:22px 0 10px">' +
      '<div class="nhan-nho">Trường tiền thân &amp; bằng chuẩn quốc gia trước sáp nhập</div></div>' +
      '<div class="nhan-nho" style="text-transform:none;letter-spacing:0;color:var(--chu-mo);margin-bottom:8px">' +
      'Đây là dữ liệu quyết định mức công nhận của trường mới, không phải thông tin lưu niệm — ' +
      'nhập đủ mức độ và ngày hết hạn của TỪNG trường thì máy mới tính được thời hạn. ' +
      'Trường ở trạng thái <b>Dự kiến sáp nhập</b> chưa có quyết định nên KHÔNG bị tính vào mức ' +
      'hiện tại của trường mình — khai sẵn chỉ để gom trước số liệu 3 năm của họ.</div>' +
      '<div class="cuon-ngang"><table class="bang-quan-tri nho"><thead><tr>' +
      '<th>Mã</th><th>Tên trường</th><th>Trạng thái</th><th>Mã CSDL ngành</th><th>Mức CQG</th>' +
      '<th>Số QĐ</th><th>Ngày ký</th><th>Hết hạn</th><th></th></tr></thead><tbody>' +
      (dsTruong || []).map(function (t) {
        return '<tr data-ma="' + thoat(t.ma) + '">' +
          '<td><b>' + thoat(t.ma) + '</b></td>' +
          '<td>' + o('ten', t.ten, 'text', 190) + '</td>' +
          '<td>' + chon('trang_thai', t.trang_thai, TRANG_THAI_TTT) + '</td>' +
          '<td>' + o('ma_truong_moet', t.ma_truong_moet, 'text', 100) + '</td>' +
          '<td>' + chon('cnqg_muc_do', t.cnqg_muc_do == null ? '' : String(t.cnqg_muc_do), [
            { ma: '', ten: 'Chưa đạt' }, { ma: '1', ten: 'Mức độ 1' }, { ma: '2', ten: 'Mức độ 2' }]) + '</td>' +
          '<td>' + o('cnqg_so_qd', t.cnqg_so_qd, 'text', 110) + '</td>' +
          '<td>' + o('cnqg_ngay_ky', t.cnqg_ngay_ky, 'date') + '</td>' +
          '<td>' + o('cnqg_ngay_het_han', t.cnqg_ngay_het_han, 'date') + '</td>' +
          '<td><button class="nut-luu-tt">Lưu</button></td></tr>';
      }).join('') +
      '</tbody></table></div>' +
      '<div style="margin-top:10px"><button class="nut-them-tt">+ Thêm trường tiền thân</button></div>';
  }

  // Sinh mã kế tiếp dạng TIỀN TỐ + 2 chữ số
  function maKeTiep(ds, tienTo) {
    var lon = 0;
    (ds || []).forEach(function (d) {
      var m = /(\d+)$/.exec(d.ma || '');
      if (m) lon = Math.max(lon, parseInt(m[1], 10));
    });
    return tienTo + ('0' + (lon + 1)).slice(-2);
  }

  // ══════════ VẼ THẺ ══════════
  function veTabCS(hop) {
    var may = window.MAY_CHU;
    hop.innerHTML = '<div class="the-thong-bao">Đang tải…</div>';

    Promise.all([
      may.rpc('trang_thai_cnqg_sap_nhap'),
      may.from('sap_nhap').select('*').eq('id', 1).maybeSingle(),
      may.from('co_so').select('*').order('so_tt'),
      may.from('v_co_so_thong_ke').select('*'),
      may.from('truong_tien_than').select('*').order('ma'),
      may.from('moi_tai_khoan').select('email, ho_ten, chuc_vu')
        .eq('la_ky_thuat', false).order('ho_ten')
    ]).then(function (kq) {
      // Danh sách nhân sự (kq[5]) chỉ phục vụ ô chọn người phụ trách — lỗi
      // thì thẻ vẫn mở bình thường, đừng để nó kéo sập cả băng CNQG
      var loi = kq.slice(0, 5).filter(function (r) { return r.error; })[0];
      if (loi) {
        hop.innerHTML = '<div class="the-thong-bao">Không đọc được dữ liệu cơ sở: ' +
          thoat(loi.error.message) + '<br><br>Nếu báo thiếu bảng thì chạy <b>sql/10-sap-nhap.sql</b> trên Supabase.</div>';
        return;
      }
      var tt = kq[0].data, sn = kq[1].data, dsCoSo = kq[2].data || [],
          thongKe = kq[3].data || [], dsTruong = kq[4].data || [],
          dsGV = kq[5].error ? [] : (kq[5].data || []);

      hop.innerHTML = daiTrangThai(tt) + daiKhaiBao(sn) +
        daiCoSo(dsCoSo, thongKe, dsTruong, dsGV) + daiTruong(dsTruong);

      // Lưu khai báo sáp nhập
      hop.querySelector('.nut-luu-sn').addEventListener('click', function () {
        var nut = this;
        var ban = gomO(document.getElementById('cs-khai-bao'));
        ban.id = 1;
        nut.textContent = '…';
        ghi('sap_nhap', ban, 'id')
          .then(function () { window.notify('Đã lưu khai báo sáp nhập.'); veTabCS(hop); })
          .catch(function (e) { nut.textContent = 'Lưu khai báo'; batLoi(e); });
      });

      // Lưu từng dòng cơ sở
      Array.prototype.slice.call(hop.querySelectorAll('.nut-luu-cs')).forEach(function (nut) {
        nut.addEventListener('click', function () {
          var dong = nut.closest('tr');
          var ban = gomO(dong);
          nut.textContent = '…';
          may.from('co_so').update(ban).eq('ma', dong.getAttribute('data-ma')).select()
            .then(function (r) {
              if (r.error || !r.data.length) throw (r.error || new Error('không dòng nào đổi'));
              nut.textContent = 'Đã lưu ✓';
              setTimeout(function () { nut.textContent = 'Lưu'; }, 2500);
            })
            .catch(function (e) { nut.textContent = 'Lưu'; batLoi(e); });
        });
      });

      // Lưu từng dòng trường tiền thân
      Array.prototype.slice.call(hop.querySelectorAll('.nut-luu-tt')).forEach(function (nut) {
        nut.addEventListener('click', function () {
          var dong = nut.closest('tr');
          var ban = gomO(dong);
          ban.cnqg_muc_do = ban.cnqg_muc_do ? parseInt(ban.cnqg_muc_do, 10) : null;
          nut.textContent = '…';
          may.from('truong_tien_than').update(ban).eq('ma', dong.getAttribute('data-ma')).select()
            .then(function (r) {
              if (r.error || !r.data.length) throw (r.error || new Error('không dòng nào đổi'));
              nut.textContent = 'Đã lưu ✓';
              // Mức/hết hạn đổi thì thời hạn công nhận đổi theo — vẽ lại băng trên
              setTimeout(function () { veTabCS(hop); }, 700);
            })
            .catch(function (e) { nut.textContent = 'Lưu'; batLoi(e); });
        });
      });

      // Thêm cơ sở
      hop.querySelector('.nut-them-cs').addEventListener('click', function () {
        var ten = window.prompt('Tên cơ sở mới (ví dụ: Phân hiệu Diễn Xuân):', '');
        if (!ten || !ten.trim()) return;
        ghi('co_so', {
          ma: maKeTiep(dsCoSo, 'CS'), ten: ten.trim(), loai: 'phan_hieu',
          so_tt: dsCoSo.length + 1
        }).then(function () { veTabCS(hop); }).catch(batLoi);
      });

      // Thêm trường tiền thân
      hop.querySelector('.nut-them-tt').addEventListener('click', function () {
        var ten = window.prompt('Tên trường tiền thân (ghi đầy đủ theo quyết định):', '');
        if (!ten || !ten.trim()) return;
        ghi('truong_tien_than', { ma: maKeTiep(dsTruong, 'TTT'), ten: ten.trim() })
          .then(function () { veTabCS(hop); }).catch(batLoi);
      });
    });
  }

  // ══════════ ĐĂNG KÝ THẺ ══════════
  window.qtTabPhu = window.qtTabPhu || [];
  window.qtTabPhu.push({ ma: 'cs', ten: '🏫 Cơ sở & Sáp nhập', ve: veTabCS });
})();
