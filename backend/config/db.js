const mysql = require('mysql');
require('dotenv').config();

const pool = mysql.createPool({
  connectionLimit: Number(process.env.DB_POOL_SIZE || 10),
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'etera_health',
  timezone: 'Z'
});

const logConnectionInfo = () => {
  console.log('Connected to MySQL database');
  console.log('Database Host:', process.env.DB_HOST || 'localhost');
  console.log('Database User:', process.env.DB_USER || 'root');
  console.log('Database Name:', process.env.DB_NAME || 'etera_health');
};

const logConnectionError = (err) => {
  console.error('DATABASE CONNECTION FAILED');
  console.error('Error Code:', err.code);
  console.error('Error Message:', err.message);
  console.error('Trying to connect to:');
  console.error('  Host:', process.env.DB_HOST || 'localhost');
  console.error('  User:', process.env.DB_USER || 'root');
  console.error('  Database:', process.env.DB_NAME || 'etera_health');
  if (err.stack) {
    console.error('Full Error Stack:', err.stack);
  }
};

// Test a single connection at startup for clearer diagnostics
pool.getConnection((err, connection) => {
  if (err) {
    logConnectionError(err);
    return;
  }
  logConnectionInfo();
  connection.release();
});

// Handle errors on individual pooled connections
pool.on('connection', (connection) => {
  connection.on('error', (err) => {
    console.error('DATABASE CONNECTION ERROR:', err.code || err.message);
  });
});

module.exports = pool;
