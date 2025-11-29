# 🎵 Spotify Clone API

A RESTful API for a Spotify-like music streaming platform built with Node.js, Express, TypeScript, and PostgreSQL. This API provides endpoints for managing users, artists, songs, albums, and playlists with authentication and authorization.

## ✨ Features

- **User Authentication**: JWT-based authentication with role-based access control (Admin/User)
- **Music Management**: CRUD operations for songs, artists, albums, and playlists
- **User Interactions**: Like songs, follow artists, create and manage playlists
- **File Uploads**: Cloudinary integration for image and audio file storage
- **Search & Filtering**: Query endpoints with search and filter capabilities
- **Top Charts**: Get top songs and artists by play counts and followers
- **Playlist Collaboration**: Multi-user playlist collaboration features

## 🛠️ Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js 5.x
- **Language**: TypeScript
- **Database**: PostgreSQL 15
- **ORM**: Prisma
- **Authentication**: JWT (JSON Web Tokens)
- **File Storage**: Cloudinary
- **File Upload**: Multer
- **Password Hashing**: bcryptjs

## 📋 Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- PostgreSQL 15 (or Docker for containerized setup)
- Cloudinary account (for file uploads)

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone <repository-url>
cd spotify-clone-api
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Setup

Copy the `.env.example` file to `.env` and fill in your configuration:

```bash
cp .env.example .env
```

Edit `.env` with your actual values:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Database Configuration (PostgreSQL)
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/spotify_db

# JWT Secret Key
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your-cloudinary-cloud-name
CLOUDINARY_API_KEY=your-cloudinary-api-key
CLOUDINARY_API_SECRET=your-cloudinary-api-secret
```

### 4. Database Setup

#### Option A: Using Docker (Recommended)

```bash
docker-compose up -d
```

This will start a PostgreSQL container on port `5433`.

#### Option B: Local PostgreSQL

Make sure PostgreSQL is running and create a database:

```sql
CREATE DATABASE spotify_db;
```

### 5. Run Database Migrations

```bash
# Generate Prisma Client
npm run prisma:generate

# Run migrations
npm run prisma:migrate
```

### 6. Start the Server

#### Development Mode

```bash
npm run dev
```

#### Production Mode

```bash
# Build TypeScript
npm run build

# Start server
npm start
```

The server will start on `http://localhost:3000` (or the port specified in your `.env`).

## 📚 API Documentation

### Base URL

```
http://localhost:3000/api
```

### Authentication

Most endpoints require authentication. Include the JWT token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

Get your token by logging in via `/api/users/login`.

---

## 🔐 Authentication & User Routes

### Register User

```http
POST /api/users/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "username": "johndoe",
  "fullName": "John Doe"
}
```

**Response:**

```json
{
  "id": 1,
  "email": "user@example.com",
  "username": "johndoe",
  "fullName": "John Doe",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Login

```http
POST /api/users/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**

```json
{
  "id": 1,
  "email": "user@example.com",
  "username": "johndoe",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Get User Profile

```http
GET /api/users/profile
Authorization: Bearer <token>
```

### Update User Profile

```http
PUT /api/users/profile
Authorization: Bearer <token>
Content-Type: application/json

{
  "fullName": "John Updated",
  "username": "johndoe2",
  "address": "123 Main St",
  "phoneNumber": "+1234567890"
}
```

### Like/Unlike Song

```http
PUT /api/users/like-song/:id
Authorization: Bearer <token>
```

### Follow/Unfollow Artist

```http
PUT /api/users/follow-artist/:id
Authorization: Bearer <token>
```

### Follow/Unfollow Playlist

```http
PUT /api/users/follow-playlist/:id
Authorization: Bearer <token>
```

### Get All Users (Admin Only)

```http
GET /api/users
Authorization: Bearer <admin-token>
```

---

## 🎤 Artist Routes

### Get All Artists

```http
GET /api/artists
GET /api/artists?search=beatles
GET /api/artists?verified=true
```

**Query Parameters:**

- `search` - Search artists by name (case-insensitive)
- `verified` - Filter by verification status (`true`/`false`)

### Get Top Artists

```http
GET /api/artists/top
GET /api/artists/top?limit=20
```

**Query Parameters:**

- `limit` - Number of results (default: 10, max: 100)

### Get Artist by ID

```http
GET /api/artists/:id
```

**Response includes:** Artist details, songs, albums, and counts.

### Get Artist's Top Songs

```http
GET /api/artists/:id/top-songs
GET /api/artists/:id/top-songs?limit=10
```

### Create Artist (Admin Only)

```http
POST /api/artists
Authorization: Bearer <admin-token>
Content-Type: multipart/form-data

name: The Beatles
bio: The greatest band of all time
dob: 1960-01-01
verificationStatus: true
image: <file>
```

### Update Artist (Admin Only)

```http
PUT /api/artists/:id
Authorization: Bearer <admin-token>
Content-Type: multipart/form-data

name: Updated Name
bio: Updated bio
image: <file>
```

### Delete Artist (Admin Only)

```http
DELETE /api/artists/:id
Authorization: Bearer <admin-token>
```

---

## 🎵 Song Routes

### Get All Songs

```http
GET /api/songs
GET /api/songs?search=hey jude
GET /api/songs?genre=rock
GET /api/songs?artistId=1
```

**Query Parameters:**

- `search` - Search songs by title
- `genre` - Filter by genre
- `artistId` - Filter by artist ID

### Get Top Songs

```http
GET /api/songs/top
GET /api/songs/top?limit=50
```

### Get New Releases

```http
GET /api/songs/new-releases
GET /api/songs/new-releases?limit=20
```

### Get Song by ID

```http
GET /api/songs/:id
```

### Create Song (Admin Only)

```http
POST /api/songs
Authorization: Bearer <admin-token>
Content-Type: multipart/form-data

title: Hey Jude
artistId: 1
albumId: 1
duration: 431
genre: Rock
audioUrl: <file>
coverImage: <file>
lyric: Hey Jude, don't be afraid...
isExplicit: false
```

### Update Song (Admin Only)

```http
PUT /api/songs/:id
Authorization: Bearer <admin-token>
Content-Type: multipart/form-data
```

### Delete Song (Admin Only)

```http
DELETE /api/songs/:id
Authorization: Bearer <admin-token>
```

---

## 💿 Album Routes

### Get All Albums

```http
GET /api/albums
GET /api/albums?search=abbey road
GET /api/albums?artistId=1
```

### Get New Releases

```http
GET /api/albums/new-releases
GET /api/albums/new-releases?limit=10
```

### Get Album by ID

```http
GET /api/albums/:id
```

**Response includes:** Album details, songs, and artist information.

### Create Album (Admin Only)

```http
POST /api/albums
Authorization: Bearer <admin-token>
Content-Type: multipart/form-data

title: Abbey Road
artistId: 1
releaseDate: 1969-09-26
genre: Rock
description: The Beatles' final studio album
coverImage: <file>
isExplicit: false
```

### Update Album (Admin Only)

```http
PUT /api/albums/:id
Authorization: Bearer <admin-token>
Content-Type: multipart/form-data
```

### Delete Album (Admin Only)

```http
DELETE /api/albums/:id
Authorization: Bearer <admin-token>
```

### Add Songs to Album (Admin Only)

```http
PUT /api/albums/:id/add-songs
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "songIds": [1, 2, 3]
}
```

### Remove Song from Album (Admin Only)

```http
PUT /api/albums/:id/remove-song/:songId
Authorization: Bearer <admin-token>
```

---

## 📋 Playlist Routes

### Get All Public Playlists

```http
GET /api/playlists
GET /api/playlists?search=my playlist
```

### Get Featured Playlists (? not sure how to implement since we don't have isFeatured property in the schema)

```http
GET /api/playlists/featured
GET /api/playlists/featured?limit=10
```

### Get Playlist by ID

```http
GET /api/playlists/:id
```

### Get User's Playlists

```http
GET /api/playlists/user/me
Authorization: Bearer <token>
```

### Create Playlist

```http
POST /api/playlists
Authorization: Bearer <token>
Content-Type: multipart/form-data

name: My Awesome Playlist
description: A collection of my favorite songs
isPublic: true
coverImage: <file>
```

### Update Playlist

```http
PUT /api/playlists/:id
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Note:** Only the creator or collaborators can update a playlist.

### Delete Playlist

```http
DELETE /api/playlists/:id
Authorization: Bearer <token>
```

**Note:** Only the creator can delete a playlist.

### Add Songs to Playlist

```http
PUT /api/playlists/:id/add-songs
Authorization: Bearer <token>
Content-Type: application/json

{
  "songIds": [1, 2, 3]
}
```

### Remove Song from Playlist

```http
PUT /api/playlists/:id/remove-song/:songId
Authorization: Bearer <token>
```

### Add Collaborator to Playlist

```http
PUT /api/playlists/:id/add-collaborator
Authorization: Bearer <token>
Content-Type: application/json

{
  "userId": 2
}
```

### Remove Collaborator from Playlist

```http
PUT /api/playlists/:id/remove-collaborator
Authorization: Bearer <token>
Content-Type: application/json

{
  "userId": 2
}
```

---

## 🔒 Access Levels

- **Public**: No authentication required
- **Private**: Requires valid JWT token
- **Admin**: Requires valid JWT token with `isAdmin: true`

---

## 📝 Available Scripts

```bash
# Development
npm run dev              # Start development server with hot reload

# Production
npm run build            # Compile TypeScript to JavaScript
npm start                # Start production server

# Database
npm run prisma:generate  # Generate Prisma Client
npm run prisma:migrate   # Run database migrations
npm run prisma:studio    # Open Prisma Studio (database GUI)
npm run prisma:reset     # Reset database (WARNING: deletes all data)
npm run prisma:push      # Push schema changes to database
```

---

## 🗄️ Database Management

### Prisma Studio

View and edit your database through a visual interface:

```bash
npm run prisma:studio
```

This opens Prisma Studio at `http://localhost:5555`.

### Database Migrations

After modifying `prisma/schema.prisma`, create and apply migrations:

```bash
npm run prisma:migrate
```

---

## 🐳 Docker Setup

The project includes a `docker-compose.yml` file for easy PostgreSQL setup:

```bash
# Start PostgreSQL container
docker-compose up -d

# Stop container
docker-compose down

# View logs
docker-compose logs -f postgres
```

---

## 🔧 Error Handling

The API uses consistent error responses:

```json
{
  "message": "Error message here",
  "stack": "Error stack trace (only in development)"
}
```

**Common HTTP Status Codes:**

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error

---

## 📦 File Uploads

The API supports file uploads for:

- Artist images
- Album cover images
- Song cover images
- Song audio files
- Playlist cover images

**File Requirements:**

- Images: Max 5MB, formats: jpg, png, gif, webp
- Audio: Configured via Cloudinary settings

Files are uploaded to Cloudinary and the secure URL is stored in the database.

---

## 🔐 Security Features

- Password hashing with bcryptjs
- JWT token-based authentication
- Role-based access control (RBAC)
- Input validation and sanitization
- CORS enabled
- Environment variable protection

---
