# Raport testów — FossFLOW HA 1.1.0

Data: 2026-10-08. Środowisko: Ubuntu 24.04, amd64, Node 24.19.0,
Python 3.12.14, Chromium 133.0.6943.0 sterowany Playwright 1.51.1.
Obraz docelowy używa Node 22 Alpine i obsługuje amd64/aarch64.

**Wynik: 31 testów runtime i 22 scenariusze przeglądarkowych zakończonych pozytywnie.**
Sprawdzono także metadane, zgodność opcji, schematy Supervisora i składnię AppArmor.
W GitHub Actions zbudowano i uruchomiono obrazy Docker amd64 i aarch64
(Node 22 Alpine), wraz z testami API/start/health/SIGTERM. Nie wykonano testu
działającego Supervisor ani egzekwowania profilu przez jądro na HA OS.
Status wydania: experimental.

## Wykonane

| Test | Wynik / zakres |
|---|---|
| Pobranie i analiza upstream | Commit 59d51ec5a0be809522bc7b53cd70a50fc8dffbe6, API, frontend, build i Docker |
| npm ci | Instalacja z dołączonego lockfile powiodła się |
| Produkcyjny build biblioteki | webpack + deklaracje TypeScript + tsc-alias, sukces |
| Produkcyjny build aplikacji | RSBuild, sukces; JS/CSS/HTML ok. 6,37 MB, gzip ok. 1,81 MB |
| Walidacja pakietu | 31 opcji zgodne między config.yaml a runtime; opisy PL/EN; hash upstream |
| Oficjalny schemat HA | config i tłumaczenia zaakceptowane przez SCHEMA_APP_CONFIG/SCHEMA_APP_TRANSLATIONS |
| Oficjalne typy opcji HA | Wszystkie 31 domyślnych opcje przeszły AppOptions |
| AppArmor | apparmor_parser 4.0.1, kompilacja bez ładowania profilu, kod 0 |
| TypeScript frontend | tsc --noEmit, sukces; ES2020, poprawiony boolean upstream |
| Docker amd64 i aarch64 | Build, 31 testów API w obrazie, start/health/deny loopback/SIGTERM: sukces |
| Shell i JS | sh -n i node --check, sukces |
| Runtime | 31/31, brak pominiętych testów |
| Przeglądarka | 22/22, bez wyjątków strony i nieoczekiwanych 404/500 |

Walidatory pochodziły z repozytorium home-assistant/supervisor, commit
`9ce1060ba7cfb833899d0ba81d8dbaf9fa4eed15`. Do wywołania izolowanych walidatorów
w Python 3.12 użyto odroczonych adnotacji oraz dostosowano składnię `except`
z Python 3.14; moduł opcji udostępnił swój oryginalny regex. Nie uruchamiano
całego Supervisora i nie symulowano jego logowania, backupów ani zarządzania obrazem.

AppArmor parser zgłasza brak interfejsu jądra/cache w tym środowisku. Jest to
sprawdzenie składni i kompilacji reguł z abstractions/tunables z pakietu Ubuntu,
bez załadowania profilu. Profile HA OS i jego audit log wymagają testu docelowego.

## 31 testów runtime

1. Walidacja opcji i bezpieczne wartości domyślne LAN.
2. Wczytanie options.json, brak pliku, błędny JSON.
3. Dynamiczny base path Ingress, brak haseł w HTML/public config.
4. Ograniczenie do rzeczywistego peer; spoofed X-Forwarded-For odrzucony.
5. CRUD, pliki na dysku, ETag, preconditions i odtworzenie z tych samych plików.
6. Dwa równoczesne zapisy: jeden sukces, jeden konflikt.
7. Nieprawidłowe ID/ścieżki/modele, brak diagramu, nieznane API/zasoby.
8. Content-Type, błędny JSON i limit wielkości żądania.
9. Blokowanie cross-site oraz brak otwartego CORS.
10. Read-only blokuje wszystkie mutacje; odczyt i eksport działają.
11. Wyłączony storage nie przyjmuje zapisów.
12. Limit diagramów i retencja historii.
13. Kopie, retencja, share, odtworzenie bez nadpisania i zachowanie ikon.
14. Uszkodzone pliki i symlinki nie ujawniają innych plików ani nie psują listy.
15. Logowanie LAN, HttpOnly/SameSite, logout, limit prób i brak obejścia przez header Ingress.
16. Włączenie TLS bez certyfikatu kończy start błędem.
17. Rzeczywisty lokalny listener HTTPS loguje i wystawia Secure cookie.
18. HEAD, nosniff, cache zasobów i manifest ze ścieżką Ingress.
19. Błąd zajętego portu LAN zwalnia wcześniej uruchomiony port Ingress.

Test TLS generuje świeży certyfikat i jednorazowy klucz przez OpenSSL w katalogu
tymczasowym, usuwanym po teście. Repozytorium nie zawiera kluczy TLS.

## 22 scenariusze browser

1. Edytor w iframe, symulowana brama Ingress, poprawne zasoby i API pod prefiksem.
2. Import i zapis trzech urządzeń, połączenia oraz własnej ikony SVG.
3. Autosave zmiany nazwy i utworzenie poprzedniej wersji.
4. Wczytanie historii i przywrócenie z aktualnym ETag.
5. Prawidłowy download JSON z węzłami i ikonami.
6. Prawidłowy download PNG z menu edytora.
7. Ręczne utworzenie pliku kopii.
8. Restart runtime i otwarcie zapisanych diagramów.
9. Konflikt z drugim klientem i zapis własnej kopii.
10. Ekran 390 × 844, bez poziomego overflow strony.
11. Logowanie LAN otwiera rzeczywisty edytor.
12. English/dark/read-only: edytor i blokady kontrolek.
13. Brak wyjątków strony, błędnych ścieżek zasobów i nieoczekiwanych odpowiedzi błędów.
14. Dostarczony main.mjs uruchamia się i kończy prawidłowo po SIGTERM.

Celowo wywołana odpowiedź **412** jest sukcesem scenariusza konfliktu.
Nie została ukryta jako błąd serwera; potwierdzono zachowanie obu wersji.
Zrzuty ekranu i wyniki są w `docs/evidence/`.

## Ograniczenia i następne testy

- W środowisku lokalnym nie ma Docker daemon. Testy obrazów przeprowadzono
  na runnerach GitHub Actions, nie na urządzeniu użytkownika.
- CI: `.github/workflows/fossflow.yaml`. Pełny przebieg zakończył się sukcesem:
  [run 37767086268](https://github.com/matsob0123/hassio-addons/actions/runs/37767086268),
  commit `5815a32bcf9e9372313f435e2e946fc9e88d5df6`.
- Runtime aarch64 uruchomiono przez QEMU na runnerze amd64. Nie jest to
  test na fizycznym Raspberry Pi ani test systemowy na HA OS.
- HA Ingress był symulowany przez reverse proxy z usuwaniem prefiksu i nagłówkiem;
  rzeczywisty login HA, panel, watchdog i backup HA wymagają docelowego testu.
- Nie testowano natywnego Safari iPhone; przetestowano viewport mobilny Chromium.
- Nie wykonano audytu wszystkich transytywnych zależności upstream ani pełnego pentestu.
- Upstream npm test nie rusza z powodu błędu składni jest.config.js. Niezależne testy
  dodatku działają; nie przypisuje się im statusu całego zestawu testów upstream.
- Build ostrzega o rozmiarze biblioteki/entrypointów. To ostrzeżenie wydajności,
  a nie błąd kompilacji; dołączone biblioteki ikon zwiększają bundle.

Procedura testu HA jest w [HA_ACCEPTANCE.md](HA_ACCEPTANCE.md).

## Dodatkowy zakres 1.1.0

Nowe testy runtime: 31 opcji i granice; odzyskiwanie kosza i równoległe żądania;
retencja, wyłączenie kosza i limit pojemności; lista/pobranie/import/usuwanie kopii;
ścieżki i symlinki archiwów; blokady read-only/disabled; rozmiary kopii;
kopia przy starcie i błąd share; sortowanie i uszkodzone metadane; diagnostyka
bez sekretów; CSP i null/nieprawidłowe payloady.

Nowe scenariusze browser: kosz, download zapisanej kopii, import i usuwanie kopii,
diagnostyka/Esc/fokus, skróty zapisu i kopii, startup latest oraz wyłączenie szkiców/siatki.
Pełna lista 22 scenariusze i wyników: `evidence/e2e-results.json`.

Kontrola wizualna wykryła nakładanie tytułu na zoom w upstream na ekranie 390 px.
Poprawiono położenie tytułu, niedopuszczalną ujemną szerokość oraz odwrócone
warunki blokady przycisków zoomu. Nowy scenariusz sprawdza przejście
do obu granic zoomu i możliwość powrotu, a także brak nakładania kontrolek.
Test konfliktu toleruje poprawne wykrycie zmiany przez autosave przed ręcznym
zapisem; nie czeka wtedy na celowo zablokowany przycisk.
