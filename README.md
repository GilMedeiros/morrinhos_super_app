# Morrinhos Express.js Application

A Node.js web application built with Express.js framework, PostgreSQL database, and Redis cache.

## Features

- Express.js web server
- EJS templating engine
- MVC architecture (Models, Views, Controllers)
- PostgreSQL database with connection pooling
- Redis caching for improved performance
- Docker containerization
- Static file serving
- REST API endpoints
- Error handling
- Responsive design

## Technologies Used

- **Node.js** - JavaScript runtime
- **Express.js** - Web framework
- **EJS** - Templating engine
- **PostgreSQL** - Primary database
- **Redis** - Caching and session store
- **Docker & Docker Compose** - Containerization
- **Nodemon** - Development auto-restart tool

## Project Structure

```
├── index.js                 # Main application entry point
├── package.json             # Dependencies and scripts
├── controllers/             # Route controllers
│   ├── homeController.js    # Home page routes
│   └── apiController.js     # API routes
├── models/                  # Data models
│   └── User.js              # User model example
├── view/                    # EJS templates
│   ├── index.ejs            # Home page
│   ├── about.ejs            # About page
│   └── 404.ejs              # Error page
└── public/                  # Static files
    ├── style.css            # Styles
    └── script.js            # Client-side JavaScript
```

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm (comes with Node.js)
- Docker Desktop (for containerized setup)

### Quick Start with Docker (Recommended)

1. Clone and navigate to the project
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment:
   ```bash
   cp .env.example .env
   ```
4. Start with Docker:
   ```bash
   npm run docker:up
   ```
5. Access the application at `http://localhost:3000`

📖 **Detailed Docker instructions**: See [DOCKER-README.md](./DOCKER-README.md)

### Local Development (Without Docker)

1. Install dependencies:
   ```bash
   npm install
   ```
2. Set up PostgreSQL and Redis locally
3. Configure `.env` file with local database connections
4. Run development server:
   ```bash
   npm run dev
   ```

## Available Routes

### Web Routes
- `GET /` - Home page
- `GET /about` - About page

### API Routes
- `GET /api` - API status
- `GET /api/health` - Health check (PostgreSQL + Redis)
- `GET /api/users` - Get all users (with caching)
- `GET /api/users/:id` - Get user by ID (with caching)
- `POST /api/users` - Create a new user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

## API Usage Examples

### Get API Status
```bash
curl http://localhost:3000/api
```

### Get Users
```bash
curl http://localhost:3000/api/users
```

### Update User
```bash
curl -X PUT http://localhost:3000/api/users/USER_ID \
  -H "Content-Type: application/json" \
  -d '{"name": "João Updated", "email": "joao.updated@example.com"}'
```

### Health Check
```bash
curl http://localhost:3000/api/health
```

## Docker Services

When running with Docker Compose, the following services are available:

- **App**: http://localhost:3000 (Main application)
- **PostgreSQL**: localhost:5432 (Database)
- **Redis**: localhost:6379 (Cache)
- **PgAdmin**: http://localhost:8080 (PostgreSQL admin interface)
- **Redis Commander**: http://localhost:8081 (Redis admin interface)

## Development

### Adding New Routes

1. Create a controller in the `controllers/` directory
2. Add routes in `index.js`
3. Create corresponding views in the `view/` directory if needed

### Adding New Models

1. Create model files in the `models/` directory
2. Follow the pattern established in `User.js`

## Scripts

- `npm start` - Start the production server
- `npm run dev` - Start development server with nodemon
- `npm run docker:build` - Build Docker images
- `npm run docker:up` - Start all services with Docker Compose
- `npm run docker:down` - Stop all Docker services
- `npm run docker:logs` - View Docker logs
- `npm run docker:restart` - Restart application container
- `npm test` - Run tests (placeholder)

## Technologies Used

- **Node.js** - JavaScript runtime
- **Express.js** - Web framework
- **EJS** - Templating engine
- **Nodemon** - Development auto-restart tool

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

ISC License
