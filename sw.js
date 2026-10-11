/* NFK Operations - bakgrunnsskript v11.0: nett først, hurtiglager som reserve; varsler til låst skjerm (762) */
const LAGER = "nfk-operations-v11-0";
const GRUNN = ["./NFK_Operations.html", "./manifest.webmanifest", "./ikon-192.png", "./ikon-512.png"];

self.addEventListener("install", h => {
  h.waitUntil(caches.open(LAGER).then(l => l.addAll(GRUNN)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", h => {
  h.waitUntil(
    caches.keys()
      .then(navn => Promise.all(navn.filter(n => n !== LAGER).map(n => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", h => {
  const f = h.request;
  if (f.method !== "GET") return;
  const adresse = new URL(f.url);
  if (adresse.origin !== self.location.origin) return;
  h.respondWith(
    fetch(f)
      .then(svar => {
        if (svar && svar.ok){
          const kopi = svar.clone();
          caches.open(LAGER).then(l => l.put(f, kopi)).catch(() => {});
        }
        return svar;
      })
      .catch(() =>
        caches.match(f).then(t => t || (f.mode === "navigate" ? caches.match("./NFK_Operations.html") : undefined))
      )
  );
});

/* v11.0 (762): varselet fra tjenesten «push» vises på låst skjerm; et trykk åpner appen i riktig samtale */
self.addEventListener("push", h => {
  let d = {};
  try{ d = h.data ? h.data.json() : {}; }catch{ d = {}; }
  const tittel = d.tittel || "NFK Operations";
  const valg = { body: d.tekst || "", icon: "./ikon-192.png", badge: "./ikon-192.png", tag: d.kanal || "nfk-operations", renotify: true, data: { url: d.url || "./NFK_Operations.html" } };
  h.waitUntil(
    self.registration.showNotification(tittel, valg)
      .then(() => { if (typeof d.uleste === "number" && self.navigator && "setAppBadge" in self.navigator) return (d.uleste > 0 ? self.navigator.setAppBadge(d.uleste) : self.navigator.clearAppBadge()).catch(() => {}); })
  );
});

self.addEventListener("notificationclick", h => {
  h.notification.close();
  const url = new URL((h.notification.data && h.notification.data.url) || "./NFK_Operations.html", self.location.href).href;
  h.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(liste => {
      const side = url.split("#")[0];
      const w = liste.find(c => c.url.split("#")[0] === side) || liste[0];
      if (w){ return w.focus().then(c => (c && c.navigate ? c.navigate(url) : c)).catch(() => self.clients.openWindow(url)); }
      return self.clients.openWindow(url);
    })
  );
});
