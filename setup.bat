@echo off
echo ChatGPT Clone Setup
echo ===================

echo Setting up backend...
cd backend

echo Creating virtual environment...
python -m venv venv

echo Activating virtual environment...
call venv\Scripts\activate

echo Installing Python dependencies...
pip install -r requirements.txt

echo Creating .env file...
if not exist .env (
    echo OPENAI_API_KEY=your_openai_api_key_here > .env
    echo Please edit backend\.env and add your OpenAI API key
)

cd ..

echo Setting up frontend...
cd frontend

echo Installing Node.js dependencies...
npm install

cd ..

echo.
echo ===================
echo Setup completed!
echo.
echo Next steps:
echo 1. Edit backend\.env and add your OpenAI API key
echo 2. Start the backend: cd backend ^&^& python app.py
echo 3. Start the frontend: cd frontend ^&^& npm start
echo 4. Open http://localhost:3000 in your browser
echo.
pause
