<template>
  <div id="app">
    <header class="app-header">
      <h1>Function Point Analysis Tool</h1>
      <p>Manage and analyze logical files for your software projects</p>
      <button @click="loadSampleData" class="load-sample-data">
        Load Sample Data
      </button>
    </header>

    <main class="app-main">
      <!-- LogicalFiles Component Usage -->
      <LogicalFiles 
        :FPA="fpaInstance"
        :triggerRefresh="refreshLFs"
        @refreshLFs="handleLFsUpdate" 
      />

      <ElementaryProcesses 
        :FPA="fpaInstance" 
        :triggerRefresh="refreshLFs"
        @refreshEPs="handleEPsUpdate"
      />

      <!-- Debug Information (Remove in production) -->
      <section v-if="showDebugInfo" class="debug-section">
        <h2>Debug Information</h2>
        <details>
          <summary>Current Logical Files ({{ currentLogicalFiles.length }})</summary>
          <pre>{{ JSON.stringify(currentLogicalFiles, null, 2) }}</pre>
        </details>
        <details>
          <summary>Component State</summary>
          <ul>
            <li>Refresh Counter: {{ refreshLFs }}</li>
            <li>Last Update: {{ lastUpdateTime }}</li>
            <li>Total Attributes: {{ totalAttributes }}</li>
          </ul>
        </details>
      </section>

      <EndOfAnalysis 
        :FPA="fpaInstance" 
        :refreshTrigger="refreshLFs + refreshEPs"
        @refreshLFs="handleLFsUpdate"
        @refreshEPs="handleEPsUpdate"
      />
    </main>

    <footer class="app-footer">
      <button 
        @click="toggleDebugInfo" 
        class="debug-toggle"
        :class="{ active: showDebugInfo }"
      >
        {{ showDebugInfo ? 'Hide' : 'Show' }} Debug Info
      </button>
    </footer>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted, watch } from 'vue';
import LogicalFiles from './components/LogicalFiles.vue';
import ElementaryProcesses from './components/ElementaryProcesses.vue';
import EndOfAnalysis from './components/EndOfAnalysis.vue';
import { FPAnalysis } from './assets/ts/FunctionPointAnalysis';

export default defineComponent({
  name: 'App',
  components: {
    LogicalFiles,
    ElementaryProcesses,
    EndOfAnalysis
  },
  setup() {
    // Initialize FPA instance
    const fpaInstance = new FPAnalysis();
    
    // Component state
    const refreshLFs = ref(0);
    const refreshEPs = ref(0);
    const lastUpdateTime = ref<string>('');
    const showDebugInfo = ref(false);

    // Computed properties for debugging
    const currentLogicalFiles = computed(() => {
      return fpaInstance.getLFs();
    });

    const totalAttributes = computed(() => {
      return currentLogicalFiles.value.reduce((total, lf) => {
        return total + lf.dataElements.length;
      }, 0);
    });

    // Event handlers
    const handleLFsUpdate = (): void => {
      console.log('Logical files updated:', fpaInstance.getLFs());
      lastUpdateTime.value = new Date().toLocaleTimeString();
      refreshLFs.value++;
    };

    const handleEPsUpdate = (): void => {
      console.log('Elementary processes updated:', fpaInstance.getEPs());
      lastUpdateTime.value = new Date().toLocaleTimeString();
      refreshEPs.value++;
    };

    const toggleDebugInfo = (): void => {
      showDebugInfo.value = !showDebugInfo.value;
    };

    // Sample data for testing (optional)
    const loadSampleData = (): void => {
      const sampleSQL = `
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
      
      fpaInstance.readSQL(sampleSQL);
      handleLFsUpdate();
    };

    // Watch for changes in logical files
    watch(currentLogicalFiles, (newFiles, oldFiles) => {
      console.log('Logical files changed:', {
        previous: oldFiles?.length || 0,
        current: newFiles.length,
        difference: newFiles.length - (oldFiles?.length || 0)
      });
    }, { deep: true });

    // Component lifecycle
    onMounted(() => {
      console.log('App component mounted');
      // Uncomment to load sample data on startup
      // loadSampleData();
    });

    return {
      // Core functionality
      fpaInstance,
      refreshLFs,
      refreshEPs,
      handleLFsUpdate,
      handleEPsUpdate,
      
      // Debug features
      showDebugInfo,
      toggleDebugInfo,
      currentLogicalFiles,
      totalAttributes,
      lastUpdateTime,
      
      // Utilities
      loadSampleData
    };
  }
});
</script>

<style>
/* Global App Styles */
#app {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
}

.app-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 2rem;
  text-align: center;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.app-header h1 {
  margin: 0 0 0.5rem 0;
  font-size: 2.5rem;
  font-weight: 700;
}

.app-header p {
  margin: 0;
  font-size: 1.2rem;
  opacity: 0.9;
}

.app-main {
  flex: 1;
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
  width: 100%;
  box-sizing: border-box;
}

.debug-section {
  margin-top: 3rem;
  padding: 1.5rem;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #dee2e6;
}

.debug-section h2 {
  margin-top: 0;
  color: #495057;
}

.debug-section details {
  margin: 1rem 0;
  background: white;
  border-radius: 4px;
  border: 1px solid #e9ecef;
}

.debug-section summary {
  padding: 1rem;
  cursor: pointer;
  background: #f8f9fa;
  border-radius: 4px 4px 0 0;
  font-weight: 500;
}

.debug-section summary:hover {
  background: #e9ecef;
}

.debug-section pre {
  padding: 1rem;
  margin: 0;
  background: #f8f9fa;
  border-radius: 0 0 4px 4px;
  overflow-x: auto;
  font-size: 0.9rem;
}

.debug-section ul {
  padding: 1rem;
  margin: 0;
  list-style: none;
}

.debug-section li {
  padding: 0.25rem 0;
  border-bottom: 1px solid #e9ecef;
}

.debug-section li:last-child {
  border-bottom: none;
}

.app-footer {
  padding: 1rem;
  text-align: center;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  border-top: 1px solid rgba(0, 0, 0, 0.1);
}

.debug-toggle {
  padding: 0.5rem 1rem;
  background: #6c757d;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.debug-toggle:hover {
  background: #5a6268;
  transform: translateY(-1px);
}

.debug-toggle.active {
  background: #007bff;
}

/* Responsive Design */
@media (max-width: 768px) {
  .app-header {
    padding: 1.5rem 1rem;
  }
  
  .app-header h1 {
    font-size: 2rem;
  }
  
  .app-header p {
    font-size: 1rem;
  }
  
  .app-main {
    padding: 1rem;
  }
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .debug-section {
    background: #343a40;
    border-color: #495057;
    color: #f8f9fa;
  }
  
  .debug-section h2 {
    color: #f8f9fa;
  }
  
  .debug-section details {
    background: #495057;
    border-color: #6c757d;
  }
  
  .debug-section summary {
    background: #495057;
    color: #f8f9fa;
  }
  
  .debug-section summary:hover {
    background: #6c757d;
  }
  
  .debug-section pre {
    background: #343a40;
    color: #f8f9fa;
  }
}
</style>
