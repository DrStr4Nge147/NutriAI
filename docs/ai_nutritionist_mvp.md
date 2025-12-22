# HimsogAI Web App MVP Specification

## Overview
This document defines the Minimum Viable Product for a mobile‑optimized web application built with ReactJS. The app serves as a personal AI nutritionist that analyzes meals, tracks health data, and provides dietary recommendations. All user data is stored locally on the user's device, with import and export features for backup and device transfer.

---

## 1. Core Goals
- Allow users to capture or upload meal photos for automatic nutrient analysis.
- Allow manual entry of meals when photos are not used.
- Provide detailed nutrient breakdowns including calories, carbs, fats, protein, and micronutrients.
- Offer personalized diet suggestions based on user health data.
- Store all data locally.
- Support import and export of user data.
- Be optimized for mobile browsers.

---

## 2. User Flow
### 2.1. Onboarding / Getting Started
- Screen 1: Welcome message and short explanation.
- Screen 2: Ask for user body details
  - Height
  - Weight
  - Age
  - Sex
  - Activity level
  - Skip option leading to default placeholders.
- Screen 3: Optional health screening
  - "Do you have any diagnosed medical conditions?"
  - "Have you been treated for any condition recently?"
  - Text input or selectable list
  - Skip option as well.
- Screen 4: Privacy and storage
  - Explanation that all data is stored locally and never uploaded.

### 2.2. Home Screen
- Large button for "Take Photo" or "Upload Meal".
- Smaller button for "Manual Entry".
- Quick access to recent meals.

### 2.3. Meal Analysis Flow
- User uploads or captures a photo.
- AI processes the image and identifies food items.
- User reviews detected items and can edit to correct mistakes.
- AI calculates nutrient details:
  - Calories
  - Carbs
  - Protein
  - Fat
  - Fiber
  - Sodium
  - Vitamins and minerals (when identifiable)
- Summary screen with:
  - Breakdown per food item
  - Total nutrients of the meal
  - Comparison to user's daily recommended intake

### 2.4. Manual Meal Entry
- User enters food name.
- Suggestions auto-complete from an offline database.
- User enters serving size.
- Nutrient breakdown appears.

### 2.5. Personalized Recommendations
- Based on user's medical conditions and body metrics.
- Example outputs:
  - Lower sodium suggestions for hypertension
  - Lower sugar suggestions for diabetes
  - High protein suggestions for muscle growth
- Daily summary screen with warnings if intake is too high or low.

---

## 3. Data Storage
### 3.1. Local Storage
- User metadata
- Medical info
- Meal history
- Nutrient logs
- Settings and preferences

### 3.2. Import / Export
- Export: Creates a JSON file that the user can save.
- Import: Load the JSON file back into the app.
- Validation to ensure safe data structure.

---

## 4. Technical Architecture
### 4.1. Frontend
- ReactJS (mobile responsive layout)
- TailwindCSS or similar for styling
- Client-side routing (React Router)

### 4.2. AI and Analysis
- On-device inference if a lightweight model is chosen
- Or API call to a hosted AI model
- Image preprocessing in browser
- Manual override to maintain accuracy

### 4.3. Storage
- IndexedDB for large data
- LocalStorage for small flags

### 4.4. Offline Support
- PWA support so app can be added to the home screen
- Basic functionality available offline

---

## 5. Screens / Components
- Onboarding screens
- Health intake form
- Home dashboard
- Photo uploader
- Food detection editor
- Meal nutrient summary
- Daily intake tracker
- Settings (import/export, clear data, appearance)

---

## 6. Future Features (Not MVP)
- Barcode scanner
- Voice input
- Personalized meal plans
- Goal-based fitness integration
- Offline AI model

---

## 7. Decisions Based on Your Answers

1. **AI Processing**
   - Support both offline and online AI models.
   - Offline: Ollama or LM Studio for local inference when available.
   - Online: Gemini or OpenAI for advanced analysis when user allows internet usage.

2. **Food Recognition Scope**
   - AI must recognize a wide range of foods including Filipino dishes, snacks, street foods, and regional specialties.
   - Model selection will prioritize broad and culturally relevant food coverage.

3. **Nutrient Database Choice**
   - Use a hybrid approach.
     - Lightweight local database for fast offline lookup.
     - Expanded, detailed nutrient data fetched optionally when online.

4. **Daily Intake Calculation**
   - Allow both automatic calculation using formulas like Mifflin St Jeor.
   - Allow manual override so users can set custom targets.

5. **Health-based Warnings**
   - Enabled.
   - App will generate caution messages when a meal conflicts with conditions like diabetes, hypertension, kidney issues, etc.

6. **Weight Tracking**
   - Include a timeline-based weight log feature.
   - Daily or weekly input supported.

7. **Multiple Profiles**
   - App will support multiple local profiles on the same device.
   - Each profile has its own data, meals, and health information.