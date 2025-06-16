<script lang="ts">
import { computed, defineComponent, onUpdated, ref } from 'vue';
import { FPAnalysis, LogicalFile } from '../assets/ts/LogicalFileFinder';

export default defineComponent({
    name: 'ElementaryProcesses',
    props: {
        FPA: {
            type: FPAnalysis,
            required: true
        }
    },
    setup(props) {
        const dbtables = ref<LogicalFile[]>(props.FPA.getLFs());
        return {
            dbtables
        };
    },
});
</script>

<template>
    <div>
        <div>
            <!--Add elementary process description-->
            <input type="text" id="elementaryProcessUser" placeholder="type your elementary process here">
            <!--Link to Logical Files-->
            <select id="elementaryProcessLF">
            </select>

            <table v-for="table in dbtables" :key="table.name">
                <tr>    
                    <th>Column Name</th>
                    <th>Column Type</th>
                </tr>

                <tr v-for="column in table.attributes" :key="column.name">
                    <td>{{column.name}}</td>
                    <td>{{column.dtype}}</td>
                </tr>
            </table>
        </div>
    </div>
</template>