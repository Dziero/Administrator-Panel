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

const connection = mysql.createConnection({
  host: "127.0.0.1",
  user: "root",
  password: "",
  database: "panel",
});

app.use(
  cookieSession({
    name: "session",
    keys: ["ajqwefk;efjweflkwfdacadfjadjkdqkasdadas"], 
    maxAge: 24 * 60 * 60 * 1000,
    secure: false,
  })
);

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
            perms: 'User'
          });
        } 
        else if (result[0].admin === 1) {
          req.session.isAdmin = true;
          res.redirect("admin");
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
    connection.query("SELECT * FROM users", (error, result) => {
      res.render("admin", {
        users: result, 
        name: req.session.user, 
        perms: 'Administrator'
      })
    })
  })

  app.get("/users", (req, res) => {
    if (!req.session.logged)  return res.redirect("/");
    if (!req.session.isAdmin) return res.redirect("/");
     connection.query("SELECT * FROM users", (error, result) => {
       res.render("users", {
         users: result,
         name: req.session.user, 
         perms: 'Administrator'
       })
     })
   })

   app.get('/users/:id/editor', (req, res) => {
    if (!req.session.logged)  return res.redirect("/");
    if (!req.session.isAdmin) return res.redirect("/");
    const id = req.params.id
    connection.query(`SELECT * FROM users WHERE id = ${id}`, (error, result) => {
      if(error) throw error
      if (!result) return res.status(404).send('Nie znaleziono użytkownika');
      res.render("panel", {
        users: result,
        name: req.session.user, 
        perms: 'Administrator',
      });
    }) 
  });
  


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

app.post('/users', (req, res) => {
  const { username, password } = req.body;
  const query = `
    INSERT INTO users (username, password, admin)
    VALUES (?, ?, 0)
  `;
  
  connection.query(query, [username, sha256(escape(password)).toString()], (error) => {
    res.redirect('/users');
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



app.get("*", (req, res) => {
  return res.redirect("/");
});


app.listen(3000);
