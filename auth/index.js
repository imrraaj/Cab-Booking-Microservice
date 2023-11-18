import express from "express";
import mysql from "mysql2";
import bcrypt from "bcrypt";
import jwt from 'jsonwebtoken';
import axios from 'axios';

const app = express();
const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || "0.0.0.0",
  user: "root",
  password: "root",
  database: "authentication",
});

app.use(express.json());

app.post("/create-user", async (req, res) => {
  const user = req.body.name;
  const hashedPassword = await bcrypt.hash(req.body.password, 10);

  try {
    let connection = await pool.promise().getConnection();
    let sqlSearch = 'SELECT * FROM users WHERE username = ?';
    let [rows, fields] = await connection.execute(sqlSearch, [user]);
    connection.release();

    if (rows.length > 0) {
      res.status(409).send("User already exists");
      return;
    }

    connection = await pool.promise().getConnection()
    const insertUserQuery = 'INSERT INTO users (username, password) VALUES (?, ?)';
    [rows, fields] = await connection.execute(insertUserQuery, [user, hashedPassword]);
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

    const isPasswordValid = await bcrypt.compare(password, hashedPassword);
    if (isPasswordValid) {
      console.log('---------> Login Successful');


      // use jwt to sign a new token
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
app.listen(port, async () => {

  pool.getConnection((err, connection) => {
    if (err) {
      console.log(err);
      process.exit(1);
    }
    console.log("Connected!");
    const sql = "CREATE TABLE IF NOT EXISTS users (id INT AUTO_INCREMENT PRIMARY KEY, username VARCHAR(255), password VARCHAR(255))";
    connection.query(sql, (err, result) => {
      if (err) throw err;
      console.log("Table created");
    });
  });
  console.log(`Server Started on port ${port}...`)
});