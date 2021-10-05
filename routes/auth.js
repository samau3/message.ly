"use strict";
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const db = require("../db");
const Router = require("express").Router;
const router = new Router();
const User = require("../models/user");
const { UnauthorizedError, BadRequestError } = require("../expressError");
const { SECRET_KEY } = require("../config");


/** POST /login: {username, password} => {token} */
router.post('/login', async function (req, res) {
    const { username, password } = req.body;

    // wouldn't it be better to update the User.get method to also return password?
    const result = await db.query(
        `SELECT password 
            FROM users 
            WHERE username = $1`,
        [username]);
    let user = result.rows[0];

    if (user) {
        if (await bcrypt.compare(password, user.password) === true) {
            await User.updateLoginTimestamp(username);
            const token = jwt.sign({ username }, SECRET_KEY);
            return res.json({ token });
        }
    }
    throw new BadRequestError("Invalid user/password");
})

/** POST /register: registers, logs in, and returns token.
 *
 * {username, password, first_name, last_name, phone} => {token}.
 */
router.post('/register', async function (req, res) {
    const {
        username,
        password,
        first_name,
        last_name,
        phone } = req.body;

    let user;
    try {
        user = await User.get(username);
        throw new BadRequestError("Username already exists");
    } catch {
        const newUser = await User.register({
            username,
            password,
            first_name,
            last_name,
            phone
        })
        const token = jwt.sign({ username: newUser.username }, SECRET_KEY);
        return res.json({ token });
    }
})


module.exports = router;