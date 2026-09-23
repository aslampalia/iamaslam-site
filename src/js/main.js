/* Aslam — interactions. Vanilla JS, no frameworks. */
(function () {
  "use strict";
  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Footer year ---------- */
  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------- Mobile menu ---------- */
  var openBtn = document.getElementById("menu-open");
  var closeBtn = document.getElementById("menu-close");
  var overlay = document.getElementById("menu-overlay");
  function setMenu(open) {
    if (!overlay) return;
    overlay.classList.toggle("open", open);
    overlay.setAttribute("aria-hidden", open ? "false" : "true");
    if (openBtn) openBtn.setAttribute("aria-expanded", open ? "true" : "false");
    document.body.style.overflow = open ? "hidden" : "";
    if (open && closeBtn) closeBtn.focus();
  }
  if (openBtn) openBtn.addEventListener("click", function () { setMenu(true); });
  if (closeBtn) closeBtn.addEventListener("click", function () { setMenu(false); });
  if (overlay) {
    overlay.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () { setMenu(false); });
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && overlay.classList.contains("open")) {
        setMenu(false);
        if (openBtn) openBtn.focus();
      }
    });
  }

  /* ---------- Topic chips ---------- */
  var note = document.getElementById("topic-note");
  var chips = document.querySelectorAll(".chip");
  var defaultNote = note ? note.innerHTML : "";
  function selectChip(chip) {
    var isActive = chip.classList.contains("active");
    chips.forEach(function (c) { c.classList.remove("active"); });
    if (!note) return;
    if (isActive) {
      note.innerHTML = defaultNote;
      return;
    }
    chip.classList.add("active");
    var title = chip.getAttribute("data-title") || "";
    var desc = chip.getAttribute("data-desc") || "";
    note.classList.add("swap");
    setTimeout(function () {
      note.innerHTML = "<strong>" + title + ":</strong> " + desc;
      note.classList.remove("swap");
    }, reducedMotion ? 0 : 180);
  }
  chips.forEach(function (chip) {
    chip.addEventListener("click", function () { selectChip(chip); });
  });

  /* ---------- Scroll reveals ---------- */
  var revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && revealEls.length && !reducedMotion) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("in");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: "0px 0px -6% 0px" });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("in"); });
  }

  /* ---------- Reading progress (essay pages) ---------- */
  var bar = document.querySelector(".progress span");
  if (bar) {
    var article = document.querySelector(".prose");
    function update() {
      var target = article || document.body;
      var rect = target.getBoundingClientRect();
      var total = rect.height - window.innerHeight + rect.top;
      var done = Math.min(Math.max(-rect.top / Math.max(total, 1), 0), 1);
      bar.style.transform = "scaleX(" + done + ")";
    }
    var ticking = false;
    window.addEventListener("scroll", function () {
      if (!ticking) {
        window.requestAnimationFrame(function () { update(); ticking = false; });
        ticking = true;
      }
    }, { passive: true });
    update();
  }

  /* ---------- Active nav link ---------- */
  var navLinks = document.querySelectorAll(".nav-link");
  var sections = [];
  navLinks.forEach(function (link) {
    var id = link.getAttribute("href");
    if (id && id.charAt(0) === "#") {
      var sec = document.querySelector(id);
      if (sec) sections.push({ link: link, sec: sec });
    }
  });
  if ("IntersectionObserver" in window && sections.length) {
    var nio = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          navLinks.forEach(function (l) { l.classList.remove("active"); });
          var found = sections.find(function (s) { return s.sec === entry.target; });
          if (found) found.link.classList.add("active");
        }
      });
    }, { rootMargin: "-40% 0px -55% 0px" });
    sections.forEach(function (s) { nio.observe(s.sec); });
  }
})();
