<!--
/**
 * LogicalFiles Component
 * 
 * A Vue component for managing Logical Files in Function Point Analysis (FPA).
 * This component allows users to:
 * - Parse SQL scripts to extract logical files and their attributes
 * - Add new logical files manually
 * - Add/remove attributes from existing logical files
 * - View all logical files in a structured table format
 * 
 * @component
 * @example
 * <LogicalFiles 
 *   :FPA="fpaInstance" 
 *   :refreshTrigger="refreshCounter"
 *   @readSQL="handleSQLRead" 
 * />
 */
-->
<script lang="ts">
import { defineComponent, ref, watch, computed, onMounted } from 'vue';
import { FPAnalysis, type Attribute } from '../assets/ts/LogicalFileFinder';

/**
 * Interface for attribute input structure
 */
interface AttributeInput {
    name: string;
    dtype: string;
}

/**
 * Interface for component props
 */
interface Props {
    FPA: FPAnalysis;
    refreshTrigger: number;
}

/**
 * Interface for component emits
 */
interface Emits {
    readSQL: [];
}

export default defineComponent({
    name: 'LogicalFiles',
    props: {
        /** Function Point Analysis instance for managing logical files */
        FPA: {
            type: FPAnalysis,
            required: true
        },
        /** Trigger value to force component refresh from parent */
        refreshTrigger: {
            type: Number,
            default: 0
        }
    },
    emits: ['readSQL'],
    setup(props: Props, { emit }) {
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
            attribute: AttributeInput;
        }>({
            name: '',
            attribute: { name: '', dtype: '' }
        });

        /** Input tracking for adding attributes to existing logical files */
        const attributeInputs = ref<Record<string, AttributeInput>>({});

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
         * Initializes attribute input refs for all logical files
         * Ensures each logical file has corresponding input fields
         */
        const initializeAttributeInputs = (): void => {
            logicalFiles.value.forEach(lf => {
                if (!attributeInputs.value[lf.name]) {
                    attributeInputs.value[lf.name] = { name: '', dtype: '' };
                }
            });
        };

        /**
         * Triggers component reactivity and initializes inputs
         * Used after data changes to ensure UI updates
         */
        const triggerUpdate = (): void => {
            forceUpdate.value++;
            initializeAttributeInputs();
        };

        /**
         * Resets a form object to empty values
         * @param form - Form object to reset
         */
        const resetForm = (form: { name: string; attribute: AttributeInput }): void => {
            form.name = '';
            form.attribute.name = '';
            form.attribute.dtype = '';
        };

        /**
         * Clears attribute input for a specific logical file
         * @param lfName - Name of the logical file
         */
        const clearAttributeInput = (lfName: string): void => {
            if (attributeInputs.value[lfName]) {
                attributeInputs.value[lfName].name = '';
                attributeInputs.value[lfName].dtype = '';
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
                triggerUpdate();
                emit('readSQL');
                console.log('Successfully parsed SQL and found logical files:', logicalFiles.value);
            } catch (error) {
                console.error('Error parsing SQL:', error);
            }
        };

        /**
         * Adds a new logical file to the FPA instance
         * @param name - Name of the logical file
         * @param attributes - Array of attributes for the logical file
         */
        const addLogicalFile = (name: string, attributes: Attribute[]): void => {
            if (!name.trim()) {
                console.warn('Logical file name cannot be empty');
                return;
            }

            if (!attributes.length || !attributes[0]?.name?.trim() || !attributes[0]?.dtype?.trim()) {
                console.warn('At least one valid attribute is required');
                return;
            }

            try {
                props.FPA.addLF(name.trim(), attributes);
                attributeInputs.value[name] = { name: '', dtype: '' };
                resetForm(newLogicalFileForm.value);
                triggerUpdate();
                emit('readSQL');
                console.log(`Successfully added logical file: ${name}`);
            } catch (error) {
                console.error('Error adding logical file:', error);
            }
        };

        /**
         * Adds an attribute to an existing logical file
         * @param lfName - Name of the logical file
         * @param attribute - Attribute to add
         */
        const addAttributeToLogicalFile = (lfName: string, attribute: AttributeInput): void => {
            if (!attribute.name.trim() || !attribute.dtype.trim()) {
                console.warn('Attribute name and type are required');
                return;
            }

            try {
                props.FPA.addAttributeToLF(lfName, {
                    name: attribute.name.trim(),
                    dtype: attribute.dtype.trim()
                });
                clearAttributeInput(lfName);
                triggerUpdate();
                emit('readSQL');
                console.log(`Successfully added attribute ${attribute.name} to ${lfName}`);
            } catch (error) {
                console.error('Error adding attribute:', error);
            }
        };

        /**
         * Removes an attribute from a logical file
         * @param lfName - Name of the logical file
         * @param attributeName - Name of the attribute to remove
         */
        const removeAttributeFromLogicalFile = (lfName: string, attributeName: string): void => {
            try {
                props.FPA.removeAttributeFromLF(lfName, attributeName);
                triggerUpdate();
                emit('readSQL');
                console.log(`Successfully removed attribute ${attributeName} from ${lfName}`);
            } catch (error) {
                console.error('Error removing attribute:', error);
            }
        };

        /**
         * Creates a new logical file from the form data
         */
        const createNewLogicalFile = (): void => {
            const { name, attribute } = newLogicalFileForm.value;
            
            if (!name.trim() || !attribute.name.trim() || !attribute.dtype.trim()) {
                console.warn('All fields are required to create a new logical file');
                return;
            }

            const attributes: Attribute[] = [{ ...attribute }];
            addLogicalFile(name, attributes);
        };

        // ==========================================
        // LIFECYCLE & WATCHERS
        // ==========================================

        /**
         * Watches for changes in refreshTrigger prop
         * Triggers update when parent component requests refresh
         */
        watch(() => props.refreshTrigger, () => {
            triggerUpdate();
        });

        /**
         * Component initialization
         */
        onMounted(() => {
            initializeAttributeInputs();
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
            attributeInputs,
            
            // Methods
            parseSQL,
            createNewLogicalFile,
            addAttributeToLogicalFile,
            removeAttributeFromLogicalFile,
            
            // Utilities (exposed for template debugging)
            triggerUpdate
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
                            <th colspan="3" class="table-title">
                                {{ lf.name }}
                            </th>
                        </tr>
                        <tr>
                            <th class="column-header">Attribute Name</th>
                            <th class="column-header">Attribute Type</th>
                            <th class="column-header">Actions</th>
                        </tr>
                    </thead>

                    <!-- Table Body -->
                    <tbody>
                        <!-- Existing Attributes -->
                        <tr 
                            v-for="attribute in lf.attributes" 
                            :key="attribute.name"
                            class="attribute-row"
                        >
                            <td class="attribute-name">{{ attribute.name }}</td>
                            <td class="attribute-type">{{ attribute.dtype }}</td>
                            <td class="attribute-actions">
                                <button 
                                    @click="removeAttributeFromLogicalFile(lf.name, attribute.name)"
                                    class="danger-button small-button"
                                    :title="`Remove ${attribute.name} from ${lf.name}`"
                                >
                                    Remove
                                </button>
                            </td>
                        </tr>

                        <!-- Add New Attribute Row -->
                        <tr class="add-attribute-row">
                            <td>
                                <input 
                                    v-model="attributeInputs[lf.name].name" 
                                    type="text"
                                    class="attribute-input"
                                    placeholder="Attribute Name"
                                    maxlength="50"
                                />
                            </td>
                            <td>
                                <input 
                                    v-model="attributeInputs[lf.name].dtype"
                                    type="text" 
                                    class="attribute-input"
                                    placeholder="Attribute Type"
                                    maxlength="30"
                                />
                            </td>
                            <td>
                                <button 
                                    @click="addAttributeToLogicalFile(lf.name, attributeInputs[lf.name])"
                                    class="success-button small-button"
                                    :disabled="!attributeInputs[lf.name]?.name?.trim() || !attributeInputs[lf.name]?.dtype?.trim()"
                                    title="Add new attribute"
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
            <div class="new-lf-form">
                <div class="form-row">
                    <div class="form-group">
                        <label for="newLfName">Logical File Name:</label>
                        <input 
                            id="newLfName"
                            v-model="newLogicalFileForm.name" 
                            type="text"
                            class="form-input"
                            placeholder="Enter logical file name"
                            maxlength="50"
                        />
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label for="newAttributeName">First Attribute Name:</label>
                        <input 
                            id="newAttributeName"
                            v-model="newLogicalFileForm.attribute.name" 
                            type="text"
                            class="form-input"
                            placeholder="Enter attribute name"
                            maxlength="50"
                        />
                    </div>
                    
                    <div class="form-group">
                        <label for="newAttributeType">First Attribute Type:</label>
                        <input 
                            id="newAttributeType"
                            v-model="newLogicalFileForm.attribute.dtype" 
                            type="text"
                            class="form-input"
                            placeholder="Enter attribute type"
                            maxlength="30"
                        />
                    </div>
                </div>
                
                <div class="form-actions">
                    <button 
                        @click="createNewLogicalFile"
                        class="primary-button"
                        :disabled="!newLogicalFileForm.name.trim() || !newLogicalFileForm.attribute.name.trim() || !newLogicalFileForm.attribute.dtype.trim()"
                    >
                        Add Logical File
                    </button>
                </div>
            </div>
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

.attribute-row:hover {
    background-color: #f8f9fa;
}

.attribute-name {
    font-family: 'Courier New', monospace;
    font-weight: 500;
}

.attribute-type {
    font-family: 'Courier New', monospace;
    color: #666;
    font-style: italic;
}

.attribute-actions {
    text-align: center;
}

.add-attribute-row {
    background-color: #f0f8f0;
    border-top: 2px solid var(--color-green);
}

.attribute-input {
    width: 100%;
    padding: 8px;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 14px;
    transition: border-color 0.3s ease;
}

.attribute-input:focus {
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
.danger-button {
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
    
    .attribute-input {
        font-size: 12px;
    }
    
    .primary-button,
    .success-button,
    .danger-button {
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
</style>