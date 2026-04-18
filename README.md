# SmartSeason Field Monitoring System

A comprehensive field monitoring system for tracking crop progress across multiple fields during growing seasons.

## Features

- **User Authentication & Roles**: Admin and Field Agent roles with appropriate permissions
- **Field Management**: Create, edit, delete, and assign fields to agents
- **Field Updates**: Agents can update field stages and add notes/observations
- **Smart Status Calculation**: Automatic status determination (Active/At Risk/Completed)
- **Dashboard**: Role-specific dashboards with key metrics
- **Update History**: Complete audit trail of field changes

## Tech Stack

### Backend
- Node.js with Express
- PostgreSQL database
- JWT for authentication
- bcrypt for password hashing

### Frontend
- React with Vite
- TailwindCSS for styling
- React Router for navigation
- Axios for API calls

## Setup Instructions

### Prerequisites
- Node.js (v16 or higher)
- PostgreSQL (v14 or higher)
- npm or yarn

### Database Setup

1. Install PostgreSQL and create a database:
```bash
createdb smartseason