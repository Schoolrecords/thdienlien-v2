// ============================================================
// len-lop.js — CHUYỂN NĂM HỌC: LÊN LỚP
// Đăng ký 1 thẻ vào màn Quản trị qua window.qtTabPhu.
// Cần 3 hàm của sql/35-len-lop.sql.
//
// VÌ SAO CÓ MÀN NÀY: cau_hinh.nam_hoc_tu_dong = 'co', mốc sang năm học mới là
// 30/8. Qua mốc đó mà chưa chuyển năm thì màn Học sinh, màn Phân lớp về điểm
// trường và mọi con số theo điểm trường ở Điều hành đều trống — dữ liệu năm cũ
// vẫn nguyên, nhưng năm mới chưa có dòng nào.
//
// MÀN NÀY KHÔNG TỰ LÀM GÌ CẢ. Máy chỉ đếm hộ và gợi ý tên lớp; ba việc dưới
// đây là quyết định của nhà trường, đều phải bấm nút mới chạy:
//   · xác nhận học sinh hoàn thành chương trình (thẩm quyền Hiệu trưởng —
//     Điều 9 TT27/2020, app chưa có màn nhập kết quả cuối năm);
//   · sửa tên lớp đích (sáp nhập xong ba điểm trường có thể trùng tên lớp);
//   · xếp lớp cho học sinh ở lại lớp — máy KHÔNG xếp thay.
// ============================================================
(function () {
  'use strict';

  function thoat(s) { return window.thoatHTML ? window.thoatHTML(s) : String(s || ''); }
  function batLoi(e) { window.notify('Không chạy được: ' + ((e && e.message) || e)); }

  // Năm học kế tiếp: '2025-2026' → '2026-2027'. Sai định dạng thì trả rỗng
  // để ô nhập trống, admin tự gõ — đoán bừa một năm học là hỏng cả kho dữ liệu.
  function namKeTiep(nam) {
    var m = /^(\d{4})\s*-\s*(\d{4})$/.exec(String(nam || ''));
    if (!m) return '';
    return (parseInt(m[1], 10) + 1) + '-' + (parseInt(m[2], 10) + 1);
  }

  var NAM_NGUON = '', NAM_DICH = '';

  function veTabLL(hop) {
    var may = window.MAY_CHU;
    hop.innerHTML = '<div class="the-thong-bao">Đang tải…</div>';

    // Năm nguồn mặc định = năm CÓ DỮ LIỆU mới nhất, KHÔNG phải năm hệ thống
    // đang chạy. Sau 30/8 hệ thống nhảy sang 2026-2027 mà dữ liệu vẫn nằm ở
    // 2025-2026 — lấy năm hệ thống thì màn này mở ra trống trơn đúng lúc cần
    // nó nhất. (Cùng bài học đã ghi ở hocsinh.js.)
    may.from('hoc_sinh_lop').select('nam_hoc').then(function (r) {
      if (r.error) {
        hop.innerHTML = '<div class="the-thong-bao">Không đọc được dữ liệu học sinh: ' +
          thoat(r.error.message) + '</div>';
        return;
      }
      var dsNam = [];
      (r.data || []).forEach(function (d) {
        if (d.nam_hoc && dsNam.indexOf(d.nam_hoc) < 0) dsNam.push(d.nam_hoc);
      });
      dsNam.sort();
      if (!dsNam.length) {
        hop.innerHTML = '<div class="the-thong-bao">Chưa có dữ liệu học sinh năm nào — ' +
          'chưa có gì để chuyển lên lớp.</div>';
        return;
      }
      NAM_NGUON = NAM_NGUON || dsNam[dsNam.length - 1];
      NAM_DICH = NAM_DICH || namKeTiep(NAM_NGUON);
      veBang(hop, dsNam);
    });
  }

  function veBang(hop, dsNam) {
    var may = window.MAY_CHU;
    may.rpc('xem_len_lop', { p_nam_nguon: NAM_NGUON, p_nam_dich: NAM_DICH })
      .then(function (r) {
        if (r.error) {
          hop.innerHTML = '<div class="the-thong-bao">Không xem trước được: ' +
            thoat(r.error.message) +
            '<br><br>Nếu báo không tìm thấy hàm thì chạy <b>sql/35-len-lop.sql</b> trên Supabase.</div>';
          return;
        }
        var ds = r.data || [];
        var tong = { si: 0, len: 0, oLai: 0, chua: 0, ra: 0, thoi: 0, daCo: 0 };
        ds.forEach(function (d) {
          tong.si += d.si_so; tong.len += d.se_len_lop; tong.oLai += d.o_lai_lop;
          tong.chua += d.chua_co_ket_qua; tong.ra += d.ra_truong;
          tong.thoi += d.khong_con_hoc; tong.daCo += d.da_co_nam_dich;
        });

        hop.innerHTML =
          daiChonNam(dsNam) +
          daiTomTat(tong) +
          daiBang(ds) +
          '<div style="margin-top:14px">' +
          '<button class="nut-lam-len-lop">🎓 Thực hiện lên lớp</button> ' +
          '<span class="ll-nhac" style="font-size:12.5px;color:var(--chu-mo)"></span></div>' +
          daiChanTrang();

        noiSuKien(hop, dsNam, ds, tong);
      });
  }

  function daiChonNam(dsNam) {
    return '<div class="dau-muc" style="text-align:left;margin:14px 0 10px">' +
      '<div class="nhan-nho">Chuyển năm học</div></div>' +
      '<div class="dh-chon-hang" style="flex-wrap:wrap;margin-bottom:12px">' +
      '<span style="font-size:13px;align-self:center">Từ năm học</span>' +
      '<select class="dh-o-nhap ll-nam-nguon" style="width:auto;margin-top:0">' +
      dsNam.map(function (n) {
        return '<option value="' + thoat(n) + '"' + (n === NAM_NGUON ? ' selected' : '') +
          '>' + thoat(n) + '</option>';
      }).join('') + '</select>' +
      '<span style="font-size:13px;align-self:center">sang năm học</span>' +
      '<input class="dh-o-nhap ll-nam-dich" style="width:120px;margin-top:0" value="' +
      thoat(NAM_DICH) + '">' +
      '<button class="nut-doi-nam">Xem lại</button>' +
      '</div>';
  }

  function daiTomTat(t) {
    // Chỗ nào là 0 vẫn hiện — người dùng cần thấy "0 em chưa có kết quả" chứ
    // không phải một ô biến mất không rõ vì sao.
    var o = function (nhan, so, mau) {
      return '<div class="ll-o' + (mau ? ' ' + mau : '') + '"><b>' + so + '</b><span>' + nhan + '</span></div>';
    };
    return '<div class="ll-tom-tat">' +
      o('Đang học năm cũ', t.si) +
      o('Sẽ lên lớp', t.len, 'xanh') +
      o('Ở lại lớp', t.oLai, t.oLai ? 'vang' : '') +
      o('Chưa có kết quả', t.chua, t.chua ? 'do' : '') +
      o('Hoàn thành tiểu học', t.ra) +
      o('Đã có ở năm mới', t.daCo) +
      '</div>' +
      (t.chua
        ? '<div class="hd-kiem do"><b>⚠ ' + t.chua + ' học sinh chưa có kết quả cả năm.</b><br>' +
          'Những em này <b>sẽ không được chuyển</b> sang năm học mới. Chưa nhập kết quả ' +
          'khác hẳn với không được lên lớp, nên máy không tự quyết. Ở cột cuối bảng dưới ' +
          'đây có nút <b>Xác nhận hoàn thành</b> cho từng lớp — bấm là ghi kết quả cho ' +
          'những em còn trống của lớp đó, kết quả giáo viên đã nhập thì không bị đụng vào.</div>'
        : '') +
      (t.oLai
        ? '<div class="hd-kiem vang"><b>' + t.oLai + ' học sinh ở lại lớp.</b> ' +
          'Máy KHÔNG tự xếp các em này vào lớp nào của năm mới — xếp lớp cho học sinh ' +
          'lưu ban là việc của nhà trường. Chuyển năm xong, vào màn Học sinh xếp tay.</div>'
        : '');
  }

  function daiBang(ds) {
    if (!ds.length) return '<div class="the-thong-bao">Năm học này không có lớp nào.</div>';
    return '<div class="cuon-ngang"><table class="bang-quan-tri nho" id="ll-bang"><thead><tr>' +
      '<th>Lớp cũ</th><th>Điểm trường</th><th>Sĩ số</th><th>Lên lớp</th><th>Ở lại</th>' +
      '<th>Chưa có KQ</th><th>Lớp mới</th><th></th></tr></thead><tbody>' +
      ds.map(function (d) {
        var raTruong = d.khoi_nguon === 5;
        return '<tr data-lop="' + thoat(d.lop_nguon) + '">' +
          '<td><b>' + thoat(d.lop_nguon) + '</b></td>' +
          '<td>' + thoat(d.co_so_ma || '—') + '</td>' +
          '<td style="text-align:center">' + d.si_so + '</td>' +
          '<td style="text-align:center">' + (raTruong ? '—' : d.se_len_lop) + '</td>' +
          '<td style="text-align:center">' + (d.o_lai_lop || '') + '</td>' +
          '<td style="text-align:center">' +
          (d.chua_co_ket_qua ? '<b style="color:var(--thieu)">' + d.chua_co_ket_qua + '</b>' : '') + '</td>' +
          '<td>' + (raTruong
            ? '<span style="color:var(--chu-mo)">Hoàn thành chương trình tiểu học</span>'
            : '<input class="ll-lop-moi dh-o-nhap" style="width:90px;margin-top:0" value="' +
              thoat(d.lop_dich_goi_y || '') + '">') + '</td>' +
          '<td>' + (d.chua_co_ket_qua
            ? '<button class="nut-xac-nhan-lop">Xác nhận hoàn thành</button>' : '') + '</td>' +
          '</tr>';
      }).join('') +
      '</tbody></table></div>';
  }

  function daiChanTrang() {
    return '<div class="nhan-nho" style="margin-top:14px;text-transform:none;letter-spacing:0;color:var(--chu-mo)">' +
      'Lên lớp <b>không xoá gì</b> của năm cũ và <b>chạy lại được</b> — em nào đã có ở năm mới ' +
      'thì bỏ qua, không nhân đôi. Lớp mới sinh ra <b>kế thừa điểm trường của lớp cũ</b>, nên không ' +
      'phải phân lại 25 lớp từ đầu. Học sinh lớp 1 tuyển mới và học sinh hai trường nhập về ' +
      'nạp riêng, màn này không đụng tới.</div>';
  }

  function noiSuKien(hop, dsNam, ds, tong) {
    var may = window.MAY_CHU;

    hop.querySelector('.nut-doi-nam').addEventListener('click', function () {
      NAM_NGUON = hop.querySelector('.ll-nam-nguon').value;
      NAM_DICH = hop.querySelector('.ll-nam-dich').value.trim();
      if (!/^\d{4}-\d{4}$/.test(NAM_DICH)) {
        window.notify('Năm học mới phải viết dạng 2026-2027.'); return;
      }
      veTabLL(hop);
    });

    // Xác nhận kết quả cả năm cho một lớp
    Array.prototype.slice.call(hop.querySelectorAll('.nut-xac-nhan-lop')).forEach(function (nut) {
      nut.addEventListener('click', function () {
        var lop = nut.closest('tr').getAttribute('data-lop');
        if (!window.confirm(
          'Xác nhận HOÀN THÀNH chương trình cho những học sinh còn trống kết quả của lớp ' +
          lop + ' — năm học ' + NAM_NGUON + '?\n\n' +
          'Đây là thẩm quyền của Hiệu trưởng (Điều 9 Thông tư 27/2020). Nhật ký ghi lại ' +
          'ai xác nhận, lúc nào.\n\n' +
          'Em nào giáo viên đã ghi kết quả rồi thì KHÔNG bị đụng tới.')) return;
        nut.disabled = true; nut.textContent = '…';
        may.rpc('xac_nhan_ket_qua_lop',
          { p_nam_hoc: NAM_NGUON, p_lop: lop, p_len_lop: true })
          .then(function (r) {
            if (r.error) throw r.error;
            window.notify('Đã xác nhận cho ' + ((r.data && r.data.so_hoc_sinh) || 0) +
              ' học sinh lớp ' + lop + '.');
            veTabLL(hop);
          })
          .catch(function (e) {
            nut.disabled = false; nut.textContent = 'Xác nhận hoàn thành'; batLoi(e);
          });
      });
    });

    // Thực hiện lên lớp
    hop.querySelector('.nut-lam-len-lop').addEventListener('click', function () {
      var nut = this;
      var anhXa = {}, trung = {}, loi = '';
      Array.prototype.slice.call(hop.querySelectorAll('#ll-bang tbody tr')).forEach(function (tr) {
        var o = tr.querySelector('.ll-lop-moi');
        if (!o) return;                       // dòng khối 5 — ra trường
        var ten = o.value.trim();
        if (!ten) return;                     // để trống = cố ý bỏ lớp này
        // Hai lớp cũ cùng trỏ về một lớp mới thì hai lớp bị gộp làm một —
        // có thể là CỐ Ý (dồn lớp sau sáp nhập), nhưng phải hỏi cho chắc.
        if (trung[ten]) loi = ten;
        trung[ten] = true;
        anhXa[tr.getAttribute('data-lop')] = ten;
      });
      if (!Object.keys(anhXa).length) {
        window.notify('Chưa có lớp nào được đặt tên lớp mới.'); return;
      }
      if (loi && !window.confirm(
        'Có từ hai lớp cũ cùng chuyển về lớp "' + loi + '" — các lớp đó sẽ dồn làm một.\n\n' +
        'Nếu là chủ ý dồn lớp sau sáp nhập thì bấm OK. Nếu không, bấm Cancel rồi sửa lại tên.')) return;

      if (!window.confirm(
        'Chuyển học sinh từ năm học ' + NAM_NGUON + ' sang ' + NAM_DICH + '?\n\n' +
        '· ' + tong.len + ' em lên lớp\n' +
        '· ' + tong.ra + ' em hoàn thành chương trình tiểu học (không tạo dòng năm mới)\n' +
        '· ' + tong.oLai + ' em ở lại lớp — nhà trường tự xếp lớp sau\n' +
        '· ' + tong.chua + ' em chưa có kết quả — KHÔNG được chuyển\n\n' +
        'Không xoá gì của năm cũ, và chạy lại được.')) return;

      nut.disabled = true; nut.textContent = 'Đang chuyển…';
      may.rpc('thuc_hien_len_lop',
        { p_nam_nguon: NAM_NGUON, p_nam_dich: NAM_DICH, p_anh_xa: anhXa })
        .then(function (r) {
          if (r.error) throw r.error;
          var k = r.data || {};
          var thieu = (k.lop_thieu_anh_xa || []);
          window.alert('✅ Đã chuyển sang năm học ' + NAM_DICH + '.\n\n' +
            '· Lớp mới tạo: ' + (k.lop_moi || 0) + '\n' +
            '· Học sinh chuyển sang: ' + (k.hoc_sinh_moi || 0) + '\n' +
            (thieu.length ? '· Bỏ qua vì chưa đặt tên lớp mới: ' + thieu.join(', ') + '\n' : '') +
            '\nCòn phải làm tay: xếp lớp cho ' + (k.o_lai_lop || 0) + ' em ở lại lớp, ' +
            'nạp học sinh lớp 1 tuyển mới và học sinh hai trường nhập về, ' +
            'rồi vào thẻ Cơ sở & Sáp nhập phân lớp mới về từng điểm trường.');
          if (window.hocSinhNoiLai) window.hocSinhNoiLai();
          veTabLL(hop);
        })
        .catch(function (e) {
          nut.disabled = false; nut.textContent = '🎓 Thực hiện lên lớp'; batLoi(e);
        });
    });
  }

  // ══════════ ĐĂNG KÝ THẺ ══════════
  window.qtTabPhu = window.qtTabPhu || [];
  window.qtTabPhu.push({ ma: 'll', ten: '🎓 Lên lớp', ve: veTabLL });
})();
