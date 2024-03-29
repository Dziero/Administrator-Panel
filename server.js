const mysql = require("mysql");
const express = require("express");
const bodyParser = require("body-parser");
const cookieSession = require("cookie-session");
const app = express();
const sha256 = require("crypto-js/sha256");
const path = require("path");
const multer = require("multer");
const { v4: uuidv4 } = require("uuid");

// ********** CONFIG ********** //

app.set("views", `${__dirname}/views`);
app.set("view engine", "ejs");

app.use(express.static(path.join(__dirname, "public")));
app.use(bodyParser.urlencoded({ extended: true }));

require("dotenv").config();

const connection = mysql.createConnection({
  host: process.env.HOST,
  user: process.env.USER,
  password: process.env.PASSWORD,
  database: process.env.DATABASE,
});

connection.connect((err) => {
  err ? console.log(err) : console.log("Connected");
});

app.use(
  cookieSession({
    name: "session",
    keys: [uuidv4()],
    maxAge: 24 * 60 * 60 * 1000,
    secure: false,
  })
);

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "public/pictures");
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const filename = req.session.user_id ? req.session.user_id : "unknown";
    cb(null, filename + ext);
  },
});

const upload = multer({ storage: storage });

function verifyUser(req, res) {
  if (!req.session.logged) return res.redirect("/");
  if (!req.session.isAdmin) return res.redirect("/");
  return true;
}

// ********** GET ********** //

app.get("/", (req, res) => {
  res.render("index", { error: null });
});


app.get("/admin", (req, res) => {
  if (verifyUser(res, req)) {
    connection.query("SELECT * FROM users", (error, result) => {
      res.render("admin", {
        users: result,
        name: req.session.user,
        perms: "Administrator",
      });
    });
  }
});

app.get("/users", (req, res) => {
  if (verifyUser(res, req)) {
    connection.query("SELECT * FROM users", (error, result) => {
      res.render("users", {
        users: result,
        name: req.session.user,
        perms: "Administrator",
      });
    });
  }
});

app.get("/users/:id/editor", (req, res) => {
  if (verifyUser(res, req)) {
    const id = req.params.id;
    connection.query(
      `SELECT * FROM users WHERE id = ${id}`,
      (error, result) => {
        if (error) throw error;
        if (!result) return res.status(404).send("Nie znaleziono użytkownika");
        res.render("panel", {
          users: result,
          name: req.session.user,
          perms: "Administrator",
        });
      }
    );
  }
});


app.get("/tasks", (req, res) => {
  if (verifyUser(res, req)) {
    connection.query("SELECT * FROM users", (error, users) => {
      if (error) throw error;

      connection.query(
        "SELECT tasks.id, tasks.task FROM tasks ORDER BY tasks.id",
        (error, result) => {
          if (error) throw error;

          const tasks = result.map((row) => {
            let task = null;
            try {
              task = JSON.parse(row.task);
            } catch (err) {
              console.error(
                `Failed to parse JSON data for task ${row.id}: ${row.task}`
              );
            }
            return { id: row.id, description: task ? task.description : "" };
          });

          res.render("tasks", {
            users: users,
            tasks: tasks,
            name: req.session.user,
            perms: "Administrator",
          });
        }
      );
    });
  }
});

app.get("/logout", (req, res) => {
  req.session.logged = false;
  req.session.user = null;
  req.session.isAdmin = false;
  return res.redirect("/");
});



// ********** POST ********** //

app.post("/login", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.redirect("/");

  connection.query(
    `SELECT * FROM users WHERE username = ? AND password = '${sha256(
      escape(password)
    )}'`,
    [username],
    (err, result) => {
      if (result.length > 0) {
        req.session.logged = true;
        req.session.user = username;
        if (result[0].admin === 0) {
          req.session.isAdmin = false;
          res.redirect("index");
        } else if (result[0].admin === 1) {
          req.session.isAdmin = true;
          res.redirect("admin");
        } else {
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


app.post("/users/:id/editor/name", (req, res) => {
  if(verifyUser(res, req)) {
  const id = req.params.id;
  const newName = req.body.newName;
  connection.query(`UPDATE users SET username = '${newName}' WHERE id = ${id}`);
  res.redirect(`/users/${id}/editor`);
}});

app.post("/users/:id/editor/password", (req, res) => {
  if(verifyUser(res, req)) {
  const id = req.params.id;
  const newPassword = req.body.password;
  connection.query(
    `UPDATE users SET password = '${sha256(
      escape(newPassword)
    ).toString()}' WHERE id = ${id}`
  );
  res.redirect(`/users/${id}/editor`);
}});

app.post("/users/:id/editor/NewPerms", (req, res) => {
  if(verifyUser(res, req)) {
  const id = req.params.id;
  const perms = req.body.NewPerms;
  connection.query(
    `UPDATE users SET admin = ${perms === "Admin" ? 1 : 0} WHERE id = ${id}`
  );
  res.redirect(`/users/${id}/editor`);
}});

app.post("/users/:id/editor/delete", (req, res) => {
  if (verifyUser(res, req)) {
    const id = req.params.id;
    connection.query("DELETE FROM users WHERE id = ?", [id], () => {
      res.redirect("/users");
    });
  }
});


app.post(
  "/users",
  upload.single("picture") ||
    function (req, res, next) {
      next();
    },
  (req, res) => {
    if (verifyUser(res, req)) {
      const { username, password } = req.body;
      if (!username || !password)
        return res
          .status(400)
          .send("<h1>Username and password are required</h1>");

      const queryFindUser = `
      SELECT * FROM users WHERE username = ?
    `;
      const queryInsertUser = `
      INSERT INTO users (username, password, admin) VALUES (?, ?, 0)
    `;

      connection.query(queryFindUser, [username], (error, results) => {
        if (error) {
          return res.status(500).send("Error checking if user exists");
        }

        if (results.length > 0) {
          return res.status(400).send("User already exists");
        }

        connection.query(
          queryInsertUser,
          [username, sha256(escape(password)).toString()],
          (error, results) => {
            if (error) {
              return res.status(500).send("Error creating user");
            }

            const user_id = results.insertId + 1;
            req.session.user_id = user_id;
            if (req.file) {
              req.file.filename = user_id + path.extname(req.file.originalname);
            }
            res.redirect("/users");
          }
        );
      });
    }
  }
);

app.post("/tasks/:id/complete", (req, res) => {
  if (verifyUser(res, req)) {
    const taskId = req.params.id;

    connection.query("DELETE FROM tasks WHERE id = ?", [taskId], () => {
      res.redirect("/tasks");
    });
  }
});

app.post("/tasks", (req, res) => {
  if (verifyUser(res, req)) {
    const task = { description: req.body.task };
    connection.query(
      "INSERT INTO tasks (task) VALUES (?)",
      [JSON.stringify(task)],
      (error, result) => {
        if (error) {
          console.error(error);
          return res.status(500).send("Error inserting task");
        }
        res.redirect("/tasks");
      }
    );
  }
});

app.listen(3000);
