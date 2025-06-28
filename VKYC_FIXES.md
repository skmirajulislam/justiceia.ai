# VKYC AND ROLE MANAGEMENT FIXES

## Issue Summary
Multiple issues were identified and fixed:

1. **VKYC Completion Error**: 
   ```
   Invalid value for argument `kyc_type`. Expected KycType.
   ```
   - Database schema uses enum values `REGULAR` and `PROFESSIONAL` for `KycType`
   - Application was trying to pass string values like `"basic"` and `"standard"`

2. **Role Management Issues**:
   - Frontend sending lowercase role values (`"barrister"`) but backend expecting uppercase (`"BARRISTER"`)
   - Users always getting `REGULAR_USER` role regardless of selection during registration
   - Government officials not being properly handled in VKYC flow
   - Role validation failing on profile updates

3. **Address Update Issue**:
   - Profile updates not properly handling address field changes

## Fixes Applied

### 1. Fixed VKYC Completion Route (`/app/api/vkyc/complete/route.ts`)
- Added role-based KYC type determination
- Map user roles to correct enum values:
  - `REGULAR_USER` → `REGULAR` KYC type
  - `BARRISTER`, `LAWYER`, `GOVERNMENT_OFFICIAL` → `PROFESSIONAL` KYC type
- Remove dependency on frontend-passed `kycType` parameter
- Use proper enum values when creating VkycDocument records

### 2. Fixed VKYC Update Route (`/app/api/vkyc/update/route.ts`)
- Applied same role-based KYC type determination logic
- Use correct enum values for document creation

### 3. Fixed Role Validation in Profile Routes
**Updated routes**: `/app/api/profile/[id]/route.ts` and `/app/api/user/profile/route.ts`
- Added role mapping to handle both lowercase and uppercase role values:
  ```typescript
  const roleMapping: { [key: string]: string } = {
      'regular_user': 'REGULAR_USER',
      'barrister': 'BARRISTER', 
      'lawyer': 'LAWYER',
      'government_official': 'GOVERNMENT_OFFICIAL'
  };
  ```
- Convert lowercase roles to uppercase before validation
- Profile updates now work with frontend-sent lowercase values

### 4. Fixed Registration Route (`/app/api/auth/register/route.ts`)
- Added role mapping to handle lowercase role values from frontend
- Proper TypeScript typing for UserRole enum
- Users can now register with any role successfully

### 5. Fixed Frontend Components Role Checking
**Updated components**:
- `/components/function/PublishReport.tsx`: Use uppercase role values for access control
- `/components/layout/Navbar.tsx`: Use uppercase role values for navigation items
- `/components/function/VKYC.tsx`: Already using correct uppercase values

### 6. Fixed VKYC Frontend Component (`/components/function/VKYC.tsx`)
- Removed deprecated `kycType` parameter from API calls (backend now determines this)
- The component correctly identifies all professional roles for full KYC flow

## Role-Based VKYC Flow

### Regular Users (`REGULAR_USER`)
- Uses `REGULAR` KYC type
- Basic verification form  
- Fewer document requirements

### Professional Users (`BARRISTER`, `LAWYER`, `GOVERNMENT_OFFICIAL`)
- Uses `PROFESSIONAL` KYC type
- Full verification form
- Additional document requirements 
- Government officials now properly use professional KYC flow

## Frontend-Backend Role Mapping

The application now handles role values seamlessly:

**Frontend Forms Send**: `"barrister"`, `"lawyer"`, `"government_official"`, `"regular_user"`
**Backend Converts To**: `"BARRISTER"`, `"LAWYER"`, `"GOVERNMENT_OFFICIAL"`, `"REGULAR_USER"`
**Database Stores**: Uppercase enum values

## Database Schema Reference
```prisma
enum UserRole {
  REGULAR_USER
  BARRISTER
  LAWYER  
  GOVERNMENT_OFFICIAL
}

enum KycType {
  REGULAR
  PROFESSIONAL
}
```

## Testing Status
- ✅ Build successful
- ✅ Development server starts  
- ✅ Enum validation fixed
- ✅ Government officials now use professional KYC
- ✅ Role updates work with lowercase frontend values
- ✅ Registration sets correct role from frontend selection
- ✅ Address updates properly handled in profile routes
- ✅ All professional roles can access restricted features
