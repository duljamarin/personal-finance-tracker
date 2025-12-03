# Expense Tracker

A modern expense tracker app built with React, Tailwind CSS, Vite, and a Java/Spring Boot backend.

## Features
- Add, edit, delete expenses
- Monthly chart and CSV export
- Responsive UI with dark mode
- Backend integration (Java/Spring Boot)
- User separation via X-Client-Id header
- Environment-aware API configuration

## Getting Started

### Prerequisites
- Node.js (v16+ recommended)
- npm or yarn

### Installation
```bash
npm install
```

### Running Locally (Frontend)
```bash
npm run dev
```

### Backend
- The backend is a Java/Spring Boot app with endpoints:
	- `GET /api/expenses`
	- `POST /api/expenses`
	- `GET /api/expenses/{id}`
	- `PUT /api/expenses/{id}`
	- `DELETE /api/expenses/{id}`
- Deployed backend: `https://expense-tracker-be-tocc.onrender.com/`

### Environment Configuration
- The frontend uses different API base URLs for local and production.
- To connect your local frontend to the production backend, create a `.env` file in the project root:
	```
	VITE_API_BASE_URL=https://expense-tracker-be-tocc.onrender.com
	```
- Restart your dev server after changing `.env`.

### User Identification
- Each browser/account is assigned a unique `X-Client-Id` header for all API requests.
- This allows the backend to distinguish between users.

### Deployment
- Frontend can be deployed to Netlify or similar static hosting.
- In production, the API base URL automatically uses the deployed backend.

## Project Structure
```
src/
	components/
		Expenses/
		NewExpense/
		UI/
	hooks/
	utils/
	App.jsx
	index.css
	main.jsx
```

## License
MIT
