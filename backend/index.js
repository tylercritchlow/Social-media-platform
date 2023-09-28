require('dotenv').config();

// IMPORTS

const express = require('express');
const mysql = require('mysql2');
const session = require('express-session');
const path = require('path');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const cookieParser = require('cookie-parser');

// MIDDLEWARES

const rateLimitMiddleware = require('./middlewares/ratelimit');
const verifyToken = require('./middlewares/verify_token');

// CONSTANTS

const app = express();
const port = 5000;
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const extname = path.extname(file.originalname);
    cb(null, Date.now() + extname);
  },
});
const upload = multer({storage});
const connection = mysql.createConnection({
  host: '0.0.0.0',
  user: 'admin',
  password: 'root',
  database: 'nodelogin',
  port: 3307
});

// SETUP APP

app.set('views', __dirname + '\\views');
app.engine('html', require('ejs').renderFile);
app.use(session({
  secret: 'secret',
  resave: true,
  saveUninitialized: true,
}));
app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use(express.static(__dirname + '/static'));
app.use(cookieParser());

/**
 * Generates a json web token, based on user's password.
 * @constructor
 * @param {string} pass - The users password
 */
function generateAccessToken(pass) {
  return jwt.sign(pass, process.env.JWT_KEY);
}

/**
 * Creates an account and adds it to the database.
 * @constructor
 * @param {string} username - The user's username.
 * @param {string} password - The user's password.
 * @param {Object} callback - The function that gets called on error.
 */
function createAccount(username, password, callback) {
  connection.query(
      'SELECT * FROM logins WHERE username = ?',
      [username], function(error, results) {
        if (error) {
          callback(error);
        } else {
          if (results.length > 0) {
            callback('Username already exists');
          } else {
            connection.query(
                'INSERT INTO logins (username, password) VALUES (?, ?)',
                [username, password], function(error) {
                  if (error) {
                    callback(error);
                  } else {
                    callback(null);
                  }
                });
          }
        }
      });
}

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname + '\\views/login.html'));
});

app.post('/upload', upload.single('photo'), (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }
  const imageUrl = '/uploads/' + req.file.filename;
  res.status(200).json({imageUrl});
});

app.post('/auth', function(request, response) {
  const username = request.body.username;
  const password = request.body.password;

  if (username && password) {
    connection.query(
        'SELECT * FROM logins WHERE username = ? AND password = ?',
        [username, password], function(error, results, fields) {
          if (error) throw error;
          const tokenCookie = request.cookies._token;

          if (tokenCookie) {
            response.redirect('/home');
          } else if (results.length > 0) {
            request.session.username = username;

            const token = generateAccessToken(username);

            response.cookie(
                '_token', token,
                {expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                  httpOnly: true},
            );

            response.redirect('/home');
          }
        });
  } else {
    response.send('Please enter Username and Password!');
  }
});

app.get('/home', verifyToken, function(request, response) {
  connection.query('SELECT * FROM createdPosts', function(err, rows) {
    if (err) {
      console.error('Error retrieving entries:', err);
      response.status(500).send('Error retrieving entries');
    } else {
      response.render(
          'index.ejs',
          {username: request.session.username, posts: rows},
      );
    }
  });
});

app.post('/createPost', rateLimitMiddleware, (req, res) => {
  const postContent = req.body.postContent;
  const user = req.session.username;

  let imageUrl = '';
  if (req.file) {
    imageUrl = '/uploads/' + req.file.filename;
  }

  // eslint-disable-next-line max-len
  const sql = 'INSERT INTO createdPosts (user, postcontent, imageUrl) VALUES (?, ?, ?)';
  connection.query(sql, [user, postContent, imageUrl], (err, result) => {
    if (err) {
      console.error('Error creating a post:', err);
      res.status(500).send('Error creating a post');
      return;
    }
    console.log('Post created successfully');
    res.send('Post created successfully');
  });
});


app.route('/editPost')
    .post(rateLimitMiddleware, function(req, res) {
      const postID = req.body.postID;
      const updatedPostContent = req.body.post;

      const sql = 'UPDATE createdPosts SET postcontent = ? WHERE id = ?';
      connection.query(sql, [updatedPostContent, postID], (err, result) => {
        if (err) {
          console.error('Error editing the post:', err);
          res.status(500).send('Error editing the post');
          return;
        }
        console.log('Post edited successfully');
        res.send('Post edited successfully');
      });
    });

app.get('/createaccount', function (request, response) {
    response.sendfile(__dirname + '/views/signup.html')
})

app.get('/signupauth', function (request, response) {
    let username = request.body.username;
    let password = request.body.password;

    createAccount(username, password, (err) => {
        if (err) {
            console.error('Error creating account:', err);
            response.status(500).send('Error creating account');
        } else {
            request.session.username = username;
            response.redirect('/home');
        }
    });
})

app.route('/deletePost')
    .post(rateLimitMiddleware, function(req, res) {
      const postID = req.body.postID;

      const sql = 'DELETE FROM createdPosts WHERE id = ?';
      connection.query(sql, [postID], (err, result) => {
        if (err) {
          console.error('Error deleting the post:', err);
          res.status(500).send('Error deleting the post');
          return;
        }
        console.log('Post deleted successfully');
        res.send('Post deleted successfully');
      });
    });


app.listen(port, `0.0.0.0`, () => {
  console.log(`Listening on 0.0.0.0:${port}`);
});

