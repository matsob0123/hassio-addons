# Rozwój FossFLOW

Z katalogu `fossflow/`, Node >=22 i Python z PyYAML:

```sh
npm ci
npm run check
npm test
npm run build:frontend
node .work/upstream/node_modules/typescript/bin/tsc --noEmit -p .work/upstream/packages/fossflow-app/tsconfig.json
npx playwright install --with-deps chromium
npm run test:e2e
```

Frontend powstaje z przypiętego `vendor/fossflow.tar.gz` i nakładki `frontend/`.
Testy uruchamiają prawdziwy runtime w katalogach tymczasowych, a browser suite
prawdziwy edytor w iframe za lokalną bramą emulującą Ingress. Test TLS generuje
jednorazowe pliki PEM w katalogu tymczasowym; wymaga narzędzia OpenSSL.

CI `.github/workflows/fossflow.yaml` korzysta z `.github/workflows/fossflow-ci.yaml` i dodatkowo buduje obrazy amd64 i aarch64,
uruchamia testy w docelowym Node 22 Alpine i weryfikuje start, health oraz SIGTERM.
Wyniki browser/PNG i screenshoty publikuje jako artefakty workflow.

Nie jest to test działającego Supervisor. Procedura urządzenia:
[HA_ACCEPTANCE.md](../docs/HA_ACCEPTANCE.md).


`npm test` wykonuje 43 testy runtime i 13 aktualizatora. Aktualizator testowany
jest z mockiem rejestru, rzeczywistymi tymczasowymi repozytoriami git i bare origin:
interwał przez granice miesięcy/lat, digests/platformy, błędy sieci, wersje,
odrzucanie zmodyfikowanego artefaktu, atomic push, konflikt main i istniejący tag.
Runtime testuje również env bez wycieku, limity, retencję wieku, deduplicację,
507, deadline po restarcie i rzeczywisty proces z TZ/SIGTERM/shutdown backup.

CI odczytuje prawdziwy rejestr bez publikacji, przesyła plan jako artefakt i stosuje
jego zweryfikowaną zawartość w reusable workflow. Jeśli baza zmieniła się już
w czasie PR, dodatkowo testuje kod z oryginalnym pinem PR. Testy obrazu obejmują
43 scenariusze runtime na każdej architekturze; git/registry testy działają na hoście.
Szczegóły publikacji: [UPDATES.md](../docs/UPDATES.md).
