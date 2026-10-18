from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
import sys
class H(SimpleHTTPRequestHandler):
 def translate_path(self,path):
  p=super().translate_path(path)
  if not Path(p).exists() and Path(p+'.html').exists():p+='.html'
  return p
 def log_message(self,*args):pass
ThreadingHTTPServer(('127.0.0.1',int(sys.argv[2])),lambda *args,**kw:H(*args,directory=sys.argv[1],**kw)).serve_forever()
