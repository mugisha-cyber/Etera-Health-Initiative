# ETERA Health Initiative

A full-stack web application for the ETERA Health Initiative - providing practical public health training, community partnerships, and evidence-based outreach.

## Features

- **User Authentication**: Secure login and registration with JWT tokens
- **Content Management**: Posts, videos, research papers, and image galleries
- **Contact Form**: Enable community engagement
- **Admin Dashboard**: Manage all content and user activities
- **Responsive Design**: Works on desktop and mobile devices
- **Production Ready**: Docker containerization and security best practices

## Tech Stack

### Frontend
- HTML5, CSS3, Vanilla JavaScript
- Responsive design
- Dynamic API integration

### Backend
- Node.js 18+ with Express.js
- MySQL 8.0 database
- JWT authentication
- File upload handling (videos, documents, images)
- Nodemailer for email notifications

### DevOps
- Docker & Docker Compose
- Nginx reverse proxy
- Multi-stage builds for optimization
- Health checks and monitoring

## Quick Start

### Requirements
- Docker and Docker Compose installed
- 2GB RAM minimum
- 10GB storage

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd Etera_Health_initiative

# Configure environment
cp .env.example .env
# Edit .env with your settings
nano .env

# Build and start
docker-compose build
docker-compose up -d

# Verify services
docker-compose ps
```

### Access the Application
- **Frontend**: http://localhost
- **API**: http://localhost:5000
- **Admin Dashboard**: http://localhost/admin.html

### Default Admin Credentials
- **Email**: admin@etera.health
- **Password**: Change immediately! See init.sql for hash

## Project Structure

```
.
├── backend/              # Node.js API server
│   ├── routes/          # API endpoints
│   ├── controllers/     # Business logic
│   ├── middleware/      # Auth, uploads, etc.
│   ├── config/          # Database, logging
│   └── uploads/         # File storage
├── frontend/            # Web application
│   ├── assets/         # Images, icons
│   ├── css/            # Stylesheets
│   └── *.html          # Page templates
├── docker-compose.yml  # Container orchestration
├── .env.example        # Configuration template
├── init.sql            # Database schema
├── DEPLOYMENT.md       # Production guide
└── DOCKER.md          # Docker setup guide
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout
- `POST /api/auth/forgot-password` - Password reset

### Content
- `GET /api/posts` - List posts
- `GET /api/videos` - List videos
- `GET /api/research` - List research papers
- `GET /api/gallery` - List gallery images
- `POST /api/content` - Update site content

### User Engagement
- `POST /api/engagement` - Like, comment, share content
- `GET /api/engagement/:contentType/:contentId` - Get engagement data

### Admin
- `POST /api/admin/users` - Manage users
- `POST /api/admin/posts` - Manage posts
- `POST /api/admin/videos` - Manage videos

See API documentation for complete endpoint details.

## Configuration

### Required Environment Variables

```env
# Database
DB_HOST=db
DB_USER=etera_user
DB_PASSWORD=secure_password
DB_NAME=etera_health

# Server
NODE_ENV=production
PORT=5000

# Security
JWT_SECRET=your-super-secret-key
CORS_ORIGIN=https://yourdomain.com

# Email (optional)
SMTP_HOST=smtp.gmail.com
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=app-password
```

See `.env.example` for all available options.

## Deployment

### Docker Deployment (Recommended)

1. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit with production values
   ```

2. **Build containers**
   ```bash
   docker-compose build
   ```

3. **Start services**
   ```bash
   docker-compose up -d
   ```

4. **Verify deployment**
   ```bash
   docker-compose ps
   curl http://localhost/health/ready
   ```

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed production setup, scaling, backups, and monitoring.

## Database

The application uses MySQL 8.0 with the following tables:
- `users` - User accounts and roles
- `posts` - Blog posts and articles
- `videos` - Video content
- `research` - Research papers
- `gallery` - Image galleries
- `content` - Site content management
- `contact_messages` - Contact form submissions
- `engagement` - User interactions (likes, comments)

Database is automatically initialized from `init.sql` on first run.

### Backup & Recovery

```bash
# Backup database
docker-compose exec db mysqldump -u etera_user -p etera_health > backup.sql

# Restore database
docker-compose exec -T db mysql -u etera_user -p etera_health < backup.sql
```

## Security

- ✅ Password hashing with bcrypt
- ✅ JWT token authentication
- ✅ CORS protection
- ✅ SQL injection prevention
- ✅ XSS protection headers
- ✅ Security headers (Helmet)
- ✅ File upload validation
- ✅ Non-root container execution

### Production Checklist

- [ ] Change all default passwords
- [ ] Set strong `JWT_SECRET`
- [ ] Enable HTTPS/TLS
- [ ] Configure firewall rules
- [ ] Set up automated backups
- [ ] Enable monitoring and logging
- [ ] Review and update dependencies
- [ ] Implement rate limiting

See [DEPLOYMENT.md](DEPLOYMENT.md) for complete security guidelines.

## Development

### Local Setup (Without Docker)

```bash
# Backend
cd backend
npm install
cp .env.example .env
npm run dev

# Frontend
# Serve static files with any HTTP server
python -m http.server 3000
```

### Code Structure

#### Backend
- **Routes**: Express route definitions in `/routes`
- **Controllers**: Request handlers in `/controllers`
- **Middleware**: Auth, validation, file upload in `/middleware`
- **Config**: Database, logging setup in `/config`

#### Frontend
- **HTML**: Page templates (index.html, admin.html, etc.)
- **JavaScript**: app.js handles API calls and UI
- **CSS**: Styled across base.css and page-specific CSS files
- **Assets**: Images and static files in `/assets`

## Monitoring & Logging

The application includes:
- **Structured logging** - JSON formatted logs with levels
- **Health checks** - API endpoints for monitoring
- **Error handling** - Comprehensive error messages
- **Request logging** - HTTP request/response tracking

Configure log level in `.env`:
```env
LOG_LEVEL=info  # error, warn, info, debug
```

## Performance

- Nginx gzip compression enabled
- Static asset caching (30 days)
- Database connection pooling
- Multi-stage Docker builds
- Optimized images (Alpine base)

## Troubleshooting

### Backend won't connect to database
```bash
docker-compose logs db
docker-compose ps  # Check if db is running
```

### Frontend API calls failing
- Check CORS configuration in `.env`
- Verify backend is running: `curl http://localhost:5000`
- Check browser console for errors

### Port conflicts
```bash
# Change ports in .env
docker-compose down
docker-compose up -d
```

### Database issues
```bash
# Check database logs
docker-compose logs db

# Access database
docker-compose exec db mysql -u etera_user -p
```

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed troubleshooting guide.

## Contributing

1. Create feature branch
2. Make changes and test thoroughly
3. Submit pull request with description

## License

ISC License

## Support

For issues and questions:
1. Check existing documentation
2. Review application logs
3. Consult [DEPLOYMENT.md](DEPLOYMENT.md)
4. Contact development team

---

**Last Updated**: April 2024
**Version**: 1.0.0
**Status**: Production Ready
