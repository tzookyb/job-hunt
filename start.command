#!/bin/zsh -il
# macOS launcher: double-click (or Open With → iTerm/Terminal) to start Job Hunt.
# Runs as a login + interactive shell so node from nvm, Homebrew etc. is on the PATH.
cd "${0:A:h}" || exit 1
if ! command -v node >/dev/null; then
  for d in /opt/homebrew/bin /usr/local/bin "$HOME"/.nvm/versions/node/*/bin(N) "$HOME"/.volta/bin; do
    [[ -x "$d/node" ]] && export PATH="$d:$PATH" && break
  done
fi
if ! command -v node >/dev/null; then
  echo "Couldn't find Node.js. Install it (https://nodejs.org or: brew install node) and try again."
else
  echo "Starting Job Hunt → http://localhost:${PORT:-4317}   (Ctrl+C to stop)"
  node server/index.js
fi
echo; echo "Server stopped. Press Enter to close this window."; read
