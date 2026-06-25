#!/bin/bash
# DART 데이터 동기화 스크립트
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && source "$NVM_DIR/nvm.sh"

cd "$(dirname "$0")/server"
echo "DART 동기화 시작..."
npm run sync:dart
