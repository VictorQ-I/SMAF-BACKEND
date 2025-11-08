# SMAF - Sistema Motor Anti-Fraude Backend

API REST desarrollada con Node.js y Express para el Sistema Motor Anti-Fraude (SMAF).

## 🚀 Tecnologías

- **Node.js** - Runtime de JavaScript
- **Express.js** - Framework web
- **Sequelize** - ORM para base de datos
- **MySQL** - Base de datos relacional
- **JWT** - Autenticación y autorización
- **Jest** - Framework de pruebas unitarias
- **ESLint** - Linter para JavaScript
- **Prettier** - Formateador de código

## 📁 Estructura del Proyecto

```
src/
├── config/             # Configuraciones (DB, Logger)
├── controllers/        # Controladores de rutas
├── middleware/         # Middlewares personalizados
├── models/            # Modelos de Sequelize
├── routes/            # Definición de rutas
├── services/          # Lógica de negocio
├── utils/             # Utilidades
└── validators/        # Validadores de entrada

tests/
├── unit/              # Pruebas unitarias
├── integration/       # Pruebas de integración
└── setup.js           # Configuración de pruebas
```

## 🛠️ Instalación y Configuración

### Prerrequisitos
- Node.js >= 18
- MySQL >= 8.0
- pnpm (recomendado)

### Instalación

1. **Instalar dependencias:**
   ```bash
   pnpm install
   ```

2. **Configurar variables de entorno:**
   ```bash
   cp .env.example .env
   ```
   Edita el archivo `.env` con tus configuraciones de base de datos.

3. **Configurar base de datos:**
   ```bash
   # Crear base de datos MySQL
   mysql -u root -p
   CREATE DATABASE smaf_db;
   CREATE DATABASE smaf_test_db; -- Para pruebas
   ```

4. **Iniciar servidor de desarrollo:**
   ```bash
   pnpm dev
   ```

## 📝 Scripts Disponibles

- `pnpm start` - Inicia el servidor en producción
- `pnpm dev` - Inicia el servidor en modo desarrollo con nodemon
- `pnpm test` - Ejecuta las pruebas unitarias
- `pnpm test:watch` - Ejecuta las pruebas en modo watch
- `pnpm test:coverage` - Ejecuta las pruebas con reporte de cobertura
- `pnpm lint` - Ejecuta ESLint
- `pnpm lint:fix` - Ejecuta ESLint y corrige errores automáticamente
- `pnpm format` - Formatea el código con Prettier

## 🔐 Autenticación

La API utiliza JWT (JSON Web Tokens) para autenticación. Incluye el token en el header:

```
Authorization: Bearer <token>
```

### Roles de Usuario
- **admin** - Acceso completo
- **analyst** - Puede crear y modificar transacciones
- **viewer** - Solo lectura

## 📊 API Endpoints

### Autenticación
- `POST /api/auth/register` - Registrar usuario
- `POST /api/auth/login` - Iniciar sesión
- `GET /api/auth/me` - Obtener usuario actual

### Transacciones
- `GET /api/transactions` - Listar transacciones (con filtros)
- `POST /api/transactions` - Crear transacción
- `GET /api/transactions/:id` - Obtener transacción específica
- `PUT /api/transactions/:id` - Actualizar transacción
- `GET /api/transactions/stats` - Estadísticas de transacciones

### Health Check
- `GET /health` - Estado de la API

## 🧪 Pruebas

El proyecto incluye pruebas unitarias e integración con Jest.

```bash
# Ejecutar todas las pruebas
pnpm test

# Ejecutar con cobertura
pnpm test:coverage

# Ejecutar en modo watch
pnpm test:watch
```

## 🔍 Sistema Anti-Fraude

El sistema incluye un motor de detección de fraude que evalúa:

- **Monto de transacción** - Transacciones de alto valor
- **Velocidad** - Múltiples transacciones en corto tiempo
- **Geolocalización** - Países de alto riesgo
- **Patrones** - Transacciones duplicadas o sospechosas

### Puntuación de Riesgo
- **0.0 - 0.3** - Riesgo bajo (Aprobado)
- **0.4 - 0.6** - Riesgo medio (Pendiente)
- **0.7 - 1.0** - Riesgo alto (Marcado)

## 📝 Logging

El sistema incluye logging personalizado que:
- Registra errores y advertencias en archivos
- Muestra logs en consola durante desarrollo
- Incluye metadatos contextuales (IP, User-Agent, etc.)

Los logs se almacenan en la carpeta `logs/`:
- `error.log` - Errores del sistema
- `warn.log` - Advertencias

## 🔒 Seguridad

- **Helmet** - Headers de seguridad HTTP
- **CORS** - Control de acceso entre dominios
- **Rate Limiting** - Limitación de solicitudes por IP
- **Input Validation** - Validación de datos de entrada
- **Password Hashing** - Contraseñas hasheadas con bcrypt

## 🚀 Despliegue

### Variables de Entorno de Producción
```bash
NODE_ENV=production
PORT=3000
DB_HOST=your-db-host
DB_NAME=smaf_production
JWT_SECRET=your-super-secure-secret
```

### Docker (Opcional)
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

## 📄 Licencia

Este proyecto es parte del Sistema Motor Anti-Fraude (SMAF).

## 🤝 Contribución

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request