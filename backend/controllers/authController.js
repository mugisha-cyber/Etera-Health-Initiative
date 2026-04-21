const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

const query = (sql, params) =>
  new Promise((resolve, reject) => {
    db.query(sql, params, (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });

const signToken = (user) =>
  jwt.sign(
    { id: user.id, email: user.email, username: user.username },
    process.env.JWT_SECRET || 'your_super_secret_jwt_key_change_this_in_production_12345678!',
    { expiresIn: process.env.JWT_EXPIRY || process.env.JWT_EXPIRE || '7d' }
  );

// Register user
exports.register = async (req, res) => {
  try {
    const { username, email, password, fullName } = req.body || {};

    if (!username || !email || !password) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }

    const existing = await query('SELECT id FROM users WHERE email = ? OR username = ?', [
      email,
      username
    ]);

    if (existing.length > 0) {
      return res.status(400).json({ message: 'Email or username already in use' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await query(
      'INSERT INTO users (username, email, password, full_name, role, subscribed) VALUES (?, ?, ?, ?, ?, ?)',
      [username, email, hashedPassword, fullName || username, 'user', 1]
    );

    const userRows = await query(
      'SELECT id, username, email, full_name, role, subscribed FROM users WHERE id = ?',
      [result.insertId]
    );

    const user = userRows[0];
    const token = signToken(user);
    const isAdmin = user.role === 'admin';

    const role = user.admin ? 'admin' : 'user';

    return res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.full_name,
        admin: isAdmin,
        role: user.role,
        subscribed: Boolean(user.subscribed ?? 1)
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Login user
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }

    const users = await query('SELECT * FROM users WHERE email = ?', [email]);

    if (users.length === 0) {
      return res.status(401).json({ message: 'Email or password is incorrect' });
    }

    const user = users[0];
    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(401).json({ message: 'Email or password is incorrect' });
    }

    const token = signToken(user);

    const role = user.role || (user.admin ? 'admin' : 'user');
    const isAdmin = role === 'admin';

    return res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.full_name,
        admin: isAdmin,
        role,
        subscribed: Boolean(user.subscribed ?? 1)
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Reset password (simple email + new password)
exports.resetPassword = async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and new password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await query('UPDATE users SET password = ? WHERE email = ?', [
      hashedPassword,
      email
    ]);

    if (!result.affectedRows) {
      return res.status(404).json({ message: 'No account found for that email' });
    }

    return res.json({ message: 'Password updated successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};
// Get user profile
exports.getProfile = async (req, res) => {
  try {
    const { id } = req.user;
    const results = await query(
      'SELECT id, username, email, full_name, profile_picture, bio, role, subscribed, created_at FROM users WHERE id = ?',
      [id]
    );

    if (results.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = results[0];
    return res.json({
      ...user,
      admin: user.role === 'admin',
      role: user.role,
      subscribed: Boolean(user.subscribed)
    });
  } catch (error) {
    return res.status(500).json({ message: 'Database error', error: error.message });
  }
};

// Update user profile
exports.updateProfile = async (req, res) => {
  try {
    const { id } = req.user;
    const { fullName, bio, profilePicture } = req.body || {};

    await query(
      'UPDATE users SET full_name = ?, bio = ?, profile_picture = ? WHERE id = ?',
      [fullName || null, bio || null, profilePicture || null, id]
    );

    const results = await query(
      'SELECT id, username, email, full_name, profile_picture, bio, role, subscribed FROM users WHERE id = ?',
      [id]
    );

    const user = results[0];
    return res.json({
      message: 'Profile updated successfully',
      user: { ...user, admin: user.role === 'admin', role: user.role, subscribed: Boolean(user.subscribed) }
    });
  } catch (error) {
    return res.status(500).json({ message: 'Database error', error: error.message });
  }
};

// Update user profile picture
exports.updateProfilePicture = async (req, res) => {
  try {
    const { id } = req.user;
    if (!req.file) {
      return res.status(400).json({ message: 'Profile picture is required.' });
    }

    const picturePath = `/uploads/profiles/${req.file.filename}`;

    await query('UPDATE users SET profile_picture = ? WHERE id = ?', [picturePath, id]);

    const results = await query(
      'SELECT id, username, email, full_name, profile_picture, bio, role, subscribed FROM users WHERE id = ?',
      [id]
    );

    const user = results[0];
    return res.json({
      message: 'Profile picture updated',
      user: { ...user, admin: user.role === 'admin', role: user.role, subscribed: Boolean(user.subscribed) }
    });
  } catch (error) {
    return res.status(500).json({ message: 'Database error', error: error.message });
  }
};
// Verify token and return user info
exports.verifyToken = async (req, res) => {
  try {
    const { id } = req.user;
    const results = await query(
      'SELECT id, username, email, full_name, profile_picture, bio, role, subscribed FROM users WHERE id = ?',
      [id]
    );

    if (results.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = results[0];
    return res.json({
      isAuthenticated: true,
      user: { ...user, admin: user.role === 'admin', role: user.role, subscribed: Boolean(user.subscribed) }
    });
  } catch (error) {
    return res.status(500).json({ message: 'Database error', error: error.message });
  }
};

// Update subscription preferences
exports.updateSubscription = async (req, res) => {
  try {
    const { id } = req.user;
    const { subscribed } = req.body || {};
    if (typeof subscribed !== 'boolean') {
      return res.status(400).json({ message: 'Subscribed must be true or false' });
    }

    await query('UPDATE users SET subscribed = ? WHERE id = ?', [subscribed ? 1 : 0, id]);

    const results = await query(
      'SELECT id, username, email, full_name, profile_picture, bio, role, subscribed FROM users WHERE id = ?',
      [id]
    );

    const user = results[0];
    return res.json({
      message: 'Subscription updated',
      user: { ...user, admin: user.role === 'admin', role: user.role, subscribed: Boolean(user.subscribed) }
    });
  } catch (error) {
    return res.status(500).json({ message: 'Database error', error: error.message });
  }
};


