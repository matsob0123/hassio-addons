# Architektura i API

## Uruchomienie

Supervisor odczytuje config.yaml, buduje Dockerfile i montuje `/data`.
Docker init przekazuje sygnały do run.sh, które wykonuje `exec node`.
Jeden proces uruchamia HTTP Ingress i, opcjonalnie, drugi listener HTTP/HTTPS LAN.
Nie ma subprocessu backendu, procesu nginx ani npm podczas startu.
SIGTERM zamyka listener, kończy aktywne żądania i czeka na kolejkę zapisów.

Etap build rozpakowuje sprawdzony kod i instaluje zależności z npm ci,
buduje bibliotekę i aplikację. Etap runtime kopiuje tylko wynik HTML/JS/CSS,
moduły runtime i licencję. Narzędzia deweloperskie upstream nie trafiają do runtime.

## Dostęp

Ingress 8099 sprawdza faktyczny remoteAddress połączenia: wyłącznie `172.30.32.2`.
Wyjątek GET `/health` pozwala także loopback na Docker HEALTHCHECK; nie daje
dostępu do diagramów ani interfejsu. Header X-Ingress-Path jest walidowany
i używany do dynamicznego HTML/manifestu. Nie jest traktowany jako uwierzytelnienie.
Nie ma otwartego CORS. Zapisy wymagają JSON i odrzucają cross-site Origin/Fetch Metadata.

LAN jest domyślnie wyłączony, a port hosta nie jest mapowany. Po włączeniu
wymaga użytkownika i hasła min. 12 znaków. Hasło przy starcie jest przeliczane
scrypt z losową solą; porównanie używa timingSafeEqual. Sesje to losowe 256-bitowe
tokeny; w pamięci przechowywane są ich SHA-256 i czas wygaśnięcia. Maksymalnie
1000 sesji i 10 000 rekordów ograniczania prób. Te rekordy są okresowo czyszczone.
Nie ma tokenów dostępu w localStorage ani w adresach LAN.

Nie pobiera ani nie wysyła danych do HA Core API. Nie żąda Supervisor API,
Docker API, host network ani dodatkowych capabilities. Mapuje `/share` do
opcjonalnych kopii i `/ssl` tylko do odczytu. Profil AppArmor dodatkowo
ogranicza zapis share do własnego podkatalogu. Ochrona pozostaje włączona.
Rzeczywiste egzekwowanie profilu jest przedmiotem testu na HA OS.

Nagłówki obejmują nosniff, no-referrer, CSP z frame-ancestors self.
HTML/API nie są cache'owane. Haszowane zasoby JS/CSS mogą być cache'owane przez
rok; nazwa z hashem zmienia się po buildzie. Skrypty nie wymagają unsafe-eval.
Inline script jest używany wyłącznie do konfiguracji startowej i logowania;
upstream MUI wymaga styli inline. CSP nie stanowi pełnego audytu XSS całego upstream.

## Pliki i współbieżność

ID diagramu: `[A-Za-z0-9_-]{1,128}`. Odczyt blokuje symlinki. Nazwa pliku
powstaje wyłącznie z prawidłowego ID w stałym katalogu. Zapis temp, fsync,
rename i fsync katalogu ograniczają ryzyko częściowego pojedynczego pliku.
Aktualizacja/usunięcie wymagają dokładnego If-Match z SHA-256 reprezentacji JSON.
Wszystkie mutacje trafiają do jednej kolejki, więc dwa równoczesne zapisy tej
samej wersji nie przechodzą jednocześnie.

Historia przechowuje zawartość przed aktualizacją. Kosz zachowuje pełny
usunięty diagram i czyści jego wcześniejszą historię. Kopie aplikacji
obejmują diagramy, z listą `format`, `version`, `created`, `diagrams`.
Nie niszczą obecnych plików podczas importu — zawsze tworzą nowe ID.
Całkowitej odporności na przerwanie zasilania w środku wieloplikowego importu
nie deklaruje się; po przerwaniu może pozostać część zaimportowanych diagramów.

Uszkodzony plik diagramu jest pomijany na liście z ostrzeżeniem, zachowany
na dysku do naprawy. Aplikacja nie nadpisuje options.json. Nie ma zapisu z
podanych dowolnych ścieżek, uruchamiania komend z opcji ani pobierania z URL przez backend.

## API

W Ingress poprzedź ścieżkę bazą udostępnioną przez X-Ingress-Path.
Poniższe adresy są ścieżkami wewnątrz aplikacji. LAN wymaga sesji cookie.

| Metoda i ścieżka | Działanie |
|---|---|
| `GET /health` | Status runtime, istnienie zasobów i katalogu storage |
| `GET /api/config` | Publiczne opcje UI, bez haseł i plików klucza |
| `GET /api/storage/status` | enabled/readOnly/version |
| `GET /api/diagrams` | id/name/lastModified/size/etag |
| `POST /api/diagrams` | Utworzenie; JSON pełnego modelu, id opcjonalny |
| `GET /api/diagrams/ID` | Pełny model i nagłówek ETag |
| `PUT /api/diagrams/ID` | Pełna aktualizacja, wymagany If-Match |
| `DELETE /api/diagrams/ID` | Usunięcie, wymagany If-Match |
| `GET /api/diagrams/ID/revisions` | Lista identyfikatorów/dat poprzednich wersji |
| `GET /api/diagrams/ID/revisions/REVISION` | Pełny model poprzedniej wersji |
| `GET /api/diagnostics` | Liczby, rozmiary, miejsce i limity; bez sekretów |
| `GET /api/trash` | Lista niewygasłych usuniętych diagramów |
| `POST /api/trash/ID/restore` | Odzyskanie pod nowym ID; JSON `{}` |
| `DELETE /api/trash/ID` | Trwałe usunięcie wpisu kosza |
| `GET /api/backups` | Lista dat, nazw i rozmiarów lokalnych kopii |
| `GET /api/backups/NAME` | Pobranie wybranej kopii |
| `POST /api/backups/NAME/restore` | Import zapisanej kopii; nowe ID |
| `DELETE /api/backups/NAME` | Usuń lokalny plik kopii; share pozostaje |
| `POST /api/backups` | Utworzenie kopii; JSON `{}` |
| `GET /api/backups/export` | Pobranie zbiorczego pliku JSON |
| `POST /api/backups/restore` | Import kopii jako nowe ID |
| `POST /auth/login` | Tylko LAN; username/password JSON; cookie HttpOnly |
| `POST /auth/logout` | Tylko LAN; unieważnienie sesji |

Ważne odpowiedzi: 400 nieprawidłowy model/ID, 401 brak sesji LAN,
403 read-only/obcy peer/cross-site, 404 brak pliku, 409 istniejący ID/limit,
412 konflikt wersji, 413 przekroczony rozmiar, 415 inny typ treści,
428 brak If-Match, 429 limit logowania, 503 wyłączone storage.

Walidacja backendu sprawdza obiekt, nazwę i podstawowe tablice. Nakładka
korzysta ze ścisłej walidacji Zod upstream przy otwieraniu. API nie obiecuje
pełnej walidacji semantycznej każdego połączenia: odpowiedzialny klient API
powinien wysyłać poprawne modele zgodne z biblioteką.

## Development

Node 22+ i Python z PyYAML:

```sh
npm ci
python3 -m pip install pyyaml
npm run check
npm test
npm run build:frontend
npx playwright install --with-deps chromium
npm run test:e2e
```

Testy browser tworzą lokalną bramę, która usuwa prefiks Ingress z żądań do
runtime i wstawia X-Ingress-Path. Testowana jest też ramka iframe w tym samym
origin, odtwarzanie po restarcie, konflikt, eksport, mobile oraz logowanie LAN.
Zmienne FOSSFLOW_TEST_STATIC_DIR i PLAYWRIGHT_CHROMIUM_EXECUTABLE pozwalają
użyć lokalnego builda i zainstalowanej przeglądarki. Zrzuty idą do test-results.

`FOSSFLOW_INGRESS_PEERS` służy **wyłącznie do lokalnego testowania/samodzielnego
developmentu**. Nie jest opcją HA, nie jest ustawiane w config.yaml i nie należy
dodawać w produkcji loopback ani podsieci LAN do Ingress. Domyślny adres
w produkcji pozostaje stały.

CI nie publikuje obrazów ani nie wysyła zmian do repozytorium: wykonuje testy
i Docker build/smoke dla amd64 i arm64. Przed publikacją skonfiguruj własny
rejestr, uprawnienia i numery tagów. Wersja w Dockerfile/workflow/config powinna
być zgodna. Nie ma zależności od nieistniejącego publicznego obrazu.


## Wydania 1.2 i konfiguracja procesu

`release.json` synchronizuje wersję i pin Docker z HA/package. Właściwy updater
`automation/update.mjs` używa standardowych modułów Node oraz git. Read-only
prepare tworzy deterministyczny artefakt, reusable CI go weryfikuje i testuje,
a osobny job o uprawnieniu contents:write wykonuje atomowy fast-forward main/tag.
Stan interwału zapisuje się wyłącznie po udanej kontroli lub publikacji.
Szczegóły: [UPDATES.md](UPDATES.md).

Runtime stosuje custom_env po loadConfig, w istniejącym procesie, przed Store i
HTTP. Rezerwuje opcje wpływające na startup/trust Ingress. Sekrety pozostają w
options.json; public config i diagnostyka korzystają z jawnie wybranych pól.
Store serializuje mutacje, sprawdza statfs przed zapisem, wznawia termin kopii po
restarcie i obsługuje retencję wieku. Shutdown najpierw zamyka listeners, czeka na
queue i opcjonalnie zapisuje snapshot; cold backup HA nadal obejmuje całe /data.
