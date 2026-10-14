import uvicorn
import os
import sys

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

if __name__ == "__main__":
    print("Starting Compiler Optimization Research API server on http://127.0.0.1:8000")
    uvicorn.run("backend.app.main:app", host="127.0.0.1", port=8000, reload=False, log_level="info")
