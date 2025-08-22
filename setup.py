#!/usr/bin/env python3
"""
Setup script for ChatGPT Clone
This script helps set up the project dependencies and environment.
"""

import os
import subprocess
import sys

def run_command(command, cwd=None):
    """Run a shell command and return the result."""
    try:
        result = subprocess.run(command, shell=True, check=True, cwd=cwd, capture_output=True, text=True)
        return result.stdout
    except subprocess.CalledProcessError as e:
        print(f"Error running command '{command}': {e}")
        return None

def setup_backend():
    """Set up the Python backend."""
    print("Setting up backend...")
    
    # Check if Python is installed
    if run_command("python --version") is None:
        print("Python is not installed or not in PATH")
        return False
    
    # Create virtual environment
    if not os.path.exists("backend/venv"):
        print("Creating virtual environment...")
        if run_command("python -m venv venv", cwd="backend") is None:
            return False
    
    # Install requirements
    print("Installing Python dependencies...")
    if run_command("pip install -r requirements.txt", cwd="backend") is None:
        return False
    
    # Create .env file if it doesn't exist
    if not os.path.exists("backend/.env"):
        print("Creating .env file...")
        with open("backend/.env", "w") as f:
            f.write("OPENAI_API_KEY=your_openai_api_key_here\n")
        print("Please edit backend/.env and add your OpenAI API key")
    
    return True

def setup_frontend():
    """Set up the React frontend."""
    print("Setting up frontend...")
    
    # Check if Node.js is installed
    if run_command("node --version") is None:
        print("Node.js is not installed or not in PATH")
        return False
    
    # Install npm dependencies
    print("Installing Node.js dependencies...")
    if run_command("npm install", cwd="frontend") is None:
        return False
    
    return True

def main():
    """Main setup function."""
    print("ChatGPT Clone Setup")
    print("=" * 50)
    
    # Check if we're in the right directory
    if not os.path.exists("backend") or not os.path.exists("frontend"):
        print("Please run this script from the project root directory")
        return
    
    # Setup backend
    if not setup_backend():
        print("Backend setup failed")
        return
    
    # Setup frontend
    if not setup_frontend():
        print("Frontend setup failed")
        return
    
    print("\n" + "=" * 50)
    print("Setup completed successfully!")
    print("\nNext steps:")
    print("1. Edit backend/.env and add your OpenAI API key")
    print("2. Start the backend: cd backend && python app.py")
    print("3. Start the frontend: cd frontend && npm start")
    print("4. Open http://localhost:3000 in your browser")

if __name__ == "__main__":
    main()
