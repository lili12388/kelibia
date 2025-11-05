# Khadhra Rentals - Property Rental Platform

A modern, full-stack property rental platform connecting property owners with tenants through a broker-mediated workflow.

## 🚀 Features

- **Property Submission**: Owners can submit properties with details, images, and Google Maps location
- **Broker Dashboard**: Review, edit, and approve/reject property submissions
- **Property Browsing**: Public gallery of approved properties with detailed views
- **Deposit Management**: Toggle deposit requirements (cautionnement) for each property
- **Neighborhood Maps**: Brokers can add neighborhood location maps to properties
- **Image Optimization**: Automatic image compression and optimization using Sharp

## 🛠️ Tech Stack

### Frontend
- React 18 + TypeScript
- Vite (build tool)
- Tailwind CSS + Radix UI components
- TanStack Query (data fetching)
- React Hook Form + Zod (form validation)
- Wouter (routing)

### Backend
- Node.js + Express
- PostgreSQL (Neon)
- Drizzle ORM
- Multer (file uploads)
- Sharp (image optimization)
- Express Session (authentication)

## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd KhadhraRentals
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   - Copy `.env.example` to `.env`
   - Update `DATABASE_URL` with your Neon PostgreSQL connection string
   - Change `SESSION_SECRET` to a secure random string
   - Set `BROKER_PASSWORD` (default: broker123)

4. **Push database schema**
   ```bash
   npm run db:push
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

   The app will be available at `http://localhost:5000`

## 🗂️ Project Structure

```
KhadhraRentals/
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── hooks/         # Custom React hooks
│   │   ├── lib/           # Utility functions
│   │   └── pages/         # Page components
│   └── public/            # Static assets
├── server/                # Backend Express application
│   ├── middleware/        # Auth middleware
│   ├── db.ts             # Database connection
│   ├── routes.ts         # API endpoints
│   ├── storage.ts        # Database queries
│   └── index.ts          # Server entry point
├── shared/               # Shared types and schemas
│   └── schema.ts        # Drizzle schema definitions
├── public/
│   └── uploads/         # User-uploaded images
└── temp/                # Temporary upload processing
```

## 🔑 API Endpoints

### Public Endpoints
- `GET /api/properties` - List all approved properties
- `GET /api/properties/:id` - Get property details
- `POST /api/properties/submit` - Submit new property

### Broker Endpoints (Auth Required)
- `POST /api/broker/login` - Broker login
- `POST /api/broker/logout` - Broker logout
- `GET /api/broker/auth-status` - Check auth status
- `GET /api/broker/submissions/:status` - Get submissions by status
- `PUT /api/broker/submissions/:id` - Update submission details
- `POST /api/broker/submissions/:id/approve` - Approve submission
- `POST /api/broker/submissions/:id/reject` - Reject submission

## 📱 User Flows

### Property Owner
1. Visit homepage → Click "I Have a Property to Rent"
2. Fill out property form (title, description, rooms, price, etc.)
3. Upload property images (up to 10 files)
4. Optionally add Google Maps location
5. Submit → Receive confirmation

### Tenant
1. Visit homepage → Click "I Need a Place to Rent"
2. Browse property gallery
3. Click property card → View full details
4. Contact broker for inquiries

### Broker
1. Login at `/broker-login` (default password: broker123)
2. View pending submissions
3. Click "Edit" to modify property details
4. Add neighborhood map if needed
5. Approve to publish or reject submission
6. View active listings in "Active Listings" tab

## 🔒 Security

- Session-based authentication for broker access
- Password protection for broker dashboard
- File upload validation (images/videos only)
- SQL injection protection via parameterized queries
- CORS configured for production

## 📝 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | - |
| `SESSION_SECRET` | Session encryption key | - |
| `BROKER_PASSWORD` | Broker login password | broker123 |
| `NODE_ENV` | Environment mode | development |
| `PORT` | Server port | 5000 |

## 🚀 Deployment

Before deploying to production:

1. Set a strong `BROKER_PASSWORD`
2. Set a secure random `SESSION_SECRET`
3. Configure production database URL
4. Set `NODE_ENV=production`
5. Enable HTTPS (required for secure cookies)
6. Consider using a CDN for uploaded media

## 📄 License

MIT

## 👨‍💻 Contact

- Email: laithou123@gmail.com
- Phone: 50 344 187
