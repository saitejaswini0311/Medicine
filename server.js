const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({
  path: '.env'
});
const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = 'your-secret-key-change-in-production';
const MONGODB_URI = process.env.MONGODB_URI;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

const connectDB = async () => {
    try {
        const connectionInstance = await mongoose.connect(`${MONGODB_URI}`)
        console.log(`\n MongoDB connected !! DB HOST : ${connectionInstance.connection.host}`)
    } catch (error) {
        console.log("MONGO DB connection error", error);
        process.exit(1)
    }
}

// User Schema
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: { type: String, required: true },
  bloodGroup: { type: String, required: true },
  age: { type: Number, required: true },
  weight: { type: Number, required: true },
  location: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

// Donor Schema
const donorSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  phone: { type: String, required: true },
  bloodGroup: { type: String, required: true },
  age: { type: Number, required: true },
  location: { type: String, required: true },
  lastDonation: { type: Date },
  availableForEmergency: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  registeredAt: { type: Date, default: Date.now }
});

// Request Schema
const requestSchema = new mongoose.Schema({
  requesterName: { type: String, required: true },
  contactInfo: { type: String, required: true },
  requiredItem: { type: String, required: true }, // 'blood' or 'medicine'
  bloodGroup: { type: String },
  medicineDetails: { type: String },
  urgencyLevel: { type: String, required: true }, // 'low', 'medium', 'high', 'critical'
  location: { type: String, required: true },
  additionalDetails: { type: String },
  status: { type: String, default: 'pending' }, // 'pending', 'fulfilled', 'cancelled'
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Donor = mongoose.model('Donor', donorSchema);
const Request = mongoose.model('Request', requestSchema);

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// Blood donation eligibility checker
const checkDonationEligibility = (user, lastDonation) => {
  const requirements = {
    minAge: 18,
    maxAge: 65,
    minWeight: 50,
    minDaysBetweenDonations: 56 // 8 weeks
  };

  if (user.age < requirements.minAge) {
    return { eligible: false, reason: 'Must be at least 18 years old' };
  }

  if (user.age > requirements.maxAge) {
    return { eligible: false, reason: 'Must be under 65 years old' };
  }

  if (user.weight < requirements.minWeight) {
    return { eligible: false, reason: 'Must weigh at least 50kg' };
  }

  if (lastDonation) {
    const daysSinceLastDonation = Math.floor((new Date() - new Date(lastDonation)) / (1000 * 60 * 60 * 24));
    if (daysSinceLastDonation < requirements.minDaysBetweenDonations) {
      const daysRemaining = requirements.minDaysBetweenDonations - daysSinceLastDonation;
      return { 
        eligible: false, 
        reason: `Must wait ${daysRemaining} more days since last donation` 
      };
    }
  }

  return { eligible: true };
};

// Routes

// Serve main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Authentication Routes
app.post('/api/signup', async (req, res) => {
  try {
    const { name, email, password, phone, bloodGroup, age, weight, location } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      phone,
      bloodGroup,
      age: parseInt(age),
      weight: parseInt(weight),
      location
    });

    await newUser.save();

    // Create JWT token
    const token = jwt.sign({ id: newUser._id, email: newUser.email }, JWT_SECRET);

    res.status(201).json({
      message: 'User created successfully',
      token,
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        bloodGroup: newUser.bloodGroup
      }
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Create JWT token
    const token = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET);

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        bloodGroup: user.bloodGroup
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Donor Routes
app.post('/api/donate', authenticateToken, async (req, res) => {
  try {
    const { lastDonation, availableForEmergency } = req.body;
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check donation eligibility
    const eligibilityCheck = checkDonationEligibility(user, lastDonation);
    if (!eligibilityCheck.eligible) {
      return res.status(400).json({ error: eligibilityCheck.reason });
    }

    // Add or update donor
    const existingDonor = await Donor.findOne({ userId: user._id });
    const donorData = {
      userId: user._id,
      name: user.name,
      phone: user.phone,
      bloodGroup: user.bloodGroup,
      age: user.age,
      location: user.location,
      lastDonation: lastDonation ? new Date(lastDonation) : null,
      availableForEmergency: availableForEmergency || false,
      isActive: true
    };

    let donor;
    if (existingDonor) {
      donor = await Donor.findByIdAndUpdate(existingDonor._id, donorData, { new: true });
    } else {
      donor = new Donor(donorData);
      await donor.save();
    }

    res.json({
      message: 'Successfully registered as donor',
      donor: donor
    });
  } catch (error) {
    console.error('Donate error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/donors', async (req, res) => {
  try {
    const { bloodGroup } = req.query;
    let query = { isActive: true };
    
    if (bloodGroup) {
      query.bloodGroup = bloodGroup;
    }

    const donors = await Donor.find(query).sort({ registeredAt: -1 });
    res.json(donors);
  } catch (error) {
    console.error('Get donors error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Request Routes
app.post('/api/requests', async (req, res) => {
  try {
    const { requesterName, contactInfo, requiredItem, bloodGroup, medicineDetails, urgencyLevel, location, additionalDetails } = req.body;

    const newRequest = new Request({
      requesterName,
      contactInfo,
      requiredItem,
      bloodGroup: requiredItem === 'blood' ? bloodGroup : undefined,
      medicineDetails: requiredItem === 'medicine' ? medicineDetails : undefined,
      urgencyLevel,
      location,
      additionalDetails
    });

    await newRequest.save();

    res.status(201).json({
      message: 'Request submitted successfully',
      request: newRequest
    });
  } catch (error) {
    console.error('Request error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/requests', async (req, res) => {
  try {
    const requests = await Request.find({ status: 'pending' }).sort({ createdAt: -1 });
    res.json(requests);
  } catch (error) {
    console.error('Get requests error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get donation requirements
app.get('/api/donation-requirements', (req, res) => {
  const requirements = {
    age: {
      min: 18,
      max: 65,
      description: 'Must be between 18-65 years old'
    },
    weight: {
      min: 50,
      description: 'Must weigh at least 50kg'
    },
    frequency: {
      days: 56,
      description: 'Must wait at least 8 weeks (56 days) between donations'
    },
    general: [
      'Must be in good health',
      'Should not have donated blood in the last 56 days',
      'Should not have any infectious diseases',
      'Should not be on certain medications',
      'Should have had adequate sleep (at least 6 hours)',
      'Should have eaten a proper meal before donation',
      'Should be adequately hydrated'
    ]
  };

  res.json(requirements);
});

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server is running on port http://localhost:${PORT}`);
  });
});