-- Create conservation statuses table
CREATE TABLE conservation_statuses (
    id VARCHAR(10) PRIMARY KEY,
    label VARCHAR(50) NOT NULL,
    color_code VARCHAR(20) NOT NULL
);

INSERT INTO conservation_statuses (id, label, color_code) VALUES
('LC', 'Least Concern', '#3B82F6'),
('VU', 'Vulnerable', '#EAB308'),
('EN', 'Endangered', '#F97316'),
('CR', 'Critically Endangered', '#EF4444');

-- Create habitats table
CREATE TABLE habitats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE
);

INSERT INTO habitats (name) VALUES ('Forest'), ('Wetland'), ('Himalayas'), ('Marine'), ('Grassland');

-- Create regions table
CREATE TABLE regions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    bounding_box JSONB
);

INSERT INTO regions (name) VALUES ('India'), ('Himalayas'), ('Western Ghats'), ('Sundarbans');

-- Create core species table
CREATE TABLE species (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scientific_name VARCHAR(150) NOT NULL,
    common_name VARCHAR(150) NOT NULL,
    description TEXT NOT NULL,
    image_url TEXT NOT NULL,
    habitat VARCHAR(50) NOT NULL,
    region VARCHAR(50) NOT NULL,
    status VARCHAR(10) REFERENCES conservation_statuses(id),
    latitude FLOAT NOT NULL,
    longitude FLOAT NOT NULL,
    taxonomy JSONB,
    ecological_role TEXT,
    dependencies TEXT[]
);

-- Enable RLS Public Read Access
ALTER TABLE species ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read access" ON species FOR SELECT USING (true);