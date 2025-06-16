import { LogicalFile } from './LogicalFileFinder';

export interface ElementaryProcess {
    description: string;
    referencedTables: LogicalFile[];
}

class ElementaryProcessFinder {

    private elementaryProcesses: ElementaryProcess[] = [];
    constructor() {
    }

    public addElementaryProcess(description: string, referencedTables: LogicalFile[]): void {
        
    }
}