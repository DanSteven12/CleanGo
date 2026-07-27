# CleanGo Web App

Plataforma de gestión de rutas de limpieza con mapa interactivo.

## Arquitectura del proyecto

```
cleango-web-app/
├── frontend/          # React + Vite + TypeScript
│   ├── src/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── layouts/
│   │   ├── pages/
│   │   ├── services/
│   │   └── utils/
│   ├── public/
│   ├── index.html
│   ├── vite.config.ts
│   ├── tsconfig.json
│   └── package.json
│
├── backend/           # Node.js + Express + TypeScript
│   ├── src/
│   │   ├── routes/
│   │   ├── db.ts
│   │   └── index.ts
│   ├── .env
│   ├── tsconfig.json
│   └── package.json
│
├── database/          # Scripts SQL
│   ├── schema.sql
│   └── seed.sql
│
├── .gitignore
└── README.md
```

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Frontend | React 19, Vite 8, TypeScript, Leaflet / React-Leaflet |
| Backend | Node.js, Express 4, TypeScript, mysql2 |
| Base de datos | MySQL 8 |

## Inicio rápido

### Requisitos previos
- Node.js ≥ 18
- MySQL 8 en ejecución

### 1. Base de datos

```sql
-- Crear esquema
mysql -u root -p < database/schema.sql

-- (Opcional) Cargar datos de prueba
mysql -u root -p < database/seed.sql
```

### 2. Backend

```bash
cd backend
cp .env.example .env    # editar credenciales MySQL
npm install
npm run dev             # http://localhost:5000
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev             # http://localhost:5173
```

## Variables de entorno

### `backend/.env`

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=cleango
PORT=5000
```

### `frontend/.env`

```env
# Google Maps API Key para la aplicación web
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here

# URL del API backend (opcional, por defecto http://localhost:5001)
VITE_API_URL=http://localhost:5001
```

## Scripts disponibles

### Frontend (`cd frontend`)

| Comando | Descripción |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción |
| `npm run lint` | Linting |
| `npm run preview` | Preview del build |

### Backend (`cd backend`)

| Comando | Descripción |
|---|---|
| `npm run dev` | Servidor con hot-reload |
| `npm run build` | Compilar TypeScript |
| `npm start` | Ejecutar build compilado |
