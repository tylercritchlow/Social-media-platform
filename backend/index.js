const express = require('express')
const app = express()
const rateLimitMiddleware = require("./middlewares/ratelimit");
const port = 5000

const mysql = require('mysql');
const session = require('express-session');
const path = require('path');

const multer = require('multer')

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, 'uploads/'); // Specify the directory where uploaded files will be stored
    },
    filename: (req, file, cb) => {
      const extname = path.extname(file.originalname);
      cb(null, Date.now() + extname); // Rename the file with a unique name (timestamp)
    },
  });

const upload = multer({ storage });

// Handle POST requests for uploading images
app.post('/upload', upload.single('photo'), (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }

  // Access the uploaded file details through req.file
  const imageUrl = '/uploads/' + req.file.filename;

  // Save imageUrl to your database or respond with it as needed
  res.status(200).json({ imageUrl });
});
  
// function generateAccessToken(username) {
//     return jwt.sign(username, process.env.TOKEN_SECRET);
// }

function createAccount(username, password, callback) {
    connection.query('SELECT * FROM accounts WHERE username = ?', [username], function (error, results) {
        if (error) {
            callback(error);
        } else {
            if (results.length > 0) {
                callback('Username already exists');
            } else {
                connection.query('INSERT INTO accounts (username, password) VALUES (?, ?)', [username, password], function (error) {
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

const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'nodelogin'
});


const postConnection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'nodelogin'
});

app.set('views', __dirname + '\\views');
app.engine('html', require('ejs').renderFile);
app.use(session({
    secret: 'secret',
    resave: true,
    saveUninitialized: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/static'));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname + '\\views/login.html'));
});

app.post('/auth', function (request, response) {
    let username = request.body.username;
    let password = request.body.password;

    if (username && password) {
        connection.query('SELECT * FROM accounts WHERE username = ? AND password = ?', [username, password], function (error, results, fields) {
            if (error) throw error;

            if (results.length > 0) {
                request.session.loggedin = true;
                request.session.username = username;
                response.redirect('/home');
            } else {
                createAccount(username, password, (err) => {
                    if (err) {
                        console.error('Error creating account:', err);
                        response.status(500).send('Error creating account');
                    } else {
                        request.session.loggedin = true;
                        request.session.username = username;
                        response.redirect('/home');
                    }
                });
            }
        });
    } else {
        response.send('Please enter Username and Password!');
    }
});

app.get('/home', function (request, response) {
    // if (request.session.loggedin) {
    postConnection.query("SELECT * FROM createdposts", function (err, rows) {
        if (err) {
            console.error('Error retrieving entries:', err);
            response.status(500).send('Error retrieving entries');
        } else {
            response.render('index.ejs', { username: request.session.username, posts: rows });
        }
    });
    // } else {
    // NOT LOGGED IN
    // }
});

app.post('/createPost', rateLimitMiddleware, (req, res) => {
    const postContent = req.body.postContent;
    const user = req.session.username;

    // Check if an image was uploaded
    let imageUrl = '';
    if (req.file) {
        imageUrl = '/uploads/' + req.file.filename;
    }

    const sql = "INSERT INTO createdPosts (user, postcontent, imageUrl) VALUES (?, ?, ?)";
    postConnection.query(sql, [user, postContent, imageUrl], (err, result) => {
        if (err) {
            console.error('Error creating a post:', err);
            res.status(500).send('Error creating a post');
            return;
        }
        console.log('Post created successfully');
        res.send('Post created successfully');
    });
});


app.route("/editPost")
    .post(rateLimitMiddleware, function (req, res) {
        const postID = req.body.postID;
        const updatedPostContent = req.body.post;

        const sql = "UPDATE createdPosts SET postcontent = ? WHERE id = ?";
        postConnection.query(sql, [updatedPostContent, postID], (err, result) => {
            if (err) {
                console.error('Error editing the post:', err);
                res.status(500).send('Error editing the post');
                return;
            }
            console.log('Post edited successfully');
            res.send('Post edited successfully');
        });
    });

app.route("/deletePost")
    .post(rateLimitMiddleware, function (req, res) {
        const postID = req.body.postID;

        const sql = "DELETE FROM createdPosts WHERE id = ?";
        postConnection.query(sql, [postID], (err, result) => {
            if (err) {
                console.error('Error deleting the post:', err);
                res.status(500).send('Error deleting the post');
                return;
            }
            console.log('Post deleted successfully');
            res.send('Post deleted successfully');
        });
    });


app.listen(port, () => {
    console.log(`Listening on ${port}`)
})