-- Clients Table
-- Stores client/customer information for the CRM

CREATE TABLE IF NOT EXISTS clients (
  id SERIAL PRIMARY KEY,
  business_name VARCHAR(255) NOT NULL,
  business_address TEXT,
  website VARCHAR(255),
  primary_contact VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(50),
  avatar VARCHAR(10), -- Stores initials or avatar identifier
  avatar_url TEXT, -- Stores image URL for avatar
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster lookups by business name
CREATE INDEX idx_clients_business_name ON clients(business_name);

-- Index for email lookups
CREATE INDEX idx_clients_email ON clients(email);

-- Update trigger for updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_clients_updated_at
BEFORE UPDATE ON clients
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
