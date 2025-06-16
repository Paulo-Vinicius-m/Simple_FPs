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
const logicalFiles = {};

export enum EPType {
    ExternalInput = "External Input",
    ExternalOutput = "External Output",
    ExternalInquiry = "External Inquiry"
}

export interface Attribute {
    name: string;
    dtype: string;
}

export interface LogicalFile{
    name: string;
    attributes: Attribute[];
}

export interface ElementaryProcess {
    description: string;
    type: EPType;
    referencedLFs: LogicalFile[]; // TODO - Verificar se é necessário apentar para os atributos ou apenas os nomes.

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
                attributes: []
            });

            let matchColumn;
            while ((matchColumn = columnRegex.exec(tableContent)) !== null) {
                this.logicalFiles[this.logicalFiles.length - 1].attributes.push(
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
    public addLF(name: string, attributes: Attribute[]): void {
        // Verifica se já existe um LF com o mesmo nome
        if (this.logicalFiles.some(lf => lf.name === name)) {
            console.warn(`Logical File with name "${name}" already exists. Skipping addition.`);
            return;
        }

        this.logicalFiles.push({
            name: name,
            attributes: attributes
        });
    }

    /**
     * Adds an attribute to an existing Logical File (LF).
     * @param lfName - The name of the Logical File to which the attribute will be added.
     * @param attribute - The attribute to be added.
     */
    public addAttributeToLF(lfName: string, attribute: Attribute): void {
        const lf = this.logicalFiles.find(lf => lf.name === lfName);

        // Verifica se o LF existe
        if (!lf) {
            console.error(`Logical File "${lfName}" not found. Cannot add attribute.`);
            return;
        }

        // Verifica se o atributo já existe
        if (lf.attributes.some(attr => attr.name === attribute.name)) {
            console.warn(`Attribute "${attribute.name}" already exists in Logical File "${lfName}". Skipping addition.`);
            return;
        }

        lf.attributes.push(attribute);
    }

    /**
     * Removes a Logical File (LF) from the analysis.
     * @param name - The name of the Logical File to remove.
     */
    public removeLF(name: string): void {
        // Goes through all the Elementary Processes and removes any reference to the LF being removed
        this.elementaryProcesses.forEach(ep => {
            ep.referencedLFs = ep.referencedLFs.filter(lf => lf.name !== name);
        });

        // Removes the Logical File from the logicalFiles array
        this.logicalFiles = this.logicalFiles.filter(lf => lf.name !== name);
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
    public addEP(description: string, type: EPType, logicalFiles: LogicalFile[]): void{
        // Verify if there is already an Elementary Process with the same description
        if (this.elementaryProcesses.some(ep => ep.description === description)) {
            console.warn(`Elementary Process with description "${description}" already exists. Skipping addition.`);
            return;
        }

        // Verify if the referenced Logical Files and Attributes exist
        for (const lf of logicalFiles) {
            if (!this.logicalFiles.some(existingLF => existingLF.name === lf.name)) {
                console.error(`Logical File "${lf.name}" referenced in Elementary Process "${description}" does not exist.`);
                return;
            }
            for (const attr of lf.attributes) {
                if (!this.logicalFiles.find(existingLF => existingLF.name === lf.name)?.attributes.some(existingAttr => existingAttr.name === attr.name)) {
                    console.error(`Attribute "${attr.name}" in Logical File "${lf.name}" referenced in Elementary Process "${description}" does not exist.`);
                    return;
                }
            }
        }

        this.elementaryProcesses.push({
            description: description,
            type: type,
            referencedLFs: logicalFiles
        });
    }
    /*
    public removeEP(){};

    public evaluateFPs(){};*/
}