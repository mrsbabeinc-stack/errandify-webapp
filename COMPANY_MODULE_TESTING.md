# Company Module Testing Guide

## Quick Start

### 1. Seed Demo Company (One-Time Setup)

Before testing the UI, seed a demo company with sample data:

```bash
curl -X POST http://localhost:3000/api/demo/seed \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -H "Content-Type: application/json"
```

**Response:**
```json
{
  "success": true,
  "message": "Demo company seeded successfully",
  "data": {
    "company_id": 1,
    "owner_id": 123,
    "owner_email": "john.lim@rumahemas.sg",
    "company_name": "Rumah Emas Demo Company",
    "employees_count": 3,
    "employee_details": [
      { "name": "Sarah Wong", "email": "sarah.wong@rumahemas.sg", "phone": "+6587654321", "role": "manager", "skills": "Cleaning, Customer Service, Coordination" },
      { "name": "Priya Kumar", "email": "priya.kumar@rumahemas.sg", "phone": "+6581112222", "role": "employee", "skills": "Delivery, Packing, Inventory" },
      { "name": "Ahmad Hassan", "email": "ahmad.hassan@rumahemas.sg", "phone": "+6583334444", "role": "employee", "skills": "Customer Support, Troubleshooting" }
    ],
    "wallet_balance": 500.00,
    "subscription_tier": "silver"
  }
}
```

### 2. Test Frontend Pages

After seeding demo data, the demo owner can login and test these pages:

#### 2.1 Company Dashboard
```
URL: http://localhost:5173/company/dashboard
```
- Shows quick stats: Active Employees (3), Active Errands, Completed Errands, Wallet Balance ($500)
- Quick action buttons: Post Errand, Manage Staff, Leave Requests, Wallet & Payouts
- Subscription tier display (Silver tier)

#### 2.2 Staff Management
```
URL: http://localhost:5173/company/staff
```
- Lists all 3 demo employees in a table
- Shows: Name, Email, Role (Manager/Employee), Status (Active), Skills
- Add employee form (single)
- Bulk CSV import form (format: Name|Email|Phone|Role|Skills)
- Remove employee button per row

#### 2.3 Company Registration
```
URL: http://localhost:5173/company/register
```
- Form to create new company (UEN, name, email, phone, address)
- Creates company with Silver tier subscription
- Auto-creates wallet and subscription record

---

## Demo Account Credentials

After running the demo seed endpoint, use these credentials to login:

**Owner Account (for company management):**
- Email: john.lim@rumahemas.sg
- Phone: +6581234567
- Name: John Lim
- Role: Owner (will have access to company dashboard)

**Employee Accounts (for testing acceptance/bidding):**
1. Sarah Wong
   - Email: sarah.wong@rumahemas.sg
   - Phone: +6587654321
   - Role: Manager

2. Priya Kumar
   - Email: priya.kumar@rumahemas.sg
   - Phone: +6581112222
   - Role: Employee

3. Ahmad Hassan
   - Email: ahmad.hassan@rumahemas.sg
   - Phone: "+6583334444"
   - Role: Employee

---

## API Endpoints Reference

### Company Management
```
POST   /api/companies                    - Create new company
GET    /api/companies/:companyId         - Get company details
GET    /api/companies/user/my-company    - Get logged-in user's company
PUT    /api/companies/:companyId         - Update company info
```

### Employee Management
```
POST   /api/companies/:companyId/employees                  - Add single employee
GET    /api/companies/:companyId/employees                  - List employees
DELETE /api/companies/:companyId/employees/:userId          - Remove employee
POST   /api/companies/:companyId/employees/bulk-import      - Bulk CSV import
```

### Leave Management
```
POST   /api/companies/:companyId/leaves          - Request leave
GET    /api/companies/:companyId/leaves          - List leave requests
PUT    /api/companies/leaves/:leaveId/approve    - Approve/deny leave
```

### Demo
```
POST   /api/demo/seed                            - Seed demo company data
```

---

## Testing Workflows

### Workflow 1: Register New Company
1. Login as any user
2. Navigate to `/company/register`
3. Fill in company details (UEN, name, email, phone, address)
4. Submit form
5. Should be redirected to `/company/dashboard` with new company data

### Workflow 2: View Dashboard
1. Login as company owner
2. Navigate to `/company/dashboard`
3. Should see stats: employees, errands, wallet balance
4. Click "Manage Staff" → goes to `/company/staff`

### Workflow 3: Manage Staff
1. Login as company owner
2. Navigate to `/company/staff`
3. See list of 3 demo employees (demo seeded data)
4. Test "Add Employee" form:
   - Enter user ID, role, skills
   - Click "Add Employee"
5. Test "Bulk Import CSV":
   - Sample format: `Name|Email|Phone|Role|Skills`
   - Upload CSV file
6. Click "Remove" on any employee

### Workflow 4: Request Leave
1. As an employee, navigate to leave request form (future)
2. Select dates and leave type (paid/unpaid)
3. Submit leave request
4. As manager, navigate to `/company/leaves` (future)
5. Approve or deny leave request

---

## Known Limitations (Phase 1)

- ❌ Errand posting UI not yet built (backend ready)
- ❌ Offer/bidding UI not yet built (backend ready)
- ❌ Allocation workflow UI not yet built (backend ready)
- ❌ Three-way chat not yet built (backend ready)
- ❌ Real-time notifications not yet built (backend ready)
- ❌ Leave calendar UI not yet built (backend ready)
- ❌ Wallet payout scheduling not yet built (backend ready)

These will be completed in Phase 2.

---

## Troubleshooting

### Demo seed fails with "Company not found"
- Check that auth token is valid
- Ensure backend is running (`npm run dev` in backend folder)
- Check database connection

### Dashboard shows "Company not found"
- Verify you're logged in as the owner
- Check that demo seed was successful
- Try logging in with the demo owner email

### Employees not showing
- Verify `/company/staff` is fetching from the correct company
- Check network tab for 404 errors
- Ensure demo employees were seeded successfully

---

## Next Steps

### Phase 2 (Planned)
- [ ] Errand posting UI
- [ ] Employee offer/bidding UI
- [ ] Manager allocation workflow
- [ ] Leave calendar
- [ ] Wallet payout scheduling
- [ ] Three-way chat UI
- [ ] Real-time notifications

