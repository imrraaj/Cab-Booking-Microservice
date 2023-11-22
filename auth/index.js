import express from "express";
import mysql from "mysql2";
import { hashPassword, matchPassword } from "./bcrypt.js";
import jwt from 'jsonwebtoken';

const app = express();
const pool = mysql.createPool({
  host: "mysql-auth",
  user: "root",
  password: "root",
  database: "authentication",
});

app.use(express.json());
app.post("/create-user", async (req, res) => {
  const user = req.body.name;
  const hashedPassword = hashPassword(req.body.password, 10);

  try {
    let connection = await pool.promise().getConnection();
    let sqlSearch = 'SELECT * FROM users WHERE username = ?';
    let [rows] = await connection.execute(sqlSearch, [user]);
    connection.release();

    if (rows.length > 0) {
      res.status(409).send("User already exists");
      return;
    }

    connection = await pool.promise().getConnection()
    const insertUserQuery = 'INSERT INTO users (username, password) VALUES (?, ?)';
    [rows] = await connection.execute(insertUserQuery, [user, hashedPassword]);
    connection.release();

    res.json({ status: true, message: 'User register successfully' });
  } catch (e) {
    console.error('Error adding user:', e);
  }
});


async function authenticateUser(req, res) {
  const user = req.body.name;
  const password = req.body.password;

  try {
    const connection = await pool.promise().getConnection();
    const sqlSearch = 'SELECT * FROM users WHERE username = ?';
    const [rows, fields] = await connection.execute(sqlSearch, [user]);
    connection.release();

    if (rows.length === 0) {
      console.log('--------> User does not exist');
      res.sendStatus(404);
      return;
    }

    const hashedPassword = rows[0].password;

    const isPasswordValid = matchPassword(password, hashedPassword);
    if (isPasswordValid) {
      console.log('---------> Login Successful');


      const token = await jwt.sign({
        name: user,
        exp: Math.floor(Date.now() / 1000) + (60 * 60),
      }, 'secrett');

      res.json({ token });
    } else {
      console.log('---------> Password Incorrect');
      res.send('Password incorrect!');
    }
  } catch (error) {
    console.error('Error during authentication:', error);
    res.sendStatus(500);
  }
}

app.post('/login', (req, res) => {
  authenticateUser(req, res);
});

app.get('/status', (req, res) => {
  res.send('OK');
});


const port = 4400;

async function createTableIfNotExists() {
  try {
    const connection = await pool.promise().getConnection();
    const sql = "CREATE TABLE IF NOT EXISTS users (id INT AUTO_INCREMENT PRIMARY KEY, username VARCHAR(255), password VARCHAR(255))";
    await connection.execute(sql);
    console.log('Table created');
    return connection;
  } catch (error) {
    console.error('Error creating table:', error);
    return null;
  }
}


async function startServer() {
  let connection = null;
  while (!connection) {
    connection = await createTableIfNotExists();
    if (!connection) {
      console.log('Retrying in 5 seconds...');
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }

  app.listen(port, () => {
    console.log(`Server started on http://localhost:${port}`);
  });
}
startServer();