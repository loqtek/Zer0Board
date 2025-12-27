#!/bin/bash

# curl -fsSL https://raw.githubusercontent.com/loqtek/Zer0Board/main/install.sh | sudo bash

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory - handle both direct execution and curl | bash
if [ -f "${BASH_SOURCE[0]}" ]; then
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
else
    # Script is being piped (curl | bash), use current directory
    SCRIPT_DIR="$(pwd)"
fi
INSTALL_DIR="${SCRIPT_DIR}"

# Function to print colored output
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to generate secure secret key
generate_secret_key() {
    if command_exists python3; then
        python3 -c "import secrets; print(secrets.token_urlsafe(32))"
    elif command_exists python; then
        python -c "import secrets; print(secrets.token_urlsafe(32))"
    else
        # Fallback: use openssl
        openssl rand -base64 32 | tr -d "=+/" | cut -c1-32
    fi
}

# Function to prompt for input with default
prompt_with_default() {
    local prompt="$1"
    local default="$2"
    local var_name="$3"
    local input
    
    # Try to read from /dev/tty if stdin is not a terminal (piped input)
    if [ -t 0 ]; then
        # stdin is a terminal, use it directly
        if [ -n "$default" ]; then
            read -p "$(echo -e "${BLUE}$prompt${NC} [${YELLOW}$default${NC}]: ")" input
            eval "$var_name=\"\${input:-$default}\""
        else
            read -p "$(echo -e "${BLUE}$prompt${NC}: ")" input
            eval "$var_name=\"$input\""
        fi
    elif [ -c /dev/tty ]; then
        # stdin is piped, read from /dev/tty
        if [ -n "$default" ]; then
            read -p "$(echo -e "${BLUE}$prompt${NC} [${YELLOW}$default${NC}]: ")" input </dev/tty
            eval "$var_name=\"\${input:-$default}\""
        else
            read -p "$(echo -e "${BLUE}$prompt${NC}: ")" input </dev/tty
            eval "$var_name=\"$input\""
        fi
    else
        print_error "No terminal available for input. Cannot run interactively."
        exit 1
    fi
}

# Function to prompt for yes/no
prompt_yes_no() {
    local prompt="$1"
    local default="${2:-y}"
    local response
    
    # Try to read from /dev/tty if stdin is not a terminal (piped input)
    if [ -t 0 ]; then
        # stdin is a terminal, use it directly
        if [ "$default" = "y" ]; then
            read -p "$(echo -e "${BLUE}$prompt${NC} [${YELLOW}Y/n${NC}]: ")" response
        else
            read -p "$(echo -e "${BLUE}$prompt${NC} [${YELLOW}y/N${NC}]: ")" response
        fi
    elif [ -c /dev/tty ]; then
        # stdin is piped, read from /dev/tty
        if [ "$default" = "y" ]; then
            read -p "$(echo -e "${BLUE}$prompt${NC} [${YELLOW}Y/n${NC}]: ")" response </dev/tty
        else
            read -p "$(echo -e "${BLUE}$prompt${NC} [${YELLOW}y/N${NC}]: ")" response </dev/tty
        fi
    else
        print_error "No terminal available for input. Cannot run interactively."
        exit 1
    fi
    
    response="${response:-$default}"
    [[ "$response" =~ ^[Yy]$ ]]
}

# Function to build database URL based on type
build_database_url() {
    local db_type="$1"
    local db_user="$2"
    local db_password="$3"
    local db_host="$4"
    local db_port="$5"
    local db_name="$6"
    
    case "$db_type" in
        sqlite)
            echo "sqlite+aiosqlite:///./zeroboard.db"
            ;;
        postgresql)
            echo "postgresql+asyncpg://${db_user}:${db_password}@${db_host}:${db_port}/${db_name}"
            ;;
        mysql)
            echo "mysql+aiomysql://${db_user}:${db_password}@${db_host}:${db_port}/${db_name}"
            ;;
        *)
            print_error "Unknown database type: $db_type"
            exit 1
            ;;
    esac
}

# Function to configure database
configure_database() {
    local install_method="${1:-docker}"  # Default to docker if not provided
    print_info "Configuring database..."
    echo ""
    
    echo "Available database options:"
    echo "  1) SQLite (default, simplest - no setup required)"
    echo "  2) PostgreSQL (recommended for production)"
    echo "  3) MySQL"
    echo ""
    
    local db_choice
    prompt_with_default "Select database type (1-3)" "1" db_choice
    
    case "$db_choice" in
        1|"")
            DATABASE_TYPE="sqlite"
            DATABASE_URL="sqlite+aiosqlite:///./zeroboard.db"
            print_success "Using SQLite database"
            ;;
        2)
            DATABASE_TYPE="postgresql"
            print_info "Configuring PostgreSQL..."
            
            # Ask if using Docker database or external
            USE_DOCKER_DB=true
            if [ "$install_method" = "docker" ]; then
                if prompt_yes_no "Use PostgreSQL in Docker container? (No = use external PostgreSQL)" "y"; then
                    USE_DOCKER_DB=true
                    DB_HOST="postgres"  # Docker service name
                else
                    USE_DOCKER_DB=false
                    prompt_with_default "PostgreSQL host" "localhost" DB_HOST
                fi
            else
                USE_DOCKER_DB=false
                prompt_with_default "PostgreSQL host" "localhost" DB_HOST
            fi
            
            if [ "$USE_DOCKER_DB" = "false" ]; then
                prompt_with_default "PostgreSQL port" "5432" DB_PORT
            else
                DB_PORT="5432"
            fi
            
            prompt_with_default "PostgreSQL database name" "zeroboard" DB_NAME
            prompt_with_default "PostgreSQL username" "zeroboard" DB_USER
            if [ -t 0 ]; then
                read -sp "$(echo -e "${BLUE}PostgreSQL password${NC}: ")" DB_PASSWORD
            elif [ -c /dev/tty ]; then
                read -sp "$(echo -e "${BLUE}PostgreSQL password${NC}: ")" DB_PASSWORD </dev/tty
            else
                print_error "No terminal available for password input."
                exit 1
            fi
            echo ""
            
            # For Docker, use service name; for external, use provided host
            if [ "$USE_DOCKER_DB" = "true" ] && [ "$install_method" = "docker" ]; then
                DATABASE_URL=$(build_database_url "$DATABASE_TYPE" "$DB_USER" "$DB_PASSWORD" "postgres" "$DB_PORT" "$DB_NAME")
            else
                DATABASE_URL=$(build_database_url "$DATABASE_TYPE" "$DB_USER" "$DB_PASSWORD" "$DB_HOST" "$DB_PORT" "$DB_NAME")
            fi
            print_success "PostgreSQL configured"
            ;;
        3)
            DATABASE_TYPE="mysql"
            print_info "Configuring MySQL..."
            
            # Ask if using Docker database or external
            USE_DOCKER_DB=true
            if [ "$install_method" = "docker" ]; then
                if prompt_yes_no "Use MySQL in Docker container? (No = use external MySQL)" "y"; then
                    USE_DOCKER_DB=true
                    DB_HOST="mysql"  # Docker service name
                else
                    USE_DOCKER_DB=false
                    prompt_with_default "MySQL host" "localhost" DB_HOST
                fi
            else
                USE_DOCKER_DB=false
                prompt_with_default "MySQL host" "localhost" DB_HOST
            fi
            
            if [ "$USE_DOCKER_DB" = "false" ]; then
                prompt_with_default "MySQL port" "3306" DB_PORT
            else
                DB_PORT="3306"
            fi
            
            prompt_with_default "MySQL database name" "zeroboard" DB_NAME
            prompt_with_default "MySQL username" "zeroboard" DB_USER
            if [ -t 0 ]; then
                read -sp "$(echo -e "${BLUE}MySQL password${NC}: ")" DB_PASSWORD
            elif [ -c /dev/tty ]; then
                read -sp "$(echo -e "${BLUE}MySQL password${NC}: ")" DB_PASSWORD </dev/tty
            else
                print_error "No terminal available for password input."
                exit 1
            fi
            echo ""
            
            # For Docker, use service name; for external, use provided host
            if [ "$USE_DOCKER_DB" = "true" ] && [ "$install_method" = "docker" ]; then
                DATABASE_URL=$(build_database_url "$DATABASE_TYPE" "$DB_USER" "$DB_PASSWORD" "mysql" "$DB_PORT" "$DB_NAME")
            else
                DATABASE_URL=$(build_database_url "$DATABASE_TYPE" "$DB_USER" "$DB_PASSWORD" "$DB_HOST" "$DB_PORT" "$DB_NAME")
            fi
            print_success "MySQL configured"
            ;;
        *)
            print_error "Invalid choice"
            exit 1
            ;;
    esac
}

# Function to setup Docker installation
setup_docker() {
    print_info "Setting up Docker installation..."
    
    # Check if Docker is installed
    if ! command_exists docker; then
        print_error "Docker is not installed. Please install Docker first."
        print_info "Visit: https://docs.docker.com/get-docker/"
        exit 1
    fi
    
    # Check if docker-compose is installed
    if ! command_exists docker-compose && ! docker compose version >/dev/null 2>&1; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    # Navigate to install directory
    cd "$INSTALL_DIR"
    
    # Initialize USE_DOCKER_DB (will be set by configure_database if needed)
    USE_DOCKER_DB=false
    
    # Configure database
    configure_database "docker"
    
    echo ""
    print_info "Configuring application settings..."
    
    # Generate secret key
    local secret_key
    if prompt_yes_no "Generate a secure SECRET_KEY automatically?" "y"; then
        secret_key=$(generate_secret_key)
        print_success "Generated SECRET_KEY"
    else
        prompt_with_default "Enter SECRET_KEY (min 32 chars, or press Enter to generate)" "" secret_key
        if [ -z "$secret_key" ] || [ ${#secret_key} -lt 32 ]; then
            secret_key=$(generate_secret_key)
            print_success "Generated SECRET_KEY (your input was too short)"
        fi
    fi
    
    # Environment
    local environment
    prompt_with_default "Environment (development/production)" "development" environment
    
    # Ports
    local backend_port
    local frontend_port
    prompt_with_default "Backend port" "8000" backend_port
    prompt_with_default "Frontend port" "3000" frontend_port
    
    # CORS origins
    local cors_origins
    if [ "$environment" = "production" ]; then
        prompt_with_default "CORS origins (comma-separated, e.g., https://yourdomain.com)" "" cors_origins
        if [ -z "$cors_origins" ]; then
            print_warning "CORS_ORIGINS not set. You should set this in production!"
            cors_origins="http://localhost:3000"
        fi
    else
        cors_origins="http://localhost:${frontend_port},http://localhost:3001"
    fi
    
    # API URL
    local api_url
    if [ "$environment" = "production" ]; then
        prompt_with_default "Backend API URL (for frontend)" "http://localhost:${backend_port}" api_url
    else
        api_url="http://localhost:${backend_port}"
    fi
    
    # Create .env file
    print_info "Creating .env file..."
    cat > .env <<EOF
# Database Configuration
DATABASE_TYPE=${DATABASE_TYPE}
DATABASE_URL=${DATABASE_URL}

# Application Settings
SECRET_KEY=${secret_key}
ENVIRONMENT=${environment}
LOG_LEVEL=INFO

# Server Configuration
BACKEND_PORT=${backend_port}
FRONTEND_PORT=${frontend_port}
CORS_ORIGINS=${cors_origins}

# Frontend Configuration
NEXT_PUBLIC_API_URL=${api_url}
NEXT_PUBLIC_API_TIMEOUT=30000
NODE_ENV=${environment}

# Session Configuration
SESSION_COOKIE_NAME=zero_board_session
SESSION_COOKIE_HTTPONLY=true
SESSION_COOKIE_SECURE=$([ "$environment" = "production" ] && echo "true" || echo "false")
SESSION_COOKIE_SAMESITE=lax
SESSION_EXPIRE_MINUTES=1440

# Rate Limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_PER_MINUTE=60
LOGIN_RATE_LIMIT_PER_MINUTE=5
EOF
    
    print_success ".env file created"
    
    # Update docker-compose.yml if using PostgreSQL or MySQL in Docker
    if [ "$DATABASE_TYPE" != "sqlite" ] && [ "$USE_DOCKER_DB" = "true" ]; then
        print_info "Updating docker-compose.yml for ${DATABASE_TYPE} Docker service..."
        
        # Create backup
        cp docker-compose.yml docker-compose.yml.backup
        
        # Use Python for reliable YAML modification (if available) or sed as fallback
        if command_exists python3; then
            DATABASE_TYPE_VAR="$DATABASE_TYPE" python3 <<'PYTHON_SCRIPT'
import re
import os

db_type = os.environ.get('DATABASE_TYPE_VAR', 'sqlite')

# Read the file
with open('docker-compose.yml', 'r') as f:
    content = f.read()

if db_type == 'postgresql':
    # Uncomment PostgreSQL service block
    content = re.sub(r'^  # postgres:', '  postgres:', content, flags=re.MULTILINE)
    content = re.sub(r'^  #   image:', '    image:', content, flags=re.MULTILINE)
    content = re.sub(r'^  #   container_name:', '    container_name:', content, flags=re.MULTILINE)
    content = re.sub(r'^  #   environment:', '    environment:', content, flags=re.MULTILINE)
    content = re.sub(r'^  #     POSTGRES_', '      POSTGRES_', content, flags=re.MULTILINE)
    content = re.sub(r'^  #   ports:', '    ports:', content, flags=re.MULTILINE)
    content = re.sub(r'^  #     - "5432:5432"', '      - "5432:5432"', content, flags=re.MULTILINE)
    content = re.sub(r'^  #   volumes:', '    volumes:', content, flags=re.MULTILINE)
    content = re.sub(r'^  #     - postgres_data:', '      - postgres_data:', content, flags=re.MULTILINE)
    content = re.sub(r'^  #   healthcheck:', '    healthcheck:', content, flags=re.MULTILINE)
    content = re.sub(r'^  #     test:', '      test:', content, flags=re.MULTILINE)
    content = re.sub(r'^  #     interval:', '      interval:', content, flags=re.MULTILINE)
    content = re.sub(r'^  #     timeout:', '      timeout:', content, flags=re.MULTILINE)
    content = re.sub(r'^  #     retries:', '      retries:', content, flags=re.MULTILINE)
    content = re.sub(r'^  #   networks:', '    networks:', content, flags=re.MULTILINE)
    content = re.sub(r'^  #     - zero-board-network', '      - zero-board-network', content, flags=re.MULTILINE)
    content = re.sub(r'^  #   restart:', '    restart:', content, flags=re.MULTILINE)
    
    # Uncomment depends_on for backend
    content = re.sub(r'^    # Uncomment depends_on if using PostgreSQL or MySQL:', '', content, flags=re.MULTILINE)
    content = re.sub(r'^    # depends_on:', '    depends_on:', content, flags=re.MULTILINE)
    content = re.sub(r'^    #   postgres:', '      postgres:', content, flags=re.MULTILINE)
    content = re.sub(r'^    #     condition: service_healthy', '      condition: service_healthy', content, flags=re.MULTILINE)
    content = re.sub(r'^    # OR', '', content, flags=re.MULTILINE)
    content = re.sub(r'^    #   mysql:', '', content, flags=re.MULTILINE)
    
    # Uncomment volumes section
    content = re.sub(r'^# volumes:', 'volumes:', content, flags=re.MULTILINE)
    content = re.sub(r'^#   postgres_data:', '  postgres_data:', content, flags=re.MULTILINE)
    
elif db_type == 'mysql':
    # Uncomment MySQL service block
    content = re.sub(r'^  # mysql:', '  mysql:', content, flags=re.MULTILINE)
    content = re.sub(r'^  #   image:', '    image:', content, flags=re.MULTILINE)
    content = re.sub(r'^  #   container_name:', '    container_name:', content, flags=re.MULTILINE)
    content = re.sub(r'^  #   environment:', '    environment:', content, flags=re.MULTILINE)
    content = re.sub(r'^  #     MYSQL_', '      MYSQL_', content, flags=re.MULTILINE)
    content = re.sub(r'^  #   ports:', '    ports:', content, flags=re.MULTILINE)
    content = re.sub(r'^  #     - "3306:3306"', '      - "3306:3306"', content, flags=re.MULTILINE)
    content = re.sub(r'^  #   volumes:', '    volumes:', content, flags=re.MULTILINE)
    content = re.sub(r'^  #     - mysql_data:', '      - mysql_data:', content, flags=re.MULTILINE)
    content = re.sub(r'^  #   healthcheck:', '    healthcheck:', content, flags=re.MULTILINE)
    content = re.sub(r'^  #     test:', '      test:', content, flags=re.MULTILINE)
    content = re.sub(r'^  #     interval:', '      interval:', content, flags=re.MULTILINE)
    content = re.sub(r'^  #     timeout:', '      timeout:', content, flags=re.MULTILINE)
    content = re.sub(r'^  #     retries:', '      retries:', content, flags=re.MULTILINE)
    content = re.sub(r'^  #   networks:', '    networks:', content, flags=re.MULTILINE)
    content = re.sub(r'^  #     - zero-board-network', '      - zero-board-network', content, flags=re.MULTILINE)
    content = re.sub(r'^  #   restart:', '    restart:', content, flags=re.MULTILINE)
    
    # Uncomment depends_on for backend
    content = re.sub(r'^    # Uncomment depends_on if using PostgreSQL or MySQL:', '', content, flags=re.MULTILINE)
    content = re.sub(r'^    # depends_on:', '    depends_on:', content, flags=re.MULTILINE)
    content = re.sub(r'^    #   postgres:', '', content, flags=re.MULTILINE)
    content = re.sub(r'^    # OR', '', content, flags=re.MULTILINE)
    content = re.sub(r'^    #   mysql:', '      mysql:', content, flags=re.MULTILINE)
    content = re.sub(r'^    #     condition: service_healthy', '      condition: service_healthy', content, flags=re.MULTILINE)
    
    # Uncomment volumes section
    content = re.sub(r'^# volumes:', 'volumes:', content, flags=re.MULTILINE)
    content = re.sub(r'^#   mysql_data:', '  mysql_data:', content, flags=re.MULTILINE)

# Write back
with open('docker-compose.yml', 'w') as f:
    f.write(content)
PYTHON_SCRIPT
        else
            # Fallback to sed (less reliable but works)
            if [ "$DATABASE_TYPE" = "postgresql" ]; then
                # Uncomment PostgreSQL service (simple sed approach)
                sed -i 's/^  # postgres:$/  postgres:/' docker-compose.yml
                sed -i '/^  postgres:$/,/^  #   restart: unless-stopped$/s/^  #   /    /' docker-compose.yml
                sed -i '/^  postgres:$/,/^  #   restart: unless-stopped$/s/^  #     /      /' docker-compose.yml
                sed -i 's/^    # depends_on:$/    depends_on:/' docker-compose.yml
                sed -i 's/^    #   postgres:$/      postgres:/' docker-compose.yml
                sed -i 's/^    #     condition: service_healthy$/      condition: service_healthy/' docker-compose.yml
                sed -i 's/^# volumes:$/volumes:/' docker-compose.yml
                sed -i 's/^#   postgres_data:/  postgres_data:/' docker-compose.yml
            elif [ "$DATABASE_TYPE" = "mysql" ]; then
                sed -i 's/^  # mysql:$/  mysql:/' docker-compose.yml
                sed -i '/^  mysql:$/,/^  #   restart: unless-stopped$/s/^  #   /    /' docker-compose.yml
                sed -i '/^  mysql:$/,/^  #   restart: unless-stopped$/s/^  #     /      /' docker-compose.yml
                sed -i 's/^    # depends_on:$/    depends_on:/' docker-compose.yml
                sed -i 's/^    #   mysql:$/      mysql:/' docker-compose.yml
                sed -i 's/^    #     condition: service_healthy$/      condition: service_healthy/' docker-compose.yml
                sed -i 's/^# volumes:$/volumes:/' docker-compose.yml
                sed -i 's/^#   mysql_data:/  mysql_data:/' docker-compose.yml
            fi
        fi
        
        # Update database credentials in docker-compose.yml
        if [ "$DATABASE_TYPE" = "postgresql" ]; then
                if [ -n "$DB_USER" ]; then
                    sed -i "s/POSTGRES_USER: zeroboard/POSTGRES_USER: ${DB_USER}/" docker-compose.yml
                fi
                if [ -n "$DB_PASSWORD" ]; then
                    sed -i "s/POSTGRES_PASSWORD: zeroboard_dev_password/POSTGRES_PASSWORD: ${DB_PASSWORD}/" docker-compose.yml
                fi
                if [ -n "$DB_NAME" ]; then
                    sed -i "s/POSTGRES_DB: zeroboard/POSTGRES_DB: ${DB_NAME}/" docker-compose.yml
                fi
            elif [ "$DATABASE_TYPE" = "mysql" ]; then
                if [ -n "$DB_USER" ]; then
                    sed -i "s/MYSQL_USER: zeroboard/MYSQL_USER: ${DB_USER}/" docker-compose.yml
                fi
                if [ -n "$DB_PASSWORD" ]; then
                    sed -i "s/MYSQL_PASSWORD: zeroboard_dev_password/MYSQL_PASSWORD: ${DB_PASSWORD}/" docker-compose.yml
                    sed -i "s/MYSQL_ROOT_PASSWORD: root_dev_password/MYSQL_ROOT_PASSWORD: ${DB_PASSWORD}/" docker-compose.yml
                fi
                if [ -n "$DB_NAME" ]; then
                    sed -i "s/MYSQL_DATABASE: zeroboard/MYSQL_DATABASE: ${DB_NAME}/" docker-compose.yml
                fi
            fi
        
        print_success "docker-compose.yml updated"
    elif [ "$DATABASE_TYPE" != "sqlite" ] && [ "$USE_DOCKER_DB" = "false" ]; then
        print_info "Using external ${DATABASE_TYPE} database. No Docker service needed."
        print_warning "Make sure ${DATABASE_TYPE} at $DB_HOST is accessible from Docker containers."
    fi
    
    echo ""
    print_success "Docker configuration complete!"
    echo ""
    print_info "Next steps:"
    echo "  1. Review the .env file if needed: ${INSTALL_DIR}/.env"
    if [ "$DATABASE_TYPE" != "sqlite" ]; then
        echo "  2. Review docker-compose.yml if needed: ${INSTALL_DIR}/docker-compose.yml"
    fi
    echo "  3. Start the application:"
    echo "     cd ${INSTALL_DIR}"
    echo "     docker-compose up -d"
    echo ""
    echo "  4. Check logs for admin credentials:"
    echo "     docker logs zero-board-backend"
    echo "     or"
    echo "     cat ${INSTALL_DIR}/logs/zero-board.log"
    echo ""
}

# Function to setup service installation
setup_service() {
    print_info "Setting up service installation (without Docker)..."
    
    # Check prerequisites
    if ! command_exists python3; then
        print_error "Python 3 is required but not installed."
        exit 1
    fi
    
    if ! command_exists node; then
        print_error "Node.js is required but not installed."
        exit 1
    fi
    
    if ! command_exists npm; then
        print_error "npm is required but not installed."
        exit 1
    fi
    
    cd "$INSTALL_DIR"
    
    # Initialize USE_DOCKER_DB (not used for service install, but initialize for consistency)
    USE_DOCKER_DB=false
    
    # Configure database
    configure_database "service"
    
    echo ""
    print_info "Configuring backend..."
    
    # Backend setup
    cd backend
    
    # Create virtual environment
    if [ ! -d "venv" ]; then
        print_info "Creating Python virtual environment..."
        python3 -m venv venv
    fi
    
    # Activate virtual environment
    source venv/bin/activate
    
    # Install dependencies
    print_info "Installing Python dependencies..."
    pip install --upgrade pip
    pip install -r requirements-dev.txt
    
    # Create .env file for backend
    print_info "Creating backend .env file..."
    
    # Generate secret key
    local secret_key
    if prompt_yes_no "Generate a secure SECRET_KEY automatically?" "y"; then
        secret_key=$(generate_secret_key)
        print_success "Generated SECRET_KEY"
    else
        prompt_with_default "Enter SECRET_KEY (min 32 chars, or press Enter to generate)" "" secret_key
        if [ -z "$secret_key" ] || [ ${#secret_key} -lt 32 ]; then
            secret_key=$(generate_secret_key)
            print_success "Generated SECRET_KEY (your input was too short)"
        fi
    fi
    
    # Environment
    local environment
    prompt_with_default "Environment (development/production)" "development" environment
    
    # Port
    local backend_port
    prompt_with_default "Backend port" "8000" backend_port
    
    # CORS origins
    local cors_origins
    if [ "$environment" = "production" ]; then
        prompt_with_default "CORS origins (comma-separated)" "" cors_origins
        if [ -z "$cors_origins" ]; then
            cors_origins="http://localhost:3000"
        fi
    else
        cors_origins="http://localhost:3000,http://localhost:3001"
    fi
    
    cat > .env <<EOF
# Database Configuration
DATABASE_TYPE=${DATABASE_TYPE}
DATABASE_URL=${DATABASE_URL}

# Application Settings
SECRET_KEY=${secret_key}
ENVIRONMENT=${environment}
LOG_LEVEL=INFO

# Server Configuration
HOST=0.0.0.0
PORT=${backend_port}
CORS_ORIGINS=${cors_origins}

# Session Configuration
SESSION_COOKIE_NAME=zero_board_session
SESSION_COOKIE_HTTPONLY=true
SESSION_COOKIE_SECURE=$([ "$environment" = "production" ] && echo "true" || echo "false")
SESSION_COOKIE_SAMESITE=lax
SESSION_EXPIRE_MINUTES=1440

# Rate Limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_PER_MINUTE=60
LOGIN_RATE_LIMIT_PER_MINUTE=5

# Logging
LOG_DIR=./logs
EOF
    
    print_success "Backend .env file created"
    
    # Frontend setup
    cd ../zero-board
    
    print_info "Installing frontend dependencies..."
    npm install
    
    # Create .env.local for frontend
    print_info "Creating frontend .env.local file..."
    
    local api_url
    prompt_with_default "Backend API URL (for frontend)" "http://localhost:${backend_port}" api_url
    
    cat > .env.local <<EOF
NEXT_PUBLIC_API_URL=${api_url}
NEXT_PUBLIC_API_TIMEOUT=30000
EOF
    
    print_success "Frontend .env.local file created"
    
    echo ""
    print_success "Service installation configuration complete!"
    echo ""
    print_info "Next steps:"
    echo ""
    echo "Backend:"
    echo "  1. cd ${INSTALL_DIR}/backend"
    echo "  2. source venv/bin/activate"
    echo "  3. uvicorn app.main:app --reload --host 0.0.0.0 --port ${backend_port}"
    echo ""
    echo "Frontend (in a new terminal):"
    echo "  1. cd ${INSTALL_DIR}/zero-board"
    echo "  2. npm run dev"
    echo ""
    echo "The admin password will be printed in the backend console and logged to:"
    echo "  ${INSTALL_DIR}/backend/logs/zero-board.log"
    echo ""
}

# Main installation flow
main() {
    clear
    echo "============================================================================"
    echo "                    Zer0Board Installation Script"
    echo "============================================================================"
    echo ""
    
    # Check if we're in the right directory
    if [ ! -f "docker-compose.yml" ] && [ ! -f "backend/app/main.py" ]; then
        print_warning "Zer0Board files not found in current directory."
        print_info "This script should be run from the Zer0Board root directory."
        print_info "If you're installing from GitHub, the script will clone the repo."
        echo ""
        
        # Check if we can interact with the terminal
        # When piped (curl | bash), stdin is not a terminal, but /dev/tty should work
        if [ ! -t 0 ]; then
            if [ ! -c /dev/tty ] || [ ! -r /dev/tty ]; then
                print_error "No terminal available for interactive input."
                print_info "If you're running this via 'curl | bash', make sure you're running it in a terminal."
                print_info "Alternatively, download the script first:"
                print_info "  curl -fsSL https://raw.githubusercontent.com/loqtek/Zer0Board/main/install.sh -o install.sh"
                print_info "  chmod +x install.sh"
                print_info "  ./install.sh"
                exit 1
            fi
            print_info "Detected piped input. Reading from /dev/tty for user interaction."
        fi
        
        if prompt_yes_no "Clone Zer0Board repository now?" "y"; then
            if ! command_exists git; then
                print_error "Git is required but not installed."
                exit 1
            fi
            
            local clone_dir
            prompt_with_default "Installation directory" "$HOME/Zer0Board" clone_dir
            INSTALL_DIR="$clone_dir"
            
            if [ -d "$INSTALL_DIR" ]; then
                print_error "Directory $INSTALL_DIR already exists!"
                exit 1
            fi
            
            print_info "Cloning repository..."
            git clone https://github.com/loqtek/Zer0Board.git "$INSTALL_DIR"
            cd "$INSTALL_DIR"
        else
            print_error "Please run this script from the Zer0Board directory."
            exit 1
        fi
    fi
    
    echo ""
    print_info "Installation method:"
    echo "  1) Docker (recommended - easiest setup)"
    echo "  2) Service install (manual setup without Docker)"
    echo ""
    
    local install_method
    prompt_with_default "Select installation method (1-2)" "1" install_method
    
    case "$install_method" in
        1|"")
            INSTALL_METHOD="docker"
            setup_docker
            ;;
        2)
            INSTALL_METHOD="service"
            setup_service
            ;;
        *)
            print_error "Invalid choice"
            exit 1
            ;;
    esac
    
    echo ""
    print_success "Installation setup complete!"
    echo ""
}

# Run main function
main "$@"

