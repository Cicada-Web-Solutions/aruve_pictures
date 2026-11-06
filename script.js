(function () {
  "use strict";

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const hasGSAP = typeof window.gsap !== "undefined" && typeof window.ScrollTrigger !== "undefined";
  let lenis = null;

  document.documentElement.classList.add("js");
  document.getElementById("year").textContent = new Date().getFullYear();

  function splitWords(element) {
    if (!element || element.dataset.split === "true") return [];

    const textNodes = [];
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        return node.nodeValue.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    });

    while (walker.nextNode()) textNodes.push(walker.currentNode);

    textNodes.forEach((node) => {
      const fragment = document.createDocumentFragment();
      const parts = node.nodeValue.split(/(\s+)/);

      parts.forEach((part) => {
        if (!part) return;
        if (/^\s+$/.test(part)) {
          fragment.appendChild(document.createTextNode(part));
          return;
        }

        const outer = document.createElement("span");
        const inner = document.createElement("span");
        outer.className = "reveal-word";
        inner.textContent = part;
        outer.appendChild(inner);
        fragment.appendChild(outer);
      });

      node.parentNode.replaceChild(fragment, node);
    });

    element.dataset.split = "true";
    return element.querySelectorAll(".reveal-word > span");
  }

  const revealHeadings = [...document.querySelectorAll("[data-reveal]")];
  revealHeadings.forEach(splitWords);

  function splitFounderText(element) {
    if (!element || element.dataset.founderSplit === "true") return [];
    const words = element.textContent.trim().split(/\s+/);
    element.textContent = "";

    words.forEach((word, index) => {
      const span = document.createElement("span");
      span.className = "founder-word";
      span.textContent = word;
      element.appendChild(span);
      if (index < words.length - 1) element.appendChild(document.createTextNode(" "));
    });

    element.dataset.founderSplit = "true";
    return [...element.querySelectorAll(".founder-word")];
  }

  const founderRevealBlocks = [...document.querySelectorAll("[data-founder-reveal]")];
  const founderWords = founderRevealBlocks.flatMap(splitFounderText);

  document.querySelectorAll("[data-zoom]").forEach((image) => {
    const zoom = Number(image.dataset.zoom) || 1;
    image.style.transform = `scale(${zoom})`;
  });

  function initSmoothScroll() {
    if (reducedMotion || typeof window.Lenis === "undefined") return;

    lenis = new window.Lenis({
      duration: 1.18,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      wheelMultiplier: 0.9,
      touchMultiplier: 1.05
    });

    if (hasGSAP) {
      lenis.on("scroll", window.ScrollTrigger.update);
      window.gsap.ticker.add((time) => lenis.raf(time * 1000));
      window.gsap.ticker.lagSmoothing(0);
    } else {
      const raf = (time) => {
        lenis.raf(time);
        requestAnimationFrame(raf);
      };
      requestAnimationFrame(raf);
    }
  }

  function initNavigation() {
    const menuToggle = document.getElementById("menuToggle");
    const nav = document.getElementById("mainNav");

    menuToggle.addEventListener("click", () => {
      const open = menuToggle.getAttribute("aria-expanded") === "true";
      menuToggle.setAttribute("aria-expanded", String(!open));
      menuToggle.classList.toggle("is-active", !open);
      nav.classList.toggle("is-open", !open);
      document.body.classList.toggle("menu-open", !open);
      if (lenis) open ? lenis.start() : lenis.stop();
    });

    document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
      anchor.addEventListener("click", (event) => {
        const target = document.querySelector(anchor.getAttribute("href"));
        if (!target) return;
        event.preventDefault();

        if (nav.classList.contains("is-open")) {
          menuToggle.setAttribute("aria-expanded", "false");
          menuToggle.classList.remove("is-active");
          nav.classList.remove("is-open");
          document.body.classList.remove("menu-open");
          if (lenis) lenis.start();
        }

        if (lenis) lenis.scrollTo(target, { offset: 0, duration: 1.45 });
        else target.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth" });
      });
    });
  }

  function initPreloader() {
    const loader = document.getElementById("preloader");
    const count = document.getElementById("loaderCount");

    if (!hasGSAP || reducedMotion) {
      setTimeout(() => {
        count.textContent = "100";
        loader.style.display = "none";
      }, reducedMotion ? 120 : 700);
      return;
    }

    const gsap = window.gsap;
    const counter = { value: 0 };
    const heroWords = document.querySelectorAll(".hero [data-reveal] .reveal-word > span");
    const heroItems = [".hero__eyebrow", ".hero__copy", ".hero__actions", ".hero__frame-meta", ".hero__scroll"];

    gsap.set(heroWords, { yPercent: 34, autoAlpha: 0, filter: "blur(8px)" });
    gsap.set(heroItems, { autoAlpha: 0, y: 16 });
    gsap.set(".hero__image-wrap", { clipPath: "inset(0 0 100% 0)" });

    const timeline = gsap.timeline({ defaults: { ease: "power3.out" } });
    timeline
      .to(".preloader__logo", { autoAlpha: 1, scale: 1, duration: 0.7 })
      .to(".preloader__line span", { scaleX: 1, duration: 1.15, ease: "power2.inOut" }, 0.25)
      .to(counter, {
        value: 100,
        duration: 1.15,
        ease: "power2.inOut",
        onUpdate: () => { count.textContent = String(Math.round(counter.value)).padStart(2, "0"); }
      }, 0.25)
      .to(".preloader__center", { autoAlpha: 0, y: -12, duration: 0.35 }, 1.35)
      .to(loader, { clipPath: "inset(0 0 100% 0)", duration: 0.9, ease: "power4.inOut" }, 1.45)
      .set(loader, { display: "none" })
      .to(".hero__image-wrap", { clipPath: "inset(0 0 0% 0)", duration: 1.25, ease: "power4.inOut" }, 1.7)
      .to(heroWords, { yPercent: 0, autoAlpha: 1, filter: "blur(0px)", stagger: 0.075, duration: 1, ease: "power4.out" }, 1.92)
      .to(heroItems, { autoAlpha: 1, y: 0, stagger: 0.07, duration: 0.75 }, 2.15);
  }

  function initGlobalScroll() {
    const header = document.getElementById("siteHeader");
    const hero = document.querySelector(".hero");
    const progress = document.querySelector(".scroll-progress span");
    let lastY = window.scrollY;

    if (window.location.hash && window.location.hash !== "#home") {
      header.classList.add("is-past-hero");
    }

    if ("IntersectionObserver" in window && hero) {
      const heroObserver = new IntersectionObserver(([entry]) => {
        const deepAnchor = window.location.hash && window.location.hash !== "#home";
        header.classList.toggle("is-past-hero", Boolean(deepAnchor) || !entry.isIntersecting);
      }, { threshold: 0.08 });
      heroObserver.observe(hero);
    }

    const update = () => {
      const currentY = window.scrollY;
      const maximum = document.documentElement.scrollHeight - window.innerHeight;
      const ratio = maximum > 0 ? currentY / maximum : 0;
      progress.style.transform = `scaleY(${ratio})`;

      if (currentY > 160 && currentY > lastY + 4) header.classList.add("is-hidden");
      if (currentY < lastY - 4 || currentY < 80) header.classList.remove("is-hidden");
      lastY = currentY;
    };

    window.addEventListener("scroll", update, { passive: true });
    update();
  }

  function initPointerEffects() {
    if (window.matchMedia("(pointer: coarse)").matches) return;

    const cursor = document.querySelector(".cursor");
    const cursorText = cursor.querySelector("span");
    let mouseX = -100;
    let mouseY = -100;
    let currentX = -100;
    let currentY = -100;

    window.addEventListener("pointermove", (event) => {
      mouseX = event.clientX;
      mouseY = event.clientY;
    });

    const renderCursor = () => {
      currentX += (mouseX - currentX) * 0.18;
      currentY += (mouseY - currentY) * 0.18;
      cursor.style.left = `${currentX}px`;
      cursor.style.top = `${currentY}px`;
      requestAnimationFrame(renderCursor);
    };
    requestAnimationFrame(renderCursor);

    document.querySelectorAll(".interactive-image").forEach((item) => {
      item.addEventListener("mouseenter", () => {
        cursorText.textContent = "VIEW";
        cursor.classList.add("is-visible");
      });
      item.addEventListener("mouseleave", () => cursor.classList.remove("is-visible"));
    });

    document.querySelectorAll(".button, .text-link, .story-row").forEach((item) => {
      item.addEventListener("mouseenter", () => {
        cursorText.textContent = "OPEN";
        cursor.classList.add("is-visible");
      });
      item.addEventListener("mouseleave", () => cursor.classList.remove("is-visible"));
    });

    document.querySelectorAll(".magnetic").forEach((item) => {
      item.addEventListener("pointermove", (event) => {
        const rect = item.getBoundingClientRect();
        const x = event.clientX - rect.left - rect.width / 2;
        const y = event.clientY - rect.top - rect.height / 2;
        item.style.transform = `translate(${x * 0.14}px, ${y * 0.14}px)`;
      });
      item.addEventListener("pointerleave", () => {
        item.style.transform = "translate(0, 0)";
      });
    });

    const hero = document.querySelector(".hero");
    const heroImage = document.querySelector(".hero__image-wrap");
    hero.addEventListener("pointermove", (event) => {
      if (reducedMotion) return;
      const x = (event.clientX / window.innerWidth - 0.5) * 12;
      const y = (event.clientY / window.innerHeight - 0.5) * 8;
      heroImage.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    });
    hero.addEventListener("pointerleave", () => { heroImage.style.transform = "translate3d(0, 0, 0)"; });
  }

  function initStoryCatalogue() {
    const rows = [...document.querySelectorAll(".story-row")];
    const images = [...document.querySelectorAll(".story-preview img")];

    const activate = (index) => {
      rows.forEach((row, rowIndex) => row.classList.toggle("is-active", rowIndex === index));
      images.forEach((image, imageIndex) => image.classList.toggle("is-active", imageIndex === index));
    };

    rows.forEach((row, index) => {
      row.addEventListener("mouseenter", () => activate(index));
      row.addEventListener("focusin", () => activate(index));
      row.addEventListener("click", () => activate(index));
    });

    if (window.matchMedia("(max-width: 760px)").matches && "IntersectionObserver" in window) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) activate(Number(entry.target.dataset.index));
        });
      }, { rootMargin: "-42% 0px -42% 0px", threshold: 0 });
      rows.forEach((row) => observer.observe(row));
    }
  }

  function initAnimations() {
    if (!hasGSAP || reducedMotion) return;

    const gsap = window.gsap;
    const ScrollTrigger = window.ScrollTrigger;
    gsap.registerPlugin(ScrollTrigger);

    revealHeadings.filter((heading) => !heading.closest(".hero")).forEach((heading) => {
      const words = heading.querySelectorAll(".reveal-word > span");
      gsap.from(words, {
        yPercent: 30,
        autoAlpha: 0,
        filter: "blur(8px)",
        rotate: 1.2,
        duration: 1.05,
        stagger: 0.055,
        ease: "power4.out",
        scrollTrigger: { trigger: heading, start: "top 84%", once: true }
      });
    });

    gsap.to(".hero__image", {
      yPercent: 8,
      ease: "none",
      scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true }
    });

    gsap.to(".hero__content", {
      yPercent: 16,
      autoAlpha: 0.15,
      ease: "none",
      scrollTrigger: { trigger: ".hero", start: "35% top", end: "bottom top", scrub: true }
    });

    document.querySelectorAll(".notice__image").forEach((image, index) => {
      gsap.from(image, {
        clipPath: "inset(100% 0 0 0)",
        y: 45,
        duration: 1.25,
        delay: index * 0.08,
        ease: "power4.inOut",
        scrollTrigger: { trigger: image, start: "top 86%", once: true }
      });
      gsap.to(image, {
        yPercent: index % 2 ? -10 : 9,
        ease: "none",
        scrollTrigger: { trigger: ".notice__stage", start: "top bottom", end: "bottom top", scrub: 1.2 }
      });
    });

    document.querySelectorAll(".notice-word").forEach((word, index) => {
      gsap.from(word, {
        autoAlpha: 0,
        x: index % 2 ? 70 : -70,
        duration: 1.05,
        ease: "power3.out",
        scrollTrigger: { trigger: word, start: "top 86%", once: true }
      });
    });

    document.querySelectorAll(".memory").forEach((memory) => {
      const media = memory.querySelector(".memory__media");
      const image = memory.querySelector("img");
      const zoom = Number(image.dataset.zoom) || 1;
      gsap.from(media, {
        clipPath: "inset(0 0 100% 0)",
        duration: 1.35,
        ease: "power4.inOut",
        scrollTrigger: { trigger: memory, start: "top 88%", once: true }
      });
      gsap.fromTo(image, {
        scale: zoom + 0.13,
      }, {
        scale: zoom,
        duration: 1.7,
        ease: "power3.out",
        scrollTrigger: { trigger: memory, start: "top 88%", once: true }
      });
      gsap.to(image, {
        yPercent: -7,
        ease: "none",
        scrollTrigger: { trigger: memory, start: "top bottom", end: "bottom top", scrub: 1 }
      });
    });

    const founderSticky = document.querySelector(".founder-sticky");
    const founderProgress = document.querySelector(".founder__progress span");
    const founderPercent = document.querySelector(".founder__progress b");
    const founderManifestoWords = document.querySelectorAll(".founder__manifesto .founder-word");
    const founderClosingWords = document.querySelectorAll(".founder__closing .founder-word");

    const founderTimeline = gsap.timeline({
      defaults: { ease: "power3.out" },
      scrollTrigger: {
        trigger: ".founder-story",
        start: "top top",
        end: "bottom bottom",
        scrub: 0.85,
        invalidateOnRefresh: true,
        onUpdate(self) {
          const progress = self.progress;
          const percent = Math.round(progress * 100);
          founderProgress.style.transform = `scaleX(${progress})`;
          founderPercent.textContent = String(percent).padStart(2, "0");
          founderSticky.style.setProperty("--light-x", `${73 - progress * 18}%`);
          founderSticky.style.setProperty("--light-y", `${57 - progress * 18}%`);
        }
      }
    });

    founderTimeline
      .fromTo(".founder__image-mask", { clipPath: "inset(9% 0 9% 0)" }, { clipPath: "inset(0 0 0% 0)", duration: 1.35, ease: "power4.inOut" }, 0)
      .fromTo(".founder__image-mask img", { scale: 1.1 }, { scale: 1.02, filter: "saturate(.88) sepia(.03) brightness(.9)", duration: 5.4, ease: "none" }, 0)
      .fromTo(".founder__copy .eyebrow", { autoAlpha: 0.78, y: 10 }, { autoAlpha: 1, y: 0, duration: 0.6 }, 0.1)
      .fromTo(".founder__title", { autoAlpha: 0.84, y: 22 }, { autoAlpha: 1, y: 0, duration: 0.85 }, 0.18)
      .fromTo(".founder__lead", { autoAlpha: 0.72, y: 10 }, { autoAlpha: 1, y: 0, duration: 0.6 }, 0.72)
      .to(founderManifestoWords, { color: "#f2eee6", duration: 0.22, stagger: 0.055, ease: "none" }, 1.2)
      .to(founderClosingWords, { color: "#d4cec3", duration: 0.2, stagger: 0.06, ease: "none" }, 3.2)
      .to(".founder__final", { color: "#f2eee6", duration: 0.65 }, 4.15)
      .to({}, { duration: 0.8 });

    gsap.from(".story-preview", {
      clipPath: "inset(0 0 100% 0)",
      duration: 1.4,
      ease: "power4.inOut",
      scrollTrigger: { trigger: ".story-catalogue", start: "top 78%", once: true }
    });

    document.querySelectorAll(".story-row").forEach((row) => {
      gsap.from(row, {
        autoAlpha: 0,
        y: 28,
        duration: 0.8,
        ease: "power3.out",
        scrollTrigger: { trigger: row, start: "top 88%", once: true }
      });
    });

    const isMobile = window.matchMedia("(max-width: 760px)").matches;
    gsap.to(".journey__line i", {
      [isMobile ? "scaleY" : "scaleX"]: 1,
      ease: "none",
      scrollTrigger: { trigger: ".journey__track", start: "top 78%", end: "bottom 42%", scrub: 1 }
    });

    gsap.from(".journey-step", {
      autoAlpha: 0,
      y: 24,
      stagger: 0.12,
      duration: 0.7,
      ease: "power3.out",
      scrollTrigger: { trigger: ".journey__track", start: "top 78%", once: true }
    });

    document.querySelectorAll(".section-index, .memories__heading > p, .journey__copy > p, .final-frame__content > p, .memory-quote").forEach((element) => {
      gsap.from(element, {
        autoAlpha: 0,
        y: 24,
        duration: 0.85,
        ease: "power3.out",
        scrollTrigger: { trigger: element, start: "top 90%", once: true }
      });
    });

    gsap.to(".final-frame__image img", {
      yPercent: -5,
      scale: 2,
      ease: "none",
      scrollTrigger: { trigger: ".final-frame", start: "top bottom", end: "bottom top", scrub: 1.1 }
    });

    window.addEventListener("load", () => ScrollTrigger.refresh());
  }

  initSmoothScroll();
  initNavigation();
  initPreloader();
  initGlobalScroll();
  initPointerEffects();
  initStoryCatalogue();
  initAnimations();
})();
