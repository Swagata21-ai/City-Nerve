-- =========================================================
-- CITY NERVE - Supabase Schema Update for Real-Time Data Persistence
-- =========================================================
-- Run these SQL commands in your Supabase SQL Editor
-- to add the new columns for real-time data tracking
-- =========================================================

-- Update location_analysis table with real-time weather and infrastructure columns
ALTER TABLE location_analysis
ADD COLUMN IF NOT EXISTS weather_temperature NUMERIC,
ADD COLUMN IF NOT EXISTS weather_humidity NUMERIC,
ADD COLUMN IF NOT EXISTS weather_rainfall NUMERIC,
ADD COLUMN IF NOT EXISTS weather_wind NUMERIC,
ADD COLUMN IF NOT EXISTS weather_available BOOLEAN,
ADD COLUMN IF NOT EXISTS zone_id TEXT,
ADD COLUMN IF NOT EXISTS zone_name TEXT,
ADD COLUMN IF NOT EXISTS distance_km NUMERIC,
ADD COLUMN IF NOT EXISTS traffic_density NUMERIC,
ADD COLUMN IF NOT EXISTS traffic_status TEXT,
ADD COLUMN IF NOT EXISTS drainage_capacity NUMERIC,
ADD COLUMN IF NOT EXISTS road_condition NUMERIC,
ADD COLUMN IF NOT EXISTS historical_incidents INTEGER,
ADD COLUMN IF NOT EXISTS population_density NUMERIC,
ADD COLUMN IF NOT EXISTS analysis_timestamp TIMESTAMPTZ DEFAULT NOW();

-- Update predictions table with timestamp
ALTER TABLE predictions
ADD COLUMN IF NOT EXISTS prediction_timestamp TIMESTAMPTZ DEFAULT NOW();

-- Update ai_explanations table with timestamp
ALTER TABLE ai_explanations
ADD COLUMN IF NOT EXISTS explanation_timestamp TIMESTAMPTZ DEFAULT NOW();

-- Update preventive_actions table with timestamp
ALTER TABLE preventive_actions
ADD COLUMN IF NOT EXISTS actions_timestamp TIMESTAMPTZ DEFAULT NOW();

-- Ensure simulation_history has timestamp column
ALTER TABLE simulation_history
ADD COLUMN IF NOT EXISTS timestamp TIMESTAMPTZ DEFAULT NOW();

-- =========================================================
-- Verify the schema updates
-- =========================================================

-- Check location_analysis table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'location_analysis'
ORDER BY ordinal_position;

-- Check predictions table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'predictions'
ORDER BY ordinal_position;

-- Check ai_explanations table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'ai_explanations'
ORDER BY ordinal_position;

-- Check preventive_actions table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'preventive_actions'
ORDER BY ordinal_position;

-- Check simulation_history table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'simulation_history'
ORDER BY ordinal_position;
