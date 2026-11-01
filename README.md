# ShareKar 🚗

**Find people travelling in the same direction. Share the ride.**

ShareKar is a local commuter coordination platform that helps people travelling to the same destination at similar times connect with one another and share an independently available auto ride.

The project is starting with a local MVP focused on **NL Complex and nearby areas in Dahisar East, Mumbai, India**.

> **Project status:** V1 — Local MVP (Development)

---

## 📌 Table of Contents

- [Overview](#-overview)
- [Problem Statement](#-problem-statement)
- [How It Works](#-how-it-works)
- [Core Features](#-core-features)
- [Technology Stack](#-technology-stack)
- [Project Architecture](#-project-architecture)
- [Getting Started](#-getting-started)
- [Development Workflow](#-development-workflow)
- [Project Documentation](#-project-documentation)
- [V1 Scope and Limitations](#-v1-scope-and-limitations)
- [Future Plans](#-future-plans)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🚀 Overview

Finding other passengers travelling in the same direction can be difficult, even in areas where many commuters follow similar routes.

ShareKar aims to solve this problem by allowing users to:

1. Create a ride-sharing pool for a destination.
2. Choose a pickup location and departure time.
3. Discover other commuters travelling to the same destination.
4. Join an available pool.
5. Meet at the agreed pickup point and arrange the auto ride together.

ShareKar coordinates passengers. It does **not** book autos, hire drivers, or handle transportation payments.

## 🎯 Problem Statement

Many commuters travel similar routes every day but often travel individually because they cannot easily find other passengers with matching destinations and departure times.

This can result in:
- Repeated individual auto journeys.
- Missed opportunities to coordinate with nearby commuters.
- Difficulty finding passengers travelling in the same direction.

ShareKar provides a platform to discover and coordinate with compatible commuters.

## 🔄 How It Works

1. **Register:** Create an account and complete the required profile.
2. **Create or discover:** Create a pool or browse available pools.
3. **Match:** Find a pool with a compatible destination, pickup area, and departure time.
4. **Join:** Join an available pool if eligibility and capacity requirements are satisfied.
5. **Meet:** Reach the agreed pickup location.
6. **Travel:** Passengers independently arrange the auto ride and fare with the driver.

---

## ✨ Core Features

### Authentication and Profiles
- Account registration and login.
- Email OTP verification for the initial zero-cost pilot.
- User profiles with name, email, gender, and profile image.
- Profile management.
- Session and token management.

### Pool Management
- Create immediate or scheduled pools.
- Select a destination and pickup location.
- Choose a departure time and joining deadline.
- Pool capacity of 1–3 passengers, including the creator.
- Join or leave eligible open pools.
- Automatic pool lifecycle management.
- Pool cancellation and history.

### Pool Discovery
- Discover pools based on destination and departure time.
- Search using GPS or manually selected locations.
- Configurable pickup search radius.
- Display full and closed pools with joining disabled.
- General and women-only pool visibility.

### Notifications
- In-app notifications.
- Push notifications where supported.
- Pool membership and lifecycle updates.
- Scheduled departure reminders.

### Safety
- User reporting.
- Pool reporting.
- User blocking.
- Backend-enforced pool eligibility and access rules.

### Administration
- User management and account suspension.
- Destination management.
- Pool moderation.
- Report review and resolution.
- Feedback management.

---

## 🛠 Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React.js |
| Language | TypeScript |
| Build Tool | Vite |
| Styling | Tailwind CSS |
| Backend | Node.js |
| API Framework | Express.js |
| Database | PostgreSQL |
| ORM | Prisma |
| Validation | Zod |
| Authentication | OTP-based authentication |
| Image Storage | Cloudinary (planned) |
| Push Notifications | Firebase Cloud Messaging |
| Testing | Vitest, React Testing Library, Supertest, Playwright |
| Containerization | Docker, Docker Compose |
| Version Control | Git and GitHub |

The project follows a zero-cost-first development approach. External services will be selected based on their free-tier availability and limitations.

---

## 🏗 Project Architecture

ShareKar follows a **modular monolith architecture** with a monorepo structure.

```text
sharekar/
│
├── apps/
│   ├── web/                  # React frontend
│   │   ├── src/
│   │   └── ...
│   │
│   └── api/                  # Express backend
│       ├── src/
│       │   ├── modules/
│       │   ├── middleware/
│       │   ├── config/
│       │   ├── utils/
│       │   └── ...
│       ├── prisma/
│       └── ...
│
├── packages/
│   └── shared/               # Shared types, schemas and enums
│
├── docs/                     # Project documentation
│
├── docker-compose.yml
├── .gitignore
├── README.md
└── ...
```

The backend uses a layered, feature-based structure:

```text
Module
 ├── Controller
 ├── Service
 ├── Repository
 └── Validation
```

### Architecture Principles

- Modular monolith instead of microservices.
- REST API communication.
- PostgreSQL for relational data.
- Prisma for database access and migrations.
- Shared TypeScript types and schemas.
- Centralized error handling and request validation.
- Backend-enforced business rules and authorization.
- In-process background scheduling for the initial pilot.

---

## ⚙️ Getting Started

### Prerequisites

Install the following tools before starting development:

- [Node.js](https://nodejs.org/) — LTS version
- [npm](https://www.npmjs.com/)
- [Git](https://git-scm.com/)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- [Visual Studio Code](https://code.visualstudio.com/)

### 1. Clone the Repository

```bash
git clone <YOUR_REPOSITORY_URL>
cd sharekar
```

### 2. Install Dependencies

Install dependencies from the repository root once the monorepo workspace configuration is in place.

```bash
npm install
```

### 3. Configure Environment Variables

Create local environment files using the provided examples.

```bash
cp apps/api/.env.example apps/api/.env
```

On Windows PowerShell:

```powershell
Copy-Item apps/api/.env.example apps/api/.env
```

Configure the required values, including:

- Database connection URL.
- Access token configuration.
- Refresh token configuration.
- OTP provider settings.
- Cloudinary credentials when image uploads are implemented.
- Firebase configuration when push notifications are implemented.

**Never commit `.env` files or expose credentials in source code.**

### 4. Start the Development Environment

Once Docker Compose and the development scripts are configured:

```bash
docker compose up -d
```

Start the frontend and backend using the root development scripts defined in `package.json`.

```bash
npm run dev
```

> Setup commands and scripts may evolve during initial development. Refer to the latest project configuration and `.env.example` files before running them.

---

## 💻 Development Workflow

The project uses two primary Git branches:

| Branch | Purpose |
|---|---|
| `main` | Stable code |
| `development` | Active development |

### Workflow

1. Pull the latest changes from `development`.
2. Implement the assigned feature or fix.
3. Run linting, formatting, and relevant tests.
4. Verify the functionality locally.
5. Commit changes to `development`.
6. Merge into `main` after verification.

### Commit Convention

ShareKar follows Conventional Commits.

Examples:

```bash
git commit -m "feat: add user registration"
git commit -m "feat: implement pool creation"
git commit -m "fix: prevent pool capacity overflow"
git commit -m "test: add pool lifecycle tests"
git commit -m "docs: update project documentation"
git commit -m "refactor: improve authentication service"
```

---

## 📚 Project Documentation

The `docs/` directory is intended to contain the approved project specifications and engineering documentation.

| Document | Description |
|---|---|
| `01-project-overview.md` | Product vision, goals and scope |
| `02-product-requirements.md` | Functional and non-functional requirements |
| `03-business-rules.md` | Core business logic and constraints |
| `04-database-design.md` | Database tables, relationships and indexes |
| `05-system-architecture.md` | System architecture and technical decisions |
| `06-api-specification.md` | REST API contracts and endpoints |
| `07-development-guidelines.md` | Coding standards and Git workflow |
| `08-testing-strategy.md` | Testing approach and quality standards |

These documents serve as the baseline for implementation. Changes to approved requirements should be reviewed and documented.

---

## 🚧 V1 Scope and Limitations

The initial version focuses on passenger coordination.

ShareKar V1 does **not** provide:

- Auto or driver booking.
- Driver accounts or driver integrations.
- Fare estimates or fare calculations.
- Automatic fare splitting.
- Online payments.
- Live journey tracking.
- In-app passenger chat.
- Emergency SOS functionality.
- Government ID verification.

Passengers are responsible for meeting at the agreed pickup point, finding an independently available auto, and arranging the fare directly with the driver.

Women-only pools use self-declared gender eligibility in V1. This is not government-ID verification or a guarantee of passenger safety.

---

## 🔮 Future Plans

Potential improvements after validating the local MVP:

- Expand to additional localities.
- Introduce phone OTP verification.
- Add government ID verification.
- Improve real-time pool updates.
- Add additional regional language support.
- Improve safety and moderation capabilities.
- Introduce more advanced matching and discovery.

Future features will be prioritized based on actual user feedback and pilot results.

---

## 🤝 Contributing

ShareKar is currently under active development.

If you want to contribute:

1. Review the project documentation.
2. Understand the existing architecture and business rules.
3. Discuss significant changes before implementation.
4. Follow the development guidelines.
5. Add relevant tests.
6. Submit changes for review.

---

## 📄 License

The project license has not yet been finalized.

Until a license is added to the repository, all rights are reserved by the project owner. Do not assume that the code is open-source or available for redistribution.

---

<p align="center">
  **ShareKar — Better journeys begin together.**
</p>