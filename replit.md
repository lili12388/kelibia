# Hay Khadhra & Cité Olympique Rental Hub

A fast, modern rental property platform connecting property owners with tenants in the Hay Khadhra & Cité Olympique neighborhoods of Tunisia.

## Overview

This is a full-stack web application that facilitates property rentals through a central broker. The platform features:

- **Two-path user interface**: Separate flows for property owners and tenants
- **Broker-mediated workflow**: All property listings are reviewed and approved by a broker before publication
- **Secure file uploads**: Multi-image and video upload with automatic image optimization
- **Amazon-style browsing**: Clean, card-based property gallery with lazy loading
- **Responsive design**: Mobile-first approach with beautiful UI across all devices

## Architecture

### Frontend (React + TypeScript + Tailwind CSS)
- **Landing Page**: Two-choice gateway directing users to owner or tenant flows
- **Owner Flow**: Property submission form → Confirmation page
- **Tenant Flow**: Property gallery → Property detail pages
- **Broker Flow**: Login → Dashboard with approval/rejection workflow
- **Design System**: Blue/green trustworthy color scheme with shadcn components

### Backend (Express + PostgreSQL)
- **Public API**: Property listings accessible to all tenants
- **Authenticated API**: Broker-only endpoints protected with session-based auth
- **File Processing**: Multer for uploads, Sharp for image optimization
- **Database**: PostgreSQL with Drizzle ORM

### Key Features

1. **Property Submission**
   - Owners submit property details (title, description, rooms, bathrooms, size, location, price)
   - Upload multiple images and videos (up to 10 files, 50MB each)
   - Images automatically optimized (max 1920x1080, 85% quality, progressive JPEG)
   - All submissions private until broker approval

2. **Broker Dashboard**
   - Password-protected access (default: `broker123` - change via BROKER_PASSWORD env var)
   - Review pending submissions with full details and media
   - Approve submissions to publish them publicly
   - Reject submissions that don't meet criteria
   - View all active listings

3. **Property Browsing**
   - Public gallery of approved properties
   - Amazon-style card layout with primary images
   - Lazy-loaded images for performance
   - Property details page with full image gallery
   - Contact broker for inquiries

## Technical Stack

- **Frontend**: React, TypeScript, Tailwind CSS, Shadcn UI, TanStack Query, Wouter
- **Backend**: Node.js, Express, TypeScript
- **Database**: PostgreSQL (Neon), Drizzle ORM
- **File Upload**: Multer, Sharp
- **Authentication**: Express Session

## Database Schema

### Tables
- `property_submissions` - Private submissions from property owners (pending/approved/rejected)
- `properties` - Public listings visible to tenants (approved only)
- `submission_media` - Images/videos for submissions
- `property_media` - Images/videos for published properties

### Workflow
1. Owner submits property → Creates `property_submissions` record + `submission_media`
2. Broker reviews → Updates status to 'approved' or 'rejected'
3. On approval → Creates `properties` record + copies to `property_media`
4. Tenants browse → Query `properties` table only

## Environment Variables

Required:
- `DATABASE_URL` - PostgreSQL connection string (auto-provided by Replit)
- `SESSION_SECRET` - Session encryption key (auto-provided by Replit)

Optional:
- `BROKER_PASSWORD` - Password for broker login (default: 'broker123')
- `PORT` - Server port (default: 5000)

## API Endpoints

### Public Endpoints
- `GET /api/properties` - List all approved properties
- `GET /api/properties/:id` - Get specific property details
- `POST /api/properties/submit` - Submit new property (with multipart/form-data)

### Broker Endpoints (Authentication Required)
- `POST /api/broker/login` - Authenticate broker
- `POST /api/broker/logout` - End broker session
- `GET /api/broker/auth-status` - Check authentication status
- `GET /api/broker/submissions/:status` - List submissions by status (pending/approved/rejected)
- `POST /api/broker/submissions/:id/approve` - Approve and publish submission
- `POST /api/broker/submissions/:id/reject` - Reject submission

## Routes

- `/` - Landing page
- `/list-property` - Property submission form
- `/submission-confirmed` - Confirmation after submission
- `/browse-properties` - Public property gallery
- `/property/:id` - Property detail page
- `/broker/login` - Broker authentication
- `/broker/dashboard` - Broker management dashboard (protected)

## Development

```bash
# Install dependencies
npm install

# Push database schema
npm run db:push

# Start development server
npm run dev
```

The application runs on port 5000 by default.

## Production Deployment

Before deploying to production:

1. Set strong `BROKER_PASSWORD` via environment variables
2. Ensure `SESSION_SECRET` is set to a random secure string
3. Configure production session store (currently using in-memory)
4. Set up CDN for uploaded media files
5. Enable HTTPS (session cookies require secure flag in production)

## User Flows

### Property Owner Flow
1. Visit landing page → Click "I Have a Property to Rent"
2. Fill out property details form
3. Upload images/videos
4. Submit → See confirmation message
5. Broker contacts owner after review

### Tenant Flow
1. Visit landing page → Click "I Need a Place to Rent"
2. Browse property gallery
3. Click property card → View full details
4. Contact broker for inquiries/viewings

### Broker Flow
1. Navigate to `/broker/login`
2. Enter password (default: `broker123`)
3. Access dashboard with pending submissions
4. Review property details, images, owner contact
5. Approve (publishes to tenants) or Reject
6. Monitor active listings

## Recent Changes

- Implemented complete frontend with exceptional visual quality
- Built backend API with PostgreSQL database
- Added session-based broker authentication
- Implemented image optimization with Sharp
- Protected all broker endpoints with authentication middleware
- Added broker login page and auth guard
- Implemented temp file cleanup after image optimization

## Future Enhancements

- Search and filter functionality (price range, rooms, location)
- Contact forms for tenant-broker communication
- Email notifications for new submissions
- Property comparison feature
- Analytics dashboard for broker
- Multi-language support
