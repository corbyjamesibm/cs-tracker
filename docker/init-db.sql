-- Enable pgvector extension for AI-optimized storage
CREATE EXTENSION IF NOT EXISTS vector;

-- Create application user (optional, for security)
-- CREATE USER cstracker_app WITH PASSWORD 'change_me';
-- GRANT ALL PRIVILEGES ON DATABASE cstracker TO cstracker_app;

-- Add any initial seed data here if needed
