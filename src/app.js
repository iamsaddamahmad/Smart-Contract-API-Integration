const express = require("express");
const path = require("path");
const apiTest = require("./routes/apiTest");
const { errorHandler } = require("./middleware/errorHandler");

const app = express();
app.use(express.static(path.join(__dirname, "..", "public")));
app.use("/api", apiTest);
app.use(errorHandler);

module.exports = app;
