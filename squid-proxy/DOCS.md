# Konfiguracja Squid Proxy

## Bezpieczny start

Wszystkie ustawienia zmienia się w zakładce Konfiguracja aplikacji HA, a następnie uruchamia ją ponownie. Panel jest tylko do odczytu. Zachowaj `apparmor: true` i tryb ochrony. Schemat HA oraz dodatkowa walidacja przy starcie odrzucają niepoprawne wartości; dodatek nie otwiera wtedy portów.

```yaml
proxy_user: squidadmin
proxy_password: "ZASTAP_TO_WLASNYM_DLUGIM_HASLEM"
allowed_networks:
  - 192.168.1.0/24
dns_servers:
  - 192.168.1.53
additional_users:
  - username: laptop
    password: "INNE_WLASNE_DLUGIE_HASLO"
custom_env:
  - name: TZ
    value: Europe/Warsaw
```

Adres DNS powyżej jest przykładem: podaj faktyczny adres swojego resolvera. Pusta lista używa DNS kontenera. DNS dotyczy zapytań obsługiwanych przez proxy, nie zmienia DNS HA, routera ani klientów. Domyślne `allowed_networks: [192.168.0.0/16]` warto zawęzić przed startem. Nie dodawaj wszystkich sieci bez potrzeby.

## Wszystkie opcje

Listy wpisuje się jako YAML. Hasła muszą mieć 16–72 bajty UTF-8, bez znaków sterujących. Maksymalnie 32 unikalne konta, 100 wpisów na listę sieci, 500 domen na listę, 8 serwerów DNS, 32 porty na listę i 32 własne zmienne.

| Opcja | Domyślnie | Znaczenie |
|---|---|---|
| `enable_http` | `true` | Nasłuch na 3128. Basic Auth na tym porcie nie szyfruje hasła. |
| `enable_https` | `false` | Nasłuch na 3129: szyfrowane połączenie klient–proxy. Nie jest to MITM stron HTTPS. |
| `auth_enabled` | `true` | Domyślnie włączone. Po wyłączeniu nadal obowiązuje ograniczenie sieci źródłowych. |
| `proxy_user` | `"squidadmin"` | 1–64 znaków: litery ASCII, cyfry, kropka, _ lub -. |
| `proxy_password` | `""` | Wymagane przy logowaniu: 16–72 bajty UTF-8. Przechowywane jako bcrypt w pliku runtime. |
| `additional_users` | `[]` | Do 31 kont username/password; nazwy nie mogą się powtarzać. |
| `allowed_networks` | `["192.168.0.0/16"]` | Lista CIDR. Domyślnie tylko 192.168.0.0/16. Nigdy nie jest pomijana po poprawnym logowaniu. |
| `denied_networks` | `[]` | Jawne blokady CIDR mają pierwszeństwo przed allowlistą. |
| `allow_public_clients` | `false` | Wymaga logowania i wyłącznie nasłuchu HTTPS. Domyślnie wyłączone. |
| `allow_private_destinations` | `false` | Dopuszcza prywatne cele. Loopback, link-local i sieć kontrolna Supervisora pozostają zablokowane. |
| `allowed_domains` | `[]` | Pusta lista oznacza brak filtra allow. .example.com lub *.example.com obejmuje poddomeny. |
| `blocked_domains` | `[]` | Denylista domen ma pierwszeństwo przed allowlistą. Bez URL i wyrażeń regularnych. |
| `dns_servers` | `[]` | Do 8 adresów IP. Pusta lista używa DNS kontenera. Dotyczy nazw rozwiązywanych przez proxy. |
| `http_safe_ports` | `[80, 443]` | Domyślnie 80 i 443. Niebezpieczne porty usług są odrzucane. |
| `https_connect_ports` | `[443]` | Domyślnie 443. Muszą należeć także do http_safe_ports. |
| `cache_mode` | `"off"` | off: bez cache; memory: RAM; disk: RAM i /data/cache. HTTPS CONNECT nie jest cacheowany. |
| `cache_mem_mb` | `64` | 8–1024 MiB; obowiązuje w trybie memory i disk. |
| `cache_disk_mb` | `512` | 64–32768 MiB; cache wyłączony z kopii HA. |
| `cache_max_object_mb` | `16` | 1–1024 MiB, nie więcej niż cache dyskowy. |
| `cache_object_memory_kb` | `512` | 1–16384 KiB, nie więcej niż przydzielona pamięć cache. |
| `max_connections_per_client` | `64` | 1–1024 jednoczesnych połączeń na źródłowy adres IP. |
| `request_body_max_mb` | `50` | 1–2048 MiB na ciało żądania HTTP. |
| `connect_timeout_seconds` | `15` | 1–120 sekund na połączenie do celu. |
| `request_timeout_seconds` | `60` | 5–600 sekund na otrzymanie żądania. |
| `read_timeout_seconds` | `120` | 5–1800 sekund bez danych od celu. |
| `client_lifetime_minutes` | `60` | 1–1440 minut; dotyczy także długich tuneli. |
| `shutdown_timeout_seconds` | `10` | 1–20 sekund na zakończenie aktywnych żądań. |
| `auth_cache_seconds` | `60` | 0–3600 sekund; restart unieważnia cache. |
| `access_log` | `false` | Domyślnie wyłączone. Po włączeniu: czas, metoda, status, bajty; bez URL i kont. |
| `log_client_ips` | `false` | Dodaje adres klienta tylko przy włączonym access_log. |
| `log_level` | `"info"` | info lub minimalne komunikaty warning/error; nigdy pełny dump konfiguracji. |
| `tls_mode` | `"files"` | files: PEM z /ssl; self_signed: lokalny certyfikat na 365 dni, do samodzielnego zaufania. |
| `certfile` | `"fullchain.pem"` | Zwykły plik PEM w /ssl, bez ścieżek i symlinków. |
| `keyfile` | `"privkey.pem"` | Zwykły plik klucza w /ssl; kopiowany do prywatnego katalogu runtime. |
| `tls_domain` | `"proxy.home.arpa"` | Nazwa DNS w certyfikacie self-signed, np. proxy.home.arpa. |
| `language` | `"pl"` | Polski lub angielski; komunikaty Squida pozostają angielskie. |
| `custom_env` | `[]` | Do 32 par name/value. Zmienne sterujące Pythonem, loaderem, HA i Squidem są chronione. |

## Sieci, porty i domeny

Najpierw sprawdzany jest prawdziwy adres klienta, następnie porty, metody, adres docelowy, domeny i uwierzytelnianie. Poprawne hasło nie omija blokady sieci. Nagłówki `X-Forwarded-For` nie nadają dostępu. `denied_networks` i `blocked_domains` mają pierwszeństwo.

Domyślnie dozwolone są porty docelowe 80 i 443, CONNECT tylko 443. Porty usług takich jak SMTP, SSH, SMB oraz porty administracyjne są odrzucane także przy ręcznej konfiguracji. CONNECT musi być podzbiorem portów bezpiecznych. Działają wyłącznie HTTP/CONNECT; brak FTP, transparentnego przechwytywania, SOCKS, ICAP i MITM.

`example.org` oznacza dokładną domenę, `.example.org` lub `*.example.org` domenę i subdomeny. Dozwolone są domeny IDN. Pusta lista dozwolonych nie ogranicza domen. To filtrowanie nazw żądań HTTP/CONNECT: nie analizuje treści TLS ani ścieżek HTTPS i nie gwarantuje blokowania całej usługi/CDN. Klient może ominąć proxy, jeśli sieć na to pozwala; to nie firewall.

Loopback, link-local, adresy metadata, multicast i sieć Supervisora `172.30.32.0/23` są zawsze zablokowane jako cele. Zwykłe sieci prywatne, CGNAT i ULA są również zablokowane, chyba że świadomie włączysz `allow_private_destinations`. Serwer DNS może znajdować się w LAN niezależnie od tej opcji. Ograniczenia chronią przed użyciem proxy do odpytywania usług wewnętrznych, ale nie zastępują firewalla ani separacji sieci.

Publiczny klient wymaga jednocześnie `allow_public_clients: true`, `auth_enabled: true`, `enable_https: true` i `enable_http: false`. Dodatkowo potrzebujesz certyfikatu, jawnego mapowania portu 3129 oraz reguł firewalla. Domyślne ustawienia nie otwierają publicznego proxy. Wyłączenie uwierzytelniania jest dopuszczalne tylko dla prywatnych sieci klientów i wymaga świadomej decyzji administratora.

## TLS klienta do proxy

```yaml
enable_http: false
enable_https: true
tls_mode: files
certfile: fullchain.pem
keyfile: privkey.pem
```

W sekcji Sieć HA przypisz port hosta do `3129/tcp`. Pliki pobierane są z `/ssl`, montowanego tylko do odczytu. Użyj ważnego certyfikatu dla nazwy, którą wpisujesz w kliencie. Może go odnawiać osobna aplikacja certyfikatów HA. Restart Squid Proxy wczytuje odnowione pliki. Niezgodna para, niepoprawny lub wygasły certyfikat blokuje start, bez obniżania do HTTP.

Alternatywa `tls_mode: self_signed` tworzy trwały klucz RSA3072 i certyfikat dla `tls_domain`. Odnawia go przy starcie, gdy do wygaśnięcia pozostaje mniej niż 30 dni lub zmienisz domenę. Klient musi ufać temu konkretnemu certyfikatowi; nie wyłączaj weryfikacji TLS. Nie ma serwera ACME ani przekierowania portu80. Kopia zapasowa HA obejmuje certyfikat i klucz w `/data/tls`; dla klienta certyfikat można bezpiecznie pobrać ze zdalnego połączenia TLS i porównać jego odcisk z zaufaną kopią. Panel celowo nie udostępnia kluczy.

Nie każdy klient wspiera HTTPS proxy lub uwierzytelnianie proxy. Niektóre aplikacje Android ignorują systemowe proxy. Testuj konkretną aplikację; dla klientów bez TLS proxy użyj zaufanej sieci/VPN. CONNECT przekazuje certyfikat strony bez podmiany; połączenie HTTPS do samego proxy to osobna warstwa ochrony.

## Cache, logi i zasoby

`off`: brak przechowywania odpowiedzi. `memory`: cache w RAM. `disk`: dodatkowy UFS w `/data/cache`; zachowuje zawartość po restarcie i jest wyłączony z backupu. HTTPS w tunelu CONNECT nie jest cache'owany. `cache_mem_mb` to budżet obiektów, a nie twardy limit RAM całego procesu; TLS, indeks i połączenia zużywają dodatkową pamięć. Na małych urządzeniach pozostaw cache wyłączony. Usuwanie cache wymaga zatrzymania aplikacji; nie edytuj plików podczas pracy.

Domyślnie logi dostępu są wyłączone. Po włączeniu zapisują czas, metodę, status, wielkość i czas odpowiedzi; opcjonalnie IP klienta. Format nie zawiera URL ani nazwy użytkownika. Log błędów Squida może zawierać informacje o błędnym żądaniu lub celu; nie traktuj logów jako całkowicie anonimowych. Historia i retencja stdout zależą od HA. Nie ustawiaj debugowania całego ruchu.

## Własne env

Zmienne przekazywane są jako wartości tekstowe bez `eval`, rozwijania `$()` ani powłoki. `TZ` obsługuje nazwy stref IANA. Pozostałe zmienne mają efekt tylko wtedy, gdy korzysta z nich proces lub biblioteka; nie zastępują opcji Squida. Nazwy `PATH`, `HOME`, zmienne loadera, Pythona, wewnętrzne `SQUID_*` i tokeny HA są chronione. Limit wartości 4 KiB, łącznie 32 KiB. Wartości są ukrywane w formularzu i nie trafiają do API panelu; opcje HA oraz ich backup nadal zawierają sekrety i trzeba je chronić.

## Panel, zdrowie i uprawnienia

Port8099 nie jest publikowany do LAN. Panel i `/api/status` wymagają rzeczywistego adresu Supervisora `172.30.32.2`. `/health` dopuszcza także localhost i sprawdza odpowiedź wewnętrznego menedżera Squida. Menedżer na127.0.0.1:13128 umożliwia wyłącznie GET info/counters i nie jest dostępny jako ogólne proxy. Awaria Squida kończy kontener, umożliwiając restart przez Supervisor. SIGTERM czeka na zakończenie połączeń do ustawionego limitu.

Bootstrap przygotowuje wyłącznie katalogi aplikacji, hasła i certyfikaty, po czym Python, Squid i helper uwierzytelniania działają jako UID/GID10001. Bez host_network, host_pid, privileged, Docker socket, urządzeń i tokenów HA. Profil AppArmor ogranicza odczyt/zapis i uruchamiane programy. Pozostaw włączony tryb ochrony. Docelowo konfiguracja spełnia kryteria najwyższej oceny HA 6/6; rzeczywistą ocenę pokazuje Supervisor po instalacji. Nie jest to gwarancja braku podatności.

## Migracja i diagnostyka

Ten dodatek pochodzi z innego repozytorium niż pierwotny projekt Nwus9XWK5UTy. HA nada mu inny identyfikator; instaluj go obok starego, przenieś ustawienia ręcznie i zatrzymaj stary przed użyciem tych samych portów. Nie kopiuj starego pliku Squid ani jego haseł w ciemno. Cache jest odtwarzalny. Własne certyfikaty przechowuj w `/ssl`. Przed zmianą wykonaj backup HA.

Brak startu: sprawdź długość hasła, CIDR, mapowanie portów i parę certyfikat/klucz. `407` oznacza brak/błąd logowania; `403` zwykle ACL; `503` niedostępność celu lub DNS. Jeżeli panel jest zdrowy, ale klient nie działa, sprawdź IP klienta, ustawienia aplikacji, firewall i obsługę proxy. `allow_private_destinations` nie służy do naprawiania publicznego DNS. Nie wyłączaj AppArmor w celu ukrycia błędu — zgłoś komunikat DENIED bez sekretów.
