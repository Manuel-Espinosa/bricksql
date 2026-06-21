SET NAMES utf8mb4;

CREATE DATABASE IF NOT EXISTS demo
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE demo;

CREATE TABLE countries (
  id        INT          PRIMARY KEY AUTO_INCREMENT,
  name      VARCHAR(100) NOT NULL,
  code      CHAR(2)      NOT NULL,
  continent VARCHAR(50)  NOT NULL
);

CREATE TABLE users (
  id         INT          PRIMARY KEY AUTO_INCREMENT,
  name       VARCHAR(100) NOT NULL,
  email      VARCHAR(150) NOT NULL UNIQUE,
  country_id INT          NOT NULL,
  active     TINYINT(1)   NOT NULL DEFAULT 1,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (country_id) REFERENCES countries(id)
);

INSERT INTO countries (name, code, continent) VALUES
  ('Argentina',      'AR', 'South America'),
  ('Spain',          'ES', 'Europe'),
  ('Mexico',         'MX', 'North America'),
  ('Germany',        'DE', 'Europe'),
  ('Japan',          'JP', 'Asia'),
  ('United States',  'US', 'North America');

INSERT INTO users (name, email, country_id, active, created_at) VALUES
  ('Ana García',      'ana@example.com',    1, 1, '2024-01-10 09:00:00'),
  ('Carlos López',    'carlos@example.com', 3, 1, '2024-02-14 11:30:00'),
  ('María Fernández', 'maria@example.com',  2, 1, '2024-03-05 08:15:00'),
  ('Thomas Müller',   'thomas@example.com', 4, 1, '2024-03-22 14:00:00'),
  ('Yuki Tanaka',     'yuki@example.com',   5, 0, '2024-04-01 10:45:00'),
  ('Sofia Rossi',     'sofia@example.com',  1, 1, '2024-05-18 16:20:00'),
  ('James Wilson',    'james@example.com',  6, 1, '2024-06-30 13:00:00'),
  ('Laura Martínez',  'laura@example.com',  2, 0, '2024-08-11 09:50:00'),
  ('Pedro Alves',     'pedro@example.com',  1, 1, '2024-09-03 17:30:00'),
  ('Emma Schmidt',    'emma@example.com',   4, 1, '2024-11-20 12:00:00');
