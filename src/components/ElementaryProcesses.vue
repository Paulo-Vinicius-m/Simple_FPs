<script lang="ts">
import { computed, defineComponent, onUpdated, ref, watch } from 'vue';
import { FPAnalysis, EPType, LogicalFile } from '../assets/ts/FunctionPointAnalysis';

export default defineComponent({
    name: 'ElementaryProcesses',
    props: {
        FPA: {
            type: FPAnalysis,
            required: true
        },
        triggerRefresh: {
            type: Number,
            required: true,
        }
    },
    emits: ['refreshEPs'],
    
    setup(props: { FPA: FPAnalysis; triggerRefresh: number }, { emit }) {
        // ==========================================
        // REACTIVE STATE
        // ==========================================
        
        const forceUpdate = ref<number>(0);
        const newEPDescription = ref('');
        const newEPType = ref<EPType>(EPType.ExternalInput);
        const detInputs = ref<Record<string, { logicalFile: string; dataElement: string }>>({});

        // ==========================================
        // EVENT HANDLERS
        // ==========================================

        watch(() => props.triggerRefresh, () => {
            // Trigger a re-computation when the refresh trigger changes
            forceUpdate.value++;
        });

        // ==========================================
        // COMPUTED PROPERTIES
        // ==========================================
        
        const elementaryProcesses = computed(() => {
            // eslint-disable-next-line @typescript-eslint/no-unused-expressions
            forceUpdate.value;
            return props.FPA.getEPs();
        });

        const logicalFiles = computed(() => {
            forceUpdate.value;
            return props.FPA.getLFs();
        });

        const availableDETs = computed(() => {
            const d: Record<string, LogicalFile> = {};
            logicalFiles.value.forEach(lf => {
                d[lf.name] = lf;
            });
            return d;
        });

        // ==========================================
        // METHODS
        // ==========================================

        /**
         * Guarantees reactivity for updates to elementary processes.
         * This function is called whenever an EP is added or removed.
         */
        const outdatedEPs = () => {
            forceUpdate.value++;
            emit('refreshEPs');
        };

        const initializeDetInputs = () => {
            elementaryProcesses.value.forEach(ep => {
                if (!detInputs.value[ep.id]) {
                    detInputs.value[ep.id] = { logicalFile: '', dataElement: '' };
                }
            });
        };

        const addEP = () => {
            if (newEPDescription.value.trim()) {
                props.FPA.addEP(newEPDescription.value, newEPType.value, []);
                newEPDescription.value = '';
                newEPType.value = EPType.ExternalInput;
                outdatedEPs();
                initializeDetInputs();
            }
        };

        const removeEP = (epId: string) => {
            props.FPA.removeEP(epId);
            outdatedEPs();
        };

        const addDET = (epId: string) => {
            const input = detInputs.value[epId];
            if (input && input.logicalFile && input.dataElement) {
                props.FPA.addDETToEP(epId, { name: input.dataElement, logicalFileName: input.logicalFile });
                // Reset input for that EP
                detInputs.value[epId] = { logicalFile: '', dataElement: '' };
                outdatedEPs();
            }
        };

        const removeDET = (epId: string, lfName: string, deName: string) => {
            props.FPA.removeDETsFromEP(epId, lfName, deName);
            outdatedEPs();
        };

        onUpdated(() => {
            initializeDetInputs();
        });

        initializeDetInputs();

        return {
            elementaryProcesses,
            logicalFiles,
            availableDETs,
            newEPDescription,
            newEPType,
            detInputs,
            addEP,
            removeEP,
            addDET,
            removeDET,
            EPType,
        };
    },
});
</script>

<template>
    <div class="ep-container">
        <!-- ADD ELEMENTARY PROCESS SECTION -->
        <section class="add-ep-section">
            <h2>Add New Elementary Process</h2>
            <div class="new-ep-form">
                <div class="form-row">
                    <div class="form-group">
                        <label for="ep-description">Description</label>
                        <input type="text" id="ep-description" class="form-input" v-model="newEPDescription" placeholder="e.g., Register new user">
                    </div>
                    <div class="form-group">
                        <label for="ep-type">Type</label>
                        <select id="ep-type" class="form-input" v-model="newEPType">
                            <option v-for="epType in EPType" :key="epType" :value="epType">{{ epType }}</option>
                        </select>
                    </div>
                    <div class="form-actions">
                        <button @click="addEP" class="primary-button" :disabled="!newEPDescription.trim()">Add EP</button>
                    </div>
                </div>
            </div>
        </section>

        <!-- ELEMENTARY PROCESSES LIST SECTION -->
        <section class="ep-list-section">
            <h2>Elementary Processes</h2>
            <div v-if="elementaryProcesses.length === 0" class="no-eps-message">
                No elementary processes have been added yet.
            </div>
            <div class="ep-grid" v-else>
                <div v-for="ep in elementaryProcesses" :key="ep.id" class="ep-card">
                    <table class="ep-table">
                        <thead>
                            <tr class="table-title">
                                <th colspan="3">
                                    <span>{{ ep.description }} ({{ ep.id }}) - {{ ep.type }}</span>
                                    <button @click="removeEP(ep.id)" class="danger-button small-button" style="float: right;">Remove EP</button>
                                </th>
                            </tr>
                            <tr class="column-header">
                                <th>Logical File</th>
                                <th>Data Element</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="det in ep.dataElements" :key="`${det.logicalFileName}_${det.name}`" class="det-row">
                                <td class="det-name">{{ det.logicalFileName }}</td>
                                <td class="det-type">{{ det.name }}</td>
                                <td class="det-actions">
                                    <button @click="removeDET(ep.id, det.logicalFileName, det.name)" class="danger-button small-button">Remove</button>
                                </td>
                            </tr>
                            <!-- ADD DET ROW -->
                            <tr class="add-det-row" v-if="detInputs[ep.id]">
                                <td>
                                    <select v-model="detInputs[ep.id].logicalFile" class="attribute-input">
                                        <option disabled value="">Select Logical File</option>
                                        <option v-for="lf in logicalFiles" :key="lf.name" :value="lf.name">{{ lf.name }}</option>
                                    </select>
                                </td>
                                <td>
                                    <select v-model="detInputs[ep.id].dataElement" class="attribute-input" :disabled="!detInputs[ep.id].logicalFile">
                                        <option disabled value="">Select Data Element</option>
                                        <option v-for="de in availableDETs[detInputs[ep.id].logicalFile]?.dataElements" :key="de.name" :value="de.name">
                                            {{ de.name }}
                                        </option>
                                    </select>
                                </td>
                                <td class="det-actions">
                                    <button @click="addDET(ep.id)" class="success-button small-button" :disabled="!detInputs[ep.id].dataElement">Add DET</button>
                                </td>
                            </tr>
                        </tbody>
                    </table>
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

.ep-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 20px;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

.ep-container section {
    margin-bottom: 30px;
    padding: 20px;
    background-color: var(--color-white-cream);
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.ep-container h2 {
    color: var(--color-gray);
    margin-bottom: 15px;
    padding-bottom: 10px;
    border-bottom: 2px solid var(--color-blue);
    font-size: 1.5em;
    font-weight: 600;
}

/* ==========================================
   ADD EP SECTION
   ========================================== */

.add-ep-section {
    border-left: 4px solid var(--color-blue);
}

.new-ep-form {
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
    border-color: var(--color-blue);
    box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.1);
}

.form-actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
}

/* ==========================================
   EP LIST SECTION
   ========================================== */

.ep-list-section {
    border-left: 4px solid var(--color-yellow);
}

.no-eps-message {
    text-align: center;
    padding: 40px 20px;
    color: var(--color-gray);
    font-style: italic;
}

.ep-grid {
    display: grid;
    gap: 20px;
    grid-template-columns: repeat(auto-fit, minmax(500px, 1fr));
}

/* ==========================================
   TABLE STYLES
   ========================================== */

.ep-table {
    width: 100%;
    border-collapse: collapse;
    background-color: var(--color-white-cream);
    border: 2px solid var(--color-gray);
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.ep-table th,
.ep-table td {
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

.det-row:hover {
    background-color: #f8f9fa;
}

.det-name {
    font-family: 'Courier New', monospace;
    font-weight: 500;
}

.det-type {
    font-family: 'Courier New', monospace;
    color: #666;
    font-style: italic;
}

.det-actions {
    text-align: center;
}

.add-det-row {
    background-color: #f0f8ff;
    border-top: 2px solid var(--color-blue);
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
    border-color: var(--color-blue);
    box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.1);
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
    background: linear-gradient(135deg, var(--color-blue), #3498db);
    color: white;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.primary-button:hover:not(:disabled) {
    background: linear-gradient(135deg, #3498db, var(--color-blue));
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
    .ep-container {
        padding: 10px;
    }
    
    .ep-grid {
        grid-template-columns: 1fr;
    }
    
    .form-row {
        flex-direction: column;
        align-items: stretch;
    }
    
    .ep-table {
        font-size: 0.9em;
    }
    
    .ep-table th,
    .ep-table td {
        padding: 8px;
    }
}

@media (max-width: 480px) {
    .ep-container section {
        padding: 15px;
    }
    
    .ep-table {
        border-width: 1px;
    }
    
    .attribute-input {
        padding: 6px;
    }
    
    .primary-button,
    .success-button,
    .danger-button {
        padding: 8px 16px;
        font-size: 0.8em;
    }
}
</style>