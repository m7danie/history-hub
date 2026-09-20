"""Local-only AI bridge. Provider credentials never enter frontend responses."""
import asyncio
import json
import os
import secrets
import sys
import threading
import traceback
import re
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

# Import with error handling
try:
    from ai_service import GenerationError, analyze_notes, generate_flashcards, generate_practice_test, extract_notes_from_file
    import storage
except ImportError as e:
    print(f"Import error: {e}", file=sys.stderr)
    traceback.print_exc()
    sys.exit(1)

# Verify local dependencies and Ollama at startup
def check_dependencies():
    errors = []

    try:
        import pydantic  # noqa: F401
        print("  [OK] pydantic")
    except ImportError:
        errors.append("pydantic (pip install pydantic)")

    try:
        import pymupdf  # noqa: F401
        print("  [OK] PyMuPDF")
    except ImportError:
        try:
            import fitz  # noqa: F401
            print("  [OK] PyMuPDF (fitz)")
        except ImportError:
            errors.append("PyMuPDF (pip install PyMuPDF)")

    try:
        from urllib import request as urlrequest
        with urlrequest.urlopen("http://127.0.0.1:11434/api/tags", timeout=3) as response:
            if response.status == 200:
                print("  [OK] Ollama is running")
    except Exception:
        errors.append("Ollama is not reachable. Open the Ollama app first.")

    return errors

TOKEN = secrets.token_urlsafe(32)
GATE = threading.Lock()
ALLOWED_HOSTS = {"127.0.0.1:8766", "localhost:8766", "127.0.0.1:5173", "localhost:5173", "127.0.0.1:4173", "localhost:4173"}
ALLOWED_ORIGINS = {"http://" + host for host in ALLOWED_HOSTS}


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *_):
        pass  # Never log notes, credentials, or provider exception bodies.

    def send_json(self, code, data):
        raw = json.dumps(data).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(raw)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.end_headers()
        self.wfile.write(raw)

    def trusted(self):
        return self.headers.get("Host") in ALLOWED_HOSTS and self.headers.get("Origin", "http://127.0.0.1:8766") in ALLOWED_ORIGINS

    def do_GET(self):
        if not self.trusted():
            return self.send_json(403, {"error": "Untrusted origin."})
        if self.path == "/api/session":
            return self.send_json(200, {"token": TOKEN})
        if self.path == "/api/sets":
            return self.send_json(200, {"sets": storage.get_all_sets()})
        if self.path.startswith("/api/sets/"):
            set_id = self.path[len("/api/sets/"):]
            study_set = storage.get_set(set_id)
            if study_set:
                return self.send_json(200, study_set)
            return self.send_json(404, {"error": "Study set not found."})
        return self.send_json(404, {"error": "Not found."})

    def parse_multipart(self):
        """Parse multipart form data and return (file_bytes, filename)."""
        content_type = self.headers.get("Content-Type", "")
        if "boundary=" not in content_type:
            return None, None
        boundary = content_type.split("boundary=")[1].strip()
        if boundary.startswith('"') and boundary.endswith('"'):
            boundary = boundary[1:-1]
        
        length = int(self.headers.get("Content-Length", "0"))
        body = self.rfile.read(length)
        
        # Split by boundary and find the file part
        parts = body.split(b"--" + boundary.encode())
        for part in parts:
            if b'filename="' in part:
                # Extract filename
                header_end = part.find(b"\r\n\r\n")
                if header_end == -1:
                    continue
                header = part[:header_end].decode("utf-8", errors="ignore")
                match = re.search(r'filename="([^"]+)"', header)
                filename = match.group(1) if match else "upload"
                # Extract file content
                content = part[header_end + 4:]
                # Remove trailing boundary markers
                if content.endswith(b"\r\n"):
                    content = content[:-2]
                if content.endswith(b"--"):
                    content = content[:-2]
                if content.endswith(b"\r\n"):
                    content = content[:-2]
                return content, filename
        return None, None

    def do_POST(self):
        if not self.trusted() or self.headers.get("X-History-Token") != TOKEN:
            return self.send_json(403, {"error": "Reload the page to reconnect securely."})
        
        # Study set CRUD (no gate needed)
        if self.path == "/api/sets":
            try:
                length = int(self.headers.get("Content-Length", "0"))
                data = json.loads(self.rfile.read(length))
                saved = storage.save_set(data)
                return self.send_json(200, saved)
            except Exception as e:
                return self.send_json(400, {"error": str(e)})
        
        if self.path.startswith("/api/sets/") and self.path.endswith("/delete"):
            set_id = self.path[len("/api/sets/"):-len("/delete")]
            if storage.delete_set(set_id):
                return self.send_json(200, {"ok": True})
            return self.send_json(404, {"error": "Study set not found."})
        
        # AI operations (need gate)
        if self.path not in ("/api/analyze", "/api/flashcards", "/api/practice-test", "/api/extract-notes"):
            return self.send_json(404, {"error": "Not found."})
        if not GATE.acquire(blocking=False):
            return self.send_json(429, {"error": "Another request is running. Please wait and try again."})
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if not 0 < length <= 30000000:  # 30MB for file uploads
                return self.send_json(413, {"error": "File is too large. Upload files under 30MB."})
            
            if self.path == "/api/extract-notes":
                print("[extract-notes] Parsing multipart...", flush=True)
                try:
                    file_bytes, filename = self.parse_multipart()
                except Exception as e:
                    print(f"[extract-notes] Multipart parse error: {e}", flush=True)
                    traceback.print_exc()
                    return self.send_json(400, {"error": f"Could not parse upload: {e}"})
                
                if not file_bytes:
                    print("[extract-notes] No file in request", flush=True)
                    return self.send_json(400, {"error": "No file uploaded."})
                
                print(f"[extract-notes] Got file: {filename}, {len(file_bytes)} bytes", flush=True)
                
                try:
                    text = extract_notes_from_file(file_bytes, filename)
                    print(f"[extract-notes] Success! Extracted {len(text)} chars", flush=True)
                    return self.send_json(200, {"text": text})
                except GenerationError as e:
                    print(f"[extract-notes] GenerationError: {e}", flush=True)
                    return self.send_json(422, {"error": str(e)})
                except Exception as e:
                    print(f"[extract-notes] Error: {e}", flush=True)
                    traceback.print_exc()
                    return self.send_json(500, {"error": str(e)})
            else:
                data = json.loads(self.rfile.read(length))
                if not isinstance(data, dict) or not isinstance(data.get("notes"), str):
                    return self.send_json(400, {"error": "Provide history notes as text."})
                if self.path == "/api/flashcards":
                    result = generate_flashcards(data["notes"])
                elif self.path == "/api/practice-test":
                    result = generate_practice_test(data["notes"])
                else:
                    result = asyncio.run(analyze_notes(data["notes"]))
                self.send_json(200, result)
        except GenerationError as error:
            self.send_json(422, {"error": str(error)})
        except (ValueError, TypeError):
            self.send_json(400, {"error": "Invalid request. Please try again."})
        except Exception:
            self.send_json(502, {"error": "The AI service is unavailable. Check your ChatGPT configuration and retry."})
        finally:
            GATE.release()


if __name__ == "__main__":
    print("History Hub AI bridge")
    print("Checking dependencies...")
    errors = check_dependencies()
    if errors:
        print("\nMissing dependencies:")
        for err in errors:
            print(f"  - {err}")
        print("\nFix these issues and try again.")
        sys.exit(1)
    print(f"\nServer ready: http://127.0.0.1:8766", flush=True)
    ThreadingHTTPServer(("127.0.0.1", 8766), Handler).serve_forever()
