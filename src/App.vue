<script lang="ts">
import { defineComponent, ref } from 'vue';
import LogicalFiles from './components/LogicalFiles.vue';
import ElementaryProcesses from './components/ElementaryProcesses.vue';
import { FPAnalysis, LogicalFile } from './assets/ts/LogicalFileFinder';

export default defineComponent({
  name: 'App',
  components: {
    LogicalFiles,
    ElementaryProcesses
  },
  setup(){
    const fpAnalysis = new FPAnalysis();

    return {
      fpAnalysis
    };
  },
});
</script>

<template>
  <main>
    <h1>Hey! I heard you need help with function points...</h1>
    <h2>You've arrived in the right place.</h2>
    
    <h3>Page 1</h3>
    <LogicalFiles :FPA="fpAnalysis"/>

    <h3>Page 2</h3>
    <!-- Function points of the logical files -->
    <ElementaryProcesses :FPA="fpAnalysis"/>
  </main>
</template>

<style>
</style>
