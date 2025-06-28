-- Migration script to completely reset database for new role system

-- Drop existing enums if they exist
DROP TYPE IF EXISTS "UserRole" CASCADE;
DROP TYPE IF EXISTS "KycType" CASCADE;
DROP TYPE IF EXISTS "ConsultationType" CASCADE;
DROP TYPE IF EXISTS "RequestStatus" CASCADE;
DROP TYPE IF EXISTS "PaymentStatus" CASCADE;
DROP TYPE IF EXISTS "MessageType" CASCADE;
DROP TYPE IF EXISTS "CallStatus" CASCADE;

-- Drop all tables if they exist
DROP TABLE IF EXISTS vkyc_documents CASCADE;
DROP TABLE IF EXISTS "Report" CASCADE;
DROP TABLE IF EXISTS reports CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS "Profile" CASCADE;
DROP TABLE IF EXISTS advocate_profiles CASCADE;
DROP TABLE IF EXISTS consultation_requests CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS access_grants CASCADE;
DROP TABLE IF EXISTS chat_messages CASCADE;
DROP TABLE IF EXISTS video_calls CASCADE;
DROP TABLE IF EXISTS monthly_earnings CASCADE;

-- Clean slate - let Prisma recreate everything fresh with new enums
