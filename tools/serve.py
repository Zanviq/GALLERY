"""Local dev server that serves the site the way deploy/nginx.conf does.

    python tools/serve.py [port]      (default 8000, run from anywhere)

- /<slug>/... is served from works/<slug>/... (short work URLs), /<slug> redirects to /<slug>/
- /design/ is served too, so proposals stay viewable locally (nginx blocks it in production)
- JS gets a JavaScript MIME type (Windows' registry sometimes says text/plain, which breaks modules)
- nothing is cached, so edits show up on reload
"""
import http.server
import mimetypes
import os
import posixpath
import sys
import urllib.parse

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TYPES = {
    '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.css': 'text/css',
    '.svg': 'image/svg+xml', '.webp': 'image/webp', '.avif': 'image/avif', '.woff2': 'font/woff2',
    '.woff': 'font/woff', '.wasm': 'application/wasm', '.glb': 'model/gltf-binary', '.hdr': 'application/octet-stream',
}
for ext, kind in TYPES.items():
    mimetypes.add_type(kind, ext)


class Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {**http.server.SimpleHTTPRequestHandler.extensions_map, **TYPES}

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def _work_path(self):
        """Map /<slug>/rest to /works/<slug>/rest when the top-level path doesn't exist itself."""
        parts = urllib.parse.urlsplit(self.path)
        path = posixpath.normpath(urllib.parse.unquote(parts.path))
        segs = [s for s in path.split('/') if s]
        if not segs or os.path.exists(os.path.join(ROOT, segs[0])):
            return None
        if not os.path.isdir(os.path.join(ROOT, 'works', segs[0])):
            return None
        if len(segs) == 1 and not parts.path.endswith('/'):
            return ('redirect', '/' + segs[0] + '/' + (('?' + parts.query) if parts.query else ''))
        rest = parts.path.split('/', 2)[2] if parts.path.count('/') >= 2 else ''
        return ('rewrite', '/works/' + segs[0] + '/' + rest + (('?' + parts.query) if parts.query else ''))

    def _route(self):
        hit = self._work_path()
        if not hit:
            return True
        kind, target = hit
        if kind == 'redirect':
            self.send_response(301)
            self.send_header('Location', target)
            self.end_headers()
            return False
        self.path = target
        return True

    def do_GET(self):
        if self._route():
            super().do_GET()

    def do_HEAD(self):
        if self._route():
            super().do_HEAD()


if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    server = http.server.ThreadingHTTPServer(('', port), Handler)
    print('serving %s on http://127.0.0.1:%d' % (ROOT, port))
    server.serve_forever()
