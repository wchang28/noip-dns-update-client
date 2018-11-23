import * as pp from "periodic-polling";
import {get as getMyIP} from "my-ip-ipify";
import {DNSUpdator} from "noip-dns-update";
import {get as getIPWatcher} from "./ip-watcher";
import * as request from "superagent";

let noipUsername = process.env.NOIP_USERNAME;
let noipPassword = process.env.NOIP_PASSWORD;
let hostname = process.env.HOSTNAME;
let ipChangedNotifyWebhookUrl = process.env.IP_CHANGED_NOTIFY_WEBHOOK_URL;

if (!noipUsername) {
    console.error(`[${new Date().toISOString()}]: env.NOIP_USERNAME is not set`);
    process.exit(1);
}

if (!noipPassword) {
    console.error(`[${new Date().toISOString()}]: env.NOIP_PASSWORD is not set`);
    process.exit(1);
}

if (!hostname) {
    console.error(`[${new Date().toISOString()}]: env.HOSTNAME is not set`);
    process.exit(1);
}

console.log(`[${new Date().toISOString()}]: noipUsername=${noipUsername}`);
console.log(`[${new Date().toISOString()}]: noipPassword=${noipPassword}`);
console.log(`[${new Date().toISOString()}]: hostname=${hostname}`);

let dnsUpdator = new DNSUpdator(noipUsername, noipPassword);
let ipWatcher = getIPWatcher();

let updateDNS = async (newIP: string) => {
    try {
        console.log(`[${new Date().toISOString()}]: updating dns: ${hostname} ===> ${newIP} ...`);
        let updateResult = await dnsUpdator.update(hostname, newIP);
        console.log(`[${new Date().toISOString()}]: update result: ${updateResult}`);
        return updateResult;
    } catch(e) {
        console.error(`[${new Date().toISOString()}]: dns update error: ${JSON.stringify(e)}`);
        return JSON.stringify(e); 
    }
};

let notifyIPChanged = async (oldIP: string, newIP: string) => {
    try {
        if (ipChangedNotifyWebhookUrl) {
            let res = await request.get(ipChangedNotifyWebhookUrl).query({oldIP, newIP}).timeout(10000);
        }
    } catch(e) {
        console.error(`[${new Date().toISOString()}]: error notifying ip changed webhook ${ipChangedNotifyWebhookUrl}: ${JSON.stringify(e)}`);
    }
};

ipWatcher.on("ip-changed", async (oldIP: string, newIP: string) => {
    console.log(`[${new Date().toISOString()}]: <<IP-CHANGED>>: ${oldIP} ===> ${newIP}`);
    let dnsUpdateResult = await updateDNS(newIP);
    await notifyIPChanged(oldIP, newIP);
});

pp.PeriodicPolling.get(() => getMyIP(), 60)
.on("error", (err: any) => {
    console.error(`[${new Date().toISOString()}]: error polling ip. err=${JSON.stringify(err)}`);
}).on("before-poll", () => {
    console.log(`[${new Date().toISOString()}]: `);
    console.log(`[${new Date().toISOString()}]: polling ip address...`);
}).on("polled", (myIP: string) => {
    console.log(`[${new Date().toISOString()}]: myIP=${myIP}`);
    ipWatcher.ip = myIP;
}).start();