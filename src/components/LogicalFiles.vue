<script lang="ts">
import { defineComponent, ref, reactive, watch } from 'vue';
import { FPAnalysis, LogicalFile } from '../assets/ts/LogicalFileFinder';

export default defineComponent({
    name: 'LogicalFiles',
    props: {
        FPA: {
            type: FPAnalysis,
            required: true
        },
        // Add a prop to watch for updates
        refreshTrigger: {
            type: Number,
            default: 0
        }
    },
    emits: ['readSQL'],
    setup(props, { emit }) {
        let lfs = ref<LogicalFile[]>([]);
        const sqlInput = ref('');
        const newLFName = ref('');
        const newLFAttributes = ref<{ name: string; dtype: string }>({
            name: '',
            dtype: ''
        });

        const attributeInputs = ref<Record<string, { name: string; dtype: string }>>({});

        const refreshTable = () => {
            lfs.value = props.FPA.getLFs();
            console.log('Logical Files:', lfs.value);
            
            // Initialize input refs for each logical file
            lfs.value.forEach(lf => {
                if (!attributeInputs.value[lf.name]) {
                    attributeInputs.value[lf.name] = { name: '', dtype: '' };
                }
            });
        };

        const readSQL = () => {
            props.FPA.readSQL(sqlInput.value);
            refreshTable();
            emit('readSQL')
        };

        const addLF = (name: string, attributes: { name: string; dtype: string }[]) => {
            if (name && attributes[0]?.name && attributes[0]?.dtype) {
                props.FPA.addLF(name, attributes);
                // Initialize input refs for the new logical file
                attributeInputs.value[name] = { name: '', dtype: '' };
                // Clear the new LF form
                newLFName.value = '';
                newLFAttributes.value = { name: '', dtype: '' };
                refreshTable();
                emit('readSQL');
            }
        };

        const addAttributeToLF = (lfName: string, attribute: { name: string; dtype: string }) => {
            console.log('Adding attribute to LF:', lfName, attribute);
            if (attribute.name && attribute.dtype) {
                props.FPA.addAttributeToLF(lfName, attribute);
                // Clear the inputs after adding
                attributeInputs.value[lfName].name = '';
                attributeInputs.value[lfName].dtype = '';
                refreshTable();
                emit('readSQL');
            }
        };

        const addNewLogicalFile = () => {
            if (newLFName.value && newLFAttributes.value.name && newLFAttributes.value.dtype) {
                // Create a copy of the attributes to avoid reference issues
                const attributesCopy = [{ ...newLFAttributes.value }];
                addLF(newLFName.value, attributesCopy);
            }
        };

        // Watch for changes in refreshTrigger prop to update logical files
        watch(() => props.refreshTrigger, () => {
            refreshTable();
        });

        // Initialize on component mount
        refreshTable();

        return {
            lfs,
            newLFName,
            newLFAttributes,
            attributeInputs,
            addLF,
            sqlInput,
            readSQL,
            addAttributeToLF,
            addNewLogicalFile,
        };
    },
});
</script>

<template>
    <div>
        <input type="text" v-model="sqlInput" placeholder="Copy you sql code here">
        <button @click="readSQL">Find Logical Files</button>
        <!-- Table with potential logical files -->

        <table v-for="lf in lfs" :key="lf.name" class="logical-file-table">
            <tr>
                <th colspan="3" class="table-title">{{ lf.name }}</th>
            </tr>
            <tr>
                <th class="column-header">Attribute Name</th>
                <th class="column-header">Attribute Type</th>
                <th class="column-header">Action</th>
            </tr>

            <tr v-for="attribute in lf.attributes" :key="attribute.name">
                <td>{{attribute.name}}</td>
                <td>{{attribute.dtype}}</td>
                <td></td>
            </tr>
            <tr>
                <!-- Add new attribute -->
                <td>
                    <input 
                        type="text" 
                        v-model="attributeInputs[lf.name].name" 
                        placeholder="Attribute Name"
                    >
                </td>
                <td>
                    <input 
                        type="text" 
                        v-model="attributeInputs[lf.name].dtype"
                        placeholder="Attribute Type"
                    >
                </td>
                <td>
                    <button @click="addAttributeToLF(lf.name, { name: attributeInputs[lf.name].name, dtype: attributeInputs[lf.name].dtype })">Add Attribute</button>
                </td>
            </tr>
        </table>
        <div>
            <h3>Add New Logical File</h3>
            <input type="text" v-model="newLFName" placeholder="Logical File Name">
            <input type="text" v-model="newLFAttributes.name" placeholder="Attribute Name">
            <input type="text" v-model="newLFAttributes.dtype" placeholder="Attribute Type">
            <button @click="addNewLogicalFile">Add Logical File</button>
        </div>
    </div>
</template>

<style scoped>
@import '../assets/color_palette.css';

.logical-file-table {
    width: 100%;
    border-collapse: collapse;
    margin: 20px 0;
    background-color: var(--color-white-cream);
    border: 2px solid var(--color-gray);
}

.logical-file-table th,
.logical-file-table td {
    border: 1px solid var(--color-gray);
    padding: 10px;
    text-align: center;
    vertical-align: middle;
}

.table-title {
    background-color: var(--color-green);
    color: var(--color-gray);
    font-weight: bold;
    font-size: 1.2em;
}

.column-header {
    background-color: var(--color-yellow);
    color: var(--color-gray);
    font-weight: bold;
}

.logical-file-table input {
    width: 90%;
    padding: 5px;
    border: 1px solid var(--color-gray);
    border-radius: 4px;
    text-align: center;
}

.logical-file-table button {
    padding: 5px 10px;
    background-color: var(--color-green);
    color: var(--color-gray);
    border: none;
    border-radius: 4px;
    cursor: pointer;
}

.logical-file-table button:hover {
    background-color: var(--color-gray);
    color: var(--color-white-cream);
}
</style>