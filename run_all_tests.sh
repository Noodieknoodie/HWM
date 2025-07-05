#!/bin/bash
# run_all_tests.sh

echo "===================="
echo "Running All Tests"
echo "===================="

# Backend Tests
echo ""
echo "Running Backend Tests..."
echo "----------------------"
cd backend

# Check if virtual environment exists
if [ -d ".venv" ]; then
    echo "Activating virtual environment..."
    source .venv/bin/activate
else
    echo "Creating virtual environment..."
    python -m venv .venv
    source .venv/bin/activate
    echo "Installing backend dependencies..."
    pip install -r requirements.txt
fi

# Run backend tests
python -m pytest tests/ -v --tb=short

BACKEND_RESULT=$?

# Deactivate virtual environment
deactivate

cd ..

# Frontend Tests
echo ""
echo "Running Frontend Tests..."
echo "------------------------"
cd frontend

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing frontend dependencies..."
    npm install
fi

# Run frontend tests
npm test -- --run

FRONTEND_RESULT=$?

cd ..

# Summary
echo ""
echo "===================="
echo "Test Summary"
echo "===================="

if [ $BACKEND_RESULT -eq 0 ]; then
    echo "✅ Backend tests passed"
else
    echo "❌ Backend tests failed"
fi

if [ $FRONTEND_RESULT -eq 0 ]; then
    echo "✅ Frontend tests passed"
else
    echo "❌ Frontend tests failed"
fi

# Exit with failure if any tests failed
if [ $BACKEND_RESULT -ne 0 ] || [ $FRONTEND_RESULT -ne 0 ]; then
    exit 1
fi

echo ""
echo "All tests passed! 🎉"
exit 0