# Crymson React Application

A React-based conversion of the Crymson productivity ecosystem, featuring a landing page and CGPA calculator.

## Project Structure

```
src/
  ├── components/
  │   ├── CGPA/
  │   │   ├── CGPAHeader.js
  │   │   ├── CGPAControls.js
  │   │   ├── CGPATable.js
  │   │   └── CGPAResults.js
  │   ├── AdvantagesSlideshow.js
  │   ├── DashboardSection.js
  │   ├── Footer.js
  │   ├── Hero.js
  │   ├── IDSection.js
  │   ├── Navbar.js
  │   ├── ToolsSection.js
  │   └── Toast.js
  ├── pages/
  │   ├── Landing.js
  │   └── CGPACalculator.js
  ├── utils/
  │   └── toast.js
  ├── App.js
  ├── index.js
  └── index.css
public/
  └── index.html
package.json
```

## Features

### Landing Page
- Responsive navigation bar with animated logo
- Hero section with parallax scroll effect
- Tools grid showcasing available applications
- Crymson ID information section
- Interactive dashboard preview
- Auto-rotating advantages slideshow with manual navigation
- Responsive footer with links

### CGPA Calculator
- Dynamic course entry table
- Automatic grade point calculation based on Nigerian grading system
- Automatic weighted points calculation
- CGPA calculation with degree classification
- CSV export functionality
- Local storage persistence
- Course selection and batch deletion
- Toast notifications for user feedback
- Responsive design

## Installation

1. Navigate to the project directory
2. Install dependencies:
   ```
   npm install
   ```

3. Start the development server:
   ```
   npm start
   ```

4. Build for production:
   ```
   npm build
   ```

## Design System

The application uses a luxury corporate minimalist design with:
- **Colors:**
  - Burgundy (#800020) - Primary
  - Olive (#6B705C) - Secondary
  - Off-white (#F8F5F0) - Background
  - Grey (#dcd9d4) - Borders

- **Typography:**
  - "Cormorant Garamond" for headings
  - "Inter" for body text

- **Animations:**
  - Smooth fade-in-on-scroll
  - Parallax scroll effects
  - Slide transitions
  - Hover effects

## Technologies Used

- React 18.2
- CSS Modules for styling
- LocalStorage for data persistence
- Intersection Observer API for scroll animations

## License

© 2026 Crymson. All rights reserved.
