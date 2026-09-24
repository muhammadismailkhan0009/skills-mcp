export const MANAGEMENT_PAGE = String.raw`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>skills-mcp</title>
  <style>
    body{font:15px system-ui,sans-serif;max-width:980px;margin:40px auto;padding:0 20px;color:#1f2937}
    h1{margin-bottom:4px} .muted{color:#6b7280} form,.card{border:1px solid #d1d5db;border-radius:10px;padding:16px;margin:14px 0}
    input{padding:8px;margin:4px;min-width:180px} button{padding:7px 10px;margin:4px;cursor:pointer}
    code,pre{background:#f3f4f6;border-radius:6px} pre{padding:12px;overflow:auto;white-space:pre-wrap}
    .row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.grow{flex:1}.error{color:#b91c1c}
  </style>
</head>
<body>
  <h1>skills-mcp</h1>
  <div class="muted">Manage public GitHub skill repositories.</div>

  <form id="add-form">
    <strong>Add repository</strong><br>
    <input name="id" placeholder="source-id" required>
    <input name="repository" placeholder="owner/repository" required>
    <input name="ref" placeholder="ref (optional)">
    <button>Add</button>
    <span id="form-error" class="error"></span>
  </form>

  <h2>Repositories</h2>
  <div id="sources"></div>
  <h2>Skills</h2>
  <div id="skills" class="muted">Select a repository.</div>
  <h2>Skill detail</h2>
  <div id="detail" class="muted">Select a skill.</div>
  <script>
    const sourcesEl = document.getElementById('sources');
    const skillsEl = document.getElementById('skills');
    const detailEl = document.getElementById('detail');
    const formError = document.getElementById('form-error');

    async function api(url, options = {}) {
      const response = await fetch(url, options);
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || ('Request failed: ' + response.status));
      }
      if (response.status === 204) return null;
      return response.json();
    }

    async function loadSources() {
      const sources = await api('/api/sources');
      sourcesEl.innerHTML = '';
      for (const source of sources) {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML =
          '<div class="row"><strong class="grow">' + source.id + '</strong>' +
          '<code>' + source.repository + '</code>' +
          '<span>' + (source.enabled ? 'enabled' : 'disabled') + '</span></div>';
        const actions = document.createElement('div');
        actions.className = 'row';
        const view = button('View skills', () => loadSkills(source.id));
        const toggle = button(source.enabled ? 'Disable' : 'Enable', async () => {
          await api('/api/sources/' + encodeURIComponent(source.id), {
            method: 'PATCH',
            headers: {'content-type':'application/json'},
            body: JSON.stringify({enabled: !source.enabled})
          });
          await loadSources();
          skillsEl.textContent = 'Select a repository.';
          detailEl.textContent = 'Select a skill.';
        });
        const refresh = button('Refresh', async () => {
          await api('/api/sources/' + encodeURIComponent(source.id) + '/refresh', {method:'POST'});
          await loadSkills(source.id);
        });
        const remove = button('Remove', async () => {
          await api('/api/sources/' + encodeURIComponent(source.id), {method:'DELETE'});
          await loadSources();
          skillsEl.textContent = 'Select a repository.';
          detailEl.textContent = 'Select a skill.';
        });
        actions.append(view, toggle, refresh, remove);
        card.append(actions);
        sourcesEl.append(card);
      }
    }
    async function loadSkills(sourceId) {
      const skills = await api('/api/skills?source=' + encodeURIComponent(sourceId));
      skillsEl.innerHTML = '';
      for (const skill of skills) {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = '<strong>' + skill.name + '</strong><br><span class="muted">' +
          (skill.description || '') + '</span><br><code>' + skill.id + '</code>';
        card.append(button('Inspect', () => loadSkill(skill.id)));
        skillsEl.append(card);
      }
      if (!skills.length) skillsEl.textContent = 'No skills discovered.';
    }

    async function loadSkill(id) {
      const skill = await api('/api/skill?id=' + encodeURIComponent(id));
      detailEl.innerHTML = '<div class="card"><strong>' + skill.metadata.name +
        '</strong><pre>' + escapeHtml(skill.content) + '</pre><h3>Resources</h3><div id="resources"></div></div>';
      const resources = detailEl.querySelector('#resources');
      for (const resource of skill.resources) {
        resources.append(button(resource, async () => {
          const data = await api('/api/resource?id=' + encodeURIComponent(id) +
            '&path=' + encodeURIComponent(resource));
          detailEl.querySelector('pre').textContent = data.content;
        }));
      }
    }
    function button(label, action) {
      const element = document.createElement('button');
      element.type = 'button';
      element.textContent = label;
      element.onclick = () => action().catch(showError);
      return element;
    }

    function escapeHtml(value) {
      return value.replace(/[&<>"']/g, c => ({
        '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
      })[c]);
    }

    function showError(error) {
      formError.textContent = error.message || String(error);
    }

    document.getElementById('add-form').onsubmit = async event => {
      event.preventDefault();
      formError.textContent = '';
      const values = Object.fromEntries(new FormData(event.target));
      const body = {id: values.id, repository: values.repository};
      if (values.ref) body.ref = values.ref;
      await api('/api/sources', {
        method:'POST',
        headers:{'content-type':'application/json'},
        body:JSON.stringify(body)
      });
      event.target.reset();
      await loadSources();
    };
    loadSources().catch(showError);
  </script>
</body>
</html>`;
