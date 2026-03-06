#!/usr/bin/env python3
"""
One-command startup: installs dependencies if needed, then runs backend + frontend.
Run from project root:  python start_chatbot.py
"""
import os
import subprocess
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(ROOT, "backend")
FRONTEND_DIR = os.path.join(ROOT, "frontend")
REQUIREMENTS = os.path.join(ROOT, "requirements.txt")


def run(cmd, cwd=None, shell=None):
    if shell is None:
        shell = sys.platform == "win32"
    return subprocess.run(cmd, cwd=cwd or ROOT, shell=shell)


def install_deps():
    """Install dependencies only if not already present (first run or after clean)."""
    need_pip = True
    if os.path.isfile(REQUIREMENTS):
        r = subprocess.run(
            [sys.executable, "-m", "pip", "show", "flask"],
            cwd=ROOT,
            capture_output=True,
        )
        need_pip = r.returncode != 0
    if need_pip and os.path.isfile(REQUIREMENTS):
        print("Installing Python dependencies (first run)...")
        run([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"])

    node_modules = os.path.join(FRONTEND_DIR, "node_modules")
    need_npm = (
        os.path.isdir(FRONTEND_DIR)
        and os.path.isfile(os.path.join(FRONTEND_DIR, "package.json"))
        and not os.path.isdir(node_modules)
    )
    if need_npm:
        print("Installing frontend dependencies (first run)...")
        run(["npm", "install"], cwd=FRONTEND_DIR)

    if need_pip or need_npm:
        print()


def main():
    os.chdir(ROOT)
    if not os.path.isdir(BACKEND_DIR) or not os.path.isdir(FRONTEND_DIR):
        print("Error: Run this script from the project root (folder containing backend/ and frontend/).")
        sys.exit(1)
    install_deps()
    print("Starting backend and frontend...")
    backend = subprocess.Popen(
        [sys.executable, "app.py"],
        cwd=BACKEND_DIR,
        stdout=sys.stdout,
        stderr=sys.stderr,
    )
    frontend = subprocess.Popen(
        ["npm", "start"],
        cwd=FRONTEND_DIR,
        shell=sys.platform == "win32",
        stdout=sys.stdout,
        stderr=sys.stderr,
    )
    try:
        backend.wait()
        frontend.wait()
    except KeyboardInterrupt:
        backend.terminate()
        frontend.terminate()
        backend.wait()
        frontend.wait()
    sys.exit(0)


if __name__ == "__main__":
    main()
