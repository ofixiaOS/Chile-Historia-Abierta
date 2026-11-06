-- Local development roles only. Production provisioning is intentionally separate.
DO $bootstrap$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'cha_owner') THEN
    CREATE ROLE cha_owner LOGIN PASSWORD 'local_owner_password'
      NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'cha_public') THEN
    CREATE ROLE cha_public LOGIN PASSWORD 'local_public_password'
      NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT;
  END IF;
END
$bootstrap$;

ALTER DATABASE chile_historia_abierta OWNER TO cha_owner;
ALTER SCHEMA public OWNER TO cha_owner;

GRANT CONNECT ON DATABASE chile_historia_abierta TO cha_owner, cha_public;
GRANT USAGE ON SCHEMA public TO cha_public;
