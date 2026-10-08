# Automatyczne aktualizacje obrazu bazowego

Workflow [FossFLOW fortnightly Docker update](https://github.com/matsob0123/hassio-addons/actions/workflows/fossflow-update.yaml) sprawdza bazę Node co 14 dni. Nowa wersja dodatku powstaje **tylko wtedy, gdy zmieni się digest obrazu**. Nie zmienia samoczynnie wersji FossFLOW, major Node, Alpine ani bibliotek npm.

## Harmonogram i konfiguracja

GitHub budzi workflow codziennie o 03:17 UTC. `.github/fossflow-update-state.json` przechowuje datę ostatniej zakończonej kontroli. `.github/fossflow-updates.json` określa interwał 14 dni i obserwowany tag `node:22-alpine3.22`. To rzeczywiste odstępy 14 × 24 h, również na przełomie miesięcy i lat; zapis `*/14` w cron nie zapewnia takiego odstępu. Pierwsza planowa kontrola po wydaniu 1.2.0 przypada 22 października 2026.

GitHub może opóźnić lub pominąć uruchomienie; kolejny dzienny start nadrabia zaległą kontrolę. Nieudana kontrola lub test nie przesuwa daty, więc kolejny start ponowi próbę. Brak zmiany obrazu aktualizuje wyłącznie plik stanu i tworzy commit kontrolny, bez wydania i zmiany wersji aplikacji. Takie commity utrzymują aktywność repozytorium. GitHub może wyłączyć harmonogram publicznego repozytorium po 60 dniach bez aktywności: sprawdzaj stan workflow, zwłaszcza po długotrwałych błędach.

| Ustawienie repozytorium | Znaczenie |
| --- | --- |
| `.github/fossflow-updates.json`: `enabled` | `false` wyłącza workflow aktualizacji, także ręczne sprawdzenie (CI nadal testuje rejestr bez publikacji) |
| `interval_days` | Od 1 do 90; domyślnie 14 |
| `repository` / `tag` | Zaufany `library/node` i konkretny tag wersji Node/Alpine |
| `platforms` | Wymagane `amd64` i `arm64` dla Linux |
| `github_releases` | Publikuj GitHub Release po atomowym zapisie commitu i tagu |
| Actions variable `FOSSFLOW_AUTO_UPDATE_DISABLED` | `true` wyłącza cały workflow aktualizacji |

Zmiana linii Node/Alpine wymaga świadomego PR aktualizującego policy, `release.json` i Dockerfile oraz pełnych testów. Nie używaj `latest` ani samego `alpine`. Wszystkie wydania zachowują digest SHA-256. Akcje zewnętrzne są przypięte do SHA commitu.

## Przebieg wydania

1. Kod aktualizatora przechodzi testy bez dostępu do zapisu repozytorium.
2. Pobiera manifest z Docker Hub z ograniczonym tokenem pull. Sprawdza SHA-256 surowych bajtów, nagłówek digest i pojedyncze manifesty Linux amd64/arm64; attestacje innych platform nie zastępują obrazu runtime.
3. Przy zmianie zwiększa patch, np. `1.2.0` → `1.2.1`, synchronizuje metadata HA, Dockerfile, `release.json`, package/lock i changelog. Konfiguracja użytkownika pozostaje w `/data`.
4. Kandydat trafia do artefaktu GitHub Actions. Każdy job ponownie odtwarza plan z zaufanego kodu i odrzuca dodatkowe ścieżki, zmiany ustawień, inne instrukcje Docker, drift metadanych i symlinki.
5. Ten sam reusable workflow co CI buduje frontend, sprawdza typy, testy runtime/API, rzeczywistą przeglądarkę z Ingress oraz obrazy amd64 i aarch64. ARM uruchamiany jest pod QEMU.
6. Dopiero job publikacji dostaje `contents: write`. Odczytuje aktualny `main` i odmawia zapisu, jeżeli gałąź przesunęła się po przygotowaniu kandydata.
7. Zwykły push `--atomic` zapisuje razem commit na `main` i tag `fossflow-vX.Y.Z`. Nie ma force push. Następnie powstaje GitHub Release. Brak uprawnień lub branch protection powoduje błąd; ograniczenia nie są obchodzone.

Nie są potrzebne PAT, uprawnienia Docker API ani sekret Docker Hub. `GITHUB_TOKEN` jest krótkotrwałym tokenem GitHub Actions. Ponieważ push tym tokenem nie uruchamia zwykłego push CI, komplet testów wykonywany jest **przed** publikacją przez jawne wywołanie reusable workflow. Także zwykły PR przechodzi prawdziwy odczyt rejestru, pobranie artefaktu i zastosowanie planu bez publikacji.

## Ręczne uruchomienie

GitHub → Actions → **FossFLOW fortnightly Docker update** → **Run workflow**, gałąź `main`:

- `dry_run: true` (domyślnie): kontrola i, jeśli obraz się zmienił, pełne testy; bez commitu, tagu i wydania.
- `force_check: true` (domyślnie): kontrola od razu, bez czekania 14 dni.
- `dry_run: false`: publikacja sprawdzonej zmiany lub zapis zakończonej kontroli bez zmiany obrazu.

Wyłączenie interwału nie wymusza nowej wersji przy niezmienionym obrazie. Raport kontroli znajduje się w podsumowaniu workflow, a plan `update.json` w artefakcie. Nie zawiera haseł ani opcji użytkownika.

Lokalny odczyt bez zapisu repozytorium:

```sh
node fossflow/automation/update.mjs --force --plan /tmp/fossflow-update.json
```

## Home Assistant i wycofanie zmiany

Mechanizm publikuje kod aplikacji; HA nadal buduje obraz Docker lokalnie. Nie instaluje i nie restartuje urządzeń. Po odświeżeniu sklepu pojawia się aktualizacja; instalacja zależy od ustawień aktualizacji użytkownika w HA. Przed aktualizacją zrób backup HA. Eksport FossFLOW obejmuje diagramy, a pełna kopia HA również ustawienia, historię i kosz.

Zachowaj backup HA sprzed aktualizacji, aby przywrócić także poprzedni obraz i dane. Wycofanie publicznego wydania wykonaj osobnym PR z wyższą wersją patch i sprawdzonym poprzednim digestem; jeżeli rejestr nadal wskazuje wadliwy nowy obraz, najpierw wyłącz auto update. Istniejące tagi są niezmienne.

## Obsługa błędów

- HTTP 429/5xx i problemy sieci: trzy próby, ograniczony czas żądania; brak publikacji po błędzie.
- Brak platformy, niezgodny digest, drift wersji: stop, żadnych zmian w repozytorium.
- Błąd frontend/browser/Docker: stop, żadnej nowej wersji; następny harmonogram powtórzy kontrolę.
- `main` zmieniony równolegle: stop; kolejny start przygotuje plan na nowej bazie.
- Chroniony `main`: push zostanie odrzucony. Aby zachować wymagane PR, uruchamiaj dry run i wprowadzaj aktualizacje przez zwykły sprawdzony PR. Nie osłabiaj ochrony automatycznie.
- Commit i tag opublikowane, ale REST Release zawiodło: komunikat jasno wskazuje częściowe powodzenie. Dodatek jest już dostępny w sklepie. Utwórz Release z istniejącego tagu; nie podbijaj wersji ponownie.

Workflow jest ustawiony w repozytorium. Przyszłego uruchomienia cron ani instalacji na konkretnym HA nie da się potwierdzić testem lokalnym.

Źródła: [zdarzenia i harmonogram GitHub](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows), [GITHUB_TOKEN](https://docs.github.com/en/actions/concepts/security/github_token), [reusable workflows](https://docs.github.com/en/actions/how-tos/reuse-automations/reuse-workflows), [Docker Registry API](https://docs.docker.com/reference/api/registry/latest/), [konfiguracja aplikacji HA](https://developers.home-assistant.io/docs/apps/configuration/).
