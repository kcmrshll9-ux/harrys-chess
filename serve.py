"""Harry's Chess local server: static files + distinctive /__health identity route."""
import os, sys
from http.server import SimpleHTTPRequestHandler as HTTPHandler, ThreadingHTTPServer

ROOT = os.path.dirname(os.path.abspath(__file__))

class H(HTTPHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=ROOT, **k)
    def log_request(self, *a):
        pass
    def log_message(self, *a):
        pass
    def log_error(self, *a):
        pass
    def do_GET(self):
        if self.path.rstrip('/') == '/__health':
            # Preserve the identity expected by existing installed launchers.
            body = b'{"app":"bowserchess","ok":true}'
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        return super().do_GET()

if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8778
    # Windows lets several processes bind the same port; stacked zombie servers make the
    # identity probe ambiguous. Be IDEMPOTENT: if a bowserchess server already answers the
    # port, exit 0 without binding another (launchers see success, no pileup).
    try:
        import urllib.request
        with urllib.request.urlopen('http://127.0.0.1:%d/__health' % port, timeout=2) as probe:
            if b'bowserchess' in probe.read():
                print("serve.py: Harry's Chess already owns port %d; not binding a second server." % port)
                sys.exit(0)
    except Exception:
        pass  # no answer (dead socket or foreign non-HTTP holder): fall through to bind/report
    # Honest diagnostics (finding fix): the old 'except Exception: pass' swallowed every
    # bind failure, so launchers could open a browser on a port nobody owned.
    # Now: failure is printed and exits non-zero; the PID file is written ONLY
    # after THIS process has actually bound the port (ownership proof for cleanup).
    try:
        srv = ThreadingHTTPServer(('127.0.0.1', port), H)
    except Exception as exc:
        sys.stderr.write('serve.py: cannot bind 127.0.0.1:%d: %r\n' % (port, exc))
        sys.exit(1)
    try:
        with open(os.path.join(ROOT, '.bowserchess.pid'), 'w') as pf:
            pf.write(str(os.getpid()))
    except Exception as exc:
        sys.stderr.write('serve.py: PID file not written: %r\n' % exc)
    print("serve.py: Harry's Chess serving on 127.0.0.1:%d (pid %d)" % (port, os.getpid()))
    srv.serve_forever()
