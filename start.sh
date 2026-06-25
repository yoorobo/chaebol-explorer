#!/bin/bash
# 재벌 지분구조 시각화 시스템 — 개발 서버 시작 스크립트
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && source "$NVM_DIR/nvm.sh"

ROOT="$(cd "$(dirname "$0")" && pwd)"

# 백엔드 서버 (포트 3001)
echo "[1/2] 백엔드 서버 시작 (port 3001)..."
cd "$ROOT/server" && npm run dev &
BACKEND_PID=$!

sleep 2

# 프론트엔드 서버 (포트 5173)
echo "[2/2] 프론트엔드 서버 시작 (port 5173)..."
cd "$ROOT" && npm run dev &
FRONTEND_PID=$!

echo ""
echo "✅ 서버 시작 완료"
echo "   프론트엔드: http://localhost:5173"
echo "   백엔드 API: http://localhost:3001"
echo ""
echo "종료: Ctrl+C"

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null" INT TERM
wait
