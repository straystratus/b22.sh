const THEMES = {
  1: {
    '--bg': '#000',
    '--fg': '#87CEEB',
    '--prompt': '#00BFFF',
    '--dir': '#0f97cc',
    '--file': '#B0E0E6',
  },
  2: {
    '--bg': '#111',
    '--fg': '#39FF14',
    '--prompt': '#0f0',
    '--dir': '#29a329',
    '--file': '#99ff99',
  },
  3: {
    '--bg': '#002b36',
    '--fg': '#93a1a1',
    '--prompt': '#268bd2',
    '--dir': '#2aa198',
    '--file': '#b58900',
  },
  4: {
    '--bg': '#181818',
    '--fg': '#00ffb6',
    '--prompt': '#ff00b6',
    '--dir': '#ffb600',
    '--file': '#00b6ff',
  },
};

function setTheme(theme) {
  if (!THEMES[theme]) return;
  Object.entries(THEMES[theme]).forEach(([k, v]) => {
    document.documentElement.style.setProperty(k, v);
  });
  localStorage.setItem('b22_theme', theme);
}

const savedTheme = localStorage.getItem('b22_theme') || '1';
setTheme(savedTheme);

const fs = {
  aboutme: window.aboutme,
  resources: window.resources,
  random: window.random
};

let currentPath = [];
let commandHistory = JSON.parse(localStorage.getItem('commandHistory') || '[]');
let historyIndex = commandHistory.length;

const PLAYLIST = [
  { name: "01", src: "public/music/01. Main Menu.mp3" },
  { name: "02", src: "public/music/02. Theme Shop.mp3" },
  { name: "03", src: "public/music/03. Friend List.mp3" },
  { name: "04", src: "public/music/04. Menu 01 (Wii Music).mp3" },
  { name: "05", src: "public/music/05. Nintendo 3DS Camera - Slideshow (Pop).mp3" },
  { name: "06", src: "public/music/06. Credits (Wii Play Motion).mp3" },
  { name: "07", src: "public/music/kaitenzushi.mp3" }
];

let currentMusicIndex = null;
let audio = null;

const prompt = document.getElementById('prompt');
const input = document.getElementById('command-input');
const historyDiv = document.getElementById('history');
const historyContainer = document.getElementById('history-container');

function getCurrentDir() {
  return currentPath.reduce((dir, segment) => 
    (dir && typeof dir[segment] === "object" ? dir[segment] : null), fs);
}

function resolvePath(pathStr = "") {
  const segments = pathStr.split('/').filter(Boolean);
  let base = pathStr.startsWith('/') ? [] : [...currentPath];
  for (const seg of segments) {
    if (seg === '.') continue;
    if (seg === '..') base.pop();
    else base.push(seg);
  }
  return base;
}

function listDirectory([dirArg]) {
  const path = resolvePath(dirArg || "");
  let dir = fs;
  for (const segment of path) {
    if (!dir[segment]) return `ls: cannot access '${dirArg}': No such file or directory`;
    dir = dir[segment];
  }
  if (typeof dir !== 'object') return `ls: not a directory`;
  return Object.entries(dir).map(([k, v]) =>
    `<span class="${typeof v === 'object' ? 'dir' : 'file'}">${k}</span>`
  ).join('  ');
}

function changeDirectory([dirArg]) {
  if (!dirArg) {
    currentPath = [];
    updatePrompt();
    return '';
  }
  const path = resolvePath(dirArg);
  let dir = fs;
  for (const segment of path) {
    if (!dir[segment] || typeof dir[segment] !== 'object')
      return `cd: ${dirArg}: Not a directory`;
    dir = dir[segment];
  }
  currentPath = path;
  updatePrompt();
  return '';
}

function printWorkingDirectory() {
  return '/' + (currentPath.length ? currentPath.join('/') : '');
}

function readFile([filePath]) {
  if (!filePath) return 'cat: missing file operand';
  const parts = resolvePath(filePath);
  const file = parts.pop();
  let dir = fs;
  for (const segment of parts) {
    if (!dir[segment]) return `cat: ${filePath}: No such file or directory`;
    dir = dir[segment];
  }
  if (!dir[file]) return `cat: ${filePath}: No such file or directory`;
  if (typeof dir[file] === 'object') return `cat: ${filePath}: Is a directory`;
  return dir[file];
}

function displayTree() {
  const dir = getCurrentDir();
  if (!dir) return 'tree: cannot access current directory';
  let output = '/' + (currentPath.length ? currentPath.join('/') : '') + '\n';
  function build(node, prefix = '') {
    const keys = Object.keys(node);
    keys.forEach((k, i) => {
      const isLast = i === keys.length - 1;
      output += `${prefix}${isLast ? '‚ĒĒ‚ĒÄ‚ĒÄ ' : '‚Ēú‚ĒÄ‚ĒÄ '}${k}\n`;
      if (typeof node[k] === 'object') build(node[k], prefix + (isLast ? '    ' : '‚Ēā   '));
    });
  }
  build(dir);
  return output;
}

function showHelp() {
  return `Available commands:
lazy         - more intuitive version
ls [dir]     - list directory contents
cd [dir]     - change directory
pwd          - print working directory
cat [file]   - display file contents
tree         - show directory tree
clear        - clear terminal
help         - show this help
theme [name] - change color theme (type 'theme' for list)
music        - play some music !`;
}

function clearScreen() {
  historyDiv.innerHTML = '';
  return '';
}

function printAsciiLetterByLetter(ascii, callback) {
  const outputDiv = document.createElement('div');
  outputDiv.className = 'output';
  outputDiv.style.whiteSpace = 'pre';
  historyDiv.appendChild(outputDiv);

  let i = 0;
  function printNext() {
    if (i < ascii.length) {
      outputDiv.textContent += ascii[i];
      i++;
      setTimeout(printNext, 7);
    } else if (callback) {
      callback();
    }
    historyContainer.scrollTop = historyContainer.scrollHeight;
  }
  printNext();
}

const commands = {
  ls: listDirectory,
  cd: changeDirectory,
  pwd: printWorkingDirectory,
  cat: readFile,
  tree: displayTree,
  help: showHelp,
  clear: clearScreen,
  b22: () => null,
  theme: ([arg]) => {
    if (!arg) {
      return 'Available themes: ' + Object.keys(THEMES).join(', ') +
        '\nUsage: theme [name]';
    }
    if (!THEMES[arg]) {
      return `Unknown theme "${arg}". Try: ` + Object.keys(THEMES).join(', ');
    }
    setTheme(arg);
    return `Theme set to "${arg}".`;
  },
  music: () => {
    let list = PLAYLIST.map(
      (track, i) => (currentMusicIndex === i && audio && !audio.paused ? "‚Ė∂ " : "  ") + (i + 1) + ". " + track.name
    ).join('\n');
    return `Playlist:\n${list}\n\nUse :\n- play [n]\n- pause\n- resume`;
  },
  play: ([arg]) => {
    if (!arg || !/^\d+$/.test(arg)) return "use : play [n]";
    let idx = parseInt(arg, 10) - 1;
    if (idx < 0 || idx >= PLAYLIST.length) return "Music not valid.";
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    audio = new Audio(PLAYLIST[idx].src);
    audio.play();
    currentMusicIndex = idx;
    return `Lecture : ${PLAYLIST[idx].name}`;
  },
  pause: () => {
    if (audio && !audio.paused) {
      audio.pause();
      return "Music paused.";
    }
    return "No music currently.";
  },
  resume: () => {
    if (audio && audio.paused) {
      audio.play();
      return "Music resumed.";
    }
    return "No music to resume.";
  },
};

function executeCommand(line) {
  const trimmed = line.trim();
  if (!trimmed) return { output: '', silent: false };
  
  if (trimmed === 'b22') {
    const ascii = 
    `░▒▓█▓▒         ░▒▓███████▓▒░  ░▒▓███████▓▒░  
  ░▒▓█▓▒                ░▒▓█▓▒░        ░▒▓█▓▒░ 
  ░▒▓█▓▒                ░▒▓█▓▒░        ░▒▓█▓▒░ 
  ░▒▓███████▓▒░   ░▒▓██████▓▒░   ░▒▓██████▓▒░  
  ░▒▓█▓▒░░▒▓█▓▒░ ░▒▓█▓▒░        ░▒▓█▓▒░        
  ░▒▓█▓▒░░▒▓█▓▒░ ░▒▓█▓▒░        ░▒▓█▓▒░        
  ░▒▓███████▓▒░  ░▒▓████████▓▒░ ░▒▓████████▓▒░`;
    addToHistory(trimmed, '');
    printAsciiLetterByLetter(ascii);
    return { output: '', silent: true };
  }

  const [cmd, ...args] = trimmed.split(/\s+/);
  if (commands[cmd]) {
    try {
      const result = commands[cmd](args);
      return { output: result ?? '', silent: cmd === 'cd' || cmd === 'clear' };
    } catch {
      return { output: `${cmd}: error executing command`, silent: false };
    }
  }

  return { output: `${cmd}: command not found`, silent: false };
}

function updatePrompt() {
  prompt.textContent = `deus@machina:/${currentPath.join('/')}$ `;
}

function addPromptOnly() {
  const promptDiv = document.createElement('div');
  promptDiv.innerHTML = `<span class="prompt">${prompt.textContent}</span>`;
  historyDiv.appendChild(promptDiv);
  historyContainer.scrollTop = historyContainer.scrollHeight;
}

function addToHistory(command, output) {
  const cmdDiv = document.createElement('div');
  cmdDiv.innerHTML = `<span class="prompt">${prompt.textContent}</span><span class="command">${command}</span>`;
  historyDiv.appendChild(cmdDiv);
  if (output) {
    const outDiv = document.createElement('div');
    outDiv.className = 'output';
    outDiv.innerHTML = output;
    historyDiv.appendChild(outDiv);
  }
  historyContainer.scrollTop = historyContainer.scrollHeight;
}

let autocompleteState = {
  fragment: '',
  context: '',
  matches: [],
  index: 0,
  lastValue: ''
};

input.addEventListener('keydown', function(e) {
  if (e.key === 'Enter') {
    const command = input.value.trim();
    if (command) {
      commandHistory.push(command);
      localStorage.setItem('commandHistory', JSON.stringify(commandHistory));
      historyIndex = commandHistory.length;

      const { output, silent } = executeCommand(command);

      if (command === 'clear') {
        input.value = '';
        return;
      }

      addToHistory(command, output);

      if (!output && !silent) addPromptOnly();
    }
    input.value = '';
    autocompleteState = { fragment: '', context: '', matches: [], index: 0, lastValue: '' };
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    if (historyIndex > 0) input.value = commandHistory[--historyIndex];
    autocompleteState = { fragment: '', context: '', matches: [], index: 0, lastValue: '' };
  } else if (e.key === 'ArrowDown') {
    e.preventDefault();
    if (historyIndex < commandHistory.length - 1) input.value = commandHistory[++historyIndex];
    else { historyIndex = commandHistory.length; input.value = ''; }
    autocompleteState = { fragment: '', context: '', matches: [], index: 0, lastValue: '' };
  } else if (e.key === 'Tab') {
    e.preventDefault();
    const value = input.value;
    const split = value.trim().split(/\s+/);

    if (split.length === 1) {
      const fragment = split[0];
      if (!fragment) return;
      if (
        autocompleteState.context !== 'command' ||
        autocompleteState.fragment !== fragment ||
        autocompleteState.lastValue !== value
      ) {
        autocompleteState.context = 'command';
        autocompleteState.fragment = fragment;
        autocompleteState.matches = Object.keys(commands).filter(cmd => cmd.startsWith(fragment));
        autocompleteState.index = 0;
        autocompleteState.lastValue = value;
      }
      const matches = autocompleteState.matches;
      if (matches.length === 0) return;
      input.value = matches[autocompleteState.index] + ' ';
      autocompleteState.index = (autocompleteState.index + 1) % matches.length;
      autocompleteState.lastValue = input.value;
    }
    else if (split.length >= 2) {
      const cmd = split[0];
      if (cmd === 'cat') {
        const partial = split[1];
        let dir = getCurrentDir();
        if (!dir) return;
        const files = Object.entries(dir)
          .filter(([k, v]) => typeof v !== 'object')
          .map(([k, v]) => k);
        if (
          autocompleteState.context !== 'cat' ||
          autocompleteState.fragment !== partial ||
          autocompleteState.lastValue !== value
        ) {
          autocompleteState.context = 'cat';
          autocompleteState.fragment = partial;
          autocompleteState.matches = files.filter(f => f.startsWith(partial));
          autocompleteState.index = 0;
          autocompleteState.lastValue = value;
        }
        const matches = autocompleteState.matches;
        if (matches.length === 0) return;
        input.value = cmd + ' ' + matches[autocompleteState.index];
        autocompleteState.index = (autocompleteState.index + 1) % matches.length;
        autocompleteState.lastValue = input.value;
      }
    }
  }
});

document.addEventListener('click', () => input.focus());
window.addEventListener('load', () => {
  input.focus();
  updatePrompt();
});