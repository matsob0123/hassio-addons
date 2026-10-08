# Test odbiorczy na docelowym Home Assistant

Ten test uzupełnia testy wykonane w środowisku developerskim. Do czasu jego
wykonania wydanie ma status experimental. Nie jest potrzebne wyłączanie
ochrony ani uprawnień hosta. Użyj kopii/diagramu testowego.

1. Zanotuj wersję HA OS, Core, Supervisora i architekturę urządzenia.
2. Skopiuj katalog do lokalnych aplikacji, odśwież sklep i zainstaluj.
   Sprawdź log budowania: checksum, npm ci, build biblioteki i aplikacji.
3. Uruchom z domyślnymi opcjami. Oczekiwane: komunikat `Ingress :8099`,
   brak npm install na starcie, brak błędów certyfikatu czy uprawnień.
4. Kliknij Otwórz interfejs WWW; dodaj panel boczny. Oczekiwane: edytor
   w ramce HA bez 404 dla JS/CSS/API i bez błędów w konsoli.
5. Zaimportuj `examples/domowa-siec.json`, kliknij Zapisz. Zmień nazwę/węzeł
   i poczekaj na informację o zapisie. Otwórz listę na drugim urządzeniu.
6. Edytuj ten sam model na dwóch urządzeniach. Oczekiwane: drugie zapisywanie
   starszej wersji pokazuje konflikt; Zapisz kopię zachowuje osobną wersję.
7. Historia → wczytaj wersję → Zapisz. Potwierdź odtworzenie węzłów i ikon.
8. Uruchom aplikację ponownie, potem HA OS ponownie. Diagramy muszą pozostać.
9. Utwórz kopię, pobierz zbiorczy JSON i zaimportuj. Oczekiwane: nowe ID,
   istniejące diagramy pozostają. Sprawdź działanie limitu retencji.
10. Włącz backup_to_share i sprawdź plik `/share/fossflow-backups` przez Samba/SSH.
11. Wykonaj backup HA z aplikacją. Odtwórz go na testowym systemie i potwierdź
    diagramy, historię i opcje. Przy backupie cold aplikacja może chwilowo się zatrzymać.
12. Włącz read_only i potwierdź brak edycji/zapisu/importu/usuwania, dostępny eksport.
13. Opcjonalnie włącz LAN z hasłem i mapowaniem portu. Potwierdź, że bez sesji
    API nie ujawnia diagramów; restart i wylogowanie zamykają sesję.
14. Opcjonalnie przetestuj TLS z prawdziwym certyfikatem domeny; Ingress nadal
    ma działać z HTTPS Home Assistant niezależnie od TLS LAN.
15. Sprawdź logi hosta pod kątem `apparmor="DENIED"`, zwłaszcza startu Node,
    fsync/rename, odczytu SSL, kopii share, backupu HA i zatrzymania aplikacji.
    Zapisz dokładną ścieżkę oraz operację odmowy; nie rozszerzaj profilu w ciemno.
16. Sprawdź watchdog: status zdrowy, kontrolowane zatrzymanie i ponowny start.
    Przetestuj iPhone/tablet, pionowy ekran, jasny i ciemny motyw.

Arkusz wyniku:

| Pole | Wynik do uzupełnienia |
|---|---|
| Wersje HA / Supervisor / OS | |
| Sprzęt / architektura | |
| Build Docker | |
| Ingress rzeczywisty | |
| AppArmor egzekwowany, brak odmów | |
| Zapis / autosave / konflikt | |
| Restart HA OS / trwałość | |
| Backup HA / odtworzenie | |
| LAN / TLS, jeśli używane | |
| iPhone / motyw | |

Po pozytywnym teście na obsługiwanych architekturach można promować wydanie
do stable i opublikować własne obrazy. Nie zwiększaj numeru jakości ani nie
deklaruj certyfikacji tylko dlatego, że build się udał.
