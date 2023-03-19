var mysql = require("mysql");
var express = require("express");
var bodyParser = require("body-parser");
var cookieSession = require("cookie-session");
var app = express();
var sha256 = require("crypto-js/sha256");
var path = require('path')

app.set("views", `${__dirname}/views`);
app.set('view engine', 'ejs');

app.use(express.static(path.join(__dirname, 'public')))
app.use(bodyParser.urlencoded({ extended: true }));

app.use(
  cookieSession({
    name: "session",
    keys: ["ajqwefk;efjweflkwfdacadfjadjkdqkasdadas"], // do zmiany 
    maxAge: 24 * 60 * 60 * 1000,
    secure: false,
  })
);
const connection = mysql.createConnection({
  host: "127.0.0.1",
  user: "root",
  password: "",
  database: "panel",
});

connection.connect((err) => {
  if (err) throw err;
  else console.log("connected");
});

app.get("/", (req, res) => {
  res.render('index', {error: null})
});


app.post("/login", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.redirect("/");

  connection.query(
    `SELECT * FROM users WHERE username = ? AND password = '${sha256(escape(password))}'`,
    [username],
    (err, result) => { 
      if (result.length > 0) {
        req.session.logged = true;
        req.session.user = username;
        if (result[0].admin === 0) {
          req.session.isAdmin = false;
          res.render("dashboard", { 
            name: req.session.user, 
            picture: result[0].id,  
            perms: 'User'
          });
        } 
        else if (result[0].admin === 1) {
          req.session.isAdmin = true;
          res.render("admin", { 
            name: req.session.user, 
            picture: result[0].id,  
            perms: 'Administrator'
          });
        }
        else {
          return res.redirect("/");
        }
      } else {
        req.session.logged = false;
        req.session.user = null;
        res.render("index", { error: "Username or password do not match" });
      }
    }
  ); 
});

  
  


app.get("/admin", (req, res) => {
   if (!req.session.logged)  return res.redirect("/");
   if (!req.session.isAdmin) return res.redirect("/");
    connection.query("SELECT * FROM users", (error, results) => {
      if (error) {
        throw error;
      } else {
        res.render("admin", {
          users: results,
        });
      }
    });
  }
);



app.get("/logout", (req, res) => {
  req.session.logged = false;
  req.session.user = null;
  req.session.isAdmin = false;
  return res.redirect("/");
});

app.get('/api/gethash/:pass', async (req, res) => {
  const pass = req.params.pass
  if (!req.session.logged) return res.status(403).json({ message: "Brak uprawnień" })
  if (!pass) return res.status(400).json({ message: "Pass parameter not found" })
  return res.json({ pass, hash: sha256(escape(pass)).toString() })
})

app.get('/users/:id', (req, res) => {
  if (!req.session.logged)  return res.redirect("/");
  if (!req.session.isAdmin) return res.redirect("/");
  const id = req.params.id
  connection.query("SELECT * FROM users WHERE id = " + id, (error, results) => {
    if(error) throw error
    if (!results) return res.status(404).send('Nie znaleziono użytkownika');
    res.render("panel", {
      users: results,
    });
  }) 
});

app.post('/user/:id/delate', (req, res) => {
  const id = req.body.id;
  connection.query("DELETE FROM users WHERE id = " + id, (error) => {
    if (error) throw error;
    res.redirect('/admin');
  });
});

app.post('/user/:id/changeName', (req, res) => {
  const id = req.body.id;
  const name = req.body.name;
  connection.query(`UPDATE users SET username = '${name}' WHERE id = ${id}`, (error) => {
    if (error) throw error;
    res.redirect('/admin');
  });
});


// app.post('/user/:id', (req, res) => {
//   const id = req.params.id;
//   const action = req.body.action;
//   if (action === 'delete') {
//     // usuń użytkownika
//   } else if (action === 'changeName') {
//     const name = req.body.name;
//     // zmień nazwę użytkownika
//   }
//   res.redirect('/');
// });

app.get("*", (req, res) => {
  return res.redirect("/");
});


app.listen(3000);
