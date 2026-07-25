-- Run this SQL in your Supabase SQL Editor to set up the database.

-- 1. Create Teams Table
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  name TEXT NOT NULL,
  paste_text TEXT,
  image_url TEXT
);

-- 2. Create Matches Table
CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  played_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  opponent_team JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of strings (pokemon names)
  own_team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  result TEXT CHECK (result IN ('win', 'loss', 'tie')) NOT NULL,
  video_url TEXT NOT NULL
);

-- 3. Create Match Notes Table
CREATE TABLE match_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE NOT NULL,
  tab TEXT CHECK (tab IN ('select', 'battle', 'improvements')) NOT NULL,
  turn_number INT,
  actual_note TEXT,
  correct_note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(match_id, tab, turn_number)
);

-- 4. Setup Storage Bucket
-- Make sure to create a public bucket named "videos" in the Supabase Storage UI,
-- or run the following if you have permissions:
INSERT INTO storage.buckets (id, name, public) VALUES ('videos', 'videos', true);

-- Note: You may also need to set up RLS (Row Level Security) policies if your app requires authentication, 
-- but for a single-user personal tool, you can disable RLS on these tables or set permissive policies.

-- UPDATES:
ALTER TABLE teams ADD COLUMN IF NOT EXISTS moves_image_url TEXT;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS spreads_image_url TEXT;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('team_images', 'team_images', true)
ON CONFLICT (id) DO NOTHING;

-- 5. Set up Storage RLS Policies
-- Allow anyone to upload videos and images (since this is a personal tool without auth)
CREATE POLICY "Allow public uploads to videos" ON storage.objects FOR INSERT TO public WITH CHECK (bucket_id = 'videos');
CREATE POLICY "Allow public read of videos" ON storage.objects FOR SELECT TO public USING (bucket_id = 'videos');
CREATE POLICY "Allow public updates to videos" ON storage.objects FOR UPDATE TO public USING (bucket_id = 'videos');
CREATE POLICY "Allow public deletes of videos" ON storage.objects FOR DELETE TO public USING (bucket_id = 'videos');

CREATE POLICY "Allow public uploads to team_images" ON storage.objects FOR INSERT TO public WITH CHECK (bucket_id = 'team_images');
CREATE POLICY "Allow public read of team_images" ON storage.objects FOR SELECT TO public USING (bucket_id = 'team_images');
CREATE POLICY "Allow public updates to team_images" ON storage.objects FOR UPDATE TO public USING (bucket_id = 'team_images');
CREATE POLICY "Allow public deletes of team_images" ON storage.objects FOR DELETE TO public USING (bucket_id = 'team_images');
