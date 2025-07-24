#!/bin/bash
set -e
set -x  # Włącz debugowanie

CONFIG_FILE="/data/options.json"

# Odczyt opcji z config.json
WORKDIR=$(jq -r '.WORKDIR // "/config/limbo"' "$CONFIG_FILE")
COMMAND=$(jq -r '.COMMAND // "java -jar limbo.jar --nogui"' "$CONFIG_FILE")
SELECTED_JAVA_VERSION=$(jq -r '.JAVA_VERSION // "21"' "$CONFIG_FILE") # Odczytaj wybraną wersję Javy

echo "--- Konfiguracja Dodatku ---"
echo "Wybrana wersja Javy: $SELECTED_JAVA_VERSION"
echo "Katalog Roboczy: $WORKDIR"
echo "Komenda: $COMMAND"
echo "--------------------------"

# Funkcja do instalacji konkretnej wersji OpenJDK (Temurin)
install_java_version() {
    local java_version=$1
    echo "⚙️ Sprawdzam i instaluję OpenJDK $java_version..."

    # Sprawdź, czy Java jest już zainstalowana
    if java -version 2>&1 | grep -q "openjdk version \"$java_version\."; then
        echo "✅ OpenJDK $java_version jest już zainstalowane."
        return 0
    fi

    # Dodaj klucz GPG i repozytorium Adoptium/Temurin
    # To jest ogólny sposób dodawania repozytorium OpenJDK/Temurin dla Ubuntu/Debian
    # Temurin dostarcza pakiety apt dla wielu wersji Javy
    if [ ! -f /etc/apt/sources.list.d/temurin.list ]; then
        echo "Dodaję repozytorium Temurin..."
        wget -qO - https://packages.adoptium.net/artifactory/api/apt/public/adoptium.asc | gpg --dearmor | tee /etc/apt/trusted.gpg.d/adoptium.gpg > /dev/null
        echo "deb https://packages.adoptium.net/artifactory/api/apt/public/ $(lsb_release -cs) main" | tee /etc/apt/sources.list.d/temurin.list
        apt-get update
    fi

    # Zainstaluj wybraną wersję OpenJDK (Temurin)
    local package_name="temurin-${java_version}-jdk"
    echo "Instaluję pakiet: $package_name"
    if ! apt-get install -y --no-install-recommends "$package_name"; then
        echo "❌ Nie udało się zainstalować OpenJDK $java_version. Sprawdź, czy ta wersja jest dostępna w repozytorium Temurin."
        echo "Kontynuuję z domyślną wersją Javy, jeśli jest zainstalowana."
        return 1
    fi

    # Ustaw domyślną wersję Javy za pomocą update-alternatives
    echo "Ustawiam OpenJDK $java_version jako domyślną wersję Javy..."
    update-alternatives --set java "/opt/jdk-temurin-${java_version}/bin/java" || true
    update-alternatives --set javac "/opt/jdk-temurin-${java_version}/bin/javac" || true
    echo "OpenJDK $java_version zainstalowane i ustawione jako domyślne."
    return 0
}

# Wywołaj funkcję instalacji z wybraną wersją Javy
install_java_version "$SELECTED_JAVA_VERSION"

echo "Sprawdzam aktualną wersję Javy:"
java -version

echo "Przechodzę do katalogu: $WORKDIR"
if ! cd "$WORKDIR"; then
  echo "❌ Nie mogę wejść do katalogu $WORKDIR"
  exit 1
fi

echo "▶️ Uruchamiam komendę: $COMMAND"
$COMMAND
EXITCODE=$?

echo "❗ Proces zakończył się z kodem $EXITCODE"