///*** minimal working example ***///

// import and initialize
const GleitzeitkontoAPI = require("./gleitzeitkonto-api").default;
const gzk = new GleitzeitkontoAPI(
    // resolve relative path to absolute path
    require("path").resolve("./"),
    "working_times.csv",
    "./gleitzeitconfig.json"
);

// asynchronous context to enable await-keyword
(async () => {
    // download table of working times in background
    const statusCode = await gzk.downloadWorkingTimes();
    // if download succeeded
    if (statusCode == 0)
        // calculate overtime and print it to the console
        console.log(gzk.calculateFromWorkingTimes());
    else
        console.error("downloading table of working times failed with status code " + statusCode);
})();
