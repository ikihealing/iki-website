/*!
 * hop-tac.js — NÚT "HỢP TÁC" TRÊN ĐẦU TRANG CỦA MỌI TRANG ikihealing.com.
 *
 * Vì sao (25/11/2026, CEO): site nhiều thông tin nhưng thiếu lời mời hợp tác; khách muốn làm đại lý
 * không biết bấm vào đâu. Đầu trang là HTML tĩnh chép trong ~900 trang (4 khuôn khác nhau, có khuôn
 * do máy build blog tự sinh), sửa tay từng trang thì lần build sau là mất. Nên đặt MỘT file:
 * nguon.js (đã có trên mọi trang có form) tự nạp file này; trang chưa có nguon.js thì gắn thẳng thẻ.
 * Đổi chữ / đổi đích nút: chỉ sửa ở đây.
 */
(function () {
  if (window.__ikiHopTac) return; window.__ikiHopTac = 1;
  var DICH = "/hop-tac/";
  var lang = (document.documentElement.lang || "vi").slice(0, 2);
  var CHU = { vi: "Hợp tác", en: "Partner", ja: "代理店募集" }[lang] || "Hợp tác";

  function css() {
    if (document.getElementById("iki-hoptac-css")) return;
    var s = document.createElement("style"); s.id = "iki-hoptac-css";
    s.textContent =
      ".iki-hoptac{display:inline-flex;align-items:center;justify-content:center;gap:6px;flex-shrink:0;min-height:40px;padding:8px 16px;" +
      "border:1.5px solid #094938;border-radius:6px;background:#fff;color:#094938!important;font:700 14px/1.2 inherit;" +
      "text-decoration:none!important;white-space:nowrap;transition:background .15s,color .15s}" +
      ".iki-hoptac:hover,.iki-hoptac[aria-current]{background:#094938;color:#fff!important}" +
      ".iki-hoptac svg{width:16px;height:16px;flex-shrink:0}" +
      ".iki-hoptac.toi{border-color:#DAA74B;background:transparent;color:#DAA74B!important}" +
      ".iki-hoptac.toi:hover,.iki-hoptac.toi[aria-current]{background:#DAA74B;color:#094938!important}" +
      ".iki-hoptac:after{display:none!important}.site-header .iki-hoptac{margin-left:16px}" +
      "@media(max-width:960px){.hdr .iki-hoptac{margin-left:auto}.hdr .menubtn{margin-left:0}}" +
      "@media(max-width:1180px){.sitehead .iki-hoptac{order:1;margin-left:auto}.sitehead .menubtn{order:2;margin-left:0!important}}" +
      "@media(max-width:560px){.iki-hoptac{min-height:36px;padding:6px 10px;font-size:13px}.iki-hoptac svg{display:none}}";
    document.head.appendChild(s);
  }

  // Nền đầu trang tối (xanh đậm) thì nút viền vàng; nền sáng thì nút viền xanh.
  function nenToi(el) {
    for (var n = el; n && n !== document.documentElement; n = n.parentElement) {
      var c = getComputedStyle(n).backgroundColor, m = c.match(/\d+(\.\d+)?/g);
      if (!m || (m.length > 3 && +m[3] === 0)) continue;
      return (0.299 * m[0] + 0.587 * m[1] + 0.114 * m[2]) < 140;
    }
    return false;
  }

  function taoNut() {
    var a = document.createElement("a");
    a.className = "iki-hoptac"; a.href = DICH; a.setAttribute("data-nut", "hop-tac");
    a.innerHTML = '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5"/><path d="M19 8v6M16 11h6"/></svg><span></span>';
    a.lastChild.textContent = CHU;
    if (location.pathname.indexOf(DICH) === 0) a.setAttribute("aria-current", "page");
    a.addEventListener("click", function () { try { window.gtag && gtag("event", "nut_hop_tac", { trang: location.pathname }); } catch (e) {} });
    return a;
  }

  function gan() {
    var h = document.querySelector("header");
    if (!h || h.querySelector(".iki-hoptac")) return;
    var a = taoNut(), cho;
    if (h.classList.contains("hdr") && (cho = h.querySelector(".wrap > .cta"))) {
      cho.parentNode.insertBefore(a, cho);                         // trang chủ: ngay trước nút chính
    } else if ((cho = h.querySelector(".tools"))) {
      cho.insertBefore(a, cho.firstChild);                         // /shop
    } else if ((cho = h.querySelector(".headrow > nav"))) {
      cho.parentNode.insertBefore(a, cho.nextSibling);             // khuôn sitehead: sau menu, trước nút ngôn ngữ
    } else if ((cho = h.querySelector(".nav > .nav-links"))) {
      cho.parentNode.insertBefore(a, cho.nextSibling);             // khuôn site-header của blog: sau menu
    } else {
      (h.querySelector("nav") || h).appendChild(a);
    }
    css();
    if (nenToi(a.parentElement)) a.classList.add("toi");
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", gan); else gan();
})();
