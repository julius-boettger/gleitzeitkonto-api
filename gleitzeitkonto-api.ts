import * as puppeteer from "puppeteer";
import * as path from "path";
import * as fs from "fs";

/**
 * download csv file of working times and calculate overtime
 * @version 1.0.0
 * @author Julius Böttger
 */
export default class GleitzeitkontoAPI {

    /** url for webscraper to download working times from */
    private readonly url = require("./url.json");

    /** absolute path to directory to download files into */
    private readonly downloadDir: string;
    /** name of csv file in download directory, e.g. "table.csv" */
    private readonly csvFileName: string;
    /** absolute or relative path to config json-file, e.g. "./config.json" */
    private readonly configPath: string;
    /** prints progress updates to console if true */
    private readonly logToConsole: boolean;

    // config object (default config is the following)
    private config: {
        wochenstunden: number,
        startStunden: number,
        startDatum: string,
        endDatum: string | "gestern" | "heute" | "morgen",
        browserPfad: string,
    } = {
        // weekly workload in hours
        wochenstunden: 40,
        // overtime at startDatum in hours
        startStunden: 0.0,
        // webscraper gets csv file of working times between these dates (startDatum and endDatum included, formatted like "DD.MM.YYYY")
        // default values are unrealistic numbers to make sure that every registered working time is included
        // endDatum can be a specific date or just "gestern", "heute" or "morgen"
        startDatum: "01.01.1999",
        endDatum: "31.12.2099",
        // valid path to browser for webscraper (edge and chrome work, chrome is usually C:/Program Files/Google/Chrome/Application/chrome.exe)
        browserPfad: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"
    };

    /**
     * tries to read and parse config file under `configPath`, creates new file with default values in that location if it doesn't exist or couldn't be parsed correctly
     * @param downloadDir absolute path to directory to download files into (will be created if it doesn't exist yet)
     * @param csvFileName file name of csv file to download / read, e.g. `"table.csv"` (must end with `".csv"`)
     * @param configPath absolute or relative path to config json-file, e.g. `"./config.json"` (must end with `".json"`)
     * @param logToConsole optional: prints progress updates to console if `true` (default is `false`)
     */
    public constructor(downloadDir: string, csvFileName: string, configPath: string, logToConsole: boolean = false) {

        // error handling

        if (csvFileName.includes("/") ||
            csvFileName.substring(csvFileName.length - 4, csvFileName.length) != ".csv")
            throw new Error("csvFileName can't contain \"/\" and must end with \".csv\"");
        
        if (configPath.substring(configPath.length - 5, configPath.length) != ".json")
            throw new Error("configPath must end with \".json\"");

        // assign parameters to class attributes
        this.downloadDir = downloadDir;
        this.csvFileName = csvFileName;
        this.configPath = configPath;
        this.logToConsole = logToConsole;

        // try to update config with local config.json
        try {
            // read local config.json as localConfig
            const localConfig = JSON.parse(fs.readFileSync(this.configPath, {encoding: "utf-8"}).toString());
            // try to log every key of localConfig based on config, if localConfig is missing keys (or a key is of the wrong type), this will throw an error
            this.log("reading config from local file:");
            for (let key in this.config) {
                if (localConfig[key] != undefined && typeof (this.config as any)[key] === typeof localConfig[key]) {
                    this.log("    ", key, "=>", localConfig[key]);
                } else {
                    throw new Error();
                }
            }
            // if it didnt throw an error localConfig has all the keys of config and will be used as config
            this.config = localConfig;
        } catch {
            // create config.json based on default config if it doesnt exist (or doesnt have all keys with the right types)
            this.error("\nlocal config json file doesn't exist or is not correctly configured, using default config...");
            this.log("config:", this.config);
            fs.writeFileSync(this.configPath, JSON.stringify(this.config), {encoding: "utf-8"});
        }
    }

    /** calls `console.log()` if `this.logToConsole == true` */
    private log(...o: any): void {
        if (this.logToConsole)
            console.log(...o);
    }

    /** calls `console.log()` if `this.logToConsole == true` */
    private error(...o: any): void {
        if (this.logToConsole)
            console.error(...o);
    }

    /**
     * adds `x` days to a date-string, e.g. `"01.01.2022" + 1 = "02.01.2022"`
     * @param date date-string formatted like `"DD.MM.YYYY"`
     * @param x amount of days to be added to the date
     * @returns date-string formatted like `"DD.MM.YYYY"`
     */
    private offsetDateString(date: string, x: number): string {
        const inputParts: number[] = date.split(".").map(x => parseInt(x));
        const dateObject = new Date(inputParts[2], inputParts[1], inputParts[0]);
        dateObject.setMonth(dateObject.getMonth() - 1);
        dateObject.setDate(dateObject.getDate() + 1 + x);
        const outputParts = dateObject.toISOString().substring(0, 10).split("-");
        return `${outputParts[2]}.${outputParts[1]}.${outputParts[0]}`;
    }

    /** @returns todays date formatted like `"DD.MM.YYYY"` */
    private getToday(): string {
        return new Date().toISOString() // "2022-09-16T10:00:48.780Z"
            .substring(0, 10)           // "2022-09-16"
            .split("-")                 // ["2022", "09", "16"]
            .reverse()                  // ["16", "09", "2022"]
            .join(".")                  // "16.09.2022"
        ;  
    }

    /**
     * @param time time string formatted like `"HH:MM"`
     * @returns time in minutes
     */
    private timeStringToMinutes(time: string): number {
        // split hours and minutes
        const parts = time.split(":");
        return parseInt(parts[0]) * 60 + parseInt(parts[1]);
    }

    /**
     * @param time1 time string formatted like `"HH:MM"`
     * @param time2 time string formatted like `"HH:MM"`
     * @returns amount of minutes between the two time strings (absolute value)
     */
    private minutesBetweenTimeStrings(time1: string, time2: string): number {
        return Math.abs(this.timeStringToMinutes(time1) - this.timeStringToMinutes(time2));
    }

    /** @returns string from number of minutes, e.g. `-75 => "-1h 15min"` */
    private minutesToTimeString(minutes: number): string {
        const justHours = Math.floor(Math.abs(minutes) / 60);
        const justMinutes = Math.abs(minutes) - (justHours * 60);
        return (minutes < 0 ? "-" : "") + 
            (justHours != 0 ? justHours+"h" : "") + 
            (justHours != 0 && justMinutes != 0 ? " " : "") + 
            (justMinutes != 0 || (justHours === 0 && justMinutes === 0) ? justMinutes+"min" : "");
    }

    /**
     * downloads csv file of working times with webscraper to the given directory and renames it to given filename (values set in constructor). an old renamed csv file will be deleted if it is present in the download directory.
     * @param showWindow optional: runs webscraper in foreground and shows its browser window if `true` (default is `false`)
     * @returns status code:
     * - 0: everything went fine, the renamed csv file is in the download directory
     * - 1: browser could not be launched (probably due to an incorrect path to its executable or unsupported browser)
     * - 2: fiori couldnt be opened (either no connection at all or not in correct network)
     * - 3: more than two csv files in download directory (user must have put more in there)
     * - 4: the download failed for an unknown reason (happens when config.startDatum is later than config.endDatum)
     */
    public async downloadWorkingTimes(showWindow: boolean = false): Promise<0|1|2|3|4> {
        // launch browser (with preview when in debug mode)
        // use custom browser installation instead of puppeteer chromium to work around certificate issue
        let browser;
        try {
            browser = await puppeteer.launch(showWindow ? {
                executablePath: this.config.browserPfad,
                headless: false,
                defaultViewport: null,
                args: ["--start-maximized"],
            } : {executablePath: this.config.browserPfad});
        } catch {
            return 1;
        }

        // create new page
        const page = await browser.newPage();

        // disable loading useless stuff if window is not shown to user
        if (!showWindow) {
            await page.setRequestInterception(true);
            await page.on("request", request => {
                const blocked = ["image", "video", "font", "stylesheet"];
                if (blocked.includes(request.resourceType()))
                    request.abort();
                else
                    request.continue();
            });
        }

        // workaround to download file in headless mode (to specific directory)
        await page.target().createCDPSession().then(client => client.send("Page.setDownloadBehavior", {
            behavior: "allow",
            downloadPath: this.downloadDir
        }));

        // try to access fiori
        // fails if user is not in correct network or has no connection in general
        try {
            // open fiori and wait until it has finished loading
            await page.goto(this.url, {waitUntil: "networkidle2"});
        } catch {
            // close browser
            await browser.close();
            return 2;
        }

        // process endDatum if its not a specific date but "gestern"/"heute"/"morgen"
        let processedEndDatum = this.config.endDatum;
        {
            const states = ["gestern", "heute", "morgen"];
            if (states.includes(processedEndDatum)) {
                // gestern => -1, heute => 0, morgen => 1
                const offset = states.indexOf(processedEndDatum) - 1;
                // set processedEndDatum to todays date with calculated offset
                processedEndDatum = this.offsetDateString(this.getToday(), offset);
                this.log(`processed config.endDatum "${this.config.endDatum}": calculated "${processedEndDatum}"`);
            }
        }

        const processInput = async (selector: string, date: string, page: puppeteer.Page) => {
            // delete value from "beginning time" input
            await eval(`page.evaluate(() => document.querySelector("${selector}").value = "");`);
            // set timewindow to date
            await page.type(selector, date);
            // press enter to use new input
            await page.keyboard.press("Enter");
            // wait for page to load
            await page.waitForNetworkIdle();
        }

        // from
        await processInput("#application-btccatstime-display-component---Overview--DatumVon-inner", this.config.startDatum, page);
        // to
        await processInput("#application-btccatstime-display-component---Overview--DatumBis-inner", processedEndDatum, page);
        // download csv file
        await page.click("#__button3");
        // wait for download
        await page.waitForNetworkIdle();   
        // close browser
        await browser.close();

        // puppeteer cant download csv file if config.startDatum is later than config.endDatum

        // get all filenames of csv files in download directory
        let csvFileNames = fs.readdirSync(this.downloadDir).filter((file: string) => file.includes(".csv"));
        if (csvFileNames.length > 2) { // too many csv files in directory
            // only happens if user put more csv-files into directory
            return 3;
        }

        // if there are exactly 2 csv files (old renamed one and new just-downloaded one)
        if (csvFileNames.length === 2 && csvFileNames.includes(this.csvFileName)) {
            // delete old renamed file
            fs.unlinkSync(path.join(this.downloadDir, this.csvFileName));
            this.log(`deleted old renamed file "${this.csvFileName}"`);
            // filter out renamed file from list of fileNames
            csvFileNames = csvFileNames.filter((file: string) => file != this.csvFileName);
        }
        
        // if there is exactly one csv file which doesn"t have the wanted file name
        if (csvFileNames.length === 1 && csvFileNames[0] != this.csvFileName) { 

            // rename it to its wanted file name
            fs.renameSync(path.join(this.downloadDir, csvFileNames[0]), path.join(this.downloadDir, this.csvFileName));
            this.log(`renamed new file "${csvFileNames[0]}" to "${this.csvFileName}"`);
            
        } else { // if there are no csv files or just one old, renamed file
            // the download failed for some reason
            return 4;
        }
        
        // return 0 because everything worked :)
        return 0;
    }

    /**
     * calculates overtime from csv file with working times (directory and file name are set in constructor)
     * @returns `undefined` if `filePath` could not be read, otherwise object like...
     * - `kontoString`: overtime as string, e.g. `"-1h 15min"`
     * - `kontoInMin`: overtime in min, e.g. `-75`
     * - `lastDate`: the last date whose data was considered for the calculation (formatted like `"DD.MM.YYYY"`)
     */
    public calculateFromWorkingTimes(): {kontoString: string, kontoInMin: number, lastDate: string} | undefined {
        
        // read file
        let file: string;
        try {
            file = fs.readFileSync(path.join(this.downloadDir, this.csvFileName)).toString();
        } catch {
            return undefined;
        }
        
        // parse into 2d-string-array
        let table: string[][] = file.split("\n").map((s: string) => s.split(";"));
        // delete first element (only contains headlines)
        table.shift();
        
        const wochenstundenInMin = this.config.wochenstunden * 60;
        // date of current entry
        let lastDate = table[0][0];
        // overtime in minutes
        let konto = 0;
        // sum of working times of a single day
        let sumOfWorkingTimes = 0;

        // last entry of csv file whose anwesenheitsart is not "9001 Urlaub"
        const lastEntry = table
            // filter out vacation entries
            .filter(entry => parseInt(entry[1].replace(/[^\d]/g, "")) != 9001)
            // reduce array to its last element
            .filter((value, index, array) => index === array.length - 1)
            // reduce 2d-array to single entry
            [0]
        ;
        
        // for every line of the csv
        for (let entry of table) {
            const date = entry[0];
            // remove everything except digits, then parse to integer
            const anwesenheitsart = parseInt(entry[1].replace(/[^\d]/g, ""));
            // calculate working time in minutes
            const workingTimeInMin = this.minutesBetweenTimeStrings(entry[6], entry[7]);

            // reset variables and save overtime if date is a new one
            if (date != lastDate) {
                // add sum of working times of lastDate to overtime
                konto += sumOfWorkingTimes - (wochenstundenInMin / 5);
                // reset variables
                lastDate = date;
                sumOfWorkingTimes = 0;
            }

            // if anwesenheitsart is not "9003 Gleittag"
            if (anwesenheitsart != 9003) {
                // add working time of current date
                sumOfWorkingTimes += workingTimeInMin;
            }

            // skip entries after lastEntry (break loop if entry and lastEntry are equal)
            if (entry.every((v, i) => v === lastEntry[i]))
                break;
        }

        // process last entry (otherwise wouldn"t get processed because there"s no new date after it)
        konto += sumOfWorkingTimes - (wochenstundenInMin / 5);

        // add startStunden (in minutes) to overtime
        konto += Math.round(this.config.startStunden * 60);

        // return overtime (as string and in minutes) and last working date
        return {
            kontoString: this.minutesToTimeString(konto),
            kontoInMin: konto,
            lastDate
        };
    }
}
