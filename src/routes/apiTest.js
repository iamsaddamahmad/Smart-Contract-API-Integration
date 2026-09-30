const express = require("express");
const { getContractInfo } = require("../services/contractService");

const router = express.Router();

// Named per the assignment: [YourName]ApiTest
router.get("/SaddamApiTest", async (_req, res, next) => {
  try {
    const data = await getContractInfo();
    res.json({ success: true, data });
  } catch (err) {
    next(err); // handled centrally
  }
});

module.exports = router;
