# Design Guidelines: Hay Khadhra & Cité Olympique Rental Hub

## Design Approach

**Hybrid Reference-Based Approach**: Drawing inspiration from Airbnb's property showcase aesthetics combined with Amazon's efficient card-based browsing patterns. This creates a trustworthy, familiar interface optimized for property discovery while maintaining the professional credibility expected in real estate.

## Core Design Principles

1. **Dual-Path Clarity**: Immediate role identification through bold visual distinction
2. **Trust Through Transparency**: Clean layouts with generous whitespace convey professionalism
3. **Speed-Optimized Hierarchy**: Content prioritization that enables fast scanning and decision-making
4. **Mobile-First Responsive**: Seamless experience across all devices

---

## Typography System

**Primary Font**: Inter or Manrope (Google Fonts)
- Headings: 700 weight for primary CTAs, 600 for section headers
- Body: 400 weight for descriptions, 500 for emphasized text
- Price Display: 700 weight, larger scale for prominence

**Type Scale**:
- Hero Headline: text-5xl (mobile: text-3xl)
- Section Headers: text-3xl (mobile: text-2xl)
- Property Titles: text-xl font-semibold
- Body Text: text-base
- Price: text-2xl font-bold
- Metadata: text-sm

---

## Layout System

**Spacing Primitives**: Tailwind units of 4, 6, 8, 12, 16, 20, 24
- Component padding: p-6 to p-8
- Section spacing: py-16 to py-24
- Card internal spacing: p-6
- Grid gaps: gap-6 to gap-8

**Container Strategy**:
- Max-width: max-w-7xl for main content
- Property cards: max-w-sm to max-w-md
- Form sections: max-w-2xl centered

---

## Page-Specific Layouts

### Landing Page (Gateway)

**Hero Section** (h-screen):
- Full-viewport height with background image showing Tunisian architecture/neighborhood scenes
- Centered vertical layout with dark overlay for text contrast
- Main headline: "Find Your Perfect Home in Hay Khadhra & Cité Olympique"
- Subheadline explaining the service
- Two large, equally-weighted CTA buttons positioned side-by-side (on desktop) or stacked (mobile)
- Button text: "I Have a Property to Rent" and "I Need a Place to Rent"
- Buttons with blurred backgrounds, generous padding (px-12 py-4)

**Trust Indicators Section** (py-20):
- Three-column grid (single column mobile): grid-cols-1 md:grid-cols-3
- Statistics: Properties listed, Happy tenants, Neighborhoods served
- Large numbers with icons, centered text

**How It Works** (py-20):
- Two-column split explaining both user journeys
- Timeline-style layout with numbered steps
- Icons for each step

### Property Owner Submission Page

**Header** (py-8):
- Breadcrumb navigation
- Clear headline: "List Your Property"
- Subtext: "All information is private and reviewed by our broker"

**Form Layout** (max-w-3xl, py-12):
- Single-column progressive disclosure
- Grouped sections with visual separators
- Section headers: Property Details, Location, Pricing, Media Upload
- Input fields: Full-width with labels above, helper text below
- Upload zone: Large drag-and-drop area (min-h-64) with preview grid
- Preview thumbnails: grid-cols-2 md:grid-cols-4, aspect-square
- Submit button: Full-width on mobile, fixed width (w-64) on desktop, positioned right

**Confirmation Page**:
- Centered card (max-w-md) with success icon
- Large headline confirming submission
- Secondary text with next steps
- Return to homepage button

### Property Gallery (Tenant View)

**Search/Filter Bar** (sticky top-0, py-4):
- Horizontal layout with search input, filter dropdowns (Rooms, Price, Location)
- Sort dropdown (Price, Date Listed, Size)

**Property Grid** (py-8):
- Responsive grid: grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4
- Card design (Amazon-inspired):
  - Aspect-ratio image container (aspect-w-16 aspect-h-12)
  - Image with subtle hover scale (scale-105)
  - Card shadow with hover elevation increase
  - White background with rounded corners (rounded-lg)
  - Internal padding: p-4
  - Price positioned top-right with semi-transparent badge
  - Title: Two-line truncate with font-semibold
  - Location icon with neighborhood name
  - Metadata row: Rooms, Bathrooms, Size in compact pill format
  - "View Details" button: Full-width, positioned at card bottom

**Pagination** (py-8):
- Centered horizontal layout
- Previous/Next buttons with page numbers

### Property Detail Page

**Image Gallery Section**:
- Large primary image (aspect-w-16 aspect-h-9, max-h-96)
- Thumbnail strip below (grid-cols-5 md:grid-cols-8, gap-2)
- Video thumbnails with play icon overlay
- Lightbox functionality for full-screen viewing

**Property Information** (two-column desktop: grid-cols-1 lg:grid-cols-3):
- Left column (lg:col-span-2):
  - Property title (text-3xl font-bold)
  - Location with map pin icon
  - Metadata grid (grid-cols-2 md:grid-cols-4): Rooms, Bathrooms, Size, Type
  - Full description with formatted paragraphs
  - Features list with checkmark icons
- Right column (lg:col-span-1):
  - Sticky pricing card (top-24)
  - Large price display
  - "Contact Broker" CTA button
  - Broker contact information
  - Inquiry form (compact)

### Broker/Admin Dashboard

**Navigation Sidebar** (fixed left, w-64):
- Logo at top
- Menu items: Pending Submissions, Active Listings, Archived, Settings
- Stats widget at bottom

**Main Content Area** (ml-64):
- Tab-based interface for different states
- Table view for pending submissions:
  - Row layout: Thumbnail, Property Title, Owner Contact, Submission Date, Action buttons
  - Quick approve/reject buttons
- Active listings: Same card grid as tenant view with edit/archive buttons

---

## Component Library

### Buttons
- Primary: Large touch targets (min-h-12), font-semibold, rounded-lg
- Secondary: Outlined variant with same dimensions
- Icon buttons: Square aspect-ratio for gallery navigation

### Form Inputs
- Consistent height (h-12)
- Border with focus ring
- Labels: text-sm font-medium, mb-2
- Helper text: text-xs, mt-1

### Cards
- Shadow: shadow-md with hover:shadow-lg transition
- Rounded corners: rounded-lg
- Padding: p-6
- White background with subtle border

### Icons
- Use Heroicons via CDN
- Sizes: w-5 h-5 for inline, w-8 h-8 for feature icons, w-16 h-16 for section headers

### Navigation
- Sticky header (sticky top-0) with backdrop blur
- Logo positioned left, navigation right
- Mobile: Hamburger menu with slide-out drawer

---

## Images

**Hero Background**: Wide-angle photograph of Hay Khadhra or Cité Olympique neighborhood showing residential buildings, streets, or local landmarks. Should convey community and welcoming atmosphere. Apply dark overlay (opacity-60) for text legibility.

**Property Images**: Actual property photos uploaded by owners. Gallery should support 1-10 images per property with primary image prominently displayed.

**Trust Section Icons**: Use icon library for statistics/features - home, users, map pin icons.

**Empty States**: Friendly illustrations for "No properties found" or "No pending submissions" states.

---

## Responsive Breakpoints

- Mobile: < 768px (single column, stacked elements)
- Tablet: 768px - 1024px (two-column grids)
- Desktop: > 1024px (three-four column grids, sidebar layouts)

---

## Performance Optimizations

- Lazy load all property images with blur-up placeholders
- Skeleton screens for loading states
- Pagination limit: 20 properties per page
- Image thumbnails: Optimized at 400x300px
- Progressive form validation to reduce submission errors