export const GanttChart = {
  weeks: [],
  projects: [],
  team: [],
  currentQuarter: '',
  quarterStart: null,
  quarterEnd: null,
  quarterDuration: 0,

  update(projects = [], team = [], quarter) {
    this.projects = projects;
    this.team = team;
    if (quarter) {
      this.currentQuarter = quarter;
    }
    if (!this.currentQuarter) {
      const now = new Date();
      const month = now.getMonth();
      const quarterIndex = Math.floor(month / 3) + 1;
      this.currentQuarter = `Q${quarterIndex}-${now.getFullYear()}`;
    }

    this.generateWeeks(this.currentQuarter);
    this.render();
  },

  generateWeeks(quarterLabel) {
    const quarterInfo = this.getQuarterRange(quarterLabel);
    const { start } = quarterInfo;
    this.quarterStart = new Date(quarterInfo.start);
    this.quarterEnd = new Date(quarterInfo.end);
    this.quarterDuration = Math.max(1, this.quarterEnd - this.quarterStart);
    this.weeks = [];

    for (let i = 0; i < 13; i += 1) {
      const weekStart = new Date(start);
      weekStart.setDate(weekStart.getDate() + i * 7);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);

      this.weeks.push({
        number: i + 1,
        start: new Date(weekStart),
        end: new Date(weekEnd),
        isCurrent: this.isCurrentWeek(weekStart, weekEnd),
      });
    }
  },

  getQuarterRange(quarterLabel) {
    const [quarterPart, yearPart] = quarterLabel.split('-');
    const quarterNumber = parseInt(quarterPart.replace('Q', ''), 10);
    const year = parseInt(yearPart, 10);
    if (Number.isNaN(quarterNumber) || Number.isNaN(year)) {
      const today = new Date();
      const month = today.getMonth();
      const startMonth = Math.floor(month / 3) * 3;
      const fallbackStart = new Date(today.getFullYear(), startMonth, 1);
      const fallbackEnd = new Date(today.getFullYear(), startMonth + 3, 0);
      return { start: fallbackStart, end: fallbackEnd };
    }
    const startMonth = (quarterNumber - 1) * 3;
    const start = new Date(year, startMonth, 1);
    const end = new Date(year, startMonth + 3, 0);
    return { start, end };
  },

  isCurrentWeek(weekStart, weekEnd) {
    const today = new Date();
    return today >= weekStart && today <= weekEnd;
  },

  render() {
    const timeline = document.getElementById('ganttTimeline');
    const sidebar = document.getElementById('ganttSidebar');

    if (!timeline || !sidebar) {
      return;
    }

    if (!this.team.length || !this.projects.length) {
      this.showEmpty();
      sidebar.innerHTML = '';
      timeline.innerHTML = '';
      return;
    }

    this.hideEmpty();

    sidebar.innerHTML = '';
    timeline.innerHTML = this.renderTimelineHeader();

    this.team.forEach((member) => {
      sidebar.innerHTML += this.renderPersonLabel(member);
      timeline.innerHTML += this.renderSwimlane(member);
    });

    this.renderProjects();
    this.attachProjectListeners();
  },

  renderTimelineHeader() {
    let html = '<div class="timeline-header">';
    this.weeks.forEach((week) => {
      const dateRange = this.formatDateRange(week.start, week.end);
      const classes = ['week-header'];
      if (week.isCurrent) classes.push('current');

      html += `
        <div class="${classes.join(' ')}" data-week="${week.number}">
          <div>Week ${week.number}</div>
          <div class="week-range">${dateRange}</div>
        </div>
      `;
    });
    html += '</div>';
    return html;
  },

  formatDateRange(start, end) {
    const options = { month: 'short', day: 'numeric' };
    return `${start.toLocaleDateString('en-US', options)} - ${end.toLocaleDateString('en-US', options)}`;
  },

  renderPersonLabel(member) {
    return `
      <div class="person-label" data-person-id="${member.id}">
        <div class="person-avatar">${member.avatar}</div>
        <div>${member.name}</div>
      </div>
    `;
  },

  renderSwimlane(member) {
    let html = `<div class="swimlane" data-person-id="${member.id}">`;
    html += '<div class="timeline-row">';
    this.weeks.forEach(() => {
      html += '<div class="week-cell"></div>';
    });
    html += '</div></div>';
    return html;
  },

  renderProjects() {
    this.projects.forEach((project) => {
      this.renderProject(project);
    });
  },

  renderProject(project) {
    const assignees = Array.isArray(project.assignees)
      ? project.assignees
      : [project.assignees].filter(Boolean);

    assignees.forEach((assigneeId) => {
      const swimlane = document.querySelector(
        `.swimlane[data-person-id="${assigneeId}"] .timeline-row`,
      );
      if (!swimlane) return;
      const bar = this.createProjectBar(project);
      if (!bar) return;
      swimlane.appendChild(bar);
    });
  },

  createProjectBar(project) {
    const position = this.calculateBarPosition(project.startDate, project.endDate);
    if (!position) return null;

    const bar = document.createElement('div');
    bar.className = `project-bar ${project.status} confidence-${project.confidence}`;
    bar.dataset.projectId = project.id;
    bar.textContent = project.name;
    bar.style.left = `${position.left}%`;
    bar.style.width = `${position.width}%`;
    bar.style.top = '12px';
    if (typeof project.iceScore === 'number') {
      const formatted = project.iceScore % 1 === 0 ? project.iceScore.toFixed(0) : project.iceScore.toFixed(1);
      bar.title = `${project.name} • ICE ${formatted}`;
      bar.dataset.iceScore = formatted;
    } else {
      bar.title = project.name;
    }

    const resizeStart = document.createElement('div');
    resizeStart.className = 'project-bar-resize start';
    bar.appendChild(resizeStart);

    const resizeEnd = document.createElement('div');
    resizeEnd.className = 'project-bar-resize end';
    bar.appendChild(resizeEnd);

    return bar;
  },

  calculateBarPosition(startDate, endDate) {
    if (!this.weeks.length) return null;
    const quarterStart = this.weeks[0].start;
    const quarterEnd = this.weeks[this.weeks.length - 1].end;
    const totalDuration = quarterEnd - quarterStart;
    if (totalDuration <= 0) return null;

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return null;
    }

    if (end < quarterStart || start > quarterEnd) {
      return null;
    }

    const clampedStart = start < quarterStart ? quarterStart : start;
    const clampedEnd = end > quarterEnd ? quarterEnd : end;
    const left = ((clampedStart - quarterStart) / totalDuration) * 100;
    const width = Math.max(2, ((clampedEnd - clampedStart) / totalDuration) * 100);

    return {
      left: Math.max(0, Math.min(100, left)),
      width: Math.max(0, Math.min(100, width)),
    };
  },

  attachProjectListeners() {
    const bars = document.querySelectorAll('.project-bar');
    if (!bars.length) return;

    bars.forEach((bar) => {
      const projectId = parseInt(bar.dataset.projectId, 10);
      const startHandle = bar.querySelector('.project-bar-resize.start');
      const endHandle = bar.querySelector('.project-bar-resize.end');

      bar.addEventListener('click', (event) => {
        if (bar.dataset.suppressClick === 'true') {
          event.stopPropagation();
          return;
        }
        if (event.target.closest('.project-bar-resize')) {
          event.stopPropagation();
          return;
        }
        this.editProject(projectId);
      });

      bar.addEventListener('mousedown', (event) => {
        if (event.target.closest('.project-bar-resize')) return;
        this.initDrag(event, bar, projectId);
      });

      startHandle?.addEventListener('mousedown', (event) => {
        this.initResize(event, bar, projectId, 'start');
      });

      endHandle?.addEventListener('mousedown', (event) => {
        this.initResize(event, bar, projectId, 'end');
      });
    });
  },

  editProject(projectId) {
    if (window.App && typeof window.App.openProjectModal === 'function') {
      const project = this.projects.find((p) => p.id === projectId);
      if (project) {
        window.App.openProjectModal(project);
      }
    }
  },

  showEmpty() {
    const emptyState = document.getElementById('emptyState');
    const ganttContainer = document.getElementById('ganttContainer');
    if (emptyState) emptyState.classList.remove('hidden');
    if (ganttContainer) ganttContainer.style.display = 'none';
  },

  hideEmpty() {
    const emptyState = document.getElementById('emptyState');
    const ganttContainer = document.getElementById('ganttContainer');
    if (emptyState) emptyState.classList.add('hidden');
    if (ganttContainer) ganttContainer.style.display = 'flex';
  },

  initDrag(event, bar, projectId) {
    if (event.button !== 0 || !this.quarterDuration) return;
    event.preventDefault();
    const project = this.projects.find((p) => p.id === projectId);
    if (!project) return;
    const metrics = this.getTimelineMetrics(bar);
    if (!metrics) return;

    const state = {
      startX: event.clientX,
      startDate: new Date(project.startDate),
      endDate: new Date(project.endDate),
      durationMs: this.quarterDuration,
      width: metrics.width,
    };
    if (Number.isNaN(state.startDate.getTime()) || Number.isNaN(state.endDate.getTime())) return;

    let pending = null;
    let moved = false;
    this.showTimelineTooltip(bar, state.startDate, state.endDate);

    const onMouseMove = (moveEvent) => {
      moved = true;
      const deltaPx = moveEvent.clientX - state.startX;
      const deltaMs = (deltaPx / state.width) * state.durationMs;
      let nextStart = new Date(state.startDate.getTime() + deltaMs);
      let nextEnd = new Date(state.endDate.getTime() + deltaMs);
      ({ start: nextStart, end: nextEnd } = this.clampDragDates(nextStart, nextEnd));
      this.previewBar(bar, nextStart, nextEnd);
      this.showTimelineTooltip(bar, nextStart, nextEnd);
      pending = { start: nextStart, end: nextEnd };
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      this.hideTimelineTooltip();
      if (moved && pending) {
        bar.dataset.suppressClick = 'true';
        this.commitProjectDates(projectId, pending.start, pending.end);
        requestAnimationFrame(() => {
          bar.dataset.suppressClick = 'false';
        });
      }
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  },

  initResize(event, bar, projectId, edge) {
    if (event.button !== 0 || !this.quarterDuration) return;
    event.preventDefault();
    event.stopPropagation();
    const project = this.projects.find((p) => p.id === projectId);
    if (!project) return;
    const metrics = this.getTimelineMetrics(bar);
    if (!metrics) return;

    const state = {
      startX: event.clientX,
      startDate: new Date(project.startDate),
      endDate: new Date(project.endDate),
      durationMs: this.quarterDuration,
      width: metrics.width,
    };
    if (Number.isNaN(state.startDate.getTime()) || Number.isNaN(state.endDate.getTime())) return;

    let pending = null;
    let moved = false;
    this.showTimelineTooltip(bar, state.startDate, state.endDate);

    const onMouseMove = (moveEvent) => {
      moved = true;
      const deltaPx = moveEvent.clientX - state.startX;
      const deltaMs = (deltaPx / state.width) * state.durationMs;
      let nextStart = new Date(state.startDate);
      let nextEnd = new Date(state.endDate);

      if (edge === 'start') {
        nextStart = this.clampResizeStart(new Date(state.startDate.getTime() + deltaMs), nextEnd);
      } else {
        nextEnd = this.clampResizeEnd(nextStart, new Date(state.endDate.getTime() + deltaMs));
      }

      this.previewBar(bar, nextStart, nextEnd);
      this.showTimelineTooltip(bar, nextStart, nextEnd);
      pending = { start: nextStart, end: nextEnd };
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      this.hideTimelineTooltip();
      if (moved && pending) {
        bar.dataset.suppressClick = 'true';
        this.commitProjectDates(projectId, pending.start, pending.end);
        requestAnimationFrame(() => {
          bar.dataset.suppressClick = 'false';
        });
      }
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  },

  previewBar(bar, start, end) {
    const position = this.calculateBarPosition(start, end);
    if (!position) {
      this.hideTimelineTooltip();
      return;
    }
    bar.style.left = `${position.left}%`;
    bar.style.width = `${position.width}%`;
  },

  clampDragDates(start, end) {
    if (!this.quarterStart || !this.quarterEnd) return { start, end };
    const minDuration = this.getMinDuration();
    const span = Math.max(minDuration, this.quarterEnd - this.quarterStart);
    const duration = Math.min(Math.max(minDuration, end - start), span);
    let clampedStart = new Date(start);
    let clampedEnd = new Date(end);

    if (clampedStart < this.quarterStart) {
      clampedStart = new Date(this.quarterStart);
      clampedEnd = new Date(clampedStart.getTime() + duration);
    }

    if (clampedEnd > this.quarterEnd) {
      clampedEnd = new Date(this.quarterEnd);
      clampedStart = new Date(clampedEnd.getTime() - duration);
    }

    if (clampedEnd - clampedStart < minDuration) {
      clampedEnd = new Date(clampedStart.getTime() + minDuration);
    }

    return { start: clampedStart, end: clampedEnd };
  },

  clampResizeStart(candidate, fixedEnd) {
    if (!this.quarterStart || !this.quarterEnd) return candidate;
    const availableWindow = fixedEnd.getTime() - this.quarterStart.getTime();
    const minDuration = this.getMinDuration(availableWindow);
    const minStartTime = this.quarterStart.getTime();
    const maxStartTime = Math.min(this.quarterEnd.getTime() - minDuration, fixedEnd.getTime() - minDuration);
    let targetTime = candidate.getTime();
    if (Number.isNaN(targetTime)) targetTime = minStartTime;
    targetTime = Math.max(minStartTime, Math.min(targetTime, maxStartTime));
    return new Date(targetTime);
  },

  clampResizeEnd(fixedStart, candidate) {
    if (!this.quarterStart || !this.quarterEnd) return candidate;
    const effectiveStart = Math.max(fixedStart.getTime(), this.quarterStart.getTime());
    const availableWindow = this.quarterEnd.getTime() - effectiveStart;
    const minDuration = this.getMinDuration(availableWindow);
    const minEndTime = effectiveStart + minDuration;
    const maxEndTime = this.quarterEnd.getTime();
    let targetTime = candidate.getTime();
    if (Number.isNaN(targetTime)) targetTime = minEndTime;
    targetTime = Math.min(maxEndTime, Math.max(targetTime, minEndTime));
    return new Date(targetTime);
  },

  commitProjectDates(projectId, start, end) {
    if (window.App && typeof window.App.updateProjectTimeline === 'function') {
      window.App.updateProjectTimeline(projectId, start, end);
    }
  },

  getTimelineMetrics(bar) {
    const row = bar.closest('.timeline-row');
    if (!row) return null;
    const rect = row.getBoundingClientRect();
    return { width: rect.width || 1 };
  },

  getMinDuration(window = Infinity) {
    const day = 24 * 60 * 60 * 1000;
    if (!Number.isFinite(window) || window <= 0) return day;
    return Math.min(day, window);
  },

  formatTooltipDate(date) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '—';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  },

  showTimelineTooltip(bar, start, end) {
    const tooltip = document.getElementById('timelineTooltip');
    const container = document.getElementById('ganttContainer');
    if (!tooltip || !container || !bar) return;
    tooltip.textContent = `${this.formatTooltipDate(start)} → ${this.formatTooltipDate(end)}`;
    const barRect = bar.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    const centerX = barRect.left - containerRect.left + barRect.width / 2;
    const boundedX = Math.max(16, Math.min(containerRect.width - 16, centerX));
    const top = Math.max(8, barRect.top - containerRect.top);
    tooltip.style.left = `${boundedX}px`;
    tooltip.style.top = `${top}px`;
    tooltip.classList.add('visible');
  },

  hideTimelineTooltip() {
    const tooltip = document.getElementById('timelineTooltip');
    if (!tooltip) return;
    tooltip.classList.remove('visible');
  },
};
