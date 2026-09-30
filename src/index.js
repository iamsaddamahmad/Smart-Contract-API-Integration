const app = require("./app");
const { config, validateConfig } = require("./config");

const problems = validateConfig();
if (problems.length) console.warn("Config warnings:", problems.join("; "));

app.listen(config.port, () =>
  console.log(`Server running at http://localhost:${config.port}`)
);
