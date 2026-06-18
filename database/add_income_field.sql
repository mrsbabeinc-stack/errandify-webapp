-- Add monthly household income field for CHAS auto-calculation
ALTER TABLE users ADD COLUMN IF NOT EXISTS monthly_household_income INTEGER;

-- Update CHAS card color based on income when saving income
-- This trigger will be called when income is updated
CREATE OR REPLACE FUNCTION update_chas_from_income()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.monthly_household_income IS NOT NULL THEN
    IF NEW.monthly_household_income <= 1900 THEN
      NEW.chas_card_color := 'blue';
      NEW.chas_subsidy_percentage := 25;
    ELSIF NEW.monthly_household_income <= 3900 THEN
      NEW.chas_card_color := 'green';
      NEW.chas_subsidy_percentage := 15;
    ELSE
      NEW.chas_card_color := 'none';
      NEW.chas_subsidy_percentage := 0;
    END IF;
    NEW.chas_verified := true;
    NEW.chas_verified_at := NOW();
    NEW.chas_verification_method := 'income_self_declared';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and create new one
DROP TRIGGER IF EXISTS trigger_update_chas_from_income ON users;
CREATE TRIGGER trigger_update_chas_from_income
BEFORE UPDATE OF monthly_household_income ON users
FOR EACH ROW
EXECUTE FUNCTION update_chas_from_income();
