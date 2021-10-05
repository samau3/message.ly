"use strict";
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const db = require("../db");
const Router = require("express").Router;
const User = require("../models/user");
const { BadRequestError } = require("../expressError");
const { SECRET_KEY } = require("../config");

const router = new Router();

/** POST /login: {username, password} => {token} */
router.post('/login', async function (req, res) {
    const { username, password } = req.body;

    if (await User.authenticate(username, password)) {
        await User.updateLoginTimestamp(username);
        const token = jwt.sign({ username }, SECRET_KEY);
        return res.json({ token });
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
    } catch (err) {
        if (!user) {
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
    }
    finally {
        throw new BadRequestError("Username already exists");
    }
})


module.exports = router;