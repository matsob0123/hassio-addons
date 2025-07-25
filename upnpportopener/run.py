import miniupnpc
import sys
import json
import os

print("=== UPnP Port Forwarding Addon ===")

# Pobieranie konfiguracji z pliku environment variable ADDON_CONFIG JSON
config_json = os.getenv('ADDON_CONFIG')

if not config_json:
    print("❌ Brak konfiguracji ADDON_CONFIG")
    sys.exit(1)

try:
    config = json.loads(config_json)
    external_port = int(config.get("external_port"))
    internal_port = int(config.get("internal_port"))
    protocol = config.get("protocol", "").strip().upper()
    description = config.get("description", "").strip()

    if protocol not in ('TCP', 'UDP'):
        raise ValueError("Niepoprawny protokół. Wprowadź TCP lub UDP.")

except Exception as e:
    print("❌ Błąd konfiguracji:", e)
    sys.exit(1)

print(f"Konfiguracja: external_port={external_port}, internal_port={internal_port}, protocol={protocol}, description='{description}'")

upnp = miniupnpc.UPnP()
upnp.discoverdelay = 200

print("\n🔍 Wyszukiwanie urządzeń UPnP...")
devices = upnp.discover()
print(f"🔧 Znaleziono {devices} urządzeń.")

try:
    upnp.selectigd()
except Exception as e:
    print("❌ Nie udało się połączyć z routerem UPnP:", e)
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
    result = upnp.addportmapping(
        external_port,
        protocol,
        internal_client,
        internal_port,
        description,
        ''
    )
    if result:
        print(f"✅ Port {external_port} {protocol} został przekierowany na {internal_client}:{internal_port}")
    else:
        print(f"⚠️ Nie udało się otworzyć portu {external_port}")
except Exception as e:
    print("❌ Błąd podczas otwierania portu:", e)
