import * as events from "events";

export interface IPWatcher {
    on(event: "ip-changed", listner: (oldIP: string, newIP: string) => void): this;
    ip: string;
}

class IPWatcherClass extends events.EventEmitter {
    private _ip: string;
    constructor() {
        super();
        this._ip = null;
    }
    get ip(): string {return this._ip;}
    set ip(value: string) {
        if (value !== this._ip) {
            let oldIP = this._ip;
            this._ip = value;
            this.emit("ip-changed", oldIP, this._ip);
        }
    }
}

export function get(): IPWatcher {
    return new IPWatcherClass();
}