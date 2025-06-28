-- Update existing data to new enum values
UPDATE profiles SET role = 'REGULAR_USER' WHERE role = 'CLIENT';
UPDATE profiles SET role = 'LAWYER' WHERE role = 'ADVOCATE';
UPDATE profiles SET role = 'GOVERNMENT_OFFICIAL' WHERE role = 'ADMIN';

-- Add default values for new columns
UPDATE profiles SET kyc_type = 'REGULAR' WHERE role = 'REGULAR_USER';
UPDATE profiles SET kyc_type = 'PROFESSIONAL' WHERE role IN ('BARRISTER', 'LAWYER', 'GOVERNMENT_OFFICIAL');

-- Set can_upload_reports based on role
UPDATE profiles SET can_upload_reports = false WHERE role = 'REGULAR_USER';
UPDATE profiles SET can_upload_reports = true WHERE role IN ('BARRISTER', 'LAWYER', 'GOVERNMENT_OFFICIAL');
