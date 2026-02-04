# Production Security Checklist

## Database Access Security

### ❌ NEVER Expose in Production

**Prisma Studio (Port 5555)**
- [ ] Prisma Studio is NOT running in production
- [ ] No `prisma studio` command in production start scripts
- [ ] No port 5555 exposed in firewall/security groups
- [ ] No Docker EXPOSE 5555 in production images

**How to Check:**
```bash
# On production server:
netstat -tuln | grep 5555
# Should return NOTHING

ps aux | grep "prisma studio"
# Should return NOTHING (except the grep command itself)
```

### ✅ Safe Database Access Methods

**For Developers:**
1. **SSH Tunnel** (Recommended)
   ```bash
   ssh -L 5432:localhost:5432 user@production-server
   # Then connect to localhost:5432 with DB client
   ```

2. **VPN + Private DB**
   - Database only accessible within VPN
   - No public IP on database server

3. **Bastion Host**
   - Jump server with strict access controls
   - MFA required
   - Audit logs enabled

**For Production Operations:**
1. **Prisma Migrate** (schema changes)
   ```bash
   pnpm prisma migrate deploy  # Non-interactive, safe for CI/CD
   ```

2. **Application Code** (data operations)
   - Use your API/admin routes
   - With proper authentication and authorization
   - Audit logging enabled

3. **Read-Only Replicas** (analytics/reporting)
   - Separate read replica with limited access
   - Cannot modify production data

### 🔐 Environment-Specific Configuration

**.env.local (Development)**
```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5434/cogumi-ai-protect
PRISMA_STUDIO_ENABLED=true  # OK in dev
```

**.env.production**
```bash
DATABASE_URL=postgresql://user:password@db.internal:5432/cogumi-ai-protect
PRISMA_STUDIO_ENABLED=false  # MUST be false or omitted
```

### 🚨 Red Flags (Immediate Action Required)

If you see any of these in production:

1. **Port 5555 is open:**
   ```bash
   # Check firewall
   sudo ufw status | grep 5555
   # Should show NOTHING
   ```

2. **Prisma Studio in process list:**
   ```bash
   ps aux | grep prisma
   # Should NOT show "prisma studio"
   ```

3. **Public IP can access port 5555:**
   ```bash
   # From external machine:
   telnet production-ip 5555
   # Should FAIL to connect
   ```

**Immediate Mitigation:**
```bash
# Kill Prisma Studio if running:
pkill -f "prisma studio"

# Block port 5555 in firewall:
sudo ufw deny 5555
```

### 📋 Deployment Checklist

Before deploying to production:

- [ ] Remove `prisma studio` from package.json scripts (or mark as dev-only)
- [ ] No port 5555 in Docker EXPOSE directives
- [ ] No port 5555 in Kubernetes Service definitions
- [ ] Database URL uses strong, unique password (not `postgres:postgres`)
- [ ] Database not accessible from public internet
- [ ] SSL/TLS enabled for database connections
- [ ] Database firewall rules restrict to application servers only
- [ ] Connection pooling configured (e.g., PgBouncer)
- [ ] Database backups automated and tested
- [ ] Read replicas for analytics/reporting (optional)

### 🔍 Current Project Status

**✅ SAFE - Prisma Studio Configuration:**
- Only in `package.json` as a manual script (`db:studio`)
- Not auto-started with the application
- Binds to localhost only (default Prisma behavior)
- Not included in production Docker images (if applicable)

**Current Setup (from package.json):**
```json
{
  "scripts": {
    "db:studio": "cd packages/db && pnpm prisma studio"
  }
}
```

This is safe because:
1. Must be manually invoked with `pnpm db:studio`
2. Not part of `dev` or `build` scripts
3. Only runs when developer explicitly starts it
4. Automatically stops when terminal is closed

### 📚 Additional Resources

**Prisma Security Best Practices:**
- https://www.prisma.io/docs/guides/deployment/deployment-guides
- https://www.prisma.io/docs/guides/performance-and-optimization/connection-management

**Database Security:**
- Use connection pooling (PgBouncer, Amazon RDS Proxy)
- Enable SSL/TLS connections
- Implement least-privilege access
- Regular security audits
- Monitor slow queries and connection limits

### 🛡️ Recommended Production Setup

```
┌─────────────┐
│   Internet  │
└──────┬──────┘
       │
       │ HTTPS (443)
       ▼
┌─────────────────┐
│  Load Balancer  │
└────────┬────────┘
         │
         │ HTTP (3000)
         ▼
┌─────────────────────┐
│  App Server(s)      │
│  - Next.js UI       │
│  - No DB admin      │
│  - No port 5555     │
└──────┬──────────────┘
       │
       │ PostgreSQL (5432)
       │ Private network only
       ▼
┌─────────────────────┐
│  Database Server    │
│  - No public IP     │
│  - VPC/Private net  │
│  - Firewall rules   │
└─────────────────────┘

Developers access DB via:
- SSH tunnel through bastion host
- VPN connection
- Read replicas for queries
```

---

**Status**: ✅ Your current setup is secure for development. Prisma Studio is not exposed and only runs when manually invoked.
