(() => {
  const { userAgent, maxTouchPoints, standalone } = navigator;
  const browserMode = matchMedia("(display-mode: browser)");
  if (standalone || !browserMode.matches || window.top !== window) return;

  // Adding the native tag is the manual activation step after checking the store.
  const appId = "6832245694";
  const downloadEnabled = document.querySelector('meta[name="apple-itunes-app"]')?.content === "app-id=" + appId;
  const iphone = /\(iPhone;/.test(userAgent);
  const thirdPartyIOS = /\b(?:CriOS|FxiOS|EdgiOS)\/\d/.test(userAgent);
  const safariIOS = /\bVersion\/[\d.]+\b.*\bSafari\/[\d.]+$/.test(userAgent);
  const desktop = /\b(?:Macintosh|Windows NT)\b/.test(userAgent) &&
    !/\b(?:Mobile|Android|iPhone|iPad|iPod)\b/.test(userAgent) &&
    (!userAgent.includes("Macintosh") || maxTouchPoints < 2);
  if (!(iphone && (thirdPartyIOS || (!downloadEnabled && safariIOS))) && !desktop) return;

  const copy = {
    de: {
      title: "EVSpendPure fürs iPhone",
      soon: "Bald im App Store",
      mobile: "Kostenlose App fürs iPhone.",
      desktop: "Vergleiche Stromkosten und Kraftstoffkosten mit der kostenlosen App fürs iPhone.",
      link: "Zum App Store",
      qr: "QR-Code zur App im App Store",
      close: "App-Hinweis schließen"
    },
    en: {
      title: "EVSpendPure for iPhone",
      soon: "Coming soon to the App Store",
      mobile: "Free app for iPhone.",
      desktop: "Compare electricity and fuel costs with the free app for iPhone.",
      link: "View on the App Store",
      qr: "QR code for the app on the App Store",
      close: "Dismiss app promotion"
    },
    tr: {
      title: "iPhone için EVSpendPure",
      soon: "Yakında App Store’da",
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
    panel.toggleAttribute("data-download", downloadEnabled);
    if (desktop) close.remove();
    if (downloadEnabled) {
      link.href = "https://apps.apple.com/app/evspendpure/id" + appId;
    } else {
      link.remove();
    }
    const showQr = desktop && downloadEnabled;

    const translate = () => {
      const labels = copy[document.documentElement.lang] || copy.en;
      title.textContent = desktop ? labels.title : "EVSpendPure";
      description.textContent = downloadEnabled ? (desktop ? labels.desktop : labels.mobile) : labels.soon;
      if (downloadEnabled) link.textContent = labels.link;
      art.alt = showQr ? labels.qr : "";
      if (!desktop) close.setAttribute("aria-label", labels.close);
    };
    translate();
    art.src = showQr ? "/app-discovery-qr.png" : "/app-discovery-icon.png";
    art.width = art.height = showQr ? 172 : 180;
    document.querySelector(desktop ? "footer" : ".hero .hdr").after(panel);
    document.addEventListener("eaf:languagechange", translate);

    if (!desktop) {
      close.addEventListener("click", () => {
        document.removeEventListener("eaf:languagechange", translate);
        panel.remove();
        document.querySelector("#modeSingleBtn")?.focus({ preventScroll: true });
      });
    }
  }, { once: true });
})();
