#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
: "${NINI_STORAGE_ROOT:=/var/lib/nini-chat/storage}"
: "${BACKUP_DIR:=/var/backups/nini-chat}"
: "${BACKUP_PASSPHRASE:?Inject BACKUP_PASSPHRASE from a secret manager}"
: "${RETENTION_DAYS:=14}"
: "${OFFSITE_DIR:=}"
[[ -d "$NINI_STORAGE_ROOT" ]] || { echo "Storage root not found" >&2; exit 2; }
mkdir -p "$BACKUP_DIR"; chmod 700 "$BACKUP_DIR"
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
tmp="$BACKUP_DIR/.storage-$stamp.tar.gz"; out="$BACKUP_DIR/storage-$stamp.tar.gz.enc"
trap 'rm -f "$tmp"' EXIT
tar --numeric-owner --acls --xattrs -czf "$tmp" -C "$(dirname "$NINI_STORAGE_ROOT")" "$(basename "$NINI_STORAGE_ROOT")"
openssl enc -aes-256-cbc -pbkdf2 -salt -in "$tmp" -out "$out" -pass env:BACKUP_PASSPHRASE
sha256sum "$out" > "$out.sha256"; chmod 600 "$out" "$out.sha256"; rm -f "$tmp"; trap - EXIT
if [[ -n "$OFFSITE_DIR" ]]; then mkdir -p "$OFFSITE_DIR"; cp -p "$out" "$out.sha256" "$OFFSITE_DIR/"; fi
find "$BACKUP_DIR" -type f -name 'storage-*.tar.gz.enc*' -mtime "+$RETENTION_DAYS" -delete
echo "Encrypted storage backup created: $out"
