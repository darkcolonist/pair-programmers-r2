<script setup>
import { ref, onMounted, computed } from 'vue';
import Papa from 'papaparse';
import { User, Repeat, Github, Box, Loader2, AlertCircle, ExternalLink } from 'lucide-vue-next';
import md5 from 'md5';

const usersList = ref([]);
const isLoading = ref(true);
const error = ref(null);
const sheetUrl = import.meta.env.VITE_SHEET_CSV_URL;
const appTitle = import.meta.env.VITE_APP_TITLE || 'Pair Programmers';
const currentTime = ref(new Date());
const showOnboarding = ref(false);

const dismissOnboarding = () => {
  showOnboarding.value = false;
  localStorage.setItem('pair_onboarding_website_seen', 'true');
};

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

onMounted(() => {
  fetchPairings();
  setInterval(updateTime, 1000);
  
  // Check if onboarding was already seen
  const seen = localStorage.getItem('pair_onboarding_website_seen');
  if (!seen) {
    // Show after a short delay to ensure everything is rendered
    setTimeout(() => {
      showOnboarding.value = true;
    }, 2000);
  }
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
            <div class="avatar-wrapper" :class="{ 'has-website': pair.user1.website }">
              <div class="avatar">
                <img v-if="pair.user1.email" :src="getGravatarUrl(pair.user1.email)" alt="Avatar" class="avatar-img" />
                <User v-else :size="24" />
              </div>
              <a v-if="pair.user1.website" :href="pair.user1.website" target="_blank" class="avatar-link-overlay">
                <ExternalLink :size="20" />
                <div class="website-preview">
                  <div class="preview-header">
                    <div class="preview-dots"><span></span><span></span><span></span></div>
                    <span class="preview-title">Quick View</span>
                  </div>
                  <div class="preview-body">
                    <div class="preview-url">{{ pair.user1.website }}</div>
                    <div class="preview-hint">Click to visit site</div>
                  </div>
                </div>
              </a>
            </div>
          </div>
          
          <Repeat class="swap-icon" :size="20" />
          
          <div class="person right">
            <div class="avatar-wrapper" :class="{ 'has-website': pair.user2.website }">
              <div class="avatar">
                <img v-if="pair.user2.email" :src="getGravatarUrl(pair.user2.email)" alt="Avatar" class="avatar-img" />
                <User v-else :size="24" />
              </div>
              <a v-if="pair.user2.website" :href="pair.user2.website" target="_blank" class="avatar-link-overlay">
                <ExternalLink :size="20" />
                <div class="website-preview">
                  <div class="preview-header">
                    <div class="preview-dots"><span></span><span></span><span></span></div>
                    <span class="preview-title">Quick View</span>
                  </div>
                  <div class="preview-body">
                    <div class="preview-url">{{ pair.user2.website }}</div>
                    <div class="preview-hint">Click to visit site</div>
                  </div>
                </div>
              </a>
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
        <div class="nav-item">
          <span class="nav-label">Previous</span>
          <div class="nav-pairings">
            <div v-for="(pair, idx) in previousPairings" :key="idx" class="mini-pair">
              <span class="mini-name left">{{ formatFirstName(pair.user1['full name']) }}</span>
              <img :src="getGravatarUrl(pair.user1.email, 20)" class="mini-avatar" />
              <span class="mini-arrow">&lt;-&gt;</span>
              <img :src="getGravatarUrl(pair.user2.email, 20)" class="mini-avatar" />
              <span class="mini-name right">{{ formatFirstName(pair.user2['full name']) }}</span>
            </div>
          </div>
        </div>
        
        <div class="nav-item">
          <span class="nav-label">Next</span>
          <div class="nav-pairings">
            <div v-for="(pair, idx) in nextPairings" :key="idx" class="mini-pair">
              <span class="mini-name left">{{ formatFirstName(pair.user1['full name']) }}</span>
              <img :src="getGravatarUrl(pair.user1.email, 20)" class="mini-avatar" />
              <span class="mini-arrow">&lt;-&gt;</span>
              <img :src="getGravatarUrl(pair.user2.email, 20)" class="mini-avatar" />
              <span class="mini-name right">{{ formatFirstName(pair.user2['full name']) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Onboarding Tooltip -->
      <Transition name="fade">
        <div v-if="showOnboarding" class="onboarding-toast">
          <div class="onboarding-content">
            <div class="onboarding-badge">NEW</div>
            <p>Hover on avatars to discover developer websites</p>
            <button @click="dismissOnboarding" class="onboarding-close">Got it</button>
          </div>
          <div class="onboarding-glow"></div>
        </div>
      </Transition>
    </div>
  </div>
</template>


<style scoped>
.avatar-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar-link-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(3, 7, 18, 0.8);
  color: var(--primary-green);
  border-radius: 6px;
  opacity: 0;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 10;
  text-decoration: none;
}

.avatar-wrapper.has-website:hover .avatar-link-overlay {
  opacity: 1;
}

.website-preview {
  position: absolute;
  bottom: calc(100% + 15px);
  left: 50%;
  transform: translateX(-50%) translateY(10px) scale(0.95);
  width: 240px;
  background: rgba(15, 23, 42, 0.95);
  backdrop-filter: blur(16px);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  overflow: hidden;
  opacity: 0;
  visibility: hidden;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.8);
  pointer-events: none;
  text-align: left;
}

.avatar-wrapper.has-website:hover .website-preview {
  opacity: 1;
  visibility: visible;
  transform: translateX(-50%) translateY(0) scale(1);
}

.website-preview::after {
  content: '';
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  border-width: 8px 8px 0 8px;
  border-style: solid;
  border-color: var(--border-color) transparent transparent transparent;
}

.preview-header {
  height: 28px;
  background: rgba(255, 255, 255, 0.05);
  display: flex;
  align-items: center;
  padding: 0 10px;
  gap: 6px;
  border-bottom: 1px solid var(--border-color);
}

.preview-dots {
  display: flex;
  gap: 4px;
}

.preview-dots span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--text-secondary);
  opacity: 0.3;
}

.preview-title {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.65rem;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 600;
}

.preview-body {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.preview-url {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.75rem;
  color: var(--primary-green);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  direction: rtl;
  text-align: left;
}

.preview-hint {
  font-size: 0.65rem;
  color: var(--text-secondary);
  opacity: 0.6;
}

/* Onboarding Toast */
.onboarding-toast {
  position: fixed;
  bottom: 2rem;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(15, 23, 42, 0.9);
  backdrop-filter: blur(12px);
  border: 1px solid var(--primary-green);
  padding: 1rem 1.5rem;
  border-radius: 100px;
  z-index: 100;
  display: flex;
  align-items: center;
  box-shadow: 0 10px 40px -5px rgba(74, 222, 128, 0.2);
}

.onboarding-content {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.onboarding-badge {
  background: var(--primary-green);
  color: var(--bg-color);
  font-size: 0.7rem;
  font-weight: 800;
  padding: 2px 8px;
  border-radius: 4px;
  font-family: 'JetBrains Mono', monospace;
}

.onboarding-content p {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 500;
  color: var(--text-primary);
  white-space: nowrap;
}

.onboarding-close {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: var(--text-secondary);
  padding: 4px 12px;
  border-radius: 50px;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s;
}

.onboarding-close:hover {
  background: rgba(255, 255, 255, 0.1);
  color: var(--text-primary);
  border-color: rgba(255, 255, 255, 0.4);
}

.onboarding-glow {
  position: absolute;
  inset: -2px;
  background: linear-gradient(90deg, transparent, var(--primary-green), transparent);
  opacity: 0.2;
  filter: blur(10px);
  border-radius: 100px;
  z-index: -1;
}

/* Transitions */
.fade-enter-active, .fade-leave-active {
  transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(20px);
}

@media (max-width: 540px) {
  .website-preview {
    display: none; /* Hide preview on mobile as hover is tricky */
  }
}
</style>
