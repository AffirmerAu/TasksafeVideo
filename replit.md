# Overview

This is a secure video training platform that provides controlled access to training content through magic link authentication. The application allows users to request access to training videos via email, receive secure magic links, and watch videos with progress tracking and analytics. Built as a full-stack TypeScript application with a modern React frontend and Express.js backend.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **UI Components**: Shadcn/ui component library with Radix UI primitives for accessibility
- **Styling**: Tailwind CSS with CSS variables for theming and dark mode support
- **State Management**: TanStack Query (React Query) for server state and caching
- **Routing**: Wouter for lightweight client-side routing
- **Forms**: React Hook Form with Zod validation for type-safe form handling

## Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Database ORM**: Drizzle ORM with PostgreSQL dialect for type-safe database operations
- **Authentication**: Magic link-based authentication system (no traditional login/password)
- **Session Management**: Express sessions with PostgreSQL session store
- **Development**: Hot reload with Vite middleware integration

## Data Storage Solutions
- **Primary Database**: PostgreSQL with connection pooling via Neon serverless
- **Schema Management**: Drizzle migrations with shared schema definitions
- **Tables**: 
  - Videos (content metadata and URLs)
  - Magic Links (temporary access tokens with expiration)
  - Access Logs (viewing analytics and progress tracking)

## Authentication and Authorization
- **Magic Links**: Token-based access system with 24-hour expiration
- **Email Delivery**: SendGrid integration for secure link distribution
- **Access Control**: Single-use tokens tied to specific videos and email addresses
- **Session Tracking**: Detailed logging of access attempts and viewing progress

## External Dependencies
- **Email Service**: SendGrid for reliable email delivery of magic links
- **Database**: Neon PostgreSQL serverless database with WebSocket support
- **File Storage**: External video hosting (URLs stored in database)
- **Development Tools**: Replit integration with cartographer plugin for development environment

## Design Patterns
- **Shared Types**: Common schema definitions between frontend and backend
- **Repository Pattern**: Storage abstraction layer for database operations
- **Error Handling**: Centralized error handling with consistent API responses
- **Progress Tracking**: Real-time video progress updates with completion percentages
- **Analytics**: Comprehensive viewing metrics including watch time and completion rates