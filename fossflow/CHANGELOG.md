# Changelog

## 1.1.0 — 2026-10-08

- Integracja z repozytorium matsob0123/hassio-addons.
- 31 ustawień HA i kompletne opisy PL/EN.
- Kosz: bezpieczne odzyskiwanie pod nowym ID, retencja wieku/liczby i trwałe usuwanie.
- Lista kopii na serwerze, pobieranie, import i usuwanie wybranego archiwum.
- Kopia przy starcie, konfigurowalny limit kopii, diagnostyka miejsca i danych.
- Otwieranie ostatniego diagramu, sortowanie, opcjonalne szkice i siatka.
- Przełącznik zewnętrznych ikon w CSP, skróty zapisu/kopii, fokus okien, stan offline.
- 31 testów runtime i 22 scenariusze przeglądarkowych, CI Docker amd64/aarch64.
- Kontrola typów TypeScript oraz poprawione granice zoomu i układ tytułu na telefonie.
- Budowa frontendu na platformie buildera, runtime na architekturze urządzenia.


## 1.0.0

- Pierwsza aplikacja HA oparta na FossFLOW `59d51ec5a0be809522bc7b53cd70a50fc8dffbe6`.
- Ingress ze ścieżką dynamiczną i ograniczeniem do rzeczywistego adresu Supervisora.
- Polski/angielski panel, motywy, widok mobilny i 22 opisane opcje.
- Zapis serwerowy, autosave, szkic awaryjny i konflikty ETag.
- Historia, kopie z retencją, eksport/import zbiorczy oraz `/share`.
- Opcjonalne logowanie LAN i HTTPS.
- AppArmor, watchdog, cold backup, Dockerfile dla amd64 i aarch64.
- Testy API i przeglądarkowe; CI zawiera budowanie obu architektur.
- Status experimental do wykonania testów Supervisora/AppArmor na HA OS.
