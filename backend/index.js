require('dotenv').config();

// IMPORTS

const express = require('express');
const mysql = require('mysql2');
const session = require('express-session');
const path = require('path');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const cookieParser = require('cookie-parser');
const argon2 = require('argon2');
const fs = require('fs');

// MIDDLEWARES

const rateLimitMiddleware = require('./middlewares/ratelimit');
const verifyToken = require('./middlewares/verify_token');

// CONSTANTS

const app = express();
const port = 5000;
const storage = multer.diskStorage({
  destination: (request, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (request, file, cb) => {
    const extname = path.extname(file.originalname);
    cb(null, Date.now() + extname);
  },
});
const upload = multer({storage});
const connection = mysql.createConnection({
  host: '0.0.0.0',
  user: process.env.SQL_USER,
  password: process.env.SQL_PASS,
  database: process.env.SQL_DB,
  port: process.env.SQL_PORT,
});

const myCSS = {
  style : fs.readFileSync(path.join(__dirname, '/static/index.css'),'utf8'),
};

// SETUP APP

app.set('views', __dirname + '/views');
app.engine('html', require('ejs').renderFile);
app.use(session({
  secret: process.env.SESSION_SECRET,
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
async function createAccount(username, password, callback) {
  connection.query(
      'SELECT * FROM logins WHERE username = ?',
      [username], async function(error, results) {
        if (error) {
          callback(error);
        } else {
          if (results.length > 0) {
            callback('Username already exists');
          } else {
            connection.query(
                'INSERT INTO logins (username, password) VALUES (?, ?)',
                [username, await argon2.hash(password)], function(error) {
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

app.get('/', rateLimitMiddleware, (request, response) => {
  response.sendFile(path.join(__dirname + '/views/login.html'));
});

app.post('/upload', upload.single('photo'), (request, response) => {
  if (!request.file) {
    return response.status(400).send('No file uploaded.');
  }
  const imageUrl = '/uploads/' + request.file.filename;
  response.status(200).json({imageUrl});
});

app.post('/auth', rateLimitMiddleware, async function(request, response) {
  const username = request.body.username;
  const password = request.body.password;

  if (username && password) {
    connection.query(
        'SELECT * FROM logins WHERE username = ?',
        [username], async function(error, results, fields) {
          if (results.length > 0) {
            const hashedPassword = results[0].password;

            try {
              if (await argon2.verify(hashedPassword, password)) {
                const tokenCookie = request.cookies._token;

                if (tokenCookie) {
                  response.redirect('/home');
                } else {
                  request.session.username = username;

                  const token = generateAccessToken(password);

                  response.cookie(
                      '_token',
                      token,
                      {
                        // eslint-disable-next-line max-len
                        expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                        httpOnly: true,
                      },
                  );

                  response.redirect('/home');
                }
              } else {
                response.send('Invalid username or password');
              }
            } catch (err) {
              console.error('Error verifying password:', err);
              response.status(500).send('Internal server error');
            }
          } else {
            response.send('Invalid username or password');
          }
        },
    );
  } else {
    response.send('Please enter Username and Password!');
  }
});

app.get('/home', verifyToken, rateLimitMiddleware, function(request, response) {
  connection.query('SELECT * FROM createdPosts', function(err, rows) {
    if (err) {
      console.error('Error retrieving entries:', err);
      response.status(500).send('Error retrieving entries');
    } else {
      response.render(
          'index.ejs',
          {username: request.session.username, posts: rows, css: myCSS},
      );
    }
  });
});

app.post('/createPost', rateLimitMiddleware, (request, response) => {
  const postContent = request.body.postContent;
  const user = request.session.username;

  let imageUrl = '';
  if (request.file) {
    imageUrl = '/uploads/' + request.file.filename;
  }

  imageUrl = btoa(imageUrl);

  // eslint-disable-next-line max-len
  const sql = 'INSERT INTO createdPosts (user, postcontent, pictures) VALUES (?, ?, ?)';
  connection.query(sql, [user, postContent, imageUrl], (err, result) => {
    if (err) {
      console.error('Error creating a post:', err);
      response.status(500).send('Error creating a post');
      return;
    }
    console.log('Post created successfully');
    response.send('Post created successfully');
  });
});


app.route('/editPost')
    .post(rateLimitMiddleware, function(request, response) {
      const postID = request.body.postID;
      const updatedPostContent = request.body.post;

      const sql = 'UPDATE createdPosts SET postcontent = ? WHERE id = ?';
      connection.query(sql, [updatedPostContent, postID], (err, result) => {
        if (err) {
          console.error('Error editing the post:', err);
          response.status(500).send('Error editing the post');
          return;
        }
        console.log('Post edited successfully');
        response.send('Post edited successfully');
      });
    });

app.get('/createaccount', rateLimitMiddleware, function(request, response) {
  response.sendFile(path.join(__dirname + '/views/signup.html'));
});

app.post('/signupauth', rateLimitMiddleware, async function(request, response) {
  const username = request.body.username;
  const password = request.body.password;
  const confirmPassword = request.body.confirm_password;

  if (password != confirmPassword) {
    throw TypeError;
  }

  await createAccount(username, password, (err) => {
    if (err) {
      console.error('Error creating account:', err);
      response.status(500).send(`Error creating account ${err}`);
    } else {
      request.session.username = username;

      const token = generateAccessToken(password);

      response.cookie(
          '_token', token,
          {expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            httpOnly: true},
      );

      response.redirect('/home');
    }
  });
});

app.route('/deletePost')
    .post(rateLimitMiddleware, function(request, response) {
      const postID = request.body.postID;

      const sql = 'DELETE FROM createdPosts WHERE id = ?';
      connection.query(sql, [postID], (err, result) => {
        if (err) {
          console.error('Error deleting the post:', err);
          response.status(500).send('Error deleting the post');
          return;
        }
        console.log('Post deleted successfully');
        response.send('Post deleted successfully');
      });
    });


app.listen(port, `0.0.0.0`, () => {
  console.log(`Listening on 0.0.0.0:${port}`);
});

