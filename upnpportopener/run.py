import miniupnpc
import sys
import json
import os
import time

print("=== UPnP Port Forwarding Addon ===")

CONFIG_PATH = '/data/options.json'

# W środowisku testowym, plik /data/options.json może nie istnieć.
# Możemy użyć lokalnego config.json do testów.
if not os.path.exists(CONFIG_PATH):
    print(f"⚠️  Plik {CONFIG_PATH} nie znaleziony. Próbuję wczytać lokalny 'config.json' do celów testowych.")
    # W dodatku Home Assistant ten plik powinien zawsze istnieć.
    # Używamy opcji z pliku config.json, który jest w repozytorium.
    CONFIG_PATH = 'config.json' 
    if not os.path.exists(CONFIG_PATH):
        print(f"❌ Brak pliku konfiguracyjnego w {CONFIG_PATH} oraz w lokalizacji testowej.")
        sys.exit(1)


try:
    # Wczytaj całą konfigurację
    with open(CONFIG_PATH, 'r') as f:
        full_config = json.load(f)

    # W przypadku lokalnego config.json, opcje są w kluczu "options"
    if 'options' in full_config:
        config = full_config.get('options')
    else:
        # W /data/options.json opcje są na najwyższym poziomie
        config = full_config

    external_port = int(config.get("external_port"))
    internal_port = int(config.get("internal_port"))
    protocol = config.get("protocol", "").strip().upper()
    description = config.get("description", "").strip()

    if not all([external_port, internal_port, protocol, description]):
        raise ValueError("Brak wszystkich wymaganych opcji w konfiguracji.")

    if protocol not in ('TCP', 'UDP'):
        raise ValueError("Niepoprawny protokół. Wprowadź TCP lub UDP.")

except Exception as e:
    print(f"❌ Błąd konfiguracji: {e}")
    sys.exit(1)

print(f"Konfiguracja: external_port={external_port}, internal_port={internal_port}, protocol={protocol}, description='{description}'")

try:
    upnp = miniupnpc.UPnP()
    upnp.discoverdelay = 200

    print("\n🔍 Wyszukiwanie urządzeń UPnP...")
    # Dajemy więcej czasu na odkrycie, szczególnie w wolniejszych sieciach
    devices = upnp.discover()
    print(f"🔧 Znaleziono {devices} urządzeń.")

    if devices == 0:
        print("❌ Nie znaleziono żadnych urządzeń UPnP w sieci. Upewnij się, że UPnP jest włączone na routerze.")
        sys.exit(1)

    upnp.selectigd()
    print("✅ Połączono z routerem (IGD).")

except Exception as e:
    print(f"❌ Nie udało się połączyć z routerem UPnP: {e}")
    sys.exit(1)

print("📡 Lokalny adres IP:", upnp.lanaddr)
try:
    external_ip = upnp.externalipaddress()
    print("🌐 Zewnętrzny adres IP:", external_ip)
except Exception as e:
    print("⚠️ Nie udało się pobrać zewnętrznego IP:", e)

internal_client = upnp.lanaddr

print(f"\n🛠️ Przekierowywanie portu {external_port}/{protocol} na {internal_client}:{internal_port}...")
try:
    # Sprawdzenie, czy mapowanie już istnieje
    existing_mapping = upnp.getspecificportmapping(external_port, protocol)
    if existing_mapping:
        print(f"ℹ️  Przekierowanie dla portu {external_port}/{protocol} już istnieje: {existing_mapping}")
    else:
        result = upnp.addportmapping(
            external_port,
            protocol,
            internal_client,
            internal_port,
            description,
            ''
        )
        if result:
            print(f"✅ Port {external_port} {protocol} został pomyślnie przekierowany na {internal_client}:{internal_port}")
        else:
            print(f"⚠️ Nie udało się otworzyć portu {external_port}. Sprawdź ustawienia routera.")
except Exception as e:
    print(f"❌ Błąd podczas otwierania portu: {e}")

# Skrypt się zakończy, co jest zgodne z "startup": "application"
# Jeśli chcesz, aby działał ciągle (np. odświeżał przekierowanie),
# musiałbyś dodać pętlę, np. `while True: time.sleep(3600)`
print("\n🎉 Zakończono działanie skryptu.")

