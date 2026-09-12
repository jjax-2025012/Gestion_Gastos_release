-- Activar extensión para generación de UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 2. CREAR TABLAS CON TIPOS Y CAMPOS COMPATIBLES CON EL CODEBASE
-- ============================================================

-- Tabla: USERS
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    gender VARCHAR(20) DEFAULT 'unspecified',
    avatar_url TEXT,
    google_id VARCHAR(255) UNIQUE,
    ahorro NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: CATEGORIES (IDs tipo UUID para cumplir con la validación del controlador)
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    type VARCHAR(20) CHECK (type IN ('income', 'expense', 'both')) NOT NULL,
    icon VARCHAR(50),
    color VARCHAR(20),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: INCOMES (Usa income_date e incluye is_recurring y notes)
CREATE TABLE incomes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    description VARCHAR(255) NOT NULL,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    income_date DATE NOT NULL DEFAULT CURRENT_DATE,
    is_recurring BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: EXPENSES
CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    description VARCHAR(255) NOT NULL,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    is_recurring BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: NOTIFICATIONS (Incluye la columna icon)
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(150),
    message TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'info',
    icon VARCHAR(50) DEFAULT 'bell',
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 3. INSERTAR CATEGORÍAS INICIALES (CON UUIDs)
-- ============================================================
INSERT INTO categories (name, type, icon, color) VALUES
    ('Salario', 'income', 'briefcase', '#2EC4B6'),
    ('Ventas / Negocio', 'income', 'trending-up', '#3A86EF'),
    ('Inversiones', 'income', 'dollar-sign', '#FFB703'),
    ('Otros Ingresos', 'income', 'plus-circle', '#8338EC'),
    ('Alimentación', 'expense', 'shopping-cart', '#E63946'),
    ('Transporte', 'expense', 'truck', '#F4A261'),
    ('Vivienda y Servicios', 'expense', 'home', '#2A9D8F'),
    ('Educación', 'expense', 'book', '#457B9D'),
    ('Entretenimiento', 'expense', 'film', '#D62828');