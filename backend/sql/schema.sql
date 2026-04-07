CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(120) UNIQUE NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(120) UNIQUE NOT NULL,
  slug VARCHAR(140) UNIQUE NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TYPE user_role AS ENUM ('admin', 'seller', 'user');
CREATE TYPE seller_status AS ENUM ('pending', 'approved', 'rejected', 'suspended', 'more_info');
CREATE TYPE verification_badge AS ENUM ('new', 'verified', 'suspended');

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name VARCHAR(160) NOT NULL,
  phone VARCHAR(40) UNIQUE NOT NULL,
  email VARCHAR(160) UNIQUE,
  password_hash TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'user',
  area_id UUID REFERENCES areas(id),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS seller_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  business_name VARCHAR(180) NOT NULL,
  phone VARCHAR(40) NOT NULL,
  area_id UUID NOT NULL REFERENCES areas(id),
  category_id UUID REFERENCES categories(id),
  notes TEXT,
  id_document_url TEXT,
  status seller_status NOT NULL DEFAULT 'pending',
  admin_note TEXT,
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sellers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  application_id UUID REFERENCES seller_applications(id),
  status seller_status NOT NULL DEFAULT 'pending',
  badge verification_badge NOT NULL DEFAULT 'new',
  whatsapp_number VARCHAR(40),
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  suspended_reason TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id),
  area_id UUID NOT NULL REFERENCES areas(id),
  title VARCHAR(180) NOT NULL,
  description TEXT NOT NULL,
  price NUMERIC(14,2) NOT NULL CHECK (price >= 0),
  currency VARCHAR(10) NOT NULL DEFAULT 'UGX',
  image_urls TEXT[] NOT NULL DEFAULT '{}',
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  requires_approval BOOLEAN NOT NULL DEFAULT FALSE,
  approved BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS delivery_fares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_area_id UUID NOT NULL REFERENCES areas(id) ON DELETE CASCADE,
  to_area_id UUID NOT NULL REFERENCES areas(id) ON DELETE CASCADE,
  distance_km NUMERIC(10,2) NOT NULL CHECK (distance_km >= 0),
  fare_ugx NUMERIC(12,2) NOT NULL CHECK (fare_ugx >= 0),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(from_area_id, to_area_id)
);

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  listing_id UUID REFERENCES listings(id) ON DELETE SET NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id UUID NOT NULL REFERENCES users(id),
  listing_id UUID NOT NULL REFERENCES listings(id),
  amount_ugx NUMERIC(14,2) NOT NULL CHECK (amount_ugx >= 0),
  status VARCHAR(40) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_listings_created_at ON listings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_listings_price ON listings(price);
CREATE INDEX IF NOT EXISTS idx_listings_available ON listings(is_available);
CREATE INDEX IF NOT EXISTS idx_listings_category ON listings(category_id);
CREATE INDEX IF NOT EXISTS idx_listings_area ON listings(area_id);
CREATE INDEX IF NOT EXISTS idx_listings_search ON listings USING GIN (to_tsvector('simple', title || ' ' || description));
CREATE INDEX IF NOT EXISTS idx_seller_app_status ON seller_applications(status);
CREATE INDEX IF NOT EXISTS idx_sellers_status ON sellers(status);
