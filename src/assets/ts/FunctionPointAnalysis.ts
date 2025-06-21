// Parte do programa dedicada a identificar tabelas e colunas presentes no SQL.
// A ideia é poder expandir para leitura de outros bancos SQL além do SQLite e para outras formas de contagem no futuro.
const sqlScript = `
CREATE TABLE IF NOT EXISTS "Mensagem_Inicial" (
    "id" INTEGER NOT NULL UNIQUE,
    "Texto" TEXT,
    PRIMARY KEY("id")
);
CREATE TABLE IF NOT EXISTS "Categoria" (
    "id" INTEGER NOT NULL UNIQUE,
    "Nome_da_categoria" TEXT,
    PRIMARY KEY("id")
);
CREATE TABLE IF NOT EXISTS "Mensagem_da_categoria" (
    "id" INTEGER NOT NULL UNIQUE,
    "ID_Categoria" INTEGER,
    "Texto" TEXT,
    "Resposta" TEXT,
    PRIMARY KEY("id"),
    FOREIGN KEY ("id") REFERENCES "Categoria"("id")
    ON UPDATE NO ACTION ON DELETE NO ACTION
);
CREATE TABLE IF NOT EXISTS "Acao" (
    "id" INTEGER NOT NULL UNIQUE,
    "tipo" TEXT,
    "Valor" TEXT,
    "Mensagem" INTEGER,
    PRIMARY KEY("id"),
    FOREIGN KEY ("Mensagem") REFERENCES "Mensagem_da_categoria"("id")
    ON UPDATE NO ACTION ON DELETE NO ACTION
);
`;

export enum EPType {
    ExternalInput = "EI",
    ExternalOutput = "EO",
    ExternalInquiry = "EQ"
}

export interface DataElement {
    name: string;
    dtype: string;
}

export interface LogicalFile{
    name: string;
    dataElements: DataElement[];
}

export interface ElementaryProcess {
    id: string;
    description: string;
    type: EPType;
    dataElements: {name: string, logicalFileName: string}[];
}

// Regex para capturar tabelas
const tableRegex = /CREATE TABLE IF NOT EXISTS\s+"([\w_]+)"\s*\(([\s\S]+?)\);/g;

// Regex para capturar colunas dentro da definição da tabela
const columnRegex = /"([\w_]+)"\s+([\w]+)/g;



export class FPAnalysis{
    private logicalFiles: LogicalFile[] = [];
    private elementaryProcesses: ElementaryProcess[] = [];
    /*constructor(){
    }*/

    /**
     * Parses the SQL script and extracts table names and their columns.
     * *Resets the logicalFiles array before parsing.
     */
    public readSQL(sql: string): void{
        this.logicalFiles = [];
        let matchTable;

        while ((matchTable = tableRegex.exec(sql)) !== null) {
            const tableContent = matchTable[2].toString();
            this.logicalFiles.push({
                name: matchTable[1].toString(),
                dataElements: []
            });

            let matchColumn;
            while ((matchColumn = columnRegex.exec(tableContent)) !== null) {
                this.logicalFiles[this.logicalFiles.length - 1].dataElements.push(
                    {
                        name: matchColumn[1].toString(),
                        dtype: matchColumn[2].toString()
                    }
                );
            }
        }
    }

    /**
     * Adds a Logical File (LF) to the analysis.
     * @param name - The name of the Logical File.
     * @param attributes - An array of attributes for the Logical File.
     */
    public addLF(name: string, attributes: DataElement[]): void {
        // Verifica se já existe um LF com o mesmo nome
        if (this.logicalFiles.some(lf => lf.name === name)) {
            console.warn(`Logical File with name "${name}" already exists. Skipping addition.`);
            return;
        }

        this.logicalFiles.push({
            name: name,
            dataElements: attributes
        });
    }

    /**
     * Adds an attribute to an existing Logical File (LF).
     * @param lfName - The name of the Logical File to which the attribute will be added.
     * @param dataElement - The data element to be added.
     */
    public addDataElementToLF(lfName: string, dataElement: DataElement): void {
        const lf = this.logicalFiles.find(lf => lf.name === lfName);

        // Verifica se o LF existe
        if (!lf) {
            console.error(`Logical File "${lfName}" not found. Cannot add data element.`);
            return;
        }

        // Verifica se o data element já existe
        if (lf.dataElements.some(attr => attr.name === dataElement.name)) {
            console.warn(`Data Element "${dataElement.name}" already exists in Logical File "${lfName}". Skipping addition.`);
            return;
        }

        lf.dataElements.push(dataElement);
    }

    /**
     * Removes a Logical File (LF) from the analysis.
     * @param name - The name of the Logical File to remove.
     */
    public removeLF(name: string): void {
        // Goes through all the Elementary Processes and removes any reference to the LF being removed
        this.elementaryProcesses.forEach(ep => {
            ep.dataElements = ep.dataElements.filter(lf => lf.name !== name);
        });

        // Removes the Logical File from the logicalFiles array
        this.logicalFiles = this.logicalFiles.filter(lf => lf.name !== name);
    }

    
    /**
     * Removes an attribute from a Logical File (LF).
     * @param lfName - The name of the Logical File from which the attribute will be removed.
     * @param dataElement - The name of the attribute to be removed.
     */
    public removeDataElementFromLF(lfName: string, dataElement: string): void {
        const lf = this.logicalFiles.find(lf => lf.name === lfName);

        // Verify if the Logical File exists
        if (!lf) {
            console.error(`Logical File "${lfName}" not found. Cannot remove data element.`);
            return;
        }

        // Update the Elementary Processes to remove references to the data element
        this.elementaryProcesses.forEach(ep => {
            ep.dataElements = ep.dataElements.filter(de => {
                return !(de.logicalFileName === lfName && de.name === dataElement);
            });
        });

        // Remove the data element from the Logical File
        lf.dataElements = lf.dataElements.filter(attr => attr.name !== dataElement);
    }

    /**
     * Retrieves the list of Logical Files (LFs).
     * @returns An array of Logical Files.
     */
    public getLFs(){
        return this.logicalFiles;
    }

    /**
     * Adds an Elementary Process (EP) to the analysis.
     * @param description - A description of the Elementary Process.
     * @param type - The type of the Elementary Process (External Input, External Output, or External Inquiry).
     * @param logicalFiles - An array of Logical Files referenced by the Elementary Process.
     */
    public addEP(description: string, type: EPType, dataElements: {name: string, logicalFileName: string}[]): void{
        // Verify if the referenced Logical Files and Attributes exist
        for (const {name, logicalFileName} of dataElements) {
            const lf = this.logicalFiles.find(lf => lf.name === logicalFileName);

            // Verify if the Logical File exists
            if (!lf) {
                console.error(`Logical File "${logicalFileName}" referenced in Elementary Process "${description}" does not exist.`);
                return;
            }
            // Verify if the Data Element exists in the Logical File
            for (const DataElement of lf.dataElements) {
                if (!lf.dataElements.some(existingDE => existingDE.name === DataElement.name)) {
                    console.error(`Data Element "${DataElement.name}" in Logical File "${logicalFileName}" referenced in Elementary Process "${description}" does not exist.`);
                    return;
                }
            }
        }

        const newId = `${type}_${this.elementaryProcesses.filter(ep => ep.type === type).length + 1}`;

        this.elementaryProcesses.push({
            id: newId,
            description: description,
            type: type,
            dataElements: dataElements
        });
    }

    /**
     * Retrieves the list of Elementary Processes (EPs).
     * @returns An array of Elementary Processes.
     */
    public getEPs(){
        return this.elementaryProcesses;
    }

    /**
     * Removes an Elementary Process (EP) from the analysis.
     * @param description - The description of the Elementary Process to remove.
     */
    public removeEP(id: string): void {
        // Remove the Elementary Process from the elementaryProcesses array
        this.elementaryProcesses = this.elementaryProcesses.filter(ep => ep.id !== id);
    }

    /**
     * Removes Data Element Types (DETs) from an Elementary Process (EP).
     * @param epId - The ID of the Elementary Process.
     * @param logicalFileName - The name of the Logical File.
     * @param dataElementName - The name of the attribute to remove.
     */
    public removeDETsFromEP(epId: string, logicalFileName: string, dataElementName: string): void {
        const ep = this.elementaryProcesses.find(ep => ep.id === epId);

        // Verify if the Elementary Process exists
        if (!ep) {
            console.error(`Elementary Process "${epId}" not found. Cannot remove DET.`);
            return;
        }

        // Remove the Data Element Type (DET) from the Elementary Process
        ep.dataElements = ep.dataElements.filter(de => !(de.logicalFileName === logicalFileName && de.name === dataElementName));
    }

    /**
     * Adds a Data Element Type (DET) to an Elementary Process (EP).
     * @param epId - The ID of the Elementary Process.
     * @param dataElement - The data element to add.
     */
    public addDETToEP(epId: string, dataElement: {name: string, logicalFileName: string}): void {
        const ep = this.elementaryProcesses.find(ep => ep.id === epId);

        // Verify if the Elementary Process exists
        if (!ep) {
            console.error(`Elementary Process "${epId}" not found. Cannot add DET.`);
            return;
        }

        // Verify if the referenced Logical File and Attribute exist
        const lf = this.logicalFiles.find(lf => lf.name === dataElement.logicalFileName);
        if (!lf) {
            console.error(`Logical File "${dataElement.logicalFileName}" referenced in Elementary Process "${ep.description}" does not exist.`);
            return;
        }
        if (!lf.dataElements.some(existingDE => existingDE.name === dataElement.name)) {
            console.error(`Data Element "${dataElement.name}" in Logical File "${dataElement.logicalFileName}" referenced in Elementary Process "${ep.description}" does not exist.`);
            return;
        }

        // Verify if the DET already exists in the EP
        if (ep.dataElements.some(det => det.logicalFileName === dataElement.logicalFileName && det.name === dataElement.name)) {
            console.warn(`DET "${dataElement.name}" from "${dataElement.logicalFileName}" already exists in EP "${epId}". Skipping addition.`);
            return;
        }

        ep.dataElements.push(dataElement);
    }

    /*
    public evaluateFPs(){};
    */
}