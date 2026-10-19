-- Runs once, when the Compose Postgres volume is first created. The
-- integration tests wipe their database, so they get their own one next to
-- the app's database.
CREATE DATABASE app_test;
