(() => {
  const { userAgent, maxTouchPoints, standalone } = navigator;
  const browserMode = matchMedia("(display-mode: browser)");
  if (standalone || !browserMode.matches || window.top !== window) return;

  const iphone = /\(iPhone;/.test(userAgent);
  const iosBrowserTokens = userAgent.match(/\b(?:CriOS|FxiOS|EdgiOS)\/\d/g) || [];
  const desktop = iosBrowserTokens.length === 0 && /\b(?:Macintosh|Windows NT)\b/.test(userAgent) &&
    !/\b(?:Mobile|Android|iPhone|iPad|iPod)\b/.test(userAgent) &&
    (!userAgent.includes("Macintosh") || (maxTouchPoints === 0 && !matchMedia("(any-pointer: coarse)").matches));
  if (!(iphone && iosBrowserTokens.length === 1) && !desktop) return;

  const copy = {
    de: {
      subtitle: "Jetzt die iPhone-App herunterladen",
      action: "Laden",
      link: "Laden, EVSpendPure im App Store",
      qr: "QR-Code",
      qrHint: "Mit dem iPhone scannen",
      scan: "QR-Code zur EVSpendPure-Seite im App Store",
      close: "App-Hinweis schließen"
    },
    en: {
      subtitle: "Download the iPhone app",
      action: "Get",
      link: "Get EVSpendPure on the App Store",
      qr: "QR code",
      qrHint: "Scan with your iPhone",
      scan: "QR code for EVSpendPure on the App Store",
      close: "Dismiss app banner"
    },
    tr: {
      subtitle: "iPhone uygulamasını şimdi indir",
      action: "İndir",
      link: "İndir, App Store’da EVSpendPure",
      qr: "QR kodu",
      qrHint: "iPhone ile tara",
      scan: "EVSpendPure’un App Store sayfasının QR kodu",
      close: "Uygulama tanıtımını kapat"
    }
  };

  const script = document.currentScript;
  const template = document.querySelector("#app-discovery-template");
  const panel = template?.content?.firstElementChild?.cloneNode(true);
  if (!panel) return;

  const subtitle = panel.querySelector(".app-discovery-subtitle") || panel.querySelector(".app-discovery-copy p");
  const link = panel.querySelector("a");
  const close = panel.querySelector(".app-discovery-close") || panel.querySelector("button");
  if (!subtitle || !link || !close) return;

  // Cached V1 documents can fetch this script at their older query version.
  const legacyTemplate = !panel.querySelector(".app-discovery-row");
  if (legacyTemplate) {
    const title = panel.querySelector("#app-discovery-title");
    const icon = panel.querySelector("img");
    if (!title || !icon) return;

    panel.dataset.legacyTemplate = "";
    panel.dataset.download = "";
    title.textContent = "EVSpendPure";
    subtitle.classList.add("app-discovery-subtitle");
    link.classList.add("app-discovery-link");
    link.href = "https://apps.apple.com/app/evspendpure/id6832245694";
    close.classList.add("app-discovery-close");
    icon.classList.add("app-discovery-icon");
    icon.width = icon.height = 40;
    icon.src = "/app-discovery-icon.png";
  }

  const qrButton = panel.querySelector(".app-discovery-qr");
  const qrPanel = panel.querySelector(".app-discovery-qr-panel");
  const qrHint = qrPanel?.querySelector("p");
  const qrImage = qrPanel?.querySelector("img");
  const hasQr = desktop && qrButton && qrHint && qrImage;
  panel.dataset.layout = desktop ? "desktop" : "mobile";

  const translate = () => {
    const labels = copy[document.documentElement.lang] || copy.en;
    subtitle.textContent = labels.subtitle;
    link.textContent = labels.action;
    link.setAttribute("aria-label", labels.link);
    close.setAttribute("aria-label", labels.close);
    if (hasQr) {
      qrButton.textContent = labels.qr;
      qrHint.textContent = labels.qrHint;
      qrImage.alt = labels.scan;
    }
  };
  translate();
  const language = new MutationObserver(translate);
  language.observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });

  if (hasQr) {
    qrButton.addEventListener("click", () => {
      qrPanel.hidden = !qrPanel.hidden;
      qrButton.setAttribute("aria-expanded", String(!qrPanel.hidden));
      if (!qrPanel.hidden && !qrImage.hasAttribute("src")) qrImage.src = "/app-discovery-qr.png";
    });
  } else {
    qrButton?.remove();
    qrPanel?.remove();
  }

  close.addEventListener("click", () => {
    language.disconnect();
    panel.remove();
    document.querySelector("#marketSwitch")?.focus({ preventScroll: true });
  });
  // Current documents load this script before the toolbar. Older ones defer it.
  const toolbar = document.querySelector(".top-controls");
  if (!toolbar) {
    script.after(panel);
  } else if (!legacyTemplate) {
    toolbar.before(panel);
  } else {
    const previousStyle = document.querySelector('link[data-web-only="app-discovery"]');
    const style = document.createElement("link");
    style.rel = "stylesheet";
    // Match the stylesheet version used by the current HTML and optional precache.
    style.href = "/app-discovery.css?v=01d99467ab55";
    style.addEventListener("load", () => {
      previousStyle?.remove();
      toolbar.before(panel);
    }, { once: true });
    style.addEventListener("error", () => {
      // Keep the card clear of the old fixed toolbar when offline.
      document.querySelector(".hero .hdr")?.after(panel);
    }, { once: true });
    document.head.append(style);
  }
})();
