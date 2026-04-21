# ETERA Health Initiative - Docker Setup

This project is containerized and ready for production deployment using Docker.

## Quick Reference

### Build the project
```bash
docker-compose build
```

### Start services
```bash
docker-compose up -d
```

### Stop services
```bash
docker-compose down
```

### View logs
```bash
docker-compose logs -f
```

### Access services
- **Frontend**: http://localhost
- **API**: http://localhost:5000
- **Database**: localhost:3306

## File Structure

```
├── backend/
│   ├── Dockerfile           # Backend container definition
│   ├── server.js            # Main application entry
│   ├── package.json         # Node dependencies
│   ├── .env.example         # Example environment variables
│   ├── config/
│   │   ├── db.js           # Database configuration
│   │   ├── logger.js       # Logging utility
│   │   └── errors.js       # Error handling
│   ├── routes/             # API route definitions
│   ├── controllers/        # Business logic
│   ├── middleware/         # Express middleware
│   └── uploads/            # File upload storage
│
├── frontend/
│   ├── Dockerfile          # Frontend container definition
│   ├── nginx.conf          # Nginx web server config
│   ├── index.html          # Main HTML file
│   ├── app.js              # JavaScript application
│   ├── style.css           # Styling
│   └── assets/             # Static assets
│
├── docker-compose.yml      # Docker Compose orchestration
├── .dockerignore           # Files excluded from Docker build
├── .gitignore              # Files excluded from Git
├── .env.example            # Environment variables template
├── init.sql                # Database initialization script
└── DEPLOYMENT.md           # Detailed deployment guide
```

## Environment Configuration

Before running in production:

1. Copy `.env.example` to `.env`
2. Update all values, especially:
   - `DB_PASSWORD` - Strong random password
   - `JWT_SECRET` - Long random string (32+ characters)
   - `CORS_ORIGIN` - Your domain
   - Email credentials if using contact forms

```bash
cp .env.example .env
nano .env  # Edit with your values
```

## Database

The init.sql script automatically creates:
- Tables with proper indexes
- Default admin user
- Sample content

Database backups are essential! See DEPLOYMENT.md for backup procedures.

## Security Notes

- Always change default credentials
- Use strong passwords and secrets
- Keep Docker images updated
- Implement HTTPS/TLS in production
- Restrict network access
- Monitor logs regularly

## Troubleshooting

### Port already in use
Change ports in `.env` file:
```
API_PORT=5001
WEB_PORT=8080
DB_PORT=3307
```

### Database won't start
- Check disk space: `docker system df`
- Check logs: `docker-compose logs db`
- Verify MySQL configuration in docker-compose.yml

### Services not communicating
- Verify all services are running: `docker-compose ps`
- Check network: `docker network ls`
- Review logs for connection errors

## Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Express.js Documentation](https://expressjs.com/)
- [MySQL Documentation](https://dev.mysql.com/doc/)
- [Nginx Documentation](https://nginx.org/en/docs/)

See `DEPLOYMENT.md` for complete production deployment guide.
