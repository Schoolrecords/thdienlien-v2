// ════════════════════════════════════════════════════════════════════════════
// CỬA SỔ CHỌN KIỂU BÚT XANH — dùng chung cho app Mầm non, Tiểu học, THCS (07/10/2026)
//
// Thầy Chung: "cửa sổ bấm ra" của ô chọn (<select>) nhìn thô, làm giống cửa sổ
// chọn môn của Bút Xanh. Tệp này thay CỬA SỔ BẬT RA và DÁNG Ô của mọi <select>
// một dòng, KHÔNG thay chính ô chọn:
//   - <select> gốc vẫn nằm nguyên chỗ, vẫn giữ giá trị, vẫn bắn 'change' như cũ
//     ⇒ mã nghiệp vụ (onchange, .value =, ẩn/hiện, khoá ô) không phải sửa dòng nào;
//   - bấm chuột / chạm / Enter vào ô thì chặn danh sách của trình duyệt, mở cửa sổ này.
// Tự nhận mọi ô chọn, kể cả ô vẽ lại sau (MutationObserver). Bỏ qua ô `multiple`,
// ô `size` > 1, và ô (hoặc vùng) đánh dấu data-chon-dep="tat".
//
// Đọc chữ của từng dòng để trình bày, không đổi dữ liệu:
//   "— Tất cả (17 Hồ sơ) —"  → bỏ gạch trang trí, "(17 Hồ sơ)" thành nhãn tròn bên phải
//   "📘 Toán"                 → biểu tượng đứng đầu tách thành cột biểu tượng
//   data-icon="🏫" trên <option> → biểu tượng riêng
// Màu lấy từ biến màu của từng app (--chinh, --navy-3…), nên một tệp dùng cho cả ba hệ.
// 🔴 Ba app giữ BA BẢN GIỐNG HỆT NHAU của tệp này — sửa một chỗ thì chép sang hai chỗ kia.
// ════════════════════════════════════════════════════════════════════════════
(function () {
  'use strict';
  if (window.__chonDep) return;
  window.__chonDep = true;

  var CSS = [
    ':root{--cd-nhan:var(--chinh,var(--navy-3,#1f7a55));--cd-chu:var(--chu,var(--ink,#1c2b3a));',
    '--cd-mo:var(--chu-mo,var(--muted,#64748b));--cd-vien:var(--vien,var(--line,#e2e8f0));',
    '--cd-nen-chon:#eef4f3;--cd-nen-chon:color-mix(in srgb,var(--cd-nhan) 11%,#fff);',
    '--cd-nen-luot:#f4f6f8;--cd-nen-luot:color-mix(in srgb,var(--cd-nhan) 5%,#f6f7f9)}',

    // ── Ô chọn khi đóng: bỏ mũi tên hệ thống, thay bằng nút tròn có mũi tên trắng ──
    'select.cd-san.cd-san{-webkit-appearance:none;-moz-appearance:none;appearance:none;cursor:pointer;',
    'padding-right:2.35em;border-radius:12px;',
    'background-image:url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27%3E%3Cpath d=%27M7.5 10l4.5 4.5 4.5-4.5%27 fill=%27none%27 stroke=%27%23fff%27 stroke-width=%272.6%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27/%3E%3C/svg%3E"),',
    'radial-gradient(circle,var(--cd-nhan) 0 66%,transparent 69%);',
    'background-repeat:no-repeat;background-position:right .4em center;background-size:1.5em 1.5em;',
    'transition:border-color .15s,box-shadow .15s}',
    'select.cd-san.cd-san:hover:not(:disabled){border-color:var(--cd-nhan)}',
    'select.cd-san.cd-san:focus-visible,select.cd-san.cd-mo{outline:0;border-color:var(--cd-nhan);',
    'box-shadow:0 0 0 3px var(--cd-nen-chon)}',
    'select.cd-san.cd-mo{background-image:url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27%3E%3Cpath d=%27M7.5 14l4.5-4.5 4.5 4.5%27 fill=%27none%27 stroke=%27%23fff%27 stroke-width=%272.6%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27/%3E%3C/svg%3E"),',
    'radial-gradient(circle,var(--cd-nhan) 0 66%,transparent 69%)}',
    // Ô nằm trên nền tối (đầu trang navy…): nút tròn trắng mờ, không chồng màu nhấn lên nền tối.
    'select.cd-san.cd-toi{background-image:url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27%3E%3Cpath d=%27M7.5 10l4.5 4.5 4.5-4.5%27 fill=%27none%27 stroke=%27%23fff%27 stroke-width=%272.6%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27/%3E%3C/svg%3E"),',
    'radial-gradient(circle,rgba(255,255,255,.24) 0 66%,transparent 69%)}',
    'select.cd-san.cd-san:disabled{cursor:not-allowed;opacity:.6}',
    '@media print{select.cd-san.cd-san{background-image:none;padding-right:.5em}}',

    // ── Cửa sổ ──
    '.cd-hop{position:fixed;z-index:2147483000;background:#fff;color:var(--cd-chu);border-radius:16px;',
    'border:1px solid var(--cd-vien);box-shadow:0 18px 48px rgba(15,30,50,.18),0 3px 10px rgba(15,30,50,.08);',
    'padding:6px;display:flex;flex-direction:column;font-family:inherit;font-size:15px;line-height:1.35;',
    'text-align:left;animation:cd-ra .14s ease-out;overscroll-behavior:contain}',
    '.cd-hop.cd-tren{animation-name:cd-ra-tren}',
    '@keyframes cd-ra{from{opacity:0;transform:translateY(-6px) scale(.985)}to{opacity:1;transform:none}}',
    '@keyframes cd-ra-tren{from{opacity:0;transform:translateY(6px) scale(.985)}to{opacity:1;transform:none}}',
    '.cd-ds{overflow-y:auto;flex:1 1 auto;min-height:0;padding:2px;scrollbar-width:thin}',
    '.cd-ds:focus,.cd-ds:focus-visible{outline:0}',
    '.cd-muc{display:flex;align-items:center;gap:12px;min-height:44px;padding:9px 12px;border-radius:12px;',
    'cursor:pointer;user-select:none;-webkit-user-select:none;font-weight:500}',
    '.cd-muc+.cd-muc{margin-top:2px}',
    '.cd-muc.cd-luot{background:var(--cd-nen-luot)}',
    '.cd-muc.cd-chon{background:var(--cd-nen-chon);color:var(--cd-nhan);font-weight:700}',
    '.cd-muc.cd-khoa{cursor:not-allowed;color:var(--cd-mo);opacity:.6;font-weight:400}',
    '.cd-muc.cd-khoa.cd-luot{background:transparent}',
    '.cd-bt{flex:0 0 24px;text-align:center;font-size:18px;line-height:1}',
    '.cd-chu{flex:1 1 auto;min-width:0;overflow-wrap:anywhere}',
    '.cd-nhan{flex:0 0 auto;font-size:12px;font-weight:600;color:var(--cd-mo);background:#eef1f5;',
    'border-radius:999px;padding:3px 10px;white-space:nowrap}',
    '.cd-muc.cd-chon .cd-nhan{background:#fff;color:var(--cd-nhan)}',
    '.cd-dau{flex:0 0 18px;text-align:right;font-weight:800;color:var(--cd-nhan)}',
    '.cd-nhom{font-size:11.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--cd-mo);',
    'padding:12px 12px 4px}',
    '.cd-rong{padding:16px 12px;color:var(--cd-mo);text-align:center;font-size:14px}',
    '.cd-tim{flex:0 0 auto;margin:2px 2px 6px;padding:10px 12px 10px 36px;border:1.5px solid var(--cd-vien);',
    'border-radius:12px;font:inherit;font-size:14.5px;color:var(--cd-chu);background:#f8fafc ',
    'url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27%3E%3Ccircle cx=%2711%27 cy=%2711%27 r=%276.5%27 fill=%27none%27 stroke=%27%2394a3b8%27 stroke-width=%272.2%27/%3E%3Cpath d=%27M16 16l4 4%27 stroke=%27%2394a3b8%27 stroke-width=%272.2%27 stroke-linecap=%27round%27/%3E%3C/svg%3E") no-repeat 11px center/17px;',
    'outline:0;width:auto}',
    '.cd-tim:focus{border-color:var(--cd-nhan);background-color:#fff}',
    '.cd-dau-hop{display:none}',

    // ── Điện thoại: trượt từ dưới lên ──
    '.cd-man{position:fixed;inset:0;z-index:2147482999;background:rgba(15,25,40,.38);animation:cd-mo-man .18s ease-out}',
    '@keyframes cd-mo-man{from{opacity:0}to{opacity:1}}',
    '.cd-hop.cd-day{left:0!important;right:0;bottom:0;top:auto!important;width:auto!important;max-height:78vh;',
    'border-radius:22px 22px 0 0;border:0;padding:6px 10px calc(12px + env(safe-area-inset-bottom));',
    'animation:cd-len .22s cubic-bezier(.2,.8,.25,1)}',
    '@keyframes cd-len{from{transform:translateY(100%)}to{transform:none}}',
    '.cd-day .cd-dau-hop{display:block;flex:0 0 auto;padding:4px 6px 10px;text-align:center}',
    '.cd-day .cd-dau-hop::before{content:"";display:block;width:40px;height:5px;border-radius:5px;',
    'background:#d5dbe3;margin:2px auto 10px}',
    '.cd-dau-hop b{display:block;font-size:12px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;',
    'color:var(--cd-nhan)}',
    '.cd-day .cd-muc{min-height:50px;font-size:16px}',
    '@media (prefers-reduced-motion:reduce){.cd-hop,.cd-man{animation:none!important}}'
  ].join('');

  // ── Nhận ô ──
  function hopLe(el) {
    return el && el.tagName === 'SELECT' && !el.multiple && !(el.size > 1) &&
      !el.closest('[data-chon-dep="tat"]');
  }
  function laTối(sel) {
    // Nền ô trong suốt hoặc tối ⇒ ô đang nằm trên nền tối của app (đầu trang navy…).
    var m = /rgba?\(([^)]+)\)/.exec(getComputedStyle(sel).backgroundColor || '');
    if (!m) return false;
    var p = m[1].split(',').map(parseFloat);
    if (p.length > 3 && p[3] < 0.5) {
      var c = getComputedStyle(sel).color, mc = /rgba?\(([^)]+)\)/.exec(c);
      if (!mc) return false;
      var q = mc[1].split(',').map(parseFloat);
      return (0.299 * q[0] + 0.587 * q[1] + 0.114 * q[2]) > 160;   // chữ sáng ⇒ nền tối
    }
    return (0.299 * p[0] + 0.587 * p[1] + 0.114 * p[2]) < 110;
  }
  function nhan(sel) {
    if (!hopLe(sel) || sel.classList.contains('cd-san')) return;
    sel.classList.add('cd-san');
    if (laTối(sel)) sel.classList.add('cd-toi');
  }
  function quet(goc) {
    if (!goc || goc.nodeType !== 1) return;
    if (goc.tagName === 'SELECT') { nhan(goc); return; }
    var ds = goc.getElementsByTagName('select');
    for (var i = 0; i < ds.length; i++) nhan(ds[i]);
  }

  // ── Đọc chữ một dòng ──
  var RE_BT = /^((?:\p{Extended_Pictographic}|\p{Regional_Indicator})(?:\uFE0F|\u200D(?:\p{Extended_Pictographic}))*)\s*/u;
  var RE_NHAN = /\s*\(([^()]{1,24})\)\s*$/;
  function boDau(s) {
    return (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
  }
  function docDong(op) {
    var t = (op.label || op.textContent || '').replace(/\s+/g, ' ').trim();
    var bt = op.getAttribute('data-icon') || '', m = RE_BT.exec(t);
    if (m) { if (!bt) bt = m[1]; t = t.slice(m[0].length); }
    var trangTri = /^[—–-]{1,3}\s+/.test(t) && /\s+[—–-]{1,3}$/.test(t);
    if (trangTri) t = t.replace(/^[—–-]+\s+/, '').replace(/\s+[—–-]+$/, '');
    var nh = '', mn = RE_NHAN.exec(t);
    // Chỉ tách nhãn khi trong ngoặc có cả chữ lẫn số ("17 Hồ sơ", "3 lớp") — "(1980)" là năm sinh, giữ trong tên.
    // Dòng bị khoá thì mọi ghi chú cuối trong ngoặc ("đang biên soạn") cũng thành nhãn, như Bút Xanh.
    if (mn && ((/\d/.test(mn[1]) && /[^\d\s.,/-]/.test(mn[1])) || (op.disabled && /[^\d\s.,/-]/.test(mn[1])))) {
      nh = mn[1]; t = t.slice(0, mn.index);
    }
    if (!bt) {
      var k = boDau(t);
      if (/^(truong chinh|co so chinh|diem chinh|diem truong chinh)/.test(k)) bt = '🏫';
      else if (/^phan hieu/.test(k)) bt = '🏡';
      else if (/^diem truong/.test(k)) bt = '📍';
      else if (trangTri && /^tat ca/.test(k)) bt = '📋';
    }
    return { t: t || '\u00a0', bt: bt, nh: nh };
  }

  // ── Cửa sổ ──
  var mo = null;   // { sel, hop, man, ds, tim, muc:[{el,op}], luot }
  var laDienThoai = function () { return window.matchMedia('(max-width: 640px)').matches; };

  function tenO(sel) {
    var t = '';
    if (sel.labels && sel.labels.length) t = sel.labels[0].textContent;
    if (!t) t = sel.getAttribute('aria-label') || sel.title || '';
    if (!t) {
      var tr = sel.previousElementSibling;
      if (tr && /^(LABEL|SPAN|B|STRONG)$/.test(tr.tagName)) t = tr.textContent;
    }
    return (t || 'Chọn').replace(/\s+/g, ' ').replace(/[:：]\s*$/, '').trim();
  }

  function dungDs() {
    var sel = mo.sel, ds = mo.ds, tu = boDau(mo.tim ? mo.tim.value.trim() : '');
    ds.textContent = ''; mo.muc = [];
    var coBt = false, dong = [];
    function them(op, nhom) {
      if (op.hidden || op.style.display === 'none') return;
      var d = docDong(op);
      if (d.bt) coBt = true;
      dong.push({ op: op, d: d, nhom: nhom });
    }
    for (var i = 0; i < sel.children.length; i++) {
      var c = sel.children[i];
      if (c.tagName === 'OPTGROUP') {
        for (var j = 0; j < c.children.length; j++) them(c.children[j], c);
      } else if (c.tagName === 'OPTION') them(c, null);
    }
    var nhomTruoc = null, chon = null;
    dong.forEach(function (x) {
      if (tu && boDau(x.d.t + ' ' + x.d.nh).indexOf(tu) < 0) return;
      if (x.nhom && x.nhom !== nhomTruoc) {
        var h = document.createElement('div');
        h.className = 'cd-nhom'; h.textContent = x.nhom.label; h.setAttribute('role', 'presentation');
        ds.appendChild(h);
      }
      nhomTruoc = x.nhom;
      var khoa = x.op.disabled || (x.nhom && x.nhom.disabled);
      var el = document.createElement('div');
      el.className = 'cd-muc' + (x.op.selected ? ' cd-chon' : '') + (khoa ? ' cd-khoa' : '');
      el.setAttribute('role', 'option');
      el.setAttribute('aria-selected', x.op.selected ? 'true' : 'false');
      if (khoa) el.setAttribute('aria-disabled', 'true');
      el.id = 'cd-m' + mo.muc.length;
      var h2 = '';
      if (coBt) h2 += '<span class="cd-bt" aria-hidden="true"></span>';
      h2 += '<span class="cd-chu"></span>';
      if (x.d.nh) h2 += '<span class="cd-nhan"></span>';
      h2 += '<span class="cd-dau" aria-hidden="true">' + (x.op.selected ? '✓' : '') + '</span>';
      el.innerHTML = h2;
      if (coBt) el.querySelector('.cd-bt').textContent = x.d.bt;
      el.querySelector('.cd-chu').textContent = x.d.t;
      if (x.d.nh) el.querySelector('.cd-nhan').textContent = x.d.nh;
      var vt = mo.muc.length;
      el.addEventListener('click', function () { if (!khoa) chonMuc(vt); });
      el.addEventListener('mousemove', function () { if (mo && mo.luot !== vt) datLuot(vt, false); });
      ds.appendChild(el);
      mo.muc.push({ el: el, op: x.op, khoa: khoa });
      if (x.op.selected) chon = vt;
    });
    if (!mo.muc.length) {
      var r = document.createElement('div');
      r.className = 'cd-rong'; r.textContent = tu ? 'Không có dòng nào khớp' : 'Chưa có lựa chọn';
      ds.appendChild(r);
    }
    mo.luot = -1;
    datLuot(chon != null && !tu ? chon : timMo(0, 1), true);
  }

  function timMo(tu, buoc) {
    for (var i = tu; i >= 0 && i < mo.muc.length; i += buoc) if (!mo.muc[i].khoa) return i;
    return -1;
  }
  function datLuot(vt, cuon) {
    if (mo.luot >= 0 && mo.muc[mo.luot]) mo.muc[mo.luot].el.classList.remove('cd-luot');
    mo.luot = vt;
    if (vt < 0 || !mo.muc[vt]) { mo.ds.removeAttribute('aria-activedescendant'); return; }
    var el = mo.muc[vt].el;
    el.classList.add('cd-luot');
    mo.ds.setAttribute('aria-activedescendant', el.id);
    if (cuon) {
      var ds = mo.ds, tren = el.offsetTop - ds.offsetTop, duoi = tren + el.offsetHeight;
      if (tren < ds.scrollTop) ds.scrollTop = tren - 4;
      else if (duoi > ds.scrollTop + ds.clientHeight) ds.scrollTop = duoi - ds.clientHeight + 4;
    }
  }

  function datViTri() {
    var hop = mo.hop, r = mo.sel.getBoundingClientRect();
    if (hop.classList.contains('cd-day')) return;
    var vw = document.documentElement.clientWidth, vh = window.innerHeight, le = 8;
    // Rộng theo dòng dài nhất (tối đa 520px) nhưng không hẹp hơn chính ô chọn — chữ khỏi xuống dòng vụn.
    hop.style.width = 'max-content';
    var rong = Math.min(Math.max(r.width, 240, Math.min(hop.offsetWidth + 4, 520)), vw - 2 * le);
    var trai = Math.min(Math.max(r.left, le), vw - rong - le);
    hop.style.width = rong + 'px';
    hop.style.left = trai + 'px';
    hop.style.maxHeight = '';
    var cao = Math.min(hop.scrollHeight, 400);
    var duoi = vh - r.bottom - 8 - le, tren = r.top - 8 - le;
    var lenTren = duoi < Math.min(cao, 240) && tren > duoi;
    var chua = Math.max(Math.min(lenTren ? tren : duoi, 400), 120);
    hop.style.maxHeight = chua + 'px';
    hop.classList.toggle('cd-tren', lenTren);
    hop.style.top = (lenTren ? r.top - 8 - Math.min(hop.offsetHeight, chua) : r.bottom + 8) + 'px';
  }

  function moHop(sel) {
    if (mo) dong(false);
    var day = laDienThoai();
    var cha = sel.closest('dialog[open]') || document.body;
    var hop = document.createElement('div');
    hop.className = 'cd-hop' + (day ? ' cd-day' : '');
    var dau = document.createElement('div');
    dau.className = 'cd-dau-hop';
    dau.innerHTML = '<b></b>';
    dau.firstChild.textContent = tenO(sel);
    hop.appendChild(dau);
    var soDong = sel.querySelectorAll('option').length, tim = null;
    if (soDong > 10) {
      tim = document.createElement('input');
      tim.type = 'search'; tim.className = 'cd-tim'; tim.placeholder = 'Gõ để tìm…';
      tim.setAttribute('aria-label', 'Tìm trong danh sách');
      tim.autocomplete = 'off';
      hop.appendChild(tim);
    }
    var ds = document.createElement('div');
    ds.className = 'cd-ds'; ds.tabIndex = -1;
    ds.setAttribute('role', 'listbox');
    ds.setAttribute('aria-label', tenO(sel));
    hop.appendChild(ds);
    var man = null;
    if (day) {
      man = document.createElement('div'); man.className = 'cd-man';
      man.addEventListener('click', function () { dong(true); });
      cha.appendChild(man);
    }
    cha.appendChild(hop);
    mo = { sel: sel, hop: hop, man: man, ds: ds, tim: tim, muc: [], luot: -1, go: '', goLuc: 0 };
    sel.classList.add('cd-mo');
    sel.setAttribute('aria-expanded', 'true');
    if (tim) tim.addEventListener('input', dungDs);
    hop.addEventListener('keydown', phimHop);
    hop.addEventListener('mousedown', function (e) { if (e.target !== tim) e.preventDefault(); });
    dungDs();
    datViTri();
    if (mo.luot >= 0) datLuot(mo.luot, true);
    // Điện thoại: không tự bật bàn phím lên che danh sách — chỉ đưa con trỏ vào ô tìm trên máy tính.
    if (tim && !day) tim.focus({ preventScroll: true }); else ds.focus({ preventScroll: true });
  }

  function dong(traTieuDiem) {
    if (!mo) return;
    var m = mo; mo = null;
    m.sel.classList.remove('cd-mo');
    m.sel.removeAttribute('aria-expanded');
    if (m.hop.parentNode) m.hop.parentNode.removeChild(m.hop);
    if (m.man && m.man.parentNode) m.man.parentNode.removeChild(m.man);
    if (traTieuDiem) try { m.sel.focus({ preventScroll: true }); } catch (e) { }
  }

  function chonMuc(vt) {
    var m = mo.muc[vt]; if (!m || m.khoa) return;
    var sel = mo.sel, cu = sel.selectedIndex;
    dong(true);
    if (m.op.index !== cu) {
      sel.selectedIndex = m.op.index;
      sel.dispatchEvent(new Event('input', { bubbles: true }));
      sel.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  function phimHop(e) {
    if (!mo) return;
    var k = e.key;
    if (k === 'ArrowDown' || k === 'ArrowUp') {
      e.preventDefault();
      var b = k === 'ArrowDown' ? 1 : -1, v = timMo(mo.luot + b, b);
      if (v >= 0) datLuot(v, true);
    } else if (k === 'Home' || k === 'End') {
      if (e.target === mo.tim) return;
      e.preventDefault();
      var v2 = k === 'Home' ? timMo(0, 1) : timMo(mo.muc.length - 1, -1);
      if (v2 >= 0) datLuot(v2, true);
    } else if (k === 'PageDown' || k === 'PageUp') {
      e.preventDefault();
      var b3 = k === 'PageDown' ? 1 : -1, v3 = mo.luot, i = 0;
      while (i < 8) { var n = timMo(v3 + b3, b3); if (n < 0) break; v3 = n; i++; }
      if (v3 >= 0) datLuot(v3, true);
    } else if (k === 'Enter') {
      e.preventDefault();
      if (mo.luot >= 0) chonMuc(mo.luot);
    } else if (k === 'Escape') {
      e.preventDefault(); e.stopPropagation();
      dong(true);
    } else if (k === 'Tab') {
      dong(false);
    } else if (!mo.tim && k.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      // Gõ chữ đầu để nhảy tới dòng (không phân biệt dấu), như danh sách của hệ thống.
      var luc = Date.now();
      mo.go = (luc - mo.goLuc < 700 ? mo.go : '') + boDau(k);
      mo.goLuc = luc;
      for (var j = 0; j < mo.muc.length; j++) {
        var x = (mo.luot + 1 + j) % mo.muc.length;
        if (mo.go.length > 1) x = j;
        if (!mo.muc[x].khoa && boDau(mo.muc[x].el.querySelector('.cd-chu').textContent).indexOf(mo.go) === 0) {
          datLuot(x, true); break;
        }
      }
    }
  }

  // ── Chặn danh sách hệ thống, mở cửa sổ này ──
  function oTu(e) {
    var t = e.target;
    return t && t.tagName === 'SELECT' && t.classList.contains('cd-san') ? t : null;
  }
  document.addEventListener('mousedown', function (e) {
    var sel = oTu(e);
    if (sel) {
      if (e.button !== 0 || sel.disabled) return;
      e.preventDefault();
      if (mo && mo.sel === sel) { dong(true); return; }
      try { sel.focus({ preventScroll: true }); } catch (x) { }
      moHop(sel);
      return;
    }
    if (mo && !mo.hop.contains(e.target)) dong(false);
  }, true);

  // Chạm: chặn ở touchend (chặn ở touchstart thì không cuộn trang được). Ngón tay đã kéo đi thì để yên.
  var cham = null;
  document.addEventListener('touchstart', function (e) {
    var sel = oTu(e);
    cham = sel && e.touches.length === 1 ? { sel: sel, x: e.touches[0].clientX, y: e.touches[0].clientY } : null;
  }, { capture: true, passive: true });
  document.addEventListener('touchend', function (e) {
    var sel = oTu(e);
    if (!sel || !cham || cham.sel !== sel || sel.disabled) { cham = null; return; }
    var t = e.changedTouches[0];
    var keo = Math.abs(t.clientX - cham.x) > 10 || Math.abs(t.clientY - cham.y) > 10;
    cham = null;
    if (keo) return;
    e.preventDefault();
    if (mo && mo.sel === sel) { dong(false); return; }
    moHop(sel);
  }, { capture: true, passive: false });

  document.addEventListener('keydown', function (e) {
    var sel = oTu(e);
    if (!sel || sel.disabled || (mo && mo.sel === sel)) return;
    var k = e.key;
    if (k === 'Enter' || k === ' ' || k === 'F4' || k === 'ArrowDown' || k === 'ArrowUp') {
      e.preventDefault();
      moHop(sel);
    }
  }, true);
  // Phòng hờ: trình duyệt nào vẫn bung danh sách của nó qua 'click' thì cũng không mở hai lần.
  document.addEventListener('click', function (e) { if (oTu(e)) e.preventDefault(); }, true);

  window.addEventListener('resize', function () { if (mo && !mo.hop.classList.contains('cd-day')) dong(false); });
  document.addEventListener('scroll', function (e) {
    if (!mo || mo.hop.classList.contains('cd-day')) return;
    if (e.target === mo.ds || mo.hop.contains(e.target)) return;
    datViTri();
    var r = mo.sel.getBoundingClientRect();
    if (r.bottom < 0 || r.top > window.innerHeight) dong(false);
  }, true);

  // ── Theo dõi ô mới, và ô đang mở bị vẽ lại ──
  function batDau() {
    var st = document.createElement('style');
    st.id = 'chon-dep-css'; st.textContent = CSS;
    (document.head || document.documentElement).appendChild(st);
    quet(document.body);
    new MutationObserver(function (ds) {
      for (var i = 0; i < ds.length; i++) {
        var m = ds[i];
        if (mo && (m.target === mo.sel || mo.sel.contains(m.target))) {
          if (!document.contains(mo.sel)) dong(false); else { dungDs(); datViTri(); }
        }
        for (var j = 0; j < m.addedNodes.length; j++) quet(m.addedNodes[j]);
      }
      if (mo && !document.contains(mo.sel)) dong(false);
    }).observe(document.body, { childList: true, subtree: true });
    // Ô đổi giá trị từ mã (.value = …) thì ô đóng tự hiện đúng; cửa sổ đang mở thì vẽ lại cho khớp.
    document.addEventListener('change', function (e) { if (mo && e.target === mo.sel) dungDs(); }, true);
  }
  if (document.body) batDau(); else document.addEventListener('DOMContentLoaded', batDau);
})();
