  let lang  = 'auto';
  let depth = 'student';
  let prov  = 'groq';
  let apiKey = '';

  const PROVS = {
    claude: {
      label: 'Claude',
      hint: 'sk-ant-...',
      note: 'Free credits at <a href="https://console.anthropic.com" target="_blank">console.anthropic.com</a>',
      sk: 'cr_claude'
    },
    openai: {
      label: 'OpenAI',
      hint: 'sk-...',
      note: 'Keys at <a href="https://platform.openai.com/api-keys" target="_blank">platform.openai.com</a>',
      sk: 'cr_openai'
    },
    gemini: {
      label: 'Gemini',
      hint: 'AIzaSy...',
      note: '<strong>Free tier available</strong> at <a href="https://aistudio.google.com/app/apikey" target="_blank">aistudio.google.com</a> — no card needed.',
      sk: 'cr_gemini'
    },
    groq: {
      label:'Groq',
      hint:'gsk_',
      note:'<strong>Free tier available</strong> at <a href="https://api.groq.com/openai/v1/chat/completions" target="_blank">llama-3.1-8b-instant</a> — no card needed.',
      sk:'cr_groq'
    }
  };

  const SAMPLES = {
    auto: `def is_palindrome(s):
    s = s.lower().replace(' ', '')
    return s == s[::-1]

words = ['racecar', 'hello', 'level', 'world']
for w in words:
    print(f"{w}: {is_palindrome(w)}")`,
    python: `class Stack:
    def __init__(self):
        self.items = []
    def push(self, item):
        self.items.append(item)
    def pop(self):
        return self.items.pop() if self.items else None
    def peek(self):
        return self.items[-1] if self.items else None`,
    javascript: `async function fetchUser(id) {
  try {
    const res = await fetch('/api/users/' + id);
    if (!res.ok) throw new Error('User not found');
    const data = await res.json();
    return data;
  } catch (err) {
    console.error('Failed:', err.message);
    return null;
  }
}`,
    sql: `SELECT u.name, COUNT(o.id) as total_orders,
       SUM(o.amount) as total_spent
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
WHERE o.created_at > NOW() - INTERVAL '30 days'
GROUP BY u.name
HAVING COUNT(o.id) > 5
ORDER BY total_spent DESC;`,
    java: `public int binarySearch(int[] arr, int target) {
    int left = 0, right = arr.length - 1;
    while (left <= right) {
        int mid = left + (right - left) / 2;
        if (arr[mid] == target) return mid;
        if (arr[mid] < target) left = mid + 1;
        else right = mid - 1;
    }
    return -1;
}`,
    cpp: `#include <vector>
using namespace std;

int maxSubArray(vector<int>& nums) {
    int maxSum = nums[0], curr = nums[0];
    for (int i = 1; i < nums.size(); i++) {
        curr = max(nums[i], curr + nums[i]);
        maxSum = max(maxSum, curr);
    }
    return maxSum;
}`
  };

  // ── Init ──
  window.addEventListener('DOMContentLoaded', () => {
    updateModalNote();
    for (const p of Object.keys(PROVS)) {
      const saved = sessionStorage.getItem(PROVS[p].sk);
      if (saved) { prov = p; apiKey = saved; setProv(p, true); break; }
    }
    updateKeyBtn();
    document.getElementById('keyIn').addEventListener('keydown', e => {
      if (e.key === 'Enter') saveKey();
    });
  });

  // ── Language / Depth ──
  function setLang(btn, l) {
    document.querySelectorAll('.lang-tab').forEach(b => b.classList.remove('on'));
    btn.classList.add('on');
    lang = l;
  }

  function setDepth(btn, d) {
    document.querySelectorAll('.depth-tab').forEach(b => b.classList.remove('on'));
    btn.classList.add('on');
    depth = d;
  }

  function loadSample() {
    document.getElementById('codeIn').value = SAMPLES[lang] || SAMPLES.auto;
    hideOutput();
  }

  function hideOutput() {
    const s = document.getElementById('outputSection');
    s.classList.remove('show');
    s.innerHTML = '';
  }

  // ── AI Status indicator ──
  function setAIStatus(state) {
    const dot  = document.getElementById('aiDot');
    const text = document.getElementById('aiStatusText');
    dot.className = 'ai-dot' + (state === 'thinking' ? ' active' : '');
    text.textContent = state === 'thinking' ? 'thinking...' : state === 'done' ? 'done' : 'ready';
  }

  // ── Key / Provider ──
  function openModal() {
    document.getElementById('overlay').classList.add('open');
    setTimeout(() => document.getElementById('keyIn').focus(), 100);
  }
  function closeModal() {
    document.getElementById('overlay').classList.remove('open');
    document.getElementById('modalErr').textContent = '';
  }

  function setProv(p, silent) {
    prov = p;
    ['claude','openai','gemini','groq'].forEach(k => {
      document.getElementById('pb-' + k).classList.toggle('on', k === p);
    });
    document.getElementById('keyIn').placeholder = PROVS[p].hint;
    updateModalNote();
  }

  function updateModalNote() {
    document.getElementById('modalNote').innerHTML = PROVS[prov].note;
  }

  function saveKey() {
    const val = document.getElementById('keyIn').value.trim();
    const err = document.getElementById('modalErr');
    if (!val || val.length < 8) { err.textContent = 'Please paste a valid key.'; return; }
    apiKey = val;
    sessionStorage.setItem(PROVS[prov].sk, val);
    updateKeyBtn();
    closeModal();
  }

  function updateKeyBtn() {
    const btn = document.getElementById('keyBtn');
    if (apiKey) {
      btn.classList.add('connected');
      btn.textContent = '✓ ' + PROVS[prov].label;
    } else {
      btn.classList.remove('connected');
      btn.textContent = '⚙ API key';
    }
  }

  // ── Build Prompt ──
  function buildPrompt(code) {
    const voices = {
      beginner:  "Explain to someone who has never programmed. Define every technical term. Use analogies from everyday life.",
      student:   "Explain to a CS student. Technical terms are fine; focus on WHY design choices were made, not just what they do.",
      interview: "Explain with interview-prep focus: include time and space complexity analysis, edge cases to watch out for, and what a senior engineer might follow up with."
    };
    return `You are an expert programming tutor explaining code clearly.

Code (language: ${lang}):
\`\`\`
${code}
\`\`\`

Audience: ${voices[depth]}

Reply ONLY in this JSON (no markdown fences, no extra text):
{
  "summary": "2-3 sentence plain English description of what this code does overall",
  "steps": [
    { "code": "exact snippet or brief line reference", "explanation": "1-2 sentence explanation of what it does and why" }
  ],
  "concepts": ["up to 5 key CS concepts used in this code"]
}

Cover 3-6 meaningful steps. Be conversational, never robotic.`;
  }

  // ── Call API ──
  async function callAPI(prompt) {
    if (prov === 'claude') {
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 1500, messages: [{ role: 'user', content: prompt }] })
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error?.message || `Claude error (${r.status})`);
      return d.content[0].text;
    }
    if (prov === 'openai') {
      const r = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({ model: 'gpt-4o-mini', max_tokens: 1500, messages: [{ role: 'user', content: prompt }] })
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error?.message || `OpenAI error (${r.status})`);
      return d.choices[0].message.content;
    }
    if (prov === 'gemini') {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error?.message || `Gemini error (${r.status})`);
      return d.candidates[0].content.parts[0].text;
    }
    if (prov === 'groq') {
      const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          max_tokens: 1500,
          messages: [{ role: 'user', content: prompt }]
        })
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error?.message || `Groq error (${r.status})`);
      return d.choices[0].message.content;
    }
  }

  // ── Typewriter Effect ──
  function typewrite(el, text, speed, onDone) {
    el.textContent = '';
    const cursor = document.createElement('span');
    cursor.className = 'cursor';
    el.appendChild(cursor);
    let i = 0;
    function tick() {
      if (i < text.length) {
        cursor.before(text[i++]);
        setTimeout(tick, speed);
      } else {
        cursor.remove();
        if (onDone) onDone();
      }
    }
    tick();
  }

  // ── Render Output ──
  function renderOutput(result) {
    const sec = document.getElementById('outputSection');

    // Build skeleton
    sec.innerHTML = `
      <div class="thinking-bar" id="thinkBar">
        <div class="thinking-dots"><span></span><span></span><span></span></div>
        <div class="thinking-text">Reading your code...</div>
      </div>
      <div class="ai-summary" id="summaryBlock" style="display:none">
        <div class="ai-avatar">AI</div>
        <div class="ai-bubble-text" id="summaryText"></div>
      </div>
      <div id="stepsSection" style="display:none">
        <div class="steps-label">line-by-line breakdown</div>
        <div id="stepsList"></div>
      </div>
      <div class="concepts-wrap" id="conceptsBlock" style="display:none">
        <div class="concepts-label">concepts used</div>
        <div class="concept-chips" id="chipsList"></div>
      </div>
    `;

    sec.classList.add('show');

    // Animate: thinking → summary → steps → concepts
    setTimeout(() => {
      document.getElementById('thinkBar').style.display = 'none';
      const summaryBlock = document.getElementById('summaryBlock');
      summaryBlock.style.display = 'flex';
      const summaryEl = document.getElementById('summaryText');

      // Typewrite the summary
      typewrite(summaryEl, result.summary, 18, () => {
        // Show steps one by one
        const stepsSection = document.getElementById('stepsSection');
        stepsSection.style.display = 'block';
        const stepsList = document.getElementById('stepsList');

        result.steps.forEach((step, i) => {
          setTimeout(() => {
            const card = document.createElement('div');
            card.className = 'step-card';
            card.innerHTML = `
              <div class="step-gutter">${i + 1}</div>
              <div class="step-body">
                <div class="step-snippet">${escHtml(step.code)}</div>
                <div class="step-explain">${escHtml(step.explanation)}</div>
              </div>`;
            stepsList.appendChild(card);
            requestAnimationFrame(() => {
              requestAnimationFrame(() => card.classList.add('appear'));
            });

            // After last step, show concepts
            if (i === result.steps.length - 1) {
              setTimeout(() => {
                const conceptsBlock = document.getElementById('conceptsBlock');
                conceptsBlock.style.display = 'block';
                const chipsList = document.getElementById('chipsList');
                result.concepts.forEach(c => {
                  const chip = document.createElement('span');
                  chip.className = 'chip';
                  chip.textContent = c;
                  chipsList.appendChild(chip);
                });
                requestAnimationFrame(() => {
                  requestAnimationFrame(() => conceptsBlock.classList.add('appear'));
                });
                setAIStatus('done');
              }, 300);
            }
          }, i * 350);
        });
      });
    }, 1200);
  }

  // ── Main ──
  async function runExplain() {
    const code = document.getElementById('codeIn').value.trim();
    if (!code) return;

    if (!apiKey) { openModal(); return; }

    const btn = document.getElementById('goBtn');
    btn.disabled = true;
    btn.innerHTML = '<span>Working</span><span class="cursor" style="background:#000;height:14px"></span>';
    setAIStatus('thinking');

    const sec = document.getElementById('outputSection');
    sec.innerHTML = `
      <div class="thinking-bar">
        <div class="thinking-dots"><span></span><span></span><span></span></div>
        <div class="thinking-text" id="thinkMsg">Sending to AI...</div>
      </div>`;
    sec.classList.add('show');

    const msgs = ['Sending to AI...', 'Reading your code...', 'Building explanation...'];
    let mi = 0;
    const msgInterval = setInterval(() => {
      mi++;
      const el = document.getElementById('thinkMsg');
      if (el && mi < msgs.length) el.textContent = msgs[mi];
    }, 900);

    try {
      const prompt = buildPrompt(code);
      let raw = await callAPI(prompt);
      raw = raw.replace(/```json|```/g, '').trim();
// Extract JSON object even if extra text exists
const jsonMatch = raw.match(/\{[\s\S]*\}/);
if (!jsonMatch) throw new Error('Could not parse AI response.');
const result = JSON.parse(jsonMatch[0]);
      clearInterval(msgInterval);
      renderOutput(result);
    } catch (err) {
      clearInterval(msgInterval);
      setAIStatus('ready');
      sec.innerHTML = `<div class="error-card"><strong>Could not generate explanation.</strong><br/>${err.message}</div>`;
    }

    btn.disabled = false;
    btn.innerHTML = '<span>Explain</span><span>→</span>';
  }

  function escHtml(s) {
    const d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }
