#!/bin/sh
# Tree-shaken, minified three@0.187.0 for works/perfume/vendor/three.min.js
#   npm pack three@0.187.0 && tar -xzf three-0.187.0.tgz   (into $NPM_DIR/three)
#   npm install esbuild@0.25.10                            (into $ESB_DIR)
# usage: sh build-three.sh <dir containing node_modules/three or three/package> <esbuild binary> <out file>
set -e
THREE_PKG="$1"; ESBUILD="$2"; OUT="$3"
"$ESBUILD" three-entry.js --bundle --format=esm --minify --legal-comments=eof \
  --alias:three="$THREE_PKG/build/three.module.js" --outfile="$OUT"
