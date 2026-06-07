/* Borramos la base de datos anterior si es que quedó a medias */
DROP DATABASE IF EXISTS moviesdb;

/*creacion de la base de datos*/
CREATE DATABASE moviesdb;

/*usar*/
USE moviesdb;


/*1. Tabla de películas*/
CREATE TABLE movie (
	id BINARY(16) PRIMARY KEY DEFAULT (UUID_TO_BIN (UUID())),
	title VARCHAR(255) NOT NULL,
	year INT NOT NULL,
	director VARCHAR(255) NOT NULL,
	duration INT NOT NULL,
	poster TEXT,
	rate DECIMAL(2, 1) NOT NULL	
);

/*2. Tabla de géneros*/
CREATE TABLE genre (
	id INT AUTO_INCREMENT PRIMARY KEY,
	name VARCHAR(255) NOT NULL UNIQUE
);

/*3. Tabla intermedia (Con la sintaxis correcta de llaves foráneas)*/
CREATE TABLE movie_genres (
	movie_id BINARY(16),
	genre_id INT,
	PRIMARY KEY (movie_id, genre_id),
	
	/*Aquí enlazamos correctamente y a su vez se eliminan datos fantasmas en caso de eliminar alguna*/
	FOREIGN KEY (movie_id)  REFERENCES movie(id) ON DELETE CASCADE,
	FOREIGN KEY (genre_id)  REFERENCES genre(id) ON DELETE CASCADE
);

/* Insertar gernero primero*/
INSERT INTO genre (name) VALUES
('Drama'),
('Action'),
('Crime'),
('Adventure'),
('Sci-fi'),
('Romance');

/*Insertar movies a la tabla de movie (Corregido el nombre de Dark Knight)*/
INSERT INTO movie (id, title, year, director, duration, poster, rate) VALUES
(UUID_TO_BIN(UUID()), 'Inception', 2010, 'Christopher Nolan', 148, 'https://image.url/inception.jpg', 8.8),
(UUID_TO_BIN(UUID()), 'The Matrix', 1999, 'Lana Wachowski, Lilly Wachowski', 136, 'https://image.url/matrix.jpg', 8.7),
(UUID_TO_BIN(UUID()), 'The Dark Knight', 2008, 'Christopher Nolan', 152, 'https://image.url/darkknight.jpg', 9.0);


/*conectamos los generos de las 3 peliculas (Corregido el nombre de Dark Knight)*/
INSERT INTO movie_genres (movie_id, genre_id) VALUES
((SELECT id FROM movie WHERE  title = 'Inception'),(SELECT id FROM genre WHERE name = 'Sci-fi')),
((SELECT id FROM movie WHERE  title = 'Inception'),(SELECT id FROM genre WHERE name = 'Action')),

((SELECT id FROM movie WHERE  title = 'The Matrix'),(SELECT id FROM genre WHERE name = 'Sci-fi')),
((SELECT id FROM movie WHERE  title = 'The Matrix'),(SELECT id FROM genre WHERE name = 'Action')),

((SELECT id FROM movie WHERE  title = 'The Dark Knight'),(SELECT id FROM genre WHERE name = 'Action')),
((SELECT id FROM movie WHERE  title = 'The Dark Knight'),(SELECT id FROM genre WHERE name = 'Drama'));


/*para ver cada pelicula con sus respectivos generos*/
/* (Corregidos los nombres de las tablas para que coincidan con las de arriba) */
/*
SELECT 
	BIN_TO_UUID(m.id) AS movie_id,
	m.title AS movie_title,
	m.year AS release_year,
	g.name AS genre_name
FROM movie_genres mg             -- Cambiado a movie_genres (plural)
JOIN movie m ON mg.movie_id = m.id -- Cambiado a movie (singular)
JOIN genre g ON mg.genre_id = g.id   -- Se queda en genre (singular)
ORDER BY m.title ASC;
*/

/* para ver que no se duplique la pelicula por cada genero que esta posea*/
SELECT 
    BIN_TO_UUID(m.id) AS movie_id, 
    m.title AS movie_title, 
    m.year AS release_year,
    GROUP_CONCAT(g.name SEPARATOR ', ') AS genres  -- ¡Aquí ocurre la magia!
FROM movie_genres mg
JOIN movie m ON mg.movie_id = m.id
JOIN genre g ON mg.genre_id = g.id
GROUP BY m.id, m.title, m.year                   -- Le decimos que agrupe por película
ORDER BY m.title ASC;
