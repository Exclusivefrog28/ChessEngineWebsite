function OrganizedWorker(workerPath) {
    const reports = {};
    const worker = new Worker(workerPath, {type: 'module'});

    worker.onerror = (e) => {
        console.log(e);
    }

    this.register = (name, callback) => {
        reports[name] = (...data) => {
            const result = callback(...data);
            if (result !== undefined) postMessage({name: name, data: [result]});
        };
        return this;
    }

    this.registerAsync = (name, callback) => {
        reports[name] = (...data) => {
            callback(...arguments).then(result => postMessage({name: name, data: [result]}));
        };
        return this;
    }

    this.call = (name, ...data) => {
        const promise = new Promise((resolve, reject) => {
            reports[name] = (result) => {
                resolve(result);
            }
        })
        worker.postMessage({name: name, data: data});
        return promise
    }

    worker.onmessage = (e) => {
        if (e.data.name in reports) {
            reports[e.data.name](...e.data.data);
        } else {
            throw new ReferenceError(`Report with name \"${e.data.name}\" has not been registered!`);
        }
    }
}

export function Manager() {
    const jobs = {};

    this.register = (name, func) => {
        jobs[name] = (...data) => {
            const result = func(...data);
            if (result !== undefined) postMessage({name: name, data: [result]});
        };
        return this;
    }

    this.registerAsync = (name, callback) => {
        jobs[name] = (...data) => {
            callback(...arguments).then(result => postMessage({name: name, data: [result]}));
        };
        return this;
    }

    this.call = (name, ...data) => {
        const promise = new Promise((resolve, reject) => {
            jobs[name] = (result) => {
                resolve(result);
            }
        })
        postMessage({name: name, data: data});
        return promise
    }

    onmessage = (e) => {
        if (e.data.name in jobs) {
            jobs[e.data.name](...e.data.data);
        } else {
            throw new ReferenceError(`Job with name \"${e.data.name}\" has not been registered!`);
        }
    }

}

export default OrganizedWorker;