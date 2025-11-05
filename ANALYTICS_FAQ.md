# Analytics System - FAQ & Documentation

## 📊 What's Being Tracked?

### Currently Tracked:
- ✅ **Page visits** - Every page a user visits
- ✅ **Property views** - When someone views a specific property
- ✅ **Device type** - Desktop or Mobile (from user-agent)
- ✅ **Session tracking** - Unique visitor sessions using UUID
- ✅ **Contact clicks** - When users click to see contact info (not yet integrated in frontend)
- ✅ **Timestamps** - When each visit happens
- ✅ **Referrer** - Where the user came from

### NOT Currently Tracked:
- ❌ **IP Addresses** - Not captured (requires additional setup)
- ❌ **Automatic City Detection** - Only manual via `?city=Tunis` URL parameter
- ❌ **User's exact location** - No geolocation implemented yet

---

## 🏙️ How to Add City Tracking?

### Option 1: Manual (Current)
Users can add `?city=Tunis` to any URL:
```
http://localhost:5000/property/123?city=Tunis
http://localhost:5000/browse-properties?city=Sfax
```

### Option 2: IP Geolocation (Future Enhancement)
To implement automatic city detection:

1. **Install a geolocation library:**
```bash
npm install geoip-lite
npm install @types/geoip-lite --save-dev
```

2. **Update `extractTunisianCity()` in `server/middleware/analytics.ts`:**
```typescript
import geoip from 'geoip-lite';

function extractTunisianCity(req: Request): string | undefined {
  // Try manual parameter first
  const manualCity = req.query.city as string;
  if (manualCity) return manualCity;

  // Try IP geolocation
  const ip = req.ip || req.headers['x-forwarded-for'] as string;
  if (ip) {
    const geo = geoip.lookup(ip);
    if (geo && geo.country === 'TN') {
      return geo.city;
    }
  }
  
  return undefined;
}
```

3. **Alternative: Use an API (more accurate)**
```typescript
async function extractTunisianCity(req: Request): Promise<string | undefined> {
  const manualCity = req.query.city as string;
  if (manualCity) return manualCity;

  const ip = req.ip || req.headers['x-forwarded-for'] as string;
  if (ip && ip !== '127.0.0.1' && ip !== '::1') {
    try {
      const response = await fetch(`http://ip-api.com/json/${ip}`);
      const data = await response.json();
      if (data.countryCode === 'TN') {
        return data.city;
      }
    } catch (error) {
      console.error('IP geolocation error:', error);
    }
  }
  
  return undefined;
}
```

---

## 🚀 Performance & Production Readiness

### Will it make the website laggy?

**Short Answer: NO** ✅

**Detailed Explanation:**
1. **Asynchronous Processing** - All analytics tracking runs in the background without blocking requests
2. **Database Efficiency** - Uses PostgreSQL UPSERT for concurrent writes
3. **Minimal Overhead** - Each tracking operation takes ~1-5ms
4. **No Frontend Impact** - Tracking happens on the server side

### Console Logs Removed ✅
We just removed all debug `console.log()` statements:
- ❌ Removed: "📊 Analytics tracking PAGE VISIT"
- ❌ Removed: "💾 Inserting visitor log"
- ❌ Removed: "✅ Visitor log inserted successfully"
- ✅ Kept: Error logs (`console.error`) for debugging issues

---

## 🔐 Understanding `isAuthenticated`

### What does `"isAuthenticated": false` mean?
This appears in the `/api/broker/auth-status` endpoint response:
- **`false`** = User is NOT logged in as admin/broker
- **`true`** = User IS logged in as admin/broker

### Why is it important?
When `isAuthenticated: true`, the analytics middleware **skips tracking** to avoid counting admin activity as visitor traffic.

---

## 📈 What's Displayed in Admin Dashboard?

### Overview Cards:
1. **Total Visiteurs** - Total unique visitors (all time)
2. **Pages Vues** - Total page views (all time)
3. **Aujourd'hui** - Visitors today
4. **En Ligne Maintenant** - Active visitors (last 5 minutes)

### Top Properties Section:
Shows the 5 most viewed properties with:
- **Property Title** (e.g., "Beautiful Villa in Tunis") ✅ FIXED
- **Relative Time** (e.g., "il y a 5 minutes" or "il y a 2 heures et 15 minutes") ✅ FIXED
- **Total Views** - How many times viewed
- **Total Clicks** - How many times contact info was clicked
- **Desktop/Mobile breakdown** - Device type statistics

### Recent Activity Table:
Last 50 visitor actions showing:
- **Date & Heure** - When it happened
- **Page** - Which page was visited
- **Ville** - City (if available)
- **Appareil** - Desktop or Mobile
- **Contact** - If contact info was clicked

---

## 🎨 What We Just Fixed

### 1. Property Names in Top Properties ✅
**Before:** "Propriété 3d0a878f" (showing property ID)
**After:** "Beautiful Villa in Tunis" (showing actual property title)

### 2. Relative Time Format ✅
**Before:** "Dernière vue: 4 nov. 2025, 10:56 AM"
**After:** "Dernière vue: il y a 15 minutes (4 nov. 2025, 10:56)"

Examples of relative time:
- Less than 1 minute: "à l'instant"
- 1-59 minutes: "il y a 5 minutes"
- 1-23 hours: "il y a 2 heures et 15 minutes"
- 1-6 days: "il y a 3 jours"
- 7+ days: Shows full date

### 3. Admin Tracking Fixed ✅
Admin browsing `/admin/*` and `/broker/*` pages no longer inflates visitor counts.

### 4. Clean Console Output ✅
Removed all debug logs to keep terminal clean in production.

---

## 🧪 Testing the Analytics

### Step-by-Step Test:
1. **Logout** from admin (to clear session)
2. **Restart server**: `npm run dev`
3. **Login as admin** with password: `broker123`
4. **Open incognito window**
5. **Visit a property**: `http://localhost:5000/property/[property-id]`
6. **Go back to admin panel** → `/admin/browse`
7. **Click "View Analytics"** on that property
8. **Check results**: Should show 1+ views

### What You Should See:
- Property title in analytics dialog
- View count increased
- "il y a X minutes" relative time
- Desktop or Mobile icon
- No admin pages in activity log

---

## 📊 Database Tables

### `visitor_logs`
Stores every page visit:
```sql
id, session_id, timestamp, page_url, property_id,
tunisian_city, device_type, user_agent, referrer, 
time_on_page, contact_clicked
```

### `property_analytics`
Aggregated stats per property:
```sql
property_id, total_views, total_clicks, desktop_views,
mobile_views, last_viewed_at, city_views (JSONB),
created_at, updated_at
```

### `site_analytics`
Daily site-wide statistics:
```sql
id, date (YYYY-MM-DD), total_visitors, total_page_views,
unique_sessions, desktop_visitors, mobile_visitors,
city_breakdown (JSONB)
```

---

## 🔮 Future Enhancements

### Recommended Next Steps:
1. **IP Geolocation** - Automatic city detection
2. **Contact Click Tracking** - Integrate in property-detail.tsx
3. **Export Reports** - Download analytics as CSV/PDF
4. **Visitor Journey** - Track complete user path through site
5. **Heatmaps** - Where users click on pages
6. **Conversion Tracking** - Track leads and inquiries
7. **A/B Testing** - Compare different property descriptions
8. **Retention Reports** - How many visitors return

---

## 🛠️ Troubleshooting

### Property analytics shows "No data"
1. Make sure you're viewing the property as a **non-admin** user
2. Check that the property URL matches: `/property/[uuid]`
3. Verify in terminal that property ID was extracted
4. Check database: `SELECT * FROM property_analytics;`

### Admin pages still appearing in logs
1. Make sure you **logged out and logged back in** after the fix
2. Verify `req.session.isAuthenticated === true` when logged in
3. Check `/api/broker/auth-status` returns `{"isAuthenticated": true}`

### No city data
1. Cities require manual parameter: `?city=Tunis`
2. Or implement IP geolocation (see guide above)
3. Test: `http://localhost:5000/browse-properties?city=Tunis`

---

## 📞 Need Help?

If you have more questions about the analytics system, feel free to ask! 🚀
