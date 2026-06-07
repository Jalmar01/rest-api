const express = require("express"); // require--> commonJS
const crypto = require("node:crypto");
const cors = require('cors')

// 1. MANDAMOS A LLAMAR LAS CREDENCIALES DE AIVEN Y EL CONECTOR DE BASE DE DATOS
require('dotenv').config(); // Lee el archivo .env automáticamente
const mysql = require('mysql2/promise'); // Carga la librería para MySQL con promesas

//const movies = require("./movies.json");// Lo dejamos aquí para no romper las otras rutas por ahora
const { validateMovie, validatePartialMovie } = require("./schemas/movies");

const app = express();
app.use(express.json());

// configuracion del pool hacia Aiven
const config = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  ssl: {
    rejectUnauthorized: false
  },
  authPlugins: {
    mysql_clear_password: () => () => Buffer.from(process.env.DB_PASSWORD + '\0')
  },
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

const pool = mysql.createPool(config);


app.use(cors({
  origin:(origin, callback) => {
      const ACCEPTED_ORIGINS = [
        'http://localhost:8080',
        'http://localhost:1234',
        'http://localhost:3000'
      ]
      if (ACCEPTED_ORIGINS.includes(origin)){
        return callback(null, true)
      }

      if(!origin){
        return callback(null, true)
      }

      return callback(new Error('Not allowed by CORS'))
  }
}))
app.disable("x-powered-by"); // deshabilitar el header x-powered-by: express



// Todos los recursos que sean MOVIES se identifica con /movies
// app.get("/movies", (req, res) => {
//   const { genre } = req.query;
//   if (genre) {
//     const filteredMovies = movies.filter((movie) =>
//       movie.genre.some((g) => g.toLowerCase() === genre.toLowerCase()),
//     );
//     return res.json(filteredMovies);
//   }
//   res.json(movies);
// });

//TODOS LOS RECURSOS QUE SEAN MOVIES SE IDENTIFICAN CON /movies
app.get("/movies", async (req, res) => {
  const { genre } = req.query;

  try {
    // 1. Si filtran por género
    if (genre) {
      const [filteredMovies] = await pool.query(
        `SELECT BIN_TO_UUID(m.id) AS id, m.title, m.year, m.director, m.duration, m.poster, m.rate 
         FROM movie m
         JOIN movie_genres mg ON m.id = mg.movie_id
         JOIN genre g ON mg.genre_id = g.id
         WHERE LOWER(g.name) = LOWER(?);`,
        [genre]
      );
      return res.json(filteredMovies);
    }

    // 2. Si quieren todo el catálogo (¡Aquí agregamos el alias 'm' corregido!)
    const [allMovies] = await pool.query(
      `SELECT BIN_TO_UUID(m.id) AS id, m.title, m.year, m.director, m.duration, m.poster, m.rate 
       FROM movie m;`
    );

    return res.json(allMovies);

  } catch (error) {
    console.error("Error al consultar la base de datos en Aiven:", error);
    return res.status(500).json({ error: "Error interno del servidor al conectar con la nube" });
  }
});


// app.get("/movies/:id", (req, res) => {
//    // path-to-regexp--> biblioteca
//    const { id } = req.params;
//   const movie = movies.find((movie) => movie.id === id);
//   if (movie) return res.json(movie);

//   res.status(404).json({ message: "Movie not found" });
// });

// BUSCAR UNA PELÍCULA POR SU ID EN LA NUBE
app.get("/movies/:id", async (req, res) => {
  const { id } = req.params; // Este id viene como texto (string)

  try {
    // Hacemos la consulta convirtiendo el ID de texto a binario para buscarlo
    const [movies] = await pool.query(
      `SELECT BIN_TO_UUID(id) AS id, title, year, director, duration, poster, rate 
       FROM movie 
       WHERE id = UUID_TO_BIN(?);`,
      [id]
    );

    // pool.query siempre devuelve un arreglo. Si está vacío, es que no encontró la película
    if (movies.length === 0) {
      return res.status(404).json({ message: "Movie not found" });
    }

    // Como el ID es único, si la encuentra estará en la posición 0 del arreglo
    return res.json(movies[0]);

  } catch (error) {
    console.error("Error al buscar la película por ID:", error);
    return res.status(500).json({ error: "Error interno del servidor al conectar con la nube" });
  }
});

// app.post("/movies", (req, res) => {
//   const result = validateMovie(req.body);

//   if (result.error) {
//     return res.status(422).json({ error: JSON.parse(result.error.message) });
//   }
//   // en bases de datos
//   const newMovie = {
//     id: crypto.randomUUID(), // uuid v4 crea un id al azar
//     ...result.data,
//   };

//   // Esto no seria REST, porque estamos guardando
//   //el estado de la aplicacion en memoria
//   movies.push(newMovie);

//   res.status(201).json(newMovie); // actualizar la caché del cliente
// });

// CREAR UNA NUEVA PELÍCULA EN LA NUBE
app.post("/movies", async (req, res) => {
  // 1. Validamos los datos con el esquema que ya tenías
  const result = validateMovie(req.body);

  if (!result.success) {
    return res.status(400).json({ error: JSON.parse(result.error.message) });
  }

  // Desestructuramos los datos validados
  const { title, year, director, duration, poster, rate, genre } = result.data;

  // Generamos un UUID de texto limpio para usarlo en la respuesta y en la query
  const uuid = crypto.randomUUID();

  try {
    // 2. Insertamos la película convirtiendo el UUID a Binario al vuelo
    await pool.query(
      `INSERT INTO movie (id, title, year, director, duration, poster, rate)
       VALUES (UUID_TO_BIN(?), ?, ?, ?, ?, ?, ?);`,
      [uuid, title, year, director, duration, poster, rate]
    );

    // 3. Insertamos los géneros en la tabla intermedia movie_genres
    // Recorremos el arreglo de géneros que mandó el usuario (ej: ['Action', 'Sci-Fi'])
    if (genre && genre.length > 0) {
      for (const genreName of genre) {
        // Esta query busca el ID del género por su nombre e inserta la relación
        await pool.query(
          `INSERT INTO movie_genres (movie_id, genre_id)
           VALUES (
             UUID_TO_BIN(?), 
             (SELECT id FROM genre WHERE LOWER(name) = LOWER(?))
           );`,
          [uuid, genreName]
        );
      }
    }

    // 4. Respondemos al cliente con la película tal y como quedó guardada en la nube
    return res.status(201).json({
      id: uuid,
      title,
      year,
      director,
      duration,
      poster,
      rate,
      genre
    });

  } catch (error) {
    console.error("Error al insertar la película en Aiven:", error);
    return res.status(500).json({ error: "Error interno al guardar la película en la nube" });
  }
});

// app.delete('/movies/:id', (req, res) => {
//    const { id } = req.params
//   const movieIndex = movies.findIndex(movie => movie.id === id)

//   if(movieIndex === -1) {
//     return res.status(404).json({ message: "Movie not found" });
//   } 
//   movies.splice(movieIndex, 1)
  
//   return res.json({message: 'Movie deleted'})
// })

// BORRAR UNA PELÍCULA DE LA NUBE
app.delete("/movies/:id", async (req, res) => {
  const { id } = req.params;

  try {
    // 1. Borramos primero las relaciones en la tabla intermedia
    await pool.query(
      `DELETE FROM movie_genres WHERE movie_id = UUID_TO_BIN(?);`,
      [id]
    );

    // 2. Ahora sí, borramos la película de la tabla principal
    const [result] = await pool.query(
      `DELETE FROM movie WHERE id = UUID_TO_BIN(?);`,
      [id]
    );

    // result.affectedRows nos dice cuántas filas se borraron. 
    // Si es 0, significa que ese UUID no existía en la base de datos.
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Movie not found" });
    }

    // Respuesta limpia estándar para un borrado exitoso (204 No Content)
    return res.status(204).send();

  } catch (error) {
    console.error("Error al borrar la película en Aiven:", error);
    return res.status(500).json({ error: "Error interno al intentar borrar la película de la nube" });
  }
});

// app.patch("/movies/:id", (req, res) => {
//   const result = validatePartialMovie(req.body);

//   if (!result.success) {
//     return res.status(400).json({ error: JSON.parse(result.error.message) });
//   }

//   const { id } = req.params;
//   const movieIndex = movies.findIndex((movie) => movie.id === id);

//   if (movieIndex === -1) {
//     return res.status(404).json({ message: "Movie not found" });
//   }

//   const updateMovie = {
//     ...movies[movieIndex],
//     ...result.data,
//   };

//   movies[movieIndex] = updateMovie;

//   return res.json(updateMovie);
// });

// ACTUALIZAR PARCIALMENTE UNA PELÍCULA EN LA NUBE
app.patch("/movies/:id", async (req, res) => {
  const { id } = req.params;
  
  // 1. Validamos parcialmente el cuerpo (Zod solo revisará los campos que vengan)
  const result = validatePartialMovie(req.body);

  if (!result.success) {
    return res.status(400).json({ error: JSON.parse(result.error.message) });
  }

  // Si el cuerpo viene vacío (ej: mandaron un JSON vacío `{}`), no hacemos nada
  if (Object.keys(result.data).length === 0) {
    return res.status(400).json({ message: "No fields provided to update" });
  }

  // 2. Armamos la Query SQL Dinámica
  const fields = [];
  const values = [];

  // Recorremos los campos validados y los preparamos para SQL
  for (const key in result.data) {
    fields.push(`${key} = ?`);
    values.push(result.data[key]);
  }

  // Agregamos el ID al final de los valores para el WHERE
  values.push(id);

  try {
    // Unimos los campos con comas: "title = ?, year = ?"
    const queryString = `UPDATE movie SET ${fields.join(', ')} WHERE id = UUID_TO_BIN(?);`;

    const [updateResult] = await pool.query(queryString, values);

    // Si no afectó a ninguna fila, el UUID no existe
    if (updateResult.affectedRows === 0) {
      return res.status(404).json({ message: "Movie not found" });
    }

    // 3. Traemos la película actualizada de la nube para respondérsela al cliente
    const [updatedMovie] = await pool.query(
      `SELECT BIN_TO_UUID(id) AS id, title, year, director, duration, poster, rate 
       FROM movie WHERE id = UUID_TO_BIN(?);`,
      [id]
    );

    return res.json(updatedMovie[0]);

  } catch (error) {
    console.error("Error al actualizar la película en Aiven:", error);
    return res.status(500).json({ error: "Error interno al intentar actualizar en la nube" });
  }
});

const PORT = process.env.PORT ?? 1234;

app.listen(PORT, () => {
  console.log(`Server listening on port http://localhost:${PORT}`);
});
