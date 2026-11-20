(() => {
  const { userAgent, maxTouchPoints, standalone } = navigator;
  const browserMode = matchMedia("(display-mode: browser)");
  if (standalone || !browserMode.matches || window.top !== window) return;

  // iOS Safari and ambiguous mobile browsers are left to the native mechanism.
  const iphone = /\(iPhone;/.test(userAgent);
  const thirdPartyIOS = /\b(?:CriOS|FxiOS|EdgiOS)\/\d/.test(userAgent);
  const desktop = /\b(?:Macintosh|Windows NT)\b/.test(userAgent) &&
    !/\b(?:Mobile|Android|iPhone|iPad|iPod)\b/.test(userAgent) &&
    (!userAgent.includes("Macintosh") || maxTouchPoints < 2);
  if (!(iphone && thirdPartyIOS) && !desktop) return;

  const copy = {
    de: {
      title: "EVSpendPure fürs iPhone",
      mobile: "Kostenlose App fürs iPhone.",
      desktop: "Vergleiche Stromkosten und Kraftstoffkosten mit der kostenlosen App fürs iPhone.",
      link: "Zum App Store",
      qr: "QR-Code zur App im App Store",
      close: "App-Hinweis schließen"
    },
    en: {
      title: "EVSpendPure for iPhone",
      mobile: "Free app for iPhone.",
      desktop: "Compare electricity and fuel costs with the free app for iPhone.",
      link: "View on the App Store",
      qr: "QR code for the app on the App Store",
      close: "Dismiss app promotion"
    },
    tr: {
      title: "iPhone için EVSpendPure",
      mobile: "iPhone için ücretsiz uygulama.",
      desktop: "Ücretsiz iPhone uygulamasıyla elektrik ve yakıt maliyetlerini karşılaştır.",
      link: "App Store’a git",
      qr: "App Store’daki uygulamanın QR kodu",
      close: "Uygulama tanıtımını kapat"
    }
  };

  // The calculator resolves the initial market language on DOMContentLoaded.
  document.addEventListener("DOMContentLoaded", () => {
    if (!browserMode.matches) return;
    const template = document.querySelector("#app-discovery-template");
    const panel = template.content.firstElementChild.cloneNode(true);
    const title = panel.querySelector("h2");
    const description = panel.querySelector("p");
    const link = panel.querySelector("a");
    const art = panel.querySelector("img");
    const close = panel.querySelector("button");
    panel.dataset.layout = desktop ? "desktop" : "mobile";
    if (desktop) close.remove();

    const translate = () => {
      const labels = copy[document.documentElement.lang] || copy.en;
      title.textContent = desktop ? labels.title : "EVSpendPure";
      description.textContent = desktop ? labels.desktop : labels.mobile;
      link.textContent = labels.link;
      art.alt = desktop ? labels.qr : "";
      close.setAttribute("aria-label", labels.close);
    };
    translate();
    art.src = desktop ? "/app-discovery-qr.png" : "/app-discovery-icon.png";
    art.width = art.height = desktop ? 172 : 180;
    document.querySelector("footer").after(panel);
    document.addEventListener("eaf:languagechange", translate);

    close.addEventListener("click", () => {
      document.removeEventListener("eaf:languagechange", translate);
      document.querySelector(".footer-links a:last-child")?.focus();
      panel.remove();
    });
  }, { once: true });
})();
