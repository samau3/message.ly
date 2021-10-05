"use strict";

const e = require("express");
const db = require("../db");
const { BCRYPT_WORK_FACTOR } = require("../config");
const { NotFoundError } = require("../expressError");
const bcrypt = require("bcrypt");

/** User of the site. */

class User {

  /** Register new user. Returns
   *    {username, password, first_name, last_name, phone}
   */

  static async register({ username, password, first_name, last_name, phone }) {
    const hashedPassword = await bcrypt.hash(
      password, BCRYPT_WORK_FACTOR
    );
    const result = await db.query(
      `INSERT INTO users (username,
                          password,
                          first_name,
                          last_name,
                          phone, join_at, last_login_at)
        VALUES
        ($1, $2, $3, $4, $5, current_timestamp, current_timestamp)
        RETURNING username, password, first_name, last_name, phone`,
      [username, hashedPassword, first_name, last_name, phone]
    );
    return result.rows[0];
  }

  /** Authenticate: is username/password valid? Returns boolean. */

  static async authenticate(username, password) {
    const result = await db.query(
      `SELECT password
          FROM users
          WHERE username = $1`,
      [username]
    );
    const user = result.rows[0];

    if (user) {
      return (await bcrypt.compare(password, user.password) === true);
    } else {
      return false;
    }
  }

  /** Update last_login_at for user */

  static async updateLoginTimestamp(username) {

    const result = await db.query(
      `UPDATE users
       SET last_login_at = current_timestamp
         WHERE username = $1
         RETURNING username, last_login_at`,
      [username]);

    const user = result.rows[0];

    if (!user) throw new NotFoundError(`No such user: ${username}`);
  }

  /** All: basic info on all users:
   * [{username, first_name, last_name}, ...] */

  static async all() {
    const result = await db.query(
      `SELECT username, first_name, last_name
          FROM users
          ORDER BY username
      `
      // include an ORDER BY
    );
    return result.rows;
  }

  /** Get: get user by username
   *
   * returns {username,
   *          first_name,
   *          last_name,
   *          phone,
   *          join_at,
   *          last_login_at } */

  static async get(username) {
    const result = await db.query(
      `SELECT username, first_name, last_name, phone, join_at, last_login_at
          FROM users
          WHERE username = $1
      `, [username]
    );

    const user = result.rows[0];

    if (!user) throw new NotFoundError(`No such user: ${username}`);
    return user;
  }

  /** Return messages from this user.
   *
   * [{id, to_user, body, sent_at, read_at}]
   *
   * where to_user is
   *   {username, first_name, last_name, phone}
   */

  static async messagesFrom(username) {
    // const result = await db.query(
    //   `SELECT m.id AS id,
    //           m.to_username AS to_username,
    //           m.body AS body,
    //           m.sent_at AS sent_at,
    //           m.read_at AS read_at,
    //           t.first_name AS to_first_name,
    //           t.last_name AS to_last_name, 
    //           t.phone AS to_phone
    //       FROM messages as m
    //           JOIN users AS t ON m.to_username = t.username
    //       WHERE m.from_username = $1
    //   `, [username]
    // );
    // const u = result.rows[0];

    // if (!u) throw new NotFoundError(`No such user: ${username}`);
    // return [{
    //   id: u.id,
    //   to_user: {
    //     username: u.to_username,
    //     first_name: u.to_first_name,
    //     last_name: u.to_last_name,
    //     phone: u.to_phone,
    //   },
    //   body: u.body,
    //   sent_at: u.sent_at,
    //   read_at: u.read_at,
    // }];

    const messageResult = await db.query(
      `SELECT id, to_username AS to_user, body, sent_at, read_at
          FROM messages
          WHERE from_username = $1
      `, [username]
    );

    const messages = messageResult.rows; // [{id, from_user, body, sent_at, read_at}, {id, from_user, body, sent_at, read_at}]
    if (messages.length === 0) throw new NotFoundError(`No messages from: ${username}`);

    const usernames = messages.map(m => m.to_user);
    const formattedUsernames = usernames.join(); // "username1,username2,username3"

    const userResult = await db.query(
      `SELECT username, first_name, last_name, phone
          FROM users
          WHERE username IN ($1)
      `, [formattedUsernames] // doesn't handle multiple names
    );
    console.log("userResults", userResult)

    const users = new Set(userResult.rows);
    const usersEntries = users.entries();
    const finalResult = messages.map(m => {

      for (let entry of usersEntries) {
        if (entry[0].username === m.to_user) {
          m.to_user = entry[0];
        }
      }
      return m;
    });
    return finalResult;


  }


  /** Return messages to this user.
   *
   * [{id, from_user, body, sent_at, read_at}]
   *
   * where from_user is
   *   {username, first_name, last_name, phone}
   */

  static async messagesTo(username) {
    // const result = await db.query(
    //   `SELECT m.id AS id,
    //           m.from_username AS from_username,
    //           m.body AS body,
    //           m.sent_at AS sent_at,
    //           m.read_at AS read_at,
    //           f.first_name AS from_first_name,
    //           f.last_name AS from_last_name, 
    //           f.phone AS from_phone
    //       FROM messages as m
    //           JOIN users AS f ON m.from_username = f.username
    //       WHERE m.to_username = $1
    //   `, [username]
    // );
    // const m = result.rows; // need more descriptive variable name

    // if (m.length === 0) throw new NotFoundError(`No messages to: ${username}`);

    // potentially have to loop the results.row and set the objects to be 
    // in the format below via a map
    const messageResult = await db.query(
      `SELECT id, from_username AS from_user, body, sent_at, read_at
          FROM messages
          WHERE to_username = $1
      `, [username]
    );

    const messages = messageResult.rows; // [{id, from_user, body, sent_at, read_at}, {id, from_user, body, sent_at, read_at}]

    if (messages.length === 0) throw new NotFoundError(`No messages to: ${username}`);

    const fromUser = messages.map(m => m.from_user);
    const formattedUser = fromUser.join();
    // console.log('formattedUser', formattedUser)


    const userResult = await db.query(
      `SELECT username, first_name, last_name, phone
          FROM users
          WHERE username IN ($1)
      `, [formattedUser]
    );

    // console.log('userResult', userResult.rows)
    const users = new Set(userResult.rows);
    const usersEntries = users.entries();
    // console.log("userEntries", usersEntries)// [{username, first_name, last_name, phone}, {username, first_name, last_name, phone}]
    const finalResult = messages.map(m => {

      for (let entry of usersEntries) {
        // console.log("entry", entry)
        // console.log("entry0username", entry[0].username)
        // console.log("m.fromUsername", m.from_username)
        if (entry[0].username === m.from_user) {
          // console.log("in if entry0username", entry[0].username)
          // console.log("before m.from", m.from_username)
          m.from_user = entry[0];
          // console.log("after m.from", m.from_username)
        }
      }
      return m;
    });
    // console.log("finalResult", finalResult);
    return finalResult;

    // alternatively, do two database queries
    // one to get the messages and another to get the users
    // make the users into a set and then loop through the messages and join the users

    // return [{
    //   id: u.id,
    //   from_user: {
    //     username: u.from_username,
    //     first_name: u.from_first_name,
    //     last_name: u.from_last_name,
    //     phone: u.from_phone,
    //   },
    //   body: u.body,
    //   sent_at: u.sent_at,
    //   read_at: u.read_at,
    // }];
  }
}


module.exports = User;
