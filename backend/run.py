"""Run the Flask dev server (use this instead of `python app.py`)."""
from app import create_app

app = create_app()

if __name__ == "__main__":
    app.run(debug=True, port=5000)
