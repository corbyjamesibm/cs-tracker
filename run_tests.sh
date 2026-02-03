#!/bin/bash

# CS Tracker Test Runner
# Run this script to execute all tests after a commit

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}       CS Tracker Test Suite Runner             ${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""

# Parse command line arguments
RUN_BACKEND=true
RUN_E2E=true
RUN_COVERAGE=false
PARALLEL=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --backend-only)
            RUN_E2E=false
            shift
            ;;
        --e2e-only)
            RUN_BACKEND=false
            shift
            ;;
        --coverage)
            RUN_COVERAGE=true
            shift
            ;;
        --parallel)
            PARALLEL=true
            shift
            ;;
        --help)
            echo "Usage: ./run_tests.sh [options]"
            echo ""
            echo "Options:"
            echo "  --backend-only    Run only backend tests"
            echo "  --e2e-only        Run only E2E tests"
            echo "  --coverage        Generate coverage reports"
            echo "  --parallel        Run backend and E2E tests in parallel"
            echo "  --help            Show this help message"
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            exit 1
            ;;
    esac
done

# Check prerequisites
check_prerequisites() {
    echo -e "${YELLOW}Checking prerequisites...${NC}"

    # Check Python
    if ! command -v python3 &> /dev/null; then
        echo -e "${RED}Python 3 is required but not installed.${NC}"
        exit 1
    fi

    # Check Node.js (for Playwright)
    if $RUN_E2E && ! command -v node &> /dev/null; then
        echo -e "${RED}Node.js is required for E2E tests but not installed.${NC}"
        exit 1
    fi

    # Check if backend dependencies are installed
    if $RUN_BACKEND && ! python3 -c "import pytest" 2>/dev/null; then
        echo -e "${YELLOW}Installing backend test dependencies...${NC}"
        cd backend
        pip install -r requirements.txt
        pip install pytest-cov aiosqlite
        cd ..
    fi

    # Check if Playwright is installed
    if $RUN_E2E && [ ! -d "node_modules/@playwright" ]; then
        echo -e "${YELLOW}Installing E2E test dependencies...${NC}"
        npm install
        npx playwright install --with-deps chromium
    fi

    echo -e "${GREEN}Prerequisites check passed!${NC}"
    echo ""
}

# Run backend tests
run_backend_tests() {
    echo -e "${BLUE}================================================${NC}"
    echo -e "${BLUE}Running Backend Tests (pytest)${NC}"
    echo -e "${BLUE}================================================${NC}"

    cd backend

    if $RUN_COVERAGE; then
        python3 -m pytest ../tests/backend -v \
            --cov=app \
            --cov-report=html:../tests/backend/coverage \
            --cov-report=term-missing \
            -x  # Stop on first failure
        BACKEND_RESULT=$?
    else
        python3 -m pytest ../tests/backend -v -x
        BACKEND_RESULT=$?
    fi

    cd ..

    if [ $BACKEND_RESULT -eq 0 ]; then
        echo -e "${GREEN}Backend tests passed!${NC}"
    else
        echo -e "${RED}Backend tests failed!${NC}"
    fi

    return $BACKEND_RESULT
}

# Run E2E tests
run_e2e_tests() {
    echo -e "${BLUE}================================================${NC}"
    echo -e "${BLUE}Running E2E Tests (Playwright)${NC}"
    echo -e "${BLUE}================================================${NC}"

    # Only run chromium tests for CI (faster)
    if [ "$CI" = "true" ]; then
        npx playwright test --project=chromium
        E2E_RESULT=$?
    else
        npx playwright test --project=chromium
        E2E_RESULT=$?
    fi

    if [ $E2E_RESULT -eq 0 ]; then
        echo -e "${GREEN}E2E tests passed!${NC}"
    else
        echo -e "${RED}E2E tests failed!${NC}"
        echo -e "${YELLOW}Run 'npx playwright show-report tests/e2e/reports' to view the report${NC}"
    fi

    return $E2E_RESULT
}

# Main execution
main() {
    check_prerequisites

    BACKEND_RESULT=0
    E2E_RESULT=0

    if $PARALLEL && $RUN_BACKEND && $RUN_E2E; then
        echo -e "${YELLOW}Running tests in parallel...${NC}"

        # Run backend tests in background
        run_backend_tests &
        BACKEND_PID=$!

        # Run E2E tests in background
        run_e2e_tests &
        E2E_PID=$!

        # Wait for both
        wait $BACKEND_PID
        BACKEND_RESULT=$?

        wait $E2E_PID
        E2E_RESULT=$?
    else
        # Run sequentially
        if $RUN_BACKEND; then
            run_backend_tests
            BACKEND_RESULT=$?
        fi

        if $RUN_E2E && [ $BACKEND_RESULT -eq 0 ]; then
            run_e2e_tests
            E2E_RESULT=$?
        fi
    fi

    # Summary
    echo ""
    echo -e "${BLUE}================================================${NC}"
    echo -e "${BLUE}Test Results Summary${NC}"
    echo -e "${BLUE}================================================${NC}"

    if $RUN_BACKEND; then
        if [ $BACKEND_RESULT -eq 0 ]; then
            echo -e "Backend Tests:  ${GREEN}PASSED${NC}"
        else
            echo -e "Backend Tests:  ${RED}FAILED${NC}"
        fi
    fi

    if $RUN_E2E; then
        if [ $E2E_RESULT -eq 0 ]; then
            echo -e "E2E Tests:      ${GREEN}PASSED${NC}"
        else
            echo -e "E2E Tests:      ${RED}FAILED${NC}"
        fi
    fi

    echo ""

    # Exit with failure if any tests failed
    if [ $BACKEND_RESULT -ne 0 ] || [ $E2E_RESULT -ne 0 ]; then
        echo -e "${RED}Some tests failed. Please fix the issues before committing.${NC}"
        exit 1
    else
        echo -e "${GREEN}All tests passed! Safe to commit.${NC}"
        exit 0
    fi
}

main
