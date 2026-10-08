# Analiza FossFLOW

Przeanalizowano wskazane repozytorium
`https://github.com/victortassinari/FossFLOW`, commit
`59d51ec5a0be809522bc7b53cd70a50fc8dffbe6`.
Nie zamieniono go na odmienny fork ani obraz Docker Hub bez weryfikacji.
README tego forka nadal zawiera odsyłacze do stan-smith/FossFLOW i stnsmith/fossflow;
nie oznacza to, że te obrazy odpowiadają dokładnie wskazanemu commitowi.

## Struktura

Monorepo npm workspaces zawiera `fossflow-lib`, `fossflow-app` i `fossflow-backend`.
Biblioteka jest forkiem Isoflow: React 18, MUI, Zustand, Zod, grafika SVG/DOM,
historia edycji, widoki, węzły, połączenia, opisy i eksport obrazu.
Biblioteka ma wersję 1.0.5; aplikacja i backend 1.0.0. Nie użyto tych numerów
jako gwarancji wydania całego repozytorium — źródła są przypięte commitem.

Aplikacja jest budowana RSBuild. Wbudowane isopacks obejmują ikonografię
Isoflow, AWS, Azure, GCP i Kubernetes. Importowane ikony mogą być osadzone
w modelu jako data URL. Model ma tablice `items`, `views`, `icons`, `colors`;
diagram zawiera odwołania między nimi walidowane schematem biblioteki.

## Wyniki przeglądu

| Element upstream | Obserwacja w kodzie | Zmiana w dodatku |
|---|---|---|
| `Dockerfile` | npm install zamiast ci; obrazy o zmiennych tagach | Źródło/lockfile i baza po digest; npm ci |
| `docker-entrypoint.sh` | npm install --production przy każdym starcie; backend w tle | Gotowy pojedynczy runtime Node, brak instalacji podczas startu |
| nginx | Port 80, brak ochrony Ingress i konfiguracji HA | Osobny listener 8099 tylko dla Supervisora i opcjonalny LAN 8080 |
| `storageService.ts` | Żądania `/api/...` od głównego adresu domeny | API i zasoby ze ścieżką X-Ingress-Path |
| `App.tsx` | Oddzielny zapis przeglądarkowy i menedżer serwera | Jednolity panel zapisujący na serwerze, szkic lokalny jako awaryjny |
| autosave upstream | Aktualizuje localStorage; nie gwarantuje zapisu server storage | Autosave API po pierwszym utworzeniu modelu na serwerze |
| backend | Ścieżki z ID bez ograniczenia alfabetu | Walidacja ID, brak slashy, ograniczenie rozmiaru i blokowanie symlinków |
| backend | Bezpośredni writeFile i brak wersji współbieżnej | fsync/rename, kolejka zapisów, ETag/If-Match |
| backend | CORS otwarty; brak kont LAN | Brak otwartego CORS, ochrona cross-site i oddzielne logowanie LAN |
| backup git | Flaga istnieje, ale kod zawiera TODO | Działające kopie JSON z retencją; bez pozorowania obsługi Git |
| service worker | Zasoby od `/` i ogólne cache | Brak rejestracji service workera w nakładce HA |
| webpack biblioteki | `mode: development`, eval w wynikowym bundle | Produkcja i `devtool: false`, bez unsafe-eval w CSP |
| template HTML | Asset prefix wstawiany przed ikonami; relatywne `./` dawało `.favicon.ico` | Własny jawny template i dynamiczny base href |
| IconButton / etykiety | Przyciski bez aria-label i disabled; etykiety przy własnych wysokich ikonach nachodzą | aria-label i rzeczywiste disabled, podniesienie etykiet, czytelna paleta dark |
| jest config | Błąd składni w repozytorium blokuje jego test runner | Własna niezależna bateria testów runtime i przeglądarki |

Zachowano bibliotekę edytora; wymieniono nakładkę aplikacji i backend na adapter
Home Assistant. Nie jest to pusty iframe do publicznego FossFLOW. Nie uruchamia
upstream Express ani nginx. Serwer Node obsługuje Ingress, zasoby i zapis bez
zewnętrznych zależności runtime. Nie wymaga dostępu do API encji HA.

Nie dodano automatycznej inwentaryzacji sieci: upstream również jej nie zapewnia.
Nie dodano skanowania, LLDP, SNMP, NetBox sync, integracji Tailscale API czy
automatycznego wykrywania urządzeń HA. Takie funkcje wymagają osobnego projektu
i dodatkowych uprawnień, nie są warunkiem działania edytora.

## Przypięcie i odtwarzalność

`fossflow/vendor/fossflow.tar.gz` powstał przez `git archive` tego commita.
SHA-256: `c180962e256127a00ad51d65f0ab41fa984f1d3d320d2258d964ddd3e9f0111c`.
Zawiera oryginalną licencję, kod i lockfile; nie zawiera `.git` ani node_modules.
Dockerfile sprawdza hash przed rozpakowaniem. Plik `frontend/patch-upstream.mjs`
zawiera jawne, sprawdzane poprawki i kopiuje nakładkę. Przy zmianie kluczowych
fragmentów upstream build przerywa, zamiast w milczeniu pominąć patch.

Baza to multiarch `node:22-alpine3.22` przypięta digestem indeksu. Zaktualizuj
ją świadomie przy następnym wydaniu. Przypięcie nie zastępuje sprawdzania
aktualizacji bezpieczeństwa i nie oznacza deklaracji braku podatności wszystkich
zależności upstream. Wersja 1.0.0 nie zawiera audytu bezpieczeństwa całego edytora.

## Główne źródła

- [FossFLOW — wskazane repozytorium](https://github.com/victortassinari/FossFLOW)
- [Źródła dokładnego commita](https://github.com/victortassinari/FossFLOW/tree/59d51ec5a0be809522bc7b53cd70a50fc8dffbe6)
- [Konfiguracja aplikacji HA](https://developers.home-assistant.io/docs/apps/configuration/)
- [Wymagania Ingress i AppArmor](https://developers.home-assistant.io/docs/apps/presentation/)
- [Repozytoria aplikacji HA](https://developers.home-assistant.io/docs/apps/repository/)
- [Testowanie lokalne](https://developers.home-assistant.io/docs/apps/testing/)

Aktualna dokumentacja HA używa nazwy Apps. W konfiguracji i API nadal
występują nazwy add-on/addons. Pakiet używa standardowego `config.yaml`
i etykiety obrazu `io.hass.type=app`. Nie polega na usuniętej wartości domyślnej
BUILD_FROM ani na przestarzałym build.yaml.
