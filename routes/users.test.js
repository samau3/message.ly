"use strict";

const request = require("supertest");
const jwt = require("jsonwebtoken");

const app = require("../app");
const db = require("../db");
const User = require("../models/user");
const Message = require("../models/message");

let response;

describe("Test User routes", function () {
    beforeEach(async function () {
        await db.query("DELETE FROM messages");
        await db.query("DELETE FROM users");
        await db.query("ALTER SEQUENCE messages_id_seq RESTART WITH 1");

        let u1 = await User.register({
            username: "test1",
            password: "password",
            first_name: "Test1",
            last_name: "Testy1",
            phone: "+14155550000",
        });
        let u2 = await User.register({
            username: "test2",
            password: "password",
            first_name: "Test2",
            last_name: "Testy2",
            phone: "+14155552222",
        });
        let m1 = await Message.create({
            from_username: "test1",
            to_username: "test2",
            body: "u1-to-u2",
        });
        let m2 = await Message.create({
            from_username: "test2",
            to_username: "test1",
            body: "u2-to-u1",
        });

        response = await request(app)
            .post("/auth/login")
            .send({ username: "test1", password: "password" });
    });

    // move to middle ware testing?
    // test("Accessing homepage not logged in", async function () {
    //     let resp = await request(app).get("/users/");

    //     expect(resp.statusCode).toEqual(401);
    // })

    // test("Accessing homepage logged in", async function () {
    //     // console.log("token", response.body.token)
    //     // console.log("locals user", res.locals.user)
    //     let resp = await request(app).get("/users/");

    //     expect(resp.statusCode).toEqual(200);
    //     expect(resp.body.users).toEqual([
    //         {
    //             username: "test1",
    //             password: "password",
    //             first_name: "Test1",
    //             last_name: "Testy1",
    //             phone: "+14155550000",
    //         },
    //         {
    //             username: "test2",
    //             password: "password",
    //             first_name: "Test2",
    //             last_name: "Testy2",
    //             phone: "+14155552222",
    //         }
    //     ])

    // })


});


afterAll(async function () {
    await db.end();
});
