# matsob0123 homeassistant addons

Repozytorium dodatków / aplikacji Home Assistant.

Dodaj w Home Assistant: **Ustawienia → Dodatki/Aplikacje → Sklep → ⋮ → Repozytoria**:

```text
https://github.com/matsob0123/hassio-addons
```

## FossFLOW

[FossFLOW](fossflow/README.md) pozwala rysować izometryczne diagramy sieci i infrastruktury.
Ma Ingress, autosave, historię, kosz, kopie zapasowe, import/eksport JSON i PNG,
45 opcji konfiguracji z opisami PL/EN, tryb tylko do odczytu i opcjonalny LAN HTTPS.
Obsługiwane architektury: amd64 i aarch64. Pierwsza instalacja buduje obraz Docker.

[Konfiguracja](fossflow/DOCS.md) · [Raport testów](fossflow/docs/TEST_REPORT.md).
Status experimental do czasu weryfikacji na prawdziwym HA OS/Supervisor.

Pozostałe dodatki: `npmportal`, `upnpportopener`, `tailscale`, `xteve`,
`temurin-21`, `temurin-22`, `temurin-23`. Starsze projekty są w `deprecated/`.

FossFLOW: [aktualizacje bazy Docker co 14 dni](fossflow/docs/UPDATES.md), własne env i pełne testy obu architektur.

## Squid Proxy

[Squid Proxy](squid-proxy/README.md): uwierzytelniany HTTP/CONNECT, opcjonalny TLS, własny DNS, konta, ACL sieci i domen, cache, 37 opcji PL/EN i lokalny panel Ingress. Squid7.7, procesy UID10001, profil AppArmor; amd64/aarch64.

[Konfiguracja](squid-proxy/DOCS.md) · [Bezpieczeństwo](squid-proxy/docs/SECURITY.md) · [Testy](squid-proxy/docs/TEST_REPORT.md). Status experimental do testów na HA OS.
