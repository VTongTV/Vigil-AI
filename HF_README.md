---
title: VigilAI Backend
emoji: 🚦
colorFrom: indigo
colorTo: blue
sdk: docker
app_port: 7860
pinned: false
---

# VigilAI — AI-Powered Traffic Violation Detection

Backend API for **Flipkart GridLock 2.0, Round 2, Track 3**.

## Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/detect` | Upload image, detect violations, generate evidence |
| `GET` | `/api/v1/violations` | List violations with filtering and pagination |
| `GET` | `/api/v1/evidence/{id}` | Get annotated evidence image |
| `GET` | `/api/v1/analytics` | Get violation statistics |
| `GET` | `/health` | Health check (always 200) |
| `GET` | `/ready` | Deep readiness probe (models loaded) |

## 7 Violation Types

No helmet • Triple riding • Wrong-side driving • Illegal parking • No seatbelt • Stop-line violation • Red-light violation

Built for Bengaluru Traffic Police. Officers verify. AI assists.
