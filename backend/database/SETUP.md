# Database Setup Guide

Production-ready database configuration for local development and Alibaba Cloud RDS deployment.

## Quick Start (Local Development)

### 1. Install MySQL locally

**macOS (using Homebrew):**
```bash
brew install mysql
brew services start mysql
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get install mysql-server
sudo systemctl start mysql
```

**Windows:**
Download from [MySQL Community Server](https://dev.mysql.com/downloads/mysql/) or use WSL.

### 2. Initialize the database

```bash
# Connect to MySQL
mysql -u root -p

# In MySQL shell, create the database and import schema:
SOURCE /path/to/backend/database/init.sql;

# Verify tables were created
SHOW TABLES;
EXIT;
```

### 3. Configure environment variables

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env`:
```env
NODE_ENV=development
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=errandify_local
```

### 4. Install Node dependencies

```bash
cd backend
npm install
```

### 5. Start the backend server

```bash
npm start
# Server runs on http://localhost:3000
```

## Database Schema Overview

### Schema Components (6 sections)

1. **Leave Management**
   - `leave_applications` - Staff leave requests
   - `leave_approval_history` - Approval audit trail
   - `leave_conflicts` - Overlapping leave detection
   - `company_operating_hours` - Company work hours
   - `special_dates` - Public holidays & blocked dates

2. **Penalty Management**
   - `penalties` - Issued penalties to staff
   - `penalty_appeals` - Appeals against penalties

3. **Dispute Management**
   - `disputes` - Errand disputes
   - `dispute_evidence` - Photo/document evidence

4. **Point Earning Rules**
   - `point_earning_rules` - Company point configurations
   - `point_earnings` - Staff points history

5. **Advertising Management**
   - `advertising_campaigns` - Ad campaigns
   - `ad_performance` - Campaign metrics

6. **Audit & Logging**
   - `audit_logs` - System action logging

### Sample Data

The `init.sql` script includes test data:
- **Company**: Rumah Emas Demo Company (gold tier)
- **Staff**: 3 test employees
- **Manager/Owner**: 2 test managers
- **Operating Hours**: Monday-Saturday, closed Sundays
- **Holidays**: CNY, Christmas, team events

## Key Features

### Stored Procedures

**`sp_create_recurring_leave_instances()`**
- Auto-generates recurring leave instances (weekly/bi-weekly/monthly)
- Runs on a schedule to expand parent leave requests

**`sp_detect_leave_conflicts()`**
- Finds overlapping leave requests
- Marks as critical severity conflicts

### Views

**`v_staff_availability`**
- Summary of each staff member's leave status
- Counts pending/approved/rejected leave

**`v_leave_conflicts_summary`**
- Aggregate conflict statistics by severity

**`v_active_penalties`**
- Currently active penalties with days remaining

### Indexes

Performance indexes for common queries:
- Staff + status + date range lookups
- Company leave searches
- Conflict resolution queries
- Special date lookups

## Migration to Alibaba Cloud RDS

### Prerequisites

1. Create RDS instance in Alibaba Console
   - Engine: MySQL 8.0+
   - Storage: 20GB SSD minimum
   - Tier: 2-core, 4GB RAM minimum
   - Backup: 7-day retention
   - SSL: Enabled

2. Get connection details:
   - Endpoint: `rm-xxxxx.mysql.rds.aliyuncs.com`
   - Port: 3306
   - Username & password

3. Whitelist your IP in security group

### Deploy Schema to Alibaba

```bash
# SSH into your deployment server or local machine
mysql -h rm-xxxxx.mysql.rds.aliyuncs.com \
      -u your_username \
      -p \
      --ssl-mode=REQUIRED

# Create database
CREATE DATABASE errandify CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# Import schema
SOURCE ./backend/database/schema.sql;

# Verify
SELECT COUNT(*) as table_count FROM information_schema.tables WHERE table_schema='errandify';
```

### Update Environment Variables

```bash
# backend/.env (production)
NODE_ENV=production
DB_HOST=rm-xxxxx.mysql.rds.aliyuncs.com
DB_PORT=3306
DB_USER=your_username
DB_PASSWORD=your_password
DB_NAME=errandify
```

### Alibaba RDS Optimizations

Features configured in `schema.sql`:
- **Strict SQL Mode** - Data integrity
- **UTF8MB4 Collation** - Full emoji & Unicode support
- **Connection Pooling** - 100 max connections (production)
- **Slow Query Logging** - Queries > 1s logged
- **InnoDB Engine** - ACID compliance, foreign keys

Alibaba features (configured in console):
- **Automated Backups** - Daily, 7-day retention
- **Binary Logging** - Replication capable
- **Read Replicas** - Set via `DB_READ_REPLICAS` env var
- **SSL Connections** - Enabled by default

## Monitoring & Maintenance

### Check Connection Health

```bash
node -e "
const db = require('./database/connection.js');
db.getPool().then(() => {
  console.log('✅ Database connected');
  console.log(db.getPoolStats());
  process.exit(0);
}).catch(err => {
  console.error('❌ Connection failed:', err.message);
  process.exit(1);
});
"
```

### Monitor Query Performance

Slow queries are logged in Alibaba console (> 1s threshold).

```bash
# View slow query log on RDS
# Login to Alibaba console > RDS > Logs > Slow Query Log
```

### Backup & Recovery

**Local Development:**
```bash
# Backup
mysqldump -u root -p errandify_local > backup.sql

# Restore
mysql -u root -p errandify_local < backup.sql
```

**Alibaba Cloud:**
- Handled automatically by RDS
- Access backups via Alibaba console
- Download or restore to new instance

## Database Connection Pool

### Local Development
```javascript
// config/database.config.js
connectionLimit: 10,      // 10 concurrent connections
waitForConnections: true,
keepAliveInitialDelayMs: 0,
```

### Production (Alibaba)
```javascript
connectionLimit: 100,     // 100 concurrent connections
keepAliveInitialDelayMs: 0,
enableSSL: true,          // SSL required
multipleStatements: false, // Security
```

## Troubleshooting

### Can't connect to MySQL locally?
```bash
# Check if MySQL is running
brew services list | grep mysql

# Start MySQL
brew services start mysql

# Check port 3306
lsof -i :3306
```

### Permission denied errors?
```bash
# Check MySQL user permissions
mysql -u root -p -e "SELECT user, host FROM mysql.user;"

# Grant permissions (if needed)
mysql -u root -p -e "GRANT ALL PRIVILEGES ON errandify_local.* TO 'root'@'localhost';"
```

### Schema import failed?
```bash
# Check if database exists
mysql -u root -p -e "SHOW DATABASES;"

# Check for syntax errors in schema.sql
mysql -u root -p < backend/database/schema.sql 2>&1 | head -20
```

### Alibaba RDS connection timeout?
- Check security group allows your IP + port 3306
- Verify endpoint URL is correct
- Ensure SSL is configured properly
- Check network connectivity: `ping rm-xxxxx.mysql.rds.aliyuncs.com`

## Next Steps

1. **Build API Endpoints** - Create REST endpoints for leave management
2. **Implement Recurring Leave** - Generate instances from patterns
3. **Add Conflict Detection** - Automatically flag overlaps
4. **Admin Dashboard** - KPIs and approval workflows
5. **Export Functionality** - CSV/PDF reports

## References

- [MySQL 8.0 Documentation](https://dev.mysql.com/doc/refman/8.0/en/)
- [Alibaba RDS Documentation](https://www.alibabacloud.com/help/en/rds/latest/what-is-alibaba-cloud-rds)
- [Connection Pooling Best Practices](https://github.com/mysqljs/mysql/wiki/Connection-pooling)
