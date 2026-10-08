# FossFLOW — dokumentacja

## Uruchomienie i zapis

Otwórz interfejs przez Home Assistant. Pierwszy diagram jest szkicem — jego
utworzenie na serwerze wymaga kliknięcia **Zapisz**. Od tego momentu edycja
i zmiana nazwy zapisują się automatycznie po `autosave_seconds` sekundach
bez dalszych zmian. Informacja **Zapisano na serwerze** potwierdza odpowiedź API.

**Diagramy** pokazuje listę zapisanych modeli, wyszukiwarkę oraz otwieranie
i usuwanie. Każde urządzenie widzi te same pliki. **Zapisz kopię** tworzy nowy
diagram, także po wykryciu konfliktu wersji. Dwa urządzenia nie mogą bez ostrzeżenia
nadpisać tej samej wersji: serwer sprawdza ETag przy aktualizacji i usunięciu.
Nie jest to edytor współpracy w czasie rzeczywistym.

Szkic w `localStorage` jest zabezpieczeniem po utracie połączenia. Przycisk
**Odzyskaj szkic** pojawia się, gdy znaleziono lokalną kopię. Odzyskany szkic
zapisuje się jako nowy diagram. Szkic nie jest kopią zapasową HA, jest zależny od
przeglądarki oraz ścieżki Ingress i może zniknąć po wyczyszczeniu danych przeglądarki.
Nie zastępuje zapisu na serwerze ani eksportu. Zamknięcie strony z niezapisanymi
zmianami wywołuje standardowe ostrzeżenie, o ile przeglądarka je obsługuje.

## Edytor

Dodawaj elementy przyciskiem **+**. Przesuwaj urządzenia, łącz je liniami,
twórz opisy, prostokąty i kolejne widoki. Edytor zawiera narzędzia FossFLOW:
cofanie/ponawianie, ustawienia skrótów, wybór ikon i import własnych grafik.
Menu edytora pozwala eksportować PNG. Narzędzia wewnątrz edytora pozostają
w języku angielskim; polski/angielski dotyczy nakładki HA i konfiguracji.

**Import JSON** przyjmuje pełny model FossFLOW z tablicami `items`, `views`,
`icons`, `colors`. Model jest dodatkowo walidowany schematem biblioteki.
Kompaktowy format JSON z menu niektórych wersji Isoflow nie jest obsługiwany
przez ten przycisk. Używaj pełnego eksportu. Eksport nakładki zawiera komplet
ikon dla przenośności. Zapis na serwerze pomija wbudowane ikony, a zachowuje
własne definicje; odtwarza wbudowane ikony z dołączonej biblioteki.

Na telefonie pasek akcji przewija się poziomo. Dokładna edycja dużych diagramów
będzie wygodniejsza na komputerze. Nie jest wymagane połączenie z usługą chmurową.
Zewnętrzne grafiki w zaimportowanym modelu mogą wymagać Internetu; własne
ikony zapisane jako data URL i dołączone biblioteki działają lokalnie.

## Wszystkie opcje

Po zmianie konfiguracji uruchom aplikację ponownie i odśwież otwarte strony.

| Opcja | Domyślnie | Działanie |
|---|---|---|
| `log_level` | `info` | `debug`, `info`, `warning`, `error` |
| `access_log` | `false` | Metoda/status/czas żądań, bez URL, haseł i tokenów |
| `storage_enabled` | `true` | Udostępnia trwały zapis na serwerze |
| `read_only` | `false` | Blokuje edycję i wszystkie operacje zapisujące |
| `max_diagram_size_mb` | `20` | Limit żądania diagramu: 1–100 MiB |
| `max_diagrams` | `500` | Limit diagramów: 1–5000 |
| `revisions_keep` | `20` | Poprzednie wersje na diagram: 0–100 |
| `backup_interval_hours` | `24` | Kopie co 1–168 godzin działania; 0 wyłącza |
| `backup_keep` | `7` | Liczba ostatnich kopii: 1–90 |
| `backup_to_share` | `false` | Dodatkowe kopie w `/share/fossflow-backups` |
| `autosave_seconds` | `5` | Zapis po 1–300 sekundach bez zmiany; 0 wyłącza |
| `language` | `pl` | `pl` lub `en` dla nakładki |
| `theme` | `system` | `system`, `light`, `dark` |
| `default_diagram_name` | `Moja sieć` | Nazwa nowego modelu, 1–100 znaków |
| `direct_access` | `false` | Osobny interfejs LAN na 8080 |
| `direct_username` | `fossflow` | Konto LAN: 1–64 znaki, litery/cyfry/`_ . -` |
| `direct_password` | puste | Hasło LAN; minimum 12 znaków po włączeniu LAN |
| `direct_session_hours` | `12` | Czas sesji LAN: 1–168 godzin |
| `direct_ssl` | `false` | HTTPS wyłącznie dla interfejsu LAN |
| `certfile` | `fullchain.pem` | Nazwa pliku certyfikatu w `/ssl` |
| `keyfile` | `privkey.pem` | Nazwa klucza prywatnego w `/ssl` |
| `compression_enabled` | `true` | Gzip dla tekstowych zasobów i API |
| `trash_keep_days` | `30` | Retencja kosza 0–365 dni; 0 wyłącza odzyskiwanie |
| `trash_max` | `100` | Maksymalnie 1–1000 pozycji kosza |
| `backup_on_start` | `true` | Kopia istniejących diagramów podczas startu |
| `backup_max_size_mb` | `100` | Limit zbiorczej kopii 1–100 MiB |
| `startup_diagram` | `new` | `new`: pusty diagram; `latest`: ostatnio zmieniony |
| `diagram_sort` | `modified` | `modified`, `name`, `created` dla listy diagramów |
| `browser_drafts` | `true` | Lokalny szkic; wyłącz na współdzielonej przeglądarce |
| `editor_grid` | `true` | Siatka płótna edytora |
| `external_icons` | `true` | Pozwól na obrazy HTTP/HTTPS; false ogranicza politykę CSP |

Rozmiary są podawane w MiB: 1 MiB = 1 048 576 bajtów. Limit importu i eksportu
zbiorczej kopii określa `backup_max_size_mb` (domyślnie 100 MiB), wraz z metadanymi JSON. Dla większej kolekcji
używaj backupu Home Assistant lub eksportuj pojedyncze diagramy.

Wysokie limity nie rezerwują miejsca. Historia może znacznie zwiększyć zajętość
dysku: liczba diagramów × rozmiar × liczba wersji. `revisions_keep` zmniejsza
historię konkretnego diagramu przy jego kolejnym zapisie lub usunięciu.

Motyw wpływa także na paletę narzędzi edytora. Po zmianie motywu systemu
odśwież stronę, aby zaktualizować motyw edytora; pasek nakładki reaguje na zmianę.

## Uruchamianie, skróty i diagnostyka

`startup_diagram: latest` otwiera najnowszy zapisany diagram. Gdy bieżąca
przeglądarka ma szkic do odzyskania, automatyczne otwarcie jest pomijane.
Opcja `diagram_sort` wpływa na listę, ale nie na wybór ostatnio zmienionego modelu.
`browser_drafts: false` blokuje nowe zapisy localStorage; istniejące szkice
możesz usunąć przez dane witryny w przeglądarce. Zmiana tokenu Ingress może
zmienić klucz szkicu. Przed ważnymi zmianami eksportuj JSON lub zapisz na serwerze.

Ctrl/Cmd+S zapisuje, Ctrl/Cmd+Shift+S tworzy kopię, Esc zamyka okno.
Okna ograniczają fokus klawiatury do własnych kontrolek i przy zamknięciu
przywracają go do przycisku. Pasek informuje o wykrytym braku połączenia.

**Diagnostyka** pokazuje liczbę i wielkość diagramów/kopii, kosz, wolne miejsce,
limity i harmonogram. Nie ujawnia hasła LAN ani lokalnych ścieżek serwera.
Konfigurację globalną zmienia się w zakładce Konfiguracja aplikacji Home Assistant;
wymaga restartu i odświeżenia strony. `external_icons: false` blokuje przez CSP
obrazy spoza domeny, a własne data URL i wbudowane biblioteki nadal działają.

## Ingress i porty

Domyślny sposób dostępu to **Otwórz interfejs WWW** i panel boczny.
Port 8099 jest wewnętrzny, nie ma mapowania LAN i akceptuje ruch interfejsu
wyłącznie od Supervisora `172.30.32.2`. Źródłowy adres jest odczytywany z połączenia,
a nie z nagłówka `X-Forwarded-For`. Ingress nie wymaga osobnego hasła.
`X-Ingress-Path` ustawia bazową ścieżkę dla HTML, zasobów, manifestu i API.

Panel jest domyślnie widoczny dla administratorów. Wszyscy użytkownicy z
rzeczywistym dostępem do aplikacji korzystają z tej samej kolekcji diagramów.
Brak osobnych przestrzeni roboczych i uprawnień do pojedynczego diagramu.

Interfejs nie rejestruje service workera. Chroni to przed buforowaniem API,
tokenów Ingress i przechwytywaniem stron Home Assistant. Tryb offline upstream
PWA nie jest tu oferowany. Jeśli w tej samej domenie był wcześniej instalowany
inny FossFLOW z service workerem, usuń jego rejestrację w narzędziach przeglądarki.

## Opcjonalny dostęp LAN

1. Ustaw `direct_access: true`, użytkownika i silne hasło min. 12 znaków.
2. W sekcji **Sieć** aplikacji przypisz port hosta do `8080/tcp`, np. `8080`.
3. Uruchom ponownie. Otwórz `http://ADRES_HA:8080` i zaloguj się.

Jest to osobne konto aplikacji, niezależne od kont Home Assistant. Sesja jest
przechowywana w ciasteczku HttpOnly/SameSite=Strict. Złe logowanie ma limit
5 prób na adres IP w 15 minut. Restart i wylogowanie unieważniają sesje.
Nie wystawiaj nieszyfrowanego interfejsu poza zaufany LAN. Dla zdalnego dostępu
preferuj Ingress przez bezpieczny adres HA albo skonfiguruj HTTPS.

Dla HTTPS ustaw `direct_ssl: true` i pliki PEM w `/ssl`. Nazwy plików są
względne do tego katalogu, bez slashy i `..`. Certyfikat musi pasować do domeny
używanej w przeglądarce. Ingress korzysta z HTTPS Home Assistant niezależnie
od tych ustawień. Przy TLS ciasteczko LAN ma także flagę Secure.
Ten port jest przeznaczony do bezpośredniego dostępu; konfiguracja podścieżek
i terminacji TLS w zewnętrznym reverse proxy nie jest częścią wersji 1.1.0.

## Dane, historia i kopie

| Lokalizacja w kontenerze | Zawartość |
|---|---|
| `/data/options.json` | Konfiguracja zarządzana przez Supervisor |
| `/data/diagrams/*.json` | Trwałe diagramy |
| `/data/revisions/ID/*.json` | Poprzednie wersje istniejących diagramów |
| `/data/trash/*.json` | Pełne usunięte diagramy z datą usunięcia |
| `/data/backups/*.json` | Lokalne zbiorcze kopie aplikacji |
| `/share/fossflow-backups/*.json` | Opcjonalne dodatkowe kopie |

Zapisy używają pliku tymczasowego, fsync i atomowego rename. Zmiany zapisu,
usuwania i kopii są serializowane. Pozostałość pliku `.tmp` po awarii nie jest
traktowana jako diagram. Serwer nie podąża za dowiązaniami w plikach diagramów.

**Historia** pokazuje poprzednie wersje bieżącego diagramu. Wczytanie wersji
tworzy niezapisany stan; kliknij Zapisz, aby przywrócić ją na serwerze.
Przywracana jest zawartość, a bieżąca wersja pozostaje w historii. Po usunięciu
pełna ostatnia wersja trafia do **Kosza** (jeśli `trash_keep_days > 0`). Historia
usuniętego ID jest czyszczona. Odzyskiwanie tworzy nowy ID i nie nadpisuje danych.
Kosz ma limit wieku i liczby wpisów; sprzątanie działa przy starcie, usuwaniu
oraz co godzinę. W trybie tylko do odczytu sprzątanie nie zapisuje danych,
a wygasłe wpisy są ukryte. **Usuń trwale** wymaga potwierdzenia.
Kosz nie jest częścią zbiorczej kopii JSON; obejmuje go pełny backup HA.

**Kopie → Utwórz kopię teraz** zapisuje wszystkie diagramy. Harmonogram
odlicza czas od startu aplikacji: restart zaczyna odliczanie od nowa.
`backup_on_start` dodatkowo zapisuje kopię podczas startu, gdy są diagramy;
nie działa w read-only. Błąd kopii jest logowany i nie blokuje dostępu do danych. Kopie
aplikacji nie obejmują historii, konfiguracji ani niezapisanych szkiców.
Przy `backup_to_share` nieudana kopia do share nie usuwa prawidłowej kopii lokalnej;
szczegóły pojawiają się w logach. Retencja obejmuje tylko pliki z wzorcem nazw
tworzonym przez FossFLOW, w jego własnym katalogu.

W panelu **Kopie** widać pliki zapisane na serwerze, ich daty i rozmiary.
**Pobierz** pobiera wybraną kopię. **Odzyskaj** importuje ją jako nowe diagramy
po potwierdzeniu. **Usuń trwale** usuwa wyłącznie wybraną kopię w `/data/backups`;
ewentualny plik w `/share` pozostaje do osobnego zarządzania.

**Pobierz wszystkie diagramy** pobiera kopię JSON bez zmiany danych serwera.
**Importuj kopię jako nowe diagramy** dodaje każdy diagram z nowym ID — nie
nadpisuje obecnych diagramów. Przy błędzie walidacji import nie rozpoczyna zapisu;
przy błędzie zapisu próbuje usunąć utworzone pliki. Nie jest transakcją odporną
na nagłą utratę zasilania podczas wieloplikowego importu.

Backup Home Assistant z zaznaczoną aplikacją zachowuje `/data` wraz z historią
i konfiguracją. Aplikacja używa `backup: cold`: Supervisor zatrzymuje ją na czas
kopii. Zawartość `/share` jest osobną kategorią backupu HA — zaznacz ją oddzielnie,
jeśli potrzebujesz również dodatkowych kopii share. Przed odinstalowaniem wykonaj
backup lub eksport; odinstalowanie aplikacji może usunąć jej `/data`.

## Aktualizacje

Źródło upstream i baza Docker są przypięte. Nie ma pobierania `latest` FossFLOW
ani instalacji npm podczas startu. Aktualizacja kodu aplikacji wymaga nowej wersji,
przeglądu zmian i przebudowania obrazu. Dla lokalnej instalacji skopiuj nowe pliki
aplikacji i odśwież sklep. Instalacja z repozytorium używa jego numeru wersji.
Przed aktualizacją wykonaj backup Home Assistant.

## Przejście z lokalnego ZIP do repozytorium

Lokalny dodatek i instalacja z repozytorium mogą mieć różne identyfikatory HA
oraz osobne katalogi danych. W starej instalacji pobierz zbiorczą kopię JSON.
Zainstaluj FossFLOW z repozytorium i zaimportuj kopię przez panel Kopie.
Sprawdź diagramy oraz własne ikony. Zbiorczy JSON przenosi diagramy;
historię, konfigurację i kosz zachowuje pełny backup starej aplikacji HA.

## Rozwiązywanie problemów

| Objaw | Co sprawdzić |
|---|---|
| Aplikacji nie ma w sklepie | Lokalny katalog, poziom `fossflow/config.yaml`, odświeżenie sklepu |
| Instalacja długo trwa | Log budowania, Internet, wolny RAM/dysk; pierwszy build kompiluje edytor |
| Pusta strona | Logi, konsola przeglądarki, odświeżenie bez cache, stary service worker |
| 403 przy wejściu na 8099 | Ten port celowo przyjmuje tylko Supervisor; użyj Ingress lub LAN 8080 |
| LAN nie działa | `direct_access`, hasło min. 12 znaków, mapowanie portu, restart |
| Błąd pliku certyfikatu | Pliki `/ssl`, poprawne nazwy, PEM, uprawnienia |
| Konflikt diagramu | Wczytaj aktualny diagram lub wybierz Zapisz kopię |
| Brak autosave | Najpierw Zapisz; sprawdź interwał, read_only, połączenie i konflikt |
| Brak kopii share | Opcja `backup_to_share`, logi i uprawnienia share |
| AppArmor DENIED | Zbierz dokładną odmowę z logów hosta i uzupełnij profil po analizie |

Nie wyłączaj trybu ochrony jako domyślnego rozwiązania. Aplikacja nie wymaga
host_network, Docker API, NET_ADMIN, SYS_ADMIN, dostępu do encji ani tokenu HA.
Profil AppArmor jest dołączony, ale jego egzekwowanie musi zostać potwierdzone
na docelowym systemie. Szczegóły testu: `docs/HA_ACCEPTANCE.md` w pakiecie.

## Samodzielny Docker

W Home Assistant Container nie ma Ingress Supervisora. Można uruchomić sam
interfejs LAN. Na komputerze z Docker:

```sh
docker build -t fossflow-ha:1.1.0 ./fossflow
mkdir -p ./data
```

Zapisz `data/options.json` jako poprawny JSON, ustawiając co najmniej
`direct_access: true`, `direct_username` i `direct_password` min. 12 znaków.
Można podać tylko zmienione opcje; pozostałe mają bezpieczne wartości domyślne.

```sh
docker run -d --name fossflow --restart unless-stopped \
  -p 8080:8080 -v "$PWD/data:/data" fossflow-ha:1.1.0
```

Otwórz `http://ADRES_KOMPUTERA:8080`. Nie publikuj portu 8099. Dla kopii share
dodaj osobne mapowanie `/share`; dla HTTPS mapowanie `/ssl:ro`. AppArmor z pakietu
jest automatycznie ładowany przez Supervisor; zwykły Docker używa własnego profilu.
