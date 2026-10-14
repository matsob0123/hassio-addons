"use strict";
const pl = document.documentElement.lang === "pl";
const texts = pl
  ? {
      intro:
        "Prywatne proxy HTTP i tunele HTTPS. Stan usługi oraz aktywna polityka dostępu.",
      requests: "Żądania od startu",
      requestsNote: "Licznik Squida, razem z odczytami diagnostyki",
      uptime: "Czas działania",
      memory: "Pamięć",
      memoryNote: "Łącznie dla kontenera; dostępność zależy od hosta",
      activity: "Aktywność",
      auth: "Logowanie",
      networks: "Dozwoleni klienci",
      connection: "Połączenie",
      policy: "Polityka i zasoby",
      cache: "Pamięć podręczna",
      domains: "Filtry domen",
      private: "Cele w LAN",
      logs: "Logowanie dostępu",
      setup: "Konfiguracja",
      footer: "Panel tylko do odczytu · odświeżanie co 10 s",
      enabled: "Włączone",
      disabled: "Wyłączone",
      online: "Działa",
      offline: "Brak połączenia",
      system: "DNS systemowy",
      setupText:
        "Ustaw proxy na adres IP Home Assistanta i port przypisany w zakładce Sieć. Opcje, konta, DNS i filtry zmienisz w Konfiguracji dodatku, a następnie zrestartujesz usługę. Ingress służy wyłącznie temu panelowi.",
      notice:
        "HTTP Basic przesyła poświadczenia do proxy bez szyfrowania. Dla niezaufanej sieci użyj HTTPS do proxy albo zaufanego VPN. HTTPS CONNECT nie odszyfrowuje stron.",
      allow: "dozwolone",
      deny: "blokowane",
    }
  : {
      intro:
        "Private HTTP proxy and HTTPS tunnels. Service health and the active access policy.",
      requests: "Requests since startup",
      requestsNote: "Squid counter, including diagnostic reads",
      uptime: "Uptime",
      memory: "Memory",
      memoryNote: "Container total; availability depends on the host",
      activity: "Activity",
      auth: "Authentication",
      networks: "Allowed clients",
      connection: "Connection",
      policy: "Policy and resources",
      cache: "Cache",
      domains: "Domain filters",
      private: "LAN destinations",
      logs: "Access logging",
      setup: "Configuration",
      footer: "Read-only dashboard · refresh every 10 s",
      enabled: "Enabled",
      disabled: "Disabled",
      online: "Healthy",
      offline: "Unavailable",
      system: "System DNS",
      setupText:
        "Set clients to the Home Assistant IP and the port mapped under Network. Change options, accounts, DNS and filters under app Configuration, then restart. Ingress is only used for this dashboard.",
      notice:
        "HTTP Basic sends credentials to the proxy without encryption. Use an HTTPS proxy or trusted VPN on untrusted networks. HTTPS CONNECT does not decrypt websites.",
      allow: "allowed",
      deny: "blocked",
    };
const set = (id, v) => {
  document.getElementById(id).textContent = v;
};
for (const e of document.querySelectorAll("[data-label]"))
  e.textContent = texts[e.dataset.label] || e.dataset.label;
set("intro", texts.intro);
set("setup", texts.setupText);
set("notice", texts.notice);
const fmt = new Intl.NumberFormat(pl ? "pl-PL" : "en");
let last = null;
const points = [];
function draw() {
  const c = document.getElementById("activity"),
    rect = c.getBoundingClientRect(),
    dpr = devicePixelRatio || 1;
  c.width = rect.width * dpr;
  c.height = 150 * dpr;
  const ctx = c.getContext("2d");
  ctx.scale(dpr, dpr);
  const w = rect.width,
    h = 150,
    max = Math.max(1, ...points);
  ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue(
    "--border",
  );
  for (let y = 25; y < 150; y += 35) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
  ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue(
    "--accent",
  );
  ctx.lineWidth = 2;
  ctx.beginPath();
  points.forEach((v, i) => {
    const x = (i / Math.max(1, points.length - 1)) * w,
      y = h - 12 - (v / max) * (h - 28);
    i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
  });
  ctx.stroke();
}
async function update() {
  const badge = document.getElementById("health");
  try {
    const r = await fetch(document.body.dataset.base + "api/status", {
      cache: "no-store",
    });
    if (!r.ok) throw Error();
    const s = await r.json();
    badge.textContent = s.healthy ? texts.online : texts.offline;
    badge.className = s.healthy ? "badge ok" : "badge";
    set("requests", fmt.format(s.requests));
    const h = Math.floor(s.uptimeSeconds / 3600),
      m = Math.floor(s.uptimeSeconds / 60) % 60;
    set("uptime", h + "h " + m + "m");
    set("memory", s.memoryMiB === null ? "—" : s.memoryMiB + " MiB");
    set("version", "Squid " + s.squidVersion + " · HA " + s.version);
    set("http", s.http ? "3128" : texts.disabled);
    set("https", s.https ? "3129 · TLS ≥1.2" : texts.disabled);
    set(
      "auth",
      s.authentication ? texts.enabled + " · " + s.userCount : texts.disabled,
    );
    set("networks", s.allowedNetworks.join(", "));
    set("dns", s.dnsServers.join(", ") || texts.system);
    set(
      "cache",
      s.cacheMode === "off"
        ? texts.disabled
        : s.cacheMode + " · " + s.cacheMemoryMiB + " MiB",
    );
    set(
      "domains",
      s.allowedDomainCount +
        " " +
        texts.allow +
        " / " +
        s.blockedDomainCount +
        " " +
        texts.deny,
    );
    set("private", s.privateDestinations ? texts.allow : texts.deny);
    set("logs", s.accessLogging ? texts.enabled : texts.disabled);
    set("uid", String(s.uid));
    const now = Date.now(),
      rate = last
        ? Math.max(0, s.requests - last.requests) / ((now - last.time) / 1000)
        : 0;
    last = { requests: s.requests, time: now };
    points.push(rate);
    if (points.length > 60) points.shift();
    set("rate", rate.toFixed(1) + " req/s");
    draw();
    set("updated", new Date().toLocaleTimeString(pl ? "pl-PL" : "en"));
  } catch {
    badge.textContent = texts.offline;
    badge.className = "badge";
  }
}
window.addEventListener("resize", draw);
update();
setInterval(update, 10000);
