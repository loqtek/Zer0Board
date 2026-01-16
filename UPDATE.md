# Update Instructions

This guide explains how to update your Zero Board installation to the latest version. Choose the method that matches your installation type.

## Table of Contents

- [Docker Compose Installation](#docker-compose-installation)
- [Service Installation (Systemd)](#service-installation-systemd)
- [Troubleshooting](#troubleshooting)

---

## Docker Compose Installation

If you installed Zero Board using Docker Compose, follow these steps:

### Prerequisites

- Docker and Docker Compose installed
- Access to the ZeroBoard directory
- Git installed (if you cloned the repository)

### Update Steps

1. **Navigate to your ZeroBoard directory:**
   ```bash
   cd /path/to/Zer0Board
   ```

2. **Backup your data (recommended):**
   ```bash
   # Backup your .env file
   cp .env .env.backup
   
   # If using SQLite, backup the database
   cp backend/zeroboard.db backend/zeroboard.db.backup
   
   # If using PostgreSQL/MySQL, use your database backup tools
   ```

3. **Pull the latest changes from GitHub:**
   ```bash
   git pull origin main
   ```
   
   Or if you downloaded a release:
   ```bash
   # Download the latest release
   wget https://github.com/loqtek/Zer0Board/archive/refs/tags/vX.X.X.tar.gz
   tar -xzf vX.X.X.tar.gz
   # Copy your .env file to the new directory
   cp .env Zer0Board-vX.X.X/
   cd Zer0Board-vX.X.X
   ```

4. **Stop the running containers:**
   ```bash
   docker-compose down
   ```

5. **Rebuild the containers with the latest code:**
   ```bash
   docker-compose build --no-cache
   ```
   
   This ensures you get the latest dependencies and code changes.

6. **Start the containers:**
   ```bash
   docker-compose up -d
   ```

7. **Verify the update:**
   ```bash
   # Check container status
   docker-compose ps
   
   # Check logs for any errors
   docker-compose logs frontend
   docker-compose logs backend
   ```

8. **Access the application:**
   - Frontend: http://localhost:3000 (or your configured port)
   - Backend API: http://localhost:8000 (or your configured port)

### Updating Environment Variables

If the new version requires new environment variables:

1. Check `.env.sample` for any new variables
2. Add them to your `.env` file
3. Restart the containers:
   ```bash
   docker-compose down
   docker-compose up -d
   ```

### Rolling Back (if needed)

If you encounter issues after updating:

1. **Restore from backup:**
   ```bash
   cd /path/to/Zer0Board
   git checkout <previous-version-tag>
   # Or restore from your backup directory
   ```

2. **Rebuild and restart:**
   ```bash
   docker-compose down
   docker-compose build --no-cache
   docker-compose up -d
   ```

---

## Service Installation (Systemd)

If you installed Zero Board as systemd services, follow these steps:

### Prerequisites

- Root or sudo access
- Python 3.11+ (for backend)
- Node.js 20+ (for frontend)
- Git installed

### Update Steps

1. **Navigate to your ZeroBoard directory:**
   ```bash
   cd /path/to/Zer0Board
   ```

2. **Backup your data (recommended):**
   ```bash
   # Backup your .env files
   cp .env .env.backup
   cp backend/.env backend/.env.backup
   cp zero-board/.env.local zero-board/.env.local.backup
   
   # If using SQLite, backup the database
   cp backend/zeroboard.db backend/zeroboard.db.backup
   ```

3. **Stop the services:**
   ```bash
   sudo systemctl stop zero-board-backend
   sudo systemctl stop zero-board-frontend
   ```

4. **Pull the latest changes from GitHub:**
   ```bash
   git pull origin main
   ```
   
   Or if you downloaded a release:
   ```bash
   # Download and extract the latest release
   wget https://github.com/loqtek/Zer0Board/archive/refs/tags/vX.X.X.tar.gz
   tar -xzf vX.X.X.tar.gz
   # Copy your configuration files
   cp .env.backup Zer0Board-vX.X.X/.env
   cp backend/.env.backup Zer0Board-vX.X.X/backend/.env
   cp zero-board/.env.local.backup Zer0Board-vX.X.X/zero-board/.env.local
   cd Zer0Board-vX.X.X
   ```

5. **Update Backend Dependencies:**
   ```bash
   cd backend
   
   # Activate your virtual environment
   source venv/bin/activate
   # Or if using a different virtual environment path:
   # source /path/to/venv/bin/activate
   
   # Update dependencies
   pip install -r requirements.txt
   # Or for development:
   # pip install -r requirements-dev.txt
   
   # Run database migrations (if any)
   # Check release notes for migration instructions
   ```

6. **Update Frontend Dependencies:**
   ```bash
   cd ../zero-board
   
   # Install/update dependencies
   npm install
   
   # Rebuild the frontend
   npm run build
   ```

7. **Update Environment Variables (if needed):**
   - Check `.env.sample` and `backend/env.example` for new variables
   - Add any required variables to your `.env` files

8. **Start the services:**
   ```bash
   sudo systemctl start zero-board-backend
   sudo systemctl start zero-board-frontend
   ```

9. **Check service status:**
   ```bash
   sudo systemctl status zero-board-backend
   sudo systemctl status zero-board-frontend
   ```

10. **View logs (if needed):**
    ```bash
    # Backend logs
    sudo journalctl -u zero-board-backend -f
    
    # Frontend logs
    sudo journalctl -u zero-board-frontend -f
    
    # Or check log files
    tail -f /path/to/Zer0Board/logs/zero-board.log
    ```

### Service File Example

If you need to recreate or update your systemd service files, here are examples:

**Backend Service (`/etc/systemd/system/zero-board-backend.service`):**
```ini
[Unit]
Description=Zero Board Backend API
After=network.target

[Service]
Type=simple
User=your-user
WorkingDirectory=/path/to/Zer0Board/backend
Environment="PATH=/path/to/Zer0Board/backend/venv/bin"
ExecStart=/path/to/Zer0Board/backend/venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

**Frontend Service (`/etc/systemd/system/zero-board-frontend.service`):**
```ini
[Unit]
Description=Zero Board Frontend
After=network.target zero-board-backend.service

[Service]
Type=simple
User=your-user
WorkingDirectory=/path/to/Zer0Board/zero-board
Environment="NODE_ENV=production"
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

After creating or modifying service files:
```bash
sudo systemctl daemon-reload
sudo systemctl enable zero-board-backend
sudo systemctl enable zero-board-frontend
```

### Rolling Back (if needed)

If you encounter issues after updating:

1. **Restore from backup:**
   ```bash
   cd /path/to/Zer0Board
   git checkout <previous-version-tag>
   # Or restore from your backup directory
   ```

2. **Reinstall dependencies and rebuild:**
   ```bash
   # Backend
   cd backend
   source venv/bin/activate
   pip install -r requirements.txt
   
   # Frontend
   cd ../zero-board
   npm install
   npm run build
   ```

3. **Restart services:**
   ```bash
   sudo systemctl restart zero-board-backend
   sudo systemctl restart zero-board-frontend
   ```

---

## Troubleshooting

### Common Issues

#### Docker Compose: Containers won't start

1. **Check logs:**
   ```bash
   docker-compose logs
   ```

2. **Check for port conflicts:**
   ```bash
   # Check if ports are in use
   netstat -tulpn | grep :3000
   netstat -tulpn | grep :8000
   ```

3. **Rebuild from scratch:**
   ```bash
   docker-compose down -v  # Removes volumes too
   docker-compose build --no-cache
   docker-compose up -d
   ```

#### Service Installation: Services fail to start

1. **Check service status:**
   ```bash
   sudo systemctl status zero-board-backend
   sudo systemctl status zero-board-frontend
   ```

2. **Check logs:**
   ```bash
   sudo journalctl -u zero-board-backend -n 50
   sudo journalctl -u zero-board-frontend -n 50
   ```

3. **Verify dependencies:**
   ```bash
   # Backend
   cd backend
   source venv/bin/activate
   pip list
   
   # Frontend
   cd zero-board
   npm list
   ```

4. **Check file permissions:**
   ```bash
   # Ensure service user has access
   ls -la /path/to/Zer0Board
   ```

#### Database Migration Issues

If the update includes database migrations:

1. **Backup your database first**
2. **Check release notes for migration instructions**
3. **Run migrations manually if needed:**
   ```bash
   # For backend
   cd backend
   source venv/bin/activate
   # Check for migration scripts in the release notes
   ```

#### Environment Variable Issues

1. **Compare with `.env.sample`:**
   ```bash
   diff .env .env.sample
   ```

2. **Check for deprecated variables in release notes**
3. **Update your `.env` file accordingly**

### Getting Help

If you encounter issues not covered here:

1. Check the [GitHub Issues](https://github.com/loqtek/Zer0Board/issues)
2. Review the [Release Notes](https://github.com/loqtek/Zer0Board/releases) for the version you're updating to
3. Check the application logs for detailed error messages

---

## Version History

For a complete list of releases and their changes, visit:
https://github.com/loqtek/Zer0Board/releases

---

**Note:** Always backup your data before updating. While updates are designed to be safe, having a backup ensures you can quickly roll back if needed.

