# NovareHealth - Doctor Consultation Platform

A comprehensive telemedicine platform for the African market, enabling patients to consult doctors via video, make payments through M-Pesa, and receive digital prescriptions.

## 🏥 Features

- **Patient Portal**: Book appointments, video consultations, view prescriptions
- **Doctor Portal**: Manage availability, conduct consultations, write prescriptions
- **Admin Panel**: Manage users, verify doctors, monitor platform
- **Video Consultations**: Twilio-powered HD video calls
- **Payments**: M-Pesa integration for seamless payments
- **Digital Prescriptions**: PDF generation and delivery

## 🛠 Tech Stack

### Backend
- **Framework**: FastAPI (Python 3.11+)
- **Database**: PostgreSQL with SQLAlchemy
- **Cache**: Redis
- **Authentication**: JWT with OTP login (Twilio)

### Frontend
- **Framework**: React 18 with TypeScript
- **Styling**: TailwindCSS
- **State Management**: Zustand
- **API Client**: TanStack Query + Axios

### Infrastructure
- **Container**: Docker & Docker Compose
- **CI/CD**: GitHub Actions
- **Storage**: AWS S3

## 🚀 Getting Started

### Prerequisites
- Docker & Docker Compose
- Node.js 20+
- Python 3.11+
- PostgreSQL 15+

### Development Setup

1. **Clone the repository**
```bash
git clone https://github.com/your-org/novarehealth.git
cd novarehealth
```

2. **Start with Docker Compose**
```bash
docker-compose up -d
```

3. **Or run services individually**

**Backend:**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env  # Configure your environment variables
uvicorn app.main:app --reload
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

4. **Access the application**
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

## 📁 Project Structure

```
novarehealth/
├── backend/
│   ├── app/
│   │   ├── api/v1/endpoints/    # API routes
│   │   ├── core/                # Config, security
│   │   ├── db/                  # Database setup
│   │   ├── models/              # SQLAlchemy models
│   │   ├── schemas/             # Pydantic schemas
│   │   ├── services/            # Business logic
│   │   └── main.py              # FastAPI app
│   ├── tests/
│   ├── alembic/                 # Migrations
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/          # React components
│   │   ├── pages/               # Page components
│   │   ├── services/            # API services
│   │   ├── store/               # Zustand stores
│   │   ├── types/               # TypeScript types
│   │   └── App.tsx
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml
└── README.md
```

## 🔐 Environment Variables

### Backend (.env)
```env
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/novarehealth
SECRET_KEY=your-secret-key
TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-token
AWS_ACCESS_KEY_ID=your-aws-key
AWS_SECRET_ACCESS_KEY=your-aws-secret
```

### Frontend (.env)
```env
VITE_API_URL=/api/v1
```

## 📚 API Documentation

Once the backend is running, access:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## 🧪 Testing

```bash
# Backend tests
cd backend
pytest tests/ -v

# Frontend tests
cd frontend
npm run test
```

## 📦 Deployment

### Docker Production Build
```bash
docker-compose -f docker-compose.prod.yml up -d
```

### Manual Deployment
See [Deployment Guide](./docs/deployment.md)

## 📄 License

Proprietary - NovareHealth

## 🤝 Contributing

Please read our contributing guidelines before submitting PRs.
