#!/bin/bash

# Development Environment Setup Script for Qualia Platform
# This script automates the setup of a local development environment

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
NODE_VERSION="20"
REQUIRED_NODE_MAJOR=$(echo $NODE_VERSION | cut -d. -f1)

# Helper functions
print_step() {
    echo -e "\n${BLUE}▶ $1${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# Check if command exists
command_exists() {
    command -v "$1" &> /dev/null
}

# Compare versions
version_compare() {
    local version1=$1
    local version2=$2
    if [[ "$(printf '%s\n' "$version2" "$version1" | sort -V | head -n1)" = "$version2" ]]; then
        return 0
    else
        return 1
    fi
}

# Header
echo "================================================"
echo "   Qualia Platform - Development Setup"
echo "================================================"

# Step 1: Check prerequisites
print_step "Checking prerequisites..."

# Check Node.js
if command_exists node; then
    CURRENT_NODE=$(node -v | sed 's/v//' | cut -d. -f1)
    if [ "$CURRENT_NODE" -ge "$REQUIRED_NODE_MAJOR" ]; then
        print_success "Node.js $(node -v) installed"
    else
        print_error "Node.js version $NODE_VERSION or higher required (found $(node -v))"
        print_warning "Please install Node.js $NODE_VERSION from https://nodejs.org/"
        exit 1
    fi
else
    print_error "Node.js is not installed"
    print_warning "Please install Node.js $NODE_VERSION from https://nodejs.org/"
    exit 1
fi

# Check npm
if command_exists npm; then
    print_success "npm $(npm -v) installed"
else
    print_error "npm is not installed"
    exit 1
fi

# Check Git
if command_exists git; then
    print_success "Git $(git --version | cut -d' ' -f3) installed"
else
    print_error "Git is not installed"
    print_warning "Please install Git from https://git-scm.com/"
    exit 1
fi

# Optional: Check Docker
if command_exists docker; then
    print_success "Docker $(docker --version | cut -d' ' -f3 | cut -d',' -f1) installed (optional)"
else
    print_warning "Docker is not installed (optional - needed for local Supabase)"
fi

# Step 2: Install dependencies
print_step "Installing project dependencies..."

if [ -f "package-lock.json" ]; then
    npm ci
    print_success "Dependencies installed from lock file"
else
    npm install
    print_success "Dependencies installed"
fi

# Step 3: Setup environment variables
print_step "Setting up environment variables..."

if [ ! -f ".env.local" ]; then
    if [ -f ".env.example" ]; then
        cp .env.example .env.local
        print_success "Created .env.local from .env.example"
        print_warning "Please update .env.local with your actual values:"
        echo ""
        echo "  Required variables:"
        echo "  - NEXT_PUBLIC_SUPABASE_URL"
        echo "  - NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"
        echo "  - GOOGLE_GENERATIVE_AI_API_KEY"
        echo ""
        echo "  Optional (for voice assistant):"
        echo "  - NEXT_PUBLIC_VAPI_PUBLIC_KEY"
        echo "  - NEXT_PUBLIC_VAPI_ASSISTANT_ID"
        echo "  - NEXT_PUBLIC_APP_URL"
    else
        cat > .env.local << 'EOF'
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-key

# AI Configuration
GOOGLE_GENERATIVE_AI_API_KEY=your-google-api-key

# VAPI Voice Assistant (optional)
NEXT_PUBLIC_VAPI_PUBLIC_KEY=your-vapi-public-key
NEXT_PUBLIC_VAPI_ASSISTANT_ID=your-vapi-assistant-id
NEXT_PUBLIC_APP_URL=http://localhost:3000
EOF
        print_success "Created .env.local template"
        print_warning "Please update .env.local with your actual values"
    fi
else
    print_success ".env.local already exists"
fi

# Step 4: Install global tools
print_step "Installing development tools..."

# Install Supabase CLI if not installed
if ! command_exists supabase; then
    print_warning "Supabase CLI not installed. Installing..."
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        if command_exists brew; then
            brew install supabase/tap/supabase
        else
            curl -L https://github.com/supabase/cli/releases/latest/download/supabase_darwin_amd64.tar.gz | tar xz
            sudo mv supabase /usr/local/bin/
        fi
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        curl -L https://github.com/supabase/cli/releases/latest/download/supabase_linux_amd64.tar.gz | tar xz
        sudo mv supabase /usr/local/bin/
    else
        print_warning "Please install Supabase CLI manually from https://supabase.com/docs/guides/cli"
    fi

    if command_exists supabase; then
        print_success "Supabase CLI installed"
    fi
else
    print_success "Supabase CLI already installed"
fi

# Install Vercel CLI if not installed
if ! command_exists vercel; then
    print_warning "Vercel CLI not installed. Installing..."
    npm install -g vercel
    print_success "Vercel CLI installed"
else
    print_success "Vercel CLI already installed"
fi

# Step 5: Setup Git hooks
print_step "Setting up Git hooks..."

# Initialize Husky if not already done
if [ -d ".husky" ]; then
    npx husky
    print_success "Git hooks configured"
else
    npx husky init
    echo "npx lint-staged" > .husky/pre-commit
    print_success "Git hooks initialized"
fi

# Step 6: Database setup (if Supabase is configured)
print_step "Checking database configuration..."

if [ -f ".env.local" ]; then
    source .env.local
    if [ ! -z "${NEXT_PUBLIC_SUPABASE_URL:-}" ] && [ "$NEXT_PUBLIC_SUPABASE_URL" != "your-supabase-url" ]; then
        print_success "Supabase connection configured"

        # Generate TypeScript types
        if [ ! -z "${SUPABASE_PROJECT_REF:-}" ]; then
            print_step "Generating TypeScript types from database..."
            npx supabase gen types typescript --project-id $SUPABASE_PROJECT_REF > types/database.generated.ts
            print_success "TypeScript types generated"
        else
            print_warning "Set SUPABASE_PROJECT_REF in .env.local to generate types"
        fi
    else
        print_warning "Please configure Supabase credentials in .env.local"
    fi
fi

# Step 7: Optional local Supabase setup
if command_exists docker && command_exists supabase; then
    read -p "Do you want to set up local Supabase? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_step "Starting local Supabase..."
        supabase start

        # Show local credentials
        echo ""
        echo "Local Supabase credentials:"
        supabase status

        print_success "Local Supabase is running"
        print_warning "Update .env.local with the local credentials above for local development"
    fi
fi

# Step 8: Run initial build
print_step "Running initial build to verify setup..."

npm run build
if [ $? -eq 0 ]; then
    print_success "Build completed successfully"
else
    print_error "Build failed. Please check the errors above."
    exit 1
fi

# Step 9: Run tests
print_step "Running tests..."

npm test -- --passWithNoTests
if [ $? -eq 0 ]; then
    print_success "Tests passed"
else
    print_warning "Some tests failed. This is expected if you haven't written tests yet."
fi

# Step 10: Setup VS Code (optional)
if command_exists code; then
    read -p "Do you want to install recommended VS Code extensions? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_step "Installing VS Code extensions..."
        code --install-extension dbaeumer.vscode-eslint
        code --install-extension esbenp.prettier-vscode
        code --install-extension bradlc.vscode-tailwindcss
        code --install-extension dsznajder.es7-react-js-snippets
        code --install-extension Prisma.prisma
        print_success "VS Code extensions installed"
    fi
fi

# Final summary
echo ""
echo "================================================"
echo -e "${GREEN}   Setup Complete! 🎉${NC}"
echo "================================================"
echo ""
echo "Next steps:"
echo "1. Update .env.local with your actual credentials"
echo "2. Run 'npm run dev' to start the development server"
echo "3. Visit http://localhost:3000"
echo ""
echo "Useful commands:"
echo "  npm run dev          - Start development server"
echo "  npm run build        - Build for production"
echo "  npm run lint         - Run linting"
echo "  npm test             - Run tests"
echo "  npx supabase start   - Start local Supabase"
echo "  npx supabase stop    - Stop local Supabase"
echo ""
print_success "Happy coding! 🚀"