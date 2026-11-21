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
      subtitle: "Strom- und Kraftstoffkosten vergleichen",
      link: "EVSpendPure im App Store ansehen",
      desktopLink: "Im App Store ansehen",
      qr: "QR-Code",
      qrHint: "Mit dem iPhone scannen",
      scan: "QR-Code zur EVSpendPure-Seite im App Store",
      close: "App-Hinweis schließen"
    },
    en: {
      subtitle: "Compare electricity and fuel costs",
      link: "View EVSpendPure on the App Store",
      desktopLink: "View on the App Store",
      qr: "QR code",
      qrHint: "Scan with your iPhone",
      scan: "QR code for EVSpendPure on the App Store",
      close: "Dismiss app banner"
    },
    tr: {
      subtitle: "Elektrik ve yakıt maliyetlerini karşılaştır",
      link: "EVSpendPure’u App Store’da görüntüle",
      desktopLink: "App Store’da görüntüle",
      qr: "QR kodu",
      qrHint: "iPhone ile tara",
      scan: "EVSpendPure’un App Store sayfasının QR kodu",
      close: "Uygulama tanıtımını kapat"
    }
  };

  const template = document.querySelector("#app-discovery-template");
  const panel = template.content.firstElementChild.cloneNode(true);
  const subtitle = panel.querySelector(".app-discovery-subtitle");
  const link = panel.querySelector(".app-discovery-link");
  const close = panel.querySelector(".app-discovery-close");
  const qrButton = panel.querySelector(".app-discovery-qr");
  const qrPanel = panel.querySelector(".app-discovery-qr-panel");
  const qrHint = qrPanel.querySelector("p");
  const qrImage = qrPanel.querySelector("img");
  panel.dataset.layout = desktop ? "desktop" : "mobile";

  const translate = () => {
    const labels = copy[document.documentElement.lang] || copy.en;
    subtitle.textContent = labels.subtitle;
    link.textContent = desktop ? labels.desktopLink : "App Store";
    link.setAttribute("aria-label", desktop ? `${labels.desktopLink}, EVSpendPure` : labels.link);
    close.setAttribute("aria-label", labels.close);
    if (desktop) {
      qrButton.textContent = labels.qr;
      qrHint.textContent = labels.qrHint;
      qrImage.alt = labels.scan;
    }
  };
  translate();
  const language = new MutationObserver(translate);
  language.observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });

  if (desktop) {
    qrButton.addEventListener("click", () => {
      qrPanel.hidden = !qrPanel.hidden;
      qrButton.setAttribute("aria-expanded", String(!qrPanel.hidden));
      if (!qrPanel.hidden && !qrImage.hasAttribute("src")) qrImage.src = "/app-discovery-qr.png";
    });
  } else {
    qrButton.remove();
    qrPanel.remove();
  }

  close.addEventListener("click", () => {
    language.disconnect();
    panel.remove();
    document.querySelector("#marketSwitch")?.focus({ preventScroll: true });
  });
  // The template and this script precede the toolbar, so mounting is part of initial layout.
  document.currentScript.after(panel);
})();
