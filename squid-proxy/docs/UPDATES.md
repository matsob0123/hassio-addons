# Aktualizacje bazy Docker co 14 dni

Workflow `Squid Proxy fortnightly Docker update` budzi się codziennie. Trwały stan `.github/squid-proxy-update-state.json` wymusza odstęp co najmniej 14 pełnych dni także na przełomie miesięcy i lat. Nie opiera się na dniach 1/15 miesiąca. Pierwszy planowy termin po wydaniu: 2026-10-28.

1. Pobiera wyłącznie manifest `library/alpine:3.24` z oficjalnego Docker Hub. Sprawdza SHA256 rzeczywistych bajtów względem nagłówka i obecność dokładnie jednego manifestu Linux amd64 i arm64.
2. Bez zmiany digestu zapisuje tylko datę sprawdzenia. Nie tworzy fikcyjnej wersji.
3. Po zmianie przygotowuje deterministyczną propozycję: przypięty digest, wersja patch dodatku, konfiguracja HA, domyślna wersja Docker i changelog. Kod Squida i opcje użytkownika pozostają pod kontrolą bieżącego wydania.
4. Propozycja przechodzi walidację, testy aktualizatora, natywne budowy obu architektur, rzeczywisty ruch proxy, wymuszony AppArmor, test startu/zatrzymania i skan zainstalowanych pakietów OS HIGH/CRITICAL. Błąd przerywa publikację.
5. Osobny job z `contents: write` sprawdza, że `main` nadal wskazuje dokładnie przetestowaną bazę. Regeneruje propozycję z zaufanego kodu, porównuje sumy plików i publikuje zwykłym atomowym fast-forwardem commit oraz tag `squid-proxy-vX.Y.Z`. Tworzy GitHub Release. Nie ma force push ani PAT.

Uprawnienia zapisu występują tylko w jobie publikacji. Reguły ochrony gałęzi GitHub pozostają nadrzędne; jeżeli blokują konto Actions, publikacja zakończy się błędem do rozwiązania przez właściciela. Zmiana `main` w trakcie testów również blokuje publikację zamiast nadpisywać nowszy kod. Jeżeli samo utworzenie Release zawiedzie po udanym commicie/tagu, log jasno podaje częściowy wynik; release można utworzyć z istniejącego tagu.

## Sterowanie

- Actions → ten workflow → Run workflow: `dry_run: true` jest domyślne i testuje propozycję bez zapisu; `force_check: true` omija sam odstęp czasu.
- `dry_run: false` publikuje wyłącznie poprawnie przetestowany wynik.
- Zmienna repozytorium `SQUID_PROXY_AUTO_UPDATE_DISABLED=true` wyłącza aktualizator. Politykę można też wyłączyć przez `enabled: false` w `.github/squid-proxy-updates.json`.
- `interval_days` i `github_releases` są konfigurowalne w polityce. Rejestr jest ograniczony do `library/alpine`, platformy do obu wspieranych architektur, a tag do konkretnej gałęzi Alpine `major.minor`.

Home Assistant wykryje nową wersję po odświeżeniu sklepu. Instalacja zależy od ustawień automatycznych aktualizacji w HA; ten workflow nie łączy się z urządzeniem i go nie restartuje. Bez zmiany digestu nie podbija wersji. Pakiety APK dostają bieżące podpisane poprawki przy budowie; niezależna kontrola CI co dwa tygodnie wykrywa regresje i nowe CVE nawet bez zmiany manifestu.

To aktualizator **bazy Alpine**. Nowy główny/minor Alpine, wersja Squida, jego źródło i SHA256 oraz wersja narzędzia skanującego wymagają osobnej świadomej aktualizacji i testów. Squid kompilowany ze źródeł nie jest widoczny jako pakiet APK dla skanera OS; jego oficjalne advisory trzeba sprawdzać osobno. Obecne wydanie używa Squid 7.7. Automatyzacja nie jest gwarancją braku podatności ani złośliwej przyszłej zależności.
