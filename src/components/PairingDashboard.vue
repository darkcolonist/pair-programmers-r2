<script setup>
import { ref, onMounted } from 'vue';
import Papa from 'papaparse';
import { User, Repeat, Github, Box, Loader2, AlertCircle } from 'lucide-vue-next';

const pairings = ref([]);
const isLoading = ref(true);
const error = ref(null);
const sheetUrl = import.meta.env.VITE_SHEET_CSV_URL;

const fetchPairings = async () => {
  isLoading.value = true;
  error.value = null;
  
  const startTime = Date.now();
  
  try {
    const response = await fetch(sheetUrl);
    if (!response.ok) throw new Error('Failed to fetch data from source');
    
    const csvData = await response.text();
    
    Papa.parse(csvData, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const users = results.data;
        
        // Validation: check for required columns
        if (users.length === 0) {
           error.value = 'The data source is empty.';
           finishLoading(startTime);
           return;
        }
        
        const firstRow = users[0];
        if (!('full name' in firstRow) || !('email' in firstRow)) {
          error.value = 'Invalid data format. Expected columns: "full name", "email", "job title".';
          finishLoading(startTime);
          return;
        }

        const tempPairings = [];
        for (let i = 0; i < users.length; i += 2) {
          if (users[i] && users[i + 1]) {
            tempPairings.push({
              user1: users[i],
              user2: users[i + 1]
            });
          }
        }
        pairings.value = tempPairings;
        finishLoading(startTime);
      },
      error: (err) => {
        error.value = 'Parsing error: ' + err.message;
        finishLoading(startTime);
      }
    });
  } catch (err) {
    error.value = err.message;
    finishLoading(startTime);
  }
};

const finishLoading = (startTime) => {
  const elapsedTime = Date.now() - startTime;
  const minimumDelay = 1000;
  const remainingTime = Math.max(0, minimumDelay - elapsedTime);
  
  setTimeout(() => {
    isLoading.value = false;
  }, remainingTime);
};

const formatFirstName = (fullName) => {
  if (!fullName) return 'Unknown';
  if (fullName.includes(',')) {
    return fullName.split(',')[1].trim().split(' ')[0];
  }
  return fullName.split(' ')[0];
};

onMounted(() => {
  fetchPairings();
});
</script>

<template>
  <div class="dashboard">
    <!-- Loading State -->
    <div v-if="isLoading" class="loading-state">
      <div class="loader"></div>
      <p class="subtitle">Fetching pairings...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="error-state">
      <AlertCircle :size="64" class="error-icon" />
      <h2 class="error-title">Data Error</h2>
      <p class="error-message">{{ error }}</p>
      <button @click="fetchPairings" class="retry-button">Retry Connection</button>
    </div>

    <!-- Dashboard Content -->
    <div v-else>
      <h1>Pair Programmers</h1>
      <p class="subtitle">Let the coding begin and may the odds be ever in your favor!</p>
      
      <div class="today-label">TODAY</div>
      
      <div class="pairing-container">
        <div v-for="(pair, index) in pairings" :key="index" class="pairing-row">
          <div class="person left">
            <span class="name">{{ formatFirstName(pair.user1['full name']) }}</span>
            <div class="avatar">
              <User :size="24" />
            </div>
          </div>
          
          <Repeat class="swap-icon" :size="20" />
          
          <div class="person right">
            <div class="avatar">
              <User :size="24" />
            </div>
            <span class="name">{{ formatFirstName(pair.user2['full name']) }}</span>
          </div>
        </div>
      </div>
      
      <div class="divider"></div>
      
      <div class="footer-meta">
        <span>Season 128</span>
        <div class="separator"></div>
        <span>Set 640</span>
        <div class="separator"></div>
        <span>7:00am Friday, March 06, 2026</span>
        <div class="separator"></div>
        <div class="build-tag">
          <Github :size="14" />
          <span>build 4466...1ac3</span>
        </div>
      </div>
      
      <div class="footer-nav">
        <div class="nav-item">
          <span class="nav-label">Previous</span>
          <div class="coming-soon">
            <span>coming soon</span>
            <Box :size="20" :stroke-width="3" style="color: #2e7d32;" />
          </div>
        </div>
        
        <div class="nav-item">
          <span class="nav-label">Next</span>
          <div class="coming-soon">
            <span>coming soon</span>
            <Box :size="20" :stroke-width="3" style="color: #2e7d32;" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Scoped styles if needed, though most are in style.css */
</style>
