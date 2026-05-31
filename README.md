# Movie API 🎬

Una API RESTful limpia y eficiente desarrollada con **Node.js** y **Express** para la gestión, creación y filtrado de registros de películas. Este proyecto fue diseñado siguiendo las mejores prácticas de arquitectura backend, separación de conceptos y validación estricta de datos.

🚀 **Despliegue en vivo:** [Ver API en Render](https://rest-api-vx7u.onrender.com/)

---

## 🛠️ Tecnologías Utilizadas

- **Entorno de ejecución:** Node.js
- **Framework Web:** Express.js
- **Validación de Datos:** Zod (Esquemas y tipado seguro)
- **Control de Versiones:** Git & GitHub
- **Plataforma de Despliegue:** Render
- **Entorno de Desarrollo:** Linux (Ubuntu/GNOME) & Postman

---

## ⚙️ Características principales

- **Arquitectura limpia:** Separación clara de rutas, lógica de negocio y controladores.
- **Validación con Zod:** Robustez en el endpoint de creación (`POST`). La API valida tipos de datos, rangos (como el año o la duración) y campos obligatorios antes de procesar cualquier petición, devolviendo errores claros si el cliente envía datos incorrectos.
- **Filtrado dinámico:** Permite buscar y filtrar películas por criterios específicos (como el género) directamente desde las _Query Strings_.
- **Manejo de CORS:** Configuración adecuada para permitir o restringir peticiones desde entornos frontend.

---

## 📌 Documentación de la API (Endpoints)

### 1. Películas

- `GET /movies` - Obtiene el listado completo de películas.
- `GET /movies?genre=action` - Filtra las películas por un género específico mediante Query Strings.
- `GET /movies/:id` - Obtiene los detalles de una película específica usando su ID.
- `POST /movies` - Crea una nueva película en el catálogo (Validada con Zod e ID autogenerado con `crypto`).
- `PATCH /movies/:id` - Actualiza parcialmente los datos de una película existente por su ID (Valida solo los campos enviados usando un esquema parcial de Zod).
- `DELETE /movies/:id` - Elimina una película permanentemente del catálogo según su ID.
  - **Estructura del JSON requerido (Ejemplo):**
    ```json
    {
      "title": "Inception",
      "year": 2010,
      "director": "Christopher Nolan",
      "duration": 148,
      "poster": "[https://image-url.com/poster.jpg](https://image-url.com/poster.jpg)",
      "genre": ["Action", "Sci-Fi"]
    }
    ```

---

#### 📝 Estructura del JSON para POST (Ejemplo):

````json
{
  "title": "Inception",
  "year": 2010,
  "director": "Christopher Nolan",
  "duration": 148,
  "poster": "[https://image-url.com/poster.jpg](https://image-url.com/poster.jpg)",
  "genre": ["Action", "Sci-Fi"]
}
#### 📝 Estructura del JSON para PATCH (Ejemplo):
{
  "year": 2012
}
## 💻 Instalación y Uso Local

Si deseas clonar este repositorio y ejecutarlo en tu computadora, asegúrate de tener [Node.js](https://nodejs.org/) instalado y sigue estos pasos:

1. **Clonar el repositorio:**
   ```bash
   git clone https://github.com/Jalmar01/rest-api
   cd rest-api

2. Instalar las dependencias:
    npm install

3. Iniciar el servidor de desarrollo:
    npm start

📁 Estructura del Proyecto

├── app.js               # Archivo principal y punto de entrada de la aplicación
├── schemas/             # Esquemas de validación de datos (Zod)
├── package.json         # Configuración del proyecto y dependencias
├── .gitignore           # Archivos y carpetas excluidos en Git (node_modules)
└── README.md            # Documentación del proyecto

👨‍💻 Autor

    Villarreal Jalmar - GitHub
````
