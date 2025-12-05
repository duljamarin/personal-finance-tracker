
# Expense Tracker

A modern finance tracker app built with React, Tailwind CSS, Vite, and a Java/Spring Boot backend.

## Features
- Add, edit, delete transactions (supports both incomes and expenses)
- Dual monthly charts for incomes and expenses
- CSV export
- Responsive UI with dark mode
- Category management (add, edit, delete categories)
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
	- `GET /api/transactions`
	- `POST /api/transactions`
	- `GET /api/transactions/{id}`
	- `PUT /api/transactions/{id}`
	- `DELETE /api/transactions/{id}`
	- `GET /api/categories`
	- `POST /api/categories`
	- `PUT /api/categories/{id}`
	- `DELETE /api/categories/{id}`
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
		Categories/
			CategoriesPage.jsx
		Transaction/
			NewTransaction.jsx
			TransactionForm.jsx
		Transactions/
			MonthChart.jsx
			TransactionItem.jsx
			Transactions.jsx
			TransactionsList.jsx
		UI/
			Button.jsx
			Card.jsx
			Input.jsx
	hooks/
		useDarkMode.js
	utils/
		api.js
		config.js
		csv.js
		idGenerator.js
	App.jsx
	index.css
	main.jsx
```

## License
MIT
