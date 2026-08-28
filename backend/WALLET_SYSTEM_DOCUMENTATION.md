# LUMINTERN Digital Wallet & Ledger System

## Overview

The LUMINTERN Wallet System provides secure financial tracking for Freshers, including earnings, pending escrow clearances, and withdrawal management.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    WALLET SYSTEM ARCHITECTURE                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐      ┌──────────────┐      ┌──────────────┐  │
│  │   FRESHER    │      │   WALLET     │      │   ESCROW     │  │
│  │  DASHBOARD   │◄────►│   ENGINE     │◄────►│   SYSTEM     │  │
│  └──────────────┘      └──────────────┘      └──────────────┘  │
│         │                     │                     │          │
│         │                     │                     │          │
│         ▼                     ▼                     ▼          │
│  ┌──────────────┐      ┌──────────────┐      ┌──────────────┐  │
│  │  REST API    │      │  TRANSACTION │      │   MONGODB    │  │
│  │  Endpoints   │◄────►│   LEDGER     │◄────►│   Store      │  │
│  └──────────────┘      └──────────────┘      └──────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📦 Database Models

### Wallet Schema
```javascript
{
  user: ObjectId,           // Reference to Fresher User
  balance: Number,          // Available balance (default: 0)
  escrowBalance: Number,    // Funds held in escrow (default: 0)
  totalEarnings: Number,    // Lifetime earnings
  totalSpent: Number,       // Lifetime spending (for businesses)
  transactions: [{          // Embedded transaction history
    type: String,
    amount: Number,
    description: String,
    relatedTask: ObjectId,
    status: String,
    metadata: Object,
    createdAt: Date
  }],
  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

### TransactionLedger Schema
```javascript
{
  walletId: ObjectId,       // Reference to Wallet
  userId: ObjectId,         // Reference to User
  taskId: ObjectId,         // Reference to Task (optional)
  type: String,             // Transaction type
  amount: Number,           // Transaction amount
  status: String,           // Transaction status
  transactionHash: String,  // Unique identifier
  description: String,
  metadata: Object,
  balanceBefore: Number,    // Balance snapshot
  balanceAfter: Number,     // Balance snapshot
  processedAt: Date,
  processedBy: ObjectId,
  failureReason: String,
  createdAt: Date,
  updatedAt: Date
}
```

---

## 💰 Transaction Types

| Type | Description | Used By |
|------|-------------|---------|
| `escrow_hold` | Funds moved to escrow | Business |
| `escrow_release` | Funds released from escrow | Fresher |
| `escrow_refund` | Funds refunded from escrow | Business |
| `withdrawal` | Cash withdrawal request | Fresher |
| `deposit` | Add funds to wallet | Business |
| `admin_fee` | Platform fee deduction | System |
| `bonus` | Bonus payment | Admin |

---

## 🔐 Security Features

### Atomic Operations
All balance updates use MongoDB atomic operations:

```javascript
// ❌ UNSAFE - Race condition possible
wallet.balance += amount;
await wallet.save();

// ✅ SAFE - Atomic operation
await Wallet.findByIdAndUpdate(walletId, {
  $inc: { balance: amount }
});
```

### Balance Snapshots
Every transaction records balance before and after:

```javascript
{
  balanceBefore: 1000,
  amount: 250,
  balanceAfter: 1250
}
```

### Transaction Hashes
Unique identifiers for audit trail:

```javascript
transactionHash: "TXN-M1A2B3C4-D5E6F7"
```

---

## 📡 REST API Endpoints

### Balance

#### GET /api/wallet/balance
Get current wallet balance.

**Response:**
```json
{
  "status": "success",
  "data": {
    "wallet": {
      "_id": "wallet_id",
      "balance": 1250.00,
      "pendingEscrow": 500.00,
      "totalEarnings": 3500.00,
      "totalSpent": 0,
      "lastUpdated": "2024-01-15T10:30:00.000Z"
    }
  }
}
```

---

### Transaction Ledger

#### GET /api/wallet/ledger
Get transaction history with filters.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| type | string | Filter by type |
| status | string | Filter by status |
| page | number | Page number (default: 1) |
| limit | number | Items per page (default: 20) |

**Response:**
```json
{
  "status": "success",
  "results": 20,
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "pages": 3
  },
  "data": {
    "transactions": [...],
    "summary": {
      "escrowHold": { "total": 500, "count": 2 },
      "escrowRelease": { "total": 3500, "count": 15 },
      "withdrawal": { "total": 2000, "count": 4 },
      "refund": { "total": 0, "count": 0 }
    }
  }
}
```

---

### Add Funds

#### POST /api/wallet/add-funds
Add funds to wallet (Business only).

**Request Body:**
```json
{
  "amount": 500,
  "paymentMethod": "credit_card",
  "transactionReference": "PAY-123456"
}
```

**Response:**
```json
{
  "status": "success",
  "message": "$500 added to wallet successfully",
  "data": {
    "wallet": {
      "balance": 1500.00,
      "pendingEscrow": 0
    }
  }
}
```

**Validation:**
- Minimum: $10
- Maximum: $10,000 per transaction

---

### Request Withdrawal

#### POST /api/wallet/withdraw
Request a withdrawal (Fresher only).

**Request Body:**
```json
{
  "amount": 500,
  "withdrawalMethod": "bank_transfer",
  "accountDetails": {
    "bankName": "Chase",
    "accountNumber": "****1234",
    "routingNumber": "021000021"
  }
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Withdrawal of $500 requested successfully",
  "data": {
    "wallet": {
      "balance": 750.00,
      "pendingEscrow": 500.00
    },
    "withdrawal": {
      "amount": 500,
      "method": "bank_transfer",
      "status": "pending",
      "estimatedProcessing": "3-5 business days"
    }
  }
}
```

**Validation:**
- Minimum: $50
- Must have sufficient balance

---

### Wallet Statistics

#### GET /api/wallet/stats
Get wallet statistics and recent transactions.

**Response:**
```json
{
  "status": "success",
  "data": {
    "wallet": {
      "balance": 1250.00,
      "pendingEscrow": 500.00,
      "totalEarnings": 3500.00,
      "totalSpent": 0
    },
    "monthlyStats": {
      "earnings": { "total": 1500, "count": 6 },
      "withdrawals": { "total": 500, "count": 1 },
      "deposits": { "total": 0, "count": 0 }
    },
    "recentTransactions": [...]
  }
}
```

---

### Transaction Details

#### GET /api/wallet/transaction/:transactionId
Get detailed transaction information.

**Response:**
```json
{
  "status": "success",
  "data": {
    "transaction": {
      "_id": "txn_id",
      "transactionHash": "TXN-M1A2B3C4-D5E6F7",
      "type": "escrow_release",
      "amount": 250,
      "status": "completed",
      "description": "Payment for task: Build Website",
      "taskId": {
        "_id": "task_id",
        "title": "Build Website",
        "workScale": "small",
        "budget": 250
      },
      "balanceBefore": 1000,
      "balanceAfter": 1250,
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  }
}
```

---

## 💻 Client Integration

### React Component Example

```jsx
import { useState, useEffect } from 'react';

function WalletDashboard() {
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWalletData();
  }, []);

  const fetchWalletData = async () => {
    try {
      const [balanceRes, ledgerRes] = await Promise.all([
        fetch('/api/wallet/balance', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/wallet/ledger?page=1&limit=10', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      const balanceData = await balanceRes.json();
      const ledgerData = await ledgerRes.json();

      setWallet(balanceData.data.wallet);
      setTransactions(ledgerData.data.transactions);
    } catch (error) {
      console.error('Error fetching wallet:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async (amount) => {
    try {
      const response = await fetch('/api/wallet/withdraw', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount,
          withdrawalMethod: 'bank_transfer',
          accountDetails: { /* ... */ }
        })
      });

      const data = await response.json();
      if (data.status === 'success') {
        setWallet(data.data.wallet);
        alert('Withdrawal requested successfully!');
      }
    } catch (error) {
      console.error('Withdrawal error:', error);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="wallet-dashboard">
      <div className="balance-card">
        <h2>Available Balance</h2>
        <p className="amount">${wallet.balance.toFixed(2)}</p>
        <p className="escrow">Pending in Escrow: ${wallet.pendingEscrow.toFixed(2)}</p>
      </div>

      <div className="stats">
        <div className="stat">
          <span>Total Earnings</span>
          <span>${wallet.totalEarnings.toFixed(2)}</span>
        </div>
      </div>

      <button onClick={() => handleWithdraw(500)}>
        Request Withdrawal
      </button>

      <div className="transactions">
        <h3>Recent Transactions</h3>
        {transactions.map(txn => (
          <div key={txn._id} className="transaction">
            <span>{txn.type}</span>
            <span>${txn.amount}</span>
            <span>{txn.status}</span>
            <span>{new Date(txn.createdAt).toLocaleDateString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## 🔄 Transaction Flow

### Earning Flow
```
1. Business funds task → escrow_hold
2. Fresher completes work → status: review
3. Business approves → escrow_release
4. Funds added to fresher balance
```

### Withdrawal Flow
```
1. Fresher requests withdrawal → withdrawal (pending)
2. Balance deducted immediately
3. Admin processes withdrawal → withdrawal (completed)
4. Funds transferred to bank
```

### Refund Flow
```
1. Business disputes task → status: disputed
2. Admin resolves → escrow_refund
3. Funds returned to business balance
```

---

## 📊 Database Indexes

### Wallet
- `user` (unique)
- `transactions.relatedTask`
- `transactions.createdAt`

### TransactionLedger
- `walletId`
- `userId`
- `taskId`
- `type`
- `status`
- `createdAt`
- Compound: `userId + type`
- Compound: `userId + status`
- Compound: `userId + createdAt`

---

## 🚨 Error Handling

### Insufficient Balance
```json
{
  "status": "error",
  "message": "Insufficient balance. Available: $750"
}
```

### Invalid Amount
```json
{
  "status": "error",
  "message": "Minimum withdrawal amount is $50"
}
```

### Transaction Not Found
```json
{
  "status": "error",
  "message": "Transaction not found"
}
```

---

## 🧪 Testing

### Test Add Funds
```bash
curl -X POST http://localhost:5000/api/wallet/add-funds \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"amount": 500, "paymentMethod": "test"}'
```

### Test Get Balance
```bash
curl http://localhost:5000/api/wallet/balance \
  -H "Authorization: Bearer TOKEN"
```

### Test Withdrawal
```bash
curl -X POST http://localhost:5000/api/wallet/withdraw \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"amount": 100, "withdrawalMethod": "bank_transfer"}'
```

---

## 📈 Scaling Considerations

### Current Implementation
- ✅ Atomic MongoDB operations
- ✅ Transaction history embedded in wallet
- ✅ Separate ledger for audit

### Production Enhancements
1. **Redis Caching**
   - Cache balance for frequent reads
   - Invalidate on write

2. **Database Sharding**
   - Shard by userId
   - Distribute load

3. **Event Sourcing**
   - Append-only transaction log
   - Rebuild state from events

4. **Queue Processing**
   - Async withdrawal processing
   - Retry failed transactions

---

## 📞 Support

For wallet-related issues:
- **Email:** payments@lumintern.com
- **Response Time:** 24 hours
- **Dispute Resolution:** 48-72 hours