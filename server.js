const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
app.use(express.json());
app.use(cors());

const JWT_SECRET = 'sbi_secret_key_2024';

// ============================================================
// MOCK DATABASE (In-memory)
// ============================================================

const users = [
  {
    id: 1,
    name: 'Rahul Sharma',
    username: 'rahul123',
    password: bcrypt.hashSync('password123', 10),
    email: 'rahul@example.com',
    phone: '9876543210',
    accounts: ['SBI001234567890'],
  },
  {
    id: 2,
    name: 'Priya Singh',
    username: 'priya456',
    password: bcrypt.hashSync('password456', 10),
    email: 'priya@example.com',
    phone: '9123456789',
    accounts: ['SBI009876543210'],
  },
];

const accounts = [
  {
    accountNumber: 'SBI001234567890',
    userId: 1,
    type: 'Savings',
    balance: 125000.50,
    ifsc: 'SBIN0001234',
    branch: 'Mumbai Main Branch',
    status: 'Active',
  },
  {
    accountNumber: 'SBI009876543210',
    userId: 2,
    type: 'Current',
    balance: 350000.00,
    ifsc: 'SBIN0009876',
    branch: 'Delhi Central Branch',
    status: 'Active',
  },
];

const transactions = [
  {
    id: 'TXN001',
    accountNumber: 'SBI001234567890',
    type: 'Credit',
    amount: 50000,
    description: 'Salary Credit',
    date: '2026-04-01',
    balance: 125000.50,
  },
  {
    id: 'TXN002',
    accountNumber: 'SBI001234567890',
    type: 'Debit',
    amount: 5000,
    description: 'ATM Withdrawal',
    date: '2026-04-02',
    balance: 120000.50,
  },
  {
    id: 'TXN003',
    accountNumber: 'SBI001234567890',
    type: 'Debit',
    amount: 2000,
    description: 'Online Shopping',
    date: '2026-04-03',
    balance: 118000.50,
  },
  {
    id: 'TXN004',
    accountNumber: 'SBI009876543210',
    type: 'Credit',
    amount: 100000,
    description: 'Business Income',
    date: '2026-04-01',
    balance: 350000.00,
  },
];

const loans = [
  {
    id: 'LOAN001',
    userId: 1,
    type: 'Home Loan',
    amount: 2500000,
    interestRate: 8.5,
    tenure: 240, // months
    emi: 21866,
    status: 'Active',
    startDate: '2023-01-01',
  },
];

const fixedDeposits = [
  {
    id: 'FD001',
    userId: 1,
    amount: 100000,
    interestRate: 7.1,
    tenure: 12, // months
    maturityAmount: 107100,
    startDate: '2025-04-01',
    maturityDate: '2026-04-01',
    status: 'Active',
  },
];

// ============================================================
// MIDDLEWARE: Auth Token Verify
// ============================================================

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ success: false, message: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ success: false, message: 'Invalid or expired token' });
    req.user = user;
    next();
  });
}

// ============================================================
// ROUTES
// ============================================================

// Root
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to SBI Banking API',
    version: '1.0.0',
    endpoints: {
      auth: ['/api/auth/login', '/api/auth/logout'],
      account: ['/api/account/details', '/api/account/balance', '/api/account/statement'],
      transfer: ['/api/transfer/fund'],
      loans: ['/api/loans', '/api/loans/emi-calculator'],
      deposits: ['/api/deposits/fixed'],
      user: ['/api/user/profile'],
    },
  });
});

// ─────────────────────────────────────────
// AUTH ROUTES
// ─────────────────────────────────────────

// POST /api/auth/login
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Username and password required' });
  }

  const user = users.find((u) => u.username === username);
  if (!user) {
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  }

  const isMatch = bcrypt.compareSync(password, user.password);
  if (!isMatch) {
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  }

  const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, {
    expiresIn: '1h',
  });

  res.json({
    success: true,
    message: 'Login successful',
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
    },
  });
});

// POST /api/auth/logout
app.post('/api/auth/logout', authenticateToken, (req, res) => {
  res.json({ success: true, message: 'Logged out successfully' });
});

// ─────────────────────────────────────────
// USER ROUTES
// ─────────────────────────────────────────

// GET /api/user/profile
app.get('/api/user/profile', authenticateToken, (req, res) => {
  const user = users.find((u) => u.id === req.user.id);
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });

  res.json({
    success: true,
    data: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      accounts: user.accounts,
    },
  });
});

// ─────────────────────────────────────────
// ACCOUNT ROUTES
// ─────────────────────────────────────────

// GET /api/account/details
app.get('/api/account/details', authenticateToken, (req, res) => {
  const userAccounts = accounts.filter((a) => a.userId === req.user.id);
  if (!userAccounts.length) {
    return res.status(404).json({ success: false, message: 'No accounts found' });
  }
  res.json({ success: true, data: userAccounts });
});

// GET /api/account/balance?accountNumber=SBI001234567890
app.get('/api/account/balance', authenticateToken, (req, res) => {
  const { accountNumber } = req.query;
  const account = accounts.find(
    (a) => a.accountNumber === accountNumber && a.userId === req.user.id
  );
  if (!account) {
    return res.status(404).json({ success: false, message: 'Account not found' });
  }
  res.json({
    success: true,
    data: {
      accountNumber: account.accountNumber,
      balance: account.balance,
      type: account.type,
      status: account.status,
    },
  });
});

// GET /api/account/statement?accountNumber=SBI001234567890
app.get('/api/account/statement', authenticateToken, (req, res) => {
  const { accountNumber, fromDate, toDate } = req.query;

  const account = accounts.find(
    (a) => a.accountNumber === accountNumber && a.userId === req.user.id
  );
  if (!account) {
    return res.status(404).json({ success: false, message: 'Account not found' });
  }

  let txns = transactions.filter((t) => t.accountNumber === accountNumber);

  if (fromDate) txns = txns.filter((t) => t.date >= fromDate);
  if (toDate) txns = txns.filter((t) => t.date <= toDate);

  res.json({ success: true, data: txns });
});

// ─────────────────────────────────────────
// FUND TRANSFER
// ─────────────────────────────────────────

// POST /api/transfer/fund
app.post('/api/transfer/fund', authenticateToken, (req, res) => {
  const { fromAccount, toAccount, amount, remarks } = req.body;

  if (!fromAccount || !toAccount || !amount) {
    return res.status(400).json({ success: false, message: 'fromAccount, toAccount, amount required' });
  }

  if (amount <= 0) {
    return res.status(400).json({ success: false, message: 'Amount must be greater than 0' });
  }

  const sender = accounts.find(
    (a) => a.accountNumber === fromAccount && a.userId === req.user.id
  );
  if (!sender) {
    return res.status(404).json({ success: false, message: 'Sender account not found' });
  }

  if (sender.balance < amount) {
    return res.status(400).json({ success: false, message: 'Insufficient balance' });
  }

  const receiver = accounts.find((a) => a.accountNumber === toAccount);
  if (!receiver) {
    return res.status(404).json({ success: false, message: 'Receiver account not found' });
  }

  // Perform transfer
  sender.balance -= amount;
  receiver.balance += amount;

  const txnId = 'TXN' + Date.now();
  const date = new Date().toISOString().split('T')[0];

  transactions.push({
    id: txnId,
    accountNumber: fromAccount,
    type: 'Debit',
    amount,
    description: remarks || 'Fund Transfer',
    date,
    balance: sender.balance,
  });

  transactions.push({
    id: txnId + '_CR',
    accountNumber: toAccount,
    type: 'Credit',
    amount,
    description: remarks || 'Fund Transfer Received',
    date,
    balance: receiver.balance,
  });

  res.json({
    success: true,
    message: 'Transfer successful',
    data: {
      transactionId: txnId,
      amount,
      from: fromAccount,
      to: toAccount,
      newBalance: sender.balance,
      date,
    },
  });
});

// ─────────────────────────────────────────
// LOANS
// ─────────────────────────────────────────

// GET /api/loans
app.get('/api/loans', authenticateToken, (req, res) => {
  const userLoans = loans.filter((l) => l.userId === req.user.id);
  res.json({ success: true, data: userLoans });
});

// GET /api/loans/emi-calculator?amount=1000000&rate=8.5&tenure=240
app.get('/api/loans/emi-calculator', (req, res) => {
  const { amount, rate, tenure } = req.query;

  if (!amount || !rate || !tenure) {
    return res.status(400).json({ success: false, message: 'amount, rate, tenure required' });
  }

  const P = parseFloat(amount);
  const R = parseFloat(rate) / 12 / 100;
  const N = parseInt(tenure);

  const emi = (P * R * Math.pow(1 + R, N)) / (Math.pow(1 + R, N) - 1);
  const totalPayment = emi * N;
  const totalInterest = totalPayment - P;

  res.json({
    success: true,
    data: {
      principal: P,
      annualRate: parseFloat(rate),
      tenureMonths: N,
      emi: Math.round(emi),
      totalPayment: Math.round(totalPayment),
      totalInterest: Math.round(totalInterest),
    },
  });
});

// ─────────────────────────────────────────
// FIXED DEPOSITS
// ─────────────────────────────────────────

// GET /api/deposits/fixed
app.get('/api/deposits/fixed', authenticateToken, (req, res) => {
  const userFDs = fixedDeposits.filter((fd) => fd.userId === req.user.id);
  res.json({ success: true, data: userFDs });
});

// POST /api/deposits/fixed/calculator
app.post('/api/deposits/fixed/calculator', (req, res) => {
  const { amount, rate, tenureMonths } = req.body;

  if (!amount || !rate || !tenureMonths) {
    return res.status(400).json({ success: false, message: 'amount, rate, tenureMonths required' });
  }

  const P = parseFloat(amount);
  const R = parseFloat(rate) / 100;
  const T = parseInt(tenureMonths) / 12;

  // Compound quarterly
  const maturity = P * Math.pow(1 + R / 4, 4 * T);
  const interest = maturity - P;

  res.json({
    success: true,
    data: {
      principal: P,
      annualRate: parseFloat(rate),
      tenureMonths: parseInt(tenureMonths),
      maturityAmount: Math.round(maturity),
      interestEarned: Math.round(interest),
    },
  });
});

// ─────────────────────────────────────────
// 404 Handler
// ─────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// ─────────────────────────────────────────
// START SERVER
// ─────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`SBI Backend Server running on http://localhost:${PORT}`);
});

module.exports = app;
