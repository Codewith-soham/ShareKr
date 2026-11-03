# ShareKar — Project Overview

**Document:** 01 — Project Overview  
**Project:** ShareKar  
**Version:** 1.0  
**Status:** Approved  
**Product Stage:** V1 — Local MVP  
**Initial Launch Area:** NL Complex and nearby areas, Dahisar East, Mumbai, India

---

## 1. Introduction

ShareKar is a local commuter coordination platform that helps people travelling to the same destination at similar times connect with one another and share an independently available auto ride.

The platform allows users to create or discover passenger pools based on destination, pickup location, and departure time.

ShareKar coordinates passengers. It does not hire drivers, book autos, or handle transportation payments.

## 2. Problem Statement

Many commuters travel along similar routes every day but often travel individually because they cannot easily find other passengers going in the same direction.

This creates an opportunity for a platform that helps commuters discover one another and coordinate their journeys.

ShareKar aims to address this problem through location-based and time-based passenger matching.

## 3. Product Vision

To make local commuting more convenient by helping people travelling in the same direction discover and coordinate with one another.

The long-term vision is to expand beyond the initial locality and support passenger coordination across multiple areas and destinations.

## 4. Target Audience

- Daily office commuters.
- College and school students.
- People travelling regularly to railway stations.
- Local residents travelling along common routes.
- Commuters looking to coordinate with other passengers.

## 5. Initial Launch Strategy

The first version will focus on **NL Complex and nearby areas in Dahisar East, Mumbai**.

The initial launch will be geographically limited to maintain sufficient passenger density and validate the core use case.

Destinations will be managed through an admin-controlled destination directory. Users can request missing destinations, which administrators can review and add.

## 6. Core Product Concept

ShareKar uses passenger pools.

A user can:

1. Create a pool by selecting a destination.
2. Select a pickup location.
3. Set a departure time and joining deadline.
4. Choose the pool capacity.
5. Allow other eligible commuters to discover and join.
6. Meet other passengers at the agreed pickup point.
7. Independently arrange an available auto and the fare with its driver.

A pool represents passenger coordination, not a confirmed vehicle booking.

## 7. V1 Product Scope

### Authentication and Profiles
- User registration and login.
- OTP-based verification.
- Mandatory user profile details.
- Profile image upload.
- Profile management.

### Pool Management
- Immediate and scheduled pools.
- Pickup and destination selection.
- Pool capacity of 1–3 passengers.
- Pool discovery and joining.
- Pool cancellation and lifecycle management.
- Pool history.

### Matching and Discovery
- Destination-based matching.
- Departure-time matching.
- Pickup proximity filtering.
- Manual location selection and GPS-based location selection.
- General and women-only pools.

### Notifications
- In-app notifications.
- Push notifications where supported.
- Pool membership and lifecycle updates.
- Scheduled departure reminders.

### Safety
- User reporting.
- Pool reporting.
- User blocking.
- Backend-enforced eligibility rules.

### Administration
- User management.
- Destination management.
- Pool moderation.
- Report management.
- Feedback review.

## 8. Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React.js + TypeScript |
| Styling | Tailwind CSS |
| Build Tool | Vite |
| Backend | Node.js + Express.js + TypeScript |
| Database | PostgreSQL |
| ORM | Prisma |
| API | REST |
| Validation | Zod |
| Testing | Vitest, React Testing Library, Supertest, Playwright |
| Containerization | Docker + Docker Compose |
| Version Control | Git + GitHub |

The project follows a zero-cost-first development approach. External providers must be evaluated for free-tier availability and limitations.

## 9. Architecture Overview

ShareKar follows a modular monolith architecture in a monorepo.

- React SPA for the frontend.
- Express.js REST API for backend operations.
- PostgreSQL for relational data.
- Prisma for database access and migrations.
- Feature-based backend modules.
- Shared TypeScript types and validation schemas.
- In-process background scheduling for the initial pilot.

## 10. Business Model and Platform Responsibility

ShareKar is a passenger coordination platform.

The platform:
- Helps passengers discover compatible commuters.
- Provides pool creation and joining functionality.
- Stores pool and participation information.
- Sends relevant notifications.

The platform does not:
- Hire or employ drivers.
- Provide driver accounts.
- Book or dispatch autos.
- Set or estimate fares.
- Collect or split transportation payments.

Passengers independently arrange the vehicle and fare with the driver.

## 11. Pilot Success Metrics

The initial pilot target is **20 Daily Active Users (DAU)**.

An active user means someone who regularly engages with core functionality, such as creating, discovering, joining, or managing pools. Merely registering or opening the application does not count as meaningful active usage.

Additional validation should measure:
- Number of pools created.
- Number of successful pool joins.
- Number of pools reaching READY status.
- Repeat usage.
- User feedback.
- Whether sufficient local passenger density exists.

The pilot should validate actual commuter behaviour rather than relying only on survey interest.

## 12. Long-Term Direction

Potential future improvements include:
- Expansion into additional localities.
- Phone OTP verification.
- Government ID verification.
- Additional regional languages.
- Improved matching and real-time updates.
- Enhanced moderation and safety features.

Future development will depend on pilot results and user feedback.

## 13. Project Status

ShareKar is in the V1 local MVP development stage.

The product requirements, business rules, database design, architecture, API specification, development guidelines, and testing strategy have been approved as the baseline for implementation.

---

**ShareKar — Better journeys begin together.**