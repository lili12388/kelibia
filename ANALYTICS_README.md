# Analytics System Documentation

## Overview
The Darna Rentals platform now includes a comprehensive analytics system that tracks visitor behavior, property views, and provides real-time insights for administrators.

## Features

### 1. **Visitor Tracking**
- Automatic tracking of all page visits
- Device type detection (desktop vs mobile)
- Tunisian city tracking
- Session-based visitor identification
- Referrer tracking
- Time on page monitoring
- Contact click tracking

### 2. **Site-Wide Analytics**
- Total visitors and page views (all time)
- Daily visitor statistics
- Desktop vs mobile breakdown
- City distribution (JSONB format for Tunisian cities)
- Unique session counting

### 3. **Per-Property Analytics**
- Individual property view counts
- Click tracking
- Device breakdown per property
- City-wise view distribution
- Last viewed timestamp
- Recent visitor activity

### 4. **Real-Time Dashboard**
- Active visitors counter (last 5 minutes)
- Live activity feed
- Top 5 most viewed properties
- Recent visitor logs with details
- Auto-refreshing data (every 5 seconds for real-time, 30 seconds for summary)

## Database Schema

### Tables Created

#### `visitor_logs`
Stores individual page visits with detailed information:
```sql
- id: Primary key (UUID)
- session_id: Unique identifier for visitor session
- timestamp: When the visit occurred
- page_url: Full URL visited
- property_id: If viewing a property (nullable)
- tunisian_city: City of the visitor (nullable)
- device_type: 'desktop' or 'mobile'
- user_agent: Browser information
- referrer: Where they came from
- time_on_page: Duration in seconds
- contact_clicked: Boolean for contact info access
```

#### `property_analytics`
Aggregated statistics per property:
```sql
- property_id: Primary key, references properties
- total_views: Total number of views
- total_clicks: Total contact clicks
- desktop_views: Views from desktop
- mobile_views: Views from mobile
- last_viewed_at: Most recent view timestamp
- city_views: JSONB object with city breakdown
- created_at: Record creation time
- updated_at: Last update time
```

#### `site_analytics`
Daily site-wide statistics:
```sql
- id: Primary key (UUID)
- date: Date in YYYY-MM-DD format (unique)
- total_visitors: Total visitors for the day
- total_page_views: Total page views for the day
- unique_sessions: Unique visitor sessions
- desktop_visitors: Desktop visitor count
- mobile_visitors: Mobile visitor count
- city_breakdown: JSONB object with city distribution
- created_at: Record creation time
```

## API Endpoints

### Admin Analytics Endpoints (Require Authentication)

#### `GET /api/admin/analytics/summary`
Returns overall analytics summary:
```json
{
  "totalVisitors": 1234,
  "totalPageViews": 5678,
  "todayVisitors": 45,
  "todayPageViews": 120,
  "activeVisitors": 3,
  "topProperties": [
    {
      "propertyId": "uuid",
      "totalViews": 150,
      "totalClicks": 25,
      "desktopViews": 100,
      "mobileViews": 50,
      "lastViewedAt": "2024-01-15T10:30:00Z"
    }
  ]
}
```

#### `GET /api/admin/analytics/visitors?limit=50&offset=0`
Returns paginated visitor logs:
```json
[
  {
    "id": "uuid",
    "sessionId": "uuid",
    "timestamp": "2024-01-15T10:30:00Z",
    "pageUrl": "/property/123",
    "propertyId": "123",
    "tunisianCity": "Tunis",
    "deviceType": "mobile",
    "userAgent": "Mozilla/5.0...",
    "referrer": "https://google.com",
    "contactClicked": true
  }
]
```

#### `GET /api/admin/analytics/property/:id`
Returns detailed analytics for a specific property:
```json
{
  "propertyId": "uuid",
  "totalViews": 150,
  "totalClicks": 25,
  "desktopViews": 100,
  "mobileViews": 50,
  "lastViewedAt": "2024-01-15T10:30:00Z",
  "cityViews": {
    "Tunis": 50,
    "Sousse": 30,
    "Sfax": 20
  },
  "recentVisitors": [...]
}
```

#### `GET /api/admin/analytics/real-time`
Returns real-time statistics:
```json
{
  "activeVisitors": 3,
  "recentActivity": [...]
}
```

### Public Endpoint

#### `POST /api/analytics/contact-click`
Track when a user clicks to view contact information:
```json
{
  "propertyId": "uuid"
}
```

## Frontend Components

### Admin Analytics Dashboard (`/admin/analytics`)
Features:
- **Overview Cards**: Total visitors, page views, today's stats, active users
- **Top Properties**: Top 5 most viewed properties with statistics
- **Recent Activity Table**: Last 50 visitor logs with filtering
- **Real-Time Updates**: Polling every 5 seconds for active visitors
- **Responsive Design**: Mobile-friendly layout

### Navbar Integration
- Analytics button added for admin users (replaces Home button)
- Icon: BarChart3 from lucide-react
- Route: `/admin/analytics`
- Only visible when logged in as admin

## Middleware

### `analyticsMiddleware`
Automatically tracks all page visits:
- Runs on every request (except API routes and static files)
- Generates or retrieves session ID
- Detects device type from user-agent
- Extracts property ID from URL
- Logs visit to `visitor_logs` table
- Updates `site_analytics` and `property_analytics` tables
- Non-blocking: Runs asynchronously

### Session Configuration
Extended Express session to include:
```typescript
interface SessionData {
  visitorId?: string;
  isAuthenticated?: boolean;
}
```

## Tunisian Cities Support

The system is designed to track visitors from 200+ Tunisian cities across all governorates:

**Major Cities Included:**
- Tunis, Ariana, Ben Arous, La Marsa, La Goulette
- Sousse, Monastir, Mahdia
- Sfax, Gabès, Gafsa
- Kairouan, Bizerte, Nabeul
- And many more...

Cities are stored in JSONB format in both `property_analytics.city_views` and `site_analytics.city_breakdown` columns, allowing for flexible querying and aggregation.

## Usage

### For Administrators

1. **Login** to the admin panel
2. Navigate to **Analytics** from the navbar
3. View real-time statistics and visitor activity
4. Monitor property performance
5. Track device and location trends

### Adding City Tracking

To enable city tracking, visitors can provide their city through:
- Query parameter: `?city=Tunis`
- Future enhancement: IP geolocation
- Future enhancement: User preference selection

### Tracking Contact Clicks

When a visitor clicks to view contact information on a property detail page, the frontend should call:

```typescript
await fetch('/api/analytics/contact-click', {
  method: 'POST',
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ propertyId: 'uuid' })
});
```

## Performance Considerations

1. **Asynchronous Logging**: All analytics tracking is non-blocking
2. **Database Indexes**: Consider adding indexes on frequently queried columns:
   - `visitor_logs.timestamp`
   - `visitor_logs.session_id`
   - `visitor_logs.property_id`
   - `site_analytics.date`

3. **Data Retention**: Consider implementing data cleanup for old visitor logs (e.g., keep last 90 days)

4. **Caching**: React Query automatically caches analytics data with configurable refetch intervals

## Future Enhancements

1. **IP Geolocation**: Automatic city detection from IP addresses
2. **Advanced Filtering**: Filter analytics by date range, city, device type
3. **Export Functionality**: Download analytics reports as CSV/PDF
4. **Property Analytics Modal**: View analytics directly from property cards
5. **Heatmaps**: Visualize which parts of the site get the most attention
6. **Conversion Tracking**: Track from view → contact click → submission
7. **Weekly/Monthly Reports**: Automated email reports for administrators
8. **Comparison Views**: Compare property performance side-by-side

## Security

- All analytics endpoints require broker authentication
- Session-based tracking (no personal data stored)
- Analytics data is only accessible to authenticated administrators
- No sensitive user information is logged

## Testing

### To test the analytics system:

1. Visit various pages while logged out
2. Login as admin and navigate to `/admin/analytics`
3. Verify visitor logs appear
4. View a property and check it shows in top properties
5. Check real-time counter updates
6. Test on both desktop and mobile devices
7. Add `?city=Tunis` to URLs to test city tracking

### Test Contact Click Tracking:

1. View a property detail page as admin
2. The contact information should be visible
3. Implement the contact click tracking API call
4. Verify it appears in analytics with `contactClicked: true`

## Migration

The analytics tables were created using the migration script:
```bash
npx tsx server/add-analytics-tables.ts
```

Output:
```
Creating analytics tables...
✓ Created visitor_logs table
✓ Created property_analytics table
✓ Created site_analytics table
✓ All analytics tables created successfully!
```

## Dependencies

- `uuid`: For generating unique session IDs
- `@types/uuid`: TypeScript types for uuid
- Drizzle ORM: Type-safe database queries
- React Query: Data fetching and caching
- Lucide React: Icons (BarChart3, Users, Eye, Activity, etc.)

## File Structure

```
server/
  ├── middleware/
  │   └── analytics.ts          # Analytics tracking middleware
  ├── add-analytics-tables.ts   # Migration script
  ├── routes.ts                 # Analytics API endpoints
  └── index.ts                  # Server setup with middleware

client/src/
  ├── pages/
  │   └── admin-analytics.tsx   # Analytics dashboard
  ├── components/
  │   └── navbar.tsx            # Updated with Analytics button
  └── App.tsx                   # Added /admin/analytics route

shared/
  └── schema.ts                 # Analytics table schemas and types
```

## Conclusion

The analytics system provides comprehensive insights into visitor behavior and property performance, enabling data-driven decisions for property management and marketing strategies. The real-time dashboard ensures administrators always have up-to-date information about their platform's usage and popularity.
