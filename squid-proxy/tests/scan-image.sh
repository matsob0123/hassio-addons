#!/usr/bin/env bash
set -euo pipefail
# Official Trivy 0.76.0 release assets; SHA256 matches GitHub release metadata.
case "$(uname -m)" in
  x86_64) asset=Linux-64bit; checksum=e24b1c51293c1b15e4ba8d45bbc7891ba053f90278ec2698f3562c993e145fe7 ;;
  aarch64) asset=Linux-ARM64; checksum=aab21e677a7b7071fc79f1711480840754c18a1b9d9cefa7ccd06af63a0e8f4c ;;
  *) echo 'Unsupported scanner architecture' >&2; exit 1 ;;
esac
scanner_dir=$(mktemp -d)
trap 'rm -rf "$scanner_dir"' EXIT
curl -fSL --proto '=https' --proto-redir '=https' --tlsv1.2 \
  "https://github.com/aquasecurity/trivy/releases/download/v0.76.0/trivy_0.76.0_${asset}.tar.gz" -o "$scanner_dir/trivy.tar.gz"
printf '%s  %s\n' "$checksum" "$scanner_dir/trivy.tar.gz" | sha256sum -c -
tar -xzf "$scanner_dir/trivy.tar.gz" -C "$scanner_dir" trivy
mkdir -p squid-proxy/test-results
# Squid is compiled from source, so APK detection covers OS packages, not Squid.
# Squid release/advisory review remains a separate maintenance requirement.
"$scanner_dir/trivy" image --scanners vuln --severity HIGH,CRITICAL --exit-code 1 \
  --format json --output squid-proxy/test-results/vulnerabilities.json squid-ha:test
