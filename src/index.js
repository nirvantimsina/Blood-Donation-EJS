const path = require('path');
const express = require('express');
const session = require('express-session');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const bodyParser = require('body-parser');
const connectDB = require('./db/database.js');
const { registerUser, loginUser, getUserEmail, getUserLocation, loginAdmin } = require('./controllers/user.controller.js');
const { bloodRequest } = require('./controllers/bloodRequest.controller.js');
const { verifyUserSession, redirectLoggedInUser, verifyAdminSession, redirectLoggedInAdmin } = require('./middlewares/auth.middleware.js')
const { populateUsersAndBloodRequestCount, populateAllUsers } = require('./middlewares/admin.middlewares.js');
const { populateFamilyMembers } = require('./middlewares/familyMembers.middleware.js')
const { getUnreadNotificationsCount, getUnreadRequestsCount } = require('./middlewares/notificationCounter.middleware.js')
const { populateBloodRequest } = require('./middlewares/bloodrequest.middleware.js')
const userRoute = require('./routes/user.routes.js');
const bloodRequestRoute = require('./routes/bloodRequest.routes.js');
const PORT = process.env.PORT;
const app = express();
const Admin = require('./models/admin.model.js')
const User = require('./models/user.model.js')
const BloodRequest = require('./models/bloodRequest.model.js')


// Body parser middleware setup
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Session middleware setup
const userSession = session({
  secret: process.env.USERSECRET,
  resave: false,
  saveUninitialized: true,
  cookie: {
    maxAge: 2 * 24 * 60 * 60 * 1000,
    httpOnly: true,
  }
});
app.use(userSession);

// Serve static files
app.use(express.static(path.resolve("../public")));

// Set view engine and views directory
app.set('views', path.join(__dirname, '../public/views'));
app.set('view engine', 'ejs');

// Routes
app.get('/', redirectLoggedInUser, async (req, res) => {
  const message = req.query.message || null;
  res.render('index', { message: message });
})
app.get("/login", redirectLoggedInUser, async (req, res) => {
  const message = req.session.message;
  const error = req.session.error;
  req.session.message = null;
  req.session.error = null;
  res.render("login", { error: error, message: message });
});

app.get("/register", redirectLoggedInUser, async (req, res) => {
  const message = req.session.message;
  const error = req.session.error;
  req.session.message = null;
  req.session.error = null;
  res.render("register", { error: error, message: message });
});

app.get("/home", verifyUserSession, getUnreadNotificationsCount, getUnreadRequestsCount, async (req, res) => {
  const message = req.session.message;
  const error = req.session.error;
  req.session.message = null;
  req.session.error = null;
  const user = req.user;
  res.render("home", { error: error, message: message, user: user });
});

app.get("/bloodRequest", verifyUserSession, getUnreadNotificationsCount, getUnreadRequestsCount, populateFamilyMembers, async (req, res) => {
  const user = req.user
  const message = req.session.message;
  const error = req.session.error;
  req.session.message = null;
  req.session.error = null;
  res.render("bloodRequest", { error: error, message: message, user: user, familyMembers: req.familyMembers });
});
app.get("/learn-more", verifyUserSession, getUnreadNotificationsCount, getUnreadRequestsCount, async (req, res) => {
  const user = req.user
  res.render("learn-more", { user: user });
});
app.post('/bloodRequest', bloodRequest);

app.post('/login', loginUser);
app.post('/register', registerUser);
// app.post('/requestBlood',requestBlood)
app.use('/user', userSession, userRoute);
app.use('/bloodRequest', userSession, bloodRequestRoute);
app.post('/myemail', getUserEmail)
app.post('/getMyLocation', getUserLocation)
app.get('/bloodRequest/:id', verifyUserSession, getUnreadNotificationsCount, getUnreadRequestsCount, populateBloodRequest, async (req, res) => {
  const message = req.session.message;
  const error = req.session.error;
  const user = req.user;
  const bloodRequest = req.bloodRequest;
  req.session.message = null;
  req.session.error = null;
  res.render('bloodRequestDetails', { error: error, message: message, user: user, bloodRequest: bloodRequest });
})
app.get('/admin/login', redirectLoggedInAdmin, async (req, res) => {
  const message = req.session.message;
  const error = req.session.error;
  const admin = req.admin;
  req.session.message = null;
  req.session.error = null;
  res.render('adminlogin', { error: error, message: message, admin: admin });
});
app.post('/admin/login', loginAdmin);
// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});
app.post('/admin/register', redirectLoggedInAdmin, async (req, res) => {
  const { email, password, fullName } = req.body;
  if (!email || !password || !fullName) {
    req.session.error = "All fields required";
    return res.status(400).json({ message: "All fields required!" })
  }
  const existedAdmin = await Admin.findOne({ email });
  if (existedAdmin) {
    return res.status(400).json({ message: "admin exists" });
  }
  const admin = {
    email,
    password,
    fullName
  }
  const createAdmin = await Admin.create(admin);
  return res.json({ message: "Admin registerd Successfully!" });
})
app.get('/admin/dashboard', verifyAdminSession, populateUsersAndBloodRequestCount, async (req, res) => {
  const message = req.session.message;
  const error = req.session.error;
  const admin = req.admin;
  req.session.message = null;
  req.session.error = null;
  res.render('admindashboard', {
    error: error, message: message, admin: admin, userCount: res.locals.totalUsers,
    allRequests: res.locals.totalBloodRequests
  });
});
// app.get('/admin/users', verifyAdminSession, populateAllUsers, async (req, res) => {
//   const message = req.session.message;
//   const error = req.session.error;
//   const admin = req.admin;
//   req.session.message = null;
//   req.session.error = null;

//   res.render('adminusers', {
//     error,
//     message,
//     admin,
//     users: res.locals.users,
//   });
// });

app.get('/admin/users', verifyAdminSession, async (req, res) => {
  const { bloodGroup, approved } = req.query;
  const message = req.session.message;
  const error = req.session.error;
  const filter = {};
  if (bloodGroup && bloodGroup !== 'all') {
    filter['bloodDetails.bloodGroupType'] = bloodGroup;
  }
  if (approved === 'true') filter.approved = true;
  if (approved === 'false') filter.approved = false;

  try {
    const users = await User.find(filter).sort({ approved: 1, createdAt: -1 });
    const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
    res.render('adminusers', {
      users,
      admin: req.admin,
      message: req.session.message,
      error: req.session.error,
      bloodGroups: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
      selectedGroup: req.query.bloodGroup || 'all',
      selectedApproval: req.query.approved || 'all'
    });
    req.session.message = null;
    req.session.error = null;
  } catch (err) {
    res.status(500).send('Error fetching users');
  }
});
app.get('/admin/users/:id', verifyAdminSession, async (req, res) => {
  try {
    const userId = req.params.id;
    const message = req.session.message;
    const error = req.session.error;
    req.session.message = null;
    req.session.error = null;

    const user = await User.findById(userId).lean();
    if (!user) {
      return res.status(404).render('error', { error: 'User not found' });
    }

    res.render('admin-userdetails', {
      user,
      admin: req.admin,
      message: message,
      error: error,
    });
  } catch (err) {
    console.error(err);
    res.status(500).render('error', { error: 'Internal Server Error' });
  }
});
app.post('/admin/users/:id/update', async (req, res) => {
  try {
    const { disease, canDonate, canReceive, approved } = req.body;

    if (!['true', 'false'].includes(canDonate) || !['true', 'false'].includes(canReceive) || !['true', 'false'].includes(approved)) {
      return res.status(400).send('Invalid boolean fields.');
    }

    const updateFields = {
      'bloodDetails.disease': disease?.trim() || 'none',
      'bloodDetails.canDonate': canDonate === 'true',
      'bloodDetails.canReceive': canReceive === 'true',
      approved: approved === 'true'
    };

    await User.findByIdAndUpdate(req.params.id, { $set: updateFields });
    req.session.message = "User updated Successfully!"
    res.redirect('/admin/users');
  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
  }
});
app.post('/admin/users/:id/delete', verifyAdminSession, async (req, res) => {
  try {

    await User.findByIdAndDelete(req.params.id);

    req.session.message = "User deleted Successfully!"
    res.redirect('/admin/users');
  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
  }
});
app.get('/admin/blood-requests', verifyAdminSession, async (req, res) => {
  try {
    const message = req.session.message;
    const error = req.session.error;
    req.session.message = null;
    req.session.error = null;
    const requests = await BloodRequest.find().populate('createdBy', 'fullName contactNumber bloodDetails');
    res.render('admin-bloodRequests', { admin: req.admin, requests, error: error, message: message });
  } catch (err) {
    console.error('Error fetching blood requests:', err);
    res.status(500).send('Internal Server Error');
  }
});
app.get('/admin/blood-requests/:id', verifyAdminSession, async (req, res) => {
  try {
    const requestId = req.params.id;
    const bloodRequest = await BloodRequest.findById(requestId).populate('createdBy');

    if (!bloodRequest) {

      return res.status(404).send('Blood request not found');
    }
    const message = req.session.message;
    const error = req.session.error;
    req.session.message = null;
    req.session.error = null;
    res.render('admin-bloodRequestDetails', { admin: req.admin, error: error, message: message, bloodRequest });
  } catch (error) {
    console.error('Error fetching blood request:', error);
    res.status(500).send('Server error');
  }
});

// Connect to database and start server
connectDB().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
    console.log('Click here to access:', process.env.DOMAIN);
  });
});
