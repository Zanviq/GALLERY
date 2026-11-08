#!/bin/sh
# usage: sh shot.sh <url> <out.png> <width> <height> [budget-ms]
CHROME="/c/Program Files/Google/Chrome/Application/chrome.exe"
PROFILE="$(dirname "$2")/chrome-profile-$$"
"$CHROME" --headless=new --hide-scrollbars --window-size="$3,$4" --virtual-time-budget="${5:-8000}" \
  --enable-unsafe-swiftshader --use-angle=swiftshader --user-data-dir="$PROFILE" --no-first-run --disable-extensions \
  --screenshot="$2" "$1" 2>/dev/null
rm -rf "$PROFILE"
