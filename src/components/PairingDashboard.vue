<script setup>
import { ref, onMounted, computed } from 'vue';
import Papa from 'papaparse';
import { User, Repeat, Github, Box, Loader2, AlertCircle } from 'lucide-vue-next';
import md5 from 'md5';

const usersList = ref([]);
const isLoading = ref(true);
const error = ref(null);
const sheetUrl = import.meta.env.VITE_SHEET_CSV_URL;
const appTitle = import.meta.env.VITE_APP_TITLE || 'Pair Programmers';
const currentTime = ref(new Date());

const totalOffset = computed(() => {
  const urlParams = new URLSearchParams(window.location.search);
  const forward = parseInt(urlParams.get('f')) || 0;
  const backward = parseInt(urlParams.get('b')) || 0;
  return forward - backward;
});

const startSetNumber = parseInt(import.meta.env.VITE_START_SET_NUMBER) || 640;

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

        usersList.value = users;
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

const updateTime = () => {
  currentTime.value = new Date();
};

const currentSet = computed(() => {
  const startDate = new Date('2026-03-11');
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + totalOffset.value);
  
  // Reset time for accurate day calculation
  const d1 = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const d2 = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
  
  const diffTime = d2 - d1;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return startSetNumber + diffDays;
});

const getPairingsForSet = (setNum) => {
  if (usersList.value.length === 0) return [];
  
  const users = [...usersList.value];
  if (users.length % 2 !== 0) {
    users.push({ 
      'full name': import.meta.env.VITE_PLACEHOLDER_NAME || '-', 
      email: import.meta.env.VITE_PLACEHOLDER_EMAIL || null 
    });
  }
  
  const offset = setNum - startSetNumber;
  const n = users.length;
  
  // Specific path for 6 users as requested previously
  // Clockwise path: 0 -> 1 -> 3 -> 5 -> 4 -> 2 -> 0
  let rotationPath = [];
  if (n === 6) {
    rotationPath = [0, 1, 3, 5, 4, 2];
  } else {
    // General logical path for any N: 0 -> 1 -> 3 -> ... -> (n-1) -> (n-2) -> ... -> 2 -> 0
    rotationPath.push(0);
    for (let i = 1; i < n; i += 2) rotationPath.push(i);
    for (let i = (n % 2 === 0 ? n - 2 : n - 1); i >= 2; i -= 2) rotationPath.push(i);
  }

  const rotated = new Array(n);
  for (let i = 0; i < rotationPath.length; i++) {
    const targetIdx = rotationPath[i];
    const fromIdxInPath = ((i - offset) % rotationPath.length + rotationPath.length) % rotationPath.length;
    rotated[targetIdx] = users[rotationPath[fromIdxInPath]];
  }

  const pairs = [];
  for (let i = 0; i < rotated.length; i += 2) {
    pairs.push({
      user1: rotated[i],
      user2: rotated[i + 1]
    });
  }
  return pairs;
};

const pairings = computed(() => getPairingsForSet(currentSet.value));
const previousPairings = computed(() => getPairingsForSet(currentSet.value - 1));
const nextPairings = computed(() => getPairingsForSet(currentSet.value + 1));

const formattedDateTime = computed(() => {
  const displayDate = new Date(currentTime.value);
  displayDate.setDate(displayDate.getDate() + totalOffset.value);
  
  return displayDate.toLocaleString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  }).replace(' at ', ' ');
});

const getGravatarUrl = (email, size = 48) => {
  if (!email) return null;
  const hash = md5(email.trim().toLowerCase());
  return `https://www.gravatar.com/avatar/${hash}?d=robohash&s=${size}`;
};

const prevLink = computed(() => {
  const urlParams = new URLSearchParams(window.location.search);
  let forward = parseInt(urlParams.get('f')) || 0;
  let backward = parseInt(urlParams.get('b')) || 0;
  
  if (forward > 0) {
    forward--;
  } else {
    backward++;
  }
  
  const params = [];
  if (forward > 0) params.push(`f=${forward}`);
  if (backward > 0) params.push(`b=${backward}`);
  
  return params.length > 0 ? `?${params.join('&')}` : window.location.pathname;
});

const nextLink = computed(() => {
  const urlParams = new URLSearchParams(window.location.search);
  let forward = parseInt(urlParams.get('f')) || 0;
  let backward = parseInt(urlParams.get('b')) || 0;
  
  if (backward > 0) {
    backward--;
  } else {
    forward++;
  }
  
  const params = [];
  if (forward > 0) params.push(`f=${forward}`);
  if (backward > 0) params.push(`b=${backward}`);
  
  return params.length > 0 ? `?${params.join('&')}` : window.location.pathname;
});

onMounted(() => {
  fetchPairings();
  setInterval(updateTime, 1000);
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
      <h1>{{ appTitle }}</h1>
      <p class="subtitle">Let the coding begin and may the odds be ever in your favor!</p>
      
      <div class="today-label">TODAY</div>
      
      <div class="pairing-container">
        <div v-for="(pair, index) in pairings" :key="index" class="pairing-row">
          <div class="person left">
            <span class="name">{{ formatFirstName(pair.user1['full name']) }}</span>
            <div class="avatar">
              <img v-if="pair.user1.email" :src="getGravatarUrl(pair.user1.email)" alt="Avatar" class="avatar-img" />
              <User v-else :size="24" />
            </div>
          </div>
          
          <Repeat class="swap-icon" :size="20" />
          
          <div class="person right">
            <div class="avatar">
              <img v-if="pair.user2.email" :src="getGravatarUrl(pair.user2.email)" alt="Avatar" class="avatar-img" />
              <User v-else :size="24" />
            </div>
            <span class="name">{{ formatFirstName(pair.user2['full name']) }}</span>
          </div>
        </div>
      </div>
      
      <div class="divider"></div>
      
      <div class="footer-meta">
        <span>Set {{ currentSet }}</span>
        <div class="separator"></div>
        <span>{{ formattedDateTime }}</span>
        <div class="separator"></div>
        <a href="https://github.com/darkcolonist/pair-programmers-r2" target="_blank" class="github-link">
          <Github :size="16" />
        </a>
      </div>
      
      <div class="footer-nav">
        <a :href="prevLink" class="nav-item">
          <span class="nav-label">Previous</span>
          <div class="nav-pairings">
            <div v-for="(pair, idx) in previousPairings" :key="idx" class="mini-pair">
              <img :src="getGravatarUrl(pair.user1.email, 16)" class="mini-avatar" />
              <span>{{ formatFirstName(pair.user1['full name']) }}</span>
              <span class="mini-arrow">-></span>
              <img :src="getGravatarUrl(pair.user2.email, 16)" class="mini-avatar" />
              <span>{{ formatFirstName(pair.user2['full name']) }}</span>
            </div>
          </div>
        </a>
        
        <a :href="nextLink" class="nav-item">
          <span class="nav-label">Next</span>
          <div class="nav-pairings">
            <div v-for="(pair, idx) in nextPairings" :key="idx" class="mini-pair">
              <img :src="getGravatarUrl(pair.user1.email, 16)" class="mini-avatar" />
              <span>{{ formatFirstName(pair.user1['full name']) }}</span>
              <span class="mini-arrow">-></span>
              <img :src="getGravatarUrl(pair.user2.email, 16)" class="mini-avatar" />
              <span>{{ formatFirstName(pair.user2['full name']) }}</span>
            </div>
          </div>
        </a>
      </div>
    </div>
  </div>
</template>


<style scoped>
/* Scoped styles if needed, though most are in style.css */
</style>
