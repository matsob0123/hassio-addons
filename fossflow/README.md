# FossFLOW

Izometryczny edytor diagramów infrastruktury jako aplikacja Home Assistant.

- Ingress i panel boczny z logowaniem Home Assistant.
- Trwały zapis JSON, automatyczny zapis, ochrona przed konfliktami.
- Historia wersji, kosz z odzyskiwaniem i retencją oraz kopie lokalne i `/share`.
- Przeglądanie, pobieranie, odtwarzanie i usuwanie zapisanych kopii.
- 31 opcji konfiguracji z opisami PL/EN, diagnostyka, skróty i otwieranie ostatniego diagramu.
- Import/eksport JSON, eksport PNG w menu edytora, własne ikony.
- Biblioteki ikon infrastruktury, AWS, Azure, Google Cloud i Kubernetes.
- Polski/angielski panel, motyw systemowy/jasny/ciemny i tryb tylko do odczytu.
- Opcjonalny osobny interfejs LAN z hasłem, sesjami i HTTPS.
- AppArmor, watchdog, cold backup, amd64 i aarch64.

Pierwszy zapis: podaj nazwę i kliknij **Zapisz**. Dane będą w `/data/diagrams`.
Przy pierwszej instalacji obraz buduje się lokalnie i wymaga dostępu do Internetu.
Przy kolejnych startach nie pobiera pakietów.

Wersja experimental: integracja z rzeczywistym Supervisor i profil AppArmor
wymagają testu na urządzeniu. [Dokumentacja](DOCS.md).

## Instalacja z repozytorium

Dodaj `https://github.com/matsob0123/hassio-addons` w Home Assistant:
Ustawienia → Dodatki/Aplikacje → Sklep → ⋮ → Repozytoria. Odśwież sklep,
znajdź **FossFLOW**, zainstaluj i uruchom. **Otwórz interfejs WWW** korzysta z Ingress.
Port LAN pozostaw wyłączony, jeśli korzystasz z panelu HA.

[Pełna konfiguracja](DOCS.md) · [Raport testów](docs/TEST_REPORT.md) ·
[Test na HA OS](docs/HA_ACCEPTANCE.md) · [Rozwój i testy](tests/README.md).
