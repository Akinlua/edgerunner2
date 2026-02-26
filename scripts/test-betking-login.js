import puppeteer from "puppeteer-extra";
import stealthPlugin from "puppeteer-extra-plugin-stealth";
import chalk from "chalk";
import BetKingBookmaker from "../src/interfaces/bookmakers/betking/index.js";
import { Store } from "../src/bots/edgerunner/store.js";

puppeteer.use(stealthPlugin());

function getArg(flag, def = undefined) {
    const idx = process.argv.indexOf(flag);
    if (idx !== -1 && idx + 1 < process.argv.length) return process.argv[idx + 1];
    return def;
}

async function main() {
    const username = getArg("--username");
    const password = getArg("--password");
    const proxyIp = getArg("--proxy");        // e.g. "1.2.3.4:8080"
    const proxyUser = getArg("--proxy-user");   // optional
    const proxyPass = getArg("--proxy-pass");   // optional

    if (!username || !password) {
        console.error(chalk.red(
            "Usage: node scripts/test-betking-login.js " +
            "--username USER --password PASS " +
            "[--proxy ip:port] [--proxy-user U] [--proxy-pass P]"
        ));
        process.exit(1);
    }

    const launchArgs = [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--no-zygote",
        "--single-process",
        "--disable-gpu",
        "--disable-dev-shm-usage",
    ];

    if (proxyIp) {
        launchArgs.push(`--proxy-server=${proxyIp}`);
        console.log(chalk.blue(`[Proxy] Using proxy: ${proxyIp}`));
    }

    console.log(chalk.cyan("[Test] Launching browser..."));
    const browser = await puppeteer.launch({
        headless: false,
        args: launchArgs,
        defaultTimeout: 60_000,
        protocolTimeout: 60_000,
    });

    // Validate proxy by checking exit IP
    if (proxyIp) {
        let testPage;
        try {
            const localIp = await (await fetch("https://api.ipify.org")).text();
            console.log(chalk.gray(`[Proxy] Local IP: ${localIp}`));

            testPage = await browser.newPage();
            if (proxyUser && proxyPass) {
                await testPage.authenticate({ username: proxyUser, password: proxyPass });
            }
            await testPage.goto("https://api.ipify.org", { waitUntil: "domcontentloaded", timeout: 60_000 });
            const exitIp = (await testPage.evaluate(() => document.body.innerText)).trim();
            await testPage.close();

            if (exitIp !== localIp.trim()) {
                console.log(chalk.green.bold(`[Proxy] ✅ Proxy working! Exit IP: ${exitIp}`));
            } else {
                console.log(chalk.red.bold(`[Proxy] ❌ Proxy did NOT change IP (still ${exitIp}). Stopping.`));
                await browser.close();
                process.exit(1);
            }
        } catch (err) {
            if (testPage) await testPage.close().catch(() => { });
            console.error(chalk.red(`[Proxy] ❌ Proxy validation failed: ${err.message}`));
            await browser.close();
            process.exit(1);
        }
    }

    // Authenticate all pages (including the login page) if proxy creds are set
    if (proxyIp && proxyUser && proxyPass) {
        browser.on("targetcreated", async (target) => {
            const page = await target.page();
            if (page) {
                await page.authenticate({ username: proxyUser, password: proxyPass }).catch(() => { });
            }
        });
    }

    try {
        const store = new Store(username);
        await store.initialize();

        const bookmaker = new BetKingBookmaker(
            { name: "BetKing", username, password },
            browser,
            store
        );

        console.log(chalk.cyan(`[Test] Attempting sign-in for: ${username}`));
        const result = await bookmaker.signin(username, password);

        if (result.success) {
            console.log(chalk.green(`[Test] ✅ Login SUCCESS!`));
            console.log(chalk.green(`[Test] Access token: ${result.accessToken ? result.accessToken.slice(0, 20) + "..." : "N/A"}`));
        } else {
            console.log(chalk.red(`[Test] ❌ Login FAILED: ${result.error}`));
        }
    } catch (err) {
        console.error(chalk.red(`[Test] ❌ ERROR: ${err.message}`));
        process.exitCode = 1;
    } finally {
        await browser.close();
        console.log(chalk.gray("[Test] Browser closed."));
    }
}

main();

