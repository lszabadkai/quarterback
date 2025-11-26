export const Storage = {
  keys: {
    CAPACITY: 'quarterview_capacity',
    PROJECTS: 'quarterview_projects',
    TEAM: 'quarterview_team',
    SETTINGS: 'quarterview_settings',
    REGIONS: 'quarterview_regions',
    ROLES: 'quarterview_roles',
  },

  saveCapacity(data) {
    localStorage.setItem(this.keys.CAPACITY, JSON.stringify(data));
  },

  loadCapacity() {
    const data = localStorage.getItem(this.keys.CAPACITY);
    return data ? JSON.parse(data) : this.getDefaultCapacity();
  },

  getDefaultCapacity() {
    return {
      numEngineers: 5,
      ptoPerPerson: 8,
      companyHolidays: 10,
      adhocReserve: 20,
      bugReserve: 10,
      theoreticalCapacity: 450,
      timeOffTotal: 90,
      reserveTotal: 135,
      netCapacity: 225,
    };
  },

  saveProjects(projects) {
    localStorage.setItem(this.keys.PROJECTS, JSON.stringify(projects));
  },

  loadProjects() {
    const data = localStorage.getItem(this.keys.PROJECTS);
    return data ? JSON.parse(data) : [];
  },

  saveTeam(team) {
    localStorage.setItem(this.keys.TEAM, JSON.stringify(team));
  },

  loadTeam() {
    const data = localStorage.getItem(this.keys.TEAM);
    return data ? JSON.parse(data) : this.getDefaultTeam();
  },

  getDefaultTeam() {
    return [
      { id: 1, name: 'Alice Chen', avatar: 'AC', regionId: 1, roleId: 1 },
      { id: 2, name: 'Bob Smith', avatar: 'BS', regionId: 1, roleId: 1 },
      { id: 3, name: 'Carol Davis', avatar: 'CD', regionId: 2, roleId: 2 },
      { id: 4, name: 'David Kumar', avatar: 'DK', regionId: 3, roleId: 1 },
      { id: 5, name: 'Emma Wilson', avatar: 'EW', regionId: 1, roleId: 3 },
    ];
  },

  saveRegions(regions) {
    localStorage.setItem(this.keys.REGIONS, JSON.stringify(regions));
  },

  loadRegions() {
    const data = localStorage.getItem(this.keys.REGIONS);
    return data ? JSON.parse(data) : this.getDefaultRegions();
  },

  getDefaultRegions() {
    return [
      { id: 1, name: 'North America', ptoDays: 12, holidays: 5 },
      { id: 2, name: 'EMEA', ptoDays: 10, holidays: 8 },
      { id: 3, name: 'APAC', ptoDays: 15, holidays: 7 },
    ];
  },

  saveRoles(roles) {
    localStorage.setItem(this.keys.ROLES, JSON.stringify(roles));
  },

  loadRoles() {
    const data = localStorage.getItem(this.keys.ROLES);
    return data ? JSON.parse(data) : this.getDefaultRoles();
  },

  getDefaultRoles() {
    return [
      { id: 1, name: 'IC Engineer', focus: 100 },
      { id: 2, name: 'Engineering Manager', focus: 60 },
      { id: 3, name: 'QA / SDET', focus: 90 },
    ];
  },

  saveSettings(settings) {
    localStorage.setItem(this.keys.SETTINGS, JSON.stringify(settings));
  },

  loadSettings() {
    const data = localStorage.getItem(this.keys.SETTINGS);
    return data ? JSON.parse(data) : this.getDefaultSettings();
  },

  getDefaultSettings() {
    return {
      viewType: 'quarter',
      groupBy: 'person',
      currentQuarter: this.getCurrentQuarter(),
    };
  },

  getCurrentQuarter() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const quarter = Math.floor(month / 3) + 1;
    return `Q${quarter}-${year}`;
  },

  clearAll() {
    Object.values(this.keys).forEach((key) => localStorage.removeItem(key));
  },

  exportData() {
    return {
      capacity: this.loadCapacity(),
      projects: this.loadProjects(),
      team: this.loadTeam(),
      settings: this.loadSettings(),
      regions: this.loadRegions(),
      roles: this.loadRoles(),
      exportDate: new Date().toISOString(),
    };
  },

  importData(data) {
    if (data.capacity) this.saveCapacity(data.capacity);
    if (data.projects) this.saveProjects(data.projects);
    if (data.team) this.saveTeam(data.team);
    if (data.settings) this.saveSettings(data.settings);
    if (data.regions) this.saveRegions(data.regions);
    if (data.roles) this.saveRoles(data.roles);
  },
};
