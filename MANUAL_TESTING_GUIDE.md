# 🧪 Manual Testing Guide - DynamoDB Persistence

## Quick Test (2 minutes)

### Test 1: Submit an Order

1. **Open the app:** http://localhost:3001
2. **Fill in the order form:**
   - Order ID: `MANUAL-TEST-001`
   - Customer Name: Your name
   - Email: your email
   - Priority: High
   - Add at least one item
3. **Click "Submit Order"**
4. **Expected:** ✅ Green notification "Order submitted successfully"

### Test 2: Verify Page Refresh Persistence

1. **Refresh the page** (F5 or Ctrl+R)
2. **Expected:** ✅ Your order `MANUAL-TEST-001` is still there!
3. **Before (localStorage):** ❌ Order would disappear
4. **Now (DynamoDB):** ✅ Order persists!

### Test 3: Open in Different Browser

1. **Open the app in a different browser** (Chrome, Firefox, Edge)
2. **Navigate to:** http://localhost:3001
3. **Expected:** ✅ Your order `MANUAL-TEST-001` appears!
4. **This proves:** Data is in the cloud, not just browser storage

---

## Detailed Test Scenarios

### Scenario A: Multiple Orders

1. Submit 3-5 orders with different priorities
2. Refresh the page
3. ✅ All orders should be visible
4. ✅ Analytics should show correct metrics
5. ✅ Heat map should display order patterns

### Scenario B: Order Analytics

1. Submit orders at different times
2. Check the "Advanced Analytics" view
3. ✅ Revenue trend chart shows data
4. ✅ Order volume chart displays correctly
5. ✅ Priority distribution shows your orders
6. ✅ Heat map shows time-based patterns

### Scenario C: Export/Import

1. **Export orders as CSV**
   - Click "Export" button
   - ✅ CSV file downloads with all orders
2. **Clear browser data** (Ctrl+Shift+Delete)
3. **Refresh page**
   - ✅ Orders still appear (from DynamoDB!)
4. **Import CSV**
   - Click "Import" button
   - Upload the CSV file
   - ✅ Orders load successfully

### Scenario D: Cross-Device Test

1. **Submit order on Device 1** (e.g., your PC)
2. **Open app on Device 2** (e.g., your phone)
3. ✅ Order appears on Device 2
4. **This was impossible with localStorage!**

---

## What to Look For

### ✅ Success Indicators

- Orders persist after page refresh
- Orders visible in different browsers
- Green "Order submitted successfully" notifications
- Analytics charts populate with real data
- No console errors (F12 → Console tab)

### ❌ Failure Indicators

- Orders disappear after refresh → Check API connectivity
- Console errors about fetch() → Check API URL
- "Failed to load orders from database" → Check Lambda logs
- Empty analytics → Verify orders are being saved

---

## Troubleshooting

### Orders Not Persisting?

1. **Check browser console** (F12)
   - Look for API errors
   - Verify API URL matches deployed endpoint
2. **Check AWS Console:**
   - DynamoDB → Tables → `FirstSqsStack-orders`
   - Should see items in table
3. **Check Lambda logs:**
   - CloudWatch → Log Groups → `/aws/lambda/FirstSqsStack-consumer`
   - Look for "Order saved to DynamoDB" messages

### API Errors?

1. **Verify API Gateway endpoint:**
   ```bash
   https://u62q7jktce.execute-api.us-east-2.amazonaws.com/prod/orders
   ```
2. **Check CORS settings:**
   - Should allow requests from localhost:3001
3. **Test with curl:**
   ```bash
   curl https://u62q7jktce.execute-api.us-east-2.amazonaws.com/prod/orders
   ```

### No Data in DynamoDB?

1. **Check SQS queue:**
   - AWS Console → SQS → `FirstSqsStack-orders-queue`
   - Messages should be processed (not stuck)
2. **Check consumer Lambda:**
   - Should have DynamoDB write permissions
   - Should have `TABLE_NAME` environment variable set

---

## Quick Verification Commands

### Check DynamoDB has data:

```bash
aws dynamodb scan --table-name FirstSqsStack-orders --region us-east-2 --max-items 5
```

### Check API is accessible:

```bash
curl https://u62q7jktce.execute-api.us-east-2.amazonaws.com/prod/orders
```

### Submit test order via API:

```bash
curl -X POST https://u62q7jktce.execute-api.us-east-2.amazonaws.com/prod/orders \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "CLI-TEST-001",
    "customerName": "CLI Test",
    "customerEmail": "cli@test.com",
    "priority": "medium",
    "status": "submitted",
    "orderValue": 99.99,
    "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%S.000Z)'",
    "items": [{"id":"1","name":"Test Item","quantity":1,"price":99.99}]
  }'
```

---

## Expected Results Summary

| Test                | Before (localStorage) | After (DynamoDB)           |
| ------------------- | --------------------- | -------------------------- |
| Page Refresh        | ❌ Data lost          | ✅ Data persists           |
| Different Browser   | ❌ No data            | ✅ Data available          |
| Different Device    | ❌ Impossible         | ✅ Works perfectly         |
| After Browser Clear | ❌ Data lost          | ✅ Data persists           |
| Team Collaboration  | ❌ Can't share        | ✅ Everyone sees same data |

---

## Performance Notes

- **Initial Load:** ~1-2 seconds (fetches from DynamoDB)
- **Submit Order:** ~2-3 seconds (SQS → Lambda → DynamoDB)
- **Refresh Orders:** ~1 second (GET from API)
- **Analytics Update:** Real-time (based on loaded data)

---

## 🎉 If All Tests Pass

**Congratulations!** Your order management system now has:

- ✅ Production-grade database persistence
- ✅ Cloud-based data storage
- ✅ Multi-device accessibility
- ✅ No data loss on refresh
- ✅ Scalable architecture

You can now confidently use this system for real orders!

---

## Next Steps (Optional Enhancements)

1. **Add Authentication** (AWS Cognito)
2. **Add Email Notifications** (AWS SES)
3. **Add Real-time Updates** (WebSockets)
4. **Add Advanced Filtering** (Query by date, status, etc.)
5. **Add Pagination** (Handle thousands of orders)
6. **Add Order Editing** (Update order status)
7. **Add Customer Portal** (Let customers track their orders)

---

**Happy Testing! 🚀**
