///*** minimal working example ***///

// import and initialize
const GleitzeitkontoAPI = require("./gleitzeitkonto-api").default;
const gzk = new GleitzeitkontoAPI(
    // resolve relative path to absolute path
    require("path").resolve("./"),
    "working_times.csv",
    "./gleitzeitconfig.json",
    // if you are downloading this from github: replace the whole following line (!) with a string containing the url to the "meine zeitenübersicht"-page in the internal fiori, e.g. "https://..."
    require("./url.json")
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
