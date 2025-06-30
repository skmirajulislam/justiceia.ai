# Justiceia.ai

Justiceia.ai is an innovative, real-time legal consultation platform developed during the Hexafalls Hackathon (36-hour event organized by JIS University). The project was built by a dedicated team with a shared vision of making legal support accessible, transparent, and efficient across India.

## Team Members

- **SK Mirajul Islam** — Backend Developer | Machine Learning
- **Joyita Bawal** — Frontend Developer
- **Arnab Das** — Backend Developer
- **Bhumi Prasad** — Frontend & UI Developer

---

## Table of Contents

- [Why Justiceia.ai?](#why-justiceiaai)
- [How Does It Solve the Problem?](#how-does-it-solve-the-problem)
- [Key Features](#key-features)
- [Challenges Faced](#challenges-faced)
- [Tech Stack & Setup](#tech-stack--setup)
- [Future Scope](#future-scope)
- [Acknowledgements](#acknowledgements)

---

## Why Justiceia.ai?

### The Problem

Access to timely and reliable legal advice in India is hindered by several barriers:
- **Geographical constraints** (clients and lawyers are not always co-located)
- **Scheduling conflicts** and lack of transparency regarding advocate availability
- **Slow, inconvenient traditional consultation methods**
- **Absence of real-time insights** into advocate presence and availability

These factors make it difficult for clients to quickly find the right legal support, while also limiting opportunities for law students and researchers to connect with legal professionals.

---

## How Does It Solve the Problem?

Justiceia.ai is designed as a comprehensive real-time video consultation and chat platform that:

- **Instantly connects clients with verified advocates** who are currently online and available, regardless of location.
- **Eliminates uncertainty** by showing real-time online status of advocates across all devices and browser tabs.
- **Enables secure, direct communication** via high-quality video calls and instant chat.
- **Showcases detailed advocate profiles** with verification, specialization, experience, and ratings.
- **Restricts initiation of calls and chats** to only those advocates who are actually online, ensuring a seamless and frustration-free experience.
- **Supports multi-device and multi-tab usage,** keeping online status and communication features reliable and up-to-date.
- **Empowers law students and researchers** by providing access to a wide network of legal professionals for mentorship and research collaboration.
- **Integrates advanced document analysis, generation, and translation tools** to streamline legal workflows.
- **Allows verified lawyers to publish case reports and legal journals,** contributing to the broader legal community.
- **Features an AI-powered chatbot** to suggest solutions, answer legal questions, and assist users in navigating their problems.

By removing traditional barriers and leveraging real-time and AI technology, Justiceia.ai democratizes access to legal support for clients, students, researchers, and legal professionals across India.

---

## Key Features

- **Real-Time Advocate Online Status:** Instantly see which advocates are available for consultation, updated across all devices and tabs.
- **Secure Video Consultation:** Start high-quality, encrypted video calls with advocates directly from the platform.
- **Instant Chat Messaging:** Communicate with advocates via real-time chat, with message delivery and read receipts.
- **Verified Advocate Profiles:** Browse detailed, verified advocate profiles, including specialization, experience, and user ratings.
- **Smart Availability Control:** Clients can only initiate calls or chats with advocates who are currently online.
- **Multi-Device & Multi-Tab Support:** Online status and communication features are robust, even if users are logged in from multiple devices or browser tabs.
- **Document Tools:** Advanced document analysis, generation, and translation features powered by AI.
- **Advocate Publishing:** Verified lawyers can publish case reports and legal journals.
- **AI Chatbot:** Offers legal guidance, answers frequently asked questions, and helps users find solutions.

---

## Challenges Faced

- **Scalability:** Designing the system to handle a large number of concurrent users and real-time events without performance degradation.
- **Database Synchronization:** Keeping online status in sync with real-time socket events, especially when users connect/disconnect from multiple locations.
- **Secure Communication:** Implementing secure video and chat features to protect user privacy and data integrity.
- **AI Integration:** Seamlessly integrating AI-driven document analysis, generation, translation, and chatbot features in a legally compliant manner.
- **Verified Advocate Publishing:** Building a reliable and authentic workflow for legal professionals to publish case reports and journals, including moderation and verification.
- **User Experience:** Ensuring a seamless and intuitive interface for clients, advocates, students, and researchers, all while supporting complex real-time interactions.
- **Real-Time Online Status Tracking:** Maintaining accurate online/offline status for advocates across multiple devices and browser tabs required robust socket management and careful handling of connection/disconnection events.

---

## Tech Stack & Setup

This project is built with **TypeScript** and uses **Prisma** as its ORM.

### Core Technologies

- **Backend:** Node.js, TypeScript, Prisma ORM
- **Frontend:** (Specify framework/library used, e.g., React, Next.js, etc.)
- **Database:** (Specify database, e.g., PostgreSQL, MySQL, etc.)
- **Real-Time:** WebSockets/Socket.IO
- **AI & ML:** Integrated for document analysis, translation, and chatbot features

### Setup Instructions

1. **Clone the Repository:**
   ```bash
   git clone https://github.com/skmirajulislam/justiceia.ai.git
   cd justiceia.ai
   ```

2. **Install Dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   - Copy `.env.example` to `.env` and fill in the required values (database URL, secrets, etc.).

4. **Prisma Setup:**
   - Generate Prisma Client:
     ```bash
     npx prisma generate
     ```
   - Run Database Migrations:
     ```bash
     npx prisma migrate dev
     ```

5. **Start the Development Server:**
   ```bash
   npm run dev
   ```

6. **Other Useful Commands:**
   - Format code:
     ```bash
     npm run format
     ```
   - Run tests:
     ```bash
     npm test
     ```

---

## Future Scope

- Expansion to support regional languages for broader accessibility.
- Enhanced AI features for deeper legal document analysis and predictive assistance.
- Integration with government and court databases for streamlined case management.
- More robust moderation tools for content and user management.

---

## Acknowledgements

- **Hexafalls Hackathon, JIS University** — for providing the platform and opportunity.
- All mentors, judges, and participants for their insights and encouragement.

---

> Justiceia.ai — Making justice accessible, transparent, and efficient for all.
