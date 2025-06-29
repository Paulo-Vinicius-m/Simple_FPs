<script lang="ts">
import { defineComponent, ref, watch, computed, onMounted } from 'vue';
import { FPAnalysis, type DataElement, LFType } from '../assets/ts/FunctionPointAnalysis';


export default defineComponent({
    name: 'EndOfAnalysis',
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
    emits: ['refreshLFs', 'refreshEPs'],

    setup(props, { emit }) {
        // ==========================================
        // REACTIVE STATE
        // ==========================================
        
        /** Force reactivity trigger for computed properties */
        const forceUpdate = ref<number>(0);

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
            props.FPA.evaluateFPs();
            return props.FPA.getLFs();
        });

        const elementaryProcesses = computed(() => {
            // eslint-disable-next-line @typescript-eslint/no-unused-expressions
            forceUpdate.value;
            props.FPA.evaluateFPs();
            return props.FPA.getEPs();
        });

        watch(() => props.refreshTrigger, () => {
            // Force update when refreshTrigger changes
            forceUpdate.value++;
        });

        function downloadJSON() {
            const blob = new Blob([JSON.stringify(props.FPA.exportAsJSON())], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'Function Point Analysis.json';
            a.click();
            URL.revokeObjectURL(url);
        }

        function importFromJSON() {
            const input = document.getElementById('fileInput') as HTMLInputElement;
            if (input.files && input.files.length > 0) {
                const file = input.files[0];
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const data = JSON.parse(e.target?.result as string);
                        props.FPA.importFromJSON(data);
                        forceUpdate.value++;
                        emit('refreshLFs');
                        emit('refreshEPs');
                    } catch (error) {
                        console.error('Error importing JSON:', error);
                    }
                };
                reader.readAsText(file);
            }
        }

        return {
            // Computed
            logicalFiles,
            elementaryProcesses,

            // Methods
            downloadJSON,
            importFromJSON,

            // Form Options
            LFType: LFType,
        };
    }
});
</script>

<template>
    <div class="logical-files-container">

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
                            <th colspan="2" class="table-title">
                                {{ lf.FPs }}
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
                        </tr>
                    </tbody>
                </table>
            </div>
        </section>

        <section class="elementary-processes-section">
            <h2>Elementary Processes</h2>
            <div v-if="!elementaryProcesses.length" class="no-files-message">
                <p>No elementary processes found. Parse SQL code or add processes manually.</p>
            </div>
            <div v-else class="logical-files-grid">
                <table 
                    v-for="ep in elementaryProcesses" 
                    :key="ep.description" 
                    class="logical-file-table"
                >
                    <thead>
                        <tr>
                            <th colspan="3" class="table-title">
                                <div class="card-name">
                                    {{ ep.description }}
                                </div>
                                <div class="FPs-contribution">
                                    {{ ep.FPs }}
                                </div>
                            </th>
                        </tr>
                        <tr>
                            <th class="column-header">Data Element Name</th>
                            <th class="column-header">Data Element Type</th>
                            <th class="column-header">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr 
                            v-for="dataElement in ep.dataElements" 
                            :key="dataElement.name"
                            class="dataElement-row"
                        >
                            <td class="dataElement-name">{{ dataElement.name }}</td>
                            <td class="dataElement-type">{{ dataElement.logicalFileName }}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

        </section>

        <section class="end-of-analysis-section">
            <h2>End of Analysis</h2>
            <p>
                This section summarizes the Function Point Analysis results, including the total number of logical files, elementary processes, and their contributions to the overall function points.
            </p>
            <p>
                Total Logical Files: {{ logicalFiles.length }}<br />
                Total Elementary Processes: {{ elementaryProcesses.length }}
            </p>
            <button
                class="primary-button"
                @click="downloadJSON"
            >
                Download JSON
            </button>

            <input type="file" id="fileInput" />
            <button
                class="primary-button"
                @click="importFromJSON"
            >
                Import from JSON
            </button>
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

.card-name {
    font-weight: bold;
    color: var(--color-white-cream);
    font-size: 1.2em;
}

.FPs-contribution {
    font-weight: bold;
    color: var(--color-white-cream);
    font-size: 1.2em;
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