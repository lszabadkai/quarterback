import { Storage } from './storage.js';
import { CapacityCalculator } from './capacity.js';
import { GanttChart } from './gantt.js';

class QuarterViewApp {
  constructor() {
    this.capacity = null;
    this.projects = [];
    this.team = [];
    this.regions = [];
    this.roles = [];
    this.settings = null;
    this.currentProject = null;
    this.searchTerm = '';
    this.iceInputsBound = false;
  }

  init() {
    this.loadData();
    this.ensureCapacityTotals();
    this.initUI();
    this.attachEventListeners();
    this.updateCapacityDisplay();
    this.refreshGantt();
  }

  loadData() {
    this.capacity = Storage.loadCapacity();
    const storedProjects = Storage.loadProjects();
    this.projects = storedProjects.map((project, index) => {
      const normalizedAssignees = Array.isArray(project.assignees)
        ? project.assignees
        : [project.assignees].filter(Boolean);
      return {
        id: project.id ?? Date.now() + index,
        status: project.status || 'planned',
        confidence: project.confidence || 'medium',
        type: project.type || 'feature',
        description: project.description || '',
        ...project,
        assignees: normalizedAssignees,
      };
    });
    this.regions = Storage.loadRegions();
    this.roles = Storage.loadRoles();
    this.team = this.normalizeTeamMembers(Storage.loadTeam());
    Storage.saveTeam(this.team);
    this.settings = Storage.loadSettings();
  }

  normalizeTeamMembers(members = []) {
    const defaultRegionId = this.regions[0]?.id ?? null;
    const defaultRoleId = this.roles[0]?.id ?? null;
    return members.map((member, index) => {
      const fallbackName = member.name || `Team Member ${index + 1}`;
      const normalized = {
        ...member,
        id: member.id ?? Date.now() + index,
        name: fallbackName,
        avatar: member.avatar || this.getInitials(fallbackName),
        regionId: member.regionId ?? defaultRegionId,
        roleId: member.roleId ?? defaultRoleId,
      };
      return normalized;
    });
  }

  ensureCapacityTotals() {
    if (typeof this.capacity.netCapacity !== 'number') {
      this.capacity = {
        ...this.capacity,
        ...CapacityCalculator.calculate({
          ...this.capacity,
          team: this.team,
          regions: this.regions,
          roles: this.roles,
          quarter: this.settings.currentQuarter,
        }),
      };
      Storage.saveCapacity(this.capacity);
    }
  }

  initUI() {
    this.syncQuarterSelect();
    const viewSelect = document.getElementById('viewTypeSelect');
    const groupSelect = document.getElementById('groupBySelect');
    if (viewSelect) viewSelect.value = this.settings.viewType;
    if (groupSelect) groupSelect.value = this.settings.groupBy;
    this.renderTeamMembersList();
    this.renderRegionSettings();
    this.renderRoleSettings();
    this.renderUnassignedProjects();
    this.populateAssigneeSelect();
    this.initIceInputs();
  }

  syncQuarterSelect() {
    this.generateQuarterOptions();
  }

  parseQuarterLabel(label) {
    const match = /^Q([1-4])-(\d{4})$/.exec(label);
    if (!match) {
      const fallback = Storage.getCurrentQuarter();
      return this.parseQuarterLabel(fallback);
    }
    return { quarter: parseInt(match[1], 10), year: parseInt(match[2], 10) };
  }

  getQuarterOrder(label) {
    const { quarter, year } = this.parseQuarterLabel(label);
    return year * 4 + (quarter - 1);
  }

  orderToQuarterLabel(order) {
    if (order < 0) return null;
    const year = Math.floor(order / 4);
    const quarterIndex = order % 4;
    const quarter = quarterIndex + 1;
    return `Q${quarter}-${year}`;
  }

  getQuarterDisplay(label) {
    return label.replace('-', ' ');
  }

  generateQuarterOptions() {
    const select = document.getElementById('quarterSelect');
    if (!select) return;

    const nowLabel = Storage.getCurrentQuarter();
    const nowOrder = this.getQuarterOrder(nowLabel);
    const currentOrder = this.getQuarterOrder(this.settings.currentQuarter);
    const startOrder = Math.min(nowOrder, currentOrder) - 2;
    const totalQuarters = 14; // two quarters back + 11 forward (~3.5 years)
    const options = [];

    for (let i = 0; i < totalQuarters; i += 1) {
      const order = startOrder + i;
      const value = this.orderToQuarterLabel(order);
      if (!value) continue;
      options.push({ value, label: this.getQuarterDisplay(value) });
    }

    if (!options.some((option) => option.value === this.settings.currentQuarter)) {
      const value = this.settings.currentQuarter;
      options.push({ value, label: this.getQuarterDisplay(value) });
    }

    const unique = new Map();
    options.forEach((option) => {
      unique.set(option.value, option);
    });

    const sorted = Array.from(unique.values()).sort(
      (a, b) => this.getQuarterOrder(a.value) - this.getQuarterOrder(b.value),
    );

    select.innerHTML = sorted
      .map((option) => `<option value="${option.value}">${option.label}</option>`)
      .join('');
    select.value = this.settings.currentQuarter;
  }

  attachEventListeners() {
    document.getElementById('capacityBtn')?.addEventListener('click', () => this.openCapacityModal());
    document.getElementById('exportBtn')?.addEventListener('click', () => this.openExportModal());
    document.getElementById('shareBtn')?.addEventListener('click', () => this.shareView());
    document.getElementById('addProjectBtn')?.addEventListener('click', () => this.openProjectModal());
    document.getElementById('setupCapacityBtn')?.addEventListener('click', () => this.openCapacityModal());
    document.getElementById('addFirstProjectBtn')?.addEventListener('click', () => this.openProjectModal());
    document.getElementById('filterBtn')?.addEventListener('click', () => this.showToast('Advanced filters coming soon', 'success'));
    document.getElementById('importBtn')?.addEventListener('click', () => this.openImportModal());

    document.getElementById('quarterSelect')?.addEventListener('change', (event) => {
      this.changeQuarter(event.target.value);
    });

    document.getElementById('viewTypeSelect')?.addEventListener('change', (event) => {
      this.changeView(event.target.value);
    });

    document.getElementById('groupBySelect')?.addEventListener('change', (event) => {
      this.changeGrouping(event.target.value);
    });

    document.getElementById('searchInput')?.addEventListener('input', (event) => {
      this.searchProjects(event.target.value);
    });

    document.getElementById('closeCapacityModal')?.addEventListener('click', () => this.closeCapacityModal());
    document.getElementById('cancelCapacityBtn')?.addEventListener('click', () => this.closeCapacityModal());
    document.getElementById('applyCapacityBtn')?.addEventListener('click', () => this.applyCapacity());
    document.getElementById('addTeamMemberBtn')?.addEventListener('click', () => this.addTeamMember());
    document.getElementById('addRegionBtn')?.addEventListener('click', () => this.addRegion());
    document.getElementById('addRoleBtn')?.addEventListener('click', () => this.addRole());

    document.getElementById('numEngineers')?.addEventListener('input', () => this.handleEngineerCountChange());
    document.getElementById('ptoPerPerson')?.addEventListener('input', () => this.recalculateCapacity());
    document.getElementById('adhocReserve')?.addEventListener('change', () => this.recalculateCapacity());
    document.getElementById('bugReserve')?.addEventListener('change', () => this.recalculateCapacity());

    document.getElementById('closeProjectModal')?.addEventListener('click', () => this.closeProjectModal());
    document.getElementById('cancelProjectBtn')?.addEventListener('click', () => this.closeProjectModal());
    document.getElementById('saveProjectBtn')?.addEventListener('click', () => this.saveProject());
    document.getElementById('deleteProjectBtn')?.addEventListener('click', () => this.deleteProject());

    document.getElementById('closeExportModal')?.addEventListener('click', () => this.closeExportModal());
    document.getElementById('exportPNGBtn')?.addEventListener('click', () => this.exportPNG());
    document.getElementById('exportCSVBtn')?.addEventListener('click', () => this.exportCSV());
    document.getElementById('exportJSONBtn')?.addEventListener('click', () => this.exportJSON());
    document.getElementById('closeImportModal')?.addEventListener('click', () => this.closeImportModal());
    document.getElementById('cancelImportBtn')?.addEventListener('click', () => this.closeImportModal());
    document.getElementById('runImportBtn')?.addEventListener('click', () => this.handleImportSubmit());

    document.querySelectorAll('.modal').forEach((modal) => {
      modal.addEventListener('click', (event) => {
        if (event.target === modal) {
          modal.classList.remove('active');
        }
      });
    });
  }

  openCapacityModal() {
    const engineersInput = document.getElementById('numEngineers');
    if (engineersInput) engineersInput.value = this.capacity.numEngineers ?? this.team.length;
    document.getElementById('ptoPerPerson').value = this.capacity.ptoPerPerson;
    document.getElementById('companyHolidays').value = this.capacity.companyHolidays;
    document.getElementById('adhocReserve').value = this.capacity.adhocReserve;
    document.getElementById('bugReserve').value = this.capacity.bugReserve;

    this.renderTeamMembersList();
    this.recalculateCapacity();
    document.getElementById('capacityModal')?.classList.add('active');
  }

  closeCapacityModal() {
    document.getElementById('capacityModal')?.classList.remove('active');
  }

  renderTeamMembersList() {
    const list = document.getElementById('teamMembersList');
    if (!list) return;
    if (!this.team.length) {
      this.team = Storage.getDefaultTeam();
      Storage.saveTeam(this.team);
      this.populateAssigneeSelect();
    }

    const ensureId = (value, fallback) => (value ?? fallback);

    list.innerHTML = this.team
      .map((member) => {
        const safeName = this.escapeHtml(member.name);
        const regionId = ensureId(member.regionId, this.regions[0]?.id ?? null);
        const roleId = ensureId(member.roleId, this.roles[0]?.id ?? null);
        const regionOptions = this.regions.length
          ? this.regions
              .map(
                (region) => `<option value="${region.id}" ${region.id === regionId ? 'selected' : ''}>${this.escapeHtml(region.name)}</option>`,
              )
              .join('')
          : '<option value="" disabled>No regions configured</option>';
        const roleOptions = this.roles.length
          ? this.roles
              .map(
                (role) => `<option value="${role.id}" ${role.id === roleId ? 'selected' : ''}>${this.escapeHtml(role.name)}</option>`,
              )
              .join('')
          : '<option value="" disabled>No roles configured</option>';

        return `
          <div class="team-member-item" data-id="${member.id}">
            <div class="team-member-fields">
              <input type="text" value="${safeName}" aria-label="Team member name" />
              <select class="team-region-select" aria-label="Select region" data-id="${member.id}">
                ${regionOptions}
              </select>
              <select class="team-role-select" aria-label="Select role" data-id="${member.id}">
                ${roleOptions}
              </select>
            </div>
            <button type="button" class="btn btn-small btn-secondary remove-member-btn" data-id="${member.id}">Remove</button>
          </div>
        `;
      })
      .join('');

    const disableRemoval = this.team.length <= 1;
    list.querySelectorAll('.remove-member-btn').forEach((button) => {
      button.disabled = disableRemoval;
      button.addEventListener('click', () => this.removeTeamMember(parseInt(button.dataset.id, 10)));
    });

    list.querySelectorAll('input').forEach((input) => {
      input.addEventListener('input', (event) => {
        const parent = event.target.closest('.team-member-item');
        const id = parseInt(parent.dataset.id, 10);
        this.renameTeamMember(id, event.target.value);
      });
    });

    list.querySelectorAll('.team-region-select').forEach((select) => {
      select.addEventListener('change', (event) => {
        const id = parseInt(event.target.dataset.id, 10);
        this.updateTeamMemberRegion(id, parseInt(event.target.value, 10));
      });
    });

    list.querySelectorAll('.team-role-select').forEach((select) => {
      select.addEventListener('change', (event) => {
        const id = parseInt(event.target.dataset.id, 10);
        this.updateTeamMemberRole(id, parseInt(event.target.value, 10));
      });
    });
  }

  renderRegionSettings() {
    const container = document.getElementById('regionSettingsList');
    if (!container) return;
    if (!this.regions.length) {
      this.regions = Storage.getDefaultRegions();
      Storage.saveRegions(this.regions);
    }

    container.innerHTML = this.regions
      .map(
        (region) => `
          <div class="config-item" data-id="${region.id}">
            <input type="text" value="${this.escapeHtml(region.name)}" data-field="name" />
            <input type="number" value="${region.ptoDays}" min="0" max="60" data-field="ptoDays" />
            <input type="number" value="${region.holidays}" min="0" max="30" data-field="holidays" />
            <button type="button" class="btn btn-small btn-secondary remove-region-btn" data-id="${region.id}">Remove</button>
          </div>
        `,
      )
      .join('');

    container.querySelectorAll('input').forEach((input) => {
      input.addEventListener('input', (event) => {
        const parent = event.target.closest('.config-item');
        const id = parseInt(parent.dataset.id, 10);
        const field = event.target.dataset.field;
        this.updateRegionField(id, field, event.target.value);
      });
    });

    container.querySelectorAll('.remove-region-btn').forEach((button) => {
      button.addEventListener('click', () => this.removeRegion(parseInt(button.dataset.id, 10)));
    });
  }

  renderRoleSettings() {
    const container = document.getElementById('roleSettingsList');
    if (!container) return;
    if (!this.roles.length) {
      this.roles = Storage.getDefaultRoles();
      Storage.saveRoles(this.roles);
    }

    container.innerHTML = this.roles
      .map(
        (role) => `
          <div class="config-item roles" data-id="${role.id}">
            <input type="text" value="${this.escapeHtml(role.name)}" data-field="name" />
            <input type="number" value="${role.focus}" min="10" max="200" data-field="focus" />
            <button type="button" class="btn btn-small btn-secondary remove-role-btn" data-id="${role.id}">Remove</button>
          </div>
        `,
      )
      .join('');

    container.querySelectorAll('input').forEach((input) => {
      input.addEventListener('input', (event) => {
        const parent = event.target.closest('.config-item');
        const id = parseInt(parent.dataset.id, 10);
        const field = event.target.dataset.field;
        this.updateRoleField(id, field, event.target.value);
      });
    });

    container.querySelectorAll('.remove-role-btn').forEach((button) => {
      button.addEventListener('click', () => this.removeRole(parseInt(button.dataset.id, 10)));
    });
  }

  renderUnassignedProjects() {
    const panel = document.getElementById('unassignedPanel');
    const list = document.getElementById('unassignedList');
    const countBadge = document.getElementById('unassignedCount');
    if (!panel || !list || !countBadge) return;
    const unassigned = this.projects.filter(
      (project) => !Array.isArray(project.assignees) || project.assignees.length === 0,
    );
    countBadge.textContent = unassigned.length;
    if (!unassigned.length) {
      panel.classList.add('hidden');
      list.innerHTML = '<p class="todo-empty">Every project has an owner. ✨</p>';
      return;
    }
    panel.classList.remove('hidden');
    list.innerHTML = unassigned
      .map((project) => {
        const range = this.formatDateRangeLabel(project.startDate, project.endDate);
        return `
          <div class="todo-card" data-id="${project.id}">
            <div class="todo-card-details">
              <h4>${this.escapeHtml(project.name)}</h4>
              <div class="todo-meta">
                <span>${range}</span>
                <span>Status: ${this.escapeHtml(project.status || 'planned')}</span>
                <span>ICE: ${this.formatIceScore(project.iceScore)}</span>
              </div>
            </div>
            <button class="btn btn-small btn-primary todo-assign-btn" data-id="${project.id}">Assign</button>
          </div>
        `;
      })
      .join('');

    list.querySelectorAll('.todo-assign-btn').forEach((button) => {
      button.addEventListener('click', () => {
        const id = parseInt(button.dataset.id, 10);
        const project = this.projects.find((p) => p.id === id);
        if (project) {
          this.openProjectModal(project);
        }
      });
    });
  }

  initIceInputs() {
    if (this.iceInputsBound) return;
    const { impactInput, confidenceInput, effortInput } = this.getIceElements();
    if (!impactInput || !confidenceInput || !effortInput) return;
    [impactInput, confidenceInput, effortInput].forEach((input) => {
      input.addEventListener('input', () => this.updateIcePreview());
    });
    this.iceInputsBound = true;
    this.updateIcePreview();
  }

  getIceElements() {
    return {
      impactInput: document.getElementById('projectImpact'),
      confidenceInput: document.getElementById('projectConfidenceScore'),
      effortInput: document.getElementById('projectEffort'),
      scoreDisplay: document.getElementById('projectIceScore'),
    };
  }

  normalizeIceValue(value) {
    const parsed = parseInt(value, 10);
    if (Number.isNaN(parsed)) return 1;
    return Math.max(1, Math.min(10, parsed));
  }

  calculateIceScore(impact, confidenceValue, effort) {
    const safeImpact = this.normalizeIceValue(impact);
    const safeConfidence = this.normalizeIceValue(confidenceValue);
    const safeEffort = Math.max(1, Math.min(10, parseInt(effort, 10) || 1));
    const score = (safeImpact * safeConfidence) / safeEffort;
    return Math.round(score * 10) / 10;
  }

  updateIcePreview() {
    const { impactInput, confidenceInput, effortInput, scoreDisplay } = this.getIceElements();
    if (!impactInput || !confidenceInput || !effortInput || !scoreDisplay) return;
    const score = this.calculateIceScore(
      impactInput.value,
      confidenceInput.value,
      effortInput.value,
    );
    scoreDisplay.textContent = this.formatIceScore(score);
  }

  formatIceScore(score) {
    if (typeof score !== 'number' || Number.isNaN(score)) return '—';
    return score % 1 === 0 ? score.toFixed(0) : score.toFixed(1);
  }

  renderMemberBreakdown(members = []) {
    const container = document.getElementById('memberBreakdownList');
    if (!container) return;
    if (!members.length) {
      container.innerHTML = '<p class="member-breakdown-empty">Add regions & roles to see per-person rollups.</p>';
      return;
    }

    const header = `
      <div class="member-breakdown-header">
        <span>Name</span>
        <span>Region</span>
        <span>Role</span>
        <span>Focus days</span>
        <span>Time off</span>
        <span>Net</span>
      </div>
    `;

    const rows = members
      .map(
        (member) => `
          <div class="member-row">
            <span>${this.escapeHtml(member.name)}</span>
            <span>${this.escapeHtml(member.region || 'N/A')}</span>
            <span>${this.escapeHtml(member.role || 'N/A')}</span>
            <span>${member.theoretical}</span>
            <span>-${member.timeOff}</span>
            <span>${member.net}</span>
          </div>
        `,
      )
      .join('');

    container.innerHTML = header + rows;
  }

  addRegion() {
    const id = Date.now();
    this.regions.push({ id, name: 'New Region', ptoDays: 10, holidays: 5 });
    Storage.saveRegions(this.regions);
    this.renderRegionSettings();
    this.recalculateCapacity();
    this.renderTeamMembersList();
  }

  addRole() {
    const id = Date.now();
    this.roles.push({ id, name: 'New Role', focus: 100 });
    Storage.saveRoles(this.roles);
    this.renderRoleSettings();
    this.recalculateCapacity();
    this.renderTeamMembersList();
  }

  removeRegion(id) {
    if (this.regions.length <= 1) {
      this.showToast('At least one region is required', 'error');
      return;
    }
    if (this.team.some((member) => member.regionId === id)) {
      this.showToast('Reassign affected team members before removing this region', 'error');
      return;
    }
    this.regions = this.regions.filter((region) => region.id !== id);
    Storage.saveRegions(this.regions);
    this.renderRegionSettings();
    this.recalculateCapacity();
  }

  removeRole(id) {
    if (this.roles.length <= 1) {
      this.showToast('At least one role is required', 'error');
      return;
    }
    if (this.team.some((member) => member.roleId === id)) {
      this.showToast('Reassign affected team members before removing this role', 'error');
      return;
    }
    this.roles = this.roles.filter((role) => role.id !== id);
    Storage.saveRoles(this.roles);
    this.renderRoleSettings();
    this.recalculateCapacity();
  }

  updateRegionField(id, field, rawValue) {
    this.regions = this.regions.map((region) => {
      if (region.id !== id) return region;
      let value = rawValue;
      if (field !== 'name') {
        value = Math.max(0, parseInt(rawValue, 10) || 0);
      }
      return { ...region, [field]: value };
    });
    Storage.saveRegions(this.regions);
    this.renderTeamMembersList();
    this.recalculateCapacity();
  }

  updateRoleField(id, field, rawValue) {
    this.roles = this.roles.map((role) => {
      if (role.id !== id) return role;
      let value = rawValue;
      if (field === 'focus') {
        value = Math.min(200, Math.max(10, parseInt(rawValue, 10) || 0));
      }
      return { ...role, [field]: value };
    });
    Storage.saveRoles(this.roles);
    this.renderTeamMembersList();
    this.recalculateCapacity();
  }

  populateAssigneeSelect() {
    const select = document.getElementById('projectAssignee');
    if (!select) return;
    select.innerHTML = this.team
      .map((member) => `<option value="${member.id}">${this.escapeHtml(member.name)}</option>`)
      .join('');
  }

  handleEngineerCountChange() {
    const input = document.getElementById('numEngineers');
    if (!input) return;
    let value = parseInt(input.value, 10);
    if (Number.isNaN(value)) value = this.team.length || 1;
    value = Math.min(Math.max(value, 1), 50);
    input.value = value;
    this.updateTeamSize(value);
    this.renderTeamMembersList();
    this.populateAssigneeSelect();
    this.recalculateCapacity();
    this.refreshGantt();
  }

  addTeamMember() {
    const nextId = this.team.length ? Math.max(...this.team.map((member) => member.id)) + 1 : 1;
    const member = {
      id: nextId,
      name: `Team Member ${nextId}`,
      avatar: this.getInitials(`Team Member ${nextId}`),
      regionId: this.team[0]?.regionId ?? this.regions[0]?.id ?? null,
      roleId: this.team[0]?.roleId ?? this.roles[0]?.id ?? null,
    };
    this.team.push(member);
    Storage.saveTeam(this.team);
    const engineersInput = document.getElementById('numEngineers');
    if (engineersInput) engineersInput.value = this.team.length;
    this.populateAssigneeSelect();
    this.renderTeamMembersList();
    this.recalculateCapacity();
    this.refreshGantt();
  }

  removeTeamMember(id) {
    if (this.team.length <= 1) {
      this.showToast('At least one team member is required', 'error');
      return;
    }
    this.team = this.team.filter((member) => member.id !== id);
    const engineersInput = document.getElementById('numEngineers');
    if (engineersInput) engineersInput.value = this.team.length;
    this.projects = this.projects.map((project) => {
      const assignees = Array.isArray(project.assignees) ? project.assignees : [];
      return {
        ...project,
        assignees: assignees.filter((assigneeId) => assigneeId !== id),
      };
    });
    Storage.saveProjects(this.projects);
    Storage.saveTeam(this.team);
    this.populateAssigneeSelect();
    this.renderTeamMembersList();
    this.updateCapacityDisplay();
    this.refreshGantt();
  }

  renameTeamMember(id, name) {
    const trimmed = name.trim();
    this.team = this.team.map((member) => (member.id === id
      ? {
          ...member,
          name: trimmed || member.name,
          avatar: this.getInitials(trimmed || member.name),
        }
      : member));
    Storage.saveTeam(this.team);
    this.populateAssigneeSelect();
    this.refreshGantt();
  }

  updateTeamMemberRegion(id, regionId) {
    if (!this.regions.find((region) => region.id === regionId)) {
      this.showToast('Region not found', 'error');
      return;
    }
    this.team = this.team.map((member) => (member.id === id ? { ...member, regionId } : member));
    Storage.saveTeam(this.team);
    this.recalculateCapacity();
  }

  updateTeamMemberRole(id, roleId) {
    if (!this.roles.find((role) => role.id === roleId)) {
      this.showToast('Role not found', 'error');
      return;
    }
    this.team = this.team.map((member) => (member.id === id ? { ...member, roleId } : member));
    Storage.saveTeam(this.team);
    this.recalculateCapacity();
  }

  getInitials(name) {
    const parts = name.split(' ').filter(Boolean);
    if (!parts.length) return 'TM';
    return parts
      .slice(0, 2)
      .map((part) => part[0].toUpperCase())
      .join('');
  }

  escapeHtml(value = '') {
    const replacements = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return value.replace(/[&<>"']/g, (char) => replacements[char] || char);
  }

  recalculateCapacity() {
    const engineersInput = document.getElementById('numEngineers');
    const engineersValue = engineersInput ? parseInt(engineersInput.value, 10) : null;
    const config = {
      numEngineers: engineersValue || this.team.length || 1,
      ptoPerPerson: parseInt(document.getElementById('ptoPerPerson').value, 10) || 0,
      companyHolidays: parseInt(document.getElementById('companyHolidays').value, 10) || 0,
      adhocReserve: parseInt(document.getElementById('adhocReserve').value, 10) || 0,
      bugReserve: parseInt(document.getElementById('bugReserve').value, 10) || 0,
      quarter: this.settings.currentQuarter,
      team: this.team,
      regions: this.regions,
      roles: this.roles,
    };

    const result = CapacityCalculator.calculate(config);

    document.getElementById('theoreticalCapacity').textContent = `${result.theoreticalCapacity} days`;
    document.getElementById('timeOffTotal').textContent = `-${result.timeOffTotal} days`;
    document.getElementById('reserveTotal').textContent = `-${result.reserveTotal} days`;
    document.getElementById('netCapacity').textContent = `${result.netCapacity} days`;

    this.renderMemberBreakdown(result.memberBreakdown);

    return { config, result };
  }

  applyCapacity() {
    const { config, result } = this.recalculateCapacity();
    this.capacity = {
      ...this.capacity,
      ...config,
      ...result,
    };
    Storage.saveCapacity(this.capacity);
    this.updateTeamSize(this.capacity.numEngineers);
    this.populateAssigneeSelect();
    this.updateCapacityDisplay();
    this.closeCapacityModal();
    this.showToast('Capacity settings applied successfully', 'success');
    this.refreshGantt();
  }

  updateTeamSize(newSize) {
    const currentSize = this.team.length;
    if (newSize > currentSize) {
      for (let i = currentSize; i < newSize; i += 1) {
        const id = this.team.length ? Math.max(...this.team.map((m) => m.id)) + 1 : 1;
        this.team.push({
          id,
          name: `Team Member ${id}`,
          avatar: this.getInitials(`Team Member ${id}`),
          regionId: this.regions[0]?.id ?? null,
          roleId: this.roles[0]?.id ?? null,
        });
      }
    } else if (newSize < currentSize) {
      const removedMembers = this.team.slice(newSize).map((member) => member.id);
      this.team = this.team.slice(0, newSize);
      if (removedMembers.length) {
        this.projects = this.projects.map((project) => {
          const assignees = Array.isArray(project.assignees) ? project.assignees : [];
          return {
            ...project,
            assignees: assignees.filter(
              (assigneeId) => !removedMembers.includes(assigneeId),
            ),
          };
        });
        Storage.saveProjects(this.projects);
      }
    }
    Storage.saveTeam(this.team);
  }

  updateCapacityDisplay() {
    const committed = this.calculateCommittedDays();
    const available = this.capacity.netCapacity || 0;
    const free = Math.max(0, available - committed);
    const utilization = CapacityCalculator.calculateUtilization(committed, available);

    const availableEl = document.getElementById('capacityAvailable');
    const committedEl = document.getElementById('capacityCommitted');
    const freeEl = document.getElementById('capacityFree');
    const percentEl = document.getElementById('capacityPercentage');
    if (availableEl) availableEl.textContent = available;
    if (committedEl) committedEl.textContent = committed;
    if (freeEl) freeEl.textContent = free;
    if (percentEl) percentEl.textContent = `${utilization}%`;

    const fillBar = document.getElementById('capacityBarFill');
    if (fillBar) {
      fillBar.style.width = `${Math.min(100, utilization)}%`;
      fillBar.className = 'capacity-bar-fill';
      if (utilization >= 100) {
        fillBar.classList.add('danger');
      } else if (utilization >= 90) {
        fillBar.classList.add('warning');
      }
    }
  }

  calculateCommittedDays() {
    return this.projects.reduce((total, project) => {
      if (!Array.isArray(project.assignees) || project.assignees.length === 0) {
        return total;
      }
      const start = new Date(project.startDate);
      const end = new Date(project.endDate);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        return total;
      }
      const durationMs = end - start;
      if (durationMs <= 0) return total + 5; // minimum one week
      const weeks = Math.ceil(durationMs / (1000 * 60 * 60 * 24 * 7));
      return total + weeks * 5;
    }, 0);
  }

  openProjectModal(project = null) {
    this.currentProject = project;
    const modal = document.getElementById('projectModal');
    modal?.classList.add('active');

    document.getElementById('projectModalTitle').textContent = project ? '✏️ Edit Project' : '+ Add Project';
    document.getElementById('projectName').value = project?.name || '';
    document.getElementById('projectStartDate').value = project?.startDate || '';
    document.getElementById('projectEndDate').value = project?.endDate || '';
    document.getElementById('projectStatus').value = project?.status || 'planned';
    document.getElementById('projectConfidence').value = project?.confidence || 'medium';
    document.getElementById('projectType').value = project?.type || 'feature';
    document.getElementById('projectDescription').value = project?.description || '';
    const iceImpactInput = document.getElementById('projectImpact');
    const iceConfidenceInput = document.getElementById('projectConfidenceScore');
    const iceEffortInput = document.getElementById('projectEffort');
    if (iceImpactInput) iceImpactInput.value = project?.iceImpact ?? 5;
    if (iceConfidenceInput) iceConfidenceInput.value = project?.iceConfidence ?? 5;
    if (iceEffortInput) iceEffortInput.value = project?.iceEffort ?? 5;
    this.updateIcePreview();

    const assignees = Array.isArray(project?.assignees) ? project.assignees : [];
    const assigneeSelect = document.getElementById('projectAssignee');
    if (assigneeSelect) {
      Array.from(assigneeSelect.options).forEach((option) => {
        option.selected = assignees.includes(parseInt(option.value, 10));
      });
    }

    document.getElementById('deleteProjectBtn').style.display = project ? 'inline-flex' : 'none';
  }

  closeProjectModal() {
    document.getElementById('projectModal')?.classList.remove('active');
    this.currentProject = null;
  }

  saveProject() {
    const name = document.getElementById('projectName').value.trim();
    const startDate = document.getElementById('projectStartDate').value;
    const endDate = document.getElementById('projectEndDate').value;

    if (!name || !startDate || !endDate) {
      this.showToast('Please fill in all required fields', 'error');
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      this.showToast('End date must be after start date', 'error');
      return;
    }

    const assigneeSelect = document.getElementById('projectAssignee');
    if (!assigneeSelect) {
      this.showToast('Unable to load team members. Please refresh the page.', 'error');
      return;
    }

    const assignees = Array.from(assigneeSelect.selectedOptions).map((option) =>
      parseInt(option.value, 10),
    );
    const isUnassigned = assignees.length === 0;
    const impactInput = document.getElementById('projectImpact');
    const confidenceScoreInput = document.getElementById('projectConfidenceScore');
    const effortInput = document.getElementById('projectEffort');
    const iceImpact = this.normalizeIceValue(impactInput?.value ?? 5);
    const iceConfidence = this.normalizeIceValue(confidenceScoreInput?.value ?? 5);
    const iceEffort = this.normalizeIceValue(effortInput?.value ?? 5);
    const iceScore = this.calculateIceScore(iceImpact, iceConfidence, iceEffort);

    const projectData = {
      name,
      startDate,
      endDate,
      status: document.getElementById('projectStatus').value,
      confidence: document.getElementById('projectConfidence').value,
      type: document.getElementById('projectType').value,
      description: document.getElementById('projectDescription').value,
      assignees,
      iceImpact,
      iceConfidence,
      iceEffort,
      iceScore,
    };

    if (this.currentProject) {
      const index = this.projects.findIndex((project) => project.id === this.currentProject.id);
      if (index !== -1) {
        this.projects[index] = { ...this.currentProject, ...projectData };
        this.showToast(
          isUnassigned
            ? 'Project updated – assign teammates when ready'
            : 'Project updated successfully',
          'success',
        );
      } else {
        this.showToast('Project could not be found', 'error');
        return;
      }
    } else {
      this.projects.push({ id: Date.now(), ...projectData });
      this.showToast(
        isUnassigned ? 'Project added to Unassigned queue' : 'Project added successfully',
        'success',
      );
    }

    Storage.saveProjects(this.projects);
    this.updateCapacityDisplay();
    this.refreshGantt();
    this.renderUnassignedProjects();
    this.closeProjectModal();
  }

  updateProjectTimeline(projectId, newStart, newEnd) {
    const index = this.projects.findIndex((project) => project.id === projectId);
    if (index === -1) return;
    const formattedStart = this.formatDateInput(newStart);
    const formattedEnd = this.formatDateInput(newEnd);
    if (new Date(formattedStart) > new Date(formattedEnd)) return;
    this.projects[index] = {
      ...this.projects[index],
      startDate: formattedStart,
      endDate: formattedEnd,
    };
    Storage.saveProjects(this.projects);
    this.updateCapacityDisplay();
    this.refreshGantt();
    this.showToast('Project timeline updated', 'success');
  }

  formatDateInput(value) {
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      const year = value.getFullYear();
      const month = `${value.getMonth() + 1}`.padStart(2, '0');
      const day = `${value.getDate()}`.padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    return value;
  }

  deleteProject() {
    if (!this.currentProject) return;
    if (!window.confirm('Are you sure you want to delete this project?')) return;
    this.projects = this.projects.filter((project) => project.id !== this.currentProject.id);
    Storage.saveProjects(this.projects);
    this.updateCapacityDisplay();
    this.refreshGantt();
    this.renderUnassignedProjects();
    this.closeProjectModal();
    this.showToast('Project deleted', 'success');
  }

  openExportModal() {
    document.getElementById('exportModal')?.classList.add('active');
  }

  closeExportModal() {
    document.getElementById('exportModal')?.classList.remove('active');
  }

  exportPNG() {
    this.showToast('PNG export coming soon!', 'success');
    this.closeExportModal();
  }

  exportCSV() {
    const headers = [
      'Project Name',
      'Assignees',
      'Start Date',
      'End Date',
      'Status',
      'Type',
      'Confidence',
      'ICE Impact',
      'ICE Confidence',
      'ICE Effort',
      'ICE Score',
    ];
    const rows = this.projects.map((project) => {
      const assigneeList = Array.isArray(project.assignees) ? project.assignees : [];
      const assigneeNames = assigneeList
        .map((id) => this.team.find((member) => member.id === id)?.name || '')
        .join('; ');
      return [
        project.name,
        assigneeNames,
        project.startDate,
        project.endDate,
        project.status,
        project.type,
        project.confidence,
        project.iceImpact ?? '',
        project.iceConfidence ?? '',
        project.iceEffort ?? '',
        project.iceScore ?? '',
      ];
    });
    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
    this.downloadFile(csv, 'quarterview-projects.csv', 'text/csv');
    this.showToast('CSV exported successfully', 'success');
    this.closeExportModal();
  }

  exportJSON() {
    const data = Storage.exportData();
    const json = JSON.stringify(data, null, 2);
    this.downloadFile(json, 'quarterview-data.json', 'application/json');
    this.showToast('Data exported successfully', 'success');
    this.closeExportModal();
  }

  openImportModal() {
    document.getElementById('importModal')?.classList.add('active');
    const input = document.getElementById('importFileInput');
    if (input) input.value = '';
  }

  closeImportModal() {
    document.getElementById('importModal')?.classList.remove('active');
  }

  handleImportSubmit() {
    const input = document.getElementById('importFileInput');
    if (!input || !input.files?.length) {
      this.showToast('Select a JSON file to import', 'error');
      return;
    }
    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const payload = JSON.parse(reader.result);
        Storage.importData(payload);
        this.reloadFromStorage();
        this.closeImportModal();
        this.showToast('Import completed successfully', 'success');
      } catch (error) {
        console.error('Import failed', error);
        this.showToast('Invalid JSON file', 'error');
      }
    };
    reader.onerror = () => {
      this.showToast('Unable to read file', 'error');
    };
    reader.readAsText(file);
  }

  reloadFromStorage() {
    this.loadData();
    this.ensureCapacityTotals();
    this.renderTeamMembersList();
    this.renderRegionSettings();
    this.renderRoleSettings();
    this.populateAssigneeSelect();
    this.updateCapacityDisplay();
    this.refreshGantt();
  }

  downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  shareView() {
    const url = window.location.href;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard
        .writeText(url)
        .then(() => {
          this.showToast('Link copied to clipboard!', 'success');
        })
        .catch(() => {
          this.showToast('Unable to copy link', 'error');
        });
    } else {
      this.showToast('Clipboard not supported in this browser', 'error');
    }
  }

  changeView(viewType) {
    this.settings.viewType = viewType;
    Storage.saveSettings(this.settings);
    this.showToast(`Switched to ${viewType} view`, 'success');
  }

  changeGrouping(groupBy) {
    this.settings.groupBy = groupBy;
    Storage.saveSettings(this.settings);
    this.showToast(`Grouped by ${groupBy}`, 'success');
  }

  changeQuarter(quarter) {
    this.settings.currentQuarter = quarter;
    Storage.saveSettings(this.settings);
    this.capacity = {
      ...this.capacity,
      ...CapacityCalculator.calculate({
        ...this.capacity,
        team: this.team,
        regions: this.regions,
        roles: this.roles,
        quarter: this.settings.currentQuarter,
      }),
    };
    Storage.saveCapacity(this.capacity);
    this.syncQuarterSelect();
    this.updateCapacityDisplay();
    this.refreshGantt();
    this.showToast(`Switched to ${quarter}`, 'success');
  }

  searchProjects(query) {
    this.searchTerm = query.trim().toLowerCase();
    this.refreshGantt();
  }

  getVisibleProjects() {
    if (!this.searchTerm) return this.projects;
    return this.projects.filter((project) => {
      const haystack = `${project.name} ${project.description || ''}`.toLowerCase();
      return haystack.includes(this.searchTerm);
    });
  }

  refreshGantt() {
    GanttChart.update(this.getVisibleProjects(), this.team, this.settings.currentQuarter);
    this.renderUnassignedProjects();
  }

  formatDateRangeLabel(startValue, endValue) {
    const start = this.formatDateLabel(startValue);
    const end = this.formatDateLabel(endValue);
    if (!start && !end) return 'Dates TBD';
    if (start && !end) return `${start} → TBD`;
    if (!start && end) return `TBD → ${end}`;
    return `${start} → ${end}`;
  }

  formatDateLabel(value) {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.className = `toast show ${type}`;
    setTimeout(() => toast.classList.remove('show'), 3000);
  }
}

export const App = new QuarterViewApp();
