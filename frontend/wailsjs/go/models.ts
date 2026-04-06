export namespace dialog {
	
	export class FileFilter {
	    DisplayName: string;
	    Pattern: string;
	
	    static createFrom(source: any = {}) {
	        return new FileFilter(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.DisplayName = source["DisplayName"];
	        this.Pattern = source["Pattern"];
	    }
	}

}

export namespace file {
	
	export class FileEntry {
	    name: string;
	    path: string;
	    isDir: boolean;
	    children?: FileEntry[];
	
	    static createFrom(source: any = {}) {
	        return new FileEntry(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.path = source["path"];
	        this.isDir = source["isDir"];
	        this.children = this.convertValues(source["children"], FileEntry);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}

}

export namespace process {
	
	export class StartRequest {
	    RunID: string;
	    VoltPath: string;
	    Command: string;
	    Args: string[];
	    Stdin: string;
	    StdoutMode: string;
	    StderrMode: string;
	    StartFailedMessage: string;
	    StreamFailedMessage: string;
	    RunFailedMessage: string;
	
	    static createFrom(source: any = {}) {
	        return new StartRequest(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.RunID = source["RunID"];
	        this.VoltPath = source["VoltPath"];
	        this.Command = source["Command"];
	        this.Args = source["Args"];
	        this.Stdin = source["Stdin"];
	        this.StdoutMode = source["StdoutMode"];
	        this.StderrMode = source["StderrMode"];
	        this.StartFailedMessage = source["StartFailedMessage"];
	        this.StreamFailedMessage = source["StreamFailedMessage"];
	        this.RunFailedMessage = source["RunFailedMessage"];
	    }
	}

}

export namespace storage {
	
	export class KVEntry {
	    key: string;
	    value: number[];
	
	    static createFrom(source: any = {}) {
	        return new KVEntry(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.key = source["key"];
	        this.value = source["value"];
	    }
	}

}

