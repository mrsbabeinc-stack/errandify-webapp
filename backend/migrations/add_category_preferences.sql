-- Migration: Add category preferences columns to users table
-- Date: 2026-06-29
-- Description: Support for AI-powered category preference matching

ALTER TABLE users ADD COLUMN IF NOT EXISTS category_can_help TEXT[] DEFAULT '{}';
ALTER TABLE users ADD COLUMN IF NOT EXISTS category_need_help TEXT[] DEFAULT '{}';

-- category_can_help: Categories where user can help (doer specializations)
-- category_need_help: Categories where user needs help (asker interests)
-- Both stored as arrays of category IDs for efficient filtering
