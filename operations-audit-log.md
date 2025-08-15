# Operations Audit Log - WM Foundations Project

## Session Date: 2024-12-19
## Session Time: Current Session
## Location: D:\Software_Projects\wm-foundations

---

## Commands Executed

### Docker Container Management Operations

| Command | Timestamp | Purpose | Result |
|---------|-----------|---------|--------|
| `docker ps` | Session Start | Check running containers | Listed active containers |
| `docker ps -a` | Session Start | Check all containers (including stopped) | Listed all container states |
| `docker stats --no-stream` | Session Start | Check container resource usage | Retrieved CPU/Memory statistics |
| `docker ps --format "table {{.ID}}\t{{.Names}}\t{{.Status}}" --filter "name=n8n-mcp"` | Session | Filter n8n-mcp containers | No containers matched filter |
| `docker ps --format "table {{.ID}}\t{{.Names}}\t{{.Status}}"` | Session | Check container status formatted | Listed all containers with status |
| `docker container prune -f` | Session | Remove stopped containers | Cleanup operation completed |

---

## Container IDs Affected

### Active Containers at Time of Documentation:

| Container ID | Name | Image | Status | Health | Ports |
|--------------|------|-------|--------|--------|-------|
| `af508c3df3f9` | intelligent_ishizaka | ghcr.io/czlonkowski/n8n-mcp:latest | Up 2 hours | Unhealthy | 3000/tcp |
| `166b62dad894` | clever_cannon | ghcr.io/czlonkowski/n8n-mcp:latest | Up 2 hours | Unhealthy | 3000/tcp |
| `79f38ab6b591` | vibrant_bhabha | ghcr.io/czlonkowski/n8n-mcp:latest | Up 2 hours | Unhealthy | 3000/tcp |
| `2cf75fe8976f` | angry_lederberg | ghcr.io/czlonkowski/n8n-mcp:latest | Up 2 hours | Unhealthy | 3000/tcp |
| `e18c6619a2cf` | wm-foundations-dev | wm-foundations-dev:latest | Up 2 hours | Healthy | No ports exposed |

### Resource Usage Summary:
- **intelligent_ishizaka**: CPU 0.00%, Memory 19.73MiB/15.2GiB (0.13%)
- **clever_cannon**: CPU 0.00%, Memory 20.04MiB/15.2GiB (0.13%)  
- **vibrant_bhabha**: CPU 0.00%, Memory 19.76MiB/15.2GiB (0.13%)
- **angry_lederberg**: CPU 1.75%, Memory 55.64MiB/15.2GiB (0.36%) - *Active*
- **wm-foundations-dev**: CPU 0.00%, Memory 9.879MiB/15.2GiB (0.06%)

---

## Final Verification Output

### Container Status Verification:
```
CONTAINER ID   IMAGE                                COMMAND                  CREATED       STATUS                   PORTS      NAMES
af508c3df3f9   ghcr.io/czlonkowski/n8n-mcp:latest   "/usr/local/bin/dock…"   2 hours ago   Up 2 hours (unhealthy)   3000/tcp   intelligent_ishizaka
166b62dad894   ghcr.io/czlonkowski/n8n-mcp:latest   "/usr/local/bin/dock…"   2 hours ago   Up 2 hours (unhealthy)   3000/tcp   clever_cannon
79f38ab6b591   ghcr.io/czlonkowski/n8n-mcp:latest   "/usr/local/bin/dock…"   2 hours ago   Up 2 hours (unhealthy)   3000/tcp   vibrant_bhabha
2cf75fe8976f   ghcr.io/czlonkowski/n8n-mcp:latest   "/usr/local/bin/dock…"   2 hours ago   Up 2 hours (unhealthy)   3000/tcp   angry_lederberg
e18c6619a2cf   wm-foundations-dev:latest            "docker-entrypoint.s…"   2 hours ago   Up 2 hours                          wm-foundations-dev
```

### Performance Metrics:
- Total containers running: 5
- Healthy containers: 1 (wm-foundations-dev)
- Unhealthy containers: 4 (all n8n-mcp instances)
- Total memory usage: ~125 MiB across all containers
- Total CPU usage: 1.75% (primarily from angry_lederberg)

---

## Notes and Observations

1. **Container Health Issues**: Four n8n-mcp containers are showing as "unhealthy" status
2. **Resource Efficiency**: Low overall resource consumption across all containers
3. **Container Cleanup**: `docker container prune -f` was executed to remove stopped containers
4. **Active Development Container**: wm-foundations-dev is running normally and healthy

---

## Recommended Actions

1. Investigate health check failures for n8n-mcp containers
2. Consider consolidating multiple n8n-mcp instances if they're duplicates
3. Monitor angry_lederberg container for higher CPU usage

---

## Audit Trail
- **Documented by**: AI Assistant
- **Documentation method**: Automated audit log generation
- **Data sources**: Docker CLI commands, PowerShell history
- **Verification**: Real-time container status and statistics
- **Log location**: `D:\Software_Projects\wm-foundations\operations-audit-log.md`

---

*This log serves as a permanent record of container operations for compliance and troubleshooting purposes.*
