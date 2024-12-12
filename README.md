
---

### Backend README (`server/README.md`)

```markdown
# Japanese Vocabulary Learning Application - Backend

This is the backend of the **Japanese Vocabulary Learning Application**. The backend is built using Node.js, Express.js, and MongoDB to handle authentication, lessons, and vocabulary management.

## Tech Stack
- **Node.js**: JavaScript runtime environment.
- **Express.js**: Web framework for Node.js.
- **MongoDB**: NoSQL database for storing user data, lessons, and vocabulary.
- **JWT (JSON Web Tokens)**: For secure user authentication.
- **Cookie-parser**: For handling cookies.
- **CORS**: To enable cross-origin requests.
- **dotenv**: For managing environment variables.

## Features
- **Authentication System**: Secure user registration and login with JWT.
- **Role-based Access Control**: Admin and user roles with different permissions.
- **Lesson Management**: Admin can create, update, and delete lessons.
- **Vocabulary Management**: Admin can add, update, or delete vocabulary for each lesson.
- **User Management**: Admin can promote or demote users to/from Admin roles.
- **API Endpoints**: RESTful API to manage users, lessons, and vocabulary.

## Installation

### 1. Clone the repository
```bash
git clone https://github.com/your-username/japanese-vocabulary-learning-app.git
