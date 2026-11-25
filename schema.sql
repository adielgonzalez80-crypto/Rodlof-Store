DROP TABLE IF EXISTS apps;
CREATE TABLE apps(id TEXT PRIMARY KEY,name TEXT NOT NULL,developer TEXT,category TEXT,description TEXT,type TEXT DEFAULT 'app',icon TEXT,image_url TEXT,apk_url TEXT,size INTEGER,uploaded_at TEXT);
CREATE TABLE IF NOT EXISTS reviews(id TEXT PRIMARY KEY,app_id TEXT NOT NULL,name TEXT,rating INTEGER,comment TEXT,created_at TEXT);
CREATE INDEX IF NOT EXISTS idx_reviews_app ON reviews(app_id);
