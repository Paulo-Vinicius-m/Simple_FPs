<!--
/**
 * LogicalFiles Component
 * 
 * A Vue component for managing Logical Files in Function Point Analysis (FPA).
 * This component allows users to:
 * - Parse SQL scripts to extract logical files and their Data Elements
 * - Add new logical files manually
 * - Add/remove Data Elements from existing logical files
 * - View all logical files in a structured table format
 * 
 * @component
 * @example
 * <LogicalFiles 
 *    :FPA="fpaInstance" 
 *    :triggerRefresh="triggerRefresh"
 *    @refreshLFs="refreshLFs" 
 * />
 */
-->
<script lang="ts">
import { defineComponent, ref, watch, computed, onMounted, triggerRef } from 'vue';
import { FPAnalysis, type DataElement, LFType } from '../assets/ts/FunctionPointAnalysis';


export default defineComponent({
    name: 'LogicalFiles',
    props: {
        /** Function Point Analysis instance for managing logical files */
        FPA: {
            type: FPAnalysis,
            required: true
        },
        triggerRefresh: {
            type: Number,
            required: false,
            default: 0 // Default value for reactivity
        }
    },
    emits: ['refreshLFs'],
    
    setup(props: {FPA: FPAnalysis; triggerRefresh: number}, { emit }) {
        // ==========================================
        // REACTIVE STATE
        // ==========================================
        
        /** Force reactivity trigger for computed properties */
        const forceUpdate = ref<number>(0);
        
        /** SQL input text for parsing */
        const sqlInput = ref<string>('');
        
        /** Form data for creating new logical file */
        const newLogicalFileForm = ref<{
            name: string;
            type: LFType; // Optional type, can be set later
            dataElements: DataElement[];
            description?: string;
            parentName?: string; // Optional parent name for RET type
        }>({
            name: '',
            type: LFType.InternalLogicalFile,
            dataElements: [{ name: '', dtype: '' }],
            description: '',
            parentName: ''
        });

        /** Input tracking for adding data elements to existing logical files */
        const newDataElements = ref<Record<string, DataElement>>({});

        // ==========================================
        // COMPUTED PROPERTIES
        // ==========================================
        
        /** 
         * Computed property for logical files with forced reactivity
         * @returns Array of logical files from FPA instance
         */
        const logicalFiles = computed(() => {
            // eslint-disable-next-line @typescript-eslint/no-unused-expressions
            forceUpdate.value; // Trigger reactivity
            return props.FPA.getLFs();
        });

        // ==========================================
        // UTILITY FUNCTIONS
        // ==========================================
        
        /**
         * Initializes data element input refs for all logical files
         * Ensures each logical file has corresponding input fields
         */
        const initializeDataElementInputs = (): void => {
            logicalFiles.value.forEach(lf => {
                if (!newDataElements.value[lf.name]) {
                    newDataElements.value[lf.name] = { name: '', dtype: '' };
                }
            });
        };

        /**
         * Triggers component reactivity and initializes inputs
         * Used after data changes to ensure UI updates
         * This function is called whenever logical files are updated
         */
        const outdatedLFs = (): void => {
            forceUpdate.value++;
            initializeDataElementInputs();
            emit('refreshLFs');
        };

        /**
         * Clears data element input for a specific logical file
         * @param lfName - Name of the logical file
         */
        const clearDataElementInput = (lfName: string): void => {
            if (newDataElements.value[lfName]) {
                newDataElements.value[lfName].name = '';
                newDataElements.value[lfName].dtype = '';
            }
        };

        // ==========================================
        // MAIN OPERATIONS
        // ==========================================

        /**
         * Parses SQL input and extracts logical files
         * Updates the FPA instance with discovered logical files
         */
        const parseSQL = (): void => {
            if (!sqlInput.value.trim()) {
                console.warn('SQL input is empty');
                return;
            }

            try {
                props.FPA.readSQL(sqlInput.value);
                outdatedLFs();
                console.log('Successfully parsed SQL and found logical files:', logicalFiles.value);
            } catch (error) {
                console.error('Error parsing SQL:', error);
            }
        };

        /**
         * Adds a new logical file to the FPA instance
         * @param name - Name of the logical file
         * @param type - Type of the logical file (ILF, EIF or RET)
         * @param dataElements - Array of data elements for the logical file
         * @param description - Optional description for the logical file
         */
        const addLogicalFile = (name: string, type: LFType, dataElements: DataElement[], description?: string, parentName?: string): void => {
            if (!name.trim()) {
                console.warn('Logical file name cannot be empty');
                return;
            }

            if (!dataElements.length || !dataElements[0]?.name?.trim() || !dataElements[0]?.dtype?.trim()) {
                console.warn('At least one valid data element is required');
                return;
            }

            if (type === LFType.RecordElementType) {
                if (!parentName?.trim()) {
                    console.warn('Parent logical file name is required for Record Element Type');
                    return;
                }

                if (!props.FPA.getLFs().some(lf => lf.name === parentName.trim())) {
                    console.warn(`Parent logical file "${parentName}" does not exist`);
                    return;
                }
            }

            if (props.FPA.getLFs().some(lf => lf.name === name)) {
                console.warn(`Logical file with name "${name}" already exists`);
                return;
            }

            try {
                props.FPA.addLF(name.trim(), type, dataElements, description?.trim() || undefined, parentName?.trim() || undefined); // Add logical file to FPA instance
                
                // Reset form state after successful addition
                newDataElements.value[name] = { name: '', dtype: '' };
                newLogicalFileForm.value = {
                    name: '',
                    type: LFType.InternalLogicalFile,
                    dataElements: [{ name: '', dtype: '' }],
                    description: '',
                    parentName: ''
                };

                outdatedLFs();
                console.log(`Successfully added logical file: ${name}`);
            } catch (error) {
                console.error('Error adding logical file:', error);
            }
        };

        /**
         * Adds an Data Element to an existing logical file
         * @param lfName - Name of the logical file
         * @param dataElement - Data element to add
         */
        const addDataElementToLogicalFile = (lfName: string, dataElement: DataElement): void => {
            if (!dataElement.name.trim() || !dataElement.dtype.trim()) {
                console.warn('Data element name and type are required');
                return;
            }

            try {
                props.FPA.addDataElementToLF(lfName, {
                    name: dataElement.name.trim(),
                    dtype: dataElement.dtype.trim()
                });
                clearDataElementInput(lfName);
                outdatedLFs();
                console.log(`Successfully added data element ${dataElement.name} to ${lfName}`);
            } catch (error) {
                console.error('Error adding data element:', error);
            }
        };

        /**
         * Removes a data element from a logical file
         * @param lfName - Name of the logical file
         * @param dataElementName - Name of the data element to remove
         */
        const removeDataElementFromLogicalFile = (lfName: string, dataElementName: string): void => {
            try {
                props.FPA.removeDataElementFromLF(lfName, dataElementName);
                outdatedLFs();
                console.log(`Successfully removed data element ${dataElementName} from ${lfName}`);
            } catch (error) {
                console.error('Error removing data element:', error);
            }
        };

        /**
         * Removes a logical file from the FPA instance
         * @param lfName - Name of the logical file to remove
         */
        const removeLogicalFile = (lfName: string): void => {
            try {
                props.FPA.removeLF(lfName);
                outdatedLFs();
                console.log(`Successfully removed logical file: ${lfName}`);
            } catch (error) {
                console.error('Error removing logical file:', error);
            }
        };

        /**
         * Creates a new logical file from the form data
         */
        const createNewLogicalFile = (): void => {
            const { name, type, dataElements, description, parentName } = newLogicalFileForm.value;
            // Remove empty data elements
            const filteredDataElements = dataElements.filter(de => de.name.trim() && de.dtype.trim()); // Filter out empty data elements
            if (!name.trim() || !filteredDataElements.length) {
                console.warn('Logical file name and at least one data element are required');
                return;
            }
            if (type === LFType.RecordElementType && !parentName?.trim()) {
                console.warn('Parent logical file name is required for Record Element Type');
                return;
            }

            console.log(`Creating new logical file: ${name} with data elements:`, filteredDataElements);
            addLogicalFile(name, type, filteredDataElements, description, parentName);
        };

        // ==========================================
        // LIFECYCLE & WATCHERS
        // ==========================================

        /**
         * Watches for changes in refreshTrigger prop
         * Triggers update when parent component requests refresh
         */
        watch(() => props.triggerRefresh, () => {
            outdatedLFs();
        });

        /**
         * Component initialization
         */
        onMounted(() => {
            initializeDataElementInputs();
        });

        // ==========================================
        // TEMPLATE EXPORTS
        // ==========================================

        return {
            // Computed
            logicalFiles,
            
            // Reactive state
            sqlInput,
            newLogicalFileForm,
            newDataElements,
            
            // Methods
            parseSQL,
            createNewLogicalFile,
            addDataElementToLogicalFile,
            removeDataElementFromLogicalFile,
            removeLogicalFile,
            
            // Utilities (exposed for template debugging)
            outdatedLFs,

            // Form Options
            LFType: LFType,
        };
    },
});
</script>

<template>
    <div class="logical-files-container">
        <!-- SQL Parser Section -->
        <section class="sql-parser-section">
            <h2>SQL Parser</h2>
            <div class="input-group">
                <textarea 
                    v-model="sqlInput" 
                    class="sql-input"
                    placeholder="Copy your SQL code here..."
                    rows="4"
                />
                <button 
                    @click="parseSQL" 
                    class="primary-button"
                    :disabled="!sqlInput.trim()"
                >
                    Find Logical Files
                </button>
            </div>
        </section>

        <!-- Logical Files Display Section -->
        <section class="logical-files-section">
            <h2>Logical Files</h2>
            <!-- Display message when no logical files exist -->
            <div v-if="!logicalFiles.length" class="no-files-message">
                <p>No logical files found. Parse SQL code or add files manually.</p>
            </div>
            <!-- Logical Files Tables -->
            <div v-else class="logical-files-grid">
                <table 
                    v-for="lf in logicalFiles" 
                    :key="lf.name" 
                    class="logical-file-table"
                >
                    <!-- Table Header -->
                    <thead>
                        <tr>
                            <th colspan="2" class="table-title">
                                <button 
                                    class="alert-button small-button"
                                    :title="`Remove ${lf.name}`"
                                >
                                    {{ lf.type }}
                                </button>
                                {{ lf.name }}
                            </th>
                            <th colspan="1" class="table-title">
                                <button 
                                    @click="removeLogicalFile(lf.name)"
                                    class="danger-button small-button"
                                    :title="`Remove ${lf.name}`"
                                >
                                    Remove
                                </button>
                            </th>
                        </tr>
                        <tr v-if="lf.description">
                            <td colspan="3" class="lf-description-cell">
                                <em>{{ lf.description }}</em>
                            </td>
                        </tr>
                        <tr>
                            <th class="column-header">Data Element Name</th>
                            <th class="column-header">Data Element Type</th>
                            <th class="column-header">Actions</th>
                        </tr>
                    </thead>

                    <!-- Table Body -->
                    <tbody>
                        <!-- Existing Data Elements -->
                        <tr 
                            v-for="dataElement in lf.dataElements" 
                            :key="dataElement.name"
                            class="dataElement-row"
                        >
                            <td class="dataElement-name">{{ dataElement.name }}</td>
                            <td class="dataElement-type">{{ dataElement.dtype }}</td>
                            <td class="dataElement-actions">
                                <button 
                                    @click="removeDataElementFromLogicalFile(lf.name, dataElement.name)"
                                    class="danger-button small-button"
                                    :title="`Remove ${dataElement.name} from ${lf.name}`"
                                >
                                    Remove
                                </button>
                            </td>
                        </tr>

                        <!-- Add New Data Element Row -->
                        <tr class="add-dataElement-row">
                            <td>
                                <input 
                                    v-model="newDataElements[lf.name].name" 
                                    type="text"
                                    class="dataElement-input"
                                    placeholder="Data Element Name"
                                    maxlength="50"
                                />
                            </td>
                            <td>
                                <input 
                                    v-model="newDataElements[lf.name].dtype"
                                    type="text" 
                                    class="dataElement-input"
                                    placeholder="Data Element Type"
                                    maxlength="30"
                                />
                            </td>
                            <td>
                                <button 
                                    @click="addDataElementToLogicalFile(lf.name, newDataElements[lf.name])"
                                    class="success-button small-button"
                                    :disabled="!newDataElements[lf.name]?.name?.trim() || !newDataElements[lf.name]?.dtype?.trim()"
                                    title="Add new data element"
                                >
                                    Add
                                </button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </section>

        <!-- Add New Logical File Section -->
        <section class="add-logical-file-section">
            <h2>Add New Logical File</h2>
            <div class="form-actions">
                <button 
                    @click="createNewLogicalFile"
                    class="primary-button"
                    :disabled="!newLogicalFileForm.name.trim() || !newLogicalFileForm.dataElements[0].name.trim() || !newLogicalFileForm.dataElements[0].dtype.trim()"
                >
                    Add Logical File
                </button>
            </div>
           
            <table  class="logical-file-table">
                <!-- Table Header -->
                <thead>
                    <tr>
                        <th colspan="3" class="table-title">
                            <select 
                                v-model="newLogicalFileForm.type" 
                                class="form-input"
                                style="margin-right: 1%;"
                                title="Select Logical File Type"
                            >
                                <option 
                                    v-for="type in Object.values(LFType)" :key="type" :value="type"
                                    >
                                    {{ type }}
                                </option>
                            </select>
                            <input
                                type="text" 
                                class="form-input"
                                id="parentName"
                                v-model="newLogicalFileForm.parentName" 
                                placeholder="Parent Logical File Name"
                                v-if="newLogicalFileForm.type === LFType.RecordElementType"
                            >
                            <input
                                type="text"
                                class="form-input"
                                v-model="newLogicalFileForm.name" 
                                placeholder="Logical File Name"
                            >
                        </th>
                    </tr>
                    <tr>
                        <td colspan="3" class="lf-description-cell">
                            <input 
                                class="form-input"
                                v-model="newLogicalFileForm.description" 
                                placeholder="Description (optional)" 
                            />
                        </td>
                    </tr>
                    <tr>
                        <th class="column-header">Data Element Name</th>
                        <th class="column-header">Data Element Type</th>
                        <th class="column-header">Actions</th>
                    </tr>
                </thead>

                <!-- Adding multiple data elements -->
                <tbody>
                    <!-- Existing Data Elements -->
                    <tr
                        class="data-element-row"
                        v-for="(dataElement, index) in newLogicalFileForm.dataElements.slice(0, -1)"
                        :key="index"
                    >
                        <td class="data-element-name">{{ dataElement.name }}</td>
                        <td class="data-element-type">{{ dataElement.dtype }}</td>
                        <td class="data-element-actions">
                            <button 
                                @click="newLogicalFileForm.dataElements.splice(index, 1)"
                                class="danger-button small-button"
                                :title="`Remove ${dataElement.name} from ${newLogicalFileForm.name}`"
                            >
                                Remove
                            </button>
                        </td>
                    </tr>

                    <!-- Add New Data Element Row -->
                    <tr class="add-data-element-row">
                        <td>
                            <input 
                                v-model="newLogicalFileForm.dataElements[newLogicalFileForm.dataElements.length - 1].name" 
                                type="text"
                                class="dataElement-input"
                                placeholder="Data Element Name"
                                maxlength="50"
                            />
                        </td>
                        <td>
                            <input 
                                v-model="newLogicalFileForm.dataElements[newLogicalFileForm.dataElements.length - 1].dtype"
                                type="text" 
                                class="dataElement-input"
                                placeholder="Data Element Type"
                                maxlength="30"
                            />
                        </td>
                        <td>
                            <button 
                                @click="newLogicalFileForm.dataElements.push({ name: '', dtype: '' })"
                                class="success-button small-button"
                                :disabled="!newLogicalFileForm.dataElements[newLogicalFileForm.dataElements.length - 1]?.name?.trim() || !newLogicalFileForm.dataElements[newLogicalFileForm.dataElements.length - 1]?.dtype?.trim()"
                                title="Add new data element"
                            >
                                Add
                            </button>
                        </td>
                    </tr>
                </tbody>
            </table>
        </section>
    </div>
</template>

<style scoped>
@import '../assets/color_palette.css';

/* ==========================================
   LAYOUT & CONTAINER STYLES
   ========================================== */

.logical-files-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 20px;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

.logical-files-container section {
    margin-bottom: 30px;
    padding: 20px;
    background-color: var(--color-white-cream);
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.logical-files-container h2 {
    color: var(--color-gray);
    margin-bottom: 15px;
    padding-bottom: 10px;
    border-bottom: 2px solid var(--color-green);
    font-size: 1.5em;
    font-weight: 600;
}

/* ==========================================
   SQL PARSER SECTION
   ========================================== */

.sql-parser-section {
    border-left: 4px solid var(--color-green);
}

.input-group {
    display: flex;
    flex-direction: column;
    gap: 15px;
}

.sql-input {
    padding: 12px;
    border: 2px solid var(--color-gray);
    border-radius: 6px;
    font-family: 'Courier New', monospace;
    font-size: 14px;
    resize: vertical;
    min-height: 100px;
    transition: border-color 0.3s ease;
}

.sql-input:focus {
    outline: none;
    border-color: var(--color-green);
    box-shadow: 0 0 0 3px rgba(var(--color-green-rgb, 0, 128, 0), 0.1);
}

/* ==========================================
   LOGICAL FILES SECTION
   ========================================== */

.logical-files-section {
    border-left: 4px solid var(--color-yellow);
}

.no-files-message {
    text-align: center;
    padding: 40px 20px;
    color: var(--color-gray);
    font-style: italic;
}

.logical-files-grid {
    display: grid;
    gap: 20px;
    grid-template-columns: repeat(auto-fit, minmax(500px, 1fr));
}

/* ==========================================
   TABLE STYLES
   ========================================== */

.logical-file-table {
    width: 100%;
    border-collapse: collapse;
    background-color: var(--color-white-cream);
    border: 2px solid var(--color-gray);
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.logical-file-table th,
.logical-file-table td {
    padding: 12px;
    text-align: left;
    vertical-align: middle;
    border-bottom: 1px solid #e0e0e0;
}

.table-title {
    background: linear-gradient(135deg, var(--color-green), #45a049);
    color: white;
    font-weight: bold;
    font-size: 1.2em;
    text-align: center;
    text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.2);
}

.column-header {
    background-color: var(--color-yellow);
    color: var(--color-gray);
    font-weight: 600;
    text-transform: uppercase;
    font-size: 0.9em;
    letter-spacing: 0.5px;
}

.dataElement-row:hover {
    background-color: #f8f9fa;
}

.dataElement-name {
    font-family: 'Courier New', monospace;
    font-weight: 500;
}

.dataElement-type {
    font-family: 'Courier New', monospace;
    color: #666;
    font-style: italic;
}

.dataElement-actions {
    text-align: center;
}

.add-dataElement-row {
    background-color: #f0f8f0;
    border-top: 2px solid var(--color-green);
}

.dataElement-input {
    width: 100%;
    padding: 8px;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 14px;
    transition: border-color 0.3s ease;
}

.dataElement-input:focus {
    outline: none;
    border-color: var(--color-green);
    box-shadow: 0 0 0 2px rgba(var(--color-green-rgb, 0, 128, 0), 0.1);
}

/* ==========================================
   ADD LOGICAL FILE SECTION
   ========================================== */

.add-logical-file-section {
    border-left: 4px solid #3498db;
}

.new-lf-form {
    background-color: #f8f9fa;
    padding: 20px;
    border-radius: 6px;
    border: 1px solid #e9ecef;
}

.form-row {
    display: flex;
    gap: 20px;
    margin-bottom: 20px;
    align-items: end;
}

.form-group {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 5px;
}

.form-group label {
    font-weight: 500;
    color: var(--color-gray);
    font-size: 0.9em;
}

.form-input {
    padding: 10px;
    border: 2px solid #ddd;
    border-radius: 4px;
    font-size: 14px;
    transition: border-color 0.3s ease;
}

.form-input:focus {
    outline: none;
    border-color: var(--color-green);
    box-shadow: 0 0 0 3px rgba(var(--color-green-rgb, 0, 128, 0), 0.1);
}

.form-actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
}

/* ==========================================
   BUTTON STYLES
   ========================================== */

.primary-button,
.success-button,
.danger-button,
.alert-button {
    padding: 10px 20px;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    font-weight: 500;
    transition: all 0.3s ease;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    font-size: 0.9em;
}

.primary-button {
    background: linear-gradient(135deg, var(--color-green), #45a049);
    color: white;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.primary-button:hover:not(:disabled) {
    background: linear-gradient(135deg, #45a049, var(--color-green));
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

.success-button {
    background: linear-gradient(135deg, #28a745, #20c997);
    color: white;
}

.success-button:hover:not(:disabled) {
    background: linear-gradient(135deg, #20c997, #28a745);
    transform: translateY(-1px);
}

.danger-button {
    background: linear-gradient(135deg, #dc3545, #e74c3c);
    color: white;
}

.danger-button:hover:not(:disabled) {
    background: linear-gradient(135deg, #e74c3c, #dc3545);
    transform: translateY(-1px);
}

.alert-button {
    background: linear-gradient(135deg, #e0aa09, #ffca2c);
    color: white;
}

.alert-button:hover:not(:disabled) {
    background: linear-gradient(135deg, #ffca2c, #e0aa09);
    transform: translateY(-1px);
}

.small-button {
    padding: 6px 12px;
    font-size: 0.8em;
}

button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none !important;
    box-shadow: none !important;
}

/* ==========================================
   RESPONSIVE DESIGN
   ========================================== */

@media (max-width: 768px) {
    .logical-files-container {
        padding: 10px;
    }
    
    .logical-files-grid {
        grid-template-columns: 1fr;
    }
    
    .form-row {
        flex-direction: column;
        gap: 15px;
    }
    
    .logical-file-table {
        font-size: 0.9em;
    }
    
    .logical-file-table th,
    .logical-file-table td {
        padding: 8px;
    }
}

@media (max-width: 480px) {
    .logical-files-container section {
        padding: 15px;
    }
    
    .logical-file-table {
        font-size: 0.8em;
    }
    
    .dataElement-input {
        font-size: 12px;
    }
    
    .primary-button,
    .success-button,
    .danger-button,
    .alert-button {
        padding: 8px 16px;
        font-size: 0.8em;
    }
}

/* ==========================================
   ACCESSIBILITY IMPROVEMENTS
   ========================================== */

@media (prefers-reduced-motion: reduce) {
    * {
        transition: none !important;
        animation: none !important;
    }
}

.sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
}

.lf-description-cell {
    background-color: #f7f7e6;
    color: #666;
    font-size: 1em;
    padding: 8px 12px;
    border-bottom: 1px solid #e0e0e0;
    text-align: left;
}
</style>